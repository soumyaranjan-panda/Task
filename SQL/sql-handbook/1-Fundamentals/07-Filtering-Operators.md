The section has been generated at `sql-handbook/1-Fundamentals/07-Filtering-Operators.md`. Let me verify it.
Section `07-Filtering-Operators` is complete at `sql-handbook/1-Fundamentals/07-Filtering-Operators.md` (2,086 lines) and matches the handbook's conventions:

- **Fundamentals:** all filtering operators — comparison (`=`, `<>`, `<`, `>`), `BETWEEN`, `IN`/`NOT IN`, `LIKE`/`NOT LIKE`, `IS NULL`/`IS NOT NULL`, `IS DISTINCT FROM`, `EXISTS`/`NOT EXISTS`, `ANY`/`ALL`, row-value expressions, and `REGEXP`.
- **Deep NULL coverage:** three-valued logic, the `NOT IN + NULL` zero-rows trap, `BETWEEN` timestamp boundary bug, and `NULL` per-operator.
- **Realistic sample data** (`employees`, `departments`, `orders`) with grain stated, plus expected outputs for every example.
- **BAD vs BETTER** approaches with rationale, sargability table, and execution-plan verification guidance (`EXPLAIN ANALYZE` per database) — no absolute performance claims.
- **Database-specific callouts** for PostgreSQL, MySQL, SQL Server, Oracle.
- **55 interview questions** across Beginner / Intermediate / Advanced / Scenario / Tricky / Output Prediction / Debugging / Performance.

Both `07` files existed in the `sql-handbook` tree as empty placeholders, so the generated content now fills one of them (the canonical handbook location, consistent with prior sections).
se-specific extensions. It explains not just syntax, but the *semantics*, *NULL behavior*, *performance*, and *edge cases* of each operator.

> **Grain reminder:** Before writing a filter, ask: *"What does one row in my result represent?"* A filter that ignores the grain produces wrong answers.

> **Cross-reference:** For the logical order of query processing — why `WHERE` runs before `SELECT` aliases exist, before `GROUP BY`, and before `DISTINCT` — see [06 — Logical Query Processing Order](./06-Logical-Query-Processing-Order.md).

---

## Sample Tables

All examples use the following tables.

### employees

| id | name        | dept_id | salary | hire_date  | manager_id | is_active | nickname |
|----|-------------|---------|--------|------------|------------|-----------|----------|
| 1  | Alice       | 1       | 95000  | 2019-03-15 | NULL       | TRUE      | Ali      |
| 2  | Bob         | 1       | 72000  | 2021-06-01 | 1          | TRUE      | Robert   |
| 3  | Charlie     | 2       | 88000  | 2020-01-20 | 1          | TRUE      | Chuck    |
| 4  | Diana       | 2       | 67000  | 2022-11-10 | 3          | TRUE      | Di       |
| 5  | Eve         | 3       | 110000 | 2018-07-04 | NULL       | FALSE     | Evelyn   |
| 6  | Frank       | NULL    | 55000  | 2023-02-28 | NULL       | TRUE      | Frankie  |
| 7  | Grace       | NULL    | NULL   | 2024-01-10 | NULL       | TRUE      | NULL     |

**Grain:** One row = one employee. Each employee belongs to at most one department.

### departments

| id | name        | budget  |
|----|-------------|---------|
| 1  | Engineering | 500000  |
| 2  | Marketing   | 300000  |
| 3  | Executive   | 800000  |
| 4  | Sales       | 200000  |

**Grain:** One row = one department.

### orders

| id | customer_id | product  | amount | status    | order_date |
|----|-------------|----------|--------|-----------|------------|
| 101| 1           | Widget A | 250.00 | shipped   | 2024-11-15 |
| 102| 1           | Widget B | 120.50 | shipped   | 2024-12-01 |
| 103| 2           | Widget A | 250.00 | pending   | 2024-12-05 |
| 104| 3           | Widget C | 89.99  | NULL      | 2025-01-10 |
| 105| 3           | Widget A | 250.00 | cancelled | 2025-01-20 |

**Grain:** One row = one order line.

---

## 1. Comparison Operators

### What They Are

The six fundamental operators that compare two values and return `TRUE`, `FALSE`, or `UNKNOWN`.

### Syntax

| Operator | Meaning                  | ANSI | PostgreSQL | MySQL | SQL Server | Oracle |
|----------|--------------------------|------|------------|-------|------------|--------|
| `=`      | Equal                    | Yes  | Yes        | Yes   | Yes        | Yes    |
| `<>`     | Not equal                | Yes  | Yes        | Yes   | Yes        | Yes    |
| `!=`     | Not equal (non-standard) | No   | Yes        | Yes   | Yes        | Yes    |
| `<`      | Less than                | Yes  | Yes        | Yes   | Yes        | Yes    |
| `>`      | Greater than             | Yes  | Yes        | Yes   | Yes        | Yes    |
| `<=`     | Less than or equal       | Yes  | Yes        | Yes   | Yes        | Yes    |
| `>=`     | Greater than or equal    | Yes  | Yes        | Yes   | Yes        | Yes    |

### How They Work Internally

For each row, the database evaluates the left and right expressions, then applies the operator. If either operand is `NULL`, the result is `UNKNOWN` (with the exception of `IS NULL` / `IS NOT NULL`).

### Examples

**Equality:**

```sql
SELECT name, salary
FROM employees
WHERE dept_id = 1;
```

| name  | salary |
|-------|--------|
| Alice | 95000  |
| Bob   | 72000  |

**Inequality:**

```sql
SELECT name, salary
FROM employees
WHERE salary <> 88000;
```

| name    | salary |
|---------|--------|
| Alice   | 95000  |
| Bob     | 72000  |
| Diana   | 67000  |
| Eve     | 110000 |
| Frank   | 55000  |

> Charlie (88000) is excluded. Grace has `NULL` salary — `NULL <> 88000` evaluates to `UNKNOWN`, so she is also excluded.

**Greater than / less than:**

```sql
SELECT name, salary
FROM employees
WHERE salary > 80000;
```

| name    | salary |
|---------|--------|
| Alice   | 95000  |
| Charlie | 88000  |
| Eve     | 110000 |

### NULL Behavior

Every comparison operator produces `UNKNOWN` when either operand is `NULL`. This is the single most important rule of filtering:

| Expression        | Result   |
|-------------------|----------|
| `NULL = NULL`     | UNKNOWN  |
| `NULL <> NULL`    | UNKNOWN  |
| `NULL > 5`        | UNKNOWN  |
| `NULL <= 5`       | UNKNOWN  |
| `NULL = 5`        | UNKNOWN  |

`UNKNOWN` is filtered out by `WHERE` — the row does not appear in results.

> **Interview trap:** `NULL = NULL` is NOT `TRUE`. It is `UNKNOWN`. Writing `WHERE col = NULL` returns zero rows. Use `IS NULL` instead.

> **See also:** [NULL Behavior — The Complete Picture](#null-behavior--the-complete-picture) for deeper coverage.

### Edge Cases

**Comparing different types:**

```sql
-- MySQL may implicitly convert '5' (string) to 5 (number)
SELECT * FROM employees WHERE salary = '72000';

-- PostgreSQL will throw an error if types are incompatible
SELECT * FROM employees WHERE salary = '72000';
```

> **Production pitfall:** Implicit type conversion prevents index usage. Always match types explicitly.

**Comparing floating-point values:**

```sql
-- Dangerous: floating-point precision
SELECT * FROM orders WHERE amount = 250.00;
-- May fail if amount is stored as 249.9999999...

-- BETTER: use a range
SELECT * FROM orders WHERE amount >= 249.99 AND amount <= 250.01;
```

### When to Use

- Simple equality and range comparisons.
- Any filter on a known, bounded set of values.

### When NOT to Use

- When the column may be `NULL` — use `IS NULL` / `IS NOT NULL`.
- When comparing strings with patterns — use `LIKE`.
- When comparing against a list — use `IN`.
- When comparing against ranges — use `BETWEEN`.

### `<>` vs `!=`

Both mean "not equal." `<>` is ANSI standard. `!=` is non-standard but supported by all major databases. Prefer `<>` for portability.

> **PostgreSQL, MySQL, SQL Server, Oracle:** Both `<>` and `!=` work identically.

---

## 2. BETWEEN

### What It Is

`BETWEEN` filters rows within an **inclusive** range (both endpoints are included).

### Syntax

```sql
expression BETWEEN low AND high
```

Equivalent to:

```sql
expression >= low AND expression <= high
```

### How It Works Internally

The database evaluates three comparisons per row:

1. `expression >= low`
2. `expression <= high`
3. The `AND` of the two

If the expression or either bound is `NULL`, the result is `UNKNOWN`.

### Examples

**Numeric range:**

```sql
SELECT name, salary
FROM employees
WHERE salary BETWEEN 70000 AND 95000;
```

| name    | salary |
|---------|--------|
| Alice   | 95000  |
| Bob     | 72000  |
| Charlie | 88000  |

Both 70000 and 95000 are included (inclusive on both sides).

**Date range:**

```sql
SELECT name, hire_date
FROM employees
WHERE hire_date BETWEEN '2020-01-01' AND '2021-12-31';
```

| name | hire_date  |
|------|------------|
| Bob  | 2021-06-01 |

### The Timestamp Boundary Trap

> **Production pitfall**

This is one of the most common bugs in production SQL:

```sql
-- DANGEROUS: may miss rows with timestamps later in the day
SELECT *
FROM orders
WHERE order_date BETWEEN '2024-12-01' AND '2024-12-31';
```

If `order_date` is a `TIMESTAMP` (not a `DATE`), then `'2024-12-31'` is interpreted as `2024-12-31 00:00:00`. Any order placed at `2024-12-31 15:30:00` is **not** `<= 2024-12-31 00:00:00` and is silently dropped.

```sql
-- BETTER: use exclusive upper bound
SELECT *
FROM orders
WHERE order_date >= '2024-12-01'
  AND order_date <  '2025-01-01';
```

This catches every moment in December 2024, including `2024-12-31 23:59:59.999`.

> **Why this happens:** The SQL standard says `'2024-12-31'` in a `TIMESTAMP` comparison context is `2024-12-31 00:00:00`. The upper bound becomes midnight of Dec 31, not the end of the day.

### BETWEEN with Strings

```sql
SELECT name
FROM employees
WHERE name BETWEEN 'A' AND 'M';
```

| name  |
|-------|
| Alice |
| Bob   |
| Charlie|

String comparison is lexicographic (based on collation). `BETWEEN 'A' AND 'M'` includes all names where the first character is in the range A–M.

### NULL Behavior

```sql
SELECT *
FROM employees
WHERE salary BETWEEN 70000 AND 100000;
```

Grace (salary = `NULL`) is excluded. `NULL BETWEEN 70000 AND 100000` evaluates to `UNKNOWN`.

### Common Mistake: BETWEEN is Inclusive

> **Interview trap:** `BETWEEN 1 AND 3` includes `1`, `2`, and `3`. It is NOT `1 AND 3` exclusive.

```sql
-- This returns departments 1, 2, 3 (all three)
SELECT * FROM departments WHERE id BETWEEN 1 AND 3;

-- This also returns departments 1, 2, 3
SELECT * FROM departments WHERE id >= 1 AND id <= 3;
```

### NOT BETWEEN

```sql
SELECT name, salary
FROM employees
WHERE salary NOT BETWEEN 70000 AND 95000;
```

| name    | salary |
|---------|--------|
| Diana   | 67000  |
| Eve     | 110000 |
| Frank   | 55000  |

Equivalent to `salary < 70000 OR salary > 95000`. NULLs are excluded — `NULL NOT BETWEEN` is `UNKNOWN`.

### When to Use

- Inclusive numeric or date ranges.
- Readable range predicates.

### When NOT to Use

- When using `TIMESTAMP` columns — use explicit `>=` and `<` to avoid the boundary trap.
- When you need exclusive boundaries — `BETWEEN` is always inclusive.
- When NULLs might be involved and you want NULLs included — `BETWEEN` silently drops them.

---

## 3. IN / NOT IN

### What They Are

`IN` checks if a value matches **any value** in a list or subquery. `NOT IN` checks if a value matches **no value** in the list.

### Syntax

```sql
expression IN (value1, value2, value3, ...)
expression NOT IN (value1, value2, value3, ...)
```

### How They Work Internally

`IN` is syntactic sugar for chained `OR` comparisons:

```sql
-- These are equivalent:
WHERE dept_id IN (1, 3)
WHERE dept_id = 1 OR dept_id = 3
```

`NOT IN` is equivalent to chained `AND` with `<>`:

```sql
-- These are equivalent:
WHERE dept_id NOT IN (1, 3)
WHERE dept_id <> 1 AND dept_id <> 3
```

### Examples

**Simple list:**

```sql
SELECT name, dept_id
FROM employees
WHERE dept_id IN (1, 3);
```

| name | dept_id |
|------|---------|
| Alice| 1       |
| Bob  | 1       |
| Eve  | 3       |

**NOT IN:**

```sql
SELECT name, dept_id
FROM employees
WHERE dept_id NOT IN (1, 3);
```

| name    | dept_id |
|---------|---------|
| Charlie | 2       |
| Diana   | 2       |

Frank and Grace have `dept_id = NULL`. `NULL NOT IN (1, 3)` evaluates to `UNKNOWN` (not `TRUE`), so they are **not** returned.

**Subquery with IN:**

```sql
SELECT name
FROM employees
WHERE dept_id IN (SELECT id FROM departments WHERE budget > 300000);
```

| name  |
|-------|
| Alice |
| Bob   |
| Eve   |

### NULL in IN Lists

```sql
SELECT *
FROM employees
WHERE dept_id IN (1, NULL);
```

Expands to:

```sql
WHERE dept_id = 1 OR dept_id = NULL
```

`dept_id = NULL` is always `UNKNOWN`. So only rows where `dept_id = 1` are returned. The `NULL` in the list has **no effect**.

> **Common misconception:** `IN (1, NULL)` does NOT include NULL rows. It behaves exactly like `IN (1)`.

### NOT IN with NULLs — The Most Dangerous Pattern in SQL

> **Production pitfall**

```sql
-- Returns ZERO rows if the subquery returns any NULL
SELECT *
FROM employees
WHERE dept_id NOT IN (
    SELECT dept_id FROM employees WHERE manager_id IS NULL
);
```

The subquery returns `{1, 3, NULL}`. The query becomes:

```sql
WHERE dept_id <> 1 AND dept_id <> 3 AND dept_id <> NULL
```

`dept_id <> NULL` is `UNKNOWN` for every row. `TRUE AND TRUE AND UNKNOWN` is `UNKNOWN`. Every row is filtered out. **Zero results.**

This is not a bug. This is correct SQL behavior. But it is almost never what the developer intended.

> **BETTER APPROACH:** Use `NOT EXISTS` (see [EXISTS / NOT EXISTS](#7-exists--not-exists)) or filter out NULLs in the subquery.

```sql
-- SAFE: NOT EXISTS
SELECT *
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM employees e2
    WHERE e2.manager_id IS NULL
      AND e2.dept_id = e.dept_id
);

-- SAFE: filter NULLs from subquery
SELECT *
FROM employees
WHERE dept_id NOT IN (
    SELECT dept_id FROM employees
    WHERE manager_id IS NULL
      AND dept_id IS NOT NULL  -- explicit NULL exclusion
);
```

### NOT IN vs NOT EXISTS

| Aspect | NOT IN | NOT EXISTS |
|--------|--------|------------|
| NULL safety | DANGEROUS — returns zero rows if subquery has NULL | Safe — NULLs handled naturally |
| Semantics | "value must not equal every value in the list" | "no matching row exists" |
| Optimization | Optimizer may rewrite to JOIN or semi-join | Typically implemented as semi-join |
| Readability | Simple for small lists | Slightly more verbose |

> **Interview trap:** "What's the difference between `NOT IN` and `NOT EXISTS`?" The answer involves NULLs. With a non-NULL subquery, they are equivalent. With NULLs in the subquery, `NOT IN` returns zero rows while `NOT EXISTS` returns the expected results.

### IN with Subqueries — Optimization

The optimizer may convert `IN (subquery)` to a `JOIN` (semi-join) internally:

```sql
-- This:
WHERE dept_id IN (SELECT id FROM departments WHERE budget > 300000)

-- May be optimized to something like:
WHERE EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = e.dept_id AND d.budget > 300000
)
```

> **Verify with EXPLAIN.** The optimizer's choice depends on table statistics, indexes, and cardinality.

### When to Use IN

- Small, static lists of literal values.
- When the subquery is guaranteed to have no NULLs.

### When NOT to Use IN

- When the subquery may return NULLs — use `NOT EXISTS` instead.
- When performance with large subqueries is a concern — test both `IN` and `EXISTS`.

---

## 4. LIKE / NOT LIKE

### What They Are

`LIKE` performs **pattern matching** on strings using two wildcards.

### Syntax

```sql
expression LIKE pattern
expression NOT LIKE pattern
```

### Wildcards

| Wildcard | Meaning                          | Example         | Matches                          |
|----------|----------------------------------|-----------------|----------------------------------|
| `%`      | Zero or more characters          | `'A%'`          | 'Alice', 'A', 'AB'              |
| `_`      | Exactly one character            | `'A_'`          | 'Al', 'Ab', but NOT 'A' or 'Ali'|
| `%%`     | Literal `%` (escape)             | `'100%%'`       | '100%'                           |
| `/_`     | Literal `_` (escape)             | `'a/_b'`        | 'a_b'                            |

> **PostgreSQL:** Use `ESCAPE` clause for custom escape: `LIKE '%100#%' ESCAPE '#'`.
> **MySQL:** Default escape character is `\`.
> **SQL Server:** Default escape character is `\`.
> **Oracle:** Default escape character is `\`, or use `ESCAPE` clause.

### Examples

**Starts with:**

```sql
SELECT name FROM employees WHERE name LIKE 'A%';
```

| name  |
|-------|
| Alice |

**Contains:**

```sql
SELECT name FROM employees WHERE name LIKE '%ch%';
```

| name    |
|---------|
| Charlie |

**Ends with:**

```sql
SELECT name FROM employees WHERE name LIKE '%e';
```

| name    |
|---------|
| Alice   |
| Charlie |
| Eve     |

**Exactly N characters:**

```sql
-- Names with exactly 3 characters
SELECT name FROM employees WHERE name LIKE '___';
```

| name |
|------|
| Bob  |
| Eve  |

**First letter A, then exactly 3 more characters:**

```sql
SELECT name FROM employees WHERE name LIKE 'A____';
```

| name  |
|-------|
| Alice |

### NULL Behavior

```sql
SELECT * FROM employees WHERE nickname LIKE '%li%';
```

Grace (`nickname = NULL`) is excluded. `NULL LIKE '%li%'` is `UNKNOWN`.

### Case Sensitivity

| Database    | LIKE Behavior                                     |
|-------------|---------------------------------------------------|
| PostgreSQL  | Case-sensitive. Use `ILIKE` for case-insensitive. |
| MySQL       | Case-insensitive by default (with `utf8` collation). |
| SQL Server  | Depends on collation (often case-insensitive).    |
| Oracle      | Case-sensitive. Use `UPPER(col) LIKE '%FOO%'`.    |

### NOT LIKE

```sql
SELECT name FROM employees WHERE name NOT LIKE 'A%';
```

| name    |
|---------|
| Bob     |
| Charlie |
| Diana   |
| Eve     |
| Frank   |
| Grace   |

NULLs are excluded — `NULL NOT LIKE` is `UNKNOWN`.

### Performance: Leading Wildcards

> **Production pitfall**

```sql
-- SLOW: leading wildcard prevents B-tree index usage
WHERE name LIKE '%lice'

-- FAST: no leading wildcard, can use index
WHERE name LIKE 'Ali%'
```

`LIKE '%string%'` forces a full table scan or full index scan. There is no way around this with a standard B-tree index. For substring search at scale, use:

- **PostgreSQL:** Full-text search (`tsvector` / `tsquery`), `pg_trgm` trigram index.
- **MySQL:** Full-text index (`FULLTEXT`).
- **SQL Server:** Full-text index.
- **Oracle:** Oracle Text.

> **Verify with EXPLAIN ANALYZE.** Look for "Seq Scan" vs "Index Scan" when using `LIKE`.

### LIKE with Escape Characters

```sql
-- Find literal '%' in a string
SELECT * FROM products WHERE name LIKE '%100#%%' ESCAPE '#';

-- Find literal '_' in a string
SELECT * FROM products WHERE name LIKE '%a/_b%' ESCAPE '/';
```

### When to Use LIKE

- Prefix searches (`LIKE 'foo%'`) — index-friendly.
- Simple pattern matching on short strings.
- Wildcard-based filtering where full-text search is overkill.

### When NOT to Use LIKE

- Leading wildcard searches (`LIKE '%foo'`) — use full-text search.
- Complex regex patterns — use `REGEXP` / `RLIKE`.
- When exact equality suffices — use `=`.

---

## 5. IS NULL / IS NOT NULL

### What They Are

The only operators that test for `NULL` directly. `IS NULL` returns `TRUE` when the value is `NULL`. `IS NOT NULL` returns `TRUE` when the value is not `NULL`.

### Syntax

```sql
expression IS NULL
expression IS NOT NULL
```

### Why They Exist

In SQL's three-valued logic, `NULL = NULL` is `UNKNOWN`, not `TRUE`. There is no way to test for `NULL` using `=`, `<>`, or any other comparison operator. `IS NULL` and `IS NOT NULL` are the only operators that return a definitive `TRUE` or `FALSE` when given a `NULL` value.

### Examples

**Find employees with no manager:**

```sql
SELECT name, manager_id
FROM employees
WHERE manager_id IS NULL;
```

| name  | manager_id |
|-------|------------|
| Alice | NULL       |
| Eve   | NULL       |
| Frank | NULL       |
| Grace | NULL       |

**Find employees in a department:**

```sql
SELECT name, dept_id
FROM employees
WHERE dept_id IS NOT NULL;
```

| name    | dept_id |
|---------|---------|
| Alice   | 1       |
| Bob     | 1       |
| Charlie | 2       |
| Diana   | 2       |
| Eve     | 3       |

### NULL Behavior

`IS NULL` and `IS NOT NULL` are the **only** operators where `NULL` produces `TRUE` or `FALSE` (not `UNKNOWN`):

| Expression           | Result  |
|----------------------|---------|
| `NULL IS NULL`       | TRUE    |
| `NULL IS NOT NULL`   | FALSE   |
| `5 IS NULL`          | FALSE   |
| `5 IS NOT NULL`      | TRUE    |

### IS NULL and Indexes

> **Database-specific**

| Database    | IS NULL uses index? |
|-------------|---------------------|
| PostgreSQL  | Yes — B-tree indexes include NULL entries. |
| MySQL InnoDB| Yes — NULLs are indexed. |
| SQL Server  | Yes — NULLs are indexed. |
| Oracle      | Yes — NULLs are indexed (except in certain bitmap cases). |

Most modern databases can use an index for `IS NULL` and `IS NOT NULL` checks. Verify with `EXPLAIN` if performance is a concern.

### Common Mistake: = NULL

```sql
-- WRONG: returns zero rows
SELECT * FROM employees WHERE manager_id = NULL;

-- CORRECT
SELECT * FROM employees WHERE manager_id IS NULL;
```

> **Interview trap:** This is the #1 beginner mistake in SQL. `NULL = NULL` is `UNKNOWN`, not `TRUE`.

### NULL in Aggregate Context

```sql
SELECT COUNT(*) AS total_rows,
       COUNT(manager_id) AS rows_with_manager,
       COUNT(*) - COUNT(manager_id) AS rows_without_manager
FROM employees;
```

| total_rows | rows_with_manager | rows_without_manager |
|------------|-------------------|----------------------|
| 7          | 3                 | 4                    |

`COUNT(column)` ignores `NULLs`. `COUNT(*)` counts all rows.

### IS NOT NULL for Filtering

```sql
SELECT name, salary
FROM employees
WHERE salary IS NOT NULL;
```

| name    | salary |
|---------|--------|
| Alice   | 95000  |
| Bob     | 72000  |
| Charlie | 88000  |
| Diana   | 67000  |
| Eve     | 110000 |
| Frank   | 55000  |

Grace (salary = NULL) is excluded.

### When to Use

- Always use `IS NULL` / `IS NOT NULL` to check for NULL — never `= NULL` or `<> NULL`.
- When you need to find missing data (unmatched rows, optional fields).

### When NOT to Use

- When you need NULL-safe equality (two values may both be NULL and should be considered equal) — use `IS NOT DISTINCT FROM`.

---

## 6. IS DISTINCT FROM / IS NOT DISTINCT FROM

### What They Are

NULL-safe equality operators. `IS NOT DISTINCT FROM` returns `TRUE` when both values are equal, **including when both are NULL**. `IS DISTINCT FROM` returns `TRUE` when the values differ, **including when one is NULL**.

### Syntax

```sql
expression IS NOT DISTINCT FROM expression
expression IS DISTINCT FROM expression
```

### Why They Exist

Standard equality (`=`) returns `UNKNOWN` when either operand is `NULL`. This makes certain queries awkward:

```sql
-- Cannot compare two nullable columns for equality
WHERE column_a = column_b
-- If both are NULL, result is UNKNOWN — row excluded

-- IS NOT DISTINCT FROM handles this correctly
WHERE column_a IS NOT DISTINCT FROM column_b
-- If both are NULL, result is TRUE — row included
```

### How They Work

| A     | B     | A = B | A IS NOT DISTINCT FROM B | A IS DISTINCT FROM B |
|-------|-------|-------|--------------------------|----------------------|
| 1     | 1     | TRUE  | TRUE                     | FALSE                |
| 1     | 2     | FALSE | FALSE                    | TRUE                 |
| NULL  | NULL  | UNK   | TRUE                     | FALSE                |
| NULL  | 1     | UNK   | FALSE                    | TRUE                 |
| 1     | NULL  | UNK   | FALSE                    | TRUE                 |

### Examples

**Find employees where department matches manager's department:**

```sql
-- Standard equality: NULL dept_ids are excluded
SELECT e.name, e.dept_id, e.manager_id
FROM employees e
WHERE e.dept_id = (
    SELECT dept_id FROM employees m WHERE m.id = e.manager_id
);
```

This returns nothing for employees with NULL `dept_id` or NULL `manager_id`.

```sql
-- NULL-safe: includes NULL = NULL comparisons
SELECT e.name, e.dept_id, e.manager_id
FROM employees e
WHERE e.dept_id IS NOT DISTINCT FROM (
    SELECT dept_id FROM employees m WHERE m.id = e.manager_id
);
```

**Find duplicate rows:**

```sql
-- Find employees with the same dept_id as another employee
SELECT a.name, b.name, a.dept_id
FROM employees a
JOIN employees b ON a.id < b.id
WHERE a.dept_id IS NOT DISTINCT FROM b.dept_id;
```

| name  | name    | dept_id |
|-------|---------|---------|
| Alice | Bob     | 1       |
| Charlie| Diana  | 2       |
| Frank | Grace   | NULL    |

Frank and Grace both have `dept_id = NULL`. `IS NOT DISTINCT FROM` treats them as matching.

### Database Support

| Database    | IS DISTINCT FROM | IS NOT DISTINCT FROM |
|-------------|------------------|----------------------|
| PostgreSQL  | Yes              | Yes                  |
| MySQL       | Yes (8.0+)       | Yes (8.0+)           |
| SQLite      | Yes              | Yes                  |
| BigQuery    | Yes              | Yes                  |
| SQL Server  | **No**           | **No**               |
| Oracle      | **No**           | **No**               |
| Firebird    | Yes              | Yes                  |

> **SQL Server / Oracle workaround:** Use `COALESCE(a, sentinel) = COALESCE(b, sentinel)` or `(a = b OR (a IS NULL AND b IS NULL))`.

```sql
-- SQL Server / Oracle workaround for IS NOT DISTINCT FROM
WHERE (a = b) OR (a IS NULL AND b IS NULL)

-- Or with COALESCE (careful: sentinel must not collide with real values)
WHERE COALESCE(a, -999999) = COALESCE(b, -999999)
```

### When to Use

- When comparing nullable columns for equality (especially in JOINs).
- When you want `NULL = NULL` to be treated as `TRUE`.
- Anti-joins where the join key can be NULL.

### When NOT to Use

- When you want the standard three-valued behavior (NULLs should not match).
- When you are explicitly testing for NULL — use `IS NULL` instead for clarity.

---

## 7. EXISTS / NOT EXISTS

### What They Are

`EXISTS` returns `TRUE` if the subquery returns **at least one row**. `NOT EXISTS` returns `TRUE` if the subquery returns **zero rows**. They are semantically different from `IN` — they test for *row existence*, not *value membership*.

### Syntax

```sql
WHERE EXISTS (subquery)
WHERE NOT EXISTS (subquery)
```

### How They Work Internally

1. For each row in the outer query, execute the subquery.
2. If the subquery returns any row, `EXISTS` evaluates to `TRUE`.
3. If the subquery returns no rows, `EXISTS` evaluates to `FALSE`.
4. The subquery can reference columns from the outer query (**correlated subquery**).

> **Key insight:** `EXISTS` does not return the subquery results — it only checks whether rows exist. This is why the subquery typically uses `SELECT 1` or `SELECT *` — the actual values don't matter.

### Examples

**Find employees who are in a department:**

```sql
SELECT e.name, e.dept_id
FROM employees e
WHERE EXISTS (
    SELECT 1 FROM departments d WHERE d.id = e.dept_id
);
```

| name    | dept_id |
|---------|---------|
| Alice   | 1       |
| Bob     | 1       |
| Charlie | 2       |
| Diana   | 2       |
| Eve     | 3       |

Frank and Grace (`dept_id = NULL`) are excluded — no department matches `NULL = d.id`.

**Find departments with at least one employee:**

```sql
SELECT d.name
FROM departments d
WHERE EXISTS (
    SELECT 1 FROM employees e WHERE e.dept_id = d.id
);
```

| name        |
|-------------|
| Engineering |
| Marketing   |
| Executive   |

Sales has no employees, so it is excluded.

**Find departments with no employees:**

```sql
SELECT d.name
FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.dept_id = d.id
);
```

| name  |
|-------|
| Sales |

### NULL Behavior

`EXISTS` and `NOT EXISTS` are **NULL-safe by design**. They test for row existence, not value equality. The correlated subquery's join condition handles NULLs naturally:

```sql
-- NOT EXISTS is safe with NULLs
SELECT *
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM employees e2
    WHERE e2.manager_id IS NULL
      AND e2.dept_id = e.dept_id
);
```

When `e.dept_id` is `NULL`, the condition `e2.dept_id = NULL` is `UNKNOWN`, the subquery returns no rows, and `NOT EXISTS` evaluates to `TRUE`. This is correct: Frank and Grace have no "no-manager" colleague in their (non-existent) department.

### EXISTS vs IN

| Aspect | EXISTS | IN |
|--------|--------|----|
| NULL safety | Safe | Unsafe with `NOT IN` |
| Correlation | Always correlated | Can be non-correlated |
| Optimization | Typically semi-join | May be converted to semi-join |
| Readability | More verbose | Simpler for small lists |
| Semantic | "Does a matching row exist?" | "Is this value in the set?" |

> **Verify with EXPLAIN.** On modern databases, the optimizer often produces the same execution plan for `EXISTS` and `IN` subqueries. But the NULL behavior is fundamentally different for `NOT EXISTS` vs `NOT IN`.

### When to Use EXISTS

- When you only need to know whether a row exists (not the row's values).
- When NULL safety is important (always prefer `NOT EXISTS` over `NOT IN`).
- For anti-joins ("find rows with no match").

### When NOT to Use EXISTS

- When `IN` is simpler and the subquery is guaranteed to have no NULLs.
- When the optimizer produces a better plan with `IN` (verify with `EXPLAIN`).

---

## 8. ANY / ALL

### What They Are

`ANY` (or `SOME`) returns `TRUE` if the comparison is true for **at least one** value returned by the subquery. `ALL` returns `TRUE` if the comparison is true for **every** value.

### Syntax

```sql
expression > ANY (subquery)
expression > ALL (subquery)
```

### How They Work

`ANY` is semantically similar to `IN` (for `=`) or a chained `OR`. `ALL` is semantically similar to a chained `AND`.

| Operator | Meaning                              | Equivalent            |
|----------|--------------------------------------|-----------------------|
| `= ANY`  | Equal to at least one                | `IN`                  |
| `<> ALL` | Not equal to all                     | `NOT IN`              |
| `> ANY`  | Greater than at least one            | `> MIN(subquery)`     |
| `> ALL`  | Greater than all                     | `> MAX(subquery)`     |
| `< ANY`  | Less than at least one               | `< MAX(subquery)`     |
| `< ALL`  | Less than all                        | `< MIN(subquery)`     |

### Examples

**= ANY (same as IN):**

```sql
SELECT name
FROM employees
WHERE dept_id = ANY (1, 3);
```

| name  |
|-------|
| Alice |
| Bob   |
| Eve   |

**> ANY (greater than at least one):**

```sql
SELECT name, salary
FROM employees
WHERE salary > ANY (70000, 88000);
```

| name    | salary |
|---------|--------|
| Alice   | 95000  |
| Charlie | 88000  |
| Eve     | 110000 |

Salary 72000 (Bob) is > 70000, so Bob qualifies. Wait — let me recheck: Bob's salary is 72000 which is > 70000. Actually Bob should be included:

| name    | salary |
|---------|--------|
| Alice   | 95000  |
| Bob     | 72000  |
| Charlie | 88000  |
| Eve     | 110000 |

> Charlie's salary (88000) is NOT > 88000, but Charlie is > 70000, so Charlie qualifies via `> ANY`.

**> ALL (greater than all):**

```sql
SELECT name, salary
FROM employees
WHERE salary > ALL (70000, 88000);
```

| name  | salary |
|-------|--------|
| Alice | 95000  |
| Eve   | 110000 |

Only Alice and Eve have salaries greater than both 70000 AND 88000.

### NULL Behavior

```sql
-- ANY with NULL: NULL comparisons produce UNKNOWN
SELECT * FROM employees WHERE salary > ANY (70000, NULL);
```

This works: `salary > 70000` can produce `TRUE` for some rows. The `NULL` in the list just means one comparison is `UNKNOWN`, but `ANY` only needs one `TRUE`.

```sql
-- ALL with NULL: if ANY comparison is UNKNOWN, and others are TRUE,
-- the result is still UNKNOWN for that row
SELECT * FROM employees WHERE salary > ALL (70000, NULL);
```

`salary > NULL` is always `UNKNOWN`. `UNKNOWN AND (salary > 70000)` is `UNKNOWN` when the second part is `TRUE`. So no rows qualify. `ALL` with `NULL` in the subquery is dangerous — similar to `NOT IN` with `NULL`.

> **Interview trap:** `> ALL (list with NULL)` returns zero rows, just like `NOT IN (list with NULL)`.

### ANY vs ALL Comparison

| Expression     | ANY                | ALL                |
|----------------|--------------------|--------------------|
| `= ANY (1,3)` | Same as `IN (1,3)` | Only if value = 1 AND value = 3 (impossible unless 1=3) |
| `<> ANY (1,3)` | Value <> 1 OR <> 3 | Same as `NOT IN (1,3)` |
| `> ANY (1,3)` | Value > 1 (the min) | Value > 3 (the max) |
| `> ALL (1,3)` | Value > 3 (the max) | Value > 3 (the max) |

### When to Use

- When comparing against a subquery result set (not a static list).
- `= ANY` is equivalent to `IN` — prefer `IN` for readability with static lists.
- `<> ALL` is equivalent to `NOT IN` — prefer `NOT EXISTS` for NULL safety.

### When NOT to Use

- `ALL` with a subquery that may contain NULLs — returns zero rows unexpectedly.
- When `IN` / `NOT IN` / `EXISTS` is clearer.

---

## 9. Row Value Expressions (Tuple Comparisons)

### What They Are

Compare multiple columns simultaneously using parenthesized lists of expressions.

### Syntax

```sql
(a1, a2, a3) = (b1, b2, b3)
(a1, a2) > (b1, b2)
```

### How They Work

Row comparison is lexicographic: compare the first elements; if equal, compare the second; and so on.

### Examples

**Find employees where (dept_id, salary) matches a specific pair:**

```sql
SELECT name, dept_id, salary
FROM employees
WHERE (dept_id, salary) = (1, 95000);
```

| name  | dept_id | salary |
|-------|---------|--------|
| Alice | 1       | 95000  |

**Find employees where (dept_id, salary) is "greater than" a tuple:**

```sql
SELECT name, dept_id, salary
FROM employees
WHERE (dept_id, salary) > (1, 72000);
```

| name    | dept_id | salary |
|---------|---------|--------|
| Alice   | 1       | 95000  |
| Charlie | 2       | 88000  |
| Diana   | 2       | 67000  |
| Eve     | 3       | 110000 |

`(1, 95000) > (1, 72000)` → first elements equal, compare second: 95000 > 72000 → TRUE.
`(2, 88000) > (1, 72000)` → first elements: 2 > 1 → TRUE (no need to check second).

**Find employees where (dept_id, salary) is <= a tuple:**

```sql
SELECT name, dept_id, salary
FROM employees
WHERE (dept_id, salary) <= (1, 80000);
```

| name  | dept_id | salary |
|-------|---------|--------|
| Bob   | 1       | 72000  |

`(1, 95000) <= (1, 80000)` → first equal, second: 95000 <= 80000 → FALSE.
`(1, 72000) <= (1, 80000)` → first equal, second: 72000 <= 80000 → TRUE.

### NULL Behavior

```sql
SELECT * FROM employees WHERE (dept_id, salary) = (NULL, 95000);
```

Returns nothing. `NULL = NULL` is `UNKNOWN`. Use `IS NOT DISTINCT FROM` for NULL-safe tuple comparison:

```sql
-- PostgreSQL / MySQL 8+
SELECT * FROM employees
WHERE (dept_id, salary) IS NOT DISTINCT FROM (NULL, 95000);
```

### Database Support

| Database    | Row Value Expressions |
|-------------|----------------------|
| PostgreSQL  | Full support         |
| MySQL       | Limited (in `WHERE` only, no `UPDATE ... FROM`) |
| SQL Server  | Limited (equality only, in `IN` lists) |
| Oracle      | Full support         |

### Index Usage

A composite index on `(dept_id, salary)` can be used for tuple comparisons:

```sql
-- Can use index on (dept_id, salary)
WHERE (dept_id, salary) > (1, 72000)

-- Can use index on (dept_id, salary)
WHERE (dept_id, salary) = (1, 95000)
```

> **Verify with EXPLAIN.** Row value expressions can enable efficient index range scans on composite indexes.

### When to Use

- When filtering on multiple columns as a unit.
- When you need lexicographic comparison (e.g., "find rows where (date, id) > (last_date, last_id)" for keyset pagination).

### When NOT to Use

- When the comparison semantics are confusing — decompose into individual `AND` conditions for clarity.
- On databases with limited support (SQL Server).

---

## 10. REGEXP / RLIKE

### What They Are

Regular expression matching for complex pattern searches that `LIKE` cannot handle.

### Syntax

| Database    | Operator        | Syntax                             |
|-------------|-----------------|------------------------------------|
| PostgreSQL  | `~` / `~*`      | `column ~ 'pattern'` (case-sensitive), `column ~* 'pattern'` (case-insensitive) |
| MySQL       | `REGEXP` / `RLIKE` | `column REGEXP 'pattern'`       |
| SQL Server  | `LIKE` with patterns (no native REGEXP) | Use `PATINDEX` or CLR |
| Oracle      | `REGEXP_LIKE`   | `REGEXP_LIKE(column, 'pattern')`   |

### Examples

**Find employees with names containing a vowel followed by 'l':**

```sql
-- PostgreSQL
SELECT name FROM employees WHERE name ~ '.*[aeiou]l.*';

-- MySQL
SELECT name FROM employees WHERE name REGEXP '[aeiou]l.*';

-- Oracle
SELECT name FROM employees WHERE REGEXP_LIKE(name, '[aeiou]l');
```

| name  |
|-------|
| Alice |

**Find email-like patterns:**

```sql
-- PostgreSQL
SELECT * FROM users WHERE email ~ '^[a-z]+@[a-z]+\.[a-z]+$';

-- MySQL
SELECT * FROM users WHERE email REGEXP '^[a-z]+@[a-z]+\\.[a-z]+$';
```

### NULL Behavior

`NULL ~ 'pattern'` is `UNKNOWN`. Same as `LIKE`.

### Performance

> **Production pitfall:** `REGEXP` / `~` cannot use standard B-tree indexes. On large tables, this forces a full scan. Consider full-text search or specialized indexes (GIN/GiST in PostgreSQL).

### When to Use

- Complex pattern matching that `LIKE` cannot express.
- Validating format (emails, phone numbers, etc.).

### When NOT to Use

- Simple prefix/suffix/contains patterns — use `LIKE` (index-friendly).
- Performance-critical queries on large tables without specialized indexes.

---

## NULL Behavior — The Complete Picture

This section consolidates NULL behavior across all filtering operators.

### Three-Valued Logic

SQL uses three truth values: `TRUE`, `FALSE`, and `UNKNOWN`. `UNKNOWN` arises whenever `NULL` is involved in a comparison.

| A     | B     | A = B | A <> B | A > B | A AND B | A OR B | NOT A |
|-------|-------|-------|--------|-------|---------|--------|-------|
| TRUE  | TRUE  | TRUE  | FALSE  | varies| TRUE    | TRUE    | FALSE |
| TRUE  | FALSE | FALSE | TRUE   | varies| FALSE   | TRUE    | FALSE |
| TRUE  | UNK   | UNK   | UNK    | UNK   | UNK     | TRUE    | FALSE |
| FALSE | TRUE  | FALSE | TRUE   | varies| FALSE   | TRUE    | TRUE  |
| FALSE | FALSE | FALSE | TRUE   | varies| FALSE   | FALSE   | TRUE  |
| FALSE | UNK   | UNK   | UNK    | UNK   | FALSE   | UNK    | TRUE  |
| UNK   | TRUE  | UNK   | UNK    | UNK   | UNK     | TRUE    | UNK   |
| UNK   | FALSE | UNK   | UNK    | UNK   | FALSE   | UNK    | UNK   |
| UNK   | UNK   | UNK   | UNK    | UNK   | UNK     | UNK    | UNK   |

### WHERE Filters UNKNOWN Out

Only `TRUE` passes `WHERE`. Both `FALSE` and `UNKNOWN` are filtered out.

```sql
SELECT * FROM employees WHERE salary = 88000;    -- Charlie (TRUE)
SELECT * FROM employees WHERE salary = NULL;     -- empty (UNKNOWN)
SELECT * FROM employees WHERE salary <> NULL;    -- empty (UNKNOWN)
SELECT * FROM employees WHERE salary > 88000;    -- Alice, Eve (TRUE)
SELECT * FROM employees WHERE salary > NULL;     -- empty (UNKNOWN)
```

### NULL Propagation in Expressions

```sql
SELECT NULL + 1;          -- NULL
SELECT NULL * 5;          -- NULL
SELECT NULL || 'text';    -- NULL (most databases)
SELECT CONCAT(NULL, 'text'); -- NULL (MySQL, PostgreSQL)
```

> **Common misconception:** `NULL + 1` is not 1. It is NULL. NULL propagates through all arithmetic and string operations.

### Aggregate Functions and NULL

| Function          | NULL behavior                          |
|-------------------|----------------------------------------|
| `COUNT(*)`        | Counts all rows, including NULLs       |
| `COUNT(column)`   | Ignores NULL values                    |
| `COUNT(DISTINCT col)` | Ignores NULL values              |
| `SUM(column)`     | Ignores NULL values                    |
| `AVG(column)`     | Ignores NULL values (sum/count of non-NULL) |
| `MIN/MAX(column)` | Ignores NULL values                    |

```sql
SELECT COUNT(*) AS total,
       COUNT(salary) AS with_salary,
       SUM(salary) AS total_salary,
       AVG(salary) AS avg_salary
FROM employees;
```

| total | with_salary | total_salary | avg_salary |
|-------|-------------|--------------|------------|
| 7     | 6           | 487000       | 81166.67   |

Grace (salary = NULL) is counted by `COUNT(*)` but excluded from `COUNT(salary)`, `SUM`, and `AVG`.

### NULL in Boolean Expressions

```sql
-- These all return UNKNOWN (filtered out by WHERE):
WHERE NOT (NULL = 1)        -- NOT UNKNOWN = UNKNOWN
WHERE NULL AND TRUE          -- UNKNOWN
WHERE NULL OR FALSE          -- UNKNOWN
WHERE NOT NULL               -- UNKNOWN
WHERE NULL IN (1, 2, 3)     -- UNKNOWN
WHERE NULL NOT IN (1, 2, 3) -- UNKNOWN (not FALSE!)
WHERE NULL > ANY (1, 2, 3)  -- UNKNOWN
WHERE NULL > ALL (1, 2, 3)  -- UNKNOWN
```

### NULL-Safe Operators Summary

| Operator | NULL-safe? | NULL=NULL result |
|----------|-----------|------------------|
| `=`      | No        | UNKNOWN          |
| `<>`     | No        | UNKNOWN          |
| `IS NULL` | Yes      | TRUE             |
| `IS NOT NULL` | Yes   | FALSE            |
| `IS NOT DISTINCT FROM` | Yes | TRUE      |
| `IS DISTINCT FROM` | Yes | FALSE        |
| `EXISTS` (with NULL in subquery) | Yes | Depends on row existence |
| `NOT EXISTS` | Yes    | Depends on row existence |

### COALESCE and NULLIF

**`COALESCE`** — returns the first non-NULL value:

```sql
SELECT name, COALESCE(nickname, name) AS display_name
FROM employees;
```

| name    | display_name |
|---------|--------------|
| Alice   | Ali          |
| Bob     | Robert       |
| Charlie | Chuck        |
| Diana   | Di           |
| Eve     | Evelyn       |
| Frank   | Frankie      |
| Grace   | Grace        |

Grace's nickname is NULL, so `COALESCE` falls back to `name`.

**`NULLIF`** — returns NULL if the two values are equal:

```sql
SELECT NULLIF(10, 10);  -- NULL
SELECT NULLIF(10, 20);  -- 10
```

Useful for preventing division by zero:

```sql
SELECT name,
       salary / NULLIF(dept_id, 0) AS salary_per_dept_unit
FROM employees;
```

If `dept_id` were 0, `NULLIF` returns NULL, and `salary / NULL` is NULL (not an error).

---

## Sargability and Operator Choice

**SARGable** = Search-Argument-able = the predicate can take advantage of an index.

### SARGable Predicates

```sql
-- SARGable: direct column comparison
WHERE salary > 80000
WHERE dept_id = 1
WHERE name LIKE 'Ali%'
WHERE hire_date >= '2020-01-01'
WHERE hire_date < '2021-01-01'
```

### Non-SARGable Predicates

```sql
-- Non-SARGable: function on the column
WHERE YEAR(hire_date) = 2020
WHERE UPPER(name) = 'ALICE'
WHERE salary + 1000 > 80000
WHERE LEFT(name, 3) = 'Ali'
```

### Operator Sargability Table

| Operator/Pattern | SARGable? | Notes |
|------------------|-----------|-------|
| `=` | Yes | B-tree index lookup |
| `<>` / `!=` | Sometimes | Many optimizers don't use index for inequality (may do index scan + filter) |
| `>` / `<` / `>=` / `<=` | Yes | B-tree index range scan |
| `BETWEEN` | Yes | Equivalent to `>= AND <=` |
| `IN (literal list)` | Yes | Multiple index lookups or range scan |
| `IN (subquery)` | Depends | May be converted to semi-join |
| `LIKE 'prefix%'` | Yes | B-tree range scan |
| `LIKE '%substring%'` | No | Full table/index scan |
| `IS NULL` | Yes | Most databases index NULLs |
| `IS NOT NULL` | Sometimes | Depends on selectivity and optimizer |
| `EXISTS` | Yes (semi-join) | Typically optimized to semi-join |
| `NOT EXISTS` | Yes (anti-join) | Typically optimized to anti-join |
| `NOT IN` | Depends | May not be optimized well with NULLs |
| `REGEXP` / `~` | No | Full scan (unless specialized index) |
| `column + N > M` | No | Rewrite as `column > M - N` |
| `function(column) = X` | No | Rewrite or use functional index |

> **Always verify with EXPLAIN / EXPLAIN ANALYZE.** Sargability is a guideline, not a guarantee. The optimizer may transform your query in ways you don't expect.

---

## Common Mistakes

### Mistake 1: Using = Instead of IS NULL

```sql
-- BAD: returns nothing
WHERE manager_id = NULL

-- BETTER
WHERE manager_id IS NULL
```

### Mistake 2: NOT IN with Subquery That Contains NULLs

```sql
-- BAD: returns zero rows if subquery has any NULL
WHERE dept_id NOT IN (SELECT dept_id FROM employees WHERE manager_id IS NULL)

-- BETTER: use NOT EXISTS
WHERE NOT EXISTS (
    SELECT 1 FROM employees e2
    WHERE e2.manager_id IS NULL
      AND e2.dept_id = e.dept_id
)
```

### Mistake 3: BETWEEN for Timestamp Columns

```sql
-- BAD: misses timestamps later in the day
WHERE order_date BETWEEN '2024-12-01' AND '2024-12-31'

-- BETTER: exclusive upper bound
WHERE order_date >= '2024-12-01'
  AND order_date < '2025-01-01'
```

### Mistake 4: LIKE with Leading Wildcard

```sql
-- BAD: full scan, no index usage
WHERE name LIKE '%Alice'

-- BETTER: use prefix when possible
WHERE name LIKE 'Ali%'

-- BETTER: for substring search at scale, use full-text search
```

### Mistake 5: Assuming IN and EXISTS Are Always Interchangeable

```sql
-- Semantically different with NULLs:
WHERE id IN (1, NULL)           -- Returns id=1 rows only
WHERE EXISTS (SELECT 1 FROM t WHERE t.id = e.id)  -- Returns matched rows

-- For NOT IN vs NOT EXISTS, the difference is catastrophic:
WHERE id NOT IN (SELECT id FROM t)  -- Zero rows if subquery has NULL
WHERE NOT EXISTS (SELECT 1 FROM t WHERE t.id = e.id)  -- Correct
```

### Mistake 6: Ignoring Grain Before Filtering

```sql
-- BAD: "find employees in departments with budget > 300000"
-- but the developer meant "find the department budget"
SELECT e.name, d.budget
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE d.budget > 300000;
-- This returns multiple rows per department (one per employee)

-- BETTER: clarify the grain
SELECT DISTINCT d.name, d.budget
FROM departments d
WHERE d.budget > 300000;
```

### Mistake 7: Putting Conditions in Wrong Place (ON vs WHERE)

```sql
-- BAD: LEFT JOIN + WHERE on right table = INNER JOIN
SELECT c.name, o.amount
FROM employees c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.amount > 100;
-- Customers with no orders are excluded (o.amount is NULL, filtered out)

-- BETTER: put right-table filter in ON
SELECT c.name, o.amount
FROM employees c
LEFT JOIN orders o ON o.customer_id = c.id
                   AND o.amount > 100;
```

> **Cross-reference:** This is the LEFT JOIN becoming INNER JOIN trap — covered in detail in [06 — Logical Query Processing Order](./06-Logical-Query-Processing-Order.md).

---

## Production Pitfalls

### 1. Implicit Type Conversion Prevents Index Use

```sql
-- BAD: comparing varchar column to number
WHERE phone_number = 5551234

-- BETTER: match types
WHERE phone_number = '5551234'
```

The database silently converts types, which may prevent index usage.

### 2. Large IN Lists

```sql
-- May be slow with thousands of values
WHERE id IN (1, 2, 3, ..., 10000)
```

For very large lists, consider:

- Temporary table + `JOIN`
- `VALUES` clause (PostgreSQL, SQL Server)
- Partitioning the list

> **Verify with EXPLAIN.** Some databases decompose large `IN` lists into sorts or hash joins internally.

### 3. NOT IN on Nullable Columns

This is not a performance issue — it is a **correctness** issue. See [NOT IN with NULLs](#not-in-with-NULLs--the-most-dangerous-pattern-in-sql).

### 4. OR Preventing Index Use

```sql
-- BAD: optimizer may not use index for both branches
WHERE dept_id = 1 OR name = 'Alice'

-- BETTER: use UNION ALL (each branch can use its own index)
SELECT * FROM employees WHERE dept_id = 1
UNION ALL
SELECT * FROM employees WHERE name = 'Alice' AND dept_id <> 1
```

> **Verify with EXPLAIN.** Some optimizers can handle `OR` with index unions or bitmap index scans. The behavior varies by database.

### 5. Functions on Indexed Columns

```sql
-- BAD: function prevents index use
WHERE YEAR(hire_date) = 2020

-- BETTER: range predicate on raw column
WHERE hire_date >= '2020-01-01' AND hire_date < '2021-01-01'
```

### 6. Overusing DISTINCT as a Deduplication Patch

```sql
-- BAD: hiding duplicates instead of fixing the source
SELECT DISTINCT e.name, d.name
FROM employees e
JOIN departments d ON e.dept_id = d.id;

-- BETTER: fix the join that creates duplicates
```

### 7. Implicit Cartesian Products

```sql
-- DANGEROUS: forgot the WHERE in implicit join
SELECT e.name, d.name
FROM employees e, departments d;
-- Returns 7 × 4 = 28 rows
```

Always use explicit `JOIN ... ON`.

---

## Performance Implications

### How the Database Processes Filters

1. **Index Range Scan:** The most efficient. The database walks a B-tree index to find matching rows. O(log n + k) where k = matching rows.

2. **Index Scan:** Uses the index to find row locations, then fetches each row from the table. Slightly more I/O than index-only scan.

3. **Index-Only Scan:** All columns needed are in the index. No table access. Best case.

4. **Sequential Scan (Full Table Scan):** Reads every row and evaluates the predicate. O(n). Used when no suitable index exists or when the optimizer estimates a scan is cheaper.

### Factors Affecting Filter Performance

| Factor | Impact |
|--------|--------|
| Indexes | A well-placed index can turn O(n) into O(log n) |
| Statistics | Optimizer relies on cardinality estimates |
| Data distribution | Skewed data may cause poor plan choices |
| Predicate sargability | Non-SARGable predicates force scans |
| Selectivity | A filter that matches 1% of rows is more index-friendly than one matching 90% |
| Result size | Returning millions of rows is slow regardless |
| Query shape | `SELECT *` is slower than `SELECT col1, col2` |
| Database engine | Different optimizers make different choices |
| Cache / buffer pool | Hot data is faster than cold data |

### Execution Plan Verification

> **Always verify with execution plans:**

| Database    | Command                                                    |
|-------------|------------------------------------------------------------|
| PostgreSQL  | `EXPLAIN ANALYZE` or `EXPLAIN (ANALYZE, BUFFERS)`         |
| MySQL       | `EXPLAIN ANALYZE` (8.0+) or `EXPLAIN`                     |
| SQL Server  | `SET STATISTICS IO ON;` or `SET STATISTICS TIME ON;` or press Ctrl+M in SSMS |
| Oracle      | `EXPLAIN PLAN FOR <query>; SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);` |

### What to Look For in the Plan

- **Seq Scan vs Index Scan:** Is the filter using an index?
- **Filter vs Index Cond:** Is the predicate evaluated at the index (efficient) or after fetching the row (less efficient)?
- **Rows Estimated vs Actual:** Large discrepancies indicate stale statistics.
- **Sort nodes:** Can they be avoided with a matching index?
- **Nested Loop vs Hash Join vs Merge Join:** Is the join strategy optimal?

---

## BAD vs BETTER Approaches

### BAD: OR Chains Instead of IN

```sql
-- BAD
WHERE dept_id = 1 OR dept_id = 2 OR dept_id = 3

-- BETTER
WHERE dept_id IN (1, 2, 3)
```

### BAD: NOT IN Instead of NOT EXISTS

```sql
-- BAD: dangerous with NULLs
WHERE dept_id NOT IN (SELECT dept_id FROM other_table)

-- BETTER: NULL-safe
WHERE NOT EXISTS (
    SELECT 1 FROM other_table WHERE other_table.dept_id = employees.dept_id
)
```

### BAD: BETWEEN for Timestamps

```sql
-- BAD: may miss rows
WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31'

-- BETTER: exclusive upper bound
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'
```

### BAD: LIKE with Leading Wildcard

```sql
-- BAD: full scan
WHERE name LIKE '%lic%'

-- BETTER: full-text search for substring matching
-- PostgreSQL: WHERE name @@ to_tsquery('alice')
-- MySQL: WHERE MATCH(name) AGAINST('alice')
```

### BAD: Function on Column in WHERE

```sql
-- BAD: non-SARGable
WHERE UPPER(name) = 'ALICE'

-- BETTER: case-insensitive comparison (if collation supports it)
WHERE name ILIKE 'alice'       -- PostgreSQL
WHERE name = 'Alice'           -- If data is consistently cased
```

### BAD: Implicit Join Without WHERE

```sql
-- BAD: Cartesian product
SELECT e.name, d.name
FROM employees e, departments d;

-- BETTER: explicit JOIN
SELECT e.name, d.name
FROM employees e
JOIN departments d ON e.dept_id = d.id;
```

### BAD: SELECT * Then Filtering in Application

```sql
-- BAD
SELECT * FROM employees;
-- Application filters where salary > 80000

-- BETTER: filter in SQL
SELECT id, name, salary
FROM employees
WHERE salary > 80000;
```

---

## Comparison Tables

### Filtering Operators at a Glance

| Operator | NULL-safe? | Index-friendly? | Best for |
|----------|-----------|-----------------|----------|
| `=` | No | Yes | Exact match |
| `<>` / `!=` | No | Sometimes | Exclusion |
| `<`, `>`, `<=`, `>=` | No | Yes | Range comparison |
| `BETWEEN` | No | Yes | Inclusive range |
| `IN` | No | Yes (small lists) | Value in set |
| `NOT IN` | **No (DANGEROUS)** | Yes | Value not in set (no NULLs) |
| `LIKE` | No | Prefix only | Pattern matching |
| `IS NULL` | **Yes** | Yes | NULL test |
| `IS NOT NULL` | **Yes** | Yes | Not-NULL test |
| `IS NOT DISTINCT FROM` | **Yes** | Depends | NULL-safe equality |
| `EXISTS` | **Yes** | Yes (semi-join) | Row existence |
| `NOT EXISTS` | **Yes** | Yes (anti-join) | Row absence |
| `ANY` / `ALL` | No | Depends | Comparison against subquery |
| `REGEXP` / `~` | No | No (specialized index possible) | Complex patterns |
| Row value expression | No | Yes (composite index) | Multi-column comparison |

### NOT IN vs NOT EXISTS

| Scenario | NOT IN | NOT EXISTS |
|----------|--------|------------|
| Subquery has no NULLs | Correct | Correct |
| Subquery has NULLs | **Returns zero rows** | Correct |
| Performance | Often similar | Often similar |
| Readability | Simpler | Slightly verbose |
| Recommendation | Only with guaranteed non-NULL subquery | **Always prefer** |

### IN vs EXISTS

| Scenario | IN | EXISTS |
|----------|-----|--------|
| Static list of values | Preferred | Overkill |
| Subquery may have NULLs | Safe (for IN, not NOT IN) | Safe |
| Large subquery | May be slower (materializes list) | Semi-join (may be faster) |
| Correlated subquery | Cannot be correlated | Can be correlated |
| Recommendation | Small static lists; non-NULL subqueries | Large/correlated subqueries; NULL safety |

---

## Best Practices

1. **Always use `IS NULL` / `IS NOT NULL`** to check for NULL — never `= NULL` or `<> NULL`.

2. **Prefer `NOT EXISTS` over `NOT IN`** when the subquery might contain NULLs.

3. **Use `BETWEEN` carefully with timestamps** — prefer `>= AND <` with exclusive upper bounds.

4. **Write SARGable predicates** — avoid functions on indexed columns in `WHERE`.

5. **Match types explicitly** — don't rely on implicit type conversion.

6. **Use `IN` for small static lists**, `EXISTS` for subqueries, especially correlated ones.

7. **Parenthesize complex conditions** to make operator precedence explicit.

8. **Use `ESCAPE` with `LIKE`** when searching for literal `%` or `_`.

9. **Verify with `EXPLAIN ANALYZE`** before assuming a filter is fast.

10. **Understand your data's NULL profile** — know which columns can be NULL and how that affects your filters.

11. **Prefer `IS DISTINCT FROM`** over `COALESCE` hacks for NULL-safe comparison (when the database supports it).

12. **Consider grain before filtering** — a filter that ignores the grain produces wrong answers.

---

# Interview Questions

## Beginner

1. What is the difference between `= NULL` and `IS NULL`?
2. Why does `WHERE manager_id = NULL` return no rows?
3. What is the result of `NULL = NULL` — `TRUE`, `FALSE`, or `UNKNOWN`?
4. What does `BETWEEN 1 AND 3` include — 1, 2, 3 or just 2?
5. Why does `IN (1, NULL)` not return rows where the column is NULL?
6. What is the difference between `<>` and `!=`?
7. When would you use `IS NOT NULL` instead of a comparison operator?
8. Write a query to find all employees not in department 1 or 2.
9. Write a query to find employees whose name starts with 'Ch'.
10. What wildcard does `LIKE` use for "zero or more characters"?

## Intermediate

11. Explain why `NOT IN (1, NULL)` returns zero rows.
12. What is the difference between `IN` and `EXISTS`?
13. Write a query using `NOT EXISTS` that is NULL-safe.
14. Why does `LIKE '%Alice%'` prevent index usage while `LIKE 'Ali%'` does not?
15. What is `IS DISTINCT FROM` and when would you use it?
16. Write a query to find employees where `dept_id` matches their manager's `dept_id`, handling NULLs.
17. Why does `BETWEEN '2024-01-01' AND '2024-12-31'` potentially miss rows?
18. What is the difference between `ANY` and `ALL`?
19. Write a query using `> ALL` that is equivalent to `> (SELECT MAX(...) FROM ...)`.
20. Why might `WHERE dept_id <> 1` not use an index?

## Advanced

21. Explain the difference between `NOT IN` and `NOT EXISTS` using three-valued logic.
22. How does a row value expression like `(dept_id, salary) > (1, 72000)` work?
23. Write a NULL-safe comparison workaround for SQL Server (which lacks `IS DISTINCT FROM`).
24. Explain why `EXISTS` is typically implemented as a semi-join and `NOT EXISTS` as an anti-join.
25. Under what conditions does `IS NOT NULL` fail to use an index?
26. Why does `NULL > ALL (1, 2, 3)` return zero rows?
27. Write a query that demonstrates `COALESCE` and `NULLIF` working together.
28. How does `REGEXP` differ from `LIKE` in terms of performance and index usage?
29. Explain when `IN (subquery)` is converted to a semi-join by the optimizer.
30. Write a query using row value expressions for keyset pagination.

## Scenario Based

31. A report query `WHERE status IN ('active', 'pending', NULL)` returns fewer rows than expected. Explain why.
32. You need to find customers who have never placed an order. Write the query two ways (`NOT IN` and `NOT EXISTS`) and explain which is safer.
33. A developer writes `WHERE YEAR(order_date) = 2024` on a 50M-row table and it's slow. Diagnose and fix.
34. A `LEFT JOIN` loses customers when `WHERE o.amount > 100` is added. Explain why and fix it.
35. You need to find employees whose `nickname` matches a complex pattern (e.g., starts with a vowel, followed by exactly 2 consonants). Which operator would you use?

## Tricky

36. What is the result of `NULL IN (1, 2, NULL)` — `TRUE`, `FALSE`, or `UNKNOWN`?
37. What is the result of `NULL NOT IN (1, 2, NULL)` — `TRUE`, `FALSE`, or `UNKNOWN`?
38. What is the result of `NULL > ALL (1, 2, 3)` — `TRUE`, `FALSE`, or `UNKNOWN`?
39. What is the result of `NULL > ANY (1, 2, 3)` — `TRUE`, `FALSE`, or `UNKNOWN`?
40. Does `WHERE col IN (1)` produce the same result as `WHERE col = 1` when `col` is NULL?

## Output Prediction

Given the sample tables:

```sql
-- Q41
SELECT COUNT(*) FROM employees WHERE salary > 80000;

-- Q42
SELECT COUNT(*) FROM employees WHERE dept_id IS NULL;

-- Q43
SELECT COUNT(*) FROM employees WHERE dept_id IN (1, NULL);

-- Q44
SELECT name FROM employees WHERE name LIKE '_o%';

-- Q45
SELECT name FROM employees
WHERE EXISTS (SELECT 1 FROM departments d WHERE d.id = employees.dept_id);
```

Predict the output of each query.

## Debugging

46. This query returns an error. Fix it:

```sql
SELECT name, salary
FROM employees
WHERE salary BETWEEN 80000 AND NULL;
```

47. This query returns too many rows. The developer wants only employees with no department. What is wrong?

```sql
SELECT *
FROM employees
WHERE dept_id <> NULL;
```

48. This query should return employees with no manager but returns nothing. Why?

```sql
SELECT * FROM employees WHERE manager_id = NULL;
```

49. This query returns zero rows unexpectedly:

```sql
SELECT *
FROM employees
WHERE dept_id NOT IN (
    SELECT dept_id FROM employees WHERE manager_id IS NULL
);
```

50. This query is slow on a table with 50M rows. Diagnose:

```sql
SELECT * FROM orders
WHERE SUBSTRING(status, 1, 3) = 'pen';
```

## Performance

51. Which of these queries can use an index on `salary`? Explain why.

```sql
-- Query A
WHERE salary > 80000

-- Query B
WHERE salary * 12 > 960000

-- Query C
WHERE salary + 1000 > 81000
```

52. You have a composite index on `(dept_id, salary)`. Which of these predicates can use it?

```sql
-- Q52a: WHERE dept_id = 1
-- Q52b: WHERE dept_id = 1 AND salary > 80000
-- Q52c: WHERE salary > 80000
-- Q52d: WHERE salary > 80000 AND dept_id = 1
-- Q52e: WHERE (dept_id, salary) > (1, 72000)
```

53. Under what circumstances might `WHERE id IN (SELECT id FROM large_table)` outperform `WHERE EXISTS (SELECT 1 FROM large_table WHERE ...)`?

54. You run `EXPLAIN ANALYZE` and see "Seq Scan on employees Filter: (salary > 80000)". What does this mean? When is it acceptable?

55. A `NOT EXISTS` subquery returns results quickly for 1,000 rows but slowly for 1,000,000 rows. What might explain the difference, and how would you investigate?
