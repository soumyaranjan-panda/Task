# 38 — COUNT, SUM, AVG, MIN, MAX

> Category: 5-Aggregation — Section: 38-COUNT-SUM-AVG-MIN-MAX

---

## Fundamentals

### What they are

`COUNT`, `SUM`, `AVG`, `MIN`, and `MAX` are the five **scalar aggregate functions**. Each one takes many values and coSection 38 written to `sql-handbook/5-Aggregation/38-COUNT-SUM-AVG-MIN-MAX.md`, matching the handbook style of sections 36/37 (grain-stated sample tables, verified expected outputs, labeled traps, DB-specific notes, EXPLAIN-driven performance guidance, mermaid pipeline diagram, and a full Interview Questions set with no answers).
` | "What is the smallest?" | any orderable values | the smallest non-NULL value |
| `MAX` | "What is the largest?" | any orderable values | the largest non-NULL value |

"Scalar" means they return a single value per *group* — where the "group" is either:

1. the **entire result set** (no `GROUP BY`) — the whole table is implicitly one group;
2. one **`GROUP BY` bucket** (see *Section 36 — GROUP BY*);
3. one **window partition** when used with `OVER()` (see the WINDOW FUNCTIONS section).

### Why they exist

Raw tables are big and repetitive. Real questions are about shape, not rows: "how many employees?", "what is total revenue?", "what is the average order value?", "what is the highest salary?". Aggregates answer these while throwing away rows — because the answer is a *number*, not a list.

### What they are NOT

- They are **not** row functions — `MIN(salary)` does not return the row that contains the minimum, it returns a bare value. Getting the *row* requires a subquery or window function.
- They do **not** preserve grain. The output grain is "one row per group", never "one row per source row" (unless used as a window function).
- `COUNT` is sometimes used to produce numbers that are then reused; an aggregate **cannot** appear inside `WHERE` (see *Section 37 — HAVING*).

---

## The family at a glance — NULL behavior

| Function | NULL rows | All-NULL / no rows (no GROUP BY) | Legal input types |
|---|---|---|---|
| `COUNT(*)` | **counts** the row | returns `0` (never NULL) | anything |
| `COUNT(col)` | **skips** the row | returns `0` (never NULL) | anything |
| `COUNT(DISTINCT col)` | **skips** NULL (NULL is not a distinct value) | returns `0` (never NULL) | anything |
| `SUM(col)` | **skips** the row | returns `NULL` | numeric only |
| `AVG(col)` | **skips** the row (NULLs are not in the denominator) | returns `NULL` | numeric only |
| `MIN(col)` | **skips** the row | returns `NULL` | any orderable type |
| `MAX(col)` | **skips** the row | returns `NULL` | any orderable type |

The single most important rule of this section:

> All aggregates except `COUNT(*)` **skip NULLs**. `COUNT(*)` counts the row even if every column in it is NULL.

> Common misconception: "an aggregate over an empty set returns 0". Only `COUNT` does. `SUM`, `AVG`, `MIN`, `MAX` return `NULL` when there are no non-NULL values — which is `NULL`, not `0`. Treating them as `0` produces NULL-aware bugs (see the LEFT JOIN example below).

---

## Syntax

### Plain forms

```sql
COUNT(*)                  -- count rows
COUNT(ALL col)            -- count non-NULL values (ALL is the default)
COUNT(col)                -- same as COUNT(ALL col)
SUM(col)                  -- sum non-NULL numeric values
SUM(ALL col)
AVG(col)                  -- average of non-NULL numeric values
AVG(ALL col)
MIN(col)                  -- smallest non-NULL value
MAX(col)                  -- largest non-NULL value
```

### DISTINCT forms

```sql
COUNT(DISTINCT col)       -- count distinct non-NULL values
SUM(DISTINCT col)         -- sum distinct values (each distinct value once)
AVG(DISTINCT col)         -- average over distinct values
MIN(DISTINCT col)         -- identical to MIN(col), never useful
MAX(DISTINCT col)         -- identical to MAX(col), never useful
```

`MIN(DISTINCT x)` and `MAX(DISTINCT x)` are redundant — the smallest/largest of a set is the same with or without deduplication. `COUNT(DISTINCT col)` is the workhorse; it is also the **most expensive** of the five because it must build a distinct set first.

### Posting into a query — three contexts

```sql
-- 1. Global (no GROUP BY): one output row for the whole table
SELECT COUNT(*), AVG(salary) FROM employees;

-- 2. Grouped: one output row per group (Section 36 — GROUP BY)
SELECT department_id, COUNT(*), AVG(salary)
FROM employees
GROUP BY department_id;

-- 3. Windowed: output keeps one row PER SOURCE ROW, value computed per partition
SELECT department_id,
       AVG(salary) OVER (PARTITION BY department_id) AS dept_avg
FROM employees;
```

> Section cross-reference: window aggregates are covered in the WINDOW FUNCTIONS section. The rule of thumb — "do I need one value per group, or one value per row with context?" — decides between `GROUP BY` and `OVER()`.

### Conditional aggregation

Filter inside the aggregate with `CASE` (portable) or `FILTER` (PostgreSQL, SQLite):

```sql
-- portable
SELECT COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped,
       SUM(CASE WHEN status = 'shipped' THEN total ELSE 0 END) AS shipped_revenue
FROM orders;

-- PostgreSQL only
SELECT COUNT(*) FILTER (WHERE status = 'shipped') AS shipped,
       SUM(total)   FILTER (WHERE status = 'shipped') AS shipped_revenue
FROM orders;
```

`COUNT(CASE WHEN cond THEN 1 END)` counts only rows where `cond` is true, because the `ELSE` branch yields `NULL` and `COUNT` skips NULLs. This is the classic way to get "count of X among all rows" in one scan.

> Section cross-reference: *Section 08 — CASE Expressions*.

---

## Sample tables

Grain is stated per table. These are used in every example below.

```sql
CREATE TABLE departments (
  department_id INT PRIMARY KEY,
  name          VARCHAR(50)
);
-- One row = one department.

CREATE TABLE employees (
  employee_id   INT PRIMARY KEY,
  name          VARCHAR(100),
  department_id INT REFERENCES departments(department_id),
  salary        NUMERIC(10,2),
  country       VARCHAR(50)
);
-- One row = one employee.

CREATE TABLE orders (
  order_id      INT PRIMARY KEY,
  customer_id   INT NOT NULL,
  region        VARCHAR(30),
  status        VARCHAR(20),
  total         NUMERIC(12,2),
  order_date    DATE
);
-- One row = one order.

CREATE TABLE order_items (
  order_item_id INT PRIMARY KEY,
  order_id      INT REFERENCES orders(order_id),
  product_id    INT,
  quantity      INT,
  unit_price    NUMERIC(10,2)
);
-- One row = one line item inside an order. An order has 1..N items.

CREATE TABLE payments (
  payment_id INT PRIMARY KEY,
  order_id   INT REFERENCES orders(order_id),
  amount     NUMERIC(12,2),
  paid_at    DATE
);
-- One row = one payment event. An order can have 0..N payments.
```

```sql
INSERT INTO departments VALUES
(1, 'Engineering'), (2, 'Sales'), (3, 'HR');

INSERT INTO employees VALUES
(101, 'Aisha',  1, 9000.00, 'US'),
(102, 'Bruno',  1, 10000.00,'DE'),
(103, 'Chloe',  1, 7500.00, 'US'),
(104, 'Diego',  2, 6000.00, 'MX'),
(105, 'Elif',   2, NULL,     NULL),   -- no salary, no country recorded
(106, 'Fatima', 2, 5500.00, 'US'),
(107, 'Goran',  2, 5200.00, 'HR'),
(108, 'Hana',   3, 4800.00, 'CZ'),
(109, 'Ivan',   3, NULL,     'RU'),   -- no salary
(110, 'Jun',    NULL, 4000.00, NULL); -- no department, no country

INSERT INTO orders VALUES
(1, 100, 'North', 'shipped',   250.00, '2026-01-05'),
(2, 100, 'North', 'shipped',    99.00, '2026-01-11'),
(3, 101, 'South', 'pending',   480.00, '2026-01-15'),
(4, 102, 'North', 'shipped',   120.00, '2026-01-20'),
(5, 101, 'South', 'shipped',   300.00, '2026-02-02'),
(6, 103, 'West',  'cancelled',  40.00, '2026-02-09'),
(7, 104, 'North', 'shipped',   210.00, '2026-02-14'),
(8, 104, 'North', 'pending',    75.00, '2026-02-21');

INSERT INTO order_items VALUES
(1, 1, 501, 2, 100.00),
(2, 1, 502, 1,  50.00),
(3, 2, 501, 1,  99.00),
(4, 3, 503, 3, 160.00),
(5, 5, 501, 2, 150.00),
(6, 7, 503, 1, 210.00);

INSERT INTO payments VALUES
(1, 1,  250.00, '2026-01-06'),
(2, 2,   99.00, '2026-01-12'),
(3, 5,  200.00, '2026-02-03'),
(4, 5,  100.00, '2026-02-04'),
(5, 6,   40.00, '2026-02-10'),   -- paid, then...
(6, 6,  -40.00, '2026-02-12');   -- ...refunded. Net = 0.
```

Reference numbers you can use to sanity-check every example:

- `employees`: 10 rows, 8 non-NULL salaries, 8 non-NULL countries, 3 non-NULL departments, 6 distinct countries.
- `SUM(salary)` = 52,000.00 → `AVG(salary)` = 6,500.00, `MIN` = 4,000.00, `MAX` = 10,000.00.
- `orders`: 8 rows; shipped orders sum to 979.00 (order 6 is cancelled, orders 3 and 8 are pending).
- `order_items`: 6 line items; `SUM(quantity)` = 10.

---

## How it works internally

### Logical position

Aggregates are computed **after** grouping. The full pipeline looks like:

```mermaid
flowchart LR
    A[FROM / JOIN] --> B[WHERE row filter]
    B --> C[GROUP BY form groups]
    C --> D[(Aggregates computed per group)]
    D --> E[HAVING filter groups]
    E --> F[SELECT expressions & aliases]
    F --> G[ORDER BY]
    G --> H[LIMIT / OFFSET]
```

> Section cross-reference: the complete rulebook is *Section 06 — Logical Query Processing Order*. The key consequence: a row filtered out by `WHERE` can never contribute to an aggregate, and an aggregate can never appear in `WHERE`.

### Execution options

An engine turns "aggregate + GROUP BY" into one of two physical operators (names differ per database):

| Engine | Sorted approach (input already ordered by group key) | Hash approach |
|---|---|---|
| PostgreSQL | `GroupAggregate` | `HashAggregate` |
| SQL Server | `Stream Aggregate` | `Hash Match (Aggregate)` |
| Oracle | `SORT GROUP BY` | `HASH GROUP BY` |
| MySQL | grouped index scan / filesort-based | hash aggregate (8.0+) |

- **Hash aggregation**: builds a hash table keyed by the group columns in memory (`work_mem` in PostgreSQL, `sort_area_size` in Oracle). Good when there are many groups and no useful order. If the hash table exceeds memory budget it spills to disk.
- **Sorted aggregation**: consumes rows already ordered by the group key and collapses runs. Needs an explicit sort unless the rows arrive sorted (for example from an index that matches the `GROUP BY` columns).

Which one wins depends on cardinality, memory, and whether a reusable order already exists — **not** on a fixed rule. You determine it by reading the plan.

### Per-operator cost intuition (not a law)

- `COUNT(*)`, `SUM`, `AVG`, `MIN`, `MAX` over a plain column are **single-pass** accumulators: one pass, O(rows) comparisons/arithmetic.
- `AVG` internally keeps `sum` and `count` and divides once at the end.
- `COUNT(DISTINCT x)` must build a distinct set, which is the same memory/sort work as `DISTINCT` — noticeably heavier than `COUNT(*)` at scale.
- `MIN`/`MAX` can often stop earlier than `COUNT`/`SUM`: values are compared, no accumulation of state, and some optimizers read only the first/last value of a B-tree index.

Always verify these claims on your data:

> PostgreSQL: `EXPLAIN (ANALYZE, BUFFERS) SELECT ...`
> MySQL: `EXPLAIN ANALYZE SELECT ...`
> SQL Server: `SET STATISTICS IO ON; SET STATISTICS TIME ON;`
> Oracle: `EXPLAIN PLAN FOR ...` then `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(...));`

Pay attention to *actual* rows, temp files (spill), and the operator names above.

---

## Return types — engine differences

The return type of an aggregate is **not** always the column type. This matters for later arithmetic:

| Aggregate over integer column | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| `COUNT(*)` | `bigint` | `BIGINT` | `int` | `NUMBER` |
| `SUM(x)` | `bigint` | `DECIMAL` | `int` (can overflow!) | `NUMBER` |
| `AVG(x)` | `numeric` (fraction kept) | `DECIMAL` (fraction kept) | `int` — **fraction truncated** | `NUMBER` |
| `MIN` / `MAX` | same as column | same as column | same as column | same as column |

> SQL Server
>
> `AVG` of an integer column returns an integer. `AVG(quantity)` over quantities `(2,1,1,3,2,1)` is `10/6 = 1.666…`, but SQL Server returns `1`. Cast first: `AVG(CAST(quantity AS decimal))` or `AVG(quantity * 1.0)`. This is a classic SQL Server interview trap and a real bug source.

For **decimal/numeric** inputs most engines preserve or promote the precision, and `AVG` keeps its fraction. For floating-point inputs, `SUM` and `AVG` accumulate in floating point with the usual rounding caveats.

> Oracle
>
> `SUM`/`AVG`/`COUNT` all return `NUMBER`, which has arbitrary precision — Oracle is largely immune to the integer-overflow family of bugs. On PostgreSQL, `SUM(integer)` is promoted to `bigint`; on SQL Server `SUM(int)` stays `int` and can raise arithmetic-overflow error 8115.

> Production pitfall: summing large integers on SQL Server can overflow. If overflow is possible, write `SUM(CAST(col AS BIGINT))`.

---

## Example 1 — all five over the whole table (global group)

```sql
SELECT COUNT(*)            AS employees,
       COUNT(salary)       AS with_salary,
       SUM(salary)         AS total_salary,
       ROUND(AVG(salary),2) AS avg_salary,
       MIN(salary)         AS min_salary,
       MAX(salary)         AS max_salary
FROM employees;
```

**Expected result:**

| employees | with_salary | total_salary | avg_salary | min_salary | max_salary |
|---|---:|---:|---:|---:|---:|
| 10 | 8 | 52000.00 | 6500.00 | 4000.00 | 10000.00 |

Why `8`, not `10`, for `with_salary`: Elif (105) and Ivan (109) have NULL salaries, and `COUNT(salary)` skips NULLs. `AVG` divides by the **8 non-NULL** salaries (52,000 ÷ 8 = 6,500), *not* by 10.

> Interview trap: `AVG(salary)` is **not** `SUM(salary) / COUNT(*)` when NULLs exist. It is `SUM(salary) / COUNT(salary)`.

---

## Example 2 — grouped, multiple aggregates in one pass

"Per department: headcount, salaries present, total, average, min, max."

```sql
SELECT department_id,
       COUNT(*)             AS employees,
       COUNT(salary)        AS with_salary,
       SUM(salary)          AS total_salary,
       ROUND(AVG(salary),2) AS avg_salary,
       MIN(salary)          AS min_salary,
       MAX(salary)          AS max_salary
FROM employees
GROUP BY department_id
ORDER BY department_id;
```

**Expected result:**

| department_id | employees | with_salary | total_salary | avg_salary | min_salary | max_salary |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 3 | 26500.00 | 8833.33 | 7500.00 | 10000.00 |
| 2 | 4 | 3 | 16700.00 | 5566.67 | 5200.00 | 6000.00 |
| 3 | 2 | 1 | 4800.00 | 4800.00 | 4800.00 | 4800.00 |
| NULL | 1 | 1 | 4000.00 | 4000.00 | 4000.00 | 4000.00 |

Observations:

- All NULLs in the grouping column form **one** group (PostgreSQL, MySQL, SQL Server). Each NULL groups by itself on Oracle — results then differ.
- Department 2 has 4 employees but only 3 salaries → `AVG` = 16,700 ÷ 3.
- Department 3 has 2 employees and 1 salary → `AVG` = 4,800 (Ivan's NULL is ignored, not treated as 0).
- Department 4 (`Marketing`) does not appear at all — grouping only creates buckets for keys that exist. See *Section 36 — GROUP BY* and *Section 16 — LEFT JOIN* for how to force zero rows.

> Oracle
>
> NULL department values group by themselves (potentially many singleton groups) instead of one shared bucket.

---

## Example 3 — COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)

"Per department: rows vs records with a country vs distinct countries."

```sql
SELECT department_id,
       COUNT(*)               AS rows,
       COUNT(country)         AS with_country,
       COUNT(DISTINCT country) AS distinct_countries
FROM employees
GROUP BY department_id
ORDER BY department_id;
```

**Expected result:**

| department_id | rows | with_country | distinct_countries |
|---:|---:|---:|---:|
| 1 | 3 | 3 | 2 |
| 2 | 4 | 3 | 3 |
| 3 | 2 | 2 | 2 |
| NULL | 1 | 0 | 0 |

- Each aggregate answers a different question: **row counts**, **non-NULL counts**, **distinct values**.
- The NULL-department group has 1 row, 0 recorded countries, 0 distinct countries.
- `COUNT(DISTINCT ...)` also skips NULL (NULL is not a "distinct value"), and it costs more than the other two.

Counts never return NULL; they return `0` when the input is empty or all-NULL.

---

## Example 4 — global vs grouped comparison with a WHERE filter

"Statistics on US employees only."

```sql
SELECT country,
       COUNT(*)      AS employees,
       AVG(salary)   AS avg_salary,
       MIN(salary)   AS min_salary,
       MAX(salary)   AS max_salary
FROM employees
WHERE country = 'US'
GROUP BY country;
```

| country | employees | avg_salary | min_salary | max_salary |
|---|---:|---:|---:|---:|
| US | 3 | 7333.33 | 5500.00 | 9000.00 |

The `WHERE` removed the non-US rows **before** aggregation, so avg = (9000 + 7500 + 5500) ÷ 3. If the `country` filter were in `HAVING`, those rows would first be grouped and the same numeric result would emerge — but more rows would have been read. Filtering non-group columns belongs in `WHERE`.

---

## Example 5 — the JOIN fan-out, or why SUM can double-count

Goal: "for orders 1 and 5, show the order total and the line-item detail."

> Production pitfall: joining a one-to-many table **before** aggregating changes the grain. Each order row is duplicated once per matching line item, so `SUM(o.total)` adds the order total multiple times.

```sql
-- BAD APPROACH
SELECT o.order_id, SUM(o.total) AS order_total
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.order_id IN (1, 5)
GROUP BY o.order_id;
```

**Expected (wrong) result:**

| order_id | order_total |
|---:|---:|
| 1 | 500.00 |
| 5 | 600.00 |

Order 1's total (250) is counted twice because order 1 has two line items. Order 5's total (300) double-counted to 600.

```sql
-- BETTER APPROACH: aggregate the fact table first, or restrict SUM to the right grain
SELECT o.order_id,
       o.total        AS order_total,          -- from the order (one row per order)
       COUNT(*)       AS line_count,           -- from the line items
       SUM(oi.quantity) AS units_sold,         -- from the line items
       SUM(oi.quantity * oi.unit_price) AS line_sum  -- sum of the lines
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.order_id IN (1, 5)
GROUP BY o.order_id, o.total;
```

**Expected result:**

| order_id | order_total | line_count | units_sold | line_sum |
|---:|---:|---:|---:|---:|
| 1 | 250.00 | 2 | 3 | 250.00 |
| 5 | 300.00 | 2 | 2 | 300.00 |

Rule: **only aggregate columns owned by (or drawn from) the driving table when the join is one-to-many.** For every other column, either backup before joining, `COUNT(DISTINCT key)`, unique the join, or aggregate the child side first.

> Section cross-reference: the full treatment is *Section 21 — JOIN Duplicates and Fan-out* and *Section 22 — Many-to-Many Joins*.

---

## Example 6 — SUM with negative values: payments and refunds

"Per order: number of payment events, net amount paid, average payment, smallest and largest event."

```sql
SELECT order_id,
       COUNT(*)          AS payment_events,
       SUM(amount)       AS net_paid,
       ROUND(AVG(amount),2) AS avg_payment,
       MIN(amount)       AS smallest_payment,
       MAX(amount)       AS largest_payment
FROM payments
GROUP BY order_id
ORDER BY order_id;
```

**Expected result:**

| order_id | payment_events | net_paid | avg_payment | smallest_payment | largest_payment |
|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 250.00 | 250.00 | 250.00 | 250.00 |
| 2 | 1 | 99.00 | 99.00 | 99.00 | 99.00 |
| 5 | 2 | 300.00 | 150.00 | 100.00 | 200.00 |
| 6 | 2 | 0.00 | 0.00 | -40.00 | 40.00 |

Order 6 was paid (40) then refunded (-40): `SUM` correctly nets to 0, `MIN` is the negative value, `MAX` the positive. Nothing special about the functions — they are just arithmetic over signed numbers. But `net_paid = 0` here is a *real zero*, not the `NULL` "no data" case — code that conflates them silently misbehaves.

Orders 3, 4, 7, 8 have no payments → **no group at all**. To surface them, drive from `orders` and `LEFT JOIN`:

```sql
SELECT o.order_id,
       o.total                          AS order_total,
       COALESCE(SUM(p.amount), 0)       AS paid,
       o.total - COALESCE(SUM(p.amount), 0) AS outstanding
FROM orders o
LEFT JOIN payments p ON p.order_id = o.order_id
GROUP BY o.order_id, o.total
ORDER BY o.order_id;
```

**Expected result (excerpt):**

| order_id | order_total | paid | outstanding |
|---:|---:|---:|---:|
| 3 | 480.00 | 0.00 | 480.00 |
| 4 | 120.00 | 0.00 | 120.00 |
| 6 | 40.00 | 0.00 | 40.00 |
| 7 | 210.00 | 0.00 | 210.00 |
| 8 | 75.00 | 0.00 | 75.00 |

Without `COALESCE`, `paid` would be `NULL` (SUM over zero matching rows), and `o.total - NULL` would be `NULL`. Same for `AVG`/`MIN`/`MAX`.

> Section cross-reference: *Section 12 — COALESCE / NULLIF*.

---

## Example 7 — AVG vs SQRT(manual) — the denominator trap

"Compare the true average with 'average treating missing salary as 0'."

```sql
SELECT AVG(salary)                AS avg_non_null,        -- skips NULLs
       SUM(salary) / COUNT(*)     AS avg_as_if_null_zero,  -- NULL counts as 0
       SUM(salary) / COUNT(salary) AS avg_non_null_manual   -- explicit
FROM employees;
```

**Expected result:**

| avg_non_null | avg_as_if_null_zero | avg_non_null_manual |
|---:|---:|---:|
| 6500.00 | 5200.00 | 6500.00 |

52,000 ÷ 8 vs 52,000 ÷ 10. The middle value is *not* "the average salary" — it is "average if missing salaries are zero". If your business rule is "unknown salary counts as zero", you must write the middle expression yourself; `AVG` will not do it for you.

> Production pitfall: the "average seems too low / too high" ticket at work is usually a NULL-denominator disagreement between `AVG` and a downstream `SUM/COUNT` recomputation. Decide which semantics you mean and document it.

> PostgreSQL / Oracle / MySQL
>
> With `NUMERIC` columns the division keeps its fraction. With **integer** columns, `SUM(salary)/COUNT(*)` does integer division (5,200 floors to 5,200 here, but `1/2` becomes `0`). See *Section 07 — Filtering Operators* for the integer-division trap. SQL Server additionally truncates `AVG(int)` itself.

---

## Example 8 — market share with SUM and a scalar subquery

"Per department: salary total and its share of the company total."

```sql
SELECT department_id,
       SUM(salary) AS dept_salary,
       ROUND(100.0 * SUM(salary) / (SELECT SUM(salary) FROM employees), 2) AS pct
FROM employees
GROUP BY department_id
ORDER BY dept_salary DESC;
```

**Expected result:**

| department_id | dept_salary | pct |
|---:|---:|---:|
| 1 | 26500.00 | 50.96 |
| 2 | 16700.00 | 32.12 |
| 3 | 4800.00 | 9.23 |
| NULL | 4000.00 | 7.69 |

`100.0` (a decimal literal) forces floating-point division; `100` would be integer division — the classic "every value is 0 or the last value is wrong" bug. The scalar subquery runs once and feeds every group.

> Section cross-reference: *Section 26 — Scalar Subqueries*.

---

## Example 9 — MIN/MAX on dates and strings

MIN/MAX are not numeric-only; they work on any orderable type.

```sql
SELECT MIN(order_date) AS first_order, MAX(order_date) AS latest_order
FROM orders;

SELECT MIN(name) AS alphabetically_first,
       MAX(name) AS alphabetically_last
FROM employees;
```

**Expected result:**

| first_order | latest_order |
|---|---|
| 2026-01-05 | 2026-02-21 |

| alphabetically_first | alphabetically_last |
|---|---|
| Aisha | Jun |

Two caveats:

- String ordering follows the column **collation** — case-insensitive collations (common in MySQL) return different "first/last" than case-sensitive ones (PostgreSQL default). Ordering is compared per collation, not per byte.
- `MIN`/`MAX` skip NULLs like every other aggregate. A column with some NULL dates produces the same MIN/MAX as if those rows were absent.

---

## Example 10 — empty input behavior

"Run the five functions over zero qualifying rows."

```sql
SELECT COUNT(*)   AS rows,
       COUNT(salary) AS with_salary,
       SUM(salary)   AS total,
       AVG(salary)   AS avg,
       MIN(salary)   AS min_salary,
       MAX(salary)   AS max_salary
FROM employees
WHERE 1 = 0;
```

**Expected result:**

| rows | with_salary | total | avg | min_salary | max_salary |
|---:|---:|---:|---:|---:|---:|
| 0 | 0 | NULL | NULL | NULL | NULL |

`COUNT` never returns NULL (returns 0); `SUM`/`AVG`/`MIN`/`MAX` return NULL. Inside a `GROUP BY` query, *no group exists* for keys with zero rows, so the whole row disappears — this is why "months with no sales" require generating the missing keys first.

---

## Example 11 — conditional aggregation in one scan

"Per region: total orders, shipped orders, shipped revenue, value of cancelled orders."

```sql
SELECT region,
       COUNT(*)                                          AS orders,
       SUM(CASE WHEN status = 'shipped'   THEN 1 ELSE 0 END) AS shipped,
       SUM(CASE WHEN status = 'shipped'   THEN total END)    AS shipped_revenue,
       SUM(CASE WHEN status = 'cancelled' THEN total ELSE 0 END) AS cancelled_value
FROM orders
GROUP BY region
ORDER BY region;
```

**Expected result:**

| region | orders | shipped | shipped_revenue | cancelled_value |
|---|---|---|---:|---:|
| North | 5 | 4 | 679.00 | 0.00 |
| South | 2 | 1 | 300.00 | 0.00 |
| West | 1 | 0 | NULL | 40.00 |

Note the asymmetry:

- `COUNT(*)` counts all rows for the guarantee of no NULL.
- `SUM(CASE WHEN shipped THEN 1 ELSE 0 END)` counts shipped (0 for the rest).
- `SUM(CASE WHEN shipped THEN total END)` has **no ELSE**, so West's shipped revenue is `NULL` — there are no shipped rows and SUM of nothing is NULL. If the dashboard should show `0`, add `ELSE 0`.
- `cancelled_value` uses `ELSE 0` so non-cancelled rows contribute 0.

This is the portable version of `FILTER (WHERE ...)`:

> PostgreSQL
>
> ```sql
> SUM(total) FILTER (WHERE status = 'shipped') AS shipped_revenue
> ```
> The `CASE` version above is portable to MySQL, SQL Server, and Oracle.

---

## Example 12 — mixed grains in one query: duplicate caution at order grain

"Per region: number of orders and number of distinct customers."

```sql
SELECT region,
       COUNT(*) AS orders,
       COUNT(DISTINCT customer_id) AS customers
FROM orders
GROUP BY region
ORDER BY orders DESC;
```

**Expected result:**

| region | orders | customers |
|---|---|---:|
| North | 5 | 3 |
| South | 2 | 1 |
| West | 1 | 1 |

Same table, two different grains: `orders` counts rows, `customers` counts distinct values. When `orders` fans out (because of a JOIN or a multi-valued column), `COUNT(DISTINCT customer_id)` still counts each customer once while `COUNT(*)` double counts — distinct can be a defensive tool against fan-out (at a memory cost).

---

## Common mistakes

### 1. Using COUNT(col) where COUNT(*) was meant

```sql
-- BAD: silently drops employees whose salary is NULL
SELECT COUNT(salary) FROM employees;   -- 8

-- INTENDED (usually for headcount)
SELECT COUNT(*) FROM employees;        -- 10
```

`COUNT(*)` means "rows". `COUNT(col)` means "non-NULL values in col". Pick deliberately.

### 2. Writing SUM(col)/COUNT(*) and calling it AVG

Already covered in Example 7. The numerator and denominator disagree on what counts.

### 3. Dividing integers inside or around aggregates

```sql
-- BAD
SELECT SUM(total) / COUNT(*) AS avg_order FROM orders;   -- integer division on many engines

-- BETTER
SELECT ROUND(AVG(total), 2) FROM orders;
```

### 4. Expecting MIN/MAX to return a row, not a value

`SELECT MAX(salary) FROM employees` returns `10000.00`, not "Bruno". To get Bruno you need a subquery/join or a window function. (Cross-reference: *Section 26 — Scalar Subqueries*, WINDOW FUNCTIONS section.)

### 5. Aggregating after the wrong grain (fan-out)

The Example 5 scenario. The number-one production counting bug.

### 6. Putting an aggregate in WHERE

```sql
-- syntax error everywhere
SELECT department_id FROM employees WHERE COUNT(*) > 2 GROUP BY department_id;
```

Aggregates are computed at grouping time; `WHERE` runs before grouping. Use `HAVING` (Section 37).

### 7. MySQL-only relaxation

```sql
SELECT department_id, name, COUNT(*) FROM employees GROUP BY department_id; -- MySQL-only
```

Without `ONLY_FULL_GROUP_BY`, MySQL picks an arbitrary `name` per group; PostgreSQL/SQL Server/Oracle reject it. Never rely on it.

---

## Common misconceptions

> "COUNT(1) is faster than COUNT(*)."
> Both count rows; the `1` is a constant the optimizer ignores. They compile to the same plan on modern engines. Verify in the plan if you care.

> "AVG gives the average of all rows."
> Only if no values are NULL. It averages the non-NULL subset. The denominator is `COUNT(col)`, not `COUNT(*)`.

> "MIN/MAX only work on numbers."
> They work on anything orderable: dates, timestamps, strings, enums. And the direction of string MIN/MAX follows the collation.

> "An aggregate over no rows returns 0."
> Only COUNT does. SUM/AVG/MIN/MAX return NULL.

> "GROUP BY deletes duplicates" / "aggregates remove rows so DISTINCT is the same."
> Covered in Section 36. GROUP BY creates buckets and computes per-bucket values; it does not deduplicate rows (though the output can resemble DISTINCT when you select only the grouping keys).

> "MIN(DISTINCT x) / MAX(DISTINCT x) are useful."
> Deduplicating before taking a min/max changes nothing. Redundant forms.

---

## Production pitfalls

### 1. Fan-out double counting (the #1 revenue-report bug)

Aggregating a fact column after a one-to-many JOIN inflates totals (Example 5). Mitigations: aggregate the child first, group with `COUNT(DISTINCT driving_key)`, or deduplicate the child. Verify against the grain, not against the plan.

### 2. NULL-vs-zero confusion in dashboards

`SUM(...) → NULL` (no rows) is rendered by many BI tools as an empty cell, while `0` renders as `0`. If the business wants `0`, write `COALESCE(SUM(x), 0)` — and decide case by case: "no data" and "zero data" are genuinely different facts.

### 3. Integer overflow

`SUM`/`AVG` of large numbers can overflow (SQL Server `SUM(int)`). Use `BIGINT`/`NUMERIC` casts where totals can grow. PostgreSQL's `SUM(int) → bigint` and Oracle's `NUMBER` mostly dodge this.

### 4. COUNT(DISTINCT) memory blowup

`COUNT(DISTINCT col)` builds a distinct set and can spill to disk or dominate the plan at scale. Approximate counting, pre-aggregated counters, or column-store/analytic engines exist for that case (HLL-based approximate distinct-count functions in several engines). Exactness vs cost is a tradeoff — decide explicitly.

### 5. Recomputing the same heavy aggregate every request

"Total revenue" or "average session length" over hundreds of millions of rows, recomputed per dashboard load, is a classic cost spike. Pre-aggregation tables, materialized views, or incremental counters shift the cost to write time. These are schema-level decisions, reviewed with the plan.

### 6. Grouping on non-existent keys hides zero buckets

Months/departments with no data simply do not appear (Example 10). Forcing them requires key generation + LEFT JOIN. See Section 16 (LEFT JOIN) and Section 36.

### 7. Timestamp/timezone boundaries when grouping by day

`GROUP BY order_date` is trivial for a `DATE`. Grouping `timestamp` by day crosses boundaries under timezones — a classic "today's count is wrong at midnight" ticket. Cross-reference the TIMESTAMP / TIMEZONE sections of this handbook.

---

## Performance implications

Performance depends on optimizer, indexes, statistics, cardinality, data distribution, query shape, and engine. No blanket rule survives contact with a real plan. The useful *tendencies* to test:

- **Aggregation strategy**: hash vs sorted (Section overview above). Inspect with the plan tools.
- **Index on GROUP BY columns**: rows arriving sorted can enable the sorted aggregate and avoid an explicit sort; a covering index on `(group_col, agg_col)` can permit an index-only scan so the heap is never touched. Whether it beats a hash aggregate depends on size and statistics — confirm in the plan.
- **MIN/MAX on an index**: some optimizers can use an index to grab the extreme value (e.g., PostgreSQL's "Index Only Scan"/`IndexScan` for MIN/MAX, MySQL "Select tables optimized away") without a full scan. On an unindexed column, MIN/MAX is a full scan like everything else.
- **COUNT(DISTINCT col)** is structurally more expensive than `COUNT(*)` — it is a distinct-aggregation, not an increment. At scale this is frequently the operator that dominates the plan.
- **Parallelism**: engines can parallelize aggregation (partial aggregates merged in a `Gather`/final node). A plan that shows a sequential single-node aggregate is not using parallelism; that can be a red flag on big scans.
- **Pressure on memory**: hash aggregation spills when the group-family exceeds `work_mem` (PostgreSQL) / `sort_area_size` / memory grant (SQL Server). Spill (temp files / `Hash Bailout`) shows up in the plan and is a real slowdown.
- **Filtering earlier always reads fewer rows**: a predicate pushed to `WHERE` (Example 4) reduces what aggregation sees; the same predicate in `HAVING` does not (Section 37).
- **Scalar subqueries vs JOIN aggregates**: both compute correct shares; which is faster depends on data size, indexes, and the plan — never assume, always `EXPLAIN ANALYZE`.

Minimum verification ritual for any aggregate on a big table:

> PostgreSQL: `EXPLAIN (ANALYZE, BUFFERS)`
> MySQL: `EXPLAIN ANALYZE`
> SQL Server: `SET STATISTICS IO, TIME ON` + the graphical/actual plan
> Oracle: `EXPLAIN PLAN` + `DBMS_XPLAN.DISPLAY(... ,'ALL', 'ADAPTIVE')`

Ask of the plan: operator name (hash vs sorted), actual rows vs estimates, temp-file spills, which nodes touch the heap vs an index-only scan, and whether the aggregate can start early.

---

## Comparison tables

### When to use which aggregate

| Question | Function |
|---|---|
| How many rows matched? | `COUNT(*)` |
| How many non-NULL values in a column? | `COUNT(col)` |
| How many distinct values? | `COUNT(DISTINCT col)` |
| Total of a numeric column? | `SUM(col)` |
| Typical value? | `AVG(col)` |
| Smallest value (any orderable type)? | `MIN(col)` |
| Largest value (any orderable type)? | `MAX(col)` |
| Count/SUM only when a condition is true | `SUM(CASE WHEN ... THEN 1 END)` or `FILTER` |
| Value of the extreme *row*, not the value | subquery / window function, *not* MIN/MAX |

### COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)

| | `COUNT(*)` | `COUNT(col)` | `COUNT(DISTINCT col)` |
|---|---|---|---|
| Counts NULL rows? | Yes | No | No |
| Empty set → | 0 | 0 | 0 |
| Cost | cheap | cheap | more (distinct set) |
| Typical meaning | matched rows | completed/recorded values | unique values |

### AVG vs the manual expressions

| Expression | Denominator | NULL meaning |
|---|---|---|
| `AVG(salary)` | non-NULL count | NULLs ignored |
| `SUM(salary)/COUNT(*)` | all rows | NULL → counted as 0 |
| `SUM(salary)/COUNT(salary)` | non-NULL count | same as AVG (minus numeric-type effects) |

---

## Interview traps

> `AVG` divides by the number of **non-NULL** values. "Average of what subset?" is always the follow-up question.

> `COUNT(*)` counts rows, even all-NULL rows. `COUNT(col)` does not. The classic NULL-detection query is `COUNT(*) <> COUNT(col)`.

> `SUM`/`AVG`/`MIN`/`MAX` over no rows (or all-NULL input) return `NULL`, not `0`. Only `COUNT` returns `0`.

> Aggregates cannot appear in `WHERE` — they are computed at grouping time. The fix is `HAVING` (Section 37).

> `SELECT MAX(salary)` gives you a number, not the employee. "Give me the name of the highest-paid employee" requires a subquery/join or window function.

> On SQL Server, `AVG(integer_column)` returns an integer with the fraction truncated.

> `100 * SUM(x)/SUM(y)` on integers is integer division — results collapse to 0 for small fractions. Write `100.0`.

> `COUNT(DISTINCT GROUP_BY_COLUMN)` inside a grouped query always returns 1 per group (or 0-ish behavior for NULL-only groups). It is usually a sign the writer mis-grabbed the grain.

> `MIN`/`MAX` on strings depend on collation; a case-insensitive collation can change the "first/last" value — the plan optimizations for MIN/MAX cannot change *which collation orders the strings*.

---

## Best practices

1. **State the grain first**: "one row = one order". Then decide the output grain (one row per order? per customer? per region?).
2. Pick `COUNT(*)` for row counts and `COUNT(col)` for non-NULL counts — deliberately, out loud.
3. Decide NULL policy before writing `AVG`/`SUM`: exclude (default), treat as 0 (`ELSE 0` / `COALESCE`), or separate "no data" from "zero".
4. When summing across a one-to-many JOIN, aggregate values owned by the child before joining, or use `COUNT(DISTINCT driving_key)` and never `SUM` the parent's column after the fan-out.
5. Use `COALESCE(SUM(x), 0)` at the boundary where NULL (no data) and 0 (real zero) are conflated for display.
6. Use `100.0 *` or explicit casts anywhere a fraction is expected.
7. Use conditional aggregation (`SUM(CASE WHEN ...)`) instead of multiple passes over the table to produce several counts in one scan.
8. Prefer `EXPLAIN (ANALYZE)` before claiming a variant is faster — hash vs sorted, index-only scans, spills, parallel nodes.
9. Keep aggregates out of `WHERE` (use `HAVING`); keep row filters in `WHERE` before grouping.
10. When a query recomputes a heavy aggregate repeatedly, promote it to a pre-aggregated table or materialized view and validate the plan.

---

# Interview Questions

## Beginner

1. In one sentence each: what do `COUNT`, `SUM`, `AVG`, `MIN`, and `MAX` return?
2. What is the difference between `COUNT(*)` and `COUNT(salary)` on a column that contains NULLs?
3. Write a query: number of employees and average salary per department.
4. What does this return, and write one row of output: `SELECT COUNT(*), AVG(salary) FROM employees;`
5. Can you call a single aggregate *without* `GROUP BY`? What happens to the output grain?
6. What is the difference between `AVG(salary)` and `SUM(salary) / COUNT(*)` when some salaries are NULL?

## Intermediate

7. Predict and explain: on the sample data, `COUNT(*)` vs `COUNT(salary)` vs `COUNT(DISTINCT country)` over the whole `employees` table.
8. Write a query: per region, number of orders, number of distinct customers, earliest and latest order date.
9. The query `SELECT o.order_id, SUM(o.total) FROM orders o JOIN order_items oi ON oi.order_id = o.order_id WHERE o.order_id IN (1,5) GROUP BY o.order_id;` returns 500.00 and 600.00. Why is it wrong and how do you fix it?
10. Orders `6` had a payment `40` and a refund `-40`. What does `SUM(amount)` produce for it, and why is that different from "no payments at all" in a LEFT JOIN result?
11. What return type does `AVG` produce for an integer column in PostgreSQL vs MySQL vs SQL Server vs Oracle, and what does that mean for SQL Server's `AVG(quantity)` on data `(2,1,1,3,2,1)`?
12. Why does `SELECT MAX(salary) FROM employees` return `10000.00` and not Bruno? How would you actually get Bruno's name?

## Advanced

13. Explain the difference between a hash aggregate and a sorted (stream) aggregate. Query would produce which operator, and what in the plan proves it?
14. Describe a covering-index strategy that could let `GROUP BY department_id` compute `SUM(salary)` without touching the heap. When might the optimizer still prefer a full scan?
15. What are the tradeoffs of exact `COUNT(DISTINCT col)` vs an HLL-style approximate distinct count? When is approximate acceptable?
16. Compare producing "average salary per department attached to every employee row" via `GROUP BY` + JOIN vs a window `AVG(...) OVER (PARTITION BY ...)`. Which fits the grain of the output?
17. Oracle groups NULLs in the GROUP BY key by themselves; PostgreSQL groups them together. How does that change `SELECT department_id, COUNT(*), SUM(salary) ... GROUP BY department_id` across the two engines?

## Scenario Based

18. Using `orders`: per region, compute shipped revenue and average shipped order value for 2026 only, keeping regions with at least 2 shipped orders.
19. Using `orders` + `order_items`: report total revenue per customer without double counting the order total. State the grain of every step.
20. Using `payments`: find orders that were paid more than once, and orders whose net paid equals zero despite one positive payment event.
21. Using `employees`: which departments would disappear from a `GROUP BY department_id` count if all their salaries were NULL, and how would you still show them with a count of 0?
22. Build a single query on `orders` that counts orders, shipped orders, pending orders, and cancelled orders across all regions in one scan.

## Tricky

23. `SELECT COUNT(*) FROM (SELECT DISTINCT department_id FROM employees)` vs `SELECT COUNT(DISTINCT department_id) FROM employees` — are they always identical? Why?
24. Two employees share the maximum salary. Does `MAX(salary)` return both, one, or error? What must you do to list every employee at the max?
25. What does `SUM(salary) OVER (PARTITION BY department_id)` return for a department with 3 employees, and how does the number of output rows differ from the `GROUP BY` version?
26. On a table where `SUM(salary)` is `NULL`, what is `SUM(salary) > 0`? What is `SUM(salary) IS NULL`? (Three-valued logic refresher: Section 10.)
27. `SELECT SUM(CASE WHEN status='shipped' THEN total END)` vs `SELECT SUM(CASE WHEN status='shipped' THEN total ELSE 0 END)` — when do their outputs differ, and by how much?

## Output Prediction

28. Given `employees` (from the sample data), predict the exact row:

```sql
SELECT COUNT(*) AS n,
       COUNT(salary) AS w,
       SUM(salary) AS s,
       ROUND(AVG(salary), 2) AS a,
       MIN(salary) AS lo,
       MAX(salary) AS hi
FROM employees;
```

29. Given `employees`, predict the output of:

```sql
SELECT department_id, COUNT(*), COUNT(salary)
FROM employees
GROUP BY department_id
ORDER BY department_id;
```

30. Given `orders` + `order_items`, predict:

```sql
SELECT o.region, COUNT(*) AS lines, SUM(o.total) AS value
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.region
ORDER BY lines DESC;
```

and explain why `value` is not meaningful for two of the regions.

## Debugging

31. A dashboard shows "average salary = lower than any individual salary in the group". The query uses `SUM(salary) / COUNT(*)`. Diagnose and fix.
32. `SELECT SUM(total) FROM orders WHERE status = 'shipped'` returns NULL but you can see shipped orders in the table. What is the most likely cause and how do you prove it?
33. A revenue report sums the `orders.total` column but the total is exactly twice the expected revenue after a `order_items` JOIN was added last month. Reproduce, explain with a plan, and fix.
34. Why might `SELECT AVG(quantity) FROM order_items` return `1` on SQL Server while PostgreSQL returns `1.6667`?

## Performance

35. Why can `COUNT(DISTINCT col)` dominate a plan on large tables where `COUNT(*)` barely registers? Name the algorithm-level reason and two alternatives.
36. Design an experiment with `EXPLAIN (ANALYZE)` to compare computing a department average with an index only vs a full scan, and describe what plan shape would prove each claim.
37. A query groups by `department_id` and aggregates `salary`. Would indexes on `(department_id)`, `(salary)`, or `(department_id, salary)` help — and what must the plan show for you to believe they do?
38. Could a MIN/MAX query ever avoid a full table scan when the column is indexed? What in the plan would confirm it actually did?
39. A huge `GROUP BY` aggregates slowly and writes temp files. Without modifying the data model, what knobs and formulations would you try, and how would you validate the improvement?