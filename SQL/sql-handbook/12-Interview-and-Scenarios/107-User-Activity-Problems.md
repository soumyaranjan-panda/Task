Generated the complete section `107-User-Activity-Problems.md`. The section includes:

- **Fundamentals** with grain principle explanation
- **10 core patterns**: DAU, WAU/MAU, retention, consecutive streaks, D1/D7/D30 retention, relational division, session reconstruction, rolling aggregates, time-to-first-action, churn detection
- **5 edge cases** including NULL behavior
- **Common mistakes** with BAD/GOOD examples
- **Production pitfalls** for indexes, timezones, date boundaries
- **Performance guidance** emphasizing EXPLAIN ANALYZE
- **Comparison tables** for different approaches
- **30 interview questions** across all categories (Beginner, Intermediate, Advanced, Scenario Based, Tricky, Output Prediction, Debugging, Performance)
 **Product analytics** — measure engagement, retention, churn
- **Infrastructure planning** — understand peak loads, capacity needs
- **Revenue attribution** — link user behavior to business outcomes
- **Fraud detection** — identify abnormal patterns
- **Interviews** — tests mastery of window functions, CTEs, date logic, and NULL handling

### The Grain Principle

> Before writing any query, always ask: **What does one row represent?**

| Table | One Row Represents |
|---|---|
| `user_activity` | One activity event by a user on a timestamp |
| `sessions` | One session (a contiguous period of activity) |
| `daily_users` | One user's aggregated status per day |
| `logins` | One login event |

Misidentifying the grain leads to double counting, fan-out, and incorrect aggregates.

---

## Sample Schema

```sql
CREATE TABLE user_activity (
    user_id     INT,
    activity_date DATE,
    activity_type VARCHAR(50),  -- 'login', 'purchase', 'page_view', 'signup'
    activity_id INT PRIMARY KEY
);

CREATE TABLE users (
    user_id     INT PRIMARY KEY,
    signup_date DATE,
    country     VARCHAR(50)
);
```

### Sample Data

```sql
-- user_activity: one row per activity event
INSERT INTO user_activity VALUES
(1, '2024-01-01', 'login',    1),
(1, '2024-01-01', 'purchase', 2),
(1, '2024-01-02', 'login',    3),
(1, '2024-01-05', 'login',    4),
(1, '2024-01-06', 'login',    5),
(1, '2024-01-07', 'login',    6),
(2, '2024-01-01', 'login',    7),
(2, '2024-01-03', 'login',    8),
(2, '2024-01-03', 'purchase', 9),
(2, '2024-01-10', 'login',   10),
(3, '2024-01-02', 'login',   11),
(3, '2024-01-03', 'login',   12),
(3, '2024-01-04', 'login',   13),
(4, '2024-01-01', 'login',   14),
(5, '2024-01-01', 'login',   15),
(5, '2024-01-01', 'purchase',16),
(5, '2024-01-02', 'login',   17),
(5, '2024-01-03', 'login',   18);

-- users
INSERT INTO users VALUES
(1, '2023-12-15', 'US'),
(2, '2023-12-20', 'US'),
(3, '2024-01-01', 'UK'),
(4, '2023-11-01', 'US'),
(5, '2023-12-25', 'UK');
```

**Grain:** One row in `user_activity` = one activity event by one user on one date.

---

## Core Concepts

### 1. Daily Active Users (DAU)

**What:** Count of distinct users who performed any activity on a given day.

**Why:** Fundamental engagement metric. Drives capacity planning and growth tracking.

```sql
SELECT
    activity_date,
    COUNT(DISTINCT user_id) AS dau
FROM user_activity
GROUP BY activity_date
ORDER BY activity_date;
```

| activity_date | dau |
|---|---|
| 2024-01-01 | 4 |
| 2024-01-02 | 3 |
| 2024-01-03 | 3 |
| 2024-01-04 | 1 |
| 2024-01-05 | 1 |
| 2024-01-06 | 1 |
| 2024-01-07 | 1 |
| 2024-01-10 | 1 |

> **Common mistake:** Using `COUNT(user_id)` instead of `COUNT(DISTINCT user_id)` when multiple activity events exist per user per day. On 2024-01-01, user 1 has 2 events and user 5 has 2 events — `COUNT(user_id)` would give 6, not 4.

### 2. Weekly / Monthly Active Users (WAU / MAU)

```sql
-- WAU: PostgreSQL example
SELECT
    DATE_TRUNC('week', activity_date)::DATE AS week_start,
    COUNT(DISTINCT user_id) AS wau
FROM user_activity
GROUP BY DATE_TRUNC('week', activity_date)
ORDER BY week_start;
```

```sql
-- MySQL example
SELECT
    DATE_SUB(activity_date, INTERVAL WEEKDAY(activity_date) DAY) AS week_start,
    COUNT(DISTINCT user_id) AS wau
FROM user_activity
GROUP BY DATE_SUB(activity_date, INTERVAL WEEKDAY(activity_date) DAY)
ORDER BY week_start;
```

```sql
-- SQL Server example
SELECT
    DATEADD(WEEK, DATEDIFF(WEEK, 0, activity_date), 0) AS week_start,
    COUNT(DISTINCT user_id) AS wau
FROM user_activity
GROUP BY DATEADD(WEEK, DATEDIFF(WEEK, 0, activity_date), 0)
ORDER BY week_start;
```

> **PostgreSQL:** `DATE_TRUNC('week', ...)` truncates to Monday by default.
> **MySQL:** `WEEKDAY()` returns 0=Monday, so `DATE_SUB(..., INTERVAL WEEKDAY(...) DAY)` gives Monday.
> **SQL Server:** `DATEADD(WEEK, DATEDIFF(WEEK, 0, ...), 0)` computes the Monday of that week.

### 3. DAU/WAU and DAU/MAU Ratios

These ratios measure **engagement stickiness**.

```sql
-- DAU/WAU ratio
WITH daily AS (
    SELECT activity_date, COUNT(DISTINCT user_id) AS dau
    FROM user_activity
    GROUP BY activity_date
),
weekly AS (
    SELECT
        DATE_TRUNC('week', activity_date)::DATE AS week_start,
        COUNT(DISTINCT user_id) AS wau
    FROM user_activity
    GROUP BY DATE_TRUNC('week', activity_date)
)
SELECT
    d.activity_date,
    d.dau,
    w.wau,
    ROUND(d.dau::NUMERIC / w.wau, 3) AS dau_wau_ratio
FROM daily d
JOIN weekly w ON d.activity_date >= w.week_start
              AND d.activity_date < w.week_start + INTERVAL '7 days'
ORDER BY d.activity_date;
```

---

## Common Patterns

### Pattern 1: Retention Analysis

**What:** Of users active on day N, how many returned on day N+1, N+7, N+30?

**Why:** Measures product stickiness and user loyalty.

#### Approach: Self-Join

```sql
WITH first_day AS (
    SELECT
        user_id,
        activity_date AS cohort_date
    FROM user_activity
    WHERE activity_type = 'login'
    GROUP BY user_id, activity_date
),
retention AS (
    SELECT
        f.cohort_date,
        DATEDIFF('day', f.cohort_date, a.activity_date) AS days_since,
        COUNT(DISTINCT a.user_id) AS retained_users
    FROM first_day f
    JOIN user_activity a
      ON f.user_id = a.user_id
     AND a.activity_date >= f.cohort_date
     AND a.activity_date <= f.cohort_date + INTERVAL '30 days'
GROUP BY f.cohort_date, DATEDIFF('day', f.cohort_date, a.activity_date)
)
SELECT * FROM retention
ORDER BY cohort_date, days_since;
```

> **Production pitfall:** This query can produce large intermediate results. Index on `(user_id, activity_date)` is critical.

#### Approach: Window Function (More Efficient)

```sql
WITH user_days AS (
    SELECT DISTINCT user_id, activity_date
    FROM user_activity
    WHERE activity_type = 'login'
),
cohort AS (
    SELECT
        user_id,
        MIN(activity_date) AS cohort_date
    FROM user_days
    GROUP BY user_id
),
retention AS (
    SELECT
        c.cohort_date,
        DATEDIFF('day', c.cohort_date, ud.activity_date) AS days_since,
        COUNT(DISTINCT ud.user_id) AS retained_users
    FROM cohort c
    JOIN user_days ud ON c.user_id = ud.user_id
    WHERE ud.activity_date >= c.cohort_date
    GROUP BY c.cohort_date, DATEDIFF('day', c.cohort_date, ud.activity_date)
)
SELECT * FROM retention ORDER BY cohort_date, days_since;
```

**Expected Output (sample):**

| cohort_date | days_since | retained_users |
|---|---|---|
| 2024-01-01 | 0 | 4 |
| 2024-01-01 | 1 | 2 |
| 2024-01-01 | 4 | 1 |
| 2024-01-01 | 5 | 1 |
| 2024-01-01 | 6 | 1 |
| 2024-01-02 | 0 | 3 |
| 2024-01-02 | 1 | 1 |

---

### Pattern 2: Consecutive Day Activity (Streaks)

**What:** Find the longest consecutive-day streak for each user.

**Why:** Measures habitual engagement. Common interview question.

#### Core Technique: Row Number Grouping

The key insight: if you subtract a row number from the date, consecutive dates produce the same value.

```sql
WITH user_days AS (
    SELECT DISTINCT user_id, activity_date
    FROM user_activity
),
grouped AS (
    SELECT
        user_id,
        activity_date,
        activity_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        )::INT AS grp   -- PostgreSQL: date - integer
    FROM user_days
)
SELECT
    user_id,
    MIN(activity_date) AS streak_start,
    MAX(activity_date) AS streak_end,
    COUNT(*) AS streak_length
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_length DESC;
```

> **PostgreSQL:** `DATE - INTEGER` works. Date arithmetic returns an integer for date subtraction.
> **MySQL:** Use `DATE_SUB(activity_date, INTERVAL ROW_NUMBER() ... DAY)`.
> **SQL Server:** Use `DATEADD(DAY, -ROW_NUMBER() ..., activity_date)`.

**Expected Output:**

| user_id | streak_start | streak_end | streak_length |
|---|---|---|---|
| 1 | 2024-01-01 | 2024-01-02 | 2 |
| 1 | 2024-01-05 | 2024-01-07 | 3 |
| 2 | 2024-01-01 | 2024-01-01 | 1 |
| 2 | 2024-01-03 | 2024-01-03 | 1 |
| 2 | 2024-01-10 | 2024-01-10 | 1 |
| 3 | 2024-01-02 | 2024-01-04 | 3 |
| 4 | 2024-01-01 | 2024-01-01 | 1 |
| 5 | 2024-01-01 | 2024-01-03 | 3 |

#### Maximum Streak Per User

```sql
WITH user_days AS (
    SELECT DISTINCT user_id, activity_date
    FROM user_activity
),
grouped AS (
    SELECT
        user_id,
        activity_date,
        activity_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        )::INT AS grp
    FROM user_days
),
streaks AS (
    SELECT
        user_id,
        MIN(activity_date) AS streak_start,
        MAX(activity_date) AS streak_end,
        COUNT(*) AS streak_length
    FROM grouped
    GROUP BY user_id, grp
)
SELECT
    user_id,
    streak_length AS max_streak,
    streak_start,
    streak_end
FROM streaks
WHERE (user_id, streak_length) IN (
    SELECT user_id, MAX(streak_length) FROM streaks GROUP BY user_id
)
ORDER BY user_id;
```

---

### Pattern 3: Day-over-Day Retention (D1, D7, D30)

```sql
WITH first_activity AS (
    SELECT user_id, MIN(activity_date) AS first_date
    FROM user_activity
    GROUP BY user_id
),
retention_flags AS (
    SELECT
        fa.user_id,
        fa.first_date,
        CASE WHEN EXISTS (
            SELECT 1 FROM user_activity a
            WHERE a.user_id = fa.user_id
              AND a.activity_date = fa.first_date + 1
        ) THEN 1 ELSE 0 END AS d1_retained,
        CASE WHEN EXISTS (
            SELECT 1 FROM user_activity a
            WHERE a.user_id = fa.user_id
              AND a.activity_date = fa.first_date + 7
        ) THEN 1 ELSE 0 END AS d7_retained,
        CASE WHEN EXISTS (
            SELECT 1 FROM user_activity a
            WHERE a.user_id = fa.user_id
              AND a.activity_date = fa.first_date + 30
        ) THEN 1 ELSE 0 END AS d30_retained
    FROM first_activity fa
)
SELECT
    first_date,
    COUNT(*) AS cohort_size,
    SUM(d1_retained) AS d1_count,
    SUM(d7_retained) AS d7_count,
    SUM(d30_retained) AS d30_count,
    ROUND(SUM(d1_retained)::NUMERIC / COUNT(*), 3) AS d1_rate,
    ROUND(SUM(d7_retained)::NUMERIC / COUNT(*), 3) AS d7_rate,
    ROUND(SUM(d30_retained)::NUMERIC / COUNT(*), 3) AS d30_rate
FROM retention_flags
GROUP BY first_date
ORDER BY first_date;
```

> **Interview trap:** Forgetting that `first_date + 1` might not exist in the data. The `EXISTS` subquery handles this correctly — if the user wasn't active on that day, the flag is 0.

---

### Pattern 4: Active N of Last M Days

**Problem:** Find users who were active on at least N of the last M days.

```sql
WITH date_range AS (
    SELECT MAX(activity_date) AS max_date
    FROM user_activity
),
recent_activity AS (
    SELECT
        ua.user_id,
        COUNT(DISTINCT ua.activity_date) AS active_days
    FROM user_activity ua
    CROSS JOIN date_range dr
    WHERE ua.activity_date > dr.max_date - INTERVAL '30 days'
    GROUP BY ua.user_id
)
SELECT user_id, active_days
FROM recent_activity
WHERE active_days >= 5
ORDER BY active_days DESC;
```

---

### Pattern 5: Users Who Performed All Activities

**Problem:** Find users who performed every activity type. This is the relational division problem.

#### Approach: COUNT(DISTINCT) with HAVING

```sql
SELECT user_id
FROM user_activity
GROUP BY user_id
HAVING COUNT(DISTINCT activity_type) = (SELECT COUNT(DISTINCT activity_type) FROM user_activity);
```

**Expected Output:** Users 1, 2, and 5 (all have 'login' + 'purchase'). Wait — user 2 only has 'login' and 'purchase'. Let's check: user 1 has 'login' + 'purchase', user 2 has 'login' + 'purchase', user 5 has 'login' + 'purchase'. The total distinct activity types are 4: 'login', 'purchase', 'page_view', 'signup'. So no user qualifies.

If we only check for 'login' and 'purchase':

```sql
SELECT user_id
FROM user_activity
WHERE activity_type IN ('login', 'purchase')
GROUP BY user_id
HAVING COUNT(DISTINCT activity_type) = 2;
```

| user_id |
|---|
| 1 |
| 2 |
| 5 |

#### Approach: INTERSECT

```sql
SELECT user_id FROM user_activity WHERE activity_type = 'login'
INTERSECT
SELECT user_id FROM user_activity WHERE activity_type = 'purchase';
```

> **Common misconception:** `IN` and `EXISTS` don't solve relational division well. `HAVING COUNT(DISTINCT)` is typically the cleanest approach.

---

### Pattern 6: Session Reconstruction

**What:** Define sessions as contiguous periods where a user is active, with gaps > 30 minutes considered new sessions.

> **Note:** This pattern requires timestamp-level data, not just dates. We assume `activity_ts` exists.

```sql
-- Hypothetical schema with timestamps
-- activity_ts TIMESTAMP

WITH lagged AS (
    SELECT
        user_id,
        activity_ts,
        LAG(activity_ts) OVER (PARTITION BY user_id ORDER BY activity_ts) AS prev_ts
    FROM user_activity_with_time
),
flagged AS (
    SELECT
        user_id,
        activity_ts,
        CASE
            WHEN prev_ts IS NULL THEN 1
            WHEN activity_ts - prev_ts > INTERVAL '30 minutes' THEN 1
            ELSE 0
        END AS new_session
    FROM lagged
),
session_ids AS (
    SELECT
        user_id,
        activity_ts,
        SUM(new_session) OVER (
            PARTITION BY user_id ORDER BY activity_ts
        ) AS session_num
    FROM flagged
)
SELECT
    user_id,
    session_num,
    MIN(activity_ts) AS session_start,
    MAX(activity_ts) AS session_end,
    COUNT(*) AS events_in_session
FROM session_ids
GROUP BY user_id, session_num;
```

> **Production pitfall:** Session window size (30 minutes, 15 minutes, etc.) varies by company. Always clarify the business definition.

---

## Advanced Patterns

### Pattern 7: Consecutive Purchases (Gap-and-Island on Purchases)

```sql
WITH purchases AS (
    SELECT DISTINCT user_id, activity_date
    FROM user_activity
    WHERE activity_type = 'purchase'
),
grouped AS (
    SELECT
        user_id,
        activity_date,
        activity_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        )::INT AS grp
    FROM purchases
)
SELECT
    user_id,
    MIN(activity_date) AS purchase_start,
    MAX(activity_date) AS purchase_end,
    COUNT(*) AS consecutive_days
FROM grouped
GROUP BY user_id, grp
HAVING COUNT(*) > 1
ORDER BY user_id;
```

**Expected Output:** User 5 purchased on 2024-01-01 only, so no consecutive purchase streak > 1. User 1 purchased on 2024-01-01 only. No consecutive purchase streaks exist in sample data.

---

### Pattern 8: Rolling Aggregates

**Problem:** Compute a 7-day rolling average of DAU.

```sql
WITH daily AS (
    SELECT
        activity_date,
        COUNT(DISTINCT user_id) AS dau
    FROM user_activity
    GROUP BY activity_date
)
SELECT
    activity_date,
    dau,
    AVG(dau) OVER (
        ORDER BY activity_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7d_avg
FROM daily
ORDER BY activity_date;
```

> **Interview trap:** The first few rows will have a rolling average over fewer than 7 days. Some interviewers expect you to filter `ROW_NUMBER() OVER (ORDER BY activity_date) >= 7` to only return full windows.

---

### Pattern 9: Time-to-First-Action

```sql
WITH first_action AS (
    SELECT
        user_id,
        MIN(activity_date) AS first_action_date
    FROM user_activity
    GROUP BY user_id
)
SELECT
    u.user_id,
    u.signup_date,
    fa.first_action_date,
    fa.first_action_date - u.signup_date AS days_to_first_action
FROM users u
JOIN first_action fa ON u.user_id = fa.user_id
ORDER BY days_to_first_action DESC;
```

| user_id | signup_date | first_action_date | days_to_first_action |
|---|---|---|---|
| 4 | 2023-11-01 | 2024-01-01 | 61 |
| 2 | 2023-12-20 | 2024-01-01 | 12 |
| 1 | 2023-12-15 | 2024-01-01 | 17 |
| 5 | 2023-12-25 | 2024-01-01 | 7 |
| 3 | 2024-01-01 | 2024-01-02 | 1 |

---

### Pattern 10: User Lifespan and Churn

```sql
WITH user_stats AS (
    SELECT
        user_id,
        MIN(activity_date) AS first_active,
        MAX(activity_date) AS last_active,
        COUNT(DISTINCT activity_date) AS active_days
    FROM user_activity
    GROUP BY user_id
),
latest_date AS (
    SELECT MAX(activity_date) AS max_date FROM user_activity
)
SELECT
    us.user_id,
    us.first_active,
    us.last_active,
    us.active_days,
    us.last_active - us.first_active AS lifespan_days,
    ld.max_date - us.last_active AS days_since_last_active,
    CASE
        WHEN ld.max_date - us.last_active > 7 THEN 'churned'
        ELSE 'active'
    END AS status
FROM user_stats us
CROSS JOIN latest_date ld
ORDER BY days_since_last_active DESC;
```

**Expected Output:**

| user_id | first_active | last_active | active_days | lifespan_days | days_since_last_active | status |
|---|---|---|---|---|---|---|
| 2 | 2024-01-01 | 2024-01-10 | 3 | 9 | 0 | active |
| 4 | 2024-01-01 | 2024-01-01 | 1 | 0 | 9 | churned |
| 1 | 2024-01-01 | 2024-01-07 | 5 | 6 | 3 | active |
| 3 | 2024-01-02 | 2024-01-04 | 3 | 2 | 6 | active |
| 5 | 2024-01-01 | 2024-01-03 | 3 | 2 | 7 | active |

---

## Edge Cases

### Edge Case 1: Users Active on Multiple Days with Multiple Events

User 1 on 2024-01-01 has both 'login' and 'purchase'. When computing DAU, `COUNT(DISTINCT user_id)` correctly counts them once. `COUNT(user_id)` would incorrectly count them twice.

### Edge Case 2: Single-Day Streak

User 4 is active only on 2024-01-01. Their max streak is 1. The streak query handles this correctly — the row number trick produces a single-row group.

### Edge Case 3: Large Gaps

User 2 is active on 2024-01-01, then not again until 2024-01-03, then not until 2024-01-10. Each is a separate streak of length 1.

### Edge Case 4: NULL activity_type

If `activity_type` is NULL:

```sql
SELECT user_id, activity_date, COUNT(DISTINCT activity_type)
FROM user_activity
GROUP BY user_id, activity_date;
```

`COUNT(DISTINCT activity_type)` **ignores** NULLs. This means a user with only NULL activity types would get `COUNT(DISTINCT activity_type) = 0`.

> **Common mistake:** Using `COUNT(DISTINCT activity_type) = total_activity_types` to find users with all activities. A user with NULL in some rows would be incorrectly excluded or included depending on the total count.

### Edge Case 5: No Activities in Date Range

If you `LEFT JOIN` user_activity to a calendar and a user has no activities on a day, the count is 0. Using `INNER JOIN` would silently drop those days.

---

## NULL Behavior

| Expression | Behavior |
|---|---|
| `NULL = NULL` | `NULL` (not TRUE!) |
| `NULL <> NULL` | `NULL` (not TRUE!) |
| `NULL IN (1, 2, NULL)` | `NULL` if no match, `TRUE` if match found |
| `NOT IN (1, 2, NULL)` | Always `NULL` if list contains NULL |
| `COUNT(NULL)` | 0 (ignores NULLs) |
| `COUNT(*)` | Counts all rows including NULLs |
| `COUNT(DISTINCT col)` | Ignores NULL values |

> **Interview trap:** `WHERE activity_type NOT IN ('login', NULL)` returns **no rows**, not rows with other activity types. This is because `NOT IN` with NULL in the list always evaluates to NULL/UNKNOWN.

> **See also:** [NULL section](../03-NULL-and-Three-Valued-Logic/) for full treatment.

---

## Common Mistakes

### Mistake 1: Forgetting DISTINCT

```sql
-- BAD: counts activity events, not unique users
SELECT activity_date, COUNT(user_id)
FROM user_activity
GROUP BY activity_date;

-- GOOD: counts unique users
SELECT activity_date, COUNT(DISTINCT user_id)
FROM user_activity
GROUP BY activity_date;
```

### Mistake 2: Using WHERE Instead of HAVING for Group Filters

```sql
-- BAD: filters rows before aggregation
SELECT user_id, COUNT(*) AS cnt
FROM user_activity
WHERE COUNT(*) > 3
GROUP BY user_id;

-- GOOD: filters after aggregation
SELECT user_id, COUNT(*) AS cnt
FROM user_activity
GROUP BY user_id
HAVING COUNT(*) > 3;
```

### Mistake 3: Mixing Grain Levels

```sql
-- BAD: joining events table to users without considering grain
-- This can produce fan-out if users have multiple events
SELECT u.user_id, COUNT(*)
FROM users u
JOIN user_activity ua ON u.user_id = ua.user_id
GROUP BY u.user_id;

-- BETTER: be explicit about what you're counting
SELECT ua.user_id, COUNT(DISTINCT ua.activity_date) AS active_days
FROM user_activity ua
GROUP BY ua.user_id;
```

### Mistake 4: Forgetting to Deduplicate for Streaks

```sql
-- BAD: streak query without DISTINCT on (user_id, activity_date)
-- User 1 has 2 events on 2024-01-01, would break the row number trick
WITH grouped AS (
    SELECT
        user_id,
        activity_date,
        activity_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        )::INT AS grp
    FROM user_activity  -- has duplicates per (user_id, activity_date)
)
SELECT user_id, MIN(activity_date), MAX(activity_date), COUNT(*)
FROM grouped
GROUP BY user_id, grp;

-- GOOD: deduplicate first
WITH user_days AS (
    SELECT DISTINCT user_id, activity_date FROM user_activity
),
grouped AS (
    SELECT
        user_id,
        activity_date,
        activity_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        )::INT AS grp
    FROM user_days
)
SELECT user_id, MIN(activity_date), MAX(activity_date), COUNT(*)
FROM grouped
GROUP BY user_id, grp;
```

> **Production pitfall:** The streak query without deduplication can silently produce wrong results. User 1 on 2024-01-01 with 2 events would produce incorrect group boundaries.

---

## Production Pitfalls

### Pitfall 1: Missing Indexes

For user activity queries, the most important index is:

```sql
CREATE INDEX idx_activity_user_date ON user_activity(user_id, activity_date);
CREATE INDEX idx_activity_date_user ON user_activity(activity_date, user_id);
```

The first helps streak and retention queries (filtered by user). The second helps DAU queries (filtered by date).

### Pitfall 2: Full Table Scans on Large Tables

Activity tables can have billions of rows. Without proper indexing and partitioning, a simple DAU query can scan the entire table.

> **Verify with:** `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL/SQL Server/Oracle). Check for sequential scans vs. index scans.

### Pitfall 3: Timezone Issues

Activity timestamps may be stored in UTC but reports may need a specific timezone. Mixing timezones leads to users appearing active on wrong days.

```sql
-- PostgreSQL: convert to a timezone
SELECT
    (activity_ts AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')::DATE AS local_date,
    user_id
FROM user_activity_with_time;
```

### Pitfall 4: Date Boundary Definitions

"Last 7 days" is ambiguous. Does it mean:
- The last 7 calendar days from today?
- The last 7 days including today?
- The 7 days before today (not including today)?

Always be explicit:

```sql
-- Last 7 complete days (excluding today)
WHERE activity_date >= CURRENT_DATE - INTERVAL '7 days'
  AND activity_date < CURRENT_DATE
```

---

## Performance Implications

### What to Verify with Execution Plans

1. **Index usage** — Is the query using the `(user_id, activity_date)` index or doing a sequential scan?
2. **Sort operations** — Are window functions causing large sorts that spill to disk?
3. **Join strategy** — Is the self-join for retention using a hash join or nested loop?
4. **Cardinality estimates** — Does the optimizer correctly estimate the number of rows?
5. **Parallelism** — Is the query using parallel workers for large aggregations?

### Performance Tips

| Technique | When It Helps |
|---|---|
| `DISTINCT` before JOIN | Reduces join input size |
| CTE with early filtering | Limits data before expensive operations |
| Composite index `(user_id, activity_date)` | Covers most user activity queries |
| Partitioning by `activity_date` | Prunes partitions for date-range queries |
| Materialized views for DAU | Pre-aggregate for dashboards |

> **Do not make absolute claims** like "window functions are always faster than self-joins." Benchmark with `EXPLAIN ANALYZE` on your specific data.

---

## Comparison Tables

### Retention Approaches

| Approach | Pros | Cons |
|---|---|---|
| Self-Join | Intuitive | Can be slow on large data |
| EXISTS subquery | Short-circuit evaluation | Harder to extend to N-day retention |
| Window function + CASE | Flexible, single pass | Complex syntax |

### Streak Detection

| Approach | Pros | Cons |
|---|---|---|
| Row Number trick | Efficient, standard SQL | Requires date arithmetic (varies by DB) |
| Recursive CTE | Works with complex conditions | Slower, harder to read |
| LAG + manual comparison | Explicit | Requires more code for grouping |

### Activity Counting

| Method | What It Counts | When to Use |
|---|---|---|
| `COUNT(*)` | All rows (including NULLs) | Counting events |
| `COUNT(col)` | Non-NULL values | Counting specific events |
| `COUNT(DISTINCT col)` | Unique non-NULL values | Counting unique users, dates |

---

## Interview Questions

### Beginner

1. Write a query to find the daily active users (DAU) for each day.
2. Write a query to find the total number of active days per user.
3. Write a query to find users who signed up but never had any activity.
4. Write a query to count the number of activity events per user.

### Intermediate

5. Write a query to compute day-over-day DAU change.
6. Write a query to find users active on consecutive days (any streak > 1).
7. Write a query to find the first activity date and last activity date for each user.
8. Write a query to find the percentage of users who were active on the day after their first activity.
9. Write a query to find users who were active on every day in the month of January 2024.
10. Write a query to compute a 7-day rolling average of DAU.

### Advanced

11. Write a query to find the longest consecutive-day streak for each user.
12. Write a query to compute retention rates (D1, D7, D30) for each cohort.
13. Write a query to find users whose activity pattern changed (e.g., from daily to weekly).
14. Write a query to detect anomalous activity days (e.g., more than 2 standard deviations above mean DAU).
15. Write a query to reconstruct sessions from activity events with a 30-minute inactivity threshold.

### Scenario Based

16. **Engagement funnel:** Given `user_activity` with types 'signup', 'page_view', 'add_to_cart', 'purchase', find the conversion rate at each stage.
17. **Power users:** Find users who were active on more than 80% of days in the last 30 days.
18. **Churn prediction:** Identify users whose activity frequency has decreased by more than 50% compared to their first 7 days.
19. **Cohort analysis:** Group users by their signup week and compute weekly retention for each cohort.
20. **Activity sequences:** Find users who performed 'page_view' before 'purchase' on the same day.

### Tricky

21. What does `COUNT(DISTINCT activity_type)` return for a user with only NULL activity types?
22. How does the streak query behave when a user has two different activities on the same day?
23. Why might `NOT IN (1, 2, NULL)` return zero rows even when there are matching rows?
24. What is the difference between `MAX(activity_date) - MIN(activity_date)` and counting distinct active days?
25. How does the retention query handle users whose first activity was on the most recent day in the data?

### Output Prediction

Given the sample data in this section, predict the output of:

```sql
SELECT
    user_id,
    COUNT(DISTINCT activity_date) AS active_days,
    MIN(activity_date) AS first_active,
    MAX(activity_date) AS last_active
FROM user_activity
GROUP BY user_id
HAVING COUNT(DISTINCT activity_date) >= 3
ORDER BY active_days DESC;
```

### Debugging

26. This query is supposed to find users active on consecutive days but returns incorrect results. Find the bug:

```sql
WITH grouped AS (
    SELECT
        user_id,
        activity_date,
        activity_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        ) AS grp
    FROM user_activity
)
SELECT user_id, MIN(activity_date), MAX(activity_date), COUNT(*)
FROM grouped
GROUP BY user_id, grp
HAVING COUNT(*) > 1;
```

27. This retention query returns duplicate rows. Why?

```sql
SELECT
    f.user_id,
    f.activity_date AS cohort_date,
    a.activity_date AS return_date
FROM user_activity f
JOIN user_activity a ON f.user_id = a.user_id
WHERE f.activity_date = '2024-01-01'
  AND a.activity_date = '2024-01-02';
```

### Performance

28. You have a `user_activity` table with 1 billion rows. Which index would most improve DAU query performance?
29. Why might a window function approach be faster than a self-join for retention analysis?
30. How would you verify that your streak query is using the correct index? What would you look for in the execution plan?
