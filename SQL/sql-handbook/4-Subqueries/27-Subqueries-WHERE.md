# Subqueries in WHERE

**Section 27 · Category 4: Subqueries**

---

## Fundamentals

A **subquery in tWrote `sql-handbook/4-Subqueries/27-Subqueries-WHERE.md` (900 lines). It covers:

- **Fundamentals** — WHERE filtering semantics (keep only `TRUE`), the four shapes (IN, EXISTS, ANY/ALL, scalar)
- **Why it exists** — avoid fan-out and unwanted columns
- **Syntax** — all four forms with expansion tables
- **Sample data** — grain-stated `customers`, `orders`, `order_items`, `products`, `departments`, `employees` with a deliberately NULL-poisoning row
- **Examples 1–11** — non-correlated IN/NOT IN (incl. the NULL-poison returning zero rows), correlated EXISTS/NOT EXISTS, `> ALL`, `> ANY`, all-NULL set, and vacuous empty-set
- **Internal working** — semi-join/anti-join/materialization plan nodes per engine
- **SQL reasoning checklist** applied to WHERE subqueries
- **Comparison tables** — IN vs EXISTS, NOT IN vs NOT EXISTS, ANY/ALL semantics, edge-case truth table
- **NULL behavior** — NOT IN + NULL, empty-set truth, row-constructor traps
- **Common mistakes, production pitfalls, performance** (EXPLAIN-based, no absolute claims), **best practices, database differences**
- **35 practice interview questions** across Beginner → Performance, answers withheld
ues** |
| Scalar comparison | `=`, `<>`, `<`, `>`, `<=`, `>=` | "How does this column compare to *that single value*?" | Exactly **one row, one column** (see [Scalar Subqueries](26-Scalar-Subqueries.md)) |

The first three are used *only* in predicate positions (like `WHERE`). The fourth is an expression usable anywhere, including `WHERE`.

**Internal working at a glance:** the optimizer usually compiles

- `IN` into a **semi-join** (keep outer rows that match at least one inner row) or a one-time materialized set;
- `NOT IN` into an **anti-join** (keep outer rows that match nothing) — *only when it can prove NULLs are absent*;
- `EXISTS` into a **semi-join** with early-exit semantics;
- a correlated subquery into a per-row lookup (or a parameterized nested loop).

The relational algebra behind these — semi-join and anti-join — is covered in depth in the [Semi-Joins](23-Semi-Joins.md)/[Anti-Joins](../../3-Joins/23-Anti-Joins.md) sections. Read those alongside this one; this section focuses on the **subquery syntax and reasoning** while those focus on the **operators in the execution plan**.

---

## Why It Exists

You frequently need to filter a table based on data that lives in *another* table, without actually joining them:

- "Show customers who have placed **at least one** order."
- "Show customers who have placed **no** orders."
- "Show employees paid **more than every** Sales employee."
- "Show orders **larger than the company average**."
- "Show products that were **never** ordered."

There are two classic reasons to reach for a `WHERE` subquery instead of a `JOIN`:

1. **You want no output columns from the other table.** If the `SELECT` list only needs columns from `customers`, a `JOIN` with `orders` would force you to `DISTINCT` to undo row-multiplication (fan-out). A `WHERE` subquery answers the membership/existence question with **no duplication and no unwanted columns**.
2. **The comparison is against a computed value, not a stored column** (`company average`, `max` across a filtered set).

Before `IN`/`EXISTS` existed, "customers with at least one order" required either a self-referential `WHERE` with `EXISTS`-like logic or joining then deduplicating.

---

## Syntax

### 1. `IN` — value is a member of the returned set

```sql
WHERE expression IN (subquery)

-- e.g.
WHERE c.customer_id IN (SELECT o.customer_id FROM orders o WHERE o.status = 'shipped')
```

Semantics — for each outer row, replace `expression IN (...)` with:

```
expression = v1 OR expression = v2 OR expression = v3 ...
```

- One `TRUE` among the comparisons → the row is kept.
- No match at all → `FALSE` → filtered out.
- `expression` is `NULL`, **or** the subquery set contains `NULL` and nothing matches → `UNKNOWN` → filtered out (see NULL behavior below).

### 2. `NOT IN` — value is not a member of the returned set

```sql
WHERE expression NOT IN (subquery)
```

Semantically expands to:

```
expression <> v1 AND expression <> v2 AND expression <> v3 ...
```

**This is the most dangerous operator in the entire language when NULLs are involved.** One NULL anywhere in the returned set, or a NULL outer value, converts the whole chain to `UNKNOWN` and silently discards every row. See Section [NOT IN + NULL Pitfalls](../2-NULL-and-Logic/14-NOT-IN-NULL-Pitfalls.md) and the NULL behavior section here.

### 3. `EXISTS` / `NOT EXISTS` — does any row match?

```sql
WHERE EXISTS (subquery)        -- usually correlated
WHERE NOT EXISTS (subquery)
```

The subquery's `SELECT` list is irrelevant — convention is `SELECT 1` (or `SELECT *` on Oracle). Only the **row count** matters: `EXISTS` is `TRUE` the moment the subquery produces one row; `NOT EXISTS` is `TRUE` only if the subquery produces zero rows.

```sql
-- Keep employees who have at least one subordinate
SELECT e1.emp_name
FROM employees e1
WHERE EXISTS (
  SELECT 1
  FROM employees e2
  WHERE e2.manager_id = e1.emp_id
);
```

`EXISTS` returns `TRUE` or `FALSE` — it **never** returns `UNKNOWN**. This is the key difference that makes `NOT EXISTS` NULL-safe where `NOT IN` is not.

### 4. `ANY` / `SOME` / `ALL` — quantified comparison

```sql
WHERE expression > ANY (subquery)    -- SOME is a synonym for ANY
WHERE expression > ALL (subquery)
WHERE expression =  ANY (subquery)   -- same as IN
WHERE expression <> ALL (subquery)   -- same as NOT IN
```

| Form | Meaning | Equivalent to |
|------|---------|---------------|
| `=  ANY (Q)` | equal to at least one returned value | `IN (Q)` |
| `<> ANY (Q)` | not equal to at least one returned value | **nothing simple** — can be TRUE even when a value is in the set |
| `<> ALL (Q)` | not equal to every returned value | `NOT IN (Q)` |
| `>  ANY (Q)` | greater than the **smallest** returned value | `> MIN(Q)` |
| `>  ALL (Q)` | greater than the **largest** returned value | `> MAX(Q)` |
| `<  ANY (Q)` | less than the **largest** returned value | `< MAX(Q)` |
| `<  ALL (Q)` | less than the **smallest** returned value | `< MIN(Q)` |

A comparison with `ALL` over an **empty** set is vacuously `TRUE`; over a set containing `NULL` it is `UNKNOWN` unless a real `FALSE` comparison exists. Full treatment of the operator family lives in [Filtering Operators](../1-Fundamentals/07-Filtering-Operators.md).

### 5. Scalar comparison

```sql
WHERE column >= (SELECT AVG(...) FROM ...)
```

See [Scalar Subqueries](26-Scalar-Subqueries.md) — the contract is exactly one row, one column; more than one row is a runtime error.

### Where a `WHERE` subquery cannot appear

- It can be placed in any form of `WHERE` — including inside `AND`/`OR` combinations, `CASE` conditions, and `HAVING` predicates of `SELECT`, `UPDATE`, and `DELETE`.
- It **cannot** legally select more than one column for `IN`/comparison in SQL Server, or in ordinary predicate position in PostgreSQL/MySQL (PostgreSQL and MySQL *do* allow multiple columns in **row-constructor** form: `WHERE (a, b) IN (SELECT x, y FROM t)`). See Row Subqueries below.

---

## Sample Data

All examples use the following tables unless stated otherwise. **Grain is stated first** because wrong grain assumptions are the #1 cause of wrong join, aggregation, and subquery results.

> `customers` — one row per customer.

| customer_id | customer_name |
|------------:|---------------|
| 1           | Alice         |
| 2           | Bob           |
| 3           | Carol         |
| 4           | Dan           |
| 5           | Erin          |

> `orders` — one row per order. `customer_id` FK to `customers`, **nullable** (data entry can be missing; order 505 is the deliberately tragic example). `status` **nullable**.

| order_id | customer_id | status    | total |
|---------:|------------:|-----------|------:|
| 501      | 1           | shipped   | 320   |
| 502      | 2           | pending   | 150   |
| 503      | 1           | shipped   | 90    |
| 504      | 3           | pending   | 240   |
| 505      | NULL        | NULL      | 60    |
| 506      | 4           | shipped   | 410   |

> `order_items` — one row per **line item** on an order. An order can have many items; some orders have none.

| line_id | order_id | product_id | qty | unit_price |
|--------:|---------:|-----------:|----:|-----------:|
| 1001    | 501      | 10         | 2   | 45.00      |
| 1002    | 501      | 11         | 1   | 25.00      |
| 1003    | 502      | 12         | 1   | 210.00     |
| 1004    | 504      | 13         | 5   | 12.00      |
| 1005    | 506      | 10         | 1   | 45.00      |

> `products` — one row per product. `price` **nullable** (the price of product 14 has not been set).

| product_id | product_name | price |
|-----------:|--------------|------:|
| 10         | Keyboard     | 45.00 |
| 11         | Mouse        | 25.00 |
| 12         | Monitor      | 210.00 |
| 13         | USB Cable    | 12.00 |
| 14         | Headset      | NULL  |

> `departments` — one row per department.

| dept_id | dept_name |
|--------:|-----------|
| 1       | Engineering |
| 2       | Sales     |
| 3       | Marketing |
| 4       | Research  |

> `employees` — one row per employee. `dept_id` nullable (Grace is unassigned); `salary` nullable (Frank is a data-entry gap).

| emp_id | emp_name | dept_id | salary |
|-------:|----------|--------:|-------:|
| 1      | Alice    | 1       | 120000 |
| 2      | Bob      | 1       | 95000  |
| 3      | Carol    | 2       | 80000  |
| 4      | Dave     | 2       | 60000  |
| 5      | Eve      | 3       | 85000  |
| 6      | Frank    | 4       | NULL   |
| 7      | Grace    | NULL    | 70000  |

Facts that will matter in the examples:

- Order 505 has `customer_id = NULL`.
- Orders 503 and 505 have **no** line items.
- Product 14 (Headset) has **never** been ordered and its price is `NULL`.
- Sales (dept 2) salaries: 80000, 60000.

---

## Non-Correlated Subqueries in WHERE

A **non-correlated** subquery references nothing from the outer query. Conceptually it is computed **once**, independently, and its result is then reused. The outer `WHERE` is just a filter against that precomputed result.

### Example 1 — `IN`, non-correlated

**Task:** which customers have placed at least one order?

```sql
SELECT customer_name
FROM customers c
WHERE c.customer_id IN (
  SELECT o.customer_id
  FROM orders o
);
```

**How it works:** the subquery returns the set `{1, 1, 2, 3, 4, NULL}` (customers 1, 1, 2, 3, 4 from orders 501–506 minus the NULL on 505). For each customer, SQL evaluates `c.customer_id = 1 OR c.customer_id = 2 OR ...`. Duplicates in the set are irrelevant — membership is a set question.

**Expected output:**

| customer_name |
|---------------|
| Alice         |
| Bob           |
| Carol         |
| Dan           |

Erin (5) is excluded — 5 is not in the set. Duplicate `1` (orders 501 and 503) does **not** make Alice appear twice.

### Example 2 — `NOT IN`, non-correlated, NULL poisoning

**Task:** which customers have placed **no** orders?

```sql
SELECT customer_name
FROM customers c
WHERE c.customer_id NOT IN (
  SELECT o.customer_id
  FROM orders o
);
```

**Expected (correct) result:** `Erin` only.

**Actual result:**

| customer_name |
|---------------|
| *(zero rows)* |

> Production pitfall

> The `NOT IN` returned **no rows**, not Erin. Reasons: the subquery set `{1, 1, 2, 3, 4, NULL}` contains a NULL. For Erin: `5 <> 1 AND 5 <> 2 AND 5 <> 3 AND 5 <> 4 AND 5 <> NULL`. Every `<>` against a number is `TRUE`, but `5 <> NULL` is `UNKNOWN`. `TRUE AND TRUE AND TRUE AND TRUE AND UNKNOWN` = `UNKNOWN` → Erin is filtered. Every other customer is filtered the same way. Empty result, **no error**. This is exactly the NOT IN + NULL trap (see [NOT IN + NULL Pitfalls](../2-NULL-and-Logic/14-NOT-IN-NULL-Pitfalls.md)).

**Fix 1 — remove the NULLs from the set:**

```sql
WHERE c.customer_id NOT IN (
  SELECT o.customer_id
  FROM orders o
  WHERE o.customer_id IS NOT NULL
);
```

**Fix 2 — use `NOT EXISTS` (NULL-safe by construction):**

```sql
SELECT customer_name
FROM customers c
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.customer_id
);
```

Both return `Erin`. Which to prefer is a query-shape decision — see [NOT IN vs NOT EXISTS](#not-in-vs-not-exists).

---

## Correlated Subqueries in WHERE

A **correlated** subquery references a column of the **outer** query. Conceptually it is re-evaluated **once per outer row** — "is *this* row's value present/absent in a result that depends on *this* row?" Actual execution frequency depends on the optimizer (see Internal Working).

### Example 3 — Correlated `EXISTS`

**Task:** customers who placed at least one `shipped` order.

```sql
SELECT c.customer_name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.customer_id
    AND o.status = 'shipped'
);
```

The inner query references `c.customer_id` → correlated. For each customer, the database asks: "does a shipped order with this customer id exist?"

**Expected output:**

| customer_name |
|---------------|
| Alice         |
| Bob           |
| Dan           |

Wait — Bob's order 502 is `pending`, not `shipped`. Let us recompute: shipped orders are 501 (customer 1), 503 (customer 1), 506 (customer 4). So the customers with at least one shipped order are Alice (1) and Dan (4).

| customer_name |
|---------------|
| Alice         |
| Dan           |

### Example 4 — Correlated `NOT EXISTS`

**Task:** orders that have **no** line items (possible orphan/reporting gap).

```sql
SELECT order_id, total
FROM orders o
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  WHERE oi.order_id = o.order_id
);
```

**Expected output:**

| order_id | total |
|---------:|------:|
| 503      | 90    |
| 505      | 60    |

`NOT EXISTS` evaluates each order's subquery; a subquery with zero rows makes the predicate `TRUE`.

### Example 5 — Correlated comparison: members of a group only

**Task:** employees who earn more than the average of *their own* department.

```sql
SELECT e.emp_name, e.salary
FROM employees e
WHERE e.salary > (
  SELECT AVG(e2.salary)
  FROM employees e2
  WHERE e2.dept_id = e.dept_id
);
```

This is a correlated **scalar** subquery (exactly one column; an aggregate guarantees one row). Covered in depth in [Scalar Subqueries](26-Scalar-Subqueries.md); shown here to distinguish "set membership" subqueries from "value comparison" subqueries.

**Expected output:**

| emp_name | salary |
|----------|-------:|
| Alice    | 120000 |
| Carol    | 80000  |

Dept 1 average = 107500 → only Alice beats it. Dept 2 average = 70000 → Carol (80000) does, Dave (60000) does not. Eve (85000) is exactly at Marketing's average of 85000 — not *greater than*. Frank and Grace compare against `NULL` (all-NULL group / `NULL = NULL` never matches) → `UNKNOWN` → excluded.

---

## IN vs EXISTS

Both express existence/membership. Are they interchangeable?

| Concern | `col IN (subquery)` | `EXISTS (subquery)` |
|---------|---------------------|----------------------|
| Typical form | non-correlated | correlated |
| NULL in outer column | `UNKNOWN` → row filtered | Fine — the row is simply not matched |
| NULL in subquery result | If another value matches → `TRUE` (short-circuit); if no value matches → `UNKNOWN` → *all* rows filtered | Irrelevant — value NULLs are ignored, only **rows** count |
| Multi-column subquery | Allowed as row-constructor in PG/MySQL/Oracle; error in SQL Server | Allowed anywhere (any column list) |
| Duplicates in subquery | Irrelevant | Irrelevant |
| Readability for "does a row exist" | "value is a member of a set" | "some row exists that..." |
| Standard plan shape | Semi-join or materialization | Semi-join with early exit |

> Common misconception

> "`EXISTS` is always faster than `IN`." Both are usually compiled to the **same semi-join operator**. Whether your engine materializes the inner set, runs a per-row seek, or builds a hash table depends on optimizer, statistics, indexes, cardinality, and plan shape. Write the clearer one and verify with the execution plan.

**Decision rule:** you usually prefer

- `IN` when the subquery is **non-correlated** and the set can be computed once — ``WHERE col IN (SELECT ...)`` reads naturally;
- `EXISTS` when the subquery is **correlated** — `EXISTS` makes the per-row dependency explicit and, unlike `NOT IN`, is immune to NULL poisoning.

### Example 6 — Same question, both forms

**Task:** list customers who placed at least one order, once each.

> BAD APPROACH — JOIN from the mistake family; fans out one row per order.

```sql
SELECT DISTINCT c.customer_name
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id;
```

Alice appears twice in the join (orders 501, 503); `DISTINCT` then deduplicates. This works but makes the database join and deduplicate rows whose multiplicity you never wanted.

> BETTER APPROACH — existence via `WHERE` subquery, no fan-out, no `DISTINCT`.

```sql
SELECT c.customer_name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.customer_id
);
```

Output is Alice, Bob, Carol, Dan — same rows, one pass, no row multiplication. An ordinary `JOIN` multiplies; a semi-join (what `EXISTS`/`IN` become) does not — see [Semi-Joins](23-Semi-Joins.md).

---

## NOT IN vs NOT EXISTS

This is the single most-examined NULL trap in SQL interviews.

| Concern | `col NOT IN (subquery)` | `NOT EXISTS (subquery)` |
|---------|--------------------------|--------------------------|
| NULL in subquery result | **All rows filtered** (chain becomes UNKNOWN) | Ignored — no poison |
| NULL in outer column | Row filtered (`UNKNOWN`) | Row simply unmatched |
| NULL-safe equivalent | Yes, only if subquery guaranteed NULL-free | Yes, always |
| Plan shape (typical) | Anti-join (only when optimizer proves no NULLs — otherwise per-row filter) | Anti-join |
| Late-binding pitfall | If a NULL appears in the data later, query silently breaks | None of this class |

> Interview trap

> `NOT IN (SELECT ...)` and `NOT EXISTS (...)` are **not** equivalent when NULLs can appear, even though for many textbook datasets they return identical answers. `NOT EXISTS` is the defensible default for an anti-join (rows with no match) whenever the subquery column is nullable or its NOT-NULL-ness hasn't been proven.

### Example 7 — `NOT IN` vs `NOT EXISTS` on the same data

**Task:** products that have never been ordered.

NULL-safe version:

```sql
SELECT product_name
FROM products p
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  WHERE oi.product_id = p.product_id
);
```

**Expected output:**

| product_name |
|--------------|
| Headset      |

Broken version — `product_id = 10` matches items 1001, 1005; `14` matches nothing; the set of ordered product ids is `{10, 11, 12, 13, 10}` with **no NULL**, so `NOT IN` *happens* to work here:

```sql
SELECT product_name
FROM products p
WHERE p.product_id NOT IN (
  SELECT oi.product_id
  FROM order_items oi
);
```

`NOT IN` works on this data because `order_items.product_id` is non-null. The instant a NULL enters `order_items.product_id` (a data-entry gap), the query silently returns **zero rows**. `NOT EXISTS` is robust regardless. Same reasoning as Example 2.

When the inner set is provably NULL-free (a `NOT NULL` column and a subquery that cannot introduce NULLs — e.g. `WHERE oi.product_id IS NOT NULL`), the optimizer can treat the two as equivalent and even both as anti-joins. See [Anti-Joins](23-Anti-Joins.md) for the NULL-proving conditions per engine.

---

## ANY / SOME / ALL

Quantified comparison lets you test a column against *every* value the subquery returns, with a single operator.

### Example 8 — `> ALL`

**Task:** employees who earn more than **every** Sales employee (dept 2: 80000, 60000).

```sql
SELECT emp_name, salary
FROM employees
WHERE salary > ALL (
  SELECT e2.salary
  FROM employees e2
  WHERE e2.dept_id = 2
);
```

Semantics: `salary > 80000 AND salary > 60000` → effectively `salary > 80000`.

**Expected output:**

| emp_name | salary |
|----------|-------:|
| Alice    | 120000 |
| Bob      | 95000  |
| Eve      | 85000  |

### Example 9 — `> ANY`

**Task:** employees who earn more than **at least one** Sales employee (i.e. more than 60000).

```sql
SELECT emp_name, salary
FROM employees
WHERE salary > ANY (
  SELECT e2.salary
  FROM employees e2
  WHERE e2.dept_id = 2
);
```

**Expected output:**

| emp_name | salary |
|----------|-------:|
| Alice    | 120000 |
| Bob      | 95000  |
| Carol    | 80000  |
| Eve      | 85000  |
| Grace    | 70000  |

Dave (60000) is not *greater than* 60000; Frank's NULL salary → `UNKNOWN` → excluded. Note `= ANY(...)` ≡ `IN(...)` and `<> ALL(...)` ≡ `NOT IN(...)` including their NULL behaviors.

### Empty-set and NULL-set behavior of `ANY`/`ALL`

| Comparison | Set contains NULL | Set is empty |
|------------|-------------------|--------------|
| `x = ANY(Q)` / `IN` | Can still be TRUE if a real match exists | `FALSE` for all rows |
| `x > ANY(Q)` | Can still be TRUE if `x` beats some real value | `FALSE` |
| `x = ALL(Q)` | `UNKNOWN` unless a real mismatch gives `FALSE` | **`TRUE` (vacuous)** |
| `x > ALL(Q)` | `UNKNOWN` unless a real value fails `x > v` giving `FALSE` | **`TRUE` (vacuous)** |
| `NOT IN(Q)` / `<> ALL(Q)` | `UNKNOWN` → **all rows filtered** | `TRUE` for all rows |

> Interview trap

> `NULL NOT IN (1, 2, NULL)` is `UNKNOWN`, not `TRUE` — the classic answer everyone guesses wrong (see [Five-Values quiz](../2-NULL-and-Logic/11-NULL-Comparisons.md)).
>
> `x > ALL (empty-set)` is **`TRUE`** — vacuous truth. "Greater than everything in an empty list" holds for *every* `x`. This trips up everyone the first time.

### Example 10 — `> ALL` against an all-NULL set

**Task:** employees who earn more than every employee in Research (dept 4). Frank's salary is NULL, so the inner set is `{NULL}`.

```sql
SELECT emp_name, salary
FROM employees
WHERE salary > ALL (
  SELECT e2.salary
  FROM employees e2
  WHERE e2.dept_id = 4
);
```

**Result:** **zero rows**. For every employee, `salary > NULL` is `UNKNOWN`, and `UNKNOWN` (as the only conjunct) is `UNKNOWN`, not `TRUE`. Identical in spirit to the `NOT IN` poison.

### Example 11 — `> ALL` against an empty set (vacuous truth)

**Task:** employees who earn more than every employee in a department with nobody in it (dept 99).

```sql
SELECT emp_name, salary
FROM employees
WHERE salary > ALL (
  SELECT e2.salary
  FROM employees e2
  WHERE e2.dept_id = 99
);
```

**Expected output:** every employee with a non-NULL salary — Alice, Bob, Carol, Dave, Eve, Grace. Frank is excluded only because his `salary > ...` compares against `NULL`. Everyone else passes because the set is empty and the `ALL` claim is vacuously true.

---

## Row Subqueries in WHERE

PostgreSQL, MySQL, and Oracle support **row-constructor** (tuple) subqueries, comparing several columns at once:

```sql
-- Products whose (product_id, price) pair matches a stored product definition
SELECT *
FROM order_items oi
WHERE (oi.product_id, oi.unit_price) IN (
  SELECT p.product_id, p.price
  FROM products p
);
```

`(a, b) IN (SELECT x, y ...)` means `(a,b) = (x1,y1) OR (a,b) = (x2,y2) OR ...` under the **same NULL rules as ordinary comparisons** — a NULL on either side of `=` poisons the match unless a real equal pair exists.

> PostgreSQL · MySQL · Oracle

> Row constructors in `IN`/comparison are supported by PostgreSQL, MySQL (single-level), and Oracle. **SQL Server does not support row-value comparisons** — it raises a syntax error; rewrite as two predicates or use a join/`EXISTS`.

Multi-column subqueries under plain comparison are also legal in these engines: `WHERE (a, b) = (SELECT x, y FROM t LIMIT 1)` — see the Row Subqueries section of the index.

---

## Subqueries in WHERE of UPDATE / DELETE

The `WHERE` of an `UPDATE` or `DELETE` accepts subqueries exactly like `SELECT`. Perfect for maintenance jobs:

```sql
-- Delete line items belonging to orders that no longer exist (orphans)
DELETE FROM order_items
WHERE order_id NOT IN (
  SELECT order_id
  FROM orders
);
```

Here the `order_items.order_id` and `orders.order_id` are both NOT NULL keys, so `NOT IN` is safe. If either were nullable, prefer `NOT EXISTS`.

```sql
DELETE FROM order_items oi
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.order_id = oi.order_id
);
```

> Production pitfall (MySQL)

> MySQL refuses to modify a table while `SELECT`ing from the **same** table in a subquery of the `WHERE`: `ERROR 1093 (HY000): You can't specify target table 'orders' for update in FROM clause`. Rewrite with a derived table layer: `WHERE order_id IN (SELECT order_id FROM (SELECT ...) AS tmp)`.

---

## Internal Working

What you write is not necessarily what the engine runs. The same subquery patterns get compiled into different physical operators depending on engine, statistics, data, and indexes.

### Non-correlated membership (`IN`)

- **PostgreSQL:** plans a `Semi Join` (`Hash Semi Join`, `Merge Semi Join`, or `Nested Loop Semi Join`); for small sets it may use a `SubPlan` whose materialized result is *rescanned* (cheap) per outer row.
- **MySQL:** materializes the inner set into a temporary indexed table and semi-joins (or, pre-8.0, runs the subquery once into memory). `EXPLAIN` shows `Materialize semijoin` / `Start temporary` / `End temporary`.
- **SQL Server:** `IN` and `EXISTS` both appear as **``Left Semi Join``** in the plan; with an index a `Nested Loops` with inner `Seek` is common.
- **Oracle:** typically `HASH JOIN SEMI` or `NESTED LOOPS SEMI`; a small non-correlated set can be folded to an `INLIST ITERATOR`/constant.

### Existence (`EXISTS`)

`EXISTS` has **early-exit** semantics: the subquery stops at its first matching row. When executed as a nested-loop with an index seek on the inner side, per outer row it performs one indexed lookup and stops.

### Anti-joins (`NOT EXISTS`, NULL-free `NOT IN`)

`NOT EXISTS` and provably-NULL-free `NOT IN` compile to an **anti-join**: `Anti Semi Join` (PostgreSQL), `Merge Anti Semi Join` / `Left Anti Semi Join` (SQL Server), `HASH JOIN ANTI` (Oracle), `Anti-join` (MySQL 8 with a materialization guard).

> PostgreSQL
> An anti-join appears in `EXPLAIN` as nodes named `*Anti Join` / `Nested Loop Anti Join`, etc. When the inner set is tiny, PostgreSQL may instead run the correlated subquery as a `SubPlan` (re-executed per outer row) rather than materializing — the plan tells you which.

> Oracle
> Oracle can only turn `NOT IN` into an anti-join when it can **prove neither the outer column nor the subquery column can be NULL** (NOT NULL/primary-key, or an explicit `IS NOT NULL` filter). Otherwise it executes row-by-row with the three-valued-logic filter — which is precisely why `NOT IN` is slow *and* wrong in one package.

### Correlated subqueries generally

The conceptual model is *one execution per outer row* (a nested loop). Engines mitigate with:

- index-assisted inner lookups (a `Seek` instead of a `Scan` per row);
- Oracle **scalar-subquery caching** (`SCALAR SUBQUERY ... CACHE`) so identical bind values reuse one result;
- PostgreSQL/SQL Server parameterized re-execution or materialization of the inner side.

**Never assert "correlated = N×M."** Read the plan: you may see one-time `InitPlan`/`Constant Scan` materialization, semi-join rewrites, or caching that entirely change the story.

---

## SQL Reasoning Applied to WHERE Subqueries

Before writing a `WHERE` subquery, answer these from the global reasoning checklist:

1. **What does one output row represent?** If it is one row *per customer*, subqueries prevent duplication — if it is one row *per order line*, a join is correct.
2. **Which table is the driving table?** The one in the outer `FROM`; the subquery filters it.
3. **Do I need columns from the other table in the output?** Yes → re-express as a `JOIN` (fan-out permitted). No → keep the subquery.
4. **Do I only need to know whether a row exists?** Use `EXISTS`/`NOT EXISTS` (or `IN`/`NOT IN` for set membership).
5. **Can the subquery return `NULL`?** Drops the `WHERE` predicate to `UNKNOWN` — for `NOT IN`/`ALL`, this poisons every row silently.
6. **Should the condition be inside the subquery or the outer `WHERE`?** Filtering the subquery shrinks the inner set (and, for `IN`, the risk of NULL poison); outer `WHERE` filters final results.
7. **Could this create duplicates?** `IN`/`EXISTS` cannot (semi-join semantics); a rewritten `JOIN` can (fan-out).
8. **What happens with zero matching rows?** Empty subquery: `IN`/`ANY`/`EXISTS` → `FALSE`, `NOT IN`/`ALL`/`NOT EXISTS` → `TRUE`.
9. **Which aggregates are legal?** The `WHERE` can compare to an aggregate **via a subquery**; it cannot call an aggregate of the group directly — that is `HAVING`'s job (see [Logical Query Processing Order](../1-Fundamentals/06-Logical-Query-Processing-Order.md)).
10. **What does the execution plan say?** Confirm semi-join/anti-join/materialization and check per-row scans (see Performance).

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Subquery returns empty set, `IN` / `= ANY` / `EXISTS` | `FALSE` for every outer row → empty result (unless the driving table is itself empty, giving empty too) |
| Subquery returns empty set, `NOT IN` / `<> ALL` / `ALL` / `NOT EXISTS` | `TRUE` for every row → **all rows pass** (vacuous truth) |
| Outer value is `NULL`, any comparison `=`, `<>`, `NOT IN`, `> ALL` | `UNKNOWN` → row filtered |
| Subquery set contains one `NULL`, and the value matches another member | `IN`: `TRUE` (the match short-circuits) — row kept |
| Subquery set contains `NULL`, no other member matches | `NOT IN`: **all rows filtered**; `IN`: filtered (no match) |
| Correlated subquery vs `NULL` outer key | `NULL = NULL` is `UNKNOWN`, never matches → subquery empty |
| Subquery loses its uniqueness guarantee | Scalar-comparison form errors at runtime: `more than one row returned` |
| Duplicates in the subquery result | Irrelevant to `IN`/`EXISTS` (membership semantics deduplicate) |
| `EXISTS` selecting `NULL` | Returns `TRUE` as long as **one row** exists — NULL values are ignored |
| Row-constructor `IN` with one NULL component | Can match if the pair equals a real pair; otherwise filtered |
| `<> ANY` | Not an anti-join! `x <> ANY {1}` is TRUE for any `x <> 1`, including values IN the set if the set has >1 distinct value — reads like `NOT IN` but is not |

> Interview trap — `<> ANY` / `<> ALL`:

> `WHERE x <> ALL (1, 2)`: `x <> 1 AND x <> 2` → anti-membership. But `WHERE x <> ANY (1, 2)`: `x <> 1 OR x <> 2` → TRUE for *every* `x` except when the set is empty (FALSE), because any x contradicts at least one of the two values... practically the `ANY` form is almost never what you mean as "not equal to the set". Only `<> ALL` equals `NOT IN`.

---

## Common Mistakes

| Mistake | Why it is wrong | Fix |
|---------|-----------------|-----|
| `NOT IN` with a nullable subquery column | One NULL silently empties the result | `NOT EXISTS`, or filter `IS NOT NULL` inside, or prove non-nullability |
| Assuming `NOT IN` and `NOT EXISTS` are interchangeable | They differ under NULLs | Choose `NOT EXISTS` whenever NULLs are possible |
| Replacing `EXISTS` with `JOIN` + `DISTINCT` | Fan-out then dedupe wastes work and can blow up intermediate rows | Keep `EXISTS`/`IN` (semi-join) or use the join only if you truly need its columns |
| Correlated subquery on an unindexed inner table | Per-row scans compound to ~N×M | Index the correlated column; verify with the plan |
| Writing `WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 4)` | All-NULL set returns zero rows, silently | Understand WHY (`UNKNOWN`), or filter out NULLs first |
| Believing `> ALL (empty)` filters everything | Empty `ALL` is vacuous `TRUE` — everyone passes | If you need "greater than the max of a possibly-empty set", use `> (SELECT MAX(...))` which returns NULL→`UNKNOWN`, or `COALESCE((SELECT MAX(...)), 0)` with intended semantics |
| Scalar comparison against a subquery that can return 2+ rows | Runtime error the day the data grows | Make single-row-ness structural (`MAX`, `LIMIT 1`, unique key) — see [Scalar Subqueries](26-Scalar-Subqueries.md) |
| Subquery returning multiple columns in SQL Server `IN` | Syntax error | Row constructor unsupported; join or `EXISTS` |
| Filtering inside the wrong layer | Conditions on the inner table in the outer `WHERE` force `JOIN`; the subquery can't see them | Move per-inner-table predicates **into the subquery** |
| Checking "does row exist" with `COUNT(*) > 0` in a scalar subquery | Must scan the whole inner set; EXISTS short-circuits | Use `EXISTS` |

---

## Production Pitfalls

> Production pitfall — **the silent `NOT IN` zero-row return.**

> A `NOT IN` anti-join that breaks only when a NULL arrives is the classic "worked for 3 years, then a backfill upended the weekly report" bug. There is no error; results are simply empty. Standardize on `NOT EXISTS` for anti-joins (or a NOT-in with an explicit `IS NOT NULL` guard), document it, and smoke-test with one NULL row.

> Production pitfall — **correlated subquery amplification.**

> A correlated `EXISTS`/scalar in `WHERE` over a large driving table with a missing index on the inner correlation column degrades to a per-row table scan. Do not delete it; add the index (`order_items(customer_id)`, `employees(dept_id)`) and re-check the plan — the plan, not folklore, decides.

> Production pitfall — **multi-row scalar comparison in a hot path.**

> `WHERE status = (SELECT status FROM ...) ` compiled fine on a unique set for months, then duplicated data appears and every call fails with an exception. Make single-row-ness a *database-enforced* guarantee or `MAX`/`LIMIT 1`.

> Production pitfall — **MySQL self-referencing UPDATE/DELETE.**

> `DELETE FROM orders WHERE order_id NOT IN (SELECT order_id FROM orders ...)` → MySQL error 1093. Wrap the inner query in a derived table to satisfy the limitation.

> Production pitfall — **vacuous `ALL`/`NOT IN` on empty sets in batch jobs.**

> `WHERE x NOT IN (SELECT a FROM t WHERE active = 1)` when the subquery is empty returns *everything* (TRUE). If the intended semantics are "not in the set of active items", empty-set → all-pass may be exactly wrong for a cleanup job. Decide deliberately.

---

## Performance

> Do not guess. Every claim below is a hypothesis to confirm with `EXPLAIN ANALYZE` (PostgreSQL / MySQL 8+), actual execution plan with `SET STATISTICS IO, TIME ON` (SQL Server), or `EXPLAIN PLAN` / `DBMS_XPLAN` (Oracle). Where data volume is small, a "slow" shape is usually irrelevant; where it is large, a good index can flip everything.

### What actually decides the cost

- **Semi-join vs per-row SubPlan:** a well-planned `IN`/`EXISTS` runs as `Hash Semi Join` or `Index Nested Loop Semi Join`; a correlated subquery evaluated per row without an index is a nested reprocessing of the inner table. Read the plan to see which.
- **Indexes:** a `Nested Loop Semi Join` with inner `Index Seek` is cheap *per outer row;* the same shape with inner `Scan` is not. Index the correlation column(s) (`order_items.customer_id`, `order_items.product_id`, `employees.dept_id`).
- **Statistics & cardinality:** one engine may choose materialization of the inner set (great for tiny sets), another may hash it (great for both large). Stale statistics produce bad choices — refresh and re-`ANALYZE`.
- **NULL-proving for anti-joins:** with NULLs possible, `NOT IN` cannot use an anti-join in several engines and reverts to a row-by-row three-valued-logic check — slow *and* semantically broken. `NOT EXISTS` keeps the anti-join.
- **Early exit:** `EXISTS` semantics allow the engine to stop at the first match; `IN` on a materialized set does a hash probe (no early exit, but O(1) per probe).
- **Rewrite freedom:** the more correlated and convoluted the subquery, the fewer optimizer transformations apply. Flat, index-friendly predicates rewrite best.

### Diagnosis checklist

1. `EXPLAIN (ANALYZE, BUFFERS)` the query. Look for `Semi Join`/`Anti Join` nodes vs raw `Seq Scan` under a `SubPlan`.
2. Is any node labeled `Scan` running *inside* a per-row loop? Add the matching index and re-explain.
3. Compare alternatives on the same data: `IN` vs `EXISTS` vs `JOIN + DISTINCT` vs `NOT EXISTS` — measure, do not debate.
4. Check that stats are fresh; a stale plan for a 7-row table can catastrophically mis-serve 7-million-row data.

> PostgreSQL
> Nodes: `Hash Semi Join`, `Nested Loop Semi Join`, `Merge Semi Join`, `*Anti Join`, `Materialize`, `SubPlan`. `InitPlan` = computed once before the outer loop; `SubPlan` = re-evaluated per outer row.

> MySQL
> `EXPLAIN ANALYZE`/`EXPLAIN FORMAT=TREE` shows `Materialize` + `Scan semijoin` (`IN`), or `Dependent subquery` (correlated `EXISTS`) which may run per row. Modern optimizer rewrites many `IN` into semijoin to exploit indexes.

> SQL Server
> Plan operators: `Left Semi Join`, `Left Anti Semi Join`, `Hash`, `Nested Loops`, `Merge`. A per-row subquery shows as `Nested Loops` with a `Compute Scalar`/`Filter` — check inner input for `Seek` vs `Scan`.

> Oracle
> `HASH JOIN (SEMI)` / `NESTED LOOPS (SEMI)` / `ANTI`, and `SCALAR SUBQUERY` + `CACHE` for correlated values. `NOT IN` anti-join requires NULL-proofed columns (NOT NULL/constraints).

---

## Best Practices

- **Prefer `EXISTS`/`NOT EXISTS` for yes/no questions** — explicit existence semantics, NULL-safe, fan-out-free.
- **Prefer `IN` for non-correlated membership** against value sets — it reads best and materializes well.
- **Never write `NOT IN` over a nullable column or with a `SELECT` that may return NULL,** unless you guard with `IS NOT NULL`. If in doubt, `NOT EXISTS`.
- **Filter inside the subquery**, not in the outer `WHERE`, when the predicate belongs to the inner table — it shrinks the inner set and can avoid NULLs entirely.
- **Index the correlated column(s)** and confirm the plan; per-row scans are the #1 correlated-subquery performance killer.
- **Keep the scalar subquery structurally single-row** (`MAX`, `MIN`, `LIMIT 1`, or a unique key) — never "it happens to be unique today".
- **State the grain** of the driving table and the output before choosing form — it tells you whether duplicates are even possible.
- **Know the empty-set truth table** before you rely on `ALL`/`NOT IN` in batch logic.
- **Read the plan for every "which is faster" question.** No claim about `IN` vs `EXISTS` vs `JOIN` survives contact with the real optimizer.
- **Prefer clear intent.** Primarily, write the form that most directly states the question; let the optimizer earn the performance you verify.

---

## Database Differences

| Engine | Notes |
|--------|-------|
| PostgreSQL | `SELECT list` of `EXISTS` is irrelevant (use `SELECT 1`); supports row-constructor `IN`; plan shows `Semi`/`Anti` joins or `SubPlan`; `NOT IN` over nullable columns is worker-slow AND wrong — use `NOT EXISTS`. |
| MySQL | Error 1093 when UPDATE/DELETE targets the same table as the subquery; materializes `IN` sets (temp table + in-memory index) and semi-joins in 8.0+; `EXISTS` correlated subqueries run per row. No multi-column `IN`. |
| SQL Server | No row-value `IN`/comparison; both `IN` and `EXISTS` render as `Left Semi Join`; decidely NULL-safe `NOT EXISTS` preferred; `SET STATISTICS` for cost analysis. |
| Oracle | `IN`/`NOT IN` become `HASH JOIN SEMI/ANTI` only when NULL-free (constraint/NOT NULL proofs otherwise); scalar-subquery caching (`CACHE`) makes repeated correlated values cheap; historic guidance is `SELECT *` inside `EXISTS` (no behavioral difference in modern versions, but harmless to keep). |

Return to the main **Subqueries** index for: Scalar Subqueries (26), Non-Correlated vs Correlated Subqueries, Row Subqueries, Subqueries in `FROM`, `EXISTS`, `IN`, Comparison Operators (`ANY`/`ALL`/`SOME`), and CTEs. Companion deep-dives: [Anti-Joins](../3-Joins/23-Anti-Joins.md), [Semi-Joins](../3-Joins/24-Semi-Joins.md), [NOT IN + NULL Pitfalls](../2-NULL-and-Logic/14-NOT-IN-NULL-Pitfalls.md), [Three-Valued Logic](../2-NULL-and-Logic/10-Three-Valued-Logic.md), [Filtering Operators](../1-Fundamentals/07-Filtering-Operators.md).

---

# Interview Questions

> Practice set — answers are intentionally withheld. Work each through, then verify with a live query and `EXPLAIN (ANALYZE)`.

### Beginner

1. What are the four shapes of a subquery that may appear in `WHERE`? Give the syntax of each.
2. What does the subquery inside a `WHERE ... IN (...)` need to return — rows, columns, or both? And for `EXISTS`?
3. When the subquery of `WHERE x IN (subquery)` returns no rows, what does every outer row evaluate to, and what is the result of the query?
4. Write a single query returning customers who placed at least one order (from the sample data). Then rewrite it with `NOT EXISTS`.
5. What does `EXISTS (SELECT NULL FROM orders)` return when `orders` has one row? Explain why the `NULL` is irrelevant.

### Intermediate

6. Explain the difference between `IN` and `EXISTS` in terms of correlated vs non-correlated subqueries. When is each usually the right choice?
7. Why does `customer_id NOT IN (SELECT customer_id FROM orders)` return zero rows on the sample data, while `NOT EXISTS` returns `Erin`? Show the three-valued-logic expansion.
8. Expand `x > ALL (SELECT salary FROM employees WHERE dept_id = 2)` semantically. Is it equivalent to `x > MAX(...)`? Under what NULL condition does the equivalence fail?
9. What is the result of each of these on the sample data: `x IN (empty)`, `x NOT IN (empty)`, `x > ALL (empty)`, `x > ANY (empty)`, `NOT EXISTS (empty)`?
10. Why is `<> ANY (...)` NOT an anti-join? Demonstrate with a concrete set.

### Advanced

11. Under what conditions can an optimizer compile `WHERE col IN (subquery)` into a *semi-join* rather than materializing the subquery? What plan nodes show each choice in PostgreSQL / MySQL / SQL Server / Oracle?
12. Why can't `NOT IN` always compile into an anti-join, and how does Oracle's NULL-proving interact with that? What changes when the subquery column is `NOT NULL`?
13. Explain the execution-plan difference between a correlated `EXISTS` with an inner index **seek** versus an inner full **scan** — how does the cost scale with the outer table's row count in each case?
14. When is `x > ALL (subquery)` semantically *different* from `x > (SELECT MAX(...))` with respect to an all-NULL or empty subquery set? Provide the empty-set truth table for `ALL`/`ANY`/`IN`/`NOT IN`.
15. A `LEFT JOIN` + `WHERE b.key IS NULL` implements an anti-join. How does it differ from `NOT EXISTS` under NULLs and duplicates, and when does each appear in the plan?

### Scenario Based

16. Using the sample data, find products that were never ordered — write it with `NOT EXISTS`, then with `NOT IN`, then with `LEFT JOIN ... IS NULL`. Which is correct on this data, and which one *looks* correct but is brittle?
17. For each customer, return `customer_name` and the count of their shipped orders *without* joining — using a `WHERE`-related scalar/aggregate subquery pattern. Predict the output rows.
18. Delete orders that have no line items using a `WHERE` subquery. Which form is NULL-safe, and what MySQL-specific error appears if you select from the same `orders` table being deleted?
19. Report employees earning more than the company average (non-correlated) and employees earning more than their own department average (correlated). Which form can use an index, and which must be verified per row with `EXPLAIN`?

### Tricky

20. Predict the output of `WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 4)` on the sample data, then run it. Explain the role of `UNKNOWN`.
21. `EXISTS (SELECT 1)` vs `IN (SELECT 1)` — under what data does one differ from the other? Predict each against `orders`.
22. Order 505 has `customer_id = NULL`. Does `WHERE customer_id IN (SELECT customer_id FROM customers)` include it? Does `NOT EXISTS`? Explain the relationally distinct outcomes.
23. `WHERE NULL NOT IN (1, 2)` and `WHERE NULL NOT IN (1, 2, NULL)` — same? Predict, then verify against three-valued logic.
24. A product appears in two `order_items`. Does `EXISTS` return the product twice? Does `IN`? Does a `JOIN`? What does the optimizer's semi-join do about the second row?

### Output Prediction

25. Given the sample data, predict the exact output of Example 8 (`> ALL` over dept 2) and Example 9 (`> ANY` over dept 2). Which rows differ and why?
26. Predict the output of `SELECT customer_name FROM customers WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'pending');`
27. Predict the output of `SELECT product_name FROM products WHERE product_id NOT IN (SELECT product_id FROM order_items);` on the CURRENT data, and state precisely what data change would silently make it return zero rows.

### Debugging

28. A report queries `WHERE status NOT IN (SELECT …)` and returned zero rows all week. List your investigation steps and the one NULL you would look for first.
29. A correlated `EXISTS` query is fast on 1,000 rows and hangs on 1,000,000. Which plan shape are you hunting for, which index would you add, and how do you prove the fix with `EXPLAIN ANALYZE`?
30. `DELETE FROM orders WHERE order_id IN (SELECT order_id FROM orders WHERE total < 50);` errors on MySQL. What is the fix, and does the same error occur on PostgreSQL or SQL Server?
31. A scalar subquery in `WHERE` started raising "more than one row returned" after a weekend. What are the three most likely data root causes and the structural fix that would prevent recurrence?

### Performance

32. "EXISTS always outperforms IN." Evaluate this on plan shapes: when would a materialized `IN` beat a correlated `EXISTS`, and vice versa?
33. Contrast a semi-join implemented as `Hash Semi Join` versus `Nested Loop Semi Join` with an inner `Index Seek`. Which depends on what (outer cardinality, index selection, statistics)?
34. When does a correlated subquery's cost stop scaling linearly, and what—besides syntax—controls whether it evaluates once, once per distinct value, or once per row? Refer to Oracle's scalar-subquery cache and PostgreSQL's `InitPlan`/`SubPlan` distinction.
35. Design an experiment comparing `NOT IN`, `NOT EXISTS`, and `LEFT JOIN ... IS NULL` as anti-joins on 1M customers × 10M orders (with and without a NULL in the join column). What do you measure, and what would the plan show for each winning case?

Return to the **Subqueries** index when ready.