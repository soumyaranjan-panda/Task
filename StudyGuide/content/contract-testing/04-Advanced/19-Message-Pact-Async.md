# 19 — Message Pact (Async)

An HTTP contract is a **request** plus an expected **response**. An event has
no request. So what is a "contract" for an event? The answer is a **message
pact**: a payload plus metadata, with no request/response pair.

---

## The Problem With Events

`order-service` publishes an **`order-created`** event on the topic `orders`.
`notification-service` consumes it and sends a confirmation email.

```json
{
  "orderId": "ORD-1001",
  "userId": 42,
  "total": 129.99,
  "createdAt": "2024-02-01T12:00:00Z"
}
```

There is nothing to "call". The producer fires and forgets. The consumer can
only react. A naive integration test would need a live Kafka topic, both
services running, and a real database — slow and flaky.

A **message contract** captures the agreement instead:

| HTTP interaction        | Message interaction                     |
| ----------------------- | --------------------------------------- |
| Request (method, path)  | *(none)*                                |
| Expected response body  | Expected **payload** (message contents) |
| Response headers        | Expected **metadata** (topic, keys, …)  |
| Provider state          | Provider state                          |
| Verified by a live HTTP call | Verified by invoking a **handler** |

**Key idea:** Pact replaces the message broker with a *simulation*. It does
not test the broker; it tests that the producer's real message matches the
consumer's expectation.

---

## How It Works

```text
   notification-service                     order-service
        (consumer)                            (provider)
             │                                     │
             │ 1. consumer test                     │
             │    given "user 42 exists"            │
             │    expectsToReceive                  │
             │      "an order-created event"        │
             │         │                            │
             │         ▼                            │
             │  message pact ────────────────────►  │
             │  (payload + metadata)                │
             │                                      │ 2. @PactVerifyProvider
             │                                      │    builds a real event
             │                                      │         │
             │◄─── Pact matches payload shape ──────│         ▼
             │     and metadata keys only           │    compares shape,
             │                                      │    NOT the transport
```

**Figure 1 —** A message contract moves from a consumer expectation to a
provider-built message; Pact compares the shape and metadata, never the queue.

Pact never opens a TCP connection to Kafka, RabbitMQ, or SNS during
verification. That is deliberate: the transport is out of scope for a
contract test.

---

## Consumer Side — `MessagePactBuilder`

The consumer test declares what it needs to **receive**. Pact injects a
`MessagePactBuilder`; the `@Pact` method returns a `MessagePact`.

```text
<dependency>
  <groupId>au.com.dius.pact.consumer</groupId>
  <artifactId>junit5</artifactId>
  <version>4.6.17</version>
  <scope>test</scope>
</dependency>
```

```java
package com.example.notification;

import au.com.dius.pact.consumer.MessagePactBuilder;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.consumer.junit5.ProviderType;
import au.com.dius.pact.core.model.PactSpecVersion;
import au.com.dius.pact.core.model.annotations.Pact;
import au.com.dius.pact.core.model.messaging.Message;
import au.com.dius.pact.core.model.messaging.MessagePact;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "order-service",
             providerType = ProviderType.ASYNCH,
             pactVersion = PactSpecVersion.V3)
class OrderCreatedConsumerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Pact(consumer = "notification-service")
    MessagePact orderCreatedPact(MessagePactBuilder builder) {
        PactDslJsonBody payload = new PactDslJsonBody()
            .stringType("orderId", "ORD-1001")
            .integerType("userId", 42)
            .decimalType("total", 129.99)
            .datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ssXXX");

        return builder
            .given("user 42 exists")
            .expectsToReceive("an order-created event")
            .withMetadata(Map.of(
                "contentType", "application/json",
                "topic", "orders"))
            .withContent(payload)
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "orderCreatedPact")
    void handlesOrderCreated(List<Message> messages) throws Exception {
        Message message = messages.get(0);

        JsonNode event = mapper.readTree(message.contentsAsBytes());

        assertThat(event.get("orderId").asText()).isEqualTo("ORD-1001");
        assertThat(event.get("userId").asInt()).isEqualTo(42);
        assertThat(message.getMetadata()).containsEntry("topic", "orders");
    }
}
```

Run it:

```bash
mvn -q test
```

The pact file lands in `target/pacts/notification-service-order-service.json`
(with `providerType: ASYNCH` interactions). Only the payload is matched
against the **handler output** later — the consumer's assertions here test
the consumer, not the provider.

### Metadata and matchers

Metadata values may use matchers so brittle values (partition keys, message
IDs) do not break the contract. `withMetadata` accepts a `Map`, or a
`MetadataBuilder` via a `Consumer`:

```java
.withMetadata(md -> {
    md.add("contentType", "application/json");
    md.add("topic", "orders");
    md.matchRegex("messageId", "[A-Z]{3}\\d{4}", "ORD1001");
})
```

---

## Provider Side — `@PactVerifyProvider`

On the provider, you do not replay a request. You supply the **actual event
your code produces**, and Pact asserts it matches every consumer's pact.

Add the message test target in a `@BeforeEach`, then register one
`@PactVerifyProvider` method per message description.

```text
<dependency>
  <groupId>au.com.dius.pact.provider</groupId>
  <artifactId>junit5</artifactId>
  <version>4.6.17</version>
  <scope>test</scope>
</dependency>
```

```java
package com.example.orders;

import au.com.dius.pact.provider.MessageAndMetadata;
import au.com.dius.pact.provider.PactVerifyProvider;
import au.com.dius.pact.provider.junit5.MessageTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Provider("order-service")
@PactFolder("pacts")
class OrderCreatedProviderTest {

    @BeforeEach
    void before(PactVerificationContext context) {
        context.setTarget(new MessageTestTarget());
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verify(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("user 42 exists")
    void user42Exists() {
        // A message shape check needs no external rows; real handlers that read
        // from a repository would seed that repository here.
    }

    @PactVerifyProvider("an order-created event")
    MessageAndMetadata orderCreatedMessage() {
        String payload = "{\"orderId\":\"ORD-1001\",\"userId\":42,"
            + "\"total\":129.99,\"createdAt\":\"2024-02-01T12:00:00Z\"}";

        Map<String, Object> metadata = Map.of(
            "contentType", "application/json",
            "topic", "orders");

        return new MessageAndMetadata(
            payload.getBytes(StandardCharsets.UTF_8), metadata);
    }
}
```

The string passed to `@PactVerifyProvider` must equal the consumer's
`expectsToReceive` description exactly. Return a `String` when only the
payload matters; return `MessageAndMetadata` when metadata is also asserted.

```text
mvn -q test

Verifying a pact between notification-service and order-service
  an order-created event
    returns a response which
      has status code 200 (OK)
      has a matching body (OK)
      has message metadata (OK)
```

---

## When to Use Message Contracts

| Use a message pact when… | Use an HTTP pact when… |
| ------------------------ | ---------------------- |
| The producer fires an event/command with no reply | The consumer calls and waits for a reply |
| You want to lock the event **shape and metadata** | You want to lock method/path/status/headers |
| Kafka, RabbitMQ, SQS, SNS, Pub/Sub | REST, GraphQL over POST, any request/response |
| You accept that Pact does **not** test the broker | You accept that Pact does **not** test business logic |

Do **not** give a service both an HTTP pact and a message pact under the
**same provider name**. Name them differently, e.g. `order-service` vs
`order-service-messaging`, or Pact will conflate the interactions.

---

## What Message Contracts Do *Not* Prove

- **Delivery.** Whether the message reaches a topic, is partitioned, retried,
  or dead-lettered is untested. That is infrastructure, not contract.
- **Ordering or exactly-once semantics.**
- **Business correctness** of the values (only their shape and type).
- **Schema evolution compatibility** beyond the fields the consumer asserted.

---

## Gotchas

- **Description drift** — provider and consumer descriptions must match
  character for character. A typo silently leaves the interaction unverified.
- **`ProviderType` mismatch** — without `providerType = ASYNCH`, the mock
  behaves like an HTTP interaction.
- **Matchers on metadata** — exact metadata values are as brittle as exact
  body values. Use `matchRegex`/`matchType` for IDs and timestamps.
- **Empty `@BeforeEach` target** — forgetting `new MessageTestTarget()`
  makes the provider try HTTP verification and fail unpredictably.

---

## See also

- [20 — Versioning and the Pact Matrix](./20-Versioning-And-The-Pact-Matrix.md)
- [21 — Bi-Directional Contract Testing](./21-Bi-Directional-Contract-Testing.md)
- [22 — GraphQL, gRPC and Non-HTTP](./22-GraphQL-gRPC-And-Non-HTTP.md)
- [23 — SCC Concepts](../05-Spring-Cloud-Contract/23-SCC-Concepts.md)
- [27 — Contract Testing in a Microservice Topology](../06-Operations/27-Contract-Testing-In-A-Microservice-Topology.md)

---

## Recap

- A message contract is **payload + metadata**, not a request/response pair.
- The consumer declares `expectsToReceive(...).withContent(...).withMetadata(...)`.
- The provider registers `@PactVerifyProvider("same description")` returning
  the real payload (or `MessageAndMetadata`).
- Pact verifies **shape and metadata**, not broker delivery, ordering, or
  exactly-once semantics.
- Keep HTTP and message pacts under **different provider names**.

---

## Practice

1. Add a second consumer interaction for a future `order-cancelled` event
   with fields `orderId`, `cancelledAt`, and `reason`. What metadata would you
   match with a regex?

   **Answer:** Reuse the same `@Pact` class, add a new `@Pact` method with
   `expectsToReceive("an order-cancelled event")`. Match `messageId` with
   `matchRegex("messageId", "ORD\\d{4}", "ORD1001")` and match the
   ISO-8601 `cancelledAt` with `datetime`, not `stringValue`.

2. Why does changing the topic name from `orders` to `order-created` matter —
   and what breaks if you change it only in the provider test?

   **Answer:** The topic lives in **metadata**; if the consumer asserts it,
   the provider must publish the same value. Changing it only on the provider
   breaks verification because metadata no longer matches.

3. A teammate says "verify the message reaches Kafka in the pact test".
   What do you tell them?

   **Answer:** Wrong layer. Pact replaces the broker. Use a separate
   integration/smoke test for delivery; keep the contract focused on shape.
