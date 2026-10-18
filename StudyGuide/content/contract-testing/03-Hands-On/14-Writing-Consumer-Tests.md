# 14 — Writing Consumer Tests

---

## The Idea: Let the Test Drive a Fake Provider

A Pact **consumer test** does not call the real provider. Instead it:

1. Describes the request the consumer makes and the response it expects.
2. Runs the real consumer code (`UserClient`) against a **Pact mock server**.
3. Asserts the consumer's behaviour on that response.
4. Writes a **pact file** recording the interaction.

The magic is that the mock server plays the provider *and* records what it
served, so the contract is a by-product of a normal unit test — not a document
someone has to maintain by hand.

```text
@Test
  │
  ├─► UserClient.getUser(42) ─► Pact Mock Server (:random)
  │                                 │  matches request against the pact
  │                                 ▼
  │                             returns canned 200 JSON
  │
  ├─► assertThat(user.name())...
  │
  └─► on test completion: target/pacts/order-service-user-service.json
```

**Figure 1 —** A consumer test runs the real client against the mock server and
emits the pact file.

---

## The Consumer Model Class

`order-service/src/main/java/com/example/orderservice/client/UserResponse.java`:

```java
package com.example.orderservice.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UserResponse(
        long id,
        String name,
        String email,
        boolean active,
        String createdAt
) {
}
```

`createdAt` is kept as a `String` on the consumer side — the consumer only
needs to read it, and a `String` avoids coupling the client to a date format.
The provider owns the real type; the contract owns the *shape*.

---

## The Client Under Test

`order-service/src/main/java/com/example/orderservice/client/UserClient.java`:

```java
package com.example.orderservice.client;

import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

public class UserClient {

    private final RestClient restClient;

    public UserClient(String baseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public UserResponse getUser(long id) {
        try {
            return restClient.get()
                    .uri("/users/{id}", id)
                    .retrieve()
                    .body(UserResponse.class);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new UserNotFoundException(id);
            }
            throw e;
        }
    }
}
```

`order-service/src/main/java/com/example/orderservice/client/UserNotFoundException.java`:

```java
package com.example.orderservice.client;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(long id) {
        super("user " + id + " not found");
    }
}
```

The base URL is a **constructor parameter**, not a hard-coded field. That one
design choice is what lets the same class run against the mock server in a test
and against the real service in production.

---

## Matchers: Describe the Shape, Not the Value

Hard-coding `"Ada Lovelace"` would make the provider break every time the name
changes. Pact **matchers** instead assert a *type* or a *pattern*. The example
value is only used to render the pact file and to satisfy the client during the
test.

| Matcher method                             | Meaning                                    |
| ------------------------------------------ | ------------------------------------------ |
| `integerType("id", 42)`                    | `id` is an integer (any value)             |
| `stringType("name", "Ada Lovelace")`       | `name` is a string (any value)             |
| `stringMatcher("email", regex, example)`   | `email` matches the regular expression     |
| `booleanType("active", true)`              | `active` is a boolean                      |
| `datetime("createdAt", format)`            | `createdAt` is a datetime in that format   |

You will meet the full matcher catalogue (including `eachLike`, `regex`, `term`
and provider-state generators) in
[Matchers & Matching Rules](../02-Pact-Workflow/09-Matchers-And-Matching-Rules.md).
This page uses the five you need for `UserResponse`.

> **Give `datetime` an explicit example.** The two-argument
> `datetime(name, format)` generates the example from the *current* time, so
> the pact would contain "now" and your test could only assert a non-null
> value. Passing an `Instant` and a `TimeZone` (as the test below does) pins the
> example to `2024-01-05T10:00:00Z`, which keeps the pact readable and the
> assertion exact. Other matchers take the example as their obvious second
> argument (`integerType(name, 42)`, `stringType(name, "Ada Lovelace")`).

---

## The Contract Test

`order-service/src/test/java/com/example/orderservice/client/UserClientContractTest.java`:

```java
package com.example.orderservice.client;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.DslPart;
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import au.com.dius.pact.consumer.dsl.PactDslWithProvider;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.RequestResponsePact;
import au.com.dius.pact.core.model.annotations.Pact;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import java.time.Instant;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service")
class UserClientContractTest {

    private static final Map<String, String> JSON =
            Map.of("Content-Type", "application/json");

    @Pact(consumer = "order-service", provider = "user-service")
    RequestResponsePact user42Exists(PactDslWithProvider builder) {
        DslPart body = new PactDslJsonBody()
                .integerType("id", 42)
                .stringType("name", "Ada Lovelace")
                .stringMatcher("email", "\\S+@\\S+\\.\\S+", "ada@example.com")
                .booleanType("active", true)
                .datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ss'Z'",
                        Instant.parse("2024-01-05T10:00:00Z"),
                        TimeZone.getTimeZone("UTC"));

        return builder
                .given("user 42 exists")
                .uponReceiving("a request for an existing user")
                .path("/users/42")
                .method("GET")
                .willRespondWith()
                .status(200)
                .headers(JSON)
                .body(body)
                .toPact();
    }

    @Pact(consumer = "order-service", provider = "user-service")
    RequestResponsePact user999Missing(PactDslWithProvider builder) {
        return builder
                .given("user 999 does not exist")
                .uponReceiving("a request for a missing user")
                .path("/users/999")
                .method("GET")
                .willRespondWith()
                .status(404)
                .headers(JSON)
                .body(new PactDslJsonBody()
                        .stringType("error", "user not found"))
                .toPact();
    }

    @Test
    @PactTestFor(providerName = "user-service", pactMethod = "user42Exists")
    void getUser_returnsUser_whenUserExists(MockServer mockServer) {
        UserClient client = new UserClient(mockServer.getUrl());

        UserResponse user = client.getUser(42L);

        assertThat(user.id()).isEqualTo(42L);
        assertThat(user.name()).isEqualTo("Ada Lovelace");
        assertThat(user.email()).isEqualTo("ada@example.com");
        assertThat(user.active()).isTrue();
        assertThat(user.createdAt()).isEqualTo("2024-01-05T10:00:00Z");
    }

    @Test
    @PactTestFor(providerName = "user-service", pactMethod = "user999Missing")
    void getUser_throws_whenUserMissing(MockServer mockServer) {
        UserClient client = new UserClient(mockServer.getUrl());

        assertThatThrownBy(() -> client.getUser(999L))
                .isInstanceOf(UserNotFoundException.class);
    }
}
```

---

## How the Pieces Fit Together

### `@ExtendWith(PactConsumerTestExt.class)`

Registers the JUnit 5 extension that:

- starts a **mock HTTP server** before each test,
- injects a `MockServer` parameter,
- verifies the consumer actually made the expected request,
- writes the pact file when the test class finishes.

### `@PactTestFor`

At class level it declares the default `providerName`. At method level,
`pactMethod = "user42Exists"` selects **which** `@Pact` method defines this
test's mock server. Without `pactMethod`, a test would get every interaction
defined in the class.

### The two `@Pact` methods

Each returns a `RequestResponsePact` built with the fluent
`PactDslWithProvider` DSL:

| DSL call                        | Produces                                  |
| ------------------------------- | ----------------------------------------- |
| `.given("user 42 exists")`      | a **provider state** in the pact file     |
| `.uponReceiving("...")`         | the interaction **description**           |
| `.path("/users/42")`            | the request path                          |
| `.method("GET")`                | the request method                        |
| `.willRespondWith()`            | switches the DSL to response mode         |
| `.status(200)`                  | the response status                       |
| `.headers(JSON)`                | response headers matched exactly          |
| `.body(body)`                   | the response body + its matching rules    |
| `.toPact()`                     | a `RequestResponsePact`                   |

### Mock server base URL injection

`MockServer` is injected as a test-method parameter. `mockServer.getUrl()`
returns something like `http://localhost:52231`. Passing that into
`new UserClient(mockServer.getUrl())` is the entire integration — no Spring
context, no HTTP stubbing libraries, no ports to manage.

### Test naming = interaction description

The string you pass to `uponReceiving(...)` becomes the interaction's
`description` in the pact file and in the broker UI. Treat it as the test's
name and keep it scenario-oriented: `"a request for an existing user"`, not
`"test1"`. The Java `@Pact` method name (`user42Exists`) is only a selector —
it is what `pactMethod` points at.

---

## Run It (Before Reading Page 15)

```bash
cd order-service
mvn -q test
```

```text
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The pact file is written to `target/pacts/`. Page 15 opens it and explains
every field.

---

## Common Mistakes

- **All the interactions in one pact, or one per method?** By default the
  extension can build a mock server from every `@Pact` method for the provider.
  Using `pactMethod` on each `@Test` keeps each test focused on one interaction
  while still writing a single combined pact file per consumer/provider pair.
- **Asserting exact values.** `assertThat(user.name()).isEqualTo("Ada Lovelace")`
  is fine because the mock server *serves that exact example*. Keep such
  assertions in the test but keep **matchers** in the contract — otherwise the
  provider is pinned to the literal value.
- **Forgetting the 404 path.** If the consumer branches on 404, that branch
  must be a contract too; otherwise a provider change silently breaks it.
- **Testing business logic here.** A contract test proves the *shape of the
  conversation*, not that a discount is calculated correctly. Put the latter in
  ordinary unit tests.

---

## Practice

1. **Add a request header.** The consumer will send
   `Accept: application/json`. Add `.headers(Map.of("Accept", "application/json"))`
   to the request part of `user42Exists` and rerun. What appears in the pact
   file for the request?
2. **Loosen the email matcher.** Replace the regex with
   `stringType("email", "ada@example.com")`. Which is the better contract for
   an email field, and why?

<details>
<summary>Answer</summary>

1. A `headers` section appears under `request` containing
   `"Accept": "application/json"`.
2. `stringType` proves only that the field is a string. The regex additionally
   proves the value looks like an email, which is usually the real expectation.
   Prefer the strongest matcher that still describes a legitimate contract;
   over-specifying (a full RFC-5322 regex) is the other extreme and becomes
   brittle.

</details>

---

## See also

- [Project Setup](13-Project-Setup.md)
- [Generating & Reading the Pact](15-Generating-And-Reading-The-Pact.md)
- [Matchers & Matching Rules](../02-Pact-Workflow/09-Matchers-And-Matching-Rules.md)
- [Provider States](../02-Pact-Workflow/12-Provider-States.md)

## Recap

- A consumer test runs the **real client** against a Pact **mock server** and
  writes a pact file as a side effect.
- `@ExtendWith(PactConsumerTestExt.class)` + `@PactTestFor(providerName=...)`
  wire up the extension; `pactMethod` selects one interaction per test.
- `@Pact` methods use `PactDslJsonBody` matchers (`integerType`, `stringType`,
  `stringMatcher`, `booleanType`, `datetime`) so the contract describes **shape,
  not literal values**.
- Inject the **`MockServer`** to get the base URL and hand it to the client.
- The `uponReceiving(...)` string is the interaction **description** — name it
  like a test case.
- A 404 branch is part of the contract, not an afterthought.
