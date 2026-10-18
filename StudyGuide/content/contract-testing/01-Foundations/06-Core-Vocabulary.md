# Core Vocabulary

## The question this page answers

Contract testing has a small, precise vocabulary. Using the wrong word ("stub" when you mean "mock provider", "pact" when you mean "interaction") causes real miscommunication. This page is the shared dictionary the rest of the guide assumes.

## Glossary

| Term | Meaning | In our example |
| ---- | ------- | -------------- |
| **Consumer** | A party that sends a request or event and depends on the response. | `order-service` calling `user-service` |
| **Provider** | A party that receives the request/event and returns the response. | `user-service` serving `GET /users/{id}` |
| **Interaction** | One request paired with one expected response inside a contract. | `GET /users/42` → `200` |
| **Request** | Method, path, headers, query, and body a consumer sends. | `GET /users/42` |
| **Response** | Status, headers, and body the consumer expects back. | `200` with the user JSON |
| **Matcher** | A rule (type, regex, date format) that fixes the *shape* while letting values vary. | `integerType("id", 42)` |
| **Matching rule** | The serialised form of a matcher stored in the pact file. | stored under the interaction |
| **Provider state** | A named precondition the provider sets up before replaying an interaction. | `"user 42 exists"` |
| **Pact file** | The JSON artifact listing all interactions for one consumer-provider pair. | `order-service-user-service.json` |
| **Broker** | The server that stores, versions, and shares pact files and verification results. | Pact Broker |
| **Verification** | Replaying a pact's interactions against the real provider and comparing. | provider build step |
| **Tag** | A moving label, usually a git branch, on a consumer/pact version. | `main` |
| **Branch** | The git branch recorded for a version to select which pacts apply. | `feature/enrich-order` |
| **Environment** | A named deployment target recorded in the broker. | `staging`, `production` |
| **Matrix** | The broker's table of which consumer versions work with which provider versions. | powers `can-i-deploy` |
| **can-i-deploy** | A CLI query against the matrix, run before promoting a version. | gate in CI |
| **Pending pact** | A pact not yet required to pass; fails verification only after it has passed once. | new consumer onboarding |
| **Webhook** | A broker callback that triggers a provider build when a pact changes. | on `contract_content_changed` |
| **Bi-directional** | Contract testing that checks a provider's OpenAPI spec against consumer Pact files. | producer + consumer together |
| **Mock provider** | An in-test server built from a pact that returns the expected response. | used in the consumer test |
| **Stub** | A pre-baked stand-in for provider responses, used without the provider running. | SCC stub runner |

> **Golden rule — one vocabulary, everywhere.** Use the exact words *consumer*, *provider*, *interaction*, *provider state*, and *verification* consistently in code, filenames, the broker, and conversation. Say "interaction", not "test case"; say "mock provider", not "mock" when you mean the Pact-generated server. Ambiguous wording is the most common source of contract-testing confusion.

## How the terms connect

```text
   consumer test ──writes──► pact file ──publish──► broker
        │                       │                    │
   (mock provider)         (interactions,        (tags,
    matchers)              provider states)       branches)

                                 fetches pacts
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ provider verify  │
                              │ + provider state │
                              └────────┬─────────┘
                                       │ results
                                       ▼
                              ┌──────────────────┐
                              │  can-i-deploy    │
                              │  (matrix lookup) │
                              └──────────────────┘
```

**Figure 1 —** The core terms form one workflow: expectations become a pact, a broker shares it, a provider verifies it, and a matrix decides deployability.

## Two spellings that matter

- **Pact** (capital P) is the *tool* and the ecosystem (`au.com.dius.pact`, Pact Broker).
- **pact** (lowercase) is a *file*: one consumer-provider contract.

Keeping these separate avoids sentences like "publish Pact to Pact", which should be "publish the pact file to the Pact Broker".

## Recap

- Roles: **consumer** (sends) and **provider** (receives).
- Content: **interaction**, **request**, **response**, **matcher**, **provider state**.
- Artifact: **pact file**, stored and versioned in a **broker**.
- Lifecycle: **verification**, **tag**/**branch**/**environment**, **matrix**, **can-i-deploy**.
- Adjacent concepts: **mock provider**, **stub**, **pending pact**, **webhook**, **bi-directional**.
- **Use one vocabulary everywhere.**

## Practice

1. Distinguish a **matcher** from a **matching rule**.

2. What is the difference between a **mock provider** and a **stub**?

3. Explain why `can-i-deploy` is a matrix query rather than a single test run.

> **Answer.** 1. A matcher is the rule you write in code (e.g. "id is an integer"); a matching rule is how that intention is serialised into the pact file so the provider verifier applies the same logic. 2. A **mock provider** is generated from a pact and used *inside the consumer's own test* to return the expected response; a **stub** is a pre-baked stand-in for the provider's responses (as with Spring Cloud Contract's stub runner) used by consumers without running a Pact consumer test. 3. Compatibility is a property of a *pair* of versions (consumer version X works with provider version Y), so the broker stores many results and `can-i-deploy` looks up the specific combination rather than executing one test.

## See also

- [What Is Contract Testing?](01-What-Is-Contract-Testing.md)
- [Consumers, Providers & Contracts](03-Consumers-Providers-And-Contracts.md)
- [The Pact Workflow End to End](../02-Pact-Workflow/07-The-Pact-Workflow-End-to-End.md)
- [Versioning & the Pact Matrix](../04-Advanced/20-Versioning-And-The-Pact-Matrix.md)
- [The Pact Broker & PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)
