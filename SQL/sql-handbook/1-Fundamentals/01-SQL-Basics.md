# SQL Basics

---

## Table of Contents

1. [What is SQL?](#what-is-sql)
2. [SQL Command Categories](#sql-command-categories)
3. [Sample Schema and Data](#sample-schema-and-data)
4. [The SELECT Statement](#the-select-statement)
5. [WHERE Clause](#where-clause)
6. [ORDER BY](#order-by)
7. [LIMIT / OFFSET](#limit--offset)
8. [DISTINCT](#distinct)
9. [INSERT](#insert)
10. [UPDATE](#update)
11. [DELETE](#delete)
12. [NULL — The Most Misunderstood Concept](#null--the-most-misunderstood-concept)
13. [Aliases](#aliases)
14. [Common Mistakes](#common-mistakes)
15. [Production Pitfalls](#production-pitfalls)
16. [Interview Questions](#interview-questions)

---

## What is SQL?

SQL (Structured Query Language) is a declarative language. You describe **what** data you want, not **how** to get it. The database engine decides the execution plan internally.

Key principle: SQL operates on **sets** of rows, not individual rows. This is fundamentally different from imperative languages like Python or Java.

```sql
-- You describe WHAT you want, not HOW to get it
SELECT name, salary
FROM employees
WHERE department = 'Engineering'
ORDER BY salary DESC;
```

The database engine may:
- Scan the table fully
- Use an index
- Choose a hash join vs nested loop
- Reorder operations

All of this is decided by the optimizer based on statistics, indexes, and data distribution.

---

## SQL Command Categories

| Category | Full Name | Purpose | Commands |
|----------|-----------|---------|----------|
| **DDL** | Data Definition Language | Define / modify schema | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` |
| **DML** | Data Manipulation Language | Read / modify data | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| **DCL** | Data Control Language | Permissions | `GRANT`, `REVOKE` |
| **TCL** | Transaction Control | Transactions | `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` |

> **Note:** `SELECT` is sometimes classified as DQL (Data Query Language) separately from DML. The categorization varies across textbooks. What matters is understanding what each command does.

---

## Sample Schema and Data

Throughout this handbook, we use these tables. The **grain** (what one row represents) is stated explicitly.

### employees

**Grain:** One row = one employee.

```sql
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    first_name    VARCHAR(50) NOT NULL,
    last_name     VARCHAR(50) NOT NULL,
    email         VARCHAR(100) UNIQUE,
    hire_date     DATE NOT NULL,
    salary        DECIMAL(10,2),
    department_id INT,
    manager_id    INT
);
```

```sql
INSERT INTO employees VALUES
(1,  'Alice',   'Chen',      'alice@co.com',    '2019-03-15', 95000.00,  1, NULL),
(2,  'Bob',     'Martinez',  'bob@co.com',      '2020-07-01', 72000.00,  1, 1),
(3,  'Charlie', 'Patel',     'charlie@co.com',  '2018-11-20', 110000.00, 2, 1),
(4,  'Diana',   'Kowalski',  'diana@co.com',    '2021-01-10', 68000.00,  2, 3),
(5,  'Eve',     'Nguyen',    NULL,               '2022-06-01', 85000.00,  1, 1),
(6,  'Frank',   'Singh',     'frank@co.com',    '2017-04-18', 125000.00, 3, NULL),
(7,  'Grace',   'Brown',     'grace@co.com',    '2023-09-05', 55000.00,  NULL, 6),
(8,  'Hank',    'Davis',     'hank@co.com',     '2020-02-28', NULL,       3, 6);
```

### departments

**Grain:** One row = one department.

```sql
CREATE TABLE departments (
    department_id   INT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    location        VARCHAR(100)
);
```

```sql
INSERT INTO departments VALUES
(1, 'Engineering',  'New York'),
(2, 'Marketing',    'San Francisco'),
(3, 'Human Resources', 'Chicago'),
(4, 'Finance',      'New York');
```

### orders

**Grain:** One row = one order placed by one customer.

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    total       DECIMAL(10,2)
);
```

```sql
INSERT INTO orders VALUES
(101, 1, '2024-01-15', 250.00),
(102, 1, '2024-02-20', 180.50),
(103, 2, '2024-01-18', 320.00),
(104, 3, '2024-03-05', 90.75),
(105, 2, '2024-03-10', NULL),
(106, 4, '2024-04-01', 410.25);
```

### order_items

**Grain:** One row = one line item within one order.

```sql
CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    price      DECIMAL(10,2) NOT NULL
);
```

```sql
INSERT INTO order_items VALUES
(1,  101, 1, 2, 50.00),
(2,  101, 2, 1, 150.00),
(3,  102, 1, 1, 50.00),
(4,  102, 3, 2, 65.25),
(5,  103, 2, 1, 150.00),
(6,  103, 4, 1, 170.00),
(7,  104, 3, 1, 65.25),
(8,  105, 1, 1, 50.00),
(9,  106, 4, 2, 170.00),
(10, 106, 2, 1, 150.00);
```

---

## The SELECT Statement

### Syntax

```sql
SELECT [DISTINCT] column1, column2, ...
FROM table_name
[WHERE condition]
[GROUP BY column1, column2, ...]
[HAVING condition]
[ORDER BY column1 [ASC|DESC], ...]
[LIMIT n [OFFSET m]];
```

### Execution Order (Logical)

This is critical to understand. The SQL parser evaluates clauses in this order:

```
FROM        → 1. Identify the table(s)
JOIN        → 2. Combine tables
WHERE       → 3. Filter rows (before aggregation)
GROUP BY    → 4. Form groups
HAVING      → 5. Filter groups (after aggregation)
SELECT      → 6. Choose columns / compute expressions
DISTINCT    → 7. Remove duplicate rows
ORDER BY    → 8. Sort results
LIMIT       → 9. Restrict row count
```

> Interview trap: The `WHERE` clause runs **before** `GROUP BY`, so you cannot use aggregate functions like `SUM()` or `COUNT()` in `WHERE`. You must use `HAVING` for conditions on aggregated values.

### Selecting All Columns

```sql
SELECT * FROM departments;
```

| department_id | department_name | location |
|---------------|-----------------|----------|
| 1 | Engineering | New York |
| 2 | Marketing | San Francisco |
| 3 | Human Resources | Chicago |
| 4 | Finance | New York |

> **Production pitfall:** `SELECT *` is discouraged in production code. It returns all columns including ones you do not need, which:
> - Wastes network bandwidth
> - Breaks code if schema changes (column added/removed/renamed)
> - Prevents covering index usage
>
> Always specify the columns you need.

### Selecting Specific Columns

```sql
SELECT first_name, last_name, salary
FROM employees;
```

| first_name | last_name | salary |
|------------|-----------|--------|
| Alice | Chen | 95000.00 |
| Bob | Martinez | 72000.00 |
| Charlie | Patel | 110000.00 |
| Diana | Kowalski | 68000.00 |
| Eve | Nguyen | 85000.00 |
| Frank | Singh | 125000.00 |
| Grace | Brown | 55000.00 |
| Hank | Davis | NULL |

### Expressions in SELECT

```sql
SELECT
    first_name,
    last_name,
    salary,
    salary * 12 AS annual_salary,
    salary * 1.10 AS projected_salary
FROM employees;
```

| first_name | last_name | salary | annual_salary | projected_salary |
|------------|-----------|--------|---------------|------------------|
| Alice | Chen | 95000.00 | 1140000.00 | 104500.00 |
| Bob | Martinez | 72000.00 | 864000.00 | 79200.00 |
| ... | ... | ... | ... | ... |

> NULL behavior: Any arithmetic with NULL yields NULL.
> ```sql
> SELECT NULL + 1;  -- Result: NULL
> SELECT NULL * 5;  -- Result: NULL
> SELECT NULL / 0;  -- Result: NULL (not an error in most databases)
> ```
> See [NULL — The Most Misunderstood Concept](#null--the-most-misunderstood-concept) for full details.

---

## WHERE Clause

Filters rows **before** any grouping or aggregation.

### Comparison Operators

```sql
SELECT first_name, salary
FROM employees
WHERE salary > 80000;
```

| first_name | salary |
|------------|--------|
| Alice | 95000.00 |
| Charlie | 110000.00 |
| Eve | 85000.00 |
| Frank | 125000.00 |

### All Comparison Operators

| Operator | Meaning |
|----------|---------|
| `=` | Equal to |
| `<>` or `!=` | Not equal to |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal to |
| `<=` | Less than or equal to |

### Logical Operators

```sql
-- AND: both conditions must be true
SELECT first_name, salary, department_id
FROM employees
WHERE salary > 70000 AND department_id = 1;
```

| first_name | salary | department_id |
|------------|--------|---------------|
| Alice | 95000.00 | 1 |
| Eve | 85000.00 | 1 |

```sql
-- OR: at least one condition must be true
SELECT first_name, department_id
FROM employees
WHERE department_id = 1 OR department_id = 3;
```

| first_name | department_id |
|------------|---------------|
| Alice | 1 |
| Bob | 1 |
| Eve | 1 |
| Frank | 3 |
| Hank | 3 |

```sql
-- NOT: negates a condition
SELECT first_name, salary
FROM employees
WHERE NOT department_id = 1;
```

| first_name | salary |
|------------|--------|
| Charlie | 110000.00 |
| Diana | 68000.00 |
| Frank | 125000.00 |
| Grace | 55000.00 |
| Hank | NULL |

### IN Operator

```sql
SELECT first_name, department_id
FROM employees
WHERE department_id IN (1, 3);
```

Equivalent to:

```sql
SELECT first_name, department_id
FROM employees
WHERE department_id = 1 OR department_id = 3;
```

> **NULL trap with IN:** `IN` expands to a series of `=` comparisons connected by `OR`. If the list contains NULL, rows with NULL in the column will **not** match because `NULL = NULL` is unknown (see NULL section).
>
> ```sql
> SELECT * FROM employees WHERE department_id IN (1, NULL);
> -- This does NOT return rows where department_id IS NULL
> ```
>
> See [NOT IN + NULL](#not-in--null) in the NULL section for why this matters.

### BETWEEN

```sql
SELECT first_name, salary
FROM employees
WHERE salary BETWEEN 70000 AND 95000;
```

**Inclusive** on both ends. Equivalent to:

```sql
WHERE salary >= 70000 AND salary <= 95000
```

| first_name | salary |
|------------|--------|
| Alice | 95000.00 |
| Bob | 72000.00 |
| Eve | 85000.00 |

### LIKE Pattern Matching

| Pattern | Meaning |
|---------|---------|
| `%` | Zero or more characters |
| `_` | Exactly one character |

```sql
-- Names starting with 'A'
SELECT first_name FROM employees WHERE first_name LIKE 'A%';
-- Result: Alice

-- Names with exactly 3 characters
SELECT first_name FROM employees WHERE first_name LIKE '___';
-- Result: Eve

-- Email contains '@co'
SELECT first_name FROM employees WHERE email LIKE '%@co%';
-- Result: Alice, Bob, Charlie, Diana, Frank, Grace, Hank
```

> **Case sensitivity:** LIKE is case-sensitive in PostgreSQL and Oracle. In MySQL it depends on the collation of the column. In SQL Server it depends on the collation (default is case-insensitive).

### IS NULL / IS NOT NULL

```sql
-- Find employees with no email
SELECT first_name, email
FROM employees
WHERE email IS NULL;
```

| first_name | email |
|------------|-------|
| Eve | NULL |

```sql
-- Find employees with no department
SELECT first_name, department_id
FROM employees
WHERE department_id IS NULL;
```

| first_name | department_id |
|------------|---------------|
| Grace | NULL |

> Interview trap: `WHERE email = NULL` **never** returns rows. NULL is not a value — it represents the absence of a value. You must use `IS NULL`.

### EXISTS (Brief Introduction)

```sql
SELECT first_name
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.department_id = e.department_id
);
```

This returns employees who belong to an existing department. `EXISTS` returns TRUE if the subquery returns at least one row.

> See the dedicated JOIN vs Subquery section for a full comparison of `EXISTS` vs `IN` vs `JOIN`.

---

## ORDER BY

Sorts the result set. Does not guarantee physical order in the table.

### Syntax

```sql
SELECT column1, column2, ...
FROM table_name
ORDER BY column1 [ASC|DESC], column2 [ASC|DESC], ...;
```

`ASC` (ascending) is the default.

```sql
SELECT first_name, salary
FROM employees
ORDER BY salary DESC;
```

| first_name | salary |
|------------|--------|
| Frank | 125000.00 |
| Charlie | 110000.00 |
| Alice | 95000.00 |
| Eve | 85000.00 |
| Bob | 72000.00 |
| Diana | 68000.00 |
| Grace | 55000.00 |
| Hank | NULL |

### NULL Ordering

> PostgreSQL, MySQL, SQL Server, Oracle handle NULL ordering differently.

| Database | Default NULL Order (ASC) | Default NULL Order (DESC) |
|----------|--------------------------|---------------------------|
| PostgreSQL | Last (NULLS LAST) | First (NULLS FIRST) |
| MySQL | First (NULL before values) | Last |
| SQL Server | First | Last |
| Oracle | Last | First |

To make behavior explicit:

```sql
-- PostgreSQL / Oracle
SELECT first_name, salary
FROM employees
ORDER BY salary DESC NULLS LAST;
```

> **Production pitfall:** If your application depends on NULL ordering, always write `NULLS FIRST` or `NULLS LAST` explicitly. The default varies across databases.

---

## LIMIT / OFFSET

Restricts the number of rows returned.

### Syntax Differences

| Database | Syntax |
|----------|--------|
| PostgreSQL, MySQL, SQLite | `LIMIT n OFFSET m` or `LIMIT m, n` |
| SQL Server | `OFFSET m ROWS FETCH NEXT n ROWS ONLY` |
| Oracle | `FETCH FIRST n ROWS ONLY` (12c+) or rownum |
| MySQL (older) | `LIMIT m, n` |

```sql
-- PostgreSQL / MySQL
SELECT first_name, salary
FROM employees
ORDER BY salary DESC
LIMIT 3;
```

| first_name | salary |
|------------|--------|
| Frank | 125000.00 |
| Charlie | 110000.00 |
| Alice | 95000.00 |

```sql
-- SQL Server
SELECT first_name, salary
FROM employees
ORDER BY salary DESC
OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY;
```

### Pagination

```sql
-- Page 1 (rows 1-10)
SELECT * FROM orders
ORDER BY order_id
LIMIT 10 OFFSET 0;

-- Page 2 (rows 11-20)
SELECT * FROM orders
ORDER BY order_id
LIMIT 10 OFFSET 10;
```

> **Performance note:** `OFFSET` must scan and skip all previous rows. For large tables, `OFFSET 1000000` is slow. **Keyset pagination** (also called cursor-based pagination) is faster — see the pagination section.

> ```sql
> -- Keyset pagination (much faster for large offsets)
> SELECT * FROM orders
> WHERE order_id > 1000000
> ORDER BY order_id
> LIMIT 10;
> ```

---

## DISTINCT

Removes duplicate rows from the result set.

```sql
SELECT DISTINCT department_id
FROM employees;
```

| department_id |
|---------------|
| 1 |
| 2 |
| 3 |
| NULL |

> **NULL behavior:** `DISTINCT` treats all NULLs as one value. There is only one NULL in the output even if multiple rows have NULL.

```sql
SELECT DISTINCT location
FROM departments;
```

| location |
|----------|
| New York |
| San Francisco |
| Chicago |

> Common misconception: `DISTINCT` is not a performance tool. It adds a sort or hash step to remove duplicates. If you are getting unexpected duplicates, the problem is usually in your JOINs or missing GROUP BY, not a lack of `DISTINCT`.
>
> See the JOIN duplication section for how JOINs accidentally create duplicate rows.

---

## INSERT

Adds new rows to a table.

### Syntax

```sql
INSERT INTO table_name (column1, column2, ...)
VALUES (value1, value2, ...);
```

### Single Row

```sql
INSERT INTO departments (department_id, department_name, location)
VALUES (5, 'Legal', 'Boston');
```

### Multiple Rows

```sql
INSERT INTO departments (department_id, department_name, location)
VALUES
    (6, 'Research', 'Seattle'),
    (7, 'Support', 'Austin');
```

### INSERT with SELECT

```sql
INSERT INTO archived_employees (employee_id, first_name, last_name)
SELECT employee_id, first_name, last_name
FROM employees
WHERE hire_date < '2020-01-01';
```

### NULL Behavior in INSERT

```sql
-- Explicit NULL
INSERT INTO employees (employee_id, first_name, last_name, hire_date, email)
VALUES (9, 'Ivy', 'Clark', '2024-01-01', NULL);

-- Omitting a column (defaults to NULL if no DEFAULT defined)
INSERT INTO employees (employee_id, first_name, last_name, hire_date)
VALUES (10, 'Jack', 'White', '2024-02-01');
```

Both result in `email = NULL`.

> **Production pitfall:** Always specify column names in `INSERT`. If someone adds, removes, or reorders a column, your query breaks without warning.

```sql
-- BAD: column order dependent
INSERT INTO employees VALUES (11, 'Kim', 'Lee', 'kim@co.com', '2024-03-01', 70000, 1, 1);

-- BETTER: explicit column list
INSERT INTO employees (employee_id, first_name, last_name, email, hire_date, salary, department_id, manager_id)
VALUES (11, 'Kim', 'Lee', 'kim@co.com', '2024-03-01', 70000, 1, 1);
```

---

## UPDATE

Modifies existing rows.

### Syntax

```sql
UPDATE table_name
SET column1 = value1, column2 = value2, ...
WHERE condition;
```

```sql
UPDATE employees
SET salary = salary * 1.05
WHERE department_id = 1;
```

### Update with NULL

```sql
UPDATE employees
SET email = NULL
WHERE employee_id = 5;
```

> **Production pitfall:** Running `UPDATE` without a `WHERE` clause updates **every row** in the table. Always verify with a `SELECT` first:
>
> ```sql
> -- Step 1: Preview what will be updated
> SELECT employee_id, first_name, salary
> FROM employees
> WHERE department_id = 1;
>
> -- Step 2: Run the update
> UPDATE employees
> SET salary = salary * 1.05
> WHERE department_id = 1;
> ```

### Update from Another Table

> Syntax varies significantly across databases.

```sql
-- PostgreSQL, MySQL, SQL Server
UPDATE employees e
SET salary = salary * 1.10
WHERE e.department_id = (
    SELECT d.department_id
    FROM departments d
    WHERE d.department_name = 'Engineering'
);
```

---

## DELETE

Removes rows from a table.

### Syntax

```sql
DELETE FROM table_name
WHERE condition;
```

```sql
DELETE FROM employees
WHERE employee_id = 10;
```

> **Production pitfall:** `DELETE` without `WHERE` deletes **all rows**. Always run a `SELECT` with the same `WHERE` first to verify.

### DELETE vs TRUNCATE vs DROP

| Feature | DELETE | TRUNCATE | DROP |
|---------|--------|----------|------|
| What it removes | Specific rows (or all) | All rows | Entire table + data + schema |
| WHERE clause | Yes | No | No |
| Rollback | Yes (in transaction) | Yes (in most databases) | Yes (in transaction) |
| Identity reset | No | Yes (resets auto-increment) | N/A |
| Triggers | Fires DELETE triggers | Does NOT fire triggers | N/A |
| Speed (large tables) | Slower (row-by-row) | Faster (deallocates pages) | Fastest |
| Logging | Logs each row | Logs page deallocation | Logs schema change |

```sql
-- Removes all rows, but table structure remains
DELETE FROM employees;

-- Same effect but faster for large tables
TRUNCATE TABLE employees;

-- Removes the table entirely (structure + data)
DROP TABLE employees;
```

> **Production danger:** `TRUNCATE` and `DROP` are DDL operations. In some databases (MySQL with InnoDB), they cause an implicit `COMMIT` and cannot be rolled back. Always verify before running these in production.

---

## NULL — The Most Misunderstood Concept

NULL is **not** a value. It represents the **absence of a value** or **unknown data**. Understanding NULL is essential because it behaves differently from what most people expect.

### Three-Valued Logic

SQL uses three-valued logic: `TRUE`, `FALSE`, and `UNKNOWN`. NULL produces `UNKNOWN` in most comparisons.

| A | B | A = B |
|---|---|-------|
| 1 | 1 | TRUE |
| 1 | 2 | FALSE |
| NULL | 1 | UNKNOWN |
| 1 | NULL | UNKNOWN |
| NULL | NULL | UNKNOWN |

### Core NULL Rules

```sql
-- NULL = NULL is UNKNOWN, not TRUE
SELECT * FROM employees WHERE salary = NULL;
-- Returns: 0 rows. NEVER works.

-- Use IS NULL instead
SELECT * FROM employees WHERE salary IS NULL;
-- Returns: Hank (employee_id = 8)

-- NULL <> NULL is also UNKNOWN
SELECT * FROM employees WHERE salary <> NULL;
-- Returns: 0 rows. NEVER works.

-- Use IS NOT NULL
SELECT * FROM employees WHERE salary IS NOT NULL;
-- Returns: all employees except Hank
```

> Interview trap: `NULL = NULL` returns UNKNOWN (treated as FALSE in WHERE). Many interviewees expect it to return TRUE. It does not.

### NULL in Expressions

```sql
SELECT
    NULL + 1,           -- NULL
    NULL * 5,           -- NULL
    NULL / 0,           -- NULL (not an error in most databases)
    10 + NULL,          -- NULL
    CONCAT('hello', NULL) -- NULL (in PostgreSQL, MySQL, SQL Server)
                          -- '' in Oracle (depends on NLS settings)
```

### NULL in Aggregates

`COUNT(*)` counts all rows. `COUNT(column)` ignores NULLs.

```sql
SELECT
    COUNT(*)            AS count_all,      -- 8 (all rows)
    COUNT(email)        AS count_email,    -- 6 (NULLs excluded)
    COUNT(department_id) AS count_dept     -- 7 (Grace has NULL department_id)
FROM employees;
```

| count_all | count_email | count_dept |
|-----------|-------------|------------|
| 8 | 6 | 7 |

### COUNT(*) vs COUNT(1)

```sql
SELECT COUNT(*) FROM employees;    -- 8
SELECT COUNT(1) FROM employees;    -- 8
```

They are equivalent. Both count all rows. The optimizer treats them identically in all major databases. Use `COUNT(*)` — it is the standard and more readable.

### COALESCE

Returns the first non-NULL value from a list.

```sql
SELECT
    first_name,
    salary,
    COALESCE(salary, 0) AS salary_or_zero
FROM employees;
```

| first_name | salary | salary_or_zero |
|------------|--------|----------------|
| Alice | 95000.00 | 95000.00 |
| Bob | 72000.00 | 72000.00 |
| ... | ... | ... |
| Hank | NULL | 0 |

```sql
-- Practical use: provide a default email
SELECT
    first_name,
    COALESCE(email, 'No email provided') AS email
FROM employees;
```

### NULLIF

Returns NULL if the two arguments are equal; otherwise returns the first argument.

```sql
-- Prevent division by zero
SELECT
    employee_id,
    salary,
    NULLIF(department_id, 0) AS safe_department
FROM employees;
-- If department_id is 0, it becomes NULL
```

Common use with division:

```sql
SELECT
    order_id,
    quantity,
    price,
    price / NULLIF(quantity, 0) AS unit_price
FROM order_items;
-- Prevents division by zero error
```

### NULL in Sorting

```sql
-- NULLs first (explicit)
SELECT first_name, salary
FROM employees
ORDER BY salary ASC NULLS FIRST;

-- NULLs last (explicit)
SELECT first_name, salary
FROM employees
ORDER BY salary ASC NULLS LAST;
```

### IS DISTINCT FROM / IS NOT DISTINCT FROM

These operators treat NULL as a comparable value. They are the safe way to compare potentially NULL columns.

> PostgreSQL, MySQL (8.0+), SQL Server support this syntax. Oracle does not (use NVL or COALESCE workaround).

```sql
-- Standard comparison: NULL compared to anything is UNKNOWN
SELECT * FROM employees WHERE department_id = NULL;
-- Returns nothing

-- IS DISTINCT FROM: treats NULL as a comparable value
SELECT * FROM employees WHERE department_id IS DISTINCT FROM 1;
-- Returns all employees NOT in department 1, INCLUDING those with NULL department_id
```

| department_id | department_id IS DISTINCT FROM 1 |
|---------------|----------------------------------|
| 1 | FALSE |
| 2 | TRUE |
| 3 | TRUE |
| NULL | TRUE (NULL is "different from" 1) |

### NOT IN + NULL

This is one of the most dangerous SQL traps.

```sql
-- Find employees NOT in departments 1 or 2
SELECT first_name, department_id
FROM employees
WHERE department_id NOT IN (1, 2);
```

| first_name | department_id |
|------------|---------------|
| Frank | 3 |
| Hank | 3 |

So far so good. But watch what happens:

```sql
-- Find employees NOT in departments 1, 2, or the NULL department
SELECT first_name, department_id
FROM employees
WHERE department_id NOT IN (1, 2, NULL);
```

**Result: 0 rows.** Even though Frank (dept 3) and Hank (dept 3) should logically be returned.

**Why?** `NOT IN` expands to:

```sql
WHERE department_id <> 1
  AND department_id <> 2
  AND department_id <> NULL;
```

And `department_id <> NULL` is always UNKNOWN. So the entire expression is UNKNOWN for every row, and no rows are returned.

> Production pitfall: If the subquery list might contain NULLs, use `NOT EXISTS` instead of `NOT IN`:
>
> ```sql
> SELECT first_name, department_id
> FROM employees e
> WHERE NOT EXISTS (
>     SELECT 1 FROM (VALUES (1), (2), (NULL)) AS excluded(d)
>     WHERE excluded.d = e.department_id
> );
> ```

### NULLIF + COALESCE Combination

```sql
-- Calculate average salary, treating NULL as 0
SELECT
    COALESCE(AVG(salary), 0) AS avg_salary
FROM employees;
-- With NULL salary for Hank, AVG without COALESCE would be:
-- (95000 + 72000 + 110000 + 68000 + 85000 + 125000 + 55000 + NULL) / 7 rows
-- COUNT(salary) = 7 (NULL excluded), so AVG = 610000 / 7 ≈ 87142.86
-- With COALESCE: (95000 + 72000 + 110000 + 68000 + 85000 + 125000 + 55000 + 0) / 8 = 76250.00
```

---

## Aliases

Aliases rename columns or tables in the result set. They do not change the database schema.

### Column Aliases

```sql
SELECT
    first_name AS "First Name",
    salary * 12 AS annual_salary
FROM employees;
```

| First Name | annual_salary |
|------------|---------------|
| Alice | 1140000.00 |
| Bob | 864000.00 |

### Table Aliases

```sql
SELECT e.first_name, e.salary
FROM employees e
WHERE e.department_id = 1;
```

Table aliases are essential in JOINs to avoid ambiguity when two tables have columns with the same name.

### Quoted Identifiers

Use double quotes (`"..."`) for aliases with spaces, special characters, or reserved words:

```sql
SELECT first_name AS "Employee Name"
FROM employees;
```

> PostgreSQL, SQL Server, Oracle use double quotes. MySQL uses backticks for identifiers, but double quotes work if `ANSI_QUOTES` mode is enabled.

---

## Common Mistakes

### 1. Using WHERE Instead of HAVING

```sql
-- WRONG: Cannot use aggregate in WHERE
SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
WHERE COUNT(*) > 1;
-- ERROR

-- CORRECT
SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 1;
```

### 2. Missing GROUP BY Columns

```sql
-- WRONG: PostgreSQL, SQL Server, Oracle reject this
SELECT first_name, department_id, COUNT(*)
FROM employees;
-- ERROR: first_name is not in GROUP BY and not aggregated

-- CORRECT
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id;

-- Or if you want first_name (use window function):
SELECT first_name, department_id,
       COUNT(*) OVER (PARTITION BY department_id) AS dept_count
FROM employees;
```

> MySQL (with default settings) allows this non-standard behavior, which leads to unpredictable results. The `first_name` returned is arbitrary.

### 3. Joining Without a Condition (Cartesian Product)

```sql
-- WRONG: produces a Cartesian product
SELECT e.first_name, d.department_name
FROM employees e, departments d;
-- Returns 8 × 4 = 32 rows (every employee paired with every department)

-- CORRECT
SELECT e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;
```

### 4. SELECT * in Production

```sql
-- BAD
SELECT * FROM employees WHERE employee_id = 1;

-- BETTER
SELECT employee_id, first_name, last_name, salary
FROM employees
WHERE employee_id = 1;
```

### 5. Not Handling NULL in Aggregates

```sql
-- Problem: SUM ignores NULLs, so the total may be less than expected
SELECT SUM(salary) FROM employees;
-- Returns 610000.00 (Hank's NULL salary is excluded from count but not the sum)

-- If you want to treat NULL as 0:
SELECT SUM(COALESCE(salary, 0)) FROM employees;
-- Returns 610000.00 (same in this case, but different if NULL meant "should be 0")
```

---

## Production Pitfalls

### Implicit Type Conversion

```sql
-- If email is VARCHAR and you do:
SELECT * FROM employees WHERE email = 12345;

-- Some databases will convert the VARCHAR to a number, which:
-- 1. Prevents index usage (sargability issue)
-- 2. May return unexpected results
-- 3. May throw errors
```

Always match types explicitly.

### WHERE Clause on Functions

```sql
-- BAD: Prevents index usage
SELECT * FROM employees
WHERE YEAR(hire_date) = 2020;

-- BETTER: Sargable — can use an index on hire_date
SELECT * FROM employees
WHERE hire_date >= '2020-01-01'
  AND hire_date < '2021-01-01';
```

> See the sargability section for a full explanation.

### Committing Without WHERE

```sql
-- DANGER: This updates every row
UPDATE employees SET salary = salary * 1.05;
```

Always use a transaction in production:

```sql
BEGIN;
UPDATE employees SET salary = salary * 1.05 WHERE department_id = 1;
-- Verify
SELECT SUM(salary) FROM employees WHERE department_id = 1;
COMMIT;
-- or ROLLBACK; if something is wrong
```

---

## Performance Implications

At the basics level, the most important performance concepts are:

1. **Always specify only the columns you need** instead of `SELECT *`
2. **Use WHERE to filter early** — reduce the data that flows to later steps
3. **Avoid functions on indexed columns in WHERE** (sargability)
4. **Use EXPLAIN / EXPLAIN ANALYZE** to see what the optimizer actually does

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT first_name, salary
FROM employees
WHERE department_id = 1;

-- MySQL
EXPLAIN
SELECT first_name, salary
FROM employees
WHERE department_id = 1;

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT first_name, salary FROM employees WHERE department_id = 1;
```

> Do not guess about performance. Always verify with an execution plan. A query that looks slow may be fast with the right index. A query that looks simple may scan the entire table.

---

## Best Practices

| Practice | Why |
|----------|-----|
| Always specify column names in SELECT | Avoids breaking on schema changes |
| Always specify column names in INSERT | Protects against column order changes |
| Use `IS NULL` / `IS NOT NULL` | `= NULL` never works |
| Use `EXISTS` instead of `IN` when the subquery may contain NULLs | `NOT IN + NULL` returns zero rows |
| Use `COALESCE` for default values | Handles NULL gracefully |
| Use `NULLIF` to prevent division by zero | Avoids runtime errors |
| Use explicit JOIN syntax (ANSI SQL) | Clearer intent, less error-prone |
| Always run SELECT before UPDATE/DELETE | Verify what will be affected |
| Use transactions for multi-statement changes | Enable rollback on error |
| Use EXPLAIN to understand query plans | Never guess about performance |

---

# Interview Questions

## Beginner

1. What is the difference between `WHERE` and `HAVING`?
2. What is the difference between `DELETE`, `TRUNCATE`, and `DROP`?
3. What is the difference between `COUNT(*)` and `COUNT(column)`?
4. What does `DISTINCT` do?
5. Write a query to find all employees who do not have a department assigned.
6. What is the grain of the `order_items` table in our sample schema?
7. Why should you use `IS NULL` instead of `= NULL`?
8. What is the difference between `BETWEEN` and using `>=` and `<=`?

## Intermediate

9. What is the logical order of SQL clause evaluation?
10. Explain why `NOT IN (1, 2, NULL)` returns zero rows for a column that has NULL values.
11. What is the difference between `COUNT(*)`, `COUNT(1)`, and `COUNT(email)` in our `employees` table?
12. Write a query to calculate each employee's annual salary using `COALESCE` to handle NULL salaries.
13. What problem can `SELECT *` cause in production code?
14. Why can't you use aggregate functions like `SUM()` in a `WHERE` clause?
15. How does `NULLIF` help prevent division by zero?

## Advanced

16. What is `IS DISTINCT FROM` and when would you use it?
17. Why does `NULL = NULL` return UNKNOWN instead of TRUE?
18. Explain three-valued logic with a truth table for `AND` and `OR`.
19. How does `NULL` behave in `ORDER BY` across different databases?
20. Write a query that returns all employees not in a list that might contain NULLs, using both `NOT IN` (and explain why it fails) and `NOT EXISTS`.

## Scenario Based

21. You have a query `SELECT * FROM employees WHERE YEAR(hire_date) = 2020`. It is running slowly on a table with 10 million rows. Explain why and provide a better alternative.
22. A junior developer writes `UPDATE employees SET salary = salary * 1.05`. What is wrong and how do you fix it?
23. You receive a query that returns unexpected duplicate rows after adding a JOIN. What is the most likely cause?
24. You need to find employees who have never placed an order. Write the query using two different approaches.
25. Explain the difference between `LIMIT 10 OFFSET 20` and keyset pagination. When would you prefer one over the other?

## Tricky

26. What is the result of `SELECT COUNT(*) FROM (SELECT NULL AS x UNION ALL SELECT NULL) t;`?
27. What is the result of `SELECT NULL = NULL;`?
28. If a column allows NULLs and you run `SELECT MIN(salary) FROM employees;` — does the result include NULL? Why or why not?
29. What happens if you run `INSERT INTO employees DEFAULT VALUES;` when there is no `DEFAULT` defined on required columns?
30. Why does `SELECT DISTINCT department_id FROM employees WHERE department_id IN (NULL)` not return rows where `department_id` is NULL?

## Output Prediction

Given the sample tables above, predict the output:

31.
```sql
SELECT COUNT(*) AS total, COUNT(salary) AS with_salary
FROM employees;
```

32.
```sql
SELECT first_name, COALESCE(email, CONCAT(first_name, '@unknown.com')) AS email
FROM employees
WHERE email IS NULL;
```

33.
```sql
SELECT department_id, COUNT(*) AS cnt
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 2;
```

34.
```sql
SELECT NULLIF(10, 10), NULLIF(10, 20);
```

35.
```sql
SELECT COUNT(DISTINCT location) FROM departments;
```

## Debugging

36. The following query returns 0 rows. Why?
```sql
SELECT * FROM employees WHERE department_id NOT IN (SELECT department_id FROM departments WHERE location IS NULL);
```

37. This query returns duplicate rows after joining. How do you fix it?
```sql
SELECT e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;
```

38. A developer says `SELECT * FROM employees WHERE salary = NULL` is returning no results but they are sure some employees have a NULL salary. What is wrong?

## Performance

39. You have a query:
```sql
SELECT * FROM employees WHERE UPPER(first_name) = 'ALICE';
```
Why might this be slow? How would you fix it?

40. You need to paginate through 1 million rows using `OFFSET`. After page 100, queries become noticeably slower. Explain why and suggest a better approach.

---
