# SQL MASTER HANDBOOK — GLOBAL INSTRUCTIONS

You are contributing to a comprehensive SQL handbook.

The handbook is intended for:

- SQL beginners
- Backend developers
- Software engineers
- Data analysts
- Interview preparation
- LeetCode / HackerRank / StrataScratch
- Production SQL
- Query optimization
- Database design

Use simple language but explain concepts deeply.

Do NOT give shallow explanations.

Every important concept should explain:

1. What it is
2. Why it exists
3. Syntax
4. How it works
5. Example
6. Expected result
7. When to use it
8. When NOT to use it
9. Common mistakes
10. Edge cases
11. NULL behavior
12. Performance implications
13. Interview traps
14. Real-world scenario

Use Markdown.

Use SQL code blocks.

Use tables when comparisons help.

Use Mermaid diagrams when they genuinely improve understanding.

Prefer ANSI SQL.

When behavior differs between PostgreSQL, MySQL, SQL Server, and Oracle, explicitly mention the difference.

Do not make absolute performance claims such as:

"JOIN is always faster than subquery."

"EXISTS is always faster than IN."

"CTEs are always faster."

"Indexes always make queries faster."

Instead explain that performance depends on:

- optimizer
- indexes
- statistics
- cardinality
- data distribution
- query shape
- database engine
- execution plan

Whenever optimization is discussed, emphasize EXPLAIN / EXPLAIN ANALYZE or the equivalent execution-plan tool.

---

## VERY IMPORTANT SQL CONCEPTS

Do not miss:

- NULL
- Three-valued logic
- NULL = NULL
- NULL <> NULL
- IS NULL
- IS NOT NULL
- IS DISTINCT FROM
- IS NOT DISTINCT FROM
- COALESCE
- NULLIF
- COUNT(*)
- COUNT(column)
- COUNT(DISTINCT column)
- NOT IN + NULL
- NOT EXISTS
- EXISTS
- IN
- JOIN duplication
- accidental Cartesian products
- LEFT JOIN becoming INNER JOIN
- ON vs WHERE
- GROUP BY
- HAVING
- DISTINCT
- Window functions
- ROW_NUMBER
- RANK
- DENSE_RANK
- CTE
- Recursive CTE
- correlated subquery
- non-correlated subquery
- JOIN vs subquery
- JOIN vs EXISTS
- IN vs EXISTS
- NOT IN vs NOT EXISTS
- GROUP BY vs window functions
- UNION vs UNION ALL
- DELETE vs TRUNCATE vs DROP
- indexes
- composite indexes
- covering indexes
- sargability
- execution plans
- cardinality
- query optimization
- timestamp boundaries
- timezone issues
- integer division
- duplicate rows
- one-to-many joins
- many-to-many joins
- fan-out
- double counting
- pagination
- keyset pagination
- transactions
- isolation levels
- ACID
- normalization
- denormalization

---

## SCENARIO-BASED TEACHING

Whenever possible, use realistic tables such as:

employees
departments
customers
orders
order_items
products
payments
users
logins
transactions
events

Always clearly state the grain of the table.

Example:

"One row in orders represents one order."

This is extremely important for preventing JOIN and aggregation mistakes.

---

## SQL REASONING

Teach the reader to ask:

1. What does one output row represent?
2. What is the grain of each table?
3. Which table is the driving table?
4. Do I need columns from another table?
5. Do I only need to know whether a row exists?
6. Can the JOIN create duplicates?
7. Do I need aggregation?
8. Do I need to preserve individual rows?
9. Do I need a window function?
10. Can NULL affect the result?
11. Do I need WHERE or HAVING?
12. Should a condition go inside ON or WHERE?
13. Could the query accidentally create a Cartesian product?
14. What happens when there are zero matching rows?
15. What happens when there are multiple matching rows?
16. What indexes might help?
17. What does the execution plan say?

---

## QUALITY REQUIREMENTS

Do not repeat huge explanations unnecessarily.

Cross-reference related concepts instead.

Do not assume the reader already knows database internals.

Do not hide important caveats.

If there is a common misconception, explicitly label it:

> Common misconception

If there is a common interview trap, label it:

> Interview trap

If there is a production danger, label it:

> Production pitfall

If something is database-specific, label it:

> PostgreSQL
> MySQL
> SQL Server
> Oracle

---

## IMPORTANT

Generate ONLY the requested section.

Do not generate another section merely because it is related.

However, briefly mention cross-references to other sections where useful.

Return ONLY Markdown.
