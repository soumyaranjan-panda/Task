# 08 — Anatomy Of A Pact File

The pact file is the artefact that travels between teams. It is JSON, it is generated (never hand-written), and once you can read it you can debug almost any contract problem. This page dissects a complete pact for `order-service` → `user-service`.

---

## Where the File Lives

By default the consumer test writes to:

```text
<consumer project>/target/pacts/order-service-user-service.json
```

The name is always `<consumer>-<provider>.json`, lower-cased and hyphenated. Change the directory with the `pact.rootDir` system property.

---

## The Whole File

Two interactions: a successful `GET /users/42` and a missing `GET /users/999`.

```json
{
  "consumer": {
    "name": "order-service"
  },
  "provider": {
    "name": "user-service"
  },
  "interactions": [
    {
      "description": "a request for user 42",
      "providerStates": [
        { "name": "user 42 exists" }
      ],
      "request": {
        "method": "GET",
        "path": "/users/42",
        "headers": {
          "Accept": "application/json"
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "id": 42,
          "name": "Ada Lovelace",
          "email": "ada@example.com",
          "active": true,
          "createdAt": "2024-01-05T10:00:00Z"
        },
        "matchingRules": {
          "path": {
            "matchers": [{ "match": "regex", "regex": "/users/\\d+" }]
          },
          "header": {
            "Content-Type": {
              "matchers": [{ "match": "regex", "regex": "application/json.*" }]
            }
          },
          "body": {
            "$.id":       { "matchers": [{ "match": "integer" }] },
            "$.name":     { "matchers": [{ "match": "type" }] },
            "$.email":    { "matchers": [{ "match": "regex", "regex": ".*@.*" }] },
            "$.active":   { "matchers": [{ "match": "type" }] },
            "$.createdAt": {
              "matchers": [
                { "match": "datetime", "datetime": "yyyy-MM-dd'T'HH:mm:ss'Z'" }
              ]
            }
          }
        }
      }
    },
    {
      "description": "a request for a user that does not exist",
      "providerStates": [
        { "name": "user 999 does not exist" }
      ],
      "request": {
        "method": "GET",
        "path": "/users/999"
      },
      "response": {
        "status": 404,
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "error": "user not found"
        },
        "matchingRules": {
          "body": {
            "$.error": { "matchers": [{ "match": "type" }] }
          }
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": {
      "version": "3.0.0"
    },
    "pact-jvm": {
      "version": "4.6.14"
    }
  }
}
```

> The `matchingRules` above are in the **V3/V4 nested form** (grouped by `path`, `header`, `query`, `body`). Pact JVM 4.3+ writes V4 by default; set `pactVersion = PactSpecVersion.V3` on `@PactTestFor` if you need V3.

---

## File Anatomy

```text
 order-service-user-service.json
 ├── consumer.name          "order-service"
 ├── provider.name          "user-service"
 ├── interactions[]         one element per test case
 │   ├── description        human-readable, unique per provider state
 │   ├── providerStates[]   what must be true before the replay
 │   ├── request            what the consumer sends
 │   │   ├── method         GET
 │   │   ├── path           /users/42
 │   │   ├── query          ?include=orders  (object: name -> [values])
 │   │   ├── headers        only headers the consumer relies on
 │   │   └── body           payload (usually absent for GET)
 │   └── response           what the consumer expects back
 │       ├── status         200
 │       ├── headers        Content-Type
 │       ├── body           example payload (the "canned" response)
 │       └── matchingRules  path / header / query / body matchers
 └── metadata
     ├── pactSpecification.version   3.0.0 (or 4.0)
     └── pact-jvm.version            4.6.14
```

**Figure 1 —** Structure of a pact file: identity, interactions, metadata.

---

## Field Reference

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `consumer.name` | string | The consumer that owns the contract (`order-service`). |
| `provider.name` | string | The provider that must satisfy it (`user-service`). |
| `interactions` | array | One entry per request/response pair. |
| `interactions[].description` | string | Unique per provider state; shown in verification output. |
| `interactions[].providerStates` | array of objects | Named preconditions (`{ "name": "user 42 exists" }`). |
| `request.method` | string | HTTP verb. |
| `request.path` | string | URL path. Can be governed by a `path` matcher. |
| `request.query` | object | Query params as `name -> [values]`; order-insensitive. |
| `request.headers` | object | Request headers the consumer sends. |
| `request.body` | any | Request payload, if any. |
| `response.status` | number | Expected HTTP status code. |
| `response.headers` | object | Response headers to check. |
| `response.body` | any | Example response used both as the mock reply and the expected shape. |
| `response.matchingRules` | object | How to compare paths, headers, query, body generically. |
| `metadata.pactSpecification.version` | string | Which pact specification this file conforms to. |
| `metadata.pact-jvm.version` | string | The library version that produced it. |

### Why the body doubles as an example

The `response.body` is not just an expectation — it is the exact payload the **mock provider** returns to the consumer during the consumer test. That is why precise example values matter at author time, even though at verification time the matchers, not the literals, decide pass/fail.

---

## Specification Versions

| Aspect | V2 | V3 | V4 |
| ------ | -- | -- | -- |
| Provider state | `providerState` (single string) | `providerStates` (array) | `providerStates` (array) |
| `matchingRules` location | top level of the interaction | inside `request` / `response`, grouped by category | inside, plus reusable rule sets via `"rules"` |
| Matcher paths | flat `$.body.id`, `$.header.X` | `"body": { "$.id": ... }` | same nesting, richer matchers |
| Messages | not supported | asynchronous messages | asynchronous **and** synchronous (request/response) messages |
| Plugins | no | no | yes (V4 pacts required) |
| Default in Pact JVM | old | `4.0.x`/`4.1.x` | **4.3+ default** |

The practical consequences:

- **V2 → V3** changed the shape of matchers and made states plural. Old tools may choke on V3/V4.
- **V3 → V4** is mostly additive: plugins, synchronous messages, reusable matching-rule references. Most REST contracts look the same.
- Always read `metadata.pactSpecification.version` before assuming a file layout.

---

## Gotchas

- **Never edit a pact by hand.** Regenerate it from the consumer test; hand edits are silently overwritten on the next run.
- **Descriptions must be unique per state.** Two interactions with the same description *and* state collide during merge.
- **Pact files merge by default.** Running tests can merge into an existing file; set `pact.writer.overwrite=true` to force a clean write.
- **Example values are not assertions.** `"name": "Ada Lovelace"` in the body is a sample; the `type` matcher is what actually gets enforced.

---

## Recap

- A pact file is generated JSON named `<consumer>-<provider>.json`.
- An **interaction** = description + providerStates + request + response (+ matchingRules).
- `response.body` is both the mock reply and the example the matchers describe.
- `matchingRules` moves from top-level (V2) to per-message, category-grouped (V3/V4).
- `metadata.pactSpecification.version` tells you which layout to expect.

---

## Practice

1. Where in the file would you look to see what data the provider must arrange before verification?

> **Answer.** `interactions[].providerStates`. Each entry names a state such as `"user 42 exists"` that the provider's `@State` method must implement.

2. A provider returns an extra field `nickname` that is not in the pact. Does the V3 body matcher fail? Explain.

> **Answer.** For a **response** body, `allowUnexpectedKeys` defaults to `true` (Postel's law), so extra keys are generally tolerated. It would be a mismatch only if the comparison were configured to disallow unexpected keys, as request bodies are. See [Request & Response Matching](10-Request-And-Response-Matching.md).

3. Your team runs Pact JVM 4.6 but a downstream tool only reads V2 pacts. What do you change?

> **Answer.** Pin the consumer test to the older spec with `@PactTestFor(pactVersion = PactSpecVersion.V3)` (or V2 where supported), or upgrade the downstream tool. You cannot reliably hand-convert a V3/V4 file down to V2.

---

## See also

- [Matchers And Matching Rules](09-Matchers-And-Matching-Rules.md)
- [Request And Response Matching](10-Request-And-Response-Matching.md)
- [Provider States](12-Provider-States.md)
- [Generating & Reading the Pact](../03-Hands-On/15-Generating-And-Reading-The-Pact.md)
- [Core Vocabulary](../01-Foundations/06-Core-Vocabulary.md)
