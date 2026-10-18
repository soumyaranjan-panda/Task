# 30 — Contract Testing Interview Questions

Thirty questions with concise answers, grouped by difficulty. The running example is `order-service` (consumer) calling `user-service` (provider), plus the `order-created` event consumed by `notification-service`.

## Where Contract Testing Sits

```text
        fewer, slower, broader
   ▲  E2E tests          (a handful)
   │  Contract tests     (one per consumer/provider pair)
   │  Integration tests  (per service, real deps mocked)
   │  Unit tests         (many, fast)
   ▼  more, faster, narrower
```

**Figure 1 —** Contracts are a thin, fast layer between unit/integration and E2E.

## Foundational

**Q1.** What is contract testing?
**A.** Verifying that two services agree on the **structure and semantics of their interactions** (requests, responses, messages) without starting both services together. A contract is an explicit, versioned agreement.

**Q2.** How is a contract test different from an integration test and an E2E test?
**A.** An **integration test** exercises one service with its real dependencies (DBs, queues). An **E2E test** runs the whole system and checks a user journey. A **contract test** checks only the boundary agreement between two services — fast, isolated, and independent of business logic.

**Q3.** What are the consumer and provider?
**A.** The **consumer** is the service that sends the request or publishes the message (`order-service`). The **provider** is the service that receives the request or publishes what is consumed (`user-service` is the provider when `order-service` calls it; `order-service` is the provider of `order-created`).

**Q4.** Consumer-driven vs producer-driven contract testing?
**A.** **Consumer-driven** (Pact): the consumer writes the expectations; the provider verifies them. **Producer-driven** (SCC/OpenAPI): the provider authors the contract; consumers test against generated stubs. The former protects consumers; the latter protects the provider's published interface.

**Q5.** What is a pact file?
**A.** A JSON document produced by consumer tests. It names the consumer and provider and lists **interactions** (request, expected response, provider state) plus **matchingRules** and metadata such as `pactSpecification`.

**Q6.** What is a provider state?
**A.** A named precondition the provider must arrange before verifying an interaction, e.g. `"user 42 exists"`. It decouples the test data setup from the interaction itself.

**Q7.** Does contract testing replace E2E testing?
**A.** No. Contracts prove the boundary agreement, not that the whole flow works. Keep a small number of E2E smoke tests for wiring, deployment and cross-cutting concerns.

**Q8.** What does a contract test NOT prove?
**A.** Business logic correctness, data correctness, performance, security, ordering guarantees, and end-to-end behaviour. It only proves the provider honours the consumer's expectations.

**Q9.** What role does a stub/mock server play?
**A.** It replays the provider's responses (generated from the contract) so the consumer can test its client code in isolation. Pact uses its mock server; SCC uses WireMock via Stub Runner.

**Q10.** Why use matchers instead of exact values?
**A.** Exact values make contracts brittle: any harmless change (`Ada` → `Grace`) breaks verification. Matchers assert **type/shape** (`string`, `integer`, regex) while still providing an example value for stubs.

## Intermediate

**Q11.** Describe the Pact workflow end to end.
**A.** Consumer tests → generate pact file → publish to the **Pact Broker** → provider verifies each interaction (with states) → results stored → broker builds the **matrix** → `can-i-deploy` gates releases.

**Q12.** How do you write a consumer Pact test (JVM)?
**A.** Annotate the class with `@ExtendWith(PactConsumerTestExt.class)` and `@PactTestFor(providerName = "user-service", port = "8090")`; a `@Pact(consumer = "order-service")` method returns a `RequestResponsePact` via `PactDslWithProvider`; a `@Test` method annotated `@PactTestFor(pactMethod = "...")` receives a `MockServer` and calls the client.

**Q13.** How does provider verification work?
**A.** Annotate a JVM test class with `@Provider("user-service")`, load pacts via `@PactFolder("pacts")` or `@PactBroker(...)`, register state handlers with `@State("user 42 exists")`, and run each interaction against the running provider. The JUnit 5 mechanism is `@TestTemplate` with `PactVerificationInvocationContextProvider` and a `PactVerificationContext` parameter.

**Q14.** What is the Pact Broker?
**A.** A service that stores pact files and verification results, maps consumer/provider versions, and enables tags, environments, webhooks and the compatibility matrix. PactFlow is the commercial version.

**Q15.** What is the Pact Matrix?
**A.** A grid of consumer versions × provider versions with the verification result in each cell. It answers "which combinations are known compatible?" — the basis for safe deployment.

**Q16.** What does `can-i-deploy` do?
**A.** Queries the matrix for a specific pacticipant version against a target environment and returns success only if every relevant integration has a successful verification. It is the CI gate before deployment.

**Q17.** What is a message pact?
**A.** A contract for asynchronous events. The consumer uses `MessagePactBuilder` to declare the expected message body/metadata; the provider verifies it emits a matching message. This is how `order-created` is tested.

**Q18.** Name the common matching rules.
**A.** `like`/`Match.like` (type), `eachLike`/`minArrayLike` (array of a shape), `regex`/`term` (regex with example), `integer`/`decimal`/`number`, `datetime`/`date`/`time` with a format, `include` (substring), `notEmpty`, and `nullValue`.

**Q19.** What is Spring Cloud Contract at a high level?
**A.** A JVM framework where the **provider** writes contracts (Groovy/YAML). The plugin generates a provider verification test and a `-stubs.jar`; consumers run those stubs with Stub Runner. It is producer-driven, unlike Pact.

**Q20.** How does SCC produce its two artifacts?
**A.** `spring-cloud-contract-maven-plugin` reads `src/test/resources/contracts/`, emits JUnit tests to `target/generated-test-sources/`, and packages WireMock/messaging stubs into the `stubs` classifier jar.

## Advanced

**Q21.** How do provider states carry parameters?
**A.** The consumer passes a map: `given("user 42 exists", Map.of("userId", 42))`. The provider's `@State(value = "user 42 exists", action = "setupUser")` receives `Map<String,Object>` and seeds accordingly. Keep each state idempotent.

**Q22.** What are WIP/pending pacts and why use them?
**A.** A pact marked pending reports verification failures as "pending", not failed, so a new consumer can be added without blocking the provider. Remove the flag once verification passes.

**Q23.** How do versioning, tags, branches and environments relate?
**A.** Pacticipant versions identify artifacts; **tags**/branches label versions for selectors; **environments** model real deployment targets. `can-i-deploy --to-environment production` uses recorded deployments, not just tags.

**Q24.** What is bi-directional contract testing?
**A.** Combining an OpenAPI document published by the provider with Pact contracts from consumers in one matrix, so producer-only changes are caught even without a consumer test. Offered by PactFlow.

**Q25.** How do you contract-test a `404`?
**A.** Add a separate interaction: request `GET /users/999`, `willRespondWith().status(404)` and body `{ "error": "user not found" }`. The consumer asserts its client surfaces the not-found case correctly.

**Q26.** What are common anti-patterns?
**A.** Over-matching (asserting values that do not matter), one giant pact covering everything, testing business logic through contracts, provider-state leakage between interactions, and treating contracts as a replacement for E2E.

**Q27.** What is provider-state leakage?
**A.** When data created by one state leaks into the next, making verification order-dependent and flaky. Reset per interaction, use unique IDs, and keep states isolated and idempotent.

**Q28.** When should you NOT use contract testing?
**A.** For a single service with no independent consumers, for strictly internal/undocumented APIs, when the coupling is too volatile to pin, or when the real risk is business logic (unit tests fit better). It also adds little for throwaway integrations.

**Q29.** How do messaging contracts differ between Pact and SCC?
**A.** Pact uses `MessagePactBuilder` on the consumer and verifies messages the provider emits. SCC uses `label` + `outputMessage` with `triggeredBy(...)` on the provider, and consumers fire labels via `StubTrigger.trigger("order-created")`.

**Q30.** How do you debug a failed pact verification?
**A.** Read the failure diff (expected vs actual), confirm the provider state ran, check which matcher failed, run the provider locally against a `@PactFolder` copy of the pact, and inspect the `matchingRules`. A mismatch is either a real breaking change or an over-specified contract.

## See also

- [Cheat Sheet and Learning Path](31-Cheat-Sheet-And-Learning-Path.md)
- [23 — SCC Concepts](../05-Spring-Cloud-Contract/23-SCC-Concepts.md)
- [Anti-Patterns and Pitfalls](../06-Operations/28-Anti-Patterns-And-Pitfalls.md)
- [Debugging Failed Verifications](../06-Operations/29-Debugging-Failed-Verifications.md)

## Recap

- Foundation: definition, direction, pact file, states, and what contracts do not prove.
- Intermediate: workflow, consumer/provider tests, broker, matrix, `can-i-deploy`, message pacts, SCC.
- Advanced: state parameters, WIP pacts, versioning, bi-directional, anti-patterns, debugging.
- Contract testing is one thin, fast layer — never a replacement for E2E.
