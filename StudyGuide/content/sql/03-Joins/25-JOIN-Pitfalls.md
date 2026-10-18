# 25 — JOIN: Common Pitfalls

> Category: 3-Joins
> Cross-references: [15-INNER-JOIN], [16-LEFT-JOIN], [18-CROSS-JOIN], [20-JOIN-ON-vs-WHERE], [21-JOIN-Duplicates-and-Fanout], [22-Many-to-Many-Joins], [23-Anti-Joins], [24-Semi-Joins], [09-NULL-Deep-Dive], [14-NOT-IN-NULL-Pitfalls]

## Table of Contents

- [What this section is](#what-this-section-is)
- [Sample tables (grain check)](#sample-tableThe first write got corrupted with stray text. I'll rewrite the file cleanly in controlled chunks, verifying each.
  The placeholder write from before had stray text; I've now overwritten cleanly with the real chunk. Let me verify and continue.
  The heredoc input keeps glitching by splicing stray task-commentary into the content. I'll surgically remove the junk fragments, then continue with shorter, tightly-controlled chunks.
  n type](#pitfall-group-d--wrong-join-type)
- [Pitfall Group E — Aggregation + JOIN mistakes](#pitfall-group-e--aggregation--join-mistakes)
- [Pitfall Group F — Accidental Cartesian products](#pitfall-group-f--accidental-cartesian-products)
- [Pitfall Group G — SARGability and join-column traps](#pitfall-group-g--sargability-and-join-column-traps)
- [Pitfall Group H — Grain and modeling traps](#pitfall-group-h--grain-and-modeling-traps)
- [Scenarios: full walkthroughs](#scenarios-full-walkthroughs)
- [Edge cases](#edge-cases)
- [NULL behavior summary](#null-behavior-summary)
- [Comparison tables](#comparison-tables)
- [Common mistakes](#common-mistakes)
- [Production pitfalls](#production-pitfalls)
- [Best practices](#best-practices)
- [Mermaid: the failure-and-diagnosis flow](#mermaid-the-failure-and-diagnosis-flow)
- [Interview Questions](#interview-questions)

---

## What this section is

Every other section in this category teaches you **how to write a join correctly**.
This one teaches you **how joins break** — the recurring, expensive, silent bugs that
show up in production dashboards and interview questions again and again.

A JOIN is the single most common source of **wrong answers that return successfully**.
Not syntax errors, not crashes: queries that _run_, return rows, and are subtly —
sometimes wildly — wrong. The database will not warn you. A fan-out produces no error.
A doubled `SUM` produces no error. A `LEFT JOIN` that quietly turned into an
`INNER JOIN` produces no error. Only humans catch it.

> **The central idea of this section:** almost every JOIN bug is a mismatch between
> **what one output row should mean** and **what the query actually produces**.
> If you can state the output grain before writing a single keyword, you will avoid
> most of these pitfalls. If you cannot state it, you are already standing in one.

Each pitfall follows the same shape:
**symptom → BAD approach → why it is wrong → BETTER approach → verification**.

---

## Sample tables (grain check)

State the grain first — always. These tables drive every example in this section.

- **users** — _one row per user._
- **orders** — _one row per order_ (a user can have many orders).
- **order_items** — _one row per line item_ (an order can have many items).
- **payments** — _one row per payment_ (an order can have many payments).

```sql
CREATE TABLE users (
    user_id   INT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL
);

CREATE TABLE orders (
    order_id   INT PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id),
    order_date DATE NOT NULL,
    total      NUMERIC(10,2) NOT NULL
);

CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(order_id),
    product_id INT NOT NULL,
    qty        INT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE payments (
    payment_id INT PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(order_id),
    amount     NUMERIC(10,2) NOT NULL,
    paid_at    DATE NOT NULL
);
```

Sample data:

```sql
INSERT INTO users (user_id, user_name) VALUES
(1, 'Ana'), (2, 'Ben'), (3, 'Cid'), (4, 'Deb');   -- Deb has NO orders

INSERT INTO orders (order_id, user_id, order_date, total) VALUES
(101, 1, '2024-01-05', 40.00),
(102, 1, '2024-02-10', 30.00),
(103, 2, '2024-01-20', 24.00);

INSERT INTO order_items (item_id, order_id, product_id, qty, unit_price) VALUES
(5001, 101, 7, 2, 10.00),
(5002, 101, 9, 1, 20.00),
(5003, 102, 7, 1, 10.00),
(5004, 103, 5, 3,  8.00);

INSERT INTO payments (payment_id, order_id, amount) VALUES
(9001, 101, 25.00),
(9002, 101, 15.00),   -- order 101 has TWO payments
(9003, 102, 30.00),
(9004, 103, 24.00);
```

| Table         | Grain               | Fan-out risk example     |
| ------------- | ------------------- | ------------------------ |
| `users`       | 1 row = 1 user      | — (driving side, unique) |
| `orders`      | 1 row = 1 order     | Ana has 2 orders         |
| `order_items` | 1 row = 1 line item | order 101 has 2 items    |
| `payments`    | 1 row = 1 payment   | order 101 has 2 payments |

**Relationship summary:** `users → orders → order_items` is 1 : N at each hop, and
`orders → payments` is 1 : N as well. Joining across **two** 1:N legs at once
multiplies — that is where the worst bugs live.

---

## The master checklist: 15 questions to run before every JOIN

Run this **before** writing the query, not after the numbers look wrong.

1. **What does one output row represent?** State the output grain in a sentence.
2. **What is the grain of each input table?** One row per what?
3. **Which table is the driving table** — the table that decides which rows may appear?
4. **Do I need columns from the other table, or only a yes/no existence answer?** (See [24-Semi-Joins] / [23-Anti-Joins])
5. **Can the JOIN create duplicates?** If either join key is non-unique, expect fan-out.
6. **Do I need aggregation?** Over which grain — the driving table or the joined table?
7. **Do I need to preserve individual rows, or collapse them?** Window functions vs `GROUP BY`.
8. **Can NULL affect the match?** NULL never equals NULL in an equality join.
9. **Should a condition go in `ON` or in `WHERE`?** For `LEFT JOIN`, it changes the result.
10. **Could this accidentally be a Cartesian product?** Is every join predicate present and sensible?
11. **What happens with zero matching rows?** Inner join drops them; left join keeps them NULL-padded.
12. **What happens with multiple matching rows?** Fan-out by the count of matches.
13. **Is an anti-join form safe with NULLs?** `NOT IN` vs `NOT EXISTS` (see [23-Anti-Joins]).
14. **Which indexes make this cheap?** Join key on the lookup side; indexes on `WHERE` filters.
15. **What does the execution plan say?** `EXPLAIN ANALYZE` / actual plan — never assume.
