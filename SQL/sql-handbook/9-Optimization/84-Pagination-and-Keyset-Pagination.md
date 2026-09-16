# 84. Pagination and Keyset Pagination

## What Is Pagination?

Pagination is the technique of dividing a large result set into smaller chunks (pages) and retrieving one page at a time. It exists because:

- Loading millions of rows at once overwhelms memory and network
- Users see results incrementally (scrolling, "Load More")
- APIs enforce page sizes for rate limiting and performance
- Dashboards render manageable data subsets

There are two fundamental approaches:

| Approach         | Also Called                   | Mechanism                   |
| ---------------- | ----------------------------- | --------------------------- |
| **Offset-based** | LIMIT/OFFSET, skip-then-fetch | Skip N rows, fetch next M   |
| **Keyset**       | Cursor-based, seek method     | Resume from last seen value |

---

## Sample Tables

Every example below uses these tables.

```sql
-- Grain: one row per order placed by a customer
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  TIMESTAMP NOT NULL,
    total       NUMERIC(10,2) NOT NULL
);

-- Grain: one row per item within an order
CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(order_id),
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    price      NUMERIC(10,2) NOT NULL
);
```

Sample data (12 rows):

| order_id | customer_id | order_date          | total  |
| -------- | ----------- | ------------------- | ------ |
| 1        | 101         | 2025-01-10 08:00:00 | 50.00  |
| 2        | 102         | 2025-01-10 09:30:00 | 120.00 |
| 3        | 101         | 2025-01-11 10:00:00 | 75.50  |
| 4        | 103         | 2025-01-12 11:15:00 | 200.00 |
| 5        | 102         | 2025-01-12 14:00:00 | 35.00  |
| 6        | 104         | 2025-01-13 09:00:00 | 89.99  |
| 7        | 101         | 2025-01-14 16:30:00 | 310.00 |
| 8        | 105         | 2025-01-15 12:00:00 | 42.50  |
| 9        | 103         | 2025-01-15 13:45:00 | 150.00 |
| 10       | 102         | 2025-01-16 08:00:00 | 67.25  |
| 11       | 104         | 2025-01-17 10:00:00 | 95.00  |
| 12       | 105         | 2025-01-18 11:30:00 | 210.75 |

---

## Offset-Based Pagination (LIMIT / OFFSET)

### How It Works

The database reads and **discards** the first N rows (OFFSET), then returns the next M rows (LIMIT).

```
Page 1: SKIP 0,  FETCH 5  → rows  1–5
Page 2: SKIP 5,  FETCH 5  → rows  6–10
Page 3: SKIP 10, FETCH 5  → rows 11–15
```

### Syntax

```sql
-- ANSI-ish: LIMIT / OFFSET (PostgreSQL, MySQL, SQLite)
SELECT *
FROM   orders
ORDER  BY order_date, order_id
LIMIT  5 OFFSET 0;
```

```sql
-- SQL Server / Oracle: OFFSET ... FETCH
SELECT *
FROM   orders
ORDER  BY order_date, order_id
OFFSET 0 ROWS
FETCH  NEXT 5 ROWS ONLY;
```

### Page 1 — First 5 orders

```sql
SELECT order_id, customer_id, order_date, total
FROM   orders
ORDER  BY order_date, order_id
LIMIT  5 OFFSET 0;
```

| order_id | customer_id | order_date          | total  |
| -------- | ----------- | ------------------- | ------ |
| 1        | 101         | 2025-01-10 08:00:00 | 50.00  |
| 2        | 102         | 2025-01-10 09:30:00 | 120.00 |
| 3        | 101         | 2025-01-11 10:00:00 | 75.50  |
| 4        | 103         | 2025-01-12 11:15:00 | 200.00 |
| 5        | 102         | 2025-01-12 14:00:00 | 35.00  |

### Page 2 — Next 5 orders

```sql
SELECT order_id, customer_id, order_date, total
FROM   orders
ORDER  BY order_date, order_id
LIMIT  5 OFFSET 5;
```

| order_id | customer_id | order_date          | total  |
| -------- | ----------- | ------------------- | ------ |
| 6        | 104         | 2025-01-13 09:00:00 | 89.99  |
| 7        | 101         | 2025-01-14 16:30:00 | 310.00 |
| 8        | 105         | 2025-01-15 12:00:00 | 42.50  |
| 9        | 103         | 2025-01-15 13:45:00 | 150.00 |
| 10       | 102         | 2025-01-16 08:00:00 | 67.25  |

### When To Use Offset Pagination

- User-facing UI with visible page numbers ("Page 1 of 50")
- Total count is cheap (e.g., small table, cached count)
- You need random page access (jump to page 47)
- Data is relatively static between requests

### When NOT To Use Offset Pagination

- Deep pagination on large tables (OFFSET 1000000)
- Real-time data streams (rows shift between requests)
- High-concurrency write-heavy tables
- Streaming APIs or infinite scroll

---

## The Deep-Offset Problem

This is the core reason offset pagination breaks down at scale.

### What Happens Internally

```
OFFSET 1000000 means:
  1. Database reads 1,000,005 rows
  2. Discards the first 1,000,000
  3. Returns 5
```

The database cannot "skip" — it must traverse every skipped row. As offset grows, cost grows linearly.

### Demonstration

```sql
-- Fast: small offset
EXPLAIN ANALYZE
SELECT order_id, customer_id, order_date, total
FROM   orders
ORDER  BY order_date, order_id
LIMIT  5 OFFSET 0;
```

```
Limit  (cost=0.00..0.25 rows=5 width=44)
  ->  Index Scan using orders_pkey on orders  (cost=0.00..360.00 rows=12000 width=44)
Planning Time: 0.080 ms
Execution Time: 0.120 ms
```

```sql
-- Slower: deep offset (simulated with large data)
EXPLAIN ANALYZE
SELECT order_id, customer_id, order_date, total
FROM   orders
ORDER  BY order_date, order_id
LIMIT  5 OFFSET 1000000;
```

```
Limit  (cost=36000.00..36000.25 rows=5 width=44)
  ->  Index Scan using orders_pkey on orders  (cost=0.00..36000.25 rows=1000005 width=44)
Planning Time: 0.085 ms
Execution Time: 1250.340 ms
```

> Production pitfall: On a table with millions of rows, `OFFSET 1000000` can take seconds even with a perfect index. The database reads and discards a million rows you never see.

### The Offset+Limit Combo Is Not Atomic

Because rows can be inserted or deleted between page requests, offset pagination can produce:

- **Duplicate rows**: A row moves into the window on the next request
- **Missing rows**: A row moves out of the window before you fetch it

```
Time T1: Fetch rows 1–5 (orders 1–5)
Time T2: order_id=3 is deleted
Time T3: Fetch rows 6–10 → what was row 6 is now row 5, but you never see it
```

> Common misconception: "OFFSET skips rows efficiently." It does not skip — it reads and discards.

---

## Keyset Pagination (Cursor-Based)

### How It Works

Instead of skipping rows, keyset pagination resumes from the **last value you saw**. It tells the database: "Give me rows after this point."

```
Page 1: WHERE (order_date, order_id) > ('1970-01-01', 0)   ORDER BY ... LIMIT 5
Page 2: WHERE (order_date, order_id) > ('2025-01-12 14:00:00', 5)  ORDER BY ... LIMIT 5
Page 3: WHERE (order_date, order_id) > ('2025-01-15 13:45:00', 9)  ORDER BY ... LIMIT 5
```

The database uses an **index seek** directly to the starting point — no rows are read and discarded.

### Requirements

1. A deterministic sort order (no ambiguous ORDER BY)
2. The sort columns must be unique or combined with the primary key to break ties
3. The cursor value must be **inclusive or exclusive** — be consistent

### Syntax (PostgreSQL / MySQL / SQLite)

```sql
-- Page 1: no cursor yet — use a sentinel value
SELECT order_id, customer_id, order_date, total
FROM   orders
ORDER  BY order_date, order_id
LIMIT  5;
```

```sql
-- Page 2: cursor = last (order_date, order_id) from Page 1
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > ('2025-01-12 14:00:00', 5)
ORDER  BY order_date, order_id
LIMIT  5;
```

```sql
-- Page 3: cursor = last (order_date, order_id) from Page 2
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > ('2025-01-15 13:45:00', 9)
ORDER  BY order_date, order_id
LIMIT  5;
```

### Syntax (SQL Server)

```sql
-- SQL Server uses TOP + WHERE
SELECT TOP 5 order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > ('2025-01-12 14:00:00', 5)
ORDER  BY order_date, order_id;
```

### Syntax (Oracle)

```sql
-- Oracle 12c+
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > (TIMESTAMP '2025-01-12 14:00:00', 5)
ORDER  BY order_date, order_id
FETCH  NEXT 5 ROWS ONLY;
```

### Execution Plan — Keyset

```sql
EXPLAIN ANALYZE
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > ('2025-01-12 14:00:00', 5)
ORDER  BY order_date, order_id
LIMIT  5;
```

```
Limit  (cost=0.30..10.35 rows=5 width=44)
  ->  Index Scan using idx_orders_date_id on orders
        (cost=0.30..10.35 rows=5 width=44)
        Index Cond: ((order_date, order_id) > ('2025-01-12 14:00:00', 5))
Planning Time: 0.090 ms
Execution Time: 0.045 ms
```

The database **seeks** directly to the cursor position. It reads exactly the rows needed.

> Production pitfall: Keyset pagination requires a **composite index** on `(order_date, order_id)` to be efficient. Without it, the database may do a full index scan.

### Required Index

```sql
CREATE INDEX idx_orders_date_id
    ON orders (order_date, order_id);
```

### When To Use Keyset Pagination

- Infinite scroll / streaming APIs
- Real-time data (new rows never shift the window)
- Deep pagination on large tables
- High-concurrency systems
- Mobile apps with large datasets

### When NOT To Use Keyset Pagination

- UI needs visible page numbers and random page access
- User needs to jump to "page 47" directly
- Sort order is not unique and tie-breaking is complex
- The client cannot store a cursor between requests

---

## Comparison Table

| Aspect                        | Offset Pagination                | Keyset Pagination                         |
| ----------------------------- | -------------------------------- | ----------------------------------------- |
| **Random page access**        | Yes                              | No (sequential only)                      |
| **Deep pagination speed**     | Degrades linearly with offset    | Constant — same cost regardless of depth  |
| **Duplicate/missing rows**    | Possible under concurrent writes | Not possible (deterministic position)     |
| **Index usage**               | Skips via traversal (no seek)    | Seeks directly to position                |
| **Complexity**                | Simple                           | Moderate — needs composite key and cursor |
| **Cursor storage**            | Page number (integer)            | Last seen value (composite)               |
| **API design**                | `?page=3&size=5`                 | `?cursor=eyJvcmRlcl9kYXRlIjoiMjAyNS...`   |
| **Total count needed**        | Often yes (for page numbers)     | Not required                              |
| **Works with arbitrary sort** | Yes                              | Only with deterministic, indexed sort     |
| **Works with `DISTINCT`**     | Yes                              | Difficult — DISTINCT changes row identity |
| **Works with `GROUP BY`**     | Yes (with aggregate sort)        | Complex — needs aggregate cursor          |

---

## Cursor Encoding in APIs

Real-world APIs often base64-encode the cursor so the client doesn't need to understand its internals.

```sql
-- Server-side: decode cursor
-- Client sends: ?cursor=eyJvcmRlcl9kYXRlIjoiMjAyNS0wMS0xMiAxNDowMDowMCIsIm9yZGVyX2lkIjo1fQ==
-- Server decodes to: {"order_date":"2025-01-12 14:00:00","order_id":5}
```

The cursor is opaque to the client — they just pass it back.

---

## Edge Cases

### 1. Empty Result Set

```sql
-- What if the cursor points past the last row?
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > ('2025-12-31 23:59:59', 999999)
ORDER  BY order_date, order_id
LIMIT  5;
-- Returns 0 rows. Client stops fetching.
```

Always check: `if (rows.length < PAGE_SIZE) done = true;`

### 2. Duplicate Sort Values (Offset)

If your ORDER BY is not unique, rows with identical sort values can appear on multiple pages or be skipped entirely.

```sql
-- BAD: non-unique ORDER BY
SELECT *
FROM   orders
ORDER  BY total, order_id
LIMIT  5 OFFSET 0;

-- Two orders have total = 50.00? Ambiguous which comes first.
-- Offset assumes a fixed order, but the database may not be deterministic.
```

> Interview trap: "What happens when ORDER BY columns have duplicates?" With OFFSET, rows can be skipped or repeated across pages. With keyset, duplicates in the cursor columns cause rows to be missed — always include the PK in the sort and cursor.

### 3. NULL Sort Values

```sql
-- NULLs sort first in PostgreSQL (NULLS FIRST is default for ASC)
SELECT order_id, customer_id, order_date, total
FROM   orders
ORDER  BY total ASC NULLS FIRST
LIMIT  5;
```

If `total` can be NULL and appears in your cursor:

```sql
-- NULL > 5 is UNKNOWN → NULL rows are excluded!
SELECT *
FROM   orders
WHERE  total > 5
ORDER  BY total, order_id
LIMIT  5;
-- NULL rows vanish from results
```

> Common misconception: "NULLs sort at the end." PostgreSQL sorts NULLs first for ASC by default. MySQL sorts NULLs first for ASC. SQL Server sorts NULLs first for ASC. Oracle sorts NULLs last for ASC.

Use `COALESCE` or `NULLS LAST` to handle this:

```sql
-- PostgreSQL: explicit NULLS LAST
SELECT *
FROM   orders
ORDER  BY total ASC NULLS LAST, order_id ASC
LIMIT  5;

-- General: use COALESCE
SELECT *
FROM   orders
ORDER  BY COALESCE(total, 0) ASC, order_id ASC
LIMIT  5;
```

### 4. Changing Data Between Requests

Offset pagination is vulnerable:

```
Request 1 (Page 1): rows 1–5
User inserts new row at position 3
Request 2 (Page 2): SKIP 5 → misses what was row 6 (now row 7)
Result: row 6 is never shown to the user
```

Keyset pagination is immune — the cursor anchors to a specific value.

### 5. DELETE + OFFSET Interaction

```sql
-- Page 1: fetch rows 1–5 (orders 1–5)
-- Between requests, order_id=3 is deleted
-- Page 2: OFFSET 5 → skips 5 rows, gets orders 6–10
-- But order_id=6 is now at position 5 (was 6 before delete)
-- Result: order 6 is skipped
```

> Production pitfall: In financial or audit systems, offset pagination can cause rows to disappear from reports. Keyset pagination prevents this.

### 6. Fetching a Specific Page

With keyset pagination, you **cannot** directly jump to page N. To display "Page 47 of 120":

- Use offset pagination for the page-number UI
- Use keyset pagination for the "Load More" / infinite scroll UI
- Or: combine both — offset for small page counts, keyset for deep access

### 7. Composite Cursors with Multiple Columns

When ORDER BY has multiple columns, the cursor must include **all** of them:

```sql
-- ORDER BY order_date, total, order_id
-- Cursor must be:
WHERE (order_date, total, order_id) > ('2025-01-12', 89.99, 6)
```

The row tuple comparison `(a, b, c) > (x, y, z)` in SQL means:

- `a > x`, OR
- `a = x AND b > y`, OR
- `a = x AND b = y AND c > z`

This is lexicographic comparison and is supported in PostgreSQL, MySQL 8+, SQL Server, and Oracle.

---

## NULL Behavior in Detail

### Three-Valued Logic in Cursor Conditions

```sql
-- If order_date is NULL:
WHERE (order_date, order_id) > ('2025-01-12 14:00:00', 5)
-- NULL > '2025-01-12' → UNKNOWN
-- Row is EXCLUDED from results
```

NULL values in sort/cursor columns silently disappear. This is rarely what you want.

**Fix**: Ensure the column is `NOT NULL`, or handle NULLs explicitly:

```sql
-- Option 1: NOT NULL constraint (preferred)
ALTER TABLE orders ALTER COLUMN order_date SET NOT NULL;

-- Option 2: COALESCE in sort (but this breaks index usage)
ORDER BY COALESCE(order_date, '1970-01-01'), order_id
```

### COUNT(\*) vs COUNT(column) with Pagination

```sql
-- Total rows for page count
SELECT COUNT(*) FROM orders;          -- Counts NULLs — correct
SELECT COUNT(total) FROM orders;      -- Excludes NULLs — may be wrong
```

> Interview trap: "Why does my total page count not match?" You likely used `COUNT(column)` instead of `COUNT(*)` and the column has NULLs.

---

## Common Mistakes

### Mistake 1: ORDER BY Without Unique Tiebreaker

```sql
-- BAD: order_date can have duplicates
SELECT * FROM orders ORDER BY order_date LIMIT 5;

-- What if 3 orders share the same order_date?
-- The database may return different subsets on each page request.
```

**Fix**: Always include a unique column (PK) as the last ORDER BY column:

```sql
SELECT * FROM orders ORDER BY order_date, order_id LIMIT 5;
```

### Mistake 2: OFFSET Without ORDER BY

```sql
-- BAD: no ORDER BY
SELECT * FROM orders LIMIT 5 OFFSET 10;
-- Which 5 rows? Non-deterministic!
```

The database makes no guarantee about row order without ORDER BY. Results may differ between calls.

### Mistake 3: Inconsistent Sort + Cursor Direction

```sql
-- BAD: ORDER BY ASC but cursor uses <
SELECT * FROM orders
WHERE  order_date < '2025-01-12'
ORDER  BY order_date ASC
LIMIT  5;
-- Cursor direction contradicts sort direction
```

**Fix**: If ORDER BY is ASC, cursor must use `>`. If DESC, cursor must use `<`.

### Mistake 4: Fetching Total Count on Every Page

```sql
-- BAD: runs a full COUNT(*) on a 10M-row table for every page
SELECT COUNT(*) FROM orders;  -- Expensive, but often cached
SELECT * FROM orders ORDER BY order_date, order_id LIMIT 5 OFFSET 0;
```

For keyset pagination, total count is usually unnecessary. For offset pagination, cache the count or compute it asynchronously.

### Mistake 5: Using OFFSET for Streaming / Real-Time Data

```sql
-- BAD: using offset for a live feed
-- Page 1: OFFSET 0
-- Page 2: OFFSET 10
-- Between requests, 3 new rows inserted at the top
-- Page 2 now misses 3 rows
```

**Fix**: Use keyset pagination or WebSocket-based streaming.

---

## Scenario-Based Examples

### Scenario 1: E-Commerce Product Listing (Offset)

User sees page numbers. Table has 50,000 products.

```sql
-- Page number and size from UI
-- page = 3, size = 20

SELECT product_id, name, price
FROM   products
ORDER  BY product_id
LIMIT  20 OFFSET 40;  -- skip 40 rows, fetch 20
```

**Why offset works here**: 50K rows is manageable, page numbers are needed, and the table is mostly read (few writes).

### Scenario 2: Social Media Feed (Keyset)

User scrolls infinitely. Millions of posts. New posts appear at the top.

```sql
-- First load: no cursor
SELECT post_id, user_id, created_at, content
FROM   posts
ORDER  BY created_at DESC, post_id DESC
LIMIT  20;

-- Subsequent loads: client sends cursor
-- Cursor = last (created_at, post_id) from previous response
SELECT post_id, user_id, created_at, content
FROM   posts
WHERE  (created_at, post_id) < ('2025-01-18 11:30:00', 42)
ORDER  BY created_at DESC, post_id DESC
LIMIT  20;
```

**Why keyset works here**: Real-time data, no duplicates/misses, deep pagination possible, high concurrency.

### Scenario 3: Admin Dashboard with Filters (Hybrid)

Admin wants to see orders filtered by date range, with page numbers.

```sql
-- First: count total matching rows (cache this)
SELECT COUNT(*)
FROM   orders
WHERE  order_date BETWEEN '2025-01-01' AND '2025-01-31';

-- Then: fetch page with offset
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  order_date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER  BY order_date, order_id
LIMIT  25 OFFSET 50;
```

If the filtered set is small (< 10K), offset is fine. If it's large, switch to keyset for the actual data fetch and drop the page numbers.

### Scenario 4: API with Cursor-Based Pagination

REST API design:

```
GET /api/orders?limit=10
→ Response:
{
  "data": [...10 orders...],
  "next_cursor": "eyJvcmRlcl9kYXRlIjoiMjAyNS0wMS0xMiAxNDowMDowMCIsIm9yZGVyX2lkIjo1fQ==",
  "has_more": true
}

GET /api/orders?limit=10&cursor=eyJvcmRlcl9kYXRlIjoiMjAyNS0wMS0xMiAxNDowMDowMCIsIm9yZGVyX2lkIjo1fQ==
→ Response:
{
  "data": [...10 orders...],
  "next_cursor": "eyJvcmRlcl9kYXRlIjoiMjAyNS0wMS0xNiAwODowMDowMCIsIm9yZGVyX2lkIjoxMH0=",
  "has_more": true
}
```

---

## Performance Optimization Checklist

1. **Index the sort columns** — composite index on `(order_date, order_id)` for keyset
2. **Verify with EXPLAIN ANALYZE** — confirm "Index Scan" not "Seq Scan"
3. **Avoid SELECT \*** — fetch only the columns you need (see covering indexes)
4. **Keep cursor columns NOT NULL** — prevents silent row loss
5. **Use consistent sort direction** — mixing ASC/DESC within a cursor is complex
6. **Cache total count** — don't recompute on every page
7. **Consider covering indexes** — include non-key columns to avoid heap lookups

```sql
-- Covering index for the keyset query
CREATE INDEX idx_orders_covering
    ON orders (order_date, order_id)
    INCLUDE (customer_id, total);
```

> Performance depends on optimizer, statistics, cardinality, data distribution, and execution plan. Always verify with EXPLAIN ANALYZE rather than assuming.

---

## Best Practices

| Practice                                       | Reason                                   |
| ---------------------------------------------- | ---------------------------------------- |
| Always use ORDER BY with a unique column       | Prevents non-deterministic pagination    |
| Include PK in sort and cursor                  | Breaks ties, ensures uniqueness          |
| Use keyset for deep/real-time pagination       | Constant-time performance                |
| Use offset for page-number UIs with small data | Simpler, user-friendly                   |
| Make cursor columns NOT NULL                   | Prevents silent data loss                |
| Cache total count separately                   | Avoids expensive COUNT(\*) per request   |
| Base64-encode cursors in APIs                  | Opaque to clients, version-flexible      |
| Set `has_more` flag instead of total pages     | Keyset doesn't need total count          |
| Test with EXPLAIN ANALYZE                      | Verify index usage, not just correctness |
| Handle empty results gracefully                | Stop fetching when rows < PAGE_SIZE      |

---

# Interview Questions

## Beginner

1. What is the difference between `LIMIT` and `OFFSET`?
2. Why must you always use `ORDER BY` with `OFFSET`?
3. Write a query to fetch the first 10 orders from the `orders` table, ordered by `order_date`.

## Intermediate

4. Explain why `OFFSET 1000000` is slow even with an index on the sorted columns.
5. What is the difference between `COUNT(*)` and `COUNT(column)` when computing total pages?
6. Write a keyset pagination query that fetches 5 orders after `order_date = '2025-01-15 12:00:00'` and `order_id = 8`.
7. Why should the ORDER BY columns always include a unique column like the primary key?
8. What happens if `order_date` is NULL and you use it in a keyset cursor with `>`?

## Advanced

9. Design a keyset pagination cursor for a query that orders by `created_at DESC, id DESC`. What must the composite index look like?
10. Explain the three-valued logic problem with `(order_date, order_id) > (NULL, 5)`.
11. How would you implement keyset pagination for a query with `DISTINCT`?
12. Describe a scenario where offset pagination produces duplicate rows across pages.
13. How do you handle pagination when the underlying data is filtered with `WHERE category = 'electronics'`?

## Scenario Based

14. You have a table with 50 million rows. Users need to browse results with page numbers AND be able to scroll infinitely. Design a hybrid pagination strategy.
15. An API returns paginated results. Between two requests, a row is deleted. Which pagination method loses data and which does not? Explain with examples.
16. A report shows orders grouped by month. Each group can have thousands of orders. Design a pagination strategy that lets users page through individual orders within a month.

## Tricky

17. What happens if you use `OFFSET 5` without `ORDER BY`? Is the query valid?
18. If `ORDER BY total ASC` and two rows have `total = NULL`, will they appear on the same page or different pages in offset pagination?
19. Can keyset pagination work with a `GROUP BY`? If so, how?

## Output Prediction

Given the `orders` table above, what does this query return?

```sql
SELECT order_id, customer_id, order_date, total
FROM   orders
WHERE  (order_date, order_id) > ('2025-01-13 09:00:00', 6)
ORDER  BY order_date, order_id
LIMIT  3;
```

## Debugging

20. A developer reports: "My second page is missing a row that was on the first page." They are using offset pagination. Diagnose the issue.
21. A keyset pagination query returns zero rows even though the cursor value exists in the table. The cursor is `('2025-01-12 14:00:00', 5)`. The query uses `>`. What could be wrong?

## Performance

22. You run `EXPLAIN ANALYZE` on a keyset pagination query and see a "Seq Scan" instead of "Index Scan". What steps would you take?
23. Compare the execution plans of `OFFSET 100000 LIMIT 10` vs keyset pagination at the same position. What costs differ?
24. A covering index exists on `(order_date, order_id) INCLUDE (customer_id, total)`. A developer adds a new column `status` to the SELECT list. Will the covering index still work? What happens?
