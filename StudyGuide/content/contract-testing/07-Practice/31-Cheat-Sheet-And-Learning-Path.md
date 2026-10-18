# 31 — Cheat Sheet and Learning Path

A single-page reference for annotations, matchers and commands, plus a two-week plan and a lab checklist to build the `user-service` / `order-service` setup end to end.

## The Running Example

```text
   order-service ──HTTP GET /users/{id}──► user-service
        │                                    (provider)
        │ (consumer)
        │ publishes "order-created"
        ▼
   topic "orders" ─────────────────────► notification-service
                                          (consumer)
```

**Figure 1 —** Two HTTP roles and one asynchronous edge, all under contract.

`user-service` returns `GET /users/42 -> 200 { "id": 42, "name": "Ada Lovelace", "email": "ada@example.com", "active": true, "createdAt": "2024-01-05T10:00:00Z" }` and `GET /users/999 -> 404 { "error": "user not found" }`. Provider state: `"user 42 exists"`.

## Key Annotations

### Pact (JVM)

| Annotation | Fully-qualified name | On | Purpose |
| --- | --- | --- | --- |
| `@PactConsumerTestExt` | `au.com.dius.pact.consumer.junit5.PactConsumerTestExt` | consumer test (via `@ExtendWith`) | activates the Pact JUnit 5 extension |
| `@Pact` | `au.com.dius.pact.consumer.Pact` | consumer method | declares an interaction; returns `RequestResponsePact` / `MessagePact` |
| `@PactTestFor` | `au.com.dius.pact.consumer.junit5.PactTestFor` | class / method | sets `providerName`, `port`, `pactMethod` |
| `@State` | `au.com.dius.pact.provider.junitsupport.State` | provider method | handles a provider state |
| `@Provider` | `au.com.dius.pact.provider.junitsupport.Provider` | provider test class | names the provider |
| `@PactFolder` | `au.com.dius.pact.provider.junitsupport.loader.PactFolder` | provider test class | loads local pact files |
| `@PactBroker` | `au.com.dius.pact.provider.junitsupport.loader.PactBroker` | provider test class | loads pacts from a broker |
| `@PactBrokerAuth` | `au.com.dius.pact.provider.junitsupport.loader.PactBrokerAuth` | provider test class | broker credentials |

### Spring Cloud Contract

| Annotation / element | On | Purpose |
| --- | --- | --- |
| `@AutoConfigureStubRunner` | consumer test | resolves stubs and starts WireMock / message routes (`ids`, `stubsMode`, `repositoryRoot`) |
| `@StubRunnerPort("user-service")` | field | injects the assigned stub port |
| `@EnableStubRunnerServer` | Stub Runner Boot app | exposes `/stubs` and `/triggers/{label}` |
| `<baseClassForTests>` | plugin config | base class the generated provider tests extend |

## Matcher Cheat Sheet

### Pact (`PactDslJsonBody` / `Match`)

| Matcher | Meaning |
| --- | --- |
| `stringType(name)` / `stringType(name, example)` | any string |
| `integerType(name)` / `numberType` / `decimalType` | any integer / number / decimal |
| `booleanType(name)` | any boolean |
| `stringMatcher(name, regex, example)` | regex match |
| `eachLike(obj)` / `minArrayLike(obj, n)` / `maxArrayLike` | array of a shape with count rules |
| `date(fmt)` / `time(fmt)` / `datetime(fmt)` | formatted date/time |
| `nullValue()` | null |
| `Match.regex(...)` / `Match.like(...)` / `Term` | lower-level matchers |

### Spring Cloud Contract DSL

| Matcher | Meaning |
| --- | --- |
| `$(regex('...'))` | regex match |
| `$(anyInteger())` / `$(anyPositiveInt())` / `$(anyDouble())` | numeric type matchers |
| `$(anyBoolean())` | boolean |
| `$(anyNonEmptyString())` | non-empty string |
| `$(consumer('a'), producer('b'))` | different value per side |
| YAML `by_type` / `by_regex` / `by_date` / `by_time` / `by_timestamp` | YAML matcher types |

## Maven Commands

```bash
# Consumer (Pact): run tests and generate pact files into target/pacts
mvn clean test

# Provider (Pact): verify pacts from a folder
mvn test

# SCC producer: generate provider tests + stubs jar, install to ~/.m2
mvn clean install

# SCC: regenerate tests or stubs only
mvn spring-cloud-contract:generateTests
mvn spring-cloud-contract:generateStubs

# SCC: inspect the generated test sources
ls target/generated-test-sources/contracts
```

Publishing pacts can also be done from Maven with the `au.com.dius.pact.provider:pact-jvm-provider-maven` plugin (`publish` goal), but the CLI below is the most portable.

## Pact Broker CLI

```bash
export PACT_BROKER_BASE_URL="https://broker.example.com"
export PACT_BROKER_TOKEN="<token>"

# Publish pact files (with version and branch)
pact-broker publish ./target/pacts \
  --consumer-app-version 1.2.3 \
  --branch main \
  --broker-base-url "$PACT_BROKER_BASE_URL"

# Tag a version
pact-broker create-version-tag \
  --pacticipant order-service --version 1.2.3 --tag main

# Record a deployment
pact-broker record-deployment \
  --pacticipant order-service --version 1.2.3 --environment production

# Create an environment resource
pact-broker create-environment --name production
```

Docker wrapper (no Ruby install):

```bash
docker run --rm -v "$PWD/target/pacts:/pacts" \
  -e PACT_BROKER_BASE_URL="$PACT_BROKER_BASE_URL" \
  -e PACT_BROKER_TOKEN="$PACT_BROKER_TOKEN" \
  pactfoundation/pact-cli:latest \
  publish /pacts --consumer-app-version 1.2.3 --branch main
```

## can-i-deploy

```bash
# Gate a deployment to production
pact-broker can-i-deploy \
  --pacticipant order-service \
  --version 1.2.3 \
  --to-environment production \
  --broker-base-url "$PACT_BROKER_BASE_URL"

# Check against the latest verified version instead of an environment
pact-broker can-i-deploy \
  --pacticipant order-service \
  --version 1.2.3 \
  --to latest
```

Exit code `0` means safe to deploy; non-zero means a required verification is missing or failed.

## SCC Consumer Commands

```bash
# Test the consumer against locally installed stubs
mvn test \
  -Dspring.cloud.contract.stubrunner.stubsMode=LOCAL

# Start Stub Runner Boot as a standalone stub server
java -jar spring-cloud-contract-stub-runner-boot.jar \
  --spring.cloud.contract.stubrunner.ids=com.example:user-service:+:stubs:8090
```

## Two-Week Study Plan

| Day | Goal | Lab |
| --- | --- | --- |
| 1 | Understand the integration-test problem | Read Foundations pages; sketch the test pyramid |
| 2 | Learn contract vocabulary | Define pact, interaction, provider state in your own words |
| 3 | Consumer-driven vs producer-driven | Compare Pact and SCC with a table |
| 4 | Pact consumer test | Write a `@Pact` test for `UserClient` |
| 5 | Read the pact file | Annotate the generated JSON interaction and matchingRules |
| 6 | Matchers | Replace exact values with `like`, `regex`, `eachLike` |
| 7 | Provider verification | Verify `user-service` with `@Provider` + `@State` |
| 8 | Run a Pact Broker | Start the broker with Docker; publish a pact |
| 9 | Matrix and can-i-deploy | Record deployments; run a `can-i-deploy` gate |
| 10 | Message pacts | Contract `order-created` with `MessagePactBuilder` |
| 11 | SCC concepts | Read SCC pages; write a Groovy contract |
| 12 | SCC producer + consumer | Generate tests/stubs, then run Stub Runner |
| 13 | Messaging in SCC | Contract `order-created`; trigger it with `StubTrigger` |
| 14 | CI integration | Wire consumer, provider and deploy gates into CI |

## Hands-On Lab Checklist

- [ ] Create `user-service` with a `GET /users/{id}` controller.
- [ ] Add `pact-jvm-consumer-junit5` and write a consumer test in `order-service`.
- [ ] Generate `order-service-user-service.json` and read it.
- [ ] Start a Pact Broker with Docker and publish the pact.
- [ ] Write a provider verification test with `@Provider`, `@State`, `@PactBroker`.
- [ ] Add a `404` interaction and verify it.
- [ ] Record deployments and run `can-i-deploy`.
- [ ] Contract the `order-created` message with `MessagePactBuilder`.
- [ ] Add the SCC Maven plugin and write `shouldReturnUser.groovy`.
- [ ] Inspect the generated test and the `-stubs.jar`.
- [ ] Consume the stubs with `@AutoConfigureStubRunner`.
- [ ] Trigger the messaging stub with `StubTrigger`.
- [ ] Add `can-i-deploy` to a CI release gate.
- [ ] Write down one anti-pattern you hit and how you fixed it.

## See also

- [30 — Interview Questions](30-Interview-Questions.md)
- [23 — SCC Concepts](../05-Spring-Cloud-Contract/23-SCC-Concepts.md)
- [The Pact Workflow End to End](../02-Pact-Workflow/07-The-Pact-Workflow-End-to-End.md)
- [CI/CD and can-i-deploy](../03-Hands-On/18-CICD-And-Can-I-Deploy.md)

## Recap

- Pact is consumer-driven; SCC is producer-driven.
- One SCC contract yields a provider test **and** a stubs jar.
- Matchers (`regex`, `like`, `eachLike`, `by_type`) prevent brittleness.
- `stubsMode` is `LOCAL`, `REMOTE` or `CLASSPATH`.
- The broker matrix plus `can-i-deploy` is the safe-release gate.
- Follow the two-week plan and tick every lab item to build real fluency.
