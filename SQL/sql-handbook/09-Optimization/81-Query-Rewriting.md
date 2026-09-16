# 81. Query Rewriting

Query rewriting is the process of transforming a logically equivalent SQL query into one that performs better, is more readable, or avoids known pitfalls. The database optimizer does some rewriting internally, but understanding manual rewriting gives you control over performance, correctness, and clarity.

---

## Table of Contents

1. [What Is Query Rewriting](#what-is-query-rewriting)
2. [Sample Tables](#sample-tables)
3. [Rewriting Subqueries as JOINs](#rewriting-subqueries-as-joins)
4. [Rewriting JOINs as Subqueries](#rewriting-joins-as-subqueries)
5. [IN vs EXISTS vs ANY](#in-vs-exists-vs-any)
6. [NOT IN vs NOT EXISTS](#not-in-vs-not-exists)
7. [Correlated Subqueries to JOINs](#correlated-subqueries-to-joins)
8. [OR Conditions to UNION ALL](#or-conditions-to-union-all)
9. [Rewriting with Window Functions](#rewriting-with-window-functions)
10. [Eliminating Redundant DISTINCT](#eliminating-redundant-distinct)
11. [Derived Table Elimination](#derived-table-elimination)
12. [SARGable Rewriting](#sargable-rewriting)
13. [UNION vs UNION ALL](#union-vs-union-all)
14. [Pagination Rewriting](#pagination-rewriting)
15. [NULL-Safe Rewriting](#null-safe-rewriting)
16. [Rewriting CASE Expressions](#rewriting-case-expressions)
17. [Common Mistakes](#common-mistakes)
18. [Production Pitfalls](#production-pitfalls)
19. [Performance Implications](#performance-implications)
20. [Interview Questions](#interview-questions)

---

## What Is Query Rewriting

Query rewriting is transforming one SQL query into a different but logically equivalent form that may:

- Execute faster
- Use indexes better
- Avoid pitfalls (fan-out, double counting, NULL bugs)
- Improve readability
- Reduce load on the database

Two queries are **logically equivalent** if they return the same rows for the same data. They are **not** necessarily equivalent in performance.

> The database optimizer rewrites some queries internally (e.g., flattening nested subqueries, converting some IN to semi-joins). But the optimizer is not omniscient. Understanding manual rewriting lets you help the optimizer when it cannot do the job.

---

## Sample Tables

```sql
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    department_id INT,
    salary        DECIMAL(10,2),
    hire_date     DATE
);

CREATE TABLE departments (
    department_id   INT PRIMARY KEY,
    department_name VARCHAR(100),
    manager_id      INT
);

CREATE TABLE orders (
    order_id     INT PRIMARY KEY,
    customer_id  INT,
    order_date   DATE,
    status       VARCHAR(20),
    total_amount DECIMAL(10,2)
);

CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT,
    product_id INT,
    quantity   INT,
    unit_price DECIMAL(10,2)
);

CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100),
    category     VARCHAR(50),
    price        DECIMAL(10,2)
);

CREATE TABLE customers (
    customer_id   INT PRIMARY KEY,
    customer_name VARCHAR(100),
    email         VARCHAR(100),
    region        VARCHAR(50)
);
```

**Grain of each table:**

| Table       | Grain                                 |
| ----------- | ------------------------------------- |
| employees   | One row per employee                  |
| departments | One row per department                |
| orders      | One row per order                     |
| order_items | One row per line item within an order |
| products    | One row per product                   |
| customers   | One row per customer                  |

---

## Rewriting Subqueries as JOINs

### Pattern: Scalar Subquery in SELECT

**BAD APPROACH**

```sql
SELECT
    e.first_name,
    e.last_name,
    (SELECT d.department_name
     FROM departments d
     WHERE d.department_id = e.department_id) AS dept_name
FROM employees e;
```

This executes the subquery **once per row** in `employees`. This is a **correlated scalar subquery** — the inner query references the outer query's `e.department_id`.

**BETTER APPROACH**

```sql
SELECT
    e.first_name,
    e.last_name,
    d.department_name AS dept_name
FROM employees e
JOIN departments d ON d.department_id = e.department_id;
```

**Why this is better:**

- The database joins once using an index on `departments.department_id`
- No repeated subquery execution per row
- The optimizer can choose an efficient join strategy (hash join, merge join, nested loop)

**Expected output:**

| first_name | last_name | dept_name   |
| ---------- | --------- | ----------- |
| Alice      | Smith     | Engineering |
| Bob        | Jones     | Marketing   |
| Charlie    | Brown     | Engineering |

> The rewrite is valid when `department_id` in `departments` is unique (it is — it is the primary key). If it were not unique, the JOIN could produce duplicate rows.

---

### Pattern: Aggregated Subquery in SELECT

**BAD APPROACH**

```sql
SELECT
    o.order_id,
    o.customer_id,
    o.total_amount,
    (SELECT COUNT(*)
     FROM order_items oi
     WHERE oi.order_id = o.order_id) AS item_count
FROM orders o;
```

**BETTER APPROACH**

```sql
SELECT
    o.order_id,
    o.customer_id,
    o.total_amount,
    oi_agg.item_count
FROM orders o
JOIN (
    SELECT order_id, COUNT(*) AS item_count
    FROM order_items
    GROUP BY order_id
) oi_agg ON oi_agg.order_id = o.order_id;
```

Or with a correlated subquery rewritten to a window function:

```sql
SELECT
    o.order_id,
    o.customer_id,
    o.total_amount,
    COUNT(*) OVER (PARTITION BY oi.order_id) AS item_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id;
```

> **Interview trap:** The window function version produces **duplicate rows per order** if you `SELECT` other order-level columns without using a subquery. See the [Fan-out](#fan-out-and-double-counting) section below.

---

### Pattern: EXISTS Subquery to Semi-Join

```sql
SELECT *
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
    AND o.status = 'shipped'
);
```

Most optimizers convert `EXISTS` into a **semi-join** internally. A semi-join returns rows from the left table at most once, even if the right table has multiple matches. This is already efficient.

You can also write it explicitly as a semi-join (database-specific):

```sql
-- PostgreSQL: doesn't have a direct SEMI JOIN syntax
-- but the optimizer handles EXISTS as a semi-join

-- SQL Server: sometimes uses APPLY for correlated EXISTS
-- The optimizer handles it

-- MySQL: optimizer converts EXISTS to semi-join in many cases
```

> **Important:** `EXISTS` is generally well-optimized. Do not rewrite `EXISTS` to `IN` blindly — they have different NULL behavior. See [NOT IN vs NOT EXISTS](#not-in-vs-not-exists).

---

## Rewriting JOINs as Subqueries

Sometimes a JOIN is not the right tool and a subquery is better.

### When You Only Need Existence

**BAD APPROACH (potential fan-out)**

```sql
SELECT DISTINCT c.customer_id, c.customer_name
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'shipped';
```

**BETTER APPROACH**

```sql
SELECT c.customer_id, c.customer_name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
    AND o.status = 'shipped'
);
```

**Why this is better:**

- `EXISTS` stops scanning as soon as it finds the first match (short-circuit)
- No `DISTINCT` needed — semi-join returns each customer at most once
- The optimizer can use an index on `orders(customer_id, status)` efficiently

**Expected output:**

| customer_id | customer_name |
| ----------- | ------------- |
| 1           | Acme Corp     |
| 3           | Widget Inc    |

---

## IN vs EXISTS vs ANY

### Syntax Comparison

```sql
-- IN
SELECT * FROM employees
WHERE department_id IN (SELECT department_id FROM departments);

-- EXISTS
SELECT * FROM employees e
WHERE EXISTS (
    SELECT 1 FROM departments d
    WHERE d.department_id = e.department_id
);

-- ANY
SELECT * FROM employees
WHERE department_id = ANY (SELECT department_id FROM departments);
```

`IN` and `ANY` with a subquery are logically equivalent in most databases.

### Comparison Table

| Feature              | IN                   | EXISTS                  | ANY                  |
| -------------------- | -------------------- | ----------------------- | -------------------- |
| Readability          | Good for small lists | Good for complex logic  | Rarely used          |
| NULL behavior        | Complex (see below)  | Skips NULLs naturally   | Similar to IN        |
| Optimizer conversion | Often to semi-join   | Semi-join               | Semi-join            |
| Short-circuit        | Rarely               | Yes (finds first match) | Rarely               |
| Index usage          | Depends on optimizer | Depends on optimizer    | Depends on optimizer |

> **Do not make absolute claims** like "EXISTS is always faster than IN." Verify with `EXPLAIN ANALYZE`. The optimizer, statistics, data distribution, and indexes all matter.

### When IN Is Better

When the subquery result set is **small and static** (e.g., a short list of values):

```sql
SELECT * FROM orders
WHERE status IN ('shipped', 'delivered', 'completed');
```

This is not even a subquery — it is an **in-list**. Most databases handle this very efficiently.

### When EXISTS Is Better

When the subquery is **correlated** and you want short-circuit behavior:

```sql
-- Find employees who have placed an order
SELECT e.*
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = e.employee_id
);
```

The optimizer scans `orders` for each employee and stops at the first match.

---

## NOT IN vs NOT EXISTS

This is one of the **most dangerous** rewrites in SQL due to NULL behavior.

### The NULL Trap with NOT IN

```sql
CREATE TABLE t1 (id INT);
INSERT INTO t1 VALUES (1), (2), (3);

CREATE TABLE t2 (id INT);
INSERT INTO t2 VALUES (1), (NULL);
```

```sql
-- Returns EMPTY set
SELECT * FROM t1
WHERE id NOT IN (SELECT id FROM t2);

-- Returns {2, 3}
SELECT * FROM t1 t
WHERE NOT EXISTS (
    SELECT 1 FROM t2 WHERE t2.id = t.id
);
```

**Why does NOT IN return empty?**

`NOT IN` expands to:

```sql
id <> 1 AND id <> NULL
```

`id <> NULL` is **unknown** (three-valued logic). Any `AND` with unknown is unknown, which is treated as false. **All rows are filtered out.**

**NOT EXISTS** handles NULLs correctly because the comparison `t2.id = t.id` in the `WHERE` clause of the subquery returns `unknown` when `t2.id` is NULL, and the row is simply not matched — it does not poison the entire result.

### Comparison Table

| Feature          | NOT IN               | NOT EXISTS           |
| ---------------- | -------------------- | -------------------- |
| NULL in subquery | Returns empty set    | Works correctly      |
| Performance      | Depends on optimizer | Usually similar      |
| Readability      | Good without NULLs   | Always safe          |
| Index usage      | Depends on optimizer | Depends on optimizer |

> **Production pitfall:** Never use `NOT IN` when the subquery column can contain NULLs. Use `NOT EXISTS` or add `WHERE column IS NOT NULL` to the subquery.

```sql
-- Safe version of NOT IN
SELECT * FROM employees
WHERE department_id NOT IN (
    SELECT department_id FROM departments WHERE department_id IS NOT NULL
);
```

> **Interview trap:** The interviewer will give you a table with NULLs and ask what `NOT IN` returns. The correct answer is "an empty set" or "unexpected results."

---

## Correlated Subqueries to JOINs

A **correlated subquery** references a column from the outer query. It executes once per outer row, which can be extremely slow.

### Pattern: Correlated Subquery for Aggregation

**BAD APPROACH**

```sql
SELECT
    c.customer_id,
    c.customer_name,
    (SELECT SUM(o.total_amount)
     FROM orders o
     WHERE o.customer_id = c.customer_id) AS total_spent
FROM customers c;
```

This runs the `SUM` aggregation for **every customer** — an O(N × M) operation.

**BETTER APPROACH**

```sql
SELECT
    c.customer_id,
    c.customer_name,
    COALESCE(SUM(o.total_amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;
```

**Why this is better:**

- One pass through `orders` with grouping
- Hash join or merge join handles the relationship
- `COALESCE` ensures customers with no orders get `0` instead of `NULL`

**Expected output:**

| customer_id | customer_name | total_spent |
| ----------- | ------------- | ----------- |
| 1           | Acme Corp     | 1500.00     |
| 2           | Beta Inc      | 0.00        |
| 3           | Widget Inc    | 3200.50     |

### Pattern: Correlated Subquery for EXISTS (Keep as Subquery)

**BAD APPROACH (fan-out)**

```sql
SELECT c.customer_id, c.customer_name
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'shipped';
```

This returns **duplicate customers** if they have multiple shipped orders.

**BETTER APPROACH**

```sql
SELECT c.customer_id, c.customer_name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
    AND o.status = 'shipped'
);
```

**When to use JOIN vs EXISTS:**

| Use JOIN when                                        | Use EXISTS when                           |
| ---------------------------------------------------- | ----------------------------------------- |
| You need columns from the joined table               | You only need to know if a match exists   |
| You are aggregating from the joined table            | The joined table can have many duplicates |
| You want the data, not just the check                | You want short-circuit behavior           |
| The relationship is 1:1 or 1:N and you want all rows | You want to avoid fan-out                 |

---

## OR Conditions to UNION ALL

### Pattern: OR Preventing Index Use

**BAD APPROACH**

```sql
SELECT * FROM orders
WHERE customer_id = 100
   OR customer_id = 200
   OR customer_id = 300;
```

Some optimizers handle this well with index union, but others scan the entire table.

**BETTER APPROACH**

```sql
SELECT * FROM orders WHERE customer_id = 100
UNION ALL
SELECT * FROM orders WHERE customer_id = 200
UNION ALL
SELECT * FROM orders WHERE customer_id = 300;
```

Or simply:

```sql
SELECT * FROM orders
WHERE customer_id IN (100, 200, 300);
```

The `IN` list is usually optimized to use an index.

### Pattern: OR Across Columns

**BAD APPROACH**

```sql
SELECT * FROM orders
WHERE customer_id = 100
   OR status = 'cancelled';
```

This almost always prevents index usage on either column.

**BETTER APPROACH**

```sql
SELECT * FROM orders WHERE customer_id = 100
UNION ALL
SELECT * FROM orders WHERE status = 'cancelled'
AND customer_id <> 100;
```

The `customer_id <> 100` prevents duplicate rows. This lets the optimizer use separate indexes on `customer_id` and `status`.

> **Important:** `UNION ALL` is faster than `UNION` because it does not remove duplicates. Use `UNION ALL` with `EXCEPT` or explicit dedup logic when needed.

---

## Rewriting with Window Functions

### Pattern: Row Number per Group

**BAD APPROACH (correlated subquery)**

```sql
SELECT
    o.order_id,
    o.customer_id,
    o.order_date,
    o.total_amount
FROM orders o
WHERE o.order_date = (
    SELECT MAX(o2.order_date)
    FROM orders o2
    WHERE o2.customer_id = o.customer_id
);
```

This finds the **latest order per customer** but returns ALL orders if there is a tie.

**BETTER APPROACH**

```sql
WITH ranked AS (
    SELECT
        order_id,
        customer_id,
        order_date,
        total_amount,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY order_date DESC
        ) AS rn
    FROM orders
)
SELECT order_id, customer_id, order_date, total_amount
FROM ranked
WHERE rn = 1;
```

**Why this is better:**

- One scan of the `orders` table
- `ROW_NUMBER()` assigns 1 to exactly one row per customer (no ties)
- Use `RANK()` if you want to include ties

| Function       | Ties                                 |
| -------------- | ------------------------------------ |
| `ROW_NUMBER()` | Always exactly one row per partition |
| `RANK()`       | Same rank for ties, skips next ranks |
| `DENSE_RANK()` | Same rank for ties, no gaps          |

### Pattern: Running Total

**BAD APPROACH (correlated subquery)**

```sql
SELECT
    o1.order_id,
    o1.order_date,
    o1.total_amount,
    (SELECT SUM(o2.total_amount)
     FROM orders o2
     WHERE o2.customer_id = o1.customer_id
     AND o2.order_date <= o1.order_date) AS running_total
FROM orders o1;
```

**BETTER APPROACH**

```sql
SELECT
    order_id,
    customer_id,
    order_date,
    total_amount,
    SUM(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;
```

> **Note:** Window functions cannot be used in `WHERE` or `HAVING`. You need a CTE or subquery to filter on window function results.

---

## Eliminating Redundant DISTINCT

### Pattern: DISTINCT as a Crutch

**BAD APPROACH**

```sql
SELECT DISTINCT
    c.customer_id,
    c.customer_name,
    o.order_date
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id;
```

If `orders` has multiple rows per customer, `DISTINCT` hides the duplicates but does not fix the underlying issue.

**BETTER APPROACH: If you want one row per customer:**

```sql
SELECT
    c.customer_id,
    c.customer_name,
    MAX(o.order_date) AS latest_order_date
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;
```

**BETTER APPROACH: If you want all orders:**

```sql
SELECT
    c.customer_id,
    c.customer_name,
    o.order_date
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id;
```

No `DISTINCT` needed — the duplicates are expected.

> **Production pitfall:** `SELECT DISTINCT` hides fan-out bugs. If you think you need `DISTINCT`, first check whether your JOIN is creating unintended duplicates.

---

## Derived Table Elimination

### Pattern: Unnecessary Derived Table

**BAD APPROACH**

```sql
SELECT *
FROM (
    SELECT customer_id, SUM(total_amount) AS total_spent
    FROM orders
    GROUP BY customer_id
) AS customer_totals
WHERE total_spent > 1000;
```

**BETTER APPROACH**

```sql
SELECT customer_id, SUM(total_amount) AS total_spent
FROM orders
GROUP BY customer_id
HAVING SUM(total_amount) > 1000;
```

The `HAVING` clause filters after grouping without needing a derived table.

### When Derived Tables Are Necessary

When you need to **filter on a window function result**:

```sql
-- Window functions cannot be in WHERE or HAVING
SELECT *
FROM (
    SELECT
        order_id,
        customer_id,
        total_amount,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY total_amount DESC
        ) AS rn
    FROM orders
) ranked
WHERE rn <= 3;
```

---

## SARGable Rewriting

**SARGable** = **S**earch **ARG**ument + **able**. A predicate is SARGable if the database can use an index to satisfy it.

### Pattern: Function on Column (Non-SARGable)

**BAD APPROACH**

```sql
-- Cannot use index on order_date
SELECT * FROM orders
WHERE YEAR(order_date) = 2025;

-- Cannot use index on salary
SELECT * FROM employees
WHERE salary * 12 > 100000;
```

**BETTER APPROACH**

```sql
-- SARGable: index on order_date can be used
SELECT * FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2026-01-01';

-- SARGable
SELECT * FROM employees
WHERE salary > 100000 / 12;
```

### Pattern: LIKE with Leading Wildcard

**BAD APPROACH (non-SARGable)**

```sql
SELECT * FROM customers
WHERE email LIKE '%@gmail.com';
```

A leading `%` prevents index usage on `email`.

**BETTER APPROACH**

```sql
-- Use a suffix match (SARGable with a suffix index)
SELECT * FROM customers
WHERE email LIKE 'user%@gmail.com';

-- Or use a function-based index (PostgreSQL)
CREATE INDEX idx_email_suffix ON customers (REVERSE(email));
SELECT * FROM customers
WHERE REVERSE(email) LIKE 'moc.liamg@%';
```

### Pattern: OR on Different Columns

**BAD APPROACH (non-SARGable)**

```sql
SELECT * FROM orders
WHERE customer_id = 100
   OR order_date > '2025-01-01';
```

**BETTER APPROACH**

```sql
SELECT * FROM orders WHERE customer_id = 100
UNION ALL
SELECT * FROM orders
WHERE order_date > '2025-01-01'
  AND customer_id <> 100;
```

### SARGability Checklist

| Non-SARGable                         | SARGable                                           |
| ------------------------------------ | -------------------------------------------------- |
| `WHERE YEAR(col) = 2025`             | `WHERE col >= '2025-01-01' AND col < '2026-01-01'` |
| `WHERE col + 1 = 10`                 | `WHERE col = 9`                                    |
| `WHERE col * 12 > 100000`            | `WHERE col > 8333.33`                              |
| `WHERE LIKE '%text'`                 | `WHERE LIKE 'text%'`                               |
| `WHERE SUBSTRING(col, 1, 3) = 'abc'` | `WHERE col LIKE 'abc%'`                            |
| `WHERE UPPER(col) = 'ABC'`           | Use a functional index                             |
| `WHERE COALESCE(col, '') = ''`       | `WHERE col IS NULL OR col = ''`                    |

---

## UNION vs UNION ALL

```sql
-- UNION: removes duplicates (requires sorting or hashing)
SELECT customer_id FROM orders WHERE status = 'shipped'
UNION
SELECT customer_id FROM orders WHERE status = 'delivered';

-- UNION ALL: keeps all rows (no dedup cost)
SELECT customer_id FROM orders WHERE status = 'shipped'
UNION ALL
SELECT customer_id FROM orders WHERE status = 'delivered';
```

| Feature           | UNION                     | UNION ALL                                             |
| ----------------- | ------------------------- | ----------------------------------------------------- |
| Duplicate removal | Yes                       | No                                                    |
| Performance       | Slower (dedup)            | Faster                                                |
| Use when          | You need distinct results | You know there are no duplicates or you want all rows |

> **Interview trap:** "Which is faster — `UNION` or `UNION ALL`?" Answer: `UNION ALL` is faster because it skips duplicate removal. But they are not interchangeable — use `UNION` when you need distinct results.

---

## Pagination Rewriting

### Pattern: OFFSET-Based Pagination (Slow for Large Offsets)

**BAD APPROACH (slow for large page numbers)**

```sql
-- Page 1000 (skipping 999,999 rows)
SELECT * FROM orders
ORDER BY order_id
LIMIT 10 OFFSET 999990;
```

The database must scan and discard 999,990 rows.

**BETTER APPROACH: Keyset Pagination**

```sql
-- Page 1000 using keyset pagination
SELECT * FROM orders
WHERE order_id > 999990  -- last seen order_id from previous page
ORDER BY order_id
LIMIT 10;
```

This uses the index on `order_id` to jump directly to the right position.

### Comparison

| Feature                         | OFFSET/LIMIT   | Keyset Pagination           |
| ------------------------------- | -------------- | --------------------------- |
| Simple                          | Yes            | Slightly more complex       |
| Fast for page 1                 | Yes            | Yes                         |
| Fast for page 10000             | No (O(offset)) | Yes (O(log n))              |
| Can jump to any page            | Yes            | No (must know previous key) |
| Consistent with inserts/deletes | No (drift)     | Yes                         |

> **Keyset pagination** is preferred for large datasets and infinite scroll. It requires a **sequential column** (or composite key) to paginate on.

---

## NULL-Safe Rewriting

### Pattern: NULL in Aggregation

```sql
CREATE TABLE survey_responses (
    response_id INT PRIMARY KEY,
    user_id     INT,
    score       INT NULL
);

INSERT INTO survey_responses VALUES (1, 101, 5);
INSERT INTO survey_responses VALUES (2, 101, NULL);
INSERT INTO survey_responses VALUES (3, 101, 3);
```

**BAD APPROACH**

```sql
-- Returns 4, not 4
SELECT user_id, SUM(score) / COUNT(score) AS avg_score
FROM survey_responses
GROUP BY user_id;
```

Wait — `COUNT(score)` excludes NULLs. This gives `8 / 2 = 4`. But if you use `COUNT(*)`:

```sql
-- Returns 8 / 3 = 2.67 (wrong)
SELECT user_id, SUM(score) / COUNT(*) AS avg_score
FROM survey_responses
GROUP BY user_id;
```

**BETTER APPROACH**

```sql
-- Use AVG() which handles NULLs correctly
SELECT user_id, AVG(score) AS avg_score
FROM survey_responses
GROUP BY user_id;
```

`AVG(score)` ignores NULLs in both numerator and denominator.

### Pattern: NULL in WHERE

**BAD APPROACH**

```sql
-- Does NOT match NULL values
SELECT * FROM customers
WHERE email <> 'test@example.com';
```

**BETTER APPROACH**

```sql
SELECT * FROM customers
WHERE email <> 'test@example.com'
   OR email IS NULL;
```

Or use `IS DISTINCT FROM` (PostgreSQL, DB2):

```sql
-- PostgreSQL
SELECT * FROM customers
WHERE email IS DISTINCT FROM 'test@example.com';
```

### NULL Behavior in Rewriting

| Expression                  | NULL behavior                                                    |
| --------------------------- | ---------------------------------------------------------------- |
| `NULL = NULL`               | Unknown (not TRUE)                                               |
| `NULL <> NULL`              | Unknown (not TRUE)                                               |
| `NULL IN (1, 2, NULL)`      | Unknown if no match, TRUE if match                               |
| `NOT IN (1, 2, NULL)`       | Always empty (see [NOT IN vs NOT EXISTS](#not-in-vs-not-exists)) |
| `NULL AND TRUE`             | Unknown                                                          |
| `NULL OR TRUE`              | TRUE                                                             |
| `COUNT(NULL)`               | 0 (excluded)                                                     |
| `COUNT(*)`                  | Counts all rows including NULLs                                  |
| `SUM(NULL)`                 | NULL                                                             |
| `COALESCE(NULL, 'default')` | `'default'`                                                      |

---

## Rewriting CASE Expressions

### Pattern: Pivot with CASE

```sql
-- Count orders by status per customer
SELECT
    c.customer_id,
    c.customer_name,
    SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS shipped_count,
    SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
    SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.customer_name;
```

### Pattern: Conditional Aggregation

```sql
-- Total shipped amount per customer
SELECT
    customer_id,
    SUM(CASE WHEN status = 'shipped' THEN total_amount ELSE 0 END) AS shipped_total,
    SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) AS delivered_total
FROM orders
GROUP BY customer_id;
```

### Rewriting Negated CASE

**BAD APPROACH**

```sql
SELECT
    CASE WHEN status = 'cancelled' THEN 'No'
         WHEN status = 'shipped' THEN 'Yes'
         WHEN status = 'delivered' THEN 'Yes'
         ELSE 'Unknown'
    END AS is_active
FROM orders;
```

**BETTER APPROACH**

```sql
SELECT
    CASE WHEN status IN ('shipped', 'delivered') THEN 'Yes'
         WHEN status = 'cancelled' THEN 'No'
         ELSE 'Unknown'
    END AS is_active
FROM orders;
```

---

## Common Mistakes

### 1. Fan-Out from One-to-Many JOIN

```sql
-- WRONG: counts orders, not customers
SELECT COUNT(DISTINCT c.customer_id)
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id;

-- WRONG without DISTINCT: double counts
SELECT c.customer_id, SUM(o.total_amount)
FROM customers c
JOIN order_items oi ON oi.order_id = o.order_id  -- WRONG JOIN
JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id;
```

> **Production pitfall:** Always ask: "Does the JOIN increase the number of rows?" If yes, you may need `DISTINCT`, `GROUP BY`, `EXISTS`, or a different approach.

### 2. Using WHERE Instead of HAVING

**BAD APPROACH**

```sql
SELECT customer_id, COUNT(*) AS order_count
FROM orders
WHERE COUNT(*) > 5  -- ERROR
GROUP BY customer_id;
```

**BETTER APPROACH**

```sql
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 5;
```

### 3. Missing GROUP BY Columns

```sql
-- WRONG (MySQL with non-strict mode may allow this)
SELECT customer_id, customer_name, COUNT(*)
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY customer_id;

-- CORRECT (PostgreSQL, SQL Server strict mode, Oracle)
SELECT o.customer_id, c.customer_name, COUNT(*)
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
GROUP BY o.customer_id, c.customer_name;
```

### 4. Joining on Wrong Column

```sql
-- WRONG: creates Cartesian product
SELECT *
FROM orders o
JOIN customers c ON c.region = o.status;

-- RIGHT
SELECT *
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id;
```

> **Interview trap:** The interviewer may subtly change a column name in the JOIN condition. Always verify the JOIN condition matches the relationship semantics.

---

## Production Pitfalls

### 1. Hidden Cartesian Products

```sql
-- DANGER: accidental Cartesian product if join condition is missing or wrong
SELECT COUNT(*) FROM orders, customers;
-- Returns: orders_count × customers_count
```

Always use explicit `JOIN ... ON` syntax.

### 2. NOT IN with NULL Subqueries

```sql
-- Returns empty set if any NULL exists in subquery
SELECT * FROM products
WHERE category_id NOT IN (
    SELECT category_id FROM categories  -- includes NULL
);
```

Use `NOT EXISTS` or add `WHERE category_id IS NOT NULL`.

### 3. Implicit Type Conversion

```sql
-- May prevent index usage
SELECT * FROM orders WHERE order_id = '12345';
-- order_id is INT, '12345' is VARCHAR

-- SARGable
SELECT * FROM orders WHERE order_id = 12345;
```

### 4. SELECT \* in Production

```sql
-- BAD: fetches all columns, prevents covering indexes
SELECT * FROM orders WHERE customer_id = 100;

-- GOOD: only fetch what you need
SELECT order_id, order_date, total_amount FROM orders WHERE customer_id = 100;
```

### 5. Long-Running UPDATE with Subquery

**BAD APPROACH**

```sql
UPDATE employees
SET salary = salary * 1.1
WHERE department_id IN (
    SELECT department_id FROM departments WHERE budget > 1000000
);
```

**BETTER APPROACH (PostgreSQL)**

```sql
UPDATE employees e
SET salary = salary * 1.1
FROM departments d
WHERE e.department_id = d.department_id
AND d.budget > 1000000;
```

---

## Performance Implications

### Always Verify with Execution Plans

```sql
-- PostgreSQL / MySQL / SQLite
EXPLAIN ANALYZE
SELECT ...

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT ...

-- Oracle
EXPLAIN PLAN FOR
SELECT ...
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

### What to Look For in Execution Plans

| Red flag                          | What it means                                      |
| --------------------------------- | -------------------------------------------------- |
| `Seq Scan` on large table         | No index used — check SARGability                  |
| `Nested Loop` with high row count | May need a hash join or merge join                 |
| `Sort` on large result            | Check if ORDER BY can use an index                 |
| `HashAggregate` with high memory  | Large GROUP BY — consider indexing or partitioning |
| `Hash Join` with high cost        | Large tables — check statistics are up to date     |

### Factors Affecting Performance

Do **not** claim any rewrite is universally faster. Performance depends on:

- **Optimizer**: Each database engine optimizes differently
- **Indexes**: A rewrite may be faster only with certain indexes
- **Statistics**: Outdated statistics lead to poor plans
- **Cardinality**: Optimizer estimates based on row counts
- **Data distribution**: Skewed data affects join strategy choice
- **Query shape**: Correlated vs. non-correlated matters
- **Data volume**: What works for 1,000 rows may not work for 1 billion rows
- **Locking/concurrency**: Rewrites may change lock scope

---

## Interview Questions

### Beginner

1. What is the difference between `IN` and `EXISTS`?
2. Why does `NOT IN` with NULLs return unexpected results?
3. What is the difference between `UNION` and `UNION ALL`?
4. What does SARGable mean? Give an example of a non-SARGable predicate.
5. Why is `SELECT DISTINCT` sometimes a code smell?

### Intermediate

6. When should you rewrite a correlated subquery as a JOIN? When should you not?
7. Explain the difference between `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`. When does it matter?
8. What is the difference between `WHERE` and `HAVING`? Can `HAVING` be used without `GROUP BY`?
9. Why might a `LEFT JOIN` become an `INNER JOIN`? How do you prevent it?
10. What is fan-out and how does it affect aggregation?

### Advanced

11. You have a query: `SELECT * FROM t1 WHERE id NOT IN (SELECT id FROM t2)`. The subquery returns NULLs. What happens? Rewrite it correctly.
12. Explain the difference between `EXISTS` and `IN` in terms of three-valued logic.
13. How would you rewrite an OFFSET-based pagination query for a table with 100 million rows?
14. A query with `OR` across two indexed columns is slow. Rewrite it to use indexes efficiently.
15. Explain why `WHERE YEAR(order_date) = 2025` is non-SARGable and provide two alternative rewrites.

### Scenario Based

16. **Scenario:** You have an `orders` table (10M rows) and a `customers` table (100K rows). Write a query to find all customers who have placed at least one order. Which approach would you recommend and why — `JOIN`, `EXISTS`, or `IN`?
17. **Scenario:** You need to find the top 3 orders by amount per customer. Write the query using window functions. What happens if two orders have the same amount?
18. **Scenario:** A production query uses `NOT IN` against a column that occasionally has NULLs. Users report that sometimes the query returns zero rows. Explain why and fix it.
19. **Scenario:** You have a query that runs in 0.1 seconds with `OFFSET 0` but takes 30 seconds with `OFFSET 100000`. Explain why and rewrite it.
20. **Scenario:** You need to pivot order statuses into columns for a report. Write the query using conditional aggregation.

### Tricky

21. What is the result of `SELECT * FROM t WHERE x NOT IN (SELECT y FROM t2)` when `t2` is empty?
22. What is the result of `SELECT * FROM t WHERE x IN (SELECT y FROM t2)` when `t2` is empty?
23. Can `HAVING` be used without `GROUP BY`? If so, when?
24. Does `SELECT DISTINCT` always mean the query has a problem?
25. Is `EXISTS` always faster than `IN`? Explain.

### Output Prediction

26. Given:

```sql
CREATE TABLE a (id INT);
INSERT INTO a VALUES (1), (2), (3);

CREATE TABLE b (id INT);
INSERT INTO b VALUES (1), (NULL);

SELECT * FROM a WHERE id NOT IN (SELECT id FROM b);
```

What is the output?

27. Given:

```sql
CREATE TABLE x (val INT);
INSERT INTO x VALUES (1), (2), (3), (NULL);

SELECT COUNT(*) FROM x;
SELECT COUNT(val) FROM x;
SELECT COUNT(DISTINCT val) FROM x;
```

What are the three outputs?

28. Given:

```sql
SELECT
    CASE WHEN NULL = NULL THEN 'true'
         ELSE 'false'
    END;
```

What is the output?

### Debugging

29. This query returns duplicate rows. Diagnose and fix:

```sql
SELECT c.customer_name, o.order_date, p.product_name
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON p.product_id = oi.product_id;
```

30. This query returns an empty set when it should not. Diagnose and fix:

```sql
SELECT * FROM employees
WHERE department_id NOT IN (
    SELECT department_id FROM departments
);
```

### Performance

31. Which query is faster and why? Verify your answer with `EXPLAIN ANALYZE`.

```sql
-- Query A
SELECT customer_id
FROM orders
WHERE customer_id IN (SELECT customer_id FROM customers WHERE region = 'West');

-- Query B
SELECT customer_id
FROM orders o
WHERE EXISTS (
    SELECT 1 FROM customers c
    WHERE c.customer_id = o.customer_id
    AND c.region = 'West'
);
```

32. You have a query filtering on `LOWER(email) LIKE '%@company.com'`. It is slow on 10M rows. Rewrite it and suggest an index.

33. A query uses `SELECT DISTINCT` after a `JOIN`. Explain why this might indicate a performance problem and how to fix it.
