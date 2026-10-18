# 53 — Top-N Per Group

## The Problem

You need the **highest**, **lowest**, **most recent**, or **N best** rows **within each group**.

Examples:

- The 3 highest-paid employees per department
- The 2 most recent orders per customer
- The top-selling product per category
- The earliest login per user per day

This is one of the **most common SQL interview patterns** and one of the most frequently misunderstood.

---

## Grain Reminder

Before writing any Top-N query, always answer:

> **What does one row in my source table represent?**

| Table         | Grain                                   |
| ------------- | --------------------------------------- |
| `employees`   | One row = one employee                  |
| `orders`      | One row = one order                     |
| `order_items` | One row = one line item within an order |
| `logins`      | One row = one login event               |

If you join a one-to-many table without thinking about grain, your Top-N logic can silently produce **wrong results**.

---

## Sample Tables

```sql
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    employee_name VARCHAR(100),
    department    VARCHAR(50),
    salary        DECIMAL(10,2),
    hire_date     DATE
);

INSERT INTO employees VALUES
(1,  'Alice',   'Engineering', 120000, '2019-03-15'),
(2,  'Bob',     'Engineering', 110000, '2020-06-01'),
(3,  'Charlie', 'Engineering', 130000, '2018-01-20'),
(4,  'Diana',   'Marketing',   95000,  '2021-02-10'),
(5,  'Eve',     'Marketing',   88000,  '2022-07-25'),
(6,  'Frank',   'Marketing',   95000,  '2019-11-30'),
(7,  'Grace',   'Sales',       105000, '2020-04-18'),
(8,  'Hank',    'Sales',       105000, '2018-09-12'),
(9,  'Ivy',     'Sales',       92000,  '2023-01-05'),
(10, 'Jack',    'Sales',       87000,  '2023-08-20');
```

**Grain:** One row = one employee.

---

## Method 1 — `ROW_NUMBER()` (Most Common)

### What It Is

`ROW_NUMBER()` assigns a **unique sequential integer** to each row within a partition, ordered by a specified column. **No ties** — every row gets a distinct number.

### Syntax

```sql
SELECT *
FROM (
    SELECT
        employee_name,
        department,
        salary,
        ROW_NUMBER() OVER (
            PARTITION BY department
            ORDER BY salary DESC, employee_id
        ) AS rn
    FROM employees
) ranked
WHERE rn <= 2;
```

> **Why include `employee_id` in the `ORDER BY`?**
> Without a tiebreaker, the order of rows with identical `salary` values is **nondeterministic**. Different execution plans, parallelism, or data modifications can change which rows get `rn = 1` vs `rn = 2`. Adding a unique column makes the result **stable and repeatable**.

### Expected Output

| employee_name | department  | salary | rn  |
| ------------- | ----------- | ------ | --- |
| Charlie       | Engineering | 130000 | 1   |
| Alice         | Engineering | 120000 | 2   |
| Diana         | Marketing   | 95000  | 1   |
| Frank         | Marketing   | 95000  | 2   |
| Grace         | Sales       | 105000 | 1   |
| Hank          | Sales       | 105000 | 2   |

Notice: Diana and Frank both earn 95000. `ROW_NUMBER` assigns them 1 and 2 **arbitrarily** (here deterministic because `employee_id` breaks the tie). Without the tiebreaker, which one gets `rn = 1` can change between runs.

---

## Method 2 — `RANK()`

### What It Is

`RANK()` assigns the **same rank** to tied rows and **skips** subsequent ranks.

### Example

```sql
SELECT
    employee_name,
    department,
    salary,
    RANK() OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS rnk
FROM employees
WHERE department = 'Sales';
```

### Output

| employee_name | department | salary | rnk   |
| ------------- | ---------- | ------ | ----- |
| Grace         | Sales      | 105000 | 1     |
| Hank          | Sales      | 105000 | 1     |
| Ivy           | Sales      | 92000  | **3** |
| Jack          | Sales      | 87000  | 4     |

Grace and Hank tie at rank 1. The next rank is **3**, not 2.

### When to Use for Top-N

If you use `RANK()` and filter `WHERE rnk <= 2`, you get **3 rows** (both tied at 1, plus Ivy at 3). This is usually **not** what people mean by "top 2."

> **Interview trap:** "Get the top 2 employees by salary in each department." If two employees tie at rank 1, `RANK() <= 2` returns 3 rows. Clarify with the interviewer whether ties should be included.

---

## Method 3 — `DENSE_RANK()`

### What It Is

`DENSE_RANK()` assigns the **same rank** to tied rows but does **not skip** subsequent ranks.

### Example

```sql
SELECT
    employee_name,
    department,
    salary,
    DENSE_RANK() OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS dense_rnk
FROM employees
WHERE department = 'Sales';
```

### Output

| employee_name | department | salary | dense_rnk |
| ------------- | ---------- | ------ | --------- |
| Grace         | Sales      | 105000 | 1         |
| Hank          | Sales      | 105000 | 1         |
| Ivy           | Sales      | 92000  | **2**     |
| Jack          | Sales      | 87000  | 3         |

### Comparison: ROW_NUMBER vs RANK vs DENSE_RANK

| Function       | Ties               | Skips Ranks | Unique per row |
| -------------- | ------------------ | ----------- | -------------- |
| `ROW_NUMBER()` | Different numbers  | N/A         | Yes            |
| `RANK()`       | Same rank, skip    | Yes         | No             |
| `DENSE_RANK()` | Same rank, no skip | No          | No             |

> **Which one to use for "top N"?**
> It depends on the business requirement. **Always clarify.**

---

## Method 4 — Correlated Subquery

### Syntax

```sql
SELECT e1.*
FROM employees e1
WHERE (
    SELECT COUNT(*)
    FROM employees e2
    WHERE e2.department = e1.department
      AND (e2.salary > e1.salary
           OR (e2.salary = e1.salary AND e2.employee_id < e1.employee_id))
) < 2;
```

### How It Works

For each employee, count how many colleagues in the same department earn more (or tie-break with `employee_id`). If fewer than 2, the employee is in the top 2.

### When to Use

- When you cannot use window functions (very rare in modern databases)
- In some database-specific contexts where window functions are unavailable

### Why Not Prefer This

- **Performance:** The correlated subquery executes once per row — O(n²) in the worst case.
- **Readability:** Far harder to understand than the window function approach.

> **Production pitfall:** On large tables, correlated subqueries for Top-N are significantly slower than window functions. Always check the execution plan.

---

## Method 5 — LATERAL JOIN / CROSS APPLY

### What It Is

`LATERAL` (PostgreSQL, MySQL 8+) and `CROSS APPLY` (SQL Server, Oracle) allow a subquery to reference columns from the preceding table in a `FROM` clause.

### PostgreSQL / MySQL Syntax

```sql
SELECT d.department, t.*
FROM (SELECT DISTINCT department FROM employees) d
CROSS JOIN LATERAL (
    SELECT employee_name, salary
    FROM employees e
    WHERE e.department = d.department
    ORDER BY salary DESC
    LIMIT 2
) t;
```

### SQL Server Syntax

```sql
SELECT d.department, t.*
FROM (SELECT DISTINCT department FROM employees) d
CROSS APPLY (
    SELECT TOP (2) employee_name, salary
    FROM employees e
    WHERE e.department = d.department
    ORDER BY salary DESC
) t;
```

### How It Works

For each department, the lateral subquery runs independently and returns at most 2 rows. This is conceptually a **per-group limit**.

### When to Use

- When you want a clean `LIMIT` / `TOP` per group without window functions
- When the optimizer can push the limit down efficiently
- PostgreSQL's `LATERAL` can be very efficient because it avoids materializing the full partition

### Edge Case

If a department has **fewer than 2 employees**, the result includes only the existing rows. This is usually the desired behavior.

---

## Method 6 — `UNION ALL` with Pre-aggregation

### Syntax

```sql
-- Top 1 per department (highest salary)
SELECT *
FROM employees
WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department = employees.department);

-- Top 2 per department using UNION ALL
(
    SELECT * FROM employees e1
    WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department = e1.department)
)
UNION ALL
(
    SELECT * FROM employees e1
    WHERE salary = (
        SELECT MAX(salary) FROM employees e2
        WHERE e2.department = e1.department
          AND e2.salary < (
              SELECT MAX(salary) FROM employees e3
              WHERE e3.department = e1.department
          )
    )
);
```

### Why Not Prefer This

- Does not scale to Top-N (you need N subqueries)
- Hard to read and maintain
- The correlated subqueries can be slow

---

## Comparison of All Methods

| Method                    | Readability | Performance  | Scales to any N    | DB Support                               |
| ------------------------- | ----------- | ------------ | ------------------ | ---------------------------------------- |
| `ROW_NUMBER()`            | Excellent   | Good         | Yes                | All modern                               |
| `RANK()`                  | Good        | Good         | Yes (clarify ties) | All modern                               |
| `DENSE_RANK()`            | Good        | Good         | Yes (clarify ties) | All modern                               |
| Correlated Subquery       | Poor        | Poor (O(n²)) | Yes                | All                                      |
| `LATERAL` / `CROSS APPLY` | Good        | Good         | Yes                | PostgreSQL, MySQL 8+, SQL Server, Oracle |
| `UNION ALL` trick         | Very Poor   | Poor         | No                 | All                                      |

---

## Scenario-Based Examples

### Scenario 1: Most Recent Order Per Customer

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  TIMESTAMP,
    amount      DECIMAL(10,2)
);

-- Grain: one row = one order
```

```sql
SELECT *
FROM (
    SELECT
        order_id,
        customer_id,
        order_date,
        amount,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY order_date DESC
        ) AS rn
    FROM orders
) ranked
WHERE rn = 1;
```

**When to use `ROW_NUMBER` here:** You want exactly one row per customer. Ties (two orders at the exact same timestamp) are broken arbitrarily. If you want both orders in the tie, use `RANK()`.

---

### Scenario 2: Top 3 Products by Revenue Per Category

```sql
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100),
    category     VARCHAR(50)
);

CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY,
    order_id      INT,
    product_id    INT,
    quantity      INT,
    unit_price    DECIMAL(10,2)
);

-- Grain: order_items = one row per line item per order
```

> **Production pitfall — double counting:**
> If you join `order_items` directly and rank by `SUM(quantity * unit_price)`, you must `GROUP BY` first. Ranking **before** aggregation gives wrong results.

**BAD APPROACH — ranking before aggregating:**

```sql
-- WRONG: this ranks individual line items, not product totals
SELECT *
FROM (
    SELECT
        p.product_name,
        p.category,
        oi.quantity * oi.unit_price AS line_total,
        ROW_NUMBER() OVER (
            PARTITION BY p.category
            ORDER BY oi.quantity * oi.unit_price DESC
        ) AS rn
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
) ranked
WHERE rn <= 3;
```

This returns the 3 largest **individual line items** per category, not the 3 products with the highest **total revenue**.

**BETTER APPROACH — aggregate first, then rank:**

```sql
WITH product_revenue AS (
    SELECT
        p.category,
        p.product_name,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
    GROUP BY p.category, p.product_name
)
SELECT *
FROM (
    SELECT
        category,
        product_name,
        total_revenue,
        ROW_NUMBER() OVER (
            PARTITION BY category
            ORDER BY total_revenue DESC
        ) AS rn
    FROM product_revenue
) ranked
WHERE rn <= 3;
```

**Why this is correct:** The CTE computes one row per product with its total revenue. Then `ROW_NUMBER` ranks those aggregated rows. The grain after the CTE is **one row per product per category**.

---

### Scenario 3: Employees Earning Above Average in Their Department

```sql
WITH dept_stats AS (
    SELECT
        department,
        AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department
)
SELECT e.*
FROM employees e
JOIN dept_stats d ON d.department = e.department
WHERE e.salary > d.avg_salary;
```

This is not strictly Top-N, but it illustrates a common **per-group comparison** pattern that is closely related.

---

### Scenario 4: Second Highest Salary Per Department

```sql
SELECT *
FROM (
    SELECT
        employee_name,
        department,
        salary,
        DENSE_RANK() OVER (
            PARTITION BY department
            ORDER BY salary DESC
        ) AS rn
    FROM employees
) ranked
WHERE rn = 2;
```

### Output

| employee_name | department  | salary | rn  |
| ------------- | ----------- | ------ | --- |
| Alice         | Engineering | 110000 | 2   |
| Frank         | Marketing   | 95000  | 2   |
| Ivy           | Sales       | 92000  | 2   |

Note: If two employees tie for the highest salary, `DENSE_RANK() = 2` gives the **actual** second-highest salary. `RANK() = 2` would skip it. `ROW_NUMBER() = 2` would give the second row, which might still be the highest salary.

> **Interview trap:** "Find the second highest salary." The answer depends on how you handle ties. Clarify.

---

### Scenario 5: Top-N with Ties Using a CTE and COUNT

If you want **all employees** whose salary is in the top 2 **distinct** salary values per department (i.e., include all ties):

```sql
WITH distinct_salaries AS (
    SELECT DISTINCT department, salary
    FROM employees
),
ranked_salaries AS (
    SELECT
        department,
        salary,
        DENSE_RANK() OVER (
            PARTITION BY department
            ORDER BY salary DESC
        ) AS salary_rank
    FROM distinct_salaries
)
SELECT e.*
FROM employees e
JOIN ranked_salaries rs
    ON rs.department = e.department
   AND rs.salary = e.salary
WHERE rs.salary_rank <= 2;
```

**Why this works:** First find the distinct salary values, rank them, then join back to get all employees whose salary matches a top-2 distinct value.

---

## Edge Cases

### Edge Case 1: Groups with Fewer Than N Rows

If a department has only 1 employee and you ask for Top 3, you get 1 row. Window functions handle this gracefully — no error, no padding.

```sql
-- Department with 1 employee still returns that employee
SELECT *
FROM (
    SELECT
        employee_name,
        department,
        salary,
        ROW_NUMBER() OVER (
            PARTITION BY department
            ORDER BY salary DESC
        ) AS rn
    FROM employees
) ranked
WHERE rn <= 3;
```

### Edge Case 2: Empty Groups

If a department has **zero** employees (e.g., a `departments` table with no matching `employees`), a `LEFT JOIN` + window function approach handles this. A subquery approach might miss or include the empty group depending on implementation.

### Edge Case 3: All Rows Tie

If every employee in a department has the same salary:

- `ROW_NUMBER()` assigns 1, 2, 3, … (arbitrary order without tiebreaker)
- `RANK()` assigns 1, 1, 1, …
- `DENSE_RANK()` assigns 1, 1, 1, …

Filtering `WHERE rn <= 2` with `ROW_NUMBER` gives exactly 2 rows. With `RANK`/`DENSE_RANK`, it gives all rows.

### Edge Case 4: NULL in ORDER BY Column

```sql
ROW_NUMBER() OVER (
    PARTITION BY department
    ORDER BY salary DESC NULLS LAST  -- PostgreSQL
) AS rn
```

> **PostgreSQL:** `NULLS LAST` / `NULLS FIRST` is supported.
> **MySQL:** NULLs sort as the **highest** value in ascending order, lowest in descending. No `NULLS LAST` syntax.
> **SQL Server:** NULLs sort as the **lowest** value (appear first in ASC, last in DESC). No `NULLS LAST` syntax.
> **Oracle:** `NULLS LAST` / `NULLS FIRST` is supported.

Always consider where NULLs land in your ordering.

---

## NULL Behavior

### NULL in Partition Column

If `department` is NULL, all rows with `NULL` department are placed in **one partition**. This is consistent across all databases — `NULL = NULL` for `PARTITION BY`.

### NULL in ORDER BY Column

As discussed above, the position of NULLs depends on the database:

| Database   | `ORDER BY salary DESC`                             | NULLs position              |
| ---------- | -------------------------------------------------- | --------------------------- |
| PostgreSQL | Explicit `NULLS LAST` needed for predictable order | Default: NULLs last in DESC |
| MySQL      | NULLs treated as lowest value in DESC              | NULLs last                  |
| SQL Server | NULLs treated as lowest value in DESC              | NULLs last                  |
| Oracle     | Explicit `NULLS LAST` needed for predictable order | Default: NULLs last in DESC |

> **Production pitfall:** If your `ORDER BY` column contains NULLs and you don't specify `NULLS LAST`/`NULLS FIRST`, results may be inconsistent across database upgrades or migration.

### NULL in Tiebreaker Column

If your tiebreaker column (e.g., `employee_id`) is NULL, it participates in `ORDER BY` as the lowest or highest value depending on the database. Since `employee_id` is typically a `PRIMARY KEY`, this is rarely an issue, but in derived or nullable columns it matters.

---

## Common Mistakes

### Mistake 1: Using WHERE Instead of a Subquery/CTE

```sql
-- WRONG: filters rows BEFORE window function executes
SELECT
    employee_name,
    department,
    salary,
    ROW_NUMBER() OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS rn
FROM employees
WHERE rn <= 2;  -- ERROR: rn is not defined yet
```

The `WHERE` clause executes **before** the `SELECT`, so `rn` doesn't exist yet. You must wrap the window function in a subquery or CTE.

```sql
-- CORRECT
SELECT *
FROM (
    SELECT
        employee_name,
        department,
        salary,
        ROW_NUMBER() OVER (
            PARTITION BY department
            ORDER BY salary DESC
        ) AS rn
    FROM employees
) ranked
WHERE rn <= 2;
```

> **PostgreSQL note:** PostgreSQL supports `WHERE` with window function aliases in some contexts via `WHERE ... = <alias>` but not filtering on them. Always wrap.

### Mistake 2: Missing Tiebreaker in ORDER BY

```sql
-- NONDETERMINISTIC if salaries tie
ROW_NUMBER() OVER (
    PARTITION BY department
    ORDER BY salary DESC
) AS rn
```

Without a tiebreaker, which row gets `rn = 1` when salaries tie is **implementation-dependent**. Always add a unique column.

### Mistake 3: Ranking Before Aggregating

See **Scenario 2** above. This is the most common and most dangerous mistake. It produces plausible-looking but **wrong** results.

### Mistake 4: Using `DISTINCT` Instead of Proper Top-N

```sql
-- WRONG: DISTINCT does not give "top N per group"
SELECT DISTINCT department, salary
FROM employees
ORDER BY salary DESC;
```

`DISTINCT` eliminates duplicate rows from the **entire result set**, it doesn't select the top N per group.

### Mistake 5: Confusing RANK, DENSE_RANK, and ROW_NUMBER

Using the wrong ranking function gives different results:

| Scenario                             | ROW_NUMBER | RANK    | DENSE_RANK |
| ------------------------------------ | ---------- | ------- | ---------- |
| Salary 130K, 120K, 110K (no ties)    | 1, 2, 3    | 1, 2, 3 | 1, 2, 3    |
| Salary 130K, 130K, 110K (tie at top) | 1, 2, 3    | 1, 1, 3 | 1, 1, 2    |
| Filter `<= 2` rows                   | 2 rows     | 3 rows  | 2 rows     |

---

## Production Pitfalls

### Pitfall 1: Non-Deterministic Results Without Tiebreakers

Without a tiebreaker, **the same query can return different results on different runs**. This causes:

- Bugs in applications that cache or paginate results
- Inconsistent reports
- Flaky tests

**Fix:** Always include a unique column as the last `ORDER BY` element.

### Pitfall 2: Window Functions Over Large Partitions

If one partition contains millions of rows (e.g., one department with 1 million employees), the database must sort all 1 million rows before assigning row numbers.

**Mitigation:**

- Ensure indexes support the `PARTITION BY` and `ORDER BY` columns
- Consider whether a `LATERAL`/`CROSS APPLY` approach (which can stop after N rows) is more efficient
- Use `EXPLAIN ANALYZE` to verify

### Pitfall 3: Using Top-N Logic for Pagination

Top-N per group is different from pagination. Don't confuse:

```sql
-- Top 10 per group
ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) <= 10

-- Page 2 of all employees (10 per page)
OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY
```

See Section on **Pagination** for the distinction.

### Pitfall 4: Modifying Data While Running Top-N Queries

If rows are inserted or deleted while a Top-N query runs, the ranking might be inconsistent within a single transaction unless you use proper isolation (e.g., `REPEATABLE READ` or a snapshot).

---

## Performance Implications

### Index Strategy

The most effective index for a Top-N per group query:

```sql
CREATE INDEX idx_emp_dept_salary ON employees (department, salary DESC, employee_id);
```

This index supports:

1. **Partition pruning** — the database can scan one department at a time
2. **Pre-sorted order** — no sort step needed
3. **Limit pushdown** — the database can stop after N rows per partition

### What to Check in the Execution Plan

Run `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL), or the equivalent for your database. Look for:

| Good Signs                   | Bad Signs                                           |
| ---------------------------- | --------------------------------------------------- |
| Index Scan / Index Only Scan | Full Table Scan                                     |
| Limit / Top-N Sort           | Filesort / Sort (on full partition)                 |
| Nested Loop with LATERAL     | Hash Join on full table before ranking              |
| Partition-wise processing    | Materializing entire ranked result before filtering |

> **Do not guess about performance.** Run `EXPLAIN ANALYZE` with realistic data volumes and verify.

### LATERAL vs Window Function Performance

| Aspect                                        | Window Function           | LATERAL / CROSS APPLY          |
| --------------------------------------------- | ------------------------- | ------------------------------ |
| Materializes all ranked rows before filtering | Yes (typically)           | No — can stop at N             |
| Works with GROUP BY                           | Yes (via CTE/subquery)    | Requires more steps            |
| Index usage                                   | Depends on partition size | Excellent with per-group index |
| Readability                                   | Excellent                 | Good                           |

For **very large** partitions where you need only a small N, `LATERAL` can outperform window functions because it avoids sorting the entire partition. However, for most practical cases, the window function approach is equally fast and more readable.

### Cardinality and Data Distribution

- If most groups are **small** (< 100 rows), window functions are fast regardless
- If some groups are **very large** (millions of rows) and you need Top 1, `LATERAL` with an index is often better
- If the data is **uniformly distributed**, the optimizer can usually parallelize window functions effectively

---

## Interview Questions

### Beginner

1. Write a query to find the highest-paid employee in each department.
2. What is the difference between `ROW_NUMBER()` and `RANK()`?
3. Can you use `WHERE rn = 1` directly in the same `SELECT` that defines `rn`? Why or why not?
4. What happens to rows in a group that has fewer than N rows when you use `ROW_NUMBER() <= N`?

### Intermediate

5. Write a query to find the second highest salary in each department.
6. How would you find all employees whose salary is in the top 3 **distinct** salary values in their department?
7. What is the effect of not including a tiebreaker in the `ORDER BY` of `ROW_NUMBER()`?
8. Write a query using `LATERAL JOIN` (or `CROSS APPLY`) to get the 2 most recent orders per customer.
9. How does `NULL` in the `PARTITION BY` column affect grouping?

### Advanced

10. You have a table with 100 million rows and 10,000 distinct groups. You need the top 1 row per group. Which approach would you recommend and why? What index would you create?
11. Explain the performance difference between these two queries and how you would verify it:

    **Query A:**

    ```sql
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) rn
        FROM employees
    ) t WHERE rn = 1;
    ```

    **Query B:**

    ```sql
    SELECT e1.*
    FROM employees e1
    LEFT JOIN employees e2
        ON e1.dept = e2.dept AND e1.salary < e2.salary
    WHERE e2.employee_id IS NULL;
    ```

12. How would you handle the case where you want exactly N rows per group, even if ties would normally cause more rows to appear?

### Scenario Based

13. You are asked: "Get the top 5 customers by total spend per region." The table `orders` has columns `(order_id, customer_id, region, amount, order_date)`. Write the query. What grain must the intermediate result be before ranking?

14. A stakeholder says: "We need the 3 most popular products per category." The `order_items` table has `(product_id, quantity)`. The `products` table has `(product_id, category, name)`. How do you define "most popular" — by total quantity sold or by number of orders? How does this choice change your query?

15. You notice that your Top-N query returns different results each time it runs. What is the most likely cause, and how do you fix it?

### Tricky

16. What is the result of this query? Walk through the logic step by step:

    ```sql
    SELECT *
    FROM (
        SELECT
            employee_name,
            department,
            salary,
            RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
        FROM employees
    ) t
    WHERE rnk <= 2;
    ```

    How many rows are returned? Why?

17. Two engineers write:

    **Engineer A:**

    ```sql
    SELECT * FROM (
        SELECT *, DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC) rn
        FROM employees
    ) t WHERE rn <= 2;
    ```

    **Engineer B:**

    ```sql
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) rn
        FROM employees
    ) t WHERE rn <= 2;
    ```

    Under what data conditions do these return different results? Give a concrete example.

### Output Prediction

18. Given this data and query, predict the output:

    ```sql
    CREATE TABLE scores (
        student  VARCHAR(20),
        subject  VARCHAR(20),
        score    INT
    );

    INSERT INTO scores VALUES
    ('Alice', 'Math', 95),
    ('Alice', 'Science', 88),
    ('Bob', 'Math', 95),
    ('Bob', 'Science', 92),
    ('Charlie', 'Math', 78),
    ('Charlie', 'Science', 95);
    ```

    ```sql
    SELECT *
    FROM (
        SELECT
            student,
            subject,
            score,
            DENSE_RANK() OVER (PARTITION BY subject ORDER BY score DESC) AS rnk
        FROM scores
    ) t
    WHERE rnk = 1;
    ```

    How many rows? Which students and subjects?

### Debugging

19. The following query returns 4 rows per department instead of 3. Identify the bug:

    ```sql
    SELECT *
    FROM (
        SELECT
            employee_name,
            department,
            salary,
            ROW_NUMBER() OVER (
                PARTITION BY department
                ORDER BY salary
            ) AS rn
        FROM employees
    ) ranked
    WHERE rn <= 3;
    ```

20. A developer writes this query and gets an error. What is wrong?

    ```sql
    SELECT
        department,
        employee_name,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
    WHERE rn <= 2;
    ```

### Performance

21. You have a table `events` with 500 million rows, partitioned by `user_id` (10 million distinct users). You need the most recent event per user. You have an index on `(user_id, event_time DESC)`. Will the window function approach use this index effectively? What would you look for in the execution plan?

22. Compare the `LATERAL JOIN` approach vs the `ROW_NUMBER()` approach for getting the top 1 row per group on a table with 10 million rows and 100 groups. Under what conditions might one be significantly faster than the other?

---

# Interview Questions
