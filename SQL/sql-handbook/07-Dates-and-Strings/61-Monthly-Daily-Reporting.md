# Monthly & Daily Reporting

## 1. What Is This Section About?

Monthly and daily reporting is the backbone of business analytics. Every company needs to answer:

- "How many orders did we get **per day** last month?"
- "What is our **month-over-month** revenue growth?"
- "Show me **year-to-date** sales by region."
- "Fill in **every day** of the month, even days with zero orders."

This section teaches you how to build reliable, production-ready date-based reports in SQL.

---

## 2. Grain: The Most Important Concept

**Grain** = what one row in your result represents.

> Every reporting query must start by answering: "What does one output row represent?"

| Grain                       | Example Question                |
| --------------------------- | ------------------------------- |
| One row per day             | Daily active users              |
| One row per month           | Monthly revenue                 |
| One row per day per product | Daily sales by product          |
| One row per week            | Weekly order count              |
| One row per calendar period | Monthly report with gaps filled |

**Production pitfall:** If you forget to define grain, you will get duplicate rows, inflated counts, or silent data loss.

---

## 3. Sample Tables

```sql
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT,
    order_date  DATE,
    status      VARCHAR(20),
    amount      DECIMAL(10,2)
);

CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT,
    product_id INT,
    quantity   INT,
    price      DECIMAL(10,2)
);

CREATE TABLE customers (
    customer_id   INT PRIMARY KEY,
    name          VARCHAR(100),
    signup_date   DATE,
    region        VARCHAR(50)
);
```

**Grain definitions:**

| Table       | Grain                               |
| ----------- | ----------------------------------- |
| orders      | One row = one order                 |
| order_items | One row = one line item in an order |
| customers   | One row = one customer              |

---

## 4. Truncating Dates to a Reporting Period

### 4.1 The Core Problem

You cannot group raw `DATE` or `TIMESTAMP` values by month — you must **truncate** them to the first day of the period.

**BAD APPROACH:**

```sql
-- This groups by exact date, not by month
SELECT
    order_date,
    COUNT(*) AS order_count
FROM orders
GROUP BY order_date;
```

This gives you one row per distinct date, not per month.

**BETTER APPROACH:**

```sql
-- Truncate to the first day of the month
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS order_count
FROM orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;
```

### 4.2 Database-Specific Syntax

| Operation         | PostgreSQL                 | MySQL                                      | SQL Server                                      | Oracle                    |
| ----------------- | -------------------------- | ------------------------------------------ | ----------------------------------------------- | ------------------------- |
| Truncate to month | `DATE_TRUNC('month', col)` | `DATE_FORMAT(col, '%Y-%m-01')`             | `DATEFROMPARTS(YEAR(col), MONTH(col), 1)`       | `TRUNC(col, 'MM')`        |
| Truncate to day   | `DATE_TRUNC('day', col)`   | `DATE(col)`                                | `CAST(col AS DATE)`                             | `TRUNC(col, 'DD')`        |
| Truncate to week  | `DATE_TRUNC('week', col)`  | `DATE_SUB(col, INTERVAL WEEKDAY(col) DAY)` | `DATEADD(DAY, -DATEDIFF(DAY, 0, col) % 7, col)` | `TRUNC(col, 'IW')`        |
| Year-month string | `TO_CHAR(col, 'YYYY-MM')`  | `DATE_FORMAT(col, '%Y-%m')`                | `FORMAT(col, 'yyyy-MM')`                        | `TO_CHAR(col, 'YYYY-MM')` |

---

## 5. Daily Reporting

### 5.1 Simple Daily Aggregation

```sql
SELECT
    order_date                          AS report_date,
    COUNT(*)                            AS total_orders,
    COUNT(DISTINCT customer_id)         AS unique_customers,
    SUM(amount)                         AS total_revenue,
    ROUND(AVG(amount), 2)               AS avg_order_value
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2025-02-01'
GROUP BY order_date
ORDER BY report_date;
```

**Expected output (sample):**

| report_date | total_orders | unique_customers | total_revenue | avg_order_value |
| ----------- | ------------ | ---------------- | ------------- | --------------- |
| 2025-01-01  | 45           | 38               | 12450.00      | 276.67          |
| 2025-01-02  | 52           | 44               | 15230.50      | 292.89          |
| 2025-01-03  | 31           | 27               | 8920.75       | 287.77          |

### 5.2 Hourly Granularity (Intraday)

```sql
SELECT
    DATE_TRUNC('day', order_date)       AS report_date,
    EXTRACT(HOUR FROM order_date)       AS report_hour,
    COUNT(*)                            AS order_count,
    SUM(amount)                         AS revenue
FROM orders
WHERE order_date >= '2025-01-15'
  AND order_date <  '2025-01-16'
GROUP BY DATE_TRUNC('day', order_date), EXTRACT(HOUR FROM order_date)
ORDER BY report_hour;
```

---

## 6. Monthly Reporting

### 6.1 Simple Monthly Aggregation

```sql
SELECT
    DATE_TRUNC('month', order_date)     AS report_month,
    COUNT(*)                            AS total_orders,
    SUM(amount)                         AS total_revenue
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2026-01-01'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY report_month;
```

**Expected output:**

| report_month | total_orders | total_revenue |
| ------------ | ------------ | ------------- |
| 2025-01-01   | 1420         | 425600.00     |
| 2025-02-01   | 1380         | 412300.00     |
| 2025-03-01   | 1550         | 468900.00     |

### 6.2 Monthly Report by Category

```sql
SELECT
    DATE_TRUNC('month', o.order_date)   AS report_month,
    p.category                          AS product_category,
    COUNT(DISTINCT o.order_id)          AS order_count,
    SUM(oi.quantity * oi.price)         AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p     ON p.product_id = oi.product_id
WHERE o.order_date >= '2025-01-01'
  AND o.order_date <  '2025-04-01'
GROUP BY DATE_TRUNC('month', o.order_date), p.category
ORDER BY report_month, revenue DESC;
```

**Production pitfall:** The JOIN between `orders` and `order_items` can produce duplicates if an order has multiple items. Always use `COUNT(DISTINCT o.order_id)` for order counts, not `COUNT(*)`.

---

## 7. Filling Gaps: Days or Months with Zero Activity

### 7.1 Why Gaps Matter

If you group by `order_date`, days with **zero orders** are **completely absent** from the result. Charts and dashboards will show misleading drops.

### 7.2 Generate a Date Series

**PostgreSQL — generate_series:**

```sql
SELECT
    gs.date::date AS report_date
FROM generate_series(
    '2025-01-01'::date,
    '2025-01-31'::date,
    '1 day'::interval
) AS gs(date);
```

**MySQL — recursive CTE:**

```sql
WITH RECURSIVE date_series AS (
    SELECT DATE('2025-01-01') AS report_date
    UNION ALL
    SELECT DATE_ADD(report_date, INTERVAL 1 DAY)
    FROM date_series
    WHERE report_date < '2025-01-31'
)
SELECT report_date FROM date_series;
```

**SQL Server — recursive CTE:**

```sql
WITH date_series AS (
    SELECT CAST('2025-01-01' AS DATE) AS report_date
    UNION ALL
    SELECT DATEADD(DAY, 1, report_date)
    FROM date_series
    WHERE report_date < '2025-01-31'
)
SELECT report_date FROM date_series
OPTION (MAXRECURSION 32);
```

### 7.3 LEFT JOIN to Fill Gaps

```sql
WITH date_series AS (
    SELECT gs.date::date AS report_date
    FROM generate_series(
        '2025-01-01'::date,
        '2025-01-31'::date,
        '1 day'::interval
    ) AS gs(date)
)
SELECT
    ds.report_date,
    COUNT(o.order_id)       AS total_orders,
    COALESCE(SUM(o.amount), 0) AS total_revenue
FROM date_series ds
LEFT JOIN orders o ON o.order_date = ds.report_date
GROUP BY ds.report_date
ORDER BY ds.report_date;
```

**Expected output:**

| report_date | total_orders | total_revenue |
| ----------- | ------------ | ------------- |
| 2025-01-01  | 45           | 12450.00      |
| 2025-01-02  | 0            | 0.00          |
| 2025-01-03  | 52           | 15230.50      |
| 2025-01-04  | 0            | 0.00          |

**BETTER APPROACH — use LEFT JOIN from the date series, not from the orders table.**

**BAD APPROACH:**

```sql
-- This loses days with zero orders
SELECT
    order_date,
    COUNT(*) AS total_orders
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2025-02-01'
GROUP BY order_date
ORDER BY order_date;
```

### 7.4 Filling Months (Same Pattern)

```sql
WITH months AS (
    SELECT gs.date::date AS month_start
    FROM generate_series(
        '2025-01-01'::date,
        '2025-12-01'::date,
        '1 month'::interval
    ) AS gs(date)
)
SELECT
    m.month_start,
    COUNT(o.order_id)               AS total_orders,
    COALESCE(SUM(o.amount), 0)     AS total_revenue
FROM months m
LEFT JOIN orders o
    ON DATE_TRUNC('month', o.order_date) = m.month_start
GROUP BY m.month_start
ORDER BY m.month_start;
```

---

## 8. Period-over-Period Comparisons

### 8.1 Month-over-Month (MoM)

```sql
WITH monthly AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount)                     AS revenue
    FROM orders
    WHERE order_date >= '2024-01-01'
      AND order_date <  '2026-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month)  AS prev_month_revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS absolute_change,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month))
        / NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100,
        2
    ) AS pct_change
FROM monthly
ORDER BY month;
```

**Expected output:**

| month      | revenue   | prev_month_revenue | absolute_change | pct_change |
| ---------- | --------- | ------------------ | --------------- | ---------- |
| 2024-01-01 | 425600.00 | NULL               | NULL            | NULL       |
| 2024-02-01 | 412300.00 | 425600.00          | -13300.00       | -3.12      |
| 2024-03-01 | 468900.00 | 412300.00          | 56600.00        | 13.73      |

**Interview trap:** `LAG()` returns `NULL` for the first row. Division by `NULL` produces `NULL`. Use `NULLIF` to prevent division by zero errors.

### 8.2 Year-over-Year (YoY)

```sql
WITH monthly AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount)                     AS revenue
    FROM orders
    WHERE order_date >= '2024-01-01'
      AND order_date <  '2026-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
    curr.month                                   AS current_month,
    curr.revenue                                 AS current_revenue,
    prev.revenue                                 AS prev_year_revenue,
    curr.revenue - prev.revenue                  AS absolute_change,
    ROUND(
        (curr.revenue - prev.revenue)
        / NULLIF(prev.revenue, 0) * 100,
        2
    )                                            AS yoy_pct_change
FROM monthly curr
LEFT JOIN monthly prev
    ON prev.month = curr.month - INTERVAL '1 year'
ORDER BY curr.month;
```

### 8.3 Comparison Table

| Technique          | Window Function           | JOIN | CTE Required |
| ------------------ | ------------------------- | ---- | ------------ |
| MoM with `LAG()`   | Yes                       | No   | Yes          |
| YoY with self-join | No                        | Yes  | Yes          |
| MoM with self-join | No                        | Yes  | Yes          |
| Rolling 3-month    | Yes (with `ROWS BETWEEN`) | No   | Yes          |

---

## 9. Rolling Windows and Cumulative Reports

### 9.1 Month-to-Date (MTD)

```sql
SELECT
    order_date,
    SUM(amount) OVER (
        PARTITION BY DATE_TRUNC('month', order_date)
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS mtd_revenue
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2025-02-01'
ORDER BY order_date;
```

### 9.2 Year-to-Date (YTD)

```sql
SELECT
    order_date,
    SUM(amount) OVER (
        PARTITION BY EXTRACT(YEAR FROM order_date)
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS ytd_revenue
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2026-01-01'
ORDER BY order_date;
```

### 9.3 Rolling 7-Day / 30-Day Windows

```sql
SELECT
    order_date,
    SUM(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7day_revenue,
    AVG(amount) OVER (
        ORDER BY order_date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS rolling_30day_avg
FROM (
    SELECT
        order_date,
        SUM(amount) AS amount
    FROM orders
    GROUP BY order_date
) daily
ORDER BY order_date;
```

**Production pitfall:** If your window function operates on individual rows before aggregation, you will get incorrect results. Always aggregate first, then apply window functions.

---

## 10. Fiscal vs. Calendar Periods

### 10.1 Fiscal Month Offset

Many companies have fiscal years that don't start in January.

```sql
-- Fiscal year starting April 1
-- Fiscal month = calendar month shifted by 3 months
SELECT
    order_date,
    EXTRACT(MONTH FROM order_date)                     AS calendar_month,
    EXTRACT(MONTH FROM (order_date - INTERVAL '3 months')) AS fiscal_month,
    EXTRACT(YEAR FROM (order_date - INTERVAL '3 months'))  AS fiscal_year
FROM orders
LIMIT 5;
```

### 10.2 ISO Week Numbering

```sql
SELECT
    order_date,
    EXTRACT(YEAR FROM order_date)                          AS calendar_year,
    EXTRACT(WEEK FROM order_date)                          AS iso_week,
    TO_CHAR(order_date, 'IYYY-IW')                        AS iso_year_week
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2025-02-01';
```

> **PostgreSQL:** `EXTRACT(WEEK FROM ...)` follows ISO 8601.
> **MySQL:** Use `WEEK(order_date, 3)` for ISO weeks.
> **SQL Server:** Use `DATEPART(ISO_WEEK, col)`.

---

## 11. Edge Cases and NULL Behavior

### 11.1 NULL in Date Columns

```sql
-- COUNT(*) counts all rows including NULLs
-- COUNT(order_date) excludes NULLs
SELECT
    COUNT(*)                    AS total_rows,
    COUNT(order_date)           AS rows_with_date,
    COUNT(*) - COUNT(order_date) AS rows_with_null_date
FROM orders;
```

### 11.2 NULL in Aggregations

```sql
-- SUM ignores NULLs
-- If ALL values are NULL, SUM returns NULL (not 0)
-- Use COALESCE to convert NULL to 0
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COALESCE(SUM(amount), 0)        AS total_revenue,
    COALESCE(AVG(amount), 0)        AS avg_amount
FROM orders
GROUP BY DATE_TRUNC('month', order_date);
```

### 11.3 Timestamp Boundary Issue

**Production pitfall:** Using `BETWEEN` with timestamps can miss the last day.

**BAD APPROACH:**

```sql
-- Misses rows where order_date = '2025-01-31 23:59:59.999'
SELECT *
FROM orders
WHERE order_date BETWEEN '2025-01-01' AND '2025-01-31';
```

**BETTER APPROACH:**

```sql
-- Captures all rows in January, regardless of time component
SELECT *
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2025-02-01';
```

This works for both `DATE` and `TIMESTAMP` types.

### 11.4 Leap Year Edge Case

```sql
-- February 29 exists only in leap years
-- This query returns no rows in non-leap years
SELECT *
FROM orders
WHERE EXTRACT(MONTH FROM order_date) = 2
  AND EXTRACT(DAY FROM order_date) = 29;
```

### 11.5 Month-End Truncation

```sql
-- DATE_TRUNC('month', '2025-01-31') returns '2025-01-01'
-- This is correct behavior, but be aware that filtering
-- on the truncated value will include all days of the month
SELECT DATE_TRUNC('month', '2025-01-31'::date);
-- Result: 2025-01-01
```

---

## 12. Common Mistakes

### 12.1 GROUP BY Without Truncation

**BAD:**

```sql
-- Groups by exact timestamp, not by month
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*)
FROM orders
GROUP BY order_date  -- WRONG: groups by raw date
```

**GOOD:**

```sql
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*)
FROM orders
GROUP BY DATE_TRUNC('month', order_date)  -- Correct
```

### 12.2 Fan-Out from JOINs

**BAD:**

```sql
-- Double counting: each order_item multiplies the order row
SELECT
    DATE_TRUNC('month', o.order_date) AS month,
    COUNT(*)                          AS order_count,  -- WRONG inflated
    SUM(o.amount)                     AS revenue       -- Correct
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY DATE_TRUNC('month', o.order_date);
```

**GOOD:**

```sql
-- Use COUNT(DISTINCT ...) for order counts
SELECT
    DATE_TRUNC('month', o.order_date) AS month,
    COUNT(DISTINCT o.order_id)        AS order_count,  -- Correct
    SUM(oi.quantity * oi.price)       AS revenue        -- Use item-level
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY DATE_TRUNC('month', o.order_date);
```

### 12.3 WHERE vs. HAVING for Date Filters

```sql
-- WHERE filters before aggregation (preferred for performance)
-- HAVING filters after aggregation

-- BETTER: filter in WHERE
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount)                     AS revenue
FROM orders
WHERE order_date >= '2025-01-01'   -- Filtered before aggregation
  AND order_date <  '2025-07-01'
GROUP BY DATE_TRUNC('month', order_date);

-- BAD: filtering month after aggregation
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount)                     AS revenue
FROM orders
GROUP BY DATE_TRUNC('month', order_date)
HAVING DATE_TRUNC('month', order_date) >= '2025-01-01';  -- Slower
```

---

## 13. Performance Considerations

### 13.1 Indexes

```sql
-- Index on the date column for efficient range scans
CREATE INDEX idx_orders_order_date ON orders(order_date);

-- Composite index for common query patterns
CREATE INDEX idx_orders_date_status ON orders(order_date, status);

-- Covering index for a specific report
CREATE INDEX idx_orders_date_amount ON orders(order_date, amount);
```

**What to verify:** Run `EXPLAIN ANALYZE` (PostgreSQL) or `EXPLAIN` (MySQL/SQL Server) to confirm:

- The index is being used
- Range scans are efficient
- The planner is not doing a full table scan

### 13.2 Partitioning

For very large tables, consider partitioning by date:

```sql
-- PostgreSQL native partitioning
CREATE TABLE orders (
    order_id    INT,
    order_date  DATE,
    amount      DECIMAL(10,2)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2025_01 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 13.3 Avoid Functions on Indexed Columns in WHERE

**BAD (non-sargable):**

```sql
-- Prevents index usage on order_date
SELECT *
FROM orders
WHERE TO_CHAR(order_date, 'YYYY-MM') = '2025-01';
```

**GOOD (sargable):**

```sql
-- Uses index on order_date
SELECT *
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date <  '2025-02-01';
```

**Interview trap:** A function wrapping an indexed column in the `WHERE` clause makes the predicate **non-sargable** and prevents index usage.

### 13.4 Execution Plan Checklist

When a date-based report is slow, check:

1. **Is there an index on the date column?**
2. **Is the index being used?** (check `EXPLAIN`)
3. **Are you filtering early with `WHERE`?**
4. **Is there unnecessary JOIN fan-out?**
5. **Are you using a non-sargable predicate?**
6. **Is the table partitioned?**
7. **Are statistics up to date?** (`ANALYZE` in PostgreSQL)

---

## 14. Real-World Scenario: Daily Active Users Report

```sql
WITH date_range AS (
    SELECT generate_series(
        '2025-01-01'::date,
        '2025-01-31'::date,
        '1 day'::interval
    )::date AS report_date
),
daily_logins AS (
    SELECT
        login_date::date AS login_day,
        COUNT(DISTINCT user_id) AS dau
    FROM logins
    WHERE login_date >= '2025-01-01'
      AND login_date <  '2025-02-01'
    GROUP BY login_date::date
)
SELECT
    dr.report_date,
    COALESCE(dl.dau, 0)                           AS daily_active_users,
    AVG(COALESCE(dl.dau, 0)) OVER (
        ORDER BY dr.report_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )                                              AS rolling_7day_avg,
    MAX(COALESCE(dl.dau, 0)) OVER (
        ORDER BY dr.report_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                              AS peak_dau_to_date
FROM date_range dr
LEFT JOIN daily_logins dl ON dl.login_day = dr.report_date
ORDER BY dr.report_date;
```

---

## 15. Cross-References

| Related Section               | Why It's Relevant                                      |
| ----------------------------- | ------------------------------------------------------ |
| 40 — Window Functions         | `LAG`, `LEAD`, `ROW_NUMBER` used in period comparisons |
| 39 — CTEs                     | Building date series and intermediate aggregations     |
| 38 — GROUP BY Fundamentals    | Core grouping mechanics                                |
| 42 — Date Functions Deep Dive | Full reference on date truncation and extraction       |
| 84 — Indexes & Sargability    | Performance of date range queries                      |
| 85 — Execution Plans          | How to verify query performance                        |

---

# Interview Questions

## Beginner

1. Write a query to count the number of orders per month for 2025.
2. What is the difference between `GROUP BY order_date` and `GROUP BY DATE_TRUNC('month', order_date)`?
3. How do you filter for orders placed in January 2025 using a sargable predicate?
4. Write a query to find the total revenue per day for the last 7 days.
5. What does `COALESCE(SUM(amount), 0)` do in a `LEFT JOIN` scenario?

## Intermediate

6. Write a month-over-month revenue growth percentage report using `LAG()`.
7. Generate a complete date series for March 2025 and LEFT JOIN it against orders to show zero-revenue days.
8. Write a year-over-year comparison query that shows each month's revenue alongside the same month from the previous year.
9. Explain the difference between `BETWEEN '2025-01-01' AND '2025-01-31'` and `>= '2025-01-01' AND < '2025-02-01'` when `order_date` is a `TIMESTAMP`.
10. Write a query that calculates a 7-day rolling average of daily revenue.

## Advanced

11. Write a query that calculates both MoM and YoY growth percentages in a single result set.
12. Build a report that shows cumulative revenue by product category, resetting at the start of each fiscal year (fiscal year starts April 1).
13. Write a query to detect "streak" days — consecutive days where revenue exceeded $10,000.
14. Create a monthly report with gaps filled for all months in 2025, showing revenue, order count, and the percentage of total annual revenue each month represents.
15. Write a query that compares each day's revenue to the same day of the week from the previous month (e.g., this Monday vs. last month's Monday).

## Scenario Based

16. Your dashboard shows a revenue drop every Sunday. Investigate and write a query that accounts for weekly patterns.
17. You need to report daily revenue but your `orders` table has a timezone-aware `created_at` column. How do you handle timezone conversion for a report in UTC?
18. A stakeholder asks for "this month's revenue" on January 31 at 11:59 PM. The query returns $0. Why? How do you fix it?
19. Your monthly report shows $1,250,000 in revenue, but the finance team's number is $1,100,000. You discover the query JOINs `orders` with `order_items`. What went wrong?
20. You're asked to build a report that compares "first 30 days after signup" revenue across customer cohorts. How do you structure this?

## Tricky

21. What is the output of this query?

```sql
SELECT DATE_TRUNC('month', '2025-02-28'::date);
```

22. What is the output of this query?

```sql
WITH months AS (
    SELECT '2025-01-01'::date AS m
    UNION ALL
    SELECT '2025-02-01'::date
    UNION ALL
    SELECT '2025-03-01'::date
)
SELECT
    m,
    LAG(m) OVER (ORDER BY m) AS prev_month
FROM months;
```

23. What is wrong with this query?

```sql
SELECT
    TO_CHAR(order_date, 'YYYY-MM') AS month,
    COUNT(*)
FROM orders
WHERE TO_CHAR(order_date, 'YYYY-MM') = '2025-01'
GROUP BY TO_CHAR(order_date, 'YYYY-MM');
```

24. What happens when you run this query?

```sql
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) / NULLIF(COUNT(*), 0) AS avg_revenue
FROM orders
WHERE order_date IS NULL
GROUP BY DATE_TRUNC('month', order_date);
```

25. A query uses `ROWS BETWEEN 29 PRECEDING AND CURRENT ROW` for a rolling 30-day average. Is this correct?

## Output Prediction

Given this data:

| order_date | amount |
| ---------- | ------ |
| 2025-01-01 | 100    |
| 2025-01-01 | 200    |
| 2025-01-15 | 150    |
| 2025-02-01 | 300    |
| 2025-02-14 | 250    |

26. Predict the output of:

```sql
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS order_count,
    SUM(amount) AS revenue
FROM orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;
```

27. Predict the output of:

```sql
WITH daily AS (
    SELECT order_date, SUM(amount) AS revenue
    FROM orders
    GROUP BY order_date
)
SELECT
    order_date,
    revenue,
    LAG(revenue) OVER (ORDER BY order_date) AS prev_revenue
FROM daily
ORDER BY order_date;
```

## Debugging

28. This query is supposed to show monthly revenue but returns only one row. Debug it.

```sql
SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount)
FROM orders
WHERE order_date >= '2025-01-01'
GROUP BY order_date;
```

29. This query should show a complete calendar with zero-revenue days, but still shows gaps. Find the bug.

```sql
SELECT
    ds.report_date,
    COUNT(o.order_id) AS orders
FROM generate_series('2025-01-01'::date, '2025-01-31'::date, '1 day') ds
JOIN orders o ON o.order_date = ds.report_date
GROUP BY ds.report_date;
```

30. This MoM growth query returns `NULL` for all `pct_change` values except the first. Why?

```sql
WITH monthly AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount) AS revenue
    FROM orders
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT
    month,
    revenue,
    ROUND((revenue - LAG(revenue) OVER (ORDER BY month))
        / LAG(revenue) OVER (ORDER BY month) * 100, 2) AS pct_change
FROM monthly;
```

## Performance

31. This daily report takes 12 seconds on a table with 50 million rows. The table has no indexes. What index should you create?

32. Explain why this query is non-sargable and how to rewrite it.

```sql
SELECT
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*)
FROM orders
WHERE EXTRACT(YEAR FROM order_date) = 2025
  AND EXTRACT(MONTH FROM order_date) BETWEEN 1 AND 6
GROUP BY DATE_TRUNC('month', order_date);
```

33. You have a table with 200 million rows partitioned by month. A query scans all partitions instead of just January 2025. What could cause this?

34. You need to build a daily report from a table that joins `orders` (10M rows) with `order_items` (50M rows). The report shows order count and revenue per day. The query is slow. What approach would you take?
