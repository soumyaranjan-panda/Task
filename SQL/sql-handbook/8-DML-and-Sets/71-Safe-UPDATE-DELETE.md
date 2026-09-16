# Safe UPDATE and DELETE in SQL

## Why This Section Matters

Uncontrolled `UPDATE` and `DELETE` statements are among the most dangerous operations in SQL. A missing `WHERE` clause can modify or destroy every row in a table. This section teaches you how to write `UPDATE` and `DELETE` statements that are predictable, reversible, and safe for production systems.

> Production pitfall
> A single `UPDATE employees SET salary = 0;` without a `WHERE` clause will zero out every employee's salary. There is no "undo" button in most databases.

---

## Table of Contents

1. [The Core Problem](#1-the-core-problem)
2. [Sample Tables](#2-sample-tables)
3. [The Golden Rule: SELECT First](#3-the-golden-rule-select-first)
4. [Transactions for Safety](#4-transactions-for-safety)
5. [Using LIMIT in UPDATE/DELETE](#5-using-limit-in-updatedelete)
6. [Subqueries for Controlled DML](#6-subqueries-for-controlled-dml)
7. [JOINs in UPDATE/DELETE](#7-joins-in-updatedelete)
8. [CTEs with UPDATE/DELETE](#8-ctes-with-updatedelete)
9. [Batch Processing for Large Changes](#9-batch-processing-for-large-changes)
10. [Soft Delete vs Hard Delete](#10-soft-delete-vs-hard-delete)
11. [Cascading Deletes and Referential Integrity](#11-cascading-deletes-and-referential-integrity)
12. [Execution Plans Before DML](#12-execution-plans-before-dml)
13. [Comparison Tables](#13-comparison-tables)
14. [Edge Cases and NULL Behavior](#14-edge-cases-and-null-behavior)
15. [Common Mistakes](#15-common-mistakes)
16. [Performance Considerations](#16-performance-considerations)
17. [Interview Questions](#17-interview-questions)

---

## 1. The Core Problem

### What Happens Without Safety Measures

```sql
-- DANGEROUS: No WHERE clause
UPDATE employees
SET status = 'inactive';

-- This just destroyed the status of every employee in the table.
-- How do you recover? You don't — unless you have a backup or transaction.
```

```sql
-- DANGEROUS: WHERE clause references wrong column
DELETE FROM orders
WHERE customer_id = 100;
-- What if customer_id 100 has 50,000 orders?
-- What if you meant to delete order_id 100?
```

### Why It Happens

| Cause                  | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| Missing WHERE clause   | Every row is affected                                                       |
| Incorrect WHERE clause | Wrong rows are affected                                                     |
| No transaction         | Changes cannot be rolled back                                               |
| No row count check     | You don't know how many rows were affected                                  |
| No preview             | You never verified which rows would change                                  |
| Implicit type coercion | `WHERE id = '123'` vs `WHERE id = 123` behave differently in some databases |

---

## 2. Sample Tables

Throughout this section we use the following tables.

### employees

One row per employee.

| id  | name  | department_id | salary | status   | hire_date  |
| --- | ----- | ------------- | ------ | -------- | ---------- |
| 1   | Alice | 1             | 95000  | active   | 2019-03-15 |
| 2   | Bob   | 1             | 82000  | active   | 2020-07-22 |
| 3   | Carol | 2             | 110000 | active   | 2018-01-10 |
| 4   | Dave  | 2             | 75000  | inactive | 2021-11-30 |
| 5   | Eve   | 3             | 68000  | active   | 2022-05-18 |
| 6   | Frank | NULL          | 72000  | active   | 2023-02-14 |
| 7   | Grace | 1             | 98000  | active   | 2017-09-01 |

### orders

One row per order.

| id  | customer_id | order_date | total  | status    |
| --- | ----------- | ---------- | ------ | --------- |
| 101 | 10          | 2024-01-15 | 250.00 | completed |
| 102 | 10          | 2024-02-20 | 180.00 | completed |
| 103 | 20          | 2024-03-10 | 420.00 | pending   |
| 104 | 20          | 2024-04-05 | 95.00  | cancelled |
| 105 | 30          | 2024-05-12 | 310.00 | completed |
| 106 | 10          | 2024-06-01 | 75.00  | pending   |

### departments

One row per department.

| id  | name        | budget |
| --- | ----------- | ------ |
| 1   | Engineering | 500000 |
| 2   | Marketing   | 300000 |
| 3   | Support     | 200000 |

### order_items

One row per line item in an order.

| id  | order_id | product_id | quantity | price  |
| --- | -------- | ---------- | -------- | ------ |
| 1   | 101      | 1          | 2        | 50.00  |
| 2   | 101      | 2          | 1        | 150.00 |
| 3   | 102      | 3          | 3        | 60.00  |
| 4   | 103      | 1          | 1        | 50.00  |
| 5   | 103      | 2          | 2        | 185.00 |
| 6   | 104      | 4          | 1        | 95.00  |
| 7   | 105      | 2          | 1        | 310.00 |
| 8   | 106      | 3          | 1        | 75.00  |

---

## 3. The Golden Rule: SELECT First

Before running any `UPDATE` or `DELETE`, **always** run the same `WHERE` clause as a `SELECT` to preview exactly which rows will be affected.

### The Pattern

```sql
-- STEP 1: Preview
SELECT *
FROM employees
WHERE status = 'inactive'
  AND hire_date < '2020-01-01';

-- STEP 2: Verify the result set is what you expect

-- STEP 3: Run the actual DML
DELETE FROM employees
WHERE status = 'inactive'
  AND hire_date < '2020-01-01';
```

### Counting Rows Before Changing

```sql
-- Always count first
SELECT COUNT(*) AS rows_to_update
FROM employees
WHERE department_id = 2
  AND salary > 100000;
-- Result: 1 (Carol)

-- Now you know exactly how many rows will change
UPDATE employees
SET salary = salary * 0.95
WHERE department_id = 2
  AND salary > 100000;
```

> Best practice
> Never run an `UPDATE` or `DELETE` in production without first knowing the exact row count. If the count is unexpectedly high, stop and investigate.

---

## 4. Transactions for Safety

Wrap your DML in a transaction so you can roll back if something goes wrong.

### Basic Pattern

```sql
BEGIN;

-- Preview
SELECT COUNT(*)
FROM employees
WHERE status = 'inactive';
-- Result: 1

-- Execute
DELETE FROM employees
WHERE status = 'inactive';

-- Verify the change
SELECT COUNT(*)
FROM employees
WHERE status = 'inactive';
-- Result: 0

-- If everything looks good:
COMMIT;

-- If something went wrong:
-- ROLLBACK;
```

### PostgreSQL

```sql
BEGIN;

UPDATE employees
SET salary = salary + 5000
WHERE department_id = 1;

-- Check how many rows were affected
-- In psql, you see "UPDATE 3" in the status line

ROLLBACK;  -- undo everything
```

### MySQL

```sql
START TRANSACTION;

UPDATE employees
SET salary = salary + 5000
WHERE department_id = 1;

-- If using a client, check affected rows
-- ROLLBACK to undo, COMMIT to save
ROLLBACK;
```

### SQL Server

```sql
BEGIN TRANSACTION;

UPDATE employees
SET salary = salary + 5000
WHERE department_id = 1;

-- Check @@ROWCOUNT
SELECT @@ROWCOUNT AS rows_affected;

ROLLBACK;  -- or COMMIT
```

### Oracle

```sql
-- Oracle uses implicit transactions per statement
-- Use SAVEPOINT for partial rollback
SAVEPOINT before_update;

UPDATE employees
SET salary = salary + 5000
WHERE department_id = 1;

ROLLBACK TO before_update;  -- undo just this update
```

> Production pitfall
> In MySQL with MyISAM engine, transactions are not supported. Always use InnoDB for transactional safety.

### Verifying Row Count After DML

Each database provides a way to check how many rows were affected:

| Database   | Method                                   |
| ---------- | ---------------------------------------- |
| PostgreSQL | Client status message (e.g., `UPDATE 3`) |
| MySQL      | `ROW_COUNT()` or client status           |
| SQL Server | `@@ROWCOUNT`                             |
| Oracle     | `SQL%ROWCOUNT` (in PL/SQL)               |

---

## 5. Using LIMIT in UPDATE/DELETE

Sometimes you want to process only a fixed number of rows at a time.

### MySQL / PostgreSQL: LIMIT with DELETE

```sql
-- Delete 100 oldest orders at a time
DELETE FROM orders
WHERE status = 'cancelled'
ORDER BY order_date ASC
LIMIT 100;
```

### MySQL: LIMIT with UPDATE

```sql
-- Update 50 rows at a time
UPDATE employees
SET status = 'reviewed'
WHERE status = 'pending'
LIMIT 50;
```

### PostgreSQL: LIMIT with UPDATE

```sql
-- PostgreSQL does not support LIMIT directly in UPDATE
-- Use a CTE instead

WITH rows_to_update AS (
    SELECT id
    FROM employees
    WHERE status = 'pending'
    ORDER BY id
    LIMIT 50
)
UPDATE employees
SET status = 'reviewed'
FROM rows_to_update
WHERE employees.id = rows_to_update.id;
```

### SQL Server: TOP with UPDATE

```sql
-- SQL Server uses TOP instead of LIMIT
UPDATE TOP (50) employees
SET status = 'reviewed'
WHERE status = 'pending';
```

### SQL Server: CTE approach (more flexible)

```sql
WITH cte AS (
    SELECT TOP (50) *
    FROM employees
    WHERE status = 'pending'
    ORDER BY id
)
UPDATE cte
SET status = 'reviewed';
```

### Oracle: ROWNUM with UPDATE

```sql
-- Oracle: use a subquery with ROWNUM
UPDATE employees
SET status = 'reviewed'
WHERE id IN (
    SELECT id
    FROM (
        SELECT id
        FROM employees
        WHERE status = 'pending'
        ORDER BY id
    )
    WHERE ROWNUM <= 50
);
```

> Best practice
> Use batched DML (LIMIT/TOP) when modifying large tables. Updating millions of rows in one statement can lock the table for extended periods, fill up transaction logs, and cause replication lag.

---

## 6. Subqueries for Controlled DML

Subqueries let you base your `UPDATE` or `DELETE` on data from another table or a complex condition.

### UPDATE with Subquery

```sql
-- Give a 10% raise to employees in the highest-budget department

UPDATE employees
SET salary = salary * 1.10
WHERE department_id = (
    SELECT id
    FROM departments
    ORDER BY budget DESC
    LIMIT 1
);
```

### DELETE with Subquery

```sql
-- Delete orders that have no items

DELETE FROM orders
WHERE id NOT IN (
    SELECT DISTINCT order_id
    FROM order_items
);
```

> Production pitfall
> The `NOT IN` with a subquery that returns NULLs will return zero rows. See [NULL behavior section](#14-edge-cases-and-null-behavior). Use `NOT EXISTS` instead.

### Safer Version Using NOT EXISTS

```sql
-- This is safe even if order_items.order_id contains NULLs
DELETE FROM orders
WHERE NOT EXISTS (
    SELECT 1
    FROM order_items
    WHERE order_items.order_id = orders.id
);
```

### UPDATE Using Another Table (PostgreSQL)

```sql
-- Update employee salaries based on department budget
UPDATE employees e
SET salary = salary * (1 + d.budget / 1000000.0)
FROM departments d
WHERE e.department_id = d.id;
```

### UPDATE Using Another Table (MySQL)

```sql
-- MySQL uses JOIN syntax in UPDATE
UPDATE employees e
JOIN departments d ON e.department_id = d.id
SET e.salary = e.salary * (1 + d.budget / 1000000.0);
```

### UPDATE Using Another Table (SQL Server)

```sql
-- SQL Server supports JOIN in UPDATE
UPDATE e
SET e.salary = e.salary * (1 + d.budget / 1000000.0)
FROM employees e
JOIN departments d ON e.department_id = d.id;
```

### UPDATE Using Another Table (Oracle)

```sql
-- Oracle uses MERGE or correlated UPDATE
UPDATE employees e
SET salary = salary * (1 + (
    SELECT d.budget / 1000000.0
    FROM departments d
    WHERE d.id = e.department_id
))
WHERE EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.id = e.department_id
);
```

---

## 7. JOINs in UPDATE/DELETE

JOINs in `UPDATE`/`DELETE` are powerful but dangerous. They are database-specific and can cause unintended row duplication.

### MySQL: Multi-Table UPDATE

```sql
-- Update order totals based on order_items
UPDATE orders o
JOIN (
    SELECT order_id, SUM(quantity * price) AS computed_total
    FROM order_items
    GROUP BY order_id
) oi ON o.id = oi.order_id
SET o.total = oi.computed_total;
```

### MySQL: Multi-Table DELETE

```sql
-- Delete order_items for cancelled orders
DELETE oi
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'cancelled';
```

> Production pitfall
> In MySQL, when you join in an UPDATE, a single source row can match multiple target rows, causing duplication. Always verify your JOIN condition produces a 1:1 relationship or use aggregate subqueries.

### PostgreSQL: UPDATE with FROM

```sql
UPDATE orders o
SET total = oi.computed_total
FROM (
    SELECT order_id, SUM(quantity * price) AS computed_total
    FROM order_items
    GROUP BY order_id
) oi
WHERE o.id = oi.order_id;
```

### PostgreSQL: DELETE with JOIN

```sql
-- PostgreSQL uses USING for JOIN in DELETE
DELETE FROM order_items oi
USING orders o
WHERE oi.order_id = o.id
  AND o.status = 'cancelled';
```

### SQL Server: UPDATE with JOIN

```sql
UPDATE o
SET o.total = oi.computed_total
FROM orders o
JOIN (
    SELECT order_id, SUM(quantity * price) AS computed_total
    FROM order_items
    GROUP BY order_id
) oi ON o.id = oi.order_id;
```

### SQL Server: DELETE with JOIN

```sql
DELETE oi
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'cancelled';
```

### Oracle: Does Not Support JOIN in UPDATE/DELETE

Use `MERGE` for updates or subqueries for deletes:

```sql
-- Oracle: MERGE for updates
MERGE INTO orders o
USING (
    SELECT order_id, SUM(quantity * price) AS computed_total
    FROM order_items
    GROUP BY order_id
) oi
ON (o.id = oi.order_id)
WHEN MATCHED THEN
    UPDATE SET o.total = oi.computed_total;

-- Oracle: Subquery for deletes
DELETE FROM order_items
WHERE order_id IN (
    SELECT id FROM orders WHERE status = 'cancelled'
);
```

---

## 8. CTEs with UPDATE/DELETE

CTEs (Common Table Expressions) provide a clean, readable way to identify rows before modifying them.

### PostgreSQL / SQL Server: CTE with UPDATE

```sql
-- Identify employees who need a raise, then update them
WITH underpaid AS (
    SELECT e.id, e.salary, d.budget
    FROM employees e
    JOIN departments d ON e.department_id = d.id
    WHERE e.salary < d.budget * 0.0002
)
UPDATE employees
SET salary = salary * 1.15
FROM underpaid
WHERE employees.id = underpaid.id;
```

### PostgreSQL / SQL Server: CTE with DELETE

```sql
-- Delete orphaned order items
WITH orphaned_items AS (
    SELECT oi.id
    FROM order_items oi
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.id IS NULL
)
DELETE FROM order_items
USING orphaned_items
WHERE order_items.id = orphaned_items.id;
```

### MySQL 8.0+: CTE with UPDATE

```sql
-- MySQL 8.0+ supports CTEs but UPDATE with CTE is limited
-- Use a derived table or subquery approach instead

UPDATE employees
SET salary = salary * 1.15
WHERE id IN (
    SELECT id
    FROM (
        SELECT e.id
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        WHERE e.salary < d.budget * 0.0002
    ) AS underpaid
);
```

### Recursive CTE for Hierarchical Updates

```sql
-- Update all descendants in an org chart
-- (PostgreSQL / SQL Server)

WITH RECURSIVE org_tree AS (
    -- Anchor: start with the manager
    SELECT id, name, manager_id, level
    FROM employees
    WHERE id = 1

    UNION ALL

    -- Recursive: find direct reports
    SELECT e.id, e.name, e.manager_id, e.level
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
)
UPDATE employees
SET level = level + 1
WHERE id IN (SELECT id FROM org_tree);
```

---

## 9. Batch Processing for Large Changes

When updating or deleting millions of rows, do it in batches to avoid locking issues and transaction log growth.

### The Batch Pattern (PostgreSQL)

```sql
-- Delete in batches of 1000
-- Run this in a loop until 0 rows are affected

DELETE FROM orders
WHERE created_at < '2020-01-01'
  AND id IN (
      SELECT id
      FROM orders
      WHERE created_at < '2020-01-01'
      ORDER BY id
      LIMIT 1000
  );
```

### The Batch Pattern (MySQL)

```sql
-- MySQL: use LIMIT in DELETE
DELETE FROM orders
WHERE created_at < '2020-01-01'
ORDER BY id
LIMIT 1000;
-- Repeat until 0 rows affected
```

### The Batch Pattern (SQL Server)

```sql
-- SQL Server: use TOP
DECLARE @batch_size INT = 1000;

WHILE 1 = 1
BEGIN
    DELETE TOP (@batch_size)
    FROM orders
    WHERE created_at < '2020-01-01';

    IF @@ROWCOUNT = 0 BREAK;
END
```

### The Batch Pattern (PL/pgSQL - PostgreSQL)

```sql
-- PL/pgSQL loop
DO $$
DECLARE
    deleted_count INT;
BEGIN
    LOOP
        DELETE FROM orders
        WHERE id IN (
            SELECT id
            FROM orders
            WHERE created_at < '2020-01-01'
            ORDER BY id
            LIMIT 1000
        );

        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        EXIT WHEN deleted_count = 0;

        RAISE NOTICE 'Deleted % rows', deleted_count;
        PERFORM pg_sleep(0.1);  -- small pause to reduce lock contention
    END LOOP;
END $$;
```

### Batch UPDATE for Large Tables

```sql
-- PostgreSQL: update in batches
WITH batch AS (
    SELECT id
    FROM employees
    WHERE last_reviewed IS NULL
    ORDER BY id
    LIMIT 500
)
UPDATE employees
SET last_reviewed = CURRENT_DATE
FROM batch
WHERE employees.id = batch.id;
-- Repeat until 0 rows affected
```

> Production pitfall
> Large single-statement DML operations can:
>
> - Lock the table for minutes or hours
> - Fill up the transaction/WAL log
> - Cause replication lag
> - Trigger OOM errors in the database
> - Block other queries
>
> Always batch large operations.

---

## 10. Soft Delete vs Hard Delete

### Hard Delete

```sql
-- The row is physically removed from the table
DELETE FROM customers WHERE id = 42;
```

### Soft Delete

```sql
-- The row is marked as deleted but remains in the table
UPDATE customers
SET deleted_at = CURRENT_TIMESTAMP,
    is_active = false
WHERE id = 42;
```

### Comparison

| Aspect                | Hard Delete                   | Soft Delete                       |
| --------------------- | ----------------------------- | --------------------------------- |
| Reversibility         | Requires backup/restore       | Simple UPDATE to undo             |
| Storage               | Frees space immediately       | Row still occupies space          |
| Referential integrity | Can cause orphaned records    | Foreign keys still valid          |
| Audit trail           | Lost unless logged separately | Implicit audit trail              |
| Query complexity      | Simple                        | Must filter `deleted_at IS NULL`  |
| Performance           | Table may shrink              | Table grows over time             |
| Unique constraints    | Can reuse values              | Unique constraint issues possible |

### Soft Delete Pattern with View

```sql
-- Create a view that excludes soft-deleted rows
CREATE VIEW active_customers AS
SELECT *
FROM customers
WHERE deleted_at IS NULL;

-- All queries use the view
SELECT * FROM active_customers WHERE id = 42;
```

### Soft Delete Pitfall: Unique Constraints

```sql
-- If email must be unique, soft-deleting a customer blocks re-registration

-- Problem:
-- Customer A has email 'alice@example.com', soft-deleted
-- Customer B tries to register with 'alice@example.com'
-- UNIQUE constraint fails!

-- Solution: Partial unique index (PostgreSQL)
CREATE UNIQUE INDEX idx_unique_active_email
ON customers (email)
WHERE deleted_at IS NULL;

-- Solution: SQL Server
CREATE UNIQUE INDEX idx_unique_active_email
ON customers (email)
WHERE deleted_at IS NULL;  -- filtered index

-- Solution: MySQL (does not support filtered indexes)
-- Include deleted_at in the unique constraint
ALTER TABLE customers
ADD CONSTRAINT uq_email UNIQUE (email, deleted_at);
```

---

## 11. Cascading Deletes and Referential Integrity

### ON DELETE CASCADE

```sql
-- When a parent row is deleted, all child rows are automatically deleted
CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
);

-- Deleting order 104 automatically deletes all order_items where order_id = 104
DELETE FROM orders WHERE id = 104;
-- All order_items for order 104 are also deleted
```

### ON DELETE SET NULL

```sql
-- When a parent row is deleted, the foreign key column is set to NULL
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL
);

-- Deleting department 3 sets department_id = NULL for all employees in that department
DELETE FROM departments WHERE id = 3;
-- Employee 5 (Eve) now has department_id = NULL
```

### ON DELETE RESTRICT / NO ACTION

```sql
-- Prevents deletion of parent row if children exist
CREATE TABLE order_items (
    id INT PRIMARY KEY,
    order_id INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE RESTRICT
);

-- This DELETE will fail:
DELETE FROM orders WHERE id = 101;
-- ERROR: violates foreign key constraint (order_items references orders)
```

### Comparison

| Action      | Behavior                                                      | Risk                                  |
| ----------- | ------------------------------------------------------------- | ------------------------------------- |
| CASCADE     | Deletes all child rows automatically                          | Can trigger massive cascading deletes |
| SET NULL    | Sets FK to NULL                                               | May leave orphan-like data            |
| SET DEFAULT | Sets FK to default value                                      | Must ensure default exists            |
| RESTRICT    | Blocks the delete                                             | Safe but may frustrate users          |
| NO ACTION   | Similar to RESTRICT (checked at end of statement in some DBs) | Database-specific timing differences  |

> Production pitfall
> `ON DELETE CASCADE` can be dangerous. If you delete a customer, all their orders, order items, payments, and audit logs are silently destroyed. In production, prefer `RESTRICT` or `NO ACTION` and handle deletion explicitly.

> Common misconception
> `NO ACTION` and `RESTRICT` are not always the same. In PostgreSQL, `NO ACTION` allows the check to be deferred to the end of the transaction, while `RESTRICT` checks immediately.

---

## 12. Execution Plans Before DML

Databases do not always show you the execution plan for DML statements directly. You can infer it by running the equivalent SELECT.

### PostgreSQL

```sql
-- Get the plan for a DELETE
EXPLAIN ANALYZE
DELETE FROM orders
WHERE status = 'cancelled'
  AND order_date < '2024-01-01';
```

> PostgreSQL supports `EXPLAIN` directly on DML statements.

### MySQL

```sql
-- MySQL: EXPLAIN on the equivalent SELECT
EXPLAIN SELECT *
FROM orders
WHERE status = 'cancelled'
  AND order_date < '2024-01-01';

-- Then run the actual DELETE
DELETE FROM orders
WHERE status = 'cancelled'
  AND order_date < '2024-01-01';
```

### SQL Server

```sql
-- SQL Server: use SET STATISTICS IO and execution plan
SET STATISTICS IO ON;

DELETE FROM orders
WHERE status = 'cancelled'
  AND order_date < '2024-01-01';
```

### What to Look For

| Execution Plan Element            | Concern                             |
| --------------------------------- | ----------------------------------- |
| Full table scan                   | Missing index on WHERE columns      |
| High estimated rows               | May affect more rows than expected  |
| Table lock                        | Could block other transactions      |
| Sort operation                    | Large result set being ordered      |
| Nested loops with high row counts | Inefficient JOIN in multi-table DML |

> Best practice
> Always run `EXPLAIN` (or equivalent) on the equivalent `SELECT` before running a large `UPDATE` or `DELETE`. If the plan shows a full table scan on a large table, add an appropriate index first.

---

## 13. Comparison Tables

### UPDATE Safety Checklist

| Step | Action                             | Purpose                  |
| ---- | ---------------------------------- | ------------------------ |
| 1    | Write the WHERE clause as a SELECT | Preview affected rows    |
| 2    | Run COUNT(\*)                      | Know the exact row count |
| 3    | Begin a transaction                | Enable rollback          |
| 4    | Run EXPLAIN                        | Check for full scans     |
| 5    | Execute the UPDATE                 | Modify the data          |
| 6    | Verify row count matches           | Confirm expected change  |
| 7    | COMMIT or ROLLBACK                 | Finalize or undo         |

### DELETE Methods Compared

| Method                    | Use Case              | Reversible?                               | Speed            |
| ------------------------- | --------------------- | ----------------------------------------- | ---------------- |
| `DELETE FROM t WHERE ...` | Targeted removal      | With transaction                          | Moderate         |
| `TRUNCATE TABLE t`        | Remove all rows       | With transaction (PostgreSQL, SQL Server) | Fast             |
| `DROP TABLE t`            | Remove table entirely | With transaction (limited)                | Fastest          |
| Soft delete               | Audited removal       | Simple UPDATE                             | Slow (row-level) |

### Database-Specific DML Features

| Feature            | PostgreSQL     | MySQL                          | SQL Server      | Oracle             |
| ------------------ | -------------- | ------------------------------ | --------------- | ------------------ |
| `DELETE ... LIMIT` | No (use CTE)   | Yes                            | No (use TOP)    | No (use ROWNUM)    |
| `UPDATE ... LIMIT` | No (use CTE)   | Yes                            | No (use TOP)    | No (use ROWNUM)    |
| JOIN in UPDATE     | `FROM` clause  | `JOIN` syntax                  | `FROM` clause   | Subquery only      |
| JOIN in DELETE     | `USING` clause | Multi-table                    | `JOIN` syntax   | Subquery only      |
| CTE with DML       | Yes            | Yes (8.0+)                     | Yes             | Yes (12c+)         |
| `RETURNING` clause | Yes            | No                             | `OUTPUT` clause | `RETURNING` clause |
| `MERGE`            | No (use CTE)   | No (use INSERT...ON DUPLICATE) | Yes             | Yes                |
| `EXPLAIN` on DML   | Yes            | No (use SELECT equivalent)     | Limited         | Yes                |

---

## 14. Edge Cases and NULL Behavior

### NOT IN with NULLs

```sql
-- DANGEROUS: If subquery returns any NULL, NOT IN returns zero rows

-- order_items.order_id might contain NULLs (unlikely for FK, but possible)
DELETE FROM orders
WHERE id NOT IN (
    SELECT order_id
    FROM order_items
);
-- If any order_id is NULL, this deletes ZERO rows (silently!)
```

```sql
-- SAFE: Use NOT EXISTS instead
DELETE FROM orders
WHERE NOT EXISTS (
    SELECT 1
    FROM order_items
    WHERE order_items.order_id = orders.id
);
```

### NULL in WHERE Conditions

```sql
-- This does NOT match rows where department_id is NULL
UPDATE employees
SET salary = salary * 1.10
WHERE department_id = 2;
-- Rows with department_id = NULL are unaffected

-- To include NULL department employees:
UPDATE employees
SET salary = salary * 1.05
WHERE department_id = 2 OR department_id IS NULL;
```

### NULL and Comparisons in UPDATE

```sql
-- NULLIF prevents division by zero
UPDATE employees
SET bonus = salary / NULLIF(commission_rate, 0);
-- If commission_rate is 0, result is NULL instead of an error
```

### Implicit NULL Behavior in Subqueries

```sql
-- DANGEROUS: IN with NULL
UPDATE employees
SET status = 'inactive'
WHERE id NOT IN (1, 2, NULL);
-- Returns zero rows because id = NULL evaluates to UNKNOWN

-- SAFE: Use explicit NULL handling
UPDATE employees
SET status = 'inactive'
WHERE id NOT IN (1, 2)
   OR id IS NULL;  -- if you actually want to include NULLs
```

---

## 15. Common Mistakes

### Mistake 1: Missing WHERE Clause

```sql
-- TERRIBLE: Updates every row
UPDATE employees
SET salary = 0;

-- BETTER: Always include WHERE
UPDATE employees
SET salary = 0
WHERE id = 99999;
```

### Mistake 2: Using the Wrong Column in WHERE

```sql
-- WRONG: Deletes all orders for customer 100 (potentially thousands)
DELETE FROM orders
WHERE customer_id = 100;

-- RIGHT: Deletes a specific order
DELETE FROM orders
WHERE id = 100;
```

### Mistake 3: Not Using a Transaction

```sql
-- DANGEROUS: If the DELETE affects more rows than expected, no rollback
DELETE FROM orders WHERE status = 'pending';
-- What if there are 500,000 pending orders?

-- BETTER: Wrap in transaction
BEGIN;
DELETE FROM orders WHERE status = 'pending';
-- Check @@ROWCOUNT or affected rows
-- If too many: ROLLBACK
-- If correct: COMMIT
```

### Mistake 4: Updating Through a JOIN Without Aggregation

```sql
-- DANGEROUS: If multiple order_items match one order, the update runs multiple times
UPDATE orders o
JOIN order_items oi ON o.id = oi.order_id
SET o.total = oi.price * oi.quantity;
-- Order 101 has 2 items, so it gets updated twice with different values
-- Final value depends on join order (non-deterministic!)

-- BETTER: Aggregate first
UPDATE orders o
JOIN (
    SELECT order_id, SUM(price * quantity) AS total
    FROM order_items
    GROUP BY order_id
) oi ON o.id = oi.order_id
SET o.total = oi.total;
```

### Mistake 5: Deleting Without Checking Referential Integrity

```sql
-- DANGEROUS: Deleting a department that has employees
DELETE FROM departments WHERE id = 1;
-- May fail with FK constraint error, or cascade and delete employees

-- BETTER: Check for dependents first
SELECT COUNT(*) AS employee_count
FROM employees
WHERE department_id = 1;
-- Result: 3

-- Then decide: reassign employees first, or use soft delete
```

### Mistake 6: Not Verifying the Result

```sql
-- Run DML
DELETE FROM orders WHERE status = 'cancelled';
-- "Query OK, 50000 rows affected"

-- WAIT: Was that supposed to be 500 rows or 50000?
-- Always verify BEFORE and AFTER
```

### Mistake 7: Assuming DML Order

```sql
-- This is non-deterministic if multiple rows match:
UPDATE employees
SET salary = CASE
    WHEN department_id = 1 THEN salary * 1.10
    WHEN department_id = 2 THEN salary * 1.05
    ELSE salary
END
WHERE department_id IN (1, 2);
-- Works correctly, but be aware the database does not guarantee
-- the order in which rows are processed within a single statement.
```

---

## 16. Performance Considerations

### Indexes and DML Performance

```sql
-- DELETE with WHERE on an unindexed column: full table scan
DELETE FROM orders WHERE status = 'cancelled';
-- If 'status' has no index, this scans every row

-- Adding an index helps:
CREATE INDEX idx_orders_status ON orders (status);
-- Now the DELETE can use an index scan
```

> Performance depends on many factors: optimizer, indexes, statistics, cardinality, data distribution, query shape, and database engine. Always verify with `EXPLAIN` rather than assuming.

### Locking Behavior

| Database       | Default Lock Level             | Behavior                                               |
| -------------- | ------------------------------ | ------------------------------------------------------ |
| PostgreSQL     | Row-level locks                | Other transactions can read but not modify locked rows |
| MySQL (InnoDB) | Row-level locks with gap locks | Prevents phantom reads in some isolation levels        |
| SQL Server     | Row locks escalation to table  | Large deletes may escalate to table lock               |
| Oracle         | Row-level locks                | Readers do not block writers                           |

### Transaction Log Growth

```sql
-- Large DELETE generates significant WAL/transaction log
-- In PostgreSQL, a DELETE of 10 million rows generates large WAL
-- This can:
-- 1. Fill up disk
-- 2. Cause replication lag
-- 3. Slow down checkpoint

-- Mitigation: batch the delete
```

### Bulk Operations: DELETE vs TRUNCATE

```sql
-- TRUNCATE is faster for removing ALL rows
TRUNCATE TABLE logs;

-- TRUNCATE vs DELETE:
-- TRUNCATE: minimal logging, resets identity, cannot be rolled back in some DBs
-- DELETE: full logging, preserves identity, fully transactional
```

| Aspect             | DELETE   | TRUNCATE                           |
| ------------------ | -------- | ---------------------------------- |
| WHERE clause       | Yes      | No                                 |
| Row-by-row logging | Yes      | Minimal                            |
| Identity reset     | No       | Yes                                |
| Triggers           | Fires    | Does not fire                      |
| Rollback           | Always   | Depends on DB                      |
| Speed (all rows)   | Slow     | Fast                               |
| Space reclamation  | Deferred | Immediate (PostgreSQL, SQL Server) |

### Updating Indexed Columns

```sql
-- Updating a column that is part of an index causes index maintenance
-- If employees.salary is indexed:
UPDATE employees SET salary = salary * 1.10;
-- The database must update the index for every modified row

-- This is not a reason to avoid indexes — it's a reason to batch large updates
```

---

## 17. Interview Questions

### Beginner

1. What is the danger of running `DELETE FROM employees;` without a `WHERE` clause?

2. What is the first step you should take before running an `UPDATE` in production?

3. How do you check how many rows will be affected by a `DELETE` statement?

4. What is the difference between `DELETE` and `TRUNCATE`?

5. What does `ON DELETE CASCADE` do?

### Intermediate

6. Write a safe `DELETE` statement that removes only cancelled orders older than 1 year. Include the transaction wrapper.

7. Why can `NOT IN` with a subquery that contains NULLs return zero rows? What is the safer alternative?

8. What is the difference between `ON DELETE RESTRICT` and `ON DELETE NO ACTION`?

9. How would you update employee salaries in batches of 1000 rows in PostgreSQL?

10. What is a soft delete, and what is one major pitfall of soft deletes with unique constraints?

### Advanced

11. Explain why updating through a JOIN without aggregation can produce non-deterministic results. Provide an example and a fix.

12. Write a PostgreSQL query using a CTE that identifies employees earning below their department average and gives them a 20% raise. Include safety checks.

13. How does the `EXPLAIN` plan for a `DELETE` differ between PostgreSQL (which supports it directly) and MySQL (which does not)?

14. In SQL Server, explain when `DELETE` row locks escalate to table locks and how to mitigate this.

15. Design a batch delete strategy for removing 10 million rows from a table without impacting production traffic. Consider locking, transaction log growth, and replication lag.

### Scenario Based

16. You need to delete all orders where `status = 'pending'` and `order_date < '2023-01-01'`. The table has 50 million rows. The WHERE clause matches approximately 2 million rows. Walk through your step-by-step approach.

17. A developer ran `DELETE FROM orders WHERE customer_id = 100;` and it deleted 50,000 orders instead of the expected 5. What went wrong and how would you recover?

18. You discover that `NOT IN (SELECT id FROM table_with_nulls)` silently returned zero rows in a DELETE statement, and the data was committed. What happened and how do you fix it?

19. A batch update of 1 million rows is causing replication lag on your read replicas. How would you modify the approach?

20. You need to reassign all employees from a closing department to a new department, then delete the old department. The department has 500 employees, and there are foreign key constraints. Write the safe sequence of operations.

### Tricky

21. What happens when you run this?

```sql
BEGIN;
DELETE FROM orders WHERE id = 101;
ROLLBACK;
-- Are the order_items for order 101 still there?
-- Does the answer depend on ON DELETE CASCADE?
```

22. Why does this return different results in MySQL vs PostgreSQL?

```sql
UPDATE employees
SET salary = salary * 1.10
WHERE department_id IN (SELECT id FROM departments WHERE budget > 400000);
```

23. What is the output of this query?

```sql
-- Given: employees table has 10 rows, 3 with status = 'inactive'
DELETE FROM employees
WHERE status = 'inactive';

-- What does SELECT @@ROWCOUNT return in SQL Server?
-- What does ROW_COUNT() return in MySQL?
```

24. Explain why this DELETE deletes zero rows:

```sql
DELETE FROM orders
WHERE id NOT IN (SELECT order_id FROM order_items);
-- Hint: Check for NULLs in the subquery
```

25. What happens if you try to `DELETE` a row that is referenced by a foreign key with `ON DELETE RESTRICT`?

### Output Prediction

26. Given the sample tables above, what is the result of:

```sql
DELETE FROM order_items
USING orders
WHERE order_items.order_id = orders.id
  AND orders.status = 'cancelled';
```

How many rows are deleted? Which rows?

27. What is the result of:

```sql
UPDATE employees
SET salary = salary * 1.10
WHERE department_id = (
    SELECT id FROM departments WHERE name = 'Nonexistent'
);
```

28. What is the result of:

```sql
DELETE FROM employees
WHERE department_id NOT IN (
    SELECT id FROM departments
);
```

Given that Frank has `department_id = NULL`?

### Debugging

29. A developer reports: "My UPDATE is supposed to give 50 employees a raise, but it updated 200 employees." Write a debugging query to identify the issue.

30. A DELETE statement ran successfully but deleted fewer rows than expected. What are three possible causes?

### Performance

31. You have a `DELETE FROM orders WHERE created_at < '2020-01-01'` on a table with 100 million rows. The `created_at` column is indexed. The query matches 30 million rows. Analyze the performance implications and propose a better approach.

32. Compare the performance characteristics of updating 1 million rows in a single statement vs. in batches of 10,000. What factors influence which approach is faster?

33. You notice that an `UPDATE` statement is slower after adding a composite index on `(department_id, salary)`. The UPDATE modifies only the `salary` column. Why might the index make the UPDATE slower, and is removing the index the right solution?

---

## Summary of Best Practices

| Practice                               | Why                                         |
| -------------------------------------- | ------------------------------------------- |
| SELECT before UPDATE/DELETE            | Preview affected rows                       |
| Use transactions                       | Enable rollback                             |
| COUNT(\*) before DML                   | Know the exact row count                    |
| Use batch processing for large changes | Avoid locks, log growth, replication lag    |
| Use NOT EXISTS over NOT IN             | Avoid NULL pitfalls                         |
| Prefer RESTRICT over CASCADE           | Prevent accidental mass deletion            |
| Soft delete when audit trail matters   | Preserve data for compliance                |
| EXPLAIN before large DML               | Verify the execution plan                   |
| Use CTEs for readable DML              | Clear, maintainable queries                 |
| Verify row count after DML             | Confirm expected change                     |
| Update indexes proactively             | Improve DML performance on filtered columns |

---

## Cross-References

- **NULL Handling**: See the section on NULL and Three-Valued Logic for deeper understanding of NULL behavior in WHERE clauses.
- **Window Functions**: See the section on Window Functions for alternatives to subqueries in UPDATE statements.
- **CTEs**: See the section on CTEs for recursive and non-recursive CTE patterns.
- **Transactions and Isolation Levels**: See the section on Transactions for detailed isolation level behavior and locking.
- **Indexes and Sargability**: See the section on Indexes for how index design affects DML performance.
- **Execution Plans**: See the section on Execution Plans for reading and interpreting plans for DML statements.
