# Contract Testing — guide outline

Topic slug: `contract-testing` · kind: `markdown-book` · units: `pages`

Running example: `order-service` (consumer) → `user-service` (provider),
plus an `order-created` event consumed by `notification-service`.

```
content/contract-testing/
├── 01-Foundations/             # what/why, vocabulary, test-type comparison
├── 02-Pact-Workflow/           # pact files, matching, broker, provider states
├── 03-Hands-On/                # full runnable consumer + provider + CI
├── 04-Advanced/                # messages, versioning, can-i-deploy, bi-directional
├── 05-Spring-Cloud-Contract/   # producer-driven contracts
├── 06-Operations/              # microservice topology, anti-patterns, debugging
└── 07-Practice/                # interview Qs, cheat sheet, labs
```

## 01 — Foundations
| # | Page | Core content |
| - | ---- | ------------ |
| 01 | What Is Contract Testing? | The integration-test problem; definition; contract = expectations + obligations. ASCII of the two-sided agreement. |
| 02 | The Problem Contracts Solve | Flaky E2E, shared environments, coupling, "who broke it?"; test pyramid with contract layer. |
| 03 | Consumers, Providers & Contracts | Roles, the request/response pair, one contract per consumer-provider pair. |
| 04 | Consumer-Driven vs Producer-Driven | Direction of the spec; Pact vs OpenAPI/SCC; pros/cons table. |
| 05 | Contract vs Integration vs E2E vs Schema | Comparison table + decision tree; what each layer proves/doesn't. |
| 06 | Core Vocabulary | Glossary: pact, interaction, request/response, provider state, verification, broker, tag, matrix. |

## 02 — Pact Workflow
| # | Page | Core content |
| - | ---- | ------------ |
| 07 | The Pact Workflow End to End | Sequence diagram: consumer test → pact file → broker → provider verify → can-i-deploy. |
| 08 | Anatomy of a Pact File | Full annotated `order-service-user-service.json`; interaction object, matchingRules. |
| 09 | Matchers & Matching Rules | `like`, `eachLike`, `regex`, `term`, `integer`, `datetime`, `include`, `notEmpty`; why exact values are brittle. |
| 10 | Request & Response Matching | Matching headers, query, path, body; how verification compares against real provider. |
| 11 | The Pact Broker & PactFlow | What it stores, publishing, tags/environments, webhooks, Matrix. |
| 12 | Provider States | Setting up provider data per interaction; `@State` on provider, state params. |

## 03 — Hands-On (full lab)
| # | Page | Core content |
| - | ---- | ------------ |
| 13 | Project Setup | Maven layout for both services; dependency XML; versions; running the broker with Docker. |
| 14 | Writing Consumer Tests | Complete order-service Pact + MockServer test, config, naming, JUnit5. |
| 15 | Generating & Reading the Pact | Running the test, where the file lands, annotated JSON, troubleshooting. |
| 16 | Provider Verification | Complete user-service provider test; `@Provider`, `@PactFolder`/`@PactBroker`, states, RestAssured/MockMvc. |
| 17 | Publishing & Webhooks | `mvn pact:publish`, broker CLI, triggering provider build, build URLs. |
| 18 | CI/CD & can-i-deploy | GitHub Actions workflow for both sides; recording deployments; gate before prod. |

## 04 — Advanced
| # | Page | Core content |
| - | ---- | ------------ |
| 19 | Message Pact (Async) | Kafka/event contracts, `MessagePactBuilder`, consumer + provider message verification for `order-created`. |
| 20 | Versioning & the Pact Matrix | Consumer versions, provider versions, tags/branches, `can-i-deploy` semantics, pending/WIP pacts. |
| 21 | Bi-Directional Contract Testing | OpenAPI + Pact together; how it catches producer-only changes. |
| 22 | GraphQL, gRPC & non-HTTP | Brief patterns and tool support; when HTTP-style contracts don't fit. |

## 05 — Spring Cloud Contract
| # | Page | Core content |
| - | ---- | ------------ |
| 23 | SCC Concepts | Producer-driven contracts, Groovy/YAML DSL, generated tests + stubs. |
| 24 | Producer Side | Writing contracts, `spring-cloud-contract-maven-plugin`, generated verification tests. |
| 25 | Consumer Side | Stub Runner (HTTP + messaging), `@AutoConfigureStubRunner`, local vs remote stubs. |
| 26 | SCC vs Pact | Side-by-side comparison, migration notes, choosing one. |

## 06 — Operations
| # | Page | Core content |
| - | ---- | ------------ |
| 27 | Contract Testing in a Microservice Topology | ASCII topology; contracts between teams; ownership, versioning, broker as source of truth. |
| 28 | Anti-Patterns & Pitfalls | Over-matching, contract drift, testing business logic in contracts, provider-state leakage, one giant pact. |
| 29 | Debugging Failed Verifications | Reading verification output, diffing expected vs actual, common mismatch messages. |

## 07 — Practice
| # | Page | Core content |
| - | ---- | ------------ |
| 30 | Interview Questions | 25–30 Q&A from conceptual to hands-on, with concise answers. |
| 31 | Cheat Sheet & Learning Path | Commands, annotations, matchers, a 2-week study plan, lab checklist. |
