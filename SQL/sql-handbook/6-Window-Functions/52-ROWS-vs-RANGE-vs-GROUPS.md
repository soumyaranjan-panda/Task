Now I'll generate the comprehensive section for ROWS vs RANGE vs GROUPS.
Now let me verify the complete file and check the math throughout:
The file's first lines are corrupted (prologue text leaked in). Let me examine and fix:
Something unusual is happening — my reasoning text appears to be leaking into the file. Let me investigate:
I understand the situation — the `script.sh` pipes streamed session output into these files, which is why narration text leaks in. Let me check the current state of the file and clean it up:
I now understand the setup: `script.sh` launched `opencode run` (PID 192966) for this exact section, and it's streaming session output into the file concurrently. Let me check its status and the current file state:
-groups) 10. [Side-by-Side Visual Comparison](#side-by-side-visual-comparison) 11. [When ROWS and RANGE Produce Identical Results](#when-rows-and-range-produce-identical-results) 12. [Edge Cases](#edge-cases) 13. [NULL Behavior](#null-behavior) 14. [Common Mistakes](#common-mistakes) 15. [Production Pitfalls](#production-pitfalls) 16. [Performance Implications](#performance-implications) 17. [Comparison Tables](#comparison-tables) 18. [Best Practices](#best-practices) 19. [Interview Questions](#interview-questions)

---

## What Are ROWS, RANGE, and GROUPS?

When a window function uses `ORDER BY`, the database must decide **which rows** belong to the frame for each output row. The three frame types define this:

| Frame Type | Unit of Measurement                                  | Core Question                                      |
| ---------- | ---------------------------------------------------- | -------------------------------------------------- |
| `ROWS`     | Physical row positions                               | "Which **physical rows** are in this frame?"       |
| `RANGE`    | Logical values of the `ORDER BY` column              | "Which rows have **values** within this range?"    |
| `GROUPS`   | Peer groups (rows sharing the same `ORDER BY` value) | "Which **groups of tied rows** are in this frame?" |

```
ROWS:    counts rows like fingers — 1, 2, 3
RANGE:   compares values — "is your value ≤ mine?"
GROUPS:  counts distinct values — "is your group before mine?"
```

---

## Why Three Frame Types Exist

Consider a running total. There are two valid interpretations:

1. "Sum all rows from the first row up to the current **physical row**" → `ROWS`
2. "Sum all rows where the `ORDER BY` value is ≤ the current row's value" → `RANGE`

These give different answers when the `ORDER BY` column has ties. `GROUPS` was added in SQL:2011 to handle a third interpretation: "Sum all peer groups whose values are ≤ the current group's value" — which treats each distinct `ORDER BY` value as one unit.

| Interpretation      | Frame Type | Use Case                                         |
| ------------------- | ---------- | ------------------------------------------------ |
| Physical position   | `ROWS`     | Running totals, moving averages by row count     |
| Logical value range | `RANGE`    | Cumulative distribution, percentile calculations |
| Peer groups         | `GROUPS`   | Group-aware cumulative calculations              |

---

## Syntax

```sql
<function>(...) OVER (
    [PARTITION BY <expr>, ...]
    [ORDER BY <expr> [ASC|DESC], ...]
    { ROWS | RANGE | GROUPS }
        BETWEEN <frame_start> AND <frame_end>
)

-- frame_start / frame_end:
    UNBOUNDED PRECEDING
  | <n> PRECEDING
  | CURRENT ROW
  | <n> FOLLOWING
  | UNBOUNDED FOLLOWING
```

### Valid Boundary Combinations

| Frame Start           | Frame End Allowed                                     |
| --------------------- | ----------------------------------------------------- |
| `UNBOUNDED PRECEDING` | `CURRENT ROW`, `<n> FOLLOWING`, `UNBOUNDED FOLLOWING` |
| `<n> PRECEDING`       | `<n> FOLLOWING`, `UNBOUNDED FOLLOWING`                |
| `CURRENT ROW`         | `<n> FOLLOWING`, `UNBOUNDED FOLLOWING`                |

Invalid: `<n> FOLLOWING` as a start, or any start that is conceptually after the end.

> **PostgreSQL** and **MySQL 8.0+** support all three: `ROWS`, `RANGE`, `GROUPS`.
> **SQL Server** and **Oracle** support `ROWS` and `RANGE` only. They do **not** support `GROUPS`.

---

## How Each Frame Type Works Internally

### ROWS — Positional

The database sorts rows according to `ORDER BY`, then counts **physical positions**. For each row, the frame includes the N rows before and the M rows after, regardless of their values.

```
Sorted data:     [Row A] [Row B] [Row C] [Row D] [Row E]
                  pos 1   pos 2   pos 3   pos 4   pos 5

ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING for Row C:
  → includes Row B (pos 2), Row C (pos 3), Row D (pos 4)
  → exactly 3 rows (or fewer at boundaries)
```

### RANGE — Value-Based

The database examines the **value** of the `ORDER BY` column. The frame includes all rows whose `ORDER BY` value falls within the logical range defined by the boundary.

```
Sorted data by amount:  [100] [150] [150] [200] [250]
                         A     B     C     D     E

RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW for Row B (amount=150):
  → includes all rows where amount ≤ 150
  → A(100), B(150), C(150) — both 150s are included

RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW for Row C (amount=150):
  → includes all rows where amount ≤ 150
  → A(100), B(150), C(150) — same frame as Row B!
```

> Key insight: with `RANGE`, **tied rows always see the same frame**.

### GROUPS — Peer-Group-Based

The database groups rows by their `ORDER BY` value (peer groups), then counts **groups** rather than individual rows.

```
Sorted data by amount:  [100] [150] [150] [200] [250]
                         A     B     C     D     E

Peer groups:           G1     G2          G3     G4
                      (100)  (150,150)  (200)  (250)

GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW for Row B (amount=150, in G2):
  → includes G1(100) and G2(150,150)
  → rows A, B, C

GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW for Row C (amount=150, in G2):
  → includes G1(100) and G2(150,150)
  → same frame as Row B — same peer group
```

> **PostgreSQL** (v11+) and **MySQL 8.0+** support `GROUPS`.
> **SQL Server** and **Oracle** do not.

---

## Sample Tables

### `daily_sales`

One row per product per day. Grain: **one row = one product on one date**.

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
(1, 'Alice',   'Engineering', 90000,  '2020-03-15'),
(2, 'Bob',     'Engineering', 85000,  '2021-06-01'),
(3, 'Charlie', 'Engineering', 85000,  '2022-01-10'),  -- tie with Bob
(4, 'Diana',   'Marketing',   70000,  '2019-11-20'),
(5, 'Eve',     'Marketing',   75000,  '2023-02-28'),
(6, 'Frank',   'Sales',       60000,  '2021-08-15');
```

---

## Core Comparison — Same Data, Different Results

Using `daily_sales` for `product_id = 1`, ordered by `amount`:

| sale_date  | amount |
| ---------- | ------ |
| 2025-01-01 | 100.00 |
| 2025-01-05 | 120.00 |
| 2025-01-02 | 150.00 |
| 2025-01-03 | 150.00 |
| 2025-01-04 | 200.00 |

### Query: Running Total with Each Frame Type

```sql
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS rows_total,
    SUM(amount) OVER (
        ORDER BY amount
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS range_total,
    SUM(amount) OVER (
        ORDER BY amount
        GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS groups_total
FROM daily_sales
WHERE product_id = 1;
```

### Result

| sale_date  | amount | rows_total | range_total | groups_total |
| ---------- | ------ | ---------- | ----------- | ------------ |
| 2025-01-01 | 100.00 | **100.00** | **100.00**  | **100.00**   |
| 2025-01-05 | 120.00 | **220.00** | **220.00**  | **220.00**   |
| 2025-01-02 | 150.00 | **370.00** | **520.00**  | **520.00**   |
| 2025-01-03 | 150.00 | **520.00** | **520.00**  | **520.00**   |
| 2025-01-04 | 200.00 | **720.00** | **720.00**  | **720.00**   |

### What Happened?

| Row    | `amount` | ROWS frame includes       | RANGE frame includes      | GROUPS frame includes     |
| ------ | -------- | ------------------------- | ------------------------- | ------------------------- |
| Jan 01 | 100      | {100}                     | {100}                     | {100}                     |
| Jan 05 | 120      | {100, 120}                | {100, 120}                | {100, 120}                |
| Jan 02 | 150      | {100, 120, 150}           | {100, 120, **150, 150**}  | {100, 120, **150, 150**}  |
| Jan 03 | 150      | {100, 120, 150, 150}      | {100, 120, **150, 150**}  | {100, 120, **150, 150**}  |
| Jan 04 | 200      | {100, 120, 150, 150, 200} | {100, 120, 150, 150, 200} | {100, 120, 150, 150, 200} |

**ROWS**: Jan 02 frame has 3 rows (100, 120, 150). Jan 03 frame has 4 rows (100, 120, 150, 150).

**RANGE**: Both Jan 02 and Jan 03 have the **same frame** — all rows where `amount ≤ 150` — so both get 520.

**GROUPS**: Same as RANGE here because the peer group for `150` is `{Jan 02, Jan 03}` and both rows are in that group.

> Interview trap: If you write `SUM(amount) OVER (ORDER BY amount)` without an explicit frame, the default is `RANGE`, not `ROWS`. The two tied rows at 150 will both show 520. If you expected 370 then 520, you need `ROWS`.

---

## Deep Dive: ROWS

### Mental Model

`ROWS` treats the window as a **physical sliding window** on a sorted list. The number of rows in the frame is deterministic (except at partition boundaries).

### Characteristics

- Each row has its own frame, even if `ORDER BY` values are tied
- Tied rows are ordered **non-deterministically** unless you add a tiebreaker
- The frame always contains exactly `(N + M + 1)` rows, where N = preceding, M = following (clamped at partition edges)

### Example: Physical Moving Average

```sql
SELECT
    sale_date,
    amount,
    AVG(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS moving_avg_3
FROM daily_sales
WHERE product_id = 1;
```

Result (ordered by sale_date):

| sale_date  | amount | frame rows      | moving_avg_3 |
| ---------- | ------ | --------------- | ------------ |
| 2025-01-01 | 100.00 | {100, 150}      | 125.00       |
| 2025-01-02 | 150.00 | {100, 150, 150} | 133.33       |
| 2025-01-03 | 150.00 | {150, 150, 200} | 166.67       |
| 2025-01-04 | 200.00 | {150, 200, 120} | 156.67       |
| 2025-01-05 | 120.00 | {200, 120}      | 160.00       |

Each row sees exactly 1 row before and 1 row after (physical positions). Boundary rows see only 2 rows.

### When to Use ROWS

- Running totals that count individual rows
- Moving averages over exactly N rows
- Any calculation where "last 3 rows" means "3 physical rows"
- Pagination-style cumulative calculations

---

## Deep Dive: RANGE

### Mental Model

`RANGE` treats the window as a **value-based filter**. It includes all rows whose `ORDER BY` value falls within the logical range. When values tie, all tied rows are included for every member of the tie.

### Characteristics

- Tied rows **always see the same frame**
- The frame size is **variable** — depends on how many rows share each value
- With low-cardinality `ORDER BY` columns, a single frame can include a huge fraction of the partition

### Example: Value-Based Cumulative Sum

```sql
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS value_cumulative
FROM daily_sales
WHERE product_id = 1;
```

Result (ordered by amount):

| sale_date  | amount | frame includes (amount values) | value_cumulative |
| ---------- | ------ | ------------------------------ | ---------------- |
| 2025-01-01 | 100.00 | all rows where amount ≤ 100    | 100.00           |
| 2025-01-05 | 120.00 | all rows where amount ≤ 120    | 220.00           |
| 2025-01-02 | 150.00 | all rows where amount ≤ 150    | 520.00           |
| 2025-01-03 | 150.00 | all rows where amount ≤ 150    | 520.00           |
| 2025-01-04 | 200.00 | all rows where amount ≤ 200    | 720.00           |

Both rows with `amount = 150` get 520 because they see the **same logical range**.

### RANGE with Interval Boundaries

`RANGE` can use interval expressions for date/time columns:

```sql
-- Sum of all rows within 7 days before the current row's date
SUM(amount) OVER (
    ORDER BY sale_date
    RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW
)
```

This is a case where `RANGE` is genuinely useful — it handles **calendar gaps** correctly. If some dates have no sales, `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` would look back 6 physical rows (which might span 10+ days), but `RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW` looks back exactly 6 calendar days.

> **PostgreSQL** supports interval syntax in `RANGE` frames.
> **MySQL** supports interval syntax in `RANGE` frames.
> **SQL Server** does not support interval expressions in `RANGE` frames.
> **Oracle** does not support interval expressions in `RANGE` frames.

### When to Use RANGE

- Cumulative distribution calculations (`PERCENTILE_CONT`, `CUME_DIST`)
- Time-based windows where calendar gaps matter (e.g., "last 7 days" meaning actual days)
- Cases where tied values must be treated as a unit
- Statistical calculations over value ranges

---

## Deep Dive: GROUPS

### Mental Model

`GROUPS` is a hybrid: it groups rows by their `ORDER BY` value (like `RANGE`) but counts **groups** as units (like `ROWS` counts physical rows). Each peer group is one unit.

### Characteristics

- Peer groups (rows with the same `ORDER BY` value) are treated as a single unit
- `<n> PRECEDING` means "n peer groups before," not n rows
- Like `RANGE`, tied rows in the same group see the same frame
- Unlike `RANGE`, the frame boundary is defined by group count, not value range

### Example: Group-Aware Running Total

```sql
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS groups_running
FROM daily_sales
WHERE product_id = 1;
```

| sale_date  | amount | peer group | groups_running |
| ---------- | ------ | ---------- | -------------- |
| 2025-01-01 | 100.00 | {100}      | 100.00         |
| 2025-01-05 | 120.00 | {120}      | 220.00         |
| 2025-01-02 | 150.00 | {150, 150} | 520.00         |
| 2025-01-03 | 150.00 | {150, 150} | 520.00         |
| 2025-01-04 | 200.00 | {200}      | 720.00         |

### GROUPS vs RANGE: When Do They Differ?

`GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` and `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` produce **the same result** for unbounded-to-current frames.

They differ when you use **bounded** frame sizes:

```sql
-- Look back exactly 2 peer groups
SELECT
    sale_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        GROUPS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS groups_2back
FROM daily_sales
WHERE product_id = 1;
```

| sale_date  | amount | peer group  | groups_2back | frame includes |
| ---------- | ------ | ----------- | ------------ | -------------- |
| 2025-01-01 | 100.00 | G1(100)     | 100.00       | G1             |
| 2025-01-05 | 120.00 | G2(120)     | 220.00       | G1, G2         |
| 2025-01-02 | 150.00 | G3(150,150) | 520.00       | G1, G2, G3     |
| 2025-01-03 | 150.00 | G3(150,150) | 520.00       | G1, G2, G3     |
| 2025-01-04 | 200.00 | G4(200)     | 620.00       | G2, G3, G4     |

Row at `amount=200`: 2 groups back from G4 is G2, so frame = {G2(120), G3(150,150), G4(200)} = 120+150+150+200 = 620.

The equivalent `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` for that row would be {150(Jan 03), 150(Jan 02), 200(Jan 04)} = 500 — different result because it counts physical rows, not groups.

### When to Use GROUPS

- When you want to count "N distinct values back" rather than "N rows back"
- When peer groups must be atomic (all-or-nothing in the frame)
- When `ROWS` counts too few/fewer because ties inflate the row count

---

## Side-by-Side Visual Comparison

### Data: Amounts [100, 150, 150, 200]

```
Position:  1        2        3        4
Amount:   100      150      150      200
           A        B        C        D

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:

  Row A: [A]                           → sum = 100
  Row B: [A, B]                        → sum = 250
  Row C: [A, B, C]                     → sum = 400
  Row D: [A, B, C, D]                  → sum = 600

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:

  Row A: rows where val ≤ 100 → [A]                    → sum = 100
  Row B: rows where val ≤ 150 → [A, B, C]              → sum = 400
  Row C: rows where val ≤ 150 → [A, B, C]              → sum = 400  ← same as B
  Row D: rows where val ≤ 200 → [A, B, C, D]           → sum = 600

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:

  Peer groups: G1={A(100)}, G2={B(150),C(150)}, G3={D(200)}

  Row A: groups ≤ G1 → G1                               → sum = 100
  Row B: groups ≤ G2 → G1, G2                           → sum = 400
  Row C: groups ≤ G2 → G1, G2                           → sum = 400
  Row D: groups ≤ G3 → G1, G2, G3                       → sum = 600
```

---

## When ROWS and RANGE Produce Identical Results

`ROWS` and `RANGE` produce **identical results** when:

1. **The `ORDER BY` column has all unique values** — no ties means no difference
2. **The frame is `BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`** — entire partition, frame type is irrelevant
3. **The frame is `BETWEEN CURRENT ROW AND CURRENT ROW`** — only one row, frame type is irrelevant

```sql
-- When all ORDER BY values are unique, these are equivalent:
SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
SUM(amount) OVER (ORDER BY sale_date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

> **Production pitfall**: Even if your data has unique values today, future data may introduce ties. Always use the frame type that matches your **intent**, not just what works with current data.

---

## Edge Cases

### Edge Case 1: Frame Start > Frame End

```sql
-- INVALID: ROWS BETWEEN 1 FOLLOWING AND 1 PRECEDING
-- Most databases return an error.
```

### Edge Case 2: Frame Extends Beyond Partition

```sql
-- ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING on a partition with 3 rows:
-- The frame is silently clamped to the partition boundaries.
-- No error, no NULLs — just fewer rows in the frame.
```

### Edge Case 3: <n> = 0

```sql
-- ROWS BETWEEN 0 PRECEDING AND 0 FOLLOWING
-- Equivalent to: ROWS BETWEEN CURRENT ROW AND CURRENT ROW
-- Frame = only the current row.
```

### Edge Case 4: ORDER BY Column Has All Identical Values

```sql
-- All rows have amount = 100

-- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:
--   Each row adds exactly 100. Row 1 = 100, Row 2 = 200, Row 3 = 300.

-- RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:
--   All rows see ALL rows (all have value 100 ≤ 100). All get the same total.

-- GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:
--   One peer group. All rows see all rows. Same as RANGE.
```

### Edge Case 5: Empty Partition

No rows → no output. No error, no NULL placeholder.

### Edge Case 6: Single-Row Partition

All three frame types produce the same result — the frame contains only that one row.

### Edge Case 7: RANGE with Empty Gaps in Data

```sql
-- sale_dates: 2025-01-01, 2025-01-03, 2025-01-10
-- RANGE BETWEEN INTERVAL '2' DAY PRECEDING AND CURRENT ROW:

-- For Jan 01: look back 2 days → no dates before → frame = {Jan 01}
-- For Jan 03: look back 2 days → Jan 01 is within range → frame = {Jan 01, Jan 03}
-- For Jan 10: look back 2 days → Jan 03 is NOT within range (7 days gap)
--             → frame = {Jan 10} only

-- ROWS BETWEEN 2 PRECEDING AND CURRENT ROW would give:
-- For Jan 10: frame = {Jan 01, Jan 03, Jan 10} — includes Jan 01 which is 9 days ago!
```

This is the key use case for `RANGE` over `ROWS` with dates.

---

## NULL Behavior

### NULLs in ORDER BY and Frame Membership

NULLs are sorted according to the database's `NULLS FIRST`/`NULLS LAST` rules (see [Window Frames](#51-Window-Frames)). Their position in the sort order determines whether they fall inside a `RANGE` frame.

| Database   | Default NULL ordering (ASC) | Effect on RANGE frame                                 |
| ---------- | --------------------------- | ----------------------------------------------------- |
| PostgreSQL | `NULLS LAST`                | NULLs excluded from frames ending at non-NULL values  |
| MySQL      | NULLs first (smallest)      | NULLs always included in `UNBOUNDED PRECEDING` frames |
| SQL Server | NULLs first (smallest)      | Same as MySQL                                         |
| Oracle     | NULLs last (largest)        | Same as PostgreSQL                                    |

### NULLs in ROWS Frame

`ROWS` counts physical positions. NULLs are just regular rows — they don't affect the count.

### NULLs in GROUPS Frame

NULLs form their own peer group. If multiple rows have NULL in the `ORDER BY` column, they are one group.

```sql
-- If ORDER BY amount has NULLs:
-- NULL peer group is one group. GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW
-- for a NULL row includes the group before NULLs plus the NULL group.
```

---

## Common Mistakes

### Mistake 1: Relying on the Default RANGE Frame

```sql
-- BAD: You want a row-by-row running total, but the default is RANGE
SELECT
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY amount) AS running_total
FROM daily_sales;

-- If two rows have the same amount, both get the same "running total."
-- This is almost never what you want.
```

```sql
-- BETTER: Explicitly specify ROWS
SELECT
    order_date,
    amount,
    SUM(amount) OVER (
        ORDER BY amount
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM daily_sales;
```

### Mistake 2: Using ROWS for Time-Based Windows with Gaps

```sql
-- BAD: "Last 7 days" but using ROWS — only works if there's exactly one row per day
SELECT
    sale_date,
    SUM(amount) OVER (
        ORDER BY sale_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS trailing_7_day
FROM daily_sales;

-- If some days are missing, this looks back 6 PHYSICAL rows, which might span 2+ weeks.
```

```sql
-- BETTER: Use RANGE for true calendar-based windows
SELECT
    sale_date,
    SUM(amount) OVER (
        ORDER BY sale_date
        RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW
    ) AS trailing_7_day
FROM daily_sales;
```

### Mistake 3: Using RANGE When You Need Exact Row Counts

```sql
-- BAD: "Average of the last 3 entries" but using RANGE
SELECT
    sensor_id,
    reading,
    AVG(reading) OVER (
        ORDER BY reading
        RANGE BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS avg_3
FROM sensor_data;

-- "2 PRECEDING" in RANGE means "2 value units back" — not 2 rows.
-- If many rows share the same reading, this could include far more or fewer than 3 rows.
```

```sql
-- BETTER: Use ROWS for exact row counts
SELECT
    sensor_id,
    reading,
    AVG(reading) OVER (
        ORDER BY reading
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS avg_3
FROM sensor_data;
```

### Mistake 4: Forgetting Ties Produce Non-Deterministic ROWS Results

```sql
-- ROWS frame with ORDER BY salary:
-- Two employees with salary = 85000 are ordered arbitrarily.
-- The "running total" for the first 85000 might be different from the second
-- depending on which row the database happens to place first.

-- FIX: Add a tiebreaker
SUM(salary) OVER (
    ORDER BY salary, emp_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

### Mistake 5: Using GROUPS on SQL Server or Oracle

```sql
-- ERROR on SQL Server:
SELECT
    emp_name,
    salary,
    SUM(salary) OVER (
        ORDER BY salary
        GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )
FROM employees;

-- GROUPS is not supported in SQL Server or Oracle.
-- Use RANGE or ROWS as an alternative.
```

---

## Production Pitfalls

### Pitfall 1: Unintended RANGE Expansion on Low-Cardinality Columns

A `RANGE` frame on a column with only 3 distinct values (e.g., `status` = 1, 2, 3) can silently include the entire partition for most rows. On a table with millions of rows, this causes massive memory consumption.

**Verify** with `EXPLAIN ANALYZE` that the frame isn't expanding beyond expectations.

### Pitfall 2: Non-Deterministic ROWS Results in Production Queries

Without a tiebreaker, two rows with the same `ORDER BY` value may appear in either order. A `ROWS` frame assigns different running totals to them depending on the arbitrary order. This causes **non-reproducible results** across runs or after index changes.

> **Production pitfall**: Always add a tiebreaker column (like `id` or `created_at`) to `ORDER BY` when using `ROWS`.

### Pitfall 3: Memory Spills from Large Window Frames

`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` requires the database to maintain a running aggregate state for the entire partition. For `SUM` and `COUNT`, some databases optimize this. For `ARRAY_AGG`, `LISTAGG`, `PERCENTILE_CONT`, or other complex functions, the entire partition may need to be held in memory.

On partitions with millions of rows, this can cause:

- OOM (out-of-memory) errors
- Disk spills (temp file usage)
- Significant latency

### Pitfall 4: The Hidden Cost of Different ORDER BY Clauses

```sql
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
    AVG(amount) OVER (ORDER BY amount ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING),
    COUNT(*) OVER (ORDER BY sale_date RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW)
FROM daily_sales;
```

Each `OVER` clause with a different `ORDER BY` may require a **separate sort**. On large datasets, this multiplies the sorting cost.

**Mitigate** by using the same `ORDER BY` when possible, or by using a named window:

```sql
-- PostgreSQL / MySQL 8.0+ named window
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER w AS running_sum,
    COUNT(*) OVER w AS running_count
FROM daily_sales
WINDOW w AS (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW);
```

### Pitfall 5: Fan-Out from JOINs After Window Functions

If you apply a window function and then JOIN the result to another table, you can multiply rows:

```sql
-- BAD: Window function gives one row per order, but JOIN to order_items multiplies them
SELECT *
FROM (
    SELECT
        order_id,
        SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
    FROM orders
) o
JOIN order_items oi ON oi.order_id = o.order_id;
-- running_total is now repeated/duplicated for each order_item
```

Apply the window function **after** the JOIN, or filter before joining.

---

## Performance Implications

### What to Check in Execution Plans

| Look For                                      | What It Means                                      |
| --------------------------------------------- | -------------------------------------------------- |
| `Sort` node on `ORDER BY` columns             | Window function required an in-memory or disk sort |
| `WindowAgg` node (PostgreSQL)                 | Window function evaluation step                    |
| High `work_mem` or temp file usage            | Sorting spilled to disk                            |
| Index scan matching `PARTITION BY + ORDER BY` | Sort was avoided via index                         |

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER (
        PARTITION BY product_id
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )
FROM daily_sales;

-- MySQL
EXPLAIN ANALYZE
SELECT ...;

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
-- Then view the execution plan

-- Oracle
EXPLAIN PLAN FOR SELECT ...;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

### ROWS vs RANGE vs GROUPS Performance

| Factor           | ROWS                       | RANGE                                 | GROUPS                                          |
| ---------------- | -------------------------- | ------------------------------------- | ----------------------------------------------- |
| Sort cost        | Same                       | Same                                  | Same                                            |
| Frame evaluation | Positional — fast          | Value comparison — may scan more rows | Group identification — overhead depends on ties |
| Memory usage     | Proportional to frame size | Proportional to value range           | Proportional to group count                     |
| Index support    | Index on `ORDER BY` helps  | Index on `ORDER BY` helps             | Index on `ORDER BY` helps                       |

> Performance claims like "ROWS is always faster than RANGE" are not reliable. Performance depends on the optimizer, data distribution, statistics, cardinality, and the specific query. Always verify with `EXPLAIN ANALYZE`.

### Indexes That Help

```sql
-- Supports PARTITION BY + ORDER BY (eliminates sort)
CREATE INDEX idx_sales_product_date ON daily_sales (product_id, sale_date);

-- Supports ORDER BY amount with PARTITION BY product_id
CREATE INDEX idx_sales_product_amount ON daily_sales (product_id, amount);
```

### Anti-Pattern: Many Window Functions with Different Frames

```sql
-- Each OVER clause may cause a separate sort and frame evaluation
SELECT
    product_id,
    sale_date,
    SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
    AVG(amount) OVER (ORDER BY amount ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING),
    COUNT(*) OVER (ORDER BY sale_date RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW),
    MAX(amount) OVER (ORDER BY sale_date GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW)
FROM daily_sales;
```

Each distinct `ORDER BY` + frame combination may require independent processing. Consolidate where possible.

---

## Comparison Tables

### Frame Type Comparison

| Feature               | ROWS                           | RANGE                                    | GROUPS                          |
| --------------------- | ------------------------------ | ---------------------------------------- | ------------------------------- |
| Unit                  | Physical rows                  | Logical values                           | Peer groups                     |
| Ties handled          | Individually (arbitrary order) | All included together                    | All included together           |
| Default with ORDER BY | No                             | **Yes** (default)                        | No                              |
| Requires ORDER BY     | Yes (for `<n>` boundaries)     | Yes                                      | Yes                             |
| Frame size            | Deterministic (N+M+1)          | Variable (depends on value distribution) | Variable (depends on tie count) |
| PostgreSQL            | ✅                             | ✅                                       | ✅ (v11+)                       |
| MySQL 8.0+            | ✅                             | ✅                                       | ✅                              |
| SQL Server            | ✅                             | ✅                                       | ❌                              |
| Oracle                | ✅                             | ✅                                       | ❌                              |

### When to Use Which

| Goal                                  | Recommended Frame                                          | Why                          |
| ------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| Running sum over physical rows        | `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`         | Counts each row individually |
| Moving average of last N rows         | `ROWS BETWEEN (N-1) PRECEDING AND CURRENT ROW`             | Exactly N rows in the frame  |
| Cumulative distribution / percentiles | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`        | Value-based inclusion        |
| "Last 7 calendar days"                | `RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW` | Handles date gaps correctly  |
| "Last N distinct values"              | `GROUPS BETWEEN (N-1) PRECEDING AND CURRENT ROW`           | Counts groups, not rows      |
| Entire partition aggregate            | No `ORDER BY`, no frame clause                             | Default is entire partition  |
| Tie-aware cumulative sum              | `RANGE` or `GROUPS`                                        | Both include all peers       |

### Default Frame Behavior

| Condition          | Default Frame                                                                 |
| ------------------ | ----------------------------------------------------------------------------- |
| `ORDER BY` present | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`                           |
| `ORDER BY` absent  | `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` (entire partition) |

> All major databases (PostgreSQL, MySQL, SQL Server, Oracle) follow this default.

---

## Best Practices

1. **Always write the frame clause explicitly.** Never rely on the default `RANGE` frame.

2. **Use `ROWS`** when you mean "N physical rows." This is the most common intent for running totals and moving averages.

3. **Use `RANGE`** when you intentionally want value-based inclusion (percentiles, calendar-based windows with gaps).

4. **Use `GROUPS`** when you need peer-group-aware frames and your database supports it.

5. **Add tiebreakers** to `ORDER BY` when using `ROWS`:

   ```sql
   ORDER BY salary, emp_id  -- not just ORDER BY salary
   ```

6. **Use explicit `NULLS FIRST`/`NULLS LAST`** for portable NULL handling:

   ```sql
   ORDER BY amount ASC NULLS LAST
   ```

7. **Test with data that has ties.** Create test rows with identical `ORDER BY` values to verify your frame behaves correctly.

8. **Check `EXPLAIN ANALYZE`** after writing window functions, especially on large tables.

9. **Prefer `ROWS` over `RANGE`** when both produce the same result (no ties), as `ROWS` is generally simpler for the optimizer.

10. **Don't use frames with ranking functions** (`RANK`, `ROW_NUMBER`, `DENSE_RANK`) — they ignore the frame clause.

11. **Be aware of database support** for `GROUPS` and interval-based `RANGE` before writing portable queries.

12. **Consider the data distribution.** A `RANGE` frame on a high-cardinality column behaves similarly to `ROWS`. On a low-cardinality column, `RANGE` can include a disproportionate number of rows.

---

# Interview Questions

## Beginner

1. What is the default window frame when `ORDER BY` is specified in a window function?

2. What is the default window frame when `ORDER BY` is **not** specified?

3. What is the difference between `ROWS` and `RANGE` in plain English?

4. Does `ROW_NUMBER() OVER (ORDER BY salary ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` produce a different result than `ROW_NUMBER() OVER (ORDER BY salary)`? Why or why not?

5. Write a query to compute a running total of `amount` partitioned by `product_id` and ordered by `sale_date`, using an explicit `ROWS` frame.

## Intermediate

6. Given this data for `product_id = 1`:

```
sale_date   | amount
2025-01-01  | 100
2025-01-02  | 150
2025-01-03  | 150
2025-01-04  | 200
```

What is the output of:

```sql
SUM(amount) OVER (ORDER BY amount ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

7. Same data. What is the output with `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`?

8. Write a query to compute a 3-row moving average (current + 1 preceding + 1 following) of `amount` partitioned by `product_id`.

9. Explain why `ROWS` and `RANGE` produce different results when the `ORDER BY` column has ties.

10. When do `ROWS` and `RANGE` produce **identical** results?

## Advanced

11. Write a query that computes a running total using `ROWS` and another using `RANGE`, then shows only rows where the two totals differ. What does this reveal about the data?

12. Can you use `ROWS BETWEEN 1 FOLLOWING AND 1 PRECEDING`? What error would you expect?

13. Write a query to compute a "trailing 7 calendar day" sum of daily sales using `RANGE`. How does this differ from `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` when some days have no sales?

14. Explain why `GROUPS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` might produce the same result as `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, and when they would differ.

15. A query uses `SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)` on a partition with 10 rows. How many rows are in the frame for row 1, row 5, and row 10?

## Scenario Based

16. You are building a dashboard showing "cumulative revenue per product." The `orders` table has multiple orders per day (same `order_date`). Should you use `ROWS` or `RANGE`? Why?

17. You need a "trailing 7-day sum" of daily sales. The sales table has exactly one row per day per product, but some days are missing. Should you use `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` or `RANGE BETWEEN INTERVAL '6' DAY PRECEDING AND CURRENT ROW`?

18. You have a table of stock prices with one row per minute. You want the highest price in the last 30 minutes. Some minutes have no data. Which frame type handles missing minutes correctly?

19. A business requirement says: "For each order, show the total revenue of all orders placed on the same day or earlier." The table has multiple orders per day. Should you use `ROWS` or `RANGE`?

20. You are writing a query for SQL Server. Can you use `GROUPS`? If not, what is the alternative?

## Tricky

21. What is the result of:

```sql
SUM(amount) OVER (ORDER BY amount ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
```

How does it differ from `SUM(amount) OVER ()`?

22. Consider:

```sql
SELECT x,
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
    SUM(val) OVER (ORDER BY val ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS frame_sum
FROM t;
```

Predict the output.

27. Same table. Predict the output of:

```sql
SELECT id, val,
    SUM(val) OVER (ORDER BY val RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_sum
FROM t;
```

28. Same table. Predict the output of:

```sql
SELECT id, val,
    SUM(val) OVER (ORDER BY val GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW) AS groups_sum
FROM t;
```

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

31. A developer uses `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` to compute a "7-day trailing sum" but finds the sums are inflated on days after gaps. Why?

## Performance

32. You have a table with 100 million rows, partitioned by `user_id` (1 million distinct users, ~100 rows each). You write:

```sql
SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
```

What performance concerns might arise? What index would help?

33. You have two window functions with different `ORDER BY` columns in the same query. How might this affect performance? What can you do to mitigate it?

34. When might `RANGE` be slower than `ROWS` for the same logical query? Explain the conditions under which this could happen.
