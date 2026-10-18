# What Is Contract Testing?

## The question this page answers

Two teams ship independently. How do you know `order-service` will still be able to call `user-service` after either one changes — without deploying both together and running a full end-to-end test?

**Contract testing** answers that. It verifies that two services agree on the **shape and meaning of the messages they exchange**, while each service is tested on its own.

## The two-sided agreement

A **contract** is an explicit, machine-readable description of one interaction between two services.

- The **consumer** (the caller) declares its **expectations**.
- The **provider** (the callee) declares its **obligations**.

An expectation and an obligation are the same sentence seen from opposite sides. The contract is that shared sentence, written down so a machine can check it.

```text
┌──────────────────────────────┐      ┌──────────────────────────────┐
│        CONSUMER SIDE         │      │        PROVIDER SIDE         │
│        order-service         │      │        user-service          │
├──────────────────────────────┤      ├──────────────────────────────┤
│ EXPECTATION                  │      │ OBLIGATION                   │
│ "GET /users/42 returns 200"  │◄────►│ "GET /users/42 returns 200"  │
│ "body has id, name, email"   │      │ "body has id, name, email"   │
└───────────────┬──────────────┘      └───────────────┬──────────────┘
                │                                     │
                └────────►  CONTRACT (pact file)  ◄────┘
                     one shared, versioned source of truth
```

**Figure 1 —** Expectations and obligations are two views of one contract.

## What a contract test proves — and does not prove

| It proves | It does not prove |
| --------- | ----------------- |
| The provider still returns what this consumer needs | That the provider's business logic is correct |
| A changed field name or type would break this consumer | That the whole system works end to end |
| The consumer and provider agree on status, path, body | Performance, security, or throughput |
| Breaking changes fail *before* deployment | That there are no bugs in either service |

> **Key idea:** A contract test is a **compatibility check**, not a correctness test. It fences off the narrow slice of behaviour two teams share.

## A first taste: `user-service` and `order-service`

`order-service` calls `user-service` to enrich an order. It only ever needs one user:

```text
GET /users/42
```

The provider currently responds with:

```json
{
  "id": 42,
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "active": true,
  "createdAt": "2024-01-05T10:00:00Z"
}
```

The consumer writes down exactly what it depends on, and a test generates the contract. Here is a complete consumer Pact test — it is the *first half* of contract testing:

```java
package com.example.order;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service")
class UserClientContractTest {

    @Pact(consumer = "order-service")
    RequestResponsePact user42Exists(PactDslWithProvider builder) {
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
                .stringType("email", "ada@example.com")
                .booleanType("active", true)
                .datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ss'Z'"))
            .toPact();
    }

    @Test
    @PactTestFor(pactMethod = "user42Exists")
    void fetchesUser(MockServer mockServer) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(
                URI.create(mockServer.getUrl() + "/users/42"))
            .GET()
            .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
            .send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("Ada Lovelace");
    }
}
```

The **provider-state** name `"user 42 exists"` and the interaction name `"a request for user 42"` will appear everywhere in this guide.

## The two halves

Contract testing is deliberately split, so neither side needs the other running:

1. **Consumer side** — a test runs against a **mock provider** and records the expectation into a **pact file**.
2. **Provider side** — the real provider replays the recorded request and checks that its response honours the contract.

Neither half starts both services. That is what makes it fast and stable.

## Recap

- A **contract** is a machine-readable agreement between a **consumer** and a **provider**.
- Consumer **expectations** and provider **obligations** are the same promise, seen from two sides.
- Contract tests prove *compatibility*, not business correctness or end-to-end behaviour.
- The workflow has two independent halves: generate the pact, then verify the provider.

## Practice

1. In one sentence, state the difference between a consumer's *expectation* and a provider's *obligation*. Why can they be the same sentence?

2. `user-service` renames `email` to `emailAddress`. Would a contract test catch that before deployment? Explain.

> **Answer.** 1. The expectation is what the consumer needs from the provider; the obligation is what the provider promises to deliver. They describe the same request/response pair from opposite sides, so a correct contract makes them identical. 2. Yes — the consumer's pact records that it reads a field named `email`. Provider verification replays the request and finds `emailAddress` instead, so verification fails before the change reaches an environment where `order-service` runs.

## See also

- [The Problem Contracts Solve](02-The-Problem-Contracts-Solve.md)
- [Consumers, Providers & Contracts](03-Consumers-Providers-And-Contracts.md)
- [Core Vocabulary](06-Core-Vocabulary.md)
- [The Pact Workflow End to End](../02-Pact-Workflow/07-The-Pact-Workflow-End-to-End.md)
