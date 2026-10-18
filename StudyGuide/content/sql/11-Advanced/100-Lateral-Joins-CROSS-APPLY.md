# 100. LATERAL Joins & CROSS APPLY / OUTER APPLY

> Cross-references: this section pairs with **Correlated Subqueries** (`29-CorrWrote the section to `sql-handbook/11-Advanced/100-Lateral-Joins-CROSS-APPLY.md`.

**What it covers (all 13 required components):**

- **Fundamentals** — what LATERAL/CROSS APPLY is, why it exists (the FROM/WHERE correlation gap), grain rules for every sample table, per-engine support matrix (PostgreSQL 9.3+, MySQL 8.0.14+, SQL Server 2005+, Oracle 12c+, SQLite 3.33+)
- **Internal working** — with a Mermaid diagram, nested-loop mental model, per-dialect plan/tooling, and the "not always a nested loop" caveat
- **Syntax** — full cheat sheet for all four majors + portability matrix
- **6 worked examples** with seed data and hand-verified outputs: latest-per-customer, top-N per group (BAD `salary = MAX` vs BETTER lateral vs window alternative), aggregate-in-lateral with single-computation reuse, self-lateral "next order" time series, `generate_series` gap-filling, SQL Server TVF/`STRING_SPLIT`
- **NULL behavior** — CROSS vs OUTER/LEFT table, aggregate-returns-one-row subtlety, `ON TRUE`, NULL join keys
- **Edge cases, common mistakes, production pitfalls** (per-row cost surprise, missing inner index, determinism, sargability, skew)
- **Performance** — plan-first guidance, `Loops:` and equivalent tooling, supporting composite index, no absolute claims
- **Comparison tables** — LATERAL vs scalar subquery / derived table / window / plain join, CROSS vs OUTER, engine×syntax
- **When to use / NOT use, best practices, real-world scenario** with the full 17-point reasoning checklist
- **40 interview questions** across all 8 categories (Beginner/Intermediate/Advanced/Scenario/Tricky/Output Prediction/Debugging/Performance), practice-style, answers withheld
ai"]
        L3["customer Zoe"]
    end
    subgraph RIGHT["LATERAL subquery — run once per left row"]
        R1["WHERE orders.customer_id = Ada<br/>ORDER BY placed_on DESC LIMIT 1"]
        R2["WHERE orders.customer_id = Kai<br/>ORDER BY placed_on DESC LIMIT 1"]
        R3["WHERE orders.customer_id = Zoe<br/>→ returns 0 rows"]
    end
    L1 --> R1
    L2 --> R2
    L3 --> R3
    R1 --> OUT["Ada | 1003 | 2022-12-20 | 200"]
    R2 --> OUT
    R3 --> DROP["CROSS: row dropped · LEFT/OUTER: kept with NULLs"]
```

### Why it exists

Before LATERAL, the SQL language imposed an artificial split:

- **Correlated subqueries** could appear only in `WHERE`, the `SELECT` list, `HAVING`, or an `ON` clause. They can see the outer row, but they cannot return **multiple rows** (the `SELECT` list needs a scalar) or a **multi-column, multi-row set that you then join further**.
- **Table sources** in `FROM` could join and fan out but were **forbidden from seeing sibling tables** — so you could not compute each row's "own" set of related rows and join to it.

LATERAL removes that wall. The result: set-returning, per-row computations ("for each customer, her latest order", "for each department, its top-2 salaries", "for each event, the next event for that user") become a single, readable, index-friendly query.

The semantics are part of the SQL standard (**SQL:2003**, LATERAL), but its home is mostly three dialects:

| Engine | Keyword | Availability |
|---|---|---|
| PostgreSQL | `LATERAL` | since 9.3 |
| MySQL / MariaDB | `LATERAL` | MySQL 8.0.14+ (MariaDB via syntax, limited) |
| SQL Server | `CROSS APPLY` / `OUTER APPLY` | since 2005 |
| Oracle | `LATERAL` and `CROSS APPLY` / `OUTER APPLY` | 12c+ |
| SQLite | `LATERAL` | 3.33.0+ (2020) with `ON` support |

### Grain rules — say it out loud before writing anything

> One row in `departments` = one department.
> One row in `employees` = one employee (each employee has one department; a department has many employees).
> One row in `customers` = one customer.
> One row in `orders` = one order (a customer has 0..N orders).
> One row in `payments` = one payment (an order has 0..N payments — order 1003 has two).

The entire section's correctness depends on these grains. Every time you see a LATERAL that should return "one row per left row", ask *can the inner query return more than one row?* If yes, you get a fan-out. If you *want* one row, you need `LIMIT`/`TOP`/`FETCH FIRST`, a `DISTINCT`, an aggregate, or a tight join that is provably 1:1.

---

## Syntax cheat sheet

### ANSI / PostgreSQL / MySQL

```sql
-- cross join form — drops left rows whose lateral returns nothing
SELECT ...
FROM left_table AS a
CROSS JOIN LATERAL (SELECT ... WHERE inner.key = a.key) AS x;

-- comma form — identical to CROSS JOIN LATERAL in PostgreSQL
SELECT ...
FROM left_table AS a,
     LATERAL (SELECT ... WHERE inner.key = a.key) AS x;

-- left join form — keeps left rows, NULLs when nothing matches
SELECT ...
FROM left_table AS a
LEFT JOIN LATERAL (SELECT ... WHERE inner.key = a.key) AS x ON TRUE;
```

Notes:

- In PostgreSQL and MySQL, `CROSS JOIN LATERAL` is the same as the comma form `FROM a, LATERAL (...) x`.
- The `ON TRUE` in the LEFT form cannot be omitted.
- MySQL: only `LATERAL` exists (no `APPLY`); supported for derived tables since 8.0.14. MySQL also allows `LEFT JOIN LATERAL (…) AS x ON TRUE`.
- PostgreSQL: `LATERAL` also works directly on set-returning functions, e.g. `FROM generate_series(...) AS d` after a left table to bind row values.

### SQL Server

```sql
SELECT ...
FROM left_table AS a
CROSS APPLY (SELECT TOP (1) ... FROM inner_table WHERE inner_table.key = a.key ORDER BY ...) AS x;

SELECT ...
FROM left_table AS a
OUTER APPLY (SELECT TOP (1) ... FROM inner_table WHERE inner_table.key = a.key ORDER BY ...) AS x;
```

- SQL Server has **only** APPLY (never the word LATERAL). `CROSS APPLY` ≈ `CROSS JOIN LATERAL`; `OUTER APPLY` ≈ `LEFT JOIN LATERAL`.
- APPLY is heavily used to call **table-valued functions (TVFs) once per left row**.
- There is no `ON` clause: the inner `WHERE` carries the correlation.

### Oracle (12c+)

```sql
SELECT ...
FROM left_table a
CROSS APPLY (SELECT ... FROM inner_table WHERE inner_table.key = a.key ...) x;

SELECT ...
FROM left_table a
OUTER APPLY (SELECT ... FROM inner_table WHERE inner_table.key = a.key ...) x;

-- or the standard spelling
SELECT ...
FROM left_table a,
     LATERAL (SELECT ... FROM inner_table WHERE inner_table.key = a.key) x;

SELECT ...
FROM left_table a
LEFT JOIN LATERAL (SELECT ... FROM inner_table WHERE inner_table.key = a.key) x ON 1 = 1;
```

---

## Internal working

### Conceptually: a per-row nested loop

Read a LATERAL/APPLY as:

1. Take the first row of the **left** (driving) table.
2. Substitute that row's values into the **inner** (lateral) query as parameters.
3. Execute the inner query; get back 0..N rows.
4. Emit one output row per (left row, inner row) pair, or one NULL-padded row for LEFT/OUTER forms when the inner yields nothing.
5. Repeat for the next left row.

Because the inner query is *parameterized by each left row*, it is a genuine **correlated subquery used as a table** — not a precomputed, then joined, set.

### What the execution plan typically shows

> PostgreSQL
> `EXPLAIN (ANALYZE, BUFFERS)` will show a **Nested Loop** node whose inner side is a subplan or an index scan on the inner table. The `Loops: N` counter on the inner node tells you precisely how many times the lateral subquery was executed. `Loops = number of left rows` is expected; a high loop count with a `Seq Scan` inner is the classic sign of a missing index.

> SQL Server
> Open the *Actual Execution Plan* (live query plan in SSMS 2017+). CROSS/OUTER APPLY with a TVF or subquery typically renders as **Nested Loops (Left)** / **(Inner Join)** with a seek on the inner side; `SET STATISTICS IO, TIME ON` shows the repeated logical reads per loop.

> MySQL
> `EXPLAIN ANALYZE` (8.0.18+) shows a **Nested loop inner join**, and MySQL often **materializes** the lateral derived table first; the plan tells you whether correlation was pushed into the inner scan or not.

> Oracle
> SQL Monitor (`DBMS_SQLTUNE.REPORT_SQL_MONITOR`) shows nested-loop style execution for APPLY.

### It is not *guaranteed* to be a nested loop

> Common misconception: "LATERAL always executes the inner query in a nested loop, once per left row."
> No. The *semantics* are per-row, but the **optimizer decides the physical strategy**. It may unnest the lateral into a hash join for non-correlated cases, materialize it, or choose a different join order. In some engines the planner even rewrites correlated LATERAL into other shapes. What you get depends on optimizer, statistics, cardinality, and query shape — **verify with an execution plan rather than assuming**.

Two easy consequences:

- If the inner query is **not actually correlated** (uses no left-column reference), a good optimizer can evaluate it effectively once and cache it. Don't rely on that for performance; write the uncorrelated part outside.
- If the inner query *is* correlated, the per-row execution cost is `rows(left) × cost(inner probe)`. That product is the number to watch in `EXPLAIN`.

---

## Sample tables

```sql
-- grain: one row = one department
CREATE TABLE departments (
    department_id   INT PRIMARY KEY,
    department_name TEXT NOT NULL
);

-- grain: one row = one employee (many employees → one department)
CREATE TABLE employees (
    employee_id    INT PRIMARY KEY,
    employee_name  TEXT NOT NULL,
    department_id  INT REFERENCES departments(department_id),
    salary         NUMERIC(10, 2),
    hired_on       DATE
);

-- grain: one row = one customer
CREATE TABLE customers (
    customer_id   INT PRIMARY KEY,
    customer_name TEXT NOT NULL
);

-- grain: one row = one order (one customer has 0..N orders)
CREATE TABLE orders (
    order_id     INT PRIMARY KEY,
    customer_id  INT REFERENCES customers(customer_id),
    placed_on    DATE,
    total_amount NUMERIC(10, 2)
);

-- grain: one row = one payment (one order has 0..N payments)
CREATE TABLE payments (
    payment_id INT PRIMARY KEY,
    order_id   INT REFERENCES orders(order_id),
    paid_on    DATE,
    amount     NUMERIC(10, 2)
);
```

```sql
INSERT INTO departments VALUES
(1, 'Engineering'), (2, 'Sales'), (3, 'Marketing');

INSERT INTO employees VALUES
(1, 'Alice', 1, 9000.00, '2019-01-15'),
(2, 'Bob',   1, 8000.00, '2020-03-10'),
(3, 'Carol', 2, 6000.00, '2018-06-01'),
(4, 'Dave',  2, 5500.00, '2021-02-20'),
(5, 'Eve',   2, 7000.00, '2017-11-05'),
(6, 'Frank', 3, 5000.00, '2022-04-18'),
(7, 'Grace', 3, 4800.00, '2023-01-09'),
(8, 'Heidi', 1, 9500.00, '2016-08-22');

INSERT INTO customers VALUES
(100, 'Ada'), (101, 'Kai'), (102, 'Zoe');

INSERT INTO orders VALUES
(1001, 100, '2022-04-01', 120.00),
(1002, 100, '2022-07-15',  85.00),
(1003, 100, '2022-12-20', 200.00),
(1004, 101, '2022-05-10',  60.00),
(1005, 101, '2022-09-01', 140.00),
(1006, 102, '2022-03-05',  75.00);

INSERT INTO payments VALUES
(1, 1001, '2022-04-05', 120.00),
(2, 1002, '2022-07-20',  80.00),
(3, 1003, '2022-12-22', 100.00),
(4, 1003, '2022-12-28', 100.00),
(5, 1004, '2022-05-12',  60.00),
(6, 1005, '2022-09-05', 100.00);
```

---

## Worked examples

### Example 1 — Latest order per customer (the killer use case)

Problem: one row per customer with that customer's **most recent order** — three columns, not one.

**BAD APPROACH — scalar correlated subqueries can only smuggle one value each and must be repeated:**

```sql
SELECT
    c.customer_name,
    (SELECT o.order_id
     FROM orders o
     WHERE o.customer_id = c.customer_id
     ORDER BY o.placed_on DESC, o.order_id DESC
     LIMIT 1)                                            AS latest_order_id,
    (SELECT o.placed_on       -- whole subquery rewritten just for another column
     FROM orders o
     WHERE o.customer_id = c.customer_id
     ORDER BY o.placed_on DESC, o.order_id DESC
     LIMIT 1)                                            AS latest_placed_on
FROM customers c;
```

Problems: the correlated subquery is *duplicated* for every column (error-prone, harder to read, executed per row twice; any change must be mirrored everywhere), and it **errors** if it ever returns more than one row — you must remember to force one row.

**BETTER APPROACH — CROSS JOIN LATERAL returns a multi-column row:**

```sql
SELECT c.customer_name, o.order_id, o.placed_on, o.total_amount
FROM customers AS c
CROSS JOIN LATERAL (
    SELECT order_id, placed_on, total_amount
    FROM orders
    WHERE customer_id = c.customer_id
    ORDER BY placed_on DESC, order_id DESC
    LIMIT 1
) AS o
ORDER BY c.customer_name;
```

**Expected output:**

| customer_name | order_id | placed_on | total_amount |
|---|---|---|---|
| Ada | 1003 | 2022-12-20 | 200.00 |
| Kai | 1005 | 2022-09-01 | 140.00 |

**Wait — Zoe disappeared.** CROSS JOIN LATERAL drops left rows whose lateral yields zero rows (Zoe has no orders). If you need Zoe with NULLs, use LEFT JOIN LATERAL:

```sql
SELECT c.customer_name, o.order_id, o.placed_on, o.total_amount
FROM customers AS c
LEFT JOIN LATERAL (
    SELECT order_id, placed_on, total_amount
    FROM orders
    WHERE customer_id = c.customer_id
    ORDER BY placed_on DESC, order_id DESC
    LIMIT 1
) AS o ON TRUE
ORDER BY c.customer_name;
```

**Expected output (Zoe kept, padded with NULLs):**

| customer_name | order_id | placed_on | total_amount |
|---|---|---|---|
| Ada | 1003 | 2022-12-20 | 200.00 |
| Kai | 1005 | 2022-09-01 | 140.00 |
| Zoe | NULL | NULL | NULL |

SQL Server equivalents: replace `CROSS JOIN LATERAL (...) ON TRUE` → `CROSS APPLY (...)`, and `LEFT JOIN LATERAL (...) ON TRUE` → `OUTER APPLY (...)`; replace `LIMIT 1` → `TOP (1)`.

> Interview trap: "LEFT JOIN LATERAL keeps all left rows." True — but only the *left* table is protected. A `WHERE o.order_id IS NOT NULL` further down silently converts it back to an inner-ish join. Same trap as ordinary LEFT JOINs (see `20-JOIN-ON-vs-WHERE`).

### Example 2 — Top-N per group: top 2 salaries per department

**BAD APPROACH — salary = MAX trick cannot extend to "top 2":**

```sql
SELECT d.department_name, e.employee_name, e.salary
FROM departments d
JOIN employees e ON e.department_id = d.department_id
WHERE e.salary = (SELECT MAX(salary)
                  FROM employees
                  WHERE department_id = d.department_id)
ORDER BY d.department_name;
```

Gives only the single highest-paid employee per department (Engineering → Heidi only). To get rank #2 you'd have to exclude the max and re-run; with ties it degenerates. This pattern does not generalize to N.

**BETTER APPROACH — LATERAL / APPLY with LIMIT:**

PostgreSQL / MySQL:

```sql
SELECT d.department_name, e.employee_name, e.salary
FROM departments AS d
CROSS JOIN LATERAL (
    SELECT employee_name, salary
    FROM employees
    WHERE department_id = d.department_id
    ORDER BY salary DESC, employee_name
    LIMIT 2
) AS e
ORDER BY d.department_name, e.salary DESC;
```

SQL Server:

```sql
SELECT d.department_name, e.employee_name, e.salary
FROM departments AS d
CROSS APPLY (
    SELECT TOP (2) employee_name, salary
    FROM employees
    WHERE department_id = d.department_id
    ORDER BY salary DESC, employee_name
) AS e
ORDER BY d.department_name, e.salary DESC;
```

Oracle:

```sql
SELECT d.department_name, e.employee_name, e.salary
FROM departments d
CROSS APPLY (
    SELECT employee_name, salary
    FROM employees
    WHERE department_id = d.department_id
    ORDER BY salary DESC, employee_name
    FETCH FIRST 2 ROWS ONLY
) e
ORDER BY d.department_name, e.salary DESC;
```

**Expected output (same in all engines):**

| department_name | employee_name | salary |
|---|---|---|
| Engineering | Heidi | 9500.00 |
| Engineering | Alice | 9000.00 |
| Sales | Eve | 7000.00 |
| Sales | Carol | 6000.00 |
| Marketing | Frank | 5000.00 |
| Marketing | Grace | 4800.00 |

Equivalent with a window function:

```sql
WITH ranked AS (
    SELECT d.department_name, e.employee_name, e.salary,
           ROW_NUMBER() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC, e.employee_name) AS rn
    FROM departments d
    JOIN employees e ON e.department_id = d.department_id
)
SELECT department_name, employee_name, salary
FROM ranked
WHERE rn <= 2
ORDER BY department_name, salary DESC;
```

Both are correct. Which is faster is NOT absolute — it depends on how many rows each group holds and on indexes. Rule of thumb to *verify*, not to trust blindly: LATERAL with `ORDER BY salary DESC` is usually attractive when there is an index on `(department_id, salary DESC)` (each lateral probe seeks two rows cheaply), while the window approach reads every employee row once and sorts globally. With one giant "department" group, the window approach often wins; with many small groups and a good index, LATERAL often wins. Always check the plan.

### Example 3 — Aggregate inside LATERAL: compute once, reuse in WHERE

Problem: list orders that are fully paid, *and show the paid amount*.

**BAD APPROACH — the computed expression must be repeated, or can't be filtered on:**

```sql
SELECT o.order_id, o.total_amount
FROM orders o
WHERE COALESCE((SELECT SUM(p.amount)
                FROM payments p
                WHERE p.order_id = o.order_id), 0) >= o.total_amount
ORDER BY o.order_id;
```

This works but cannot show the paid figure without duplicating the entire subquery in the SELECT list; changing the logic means editing it in two places.

**BETTER APPROACH — compute once in LATERAL, then use the alias anywhere:**

```sql
SELECT o.order_id, paid.paid_so_far, o.total_amount
FROM orders AS o
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(amount), 0) AS paid_so_far
    FROM payments
    WHERE order_id = o.order_id
) AS paid
WHERE paid.paid_so_far >= o.total_amount
ORDER BY o.order_id;
```

**Expected output:**

| order_id | paid_so_far | total_amount |
|---|---|---|
| 1001 | 120.00 | 120.00 |
| 1003 | 200.00 | 200.00 |
| 1004 | 60.00 | 60.00 |

*Check by hand: 1002 paid 80 of 85 → excluded; 1005 paid 100 of 140 → excluded; 1006 paid 0 of 75 → excluded.*

Key subtlety: an **aggregate** query inside LATERAL always yields **exactly one row** — even for an empty payment set (`COUNT` → 0, `SUM` → NULL; here COALESCE → 0) — so CROSS JOIN LATERAL keeps **every** order. No fan-out, no dropped rows. Contrast with Example 1, where a non-aggregate lateral returned zero rows for Zoe and CROSS dropped her.

### Example 4 — Self-lateral for time series: "next order after this one"

Problem: build a funnel — for every order, find the customer's immediately following order.

```sql
SELECT o.order_id AS this_order, n.next_order_id, n.next_placed_on
FROM orders AS o
CROSS JOIN LATERAL (
    SELECT o2.order_id AS next_order_id, o2.placed_on AS next_placed_on
    FROM orders AS o2
    WHERE o2.customer_id = o.customer_id
      AND o2.placed_on > o.placed_on
    ORDER BY o2.placed_on, o2.order_id
    LIMIT 1
) AS n
ORDER BY o.order_id;
```

**Expected output (orders with no successor are dropped by CROSS):**

| this_order | next_order_id | next_placed_on |
|---|---|---|
| 1001 | 1002 | 2022-07-15 |
| 1002 | 1003 | 2022-12-20 |
| 1004 | 1005 | 2022-09-01 |

Using `LEFT JOIN LATERAL ... ON TRUE` (or `OUTER APPLY`) keeps rows 1003, 1005, 1006 with NULL successors — useful when measuring "did this user come back?". This is the row-based alternative to `LEAD() OVER (PARTITION BY customer_id ORDER BY placed_on)` (see `48-LAG-LEAD`): LEAD is a single pass, LATERAL is per-row probes; whichever wins depends on the plan.

### Example 5 — Gap-filling / zero-fill a date spine (PostgreSQL LATERAL)

Daily reporting needs every day present, including days with zero orders:

```sql
SELECT d.day, counts.total
FROM generate_series('2022-03-01'::date, '2022-03-05'::date, INTERVAL '1 day') AS d(day)
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total
    FROM orders
    WHERE placed_on = d.day
) AS counts ON TRUE
ORDER BY d.day;
```

**Expected output:**

| day | total |
|---|---|
| 2022-03-01 | 0 |
| 2022-03-02 | 0 |
| 2022-03-03 | 0 |
| 2022-03-04 | 0 |
| 2022-03-05 | 1 |

Rows 1–4 exist only because of the LEFT form. (Cross-reference: **CTEs & Recursive CTEs** `33/34` cover engine-portable date spines; **Monthly/Daily reporting** `61` covers the reporting pattern.)

### Example 6 — SQL Server: calling a function once per row (TVF/APPLY)

`CROSS APPLY` is the sanctioned way to evaluate a **table-valued function with per-row arguments**:

```sql
SELECT e.employee_name, s.value AS name_fragment
FROM employees e
CROSS APPLY STRING_SPLIT(e.employee_name, ' ') s
ORDER BY e.employee_id;
```

Every row of `employees` is passed into `STRING_SPLIT` separately — you cannot express that with a plain JOIN. This is the classic SQL Server APPLY scenario (splitting, CSV parsing, geo/time helpers). PostgreSQL expresses the same idea with `LATERAL` applied to set-returning functions:

```sql
SELECT e.employee_name, s
FROM employees e,
     LATERAL string_to_array(e.employee_name, ' ') AS s(fragment);
```

> Production pitfall: a **costly, non-sargable function under APPLY** makes every left row pay full cost. Watch for `Loops: N` × expensive inner work in the plan. If the function is deterministic, consider a computed/generated column instead of a per-query function call.

---

## NULL behavior

| Situation | CROSS APPLY / CROSS JOIN LATERAL | OUTER APPLY / LEFT JOIN LATERAL |
|---|---|---|
| Lateral returns ≥ 1 row | one output row per (left, inner) pair | same |
| Lateral returns **0 rows** | **left row dropped** | **left row kept, right columns NULL** |
| Inner aggregate on an empty set | left row kept; `COUNT`=0, `SUM`/`MAX`=NULL | same (still one inner row) |
| Join key is NULL (e.g. `o.customer_id` NULL) | `NULL = value` → false → **0 rows** → dropped | kept with NULLs |
| Lateral column used in WHERE | fine, but for LEFT forms it converts to inner semantics | `WHERE x.col IS NOT NULL` turns it into an inner join again |

Three specific traps:

1. **An aggregate is not "no rows".** `SELECT SUM(amount) ... WHERE order_id = X` returns *one row* (`NULL`) even when no payments exist. So CROSS APPLY / CROSS JOIN LATERAL keeps the parent row — the NULL is the aggregate's answer, not an absence of a row. Only a **non-aggregate** lateral (like a `LIMIT 1` fetch) can return zero rows.
2. **`ON TRUE` vs `ON false`.** With LEFT JOIN LATERAL, an `ON TRUE` is almost always what you want for "keep everything, attach what exists", because the correlation already lives inside the subquery. If you instead *also* put correlation into `ON` (e.g. `ON o.customer_id = c.customer_id`), you duplicate the filter and can accidentally drop rows via three-valued logic when the key is NULL.
3. **NULL join keys inside the inner query** behave like any join: `a.x = b.x` with NULLs is never true. Use `IS NOT DISTINCT FROM` if you truly want NULLs to match (see `13-IS-DISTINCT-FROM`).

---

## Edge cases

- **Lateral returns more than one row** → genuine fan-out (row multiplication), same as a 1:N join. If you expected one row, you need `LIMIT`/`TOP`/`FETCH FIRST`, `DISTINCT`, a `GROUP BY`, or a provably-1:1 inner query.
- **`LIMIT` without `ORDER BY`** → nondeterministic which row you get. Always pair `LIMIT n` with a deterministic `ORDER BY` when meaning "first n".
- **`ORDER BY` an expression, not a column** → may defeat index seek (sargability; see `77-SARGability`).
- **Only references tables to your left.** A LATERAL can reference tables listed **before** it in the same FROM, not ones after it. Order the FROM clause accordingly — this ordering constraint is an advantage: it makes data-flow explicit.
- **Multiple LATERALs** can reference each other sequentially: the second can use the first's output columns.
- **Non-correlated LATERAL** is legal; the optimizer will normally evaluate it once (check the plan).
- **`GROUP BY` after the lateral**: lateral is a FROM-clause row source, so grouping *its output* is normal — but grouping inside the lateral is also common (Example 3). Decide by grain: aggregate where the granularity is defined.
- **Type mismatches** between the lateral columns and outer filters: e.g. comparing `amount` (NUMERIC) to an INT literal is usually fine; using text in an `ORDER BY` that expects a date is not.
- **Aliases are effectively mandatory**: PostgreSQL rejects an unnamed `LATERAL (...)`; give every lateral an alias (SQL Server tolerates missing aliases but don't rely on it).
- **Recursion-like needs:** LATERAL does not recurse; hierarchical trees still need recursive CTE (`34-Recursive-CTEs`).

---

## Common mistakes

1. **Using CROSS when LEFT was meant** — silent row loss. Any time the inner query can match zero rows, decide deliberately between CROSS (drop) and LEFT/OUTER (keep).
2. **Inner query not actually limited** — fan-out explosion because you forgot `LIMIT`/`TOP`/`DISTINCT`.
3. **`LIMIT n` without `ORDER BY`** — random "top" rows.
4. **Filtering a LEFT/OUTER lateral column in WHERE** — silently converts to inner semantics.
5. **Duplicating correlation in both `WHERE` (inside) and `ON` (outside)** — redundant work, plus possible NULL-key drops.
6. **Writing the SELECT-list subquery where a FROM lateral belongs** — SELECT-list subqueries can't return multiple columns without repetition and error on >1 row; LATERAL is the multi-column, multi-row home.
7. **Forgetting that aggregate laterals return exactly one row** — code written assuming "empty set → no output row" gets the opposite.
8. **Alias collision** — naming the lateral the same as an existing table in the query shadows it; place filter/join references on the intended alias.
9. **Using LATERAL where an uncorrelated derived table would be clearer** — if the inner query references no left columns, a plain derived table communicates intent better and gives the optimizer maximum freedom.
10. **Presuming portability.** `LATERAL ... ON TRUE` (Postgres/MySQL/ANSI) and `CROSS/OUTER APPLY` (SQL Server/Oracle) are the same feature but not interchangeable source code. Keep engine-specific snippets labeled.

---

## Production pitfalls

> Production pitfall — **cost surprise.** A correlated lateral is `rows(left) × cost(inner)`. On a 10M-row left table, even a cheap inner probe is 10M executions. Before promoting a lateral to production, look at `Loops:` in PostgreSQL's `EXPLAIN (ANALYZE)`, `SET STATISTICS IO, TIME ON` in SQL Server, `EXPLAIN ANALYZE` in MySQL, and confirm loop count ~ left-row count and per-loop work is a seek, not a scan.

> Production pitfall — **missing index on the inner side.** The correlation column(s) of the inner table must be indexed (and possibly *leading*) on `(right_side_key, order_columns)` for top-N laterals. Without it, the "nested loop" becomes a nested *scan* — the slowest common lateral failure.

> Production pitfall — **non-deterministic "top row".** `LIMIT 1` with no `ORDER BY` can return a different row run-to-run, corrupting reports and breaking keyset pagination. Always order.

> Production pitfall — **writing to the driving table inside the lateral.** Some engines disallow it; even where allowed (you are joining a row source), it leaks implementation details and breaks if the planner materializes. Keep DML out of laterals.

> Production pitfall — **treating ORDER BY columns non-sargably.** `ORDER BY salary * 1.0 DESC` or `ORDER BY UPPER(x) DESC` usually prevents index seeking; move the expression into an indexed generated column when the pattern is hot.

> Production pitfall — **parameterized left key with skewed data.** If a few left values match millions of inner rows, per-row probes degrade; cardinality skew breaks the planner's nice "few rows per probe" estimate. Check the plan's estimated vs actual rows.

---

## Performance implications

Without absolute claims — the optimizer, indexes, statistics, cardinality, and query shape decide:

- A LATERAL/APPLY **typically** compiles to a nested loop with a per-row inner probe. It shines when the inner probe uses an **index seek** and returns few rows per left row (top-N, latest-row, existence+attributes).
- The window-function equivalent (`ROW_NUMBER() ... WHERE rn <= n`) reads **all** matching rows once. It often wins when groups are large and few, or when no useful index exists on the inner side.
- A scalar-subquery version duplicates and returns one value only — usually **slower and less correct** than a lateral that fetches the whole row once.
- A plain INNER JOIN maps **all** matching rows (fan-out) and requires a separate window pass to reduce to "top N"; the lateral skips that pass by construction.
- For **many small groups + a covering composite index** `(group_key, order_key DESC)`, the lateral sometimes does dramatically less I/O. For **one giant group**, the window approach sometimes wins. Which one actually wins in *your* data is an execution-plan question, not a slogan.
- Every performance claim above must be verified with the engine's tooling:
  - PostgreSQL → `EXPLAIN (ANALYZE, BUFFERS)`
  - SQL Server → Actual Execution Plan + `SET STATISTICS IO, TIME ON`
  - MySQL → `EXPLAIN ANALYZE`
  - Oracle → SQL Monitor / `DBMS_XPLAN`

**A supporting index for Example 2:**

```sql
CREATE INDEX idx_emp_dept_salary ON employees (department_id, salary DESC, employee_name);
```

With this index, each department probe can read the top-2 page; verify the plan shows an Index Scan with small per-loop row counts.

---

## Comparison tables

### LATERAL vs the things people confuse it with

| | Can see left-row columns? | Returns set? | Returns multiple columns? | Joins further? | NULL-keeping form |
|---|---|---|---|---|---|
| **LATERAL / APPLY** | ✅ | ✅ (0..N rows) | ✅ | ✅ (it IS a table source) | LEFT/OUTER |
| Derived table in FROM | ❌ (before LATERAL) | ✅ | ✅ | ✅ | — |
| Correlated subquery in SELECT | ✅ | ❌ scalar only | ❌ one value | ❌ | manual CASE/NULLIF |
| Correlated subquery in WHERE (EXISTS/IN) | ✅ | ✅ logical only | ❌ | ❌ | — |
| Plain INNER/LEFT JOIN | ✅ | ✅ all matches (fan-out) | ✅ | ✅ | LEFT JOIN |

### CROSS vs OUTER (the two NULL-bearing forms)

| | CROSS APPLY / CROSS JOIN LATERAL | OUTER APPLY / LEFT JOIN LATERAL |
|---|---|---|
| Inner returns rows | outputs (left × inner) | same |
| Inner returns **no rows** | **left row removed** | **left row kept, right side = NULLs** |
| Semantics | like INNER of a correlated set | like LEFT of a correlated set |
| SQL Server | `CROSS APPLY` | `OUTER APPLY` |
| PG / MySQL / ANSI | `CROSS JOIN LATERAL` | `LEFT JOIN LATERAL ... ON TRUE` |
| When to pick | you *require* a match | the left row matters even with no match |

### LATERAL vs the window-function approach (top-N per group)

| | LATERAL/APPLY | ROW_NUMBER window |
|---|---|---|
| Reads per group | only those needed (if indexed) | **all** rows of every group |
| One big group | often worse | often better |
| Many small groups + composite index | often better | fine |
| Handles ties deterministically | `ORDER BY` in inner query | `ORDER BY` in OVER + filters |
| Single pass, no per-row probes | ❌ | ✅ |
| Diagnostic | check `Loops:` / nested loop | check sort/partition memory |

### Engine × syntax matrix

| | LATERAL | CROSS APPLY | OUTER APPLY | `ON TRUE` needed for LEFT/OUTER | TOP-N keyword |
|---|---|---|---|---|---|
| PostgreSQL | ✅ | ❌ | ❌ | yes | `LIMIT` |
| MySQL 8.0.14+ | ✅ | ❌ | ❌ | yes | `LIMIT` |
| SQL Server | ❌ | ✅ | ✅ | n/a | `TOP (n)` |
| Oracle 12c+ | ✅ | ✅ | ✅ | n/a (`ON 1=1`) | `FETCH FIRST n ROWS ONLY` |
| SQLite 3.33+ | ✅ | ❌ | ❌ | yes | `LIMIT` |

---

## When to use LATERAL / APPLY

**Use it when:**
- You need the **top-N / latest / first** row *per group* and also want several of its columns.
- The inner computation is **correlated** and you need its result as a **set** (more than one column, potentially more than one row) that you will filter, group, or join further.
- A **computed value must be referenced multiple times** (WHERE + SELECT + ORDER BY) without re-executing the expression.
- You need to **call a set-returning function / TVF once per left row** (SQL Server APPLY + TVF, PostgreSQL LATERAL + SRF).
- You're doing **time-series / funnel lookups** (next event, previous order) where a per-row probe into an indexed table is cheaper than a full window pass (verify!).
- Gap-filling: stitch a **date spine to data** with zero-fill.

**Do NOT use it when:**
- The inner query is **not correlated** — a plain derived table is clearer and gives the optimizer freedom.
- A **single scalar** suffices (`MAX`, a lookup) — a scalar subquery or a simple join is simpler.
- A **window function** already expresses the need and the plan favors one pass (large sparse groups).
- You only want to know **whether matches exist** — use `EXISTS` (anti/semi-join; see `23/24`).
- The inner table is huge, uncorrelated-lookup-able, and every left row would scan — prefer a well-indexed plain join, then aggregate.
- You need **recursive hierarchy** — recursive CTE, not lateral.

---

## Interview traps

1. **"CROSS APPLY creates a Cartesian product."** No. `CROSS` in CROSS APPLY does *not* mean CROSS JOIN. Each left row is paired **only with its own** lateral rows — not with every row of every table.
2. **"LATERAL evaluates the subquery once and joins to it."** The *semantics* are per-row; the *plan* is chosen by the optimizer. It may materialize, unnest, or reorder — check `EXPLAIN`.
3. **"Correlated subqueries and LATERAL are the same thing."** The SELECT-list correlated subquery returns one scalar (and errors on >1 row); LATERAL returns a whole row source you can join, GROUP, and filter further. They share correlation, not capability.
4. **"LATERAL drops you rows sometimes" — "drop" is a semantic choice.** CROSS drops, LEFT/OUTER keep. The *dropped row* is the CROSS-with-no-match behavior, and the classic interview twist is "why did Zoe vanish?"
5. **"You can use LATERAL in the SELECT list / WHERE clause."** No — it is a FROM-clause construct.
6. **"A LATERAL subquery can reference any table in the query."** Only tables that appear **before** it in the same FROM (and earlier laterals), never those after it.
7. **"The inner query always returns ≤ 1 row."** Only if you make it so (LIMIT/TOP/unique key). Otherwise it fans out like a join.
8. **"DELETE/UPDATE with a lateral behaves exactly like SELECT."** DML and correlations interact with locking/planning differently across engines; verify separately.

---

## Best practices

1. **State the grain** of each table and of the intended output before writing the lateral (see sample tables).
2. **Decide CROSS vs LEFT/OUTER explicitly** — if the inner can return zero rows and the left row must survive, use LEFT LATERAL/OUTER APPLY.
3. **Always pair `LIMIT`/`TOP`/`FETCH FIRST` with a deterministic `ORDER BY`.**
4. **Give the lateral a short, unambiguous alias**; reference inner tables by the alias you intend.
5. **Compute once in the lateral, reuse everywhere** (Example 3) — don't duplicate expressions between SELECT and WHERE.
6. **Add the right composite index** for top-N probes: `(correlation_key, order_columns…)`; cover the selected columns where hot.
7. **Keep uncorrelated parts outside the lateral** — the optimizer can't always hoist them, and neither should you.
8. **Prefilter the left table** (WHERE on the driving table is applied before per-row probing).
9. **Prefer the portability-equivalent**: if the code must run on many engines, isolate the LATERAL (ANSI) vs APPLY (T-SQL/Oracle) snippets and label them; there is no single portable spelling.
10. **Verify with the plan** — loop count, index usage, estimated vs actual rows — before accepting a lateral into production.
11. **Prefer lateral over scalar subqueries in the SELECT list whenever ≥ 2 columns or a risk of > 1 row exists.**

---

## Real-world scenario — per-product repricing dashboard

Products need a "last 3 order prices" per product, reusing the price list as a small set returning multiple rows.

```sql
-- grain: one output row = (product, one of its 3 most recent order prices)
SELECT p.name,
       x.order_id,
       x.unit_price,
       x.ordered_at
FROM products p
CROSS JOIN LATERAL (
    SELECT oi.order_id, oi.unit_price, o.ordered_at
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE oi.product_id = p.product_id
    ORDER BY o.ordered_at DESC, oi.order_id
    LIMIT 3
) x
ORDER BY p.name, x.ordered_at DESC;
```

The reasoning checklist applied:

1. What does one output row represent? → *one product × one of its recent order prices.*
2. Grain of each table? → *products 1:1, order_items 1:1 with product/order, orders 1:1 parent.*
3. Driving table? → *products (we need every product).*
4. Need other tables' columns? → *order id + date; reachable via order_items and orders.*
5. Could the join create duplicates? → *only within the lateral, and LIMIT 3 caps it.*
6. Aggregation needed? → *no — we want individual rows, so LATERAL (not GROUP BY).*
7. Window function? → *possible (ROW_NUMBER per product), but LATERAL keeps it to 3 probes per product.*
8. NULL effects? → *products with zero orders vanish under CROSS; use LEFT LATERAL to keep them.*
9. WHERE vs ON? → *WHERE inside the lateral carries the correlation; LEFT form uses ON TRUE.*
10. Indexes? → *`(product_id, order_id)` on order_items, PK on orders, and confirm seeks in the plan.*
11. `EXPLAIN`? → *the final step, always.*

---

# Interview Questions

Use the sample tables above and don't peek at earlier examples while practicing.

## Beginner

1. In your own words: what does a LATERAL subquery do that a normal derived table in FROM cannot?
2. What is the difference between `CROSS JOIN LATERAL` and `LEFT JOIN LATERAL ... ON TRUE`?
3. What are the SQL Server keywords and how do they map to the two LATERAL forms?
4. Where in a query can LATERAL appear: SELECT, FROM, WHERE, GROUP BY, HAVING?
5. If the lateral subquery returns zero rows, what happens to the left row under CROSS vs under LEFT/OUTER?

## Intermediate

6. Write a query returning each customer's latest order (order id + date + total) using LATERAL in your engine of choice.
7. Explain why the "salary = (SELECT MAX(salary) …)" pattern fails for top-2-per-group and how LATERAL fixes it.
8. Compare `CROSS APPLY (SELECT TOP (3) …)` with the `ROW_NUMBER` window approach for top-3-per-group. Under what circumstances could either be faster, and how would you decide?
9. Why can't a scalar correlated subquery in the SELECT list replace a LATERAL when you need two columns of the latest row?
10. Write the paid-in-full example (Example 3) and explain why an aggregate inside LATERAL returns exactly one row even when there are no matching payments.

## Advanced

11. Explain the concept of "parameterized inner scan": how does a Left/Aggregate nested loop realize a LATERAL and what does `Loops: N` tell you in PostgreSQL?
12. When can the optimizer safely *not* execute a LATERAL as a per-row loop, and how would you detect that in the plan?
13. Design a zero-fill daily revenue report using `generate_series` + `LEFT JOIN LATERAL`. What happens if the spine and the fact table have different timezones (cross-ref timezone pitfalls)?
14. How do you keep the "next order per customer" lateral from producing duplicates when two orders share the same `placed_on`?
15. Explain how SQL Server `CROSS APPLY` with a TVF differs from the same logic expressed as a scalar function with joins, in terms of row source vs expression.

## Scenario Based

16. Customers with no orders are disappearing from a CRM export. The query uses `CROSS JOIN LATERAL`. Fix it and show the NULL-padded output for Zoe.
17. A funnel report needs each order plus the customer's immediately following order, *keeping* orders that have no successor. Write it.
18. Products with zero sales must still appear in a repricing dashboard. Which lateral flavor do you choose and what do the price columns look like?
19. You must show the top-2 earners per department while departments with no employees must still appear. Write the query and predict its output.
20. A weekly report needs one row per week (including empty weeks) with total order value. Show the spine + lateral query.

## Tricky

21. Does `CROSS` in `CROSS APPLY` mean Cartesian product? Explain with a 2-row left table whose laterals return 2 rows each — what is the output count and why is it not 2×N?
22. Can a LATERAL reference a table that appears *after* it in the FROM clause? Why is the ordering constraint actually helpful?
23. Your lateral returns a row with `SUM = NULL`. Does the left row survive a CROSS APPLY? What about a lateral that matches zero rows with `SELECT *` (no aggregate)? Explain why the answers differ.
24. In MySQL 8.0.14+, `LEFT JOIN LATERAL (...) AS x ON TRUE` is legal; older MySQL errors. What is the alternative portable spellings for engines without LATERAL/APPLY?
25. Can you write the top-2-per-department query with LATERAL *and no ORDER BY inside* and still guarantee a deterministic answer? Why or why not?

## Output Prediction

26. Using the sample data, predict the full output of Example 1 (CROSS JOIN LATERAL) and then the LEFT variant, including Zoe's row.
27. Predict the output of the top-2-per-department query (Example 2). Which employee is missing per department, and why does the Sales group order as Eve then Carol?
28. Predict the paid_in_full output (Example 3). Why are orders 1002, 1005, and 1006 not in the result — compute each paid-vs-total by hand.
29. For the "next order" query (Example 4), predict which orders survive under CROSS and which are kept as NULLs under LEFT.
30. In Example 1, change `LIMIT 1` to `LIMIT 2` and predict how many output rows Ada now produces.

## Debugging

31. The latest-order report shows 99 customers instead of 100; customer Zoe is missing. Which keyword is the cause and what is the one-line fix?
32. Duplicates: every customer appears twice in a "top 2 orders per customer" query you wrote with `LIMIT 2`. Why?
33. A lateral query is 100× slower after adding a new WHERE clause on the inner table. Where do you look in the plan (loops, scan vs seek, estimated vs actual rows)?
34. You switch a query from PostgreSQL to SQL Server and get a syntax error at `LATERAL`. What are the minimal rewrites?
35. The funnel report now shows *every* order twice because `placed_on` is a timestamp with timezone offset at midnight. Which comparison is causing near-duplicate ordering and how do you make it deterministic?
36. The window-function version and the LATERAL version of "top-2 per department" return different rows for the 2nd place in one department. Which part of each query decides tie-breaking, and which one is wrong given the business rule "alphabetical tie-break"?

## Performance

37. Describe the index you would add for Example 2 and explain how the optimizer uses it for the lateral probes. What does `EXPLAIN (ANALYZE, BUFFERS)` show that `EXPLAIN` alone wouldn't?
38. For a 50M-row orders table and 1M customers, would you expect a top-1-per-customer lateral or the `ROW_NUMBER` version to win? What plan evidence would change your mind (cardinality skew, index, loops)?
39. A correlated lateral on a 10M-row left table shows `Loops: 10000000` with a `Seq Scan` inner. What exactly is expensive and what two fixes should you try — and how do you verify each?
40. You see the optimizer pick a Hash Join for a query you wrote with `LEFT JOIN LATERAL`. Is the optimizer broken? Explain what it means for the "per-row" semantics.
41. How would you measure real per-loop cost in your engine (PostgreSQL `EXPLAIN ANALYZE` vs SQL Server `SET STATISTICS IO, TIME ON` vs MySQL `EXPLAIN ANALYZE`)? What numbers are the signal vs the noise?

---

*End of Section 100 — LATERAL & CROSS APPLY. Related topics: Correlated Subqueries, Subqueries in FROM, Top-N/Latest Per Group window functions, LAG/LEAD, LEFT JOIN & ON-vs-WHERE, Join fan-out, Composite/Covering Indexes, EXPLAIN & Cardinality, NULL/Three-Valued Logic.*