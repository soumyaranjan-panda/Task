# 11 — The Pact Broker And PactFlow

Pact files alone do not answer the question CI needs: **"is it safe to deploy this version right now?"** The **Pact Broker** is the shared service that makes that answerable. It stores every pact and every verification result, and it exposes a `can-i-deploy` gate.

**PactFlow** is the hosted, commercial edition of the same broker, with team and security features on top.

---

## What the Broker Does

```text
  ┌──────────────┐   publish pact    ┌──────────────────────┐
  │ order-service│ ────────────────► │      PACT BROKER     │
  │ (consumer CI)│                   │  pacts + results     │
  └──────────────┘                   │  the matrix          │
                                     │  webhooks            │
  ┌──────────────┐  pull pacts       │  can-i-deploy API    │
  │ user-service │ ◄──────────────── │                      │
  │ (provider CI)│ ── post results ► │                      │
  └──────────────┘                   └──────────┬───────────┘
                                                │ webhook
                                     ┌──────────▼───────────┐
                                     │ trigger provider CI  │
                                     └──────────────────────┘
```

**Figure 1 —** The broker sits between the two pipelines: it receives pacts, receives results, and triggers builds.

Core responsibilities:

| Capability | What it gives you |
| ---------- | ----------------- |
| **Pact storage** | Every consumer contract, versioned by consumer application version. |
| **Verification results** | Success/failure per provider version, including failure output. |
| **The Matrix** | Which consumer version has been verified against which provider version. |
| **`can-i-deploy`** | A yes/no gate derived from the matrix and environments. |
| **Webhooks** | Notify CI when a pact changes or a verification fails. |
| **Version metadata** | Branch, tag, and environment associations for each version. |

---

## Publishing Pacts

From the consumer build, after the consumer tests have run:

```bash
mvn pact:publish \
  -Dpact.broker.url=http://localhost:9292 \
  -Dpact.broker.username=pact \
  -Dpact.broker.password=pact
```

```text
Publishing pacts to Pact Broker at http://localhost:9292

  order-service-user-service.json ..... OK (order-service 1.4.0)
```

Or with the standalone CLI, which also records the branch:

```bash
pact-broker publish target/pacts \
  --consumer-app-version 1.4.0 \
  --branch main \
  --broker-base-url http://localhost:9292 \
  --broker-username pact \
  --broker-password pact
```

> Prefer passing the **git SHA** as the application version. It is immutable and makes `can-i-deploy` unambiguous. Branches and environments are separate metadata.

---

## The Matrix

The matrix is the broker's central data structure: a row per consumer-version × provider-version pair, with the verification outcome.

```text
  PACT MATRIX  (order-service x user-service)
  ┌───────────────┬──────────────┬───────────────────┬────────┐
  │ consumer ver  │ provider ver │ environment       │ result │
  ├───────────────┼──────────────┼───────────────────┼────────┤
  │ 1.4.0         │ 2.1.0        │ production        │ OK     │
  │ 1.4.0         │ 2.0.0        │ production        │ FAILED │
  │ 1.5.0         │ 2.1.0        │ main (unreleased) │ OK     │
  └───────────────┴──────────────┴───────────────────┴────────┘
```

**Figure 2 —** A small matrix. `can-i-deploy` reads it: the target version must have a successful result against a provider version present in the target environment.

When the provider verifies pacts via `@PactBroker`, it automatically POSTs each result back, so the matrix fills itself in during CI.

---

## Tags vs Branches vs Environments

Version metadata evolved because "where is this version?" and "what git line is this?" are different questions.

| Concept | Meaning | Example | Status |
| ------- | ------- | ------- | ------ |
| **Tag** | Free-form label on a version | `prod`, `v1.4.0`, `main` | Legacy; still supported |
| **Branch** | The git branch a version was built from | `main`, `feature/checkout` | Current for source tracking |
| **Environment** | A deployment target a version was recorded into | `production`, `staging` | **Modern approach** for deploy gating |

Historically people *tagged* versions with a deployment name (`prod`) and asked `can-i-deploy --to prod`. That conflates a git branch, a release label, and a deployment target. Modern practice:

```bash
pact-broker can-i-deploy \
  --pacticipant order-service \
  --version 1.4.0 \
  --to-environment production

pact-broker record-deployment \
  --pacticipant order-service \
  --version 1.4.0 \
  --environment production
```

- `--to-environment` asks "may I deploy here?".
- `record-deployment` (or `record-release` for services that are not deployed per-instance) tells the broker it actually happened.

**Branches** also power **pending pacts**: a brand-new interaction on a feature branch is marked pending and does not fail the provider until it has been verified successfully once.

---

## Running a Broker Locally

The quickest way to try any of this is the official Docker image with a SQLite database:

```bash
docker run --rm -d --name pact-broker \
  -p 9292:9292 \
  -e PACT_BROKER_DATABASE_ADAPTER=sqlite \
  -e PACT_BROKER_DATABASE_NAME=/tmp/pact_broker.sqlite \
  -e PACT_BROKER_BASIC_AUTH_USERNAME=pact \
  -e PACT_BROKER_BASIC_AUTH_PASSWORD=pact \
  pactfoundation/pact-broker:latest
```

```text
<container-id>
```

Check it is alive:

```bash
curl -s http://localhost:9292/diagnostic/status/heartbeat
```

```text
true
```

The UI is then at `http://localhost:9292` (user `pact`, password `pact`). For a persistent setup use PostgreSQL instead of SQLite; see the [pact-broker-docker repository](https://github.com/pact-foundation/pact-broker-docker).

---

## PactFlow

PactFlow is a hosted Pact Broker with the operational features teams ask for:

| Feature | Benefit |
| ------- | ------- |
| Hosted, managed broker | No database or webhook infrastructure to run. |
| SSO / RBAC | Team access and audit. |
| Encrypted secrets in webhooks | Trigger CI without leaking tokens. |
| Bi-directional contract testing | Verify against an OpenAPI spec as well as consumer pacts. |
| API tokens | Scoped, revocable credentials for CI. |
| Web UI + matrix views | Browse pacts, results, and deployment history. |

The `pact-broker` CLI and the `pact-broker` REST API are the same against PactFlow; only the base URL and auth change (an API token instead of basic credentials).

---

## Gotchas

- **The broker is not a test runner.** It stores results; your CI still runs the tests.
- **`can-i-deploy` fails closed.** Missing data means "no", not "probably fine".
- **Version ≠ tag.** Do not use a moving tag like `latest` as your application version; use the git SHA.
- **Webhooks need a stable trigger URL** the broker can reach; do not point them at a laptop.
- **Recording deployments matters.** Without `record-deployment`, the broker cannot reason about what is live.

---

## Recap

- The broker stores pacts and verification results and exposes the matrix.
- `can-i-deploy` converts the matrix into a deploy gate.
- **Branches** track source; **environments** track deployments; **tags** are legacy.
- The provider posts results automatically when using `@PactBroker`.
- PactFlow is the hosted broker plus team, security, and bi-directional features.

---

## Practice

1. Why is the git SHA a better application version than a branch name?

> **Answer.** A SHA is immutable and unique, so a verification result is tied to exactly one build. A branch is a moving pointer, so results would be ambiguous and overwritten.

2. `can-i-deploy --to-environment production` returns "no". The provider's tests are green. Give two things to check in the broker.

> **Answer.** (a) Whether the exact consumer version has a successful verification against a provider version that is *recorded in production*. (b) Whether any verification result exists at all for that pair (a missing result fails closed).

3. A pact changes and you want the provider pipeline to run automatically. What broker feature do you configure?

> **Answer.** A **webhook** (e.g. `pact-broker create-webhook`) that triggers the provider CI when a pact for that provider changes.

---

## See also

- [The Pact Workflow End to End](07-The-Pact-Workflow-End-to-End.md)
- [Versioning & the Pact Matrix](../04-Advanced/20-Versioning-And-The-Pact-Matrix.md)
- [CI/CD & can-i-deploy](../03-Hands-On/18-CICD-And-Can-I-Deploy.md)
- [Publishing & Webhooks](../03-Hands-On/17-Publishing-And-Webhooks.md)
- [Contract Testing in a Microservice Topology](../06-Operations/27-Contract-Testing-In-A-Microservice-Topology.md)
