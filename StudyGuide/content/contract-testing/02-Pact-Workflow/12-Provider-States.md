# 12 — Provider States

A pact interaction assumes the provider is in a particular condition before the request is replayed — a specific user exists, a specific user does not, an order is already shipped. That condition is a **provider state**. The consumer *names* the state; the provider *arranges* it.

This keeps contracts honest: the consumer states a precondition, and the provider sets it up with real code, without the consumer knowing anything about the provider's database.

---

## Name vs Implementation

```text
  CONSUMER declares:               PROVIDER implements:
  ─────────────────                ───────────────────
  .given("user 42 exists")  ───►   @State("user 42 exists")
  a name, no code                  void user42Exists() { seed user 42 }

  .given("user 999 does not")  ──► @State("user 999 does not exist")
                                   void user999DoesNotExist() { remove 999 }
```

**Figure 1 —** The consumer supplies a label; the provider supplies the setup.

The consumer test itself does not create `user 42`. It only asserts: *given that user 42 exists, GET /users/42 returns this shape*. How the provider makes that true is entirely the provider's business.

---

## The Verification Lifecycle

```text
  VERIFICATION LIFECYCLE FOR ONE INTERACTION

  pact file:  providerStates = [ "user 42 exists" ]
                    │
                    ▼
  the Pact test runner, before each interaction
                    │
                    ▼
  @State("user 42 exists") runs inside the provider JVM
     -> seeds user 42 in the database
                    │
                    ▼
  request GET /users/42 replayed against the running provider
                    │
                    ▼
  response compared to the contract (see Request & Response Matching)
                    │
                    ▼
  next interaction starts from a fresh @State (JUnit @AfterEach
  may tear data down between interactions)
```

**Figure 2 —** A state callback runs before each interaction that declares it, then the request is replayed.

---

## How the Pact File Records It

The consumer declares the state with `given(...)`:

```java
@Pact(consumer = "order-service")
RequestResponsePact getUser42(PactDslWithProvider builder) {
    return builder
        .given("user 42 exists")
        .uponReceiving("a request for user 42")
            .path("/users/42")
            .method("GET")
        .willRespondWith()
            ...
        .toPact();
}
```

The pact file stores it as a named entry:

```json
{
  "description": "a request for user 42",
  "providerStates": [
    { "name": "user 42 exists" }
  ],
  "request": { "method": "GET", "path": "/users/42" },
  "response": { "status": 200 }
}
```

And the 404 interaction:

```json
{
  "description": "a request for a user that does not exist",
  "providerStates": [
    { "name": "user 999 does not exist" }
  ],
  "request": { "method": "GET", "path": "/users/999" },
  "response": { "status": 404 }
}
```

> In pact specification **V2** this was a single `providerState` string. V3 and V4 use the `providerStates` array, which allows multiple states per interaction.

---

## Implementing States on the Provider

A complete provider test for `user-service`, using Pact JVM 4.x and the Spring module.

```java
package com.example.users;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.spring.junit5.PactVerificationSpringProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactBroker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@Provider("user-service")
@PactBroker(host = "localhost", port = "9292")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserServiceProviderTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void before(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationSpringProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("user 42 exists")
    void user42Exists() {
        userRepository.save(
            new User(42L, "Ada Lovelace", "ada@example.com", true));
    }

    @State("user 999 does not exist")
    void user999DoesNotExist() {
        userRepository.deleteById(999L);
    }
}
```

Key pieces:

| Annotation / method | Role |
| ------------------- | ---- |
| `@Provider("user-service")` | Ties the test class to the provider name in the pacts. |
| `@PactBroker(...)` / `@PactFolder("pacts")` | Where the pacts come from. Use `@PactFolder` for local runs. |
| `@TestTemplate` + `PactVerificationSpringProvider` | Runs one verification per interaction. |
| `context.setTarget(new HttpTestTarget(...))` | Points verification at the running app. |
| `@State("...")` | A setup callback matched by the state **name**. |

If no `@State` method matches a declared state, verification fails before the request is even replayed.

---

## State Params

Sometimes the value is only known at verification time — for example an id that the provider generates. Declare a parameter on the consumer side and read it in the callback.

Consumer side:

```java
.given("user 42 exists", Map.of("id", 42))
```

Pact file:

```json
"providerStates": [
  { "name": "user 42 exists", "params": { "id": 42 } }
]
```

Provider callback receives the params map:

```java
@State("user 42 exists")
void user42Exists(Map<String, Object> params) {
    Long id = Long.valueOf(params.get("id").toString());
    userRepository.save(new User(id, "Ada Lovelace", "ada@example.com", true));
}
```

Combine this with the `fromProviderState` generator so the consumer can use a value it does not know at author time (see [Matchers And Matching Rules](09-Matchers-And-Matching-Rules.md)):

```java
.pathFromProviderState("/users/${id}", "/users/42")
```

A `@State` method may also **return** a `Map<String, Object>`; the values are then available to the `fromProviderState` generators for that interaction.

---

## Gotchas

- **State setup is arrangement, not assertion.** Never assert on business logic inside `@State`; that belongs in the provider's own tests. A state callback that "tests" things muddies failures.
- **Keep setup minimal.** Seed only what the interaction needs. Copying a whole fixture graph couples the contract to unrelated data.
- **Do not use the endpoint under test to create the data** unless you genuinely want an integration test. The point is to isolate the response contract.
- **States must be reproducible.** Random ids or timestamps in setup make failures flaky.
- **Missing state = failed verification**, reported as a missing `@State` method, before any request is sent.
- **V2 vs V3 naming.** A single `providerState` (V2) versus `providerStates` (V3+) matters when reading older pacts.

---

## Recap

- A provider state is a named precondition, e.g. `"user 42 exists"`.
- Consumers declare states with `given(...)`; providers implement them with `@State`.
- States are recorded in the pact under `providerStates` (array in V3/V4).
- State params carry values known only at verification time; `fromProviderState` consumes them.
- State callbacks arrange data only — they must not test business logic.

---

## Practice

1. The consumer declares `given("user 42 exists")` but the provider has no matching `@State` method. What happens, and when?

> **Answer.** Verification fails for that interaction before the request is replayed, because Pact cannot find a matching state callback.

2. Why should a `@State` method not assert that `GET /users/42` returns `200`?

> **Answer.** That assertion is exactly what the pact verification performs afterwards. Putting it in the state callback duplicates the check and, worse, can mask or confuse the real failure by failing during setup.

3. An interaction needs the id of a user the provider will generate. How do the consumer and provider cooperate?

> **Answer.** The consumer declares the state with params (e.g. `given("user 42 exists", Map.of("id", 42))`) and uses `fromProviderState`/`pathFromProviderState` with an expression like `${id}`. The provider's `@State` callback reads the params (or returns a map), supplying the concrete value at verification time.

---

## See also

- [Matchers And Matching Rules](09-Matchers-And-Matching-Rules.md)
- [Request And Response Matching](10-Request-And-Response-Matching.md)
- [Provider Verification](../03-Hands-On/16-Provider-Verification.md)
- [Anti-Patterns & Pitfalls](../06-Operations/28-Anti-Patterns-And-Pitfalls.md)
- [The Pact Workflow End to End](07-The-Pact-Workflow-End-to-End.md)
