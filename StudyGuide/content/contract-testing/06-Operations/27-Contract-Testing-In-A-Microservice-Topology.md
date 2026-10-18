# 27 — Contract Testing in a Microservice Topology

A single consumer/provider pair is easy. Real systems have dozens of services
calling each other and exchanging events. This page covers who owns which
contract, how teams collaborate, and why a broker replaces a shared staging
environment.

---

## A Realistic Topology

```text
                 ┌─────────────────────────────────┐
                 │           Pact Broker           │
                 │  pacts · versions · matrix      │
                 │  environments · webhooks        │
                 └──▲───────────▲───────────▲──────┘
     publish/verify │           │           │
        ┌───────────┘           │           └───────────┐
        │                       │                       │
 ┌──────┴──────┐          ┌─────┴───────┐        ┌───────┴──────┐
 │ order-svc   │   HTTP   │ payment-svc │  HTTP  │ user-svc     │
 │ consumer    ├─────────►│ consumer    ├───────►│ provider     │
 └──────┬──────┘   pact   └─────────────┘  pact  └──────────────┘
        │ event "order-created"
        ▼
 ┌──────────────┐
 │ notification │  consumes the order-created event
 │ consumer     │
 └──────────────┘
```

**Figure 1 —** One broker holds every contract; each arrow is a
consumer→provider relationship backed by its own pact.

Note the roles are **per relationship, not per service**:

| Relationship | Consumer | Provider | Interaction |
| ------------ | -------- | -------- | ----------- |
| 1 | order-service | user-service | HTTP `GET /users/{id}` |
| 2 | payment-service | user-service | HTTP `GET /users/{id}` |
| 3 | order-service | payment-service | HTTP `POST /payments` |
| 4 | notification-service | order-service | Event `order-created` |

`user-service` is a provider for both relationships 1 and 2, but each consumer
has its **own pact**. It is also *not* a consumer anywhere here — a service can
be both, in different relationships.

---

## Who Owns Which Contract

The most common governance mistake is assuming the **provider** owns all the
contracts. In consumer-driven contract testing the ownership splits:

| Artefact | Owner | Why |
| -------- | ----- | --- |
| **Consumer pact file** | Consumer team | It encodes what the consumer needs |
| **Provider verification** | Provider team | Only they can run their service |
| **Provider states** | Provider team | They know how to create their data |
| **The broker** | Platform / shared | It is neutral infrastructure |
| **`can-i-deploy` gate** | Both teams' CI | Each gates its own deploys |

**Golden rule:** the consumer writes the expectation; the provider is
responsible for *honouring* it. Neither is the other's blocker.

### The collaborative workflow

```text
  consumer team                 broker                 provider team
  ─────────────                 ──────                 ─────────────
  write consumer test
        │
        ▼
  publish pact (SHA) ─────────► store pact
                                      │
                                      ▼
                               webhook fires ─────────► verification runs
                                                              │
                                                              ▼
                               store result ◄──────── publish results (SHA)
                                      │
        ┌────────────────────┴────────────────────────┐
        ▼                                              ▼
  can-i-deploy (consumer)            can-i-deploy (provider)
```

**Figure 2 —** The broker is the coordination point. A **webhook** turns a
newly published pact into a provider verification build automatically, so
teams never have to schedule a joint test run.

---

## The Broker Is the Source of Truth

The broker stores, and is authoritative for:

- Every published **pact** per consumer version.
- Every **verification result** per provider version.
- The **matrix** of consumer × provider compatibility.
- **Environments** and which versions are deployed.
- **Webhooks** that trigger downstream builds.

If the answer to "which version of `user-service` is compatible with
`order-service@abc123`?" lives in a Slack thread, a wiki page, or someone's
memory, it is already wrong. The **Matrix** is the only correct answer, and
`can-i-deploy` reads it.

---

## Contracts vs a Shared Staging Environment

Shared staging is the default anti-pattern that contract testing replaces.

| Property | Shared staging | Contract tests + broker |
| -------- | -------------- | ----------------------- |
| Feedback speed | Minutes to hours (deploy + data) | Seconds per test |
| Coupling | Every service's changes affect all testers | Teams test in isolation |
| Failure attribution | "Who broke staging?" | The failing pact names the pair |
| Scaling cost | N services share one fragile environment | O(relationships) contracts, independently run |
| Data setup | Elaborate fixtures per scenario | Provider states, scoped per interaction |
| Coverage of "what's deployed" | Implicit | Explicit environments + matrix |

Contracts do **not** eliminate environments. You still deploy somewhere. But
you no longer *test integration* there — you verify contracts locally/CI, and
staging is reserved for a small number of **E2E smoke tests**.

---

## Team Responsibilities

| Concern | Consumer team | Provider team |
| ------- | ------------- | ------------- |
| Write contract | Yes (`@Pact`) | No |
| Data for verification | No | Yes (`@State`) |
| Verify contract | No | Yes |
| Run `can-i-deploy` before deploy | Yes | Yes |
| `record-deployment` after deploy | Yes | Yes |
| Publish pact | Yes | No |
| Publish verification results | No | Yes |
| Own the spec/behaviour | No | Yes |
| Report a breaking need early | Yes (add contract) | — |

---

## Cross-Team Rules That Scale

1. **A new consumer need starts with a failing pact**, published early rather
   than negotiated in a ticket.
2. **Never edit a pact by hand.** Consumers regenerate it from tests.
3. **Provider states are contracts too.** A state name is an interface; renaming
   it breaks every consumer that uses it.
4. **`can-i-deploy` is mandatory on both sides.** A consumer deploy without a
   green check ships an unverified contract; a provider deploy without one
   risks breaking live consumers.
5. **Record deployments on every environment you gate**, not just production.
6. **Use webhooks** so provider verification is event-driven, not a weekly
   batch.
7. **Keep pacts small and per-pair.** A single mega-pact across services is
   unmaintainable and fails opaquely.

---

## Gotchas

- **Service name soup** — HTTP and message pacts for the same service must use
  different provider names, or the broker conflates them.
- **Orphaned pacts** — decommissioned consumers leave pacts that block
  provider deploys forever; prune them.
- **Broker as an afterthought** — teams that "just publish files to S3" lose
  the matrix, environments, and gate entirely.
- **Provider-owned contracts** — if the provider invents contracts consumers
  never wrote, you are doing schema testing with extra steps.
- **One team gating, the other not** — an ungated producer can break a gated
  consumer the moment it deploys.

---

## See also

- [20 — Versioning and the Pact Matrix](../04-Advanced/20-Versioning-And-The-Pact-Matrix.md)
- [21 — Bi-Directional Contract Testing](../04-Advanced/21-Bi-Directional-Contract-Testing.md)
- [28 — Anti-Patterns and Pitfalls](./28-Anti-Patterns-And-Pitfalls.md)
- [29 — Debugging Failed Verifications](./29-Debugging-Failed-Verifications.md)
- [11 — The Pact Broker and PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)

---

## Recap

- Roles are **per relationship**: a service can be consumer and provider.
- **Consumers own pacts; providers own verification and states.**
- The **broker is the source of truth**; its Matrix answers compatibility.
- **Webhooks** make verification event-driven across teams.
- Contracts replace **shared staging** for integration testing at scale;
  keep a few E2E smokes, not a shared test environment as the gate.
- Both sides must run **`can-i-deploy`** and **`record-deployment`**.

---

## Practice

1. `user-service` is a provider to `order-service` and `payment-service`.
   How many pacts does it verify?

   **Answer:** Two — one per consumer relationship, each independently
   maintained by its consumer team.

2. A provider team wants to rename a provider state from `user 42 exists` to
   `a user with id 42 exists`. What breaks and who fixes it?

   **Answer:** Every consumer pact that references the old state name. The
   state is part of the interface; consumers must update and republish, or the
   provider keeps the old name until migration completes.

3. Why is a shared staging environment a poor substitute for the broker's
   matrix?

   **Answer:** Staging shows compatibility only for the one combination
   currently deployed and is slow, coupled, and hard to attribute. The matrix
   records every verified consumer/provider version pair and gates deploys
   precisely.
