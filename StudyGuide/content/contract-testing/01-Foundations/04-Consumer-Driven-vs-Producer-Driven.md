# Consumer-Driven vs Producer-Driven

## The question this page answers

Someone has to write the specification. Does the **consumer** dictate what it needs, or does the **provider** publish what it offers? The answer changes the tooling, the workflow, and who gets told about breaking changes.

## Direction of the specification

- **Consumer-driven**: consumers record the interactions they rely on; the provider verifies it satisfies all of them. The spec flows consumer → provider.
- **Producer-driven**: the provider publishes a spec (OpenAPI, or a Spring Cloud Contract definition); consumers generate clients, stubs, and tests from it. The spec flows provider → consumer.

Neither is "more correct". They optimise for different risks.

```text
   CONSUMER-DRIVEN (Pact)             PRODUCER-DRIVEN (OpenAPI / SCC)
   ──────────────────────             ───────────────────────────────
   consumer defines expectation       provider defines the spec

            │                                   │
            ▼                                   ▼
   consumer test generates            provider build generates
   a pact file                        the spec + stubs

            │                                   │
            ▼                                   ▼
   provider verifies the pact         consumer tests against
   against its real API               the generated client / stub

   direction: consumer ──► provider   direction: provider ──► consumer
```

**Figure 1 —** The two directions a contract can travel.

## Consumer-driven in practice (Pact)

The consumer test from the previous pages *is* the specification. It records `GET /users/42` and the fields `order-service` reads. Nothing else is promised.

```java
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;

public class UserPacts {

    @Pact(consumer = "order-service")
    public RequestResponsePact user42Exists(PactDslWithProvider builder) {
        return builder
            .given("user 42 exists")
            .uponReceiving("a request for user 42")
            .path("/users/42")
            .method("GET")
            .willRespondWith()
            .status(200)
            .body(new PactDslJsonBody()
                .integerType("id", 42)
                .stringType("name", "Ada Lovelace")
                .stringType("email", "ada@example.com"))
            .toPact();
    }
}
```

## Producer-driven in practice (OpenAPI)

The provider publishes the whole surface. Every consumer must cope with all of it, whether it uses it or not.

```yaml
openapi: 3.0.3
info:
  title: user-service
  version: 1.0.0
paths:
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            example: 42
      responses:
        '200':
          description: the user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      required: [id, name, email, active, createdAt]
      properties:
        id: { type: integer, example: 42 }
        name: { type: string, example: "Ada Lovelace" }
        email: { type: string, example: "ada@example.com" }
        active: { type: boolean, example: true }
        createdAt: { type: string, format: date-time }
```

Spring Cloud Contract is the other producer-driven option: the provider writes the contract in Groovy/YAML and the plugin generates provider verification tests plus consumer stubs.

```groovy
Contract.make {
    request {
        method 'GET'
        url '/users/42'
    }
    response {
        status 200
        body([id: 42, name: 'Ada Lovelace', email: 'ada@example.com'])
        headers { contentType(applicationJson()) }
    }
}
```

## Pros and cons

| Dimension | Consumer-driven (Pact) | Producer-driven (OpenAPI / SCC) |
| --------- | ---------------------- | ------------------------------- |
| Spec author | consumer | provider |
| Captures real usage | yes — only what is used | no — the full surface |
| Catches provider breaking a consumer | yes | only if consumers validate against it |
| Catches consumer misusing the provider's spec | partially | yes |
| Provider must run consumers' tests | yes (verification) | no |
| Works without a running consumer | yes | yes |
| Setup effort | moderate (broker, verification) | lower if the spec already exists |
| Best when | many consumers, evolving API | public/stable API, few controlled consumers |

## Which should you choose?

- Choose **consumer-driven (Pact)** when multiple teams consume your API and you need to know *who* depends on a field before you remove it.
- Choose **producer-driven (OpenAPI / SCC)** when the provider owns a stable, public contract and consumers are expected to conform to it.
- They compose: many teams run **bi-directional contract testing**, publishing OpenAPI as the provider's spec and Pact for the interactions consumers actually use.

## Recap

- **Consumer-driven** specs flow consumer → provider; **producer-driven** specs flow provider → consumer.
- Pact is the leading consumer-driven tool; OpenAPI and Spring Cloud Contract are producer-driven.
- Consumer-driven captures **real usage**; producer-driven captures the **full offered surface**.
- Pick by risk: many consumers favour Pact; stable public APIs favour OpenAPI/SCC.

## Practice

1. A provider wants to delete a rarely used field. Which approach tells it whether any consumer relies on that field before removal, and how?

2. A team already maintains a high-quality OpenAPI spec. What is the cheapest way to get contract-testing value from it?

> **Answer.** 1. Consumer-driven (Pact): each consumer's pact records whether it reads that field, so verification fails for exactly the affected consumers before the deletion ships. 2. Use the spec as the provider's side of a **bi-directional** contract test: validate the OpenAPI spec and verify the Pact interactions consumers record against it, so consumers still get early warnings without adopting full producer-driven code generation.

## See also

- [Consumers, Providers & Contracts](03-Consumers-Providers-And-Contracts.md)
- [Contract vs Integration vs E2E vs Schema](05-Contract-vs-Integration-vs-E2E-vs-Schema.md)
- [SCC vs Pact](../05-Spring-Cloud-Contract/26-SCC-vs-Pact.md)
- [Bi-Directional Contract Testing](../04-Advanced/21-Bi-Directional-Contract-Testing.md)
