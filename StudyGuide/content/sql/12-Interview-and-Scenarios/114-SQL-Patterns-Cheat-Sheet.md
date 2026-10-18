# 114 — SQL Patterns Cheat Sheet

> A comprehensive reference of common SQL patterns, anti-patterns, and idioms — organized for quick lookup and deep understanding.

---

## Table of Contents

1. [Sample Tables](#sample-tables)
2. [NULL Handling Patterns](#null-handling-patterns)
3. [Filtering Patterns](#filtering-patterns)
4. [Aggregation Patterns](#aggregation-patterns)
5. [JOIN Patterns](#join-patterns)
6. [Subquery Patterns](#subquery-patterns)
7. [Window Function Patterns](#window-function-patterns)
8. [Set Operation Patterns](#set-operation-patterns)
9. [Pagination Patterns](#pagination-patterns)
10. [Deduplication Patterns](#deduplication-patterns)
11. [Running Totals & Cumulative Patterns](#running-totals--cumulative-patterns)
12. [Ranking & Top-N Patterns](#ranking--top-n-patterns)
13. [Gap & Island Patterns](#gap--island-patterns)
14. [Pivot & Unpivot Patterns](#pivot--unpivot-patterns)
15. [Hierarchical / Recursive Patterns](#hierarchical--recursive-patterns)
16. [Data Modification Patterns](#data-modification-patterns)
17. [Anti-Patterns & Production Pitfalls](#anti-patterns--production-pitfalls)
18. [Sargability Patterns](#sargability-patterns)
19. [Interview Questions](#interview-questions)

---

## Sample Tables

All examples in this section use these tables. **Grain** is stated for each.

### employees

One row = one employee.

| emp_id | name        | dept_id | salary | hire_date  | manager_id |
|--------|-------------|---------|--------|------------|------------|
| 1      | Alice       | 101     | 90000  | 2019-03-15 | NULL       |
| 2      | Bob         | 101     | 80000  | 2020-06-01 | 1          |
| 3      | Charlie     | 102     | 75000  | 2021-01-20 | 1          |
| 4      | Diana       | 102     | 75000  | 2021-01-20 | 1          |
| 5      | Eve         | 103     | 95000  | 2018-11-30 | NULL       |
| 6      | Frank       | NULL    | 60000  | 2022-09-10 | 5          |
| 7      | Grace       | 101     | NULL   | 2023-02-01 | 2          |

### departments

One row = one department.

| dept_id | dept_name   |
|---------|-------------|
| 101     | Engineering |
| 102     | Marketing   |
| 103     | Finance     |
| 104     | Sales       |

### orders

One row = one order.

| order_id | customer_id | order_date | total_amount |
|----------|-------------|------------|--------------|
| 1        | 1001        | 2024-01-05 | 250.00       |
| 2        | 1001        | 2024-01-12 | 100.00       |
| 3        | 1002        | 2024-02-01 | 500.00       |
| 4        | 1003        | 2024-02-15 | 75.00        |
| 5        | 1001        | 2024-03-01 | 320.00       |
| 6        | NULL         | 2024-03-10 | 150.00       |

### order_items

One row = one line item in an order.

| item_id | order_id | product_id | quantity | unit_price |
|---------|----------|------------|----------|------------|
| 1       | 1        | 201        | 2        | 50.00      |
| 2       | 1        | 202        | 1        | 150.00     |
| 3       | 2        | 201        | 1        | 50.00      |
| 4       | 3        | 203        | 5        | 100.00     |
| 5       | 4        | 201        | 1        | 50.00      |
| 6       | 5        | 202        | 2        | 150.00     |
| 7       | 6        | 203        | 1        | 100.00     |

### products

One row = one product.

| product_id | product_name | category |
|------------|--------------|----------|
| 201        | Widget A     | Widget   |
| 202        | Widget B     | Widget   |
| 203        | Gadget X     | Gadget   |

---

## NULL Handling Patterns

> See also: NULL fundamentals section for Three-Valued Logic deep dive.

### Pattern: Check for NULL

**Never** use `=` or `<>` to test NULL. Always use `IS NULL` / `IS NOT NULL`.

```sql
-- BAD: returns zero rows, never true
SELECT * FROM employees WHERE manager_id = NULL;

-- GOOD
SELECT * FROM employees WHERE manager_id IS NULL;
```

**Why:** NULL is not a value — it is the absence of a value. `NULL = NULL` yields `UNKNOWN`, not `TRUE`.

> Interview trap: "Does `WHERE x = NULL` ever return rows?" — No, never.

### Pattern: NULL-safe Equality

Use `IS NOT DISTINCT FROM` (PostgreSQL, MySQL 8+) or `<=>` (MySQL) to compare values that may be NULL.

```sql
-- ANSI SQL (PostgreSQL, MySQL 8+, SQL Server 2022+)
SELECT *
FROM employees e1
JOIN employees e2
  ON e1.manager_id IS NOT DISTINCT FROM e2.manager_id;

-- MySQL legacy syntax
SELECT *
FROM employees e1
JOIN employees e2
  ON e1.manager_id <=> e2.manager_id;

-- SQL Server: ISNULL() workaround
SELECT *
FROM employees e1
JOIN employees e2
  ON ISNULL(e1.manager_id, -1) = ISNULL(e2.manager_id, -1);
```

> PostgreSQL: `IS DISTINCT FROM` is the idiomatic NULL-safe comparison.

### Pattern: COALESCE — Replace NULL with a Default

```sql
SELECT
  name,
  COALESCE(salary, 0) AS salary_safe,
  COALESCE(dept_id, -1) AS dept_safe
FROM employees;
```

| name    | salary_safe | dept_safe |
|---------|-------------|-----------|
| Alice   | 90000       | 101       |
| Frank   | 60000       | -1        |
| Grace   | 0           | 101       |

**Use when:** You need a non-NULL value for arithmetic or display.

### Pattern: NULLIF — Create NULL from Equal Values

```sql
-- Avoid division by zero
SELECT
  order_id,
  total_amount / NULLIF(quantity, 0) AS unit_price
FROM orders_summary;
```

**How it works:** `NULLIF(x, y)` returns NULL if `x = y`, otherwise returns `x`.

### Pattern: COUNT Behavior

```sql
SELECT
  COUNT(*)           AS cnt_all,        -- counts all rows including NULLs
  COUNT(dept_id)     AS cnt_dept,       -- counts only non-NULL dept_id
  COUNT(DISTINCT dept_id) AS cnt_unique -- distinct non-NULL values
FROM employees;
```

| cnt_all | cnt_dept | cnt_unique |
|---------|----------|------------|
| 7       | 6        | 3          |

**Key:** `COUNT(*)` never returns 0 for a non-empty table. `COUNT(column)` can return 0 if all values are NULL.

### Pattern: NULL in NOT IN

> Interview trap: `NOT IN` with a subquery containing NULL returns zero rows.

```sql
-- DANGEROUS: if any subquery result is NULL, this returns NOTHING
SELECT *
FROM employees
WHERE dept_id NOT IN (SELECT dept_id FROM departments WHERE dept_id > 102);

-- SAFE: use NOT EXISTS
SELECT e.*
FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM departments d WHERE d.dept_id = e.dept_id AND d.dept_id > 102
);
```

**Why:** If the subquery returns `(103, NULL)`, then `dept_id NOT IN (103, NULL)` becomes:

```
dept_id <> 103 AND dept_id <> NULL
-- the second condition is always UNKNOWN
-- so the whole expression is always UNKNOWN → zero rows
```

> Production pitfall: This is silent data loss — no error, just missing rows.

### Pattern: NULL in Aggregate Functions

All aggregate functions except `COUNT(*)` ignore NULLs.

```sql
SELECT
  AVG(salary)          AS avg_salary,      -- ignores NULLs (Grace's NULL excluded)
  SUM(salary)          AS total_salary,
  MIN(hire_date)       AS earliest_hire,
  MAX(salary)          AS max_salary
FROM employees;
```

**Gotcha:** `AVG(salary)` = total / count_of_non_null, not total / count_of_all_rows.

### Pattern: NULL Propagation in Expressions

Any arithmetic or comparison with NULL yields NULL.

```sql
SELECT
  1 + NULL       AS result1,  -- NULL
  NULL * 5       AS result2,  -- NULL
  NULL = NULL    AS result3,  -- UNKNOWN (displayed as NULL in most clients)
  CASE WHEN NULL = NULL THEN 'yes' ELSE 'no' END AS result4;  -- 'no'
```

### Pattern: Fill NULLs in Window Frame

```sql
-- Last non-null value (forward fill)
SELECT
  emp_id,
  hire_date,
  salary,
  LAST_VALUE(salary) IGNORE NULLS OVER (
    ORDER BY hire_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS last_known_salary
FROM employees;

-- PostgreSQL: use FILTER with a subquery or custom aggregate
-- SQL Server: IGNORE NULLS is supported
-- MySQL: requires a user variable workaround
```

> PostgreSQL: `IGNORE NULLS` is supported for `LAST_VALUE`, `FIRST_VALUE`, and `NTH_VALUE` from v14+.

---

## Filtering Patterns

### Pattern: WHERE vs HAVING

```sql
-- WHERE filters rows BEFORE grouping
-- HAVING filters groups AFTER grouping

-- Find departments with average salary > 80000
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
WHERE salary IS NOT NULL    -- filter individual rows first
GROUP BY dept_id
HAVING AVG(salary) > 80000; -- then filter groups
```

> Interview trap: Can you use a column alias in HAVING? **Depends on the database.** MySQL allows it; PostgreSQL, SQL Server, and Oracle do not (use the full expression or a CTE).

### Pattern: Conditions in ON vs WHERE

```sql
-- LEFT JOIN: condition placement matters!

-- Pattern A: Filter in WHERE → turns LEFT JOIN into INNER JOIN
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id
WHERE d.dept_name = 'Engineering';

-- Pattern B: Filter in ON → preserves LEFT JOIN behavior
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d
  ON e.dept_id = d.dept_id
  AND d.dept_name = 'Engineering';
```

**Pattern A** returns only employees in Engineering (INNER JOIN behavior).
**Pattern B** returns all employees, with dept_name filled only for Engineering.

> Production pitfall: Accidentally turning a LEFT JOIN into an INNER JOIN by adding a WHERE condition on the right table.

### Pattern: Date Range Filtering

```sql
-- BAD: string comparison, non-sargable, DB-specific
SELECT * FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';

-- GOOD: explicit boundaries
SELECT * FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2024-02-01';

-- BEST: parameterize
SELECT * FROM orders
WHERE order_date >= $start
  AND order_date <  $end;
```

> Production pitfall: `BETWEEN '2024-01-01' AND '2024-01-31'` misses any timestamp on Jan 31 after 00:00:00 if `order_date` is a `TIMESTAMP` type. Always use `< next_month` for timestamp ranges.

### Pattern: Multi-Valued Filter (AND vs OR)

```sql
-- Find orders that contain BOTH product 201 AND product 202
-- BAD approach
SELECT DISTINCT o.*
FROM orders o
JOIN order_items oi1 ON o.order_id = oi1.order_id AND oi1.product_id = 201
JOIN order_items oi2 ON o.order_id = oi2.order_id AND oi2.product_id = 202;

-- GOOD approach (two predicates on same table)
SELECT o.*
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
WHERE oi.product_id IN (201, 202)
GROUP BY o.order_id
HAVING COUNT(DISTINCT oi.product_id) = 2;

-- ALTERNATIVE: EXISTS
SELECT o.*
FROM orders o
WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.order_id AND oi.product_id = 201)
  AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.order_id AND oi.product_id = 202);
```

### Pattern: Exclude a Set of Rows

```sql
-- Find employees NOT in any order
-- BAD: NOT IN with NULL risk
SELECT * FROM employees WHERE emp_id NOT IN (SELECT customer_id FROM orders);

-- GOOD: NOT EXISTS
SELECT e.*
FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = e.emp_id);

-- GOOD: LEFT JOIN + IS NULL
SELECT e.*
FROM employees e
LEFT JOIN orders o ON e.emp_id = o.customer_id
WHERE o.order_id IS NULL;
```

> See also: NOT IN vs NOT EXISTS vs LEFT JOIN for detailed comparison.

---

## Aggregation Patterns

### Pattern: Distinct Count

```sql
-- Count unique customers per month
SELECT
  DATE_TRUNC('month', order_date) AS month,
  COUNT(DISTINCT customer_id)     AS unique_customers
FROM orders
GROUP BY DATE_TRUNC('month', order_date);
```

**Performance note:** `COUNT(DISTINCT ...)` can be expensive on large tables. Verify with `EXPLAIN ANALYZE` whether a subquery approach is faster.

### Pattern: Conditional Aggregation (Pivot)

```sql
-- Count orders per status
SELECT
  DATE_TRUNC('month', order_date) AS month,
  COUNT(*) FILTER (WHERE total_amount > 200) AS high_value,
  COUNT(*) FILTER (WHERE total_amount <= 200) AS low_value
FROM orders
GROUP BY DATE_TRUNC('month', order_date);

-- MySQL / SQL Server: use CASE inside SUM
SELECT
  DATE_TRUNC('month', order_date) AS month,
  SUM(CASE WHEN total_amount > 200 THEN 1 ELSE 0 END) AS high_value,
  SUM(CASE WHEN total_amount <= 200 THEN 1 ELSE 0 END) AS low_value
FROM orders
GROUP BY DATE_TRUNC('month', order_date);
```

> PostgreSQL: `FILTER (WHERE ...)` is the idiomatic approach.

### Pattern: Group by Expression

```sql
-- Total revenue by product category
SELECT
  p.category,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.category;
```

> Common mistake: Forgetting that `GROUP BY` in `SELECT` must include all non-aggregated columns. Some databases (MySQL with certain settings) allow this; most don't.

### Pattern: Multiple Grouping Sets

```sql
-- Revenue by category, by product, and grand total in one query
SELECT
  p.category,
  p.product_name,
  SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY GROUPING SETS (
  (p.category, p.product_name),
  (p.category),
  ()
)
ORDER BY GROUPING(p.category), GROUPING(p.product_name);
```

> PostgreSQL, SQL Server, Oracle: GROUPING SETS supported. MySQL: not supported (use UNION ALL manually).

### Pattern: Self-Referencing Aggregate

```sql
-- Count employees per department, but only departments with > 1 employee
SELECT dept_id, COUNT(*) AS emp_count
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id
HAVING COUNT(*) > 1;
```

### Pattern: Aggregation Over All Rows

```sql
-- Percentage of total
SELECT
  p.product_name,
  SUM(oi.quantity * oi.unit_price) AS revenue,
  ROUND(
    SUM(oi.quantity * oi.unit_price) * 100.0
    / SUM(SUM(oi.quantity * oi.unit_price)) OVER (), 2
  ) AS pct_of_total
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.product_name;
```

> Production pitfall: Use `100.0` not `100` to avoid integer division in databases that truncate integer division.

---

## JOIN Patterns

### Pattern: INNER JOIN

```sql
-- Only rows with matches in both tables
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id;
```

Frank (dept_id = NULL) and any employee in dept 104 (no employees) are excluded.

### Pattern: LEFT JOIN

```sql
-- All employees, with department info where available
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;
```

| name    | dept_name   |
|---------|-------------|
| Alice   | Engineering |
| Bob     | Engineering |
| Charlie | Marketing   |
| Diana   | Marketing   |
| Eve     | Finance     |
| Frank   | NULL        |
| Grace   | Engineering |

### Pattern: LEFT JOIN with IS NULL

```sql
-- Find employees without a department
SELECT e.name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id
WHERE d.dept_id IS NULL;
```

> Do NOT use `WHERE d.dept_name = NULL` — use `IS NULL`.

### Pattern: SELF JOIN

```sql
-- Find employees and their managers
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;
```

| employee | manager |
|----------|---------|
| Alice    | NULL    |
| Bob      | Alice   |
| Charlie  | Alice   |
| Diana    | Alice   |
| Eve      | NULL    |
| Frank    | Eve     |
| Grace    | Bob     |

### Pattern: Multiple JOINs — Fan-Out Risk

```sql
-- BAD: Cartesian product if one order has many items
-- and you're joining to another one-to-many table

-- Let's say orders can have many payments (not in our schema)
-- SELECT o.order_id, oi.product_id, p.payment_id
-- FROM orders o
-- JOIN order_items oi ON o.order_id = oi.order_id
-- JOIN payments p ON o.order_id = p.order_id
-- This fans out: 2 items × 3 payments = 6 rows for a single order

-- BETTER: Aggregate first, then join
-- or use EXISTS for the check
```

> Production pitfall: When joining multiple one-to-many tables, the result is a Cartesian product of the child rows. This causes inflated aggregates. Always ask: "How many rows does each side contribute?"

### Pattern: Avoid Accidental Cartesian Product

```sql
-- BAD: missing join condition
SELECT e.name, d.dept_name
FROM employees e
CROSS JOIN departments d;
-- Returns 7 × 4 = 28 rows

-- CHECK: If you see more rows than expected, inspect your JOIN conditions
```

### Pattern: JOIN to Get Latest Row Per Group

```sql
-- Get the latest order per customer
-- METHOD 1: Subquery
SELECT o.*
FROM orders o
JOIN (
  SELECT customer_id, MAX(order_date) AS max_date
  FROM orders
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) latest ON o.customer_id = latest.customer_id
         AND o.order_date = latest.max_date;

-- METHOD 2: Window function (more reliable when there are ties)
SELECT *
FROM (
  SELECT
    o.*,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY order_date DESC
    ) AS rn
  FROM orders o
  WHERE customer_id IS NOT NULL
) ranked
WHERE rn = 1;
```

> Performance: Both methods depend on indexes and cardinality. Verify with EXPLAIN ANALYZE.

### Pattern: LATERAL JOIN (PostgreSQL) / CROSS APPLY (SQL Server)

```sql
-- Get the top 2 order items per order
-- PostgreSQL
SELECT o.order_id, top_items.*
FROM orders o
CROSS JOIN LATERAL (
  SELECT oi.product_id, oi.quantity, oi.unit_price
  FROM order_items oi
  WHERE oi.order_id = o.order_id
  ORDER BY oi.unit_price DESC
  LIMIT 2
) top_items;

-- SQL Server
SELECT o.order_id, top_items.*
FROM orders o
CROSS APPLY (
  SELECT TOP 2 oi.product_id, oi.quantity, oi.unit_price
  FROM order_items oi
  WHERE oi.order_id = o.order_id
  ORDER BY oi.unit_price DESC
) top_items;
```

> MySQL: No LATERAL JOIN before 8.0.14. Use a correlated subquery or user-defined variable workaround.

---

## Subquery Patterns

### Pattern: Non-Correlated Subquery

The subquery runs once, independently.

```sql
-- Find employees earning above average
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees WHERE salary IS NOT NULL);
```

### Pattern: Correlated Subquery

The subquery runs once per outer row.

```sql
-- Find each employee's salary compared to their department average
SELECT
  name,
  salary,
  (SELECT AVG(e2.salary)
   FROM employees e2
   WHERE e2.dept_id = e.dept_id
     AND e2.salary IS NOT NULL) AS dept_avg
FROM employees e
WHERE salary IS NOT NULL;
```

**Performance:** Correlated subqueries can be slow if the inner query is not indexed. Consider rewriting as a JOIN or window function.

### Pattern: EXISTS vs IN

```sql
-- Find customers who have placed orders

-- EXISTS
SELECT c.*
FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);

-- IN
SELECT c.*
FROM customers c
WHERE c.customer_id IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);
```

> Common misconception: "EXISTS is always faster than IN." Not necessarily. The optimizer may choose different plans. Verify with EXPLAIN.

**NULL behavior difference:**

| Pattern          | NULL-safe? | Notes                          |
|------------------|------------|--------------------------------|
| `IN`             | Risky      | Subquery NULL → all FALSE      |
| `EXISTS`         | Safe       | NULL in join column is fine    |
| `NOT IN`         | Dangerous  | Any NULL → zero results        |
| `NOT EXISTS`     | Safe       | Always correct with NULLs      |

### Pattern: Scalar Subquery in SELECT

```sql
SELECT
  name,
  salary,
  salary - (SELECT AVG(salary) FROM employees WHERE salary IS NOT NULL) AS diff_from_avg
FROM employees
WHERE salary IS NOT NULL;
```

> Production pitfall: Scalar subqueries in SELECT execute per row. On large datasets, this can be extremely slow. Prefer a window function.

### Pattern: Subquery as Derived Table

```sql
SELECT dept_id, AVG(salary) AS avg_salary
FROM (
  SELECT emp_id, dept_id, salary
  FROM employees
  WHERE salary IS NOT NULL
) AS active_employees
GROUP BY dept_id;
```

---

## Window Function Patterns

> Window functions compute across a set of rows related to the current row WITHOUT collapsing them (unlike GROUP BY).

### Pattern: ROW_NUMBER — Unique Sequential Number

```sql
SELECT
  name,
  dept_id,
  salary,
  ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
FROM employees
WHERE salary IS NOT NULL;
```

| name    | dept_id | salary | rn |
|---------|---------|--------|----|
| Alice   | 101     | 90000  | 1  |
| Bob     | 101     | 80000  | 2  |
| Charlie | 102     | 75000  | 1  |
| Diana   | 102     | 75000  | 2  |
| Eve     | 103     | 95000  | 1  |

**Guaranteed unique** even with ties.

### Pattern: RANK — Rank with Gaps

```sql
SELECT
  name,
  dept_id,
  salary,
  RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
FROM employees
WHERE salary IS NOT NULL;
```

| name    | dept_id | salary | rnk |
|---------|---------|--------|-----|
| Alice   | 101     | 90000  | 1   |
| Bob     | 101     | 80000  | 2   |
| Charlie | 102     | 75000  | 1   |
| Diana   | 102     | 75000  | 1   |
| Eve     | 103     | 95000  | 1   |

Charlie and Diana share rank 1; the next rank would be 3 (gap).

### Pattern: DENSE_RANK — Rank Without Gaps

```sql
SELECT
  name,
  dept_id,
  salary,
  DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS drnk
FROM employees
WHERE salary IS NOT NULL;
```

Same as RANK but no gaps after ties.

> Interview trap: "What is the difference between RANK and DENSE_RANK?" — RANK skips ranks after ties; DENSE_RANK does not.

### Pattern: NTILE — Divide Into Buckets

```sql
SELECT
  name,
  salary,
  NTILE(3) OVER (ORDER BY salary DESC) AS salary_bucket
FROM employees
WHERE salary IS NOT NULL;
```

### Pattern: LAG / LEAD — Access Previous/Next Rows

```sql
SELECT
  order_id,
  order_date,
  LAG(order_date)  OVER (ORDER BY order_date) AS prev_order_date,
  LEAD(order_date) OVER (ORDER BY order_date) AS next_order_date
FROM orders;
```

**Use for:** Comparing current row to previous/next, detecting gaps, calculating time differences.

### Pattern: FIRST_VALUE / LAST_VALUE

```sql
-- First and last order per customer
SELECT
  customer_id,
  order_id,
  order_date,
  FIRST_VALUE(order_date) OVER (
    PARTITION BY customer_id ORDER BY order_date
  ) AS first_order_date,
  LAST_VALUE(order_date) OVER (
    PARTITION BY customer_id ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS last_order_date
FROM orders
WHERE customer_id IS NOT NULL;
```

> Production pitfall: `LAST_VALUE` with the default frame `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` returns the current row's value, not the actual last value. Always specify `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

### Pattern: SUM as Running Total

```sql
SELECT
  order_id,
  order_date,
  total_amount,
  SUM(total_amount) OVER (
    PARTITION BY customer_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM orders
WHERE customer_id IS NOT NULL;
```

### Pattern: Window Function in WHERE

```sql
-- Window functions CANNOT be used directly in WHERE
-- BAD:
-- SELECT * FROM (
--   SELECT name, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
--   FROM employees
-- ) WHERE rn = 1;

-- GOOD: wrap in subquery/CTE
SELECT *
FROM (
  SELECT
    name,
    salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
  FROM employees
  WHERE salary IS NOT NULL
) ranked
WHERE rn = 1;
```

### Pattern: GROUP BY vs Window Function

```sql
-- GROUP BY: collapses rows
SELECT dept_id, COUNT(*) AS emp_count
FROM employees
WHERE dept_id IS NOT NULL
GROUP BY dept_id;

-- Window function: preserves individual rows
SELECT
  name,
  dept_id,
  COUNT(*) OVER (PARTITION BY dept_id) AS dept_emp_count
FROM employees;
```

| Use GROUP BY when...        | Use window function when...       |
|-----------------------------|-----------------------------------|
| You need one row per group  | You need detail rows + aggregates |
| Final result is aggregated  | You need both aggregate and row   |
| Performance (less memory)   | Analytics / reporting             |

---

## Set Operation Patterns

### Pattern: UNION vs UNION ALL

```sql
-- UNION: removes duplicates (expensive — must sort/hash)
SELECT dept_id FROM employees
UNION
SELECT dept_id FROM departments;

-- UNION ALL: keeps all rows (faster)
SELECT dept_id FROM employees
UNION ALL
SELECT dept_id FROM departments;
```

> Performance: UNION requires a dedup step. Use UNION ALL unless you specifically need deduplication.

### Pattern: INTERSECT

```sql
-- Departments that have at least one employee
SELECT dept_id FROM employees
INTERSECT
SELECT dept_id FROM departments;
```

### Pattern: EXCEPT (MINUS in Oracle)

```sql
-- Departments with no employees
SELECT dept_id FROM departments
EXCEPT
SELECT dept_id FROM employees
WHERE dept_id IS NOT NULL;
```

### Pattern: UNION for Multi-Table Search

```sql
-- Search across multiple tables
SELECT 'employee' AS source, name AS label FROM employees WHERE name ILIKE '%ali%'
UNION ALL
SELECT 'department' AS source, dept_name AS label FROM departments WHERE dept_name ILIKE '%ali%';
```

---

## Pagination Patterns

### Pattern: OFFSET/FETCH (Keyset Alternative)

```sql
-- Page 3, 10 rows per page
SELECT *
FROM orders
ORDER BY order_id
LIMIT 10 OFFSET 20;

-- SQL Server
SELECT *
FROM orders
ORDER BY order_id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;
```

**Problem:** `OFFSET 100000` skips 100K rows — slow on large tables.

### Pattern: Keyset Pagination (Cursor-Based)

```sql
-- Get next page after last seen order_id = 5
SELECT *
FROM orders
WHERE order_id > 5
ORDER BY order_id
LIMIT 10;
```

> Production pitfall: OFFSET pagination degrades on large offsets. Keyset pagination is O(log n) vs O(n) for OFFSET. But keyset requires a unique, sequential column (or composite key) and doesn't allow jumping to arbitrary pages.

| Approach        | Arbitrary page? | Performance | Requires                    |
|-----------------|-----------------|-------------|-----------------------------|
| OFFSET/FETCH    | Yes             | Degrades    | Nothing                     |
| Keyset          | No              | Consistent  | Unique ordered column + value |

### Pattern: Seek Method with Composite Key

```sql
-- Keyset on (created_at, id) for tie-breaking
SELECT *
FROM orders
WHERE (created_at, id) > ($last_created_at, $last_id)
ORDER BY created_at, id
LIMIT 10;

-- PostgreSQL syntax
SELECT *
FROM orders
WHERE created_at > $last_created_at
   OR (created_at = $last_created_at AND id > $last_id)
ORDER BY created_at, id
LIMIT 10;
```

---

## Deduplication Patterns

### Pattern: DISTINCT

```sql
-- Remove duplicate department IDs from employees
SELECT DISTINCT dept_id
FROM employees
WHERE dept_id IS NOT NULL;
```

**Cost:** `DISTINCT` requires a sort or hash. On large tables, prefer `GROUP BY` or a window function for more control.

### Pattern: Deduplicate Keeping One Row

```sql
-- Keep only the latest order per customer
SELECT *
FROM (
  SELECT
    o.*,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY order_date DESC, order_id DESC
    ) AS rn
  FROM orders o
  WHERE customer_id IS NOT NULL
) ranked
WHERE rn = 1;
```

### Pattern: Groupwise Max

```sql
-- Get the highest-paid employee per department
SELECT *
FROM (
  SELECT
    e.*,
    ROW_NUMBER() OVER (
      PARTITION BY dept_id
      ORDER BY salary DESC
    ) AS rn
  FROM employees e
  WHERE salary IS NOT NULL AND dept_id IS NOT NULL
) ranked
WHERE rn = 1;
```

### Pattern: Remove Duplicates Using CTE (PostgreSQL, SQL Server)

```sql
-- PostgreSQL / SQL Server: delete duplicates, keep lowest ctid/id
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY name, dept_id, salary
      ORDER BY ctid
    ) AS rn
  FROM employees
)
DELETE FROM employees
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);
```

> MySQL: Use a temporary table or `DELETE ... USING` with a self-join for duplicate removal.

---

## Running Totals & Cumulative Patterns

### Pattern: Running Total

```sql
SELECT
  order_id,
  order_date,
  total_amount,
  SUM(total_amount) OVER (
    ORDER BY order_date, order_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_total
FROM orders
ORDER BY order_date;
```

### Pattern: Cumulative Average

```sql
SELECT
  order_id,
  order_date,
  total_amount,
  AVG(total_amount) OVER (
    ORDER BY order_date, order_id
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS cumulative_avg
FROM orders;
```

### Pattern: Percentage of Running Total

```sql
SELECT
  order_id,
  total_amount,
  SUM(total_amount) OVER w AS running_total,
  ROUND(
    total_amount * 100.0 / SUM(total_amount) OVER w, 2
  ) AS pct_of_running
FROM orders
WINDOW w AS (
  ORDER BY order_date, order_id
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
);
```

> PostgreSQL: `WINDOW` clause allows named window definitions for reuse.

---

## Ranking & Top-N Patterns

### Pattern: Top N Per Group

```sql
-- Top 2 products by revenue
SELECT *
FROM (
  SELECT
    p.product_name,
    SUM(oi.quantity * oi.unit_price) AS revenue,
    DENSE_RANK() OVER (ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS rnk
  FROM order_items oi
  JOIN products p ON oi.product_id = p.product_id
  GROUP BY p.product_name
) ranked
WHERE rnk <= 2;
```

### Pattern: Top N with Ties

```sql
-- Use RANK if you want to include ties
-- Use ROW_NUMBER if you want exactly N rows
-- Use DENSE_RANK if you want N distinct rank values

-- Exactly 1 row:
SELECT * FROM (
  SELECT name, salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
  FROM employees WHERE salary IS NOT NULL
) t WHERE rn = 1;

-- Include ties:
SELECT * FROM (
  SELECT name, salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees WHERE salary IS NOT NULL
) t WHERE rnk = 1;
```

### Pattern: Per-Group Ranking with LATERAL/CROSS APPLY

```sql
-- PostgreSQL
SELECT d.dept_name, top_emp.*
FROM departments d
CROSS JOIN LATERAL (
  SELECT e.name, e.salary
  FROM employees e
  WHERE e.dept_id = d.dept_id AND e.salary IS NOT NULL
  ORDER BY e.salary DESC
  LIMIT 2
) top_emp;
```

---

## Gap & Island Patterns

### Pattern: Find Gaps in a Sequence

```sql
-- Find missing order_ids (assuming sequential IDs)
WITH numbered AS (
  SELECT
    order_id,
    order_id - ROW_NUMBER() OVER (ORDER BY order_id) AS grp
  FROM orders
)
SELECT
  MIN(order_id) AS gap_start,
  MAX(order_id) AS gap_end
FROM numbered
GROUP BY grp
HAVING COUNT(*) > 1
   OR MAX(order_id) - MIN(order_id) > 0;
```

### Pattern: Find Consecutive Date Ranges (Islands)

```sql
-- Find consecutive days with orders for each customer
WITH daily AS (
  SELECT DISTINCT customer_id, order_date
  FROM orders
  WHERE customer_id IS NOT NULL
),
grouped AS (
  SELECT
    customer_id,
    order_date,
    order_date - INTERVAL '1 day' * ROW_NUMBER() OVER (
      PARTITION BY customer_id ORDER BY order_date
    ) AS grp
  FROM daily
)
SELECT
  customer_id,
  MIN(order_date) AS consecutive_start,
  MAX(order_date) AS consecutive_end,
  MAX(order_date) - MIN(order_date) + 1 AS consecutive_days
FROM grouped
GROUP BY customer_id, grp;
```

### Pattern: Identify Gaps in Timestamps

```sql
-- Find gaps larger than 1 day between logins
SELECT
  user_id,
  login_date,
  LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS prev_login,
  login_date - LAG(login_date) OVER (PARTITION BY user_id ORDER BY login_date) AS gap
FROM logins
HAVING login_date - LAG(login_date) OVER (...) > INTERVAL '1 day';
```

---

## Pivot & Unpivot Patterns

### Pattern: Pivot (Rows to Columns)

```sql
-- Revenue by product per category
-- PostgreSQL
SELECT
  p.category,
  SUM(CASE WHEN p.product_name = 'Widget A' THEN oi.quantity * oi.unit_price ELSE 0 END) AS widget_a,
  SUM(CASE WHEN p.product_name = 'Widget B' THEN oi.quantity * oi.unit_price ELSE 0 END) AS widget_b,
  SUM(CASE WHEN p.product_name = 'Gadget X' THEN oi.quantity * oi.unit_price ELSE 0 END) AS gadget_x
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
GROUP BY p.category;

-- SQL Server (dynamic pivot)
-- Use PIVOT operator with dynamic column list

-- PostgreSQL (crosstab extension)
-- CREATE EXTENSION tablefunc;
-- SELECT * FROM crosstab(
--   'SELECT category, product_name, revenue FROM product_revenues ORDER BY 1, 2'
-- ) AS ct(category text, "Widget A" numeric, "Widget B" numeric, "Gadget X" numeric);
```

### Pattern: Unpivot (Columns to Rows)

```sql
-- Turn pivoted columns back into rows
-- PostgreSQL / Standard SQL
SELECT customer_id, 'q1' AS quarter, q1 AS revenue FROM quarterly_revenue
UNION ALL
SELECT customer_id, 'q2', q2 FROM quarterly_revenue
UNION ALL
SELECT customer_id, 'q3', q3 FROM quarterly_revenue
UNION ALL
SELECT customer_id, 'q4', q4 FROM quarterly_revenue;

-- SQL Server
-- UNPIVOT operator
```

---

## Hierarchical / Recursive Patterns

### Pattern: Recursive CTE — Employee Hierarchy

```sql
WITH RECURSIVE hierarchy AS (
  -- Anchor: top-level managers
  SELECT
    emp_id, name, manager_id,
    1 AS level,
    CAST(name AS VARCHAR(500)) AS path
  FROM employees
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: employees with managers
  SELECT
    e.emp_id, e.name, e.manager_id,
    h.level + 1,
    CAST(h.path || ' → ' || e.name AS VARCHAR(500))
  FROM employees e
  JOIN hierarchy h ON e.manager_id = h.emp_id
)
SELECT * FROM hierarchy ORDER BY path;
```

| emp_id | name  | level | path              |
|--------|-------|-------|-------------------|
| 1      | Alice | 1     | Alice             |
| 2      | Bob   | 2     | Alice → Bob       |
| 7      | Grace | 3     | Alice → Bob → Grace|
| 3      | Charlie| 2    | Alice → Charlie   |
| 4      | Diana | 2     | Alice → Diana     |
| 5      | Eve   | 1     | Eve               |
| 6      | Frank | 2     | Eve → Frank       |

> SQL Server: Use `OPTION (MAXRECURSION n)` if default 100 limit is exceeded.
> MySQL: `WITH RECURSIVE` supported from 8.0+.

### Pattern: Recursive CTE — Generate Date Series

```sql
WITH RECURSIVE dates AS (
  SELECT DATE '2024-01-01' AS dt
  UNION ALL
  SELECT dt + INTERVAL '1 day'
  FROM dates
  WHERE dt < DATE '2024-01-31'
)
SELECT dt FROM dates;
```

> PostgreSQL: Use `generate_series()` instead — much faster.

---

## Data Modification Patterns

### Pattern: DELETE vs TRUNCATE vs DROP

| Operation  | DDL/DML | Rollback? | WHERE clause? | Triggers? | Speed    |
|------------|---------|-----------|---------------|-----------|----------|
| DELETE     | DML     | Yes       | Yes           | Yes       | Slow     |
| TRUNCATE   | DDL*    | Depends   | No            | No        | Fast     |
| DROP       | DDL     | Depends   | N/A           | N/A       | Fastest  |

\* `TRUNCATE` is DDL in PostgreSQL and SQL Server but can be DML in some databases.

> Production pitfall: `TRUNCATE` cannot be rolled back in some databases. Always verify behavior before running in production.

### Pattern: DELETE with JOIN

```sql
-- PostgreSQL
DELETE FROM order_items oi
USING orders o
WHERE oi.order_id = o.order_id
  AND o.order_date < '2024-01-01';

-- SQL Server
DELETE oi
FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date < '2024-01-01';

-- MySQL
DELETE oi FROM order_items oi
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date < '2024-01-01';
```

### Pattern: UPDATE with JOIN

```sql
-- PostgreSQL
UPDATE employees e
SET salary = e.salary * 1.10
FROM departments d
WHERE e.dept_id = d.dept_id
  AND d.dept_name = 'Engineering';

-- SQL Server
UPDATE e
SET e.salary = e.salary * 1.10
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
WHERE d.dept_name = 'Engineering';

-- MySQL
UPDATE employees e
JOIN departments d ON e.dept_id = d.dept_id
SET e.salary = e.salary * 1.10
WHERE d.dept_name = 'Engineering';
```

### Pattern: UPSERT (INSERT or UPDATE)

```sql
-- PostgreSQL
INSERT INTO departments (dept_id, dept_name)
VALUES (105, 'HR')
ON CONFLICT (dept_id) DO UPDATE SET dept_name = EXCLUDED.dept_name;

-- SQL Server
MERGE INTO departments d
USING (VALUES (105, 'HR')) AS src(dept_id, dept_name)
ON d.dept_id = src.dept_id
WHEN MATCHED THEN UPDATE SET d.dept_name = src.dept_name
WHEN NOT MATCHED THEN INSERT (dept_id, dept_name) VALUES (src.dept_id, src.dept_name);

-- MySQL
INSERT INTO departments (dept_id, dept_name)
VALUES (105, 'HR')
ON DUPLICATE KEY UPDATE dept_name = VALUES(dept_name);
```

> Production pitfall: `MERGE` in SQL Server has known bugs in certain versions. Test thoroughly.

---

## Anti-Patterns & Production Pitfalls

### Anti-Pattern: SELECT *

```sql
-- BAD
SELECT * FROM orders;

-- GOOD (explicit columns)
SELECT order_id, customer_id, order_date, total_amount FROM orders;
```

**Why:** `SELECT *` breaks when schema changes, increases network traffic, prevents covering index usage, and makes code harder to maintain.

### Anti-Pattern: Implicit Cartesian Product

```sql
-- BAD: missing JOIN condition → 7 × 4 = 28 rows
SELECT e.name, d.dept_name
FROM employees e, departments d;

-- GOOD
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id;
```

### Anti-Pattern: Functions on Indexed Columns

```sql
-- BAD: not sargable — cannot use index on order_date
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- GOOD: sargable
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';
```

### Anti-Pattern: Using HAVING Instead of WHERE

```sql
-- BAD: filters after grouping (unnecessary work)
SELECT dept_id, COUNT(*) AS cnt
FROM employees
GROUP BY dept_id
HAVING dept_id = 101;

-- GOOD: filters before grouping
SELECT dept_id, COUNT(*) AS cnt
FROM employees
WHERE dept_id = 101
GROUP BY dept_id;
```

### Anti-Pattern: NOT IN with NULLable Column

```sql
-- BAD: if inactive_ids contains NULL, returns zero rows
SELECT * FROM orders
WHERE order_id NOT IN (SELECT order_id FROM inactive_orders);

-- GOOD: NOT EXISTS
SELECT o.*
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM inactive_orders i WHERE i.order_id = o.order_id
);
```

### Anti-Pattern: OR Preventing Index Usage

```sql
-- BAD: OR can prevent index usage
SELECT * FROM orders
WHERE customer_id = 1001 OR total_amount > 400;

-- GOOD: UNION ALL (each branch can use its own index)
SELECT * FROM orders WHERE customer_id = 1001
UNION ALL
SELECT * FROM orders WHERE total_amount > 400
  AND customer_id != 1001;  -- avoid duplicates
```

> Performance: This depends on the optimizer. Some databases (PostgreSQL, Oracle) handle OR well with bitmap index conversions. Always verify with EXPLAIN.

### Anti-Pattern: Over-Normalization in Queries

```sql
-- BAD: 8 JOINs for a simple report
SELECT c.name, p.name, cat.name, sub.name, ...
FROM customers c
JOIN orders o ON ...
JOIN order_items oi ON ...
JOIN products p ON ...
JOIN categories cat ON ...
JOIN subcategories sub ON ...
JOIN regions r ON ...
JOIN countries co ON ...;

-- Consider denormalizing for read-heavy workloads
-- or using materialized views
```

### Anti-Pattern: String Concatenation for SQL

```sql
-- NEVER DO THIS (SQL injection)
-- query = "SELECT * FROM users WHERE name = '" + input + "'"

-- GOOD: parameterized query
-- SELECT * FROM users WHERE name = $1
```

> Production pitfall: SQL injection is a critical security vulnerability. Always use parameterized queries.

### Anti-Pattern: Missing Transaction Boundaries

```sql
-- BAD: no transaction — partial failure possible
DELETE FROM order_items WHERE order_id = 1;
DELETE FROM orders WHERE order_id = 1;

-- GOOD: wrapped in transaction
BEGIN;
  DELETE FROM order_items WHERE order_id = 1;
  DELETE FROM orders WHERE order_id = 1;
COMMIT;
```

---

## Sargability Patterns

> **SARGable** = Search ARGument Able — the optimizer can use an index to satisfy the predicate.

### Non-SARGable Patterns (Index Cannot Be Used)

```sql
-- Function on column
WHERE YEAR(order_date) = 2024
WHERE UPPER(name) = 'ALICE'
WHERE SUBSTRING(phone, 1, 3) = '555'

-- Arithmetic on column
WHERE salary * 12 > 1000000
WHERE order_id + 1 = 5

-- Implicit type conversion
WHERE phone = 5551234  -- phone is VARCHAR, comparing to INT

-- NOT, !=, <>
WHERE status != 'cancelled'

-- Leading wildcard in LIKE
WHERE name LIKE '%smith'

-- OR across different columns (sometimes)
WHERE first_name = 'Alice' OR last_name = 'Bob'
```

### SARGable Equivalents

```sql
-- Use range instead
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'

-- Move function to the other side
WHERE salary > 1000000 / 12

-- Use correct type
WHERE phone = '5551234'

-- Rewrite
WHERE NOT (status = 'cancelled')

-- Use full-text search or reverse + index
WHERE name LIKE 'smith%'   -- SARGable
-- For '%smith': use a trigram index (PostgreSQL pg_trgm) or full-text search
```

> Production pitfall: A query that is non-SARGable will scan the entire table regardless of indexes. This is one of the most common causes of slow queries.

---

## Interview Questions

### Beginner

1. What is the difference between `WHERE` and `HAVING`?
2. What is the difference between `DELETE`, `TRUNCATE`, and `DROP`?
3. Why does `SELECT *` considered bad practice?
4. What is the grain of the `orders` table used in this section?
5. What happens when you `COUNT(NULL)`?
6. What is the difference between `UNION` and `UNION ALL`?
7. What is a primary key?
8. What does `DISTINCT` do, and what is its cost?
9. What is the difference between `INNER JOIN` and `LEFT JOIN`?
10. Can you use a column alias in `WHERE`? Why or why not?

### Intermediate

11. Explain the difference between `IN` and `EXISTS`. When might you prefer one over the other?
12. What is a correlated subquery? How does it differ from a non-correlated subquery?
13. Write a query to find the second-highest salary without using `LIMIT` or `TOP`.
14. What is the difference between `RANK`, `DENSE_RANK`, and `ROW_NUMBER`?
15. Explain how `LEFT JOIN` with a `WHERE` condition on the right table can accidentally produce an `INNER JOIN`.
16. What is a sargable predicate? Give two examples of non-sargable predicates.
17. Write a query to get a running total of `total_amount` per customer.
18. What is the problem with `NOT IN` when the subquery returns NULLs?
19. Explain the difference between `WHERE` and `ON` in a `LEFT JOIN`.
20. What is keyset pagination, and when is it preferred over `OFFSET`?

### Advanced

21. Write a recursive CTE to traverse an employee hierarchy and output the reporting chain.
22. Explain how `LAST_VALUE` behaves differently depending on the window frame clause.
23. Write a query to find islands of consecutive dates for each customer.
24. How would you pivot rows into columns without using `PIVOT` or `crosstab`?
25. Explain why `WHERE YEAR(order_date) = 2024` is non-sargable and provide the sargable alternative.
26. Write a query to find gaps in a sequential `order_id` column.
27. What is the difference between `OVER (ORDER BY ... ROWS ...)` and `OVER (ORDER BY ... RANGE ...)`?
28. How would you handle a many-to-many relationship between `students` and `courses` with a `grades` table? Write the schema and a query to find students who took all courses in the 'Math' department.
29. Explain the N+1 query problem in the context of SQL and how JOINs or batch queries solve it.
30. Write a query using `LATERAL JOIN` (or `CROSS APPLY`) to get the 2 most recent orders per customer.

### Scenario-Based

31. You have a table with 10 million rows and a query using `OFFSET 5000000 LIMIT 10` that is extremely slow. Propose two alternative approaches.
32. A report query joining 5 tables returns 10x more rows than expected. What is the likely cause and how do you diagnose it?
33. You need to update the salary of all employees in the 'Engineering' department by 10%. Write the query for PostgreSQL, MySQL, and SQL Server.
34. A production query using `NOT IN` with a nullable subquery column is returning zero rows unexpectedly. Explain why and provide a fix.
35. You need to deduplicate a table keeping only the most recent row per `user_id`. Write the query.
36. A `LEFT JOIN` query is returning fewer rows than expected. Walk through your debugging steps.
37. You have a table of user login timestamps and need to find users who haven't logged in for 30+ days.
38. Design a query to find the top 3 products by revenue in each category for the last quarter.
39. You need to generate a calendar table for the year 2024 including all dates. Write the query for PostgreSQL and SQL Server.
40. A query performs well with 100K rows but degrades at 10M rows. What are the first things you check?

### Tricky

41. What is the result of this query?

```sql
SELECT 1 WHERE NULL = NULL;
```

42. What is the result of this query?

```sql
SELECT 1 WHERE NULL IN (1, 2, NULL);
```

43. What is the result of this query?

```sql
SELECT COUNT(*) FROM (SELECT DISTINCT NULL UNION ALL SELECT DISTINCT NULL) t;
```

44. What is the result of this query?

```sql
SELECT
  CASE WHEN NULL = NULL THEN 'equal' ELSE 'not equal' END;
```

45. What is the result of this query?

```sql
SELECT
  CASE WHEN NULL IS NULL THEN 'yes' ELSE 'no' END;
```

46. What is the result of this query?

```sql
SELECT * FROM (
  SELECT 1 AS a UNION SELECT 2 UNION SELECT 3
) t
WHERE a NOT IN (SELECT 1 FROM (SELECT 1 UNION SELECT NULL) t2);
```

47. What is the result of this query?

```sql
SELECT
  SUM(CASE WHEN x > 0 THEN 1 ELSE 0 END) AS positive,
  SUM(CASE WHEN x <= 0 THEN 1 ELSE 0 END) AS non_positive
FROM (SELECT 1 AS x UNION SELECT NULL UNION SELECT -1) t;
```

48. What is the result of this query?

```sql
SELECT
  DENSE_RANK() OVER (ORDER BY salary) AS drnk,
  RANK() OVER (ORDER BY salary) AS rnk
FROM (SELECT 50 AS salary UNION SELECT 50 UNION SELECT 100) t;
```

### Output Prediction

49. Predict the output:

```sql
SELECT
  d.dept_name,
  COUNT(e.emp_id) AS emp_count
FROM departments d
LEFT JOIN employees e ON d.dept_id = e.dept_id
GROUP BY d.dept_name
ORDER BY emp_count DESC;
```

50. Predict the output:

```sql
SELECT
  customer_id,
  COUNT(*) AS order_count,
  SUM(total_amount) AS total_spent
FROM orders
WHERE customer_id IS NOT NULL
GROUP BY customer_id
HAVING SUM(total_amount) > 300
ORDER BY total_spent DESC;
```

### Debugging

51. This query is supposed to show each employee's department name but returns fewer rows than expected. What's wrong?

```sql
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
WHERE d.dept_name IS NOT NULL;
```

52. This query to find customers with no orders returns zero rows even though some customers have never ordered. What's wrong?

```sql
SELECT c.customer_id
FROM customers c
WHERE c.customer_id NOT IN (SELECT customer_id FROM orders);
```

53. This query is running a full table scan on a 5M-row table even though there's an index on `order_date`. Why?

```sql
SELECT * FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2024;
```

54. This `LEFT JOIN` query is behaving like an `INNER JOIN`. Why?

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id
WHERE d.dept_name = 'Engineering';
```

### Performance

55. You have two approaches for "top 1 order per customer":
   - Approach A: `GROUP BY customer_id, MAX(order_date)`
   - Approach B: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC)`
   
   Discuss the tradeoffs.

56. Compare the performance implications of `COUNT(DISTINCT col)` vs `COUNT(*)` on a 100M-row table.

57. You need to paginate through 1 million records. Compare `OFFSET 500000 LIMIT 20` vs keyset pagination. What index would you create for keyset pagination?

58. A query joining 3 tables returns slowly. You examine the execution plan and see a nested loop on the largest table. What could be wrong, and what might fix it?

59. You have a `WHERE status IN ('active', 'pending')` filter. The table has an index on `status` but the query still scans the full table. What could be the cause?

60. Discuss when you would use a materialized view vs a regular view vs a CTE for a frequently-run analytical query.

---

## Quick Reference: Common Patterns at a Glance

| Pattern                     | Technique                           | Key Consideration              |
|-----------------------------|-------------------------------------|--------------------------------|
| Latest row per group        | ROW_NUMBER + PARTITION BY           | Handle ties with tiebreaker    |
| Running total               | SUM() OVER (ORDER BY ... ROWS ...)  | Specify frame clause           |
| Percentage of total         | SUM() OVER () / value               | Use 100.0 not 100              |
| Deduplication               | ROW_NUMBER() WHERE rn = 1           | Define ordering carefully      |
| Gap detection               | ROW_NUMBER + arithmetic on ID       | Assumes no gaps in source IDs  |
| Islands                     | date - ROW_NUMBER trick             | Works for dates and sequences  |
| Pivoting                    | CASE + GROUP BY                     | Dynamic columns need dynamic SQL|
| Top N per group             | ROW_NUMBER/RANK + subquery          | Decide: ties or no ties        |
| Check existence             | EXISTS / NOT EXISTS                 | NULL-safe, often efficient     |
| Null-safe comparison        | IS NOT DISTINCT FROM                | DB-specific syntax             |
| Avoid division by zero      | NULLIF(denominator, 0)              | Returns NULL, not error        |
| Exclude NULLs safely        | IS NOT NULL or NOT EXISTS           | Never NOT IN with NULLs        |
| Calendar/date series        | Recursive CTE or generate_series    | generate_series is faster (PG) |
| Hierarchical traversal      | Recursive CTE                       | Watch for infinite loops       |
| Pagination (large offsets)  | Keyset / cursor-based               | Requires unique ordered column |

---

*Cross-references: See NULL section for Three-Valued Logic, JOIN section for fan-out and duplication, Window Functions section for frame clause details, Indexes section for sargability deep dive, EXPLAIN section for reading execution plans.*
