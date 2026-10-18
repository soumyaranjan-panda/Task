# 24 — SCC Producer Side

This is the provider half of Spring Cloud Contract: configure the Maven plugin, write the contract for `user-service`, run the build, and inspect the generated verification test and stubs artifact.

## The Build Pipeline

Every step below is produced automatically from one file:

```text
 src/test/resources/contracts/shouldReturnUser.groovy
        │
        ▼
 [generateTests]  ─────► target/generated-test-sources/contracts/
        │                    .../ShouldReturnUserTest.java
        ▼
 [test]           ─────► runs generated test against the real controller
        │                    (fails if provider violates the contract)
        ▼
 [generateStubs]  ─────► target/stubs/.../shouldReturnUser.json
        │
        ▼
 [generateStubsJar + install] ──► user-service-1.0.0-stubs.jar
                                    in ~/.m2 and the remote repo
```

**Figure 1 —** Contract in, provider test and stubs jar out.

## Full Maven Setup

`pom.xml` for `user-service`:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>user-service</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>21</java.version>
        <spring-cloud.version>2023.0.1</spring-cloud.version>
        <spring-cloud-contract.version>4.1.4</spring-cloud-contract.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-contract-verifier</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-contract-maven-plugin</artifactId>
                <version>${spring-cloud-contract.version}</version>
                <extensions>true</extensions>
                <configuration>
                    <baseClassForTests>
                        com.example.userservice.BaseTestClass
                    </baseClassForTests>
                    <basePackageForTests>
                        com.example.userservice.contracts
                    </basePackageForTests>
                    <testFramework>JUNIT5</testFramework>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

`<extensions>true</extensions>` wires the plugin into the `test` and `install` lifecycles. `baseClassForTests` is the class every generated test extends. `basePackageForTests` sets the package of the generated test sources.

## Contract Location

By default the plugin reads contracts from `src/test/resources/contracts/`. Subfolders are allowed and become part of the generated test package.

```text
user-service/
├── pom.xml
└── src/
    ├── main/java/com/example/userservice/
    │   ├── UserController.java
    │   └── UserServiceApplication.java
    └── test/
        ├── java/com/example/userservice/BaseTestClass.java
        └── resources/contracts/
            └── shouldReturnUser.groovy
```

**Figure 2 —** Contracts sit under `src/test/resources/contracts/`.

## A Complete Groovy Contract

`src/test/resources/contracts/shouldReturnUser.groovy`:

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return user 42"
    name "shouldReturnUser"
    request {
        method GET()
        url "/users/42"
    }
    response {
        status OK()
        headers {
            contentType applicationJson()
        }
        body(
            id: $(anyPositiveInt()),
            name: $(regex('[A-Za-z ]+')),
            email: $(regex('[a-z]+@example\\.com')),
            active: $(anyBoolean()),
            createdAt: $(regex('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z'))
        )
    }
}
```

And `src/test/resources/contracts/shouldReturnNotFound.groovy`:

```groovy
import org.springframework.cloud.contract.spec.Contract

Contract.make {
    description "should return 404 when user does not exist"
    name "shouldReturnNotFound"
    request {
        method GET()
        url "/users/999"
    }
    response {
        status NOT_FOUND()
        headers {
            contentType applicationJson()
        }
        body(
            error: "user not found"
        )
    }
}
```

Matcher reference for the fields above:

| DSL expression | Meaning | Stub example |
| --- | --- | --- |
| `anyPositiveInt()` | any integer > 0 | `42` |
| `regex('[A-Za-z ]+')` | matches the regex | `Ada Lovelace` |
| `anyBoolean()` | any boolean | `true` |
| `anyDouble()` | any decimal number | `19.99` |
| `anyNonEmptyString()` | any non-empty string | `x` |

## The Base Test Class

`src/test/java/com/example/userservice/BaseTestClass.java`:

```java
package com.example.userservice;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class BaseTestClass {

    @Autowired
    protected MockMvc mockMvc;
}
```

## Running the Build

```bash
mvn clean install
```

Representative output:

```text
[INFO] --- spring-cloud-contract-maven-plugin:4.1.4:generateTests ---
[INFO] Generating server tests using JUnit 5
[INFO] Test to be generated [ShouldReturnNotFoundTest]
[INFO] Test to be generated [ShouldReturnUserTest]
[INFO] --- spring-cloud-contract-maven-plugin:4.1.4:generateStubs ---
[INFO] Stubs to be generated [shouldReturnUser.json]
[INFO] Stubs to be generated [shouldReturnNotFound.json]
[INFO] --- maven-surefire-plugin:3.2.5:test ---
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0
[INFO] --- spring-cloud-contract-maven-plugin:4.1.4:generateStubsJar ---
[INFO] Installing .../user-service/1.0.0/user-service-1.0.0-stubs.jar
[INFO] BUILD SUCCESS
```

If a generated test fails, the provider no longer honours a contract. Fix the controller or, if the change is intentional, update the contract.

## The Generated Test

Generated at:

```text
target/generated-test-sources/contracts/
  com/example/userservice/contracts/ShouldReturnUserTest.java
```

It extends `BaseTestClass`, performs `GET /users/42` against `MockMvc`, and asserts the status, `Content-Type`, and body fields using the contract's matchers:

```java
package com.example.userservice.contracts;

import com.example.userservice.BaseTestClass;
import org.junit.jupiter.api.Test;

public class ShouldReturnUserTest extends BaseTestClass {

    @Test
    public void validate_shouldReturnUser() throws Exception {
        // generated: perform GET /users/42 via MockMvc, assert 200,
        // Content-Type application/json, and body fields via matchers.
    }
}
```

Do not edit generated sources — they are regenerated on every build.

## The Generated Stubs

`target/stubs/.../shouldReturnUser.json` is a WireMock mapping:

```json
{
  "request": {
    "method": "GET",
    "url": "/users/42"
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
    }
  }
}
```

The mappings are packaged into `user-service-1.0.0-stubs.jar` (classifier `stubs`) and installed to `~/.m2/repository/com/example/user-service/1.0.0/`. Publishing that jar to Nexus or Artifactory is what makes the stubs available to `order-service`.

## Why `@AutoConfigureMockMvc`

`@AutoConfigureMockMvc` configures a `MockMvc` instance from the full application context — controllers, Jackson converters, `@ControllerAdvice`, and filters — without binding a network port. Generated tests therefore exercise the same request pipeline as production while staying fast and deterministic.

## Gotchas

- **Duplicate `name` values** make generated tests fail to compile and stubs overwrite each other. Keep names unique.
- **Contract and controller drift**: a stale provider test that no one runs is worthless. Run `mvn verify` in CI.
- **Mocking the controller in the base class** defeats the purpose — the generated test must hit the real controller.
- **Exact values without matchers** make the contract brittle to harmless data changes.

## Practice

1. Change `id` from `$(anyPositiveInt())` to `42` and rebuild. Which side of the contract changes: the stub example, the verification, or both?
2. Add a `GET /users/42` contract whose response header `X-Request-Id` is a UUID, using a regex matcher.

**Answer 1.** The stub example is unchanged (`42`), but verification now requires exactly `42`, which is stricter — this is brittleness.
**Answer 2.** Add `header('X-Request-Id', $(regex('[0-9a-f-]{36}')))` inside the response `headers { }` block.

## See also

- [23 — SCC Concepts](23-SCC-Concepts.md)
- [25 — SCC Consumer Side](25-SCC-Consumer-Side.md)
- [26 — SCC vs Pact](26-SCC-vs-Pact.md)
- [Provider Verification (Pact)](../03-Hands-On/16-Provider-Verification.md)
- [Matchers and Matching Rules](../02-Pact-Workflow/09-Matchers-And-Matching-Rules.md)

## Recap

- Add `spring-cloud-starter-contract-verifier` and the `spring-cloud-contract-maven-plugin` with `<extensions>true</extensions>`.
- Contracts go in `src/test/resources/contracts/`; Groovy or YAML both work.
- `baseClassForTests` + `@SpringBootTest @AutoConfigureMockMvc` boot the real HTTP stack.
- `mvn clean install` generates tests in `target/generated-test-sources/` and stubs in a `-stubs.jar`.
- Matchers relax verification; literals become stub examples.
- Treat generated sources as build output — never hand-edit them.
