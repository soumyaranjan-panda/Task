# COUNT and NULL Pitfalls

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [COUNT Variants](#count-variants)
3. [Internal Working](#internal-working)
4. [Syntax](#syntax)
5. [Sample Tables](#sample-tables)
6. [Core Examples](#core-examples)
7. [NULL Behavior Deep Dive](#null-behavior-deep-dive)
8. [Scenario-Based Examples](#scenario-based-examples)
9. [Edge Cases](#edge-cases)
10. [Common Mistakes](#common-mistakes)
11. [Production Pitfalls](#production-pitfalls)
12. [Performance Implications](#performance-implications)
13. [Interview Traps](#interview-traps)
14. [Comparison Tables](#comparison-tables)
15. [Best Practices](#best-practices)
16. [Interview Questions](#interview-questions)

---

## Fundamentals

### What is COUNT?

`COUNT` is an **aggregate function** that returns the number of rows matching a criterion. It is one of the most commonly used SQL functions and simultaneously one of the most misunderstood.

### Why does it exist?

Data almost always has **missing values**. SQL represents missing information with `NULL`. The three forms of `COUNT` exist precisely because "how many rows?" and "how many non-NULL values?" are fundamentally different questions with fundamentally different answers.

### The Three Forms

| Form | Counts | Skips NULLs |
|---|---|---|
| `COUNT(*)` | All rows, including NULLs | No |
| `COUNT(column)` | Non-NULL values in that column | Yes |
| `COUNT(DISTINCT column)` | Unique non-NULL values in that column | Yes |

> Common misconception: `COUNT(*)` counts "all rows including NULLs" — many beginners think it counts only non-NULL rows. It counts **every row** regardless of content. `NULL` in a column does not make the row disappear from `COUNT(*)`.

---

## Internal Working

### How does COUNT(*) work internally?

Most optimizers treat `COUNT(*)` specially:

1. The planner recognizes `COUNT(*)` as "count all rows."
2. It does **not** need to read column values at all.
3. It reads only the table metadata or the smallest available index.
4. On a table with a clustered index (e.g., InnoDB primary key), it can count by traversing only the index leaf pages — not the table heap.

### How does COUNT(column) work internally?

1. The engine must **read** the specified column for every qualifying row.
2. For each row, it checks `IS NULL`.
3. It increments the counter only when the value is not NULL.

This means `COUNT(column)` can be **slower** than `COUNT(*)` because it must examine actual column data, possibly requiring extra I/O if the column is not covered by an index.

### How does COUNT(DISTINCT column) work?

1. It must read every qualifying row's column value.
2. It inserts each non-NULL value into a **hash set** or **sort-based deduplication** structure.
3. It returns the size of that set.

This adds memory and CPU overhead proportional to the number of distinct non-NULL values.

> Performance implication: `COUNT(DISTINCT column)` on a high-cardinality column with millions of rows can spill to disk in the temporary workspace. Verify with `EXPLAIN ANALYZE` on your specific database.

---

## Syntax

```sql
-- Count all rows
SELECT COUNT(*) FROM table_name;

-- Count non-NULL values in a column
SELECT COUNT(column_name) FROM table_name;

-- Count distinct non-NULL values
SELECT COUNT(DISTINCT column_name) FROM table_name;

-- With WHERE
SELECT COUNT(*) FROM table_name WHERE condition;

-- With GROUP BY
SELECT department, COUNT(*) FROM employees GROUP BY department;

-- With HAVING
SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5;

-- Count with CASE (conditional counting)
SELECT COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count FROM users;

-- Equivalent using SUM
SELECT SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count FROM users;
```

> PostgreSQL: `COUNT(boolean_expression)` is supported. `SELECT COUNT(status = 'active')` works in PostgreSQL and counts rows where the expression is TRUE. This does not work in MySQL or SQL Server.

> Oracle: `COUNT(*)` and `COUNT(column)` work identically to ANSI SQL. Oracle also supports `COUNT(KEY)`.

---

## Sample Tables

### employees

One row per employee.

| id | name | department | salary | manager_id | hire_date |
|----|------|-----------|--------|------------|-----------|
| 1 | Alice | Engineering | 120000 | NULL | 2019-03-15 |
| 2 | Bob | Engineering | 95000 | 1 | 2020-07-01 |
| 3 | Charlie | Marketing | 80000 | NULL | 2018-11-20 |
| 4 | Diana | Marketing | 75000 | 3 | 2021-01-10 |
| 5 | Eve | Sales | 70000 | NULL | 2022-06-05 |
| 6 | Frank | Sales | 65000 | 5 | 2023-02-14 |
| 7 | Grace | Engineering | 110000 | 1 | 2020-09-30 |
| 8 | Heidi | NULL | 60000 | NULL | 2023-08-01 |

Note: Rows 1, 3, 5, 7, 8 have `NULL` in `manager_id`. Row 8 has `NULL` in `department`.

### orders

One row per order.

| order_id | customer_id | product_id | amount | discount | order_date |
|----------|-------------|------------|--------|----------|------------|
| 101 | 1 | 10 | 250.00 | 25.00 | 2024-01-05 |
| 102 | 1 | 20 | NULL | NULL | 2024-01-10 |
| 103 | 2 | 10 | 300.00 | NULL | 2024-01-15 |
| 104 | 3 | 30 | NULL | NULL | 2024-02-01 |
| 105 | 2 | 20 | 150.00 | 10.00 | 2024-02-10 |
| 106 | 4 | NULL | 400.00 | NULL | 2024-02-15 |

Note: Rows 102, 104 have `NULL` in `amount`. Rows 102, 103, 104, 106 have `NULL` in `discount`. Row 106 has `NULL` in `product_id`.

---

## Core Examples

### Example 1: COUNT(*) vs COUNT(column)

```sql
SELECT
    COUNT(*)            AS total_rows,
    COUNT(department)   AS dept_not_null,
    COUNT(manager_id)   AS manager_not_null,
    COUNT(salary)       AS salary_not_null
FROM employees;
```

**Expected result:**

| total_rows | dept_not_null | manager_not_null | salary_not_null |
|------------|---------------|------------------|-----------------|
| 8 | 7 | 3 | 8 |

**Why?**

- `COUNT(*)` = 8 → all 8 rows exist.
- `COUNT(department)` = 7 → Heidi (row 8) has `NULL` department.
- `COUNT(manager_id)` = 3 → only rows 2, 4, 6 have a non-NULL manager.
- `COUNT(salary)` = 8 → every employee has a salary.

> Interview trap: "Why does `COUNT(*)` return 8 but `COUNT(department)` returns 7?" The answer is that `COUNT(*)` counts rows, while `COUNT(department)` counts non-NULL values in that specific column. `NULL` in a column does not eliminate the row from the table.

---

### Example 2: COUNT(DISTINCT column)

```sql
SELECT
    COUNT(DISTINCT department) AS unique_depts,
    COUNT(DISTINCT manager_id) AS unique_managers
FROM employees;
```

**Expected result:**

| unique_depts | unique_managers |
|--------------|-----------------|
| 4 | 3 |

**Why?**

- Departments: Engineering, Marketing, Sales, NULL → `COUNT(DISTINCT department)` = 3 (NULL excluded), not 4.
- Managers: 1, 3, 5 → `COUNT(DISTINCT manager_id)` = 3.

---

### Example 3: COUNT with WHERE

```sql
SELECT
    COUNT(*) AS total_orders,
    COUNT(amount) AS orders_with_amount,
    COUNT(discount) AS orders_with_discount
FROM orders;
```

**Expected result:**

| total_orders | orders_with_amount | orders_with_discount |
|--------------|-------------------|---------------------|
| 6 | 4 | 2 |

**Why?**

- `COUNT(*)` = 6 (all orders).
- `COUNT(amount)` = 4 → rows 101, 103, 105, 106 have non-NULL amounts.
- `COUNT(discount)` = 2 → only rows 101 and 105 have non-NULL discounts.

---

### Example 4: COUNT with GROUP BY

```sql
SELECT
    department,
    COUNT(*)            AS total_employees,
    COUNT(manager_id)   AS employees_with_manager,
    ROUND(AVG(salary), 0) AS avg_salary
FROM employees
GROUP BY department;
```

**Expected result:**

| department | total_employees | employees_with_manager | avg_salary |
|------------|-----------------|----------------------|------------|
| Engineering | 3 | 2 | 108333 |
| Marketing | 2 | 1 | 77500 |
| Sales | 2 | 1 | 67500 |
| NULL | 1 | 0 | 60000 |

> Important: `GROUP BY` groups `NULL` values together. `NULL` department forms its own group. See [NULL behavior in GROUP BY](#null-behavior-deep-dive) below.

---

### Example 5: COUNT with HAVING

```sql
SELECT
    department,
    COUNT(*) AS total_employees
FROM employees
GROUP BY department
HAVING COUNT(*) > 1;
```

**Expected result:**

| department | total_employees |
|------------|-----------------|
| Engineering | 3 |
| Marketing | 2 |
| Sales | 2 |

NULL department is excluded because it has only 1 employee.

---

## NULL Behavior Deep Dive

### NULL = NULL is NOT TRUE

```sql
-- This returns 0, not 1
SELECT COUNT(*) FROM employees WHERE manager_id = NULL;
```

**Result:** 0

**Why?** In SQL's three-valued logic, `NULL = NULL` evaluates to `UNKNOWN`, not `TRUE`. The `WHERE` clause only includes rows that evaluate to `TRUE`. `UNKNOWN` and `FALSE` are both excluded.

**Correct way:**

```sql
SELECT COUNT(*) FROM employees WHERE manager_id IS NULL;
```

**Result:** 5

> Interview trap: "How many employees have `NULL` manager_id?" Writing `WHERE manager_id = NULL` returns 0. This is a classic interview question designed to test knowledge of three-valued logic.

---

### IS DISTINCT FROM / IS NOT DISTINCT FROM

These operators treat `NULL` as a comparable value. Two `NULL`s are considered equal under `IS DISTINCT FROM`.

> PostgreSQL, MySQL 8.0.16+, SQL Server: `IS DISTINCT FROM` is supported.
> Oracle: Use `NVL(col1, sentinel) = NVL(col2, sentinel)` or `COALESCE` comparison instead.

```sql
-- PostgreSQL / MySQL 8.0.16+
SELECT
    COUNT(*) AS total,
    COUNT(CASE WHEN manager_id IS NOT DISTINCT FROM NULL THEN 1 END) AS null_managers,
    COUNT(CASE WHEN manager_id IS DISTINCT FROM NULL THEN 1 END) AS non_null_managers
FROM employees;
```

**Result:**

| total | null_managers | non_null_managers |
|-------|---------------|-------------------|
| 8 | 5 | 3 |

**Oracle workaround:**

```sql
SELECT
    COUNT(CASE WHEN manager_id IS NULL THEN 1 END) AS null_managers,
    COUNT(CASE WHEN manager_id IS NOT NULL THEN 1 END) AS non_null_managers
FROM employees;
```

---

### COUNT and GROUP BY with NULLs

```sql
SELECT
    manager_id,
    COUNT(*) AS report_count
FROM employees
GROUP BY manager_id
ORDER BY manager_id;
```

**Expected result:**

| manager_id | report_count |
|------------|--------------|
| NULL | 5 |
| 1 | 2 |
| 3 | 1 |
| 5 | 1 |

> Important: `GROUP BY` creates a separate group for `NULL`. NULLs are grouped together, not ignored. This is standard ANSI SQL behavior.

---

### COUNT(*) vs COUNT(column) in expressions

```sql
-- This is a dangerous pattern
SELECT
    COUNT(*) - COUNT(manager_id) AS employees_without_manager
FROM employees;
```

**Result:** 5

**Why?** `COUNT(*)` = 8, `COUNT(manager_id)` = 3, so 8 - 3 = 5. This works because `COUNT(*)` includes rows where `manager_id` is NULL, while `COUNT(manager_id)` excludes them.

> Production pitfall: This pattern (`COUNT(*) - COUNT(column)`) is a concise way to count NULLs, but it is fragile. If the data changes or the column name is wrong, the result silently becomes incorrect. Consider using `SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END)` for explicit intent.

---

### NULL in aggregate functions beyond COUNT

For completeness — `COUNT` is not the only aggregate affected by NULL:

| Function | NULL behavior |
|----------|---------------|
| `COUNT(*)` | Counts all rows |
| `COUNT(col)` | Skips NULLs |
| `SUM(col)` | Ignores NULLs; if ALL values are NULL, returns NULL (not 0) |
| `AVG(col)` | Ignores NULLs; divides by count of non-NULL values |
| `MIN(col)` / `MAX(col)` | Ignores NULLs |
| `GROUP_CONCAT(col)` | Ignores NULLs (MySQL) / `STRING_AGG` ignores NULLs (PostgreSQL, SQL Server) |

> Production pitfall: `AVG(salary)` does not include NULL salaries in the denominator. If you want to count NULL salaries as 0, use `AVG(COALESCE(salary, 0))`. Verify the business intent before using `AVG`.

---

## Scenario-Based Examples

### Scenario 1: "How many orders have a discount?"

**BAD APPROACH:**

```sql
SELECT COUNT(*) FROM orders WHERE discount > 0;
```

**Problem:** Orders with `NULL` discount are excluded (correct), but if `discount` is `0`, they are also excluded. If you want to count orders where a discount exists (even if it is 0), this is wrong. Also, `NULL > 0` evaluates to `UNKNOWN`, so NULL discounts are excluded — which happens to be the desired behavior here, but for the wrong reason.

**BETTER APPROACH:**

```sql
SELECT COUNT(discount) FROM orders;
```

**Why?** `COUNT(discount)` counts only non-NULL discount values. This explicitly says "count rows where discount is not NULL."

**Even Better (if you want to be explicit about intent):**

```sql
SELECT COUNT(*) FROM orders WHERE discount IS NOT NULL;
```

**Why?** This is the most readable. It clearly states the intent: "count rows where a discount value exists."

---

### Scenario 2: "What percentage of employees have a manager?"

**BAD APPROACH:**

```sql
SELECT
    COUNT(manager_id) * 100.0 / COUNT(*) AS pct_with_manager
FROM employees;
```

This actually works, but the formula is not immediately obvious to readers.

**BETTER APPROACH:**

```sql
SELECT
    ROUND(
        100.0 * SUM(CASE WHEN manager_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*),
        1
    ) AS pct_with_manager
FROM employees;
```

**Expected result:**

| pct_with_manager |
|------------------|
| 37.5 |

**Why?** The `CASE` expression makes the intent explicit: "count rows where manager_id is not NULL, divided by total rows." This is self-documenting.

---

### Scenario 3: "Count orders per customer, including customers with zero orders"

**BAD APPROACH:**

```sql
SELECT
    c.customer_id,
    c.name,
    COUNT(o.order_id) AS order_count
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name;
```

**Problem:** This is an INNER JOIN. Customers with zero orders are excluded entirely. You never see a count of 0.

**BETTER APPROACH:**

```sql
SELECT
    c.customer_id,
    c.name,
    COUNT(o.order_id) AS order_count
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name;
```

**Why?** `LEFT JOIN` preserves all customers. When there is no matching order, `o.order_id` is NULL. `COUNT(o.order_id)` skips NULLs, so customers with zero orders get a count of 0.

> Interview trap: Use `COUNT(o.order_id)` (column from the joined table), not `COUNT(*)`. `COUNT(*)` would count the joined row even when there is no match, giving 1 instead of 0 for customers with no orders.

> Production pitfall: `COUNT(*)` after a `LEFT JOIN` counts rows, not matches. A customer with no orders still produces one row (with NULLs from the orders table), so `COUNT(*)` returns 1, not 0. Always use `COUNT(column_from_right_table)` to correctly count only matches.

---

### Scenario 4: "Average salary by department, but only for departments with at least 3 employees"

```sql
SELECT
    department,
    COUNT(*)            AS employee_count,
    ROUND(AVG(salary), 0) AS avg_salary
FROM employees
GROUP BY department
HAVING COUNT(*) >= 3;
```

**Expected result:**

| department | employee_count | avg_salary |
|------------|----------------|------------|
| Engineering | 3 | 108333 |

**Why?** `WHERE` filters rows before grouping. `HAVING` filters groups after aggregation. Since we need the count (an aggregate result) to decide which groups to keep, we must use `HAVING`.

---

### Scenario 5: "Which departments have more employees without managers than with managers?"

```sql
SELECT
    department,
    SUM(CASE WHEN manager_id IS NULL THEN 1 ELSE 0 END) AS no_manager,
    SUM(CASE WHEN manager_id IS NOT NULL THEN 1 ELSE 0 END) AS has_manager
FROM employees
GROUP BY department
HAVING SUM(CASE WHEN manager_id IS NULL THEN 1 ELSE 0 END) >
       SUM(CASE WHEN manager_id IS NOT NULL THEN 1 ELSE 0 END);
```

**Expected result:**

| department | no_manager | has_manager |
|------------|------------|-------------|
| Sales | 1 | 1 |
| Marketing | 1 | 1 |
| NULL | 1 | 0 |

Wait — Sales and Marketing are tied at 1-1, so they would not satisfy the `HAVING`. Only the NULL department (Heidi) has 1 no_manager and 0 has_manager.

**Corrected result:**

| department | no_manager | has_manager |
|------------|------------|-------------|
| NULL | 1 | 0 |

---

### Scenario 6: "Count distinct products ordered, ignoring NULLs and duplicates"

```sql
SELECT
    COUNT(DISTINCT product_id) AS unique_products_ordered
FROM orders;
```

**Result:** 3 (products 10, 20, 30 — product_id NULL in row 106 is excluded)

---

## Edge Cases

### Edge Case 1: COUNT on an empty table

```sql
-- Suppose the employees table is empty
SELECT
    COUNT(*)            AS total,
    COUNT(department)   AS dept_count,
    COUNT(DISTINCT department) AS distinct_depts
FROM employees;
```

**Expected result:**

| total | dept_count | distinct_depts |
|-------|------------|----------------|
| 0 | 0 | 0 |

**Why?** `COUNT(*)` returns 0 for an empty table (not NULL). `COUNT(column)` also returns 0. `COUNT(DISTINCT column)` also returns 0. This is correct ANSI SQL behavior.

> Common misconception: Some people expect `COUNT(column)` to return NULL on an empty table. It returns 0.

---

### Edge Case 2: All values in a column are NULL

```sql
-- Suppose all rows have NULL department
SELECT
    COUNT(*)            AS total,
    COUNT(department)   AS dept_count,
    COUNT(DISTINCT department) AS distinct_depts
FROM employees;
```

If every `department` is NULL:

| total | dept_count | distinct_depts |
|-------|------------|----------------|
| 8 | 0 | 0 |

`COUNT(column)` returns 0, not NULL, because it counts non-NULL values and there are none.

---

### Edge Case 3: COUNT(DISTINCT) with all NULLs

```sql
SELECT COUNT(DISTINCT department) FROM employees WHERE department IS NULL;
```

**Result:** 0 (NULL is excluded from DISTINCT counting)

---

### Edge Case 4: COUNT with a subquery returning NULLs

```sql
SELECT COUNT(*) FROM (
    SELECT NULL AS val
    UNION ALL
    SELECT NULL
    UNION ALL
    SELECT 1
) sub;
```

**Result:** 3 (COUNT(*) counts all rows)

```sql
SELECT COUNT(val) FROM (
    SELECT NULL AS val
    UNION ALL
    SELECT NULL
    UNION ALL
    SELECT 1
) sub;
```

**Result:** 1 (only non-NULL value is counted)

---

### Edge Case 5: COUNT in a CASE expression inside COUNT

```sql
SELECT COUNT(CASE WHEN salary > 80000 THEN 1 END) AS high_earners
FROM employees;
```

**Result:** 3 (Alice: 120000, Bob: 95000, Grace: 110000)

**Why?** The `CASE` returns `1` for matching rows and `NULL` (implicit) for non-matching rows. `COUNT(CASE ...)` counts only the non-NULL values, i.e., only the matching rows.

> Production pitfall: The implicit `ELSE NULL` in a `CASE` expression inside `COUNT` is critical. If you write `CASE WHEN condition THEN 1 ELSE 0 END`, then `COUNT` counts all rows (because 0 is not NULL), which defeats the purpose of conditional counting. Always omit the `ELSE` clause or use `ELSE NULL` explicitly when doing conditional counting with `COUNT`.

---

### Edge Case 6: COUNT(*) with a WHERE that never matches

```sql
SELECT COUNT(*) FROM employees WHERE 1 = 0;
```

**Result:** 0

This is not a NULL issue, but beginners sometimes confuse it.

---

## Common Mistakes

### Mistake 1: Using COUNT(*) when COUNT(column) is needed

```sql
-- WRONG: counts all rows, not just those with a discount
SELECT COUNT(*) AS discount_count FROM orders;

-- RIGHT: counts only rows where discount is not NULL
SELECT COUNT(discount) AS discount_count FROM orders;
```

---

### Mistake 2: Using WHERE col = NULL

```sql
-- WRONG: always returns 0
SELECT COUNT(*) FROM employees WHERE manager_id = NULL;

-- RIGHT: uses IS NULL
SELECT COUNT(*) FROM employees WHERE manager_id IS NULL;
```

---

### Mistake 3: COUNT(*) after LEFT JOIN

```sql
-- WRONG: counts joined rows, not actual orders
SELECT
    c.customer_id,
    COUNT(*) AS order_count
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id;

-- RIGHT: counts non-NULL order_id values
SELECT
    c.customer_id,
    COUNT(o.order_id) AS order_count
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id;
```

---

### Mistake 4: Using COUNT(column) to count rows with a specific value

```sql
-- WRONG: if status can be NULL, this might not work as expected
SELECT COUNT(status) FROM orders WHERE status = 'shipped';

-- RIGHT: COUNT(*) with WHERE is equivalent and clearer
SELECT COUNT(*) FROM orders WHERE status = 'shipped';
```

`COUNT(status)` and `COUNT(*)` produce the same result here because `WHERE status = 'shipped'` already filters out NULLs (since `NULL = 'shipped'` is `UNKNOWN`). But `COUNT(*)` is more direct.

---

### Mistake 5: Forgetting that AVG divides by COUNT(column)

```sql
-- This AVERAGE excludes NULL salaries from the denominator
SELECT AVG(salary) FROM employees;

-- If you want to count NULLs as 0 in the average
SELECT AVG(COALESCE(salary, 0)) FROM employees;
```

---

### Mistake 6: Using COUNT(DISTINCT) unnecessarily

```sql
-- If you know a column is unique per group, COUNT(*) is equivalent and faster
SELECT COUNT(*) FROM orders WHERE customer_id = 1;

-- COUNT(DISTINCT order_id) adds overhead for no benefit if order_id is the primary key
SELECT COUNT(DISTINCT order_id) FROM orders WHERE customer_id = 1;
```

---

## Production Pitfalls

### Pitfall 1: COUNT(*) on large tables without an index

On a table with billions of rows, `SELECT COUNT(*) FROM large_table` can take minutes. The engine must traverse the entire index (or table).

**Mitigation:**

- Use a covering index if possible.
- Consider maintaining a separate count table or using materialized views for approximate counts.
- For approximate counts, PostgreSQL has `pg_class.reltuples` and MySQL has `EXPLAIN` estimates.

> Verify: Run `EXPLAIN ANALYZE SELECT COUNT(*) FROM large_table;` to see the actual cost and execution time.

---

### Pitfall 2: COUNT in an INSERT...SELECT or UPDATE trigger

If you use `COUNT(*)` in a trigger or a correlated subquery inside an `INSERT` or `UPDATE`, it can cause **full table scans** on every row modification. This can destroy write performance.

**Mitigation:** Use a denormalized counter column that is updated atomically, or use a materialized aggregate table.

---

### Pitfall 3: COUNT(DISTINCT) with high cardinality

`COUNT(DISTINCT column)` on a column with millions of unique values requires the database to maintain a large hash table or sort structure. On PostgreSQL, this can use `HashAggregate` or `UniqueAggregate` with significant memory.

**Mitigation:**

- Use `EXPLAIN ANALYZE` to check memory usage.
- Consider approximate distinct count algorithms if exactness is not required (`APPROX_COUNT_DISTINCT` in Oracle, `HyperLogLog` extensions in PostgreSQL).

---

### Pitfall 4: COUNT returns 0, not NULL

When an aggregate function has no rows to aggregate, `COUNT` returns `0`. Other aggregates like `SUM` and `AVG` return `NULL`.

```sql
-- If no rows match:
SELECT COUNT(*) FROM employees WHERE department = 'Nonexistent';
-- Returns: 0

SELECT SUM(salary) FROM employees WHERE department = 'Nonexistent';
-- Returns: NULL

SELECT AVG(salary) FROM employees WHERE department = 'Nonexistent';
-- Returns: NULL
```

> Production pitfall: Code that expects `COUNT(*)` to return `NULL` on no matches will get `0` instead. This can cause logic errors in application code if not handled.

---

### Pitfall 5: Race conditions with COUNT in concurrent environments

`SELECT COUNT(*)` is not atomic with respect to concurrent `INSERT`/`DELETE` operations (unless using `REPEATABLE READ` or higher isolation level with locking). Between two `COUNT(*)` calls, rows may be inserted or deleted.

**Mitigation:** Use transactions with appropriate isolation levels, or accept approximate counts for non-critical reporting.

---

## Performance Implications

### COUNT(*) vs COUNT(column) speed

| Aspect | COUNT(*) | COUNT(column) | COUNT(DISTINCT column) |
|--------|----------|---------------|----------------------|
| Needs to read column data | No | Yes | Yes |
| Can use covering index fully | Yes (smallest index) | Only if column is indexed | Only if column is indexed |
| NULL handling overhead | None | Must check each row | Must check + deduplicate |
| Memory usage | Minimal | Minimal | Proportional to distinct count |
| Typical speed (large table) | Fastest | Slightly slower | Slowest |

> Performance claims above are general tendencies, not guarantees. Actual performance depends on the optimizer, indexes, statistics, cardinality, data distribution, query shape, database engine, and execution plan. Always verify with `EXPLAIN ANALYZE`.

### When COUNT(*) can use an index

If the table has an index, `COUNT(*)` can traverse the index instead of the table. A smaller index is faster:

```sql
-- PostgreSQL example: check which index is used
EXPLAIN ANALYZE SELECT COUNT(*) FROM employees;

-- To force a specific index (PostgreSQL)
SET enable_seqscan = off;
EXPLAIN ANALYZE SELECT COUNT(*) FROM employees;
SET enable_seqscan = on;
```

### COUNT(DISTINCT) performance

```sql
-- This can be expensive on high-cardinality columns
EXPLAIN ANALYZE SELECT COUNT(DISTINCT customer_id) FROM orders;

-- Compare with approximate if available (PostgreSQL extension)
-- SELECT approximate_count_distinct(customer_id) FROM orders;
```

> PostgreSQL: Consider the `pg_trgm` or `pg_stat_statements` extensions for query analysis. For approximate counts, the `pg_ctl` `reltuples` catalog provides rough estimates.
> MySQL: `EXPLAIN` output includes `rows` estimate. For exact counts, there is no built-in approximate function.
> SQL Server: `COUNT_BIG` is available for tables exceeding 2 billion rows (returns `BIGINT` instead of `INT`).

---

## Interview Traps

### Trap 1: "What does COUNT(NULL) return?"

**Answer:** `COUNT(NULL)` returns 0. `NULL` is not a valid column reference. If you write `SELECT COUNT(NULL)`, some databases raise an error, others treat it as `COUNT(*)` equivalent. The intent is ambiguous. Never write `COUNT(NULL)`.

---

### Trap 2: "Why does COUNT(*) not count NULLs as zeros?"

**Answer:** `COUNT(*)` counts **rows**, not values. It does not examine any column. A row exists regardless of whether its columns contain NULL. `COUNT(column)` counts non-NULL **values** in that column. These are different operations.

---

### Trap 3: "How many NULLs are in a column?"

```sql
-- Correct
SELECT COUNT(*) - COUNT(column_name) AS null_count FROM table_name;

-- Also correct and more explicit
SELECT SUM(CASE WHEN column_name IS NULL THEN 1 ELSE 0 END) AS null_count FROM table_name;

-- PostgreSQL specific
SELECT COUNT(*) FILTER (WHERE column_name IS NULL) AS null_count FROM table_name;
```

---

### Trap 4: "Does GROUP BY include NULL groups?"

**Answer:** Yes. `GROUP BY` creates a separate group for NULL values. This is standard ANSI SQL behavior.

```sql
SELECT department, COUNT(*)
FROM employees
GROUP BY department;
-- Returns a row for NULL department
```

---

### Trap 5: "Can COUNT(*) return NULL?"

**Answer:** No. `COUNT(*)` always returns a non-negative integer, even for empty tables (returns 0). `COUNT(column)` also returns 0 for empty tables or all-NULL columns, never NULL.

---

### Trap 6: "What is the difference between COUNT(DISTINCT col) and COUNT(DISTINCT col1, col2)?"

```sql
-- Counts distinct values of col1 alone
SELECT COUNT(DISTINCT col1) FROM table_name;

-- Counts distinct combinations of (col1, col2)
SELECT COUNT(DISTINCT col1, col2) FROM table_name;
```

> PostgreSQL: Multi-column `DISTINCT` in `COUNT` is not supported. Use a subquery:
> ```sql
> SELECT COUNT(*) FROM (SELECT DISTINCT col1, col2 FROM table_name) sub;
> ```
>
> MySQL, SQL Server: `COUNT(DISTINCT col1, col2)` is supported.
>
> Oracle: `COUNT(DISTINCT col1, col2)` is not supported. Use the subquery approach.

---

## Comparison Tables

### COUNT Variants Side by Side

| Expression | Counts | NULLs included? | Empty table result |
|-----------|--------|----------------|-------------------|
| `COUNT(*)` | All rows | N/A (counts rows) | 0 |
| `COUNT(col)` | Non-NULL values in col | No | 0 |
| `COUNT(DISTINCT col)` | Unique non-NULL values | No | 0 |
| `COUNT(CASE WHEN x THEN 1 END)` | Rows where x is true | No (NULL from ELSE) | 0 |
| `COUNT(CASE WHEN x THEN 1 ELSE 0 END)` | All rows (0 is not NULL) | N/A | 0 |

### COUNT vs SUM for Conditional Counting

| Expression | Meaning |
|-----------|---------|
| `COUNT(CASE WHEN condition THEN 1 END)` | Counts rows where condition is TRUE |
| `SUM(CASE WHEN condition THEN 1 ELSE 0 END)` | Same result, but 0 is explicit |
| `COUNT(*) FILTER (WHERE condition)` | PostgreSQL shorthand, same result |

### NULL Comparison Operators

| Expression | NULL = NULL result | NULL compared to value |
|-----------|-------------------|----------------------|
| `=` | UNKNOWN | UNKNOWN |
| `<>` | UNKNOWN | UNKNOWN |
| `IS NULL` | TRUE for NULL | N/A (only checks NULL) |
| `IS NOT NULL` | FALSE for NULL | N/A (only checks not NULL) |
| `IS DISTINCT FROM` | FALSE (NULLs are equal) | TRUE if values differ |
| `IS NOT DISTINCT FROM` | TRUE (NULLs are equal) | TRUE if values are same |

---

## Best Practices

1. **Use `COUNT(*)` when counting rows.** It is clearer and often faster.

2. **Use `COUNT(column)` when counting non-NULL values.** Do not use `COUNT(*)` with `WHERE col IS NOT NULL` when `COUNT(column)` does the same thing more concisely — unless you need the explicit readability of the `WHERE` clause.

3. **Never write `WHERE col = NULL`.** Always use `WHERE col IS NULL`.

4. **When using `LEFT JOIN`, use `COUNT(right_table.column)` to count matches.** Never use `COUNT(*)` to count matches from a `LEFT JOIN`.

5. **Use `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` for conditional counting** when you want the intent to be explicit and self-documenting.

6. **Prefer `COUNT(column)` over `COUNT(*) - COUNT(column)` for counting NULLs** when readability matters. The subtraction trick is clever but less obvious.

7. **For conditional counting, consider PostgreSQL's `FILTER` clause:**
   ```sql
   SELECT COUNT(*) FILTER (WHERE salary > 80000) AS high_earners
   FROM employees;
   ```

8. **Always check execution plans** for `COUNT(DISTINCT)` on large tables. Memory and CPU costs can be significant.

9. **Do not assume `COUNT(*)` and `COUNT(column)` return the same result.** They differ whenever the column has NULLs.

10. **For production reporting, consider approximate counts** when exactness is not required, especially on very large tables.

---

# Interview Questions

## Beginner

1. What is the difference between `COUNT(*)` and `COUNT(column)`?

2. Why does `SELECT COUNT(*) FROM employees WHERE manager_id = NULL` return 0?

3. How many rows does `COUNT(*)` return for an empty table?

4. Does `COUNT(column)` ever return `NULL`? Explain.

5. Write a query to count the number of employees in the `Engineering` department.

## Intermediate

6. Write a query to count the number of employees who do **not** have a manager. Explain why your approach is correct.

7. Write a query to find the average salary per department, including departments where no employee has a salary (all salaries are NULL). What does `AVG` return in that case?

8. Explain why `SELECT COUNT(*) FROM customers LEFT JOIN orders ON customers.id = orders.customer_id GROUP BY customers.id` might not give you the number of orders per customer.

9. Write a query to count distinct departments from the `employees` table. What happens if some departments are NULL?

10. What is the difference between these two queries?
    ```sql
    -- Query A
    SELECT COUNT(DISTINCT department) FROM employees;

    -- Query B
    SELECT COUNT(*) FROM (SELECT DISTINCT department FROM employees) sub;
    ```

## Advanced

11. Write a query to count, for each department, the number of employees who earn more than the company-wide average salary. Do this without using a subquery in the `WHERE` clause.

12. Explain the performance difference between `COUNT(*)` and `COUNT(large_text_column)` on a table with 100 million rows. What does the execution plan tell you?

13. Write a query using `COUNT` that identifies departments where the number of employees without a manager exceeds the number with a manager.

14. How would you handle `COUNT(DISTINCT col)` on a column with 50 million distinct values in PostgreSQL? What are the memory implications?

15. Explain why `SELECT COUNT(*) - COUNT(salary) FROM employees` returns the number of employees with NULL salaries.

## Scenario Based

16. **Scenario:** You are building a dashboard that shows "completion rate" as `COUNT(completed_at) / COUNT(*)`. The product manager says the numbers look wrong. What are the possible causes?

17. **Scenario:** A `LEFT JOIN` query returns a count of 1 for customers with no orders instead of 0. Write the corrected query and explain the error.

18. **Scenario:** You need to count the number of distinct `user_id` values in an `events` table that has 2 billion rows. The query is timing out. What strategies would you consider?

19. **Scenario:** A report shows `AVG(response_time)` as lower than expected. The team discovers that slow responses were recorded as NULL instead of actual values. Explain why this skews the average and how to fix it.

20. **Scenario:** You run `SELECT COUNT(*) FROM orders WHERE order_date = '2024-01-01'` and get 0, but you know orders exist on that date. The `order_date` column is of type `DATETIME`. What went wrong?

## Tricky

21. What is the result of this query? Explain step by step.
    ```sql
    SELECT COUNT(*) FROM (SELECT NULL UNION ALL SELECT NULL UNION ALL SELECT 1) t;
    ```

22. What is the result of this query?
    ```sql
    SELECT COUNT(col) FROM (SELECT NULL AS col UNION ALL SELECT NULL UNION ALL SELECT 1) t;
    ```

23. What is the result of this query?
    ```sql
    SELECT COUNT(DISTINCT col) FROM (SELECT NULL AS col UNION ALL SELECT NULL UNION ALL SELECT 1) t;
    ```

24. What is the result of this query? Why?
    ```sql
    SELECT
        COUNT(CASE WHEN salary > 100000 THEN 1 END) AS high,
        COUNT(CASE WHEN salary > 100000 THEN 1 ELSE 0 END) AS high_wrong
    FROM employees;
    ```

25. What is the result of this query?
    ```sql
    SELECT COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 10;
    ```
    (Given that no department has more than 10 employees)

## Output Prediction

26. Given the `employees` table above, what is the output of:
    ```sql
    SELECT
        department,
        COUNT(*) - COUNT(manager_id) AS no_manager_count
    FROM employees
    GROUP BY department
    ORDER BY no_manager_count DESC;
    ```

27. Given the `orders` table above, what is the output of:
    ```sql
    SELECT
        COUNT(amount) AS has_amount,
        COUNT(CASE WHEN amount > 200 THEN 1 END) AS above_200,
        COUNT(CASE WHEN amount > 200 THEN 1 ELSE NULL END) AS above_200_v2
    FROM orders;
    ```

28. Given the `employees` table above, what is the output of:
    ```sql
    SELECT COUNT(DISTINCT manager_id) FROM employees;
    ```

## Debugging

29. The following query returns a count that is higher than expected. Debug it:
    ```sql
    SELECT
        c.customer_id,
        COUNT(*) AS order_count
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    GROUP BY c.customer_id;
    ```
    What is the problem and how would you fix it?

30. A developer writes this query to find departments where all employees earn above 80,000:
    ```sql
    SELECT department
    FROM employees
    GROUP BY department
    HAVING COUNT(CASE WHEN salary > 80000 THEN 1 END) = COUNT(*);
    ```
    Is this correct? What edge cases could produce wrong results?

## Performance

31. You have a table `audit_log` with 1 billion rows and a composite index on `(event_type, created_at)`. Which query is likely faster and why?
    ```sql
    -- Query A
    SELECT COUNT(*) FROM audit_log WHERE event_type = 'login';

    -- Query B
    SELECT COUNT(created_at) FROM audit_log WHERE event_type = 'login';
    ```

32. Explain when `COUNT(DISTINCT col)` might cause a query to spill to disk. How would you verify this using `EXPLAIN ANALYZE`?

33. A query uses `COUNT(*)` in a correlated subquery inside an `UPDATE` statement. The `UPDATE` is extremely slow. Explain why and propose a fix.

34. You need to count rows in a table that is being actively written to. What isolation-level concerns exist? How would you get a consistent count?

35. Compare the performance characteristics of these three approaches to count NULLs in a column:
    ```sql
    -- Approach A
    SELECT COUNT(*) - COUNT(col) FROM t;

    -- Approach B
    SELECT SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END) FROM t;

    -- Approach C
    SELECT COUNT(*) FROM t WHERE col IS NULL;
    ```
    Under what conditions might one be faster than the others?
