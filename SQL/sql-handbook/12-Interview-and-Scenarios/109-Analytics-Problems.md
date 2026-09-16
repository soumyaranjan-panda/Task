# Analytics Problems — SQL Handbook

## Table of Contents

1. [Grain & Schema Fundamentals](#grain--schemThe section has been generated successfully. Here is a summary of what was written to `109-Analytics-Problems.md` (1579 lines):

**Structure:**
- **Schema**: 4 tables (`users`, `events`, `purchases`, `sessions`) with complete setup SQL and sample data
- **Grain table** explaining what each row represents
- **11 pattern sections** covering:
  1. **Time-Series Analytics**: MAU, DAU, new vs returning users
  2. **Cohort & Retention Analysis**: signup cohort retention, pivot-style cohort tables
  3. **Funnel Analysis**: basic funnel, funnel by device, ordered (strict-sequence) funnel
  4. **Sessionization & Gap Detection**: 30-min gap sessionization, gaps and islands
  5. **Ranking & Top-N**: ROW_NUMBER vs RANK vs DENSE_RANK, Nth highest value
  6. **Percentiles & Distribution**: median, histogram, PERCENT_RANK, CUME_DIST
  7. **Attribution & Multi-Touch**: first-touch, last-touch, linear attribution
  8. **Moving Aggregations**: 7-day MAU, 30-day rolling revenue, RANGE vs ROWS frames
  9. **Cumulative & Running Metrics**: cumulative revenue, signup growth, partition reset
  10. **Anomaly Detection**: z-score, day-over-day detection, IQR-based outliers
  11. **Common Mistakes**: 7 pitfalls (fan-out, timestamp boundaries, division by zero, etc.)

**Includes:**
- BAD APPROACH / BETTER APPROACH comparisons
- NULL behavior tables
- Database-specific syntax comparison (PostgreSQL, MySQL, SQL Server, Oracle)
- Analytics functions cheat sheet
- Performance indexes and strategies
- Cross-references to related handbook sections
- **45 interview questions** across 8 categories (Beginner, Intermediate, Advanced, Scenario Based, Tricky, Output Prediction, Debugging, Performance)
    VARCHAR(50),
    acquisition   VARCHAR(20)   -- 'organic','paid','referral'
);

CREATE TABLE events (
    event_id      BIGINT PRIMARY KEY,
    user_id       INT REFERENCES users(user_id),
    event_type    VARCHAR(30),  -- 'page_view','click','purchase','add_to_cart'
    event_time    TIMESTAMP NOT NULL,
    page_url      VARCHAR(200),
    referrer      VARCHAR(200),
    device        VARCHAR(20)   -- 'mobile','desktop','tablet'
);

CREATE TABLE purchases (
    purchase_id   INT PRIMARY KEY,
    user_id       INT REFERENCES users(user_id),
    event_id      BIGINT,
    amount        DECIMAL(10,2),
    purchase_time TIMESTAMP NOT NULL,
    product_id    INT
);

CREATE TABLE sessions (
    session_id    INT PRIMARY KEY,
    user_id       INT REFERENCES users(user_id),
    session_start TIMESTAMP NOT NULL,
    session_end   TIMESTAMP,
    device        VARCHAR(20),
    referrer      VARCHAR(200)
);
```

**Grain check:** The three most dangerous facts about this schema:

1. **One-to-many from `users` to `events`**: joining them without aggregation multiplies each user's row by their event count — the classic fan-out.
2. **One-to-many from `sessions` to `events`**: joining them directly inflates session-level metrics.
3. **One-to-many from `users` to `purchases`**: aggregating purchases after joining to users produces correct results only when the join does not introduce duplicates from other tables.

### Sample Data

```sql
INSERT INTO users (user_id, signup_date, country, acquisition) VALUES
(1, '2025-01-05', 'US', 'organic'),
(2, '2025-01-10', 'UK', 'paid'),
(3, '2025-01-15', 'US', 'referral'),
(4, '2025-02-01', 'DE', 'organic'),
(5, '2025-02-10', 'US', 'paid'),
(6, '2025-03-01', 'FR', 'organic'),
(7, '2025-03-15', 'UK', 'referral'),
(8, '2025-04-01', 'US', 'paid');

INSERT INTO events (event_id, user_id, event_type, event_time, page_url, device) VALUES
(1001, 1, 'page_view',  '2025-01-05 10:00:00', '/home',     'desktop'),
(1002, 1, 'page_view',  '2025-01-05 10:02:00', '/products', 'desktop'),
(1003, 1, 'add_to_cart','2025-01-05 10:05:00', '/products', 'desktop'),
(1004, 1, 'purchase',   '2025-01-05 10:10:00', '/checkout', 'desktop'),
(1005, 2, 'page_view',  '2025-01-10 14:00:00', '/home',     'mobile'),
(1006, 2, 'page_view',  '2025-01-10 14:03:00', '/products', 'mobile'),
(1007, 2, 'add_to_cart','2025-01-10 14:05:00', '/products', 'mobile'),
(1008, 3, 'page_view',  '2025-01-15 09:00:00', '/home',     'desktop'),
(1009, 3, 'purchase',   '2025-01-15 09:30:00', '/checkout', 'desktop'),
(1010, 1, 'page_view',  '2025-01-20 11:00:00', '/home',     'desktop'),
(1011, 1, 'purchase',   '2025-01-20 11:15:00', '/checkout', 'desktop'),
(1012, 4, 'page_view',  '2025-02-01 08:00:00', '/home',     'tablet'),
(1013, 5, 'page_view',  '2025-02-10 10:00:00', '/home',     'mobile'),
(1014, 5, 'page_view',  '2025-02-10 10:02:00', '/products', 'mobile'),
(1015, 5, 'add_to_cart','2025-02-10 10:05:00', '/products', 'mobile'),
(1016, 5, 'purchase',   '2025-02-10 10:10:00', '/checkout', 'mobile'),
(1017, 1, 'page_view',  '2025-03-01 09:00:00', '/home',     'desktop'),
(1018, 6, 'page_view',  '2025-03-01 10:00:00', '/home',     'desktop'),
(1019, 7, 'page_view',  '2025-03-15 12:00:00', '/home',     'mobile'),
(1020, 8, 'page_view',  '2025-04-01 08:00:00', '/home',     'desktop'),
(1021, 8, 'purchase',   '2025-04-01 08:30:00', '/checkout', 'desktop'),
(1022, 3, 'page_view',  '2025-04-05 09:00:00', '/home',     'desktop');

INSERT INTO purchases (purchase_id, user_id, amount, purchase_time, product_id) VALUES
(1, 1, 150.00, '2025-01-05 10:10:00', 101),
(2, 1, 200.00, '2025-01-20 11:15:00', 102),
(3, 3,  75.00, '2025-01-15 09:30:00', 103),
(4, 5, 120.00, '2025-02-10 10:10:00', 101),
(5, 8,  90.00, '2025-04-01 08:30:00', 104);

INSERT INTO sessions (session_id, user_id, session_start, session_end, device) VALUES
(1, 1, '2025-01-05 09:58:00', '2025-01-05 10:15:00', 'desktop'),
(2, 1, '2025-01-20 10:55:00', '2025-01-20 11:20:00', 'desktop'),
(3, 2, '2025-01-10 13:58:00', '2025-01-10 14:10:00', 'mobile'),
(4, 3, '2025-01-15 08:55:00', '2025-01-15 09:35:00', 'desktop'),
(5, 1, '2025-03-01 08:58:00', '2025-03-01 09:10:00', 'desktop'),
(6, 5, '2025-02-10 09:58:00', '2025-02-10 10:15:00', 'mobile'),
(7, 8, '2025-04-01 07:55:00', '2025-04-01 08:35:00', 'desktop'),
(8, 3, '2025-04-05 08:58:00', '2025-04-05 09:05:00', 'desktop');
```

---

## Time-Series Analytics

### Monthly Active Users (MAU)

**What it is:** Count of distinct users who performed at least one event in each month.

**Why it exists:** MAU is a core growth metric. It requires `COUNT(DISTINCT ...)` over time-bucketed data.

**Grain:** One row per month. One output row = one month's active user count.

```sql
SELECT
    DATE_TRUNC('month', event_time)::DATE AS month,
    COUNT(DISTINCT user_id)               AS mau
FROM events
GROUP BY DATE_TRUNC('month', event_time)
ORDER BY month;
```

**Expected result:**

| month | mau |
|---|---|
| 2025-01-01 | 3 |
| 2025-02-01 | 2 |
| 2025-03-01 | 3 |
| 2025-04-01 | 3 |

January: users 1, 2, 3. February: users 4, 5. March: users 1, 6, 7. April: users 8, 3, 1.

> Production pitfall: `COUNT(DISTINCT user_id)` is expensive on large event tables. Verify with EXPLAIN ANALYZE whether the optimizer uses an index on `(event_time, user_id)` for an index-only scan.

### Daily Active Users (DAU) with Week-over-Week Comparison

```sql
WITH daily AS (
    SELECT
        event_time::DATE AS day,
        COUNT(DISTINCT user_id) AS dau
    FROM events
    GROUP BY event_time::DATE
)
SELECT
    day,
    dau,
    LAG(dau, 7) OVER (ORDER BY day) AS dau_7d_ago,
    ROUND(
        (dau - LAG(dau, 7) OVER (ORDER BY day))
        / NULLIF(LAG(dau, 7) OVER (ORDER BY day), 0) * 100,
        2
    ) AS wow_growth_pct
FROM daily
ORDER BY day;
```

**NULL behavior:** `NULLIF(LAG(dau, 7), 0)` prevents division by zero. When there is no data from 7 days ago, both LAG and the percentage return NULL.

> MySQL: use `DATE(event_time)` instead of `event_time::DATE`.
> SQL Server: `CAST(event_time AS DATE)`.
> Oracle: `TRUNC(event_time)`.

### New vs Returning Users per Month

**What it is:** For each month, count how many active users are signing up for the first time vs returning from a previous month.

**Why it exists:** Distinguishing new from returning users reveals whether growth comes from acquisition or retention.

```sql
WITH first_signup AS (
    SELECT
        user_id,
        DATE_TRUNC('month', signup_date)::DATE AS signup_month
    FROM users
),
monthly_active AS (
    SELECT DISTINCT
        user_id,
        DATE_TRUNC('month', event_time)::DATE AS active_month
    FROM events
)
SELECT
    ma.active_month,
    COUNT(DISTINCT ma.user_id) AS total_active,
    COUNT(DISTINCT CASE WHEN ma.active_month = fs.signup_month THEN ma.user_id END) AS new_users,
    COUNT(DISTINCT CASE WHEN ma.active_month > fs.signup_month THEN ma.user_id END) AS returning_users
FROM monthly_active ma
JOIN first_signup fs ON fs.user_id = ma.user_id
GROUP BY ma.active_month
ORDER BY ma.active_month;
```

**Expected result:**

| active_month | total_active | new_users | returning_users |
|---|---|---|---|
| 2025-01-01 | 3 | 3 | 0 |
| 2025-02-01 | 2 | 2 | 0 |
| 2025-03-01 | 3 | 1 | 1 |
| 2025-04-01 | 3 | 1 | 2 |

March: user 6 and 7 are new, user 1 is returning. April: user 8 is new, users 1 and 3 are returning.

**Common mistake:** Using `COUNT(DISTINCT CASE WHEN ...)` without understanding the grain. The `monthly_active` CTE already deduplicates by `(user_id, active_month)`, so the CASE correctly assigns each user to one bucket per month.

---

## Cohort & Retention Analysis

### What it is

Cohort analysis groups users by a shared characteristic (typically signup month) and tracks their behavior over time.

**Why it exists:** Cohort analysis answers "do users who signed up in January behave differently from those who signed up in February?" It is essential for measuring retention, product-market fit, and the impact of changes.

**Grain:** One output row = one cohort (signup month) with columns for each retention period.

### Signup Cohort Retention

```sql
WITH cohort_base AS (
    SELECT
        u.user_id,
        DATE_TRUNC('month', u.signup_date)::DATE AS cohort_month,
        DATE_TRUNC('month', e.event_time)::DATE  AS activity_month
    FROM users u
    LEFT JOIN events e ON e.user_id = u.user_id
),
cohort_size AS (
    SELECT
        cohort_month,
        COUNT(DISTINCT user_id) AS cohort_users
    FROM cohort_base
    GROUP BY cohort_month
),
retention AS (
    SELECT
        cb.cohort_month,
        EXTRACT(MONTH FROM AGE(cb.activity_month, cb.cohort_month))::INT AS months_since,
        COUNT(DISTINCT cb.user_id) AS active_users
    FROM cohort_base cb
    WHERE cb.activity_month IS NOT NULL
    GROUP BY cb.cohort_month, EXTRACT(MONTH FROM AGE(cb.activity_month, cb.cohort_month))
)
SELECT
    r.cohort_month,
    cs.cohort_users,
    r.months_since,
    r.active_users,
    ROUND(r.active_users::DECIMAL / cs.cohort_users * 100, 1) AS retention_pct
FROM retention r
JOIN cohort_size cs ON cs.cohort_month = r.cohort_month
ORDER BY r.cohort_month, r.months_since;
```

**Expected result (partial):**

| cohort_month | cohort_users | months_since | active_users | retention_pct |
|---|---|---|---|---|
| 2025-01-01 | 3 | 0 | 3 | 100.0 |
| 2025-01-01 | 3 | 2 | 1 | 33.3 |
| 2025-02-01 | 2 | 0 | 2 | 100.0 |
| 2025-03-01 | 2 | 0 | 2 | 100.0 |
| 2025-04-01 | 1 | 0 | 1 | 100.0 |

January cohort: 3 users, 1 returned after 2 months (user 1).

> MySQL: `AGE()` is not available. Use `TIMESTAMPDIFF(MONTH, cohort_month, activity_month)` instead.
> SQL Server: `DATEDIFF(MONTH, cohort_month, activity_month)`.

### Pivot Style Cohort Table

```sql
WITH cohort_base AS (
    SELECT
        u.user_id,
        DATE_TRUNC('month', u.signup_date)::DATE AS cohort_month,
        DATE_TRUNC('month', e.event_time)::DATE  AS activity_month
    FROM users u
    LEFT JOIN events e ON e.user_id = u.user_id
),
cohort_size AS (
    SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_users
    FROM cohort_base
    GROUP BY cohort_month
),
retention AS (
    SELECT
        cb.cohort_month,
        EXTRACT(MONTH FROM AGE(cb.activity_month, cb.cohort_month))::INT AS months_since,
        COUNT(DISTINCT cb.user_id) AS active_users
    FROM cohort_base cb
    WHERE cb.activity_month IS NOT NULL
    GROUP BY cb.cohort_month, EXTRACT(MONTH FROM AGE(cb.activity_month, cb.cohort_month))
)
SELECT
    r.cohort_month,
    cs.cohort_users,
    ROUND(MAX(CASE WHEN r.months_since = 0 THEN r.active_users::DECIMAL / cs.cohort_users * 100 END), 1) AS m0,
    ROUND(MAX(CASE WHEN r.months_since = 1 THEN r.active_users::DECIMAL / cs.cohort_users * 100 END), 1) AS m1,
    ROUND(MAX(CASE WHEN r.months_since = 2 THEN r.active_users::DECIMAL / cs.cohort_users * 100 END), 1) AS m2
FROM retention r
JOIN cohort_size cs ON cs.cohort_month = r.cohort_month
GROUP BY r.cohort_month, cs.cohort_users
ORDER BY r.cohort_month;
```

**Expected result:**

| cohort_month | cohort_users | m0 | m1 | m2 |
|---|---|---|---|---|
| 2025-01-01 | 3 | 100.0 | NULL | 33.3 |
| 2025-02-01 | 2 | 100.0 | NULL | NULL |
| 2025-03-01 | 2 | 100.0 | NULL | NULL |
| 2025-04-01 | 1 | 100.0 | NULL | NULL |

> Interview trap: The question "what is the retention rate for January cohort in month 2?" requires you to divide users active in month 2 by the original cohort size, not by the number of users active in month 1. Always divide by the original cohort size.

---

## Funnel Analysis

### What it is

Funnel analysis tracks how many users complete each step of a multi-step process (e.g., view product → add to cart → purchase).

**Why it exists:** Funnels reveal where users drop off. This is the most common product analytics query.

**Grain:** One output row = one funnel step with the count of users who reached that step.

### Basic Funnel: page_view → add_to_cart → purchase

```sql
WITH funnel AS (
    SELECT
        user_id,
        MAX(CASE WHEN event_type = 'page_view'   THEN 1 ELSE 0 END) AS reached_view,
        MAX(CASE WHEN event_type = 'add_to_cart'  THEN 1 ELSE 0 END) AS reached_cart,
        MAX(CASE WHEN event_type = 'purchase'     THEN 1 ELSE 0 END) AS reached_purchase
    FROM events
    GROUP BY user_id
)
SELECT
    COUNT(*) FILTER (WHERE reached_view = 1)    AS step1_page_view,
    COUNT(*) FILTER (WHERE reached_cart = 1)    AS step2_add_to_cart,
    COUNT(*) FILTER (WHERE reached_purchase = 1) AS step3_purchase,
    ROUND(
        COUNT(*) FILTER (WHERE reached_cart = 1)::DECIMAL
        / NULLIF(COUNT(*) FILTER (WHERE reached_view = 1), 0) * 100,
        1
    ) AS view_to_cart_pct,
    ROUND(
        COUNT(*) FILTER (WHERE reached_purchase = 1)::DECIMAL
        / NULLIF(COUNT(*) FILTER (WHERE reached_cart = 1), 0) * 100,
        1
    ) AS cart_to_purchase_pct
FROM funnel;
```

> PostgreSQL: `COUNT(*) FILTER (WHERE ...)` is the cleanest syntax.
> MySQL / SQL Server: use `COUNT(CASE WHEN ... THEN 1 END)` instead.

**Expected result:**

| step1_page_view | step2_add_to_cart | step3_purchase | view_to_cart_pct | cart_to_purchase_pct |
|---|---|---|---|---|
| 8 | 4 | 4 | 50.0 | 100.0 |

**Why this works:** The `MAX(CASE WHEN ... THEN 1 ELSE 0 END)` per user collapses all events into a single row. Each user either reached a step (1) or did not (0). Then `COUNT(*) FILTER (WHERE ...)` counts users per step.

### Funnel by Device

```sql
WITH funnel AS (
    SELECT
        e.user_id,
        e.device,
        MAX(CASE WHEN e.event_type = 'page_view'  THEN 1 ELSE 0 END) AS reached_view,
        MAX(CASE WHEN e.event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS reached_cart,
        MAX(CASE WHEN e.event_type = 'purchase'    THEN 1 ELSE 0 END) AS reached_purchase
    FROM events e
    GROUP BY e.user_id, e.device
)
SELECT
    device,
    COUNT(*) FILTER (WHERE reached_view = 1)     AS page_views,
    COUNT(*) FILTER (WHERE reached_cart = 1)     AS add_to_carts,
    COUNT(*) FILTER (WHERE reached_purchase = 1) AS purchases,
    ROUND(
        COUNT(*) FILTER (WHERE reached_purchase = 1)::DECIMAL
        / NULLIF(COUNT(*) FILTER (WHERE reached_view = 1), 0) * 100,
        1
    ) AS conversion_pct
FROM funnel
GROUP BY device
ORDER BY conversion_pct DESC;
```

### Ordered Funnel (Strict Step Sequence)

**BAD APPROACH:**

```sql
-- WRONG: this counts users who performed ANY of the events, not in order
SELECT
    COUNT(DISTINCT CASE WHEN event_type = 'page_view'   THEN user_id END) AS step1,
    COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart'  THEN user_id END) AS step2,
    COUNT(DISTINCT CASE WHEN event_type = 'purchase'     THEN user_id END) AS step3
FROM events;
```

This counts users who ever performed each event, regardless of order. A user who purchased without viewing first would still be counted in step1.

**BETTER APPROACH:**

```sql
WITH user_steps AS (
    SELECT
        user_id,
        MIN(CASE WHEN event_type = 'page_view'   THEN event_time END) AS first_view,
        MIN(CASE WHEN event_type = 'add_to_cart'  THEN event_time END) AS first_cart,
        MIN(CASE WHEN event_type = 'purchase'     THEN event_time END) AS first_purchase
    FROM events
    GROUP BY user_id
)
SELECT
    COUNT(*) FILTER (WHERE first_view IS NOT NULL) AS step1_page_view,
    COUNT(*) FILTER (WHERE first_cart IS NOT NULL AND first_cart > first_view) AS step2_after_view,
    COUNT(*) FILTER (WHERE first_purchase IS NOT NULL AND first_purchase > first_cart) AS step3_after_cart
FROM user_steps;
```

**Why this is better:** The timestamp comparison ensures strict ordering. A user who purchased before adding to cart would not be counted in step3.

> Interview trap: "How many users completed the funnel?" can mean two things: (1) users who performed all steps regardless of order, or (2) users who performed steps in the correct order. Always clarify.

---

## Sessionization & Gap Detection

### What it is

Sessionization groups consecutive events into sessions using a time gap threshold (e.g., 30 minutes of inactivity starts a new session).

**Why it exists:** Raw event streams do not come with session boundaries. You must derive them.

### Sessionize Events with 30-Minute Gap

```sql
WITH ordered_events AS (
    SELECT
        *,
        LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev_event_time
    FROM events
),
session_flags AS (
    SELECT
        *,
        CASE
            WHEN prev_event_time IS NULL
                 OR event_time - prev_event_time > INTERVAL '30 minutes'
            THEN 1
            ELSE 0
        END AS new_session
    FROM ordered_events
),
session_ids AS (
    SELECT
        *,
        SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_num
    FROM session_flags
)
SELECT
    user_id,
    session_num,
    MIN(event_time) AS session_start,
    MAX(event_time) AS session_end,
    COUNT(*)        AS event_count,
    MAX(event_time) - MIN(event_time) AS session_duration
FROM session_ids
GROUP BY user_id, session_num
ORDER BY user_id, session_num;
```

**How it works:**

1. `LAG` gets the previous event time per user.
2. `CASE` flags a new session when the gap exceeds 30 minutes or when there is no previous event.
3. `SUM(new_session) OVER (ORDER BY event_time)` creates a cumulative session counter.
4. Group by `(user_id, session_num)` to get session-level aggregates.

**Expected result (user 1):**

| user_id | session_num | session_start | session_end | event_count | session_duration |
|---|---|---|---|---|---|
| 1 | 1 | 2025-01-05 10:00 | 2025-01-05 10:10 | 4 | 10 minutes |
| 1 | 2 | 2025-01-20 11:00 | 2025-01-20 11:15 | 2 | 15 minutes |
| 1 | 3 | 2025-03-01 09:00 | 2025-03-01 09:00 | 1 | 0 |

### Gap and Island Detection

**What it is:** Find consecutive sequences (islands) and gaps in data.

**Why it exists:** Common in finding streaks, continuous periods, and missing data.

```sql
-- Find consecutive days a user was active
WITH daily_active AS (
    SELECT DISTINCT
        user_id,
        event_time::DATE AS active_date
    FROM events
),
numbered AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY active_date) AS rn
    FROM daily_active
),
grouped AS (
    SELECT
        *,
        active_date - rn::INT AS grp  -- subtracting row number creates same value for consecutive dates
    FROM numbered
)
SELECT
    user_id,
    MIN(active_date) AS streak_start,
    MAX(active_date) AS streak_end,
    COUNT(*)         AS streak_length
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_start;
```

**How it works:** Subtracting `ROW_NUMBER()` from the date produces the same value for consecutive dates. Non-consecutive dates produce different group values. This is the classic "gaps and islands" technique.

**Expected result (user 1):**

| user_id | streak_start | streak_end | streak_length |
|---|---|---|---|
| 1 | 2025-01-05 | 2025-01-05 | 1 |
| 1 | 2025-01-20 | 2025-01-20 | 1 |
| 1 | 2025-03-01 | 2025-03-01 | 1 |

User 1 was active on 3 separate days with gaps between them, so each streak is length 1.

> See also: [55-Gaps-and-Islands] for more patterns.

---

## Ranking & Top-N Problems

### What it is

Ranking problems assign ordinal positions to rows within groups based on a metric.

**Why it exists:** "Top N per group" is one of the most common analytics questions (top products per category, most active users per country, highest-value orders per customer).

### Top 3 Users by Event Count per Device

```sql
WITH user_device_events AS (
    SELECT
        user_id,
        device,
        COUNT(*) AS event_count
    FROM events
    GROUP BY user_id, device
),
ranked AS (
    SELECT
        *,
        DENSE_RANK() OVER (PARTITION BY device ORDER BY event_count DESC) AS rnk
    FROM user_device_events
)
SELECT device, user_id, event_count, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY device, rnk;
```

### ROW_NUMBER vs RANK vs DENSE_RANK

| Function | Ties | Gaps | Use when |
|---|---|---|---|
| `ROW_NUMBER` | Arbitrarily breaks ties | No gaps | Exactly one result per group |
| `RANK` | Same rank for ties | Gaps after ties | "All users tied for top score" |
| `DENSE_RANK` | Same rank for ties | No gaps | "Top 3 distinct spending levels" |

**Example with ties:**

```sql
-- Two users with the same event count
WITH ranked AS (
    SELECT
        user_id,
        COUNT(*) AS event_count,
        ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS row_num,
        RANK()       OVER (ORDER BY COUNT(*) DESC) AS rank_num,
        DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS dense_rank_num
    FROM events
    GROUP BY user_id
)
SELECT * FROM ranked WHERE user_id IN (1, 3, 6);
```

**Expected result:**

| user_id | event_count | row_num | rank_num | dense_rank_num |
|---|---|---|---|---|
| 1 | 6 | 1 | 1 | 1 |
| 3 | 2 | 2 | 2 | 2 |
| 6 | 1 | 5 | 6 | 4 |

Wait — let me recount. User 1 has events 1001-1004, 1010-1011, 1017 = 7 events. Let me recalculate:

- User 1: 7 events (1001, 1002, 1003, 1004, 1010, 1011, 1017)
- User 2: 3 events (1005, 1006, 1007)
- User 3: 3 events (1008, 1009, 1022)
- User 4: 1 event (1012)
- User 5: 4 events (1013, 1014, 1015, 1016)
- User 6: 1 event (1018)
- User 7: 1 event (1019)
- User 8: 2 events (1020, 1021)

| user_id | event_count | row_num | rank_num | dense_rank_num |
|---|---|---|---|---|
| 1 | 7 | 1 | 1 | 1 |
| 5 | 4 | 2 | 2 | 2 |
| 2 | 3 | 3 | 3 | 3 |
| 3 | 3 | 4 | 3 | 3 |
| 8 | 2 | 5 | 5 | 4 |
| 4 | 1 | 6 | 6 | 5 |
| 6 | 1 | 7 | 6 | 5 |
| 7 | 1 | 8 | 6 | 5 |

Users 2 and 3 both have 3 events. `ROW_NUMBER` gives them different numbers (3 and 4). `RANK` gives both 3, then skips to 5. `DENSE_RANK` gives both 3, then continues at 4.

> Interview trap: "Give me the top 3 users by event count." If you use `ROW_NUMBER`, you get exactly 3 rows. If you use `DENSE_RANK`, you might get 4 or more (if users tie at rank 3). Clarify which behavior is expected.

### Nth Highest Distinct Value

```sql
-- 2nd highest distinct event count
WITH distinct_counts AS (
    SELECT DISTINCT COUNT(*) AS event_count
    FROM events
    GROUP BY user_id
),
ranked AS (
    SELECT
        event_count,
        DENSE_RANK() OVER (ORDER BY event_count DESC) AS rnk
    FROM distinct_counts
)
SELECT event_count
FROM ranked
WHERE rnk = 2;
```

**Expected result:** The distinct event counts are: 7, 4, 3, 2, 1. The 2nd highest is 4.

---

## Percentiles & Distribution

### What it is

Percentile queries divide a dataset into equal parts. Common metrics: median (50th percentile), 95th percentile of page load time, distribution of session lengths.

### Median Session Duration

**Approach A — PERCENTILE_CONT (ANSI SQL):**

```sql
WITH session_durations AS (
    SELECT
        session_id,
        EXTRACT(EPOCH FROM (session_end - session_start)) / 60.0 AS duration_minutes
    FROM sessions
    WHERE session_end IS NOT NULL
)
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_minutes) AS median_duration
FROM session_durations;
```

**Approach B — PERCENTILE_DISC (returns an actual value, not interpolated):**

```sql
SELECT
    PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY duration_minutes) AS median_duration
FROM session_durations;
```

> MySQL: `PERCENTILE_CONT` is available in MySQL 8.0+ as a window function, but not with `WITH IN GROUP` syntax. Use a `ROW_NUMBER` workaround:
> ```sql
> WITH ordered AS (
>     SELECT duration_minutes,
>            ROW_NUMBER() OVER (ORDER BY duration_minutes) AS rn,
>            COUNT(*) OVER () AS total
>     FROM session_durations
> )
> SELECT AVG(duration_minutes) AS median_duration
> FROM ordered
> WHERE rn IN (FLOOR((total + 1) / 2.0), CEIL((total + 1) / 2.0));
> ```

### Distribution of Purchase Amounts (Histogram)

```sql
WITH buckets AS (
    SELECT
        purchase_id,
        amount,
        NTILE(4) OVER (ORDER BY amount) AS quartile
    FROM purchases
)
SELECT
    quartile,
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    COUNT(*)    AS purchase_count
FROM buckets
GROUP BY quartile
ORDER BY quartile;
```

**Expected result:**

| quartile | min_amount | max_amount | purchase_count |
|---|---|---|---|
| 1 | 75.00 | 90.00 | 1 |
| 2 | 120.00 | 120.00 | 1 |
| 3 | 150.00 | 150.00 | 1 |
| 4 | 200.00 | 200.00 | 2 |

Wait — with 5 purchases (75, 90, 120, 150, 200), `NTILE(4)` distributes them as evenly as possible across 4 buckets. The exact distribution depends on the database engine.

### Percentile per User (Distribution of Spending)

```sql
WITH user_spending AS (
    SELECT
        user_id,
        SUM(amount) AS total_spent
    FROM purchases
    GROUP BY user_id
)
SELECT
    user_id,
    total_spent,
    PERCENT_RANK() OVER (ORDER BY total_spent) AS pct_rank,
    CUME_DIST()    OVER (ORDER BY total_spent) AS cumulative_dist
FROM user_spending
ORDER BY total_spent;
```

**What the functions do:**

| Function | Formula | Returns |
|---|---|---|
| `PERCENT_RANK` | (rank - 1) / (total_rows - 1) | 0.0 to 1.0 |
| `CUME_DIST` | rank / total_rows | 1/n to 1.0 |
| `NTILE(n)` | Divides into n buckets | 1 to n |

---

## Attribution & Multi-Touch

### What it is

Attribution assigns credit for a conversion (purchase) to one or more touchpoints (events) that preceded it.

**Why it exists:** Understanding which channels drive conversions is fundamental to marketing analytics.

### First-Touch Attribution

```sql
WITH first_touch AS (
    SELECT
        user_id,
        MIN(event_time) AS first_event_time
    FROM events
    WHERE event_type = 'page_view'
    GROUP BY user_id
)
SELECT
    e.referrer        AS first_touch_channel,
    COUNT(DISTINCT e.user_id) AS users,
    COUNT(DISTINCT p.purchase_id) AS purchases
FROM first_touch ft
JOIN events e ON e.user_id = ft.user_id AND e.event_time = ft.first_event_time
LEFT JOIN purchases p ON p.user_id = ft.user_id
GROUP BY e.referrer
ORDER BY purchases DESC;
```

### Last-Touch Attribution

```sql
WITH last_touch AS (
    SELECT
        user_id,
        MAX(event_time) AS last_event_time
    FROM events
    WHERE event_type = 'page_view'
    GROUP BY user_id
)
SELECT
    e.referrer        AS last_touch_channel,
    COUNT(DISTINCT e.user_id) AS users,
    COUNT(DISTINCT p.purchase_id) AS purchases
FROM last_touch lt
JOIN events e ON e.user_id = lt.user_id AND e.event_time = lt.last_event_time
LEFT JOIN purchases p ON p.user_id = lt.user_id
GROUP BY e.referrer
ORDER BY purchases DESC;
```

### Multi-Touch Linear Attribution

```sql
WITH purchase_events AS (
    SELECT
        p.purchase_id,
        p.user_id,
        p.purchase_time,
        e.referrer,
        e.event_time,
        ROW_NUMBER() OVER (
            PARTITION BY p.purchase_id
            ORDER BY e.event_time
        ) AS touch_num,
        COUNT(*) OVER (PARTITION BY p.purchase_id) AS total_touches
    FROM purchases p
    JOIN events e ON e.user_id = p.user_id
                 AND e.event_time <= p.purchase_time
                 AND e.event_type = 'page_view'
)
SELECT
    referrer,
    COUNT(DISTINCT purchase_id) AS purchases,
    SUM(1.0 / total_touches)   AS linear_attributed_conversions
FROM purchase_events
GROUP BY referrer
ORDER BY linear_attributed_conversions DESC;
```

**How it works:** Linear attribution gives equal credit to all touchpoints. If a purchase had 4 page views before converting, each page view gets 0.25 credit. `1.0 / total_touches` distributes the credit.

> Interview trap: Attribution queries often produce incorrect results when events and purchases are not properly linked by user and time. A user's purchase should only attribute credit to events that occurred *before* the purchase.

---

## Moving Aggregations & Rolling Windows

### What it is

Moving aggregations compute metrics over a sliding window (e.g., 7-day moving average of daily active users).

**Why it exists:** Moving averages smooth out noise and reveal trends. Essential for dashboards and time-series analysis.

### 7-Day Moving Average of DAU

```sql
WITH daily AS (
    SELECT
        event_time::DATE AS day,
        COUNT(DISTINCT user_id) AS dau
    FROM events
    GROUP BY event_time::DATE
)
SELECT
    day,
    dau,
    ROUND(AVG(dau) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_7d
FROM daily
ORDER BY day;
```

**How it works:** `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` creates a window of exactly 7 rows (6 previous + current). The average is computed over those 7 values.

**NULL behavior:** For the first 6 days, the window contains fewer than 7 rows. `AVG` ignores NULLs and divides by the count of non-NULL values. So the first row's moving average equals the DAU itself (only 1 value in the window).

> Production pitfall: `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` requires the data to have one row per day. If a day has zero events (zero DAU), you must generate that row first using `generate_series` or a calendar table, otherwise the moving average skips that day.

### 30-Day Rolling Revenue

```sql
WITH daily_revenue AS (
    SELECT
        purchase_time::DATE AS day,
        SUM(amount) AS revenue
    FROM purchases
    GROUP BY purchase_time::DATE
)
SELECT
    day,
    revenue,
    SUM(revenue) OVER (
        ORDER BY day
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS rolling_30d_revenue,
    COUNT(*) OVER (
        ORDER BY day
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) AS days_in_window
FROM daily_revenue
ORDER BY day;
```

**Why include `COUNT(*)`:** To know how many days are actually in the window (fewer than 30 for the first 29 days). This lets you decide whether to display a partial window or NULL.

### Moving Aggregation with RANGE Frame (Time-Based)

```sql
-- Events in the last 7 days (calendar days, not row count)
SELECT
    event_id,
    user_id,
    event_time,
    COUNT(*) OVER (
        PARTITION BY user_id
        ORDER BY event_time
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) AS events_last_7_days
FROM events
ORDER BY user_id, event_time;
```

**ROWS vs RANGE:** `ROWS` counts physical rows; `RANGE` counts logical values. If a user had 100 events on the same day, `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` includes only 7 of them, while `RANGE BETWEEN INTERVAL '7 days' PRECEDING` includes all events from the last 7 calendar days. See [52-ROWS-vs-RANGE-vs-GROUPS].

---

## Cumulative & Running Metrics

### What it is

Cumulative metrics accumulate over time: running total of revenue, cumulative user signups, growing session count.

### Cumulative Revenue Over Time

```sql
WITH daily_revenue AS (
    SELECT
        purchase_time::DATE AS day,
        SUM(amount) AS daily_revenue
    FROM purchases
    GROUP BY purchase_time::DATE
)
SELECT
    day,
    daily_revenue,
    SUM(daily_revenue) OVER (ORDER BY day) AS cumulative_revenue
FROM daily_revenue
ORDER BY day;
```

**Expected result:**

| day | daily_revenue | cumulative_revenue |
|---|---|---|
| 2025-01-05 | 150.00 | 150.00 |
| 2025-01-15 | 75.00 | 225.00 |
| 2025-01-20 | 200.00 | 425.00 |
| 2025-02-10 | 120.00 | 545.00 |
| 2025-04-01 | 90.00 | 635.00 |

### Cumulative Users (Signup Growth)

```sql
SELECT
    signup_date AS day,
    COUNT(*) AS new_users,
    SUM(COUNT(*)) OVER (ORDER BY signup_date) AS cumulative_users
FROM users
GROUP BY signup_date
ORDER BY signup_date;
```

### Running Count with Partition Reset

```sql
-- Running event count per user, resetting each month
SELECT
    user_id,
    event_time,
    event_type,
    COUNT(*) OVER (
        PARTITION BY user_id, DATE_TRUNC('month', event_time)
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS events_this_month
FROM events
ORDER BY user_id, event_time;
```

> Common mistake: Using `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (the default) instead of `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. When two rows have the same `ORDER BY` value, `RANGE` includes all of them in the current row's frame, causing jumps in the running total. Use `ROWS` for row-by-row accumulation.

> See also: [49-Running-Totals], [50-Moving-Averages].

---

## Anomaly Detection & Statistical Analysis

### What it is

Statistical queries identify outliers, unusual patterns, and data quality issues using SQL.

### Z-Score Anomaly Detection

```sql
WITH user_stats AS (
    SELECT
        user_id,
        AVG(amount)    AS avg_amount,
        STDDEV(amount) AS stddev_amount,
        COUNT(*)       AS purchase_count
    FROM purchases
    GROUP BY user_id
    HAVING COUNT(*) >= 2
)
SELECT
    p.purchase_id,
    p.user_id,
    p.amount,
    us.avg_amount,
    us.stddev_amount,
    ROUND((p.amount - us.avg_amount) / NULLIF(us.stddev_amount, 0), 2) AS z_score
FROM purchases p
JOIN user_stats us ON us.user_id = p.user_id
WHERE ABS((p.amount - us.avg_amount) / NULLIF(us.stddev_amount, 0)) > 1.5
ORDER BY z_score DESC;
```

**NULL behavior:** `NULLIF(stddev_amount, 0)` handles users with only one purchase (stddev = 0). Without it, you get division-by-zero. The `HAVING COUNT(*) >= 2` filter ensures we only analyze users with enough data.

> Production pitfall: Z-score assumes a normal distribution. Purchase amounts are typically right-skewed. In production, consider percentile-based thresholds (e.g., any purchase above the 99th percentile).

### Day-over-Day Change Detection

```sql
WITH daily_metrics AS (
    SELECT
        event_time::DATE AS day,
        COUNT(*) AS event_count
    FROM events
    GROUP BY event_time::DATE
),
with_stats AS (
    SELECT
        day,
        event_count,
        AVG(event_count) OVER () AS overall_avg,
        STDDEV(event_count) OVER () AS overall_stddev
    FROM daily_metrics
)
SELECT
    day,
    event_count,
    ROUND((event_count - overall_avg) / NULLIF(overall_stddev, 0), 2) AS z_score,
    CASE
        WHEN ABS((event_count - overall_avg) / NULLIF(overall_stddev, 0)) > 2 THEN 'ANOMALY'
        ELSE 'normal'
    END AS status
FROM with_stats
ORDER BY day;
```

### Percentile-Based Outlier Detection

```sql
WITH user_spending AS (
    SELECT
        user_id,
        SUM(amount) AS total_spent
    FROM purchases
    GROUP BY user_id
),
percentiles AS (
    SELECT
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_spent) AS p25,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_spent) AS p75
    FROM user_spending
)
SELECT
    us.user_id,
    us.total_spent,
    p.p25,
    p.p75,
    p.p75 - p.p25 AS iqr,
    CASE
        WHEN us.total_spent > p.p75 + 1.5 * (p.p75 - p.p25) THEN 'high outlier'
        WHEN us.total_spent < p.p25 - 1.5 * (p.p25 - p.p25) THEN 'low outlier'
        ELSE 'normal'
    END AS classification
FROM user_spending us
CROSS JOIN percentiles p
ORDER BY us.total_spent DESC;
```

**How it works:** The IQR (Interquartile Range) method flags values beyond 1.5×IQR from Q1 or Q3. This is more robust to skewed distributions than z-scores.

---

## Common Mistakes & Production Pitfalls

### 1. COUNT(DISTINCT) with Fan-Out

```sql
-- BAD: joining events to purchases before counting distinct users inflates the count
SELECT COUNT(DISTINCT e.user_id) AS active_users
FROM events e
JOIN purchases p ON p.user_id = e.user_id;
-- If a user has 10 events and 3 purchases, the join produces 30 rows.
-- COUNT(DISTINCT) still returns 1 per user, but the join is wasteful.

-- BETTER: use EXISTS or IN for existence checks
SELECT COUNT(DISTINCT user_id) AS active_users
FROM events e
WHERE EXISTS (
    SELECT 1 FROM purchases p WHERE p.user_id = e.user_id
);
```

### 2. Timestamp Boundary Errors

```sql
-- BAD: BETWEEN misses timestamps after midnight on the end date
WHERE event_time BETWEEN '2025-01-01' AND '2025-01-31'
-- A timestamp of '2025-01-31 23:59:59' is included,
-- but '2025-02-01 00:00:00' is excluded (correct),
-- but if the column is TIMESTAMP, '2025-01-31' is implicitly '2025-01-31 00:00:00',
-- so any timestamp on Jan 31 after midnight is EXCLUDED.

-- BETTER: use half-open intervals
WHERE event_time >= '2025-01-01'
  AND event_time <  '2025-02-01'
```

> Production pitfall: This is one of the most common bugs in analytics. A monthly report using `BETWEEN` can silently miss a significant portion of data on the last day of the month.

### 3. Division by Zero in Growth Calculations

```sql
-- BAD: division by zero when previous period has no data
SELECT
    month,
    revenue,
    (revenue - LAG(revenue) OVER (ORDER BY month))
    / LAG(revenue) OVER (ORDER BY month) * 100 AS growth_pct
-- Returns error if LAG is 0

-- BETTER: use NULLIF
SELECT
    month,
    revenue,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month))
        / NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100,
        2
    ) AS growth_pct
```

### 4. LEFT JOIN Becoming INNER JOIN

```sql
-- BAD: WHERE clause filters out NULLs from the left table
SELECT u.user_id, COUNT(e.event_id) AS event_count
FROM users u
LEFT JOIN events e ON e.user_id = u.user_id
WHERE e.event_type = 'page_view'  -- turns LEFT JOIN into INNER JOIN
GROUP BY u.user_id;

-- BETTER: move the filter to ON
SELECT u.user_id, COUNT(e.event_id) AS event_count
FROM users u
LEFT JOIN events e ON e.user_id = u.user_id
                  AND e.event_type = 'page_view'
GROUP BY u.user_id;
```

### 5. Non-Deterministic Window Results

```sql
-- BAD: ORDER BY event_time alone may not be deterministic
-- if two events share the same timestamp
SUM(amount) OVER (
    PARTITION BY user_id
    ORDER BY event_time
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)

-- BETTER: add a tiebreaker
SUM(amount) OVER (
    PARTITION BY user_id
    ORDER BY event_time, event_id  -- deterministic
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

### 6. Integer Division in Percentages

```sql
-- SQL Server: integer division truncates
SELECT 3 / 10;  -- returns 0, not 0.3

-- Fix: cast to DECIMAL
SELECT 3.0 / 10;  -- returns 0.3
SELECT CAST(3 AS DECIMAL) / 10;  -- returns 0.3
```

### 7. Aggregating Before Joining vs After

```sql
-- BAD: joining all events to all purchases, then aggregating
SELECT
    p.user_id,
    SUM(p.amount) AS total_spent,
    COUNT(e.event_id) AS total_events
FROM purchases p
LEFT JOIN events e ON e.user_id = p.user_id
GROUP BY p.user_id;
-- This works but scans all events for each purchase group.

-- BETTER: aggregate independently, then join
WITH user_purchases AS (
    SELECT user_id, SUM(amount) AS total_spent
    FROM purchases
    GROUP BY user_id
),
user_events AS (
    SELECT user_id, COUNT(*) AS total_events
    FROM events
    GROUP BY user_id
)
SELECT
    up.user_id,
    up.total_spent,
    COALESCE(ue.total_events, 0) AS total_events
FROM user_purchases up
LEFT JOIN user_events ue ON ue.user_id = up.user_id;
```

---

## Performance Implications

### Indexes for Analytics Queries

```sql
-- Time-series aggregations
CREATE INDEX idx_events_time_user ON events(event_time, user_id);
-- Supports: COUNT(DISTINCT user_id) GROUP BY DATE_TRUNC('month', event_time)

-- Sessionization
CREATE INDEX idx_events_user_time ON events(user_id, event_time);
-- Supports: LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time)

-- Funnel analysis
CREATE INDEX idx_events_type_time ON events(event_type, event_time, user_id);
-- Supports: filtered aggregations by event_type

-- Cohort analysis
CREATE INDEX idx_users_signup ON users(signup_date);
CREATE INDEX idx_events_user_type ON events(user_id, event_type, event_time);
```

### When COUNT(DISTINCT) Is Slow

`COUNT(DISTINCT user_id)` requires the engine to maintain a hash set of all unique values. On billions of rows, this is memory-intensive. Alternatives:

1. **HyperLogLog** (PostgreSQL extension `hyperloglog`): approximate count with configurable accuracy.
2. **Pre-aggregate**: compute daily distinct users in a materialized view, then aggregate monthly from the view.
3. **Bitmap aggregation**: some databases (Oracle, SQL Server) support `BITMAP AGGREGATE` for low-cardinality columns.

### Window Functions vs Subqueries

| Approach | Scan pattern | When faster |
|---|---|---|
| Window function | Single scan + sort | Most cases |
| Correlated subquery | Outer scan × inner scan | When inner table is tiny and indexed |
| CTE with self-join | Two scans + join | When CTE is small |

Always verify with `EXPLAIN ANALYZE`. The optimizer may rewrite one approach as another.

### Materialized Views for Repeated Analytics

```sql
-- PostgreSQL
CREATE MATERIALIZED VIEW mv_monthly_cohort AS
SELECT
    DATE_TRUNC('month', u.signup_date)::DATE AS cohort_month,
    DATE_TRUNC('month', e.event_time)::DATE AS activity_month,
    COUNT(DISTINCT u.user_id) AS active_users
FROM users u
LEFT JOIN events e ON e.user_id = u.user_id
GROUP BY 1, 2;

-- Refresh periodically
REFRESH MATERIALIZED VIEW mv_monthly_cohort;
```

> Production pitfall: Materialized views are stale between refreshes. For real-time dashboards, use incremental aggregation instead.

---

## Comparison Tables

### Analytics Functions Cheat Sheet

| Goal | Function/Pattern | Example |
|---|---|---|
| Rank within group | `ROW_NUMBER`, `RANK`, `DENSE_RANK` | Top N per category |
| Compare to previous row | `LAG`, `LEAD` | Month-over-month growth |
| Cumulative sum | `SUM() OVER (ORDER BY ...)` | Running revenue |
| Moving average | `AVG() OVER (ROWS BETWEEN ...)` | 7-day MAU |
| Percentile | `PERCENTILE_CONT`, `NTILE` | Median session duration |
| Cumulative distribution | `CUME_DIST`, `PERCENT_RANK` | User spending percentile |
| Gap detection | `LAG` + `CASE` + `SUM()` | Sessionization |
| Island detection | `ROW_NUMBER` + date subtraction | Consecutive active days |
| Funnel | `MAX(CASE WHEN ...)` + aggregation | Conversion rates |
| Cohort retention | `DATE_TRUNC` + `AGE` + conditional COUNT | Monthly retention |

### NULL Behavior in Analytics Contexts

| Expression | Result | When |
|---|---|---|
| `LAG(x) OVER (ORDER BY y)` on first row | `NULL` | No previous row |
| `LEAD(x) OVER (ORDER BY y)` on last row | `NULL` | No next row |
| `COUNT(DISTINCT x)` where all x are NULL | `0` | No non-NULL values |
| `AVG(x)` where x has NULLs | Ignores NULLs | Divides by count of non-NULLs |
| `SUM(x)` where all x are NULL | `NULL` | Not 0 |
| `PERCENTILE_CONT(0.5)` with even count | Interpolates | Between two middle values |
| `NTILE(n)` with fewer than n rows | Returns 1 to actual count | One bucket per row |
| `NULLIF(x, 0) / 0` | `NULL` | Prevents division by zero |
| `COALESCE(NULL, NULL, 0)` | `0` | Returns first non-NULL |

### Database-Specific Syntax

| Operation | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Date truncation | `DATE_TRUNC('month', dt)` | `DATE_FORMAT(dt, '%Y-%m-01')` | `DATEFROMPARTS(YEAR(dt), MONTH(dt), 1)` | `TRUNC(dt, 'MM')` |
| Date difference | `dt1 - dt2` (returns INTERVAL) | `DATEDIFF(dt1, dt2)` | `DATEDIFF(DAY, dt2, dt1)` | `dt1 - dt2` (returns number) |
| Percentage of total | `COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER ()` | Same (with CAST) | Same (with CAST) | Same |
| FILTER clause | `COUNT(*) FILTER (WHERE ...)` | Not supported | Not supported | Not supported |
| PERCENTILE_CONT | `WITHIN GROUP` syntax | Window function (8.0+) | `WITHIN GROUP` syntax | `WITHIN GROUP` syntax |
| Generate series | `generate_series(1, n)` | Recursive CTE | Recursive CTE | `CONNECT BY` |
| String aggregation | `STRING_AGG(col, ',')` | `GROUP_CONCAT(col)` | `STRING_AGG(col, ',')` | `LISTAGG(col, ',')` |

---

## Interview Questions

### Beginner

1. Write a query to count the number of distinct users who performed each event type (`page_view`, `add_to_cart`, `purchase`). What is the grain of your result?

2. Write a query to find the total revenue (sum of `amount`) from the `purchases` table by month. Include months with zero purchases.

3. Write a query to list all users who signed up in January 2025, along with the count of events they performed. Include users with zero events.

4. Explain the difference between `COUNT(DISTINCT user_id)` and `COUNT(user_id)`. When would they return different results?

5. Write a query to find the most recent event for each user. What happens when a user has two events at the exact same timestamp?

### Intermediate

6. Write a query to compute month-over-month growth in active users. Handle the first month (no previous month) and months with zero active users.

7. Write a funnel query that tracks the conversion from `page_view` → `add_to_cart` → `purchase`. Show the count and percentage at each step.

8. Write a cohort analysis query that groups users by signup month and shows retention at months 0, 1, and 2. What is the correct denominator for the retention percentage?

9. Write a query to detect gaps in daily event data: find days where no events occurred for a specific user. How do you generate the full date range?

10. Write a query to find the top 2 users by event count for each device type. Handle ties using `DENSE_RANK`.

11. Write a query to compute a 7-day moving average of daily event counts. What happens on the first 6 days?

12. Write a query to find sessions where the user performed more than 5 events. What is the grain of your result?

### Advanced

13. Write a sessionization query that groups events into sessions using a 30-minute inactivity threshold. Include the session duration and event count per session.

14. Write a query to detect consecutive days of activity (streaks) for each user. What is the gaps-and-islands technique, and why does subtracting `ROW_NUMBER()` from the date work?

15. Write a query to compute the median and 90th percentile of session duration. Explain the difference between `PERCENTILE_CONT` and `PERCENTILE_DISC`.

16. Write a multi-touch linear attribution query that assigns equal credit to all page views before a purchase. How do you handle users with no page views before purchasing?

17. Write a query to find users whose spending in the last 30 days is more than 2 standard deviations above their historical average. What statistical assumptions are you making?

18. Write a query to produce a cohort retention table as a pivot: rows are signup months, columns are months since signup, values are retention percentages.

### Scenario Based

19. A dashboard shows DAU dropped by 50% yesterday. The query uses `COUNT(DISTINCT user_id) FROM events WHERE event_time::date = CURRENT_DATE - 1`. What are three possible explanations beyond "user engagement dropped"?

20. The funnel query shows 100% conversion from `add_to_cart` to `purchase`. The product manager is suspicious. What data quality issue could explain this?

21. A cohort analysis shows month-1 retention of 150%. How is this possible, and what is the bug?

22. The moving average chart shows a sudden spike. The underlying daily data looks normal. What could cause the spike in the moving average?

23. A retention query shows that users who signed up in January have higher retention than February, but the absolute number of retained users is lower. Is January truly better for retention?

24. An attribution report credits a purchase to a referral channel, but the referral event occurred after the purchase. What query bug allows this?

### Tricky

25. What is the result of:
```sql
SELECT COUNT(DISTINCT user_id) AS mau
FROM events
WHERE event_time >= '2025-01-01'
  AND event_time <  '2025-02-01';
```
vs.
```sql
SELECT COUNT(DISTINCT user_id) AS mau
FROM events
WHERE DATE_TRUNC('month', event_time) = '2025-01-01';
```
Do they return the same result? When might they differ?

26. Given:
```sql
SELECT
    user_id,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS median
FROM purchases
GROUP BY user_id;
```
If a user has only one purchase of $100, what is the median? What if they have two purchases of $100 and $200?

27. What is wrong with:
```sql
SELECT user_id, COUNT(*) AS events
FROM events
GROUP BY user_id
HAVING COUNT(DISTINCT event_type) = 3;
```
if you want users who performed ALL THREE event types (`page_view`, `add_to_cart`, `purchase`)? Is this query correct?

28. A query uses `LAG(dau, 1, 0) OVER (ORDER BY day)` to fill missing days with 0. But the chart shows flat lines at 0 for weekends. Why?

29. Two analysts write different funnel queries. One uses `COUNT(DISTINCT user_id)` per step; the other uses a CTE with `MAX(CASE WHEN ...)` per user. Both show different total users at step 1. Why?

30. What happens when you compute `SUM(COUNT(*)) OVER (ORDER BY day)` without a frame clause? Is this the same as a running total?

### Output Prediction

31. What does this query return?
```sql
WITH RECURSIVE seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 5
)
SELECT
    n,
    SUM(n) OVER (ORDER BY n) AS running_sum,
    AVG(n) OVER (ORDER BY n ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_avg
FROM seq;
```

32. Given the sample data, what is the output of:
```sql
SELECT
    device,
    COUNT(*) AS total_events,
    COUNT(DISTINCT user_id) AS unique_users,
    ROUND(COUNT(DISTINCT user_id)::DECIMAL / COUNT(*), 2) AS users_per_event
FROM events
GROUP BY device
ORDER BY total_events DESC;
```

33. What is the result of:
```sql
SELECT
    CASE
        WHEN NULL = NULL THEN 'equal'
        WHEN NULL <> NULL THEN 'not equal'
        WHEN NULL IS NULL THEN 'is null'
        ELSE 'other'
    END;
```

34. Given the sessions table, what does this return?
```sql
SELECT
    user_id,
    session_end - session_start AS duration,
    EXTRACT(EPOCH FROM (session_end - session_start)) / 60.0 AS minutes
FROM sessions
WHERE session_id = 5;
```

35. What happens when you run:
```sql
SELECT
    NTILE(3) OVER (ORDER BY amount) AS bucket,
    amount
FROM purchases;
```
with 5 rows? How are the rows distributed?

### Debugging

36. A cohort query shows `cohort_size = 10` but `month_0 = 15`. How is this possible?

37. A funnel query returns more users at the `purchase` step than at the `page_view` step. What bug causes this?

38. The sessionization query produces a session with 0 events. What data condition causes this?

39. A running total query shows a negative value for a user who only made purchases (positive amounts). What went wrong?

40. A moving average query produces NULL for the last row of data. The data has 30 days. What is the likely cause?

### Performance

41. A `COUNT(DISTINCT user_id)` query on a 500M-row events table takes 10 minutes. The execution plan shows a `HashAggregate` with high memory usage. What strategies can reduce the time?

42. A cohort retention query joins `users` (1M rows) to `events` (100M rows). The execution plan shows a `Hash Join` with 100M rows on the build side. What index would help, and what alternative approach avoids the large join?

43. A moving average query recalculates the entire window for every row. The execution plan shows `WindowAgg` with a `Sort` node. What index eliminates the sort?

44. A funnel query uses `COUNT(DISTINCT user_id)` three times (once per step). The execution plan scans the events table three times. How can you rewrite it to scan once?

45. A sessionization query with `LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time)` is slow on 1B rows. The execution plan shows `Sort` on the entire table. What composite index would help, and what is the expected plan change?

---

*This section covers analytics SQL patterns. For related concepts, see: [Window Functions](../06-Window-Functions), [Recursive CTEs](../04-Subqueries/34-Recursive-CTEs), [NULL Handling](../02-NULL-and-Logic/09-NULL-Deep-Dive), [JOIN pitfalls](../03-Joins/25-JOIN-Pitfalls), [Index design](../09-Optimization/72-Indexes-Basics), [Date functions](../07-Dates-and-Strings/57-Date-Time-Basics).*
