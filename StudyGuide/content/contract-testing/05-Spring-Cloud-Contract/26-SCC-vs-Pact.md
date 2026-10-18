# 26 — Spring Cloud Contract vs Pact

Both tools catch provider/consumer breakage early, but they start from opposite ends. This page compares them honestly and tells you when each fits, plus how to migrate between them.

## The Core Difference

```text
        PACT (consumer-driven)            SCC (producer-driven)
  ┌──────────────────────────┐   ┌──────────────────────────┐
  │ order-service (consumer) │   │ user-service (provider)  │
  │ writes @Pact test        │   │ writes contract.groovy   │
  └────────────┬─────────────┘   └────────────┬─────────────┘
               ▼                               ▼
  ┌──────────────────────────┐   ┌──────────────────────────┐
  │ pact json (expectations) │   │ generated verifier test  │
  └────────────┬─────────────┘   └────────────┬─────────────┘
               ▼                               ▼
  ┌──────────────────────────┐   ┌──────────────────────────┐
  │ Pact Broker + matrix     │   │ stubs jar in Maven repo  │
  └────────────┬─────────────┘   └────────────┬─────────────┘
               ▼                               ▼
  ┌──────────────────────────┐   ┌──────────────────────────┐
  │ provider verify +        │   │ consumer Stub Runner +   │
  │ can-i-deploy gate        │   │ WireMock                 │
  └──────────────────────────┘   └──────────────────────────┘
```

**Figure 1 —** Pact flows consumer → provider; SCC flows provider → consumer.

## Side-by-Side Comparison

| Dimension | Pact | Spring Cloud Contract |
| --- | --- | --- |
| Contract author | The **consumer**, in its tests | The **provider**, in a Groovy/YAML/Java/Kotlin DSL |
| Direction | Consumer-driven | Producer-driven |
| Languages | Polyglot: JVM, JS, Go, .NET, Ruby, PHP, Rust | DSL is JVM; consumers can be any HTTP client but tooling is Spring/JVM |
| Generated artifacts | Pact JSON file; mock server definitions | Generated JUnit verifier test **and** `-stubs.jar` (WireMock + messaging) |
| Async support | `MessagePactBuilder`, message pacts, Pact Broker | Messaging contracts, `StubTrigger`, message routes in stubs |
| Distribution | **Pact Broker / PactFlow** (publish, tags, environments, webhooks) | Maven repository (Nexus/Artifactory) for the stubs jar |
| Deployment gating | **`can-i-deploy`** + the Pact Matrix (native) | No native equivalent; stubs are just artifacts |
| Ecosystem | Pact Foundation + PactFlow; broad non-JVM first-class | Spring Cloud ecosystem; strongest in Spring Boot estates |
| Spring integration | `pact-jvm` JUnit 5 extension; works with `MockMvc`/RestAssured | First-class plugin + `@AutoConfigureStubRunner` |
| Consumer test effort | Higher: each consumer writes and maintains a test | Lower: consumers just run the provider's stubs |
| Who adapts to breakage | Provider adapts to consumer expectations | Consumers adapt to the provider's published contract |
| Learning curve | Concepts: states, matching rules, broker, matrix | DSL + build plugin; less to learn if you know Spring |
| Best fit | Polyglot, genuinely consumer-driven estates | All-JVM / Spring estates where the provider owns the API |

## The Same Contract, Two Ways

Pact — the **consumer** declares the expectation (excerpt):

```java
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "user-service", port = "8090")
class UserClientPactTest {

    @Pact(consumer = "order-service")
    public RequestResponsePact userPact(PactDslWithProvider builder) {
        return builder
            .given("user 42 exists")
            .uponReceiving("a request for user 42")
                .path("/users/42")
                .method("GET")
            .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                    .integerType("id", 42)
                    .stringType("name", "Ada Lovelace")
                    .stringMatcher("email", "[a-z]+@example\\.com",
                                   "ada@example.com")
                    .booleanType("active", true)
                    .stringMatcher("createdAt",
                        "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z",
                        "2024-01-05T10:00:00Z"))
            .toPact();
    }
}
```

SCC — the **provider** declares the same exchange:

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return user 42"
    request {
        method GET()
        url "/users/42"
    }
    response {
        status OK()
        headers { contentType applicationJson() }
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

Pact's provider state `"user 42 exists"` has no direct SCC equivalent — in SCC the provider base class seeds the data the generated test needs.

## What SCC Does Not Give You

- No native **deployment matrix**: SCC cannot tell you which provider version is compatible with which consumer version in an environment.
- No **`can-i-deploy`** gate: verifying stubs is left to whichever CI steps you write.
- No **broker webhooks** that trigger provider builds when a pact changes.
- Stubs are versioned like any Maven artifact (`com.example:user-service:1.0.0:stubs`), but compatibility tracking across versions is manual.

PactFlow does offer **Bi-Directional Contract Testing** (OpenAPI + Pact) that can bring producer contracts into a matrix-like workflow — useful when producers already publish OpenAPI.

## Migration Notes

**SCC → Pact**

1. Move the contract's expectations into a consumer test (`@Pact` + `@PactTestFor`).
2. Replace generated stubs usage with the Pact mock server in consumer tests.
3. Write a `@Provider` + `@State` provider verification test.
4. Stand up a Pact Broker and publish pacts; record deployments.
5. Add `can-i-deploy` to your release pipeline.

**Pact → SCC**

1. Consolidate consumer expectations into producer-authored contracts. You lose per-consumer nuance unless you keep separate contracts per consumer.
2. Replace the mock server with Stub Runner + `@AutoConfigureStubRunner`.
3. Publish the `-stubs.jar` to your Maven repository.
4. Drop the broker if unused — but you also drop the matrix and `can-i-deploy`.
5. Keep a small number of E2E smoke tests; SCC does not replace them.

You can run both: Pact for polyglot consumers, SCC where the provider wants generated tests and stubs from one source.

## When to Choose Which

- Choose **SCC** when the whole estate is JVM/Spring, the provider owns the API, you want provider verification plus stubs from a single source, and you do not need a broker.
- Choose **Pact** when consumers span languages, consumers genuinely drive the API, and you need a broker, the matrix, and `can-i-deploy`.
- Choose **Bi-Directional** when producers already maintain OpenAPI and you want the matrix back.

## Practice

1. A polyglot estate has a Java provider and Go, JS, and .NET consumers. Which tool fits, and why?
2. Your team loves SCC but wants a deploy gate. What can you add, and what does it not cover?

**Answer 1.** Pact — it has first-class libraries per language and the broker records every consumer's expectations against the provider.
**Answer 2.** You can gate on provider verification plus stub versions in CI, but without a broker you have no cross-version compatibility matrix; PactFlow's bi-directional testing can supply one.

## See also

- [23 — SCC Concepts](23-SCC-Concepts.md)
- [24 — SCC Producer Side](24-SCC-Producer-Side.md)
- [25 — SCC Consumer Side](25-SCC-Consumer-Side.md)
- [Consumer-Driven vs Producer-Driven](../01-Foundations/04-Consumer-Driven-vs-Producer-Driven.md)
- [The Pact Broker and PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)
- [Bi-Directional Contract Testing](../04-Advanced/21-Bi-Directional-Contract-Testing.md)

## Recap

- Pact is **consumer-driven**; SCC is **producer-driven**.
- SCC generates a provider test **and** a stubs jar from one contract; Pact generates a pact file from consumer tests.
- SCC distributes stubs via the Maven repo; Pact uses the **Pact Broker**.
- Pact has a native **matrix** and **`can-i-deploy`**; SCC does not.
- Choose by language diversity and whether consumers truly drive the API.
- Migrations are mechanical but direction matters: who adapts to breakage changes.
