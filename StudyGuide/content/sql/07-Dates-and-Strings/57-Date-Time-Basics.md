# 57 — Date & Time Basics

> **What it is:** The foundational layer for storing, retrieving, comparing, and
> performing arithmetic on temporal data — calendar dates, wall-clock times, and
> the exact moment an event occurred.

---

## Table of Contents

1. [Why Date & Time Matter](#1-why-date--time-matter)
2. [Core Data Types](#2-core-data-types)
3. [Literals & Formats](#3-literals--formats)
4. [Current Date & Time Functions](#4-current-date--time-functions)
5. [Extracting Components](#5-extracting-components)
6. [Date Arithmetic](#6-date-arithmetic)
7. [Formatting & Parsing](#7-formatting--parsing)
8. [Truncating & Rounding Dates](#8-truncating--rounding-dates)
9. [Interval & Duration](#9-interval--duration)
10. [Epoch / Unix Timestamp](#10-epoch--unix-timestamp)
11. [Time Zones](#11-time-zones)
12. [Timestamp Boundaries & Exclusive Ranges](#12-timestamp-boundaries--exclusive-ranges)
13. [NULL Behavior](#13-null-behavior)
14. [Common Mistakes & Production Pitfalls](#14-common-mistakes--production-pitfalls)
15. [Comparison Table — Databases at a Glance](#15-comparison-table--databases-at-a-glance)
16. [Performance Implications](#16-performance-implications)
17. [Interview Questions](#17-interview-questions)

---

## 1. Why Date & Time Matter

Almost every production table contains at least one temporal column:

| Table          | Temporal columns                           | Grain                        |
| -------------- | ------------------------------------------ | ---------------------------- |
| `orders`       | `order_date`, `shipped_date`, `created_at` | One row = one order          |
| `events`       | `event_timestamp`                          | One row = one event per user |
| `logins`       | `login_at`, `logout_at`                    | One row = one login session  |
| `transactions` | `transaction_date`, `settled_date`         | One row = one transaction    |

**Getting dates wrong is one of the most common sources of bugs in analytics
and application code.** A single off-by-one day or a timezone mistake can
silently corrupt every report.

---

## 2. Core Data Types

| Type                                       | Stores                            | Precision         | Typical use               |
| ------------------------------------------ | --------------------------------- | ----------------- | ------------------------- |
| `DATE`                                     | Calendar date                     | Day               | Birth date, order date    |
| `TIME`                                     | Time of day                       | Fractional second | Store hours, shift start  |
| `TIMESTAMP` / `DATETIME`                   | Date + time (no timezone)         | Fractional second | Created-at, event time    |
| `TIMESTAMPTZ` / `TIMESTAMP WITH TIME ZONE` | Date + time **+ timezone offset** | Fractional second | Global events, audit logs |
| `INTERVAL`                                 | Duration                          | Varies            | "3 months 2 days"         |

> **PostgreSQL** has `TIMESTAMPTZ`, `TIMESTAMP WITHOUT TIME ZONE`, `DATE`,
> `TIME`, and a powerful `INTERVAL` type.
>
> **MySQL** uses `DATETIME` (no tz) and `TIMESTAMP` (stored as UTC, displayed
> in session timezone). No native `INTERVAL` type for storage — use
> `DATE_ADD`/`DATE_SUB` instead.
>
> **SQL Server** has `DATE`, `TIME`, `DATETIME`, `DATETIME2`, `SMALLDATETIME`,
> `DATETIMEOFFSET`. No `INTERVAL` type.
>
> **Oracle** has `DATE` (date + time to the second), `TIMESTAMP`, and
> `INTERVAL YEAR TO MONTH` / `INTERVAL DAY TO SECOND`.

> **Production pitfall:** `DATETIME` vs `TIMESTAMP` in MySQL is not just a
> naming difference. `DATETIME` stores the literal value. `TIMESTAMP` stores UTC
> and converts on read based on the session timezone. Mixing them in the same
> table leads to confusing bugs.

---

## 3. Literals & Formats

### ANSI SQL Literal

```sql
-- Unambiguous: always works
DATE '2026-09-15'
TIME '14:30:00'
TIMESTAMP '2026-09-15 14:30:00'
```

### String-to-Date Conversions (Database-Specific)

```sql
-- PostgreSQL
SELECT DATE '2026-09-15';
SELECT '2026-09-15'::date;
SELECT TO_DATE('15/09/2026', 'DD/MM/YYYY');

-- MySQL
SELECT CAST('2026-09-15' AS DATE);
SELECT STR_TO_DATE('15/09/2026', '%d/%m/%Y');

-- SQL Server
SELECT CAST('2026-09-15' AS DATE);
SELECT CONVERT(DATE, '15/09/2026', 103);

-- Oracle
SELECT TO_DATE('15/09/2026', 'DD/MM/YYYY') FROM DUAL;
```

> **Interview trap:** Implicit string-to-date conversion depends on
> `datestyle` / `NLS_DATE_FORMAT` session settings. A query that works on your
> laptop may fail or produce wrong results on a different server.

**Always use explicit formats in production code.**

---

## 4. Current Date & Time Functions

| Function          | Returns     | PostgreSQL                    | MySQL                         | SQL Server                    | Oracle                            |
| ----------------- | ----------- | ----------------------------- | ----------------------------- | ----------------------------- | --------------------------------- |
| Current date      | `DATE`      | `CURRENT_DATE`                | `CURDATE()`                   | `CAST(GETDATE() AS DATE)`     | `TRUNC(SYSDATE)`                  |
| Current time      | `TIME`      | `CURRENT_TIME`                | `CURTIME()`                   | `CAST(GETDATE() AS TIME)`     | `SYSDATE - TRUNC(SYSDATE)`        |
| Current timestamp | `TIMESTAMP` | `NOW()` / `CURRENT_TIMESTAMP` | `NOW()` / `CURRENT_TIMESTAMP` | `GETDATE()` / `SYSDATETIME()` | `SYSTIMESTAMP`                    |
| Current UTC       | `TIMESTAMP` | `(NOW() AT TIME ZONE 'UTC')`  | `UTC_TIMESTAMP()`             | `GETUTCDATE()`                | `(SYS_EXTRACT_UTC(SYSTIMESTAMP))` |

```sql
-- Get the current timestamp
SELECT NOW();                         -- PostgreSQL, MySQL
SELECT GETDATE();                     -- SQL Server
SELECT SYSTIMESTAMP FROM DUAL;        -- Oracle
```

> **PostgreSQL note:** `NOW()` and `CURRENT_TIMESTAMP` are equivalent. Both
> return the time at the start of the current transaction (stable within the
> transaction). `CLOCK_TIMESTAMP()` returns the actual wall-clock time and
> changes within a transaction.

> **MySQL note:** `NOW()` returns a constant for the duration of a statement
> (same value for every row in a multi-row `INSERT`). `CURRENT_TIMESTAMP()` is
> a synonym.

---

## 5. Extracting Components

```sql
SELECT
    EXTRACT(YEAR       FROM TIMESTAMP '2026-09-15 14:30:00') AS yr,   -- 2026
    EXTRACT(MONTH      FROM TIMESTAMP '2026-09-15 14:30:00') AS mo,   -- 9
    EXTRACT(DAY        FROM TIMESTAMP '2026-09-15 14:30:00') AS dy,   -- 15
    EXTRACT(HOUR       FROM TIMESTAMP '2026-09-15 14:30:00') AS hr,   -- 14
    EXTRACT(MINUTE     FROM TIMESTAMP '2026-09-15 14:30:00') AS mi,   -- 30
    EXTRACT(SECOND     FROM TIMESTAMP '2026-09-15 14:30:00') AS sc,   -- 0
    EXTRACT(DOW        FROM TIMESTAMP '2026-09-15 14:30:00') AS dow,  -- 2 (Mon in PG)
    EXTRACT(ISODOW     FROM TIMESTAMP '2026-09-15 14:30:00') AS isodow,-- 1 (ISO Mon)
    EXTRACT(EPOCH      FROM TIMESTAMP '2026-09-15 14:30:00') AS epoch; -- 1757945400
```

> **MySQL** does not support `EXTRACT(DOW FROM ...)`. Use
> `DAYOFWEEK('2026-09-15')` (1 = Sun) or `WEEKDAY('2026-09-15')` (0 = Mon).

> **SQL Server** uses `DATEPART(unit, date)` instead:
> `DATEPART(YEAR, '2026-09-15')`, `DATEPART(WEEKDAY, '2026-09-15')`.

> **Oracle** uses `EXTRACT(YEAR FROM date)` and also
> `TO_CHAR(date, 'YYYY')`, `TO_CHAR(date, 'DAY')`, etc.

### Day-of-Week Gotcha

| Database                            | Monday                     | Sunday |
| ----------------------------------- | -------------------------- | ------ |
| PostgreSQL `EXTRACT(DOW ...)`       | 1                          | 0      |
| PostgreSQL `EXTRACT(ISODOW ...)`    | 1                          | 7      |
| MySQL `DAYOFWEEK()`                 | 2                          | 1      |
| MySQL `WEEKDAY()`                   | 0                          | 6      |
| SQL Server `DATEPART(WEEKDAY, ...)` | depends on `SET DATEFIRST` | —      |

> **Production pitfall:** DOW numbering differs across databases. If your
> business logic says "weekends = Saturday and Sunday", do not hardcode
> `DOW IN (0, 6)`. Use named constants or a `dates` dimension table.

---

## 6. Date Arithmetic

### PostgreSQL — using `INTERVAL`

```sql
-- Add 7 days
SELECT DATE '2026-09-15' + INTERVAL '7 days';          -- 2026-09-22

-- Subtract 3 months
SELECT DATE '2026-09-15' - INTERVAL '3 months';        -- 2026-06-15

-- Difference between two dates (returns INTERVAL)
SELECT DATE '2026-09-15' - DATE '2026-01-01';          -- 257 days
SELECT (DATE '2026-09-15' - DATE '2026-01-01');        -- 257

-- Difference in specific units
SELECT EXTRACT(DAY FROM (TIMESTAMP '2026-09-15' - TIMESTAMP '2026-01-01'));
```

### MySQL — using `DATE_ADD` / `DATE_SUB`

```sql
SELECT DATE_ADD('2026-09-15', INTERVAL 7 DAY);           -- 2026-09-22
SELECT DATE_SUB('2026-09-15', INTERVAL 3 MONTH);          -- 2026-06-15
SELECT DATEDIFF('2026-09-15', '2026-01-01');              -- 257
```

> **MySQL gotcha:** `DATEDIFF(a, b)` returns `a - b` in **days** only. There
> is no `TIMEDIFF` equivalent for months or years.

### SQL Server — using `DATEADD` / `DATEDIFF`

```sql
SELECT DATEADD(DAY, 7, '2026-09-15');                    -- 2026-09-22
SELECT DATEDIFF(DAY, '2026-01-01', '2026-09-15');        -- 257
SELECT DATEDIFF(MONTH, '2026-01-15', '2026-09-15');      -- 8
```

> **SQL Server gotcha:** `DATEDIFF(MONTH, '2026-01-31', '2026-02-01')`
> returns **1**, not 0, because the month boundaries are crossed. It counts
> _boundary crossings_, not full months elapsed.

### Oracle

```sql
SELECT DATE '2026-09-15' + 7 FROM DUAL;                  -- 2026-09-22
SELECT DATE '2026-09-15' - DATE '2026-01-01' FROM DUAL;   -- 257 (number of days)
SELECT ADD_MONTHS(DATE '2026-09-15', -3) FROM DUAL;       -- 2026-06-15
```

### Summary Table

| Operation         | PostgreSQL                   | MySQL                              | SQL Server                    | Oracle                 |
| ----------------- | ---------------------------- | ---------------------------------- | ----------------------------- | ---------------------- |
| Add 7 days        | `date + INTERVAL '7 days'`   | `DATE_ADD(date, INTERVAL 7 DAY)`   | `DATEADD(DAY, 7, date)`       | `date + 7`             |
| Subtract 3 months | `date - INTERVAL '3 months'` | `DATE_SUB(date, INTERVAL 3 MONTH)` | `DATEADD(MONTH, -3, date)`    | `ADD_MONTHS(date, -3)` |
| Diff in days      | `date2 - date1`              | `DATEDIFF(date2, date1)`           | `DATEDIFF(DAY, date1, date2)` | `date2 - date1`        |

> **Interview trap:** `DATEADD` / `DATEDIFF` in SQL Server always use integer
> units. `DATEDIFF(YEAR, '2025-12-31', '2026-01-01')` returns **1**, even
> though only one day elapsed.

---

## 7. Formatting & Parsing

### PostgreSQL — `TO_CHAR`

```sql
SELECT TO_CHAR(TIMESTAMP '2026-09-15 14:30:00', 'YYYY-MM-DD HH24:MI:SS');
-- 2026-09-15 14:30:00

SELECT TO_CHAR(TIMESTAMP '2026-09-15 14:30:00', 'FMDay, DDth Month YYYY');
-- Tuesday, 15th September 2026
```

### MySQL — `DATE_FORMAT`

```sql
SELECT DATE_FORMAT('2026-09-15 14:30:00', '%Y-%m-%d %H:%i:%s');
-- 2026-09-15 14:30:00

SELECT DATE_FORMAT('2026-09-15', '%W, %D %M %Y');
-- Tuesday, 15th September 2026
```

### SQL Server — `FORMAT` / `CONVERT`

```sql
SELECT FORMAT(CAST('2026-09-15 14:30:00' AS DATETIME2),
              'yyyy-MM-dd HH:mm:ss');
-- 2026-09-15 14:30:00

-- Faster .NET-style format strings
SELECT CONVERT(VARCHAR, CAST('2026-09-15' AS DATE), 121);  -- 2026-09-15
```

> **Production pitfall:** `FORMAT()` in SQL Server uses CLR and is
> **significantly slower** than `CONVERT` for large result sets. Avoid it in
> hot paths or loop queries.

### Oracle — `TO_CHAR`

```sql
SELECT TO_CHAR(DATE '2026-09-15', 'YYYY-MM-DD') FROM DUAL;
-- 2026-09-15
```

> **Interview trap:** Formatting a date for display is a **presentation
> concern**. In production, prefer storing and returning raw `DATE`/`TIMESTAMP`
> types and format in the application layer.

---

## 8. Truncating & Rounding Dates

"Truncating" a date means snapping it to the start of a coarser unit.

### PostgreSQL

```sql
SELECT DATE_TRUNC('month',   DATE '2026-09-15');          -- 2026-09-01
SELECT DATE_TRUNC('quarter', DATE '2026-09-15');          -- 2026-07-01
SELECT DATE_TRUNC('year',    DATE '2026-09-15');          -- 2026-01-01
SELECT DATE_TRUNC('week',    DATE '2026-09-15');          -- 2026-09-14 (Monday)
SELECT DATE_TRUNC('day',     TIMESTAMP '2026-09-15 14:30:00'); -- 2026-09-15 00:00:00
```

### MySQL

```sql
SELECT DATE_FORMAT('2026-09-15', '%Y-%m-01');              -- 2026-09-01
SELECT DATE_FORMAT('2026-09-15', '%Y-01-01');              -- 2026-01-01
SELECT DATE_FORMAT('2026-09-15 14:30:00', '%Y-%m-%d');    -- 2026-09-15
-- MySQL has no DATE_TRUNC — you must simulate it
```

### SQL Server

```sql
SELECT DATEFROMPARTS(YEAR('2026-09-15'), MONTH('2026-09-15'), 1);  -- 2026-09-01
SELECT DATEADD(QUARTER, DATEDIFF(QUARTER, 0, '2026-09-15'), 0);   -- 2026-07-01
```

### Oracle

```sql
SELECT TRUNC(DATE '2026-09-15', 'MM')   FROM DUAL;   -- 2026-09-01
SELECT TRUNC(DATE '2026-09-15', 'Q')    FROM DUAL;   -- 2026-07-01
SELECT TRUNC(DATE '2026-09-15', 'YEAR') FROM DUAL;   -- 2026-01-01
```

> **Why it matters:** Monthly revenue reports, cohort analysis, and fiscal
> period grouping all depend on date truncation.

```sql
-- Monthly revenue report (PostgreSQL)
SELECT
    DATE_TRUNC('month', order_date)  AS month,
    COUNT(*)                         AS num_orders,
    SUM(amount)                      AS total_revenue
FROM orders
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month;
```

---

## 9. Interval & Duration

### PostgreSQL — Native `INTERVAL`

```sql
-- Adding intervals
SELECT TIMESTAMP '2026-09-15 14:00:00' + INTERVAL '2 hours 30 minutes';
-- 2026-09-15 16:30:00

-- Interval arithmetic
SELECT INTERVAL '1 year 2 months 3 days' + INTERVAL '4 months';
-- 1 year 6 months 3 days

-- Casting a duration to interval
SELECT age(TIMESTAMP '2026-09-15', TIMESTAMP '1990-05-20');
-- 36 years 3 months 26 days
```

### MySQL

```sql
SELECT TIMESTAMPDIFF(HOUR,   '2026-09-15 14:00', '2026-09-15 16:30');   -- 2
SELECT TIMESTAMPDIFF(MINUTE, '2026-09-15 14:00', '2026-09-15 16:30');   -- 150
SELECT TIMESTAMPDIFF(DAY,    '2026-01-01',      '2026-09-15');          -- 257
```

### SQL Server

```sql
SELECT DATEDIFF(HOUR, '2026-09-15 14:00', '2026-09-15 16:30');   -- 2
SELECT DATEDIFF(MINUTE, '2026-09-15 14:00', '2026-09-15 16:30'); -- 150
```

> **Interview trap:** These functions return the difference in _whole_ units,
> not fractional. `DATEDIFF(HOUR, '14:00', '14:30')` returns **0**, not 0.5.
> Use `DATEDIFF(MINUTE, ...)` and divide, or use `DATEDIFF_BIG(SECOND, ...) / 3600.0`.

---

## 10. Epoch / Unix Timestamp

The Unix epoch is **1970-01-01 00:00:00 UTC**. Every point in time can be
represented as the number of seconds (or milliseconds) since then.

```sql
-- PostgreSQL: epoch → timestamp and back
SELECT TO_TIMESTAMP(1757945400);                              -- 2026-09-15 14:30:00 UTC
SELECT EXTRACT(EPOCH FROM TIMESTAMP '2026-09-15 14:30:00');   -- 1757945400

-- MySQL
SELECT FROM_UNIXTIME(1757945400);                             -- 2026-09-15 14:30:00
SELECT UNIX_TIMESTAMP('2026-09-15 14:30:00');                 -- 1757945400

-- SQL Server
SELECT DATEADD(SECOND, 1757945400, '1970-01-01');             -- 2026-09-15 14:30:00
-- (or use AT TIME ZONE in SQL Server 2016+)

-- Oracle
SELECT TO_DATE('1970-01-01', 'YYYY-MM-DD') +
       NUMTODSINTERVAL(1757945400, 'SECOND') FROM DUAL;
```

> **Production pitfall:** Some APIs send epoch in **milliseconds**, not seconds.
> Always verify: `UNIX_TIMESTAMP / 1000` if the value looks 1000× too large.

> **Interview trap:** `FROM_UNIXTIME` in MySQL returns a value in the session
> timezone. A value that looks correct in one timezone may be wrong in another.

---

## 11. Time Zones

Time zones are the single most dangerous area of date/time handling in SQL.

### The Core Problem

```
Event occurs:  2026-09-15 14:30:00 UTC
Stored as:     2026-09-15 14:30:00 (no timezone)
User in India:  sees 14:30 — thinks it happened at 2:30 PM IST (wrong, it's 8 PM IST)
User in US:     sees 14:30 — thinks it happened at 2:30 PM EST (wrong, it's 10:30 AM EST)
```

### Best Practice: Store Everything in UTC

```sql
-- PostgreSQL: convert to UTC at insert time
INSERT INTO events (event_timestamp)
VALUES (NOW() AT TIME ZONE 'Asia/Kolkata' AT TIME ZONE 'UTC');

-- Convert stored UTC to a user's timezone for display
SELECT event_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York'
FROM events;
```

### Database-Specific Behavior

| Database   | `TIMESTAMP` stores tz?         | `TIMESTAMPTZ` available?      | Session tz affects display?                         |
| ---------- | ------------------------------ | ----------------------------- | --------------------------------------------------- |
| PostgreSQL | No                             | Yes                           | Yes — `SET timezone = '...'`                        |
| MySQL      | No (`DATETIME` never converts) | No (but `TIMESTAMP` converts) | `TIMESTAMP` values convert, `DATETIME` values don't |
| SQL Server | No                             | `DATETIMEOFFSET` available    | Yes — `AT TIME ZONE`                                |
| Oracle     | No                             | Yes                           | Yes — `ALTER SESSION SET TIME_ZONE`                 |

> **Production pitfall — MySQL:** If you store a `TIMESTAMP` column, MySQL
> stores it in UTC internally. When you read it back, MySQL converts it to the
> session timezone. If your application server and your database have different
> session timezones, the same row returns different values depending on which
> server runs the query.

> **Interview trap:** `CURRENT_TIMESTAMP` in PostgreSQL includes timezone
> information (it is equivalent to `TIMESTAMPTZ`). A bare `TIMESTAMP '...'`
> literal does **not** have timezone information.

---

## 12. Timestamp Boundaries & Exclusive Ranges

This is one of the most common bug categories in production SQL.

### The Problem: Inclusive vs Exclusive Boundaries

Suppose you want all orders from September 2026:

```sql
-- BAD APPROACH — misses the entire last day
WHERE order_date BETWEEN '2026-09-01' AND '2026-09-30'

-- Why? BETWEEN is inclusive on both ends.
-- This includes Sept 30 at midnight (00:00:00)
-- but NOT Sept 30 at 23:59:59.
```

```sql
-- BETTER APPROACH for DATE type (no time component)
WHERE order_date >= '2026-09-01'
  AND order_date <  '2026-10-01'    -- exclusive upper bound

-- BETTER APPROACH for TIMESTAMP type
WHERE created_at >= '2026-09-01'
  AND created_at <  '2026-10-01'    -- any time on Sept 30 is < Oct 1
```

```sql
-- ALTERNATIVE: truncate the timestamp
WHERE DATE_TRUNC('day', created_at) >= '2026-09-01'
  AND DATE_TRUNC('day', created_at) <  '2026-10-01'
-- ⚠️ This works but is NOT sargable — see Performance section
```

### Why This Matters

| Approach                                | September data captured?      | Timestamp precision? |
| --------------------------------------- | ----------------------------- | -------------------- |
| `BETWEEN '2026-09-01' AND '2026-09-30'` | Misses Sept 30 after midnight | No                   |
| `>= '2026-09-01' AND < '2026-10-01'`    | All of September captured     | Yes                  |
| `DATE_TRUNC` on column                  | Works but kills index usage   | Truncated to day     |

> **Production pitfall:** The "midnight boundary" problem is the #1 cause of
> missing data in daily/monthly reports. Always use **>= start AND < next_start**.

```sql
-- CORRECT monthly report (PostgreSQL)
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*)                        AS total
FROM orders
WHERE created_at >= DATE '2026-01-01'
  AND created_at <  DATE '2027-01-01'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

---

## 13. NULL Behavior

Date functions propagate NULL in the standard way:

```sql
SELECT
    NULL + INTERVAL '7 days',             -- NULL
    DATE_TRUNC('month', NULL),            -- NULL
    EXTRACT(YEAR FROM NULL),              -- NULL
    COALESCE(NULL, DATE '2026-01-01'),    -- 2026-01-01
    NULLIF(DATE '2026-09-15', DATE '2026-09-15'),  -- NULL
    AGE(NULL, DATE '1990-01-01'),         -- NULL
    AGE(DATE '2026-09-15', NULL);         -- NULL
```

### COALESCE for Safe Defaults

```sql
-- Use COALESCE when an optional date might be NULL
SELECT
    order_id,
    COALESCE(shipped_date, CURRENT_DATE) AS effective_date
FROM orders;
```

### NULL in Comparisons

```sql
-- This returns no rows if created_at is NULL
SELECT * FROM orders WHERE created_at > '2026-01-01';

-- To include NULLs
SELECT * FROM orders
WHERE created_at > '2026-01-01' OR created_at IS NULL;
```

> **See also:** Section on NULL and Three-Valued Logic for the full treatment
> of NULL behavior in predicates.

---

## 14. Common Mistakes & Production Pitfalls

### Mistake 1 — Treating Dates as Strings

```sql
-- BAD: sorting dates as strings
SELECT * FROM orders ORDER BY created_at::text;
-- "2026-09-09" sorts AFTER "2026-09-100" — no, but you get the idea
-- "2026-9-1" sorts AFTER "2026-10-1" in lexicographic order

-- GOOD: use native date types
SELECT * FROM orders ORDER BY created_at;
```

### Mistake 2 — Using Functions on Indexed Columns

```sql
-- BAD: function on column prevents index usage (not sargable)
SELECT * FROM orders
WHERE EXTRACT(YEAR FROM created_at) = 2026;

-- GOOD: range scan is sargable
SELECT * FROM orders
WHERE created_at >= '2026-01-01'
  AND created_at <  '2027-01-01';
```

### Mistake 3 — Forgetting Timezone Conversion

```sql
-- BAD: comparing UTC timestamp with local date
SELECT * FROM events
WHERE event_timestamp = '2026-09-15';
-- Returns nothing if event_timestamp has timezone info

-- GOOD: compare in the same timezone
SELECT * FROM events
WHERE event_timestamp AT TIME ZONE 'UTC' = '2026-09-15'::date;
```

### Mistake 4 — Integer Math for Dates

```sql
-- BAD: doing date math with integers
SELECT DATE '2026-09-15' + 1;        -- PostgreSQL: works (adds 1 day)
-- But in MySQL:
SELECT '2026-09-15' + 1;              -- Returns 2027 (numeric addition!)
```

### Mistake 5 — Assuming Month-End Arithmetic

```sql
-- BAD: adding 1 month naively
SELECT DATE '2026-01-31' + INTERVAL '1 month';
-- PostgreSQL: 2026-02-28 (clips to month end)
-- MySQL: DATE_ADD('2026-01-31', INTERVAL 1 MONTH) → 2026-02-28

-- Also: DATE '2026-03-31' - INTERVAL '1 month'
-- PostgreSQL: 2026-02-28 (not Feb 31 — impossible)
```

### Mistake 6 — Midnight Assumptions

```sql
-- BAD: assuming order_date is at midnight
SELECT * FROM orders WHERE order_date = CURRENT_DATE;
-- If order_date is TIMESTAMP, this misses all orders after midnight today

-- GOOD: use range
SELECT * FROM orders
WHERE order_date >= CURRENT_DATE
  AND order_date <  CURRENT_DATE + INTERVAL '1 day';
```

> **Production pitfall:** In log tables, events table, or any high-frequency
> data, never assume timestamp precision. A `DATE` column truncates the time.
> A `TIMESTAMP` column preserves it. Mixing them in joins causes silent data
> loss.

---

## 15. Comparison Table — Databases at a Glance

| Feature             | PostgreSQL                 | MySQL                    | SQL Server                 | Oracle                      |
| ------------------- | -------------------------- | ------------------------ | -------------------------- | --------------------------- |
| Date type           | `DATE` (date only)         | `DATE` (date + time)     | `DATE` (date only)         | `DATE` (date + time)        |
| Timestamp with tz   | `TIMESTAMPTZ`              | No native type           | `DATETIMEOFFSET`           | `TIMESTAMP WITH TIME ZONE`  |
| Date + time (no tz) | `TIMESTAMP`                | `DATETIME`               | `DATETIME2`                | `TIMESTAMP`                 |
| Native interval     | Yes                        | No                       | No                         | Yes (limited)               |
| Truncate to month   | `DATE_TRUNC('month', ...)` | Manual via `DATE_FORMAT` | Manual via `DATEFROMPARTS` | `TRUNC(date, 'MM')`         |
| Extract epoch       | `EXTRACT(EPOCH ...)`       | `UNIX_TIMESTAMP()`       | Manual `DATEDIFF`          | Manual                      |
| Add interval        | `+ INTERVAL`               | `DATE_ADD()`             | `DATEADD()`                | `+ number` / `ADD_MONTHS()` |
| Format              | `TO_CHAR()`                | `DATE_FORMAT()`          | `FORMAT()` / `CONVERT()`   | `TO_CHAR()`                 |
| ISO week number     | `EXTRACT(WEEK ...)`        | `WEEK()`                 | `DATEPART(WEEK, ...)`      | `TO_CHAR(date, 'IW')`       |

---

## 16. Performance Implications

### Sargability

A predicate is **sargable** (Search ARGument ABLE) if the optimizer can use
an index to satisfy it.

```sql
-- SARGable: index on created_at can be used
WHERE created_at >= '2026-09-01' AND created_at < '2026-10-01'

-- NOT sargable: function wraps the column, index cannot be used
WHERE DATE_TRUNC('month', created_at) = '2026-09-01'

-- NOT sargable: implicit conversion / function on column
WHERE EXTRACT(YEAR FROM created_at) = 2026

-- NOT sargable: comparison with non-matching type
WHERE CAST(created_at AS DATE) = '2026-09-15'
```

> Always verify using `EXPLAIN` (PostgreSQL), `EXPLAIN ANALYZE`, `EXPLAIN
FORMAT=JSON` (MySQL), or `SET STATISTICS IO ON` / execution plan (SQL
> Server) to confirm index usage.

### Date Range Scans

```sql
-- Create an index to accelerate range queries on created_at
CREATE INDEX idx_orders_created ON orders (created_at);

-- Now this query can do an index range scan
SELECT * FROM orders
WHERE created_at >= '2026-09-01'
  AND created_at <  '2026-10-01';
```

### Implicit Conversion Pitfall

```sql
-- PostgreSQL: comparing DATE column with a TIMESTAMP literal
-- forces the optimizer to evaluate a cast on every row
SELECT * FROM orders WHERE order_date = TIMESTAMP '2026-09-15 00:00:00';
-- May prevent index usage depending on the plan

-- Better: match the types
SELECT * FROM orders WHERE order_date = DATE '2026-09-15';
```

### Partitioning by Date

For very large tables, **range partitioning** on a date column is one of the
most effective optimization strategies:

```sql
-- PostgreSQL example
CREATE TABLE orders (
    id         BIGINT,
    created_at TIMESTAMPTZ,
    amount     NUMERIC
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2026_09 PARTITION OF orders
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```

Queries filtering by `created_at` automatically skip irrelevant partitions
(**partition pruning**).

---

## 17. Interview Questions

### Beginner

1. What is the difference between `DATE`, `DATETIME`, and `TIMESTAMP`?
2. How do you get the current date in PostgreSQL, MySQL, and SQL Server?
3. How do you extract the year from a date?
4. What does `DATE_TRUNC('month', '2026-09-15')` return?
5. How many days are between '2026-01-01' and '2026-09-15'?

### Intermediate

6. Write a query to get all orders from September 2026 where `order_date` is a
   `TIMESTAMP` column. What is the correct approach and why?
7. Explain the difference between `EXTRACT(DOW ...)` and
   `EXTRACT(ISODOW ...)` in PostgreSQL.
8. What happens when you add `INTERVAL '1 month'` to '2026-01-31'?
9. Why is `WHERE EXTRACT(YEAR FROM created_at) = 2026` potentially slow?
10. How would you compute monthly revenue for 2026 from an `orders` table?

### Advanced

11. A table has a `TIMESTAMPTZ` column. A user in New York and a user in
    Tokyo run the same query without timezone conversion. Will they get
    different results? Explain.
12. Why does `DATEDIFF(MONTH, '2026-01-31', '2026-02-01')` return 1 in SQL
    Server, and why is this dangerous?
13. Design a `dates` dimension table for a data warehouse. What columns would
    you include?
14. Explain why `BETWEEN '2026-09-01' AND '2026-09-30'` misses data when
    `order_date` is a `TIMESTAMP` column.
15. How would you handle daylight saving time transitions in a scheduler
    table?

### Scenario Based

16. You need to generate a row for every day in September 2026, even if there
    are no orders on some days. Write the query (any database).
17. An API sends timestamps as epoch milliseconds. The value is
    `1757945400000`. Convert it to a readable date in PostgreSQL.
18. You have login records with `login_at` and `logout_at` (both
    `TIMESTAMPTZ`). Find users whose sessions overlapped midnight UTC.
19. Build a "rolling 7-day active users" metric from an `events` table.
20. A report filter uses `WHERE event_date = '2026-09-15'` but returns no
    rows, even though data exists for that day. Debug.

### Tricky

21. What does `SELECT DATE '2026-09-15' - DATE '2026-01-01'` return in
    PostgreSQL? What does the equivalent expression do in MySQL?
22. In MySQL, what is the difference between `NOW()` and `CURRENT_TIMESTAMP`?
23. Why does `SELECT CAST('2026-02-29' AS DATE)` fail in some databases?
24. What is the maximum value of a `DATETIME2` in SQL Server?
25. If `DATE '2026-09-15' + INTERVAL '1 month'` yields '2026-10-15', does
    `DATE '2026-10-15' - INTERVAL '1 month'` always yield '2026-09-15'?

### Output Prediction

26. What does this return in PostgreSQL?
    ```sql
    SELECT EXTRACT(DOW FROM DATE '2026-09-15');
    ```
27. What does this return in SQL Server?
    ```sql
    SELECT DATEDIFF(YEAR, '2025-12-31', '2026-01-01');
    ```
28. What does this return in MySQL?
    ```sql
    SELECT DATE_FORMAT('2026-09-15 14:30:00', '%W');
    ```
29. What does this return in PostgreSQL?
    ```sql
    SELECT DATE_TRUNC('week', DATE '2026-09-15');
    ```
30. What does this return in Oracle?
    ```sql
    SELECT ADD_MONTHS(DATE '2026-01-31', 1) FROM DUAL;
    ```

### Debugging

31. This query returns zero rows but you know data exists:
    ```sql
    SELECT * FROM orders WHERE created_at = '2026-09-15';
    ```
    `created_at` is `TIMESTAMPTZ`. What went wrong?
32. This monthly report shows double the expected revenue:
    ```sql
    SELECT DATE_TRUNC('month', o.order_date), SUM(p.amount)
    FROM orders o
    JOIN payments p ON p.order_id = o.order_id
    GROUP BY 1;
    ```
    What is the likely cause?
33. A scheduled job ran at midnight but logs show it processed records from
    the previous day. Why?
34. `SELECT * FROM users WHERE born_date < '2000-01-01'` returns users born
    in 2001. Explain.
35. A query uses `WHERE DATE(created_at) = '2026-09-15'` and is reported as
    slow. Rewrite it.

### Performance

36. You have a table with 50 million rows and an index on `created_at`. This
    query is slow:
    ```sql
    SELECT * FROM events
    WHERE DATE_TRUNC('month', created_at) = '2026-09-01';
    ```
    Rewrite the query to be sargable.
37. You need to run a date range query across a 2-billion-row table. What
    strategies beyond indexing could help?
38. Compare the performance of `DATE_FORMAT(col, '%Y-%m') = '2026-09'` vs
    `col >= '2026-09-01' AND col < '2026-10-01'` in MySQL. How would you
    verify using `EXPLAIN`?
39. Why can `FORMAT()` in SQL Server be a performance problem in报表 queries?
40. You are designing a partitioned table strategy for an events table that
    grows by 10 million rows per day. What partition strategy would you use
    and why?
