# 45. PARTITION BY

---

## Table of Contents

1. [What It Is](#what-it-is)
2. [Why It Exists](#why-it-exists)
3. [Syntax](#syntax)
4. [How It Works Internally](#how-it-works-internally)
5. [Sample Tables](#sample-tables)
6. [Basic Examples](#basic-examples)
7. [PARTITION BY with Different Window Functions](#partition-by-with-different-window-functions)
8. [Multiple PARTITION BY Columns](#multiple-partition-by-columns)
9. [PARTITION BY vs GROUP BY](#partition-by-vs-group-by)
10. [PARTITION BY with ORDER BY](#partition-by-with-order-by)
11. [PARTITION BY with ROW_NUMBER, RANK, DENSE_RANK](#partition-by-with-row_number-rank-dense_rank)
12. [PARTITION BY with Aggregate Window Functions](#partition-by-with-aggregate-window-functions)
13. [PARTITION BY with LEAD and LAG](#partition-by-with-lead-and-lag)
14. [PARTITION BY with FIRST_VALUE and LAST_VALUE](#partition-by-with-first_value-and-last_value)
15. [PARTITION BY with NTILE](#partition-by-with-ntile)
16. [Scenario-Based Examples](#scenario-based-examples)
17. [NULL Behavior](#null-behavior)
18. [Edge Cases](#edge-cases)
19. [Common Mistakes](#common-mistakes)
20. [Production Pitfalls](#production-pitfalls)
21. [Performance Implications](#performance-implications)
22. [Interview Traps](#interview-traps)
23. [Best Practices](#best-practices)
24. [Interview Questions](#interview-questions)

---

## What It Is

`PARTITION BY` is a clause used **inside window function definitions**. It divides the result set into groups (partitions) over which a window function operates independently.

Unlike `GROUP BY`, `PARTITION BY` does **not collapse rows**. Every original row remains in the output. The function simply computes its result within each partition separately.

```sql
SELECT
    column1,
    column2,
    window_function() OVER (
        PARTITION BY partition_column
        ORDER BY sort_column
    ) AS alias
FROM table;
```

Think of it as: "Compute the window function, but reset the computation for each group defined by `PARTITION BY`."

---

## Why It Exists

Consider this question:

> "For each department, rank employees by salary."

Without window functions, you would need:

- A correlated subquery
- A self-join
- Or some complex GROUP BY workaround

All of these either collapse rows, require multiple passes over the data, or are awkward to write.

`PARTITION BY` solves this cleanly: it lets you compute per-group results while keeping every row visible.

**One row in the output represents one input row**, enriched with a computed value from its partition.

---

## Syntax

```sql
window_function() OVER (
    PARTITION BY expression1, expression2, ...
    ORDER BY expression3 [ASC|DESC], ...
    frame_clause          -- optional: ROWS/RANGE BETWEEN ...
)
```

### Key points

| Element | Required? | Purpose |
|---|---|---|
| `window_function()` | Yes | The function to compute (e.g., `ROW_NUMBER`, `SUM`, `AVG`) |
| `OVER (...)` | Yes | Marks this as a window function |
| `PARTITION BY` | No | Divides rows into groups for independent computation |
| `ORDER BY` | No | Orders rows within each partition (required for ranking and frame functions) |
| `frame_clause` | No | Defines which rows within the partition the function operates on |

If `PARTITION BY` is omitted, the entire result set is treated as a single partition.

If `ORDER BY` is omitted, the frame defaults to the entire partition (all rows in the group).

---

## How It Works Internally

### Logical Execution Order

```
1. FROM / JOIN       → identify source rows
2. WHERE             → filter rows
3. GROUP BY + HAVING → aggregate and filter groups
4. SELECT            → evaluate expressions, including window functions
5. DISTINCT          → remove duplicate rows
6. ORDER BY          → sort the final output
7. LIMIT / OFFSET    → restrict rows
```

Window functions execute at **step 4**. This means:

- `WHERE` filters rows **before** the window function runs
- `GROUP BY` aggregations are already complete
- You **cannot** use `WHERE` to filter on a window function result directly (you need a subquery or CTE for that)

### What `PARTITION BY` Does Internally

```
┌─────────────────────────────────────────────┐
│            Full Result Set                  │
│                                             │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Partition A  │  │ Partition B  │  ...     │
│  │              │  │              │         │
│  │ Row 1        │  │ Row 1        │         │
│  │ Row 2        │  │ Row 2        │         │
│  │ Row 3        │  │ Row 3        │         │
│  │ ...          │  │ ...          │         │
│  └──────────────┘  └──────────────┘         │
│                                             │
│  Window function computes independently     │
│  within each partition.                     │
└─────────────────────────────────────────────┘
```

For each output row:
1. The database identifies which partition the row belongs to (based on `PARTITION BY` column values).
2. It applies the window function only to rows in that partition.
3. It returns the result for the current row.

---

## Sample Tables

### employees

| employee_id | name    | department | salary | hire_date  |
|-------------|---------|------------|--------|------------|
| 1           | Alice   | Engineering| 90000  | 2019-03-15 |
| 2           | Bob     | Engineering| 85000  | 2020-06-01 |
| 3           | Charlie | Engineering| 95000  | 2018-01-20 |
| 4           | Diana   | Marketing  | 70000  | 2021-02-10 |
| 5           | Eve     | Marketing  | 75000  | 2020-08-22 |
| 6           | Frank   | Marketing  | 72000  | 2019-11-05 |
| 7           | Grace   | Sales      | 65000  | 2022-01-12 |
| 8           | Hank    | Sales      | 68000  | 2021-07-19 |
| 9           | Ivy     | Sales      | 71000  | 2020-03-30 |

**Grain:** One row = one employee.

### orders

| order_id | customer_id | order_date | amount |
|----------|-------------|------------|--------|
| 101      | 1           | 2024-01-15 | 250    |
| 102      | 1           | 2024-02-20 | 180    |
| 103      | 2           | 2024-01-18 | 320    |
| 104      | 1           | 2024-03-10 | 400    |
| 105      | 3           | 2024-02-25 | 150    |
| 106      | 2           | 2024-03-05 | 275    |

**Grain:** One row = one order.

### logins

| login_id | user_id | login_time           |
|----------|---------|----------------------|
| 1        | 100     | 2024-01-01 08:00:00  |
| 2        | 100     | 2024-01-01 12:30:00  |
| 3        | 101     | 2024-01-01 09:00:00  |
| 4        | 100     | 2024-01-02 07:45:00  |
| 5        | 101     | 2024-01-02 10:15:00  |

**Grain:** One row = one login event.

---

## Basic Examples

### Example 1: Department-level salary rank

**Question:** Rank each employee by salary within their department.

```sql
SELECT
    employee_id,
    name,
    department,
    salary,
    RANK() OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS salary_rank
FROM employees;
```

**Expected Output:**

| employee_id | name    | department  | salary | salary_rank |
|-------------|---------|-------------|--------|-------------|
| 3           | Charlie | Engineering | 95000  | 1           |
| 1           | Alice   | Engineering | 90000  | 2           |
| 2           | Bob     | Engineering | 85000  | 3           |
| 5           | Eve     | Marketing   | 75000  | 1           |
| 6           | Frank   | Marketing   | 72000  | 2           |
| 4           | Diana   | Marketing   | 70000  | 3           |
| 9           | Ivy     | Sales       | 71000  | 1           |
| 8           | Hank    | Sales       | 68000  | 2           |
| 7           | Grace   | Sales       | 65000  | 3           |

Notice: every original row appears. The rank resets for each department.

---

### Example 2: Running total per customer

```sql
SELECT
    order_id,
    customer_id,
    order_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;
```

**Expected Output:**

| order_id | customer_id | order_date | amount | running_total |
|----------|-------------|------------|--------|---------------|
| 101      | 1           | 2024-01-15 | 250    | 250           |
| 102      | 1           | 2024-02-20 | 180    | 430           |
| 104      | 1           | 2024-03-10 | 400    | 830           |
| 103      | 2           | 2024-01-18 | 320    | 320           |
| 106      | 2           | 2024-03-05 | 275    | 595           |
| 105      | 3           | 2024-02-25 | 150    | 150           |

The running total resets for each customer.

---

### Example 3: Without PARTITION BY

```sql
SELECT
    employee_id,
    name,
    department,
    salary,
    RANK() OVER (
        ORDER BY salary DESC
    ) AS overall_rank
FROM employees;
```

Without `PARTITION BY`, the entire table is one partition. Every employee is ranked against all others.

---

## PARTITION BY with Different Window Functions

### Ranking Functions

```sql
SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank_val,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank_val
FROM employees;
```

| name    | department  | salary | row_num | rank_val | dense_rank_val |
|---------|-------------|--------|---------|----------|----------------|
| Charlie | Engineering | 95000  | 1       | 1        | 1              |
| Alice   | Engineering | 90000  | 2       | 2        | 2              |
| Bob     | Engineering | 85000  | 3       | 3        | 3              |
| Eve     | Marketing   | 75000  | 1       | 1        | 1              |
| Frank   | Marketing   | 72000  | 2       | 2        | 2              |
| Diana   | Marketing   | 70000  | 3       | 3        | 3              |
| Ivy     | Sales       | 71000  | 1       | 1        | 1              |
| Hank    | Sales       | 68000  | 2       | 2        | 2              |
| Grace   | Sales       | 65000  | 3       | 3        | 3              |

All three return the same values here because there are no ties. See the [Interview Traps](#interview-traps) section for when they differ.

### Aggregate Window Functions

```sql
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    SUM(salary) OVER (PARTITION BY department) AS dept_total,
    COUNT(*)    OVER (PARTITION BY department) AS dept_count
FROM employees;
```

| name    | department  | salary | dept_avg | dept_total | dept_count |
|---------|-------------|--------|----------|------------|------------|
| Alice   | Engineering | 90000  | 90000.00 | 270000     | 3          |
| Bob     | Engineering | 85000  | 90000.00 | 270000     | 3          |
| Charlie | Engineering | 95000  | 90000.00 | 270000     | 3          |
| Diana   | Marketing   | 70000  | 72333.33 | 217000     | 3          |
| Eve     | Marketing   | 75000  | 72333.33 | 217000     | 3          |
| Frank   | Marketing   | 72000  | 72333.33 | 217000     | 3          |
| Grace   | Sales       | 65000  | 68000.00 | 204000     | 3          |
| Hank    | Sales       | 68000  | 68000.00 | 204000     | 3          |
| Ivy     | Sales       | 71000  | 68000.00 | 204000     | 3          |

Each row now shows the department-level aggregate alongside the individual row. No rows are collapsed.

### Value Window Functions

```sql
SELECT
    name,
    department,
    salary,
    FIRST_VALUE(salary) OVER (
        PARTITION BY department ORDER BY hire_date
    ) AS first_hired_salary,
    LAST_VALUE(salary) OVER (
        PARTITION BY department ORDER BY hire_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_hired_salary
FROM employees;
```

See the [Edge Cases](#edge-cases) section for why the `ROWS BETWEEN` clause is needed with `LAST_VALUE`.

---

## Multiple PARTITION BY Columns

You can partition by multiple columns. Rows are grouped by the **combination** of all listed columns.

```sql
SELECT
    order_id,
    customer_id,
    order_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY customer_id, DATE_TRUNC('month', order_date)
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS monthly_running_total
FROM orders;
```

The partition is now: "all orders for the same customer in the same month."

---

## PARTITION BY vs GROUP BY

This is one of the most important distinctions in SQL.

| Aspect | `GROUP BY` | `PARTITION BY` |
|--------|-----------|----------------|
| Row count | Collapses rows into groups | Preserves all rows |
| Output rows per group | One row per group | One row per input row |
| Non-aggregated columns | Must be in GROUP BY or aggregated | freely accessible |
| Purpose | Aggregate data | Compute per-group values while keeping detail |
| Can mix detail and aggregate? | No (without tricks) | Yes |
| Execution phase | Step 3 (before SELECT) | Step 4 (during SELECT) |

### BAD APPROACH: GROUP BY that loses detail

```sql
-- "What is the average salary per department?"
-- This works, but you lose individual employee information.
SELECT
    department,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY department;
```

### BETTER APPROACH: PARTITION BY preserves detail

```sql
-- Show each employee alongside their department average.
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg
FROM employees;
```

Now you can compare each employee to their department average in one query, without losing any rows.

---

## PARTITION BY with ORDER BY

When combined with `ORDER BY`, the window function operates on a **cumulative subset** of the partition (by default, all rows from the first row in the partition up to the current row).

```sql
SELECT
    name,
    department,
    salary,
    SUM(salary) OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS cumulative_sum
FROM employees;
```

Without `ORDER BY`, the aggregate applies to **all rows in the partition** simultaneously, which is equivalent to:

```sql
SUM(salary) OVER (PARTITION BY department)
```

### Frame clause reference

| Frame | Meaning |
|-------|---------|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | From the first row of the partition to the current row |
| `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` | From the current row to the last row of the partition |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | The row before, the current row, and the row after |
| `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | All rows in the partition whose ORDER BY value is ≤ the current row's value |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` | All rows in the entire partition |

---

## PARTITION BY with ROW_NUMBER, RANK, DENSE_RANK

### When values are unique

All three produce identical results.

### When there are ties

```sql
-- Suppose two Engineering employees both earn 90000
-- (Alice 90000, Bob 90000, Charlie 95000)

SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS row_num,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS rank_val,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dense_rank_val
FROM employees;
```

| name    | department  | salary | row_num | rank_val | dense_rank_val |
|---------|-------------|--------|---------|----------|----------------|
| Charlie | Engineering | 95000  | 1       | 1        | 1              |
| Alice   | Engineering | 90000  | 2       | 2        | 2              |
| Bob     | Engineering | 90000  | 3       | **2**    | **2**          |

Notice:
- `ROW_NUMBER()` always gives unique numbers, even with ties. It arbitrarily picks an order (non-deterministic unless you add a tiebreaker to `ORDER BY`).
- `RANK()` gives both tied rows the same rank (2), then **skips** the next rank (3 is skipped).
- `DENSE_RANK()` gives both tied rows the same rank (2), then **does not skip** (next rank would be 3).

> Interview trap: If the question asks "what is the second-highest salary," clarify whether ties should produce one result or multiple, and whether gaps in ranking matter.

---

## PARTITION BY with Aggregate Window Functions

### Percentage of department total

```sql
SELECT
    name,
    department,
    salary,
    ROUND(
        salary * 100.0 / SUM(salary) OVER (PARTITION BY department),
        2
    ) AS pct_of_dept_total
FROM employees;
```

| name    | department  | salary | pct_of_dept_total |
|---------|-------------|--------|-------------------|
| Alice   | Engineering | 90000  | 33.33             |
| Bob     | Engineering | 85000  | 31.48             |
| Charlie | Engineering | 95000  | 35.19             |
| ...     | ...         | ...    | ...               |

### Department average deviation

```sql
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    salary - AVG(salary) OVER (PARTITION BY department) AS deviation
FROM employees;
```

---

## PARTITION BY with LEAD and LAG

### Previous and next salary within department

```sql
SELECT
    name,
    department,
    salary,
    LAG(salary, 1)  OVER (PARTITION BY department ORDER BY salary) AS prev_salary,
    LEAD(salary, 1) OVER (PARTITION BY department ORDER BY salary) AS next_salary
FROM employees;
```

| name    | department  | salary | prev_salary | next_salary |
|---------|-------------|--------|-------------|-------------|
| Bob     | Engineering | 85000  | NULL        | 90000       |
| Alice   | Engineering | 90000  | 85000       | 95000       |
| Charlie | Engineering | 95000  | 90000       | NULL        |

`LAG` and `LEAD` reset at partition boundaries. The first row of each partition has `NULL` for `LAG`, and the last row has `NULL` for `LEAD`.

---

## PARTITION BY with FIRST_VALUE and LAST_VALUE

### First and last hire per department

```sql
SELECT
    name,
    department,
    hire_date,
    salary,
    FIRST_VALUE(name) OVER (
        PARTITION BY department
        ORDER BY hire_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS first_hired,
    LAST_VALUE(name) OVER (
        PARTITION BY department
        ORDER BY hire_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_hired
FROM employees;
```

> Common misconception: `LAST_VALUE` without an explicit frame clause uses `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` by default, which means it returns the **current row's** value, not the last row in the partition. Always specify the frame explicitly with `LAST_VALUE`.

---

## PARTITION BY with NTILE

### Divide employees into 3 salary tiers per department

```sql
SELECT
    name,
    department,
    salary,
    NTILE(3) OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS salary_tier
FROM employees;
```

| name    | department  | salary | salary_tier |
|---------|-------------|--------|-------------|
| Charlie | Engineering | 95000  | 1           |
| Alice   | Engineering | 90000  | 2           |
| Bob     | Engineering | 85000  | 3           |

`NTILE` distributes rows as evenly as possible across the specified number of buckets within each partition.

---

## Scenario-Based Examples

### Scenario 1: Find the highest salary per department

```sql
SELECT *
FROM (
    SELECT
        employee_id,
        name,
        department,
        salary,
        RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk = 1;
```

| employee_id | name    | department  | salary | rnk |
|-------------|---------|-------------|--------|-----|
| 3           | Charlie | Engineering | 95000  | 1   |
| 5           | Eve     | Marketing   | 75000  | 1   |
| 9           | Ivy     | Sales       | 71000  | 1   |

### Scenario 2: Detect consecutive login days

```sql
SELECT
    user_id,
    login_time::DATE AS login_date,
    login_time::DATE - ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY login_time::DATE
    )::INTERVAL AS grp
FROM (
    SELECT DISTINCT user_id, login_time::DATE AS login_time
    FROM logins
) distinct_logins;
```

Then group by `user_id` and `grp` to find consecutive streaks. The classic "gaps and islands" pattern.

### Scenario 3: Compare each employee to the department average

```sql
SELECT
    name,
    department,
    salary,
    ROUND(AVG(salary) OVER (PARTITION BY department), 0) AS dept_avg,
    CASE
        WHEN salary > AVG(salary) OVER (PARTITION BY department) THEN 'Above Average'
        WHEN salary < AVG(salary) OVER (PARTITION BY department) THEN 'Below Average'
        ELSE 'At Average'
    END AS comparison
FROM employees;
```

### Scenario 4: Year-over-year comparison per customer

```sql
SELECT
    customer_id,
    EXTRACT(YEAR FROM order_date) AS order_year,
    SUM(amount) AS total_amount,
    LAG(SUM(amount)) OVER (
        PARTITION BY customer_id
        ORDER BY EXTRACT(YEAR FROM order_date)
    ) AS prev_year_amount
FROM orders
GROUP BY customer_id, EXTRACT(YEAR FROM order_date);
```

### Scenario 5: Top N per group

```sql
-- Top 2 earners per department
SELECT *
FROM (
    SELECT
        name,
        department,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
) ranked
WHERE rn <= 2;
```

> Production pitfall: Use `ROW_NUMBER()` when you need exactly N rows per group. Use `RANK()` if ties should be included (which might give more than N rows).

---

## NULL Behavior

### NULLs in PARTITION BY column

Rows with `NULL` in the `PARTITION BY` column are grouped into **one partition**. All `NULL` values are considered equal for partitioning purposes.

```sql
-- If some employees had NULL department:
SELECT
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
FROM employees;
```

All employees with `NULL` department end up in the same partition and are ranked together.

### NULLs in ORDER BY column (within PARTITION)

NULLs sort differently depending on the database:

| Database | NULL sort behavior |
|----------|--------------------|
| PostgreSQL | NULLs sort **last** by default (ASC), **first** by default (DESC). Use `NULLS FIRST` / `NULLS LAST` to override. |
| MySQL | NULLs sort **first** in ASC, **last** in DESC (opposite of PostgreSQL). |
| SQL Server | NULLs sort **first** in ASC, **last** in DESC (same as MySQL). |
| Oracle | NULLs sort **last** in ASC, **first** in DESC (same as PostgreSQL). |

### NULLs in aggregate window functions

`SUM`, `COUNT`, `AVG`, etc. follow standard NULL handling:
- `SUM` ignores NULLs (sums only non-NULL values)
- `COUNT(column)` ignores NULLs, `COUNT(*)` counts all rows
- `AVG` ignores NULLs (average of non-NULL values)

```sql
SELECT
    name,
    department,
    salary,
    COUNT(*) OVER (PARTITION BY department) AS all_rows,
    COUNT(salary) OVER (PARTITION BY department) AS non_null_salaries
FROM employees;
```

---

## Edge Cases

### 1. Empty partition

If a partition contains no rows (after WHERE filtering), it simply does not appear in the output. No error occurs.

### 2. Single-row partition

The window function operates on one row. `RANK()`, `ROW_NUMBER()`, `DENSE_RANK()` all return 1. `LAG` and `LEAD` return NULL. Aggregates return the single row's value.

### 3. LAST_VALUE default frame

```sql
-- BAD: LAST_VALUE returns the current row, not the actual last row in the partition
LAST_VALUE(salary) OVER (PARTITION BY department ORDER BY hire_date)

-- GOOD: Explicit frame to get the actual last row
LAST_VALUE(salary) OVER (
    PARTITION BY department
    ORDER BY hire_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

### 4. PARTITION BY with DISTINCT

Window functions operate on the result set after `DISTINCT` is applied, not before. If you need to deduplicate before windowing, use a subquery or CTE.

### 5. PARTITION BY with LIMIT

`LIMIT` (or `TOP` / `FETCH FIRST`) applies **after** window functions. You cannot directly limit rows within a partition using `LIMIT`. Use a subquery or CTE with `ROW_NUMBER()` and filter on the row number.

### 6. Frame clause interaction

When `ORDER BY` is present but no frame clause is specified, the default frame is:

```
RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
```

This can produce unexpected results with `SUM`, `AVG`, and other aggregates when there are duplicate values in the `ORDER BY` column, because `RANGE` includes all rows with the same `ORDER BY` value as the current row.

> Production pitfall: If you want a strict row-by-row cumulative sum, use `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, not the default `RANGE` frame.

---

## Common Mistakes

### 1. Confusing PARTITION BY with GROUP BY

```sql
-- WRONG: Expects one row per department, but gets all rows back
SELECT department, salary
FROM employees
PARTITION BY department;  -- Not valid SQL

-- RIGHT: Use GROUP BY for collapsing, PARTITION BY inside OVER()
SELECT department, AVG(salary)
FROM employees
GROUP BY department;
```

### 2. Using WHERE to filter on window function results

```sql
-- WRONG: Window functions are not available in WHERE
SELECT
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
FROM employees
WHERE rnk = 1;

-- RIGHT: Use a subquery or CTE
SELECT *
FROM (
    SELECT
        name,
        department,
        salary,
        RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk = 1;
```

> > Note: PostgreSQL, MySQL 8.0+, and SQL Server support `QUALIFY` (PostgreSQL via extension, SQL Server natively) which simplifies this pattern. Oracle supports `QUALIFY` as well.

### 3. Forgetting that PARTITION BY does not collapse rows

```sql
-- "I want the department average, but also each employee's salary"
-- This is correct:
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg
FROM employees;

-- NOT this:
SELECT
    department,
    AVG(salary)
FROM employees
GROUP BY department;
-- This gives you one row per department, losing individual salaries.
```

### 4. Non-deterministic ROW_NUMBER with ties

```sql
-- BAD: Which employee gets rank 1 when salaries are tied?
ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)

-- GOOD: Add a tiebreaker for deterministic results
ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, employee_id)
```

### 5. Assuming the default frame is the entire partition

```sql
-- This does NOT sum all rows in the department:
SUM(salary) OVER (
    PARTITION BY department
    ORDER BY salary
)
-- This sums from the first row (by salary) up to the current row.

-- To sum the entire partition:
SUM(salary) OVER (PARTITION BY department)
-- or
SUM(salary) OVER (
    PARTITION BY department
    ORDER BY salary
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

---

## Production Pitfalls

### 1. Large partitions causing memory pressure

Window functions may require the database to sort or hash an entire partition in memory. If one partition is extremely large (e.g., millions of rows with the same `PARTITION BY` value), this can cause:

- Excessive memory usage
- Disk spills (temp files)
- Slow query performance

**Verify with `EXPLAIN ANALYZE`**: look for "Sort" or "WindowAgg" nodes with high memory or disk usage.

### 2. Missing indexes for ORDER BY within partitions

If `ORDER BY` inside the window function matches an index, the database may avoid a sort. For example, an index on `(department, salary)` can help:

```sql
RANK() OVER (PARTITION BY department ORDER BY salary DESC)
```

Check the execution plan to see whether a sort is being performed.

### 3. Redundant window function computations

If you compute the same window function multiple times with the same `OVER` clause, the optimizer may or may not deduplicate the computation. Use a CTE or subquery to avoid redundant work:

```sql
-- BAD: Two identical OVER() clauses
SELECT
    name,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    salary - AVG(salary) OVER (PARTITION BY department) AS deviation
FROM employees;

-- BETTER: Compute once, reference twice
SELECT
    name,
    salary,
    dept_avg,
    salary - dept_avg AS deviation
FROM (
    SELECT
        name,
        salary,
        AVG(salary) OVER (PARTITION BY department) AS dept_avg
    FROM employees
) sub;
```

### 4. Implicit type conversion in PARTITION BY

If the `PARTITION BY` expression involves implicit type conversions, indexes may not be used and performance may degrade.

### 5. Window functions in WHERE, HAVING, or ON

Window functions cannot appear in `WHERE`, `HAVING`, or `ON` clauses. You must wrap them in a subquery or CTE.

---

## Performance Implications

### What to check with EXPLAIN ANALYZE

| Execution plan element | What it means |
|------------------------|---------------|
| `WindowAgg` | The database is computing a window function. Check its cost and rows. |
| `Sort` (before WindowAgg) | The database is sorting data for `ORDER BY` within partitions. Check if an index can eliminate this sort. |
| `HashAggregate` | Aggregation is being performed (possibly for GROUP BY before window functions). |
| `Temp Written` / `external merge` | The sort spilled to disk. Indicates memory pressure from large partitions. |
| `Subquery Scan` | The window function is in a subquery. This is normal but check the subquery's cost. |

### Factors affecting performance

- **Partition size**: Larger partitions require more memory and computation.
- **Number of partitions**: Many small partitions are generally fine; the overhead is per-partition initialization.
- **ORDER BY columns**: If an index matches the `ORDER BY`, the sort may be avoided.
- **Frame clause**: `ROWS`-based frames are generally more efficient than `RANGE`-based frames because `RANGE` requires looking at all rows with the same `ORDER BY` value.
- **Database engine**: PostgreSQL, MySQL, SQL Server, and Oracle have different window function implementations and optimizer strategies.

### Index considerations

An index on `(partition_column, order_column)` can help the database avoid sorting when computing window functions:

```sql
-- For this query:
RANK() OVER (PARTITION BY department ORDER BY salary DESC)

-- This index can help:
CREATE INDEX idx_emp_dept_salary ON employees (department, salary DESC);
```

> > Performance claims depend on data distribution, cardinality, statistics, and the optimizer. Always verify with `EXPLAIN ANALYZE`.

---

## Interview Traps

### Trap 1: "Second highest salary per department"

```sql
-- Appears to work, but what if two employees tie for the highest?
-- Both get rank 1, and rank 2 is skipped.
SELECT *
FROM (
    SELECT
        name,
        department,
        salary,
        RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk = 2;
```

If two employees share the highest salary, `RANK()` produces ranks 1, 1, 3 — so rank 2 returns **zero rows**. Use `DENSE_RANK()` instead if you want the second distinct salary.

### Trap 2: ROW_NUMBER tie-breaking

`ROW_NUMBER()` is non-deterministic when the `ORDER BY` columns have duplicate values. Two rows with the same salary could get different row numbers in different executions. Always add a unique column (like primary key) as a tiebreaker in `ORDER BY`.

### Trap 3: Default frame with ORDER BY

```sql
-- Appears to sum the whole department, but it actually sums cumulatively:
SUM(salary) OVER (PARTITION BY department ORDER BY hire_date)
-- Default frame: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW

-- To sum the whole department:
SUM(salary) OVER (PARTITION BY department)
```

### Trap 4: COUNT(*) vs COUNT(column) in window functions

```sql
-- COUNT(*) counts all rows in the partition, including those with NULL department
-- COUNT(department) counts only non-NULL department values

SELECT
    name,
    department,
    COUNT(*) OVER (PARTITION BY department) AS all_rows_in_partition,
    COUNT(department) OVER (PARTITION BY department) AS non_null_depts
FROM employees;
```

If `department` can be NULL, these differ.

### Trap 5: Using PARTITION BY with DELETE/UPDATE

`PARTITION BY` in DML statements (MySQL's `DELETE`/`UPDATE` with window functions) has different semantics and limitations. See the database-specific documentation.

> > MySQL supports window functions in `SELECT` but does not support them in `DELETE` or `UPDATE`. PostgreSQL supports window functions in `DELETE ... USING` (with some limitations). SQL Server supports window functions in `UPDATE` with `OVER()`.

---

## Best Practices

1. **Always specify the frame clause** when using `ORDER BY` with aggregate window functions. Do not rely on the default `RANGE` frame.

2. **Add tiebreakers** to `ORDER BY` inside `ROW_NUMBER()` for deterministic results.

3. **Use CTEs or subqueries** to avoid repeating the same window function computation.

4. **Check execution plans** (`EXPLAIN ANALYZE`) when window functions are slow, especially with large partitions.

5. **Filter before windowing** when possible. Apply `WHERE` to reduce the dataset before computing window functions.

6. **Name window functions clearly** using aliases. Complex queries with multiple window functions become unreadable without clear aliases.

7. **Understand the difference** between `RANK`, `DENSE_RANK`, and `ROW_NUMBER`. Choose based on the business requirement.

8. **Be careful with NULLs in PARTITION BY**. NULLs form their own partition, which may not be the intended behavior. Use `COALESCE` if you want to assign NULLs to a specific group.

9. **Use `QUALIFY`** (where supported) to filter on window function results without a subquery:
   - PostgreSQL: `QUALIFY` is not built-in but can be emulated with a CTE.
   - MySQL 8.0+: Not supported, use subquery.
   - SQL Server: Supported natively.
   - Oracle: Supported natively.

10. **Document the grain** of your query. A query with `PARTITION BY` still produces one row per input row. Make sure downstream consumers understand this.

---

# Interview Questions

## Beginner

1. What is the difference between `PARTITION BY` and `GROUP BY`?

2. What happens if you omit `PARTITION BY` in a window function?

3. Write a query to rank employees by salary within each department using `ROW_NUMBER()`.

4. What is the grain of a query that uses `PARTITION BY department` with `RANK()`?

5. Can a window function with `PARTITION BY` collapse rows?

## Intermediate

6. Write a query to find the top 2 highest-paid employees in each department.

7. Write a query showing each employee's salary as a percentage of their department's total salary.

8. Write a query to compute a running total of `amount` per customer, ordered by `order_date`.

9. What is the difference between `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()` when there are ties?

10. Write a query to find each employee's salary and the difference between their salary and their department average.

## Advanced

11. Write a query to find the second-highest salary in each department. What pitfalls exist?

12. Write a query using `LAG` to find the previous order amount for each customer, ordered by `order_date`.

13. Write a query to compute a 3-day moving average of `amount` per customer.

14. Explain what happens with the default frame clause when `ORDER BY` contains duplicate values and you use `SUM()`.

15. Write a query to detect consecutive login days for each user using `PARTITION BY` and the gaps-and-islands technique.

## Scenario Based

16. You are given an `orders` table with columns `order_id`, `customer_id`, `order_date`, `amount`. Write a query to find each customer's most recent order.

17. You are given an `events` table with `event_id`, `user_id`, `event_type`, `event_time`. Write a query to find, for each user, the time gap between consecutive events of the same type.

18. A manager asks: "Show me each employee alongside the highest salary in their department." Write the query.

19. You need to assign customers to quartiles based on their total spending, with quartiles calculated independently per region. Write the query.

20. You are asked to flag "churned" users — those who have not logged in for more than 30 days compared to their previous login. Write the query using `PARTITION BY` and `LAG`.

## Tricky

21. What is the result of this query?

```sql
SELECT
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary) AS rnk
FROM employees
WHERE department = 'Engineering';
```

Does `PARTITION BY` still have an effect when `WHERE` filters to a single department?

22. Two employees in the same department have the same salary. What ranks do `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()` assign if no tiebreaker is provided?

23. What is the difference between these two queries?

```sql
-- Query A
SELECT SUM(salary) OVER (PARTITION BY department ORDER BY hire_date) FROM employees;

-- Query B
SELECT SUM(salary) OVER (PARTITION BY department ORDER BY hire_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM employees;
```

24. Can `PARTITION BY` accept expressions? What about function calls?

25. What happens if the `PARTITION BY` column contains NULLs?

## Output Prediction

26. Given the `employees` table above, predict the output of:

```sql
SELECT
    name,
    department,
    salary,
    NTILE(2) OVER (PARTITION BY department ORDER BY salary DESC) AS tier
FROM employees;
```

27. Given the `orders` table above, predict the output of:

```sql
SELECT
    customer_id,
    order_date,
    amount,
    LAG(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount,
    LEAD(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_amount
FROM orders;
```

## Debugging

28. A colleague writes this query and complains it returns all rows instead of just the top earner per department. What is wrong?

```sql
SELECT
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
FROM employees
WHERE rnk = 1;
```

29. A query with `LAST_VALUE(salary) OVER (PARTITION BY department ORDER BY hire_date)` returns the current row's salary, not the last hired employee's salary. Why?

30. A running total query gives unexpected results when two orders have the same `order_date`. What is the likely cause and fix?

## Performance

31. You have a table with 10 million rows and a `PARTITION BY` column with only 10 distinct values. What performance considerations apply?

32. How can you verify whether an index is helping your window function query?

33. What execution plan element would indicate that the database is sorting data for a window function?

34. When might using `RANGE` frame instead of `ROWS` frame cause a performance issue?

35. You observe `external merge` or `temp written` in the execution plan of a window function query. What does this indicate and how might you address it?

---

> Cross-references: See [44-OVER](44-OVER.md) for the `OVER` clause fundamentals. See [46-ROW-NUMBER](46-ROW-NUMBER.md), [47-RANK](47-RANK.md), [48-DENSE-RANK](48-DENSE-RANK.md) for deep dives into individual ranking functions. See [GROUP BY](../4-Grouping/30-GROUP-BY.md) for the relationship between `GROUP BY` and window functions.
