# 17 — Publishing And Webhooks

---

## From a File on Disk to a Shared Contract

A pact sitting in `order-service/target/pacts/` only helps if the provider can
see it. Publishing puts it in the **Pact Broker**, which:

- versions it against the consumer's commit,
- records which branches/environments it belongs to,
- fires **webhooks** so the provider's CI is triggered to verify it,
- powers the **Matrix** and `can-i-deploy`.

```text
consumer CI                         Pact Broker :9292
───────────                         ─────────────────
mvn test
   │  writes order-service-user-service.json
   ▼
mvn pact:publish ─────────────►  store pact against
 (version + branch + tag)         consumer version
                                        │
                                        │  contract requiring
                                        │  verification published
                                        ▼
                                 webhook ──► provider CI
                                             (verify + publish result)
```

**Figure 1 —** Publishing stores the pact and optionally triggers the provider
build via a webhook.

---

## Publish with the Maven Plugin

Add the Pact Maven plugin to the **consumer's** `pom.xml`. It provides the
`pact:publish` goal. Put this inside the existing `<build><plugins>` block.

```xml
<plugin>
    <groupId>au.com.dius.pact.provider</groupId>
    <artifactId>maven</artifactId>
    <version>${pact.version}</version>
    <configuration>
        <!-- Defaults to ${project.build.directory}/pacts -->
        <pactDirectory>${project.build.directory}/pacts</pactDirectory>

        <pactBrokerUrl>http://localhost:9292</pactBrokerUrl>
        <pactBrokerUsername>pact</pactBrokerUsername>
        <pactBrokerPassword>pact</pactBrokerPassword>

        <!-- Consumer version that this pact belongs to. -->
        <projectVersion>${project.version}</projectVersion>

        <!-- Strip -SNAPSHOT so the broker can parse the version. -->
        <trimSnapshot>true</trimSnapshot>

        <!-- Record the git branch. -->
        <branchName>${git.branch}</branchName>

        <!-- Tag the consumer version. -->
        <tags>
            <tag>${git.branch}</tag>
        </tags>
    </configuration>
</plugin>
```

> **Coordinates.** The Pact Maven plugin lives at
> `au.com.dius.pact.provider:maven`. Older docs and blog posts sometimes call it
> `pact-jvm-provider-maven`; that is the legacy artifact id. The goal is
> `pact:publish` either way.

### Run the publish

```bash
cd order-service
mvn test
mvn pact:publish
```

```text
[INFO] --- maven:4.6.21:publish (default-cli) @ order-service ---
[INFO] Publishing pacts from /work/order-service/target/pacts
[INFO] Publishing order-service-user-service.json
[INFO]   with consumer version 1.0.0 and branch 'main'
[INFO] BUILD SUCCESS
```

Override the version/branch/tag at the command line when your POM cannot know
them (for example, values that only exist inside CI):

```bash
mvn pact:publish \
  -Dpact.publish.consumer.version="$(git rev-parse --short HEAD)" \
  -Dpact.publish.consumer.branchName="$(git rev-parse --abbrev-ref HEAD)" \
  -Dpact.publish.consumer.buildUrl="$BUILD_URL"
```

Supported property / environment forms:

| Setting  | System property                    | Environment variable                |
| -------- | ---------------------------------- | ----------------------------------- |
| version  | `pact.publish.consumer.version`    | `PACT_PUBLISH_CONSUMER_VERSION`     |
| branch   | `pact.publish.consumer.branchName` | `PACT_PUBLISH_CONSUMER_BRANCHNAME`  |
| buildUrl | `pact.publish.consumer.buildUrl`   | `PACT_PUBLISH_CONSUMER_BUILDURL`    |

---

## Publish with the Broker CLI

If you prefer not to put publishing in the POM — or you are not on Maven — use
the **Pact Broker CLI** (`pact-broker`). The easiest way to get it is the
official `pactfoundation/pact-cli` Docker image.

```bash
docker run --rm \
  -v "$PWD/target/pacts:/pacts" \
  -e PACT_BROKER_BASE_URL=http://host.docker.internal:9292 \
  -e PACT_BROKER_USERNAME=pact \
  -e PACT_BROKER_PASSWORD=pact \
  pactfoundation/pact-cli:latest \
  publish /pacts \
  --consumer-app-version "$(git rev-parse --short HEAD)" \
  --branch "$(git rev-parse --abbrev-ref HEAD)" \
  --build-url "$BUILD_URL"
```

```text
Publishing 'order-service-user-service.json' to the pact broker...
Pact published successfully
```

If you already have the standalone CLI installed, the same command is:

```bash
pact-broker publish ./target/pacts \
  --consumer-app-version "$(git rev-parse --short HEAD)" \
  --branch "$(git rev-parse --abbrev-ref HEAD)" \
  --broker-base-url http://localhost:9292 \
  --broker-username pact \
  --broker-password pact
```

Key flags:

| Flag                                | Meaning                                          |
| ----------------------------------- | ------------------------------------------------ |
| `--consumer-app-version`            | The consumer version this pact belongs to        |
| `--branch`                          | Git branch of the consumer version               |
| `--tag` (repeatable)                | Extra tags for the consumer version              |
| `--tag-with-git-branch`             | Auto-tag from the current git branch             |
| `--build-url`                       | Links the pact back to the CI build              |

> **Version is mandatory.** The broker cannot store a pact without a consumer
> version. `--consumer-app-version` is the one flag you must never omit. Prefer
> a git SHA or a release tag over a mutable `SNAPSHOT`.

---

## Webhooks: Trigger the Provider on Change

A **webhook** tells the broker to call something when an event happens. The
event that matters here is `contract_requiring_verification_published` — a new
or changed pact that the provider has not verified yet. The webhook fires the
provider's CI, and CI runs provider verification (page 16), which publishes the
result back.

### The webhook JSON

`webhook.json`:

```json
{
  "description": "Trigger user-service verification when a pact changes",
  "events": [
    { "name": "contract_requiring_verification_published" }
  ],
  "request": {
    "method": "POST",
    "url": "https://api.github.com/repos/example/user-service/dispatches",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer ${user.githubToken}"
    },
    "body": {
      "event_type": "contract-requiring-verification",
      "client_payload": {
        "pactUrl": "${pactbroker.pactUrl}",
        "consumer": "${pactbroker.consumerName}",
        "consumerVersion": "${pactbroker.consumerVersionNumber}",
        "providerVersion": "${pactbroker.providerVersionNumber}"
      }
    }
  }
}
```

The `${...}` values are **template parameters** the broker substitutes at
delivery time. The commonly used ones:

| Parameter                              | Value                                        |
| -------------------------------------- | -------------------------------------------- |
| `${pactbroker.pactUrl}`                | URL of the changed pact                      |
| `${pactbroker.consumerName}`           | e.g. `order-service`                         |
| `${pactbroker.providerName}`           | e.g. `user-service`                          |
| `${pactbroker.consumerVersionNumber}`  | Consumer version that published              |
| `${pactbroker.providerVersionNumber}`  | Provider version that was verified           |
| `${pactbroker.verificationResultUrl}`  | Diff URL on failure (verification webhooks)  |

### Create it

Using the CLI (the `-d` payload is either an inline JSON string or `@file`):

```bash
pact-broker create-webhook \
  'https://api.github.com/repos/example/user-service/dispatches' \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/vnd.github+json' \
  --header 'Authorization: Bearer REDACTED' \
  --data @webhook.json \
  --contract-requiring-verification-published \
  --description "Trigger user-service verification when a pact changes" \
  --broker-base-url http://localhost:9292 \
  --broker-username pact \
  --broker-password pact
```

```text
Webhook created with uuid 6d1f9b3c-6f8e-4c1a-9a0b-6b2c7e2f1a44
```

Test it without waiting for a real event:

```bash
pact-broker test-webhook \
  --uuid 6d1f9b3c-6f8e-4c1a-9a0b-6b2c7e2f1a44 \
  --broker-base-url http://localhost:9292 \
  --broker-username pact \
  --broker-password pact
```

```text
Webhook execution was successful
```

The same creation can be done through the API:

```bash
curl -s -X POST http://localhost:9292/webhooks \
  -H 'Content-Type: application/json' \
  -u pact:pact \
  --data @webhook.json
```

> **Whitelisting.** Self-hosted brokers reject webhook URLs outside the
> `webhook_host_whitelist`. For GitHub in a lab, allow `api.github.com`. In
> production this is a deliberate security control — do not disable it wholesale.
> Also note: a webhook auth token should live in the broker's configuration or a
> masked CI secret, never committed to `webhook.json`.

---

## View the Matrix in the UI

Open `http://localhost:9292` and follow **Pacts → Matrix**, or go straight to a
matrix query URL. The matrix is a grid: rows are consumer versions, columns are
provider versions, and each cell says whether the pact between them verified.

```text
                 user-service 1.0.0   user-service 2.0.0
order-service 1.0.0     ✔ verified        ✘ failed
order-service 1.0.0@main ✔ verified       …
order-service 2.0.0     ? unknown          ✔ verified
```

**Figure 2 —** A simplified matrix. `✔` = successful verification, `✘` = failed,
`?` = no verification result yet. The real UI links each cell to the pact and
the diff.

The **Grid** view of a pact page shows the timeline of versions and their
verification badges — useful when you are asking "when did this last pass?".

---

## Practice

1. **Publish then inspect.** Run `mvn test && mvn pact:publish` from
   `order-service`, then open `http://localhost:9292`. Find the pact, its
   consumer version, and the branch you published with.
2. **Change a matcher and republish.** Revert `email` to `stringType` in the
   consumer test, run `mvn test && mvn pact:publish`. Does the broker create a
   new version or overwrite the old one? Why does that matter?

<details>
<summary>Answer</summary>

1. The Home page lists `order-service → user-service`; the version shown is the
   `projectVersion` (or `--consumer-app-version`) and the branch is what you
   passed as `--branch`/`<branchName>`.
2. If you publish with the **same** consumer version, the broker detects the
   content changed and replaces the pact for that version (you will see a
   "changed" indicator). If you publish with a **new** version, it creates a new
   row. This matters because verification results attach to a
   (consumer-version, provider-version) pair — republishing a changed pact under
   an old version silently invalidates earlier verification results.

</details>

---

## See also

- [Provider Verification](16-Provider-Verification.md)
- [The Pact Broker & PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)
- [CI/CD & Can-I-Deploy](18-CICD-And-Can-I-Deploy.md)
- [Generating & Reading the Pact](15-Generating-And-Reading-The-Pact.md)

## Recap

- Publish with `mvn pact:publish` (Pact Maven plugin
  `au.com.dius.pact.provider:maven`) or `pact-broker publish` (CLI / Docker
  image `pactfoundation/pact-cli`).
- Every publish needs a **consumer version**; branch and build URL are strongly
  recommended.
- Webhooks fire on broker events such as
  `contract_requiring_verification_published`; the request body can interpolate
  `${pactbroker.*}` parameters.
- Use `pact-broker test-webhook` to exercise a webhook without waiting for a
  real event.
- The **Matrix** is the grid of consumer versions × provider versions and their
  verification status — the data behind `can-i-deploy`.
