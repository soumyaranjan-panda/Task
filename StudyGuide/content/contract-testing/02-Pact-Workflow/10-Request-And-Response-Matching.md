# 10 — Request And Response Matching

During provider verification, Pact takes each interaction from the pact file, replays its **request** against the real provider, and compares the provider's **response** with the **expected** response. This page is the rulebook for that comparison.

The replay only needs the provider to satisfy the **consumer's** expectations — not to produce byte-identical output.

---

## The Comparison, Side by Side

```text
  EXPECTED (from pact)              ACTUAL (real provider response)
  ────────────────────              ───────────────────────────────
  status: 200                  200 == 200                  MATCH
  Content-Type: application/   Content-Type: application/   MATCH
                json                         json
  body:                        body:
    id:        42 (integer)      id:        42             MATCH (integer)
    name:      "Ada Lovelace"    name:      "Grace Hopper"  MATCH (type)
    email:     regex ".*@.*"     email:     "ada@x.com"    MATCH (regex)
    active:    true (type)       active:    true           MATCH
    createdAt: datetime fmt      createdAt: "...Z"         MATCH
                                 nickname: "ada"         IGNORED (extra key)
                    │
                    ▼
         result: VERIFICATION OK
```

**Figure 1 —** Expected versus actual: every expected element matches; the extra `nickname` key is tolerated.

A failing comparison looks like this:

```text
  EXPECTED (from pact)              ACTUAL (real provider)
  ────────────────────              ──────────────────────
    id: 42 (integer)                 id: "42" (string)
                    │
                    ▼
  MISMATCH: $.body.id
    Expected: 42 (Integer) but received: "42" (String)
```

**Figure 2 —** A body mismatch with a JSON path and the two values.

---

## What Is Compared, and How

| Element | Comparison rule |
| ------- | --------------- |
| **Method** | Case-insensitive string equality. |
| **Path** | Equal as strings, unless a `path` matcher exists (then the regex/term decides). |
| **Query** | Parsed into `name -> [values]`. Key order is ignored. Repeated keys are compared in order. Both empty = match; one empty = mismatch. |
| **Headers** | **Only headers present in the pact are checked.** The provider may add others. Values compared after whitespace around commas is stripped; a `header` matcher can override. Request matching excludes cookies. |
| **Request body** | Compared strictly (see `allowUnexpectedKeys` below). |
| **Response body** | Compared with matchers; extra keys tolerated by default. |
| **Status** | Integer equality (unless a `statusCode` matcher is used). |

### Body comparison in detail

For JSON bodies Pact applies these rules, in order:

1. Both empty → match. Actual non-empty + expected empty → match.
2. Objects are compared as maps; arrays as lists; otherwise values are compared.
3. For **maps**:
   - Each expected key must be present in the actual map, or it is a mismatch.
   - Extra actual keys are ignored when `allowUnexpectedKeys` is **true**.
4. For **lists**: sizes must agree and each item is compared by index (unless an array matcher is present).
5. For **values**: if a matcher is registered for the path, it decides; otherwise plain equality.

---

## Exact vs Type: `allowUnexpectedKeys`

**Postel's law** — *be conservative in what you send, liberal in what you accept* — is encoded directly:

| Body | `allowUnexpectedKeys` | Consequence |
| ---- | --------------------- | ----------- |
| **Request** (consumer → provider) | `false` (strict) | The consumer must send exactly the declared shape; extras are a mismatch. |
| **Response** (provider → consumer) | `true` (lenient) | The provider may return extra keys without failing verification. |

This is set **automatically** based on whether the body is a request or a response. It is not something you normally toggle, and setting it after verification starts has no effect.

### The three matching modes

| Mode | Meaning | Example |
| ---- | ------- | ------- |
| **Exact** | Literal equality (no matcher) | status `200`, `error: "user not found"` |
| **Type** | Any value of the same JSON type | `id` integer `42` |
| **Rule-based** | A specific matcher (regex, datetime, min/max) | `email` regex `.*@.*` |

A field with a matcher is **never** compared exactly, even though the pact file still contains an example value.

> Practical effect: adding a new response field in `user-service` will not break `order-service`'s pact, because response extra keys are ignored. Removing or renaming a field the consumer declared *will* break it.

---

## A Failing Verification, Decoded

```text
Verifying a pact between order-service and user-service

  a request for user 42
    returns a response which
      has status code 200 (OK)
      has a matching body (FAILED)

Failures:
  1) Verifying a pact between order-service and user-service
     - a request for user 42
       has a matching body
         $.body.id -> Expected 42 (Integer) but received "42" (String)
```

Read the path (`$.body.id`), the expected type, and the actual type. That is almost always enough to find the bug.

### Common mismatch messages

| Message | Likely cause |
| ------- | ------------ |
| `Expected ... but received ...` at a `$.body.*` path | Provider returns a different type or missing key. |
| `Expected a body but there was none` | Provider returned `204`/empty where the contract expects JSON. |
| `Expected status 200 but was 404` | Routing, auth, or the wrong provider state. |
| `Expected header "X" ... not found` | A declared response header was dropped. |
| `Unexpected key` | Only relevant when `allowUnexpectedKeys=false` (i.e. request bodies). |
| Array size mismatch | `eachLike`/`minArrayLike` bounds not satisfied. |

---

## Gotchas

- **Only declared headers are checked.** The provider can add headers freely; it cannot drop a declared one.
- **Query key order does not matter, but repeated-key value order does.**
- **A 404 is a valid contract.** The `GET /users/999` interaction expects `404` — returning `200` fails.
- **Matcher example values are irrelevant at verify time.** Do not "fix" a failure by editing the example.
- **Property order in JSON is irrelevant.** Comparisons are structural.

---

## Recap

- Verification replays the request and compares the response element by element.
- Only **declared** elements are checked; extra response keys/headers are tolerated.
- `allowUnexpectedKeys` is automatic: strict for requests, lenient for responses.
- Matchers override equality; without a matcher, comparison is exact.
- The failure message's JSON path and types localise almost every bug.

---

## Practice

1. The provider adds a brand-new JSON field to `GET /users/42`. Does the existing pact fail? Why?

> **Answer.** No. Response bodies use `allowUnexpectedKeys=true`, so extra keys in the actual response are ignored (Postel's law).

2. The provider renames `email` to `emailAddress` in the response. Does verification fail, and with what message?

> **Answer.** Yes. The expected key `email` is missing from the actual map, and expected keys missing from the actual always fail. The message points at `$.body.email` ("Expected ... but received ...").

3. A consumer declares the `Accept` request header. The provider echoes a different `Content-Type` than declared. Explain which is checked and which is not.

> **Answer.** Only declared headers are checked. If the consumer declared `Accept` on the request, that is what the provider must receive; the response `Content-Type` is checked only if it is declared on the response in the pact.

---

## See also

- [Matchers And Matching Rules](09-Matchers-And-Matching-Rules.md)
- [Provider States](12-Provider-States.md)
- [Anatomy Of A Pact File](08-Anatomy-Of-A-Pact-File.md)
- [Debugging Failed Verifications](../06-Operations/29-Debugging-Failed-Verifications.md)
- [Provider Verification](../03-Hands-On/16-Provider-Verification.md)
