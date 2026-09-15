# NOT IN + NULL Pitfalls

## What This Section Covers

`NOT IN` is one of the most dangerous operators in SQL when combined with `NULL`. A single `NULL` in the comparison list can silently eliminate **all rows** from your result set. This section explains exactly why, how to detect it, and how to avoid it.

---

## The Core Problem

`NOT IN` expands to a series of `AND <>` comparisons against every value in the list. If any value in the list is `NULL`, the result becomes unknown due to **three-valued logic** (see [NULL and Three-Valued Logic](../1-NULL-Fundamentals/)), and every row is filtered out.

### Internal Expansion

```sql
-- What the optimizer conceptually does:
col NOT IN (v1, v2, v3)
-- expands to:
col <> v1 AND col <> v2 AND col <> v3
```

If `v2` is `NULL`:

```
col <> v1  → TRUE  (say)
col <> NULL → UNKNOWN
col <> v3  → TRUE  (say)

TRUE AND UNKNOWN AND TRUE → UNKNOWN → row is filtered out
```

> Production pitfall: The query returns **zero rows** instead of the expected result. No error is raised. This is a silent bug that can corrupt reports, break ETL pipelines, and cause data loss in production systems.

---

## Sample Tables

### employees

| employee_id | name        | department_id | salary |
|-------------|-------------|---------------|--------|
| 1           | Alice       | 10            | 90000  |
| 2           | Bob         | 20            | 85000  |
| 3           | Carol       | NULL          | 72000  |
| 4           | Dave        | 10            | 88000  |
| 5           | Eve         | 30            | 95000  |

**Grain:** One row per employee.

### departments

| department_id | department_name |
|---------------|-----------------|
| 10            | Engineering     |
| 20            | Marketing       |
| NULL          | Unassigned      |

**Grain:** One row per department.

---

## Demonstration of the Pitfall

### Query that returns unexpected empty results

```sql
SELECT employee_id, name
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
);
```

### Expected result (intuition)

We expect employees whose `department_id` is not in the departments list. Department `30` is not in `departments`, so we might expect employee 5 (Eve, department 30).

### Actual result

| employee_id | name |
|-------------|------|
| _(empty)_   |      |

**Zero rows.** The query silently returns nothing.

### Why

The subquery returns `(10, 20, NULL)`. The expansion becomes:

```sql
WHERE department_id <> 10
  AND department_id <> 20
  AND department_id <> NULL  -- always UNKNOWN
```

Any `TRUE AND UNKNOWN` evaluates to `UNKNOWN`, so every row is rejected.

---

## Fix 1: Use `IS NOT DISTINCT FROM` (ANSI SQL)

```sql
-- Works in PostgreSQL, MySQL 8.0+, and others supporting ANSI
SELECT employee_id, name
FROM employees
WHERE department_id IS NOT DISTINCT FROM ALL (
    SELECT department_id
    FROM departments
    WHERE department_id IS NOT NULL  -- exclude NULL explicitly
);
```

## Fix 2: Filter NULLs in the Subquery

```sql
SELECT employee_id, name
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
    WHERE department_id IS NOT NULL
);
```

### Result

| employee_id | name |
|-------------|------|
| 5           | Eve  |

Only Eve has a `department_id` (30) that is genuinely not in the departments table.

## Fix 3: Use `NOT EXISTS` Instead

```sql
SELECT e.employee_id, e.name
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.department_id = e.department_id
);
```

### Result

| employee_id | name |
|-------------|------|
| 5           | Eve  |
| 3           | Carol |

Notice Carol appears here because `NULL = NULL` is `UNKNOWN` (not `TRUE`), so the correlated subquery never matches her, and she is included in `NOT EXISTS`. This is the correct ANSI behavior: Carol's department is not "in" the departments list.

### Handling NULLs with `NOT EXISTS` and explicit NULL matching

```sql
-- If you also want to exclude employees whose department_id IS NULL
-- (because NULL is not a real department)
SELECT e.employee_id, e.name
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM departments d
    WHERE d.department_id = e.department_id
)
AND e.department_id IS NOT NULL;
```

### Result

| employee_id | name |
|-------------|------|
| 5           | Eve  |

---

## NULL Behavior Deep Dive

### Truth table for `col NOT IN (v1, NULL)`

| col value | col <> v1 | col <> NULL | col NOT IN (v1, NULL) |
|-----------|-----------|-------------|----------------------|
| v1        | FALSE     | UNKNOWN     | FALSE                |
| other     | TRUE      | UNKNOWN     | UNKNOWN (row removed)|
| NULL      | UNKNOWN   | UNKNOWN     | UNKNOWN (row removed)|

**Every row is eliminated** regardless of its value.

### `NOT IN` vs `NOT EXISTS` — NULL handling

| Scenario | `NOT IN` with NULL in list | `NOT EXISTS` |
|----------|---------------------------|--------------|
| Matching row exists | FALSE | FALSE |
| No matching row, no NULLs in source | TRUE | TRUE |
| No matching row, NULLs exist in source | **UNKNOWN (filtered out)** | **TRUE (included)** |
| Row value is NULL | **UNKNOWN (filtered out)** | **TRUE (included)** |

---

## Scenario-Based Examples

### Scenario 1: Find customers who have never placed an order

**customers**

| customer_id | name    |
|-------------|---------|
| 1           | Alice   |
| 2           | Bob     |
| 3           | Carol   |

**orders**

| order_id | customer_id | amount |
|----------|-------------|--------|
| 101      | 1           | 500    |
| 102      | NULL        | 300    |

#### BAD APPROACH

```sql
SELECT c.customer_id, c.name
FROM customers c
WHERE c.customer_id NOT IN (
    SELECT customer_id
    FROM orders
);
```

**Result:** Empty set. The `NULL` customer_id in orders poisons the entire query.

#### BETTER APPROACH

```sql
SELECT c.customer_id, c.name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
);
```

**Result:**

| customer_id | name  |
|-------------|-------|
| 2           | Bob   |
| 3           | Carol |

Both Bob and Carol have no orders. Carol is correctly included because no row in `orders` matches her `customer_id` via equality (`3 = NULL` → UNKNOWN).

### Scenario 2: Products not in any active category

**products**

| product_id | name   | category_id |
|------------|--------|-------------|
| 1          | Widget | 100         |
| 2          | Gadget | NULL        |
| 3          | Doohic | 300         |

**active_categories**

| category_id |
|-------------|
| 100         |
| 200         |
| NULL        |

#### BAD APPROACH

```sql
SELECT product_id, name
FROM products
WHERE category_id NOT IN (
    SELECT category_id
    FROM active_categories
);
```

**Result:** Empty set.

#### BETTER APPROACH

```sql
SELECT p.product_id, p.name
FROM products p
WHERE p.category_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM active_categories ac
      WHERE ac.category_id = p.category_id
  );
```

**Result:**

| product_id | name   |
|------------|--------|
| 3          | Doohic |

Widget (100) is in `active_categories`. Gadget has `NULL` category_id, explicitly excluded. Doohic (300) is not in any active category.

### Scenario 3: Multi-column NOT IN

```sql
-- Find employees not assigned to any project
SELECT employee_id, name
FROM employees
WHERE (department_id, salary) NOT IN (
    SELECT department_id, salary
    FROM assignments
);
```

If **either** column in the subquery contains `NULL`, the entire result is empty. This is especially dangerous because `assignments` might have `NULL` in either column without you realizing it.

#### BETTER APPROACH

```sql
SELECT e.employee_id, e.name
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM assignments a
    WHERE a.department_id IS NOT DISTINCT FROM e.department_id
      AND a.salary IS NOT DISTINCT FROM e.salary
);
```

---

## Edge Cases

### Edge Case 1: Empty subquery

```sql
SELECT * FROM employees
WHERE department_id NOT IN (SELECT department_id FROM departments WHERE 1=0);
```

Returns **all rows** when the subquery returns an empty set. This is correct SQL behavior — `NOT IN ()` with an empty list is vacuously true. This can be confusing when combined with dynamic filters.

### Edge Case 2: Subquery returns only NULLs

```sql
-- departments table has only NULL department_ids
SELECT * FROM employees
WHERE department_id NOT IN (
    SELECT department_id FROM departments WHERE department_id IS NULL
);
```

**Result:** Empty set. Every value in the list is `NULL`, so every comparison is `UNKNOWN`.

### Edge Case 3: NULL in the left-hand column

```sql
-- What if employee.department_id is NULL?
SELECT * FROM employees
WHERE department_id NOT IN (10, 20);
```

Carol (department_id = NULL) — `NULL NOT IN (10, 20)` evaluates to `UNKNOWN`. Carol is **excluded**. Many developers expect her to be included.

### Edge Case 4: NULL with multiple NOT IN clauses

```sql
SELECT * FROM employees
WHERE department_id NOT IN (SELECT department_id FROM departments)
  AND location_id NOT IN (SELECT location_id FROM offices);
```

If **either** subquery contains a `NULL`, the entire `WHERE` clause evaluates to `UNKNOWN` for all rows. The second `NOT IN` is irrelevant if the first already poisons the result.

---

## Common Mistakes

| # | Mistake | Why it fails |
|---|---------|-------------|
| 1 | Assuming `NOT IN` ignores NULLs | It doesn't. `NULL` in the list poisons the entire result. |
| 2 | Using `NOT IN` on a column that may contain NULLs | Even if the left side is NULL, `NULL NOT IN (...)` → UNKNOWN. |
| 3 | Forgetting that `NOT IN` with empty list returns all rows | Can cause unexpected data duplication in batch operations. |
| 4 | Using `NOT IN` in a `DELETE` or `UPDATE` | Silently deletes/updates fewer (or zero) rows than expected. |
| 5 | Using `NOT IN` on multi-column comparisons | NULL in **any** column of the subquery poisons the result. |
| 6 | Not checking subquery results for NULLs before using `NOT IN` | Always verify `SELECT COUNT(*) WHERE col IS NULL FROM ...`. |

---

## Production Pitfalls

> Production pitfall: Using `NOT IN` against a query that might produce NULLs from a LEFT JOIN

```sql
-- Common pattern that introduces NULLs
SELECT *
FROM products
WHERE product_id NOT IN (
    SELECT p.product_id
    FROM products p
    LEFT JOIN promotions pr ON p.product_id = pr.product_id
    -- pr.promotion_id is NULL for unmatched rows
);
```

The `LEFT JOIN` can produce `NULL` in the subquery result if `promotions` doesn't match. Use `WHERE pr.promotion_id IS NOT NULL` or switch to `NOT EXISTS`.

> Production pitfall: `NOT IN` in ETL pipeline WHERE clauses

```sql
-- This DELETE might silently delete nothing
DELETE FROM staging
WHERE record_id NOT IN (
    SELECT record_id FROM production
);
```

If `production.record_id` contains NULLs, the DELETE does nothing. Data remains stale in staging.

> Production pitfall: Temporal data with NULLs

```sql
SELECT *
FROM events
WHERE event_id NOT IN (
    SELECT event_id FROM archived_events
);
```

If `archived_events` has NULL event_ids (e.g., from a failed merge), no events are found even when they should be.

---

## Performance Implications

| Factor | `NOT IN` | `NOT EXISTS` | `LEFT JOIN ... IS NULL` |
|--------|----------|--------------|------------------------|
| NULL handling | Dangerous | Safe | Safe |
| Optimizer rewriting | Many optimizers rewrite to anti-join | Many optimizers rewrite to anti-join | Optimized as anti-join |
| Index usage | Depends on optimizer | Depends on optimizer | Depends on optimizer |
| Readability | Simple | Slightly more verbose | Most verbose |

> Important: Performance depends on optimizer, indexes, statistics, cardinality, data distribution, query shape, and the database engine. Always verify with `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL), or `EXPLAIN` (SQL Server).

### What to verify with execution plans

1. Is the optimizer performing an **anti-join** or a **nested loop**?
2. Is an index available on the join/filter column?
3. What is the estimated vs actual row count?
4. Are there any **table scans** when an index seek would be better?

### Keyset-based NOT IN alternative for large datasets

For very large datasets, consider a `LEFT JOIN ... IS NULL` pattern which can sometimes produce a more efficient plan:

```sql
SELECT e.employee_id, e.name
FROM employees e
LEFT JOIN departments d ON d.department_id = e.department_id
WHERE d.department_id IS NULL;
```

---

## Comparison: `NOT IN` vs `NOT EXISTS` vs `LEFT JOIN ... IS NULL`

| Aspect | `NOT IN` | `NOT EXISTS` | `LEFT JOIN ... IS NULL` |
|--------|----------|--------------|------------------------|
| NULL-safe | No | Yes | Yes |
| Subquery type | Scalar list | Correlated | Correlated |
| Handles empty subquery | Returns all rows | Returns all rows | Returns all rows |
| NULL on left side | Excluded | Included | Included |
| NULL in subquery | Poisons result | Safe | Safe |
| Multi-column support | Limited | Full | Full |
| ANSI standard | Yes | Yes | Yes |

---

## `NOT IN` vs `NOT EXISTS` Behavior Summary

| employee.department_id | departments has matching row? | `NOT IN (subquery)` | `NOT EXISTS (subquery)` |
|------------------------|-------------------------------|---------------------|------------------------|
| 10                     | Yes                           | FALSE               | FALSE                  |
| 20                     | Yes                           | FALSE               | FALSE                  |
| 30                     | No (but NULLs in subquery)    | **UNKNOWN** (excluded) | **TRUE** (included)  |
| NULL                   | No                            | **UNKNOWN** (excluded) | **TRUE** (included)  |

---

## Database-Specific Notes

> PostgreSQL: `NOT IN` with NULLs behaves as described. Use `IS NOT DISTINCT FROM` for NULL-safe comparisons. PostgreSQL's optimizer often converts `NOT EXISTS` and `NOT IN` to anti-joins.

> MySQL: Same NULL behavior. `NOT EXISTS` is generally preferred. MySQL 8.0 supports `IS NOT DISTINCT FROM`.

> SQL Server: Same NULL behavior. SQL Server's optimizer frequently rewrites `NOT IN` (with `IS NOT NULL` filter) to an anti-join. Without the NULL filter, it may perform poorly or produce wrong results.

> Oracle: Same NULL behavior. Oracle's optimizer can rewrite both `NOT IN` and `NOT EXISTS` to anti-joins, but `NOT IN` with NULLs in the subquery still produces an empty result.

---

## Best Practices

1. **Never use `NOT IN`** when the subquery **might** contain NULLs. This includes any query that uses `LEFT JOIN`, `UNION`, or where the column is nullable.
2. **Use `NOT EXISTS`** as the default anti-semi-join pattern. It is NULL-safe and readable.
3. **Use `LEFT JOIN ... IS NULL`** when you need to filter on multiple columns or when the optimizer produces a better plan with this pattern (verify with `EXPLAIN ANALYZE`).
4. **If you must use `NOT IN`**, add `WHERE col IS NOT NULL` to the subquery. Document this explicitly in code reviews.
5. **Audit existing queries** for `NOT IN` usage against nullable columns. Search for `NOT IN (SELECT` patterns.
6. **Add NULL checks** to subqueries as a defensive practice: `WHERE column IS NOT NULL`.
7. **Test with NULL data** in staging environments before deploying queries to production.

---

# Interview Questions

## Beginner

1. Why does `NOT IN (1, 2, NULL)` filter out every row?
2. What is the difference between `col NOT IN (1, 2, 3)` and `col <> 1 AND col <> 2 AND col <> 3`?
3. Write a query that correctly finds employees not in a list of departments, even if the department list contains NULLs.

## Intermediate

4. Given a `products` table with a nullable `category_id`, explain why this query returns zero rows:

   ```sql
   SELECT * FROM products
   WHERE category_id NOT IN (
       SELECT id FROM categories
   );
   ```

5. Rewrite the above query using `NOT EXISTS` to produce the correct result.
6. What is the difference in how `NOT IN` and `NOT EXISTS` handle a NULL value in the left-hand column?
7. Under what conditions is `NOT IN` safe to use?

## Advanced

8. Explain the internal expansion of `NOT IN` with three values and one NULL. Draw the truth table.
9. A multi-column `NOT IN` is used: `(col1, col2) NOT IN (SELECT col1, col2 FROM t)`. Explain why NULL in **either** column of the subquery poisons the result.
10. Compare the execution plans for `NOT IN`, `NOT EXISTS`, and `LEFT JOIN ... IS NULL` on a table with 10 million rows. What would you look for in each plan?

## Scenario Based

11. You are building a data pipeline that identifies customers who have never made a purchase. The `purchases` table sometimes has NULL in the `customer_id` column due to a legacy migration bug. Write a safe query and explain your choices.
12. A manager asks you to find employees who are not assigned to any project. The assignment table uses a composite key `(employee_id, project_id)` and either column can be NULL. Write a safe query.
13. You receive a report that a nightly ETL job that uses `NOT IN` has been returning zero rows for the past three days, but the data looks correct when queried manually with `NOT EXISTS`. What happened and how do you fix it?

## Tricky

14. What does this return?

    ```sql
    SELECT * FROM (VALUES (1), (2), (3)) AS t(val)
    WHERE val NOT IN (1, NULL);
    ```

15. What does this return?

    ```sql
    SELECT * FROM (VALUES (1), (2), (3)) AS t(val)
    WHERE val NOT IN ();
    ```

16. Explain why `NULL NOT IN (1, 2, 3)` is `UNKNOWN` but `NULL NOT IN (SELECT x FROM empty_table)` is `TRUE`.

## Output Prediction

17. Given:

    | id | region |
    |----|--------|
    | 1  | East   |
    | 2  | West   |
    | 3  | NULL   |

    And:

    | region |
    |--------|
    | East   |
    | NULL   |

    Predict the output of:

    ```sql
    SELECT * FROM sales
    WHERE region NOT IN (SELECT region FROM active_regions);
    ```

18. Predict the output of:

    ```sql
    SELECT * FROM sales
    WHERE region NOT IN (SELECT region FROM active_regions WHERE region IS NOT NULL);
    ```

## Debugging

19. A developer shows you this query that returns empty:

    ```sql
    SELECT o.order_id
    FROM orders o
    WHERE o.customer_id NOT IN (
        SELECT c.customer_id
        FROM customers c
        LEFT JOIN blacklists b ON c.customer_id = b.customer_id
    );
    ```

    Identify the bug, explain the fix, and write the corrected query.

20. A junior developer says: "I added `WHERE customer_id IS NOT NULL` to the subquery but the query still returns unexpected results." What could be going wrong?

## Performance

21. On a table with 50 million rows, `NOT IN` with a subquery of 10,000 values runs in 45 seconds while `NOT EXISTS` runs in 2 seconds. Explain what might cause this difference and what you would verify in the execution plans.
22. You need to find orders that are not in the `shipped_orders` table. The `shipped_orders` table has 100 million rows and is indexed on `order_id`. Which pattern would you test first, and why? How would you confirm your choice?
