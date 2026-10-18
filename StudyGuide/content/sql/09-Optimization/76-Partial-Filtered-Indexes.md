# 76 — Partial / Filtered Indexes

## Fundamentals

A **partial index** (PostgreSQL / CockroachDB) or **filtered index** (SQL Server) is an index that contains entries for **only a subset of the rows** of a table. The subset is defined by a **predicate** — a logical condition evaluated per row.

Everything else about the index behaves like a normal B-tree index:

- the index still stores key copies + row pointers/TIDs
- the optimizer still decides whether to use it based on cost
- the index is still maintained on `INSERT`, `UPDATE`, `DELETE`

The only difference is _which rows are even eligible to be indexed_.

> A normal index answers "which rows have key value X?"  
> A partial/filtered index answers "which rows **in my chosen subset** have key value X?"

### Why it exists

Most indexes waste space on rows that are almost never queried. Classic cases:

- A table where **5% of rows** are `status = 'PENDING'` and **95%** are `'COMPLETED'` — queries that touch pending orders are hot, queries over completed orders usually scan anyway.
- During joins there are a couple of "goal records" among many.

The index exists to serve a small, well-defined working set. A partial index:

1. **is smaller** → less disk, less buffer-pool pressure, fewer pages to read per lookup
2. **has better cache locality** → the hot subset fits in RAM
3. **has less write overhead** → rows that never match the predicate never touch the index
4. **yields more accurate statistics** → the index's own stats describe only the hot subset

### The rule of thumb

If a query for a value would **not use an index anyway** (because that value accounts for more than a few percent of the table), then keeping those rows in the index is pure waste. Partial indexes exist to avoid indexing precisely those common values.

> PostgreSQL docs: _"One major reason for using a partial index is to avoid indexing common values. Since a query searching for a common value ... will not use the index anyway, there is no point in keeping those rows in the index at all."_

### Grain disclaimer

Index predicates are per-row filters, not per-query. The index predicate is applied to **each row independently**. There is no aggregation, no referencing other tables, no window functions in an index predicate. Keep this in mind: the predicate describes a row, not a result set.

---

## What it is NOT

A partial index is **not**:

- a partitioning scheme
- a way to physically separate data
- a materialized view
- a constraint (though a partial **unique** index can enforce subset uniqueness — see below)

> The database still stores every row in the heap; the partial index is only a lookup aid for a chosen subset.

---

## Terminology by database

| Database    | Name                    | Native SQL keyword                              | Notes                                                                          |
| ----------- | ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| PostgreSQL  | Partial index           | `WHERE` clause in `CREATE INDEX`                | Arbitrary predicate allowed (columns/expressions of the indexed table)         |
| SQL Server  | Filtered index          | `WHERE` clause in `CREATE [NONCLUSTERED] INDEX` | Disk-based nonclustered indexes only                                           |
| CockroachDB | Partial index           | `WHERE` clause                                  | Same idea as PostgreSQL                                                        |
| SQLite      | Partial index           | `WHERE` clause                                  | Supported                                                                      |
| MySQL       | None                    | N/A                                             | Emulate with generated columns or functional indexes (8.0.13+)                 |
| Oracle      | None                    | N/A                                             | Emulate with function-based index + `CASE` expression (true partial in effect) |
| DB2         | Partial index (limited) | `WHERE` clause                                  | Historically single-predicate                                                  |

The concept is the same everywhere: **"only index rows for which `<predicate>` is true."** The SQL and the caveats differ.

---

## Internal working

### Storage

A partial index is an ordinary B-tree — it contains only the entries for rows matching the predicate. Rows that don't match the predicate are **completely absent**: no key, no pointer, no placeholder.

Consequences:

- fewer index pages → fewer physical I/Os per seek
- smaller index → more of it fits in the buffer pool / page cache
- INSERT/UPDATE/DELETE of a non-matching row does not modify the index at all
- UPDATE that changes a row from non-matching → matching must create an index entry, and vice versa

### Write cost asymmetry

| Operation                  | Row matches predicate? | Index work          |
| -------------------------- | ---------------------- | ------------------- |
| INSERT                     | no                     | none                |
| INSERT                     | yes                    | one new index entry |
| UPDATE (still matches)     | yes                    | normal index update |
| UPDATE (no longer matches) | departs                | index entry removed |
| UPDATE (now matches)       | enters                 | index entry added   |
| DELETE                     | yes                    | index entry removed |
| DELETE                     | no                     | none                |

So a status column that rows constantly churn through (e.g., PENDING → SHIPPED → COMPLETED) causes a **small write spike exactly at the transition**. This is usually acceptable because the subset is small.

### Optimizer implication

This is the single most important mechanic to understand.

> A partial index can be used only if the optimizer can prove that the **query's `WHERE` condition mathematically implies the index predicate.**

PostgreSQL explicitly warns that it has _"no sophisticated theorem prover,"_ so the query must be written in a form that the planner recognizes. Practical consequence: for the query to use the partial index, the `WHERE` clause must contain conditions strong enough to guarantee "every row I'm asking about satisfies the index predicate."

Example patterns:

| Index predicate            | A query that will use the index                        | A query that cannot use it                         |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `WHERE status = 'PENDING'` | `SELECT ... WHERE status = 'PENDING' AND priority = 1` | `SELECT ... WHERE priority = 1`                    |
| `WHERE status = 'PENDING'` | `SELECT ... WHERE status = 'PENDING'`                  | `SELECT ... WHERE status IN ('PENDING','SHIPPED')` |
| `WHERE billed = false`     | `SELECT ... WHERE billed = false AND order_nr < 10000` | `SELECT ... WHERE order_nr < 10000`                |

In SQL Server the situation is the same in spirit but with slightly different mechanics: the optimizer may still _estimate_ using the filtered index and compare cost, but it will refuse it for queries whose predicate is **not guaranteed** to be within the index's range (most importantly, parameterized queries — see Production Pitfalls).

### Statistics

- PostgreSQL: `ANALYZE` / autovacuum collect per-index statistics _for each partial index separately_. Those stats describe only the subset. Without stats, the planner estimates blindly.
- SQL Server: a filtered index carries **filtered statistics** — histograms built only from the indexed subset, which are _more accurate_ for that subset than full-table stats would be.
- MySQL / Oracle workarounds rely on normal per-column stats.

> Production pitfall: after bulk loads, `ANALYZE` (or equivalent) so the planner sees the true selectivity of the subset. Partial indexes that existed at table creation on a freshly bulk-loaded table can look "0 rows" to the planner.

---

## Syntax

### PostgreSQL

```sql
CREATE INDEX idx_orders_pending
    ON orders (priority, created_at)
    WHERE status = 'PENDING';
```

- The `WHERE` clause is the **predicate**.
- The predicate may reference **any column of the indexed table**, not just indexed columns.
- Predicate functions must be **immutable**.
- Works with `UNIQUE`:

```sql
CREATE UNIQUE INDEX uq_one_active_default
    ON user_addresses (user_id)
    WHERE is_default;
```

This allows a user to have many addresses but **at most one marked default**.

### SQL Server

```sql
CREATE NONCLUSTERED INDEX ix_orders_pending
    ON dbo.orders (priority, created_at)
    INCLUDE (customer_id, total)
    WHERE status = 'PENDING';
```

Requirements and restrictions:

- only on **nonclustered** disk-based rowstore indexes
- the filter may use comparisons, `IS NULL` / `IS NOT NULL`, `IN`, and `AND`/`OR`
- **not** allowed in the filter: `LIKE`, `BETWEEN`, `NOT IN`, `CASE` expressions, `GETDATE()` / similar dynamic date math
- must be created with specific session options:

```sql
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

CREATE NONCLUSTERED INDEX ix_employees_active
    ON dbo.employees (email)
    WHERE EndDate IS NULL;
GO
```

### MySQL — emulation via generated column

MySQL has **no** native partial index. The standard workaround: a generated column that is `NULL` for non-matching rows, then an index on it, then query on that column.

```sql
ALTER TABLE orders
    ADD COLUMN pending_flag TINYINT
        GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN 1 ELSE NULL END)
        STORED,
    ADD INDEX idx_orders_pending (pending_flag, created_at);
```

Query:

```sql
SELECT order_id, priority
FROM orders
WHERE pending_flag = 1
  AND priority = 1;
```

Why the flag must be `NULL` (not `0`) for non-matching rows: `WHERE pending_flag = 1` can use the index **only** for the literal `1`; there are no comparable "0 entries" to skip, and InnoDB still stores `NULL` entries physically. The index is "semantically filtered" via the `= 1` search, not truly sparse. See the NULL behavior section below for the exact implication.

MySQL 8.0.13+ also has **functional key parts**, which can index a `CASE` expression directly — but the rows are still physically indexed (as `NULL`), so the space savings are not the same as a true partial index:

```sql
CREATE INDEX idx_orders_pending ON orders ((CASE WHEN status = 'PENDING' THEN 1 END));
```

The query must use the **identical expression** for the index to be considered.

### Oracle — emulation via function-based index

Oracle B-tree indexes **omit rows where all indexed columns are NULL**. So a function-based index that produces `NULL` for non-matching rows behaves like a genuine partial index and is genuinely smaller:

```sql
CREATE INDEX idx_orders_pending
    ON orders (CASE WHEN status = 'PENDING' THEN priority END);
```

Query (must repeat the expression):

```sql
SELECT order_id
FROM orders
WHERE CASE WHEN status = 'PENDING' THEN priority END = 1;
```

> Oracle gotcha: unlike PostgreSQL/SQL Server, the optimizer will not rewrite `WHERE status = 'PENDING' AND priority = 1` to use this index. The query must contain the exact expression.

---

## Sample tables (used throughout)

```sql
-- One row = one order.
CREATE TABLE orders (
    order_id    BIGSERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    status      TEXT NOT NULL
                CHECK (status IN ('PENDING','SHIPPED','COMPLETED','CANCELLED')),
    priority    SMALLINT,
    total       NUMERIC(10,2),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    shipped_at  TIMESTAMPTZ
);

-- One row = one user account.
CREATE TABLE users (
    user_id     BIGSERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ
);

-- One row = one address of one user.
CREATE TABLE user_addresses (
    address_id  BIGSERIAL PRIMARY KEY,
    user_id     INT NOT NULL,
    kind        TEXT NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

-- One row = one login event.
CREATE TABLE logins (
    login_id    BIGSERIAL PRIMARY KEY,
    user_id     INT NOT NULL,
    success     BOOLEAN NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL
);
```

---

## Scenario-based examples

### Scenario 1: hot subset of orders

The table has 10 million orders; only ~150,000 are `PENDING`. The ops dashboard is constantly filtering pending orders by priority, and reports keep scanning the rest.

#### BAD APPROACH — index everything

```sql
CREATE INDEX idx_orders_full
    ON orders (status, priority, created_at);
```

- ~10M index entries, most of which are `COMPLETED` rows that are almost never looked up by `status`.
- Writes to the index on **every** order insert and status change, forever.
- The index is larger than the hot data needs.

> Note: this is not "always wrong." For statuses that _are_ queried often and are highly selective, a full index may be fine. The point is that here the working set is tiny.

#### BETTER APPROACH — partial index on the hot subset

```sql
CREATE INDEX idx_orders_pending
    ON orders (priority, created_at)
    WHERE status = 'PENDING';
```

Query:

```sql
SELECT order_id, customer_id, priority
FROM orders
WHERE status = 'PENDING'
  AND priority = 1
ORDER BY created_at;
```

PostgreSQL plan (illustrative):

```
Index Scan using idx_orders_pending on orders  (cost=0.29..120.0 rows=2300 width=...)
  Index Cond: (priority = 1)
```

With the partial index, the seek goes straight into a ~150k-entry index that likely fits in memory. Without it, the planner faces a ~10M-entry index (or worse, a seq scan) where `status` world doesn't narrow much.

#### Expected behavior summary

| Approach                        | Index entries | Rows scanned by hot query | Write amortized cost     |
| ------------------------------- | ------------- | ------------------------- | ------------------------ |
| No index                        | 0             | seq scan of all rows      | none                     |
| Full `(status, priority)` index | ~10M          | few hundred (seek)        | every write              |
| Partial index                   | ~150k         | few hundred (seek)        | only PENDING transitions |

**Verify with the execution plan, not assumptions.** Compare `EXPLAIN (ANALYZE, BUFFERS)` for the query with and without the index on _your_ data distribution: look at actual scanned rows, buffers, and planning time.

### Scenario 2: soft-deleted users

Nearly all deleted users are excluded from every lookup. We almost always query "active user by email."

```sql
CREATE INDEX idx_users_active_email
    ON users (email)
    WHERE deleted_at IS NULL;

-- or boolean form:
CREATE INDEX idx_users_active_email_bool
    ON users (email)
    WHERE NOT is_deleted;
```

Query that benefits:

```sql
SELECT user_id, email
FROM users
WHERE email = 'alice@example.com'
  AND deleted_at IS NULL;
```

Query that **cannot** use it:

```sql
SELECT user_id
FROM users
WHERE email = 'alice@example.com';   -- may match a deleted user too
```

The planner cannot prove the second query only asks for rows in the index, so it must look elsewhere (seq scan or another index). If occasionally you also need "find this email regardless of deletion," you need **both** indexes (or accept the seq scan for that rare path).

### Scenario 3: sparse column

`users.external_ref` is `NULL` for 99% of users and is only ever read for the 1% that have it.

#### BAD APPROACH

```sql
CREATE INDEX idx_users_external_ref ON users (external_ref);
```

A full index. Since B-trees in PostgreSQL, SQL Server and MySQL **do include NULL entries**, this index is filled mostly with NULLs and duplicates (for the b-tree, every NULL is a separate entry requiring deduplication space).

#### BETTER APPROACH

```sql
CREATE INDEX idx_users_external_ref
    ON users (external_ref)
    WHERE external_ref IS NOT NULL;
```

Now the index stores only the meaningful values. Lookups `WHERE external_ref = 'ref-123'` are unaffected (a NULL can never equal it), but the index is dramatically smaller.

### Scenario 4: subset uniqueness (a very common real pattern)

Enforce "one default address per user" while allowing unlimited non-default addresses.

```sql
CREATE UNIQUE INDEX uq_user_addresses_one_default
    ON user_addresses (user_id)
    WHERE is_default;
```

Attempt:

```sql
INSERT INTO user_addresses (user_id, kind, is_default) VALUES (7, 'home', TRUE);
INSERT INTO user_addresses (user_id, kind, is_default) VALUES (7, 'office', TRUE); -- fails
```

Expected error (PostgreSQL):

```
ERROR:  duplicate key value violates unique constraint "uq_user_addresses_one_default"
DETAIL:  Key (user_id)=(7) already exists.
```

This is also an interview favorite: **a partial unique index is the only way to enforce uniqueness over a subset of a table with standard SQL.**

The slightly mind-bending sibling — allow **only one NULL**:

```sql
CREATE UNIQUE INDEX uq_unique_null
    ON employees (manager)
    WHERE manager IS NULL;   -- at most one row may have NULL here
```

Postgres unique indexes normally treat NULLs as distinct, so multiple NULLs are allowed. Restricting the _unique_ index to NULL rows flips that: at most one row with `NULL` can exist, and non-NULL values are unrestricted.

> Interview trap: "A filtered index can be used as a foreign key." — No. FK constraints require a key that covers **all** rows of the referenced columns, so a partial/filtered unique index cannot back a foreign key in any of the major databases.

### Scenario 5: fast `COUNT(*)` of a small subset

For dashboard counters ("how many pending orders?"):

```sql
SELECT count(*) AS pending_count
FROM orders
WHERE status = 'PENDING';
```

Without a partial index the server often scans a lot. With the partial index, if the index can serve the query without touching the heap (PostgreSQL index-only scan, SQL Server filtered index + key lookups only when needed), you may read just the small index.

> Verify with `EXPLAIN`: an index-only / index-scan showing low `rows` estimate and page reads means the partial index is paying for itself. If the plan still scans the whole table, the predicate on the query is not phrased in a way the optimizer matches.

---

## BAD vs BETTER — comparison table

| Aspect                         | Full `(status, priority, created_at)` | Partial `(priority, created_at) WHERE status='PENDING'`          |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------- |
| Index entries                  | all 10M rows                          | ~150k rows                                                       |
| Query for `status='PENDING'`   | seek possible                         | seek possible (smaller)                                          |
| Query for `status='COMPLETED'` | seek possible (rarely useful)         | **not served by this index** (needed only if such queries exist) |
| Insert of a COMPLETED order    | touches index                         | no index touch                                                   |
| Status flip to COMPLETED       | removes+adds entries                  | removes from index                                               |
| Statistics accuracy            | diluted by 95% common value           | accurate for the hot subset                                      |
| Fragility                      | low                                   | **higher** — see production pitfalls                             |

---

## NULL behavior

### 1. NULLs in normal indexes

> Common misconception: "NULL values are not stored in indexes."

This is **false** for PostgreSQL, SQL Server and MySQL:

- **PostgreSQL**: B-tree indexes include NULL entries (with many NULLs, this can bloat the index and trigger deduplication).
- **SQL Server**: nonclustered indexes include NULL values (single-column index on a mostly-NULL column is mostly-NULL entries).
- **MySQL / InnoDB**: secondary indexes include NULL entries.
- **Oracle**: B-tree indexes **omit rows where the entire index key is NULL** (this is why the Oracle `CASE`-trick yields a true partial index).

So "index only the non-NULL values" is exactly what `WHERE col IS NOT NULL` gives you on PostgreSQL/SQL Server — shaving real bloat from a mostly-NULL column.

### 2. NULL in the predicate itself

| Predicate                        | Rows in the partial index                |
| -------------------------------- | ---------------------------------------- |
| `WHERE deleted_at IS NULL`       | only "active" (not-source-deleted) rows  |
| `WHERE external_ref IS NOT NULL` | only rows with a meaningful external ref |
| `WHERE shipped_at IS NOT NULL`   | only shipped orders                      |
| `WHERE status = 'PENDING'`       | independent of NULLs in other columns    |

Combining with normal NULL-aware predicates is fine:

```sql
CREATE INDEX idx_orders_shipped
    ON orders (shipped_at, total)
    WHERE shipped_at IS NOT NULL AND status = 'COMPLETED';
```

### 3. Three-valued logic in predicates

The index predicate is just a boolean expression. Under SQL's **three-valued logic**, a row where the predicate evaluates to `NULL` or `UNKNOWN` is **excluded**:

- `WHERE external_ref = 'x'` → rows where `external_ref IS NULL` are excluded (UNKNOWN)
- `WHERE deleted_at IS NULL` → rows where `deleted_at IS NULL` are included (TRUE); others excluded

So an `IS NULL` predicate behaves predictably with three-valued logic, whereas `WHERE NOT (col = 'x')` excludes NULL rows. Choose the predicate that matches _your_ intended subset.

---

## Edge cases

### Predicate implication failure

One of the most common reasons a partial index is silently never used — the query does not _imply_ the predicate.

```sql
CREATE INDEX idx_orders_pending ON orders (priority) WHERE status = 'PENDING';

-- Useless: the query might be asking about a COMPLETED order.
SELECT * FROM orders WHERE priority = 1;
```

Always mentally check: _"Can every row in my result set satisfy the index predicate?"_ If the answer is "no," the index is inapplicable.

### Equivalent forms that the optimizer cannot connect

PostgreSQL's planner is not a general theorem prover:

```sql
-- index predicate:  WHERE billed IS NOT TRUE
-- this query will NOT use it, even though logically equivalent:
SELECT * FROM orders WHERE NOT billed;
```

Rewrite queries in the same shape/form as the predicate to maximize matching.

### OR / IN widening the predicate

```sql
-- index: WHERE status = 'PENDING'
SELECT * FROM orders WHERE status IN ('PENDING','SHIPPED') AND priority = 1;
```

Two issues: (a) the plan may not use _only_ the partial index because it must also cover SHIPPED, and (b) PostgreSQL can combine multiple indexes via bitmap OR if separate partial indexes exist for each value, but this is plan-dependent. **Check the plan.**

### Parameterized queries (SQL Server)

> The single biggest production gotcha with SQL Server filtered indexes: they are **not used** for parameterized or variable-based predicates — the optimizer cannot guarantee the parameter value falls inside the filter's range for _all_ future executions.

```sql
DECLARE @s VARCHAR(20) = 'PENDING';
SELECT * FROM orders WHERE status = @s;   -- filtered index likely NOT used
```

Signature: the plan shows an **`UnmatchedIndexes`** warning on the SELECT operator. Workarounds:

- hard-code literal values (dynamic SQL)
- `OPTION (RECOMPILE)` — for low-frequency queries only
- use an explicit index hint (`WITH (INDEX(ix_orders_pending))`) — override with caution; future values outside the filter range will make the hint invalid for the query.

### Parameterized / prepared queries (PostgreSQL)

PostgreSQL's **generic plan** (used after the threshold of repeated executions) substitutes parameter placeholders and cannot always prove `$1 = 'PENDING'`, so the partial index is skipped. With literal values or a fresh custom plan it is used. If a hot prepared statement stops using the partial index, this is the usual cause. `EXPLAIN` on the statement as written by the driver will show the difference.

### Zero matching rows (SQL Server `IS NULL` quirk)

A filtered index `WHERE col IS NULL` **where `col` is not part of the index key or INCLUDE** may be ignored for queries that need `col` back:

```sql
CREATE NONCLUSTERED INDEX ix_filt ON dbo.t (action_type) WHERE action_date IS NULL;

-- can silently fall back to a clustered index scan:
SELECT count(*) FROM dbo.t WHERE action_date IS NULL AND action_type = 1;
```

Fix: put the filtered column in the index (`INCLUDE (action_date)` or as a key), so the optimizer can trust the filter without a heap probe. This is a documented SQL Server behavior — a classic debugging question.

### Volatile functions in the predicate

PostgreSQL requires the predicate be **immutable**:

```sql
-- ERROR:  functions in index predicate must be marked IMMUTABLE
CREATE INDEX idx_recent ON logins (user_id) WHERE created_at > now() - interval '7 days';
```

Use a static anchor instead:

```sql
CREATE INDEX idx_logins_2026 ON logins (user_id)
    WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```

(SQL Server has the same spirit of restriction: `GETDATE()` etc. not allowed in filters.)

### Subqueries / other-table references not allowed in the predicate

An index cannot depend on another table's data:

```sql
-- NOT allowed
CREATE INDEX bad ON orders (priority)
    WHERE total > (SELECT avg(total) FROM orders);
```

### Partitioned tables

- PostgreSQL: unique constraints on partitioned tables must include all partition-key columns; expression/partial indexes interact with partitioning support that has **changed across versions**. Never assume; verify on your version with `EXPLAIN` and `\d` output.
- A partial index is **not a substitute for partitioning** (PostgreSQL docs explicitly warn against building a family of non-overlapping partial indexes to "simulate" range partitions — the planner must laboriously test each one for applicability).

---

## Common mistakes

1. **Query without the predicate column** → index silently unused; you think you have optimized but plans show scans.
2. **Widening predicates** (`IN`, `OR`, `<`/`>` ranges that extend past the filter) → index inapplicable.
3. **Parameterized queries** (SQL Server) and **prepared statements** (PostgreSQL) → optimizer can't commit to the filter.
4. **Predicate on a volatile function** → DDL error in PostgreSQL.
5. **No `ANALYZE` after bulk load** → planner has no stats for the subset and misprices the index.
6. **Building it for a subset that is most of the table** → the partial index is barely smaller than a full index but far more fragile.
7. **Relying on it for `ORDER BY` / `GROUP BY` without checking** the plan — partial indexes can help order scans, but only when the plan actually picks them.
8. **MySQL:** querying the original expression instead of the generated column (or not matching the functional-index expression exactly) → index unused.
9. **Oracle:** writing `WHERE status = 'PENDING' AND priority = 1` against a `CASE`-based index → expression doesn't match → unused.

---

## Production pitfalls

- **Silent plan regression.** A minor query-rewrite (adding one `OR`, reordering clauses, introducing a parameter) can drop the partial index from the plan entirely and turn a previously fast query into a scan. Monitor plans for hot queries after any code change.
- **The hard-coded / parameterized tension.** Filtered indexes reward literal constants and punish shared parameterized plans. This makes them harder to keep efficient in ORM-heavy codebases where queries are always parameterized.
- **Casual `OPTION (RECOMPILE)`.** Fixes the UnmatchedIndexes issue but defeats plan caching and can hurt overall throughput. Restrict to infrequent, expensive queries.
- **Multiple overlapping partial indexes.** Each one imposes maintenance and confusion. Prefer three or four _intended_ partial indexes over twelve ad-hoc ones.
- **Hidden build cost.** `CREATE INDEX` on a huge table with a predicate still scans the whole heap once to evaluate the predicate. Expect a long initial build/lock on big tables (use `CREATE INDEX CONCURRENTLY` in PostgreSQL, and account for the extra pass in SQL Server too).
- **Forcing with hints.** `WITH (INDEX(...))` in SQL Server can make the query fail if the parameter now targets values outside the filter window (Msg 8622-style plan errors). Revalidate every time the predicate changes.
- **Stats thrash.** Partial indexes get filtered stats; if the subset changes character daily (e.g., "recent logs"), stats can be stale fast. `ANALYZE` scheduling matters.

### Monitoring

- **SQL Server**: look for `UnmatchedIndexes` warnings; query `sys.indexes` with `has_filter = 1` to inventory filtered indexes; use `sys.dm_db_index_usage_stats` to find unused ones.
- **PostgreSQL**: `EXPLAIN (ANALYZE, BUFFERS)` plus `pg_stat_user_indexes`; track `idx_scan` vs `idx_tup_read`/`idx_tup_fetch`.
- **MySQL/Oracle**: `EXPLAIN`/`EXPLAIN PLAN` `key` column; confirm the expected index appears.

---

## Performance implications — always verify

A partial index is not automatically better than a full index. Outcomes depend on the optimizer, statistics, cardinality, data distribution, query shape, engine, and execution plan. For example:

- If the subset is **>10–20% of rows**, the partial index saves little and costs fragility.
- If queries _always_ include the predicate but you look up with a _different_ column, the partial index may be the wrong one (indexed columns matter).
- Very small subsets can make the planner prefer a scan for a single-cost measurement while a full index would still win for many similar queries.

Always compare with the execution plan on real data:

```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS)
SELECT order_id FROM orders
WHERE status = 'PENDING' AND priority = 1;

-- SQL Server
SET STATISTICS TIME ON; SET STATISTICS IO ON;
SELECT order_id FROM orders WHERE status = 'PENDING' AND priority = 1;
-- then look at the actual execution plan (Ctrl+M)

-- MySQL / Oracle: EXPLAIN / EXPLAIN PLAN and check the `key` column
```

Measure what matters for _your_ case: actual scanned rows, page reads (`BUFFERS`/logical reads), planning time, and whether the index is sought vs merely scanned.

---

## When to use a partial index

- A small, stable, frequently-accessed subset of a large table.
- Predicates are **constants/immutable** in practice (status values, boolean flags, `IS NULL` soft-delete markers).
- You need **subset uniqueness** (at most one default, one active token, one pending cancellation).
- A mostly-NULL column where only non-NULL values are queried.
- You want cheaper writes for the majority rows (not touching the index at all).
- Dashboard `COUNT(*)`/top-K queries over a small subset.

## When NOT to use a partial index

- The subset covers a large fraction of the table (`> ~10–20%`, roughly).
- The queries hitting the subset are rare or low-value.
- Queries are always **parameterized** and you cannot afford literals/`RECOMPILE` (SQL Server). Without exact-value predicates the filtered index may sit unused while a plain covering index would at least get used.
- You are tempted to build **many overlapping partial indexes** to fake partitioning.
- Data churns in/out of the predicate so fast that index-maintenance write amplification cancels the gain.
- Your predicates depend on wall-clock time — “everything in the last 7 days” is a moving target that either forces a static anchor or is impossible.

---

## Comparison tables

### Partial vs full vs covering (same query)

|                                   | Full index   | Partial index | Covering (full) index                       |
| --------------------------------- | ------------ | ------------- | ------------------------------------------- |
| Space                             | all rows     | subset only   | larger (has INCLUDE)                        |
| Lookup for subset                 | yes          | yes           | yes (no heap access)                        |
| Lookup outside subset             | yes          | no            | yes                                         |
| Write cost for out-of-subset rows | yes          | no            | yes                                         |
| Best for                          | mixed access | hot subset    | repeated column-heavy subset & full queries |

### Native vs emulated

| Database                 | True partial? | Space savings               | Query must write special form? | Risk                         |
| ------------------------ | ------------- | --------------------------- | ------------------------------ | ---------------------------- |
| PostgreSQL               | Yes           | Yes (rows absent)           | Keep query ∧ predicate implied | predicate misleading         |
| SQL Server               | Yes           | Yes (rows absent)           | exact/literal-ish predicates   | parameterization             |
| CockroachDB              | Yes           | Yes                         | predicate implication          | young feature set            |
| Oracle (CASE trick)      | Effectively   | Yes (all-NULL keys dropped) | exact expression in query      | rewriting burden             |
| MySQL (generated col)    | No            | No (NULLs still stored)     | reference the generated column | confusion/null semantics     |
| MySQL 8.0.13+ functional | No            | No                          | exact expression               | hidden virtual cols / limits |

---

## Best practices

1. **Start from the workload**, not the table: which query shapes are hot, what subset do they touch, how selective is the predicate?
2. **Write the predicate and the query in the same shape.** Literal constants, same operators, same column references.
3. **Keep the predicate cheap and immutable**: boolean flags, `IS NULL`, small enumerations.
4. **Do not over-index**: pick a handful of partial indexes for real workloads.
5. **Verify with execution plans and real statistics** (`EXPLAIN`/`EXPLAIN ANALYZE`, `SET STATISTICS IO/TIME`, `BUFFERS`).
6. **ANALYZE after bulk changes**, and check that the planner sees the subset's selectivity.
7. Documentation via comments/DDL naming: `idx_orders_pending_priority`, `uq_..._one_default` — the name should carry intent.
8. **Rebuild/re-evaluate after schema or data-distribution changes** — a partial index that made sense at 5% may be useless at 30%.

---

## Cross-references

See also related handbook sections:

- **Indexes in general** — B-tree mechanics, seek vs scan (Optimization).
- **Composite & covering indexes** — key order, INCLUDE, leftmost prefix (Optimization).
- **Expression / function-based indexes** — immutable functions, `LOWER()`, `CASE` tricks.
- **Table partitioning** — use it when the subset grows too large for a partial index.
- **Statistics & cardinality estimation** — why `ANALYZE` and filtered statistics matter.
- **EXPLAIN / execution plans** — how to verify any of this on your engine.
- **NULL and three-valued logic** — predicates, `IS NULL`, implication.
- **Uniqueness constraints** — where partial unique indexes fit and do not fit (FKs).

---

# Interview Questions

### Beginner

1. What is a partial index? What is a filtered index? How are they different from a normal index?
2. What table would you _not_ put a partial index on, and why?
3. True or false: "NULL values are always excluded from B-tree indexes." Explain.
4. Write the SQL to index only rows of `orders` where `status = 'PENDING'` in PostgreSQL.
5. How does a partial index affect `INSERT` of a row that does not match the predicate?

### Intermediate

6. The optimizer won't use my partial index. List three reasons.
7. What are the consequences of having most of the rows match the predicate?
8. How do filtered statistics (SQL Server) / per-index stats (PostgreSQL) change plan quality for the subset?
9. How would you enforce "at most one default address per user" with an index? Can you also allow only _one_ `NULL` in a column?
10. Why can't a partial unique index back a foreign key?

### Advanced

11. Explain the "mathematical implication" requirement between a query's `WHERE` and the index's predicate. Give a query that implies it and one that does not.
12. What happens to a partial index when a row's values change so it no longer matches the predicate? Walk through the write-cost model.
13. Compare the true-space behavior of PostgreSQL/SQL Server partial indexes vs the MySQL generated-column trick vs the Oracle `CASE`-function-based trick. Which are actually smaller?
14. Design partial-index coverage for this workload: 90% `COMPLETED` orders (never searched by status), 5% `PENDING` (seek by `priority`), 5% `CANCELLED` (seek by `created_at`). Which indexes would you propose, and how would you verify them?

### Scenario Based

15. A SaaS notification queue table: `status IN ('queued','sending','sent','failed')`; 99.9% `sent`. Emails are retried as `queued`. Which index(es) do you create? What hazards appear when the retry loop runs 24/7?
16. A `count(*)` dashboard shows "pending orders". Fast today, slow after a month. What will you check, and what partial-index design protects you?

### Tricky

17. Why might a PostgreSQL prepared statement _stop_ using a partial index, while a literal-bound version uses it every time?
18. Your T-SQL query with `WHERE status = @s` is not using a filtered index. The plan shows `UnmatchedIndexes`. What are the correct fixes — and which fix is dangerous at scale and why?
19. A filtered index `WHERE action_date IS NULL` is ignored, but adding `INCLUDE (action_date)` makes the optimizer use it. Explain the SQL Server behavior.
20. "Partial indexes are a cheap substitute for partitioning." Yes or no, and why (cite what PostgreSQL's own docs warn about).

### Output Prediction

21. Given

```sql
CREATE UNIQUE INDEX uq_ord ON t (a) WHERE flag;
```

and rows `(a=1, flag=true)`, `(a=1, flag=false)`, `(a=2, flag=true)` — which inserts/updates fail, which succeed?

22. With predicate `WHERE deleted_at IS NULL`, which rows does the index contain, given values `NULL`, `'2026-01-01'::timestamptz`, and a future timestamp?

23. Does this query use the index below? Predict the answer, then check with an actual EXPLAIN.

```sql
CREATE INDEX ix ON orders (priority) WHERE status = 'PENDING';
SELECT * FROM orders WHERE priority = 5;
```

### Debugging

24. A query was fast after you added a partial index, then regressed three weeks later with no code change. Walk through the debugging sequence (stats, piles, predicates, autovacuum/ANALYZE, limits).
25. `EXPLAIN` shows `Seq Scan` on a table that has a partial index that "obviously matches." List every check you perform before blaming the optimizer.

### Performance

26. How do you _prove_ a partial index beat a full index in your database? Give the concrete commands/tools per engine.
27. You added a partial index and a hot `UPDATE ... WHERE status = 'PENDING'` became slower. What mechanism could cause that, and how would you measure it?

_(These are practice questions — answer them yourself, then verify each with `EXPLAIN`/`EXPLAIN ANALYZE` and your engine's plan tools.)_
