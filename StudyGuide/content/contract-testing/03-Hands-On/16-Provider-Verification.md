# 16 — Provider Verification

---

## The Provider's Job: Replay the Requests, Honour the Matchers

Consumer pacts describe expectations. **Provider verification** takes each
interaction, sets up the matching **provider state**, replays the request
against the *real running provider*, and checks the real response against the
matchers. That is the whole idea.

```text
pact file ──► for each interaction:
                 │
                 ├─ set state  ──► @State("user 42 exists")  seeds data
                 │
                 ├─ replay request  GET /users/42 ──► real UserController
                 │
                 ├─ compare response to response.matchingRules
                 │       status  == 200            (exact)
                 │       id      integer
                 │       name    string
                 │       email   regex
                 │       ...
                 │
                 └─ result: pass / fail  (optionally published)
```

**Figure 1 —** Verification replays each interaction against the real provider
and compares using the matchers.

---

## The Provider Code

These are the classes the contract test verifies. They are ordinary Spring
Boot classes — nothing here is Pact-aware.

`user-service/src/main/java/com/example/userservice/UserResponse.java`:

```java
package com.example.userservice;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;

public record UserResponse(
        long id,
        String name,
        String email,
        boolean active,
        @JsonFormat(shape = JsonFormat.Shape.STRING) Instant createdAt
) {
}
```

`user-service/src/main/java/com/example/userservice/UserService.java`:

```java
package com.example.userservice;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    private final Map<Long, UserResponse> users = new ConcurrentHashMap<>();

    public Optional<UserResponse> findById(long id) {
        return Optional.ofNullable(users.get(id));
    }

    public void save(UserResponse user) {
        users.put(user.id(), user);
    }

    public void clear() {
        users.clear();
    }
}
```

`user-service/src/main/java/com/example/userservice/UserController.java`:

```java
package com.example.userservice;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUser(@PathVariable long id) {
        return userService.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity
                        .status(404)
                        .body(Map.of("error", "user not found")));
    }
}
```

`user-service/src/main/java/com/example/userservice/UserServiceApplication.java`:

```java
package com.example.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}
```

---

## Give the Provider the Pact

The provider test loads pacts from a folder. Copy the generated pact from the
consumer project first:

```bash
mkdir -p user-service/pacts
cp order-service/target/pacts/order-service-user-service.json user-service/pacts/
```

```text
user-service/
├── pacts/
│   └── order-service-user-service.json   ◄── copied from the consumer
├── pom.xml
└── src/...
```

**Figure 2 —** For local verification, copy the pact into the provider's
`pacts/` folder. In CI the provider reads it from the broker instead.

---

## The Provider Contract Test

`user-service/src/test/java/com/example/userservice/UserProviderContractTest.java`:

```java
package com.example.userservice;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import au.com.dius.pact.provider.spring.spring6.PactVerificationSpring6Provider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.time.Instant;

@Provider("user-service")
@PactFolder("pacts")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserProviderContractTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserService userService;

    @BeforeEach
    void setUp(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationSpring6Provider.class)
    void verifyPact(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @State("user 42 exists")
    void user42Exists() {
        userService.clear();
        userService.save(new UserResponse(
                42L,
                "Ada Lovelace",
                "ada@example.com",
                true,
                Instant.parse("2024-01-05T10:00:00Z")));
    }

    @State("user 999 does not exist")
    void user999DoesNotExist() {
        userService.clear();
    }
}
```

### Why each annotation is there

| Annotation                        | Purpose                                                        |
| --------------------------------- | -------------------------------------------------------------- |
| `@Provider("user-service")`       | Names the provider; must match the pact's provider             |
| `@PactFolder("pacts")`            | Loads pact files from `user-service/pacts`                     |
| `@SpringBootTest(RANDOM_PORT)`    | Starts the real app on a random port for each verification     |
| `@LocalServerPort`                | Injects that port                                              |
| `HttpTestTarget("localhost", port)` | Tells Pact where the running provider is                     |
| `@TestTemplate`                   | One generated test per interaction in the loaded pacts         |
| `PactVerificationSpring6Provider` | The Spring 6-aware invocation context provider                 |
| `@State("...")`                   | Callback that sets up provider data for a named state          |

### How the provider is started

`@SpringBootTest(webEnvironment = RANDOM_PORT)` boots the full application
context and binds Tomcat to an ephemeral port. The JUnit 5 extension calls
`@BeforeEach setUp(...)` — which runs once per generated interaction — and
points the target at that port. Pact then issues real HTTP requests to it.
There is no separate `mvn spring-boot:run` needed.

### Provider states seed the data

`@State("user 42 exists")` runs **before** the interaction whose
`providerStates` name is `"user 42 exists"`. Because the test instance is
Spring-managed, `@Autowired UserService` is available and the callback can
populate the in-memory store. `@State("user 999 does not exist")` clears the
store so the 404 path is exercised against empty data.

The state string must match the `.given(...)` string from the consumer
character-for-character. `"user 42 exists"` here is the same string used in
[Writing Consumer Tests](14-Writing-Consumer-Tests.md).

---

## Run Verification

```bash
cd user-service
mvn test
```

Successful output looks like this:

```text
Verifying a pact between order-service and user-service

  a request for an existing user
    returns a response which
      has status code 200 (OK)
      has a matching body (OK)

  a request for a missing user
    returns a response which
      has status code 404 (OK)
      has a matching body (OK)

2 interactions, 0 failures
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### What a failure looks like

Break the provider deliberately — change the `id` field to a `String` in
`UserResponse` (or return `"42"` instead of `42`) — and rerun:

```text
Verifying a pact between order-service and user-service

  a request for an existing user
    returns a response which
      has status code 200 (OK)
      has a matching body (FAILED)

Failures:

1) Verifying a pact between order-service and user-service
   - a request for an existing user
     Expected a body with the following differences:

     Diff:
       {
         "active": true,
         "createdAt": "2024-01-05T10:00:00Z",
         "email": "ada@example.com",
         "name": "Ada Lovelace",
       - "id": 42
       + "id": "42"
       }

[INFO] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0
[INFO] BUILD FAILURE
```

Read the diff literally: `-` is what the pact (consumer) expects, `+` is what
the provider returned. Here the provider returned a string where an integer was
required, so the `integer` matcher failed.

---

## Verifying from the Pact Broker (the CI setup)

Locally, `@PactFolder` keeps the lab hermetic. In CI the provider should verify
the **published** pact. Swap the loader:

```java
@Provider("user-service")
@PactBroker(
        url = "${PACT_BROKER_BASE_URL:http://localhost:9292}",
        authentication = @PactBrokerAuth(
                username = "${PACT_BROKER_USERNAME:pact}",
                password = "${PACT_BROKER_PASSWORD:pact}"
        )
)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class UserProviderContractTest {
    // ... rest identical
}
```

With imports:

```java
import au.com.dius.pact.provider.junitsupport.loader.PactBroker;
import au.com.dius.pact.provider.junitsupport.loader.PactBrokerAuth;
```

To publish the verification result back to the broker, the result must carry a
provider version. Set the Surefire system properties (already wired in the
provider POM from page 13, adjust values):

```xml
<systemPropertyVariables>
  <pact.verifier.publishResults>true</pact.verifier.publishResults>
  <pact.provider.version>${env.GIT_COMMIT}</pact.provider.version>
  <pact.provider.branch>${env.GIT_BRANCH}</pact.provider.branch>
</systemPropertyVariables>
```

> **Why not `-Dpact.verifier.publishResults=true` on the Maven command line?**
> Maven passes command-line properties to the *build* JVM, not necessarily the
> forked *test* JVM. Surefire's `<systemPropertyVariables>` is the reliable
> route. This applies to `pact.provider.version` too — omit it and the broker
> rejects the result, because a result with no provider version cannot be
> stored.

---

## Troubleshooting

### 1. "No pacts found", or the provider verifies nothing

Symptom: the build is green but no interactions are listed, or you get an
error that no pacts were found.

| Cause                                   | Fix                                                              |
| --------------------------------------- | ---------------------------------------------------------------- |
| `@PactFolder` path wrong                | Path is relative to the module dir; use `pacts` not `../pacts`   |
| Pact file not copied                    | `cp order-service/target/pacts/*.json user-service/pacts/`       |
| Provider name mismatch                  | `@Provider("user-service")` must equal the pact's provider name  |
| Broker URL/credentials wrong            | Test with `curl -u user:pass $PACT_BROKER_BASE_URL/diagnostic/status/heartbeat` |
| Wrong branch/selectors return no pacts  | Check the pact exists and has a verification-relevant version    |

List what the provider will load:

```bash
ls -l user-service/pacts
jq -r '.provider.name' user-service/pacts/order-service-user-service.json
```

```text
user-service
```

### 2. `@State` method never runs (wrong data, or 404 where 200 expected)

Symptom: the 200 interaction fails with a 404 because the store is empty, even
though `@State("user 42 exists")` exists.

| Cause                                                        | Fix                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| State string differs by a character / capitalisation         | Copy the exact `.given(...)` string                             |
| Spring context and test use different class loaders          | Ensure `<useSystemClassLoader>false</useSystemClassLoader>`     |
| `@State` method is `static` or on another class              | Keep it a non-static instance method on the test class          |
| Using `spring` (Spring 5) instead of `spring6`               | Depend on `au.com.dius.pact.provider:spring6`                   |

Print the states the pact actually asks for and diff them against your methods:

```bash
jq -r '.interactions[].providerStates[].name' \
  user-service/pacts/order-service-user-service.json | sort -u
```

```text
user 42 exists
user 999 does not exist
```

---

## Practice

1. **Add a state.** The consumer adds an interaction with
   `.given("user 7 is inactive")` returning a body where `active` is `false`.
   Write the `@State` method and explain what it must seed.
2. **Prove the matcher.** Temporarily change `name` in `UserResponse` to
   `"Grace Hopper"` and rerun verification. Does it pass? Change the field to a
   number instead and rerun. What is the difference, and why?

<details>
<summary>Answer</summary>

1. `@State("user 7 is inactive") void user7Inactive() { userService.clear();
   userService.save(new UserResponse(7L, "Grace Hopper", "grace@example.com",
   false, Instant.parse("2023-06-01T09:00:00Z"))); }` — it must seed a user with
   `active = false` and whatever other fields the interaction exercises.
2. Changing the *value* passes, because `stringType` matches any string. Making
   it a number fails, because `stringType` requires a JSON string. The matcher
   is the contract; the example value is not.

</details>

---

## See also

- [Generating & Reading the Pact](15-Generating-And-Reading-The-Pact.md)
- [Provider States](../02-Pact-Workflow/12-Provider-States.md)
- [Request & Response Matching](../02-Pact-Workflow/10-Request-And-Response-Matching.md)
- [Publishing & Webhooks](17-Publishing-And-Webhooks.md)

## Recap

- Verification replays each interaction against the **real** provider and
  compares the response using the pact's matchers.
- `@Provider` names the provider; `@PactFolder` or `@PactBroker` loads the
  contracts; `@TestTemplate` + `PactVerification...Provider` generates one test
  per interaction.
- `@SpringBootTest(RANDOM_PORT)` starts the app; `@LocalServerPort` +
  `HttpTestTarget` point Pact at it.
- `@State` methods run before an interaction and must use the **exact** state
  string from the consumer's `.given(...)`.
- Publish verification results with `pact.verifier.publishResults` and
  `pact.provider.version` set in the **test** JVM via Surefire.
- A diff reads `-` expected (pact) and `+` actual (provider).
