# RANK vs DENSE_RANK

## Fundamentals

**RANK** and **DENSE_RANK** are window functions that assign a ranking number to each row within a partition based on a specified ordering. Both handle ties identically — rows with the same value in the ORDER BY clause receive the same rank. The critical difference lies in how they handle gaps after ties.

| Function | Ties | Gap After Tie |
|----------|------|---------------|
| `RANK()` | Same rank for equal values | Yes — skips next rank(s) |
| `DENSE_RANK()` | Same rank for equal values | No — consecutive ranks |

> Common misconception: "RANK and DENSE_RANK are the same thing except for cosmetic formatting." They are not. Choosing the wrong one can silently produce incorrect business logic — e.g., "top 3 customers" returning 5 rows with RANK but exactly 3 with DENSE_RANK.

---

## Syntax

```sql
RANK() OVER (
    [PARTITION BY partition_expression]
    ORDER BY sort_expression [ASC | DESC]
    [NULLS FIRST | NULLS LAST]
)

DENSE_RANK() OVER (
    [PARTITION BY partition_expression]
    ORDER BY sort_expression [ASC | DESC]
    [NULLS FIRST | NULLS LAST]
)
```

- **PARTITION BY** — Divides rows into groups. Each partition starts ranking from 1. Without it, the entire result set is one partition.
- **ORDER BY** — Determines the ranking order. The column(s) here define what values are compared for ties.
- **NULLS FIRST / NULLS LAST** — Controls where NULLs rank. Behavior is database-specific (see below).

> PostgreSQL: Supports `NULLS FIRST` and `NULLS LAST` explicitly.  
> MySQL: NULLs are treated as the lowest value (equivalent to `NULLS LAST` in ascending order).  
> SQL Server: NULLs sort as the lowest value by default in ascending order.  
> Oracle: `NULLS LAST` is default for ascending, `NULLS FIRST` for descending.

---

## Sample Tables

### employees

One row per employee.

| employee_id | name       | department | salary | hire_date  |
|-------------|------------|------------|--------|------------|
| 1           | Alice      | Engineering| 95000  | 2019-03-15 |
| 2           | Bob        | Engineering| 85000  | 2020-06-01 |
| 3           | Carol      | Engineering| 85000  | 2021-01-10 |
| 4           | Dave       | Engineering| 75000  | 2022-09-20 |
| 5           | Eve        | Marketing  | 70000  | 2020-04-12 |
| 6           | Frank      | Marketing  | 70000  | 2021-08-05 |
| 7           | Grace      | Marketing  | 65000  | 2023-02-28 |
| 8           | Hank       | Sales      | 80000  | 2018-11-30 |
| 9           | Ivy        | Sales      | 80000  | 2019-07-14 |
| 10          | Jack       | Sales      | 80000  | 2020-03-22 |
| 11          | Karen      | Sales      | 60000  | 2023-06-01 |

### products

One row per product.

| product_id | product_name | category  | price |
|------------|--------------|-----------|-------|
| 101        | Widget A     | Electronics| 29.99 |
| 102        | Widget B     | Electronics| 29.99 |
| 103        | Widget C     | Electronics| 19.99 |
| 104        | Gadget X     | Clothing  | 49.99 |
| 105        | Gadget Y     | Clothing  | NULL  |

### scores

One row per student per test.

| student_id | test_date  | score |
|------------|------------|-------|
| 1          | 2024-01-15 | 95    |
| 2          | 2024-01-15 | 95    |
| 3          | 2024-01-15 | 90    |
| 4          | 2024-01-15 | 85    |
| 5          | 2024-01-15 | NULL   |

---

## How RANK and DENSE_RANK Work Internally

### RANK

1. Sort rows within each partition according to ORDER BY.
2. Assign rank 1 to the first row (or first group of tied rows).
3. For tied rows, assign the same rank.
4. The next rank after a tie of N rows is current_rank + N (skips N-1 values).

Example: Ranks 1, 1, 1, 4, 5 — three rows tied at rank 1, so rank 2 and 3 are skipped.

### DENSE_RANK

1. Sort rows within each partition according to ORDER BY.
2. Assign rank 1 to the first row (or first group of tied rows).
3. For tied rows, assign the same rank.
4. The next rank after any tie is always current_rank + 1 (no gaps).

Example: Ranks 1, 1, 1, 2, 3 — three rows tied at rank 1, next distinct value gets rank 2.

---

## Core Comparison — No Partition

### Query

```sql
SELECT
    employee_id,
    name,
    department,
    salary,
    RANK()       OVER (ORDER BY salary DESC) AS rank_val,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank_val
FROM employees
ORDER BY salary DESC, name;
```

### Expected Output

| employee_id | name   | department  | salary | rank_val | dense_rank_val |
|-------------|--------|-------------|--------|----------|----------------|
| 1           | Alice  | Engineering | 95000  | 1        | 1              |
| 2           | Bob    | Engineering | 85000  | 2        | 2              |
| 3           | Carol  | Engineering | 85000  | 2        | 2              |
| 8           | Hank   | Sales       | 80000  | 4        | 3              |
| 9           | Ivy    | Sales       | 80000  | 4        | 3              |
| 10          | Jack   | Sales       | 80000  | 4        | 3              |
| 4           | Dave   | Engineering | 75000  | 7        | 4              |
| 5           | Eve    | Marketing   | 70000  | 8        | 5              |
| 6           | Frank  | Marketing   | 70000  | 8        | 5              |
| 7           | Grace  | Marketing   | 65000  | 10       | 6              |
| 11          | Karen  | Sales       | 60000  | 11       | 7              |

**Key observations:**

- Bob and Carol both earn 85000. Both get `rank_val = 2`. The next employee (Hank) gets `rank_val = 4` (skipping 3). With `DENSE_RANK`, Hank gets `dense_rank_val = 3` (no skip).
- Hank, Ivy, and Jack all earn 80000. RANK assigns them all rank 4, then Dave gets rank 7 (skipping 5 and 6). DENSE_RANK assigns them all rank 3, Dave gets rank 4.

---

## Partitioned Ranking

### Query — Rank Within Each Department

```sql
SELECT
    employee_id,
    name,
    department,
    salary,
    RANK()       OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
    DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_dense_rank
FROM employees
ORDER BY department, salary DESC, name;
```

### Expected Output

| employee_id | name   | department  | salary | dept_rank | dept_dense_rank |
|-------------|--------|-------------|--------|-----------|-----------------|
| 1           | Alice  | Engineering | 95000  | 1         | 1               |
| 2           | Bob    | Engineering | 85000  | 2         | 2               |
| 3           | Carol  | Engineering | 85000  | 2         | 2               |
| 4           | Dave   | Engineering | 75000  | 4         | 3               |
| 5           | Eve    | Marketing   | 70000  | 1         | 1               |
| 6           | Frank  | Marketing   | 70000  | 1         | 1               |
| 7           | Grace  | Marketing   | 65000  | 3         | 2               |
| 8           | Hank   | Sales       | 80000  | 1         | 1               |
| 9           | Ivy    | Sales       | 80000  | 1         | 1               |
| 10          | Jack   | Sales       | 80000  | 1         | 1               |
| 11          | Karen  | Sales       | 60000  | 4         | 2               |

**Key observations:**

- In Marketing, Eve and Frank tie at rank 1. Grace gets `dept_rank = 3` (gap) but `dept_dense_rank = 2` (no gap).
- In Sales, three employees tie at rank 1. Karen gets `dept_rank = 4` but `dept_dense_rank = 2`.

---

## Scenario: Top N Per Group

### Problem: "Get the top 2 highest-paid employees per department."

#### BAD APPROACH — Using RANK

```sql
SELECT *
FROM (
    SELECT
        employee_id,
        name,
        department,
        salary,
        RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk <= 2;
```

**Result — returns more than 2 per department when ties exist:**

| employee_id | name   | department  | salary | rnk |
|-------------|--------|-------------|--------|-----|
| 1           | Alice  | Engineering | 95000  | 1   |
| 2           | Bob    | Engineering | 85000  | 2   |
| 3           | Carol  | Engineering | 85000  | 2   |
| 5           | Eve    | Marketing   | 70000  | 1   |
| 6           | Frank  | Marketing   | 70000  | 1   |
| 8           | Hank   | Sales       | 80000  | 1   |
| 9           | Ivy    | Sales       | 80000  | 1   |
| 10          | Jack   | Sales       | 80000  | 1   |

Engineering returns 3 rows, Sales returns 3 rows — neither is exactly "top 2."

#### BETTER APPROACH — Using DENSE_RANK

```sql
SELECT *
FROM (
    SELECT
        employee_id,
        name,
        department,
        salary,
        DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS drnk
    FROM employees
) ranked
WHERE drnk <= 2;
```

**Result — exactly the top 2 distinct salary levels per department:**

| employee_id | name   | department  | salary | drnk |
|-------------|--------|-------------|--------|------|
| 1           | Alice  | Engineering | 95000  | 1    |
| 2           | Bob    | Engineering | 85000  | 2    |
| 3           | Carol  | Engineering | 85000  | 2    |
| 5           | Eve    | Marketing   | 70000  | 1    |
| 6           | Frank  | Marketing   | 70000  | 1    |
| 7           | Grace  | Marketing   | 65000  | 2    |
| 8           | Hank   | Sales       | 80000  | 1    |
| 9           | Ivy    | Sales       | 80000  | 1    |
| 10          | Jack   | Sales       | 80000  | 1    |

**Why is this better?** DENSE_RANK considers distinct values, not distinct rows. If the business question is "top 2 salary levels," DENSE_RANK is correct. If the question is "top 2 employees by salary" (meaning exactly 2 rows regardless of ties), you need ROW_NUMBER instead (see section on ROW_NUMBER).

> Interview trap: "Get the top 3 products by revenue." If two products are tied for 3rd place, do you return 3 products or 4? The interviewer expects you to clarify this before writing the query.

---

## Scenario: Dense Rank for Scoring

### Problem: "Assign medal ranks in a competition. Gold=1, Silver=2, Bronze=3. Ties receive the same medal. No gaps between medal ranks."

```sql
SELECT
    student_id,
    score,
    RANK()       OVER (ORDER BY score DESC) AS competition_rank,
    DENSE_RANK() OVER (ORDER BY score DESC) AS medal_rank
FROM scores
ORDER BY score DESC, student_id;
```

### Expected Output

| student_id | score | competition_rank | medal_rank |
|------------|-------|------------------|------------|
| 1          | 95    | 1                | 1          |
| 2          | 95    | 1                | 1          |
| 3          | 90    | 3                | 2          |
| 4          | 85    | 4                | 3          |
| 5          | NULL  | 5                | 4          |

**Key observation:** With RANK, the student scoring 90 gets rank 3 (because two students tied at rank 1). With DENSE_RANK, that student gets rank 2. If this is a medal system, DENSE_RANK is almost certainly what you want — you would not skip from Gold to Bronze.

---

## Scenario: Percentile Ranking

While RANK and DENSE_RANK are not percentiles directly, they form the foundation. A percentile can be derived from RANK:

```sql
SELECT
    employee_id,
    name,
    salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk,
    COUNT(*) OVER () AS total_employees,
    ROUND(
        (RANK() OVER (ORDER BY salary DESC) - 1) * 100.0
        / (COUNT(*) OVER () - 1),
        2
    ) AS percentile
FROM employees
ORDER BY salary DESC;
```

> This is a simplified percentile calculation. Production percentile calculations often use PERCENTILE_CONT or PERCENTILE_DISC window functions instead.

---

## NULL Behavior

### How NULLs Sort

| Database    | NULLs in ASC        | NULLs in DESC       |
|-------------|---------------------|---------------------|
| PostgreSQL  | NULLS LAST (default)| NULLS FIRST (default)|
| MySQL       | Always first in ASC | Always last in DESC |
| SQL Server  | Always first in ASC | Always last in DESC |
| Oracle      | NULLS LAST in ASC   | NULLS FIRST in DESC |

### NULLs in Ranking

```sql
SELECT
    product_id,
    product_name,
    price,
    RANK()       OVER (ORDER BY price DESC) AS rank_val,
    DENSE_RANK() OVER (ORDER BY price DESC) AS dense_rank_val
FROM products
ORDER BY price DESC NULLS LAST;
```

### Expected Output

| product_id | product_name | price | rank_val | dense_rank_val |
|------------|--------------|-------|----------|----------------|
| 104        | Gadget X     | 49.99 | 1        | 1              |
| 101        | Widget A     | 29.99 | 2        | 2              |
| 102        | Widget B     | 29.99 | 2        | 2              |
| 103        | Widget C     | 19.99 | 4        | 3              |
| 105        | Gadget Y     | NULL  | 5        | 4              |

**Key observations:**

- NULLs are ranked last in PostgreSQL (NULLS LAST default for DESC is actually NULLS LAST — in DESC, NULLs sort last by default in PostgreSQL).
- NULLs are treated as a single group. If multiple rows have NULL, they all get the same rank.
- If you need to exclude NULLs from ranking, add `WHERE price IS NOT NULL` before the window function or in a CTE.

> Common misconception: "NULL equals NULL in rankings." NULL is not equal to anything, including NULL. But window functions treat all NULLs in ORDER BY as a single group — they tie with each other.

> Production pitfall: In a salary ranking system, if salary is NULL, the employee gets ranked. This may or may not be intentional. Always decide explicitly whether NULLs should be included, excluded, or ranked at the bottom.

---

## NULLIF with RANK/DENSE_RANK

A common pattern: normalize a value before ranking.

```sql
SELECT
    product_id,
    product_name,
    COALESCE(price, 0) AS effective_price,
    DENSE_RANK() OVER (ORDER BY COALESCE(price, 0) DESC) AS price_rank
FROM products
ORDER BY effective_price DESC;
```

This assigns NULL prices a rank based on 0, placing them at the bottom of the ranking.

---

## Common Mistakes

### Mistake 1: Confusing RANK with ROW_NUMBER

```sql
-- BAD: "Get the top 10 customers" using RANK
SELECT *
FROM (
    SELECT customer_id, total_spend,
           RANK() OVER (ORDER BY total_spend DESC) AS rnk
    FROM customers
) ranked
WHERE rnk <= 10;
```

If 15 customers tie for 10th place, this returns 15 customers — not 10. Use ROW_NUMBER if you need exactly N rows.

### Mistake 2: Using RANK When You Need DENSE_RANK for Business Logic

```sql
-- BAD: "Show the top 5 salary levels" using RANK
SELECT DISTINCT salary,
       RANK() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees
WHERE RANK() OVER (ORDER BY salary DESC) <= 5;
```

This does not even work syntactically (aggregate/window functions cannot be in WHERE). But even in a subquery, RANK may skip levels. If you want "top 5 distinct salary levels," use DENSE_RANK.

### Mistake 3: Forgetting PARTITION BY

```sql
-- BAD: Ranking across all departments instead of within each
SELECT
    employee_id,
    name,
    department,
    salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
FROM employees;
```

This ranks employees globally, not within their department. If the goal is department-level ranking, you need `PARTITION BY department`.

### Mistake 4: Using RANK for Pagination

```sql
-- BAD: Using RANK for paginated results
SELECT * FROM (
    SELECT employee_id, name, salary,
           RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
) ranked
WHERE rnk BETWEEN 11 AND 20;
```

If multiple rows share the same rank, pagination breaks. Page 1 might return rows 1-10, page 2 starts at rank 11, but rows ranked 11 might appear on page 1 as well if ties exist. Use ROW_NUMBER for reliable pagination (see pagination section).

---

## Comparison Table

| Aspect                    | RANK                          | DENSE_RANK                    | ROW_NUMBER                     |
|---------------------------|-------------------------------|-------------------------------|--------------------------------|
| Ties                     | Same rank                     | Same rank                     | Arbitrary (no ties)            |
| Gaps after ties          | Yes                           | No                            | No gaps                        |
| Deterministic            | No (tie-breaking unspecified)| No (tie-breaking unspecified) | No (tie-breaking unspecified)  |
| NULL handling            | NULLs tie together            | NULLs tie together            | Each NULL gets unique number   |
| Use case                 | Competition ranking           | Level/rank without gaps       | Exact row count, pagination    |
| "Top N" accuracy         | May return >N rows            | May return >N rows            | Exactly N rows                 |

> All three functions are non-deterministic when ties exist and no additional tie-breaking column is specified. The database does not guarantee which tied row gets which value. For deterministic ordering within ties, add a unique column as a secondary sort:
> ```sql
> RANK() OVER (ORDER BY salary DESC, employee_id ASC)
> ```

---

## Internal Working: Execution Plan Considerations

RANK and DENSE_RANK require sorting. The execution plan will typically show:

1. **Sort** — The data must be sorted by the ORDER BY columns within each partition.
2. **Window function computation** — Applied after sorting.

### What affects performance:

- **Number of rows** — More rows = more sorting cost.
- **Partition size** — Smaller partitions sort faster.
- **Index availability** — An index on the ORDER BY columns may eliminate the sort operator entirely.

### How to verify:

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT
    employee_id,
    salary,
    RANK() OVER (ORDER BY salary DESC) AS rnk
FROM employees;

-- MySQL
EXPLAIN FORMAT=JSON
SELECT ...;

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT ...;

-- Oracle
EXPLAIN PLAN FOR
SELECT ...;
```

> Do not make absolute claims like "RANK is faster than DENSE_RANK." In practice, the performance difference between RANK and DENSE_RANK is negligible because both require the same sort. The bottleneck is the sort itself, not the rank computation. Verify with your execution plan.

---

## Performance Pitfalls

### Pitfall 1: Sorting Without an Index

```sql
-- This sorts 10 million rows every time
SELECT
    customer_id,
    total_spend,
    RANK() OVER (ORDER BY total_spend DESC) AS spend_rank
FROM large_table;
```

If an index exists on `total_spend`, the optimizer may use an index scan and avoid a full sort.

```sql
-- PostgreSQL / MySQL
CREATE INDEX idx_large_table_spend ON large_table(total_spend DESC);

-- SQL Server
CREATE NONCLUSTERED INDEX idx_large_table_spend ON large_table(total_spend DESC);
```

### Pitfall 2: Partitioning in Window Functions Without Consideration

```sql
-- This partitions by a high-cardinality column
RANK() OVER (PARTITION BY user_id ORDER BY event_time DESC)
```

If `user_id` has millions of distinct values, the database must sort millions of small groups. This can be slower than a single sort on the full dataset. Verify with EXPLAIN ANALYZE.

### Pitfall 3: Nested Window Functions

```sql
-- BAD: Nesting window functions (some databases allow it, some do not)
SELECT
    RANK() OVER (ORDER BY rank_val DESC) AS outer_rank
FROM (
    SELECT RANK() OVER (ORDER BY salary DESC) AS rank_val
    FROM employees
) sub;
```

This works in PostgreSQL, MySQL 8+, SQL Server, and Oracle, but it requires two sorts. If the intermediate result set is large, this doubles the sort cost. Consider whether a single pass with a different approach is feasible.

---

## Edge Cases

### Edge Case 1: All Rows Tied

```sql
SELECT
    employee_id,
    salary,
    RANK() OVER (ORDER BY salary) AS rnk,
    DENSE_RANK() OVER (ORDER BY salary) AS drnk
FROM employees
WHERE department = 'Sales';
```

If all Sales employees have the same salary (not the case in our data, but hypothetically), both RANK and DENSE_RANK return 1 for every row. No gap is created because there is only one distinct value.

### Edge Case 2: Empty Partition

If a partition contains zero rows, neither RANK nor DENSE_RANK produces any output for that partition. This is correct behavior — no rows means no ranks.

### Edge Case 3: Single Row

RANK and DENSE_RANK both return 1 for a single row. No difference.

### Edge Case 4: Descending vs Ascending

```sql
-- Highest salary gets rank 1
RANK() OVER (ORDER BY salary DESC) AS highest_first

-- Lowest salary gets rank 1
RANK() OVER (ORDER BY salary ASC) AS lowest_first
```

RANK and DENSE_RANK are symmetric with respect to ASC/DESC. The gap behavior is the same in both directions.

### Edge Case 5: Multiple ORDER BY Columns

```sql
RANK() OVER (ORDER BY department ASC, salary DESC) AS multi_col_rank
```

Ties are only created when ALL ORDER BY columns match. If two employees are in the same department but have different salaries, they do not tie.

---

## Interview Questions

### Beginner

1. What is the difference between RANK and DENSE_RANK?
2. Write a query to rank employees by salary within each department using DENSE_RANK.
3. If three rows are tied at rank 1, what is the next rank with RANK? With DENSE_RANK?
4. Can RANK and DENSE_RANK produce the same output? When?
5. How do NULLs affect RANK and DENSE_RANK?

### Intermediate

6. Write a query to find the second-highest salary in each department. What function would you use and why?
7. Write a query to find employees who earn more than 80% of their department colleagues (hint: use PERCENT_RANK or a combination of RANK and COUNT).
8. What happens if you use RANK() OVER (ORDER BY salary DESC) without PARTITION BY on a table with 1 million rows?
9. Rewrite this query to handle ties correctly: "Get the top 3 products by revenue."
10. Write a query that returns exactly one row per department for the highest-paid employee, even when there are ties.

### Advanced

11. Explain why RANK, DENSE_RANK, and ROW_NUMBER are non-deterministic when ties exist. How would you make them deterministic?
12. Write a query using RANK that computes the gap between each employee's rank and the expected rank if there were no ties.
13. How would you implement a "dense排名" (dense ranking without gaps) if your database did not have DENSE_RANK? (Hint: COUNT DISTINCT.)
14. Compare the execution plans of RANK() OVER (ORDER BY salary) vs a subquery approach using COUNT(*) to compute rank. Under what conditions might one outperform the other?
15. Write a query using DENSE_RANK to identify salary bands where more than 3 employees exist, and show the band number.

### Scenario Based

16. You are building a leaderboard for a gaming platform. Players with the same score share a rank. After a tie at rank 5, should the next player be rank 6 (RANK) or rank 6 (DENSE_RANK)? What does your product manager expect?
17. A report needs to show the "top 10% of earners." Should you use RANK, DENSE_RANK, or PERCENT_RANK? Explain your reasoning.
18. Your database has a `transactions` table with 500 million rows. You need to rank transactions by amount within each customer. What performance considerations apply?
19. A data analyst wrote a query using RANK to get the "top 5 products" but is seeing 7 rows in the result. Diagnose the issue and provide a fix.
20. You need to assign grades (A, B, C, D, F) based on exam scores. Scores 90-100 are A, 80-89 are B, etc. Should you use RANK, DENSE_RANK, or CASE? Why?

### Tricky

21. What is the output of this query?

```sql
SELECT
    x,
    RANK() OVER (ORDER BY x) AS rnk,
    DENSE_RANK() OVER (ORDER BY x) AS drnk
FROM (VALUES (1), (1), (2), (3), (3), (3), (NULL)) AS t(x);
```

22. Can RANK() OVER (ORDER BY NULL) produce meaningful results? Why or why not?

23. If you run this query twice in a row without an ORDER BY in the window function, can the results differ?

```sql
SELECT employee_id, salary,
       RANK() OVER (ORDER BY salary DESC) AS rnk
FROM employees;
```

24. Is this query valid? If so, what does it compute?

```sql
SELECT
    department,
    salary,
    RANK() OVER w AS dept_rank,
    RANK() OVER () AS global_rank
FROM employees
WINDOW w AS (PARTITION BY department ORDER BY salary DESC);
```

### Output Prediction

25. Given this data:

| id | value |
|----|-------|
| 1  | 10    |
| 2  | 20    |
| 3  | 20    |
| 4  | 20    |
| 5  | 30    |

Predict the output of:

```sql
SELECT id, value,
       RANK() OVER (ORDER BY value) AS rnk,
       DENSE_RANK() OVER (ORDER BY value) AS drnk
FROM t;
```

26. Same data, but with `ORDER BY value DESC`. What changes?

### Debugging

27. This query returns `ERROR: column "rank_val" must appear in the GROUP BY clause or be used in an aggregate function`. Why?

```sql
SELECT
    department,
    RANK() OVER (ORDER BY salary DESC) AS rank_val
FROM employees
GROUP BY department;
```

28. This query returns more rows than expected when filtered with `WHERE rank_val <= 3`. Diagnose:

```sql
SELECT * FROM (
    SELECT employee_id, salary,
           RANK() OVER (ORDER BY salary DESC) AS rank_val
    FROM employees
) ranked
WHERE rank_val <= 3;
```

### Performance

29. You have an index on `(department, salary DESC)`. Will this index help a query using `RANK() OVER (PARTITION BY department ORDER BY salary DESC)`? Explain why.
30. Write a query that uses RANK to find the top 1% of earners. What index would you create to optimize it? How would you verify the index is used?
