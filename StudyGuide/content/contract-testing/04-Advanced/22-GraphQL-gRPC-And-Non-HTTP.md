# 22 — GraphQL, gRPC and Non-HTTP

Pact's matching rules were built for JSON over HTTP: a status code, headers,
and a JSON body. GraphQL and gRPC bend those assumptions. This page sketches
how contract testing adapts to each, and where support is still young.

---

## Why HTTP-Centric Matching Needs Adaptation

| Assumption | GraphQL | gRPC |
| ---------- | ------- | ---- |
| Status conveys success/failure | Almost always `200 OK`; errors live in the body | No HTTP status semantics; gRPC status codes in trailers |
| Body is human-readable JSON | JSON, but shaped by the client's query | Binary protobuf |
| Headers carry metadata | Standard HTTP headers | `grpc-metadata` (binary-capable) |
| One interaction = one endpoint | One endpoint (`/graphql`) for every operation | One method per RPC |

**Consequence:** for GraphQL you match on the **request payload** (query +
variables) and the **response data shape**; for gRPC you match on **protobuf
message fields and gRPC metadata**, not HTTP headers.

---

## GraphQL — Just HTTP, Carefully

GraphQL is an abstraction over HTTP. If your client uses **POST**, you can test
it with a normal Pact HTTP interaction: build the `{ "query", "variables" }`
body, then match the `data` (and `errors`) shape.

```text
  POST /graphql
  ┌─────────────────────────────┐        ┌───────────────────────────┐
  │ {                           │        │ 200 OK  (ALWAYS)          │
  │   "query": "query ... ",    │  ───►  │ {                         │
  │   "variables": { "id": 42 } │        │   "data":   { ... },      │
  │ }                           │        │   "errors": [ ... ]       │
  └─────────────────────────────┘        └───────────────────────────┘
      match query + variables              match data shape; errors
                                           also arrive with status 200
```

**Figure 1 —** A GraphQL interaction is a POST with a query body; success and
failure both return `200`, so the contract must match the body, not the status.

### Consumer example (Pact JVM, HTTP interaction)

```java
package com.example.order;

import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.annotations.Pact;
import au.com.dius.pact.core.model.RequestResponsePact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service", port = "8080")
class UserQueryConsumerTest {

    @Pact(consumer = "order-service")
    RequestResponsePact userQuery(PactDslWithProvider builder) {
        PactDslJsonBody request = new PactDslJsonBody()
            .stringType("query", "query User($id: ID!) { user(id: $id) { id name email } }")
            .object("variables")
                .stringType("id", "42")
            .closeObject();

        PactDslJsonBody response = new PactDslJsonBody()
            .object("data")
                .object("user")
                    .integerType("id", 42)
                    .stringType("name", "Ada Lovelace")
                    .stringType("email", "ada@example.com")
                .closeObject()
            .closeObject();

        return builder
            .given("user 42 exists")
            .uponReceiving("a GraphQL query for user 42")
                .path("/graphql")
                .method("POST")
                .header("Content-Type", "application/json")
                .body(request)
            .willRespondWith()
                .status(200)
                .body(response)
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "userQuery")
    void queriesUser() {
        assertThat(true).isTrue();
    }
}
```

Notes:

- Match the **query with a `stringType` matcher**, not an exact string, so
  whitespace/operation-name changes do not break the contract.
- Provider verification is **identical to any HTTP provider** — Pact replays
  the POST against `/graphql`.
- **Pact JS and Pact Go** ship purpose-built GraphQL helpers
  (`addGraphQLInteraction()` with `withOperation`, `withQuery`,
  `withVariables`). Java has no first-class GraphQL DSL; build the body as
  JSON as above.

---

## gRPC — Protobuf, Not HTTP

gRPC uses HTTP/2 framing but its payloads are binary protobuf and its status
travels in trailers. Standard HTTP matchers do not see it. The Pact
**Protobuf/gRPC plugin** handles it: it understands `.proto` files, generates
proto3 payloads, and provides a mock gRPC server.

```text
  .proto schema
        │
        ├──► generate stubs ──► consumer calls stub ──► Pact mock gRPC
        │                                                   server
        └──► provider verification: invoke the real service
             method, capture the response message, compare
             protobuf fields + gRPC metadata

  Matching unit = protobuf message field, NOT JSON or HTTP headers.
```

**Figure 2 —** gRPC contracts are protobuf messages over a synchronous message
interaction; the plugin supplies the transport mock and matching.

### What the tooling requires

- **Pact specification V4** and the **Pact plugin framework**.
- The plugin installed under `~/.pact/plugins/protobuf-<version>` (or
  `$PACT_PLUGIN_DIR`). Supported on Pact-JVM 4.4+, Pact-Rust, and Pact-Go
  betas.
- A gRPC service call is modelled as a **synchronous message** interaction:
  input message in, output message out. Unary calls map directly; streaming
  has limited support.

Plugin configuration values are passed as a map. The shape (from the plugin's
docs) is:

```text
"pact:proto"          -> path to the .proto file (filePath)
"pact:content-type"   -> "application/grpc"
"pact:proto-service"  -> "Test/GetFeature"   (service/method)
"pact:service"        -> service name
"pact:method"         -> method name
```

Because the interaction is generated from protobuf descriptors, you rarely
hand-write field matchers; the plugin derives them from the schema.

### Schema evolution with buf

The protobuf schema is the provider contract. For *schema* compatibility —
"does this `.proto` change break existing clients?" — tools like **`buf
breaking`** compare two schema versions. That is a **schema compatibility
check**, not consumer-driven contract testing: it does not know what any
specific consumer actually uses. Use it alongside Pact, not instead of it.

---

## Tool and Maturity Table

| Protocol | Interaction type | Primary tooling | Matchers | Maturity |
| -------- | ---------------- | --------------- | -------- | -------- |
| REST/JSON | HTTP | Pact JVM `junit5` | Full | Mature |
| GraphQL | HTTP (POST) | Pact (manual body); JS/Go helpers | JSON matchers | Good |
| gRPC | V4 sync message | Pact Protobuf/gRPC plugin | Protobuf fields | Growing |
| Protobuf messages | V4 async message | Pact Protobuf plugin | Protobuf fields | Growing |
| Events (Kafka/SQS) | V3/V4 message | Pact JVM messaging | JSON + metadata | Mature |
| SOAP/XML | HTTP | Pact JVM XML DSL | XML matchers | Adequate |

---

## When Non-HTTP Contracts Are Worth It

Use them when the protocol is a genuine integration boundary:

- A consumer depends on a gRPC service's field names and enum values.
- A gRPC producer must not remove a field consumers read.

Skip them when the boundary is thin:

- A GraphQL schema already enforced by a gateway can be schema-tested; a Pact
  adds value only if a consumer genuinely depends on the response **shape**.
- For protobuf, `buf breaking` plus a small number of Pact contracts often
  beats trying to contract-test every RPC.

---

## Gotchas

- **GraphQL `200` trap** — asserting on status proves nothing; match `data`
  and `errors`.
- **Exact query strings** — brittle. Match the operation shape with a matcher.
- **Plugin version pinning** — plugin and framework versions must be
  compatible; a mismatch produces confusing load errors.
- **Streaming RPCs** — poorly supported; do not assume coverage.
- **Binary bodies in logs** — gRPC mismatch output is less readable than JSON;
  enable debug logging and keep the `.proto` handy.
- **Confusing schema tests with contract tests** — `buf`/OpenAPI schema diffing
  cannot tell you whether a specific consumer will break.

---

## See also

- [19 — Message Pact (Async)](./19-Message-Pact-Async.md)
- [21 — Bi-Directional Contract Testing](./21-Bi-Directional-Contract-Testing.md)
- [09 — Matchers and Matching Rules](../02-Pact-Workflow/09-Matchers-And-Matching-Rules.md)
- [10 — Request and Response Matching](../02-Pact-Workflow/10-Request-And-Response-Matching.md)
- [28 — Anti-Patterns and Pitfalls](../06-Operations/28-Anti-Patterns-And-Pitfalls.md)

---

## Recap

- **GraphQL** is HTTP: match the query/variables request and the `data`/`errors`
  response; status is almost always `200`.
- **gRPC** is protobuf over HTTP/2: use the Pact Protobuf/gRPC plugin (V4 +
  plugins) and match message fields, not HTTP headers.
- Java has no GraphQL DSL; JS/Go do. gRPC support is growing and needs V4.
- **Schema-diff tools** (buf, OpenAPI) check compatibility; they are not
  consumer-driven contract tests.
- Adapt matching to the protocol; do not force HTTP assumptions onto it.

---

## Practice

1. A GraphQL consumer contract asserts status `200`. What has it actually
   proven, and what should it assert instead?

   **Answer:** Almost nothing — GraphQL returns `200` even for errors. It
   should match the response `data` shape and, if relevant, the `errors` array.

2. Why can't you reuse Pact's HTTP header matchers for gRPC metadata?

   **Answer:** gRPC metadata is not HTTP headers; it travels as
   `grpc-metadata` and may be binary. The Protobuf/gRPC plugin is needed to
   match it.

3. Your team runs `buf breaking` on every `.proto` change. Do you still need
   Pact for a gRPC consumer?

   **Answer:** They answer different questions. `buf breaking` checks schema
   compatibility broadly; Pact proves a *specific* consumer's field usage still
   works. Use both if the consumer matters.
