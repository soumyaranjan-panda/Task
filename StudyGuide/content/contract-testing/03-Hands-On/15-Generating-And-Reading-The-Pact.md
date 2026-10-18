# 15 — Generating And Reading The Pact

---

## One Command Produces the Artifact

The contract is not written by hand. It is the artifact a passing consumer test
leaves behind.

```bash
cd order-service
mvn test
```

```text
[INFO] Running com.example.orderservice.client.UserClientContractTest
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

The interesting file is not in the console — it is on disk.

---

## Where the Pact File Lands

By default, Pact JVM writes consumer pacts to
`target/pacts/<consumer>-<provider>.json`.

```text
order-service/
├── pom.xml
├── src/
│   └── test/java/.../client/UserClientContractTest.java
└── target/
    ├── classes/
    ├── test-classes/
    ├── surefire-reports/
    └── pacts/
        └── order-service-user-service.json   ◄── the contract
```

**Figure 1 —** The generated pact file lives beside the build output, not in
`src/`.

The filename is derived from the names passed to `@PactTestFor` /
`@Pact`. That is exactly why mismatched names produce oddly named files — see
Troubleshooting.

```bash
ls -l target/pacts
```

```text
-rw-r--r-- 1 user user 1742 Oct 17 12:30 order-service-user-service.json
```

### Move it elsewhere (optional)

Override the output directory with the `pact.rootDir` system property. On Maven
this must reach the **test** JVM, so set it in Surefire or on the test command:

```bash
mvn test -Dpact.rootDir=target/contracts
```

```text
target/
└── contracts/
    └── order-service-user-service.json
```

> **Gradle users:** the default is `build/pacts`, not `target/pacts`. The
> directory name follows the build tool. Everything else is identical.

---

## The Generated File, Annotated

Open `target/pacts/order-service-user-service.json`. Yours will match this
shape (specification v3):

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
      "description": "a request for an existing user",
      "providerStates": [
        { "name": "user 42 exists" }
      ],
      "request": {
        "method": "GET",
        "path": "/users/42"
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
          "body": {
            "$.id": {
              "combine": "AND",
              "matchers": [{ "match": "integer" }]
            },
            "$.name": {
              "combine": "AND",
              "matchers": [{ "match": "type" }]
            },
            "$.email": {
              "combine": "AND",
              "matchers": [
                { "match": "regex", "regex": "\\S+@\\S+\\.\\S+" }
              ]
            },
            "$.active": {
              "combine": "AND",
              "matchers": [{ "match": "type" }]
            },
            "$.createdAt": {
              "combine": "AND",
              "matchers": [
                {
                  "match": "datetime",
                  "format": "yyyy-MM-dd'T'HH:mm:ss'Z'"
                }
              ]
            }
          }
        }
      }
    },
    {
      "description": "a request for a missing user",
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
            "$.error": {
              "combine": "AND",
              "matchers": [{ "match": "type" }]
            }
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
      "version": "4.6.21"
    }
  }
}
```

### Reading it top to bottom

```text
pact
├── consumer.name ................. who wrote the expectations
├── provider.name ................. who must satisfy them
├── interactions[] ................ one per @Pact method
│   ├── description ............... from uponReceiving(...)
│   ├── providerStates[] .......... from .given(...)
│   ├── request ................... method + path (+ headers/query/body)
│   └── response
│       ├── status ................ exact (statuses are never "matched")
│       ├── headers ............... exact string match
│       ├── body .................. example values
│       └── matchingRules.body .... rules the verifier applies
└── metadata
    ├── pactSpecification.version . v3 here
    └── pact-jvm.version ......... the library that wrote it
```

**Figure 2 —** Anatomy of the generated pact. The `body` holds **examples**;
`matchingRules` holds **what actually constrains the provider**.

The single most important detail: the provider is *not* checked against
`"Ada Lovelace"` or `42`. It is checked against the matchers —
`type`, `integer`, `regex`, `datetime`. The example values only show the shape
and let the consumer test run.

---

## Inspecting the File with `jq`

Pretty-print or slice it at the terminal:

```bash
jq '.interactions[] | {description, providerStates, path: .request.path}' \
  target/pacts/order-service-user-service.json
```

```json
{
  "description": "a request for an existing user",
  "providerStates": [{ "name": "user 42 exists" }],
  "path": "/users/42"
}
{
  "description": "a request for a missing user",
  "providerStates": [{ "name": "user 999 does not exist" }],
  "path": "/users/999"
}
```

```bash
jq -r '.interactions[].response.matchingRules.body | keys[]' \
  target/pacts/order-service-user-service.json
```

```text
$.id
$.name
$.email
$.active
$.createdAt
```

---

## Opening It in the Broker UI

A pact file on a laptop is useful; a pact file in the broker is the source of
truth. Once you publish it (page 17), the broker shows:

- **Home** — the latest pact and its verification status for each
  consumer/provider pair.
- **The pact page** — every interaction with its description and provider
  states, plus a link to each published version.
- **The Matrix** — which consumer version was verified against which provider
  version, and whether it passed.

For now, note the path you will publish:

```text
order-service/target/pacts/order-service-user-service.json
```

---

## Troubleshooting

### 1. The pact file was not generated at all

Symptom: `mvn test` passes but `target/pacts/` is empty or missing.

Causes and fixes, in order of likelihood:

| Cause                                         | Fix                                                              |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Test class never ran (name/filter)            | Ensure it matches Surefire's pattern (`*Test`, `*Tests`, `Test*`) |
| Missing `@ExtendWith(PactConsumerTestExt.class)` | Add it; without it nothing writes a pact                       |
| Test failed before completion                 | Fix the assertion; pacts are written on class completion          |
| Custom `pact.rootDir` already set             | Look where that property points: `mvn help:evaluate -Dexpression=pact.rootDir` |
| Running a stale class                         | `mvn clean test`                                                  |

Confirm the extension is present:

```bash
grep -n "PactConsumerTestExt" \
  src/test/java/com/example/orderservice/client/UserClientContractTest.java
```

```text
24:@ExtendWith(PactConsumerTestExt.class)
```

### 2. The file lands in the wrong place (`build/` vs `target/`)

- **Maven** writes to `target/pacts`.
- **Gradle** writes to `build/pacts`.

If you copied a Gradle-oriented snippet into a Maven project (or vice versa),
your expected path is wrong. Always check the build tool before chasing a
"missing" file. If a `pact.rootDir` property is set anywhere — POM, CI env,
command line — that overrides the default for both.

### 3. `@PactTestFor(providerName = ...)` does not match the `@Pact` provider

Symptom: the file is named `order-service-user-service.json` but a test
generates `order-service-unknown-provider.json`, or the mock server 404s
unexpectedly.

The **provider name must be identical** in three places:

```text
@PactTestFor(providerName = "user-service")     // class / test
@Pact(provider = "user-service", ...)           // pact factory method
the @Provider("user-service") on the provider   // page 16
```

A typo in any one of them produces a differently named pact the provider will
never load. Grep for the literal string and compare:

```bash
grep -rn "user-service" src/test order-service/pom.xml
```

---

## Practice

1. **Read a specific matcher.** Print only the `createdAt` matcher and explain
   in one sentence what the provider must return for it to pass.
2. **Predict the filename.** If the consumer were `checkout-api` and the
   provider `accounts`, what would the generated pact file be called, where
   would it live (Maven), and what provider name would the provider test need?

<details>
<summary>Answer</summary>

1. `jq '.interactions[0].response.matchingRules.body."$.createdAt"' ...` prints
   `{"combine":"AND","matchers":[{"match":"datetime","format":"yyyy-MM-dd'T'HH:mm:ss'Z'"}]}`.
   The provider must return a string parseable as a datetime in that exact
   format.
2. Filename `checkout-api-accounts.json`, at `target/pacts/` for Maven (or
   `build/pacts/` for Gradle), and the provider test must be
   `@Provider("accounts")`.

</details>

---

## See also

- [Writing Consumer Tests](14-Writing-Consumer-Tests.md)
- [Anatomy of a Pact File](../02-Pact-Workflow/08-Anatomy-Of-A-Pact-File.md)
- [Provider Verification](16-Provider-Verification.md)
- [Publishing & Webhooks](17-Publishing-And-Webhooks.md)

## Recap

- `mvn test` writes `target/pacts/order-service-user-service.json`; Gradle uses
  `build/pacts`.
- `pact.rootDir` overrides the location and must be set on the **test** JVM.
- The pact body carries **examples**; `matchingRules` carries the constraints
  the provider is actually verified against.
- Status codes and headers are matched exactly; body fields are matched by the
  rules you chose.
- The filename is `<consumer>-<provider>.json`, so the provider name must be
  spelled identically everywhere.
- Use `jq` to inspect interactions and matchers without scrolling the JSON.
