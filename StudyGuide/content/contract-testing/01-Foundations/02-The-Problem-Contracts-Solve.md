# The Problem Contracts Solve

## The question this page answers

If integration and end-to-end tests already cross service boundaries, why do we need a separate *contract* layer? Because those tests are slow, flaky, and tell you *something broke* — not *who broke it*.

## The four failures of integration testing

### 1. Flaky end-to-end tests

E2E tests need every service, a database, a message broker, and often a browser. Each dependency adds a failure mode that has nothing to do with the code under test. Teams start re-running failures "to see if it's real", then ignore them, then delete them.

### 2. Shared staging environments

Integration tests usually run in a **shared environment**. Someone else's broken deploy, half-applied migration, or test data collision turns your build red. You queue behind other teams for a slot.

### 3. Hidden coupling

Nothing records what `order-service` actually expects from `user-service`. The dependency lives only in both teams' heads and in a JSON parser buried in a client class. When it changes, the coupling surfaces at runtime in production.

### 4. "Who broke the build?"

When an E2E test fails, the error points at the test, not the offending service. Debugging means manually reproducing across several deployables and diffing logs — the single most expensive failure to diagnose.

## The cost, concretely

```bash
mvn -pl e2e-tests verify
```

```text
[INFO] Tests run: 12, Failures: 1, Errors: 0, Skipped: 0
[ERROR] enrichedOrderReturnsCustomerName: expected "Ada Lovelace" but null
[INFO] BUILD FAILURE
[INFO] Total time: 14:32 min
```

Fourteen minutes to learn that *one* field is null, without knowing whether the cause is `user-service`, the database, the network, or stale test data.

## Where contract testing fits

Contract tests sit just above unit tests: fast, in-process, and isolated. They test each service against a recorded expectation instead of the live other service.

```text
                 ┌────────────────────────────┐
                 │          E2E / UI          │  few · slow · flaky
                 ├────────────────────────────┤
                 │    Service / integration   │  all services running
                 ├────────────────────────────┤
                 │   ► CONTRACT TESTS ◄       │  fast · isolated ·
                 │     (consumer-driven)      │  catches API breaks
                 ├────────────────────────────┤
                 │         Unit tests         │  many · fast · cheap
                 └────────────────────────────┘
```

**Figure 1 —** The contract layer sits between integration and unit tests.

| Property | E2E / integration | Contract test |
| -------- | ----------------- | ------------- |
| Services started | all of them | one (or none) |
| Network | real HTTP | mock / in-process replay |
| Typical runtime | minutes | milliseconds |
| Failure points to | the test | the changed side |
| Flakiness | high | near zero |

## The fix: consumer-driven contracts

A **consumer-driven contract** flips the direction of the specification. Instead of the provider guessing what clients need, each **consumer** records the exact interactions it relies on, and the **provider** verifies it still satisfies every consumer's recorded interactions.

The provider only promises what is actually used. Consumers get an early, precise alarm when the provider changes something they depend on — and providers get a list of *who* depends on a field before removing it.

## Recap

- E2E tests are slow, flaky, and blame the test, not the culprit.
- Shared environments add failures unrelated to your code.
- Undocumented coupling surfaces only at runtime.
- Contract tests are fast, isolated, and point at the changed side.
- **Consumer-driven contracts** make consumers declare their needs and providers verify them.

## Practice

1. Name two reasons a failing E2E test is more expensive to diagnose than a failing contract test.

2. Why does a consumer-driven contract reduce the blast radius of a provider change?

> **Answer.** 1. An E2E failure runs in a shared environment with many dependencies, so the cause may be another team's deploy, stale data, or the network; and the failure message points at the test rather than the service that changed. 2. Because the provider verifies against each consumer's *recorded* interactions. A change that breaks a field a consumer uses fails verification for that specific consumer, before deployment, and shows exactly which consumer is affected.

## See also

- [What Is Contract Testing?](01-What-Is-Contract-Testing.md)
- [Consumers, Providers & Contracts](03-Consumers-Providers-And-Contracts.md)
- [Contract vs Integration vs E2E vs Schema](05-Contract-vs-Integration-vs-E2E-vs-Schema.md)
- [The Pact Workflow End to End](../02-Pact-Workflow/07-The-Pact-Workflow-End-to-End.md)
