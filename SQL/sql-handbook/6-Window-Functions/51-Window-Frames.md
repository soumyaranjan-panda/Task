# 51 — Window Frames

A **window frame** defines the exact subset of rows within a partition that a window function sees when computing its result. Without an explicit frame, the database picks a default — and that default can silently produce wrong answers.

> Related sections: [Window Functions (overview)](#), [ROW_NUMBER / RANK / DENSE_RANK](#), [Aggregate Window Functions](#), [GROUP BY vs Window Functions](#)

---

## Table of Contents

1. [What Is a Window Frame?](#what-is-a-window-frame)
2. [Syntax](#syntax)
3. [Frame Types — ROWS, RANGE, GROUPS](#frame-types)
4. [Frame Boundaries](#frame-boundaries)
5. [Default Frame Behavior](#default-frame-behavior)
6. [Sample Tables](#sample-tables)
7. [Fundamental Examples](#fundamental-examples)
8. [RANGE vs ROWS — The Critical Difference](#range-vs-rows)
9. [GROUPS Frame Type](#groups-frame-type)
10. [Window Frame with Aggregate Functions](#window-frame-with-aggregates)
11. [Window Frame with Ranking Functions](#window-frame-with-ranking)
12. [Cumulative and Sliding Patterns](#cumulative-and-sliding-patterns)
13. [Frame + PARTITION Interaction](#frame-partition-interaction)
14. [NULLs and Window Frames](#nulls-and-window-frames)
15. [Edge Cases](#edge-cases)
16. [Common Mistakes](#common-mistakes)
17. [Production Pitfalls](#production-pitfalls)
18. [Performance Implications](#performance-implications)
19. [Comparison Table](#comparison-table)
20. [Best Practices](#best-practices)
21. [Interview Questions](#interview-questions)

---

## What Is a Window Frame?

Every window function has three parts:

```
FUNCTION() OVER (
    PARTITION BY ...
    ORDER BY ...
    ROWS / RANGE / GROUPS BETWEEN <start> AND <end>
)
              ─────   ─────   ─────────────────────
              Partition Frame    Frame boundaries
```

The **partition** divides rows into independent groups. The **frame** then selects a sliding subset *within* that partition (or the whole partition if there is no `ORDER BY`).

| Concept | Analogy |
|---|---|
| `PARTITION BY` | "Which classroom?" |
| `ORDER BY` | "Seat students in a line" |
| Frame | "Which students can this student see?" |

Without a frame, the database applies a **default** that may be `RANGE UNBOUNDED PRECEDING TO CURRENT ROW` — which can include more rows than you expect when values tie in `ORDER BY`.

---

## Syntax

```sql
<function>(...) OVER (
    [PARTITION BY <expr>, ...]
    [ORDER BY <expr> [ASC|DESC], ...]
    [<frame_clause>]
)

-- where frame_clause is:
{ ROWS | RANGE | GROUPS }
    BETWEEN <frame_start> AND <frame_end>

-- frame_start and frame_end can be:
    UNBOUNDED PRECEDING
  | <n> PRECEDING
  | CURRENT ROW
  | <n> FOLLOWING
  | UNBOUNDED FOLLOWING
```

**Valid combinations:**

| Frame Start | Frame End Allowed |
|---|---|
| `UNBOUNDED PRECEDING` | `CURRENT ROW`, `<n> FOLLOWING`, `UNBOUNDED FOLLOWING` |
| `<n> PRECEDING` | `<n> FOLLOWING`, `UNBOUNDED FOLLOWING` |
| `CURRENT ROW` | `<n> FOLLOWING`, `UNBOUNDED FOLLOWING` |

Invalid: `<n> FOLLOWING` as a start, or `CURRENT ROW` as an end when start is `<n> FOLLOWING` — the start must be ≤ the end conceptually.

---

## Frame Types

| Type | Unit of Measurement | Ties in ORDER BY |
|---|---|---|
| `ROWS` | Physical row position | Each row is independent — ties are ordered arbitrarily |
| `RANGE` | Logical value range | All tied rows are included in the frame |
| `GROUPS` | Groups of peer rows (same ORDER BY value) | All tied rows form one group |

> `GROUPS` was introduced in SQL:2011. PostgreSQL 11+ supports it. MySQL 8.0+ supports it. SQL Server does **not** support `GROUPS`. Oracle does **not** support `GROUPS`.

---

## Frame Boundaries

| Boundary | Meaning |
|---|---|
| `UNBOUNDED PRECEDING` | First row of the partition |
| `<n> PRECEDING` | n rows (or groups) before the current row |
| `CURRENT ROW` | The row currently being evaluated |
| `<n> FOLLOWING` | n rows (or groups) after the current row |
| `UNBOUNDED FOLLOWING` | Last row of the partition |

---

## Default Frame Behavior

This is **critical** and database-specific:

| Condition | Default Frame |
|---|---|
| `ORDER BY` is **present** | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` |
| `ORDER BY` is **absent** | `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` (entire partition) |

> PostgreSQL, MySQL, SQL Server, Oracle — all follow this default.

### Why the default can be dangerous

With `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, every row with the **same value** as the current row in the `ORDER BY` column is included. If you have ties and you want a running sum of exactly the rows up to and including the current physical row, the default `RANGE` frame gives the **wrong answer**.

```
> Common misconception: "If I don't specify a frame, the function only
> sees rows up to the current row." — Only true for ROWS. The default is RANGE.
```

---

## Sample Tables

### `daily_sales`

One row per day per product. Grain: **one row = one product on one date**.

```sql
CREATE TABLE daily_sales (
    product_id   INT,
    sale_date    DATE,
    amount       DECIMAL(10,2)
);

INSERT INTO daily_sales VALUES
(1, '2025-01-01', 100.00),
(1, '2025-01-02', 150.00),
(1, '2025-01-03', 150.00),  -- tie with Jan 2
(1, '2025-01-04', 200.00),
(1, '2025-01-05', 120.00),
(2, '2025-01-01', 300.00),
(2, '2025-01-02', 250.00),
(2, '2025-01-03', 400.00);
```

### `employees`

One row per employee. Grain: **one row = one employee**.

```sql
CREATE TABLE employees (
    emp_id       INT,
    emp_name     VARCHAR(50),
    department   VARCHAR(50),
    salary       DECIMAL(10,2),
    hire_date    DATE
);

INSERT INTO employees VALUES
(1, 'Alice',   'Engineering', 90000, '2020-03-15'),
(2, 'Bob',     'Engineering', 85000, '2021-06-01'),
(3, 'Charlie', 'Engineering', 85000, '2022-01-10'),  -- tie with Bob
(4, 'Diana',   'Marketing',   70000, '2019-11-20'),
(5, 'Eve',     'Marketing',   75000, '2023-02-28'),
(6, 'Frank',   'Sales',       60000, '2021-08-15');
```

---

## Fundamental Examples

### Example 1 — Running Total (ROWS)

```sql
SELECT
    product_id,
    sale_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM daily_sales
WHERE product_id = 1;
```

| product_id | sale_date  | amount | running_total |
|---|---|---|---|
| 1 | 2025-01-01 | 100.00 | 100.00 |
| 1 | 2025-01-02 | 150.00 | 250.00 |
| 1 | 2025-01-03 | 150.00 | 400.00 |
| 1 | 2025-01-04 | 200.00 | 600.00 |
| 1 | 2025-01-05 | 120.00 | 720.00 |

Each row adds exactly its own `amount`. Clean, predictable, physical.

### Example 2 — Running Total (RANGE — Default)

```sql
SELECT
    product_id,
    sale_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY product_id
        ORDER BY amount
        -- RANGE is the default
    ) AS range_running_total
FROM daily_sales
WHERE product_id = 1;
```

| product_id | sale_date  | amount | range_running_total |
|---|---|---|---|
| 1 | 2025-01-01 | 100.00 | 100.00 |
| 1 | 2025-01-02 | 150.00 | 400.00 |
| 1 | 2025-01-03 | 150.00 | 400.00 | ← same! both 150s included
| 1 | 2025-01-04 | 200.00 | 600.00 |
| 1 | 2025-01-05 | 120.00 | 720.00 |

Notice: rows with `amount = 150` both get `400.00` because `RANGE` includes all rows where the `ORDER BY` value ≤ the current row's value.

> **This is correct behavior** — but it is almost never what people mean by "running total."

### Example 3 — Moving Average (Sliding Window)

```sql
SELECT
    product_id,
    sale_date,
    amount,
    AVG(amount) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS moving_avg_3
FROM daily_sales
WHERE product_id = 1;
```

| product_id | sale_date  | amount | moving_avg_3 |
|---|---|---|---|
| 1 | 2025-01-01 | 100.00 | 125.00 | ← (100+150)/2, only 1 row ahead
| 1 | 2025-01-02 | 150.00 | 133.33 | ← (100+150+150)/3
| 1 | 2025-01-03 | 150.00 | 166.67 | ← (150+150+200)/3
| 1 | 2025-01-04 | 200.00 | 156.67 | ← (150+200+120)/3
| 1 | 2025-01-05 | 120.00 | 160.00 | ← (200+120)/2, only 1 row behind

---

## RANGE vs ROWS — The Critical Difference

This is the single most important concept in window frames.

```
ROWS:    physical, positional — "count actual rows"
RANGE:   logical, value-based — "include all rows with the same ORDER BY value"
GROUPS:  logical, peer-based — "include all groups of tied rows"
```

### Demonstration

Using `daily_sales` where `amount = 150` appears on two dates:

```sql
-- ROWS frame: each row is independent
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS rows_total
FROM daily_sales
WHERE product_id = 1;

-- RANGE frame: tied values are grouped
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS range_total
FROM daily_sales
WHERE product_id = 1;
```

| sale_date  | amount | rows_total | range_total |
|---|---|---|---|
| 2025-01-01 | 100.00 | 100.00 | 100.00 |
| 2025-01-02 | 150.00 | 250.00 | 400.00 |
| 2025-01-03 | 150.00 | 400.00 | 400.00 |
| 2025-01-04 | 200.00 | 600.00 | 600.00 |
| 2025-01-05 | 120.00 | 720.00 | 720.00 |

```
Interview trap: A question asks for a "running total." If the ORDER BY column
has ties and you use the default frame, you get RANGE behavior. The interviewer
may expect ROWS behavior. Always clarify or explicitly write the frame clause.
```

### Visual

```
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
Order by amount:

  [100] → [150(a)] → [150(b)] → [120] → [200]
  ↑           ↑           ↑         ↑        ↑
  100       100+150(a)  100+150(a) 100+..  100+..
                      +150(b)

Each row advances the frame by exactly one physical row.

RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
Order by amount:

  [100] → [150(a)] → [150(b)] → [120] → [200]
  ↑           ↑           ↑         ↑        ↑
  100      100+150a    100+150a  100+..  100+..
            +150b      +150b

All rows with amount ≤ 150 are included for BOTH 150(a) and 150(b).
```

---

## GROUPS Frame Type

`GROUPS` counts **peer groups** (rows with the same `ORDER BY` value) as one unit.

```sql
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS groups_total
FROM daily_sales
WHERE product_id = 1;
```

| sale_date  | amount | groups_total |
|---|---|---|
| 2025-01-01 | 100.00 | 100.00 |
| 2025-01-02 | 150.00 | 400.00 |
| 2025-01-03 | 150.00 | 400.00 |
| 2025-01-04 | 200.00 | 600.00 |
| 2025-01-05 | 120.00 | 720.00 |

For `amount = 150`, both rows see the same result because they are in the same peer group.

When there are **no ties**, `ROWS`, `RANGE`, and `GROUPS` produce identical results for the same boundary definitions.

> PostgreSQL supports `GROUPS` (since version 11). MySQL 8.0+ supports `GROUPS`. SQL Server does not. Oracle does not.

---

## Window Frame with Aggregate Functions

Window frames matter most with aggregate functions (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`).

### COUNT with Frame

```sql
SELECT
    sale_date,
    amount,
    COUNT(*) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS rows_in_frame
FROM daily_sales
WHERE product_id = 1;
```

| sale_date  | amount | rows_in_frame |
|---|---|---|
| 2025-01-01 | 100.00 | 1 |
| 2025-01-02 | 150.00 | 2 |
| 2025-01-03 | 150.00 | 3 |
| 2025-01-04 | 200.00 | 3 |
| 2025-01-05 | 120.00 | 3 |

### MIN / MAX with Frame

```sql
SELECT
    sale_date,
    amount,
    MIN(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS local_min,
    MAX(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS local_max
FROM daily_sales
WHERE product_id = 1;
```

| sale_date  | amount | local_min | local_max |
|---|---|---|---|
| 2025-01-01 | 100.00 | 100.00 | 150.00 |
| 2025-01-02 | 150.00 | 100.00 | 150.00 |
| 2025-01-03 | 150.00 | 150.00 | 200.00 |
| 2025-01-04 | 200.00 | 150.00 | 200.00 |
| 2025-01-05 | 120.00 | 200.00 | 120.00 | ← frame is only 2 rows: 200, 120

---

## Window Frame with Ranking Functions

`ROW_NUMBER`, `RANK`, `DENSE_RANK` do **not** use frames — they always operate over the entire partition (or the entire result set if no `PARTITION BY`). The frame clause is ignored.

```sql
-- This works but the frame clause is meaningless
SELECT
    emp_name,
    salary,
    RANK() OVER (
        ORDER BY salary
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW  -- IGNORED
    ) AS r
FROM employees;
```

> The SQL standard says: for `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE`, `LEAD`, `LAG` — the frame clause is either not allowed or has no effect. Always check your database's behavior.

---

## Cumulative and Sliding Patterns

### Pattern 1 — Cumulative Sum (Running Total)

```sql
-- Explicit ROWS frame (recommended)
SUM(amount) OVER (
    PARTITION BY product_id
    ORDER BY sale_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS cumulative_sum
```

### Pattern 2 — Cumulative Average

```sql
AVG(amount) OVER (
    PARTITION BY product_id
    ORDER BY sale_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS cumulative_avg
```

### Pattern 3 — Sliding Window (Last 3 rows including current)

```sql
AVG(amount) OVER (
    PARTITION BY product_id
    ORDER BY sale_date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
) AS moving_avg_3
```

### Pattern 4 — Sliding Window (Current and next 2)

```sql
SUM(amount) OVER (
    PARTITION BY product_id
    ORDER BY sale_date
    ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING
) AS forward_sum_3
```

### Pattern 5 — Entire Partition (explicit)

```sql
SUM(amount) OVER (
    PARTITION BY product_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
) AS partition_total
```

This is equivalent to using `SUM(amount) OVER (PARTITION BY product_id)` with **no** `ORDER BY` — the default frame when `ORDER BY` is absent is the entire partition.

### Pattern 6 — Percent of Partition Total

```sql
SELECT
    product_id,
    sale_date,
    amount,
    SUM(amount) OVER (PARTITION BY product_id) AS partition_total,
    ROUND(
        amount * 100.0 / SUM(amount) OVER (PARTITION BY product_id),
        2
    ) AS pct_of_total
FROM daily_sales;
```

This uses the entire-partition frame (default when `ORDER BY` is absent).

---

## Frame + PARTITION Interaction

The frame operates **within** each partition. Partitions are independent.

```sql
SELECT
    product_id,
    sale_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM daily_sales;
```

The running total **resets** for each `product_id` because the frame is bounded by the partition.

> If you omit `PARTITION BY`, the frame spans the entire result set — which is usually not what you want for per-group running totals.

---

## NULLs and Window Frames

### NULL Ordering

How `ORDER BY` handles `NULLs` affects which rows fall in the frame:

| Database | Default NULL ordering |
|---|---|
| PostgreSQL | `NULLS LAST` (ASC), `NULLS FIRST` (DESC) |
| MySQL | `NULL` treated as smallest value (first in ASC) |
| SQL Server | `NULL` treated as smallest value (first in ASC) |
| Oracle | `NULL` treated as largest value (last in ASC) |

```sql
-- PostgreSQL: NULLs go last in ascending order by default
-- MySQL/SQL Server: NULLs go first in ascending order by default

-- To be explicit and portable:
ORDER BY amount ASC NULLS LAST
```

If NULLs are sorted first (ASC), a `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` frame starting from a non-NULL row includes all NULLs (they are before). If NULLs are sorted last, they are not included until the current row is a NULL.

### NULL in Frame Boundaries

Frame boundaries use physical position (ROWS) or logical value (RANGE). NULL values in the `ORDER BY` column are ordered but the frame boundary `<n> PRECEDING` / `<n> FOLLOWING` counts physical rows (for ROWS) or peer groups (for GROUPS/RANGE).

---

## Edge Cases

### Edge Case 1 — Single Row Partition

```sql
-- With only 1 row in a partition, all frames produce the same result
SELECT
    emp_id,
    salary,
    SUM(salary) OVER (
        PARTITION BY department
        ORDER BY salary
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS frame_sum
FROM employees
WHERE department = 'Sales';
```

Only Frank exists. Frame is just [Frank]. Result: 60000.

### Edge Case 2 — Frame Extends Beyond Partition

```sql
-- Frame beyond partition boundary? The database silently truncates.
-- ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING on a 3-row partition:
-- The frame only includes the 3 existing rows.
```

No error. No NULLs. The frame is clamped to the partition boundaries.

### Edge Case 3 — Empty Partition

```sql
-- If a partition has 0 rows, no output is produced for that partition.
-- No error, no NULL row.
```

### Edge Case 4 — Frame Start > Frame End

```sql
-- ROWS BETWEEN 1 FOLLOWING AND 1 PRECEDING
-- This is invalid SQL. Most databases return an error.
```

### Edge Case 5 — <n> = 0

```sql
-- ROWS BETWEEN 0 PRECEDING AND 0 FOLLOWING
-- Equivalent to: ROWS BETWEEN CURRENT ROW AND CURRENT ROW
-- Frame contains only the current row.
```

### Edge Case 6 — ORDER BY on a Column with All Unique Values

When there are no ties, `ROWS` and `RANGE` produce identical results. The difference only manifests with ties.

---

## Common Mistakes

### Mistake 1 — Forgetting the Frame Defaults to RANGE

```sql
-- BAD: You want a per-row running total but the default is RANGE
SELECT
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY amount) AS running_total
FROM orders;

-- BETTER: Explicitly use ROWS
SELECT
    order_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;
```

**Why**: With ties in `amount`, the RANGE default includes all tied rows for every tied row, which is not a "running" total.

### Mistake 2 — Using Frame When ORDER BY Is Absent

```sql
-- When ORDER BY is absent, the default frame is the entire partition.
-- This is fine for partition-level aggregates:
SELECT
    product_id,
    amount,
    SUM(amount) OVER (PARTITION BY product_id) AS product_total
FROM daily_sales;

-- But if you add a frame clause with no ORDER BY, it may behave differently:
-- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- With no ORDER BY, CURRENT ROW is undefined — results are database-specific.
```

> **Production pitfall**: Without `ORDER BY`, `CURRENT ROW` in a frame clause has no well-defined meaning. PostgreSQL and MySQL treat it as the entire partition. SQL Server may behave differently. Always include `ORDER BY` when using `CURRENT ROW` in frame boundaries.

### Mistake 3 — Confusing Running Total with Partition Total

```sql
-- BAD: This gives partition total, not running total
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER (PARTITION BY product_id) AS running_total  -- WRONG
FROM daily_sales;

-- BETTER: This gives running total
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM daily_sales;
```

### Mistake 4 — Using RANGE for Sliding Windows

```sql
-- If you want "last 3 rows," use ROWS, not RANGE
-- RANGE BETWEEN 2 PRECEDING AND CURRENT ROW includes all rows within
-- a value range of 2 — not exactly 3 rows.

-- BAD (may include more or fewer than 3 rows):
SUM(amount) OVER (ORDER BY sale_date RANGE BETWEEN INTERVAL '2' DAY PRECEDING AND CURRENT ROW)

-- BETTER (exactly 3 rows):
SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
```

### Mistake 5 — Assuming Frame Affects Ranking Functions

```sql
-- Frame clause has no effect on RANK, ROW_NUMBER, DENSE_RANK
-- This is redundant but harmless:
RANK() OVER (ORDER BY salary ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

---

## Production Pitfalls

### 1. Unintended RANGE Expansion

In a table with millions of rows and low-cardinality `ORDER BY` column, a `RANGE` frame can silently include massive numbers of rows, causing memory pressure and slow queries.

**Always verify** with `EXPLAIN ANALYZE` that the frame isn't expanding beyond what you expect.

### 2. Performance Degradation with Large Frames

`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` requires the database to maintain a running aggregate. For some functions (like `SUM`, `COUNT`), databases can optimize this incrementally. For others (`LISTAGG`, `ARRAY_AGG`, `PERCENTILE_CONT`), the entire partition must be sorted and held in memory.

> **Production pitfall**: Running aggregates over partitions with millions of rows can cause OOM (out-of-memory) errors or disk spills. Always test with production-scale data.

### 3. Non-Deterministic Results with Ties

When `ORDER BY` has ties and you use `ROWS`, the ordering of tied rows is **non-deterministic** unless you add a tiebreaker:

```sql
-- BAD: Non-deterministic ordering of tied rows
ROW_NUMBER() OVER (ORDER BY salary)

-- BETTER: Deterministic with tiebreaker
ROW_NUMBER() OVER (ORDER BY salary, emp_id)
```

### 4. Frame + Partition Memory

Each partition requires its own frame state. A query with many small partitions (e.g., per-user analytics) can create millions of independent frames.

---

## Performance Implications

### What to Check in Execution Plans

1. **Sort operations**: `ORDER BY` in the window function requires sorting. Check if a sort appears in the plan.
2. **Memory usage**: Large partitions with complex frames may spill to disk.
3. **Index support**: An index on `(PARTITION BY cols, ORDER BY cols)` can eliminate the sort.

```sql
-- This index supports the window function:
CREATE INDEX idx_daily_sales_product_date
    ON daily_sales (product_id, sale_date);

-- This index supports RANGE on amount:
CREATE INDEX idx_daily_sales_amount
    ON daily_sales (product_id, amount);
```

### ROWS vs RANGE Performance

- `ROWS`: Database maintains a positional window. Typically more efficient.
- `RANGE`: Database must compare values and potentially include all peers. May require scanning more rows.
- `GROUPS`: Database groups peers first, then applies frame. Overhead depends on number of ties.

> Performance depends on the optimizer, data distribution, statistics, and cardinality. Always verify with `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL), or the equivalent for your database.

### Anti-Pattern: Nested Window Functions with Different Frames

```sql
-- Each window function re-sorts the data independently
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
    AVG(amount) OVER (ORDER BY sale_date ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING),
    COUNT(*) OVER (ORDER BY sale_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
FROM daily_sales;
```

Each `OVER` clause may cause a separate sort. Some databases can merge sorts if the `ORDER BY` is identical; others cannot. Minimize distinct `ORDER BY` clauses when possible.

---

## Comparison Table

| Feature | ROWS | RANGE | GROUPS |
|---|---|---|---|
| Unit | Physical rows | Logical values | Peer groups |
| Ties handled | Individually (arbitrary order) | All included together | All included together |
| Default with ORDER BY | No | Yes (default) | No |
| Requires ORDER BY | Yes (for `CURRENT ROW`/`<n>` boundaries) | Yes | Yes |
| PostgreSQL | ✅ | ✅ | ✅ (v11+) |
| MySQL 8.0+ | ✅ | ✅ | ✅ |
| SQL Server | ✅ | ✅ | ❌ |
| Oracle | ✅ | ✅ | ❌ |
| Performance | Generally best | May scan more rows | Between ROWS and RANGE |
| Use case | Running totals, moving averages | Cumulative distribution, percentiles | Group-aware ranking |

### When to Use Which

| Goal | Frame Type |
|---|---|
| Running sum/count over physical rows | `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` |
| Moving average of last N rows | `ROWS BETWEEN (N-1) PRECEDING AND CURRENT ROW` |
| Cumulative distribution / percentiles | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` |
| Group-aware cumulative count | `GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` |
| Entire partition aggregate (no running) | No `ORDER BY`, no frame (or `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`) |

---

## Best Practices

1. **Always specify the frame explicitly** when using `ORDER BY` in a window function. Never rely on the default.

2. **Use `ROWS`** for running totals and moving windows where you mean "N physical rows."

3. **Use `RANGE`** only when you intentionally want tied values to be treated as a group (e.g., percentiles, cumulative distribution).

4. **Add tiebreakers** to `ORDER BY` to ensure deterministic ordering:
   ```sql
   ORDER BY salary, emp_id  -- not just ORDER BY salary
   ```

5. **Use `NULLS LAST` / `NULLS FIRST`** explicitly for portability:
   ```sql
   ORDER BY amount ASC NULLS LAST
   ```

6. **Check execution plans** after writing window functions, especially over large datasets.

7. **Prefer `ROWS` over `RANGE`** when both produce the same result (no ties), as `ROWS` is generally more efficient.

8. **Be aware of database support** for `GROUPS` before using it.

9. **Test with ties** — create test data that has duplicate `ORDER BY` values to verify your frame behaves correctly.

10. **Don't use frames with ranking functions** (`RANK`, `ROW_NUMBER`, etc.) — they ignore the frame clause.

---

# Interview Questions

## Beginner

1. What is the default window frame when `ORDER BY` is specified in a window function?

2. What is the default window frame when `ORDER BY` is **not** specified?

3. Can you use `ROWS BETWEEN` without `ORDER BY`? What happens?

4. Does `ROW_NUMBER() OVER (ORDER BY salary ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` produce a different result than `ROW_NUMBER() OVER (ORDER BY salary)`? Why or why not?

5. Write a query to compute a running total of `amount` partitioned by `product_id` and ordered by `sale_date`.

## Intermediate

6. Given the `daily_sales` table with these rows for `product_id = 1`:

```
sale_date   | amount
2025-01-01  | 100
2025-01-02  | 150
2025-01-03  | 150
2025-01-04  | 200
```

What is the output of `SUM(amount) OVER (ORDER BY amount ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`?

7. Same data. What is the output with `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`?

8. What is the difference between `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` and `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`?

9. Write a query to compute a 3-day moving average (current row + 1 preceding + 1 following) of `amount`.

10. Explain why `ROWS` and `RANGE` produce different results when the `ORDER BY` column has ties.

## Advanced

11. Write a query that computes a running total using `ROWS` and another using `RANGE`, then shows only rows where the two totals differ. What does this reveal about the data?

12. Can you use `ROWS BETWEEN 1 FOLLOWING AND 1 PRECEDING`? What error would you expect?

13. Write a query to compute the "percentile rank" of each employee's salary within their department. Which frame type is appropriate?

14. Explain why `GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` might produce different results from `RANGES BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` in specific scenarios.

15. A query uses `SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)` on a partition with 10 rows. How many rows are in the frame for row 1, row 5, and row 10?

## Scenario Based

16. You are building a dashboard showing "cumulative revenue per product." The `orders` table has an `order_date` column with many duplicate dates (multiple orders per day). Should you use `ROWS` or `RANGE`? Why?

17. You need a "trailing 7-day sum" of daily sales. The sales table has exactly one row per day per product. Should you use `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` or `RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW`? What if some days are missing?

18. You have a table of stock prices with one row per minute. You want to show the highest price in the last 30 minutes. Some minutes may have no data. Which frame type handles missing minutes correctly?

19. A business requirement says: "For each order, show the total revenue of all orders placed on the same day or earlier." The table has multiple orders per day. Should you use `ROWS` or `RANGE`?

20. You are writing a query for SQL Server. Can you use `GROUPS`? If not, what is the alternative?

## Tricky

21. What is the result of `SUM(amount) OVER (ORDER BY amount ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`? How does it differ from `SUM(amount) OVER ()`?

22. Consider:
```sql
SELECT
    x,
    SUM(x) OVER (ORDER BY x ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS frame_sum
FROM (VALUES (1),(2),(2),(3)) AS t(x);
```
What is the result? How does the frame handle the tie at x=2?

23. Can a window frame produce **fewer** rows than expected? Under what conditions?

24. What happens when you use `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING`? Is the frame unbounded in both directions?

25. Does `FIRST_VALUE(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)` differ from `FIRST_VALUE(amount) OVER (ORDER BY sale_date)`? Why or why not?

## Output Prediction

26. Given:
```sql
CREATE TABLE t (id INT, val INT);
INSERT INTO t VALUES (1,10),(2,20),(3,10),(4,30),(5,20);

SELECT id, val,
    ROW_NUMBER() OVER (ORDER BY val ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS rn_frame
FROM t;
```
Predict the output.

27. Given:
```sql
SELECT id, val,
    COUNT(*) OVER (ORDER BY val ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cnt
FROM t;
```
Predict the output for the same table.

28. Given:
```sql
SELECT id, val,
    COUNT(*) OVER (ORDER BY val RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cnt
FROM t;
```
Predict the output. How does it differ from question 27?

## Debugging

29. A developer writes:
```sql
SELECT
    customer_id,
    order_date,
    SUM(amount) OVER (ORDER BY order_date) AS running_total
FROM orders;
```
They report that some rows have the same running total. What is wrong and how do you fix it?

30. A query returns correct results in PostgreSQL but different results in MySQL:
```sql
SELECT
    id,
    value,
    SUM(value) OVER (ORDER BY value) AS running_total
FROM my_table;
```
What could cause the difference?

## Performance

31. You have a table with 100 million rows, partitioned by `user_id` (1 million distinct users, ~100 rows each). You write:
```sql
SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```
What performance concerns might arise? What index would help?

32. You have two window functions with different `ORDER BY` columns. How might this affect performance? What can you do to mitigate it?

33. When might `RANGE` be slower than `ROWS` for the same logical query? Explain the conditions under which this could happen.
