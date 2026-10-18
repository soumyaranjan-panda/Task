# SQL Mental Model

SQL is **declarative and set-based**: you describe the *result* (the what), and the engine decides the *plan* (the how). Three mental layers:

| Layer | What lives here | You rely on |
|---|---|---|
| Logical model | Tables, columns, rows, keys, constraints | Describing the result you want |
| Semantic model | WHERE / GROUP BY / window semantics, three-valued logic, grain | Getting the *right* answer |
| Physical plan | Indexes, statistics, join algorithms, memory/disk | Getting the answer *fast* |

Habits of strong SQL developers:

- Always state the **grain** ("one output row = ...") before writing a query.
- Default to correct first (set semantics, NULL handling); optimize only after the plan says so.
- Think in **sets/relations**, never per-row loops — loops are never required in SQL.
- `ORDER BY` only guarantees order in the outermost query; anything inside can be reordered.
- The *meaning* of a query is engine-independent; its *performance* is not — verify with the execution plan.
- A distance `date - date` is a span (a number of days); an `INTERVAL` is a duration; always state which grain you want.

# Logical Query Execution Order

The standard logical order of operations (not physical execution):

1. `FROM` (tables, joins, LATERAL, derived tables)
2. `WHERE`
3. `GROUP BY`
4. `HAVING`
5. Window functions (applied during the SELECT phase)
6. `SELECT` list
7. `DISTINCT`
8. `ORDER BY`
9. `LIMIT` / `OFFSET` / `FETCH`

Consequences:

| Rule | Note |
|---|---|
| Column **aliases are not visible in WHERE** | `WHERE total > 10` fails if `total` is a SELECT alias; use HAVING or a nested/CTE layer |
| WHERE filters rows *before* grouping; HAVING filters groups *after* | `WHERE amount > 0` removes rows, `HAVING SUM(amount) > 0` filters groups |
| GROUP BY collapses rows; windows run after HAVING and preserve rows | see `GROUP BY vs Window Functions` |
| ORDER BY can reference aliases and (in some engines) columns not in GROUP BY | `ORDER BY total DESC` |
| `LIMIT` applies last | `LIMIT 10` on a joined query applies *after* the join, not per table |
| `DISTINCT` runs after the SELECT list is built | dedups the whole projected row |

# JOIN Decision Tree

Structure the question first: **must unmatched rows survive?**

- Need only rows that match another table? → `INNER JOIN`
- Need ALL rows of A with optional matches (NULLs padded on the right)? → `LEFT JOIN`
- Need ALL rows of B with optional matches (NULLs padded on the left)? → `RIGHT JOIN`
- Need every row of both sides, NULLs everywhere a match is missing? → `FULL OUTER JOIN`
- Only testing existence, no columns needed from B? → semi/anti join via `EXISTS` / `IN` / `NOT EXISTS`
- Deliberately combine every A row with every B row? → `CROSS JOIN`

| Join | Kept rows | Unmatched rows become |
|---|---|---|
| INNER | only matched | dropped from both sides |
| LEFT OUTER | all of A | A kept, B columns NULL |
| RIGHT OUTER | all of B | B kept, A columns NULL |
| FULL OUTER | union of both | either side NULL-padded |
| CROSS | every combination | n/a (cartesian product) |
| NATURAL / USING | like INNER but on same-named columns | risk: silently joins on the wrong columns |

Decision tips:

- If the report must include **zero-activity rows** (grain starts from the dimension), use LEFT JOIN and keep all filters on the right table inside the `ON` clause.
- Watch **fan-out**: joining two one-to-many tables in one query multiplies rows (N×M). Counts/sums then double-count — pre-aggregate one side first.
- `INNER JOIN` with a filter on the right table in `WHERE` is equivalent; `LEFT JOIN` with a right-table filter in `WHERE` is **not** — it silently becomes an inner join.

# JOIN vs Subquery Decision Tree

- Need multiple columns or whole rows from the related table? → **JOIN**
- Need just one scalar value per row? → scalar correlated subquery
- Testing existence only? → **EXISTS** (semi-join) or `IN`
- One-time derived set used in the same statement? → subquery (alias required in FROM)
- Reuse the same intermediate set several times in one statement? → **CTE**
- Correlated per-row computation needing many columns / set of rows? → **LATERAL** / `CROSS APPLY`

| Situation | Prefer | Why |
|---|---|---|
| Pull columns from many matching rows | JOIN | SELECT-list subquery must be scalar (1 row, 1 col) |
| "Customers with ≥ 1 order" | EXISTS | stops at first match, NULL-safe |
| "Revenue per customer" | JOIN (after pre-aggregate) | aggregate each side before joining to avoid fan-out |
| One value per row from an indexed table | scalar correlated subquery | can plan as an index lookup |
| Latest row per customer (multiple columns) | LATERAL or `ROW_NUMBER` window | one computation, not one subquery per column |
| Long multi-step pipeline | CTE | named steps, readable, standard |
| Simple one-time set in FROM | derived subquery | minimal machinery |

Note: modern optimizers often rewrite subquery ⇄ JOIN into the same plan. Pick for readability and correctness; verify performance in the plan rather than relying on folklore.

# EXISTS vs IN

| | `IN (…)` | `EXISTS (…)` |
|---|---|---|
| Form | `x IN (SELECT y FROM t)` | `EXISTS (SELECT 1 FROM t WHERE t.y = outer.x)` |
| Semantics | value membership | row existence (correlated) |
| NULL in the subquery list | safe for `x` non-NULL; NULLs just don't match | always safe |
| `x` itself NULL | `IN` yields UNKNOWN → excluded | safe |
| Correlation | awkward | natural |
| Plan | typically a semi-join | typically a semi-join |

- Both compile to **semi-joins** in modern engines; the old "IN is faster / EXISTS is faster" rule no longer holds — check the plan.
- Prefer `EXISTS` when the subquery references the outer row (correlated) or NULLs are possible.
- Extremely long `IN (...)` lists (1000+ values in some engines) hit parser/plan limits — use a temp table and join.
- `IN` with a subquery that can return NULL is not itself a trap; the trap is `NOT IN`.

# NOT EXISTS vs NOT IN

```
NOT IN (SELECT ...)   expands to   x <> v1 AND x <> v2 AND ...
If ANY returned value is NULL → EVERY comparison is UNKNOWN → the whole predicate is UNKNOWN → 0 rows
```

| | NOT IN | NOT EXISTS | LEFT JOIN … IS NULL |
|---|---|---|---|
| NULL in subquery | **silent zero-row bug** | safe | safe |
| NULL in outer key | — | safe | safe |
| Correlation | limited | natural | join-based |
| Default choice | avoid for subqueries | ✓ safe default | ✓ when you need left columns too |

Rule: for "rows in A with **no** match in B", `NOT EXISTS` is the safe default.

```sql
-- Buggy: returns nothing if any blocked order has NULL customer_id
SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM blocked_orders);
-- Safe
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM blocked_orders b WHERE b.customer_id = c.id);
```

# NULL Cheat Sheet

NULL means *absence of a value* — not `0`, `''`, or `FALSE`. All comparisons with NULL yield **UNKNOWN** (three-valued logic).

| Expression | Result |
|---|---|
| `NULL = NULL` | UNKNOWN |
| `NULL <> NULL` | UNKNOWN |
| `NULL = 1`, `NULL < 1` | UNKNOWN |
| `NOT (NULL = 1)` | UNKNOWN |
| `NULL AND FALSE` | FALSE |
| `NULL AND TRUE` | UNKNOWN |
| `NULL OR TRUE` | TRUE |

Utilities:

| Function | Meaning |
|---|---|
| `IS NULL` / `IS NOT NULL` | the only correct way to test for NULL |
| `IS [NOT] DISTINCT FROM` (PG/Oracle), `<=>` (MySQL) | NULL-safe equality: `(a = b) OR (a IS NULL AND b IS NULL)` |
| `COALESCE(a, b, c)` | first non-NULL argument |
| `NULLIF(a, b)` | `NULL` when `a = b`, else `a` (e.g. `NULLIF(x, 0)` guards division) |
| `IFNULL(a, b)` (MySQL/SQLite), `ISNULL(a, b)` (SQL Server) | two-argument COALESCE |

Aggregates and NULL:

| Aggregate | Behavior |
|---|---|
| `COUNT(*)` | counts every row, even all-NULL ones |
| `COUNT(col)` / `COUNT(DISTINCT col)` | ignore NULLs |
| `SUM` / `AVG` / `MIN` / `MAX` | ignore NULL rows; `SUM` of zero rows = NULL |

Other rules:

- `GROUP BY` folds all NULL keys into **one group**.
- `ORDER BY col ASC`: NULLs first in MySQL/SQL Server, last in PostgreSQL/Oracle (override with `NULLS FIRST/LAST`).
- `NOT IN` over a subquery containing NULL → see `NOT EXISTS vs NOT IN`.
- `WITH CHECK OPTION` on a view rejects a row when the view's WHERE evaluates to UNKNOWN.

# GROUP BY vs Window Functions

| | GROUP BY | Window functions |
|---|---|---|
| Output rows | **collapses** N rows → one row per group | **preserves** every input row |
| Aggregates over | the whole group | a partition / frame you choose |
| Example | one row per department | detail rows each carrying their department total |
| Non-aggregated columns | must appear in GROUP BY | can sit freely next to the window |

- Every non-aggregated column in the SELECT must appear in GROUP BY.
- Windows let you **mix detail and aggregate in one row**:
  `SELECT emp_id, dept_id, salary, SUM(salary) OVER (PARTITION BY dept_id) AS dept_total FROM employees;`
- They complement each other: GROUP BY to shape totals, then window functions to rank/compare within groups.
- GROUP BY is not row dedup; `DISTINCT` is dedup of whole projected rows.

# ROW_NUMBER vs RANK vs DENSE_RANK

For scores `10, 10, 20, 30` ordered ascending:

| Score | ROW_NUMBER() | RANK() | DENSE_RANK() |
|---|---|---|---|
| 10 | 1 | 1 | 1 |
| 10 | 2 | 1 | 1 |
| 20 | 3 | 3 | 2 |
| 30 | 4 | 4 | 3 |

| | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| Ties | no ties — arbitrary deterministic order | ties share rank, **gaps** after ties (1,1,3) | ties share rank, **no gaps** (1,1,2) |
| "Top 3" with a tie | returns exactly 3 rows | returns 3 (tie cut arbitrarily) | returns all tied rows (may exceed 3) |
| Use for | dedup, latest-row-per-group, stable pagination | competition rankings ("1st and 3rd place") | "top-N values" including ties |

Guides:

- Latest row / top-N per group → `ROW_NUMBER() OVER (PARTITION BY k ORDER BY ...)` filtered `WHERE rn = 1` (or `<= N`).
- Top-N *values* with all ties → `DENSE_RANK() <= N`.
- Always give ROW_NUMBER a deterministic tie-breaker (`ORDER BY score DESC, id ASC`).

# WHERE vs HAVING

| | WHERE | HAVING |
|---|---|---|
| Applied | before grouping (on rows) | after grouping (on groups) |
| Can reference aggregates | no | yes |
| Can reference GROUP BY columns | yes | yes |
| Index-friendly | yes (row filter) | no — usually after a sort/aggregation |

```sql
SELECT department_id, COUNT(*) AS cnt, AVG(salary) AS avg_salary
FROM employees
WHERE status = 'active'                    -- filter ROWS first
GROUP BY department_id
HAVING COUNT(*) > 5 AND AVG(salary) > 70000;  -- filter GROUPS after
```

- Push as much as possible into WHERE — fewer rows reach the grouping step.
- Keep only group-level conditions (aggregate predicates) in HAVING.
- HAVING alias reuse is engine-dependent; repeat the expression or wrap in a CTE.

# ON vs WHERE

| | ON | WHERE |
|---|---|---|
| Role | join matching predicate | final row filter |
| INNER JOIN | equivalent outcome | equivalent outcome |
| OUTER JOIN | does NOT restrict the surviving side | right-table condition here **silently turns LEFT into INNER** |
| Timing | during the join | after the join |

The #1 LEFT JOIN bug:

```sql
-- Intended: all customers + their shipped orders (unshipped → NULL)
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'shipped';      -- BUG: NULL status ≠ 'shipped' → those rows dropped
-- Fix: move the right-table condition into ON
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped';
```

- Multi-predicate outer joins: filters on the *preserved* side belong in `ON`; single-table filters belong in `WHERE`.
- `ON TRUE` is required for `LEFT JOIN LATERAL …` when all correlation lives inside the lateral.

# UNION vs UNION ALL

| | UNION | UNION ALL |
|---|---|---|
| Purpose | combine sets, **remove duplicates** | append result sets verbatim |
| Cost | extra sort/hash for dedup | none — streams rows |
| Duplicates | removed | kept |
| Use when | a distinct combined set is required | raw append is fine / duplicates impossible |

- Default to `UNION ALL`. It is faster and preserves duplicates that may matter for totals.
- Each SELECT must have the **same number of columns** with compatible types; output type/name come from the first SELECT.
- Set operations chain left-to-right in most engines (`A UNION ALL B EXCEPT C`); parenthesize for clarity.
- `INTERSECT` (common rows) and `EXCEPT`/`MINUS` (rows in A not in B) exist in PostgreSQL/SQL Server/Oracle; MySQL lacks them (pre-8.0.31) — use a join.
- A trailing `ORDER BY`/`LIMIT` needs a wrapping SELECT: `SELECT * FROM (SELECT … FROM a UNION ALL SELECT … FROM b) t ORDER BY …`.

# DELETE vs TRUNCATE vs DROP

| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Category | DML | DDL | DDL |
| Rows | matching rows only (`WHERE`) | **all rows**, schema kept | table and schema removed |
| WHERE | yes | no | no |
| Rollback | yes | PG/MySQL yes; SQL Server/Oracle no | usually no |
| Row triggers | fire | typically do not fire | no |
| Auto-increment | not reset | reset (typically) | n/a |
| Space | pages kept (may need VACUUM/defrag) | released | released |
| Speed | slow (row-by-row, logged) | fast (page deallocation) | fastest |
| Index use | yes (SARGable filters) | no | n/a |

Practices:

- DELETE is the only one that uses indexes; TRUNCATE/DROP ignore them.
- For risky DELETEs: run the predicate as a SELECT first, then delete inside a transaction.
- Huge deletes: batch with a keyset loop (`DELETE … WHERE id IN (SELECT id … WHERE cond … LIMIT 1000)`).

# CTE vs Subquery vs Temporary Table

| | Subquery | CTE (`WITH x AS …`) | Temp table | View / Matview |
|---|---|---|---|---|
| Scope | one statement | one statement | session + callers | persistent schema object |
| Reusable in a statement | no (repeat it) | yes (by name) | yes | yes |
| Indexable | no | no (PG: `MATERIALIZED` hint only) | yes | no / yes (matview) |
| Statistics | from base tables | from base tables | yes after ANALYZE / UPDATE STATISTICS | none for views; matview yes |
| Storage | none | none / optional materialization | physical (session) | none / physical (matview) |
| Freshness | always live | always live | as built | live / as-of-last-refresh |
| Best for | one-time nested set | readable multi-step single statement | cross-query reuse, staging, indexing an intermediate | security, reuse, expensive aggregates |

- A CTE is a named subquery; the optimizer may inline (merge) it or materialize it — engine-dependent.
- **Recursive CTE** (`WITH RECURSIVE`): anchor (seed) + `UNION ALL` + recursive member that references the CTE name = only the *previous generation's* output. Iterations ≈ tree depth. Always guard with a depth cap / `CYCLE` (PG 14+) / `MAXRECURSION` (SQL Server); MySQL caps at 1000, SQL Server default 100, Oracle uses `CONNECT BY` or standard recursion. Aggregate **outside** the recursion; index the parent/child key.
- **Temp tables**: `CREATE TEMP TABLE … AS SELECT`; populate in bulk; `ANALYZE`/`UPDATE STATISTICS` after big loads; index only keys used by later joins; `DROP TABLE IF EXISTS` defensively (connection pooling reuses sessions); prefer explicit column types for computed columns (SQL Server `SELECT INTO` can overflow `SUM(int)`).
- **Views** are saved definitions (live reads, no storage); **materialized views** store a physical copy and need refresh (`REFRESH MATERIALIZED VIEW [CONCURRENTLY]` PG; indexed views SQL Server; Oracle `REFRESH FAST ON COMMIT`). State the output grain, avoid `ORDER BY` inside, add `WITH CHECK OPTION` to writable filtering views.
- **LATERAL / CROSS APPLY** is a correlated row-source per outer row — use for latest/top-N per group when several columns are needed; `OUTER APPLY` / `LEFT JOIN LATERAL … ON TRUE` keeps unmatched outer rows. Watch `Loops:` count and inner index.

Prescription: single-statement logic → subquery/CTE; reused intermediate or index needed → temp table; shared business rule/security → view; expensive slow-changing aggregate → materialized view.

# Index Checklist

| Question | Decision |
|---|---|
| Is the WHERE/JOIN column selective (many distinct values)? | index it; low-selectivity (e.g. booleans) rarely helps |
| Are FK columns indexed? | PKs index automatically; index FKs for joins and multi-table deletes |
| Composite (multi-column)? | leftmost-prefix: `(a,b,c)` serves `a`, `(a,b)`, `(a,b,c)` — not `b`/`c` alone; equality first, then range/ORDER BY columns |
| Hot query needs every column without row lookups? | add `INCLUDE` columns (PG v11+/SQL Server 2005+) to make it covering |
| Read-heavy query | cover the exact predicate + ORDER BY in one composite |
| Write-heavy OLTP | fewer, leaner indexes — every index taxes each INSERT/UPDATE/DELETE |
| Big scan filtered on a subset | partial/filtered index (`WHERE active`) — smaller, faster, cheaper writes |
| ORDER BY / range retrievals | index column order should match the range/boundary usage and sort direction |

Checklist:

1. Index columns used in `WHERE`, `JOIN … ON`, `ORDER BY`, and sometimes `GROUP BY`.
2. Follow leftmost-prefix + equality-first-then-range ordering.
3. Do not index booleans, near-constant columns, or near-zero-cardinality columns.
4. Prefer one good composite over several single-column indexes.
5. Change one thing at a time; measure with the execution plan and wall-clock.
6. Drop redundant indexes (same leading column).
7. Refresh statistics after large data changes — the optimizer is only as good as its stats.
8. Covering (`INCLUDE`) beats adding columns to the key when you only need extra output columns.

# SARGability Checklist

SARGable = the predicate can use an **index seek** (Search ARGument-able). Non-sargable → scan.

| Bad (non-sargable) | Good (sargable) |
|---|---|
| `WHERE YEAR(order_date) = 2024` | `WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'` |
| `WHERE UPPER(last_name) = 'SMITH'` | `WHERE last_name = 'Smith'` |
| `WHERE salary + 100 > 1000` | `WHERE salary > 900` |
| `WHERE name LIKE '%smith%'` | `WHERE name LIKE 'smith%'` |
| `WHERE CAST(id AS TEXT) = '42'` | `WHERE id = 42` |
| `WHERE amount * qty > 100` | `WHERE amount > 100 / qty` (constant on right) |

Checklist:

1. Never wrap the indexed column in a function or arithmetic — transform the **constant** side instead (`col = f(const)`, not `f(col) = const`).
2. Avoid leading-wildcard `LIKE '%…'` on indexed text; prefer prefix `LIKE '…%'`, or full-text search.
3. Avoid implicit type coercion (indecnum vs text, char vs varchar comparison).
4. `OR` across different columns often kills the index — split into `UNION ALL` branches that can each seek.
5. `NOT` / `<>` generally don't seek; rewrite as ranges/IN where meaningful.
6. `IS NULL` can use an index in most engines; `IS NOT NULL` rarely does.
7. Expressions on the constant side are fine: `col = DATE '2024-01-01' + 30`.
8. Verify in the plan: **Index Seek** = good, **Scan** = bad.
9. When the expression is unavoidable, use a function-based index (PG/MySQL expression index, SQL Server computed column, Oracle function-based index).

# Query Optimization Checklist

1. **Return less**: SELECT only needed columns; push filters early; `LIMIT` where appropriate.
2. **Push filters down**: filter in FROM/WHERE before grouping; put right-table filters in `ON` for outer joins.
3. **Prefer EXISTS over IN over joins** for existence tests (semi-join, stops early).
4. **Aggregate before joining** one-to-many tables to avoid fan-out inflating SUM/COUNT.
5. **Keep predicates SARGable** (see `SARGability Checklist`).
6. **Use `UNION ALL`**, not `UNION`, unless dedup is required.
7. **Avoid redundant `DISTINCT`** — it forces a sort; join correctly instead.
8. **Windows over self-joins/correlated subqueries** for running totals, latest-row, LAG/LEAD — but compare with LATERAL; large sparse groups often favor the window, many-small-groups with a composite `(group_key, order_col)` index often favor LATERAL.
9. **Flatten unnecessary derived tables** so predicates can push into base tables.
10. **Keyset pagination for deep scrolls**: `WHERE (id, created_at) > (last_id, last_ts) ORDER BY id, created_at LIMIT n` — `OFFSET` degrades because it re-scans skipped rows.
11. **Fresh statistics**: `ANALYZE` / `UPDATE STATISTICS`; the optimizer guesses cardinality from stats (`rows=` in a plan is an estimate, not a measurement).
12. **Index fit**: cover predicates to convert scans into seeks.
13. **Batch large DML** with keyset loops and transactions; avoid row-by-row.
14. **Test rewrites** (JOIN⇄subquery, IN⇄EXISTS, OR→UNION ALL) on *your* data — plan, not folklore, decides.
15. **Measure before and after** with EXPLAIN (ANALYZE) and real timings.

# Execution Plan Checklist

Key operators to recognize: `Seq/Table Scan` (reads everything), `Index Seek` (probe), `Index Scan` (walks the whole index), `Nested Loop` (per-row probe — good when outer is small and inner is indexed), `Hash Join` (build + probe on larger equal sets; spills to disk if memory-bound), `Merge Join` (sorted inputs; great for range/full-outer), `Sort`, `Aggregate`, `Materialize`/`Spool`, `Filter` (placement matters).

Checklist:

1. **Seek or scan?** Seeks = SARGable + indexed; scans deserve suspicion in hot queries.
2. **Estimated vs actual rows**: the #1 place optimizer pain shows. Drift = stale stats or skewed data; `EXPLAIN ANALYZE` prints both.
3. **Join order/algorithm**: nested loop whose inner side scans = red flag; hash spill = memory pressure; verify the driving side matches your "keep every row" intent.
4. **Filter placement**: filters should appear early (low in the tree); a filter *after* Materialize/Spool means it runs too late.
5. **Sorts**: where they appear and whether they spill to disk; avoid them by matching index order or ordering at the outermost query.
6. **Loop counts** (PG `Loops: N`): for LATERAL/APPLY, N ≈ left-row count; high loops + inner Seq Scan = missing index on the correlation key.
7. **Cost is dimensionless** — a heuristic, not wall-clock time.
8. Per-engine tools: PG `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`; MySQL `EXPLAIN ANALYZE` / `EXPLAIN FORMAT=TREE`; SQL Server actual plan + `SET STATISTICS IO, TIME ON` + Query Store; Oracle `EXPLAIN PLAN` + `DBMS_XPLAN`, `AUTOTRACE`, SQL Monitor.
9. `EXPLAIN ANALYZE` **executes the query** — wrap any write it contains in a transaction/rollback.
10. Change one variable at a time and compare plans; never tune blind.

# Common SQL Pitfalls

| # | Pitfall | Fix |
|---|---|---|
| 1 | `NOT IN` returns zero rows if the subquery can yield NULL | `NOT EXISTS` or `LEFT JOIN … IS NULL` |
| 2 | Two 1:N joins fan out (N×M) → counts/sums double-count | pre-aggregate each grain, then join |
| 3 | `GROUP BY` missing non-aggregated columns | list every non-aggregated SELECT column |
| 4 | LEFT JOIN + right-table condition in WHERE → silent INNER | move the condition into `ON` |
| 5 | `BETWEEN` on timestamps mis-frames midnight | half-open `>= start AND < end` |
| 6 | `COUNT(col)` vs `COUNT(*)` vs `COUNT(DISTINCT col)` confusion | know which skips NULLs |
| 7 | `SUM` of zero rows is NULL, `COUNT` is 0 | `COALESCE(SUM(…), 0)` for dashboards |
| 8 | DISTINCT dedups whole rows, not one column | `COUNT(DISTINCT col)` or GROUP BY |
| 9 | Wrong rank function on ties in top-N | ROW_NUMBER (exact N) vs DENSE_RANK (keep ties) |
| 10 | `LIMIT 1` without ORDER BY = arbitrary row | always order deterministically |
| 11 | `WHERE x = NULL` returns nothing | `IS NULL` |
| 12 | NULL joins never match | `IS NOT DISTINCT FROM` when you truly want to match NULLs |
| 13 | Division by zero → error or NULL | `NULLIF(denominator, 0)` |
| 14 | Assuming GROUP BY picks "first/last" per group | window functions |
| 15 | Implicit type coercion kills index seeks | explicit casts / matching types |
| 16 | ORDER BY inside a view/CTE is unreliable | order at the outermost query |
| 17 | SELECT aliases used in WHERE | HAVING, nested SELECT, or CTE |
| 18 | `UNION` used when `UNION ALL` intended — duplicates vanish | choose deliberately |
| 19 | Recursive query without a cycle guard | depth cap / `CYCLE` / `MAXRECURSION` |
| 20 | Comparing timestamps across timezones / DST | store `TIMESTAMPTZ`/UTC; convert at the boundary |
| 21 | Row-by-row processing instead of set-based SQL | rewrite as single set statements |
| 22 | Deep `OFFSET` pagination slows down | keyset/cursor pagination |
| 23 | Aggregate over a duplicated view/join | verify grain and fan-out before summing |
| 24 | Casting `DATE` to `TIMESTAMP` shifts day boundaries | explicit, deliberate boundary handling |

# Timestamp Pitfalls

1. **Use half-open intervals**: `WHERE ts >= '2024-01-01' AND ts < '2024-02-01'`. `BETWEEN` is inclusive on both ends — for timestamps it sneaks in the next boundary (or misses the current day's last instant).
2. **`BETWEEN` is only safe for DATE-only** comparisons.
3. **Date vs timestamp casts**: `DATE → TIMESTAMP` lands at midnight; a `WHERE dt < '2024-01-01'` on a timestamp column behaves differently than on a date column.
4. **Store UTC**: use `TIMESTAMP WITH TIME ZONE` / `TIMESTAMPTZ`; convert only for display. Never store timezone-ambiguous strings.
5. **DST transitions**: an hour can repeat (fall-back) or vanish (spring-forward). A timezone is not a fixed offset — be careful when rolling 1-day windows in local time; roll in UTC.
6. **Arithmetic grains**: `date2 - date1` is a count of days; `INTERVAL '30 days'` is a duration; `date_trunc('month', …) + interval '1 month' - interval '1 day'` is a month boundary. Always state the grain.
7. **`EXTRACT(YEAR FROM ts)` is not SARGable** → use a range predicate (see `SARGability Checklist`).
8. **"Now" functions differ**: PG `NOW()`/`CURRENT_TIMESTAMP` = transaction start time; MySQL `NOW()` = statement start, `SYSDATE()` = function-call time. Semantics matter inside long transactions.
9. **Month/week helpers**: use `date_trunc` (PG), `DATE_FORMAT` (MySQL), `DATEDIFF`/`DATEADD`/`EOMONTH`/`DATEPART` (SQL Server), `TRUNC` (Oracle) — not string substringing.
10. **Midnight truncation**: to group by day, truncate the timestamp in the same timezone you report in, then use half-open ranges.
11. **Pin the unit**: when a report spans timezones, normalize both sides to the same zone before comparing.

# SQL Interview Patterns

Recurring archetypes and their go-to tools:

| Pattern | Example | Go-to tool |
|---|---|---|
| Top-N per group | top 3 salaries per dept | `ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)` + filter `rn <= N`; LATERAL for many-small-groups |
| Latest row per group | most recent order | ROW_NUMBER + `WHERE rn = 1` (GROUP BY+MAX+JOIN duplicates on ties) |
| Nth-highest | second-highest salary | `LIMIT 1 OFFSET 1` on an ordered list, or `DENSE_RANK` |
| Anti-join | customers who never ordered | `NOT EXISTS` / `LEFT JOIN … IS NULL` |
| Semi-join | customers with ≥ 1 order | `EXISTS` |
| At-least / all (division) | customers who bought every category | `HAVING COUNT(DISTINCT x) = (SELECT COUNT(*) …)` or paired NOT EXISTS |
| Dedup | keep newest per key | ROW_NUMBER partitioned by key |
| Duplicates find | emails appearing twice | `GROUP BY … HAVING COUNT(*) > 1` |
| Running total | cumulative revenue | `SUM(…) OVER (ORDER BY … ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` |
| Moving average | 7-day average | `AVG(…) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` |
| Gap/streak detection | consecutive login days | island trick: `date - ROW_NUMBER() OVER (PARTITION BY user ORDER BY date)` groups runs |
| Retention / cohort | D1/D7/D30 | cohort key = first-action date (`MIN(…) OVER`), then per-period counts |
| Time comparisons | MoM / YoY | `LAG(amount) OVER (ORDER BY period)` on a pre-aggregated series |
| Calendar zero-fill | daily revenue incl. empty days | date spine (`generate_series`/recursive CTE) + LEFT JOIN |
| Funnel | signup→purchase | conditional aggregation / `LEAD` step columns |
| Sessionization | user sessions from events | `SUM(case when gap then 1) OVER (ORDER BY …)` to assign session ids |
| Percentile/median | median salary | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY …)` |
| Pivot | region × month matrix | conditional aggregation `SUM(CASE WHEN … THEN amt END)` |
| Hierarchy | org subtree | recursive CTE on an adjacency list |
| Keyset pagination | infinite scroll | `WHERE id > last ORDER BY id LIMIT n` |
| Delete duplicates | keep min-id row | self-join `DELETE … WHERE t.id > min_id` |

# Top 50 SQL Query Templates

Assume `employees e`, `orders o (customer_id, order_date, amount, status)`, `customers c`, `departments d`, `transactions t (id, amount, created_at)`, `events ev`.

**Foundations (1–10)**

1. NULL-safe filter: `SELECT * FROM t WHERE created_at IS NOT NULL`
2. NULL-safe equality: `WHERE a IS NOT DISTINCT FROM b`
3. Fallback value: `SELECT COALESCE(phone, email, 'n/a') FROM users`
4. Guard division: `COUNT(*)::numeric / NULLIF(total, 0)`
5. Conditional aggregation: `SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)`
6. Count distinct: `COUNT(DISTINCT customer_id)`
7. JSONb boolean flag: `SUM((payload->>'is_bot')::int)` (PG/MySQL 8)

**Windows (8–18)**

8. Top-N per group: `SELECT * FROM (SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn FROM e) x WHERE rn <= 3`
9. Latest row per group: same with `rn = 1`
10. Nth highest salary: `SELECT DISTINCT salary FROM e ORDER BY salary DESC LIMIT 1 OFFSET 1`
11. Running total: `SELECT id, amount, SUM(amount) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM t`
12. 7-day moving average: `AVG(amount) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`
13. Previous row (comparison): `LAG(amount, 1, 0) OVER (ORDER BY period)`
14. Next row: `LEAD(created_at) OVER (PARTITION BY user_id ORDER BY created_at)`
15. Share of total: `amount / SUM(amount) OVER ()`
16. Rank without gaps: `DENSE_RANK() OVER (ORDER BY sales DESC)`
17. Percentile bands: `NTILE(4) OVER (ORDER BY salary)` → quartiles
18. Median: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) OVER ()`

**Dates (19–28)**

19. Sargable month filter (PG): `WHERE created_at >= date_trunc('month', CURRENT_DATE) AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month'`
20. This month boundary (SQL Server): `WHERE created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)`
21. Last 30 days: `WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`
22. Last full day: `WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`
23. Last month (calendar): half-open pair on the previous month's boundaries
24. Extract: `EXTRACT(YEAR FROM created_at)`, `EXTRACT(ISODOW FROM d)` (PG), `DATEPART(weekday, …)`, `DATE_PART`
25. Timezone convert: `created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'`
26. Group by day (PG): `date_trunc('day', created_at)`
27. Age: `DATE_PART('year', age(birth_date))` (PG), `DATEDIFF(year, birth_date, GETDATE())` (SQL Server)
28. Year-over-year: `SUM(CASE WHEN EXTRACT(YEAR FROM d) = 2024 …)` or LAG over yearly totals

**Aggregations (29–36)**

29. Counts by status incl. zero rows: `SELECT s.status, COUNT(o.order_id) FROM (SELECT 'shipped' status UNION ALL SELECT 'pending') s LEFT JOIN o ON o.status = s.status GROUP BY s.status`
30. Group totals with detail via window: `COUNT(*) OVER (PARTITION BY dept_id)`
31. Rollup: `SELECT dept_id, month, SUM(amount) FROM o GROUP BY ROLLUP(dept_id, month)` → totals per dept and grand total
32. Cube: `GROUP BY CUBE(dept_id, month)` → every combination
33. Grouping sets: `GROUP BY GROUPING SETS ((dept_id), (month), ())`
34. Filter per aggregate: `COUNT(*) FILTER (WHERE status = 'paid')` (PG/SQLite; emulate with CASE elsewhere)
35. Mode: `SELECT salary FROM e GROUP BY salary ORDER BY COUNT(*) DESC LIMIT 1`
36. Z-score outlier flag: `(x - AVG(x) OVER ()) / NULLIF(STDDEV(x) OVER (), 0) > 2`

**Joins / anti / semi (37–44)**

37. Customers with no orders: `SELECT * FROM c WHERE NOT EXISTS (SELECT 1 FROM o WHERE o.customer_id = c.id)`
38. Customers with ≥ 1 order: `WHERE EXISTS (…)`
39. Customers who never ordered product X: `WHERE NOT EXISTS (SELECT 1 FROM o WHERE o.customer_id = c.id AND o.product_id = X)`
40. All customers + order totals incl. none: `SELECT c.id, COALESCE(SUM(o.amount), 0) FROM c LEFT JOIN o ON o.customer_id = c.id GROUP BY c.id`
41. Department summary incl. empty depts: `SELECT d.id, COUNT(e.employee_id) FROM d LEFT JOIN e ON e.dept_id = d.id GROUP BY d.id`
42. Division ("bought every product"): `GROUP BY c.id HAVING COUNT(DISTINCT o.product_id) = (SELECT COUNT(*) FROM products)`
43. Self-join to find duplicates: `SELECT a.id FROM orders a JOIN orders b ON a.customer_id = b.customer_id AND a.created_at = b.created_at AND a.id > b.id`
44. Fan-out-safe paid count: `SELECT c.id, (SELECT COUNT(*) FROM o WHERE o.customer_id = c.id AND o.status='paid') FROM c`

**Set operations (45–47)**

45. UNION with dedup: `SELECT city FROM customers UNION SELECT city FROM branches`
46. UNION ALL append: `SELECT order_id FROM jan UNION ALL SELECT order_id FROM feb`
47. IN (both tables): `SELECT product_id FROM jan_sales INTERSECT SELECT product_id FROM feb_sales`

**DML / dedup (48–51)**

48. Upsert PG: `INSERT INTO o (id, amount) VALUES (1, 10) ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount`
49. Upsert MySQL: `INSERT INTO o (id, amount) VALUES (1, 10) ON DUPLICATE KEY UPDATE amount = VALUES(amount)`
50. Delete duplicate rows keep lowest id: `DELETE a FROM orders a, orders b WHERE a.customer_id = b.customer_id AND a.created_at = b.created_at AND a.id > b.id` (MySQL; write the equivalent EXISTS self-join elsewhere)
51. Safe row update: `UPDATE o SET status = 'refunded' WHERE order_id IN (SELECT order_id FROM refunds)` in a transaction

**Pagination / hierarchy (52–55)**

52. Keyset pagination: `SELECT * FROM o WHERE (order_id) > $last_id ORDER BY order_id LIMIT 50`
53. Composite keyset: `WHERE (created_at, id) > ($last_ts, $last_id) ORDER BY created_at, id LIMIT 50`
54. Offset pagination (shallow only): `ORDER BY id LIMIT 20 OFFSET 40`
55. Recursive subtree: `WITH RECURSIVE s AS (SELECT * FROM c WHERE category_id = $root UNION ALL SELECT ch FROM c ch JOIN s ON ch.parent_id = s.category_id) SELECT * FROM s`

**Misc analytics (56–60)**

56. Consecutive-day streak length: island group = `created_at::date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at::date)`, then count per group
57. Session identifier: `SUM(CASE WHEN gap > interval '30 minutes' THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY ts)` as session_id
58. Funnel step counts: `SUM(CASE WHEN step >= 1 THEN 1 END) …` from a prefixed funnel table
59. Calendar zero-fill: `SELECT d.day, COALESCE(x.total, 0) FROM generate_series('2024-01-01','2024-01-31','1 day') … LEFT JOIN (SELECT date_trunc('day', created_at) day, COUNT(*) total …) x ON …`
60. Sample rows: `SELECT * FROM t TABLESAMPLE SYSTEM (1)` (PG/SQL Server) or `ORDER BY random() LIMIT 100`

# SQL Problem-Solving Framework

Work in five phases:

1. **Clarify** — what should one output row represent? Expected row count? Ties, NULL policy, duplicate handling, aliases, performance constraints.
2. **Map** — which tables and grains; relationship cardinality (1:1 / 1:N / M:N); which join type keeps/drops which rows; can the join fan out?
3. **Choose** — pick the pattern (JOIN / subquery / CTE / window / recursive CTE / LATERAL / temp table); semi vs anti join; agg-before-join; pagination method.
4. **Write** — build in layers; name every derived column; filter early; aggregate deliberately; keep it set-based and readable.
5. **Verify** — hand-check on the smallest sample; count outputs vs grain; test edge cases (zero rows, all ties, NULL keys, duplicate seeds); run `EXPLAIN (ANALYZE)` and compare estimated vs actual rows.

Rapid-fire question checklist:

- What does one output row represent (the grain)?
- Which table drives, and does it need LEFT vs INNER?
- Does a second 1:N join cause N×M fan-out? Pre-aggregate which side first?
- On ties, do I want ROW_NUMBER / RANK / DENSE_RANK?
- Could `NOT IN` fire a NULL trap? Use `NOT EXISTS`.
- Do I need `COALESCE`, `IS [NOT] DISTINCT FROM`, `NULLIF`, half-open date ranges?
- Is `UNION` vs `UNION ALL` the semantics I want?
- Is a filter over the preserved side in WHERE incorrectly narrowing a LEFT JOIN?
- Help the optimizer: SARGable predicates, covering indexes, fresh stats.
- Which plan decision am I making from folklore that I should verify with `EXPLAIN`?

Verification moves: run fragments independently; compare counts against known totals; introduce edge rows deliberately; inspect the plan for Index Seek vs Scan, Filter placement, estimated vs actual rows, and join algorithm. Never assert "faster" without a measured before/after.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           All grounding reads are complete. Now writing the full 23-section cheat sheet into the target file, overwriting the prior agent's notes.
The check needlessly matched other files. Let me check headings in the target file only.
`rg` isn't installed; using grep directly on the file.
All 23 headings present in the exact required order; file written (58 KB). Final deliverable:

# SQL Mental Model

SQL is **declarative and set-based**: you describe the *result* (the what), and the engine decides the *plan* (the how). Three mental layers:

| Layer | What lives here | You rely on |
|---|---|---|
| Logical model | Tables, columns, rows, keys, constraints | Describing the result you want |
| Semantic model | WHERE / GROUP BY / window semantics, three-valued logic, grain | Getting the *right* answer |
| Physical plan | Indexes, statistics, join algorithms, memory/disk | Getting the answer *fast* |

Habits of strong SQL developers:

- Always state the **grain** ("one output row = ...") before writing a query.
- Default to correct first (set semantics, NULL handling); optimize only after the plan says so.
- Think in **sets/relations**, never per-row loops — loops are never required in SQL.
- `ORDER BY` only guarantees order in the outermost query; anything inside can be reordered.
- The *meaning* of a query is engine-independent; its *performance* is not — verify with the execution plan.
- A distance `date - date` is a span (a number of days); an `INTERVAL` is a duration; always state which grain you want.

# Logical Query Execution Order

The standard logical order of operations (not physical execution):

1. `FROM` (tables, joins, LATERAL, derived tables)
2. `WHERE`
3. `GROUP BY`
4. `HAVING`
5. Window functions (applied during the SELECT phase)
6. `SELECT` list
7. `DISTINCT`
8. `ORDER BY`
9. `LIMIT` / `OFFSET` / `FETCH`

Consequences:

| Rule | Note |
|---|---|
| Column **aliases are not visible in WHERE** | `WHERE total > 10` fails if `total` is a SELECT alias; use HAVING or a nested/CTE layer |
| WHERE filters rows *before* grouping; HAVING filters groups *after* | `WHERE amount > 0` removes rows, `HAVING SUM(amount) > 0` filters groups |
| GROUP BY collapses rows; windows run after HAVING and preserve rows | see `GROUP BY vs Window Functions` |
| ORDER BY can reference aliases and (in some engines) columns not in GROUP BY | `ORDER BY total DESC` |
| `LIMIT` applies last | `LIMIT 10` on a joined query applies *after* the join, not per table |
| `DISTINCT` runs after the SELECT list is built | dedups the whole projected row |

# JOIN Decision Tree

Structure the question first: **must unmatched rows survive?**

- Need only rows that match another table? → `INNER JOIN`
- Need ALL rows of A with optional matches (NULLs padded on the right)? → `LEFT JOIN`
- Need ALL rows of B with optional matches (NULLs padded on the left)? → `RIGHT JOIN`
- Need every row of both sides, NULLs everywhere a match is missing? → `FULL OUTER JOIN`
- Only testing existence, no columns needed from B? → semi/anti join via `EXISTS` / `IN` / `NOT EXISTS`
- Deliberately combine every A row with every B row? → `CROSS JOIN`

| Join | Kept rows | Unmatched rows become |
|---|---|---|
| INNER | only matched | dropped from both sides |
| LEFT OUTER | all of A | A kept, B columns NULL |
| RIGHT OUTER | all of B | B kept, A columns NULL |
| FULL OUTER | union of both | either side NULL-padded |
| CROSS | every combination | n/a (cartesian product) |
| NATURAL / USING | like INNER but on same-named columns | risk: silently joins on the wrong columns |

Decision tips:

- If the report must include **zero-activity rows** (grain starts from the dimension), use LEFT JOIN and keep all filters on the right table inside the `ON` clause.
- Watch **fan-out**: joining two one-to-many tables in one query multiplies rows (N×M). Counts/sums then double-count — pre-aggregate one side first.
- `INNER JOIN` with a filter on the right table in `WHERE` is equivalent; `LEFT JOIN` with a right-table filter in `WHERE` is **not** — it silently becomes an inner join.

# JOIN vs Subquery Decision Tree

- Need multiple columns or whole rows from the related table? → **JOIN**
- Need just one scalar value per row? → scalar correlated subquery
- Testing existence only? → **EXISTS** (semi-join) or `IN`
- One-time derived set used in the same statement? → subquery (alias required in FROM)
- Reuse the same intermediate set several times in one statement? → **CTE**
- Correlated per-row computation needing many columns / set of rows? → **LATERAL** / `CROSS APPLY`

| Situation | Prefer | Why |
|---|---|---|
| Pull columns from many matching rows | JOIN | SELECT-list subquery must be scalar (1 row, 1 col) |
| "Customers with ≥ 1 order" | EXISTS | stops at first match, NULL-safe |
| "Revenue per customer" | JOIN (after pre-aggregate) | aggregate each side before joining to avoid fan-out |
| One value per row from an indexed table | scalar correlated subquery | can plan as an index lookup |
| Latest row per customer (multiple columns) | LATERAL or `ROW_NUMBER` window | one computation, not one subquery per column |
| Long multi-step pipeline | CTE | named steps, readable, standard |
| Simple one-time set in FROM | derived subquery | minimal machinery |

Note: modern optimizers often rewrite subquery ⇄ JOIN into the same plan. Pick for readability and correctness; verify performance in the plan rather than relying on folklore.

# EXISTS vs IN

| | `IN (…)` | `EXISTS (…)` |
|---|---|---|
| Form | `x IN (SELECT y FROM t)` | `EXISTS (SELECT 1 FROM t WHERE t.y = outer.x)` |
| Semantics | value membership | row existence (correlated) |
| NULL in the subquery list | safe for `x` non-NULL; NULLs just don't match | always safe |
| `x` itself NULL | `IN` yields UNKNOWN → excluded | safe |
| Correlation | awkward | natural |
| Plan | typically a semi-join | typically a semi-join |

- Both compile to **semi-joins** in modern engines; the old "IN is faster / EXISTS is faster" rule no longer holds — check the plan.
- Prefer `EXISTS` when the subquery references the outer row (correlated) or NULLs are possible.
- Extremely long `IN (...)` lists (1000+ values in some engines) hit parser/plan limits — use a temp table and join.
- `IN` with a subquery that can return NULL is not itself a trap; the trap is `NOT IN`.

# NOT EXISTS vs NOT IN

```
NOT IN (SELECT ...)   expands to   x <> v1 AND x <> v2 AND ...
If ANY returned value is NULL → EVERY comparison is UNKNOWN → the whole predicate is UNKNOWN → 0 rows
```

| | NOT IN | NOT EXISTS | LEFT JOIN … IS NULL |
|---|---|---|---|
| NULL in subquery | **silent zero-row bug** | safe | safe |
| NULL in outer key | — | safe | safe |
| Correlation | limited | natural | join-based |
| Default choice | avoid for subqueries | ✓ safe default | ✓ when you need left columns too |

Rule: for "rows in A with **no** match in B", `NOT EXISTS` is the safe default.

```sql
-- Buggy: returns nothing if any blocked order has NULL customer_id
SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM blocked_orders);
-- Safe
SELECT * FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM blocked_orders b WHERE b.customer_id = c.id);
```

# NULL Cheat Sheet

NULL means *absence of a value* — not `0`, `''`, or `FALSE`. All comparisons with NULL yield **UNKNOWN** (three-valued logic).

| Expression | Result |
|---|---|
| `NULL = NULL` | UNKNOWN |
| `NULL <> NULL` | UNKNOWN |
| `NULL = 1`, `NULL < 1` | UNKNOWN |
| `NOT (NULL = 1)` | UNKNOWN |
| `NULL AND FALSE` | FALSE |
| `NULL AND TRUE` | UNKNOWN |
| `NULL OR TRUE` | TRUE |

Utilities:

| Function | Meaning |
|---|---|
| `IS NULL` / `IS NOT NULL` | the only correct way to test for NULL |
| `IS [NOT] DISTINCT FROM` (PG/Oracle), `<=>` (MySQL) | NULL-safe equality: `(a = b) OR (a IS NULL AND b IS NULL)` |
| `COALESCE(a, b, c)` | first non-NULL argument |
| `NULLIF(a, b)` | `NULL` when `a = b`, else `a` (e.g. `NULLIF(x, 0)` guards division) |
| `IFNULL(a, b)` (MySQL/SQLite), `ISNULL(a, b)` (SQL Server) | two-argument COALESCE |

Aggregates and NULL:

| Aggregate | Behavior |
|---|---|
| `COUNT(*)` | counts every row, even all-NULL ones |
| `COUNT(col)` / `COUNT(DISTINCT col)` | ignore NULLs |
| `SUM` / `AVG` / `MIN` / `MAX` | ignore NULL rows; `SUM` of zero rows = NULL |

Other rules:

- `GROUP BY` folds all NULL keys into **one group**.
- `ORDER BY col ASC`: NULLs first in MySQL/SQL Server, last in PostgreSQL/Oracle (override with `NULLS FIRST/LAST`).
- `NOT IN` over a subquery containing NULL → see `NOT EXISTS vs NOT IN`.
- `WITH CHECK OPTION` on a view rejects a row when the view's WHERE evaluates to UNKNOWN.

# GROUP BY vs Window Functions

| | GROUP BY | Window functions |
|---|---|---|
| Output rows | **collapses** N rows → one row per group | **preserves** every input row |
| Aggregates over | the whole group | a partition / frame you choose |
| Example | one row per department | detail rows each carrying their department total |
| Non-aggregated columns | must appear in GROUP BY | can sit freely next to the window |

- Every non-aggregated column in the SELECT must appear in GROUP BY.
- Windows let you **mix detail and aggregate in one row**:
  `SELECT emp_id, dept_id, salary, SUM(salary) OVER (PARTITION BY dept_id) AS dept_total FROM employees;`
- They complement each other: GROUP BY to shape totals, then window functions to rank/compare within groups.
- GROUP BY is not row dedup; `DISTINCT` is dedup of whole projected rows.

# ROW_NUMBER vs RANK vs DENSE_RANK

For scores `10, 10, 20, 30` ordered ascending:

| Score | ROW_NUMBER() | RANK() | DENSE_RANK() |
|---|---|---|---|
| 10 | 1 | 1 | 1 |
| 10 | 2 | 1 | 1 |
| 20 | 3 | 3 | 2 |
| 30 | 4 | 4 | 3 |

| | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| Ties | no ties — arbitrary deterministic order | ties share rank, **gaps** after ties (1,1,3) | ties share rank, **no gaps** (1,1,2) |
| "Top 3" with a tie | returns exactly 3 rows | returns 3 (tie cut arbitrarily) | returns all tied rows (may exceed 3) |
| Use for | dedup, latest-row-per-group, stable pagination | competition rankings ("1st and 3rd place") | "top-N values" including ties |

Guides:

- Latest row / top-N per group → `ROW_NUMBER() OVER (PARTITION BY k ORDER BY ...)` filtered `WHERE rn = 1` (or `<= N`).
- Top-N *values* with all ties → `DENSE_RANK() <= N`.
- Always give ROW_NUMBER a deterministic tie-breaker (`ORDER BY score DESC, id ASC`).

# WHERE vs HAVING

| | WHERE | HAVING |
|---|---|---|
| Applied | before grouping (on rows) | after grouping (on groups) |
| Can reference aggregates | no | yes |
| Can reference GROUP BY columns | yes | yes |
| Index-friendly | yes (row filter) | no — usually after a sort/aggregation |

```sql
SELECT department_id, COUNT(*) AS cnt, AVG(salary) AS avg_salary
FROM employees
WHERE status = 'active'                    -- filter ROWS first
GROUP BY department_id
HAVING COUNT(*) > 5 AND AVG(salary) > 70000;  -- filter GROUPS after
```

- Push as much as possible into WHERE — fewer rows reach the grouping step.
- Keep only group-level conditions (aggregate predicates) in HAVING.
- HAVING alias reuse is engine-dependent; repeat the expression or wrap in a CTE.

# ON vs WHERE

| | ON | WHERE |
|---|---|---|
| Role | join matching predicate | final row filter |
| INNER JOIN | equivalent outcome | equivalent outcome |
| OUTER JOIN | does NOT restrict the surviving side | right-table condition here **silently turns LEFT into INNER** |
| Timing | during the join | after the join |

The #1 LEFT JOIN bug:

```sql
-- Intended: all customers + their shipped orders (unshipped → NULL)
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'shipped';      -- BUG: NULL status ≠ 'shipped' → those rows dropped
-- Fix: move the right-table condition into ON
SELECT c.name, o.total
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped';
```

- Multi-predicate outer joins: filters on the *preserved* side belong in `ON`; single-table filters belong in `WHERE`.
- `ON TRUE` is required for `LEFT JOIN LATERAL …` when all correlation lives inside the lateral.

# UNION vs UNION ALL

| | UNION | UNION ALL |
|---|---|---|
| Purpose | combine sets, **remove duplicates** | append result sets verbatim |
| Cost | extra sort/hash for dedup | none — streams rows |
| Duplicates | removed | kept |
| Use when | a distinct combined set is required | raw append is fine / duplicates impossible |

- Default to `UNION ALL`. It is faster and preserves duplicates that may matter for totals.
- Each SELECT must have the **same number of columns** with compatible types; output type/name come from the first SELECT.
- Set operations chain left-to-right in most engines (`A UNION ALL B EXCEPT C`); parenthesize for clarity.
- `INTERSECT` (common rows) and `EXCEPT`/`MINUS` (rows in A not in B) exist in PostgreSQL/SQL Server/Oracle; MySQL lacks them (pre-8.0.31) — use a join.
- A trailing `ORDER BY`/`LIMIT` needs a wrapping SELECT: `SELECT * FROM (SELECT … FROM a UNION ALL SELECT … FROM b) t ORDER BY …`.

# DELETE vs TRUNCATE vs DROP

| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Category | DML | DDL | DDL |
| Rows | matching rows only (`WHERE`) | **all rows**, schema kept | table and schema removed |
| WHERE | yes | no | no |
| Rollback | yes | PG/MySQL yes; SQL Server/Oracle no | usually no |
| Row triggers | fire | typically do not fire | no |
| Auto-increment | not reset | reset (typically) | n/a |
| Space | pages kept (may need VACUUM/defrag) | released | released |
| Speed | slow (row-by-row, logged) | fast (page deallocation) | fastest |
| Index use | yes (SARGable filters) | no | n/a |

Practices:

- DELETE is the only one that uses indexes; TRUNCATE/DROP ignore them.
- For risky DELETEs: run the predicate as a SELECT first, then delete inside a transaction.
- Huge deletes: batch with a keyset loop (`DELETE … WHERE id IN (SELECT id … WHERE cond … LIMIT 1000)`).

# CTE vs Subquery vs Temporary Table

| | Subquery | CTE (`WITH x AS …`) | Temp table | View / Matview |
|---|---|---|---|---|
| Scope | one statement | one statement | session + callers | persistent schema object |
| Reusable in a statement | no (repeat it) | yes (by name) | yes | yes |
| Indexable | no | no (PG: `MATERIALIZED` hint only) | yes | no / yes (matview) |
| Statistics | from base tables | from base tables | yes after ANALYZE / UPDATE STATISTICS | none for views; matview yes |
| Storage | none | none / optional materialization | physical (session) | none / physical (matview) |
| Freshness | always live | always live | as built | live / as-of-last-refresh |
| Best for | one-time nested set | readable multi-step single statement | cross-query reuse, staging, indexing an intermediate | security, reuse, expensive aggregates |

- A CTE is a named subquery; the optimizer may inline (merge) it or materialize it — engine-dependent.
- **Recursive CTE** (`WITH RECURSIVE`): anchor (seed) + `UNION ALL` + recursive member that references the CTE name = only the *previous generation's* output. Iterations ≈ tree depth. Always guard with a depth cap / `CYCLE` (PG 14+) / `MAXRECURSION` (SQL Server); MySQL caps at 1000, SQL Server default 100, Oracle uses `CONNECT BY` or standard recursion. Aggregate **outside** the recursion; index the parent/child key.
- **Temp tables**: `CREATE TEMP TABLE … AS SELECT`; populate in bulk; `ANALYZE`/`UPDATE STATISTICS` after big loads; index only keys used by later joins; `DROP TABLE IF EXISTS` defensively (connection pooling reuses sessions); prefer explicit column types for computed columns (SQL Server `SELECT INTO` can overflow `SUM(int)`).
- **Views** are saved definitions (live reads, no storage); **materialized views** store a physical copy and need refresh (`REFRESH MATERIALIZED VIEW [CONCURRENTLY]` PG; indexed views SQL Server; Oracle `REFRESH FAST ON COMMIT`). State the output grain, avoid `ORDER BY` inside, add `WITH CHECK OPTION` to writable filtering views.
- **LATERAL / CROSS APPLY** is a correlated row-source per outer row — use for latest/top-N per group when several columns are needed; `OUTER APPLY` / `LEFT JOIN LATERAL … ON TRUE` keeps unmatched outer rows. Watch `Loops:` count and inner index.

Prescription: single-statement logic → subquery/CTE; reused intermediate or index needed → temp table; shared business rule/security → view; expensive slow-changing aggregate → materialized view.

# Index Checklist

| Question | Decision |
|---|---|
| Is the WHERE/JOIN column selective (many distinct values)? | index it; low-selectivity (e.g. booleans) rarely helps |
| Are FK columns indexed? | PKs index automatically; index FKs for joins and multi-table deletes |
| Composite (multi-column)? | leftmost-prefix: `(a,b,c)` serves `a`, `(a,b)`, `(a,b,c)` — not `b`/`c` alone; equality first, then range/ORDER BY columns |
| Hot query needs every column without row lookups? | add `INCLUDE` columns (PG v11+/SQL Server 2005+) to make it covering |
| Read-heavy query | cover the exact predicate + ORDER BY in one composite |
| Write-heavy OLTP | fewer, leaner indexes — every index taxes each INSERT/UPDATE/DELETE |
| Big scan filtered on a subset | partial/filtered index (`WHERE active`) — smaller, faster, cheaper writes |
| ORDER BY / range retrievals | index column order should match the range/boundary usage and sort direction |

Checklist:

1. Index columns used in `WHERE`, `JOIN … ON`, `ORDER BY`, and sometimes `GROUP BY`.
2. Follow leftmost-prefix + equality-first-then-range ordering.
3. Do not index booleans, near-constant columns, or near-zero-cardinality columns.
4. Prefer one good composite over several single-column indexes.
5. Change one thing at a time; measure with the execution plan and wall-clock.
6. Drop redundant indexes (same leading column).
7. Refresh statistics after large data changes — the optimizer is only as good as its stats.
8. Covering (`INCLUDE`) beats adding columns to the key when you only need extra output columns.

# SARGability Checklist

SARGable = the predicate can use an **index seek** (Search ARGument-able). Non-sargable → scan.

| Bad (non-sargable) | Good (sargable) |
|---|---|
| `WHERE YEAR(order_date) = 2024` | `WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'` |
| `WHERE UPPER(last_name) = 'SMITH'` | `WHERE last_name = 'Smith'` |
| `WHERE salary + 100 > 1000` | `WHERE salary > 900` |
| `WHERE name LIKE '%smith%'` | `WHERE name LIKE 'smith%'` |
| `WHERE CAST(id AS TEXT) = '42'` | `WHERE id = 42` |
| `WHERE amount * qty > 100` | `WHERE amount > 100 / qty` (constant on right) |

Checklist:

1. Never wrap the indexed column in a function or arithmetic — transform the **constant** side instead (`col = f(const)`, not `f(col) = const`).
2. Avoid leading-wildcard `LIKE '%…'` on indexed text; prefer prefix `LIKE '…%'`, or full-text search.
3. Avoid implicit type coercion (indecnum vs text, char vs varchar comparison).
4. `OR` across different columns often kills the index — split into `UNION ALL` branches that can each seek.
5. `NOT` / `<>` generally don't seek; rewrite as ranges/IN where meaningful.
6. `IS NULL` can use an index in most engines; `IS NOT NULL` rarely does.
7. Expressions on the constant side are fine: `col = DATE '2024-01-01' + 30`.
8. Verify in the plan: **Index Seek** = good, **Scan** = bad.
9. When the expression is unavoidable, use a function-based index (PG/MySQL expression index, SQL Server computed column, Oracle function-based index).

# Query Optimization Checklist

1. **Return less**: SELECT only needed columns; push filters early; `LIMIT` where appropriate.
2. **Push filters down**: filter in FROM/WHERE before grouping; put right-table filters in `ON` for outer joins.
3. **Prefer EXISTS over IN over joins** for existence tests (semi-join, stops early).
4. **Aggregate before joining** one-to-many tables to avoid fan-out inflating SUM/COUNT.
5. **Keep predicates SARGable** (see `SARGability Checklist`).
6. **Use `UNION ALL`**, not `UNION`, unless dedup is required.
7. **Avoid redundant `DISTINCT`** — it forces a sort; join correctly instead.
8. **Windows over self-joins/correlated subqueries** for running totals, latest-row, LAG/LEAD — but compare with LATERAL; large sparse groups often favor the window, many-small-groups with a composite `(group_key, order_col)` index often favor LATERAL.
9. **Flatten unnecessary derived tables** so predicates can push into base tables.
10. **Keyset pagination for deep scrolls**: `WHERE (id, created_at) > (last_id, last_ts) ORDER BY id, created_at LIMIT n` — `OFFSET` degrades because it re-scans skipped rows.
11. **Fresh statistics**: `ANALYZE` / `UPDATE STATISTICS`; the optimizer guesses cardinality from stats (`rows=` in a plan is an estimate, not a measurement).
12. **Index fit**: cover predicates to convert scans into seeks.
13. **Batch large DML** with keyset loops and transactions; avoid row-by-row.
14. **Test rewrites** (JOIN⇄subquery, IN⇄EXISTS, OR→UNION ALL) on *your* data — plan, not folklore, decides.
15. **Measure before and after** with EXPLAIN (ANALYZE) and real timings.

# Execution Plan Checklist

Key operators to recognize: `Seq/Table Scan` (reads everything), `Index Seek` (probe), `Index Scan` (walks the whole index), `Nested Loop` (per-row probe — good when outer is small and inner is indexed), `Hash Join` (build + probe on larger equal sets; spills to disk if memory-bound), `Merge Join` (sorted inputs; great for range/full-outer), `Sort`, `Aggregate`, `Materialize`/`Spool`, `Filter` (placement matters).

Checklist:

1. **Seek or scan?** Seeks = SARGable + indexed; scans deserve suspicion in hot queries.
2. **Estimated vs actual rows**: the #1 place optimizer pain shows. Drift = stale stats or skewed data; `EXPLAIN ANALYZE` prints both.
3. **Join order/algorithm**: nested loop whose inner side scans = red flag; hash spill = memory pressure; verify the driving side matches your "keep every row" intent.
4. **Filter placement**: filters should appear early (low in the tree); a filter *after* Materialize/Spool means it runs too late.
5. **Sorts**: where they appear and whether they spill to disk; avoid them by matching index order or ordering at the outermost query.
6. **Loop counts** (PG `Loops: N`): for LATERAL/APPLY, N ≈ left-row count; high loops + inner Seq Scan = missing index on the correlation key.
7. **Cost is dimensionless** — a heuristic, not wall-clock time.
8. Per-engine tools: PG `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`; MySQL `EXPLAIN ANALYZE` / `EXPLAIN FORMAT=TREE`; SQL Server actual plan + `SET STATISTICS IO, TIME ON` + Query Store; Oracle `EXPLAIN PLAN` + `DBMS_XPLAN`, `AUTOTRACE`, SQL Monitor.
9. `EXPLAIN ANALYZE` **executes the query** — wrap any write it contains in a transaction/rollback.
10. Change one variable at a time and compare plans; never tune blind.

# Common SQL Pitfalls

| # | Pitfall | Fix |
|---|---|---|
| 1 | `NOT IN` returns zero rows if the subquery can yield NULL | `NOT EXISTS` or `LEFT JOIN … IS NULL` |
| 2 | Two 1:N joins fan out (N×M) → counts/sums double-count | pre-aggregate each grain, then join |
| 3 | `GROUP BY` missing non-aggregated columns | list every non-aggregated SELECT column |
| 4 | LEFT JOIN + right-table condition in WHERE → silent INNER | move the condition into `ON` |
| 5 | `BETWEEN` on timestamps mis-frames midnight | half-open `>= start AND < end` |
| 6 | `COUNT(col)` vs `COUNT(*)` vs `COUNT(DISTINCT col)` confusion | know which skips NULLs |
| 7 | `SUM` of zero rows is NULL, `COUNT` is 0 | `COALESCE(SUM(…), 0)` for dashboards |
| 8 | DISTINCT dedups whole rows, not one column | `COUNT(DISTINCT col)` or GROUP BY |
| 9 | Wrong rank function on ties in top-N | ROW_NUMBER (exact N) vs DENSE_RANK (keep ties) |
| 10 | `LIMIT 1` without ORDER BY = arbitrary row | always order deterministically |
| 11 | `WHERE x = NULL` returns nothing | `IS NULL` |
| 12 | NULL joins never match | `IS NOT DISTINCT FROM` when you truly want to match NULLs |
| 13 | Division by zero → error or NULL | `NULLIF(denominator, 0)` |
| 14 | Assuming GROUP BY picks "first/last" per group | window functions |
| 15 | Implicit type coercion kills index seeks | explicit casts / matching types |
| 16 | ORDER BY inside a view/CTE is unreliable | order at the outermost query |
| 17 | SELECT aliases used in WHERE | HAVING, nested SELECT, or CTE |
| 18 | `UNION` used when `UNION ALL` intended — duplicates vanish | choose deliberately |
| 19 | Recursive query without a cycle guard | depth cap / `CYCLE` / `MAXRECURSION` |
| 20 | Comparing timestamps across timezones / DST | store `TIMESTAMPTZ`/UTC; convert at the boundary |
| 21 | Row-by-row processing instead of set-based SQL | rewrite as single set statements |
| 22 | Deep `OFFSET` pagination slows down | keyset/cursor pagination |
| 23 | Aggregate over a duplicated view/join | verify grain and fan-out before summing |
| 24 | Casting `DATE` to `TIMESTAMP` shifts day boundaries | explicit, deliberate boundary handling |

# Timestamp Pitfalls

1. **Use half-open intervals**: `WHERE ts >= '2024-01-01' AND ts < '2024-02-01'`. `BETWEEN` is inclusive on both ends — for timestamps it sneaks in the next boundary (or misses the current day's last instant).
2. **`BETWEEN` is only safe for DATE-only** comparisons.
3. **Date vs timestamp casts**: `DATE → TIMESTAMP` lands at midnight; a `WHERE dt < '2024-01-01'` on a timestamp column behaves differently than on a date column.
4. **Store UTC**: use `TIMESTAMP WITH TIME ZONE` / `TIMESTAMPTZ`; convert only for display. Never store timezone-ambiguous strings.
5. **DST transitions**: an hour can repeat (fall-back) or vanish (spring-forward). A timezone is not a fixed offset — be careful when rolling 1-day windows in local time; roll in UTC.
6. **Arithmetic grains**: `date2 - date1` is a count of days; `INTERVAL '30 days'` is a duration; `date_trunc('month', …) + interval '1 month' - interval '1 day'` is a month boundary. Always state the grain.
7. **`EXTRACT(YEAR FROM ts)` is not SARGable** → use a range predicate (see `SARGability Checklist`).
8. **"Now" functions differ**: PG `NOW()`/`CURRENT_TIMESTAMP` = transaction start time; MySQL `NOW()` = statement start, `SYSDATE()` = function-call time. Semantics matter inside long transactions.
9. **Month/week helpers**: use `date_trunc` (PG), `DATE_FORMAT` (MySQL), `DATEDIFF`/`DATEADD`/`EOMONTH`/`DATEPART` (SQL Server), `TRUNC` (Oracle) — not string substringing.
10. **Midnight truncation**: to group by day, truncate the timestamp in the same timezone you report in, then use half-open ranges.
11. **Pin the unit**: when a report spans timezones, normalize both sides to the same zone before comparing.

# SQL Interview Patterns

Recurring archetypes and their go-to tools:

| Pattern | Example | Go-to tool |
|---|---|---|
| Top-N per group | top 3 salaries per dept | `ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)` + filter `rn <= N`; LATERAL for many-small-groups |
| Latest row per group | most recent order | ROW_NUMBER + `WHERE rn = 1` (GROUP BY+MAX+JOIN duplicates on ties) |
| Nth-highest | second-highest salary | `LIMIT 1 OFFSET 1` on an ordered list, or `DENSE_RANK` |
| Anti-join | customers who never ordered | `NOT EXISTS` / `LEFT JOIN … IS NULL` |
| Semi-join | customers with ≥ 1 order | `EXISTS` |
| At-least / all (division) | customers who bought every category | `HAVING COUNT(DISTINCT x) = (SELECT COUNT(*) …)` or paired NOT EXISTS |
| Dedup | keep newest per key | ROW_NUMBER partitioned by key |
| Duplicates find | emails appearing twice | `GROUP BY … HAVING COUNT(*) > 1` |
| Running total | cumulative revenue | `SUM(…) OVER (ORDER BY … ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` |
| Moving average | 7-day average | `AVG(…) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` |
| Gap/streak detection | consecutive login days | island trick: `date - ROW_NUMBER() OVER (PARTITION BY user ORDER BY date)` groups runs |
| Retention / cohort | D1/D7/D30 | cohort key = first-action date (`MIN(…) OVER`), then per-period counts |
| Time comparisons | MoM / YoY | `LAG(amount) OVER (ORDER BY period)` on a pre-aggregated series |
| Calendar zero-fill | daily revenue incl. empty days | date spine (`generate_series`/recursive CTE) + LEFT JOIN |
| Funnel | signup→purchase | conditional aggregation / `LEAD` step columns |
| Sessionization | user sessions from events | `SUM(case when gap then 1) OVER (ORDER BY …)` to assign session ids |
| Percentile/median | median salary | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY …)` |
| Pivot | region × month matrix | conditional aggregation `SUM(CASE WHEN … THEN amt END)` |
| Hierarchy | org subtree | recursive CTE on an adjacency list |
| Keyset pagination | infinite scroll | `WHERE id > last ORDER BY id LIMIT n` |
| Delete duplicates | keep min-id row | self-join `DELETE … WHERE t.id > min_id` |

# Top 50 SQL Query Templates

Assume `employees e`, `orders o (customer_id, order_date, amount, status)`, `customers c`, `departments d`, `transactions t (id, amount, created_at)`, `events ev`.

**Foundations (1–10)**

1. NULL-safe filter: `SELECT * FROM t WHERE created_at IS NOT NULL`
2. NULL-safe equality: `WHERE a IS NOT DISTINCT FROM b`
3. Fallback value: `SELECT COALESCE(phone, email, 'n/a') FROM users`
4. Guard division: `COUNT(*)::numeric / NULLIF(total, 0)`
5. Conditional aggregation: `SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)`
6. Count distinct: `COUNT(DISTINCT customer_id)`
7. JSONb boolean flag: `SUM((payload->>'is_bot')::int)` (PG/MySQL 8)

**Windows (8–18)**

8. Top-N per group: `SELECT * FROM (SELECT e.*, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn FROM e) x WHERE rn <= 3`
9. Latest row per group: same with `rn = 1`
10. Nth highest salary: `SELECT DISTINCT salary FROM e ORDER BY salary DESC LIMIT 1 OFFSET 1`
11. Running total: `SELECT id, amount, SUM(amount) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) FROM t`
12. 7-day moving average: `AVG(amount) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`
13. Previous row (comparison): `LAG(amount, 1, 0) OVER (ORDER BY period)`
14. Next row: `LEAD(created_at) OVER (PARTITION BY user_id ORDER BY created_at)`
15. Share of total: `amount / SUM(amount) OVER ()`
16. Rank without gaps: `DENSE_RANK() OVER (ORDER BY sales DESC)`
17. Percentile bands: `NTILE(4) OVER (ORDER BY salary)` → quartiles
18. Median: `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) OVER ()`

**Dates (19–28)**

19. Sargable month filter (PG): `WHERE created_at >= date_trunc('month', CURRENT_DATE) AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month'`
20. This month boundary (SQL Server): `WHERE created_at >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)`
21. Last 30 days: `WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`
22. Last full day: `WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`
23. Last month (calendar): half-open pair on the previous month's boundaries
24. Extract: `EXTRACT(YEAR FROM created_at)`, `EXTRACT(ISODOW FROM d)` (PG), `DATEPART(weekday, …)`, `DATE_PART`
25. Timezone convert: `created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'`
26. Group by day (PG): `date_trunc('day', created_at)`
27. Age: `DATE_PART('year', age(birth_date))` (PG), `DATEDIFF(year, birth_date, GETDATE())` (SQL Server)
28. Year-over-year: `SUM(CASE WHEN EXTRACT(YEAR FROM d) = 2024 …)` or LAG over yearly totals

**Aggregations (29–36)**

29. Counts by status incl. zero rows: `SELECT s.status, COUNT(o.order_id) FROM (SELECT 'shipped' status UNION ALL SELECT 'pending') s LEFT JOIN o ON o.status = s.status GROUP BY s.status`
30. Group totals with detail via window: `COUNT(*) OVER (PARTITION BY dept_id)`
31. Rollup: `SELECT dept_id, month, SUM(amount) FROM o GROUP BY ROLLUP(dept_id, month)` → totals per dept and grand total
32. Cube: `GROUP BY CUBE(dept_id, month)` → every combination
33. Grouping sets: `GROUP BY GROUPING SETS ((dept_id), (month), ())`
34. Filter per aggregate: `COUNT(*) FILTER (WHERE status = 'paid')` (PG/SQLite; emulate with CASE elsewhere)
35. Mode: `SELECT salary FROM e GROUP BY salary ORDER BY COUNT(*) DESC LIMIT 1`
36. Z-score outlier flag: `(x - AVG(x) OVER ()) / NULLIF(STDDEV(x) OVER (), 0) > 2`

**Joins / anti / semi (37–44)**

37. Customers with no orders: `SELECT * FROM c WHERE NOT EXISTS (SELECT 1 FROM o WHERE o.customer_id = c.id)`
38. Customers with ≥ 1 order: `WHERE EXISTS (…)`
39. Customers who never ordered product X: `WHERE NOT EXISTS (SELECT 1 FROM o WHERE o.customer_id = c.id AND o.product_id = X)`
40. All customers + order totals incl. none: `SELECT c.id, COALESCE(SUM(o.amount), 0) FROM c LEFT JOIN o ON o.customer_id = c.id GROUP BY c.id`
41. Department summary incl. empty depts: `SELECT d.id, COUNT(e.employee_id) FROM d LEFT JOIN e ON e.dept_id = d.id GROUP BY d.id`
42. Division ("bought every product"): `GROUP BY c.id HAVING COUNT(DISTINCT o.product_id) = (SELECT COUNT(*) FROM products)`
43. Self-join to find duplicates: `SELECT a.id FROM orders a JOIN orders b ON a.customer_id = b.customer_id AND a.created_at = b.created_at AND a.id > b.id`
44. Fan-out-safe paid count: `SELECT c.id, (SELECT COUNT(*) FROM o WHERE o.customer_id = c.id AND o.status='paid') FROM c`

**Set operations (45–47)**

45. UNION with dedup: `SELECT city FROM customers UNION SELECT city FROM branches`
46. UNION ALL append: `SELECT order_id FROM jan UNION ALL SELECT order_id FROM feb`
47. IN (both tables): `SELECT product_id FROM jan_sales INTERSECT SELECT product_id FROM feb_sales`

**DML / dedup (48–51)**

48. Upsert PG: `INSERT INTO o (id, amount) VALUES (1, 10) ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount`
49. Upsert MySQL: `INSERT INTO o (id, amount) VALUES (1, 10) ON DUPLICATE KEY UPDATE amount = VALUES(amount)`
50. Delete duplicate rows keep lowest id: `DELETE a FROM orders a, orders b WHERE a.customer_id = b.customer_id AND a.created_at = b.created_at AND a.id > b.id` (MySQL; write the equivalent EXISTS self-join elsewhere)
51. Safe row update: `UPDATE o SET status = 'refunded' WHERE order_id IN (SELECT order_id FROM refunds)` in a transaction

**Pagination / hierarchy (52–55)**

52. Keyset pagination: `SELECT * FROM o WHERE (order_id) > $last_id ORDER BY order_id LIMIT 50`
53. Composite keyset: `WHERE (created_at, id) > ($last_ts, $last_id) ORDER BY created_at, id LIMIT 50`
54. Offset pagination (shallow only): `ORDER BY id LIMIT 20 OFFSET 40`
55. Recursive subtree: `WITH RECURSIVE s AS (SELECT * FROM c WHERE category_id = $root UNION ALL SELECT ch FROM c ch JOIN s ON ch.parent_id = s.category_id) SELECT * FROM s`

**Misc analytics (56–60)**

56. Consecutive-day streak length: island group = `created_at::date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at::date)`, then count per group
57. Session identifier: `SUM(CASE WHEN gap > interval '30 minutes' THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY ts)` as session_id
58. Funnel step counts: `SUM(CASE WHEN step >= 1 THEN 1 END) …` from a prefixed funnel table
59. Calendar zero-fill: `SELECT d.day, COALESCE(x.total, 0) FROM generate_series('2024-01-01','2024-01-31','1 day') … LEFT JOIN (SELECT date_trunc('day', created_at) day, COUNT(*) total …) x ON …`
60. Sample rows: `SELECT * FROM t TABLESAMPLE SYSTEM (1)` (PG/SQL Server) or `ORDER BY random() LIMIT 100`

# SQL Problem-Solving Framework

Work in five phases:

1. **Clarify** — what should one output row represent? Expected row count? Ties, NULL policy, duplicate handling, aliases, performance constraints.
2. **Map** — which tables and grains; relationship cardinality (1:1 / 1:N / M:N); which join type keeps/drops which rows; can the join fan out?
3. **Choose** — pick the pattern (JOIN / subquery / CTE / window / recursive CTE / LATERAL / temp table); semi vs anti join; agg-before-join; pagination method.
4. **Write** — build in layers; name every derived column; filter early; aggregate deliberately; keep it set-based and readable.
5. **Verify** — hand-check on the smallest sample; count outputs vs grain; test edge cases (zero rows, all ties, NULL keys, duplicate seeds); run `EXPLAIN (ANALYZE)` and compare estimated vs actual rows.

Rapid-fire question checklist:

- What does one output row represent (the grain)?
- Which table drives, and does it need LEFT vs INNER?
- Does a second 1:N join cause N×M fan-out? Pre-aggregate which side first?
- On ties, do I want ROW_NUMBER / RANK / DENSE_RANK?
- Could `NOT IN` fire a NULL trap? Use `NOT EXISTS`.
- Do I need `COALESCE`, `IS [NOT] DISTINCT FROM`, `NULLIF`, half-open date ranges?
- Is `UNION` vs `UNION ALL` the semantics I want?
- Is a filter over the preserved side in WHERE incorrectly narrowing a LEFT JOIN?
- Help the optimizer: SARGable predicates, covering indexes, fresh stats.
- Which plan decision am I making from folklore that I should verify with `EXPLAIN`?

Verification moves: run fragments independently; compare counts against known totals; introduce edge rows deliberately; inspect the plan for Index Seek vs Scan, Filter placement, estimated vs actual rows, and join algorithm. Never assert "faster" without a measured before/after.
