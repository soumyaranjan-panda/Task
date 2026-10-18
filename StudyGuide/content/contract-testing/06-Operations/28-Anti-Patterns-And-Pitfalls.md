# 28 — Anti-Patterns and Pitfalls

Contract testing fails in predictable ways. Almost every failure is a contract
that **over-specifies**, a workflow that **skips the gate**, or a test that
quietly became an integration test. This page is a checklist you can run
against any contract-testing suite.

---

## Contract Smells — A Checklist

```text
  CONTRACT SMELLS — tick any box and fix before shipping
  ───────────────────────────────────────────────────────
  [ ] A field asserted with an exact value ("Ada Lovelace")
  [ ] eachLike used on an array that is usually empty
  [ ] A pact file over ~500 lines for a single pair
  [ ] Contract asserts a total, a status transition, or a rule
  [ ] Provider @State inserts one specific row with a fixed id
  [ ] The test asserts the mock returned what the test configured
  [ ] A consumer test imports a provider class (or vice versa)
  [ ] The broker holds pacts for services nobody owns
  [ ] No can-i-deploy step in either pipeline
  [ ] Pending pacts disabled, so new contracts break providers
```

**Figure 1 —** Each tick is a specific anti-pattern from the table below.

---

## The Anti-Patterns

| # | Anti-pattern | Symptom | Fix |
| - | ------------ | ------- | --- |
| 1 | **Over-matching** | Every verification fails whenever any value changes (`eachLike` on a single/empty array, exact strings) | Match only what you consume; use `like`/`integer`/`regex`; drop `eachLike` when the array is not a real collection |
| 2 | **Business logic in contracts** | Contract asserts `total = 129.99` after tax, or a status transition | Assert **shape and type**, not computed values; test the maths in a unit test |
| 3 | **One mega-pact** | A 2,000-line pact for one pair; failures point nowhere | Split by consumer feature; one pact per consumer/provider pair, small descriptions |
| 4 | **Provider state does real test setup** | `@State` runs migrations, seeds a full DB, calls third parties | States create only the minimum data the interaction needs; keep them idempotent and fast |
| 5 | **Testing the mock** | Assertions check the mock returned the configured body, not that consumer code handled it | Assert on the **consumer's parsed result** after calling it through the mock |
| 6 | **Bidirectional coupling** | Consumer tests import provider types; provider tests reach into consumer code | Each side depends only on the pact file; share nothing but the contract |
| 7 | **Stale pacts** | Provider verifies pacts from deleted services/branches forever | Prune orphaned pacts; use selectors to bound what is verified |
| 8 | **No `can-i-deploy` gate** | Production breaks despite "all contract tests passing" | Make `can-i-deploy` the mandatory last step before deploy on both sides |
| 9 | **Provider-owned contracts** | Provider invents contracts; consumers never reviewed them | Consumers write pacts; providers only verify and supply states |
| 10 | **Contract tests as E2E** | Tests need live databases, brokers, and both services | Keep contracts isolated; use a few separate E2E smoke tests for end-to-end |
| 11 | **Ignoring pending pacts** | A brand-new consumer contract breaks the provider build immediately | Enable pending/WIP pacts so new contracts do not block providers |

---

## Why Each One Hurts

### 1 — Over-matching

```java
// Brittle: the consumer does not care about the literal name
new PactDslJsonBody().stringValue("name", "Ada Lovelace")
```

The provider renames the seed user to `Ada Byron` and verification fails
despite no real incompatibility. Use a matcher:

```java
new PactDslJsonBody().stringType("name", "Ada Lovelace")
```

`eachLike` is the same trap in disguise: applying it to an array that is
usually empty forces the provider to always return at least one element.

### 2 — Asserting Business Logic

A contract answers "what shape of data crosses the boundary?", never "is the
arithmetic right?". `total` being `129.99` is a unit-test concern. The contract
should assert `total` is a number.

### 4 — Provider State Doing Real Setup

```java
// Smell: a state that reproduces the whole production dataset
@State("user 42 exists")
void seedEverything() {
    database.runMigrations();
    database.seedAllFixtures();
}
```

States should be surgical: create *user 42*, and nothing else. Slow or
order-dependent states corrupt the matrix with flaky results.

### 5 — Testing the Mock

```java
// Smell: this only proves the mock was configured
Response r = client.get("/users/42");
assertThat(r.body()).contains("Ada Lovelace");
```

If the mock was configured with that body, this always passes. Call the
**consumer's own code** through the mock and assert on *its* output.

### 6 — Bidirectional Coupling

The moment a consumer test imports a provider class, you have a compile-time
coupling that defeats the point. The pact file is the only shared artefact. The
same applies in reverse: a provider test should never import consumer code.

### 10 — Contract Tests as E2E

The first time a contract test needs Kafka running, a real database, and a
staging URL, it is no longer a contract test. Delete the shared dependency or
move the scenario to an E2E smoke suite.

---

## Workflow Anti-Patterns in CI

```text
  commit ─► test ─► publish pact ─► [ NO GATE ] ─► deploy
                                        │
                                        └── "but the tests passed!"

  Better:
  commit ► test ► publish pact ► can-i-deploy ► deploy ► record-deployment
```

**Figure 2 —** Passing contract tests is not the same as being safe to deploy.
The gate is what connects them.

| CI smell | Fix |
| -------- | --- |
| Publish pact but never publish verification results | Set `pact.verifier.publishResults=true` and a provider version |
| `can-i-deploy` after deploy | Move it **before** the deploy step |
| Deploy without `record-deployment` | Record every environment you gate |
| No retry on `can-i-deploy` | Add `--retry-while-unknown`/`--retry-interval` |
| Verifying every branch/version | Use consumer version selectors |

---

## What Contract Testing Is Not For

Contract testing is the wrong tool when:

- The test needs to prove **end-to-end business outcomes** (use a few E2E
  tests).
- The integration is with a **third party you cannot change** (use consumer
  tests with recorded mocks; a provider contract is impossible).
- The concern is **performance, security, or load**.
- The "contract" would assert **business rules** rather than data shape.

---

## See also

- [27 — Contract Testing in a Microservice Topology](./27-Contract-Testing-In-A-Microservice-Topology.md)
- [29 — Debugging Failed Verifications](./29-Debugging-Failed-Verifications.md)
- [20 — Versioning and the Pact Matrix](../04-Advanced/20-Versioning-And-The-Pact-Matrix.md)
- [09 — Matchers and Matching Rules](../02-Pact-Workflow/09-Matchers-And-Matching-Rules.md)
- [12 — Provider States](../02-Pact-Workflow/12-Provider-States.md)

---

## Recap

- The root cause of most failures is **over-specification** — exact values and
  unnecessary `eachLike`.
- Contracts assert **shape and types**, never business logic.
- Keep pacts **small and per-pair**; keep **provider states surgical**.
- Test the **consumer code**, not the mock.
- The pact file is the **only** thing the two sides share.
- **`can-i-deploy` before deploy** and **`record-deployment` after** are
  non-negotiable.
- Enable **pending/WIP pacts** so new contracts do not block providers.

---

## Practice

1. A verification fails because the provider changed a user's display name
   from `Ada Lovelace` to `Ada Byron`. Is that a real break? How would you
   prevent the false alarm?

   **Answer:** Not a real break unless a consumer needs that literal name. It
   was over-matching; replace `stringValue`/`equalTo` on `name` with
   `stringType`.

2. Your provider pulls contracts from every branch and version every consumer
   ever made. Builds take 40 minutes. What is the fix?

   **Answer:** Use consumer version selectors (`mainBranch`, `deployedOrReleased`,
   `matchingBranch`) to bound the set, and prune orphaned pacts.

3. A team's provider build fails the first time a new consumer publishes a
   pact. What setting is missing?

   **Answer:** Pending pacts — enable `pactbroker.enablePending` (with provider
   tags/branch) so unverified new contracts warn instead of failing.
