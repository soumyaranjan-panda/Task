# 18 — CI/CD And Can-I-Deploy

---

## The Deployment Gate

Contract testing earns its keep when it blocks a broken deploy. The gate is the
`can-i-deploy` check: **"is this application version safe to deploy alongside
the versions already running in the target environment?"** The broker answers
using the verification results it has recorded.

```text
consumer push ─► consumer CI ─┬─► test + publish pact ──────► broker
                              │                                │
                              │                             webhook
                              │                                ▼
                              │                          provider CI
                              │                                │
                              │                    verify pacts + publish
                              ▼                                ▼
                     can-i-deploy ◄────────────────────────────┘
                   (consumer version vs deployed provider)
                              │
                    yes ──────┴────── no ──► fail the pipeline
                     │
                     ▼
             deploy + record-deployment ──► broker remembers live
```

**Figure 1 —** Consumer publishes, provider verifies, `can-i-deploy` blocks or
allows the deploy, and `record-deployment` tells the broker what is now live.

The two moving parts:

- **`record-deployment`** — after a successful deploy, tell the broker
  "version X of app Y is now running in environment Z". Without this,
  `can-i-deploy` has nothing to compare against.
- **`can-i-deploy`** — before a deploy, check the version against the broker's
  matrix and exit non-zero on failure.

---

## `--to-environment` vs `--to`

`can-i-deploy` supports two ways to ask the question. Prefer environments.

| Flag                    | Meaning                                                                     | Status            |
| ----------------------- | --------------------------------------------------------------------------- | ----------------- |
| `--to-environment NAME` | Compare against versions actually **deployed** to that environment          | Recommended        |
| `--to TAG`              | Compare against consumer/provider versions **tagged** with that tag         | Legacy            |

- `--to-environment production` uses real deployment data recorded by
  `record-deployment`, so it reflects what is *actually running*.
- `--to prod` compares pacts tagged `prod`; it works but conflates "tagged" with
  "deployed". New pipelines should use environments.

```bash
# Preferred
pact-broker can-i-deploy \
  --pacticipant user-service --version "$GIT_SHA" \
  --to-environment production

# Legacy tag-based
pact-broker can-i-deploy \
  --pacticipant user-service --version "$GIT_SHA" \
  --to prod
```

`can-i-deploy` returns exit code `0` when safe and `1` when blocked, which is
what a CI step keys off. Use `--retry-while-unknown N --retry-interval S` when
the provider's verification may still be running.

---

## Consumer Workflow

`.github/workflows/consumer.yml` in the `order-service` repo:

```yaml
name: order-service

on:
  push:
    branches: [ main ]
  pull_request:
  workflow_dispatch:

env:
  PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
  PACT_BROKER_USERNAME: ${{ secrets.PACT_BROKER_USERNAME }}
  PACT_BROKER_PASSWORD: ${{ secrets.PACT_BROKER_PASSWORD }}

jobs:
  test-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Build and run consumer contract tests
        run: mvn -B clean test

      - name: Publish pacts
        if: github.ref == 'refs/heads/main'
        run: |
          docker run --rm \
            -v "$PWD/target/pacts:/pacts" \
            -e PACT_BROKER_BASE_URL \
            -e PACT_BROKER_USERNAME \
            -e PACT_BROKER_PASSWORD \
            pactfoundation/pact-cli:latest \
            publish /pacts \
            --consumer-app-version "${GITHUB_SHA}" \
            --branch "${GITHUB_REF_NAME}" \
            --build-url "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

  deploy:
    needs: test-and-publish
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Can I deploy?
        run: |
          docker run --rm \
            -e PACT_BROKER_BASE_URL \
            -e PACT_BROKER_USERNAME \
            -e PACT_BROKER_PASSWORD \
            pactfoundation/pact-cli:latest \
            pact-broker can-i-deploy \
            --pacticipant order-service \
            --version "${GITHUB_SHA}" \
            --to-environment production \
            --retry-while-unknown 10 \
            --retry-interval 10

      - name: Deploy
        run: |
          echo "Deploying order-service ${GITHUB_SHA} to production"
          # ./deploy.sh production "${GITHUB_SHA}"

      - name: Record deployment
        run: |
          docker run --rm \
            -e PACT_BROKER_BASE_URL \
            -e PACT_BROKER_USERNAME \
            -e PACT_BROKER_PASSWORD \
            pactfoundation/pact-cli:latest \
            pact-broker record-deployment \
            --pacticipant order-service \
            --version "${GITHUB_SHA}" \
            --environment production
```

### Notes on the consumer job

- `actions/setup-java@v4` with `cache: maven` caches `~/.m2`.
- Publishing is gated to `main`; pull requests still run the tests, so pacts are
  generated and validated but not published from a feature branch.
- The **version is the git SHA**. It is unique and immutable, which is exactly
  what the broker's version model wants.
- `record-deployment` runs *after* the deploy succeeds, so the broker reflects
  reality.

---

## Provider Workflow

`.github/workflows/provider.yml` in the `user-service` repo. It runs on push
*and* on the webhook dispatch created in page 17.

```yaml
name: user-service

on:
  push:
    branches: [ main ]
  pull_request:
  repository_dispatch:
    types: [ contract-requiring-verification ]

env:
  PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
  PACT_BROKER_USERNAME: ${{ secrets.PACT_BROKER_USERNAME }}
  PACT_BROKER_PASSWORD: ${{ secrets.PACT_BROKER_PASSWORD }}

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Verify pacts and publish results
        env:
          GIT_COMMIT: ${{ github.sha }}
          GIT_BRANCH: ${{ github.ref_name }}
        run: mvn -B test

  can-i-deploy:
    needs: verify
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Can I deploy?
        run: |
          docker run --rm \
            -e PACT_BROKER_BASE_URL \
            -e PACT_BROKER_USERNAME \
            -e PACT_BROKER_PASSWORD \
            pactfoundation/pact-cli:latest \
            pact-broker can-i-deploy \
            --pacticipant user-service \
            --version "${GITHUB_SHA}" \
            --to-environment production \
            --retry-while-unknown 10 \
            --retry-interval 10

  deploy:
    needs: can-i-deploy
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        run: |
          echo "Deploying user-service ${GITHUB_SHA} to production"
          # ./deploy.sh production "${GITHUB_SHA}"

      - name: Record deployment
        run: |
          docker run --rm \
            -e PACT_BROKER_BASE_URL \
            -e PACT_BROKER_USERNAME \
            -e PACT_BROKER_PASSWORD \
            pactfoundation/pact-cli:latest \
            pact-broker record-deployment \
            --pacticipant user-service \
            --version "${GITHUB_SHA}" \
            --environment production
```

The provider POM's Surefire config (page 13) turns those `GIT_COMMIT` /
`GIT_BRANCH` env vars into `pact.provider.version` / `pact.provider.branch`, so
the verification result is stored against the right provider version:

```xml
<systemPropertyVariables>
  <pact.verifier.publishResults>true</pact.verifier.publishResults>
  <pact.provider.version>${env.GIT_COMMIT}</pact.provider.version>
  <pact.provider.branch>${env.GIT_BRANCH}</pact.provider.branch>
</systemPropertyVariables>
```

> **No provider version, no result.** If `pact.provider.version` is empty the
> broker rejects the published result. That is the number-one cause of "the
> provider verified in CI but the matrix still shows *unknown*".

---

## What `can-i-deploy` Prints

### Success

```text
Computer says yes \o/

CONSUMER       | C.VERSION | PROVIDER     | P.VERSION | SUCCESS? | RESULT?
---------------|-----------|--------------|-----------|----------|--------
order-service  | 9f3c1a2   | user-service | 4b7d9e0   | true     | 1

All required verification results are published and successful
```

Exit code `0` — the pipeline proceeds to deploy.

### Blocked

```text
Computer says no ¯\_(ツ)_/¯

CONSUMER       | C.VERSION | PROVIDER     | P.VERSION | SUCCESS? | RESULT?
---------------|-----------|--------------|-----------|----------|--------
order-service  | 9f3c1a2   | user-service | 1a2b3c4   | false    | failed

The verification result is a FAILURE for the following reason:
The provider 'user-service' version '1a2b3c4' did not verify the pact
from consumer 'order-service' version '9f3c1a2'
```

Exit code `1` — the pipeline stops before deploying. The column names and
wording vary slightly between broker versions; what is stable is the exit code.

### Unknown results (provider still verifying)

```text
Computer says no ¯\_(ツ)_/¯
...
The verification result is one of the following for this version: "unknown"
```

This is why the workflow uses `--retry-while-unknown 10 --retry-interval 10`:
it polls for up to ~100 seconds until the provider build publishes its result.

---

## Putting the Gate in the Right Place

| Check                                    | Ask it...                                          |
| ---------------------------------------- | -------------------------------------------------- |
| Consumer `can-i-deploy` before deploy    | can my new consumer run against the **deployed** provider? |
| Provider `can-i-deploy` before deploy    | can my new provider still serve every **deployed** consumer? |
| `record-deployment` after deploy         | tell the broker what is now live                    |

Do **not** skip `record-deployment`. Without it the broker has no idea what is
running in `production`, so `can-i-deploy --to-environment production` compares
against nothing and can pass vacuously or report `unknown` forever.

---

## Practice

1. **Simulate a break.** In the provider, change `id` to a `String`, push, and
   watch the provider workflow fail. Then in the consumer, push a change that
   needs the new shape and observe the consumer's `can-i-deploy` block the
   deploy. Which job fails first, and why?
2. **Dry-run the gate.** Add `--dry-run` to a local `can-i-deploy` invocation
   against a pact you know is unverified. Does the exit code change? When would
   `--dry-run` be appropriate?

<details>
<summary>Answer</summary>

1. The provider CI fails at the `verify` job first, because it re-verifies the
   changed pact immediately. If the broken provider was already deployed when
   the consumer changed, the consumer's `can-i-deploy` fails because the
   deployed provider version does not satisfy the new consumer pact. The gate
   catches it wherever the incompatibility first becomes relevant.
2. `--dry-run` always exits `0`, so CI would proceed even against a broken
   contract. It is appropriate only when bootstrapping a pipeline or as an
   explicit, temporary "break glass" override — never as the steady state.

</details>

---

## See also

- [Publishing & Webhooks](17-Publishing-And-Webhooks.md)
- [Versioning & the Pact Matrix](../04-Advanced/20-Versioning-And-The-Pact-Matrix.md)
- [Provider Verification](16-Provider-Verification.md)
- [The Pact Broker & PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)

## Recap

- The deployment gate is `can-i-deploy`: it exits `0` when safe and `1` when
  blocked, using the broker's recorded verification results.
- `--to-environment` compares against **deployed** versions (preferred);
  `--to` is the legacy tag-based check.
- Consumer CI: test → publish pact → `can-i-deploy` → deploy →
  `record-deployment`.
- Provider CI: verify pacts (publishing results with
  `pact.provider.version`) → `can-i-deploy` → deploy → `record-deployment`.
- Publish a **unique, immutable** version per build — the git SHA is ideal.
- `--retry-while-unknown` bridges the gap while a provider verification is still
  running; without `record-deployment`, the matrix has nothing to compare to.
- Verification results without a provider version are discarded by the broker.
