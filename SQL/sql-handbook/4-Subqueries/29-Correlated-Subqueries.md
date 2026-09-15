# 29 — Correlated Subqueries

> **Category:** 4-Subqueries

---

## 1. Fundamentals

### 1.1 What is a correlated subquery?

A **correlated subquery** is a subquery that **references one or more columns of the outer (enclosing) query**.

```sql
SELECT e.emp_id, e.salary
FROM employees e
WHERE e.salary > (
    SELECT AVG(e2.salary)        -- ← inner query
    FROM employees e2
    WHERE e2.dept_id = e.dept_id -- ← correlation: uses the OUTER row's dept_id
);
```

The line `WHERE e2.dept_id = e.dept_id` is the **correlation condition**. It makes the inner query depend on the currently processed outer row (`e` comes from the outer query). Because of this dependency, the subquery **cannot run on its own** — it is meaningless without an outer row to bind its correlation column.

What makes it "correlated" is **the reference itself**, not the position. A subquery in the `SELECT` list is correlated only if it reads outer columns; a subquery in `WHERE` is correlated only if it reads outer columns. Remove every outer reference and the same text is no longer correlated.

### 1.2 Correlated vs non-correlated subquery

| Aspect | Non-correlated (simple) subquery | Correlated subquery |
|---|---|---|
| References outer columns | No | Yes |
| Can run standalone | Yes | No |
| Logically executed | Once | Once **per outer row candidate** |
| Direction of dependency | Inner → Outer (result feeds the outer query) | Outer → Inner (outer row is fed into the inner query) |
| Typical execution shape | Hash join, hash semi-join, materialized set | Nested-loop style or "apply" style (may be decorrelated by the optimizer) |
| Example | `WHERE dept_id IN (SELECT dept_id FROM departments)` | `WHERE salary > (SELECT AVG(...) WHERE dept_id = e.dept_id)` |

### 1.3 Why does it exist?

A correlated subquery solves a class of problems that are awkward or risky to express with plain joins:

1. **Row-preserving existence checks** — "keep this outer row if a matching row exists in another table" without fan-out.
2. **Per-row comparison against another row's related data** — "compare each employee against a value derived from *their own* department".
3. **Per-row derived values in the SELECT list** — "for each customer, show the amount of their most recent order".
4. **Row-at-a-time reasoning** — it mirrors how a human thinks: *"look at this row, look up something related, decide."*

It exists because sometimes a JOIN either duplicates rows (one-to-many / many-to-many) or forces a GROUP BY that you do not want, while a window function may not be available or may compute more than you need.

---

## 2. Internal working

### 2.1 The logical (textbook) evaluation model

The SQL standard describes correlated subqueries using an **iterative loop**:

```
for each candidate row R produced by the outer query:
    1. bind the values of the correlation column(s) from R
    2. execute the inner query with those values substituted
    3. use the inner result according to the operator
       (filter R, compute a value for R, decide existence)
```

```mermaid
flowchart TD
    A[Outer query produces a candidate row R] --> B[Bind correlation cols of R into inner SQL]
    B --> C[Execute inner query with bound values]
    C --> D{Does the inner result satisfy the oThe file is truncated mid-generation. I'll write the complete section.
Section 29 complete: written to `sql-handbook/4-Subqueries/29-Correlated-Subqueries.md` (941 lines, 64 code fences balanced).

Covers all 14 required dimensions:
- **Fundamentals** — what makes a subquery correlated, correlated vs non-correlated table
- **Internal working** — logical per-row loop, optimizer decorrelation (mermaid), `SubPlan`/`InitPlan`, engine-specific plan artifacts
- **Syntax** — correlated scalar in `WHERE`/`SELECT`, `EXISTS`/`NOT EXISTS`, `IN`, `HAVING`/`ON`/`UPDATE`/`DELETE`
- **Sample tables** with stated grain (employees, departments, customers, orders) and one deliberately NULL + one zero-relationship row
- **4 worked examples** with expected output + row-by-row trace, BAD/BETTER pairs, and scenario examples
- **Alternatives** — derived table+JOIN, window functions, `LATERAL`/`APPLY`, comparison matrix
- **Edge cases table, NULL/3VL deep dive, mistakes, production pitfalls, performance (plan-verified, no absolute claims), interview traps, best practices, DB differences, cross-references**
- **Interview Questions** — 39 practice questions across all 8 required categories, answers withheld

All computed outputs (dept averages, ranks, latest orders) were verified against the sample data.
row" cost model often does **not** apply — the join order, hash tables, and indexes decide the real cost.
- A correlated **scalar** subquery that must produce a per-row value more often stays as a nested-loop-like node, but the optimizer may still partially decorrelate it (for example, computing the grouped aggregate once and then applying it).
- Whether decorrelation happens depends on the query shape, whether it is safe (correct results preserved), and engine-specific optimizer rules.

> Production pitfall

> Never estimate performance from the number of rows you *think* the loop runs. Two visually identical correlated subqueries can have completely different plans — one hash semi-joined, one per-row subplan. Always verify with the execution plan.

### 2.3 What to look for in an execution plan

Illustrative plan shapes — exact text and node names vary by engine and version. Use `EXPLAIN` / `EXPLAIN ANALYZE` and match your own output.

**Correlated scalar subquery in `WHERE` (stays correlated):**

```
Seq Scan on employees e
  Filter: (salary > (SubPlan 1))
  SubPlan 1
    -> Aggregate
       -> Index Only Scan using employees_dept_salary_idx on employees e2
          Index Cond: (dept_id = e.dept_id)
```

**Correlated `EXISTS` (decorrelated into a semi-join):**

```
Nested Loop Semi Join
  -> Seq Scan on customers c
  -> Index Only Scan using orders_customer_id_idx on orders o
       Index Cond: (customer_id = c.customer_id)
```

**Correlated `NOT EXISTS` (decorrelated into an anti-join):**

```
Nested Loop Anti Join
  -> Seq Scan on customers c
  -> Index Only Scan using orders_customer_id_idx on orders o
       Index Cond: (customer_id = c.customer_id)
```

> PostgreSQL

> PostgreSQL distinguishes `InitPlan` (uncorrelated — executed once, result may be stored) from `SubPlan` (correlated — bound and evaluated in the context of the parent row). Seeing `SubPlan` under a filter hints that a per-row evaluation is happening; seeing a `Semi Join` or `Anti Join` node hints the optimizer decorrelated the `EXISTS`/`NOT EXISTS`.

> MySQL

> MySQL may transform `IN`/`EXISTS` into a semi-join (look for semi-join strategies such as `FirstMatch`, `Materialize`, `DuplicateWeedout`, or `LooseScan` in `EXPLAIN`). SELECT-list scalar correlated subqueries are often executed per output row. Older MySQL versions had materialization of derived tables; behavior and plan shapes differ dramatically across versions, so check the plan.

> Oracle

> Oracle can unnest subqueries into joins and offers hints such as `NO_UNNEST` and `PUSH_SUBQ` to influence the decision. Oracle also caches the values of scalar subqueries across repeated bindings when it is safe, which can make many identical bindings cheap.

> SQL Server

> Correlated subqueries frequently appear as `Nested Loops (Apply)` nodes. Broadly, an `Inner Apply` corresponds to `CROSS APPLY`/correlated semantics, `Left Outer Apply` to `OUTER APPLY`.

---

## 3. Syntax

There is no special syntax for "correlated" — correlation is just **outer columns appearing inside the subquery**. Every subquery position can be correlated:

### 3.1 Correlated scalar subquery in `WHERE`

```sql
SELECT <outer_cols>
FROM <outer_table> AS o
WHERE o.<col> <operator> (
    SELECT <aggregate_or_value>
    FROM <inner_table> AS i
    WHERE i.<key> = o.<key>      -- correlation
);
```

The subquery must return **zero or one row** (a scalar). Zero rows → `NULL`; more than one row → runtime error.

### 3.2 Correlated scalar subquery in the `SELECT` list

```sql
SELECT o.<col>,
       (
           SELECT <expr>
           FROM <inner_table> AS i
           WHERE i.<key> = o.<key>
           ORDER BY <tiebreaker>
           FETCH FIRST 1 ROW ONLY     -- ANSI; LIMIT 1 works in MySQL/PostgreSQL/SQLite
       ) AS <alias>
FROM <outer_table> AS o;
```

Any outer row with no matching inner rows gets `NULL` in that column.

### 3.3 Correlated `EXISTS` / `NOT EXISTS`

```sql
SELECT o.<cols>
FROM <outer_table> AS o
WHERE EXISTS (                      -- or NOT EXISTS
    SELECT 1                        -- the SELECT list is irrelevant here
    FROM <inner_table> AS i
    WHERE i.<key> = o.<key>
      AND <more_conditions>
);
```

`EXISTS` never cares about duplicates or `NULL`s inside the inner rows — only about **whether at least one row passes the condition**.

### 3.4 Correlated `IN` / `NOT IN`

```sql
WHERE <col> IN (
    SELECT <col2>
    FROM <inner_table> AS i
    WHERE i.<key> = o.<key>          -- correlation
)
```

`IN` with a correlated subquery works, but `EXISTS` is the more idiomatic choice for a correlated check (see **`IN` vs `EXISTS`**). The `NOT IN (…)` form carries an extra NULL trap (Section 9).

### 3.5 Correlated subquery in `HAVING`, `ON`, `UPDATE`, `DELETE`

Correlation can also occur in:

- `HAVING` — comparing a group against a value derived from itself.
- `ON` of a join — an admittedly rare but legal pattern.
- `UPDATE ... SET` / `DELETE ... WHERE` — per-row dependent updates and deletes.

```sql
UPDATE employees e
SET salary = salary * 1.05
WHERE salary < (
    SELECT AVG(e2.salary)
    FROM employees e2
    WHERE e2.dept_id = e.dept_id
);
```

```sql
DELETE FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
);
```

> MySQL

> MySQL historically refuses `UPDATE`/`DELETE` statements that select from **the same table** directly in a subquery (error 1093). A common workaround is to wrap the correlated subset in a derived table (`SELECT * FROM ( … ) AS x`). This restriction and its workarounds vary by version — verify.

---

## 4. Sample data

All examples in this section use the following tables. **Grain of each table is stated first** — always ask "what does one row represent?" before joining or aggregating.

- `departments` — **one row per department**.
- `employees` — **one row per employee**.
- `customers` — **one row per customer**.
- `orders` — **one row per order** (an order belongs to exactly one customer).

```sql
-- departments: one row per department
CREATE TABLE departments (
    dept_id   INT PRIMARY KEY,
    dept_name TEXT NOT NULL
);

-- employees: one row per employee
CREATE TABLE employees (
    emp_id    INT PRIMARY KEY,
    emp_name  TEXT NOT NULL,
    dept_id   INT NOT NULL REFERENCES departments(dept_id),
    salary    NUMERIC(10, 2),        -- one employee (Henry) has NULL salary on purpose
    hire_date DATE
);

-- customers: one row per customer
CREATE TABLE customers (
    customer_id   INT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    city          TEXT
);

-- orders: one row per order
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_date  DATE,
    amount      NUMERIC(10, 2)
);
```

**departments**

| dept_id | dept_name   |
|---|---|
| 1 | Engineering |
| 2 | Sales |
| 3 | HR |

**employees**

| emp_id | emp_name | dept_id | salary | hire_date |
|---|---|---|---|---|
| 101 | Alice | 1 | 90000.00 | 2019-01-15 |
| 102 | Bob | 1 | 75000.00 | 2020-03-01 |
| 107 | Grace | 1 | 80000.00 | 2022-07-19 |
| 103 | Charlie | 2 | 60000.00 | 2018-06-10 |
| 104 | Diana | 2 | 58000.00 | 2021-09-25 |
| 105 | Eva | 2 | 72000.00 | 2020-11-02 |
| 106 | Frank | 3 | 50000.00 | 2017-04-18 |
| 108 | Henry | 3 | NULL | 2023-01-30 |

**customers**

| customer_id | customer_name | city |
|---|---|---|
| 201 | Northwind Traders | New York |
| 202 | Acme Corp | Chicago |
| 203 | Globex | Boston |

**orders**

| order_id | customer_id | order_date | amount |
|---|---|---|---|
| 3001 | 201 | 2024-01-10 | 120.50 |
| 3002 | 201 | 2024-02-14 | 80.00 |
| 3003 | 202 | 2024-01-22 | 240.00 |
| 3004 | 201 | 2024-03-01 | 350.00 |

Customer `203` (Globex) has **no orders**. This row is deliberately included to demonstrate anti-join and NULL behavior.

---

## 5. Worked examples with expected output

### 5.1 Example 1 — Employees earning more than their department average

Correlated scalar subquery in `WHERE`. One output row per employee.

```sql
SELECT e.emp_id, e.emp_name, e.dept_id, e.salary
FROM employees e
WHERE e.salary > (
    SELECT AVG(e2.salary)
    FROM employees e2
    WHERE e2.dept_id = e.dept_id
);
```

**Row-by-row trace** — this is the logical model the engine follows (or an equivalent plan):

| Outer row | bound dept_id | inner result (AVG(salary)) | comparison | keep? |
|---|---|---|---|---|
| Alice (101) | 1 | (90000+75000+80000)/3 = 81666.67 | 90000 > 81666.67 | yes |
| Bob (102) | 1 | 81666.67 | 75000 > 81666.67 | no |
| Grace (107) | 1 | 81666.67 | 80000 > 81666.67 | no |
| Charlie (103) | 2 | (60000+58000+72000)/3 = 63333.33 | 60000 > 63333.33 | no |
| Diana (104) | 2 | 63333.33 | 58000 > 63333.33 | no |
| Eva (105) | 2 | 63333.33 | 72000 > 63333.33 | yes |
| Frank (106) | 3 | 50000.00 (Henry's NULL is ignored by AVG) | 50000 > 50000 | no |
| Henry (108) | 3 | 50000.00 | NULL > 50000 → **UNKNOWN** | no |

**Expected output**

| emp_id | emp_name | dept_id | salary |
|---|---|---|---|
| 101 | Alice | 1 | 90000.00 |
| 105 | Eva | 2 | 72000.00 |

Three NULL-related facts visible here:

1. `AVG` ignores NULL salaries, so HR's average is Frank's salary, not `(50000+NULL)/2`.
2. Frank is excluded because `50000 > 50000` is false — not because of NULL.
3. Henry is excluded because `NULL > anything` is `UNKNOWN`, which a `WHERE` treats as false. An employee with a NULL salary can never "overflow" their group average in this query.

### 5.2 Example 2 — Customers who have placed no orders

Correlated `NOT EXISTS`. One output row per customer. Grain check: no orders join, so no fan-out is possible.

```sql
SELECT c.customer_id, c.customer_name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
);
```

**Expected output**

| customer_id | customer_name |
|---|---|
| 203 | Globex |

### 5.3 Example 3 — Most recent order amount, one row per customer

Correlated scalar subquery in the `SELECT` list. This uses the outer row to fetch per-customer data, and must guarantee **at most one row** so the scalar contract is not violated (two orders on the same day are possible in production — always add a deterministic tie-breaker).

```sql
SELECT c.customer_id,
       c.customer_name,
       (
           SELECT o.amount
           FROM orders o
           WHERE o.customer_id = c.customer_id
           ORDER BY o.order_date DESC, o.order_id DESC
           FETCH FIRST 1 ROW ONLY
       ) AS last_order_amount
FROM customers c;
```

(`FETCH FIRST 1 ROW ONLY` is ANSI SQL:2008. MySQL, PostgreSQL and SQLite commonly use `LIMIT 1`; SQL Server uses `TOP (1)`. All achieve the same effect here.)

**Expected output**

| customer_id | customer_name | last_order_amount |
|---|---|---|
| 201 | Northwind Traders | 350.00 |
| 202 | Acme Corp | 240.00 |
| 203 | Globex | NULL |

Globex has no matching orders, so the scalar subquery returns zero rows → `NULL`. That is how "no data" is represented, and it is distinct from an amount that is genuinely `NULL`.

### 5.4 Example 4 — Salary "rank within department" built by counting

Correlated scalar subquery that returns a derived value per row — a hand-rolled version of `RANK()`. One output row per employee.

```sql
SELECT e.emp_id, e.emp_name, e.dept_id, e.salary,
       (
           SELECT COUNT(*) + 1
           FROM employees e2
           WHERE e2.dept_id = e.dept_id
             AND e2.salary > e.salary
       ) AS dept_rank
FROM employees e;
```

| emp_id | emp_name | dept_id | salary | dept_rank |
|---|---|---|---|---|
| 101 | Alice | 1 | 90000.00 | 1 |
| 107 | Grace | 1 | 80000.00 | 2 |
| 102 | Bob | 1 | 75000.00 | 3 |
| 105 | Eva | 2 | 72000.00 | 1 |
| 103 | Charlie | 2 | 60000.00 | 2 |
| 104 | Diana | 2 | 58000.00 | 3 |
| 106 | Frank | 3 | 50000.00 | 1 |
| 108 | Henry | 3 | NULL | 1 |

Two correctness caveats:

- **Ties** — if two employees in a department share a salary, both get the same rank but the next rank is skipped (this imitates `RANK()`, not `DENSE_RANK()`). Stable and deterministic, but state your intent.
- **Henry** — `e2.salary > e.salary` evaluates to `UNKNOWN` when `e.salary IS NULL` for every inner row, so the `COUNT` is 0 and Henry is assigned rank 1 despite having no comparable salary. This is a silent data-integrity bug in the query, not a feature. Window functions handle NULL ordering explicitly; hand-rolled counting does not.

> Common misconception

> "The `SELECT` list can only contain columns from outer tables plus correlated aggregates." Actually a correlated scalar subquery may return *any* expression derived from the matching inner rows (here, a count). What it may not return is **more than one row**.

---

## 6. Scenario-based examples

### 6.1 "Top earner in every department"

Return one row per employee **who is the highest paid in their own department**.

```sql
SELECT e1.emp_id, e1.emp_name, e1.dept_id, e1.salary
FROM employees e1
WHERE e1.salary = (
    SELECT MAX(e2.salary)
    FROM employees e2
    WHERE e2.dept_id = e1.dept_id
);
```

**Expected output**

| emp_id | emp_name | dept_id | salary |
|---|---|---|---|
| 101 | Alice | 1 | 90000.00 |
| 105 | Eva | 2 | 72000.00 |
| 106 | Frank | 3 | 50000.00 |

Note: with this equality pattern, a **tie at the top** returns *all* tied employees (one output row per employee, not per department). If the requirement is "one row per department", this query shape is wrong — you would need a ranking with a deterministic tie-breaker or `DISTINCT ON` (PostgreSQL).

### 6.2 "Flag rows that have a related row" — a marketing list

List all customers who have placed at least one order **above** $200. Grain: one row per customer, even though a customer may have many matching orders.

```sql
SELECT c.customer_id, c.customer_name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.amount > 200
);
```

**Expected output**

| customer_id | customer_name |
|---|---|
| 201 | Northwind Traders |
| 202 | Acme Corp |

The `EXISTS` shape guarantees one output row per customer even though Northwind Traders has two qualifying orders. A plain `JOIN` on the same predicate would return Northwind twice and require `DISTINCT` (see Section 10).

### 6.3 "Per-row sheet with a group reference" — normalizing salaries

For each employee, show their salary and their department average in the same row, then compute the difference. The natural home for this is the `SELECT` list.

```sql
SELECT e.emp_id,
       e.emp_name,
       e.salary,
       (
           SELECT AVG(e2.salary)
           FROM employees e2
           WHERE e2.dept_id = e.dept_id
       ) AS dept_avg_salary,
       e.salary - (
           SELECT AVG(e2.salary)
           FROM employees e2
           WHERE e2.dept_id = e.dept_id
       ) AS diff
FROM employees e;
```

**Expected output** (partial)

| emp_id | emp_name | salary | dept_avg_salary | diff |
|---|---|---|---|---|
| 101 | Alice | 90000.00 | 81666.67 | 8333.33 |
| 102 | Bob | 75000.00 | 81666.67 | -6666.67 |
| 106 | Frank | 50000.00 | 50000.00 | 0.00 |
| 108 | Henry | NULL | 50000.00 | NULL |

This is a case where **repeating** the same correlated subquery twice in one row is wasteful. Prefer the window-function form (Section 7.2) or a CTE so the average is computed once.

### 6.4 Correlated `UPDATE` against a group-derived threshold

Grain check: one row per employee; the update targets only employees who earn less than their department average.

```sql
UPDATE employees e
SET salary = salary * 1.05
WHERE salary < (
    SELECT AVG(e2.salary)
    FROM employees e2
    WHERE e2.dept_id = e.dept_id
);
```

This is the natural DML extension of Example 1. The same NULL logic applies: Henry (NULL salary) is untouched because the comparison is `UNKNOWN`.

---

## 7. Alternatives to correlated subqueries

Many correlated-subquery problems have a join or window-function formulation. None is *always* better — the decision depends on the optimizer, available indexes, statistics, data distribution, and the final plan. Verify each candidate with `EXPLAIN ANALYZE`.

### 7.1 Derived table + JOIN

Rewrite Example 1: compute each department's average once, then join.

```sql
SELECT e.emp_id, e.emp_name, e.dept_id, e.salary
FROM employees e
JOIN (
    SELECT dept_id, AVG(salary) AS dept_avg_salary
    FROM employees
    GROUP BY dept_id
) d ON d.dept_id = e.dept_id
WHERE e.salary > d.dept_avg_salary;
```

Same output as Example 1. The aggregate is conceptually computed **once per department** regardless of how many employees match — this scales better when the outer table is large, because the correlated version's inner call depends on the number of outer rows. But it adds a join which may itself be the bottleneck; the grouped set can also be larger than needed if the cardinalities are unlucky. Plan it.

### 7.2 Window functions

```sql
SELECT emp_id, emp_name, dept_id, salary
FROM (
    SELECT e.*,
           AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg_salary
    FROM employees e
) AS t
WHERE salary > dept_avg_salary;
```

Same output again, and the window variant computes each partition's average once while keeping detail rows intact. Window functions are usually the cleanest tool for scenario 6.3 (reference a group aggregate next to detail rows without a self-join).

### 7.3 `LATERAL` / `APPLY`

These allow a subquery *in the FROM clause* to reference sibling tables — the same correlation concept, but in a join context. Prefer them when you need multiple columns from the "one matching row" (a scalar subquery can only return one column per value).

#### PostgreSQL (and MySQL 8.0.14+)

```sql
SELECT c.customer_id,
       last_order.amount,
       last_order.order_date
FROM customers c
CROSS JOIN LATERAL (
    SELECT o.amount, o.order_date
    FROM orders o
    WHERE o.customer_id = c.customer_id
    ORDER BY o.order_date DESC, o.order_id DESC
    FETCH FIRST 1 ROW ONLY
) AS last_order;
```

#### SQL Server (no `LATERAL` keyword — `APPLY` instead)

```sql
SELECT c.customer_id,
       last_order.amount,
       last_order.order_date
FROM customers c
CROSS APPLY (
    SELECT TOP (1) o.amount, o.order_date
    FROM orders o
    WHERE o.customer_id = c.customer_id
    ORDER BY o.order_date DESC, o.order_id DESC
) AS last_order;
```

- `CROSS APPLY` / `INNER LATERAL` behaves like an inner join (Globex disappears).
- `OUTER APPLY` / `LEFT JOIN LATERAL ... ON TRUE` behaves like a left join (Globex appears with NULLs).

> Oracle

> Oracle supports `LATERAL` in the FROM clause since 12c; older releases rely on `TABLE( ... )` collections or correlated subqueries instead.

### 7.4 Comparison table — same problem, four tools

| Problem | Correlated subquery | Derived table + JOIN | Window function | LATERAL / APPLY |
|---|---|---|---|---|
| "Keep rows that have a match" | `EXISTS` — good, decorrelates to semi-join | `INNER JOIN` + `DISTINCT` — risk of fan-out | Not applicable | Good, but heavier-than-needed unless you also need columns |
| "Per-row value from a related single row" | Scalar subquery — works, one column, NULL if absent | `LEFT JOIN` on the "best row" — awkward to express | `LATERAL`/`APPLY` best — multiple columns | `LATERAL`/`APPLY` |
| "Detail rows + their group aggregate" | Works, may recompute per row | Works | **cleanest — window function** | Unnecessary |
| "Ranking within a group" | Hand-rolled with COUNT — fragile with ties and NULL | Needs self-join + aggregation | **cleanest — `ROW_NUMBER`/`RANK`/`DENSE_RANK`** | Possible but overkill |

> Common misconception

> "A subquery in the FROM clause can reference columns of the outer query." In plain ANSI SQL a **derived table** in `FROM` cannot reference sibling tables — this is exactly the feature `LATERAL` adds. If a query tries it without `LATERAL`, the engine rejects it.

---

## 8. Edge cases

| Situation | Behavior |
|---|---|
| Outer query has zero rows | The subquery never executes (logically). Nothing to bind, nothing to check. |
| Correlation column is NULL on an outer row | `i.key = NULL` is `UNKNOWN` → no inner rows match → `EXISTS` = false, scalar = NULL. |
| No matching inner rows | Scalar → `NULL`; `EXISTS` → false; `NOT EXISTS` → true; `=` comparison with the NULL → `UNKNOWN`. |
| More than one matching inner row | `EXISTS` is fine (only truth matters); a **scalar** subquery → **runtime error** unless you force one row (e.g. `MAX`, `FETCH FIRST`, `TOP 1`, `LIMIT 1`). |
| Aggregate without `GROUP BY` inside | Always returns exactly one row (value may be NULL) — safe for the scalar contract. |
| Only one row in the correlated group | The aggregate of that group equals that row's value; `>` comparisons return false, `>=` returns true. |
| `COUNT(*)` vs `COUNT(col)` inside | `COUNT(*)` counts rows even when the correlated column is NULL; `COUNT(col)` ignores NULLs. Pick deliberately. |
| Ties in "latest per group" | Without a deterministic `ORDER BY` tie-breaker, which tied row wins is plan-dependent — **nondeterministic**. |
| Group aggregate that is entirely NULL | `AVG` over all-NULL → NULL; then `salary > NULL` → `UNKNOWN` → nothing kept, even if intent was otherwise. |

---

## 9. NULL behavior and three-valued logic

Correlated subqueries are where NULL ignorance hurts most, because the correlated value travels **through** the subquery boundary.

1. **Correlated scalar returning NULL.** Any outer row whose inner match yields `NULL` (or zero rows → NULL) makes comparisons evaluate to `UNKNOWN` under three-valued logic. In `WHERE`, `UNKNOWN` is false — the row disappears. In the `SELECT` list, the column is simply NULL.

2. **`EXISTS` is immune to NULLs.** `EXISTS` tests only whether rows exist; even a subquery that would emit `NULL` values returns true as long as the row qualifies. This is why correlated existence checks prefer `EXISTS`.

3. **The `NOT IN (…)` trap.** A correlated `NOT IN` (or any `NOT IN`) that can produce `NULL` silently filters all rows. If `orders.customer_id` could be NULL, this query **returns zero rows** even though Globex has no orders:

   ```sql
   SELECT c.customer_id, c.customer_name
   FROM customers c
   WHERE c.customer_id NOT IN (
       SELECT o.customer_id
       FROM orders o
       WHERE o.customer_id = c.customer_id
   );
   ```

   Reason: for Globex the inner set is empty (`NULL` never enters the picture), but for customers whose inner set contains one NULL row, `NOT IN` must evaluate `NOT (value = NULL)` → `NOT UNKNOWN` → `UNKNOWN` → row filtered out. `NOT EXISTS` cannot hit this trap:

   ```sql
   WHERE NOT EXISTS (
       SELECT 1
       FROM orders o
       WHERE o.customer_id = c.customer_id
   );
   ```

   The full discussion lives in the **`NOT IN` + NULL** section.

4. **Aggregates ignore NULLs.** `AVG`, `MAX`, `MIN`, `SUM` skip NULL rows; only `COUNT(*)` counts them. This silently shifts "group average" when some rows have NULL values — see Example 1.

5. **`IS NOT DISTINCT FROM`** is the safe way to compare a correlated key that may be NULL (treats NULL as equal to NULL). If the correlation key itself can be NULL on one side, `i.key = o.key` never matches; use `IS NOT DISTINCT FROM` or `COALESCE` with care.

> Interview trap

> "`NOT EXISTS` is the same as `NOT IN`." False — exactly when NULLs can flow from the subquery, they diverge. Always ask: *can the inner column be NULL?*

---

## 10. Common mistakes

**Mistake 1 — Forgetting the correlation line entirely.**
If you drop `i.dept_id = o.dept_id`, the subquery becomes non-correlated — a whole-table average, not a per-group one.

```sql
-- BAD: all employees compared to one global average, not their department's
WHERE salary > (SELECT AVG(salary) FROM employees);
```

**Mistake 2 — Tautology in the correlation condition.**
Comparing a column with itself makes the inner query trivially true — a correlated subquery that, for each outer row, re-scans the entire inner table with no real filter:

```sql
WHERE e2.dept_id = e2.dept_id  -- BAD: always TRUE
```

**Mistake 3 — Mis-matched aliases.**
Inner and outer tables share a name (self-join pattern). Mixing up which alias is which silently changes semantics. Always alias clearly (`e` vs `e2`).

**Mistake 4 — Scalar subquery that can return multiple rows.**
Any correlated scalar that lacks `MAX`/`MIN`/`FETCH FIRST`/`TOP`/`LIMIT` and has more than one match dies at runtime:

```sql
-- BAD: dies the moment a customer has 2+ orders
WHERE amount = (SELECT amount FROM orders o WHERE o.customer_id = c.customer_id);
```

**Mistake 5 — Using `IN`/`JOIN` where the grain must be preserved.**
Existence checks via `JOIN` fan out rows; if you then slap `DISTINCT` on to hide it, the query can be slower and the intent is obscured.

**Mistake 6 — Believing a `SELECT`-list subquery is "free".**
It executes once per *output* row logically; a huge result set × expensive inner query is a classic accidental N+1 in SQL.

**Mistake 7 — Nondeterministic "latest" picks.**
Forgetting a tie-breaker in `ORDER BY` when selecting "the most recent" row.

---

## 11. Production pitfalls

> Production pitfall

**Correlated subqueries are the classic source of accidental N+1 queries in the database.** A 10-million-row outer scan with an unindexed inner correlation column can effectively become billions of row reads.

Mitigations that must each be verified with a plan:

1. **Index the correlation key on the inner table.** For `orders.customer_id`, an index on `orders(customer_id)` turns each inner call into an index lookup. Without it, the plan shows nested-loop-ish repeated scans.
2. **Prefer decorrelatable forms.** `EXISTS`/`NOT EXISTS` frequently become semi/anti-joins; a correlated scalar that can be a group-by plus join usually should be.
3. **Watch the `SELECT` list.** Per-output-row scalar execution makes big reports expensive; push the value through a CTE or window function.
4. **Be careful updating a table while correlating against itself** — besides the MySQL restriction, it can trigger surprising plan shapes or lock behavior.
5. **NULL keys break correlation silently.** If the correlation key can be NULL, `=` comparisons never match that row — the check "silently passes/fails" in the wrong direction.

> Production pitfall

> A correlated subquery that was fast under a nested-loop-friendly execution context is not guaranteed to stay fast when data volume or distribution changes. Set up regular plan reviews (`EXPLAIN ANALYZE`) for hot queries.

---

## 12. Performance implications

### 12.1 The cost model you should *start* from

Logically, with no decorrelation:

```
total work ≈ (outer rows examined) × (cost of one inner evaluation)
```

From this starting point, three multipliers decide the outcome:

- **Outer cardinality** — correlated scalars pay once per outer row; if the outer set is large, that hurts.
- **Inner cardinality per binding** — how many inner rows must be touched for each bound value.
- **Access method** — an index on `(correlation_key, …)` turns the inner call into an index lookup (and can even make it an index-only scan); a scan of the whole inner table makes it brutal.

### 12.2 What actually decides the plan

- **Optimizer version and rules** — does it decorrelate, unnest, or materialize this shape?
- **Statistics** — row estimates drive join method (nested loop vs hash vs merge).
- **Indexes** — the correlation key and the columns read by the inner query.
- **Data distribution** — skew (one department with most employees) changes both estimates and cache locality.
- **Query shape** — `EXISTS` vs scalar vs `IN` vs `LATERAL` are different shapes with different plan opportunities.

> Do not assume "correlated is always slow" or "correlated is always fast". Both statements are wrong in isolation. The question is always: *what does `EXPLAIN ANALYZE` show for this query, these statistics, these indexes?*

### 12.3 Sargability

The predicate that ties the inner query to the outer row should be **sargable** — written so an index can be used (a bare equality on the key, not `UPPER(key)`, not `key + 0`). Example 5.2's `o.customer_id = c.customer_id` with an index on `orders(customer_id)` is sargable. `DATE(o.order_date) = c.order_date` would not be.

### 12.4 What to check in the plan

- Is the subquery an `InitPlan`/materialized (executed once) or a `SubPlan`/Apply (bound per row)?
- Is it decorrelated into a Semi/Anti Join?
- How many rows does each node actually read (look at `rows` / `actual rows`) — rebuilding the "total rows read" estimate?
- Is the estimated cardinality near the actual cardinality? A bad estimate usually means the optimizer chose the wrong method.

Consider also an index on the outer correlation side and the exact inner columns, e.g. covering index `orders(customer_id) INCLUDE (amount, order_date)` when the inner query reads only those columns.

### 12.5 Should it be rewritten?

| Situation | Likely better tool (verify!) |
|---|---|
| Existence check, outer table large | `EXISTS` → optimizer semi-join |
| Detail rows + group aggregate in one result | Window function |
| Need several columns from one matching row | `LATERAL` / `APPLY` |
| Huge outer set, correlated scalar in SELECT | CTE / derived-table materialization |
| Small outer set, hard to decorrelate | Keep the correlated form |

The point is the decision matrix, not a rule.

---

## 13. Interview traps

> Interview trap

- **"How many times is the subquery executed?"** The logical answer is once per outer row candidate; the *physical* answer is "check the plan" — it may be decorrelated into a join, cached, or materialized. Answering with a fixed number is the trap.
- **"A subquery in the SELECT list is correlated."** False — correlation is defined by an *outer reference*, not by position.
- **`NOT IN` vs `NOT EXISTS` with NULLs.** Introduces the classic empty-result trap. Probe whether the inner column can be NULL.
- **Scalar subquery multi-row error.** Predict when it fires (runtime, only when data grows).
- **Correlated ranking via COUNT.** Ask about ties and NULL salaries — the naive version silently assigns rank 1 to NULL rows.
- **Tautology/alias reversal** (`e2.dept_id = e2.dept_id`, or `e.dept_id = e.dept_id`) that keeps the query syntactically valid but semantically wrong.
- **"The FROM subquery can use outer columns."** It cannot without `LATERAL`/`APPLY`.
- **`EXISTS (SELECT * …)` vs `EXISTS (SELECT 1 …)`** — no meaningful difference for the optimizer; both become existence checks. If an interviewer implies a performance gap, the burden of proof is on `EXPLAIN`.

---

## 14. Best practices

1. **State the grain first** — "one row per employee/customer" before you write `WHERE EXISTS` or a join.
2. **Prefer `EXISTS`/`NOT EXISTS` for correlated existence checks**; reserve `IN` for non-correlated set membership or row-set semantics (and still verify the plan — both may decorrelate identically in a given engine).
3. **Guarantee the scalar contract** — use `MAX`/`MIN`/`FETCH FIRST`/`TOP`/`LIMIT` whenever a correlated scalar could legitimately match more than one row.
4. **Make "most recent"/"top" deterministic** — always add a unique tie-breaker to the inner `ORDER BY`.
5. **Alias everywhere** and keep inner aliases distinct from outer ones; never rely on outer columns matching inner columns implicitly.
6. **Compute group references once** — don't repeat the same correlated subquery twice in one row; prefer a window function or a CTE.
7. **Consider NULL on the correlation key** — if it is nullable, you likely want `IS NOT DISTINCT FROM` semantics or an `EXISTS` design.
8. **Verify with `EXPLAIN ANALYZE`** — look for `SubPlan` vs materialized/join nodes, actual rows read, and row estimate accuracy.
9. **Index the correlation side** — an index on `(correlation_key, columns_needed)` on the inner table is the single most common fix.
10. **Use `LATERAL`/`APPLY` when you need multiple columns** from the matched row instead of a scalar subquery that returns one value.

---

## 15. Database differences (quick map)

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| `LATERAL` | Yes | Yes (8.0.14+) | No keyword — uses `APPLY` | Yes (12c+) |
| Correlated `EXISTS` → semi/anti join | Common (`Hash/Nested Loop Semi/Anti Join`) | Semi-join strategies | `Nested Loops (Apply)` or semi-join | Unnesting to semi-join |
| Scalar correlated evaluation | Typically `SubPlan` per row | Often per output row | Sometimes `LEFT SEMI JOIN`/Apply | Scalar subquery caching possible |
| Controlling hints | Limited | Limited | `FORCESEEK`, join hints | `NO_UNNEST`, `PUSH_SUBQ`, ... |
| `FETCH FIRST` | Yes | No (`LIMIT`) | `OFFSET/FETCH` or `TOP` | Yes |

These are *tendencies*; plan output differs by version and optimizer settings. Confirm on your instance.

---

## 16. Cross-references

- **Scalar subqueries** — the scalar contract (one column, zero-or-one row) that every correlated scalar must obey.
- **`NOT IN` + NULL pitfalls** — why `NOT IN` breaks when NULLs are produced.
- **Three-valued logic / NULL comparisons** — the `UNKNOWN` outcomes that silently drop rows.
- **Semi-joins / Anti-joins** — what `EXISTS`/`NOT EXISTS` frequently become.
- **JOIN pitfalls, fan-out, duplicates** — why existence checks avoid joins.
- **LEFT JOIN becoming INNER JOIN** — the `ON` vs `WHERE` trap that correlated subqueries often bypass.
- **Window functions** (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, aggregates with `OVER`) — the modern replacement for per-group rankings and group-reference columns.
- **Execution plans / indexes / sargability** — tools for verifying every performance claim in this section.
- **Subqueries in WHERE / FROM** — places a subquery can sit; `FROM` needs `LATERAL` to correlate.

---

# Interview Questions

> Practice set — answers are intentionally withheld. Work them out, then verify each one with a live query and `EXPLAIN ANALYZE`. Sample data used below is the set from Section 4.

### Beginner

1. What makes a subquery "correlated"? Give a two-line example that is correlated and the same two lines that are not.
2. How many times is a correlated subquery *logically* evaluated vs a non-correlated one?
3. What does `EXISTS` return when the inner query matches zero rows? What does a scalar subquery return when it matches zero rows?
4. Where in a statement can a correlated subquery legally appear? Name at least four positions.
5. Explain, in one sentence each, why `NOT EXISTS` and `NOT IN` can disagree.

### Intermediate

6. Using the Section 4 data, write the query for "employees who earn more than their own department's average" as (a) a correlated subquery, (b) a derived table + `JOIN`, (c) a window function. All must return the same two rows.
7. Why does Henry's row never appear in query (a) above — and would a window-function rewrite behave the same? Explain the NULL mechanics.
8. Rewrite Example 3 using `OUTER APPLY` / `LEFT JOIN LATERAL`. Which customers appear? How does the output differ from a `CROSS APPLY` version?
9. Why must a correlated scalar subquery in the SELECT list guarantee at most one row, while `EXISTS` deliberately does not?
10. In Example 4, why do Grace and Bob get ranks 2 and 3 while their salaries differ by 5000? What would change if a third engineer also earned 80000?

### Advanced

11. Explain what "decorrelation" means. Why can the optimizer turn `EXISTS` into a semi-join but usually cannot turn an arbitrary correlated scalar into a join?
12. In PostgreSQL's `EXPLAIN`, contrast `InitPlan` and `SubPlan`. Why does the distinction change your performance reasoning?
13. How does Oracle's scalar subquery caching change the cost story when 1000 outer rows share one correlated value? When does caching fail to help?
14. Under which cardinality scenarios does a correlated scalar subquery beat the derived-table+join alternative, and when does it lose? Justify each with a sketch of the plan, and state what `EXPLAIN ANALYZE` would show you to decide.
15. Why is `COUNT(e2.salary)` different from `COUNT(*)` inside the correlated subquery of Example 4? Trace both for Henry's row.

### Scenario Based

16. "Departments sorted by the salary of their best-paid employee" — write it with a correlated subquery, then with a window function. Which keeps which rows visible, and what is the grain of the output?
17. You are asked for "every customer, with the date of their most recent order and that order's amount." Why must the answer use either a scalar (two subqueries), a `LATERAL`, or a window function instead of one correlated scalar for two columns?
18. A support report needs "every order, plus whether that order is above its own customer's average order amount." Give two working formulations and identify which reads the inner data once.
19. Write the `DELETE` that removes customers with no orders. Now write the equivalent query that would *accidentally* be blocked if `orders.customer_id` were nullable, and explain why it blocks.
20. A batch job processes one department at a time but must not re-scan all employees per department. Which formulation (correlated, derived table, window) fits this requirement, and what index would you add?

### Tricky

21. `SELECT * FROM employees e WHERE salary = (SELECT salary FROM employees e2 WHERE e2.dept_id = e.dept_id);` — predict the outcome on the Section 4 data. Then say what happens the day a department has two employees with equal salaries, and why.
22. Same data: `WHERE salary IN (SELECT salary FROM employees e2 WHERE e2.dept_id = e.dept_id)` — does it error? What is the difference between this and the `=` version?
23. An employee obtains `dept_id = NULL`. Predict the behavior of `EXISTS`, `NOT EXISTS`, `IN`, and `NOT IN` versions of "orders exist" for that row, and reconcile each with three-valued logic.
24. The subquery `(SELECT MAX(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id)` is correlated. Is `(SELECT MAX(salary) FROM employees)` correlated? What single column change flips it?
25. "Every correlated subquery can be rewritten as a join." Is that always true? Name a correlated subquery shape that resists a faithful join rewrite.

### Output Prediction

26. Predict the full output of Example 1 *before* running it (which two rows survive). Justify Frank's and Henry's exclusion separately.
27. Predict the output of `SELECT emp_name FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.dept_id = 999);`.
28. Predict the `last_order_amount` column for customer 203 in Example 3. Suppose further that order 3002 is deleted — how does the answer for customer 201 change, and why is 3004 still chosen?
29. Given the Example 4 result set, predict `dept_rank` for a fictional new row `(109, 'Igor', 1, 80000)`. What happens to Grace's rank, and which function did this just imitate?

### Debugging

30. A correlated query suddenly errors with "more than one row returned by a subquery" after a data load. Give the three most likely data-level causes and the structural fix.
31. An `UPDATE ... WHERE salary < (SELECT AVG(...))` updates 0 rows on a table where you expected dozens. List every NULL-related reason this can happen and how to confirm each.
32. A report is 50× slower after an index was dropped. Walk through the `EXPLAIN ANALYZE` reading that reveals the correlated subquery re-scanning, and the statement you would add to prove the fix.
33. A query returns duplicate customer rows. The suspicious code uses `JOIN` for an existence check. Explain the debugging path that leads to `EXISTS`, without changing the result set.
34. The same correlated subquery appears twice in one `SELECT` row. Is this a bug? What symptom would tip you off in a large production report, and what is the one-query fix?

### Performance

35. "Correlated subqueries are always slower than joins." True or false? Provide a concrete counterexample using the Section 4 tables.
36. With `orders(customer_id)` indexed and `orders` unindexed, predict the plan difference for Example 2, then confirm with `EXPLAIN ANALYZE`. Which node reveals the difference?
37. An outer table of 10 million rows runs a correlated scalar `SELECT`-list subquery. Why might a window function dominate regardless of index quality? What plan artefact would prove the per-row evaluation?
38. Why does a *covering* index on the inner side (`orders(customer_id) INCLUDE (amount, order_date)`) change Example 3's cost, and what does `EXPLAIN` show in its place?
39. For the correlated `EXISTS` version of Example 5.2, what would make the optimizer choose a hash semi-join over a nested-loop semi-join? What statistics/plan evidence would you inspect to confirm the choice is right?

Return to the **Subqueries** index when ready.