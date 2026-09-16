# Window Functions vs GROUP BY — The Definitive Guide

---

## Table of Contents

1. [The Core Difference](#the-core-difference)
2. [Sample Tables](#sample-tables)
3. [GROUP BY Fundamentals](#group-by-fundamentals)
4. [Window Functions Fundamentals](#window-functions-fundamentals)
5. [Side-by-Side Comparison](#side-by-side-comparison)
6. [Internal Working](#internal-working)
7. [When to Use Which](#when-to-use-which)
8. [Common Mistakes](#common-mistakes)
9. [NULL Behavior](#null-behavior)
10. [Production Pitfalls](#production-pitfalls)
11. [Performance Implications](#performance-implications)
12. [Advanced Patterns](#advanced-patterns)
13. [Comparison Tables](#comparison-tables)
14. [Best Practices](#best-practices)
15. [Interview Questions](#interview-questions)

---

## The Core Difference

| Aspect                                 | GROUP BY                   | Window Function                       |
| -------------------------------------- | -------------------------- | ------------------------------------- |
| **What it does**                       | Collapses rows into groups | Preserves every row                   |
| **Output row count**                   | One row per group          | Same as input (or more with OVER)     |
| **Can see individual rows in result**  | No                         | Yes                                   |
| **Need HAVING for group filters**      | Yes                        | No (use WHERE or QUALIFY in some DBs) |
| **Can mix aggregate + detail columns** | Only with JOIN back        | Yes, natively                         |

> Common misconception: "Window functions replace GROUP BY."  
> They complement each other. You often need both.

---

## Sample Tables

### employees

| emp_id | name  | dept_id | salary | hire_date  | manager_id |
| ------ | ----- | ------- | ------ | ---------- | ---------- |
| 1      | Alice | 101     | 90000  | 2018-03-15 | NULL       |
| 2      | Bob   | 101     | 80000  | 2019-07-22 | 1          |
| 3      | Carol | 102     | 95000  | 2017-01-10 | NULL       |
| 4      | Dave  | 102     | 75000  | 2020-11-30 | 3          |
| 5      | Eve   | 102     | 75000  | 2021-06-01 | 3          |
| 6      | Frank | 103     | 60000  | 2022-02-14 | NULL       |
| 7      | Grace | 101     | 85000  | 2016-09-08 | 1          |

**Grain:** One row = one employee.

### orders

| order_id | customer_id | order_date | amount |
| -------- | ----------- | ---------- | ------ |
| 101      | 1           | 2024-01-05 | 250    |
| 102      | 1           | 2024-03-12 | 180    |
| 103      | 2           | 2024-01-20 | 320    |
| 104      | 3           | 2024-04-02 | 150    |
| 105      | 2           | 2024-05-15 | 400    |
| 106      | 1           | 2024-06-30 | 220    |

**Grain:** One row = one order.

---

## GROUP BY Fundamentals

### What It Is

`GROUP BY` collapses multiple rows sharing the same value(s) into a single summary row. Every column in the SELECT must either:

1. Be in the GROUP BY clause, or
2. Be wrapped in an aggregate function (COUNT, SUM, AVG, MIN, MAX, etc.)

### Syntax

```sql
SELECT
    column1,
    column2,
    AGGREGATE_FUNCTION(column3)
FROM table
WHERE condition          -- optional: filters BEFORE grouping
GROUP BY column1, column2
HAVING AGGREGATE_CONDITION; -- optional: filters AFTER grouping
```

### Example: Average salary per department

```sql
SELECT
    dept_id,
    COUNT(*) AS emp_count,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;
```

**Expected result:**

| dept_id | emp_count | avg_salary |
| ------- | --------- | ---------- |
| 101     | 3         | 85000.00   |
| 102     | 3         | 81666.67   |
| 103     | 1         | 60000.00   |

### Key Rules

1. **Every non-aggregated column must appear in GROUP BY.**  
   PostgreSQL allows functionally dependent columns to be omitted (e.g., if dept_id is the PRIMARY KEY, you can omit it while selecting other columns from that table). MySQL in certain modes allows this too. SQL Server and Oracle do not.

2. **WHERE filters rows before grouping.**
3. **HAVING filters groups after aggregation.**

### Ordering

```sql
SELECT
    dept_id,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
ORDER BY avg_salary DESC;
```

---

## Window Functions Fundamentals

### What It Is

A window function performs a calculation across a set of rows _related to the current row_ — without collapsing any rows. The "window" is defined by the `OVER()` clause.

### Syntax

```sql
SELECT
    column1,
    column2,
    AGGREGATE_FUNCTION(column3) OVER (
        PARTITION BY partition_column
        ORDER BY sort_column
        ROWS BETWEEN frame_start AND frame_end
    ) AS alias
FROM table;
```

### Components of OVER()

```
OVER (
    PARTITION BY ...   -- divides rows into groups (like GROUP BY)
    ORDER BY ...       -- defines row ordering within each partition
    frame_clause       -- defines which rows in the partition are included
)
```

### The Frame Clause

| Frame Type                                                 | Meaning                                    |
| ---------------------------------------------------------- | ------------------------------------------ |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`         | From first row in partition to current row |
| `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING`         | From current row to last row in partition  |
| `ROWS BETWEEN N PRECEDING AND N FOLLOWING`                 | N rows before and after current row        |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` | Entire partition                           |
| `RANGE BETWEEN ...`                                        | Based on values, not physical rows         |

> **Important:** When `ORDER BY` is present in `OVER()`, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — not `ROWS`. This can produce unexpected results with duplicate sort values. Always specify the frame explicitly when you need precise control.

### Example: Each employee alongside department average

```sql
SELECT
    emp_id,
    name,
    dept_id,
    salary,
    AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg_salary,
    COUNT(*) OVER (PARTITION BY dept_id) AS dept_emp_count
FROM employees;
```

**Expected result:**

| emp_id | name  | dept_id | salary | dept_avg_salary | dept_emp_count |
| ------ | ----- | ------- | ------ | --------------- | -------------- |
| 1      | Alice | 101     | 90000  | 85000.00        | 3              |
| 2      | Bob   | 101     | 80000  | 85000.00        | 3              |
| 7      | Grace | 101     | 85000  | 85000.00        | 3              |
| 3      | Carol | 102     | 95000  | 81666.67        | 3              |
| 4      | Dave  | 102     | 75000  | 81666.67        | 3              |
| 5      | Eve   | 102     | 75000  | 81666.67        | 3              |
| 6      | Frank | 103     | 60000  | 60000.00        | 1              |

Notice: **7 output rows** — same as input. Every original row is preserved with the aggregate "attached."

---

## Side-by-Side Comparison

### Scenario 1: Department salary summary

**GROUP BY — Collapses rows:**

```sql
SELECT
    dept_id,
    COUNT(*) AS emp_count,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;
```

Result: **3 rows** (one per department)

| dept_id | emp_count | avg_salary |
| ------- | --------- | ---------- |
| 101     | 3         | 85000.00   |
| 102     | 3         | 81666.67   |
| 103     | 1         | 60000.00   |

**Window Function — Preserves rows:**

```sql
SELECT
    emp_id,
    name,
    dept_id,
    salary,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_salary
FROM employees;
```

Result: **7 rows** (all original employees)

| emp_id | name  | dept_id | salary | avg_salary |
| ------ | ----- | ------- | ------ | ---------- |
| 1      | Alice | 101     | 90000  | 85000.00   |
| 2      | Bob   | 101     | 80000  | 85000.00   |
| ...    | ...   | ...     | ...    | ...        |

> Interview trap: "Write a query showing each employee's name and their department's average salary."  
> Many candidates reach for GROUP BY and get stuck because they can't mix `name` (non-aggregated) with `AVG(salary)` without a JOIN or subquery. A window function is the cleanest solution.

---

### Scenario 2: Running total of orders per customer

**GROUP BY cannot do this directly.** You would need a self-join or correlated subquery:

```sql
-- GROUP BY approach: requires self-join (complex)
SELECT
    o1.order_id,
    o1.customer_id,
    o1.order_date,
    o1.amount,
    SUM(o2.amount) AS running_total
FROM orders o1
JOIN orders o2
    ON o2.customer_id = o1.customer_id
    AND o2.order_date <= o1.order_date
GROUP BY o1.order_id, o1.customer_id, o1.order_date, o1.amount
ORDER BY o1.customer_id, o1.order_date;
```

**Window function — clean and direct:**

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
FROM orders
ORDER BY customer_id, order_date;
```

**Expected result:**

| order_id | customer_id | order_date | amount | running_total |
| -------- | ----------- | ---------- | ------ | ------------- |
| 101      | 1           | 2024-01-05 | 250    | 250           |
| 102      | 1           | 2024-03-12 | 180    | 430           |
| 106      | 1           | 2024-06-30 | 220    | 650           |
| 103      | 2           | 2024-01-20 | 320    | 320           |
| 105      | 2           | 2024-05-15 | 400    | 720           |
| 104      | 3           | 2024-04-02 | 150    | 150           |

---

### Scenario 3: Rank employees within their department by salary

**GROUP BY cannot produce a rank.** You would need a complex subquery with COUNT:

```sql
-- Subquery approach
SELECT
    e.emp_id,
    e.name,
    e.dept_id,
    e.salary,
    (SELECT COUNT(DISTINCT e2.salary)
     FROM employees e2
     WHERE e2.dept_id = e.dept_id
       AND e2.salary >= e.salary) AS salary_rank
FROM employees e;
```

**Window function — direct and readable:**

```sql
SELECT
    emp_id,
    name,
    dept_id,
    salary,
    RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS salary_rank,
    DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dense_salary_rank,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC, emp_id) AS row_num
FROM employees;
```

**Expected result (department 102):**

| emp_id | name  | dept_id | salary | salary_rank | dense_salary_rank | row_num |
| ------ | ----- | ------- | ------ | ----------- | ----------------- | ------- |
| 3      | Carol | 102     | 95000  | 1           | 1                 | 1       |
| 4      | Dave  | 102     | 75000  | 2           | 2                 | 2       |
| 5      | Eve   | 102     | 75000  | 2           | 2                 | 3       |

Note: `RANK()` gives Dave and Eve both rank 2, then the next rank would be 4 (skipping 3). `DENSE_RANK()` gives them both rank 2, then next would be 3 (no gap).

---

## Internal Working

### How GROUP BY Executes

```
1. Scan table / apply WHERE filters
2. Hash or sort rows by GROUP BY columns
3. Aggregate within each group
4. Apply HAVING filter on aggregates
5. Apply ORDER BY
6. Return one row per group
```

```
┌─────────────────┐
│   Full Table     │
│   (7 rows)       │
└────────┬────────┘
         │ WHERE filter (optional)
         ▼
┌─────────────────┐
│  Filtered rows   │
└────────┬────────┘
         │ GROUP BY (hash or sort)
         ▼
┌─────────────────┐
│  3 groups        │
│  (dept 101,102,  │
│   103)           │
└────────┬────────┘
         │ Aggregate within each group
         ▼
┌─────────────────┐
│  3 aggregated    │
│  rows            │
└────────┬────────┘
         │ HAVING (optional)
         │ ORDER BY
         ▼
┌─────────────────┐
│  Final result    │
│  (3 rows)        │
└─────────────────┘
```

### How Window Functions Execute

```
1. Scan table / apply WHERE filters
2. For each window function:
   a. Partition rows by PARTITION BY (or treat all as one partition)
   b. Sort within each partition by ORDER BY
   c. Apply frame clause to define the window
   d. Compute the aggregate/ranking for each row
3. Combine all window function results with original rows
4. Apply ORDER BY (outer)
5. Return all rows
```

```
┌─────────────────┐
│   Full Table     │
│   (7 rows)       │
└────────┬────────┘
         │ WHERE filter (optional)
         ▼
┌─────────────────┐
│  Filtered rows   │
└────────┬────────┘
         │ Partition by dept_id
         ▼
┌─────────────────────────────────────┐
│  Partition 101: [Alice, Bob, Grace]  │
│  Partition 102: [Carol, Dave, Eve]   │
│  Partition 103: [Frank]              │
└────────┬────────────────────────────┘
         │ Within each partition:
         │   - Sort by ORDER BY
         │   - Apply frame clause
         │   - Compute aggregate/ranking
         ▼
┌─────────────────────────────────────┐
│  Each of 7 rows gets its window      │
│  function result appended            │
└────────┬────────────────────────────┘
         │ Outer ORDER BY
         ▼
┌─────────────────┐
│  Final result    │
│  (7 rows)        │
└─────────────────┘
```

> Performance implication: Window functions with `ORDER BY` require sorting within each partition. Large partitions with expensive sorts can be memory-intensive. Check the execution plan for `Sort` or `WindowAgg` nodes.

---

## When to Use Which

### Use GROUP BY when:

1. **You need a summary report** — one row per category
2. **You only need aggregated values** — totals, counts, averages
3. **You're feeding into a dashboard** — aggregated by time period, region, etc.
4. **You need HAVING** — filtering on aggregate conditions is cleaner

```sql
-- "Show total sales per region for Q1 2024"
SELECT
    region,
    SUM(sales_amount) AS total_sales
FROM sales
WHERE sale_date BETWEEN '2024-01-01' AND '2024-03-31'
GROUP BY region
HAVING SUM(sales_amount) > 100000
ORDER BY total_sales DESC;
```

### Use Window Functions when:

1. **You need detail + aggregate in the same row** — employee salary alongside department average
2. **You need ranking** — RANK, DENSE_RANK, ROW_NUMBER
3. **You need running totals, cumulative sums, moving averages**
4. **You need lead/lag comparisons** — compare current row to previous/next
5. **You need to count within groups without collapsing** — NTILE, percentage of total

```sql
-- "Show each employee's salary, department average, and their rank"
SELECT
    name,
    dept_id,
    salary,
    AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg,
    RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rank_in_dept
FROM employees;
```

### Use Both when:

1. **You need a summary AND detail** — first aggregate with GROUP BY, then join back or use a CTE with window functions
2. **Complex analytics** — e.g., "compare each order to the department average, then filter to only above-average orders"

```sql
WITH dept_stats AS (
    SELECT
        emp_id,
        name,
        dept_id,
        salary,
        AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
    FROM employees
)
SELECT *
FROM dept_stats
WHERE salary > dept_avg;
```

---

## Common Mistakes

### Mistake 1: Selecting non-aggregated columns without GROUP BY

```sql
-- BAD: Will fail in most databases
SELECT
    name,
    dept_id,
    AVG(salary)
FROM employees
GROUP BY dept_id;
```

> **Error:** `column "name" must appear in the GROUP BY clause or be used in an aggregate function`

**Fix:** Use a window function, or add `name` to GROUP BY (but that defeats the purpose of aggregation), or JOIN back.

```sql
-- BETTER: Use window function
SELECT
    name,
    dept_id,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_salary
FROM employees;
```

### Mistake 2: Forgetting that GROUP BY eliminates detail

```sql
-- This tells you the average, but NOT which employees earn above it
SELECT
    dept_id,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;
```

If you then try to use this to filter employees, you need a subquery or JOIN:

```sql
-- Approach 1: Subquery
SELECT *
FROM employees e
WHERE salary > (
    SELECT AVG(salary)
    FROM employees e2
    WHERE e2.dept_id = e.dept_id
);

-- Approach 2: Window function (cleaner)
SELECT *
FROM (
    SELECT
        *,
        AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
    FROM employees
) sub
WHERE salary > dept_avg;
```

### Mistake 3: Using GROUP BY where a window function is needed

**BAD — Accidentally getting duplicate rows:**

```sql
-- Trying to show employee name alongside department count
-- without proper aggregation
SELECT
    name,
    dept_id,
    COUNT(*) OVER (PARTITION BY dept_id) AS dept_count
FROM employees;
```

This actually works correctly — but people often try this with GROUP BY first and get the wrong result.

### Mistake 4: Mixing up PARTITION BY with GROUP BY

```sql
-- These are NOT the same:
-- GROUP BY collapses rows
SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id;  -- 3 rows

-- PARTITION BY preserves rows
SELECT name, AVG(salary) OVER (PARTITION BY dept_id) FROM employees;  -- 7 rows
```

### Mistake 5: Forgetting the frame clause

```sql
-- This sum is NOT a running total — it sums the ENTIRE partition
SELECT
    order_id,
    customer_id,
    amount,
    SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS running_total
FROM orders;
```

Without `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, the default when `ORDER BY` is present is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. For numeric values with no ties, this works. But with ties, `RANGE` includes all rows with the same value, which can give unexpected results. Always specify the frame explicitly for running totals.

### Mistake 6: Using WHERE on window function results

```sql
-- BAD: You can't filter on a window function alias in WHERE
SELECT
    name,
    salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
FROM employees
WHERE rnk <= 3;  -- ERROR!
```

**Fix:** Use a subquery/CTE, or `QUALIFY` (PostgreSQL 17+, Snowflake, Teradata):

```sql
-- Fix with CTE
WITH ranked AS (
    SELECT
        name,
        salary,
        RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
)
SELECT *
FROM ranked
WHERE rnk <= 3;

-- Fix with QUALIFY (Snowflake, Teradata, PostgreSQL 17+)
SELECT
    name,
    salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
FROM employees
QUALIFY rnk <= 3;
```

> MySQL does not support QUALIFY. SQL Server does not support QUALIFY natively.

---

## NULL Behavior

### In GROUP BY

NULLs form their own group:

```sql
SELECT
    manager_id,
    COUNT(*) AS emp_count
FROM employees
GROUP BY manager_id;
```

| manager_id | emp_count |
| ---------- | --------- |
| NULL       | 3         |
| 1          | 3         |
| 3          | 1         |

NULLs in the GROUP BY column are treated as a single distinct group. This is standard SQL behavior across PostgreSQL, MySQL, SQL Server, and Oracle.

### In Aggregate Functions

- `COUNT(*)` counts all rows including NULLs
- `COUNT(column)` excludes NULLs
- `SUM`, `AVG`, `MIN`, `MAX` ignore NULLs

```sql
-- These are different:
SELECT
    COUNT(*) AS total_rows,           -- 7 (all rows)
    COUNT(manager_id) AS non_null_mgr -- 4 (excludes NULLs)
FROM employees;
```

### In Window Functions

- `COUNT(*) OVER (...)` counts all rows in the frame, including NULLs
- `COUNT(manager_id) OVER (...)` excludes NULLs in the frame
- Aggregate window functions (`SUM`, `AVG`) ignore NULLs in the frame

```sql
SELECT
    emp_id,
    name,
    manager_id,
    COUNT(*) OVER (PARTITION BY dept_id) AS total_in_dept,
    COUNT(manager_id) OVER (PARTITION BY dept_id) AS with_manager
FROM employees;
```

| emp_id | name  | dept_id | manager_id | total_in_dept | with_manager |
| ------ | ----- | ------- | ---------- | ------------- | ------------ |
| 1      | Alice | 101     | NULL       | 3             | 2            |
| 2      | Bob   | 101     | 1          | 3             | 2            |
| 7      | Grace | 101     | 1          | 3             | 2            |

### NULL in ORDER BY

- In PostgreSQL: NULLs sort LAST by default (ASC), FIRST by default (DESC)
- In MySQL: NULLs sort FIRST by default (ASC), LAST by default (DESC)
- In SQL Server: NULLs sort FIRST by default (both ASC and DESC)
- In Oracle: NULLs sort LAST by default (both ASC and DESC)

You can control this explicitly:

```sql
-- PostgreSQL, MySQL, SQL Server, Oracle
ORDER BY manager_id ASC NULLS LAST   -- PostgreSQL, Oracle
ORDER BY manager_id ASC              -- MySQL: NULLs first (default)
```

> MySQL does not support `NULLS FIRST`/`NULLS LAST` syntax. SQL Server does not support it either.

---

## Production Pitfalls

### Pitfall 1: Window functions and GROUP BY in the same query level

```sql
-- BAD: This is a syntax error in most databases
SELECT
    dept_id,
    name,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_salary,
    COUNT(*) AS dept_count
FROM employees
GROUP BY dept_id, name;
```

This will group by each unique (dept_id, name) combination — which is likely every row. Use a CTE or subquery instead:

```sql
-- BETTER
WITH dept_averages AS (
    SELECT
        *,
        AVG(salary) OVER (PARTITION BY dept_id) AS avg_salary
    FROM employees
)
SELECT
    dept_id,
    MIN(name) AS sample_name,  -- or whatever aggregation you need
    AVG(avg_salary) AS avg_of_dept_avgs,
    COUNT(*) AS dept_count
FROM dept_averages
GROUP BY dept_id;
```

### Pitfall 2: Non-deterministic results with ROW_NUMBER

```sql
-- BAD: Non-deterministic ordering
SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary) AS rn
FROM employees;
```

When multiple rows have the same salary, the order is arbitrary. Add a tiebreaker:

```sql
-- GOOD: Deterministic
SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary, emp_id) AS rn
FROM employees;
```

### Pitfall 3: DISTINCT with window functions

```sql
-- BAD: DISTINCT eliminates rows you need
SELECT DISTINCT
    dept_id,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_salary
FROM employees;
```

This may not give you what you expect. The `DISTINCT` applies to the entire SELECT list, not just the window function. If you need distinct aggregated results, use GROUP BY:

```sql
-- BETTER
SELECT
    dept_id,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id;
```

### Pitfall 4: Window functions in WHERE clause

Window functions cannot appear in WHERE. They can only appear in SELECT, ORDER BY, and HAVING (in some databases). Use a subquery:

```sql
-- BAD
SELECT *
FROM employees
WHERE ROW_NUMBER() OVER (ORDER BY salary) <= 3;

-- GOOD
WITH ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY salary) AS rn
    FROM employees
)
SELECT * FROM ranked WHERE rn <= 3;
```

---

## Performance Implications

### GROUP BY Performance

- **Hash aggregation:** Used when there are few groups relative to rows. Fast, memory-efficient.
- **Sort aggregation:** Used when data is already sorted or when hash is too expensive.
- **Index impact:** An index on GROUP BY columns can eliminate the sort entirely.

```sql
-- An index on (dept_id) helps:
CREATE INDEX idx_emp_dept ON employees(dept_id);
SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id;
```

### Window Function Performance

- **Sort required:** Window functions with ORDER BY require sorting within each partition.
- **Memory usage:** Large partitions with complex frame calculations can consume significant memory.
- **Multiple window functions with the same PARTITION BY/ORDER BY:** Most optimizers can share the sort. Check the execution plan.
- **Index impact:** An index matching PARTITION BY + ORDER BY can eliminate sorting:

```sql
-- An index on (dept_id, salary) helps:
CREATE INDEX idx_emp_dept_sal ON employees(dept_id, salary);
SELECT
    *,
    RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
FROM employees;
```

### When to Verify with EXPLAIN

Always check the execution plan when:

1. Query is slow on large tables
2. You see `Sort` nodes with high cost
3. You see `WindowAgg` with `Sort` underneath
4. You're deciding between GROUP BY + JOIN vs window function

**PostgreSQL:**

```sql
EXPLAIN ANALYZE
SELECT
    *,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_sal
FROM employees;
```

**MySQL:**

```sql
EXPLAIN FORMAT=JSON
SELECT
    *,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_sal
FROM employees;
```

**SQL Server:**

```sql
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT
    *,
    AVG(salary) OVER (PARTITION BY dept_id) AS avg_sal
FROM employees;
```

### Performance Comparison Summary

| Scenario                                  | GROUP BY           | Window Function             |
| ----------------------------------------- | ------------------ | --------------------------- |
| Simple aggregation, few groups            | Often faster       | Overhead of preserving rows |
| Need detail + aggregate                   | Requires JOIN back | Direct, no extra scan       |
| Ranking                                   | Complex subquery   | Native                      |
| Running totals                            | Complex self-join  | Direct                      |
| Large dataset, no index on partition      | Sort-heavy         | Sort-heavy                  |
| Large dataset, index on partition columns | Can avoid sort     | Can avoid sort              |

> Do not make absolute claims like "window functions are always faster than GROUP BY + JOIN." Performance depends on data distribution, indexes, optimizer, statistics, and query shape. Always verify with EXPLAIN.

---

## Advanced Patterns

### Percent of Total

```sql
-- Show each employee's salary as a percentage of total company salary
SELECT
    name,
    dept_id,
    salary,
    ROUND(
        salary * 100.0 / SUM(salary) OVER (),
        2
    ) AS pct_of_total
FROM employees;
```

| name  | dept_id | salary | pct_of_total |
| ----- | ------- | ------ | ------------ |
| Alice | 101     | 90000  | 19.35        |
| Bob   | 101     | 80000  | 17.20        |
| Carol | 102     | 95000  | 20.43        |
| ...   | ...     | ...    | ...          |

### Percent of Department Total

```sql
SELECT
    name,
    dept_id,
    salary,
    ROUND(
        salary * 100.0 / SUM(salary) OVER (PARTITION BY dept_id),
        2
    ) AS pct_of_dept
FROM employees;
```

### Lag/Lead: Compare to Previous/Next Row

```sql
SELECT
    order_id,
    customer_id,
    order_date,
    amount,
    LAG(amount, 1) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount,
    amount - LAG(amount, 1) OVER (PARTITION BY customer_id ORDER BY order_date) AS diff_from_prev
FROM orders
ORDER BY customer_id, order_date;
```

| order_id | customer_id | order_date | amount | prev_amount | diff_from_prev |
| -------- | ----------- | ---------- | ------ | ----------- | -------------- |
| 101      | 1           | 2024-01-05 | 250    | NULL        | NULL           |
| 102      | 1           | 2024-03-12 | 180    | 250         | -70            |
| 106      | 1           | 2024-06-30 | 220    | 180         | 40             |

### NTILE: Divide into Buckets

```sql
SELECT
    name,
    salary,
    NTILE(4) OVER (ORDER BY salary DESC) AS salary_quartile
FROM employees;
```

| name  | salary | salary_quartile |
| ----- | ------ | --------------- |
| Carol | 95000  | 1               |
| Alice | 90000  | 1               |
| Grace | 85000  | 2               |
| Bob   | 80000  | 2               |
| Dave  | 75000  | 3               |
| Eve   | 75000  | 3               |
| Frank | 60000  | 4               |

### GROUP BY + Window Function Together (via CTE)

```sql
-- Step 1: Get department-level stats with GROUP BY
-- Step 2: Use window function to add context
WITH dept_stats AS (
    SELECT
        dept_id,
        COUNT(*) AS emp_count,
        AVG(salary) AS avg_salary,
        MAX(salary) AS max_salary
    FROM employees
    GROUP BY dept_id
)
SELECT
    dept_id,
    emp_count,
    avg_salary,
    max_salary,
    RANK() OVER (ORDER BY avg_salary DESC) AS dept_rank
FROM dept_stats;
```

| dept_id | emp_count | avg_salary | max_salary | dept_rank |
| ------- | --------- | ---------- | ---------- | --------- |
| 101     | 3         | 85000.00   | 90000      | 1         |
| 102     | 3         | 81666.67   | 95000      | 2         |
| 103     | 1         | 60000.00   | 60000      | 3         |

### FILTER Clause (PostgreSQL, SQLite, DuckDB)

Some databases support `FILTER (WHERE ...)` on aggregate functions, which is cleaner than CASE inside aggregates:

```sql
-- Count of employees hired after 2020 per department
SELECT
    dept_id,
    COUNT(*) FILTER (WHERE hire_date > '2020-01-01') AS recent_hires,
    COUNT(*) AS total_employees
FROM employees
GROUP BY dept_id;
```

> MySQL, SQL Server, and Oracle do not support the FILTER clause. Use CASE instead:
> `COUNT(CASE WHEN hire_date > '2020-01-01' THEN 1 END)`

---

## Comparison Tables

### Feature Comparison

| Feature                  | GROUP BY                | Window Function                           |
| ------------------------ | ----------------------- | ----------------------------------------- |
| Collapses rows           | Yes                     | No                                        |
| Preserves row count      | No                      | Yes                                       |
| Aggregate results        | Yes                     | Yes                                       |
| Ranking                  | No                      | Yes (RANK, DENSE_RANK, ROW_NUMBER, NTILE) |
| Running totals           | No (complex workaround) | Yes (SUM OVER + frame)                    |
| Lead/Lag                 | No                      | Yes                                       |
| First value / Nth value  | No                      | Yes (FIRST_VALUE, NTH_VALUE)              |
| Filter after aggregation | HAVING                  | Subquery/CTE (or QUALIFY)                 |
| Can appear in WHERE      | No                      | No                                        |
| Can appear in SELECT     | Yes                     | Yes                                       |
| Can appear in ORDER BY   | Yes                     | Yes                                       |
| Execution phase          | Before SELECT           | During SELECT                             |

### Syntax Comparison

| Operation           | GROUP BY                                       | Window Function                                                          |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Average per group   | `SELECT dept, AVG(sal) FROM emp GROUP BY dept` | `SELECT AVG(sal) OVER (PARTITION BY dept) FROM emp`                      |
| Count per group     | `SELECT dept, COUNT(*) FROM emp GROUP BY dept` | `SELECT COUNT(*) OVER (PARTITION BY dept) FROM emp`                      |
| Rank within group   | Complex subquery                               | `RANK() OVER (PARTITION BY dept ORDER BY sal)`                           |
| Running total       | Complex self-join                              | `SUM(amt) OVER (PARTITION BY cust ORDER BY dt ROWS UNBOUNDED PRECEDING)` |
| Filter on aggregate | `HAVING AVG(sal) > 80000`                      | CTE + WHERE                                                              |

---

## Best Practices

1. **Choose GROUP BY for summaries.** If you need one row per category, GROUP BY is simpler and often more efficient.

2. **Choose window functions for detail + aggregate.** If you need to see individual rows alongside their group's statistics, window functions are the right tool.

3. **Always specify the frame clause explicitly.** Don't rely on defaults, especially for running totals:

   ```sql
   -- Explicit is better than implicit
   SUM(amount) OVER (
       PARTITION BY customer_id
       ORDER BY order_date
       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
   )
   ```

4. **Use CTEs to combine both approaches.** Aggregate first with GROUP BY, then use window functions for ranking, or vice versa.

5. **Add tiebreakers to ORDER BY in window functions.** Without them, ROW_NUMBER is non-deterministic:

   ```sql
   ROW_NUMBER() OVER (ORDER BY salary DESC, emp_id)  -- deterministic
   ```

6. **Check execution plans.** Use EXPLAIN ANALYZE to verify that indexes are being used and sorts are minimized.

7. **Be mindful of NULL ordering.** Different databases handle NULLs differently in ORDER BY. Specify `NULLS FIRST` or `NULLS LAST` where supported.

8. **Don't use DISTINCT with window functions unless you truly need it.** Window functions already preserve rows; DISTINCT can eliminate rows you intended to keep.

9. **Name your window functions clearly.** Use descriptive aliases like `dept_avg_salary` not `avg1` or `val`.

10. **Avoid correlated subqueries when a window function will do.** They often produce the same result but are harder to read and sometimes slower.

---

# Interview Questions

## Beginner

1. What is the fundamental difference between GROUP BY and a window function with PARTITION BY?

2. Why does this query fail?

   ```sql
   SELECT name, dept_id, AVG(salary)
   FROM employees
   GROUP BY dept_id;
   ```

3. How many rows does each of these return, and why?

   ```sql
   -- Query A
   SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id;

   -- Query B
   SELECT name, AVG(salary) OVER (PARTITION BY dept_id) FROM employees;
   ```

4. What is the difference between COUNT(\*) and COUNT(column) when the column has NULLs?

5. Can you use a window function in a WHERE clause? Why or why not?

## Intermediate

6. Write a query that shows each employee's name, their salary, and their department's average salary. Use the most appropriate approach.

7. What is the difference between RANK(), DENSE_RANK(), and ROW_NUMBER()? Show with an example where they differ.

8. Rewrite this using a window function instead of a subquery:

   ```sql
   SELECT *
   FROM employees e
   WHERE salary > (
       SELECT AVG(salary)
       FROM employees e2
       WHERE e2.dept_id = e.dept_id
   );
   ```

9. Why might `RANK() OVER (ORDER BY salary)` produce different results on the same data in PostgreSQL vs MySQL?

10. What is the difference between `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` and `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`?

## Advanced

11. Write a query to calculate each customer's order amount as a percentage of their total spending, ordered by order date.

12. Write a query to find the second-highest salary in each department using only window functions (no subqueries).

13. Explain when the default frame `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` produces different results from `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Give a concrete example.

14. Write a query that identifies employees whose salary is above their department average AND ranks in the top 3 within their department.

15. You have a table of daily stock prices. Write a query to compute a 3-day moving average of the closing price for each stock.

## Scenario Based

16. **Business requirement:** "Show each salesperson's total monthly sales alongside the team's average monthly sales, but only for months where the salesperson exceeded the team average." How would you approach this?

17. **Data issue:** You notice that a query using `RANK()` produces gaps in the ranking (1, 2, 2, 4). The business wants no gaps (1, 2, 2, 3). Which function should you use and why?

18. **Performance:** A window function query on a 10M-row table is slow. You check the execution plan and see a `Sort` node with high cost. What steps would you take?

19. **Migration:** You're migrating from MySQL to PostgreSQL. What differences in NULL ordering and window function behavior should you watch for?

20. **Design:** You need a report showing: each order, the customer's total number of orders, the order's percentage of the customer's total, and a rank of orders by amount within each customer. Write the query and explain your choices.

## Tricky

21. What happens here?

    ```sql
    SELECT
        name,
        dept_id,
        salary,
        AVG(salary) OVER (PARTITION BY dept_id ORDER BY hire_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_avg
    FROM employees;
    ```

    Is this a running average of salary ordered by hire date, or a running average of the department? Explain the difference.

22. Predict the output:

    ```sql
    SELECT
        emp_id,
        salary,
        SUM(salary) OVER (ORDER BY salary DESC ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS three_row_sum
    FROM employees;
    ```

23. This query returns 7 rows. If you add `SELECT DISTINCT` to the window function result, how many rows do you get and why?

    ```sql
    SELECT DISTINCT
        AVG(salary) OVER (PARTITION BY dept_id) AS avg_sal
    FROM employees;
    ```

24. A colleague writes:

    ```sql
    SELECT name, salary,
           RANK() OVER (PARTITION BY dept_id ORDER BY salary) AS rnk
    FROM employees
    WHERE rnk <= 2;
    ```

    What error do they get, and how do you fix it without using a CTE?

25. Can a query use both GROUP BY and a window function in the same SELECT clause? If so, under what conditions? If not, why?

## Output Prediction

26. Given the `orders` table, predict the output:

    ```sql
    SELECT
        customer_id,
        order_date,
        amount,
        SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_sum,
        LAG(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_amount,
        LEAD(amount) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_amount
    FROM orders;
    ```

27. Given the `employees` table, predict the output:
    ```sql
    SELECT
        name,
        salary,
        NTILE(3) OVER (ORDER BY salary DESC) AS tier
    FROM employees;
    ```

## Debugging

28. This query is supposed to show each employee's salary rank within their department, but it returns only one row. Find the bug:

    ```sql
    SELECT
        dept_id,
        RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
    FROM employees
    GROUP BY dept_id;
    ```

29. A running total query shows the same value for every row in a partition. What's wrong?

    ```sql
    SELECT
        customer_id,
        order_date,
        amount,
        SUM(amount) OVER (PARTITION BY customer_id) AS running_total
    FROM orders;
    ```

30. This query returns duplicate rows unexpectedly. Debug it:
    ```sql
    SELECT DISTINCT
        dept_id,
        name,
        AVG(salary) OVER (PARTITION BY dept_id) AS avg_sal
    FROM employees;
    ```

## Performance

31. Under what conditions might a GROUP BY + JOIN approach outperform a window function for calculating department averages alongside employee details?

32. You have a 50M-row table with an index on `(department_id, salary)`. You run:

    ```sql
    SELECT *,
        RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk
    FROM employees;
    ```

    What would you expect to see in the execution plan? What could still cause poor performance?

33. When might multiple window functions in the same query be more efficient than computing the same results with separate subqueries?

34. A query uses `SUM() OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)` on a table with 100M rows. The execution plan shows `WindowAgg` with no Sort node. Explain why this might be the case and whether it's always desirable.

35. Compare the performance implications of these two approaches for finding the top 3 earners per department:
    - Approach A: ROW_NUMBER + CTE
    - Approach B: LATERAL JOIN (PostgreSQL) or CROSS APPLY (SQL Server)
