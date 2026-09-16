# DDL, DML, DQL, DCL, TCL — SQL Command Categories

SQL commands are grouped into five sub-languages based on what they do. Knowing which category a statement belongs to helps you reason about side effects, transaction safety, and权限控制.

---

## Overview

| Category | Full Name                    | Purpose                           | Examples                                        |
| -------- | ---------------------------- | --------------------------------- | ----------------------------------------------- |
| **DDL**  | Data Definition Language     | Define / alter database structure | `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `RENAME` |
| **DML**  | Data Manipulation Language   | Insert, change, delete rows       | `INSERT`, `UPDATE`, `DELETE`, `MERGE`           |
| **DQL**  | Data Query Language          | Read data                         | `SELECT`                                        |
| **DCL**  | Data Control Language        | Grant / revoke permissions        | `GRANT`, `REVOKE`                               |
| **TCL**  | Transaction Control Language | Manage transactions               | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`      |

> Common misconception: Some textbooks classify `SELECT` as DML. Others give it its own category (DQL). Both conventions are in wide use. The key point is that `SELECT` is read-only — it does not modify data.

> Common misconception: `TRUNCATE` is sometimes grouped with DML because it removes data. In most databases it is DDL because it resets storage structures and cannot be rolled back in the same way `DELETE` can. This varies by database — see the `TRUNCATE` discussion below.

---

## Sample Tables

Every example in this section uses these tables.

### departments

| dept_id | dept_name       | budget |
| ------- | --------------- | ------ |
| 1       | Engineering     | 500000 |
| 2       | Marketing       | 200000 |
| 3       | Human Resources | 150000 |

**Grain:** One row = one department.

### employees

| emp_id | first_name | last_name | dept_id | salary | hire_date  | email    |
| ------ | ---------- | --------- | ------- | ------ | ---------- | -------- |
| 101    | Alice      | Chen      | 1       | 95000  | 2020-03-15 | alice@co |
| 102    | Bob        | Martinez  | 1       | 88000  | 2021-06-01 | bob@co   |
| 103    | Carol      | Johnson   | 2       | 72000  | 2019-01-20 | carol@co |
| 104    | Dave       | Williams  | NULL    | 65000  | 2022-09-10 | dave@co  |
| 105    | Eve        | Brown     | 2       | 81000  | 2020-11-05 | eve@co   |

**Grain:** One row = one employee.

---

## 1. DDL — Data Definition Language

DDL defines and modifies database **objects** (tables, indexes, schemas, views, users). DDL statements are **auto-committed** in most databases — once executed, the change is permanent.

### 1.1 CREATE

Creates new database objects.

#### Table

```sql
CREATE TABLE employees (
    emp_id      INT           PRIMARY KEY,
    first_name  VARCHAR(50)   NOT NULL,
    last_name   VARCHAR(50)   NOT NULL,
    dept_id     INT           REFERENCES departments(dept_id),
    salary      DECIMAL(10,2) CHECK (salary > 0),
    hire_date   DATE          NOT NULL,
    email       VARCHAR(100)  UNIQUE
);
```

Key elements:

| Clause        | Purpose                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| `PRIMARY KEY` | Uniquely identifies each row; implicitly `NOT NULL` and creates a unique index |
| `NOT NULL`    | Column cannot hold NULL                                                        |
| `REFERENCES`  | Foreign key constraint                                                         |
| `CHECK`       | Row-level validation                                                           |
| `UNIQUE`      | All values in the column must be distinct                                      |
| `DEFAULT`     | Value used when none is specified                                              |

#### Index

```sql
-- Single-column index
CREATE INDEX idx_emp_dept ON employees(dept_id);

-- Composite index
CREATE INDEX idx_emp_dept_salary ON employees(dept_id, salary);

-- Covering index (includes extra columns to avoid table lookups)
CREATE INDEX idx_emp_covering ON employees(dept_id, salary) INCLUDE (first_name, last_name);
```

> `INCLUDE` is supported by PostgreSQL, SQL Server, and Oracle. MySQL uses composite indexes differently — see Performance section.

#### View

```sql
CREATE VIEW engineering_team AS
SELECT emp_id, first_name, last_name, salary
FROM employees
WHERE dept_id = 1;
```

### 1.2 ALTER

Modifies existing objects.

```sql
-- Add a column
ALTER TABLE employees ADD COLUMN phone VARCHAR(20);

-- Drop a column
ALTER TABLE employees DROP COLUMN phone;

-- Modify a column type
ALTER TABLE employees ALTER COLUMN salary TYPE DECIMAL(12,2);

-- Add a constraint
ALTER TABLE employees ADD CONSTRAINT chk_salary CHECK (salary > 0);

-- Drop a constraint
ALTER TABLE employees DROP CONSTRAINT chk_salary;
```

> Production pitfall: `ALTER TABLE` on large tables can lock the table for extended periods. In PostgreSQL, adding a column with a non-volatile `DEFAULT` rewrites the table (though PostgreSQL 11+ optimizes `DEFAULT` for fixed values). In MySQL with InnoDB, online `ALTER` behavior depends on the specific change — use `ALGORITHM=INPLACE` or `ALGORITHM=INSTANT` when possible.

### 1.3 DROP

Removes objects entirely.

```sql
DROP TABLE employees;
DROP INDEX idx_emp_dept;
DROP VIEW engineering_team;
```

With safety:

```sql
-- PostgreSQL, MySQL 8.0+, SQL Server, Oracle
DROP TABLE IF EXISTS employees;
```

> Production pitfall: `DROP TABLE` is **irreversible** without backups or point-in-time recovery. Always use `DROP ... IF EXISTS` in scripts to avoid errors on first run, and verify you are connected to the correct database.

### 1.4 TRUNCATE

Removes all rows from a table, resetting storage.

```sql
TRUNCATE TABLE employees;
```

#### TRUNCATE vs DELETE

| Aspect                  | TRUNCATE                          | DELETE                          |
| ----------------------- | --------------------------------- | ------------------------------- |
| Speed                   | Fast — deallocates pages          | Slower — row-by-row             |
| WHERE clause            | Not allowed                       | Allowed                         |
| Rollback                | Depends on database (see below)   | Yes, within a transaction       |
| Triggers                | Does not fire (PostgreSQL, MySQL) | Fires                           |
| Identity/sequence reset | Yes                               | No                              |
| Logging                 | Minimal (page deallocation)       | Full row-level logging          |
| Locking                 | Table-level lock (typically)      | Row-level locks                 |
| Space reclamation       | Immediate                         | Deferred (VACUUM in PostgreSQL) |

Database-specific behavior for TRUNCATE:

> PostgreSQL
>
> - DDL command, but **can be rolled back** inside a transaction block.
> - Does not fire `BEFORE DELETE` / `AFTER DELETE` triggers.

> MySQL (InnoDB)
>
> - DDL, auto-committed. Cannot be rolled back.
> - Does not fire triggers.

> SQL Server
>
> - Can be rolled back inside an explicit transaction.
> - Does not fire triggers unless `FIRE_TRIGGERS` option is specified.

> Oracle
>
> - DDL, auto-committed. Cannot be rolled back.
> - Does not fire triggers.

### 1.5 RENAME

```sql
-- PostgreSQL, MySQL
RENAME TABLE employees TO staff;

-- PostgreSQL, SQL Server
ALTER TABLE employees RENAME TO staff;

-- SQL Server (column)
EXEC sp_rename 'employees.phone', 'phone_number', 'COLUMN';
```

### DDL Internal Working

When you run `CREATE TABLE`, the database:

1. **Parses** the SQL syntax.
2. **Validates** data types, constraints, and references.
3. **Creates metadata** in system catalog tables (`information_schema`, `pg_catalog`, etc.).
4. **Allocates storage** — initial pages/extents depending on the engine.

When you run `CREATE INDEX`:

1. Reads all rows from the table.
2. Sorts by the index key.
3. Builds a B-tree (or hash/GiST/GIN depending on type).
4. Writes the index structure to disk.

> Performance implication: `CREATE INDEX` on a large table can take minutes to hours. In PostgreSQL, use `CREATE INDEX CONCURRENTLY` to avoid blocking writes during index creation. In MySQL InnoDB, online DDL allows most index builds without blocking reads/writes.

### DDL Common Mistakes

| Mistake                          | Why It's Bad                                   | Better Approach           |
| -------------------------------- | ---------------------------------------------- | ------------------------- |
| No primary key                   | Can't uniquely identify rows; poor performance | Always define a PK        |
| Using `VARCHAR(255)` everywhere  | Wastes memory, hurts index performance         | Use appropriate sizes     |
| No foreign keys                  | Orphan rows, data corruption                   | Define FK constraints     |
| `DROP TABLE` without `IF EXISTS` | Script fails if table doesn't exist            | Use `IF EXISTS`           |
| No indexes on FK columns         | Slow joins, lock contention                    | Index foreign key columns |

> Production pitfall: In MySQL InnoDB, foreign key columns **must** be indexed. If you don't create an index, MySQL creates one implicitly. In PostgreSQL and SQL Server, foreign key columns are NOT automatically indexed — you must create indexes explicitly.

---

## 2. DML — Data Manipulation Language

DML statements modify data in existing tables.

### 2.1 INSERT

Adds new rows.

```sql
-- Single row
INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES (106, 'Frank', 'Lee', 1, 78000, '2023-04-20', 'frank@co');

-- Multiple rows
INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES
    (107, 'Grace', 'Kim', 3, 70000, '2023-01-15', 'grace@co'),
    (108, 'Hank',  'Davis', 2, 69000, '2023-07-01', 'hank@co');
```

#### INSERT from SELECT

```sql
INSERT INTO archived_employees (emp_id, first_name, last_name, salary)
SELECT emp_id, first_name, last_name, salary
FROM employees
WHERE hire_date < '2020-01-01';
```

#### INSERT with ON CONFLICT / ON DUPLICATE

```sql
-- PostgreSQL
INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES (101, 'Alice', 'Chen', 1, 97000, '2020-03-15', 'alice@co')
ON CONFLICT (emp_id)
DO UPDATE SET salary = EXCLUDED.salary;

-- MySQL
INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES (101, 'Alice', 'Chen', 1, 97000, '2020-03-15', 'alice@co')
ON DUPLICATE KEY UPDATE salary = VALUES(salary);

-- SQL Server
MERGE INTO employees AS target
USING (VALUES (101, 'Alice', 'Chen', 1, 97000, '2020-03-15', 'alice@co'))
    AS source (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
ON target.emp_id = source.emp_id
WHEN MATCHED THEN UPDATE SET salary = source.salary
WHEN NOT MATCHED THEN INSERT VALUES (source.emp_id, source.first_name, source.last_name,
    source.dept_id, source.salary, source.hire_date, source.email);
```

#### INSERT Common Mistakes

| Mistake                   | Problem                           | Fix                            |
| ------------------------- | --------------------------------- | ------------------------------ |
| Column count mismatch     | Error or wrong data               | List columns explicitly        |
| Implicit type coercion    | Silent data truncation or failure | Match types explicitly         |
| NULL into NOT NULL column | Error                             | Provide value or use `DEFAULT` |
| Missing column list       | Assumes all columns in order      | Always list columns explicitly |

> Interview trap: "What happens if you `INSERT` with the wrong number of values?" Answer depends on whether columns are specified. With columns, it errors. Without columns, MySQL may attempt type coercion for trailing values and error on length mismatch.

### 2.2 UPDATE

Modifies existing rows.

```sql
-- Simple update
UPDATE employees
SET salary = salary * 1.10
WHERE dept_id = 1;

-- Update multiple columns
UPDATE employees
SET salary = salary * 1.05,
    email = 'bob.new@co'
WHERE emp_id = 102;

-- Update using JOIN (non-standard but widely supported)
-- PostgreSQL
UPDATE employees
SET dept_id = 3
FROM department_assignments
WHERE employees.emp_id = department_assignments.emp_id
  AND department_assignments.new_dept = 3;

-- MySQL
UPDATE employees e
JOIN department_assignments da ON e.emp_id = da.emp_id
SET e.dept_id = 3
WHERE da.new_dept = 3;

-- SQL Server
UPDATE e
SET e.dept_id = 3
FROM employees e
INNER JOIN department_assignments da ON e.emp_id = da.emp_id
WHERE da.new_dept = 3;
```

#### UPDATE Without WHERE

```sql
-- Updates ALL rows — usually a bug
UPDATE employees SET salary = salary * 1.10;
```

> Production pitfall: An `UPDATE` without `WHERE` affects every row. Always test with a `SELECT` first:
>
> ```sql
> -- Preview what will change
> SELECT * FROM employees WHERE dept_id = 1;
>
> -- Then update
> UPDATE employees SET salary = salary * 1.10 WHERE dept_id = 1;
> ```

#### UPDATE Returning Values

```sql
-- PostgreSQL
UPDATE employees SET salary = salary * 1.10
WHERE dept_id = 1
RETURNING emp_id, first_name, salary;

-- SQL Server
UPDATE employees SET salary = salary * 1.10
WHERE dept_id = 1
OUTPUT inserted.emp_id, inserted.first_name, inserted.salary;
```

### 2.3 DELETE

Removes rows.

```sql
DELETE FROM employees
WHERE emp_id = 108;
```

#### DELETE vs TRUNCATE (detailed above in DDL)

#### DELETE with Subquery

```sql
DELETE FROM employees
WHERE dept_id IN (SELECT dept_id FROM departments WHERE budget < 100000);
```

#### DELETE Returning

```sql
-- PostgreSQL
DELETE FROM employees
WHERE hire_date < '2015-01-01'
RETURNING *;

-- SQL Server
DELETE FROM employees
WHERE hire_date < '2015-01-01'
OUTPUT deleted.*;
```

#### DELETE Common Mistakes

| Mistake                          | Problem                            | Fix                              |
| -------------------------------- | ---------------------------------- | -------------------------------- |
| No WHERE clause                  | Deletes all rows                   | Always verify with SELECT first  |
| Cascading deletes destroy data   | FK cascade removes related rows    | Understand your ON DELETE action |
| Deleting in a loop without limit | Long-running lock, replication lag | Use batches                      |

> Production pitfall: Deleting millions of rows in a single transaction can fill up WAL (PostgreSQL), redo logs (Oracle/MySQL), or transaction logs (SQL Server). Batch deletes:
>
> ```sql
> -- PostgreSQL / MySQL
> DELETE FROM employees
> WHERE emp_id IN (
> ```

    SELECT emp_id FROM employees
    WHERE hire_date < '2015-01-01'
    LIMIT 10000

);

> -- Repeat until 0 rows affected
>
> ```
>
> ```

### 2.4 MERGE

Conditionally INSERT, UPDATE, or DELETE in a single statement. Supported by PostgreSQL 15+, Oracle, SQL Server. MySQL does not have `MERGE` — use `INSERT ... ON DUPLICATE KEY UPDATE`.

```sql
MERGE INTO employees AS target
USING new_hires AS source
ON target.emp_id = source.emp_id
WHEN MATCHED AND source.salary > target.salary THEN
    UPDATE SET salary = source.salary
WHEN NOT MATCHED THEN
    INSERT (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
    VALUES (source.emp_id, source.first_name, source.last_name,
            source.dept_id, source.salary, source.hire_date, source.email);
```

> Interview trap: `MERGE` in SQL Server can fire both `INSERT` and `UPDATE` triggers for a single row if both `WHEN MATCHED` and `WHEN NOT MATCHED` clauses are satisfied in unexpected ways. Always test edge cases.

---

## 3. DQL — Data Query Language

DQL reads data without modifying it. `SELECT` is the only DQL statement.

### 3.1 SELECT Basics

```sql
SELECT emp_id, first_name, last_name, salary
FROM employees
WHERE dept_id = 1
ORDER BY salary DESC;
```

### 3.2 SELECT with Aggregation

```sql
SELECT
    dept_id,
    COUNT(*)        AS num_employees,
    AVG(salary)     AS avg_salary,
    MAX(salary)     AS max_salary
FROM employees
GROUP BY dept_id
HAVING COUNT(*) > 1
ORDER BY avg_salary DESC;
```

### 3.3 SELECT with JOIN

```sql
SELECT
    e.first_name,
    e.last_name,
    d.dept_name,
    e.salary
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id
ORDER BY e.salary DESC;
```

### 3.4 SELECT with Subquery

```sql
SELECT first_name, last_name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

### 3.5 SELECT with Window Function

```sql
SELECT
    first_name,
    last_name,
    dept_id,
    salary,
    RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dept_rank
FROM employees;
```

### 3.6 Query Execution Order

The order SQL **logically** processes a query differs from the written order:

```
1. FROM / JOIN    — identify source rows
2. WHERE          — filter rows before grouping
3. GROUP BY       — form groups
4. HAVING         — filter groups
5. SELECT         — compute output columns
6. DISTINCT       — remove duplicate rows
7. ORDER BY       — sort output
8. LIMIT / OFFSET — restrict output count
```

> Interview trap: You cannot use a column alias defined in `SELECT` inside `WHERE` because `WHERE` executes before `SELECT`. You CAN use it in `ORDER BY`.

### DQL vs DML: Why the Distinction Matters

| Aspect       | DQL (SELECT)                               | DML (INSERT/UPDATE/DELETE)  |
| ------------ | ------------------------------------------ | --------------------------- |
| Side effects | None (read-only)                           | Modifies data               |
| Transaction  | Doesn't start one (unless in explicit TXN) | Part of current transaction |
| Locking      | Shared locks (typically)                   | Exclusive locks             |
| Replication  | Not replicated                             | Replicated to replicas      |
| Permissions  | Separate permission set                    | Separate permission set     |

---

## 4. DCL — Data Control Language

DCL manages **who** can do **what** on **which** objects.

### 4.1 GRANT

```sql
-- Give a user SELECT on a table
GRANT SELECT ON employees TO analyst_role;

-- Give a user full CRUD on a table
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO hr_manager;

-- Give a user ability to create tables in a schema
GRANT CREATE ON SCHEMA public TO developer;

-- PostgreSQL: Grant all privileges
GRANT ALL PRIVILEGES ON employees TO admin_user;

-- MySQL: Grant with grant option
GRANT SELECT, INSERT ON employees.* TO 'app_user'@'%' IDENTIFIED BY 'password'
WITH GRANT OPTION;
```

### 4.2 REVOKE

```sql
-- Remove SELECT privilege
REVOKE SELECT ON employees FROM analyst_role;

-- Remove all privileges
REVOKE ALL PRIVILEGES ON employees FROM admin_user;

-- PostgreSQL: Revoke public access (security best practice)
REVOKE ALL ON employees FROM PUBLIC;
```

### 4.3 Roles (PostgreSQL, MySQL 8.0+, SQL Server)

```sql
-- PostgreSQL
CREATE ROLE read_only;
GRANT CONNECT ON DATABASE mydb TO read_only;
GRANT USAGE ON SCHEMA public TO read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO read_only;

GRANT read_only TO analyst1, analyst2;
```

### DCL Best Practices

| Practice                         | Why                             |
| -------------------------------- | ------------------------------- |
| Use roles, not individual grants | Easier to manage at scale       |
| Principle of least privilege     | Grant only what's needed        |
| Revoke PUBLIC access             | Prevents anonymous access       |
| Use `GRANT OPTION` sparingly     | Prevents privilege escalation   |
| Audit grants regularly           | Detect over-privileged accounts |

> Production pitfall: In MySQL, a user can grant privileges they don't possess if they have the `GRANT OPTION`. Always audit `mysql.user` and `mysql.db` tables.

---

## 5. TCL — Transaction Control Language

TCL manages **units of work** — ensuring that a group of statements either all succeed or all fail.

### 5.1 ACID Properties

| Property        | Meaning                                                        |
| --------------- | -------------------------------------------------------------- |
| **Atomicity**   | All statements in a transaction succeed, or none do            |
| **Consistency** | Transaction moves the database from one valid state to another |
| **Isolation**   | Concurrent transactions don't interfere with each other        |
| **Durability**  | Once committed, data survives crashes                          |

### 5.2 Basic Transaction

```sql
BEGIN;

INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES (109, 'Ivy', 'Nguyen', 1, 75000, '2023-09-01', 'ivy@co');

UPDATE departments
SET budget = budget - 75000
WHERE dept_id = 1;

COMMIT;  -- Both changes are permanent
-- or
ROLLBACK;  -- Both changes are undone
```

### 5.3 SAVEPOINT

```sql
BEGIN;

INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES (110, 'Jack', 'White', 2, 68000, '2023-10-01', 'jack@co');

SAVEPOINT after_first_insert;

INSERT INTO employees (emp_id, first_name, last_name, dept_id, salary, hire_date, email)
VALUES (111, 'Kate', 'Black', 3, 71000, '2023-10-15', 'kate@co');

ROLLBACK TO SAVEPOINT after_first_insert;  -- Undoes only Kate's insert

COMMIT;  -- Jack is inserted, Kate is not
```

### 5.4 Auto-Commit Behavior

| Database       | Default Behavior                                                          |
| -------------- | ------------------------------------------------------------------------- |
| PostgreSQL     | Each statement is auto-committed unless inside `BEGIN ... COMMIT`         |
| MySQL (InnoDB) | Auto-commit is ON by default. Each statement is its own transaction       |
| SQL Server     | Auto-commit is ON by default. Use `BEGIN TRAN` for explicit transactions  |
| Oracle         | Each statement is its own transaction. `COMMIT` / `ROLLBACK` are explicit |

### 5.5 Isolation Levels

| Level            | Dirty Read | Non-Repeatable Read | Phantom Read |
| ---------------- | ---------- | ------------------- | ------------ |
| READ UNCOMMITTED | Possible   | Possible            | Possible     |
| READ COMMITTED   | Prevented  | Possible            | Possible     |
| REPEATABLE READ  | Prevented  | Prevented           | Possible\*   |
| SERIALIZABLE     | Prevented  | Prevented           | Prevented    |

\* SQL Server's `REPEATABLE READ` prevents phantoms. PostgreSQL's `REPEATABLE READ` uses MVCC snapshots, which also prevents phantoms.

```sql
-- Set isolation level (PostgreSQL, MySQL)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- SQL Server
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

> Production pitfall: `SERIALIZABLE` can cause deadlocks and high contention on hot rows. Use it only when logical correctness demands it. Measure with your workload.

### 5.6 Transaction Pitfalls

| Pitfall                                       | Problem                                            | Fix                       |
| --------------------------------------------- | -------------------------------------------------- | ------------------------- |
| Long-running transactions                     | Hold locks, block others, fill WAL                 | Keep transactions short   |
| Uncommitted reads (autocommit off, no commit) | Locks held until session ends                      | Always commit or rollback |
| Nested transactions (misunderstanding)        | Some databases don't truly nest                    | Use savepoints            |
| `ROLLBACK` after DDL                          | DDL auto-commits in most databases; can't rollback | Be aware of DDL behavior  |

> PostgreSQL: DDL is transactional. You can `ROLLBACK` a `CREATE TABLE` or `ALTER TABLE` inside a transaction block. This is unique among major databases.

> MySQL (InnoDB): DDL auto-commits. You cannot roll back `CREATE TABLE` or `ALTER TABLE`.

> SQL Server: DDL can be rolled back within an explicit transaction for some statements, but behavior is inconsistent.

---

## Cross-Category Interactions

### DDL + Transaction (PostgreSQL only)

```sql
BEGIN;

CREATE TABLE temp_results (
    id INT PRIMARY KEY,
    value TEXT
);

-- Something goes wrong
ROLLBACK;  -- temp_results is removed — DDL is transactional in PostgreSQL
```

### DML + DCL

```sql
-- Only hr_manager can update salaries
GRANT UPDATE (salary) ON employees TO hr_manager;

-- The UPDATE will succeed for hr_manager, fail for others
```

### DML + TCL

```sql
BEGIN;

-- Batch update wrapped in transaction
UPDATE employees SET salary = salary * 1.10 WHERE dept_id = 1;
UPDATE employees SET salary = salary * 1.05 WHERE dept_id = 2;

-- If either fails, both are rolled back
COMMIT;
```

---

## DDL vs DML Locking Behavior

| Operation      | Lock Type             | Duration    | Blocks Reads? | Blocks Writes? |
| -------------- | --------------------- | ----------- | ------------- | -------------- |
| `INSERT` (row) | Row exclusive         | Transaction | No (RC+)      | Yes (same row) |
| `UPDATE` (row) | Row exclusive         | Transaction | No (RC+)      | Yes (same row) |
| `DELETE` (row) | Row exclusive         | Transaction | No (RC+)      | Yes (same row) |
| `ALTER TABLE`  | Table lock (varies)   | Statement   | Usually yes   | Usually yes    |
| `CREATE INDEX` | Table lock or INPLACE | Statement   | Varies        | Varies         |
| `TRUNCATE`     | Table lock            | Statement   | Yes           | Yes            |

> Performance implication: Always verify locking behavior with your database's monitoring tools: `pg_locks` (PostgreSQL), `SHOW ENGINE INNODB STATUS` (MySQL), `sys.dm_tran_locks` (SQL Server).

---

## Performance Implications Summary

| Statement                 | Performance Consideration                                                  |
| ------------------------- | -------------------------------------------------------------------------- |
| `CREATE TABLE`            | Generally fast (metadata only)                                             |
| `CREATE INDEX`            | Can be slow on large tables; use `CONCURRENTLY` (PG) or online DDL (MySQL) |
| `ALTER TABLE ADD COLUMN`  | Fast in PostgreSQL 11+ for most cases; slow on large MySQL tables          |
| `ALTER TABLE DROP COLUMN` | Fast in PostgreSQL 11+; may rebuild in MySQL                               |
| `INSERT` (single)         | Fast; batch for bulk loads                                                 |
| `INSERT ... SELECT`       | Can be slow; consider disabling indexes during bulk load                   |
| `UPDATE` without WHERE    | Updates all rows; verify with execution plan                               |
| `DELETE` without WHERE    | Deletes all rows; consider `TRUNCATE` instead                              |
| `SELECT`                  | Always use `EXPLAIN ANALYZE` for unfamiliar queries                        |
| `MERGE`                   | Complex; verify execution plan for large datasets                          |

---

## Database-Specific Differences

| Feature                         | PostgreSQL                                 | MySQL              | SQL Server           | Oracle                               |
| ------------------------------- | ------------------------------------------ | ------------------ | -------------------- | ------------------------------------ |
| `TRUNCATE` rollback             | Yes (in txn)                               | No (auto-commit)   | Yes (in txn)         | No (auto-commit)                     |
| `DELETE` triggers on `TRUNCATE` | No                                         | No                 | With `FIRE_TRIGGERS` | No                                   |
| DDL in transactions             | Yes                                        | No                 | Partial              | No                                   |
| `MERGE`                         | Yes (v15+)                                 | No                 | Yes                  | Yes                                  |
| `RETURNING` clause              | Yes                                        | No                 | `OUTPUT` clause      | `RETURNING INTO`                     |
| `UPSERT`                        | `ON CONFLICT`                              | `ON DUPLICATE KEY` | `MERGE`              | `MERGE`                              |
| Auto-increment                  | `GENERATED ALWAYS AS IDENTITY` or `SERIAL` | `AUTO_INCREMENT`   | `IDENTITY(1,1)`      | `GENERATED AS IDENTITY` or sequences |
| `LIMIT` syntax                  | `LIMIT n`                                  | `LIMIT n`          | `TOP n`              | `FETCH FIRST n ROWS ONLY`            |

---

## Interview Questions

### Beginner

1. What are the five categories of SQL commands?
2. What is the difference between DDL and DML?
3. Can you roll back a `DELETE` statement? Can you roll back a `DROP TABLE`?
4. What does `TRUNCATE` do differently from `DELETE`?
5. What is the difference between `GRANT` and `REVOKE`?
6. What does `COMMIT` do?
7. Write a `CREATE TABLE` statement for a `products` table with columns: `product_id`, `name`, `price`, `category`.
8. What happens when you run `UPDATE` without a `WHERE` clause?

### Intermediate

9. Why is `TRUNCATE` sometimes classified as DDL and sometimes as DML?
10. In what order does the SQL engine logically process a `SELECT` query?
11. Can you use a column alias from `SELECT` in a `WHERE` clause? Why or why not?
12. What is a `SAVEPOINT`, and how does it differ from `COMMIT`?
13. Write a `MERGE` statement that inserts new employees and updates salary for existing ones.
14. Why should you list columns explicitly in `INSERT` instead of relying on column order?
15. What is the difference between `READ COMMITTED` and `REPEATABLE READ` isolation levels?

### Advanced

16. PostgreSQL allows rolling back DDL. Why is this useful, and what is the trade-off?
17. Explain why `CREATE INDEX CONCURRENTLY` is important in production PostgreSQL.
18. What happens to in-flight transactions when you run `ALTER TABLE ... ADD COLUMN` on MySQL InnoDB?
19. How does SQL Server's `MERGE` statement interact with triggers?
20. What is the difference between `DELETE` and `TRUNCATE` in terms of WAL/redo log generation?

### Scenario Based

21. You need to migrate 50 million rows from a legacy table to a new table. What DDL, DML, and TCL approach would you use? Consider: locking, transaction size, performance, and rollback safety.
22. A developer accidentally ran `UPDATE employees SET salary = 0` without a `WHERE` clause. The transaction hasn't been committed. What steps do you take?
23. You need to grant read-only access to an analyst but ensure they cannot see the `salary` column. How would you implement this at the DCL level?
24. You are designing a database for an e-commerce application. List the DDL statements needed for `users`, `products`, `orders`, and `order_items` with appropriate constraints.
25. Your application runs a long transaction that holds locks for 5 minutes, causing other queries to time out. What are three strategies to fix this?

### Tricky

26. If you `BEGIN` a transaction, run `CREATE TABLE`, then `ROLLBACK`, does the table exist? Answer for PostgreSQL, MySQL, and SQL Server.
27. Can `INSERT INTO ... SELECT` cause a deadlock? Under what conditions?
28. You run `DELETE FROM employees;` and then `TRUNCATE TABLE employees;` in the same transaction (PostgreSQL). Does `ROLLBACK` restore the data? Why or why not?
29. In SQL Server, what is the difference between `@@TRANCOUNT = 0` and being outside any transaction block?
30. A `MERGE` statement updates a row and then the same row is matched again in the same statement. What happens?

### Output Prediction

Given:

```sql
CREATE TABLE t (id INT PRIMARY KEY, val INT);
INSERT INTO t VALUES (1, 10), (2, 20), (3, 30);

BEGIN;
UPDATE t SET val = val + 5 WHERE id = 1;
SAVEPOINT sp;
UPDATE t SET val = val + 10 WHERE id = 2;
ROLLBACK TO SAVEPOINT sp;
UPDATE t SET val = val + 3 WHERE id = 3;
COMMIT;

SELECT * FROM t ORDER BY id;
```

31. What is the output?

32. Given:

```sql
CREATE TABLE a (id INT);
CREATE TABLE b (id INT);
INSERT INTO a VALUES (1), (2), (3);
INSERT INTO b VALUES (2), (3), (4);

SELECT * FROM a WHERE id NOT IN (SELECT id FROM b);
```

What is the output? (Hint: consider if `b` contains NULLs.)

33. Given (PostgreSQL):

```sql
BEGIN;
CREATE TABLE test_rollback (id INT);
ROLLBACK;
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'test_rollback'
) AS table_exists;
```

What is the output?

### Debugging

34. A query returns duplicate rows after a `JOIN`. Identify the possible causes and how to fix them.
35. An `INSERT` statement fails with a foreign key violation even though the referenced row exists. List three possible causes.
36. A `SELECT` query with `WHERE salary > 50000` returns no rows, but you can see rows with salary 75000 in the table. What could be wrong?
37. After running `ALTER TABLE employees ADD COLUMN bonus DECIMAL(10,2) DEFAULT 0`, existing rows show `bonus` as NULL. Why?
38. A `DELETE` statement takes 30 minutes on a table with 10 million rows. What approaches could improve this?

### Performance

39. You need to load 10 million rows into a table. Compare the performance characteristics of: `INSERT` one-by-one, `INSERT` in batches of 1000, `COPY` (PostgreSQL), and `LOAD DATA INFILE` (MySQL).
40. Why might `SELECT * FROM employees WHERE LOWER(last_name) = 'chen'` not use an index on `last_name`? How would you fix this?
41. Under what conditions might `NOT EXISTS` be faster than `NOT IN`? When might `NOT IN` be faster?
42. You run `EXPLAIN ANALYZE` and see `Seq Scan on employees`. The table has 50 million rows. Is this necessarily slow? When would it be acceptable?
43. Compare the performance implications of `DELETE FROM t WHERE id < 10000` vs `TRUNCATE t` on a table with 50 million rows.
44. A query using `IN (subquery)` is slow. Rewrite it using `EXISTS`. Under what conditions might this be faster, and under what conditions might it be the same or slower?
