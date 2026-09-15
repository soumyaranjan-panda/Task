# IS DISTINCT FROM

## What It Is

`IS DISTINCT FROM` is a null-safe inequality operator. It compares two values and returns `TRUE` when they are different — **including when NULL is involved**.

Standard `<>` (or `!=`) cannot handle NULLs. Any comparison with NULL using `<>` returns `UNKNOWN`, not `TRUE` or `FALSE`. `IS DISTINCT FROM` resolves this by treating NULL as a known, comparable value.

## Why It Exists

SQL uses three-valued logic: `TRUE`, `FALSE`, and `UNKNOWN`. Any arithmetic or comparison involving NULL yields `UNKNOWN`. This creates a problem when you need to check if two values are "not the same," because:

```sql
-- This does NOT work as expected when col is NULL
SELECT * FROM employees WHERE department <> 'Sales';
-- If department is NULL, the condition returns UNKNOWN, row is excluded
```

`IS DISTINCT FROM` was introduced to give developers a reliable, readable way to say: "Are these two values different, even if one or both are NULL?"

## Syntax

```sql
expression IS DISTINCT FROM expression
expression IS NOT DISTINCT FROM expression
```

| Operator | Returns TRUE when... |
|---|---|
| `IS DISTINCT FROM` | Values are different, or one is NULL and the other is not |
| `IS NOT DISTINCT FROM` | Values are the same, including both being NULL |

## Internal Working

`IS DISTINCT FROM` is logically equivalent to:

```sql
-- a IS DISTINCT FROM b
(a <> b) OR (a IS NULL AND b IS NOT NULL) OR (a IS NOT NULL AND b IS NULL)

-- a IS NOT DISTINCT FROM b
(a = b) OR (a IS NULL AND b IS NULL)
```

The optimizer may implement it differently depending on the database engine, but the **semantic behavior** is always the same: NULL is treated as equal to NULL, and different from any non-NULL value.

## Sample Tables

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    email VARCHAR(100)
);

INSERT INTO employees VALUES
(1, 'Alice',   'Engineering', 'alice@company.com'),
(2, 'Bob',     'Sales',       NULL),
(3, 'Charlie', NULL,          'charlie@company.com'),
(4, 'Diana',   'Sales',       'diana@company.com'),
(5, 'Eve',     'Engineering', NULL);
```

**Grain:** One row per employee.

## Examples

### Finding Rows Where Values Differ (Including NULLs)

```sql
SELECT name, department
FROM employees
WHERE department IS DISTINCT FROM 'Sales';
```

| name | department |
|---|---|
| Alice | Engineering |
| Charlie | NULL |
| Eve | Engineering |

**Why this matters:** `CHARLIE` has `NULL` department. Using `department <> 'Sales'` would **exclude** Charlie because `NULL <> 'Sales'` returns `UNKNOWN`. `IS DISTINCT FROM` correctly includes Charlie because `NULL` is "different from" `'Sales'`.

### Finding Rows Where Values Match (Including NULLs)

```sql
SELECT name, email
FROM employees
WHERE email IS NOT DISTINCT FROM NULL;
```

| name | email |
|---|---|
| Bob | NULL |
| Eve | NULL |

**Equivalent to:**

```sql
SELECT name, email
FROM employees
WHERE email IS NULL;
```

In this case `IS NOT DISTINCT FROM NULL` and `IS NULL` are functionally identical. But `IS NOT DISTINCT FROM` becomes valuable when comparing to a column or expression that might itself be NULL.

### Comparing Two Columns That May Both Be NULL

```sql
SELECT name, department, email
FROM employees
WHERE department IS DISTINCT FROM 'Engineering';
```

| name | department | email |
|---|---|---|
| Bob | Sales | NULL |
| Charlie | NULL | charlie@company.com |
| Diana | Sales | diana@company.com |

Now consider comparing **two columns**:

```sql
SELECT name, department, email
FROM employees
WHERE department IS DISTINCT FROM 'Sales';
```

This works correctly. But what if you want to compare two columns to each other?

```sql
--假设有另一个表
CREATE TABLE employee_assignments (
    employee_id INT,
    assigned_dept VARCHAR(50)
);

INSERT INTO employee_assignments VALUES
(1, 'Engineering'),
(2, 'Sales'),
(3, NULL),
(4, 'Marketing');
```

```sql
SELECT e.name, e.department, a.assigned_dept
FROM employees e
JOIN employee_assignments a ON e.id = a.employee_id
WHERE e.department IS DISTINCT FROM a.assigned_dept;
```

| name | department | assigned_dept |
|---|---|---|
| Diana | Sales | Marketing |
| Charlie | NULL | NULL — wait, Charlie is NOT in result |

**Expected result:**

| name | department | assigned_dept |
|---|---|---|
| Diana | Sales | Marketing |

Charlie is excluded because `NULL IS DISTINCT FROM NULL` returns `FALSE` — they are "not different" (both NULL).

## The NULL = NULL Problem

This is the core reason `IS DISTINCT FROM` exists.

```sql
SELECT
    NULL = NULL          AS eq,          -- UNKNOWN
    NULL <> NULL         AS neq,         -- UNKNOWN
    NULL IS DISTINCT FROM NULL AS df,    -- FALSE
    NULL IS NOT DISTINCT FROM NULL AS ndf; -- TRUE
```

| eq | neq | df | ndf |
|---|---|---|---|
| UNKNOWN | UNKNOWN | FALSE | TRUE |

### BAD APPROACH

```sql
-- WRONG: This returns no rows when both columns are NULL
SELECT *
FROM employees e
JOIN employee_assignments a
  ON e.id = a.employee_id
WHERE e.department <> a.assigned_dept;
-- NULL <> NULL → UNKNOWN → row excluded
-- Rows where department is NULL AND assigned_dept is NULL are silently dropped
```

### BETTER APPROACH

```sql
-- CORRECT: NULL = NULL is treated as matching, non-matches are caught
SELECT *
FROM employees e
JOIN employee_assignments a
  ON e.id = a.employee_id
WHERE e.department IS DISTINCT FROM a.assigned_dept;
```

## IS DISTINCT FROM vs Other Approaches

### Comparison Table

| Approach | NULL = NULL | NULL <> value | readable | portable |
|---|---|---|---|---|
| `<>` | UNKNOWN | UNKNOWN | ★★★ | ★★★ |
| `IS DISTINCT FROM` | FALSE | TRUE | ★★★ | ★★☆ |
| `COALESCE(a, '') <> COALESCE(b, '')` | FALSE | TRUE | ★★☆ | ★★★ |
| `(a <> b OR (a IS NULL AND b IS NOT NULL) OR (a IS NOT NULL AND b IS NULL))` | FALSE | TRUE | ★☆☆ | ★★★ |

### COALESCE Approach

```sql
-- Works but has a subtle bug if empty string is a valid value
SELECT *
FROM employees
WHERE COALESCE(department, '') <> COALESCE('Sales', '');
```

If `department` could legitimately be `''`, then `COALESCE(department, '')` cannot distinguish between `NULL` and `''`. `IS DISTINCT FROM` does not have this problem.

### BAD APPROACH: COALESCE with sentinel values

```sql
-- DANGEROUS: What if '___NULL___' is a real department name?
SELECT *
FROM employees
WHERE COALESCE(department, '___NULL___') <> 'Sales';
```

### BETTER APPROACH

```sql
SELECT *
FROM employees
WHERE department IS DISTINCT FROM 'Sales';
```

## NULL Behavior

`IS DISTINCT FROM` has **consistent, predictable NULL behavior**:

| Expression | When a is NULL | When b is NULL | When both NULL |
|---|---|---|---|
| `a IS DISTINCT FROM b` | TRUE (if b is not NULL) | TRUE (if a is not NULL) | FALSE |
| `a IS NOT DISTINCT FROM b` | FALSE (if b is not NULL) | FALSE (if a is not NULL) | TRUE |

Key rules:

- `NULL IS DISTINCT FROM NULL` → **FALSE** (they are the "same")
- `NULL IS DISTINCT FROM 1` → **TRUE** (they are "different")
- `1 IS DISTINCT FROM NULL` → **TRUE** (they are "different")
- `NULL IS NOT DISTINCT FROM NULL` → **TRUE**
- `NULL IS NOT DISTINCT FROM 1` → **FALSE**

This is **exactly the opposite** of what `=`, `<>` do with NULL.

## Edge Cases

### Edge Case 1: Empty Strings vs NULL

```sql
CREATE TABLE configs (
    id INT,
    value VARCHAR(50)
);

INSERT INTO configs VALUES
(1, NULL),
(2, ''),
(3, 'active');
```

```sql
SELECT * FROM configs WHERE value IS DISTINCT FROM '';
```

| id | value |
|---|---|
| 1 | NULL |
| 3 | active |

Row with `id=2` is excluded because `'' IS DISTINCT FROM ''` → `FALSE`. Row with `id=1` is included because `NULL IS DISTINCT FROM ''` → `TRUE`.

**Important:** In Oracle, `NULL` and `''` are treated as the same thing. `IS DISTINCT FROM` in Oracle treats them as equal. In PostgreSQL and MySQL, they are different.

> Oracle: Oracle treats empty strings as NULL. `'' IS NOT DISTINCT FROM NULL` → `TRUE` in Oracle.

### Edge Case 2: CASE Expressions Emulating IS DISTINCT FROM

```sql
-- Emulating IS DISTINCT FROM for databases that lack it
SELECT
    CASE
        WHEN a = b THEN FALSE
        WHEN a IS NULL AND b IS NULL THEN FALSE
        ELSE TRUE
    END AS is_distinct
FROM some_table;
```

This is verbose and error-prone. Use `IS DISTINCT FROM` when available.

### Edge Case 3: Multiple NULLs in a Group

```sql
CREATE TABLE readings (
    sensor_id INT,
    temperature DECIMAL(5,2)
);

INSERT INTO readings VALUES
(1, 98.6),
(2, NULL),
(3, NULL),
(4, 99.1);
```

```sql
-- Count rows where temperature differs from a threshold of 98.6
SELECT COUNT(*)
FROM readings
WHERE temperature IS DISTINCT FROM 98.6;
```

| count |
|---|
| 3 |

Rows 2, 3, and 4 are all "distinct from" 98.6. NULL is distinct from 98.6.

### Edge Case 4: IS DISTINCT FROM in JOIN Conditions

```sql
SELECT e.name, a.assigned_dept
FROM employees e
LEFT JOIN employee_assignments a
  ON e.id = a.employee_id
WHERE e.department IS DISTINCT FROM a.assigned_dept
   OR (e.department IS NULL AND a.assigned_dept IS NULL);
```

This finds employees whose actual department differs from their assigned department, **including cases where both are NULL**.

## Common Mistakes

### Mistake 1: Forgetting IS DISTINCT FROM in Subqueries

```sql
-- WRONG: NULL employees are silently excluded from comparison
SELECT *
FROM employees
WHERE department <> (
    SELECT department FROM employees WHERE id = 3
);
-- If department of id=3 is NULL, this returns ZERO rows for anyone
```

### BETTER APPROACH

```sql
-- CORRECT
SELECT *
FROM employees
WHERE department IS DISTINCT FROM (
    SELECT department FROM employees WHERE id = 3
);
```

### Mistake 2: Using IS DISTINCT FROM When IS NULL Suffices

```sql
-- UNNECESSARY COMPLEXITY
SELECT * FROM employees WHERE department IS DISTINCT FROM NULL;

-- SIMPLER (and identical in behavior)
SELECT * FROM employees WHERE department IS NULL;
```

`IS DISTINCT FROM NULL` is logically equivalent to `IS NULL` for the left-hand side. Use `IS NULL` for clarity.

### Mistake 3: Mixing IS DISTINCT FROM with NOT IN

```sql
-- These are NOT the same
SELECT *
FROM employees
WHERE department NOT IN (SELECT dept FROM departments WHERE dept IS NULL);

-- vs

SELECT *
FROM employees
WHERE department IS DISTINCT FROM ALL (SELECT dept FROM departments WHERE dept IS NULL);
```

`NOT IN` with a subquery containing NULL returns **no rows**. `IS DISTINCT FROM` handles NULLs independently. See [NOT IN + NULL](09-NOT-IN-NULL.md) and [NOT EXISTS](10-NOT-EXISTS.md).

### Mistake 4: Assuming IS DISTINCT FROM is Standard Everywhere

| Database | IS DISTINCT FROM support |
|---|---|
| PostgreSQL | ✅ Full support |
| MySQL 8.0+ | ✅ Full support |
| SQL Server | ❌ Not supported (use `EXCEPT` or `COALESCE` workaround) |
| Oracle | ✅ Full support (12c+) |
| SQLite | ✅ Full support |

> SQL Server: Use a `CASE` expression or `EXCEPT` as a workaround.

```sql
-- SQL Server workaround
SELECT *
FROM employees e
JOIN employee_assignments a ON e.id = a.employee_id
WHERE NOT (
    e.department = a.assigned_dept
    OR (e.department IS NULL AND a.assigned_dept IS NULL)
);
```

## Performance Implications

`IS DISTINCT FROM` does not have special performance characteristics. It compiles to the same type of comparison as `<>` with additional NULL checks.

What to verify with `EXPLAIN`:

- Does the optimizer push the `IS DISTINCT FROM` condition down?
- Does it use an index on the compared column?
- Are there implicit type conversions that prevent index usage?

```sql
EXPLAIN ANALYZE
SELECT * FROM employees
WHERE department IS DISTINCT FROM 'Sales';
```

If `department` is indexed, the optimizer may use an index scan. However, `IS DISTINCT FROM` involves NULL handling, so the execution plan may differ from a plain `<>` comparison.

> Performance depends on optimizer, indexes, statistics, cardinality, data distribution, query shape, database engine, and execution plan. Always verify with EXPLAIN ANALYZE.

## Production Pitfalls

### Production Pitfall 1: Silent Data Loss in ETL

```sql
-- DANGEROUS: NULLs silently dropped
UPDATE target_table
SET col = source_table.col
FROM target_table
JOIN source_table ON target_table.id = source_table.id
WHERE target_table.col <> source_table.col;
-- If both are NULL, the row is NOT updated, which may be wrong
```

### BETTER APPROACH

```sql
UPDATE target_table
SET col = source_table.col
FROM target_table
JOIN source_table ON target_table.id = source_table.id
WHERE target_table.col IS DISTINCT FROM source_table.col;
```

### Production Pitfall 2: Data Quality Checks

```sql
-- DANGEROUS: Doesn't catch NULL mismatches
SELECT *
FROM orders
WHERE status <> 'completed';
-- NULL status orders are excluded from the report
```

### BETTER APPROACH

```sql
-- Catches all non-completed orders, including NULLs
SELECT *
FROM orders
WHERE status IS DISTINCT FROM 'completed';
```

### Production Pitfall 3: Diffing Two Snapshots

When comparing two versions of data (e.g., slowly changing dimensions), `IS DISTINCT FROM` is essential for detecting changes:

```sql
-- Find all changed rows between old and new snapshots
SELECT old.id
FROM snapshot_old old
JOIN snapshot_new new ON old.id = new.id
WHERE old.name IS DISTINCT FROM new.name
   OR old.email IS DISTINCT FROM new.email
   OR old.salary IS DISTINCT FROM new.salary;
```

Without `IS DISTINCT FROM`, rows where a column changed from a value to NULL (or vice versa) would be missed.

## Interview Traps

> Interview trap

**Trap 1:** "What does `NULL IS DISTINCT FROM NULL` return?"

Answer: `FALSE`. NULL is not different from NULL — they are "the same" under `IS DISTINCT FROM` semantics.

> Interview trap

**Trap 2:** "Why doesn't `<>` work for comparing columns that might be NULL?"

Answer: `NULL <> anything` returns `UNKNOWN`, which is treated as `FALSE` in a `WHERE` clause. Rows with NULLs are silently excluded.

> Interview trap

**Trap 3:** "Can you rewrite `IS DISTINCT FROM` without using it?"

Answer: Yes:
```sql
-- a IS DISTINCT FROM b
(a <> b) OR (a IS NULL AND b IS NOT NULL) OR (a IS NOT NULL AND b IS NULL)
```

> Interview trap

**Trap 4:** "Does `IS DISTINCT FROM` use an index?"

Answer: It depends on the optimizer. Some databases can use indexes with `IS DISTINCT FROM`, others cannot. Always check the execution plan with `EXPLAIN ANALYZE`.

> Interview trap

**Trap 5:** "What's the difference between `IS DISTINCT FROM` and `<>`?"

Answer: `<>` returns `UNKNOWN` when either operand is NULL. `IS DISTINCT FROM` returns `TRUE` when one operand is NULL and the other is not, and `FALSE` when both are NULL.

## Best Practices

1. **Use `IS DISTINCT FROM`** whenever comparing values that might be NULL and you need a deterministic `TRUE`/`FALSE` result.
2. **Use `IS NOT DISTINCT FROM`** in JOIN conditions where NULLs should match NULLs.
3. **Prefer `IS DISTINCT FROM` over `COALESCE` tricks** — it is clearer, safer, and avoids sentinel-value bugs.
4. **Check your database supports it** — SQL Server does not; use `CASE` or `EXCEPT` as workarounds.
5. **Use `EXPLAIN ANALYZE`** to verify index usage when `IS DISTINCT FROM` is in a filter or join condition.
6. **In diff/snapshot comparisons**, always use `IS DISTINCT FROM` to avoid missing NULL-to-value or value-to-NULL transitions.
7. **Don't overuse it** — if you only care about NULLs, `IS NULL` / `IS NOT NULL` is simpler and universally supported.

## Related Sections

- [NULL](01-NULL.md) — Three-valued logic fundamentals
- [NULL = NULL](02-NULL-EQUALS-NULL.md) — Why NULL = NULL is UNKNOWN
- [IS NULL / IS NOT NULL](12-IS-NULL-IS-NOT-NULL.md) — Simpler NULL checks
- [COALESCE](05-COALESCE.md) — Null-safe value substitution
- [NOT IN + NULL](09-NOT-IN-NULL.md) — Another NULL pitfall
- [NOT EXISTS](10-NOT-EXISTS.md) — Null-safe existence check
- [JOIN duplication](../5-JOINs/03-JOIN-Duplication.md) — NULLs in JOIN conditions

---

# Interview Questions

## Beginner

1. What does `NULL IS DISTINCT FROM NULL` return? Why?

2. What is the difference between `IS DISTINCT FROM` and `<>`?

3. Rewrite `a IS DISTINCT FROM b` using only `=`, `<>`, `IS NULL`, and `OR`.

4. Why might `SELECT * FROM t WHERE col <> 5` miss rows where `col` is NULL?

5. Is `IS DISTINCT FROM` supported in SQL Server? If not, what's a workaround?

## Intermediate

6. Given a table with columns `a` and `b` that may contain NULLs, write a query that returns all rows where `a` and `b` are "different" (including NULL mismatches).

7. What is the difference between `IS DISTINCT FROM` and `COALESCE(a, '') <> COALESCE(b, '')`?

8. Why is `IS DISTINCT FROM` important when comparing two snapshots of data (slowly changing dimensions)?

9. In a JOIN condition, what happens when you use `ON a.col <> b.col` versus `ON a.col IS DISTINCT FROM b.col` if both columns can be NULL?

10. Write a query using `IS NOT DISTINCT FROM` to find employees whose department matches their assigned department, including cases where both are NULL.

## Advanced

11. How would you implement `IS DISTINCT FROM` in SQL Server using only standard SQL constructs?

12. Can `IS DISTINCT FROM` prevent accidental Cartesian products in a JOIN? Explain.

13. Write a query that finds rows where column `status` changed from `'active'` to NULL (or vice versa) between two tables `snapshot_old` and `snapshot_new`.

14. Why might `IS DISTINCT FROM` produce different execution plans than `<>` on the same indexed column? What should you check?

15. In PostgreSQL, does `IS DISTINCT FROM` use an index on the compared column? Under what conditions?

## Scenario Based

16. You are building a data reconciliation tool that compares two database snapshots. Rows where `old.value IS DISTINCT FROM new.value` are flagged as changed. A stakeholder asks: "Why are rows where both values are NULL not flagged?" How do you explain this?

17. You have a table `sensor_readings` where `temperature` can be NULL (sensor failure). You need to find all readings that differ from the previous reading. Why is `IS DISTINCT FROM` essential here?

18. A developer writes `WHERE col <> 'default'` to find non-default values. You notice many rows with `col = NULL` are missing from results. How do you fix this and explain the problem?

## Tricky

19. What is the result of this query?

```sql
SELECT
    CASE WHEN NULL IS DISTINCT FROM NULL THEN 'different' ELSE 'same' END,
    CASE WHEN NULL IS NOT DISTINCT FROM NULL THEN 'different' ELSE 'same' END;
```

20. What is the result of this query?

```sql
SELECT 1 WHERE NULL IS DISTINCT FROM 1;
```

21. What is the result of this query?

```sql
SELECT 1 WHERE NULL IS DISTINCT FROM NULL;
```

22. Will these two queries always return the same result?

```sql
-- Query A
SELECT * FROM t WHERE a IS DISTINCT FROM b;

-- Query B
SELECT * FROM t WHERE NOT (a IS NOT DISTINCT FROM b);
```

## Output Prediction

23. Given:

```sql
CREATE TABLE t (a INT, b INT);
INSERT INTO t VALUES (1, 1), (1, NULL), (NULL, 1), (NULL, NULL), (2, 3);
```

What rows does this return?

```sql
SELECT * FROM t WHERE a IS DISTINCT FROM b;
```

24. Given the same table, what does this return?

```sql
SELECT * FROM t WHERE a IS NOT DISTINCT FROM b;
```

## Debugging

25. A developer writes:

```sql
SELECT *
FROM orders o1
JOIN orders o2 ON o1.customer_id = o2.customer_id
WHERE o1.status <> o2.status;
```

They report that orders where both `status` values are NULL are not appearing in results. Diagnose the problem and provide a fix.

26. A query uses `COALESCE(department, 'UNKNOWN') <> 'UNKNOWN'` to find rows where department is not 'UNKNOWN'. What happens when `department` is actually the string `'UNKNOWN'` versus when it is NULL? How does `IS DISTINCT FROM` solve this?

## Performance

27. Under what conditions might `IS DISTINCT FROM` prevent index usage on the compared column? How would you verify this?

28. You have a query with `WHERE col IS DISTINCT FROM 'value'` on a table with 10 million rows. The column has an index. Would you expect an index scan or a full table scan? What factors determine this?

29. Compare the performance characteristics of these two approaches for finding changed rows:

```sql
-- Approach A
SELECT * FROM t WHERE a IS DISTINCT FROM b;

-- Approach B
SELECT * FROM t WHERE (a <> b OR (a IS NULL AND b IS NOT NULL) OR (a IS NOT NULL AND b IS NULL));
```

What should you check with `EXPLAIN ANALYZE` to determine which is faster?
