# 07 — The Pact Workflow End to End

A contract test is only half the story. The value comes from the **loop**: the consumer writes its expectations, the provider proves it honours them, and a gate stops unsafe deploys. This page traces that whole loop once, start to finish.

The single most important sentence on this page:

> **A pact is written by the consumer and verified by the provider.**

If you remember nothing else, remember that the consumer owns the executable expectations, and the provider runs them against the real application.

---

## The Loop at a Glance

```text
 [1] Consumer dev writes a @Pact test in order-service
     expectation: GET /users/42 -> 200 { id, name, ... }
                    │
                    ▼
 [2] Test runs against the in-process Pact MOCK PROVIDER
     order-service client ─── HTTP ───► mock returns 200
                         ◄── contract satisfied ──
                    │
                    ▼
 [3] Test passes -> pact file is written
     target/pacts/order-service-user-service.json
                    │
                    ▼
 [4] Consumer CI publishes the pact to the PACT BROKER
     mvn pact:publish   (consumer version + branch)
                    │
                    ▼
 [5] Provider CI pulls the pacts for user-service
                    │
                    ▼
 [6] Provider app starts; the @State callback runs
     given "user 42 exists" -> the DB is seeded
                    │
                    ▼
 [7] Pact replays each request against the REAL provider
     real response ── compared ──► contract
     verification result POSTed back to the broker
                    │
                    ▼
 [8] can-i-deploy gate (asks the broker's matrix)
     pact-broker can-i-deploy --pacticipant order-service \
       --version $GIT_SHA --to-environment production
                    │
              ┌─────┴─────┐
              ▼           ▼
          "yes"         "no"
              │           │
 [9] deploy    │       block the release
```

**Figure 1 —** The consumer-driven contract loop: write, publish, verify, gate, deploy.

---

## Who Does What

| Actor | Side | Responsibility |
| ----- | ---- | -------------- |
| **Consumer developer** (`order-service`) | Consumer | Writes the `@Pact` test that encodes the expectations the client relies on. |
| **Mock provider** | Consumer (in-process) | An HTTP stub the Pact library starts during the consumer test; it serves the contract's response so the real client can be exercised. |
| **Pact file** | Artefact | JSON document, one per consumer-provider pair. The unit that travels to the provider. |
| **Pact Broker** | Shared | Stores pacts plus every verification result; answers `can-i-deploy`. |
| **Provider CI** (`user-service`) | Provider | Pulls the pacts, starts the app, runs each interaction against it, reports results. |
| **Provider state callbacks** | Provider | `@State` methods that arrange provider data (`"user 42 exists"`). |
| **`can-i-deploy`** | Shared | A CLI gate that asks the broker whether this exact version is safe to release. |

The split of responsibility is worth a picture:

```text
  WHO WRITES / WHO READS THE CONTRACT

  order-service (consumer)
        │  writes expectations
        ▼
  order-service-user-service.json   (the pact)
        │  read + replayed against
        ▼
  user-service (provider)
        │  honours or breaks
        ▼
  verification result  ──►  Pact Broker
```

**Figure 2 —** The consumer produces the contract; the provider consumes it.

---

## Step by Step

### 1. Write the consumer test

The consumer dev writes a test whose only job is to declare what the client needs. Here is a complete consumer test for the running example, using the Pact JVM 4.x JUnit 5 APIs.

```java
package com.example.orders;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service", pactMethod = "getUser42")
class UserClientPactTest {

    @Pact(consumer = "order-service")
    RequestResponsePact getUser42(PactDslWithProvider builder) {
        return builder
            .given("user 42 exists")
            .uponReceiving("a request for user 42")
                .path("/users/42")
                .method("GET")
                .headers("Accept", "application/json")
            .willRespondWith()
                .status(200)
                .headers("Content-Type", "application/json")
                .body(new PactDslJsonBody()
                    .integerType("id", 42)
                    .stringType("name", "Ada Lovelace")
                    .stringMatcher("email", ".*@.*", "ada@example.com")
                    .booleanType("active", true)
                    .datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ss'Z'",
                              Date.from(Instant.parse("2024-01-05T10:00:00Z"))))
            .toPact();
    }

    @Test
    void enrichOrderWithUser(MockServer mockServer) throws Exception {
        HttpClient http = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(mockServer.getUrl() + "/users/42"))
            .header("Accept", "application/json")
            .GET()
            .build();

        HttpResponse<String> response =
            http.send(request, HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("Ada Lovelace"));
    }
}
```

### 2. Run against the mock provider

`@ExtendWith(PactConsumerTestExt.class)` starts a mock HTTP server on a random port. `MockServer.getUrl()` gives you its base URL. The mock returns exactly the response declared in `willRespondWith()`, so the client is tested without any real network dependency.

### 3. The pact file is written

When the test passes, Pact writes the contract to `target/pacts/order-service-user-service.json`. If the test fails, no pact is written — a failing consumer test is a failing contract.

### 4. Publish to the broker

```bash
mvn pact:publish \
  -Dpact.broker.url=http://localhost:9292 \
  -Dpact.broker.username=pact \
  -Dpact.broker.password=pact
```

```text
Publishing pacts to Pact Broker at http://localhost:9292

  order-service-user-service.json ..... OK (order-service 1.4.0)
```

### 5. Provider CI pulls the pacts

The provider test is annotated with `@PactBroker` (or `@PactFolder` locally), so the pacts for `user-service` are fetched at test time.

### 6. Start the provider with state

Before each interaction, the pact declares a **provider state** such as `"user 42 exists"`. The provider implements a `@State` method that arranges exactly that data. See [Provider States](12-Provider-States.md).

### 7. Verify and report

Pact replays the recorded request against the running provider and compares the real response to the contract using the **matching rules**. The result (success or failure, including the diff) is posted back to the broker.

```text
Verifying a pact between order-service and user-service

  a request for user 42
    returns a response which
      has status code 200 (OK)
      has a matching body (OK)
      includes headers "Content-Type" with value "application/json" (OK)
```

### 8. The can-i-deploy gate

`can-i-deploy` asks the broker: "has *this* consumer version been verified against a compatible provider version in *this* environment?" It returns a machine-readable yes/no, which you wire into CI.

```bash
pact-broker can-i-deploy \
  --pacticipant order-service \
  --version 1.4.0 \
  --to-environment production \
  --broker-base-url http://localhost:9292
```

```text
Computer says yes \o/

CONSUMER       | C.VERSION | PROVIDER     | P.VERSION | SUCCESS?
order-service  | 1.4.0     | user-service | 2.1.0     | true
```

### 9. Deploy

Only after the gate passes do you deploy. The broker is then told about the deployment so future `can-i-deploy` calls know which versions are live (see [The Pact Broker & PactFlow](11-The-Pact-Broker-And-PactFlow.md)).

---

## What the Loop Does and Does Not Prove

| Proves | Does **not** prove |
| ------ | ------------------ |
| The provider satisfies the consumer's expectations. | That business logic is correct end to end. |
| Both sides agree on the shape of the exchange. | Performance, security, or resilience. |
| A provider change breaks a consumer **before** deploy. | That three or more services interoperate. |

Contract verification is **not** a replacement for a handful of E2E smoke tests. It removes most of the need for the flaky "*everyone in one environment*" tests, not all of it.

---

## Gotchas

- **A pact is a consumer artefact.** Never hand-edit it; regenerate it by running the consumer test.
- **No broker, no gate.** Without publishing + verification results, `can-i-deploy` cannot help you.
- **States are not test data dumps.** Each `@State` should set up the minimum needed for that interaction.
- **One pact per consumer-provider pair.** Do not merge contracts across services.

---

## Recap

- The loop is: **write → mock → pact file → publish → pull → state → verify → gate → deploy**.
- The **consumer writes** the pact; the **provider verifies** it.
- The **broker** is the shared source of truth for pacts and verification results.
- `can-i-deploy` turns "is it safe to release?" into a yes/no answer in CI.
- Contracts prove compatibility, not business correctness.

---

## Practice

1. In one sentence, who is allowed to change the expectations in a pact, and why?

> **Answer.** The consumer. The pact records what the consumer's client actually relies on, so only the consumer can responsibly declare and update those expectations. The provider's job is to satisfy them or negotiate a change.

2. A provider deploy passes its own unit tests but `can-i-deploy` says no. Give two plausible reasons.

> **Answer.** (a) The consumer version being deployed has a pact the current provider version has not verified successfully (e.g. a new interaction or a changed matcher). (b) The broker has no verification result at all for the consumer/provider version combination, so the gate fails closed.

3. List the loop steps in order from memory.

> **Answer.** Consumer test → mock provider → pact file → publish to broker → provider CI pulls → provider starts with state → verify and report → `can-i-deploy` → deploy.

---

## See also

- [Anatomy Of A Pact File](08-Anatomy-Of-A-Pact-File.md)
- [The Pact Broker & PactFlow](11-The-Pact-Broker-And-PactFlow.md)
- [Provider States](12-Provider-States.md)
- [Writing Consumer Tests](../03-Hands-On/14-Writing-Consumer-Tests.md)
- [CI/CD & can-i-deploy](../03-Hands-On/18-CICD-And-Can-I-Deploy.md)
- [Core Vocabulary](../01-Foundations/06-Core-Vocabulary.md)
