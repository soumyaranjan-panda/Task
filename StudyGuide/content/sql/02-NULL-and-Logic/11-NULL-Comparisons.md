# NULL Comparisons

## Table of Contents

1. [What is NULL?](#what-is-null)
2. [Three-Valued Logic](#three-valued-logic)
3. [The = NULL Myth](#the--null-myth)
4. [IS NULL and IS NOT NULL](#is-null-and-is-not-null)
5. [IS DISTINCT FROM / IS NOT DISTINCT FROM](#is-distinct-from--is-not-distinct-from)
6. [NULL in Comparisons](#null-in-comparisons)
7. [NULL in JOINs](#null-in-joins)
8. [NULL in IN / NOT IN](#null-in-in--not-in)
9. [NULL in EXISTS / NOT EXISTS](#null-in-exists--not-exists)
10. [NULL in Aggregate Functions](#null-in-aggregate-functions)
11. [NULLIF and COALESCE with Comparisons](#nullif-and-coalesce-with-comparisons)
12. [NULL in ORDER BY and DISTINCT](#null-in-order-by-and-distinct)
13. [NULL in GROUP BY](#null-in-group-by)
14. [NULL in Window Functions](#null-in-window-functions)
15. [NULL in CASE Expressions](#null-in-case-expressions)
16. [NULL and Boolean Expressions](#null-and-boolean-expressions)
17. [Database-Specific Differences](#database-specific-differences)
18. [Best Practices](#best-practices)

---

## What is NULL?

**NULL** represents a missing, unknown, or inapplicable value. It is **not** a value — it is the **absence** of a value.

One row in `employees` represents one employee.

```sql
CREATE TABLE employees (
    id          INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100),          -- can be NULL (not provided)
    hire_date   DATE NOT NULL,
    manager_id  INT                    -- can be NULL (top-level employees)
);

INSERT INTO employees VALUES
(1, 'Alice',   'alice@co.com',  '2020-01-15', NULL),   -- no manager
(2, 'Bob',     'bob@co.com',    '2021-03-22', 1),       -- reports to Alice
(3, 'Charlie', NULL,            '2022-07-01', 1),        -- email not provided
(4, 'Diana',   'diana@co.com',  '2023-11-10', NULL),   -- no manager
(5, 'Eve',     NULL,            '2024-02-28', 3);        -- email not provided
```

**Grain:** One row = one employee.

| id  | name    | email        | hire_date  | manager_id |
| --- | ------- | ------------ | ---------- | ---------- |
| 1   | Alice   | alice@co.com | 2020-01-15 | NULL       |
| 2   | Bob     | bob@co.com   | 2021-03-22 | 1          |
| 3   | Charlie | NULL         | 2022-07-01 | 1          |
| 4   | Diana   | diana@co.com | 2023-11-10 | NULL       |
| 5   | Eve     | NULL         | 2024-02-28 | 3          |

---

## Three-Valued Logic

SQL uses **three-valued logic** (3VL): `TRUE`, `FALSE`, and `UNKNOWN`. Every comparison involving NULL produces `UNKNOWN`, not `TRUE` or `FALSE`.

| A    | B    | A = B   |
| ---- | ---- | ------- |
| 10   | 10   | TRUE    |
| 10   | 20   | FALSE   |
| 10   | NULL | UNKNOWN |
| NULL | NULL | UNKNOWN |
| NULL | 10   | UNKNOWN |

In a `WHERE` clause, only rows where the condition evaluates to `TRUE` are returned. `FALSE` and `UNKNOWN` are both filtered out.

This is the root cause of nearly every NULL-related surprise in SQL.

> **Common misconception:** "NULL equals NULL."
> In SQL, `NULL = NULL` does **not** return `TRUE`. It returns `UNKNOWN`.

---

## The = NULL Myth

### BAD APPROACH

```sql
-- Returns NOTHING. Always.
SELECT *
FROM employees
WHERE manager_id = NULL;
```

**Result:** Empty set — even though rows 1 and 4 have `manager_id = NULL`.

**Why:** `manager_id = NULL` evaluates to `UNKNOWN` for every row. No row satisfies `UNKNOWN` in a `WHERE` clause.

### BAD APPROACH

```sql
-- Also returns NOTHING. Always.
SELECT *
FROM employees
WHERE manager_id <> NULL;
```

**Why:** `manager_id <> NULL` also evaluates to `UNKNOWN` for every row.

### THE RULE

> **Never use `=` or `<>` to compare with NULL. Always use `IS NULL` or `IS NOT NULL`.**

---

## IS NULL and IS NOT NULL

`IS NULL` and `IS NOT NULL` are the **only** correct way to check for NULL using standard SQL.

### Syntax

```sql
column IS NULL
column IS NOT NULL
```

### Example: Finding employees with no manager

```sql
SELECT id, name, email
FROM employees
WHERE manager_id IS NULL;
```

| id  | name  | email        |
| --- | ----- | ------------ |
| 1   | Alice | alice@co.com |
| 4   | Diana | diana@co.com |

### Example: Finding employees with an email on file

```sql
SELECT id, name, email
FROM employees
WHERE email IS NOT NULL;
```

| id  | name  | email        |
| --- | ----- | ------------ |
| 1   | Alice | alice@co.com |
| 2   | Bob   | bob@co.com   |
| 4   | Diana | diana@co.com |

### NULL Behavior

- `NULL IS NULL` → `TRUE`
- `NULL IS NOT NULL` → `FALSE`
- `10 IS NULL` → `FALSE`
- `10 IS NOT NULL` → `TRUE`

This is **not** a comparison in the traditional sense — it is a **special predicate** that checks the NULL-ness of a value.

> **Production pitfall:** In some application layers (ORMs, string concatenation in code), developers accidentally write `WHERE column = NULL` because they think NULL is a value. This silently returns zero rows, causing data to "disappear" from reports.

---

## IS DISTINCT FROM / IS NOT DISTINCT FROM

`IS DISTINCT FROM` is a NULL-safe equality operator. Unlike `=`, it treats `NULL` as a comparable value: two NULLs are considered equal, and NULL compared to a non-NULL value is considered different.

### Syntax

```sql
column1 IS DISTINCT FROM column2    -- NULL-safe NOT EQUAL
column1 IS NOT DISTINCT FROM column2 -- NULL-safe EQUAL
```

### Comparison Table

| Expression    | Normal Behavior | IS DISTINCT FROM Behavior |
| ------------- | --------------- | ------------------------- |
| `10 = 10`     | TRUE            | FALSE (not distinct)      |
| `10 = 20`     | FALSE           | TRUE (distinct)           |
| `10 = NULL`   | UNKNOWN         | TRUE (distinct)           |
| `NULL = NULL` | UNKNOWN         | FALSE (not distinct)      |
| `NULL = 10`   | UNKNOWN         | TRUE (distinct)           |

### Example: Rows where email is either both NULL or both the same

```sql
SELECT
    e1.id AS emp1,
    e2.id AS emp2,
    e1.email AS email1,
    e2.email AS email2
FROM employees e1
CROSS JOIN employees e2
WHERE e1.email IS NOT DISTINCT FROM e2.email
  AND e1.id < e2.id;
```

| emp1 | emp2 | email1       | email2     |
| ---- | ---- | ------------ | ---------- | ---------------------- |
| 3    | 5    | NULL         | NULL       |
| 1    | 2    | alice@co.com | bob@co.com | — **no**, these differ |

Actually corrected:

| emp1 | emp2 | email1 | email2 |
| ---- | ---- | ------ | ------ |
| 3    | 5    | NULL   | NULL   |

Only Charlie (3) and Eve (5) share the same email status (both NULL).

### IS DISTINCT FROM

```sql
SELECT *
FROM employees
WHERE email IS DISTINCT FROM 'alice@co.com';
```

Returns all rows **except** Alice — including rows where email is NULL.

### When to Use

- When you need NULL-safe equality comparisons
- In `FULL OUTER JOIN` conditions
- When comparing two columns that may both be NULL
- When deduplicating and NULLs should be treated as equal

> **PostgreSQL:** Supports `IS DISTINCT FROM` and `IS NOT DISTINCT FROM` natively.
>
> **MySQL:** Supports it since 5.7 using the `NULL-safe equality operator` `<=>`:
>
> ```sql
> -- MySQL NULL-safe equality
> SELECT * FROM employees WHERE email <=> NULL;
> ```
>
> **SQL Server:** Does **not** support `IS DISTINCT FROM` natively. Use:
>
> ```sql
> -- SQL Server equivalent
> WHERE (column1 = column2) OR (column1 IS NULL AND column2 IS NULL)
> ```
>
> **Oracle:** Does **not** support `IS DISTINCT FROM`. Use the same pattern as SQL Server.

---

## NULL in Comparisons

### NULL with Arithmetic

Any arithmetic operation involving NULL produces NULL:

```sql
SELECT
    10 + NULL       AS result1,
    10 * NULL       AS result2,
    NULL / 10       AS result3,
    NULL + NULL     AS result4;
```

| result1 | result2 | result3 | result4 |
| ------- | ------- | ------- | ------- |
| NULL    | NULL    | NULL    | NULL    |

### NULL in Boolean Expressions

| Expression       | Result  |
| ---------------- | ------- |
| `NULL AND TRUE`  | UNKNOWN |
| `NULL AND FALSE` | FALSE   |
| `NULL OR TRUE`   | TRUE    |
| `NULL OR FALSE`  | UNKNOWN |
| `NOT NULL`       | UNKNOWN |
| `NULL AND NULL`  | UNKNOWN |
| `NULL OR NULL`   | UNKNOWN |

**Important:** `NULL AND FALSE` always returns `FALSE` (because at least one side is FALSE, so the AND is definitely false). `NULL OR TRUE` always returns `TRUE` (because at least one side is TRUE, so the OR is definitely true).

### NULL with Subqueries

```sql
-- This may behave unexpectedly
SELECT *
FROM employees
WHERE department_id IN (SELECT id FROM departments WHERE name = 'Sales');
```

If the subquery returns NULL, `IN` can produce unexpected results — see the dedicated section below.

---

## NULL in JOINs

### NULLs in JOIN ON Clauses

Rows where the join key is NULL will **not match** any other row — including another NULL.

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    amount      DECIMAL(10,2)
);

INSERT INTO orders VALUES
(1, 101, 50.00),
(2, 102, 75.00),
(3, NULL, 30.00);  -- customer_id unknown

SELECT o.order_id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

Order 3 (customer_id = NULL) is **dropped** from the result because `NULL = 101`, `NULL = 102`, etc., all evaluate to `UNKNOWN`.

### BAD APPROACH

```sql
-- Orders without matching customers are silently lost
SELECT o.order_id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

### BETTER APPROACH

```sql
-- Use LEFT JOIN to include orders with NULL customer_id
SELECT o.order_id, c.name
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;
```

Even with `LEFT JOIN`, order 3 will appear with `c.name = NULL` — but it **will** appear.

### NULLs in FULL OUTER JOIN

`IS DISTINCT FROM` is particularly useful in `FULL OUTER JOIN` conditions:

```sql
-- Compare two versions of a table
SELECT
    a.id,
    a.value IS NOT DISTINCT FROM b.value AS same_value
FROM table_a a
FULL OUTER JOIN table_b b ON a.id = b.id;
```

> **Production pitfall:** When joining on columns that can be NULL, ensure your `JOIN ON` condition handles NULLs correctly. A `LEFT JOIN` with a NULL key in the ON clause can silently filter out rows that you expect to keep, if the ON condition includes additional predicates involving the NULL column.

---

## NULL in IN / NOT IN

### IN with NULLs

`IN` works by expanding to a series of `OR` comparisons:

```sql
-- These are equivalent
WHERE x IN (1, 2, 3)
WHERE x = 1 OR x = 2 OR x = 3

-- With NULL:
WHERE x IN (1, 2, NULL)
WHERE x = 1 OR x = 2 OR x = NULL
```

If `x = 1` or `x = 2` matches, the row is returned. If `x = NULL`, the result is `UNKNOWN`, so the row is **not** returned. The NULL in the list is effectively ignored for matches.

### NOT IN with NULLs — THE TRAP

```sql
SELECT *
FROM employees
WHERE id NOT IN (1, 2, NULL);
```

This expands to:

```sql
WHERE id <> 1 AND id <> 2 AND id <> NULL
```

`id <> NULL` is always `UNKNOWN`. `UNKNOWN AND anything` is either `UNKNOWN` or `FALSE`. The entire condition is never `TRUE`.

**Result:** Empty set — even though ids 3, 4, 5 should logically be excluded only from (1, 2, NULL).

> **Interview trap:** "What does `WHERE x NOT IN (1, 2, NULL)` return?"
> **Answer:** Nothing. `NOT IN` with a NULL in the list returns zero rows.

### BAD APPROACH

```sql
-- BUG: If the subquery returns ANY NULL, this returns NOTHING
SELECT *
FROM employees
WHERE id NOT IN (
    SELECT manager_id FROM employees
);
```

### BETTER APPROACH

```sql
-- Use NOT EXISTS — NULLs are handled correctly
SELECT *
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM employees m
    WHERE m.manager_id = e.id
);
```

### BETTER APPROACH

```sql
-- Or filter out NULLs from the subquery
SELECT *
FROM employees
WHERE id NOT IN (
    SELECT manager_id FROM employees WHERE manager_id IS NOT NULL
);
```

### Comparison Table

| Scenario              | IN              | NOT IN           | EXISTS          | NOT EXISTS       |
| --------------------- | --------------- | ---------------- | --------------- | ---------------- |
| Subquery has no NULLs | Works           | Works            | Works           | Works            |
| Subquery has NULLs    | May miss rows   | Returns nothing  | Works           | Works            |
| Subquery is empty     | Returns nothing | Returns all rows | Returns nothing | Returns all rows |

---

## NULL in EXISTS / NOT EXISTS

`EXISTS` and `NOT EXISTS` use a semi-join and handle NULLs naturally. They test for the **existence of rows**, not for value equality.

```sql
-- Find employees who are managers
SELECT *
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM employees m
    WHERE m.manager_id = e.id
);
```

| id  | name    | email        | hire_date  | manager_id |
| --- | ------- | ------------ | ---------- | ---------- |
| 1   | Alice   | alice@co.com | 2020-01-15 | NULL       |
| 3   | Charlie | NULL         | 2022-07-01 | 1          |

Alice manages Bob and Charlie. Charlie manages Eve.

```sql
-- Find employees who are NOT managers
SELECT *
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM employees m
    WHERE m.manager_id = e.id
);
```

| id  | name  | email        | hire_date  | manager_id |
| --- | ----- | ------------ | ---------- | ---------- |
| 2   | Bob   | bob@co.com   | 2021-03-22 | 1          |
| 4   | Diana | diana@co.com | 2023-11-10 | NULL       |
| 5   | Eve   | NULL         | 2024-02-28 | 3          |

> **When to use EXISTS/NOT EXISTS over IN/NOT IN:**
>
> - When the subquery may return NULLs
> - When you only need to check existence (not retrieve values)
> - When the subquery is correlated and performance is better with an index on the join column

---

## NULL in Aggregate Functions

### COUNT(\*) vs COUNT(column)

```sql
SELECT
    COUNT(*)          AS cnt_all,
    COUNT(email)      AS cnt_email,
    COUNT(DISTINCT email) AS cnt_distinct_email
FROM employees;
```

| cnt_all | cnt_email | cnt_distinct_email |
| ------- | --------- | ------------------ |
| 5       | 3         | 3                  |

- `COUNT(*)` counts all rows (including NULLs).
- `COUNT(email)` counts only rows where `email IS NOT NULL`.
- `COUNT(DISTINCT email)` counts distinct non-NULL values.

### SUM, AVG, MIN, MAX with NULLs

NULLs are **ignored** in aggregate functions (except `COUNT(*)`):

```sql
SELECT
    SUM(manager_id)     AS sum_mgr,
    AVG(manager_id)     AS avg_mgr,
    MIN(manager_id)     AS min_mgr,
    MAX(manager_id)     AS max_mgr
FROM employees;
```

| sum_mgr | avg_mgr | min_mgr | max_mgr |
| ------- | ------- | ------- | ------- |
| 5       | 1.6667  | 1       | 3       |

NULLs are excluded. The average is computed over 3 non-NULL values (1 + 1 + 3 = 5, 5/3 ≈ 1.6667).

### Production Pitfall: Averages with NULLs

```sql
-- This does NOT include the NULLs as zeros
-- It computes average over only non-NULL rows
SELECT AVG(salary) FROM employees;
```

If you want NULLs treated as zero:

```sql
SELECT AVG(COALESCE(salary, 0)) FROM employees;
```

> **Production pitfall:** `AVG(salary)` and `AVG(COALESCE(salary, 0))` can give very different results. If 50% of salaries are NULL, the first gives the average of the known salaries; the second gives half that. Always be explicit about NULL handling in aggregates.

---

## NULLIF and COALESCE with Comparisons

### NULLIF

`NULLIF(a, b)` returns NULL if `a = b`, otherwise returns `a`. Useful to prevent division by zero:

```sql
-- BAD: division by zero possible
SELECT total / quantity FROM sales;

-- GOOD: returns NULL instead of error
SELECT total / NULLIF(quantity, 0) FROM sales;
```

### COALESCE

`COALESCE(a, b, c, ...)` returns the first non-NULL value:

```sql
-- Replace NULL email with a placeholder
SELECT
    name,
    COALESCE(email, 'No email on file') AS email_display
FROM employees;
```

| name    | email_display    |
| ------- | ---------------- |
| Alice   | alice@co.com     |
| Bob     | bob@co.com       |
| Charlie | No email on file |
| Diana   | diana@co.com     |
| Eve     | No email on file |

### COALESCE in Comparisons

```sql
-- Compare two values, treating NULL as a default
SELECT *
FROM employees
WHERE COALESCE(manager_id, 0) = COALESCE(1, 0);
```

> **Production pitfall:** Using `COALESCE` in comparisons can prevent index usage. See [Sargability](#performance-implications) below.

---

## NULL in ORDER BY and DISTINCT

### ORDER BY

By default, most databases place NULLs **last** in ascending order and **first** in descending order. This is database-specific.

```sql
-- PostgreSQL / Oracle: NULLs LAST by default in ASC
SELECT * FROM employees ORDER BY email ASC;

-- PostgreSQL: NULLs FIRST in ASC
SELECT * FROM employees ORDER BY email ASC NULLS FIRST;

-- SQL Server: NULLs are treated as the lowest value
-- (appear first in ASC, last in DESC)
SELECT * FROM employees ORDER BY email ASC;

-- MySQL: NULLs are treated as the lowest value
-- (appear first in ASC, last in DESC)
SELECT * FROM employees ORDER BY email ASC;
```

> **PostgreSQL** allows explicit `NULLS FIRST` / `NULLS LAST`.
>
> **SQL Server** does not support `NULLS FIRST`/`NULLS LAST` syntax. Use:
>
> ```sql
> ORDER BY CASE WHEN email IS NULL THEN 1 ELSE 0 END, email
> ```
>
> **MySQL** does not support `NULLS FIRST`/`NULLS LAST`. Use the same CASE trick.
>
> **Oracle** supports `NULLS FIRST`/`NULLS LAST`.

### DISTINCT

`DISTINCT` treats two NULLs as the same value:

```sql
SELECT DISTINCT email FROM employees;
```

| email        |
| ------------ |
| alice@co.com |
| bob@co.com   |
| diana@co.com |
| NULL         |

Even though Charlie and Eve both have NULL emails, only one NULL appears in the output. This is correct behavior — `DISTINCT` groups all NULLs together.

---

## NULL in GROUP BY

`GROUP BY` treats all NULLs as one group:

```sql
SELECT manager_id, COUNT(*) AS num_employees
FROM employees
GROUP BY manager_id;
```

| manager_id | num_employees |
| ---------- | ------------- |
| NULL       | 2             |
| 1          | 2             |
| 3          | 1             |

Two employees (Alice, Diana) have `manager_id = NULL`. They form one group.

---

## NULL in Window Functions

NULLs are treated as equal in `PARTITION BY`:

```sql
SELECT
    name,
    email,
    COUNT(*) OVER (PARTITION BY email) AS same_email_count
FROM employees;
```

| name    | email        | same_email_count |
| ------- | ------------ | ---------------- |
| Alice   | alice@co.com | 1                |
| Bob     | bob@co.com   | 1                |
| Charlie | NULL         | 2                |
| Diana   | diana@co.com | 1                |
| Eve     | NULL         | 2                |

### NULL in RANK / ROW_NUMBER

When sorting with NULLs, the position of NULLs depends on `NULLS FIRST` / `NULLS LAST`:

```sql
SELECT
    name,
    email,
    ROW_NUMBER() OVER (ORDER BY email NULLS LAST) AS rn
FROM employees;
```

| name    | email        | rn  |
| ------- | ------------ | --- |
| Alice   | alice@co.com | 1   |
| Bob     | bob@co.com   | 2   |
| Diana   | diana@co.com | 3   |
| Charlie | NULL         | 4   |
| Eve     | NULL         | 5   |

Without `NULLS LAST`, NULLs would appear first in most databases.

---

## NULL in CASE Expressions

```sql
SELECT
    name,
    CASE
        WHEN email IS NULL THEN 'No email'
        ELSE email
    END AS email_display
FROM employees;
```

**Important:** Never write `CASE WHEN email = NULL` — use `IS NULL`.

### BAD APPROACH

```sql
-- WRONG: this will never match
SELECT
    name,
    CASE email
        WHEN NULL THEN 'No email'   -- BUG
        ELSE email
    END AS email_display
FROM employees;
```

**Why:** The simple `CASE` syntax (`CASE expr WHEN value`) uses `=` to compare, which returns `UNKNOWN` for NULL.

### BETTER APPROACH

```sql
-- CORRECT: use the searched CASE with IS NULL
SELECT
    name,
    CASE
        WHEN email IS NULL THEN 'No email'
        ELSE email
    END AS email_display
FROM employees;
```

> **Interview trap:** What is the difference between:
>
> ```sql
> CASE x WHEN NULL THEN 'yes' ELSE 'no' END
> ```
>
> and
>
> ```sql
> CASE WHEN x IS NULL THEN 'yes' ELSE 'no' END
> ```
>
> The first always returns `'no'` because `x = NULL` is `UNKNOWN`. The second correctly identifies NULLs.

---

## NULL and Boolean Expressions

### NULL in CHECK Constraints

```sql
CREATE TABLE products (
    id    INT PRIMARY KEY,
    price DECIMAL(10,2) CHECK (price > 0)
);
```

If `price` is NULL, the CHECK constraint evaluates to `UNKNOWN`, and the row **is allowed** (NULL passes CHECK constraints). This is by design.

### NULL in UNIQUE Constraints

Most databases allow **multiple NULLs** in a UNIQUE column, because NULLs are not considered equal:

```sql
CREATE TABLE users (
    id       INT PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE
);

INSERT INTO users VALUES (1, NULL);  -- OK
INSERT INTO users VALUES (2, NULL);  -- OK — multiple NULLs allowed
```

> **PostgreSQL:** Allows multiple NULLs in a UNIQUE column.
>
> **SQL Server:** Allows multiple NULLs in a UNIQUE column.
>
> **MySQL (InnoDB):** Allows multiple NULLs in a UNIQUE column.
>
> **Oracle:** Allows multiple NULLs in a UNIQUE column.

### NULL in NOT NULL Constraint

The `NOT NULL` constraint is the simplest comparison: it checks `IS NOT NULL`.

---

## Database-Specific Differences

| Feature                  | PostgreSQL       | MySQL                                        | SQL Server       | Oracle           |
| ------------------------ | ---------------- | -------------------------------------------- | ---------------- | ---------------- |
| `IS DISTINCT FROM`       | Yes              | Yes (`<=>`)                                  | No               | No               |
| `IS NOT DISTINCT FROM`   | Yes              | Yes (`<=>`)                                  | No               | No               |
| `NULLS FIRST/LAST`       | Yes              | No                                           | No               | Yes              |
| `NULL = NULL`            | UNKNOWN          | UNKNOWN                                      | UNKNOWN          | UNKNOWN          |
| Multiple NULLs in UNIQUE | Yes              | Yes                                          | Yes              | Yes              |
| `NULL` in CHECK passes   | Yes              | Yes                                          | Yes              | Yes              |
| Empty string vs NULL     | `''` is not NULL | `''` can be treated as NULL in some contexts | `''` is not NULL | `''` is not NULL |

> **MySQL specific:** When using `LOAD DATA INFILE` or certain string operations, empty strings may be converted to NULL. Be aware of this in ETL pipelines.

> **Oracle specific:** Oracle treats an empty string `''` as NULL. `'' = NULL` evaluates to `UNKNOWN`, and `LENGTH('')` returns NULL. This differs from PostgreSQL, MySQL, and SQL Server where `''` is a non-NULL value.

---

## Sargability and NULL Comparisons

A predicate is **sargable** (Search ARGument able) if the database optimizer can use an index to satisfy it.

```sql
-- SARGable: can use an index on email
WHERE email IS NULL

-- SARGable: can use an index on email
WHERE email IS NOT NULL

-- NOT SARGable: cannot use an index on email
WHERE COALESCE(email, 'unknown') = 'unknown'

-- NOT SARGable: cannot use an index on email
WHERE CASE WHEN email IS NULL THEN 'unknown' ELSE email END = 'unknown'
```

> **Performance implication:** Wrapping a column in a function (including `COALESCE`, `CAST`, `CASE`) in a `WHERE` clause prevents the optimizer from using an index on that column. Use `IS NULL` / `IS NOT NULL` directly when possible.

To verify, always use `EXPLAIN` (PostgreSQL, MySQL) or `EXPLAIN ANALYZE` (PostgreSQL) or `SET STATISTICS IO ON` / `SET STATISTICS TIME ON` (SQL Server) or `EXPLAIN PLAN FOR` (Oracle):

```sql
-- PostgreSQL / MySQL
EXPLAIN ANALYZE
SELECT * FROM employees WHERE email IS NULL;

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT * FROM employees WHERE email IS NULL;
```

---

## Performance Implications

### NULLs and Indexes

- **B-tree indexes** store NULLs. Queries with `IS NULL` / `IS NOT NULL` can use indexes.
- **NULLs in composite indexes:** The position of the NULL column matters. If the leading column of a composite index is NULL, the index can still be used for `IS NULL` predicates.

### NULLs and Statistics

- The database optimizer maintains statistics about NULL distribution (density, number of NULLs).
- If a column has a high proportion of NULLs, the optimizer may choose a different plan for `IS NULL` vs `IS NOT NULL`.

### NULLs and Partitioning

- In some databases, NULLs in a partition key require special handling (e.g., a default partition).

### Always Verify

Do not assume NULLs are fast or slow. Use your database's execution plan tool:

```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM employees WHERE email IS NULL;

-- MySQL
EXPLAIN FORMAT=JSON
SELECT * FROM employees WHERE email IS NULL;

-- SQL Server
SET SHOWPLAN_XML ON;
SELECT * FROM employees WHERE email IS NULL;

-- Oracle
EXPLAIN PLAN FOR
SELECT * FROM employees WHERE email IS NULL;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);
```

---

## Best Practices

1. **Always use `IS NULL` / `IS NOT NULL`** — never `= NULL` or `<> NULL`.
2. **Use `IS DISTINCT FROM`** when you need NULL-safe equality (or the equivalent pattern for databases that don't support it).
3. **Use `NOT EXISTS` over `NOT IN`** when the subquery may return NULLs.
4. **Use `COALESCE`** to provide default values for display, but be careful about performance in `WHERE` clauses.
5. **Use `NULLIF`** to prevent division by zero.
6. **Be explicit about NULL handling** in `ORDER BY` (`NULLS FIRST` / `NULLS LAST`).
7. **Check for NULLs in data validation** — NULLs can cause silent data loss in reports.
8. **Document which columns can be NULL** and what NULL means in your business domain.
9. **Use `NOT NULL` constraints** where the data should never be missing (e.g., primary keys, required fields).
10. **Test with NULLs** — always include NULL values in your test data.

---

## Interview Questions

### Beginner

1. What does `NULL = NULL` return? Why?
2. How do you find rows where `email` is NULL?
3. What is the difference between `COUNT(*)` and `COUNT(email)`?
4. What does `COALESCE(NULL, 10, 20)` return?
5. Can a UNIQUE column have multiple NULLs? Why or why not?

### Intermediate

6. What is the difference between `= NULL` and `IS NULL`?
7. What happens when you use `NOT IN` with a subquery that returns NULLs?
8. How does `IS DISTINCT FROM` differ from `=`?
9. Write a query to find employees whose email is either both NULL or exactly the same.
10. What does `NULLIF(5, 5)` return? What about `NULLIF(5, 3)`?

### Advanced

11. Explain three-valued logic. How does it affect `WHERE`, `HAVING`, and `ON` clauses?
12. Why does `NOT IN (1, 2, NULL)` return no rows, but `NOT EXISTS` with the same subquery works correctly?
13. How do NULLs interact with composite indexes? Can a query with `IS NULL` use an index?
14. What is the difference between `CASE x WHEN NULL` and `CASE WHEN x IS NULL`?
15. How does `IS DISTINCT FROM` behave differently from `=` in a `FULL OUTER JOIN ON` clause?

### Scenario Based

16. You have a table `orders` with a nullable `discount_code` column. Write a query to find all orders where the discount code is either NULL or matches a specific list of codes.
17. A report shows `AVG(salary)` is higher than expected. Many rows have `salary = NULL`. Explain the issue and provide a corrected query.
18. You need to compare two versions of a customer table and find customers whose phone number changed — including cases where the old or new number is NULL. Write the query.

### Tricky

19. What is the result of `NULL OR FALSE`? What about `NULL AND FALSE`?
20. Does `SELECT * FROM t WHERE x NOT IN (SELECT y FROM t2)` ever return rows when `t2.y` contains NULLs?
21. What does `SELECT DISTINCT NULL, NULL` return?
22. Can a `CHECK (x > 0)` constraint be satisfied by `x = NULL`?
23. What is the result of `SELECT CASE WHEN NULL = NULL THEN 'yes' ELSE 'no' END`?

### Output Prediction

24. Given:

```sql
CREATE TABLE t (a INT, b INT);
INSERT INTO t VALUES (1, NULL), (NULL, 1), (NULL, NULL), (1, 1);
SELECT * FROM t WHERE a = b;
```

What rows are returned?

25. Given:

```sql
SELECT * FROM t WHERE a IS NOT DISTINCT FROM b;
```

(using the same table as above)
What rows are returned?

### Debugging

26. A developer reports that this query returns no rows:

```sql
SELECT * FROM users WHERE last_login = NULL;
```

Explain the bug and provide the fix.

27. This query is supposed to find customers who have never placed an order, but it returns nothing:

```sql
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
```

The `orders.customer_id` column is nullable. Diagnose and fix.

### Performance

28. Would `WHERE email IS NULL` use an index on `email`? What about `WHERE COALESCE(email, '') = ''`?
29. You have a table with 10 million rows and 40% NULL values in `status`. Compare the performance characteristics of:

```sql
SELECT * FROM t WHERE status = 'active';
SELECT * FROM t WHERE status <> 'active';
SELECT * FROM t WHERE status IS NULL;
```

How would you verify which is faster? 30. A `LEFT JOIN ... ON a.id = b.id WHERE b.id IS NULL` pattern is used to find unmatched rows. Is this sargable? How would you confirm with an execution plan?
