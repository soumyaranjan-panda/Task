# 25 — SCC Consumer Side

The provider generated and published a stubs jar. Now `order-service` consumes those stubs so it can test `UserClient` without running `user-service` at all. This page covers Stub Runner for HTTP and for messaging.

## The Idea: Stub Runner

**Stub Runner** resolves a producer's stubs artifact, starts a **WireMock** server (HTTP) or sets up message routes (messaging), and lets your code talk to that fake. It is the consumer-side counterpart to the SCC producer plugin.

```text
 order-service test JVM
 ┌──────────────────────────────────────────────┐
 │ @AutoConfigureStubRunner(                     │
 │   ids="com.example:user-service:+:stubs:8090")│
 │                                               │
 │  Stub Runner ──► resolves stubs jar           │
 │       │           (local ~/.m2 or Nexus)      │
 │       ▼                                        │
 │  WireMock on :8090  ── replays contract       │
 │       ▲                                        │
 │       │ HTTP GET /users/42                     │
 │  UserClient ──► assertThat(user.name())...     │
 └──────────────────────────────────────────────┘
```

**Figure 1 —** Stub Runner turns the provider's stubs jar into a running WireMock.

## Adding the Dependency

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-contract-stub-runner</artifactId>
    <scope>test</scope>
</dependency>
```

The version is managed by the `spring-cloud-dependencies` BOM.

## The `@AutoConfigureStubRunner` Annotation

```java
@AutoConfigureStubRunner(
    ids = "com.example:user-service:+:stubs:8090",
    stubsMode = StubRunnerProperties.StubsMode.LOCAL
)
```

`ids` uses the **Ivy notation** `groupId:artifactId:version:classifier:port`:

| Part | Value | Meaning |
| --- | --- | --- |
| `groupId` | `com.example` | producer group |
| `artifactId` | `user-service` | producer artifact |
| `version` | `+` | latest available |
| classifier | `stubs` | the stubs jar |
| port | `8090` | fixed WireMock port |

| Attribute | Purpose |
| --- | --- |
| `ids` | one or more `groupId:artifactId:version:classifier:port` strings |
| `stubsMode` | `LOCAL` (Maven cache) or `REMOTE` (Maven repo) |
| `repositoryRoot` | base URL of the remote Maven repository |
| `generateStubs` | generate stubs if only contracts are available |
| `workOffline` | reuse downloaded stubs without checking the network |

## The `UserClient`

`order-service` calls `user-service` with Spring's `RestClient`:

```java
package com.example.orderservice.client;

import com.example.orderservice.model.User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class UserClient {

    private final RestClient restClient;

    public UserClient(RestClient.Builder builder) {
        this.restClient = builder.baseUrl("http://localhost:8090").build();
    }

    public User getUser(long id) {
        return restClient.get()
                .uri("/users/{id}", id)
                .retrieve()
                .body(User.class);
    }
}
```

```java
package com.example.orderservice.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record User(long id, String name, String email, boolean active,
                   String createdAt) {
}
```

## A Full Consumer Test

```java
package com.example.orderservice.client;

import com.example.orderservice.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.contract.stubrunner.StubRunnerProperties;
import org.springframework.cloud.contract.stubrunner.spring.AutoConfigureStubRunner;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureStubRunner(
        ids = "com.example:user-service:+:stubs:8090",
        stubsMode = StubRunnerProperties.StubsMode.LOCAL
)
class UserClientStubTest {

    @Autowired
    private UserClient userClient;

    @Test
    void fetchesUser42FromStub() {
        User user = userClient.getUser(42L);

        assertThat(user.id()).isEqualTo(42L);
        assertThat(user.name()).isEqualTo("Ada Lovelace");
        assertThat(user.email()).isEqualTo("ada@example.com");
        assertThat(user.active()).isTrue();
    }
}
```

Promote a stub to the real world by changing only `UserClient`'s base URL — the contract stays the same.

## Fixed Port vs Injected Port

A fixed port (`:8090`) is simple but can collide. To let Stub Runner pick a free port, omit it from `ids` and inject the assigned port:

```java
import org.springframework.cloud.contract.stubrunner.spring.StubRunnerPort;

@StubRunnerPort("user-service")
int userServicePort;
```

Then build the `UserClient` base URL from `userServicePort`.

## Messaging Stubs

SCC also handles asynchronous contracts. The `order-service` producer writes a messaging contract and the generated messaging stubs are triggered from `notification-service` tests.

Producer contract `src/test/resources/contracts/orderCreated.groovy` in `order-service`:

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should emit an order-created event"
    label "order-created"
    input {
        triggeredBy("publishOrderCreated()")
    }
    outputMessage {
        sentTo "orders"
        headers {
            contentType applicationJson()
        }
        body(
            orderId: $(anyPositiveInt()),
            userId: $(anyPositiveInt()),
            amount: $(anyDouble()),
            status: "CREATED"
        )
    }
}
```

`triggeredBy` names a method on the producer base class that fires the real event. Consumers trigger the same label from the generated stubs:

```java
package com.example.notificationservice;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.contract.stubrunner.StubRunnerProperties;
import org.springframework.cloud.contract.stubrunner.StubTrigger;
import org.springframework.cloud.contract.stubrunner.spring.AutoConfigureStubRunner;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@AutoConfigureStubRunner(
        ids = "com.example:order-service:+:stubs:0",
        stubsMode = StubRunnerProperties.StubsMode.LOCAL
)
class NotificationListenerStubTest {

    @Autowired
    private StubTrigger stubTrigger;

    @Autowired
    private NotificationListener listener;

    @Test
    void consumesOrderCreatedEvent() {
        stubTrigger.trigger("order-created");

        // assert that NotificationListener reacted to the event
    }
}
```

```text
 StubTrigger.trigger("order-created")
        │
        ▼
 SCC message route (from order-service stubs)
        │  publishes JSON to "orders"
        ▼
 notification-service listener receives it
        │
        ▼
 assert notification recorded / sent
```

**Figure 2 —** Messaging stubs publish to a label the consumer triggers.

## Local vs Remote Stubs and `stubsMode`

| `stubsMode` | Resolves from | Use when |
| --- | --- | --- |
| `LOCAL` | local Maven cache (`~/.m2`) | provider built on the same machine or CI job |
| `REMOTE` | `repositoryRoot` (Nexus/Artifactory) | provider stubs published centrally |

Remote setup:

```java
@AutoConfigureStubRunner(
    ids = "com.example:user-service:+:stubs:8090",
    repositoryRoot = "https://nexus.example.com/repository/maven-public/",
    stubsMode = StubRunnerProperties.StubsMode.REMOTE
)
```

Point at a folder on disk or on the classpath with the `stubs://` protocol:

```java
@AutoConfigureStubRunner(
    ids = "com.example:user-service",
    repositoryRoot = "stubs://file:///home/me/user-service/target/stubs/",
    stubsMode = StubRunnerProperties.StubsMode.REMOTE
)
```

For a standalone stub server, **Stub Runner Boot** (`spring-cloud-contract-stub-runner-boot`, `@EnableStubRunnerServer`) exposes `/stubs` and `/triggers/{label}` over HTTP so non-JVM consumers can use the same stubs.

## Gotchas

- **Port collisions** when several tests fix the same port; prefer `@StubRunnerPort` or a per-test port.
- **`LOCAL` with a stale provider build** silently tests old stubs. Rebuild the provider first.
- **Hard-coding `localhost:8090` in production code** leaks test assumptions; keep the base URL configurable.
- **Forgetting `;stubs`** (classifier) makes Stub Runner look for the wrong artifact.

## Practice

1. A teammate's consumer test fails with `StubNotFoundException`. List two likely causes.
2. You want to test the 404 path in `order-service`. How do you make the stub return `404`?

**Answer 1.** The provider stubs jar was never installed/published, or `stubsMode`/`repositoryRoot` points at the wrong repository (or the classifier is missing).
**Answer 2.** Call `userClient.getUser(999L)` — the stub for `GET /users/999` returns `404 { "error": "user not found" }`, and `UserClient` must surface that as its own exception.

## See also

- [23 — SCC Concepts](23-SCC-Concepts.md)
- [24 — SCC Producer Side](24-SCC-Producer-Side.md)
- [26 — SCC vs Pact](26-SCC-vs-Pact.md)
- [Writing Consumer Tests (Pact)](../03-Hands-On/14-Writing-Consumer-Tests.md)
- [Message Pact (Async)](../04-Advanced/19-Message-Pact-Async.md)

## Recap

- Add `spring-cloud-starter-contract-stub-runner` and annotate tests with `@AutoConfigureStubRunner`.
- `ids = group:artifact:version:classifier:port`; `+` means latest.
- `stubsMode` is `LOCAL` (Maven cache) or `REMOTE` (repository); `stubs://` points at a folder.
- Prefer `@StubRunnerPort` over a fixed port to avoid collisions.
- Messaging contracts use `label` + `outputMessage`; consumers fire them with `StubTrigger.trigger(...)`.
- Stubs and the real service are interchangeable because both honour the same contract.
