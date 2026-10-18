# 13 — Project Setup

---

## What You Will Have by the End of This Page

Two Maven projects that compile and run, plus a **Pact Broker** running locally.
Nothing about contracts yet — this page is the scaffolding so that pages 14–18
can stay focused on the code that matters.

- `order-service` — the **consumer** (calls `user-service`).
- `user-service` — the **provider** (serves `GET /users/{id}`).
- A Pact Broker + PostgreSQL pair via Docker Compose.

```text
┌────────────────┐   GET /users/{id}   ┌────────────────┐
│  order-service │ ──────────────────► │  user-service  │
│  (consumer)    │ ◄────────────────── │  (provider)    │
└────────────────┘   200 / 404 JSON    └────────────────┘
        │                                      │
        │ publishes pact                       │ verifies pact
        ▼                                      ▼
   ┌──────────────────────────────────────────────┐
   │              Pact Broker :9292               │
   └──────────────────────────────────────────────┘
```

**Figure 1 —** The two-service lab and the broker that connects them.

---

## Directory Layout

Create one parent folder, then the two projects and the Compose file inside it.

```text
contract-testing-lab/
├── order-service/                    # consumer
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/example/orderservice/
│       │   ├── OrderServiceApplication.java
│       │   └── client/
│       │       ├── UserClient.java
│       │       ├── UserNotFoundException.java
│       │       └── UserResponse.java
│       └── test/java/com/example/orderservice/client/
│           └── UserClientContractTest.java
├── user-service/                     # provider
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/example/userservice/
│       │   ├── UserServiceApplication.java
│       │   ├── UserController.java
│       │   ├── UserService.java
│       │   └── UserResponse.java
│       └── test/java/com/example/userservice/
│           └── UserProviderContractTest.java
└── docker-compose.yml
```

**Figure 2 —** Layout of the lab. Both projects use package root
`com.example`, Spring Boot 3, and Java 21.

Create the skeleton:

```bash
mkdir -p contract-testing-lab && cd contract-testing-lab
mkdir -p order-service/src/main/java/com/example/orderservice/client
mkdir -p order-service/src/test/java/com/example/orderservice/client
mkdir -p user-service/src/main/java/com/example/userservice
mkdir -p user-service/src/test/java/com/example/userservice
```

---

## Versions Used in This Chapter

| Component        | Version                              | Notes                                        |
| ---------------- | ------------------------------------ | -------------------------------------------- |
| Java             | 21 (LTS)                             | `<java.version>21</java.version>`            |
| Spring Boot      | 3.3.5                                | Parent POM; Spring Framework 6.1             |
| Pact JVM         | 4.6.21                               | Latest 4.6.x; check for a newer 4.6.x patch  |
| JUnit 5          | managed by Spring Boot               | via `spring-boot-starter-test`               |
| Maven            | 3.9.x                                | `mvn -version`                               |
| Pact Broker      | `pactfoundation/pact-broker:latest`  | Pin a digest/tag in real deployments         |
| PostgreSQL       | 16                                   | Broker backing database                      |


> **Version tip.** Pact JVM publishes frequent patch releases. The version
> `4.6.21` is correct at the time of writing; run
> `mvn versions:display-dependency-updates` or check
> `https://repo1.maven.org/maven2/au/com/dius/pact/consumer/junit5/` for the
> newest `4.6.x`. Do not assume a `4.7.x` badge is a drop-in without reading its
> release notes.

---

## Consumer `pom.xml` (Full)

`order-service/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>order-service</artifactId>
    <version>1.0.0</version>
    <name>order-service</name>
    <description>Consumer in the contract-testing lab</description>

    <properties>
        <java.version>21</java.version>
        <pact.version>4.6.21</pact.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Pact consumer DSL + JUnit 5 extension + mock server -->
        <dependency>
            <groupId>au.com.dius.pact.consumer</groupId>
            <artifactId>junit5</artifactId>
            <version>${pact.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

`au.com.dius.pact.consumer:junit5` transitively brings in the consumer
**core** module, which contains `PactDslJsonBody`, `MockServer` and the
`PactConsumerTestExt` extension. You do not need to declare those artifacts
yourself.

The publishing plugin (`au.com.dius.pact.provider:maven`) is added in
[Publishing & Webhooks](17-Publishing-And-Webhooks.md) — keep this POM minimal
until then.

---

## Provider `pom.xml` (Full)

`user-service/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>user-service</artifactId>
    <version>1.0.0</version>
    <name>user-service</name>
    <description>Provider in the contract-testing lab</description>

    <properties>
        <java.version>21</java.version>
        <pact.version>4.6.21</pact.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Base JUnit 5 provider extension: @Provider, @PactFolder, @PactBroker, @State -->
        <dependency>
            <groupId>au.com.dius.pact.provider</groupId>
            <artifactId>junit5</artifactId>
            <version>${pact.version}</version>
            <scope>test</scope>
        </dependency>

        <!-- Spring 6 / Spring Boot 3 integration for the JUnit 5 provider extension -->
        <dependency>
            <groupId>au.com.dius.pact.provider</groupId>
            <artifactId>spring6</artifactId>
            <version>${pact.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>

            <!--
              The Pact provider extension loads the pact and the Spring context
              from different class loaders. Surefire must use an isolated
              classpath for @State methods to see injected Spring beans.
            -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <configuration>
                    <useSystemClassLoader>false</useSystemClassLoader>
                    <systemPropertyVariables>
                        <pact.verifier.publishResults>false</pact.verifier.publishResults>
                    </systemPropertyVariables>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

> **Why `spring6`, not `spring`?** Pact JVM ships two Spring integration
> artifacts: `au.com.dius.pact.provider:spring` targets Spring Framework 5,
> and `au.com.dius.pact.provider:spring6` targets Spring Framework 6 /
> Spring Boot 3. This lab is Spring Boot 3, so use `spring6`
> (class `au.com.dius.pact.provider.spring.spring6.PactVerificationSpring6Provider`).
> The `spring` coordinates also exist at 4.6.x, but they pull in the older
> Spring 5 line.

---

## Run the Pact Broker Locally

The OSS **Pact Broker** stores contracts and verification results. It needs a
PostgreSQL database.

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
      POSTGRES_DB: pact
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pact"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - pact_pgdata:/var/lib/postgresql/data

  pact-broker:
    image: pactfoundation/pact-broker:latest
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_ADAPTER: postgres
      PACT_BROKER_DATABASE_USERNAME: pact
      PACT_BROKER_DATABASE_PASSWORD: pact
      PACT_BROKER_DATABASE_HOST: postgres
      PACT_BROKER_DATABASE_NAME: pact
      PACT_BROKER_PORT: "9292"
      PACT_BROKER_BASE_URL: http://localhost:9292
      PACT_BROKER_ALLOW_PUBLIC_READ: "true"

volumes:
  pact_pgdata:
```

Start it and confirm the heartbeat:

```bash
docker compose up -d
docker compose ps
```

```text
NAME                    IMAGE                              STATUS
contract-testing-lab-postgres-1       postgres:16          Up (healthy)
contract-testing-lab-pact-broker-1    pactfoundation/...   Up
```

```bash
curl -s http://localhost:9292/diagnostic/status/heartbeat
```

```text
OK
```

```bash
curl -s http://localhost:9292 | head -1
```

```text
<!DOCTYPE html>
```

The broker UI is now at `http://localhost:9292`.

> **Auth.** This local broker allows anonymous read and write, which is fine
> for a laptop. In CI use the image's basic-auth variables
> (`PACT_BROKER_BASIC_AUTH_USERNAME` / `..._PASSWORD`) and pass credentials to
> `pact-broker`/Maven.

---

## Smoke-Test Both Applications

### Provider

Run `user-service`:

```bash
mvn -q spring-boot:run
```

In another terminal, call the endpoint:

```bash
curl -s http://localhost:8080/users/42
```

```json
{"id":42,"name":"Ada Lovelace","email":"ada@example.com","active":true,"createdAt":"2024-01-05T10:00:00Z"}
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/users/999
```

```text
404
```

The provider code that makes this work is written in full in
[Provider Verification](16-Provider-Verification.md). For now, confirm that
`mvn -q -DskipTests package` succeeds for both projects:

```bash
cd order-service && mvn -q -DskipTests package && cd ..
cd user-service && mvn -q -DskipTests package && cd ..
```

```text
[INFO] BUILD SUCCESS
```

---

## Practice

1. **Change the port.** Stop the broker, remap it to `9393`, update
   `PACT_BROKER_BASE_URL` and the Compose port mapping, and confirm the
   heartbeat responds on the new port. Remember every later page assumes
   `9292`.
2. **Pin the images.** Replace `postgres:16` and
   `pactfoundation/pact-broker:latest` with immutable digests. Why does a lab
   that you want to be reproducible prefer digests over `latest`?

<details>
<summary>Answer</summary>

`latest` can change underneath you, so two runs on different days can verify
against different broker versions. A digest (`image@sha256:...`) is immutable;
the same Compose file always starts the same image. CI reproducibility is the
same reason you pin Maven dependency versions.

</details>

---

## See also

- [The Pact Broker & PactFlow](../02-Pact-Workflow/11-The-Pact-Broker-And-PactFlow.md)
- [Writing Consumer Tests](14-Writing-Consumer-Tests.md)
- [Generating & Reading the Pact](15-Generating-And-Reading-The-Pact.md)

## Recap

- The lab has two Maven projects (`order-service`, `user-service`) plus a
  Docker Compose pair for PostgreSQL and the Pact Broker.
- Consumers depend on `au.com.dius.pact.consumer:junit5`; providers depend on
  `au.com.dius.pact.provider:junit5` **and** `au.com.dius.pact.provider:spring6`.
- Spring Boot 3 needs the `spring6` provider artifact, not the older `spring`.
- The Pact provider extension needs Surefire's
  `<useSystemClassLoader>false</useSystemClassLoader>`.
- The broker exposes a heartbeat at `/diagnostic/status/heartbeat` and a UI at
  `http://localhost:9292`.
- Pin real versions; treat `latest` and `4.6.x` as "check before you ship".
