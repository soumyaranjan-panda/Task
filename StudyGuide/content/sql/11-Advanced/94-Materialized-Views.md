# Section 94 — Materialized Views

## Fundamentals

A **materialized view** (often abbreviated *matview* or *MV*) is a database object that stores the **result set of a query as actual physical data** on disk.

A regular **view** is just a saved query definition. Every time you `SELECT` from a view, the database re-executes the underlying query, reading from the base tables.

A **materialized view** pre-computes and stores those results. When you `SELECT` from it, the database reads the stored data directly — no re-execution of the expensive query at read time.

> **Core idea:** A regular view saves *the recipe*. A materialized view saves *the cake that the recipe produced*.

| Property | Regular View | Materialized View | Base Table |
|---|---|---|---|
| Stores data | No | Yes | Yes |
| Query re-executed on read | Yes | No (reads stored data) | — |
| Always current | Yes | No (needs refresh) | Yes (as of committed writes) |
| Can be indexed | No | Yes | Yes |
| Can be partitioned | No | Yes | Yes |
| DML allowed on it directly | No (mostly) | In some engines (PG `--` no; Oracle can; SQL Server indexed views restricted) | Yes |
| Has storage cost | Zero | High | High |
| Speeds up complex reads | No | Yes | — |
| Slows down writes | No | Depends on refresh strategy | Yes |

---

## Why Materialized Views Exist

Some queries are so expensive that running them repeatedly is wasteful:

- multi-table `JOIN`s over millions of rows
- heavy aggregations (`GROUP BY`, `COUNT`, `SUM`, `AVG`)
- `DISTINCT` over large columns
- recursive CTE results
- nested scans across huge fact tables

Running such a query on every request wastes CPU, I/O, and time. A materialized view moves the heavy computation **off the read path** and onto a **refresh path** that runs on a schedule you control.

**The fundamental trade-off:**

| | | |
|---|---|---|
| MONEY | pre-computed on write/refresh | — |
| TIME | reads are instant | writes/refreshes cost extra |
| CONSISTENCY | you control staleness | — |

> Why it exists in one sentence: **to pre-compute expensive results so that reads become cheap, at the cost of extra storage and possible staleness.**

---

## How It Works (Internal Working)

### 1. Creation phase

```
Base tables ──> Query is parsed, planned ──> Executed once ──> Result rows written to physical storage
```

The database stores:

- the query definition (like a view)
- the actual result rows as a physical structure (like a table)

### 2. Read phase

```
SELECT ... FROM matview ──> scan stored rows ──> return
```

No base-table query happens. The optimizer treats the matview like a table.

### 3. Refresh phase

The stored rows are recomputed (fully or incrementally) so the matview reflects changes to base tables.

```
Base tables changed ──> REFRESH Materialized View ──> stored rows updated
```

Two main refresh strategies:

| Strategy | What happens | Concurrency with readers | Cost |
|---|---|---|---|
| **FULL refresh** | Re-executes the whole query, rebuilds the entire stored result (often `TRUNCATE` + insert) | Usually locks the matview or blocks writers | High |
| **INCREMENTAL refresh** | Only applies the changes since last refresh | Lower lock impact | Requires engine support + conditions |

---

## Syntax

### ANSI SQL — No Standard

> **Important:** The ANSI SQL standard does **not** define materialized views. Each engine implements its own syntax. Below is each major engine's version.

### PostgreSQL

```sql
-- Create
CREATE MATERIALIZED VIEW mv_orders_summary AS
SELECT customer_id, COUNT(*) AS order_count, SUM(amount) AS total_amount
FROM orders
GROUP BY customer_id;

-- Create with data preserved from creation on
CREATE MATERIALIZED VIEW mv_orders_summary
WITH (FILLFACTOR = 70) -- storage parameter
AS SELECT ...

SELECT * FROM mv_orders_summary;     -- normal reads, current data
REFRESH MATERIALIZED VIEW mv_orders_summary;             -- full refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_orders_summary; -- no lock, needs UNIQUE index

DROP MATERIALIZED VIEW mv_orders_summary;
```

PostgreSQL notes:

- **No incremental/fast refresh is built-in.** Only `REFRESH` (full) or `REFRESH ... CONCURRENTLY`.
- `REFRESH ... CONCURRENTLY` keeps the matview **readable and writable** during refresh, but requires at least one `UNIQUE` index on the matview. If two refreshes run at once, one fails.
- Indexes defined on a matview are **dropped and recreated** on plain `REFRESH`, but **kept** with `CONCURRENTLY`.
- Since PostgreSQL 9.3, matviews support indexes; never supported before that.

### MySQL

MySQL does **not** support materialized views natively.

> MySQL-specific: You simulate them with a **summary table** maintained by triggers, stored procedures, or scheduled events (`EVENT SCHEDULER`).

```sql
-- Simulation approach
CREATE TABLE orders_summary AS
SELECT customer_id, COUNT(*) AS order_count, SUM(amount) AS total_amount
FROM orders
GROUP BY customer_id;

-- Rebuild on schedule
CREATE EVENT rebuild_orders_summary
ON SCHEDULE EVERY 1 HOUR
DO TRUNCATE TABLE orders_summary;
INSERT INTO orders_summary
SELECT customer_id, COUNT(*), SUM(amount) FROM orders GROUP BY customer_id;
```

MySQL 8.0+ **does** have an optimizer feature where the planner can substitute a query with a compatible generated/summary table automatically — but you still create and maintain that table yourself.

### SQL Server

SQL Server uses **indexed views** (a view with a clustered index on it).

```sql
-- Requires schemabinding
CREATE VIEW dbo.v_OrdersSummary
WITH SCHEMABINDING
AS
SELECT customer_id, COUNT_BIG(*) AS order_count, SUM(amount) AS total_amount
FROM dbo.orders
GROUP BY customer_id;

-- Now make it a materialized view by adding a clustered index
CREATE UNIQUE CLUSTERED INDEX IX_v_OrdersSummary
ON dbo.v_OrdersSummary (customer_id);
```

SQL Server notes:

- An indexed view is **automatically kept up to date** when base tables change (in most cases). No manual refresh.
- Always use `WITH SCHEMABINDING`.
- `COUNT(*)` must be `COUNT_BIG(*)`.
- The view cannot reference non-deterministic functions, or other views, among other restrictions.
- Non-clustered indexes can be added on top of the clustered index.

### Oracle

Oracle has the most mature materialized view feature (`ON COMMIT`, `ON DEMAND`, incremental refresh with **materialized view logs**).

```sql
-- On-demand refresh
CREATE MATERIALIZED VIEW mv_orders_summary
BUILD IMMEDIATE
REFRESH ON DEMAND
AS
SELECT customer_id, COUNT(*) AS order_count, SUM(amount) AS total_amount
FROM orders
GROUP BY customer_id;

-- Refresh manually
EXEC DBMS_MVIEW.REFRESH('mv_orders_summary');

-- Automatic refresh on commit (keeps it transactionally consistent with base tables)
CREATE MATERIALIZED VIEW mv_orders_summary
BUILD IMMEDIATE
REFRESH ON COMMIT
AS ...

-- Incremental refresh requires a materialized view log on the base table
CREATE MATERIALIZED VIEW LOG ON orders WITH ROWID, PRIMARY KEY;
```

---

## Getting Started: Sample Tables

Let's build a realistic schema. State the **grain** of every table.

| Table | Grain (one row = ...) |
|---|---|
| `customers` | one customer |
| `orders` | one order |
| `order_items` | one line item within an order |
| `products` | one product |
| `payments` | one payment attempt against an order |

```sql
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        TEXT NOT NULL,
    country     TEXT NOT NULL,
    created_at  DATE
);

CREATE TABLE products (
    product_id  INT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       NUMERIC(10,2)
);

CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id),
    order_date  DATE NOT NULL,
    status      TEXT NOT NULL
);

CREATE TABLE order_items (
    order_id   INT NOT NULL REFERENCES orders(order_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity   INT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)   -- one row = one product line in an order; prevents dupes
);

CREATE TABLE payments (
    payment_id  INT PRIMARY KEY,
    order_id    INT NOT NULL REFERENCES orders(order_id),
    amount      NUMERIC(10,2) NOT NULL,
    paid_at     TIMESTAMP,
    status      TEXT NOT NULL            -- 'captured', 'failed', 'refunded'
);
```

Sample data:

```sql
INSERT INTO customers VALUES
(1, 'Alice', 'US', '2024-01-10'),
(2, 'Bob',   'DE', '2024-02-01'),
(3, 'Cara',  'US', '2024-03-15'),
(4, 'Dan',   'FR', '2024-05-20');

INSERT INTO products VALUES
(10, 'Laptop',     'Electronics', 999.00),
(11, 'Mouse',      'Electronics',  29.99),
(12, 'Desk Chair', 'Furniture',   199.00);

INSERT INTO orders VALUES
(100, 1, '2024-06-01', 'completed'),
(101, 2, '2024-06-05', 'completed'),
(102, 1, '2024-06-10', 'cancelled'),
(103, 3, '2024-06-12', 'completed'),
(104, 1, '2024-06-20', 'completed');

INSERT INTO order_items VALUES
(100, 10, 1, 999.00),
(100, 11, 2,  29.99),
(101, 12, 1, 199.00),
(103, 10, 1, 999.00),
(104, 11, 1,  29.99),
(104, 12, 1, 199.00);

INSERT INTO payments VALUES
(900, 100, 1058.98, '2024-06-01 09:00:00', 'captured'),
(901, 101,  199.00, '2024-06-05 14:30:00', 'captured'),
(902, 103,  999.00, '2024-06-12 11:00:00', 'captured'),
(903, 104,  228.99, '2024-06-20 16:45:00', 'captured');
```

---

## Worked Example

### The expensive query

A daily dashboard needs per-customer revenue:

```sql
SELECT
    c.customer_id,
    c.name,
    c.country,
    COUNT(DISTINCT o.order_id)                     AS completed_orders,
    COUNT(DISTINCT oi.product_id)                  AS distinct_products,
    SUM(oi.quantity * oi.unit_price)               AS gross_revenue
FROM customers c
LEFT JOIN orders o       ON o.customer_id = c.customer_id
                        AND o.status = 'completed'
LEFT JOIN order_items oi ON oi.order_id   = o.order_id
LEFT JOIN payments p     ON p.order_id    = o.order_id
                        AND p.status      = 'captured'
GROUP BY c.customer_id, c.name, c.country;
```

This query scans `customers`, `orders`, `order_items`, `payments`, joins three times, deduplicates, and aggregates. On a big e-commerce system it runs for seconds.

### Materialized view (PostgreSQL/ANSI-style)

```sql
CREATE MATERIALIZED VIEW mv_customer_dashboard AS
SELECT
    c.customer_id,
    c.name,
    c.country,
    COUNT(DISTINCT o.order_id)   AS completed_orders,
    COUNT(DISTINCT oi.product_id) AS distinct_products,
    SUM(oi.quantity * oi.unit_price) AS gross_revenue
FROM customers c
LEFT JOIN orders o       ON o.customer_id = c.customer_id
                        AND o.status = 'completed'
LEFT JOIN order_items oi ON oi.order_id   = o.order_id
LEFT JOIN payments p     ON p.order_id    = o.order_id
                        AND p.status      = 'captured'
GROUP BY c.customer_id, c.name, c.country;
```

### Expected output

```text
 customer_id | name  | country | completed_orders | distinct_products | gross_revenue
-------------+-------+---------+------------------+-------------------+---------------
           1 | Alice | US      |                2 |                 3 |       1057.97   -- May differ per engine, see note
           2 | Bob   | DE      |                1 |                 1 |        199.00
           3 | Cara  | US      |                1 |                 1 |        999.00
           4 | Dan   | FR      |                0 |                 0 |          0.00
```

> **Note on the `gross_revenue` for Alice (customer 1):** The LEFT JOIN to `payments` can duplicate line items when an order has multiple payment rows. Order 100 has line items worth 999.00 + (2 * 29.99) and one payment. Order 104 has items worth 29.99 + 199.00. Joining `order_items` to one `payments` row each keeps things 1:1 here, so 1058.98 + 228.99 would be expected. **Do not assume your seed produces the exact number** — the point of this example is that a many-to-many (if present) would inflate `SUM`. Always verify with `EXPLAIN` and a grain check. If a JOIN fan-out is suspected, deduplicate `payments` first — see the "double counting" section below.

### Reading from it

```sql
-- Fast reads, no joins
SELECT * FROM mv_customer_dashboard WHERE country = 'US';

-- Now add an index for point lookups
CREATE INDEX idx_mv_customer_country ON mv_customer_dashboard (country);

SELECT * FROM mv_customer_dashboard WHERE country = 'US';
```

Reading the matview now scans stored rows, not base tables.

### Refreshing it

```sql
REFRESH MATERIALIZED VIEW mv_customer_dashboard;              -- postgres full
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_dashboard; -- postgres, no lock; requires UNIQUE index
```

---

## BAD APPROACH vs BETTER APPROACH

**BAD APPROACH — recompute on every dashboard request:**

```sql
-- Every page load re-runs the full join + aggregate.
-- Users hammering the dashboard = repeated expensive scans.
SELECT c.name, COUNT(DISTINCT o.order_id) AS cnt
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
GROUP BY c.name;
```

Why bad: repeated CPU + I/O per request. On a big table the dashboard times out.

**BETTER APPROACH — materialized view refreshed on a schedule:**

```sql
CREATE MATERIALIZED VIEW mv_customer_counts AS
SELECT c.name, COUNT(DISTINCT o.order_id) AS cnt
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
GROUP BY c.name;

-- Refresh at 06:00 daily; dashboard is always at most 24h stale.
REFRESH MATERIALIZED VIEW mv_customer_counts;
```

Why better: the heavy computation happens once; dashboard reads become index/scan fast.

---

## Scenario-Based Examples

### Scenario 1 — Daily revenue rollup for finance

Finance wants a daily revenue figure across payment captures. The base data is huge; running it live during reporting hour is expensive.

**BETTER APPROACH:**

```sql
-- Oracle: incremental refresh using a matview log means only new/changed rows are applied.
CREATE MATERIALIZED VIEW mv_daily_revenue
BUILD IMMEDIATE
REFRESH FAST ON COMMIT
AS
SELECT DATE(paid_at) AS day,
       SUM(amount)   AS revenue
FROM payments
WHERE status = 'captured'
GROUP BY DATE(paid_at);
```

### Scenario 2 — Product catalog summary for a storefront

A storefront page shows each product with review-average and sales count. The product table changes rarely but the computed fields are derived from heavy joins.

**BETTER APPROACH:**

```sql
CREATE MATERIALIZED VIEW mv_product_sales AS
SELECT p.product_id, p.name,
       SUM(CASE WHEN o.status = 'completed' THEN oi.quantity ELSE 0 END) AS units_sold
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN orders o       ON o.order_id   = oi.order_id
GROUP BY p.product_id, p.name;
```

### Scenario 3 — Slow nightly report that would time out

A report scans the whole history table. Instead of tuning the complex query, materialize a summarized "current state" the report runs against.

**BETTER APPROACH:**

```sql
CREATE MATERIALIZED VIEW mv_orders_state AS
SELECT customer_id, status, COUNT(*) AS cnt
FROM orders
GROUP BY customer_id, status;
```

---

## When to Use a Materialized View

- A query is **expensive and repeatedly executed** (dashboards, reports).
- The result can tolerate **staleness** (reports that don't need real-time).
- You need **aggregations/fan-out joins precomputed** so the read path stays simple.
- The underlying data changes **in bulk on a schedule** (nightly ETL), matching a refresh schedule.
- You want **indexed/point-lookup performance** on a computed summary (with an index on the matview).
- Data is **large and sums/dedups are heavy**; reporting queries otherwise scan too much.

## When NOT to Use a Materialized View

- The query is **cheap already** — a matview adds storage + refresh overhead for nothing.
- The data must be **read-your-writes real-time** — matviews are stale by design.
- Base tables change **constantly and you need extreme freshness** — refresh cost will dominate.
- The result set is **essentially a plain table copy** — you've built an expensive index.
- You need **flexible ad-hoc filters over many columns/combinations** — an indexed normal table with good indexes is often better.
- You need DML against the result — matviews are not general-purpose write targets in most engines.

> Production pitfall: A matview is **not a substitute for a query problem**. If your query does a full scan due to a missing index or a `WHERE f(x) = y` on a function, an index, partition, or a rewritten sargable predicate may be far cheaper than materializing. Measure first.

---

## Refresh Strategies Comparison

| Strategy | Engine support | Staleness | Locking | Cost | Notes |
|---|---|---|---|---|---|
| FULL refresh on demand | PG, Oracle, SQL Server (rebuild) | controlled by you | blocks readers/writers or rebuilds index | High (re-executes the query) | Simplest, always correct |
| CONCURRENT refresh | PostgreSQL only | controlled by you | No lock; readers keep working | High but non-blocking | Needs a `UNIQUE` index; one refresh at a time |
| ON COMMIT | Oracle, SQL Server (auto) | No staleness (`ON COMMIT` tracks transactionally) | Extra cost inside every transaction | Medium-to-high per transaction | Real-time freshness, write-path cost |
| ON DEMAND | Oracle, PostgreSQL | can be stale until run | Per command | Scheduled | Most common for batch reporting |
| INCREMENTAL / FAST | Oracle (fast refresh), SQL Server (auto), PG (none) | depends | Lower | Lower (only changes applied) | Oracle needs matview logs; PG has no native incremental refresh |

---

## Common Mistakes

**Mistake 1 — Forgetting to refresh.** The matview shows old data and no one notices until management asks why numbers are wrong.

```sql
-- Data is a week old. Nobody scheduled the refresh.
SELECT * FROM mv_customer_dashboard;
```

**Mistake 2 — Refreshing CONCURRENTLY without a UNIQUE index (PostgreSQL).**

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_dashboard;
-- ERROR: cannot refresh materialized view "mv_customer_dashboard" concurrently
--        because it does not have a unique index
```

**Mistake 3 — Building a full refresh that drops/rebuilds all indexes and locks readers (PostgreSQL) in the middle of business hours.** Plan refreshes off-peak.

**Mistake 4 — Using `ON COMMIT` (Oracle) on top of very hot OLTP tables.** Every commit pays the refresh price. On high-write tables this can dominate workload.

**Mistake 5 — No refresh orchestration.** The refresh scheduler and the consumption schedule are not aligned, so reports run *while* a full refresh is holding locks.

**Mistake 6 — Treating a matview like a live table.** Updating it directly, or expecting it to reflect base-table changes automatically, then being surprised.

---

## Edge Cases

**Empty base tables.** A matview built on empty tables stores zero rows. `COUNT(*)` from it returns `0`, not a row with NULL.

**Schema changes on base tables.** In most engines, altering a base table referenced by a matview can invalidate the matview (PostgreSQL requires re-checking compatibility; you may need to drop/recreate or rewrite).

**Concurrent refresh fails (PostgreSQL).** Two `REFRESH ... CONCURRENTLY` calls at once — one fails. Also `CONCURRENTLY` runs in the background; a long one can be left running; check `pg_stat_activity`.

**Refreshing a matview that is itself referenced by other matviews.** Ordering and dependency chains matter; a change in a base matview may require refreshing downstream ones.

**Large result sets.** A matview can consume substantial disk; a rollup that explodes row counts (e.g., grouping by a high-cardinality key) gives no benefit over a plain table plus index.

---

## NULL Behavior

- Matviews store NULLs exactly as the result set contains them — NULL arithmetic still yields NULL, `SUM` skips NULLs, etc.
- **`GROUP BY` treats all NULLs as one group**, so a matview built on a `GROUP BY nullable_column` will fold NULLs together, losing individual NULL-row identity.
- `COUNT(column)` skips NULLs while `COUNT(*)` counts rows. If your matview query uses `COUNT(column)`, NULLs disappear from counts — a common cause of "why is my total lower than expected."
- **LEFT JOIN with no match** produces NULL columns in the matview rows — the same NULLs you'd see in the regular query.
- Indexes on nullable matview columns have the same indexing semantics as any table index.

---

## Performance Implications

### Where matviews help

- Read path short-circuits repeated joins/aggregates — huge win for report queries.
- Indexes on the matview make lookup/point queries fast.
- Refreshing in bulk is far cheaper than running analysis on every request.

### Where they hurt

- **Storage**: the result set is stored duplicatively.
- **Refresh cost**: full refresh re-executes the entire query; incremental has its own overhead.
- **Write coupling** (ON COMMIT environments): commits pay refresh taxes.
- **Locking**: full refresh can block reads/writes while rebuilding.
- **Index rebuild**: a plain full refresh in PostgreSQL rebuilds all indexes on the matview.

### Never make absolute claims

Does a materialized view always speed up a query? No. If the matview is larger than the base tables, or its indexes are missing, or the refresh keeps locking, it can be **slower or operationally worse**. What actually matters:

- optimizer behavior
- indexes (on base tables and on the matview)
- statistics and cardinality
- data distribution
- query shape
- database engine
- execution plan (and refresh plan)

### Verify with the execution plan

```sql
-- Read-side comparison (PostgreSQL)
EXPLAIN ANALYZE SELECT * FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE c.country = 'US';

EXPLAIN ANALYZE SELECT * FROM mv_customer_dashboard WHERE country = 'US';
```

```sql
-- Refresh-side cost (Oracle)
EXPLAIN PLAN FOR
SELECT c.customer_id, COUNT(*) FROM customers c
JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id;
```

> The rule: **measure before and after** with `EXPLAIN (ANALYZE, BUFFERS)` (PostgreSQL), `SET STATISTICS TIME/IO` + `SHOWPLAN_ALL` (SQL Server), `DBMS_XPLAN` (Oracle), or `EXPLAIN ANALYZE` (MySQL). Decide based on numbers, not folklore.

---

## Interview Traps

> Interview trap — **"Materialized views are always the same as views."**
> No. A view is a saved query (logical), re-executed on read. A matview is a stored physical result, refreshed separately.

> Interview trap — **"Refreshing a matview is real-time by default."**
> No. Default refresh is ON DEMAND / scheduled. Real-time requires `ON COMMIT` (Oracle) or an indexed view (SQL Server), each with write-path costs.

> Interview trap — **"PostgreSQL can do incremental refresh."**
> Actually not natively. PostgreSQL only offers FULL or CONCURRENT full refresh. Incremental (fast refresh) is an Oracle feature (with matview logs) and effectively supported auto-maintained by SQL Server indexed views.

> Interview trap — **"Indexed views don't need refresh."**
> In SQL Server they are auto-maintained — but they come with severe restrictions. You cannot use unsupported constructs, and `WITH SCHEMABINDING` is required.

---

## How Materialized Views Interact With Other Concepts

| If you need... | Then... |
|---|---|
| Always-current data with cheap reads | Consider well-indexed base tables, not a matview |
| Stale-but-fast reports | Matview with scheduled refresh |
| Aggregated history at multiple granularities | Distilled matviews + base views on top |
| Data that changes in bulk nightly | Matview refreshed right after ETL |
| Transactionally consistent snapshot reads | Matview + `ON COMMIT` (Oracle) or plain `SELECT` |

---

## Real-World Scenario

**The problem:** A SaaS company's reporting dashboard aggregates 40M invoice rows into per-day revenue, per-customer retention, and sales-funnel numbers. During the 9–11 AM reporting window, DB CPU peaks because many users hit the same dashboard queries. Ad-hoc tuning fails because each query joins 4 tables and does heavy `COUNT(DISTINCT)`.

**The solution (PostgreSQL):**

```sql
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
    DATE(p.paid_at)           AS day,
    COUNT(DISTINCT p.order_id) AS orders,
    SUM(p.amount)             AS revenue
FROM payments p
WHERE p.status = 'captured'
GROUP BY DATE(p.paid_at);

CREATE UNIQUE INDEX ON mv_daily_revenue (day);  -- needed for CONCURRENT refresh

-- Scheduled at 02:00 after the nightly ETL
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
```

**Verify before/after:**

```sql
-- before
EXPLAIN ANALYZE SELECT DATE(paid_at) day, SUM(amount) FROM payments ... GROUP BY day;
-- after
EXPLAIN ANALYZE SELECT * FROM mv_daily_revenue;
```

**The result:** report queries now scan a small rolled-up table; DB CPU during reporting drops dramatically; data at most ~hours stale, which finance accepted.

---

## Best Practices

- **State the refresh SLA in writing.** Document how stale the matview may be, and who refreshes it.
- **Match the refresh to your data cadence.** Nightly ETL → refresh after ETL. Streaming data → reconsider matviews or use `ON COMMIT` where supported.
- **Add the right indexes on the matview**, not on the source tables you're hiding.
- **Use `REFRESH ... CONCURRENTLY` where available** so readers keep working — but budget the extra cost and keep a UNIQUE index ready.
- **Monitor refresh time and size.** A full refresh that grows every day is a trigger to revisit the design.
- **Prefer incremental refresh where you need frequent freshness** (Oracle fast refresh with matview logs; SQL Server indexed views).
- **Never refresh in hot business hours** with plain FULL refresh (locking).
- **Test the query first with `EXPLAIN ANALYZE`** on base tables, *then* build the matview, *then* measure the matview read and refresh costs.
- **Consider partitioning** the matview if the result set is huge.
- **Do not materialize cheap queries.** If a query already uses an index and finishes in ms, a matview adds storage and maintenance with zero gain.

---

# Interview Questions

## Beginner

1. What is the difference between a view and a materialized view?
2. What is a materialized view? Give the syntax in your favorite RDBMS.
3. What is "refresh"? Why is a materialized view not automatically up to date (in general)?
4. Can you create an index on a materialized view? On a regular view? Why the difference?
5. What are the main costs of using a materialized view?

## Intermediate

6. Explain the difference between FULL refresh and INCREMENTAL/FAST refresh.
7. What is `REFRESH MATERIALIZED VIEW CONCURRENTLY` and why does it need a UNIQUE index?
8. When would you choose a regular view over a materialized view?
9. How does SQL Server implement materialized views? What is `WITH SCHEMABINDING` and why is it needed?
10. What is a materialized view log (Oracle) used for?

## Advanced

11. Design a matview that computes daily revenue and discuss its sizing, indexing, partitioning, and refresh strategy for 40M rows.
12. Explain `ON COMMIT` refresh (Oracle). What happens to write throughput?
13. How do you keep a materialized view consistent while base tables are being written concurrently? Discuss locking and isolation levels.
14. What are the restrictions on SQL Server indexed views (COUNT_BIG, determinism, schemabinding)?
15. Compare materialized views to a denormalized summary table created by your own ETL. When is one preferred over the other?

## Scenario Based

16. A dashboard query joins 5 tables and aggregates billions of rows; users hit it every minute. The data only changes nightly. What do you do?
17. Your matview is 3 days stale because the refresh failed. How do you detect and recover? What monitoring would you put in place?
18. You are asked to make a real-time live report. Would you use a materialized view? Explain your thinking and alternatives.
19. A full refresh takes 40 minutes and blocks users at 2 PM. How would you fix this?
20. Finance runs reports that must never double-count revenue. Your matview query joins orders and payments one-to-many. What goes wrong and how do you fix it?

## Tricky

21. Can a materialized view reference another materialized view? What are the refresh-ordering implications?
22. What happens when you `ALTER` a base table used by a matview? In PostgreSQL? In Oracle?
23. Why might `REFRESH ... CONCURRENTLY` fail at 3 AM, and how do you diagnose it?
24. A matview built on `GROUP BY nullable_col` — what does NULL represent in the result, and what do you lose?
25. You have a matview with no unique index and users reading it during refresh — what do they see under FULL refresh vs CONCURRENTLY refresh?

## Output Prediction

26. Given the sample `orders`/`payments` tables above, predict the row count of `mv_customer_dashboard` *if order 100 had two payments* (one captured, one refunded). Explain the difference from the one-payment case.
27. If a base table has 100 rows and the matview query is `SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id`, and one customer is later deleted: predict whether the matview still shows their row after `REFRESH CONCURRENTLY` (assume index exists) and why.
28. A matview is refreshed, then a base row is inserted but *not* refreshed. What does `SELECT COUNT(*)` return from the matview immediately after the insert? From the base table?

## Debugging

29. `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_x;` errors with "does not have a unique index". Debug it — what are the fix options?
30. Users report the dashboard numbers are "wrong" but the base-table query is correct. What are the top three hypotheses about the matview? How would you confirm each, and how would you find stale/missing rows?
31. A full refresh keeps failing with a disk-space error. List at least three mitigations (disk, index, partition, retention).
32. Write the exact SQL to check whether a matview was last refreshed in PostgreSQL (hint: `pg_matviews` / statistics catalog), and in Oracle (`USER_MVIEWS`, `LAST_REFRESH_TYPE`).

## Performance

33. Your matview read is slower than the base-table query. List concrete reasons and how you'd verify each with an execution plan.
34. Explain how you would measure refresh cost (`EXPLAIN ANALYZE` / `DBMS_XPLAN`) and how you would decide between `ON COMMIT` and `ON DEMAND`.
35. The fan-out `payments` join triples `SUM` figures. Show the SQL that fixes double counting inside a matview.
36. When is a materialized view *not* the right answer even though the reports are slow? Give at least two alternative solutions involving indexes, partitions, or query rewriting.
