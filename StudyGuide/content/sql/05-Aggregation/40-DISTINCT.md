# Section 40 — `DISTINCT`

## Fundamentals

`SELECT DISTINCT` removes duplicate rows from the result set. Only distinct combinations of the columns you select are returned.

What it is:

- `SELECT DISTINCT` collapses rows that are identical **across every selected column** into a single row.

Why it exists:

- Relational data and `JOIN`s routinely produce duplicate rows. `DISTINCT` is the simplest way to ask: "What are the _unique_ values here?"

Critical to understand from day one:

> `DISTINCT col` de-duplicates by the **entire row**, not by `col` alone.

`SELECT DISTINCT id, name` and `SELECT DISTINCT id`` are *different queries*. The first returns distinct `(id, name)`pairs. If each`id`has many`name`s, the first returns far more rows than the second.

---

## Syntax

```sql
SELECT DISTINCT column_1, column_2, ...
FROM table_name
[WHERE condition]
[ORDER BY ...];
```

Other forms:

```sql
SELECT DISTINCT department_id FROM employees;
```

```sql
SELECT COUNT(DISTINCT department_id) FROM employees;
```

SQL Server also supports:

```sql
SELECT DISTINCT TOP 10 city FROM customers;
```

---

## The grain rule

> One row in `employees` represents one employee.

`SELECT DISTINCT department_id FROM employees;` — one output row per unique department referenced by at least one employee, giving the output grain "one row = one department_id value". Keep this grain in mind: `DISTINCT` often sits behind questions like "which cities do our customers live in?" or "which product categories have ever been sold?".

---

## Sample tables

```sql
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    department_id INT,
    manager_id    INT,
    salary        NUMERIC(10,2)
);

INSERT INTO employees VALUES
(1,  'Alice', 'Smith',  10, NULL, 70000),
(2,  'Bob',   'Jones',  10, 1,    55000),
(3,  'Carol', 'Smith',  20, 1,    60000),
(4,  'Dave',  'Brown',  20, NULL, 72000),
(5,  'Eve',   'Jones',  10, 2,    48000),
(6,  'Frank', 'White',  10, 1,    62000),
(7,  'Grace', 'Black',  NULL,4,   90000);
```

```sql
CREATE TABLE orders (
    order_id     INT PRIMARY KEY,
    customer_id  INT,
    product_id   INT,
    order_date   DATE,
    amount       NUMERIC(10,2)
);

INSERT INTO orders VALUES
(101, 1, 501, '2025-01-10', 120.00),
(102, 1, 501, '2025-02-14', 120.00),
(103, 2, 502, '2025-02-20',  45.50),
(104, 2, 501, '2025-03-01', 120.00),
(105, 3, 503, '2025-03-05', 300.00);
```

```sql
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(50),
    category     VARCHAR(50)
);

INSERT INTO products VALUES
(501, 'Widget',     'Hardware'),
(502, 'Gadget',     'Electronics'),
(503, 'Widget Pro', 'Hardware');
```

---

## Basic examples

### 1. Unique departments

```sql
SELECT DISTINCT department_id
FROM employees
ORDER BY department_id;
```

Result:

```
department_id
--------------
10
20
NULL
```

### 2. Counting unique departments

```sql
SELECT COUNT(DISTINCT department_id) AS dept_count
FROM employees;
```

Result:

```
dept_count
-----------
2
```

> Note: `COUNT(DISTINCT ...)` **ignores NULLs** (see NULL behavior below), so `Grace`'s NULL department is not counted. If you want the distinct department _values including NULL_, you'd need `COUNT(DISTINCT department_id) + fuzzy handling` or query the list directly.

### 3. Distinct pairs

```sql
SELECT DISTINCT department_id, manager_id
FROM employees
ORDER BY 1, 2;
```

Result:

```
department_id | manager_id
--------------+-----------
10            | NULL
10            | 1
10            | 2
20            | NULL
20            | 4
NULL          | 4
```

Watch what happened: `DISTINCT` here operates on the **pair** `(department_id, manager_id)`, so all rows sharing a department but having different managers stay separate. This is the "per-column-pair uniqueness" behavior — a frequent source of off-by-N row-count confusion.

---

## NULL behavior

Three rules govern NULLs under `DISTINCT`:

1. **All NULLs are treated as one value.** Rows `(NULL)`, `(NULL)`, `(NULL)` collapse to a single `NULL` row.
2. **A row that is all-NULL collapses to one row**, not zero rows.
3. `COUNT(DISTINCT col)` ignores NULLs entirely.

```sql
-- employees has three departments: 10, 20, NULL
SELECT DISTINCT department_id FROM employees;
-- returns 10, 20, NULL  (3 rows)

SELECT COUNT(DISTINCT department_id) FROM employees;
-- returns 2  (NULL not counted)
```

> Common misconception: "DISTINCT removes NULLs." It does not — it collapses all NULLs into exactly one NULL row.
>
> Common misconception: "COUNT(DISTINCT col) treats NULLs as a distinct value." It does not — NULLs are excluded from the count.

```sql
-- How many distinct department values including NULL?
SELECT department_id FROM employees WHERE department_id IS NULL
UNION
SELECT DISTINCT department_id FROM employees ...
```

There is no portable one-liner; different engines expose different behavior via `COUNT(DISTINCT)` with NULL handling. Use the explicit listing when you must account for NULL as a value.

---

## How it works internally (conceptually)

`DISTINCT` forces the engine to compare every row of the result set against the rows already seen and drop duplicates. Engines typically implement this with:

- **Hashing** — build a hash table of seen rows; each new row is hashed and compared against buckets.
- **Sorting** — sort rows and scan to skip adjacent duplicates (this is why `DISTINCT` output often comes back with no guaranteed order).

Practical consequences:

- `DISTINCT` is not free: it is an extra operation over the query plan.
- `SELECT DISTINCT` output order is **not guaranteed**. If ordering matters, add an explicit `ORDER BY`.
- The work happens **after** joins, filters, and projections in the logical order of operations:

> Logical order of operations (conceptually): `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` (+ `DISTINCT`) → `ORDER BY`.

So `DISTINCT` removes duplicates in the _final projected result set_, after `WHERE`, joins, and aggregations have already run. This is why `SELECT DISTINCT a.* FROM a JOIN b ...` de-duplicates full joined rows, not "the a-side rows".

---

## Scenario-based examples

### Scenario 1 — "Which customers have placed orders?"

Grain: `orders` — one row per order line (here simplified to one row per order).

```sql
SELECT DISTINCT customer_id
FROM orders
ORDER BY customer_id;
```

Result:

```
customer_id
-----------
1
2
3
```

### Scenario 2 — "Which product categories have ever been sold?"

Match on the join key but show the _joined_ column:

```sql
SELECT DISTINCT p.category
FROM orders o
JOIN products p ON p.product_id = o.product_id
ORDER BY p.category;
```

Result:

```
category
--------
Electronics
Hardware
```

Why `DISTINCT` is needed: one product can appear in many orders, so the join fans out and the plain `JOIN` would return `Hardware, Hardware, Electronics, Hardware` without it.

### Scenario 3 — "How many distinct products have been ordered?"

```sql
SELECT COUNT(DISTINCT o.product_id) AS distinct_products_ordered
FROM orders o;
```

Result:

```
distinct_products_ordered
-------------------------
3
```

This is equivalent to `SELECT COUNT(*) FROM (SELECT DISTINCT product_id FROM orders) t;`

---

## `DISTINCT` vs `GROUP BY`

The same question can often be answered either way.

```sql
SELECT DISTINCT department_id FROM employees;
-- vs
SELECT department_id FROM employees GROUP BY department_id;
```

Both return one row per department. Differences noted as general guidance (verify with execution plans in your engine):

| Aspect          | `DISTINCT`                         | `GROUP BY`                        |
| --------------- | ---------------------------------- | --------------------------------- |
| Goal            | remove duplicate rows              | group rows + allow aggregation    |
| Aggregates      | none (`COUNT(DISTINCT ...)` aside) | yes (`SUM`, `AVG`, `MAX`, ...)    |
| HAVING          | not applicable                     | applicable                        |
| One row per     | distinct row combination           | distinct grouping key combination |
| Semantic intent | "what unique values exist?"        | "summarize data per key"          |

Best-practice note: if you need only to enumerate unique values, `DISTINCT` expresses intent more clearly. If you plan to aggregate, prefer `GROUP BY`. Many optimizers convert `DISTINCT` to `GROUP BY` (and vice versa) internally, so _neither is axiomatically faster_; measure.

> Avoid the anti-pattern:
>
> ```sql
> -- BAD APPROACH
> SELECT DISTINCT department_id, COUNT(*) FROM employees;  -- invalid on most engines
> ```

---

## `DISTINCT` on `JOIN`s — fan-out and accidental duplicates

The most common production misuse of `DISTINCT` is **hiding join defects**.

> Production pitfall: `DISTINCT` silently masks a JOIN that produces duplicate rows.

Example. Ask _"how much did each customer spend?"_ but write it badly:

```sql
-- BAD APPROACH -- joins orders to a table with more than one
-- row per order_id, inflating amounts, then DISTINCT "fixes" the row count:
SELECT DISTINCT o.customer_id, SUM(o.amount) ...
```

`DISTINCT` removes whole-row duplicates. If you `DISTINCT` on a row containing an aggregate, the row is not duplicated, so `DISTINCT` gives **false confidence** while the aggregate is still wrong.

Correct mental model: `DISTINCT` de-duplicates at the row level; it **never validates whether the duplicates were legitimate or caused by a bad join**. When the number of rows _should not_ change after a join, `DISTINCT` on top often means the join is wrong.

> Good practice — instead of slapping `DISTINCT` on, find the source of the duplicating join. A classic correct replacement when you only need existence (see the `EXISTS` cross-reference in the _Subqueries_ section) is:
>
> ```sql
> -- Often a better pattern for "customers with orders":
> SELECT customer_id
> FROM   customers c
> WHERE  EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
> ```
>
> `EXISTS` stops at the first match per customer and cannot fan out. (Whether this beats `DISTINCT` depends on the plan; for many-to-many child tables the fan-out-free approach is usually cleaner.)

---

## The `COUNT(DISTINCT ...)` family

```sql
SELECT
    COUNT(*)                AS total_rows,          -- includes rows w/ NULLs
    COUNT(product_id)       AS non_null_products,   -- ignores NULLs
    COUNT(DISTINCT product_id) AS distinct_products -- ignores NULLs
FROM orders;
```

Result:

```
total_rows | non_null_products | distinct_products
-----------+-------------------+------------------
5          | 5                 | 3
```

Distinctions to remember:

- `COUNT(*)` counts rows (NULLs included).
- `COUNT(col)` counts non-NULL values of `col`.
- `COUNT(DISTINCT col)` counts distinct **non-NULL** values of `col`.

Multi-column counting is database-specific:

> PostgreSQL / MySQL: `COUNT(DISTINCT a, b)` is supported (PostgreSQL 14+; MySQL likewise).
> SQL Server: use `COUNT(DISTINCT a||b)` style tricks or a subquery — do not assume it accepts two arguments.
> Oracle: `COUNT(DISTINCT a, b)` is supported.

```sql
-- PostgreSQL / Oracle: number of distinct (customer, product) pairs
SELECT COUNT(DISTINCT customer_id, product_id) FROM orders;
```

Result:

```
4   -- (1,501), (2,502), (2,501), (3,503)  -- wait, check:
```

Let's actually compute: orders rows are `(1,501), (1,501), (2,502), (2,501), (3,503)` → distinct pairs → `(1,501), (2,502), (2,501), (3,503)` = **4**.

```sql
-- SQL Server equivalent
SELECT COUNT(*) FROM (
    SELECT DISTINCT customer_id, product_id FROM orders
) t;
```

---

## `DISTINCT` with window functions — invalid combination

> Interview trap: `SELECT DISTINCT ... ROW_NUMBER() OVER (...)` is a logical error waiting to happen.

`ROW_NUMBER()` is computed per row before `DISTINCT` strips duplicates (logical order: window functions apply after `WHERE`/`GROUP BY`/`HAVING` but are evaluated as part of `SELECT`; `DISTINCT` then removes identical rows). Since row numbers are unique per partition, `DISTINCT` virtually never collapses them, so `SELECT DISTINCT` is pointless _and_ the result still contains one row per source row.

```sql
-- Misleading: row_number distinct is meaningless here
SELECT DISTINCT department_id,
       ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn
FROM employees;
```

If you intend "top N rows per department", use the window-function filtering pattern (see the _Window Functions_ section):

```sql
WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn
    FROM employees
)
SELECT department_id, first_name, salary
FROM ranked
WHERE rn = 1;
```

---

## `SELECT DISTINCT *` — code smell

```sql
SELECT DISTINCT * FROM employees;
```

This is rarely what you want: `employee_id` is unique, so `DISTINCT *` here returns every row unchanged. It also:

- Sends all columns to the sort/hash engine unnecessarily.
- Is a strong signal the author is unsure why rows duplicated.

> Production pitfall: `SELECT DISTINCT *` is almost always the wrong tool for debugging a duplicate-row problem. Investigate the join instead (use the _What is the grain of each table?_ checklist).

---

## `DISTINCT` vs `UNION`

`UNION` performs a distinct operation; `UNION ALL` does not.

```sql
SELECT department_id FROM departments_dc
UNION                    -- deduplicates across both sets
SELECT department_id FROM departments_ny;

SELECT department_id FROM departments_dc
UNION ALL                -- keeps all rows
SELECT department_id FROM departments_ny;
```

Cross-reference the _Set Operations_ section. If you don't need the de-duplication, `UNION ALL` avoids an entire distinct/sort phase.

---

## Edge cases

1. **All-NULL and NULL mixing**

```sql
SELECT DISTINCT manager_id FROM employees ORDER BY 1;
```

Result: `NULL, 1, 2, 4` (all NULLs collapsed into one).

2. **Keyed columns are already unique**

If the table has a primary key, `SELECT DISTINCT *` changes nothing.

3. **`DISTINCT` with `ORDER BY` on a non-selected column**

```sql
-- MySQL allows this (with ONLY_FULL_GROUP_BY caveats aside) but it's
-- semantically odd; in SQL Server / Oracle / strict Postgres it errors.
SELECT DISTINCT department_id FROM employees ORDER BY salary;
```

> Interview trap: "Why does `SELECT DISTINCT x ... ORDER BY y` fail?" Because `DISTINCT` destroys the one-to-one relationship between rows and `y`; there is no single `y` per distinct `x`. Different engines diverge — MySQL historically allows it, others reject it.

4. **Blank text vs. NULL** — `''` and `NULL` are different values; `DISTINCT` keeps both.

5. **Case sensitivity** depends on collation: `'Widget'` and `'widGẹt'` may be distinct (case-sensitive collation) or identical (case-insensitive).

```sql
-- PostgreSQL, case-sensitive by default: two rows
SELECT DISTINCT lower(category) FROM products;  -- use lower() to normalize
```

6. **Trailing / leading whitespace** — `'  Hardware'` and `'Hardware'` are distinct under most collations; normalize with `TRIM()`.

7. **Distinctness is defined on the projected values, after functions/coalescing:**

```sql
SELECT DISTINCT COALESCE(department_id, -1) FROM employees;
-- NULL now maps to -1, so no NULL row is emitted.
```

---

## Performance implications

Do not assume constants; every claim below must be verified with the execution plan for the specific engine, data distribution, and statistics.

- `DISTINCT` adds a distinct (sort or hash) operator to the plan. On large inputs this costs memory (hash) or I/O (sort).
- The work is proportional to the **row count of the intermediate result set**, which can be much larger than the final output.
- `COUNT(DISTINCT col)` often cannot serve directly from an index in the naive case and may visit the table; however, an index on `col` may allow an index-only scan. **Check `EXPLAIN`.**
- A useful mental hook: `DISTINCT` on a column with an index may be answered via the index (skipping duplicate keys); `DISTINCT` across a joined, filtered, multi-column projection usually cannot.
- Combining `WHERE col IN (...) ` with `SELECT DISTINCT col2` — the plan decides; don't presume.

Always verify with the engine's plan tool:

> PostgreSQL: `EXPLAIN ANALYZE`
> MySQL: `EXPLAIN ANALYZE` (MySQL 8.0.18+) / `EXPLAIN EXTENDED`
> SQL Server: estimated / actual execution plan (SSMS)
> Oracle: `EXPLAIN PLAN` / `DBMS_XPLAN.DISPLAY_CURSOR`

```sql
EXPLAIN ANALYZE
SELECT DISTINCT product_id FROM orders;
```

Look for a `HashAggregate` (PostgreSQL) or `Stream Aggregate` / `Table Spool` (SQL Server) node, and judge its cost against actual numbers.

### A common optimization idea — `DISTINCT` vs enforcing uniqueness upstream

If duplicates only exist because of a join fan-out, the better fix is almost always to remove the fan-out (e.g., by joining on the correct unique key or by using `EXISTS`). De-duplicating at the outermost `SELECT` is often the _symptom_, and the expensive part (the join itself) still ran on duplicates.

---

## Common mistakes

| Mistake                                                                | Explanation                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Thinking `DISTINCT` de-dups by a single column                         | It de-dups the whole row                                        |
| Trusting `DISTINCT` to fix a duplicated JOIN aggregate                 | Aggregates run before de-dup; values stay wrong                 |
| `SELECT DISTINCT *` for debugging                                      | Uniqueness of the key makes it a no-op                          |
| Forgetting NULLs collapse to one row                                   | `DISTINCT` returns `NULL` once, `COUNT(DISTINCT)` returns zilch |
| Assuming `DISTINCT` orders results                                     | It does not; add `ORDER BY`                                     |
| Using `DISTINCT` where `GROUP BY` / `EXISTS` / `UNION ALL` fits better | Obscures intent and often costs a dedup pass                    |
| `DISTINCT` with window functions                                       | Near-meaningless pair                                           |
| No-usecase `DISTINCT` on a PK column                                   | Wasted work; same rows returned                                 |

---

## Best practices

1. **State the grain before writing.** "One output row = one distinct `(customer_id, product_id)` pair."
2. **Choose `DISTINCT` only when you actually need the de-dup.** If you need existence, prefer `EXISTS`; if you need aggregation use `GROUP BY`; if you need "keep all rows" use no de-dup at all.
3. **Never hide join bugs with `DISTINCT`.** Find the fan-out source.
4. **Normalize your data first** when text distinctness surprises you: `TRIM()`, `LOWER()`, `COALESCE()`.
5. **Always add `ORDER BY`** when output order matters.
6. **Remember `COUNT(DISTINCT ...)` drops NULLs.** If NULL counts as a distinct answer for your question, restructure.
7. **Profile with the execution plan** before "optimizing" a `DISTINCT` query.

---

## The reasoning checklist for `DISTINCT`

Run the SQL Reasoning scaffold (see the _SQL Reasoning_ section in the handbook):

1. **What does one output row represent?** → "One output row = one distinct combination of the selected columns."
2. **What is the grain of each table?**
3. **Do I need columns from another table?** → Only then join; and each extra joined column participates in distinctness.
4. **Do I only need to know whether a row exists?** → Prefer `EXISTS`, avoid needing `DISTINCT` at all.
5. **Can the JOIN create duplicates?** → If yes and the row count must not change, your join is suspect, not your de-dup.
6. **Do I need aggregation?** → Then use `GROUP BY`, not `DISTINCT`.
7. **Can NULL affect the result?** → It collapses to one value; `COUNT(DISTINCT)` skips it.
8. **What does the execution plan say?** → Confirm the sort/hash-distinct node and its actual cost.

Cross-references: `GROUP BY` / `HAVING` (Section 38), `UNION` vs `UNION ALL` (Set Operations), `EXISTS` / `IN` (Subqueries), window functions — `ROW_NUMBER` / `RANK`, `COALESCE` / `NULLIF`, and `JOIN` fan-out in the Joins section.

---

# Interview Questions

## Beginner

1. Write a query using `DISTINCT` to list every unique `category` in a `products` table.
2. Explain the difference between `COUNT(*)`, `COUNT(product_id)`, and `COUNT(DISTINCT product_id)`.
3. What does `SELECT DISTINCT * FROM orders` do? When is it a no-op?
4. Does `SELECT DISTINCT dept FROM employees` return a NULL row when some employees have NULL dept? Why?

## Intermediate

5. Write a query to find, from `orders`, all distinct `(customer_id, product_id)` pairs.
6. Convert a `SELECT DISTINCT department_id FROM employees` into an equivalent `GROUP BY` form.
7. A query `SELECT DISTINCT o.customer_id, SUM(o.amount) ...` looks wrong. Explain what is wrong and how to fix it.
8. When would you prefer `EXISTS` over `SELECT DISTINCT` to answer "which customers placed orders?"

## Advanced

9. Show how to compute the count of distinct `(customer_id, product_id)` pairs in PostgreSQL versus SQL Server.
10. A query returns duplicated rows after an `INNER JOIN`. Someone "fixes" it with `DISTINCT`. Why is this dangerous for an aggregate query?
11. Derive the number of rows returned by `SELECT DISTINCT row_number() OVER (PARTITION BY dept ORDER BY salary) FROM employees;` without running it. Explain.
12. Why does `SELECT DISTINCT x, y ... ORDER BY z` fail in some engines? Describe the dependency the optimizer must resolve.

## Scenario Based

13. Table `events(event_id, user_id, event_type, ts)` — one row per event. Write one query using `DISTINCT` returning all `user_id`s who triggered at least one event of type `'purchase'` in January 2026, without duplicates.
14. `authors`, `books`, `book_tags` (many-to-many). Count how many distinct tags are attached to books written by each author — explain where duplicates would arise and what grain each intermediate join produces.
15. In a report you need each distinct `region` for which at least one order exists, along with the highest single order amount in that region. Would you use `DISTINCT`, `GROUP BY`, or window functions? Justify.

## Tricky

16. `SELECT DISTINCT NULL;` — how many rows does it return? What about `SELECT COUNT(DISTINCT NULL);`?
17. The employees table has three NULL `manager_id` rows. After `SELECT DISTINCT manager_id`, how many NULL rows appear? Switch your answer for `COUNT(DISTINCT manager_id)`.
18. You run `SELECT DISTINCT first_name FROM employees ORDER BY salary DESC;`. Predict success/failure in PostgreSQL and MySQL. Explain any divergence.
19. `SELECT DISTINCT 'Widget' vs 'widget'` — are these guaranteed to be distinct? What decides this?
20. What is the output shape of `SELECT DISTINCT dept, manager_id FROM employees;` when the same `dept` has multiple managers and NULLs? Reason step by step.

## Output Prediction

21. Given the sample employees data, write down the exact output (rows and columns) of:

```sql
SELECT DISTINCT department_id, manager_id
FROM employees
ORDER BY 1, 2;
```

22. Predict the output of:

```sql
SELECT COUNT(DISTINCT department_id), COUNT(DISTINCT manager_id)
FROM employees;
```

23. Predict the row count of `SELECT DISTINCT salary FROM employees;` given the numbers 70000, 55000, 60000, 72000, 48000, 62000, 90000.

## Debugging

24. A colleague reports: "We ran the customer list with `SELECT DISTINCT customer_id FROM orders` and it returns NULL as a customer — but the NULL is a data error." Explain the symptom, and write the corrected query that excludes NULL.
25. A dashboard shows "only 251 rows" for "customers with a January order", but you expected more. Someone wrapped the join with `SELECT DISTINCT`. Walk through a step-by-step diagnosis.
26. A query with `DISTINCT` + `ROW_NUMBER()` returns more rows than expected and the team calls it a bug. Give the exact reason and the fix.

## Performance

27. A team says "`DISTINCT` always sorts the output." Correct or refine the claim.
28. When might `SELECT DISTINCT product_id FROM orders` be served without reading every row of the table? What index-related and planner assumptions are involved, and how would you verify with `EXPLAIN`?
29. Compare the _potential_ cost difference between answering "which customers ordered?" via (a) `SELECT DISTINCT` on a fan-out join, and (b) `EXISTS`. What factors decide which is faster? How do you test it?
30. `COUNT(DISTINCT col)` on a 50-million-row table is slow. Write down the checking steps (statistics, index, plan, alternative queries) you would run before changing anything.
