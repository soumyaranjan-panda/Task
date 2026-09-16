# 49 — Running Totals

## What Is a Running Total?

A **running total** (also called a **cumulative sum** or **running sum**) is the accumulation of a value across rows, where each row's result includes its own value plus all preceding rows' values according to a defined order.

**One row in a running total query represents the cumulative state up to and including that row.**

### Why It Exists

Without window functions, computing running totals required self-joins, correlated subqueries, or procedural loops — all of which are verbose, error-prone, and often slow. The `SUM() OVER(ORDER BY ...)` pattern solves this in a single, declarative pass.

### When To Use It

- Financial dashboards (cumulative revenue)
- Inventory tracking (stock balance over time)
- Log analysis (cumulative error count)
- Interview problems (LeetCode 550, running sum queries)
- Reporting (month-to-date totals)

### When NOT To Use It

- You need a final single total (use plain `SUM()`)
- You need per-group totals without ordering (use `SUM() OVER(PARTITION BY ...)`)
- The order is ambiguous — a running total without deterministic ordering is meaningless

---

## Core Syntax

```sql
SUM(column) OVER(
    PARTITION BY group_column
    ORDER BY order_column
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
) AS running_total
```

| Clause                                             | Purpose                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `SUM(column)`                                      | The value being accumulated                                                     |
| `PARTITION BY`                                     | Resets the running total for each group (optional)                              |
| `ORDER BY`                                         | Defines the accumulation order — **required for meaningful running totals**     |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | The frame; this is the default when `ORDER BY` is present, so it can be omitted |

> Common misconception: Many people write `SUM() OVER(ORDER BY ...)` and assume it always produces a running total. It does — but only because the **default frame** is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. This distinction between `ROWS` and `RANGE` matters. See the [Frame Clause Pitfall](#frame-clause-ranges-vs-rows) section.

---

## Sample Tables

### orders

Grain: **One row = one order.**

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE,
    amount      DECIMAL(10,2)
);

INSERT INTO orders VALUES
(1,  101, '2024-01-05', 100.00),
(2,  101, '2024-01-12', 250.00),
(3,  101, '2024-02-03', 150.00),
(4,  102, '2024-01-08', 300.00),
(5,  102, '2024-01-20', 200.00),
(6,  102, '2024-02-14', 400.00),
(7,  103, '2024-01-10', 500.00),
(8,  103, '2024-03-01', 100.00);
```

### daily_transactions

Grain: **One row = one transaction on a given day.**

```sql
CREATE TABLE daily_transactions (
    txn_id      INT PRIMARY KEY,
    account_id  INT,
    txn_date    DATE,
    txn_amount  DECIMAL(10,2)
);

INSERT INTO daily_transactions VALUES
(1,  5001, '2024-01-01',  500.00),
(2,  5001, '2024-01-03', -200.00),
(3,  5001, '2024-01-05',  100.00),
(4,  5001, '2024-01-08', -350.00),
(5,  5002, '2024-01-02', 1000.00),
(6,  5002, '2024-01-07', -400.00);
```

---

## Basic Example: Total Revenue Over Time

**Question:** Show each order with the cumulative revenue across all orders, ordered by date.

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(ORDER BY order_date, order_id) AS running_total
FROM orders
ORDER BY order_date, order_id;
```

**Expected Result:**

| order_id | order_date | amount | running_total |
| -------- | ---------- | ------ | ------------- |
| 1        | 2024-01-05 | 100.00 | 100.00        |
| 4        | 2024-01-08 | 300.00 | 400.00        |
| 7        | 2024-01-10 | 500.00 | 900.00        |
| 2        | 2024-01-12 | 250.00 | 1150.00       |
| 5        | 2024-01-20 | 200.00 | 1350.00       |
| 3        | 2024-02-03 | 150.00 | 1500.00       |
| 6        | 2024-02-14 | 400.00 | 1900.00       |
| 8        | 2024-03-01 | 100.00 | 2000.00       |

---

## Running Total Per Group (PARTITION BY)

**Question:** Show each customer's cumulative spend, resetting for each customer.

```sql
SELECT
    customer_id,
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(
        PARTITION BY customer_id
        ORDER BY order_date, order_id
    ) AS customer_running_total
FROM orders
ORDER BY customer_id, order_date, order_id;
```

**Expected Result:**

| customer_id | order_id | order_date | amount | customer_running_total |
| ----------- | -------- | ---------- | ------ | ---------------------- |
| 101         | 1        | 2024-01-05 | 100.00 | 100.00                 |
| 101         | 2        | 2024-01-12 | 250.00 | 350.00                 |
| 101         | 3        | 2024-02-03 | 150.00 | 500.00                 |
| 102         | 4        | 2024-01-08 | 300.00 | 300.00                 |
| 102         | 5        | 2024-01-20 | 200.00 | 500.00                 |
| 102         | 6        | 2024-02-14 | 400.00 | 900.00                 |
| 103         | 7        | 2024-01-10 | 500.00 | 500.00                 |
| 103         | 8        | 2024-03-01 | 100.00 | 600.00                 |

---

## Running Balance (Negative Values)

**Question:** Show the running balance for account 5001, where withdrawals are negative.

```sql
SELECT
    txn_id,
    txn_date,
    txn_amount,
    SUM(txn_amount) OVER(
        ORDER BY txn_date, txn_id
    ) AS running_balance
FROM daily_transactions
WHERE account_id = 5001
ORDER BY txn_date, txn_id;
```

**Expected Result:**

| txn_id | txn_date   | txn_amount | running_balance |
| ------ | ---------- | ---------- | --------------- |
| 1      | 2024-01-01 | 500.00     | 500.00          |
| 2      | 2024-01-03 | -200.00    | 300.00          |
| 3      | 2024-01-05 | 100.00     | 400.00          |
| 4      | 2024-01-08 | -350.00    | 50.00           |

---

## Running Total with Explicit Frame

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(
        ORDER BY order_date, order_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders
ORDER BY order_date, order_id;
```

This produces the **same result** as the shorthand version because `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` is the default frame when `ORDER BY` is present. Explicit frames become important when you need a different window — see [Sliding Window Totals](#sliding-window-totals) below.

---

## Sliding Window Totals

### Last 3 Orders

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(
        ORDER BY order_date, order_id
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS last_3_orders_total
FROM orders
ORDER BY order_date, order_id;
```

**Expected Result:**

| order_id | order_date | amount | last_3_orders_total |
| -------- | ---------- | ------ | ------------------- |
| 1        | 2024-01-05 | 100.00 | 100.00              |
| 4        | 2024-01-08 | 300.00 | 400.00              |
| 7        | 2024-01-10 | 500.00 | 900.00              |
| 2        | 2024-01-12 | 250.00 | 1050.00             |
| 5        | 2024-01-20 | 200.00 | 950.00              |
| 3        | 2024-02-03 | 150.00 | 600.00              |
| 6        | 2024-02-14 | 400.00 | 750.00              |
| 8        | 2024-03-01 | 100.00 | 650.00              |

### Moving Average (Last 3 Orders)

```sql
SELECT
    order_id,
    order_date,
    amount,
    AVG(amount) OVER(
        ORDER BY order_date, order_id
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3
FROM orders
ORDER BY order_date, order_id;
```

---

## Frame Clause: RANGE vs ROWS

> **Interview trap**

This is one of the most misunderstood aspects of window functions.

### ROWS Frame

`ROWS BETWEEN ...` counts **physical rows**. Each row is an independent unit.

### RANGE Frame

`RANGE BETWEEN ...` counts **logical values**. When multiple rows share the same `ORDER BY` value, they are all included in the same frame boundary.

**When no ties exist, ROWS and RANGE produce identical results.**

### Demonstration with Tied Dates

```sql
-- Add two orders on the same date
INSERT INTO orders VALUES
(9,  104, '2024-01-05', 150.00),
(10, 104, '2024-01-05', 250.00);
```

**RANGE behavior (default):**

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(ORDER BY order_date) AS range_running_total
FROM orders
WHERE customer_id = 104
   OR (customer_id = 101 AND order_id = 1)
ORDER BY order_date, order_id;
```

Both rows on `2024-01-05` see each other in the frame because `RANGE` treats them as a group. The running total for **both** rows includes both amounts:

| order_id | order_date | amount | range_running_total |
| -------- | ---------- | ------ | ------------------- |
| 1        | 2024-01-05 | 100.00 | 500.00              |
| 9        | 2024-01-05 | 150.00 | 500.00              |
| 10       | 2024-01-05 | 250.00 | 500.00              |

**ROWS behavior (explicit):**

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS rows_running_total
FROM orders
WHERE customer_id = 104
   OR (customer_id = 101 AND order_id = 1)
ORDER BY order_date, order_id;
```

| order_id | order_date | amount | rows_running_total |
| -------- | ---------- | ------ | ------------------ |
| 1        | 2024-01-05 | 100.00 | 100.00             |
| 9        | 2024-01-05 | 150.00 | 250.00             |
| 10       | 2024-01-05 | 250.00 | 500.00             |

> Production pitfall: If your `ORDER BY` column has many ties and you use the default `RANGE` frame, you may get unexpected "jumps" in your running total. Always add a **tiebreaker** column (like `order_id`) to the `ORDER BY` clause, or explicitly use `ROWS`.

---

## NULL Behavior

NULLs in the value column affect running totals in the same way they affect `SUM()`:

```sql
INSERT INTO orders VALUES
(11, 105, '2024-01-15', NULL);
```

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(ORDER BY order_date, order_id) AS running_total
FROM orders
WHERE customer_id IN (105)
ORDER BY order_date;
```

| order_id | order_date | amount | running_total |
| -------- | ---------- | ------ | ------------- |
| 11       | 2024-01-15 | NULL   | NULL          |

> **All subsequent rows in the running total will also be NULL** because `SUM(anything + NULL) = NULL`.

### Fix: Use COALESCE

```sql
SELECT
    order_id,
    order_date,
    COALESCE(amount, 0) AS amount,
    SUM(COALESCE(amount, 0)) OVER(
        ORDER BY order_date, order_id
    ) AS running_total
FROM orders
WHERE customer_id IN (105)
ORDER BY order_date;
```

| order_id | order_date | amount | running_total |
| -------- | ---------- | ------ | ------------- |
| 11       | 2024-01-15 | 0.00   | 0.00          |

> NULL behavior: `SUM()` ignores NULLs when aggregating a group, but in a window function with `ORDER BY`, a NULL in the value column causes the entire running total to become NULL from that row onward. This is because the frame accumulation includes the current row, and `SUM(accumulated, NULL) = NULL`.

---

## BAD APPROACH vs BETTER APPROACH

### BAD: Correlated Subquery for Running Total

```sql
SELECT
    o1.order_id,
    o1.order_date,
    o1.amount,
    (
        SELECT SUM(o2.amount)
        FROM orders o2
        WHERE o2.order_date < o1.order_date
           OR (o2.order_date = o1.order_date AND o2.order_id <= o1.order_id)
    ) AS running_total
FROM orders o1
ORDER BY o1.order_date, o1.order_id;
```

**Problems:**

- Executes the subquery **once per row** — O(n²) in the worst case
- Hard to read
- Error-prone with date logic
- Cannot reset per group without adding `WHERE o2.customer_id = o1.customer_id`

### BETTER: Window Function

```sql
SELECT
    order_id,
    order_date,
    amount,
    SUM(amount) OVER(
        ORDER BY order_date, order_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders
ORDER BY order_date, order_id;
```

**Why it's better:**

- Single pass over the data (or sort + single pass)
- Declarative — you say _what_ you want, not _how_ to compute it
- Optimizer-friendly
- Readable

### BAD: Self-Join for Running Total

```sql
SELECT
    a.order_id,
    a.order_date,
    a.amount,
    SUM(b.amount) AS running_total
FROM orders a
JOIN orders b
    ON b.order_date < a.order_date
    OR (b.order_date = a.order_date AND b.order_id <= a.order_id)
GROUP BY a.order_id, a.order_date, a.amount
ORDER BY a.order_date, a.order_id;
```

**Problems:**

- Multiplies rows before aggregation
- Very expensive on large datasets
- Unnecessarily complex

### BETTER: Same window function approach above.

---

## How It Works Internally

When the database executes a running total query:

1. **Partition** the rows (if `PARTITION BY` is specified)
2. **Sort** each partition by the `ORDER BY` columns
3. **Scan** the sorted partition, maintaining an accumulator
4. **Emit** each row with the accumulated value

```
Sorted partition for customer_id = 101:

  Row 1: amount=100 → accumulator = 100 → emit (100)
  Row 2: amount=250 → accumulator = 100 + 250 = 350 → emit (350)
  Row 3: amount=150 → accumulator = 350 + 150 = 500 → emit (500)
```

With `ROWS` frame, the accumulator is a simple running sum. With `RANGE` frame, the database must group rows with identical `ORDER BY` values and apply the sum to the entire group.

---

## Performance Implications

### What Affects Performance

| Factor                 | Impact                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `PARTITION BY` columns | Partitions data; fewer rows per partition = faster accumulation                                 |
| `ORDER BY` columns     | Requires sorting; indexes on these columns can avoid a sort operation                           |
| `ROWS` vs `RANGE`      | `RANGE` may require additional work to handle ties                                              |
| Data volume            | Window functions are generally O(n log n) due to sorting                                        |
| Indexes                | A composite index on `(partition_cols, order_cols, value_col)` can provide a **covering index** |

### Index Recommendation

```sql
CREATE INDEX idx_orders_cust_date_id
ON orders (customer_id, order_date, order_id, amount);
```

This index can:

- Avoid the sort for `PARTITION BY customer_id ORDER BY order_date, order_id`
- Serve as a covering index (no table lookup needed)

> Always verify with `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL/Oracle), or `EXPLAIN ANALYZE` (SQL Server). Do not assume an index helps without checking the actual execution plan.

### Execution Plan Clues

- Look for **WindowAgg** node (PostgreSQL) — this indicates window function execution
- Look for **Sort** nodes — these can be expensive; an index may eliminate them
- Look for **Sort Key** in EXPLAIN output — confirms the sort columns

> Production pitfall: On very large tables (billions of rows), window functions with `UNBOUNDED PRECEDING` can consume significant memory. Some databases spill to disk. Monitor memory usage and consider whether a materialized summary table would be more appropriate.

---

## Comparison: Running Total Approaches

| Approach                   | Readability | Performance  | Handles PARTITION BY | Handles NULLs | Recommended |
| -------------------------- | ----------- | ------------ | -------------------- | ------------- | ----------- |
| `SUM() OVER(ORDER BY ...)` | Excellent   | Excellent    | Yes                  | With COALESCE | Yes         |
| Correlated subquery        | Poor        | Poor (O(n²)) | Verbose              | Manual        | No          |
| Self-join + GROUP BY       | Poor        | Poor         | Verbose              | Manual        | No          |
| CTE + lateral join         | Moderate    | Moderate     | Verbose              | Manual        | Sometimes   |
| Procedural loop            | Poor        | Poor         | Verbose              | Manual        | No          |

---

## Common Mistakes

### 1. Forgetting ORDER BY

```sql
-- This produces a total, not a running total
SELECT
    amount,
    SUM(amount) OVER() AS not_a_running_total  -- ← wrong
FROM orders;
```

Without `ORDER BY`, the frame defaults to `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` — the entire partition. Every row gets the same total.

### 2. Using ORDER BY on a Non-Deterministic Column

```sql
-- Bad: order_date alone may have ties
SUM(amount) OVER(ORDER BY order_date) AS running_total

-- Better: add a tiebreaker
SUM(amount) OVER(ORDER BY order_date, order_id) AS running_total
```

Without a tiebreaker, ties are processed non-deterministically. With `ROWS` frame, the result depends on physical row order which is not guaranteed.

### 3. Using the Wrong Column in SUM

```sql
-- Common mistake: summing the running total column instead of the base value
SUM(running_total) OVER(ORDER BY order_date)  -- ← wrong, double-counts
```

### 4. NULL Contamination

See [NULL Behavior](#null-behavior) above. Always `COALESCE` values that may be NULL if you cannot afford NULL propagation.

### 5. Confusing Running Total with Rank

```sql
-- This is a rank, not a running total
ROW_NUMBER() OVER(ORDER BY amount DESC)  -- ← assigns row numbers
```

---

## Edge Cases

### Zero Rows in Partition

```sql
-- If a customer has no orders, the window function produces no rows
-- (not zero, not NULL — the row simply does not exist in the result)
```

### Single Row

The running total equals the value of that single row.

### All NULL Values

```sql
SELECT SUM(amount) OVER(ORDER BY order_date, order_id) AS running_total
FROM orders WHERE customer_id = 999;  -- all amounts are NULL
-- Every row shows NULL
```

### Duplicate Values

```sql
INSERT INTO orders VALUES
(12, 106, '2024-01-10', 200.00),
(13, 106, '2024-01-10', 200.00);
```

With `ROWS` frame, each duplicate accumulates independently:
| order_id | amount | running_total |
|----------|--------|---------------|
| 12 | 200.00 | 200.00 |
| 13 | 200.00 | 400.00 |

With `RANGE` frame (default), both show the same total because they share the same `ORDER BY` value:
| order_id | amount | running_total |
|----------|--------|---------------|
| 12 | 200.00 | 400.00 |
| 13 | 200.00 | 400.00 |

### Negative Values Running Below Zero

Running totals can go negative. If you need a floor, use `GREATEST`:

```sql
GREATEST(
    SUM(txn_amount) OVER(ORDER BY txn_date, txn_id),
    0
) AS non_negative_balance
```

> Oracle/PostgreSQL: `GREATEST()`. MySQL 8.0+: `GREATEST()`. SQL Server: `IIF(SUM(...) < 0, 0, SUM(...))` or `CASE WHEN`.

---

## Database-Specific Notes

> **PostgreSQL**
>
> - Supports `ROWS`, `GROUPS`, and `RANGE` frame types
> - `GROUPS` frame (PostgreSQL 11+) groups tied rows then counts groups
> - Default frame with `ORDER BY`: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`

> **MySQL 8.0+**
>
> - Supports `ROWS` and `RANGE` frames
> - Default frame with `ORDER BY`: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
> - Does not support `GROUPS` frame

> **SQL Server**
>
> - Supports `ROWS` and `RANGE` frames
> - Default frame with `ORDER BY`: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
> - `EXACT_COUNT_DISTINCT` is not a function — use `COUNT(DISTINCT ...)`

> **Oracle**
>
> - Supports `ROWS`, `RANGE`, and `GROUPS` frames
> - Default frame with `ORDER BY`: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
> - `SUM() OVER()` without `ORDER BY` returns the entire partition total on every row

---

## Interview Questions

### Beginner

1. Write a query to compute the running total of `amount` from the `orders` table, ordered by `order_date`.

2. What is the difference between `SUM(amount) OVER()` and `SUM(amount) OVER(ORDER BY order_date)`?

3. Does `SUM(amount) OVER(ORDER BY order_date)` use `ROWS` or `RANGE` by default?

### Intermediate

4. Write a query that computes a running total of `amount` per customer, resetting for each customer, ordered by `order_date`.

5. How would you handle NULL values in the `amount` column when computing a running total?

6. Given two orders on the same date with the same `amount`, explain why `ROWS` and `RANGE` frames produce different running totals.

7. Write a query that computes a 3-order moving sum of `amount`.

### Advanced

8. Write a query that computes a running total but only includes orders where `amount > 100`. Rows where `amount <= 100` should still appear in the output with `NULL` as the running total.

9. Explain how a composite index on `(customer_id, order_date, order_id, amount)` helps a running total query with `PARTITION BY customer_id ORDER BY order_date, order_id`.

10. Write a query that computes a running total and flags the first time a customer's cumulative spend exceeds 1000.

### Scenario Based

11. You have a table of daily stock prices. Write a query to compute the running maximum price (not sum) per stock ticker.

12. A bank needs a daily closing balance per account. The `transactions` table has deposits (positive) and withdrawals (negative). Some transactions have NULL amounts (failed transactions). Write the query and handle the NULL case.

13. You need a running total of `revenue` per product category, but only for the top 5 products by total revenue. Write the query using a CTE.

### Tricky

14. What happens to the running total if two rows have the same `order_date` and you use `RANGE` frame? What if you use `ROWS` frame?

15. A student writes:

```sql
SELECT order_id, SUM(amount) OVER(ORDER BY order_date ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING) AS running_total
FROM orders;
```

Is this a running total? What does it actually compute?

16. Explain why this query does NOT produce a running total:

```sql
SELECT order_id, amount, SUM(amount) OVER(ORDER BY amount) AS running_total
FROM orders;
```

What does it produce instead?

### Output Prediction

17. Given:

```sql
CREATE TABLE t (id INT, val INT);
INSERT INTO t VALUES (1, 10), (2, 20), (3, 20), (4, 30);
```

Predict the output of:

```sql
SELECT id, val,
    SUM(val) OVER(ORDER BY val ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_total,
    SUM(val) OVER(ORDER BY val) AS range_total
FROM t;
```

### Debugging

18. A developer reports that their running total "jumps" unexpectedly. They show this query:

```sql
SELECT order_date, SUM(amount) OVER(ORDER BY order_date) AS running_total
FROM orders;
```

What is likely wrong, and how would you fix it?

### Performance

19. You have a table with 100 million rows. A running total query takes 45 seconds. List three strategies to improve performance, and explain how you would verify each one helps.

20. Under what circumstances might a correlated subquery outperform a window function for computing a running total?
