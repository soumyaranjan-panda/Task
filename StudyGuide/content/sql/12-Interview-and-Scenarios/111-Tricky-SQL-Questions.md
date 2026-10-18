# Tricky SQL Questions

## Why SQL Questions Are Tricky

SQL questions are tricky because they exploit the gap between **intuition** and **set-based logic**. Humans think in loops and steps; SQL engines think in sets. Additionally, NULL behavior, implicit type conversion, join semantics, and aggregation rules create many traps that even experienced developers fall into.

This section covers the most common tricky patterns, why they exist, how to reason through them, and how to avoid pitfalls.

---

## Sample Tables and Data

All examples in this section use the following tables.

### Table: `employees`

| id | name         | department_id | salary | manager_id | hire_date  |
|----|--------------|---------------|--------|------------|------------|
| 1  | Alice        | 1             | 90000  | NULL       | 2019-01-15 |
| 2  | Bob          | 1             | 80000  | 1          | 2020-03-22 |
| 3  | Carol        | 2             | 75000  | 1          | 2020-06-10 |
| 4  | Dave         | 2             | 75000  | 3          | 2021-01-05 |
| 5  | Eve          | NULL          | 60000  | NULL       | 2021-09-12 |
| 6  | Frank        | 3             | 95000  | NULL       | 2018-11-30 |
| 7  | Grace        | NULL          | NULL   | 6          | 2022-04-01 |

**Grain:** One row = one employee.

### Table: `departments`

| id | name      | budget  |
|----|-----------|---------|
| 1  | Engineering | 500000 |
| 2  | Marketing   | 300000 |
| 3  | Sales       | 400000 |

**Grain:** One row = one department.

### Table: `orders`

| id | customer_id | order_date | total_amount |
|----|-------------|------------|--------------|
| 1  | 101         | 2023-01-05 | 250.00       |
| 2  | 102         | 2023-01-15 | 180.50       |
| 3  | 101         | 2023-02-10 | 320.00       |
| 4  | 103         | 2023-02-14 | NULL         |
| 5  | 101         | 2023-03-01 | 90.00        |

**Grain:** One row = one order.

### Table: `order_items`

| id | order_id | product_id | quantity | price |
|----|----------|------------|----------|-------|
| 1  | 1        | 10         | 2        | 50.00 |
| 2  | 1        | 20         | 1        | 150.00|
| 3  | 2        | 10         | 1        | 50.00 |
| 4  | 2        | 30         | 2        | 65.25 |
| 5  | 3        | 20         | 2        | 150.00|
| 6  | 3        | 10         | 1        | 50.00 |
| 7  | 4        | 40         | 1        | 99.99 |
| 8  | 5        | 10         | 1        | 50.00 |

**Grain:** One row = one line item in an order.

---

## TRAP 1: NULL Arithmetic

### The Problem

Any arithmetic involving NULL produces NULL.

```sql
SELECT 10 + NULL AS result;
-- Result: NULL (not 10)
```

### Why It Exists

NULL means "unknown." If one operand is unknown, the result is unknown.

### Common Mistake

```sql
-- BAD: Expects 0 for NULL bonus
SELECT salary + bonus AS total_compensation
FROM employees;
-- If bonus IS NULL, total_compensation = NULL, not salary
```

### Better Approach

```sql
-- GOOD: Use COALESCE to handle NULL
SELECT salary + COALESCE(bonus, 0) AS total_compensation
FROM employees;
```

### NULL Behavior in Comparisons

| Expression      | Result   |
|-----------------|----------|
| `NULL = NULL`   | NULL (not TRUE) |
| `NULL <> NULL`  | NULL (not TRUE) |
| `NULL > 5`      | NULL     |
| `NULL < 5`      | NULL     |
| `NULL = 5`      | NULL     |
| `5 = NULL`      | NULL     |
| `NULL IS NULL`  | TRUE     |
| `NULL IS NOT NULL` | FALSE |

> Common misconception: `NULL = NULL` returns TRUE. It does not. Always use `IS NULL` or `IS DISTINCT FROM` (PostgreSQL) / `ISNULL()` (SQL Server) / `NVL()` (Oracle) for NULL-safe equality.

---

## TRAP 2: COUNT(*) vs COUNT(column)

### The Problem

`COUNT(*)` counts all rows including NULLs. `COUNT(column)` counts only non-NULL values.

```sql
SELECT
  COUNT(*)          AS count_star,
  COUNT(salary)     AS count_salary,
  COUNT(department_id) AS count_dept
FROM employees;
```

| count_star | count_salary | count_dept |
|------------|--------------|------------|
| 7          | 6            | 5          |

### Why It Exists

`COUNT(column)` silently excludes NULLs. This is by design but often unexpected.

### When to Use Each

| Use Case | Formula |
|----------|---------|
| Count all rows | `COUNT(*)` |
| Count non-NULL values | `COUNT(column)` |
| Count distinct values | `COUNT(DISTINCT column)` |
| Count NULLs | `COUNT(*) - COUNT(column)` |

### Interview Trap

> "How many employees have no department?"

```sql
-- BAD: This counts employees WITH a department
SELECT COUNT(department_id) FROM employees;

-- GOOD
SELECT COUNT(*) FROM employees WHERE department_id IS NULL;
```

---

## TRAP 3: NOT IN with NULLs

### The Problem

`NOT IN` returns no rows if the subquery contains any NULL.

```sql
-- Assume department_id values in employees: {1, 2, NULL, 3, NULL}

-- BAD: Returns EMPTY result if subquery has NULL
SELECT *
FROM employees
WHERE department_id NOT IN (SELECT id FROM departments WHERE id > 1);
-- If departments has id NULL, the entire NOT IN returns nothing
```

### Why It Exists

`NOT IN` expands to a series of `<>` comparisons. If any value is NULL:

```sql
-- NOT IN (1, NULL) expands to:
WHERE x <> 1 AND x <> NULL
-- x <> NULL is always NULL, so the entire AND becomes FALSE/NULL
```

### Better Approach

```sql
-- GOOD: Use NOT EXISTS (handles NULLs safely)
SELECT e.*
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.id > 1 AND d.id = e.department_id
);
```

### Comparison Table

| Approach | NULL Safe? | Readability | Performance |
|----------|------------|-------------|-------------|
| `NOT IN` | No | Good | Depends |
| `NOT EXISTS` | Yes | Moderate | Often good with correlation |
| `LEFT JOIN ... WHERE NULL` | Yes | Moderate | Depends |

> Interview trap: `NOT IN` with a subquery that *might* return NULLs is a classic trap. Always verify NULL presence or use `NOT EXISTS`.

---

## TRAP 4: LEFT JOIN Becoming INNER JOIN

### The Problem

Placing a condition on the right table in the `WHERE` clause instead of `ON` filters out NULLs from the LEFT JOIN, effectively converting it to an INNER JOIN.

```sql
-- BAD: WHERE on right table kills LEFT JOIN behavior
SELECT e.name, d.name AS dept_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE d.name = 'Engineering';
-- Returns only employees IN the Engineering department
-- NULLs from unmatched employees are filtered out
```

### Better Approach

```sql
-- GOOD: Condition in ON preserves LEFT JOIN
SELECT e.name, d.name AS dept_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id AND d.name = 'Engineering';
```

### ON vs WHERE Summary

| Condition Location | Effect on LEFT JOIN |
|--------------------|---------------------|
| `ON` (left table) | Filters BEFORE join; unmatched right rows remain as NULL |
| `ON` (right table) | Filters right table before join; unmatched left rows preserved |
| `WHERE` (right table) | Filters AFTER join; unmatched rows removed → INNER JOIN |
| `WHERE` (left table) | Filters joined result |

### Example Output

```sql
-- LEFT JOIN with ON only (correct)
SELECT e.name, d.name AS dept_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Engineering |
| Carol | Marketing   |
| Dave  | Marketing   |
| Eve   | NULL        |
| Frank | Sales       |
| Grace | NULL        |

```sql
-- LEFT JOIN with WHERE on right table (wrong - becomes INNER JOIN)
SELECT e.name, d.name AS dept_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE d.name = 'Engineering';
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Engineering |

---

## TRAP 5: GROUP BY and SELECT Mismatch

### The Problem

In strict SQL mode (PostgreSQL, SQL Server, MySQL with `ONLY_FULL_GROUP_BY`), every non-aggregated column in `SELECT` must appear in `GROUP BY`.

```sql
-- BAD: name not in GROUP BY (PostgreSQL will reject this)
SELECT department_id, name, COUNT(*)
FROM employees
GROUP BY department_id;
-- ERROR: column "name" must appear in GROUP BY clause
```

### Why It Exists

When you `GROUP BY department_id`, multiple rows collapse into one. Which `name` should be returned? The database cannot determine this without an aggregate or window function.

### Better Approaches

```sql
-- GOOD: Aggregate the name
SELECT department_id, STRING_AGG(name, ', ') AS employees, COUNT(*)
FROM employees
GROUP BY department_id;
-- PostgreSQL

-- GOOD: Use MIN/MAX if you need one representative name
SELECT department_id, MIN(name) AS first_employee, COUNT(*)
FROM employees
GROUP BY department_id;

-- GOOD: Use window function to keep individual rows
SELECT
  department_id,
  name,
  COUNT(*) OVER (PARTITION BY department_id) AS dept_count
FROM employees;
```

### MySQL Specific

> MySQL with `ONLY_FULL_GROUP_BY` disabled allows this but returns an **indeterminate** value for `name`. This is dangerous in production.

---

## TRAP 6: HAVING Without GROUP BY

### The Problem

`HAVING` without `GROUP BY` treats the entire result set as one group.

```sql
-- This works but is often unexpected
SELECT department_id, COUNT(*)
FROM employees
HAVING COUNT(*) > 3;
-- Returns nothing (no department has > 3 employees)
```

### When to Use HAVING Without GROUP BY

Useful for filtering based on aggregate conditions across the entire table:

```sql
-- Find departments where average salary exceeds company average
SELECT department_id, AVG(salary) AS avg_sal
FROM employees
GROUP BY department_id
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);
```

### WHERE vs HAVING

| Clause | Filters | Timing |
|--------|---------|--------|
| `WHERE` | Individual rows | Before grouping |
| `HAVING` | Groups | After grouping |

```sql
-- BAD: Can't use aggregate in WHERE
SELECT department_id, COUNT(*)
FROM employees
WHERE COUNT(*) > 2
GROUP BY department_id;
-- ERROR

-- GOOD
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 2;
```

---

## TRAP 7: Subquery Returns Multiple Rows

### The Problem

Using a scalar subquery where it expects one row.

```sql
-- BAD: Subquery may return multiple rows
SELECT *
FROM employees
WHERE department_id = (SELECT id FROM departments WHERE budget > 300000);
-- ERROR: more than one row returned by subquery
```

### Better Approach

```sql
-- GOOD: Use IN for multiple possible values
SELECT *
FROM employees
WHERE department_id IN (SELECT id FROM departments WHERE budget > 300000);

-- GOOD: Use ANY/SOME
SELECT *
FROM employees
WHERE department_id = ANY (SELECT id FROM departments WHERE budget > 300000);

-- GOOD: Use EXISTS
SELECT e.*
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.budget > 300000 AND d.id = e.department_id
);
```

---

## TRAP 8: Accidental Cartesian Product

### The Problem

Missing a join condition creates a Cartesian product (cross join).

```sql
-- BAD: Missing ON clause or WHERE condition
SELECT e.name, d.name AS dept_name, o.total_amount
FROM employees e, departments d, orders o;
-- Returns 7 × 3 × 5 = 105 rows!
```

### Why It Exists

The comma syntax (`FROM a, b`) is equivalent to `CROSS JOIN`. Without a filter, every row combines with every other row.

### Better Approach

```sql
-- GOOD: Always use explicit JOIN with ON
SELECT e.name, d.name AS dept_name, o.total_amount
FROM employees e
JOIN departments d ON e.department_id = d.id
JOIN orders o ON o.customer_id = e.id;
```

### How to Detect

If your query returns far more rows than expected, suspect a Cartesian product. Use `EXPLAIN` to verify the join type.

---

## TRAP 9: Duplicate Rows from One-to-Many JOINs

### The Problem

When joining a one-to-many relationship, the "one" side rows are duplicated for each matching "many" side row. Aggregating the "one" side values produces inflated results.

```sql
-- BAD: Frank appears once per order item, inflating the count
SELECT e.name, COUNT(o.id) AS order_count
FROM employees e
LEFT JOIN orders o ON o.customer_id = e.id
GROUP BY e.name;
```

### Why It Happens

If customer 101 has 3 orders with 2, 3, and 1 items respectively, a join through `order_items` multiplies the employee row.

```sql
-- BAD: Double counting
SELECT e.name, SUM(oi.quantity) AS total_quantity
FROM employees e
JOIN orders o ON o.customer_id = e.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY e.name;
```

### Better Approaches

```sql
-- GOOD: Pre-aggregate before joining
SELECT e.name, sub.total_quantity
FROM employees e
LEFT JOIN (
    SELECT o.customer_id, SUM(oi.quantity) AS total_quantity
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.customer_id
) sub ON sub.customer_id = e.id;

-- GOOD: Use EXISTS for counting (no join duplication)
SELECT
  e.name,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = e.id) AS order_count
FROM employees e;
```

### Fan-Out Detection

If joining three or more tables, verify each join does not multiply rows unnecessarily. Use:

```sql
SELECT
  (SELECT COUNT(*) FROM employees) AS emp_count,
  (SELECT COUNT(*) FROM orders) AS order_count,
  (SELECT COUNT(*) FROM order_items) AS item_count,
  (SELECT COUNT(*) FROM employees e
   JOIN orders o ON o.customer_id = e.id
   JOIN order_items oi ON oi.order_id = o.id) AS joined_count;
-- If joined_count >> item_count, fan-out is occurring
```

---

## TRAP 10: Implicit Type Conversion

### The Problem

Comparing values of different types forces implicit conversion, which can bypass indexes and produce incorrect results.

```sql
-- BAD: Comparing string to integer
SELECT * FROM orders WHERE customer_id = '101';
-- May work but can bypass index

-- BAD: Comparing with wrong format
SELECT * FROM orders WHERE order_date = '2023-01-05';
-- In some databases, DATE vs DATETIME comparison is tricky
```

### Why It Exists

Databases attempt automatic type conversion. MySQL in particular performs aggressive implicit conversion, often without warning.

### Better Approach

```sql
-- GOOD: Use proper types and explicit casting
SELECT * FROM orders WHERE customer_id = 101;
SELECT * FROM orders WHERE order_date >= '2023-01-05' AND order_date < '2023-01-06';
```

### Database Differences

| Database | Implicit Conversion Behavior |
|----------|------------------------------|
| PostgreSQL | Strict; throws error on type mismatch |
| MySQL | Aggressive; may convert strings to numbers silently |
| SQL Server | Moderate; may convert and bypass index |
| Oracle | Strict; may throw ORA-01722 |

---

## TRAP 11: UNION vs UNION ALL

### The Problem

`UNION` removes duplicates (requires sorting/hash), `UNION ALL` does not.

```sql
-- SLOW: UNION deduplicates
SELECT department_id FROM employees
UNION
SELECT department_id FROM departments;

-- FAST: UNION ALL keeps all rows including duplicates
SELECT department_id FROM employees
UNION ALL
SELECT department_id FROM departments;
```

### When to Use Each

| Use Case | Operator |
|----------|----------|
| You need distinct combined results | `UNION` |
| You know results are distinct or duplicates are fine | `UNION ALL` |
| Performance is critical and duplicates don't matter | `UNION ALL` |

### Production Pitfall

> Always prefer `UNION ALL` unless you specifically need deduplication. The deduplication cost can be significant on large datasets.

---

## TRAP 12: Window Functions vs GROUP BY

### The Problem

Window functions compute across rows **without collapsing** them. GROUP BY collapses rows.

```sql
-- GROUP BY: collapses to one row per department
SELECT department_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id;

-- Window function: keeps all rows, adds aggregate
SELECT
  name,
  department_id,
  salary,
  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg_salary
FROM employees;
```

| name  | department_id | salary | dept_avg_salary |
|-------|---------------|--------|-----------------|
| Alice | 1             | 90000  | 85000           |
| Bob   | 1             | 80000  | 85000           |
| Carol | 2             | 75000  | 75000           |
| Dave  | 2             | 75000  | 75000           |
| Eve   | NULL          | 60000  | 60000           |
| Frank | 3             | 95000  | 95000           |
| Grace | NULL          | NULL   | 60000           |

### Common Mistake

Using GROUP BY when you need window functions:

```sql
-- BAD: You lose individual rows
SELECT department_id, AVG(salary)
FROM employees
GROUP BY department_id;

-- GOOD: You keep individual rows AND get department average
SELECT
  name,
  salary,
  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg
FROM employees;
```

---

## TRAP 13: EXISTS vs IN Performance Assumptions

### The Problem

Many developers assume one is always faster than the other. **Neither is universally faster.**

```sql
-- EXISTS variant
SELECT e.*
FROM employees e
WHERE EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = e.department_id AND d.budget > 300000
);

-- IN variant
SELECT *
FROM employees
WHERE department_id IN (
    SELECT id FROM departments WHERE budget > 300000
);
```

### What Determines Performance

| Factor | Impact |
|--------|--------|
| Optimizer | Each database optimizes differently |
| Indexes | EXISTS often benefits from index on correlated column |
| Cardinality | Small subquery → IN may be faster; large → EXISTS may be better |
| Data distribution | Skewed data affects plan choice |
| Statistics | Outdated stats lead to poor plan choice |

### When to Prefer Each

| Scenario | Often Better | Why |
|----------|--------------|-----|
| Subquery returns few rows | `IN` | Simple lookup |
| Subquery returns many rows | `EXISTS` | Short-circuits on first match |
| NULLs possible in subquery | `EXISTS` | NULL-safe |
| Correlation is selective | `EXISTS` | Can use index efficiently |

> Always verify with `EXPLAIN ANALYZE` rather than guessing.

---

## TRAP 14: Pagination with OFFSET

### The Problem

OFFSET-based pagination degrades on large offsets.

```sql
-- SLOW for large page numbers
SELECT * FROM orders
ORDER BY id
LIMIT 10 OFFSET 100000;
-- Database must scan and skip 100000 rows
```

### Better Approach: Keyset Pagination

```sql
-- FAST: uses index directly
SELECT * FROM orders
WHERE id > 100000
ORDER BY id
LIMIT 10;
```

### Comparison

| Method | Large Offset Performance | Random Access | Implementation |
|--------|--------------------------|---------------|----------------|
| OFFSET | Degrades | Easy | Simple |
| Keyset | Constant | Sequential only | Requires composite index |

### Keyset Pagination Requirements

1. Must have a stable sort column (or composite)
2. Must use `>` or `<` (not `OFFSET`)
3. The sort column must be indexed

```sql
-- Composite keyset pagination
SELECT * FROM orders
WHERE (order_date, id) > ('2023-01-05', 1000)
ORDER BY order_date, id
LIMIT 10;
```

> Production pitfall: OFFSET pagination on tables with millions of rows is a common performance killer. Use keyset pagination for API pagination.

---

## TRAP 15: Self-Join Pitfalls

### The Problem

Self-joins require aliases and can easily produce unintended results.

```sql
-- BAD: Missing join condition → Cartesian product
SELECT e.name AS employee, m.name AS manager
FROM employees e, employees m;

-- BAD: Incorrect join condition
SELECT e.name, m.name
FROM employees e
JOIN employees m ON e.manager_id = m.id;
-- Returns NULL for employees with no manager (correct behavior, but verify)
```

### Correct Self-Join

```sql
-- GOOD
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

| employee | manager |
|----------|---------|
| Alice    | NULL    |
| Bob      | Alice   |
| Carol    | Alice   |
| Dave     | Carol   |
| Eve      | NULL    |
| Frank    | NULL    |
| Grace    | Frank   |

---

## TRAP 16: DELETE vs TRUNCATE vs DROP

| Feature | DELETE | TRUNCATE | DROP |
|---------|--------|----------|------|
| Type | DML | DDL | DDL |
| WHERE clause | Yes | No | No |
| Rollback | Yes (in transaction) | Depends* | Depends* |
| Triggers | Fires | Does not fire | Does not fire |
| Identity reset | No | Yes | Yes |
| Space release | Not immediately | Immediately | Immediately |
| Speed | Slower (row-by-row) | Faster | Fastest |

\* In PostgreSQL, TRUNCATE and DROP can be rolled back within a transaction. In MySQL, DDL causes implicit commit.

> Production pitfall: Running `DELETE FROM large_table` without a WHERE clause is extremely slow and locks rows. Use `TRUNCATE` if you intend to remove all rows.

---

## TRAP 17: Date and Timestamp Traps

### The Problem

Date comparisons can silently include or exclude rows based on time components.

```sql
-- BAD: May miss orders with time components
SELECT * FROM orders WHERE order_date = '2023-01-05';

-- If order_date is TIMESTAMP and a row is '2023-01-05 14:30:00',
-- this comparison depends on database behavior
```

### Better Approach

```sql
-- GOOD: Use range comparison
SELECT * FROM orders
WHERE order_date >= '2023-01-05' AND order_date < '2023-01-06';

-- GOOD: Cast to date
SELECT * FROM orders
WHERE DATE(order_date) = '2023-01-05';
-- Note: This may prevent index usage (non-sargable)
```

### Timezone Pitfalls

```sql
-- PostgreSQL
SELECT NOW();           -- Returns timezone
SELECT CURRENT_DATE;   -- Returns date only

-- MySQL
SELECT NOW();           -- Returns datetime without timezone
SELECT UTC_TIMESTAMP(); -- UTC time

-- SQL Server
SELECT GETDATE();       -- Local time
SELECT GETUTCDATE();    -- UTC time
```

> Production pitfall: Storing timestamps without timezone information creates ambiguity. Always store as UTC and convert on display.

---

## TRAP 18: DISTINCT as a Band-Aid

### The Problem

Using `DISTINCT` to fix join duplication hides the underlying issue.

```sql
-- BAD: DISTINCT hides fan-out problem
SELECT DISTINCT e.name, d.name AS dept_name
FROM employees e
JOIN orders o ON o.customer_id = e.id
JOIN order_items oi ON oi.order_id = o.id
JOIN departments d ON d.id = e.department_id;
```

### Why This Is Dangerous

1. The query still performs the full join (expensive)
2. `DISTINCT` adds a sort/hash step (more expensive)
3. You may be hiding legitimate data issues

### Better Approach

```sql
-- GOOD: Pre-aggregate to avoid fan-out
SELECT e.name, d.name AS dept_name, SUM(oi.quantity) AS total_qty
FROM employees e
JOIN departments d ON d.id = e.department_id
JOIN orders o ON o.customer_id = e.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY e.name, d.name;
```

> Common misconception: `DISTINCT` is not free. It requires a sort or hash operation and can significantly impact performance on large result sets.

---

## TRAP 19: Integer Division

### The Problem

Dividing two integers may truncate the decimal part.

```sql
-- PostgreSQL: Returns decimal
SELECT 5 / 2;          -- 2.5

-- SQL Server: Returns integer
SELECT 5 / 2;          -- 2

-- MySQL: Returns integer
SELECT 5 / 2;          -- 2.5000 (with / operator)
SELECT 5 DIV 2;        -- 2 (integer division)
```

### Better Approach

```sql
-- GOOD: Cast to decimal/float
SELECT 5::decimal / 2;          -- PostgreSQL: 2.5000000000000000
SELECT CAST(5 AS FLOAT) / 2;   -- SQL Server: 2.5
SELECT 5 / 2.0;                -- MySQL: 2.5000
```

### Database Comparison

| Expression | PostgreSQL | MySQL | SQL Server | Oracle |
|------------|------------|-------|------------|--------|
| `5 / 2` | 2.5 | 2.5 | 2 | 2.5 |
| `5 / 2.0` | 2.5 | 2.5 | 2.5 | 2.5 |
| `5 DIV 2` | Error | 2 | Error | Error |
| `5 % 2` | 1 | 1 | 1 | Error |

> Oracle uses `MOD(5, 2)` instead of `%`.

---

## TRAP 20: Correlated vs Non-Correlated Subqueries

### The Problem

Correlated subqueries execute once per outer row. Non-correlated execute once.

```sql
-- CORRELATED: Executes once per employee (potentially slow)
SELECT e.name,
  (SELECT d.name FROM departments d WHERE d.id = e.department_id) AS dept_name
FROM employees e;

-- NON-CORRELATED: Executes once
SELECT e.name, d.name AS dept_name
FROM employees e
JOIN departments d ON d.id = e.department_id;
```

### When Correlated Is Appropriate

```sql
-- Finding employees with above-department-average salary
SELECT e.name, e.salary
FROM employees e
WHERE e.salary > (
    SELECT AVG(salary)
    FROM employees e2
    WHERE e2.department_id = e.department_id
);
```

### When to Prefer JOIN

```sql
-- GOOD: Use JOIN with window function for same result
SELECT name, salary
FROM (
    SELECT
      name,
      salary,
      AVG(salary) OVER (PARTITION BY department_id) AS dept_avg
    FROM employees
) sub
WHERE salary > dept_avg;
```

---

## TRAP 21: Transactions and Isolation Levels

### The Problem

Without understanding isolation levels, concurrent operations can produce dirty reads, non-repeatable reads, or phantom reads.

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-----------------|------------|---------------------|--------------|
| READ UNCOMMITTED | Yes | Yes | Yes |
| READ COMMITTED | No | Yes | Yes |
| REPEATABLE READ | No | No | Yes* |
| SERIALIZABLE | No | No | No |

\* In PostgreSQL, REPEATABLE READ actually prevents phantom reads via MVCC.

### Common Scenario

```sql
-- Session 1
BEGIN;
UPDATE employees SET salary = 100000 WHERE id = 1;
-- Not committed yet

-- Session 2 (with READ UNCOMMITTED)
SELECT salary FROM employees WHERE id = 1;
-- May see 100000 (dirty read)
```

### Production Recommendations

| Database | Default Isolation | Recommended |
|----------|-------------------|-------------|
| PostgreSQL | READ COMMITTED | READ COMMITTED or SERIALIZABLE |
| MySQL (InnoDB) | REPEATABLE READ | REPEATABLE READ |
| SQL Server | READ COMMITTED | READ COMMITTED |
| Oracle | READ COMMITTED | READ COMMITTED |

---

## TRAP 22: SELECT * in Production

### The Problem

`SELECT *` returns all columns, including those not needed.

```sql
-- BAD
SELECT * FROM employees WHERE department_id = 1;

-- GOOD
SELECT name, salary FROM employees WHERE department_id = 1;
```

### Why It Matters

1. **Performance**: Unnecessary data transfer and memory usage
2. **Index usage**: May prevent covering index usage
3. **Schema changes**: Code breaks if columns are added/removed
4. **Network**: Larger result sets over the network

> Production pitfall: Using `SELECT *` in application code is a maintenance hazard. Schema changes can break queries silently.

---

## TRAP 23: SARGability

### The Problem

Non-SARGable predicates prevent index usage.

```sql
-- NON-SARGABLE: Function on column
SELECT * FROM orders WHERE YEAR(order_date) = 2023;

-- SARGABLE: Range on column
SELECT * FROM orders
WHERE order_date >= '2023-01-01' AND order_date < '2024-01-01';

-- NON-SARGABLE: Leading wildcard
SELECT * FROM employees WHERE name LIKE '%alice';

-- SARGABLE: Trailing wildcard (can use index)
SELECT * FROM employees WHERE name LIKE 'alice%';
```

### SARGable Predicates

| Predicate | SARGable? | Index Usable? |
|-----------|-----------|---------------|
| `WHERE col = 5` | Yes | Yes |
| `WHERE col + 1 = 5` | No | No |
| `WHERE YEAR(col) = 2023` | No | No |
| `WHERE col >= '2023-01-01'` | Yes | Yes |
| `WHERE col LIKE '%x'` | No | No |
| `WHERE col LIKE 'x%'` | Yes | Yes |
| `WHERE UPPER(col) = 'X'` | No | No* |
| `WHERE col = UPPER('x')` | Yes | Yes |

\* Unless a functional index exists (PostgreSQL, Oracle).

> Always verify with `EXPLAIN` whether your predicates are SARGable.

---

## TRAP 24: RANK vs DENSE_RANK vs ROW_NUMBER

### The Problem

These window functions handle ties differently.

```sql
SELECT
  name,
  department_id,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS row_num,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank_val,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dense_rank_val
FROM employees
WHERE department_id = 1;
```

| name  | department_id | salary | row_num | rank_val | dense_rank_val |
|-------|---------------|--------|---------|----------|----------------|
| Alice | 1             | 90000  | 1       | 1        | 1              |
| Bob   | 1             | 80000  | 2       | 2        | 2              |

### When Ties Exist

```sql
-- If Alice and Bob both earned 90000:
-- ROW_NUMBER: 1, 2 (arbitrary tiebreak)
-- RANK: 1, 1 (skips next: 3)
-- DENSE_RANK: 1, 1 (no skip: 2)
```

| Function | Ties | Gaps After Ties |
|----------|------|-----------------|
| ROW_NUMBER | Arbitrary | Never |
| RANK | Same number | Yes (skips) |
| DENSE_RANK | Same number | No (no skip) |

### Common Mistake

Using `ROW_NUMBER` when you need `RANK`:

```sql
-- BAD: Loses tie information
SELECT * FROM (
  SELECT name, salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn
  FROM employees
) sub WHERE rn = 1;
-- Only returns one row even if two employees tie for highest salary

-- GOOD: Returns all tied rows
SELECT * FROM (
  SELECT name, salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) sub WHERE rnk = 1;
```

---

## TRAP 25: Boolean Expression Traps

### The Problem

Different databases handle boolean logic differently.

```sql
-- PostgreSQL: native BOOLEAN
SELECT * FROM employees WHERE is_active = TRUE;

-- MySQL: no native BOOLEAN (TINYINT)
SELECT * FROM employees WHERE is_active = 1;

-- SQL Server: no native BOOLEAN
SELECT * FROM employees WHERE is_active = 1;

-- Oracle: no native BOOLEAN
SELECT * FROM employees WHERE is_active = 'Y';
```

### NULL in Boolean Context

```sql
-- If is_active IS NULL:
WHERE is_active = TRUE    -- NULL (not TRUE)
WHERE is_active = FALSE   -- NULL (not TRUE)
WHERE is_active IS TRUE   -- FALSE
WHERE is_active IS NULL   -- TRUE
```

---

## TRAP 26: Coalesce and Nullif Edge Cases

### COALESCE

```sql
-- Returns first non-NULL value
SELECT COALESCE(NULL, NULL, 3, 4);  -- 3
SELECT COALESCE(NULL, NULL, NULL);  -- NULL

-- Useful for defaults
SELECT COALESCE(salary, 0) FROM employees;
```

### NULLIF

```sql
-- Returns NULL if two values are equal
SELECT NULLIF(5, 5);   -- NULL
SELECT NULLIF(5, 3);   -- 5

-- Useful to prevent division by zero
SELECT salary / NULLIF(department_count, 0) AS per_employee_budget
FROM departments;
```

### Combined Pattern

```sql
-- Safe division with default
SELECT
  COALESCE(
    salary / NULLIF(department_count, 0),
    0
  ) AS per_employee_budget
FROM departments;
```

---

## TRAP 27: Index Myths

### Common Myths

| Myth | Reality |
|------|---------|
| "Indexes always speed up queries" | Indexes slow down writes and may not help read queries |
| "More indexes = faster" | Too many indexes waste space and slow writes |
| "Composite index works for any column subset" | Leftmost prefix rule applies |
| "Primary key index is always optimal" | Clustered index may not match query pattern |
| "Covering index eliminates table access" | Only if ALL needed columns are in the index |

### Composite Index Column Order

For index `(a, b, c)`:

| Query | Uses Index? |
|-------|-------------|
| `WHERE a = 1` | Yes |
| `WHERE a = 1 AND b = 2` | Yes |
| `WHERE a = 1 AND b = 2 AND c = 3` | Yes |
| `WHERE b = 2` | No (skips `a`) |
| `WHERE b = 2 AND c = 3` | No (skips `a`) |
| `WHERE a = 1 AND c = 3` | Partially (only `a` portion) |

> Always verify with `EXPLAIN` whether your index is actually being used.

---

## TRAP 28: Recursive CTE Pitfalls

### The Problem

Recursive CTEs can produce infinite loops if the recursion condition is not properly bounded.

```sql
-- DANGEROUS: No termination condition
WITH RECURSIVE cte AS (
  SELECT id, manager_id, name
  FROM employees
  UNION ALL
  SELECT e.id, e.manager_id, e.name
  FROM employees e
  JOIN cte ON e.manager_id = cte.id
)
SELECT * FROM cte;
-- May loop infinitely if there's a cycle in manager_id
```

### Better Approach

```sql
-- SAFE: Use a depth limit
WITH RECURSIVE cte AS (
  SELECT id, manager_id, name, 1 AS depth
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.manager_id, e.name, c.depth + 1
  FROM employees e
  JOIN cte c ON e.manager_id = c.id
  WHERE c.depth < 10  -- Safety limit
)
SELECT * FROM cte;
```

> PostgreSQL supports `SEARCH` and `CYCLE` clauses to handle cycles:
> ```sql
> WITH RECURSIVE cte AS (...)
> CYCLE id SET is_cycle USING path
> SEARCH DEPTH FIRST BY name SET order_column;
> ```

---

## TRAP 29: Division by Zero

### The Problem

Different databases handle division by zero differently.

| Database | Behavior |
|----------|----------|
| PostgreSQL | ERROR: division by zero |
| MySQL | NULL (with warning) |
| SQL Server | ERROR: divide by zero |
| Oracle | ERROR: ORA-01476 |

### Prevention

```sql
-- GOOD: Use NULLIF
SELECT salary / NULLIF(department_count, 0) AS avg_per_dept
FROM departments;

-- GOOD: Use CASE
SELECT
  CASE
    WHEN department_count = 0 THEN 0
    ELSE salary / department_count
  END AS avg_per_dept
FROM departments;
```

---

## TRAP 30: INSERT ON CONFLICT / ON DUPLICATE KEY

### The Problem

Handling duplicate key inserts varies by database.

```sql
-- PostgreSQL: ON CONFLICT
INSERT INTO employees (id, name, salary)
VALUES (1, 'Alice', 90000)
ON CONFLICT (id) DO UPDATE SET salary = EXCLUDED.salary;

-- MySQL: ON DUPLICATE KEY
INSERT INTO employees (id, name, salary)
VALUES (1, 'Alice', 90000)
ON DUPLICATE KEY UPDATE salary = VALUES(salary);

-- SQL Server: MERGE
MERGE INTO employees AS target
USING (SELECT 1 AS id, 'Alice' AS name, 90000 AS salary) AS source
ON target.id = source.id
WHEN MATCHED THEN
  UPDATE SET salary = source.salary
WHEN NOT MATCHED THEN
  INSERT (id, name, salary) VALUES (source.id, source.name, source.salary);
```

---

## Summary of Common Patterns

### SQL Reasoning Checklist

Before writing a query, ask:

1. What does one output row represent?
2. What is the grain of each table?
3. Which table is the driving table?
4. Do I need columns from another table?
5. Do I only need to know whether a row exists?
6. Can the JOIN create duplicates?
7. Do I need aggregation?
8. Do I need to preserve individual rows?
9. Do I need a window function?
10. Can NULL affect the result?
11. Do I need WHERE or HAVING?
12. Should a condition go inside ON or WHERE?
13. Could the query accidentally create a Cartesian product?
14. What happens when there are zero matching rows?
15. What happens when there are multiple matching rows?
16. What indexes might help?
17. What does the execution plan say?

### Quick Reference

| Trap | Solution |
|------|----------|
| NULL arithmetic | Use `COALESCE` |
| `COUNT(column)` misses NULLs | Use `COUNT(*)` or explicit `COUNT(COALESCE(col, 0))` |
| `NOT IN` with NULLs | Use `NOT EXISTS` |
| LEFT JOIN becoming INNER JOIN | Put right-table conditions in `ON` |
| GROUP BY mismatch | Add non-aggregated columns to GROUP BY or use window functions |
| Accidental Cartesian | Always use explicit JOIN with ON |
| Fan-out / duplicate rows | Pre-aggregate before joining |
| Implicit type conversion | Use correct types explicitly |
| OFFSET pagination slow | Use keyset pagination |
| `DISTINCT` as band-aid | Fix the underlying join |
| Non-SARGable predicates | Rewrite to be index-friendly |

---

# Interview Questions

## Beginner

1. What is the difference between `WHERE` and `HAVING`?

2. What is the difference between `DELETE` and `TRUNCATE`?

3. What does `COUNT(*)` count versus `COUNT(column)`?

4. Why does `NULL = NULL` return NULL instead of TRUE?

5. What is the difference between `UNION` and `UNION ALL`?

6. What is a primary key? What is a foreign key?

7. What is normalization? Name the first three normal forms.

8. What is the difference between `INNER JOIN` and `LEFT JOIN`?

## Intermediate

9. You have a query with `LEFT JOIN` but it only returns rows that match. What went wrong?

10. Write a query to find employees who earn more than their department's average salary.

11. What is the difference between `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`?

12. Why might `NOT IN (SELECT ...)` return no rows even though the subquery has results?

13. What is a correlated subquery? How does it differ from a non-correlated subquery?

14. Write a query to find the second highest salary without using `LIMIT` or `TOP`.

15. What is the difference between `WHERE` and `ON` in a `LEFT JOIN`?

16. Explain the difference between `IS NULL` and `= NULL`.

## Advanced

17. Write a query to find employees who have the same salary as at least one other employee in the same department.

18. Explain the N+1 query problem in the context of SQL and ORMs.

19. What is a covering index? When would you use one?

20. Write a recursive CTE to find the full management chain for a given employee.

21. Explain why `SELECT *` can be problematic in production queries.

22. What is sargability? Give three examples of non-sargable predicates and their SARGable rewrites.

23. Explain the difference between `READ COMMITTED` and `REPEATABLE READ` isolation levels with examples.

24. Write a query using window functions to calculate a running total of orders by customer.

## Scenario-Based

25. You are given two tables: `logins` (user_id, login_time) and `users` (id, name). Write a query to find users who logged in on 3 or more consecutive days.

26. A report shows total sales per employee are much higher than expected. You suspect a fan-out issue from joins. How would you diagnose and fix it?

27. An API paginates results using `OFFSET 100000 LIMIT 10` and users report it gets slower on later pages. What is the issue and how would you fix it?

28. You need to calculate month-over-month growth rate for each product. Write the query.

29. A query comparing `timestamp` columns returns fewer rows than expected. What could cause this?

30. Write a query to find departments where no employee has a salary above 70000.

## Tricky

31. What does this query return?
```sql
SELECT
  CASE WHEN NULL = NULL THEN 'Equal' ELSE 'Not Equal' END AS result;
```

32. What does this query return?
```sql
SELECT COUNT(*) FROM (SELECT NULL UNION ALL SELECT NULL UNION ALL SELECT 1) t;
```

33. What does this query return?
```sql
SELECT * FROM employees WHERE department_id NOT IN (SELECT id FROM departments);
-- Assume one department has id = NULL
```

34. What is the output?
```sql
SELECT
  10 / 3 AS int_div,
  10.0 / 3 AS decimal_div;
-- Database: SQL Server
```

35. What does this query return?
```sql
SELECT DISTINCT COUNT(*) FROM employees GROUP BY department_id;
```

36. What is wrong with this query?
```sql
SELECT department_id, name, COUNT(*)
FROM employees
WHERE salary > 50000
GROUP BY department_id;
```

37. What happens here?
```sql
SELECT e.name, d.name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE d.budget > 300000;
```

## Output Prediction

38. Given the sample tables, what does this return?
```sql
SELECT e.name, COUNT(o.id) AS order_count
FROM employees e
LEFT JOIN orders o ON o.customer_id = e.id
WHERE e.department_id = 1
GROUP BY e.name;
```

39. Given the sample tables, what does this return?
```sql
SELECT department_id, MAX(salary) - MIN(salary) AS salary_range
FROM employees
GROUP BY department_id
HAVING MAX(salary) - MIN(salary) > 10000;
```

40. Given the sample tables, what does this return?
```sql
SELECT
  e1.name AS emp1,
  e2.name AS emp2,
  e1.department_id
FROM employees e1
JOIN employees e2 ON e1.department_id = e2.department_id AND e1.id < e2.id;
```

## Debugging

41. This query returns more rows than expected. Debug it:
```sql
SELECT e.name, p.product_name, SUM(oi.quantity) AS total_qty
FROM employees e
JOIN orders o ON o.customer_id = e.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
GROUP BY e.name, p.product_name;
```

42. This query returns NULL for `total_compensation`. Fix it:
```sql
SELECT name, salary + bonus AS total_compensation
FROM employees;
```

43. This query throws an error in PostgreSQL. Fix it:
```sql
SELECT department_id, name, AVG(salary)
FROM employees
GROUP BY department_id;
```

44. This query is slow on a table with 10 million rows. Suggest improvements:
```sql
SELECT *
FROM orders
WHERE DATE(order_date) = '2023-01-05'
ORDER BY id
LIMIT 10 OFFSET 1000000;
```

45. This query returns unexpected results. Explain why:
```sql
SELECT e.name, d.name
FROM employees e
LEFT JOIN departments d ON 1=1;
```

## Performance

46. Compare the performance characteristics of these two approaches:
```sql
-- Approach A
SELECT * FROM employees WHERE department_id IN (SELECT id FROM departments WHERE budget > 300000);

-- Approach B
SELECT e.* FROM employees e WHERE EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id AND d.budget > 300000);
```

47. You have an index on `(department_id, salary)`. Which of these queries can use it?
```sql
-- Q1
SELECT * FROM employees WHERE department_id = 1;

-- Q2
SELECT * FROM employees WHERE salary > 50000;

-- Q3
SELECT * FROM employees WHERE department_id = 1 AND salary > 50000;

-- Q4
SELECT * FROM employees WHERE department_id > 1;

-- Q5
SELECT * FROM employees WHERE department_id = 1 ORDER BY salary;
```

48. Explain the performance difference between these pagination approaches:
```sql
-- OFFSET
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 1000000;

-- KEYSET
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 20;
```

49. Which query is more efficient and why?
```sql
-- Query A
SELECT DISTINCT customer_id FROM orders WHERE total_amount > 100;

-- Query B
SELECT customer_id FROM orders WHERE total_amount > 100 GROUP BY customer_id;
```

50. You need to add an index for this query. What index would you create?
```sql
SELECT e.name, e.salary
FROM employees e
WHERE e.department_id = 5 AND e.salary BETWEEN 50000 AND 100000
ORDER BY e.salary;
```
