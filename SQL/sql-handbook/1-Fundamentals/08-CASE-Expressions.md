Generated `sql-handbook/1-Fundamentals/08-CASE-Expressions.md` (998 lines). Covers:

- **Fundamentals**: searched vs simple CASE, syntax, internal evaluation order, output tables
- **Clause usage**: SELECT, WHERE, ORDER BY (custom sort), GROUP BY, HAVING, ON
- **NULL behavior**: full table + the simple-CASE `WHEN NULL` trap, `COUNT(CASE ...)` semantics
- **Patterns**: categorization, conditional aggregation, pivoting, safe division, custom ordering, audit/validation, nested CASE
- **Database differences**: PostgreSQL, MySQL (`IF()`), SQL Server (`IIF`), Oracle (`DECODE` NULL-equality trap)
- **Mistakes / pitfalls / performance**: no absolute claims, all verified via `EXPLAIN ANALYZE`; BAD vs BETTER approaches with rationales
- **50 interview questions** across Beginner / Intermediate / Advanced / Scenario / Tricky / Output-Prediction / Debugging / Performance
  ion)

14. [CASE for Custom Ordering](#case-for-custom-ordering)
15. [CASE for Validation / Checklist Queries](#case-for-validation--checklist-queries)
16. [Nested CASE](#nested-case)
17. [CASE Across Databases: PostgreSQL, MySQL, SQL Server, Oracle](#case-across-databases-postgresql-mysql-sql-server-oracle)
18. [Common Mistakes](#common-mistakes)
19. [Production Pitfalls](#production-pitfalls)
20. [Performance Implications](#performance-implications)
21. [BAD vs BETTER Approaches](#bad-vs-better-approaches)
22. [Best Practices](#best-practices)
23. [Interview Questions](#interview-questions)

---

## What This Section Covers

`CASE` is SQL's **conditional expression** — the closest thing SQL has to an `if / else if / else` statement in other programming languages. It lets you evaluate a condition and return different values depending on the outcome, all _within a single SQL statement_.

Unlike imperative `if` statements, `CASE` is **an expression**: it always produces exactly one value, and it can appear almost anywhere an expression is allowed — `SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`, `HAVING`, `ON`, and even inside aggregate functions.

> **Grain reminder:** `CASE` never changes the _number of rows_ a query returns by itself. It transforms values _within_ each row. When you combine `CASE` with aggregates, the grain you asked about comes from the aggregate, not the `CASE`.

---

## What Is a CASE Expression

`CASE` evaluates conditions in order and returns the value from the **first** condition that is true. If no condition matches, it returns the value in the `ELSE` clause (or `NULL` if `ELSE` is omitted).

Three core facts you must internalize:

| Fact                                 | Detail                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| It is an expression, not a statement | It returns a single value. It cannot execute multiple actions like a flow-control block. |
| It evaluates in document order       | Conditions are checked **top-to-bottom**. The first `WHEN` that is true wins.            |
| It stops at the first match          | Once a `WHEN` matches, later `WHEN` clauses are not evaluated.                           |

---

## The Two Forms: Searched CASE vs Simple CASE

| Aspect         | Searched CASE                                                             | Simple CASE                                                     |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Syntax         | `CASE WHEN <condition> THEN <expr> ...`                                   | `CASE <expr> WHEN <value> THEN <expr> ...`                      |
| Condition      | Any boolean expression (comparisons, `LIKE`, `IN`, subqueries, etc.)      | Equality comparison `=` only                                    |
| Flexibility    | Works with ranges, `NULL`, complex logic, function calls in the condition | Only tests whether an expression equals a literal or expression |
| NULL handling  | You explicitly write `IS NULL`                                            | `WHEN NULL` never matches (see [NULL Behavior](#null-behavior)) |
| When to prefer | Almost always                                                             | Only when matching simple known values                          |

> **Interview trap:** Many candidates reach for the simple form and write `CASE status WHEN NULL THEN ...` expecting it to work. It won't — a simple `CASE` compares with `=`, and `x = NULL` is `NULL` (unknown), never `TRUE`. You must use the searched form (`WHEN status IS NULL`) or `CASE NULL WHEN ...` techniques described later.

---

## Syntax

### Searched CASE

```sql
CASE
    WHEN condition1 THEN result1
    WHEN condition2 THEN result2
    ...
    [ELSE result_default]
END
```

### Simple CASE

```sql
CASE expression
    WHEN value1 THEN result1
    WHEN value2 THEN result2
    ...
    [ELSE result_default]
END
```

### Rules

1. `CASE` and `END` are mandatory.
2. At least one `WHEN ... THEN` is required.
3. `ELSE` is optional. If omitted and nothing matches, the result is `NULL`.
4. All result expressions must have **compatible data types** (the database will try to coerce them to a common type).
5. You can use an `ELSE` as a "catch-all" to handle the default case explicitly.

---

## Internal Working

1. The database evaluates `WHEN` conditions **in order**, stopping at the first one that evaluates to `TRUE`.
2. For simple (expression) form, each `WHEN` value is compared to the `CASE` expression with `=`. If the comparison evaluates to `UNKNOWN` because of `NULL`, that `WHEN` is treated as **not matching**.
3. The `THEN` value corresponding to the first match is returned.
4. If no `WHEN` matched, the `ELSE` value is returned. If no `ELSE`, the result is `NULL`.
5. Any `WHEN` condition that evaluates to `FALSE` **or `UNKNOWN`** is skipped — the search simply continues.

The evaluation order is important: conditions are tried **in the order written**, not in any optimized order. This means:

- The first `WHEN` that matches decides the result, even if later conditions also would match.
- Ordering can change the result. `WHEN salary > 100000 THEN 'High'` must come **before** `WHEN salary > 50000 THEN 'Medium'`, or it will never match.

---

## Sample Tables

All examples in this section use the following tables unless stated otherwise.

### orders

| order_id | customer_id | status    | total  | order_date |
| -------- | ----------- | --------- | ------ | ---------- |
| 1001     | 1           | shipped   | 120.50 | 2024-01-05 |
| 1002     | 2           | pending   | 45.00  | 2024-01-07 |
| 1003     | 1           | delivered | 310.00 | 2024-01-12 |
| 1004     | 3           | cancelled | 89.99  | 2024-01-15 |
| 1005     | 2           | pending   | NULL   | 2024-02-01 |
| 1006     | 4           | returned  | 200.00 | 2024-02-09 |
| 1007     | 5           | shipped   | 75.25  | 2024-02-14 |
| 1008     | 2           | NULL      | 40.00  | 2024-03-01 |

**Grain:** One row = one order. `status` may be `NULL` if the order has not been assigned a status yet. `total` may be `NULL` if the invoice has not been finalized.

### employees

| id  | name    | department_id | salary | performance_rating | leave_days_used |
| --- | ------- | ------------- | ------ | ------------------ | --------------- |
| 1   | Alice   | 1             | 95000  | 5                  | 12              |
| 2   | Bob     | 1             | 72000  | 3                  | 25              |
| 3   | Charlie | 2             | 88000  | 4                  | 8               |
| 4   | Diana   | 2             | 67000  | NULL               | 30              |
| 5   | Eve     | 3             | 110000 | 5                  | 15              |
| 6   | Frank   | NULL          | 55000  | 2                  | 6               |

**Grain:** One row = one employee. `performance_rating` may be `NULL` (no review yet). `department_id` may be `NULL` (not assigned).

---

## Fundamental Examples

### Example 1 — Leveling a numeric column

```sql
SELECT
    order_id,
    total,
    CASE
        WHEN total < 100 THEN 'small'
        WHEN total < 300 THEN 'medium'
        ELSE 'large'
    END AS order_size
FROM orders
ORDER BY order_id;
```

**Expected result (note the `NULL` total):**

| order_id | total  | order_size |
| -------- | ------ | ---------- |
| 1001     | 120.50 | medium     |
| 1002     | 45.00  | small      |
| 1003     | 310.00 | large      |
| 1004     | 89.99  | small      |
| 1005     | NULL   | NULL       |
| 1006     | 200.00 | medium     |
| 1007     | 75.25  | small      |
| 1008     | 40.00  | small      |

**Why the `NULL` row returned `NULL`:** `total < 100` with `total = NULL` evaluates to `UNKNOWN`, not `TRUE` or `FALSE`. The first two `WHEN`s are skipped, and with no `ELSE`, the expression falls through to `NULL`.

> **Common misconception:** "NULL falls into the ELSE." It does not — `ELSE` is only reached after no `WHEN` _matched_. A `NULL` comparison produces `UNKNOWN`, which is treated as _not matched_, and if there is no `ELSE`, the result is `NULL`. If you want `NULL` to get a bucket, write the condition explicitly: `WHEN total IS NULL THEN 'unknown'`.

### Example 2 — Mapping known values (simple CASE)

```sql
SELECT
    order_id,
    CASE status
        WHEN 'pending'   THEN 'U'
        WHEN 'shipped'   THEN 'S'
        WHEN 'delivered' THEN 'D'
        ELSE 'CLOSED'
    END AS status_code
FROM orders
ORDER BY order_id;
```

**Expected result (order 1008 has `status = NULL`):**

| order_id | status    | status_code |
| -------- | --------- | ----------- |
| 1001     | shipped   | S           |
| 1002     | pending   | U           |
| 1003     | delivered | D           |
| 1004     | cancelled | CLOSED      |
| 1005     | pending   | U           |
| 1006     | returned  | CLOSED      |
| 1007     | shipped   | S           |
| 1008     | NULL      | CLOSED      |

> **Notice:** Order 1008's `NULL` status lands in `ELSE`, because `NULL = 'pending'` is `UNKNOWN` (skipped), `NULL = 'shipped'` is `UNKNOWN` (skipped), and so on until `ELSE` catches it. This is the opposite of the searched-form behavior above — here `ELSE` IS where `NULL` goes, precisely because no simple `WHEN` can match `NULL`. Keep the two forms straight; this is a classic interview trap.

---

## CASE in Different Clauses

`CASE` is an expression, so it can live wherever expressions are allowed. This is one of its greatest powers — and one of the most common sources of confusion.

### 1. In SELECT — transform output (most common)

```sql
SELECT name, salary,
       CASE WHEN salary >= 100000 THEN 'executive'
            ELSE 'staff' END AS grade
FROM employees;
```

### 2. In WHERE — conditional filtering

```sql
SELECT order_id, total
FROM orders
WHERE (CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) = 0;
```

> This works but is **verbose and usually unhelpful** in `WHERE`. The same result is far cleaner with plain boolean logic: `WHERE status <> 'cancelled' OR status IS NULL`. Prefer the direct predicate. See [BAD vs BETTER approaches](#bad-vs-better-approaches).

### 3. In ORDER BY — custom sort order

Put any status into a deliberate sequence:

```sql
SELECT order_id, status
FROM orders
ORDER BY
    CASE status
        WHEN 'pending'   THEN 1
        WHEN 'shipped'   THEN 2
        WHEN 'delivered' THEN 3
        ELSE 4
    END;
```

**Result ordering:** `pending` first, then `shipped`, then `delivered`, then everything else (including `NULL` statuses, since `NULL` also hits `ELSE`), each bucket ordered by the natural `order_id` within it.

You can even sort **numerically but with special cases first**, a very common request:

```sql
SELECT order_id, total
FROM orders
ORDER BY
    CASE WHEN order_id = 1004 THEN 0 ELSE 1 END,  -- pin a row to the top
    total;
```

### 4. In GROUP BY — group by a computed bucket

```sql
SELECT
    CASE WHEN total < 100 THEN 'small'
         WHEN total < 300 THEN 'medium'
         ELSE 'large' END AS bucket,
    COUNT(*) AS orders
FROM orders
GROUP BY 1;
```

Here `GROUP BY 1` refers to the first select-list expression (the `CASE`), so grouping happens on the computed bucket, not on any column. This is legal in PostgreSQL, MySQL, SQL Server, and Oracle (Oracle reads the positional reference as the same expression).

> **Production pitfall:** Grouping by a `CASE` expression forces the database to compute the expression for every row and group by its result — it cannot use a plain index on `total` for the grouping. Buckets with a high number of distinct values produce a large number of groups and a costly sort/hash. If you query by buckets often, consider a **generated/computed column** or an indexed category column instead (see [Performance Implications](#performance-implications)).

### 5. In HAVING — filter on conditional aggregates

```sql
SELECT customer_id,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count
FROM orders
GROUP BY customer_id
HAVING SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) > 1;
```

**Expected result:**

| customer_id | pending_count |
| ----------- | ------------- |
| 2           | 2             |

Customer 2 has two orders with status `pending` (orders 1002 and 1005).

### 6. In ON — conditional join logic

```sql
SELECT e.name, d.name AS department
FROM employees e
LEFT JOIN departments d
    ON e.department_id = d.id
   AND (CASE WHEN d.budget < 350000 THEN 1 ELSE 0 END) = 1;
```

> When to put a condition in `ON` vs `WHERE` is subtle — putting it in `ON` preserves rows from the left table even when the join clause fails (it only controls _matching_), while putting it in `WHERE` filters after the join and can convert a `LEFT JOIN` into an inner join. `CASE` in `ON` is rare; prefer plain boolean predicates in `ON`. Cross-reference the JOIN section of this handbook.

---

## NULL Behavior

`CASE` interacts with `NULL` in specific, predictable ways:

| Situation                                           | Result                         | Reason                                                    |
| --------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| Arithmetic/expression in a `WHEN` encounters `NULL` | `UNKNOWN` → `WHEN` skipped     | Three-valued logic: comparisons with `NULL` are `UNKNOWN` |
| Simple form: `CASE x WHEN NULL THEN ...`            | Never matches                  | It translates to `x = NULL`, which is `UNKNOWN`           |
| No `WHEN` matches and no `ELSE`                     | Returns `NULL`                 | Fall-through result                                       |
| `THEN NULL` explicitly written                      | Returns `NULL` for that branch | Explicit                                                  |
| `ELSE NULL`                                         | Same as omitting `ELSE`        | `ELSE NULL` is the default                                |
| `WHEN x IS NULL THEN 'unknown'`                     | Matches                        | Uses `IS NULL`, not `=`                                   |

### Making NULL bucketing explicit (the searched form)

```sql
SELECT
    order_id,
    CASE
        WHEN total IS NULL      THEN 'unknown'
        WHEN total < 100        THEN 'small'
        WHEN total BETWEEN 100 AND 299 THEN 'medium'
        ELSE 'large'
    END AS order_size
FROM orders
ORDER BY order_id;
```

| order_id | total  | order_size |
| -------- | ------ | ---------- |
| 1001     | 120.50 | medium     |
| 1002     | 45.00  | small      |
| 1003     | 310.00 | large      |
| 1004     | 89.99  | small      |
| 1005     | NULL   | unknown    |
| 1006     | 200.00 | medium     |
| 1007     | 75.25  | small      |
| 1008     | 40.00  | small      |

---

## CASE for Data Transformation / Categorization

`CASE` is the standard tool for bucketing continuous values, mapping codes to labels, and building human-readable output.

```sql
SELECT
    name,
    CASE
        WHEN leave_days_used >= 25 THEN 'high_leave'
        WHEN leave_days_used >= 10 THEN 'moderate_leave'
        WHEN leave_days_used >= 0  THEN 'low_leave'
        ELSE 'unknown'
    END AS leave_profile
FROM employees;
```

**Expected result:**

| name    | leave_profile  |
| ------- | -------------- | ------------------------------------- |
| Alice   | moderate_leave |
| Bob     | high_leave     |
| Charlie | moderate_leave |
| Diana   | high_leave     | -- leave_days_used = 30, no NULL here |
| Eve     | moderate_leave |
| Frank   | low_leave      |

> Range conditions must be written so the boundaries do not overlap in meaning. `>= 25` comes before `>= 10` because evaluation is top-to-bottom — the first match wins. Writing them in the reverse order would never produce `'high_leave'`.

---

## CASE with Aggregate Functions

`CASE` inside an aggregate is the single most powerful pattern in this section. It lets you **count, sum, or average conditionally** in one pass over the rows.

### Conditionally counting

Both of these count only pending orders:

```sql
SELECT
    COUNT(CASE WHEN status = 'pending' THEN 1 END)  AS pending_count,
    COUNT(*)                                        AS total_count
FROM orders;
```

| pending_count | total_count |
| ------------- | ----------- |
| 2             | 8           |

**Why `COUNT(CASE ... END)` counts only matches:** `COUNT(<expression>)` counts **non-NULL** values. A non-matching row produces `NULL` (no `ELSE`, no `THEN` fires), so it is not counted. A matching row produces `1`, which is counted.

> **Common misconception:** `COUNT(1)` is somehow "faster than `COUNT(*)`." Modern engines treat them the same. Similarly, `COUNT(CASE ... )` is correct and idiomatic — the database counts the non-NULL results.

### Conditionally summing

```sql
SELECT
    SUM(CASE WHEN status != 'cancelled' THEN total END) AS active_revenue,
    SUM(total)                                          AS gross_revenue
FROM orders;
```

**Why `active_revenue` skips the cancelled order:** order 1004 (`total = 89.99`) does not match, produces `NULL`, and `SUM` ignores `NULL` while `total` = NULL order is also ignored by both sums.

### Counting correctly when the NULL leaks in

The pattern `COUNT(CASE WHEN cond THEN 1 ELSE NULL END)` counts matches, but what about `COUNT(CASE WHEN cond THEN 0 ELSE 1 END)`? That counts **rows where `cond` produced a value at all** — both 0 and 1 are non-NULL, so nothing is truly filtered. Get the semantics right:

| Expression                             | What it counts                   |
| -------------------------------------- | -------------------------------- |
| `COUNT(CASE WHEN c THEN 1 END)`        | rows where `c` is true           |
| `COUNT(CASE WHEN c THEN 1 ELSE 0 END)` | **all** rows (0 is non-NULL too) |
| `COUNT(CASE WHEN c THEN NULL END)`     | 0 (NULL is not counted)          |
| `SUM(CASE WHEN c THEN 1 ELSE 0 END)`   | rows where `c` is true           |
| `AVG(CASE WHEN c THEN amount END)`     | average over matching rows only  |

> **Interview trap:** `COUNT(CASE WHEN cond THEN 1 ELSE 0 END)` returns the total row count, not the matched count — because `COUNT` stops at the first non-NULL value _for each row_. Many people trip on this. If you want a count, think "then 1, else nothing." If you want a sum, `then 1 else 0` is fine.

---

## CASE to Fix NULL and Division Problems

### Division by zero

```sql
SELECT
    order_id,
    total / NULLIF(total * 0, 0) AS normalized  -- contrived; real division-by-zero guard:
    -- total / NULLIF(divisor, 0)
FROM orders;
```

The idiomatic "safe division" combines `NULLIF` and `COALESCE`:

```sql
SELECT
    product_id,
    revenue,
    COALESCE(revenue / NULLIF(orders_count, 0), 0) AS avg_revenue_per_order
FROM sales_summary;
```

`NULLIF(orders_count, 0)` turns a `0` divisor into `NULL`, division yields `NULL`, and `COALESCE(..., 0)` supplies a sensible default. A `CASE` does the same job more verbosely:

```sql
CASE
    WHEN orders_count = 0 THEN 0
    ELSE revenue / orders_count
END
```

Both produce identical results for `orders_count = 0`. `NULLIF`/`COALESCE` is shorter; `CASE` reads more obviously. Choose by team style.

### Preserving NULL semantics during transformation

One reason `CASE` is preferred over arithmetic shortcuts: it lets you keep `NULL` distinct from a computed value.

```sql
SELECT
    total,
    CASE WHEN total IS NULL THEN 'no invoice'
         ELSE TO_CHAR(total, 'FM$999.00') END AS invoice_label
FROM orders;
```

---

## CASE for Pivoting (Conditional Aggregation)

"Crosstabulation" or "pivoting" turns rows into columns by summing counts conditionally. `CASE` inside `SUM`/`COUNT` is the portable, ANSI-SQL way to do this.

```sql
SELECT
    customer_id,
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'pending'   THEN 1 END) AS pending,
    COUNT(CASE WHEN status = 'shipped'   THEN 1 END) AS shipped,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
    COUNT(CASE WHEN status = 'returned'  THEN 1 END) AS returned
FROM orders
GROUP BY customer_id
ORDER BY customer_id;
```

**Expected result:**

| customer_id | total_orders | pending | shipped | delivered | cancelled | returned |
| ----------- | ------------ | ------- | ------- | --------- | --------- | -------- |
| 1           | 2            | 0       | 1       | 1         | 0         | 0        |
| 2           | 3            | 2       | 0       | 0         | 0         | 0        |
| 3           | 1            | 0       | 0       | 0         | 1         | 0        |
| 4           | 1            | 0       | 0       | 0         | 0         | 1        |
| 5           | 1            | 0       | 1       | 0         | 0         | 0        |

> **Note:** Customer 2's `total_orders = 3` includes order 1008 (status `NULL`). The `NULL` status matches none of the bucket `CASE`s, so it appears **nowhere** in the status columns — a silent hole in your pivot. If you need to see it, add `COUNT(CASE WHEN status IS NULL THEN 1 END) AS unknown`.

> **Cross-reference:** Database-specific pivot operators (`PIVOT` in SQL Server and Oracle) exist, but the `CASE`-based approach is what works identically everywhere.

---

## CASE for Custom Ordering

A classic requirement: present a column in a business-defined sequence, not alphabetical or numeric.

```sql
SELECT order_id, status
FROM orders
ORDER BY
    CASE status
        WHEN 'cancelled' THEN 1
        WHEN 'pending'   THEN 2
        WHEN 'shipped'   THEN 3
        WHEN 'delivered' THEN 4
        ELSE 5
    END;
```

**Expected result:**

| order_id | status    |
| -------- | --------- |
| 1004     | cancelled |
| 1002     | pending   |
| 1005     | pending   |
| 1001     | shipped   |
| 1007     | shipped   |
| 1003     | delivered |
| 1006     | returned  |
| 1008     | NULL      |

`returned` and `NULL` fall in the `ELSE` bucket (5). Within a bucket, ties are ordered by `order_id` (the default index order here).

---

## CASE for Validation / Checklist Queries

Audit-style reports that flag each row as PASS/FAIL. `CASE` turns boolean checks into readable labels.

```sql
SELECT
    order_id,
    status,
    CASE
        WHEN status = 'cancelled' AND total IS NOT NULL
             THEN 'suspicious: cancelled but invoiced'
        WHEN status IS NULL AND total > 0
             THEN 'suspicious: no status but charged'
        ELSE 'ok'
    END AS audit_flag
FROM orders;
```

**Expected result:**

| order_id | status    | audit_flag                         |
| -------- | --------- | ---------------------------------- | ------------------------------------------------- |
| 1001     | shipped   | ok                                 |
| 1002     | pending   | ok                                 |
| 1003     | delivered | ok                                 |
| 1004     | cancelled | suspicious: cancelled but invoiced |
| 1005     | pending   | ok                                 | -- total is NULL, so NOT matched by second branch |
| 1006     | returned  | ok                                 |
| 1007     | shipped   | ok                                 |
| 1008     | NULL      | suspicious: no status but charged  |

Order 1005's `total` is `NULL`, so `total > 0` is `UNKNOWN` and the second `WHEN` is skipped. Only genuinely suspicious rows get flagged.

---

## Nested CASE

`CASE` expressions can be nested inside `THEN` values or inside other `CASE`s. It is legal but the readability cost is usually real. Prefer flat, sequential `WHEN` conditions over nesting whenever you can.

```sql
SELECT
    name,
    salary,
    CASE
        WHEN salary >= 100000 THEN 'executive'
        WHEN salary >= 50000 THEN
            CASE WHEN performance_rating >= 4 THEN 'senior'
                 ELSE 'mid'
            END
        ELSE 'associate'
    END AS tier
FROM employees;
```

**Flattened equivalent (preferred):**

```sql
SELECT
    name,
    salary,
    CASE
        WHEN salary >= 100000 THEN 'executive'
        WHEN salary >= 50000 AND performance_rating >= 4 THEN 'senior'
        WHEN salary >= 50000 THEN 'mid'
        ELSE 'associate'
    END AS tier
FROM employees;
```

> **Best practice:** Flatten as much as possible — it is easier to reason about, debug, and test. Two levels of nesting is usually the readability limit.

---

## CASE Across Databases: PostgreSQL, MySQL, SQL Server, Oracle

### Syntax compatibility

`CASE` is ANSI SQL, so the searched and simple forms work identically in all four engines. What differs is how _other_ conditional functions compete with `CASE`:

| Engine     | Alternative to CASE                          | Notes                                                                                                           |
| ---------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| PostgreSQL | `CASE` (native), no big shortcuts            | `CASE` used universally; `NULLIF` and `COALESCE` cover special cases                                            |
| MySQL      | `IF(cond, a, b)`, `IFNULL(a, b)`, `CASE`     | `IF()` is MySQL-specific and not portable; prefer `CASE` for portability                                        |
| SQL Server | `IIF(cond, a, b)`, `COALESCE`, `CASE`        | `IIF` is a thin synonym for a two-branch `CASE`; `CASE` is preferable for anything more than a single condition |
| Oracle     | `DECODE(expr, v1, r1, ..., default)`, `CASE` | `DECODE` is Oracle-specific, equates `NULL` to `NULL` (differs from CASE !), and is case-sensitive on strings   |

### The big Oracle difference: DECODE treats NULL as equal

> **Oracle:** `DECODE(NULL, NULL, 'match', 'no-match')` returns `'match'`, because Oracle's `DECODE` compares `NULL = NULL` as a match — unlike `CASE`, which follows ANSI three-valued logic. This is a very common trap for Oracle developers who migrate to PostgreSQL/MySQL and expect `WHEN NULL` to match.

### NULL result type differences

> **PostgreSQL / SQL Server**: NULL-friendly typing — `CASE WHEN cond THEN 1 END` yields an `integer` column with `NULL`s.
> **Oracle:** Oracle uses fixed length and type coercion rules; a `CASE` whose branches mix `VARCHAR2` and `NUMBER` may raise `ORA-00932: inconsistent datatypes`. Keep branch types consistent or explicitly `CAST`.

### Detailed example — MySQL's IF is not portable

```sql
-- MySQL-only
SELECT order_id, IF(status = 'shipped', 'yes', 'no') AS is_shipped FROM orders;

-- Portable equivalent
SELECT order_id, CASE WHEN status = 'shipped' THEN 'yes' ELSE 'no' END AS is_shipped FROM orders;
```

> **Production pitfall:** Using `IF()`, `IFNULL()`, `DECODE()`, and `IIF()` locks the query to one engine. `CASE` is one of the few conditional constructs that survives a migration unchanged. If portability matters, standardize on `CASE`.

---

## Common Mistakes

### 1. Overlapping or mis-ordered range conditions

```sql
-- BUG: 'high' can never be assigned once total < 300 passes first
CASE
    WHEN total < 300 THEN 'medium'
    WHEN total < 100 THEN 'small'
    ELSE 'large'
END
```

Because conditions evaluate top-to-bottom, `WHEN total < 100 THEN 'small'` is dead code — every row with `total < 100` already matched the first branch. **Order conditions from narrowest to broadest** (`< 100` before `< 300`).

### 2. Forgetting ELSE loses data silently

```sql
SELECT order_id,
       CASE WHEN status = 'shipped' THEN 'in_transit' END AS phase
FROM orders;
```

All non-shipped statuses (and `NULL`s) produce `NULL` for `phase`. If you intended "everything else is finished," you silently lose the distinction. Decide explicitly: add an `ELSE` or leave the `NULL` on purpose.

### 3. Using simple CASE with NULL

```sql
-- Never matches NULL
CASE status WHEN NULL THEN 'unset' ELSE 'set' END
-- Correct
CASE WHEN status IS NULL THEN 'unset' ELSE 'set' END
```

### 4. Type mismatch across branches

```sql
-- Works in most engines by implicit coercion, but unpredictable
CASE WHEN total < 100 THEN 'small' ELSE total END
-- Better: coerce explicitly or make branches type-consistent
CASE WHEN total < 100 THEN 'small' ELSE CAST(total AS VARCHAR) END
```

### 5. Putting a whole conditional filter in WHERE with CASE

```sql
-- Ugly and unindexable in the worst case
WHERE (CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) = 0
-- Clean and index-friendly
WHERE status <> 'cancelled' OR status IS NULL
```

### 6. Evaluating functions inside WHEN ignores NULL possibility

`UPPER(name)` is fine, but `CASE WHEN dept_code = dept_code THEN ...` will skip `NULL`s — compare with `IS NOT DISTINCT FROM` (PostgreSQL, SQL Server) or handle `NULL` explicitly if you need null-safe comparison. Cross-reference section 2 (NULL and Logic) and the NULL section of this handbook.

---

## Production Pitfalls

> **Production pitfall 1 — Conditional aggregation loses NULL categories.** `COUNT(CASE WHEN status = 'x' THEN 1 END)` never counts rows whose `status` is `NULL`. If your pipeline expects "every row accounted for," add a catch-all (`WHEN status IS NULL`), or your pivot/powerBI/tableau totals will mysteriously sum short.

> **Production pitfall 2 — CASE in WHERE can defeat indexes.** `WHERE (CASE WHEN flag = 1 THEN created_at ... END) = redeemed_date` hides the columns inside a function-like expression. Compared to `WHERE created_at = redeemed_date`, the optimizer may lose the ability to seek an index on `created_at`. Always rewrite the predicate so the indexed column stands alone.

> **Production pitfall 3 — Ordering matters and is fragile.** The system relies on `WHEN` order. If a junior dev inserts a general condition above a specific one, otherwise-unreachable branches quietly stop matching. Enforce "narrowest condition first" in code review, and keep the bucket count low and stable.

> **Production pitfall 4 — Migrations that switch from DECODE to CASE change NULL semantics.** Oracle `DECODE(NULL, NULL, 'x')` matches; `CASE NULL WHEN NULL` never does. Code that "worked" for years breaks after a migration unless the `IS NULL` branches were written in the first place.

> **Production pitfall 5 — Building a status column in SELECT from a business rule duplicated in many places.** When the rule changes ("the new threshold is 500, not 300"), you must find every query that hardcodes it. Centralizing the mapping in a lookup table, a view, or a generated column avoids divergence.

---

## Performance Implications

`CASE` itself is cheap: evaluating a short chain of comparisons is trivial compared to I/O and sorting. The performance question is usually about **what the optimizer can and cannot do around it**, not the cost of `CASE`. Do not assume; verify with `EXPLAIN` on every engine.

| Pattern                             | Typical cost                   | What to verify                                                                |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `CASE` in SELECT (simple bucketing) | Cheap per row                  | Whether it stops the optimizer from using an index for an adjacent `ORDER BY` |
| `CASE` in WHERE wrapping a column   | Can disable index seek         | Whether the plan shows an index scan instead of a seek                        |
| `CASE` in GROUP BY                  | Forces computed-value grouping | Whether a sort/hash dominates vs. a pre-computed category column              |
| `CASE` inside aggregates            | One pass over matching rows    | Whether an index on the _condition column_ narrows the scanned set            |
| Long chains of `WHEN`               | Linear in branch count         | Whether the first-match condition always holds (left-most selectivity)        |
| Custom ORDER BY with CASE           | Extra per-row computation      | Whether the sort key can leverage an index (almost never can)                 |

### Practical notes

- **Put the filter early.** In `CASE WHEN total < 100 THEN 'small' ...` the engine still evaluates all branches in order until a match; ordering conditions by likelihood (most common value first) can reduce per-row work, though the difference is usually minor.
- **Generated columns can hoist CASE out of queries.** PostgreSQL, MySQL, SQL Server (persisted columns), and Oracle all support computed/generated columns. If you bucket on the same expression in many queries, a generated column with an index is usually a better production design than writing the `CASE` a hundred times.

```sql
-- PostgreSQL
ALTER TABLE orders ADD COLUMN order_size
    VARCHAR GENERATED ALWAYS AS
    (CASE WHEN total < 100 THEN 'small'
          WHEN total < 300 THEN 'medium'
          ELSE 'large' END) STORED;

CREATE INDEX idx_orders_size ON orders (order_size);
```

- **For filtered aggregates, an index on the filter column matters more than anything else.** `SUM(CASE WHEN status = 'x' THEN total END)` scans fewer rows if an index on `status` lets the planner fetch only matching rows (index-only scan in PostgreSQL, covering index elsewhere). _Verify_ — a full scan beats a fragile index in many real data distributions.

### The verdict

There is **no universal rule** like "CASE is always slower than X." The cost depends on the optimizer, statistics, cardinality, and the surrounding query shape. Run:

```sql
EXPLAIN ANALYZE SELECT ... ;  -- PostgreSQL / MySQL 8
SET SHOWPLAN_XML ON;          -- SQL Server
EXPLAIN PLAN FOR SELECT ...;   -- Oracle
```

...before and after any change, and compare actual rows vs estimated rows.

---

## BAD vs BETTER Approaches

### Scenario A — Filtering with a conditional

**BAD APPROACH** (CASE hiding the column inside a predicate):

```sql
SELECT order_id, total
FROM orders
WHERE (CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) = 0;
```

**BETTER APPROACH** (direct, index-friendly predicate):

```sql
SELECT order_id, total
FROM orders
WHERE status <> 'cancelled' OR status IS NULL;
```

**Why:** The direct predicate is readable, lets the optimizer use an index on `status`, and correctly includes the `NULL`-status row (order 1008) — the bad version with just `= 0` also included it, but with an indirect expression the plan is less predictable. Always verify with `EXPLAIN ANALYZE` if you are optimizing.

### Scenario B — Bucketing with NULL

**BAD APPROACH** (NULL silently lands outside every bucket):

```sql
SELECT order_id,
       CASE WHEN total < 100 THEN 'small'
            WHEN total < 300 THEN 'medium'
            ELSE 'large' END AS size
FROM orders;
```

**BETTER APPROACH** (NULL gets its own label):

```sql
SELECT order_id,
       CASE
           WHEN total IS NULL THEN 'unknown'
           WHEN total < 100 THEN 'small'
           WHEN total < 300 THEN 'medium'
           ELSE 'large'
       END AS size
FROM orders;
```

### Scenario C — Classification in Scalar Subquery vs CASE

**BAD APPROACH** (subquery per row — potentially N evaluations):

```sql
SELECT order_id,
       (SELECT COUNT(*) FROM orders o2
        WHERE o2.status = 'pending' AND o2.customer_id = o.customer_id) AS pending
FROM orders o;
```

**BETTER APPROACH** (single aggregate pass per customer):

```sql
SELECT o.customer_id,
       COUNT(CASE WHEN o.status = 'pending' THEN 1 END) AS pending
FROM orders o
GROUP BY o.customer_id;
```

> Note the grain changes: the subquery version repeats the count on every row; the aggregate version returns one row per customer. Choose the grain you actually need, and verify row counts before refactoring — these are not drop-in equivalents.

### Scenario D — Custom sort

**BAD APPROACH** (string sort, not business order):

```sql
SELECT order_id, status
FROM orders
ORDER BY status;
```

**BETTER APPROACH** (CASE-driven sort key):

```sql
SELECT order_id, status
FROM orders
ORDER BY
    CASE status WHEN 'cancelled' THEN 1
                WHEN 'pending'   THEN 2
                WHEN 'shipped'   THEN 3
                WHEN 'delivered' THEN 4
                ELSE 5 END;
```

### Scenario E — Repeated CASE in the same query

**BAD APPROACH** (compute the same bucket three times):

```sql
SELECT
    CASE WHEN total < 100 THEN 'small' ELSE 'large' END AS size,
    COUNT(*) AS n,
    SUM(CASE WHEN total < 100 THEN 1 ELSE 0 END) AS small_count
FROM orders
GROUP BY CASE WHEN total < 100 THEN 'small' ELSE 'large' END;
```

**BETTER APPROACH** (compute once via a CTE / subquery alias):

```sql
WITH sized AS (
    SELECT *,
           CASE WHEN total < 100 THEN 'small' ELSE 'large' END AS size
    FROM orders
)
SELECT size, COUNT(*) AS n
FROM sized
GROUP BY size;
```

**Why:** Repeating the `CASE` text risks divergence (tweak one copy and the others drift) and recomputation. A CTE expresses the mapping once. Note: this does not magically make the engine smarter; it is about maintainability and correctness — verify performance with the execution plan.

---

## Best Practices

1. **Prefer the searched form for everything except simple equality mapping.** It handles ranges, `NULL`, and custom functions without surprises.
2. **Make `NULL` bucketing explicit.** Decide whether `NULL` should hit `ELSE`, get its own branch via `IS NULL`, or fall through to `NULL`. Do not leave it to chance.
3. **Order `WHEN` conditions from specific to general** (narrowest-first). Guard clauses belong at the top.
4. **Always include an `ELSE` when a default is semantically required** — but be careful: an `ELSE` hides `NULL` data you might actually want to audit.
5. **Keep branches type-consistent**; `CAST` explicitly when mixing numeric and text.
6. **Count matches with `COUNT(CASE WHEN cond THEN 1 END)`**, not with an `ELSE 0`. For sums, `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` is fine.
7. **Flatten nested `CASE`s** into sequential `WHEN`s whenever possible.
8. **Don't wrap a whole column in `CASE` inside `WHERE` just to test a boolean**; write the predicate directly.
9. **Factor repeated `CASE` expressions** into a CTE, view, or generated column so the business rule lives in exactly one place.
10. **Verify with execution plans** whenever `CASE` wraps indexed columns, appears in `GROUP BY`, or is used for custom sorts — and check the actual vs estimated row counts.

---

## Interview Questions

### Beginner

1. Write a query that labels each order as `active` (status in `pending`, `shipped`, `delivered`) or `closed` (anything else), using a `CASE` expression.
2. What does `CASE` return when no `WHEN` matches and there is no `ELSE`?
3. What is the difference between the two `CASE` syntaxes (`CASE expr WHEN value` vs `CASE WHEN condition`)?
4. Convert the following to a single `CASE`: `IF(score >= 90, 'A', IF(score >= 80, 'B', 'C'))`.
5. Write a `CASE` that maps the strings `'M'` and `'F'` to `'Male'` and `'Female'`, mapping everything else to `'Other'`.
6. Can you use a `CASE` expression in `ORDER BY`? Show an example.
7. What happens if you write `CASE status WHEN NULL THEN 'missing' ELSE 'present' END` for a `NULL` status?

### Intermediate

8. Write a query that counts orders per customer, breaking them into `pending`, `shipped`, and `delivered` columns (conditional aggregation).
9. The expression `COUNT(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END)` — what number does it return for the sample `orders` table, and why?
10. Why does `COUNT(CASE WHEN cond THEN 1 END)` behave differently from `COUNT(CASE WHEN cond THEN 1 ELSE 0 END)`?
11. Sort the `employees` table so that employees with a `NULL` `department_id` appear last.
12. Explain what is wrong with this ordering of `WHEN` clauses and fix it:
    `WHEN salary > 30000 THEN 'mid' WHEN salary > 100000 THEN 'senior'`.
13. Write a query using `CASE` inside `HAVING` to find customers with more than one pending order.
14. What is the difference between `NULLIF(a, 0)` and a `CASE WHEN a = 0 THEN NULL ELSE a END`? Are they equivalent in every engine?
15. In MySQL, what is the portability problem with `IF()` compared to `CASE`?

### Advanced

16. Contrast `CASE` with Oracle's `DECODE` regarding `NULL` equality. Why will a `CASE` port of a `DECODE` sometimes change results?
17. Design a query that pivots `orders` by status into columns, and explain what happens to orders with `NULL` status in your pivot.
18. A `CASE` used inside `GROUP BY` — could a database use an index on the underlying column to group? Explain why not and what alternative design (generated column) fixes it.
19. Write a query that classifies each employee's `salary` relative to their department's average, using at most one pass with `CASE` and a window function.
20. Explain how `CASE` interacts with three-valued logic when the condition contains a subquery that returns `NULL`.
21. What are the risks of nesting `CASE` three levels deep, and how would you refactor it?
22. Explain how to build a "safe division" expression with `CASE` and why `NULLIF`/`COALESCE` can replace it in many engines.

### Scenario Based

23. An alerts table has a `severity` column with the domain `{low, medium, high, critical}`. Write a query that sorts alerts "most urgent first" but pins a special `severity = NULL` batch to the very bottom.
24. A dashboard shows "Avg order value by size bucket" where size buckets are `<100`, `100-299`, `>=300`, plus "unknown". What happens to a `total = NULL` order in each bucket and in the average? Write the query producing exactly 4 clean buckets.
25. A billing team wants a revenue report that excludes `cancelled` orders but _includes_ rows where `total` is not yet set, summing them as 0. Show the query and explain the NULL behavior.
26. An audit query must flag orders that are `cancelled` but have a non-NULL `paid_at` date. Write it with `CASE` and then rewrite it without `CASE`. Which would you prefer and why?
27. Every row of `event_logs` has a `duration_seconds`; some rows have `NULL`. A report needs `slow/fast/unknown`. Write it so slow is `> 60`, fast is `<= 60`, and `NULL` is `unknown`. What happens if you forget the `IS NULL` branch?

### Tricky

28. With `COUNT(CASE WHEN c THEN 1 END)` — if `c` is true for all 5 of 8 rows, and the whole expression is wrapped in `COUNT(...)` ignoring NULLs, what exactly is counted? Explain at the NULL-value level.
29. Does the following produce different results for a row with `value = 10, flag = 'x'`? If yes, why?
    - `CASE WHEN flag = 'x' THEN value + 1 WHEN value > 5 THEN value END`
    - `CASE WHEN value > 5 THEN value WHEN flag = 'x' THEN value + 1 END`
30. A `WHEN` condition is `1 = 1`. There is an `ELSE`. Which branch always wins, and is the `ELSE` ever evaluated?
31. In `CASE WHEN x IS NOT DISTINCT FROM y THEN 'same' ELSE 'diff' END`, what is returned when both `x` and `y` are `NULL`? (PostgreSQL / SQL Server.) Compare with using `=`.
32. What does `SELECT CASE WHEN NULL THEN 1 WHEN NOT NULL THEN 2 END;` return, and why can `NOT NULL` be used as a predicate here?
33. Can you put an aggregate function directly inside `CASE` in the `SELECT` list of a non-grouped query? What error do you expect, and why does `SUM(CASE ...)` work while `CASE WHEN SUM(...) > 0 ...` does not?
34. Write a `CASE` that behaves like `NULLIF(a, b)` but in fully portable ANSI SQL, handling the case where `a = b` including when both are `NULL`.

### Output Prediction

For the following queries against the sample `orders` table, write the exact output (all 8 rows).

35. `SELECT order_id, CASE WHEN total < 100 THEN 'small' WHEN total < 300 THEN 'medium' ELSE 'large' END FROM orders ORDER BY order_id;`
36. `SELECT order_id, CASE status WHEN 'pending' THEN 'U' WHEN 'shipped' THEN 'S' ELSE 'X' END FROM orders ORDER BY order_id;`
37. `SELECT customer_id, COUNT(CASE WHEN status = 'pending' THEN 1 END) FROM orders GROUP BY customer_id ORDER BY customer_id;`
38. `SELECT customer_id, SUM(CASE WHEN status <> 'cancelled' THEN total END) FROM orders GROUP BY customer_id ORDER BY customer_id;`
39. `SELECT order_id, CASE WHEN status = 'delivered' AND total > 100 THEN 'win' WHEN status = 'delivered' THEN 'low' WHEN status IS NULL THEN 'none' END FROM orders ORDER BY order_id;`
40. `SELECT CASE WHEN 10 > NULL THEN 'a' WHEN NULL IS NULL THEN 'b' ELSE 'c' END;`

### Debugging

41. This query returns `pending` as 0 for every customer. Fix it:
    `SELECT customer_id, COUNT(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending FROM orders GROUP BY customer_id;`
42. Orders with `NULL` status do not appear in a "status breakdown" report. Where is the silent hole and how do you add an explicit bucket?
43. A "total revenue excluding cancelled" query returns a number _higher_ than "gross revenue". Find the bug: `SELECT SUM(CASE WHEN status <> 'cancelled' THEN NULL ELSE total END)`.
44. Two rows with `value = NULL` disappear from both `WHEN value < 10` and `ELSE`. Explain with three-valued logic why the `ELSE` does not catch them, and propose the corrected `CASE`.
45. A `CASE` in `ORDER BY` produces a plan with a sort on a computed key, and the query is slow on 40M rows. What design change (indexable) would you propose, and how would you prove it with `EXPLAIN`?

### Performance

46. Would `WHERE (CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) = 0` use an index on `status` in MySQL 8? What about the rewritten `status <> 'cancelled' OR status IS NULL`? Defend your answer and describe what you would check in the execution plan.
47. You maintain a dashboard bucketing orders by total with a `CASE` in `GROUP BY`. Cardinals are 30M rows, 3 buckets. The plan shows a sort. Is this necessarily bad? What are the alternatives (generated column + index, pre-aggregated table) and how would you benchmark them?
48. When does placing `CASE` inside a `SUM` over a large fact table become a problem compared to filtering first? Show the `WHEN`-condition that lets the planner prune partitions / use an index, and the one that forces a full scan.
49. A custom `ORDER BY CASE ...` forces a sort on millions of rows. Estimate when a sort spills to disk and what `work_mem`/`sort_buffer_size`/`tempdb` consequences look like across engines. What query shape avoids the sort?
50. Design an experiment to test whether `COUNT(CASE WHEN s = 'x' THEN 1 END)` is faster than a pre-filtered subquery `COUNT(*) FROM (... WHERE s = 'x')` on your engine. Which steps use `EXPLAIN ANALYZE`, what metrics do you compare (rows scanned, buffers hit, time), and what data distributions would flip the winner either way?
