# 23 — Spring Cloud Contract Concepts

Pact asks the **consumer** to state what it needs. Spring Cloud Contract (SCC) flips the direction: the **provider** writes the contract and the build generates everything from it. This page explains what SCC is, what it generates, and how the two DSLs look for our `user-service`.

## What Spring Cloud Contract Is

**Spring Cloud Contract** is a JVM framework for **producer-driven** contract testing. A provider team writes a contract — a request/response pair (or a messaging pair) — in a small DSL. During the build, the `spring-cloud-contract-maven-plugin` reads every contract and generates **two** artifacts:

1. A **provider verification test** (JUnit + MockMvc) that sends the contract request to the real controller and asserts the response.
2. A **stubs jar** — WireMock mappings (HTTP) or message routes (messaging) — that consumers run in their own tests via **Stub Runner**.

The contract is the single source of truth. Change the contract and the provider test and the consumer stubs change together.

## Producer-Driven at a Glance

```text
        user-service (provider)
  src/test/resources/contracts/
        shouldReturnUser.groovy
                  │
                  │  spring-cloud-contract-maven-plugin
        ┌─────────┴──────────┐
        ▼                    ▼
 ┌───────────────┐   ┌──────────────────────┐
 │ generated     │   │ stubs jar            │
 │ provider test │   │ com.example:         │
 │ (JUnit+MockMvc│   │   user-service:+:stubs│
 │  )            │   │ (WireMock mappings)  │
 └───────────────┘   └──────────┬───────────┘
                                │ publish to Nexus
                                ▼
                    ┌──────────────────────────┐
                    │ order-service (consumer) │
                    │ Stub Runner → WireMock   │
                    │ UserClient → :8090       │
                    └──────────────────────────┘
```

**Figure 1 —** One contract produces both a provider test and consumer stubs.

The arrows point *from* the provider *to* the consumer. That is the opposite of Pact, where the pact file flows from consumer tests to the provider.

## One Contract, Two Artifacts

The contract declares the exchange. Each side gets a different view of it:

```text
 contract (declares)                 who uses it
 ┌────────────────────┐
 │ request:           │
 │   GET /users/42    │───────► provider verification test
 │ response:          │           (does user-service honour it?)
 │   200 application/ │
 │   json { ... }     │───────► consumer stubs
 └────────────────────┘           (WireMock returns example body)
```

**Figure 2 —** The same contract feeds verification on the provider and mocking on the consumer.

The values in the contract double as **example data** for the stubs, while **matchers** relax the provider test so it does not pin exact values.

## The Groovy DSL

Contracts live under `src/test/resources/contracts/`. A Groovy file is executable code that returns a `Contract` object. This is our `shouldReturnUser.groovy`:

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return user 42"
    name "shouldReturnUser"
    request {
        method GET()
        url "/users/42"
    }
    response {
        status OK()
        headers {
            contentType applicationJson()
        }
        body(
            id: $(anyPositiveInt()),
            name: $(regex('[A-Za-z ]+')),
            email: $(regex('[a-z]+@example\\.com')),
            active: $(anyBoolean()),
            createdAt: $(regex('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z'))
        )
    }
}
```

- `OK()` comes from `HttpStatus`; `NOT_FOUND()` works the same way.
- `$(matcher)` wraps a value: the literal (`42`, `"Ada Lovelace"`) is the **example** placed in the stub, and the **matcher** is how verification compares the real response.
- Common matchers: `regex()`, `anyInteger()`, `anyPositiveInt()`, `anyBoolean()`, `anyDouble()`, `anyNonEmptyString()`.

The 404 case is a second contract:

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return 404 when user does not exist"
    name "shouldReturnNotFound"
    request {
        method GET()
        url "/users/999"
    }
    response {
        status NOT_FOUND()
        headers {
            contentType applicationJson()
        }
        body(
            error: "user not found"
        )
    }
}
```

## The YAML DSL

YAML is a declarative equivalent. The same `shouldReturnUser` contract:

```yaml
description: should return user 42
name: shouldReturnUser
request:
  method: GET
  url: /users/42
response:
  status: 200
  headers:
    Content-Type: application/json
  body:
    id: 42
    name: Ada Lovelace
    email: ada@example.com
    active: true
    createdAt: "2024-01-05T10:00:00Z"
  matchers:
    body:
      - path: $.id
        type: by_type
      - path: $.name
        type: by_regex
        value: '[A-Za-z ]+'
      - path: $.email
        type: by_regex
        value: '[a-z]+@example\.com'
      - path: $.active
        type: by_type
      - path: $.createdAt
        type: by_regex
        value: '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z'
```

Matcher types include `by_type` (like `any`), `by_regex`, `by_date`, `by_time`, `by_timestamp`, and `by_command` (dynamic values). YAML cannot use `by_command` with arbitrary code the way Groovy can.

## Base Class and Generated Tests

The generated provider tests extend a **base class** you write. It boots the application context and exposes the HTTP entry point the generated tests call. Configure it in the plugin with `baseClassForTests`.

```java
package com.example.userservice;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class BaseTestClass {

    @Autowired
    protected MockMvc mockMvc;
}
```

`@SpringBootTest` loads the full application context; `@AutoConfigureMockMvc` adds a `MockMvc` that drives the real controllers, filters and message converters **without starting a server**. The default `testMode` (`MOCKMVC`) generates tests against `MockMvc`.

Generated tests land in `target/generated-test-sources/contracts/`. A representative result (`ShouldReturnUserTest`) looks like this:

```java
package com.example.userservice;

import org.junit.jupiter.api.Test;

public class ShouldReturnUserTest extends BaseTestClass {

    @Test
    public void validate_shouldReturnUser() throws Exception {
        // given the contract request GET /users/42, the generated test performs it
        // against MockMvc and asserts status 200, Content-Type application/json,
        // and the JSON fields using the contract's matchers.
    }
}
```

Do not edit generated tests — edit the contract and rebuild. The class name comes from `name` (or the file name); the method is `validate_<name>`.

## What SCC Proves and Does Not Prove

SCC proves the **provider honours the contract** (status, headers, and the shapes/matchers of the body) and gives consumers a faithful stub. It does **not** prove business correctness, end-to-end behaviour, performance, or security. Keep a small number of E2E smoke tests on top.

## Practice

1. Add a contract for `GET /users/42` that returns `active: false` for a deactivated user. Which matcher lets `active` stay a boolean but not be pinned to `false` in the stub example?
2. Why does the 404 contract use no matchers on `error`?

**Answer 1.** `$(anyBoolean())` — the stub example can be `false`, but verification accepts either boolean.
**Answer 2.** The error message is a fixed value the provider always returns, so an exact match is correct and stronger.

## See also

- [24 — SCC Producer Side](24-SCC-Producer-Side.md)
- [25 — SCC Consumer Side](25-SCC-Consumer-Side.md)
- [26 — SCC vs Pact](26-SCC-vs-Pact.md)
- [Consumer-Driven vs Producer-Driven](../01-Foundations/04-Consumer-Driven-vs-Producer-Driven.md)
- [Provider States](../02-Pact-Workflow/12-Provider-States.md)

## Recap

- SCC is **producer-driven**: the provider writes the contract.
- One contract generates a **provider verification test** and a **stubs jar**.
- Contracts live in `src/test/resources/contracts/` and can be Groovy or YAML.
- Matchers relax verification; the literal values seed the stubs.
- The **base class** (`baseClassForTests`) boots the context with `@AutoConfigureMockMvc`.
- Generated tests live in `target/generated-test-sources/` and must not be edited.
