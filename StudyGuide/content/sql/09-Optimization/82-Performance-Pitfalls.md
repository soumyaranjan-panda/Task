# 82 · Performance Pitfalls

> Category: 9-Optimization · Section: 82
> Prereqs: sections on Indexes, JOINs, GROUP BY, Window Functions, Subqueries, and Execution Plans.
> Always validate claims with your engine's execution-plan tool (`EXPLAIN ANALYZE`, `SET STATISTICS IO, TIME ON`, `EXPLAIN PLAN`).

---

## 1. Fundamentals

### What is a "performance pitfall"?

A **performance pitfall** is a query pattern, schema choice, or habit that:

1. **Makes the DBMS do far more work than necessary** (e.g., scanning a table to find 5 rows that an index could seek).
2. **Misleads the optimizer** so it picks a bad plan (wrong join order, missed index, spool to disk).
3. **Costs a lot on hot paths** even though it works (e.g., `SELECT *` on a 200-column table called in a loop).
4. **Confuses correct performance with correct numbers** (a query can be fast and _wrong_ — see fan-out and `NOT IN`).

SQL is **declarative**: you describe the _result_, and the optimizer chooses the _plan_. A pitfall is a pattern that removes legal plan choices, or hides the row counts the optimizer needs.

### The one sentence that governs everything

> Query speed depends on the **optimizer, indexes, statistics, cardinality, data distribution, query shape, database engine, and the generated execution plan** — not on one magic keyword.

### Pitfall versus bug — a critical distinction

| Kind                  | Example                                     | Wrong answer? | Slow?                   |
| --------------------- | ------------------------------------------- | ------------- | ----------------------- |
| Pure bug              | `JOIN` with missing condition               | Yes           | Usually yes (Cartesian) |
| Correct-but-slow      | `WHERE YEAR(created_at) = 2024` on 10M rows | No            | Yes                     |
| Fast-but-wrong        | `NOT IN (subquery with NULLs)`              | Yes           | Can be fast             |
| Fast-and-wrong + slow | `DISTINCT` added to hide fan-out            | Yes           | Both                    |

Performance tuning that starts by making data _correct_ is called **correctness-first tuning**, and it matters because optimizers are tuned for correct results.

---

## 2. Internal working: what actually happens under the hood

You cannot understand pitfalls without three pieces of the execution machinery.

### 2.1 The execution plan

The optimizer turns your SQL into a tree of physical operators:

```
  Aggregation (group by)
        │
  Hash Join / Nested Loop / Merge Join
        │
  Index Seek / Index Scan / Seq Scan
        │
  Filter (WHERE)
```

When people say "indexes make it fast," they really mean the plan shows an **Index Seek** instead of a **Sequential Scan**. Every pitfall below is really one of:

- the engine **cannot use an index** (sargability),
- the engine **chooses not to** (statistics/cardinality),
- the engine **does the right thing but on too many rows** (fan-out, missing filter pushdown),
- the engine **materializes or sorts unnecessarily** (DISTINCT, ORDER BY, temp spills).

### 2.2 The three join strategies (why join shape matters)

| Strategy        | Prefers                                    | When it turns into a pitfall                                            |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| **Nested Loop** | Small outer set + indexed inner            | Outer side is huge, or inner has no index → millions of inner looks-ups |
| **Hash Join**   | Large equal-size sets, equality predicates | Too big → hash spills to temp files                                     |
| **Merge Join**  | Both inputs already sorted                 | No useful sort order/no indexes → extra sort step                       |

> 💡 The optimizer chooses. **You cannot force one strategy portably**, and hints that do (`/*+ LEADING(...) */`, `FORCE ORDER`) frequently make plans worse when data changes.

### 2.3 Cardinality estimation and statistics

The optimizer guesses **how many rows each step touches**. Guesses come from _statistics_ (histograms, distinct-value counts, table size). If the guess is off by 10,000×, the optimizer builds a terrible plan for a query that is "written well."

Pitfalls that poison statistics:

- stale statistics (no `ANALYZE` after bulk loads; long-running transactions),
- **parameter sniffing** (SQL Server) / bind-variable peeking (Oracle): a plan cached for one parameter value is reused for another with wildly different cardinality,
- predicates hidden inside functions (`WHERE fn(column) = x`) that the optimizer cannot look up in its histogram.

---

## 3. The universal debugging workflow

Before every fix, and after every fix:

1. Write the query and confirm the **result is correct** on a controlled sample.
2. Run the execution-plan command and read it.
3. Look for these red flags:
   - `Seq Scan` / full scan on a table with a relevant index;
   - a `Sort` on top of an index-capable `ORDER BY` / `GROUP BY`;
   - an aggregate or `DISTINCT` that appears only to "fix" a join duplication;
   - a huge row-count estimate that contradicts what you know;
   - temp disk spills;
   - a nested loop on a big driving set.

| Engine     | Plan tool                                                       |
| ---------- | --------------------------------------------------------------- |
| PostgreSQL | `EXPLAIN (ANALYZE, BUFFERS)`                                    |
| MySQL      | `EXPLAIN ANALYZE`                                               |
| SQL Server | `SET STATISTICS IO, TIME ON;` + graphical plan                  |
| Oracle     | `EXPLAIN PLAN FOR ...` + `DBMS_XPLAN.DISPLAY` or `DBMS_SQLTUNE` |

> **Rule of thumb** — the "expected result" and "plan" are both outputs you must verify. Never _assume_ an index is used just because it exists.

---

## 4. Sample dataset used throughout this section

Grain is stated explicitly — this is the single most important habit for avoiding aggregation and join pitfalls.

**Grain: one row in `departments` = one department.**
**Grain: one row in `employees` = one employee.**
**Grain: one row in `orders` = one order.**
**Grain: one row in `order_items` = one product line on an order.**
**Grain: one row in `payments` = one payment event against an order.**

```sql
CREATE TABLE departments (
  id   INT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE employees (
  id            INT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT,
  department_id INT REFERENCES departments(id),
  salary        NUMERIC(10,2),
  hire_date     DATE
);

CREATE TABLE orders (
  id          INT PRIMARY KEY,
  customer_id INT NOT NULL,
  status      TEXT NOT NULL,      -- 'open' | 'shipped' | 'cancelled'
  created_at  TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
  id         INT PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id),
  product_id INT NOT NULL,
  qty        INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE payments (
  id       INT PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  amount   NUMERIC(10,2) NOT NULL,
  paid_at  TIMESTAMP NOT NULL
);
```

Seeded rows used in the examples:

```
departments: (1, Sales) (2, Engineering) (3, HR)

employees:
 (1, Alice, alice@x.com, 1,  5000.00, 2019-01-15)
 (2, Bob,   NULL,       1,  7000.00, 2020-06-10)
 (3, Carol, alice@x.com, 2,  4200.00, 2022-03-01)
 (4, Dan,   NULL,       3,  9000.00, 2018-11-30)
 (5, Eve,   eve@x.com,  2,  3800.00, 2023-09-05)

orders:
 (1001, 55, 'open',     2024-01-05 10:15)
 (1002, 55, 'shipped',  2024-01-06 09:00)
 (1003, 77, 'cancelled',2024-01-07 14:30)

order_items:
 (101, 1001, 100, 2, 10.00)
 (102, 1001, 200, 1,  5.00)
 (103, 1002, 100, 4, 10.00)

payments:
 (501, 1001, 15.00, 2024-01-05 10:20)
 (502, 1001,  5.00, 2024-01-05 18:00)
 (503, 1002, 40.00, 2024-01-06 09:05)
```

Note: `order 1001` has **2 line items and 2 payments**. This asymmetric shape is what makes the fan-out examples below go wrong. `employees.email` intentionally contains `NULL`s and a duplicate for NULL-handling examples.

---

## 5. The pitfalls

### P1. Missing index on the predicate (and the leading-column rule)

**The mistake:** assuming an index exists or that any index can serve any query.

```sql
-- BAD: query is fine, but there is no index on orders(customer_id)
SELECT * FROM orders WHERE customer_id = 55;
```

**BETTER:** create the right index. For a composite index the **leading column matters**:

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_status_date ON orders (status, created_at);  -- leading column = status
```

- A query filtering on `created_at` **cannot use** `(status, created_at)` — the leading column `status` is not constrained.
- A query with equality then range works: `WHERE status = 'open' AND created_at BETWEEN ...`.

**Edge case — low selectivity:** an index on a column where 99% of rows share one value (e.g., `status = 'open'`) is often _ignored_ because the optimizer correctly decides a scan is cheaper. The index is not "broken"; the data distribution is unhelpful.

**Production pitfall:** a **dead index** — created for one query, never used — slows every `INSERT`/`UPDATE`/`DELETE` and grows disk. Check usage statistics (`pg_stat_user_indexes`, MySQL `performance_schema`, SQL Server `sys.dm_db_index_usage_stats`) and drop unused ones.

**Interview trap:** "Indexes always speed up queries." ✗ They speed up _reads_ of selective predicates; they cost **write amplification** and storage. And a wrong column order makes an index useless for a given query.

---

### P2. Non-sargable predicates

A predicate is **sargable** (`S`earch `ARG`ument-able) when the indexed column appears _bare_ on one side of the operator. Wrapping the column in a function, arithmetic, or leading wildcard makes it non-sargable.

| Pattern                 | BAD                                     | BETTER                                                                                                      |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Function on column      | `WHERE YEAR(created_at) = 2024`         | `WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'`                                            |
| Uppercase compare       | `WHERE UPPER(email) = 'ALICE@X.COM'`    | `WHERE email = 'alice@x.com'` (collation)                                                                   |
| Arithmetic on column    | `WHERE salary * 2 > 10000`              | `WHERE salary > 5000`                                                                                       |
| Leading wildcard        | `WHERE name LIKE '%smith'`              | `name LIKE 'smith%'` uses index; '%...' cannot (except inverted index / trigram `pg_trgm`, engine-specific) |
| Substring               | `WHERE LEFT(name, 1) = 'A'`             | `WHERE name >= 'A' AND name < 'B'` or trigram expression index                                              |
| Date cast on timestamps | `WHERE created_at::date = '2024-01-05'` | `WHERE created_at >= '2024-01-05' AND created_at < '2024-01-06'`                                            |

**BAD:**

```sql
SELECT id FROM orders
WHERE EXTRACT(YEAR FROM created_at) = 2024
  AND LOWER(status) = 'open';
```

**BETTER:**

```sql
SELECT id FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at <   '2025-01-01'
  AND status = 'open';
```

**Internal working:** the function/column wraps destroy the optimizer's ability to (a) translate the predicate into an index seek range, and (b) use the histogram to estimate cardinality. The engine falls back to scanning every row and evaluating the function per row.

> **_4th of July bug_ — a concrete timestamp boundary trap:**
> `created_at < '2025-01-01'` excludes `2025-01-01 00:00:00.001` correctly for a `TIMESTAMP`, but if `created_at` were `DATE`, `BETWEEN '2024-01-01' AND '2024-12-31'` silently drops nothing but `created_at < '2025-01-01'` is the standard safe idiom. Use **half-open ranges**: `[start, end)`.

**Edge case where "fixes" are wrong:**

- `WHERE created_at::date = CURRENT_DATE` is a favorite (breaks sargability). Better: `WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`.
- In Oracle, `TO_DATE(date_col, 'YYYY-MM-DD')` _and_ the "cast everything" habit hide indexes too.

**Best practice:** if you _must_ write `WHERE UPPER(email) = ...` as a business rule, create an **expression index** for it (`CREATE INDEX ... ON employees ((UPPER(email)))`) — that makes the wrapper sargable again in PostgreSQL/Oracle. MySQL: use a **generated column** + index.

---

### P3. Implicit conversions (data-type mismatches)

**The mistake:** comparing columns of different types, or a column to a literal of a different type, forcing the engine to convert — and to drop the index.

**BAD:**

```sql
-- email column is TEXT, variable is some other type, or:
SELECT * FROM orders WHERE id = '1001';          -- string vs integer
SELECT * FROM employees WHERE id = id_param;      -- id is INT, param is VARCHAR
```

MySQL converts and may ignore the index; SQL Server sometimes rewrites the comparison and uses the index (still, rely on the plan); Oracle prefers `TO_NUMBER` over an indexed numeric column. **The rule is engine-dependent — verify with the plan.**

**BETTER:** compare like-for-like:

```sql
SELECT * FROM orders WHERE id = 1001;
```

**Interview trap:** "Comparing `varchar` to `int` in MySQL still uses the index." Not reliably — the conversion can happen per row. Always check the plan and keep types consistent.

---

### P4. `OR` conditions across indexed columns

**BAD:**

```sql
SELECT * FROM employees
WHERE department_id = 1 OR salary > 9000;
```

**Why it's a pitfall:** a single B-tree cannot be seeked for two disjoint ranges with different sort orders. Some engines use **index merge / BitmapOr** (PostgreSQL, modern MySQL) and are fine; others fall back to a scan.

**BETTER (when the engine can't merge):**

```sql
SELECT * FROM employees WHERE department_id = 1
UNION ALL
SELECT * FROM employees WHERE department_id <> 1 AND salary > 9000;   -- no duplicates possible
```

> Because sets are disjoint, `UNION ALL` is correct and avoids a dedupe sort. If they were not disjoint you'd need `UNION`. **Verify with the plan** — modern PostgreSQL will usually BitmapOr the OR and beat this.

**Production pitfall:** `OR` between a highly selective and a highly unselective predicate fools the optimizer; it may pick a scan. The plan is the only arbiter.

---

### P5. JOIN fan-out, and double counting

**Grain first:**

- one `order` = one order → summing `o.total` groups by `o.id` is safe.
- multiple `order_items` per order → joining `orders` to `order_items` multiplies order rows.

Trying to compute **line-level facts and payment-level facts in one query** crosses grains and **double-counts**.

**BAD — the classic fan-out:**

```sql
SELECT o.id,
       SUM(p.amount)            AS charged,     -- expected 20 for order 1001
       SUM(oi.qty * oi.unit_price) AS line_total -- expected 25
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN payments   p  ON p.order_id  = o.id
WHERE o.id = 1001
GROUP BY o.id;
```

Since order 1001 has **2 items × 2 payments = 4 rows**, both sums are inflated:

| `o.id` | charged (BAD) | line_total (BAD) |
| ------ | ------------- | ---------------- |
| 1001   | 40            | 50               |

Expected: charged `20`, line_total `25`.

> **Interview trap:** a developer "fixes" this by slapping `DISTINCT` on the SELECT — which does **not** dedupe aggregated rows and hides the real bug. The real fix is to avoid crossing grains.

**BETTER — aggregate each grain separately, then join:**

```sql
SELECT o.id,
       pay.charged,
       line.line_total
FROM orders o
LEFT JOIN (SELECT order_id, SUM(amount) AS charged
           FROM payments GROUP BY order_id) pay
       ON pay.order_id = o.id
LEFT JOIN (SELECT order_id, SUM(qty * unit_price) AS line_total
           FROM order_items GROUP BY order_id) line
       ON line.order_id = o.id
WHERE o.id = 1001;
```

| `o.id` | charged | line_total |
| ------ | ------- | ---------- |
| 1001   | 20.00   | 25.00      |

**Rules to avoid fan-out:**

1. State the grain of every table before writing the query (see section header).
2. If the fact check needs two detail tables, **aggregate to order grain separately, then join**.
3. If you only need to _know_ something exists (a product was ordered, a payment made), use `EXISTS` instead of joining — no rows multiplied.
4. Think: _"does one output row = one order, one line, one payment?"_ If you need all three grains, you need three filters/aggregations, not one join chain.

---

### P6. Accidental Cartesian products (missing join condition)

**The mistake:** a `JOIN` with no `ON` (or an `ON` that references wrong columns) multiplies rows.

**BAD:**

```sql
SELECT e.name, d.name
FROM employees e
JOIN departments d          -- no ON → every employee × every department
   ON e.department_id = d.id;
```

Oops — that example _has_ an `ON`. The real danger is:

```sql
SELECT e.name, d.name
FROM employees e, departments d;       -- implied cross join: 5 × 3 = 15 rows
```

No, ANSI old-style join with comma but no WHERE → Cartesian.

```sql
SELECT e.id, o.id
FROM employees e, orders o;            -- no WHERE at all
```

**Internal working:** the join condition turns the "×" into a filter. Without it, the engine has no predicate and _must_ produce every pair — nested loop over everything.

**Contract:** the plan's row count is a giveaway: `employees (5) × orders (3) = 15` rows with no index lookups.

**BETTER:** always write explicit `JOIN ... ON ...`. Use a lint rule / reviewer checklist: _"every comma join must have a WHERE that references both tables."_

**Edge case — intentionally building a cross join** for a numbers table or a matrix: then be intentional about it:

```sql
SELECT a.id, b.id
FROM employees a CROSS JOIN employees b   -- clear intent, easy to review
WHERE a.id < b.id;
```

---

### P7. LEFT JOIN silently becoming INNER (ON vs WHERE)

**The mistake:** putting a `WHERE` filter on the _right_ (nullable-side) table. Every non-matching left row has `NULL` in those columns, so the filter kills it — and your LEFT JOIN is now semantically an INNER JOIN, but you keep counting left rows wrongly.

**BAD — "all employees with the count of their payments… but only payments over 30" is written as:**

```sql
SELECT e.name, COUNT(p.id) AS payments
FROM employees e
LEFT JOIN payments p ON p.order_id IN (SELECT id FROM orders WHERE customer_id = 55)
-- (contrived) more simply:
LEFT JOIN payments p ON p.id = ...
WHERE p.amount > 30;         -- NULLs filtered → employees with no payments disappear
```

A clean, realistic version:

```sql
SELECT e.name, COUNT(p.id) AS paid_count
FROM employees e
LEFT JOIN payments p ON p.id = e.id -- (grain mismatch aside, for the shape)
WHERE p.amount > 30;
```

Employees with no payment have `p.amount = NULL` → `NULL > 30` is `UNKNOWN` → filtered → **they vanish**. Result is identical to an inner join.

**BETTER — move the condition into the `ON`:**

```sql
SELECT e.name, COUNT(p.id) AS paid_count
FROM employees e
LEFT JOIN payments p
       ON p.id = e.id
      AND p.amount > 30;      -- keeps the LEFT row, counts only matching payments
```

**Rule:** conditions on the **preserved (left) table** belong in `WHERE`. Conditions on the **right table** that _narrow which rows are matched_ belong in `ON` if you want to preserve left rows.

**Interview trap:** "`LEFT JOIN` returns all rows from the left table." — Only if the right-side filters live in `ON`. A `WHERE` on the right table turns it into an inner join.

**Edge case — NULL keys:** joining on a `NULL` key never matches. If `employees.department_id` is NULLable and you left-join to departments, `NULL = dep.id` is `UNKNOWN` → no match → fine for LEFT JOIN behavior, but surprising in COUNTs.

**NULL behavior:** `COUNT(p.id)` counts non-NULL payments — correct here. `COUNT(p.id) = 0` and `SUM(p.amount)` returns NULL for employees with no payments (not 0) — a classic reporting bug. Wrap with `COALESCE(SUM(...), 0)`.

---

### P8. `DISTINCT` as a bandage for bad joins

**BAD:**

```sql
SELECT DISTINCT o.id, o.status
FROM orders o
JOIN order_items oi ON oi.order_id = o.id;   -- duplicate item rows force DISTINCT
```

The output is correct-ish (each order once), but:

- `DISTINCT` forces a **sort or hash** of the whole duplicated set — wasted work;
- it **hides** the fact that one-to-many produced duplicates;
- if the duplicate stretch is wide, memory spills to disk.

**BETTER — think about what an output row should be:**

```sql
SELECT o.id, o.status
FROM orders o
WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id);
```

Same result, no sort, no duplication, and the plan is obvious: for each order, an index seek proves existence.

**Rule of thumb:** if `DISTINCT` appears, ask: "did the joins introduce the duplicates?" If yes, remove the join (use EXISTS/subquery) instead of masking it.

---

### P9. `SELECT *` and over-fetching columns

**BAD:**

```sql
SELECT * FROM orders WHERE customer_id = 55;
```

Against a wide table (`created_at`, `eta`, `warehouse`, `customer_rating`, `payment_token`, `shipping_label`...), `SELECT *`:

- transfers **every column** to the client (network + memory);
- prevents a **covering index** from serving the query entirely (all columns must be fetched from the heap);
- shipped to a JSON/API layer, this is "read everything to produce 2 fields".

**BETTER:**

```sql
SELECT id, status, created_at FROM orders WHERE customer_id = 55;
```

**Even better, if this query runs hot:** a covering index:

```sql
CREATE INDEX idx_orders_customer_cov
  ON orders (customer_id) INCLUDE (status, created_at);   -- PostgreSQL
```

With `INCLUDE` (PostgreSQL/SQL Server), the engine reads **only the index** — no heap lookups.

**Production pitfall:** `SELECT *` combined with **JSON-typed columns**. Fetching a 2 MB JSON `config` blob in a list endpoint repeatedly will dwarf everything else in the query. Cap the columns explicitly.

> `SELECT *` is not "lazy programming that still works" — it's a contract that breaks when the schema adds an expensive column. Avoid in production SQL.

---

### P10. `COUNT(*)` where merely existence is needed

**Mistake 1 — existence check by counting:**

```sql
-- BAD: you just want to know "does this customer have any open orders?"
SELECT (SELECT COUNT(*) FROM orders WHERE customer_id = 55 AND status = 'open') > 0;
```

COUNT must visit every matching row. `EXISTS` stops at the first.

**BETTER:**

```sql
SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 55 AND status = 'open');
```

**Mistake 2 — `COUNT(*)` vs `COUNT(1)` vs `COUNT(column)`:**

| Expression   | Counts                      | NULL-sensitive                    |
| ------------ | --------------------------- | --------------------------------- |
| `COUNT(*)`   | all rows in group           | no                                |
| `COUNT(1)`   | all rows (constant per row) | no — identical plan to `COUNT(*)` |
| `COUNT(col)` | non-NULL values of `col`    | **yes**                           |

With the sample emails (`alice@x.com`, `NULL`, `alice@x.com`, `NULL`, `eve@x.com`):

```sql
SELECT COUNT(*) AS all_rows,          -- 5
       COUNT(email) AS with_email,    -- 3  (NULLs ignored)
       COUNT(DISTINCT email) AS uniq; -- 2  (duplicate alice@x.com collapsed)
```

**Interview trap:** "`COUNT(1)` is faster than `COUNT(*)`." — Modern optimizers treat them identically. The distinction that _matters_ is `COUNT(col)` ignoring NULLs.

**Performance tip:** `COUNT(DISTINCT x)` is expensive (sort/group) — for approximate counts some engines offer distinct estimators (PostgreSQL `approx_count_distinct`, Oracle `APPROX_COUNT_DISTINCT`).

---

### P11. Unnecessary or unindexed sorting

**Mistake 1 — ORDER BY on an expression the index can't serve:**

```sql
-- BAD: sorting by a function on the column
SELECT id FROM orders ORDER BY LOWER(status) LIMIT 10;
```

The engine cannot seek/reverse the index on `status`; it must scan, then sort all rows.

**BETTER:** sort by the bare column, or create a matching index / expression index if you must sort on the transform.

**Mistake 2 — sorting data you don't need sorted:**

```sql
-- BAD: huge sort on a column unused downstream
SELECT customer_id
FROM orders
ORDER BY created_at;              -- nothing uses the order!
```

**Mistake 3 — memory spill:** sorting `FROM big_table ORDER BY col` sorts _all rows_ in memory or spills to temp files (slow, IO-bound). A matching index on `col` lets the engine walk the index and skip the Sort node entirely.

**Best practice:** `ORDER BY` must match the _leading columns_ of an index for the sort to be avoided, and direction matters (`ASC/DESC`).

---

### P12. OFFSET pagination (deep page problem)

**BAD — offset past page 100k:**

```sql
SELECT id, created_at
FROM orders
ORDER BY created_at
LIMIT 20 OFFSET 400000;     -- engine must read + discard 400,020 rows
```

Each deep page re-reads and re-sorts everything before it. Cost is O(page × offset). This is the classic "pagination that gets slower the deeper you go."

**BETTER — keyset (seek) pagination.** Remember where the last page ended, and _seek forward_:

```sql
-- last row of previous page was created_at = '2024-06-01 14:22:00', id = 9999
SELECT id, created_at
FROM orders
WHERE (created_at, id) > ('2024-06-01 14:22:00', 9999)
ORDER BY created_at, id
LIMIT 20;
```

The `(created_at, id)` comparison uses an index and skips over the earlier rows entirely. Always tie with a unique column (`id`) so page boundaries are stable when `created_at` ties.

| Pagination style | Performance deep in the list | Handles new rows mid-pagination   |
| ---------------- | ---------------------------- | --------------------------------- |
| `OFFSET`         | degrades linearly            | may shift rows (duplicate/missed) |
| Keyset           | flat, index-only             | stable                            |

**Edge case:** keyset breaks if the sort key is not unique — hence the tie-breaker column.

**Best practice:** use `OFFSET` for small admin views; use keyset for real user-facing lists at scale.

---

### P13. Row-by-row processing (RBAR) and N+1 queries

**RBAR = "Row By Agonizing Row".** Iterating in a loop and issuing a SQL statement per row turns a 1-query problem into a 1+N-query problem, each re-planning, re-parsing, and re-checksummed.

**BAD (in application code):**

```python
for order in orders_from_api:
    rows = execute("SELECT SUM(qty) FROM order_items WHERE order_id = $1", order.id)
    ...
```

That's N round trips. The database can do it in one:

**BETTER:**

```sql
SELECT order_id, SUM(qty) AS items
FROM order_items
WHERE order_id = ANY(:order_ids)     -- or IN (...)
GROUP BY order_id;
```

**Bad inside SQL itself — cursors/loop in procedural SQL:**

```sql
-- BAD (SQL Server): iterate row-by-row to sum
DECLARE cur CURSOR FOR SELECT order_id, unit_price FROM order_items;
OPEN cur; FETCH NEXT ...  -- per-row work
```

**BETTER:** one `GROUP BY`.

**When a cursor legitimately wins:** genuinely order-dependent processes (running balances with rules that depend on previous step), batch transforms, or when the whole set can't fit in memory. Even then, look at **window functions** first (`SUM(...) OVER (ORDER BY ...)`), which handle running totals natively.

**Production pitfall:** N+1 is usually an **application-layer** problem — the fix is in the query layer (batch reads), not in `EXPLAIN`. Audit endpoints for loops issuing SQL.

---

### P14. Correlated subqueries — row-level re-evaluation

**BAD — correlated subquery in the SELECT list over a big driving set:**

```sql
SELECT e.id,
       e.name,
       (SELECT MAX(salary) FROM employees x WHERE x.department_id = e.department_id) AS dept_max
FROM employees e;
```

For each of the 5 employees, the subquery is (theoretically) evaluated → N evaluations. With 1M employees and no index on `department_id`, this is 1M index-less scans.

**BETTER — single pass with a window function:**

```sql
SELECT e.id, e.name,
       MAX(salary) OVER (PARTITION BY e.department_id) AS dept_max
FROM employees e;
```

**BETTER still for an aggregate the whole group needs — pre-aggregate and join:**

```sql
WITH dept_max AS (
  SELECT department_id, MAX(salary) AS m
  FROM employees GROUP BY department_id
)
SELECT e.id, e.name, d.m AS dept_max
FROM employees e
JOIN dept_max d ON d.department_id = e.department_id;
```

**Critical nuance — do NOT claim "correlated subqueries are always slow":**

> **Common misconception:** "Correlated subqueries are always slow." ✗ Modern optimizers (PostgreSQL ≥ 12) can **decorrelate** them into joins/antijoins and produce equivalent plans. The pitfall is only real when decorrelation fails (e.g., non-equi conditions, LIMIT inside). **Verify with the plan**, not with the superstition.

**When a correlated subquery is the _right_ choice:** `EXISTS` (which is exactly a correlated antijoin pattern for NOT EXISTS) — see P8/P16.

---

### P15. `NOT IN` with a NULL — the correctness + performance double trap

**The pitfall also cheaply answers "NULL behavior":**

```sql
-- BAD: "employees not in Engineering"
SELECT name
FROM employees
WHERE department_id NOT IN (SELECT id FROM departments WHERE name = 'Engineering');
```

**Result with the sample data:** an **empty set** — even though Bob, Dan, Eve, Frank (if present) are _not_ engineers. Why?

`department_id NOT IN (1, 2, NULL)` means
`department_id <> 1 AND department_id <> 2 AND department_id <> NULL`.
`<> NULL` is always `UNKNOWN`, so the whole conjunction is `UNKNOWN (NOT TRUE)` → every row is filtered.

Yes — `departments` needs a NULL, but the point is **the subquery must produce no NULLs**.

Actually in our sample, departments has no NULL id. Let's fix the demo: the subquery _does_ contain `NULL` if the column is nullable. In `employees`, suppose Frank has `department_id = NULL`:

```sql
-- departments: (1,Sales) (2,Engineering) (3,HR); subquery returns {1,2,3} — no NULL...
```

For a textbook-faithful demo, inject a NULL into the subquery result set:

```sql
SELECT name FROM employees
WHERE department_id NOT IN (SELECT id FROM departments WHERE name <> 'HR');   -- {1, 2}
```

still no NULL. The honest minimal demo:

```sql
-- add a row to departments with id = NULL (or make it nullable)
SELECT name FROM employees
WHERE department_id NOT IN (SELECT id FROM departments);
```

**The result is `0 rows`** whenever the subquery can return a NULL — regardless of data. This is both a **correctness bug** and, because of NULL-driven rewrites in some engines, an _unexpected_ plan.

**BETTER — `NOT EXISTS`:**

```sql
SELECT e.name
FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM departments d
                  WHERE d.id = e.department_id);
```

`NOT EXISTS` uses **anti-join semantics**: a row is kept unless a match is found. NULLs cannot flip the result:

| `e.name` | `NOT IN` result         | `NOT EXISTS` result                 |
| -------- | ----------------------- | ----------------------------------- |
| Alice    | filtered (dept matched) | filtered                            |
| Bob      | filtered                | ??? — Bob is in Sales, which exists |

Careful: in the sample every employee is in an existing department, so `NOT EXISTS` returns Group `{}` too. The _differentiator_ is an employee or department with a NULL. With a NULL employee `department_id`, `NOT IN` returns **0 rows for everyone**; `NOT EXISTS` returns them (no match found).

**Interview trap:** The question "what does `NOT IN (NULL)` return?" has a one-word answer for a non-NULL column:

```sql
SELECT 1 FROM orders WHERE status NOT IN (NULL);   -- 0 rows
SELECT 1 FROM orders WHERE status IN (NULL);    -- 0 rows
```

Both return nothing. `x IN (NULL)` = `x = NULL`, which is `UNKNOWN`.

**Performance angle:** for large sets, engines rewrite `NOT IN`/`NOT EXISTS` into an anti-join. Both can end up on the same plan. **Correctness, not speed, is the deciding factor:** prefer `NOT EXISTS` when the subquery column is nullable.

---

### P16. `IN`/`EXISTS` — when a huge `IN` list is the wrong shape

**BAD — a 50,000-entry literal list:**

```sql
SELECT * FROM orders WHERE customer_id IN (1000001, 1000002, ..., 1050000);
```

- Parse time grows with list length;
- the optimizer may treat the list as nearly-anything and pick a scan/hash;
- send the data as a **table/array** instead.

**BETTER — pass the list as data:**

```sql
SELECT o.*
FROM orders o
JOIN inbound_list l ON l.id = o.customer_id;     -- inbound_list is a temp / value table
```

**Or in PostgreSQL, convert in-server:**

```sql
SELECT * FROM orders WHERE customer_id = ANY(:big_array);
```

**The general rule (`IN` vs `EXISTS` vs `JOIN`):**

> **Common misconception:** "EXISTS is always faster than IN." ✗ With a small list, `IN` is clear and usually ends up the same plan as a semi-join. What matters is: _can the optimizer turn it into an index seek-per-probe_? For huge lists, materializing the values as a table usually beats a giant literal.

**Cardinality table:**

| Shape                 | Driving-side size | Probe index         | Typical plan                  |
| --------------------- | ----------------- | ------------------- | ----------------------------- |
| `IN (small)`          | small outer       | yes                 | semi-join / nested loop index |
| `IN (huge)`           | huge literal      | n/a                 | scan + hash                   |
| `JOIN` to value table | any               | index on fact table | nested loop or hash           |
| `EXISTS` correlated   | any               | index on inner      | loop with index               |

**Direction to verify:** whether the plan puts the _small_ relation on the outer side and leads with an index on the big one. That's what you check in the plan — not the keyword.

---

### P17. `WHERE` vs `HAVING` — filtering before grouping

**BAD — filtering aggregates you could filter first:**

```sql
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING department_id <> 1;      -- this is a row filter, not an aggregate filter
```

`HAVING` runs _after_ grouping, so it discards whole groups after the fact — the engine still reads and groups department 1's rows.

**BETTER — `WHERE` first:**

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE department_id <> 1
GROUP BY department_id;
```

The engine prunes rows **before** aggregation → fewer rows to group.

**Rules:**

| Need                                                      | Clause                    |
| --------------------------------------------------------- | ------------------------- |
| Row-level filter                                          | `WHERE` (before grouping) |
| Group-level filter (`COUNT(*) > 5`, `MAX(salary) > 9000`) | `HAVING` (after grouping) |

**Edge case:** `HAVING` without `GROUP BY` filters one implicit group:

```sql
SELECT COUNT(*) FROM employees HAVING MAX(salary) > 10000;   -- legal but almost never meant
```

**Performance nuance:** sometimes the optimizer pushes `WHERE` filters into the join/scan anyway — but writing it _where the cost is cheaper_ is the safe habit. Verify with the plan.

---

### P18. Aggregating before you join (join order poison)

**The mistake:** joining detail tables first, then aggregating, forcing the engine to materialize a joined behemoth.

Compare the fan-out fix in P5 — the reason it works:

```sql
-- BAD shape: join all, then GROUP BY (materializes items × payments)
SELECT order_id, SUM(qty * unit_price)
FROM order_items oi
JOIN payments p USING (order_id)
GROUP BY order_id;
```

**BETTER shape:** aggregate each source, then join:

```sql
SELECT li.order_id, li.value, p.paid
FROM (SELECT order_id, SUM(qty*unit_price) AS value
      FROM order_items GROUP BY order_id) li
JOIN (SELECT order_id, SUM(amount) AS paid
      FROM payments GROUP BY order_id) p USING (order_id);
```

Moral: **reduce cardinality before multiplying relations.** The optimizer _may_ rebuild the plan either way — but the pre-aggregated form gives it small inputs to join, avoids huge intermediate fingerprints, and (bonus) never produces fan-out.

---

### P19. Stale statistics / missing analyze / parameter sniffing

**Scenario: optimizer picks a bad plan because it believes wrong row counts.**

```sql
-- BAD: bulk load then immediately query
COPY employees FROM '.../big.csv';
SELECT ... FROM employees WHERE department_id = 2;
```

**BETTER:**

```sql
ANALYZE employees;      -- PostgreSQL/MySQL (MySQL: root-level ANALYZE TABLE)
-- SQL Server: sp_updatestats / AUTO_UPDATE_STATISTICS
-- Oracle: DBMS_STATS.GATHER_TABLE_STATS('app','EMPLOYEES')
```

**Parameter sniffing (SQL Server) / bind peeking (Oracle):** first execution of a stored procedure caches a plan optimized for _that parameter value_. A later value with different selectivity reuses the stale plan.

```sql
-- BAD pattern: parameter value used at compile time bakes cardinality into cached plan
CREATE PROC get_orders @cust INT AS
  SELECT * FROM orders WHERE customer_id = @cust;

EXEC get_orders 55;      -- plan tuned for one row
EXEC get_orders 999999;  -- same plan, now scans
```

**Mitigations** (engine-specific, use deliberately):

- `OPTION (RECOMPILE)` (SQL Server) when selectivity varies a lot;
- `OPTIMIZE FOR (...)` / `DBMS_STATS` histograms;
- **most importantly:** keep statistics fresh and histograms enabled.

**Best practice:** after any data-changing bulk operation, refresh stats. Monitoring stale-estimate warnings on slow dashboards is a common triage step.

---

### P20. Write-path pitfalls: over-indexing and duplicate indexes

**The mistake:** adding an index per "slow query" without looking at what already exists.

```sql
CREATE INDEX idx_o_cust   ON orders (customer_id);
CREATE INDEX idx_o_cust2  ON orders (customer_id, status);
-- idx_o_cust is now redundant for any query that could use idx_o_cust2
```

Every `INSERT`/`UPDATE`/`DELETE` on `orders` now must maintain **two** indexes. Middle-of-index updates (column changes on non-tail rows) cause page splits and write amplification.

**The three index sins:**

1. **Duplicate / redundant indexes** (same leading column, subsumed composites) — waste writes and disk.
2. **Rarely-used indexes** (dead indexes) — reads don't justify write cost.
3. **Indexes with the wrong leading column** — the query filters on column _N_ while the index leads with column _1_.

**BETTER — proactive design:**

```sql
-- One composite index serving several queries:
--   WHERE customer_id = ?            (prefix)
--   WHERE customer_id = ? AND status LIKE ...  (prefix + range)
--   WHERE customer_id = ? ORDER BY created_at  (prefix + sort)
CREATE INDEX idx_orders_cust_status_date
  ON orders (customer_id, status, created_at);
```

**Checklist before adding an index:**

1. Does a leading-prefix equivalent already exist?
2. What's the query's cardinality requested — is an index justified _at all_?
3. Is the write rate high enough that a dead index hurts?
4. Does the plan _actually_ use it after creation?

---

### P21. Using the wrong data type (dates-as-text, JSON, oversized types)

**BAD — storing dates as `TEXT`/`VARCHAR`:**

```sql
CREATE TABLE events (ts VARCHAR(30));   -- '2024-01-05 10:15:22'
-- Range queries become string compares; functions rewrite; no date math; no partition pruning.
```

**BETTER:**

```sql
CREATE TABLE events (ts TIMESTAMP WITH TIME ZONE);
```

- Correct **timestamp boundaries**: `ts >= '2024-01-05'` and `ts < '2024-01-06'` include a `00:00:00` bang-on boundary exactly once.
- **Timezone issues:** `TIMESTAMP WITH TIME ZONE` stores _an instant_; filtering "today in user's TZ" must convert the _boundary_ (a constant) — not each row:

```sql
-- BAD: per-row timezone conversion disables the index
WHERE date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
-- BETTER: compute the constant window outside the column
WHERE created_at >= now() AT TIME ZONE 'Asia/Kolkata'::...
      AND created_at < ...
```

> **Edge case:** a "plain" `TIMESTAMP` and `TIMESTAMP WITH TIME ZONE` look the same in a table dump but behave differently at midnight boundaries and DST. `2024-03-10 02:30 US/Eastern` doesn't exist; `2024-11-03 01:30 US/Eastern` happens twice. Testing across DST is mandatory for date logic.

**Integer division trap (data-type correctness on the optimizer's data):**

```sql
SELECT SUM(qty) / COUNT(*) AS avg_qty FROM order_items;  -- integer / integer
```

For orders 1001 (2+1) and 1002 (4): `7 / 3 = 2` in every engine that does **integer division** (SQL Server, MySQL, Oracle; PostgreSQL too between `int`/`int`). To force decimal, cast once:

```sql
SELECT SUM(qty) * 1.0 / COUNT(*) FROM order_items;   -- 2.33...
```

This is a "pitfall" because the wrong number is usually the _smaller_ concern — the data type you store decides whether the engine can even use an index on it.

---

### P22. Temp-table / spill blowups

**The mistake:** letting the engine materialize an enormous intermediate.

Patterns that spill:

- `DISTINCT` over a wide result (P8);
- `ORDER BY` over a large set without index support (P11);
- `GROUP BY` over a huge high-cardinality set;
- CTEs that the engine can't inline and must materialize;
- hash joins on memory.

```sql
-- BAD: GROUP BY over ~all high-cardinality rows forces a big hash/aggregate
SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;
-- fine at 10K rows; at 100M rows it becomes a serious hash/temp exercise
```

**Best practices:**

- filter aggressively before `GROUP BY`/`ORDER BY`;
- aggregate before you join (P18);
- for genuinely heavy analytics, consider materialized views / precomputed aggregates;
- watch `EXPLAIN (ANALYZE)` output for `temp file` / `Sort Method: external merge`.

**CTE misconception:** CTEs are _not generally materialized_ — in PostgreSQL (pre-13) and many engines they're inlined; later versions can materialize them. If a CTE is referenced multiple times, the engine decides whether hoisting it once is cheaper.

```sql
-- Materialized CTE (PostgreSQL 13+): "materialized" hint forces one evaluation
WITH c AS MATERIALIZED (SELECT ...) SELECT ... FROM c JOIN c ...
```

**Verify with the plan**, and note the cost model difference: _inlining vs materializing_ is an optimizer decision, not a "CTEs make it slower" law.

---

### P23. Treating every table as a candidate for denormalization

**The mistake:** solving slow reports by duplicating aggregates into columns "because it's faster," and creating **update anomalies**.

**Signs it's actually a schema pitfall:**

- an `order_items_total` column must be kept in sync on every line-item write;
- overnight batch "recompute" jobs that drift;
- orphaned stale values after backfills.

**BETTER:** keep base tables normalized (single source of truth), and let the DB provide the fast paths:

1. **Indexes** that cover report reads (P9);
2. **Materialized views** / **summary tables** refreshed transactionally or on schedule;
3. **Pre-aggregated warehouse tables** if the analytics are separate from OLTP.

**Interview trap:** "Denormalization is always faster than a JOIN." ✗ It moves the cost to write time and correctness — a classic **performance-vs-maintainability trade**. Measure, don't assume.

---

### P24. The optimizer can't fix what you never tell it — locking, isolation, and long transactions

Not strictly a "query" pitfall, but a top production cause of slow _feels_:

- A long-running transaction holds locks; other queries **block**, and the app times out while the DB is idle.
- At the default **READ COMMITTED**, each statement gets a new MVCC snapshot; a 10-minute report runs against a moving snapshot — time and isolation drift.
- Queries inside a transaction that then do application logic keep the transaction open, inflate locks, bloat vacuum/redo.

```sql
BEGIN;
UPDATE orders SET status = 'shipped' WHERE id = 1001;
-- ...seconds of application work here...
COMMIT;   -- locks held the whole time
```

**BETTER:** keep transactions short around the _writes_; do reads on a small `INTERVAL 'x'` with `SET TRANSACTION ISOLATION LEVEL READ ONLY`; batch row work into `UPDATE ... WHERE id IN (...)`.

**Cross-reference:** ACID, isolation levels, transactions section.

---

## 6. The pitfalls at a glance

| #   | Pitfall                   | Typical plan red flag        | Null/correctness risk | Default answer             |
| --- | ------------------------- | ---------------------------- | --------------------- | -------------------------- |
| P1  | Missing/incorrect index   | Seq scan on big table        | –                     | Add/inspect index          |
| P2  | Non-sargable predicate    | Scan + filter function       | boundary bugs         | Use bare columns + ranges  |
| P3  | Type mismatch             | Scan / implicit convert      | silent type coercion  | Match types                |
| P4  | `OR` across columns       | Scan                         | –                     | `UNION ALL` or index merge |
| P5  | Fan-out / double count    | ×N row count                 | **wrong numbers**     | Aggregate before join      |
| P6  | Missing JOIN condition    | Rows × all rows              | wrong numbers         | Explicit `ON`              |
| P7  | LEFT JOIN → INNER         | fewer rows than LEFT expects | lost left rows        | Filter in `ON`             |
| P8  | `DISTINCT` bandage        | Sort/Hash                    | masks duplication     | EXISTS instead             |
| P9  | `SELECT *`                | Heap fetch + big transfer    | LOB/JSON blobs        | List columns               |
| P10 | COUNT for existence       | Loops over all matches       | UX/logic bug          | `EXISTS`                   |
| P11 | Sorting                   | Sort over scan               | –                     | index/key sort             |
| P12 | OFFSET pagination         | Sort + discard               | row-shift             | Keyset                     |
| P13 | RBAR / N+1                | N query plans                | –                     | Set-based SQL              |
| P14 | Correlated subqueries     | N re-evals                   | –                     | Window/join (verify)       |
| P15 | `NOT IN` + NULL           | anti-join quirks             | **empty result**      | `NOT EXISTS`               |
| P16 | Huge `IN` lists           | parse/hash                   | –                     | Value table / ANY          |
| P17 | `HAVING` as filter        | rows grouped then dropped    | –                     | `WHERE` first              |
| P18 | Join then aggregate       | big intermediate             | fan-out               | aggregate then join        |
| P19 | Stale stats / sniffing    | misestimated plan            | –                     | refresh stats / recompile  |
| P20 | Over-indexing             | extra write cost             | –                     | design / audit indexes     |
| P21 | Wrong data types          | no index on text dates       | **integer division**  | use native types           |
| P22 | Spill blowups             | temp file, external sort     | –                     | filter/reduce first        |
| P23 | Premature denormalization | –                            | **update anomalies**  | normalize + MV             |
| P24 | Long transactions         | blocking waits               | snapshot drift        | short transactions         |

---

## 7. Best practices checklist

Before optimizing:

1. **Confirm the result is correct** on a sample set. (Fast wrong answers have zero value.)
2. State the **grain of each table** and the grain of the requested output row.
3. Ask the SQL-reasoning checklist: driving table, duplicates, aggregation, NULL, ON-vs-WHERE, Cartesian risk, zero/multi-match risk, index candidates.
4. **EXPLAIN** both before and after. Never ship an optimization reasoned about only in your head.
5. Keep changes **measurable**: compare rows-processed, plans, and latency on representative data (not dev toy sets).

Optimization that survives production:

- Sargable predicates; range predicates where possible.
- Filter before joining, before grouping, before sorting.
- Aggregate to the right grain; join at that grain.
- Prefer `EXISTS`/`NOT EXISTS` for existence logic and against nullable subquery output.
- Dedupe, prune, and reuse indexes — including covering and composite leading-column design.
- Keyset pagination for deep lists; no `SELECT *` on hot paths.
- Fresh statistics; watch for parameter-sniffing forks in the plan.
- Keep transactions short; batch writes.
- Never denormalize without measuring (and documenting) the update path.

---

# Interview Questions

## Beginner

1. What does `EXPLAIN` / execution plan show, and why should a beginner look at it?
2. Why is `WHERE YEAR(created_at) = 2024` usually slower than `WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'`?
3. What is a full table scan, and when might the optimizer choose it even when an index exists?
4. Why is `SELECT *` on a production hot path a performance problem?
5. What's the difference between `COUNT(*)`, `COUNT(1)`, and `COUNT(col)` — performance and semantics?
6. What is a Cartesian product, and how do you prevent it?

## Intermediate

7. Explain sargability. List five predicates that are not sargable.
8. What is the leading-column rule for composite indexes? Give a query that can't use `(status, created_at)`.
9. `LEFT JOIN` returned fewer rows than expected. Where in the query would you look first, and why?
10. Compare `IN`, `EXISTS`, and `JOIN` for existence checks. Under what conditions could "EXISTS faster than IN" be false?
11. Why does `DISTINCT` often hide a join bug, and what plan nodes does it force?
12. What is fan-out in a join, and how do you write a query that reports per-order line value _and_ per-order payment amount without double counting?
13. OFFSET pagination is slow at page 50,000. What is the alternative and why is it faster?

## Advanced

14. Explain how a stale histogram can make a "perfectly written" query slow. What do you check and fix?
15. What is parameter sniffing / bind peeking? Give one scenario where `OPTION (RECOMPILE)` helps and one where it hurts.
16. When can a correlated subquery be just as fast as a join, and when does it become row-by-row work?
17. When is a covering index worth it, and what's the cost when you add one to a write-heavy table?
18. A query has a huge row estimate vs actuals. Walk through how you'd investigate (stats, plan, data distribution) and fix it.
19. Under what conditions does the optimizer choose hash vs nested-loop vs merge join, and how does each degrade?

## Scenario Based

20. Your reporting query joins `orders → order_items → payments` and returns inflated totals for order 1001 (2 items, 2 payments). Diagnose and fix.
21. A dashboard query filters orders by `status = 'open' AND created_at BETWEEN ...`, and `EXPLAIN` shows a seq scan on 40M rows. What are your hypotheses and what do you check first?
22. MySQL/SQL Server/PostgreSQL: `WHERE id = 'abc123'` where `id` is `INT`. What happens, and how do you confirm?
23. Users browse a list sorted by `created_at DESC` with `OFFSET 100000 LIMIT 20`. Rewrite to keyset and explain the difference.
24. A stored procedure is fast for one customer and slow for another with the same code. Explain possible causes and how to diagnose.

## Tricky

25. `SELECT * FROM t WHERE col NOT IN (NULL);` — how many rows?
26. `SELECT COUNT(*) FROM employees WHERE department_id IS NULL` — your answer and why it's not a performance problem.
27. A query is fast in the morning and slow after a big bulk load. What happened?
28. Explain why "adding an index to every query" is itself a production performance pitfall.
29. `WHERE status NOT IN ('open') AND status IS NOT NULL` on a non-nullable column — is it optimized correctly, and which part is redundant?

## Output Prediction

For each, predict the exact output before running.

**Q30.**

```sql
SELECT COUNT(*) all_rows,
       COUNT(email) with_email,
       COUNT(DISTINCT email) uniq_email
FROM employees;
```

(Sample data emails: `alice@x.com`, `NULL`, `alice@x.com`, `NULL`, `eve@x.com`.)

**Q31.**

```sql
SELECT CASE WHEN 100 IN (100, NULL)  THEN 'in'   ELSE 'not in'   END AS a,
       CASE WHEN 100 NOT IN (50, NULL) THEN 'not in' ELSE 'in'   END AS b,
       CASE WHEN NULL = NULL THEN 'eq' ELSE 'ne' END AS c;
```

**Q32.**

```sql
SELECT COUNT(*) FROM order_items;      -- 3 items in sample
SELECT COUNT(DISTINCT order_id) FROM order_items;
SELECT SUM(qty) / COUNT(*) FROM order_items;      -- integer division
SELECT SUM(qty) * 1.0 / COUNT(*) FROM order_items;
```

**Q33.**

```sql
SELECT o.id, COUNT(p.id) AS payments
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
WHERE p.amount > 0
GROUP BY o.id;
```

(Sample: orders 1001, 1002, 1003; payments: 1001→15, 1001→5, 1002→40.)

**Q34.**

```sql
SELECT COALESCE(SUM(amount), 0) AS paid
FROM payments WHERE order_id = 999;      -- no such order
SELECT MAX(salary) FROM employees WHERE department_id = 99;  -- no such dept
```

**Q35.**

```sql
WITH x AS (SELECT 1 AS n WHERE FALSE)
SELECT (SELECT COUNT(*) FROM x) AS a,
       (SELECT COUNT(1) FROM x) AS b,
       EXISTS (SELECT 1 FROM x) AS c;
```

## Debugging

36. Query runs forever on a 10M-row table; the plan shows a scan and then a sort. List the ordered steps you take, and what you _don't_ do.
37. `EXPLAIN` shows `Seq Scan` on the right side of a nested loop. What does that mean for the loop's cost, and what two fixes exist?
38. `EXPLAIN (ANALYZE)` shows `actual rows=1,000,000  estimated rows=1,000`. Which knob explains this, and what do you do?
39. A pagination API returns duplicate rows between pages after a live insert. Which page-boundary decision caused it, and how do you fix it deterministically?
40. A LEFT JOIN to `payments` shows 0 payments for an order that clearly has payments. Where in the plan/where clause would you hunt?

## Performance

41. Optimize: `SELECT DISTINCT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'open';`
42. Optimize: `SELECT * FROM orders WHERE customer_id = 55 ORDER BY created_at DESC LIMIT 20;` (index candidates)
43. Rewrite to avoid double counting: `SELECT o.id, SUM(oi.qty * oi.unit_price), SUM(p.amount) FROM orders o JOIN order_items oi ON ... JOIN payments p ON ... WHERE o.id = 1001 GROUP BY o.id;`
44. Which is better for the deep-pages list, `ORDER BY created_at OFFSET 100000 LIMIT 20` or a keyset predicate — and what's the index `(created_at, id)` buying?
45. 1M employees, one overpaying report calls `SELECT * FROM employees` into a Python app that sums salaries and sends the total. Given the report only needs `SUM(salary)`, what should the query be, and what plan node disappears?

---

## Answer Key (attempt the questions first)

- **Q30:** `5 | 3 | 2` (`COUNT(*)` counts rows; `COUNT(email)` skips NULLs; `COUNT(DISTINCT email)` collapses the duplicate `alice@x.com`).
- **Q31:** `a='in'` (`100 = 100` is TRUE, OR with UNKNOWN is TRUE); `b='not in'` — wait: `100 NOT IN (50, NULL)` = `100<>50 AND 100<>NULL` = `TRUE AND UNKNOWN` = `UNKNOWN` → reverted to `'in'`-branch? No: CASE `WHEN` requires the condition to be TRUE; UNKNOWN is not TRUE, so `b` falls to `ELSE 'in'`. `c='ne'` (`NULL = NULL` is UNKNOWN → ELSE).
- **Q32:** `3 | 2 | 2 | 2.33...` — integer division gives `7/3 = 2`; the `* 1.0` version gives `2.33`.
- **Q33:** `(1001,2)  (1002,1)` — **1003 disappears** because `WHERE p.amount > 0` turned the LEFT JOIN into an inner join (P7).
- **Q34:** `0` (COALESCE converts the NULL SUM) and `NULL` (MAX over empty set is NULL — no COALESCE).
- **Q35:** `a=0, b=0, c=false` — an empty relation has 0 rows; `EXISTS` over empty is false.
- For the debugging/performance items, the "answer" is your full debrief: state grain, read the plan nodes left-to-right, spot the scan/sort/fan-out, propose the smallest correct fix, and re-verify with `EXPLAIN ANALYZE`.
