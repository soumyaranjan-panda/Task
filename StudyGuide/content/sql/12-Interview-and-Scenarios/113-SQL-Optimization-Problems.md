# 113 — SQL Optimization Problems

## Table of Contents

1. [Introduction](#introduction)
2. [Sample Schema](#sample-schema)
3. [Reading Execution Plans](#reading-execution-plans)
4. [Problem Category 1 — Sargability](#problem-category-1--sargability)
5. [Problem Category 2 — JOIN Problems](#problem-category-2--join-problems)
6. [Problem Category 3 — Aggregation Problems](#problem-category-3--aggregation-problems)
7. [Problem Category 4 — Subquery vs JOIN vs EXISTS](#problem-category-4--subquery-vs-join-vs-exists)
8. [Problem Category 5 — Window Functions vs Self-Joins](#problem-category-5--window-functions-vs-self-joins)
9. [Problem Category 6 — Pagination](#problem-category-6--pagination)
10. [Problem Category 7 — Set Operations](#problem-category-7--set-operations)
11. [Problem Category 8 — Data Modification](#problem-category-8--data-modification)
12. [Anti-Patterns and Solutions](#anti-patterns-and-solutions)
13. [Comparison Tables](#comparison-tables)
14. [Best Practices](#best-practices)
15. [Interview Questions](#interview-questions)

---

## Introduction

SQL optimization problems test your ability to write queries that are not only **correct** but also **efficient**. They appear in:

- LeetCode, HackerRank, StrataScratch interviews
- Database design interviews at FAANG-tier companies
- Production code reviews
- Performance tuning engagements

### Why Optimization Matters

| Scenario | Unoptimized | Optimized |
|----------|-------------|-----------|
| 1M rows, full table scan | 2–10 seconds | 0.01–0.1 seconds |
| 100M rows, no index | minutes | milliseconds |
| Multi-join query, wrong order | hours | seconds |

### Types of Optimization Problems

1. **Rewrite** — transform a slow query into a faster one
2. **Identify** — find which of two approaches is faster
3. **Design** — choose the right indexes or schema
4. **Debug** — find why a query is slow using execution plans
5. **Trade-off** — balance correctness, readability, and performance

> Common misconception: "There is one universally fastest way to write every query." In reality, performance depends on the optimizer, indexes, statistics, cardinality, data distribution, query shape, database engine, and execution plan.

---

## Sample Schema

All examples in this section use the following schema. Each table's grain is explicitly stated.

```sql
-- Grain: one row per employee
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    department_id INT,
    salary        DECIMAL(10, 2),
    hire_date     DATE,
    manager_id    INT
);

-- Grain: one row per department
CREATE TABLE departments (
    department_id   INT PRIMARY KEY,
    department_name VARCHAR(100),
    location_id     INT
);

-- Grain: one row per order
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE,
    status      VARCHAR(20),
    total_amount DECIMAL(12, 2)
);

-- Grain: one row per order line item
CREATE TABLE order_items (
    order_id   INT,
    product_id INT,
    quantity   INT,
    unit_price DECIMAL(10, 2),
    PRIMARY KEY (order_id, product_id)
);

-- Grain: one row per product
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100),
    category_id  INT,
    price        DECIMAL(10, 2)
);

-- Grain: one row per login event
CREATE TABLE logins (
    login_id    INT PRIMARY KEY,
    user_id     INT,
    login_time  TIMESTAMP,
    ip_address  VARCHAR(45)
);
```

### Sample Data

```sql
INSERT INTO employees VALUES
(1, 'Alice',   'Smith',    1, 95000,  '2020-01-15', NULL),
(2, 'Bob',     'Johnson',  1, 82000,  '2019-03-22', 1),
(3, 'Charlie', 'Williams', 2, 78000,  '2021-06-01', 1),
(4, 'Diana',   'Brown',    2, 105000, '2018-11-10', NULL),
(5, 'Eve',     'Davis',    3, 88000,  '2022-02-28', 4),
(6, 'Frank',   'Miller',   1, 72000,  '2023-01-05', 1),
(7, 'Grace',   'Wilson',   NULL, 65000, '2023-06-15', 4);

INSERT INTO departments VALUES
(1, 'Engineering',  101),
(2, 'Marketing',    102),
(3, 'Sales',        101),
(4, 'Human Resources', 103);

INSERT INTO orders VALUES
(101, 1, '2024-01-10', 'completed',  250.00),
(102, 2, '2024-01-12', 'completed',  180.50),
(103, 1, '2024-02-01', 'pending',    320.00),
(104, 3, '2024-02-15', 'completed',  95.75),
(105, 2, '2024-03-01', 'cancelled',  410.00),
(106, 4, '2024-03-10', 'completed',  600.00),
(107, 1, '2024-04-01', 'completed',  125.00);

INSERT INTO order_items VALUES
(101, 1, 2,  50.00),
(101, 3, 1, 150.00),
(102, 2, 3,  60.17),
(103, 1, 4,  80.00),
(103, 4, 1,  120.00),
(104, 2, 1,  95.75),
(105, 5, 2, 205.00),
(106, 1, 6, 100.00),
(106, 3, 2, 150.00),
(107, 4, 1, 125.00);

INSERT INTO products VALUES
(1, 'Laptop',       1, 1200.00),
(2, 'Mouse',        1, 25.00),
(3, 'Keyboard',     1, 75.00),
(4, 'Monitor',      2, 350.00),
(5, 'Headphones',   3, 150.00);

INSERT INTO logins VALUES
(1,  1, '2024-01-10 08:00:00', '192.168.1.1'),
(2,  1, '2024-01-11 09:15:00', '192.168.1.1'),
(3,  2, '2024-01-10 10:30:00', '10.0.0.5'),
(4,  3, '2024-01-12 07:45:00', '172.16.0.1'),
(5,  1, '2024-02-01 08:00:00', '192.168.1.1'),
(6,  2, '2024-02-05 11:00:00', '10.0.0.9'),
(7,  4, '2024-03-01 09:00:00', '10.0.0.2');
```

---

## Reading Execution Plans

Before tackling optimization problems, you must understand how to inspect what the database is actually doing.

### Syntax by Database

| Database | Command |
|----------|---------|
| PostgreSQL | `EXPLAIN (ANALYZE, BUFFERS) SELECT ...` |
| MySQL | `EXPLAIN ANALYZE SELECT ...` or `EXPLAIN SELECT ...` |
| SQL Server | `SET STATISTICS IO ON; SET STATISTICS TIME ON; SELECT ...` |
| Oracle | `EXPLAIN PLAN FOR SELECT ...; SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);` |

### Key Things to Look For

| Operation | What It Means | When to Worry |
|-----------|---------------|---------------|
| Seq Scan / Full Table Scan | Reading every row | Large tables without filtering |
| Index Scan | Using an index to find rows | Usually good |
| Index Only Scan | All data from index, no table access | Best case |
| Nested Loop | For each row in outer, scan inner | Fine for small outer sets |
| Hash Join | Build hash table from one side, probe with other | Good for large unsorted sets |
| Sort | Explicit sorting | Expensive for large result sets |
| Filter | Applying WHERE after scan | Check selectivity |
| HashAggregate / GroupAggregate | GROUP BY execution | Fine if input is small |
| Materialize | Storing intermediate results | Often seen with CTEs |

### Cardinality Estimates

The optimizer decides join order and join type based on estimated cardinality (number of rows). When estimates are wrong, the chosen plan can be dramatically suboptimal.

> Production pitfall: After bulk data loads, always run `ANALYZE` (PostgreSQL), `ANALYZE TABLE` (MySQL), or update statistics (SQL Server) so the optimizer has accurate cardinality estimates.

---

## Problem Category 1 — Sargability

**Sargable** = "Search ARGument ABLE" — a predicate that can use an index.

### Problem: Function on Indexed Column

Given: An index exists on `orders(order_date)`.

**BAD APPROACH:**

```sql
SELECT *
FROM orders
WHERE EXTRACT(YEAR FROM order_date) = 2024;
```

**Why it is slow:** The database must apply `EXTRACT(YEAR FROM order_date)` to **every row** before filtering. The index on `order_date` cannot be used because the function transforms the value.

**BETTER APPROACH:**

```sql
SELECT *
FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2025-01-01';
```

**Why it is fast:** The range `>= '2024-01-01' AND < '2025-01-01'` is sargable. The optimizer can use the index to seek directly to the start of the range and scan forward.

> Common misconception: "Adding an index always makes WHERE faster." If the WHERE clause applies a function to the indexed column, the index is **not used**.

### Problem: LIKE with Leading Wildcard

**BAD APPROACH:**

```sql
SELECT *
FROM products
WHERE product_name LIKE '%board%';
```

**Why it is slow:** A leading `%` prevents index use. The database must scan all rows and test each one.

**BETTER APPROACH (if full-text search is available):**

```sql
-- PostgreSQL
SELECT *
FROM products
WHERE to_tsvector('english', product_name) @@ to_tsquery('english', 'board');

-- MySQL
SELECT *
FROM products
WHERE MATCH(product_name) AGAINST('board');
```

### Problem: Implicit Type Conversion

Given: `employee_id` is `VARCHAR(10)` and an index exists on it.

**BAD APPROACH:**

```sql
SELECT *
FROM employees_varchar
WHERE employee_id = 1;
```

**Why it is slow:** The integer `1` is compared to a varchar column. The database must convert every `employee_id` to a number for comparison, defeating the index.

**BETTER APPROACH:**

```sql
SELECT *
FROM employees_varchar
WHERE employee_id = '1';
```

> Production pitfall: Implicit type conversions are silent and devastating. They can cause full table scans on billions of rows with no error message.

### Problem: OR Preventing Index Use

**BAD APPROACH:**

```sql
SELECT *
FROM employees
WHERE salary > 80000
   OR department_id = 2;
```

**Why it can be slow:** If `salary` and `department_id` are in separate indexes, some databases cannot use both with OR (they may do a merge or bitmap, but not always).

**BETTER APPROACH (if no composite index exists):**

```sql
-- UNION approach (guarantees index use on each side)
SELECT * FROM employees WHERE salary > 80000
UNION
SELECT * FROM employees WHERE department_id = 2;

-- Or create a composite index if this pattern is common
CREATE INDEX idx_salary_dept ON employees(salary, department_id);
```

> **Note:** PostgreSQL and Oracle can use Bitmap Index Merge for OR. MySQL 8.0+ can use Index Merge. But these are not always available or efficient. Always verify with `EXPLAIN`.

### Sargability Summary

| Pattern | Sargable? | Index Usable? |
|---------|-----------|---------------|
| `col = value` | Yes | Yes |
| `col > value` | Yes | Yes |
| `col BETWEEN a AND b` | Yes | Yes |
| `col LIKE 'abc%'` | Yes | Yes |
| `col LIKE '%abc'` | No | No |
| `col + 1 = 5` | No | No |
| `col = 5 - 1` | Yes (sometimes) | Rewrite to `col = 4` |
| `UPPER(col) = 'ABC'` | No (unless functional index) | No |
| `col IN (1, 2, 3)` | Yes | Yes |
| `col IS NULL` | Yes | Yes |

---

## Problem Category 2 — JOIN Problems

### Problem: Unnecessary JOIN

Find all orders placed by customer 1.

**BAD APPROACH:**

```sql
SELECT o.order_id, o.order_date, c.customer_id, c.first_name
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.customer_id = 1;
```

**Why it is unnecessary:** We only need columns from `orders`. The JOIN to `customers` adds I/O, memory, and CPU for no benefit.

**BETTER APPROACH:**

```sql
SELECT order_id, order_date
FROM orders
WHERE customer_id = 1;
```

**When you DO need the JOIN:**

```sql
-- Only if you actually need customer columns
SELECT o.order_id, o.order_date, c.first_name, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.customer_id = 1;
```

> **Reasoning rule:** "Do I only need to know whether a row exists?" → Use EXISTS. "Do I need columns from the other table?" → Use JOIN. "Do I only need columns from one table?" → Don't join at all.

### Problem: LEFT JOIN Becoming INNER JOIN

Find all departments and their employees (including departments with no employees).

**BAD APPROACH:**

```sql
SELECT d.department_name, e.first_name
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
WHERE e.salary > 80000;
```

**Why it becomes INNER JOIN:** The `WHERE e.salary > 80000` filters out NULL rows from the LEFT JOIN (departments with no employees). `NULL > 80000` is `UNKNOWN`, which is filtered out.

**BETTER APPROACH:**

```sql
-- Move the condition to the ON clause
SELECT d.department_name, e.first_name
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
                     AND e.salary > 80000;

-- Result:
-- department_name   | first_name
-- Engineering       | Alice
-- Engineering       | Eve  (salary 88000)
-- Marketing         | Diana
-- Sales             | (NULL) ← no one with salary > 80000
-- Human Resources   | (NULL) ← no employees at all
```

> Production pitfall: This is one of the most common and hardest-to-find bugs. The query runs without error, returns rows, and looks "plausible." But it silently drops departments with no high-salary employees.

### Problem: Accidental Cartesian Product (Fan-Out)

Find each employee's department and the count of orders placed by customers in their department.

**BAD APPROACH:**

```sql
SELECT e.first_name, d.department_name, COUNT(o.order_id) AS order_count
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN customers c ON c.department_id = d.department_id
JOIN orders o ON o.customer_id = c.customer_id
GROUP BY e.first_name, d.department_name;
```

**Why it is wrong:** An employee joins to a department, which joins to multiple customers, which joins to multiple orders. If there are 5 employees in Engineering, 10 customers, and 100 orders, you get 5 × 10 × 100 = 5000 rows before GROUP BY. The count is meaningless because it counts the Cartesian product.

**BETTER APPROACH (use a subquery to pre-aggregate):**

```sql
SELECT e.first_name,
       d.department_name,
       dept_orders.order_count
FROM employees e
JOIN departments d ON e.department_id = d.department_id
LEFT JOIN (
    SELECT c.department_id, COUNT(o.order_id) AS order_count
    FROM customers c
    JOIN orders o ON o.customer_id = c.customer_id
    GROUP BY c.department_id
) dept_orders ON dept_orders.department_id = d.department_id;
```

> **Reasoning rule:** "Can the JOIN create duplicates?" → If yes, either pre-aggregate or use window functions.

### Problem: JOIN Duplicating Rows

Find each employee and their orders.

**BAD APPROACH (if an employee can have many orders):**

```sql
SELECT e.first_name, e.salary, o.order_id, o.total_amount
FROM employees e
JOIN orders o ON e.employee_id = o.customer_id;
```

**Problem:** If employee 1 has 3 orders, their salary appears 3 times. If you sum `total_amount`, the salary is counted 3 times per employee.

**BETTER APPROACH (if you need both grain and aggregates):**

```sql
-- Option 1: Window function (preserves row grain)
SELECT e.first_name,
       e.salary,
       o.order_id,
       o.total_amount,
       SUM(o.total_amount) OVER (PARTITION BY e.employee_id) AS total_spent
FROM employees e
JOIN orders o ON e.employee_id = o.customer_id;

-- Option 2: Pre-aggregate orders
SELECT e.first_name,
       e.salary,
       SUM(o.total_amount) AS total_spent
FROM employees e
JOIN orders o ON e.employee_id = o.customer_id
GROUP BY e.employee_id, e.first_name, e.salary;
```

> Interview trap: "Write a query to find the total salary and total orders for each employee." If you join `employees` to `orders` and then do `SUM(salary) + COUNT(order_id)`, the salary is inflated by the join. You must GROUP BY employee or use window functions.

### Problem: JOIN Order in Complex Queries

**BAD APPROACH:**

```sql
SELECT *
FROM millions_table m
JOIN thousands_table t ON m.id = t.id
JOIN hundreds_table h ON t.id = h.id;
```

**Why it can be slow:** Some optimizers (especially older ones or with certain hints) might try to join millions_table to thousands_table first, producing a massive intermediate result.

**BETTER APPROACH:**

```sql
-- Let the optimizer choose (most modern optimizers handle this well)
-- Or use a derived table to force smaller intermediate results
SELECT *
FROM (
    SELECT t.*, h.extra_col
    FROM thousands_table t
    JOIN hundreds_table h ON t.id = h.id
) th
JOIN millions_table m ON th.id = m.id;
```

> **Note:** In PostgreSQL, MySQL 8.0+, and SQL Server, the optimizer typically chooses the best join order regardless of the written order. Forced join order via subquery hints is rarely needed. Always verify with `EXPLAIN`.

---

## Problem Category 3 — Aggregation Problems

### Problem: WHERE vs HAVING

Find departments with more than 3 employees earning above 50000.

**BAD APPROACH:**

```sql
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 3;
```

**Why it is wrong:** This counts **all** employees per department, including those earning ≤ 50000.

**BETTER APPROACH:**

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE salary > 50000
GROUP BY department_id
HAVING COUNT(*) > 3;
```

**Why it works:** `WHERE` filters rows **before** grouping. `HAVING` filters groups **after** grouping.

| Clause | When It Runs | Can Use Aggregate? | Can Use Column Alias? |
|--------|--------------|--------------------|-----------------------|
| WHERE | Before GROUP BY | No | No |
| HAVING | After GROUP BY | Yes | Yes (PostgreSQL) / No (MySQL, SQL Server) |

### Problem: Double Counting from One-to-Many JOIN

Find the total revenue per department from employees' orders.

**BAD APPROACH:**

```sql
SELECT d.department_name,
       SUM(o.total_amount) AS total_revenue
FROM departments d
JOIN employees e ON d.department_id = e.department_id
JOIN orders o ON e.employee_id = o.customer_id
GROUP BY d.department_name;
```

**Why it is wrong:** If employee 1 has 3 orders and employee 6 has 2 orders in Engineering, the sum includes all 5 orders. But if employee 1's orders have line items, and you joined `order_items`, you would multiply again.

**BETTER APPROACH (pre-aggregate or use window functions):**

```sql
-- Pre-aggregate orders per employee first
SELECT d.department_name,
       SUM(emp_totals.total_spent) AS total_revenue
FROM departments d
JOIN employees e ON d.department_id = e.department_id
JOIN (
    SELECT customer_id, SUM(total_amount) AS total_spent
    FROM orders
    GROUP BY customer_id
) emp_totals ON e.employee_id = emp_totals.customer_id
GROUP BY d.department_name;
```

> Production pitfall: When joining one-to-many relationships, always verify the grain. Ask: "Does each row represent one fact, or is it a duplicated fact?"

### Problem: COUNT(*) vs COUNT(column)

```sql
-- Counts all rows including NULLs
SELECT COUNT(*) FROM employees;
-- Result: 7

-- Counts only non-NULL values
SELECT COUNT(department_id) FROM employees;
-- Result: 6 (Grace has NULL department_id)

-- Counts distinct non-NULL values
SELECT COUNT(DISTINCT department_id) FROM employees;
-- Result: 3 (departments 1, 2, 3)
```

**When to use each:**

| Function | Use When |
|----------|----------|
| `COUNT(*)` | You need the total number of rows |
| `COUNT(col)` | You need the number of rows where `col` is not NULL |
| `COUNT(DISTINCT col)` | You need the number of unique non-NULL values |

> Interview trap: "How many departments have employees?" If you write `COUNT(DISTINCT department_id)` from `employees`, you get 3 (because `department_id = 4` has no employees). But if the question means "how many departments exist," the answer is 4 from the `departments` table.

---

## Problem Category 4 — Subquery vs JOIN vs EXISTS

### Problem: Find Employees in Departments Located in Building 101

**Using IN:**

```sql
SELECT *
FROM employees
WHERE department_id IN (
    SELECT department_id
    FROM departments
    WHERE location_id = 101
);
```

**Using EXISTS:**

```sql
SELECT *
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.department_id = e.department_id
      AND d.location_id = 101
);
```

**Using JOIN:**

```sql
SELECT DISTINCT e.*
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE d.location_id = 101;
```

### Comparison

| Approach | When It Shines | Watch Out For |
|----------|----------------|---------------|
| `IN` | Small subquery result set | `NOT IN` + NULLs → empty result |
| `EXISTS` | Large subquery, need only existence | Requires correlated subquery for most use cases |
| `JOIN` | Need columns from both tables | Can create duplicates (need DISTINCT) |

> Common misconception: "`EXISTS` is always faster than `IN`." This is false. Performance depends on the optimizer, indexes, and data distribution. On some databases with small lists, `IN` can be faster. On others with large datasets, `EXISTS` can be faster. Always verify with `EXPLAIN`.

### The NULL Trap: NOT IN vs NOT EXISTS

Find employees NOT in department 1.

**BAD APPROACH:**

```sql
SELECT *
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
    WHERE department_id = 1
);
-- This works IF no NULLs exist in the subquery result.
```

**Dangerous variation:**

```sql
SELECT *
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
    WHERE department_name LIKE 'X%'
);
-- If the subquery returns ANY NULL, the entire result is EMPTY.
```

**Why:** `NOT IN` with a NULL in the list:
- `x NOT IN (1, 2, NULL)` is equivalent to `x <> 1 AND x <> 2 AND x <> NULL`
- `x <> NULL` is `UNKNOWN` for any `x`
- `UNKNOWN AND anything` can never be `TRUE`
- Result: **zero rows**

**SAFE APPROACH:**

```sql
-- NOT EXISTS is safe with NULLs
SELECT *
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.department_id = e.department_id
      AND d.department_id = 1
);

-- Or explicitly exclude NULLs
SELECT *
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
    WHERE department_id = 1
)
AND department_id IS NOT NULL;
```

> Interview trap: "Write a query to find employees not assigned to any department." If the subquery can return NULLs, `NOT IN` returns zero rows. Always use `NOT EXISTS` or add `IS NOT NULL`.

### EXISTS vs IN: When to Use Each

| Scenario | Best Choice | Why |
|----------|-------------|-----|
| Check existence against small set | `IN` | Simple, readable, optimizer may inline |
| Check existence against large table | `EXISTS` | Can short-circuit on first match |
| Subquery may contain NULLs | `EXISTS` | `NOT IN` is dangerous with NULLs |
| Need columns from subquery | `JOIN` or correlated subquery | `IN`/`EXISTS` only return boolean |
| Subquery is independent | `IN` or `EXISTS` | Non-correlated subquery runs once |

---

## Problem Category 5 — Window Functions vs Self-Joins

### Problem: Find the Second Highest Salary

**BAD APPROACH (self-join):**

```sql
SELECT DISTINCT e1.salary
FROM employees e1
JOIN employees e2 ON e1.salary <= e2.salary
GROUP BY e1.salary
HAVING COUNT(DISTINCT e2.salary) = 2;
```

**Why it is bad:** O(n²) self-join, GROUP BY, COUNT — all combined. On large tables this is extremely slow.

**BETTER APPROACH (window function):**

```sql
SELECT salary
FROM (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk = 2;
```

**Why it is better:** Single pass over the data, one sort, no self-join.

### Problem: Find Each Employee's Salary Rank

**BAD APPROACH (correlated subquery):**

```sql
SELECT e1.first_name,
       e1.salary,
       (SELECT COUNT(DISTINCT e2.salary)
        FROM employees e2
        WHERE e2.salary > e1.salary) + 1 AS rank_num
FROM employees e1;
```

**Why it is bad:** For each employee, it scans the entire `employees` table. O(n²).

**BETTER APPROACH (window function):**

```sql
SELECT first_name,
       salary,
       RANK() OVER (ORDER BY salary DESC) AS rank_num
FROM employees;
```

**Result:**

| first_name | salary | rank_num |
|------------|--------|----------|
| Diana | 105000 | 1 |
| Alice | 95000 | 2 |
| Eve | 88000 | 3 |
| Bob | 82000 | 4 |
| Charlie | 78000 | 5 |
| Frank | 72000 | 6 |
| Grace | 65000 | 7 |

### Problem: Running Total

**BAD APPROACH (correlated subquery):**

```sql
SELECT o1.order_id,
       o1.order_date,
       o1.total_amount,
       (SELECT SUM(o2.total_amount)
        FROM orders o2
        WHERE o2.order_date <= o1.order_date) AS running_total
FROM orders o1
ORDER BY o1.order_date;
```

**Why it is bad:** O(n²) — each row triggers a full scan of `orders`.

**BETTER APPROACH (window function):**

```sql
SELECT order_id,
       order_date,
       total_amount,
       SUM(total_amount) OVER (ORDER BY order_date
                               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders;
```

### RANK vs DENSE_RANK vs ROW_NUMBER

| Function | Ties | Gaps | Use When |
|----------|------|------|----------|
| `ROW_NUMBER` | Ties get different numbers | No gaps | You need unique ordering |
| `RANK` | Ties get same number | Yes (gaps) | Standard competition ranking |
| `DENSE_RANK` | Ties get same number | No gaps | No gaps in ranking |

```sql
-- Example with ties
SELECT first_name, salary,
       RANK() OVER (ORDER BY salary DESC) AS rank_val,
       DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank_val,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num
FROM employees;
```

> Interview trap: "Find the Nth highest salary." If two people share the same salary, do they occupy the same rank? Use `RANK` for "competition ranking" (ties share rank, next rank gaps). Use `DENSE_RANK` for "no gaps." Use `ROW_NUMBER` if you want exactly one row per rank.

---

## Problem Category 6 — Pagination

### Problem: OFFSET-based Pagination

**BAD APPROACH (for deep pages):**

```sql
SELECT *
FROM orders
ORDER BY order_id
LIMIT 10 OFFSET 1000000;
```

**Why it is slow:** The database must scan and discard 1,000,000 rows before returning 10. Performance degrades linearly with page depth.

**BETTER APPROACH: Keyset Pagination**

```sql
-- Assuming you know the last order_id from the previous page was 1000000
SELECT *
FROM orders
WHERE order_id > 1000000
ORDER BY order_id
LIMIT 10;
```

**Why it is fast:** The database uses the index on `order_id` to seek directly to `1000001` and reads 10 rows. Constant time regardless of page depth.

### Comparison

| Approach | Time Complexity | Can Jump to Page N? | Stable with Inserts? |
|----------|-----------------|---------------------|----------------------|
| OFFSET | O(offset + limit) | Yes | No (rows shift) |
| Keyset | O(log n + limit) | No (need cursor) | Yes (stable) |

> **When to use OFFSET:** Small datasets, admin UIs where users browse sequentially.
>
> **When to use Keyset:** Large datasets, APIs, infinite scroll, high-concurrency systems.

### Problem: OFFSET Inconsistency

```sql
-- Page 1
SELECT * FROM orders ORDER BY order_id LIMIT 10 OFFSET 0;
-- Returns orders 1-10

-- User A inserts an order. Now:
-- Page 2
SELECT * FROM orders ORDER BY order_id LIMIT 10 OFFSET 10;
-- Returns orders 11-21, but order 11 might have shifted
-- The new order could have been inserted before order 11
```

> Production pitfall: OFFSET-based pagination is inherently unstable under concurrent writes. For user-facing APIs, keyset pagination is strongly preferred.

---

## Problem Category 7 — Set Operations

### UNION vs UNION ALL

**BAD APPROACH:**

```sql
SELECT customer_id FROM orders
UNION
SELECT customer_id FROM customers;
```

**Why it can be slow:** `UNION` applies `DISTINCT` to the combined result, requiring a sort or hash to eliminate duplicates.

**BETTER APPROACH (if duplicates are acceptable or impossible):**

```sql
SELECT customer_id FROM orders
UNION ALL
SELECT customer_id FROM customers;
```

| Operation | Duplicates | Performance | Use When |
|-----------|------------|-------------|----------|
| `UNION` | Removed | Slower (dedup) | You need unique combined results |
| `UNION ALL` | Preserved | Faster | Duplicates are fine or impossible |

> Common misconception: "`UNION` is always slow." If both result sets are already unique (e.g., both SELECT from primary keys), the dedup step may be skipped by the optimizer. But you cannot rely on this — use `UNION ALL` when possible.

---

## Problem Category 8 — Data Modification

### DELETE vs TRUNCATE vs DROP

| Operation | What It Does | Logging | Where Clause | Triggers | Rollback |
|-----------|-------------|---------|--------------|----------|----------|
| `DELETE` | Removes rows | Row-level | Yes | Yes | Yes |
| `TRUNCATE` | Removes all rows | Page-level | No | No | Yes (SQL Server) / No (MySQL) |
| `DROP` | Removes table | Minimal | N/A | No | Depends on DB |

**BAD APPROACH:**

```sql
DELETE FROM logins WHERE login_time < '2023-01-01';
-- If logins table has 100M rows, this logs each deletion individually
```

**BETTER APPROACH (if you want to remove all old rows):**

```sql
-- Partition the data, then TRUNCATE the partition
-- Or in PostgreSQL:
TRUNCATE logins;  -- if you want all rows removed
```

**BETTER APPROACH (if you must delete specific rows):**

```sql
-- Delete in batches to avoid long locks
DELETE FROM logins
WHERE login_id IN (
    SELECT login_id
    FROM logins
    WHERE login_time < '2023-01-01'
    LIMIT 10000
);
-- Repeat until 0 rows affected
```

> Production pitfall: `DELETE` without a `WHERE` clause on a large table can lock the table for minutes. In production, always batch deletes and consider `TRUNCATE` if removing all rows.

### Problem: UPDATE with JOIN

**BAD APPROACH (UPDATE with implicit join — MySQL-specific):**

```sql
-- MySQL syntax
UPDATE employees e
JOIN departments d ON e.department_id = d.department_id
SET e.salary = e.salary * 1.1
WHERE d.department_name = 'Engineering';
```

**BETTER APPROACH (ANSI SQL — works everywhere):**

```sql
UPDATE employees
SET salary = salary * 1.1
WHERE department_id IN (
    SELECT department_id
    FROM departments
    WHERE department_name = 'Engineering'
);
```

> PostgreSQL: Use `UPDATE ... FROM` syntax. SQL Server: Use `UPDATE ... FROM` or `MERGE`. Always check your database's specific UPDATE syntax.

---

## Anti-Patterns and Solutions

### Anti-Pattern 1: SELECT *

**BAD:**

```sql
SELECT * FROM orders JOIN order_items ON orders.order_id = order_items.order_id;
```

**Problems:**
- Returns duplicate column names (`order_id`)
- Transfers unnecessary data over the network
- Prevents index-only scans
- Breaks applications if schema changes

**BETTER:**

```sql
SELECT o.order_id, o.order_date, o.total_amount,
       oi.product_id, oi.quantity, oi.unit_price
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id;
```

### Anti-Pattern 2: SELECT DISTINCT to Fix Duplicates

**BAD:**

```sql
SELECT DISTINCT e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN orders o ON e.employee_id = o.customer_id;
```

**Why it is bad:** `DISTINCT` hides the real problem — duplicate rows from the JOIN. It forces a sort/hash to remove duplicates, which is expensive.

**BETTER:** Fix the query to produce the correct grain, or pre-aggregate.

### Anti-Pattern 3: NOT IN on Subquery That May Return NULLs

Covered in [Problem Category 4](#problem-category-4--subquery-vs-join-vs-exists).

### Anti-Pattern 4: Correlated Subquery in SELECT

**BAD:**

```sql
SELECT e.first_name,
       (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = e.employee_id) AS last_order
FROM employees e;
```

**BETTER:**

```sql
SELECT e.first_name, MAX(o.order_date) AS last_order
FROM employees e
LEFT JOIN orders o ON e.employee_id = o.customer_id
GROUP BY e.employee_id, e.first_name;
```

### Anti-Pattern 5: Using HAVING for Non-Aggregate Filtering

**BAD:**

```sql
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING first_name = 'Alice';
-- ERROR in most databases: first_name is not in GROUP BY
```

**BETTER:**

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE first_name = 'Alice'
GROUP BY department_id;
```

---

## Comparison Tables

### JOIN Types at a Glance

| Join Type | Returns | NULL Behavior |
|-----------|---------|---------------|
| `INNER JOIN` | Only matching rows from both sides | No NULLs from missing matches |
| `LEFT JOIN` | All from left, matching from right | NULLs for non-matching right rows |
| `RIGHT JOIN` | All from right, matching from left | NULLs for non-matching left rows |
| `FULL OUTER JOIN` | All from both sides | NULLs for non-matching from either side |
| `CROSS JOIN` | Cartesian product | N/A |
| `SELF JOIN` | Join table to itself | Same as above |

### Aggregate Functions and NULLs

| Function | NULLs Ignored? | Example |
|----------|----------------|---------|
| `SUM()` | Yes | `SUM(1, NULL, 3)` = 4 |
| `AVG()` | Yes | `AVG(1, NULL, 3)` = 2 |
| `COUNT(*)` | No | `COUNT(*)` counts all rows |
| `COUNT(col)` | Yes | `COUNT(col)` skips NULLs |
| `MIN()` / `MAX()` | Yes | `MIN(5, NULL)` = 5 |

### Window Function Ranking Comparison

```sql
-- Given salaries: 105000, 95000, 88000, 88000, 72000
SELECT salary,
       ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num,
       RANK()       OVER (ORDER BY salary DESC) AS rank_val,
       DENSE_RANK()  OVER (ORDER BY salary DESC) AS dense_val
FROM (VALUES (105000),(95000),(88000),(88000),(72000)) AS t(salary);
```

| salary | row_num | rank_val | dense_val |
|--------|---------|----------|-----------|
| 105000 | 1 | 1 | 1 |
| 95000 | 2 | 2 | 2 |
| 88000 | 3 | 3 | 3 |
| 88000 | 4 | 3 | 3 |
| 72000 | 5 | 5 | 4 |

### CTE vs Subquery vs Temp Table

| Feature | CTE | Subquery | Temp Table |
|---------|-----|----------|------------|
| Readability | High | Medium | High |
| Reusable in same query | Yes (by name) | No (must duplicate) | Yes |
| Indexed | No | No | Yes |
| Exists across queries | No (PostgreSQL, MySQL) | No | Yes (SQL Server, MySQL) |
| Optimizer inline | Sometimes | Sometimes | No |
| Recursive | Yes | No | No |

---

## Best Practices

1. **Always run EXPLAIN/ANALYZE before claiming a query is slow.** Do not guess.

2. **Prefer WHERE over HAVING** for non-aggregate filtering.

3. **Use EXISTS over IN** when checking existence against a large table, and always when the subquery might return NULLs.

4. **Use UNION ALL over UNION** unless you explicitly need deduplication.

5. **Avoid functions on indexed columns** in WHERE clauses (sargability).

6. **Pre-aggregate before JOINing** when combining one-to-many relationships to avoid fan-out.

7. **Use window functions over self-joins** for ranking, running totals, and lag/lead operations.

8. **Use keyset pagination** for large datasets or APIs; use OFFSET only for small, admin-facing pages.

9. **Batch large DELETE/UPDATE operations** to avoid long locks and transaction log bloat.

10. **Verify cardinality estimates** after schema changes. Run ANALYZE / update statistics.

11. **Choose the right index:**
    - Single-column index for simple equality/range
    - Composite index for multi-column predicates (leftmost prefix rule)
    - Covering index (INCLUDE) for queries that can be satisfied entirely from the index

12. **Measure, don't assume.** Performance depends on the optimizer, indexes, statistics, cardinality, data distribution, query shape, database engine, and execution plan.

---

## Interview Questions

### Beginner

1. What is the difference between `WHERE` and `HAVING`?

2. What is the difference between `COUNT(*)` and `COUNT(column)`?

3. Why is `SELECT *` considered bad practice?

4. What happens when you use `DISTINCT` on a query that should not produce duplicates?

5. Write a query to find the total salary per department.

6. What is the difference between `UNION` and `UNION ALL`?

7. What is a NULL, and how does it differ from an empty string or zero?

8. Write a query to find departments with more than 5 employees.

9. What is the grain of the `order_items` table?

10. Why must non-aggregated columns appear in `GROUP BY`?

### Intermediate

1. Find the second highest salary without using `LIMIT`/`OFFSET`.

2. Write a query to find employees who have never placed an order.

3. Explain the difference between `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()`. When would you use each?

4. Write a query to find each employee's salary and their department's average salary.

5. What is the problem with `NOT IN` when the subquery returns NULLs? Show an example.

6. Rewrite a correlated subquery as a JOIN.

7. Find the top 3 departments by total salary, handling ties correctly.

8. Write a query to calculate a running total of order amounts by date.

9. Explain when `LEFT JOIN` becomes an `INNER JOIN`. Show a buggy example and fix it.

10. What is the difference between `IN` and `EXISTS`? When would you prefer one over the other?

### Advanced

1. You have a query that joins 5 tables. The execution plan shows a nested loop with a full table scan on the largest table. What steps would you take to diagnose and fix this?

2. Write a query to find employees whose salary is above the average salary of their department, without using window functions.

3. Explain why `WHERE YEAR(order_date) = 2024` cannot use an index on `order_date`. Rewrite it to be sargable.

4. Write a query to find the median salary without using `PERCENTILE_CONT`.

5. You need to paginate through 10 million rows. Explain why OFFSET-based pagination degrades and propose an alternative.

6. Write a query to find the top 2 highest-paying employees per department, including ties.

7. Explain the concept of a covering index. Give an example of a query that benefits from one.

8. Write a recursive CTE to traverse a manager-employee hierarchy starting from the CEO.

9. You observe that a query is fast on a development database (1000 rows) but slow on production (100 million rows). What are the likely causes?

10. Explain why the optimizer might choose a Hash Join over a Nested Loop. Under what conditions would each be preferred?

### Scenario Based

1. **Scenario:** A query joining `orders` and `customers` returns 50% more rows than expected. What is the likely problem and how do you fix it?

2. **Scenario:** Your application's login page takes 10 seconds to load. The bottleneck is a query on the `logins` table filtering by `user_id` and `login_time`. The table has 500 million rows. What indexes would you create?

3. **Scenario:** A report shows that a department's total salary is double what it should be. The query joins `employees` to `orders`. What went wrong?

4. **Scenario:** A nightly ETL job deletes 10 million rows from a 1 billion row table. The delete takes 6 hours and locks the table. Propose a solution.

5. **Scenario:** Two queries both find "employees not in any department." One uses `NOT IN`, the other uses `NOT EXISTS`. On the production database with NULL `department_id` values, `NOT IN` returns zero rows while `NOT EXISTS` returns the correct result. Explain why.

6. **Scenario:** You need to find "the most recent order for each customer." Write two approaches: one using window functions and one using a correlated subquery. Compare their performance characteristics.

7. **Scenario:** A query uses `OFFSET 5000000 LIMIT 10` and takes 8 seconds. The table has an index on the sort column. Rewrite using keyset pagination.

8. **Scenario:** A dashboard query joins 4 tables and uses `GROUP BY`. After adding a new column to the SELECT (from a 5th table), the query goes from 200ms to 15 seconds. Diagnose the likely cause.

9. **Scenario:** You need to find duplicate email addresses in a `users` table. Write an optimized query. Then write a query to delete all but the earliest registration for each duplicate email.

10. **Scenario:** A `LEFT JOIN` query is supposed to return all customers, including those with no orders. But the result is missing some customers. What are the possible causes?

### Tricky

1. What does this query return?

```sql
SELECT COUNT(*), COUNT(department_id)
FROM employees;
```

2. What does this query return?

```sql
SELECT *
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
    WHERE department_name LIKE 'X%'
);
```

(Assume the subquery returns: `{1, 2, NULL}`)

3. What is the result of:

```sql
SELECT 10 / 3;
```

In MySQL vs PostgreSQL vs SQL Server?

4. How many rows does this return?

```sql
SELECT *
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
WHERE e.first_name = 'Alice';
```

(Assume Alice is in department 1, and department 1 has 3 employees.)

5. What is wrong with this query?

```sql
SELECT department_name, COUNT(*)
FROM employees
JOIN departments USING (department_id)
WHERE salary > 50000
GROUP BY department_id
HAVING COUNT(*) > 2
ORDER BY department_name;
```

(In MySQL with `ONLY_FULL_GROUP_BY` disabled)

6. What does this return?

```sql
SELECT NULL = NULL;
```

7. How does this differ?

```sql
SELECT NULL IS NULL;
SELECT NULL = NULL;
```

8. What is the output of:

```sql
SELECT *
FROM (VALUES (1),(2),(3)) AS t(x)
WHERE x IN (SELECT NULL);
```

9. What is wrong with this pagination query?

```sql
SELECT * FROM orders ORDER BY order_date, order_id LIMIT 10 OFFSET 50;
```

10. What will happen if you run this on a table with 100 million rows?

```sql
DELETE FROM logins;
```

### Output Prediction

**Given the sample data in this section, predict the output of each query:**

1.

```sql
SELECT d.department_name, COUNT(e.employee_id)
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_name
ORDER BY COUNT(e.employee_id) DESC;
```

2.

```sql
SELECT customer_id, COUNT(*) AS order_count,
       RANK() OVER (ORDER BY COUNT(*) DESC) AS rnk
FROM orders
GROUP BY customer_id;
```

3.

```sql
SELECT e1.first_name, e2.first_name AS manager_name
FROM employees e1
LEFT JOIN employees e2 ON e1.manager_id = e2.employee_id;
```

4.

```sql
SELECT *
FROM orders
WHERE total_amount > ALL (
    SELECT total_amount FROM orders WHERE customer_id = 3
);
```

5.

```sql
SELECT product_id, SUM(quantity * unit_price) AS revenue
FROM order_items
GROUP BY product_id
HAVING SUM(quantity * unit_price) > 200
ORDER BY revenue DESC;
```

### Debugging

1. This query returns duplicates. Identify why and fix it:

```sql
SELECT e.first_name, d.department_name, o.order_id
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN orders o ON e.employee_id = o.customer_id;
```

2. This query returns zero rows but you know data exists. Debug:

```sql
SELECT *
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
);
```

3. This query is slow on a table with 10 million rows. The execution plan shows a full table scan. The WHERE clause is `WHERE YEAR(order_date) = 2024` and an index exists on `order_date`. Why is the index not used? Fix it.

4. This query runs out of memory:

```sql
SELECT *
FROM logins
WHERE user_id IN (
    SELECT user_id
    FROM logins
    GROUP BY user_id
    HAVING COUNT(*) > 1000
)
ORDER BY login_time;
```

5. This query returns unexpected NULLs in the result. Identify the cause:

```sql
SELECT e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;
```

Wait — this should not return NULLs. But what if the JOIN condition were changed to:

```sql
SELECT e.first_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id;
```

What changed and why?

6. This UPDATE affects more rows than expected:

```sql
UPDATE orders
SET status = 'expired'
WHERE order_date < '2024-01-01'
AND status != 'cancelled';
```

Hint: What if `status` can be NULL?

7. This query produces different results on two runs. What could cause non-determinism?

```sql
SELECT *
FROM orders
WHERE customer_id IN (
    SELECT customer_id FROM customers WHERE region = 'EU'
)
LIMIT 10;
```

8. A developer writes this query and claims it "sometimes works, sometimes doesn't":

```sql
SELECT *
FROM employees
WHERE salary = (
    SELECT MAX(salary) FROM employees
    WHERE department_id = 3
);
```

What could go wrong if multiple employees share the maximum salary?

9. This query is supposed to find the earliest login per user but returns multiple rows per user:

```sql
SELECT user_id, login_time
FROM logins
WHERE login_time = (
    SELECT MIN(login_time)
    FROM logins l2
    WHERE l2.user_id = logins.user_id
);
```

What is wrong? (Hint: nothing, if the subquery is correlated correctly — but if someone wrote it without the correlation, what happens?)

10. This query throws an error in PostgreSQL but works in MySQL:

```sql
SELECT department_id, salary
FROM employees
WHERE salary = MAX(salary);
```

Why?

### Performance

1. You have two approaches to find "employees who placed orders in January 2024." Compare:

**Approach A:**

```sql
SELECT DISTINCT e.*
FROM employees e
JOIN orders o ON e.employee_id = o.customer_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date <  '2024-02-01';
```

**Approach B:**

```sql
SELECT *
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = e.employee_id
      AND o.order_date >= '2024-01-01'
      AND o.order_date <  '2024-02-01'
);
```

Which is faster? Under what conditions?

2. You need to update the salary of all employees in the 'Engineering' department by 10%. Compare:

**Approach A:**

```sql
UPDATE employees
SET salary = salary * 1.10
WHERE department_id = (
    SELECT department_id FROM departments WHERE department_name = 'Engineering'
);
```

**Approach B:**

```sql
UPDATE employees e
SET salary = salary * 1.10
WHERE e.department_id IN (
    SELECT d.department_id FROM departments d WHERE d.department_name = 'Engineering'
);
```

**Approach C:**

```sql
UPDATE employees
SET salary = salary * 1.10
WHERE department_id = 1; -- assuming you know the ID
```

Compare the three approaches.

3. A query joining `orders` (1M rows) to `order_items` (5M rows) to `products` (10K rows) takes 30 seconds. The execution plan shows:

```
Nested Loop  (cost=0.00..500000 rows=5000000)
  -> Seq Scan on orders
  -> Index Scan on order_items(order_id)
  -> Seq Scan on products
```

Identify at least 3 things to investigate.

4. Compare these two queries for finding "the most recent order per customer":

**Approach A:**

```sql
SELECT o1.*
FROM orders o1
WHERE o1.order_date = (
    SELECT MAX(o2.order_date)
    FROM orders o2
    WHERE o2.customer_id = o1.customer_id
);
```

**Approach B:**

```sql
SELECT *
FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) AS rn
    FROM orders
) ranked
WHERE rn = 1;
```

Which approach is likely faster? What indexes would help each?

5. You observe these two execution plans for the same logical query:

**Plan A:**

```
Hash Join
  -> Seq Scan on employees
  -> Hash
       -> Seq Scan on departments
```

**Plan B:**

```
Nested Loop
  -> Index Scan on employees(department_id)
  -> Index Scan on departments(department_id)
```

Under what data distribution and index conditions would each plan be chosen? Which is likely faster for: (a) 100 employees, 10 departments? (b) 10 million employees, 10 departments?

6. A query with `SELECT DISTINCT` takes 5 seconds. Removing `DISTINCT` makes it take 0.5 seconds. The DISTINCT is there to fix duplicate rows from a JOIN. Propose two alternative approaches that avoid DISTINCT and explain their performance trade-offs.

7. You have a table with 100 million rows and need to find all rows matching a pattern (`LIKE '%error%'`). No index can help. Propose solutions at the database level and application level.

8. Compare OFFSET-based vs keyset pagination performance as the page number increases to 10,000. What does the execution plan show for each approach at that depth?

9. A query using `OR` in the WHERE clause is slow:

```sql
SELECT * FROM orders WHERE customer_id = 5 OR status = 'pending';
```

The execution plan shows two index scans being merged. Propose alternative approaches and explain when each is best.

10. You have a CTE that is referenced twice in the main query. Does the CTE execute once or twice? How does this differ between PostgreSQL and SQL Server? What can you do if you need it to execute only once?

---

*Cross-references: See [NULL](#null), [JOINs](#join-problems), [Window Functions](#window-functions), [Indexes](#indexes), [Execution Plans](#execution-plans), [Transactions](#transactions) in other sections of this handbook.*
