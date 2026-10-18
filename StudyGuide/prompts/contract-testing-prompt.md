# Prompt — Generate the Contract Testing study guide

> This is the reusable generation prompt. It is deliberately tool-agnostic:
> copy it, change the `Focus`/`Stack` lines, and it will produce a comparable
> hands-on guide for any testing topic. The notes in `content/contract-testing/`
> were produced from this prompt.

---

## Role

Act as a **senior test architect and technical instructor** who has run
consumer-driven contract testing (Pact) and Spring Cloud Contract in production
microservice systems. You explain by building intuition first, then showing
exactly how to do it. You are precise about what a contract *does* and does
*not* guarantee.

## Goal

Produce a **complete, self-contained, hands-on study guide** for someone who
wants to learn **contract testing thoroughly** — from "why does this exist?" to
running it in CI and deploying safely. After reading and doing the labs, the
reader must be able to:

1. Explain what a contract is and how it differs from integration/E2E/schema tests.
2. Draw and describe the consumer-driven contract workflow end to end.
3. Write consumer Pact tests that generate a pact file.
4. Verify a provider against pact files, including provider states.
5. Use a Pact Broker / PactFlow and `can-i-deploy` for safe releases.
6. Test asynchronous message contracts.
7. Do the producer/consumer halves of Spring Cloud Contract.
8. Recognise anti-patterns and know when *not* to use contract testing.

## Audience & stack

- **Reader:** a backend engineer who knows Java/Spring Boot and REST basics,
  but is new to contract testing.
- **Primary stack:** Java 21, Spring Boot 3, JUnit 5, Pact JVM (`au.com.dius.pact`),
  Maven, a Pact Broker, GitHub Actions.
- **Secondary:** Pact JS (short illustrative example), Spring Cloud Contract,
  message/event-driven contracts.
- **Do not assume** prior Pact or Kafka knowledge; define every term on first use.

## Running example (use the SAME example everywhere)

Two services so every page builds on the previous one:

- **Provider — `user-service`**: `GET /users/{id}` returns
  `{ "id": 42, "name": "Ada Lovelace", "email": "ada@example.com", "active": true, "createdAt": "2024-01-05T10:00:00Z" }`.
- **Consumer — `order-service`**: calls `user-service` to enrich an order.
- **Async example:** `order-service` publishes an `order-created` event that
  `notification-service` consumes.

Keep class names, field names, URLs and IDs identical across every page.

## Hard requirements

### Structure
- One folder per chapter (`NN-Title/`) and one `.md` file per page
  (`NN-Title.md`). Filenames sort in reading order.
- Every page starts with a single `# H1` title.
- Each page is **self-contained** enough to read alone, but cross-references
  neighbours with relative links (e.g. `[Provider states](../04-Pact/12-Provider-States.md)`).

### Teaching method (per page, in roughly this order)
1. **Hook** — the problem or question this page answers, in one or two lines.
2. **Concept** — intuition first, then the precise definition.
3. **Diagram** — at least one ASCII diagram in a `text` fenced block for every
   conceptual page (sequence, topology, data flow, state, or file anatomy).
4. **Worked example** — the running `user-service` / `order-service` example.
5. **Hands-on** — copy-pasteable commands and complete code, with expected output.
6. **Gotchas / anti-patterns** — the mistakes people actually make.
7. **Recap** — 3–6 bullet "what to remember".
8. **Practice** — 1–3 exercises, collapsed answers labelled "Answer".
9. **See also** — relative links to related pages.

### Diagrams
- Render as **ASCII inside ```` ```text ```` fences** (the app highlights only
  `java` and `sql`; other fences render as plain monospace, which is perfect).
- Use box-drawing characters (`┌ ─ │ └ ├ ►`), align columns, and keep width
  under ~76 characters so it stays readable on a laptop.
- Give every diagram a caption line starting with `**Figure N —**`.
- Prefer **sequence diagrams** for flows, **box/arrow topology** for architecture,
  and **tree** layouts for JSON/contract anatomy.

### Code
- Java code must be **compilable and complete** for the code shown:
  imports, annotations, and method signatures included.
- Show real dependency coordinates (`groupId:artifactId:version` or Maven XML)
  and real CLI commands (`mvn`, `curl`, `docker`, `pact-broker`, `gh`).
- Show the **expected output** after each command as a plain fence.
- Prefer Spring Boot Test + `@SpringBootTest` / MockMvc / RestAssured where it
  makes the provider test realistic; keep consumer tests dependency-light.
- Keep versions current as of the guide's writing (Spring Boot 3.x, Pact JVM 4.x).

### Voice & length
- Direct, concrete, no filler, no "in today's fast-paced world".
- Short paragraphs; tables for comparisons; bold for key terms.
- Depth over breadth on the core (Pact workflow + hands-on); be explicit about
  where other tools differ.
- Never invent a Pact API. If unsure of an exact signature, describe the shape
  and link to the official docs rather than guessing.

### Accuracy guardrails
- Clearly separate **what a contract test proves** (the provider honours the
  consumer's expectations) from what it does **not** prove (business logic,
  end-to-end correctness, performance, security).
- State the difference between **consumer-driven** (Pact) and **producer-driven**
  (OpenAPI/SCC) contract testing, and when each fits.
- Mention that pact verification is **not** a replacement for a small number of
  E2E smoke tests.

## Deliverable

A folder of markdown pages registered as a `markdown-book` topic in
`content.config.json` (slug `contract-testing`), with the outline in
`prompts/contract-testing-outline.md`. Run `npm run sync` and confirm the
manifest builds.
