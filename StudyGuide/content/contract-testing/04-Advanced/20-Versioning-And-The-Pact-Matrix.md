# 20 — Versioning and the Pact Matrix

A pact file is only half the story. The other half is **which build of each
service produced it**. The broker stores every pact per consumer version and
every verification per provider version. That two-dimensional history is the
**Pact Matrix**, and it is what makes `can-i-deploy` trustworthy.

---

## Why Versions Matter

If `order-service` publishes a pact but no one records *which commit* made it,
the broker cannot answer: "Is the `user-service` currently in production
compatible with the `order-service` I am about to deploy?"

Pact answers this with **pacticipant versions**. A **pacticipant** is any
application in the contract graph (consumer or provider). Each published pact,
verification, and deployment is recorded against a version.

**Rule of thumb:** the version is your **Git SHA** (or an immutable build
number). Never use `latest`, a date, or a branch name as a version — those
are mutable.

```bash
export GIT_SHA=$(git rev-parse --short HEAD)
```

| Concept | Meaning |
| ------- | ------- |
| **Version** | Immutable id of a build, usually the Git SHA |
| **Tag** | Legacy label on a version (e.g. `prod`, `main`) |
| **Branch** | Git branch a version belongs to; enables matching branches |
| **Environment** | A deployment target (e.g. `test`, `production`) |
| **Deployment** | "version V of pacticipant P is running in environment E" |
| **Release** | "version V is released/supported in environment E" |

---

## Tags vs Branches vs Environments

Tags were the original mechanism. They are now **deprecated in favour of
branches and environments**, but you will still find them in old pipelines.

```text
     legacy: tag-based            modern: environment-based
     ───────────────────          ──────────────────────────
     publish pact                 publish pact
        │ tags: ["prod"]              │ branch: main
        ▼                            ▼
     broker knows "a prod pact"   record-deployment
                                     │ environment: production
                                     ▼
                                  broker knows EXACTLY
                                  which version is live
```

**Figure 1 —** Tags describe intent; environments describe reality. Only
environments can answer "what is running right now?"

| Mechanism | Records | `can-i-deploy` accuracy |
| --------- | ------- | ----------------------- |
| Tag | A version was *labelled* | Weak — a tag does not say a version is deployed or still live |
| Branch | A version *belongs* to a branch | Good for WIP; not a deployment fact |
| Environment + `record-deployment` | A version is *actually running* | Strong — the only correct source |

### Publishing a pact with branch and version

```bash
pact-broker publish target/pacts \
  --consumer-app-version "$GIT_SHA" \
  --branch "$GIT_BRANCH" \
  --broker-base-url https://pact.example.com \
  --broker-token "$PACT_BROKER_TOKEN"
```

### Recording a deployment (modern)

```bash
pact-broker record-deployment \
  --pacticipant order-service \
  --version "$GIT_SHA" \
  --environment production \
  --broker-base-url https://pact.example.com \
  --broker-token "$PACT_BROKER_TOKEN"
```

Run this **after** a successful deploy to that environment. `record-release`
exists for artifacts that are published rather than deployed (mobile apps,
libraries).

---

## The Pact Matrix

The broker's `/matrix` endpoint is a table: for each **consumer version** and
**provider version**, the stored verification result.

```text
              provider versions ──►
              v1.4.0    v1.5.0    v1.6.0
           ┌─────────┬─────────┬─────────┐
 v1.0.0    │   OK    │   OK    │   OK    │   order-service
 (prod)    ├─────────┼─────────┼─────────┤
 v1.1.0    │   OK    │   OK    │   XX    │
 (main)    ├─────────┼─────────┼─────────┤
 v1.2.0    │   --    │   OK    │   OK    │
 (feature) └─────────┴─────────┴─────────┘
```

**Figure 2 —** Each cell is "was this provider version verified against this
consumer's pact?" `OK` = verified, `XX` = verified and failed, `--` = no
verification recorded.

When `can-i-deploy` checks a consumer version, it finds the provider versions
**currently deployed to the target environment** and looks up the row for the
consumer version in those columns. If every relevant cell is `OK`, the answer
is `yes`.

### Querying the matrix by hand

```bash
pact-broker matrix \
  --broker-base-url https://pact.example.com \
  --broker-token "$PACT_BROKER_TOKEN"
```

---

## `can-i-deploy` — The Gate

`can-i-deploy` is the deploy gate. It asks: "For this pacticipant version and
target environment, is every counterpart it will talk to already compatible?"

Consumer side — can `order-service` `$GIT_SHA` go to production?

```bash
pact-broker can-i-deploy \
  --pacticipant order-service \
  --version "$GIT_SHA" \
  --to-environment production \
  --broker-base-url https://pact.example.com \
  --broker-token "$PACT_BROKER_TOKEN" \
  --retry-while-unknown 6 \
  --retry-interval 10
```

```text
Computer says yes \o/

CONSUMER       | C.VERSION | PROVIDER      | P.VERSION | SUCCESS?
---------------|-----------|---------------|-----------|---------
order-service  | a1b2c3d   | user-service  | 9f8e7d6   | true

All required verification results are published and successful
```

Provider side — can `user-service` `$GIT_SHA` go to production?

```bash
pact-broker can-i-deploy \
  --pacticipant user-service \
  --version "$GIT_SHA" \
  --to-environment production \
  --broker-base-url https://pact.example.com \
  --broker-token "$PACT_BROKER_TOKEN"
```

`--retry-while-unknown` matters: verifications are asynchronous, so a freshly
published pact may have no result yet. Poll until the broker has an answer or
the retry budget is exhausted.

**Golden rule — deploys only happen when `can-i-deploy` is green.** Wire it
as the last step before `kubectl apply` / `helm upgrade`, and never allow a
manual override without a recorded incident.

---

## Selectors — What the Provider Verifies

A busy consumer has many branches and versions. A provider cannot verify all
of them. **Consumer version selectors** tell the provider which pacts to pull.

| Selector | Selects |
| -------- | ------- |
| `mainBranch` | Latest version of each consumer's configured main branch |
| `matchingBranch` | Latest consumer version whose branch name equals the provider's branch |
| `deployed` / `deployedOrReleased` | Versions currently deployed/released anywhere |
| `environment(name)` | Versions deployed or released in a named environment |
| `branch(name)` | Latest version on a named branch |
| `latestTag(name)` | Latest version with a tag (legacy) |

In `pom.xml`/JVM config, selectors are often supplied as raw JSON via the
`pactbroker.consumerversionselectors.rawjson` system property:

```bash
-Dpactbroker.consumerversionselectors.rawjson='[{"mainBranch":true},{"deployed":true}]'
```

A sensible default set is: `mainBranch` (so `main` never regresses) plus
`deployedOrReleased` (so live versions keep working) plus `matchingBranch`
(for coordinated feature work).

---

## Pending and WIP Pacts

Two features stop a *new* consumer contract from immediately red-lighting a
provider build.

- **Pending pacts.** A pact with no successful verification yet is marked
  *pending*. If it fails, the failure is reported but **does not fail the
  provider build** — until the provider has had a chance to implement it.
- **WIP pacts.** Pacts from feature branches without a verification result are
  attempted for a bounded time window, again without breaking the build.

Once a pending pact passes once, it graduates and failures count.

```text
  new consumer pact ──► no verification ──► PENDING
                                              │
                        provider build runs   │  fail = warn, not break
                        (still implements)    ▼
                                           verify
                                              │
                         once it passes ──────┤
                                              ▼
                                          NOT PENDING
                                  fail now = break the build
```

**Figure 3 —** Pending pacts give providers a migration window without
disabling the gate for everyone else.

Enable on the provider:

```bash
-Dpactbroker.enablePending=true \
-Dpactbroker.providerTags=main \
-Dpact.verifier.publishResults=true \
-Dpact.provider.version="$GIT_SHA" \
-Dpact.provider.branch="$GIT_BRANCH"
```

---

## End-to-End CI/CD Ordering

```text
  consumer CI                    provider CI
  ───────────                    ───────────
  1. run consumer tests          1. run provider verification
  2. publish pact (SHA)          2. publish results (SHA)
  3. can-i-deploy -> prod        3. can-i-deploy -> prod
  4. deploy                      4. deploy
  5. record-deployment           5. record-deployment
```

**Figure 4 —** Both sides must record deployments, or later `can-i-deploy`
checks see stale "what is running" data.

---

## Gotchas

- **Mutable versions** — reusing a version name means the broker cannot tell
  builds apart. Always use the SHA.
- **Forgetting `record-deployment`** — with no deployment recorded,
  `can-i-deploy` cannot know what is live and may answer `unknown`.
- **Skipping `publishResults`** — verification may pass locally but never
  reach the broker, so the matrix cell stays `--`.
- **No retry on `can-i-deploy`** — a race with an in-flight verification
  fails the pipeline for no real reason.
- **Verifying every consumer version** — without selectors the provider runs
  an unbounded set and slows to a crawl.

---

## See also

- [19 — Message Pact (Async)](./19-Message-Pact-Async.md)
- [21 — Bi-Directional Contract Testing](./21-Bi-Directional-Contract-Testing.md)
- [11 — The Pact Broker and PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)
- [18 — CI/CD and can-i-deploy](../03-Hands-On/18-CICD-And-Can-I-Deploy.md)
- [27 — Contract Testing in a Microservice Topology](../06-Operations/27-Contract-Testing-In-A-Microservice-Topology.md)

---

## Recap

- Every pact, verification, and deployment is stored against an **immutable
  version** — use the Git SHA.
- **Environments + `record-deployment`** are the modern, accurate replacement
  for tags.
- The **Matrix** is consumer-version × provider-version × result; it is the
  data behind every gate.
- **`can-i-deploy`** returns green only when all needed cells are `OK`; make
  it the final deploy gate.
- **Selectors** bound what a provider verifies; **pending/WIP** pacts avoid
  breaking providers for brand-new contracts.
- Golden rule: **deploy only when `can-i-deploy` is green.**

---

## Practice

1. `order-service` version `abc123` deploys to production, but the pipeline
   only runs `can-i-deploy` and never `record-deployment`. What goes wrong on
   the *next* consumer deploy?

   **Answer:** The broker never learned `abc123` is live, so it cannot include
   it as a relevant "what is running" counterpart. Later checks may return
   `unknown` or evaluate the wrong provider versions. Record every deploy.

2. Why is `main` a better branch name than `prod` for `--branch`?

   **Answer:** Branches describe where code is developed; environments
   describe where it is deployed. Labeling a branch `prod` conflates the two
   and is exactly the legacy-tag mistake environments were built to fix.

3. A brand-new consumer pact fails provider verification on day one. Should
   the provider build fail?

   **Answer:** Not while it is **pending**. The failure should be reported as
   pending, not break the build, giving the provider a migration window.
