# 21 — Bi-Directional Contract Testing

Classic Pact is **consumer-driven**: only consumers write contracts, so a
provider cannot break a consumer change — but a provider can still change
independently as long as all its *known* consumers' pacts pass. **Bi-Directional
Contract Testing (BDCT)** closes that gap by giving the provider its own
contract too.

---

## The Two Directions

BDCT tests compatibility from **both ends**:

| Side | Contract | Written by | Captures |
| ---- | -------- | ---------- | -------- |
| Consumer | **Pact** (or output of Mocking tools) | consumer tests | what a consumer *needs* |
| Provider | **OpenAPI** spec | provider / generated | what a provider *offers* |

The broker then **cross-validates**: does every consumer request in the pact
fall inside what the OpenAPI provider contract allows? If yes, they are
compatible — *without the two teams coordinating a verification run*.

**Key insight:** In plain Pact the provider verifies contracts. In BDCT the
broker itself compares a consumer contract to a provider contract.

---

## Flow

```text
 consumer (any mock tool)      PactFlow               provider (OpenAPI)
 ──────────────────────        ────────               ──────────────────
 pact / mock output ─publish─► broker
                              ┌────────────┐
                              │  cross-    │◄─publish─ openapi.yaml
                              │ contract   │           (provider contract)
                              │ validation │
                              └─────┬──────┘
                                    │ result recorded
                                    ▼
                              can-i-deploy
                                    │
                          green ◄───┴───► red
```

**Figure 1 —** Consumers and providers publish their own contract; PactFlow
performs the comparison and records the result for `can-i-deploy`.

No request is ever replayed against a running provider. The OpenAPI document
*is* the provider contract.

---

## What It Catches That Plain Pact Misses

- **Provider-only changes.** A provider team removes or renames a field in
  their OpenAPI spec. BDCT flags it against the pact even if no consumer test
  ran.
- **Non-Pact consumers.** A mobile app tested with Wiremock, MSW, Cypress, or
  Mountebank can publish its recorded interactions as a pact file.
- **Gateways / pass-throughs.** The real API lives behind a gateway; the spec
  is the contract.

| Scenario | Plain Pact | Bi-Directional |
| -------- | ---------- | -------------- |
| Consumer changes, provider unchanged | Caught | Caught |
| Provider changes, all consumers verified | Caught | Caught |
| Provider changes, no consumer test run | **Missed** | Caught (if spec updated) |
| Consumer not using Pact | Not covered | Covered via recorded contract |
| Provider has no OpenAPI spec | Fine | Not available |

---

## Consumer Side

Either keep writing Pact tests (unchanged), or generate a pact from an existing
mocking tool. A minimal pact published by a non-Pact consumer looks like a
normal pact file:

```json
{
  "consumer": { "name": "mobile-app" },
  "provider": { "name": "user-service" },
  "interactions": [
    {
      "description": "GET /users/42",
      "request": { "method": "GET", "path": "/users/42" },
      "response": {
        "status": 200,
        "body": {
          "id": 42,
          "name": "Ada Lovelace",
          "email": "ada@example.com",
          "active": true,
          "createdAt": "2024-01-05T10:00:00Z"
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "3.0.0" } }
}
```

Publish it as usual:

```bash
pact-broker publish mobile-app-pacts \
  --consumer-app-version "$GIT_SHA" \
  --branch "$GIT_BRANCH"
```

---

## Provider Side — Publish the OpenAPI Contract

The provider publishes its spec **plus** proof that the spec matches the code
(a verification run). PactFlow stores both.

```bash
pactflow publish-provider-contract openapi/user-service.yaml \
  --provider user-service \
  --provider-app-version "$GIT_SHA" \
  --branch "$GIT_BRANCH" \
  --content-type application/yaml \
  --verification-exit-code 0 \
  --verification-results build/restassured-results.json \
  --verification-results-content-type application/json \
  --verifier restassured \
  --broker-base-url https://your-org.pactflow.io \
  --broker-token "$PACTFLOW_TOKEN"
```

The `--verification-*` flags are essential: they prove the OpenAPI document is
an accurate description of the running provider, not an aspirational design.

Keeping the spec in sync with the code is now a provider responsibility. Many
teams generate it from annotations (e.g. `springdoc-openapi`) or code
(swagger-core, swashbuckle) so it cannot drift.

---

## The Gate

`can-i-deploy` is used exactly as with plain Pact, but the broker's answer now
also reflects cross-contract validation:

```bash
pact-broker can-i-deploy \
  --pacticipant user-service \
  --version "$GIT_SHA" \
  --to-environment production \
  --broker-base-url https://your-org.pactflow.io \
  --broker-token "$PACTFLOW_TOKEN"
```

Because cross-contract validation is asynchronous, use polling:

```text
--retry-while-unknown 6 --retry-interval 10
```

---

## When to Use BDCT

| Choose BDCT when… | Prefer plain Pact when… |
| ----------------- | ----------------------- |
| Provider already has a good OpenAPI spec | Greenfield, Pact-first team |
| Consumers do not use Pact (or use mock tools) | You want maximal consumer-driven precision |
| Retrofitting contract testing onto a legacy system | You need full matcher semantics |
| Public APIs documented by OpenAPI | Event-driven / message contracts |
| Gateway or third-party API boundary | Provider cannot express behaviour in OpenAPI |

You can run **both** at once: BDCT to bootstrap coverage quickly, and targeted
Pact contracts where you need exact matcher-driven verification.

---

## Support and Limits

- **PactFlow only.** Bi-Directional Contract Testing is a commercial PactFlow
  feature; the open-source Pact Broker does not implement it.
- **Provider contracts:** OpenAPI (Swagger 2.0, OAS 3.0.x, OAS 3.1.x). SOAP,
  Protobuf, and GraphQL provider contracts are on the roadmap, not shipped.
- **Pact versions:** v1–v4 consumer contracts are supported; for v4 only
  `Synchronous/HTTP` interactions are validated — messages are ignored.
- **Matchers are ignored** during cross-contract validation. BDCT compares
  concrete values against the spec, so an overly strict consumer pact can
  produce false mismatches.
- **Spec coverage is your responsibility.** An incomplete OpenAPI document
  gives false confidence. A consumer pact for a `404` case can pass even if
  the spec never documents `404`.
- OAS documents must be a **single file** (no remote/`$ref` to files) and must
  not use YAML anchors.

---

## Gotchas

- Publishing a provider contract **without** verification results means the
  spec may not match the code — the comparison is then meaningless.
- Generated specs that silently omit error responses under-constrain the
  contract.
- Assuming BDCT verifies business behaviour: it only checks structural
  compatibility between two documents.
- Mixing BDCT and plain Pact on the same provider/consumer pair without
  understanding that both results feed `can-i-deploy`.

---

## See also

- [19 — Message Pact (Async)](./19-Message-Pact-Async.md)
- [20 — Versioning and the Pact Matrix](./20-Versioning-And-The-Pact-Matrix.md)
- [22 — GraphQL, gRPC and Non-HTTP](./22-GraphQL-gRPC-And-Non-HTTP.md)
- [04 — Consumer-Driven vs Producer-Driven](../01-Foundations/04-Consumer-Driven-vs-Producer-Driven.md)
- [11 — The Pact Broker and PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)

---

## Recap

- BDCT pairs a **consumer contract (Pact)** with a **provider contract (OpenAPI)**.
- The **broker cross-validates** them; no live request is replayed.
- It catches **provider-only changes** and supports **non-Pact consumers**.
- The provider must publish its spec **with verification results** so the spec
  is proven to match the code.
- PactFlow-only; matchers, messages, and non-OpenAPI provider contracts are not
  covered.
- `can-i-deploy` remains the single gate.

---

## Practice

1. A provider removes the `email` field from its OpenAPI spec. No consumer
   test suite changed and none ran. Would plain Pact catch this? BDCT?

   **Answer:** Plain Pact misses it until a consumer verification runs against
   the new provider. BDCT flags the breaking change when the new spec is
   published and cross-validated against the `order-service` pact.

2. Why must you pass `--verification-results` when publishing a provider
   contract?

   **Answer:** Without it there is no evidence the OpenAPI document reflects
   the running code, so cross-contract validation could pass against a spec
   the provider does not actually implement.

3. Your `order-service` pact asserts `id` with a `like(...)` matcher. BDCT
   compares against the spec and reports a mismatch on a concrete value. Why?

   **Answer:** Cross-contract validation ignores matchers and compares
   concrete values, so a matcher-tightened pact can mismatch. Loosen the
   concrete example or use plain Pact for that interaction.
