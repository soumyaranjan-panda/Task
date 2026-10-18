# 09 — Matchers And Matching Rules

A contract that asserts exact literal values is brittle: it breaks the moment the provider returns a different name, a new id, or one extra field. **Matchers** — recorded as **matching rules** in the pact file — let you assert the *shape and type* of an exchange instead of its literal content.

---

## Why Literals Are Brittle

```text
  LITERAL (brittle)                   MATCHER (robust)
  ─────────────────                   ────────────────
  expected: "Ada Lovelace"            expected: type = string
       │                                    │
   must equal exactly                   any string passes
       │                                    │
  provider returns "Ada L."  FAIL      provider returns "Grace"  PASS
  id changes 42 -> 43        FAIL      id changes 42 -> 99      PASS
  provider adds a field      FAIL*     provider adds a field    PASS*
```

**Figure 1 —** The same interaction under literal equality versus a type matcher.

\* For response bodies, unexpected extra keys are tolerated by default (Postel's law). See [Request & Response Matching](10-Request-And-Response-Matching.md).

Rule of thumb: **match everything the consumer does not care about, and use a literal only where the exact value is genuinely part of the contract** (for example, a fixed status code).

---

## The Matcher Vocabulary

Pact defines matchers at the specification level; each language binding exposes convenience methods for them. The wire names below appear in the `matchingRules` JSON.

| Matcher | Purpose | Java DSL (Pact JVM) | Example value |
| ------- | ------- | ------------------- | ------------- |
| `type` (`like`) | any value of the same type | `stringType("name")`, `numberType("n")`, `booleanType("b")` | `"Ada Lovelace"` |
| `type` + integer | any integer | `integerType("id", 42)` | `42` |
| `type` + decimal | any decimal | `decimalType("total", 129.99)` | `129.99` |
| `regex` (`term`) | string matching a regex | `stringMatcher("email", ".*@.*", "ada@example.com")` | `"ada@example.com"` |
| `eachLike` | every array item matches a shape | `eachLike("orders", ...)`, `minArrayLike(...)`, `maxArrayLike(...)` | `[ { ... } ]` |
| `include` | string contains a substring | `includesStr("email", "@example.com", "ada@example.com")` | `"ada@example.com"` |
| `datetime` | formatted timestamp | `datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ss'Z'")` | `"2024-01-05T10:00:00Z"` |
| `date` | formatted date | `date("day", "yyyy-MM-dd")` | `"2024-01-05"` |
| `time` | formatted time | `time("at", "HH:mm:ss")` | `"10:00:00"` |
| `notEmpty` | non-empty string / array / object | DSL matcher helper | `"x"` |
| `fromProviderState` / `valueFromProviderState` | value supplied by the provider at verify time (a *generator*) | `valueFromProviderState("id", "id", 42)` | `42` |
| array `min` / `max` | constrain list length | `minArrayLike("orders", 2, ...)`, `maxArrayLike(...)` | `[ ... ]` |

Two clarifications:

- `like(value)` is the generic type matcher; `like(value, "integer")` narrows it to integers. In Pact JVM the narrowed forms are just `integerType` / `decimalType`.
- `fromProviderState` is not a matcher — it is a **generator** that substitutes a real value (for example a generated id) returned by the provider's state callback at verification time.

---

## The User Example in Java DSL

```java
import au.com.dius.pact.consumer.dsl.PactDslJsonBody;
import java.time.Instant;
import java.util.Date;

PactDslJsonBody body = new PactDslJsonBody()
    .integerType("id", 42)
    .stringType("name", "Ada Lovelace")
    .stringMatcher("email", ".*@.*", "ada@example.com")
    .booleanType("active", true)
    .datetime("createdAt", "yyyy-MM-dd'T'HH:mm:ss'Z'",
              Date.from(Instant.parse("2024-01-05T10:00:00Z")));
```

That produces these expect values (the examples) and matching rules:

```json
{
  "body": {
    "id": 42,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "active": true,
    "createdAt": "2024-01-05T10:00:00Z"
  },
  "matchingRules": {
    "body": {
      "$.id":        { "matchers": [{ "match": "integer" }] },
      "$.name":      { "matchers": [{ "match": "type" }] },
      "$.email":     { "matchers": [{ "match": "regex", "regex": ".*@.*" }] },
      "$.active":    { "matchers": [{ "match": "type" }] },
      "$.createdAt": {
        "matchers": [
          { "match": "datetime", "datetime": "yyyy-MM-dd'T'HH:mm:ss'Z'" }
        ]
      }
    }
  }
}
```

Read it as: "*the value 42 is just an example; at verification any integer here is fine*", and so on.

---

## Arrays: `eachLike` and Size Constraints

```java
new PactDslJsonBody()
    .minArrayLike("orders", 1)
        .stringType("orderId", "ORD-1001")
        .numberType("total", 129.99)
    .closeArray();
```

The matcher applies to the array itself as a `type` matcher with `min: 1`, and each element gets the nested rules:

```json
{
  "$.orders": {
    "matchers": [{ "match": "type", "min": 1 }]
  },
  "$.orders[*].orderId": { "matchers": [{ "match": "type" }] },
  "$.orders[*].total":   { "matchers": [{ "match": "type" }] }
}
```

| DSL call | Array size rule |
| -------- | --------------- |
| `eachLike(name, ...)` | at least one item (`min: 1`) |
| `minArrayLike(name, n, ...)` | at least `n` items |
| `maxArrayLike(name, m, ...)` | at most `m` items |
| `arrayContaining(name, ...)` (V4) | items matched in any order against required variants |

Prefer `minArrayLike(name, 0, ...)` when an empty list is valid; `eachLike` forces at least one item and is a common false-failure source.

---

## Generators: `fromProviderState`

Sometimes a value cannot be known at consumer-test time — for instance a server-generated id. Tap into the provider state callback instead:

```java
new PactDslJsonBody()
    .integerType("id")
    .valueFromProviderState("id", "id", 42);
```

On the path it reads more naturally:

```java
.pathFromProviderState("/users/${id}", "/users/42")
```

The consumer test still runs against the example (`42`); at provider verification the placeholder is replaced with the value returned by the `@State` callback. See [Provider States](12-Provider-States.md).

> Pact JVM also exposes `headerFromProviderState` and `queryParameterFromProviderState`. If a method name differs in your version, check the [Pact JVM consumer docs](https://docs.pact.io/implementation_guides/jvm/consumer) — the wire behaviour is stable even if a helper is renamed.

---

## Gotchas

- **Do not match everything.** Over-matching couples the contract to implementation detail and creates false failures.
- **`regex` is not anchored the way you think.** `".*@.*"` allows a lot; write the tightest pattern the consumer truly needs.
- **`stringType` on a nullable field.** If the provider can return `null`, add an explicit null matcher or model the field as optional.
- **Timestamp formats must match exactly.** `yyyy-MM-dd'T'HH:mm:ss'Z'` will not match an offset like `+00:00`.
- **Generators are not matchers.** `fromProviderState` changes the example value; it does not relax type checking.

---

## Recap

- Matchers let you assert type and shape instead of brittle literals.
- Matching rules are the serialised form of matchers in the pact file.
- `type`/`like` for any-of-type, `regex`/`term` for patterns, `integer`/`decimal` for numbers.
- `eachLike` and `minArrayLike`/`maxArrayLike` govern lists; mind the default `min: 1`.
- `fromProviderState` is a generator that injects provider-supplied values at verification time.

---

## Practice

1. Rewrite `"name": "Ada Lovelace"` so any string passes, in both Java DSL and JSON.

> **Answer.** Java: `.stringType("name", "Ada Lovelace")`. JSON: keep the example value and add `"$.name": { "matchers": [{ "match": "type" }] }` under `matchingRules.body`.

2. The provider now returns `total` as `129.99` but sometimes `130`. Which matcher makes the contract accept both, and which would not?

> **Answer.** `numberType`/`decimalType` (a `type` matcher) accepts both. `numberValue("total", 129.99)` (equality) would fail for `130`.

3. A consumer asserts an empty `orders` list is valid, but verification fails whenever there are zero orders. What did they most likely use, and what should they use?

> **Answer.** They used `eachLike("orders", ...)`, which enforces `min: 1`. Use `minArrayLike("orders", 0, ...)` to allow an empty list.

---

## See also

- [Request And Response Matching](10-Request-And-Response-Matching.md)
- [Anatomy Of A Pact File](08-Anatomy-Of-A-Pact-File.md)
- [Provider States](12-Provider-States.md)
- [Writing Consumer Tests](../03-Hands-On/14-Writing-Consumer-Tests.md)
- [Anti-Patterns & Pitfalls](../06-Operations/28-Anti-Patterns-And-Pitfalls.md)
