# 60 — Timezone Pitfalls

## Fundamentals

Timezones are one of the most treacherous areas in SQL. They cause silent data corruption, incorrect aggregations, and subtle bugs that only manifest across daylight saving transitions or when users span multiple timezones.

**What is a timezone?**
A timezone is a region of the world that observes a uniform standard time. Timezones are defined as offsets from Coordinated Universal Time (UTC). However, they're more than simple offsets — they include historical changes, daylight saving time (DST) rules, and political decisions.

**Why do timezone issues exist?**

1. The same moment in time is represented differently across timezones
2. Local times are ambiguous during DST transitions (fall back) or nonexistent (spring forward)
3. Databases store timestamps differently (with/without timezone info)
4. Application code may assume a timezone that doesn't match the database
5. Date arithmetic behaves differently depending on timezone context

---

## Core Concepts

### UTC vs Local Time

| Concept        | Description                      | Example                                      |
| -------------- | -------------------------------- | -------------------------------------------- |
| **UTC**        | Universal reference time, no DST | `2024-03-10 07:30:00 UTC`                    |
| **Local time** | Time in a specific timezone      | `2024-03-10 02:30:00 America/New_York` (EST) |
| **Offset**     | Hours from UTC                   | `+00:00`, `-05:00`, `+05:30`                 |
| **TZ name**    | IANA timezone identifier         | `America/New_York`, `Asia/Kolkata`           |

**Critical insight:** `TIMESTAMP WITHOUT TIME ZONE` and `TIMESTAMP WITH TIME ZONE` store fundamentally different information. The former is a "wall clock" value; the latter is an absolute moment in time.

---

## Database-Specific Behavior

| Feature                       | PostgreSQL    | MySQL                 | SQL Server       | Oracle                      |
| ----------------------------- | ------------- | --------------------- | ---------------- | --------------------------- |
| `TIMESTAMP WITH TIME ZONE`    | `TIMESTAMPTZ` | `TIMESTAMP` (with tz) | `DATETIMEOFFSET` | `TIMESTAMP WITH TIME ZONE`  |
| `TIMESTAMP WITHOUT TIME ZONE` | `TIMESTAMP`   | `DATETIME`            | `DATETIME2`      | `TIMESTAMP`                 |
| `TIME` type (no date)         | `TIME`        | `TIME`                | `TIME`           | `INTERVAL` (no native TIME) |
| Default timezone              | Server/client | Session               | Server           | Session                     |
| DST handling                  | Automatic     | Automatic             | Automatic        | Automatic                   |
| Interval type                 | `INTERVAL`    | No                    | No               | `INTERVAL`                  |
| AT TIME ZONE syntax           | Yes           | No                    | No               | `AT TIME ZONE`              |

### PostgreSQL

```sql
-- TIMESTAMP WITHOUT TIME ZONE: stores the literal value, no conversion
CREATE TABLE events_utc (
    id SERIAL PRIMARY KEY,
    event_time TIMESTAMP WITHOUT TIME ZONE
);

-- TIMESTAMP WITH TIME ZONE: stores in UTC internally, converts on output
CREATE TABLE events_tz (
    id SERIAL PRIMARY KEY,
    event_time TIMESTAMP WITH TIME ZONE
);
```

### MySQL

```sql
-- MySQL TIMESTAMP: stored as UTC internally, displayed in session timezone
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_time TIMESTAMP NOT NULL
);

-- MySQL DATETIME: stored as-is, no timezone conversion
CREATE TABLE events_local (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_time DATETIME NOT NULL
);
```

### SQL Server

```sql
-- DATETIME2: no timezone info
-- DATETIMEOFFSET: stores UTC offset alongside the datetime
CREATE TABLE events (
    id INT IDENTITY PRIMARY KEY,
    event_time DATETIMEOFFSET NOT NULL
);
```

---

## Sample Tables

```sql
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    hire_date DATE,
    timezone VARCHAR(50)  -- IANA timezone name
);

INSERT INTO employees VALUES
(1, 'Alice Johnson', 'Engineering', '2022-01-15', 'America/New_York'),
(2, 'Bob Smith', 'Engineering', '2022-03-20', 'America/Los_Angeles'),
(3, 'Carol Davis', 'Marketing', '2021-11-01', 'Europe/London'),
(4, 'David Chen', 'Engineering', '2023-06-10', 'Asia/Shanghai'),
(5, 'Eva Martinez', 'Sales', '2022-09-05', 'America/Chicago'),
(6, 'Frank Wilson', 'Marketing', '2023-01-25', 'Australia/Sydney');

CREATE TABLE meetings (
    meeting_id INT PRIMARY KEY,
    organizer_id INT REFERENCES employees(employee_id),
    title VARCHAR(200),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INT
);

INSERT INTO meetings VALUES
(1, 1, 'Sprint Planning', '2024-03-10 14:00:00-05:00', 60),
(2, 3, 'Marketing Sync', '2024-03-10 14:00:00+00:00', 45),
(3, 4, 'Design Review', '2024-03-11 09:00:00+08:00', 90),
(4, 5, 'Sales Standup', '2024-03-10 14:00:00-05:00', 30),
(5, 2, 'Code Review', '2024-03-10 12:30:00-07:00', 45);

CREATE TABLE login_history (
    login_id INT PRIMARY KEY,
    user_id INT REFERENCES employees(employee_id),
    login_time TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45)
);

INSERT INTO login_history VALUES
(1, 1, '2024-03-10 09:15:00-05:00', '192.168.1.10'),
(2, 2, '2024-03-10 09:15:00-07:00', '10.0.0.22'),
(3, 3, '2024-03-10 14:30:00+00:00', '172.16.0.5'),
(4, 4, '2024-03-11 05:00:00+08:00', '192.168.5.1'),
(5, 5, '2024-03-10 10:00:00-05:00', '10.0.1.33');
```

**Grain:**

- `employees`: One row per employee
- `meetings`: One row per meeting, `scheduled_at` is the absolute moment
- `login_history`: One row per login event

---

## Pitfall 1: Storing Local Time as If It Were UTC

**BAD APPROACH:**

```sql
-- Storing "09:00" as if it were UTC, but it's actually New York local time
CREATE TABLE events_bad (
    event_time TIMESTAMP WITHOUT TIME ZONE
);

INSERT INTO events_bad VALUES ('2024-03-10 09:00:00');
-- This stores 09:00 literally — no timezone info attached

-- Later, someone interprets it as UTC
-- 09:00 UTC = 04:00 New York (EST) — WRONG! The actual event was at 09:00 ET
```

**BETTER APPROACH:**

```sql
-- Store with explicit timezone offset
CREATE TABLE events_good (
    event_time TIMESTAMP WITH TIME ZONE
);

INSERT INTO events_good VALUES ('2024-03-10 09:00:00-05:00');
-- Internally stored as 2024-03-10 14:00:00 UTC
-- Can be correctly converted to any timezone
```

**Why this matters:**
When DST transitions occur, the offset changes. `09:00` in New York is `-05:00` in winter but `-04:00` in summer. Without timezone info, you lose this context.

---

## Pitfall 2: Comparing Timestamps Across Timezones

**BAD APPROACH:**

```sql
-- "Find meetings at 2 PM" — but 2 PM in which timezone?
SELECT * FROM meetings
WHERE EXTRACT(HOUR FROM scheduled_at) = 14;
```

This returns meetings where the _stored_ hour is 14, which depends on how the timestamp was inserted and how the database displays it. In PostgreSQL with `TIMESTAMPTZ`, `EXTRACT(HOUR ...)` operates on the _session_ timezone, not the original timezone.

**BETTER APPROACH:**

```sql
-- Convert to a specific timezone before comparing
SELECT * FROM meetings
WHERE EXTRACT(HOUR FROM scheduled_at AT TIME ZONE 'America/New_York') = 14;
```

---

## Pitfall 3: Session Timezone Affects Everything

In PostgreSQL, the session timezone affects how `TIMESTAMPTZ` values are displayed and how `EXTRACT` operates:

```sql
-- PostgreSQL example
SHOW timezone;  -- Might be 'UTC'

-- Insert a timestamp
INSERT INTO meetings (organizer_id, title, scheduled_at, duration_minutes)
VALUES (1, 'Test Meeting', '2024-03-10 14:00:00-05:00', 60);

-- With UTC session:
SET timezone = 'UTC';
SELECT scheduled_at FROM meetings WHERE meeting_id = 1;
-- Output: 2024-03-10 19:00:00+00

-- With New York session:
SET timezone = 'America/New_York';
SELECT scheduled_at FROM meetings WHERE meeting_id = 1;
-- Output: 2024-03-10 14:00:00-04  (note: DST started March 10, 2024 at 2 AM)

-- The SAME stored value displays differently!
```

> **Production pitfall:** If your application connects with different timezone settings across servers, queries may return different results. Always set the connection timezone explicitly.

---

## Pitfall 4: DST Transition — Fall Back (Ambiguous Time)

During the fall-back transition, the same local time occurs twice:

```
2024-11-03 01:30:00 EDT  (UTC-4)  -- First occurrence
2024-11-03 01:30:00 EST  (UTC-5)  -- Second occurrence
```

**What happens in databases:**

```sql
-- PostgreSQL: picks the first occurrence (before transition)
INSERT INTO meetings (organizer_id, title, scheduled_at, duration_minutes)
VALUES (1, 'Ambiguous Meeting', '2024-11-03 01:30:00 America/New_York', 60);

-- The stored value will be one of the two — you've lost information
```

**BETTER APPROACH:**

```sql
-- Always store as UTC to avoid ambiguity
INSERT INTO meetings (organizer_id, title, scheduled_at, duration_minutes)
VALUES (1, 'Clear Meeting', '2024-11-03 06:30:00+00:00', 60);
-- 06:30 UTC = 01:30 EDT (first) or 01:30 EST (second) — unambiguous
```

---

## Pitfall 5: DST Transition — Spring Forward (Nonexistent Time)

During spring-forward, the clock jumps ahead:

```
2024-03-10 02:00:00 EST  ->  2024-03-10 03:00:00 EDT
```

The hour from 2:00 to 3:00 never exists.

```sql
-- This time DOES NOT EXIST
INSERT INTO meetings (organizer_id, title, scheduled_at, duration_minutes)
VALUES (1, 'Ghost Meeting', '2024-03-10 02:30:00 America/New_York', 60);
```

**Database behavior:**

- **PostgreSQL:** Adjusts forward to `03:30:00 EDT`
- **MySQL:** Silently stores `02:30:00` without DST awareness in `DATETIME`
- **SQL Server:** Depends on `DATETIME2` vs `DATETIMEOFFSET`

> **Production pitfall:** Scheduled jobs set during nonexistent times may execute at unexpected times or fail silently.

---

## Pitfall 6: Date Boundaries Shift With Timezone

**BAD APPROACH:**

```sql
-- "Get all meetings today"
-- This assumes the session timezone matches the meeting timezone
SELECT * FROM meetings
WHERE scheduled_at::date = CURRENT_DATE;
```

**Problem:** If the session is UTC and a meeting is at `2024-03-10 01:00:00-05:00` (which is `2024-03-10 06:00:00 UTC`), it will appear under March 10 in both timezones. But a meeting at `2024-03-10 23:00:00-05:00` (which is `2024-03-11 04:00:00 UTC`) will be March 10 in New York but March 11 in UTC.

**BETTER APPROACH:**

```sql
-- Convert to the employee's timezone before comparing dates
SELECT m.*, e.timezone
FROM meetings m
JOIN employees e ON m.organizer_id = e.employee_id
WHERE (m.scheduled_at AT TIME ZONE e.timezone)::date = CURRENT_DATE;
```

**Key insight:** When you do `scheduled_at AT TIME ZONE 'America/New_York'`, PostgreSQL converts the `TIMESTAMPTZ` to a `TIMESTAMP WITHOUT TIME ZONE` representing the local wall clock time in that zone. This is intentional and useful for date-based filtering.

---

## Pitfall 7: DATE vs TIMESTAMP Conversion

```sql
-- What happens here?
SELECT TIMESTAMP '2024-03-10 00:00:00' AT TIME ZONE 'America/New_York';
-- Result: 2024-03-10 05:00:00+00 (UTC)
-- The date was interpreted as LOCAL time in New York, then converted to UTC

-- What about this?
SELECT TIMESTAMP '2024-03-10 00:00:00' AT TIME ZONE 'UTC';
-- Result: 2024-03-10 00:00:00+00
-- Same literal, different interpretation!
```

> **Interview trap:** `AT TIME ZONE` in PostgreSQL behaves differently depending on whether the input is `TIMESTAMPTZ` or `TIMESTAMP`. With `TIMESTAMPTZ`, it _converts_ to the target timezone. With `TIMESTAMP`, it _assumes_ the input is in the target timezone and converts to UTC.

---

## Pitfall 8: Midnight Boundaries

```sql
-- Sessions crossing midnight
SELECT * FROM login_history
WHERE login_time >= '2024-03-10 00:00:00'
  AND login_time < '2024-03-11 00:00:00';
```

This filter operates on absolute UTC time. A user logging in at `2024-03-09 23:30:00-05:00` (which is `2024-03-10 04:30:00 UTC`) would be included. A user logging in at `2024-03-10 23:30:00+00:00` (which is still March 10 UTC) would also be included.

**If you want local-day filtering:**

```sql
-- Filter by the user's local date
SELECT lh.*, e.timezone
FROM login_history lh
JOIN employees e ON lh.user_id = e.employee_id
WHERE (lh.login_time AT TIME ZONE e.timezone)::date = DATE '2024-03-10';
```

---

## Pitfall 9: GROUP BY With Timezone Conversion

**BAD APPROACH:**

```sql
-- Grouping by hour in UTC — may not match business hours
SELECT
    EXTRACT(HOUR FROM login_time) AS hour_utc,
    COUNT(*) AS login_count
FROM login_history
GROUP BY EXTRACT(HOUR FROM login_time)
ORDER BY hour_utc;
```

**BETTER APPROACH:**

```sql
-- Group by hour in each user's local timezone
SELECT
    e.timezone,
    EXTRACT(HOUR FROM lh.login_time AT TIME ZONE e.timezone) AS local_hour,
    COUNT(*) AS login_count
FROM login_history lh
JOIN employees e ON lh.user_id = e.employee_id
GROUP BY e.timezone, EXTRACT(HOUR FROM lh.login_time AT TIME ZONE e.timezone)
ORDER BY e.timezone, local_hour;
```

---

## Pitfall 10: Interval Arithmetic Across DST

```sql
-- Adding an interval to a timestamp may cross a DST boundary
SELECT TIMESTAMP WITH TIME ZONE '2024-03-10 01:30:00-05:00' + INTERVAL '1 hour';
-- Result: 2024-03-10 03:30:00-04:00 (DST started, offset changed!)

-- The wall clock time jumped by 2 hours, not 1!
-- 01:30 EST + 1 hour = 03:30 EDT
```

**Why:** The interval is absolute (1 real hour), but the local representation shifts due to DST. This is correct behavior but often surprises developers.

---

## Pitfall 11: Mixing TIMESTAMP and DATE

```sql
-- Implicit casting can cause silent timezone issues
SELECT * FROM meetings
WHERE scheduled_at = DATE '2024-03-10';
-- This compares a TIMESTAMPTZ to a DATE
-- The DATE is implicitly cast to TIMESTAMP (midnight in session timezone)
-- Then compared to the TIMESTAMPTZ
-- Unexpected results likely!
```

**BETTER APPROACH:**

```sql
-- Be explicit about the comparison
SELECT * FROM meetings
WHERE scheduled_at >= '2024-03-10 00:00:00+00:00'
  AND scheduled_at < '2024-03-11 00:00:00+00:00';
```

---

## NULL Behavior With Timezones

```sql
-- NULLs in timezone-aware columns
INSERT INTO meetings (organizer_id, title, scheduled_at, duration_minutes)
VALUES (1, 'TBD Meeting', NULL, 60);

-- NULL comparisons always yield NULL (unknown)
SELECT * FROM meetings WHERE scheduled_at IS NULL;
-- Returns the row

SELECT * FROM meetings WHERE scheduled_at = NULL;
-- Returns nothing! (NULL = NULL is NULL, not TRUE)

SELECT * FROM meetings WHERE scheduled_at AT TIME ZONE 'UTC' IS NULL;
-- NULL input produces NULL output
```

---

## Common Mistakes

### Mistake 1: Assuming Server Timezone Is Correct

```sql
-- BAD: Relies on server timezone being set correctly
SELECT NOW();  -- Returns current time in session timezone

-- BETTER: Be explicit
SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
```

### Mistake 2: Using String Literals for Dates

```sql
-- BAD: String literal interpreted in session timezone
WHERE scheduled_at = '2024-03-10 14:00:00'

-- BETTER: Use explicit timezone
WHERE scheduled_at = '2024-03-10 14:00:00-05:00'

-- BEST: Use a parameterized query with proper type
WHERE scheduled_at = @appointment_time
```

### Mistake 3: Forgetting That Dates Don't Have Timezones

```sql
-- DATE has no timezone — '2024-03-10' is the same everywhere
-- This means DATE comparisons are always "local" to whatever you compare against
SELECT * FROM employees
WHERE hire_date = '2024-03-10';
-- This works fine — hire_date is a DATE, no timezone confusion
```

---

## Performance Implications

### Function on Column Prevents Index Use

```sql
-- BAD: Function on column prevents index usage on scheduled_at
SELECT * FROM meetings
WHERE EXTRACT(HOUR FROM scheduled_at AT TIME ZONE 'America/New_York') = 14;
-- This wraps scheduled_at in functions — index on scheduled_at won't help

-- BETTER: Use range predicates if possible
SELECT * FROM meetings
WHERE scheduled_at >= '2024-03-10 14:00:00-05:00'
  AND scheduled_at < '2024-03-10 15:00:00-05:00';
-- This can use an index on scheduled_at (range scan)
```

**Key insight:** `AT TIME ZONE` is a function. If it's applied to a column, it typically prevents index usage. However, if the timezone is a constant and the database optimizer is smart enough, it may still use an index. Always verify with `EXPLAIN ANALYZE`.

### TIMESTAMP WITH TIME ZONE Is Slightly Larger

- `TIMESTAMP WITHOUT TIME ZONE`: 8 bytes (PostgreSQL)
- `TIMESTAMP WITH TIME ZONE`: 8 bytes (PostgreSQL, stored as UTC internally)

In PostgreSQL, both are 8 bytes. In SQL Server, `DATETIMEOFFSET` is 10 bytes. The performance difference is negligible in most cases.

---

## Comparison Table: Timezone Storage Strategies

| Strategy                              | Pros                             | Cons                                | Best For                             |
| ------------------------------------- | -------------------------------- | ----------------------------------- | ------------------------------------ |
| Store as UTC `TIMESTAMPTZ`            | Unambiguous, globally correct    | Conversion needed for display       | Global applications                  |
| Store as local `TIMESTAMP`            | Simple for single-timezone apps  | Ambiguous across timezones          | Single-timezone legacy systems       |
| Store both UTC and local              | No conversion needed for display | Redundant storage, consistency risk | Auditing, logging                    |
| Store `TIMESTAMPTZ` + timezone column | Maximum flexibility              | More complex queries                | Multi-tenant with per-user timezones |

---

## Best Practices

1. **Always use `TIMESTAMP WITH TIME ZONE`** for absolute moments in time
2. **Store in UTC internally** — convert to local time only for display
3. **Set connection timezone explicitly** in your application
4. **Use IANA timezone names** (`America/New_York`) not abbreviations (`EST`)
5. **Never store timezone abbreviations in data** — they're ambiguous
6. **Be explicit about timezone in date arithmetic**
7. **Test with DST transition dates** (March and November in US/EU)
8. **Document the grain** of any timestamp column
9. **Use `AT TIME ZONE` explicitly** rather than relying on session defaults
10. **Validate timezone inputs** — invalid timezone names cause runtime errors

> **Production pitfall:** Always test your application during DST transitions. The "missing hour" (spring forward) and "duplicate hour" (fall back) are where most timezone bugs hide.

---

## Interview Questions

### Beginner

1. What is the difference between `TIMESTAMP WITHOUT TIME ZONE` and `TIMESTAMP WITH TIME ZONE`?

2. Why is UTC generally preferred for storing timestamps?

3. What happens when you insert a `TIMESTAMP WITH TIME ZONE` value in PostgreSQL — how is it stored internally?

### Intermediate

4. Explain what happens during a DST "fall back" transition. How do databases handle the ambiguous time?

5. What does `AT TIME ZONE` do in PostgreSQL when applied to a `TIMESTAMPTZ` vs a `TIMESTAMP`?

6. Why might the same query return different results if run on two servers with different session timezones?

### Advanced

7. Design a schema for a global scheduling application where users can be in any timezone. How do you handle:
   - Storing meeting times
   - Displaying times in user-local timezone
   - Handling DST transitions
   - Recurring meetings

8. Explain why `EXTRACT(HOUR FROM scheduled_at)` may produce unexpected results. What is the correct approach?

9. How would you efficiently query "all events happening today" for a user in `Asia/Kolkata` when the table stores UTC timestamps? Discuss index considerations.

### Scenario Based

10. A user in New York schedules a meeting for `2024-11-03 01:30:00` (during fall back). Another user in the same timezone schedules for `2024-11-03 01:30:00` (after fall back). How do you distinguish these two meetings? Write the query.

11. Your application stores timestamps without timezone info. Users report that meetings scheduled during DST transitions are off by one hour. How do you fix this without losing existing data?

12. You need to generate a report of "peak login hours" for a global user base. How do you aggregate login times by local hour?

### Tricky

13. What is the result of this query?

```sql
SELECT TIMESTAMP WITH TIME ZONE '2024-03-10 02:30:00 America/New_York';
```

14. What is the result of this query in PostgreSQL?

```sql
SET timezone = 'UTC';
SELECT '2024-03-10 09:00:00-05:00'::timestamptz AT TIME ZONE 'America/New_York';
```

15. A colleague writes:

```sql
WHERE event_date = CURRENT_DATE
```

But the column `event_date` is `TIMESTAMP WITH TIME ZONE`. Explain the implicit conversion and potential issue.

### Output Prediction

16. Given the `meetings` table above, what does this return?

```sql
SET timezone = 'America/New_York';
SELECT meeting_id, title, scheduled_at,
       EXTRACT(HOUR FROM scheduled_at) AS display_hour
FROM meetings
WHERE meeting_id = 1;
```

17. What is the difference in output between these two queries?

```sql
-- Query A
SELECT '2024-03-10 12:00:00'::timestamptz AT TIME ZONE 'America/New_York';

-- Query B
SELECT '2024-03-10 12:00:00-05:00'::timestamptz AT TIME ZONE 'America/New_York';
```

### Debugging

18. A developer writes: "My query returns meetings at 3 PM when I filter for 2 PM." They're using:

```sql
WHERE EXTRACT(HOUR FROM scheduled_at) = 14
```

The server timezone is UTC. The meetings were inserted with `-04:00` offsets. Debug this issue.

### Performance

19. You need to query meetings by local hour for a specific timezone. The table has 10 million rows with an index on `scheduled_at`. Write two approaches and discuss which can leverage the index.

20. A query filters on:

```sql
WHERE scheduled_at AT TIME ZONE 'America/New_York' >= '2024-03-10'
```

Can this use an index on `scheduled_at`? Why or why not? How would you rewrite it?
