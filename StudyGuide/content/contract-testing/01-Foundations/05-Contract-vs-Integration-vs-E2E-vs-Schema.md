# Contract vs Integration vs E2E vs Schema

## The question this page answers

Contract testing is one of five common layers. Which one do you reach for, what does each actually prove, and how many of each should a healthy service have? This page is the map; the rest of the guide is the territory.

## The layers compared

| Layer | Scope | Speed | What it proves | What it does not prove | Who runs it |
| ----- | ----- | ----- | -------------- | ---------------------- | ----------- |
| **Unit** | one class/function | ms | logic inside one unit | anything across a boundary | service author |
| **Schema** | one message vs a spec | ms | a payload matches a schema | that the other side sends that payload | either side |
| **Contract** | one consumer-provider pair | ms | the provider honours this consumer's expectations | business correctness, whole-system flow | consumer + provider |
| **Integration** | several components in one service | 100s ms | components work together (DB, queue, HTTP client) | cross-service compatibility | service author |
| **E2E** | the whole system | s–min | the system works for a user journey | *which* service is at fault | QA / platform |

> **Critical distinction:** A contract test proves *compatibility between two parties*. It says nothing about whether the exchange produces correct business results.

## Choosing a layer

```text
  Do two services need to agree on a request/response?
        │
        ├── YES ──► Do both sides change independently?
        │              │
        │              ├── YES ──► CONTRACT TEST
        │              │            (Pact / Spring Cloud Contract)
        │              └── NO  ──► SCHEMA VALIDATION may be enough
        │
        └── NO  ──► Does it need the real network, all services up?
                       │
                       ├── YES ──► E2E SMOKE TEST (keep it small)
                       └── NO  ──► INTEGRATION TEST (one service)
```

**Figure 1 —** A decision tree for picking the right layer.

## How many of each

Follow the pyramid, but read "contract" as the *replacement* for the cross-service integration tests you were tempted to write:

| Layer | Guideline | Rationale |
| ----- | --------- | --------- |
| Unit | hundreds | cheap, pinpoints logic defects |
| Contract | one per consumer-provider pair (per meaningful interaction) | replaces broad integration tests across services |
| Integration | a handful | cover DB/queue wiring inside one service |
| E2E | 1–5 smoke journeys | confirm the wiring, not every branch |

The mistake is putting the *cross-service* assertions in integration or E2E tests. Those belong in the contract layer, where they are fast and blame the correct side.

## Schema testing vs contract testing

A **schema** describes the allowed shape of a message. **Schema testing** validates a payload against that description. It is necessary but not sufficient for compatibility.

```text
   SCHEMA TEST                         CONTRACT TEST
   ────────────                        ─────────────
   validates:                          validates:
     ┌──────────────┐                    ┌──────────────┐
     │  one payload │                    │ request  ◄──►│ response
     │  vs a schema │                    │  pair between│
     └──────────────┘                    │  two named   │
                                         │  parties     │
                                         └──────────────┘

   "is this JSON shaped right?"         "does the provider still
                                         satisfy THIS consumer?"
```

**Figure 2 —** Both check shape, but only a contract ties a request/response pair to a specific consumer.

| Question | Schema testing | Contract testing |
| -------- | -------------- | ---------------- |
| Does the body match the spec? | yes | yes (for the parts used) |
| Does the *request* match what the provider expects? | no | yes |
| Is this field still present for a given consumer? | no | yes |
| Who is affected by a change? | nobody tracked | every consumer is named |
| Tooling | OpenAPI validators, JSON Schema | Pact, Spring Cloud Contract |

Run `order-service`'s consumer test to produce the contract:

```bash
mvn -pl order-service test -Dtest=UserClientContractTest
```

```text
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Pact written to target/pacts/order-service-user-service.json
```

That pact now records the pair, which no schema alone can do.

## Recap

- **Schema** validates shape; **contract** validates the pair and names the affected consumer.
- **Integration** tests components inside one service; **E2E** tests the whole system.
- Put cross-service compatibility assertions in the **contract** layer, not in E2E.
- Keep a few real E2E smoke tests — contracts do not replace them.
- A healthy pyramid: many unit, targeted contract, few integration, 1–5 E2E.

## Practice

1. `order-service` and `user-service` are separate deployables. Should the test that checks `order-service` reads `name` correctly be an integration test or a contract test? Why?

2. An OpenAPI schema validation passes, but `order-service` still crashes on the response. Give one reason a schema test would miss this that a contract test would catch.

> **Answer.** 1. A contract test. It asserts compatibility between two independently deployed services, which is exactly the contract layer; an integration test would also need `user-service` running and would not record the dependency. 2. A schema check only confirms the payload matches the spec. It does not record that `order-service` sends the specific request and depends on a specific field, so it cannot detect a *request* mismatch or a field the consumer relies on that the schema marks optional but the consumer treats as required. The contract captures both the request and the used fields.

## See also

- [The Problem Contracts Solve](02-The-Problem-Contracts-Solve.md)
- [Consumer-Driven vs Producer-Driven](04-Consumer-Driven-vs-Producer-Driven.md)
- [Behavior of Matching & Verification](../02-Pact-Workflow/10-Request-And-Response-Matching.md)
- [Bi-Directional Contract Testing](../04-Advanced/21-Bi-Directional-Contract-Testing.md)
