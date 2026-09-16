# 37 — HAVING

## Fundamentals

`HAVING` filters **groups** of rows after `GROUP BY` has been applied. `WHERE` filters **individual rows** before grouping.

The mental model:

1. `FROM` → pick tables
2. `WHERE` → drop rows that fail the condition (row-level filter, before grouping)
3. `GROUP BY` → collapse rows into groups
4. `HAVING` → drop groups that fail the condition (group-level filter, after grouping)
5. `SELECT` → express the result
6. `ORDER BY` / `LIMIT` → sort and trim the output

> Section cross-reference: logical order of execution is explained in depth in _Section 36 — GROUP BY_.

`HAVING` exists because `WHERE` cannot reference aggregate functions. `WHERE` is evaluated on raw rows; at that point no group exists yet, so `WHERE COUNT(*) > 5` is not even defined — there is no `COUNT(*)` per row.

## Grains — a reminder

> One row in `employees` represents one employee.
> One row in `orders` represents one order.
> One row in `order_items` represents one line item inside an order (an order can have many items).

`HAVING` operates at the grain of the **group**, not the grain of the table and not the grain of the output row of a window function.

## Syntax

```sql
SELECT   column(s), aggregate(s)
FROM     table(s)
WHERE    row_filter
GROUP BY column(s)
HAVING   group_filter
ORDER BY column(s);
```

Two legal forms:

```sql
-- Form 1: use the aggregate expression again
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 10;

-- Form 2: alias defined in SELECT
SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING emp_count > 10;
```

Notation caveats:

> MySQL allows `HAVING` to reference **any** SELECT alias, including non-aggregated columns and expressions.
> PostgreSQL allows aliases in `HAVING` only if they reference an aggregate or a group-by column.
> SQL Server allows output-column aliases in `HAVING`.
> Oracle historically requires repeating the full expression, not the alias (newer versions accept aliases in more cases).

## Sample tables

```sql
CREATE TABLE departments (
  department_id   INT PRIMARY KEY,
  name            VARCHAR(50)
);

CREATE TABLE employees (
  employee_id     INT PRIMARY KEY,
  name            VARCHAR(100),
  department_id   INT REFERENCES departments(department_id),
  salary          NUMERIC(10,2),
  country         VARCHAR(50)
);

CREATE TABLE orders (
  order_id        INT PRIMARY KEY,
  customer_id     INT NOT NULL,
  region          VARCHAR(30),
  order_date      DATE,
  status          VARCHAR(20)
);
```

Data:

```sql
INSERT INTO departments VALUES
(1, 'Engineering'), (2, 'Sales'), (3, 'HR'), (4, 'Marketing');

INSERT INTO employees VALUES
(101, 'Aisha', 1,  9000, 'US'),
(102, 'Bruno', 1, 10000, 'DE'),
(103, 'Chloe', 1,  7500, 'US'),
(104, 'Diego', 2,  6000, 'MX'),
(105, 'Elif',  2,  5000, 'TR'),
(106, 'Fatima',2,  5500, 'US'),
(107, 'Goran', 2,  5200, 'HR'),
(108, 'Hana',  3,  4800, 'CZ'),
(109, 'Ivan',  3,  4700, 'RU');

INSERT INTO orders VALUES
(1, 100, 'North', '2026-01-05', 'shipped'),
(2, 100, 'North', '2026-01-11', 'shipped'),
(3, 101, 'South', '2026-01-15', 'pending'),
(4, 102, 'North', '2026-01-20', 'shipped'),
(5, 101, 'South', '2026-02-02', 'shipped'),
(6, 103, 'West',  '2026-02-09', 'cancelled'),
(7, 104, 'North', '2026-02-14', 'shipped'),
(8, 104, 'North', '2026-02-21', 'pending');
```

## How it works internally

The optimizer will typically compute the aggregates (via a hash or sort-based aggregation) and then apply the `HAVING` predicate while producing the grouped result. In the most common plan:

- Hash Aggregate node computes groups + aggregates.
- The `HAVING` filter is folded into the same node (filtered input to the aggregate) or applied as a filter above it.

Key point: **the predicate is evaluated per group**, using one aggregate value per group. There is no per-row meaning.

What should you check before trusting any performance claim?

```sql
EXPLAIN (ANALYZE)
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 2;
```

> Always verify with `EXPLAIN ANALYZE` (PostgreSQL), `SET STATISTICS IO, TIME ON` (SQL Server), `EXPLAIN PLAN` / `DBMS_XPLAN` (Oracle), or `EXPLAIN ANALYZE` (MySQL). Do not assume the optimizer pushes the `HAVING` predicate into the scan — in most engines it is applied at the aggregate node, but the plan can differ.

## Example 1 — basic group filter

```sql
SELECT department_id, COUNT(*) AS employees
FROM employees
GROUP BY department_id
HAVING COUNT(*) >= 3;
```

**Expected result:**

| department_id | employees |
| ------------- | --------- |
| 1             | 3         |
| 2             | 4         |

`Engineering` (3) and `Sales` (4) survive; `HR` (2) is filtered out because its group count is below 3. `Marketing` has no employees and produces **no group at all** — see the edge cases below.

## Example 2 — filtering on SUM

```sql
SELECT department_id, SUM(salary) AS total_salary
FROM employees
GROUP BY department_id
HAVING SUM(salary) > 15000;
```

**Expected result:**

| department_id | total_salary |
| ------------- | ------------ |
| 1             | 26500.00     |
| 2             | 21700.00     |

## Example 3 — HAVING on non-aggregate group columns

Filtering on a column that is already in `GROUP BY` is legal but usually redundant — that predicate also works in `WHERE`:

```sql
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING department_id IN (1, 2);
```

Logical habit ladder:

- Row-level filter → `WHERE`
- Group-level filter (an aggregate) → `HAVING`
- Filter on a group-by column → `WHERE` (it is a row property)

So the better form:

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE department_id IN (1, 2)
GROUP BY department_id;
```

> Production pitfall: `WHERE` on the group-by column usually lets the engine use an index on that column, potentially pruning rows before aggregation. `HAVING` cannot prune rows during the scan — the rows were already read. Verify with an execution plan rather than assuming.

## HAVING vs WHERE — the authoritative comparison

| Concern                              | `WHERE`             | `HAVING`                                                              |
| ------------------------------------ | ------------------- | --------------------------------------------------------------------- |
| When evaluated                       | Before grouping     | After grouping                                                        |
| Can reference aggregates             | No                  | Yes                                                                   |
| Grain it filters                     | Rows                | Groups                                                                |
| Applies to columns not in `GROUP BY` | Yes                 | Only if the column is itself a group column, or the DB allows aliases |
| Row pruning before aggregation       | Yes                 | No                                                                    |
| Typical clause position              | After `FROM`/`JOIN` | After `GROUP BY`                                                      |

## Example 4 — WHERE + HAVING combined

```sql
SELECT department_id, COUNT(*) AS emp_count
FROM employees
WHERE country = 'US'
GROUP BY department_id
HAVING COUNT(*) >= 2;
```

Explanation: `WHERE` restricts to US employees (rows: Aisha, Chloe, Diego-gone, Fatima, ...). Grouping creates groups from those rows only. `HAVING` keeps only groups with 2+ US employees.

**Expected result:**

| department_id | emp_count                        |
| ------------- | -------------------------------- |
| 1             | 2                                |
| 2             | 1 → wait — count is 1, filtered? |

Let's recalculate carefully. US employees: Aisha (dept 1), Chloe (dept 1), Fatima (dept 2). Diego is `MX`, Elif `TR`, Goran `HR`, Hana `CZ`, Ivan `RU`, Bruno `DE`.

Groups: dept 1 → {Aisha, Chloe} → count 2 → passes. dept 2 → {Fatima} → count 1 → fails.

**Expected result:**

| department_id | emp_count |
| ------------- | --------- |
| 1             | 2         |

This is the classic trap: candidates write `WHERE country = 'US' AND COUNT(*) >= 2` and get an error, or write both safely but as two clauses with different semantics.

> Interview trap: `WHERE ... AND COUNT(*) >= 2` is a syntax error everywhere — aggregates are not allowed in `WHERE`. The correct placement is `HAVING COUNT(*) >= 2`.

## Example 5 — orders per region (scenario)

"Which regions have more than 2 shipped orders?"

Grain of `orders`: one row = one order.

```sql
SELECT region, COUNT(*) AS shipped_orders
FROM orders
WHERE status = 'shipped'
GROUP BY region
HAVING COUNT(*) > 2;
```

**Expected result:**

| region | shipped_orders |
| ------ | -------------- |
| North  | 4              |

`South` has 1 shipped, `West` has 0 shipped — both filtered.

## Example 6 — filtering on an alias (portable approach)

Aliases in `HAVING` are not uniformly supported (see the portability notes earlier). The most portable style repeats the expression:

```sql
SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING COUNT(*) >= 3   -- avoid relying on emp_count here for portability
ORDER BY emp_count DESC;  -- aliases in ORDER BY are safe everywhere
```

## Edge cases

### 1. Empty input

```sql
SELECT department_id, COUNT(*)
FROM employees
WHERE 1 = 0
GROUP BY department_id
HAVING COUNT(*) > 0;
```

Returns zero rows. There are no rows, so no groups, so `HAVING` sees nothing.

Subtle difference: `COUNT(*) > 0` over the group produces **no rows** when input is empty because the aggregate never runs on an empty input — unless the aggregate is on the whole table with no `GROUP BY` (see next).

### 2. HAVING without GROUP BY

```sql
SELECT COUNT(*) AS total
FROM employees
HAVING COUNT(*) > 8;
```

Legally allowed in all major databases. The entire table is implicitly a single group. Result: `total = 9`. This is the one case where an aggregate over an empty table yields a row (`COUNT(*) = 0`), so:

```sql
SELECT COUNT(*) AS total
FROM employees
WHERE 1 = 0
HAVING COUNT(*) > 0;   -- COUNT(*) = 0 → filtered → no rows
```

`SELECT COUNT(*) FROM empty_table` returns one row with `0`, because the whole-table aggregate has a "zero rows" default result. That propagation of aggregates mattering is why `HAVING` on the global aggregate behaves distinctly.

### 3. Groups with zero members

Groups whose key never appears in the data **do not exist** for `GROUP BY` purposes. In the employee data, `Marketing` (dept 4) has no employees; a query grouping by `department_id` shows groups 1, 2, 3 only. You cannot `HAVING` your way to keeping `Marketing` — the group was never created. Forcing it requires an `OUTER JOIN` or a `LEFT JOIN` and then counting non-nulls (see NULL behavior).

### 4. NULL in the grouping column

```sql
INSERT INTO employees (employee_id, name, department_id, salary, country)
VALUES (110, 'NullDept', NULL, 4000, 'US');

SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING COUNT(*) >= 1
ORDER BY department_id;
```

PostgreSQL, MySQL, SQL Server group **all NULLs together** into one group. Oracle **keeps NULLs separate** as distinct groups. Result shapes differ by engine — always document this in a cross-engine codebase.

> PostgreSQL / MySQL / SQL Server: `NULL` values form a single group.
> Oracle: each `NULL` groups by itself (in practice often yields many singleton groups).

### 5. Repeating the same aggregate

```sql
SELECT department_id,
       COUNT(*)  AS raw,
       COUNT(salary) AS non_null_salary
FROM employees
GROUP BY department_id
HAVING COUNT(*) <> COUNT(salary) AND COUNT(*) >= 1
ORDER BY department_id;
```

`HAVING` can combine multiple aggregates. This is a legitimate pattern for "at least one salary is missing".

## NULL behavior

- Aggregate functions ignore NULLs: `SUM(salary)` skips NULL salary rows; `AVG(salary)` divides by the count of non-null values, not by row count.
- `COUNT(*)` counts rows; `COUNT(salary)` counts non-null salaries. The pair is the standard recipe for detecting NULLs in a group.
- `HAVING` compares aggregate results, and aggregates contract NULL: `SUM` of an all-NULL group is `NULL`, and `NULL > 5` is not true — that group is filtered out.
- Error trap: `SUM(salary) > 15000` silently drops a group whose `SUM` is NULL (e.g., all salaries missing). If you need to keep it, use `COALESCE(SUM(salary), 0) > 15000`.

```sql
SELECT department_id,
       COUNT(*)              AS rows,
       COUNT(salary)         AS with_salary,
       SUM(salary)           AS total,
       COALESCE(SUM(salary),0) AS total_coalesced
FROM employees
GROUP BY department_id
HAVING COALESCE(SUM(salary), 0) >= 0
ORDER BY department_id;
```

> NULL section cross-reference: the three-valued logic rules behind this live in _Section 03 — NULL_ and _Section 05 — THREE-VALUED LOGIC_.

## Common mistakes

### Mistake 1 — using HAVING for a WHERE-style filter

```sql
-- BAD APPROACH
SELECT department_id, COUNT(*)
FROM employees
GROUP BY department_id
HAVING department_id = 1;
```

Ignores index candidates on `department_id` during the scan. Also risks the "filter on a non-group column" error in strict engines.

```sql
-- BETTER APPROACH
SELECT department_id, COUNT(*)
FROM employees
WHERE department_id = 1
GROUP BY department_id;
```

### Mistake 2 — expecting HAVING to filter individual rows

```sql
-- WRONG mental model: "keep rows whose salary > 8000"
SELECT department_id, salary, COUNT(*)
FROM employees
GROUP BY department_id, salary
HAVING salary > 8000;   -- filters whole (dept, salary) groups, not rows
```

If the intent was "employees with salary above 8000", that is `WHERE`.

### Mistake 3 — aggregating twice

```sql
-- BAD APPROACH
SELECT department_id, AVG(salary)
FROM employees
WHERE AVG(salary) > 5000   -- syntax error
GROUP BY department_id;
```

Use `HAVING AVG(salary) > 5000`.

### Mistake 4 — assuming GROUP BY is implied by HAVING

`HAVING` without `GROUP BY` is valid (global group), so forgetting the `GROUP BY` while writing `HAVING COUNT(*) > 1` collapses the whole table into one group instead of producing per-department rows.

## Production pitfalls

### Cartesian-product risk with JOIN + HAVING

If you JOIN before grouping, `HAVING` filters groups built from the **joined** rows — duplicates inflate counts.

```sql
-- orders (1 row per order) joined to order_items (1 row per line item)
SELECT o.region, COUNT(*) AS total_rows
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.region
HAVING COUNT(*) > 5;
```

`COUNT(*)` here counts order_items rows, not orders. If an order has 3 items, it contributes 3. To count orders, use `COUNT(DISTINCT o.order_id)` or avoid the join.

> Production pitfall: aggregation after a one-to-many join silently changes the grain. Always state the grain of the source table and the grain of the group before writing `HAVING`.

> Section cross-reference: fan-out and double-counting are covered fully in _Section 28 — JOIN DUPLICATION_ and _Section 29 — ONE-TO-MANY JOINS_.

### Filtering on aggregate before joining

When the group filter does not need columns from the joined table, prefer filtering at the source:

```sql
-- Often clearer: aggregate first, then join
SELECT d.name, c.emp_count
FROM departments d
LEFT JOIN (
    SELECT department_id, COUNT(*) AS emp_count
    FROM employees
    GROUP BY department_id
    HAVING COUNT(*) >= 2
) c ON c.department_id = d.department_id
ORDER BY d.name;
```

Not because it is "always faster" — verify with `EXPLAIN ANALYZE` — but because it is semantically explicit about the group grain.

## Performance implications

- `HAVING` filters after aggregation, so all rows that survive `WHERE` must still be read and grouped.
- Pushing a predicate to `WHERE` lets the engine apply it to fewer rows and may enable index access; `HAVING` cannot prune rows during the scan.
- Aggregation cost is usually dominated by the grouping (hash table build / sort). A predicate on an unindexed, non-group column in `WHERE` may still require a full scan — effort goes into gathering rows either way.
- Indexes on the `GROUP BY` columns can allow the optimizer to read groups in order (particularly in databases with loose-indexscan (MySQL) or index-ordered aggregation), which can make aggregation cheaper while `HAVING` is applied per group.

These are tendencies, not laws. Always confirm with an execution plan:

> PostgreSQL: `EXPLAIN (ANALYZE, BUFFERS)`
> MySQL: `EXPLAIN ANALYZE`
> SQL Server: `SET STATISTICS IO ON; SET STATISTICS TIME ON;`
> Oracle: `EXPLAIN PLAN` then `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(..., 'ALL'));`

## Comparison table — WHERE vs HAVING vs window function

| Task                                                 | Tool                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Filter rows on a raw column                          | `WHERE`                                                                 |
| Filter groups on an aggregate                        | `HAVING`                                                                |
| Keep all rows but attach an aggregate result to each | Window function                                                         |
| Rank groups / top–N groups                           | `HAVING` + `ORDER BY ... LIMIT` (or aggregate over windowed row_number) |
| Per-group running totals while keeping rows          | Window functions                                                        |

## Example 7 — double grouping (nested aggregates)

"Departments where the highest salary exceeds the average salary of all employees by 20%."

```sql
SELECT department_id, MAX(salary) AS max_salary
FROM employees
GROUP BY department_id
HAVING MAX(salary) > (SELECT AVG(salary) * 1.2 FROM employees);
```

**Expected result:**

Global `AVG(salary)` = (9000+10000+7500+6000+5000+5500+5200+4800+4700+4000)/9? Count: 10 rows (we inserted 110). Sum = 9000+10000+7500+6000+5000+5500+5200+4800+4700+4000 = 61,700. `AVG` = 6170. Threshold: 6170 × 1.2 = 7404.

Groups:

- dept 1: MAX = 10000 → 10000 > 7404 → keep
- dept 2: MAX = 6000 → drop
- dept 3: MAX = 4800 → drop
- NULL group: MAX = 4000 → drop

| department_id | max_salary |
| ------------- | ---------- |
| 1             | 10000.00   |

## Example 8 — HAVING with HAVING-level arithmetic

```sql
SELECT department_id,
       COUNT(*)              AS emp_count,
       ROUND(AVG(salary), 2) AS avg_salary
FROM employees
GROUP BY department_id
HAVING AVG(salary) >= 5000 AND COUNT(*) >= 2
ORDER BY avg_salary DESC;
```

**Expected result:**

| department_id | emp_count | avg_salary |
| ------------- | --------- | ---------- |
| 1             | 3         | 8833.33    |
| 2             | 4         | 5425.00    |

`HR` (avg 4750) fails the average condition; the `NULL` group (1 row avg 4000) fails both.

## Example 9 — top groups by pagination (with HAVING + ORDER BY + LIMIT)

"Top 2 regions by number of shipped orders."

```sql
SELECT region, COUNT(*) AS n
FROM orders
WHERE status = 'shipped'
GROUP BY region
ORDER BY n DESC
LIMIT 2;
```

**Expected result:**

| region | n   |
| ------ | --- |
| North  | 5   |
| South  | 1   |

(Orders shipped: North has orders 1,2,4,7,8 → wait, order 8 is pending. Let me recount. Shipped: o1 North, o2 North, o4 North, o5 South, o7 North. That is North=4, South=1. Order 6 cancelled West, order 3 pending South, order 8 pending North.)

Corrected result:

| region | n   |
| ------ | --- |
| North  | 4   |
| South  | 1   |

If you need a hard group filter _and_ ordering/length, combine `HAVING` with `ORDER BY`/`LIMIT`. If you need "top N per something else", that becomes a window function job.

> Section cross-reference: _Section 18 — WINDOW FUNCTIONS_ and _Section 43 — PAGINATION_ / keyset pagination discuss when `LIMIT/OFFSET` is unsafe.

## Example 10 — input from a filtered aggregate (JOIN + GROUP BY + HAVING)

"Show customers who have at least 2 shipped orders."

One row in `orders` = one order. `customer_id` maps 1:1 per order.

```sql
SELECT customer_id, COUNT(*) AS shipped_orders
FROM orders
WHERE status = 'shipped'
GROUP BY customer_id
HAVING COUNT(*) >= 2;
```

**Expected result:**

| customer_id | shipped_orders |
| ----------- | -------------- |
| 100         | 2              |
| 104         | 2              |

Customer 101 has 1 shipped (the other is pending) → filtered.

## Example 11 — NULL trap inside HAVING

```sql
-- Employees above their department average? (with a NULL department)
SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING AVG(salary) > 6000;
```

The NULL-department group has `AVG(salary) = 4000` → fails. No NULL-specific logic needed here, but if all rows in a group had NULL salary, `AVG` returns NULL and **the group silently vanishes**. Decide explicitly:

```sql
HAVING COALESCE(AVG(salary), 0) > 6000   -- pick a deliberate default
  OR MAX(salary) IS NULL                 -- or keep the group on purpose
```

## Example 12 — COUNT(DISTINCT) in HAVING

"Departments employing workers in at least 2 different countries."

```sql
SELECT department_id, COUNT(DISTINCT country) AS countries
FROM employees
GROUP BY department_id
HAVING COUNT(DISTINCT country) >= 2;
```

**Expected result:**

| department_id | countries |
| ------------- | --------- |
| 1             | 2         |
| 2             | 4         |

`HR` has 2 (CZ, RU) also. So 1, 2, 3.

## Interview traps

> Interview trap 1: `WHERE` cannot use aggregates (`WHERE COUNT(*) > 1` → syntax error); the fix is `HAVING`.

> Interview trap 2: `HAVING` without `GROUP BY` treats the whole table as one group — `SELECT name FROM employees HAVING COUNT(*) > 100` is weird (returns one row) and `name` is not in a group; many engines error.

> Interview trap 3: `HAVING` evaluates after aggregation, so you cannot reference columns that are neither in `GROUP BY` nor aggregated (strict engines error; MySQL silently relaxes with `ONLY_FULL_GROUP_BY` disabled).

> Interview trap 4: filtering on a `GROUP BY` column belongs in `WHERE`; ask yourself whether the predicate is a row property or a group property.

> Interview trap 5: `COUNT(*)` vs `COUNT(col)` inside `HAVING` — a "do we have any NULLs" question is answered by `HAVING COUNT(*) > COUNT(col)`.

## Common misconception

> Common misconception: "HAVING is just WHERE after GROUP BY."
> Partially true, but the semantics differ at the NULL and grain level, and HAVING-only predicates can never prune rows before aggregation. Prefer WHERE for row filters.

## Best practices

1. Place row filters in `WHERE`; place group filters in `HAVING`.
2. State the grain explicitly before writing the query.
3. When joining before aggregating, count the pre-join grain (`COUNT(DISTINCT ...)`) or aggregate earlier.
4. Use `COALESCE` deliberately around aggregates that can be NULL when NULL would silently drop groups.
5. Repeat aggregate expressions in `HAVING` for cross-database portability instead of relying on aliases.
6. Verify every performance-sensitive query with `EXPLAIN ANALYZE`; never assume predicate push-down.
7. Order the logical reading of the query as `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`.

---

# Interview Questions

## Beginner

1. What is the purpose of `HAVING`? Where in the SELECT statement does it appear?
2. What is the difference between `WHERE` and `HAVING`?
3. Why does `WHERE COUNT(*) > 5` fail? What is the correct way to write it?
4. Can `HAVING` be used without `GROUP BY`? What does it do then?
5. What is the difference between `COUNT(*)` and `COUNT(column)` when both appear inside `HAVING`?
6. Rewrite this query so the meaning is unchanged and the plan is more index-friendly:

   ```sql
   SELECT department_id, COUNT(*)
   FROM employees
   GROUP BY department_id
   HAVING department_id = 2;
   ```

## Intermediate

7. For each region, return the region and the number of shipped orders, but only include regions with more than 2 shipped orders.
8. Explain the logical execution order of a query containing `FROM`, `JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, and `LIMIT`.
9. A group containing only NULL salaries produces `AVG(salary) = NULL`. What does `HAVING AVG(salary) >= 5000` do with that group, and how would you keep it intentionally?
10. Why is it a cardinality trap to `COUNT(*)` after a one-to-many JOIN inside a grouped query, even when the `HAVING` looks correct?
11. Show the departments that have at least one employee with a missing salary using only `COUNT` functions.
12. Write a query that returns departments whose maximum salary is at least 20% above the company-wide average salary.

## Advanced

13. Compare `HAVING COUNT(DISTINCT col)` filtering with the equivalent window-function approach. When would you prefer one over the other?
14. Explain how MySQL's `HAVING` alias resolution differs from PostgreSQL's, and why that changes portability of queries that filter on SELECT aliases.
15. In Oracle, NULLs in a GROUP BY column each form their own group; in PostgreSQL they form one group. How does this change the meaning of a `HAVING COUNT(*) >= 2` query across the two systems?
16. Show how you would detect a double-counting bug caused by a many-to-many JOIN inside a query with `HAVING`, using a hash-join friendly formulation.
17. What does the SQL standard say about the set of expressions allowed in `HAVING`? Which real databases deviate in which direction?

## Scenario Based

18. `orders` (one row per order) has columns `region`, `status`, `order_date`. Write a query that returns, for each region, the number of shipped orders in January 2026, keeping only regions with at least 2 such orders.
19. `order_items` has one row per line item and columns `order_id`, `product_id`, `quantity`, `price`. Find orders whose total value is above 500 but that ship to the US only. Define the grain carefully.
20. A `logins` table has one row per login. Find users who logged in on at least 10 distinct days in the last 30 days.
21. Find employees who earn less than their department average, using a self-check that relies on `HAVING` and a correlated subquery.

## Tricky

22. What is returned by this query against an empty table, and why does the answer differ from a query that groups a non-empty table?

```sql
SELECT COUNT(*) FROM empty_table HAVING COUNT(*) > 0;
```

23. `HAVING AVG(salary) > (SELECT AVG(salary) FROM employees)` — where does the scalar subquery execute in the logical order? Can the inner `AVG` see the outer group's rows?
24. Predict the output of the following query on the sample employee tables, then explain each group's fate:

```sql
SELECT department_id, COUNT(*) AS c
FROM employees
GROUP BY department_id
HAVING COALESCE(AVG(salary), 0) > 5000 OR COUNT(*) = 9;
```

25. Would adding `WHERE salary IS NOT NULL` change the result of `HAVING COUNT(salary) = COUNT(*)`? Under what circumstances?

## Output Prediction

26. Given this data, show the exact result set of the query below:

```
employees(department_id, salary):
(1, 100), (1, NULL), (2, 200), (2, 300), (3, NULL)
```

```sql
SELECT department_id,
       COUNT(*) AS c, COUNT(salary) AS cs, SUM(salary) AS s
FROM employees
GROUP BY department_id
HAVING COUNT(*) <> COUNT(salary) OR SUM(salary) > 250;
```

27. What is the result of `SELECT region, COUNT(*) AS n FROM orders GROUP BY region HAVING n >= 2 ORDER BY n DESC` in MySQL vs. PostgreSQL on data where one region has zero rows? Is `n` resolvable in PostgreSQL?

## Debugging

28. A developer reports "the query returns no rows" for:

```sql
SELECT department_id, AVG(salary)
FROM employees
GROUP BY department_id
HAVING AVG(salary) > 5000;
```

but the department clearly has salaries above 5000. What is the most likely NULL-related cause, and how would you confirm it?

29. A query using `HAVING COUNT(DISTINCT o.order_id) > 2` against a JOINed `orders ⋈ order_items` returns inflated results. Explain how to decide whether the bug is the JOIN or the aggregate.

30. In a production dashboard, `WHERE`-style predicates inside `HAVING` cause a slow query. Without changing the result set, propose the rewrite and explain what you would verify with `EXPLAIN ANALYZE` before shipping it.

## Performance

31. Why can `HAVING` never reduce the number of rows read from the base tables, and when might an optimizer nevertheless "push" a `HAVING` predicate into the scan?
32. Compare the execution-plan expectations for `WHERE country='US'` vs `HAVING country='US'` on a `GROUP BY department_id` query. Which can use an index on `country` and under what conditions?
33. A query with `HAVING AVG(salary) > 5000` is slow because grouping happens before the filter. Is a partial index or predicate push-down a valid optimization here? Justify your answer with an execution-plan reasoning, not a blanket claim.
34. When grouping by `department_id`, how does an index on `(department_id)` vs `(department_id, salary)` change the ability of the optimizer to aggregate in sorted order and reduce the `HAVING` evaluation cost? Explain what a real plan would have to show to prove it.
35. The handbook emphasizes "verify with EXPLAIN ANALYZE, do not assume." Design a small experiment using the employee/orders tables to disprove or confirm the claim that moving a filter from `HAVING` to `WHERE` always reduces scanned rows.
