# 29 — Debugging Failed Verifications

A red provider build is normal and usually quick to fix. This page shows how to
read the verification output, diff expected against actual, and — most
importantly — decide whether the fault is the **contract**, the **provider
code**, or the **provider state**.

---

## Reading the Output

Pact prints one block per interaction, then a `Failures:` section.

```text
Verifying a pact between order-service and user-service

  A request for user 42
    returns a response which
      has status code 200 (expected 200, actual 404)
      has a matching body (FAILED)

  Failures:

  1) A request for user 42
     Verification failed for the following reason:
       Expected status 200 but was 404

There were 1 pact failures
```

Three signals to extract immediately:

1. **Which interaction** — "A request for user 42".
2. **Which assertion** — status code, body, headers, or metadata.
3. **Expected vs actual** — `expected 200, actual 404`.

---

## Expected vs Actual

```text
  Expected (pact)               Actual (provider)
  ───────────────               ─────────────────
  status 200                    status 404
  body  { id, name, email,      body  { error: "Not Found" }
          active, createdAt }
        │
        └──► MISMATCH: status 200 != 404; body shape differs
```

**Figure 1 —** Hold the two side by side. The diff tells you whether the
provider returned nothing, the wrong thing, or the right thing in the wrong
shape.

---

## Common Mismatch Messages

| Message | Likely cause | First thing to check |
| ------- | ------------ | -------------------- |
| `Expected status 200 but was 404` | Provider state not applied, or the resource genuinely absent | Is the `@State` method present and matching the exact name? |
| `Expected status 200 but was 500` | Provider bug — an exception during the request | Provider logs at the timestamp of the run |
| `Expected body ... but was ...` | Provider response shape changed, or over-matching | Is it a real break or an exact-value matcher? |
| `Expected header 'X-...' but was missing` | Provider dropped/renamed a header the consumer relies on | Provider code, or remove the header from the pact if unused |
| `Expected a value matching 'regex ...'` | Matcher failure — real value does not fit the pattern | Is the regex too strict, or did the provider change format? |
| `nothing matched` / `No pacts found to verify` | Wrong `@PactFolder`/broker selector | Path, provider name, and selectors |
| `State change not found` / no `@State` match | Provider state name mismatch | Exact string of `@State` vs `given(...)` |

---

## A Step-by-Step Debugging Checklist

1. **Read the interaction description and provider state names.**
2. **Run the provider verification locally** against a local pact file with
   `@PactFolder("pacts")` rather than the broker — it removes network and
   selector variables.
3. **Confirm the failing request by hand** with `curl` against the running
   provider, using the same path and headers.
4. **Check the provider state actually ran** — enable debug logging and look
   for the `@State` callback. A silently missing state is the #1 cause of a
   `404`.
5. **Diff expected vs actual** field by field. Note whether the mismatch is a
   *missing field*, a *changed type*, or an *exact-value* mismatch.
6. **Classify the bug** (contract / provider / state — see below).
7. **Fix, re-run locally, then re-run through the broker** and confirm the
   matrix cell flips to `OK`.

### Running verification locally

Point the provider test at a local directory so you are not at the mercy of the
broker:

```java
@Provider("user-service")
@PactFolder("pacts")   // src/test/resources/pacts or target/pacts copied in
class UserProviderVerificationTest {
    // @TestTemplate + PactVerificationContext as usual
}
```

### Enabling debug logging

Logging for the Pact packages is the fastest way to see request/response and
state transitions.

Spring Boot:

```bash
mvn test -Dlogging.level.au.com.dius.pact=DEBUG
```

Standalone verifier / Docker:

```bash
docker run --rm -e LOG_LEVEL=debug \
  -v "$PWD/pacts:/pacts" \
  pactfoundation/pact-cli:latest \
  verify /pacts --provider-base-url http://localhost:8080
```

Large bodies can make diff generation slow; control it explicitly:

```bash
-Dpact.verifier.generateDiff=true      # always diff
-Dpact.verifier.generateDiff=false     # never diff (big payloads)
-Dpact.verifier.generateDiff=512kb     # diff only under 512kb
```

---

## The Broker UI

When verifying from the broker:

- Open the **provider** page and read the **latest verification result** for
  the failing consumer — it includes the request, expected/actual response, and
  the same mismatch text.
- Use **"Re-run"** / the webhook trigger to re-verify after a fix, instead of
  waiting for the next CI build.
- Check the **Matrix** to confirm how many consumer versions the failure
  affects — one pending pact is different from ten live ones.
- Confirm the **provider version** and **branch** were published; a missing
  version makes the result invisible to `can-i-deploy`.

---

## Contract Bug vs Provider Bug vs Bad State

```text
  Failure
     │
     ├── Only one interaction fails; state callback logged; manual
     │   curl matches the contract   ─────────────► PROVIDER BUG
     │                                                (fix provider code)
     │
     ├── Fails with 404 / empty data; state callback NOT logged,
     │   or state name in pact != @State name ─────► BAD PROVIDER STATE
     │                                                (fix state setup/name)
     │
     └── Fails even though provider matches what consumers truly need;
         mismatch is an exact value or an unused field ─► CONTRACT BUG
                                                      (fix + republish pact)
```

**Figure 2 —** The decision hinges on whether the provider *could* satisfy a
correct contract.

| Signal | Verdict | Action |
| ------ | ------- | ------ |
| Manual `curl` returns what the pact expects, but verification fails | Matcher/contract issue | Fix the matcher or the pact |
| Manual `curl` returns the wrong thing | Provider bug | Fix the provider |
| `curl` returns `404`/empty and the state callback never ran | Bad provider state | Fix `@State` name/setup |
| Mismatch on a field no real consumer reads | Contract bug (over-matching) | Relax to a matcher, republish |
| Passes locally, fails from broker | Selectors/version/publish config | Check `pact.provider.version`, branch, selectors |

**Diagnostic trick:** if you can reproduce the exact response the pact expects
with `curl`, the fault is on the **contract** side. If you cannot, it is on the
**provider or state** side.

---

## Gotchas

- **404 masquerading as a provider bug.** Nine times out of ten a `404` is a
  missing or misnamed provider state, not a broken endpoint.
- **State name typos.** `@State("user 42 exists")` must match
  `.given("user 42 exists")` exactly.
- **Verifying against a stale build.** Rebuild the provider before re-running;
  an old jar gives old results.
- **Reading only the first failure.** One bad `@State` can cascade; fix the
  first and re-run.
- **Assuming the pact is right.** The consumer can over-specify; a false
  failure is a contract bug, not a provider bug.

---

## See also

- [27 — Contract Testing in a Microservice Topology](./27-Contract-Testing-In-A-Microservice-Topology.md)
- [28 — Anti-Patterns and Pitfalls](./28-Anti-Patterns-And-Pitfalls.md)
- [12 — Provider States](../02-Pact-Workflow/12-Provider-States.md)
- [16 — Provider Verification](../03-Hands-On/16-Provider-Verification.md)
- [20 — Versioning and the Pact Matrix](../04-Advanced/20-Versioning-And-The-Pact-Matrix.md)

---

## Recap

- Extract three things from every failure: **interaction, assertion, diff**.
- `Expected X but was Y` is the core message; the expected side is the pact.
- Locally reproduce with **`@PactFolder`** and **debug logging** before blaming
  the broker.
- **`404` + missing state callback = bad provider state**, the most common
  cause.
- If `curl` can produce the expected response, the bug is the **contract**;
  otherwise it is the **provider**.
- Confirm the fix through the **broker UI and Matrix**, not just locally.

---

## Practice

1. Verification fails with `Expected status 200 but was 404`, and your logs show
   the `@State` callback never ran. What is the most likely cause?

   **Answer:** A provider state name mismatch between the pact's `given(...)`
   and the provider's `@State(...)`. Fix the name (or add the missing state
   method) and re-run.

2. A body mismatch appears on a field the consumer never reads. Is the provider
   broken?

   **Answer:** Probably not. It is likely over-matching in the contract. Relax
   the exact value to a matcher, republish the pact, and re-verify.

3. Verification passes locally but fails when run from the broker. What do you
   check first?

   **Answer:** Versioning and publishing config: `pact.provider.version`,
   provider branch, consumer version selectors, and whether
   `pact.verifier.publishResults` is set. A stale provider version or the wrong
   selectors change what gets verified.
