# Data Types

---

## Table of Contents

1. [What AreSection generated in `sql-handbook/1-Fundamentals/02-Data-Types.md`.

Covers: numeric (INT/DECIMAL/FLOAT, integer division, money problem), strings (CHAR/VARCHAR/TEXT, collation), dates/times (TIMESTAMP vs TIMESTAMPTZ, timezone issues, boundary bugs), BOOLEAN, binary, JSON/JSONB, UUID, ARRAY, ENUM/SET, casting, implicit conversion, sargability, NULL/default interplay, identity columns, and DB-specific differences (PostgreSQL/MySQL/SQL Server/Oracle) — plus BAD vs BETTER examples, comparison tables, edge cases, and the full 8-part Interview Questions section.
-the-decimal-vs-float-problem)
14. [Type Conversion and Casting](#type-conversion-and-casting)
15. [Implicit Type Conversion (Implicit Cast)](#implicit-type-conversion-implicit-cast)
16. [Sargability and Data Types](#sargability-and-data-types)
17. [NULL and Data Types](#null-and-data-types)
18. [Identity / Auto-Increment](#identity--auto-increment)
19. [Column Defaults](#column-defaults)
20. [Common Mistakes](#common-mistakes)
21. [Production Pitfalls](#production-pitfalls)
22. [Performance Implications](#performance-implications)
23. [Comparison Tables](#comparison-tables)
24. [Interview Questions](#interview-questions)

---

## What Are Data Types?

A data type defines what kind of value a column can store: numbers, text, dates, binary data, or complex structures. Every column in every table **must** have a data type.

Think of it as a contract:

| Contract Aspect | Analogy |
|----------------|---------|
| Data type | What kind of data the column accepts |
| Storage size | How much disk/memory it uses |
| Allowed operations | What you can do (math, comparisons, pattern matching) |
| Validation rules | What values are valid |

```sql
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price        DECIMAL(10,2) NOT NULL,
    quantity     INT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Each column has a type that determines:
- What values are valid
- How much storage is used
- What operations are possible
- How indexes work

---

## Why Data Types Matter

Choosing the wrong data type can cause:

| Problem | Example |
|---------|---------|
| **Data loss** | Storing `99999999.99` in a `DECIMAL(8,2)` — overflow |
| **Wrong results** | Storing dates in `VARCHAR` — sorting by "date" sorts alphabetically |
| **Performance** | Using `TEXT` for a column that should be `VARCHAR(50)` — larger indexes, slower scans |
| **Precision errors** | Using `FLOAT` for money — floating-point arithmetic produces rounding errors |
| **Conversion failures** | Storing `'abc'` in an `INT` column — implicit cast fails |
| **Broken queries** | Comparing a `DATE` column to a string `'2024-01-01'` — works sometimes, fails silently others |

> Production pitfall: Changing a column's data type on a large table can lock the table for minutes or hours. Plan type changes carefully, especially in production systems with high write throughput.

---

## Sample Schema

Throughout this section, we use the following tables:

### products

**Grain:** One row = one product.

```sql
CREATE TABLE products (
    product_id    INT PRIMARY KEY,
    product_name  VARCHAR(100) NOT NULL,
    category      VARCHAR(50),
    price         DECIMAL(10,2) NOT NULL,
    weight_kg     DECIMAL(6,3),
    in_stock      BOOLEAN NOT NULL DEFAULT TRUE,
    tags          VARCHAR(200),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

```sql
INSERT INTO products VALUES
(1, 'Wireless Mouse',    'Electronics',  29.99,  0.120, TRUE,  'wireless,ergonomic',       '2024-01-10 09:00:00'),
(2, 'Mechanical Keyboard','Electronics',  89.95,  0.850, TRUE,  'mechanical,backlit',        '2024-01-15 14:30:00'),
(3, 'USB-C Hub',         'Electronics',  45.00,  0.095, FALSE, 'usb-c,multiport',           '2024-02-01 11:15:00'),
(4, 'Notebook A5',       'Stationery',    8.50,  0.200, TRUE,  'paper,ruled',               '2024-02-10 08:00:00'),
(5, 'Desk Lamp LED',     'Furniture',    34.99,  1.200, TRUE,  'led,adjustable',            '2024-03-01 16:45:00'),
(6, 'Ergonomic Chair',   'Furniture',   299.00, 15.500, TRUE,  'ergonomic,adjustable',      '2024-03-05 10:00:00'),
(7, 'Webcam HD',         'Electronics',  59.99,  0.180, TRUE,  'hd,usb',                    '2024-04-01 12:00:00'),
(8, 'Monitor Stand',     'Furniture',    42.00,  2.300, FALSE, 'adjustable,aluminum',       '2024-04-10 09:30:00');
```

### transactions

**Grain:** One row = one financial transaction.

```sql
CREATE TABLE transactions (
    txn_id          INT PRIMARY KEY,
    product_id      INT NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    currency        CHAR(3) NOT NULL,
    txn_date        DATE NOT NULL,
    txn_timestamp   TIMESTAMP NOT NULL,
    notes           TEXT,
    is_verified     BOOLEAN DEFAULT FALSE
);
```

```sql
INSERT INTO transactions VALUES
(1, 1,  29.99,  'USD', '2024-01-10', '2024-01-10 09:05:23', 'Online purchase',          TRUE),
(2, 2,  89.95,  'USD', '2024-01-15', '2024-01-15 14:32:10', 'Bulk order - corporate',   TRUE),
(3, 4,   8.50,  'USD', '2024-02-10', '2024-02-10 08:12:45', NULL,                       TRUE),
(4, 5,  34.99,  'EUR', '2024-03-01', '2024-03-01 16:50:00', 'International shipment',   FALSE),
(5, 6, 299.00,  'EUR', '2024-03-05', '2024-03-05 10:05:33', 'Express delivery',         TRUE),
(6, 1,  29.99,  'USD', '2024-04-01', '2024-04-01 12:00:01', 'Repeat customer',          TRUE),
(7, 3,  45.00,  'GBP', '2024-04-02', '2024-04-02 15:22:18', NULL,                       FALSE),
(8, 7,  59.99,  'USD', '2024-04-10', '2024-04-10 09:35:00', 'Gift wrapping requested',  TRUE);
```

### user_profiles

**Grain:** One row = one user profile.

```sql
CREATE TABLE user_profiles (
    user_id     INT PRIMARY KEY,
    username    VARCHAR(30) NOT NULL UNIQUE,
    bio         TEXT,
    avatar_url  VARCHAR(500),
    rating      DECIMAL(3,2),
    join_date   DATE NOT NULL,
    last_login  TIMESTAMP,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);
```

```sql
INSERT INTO user_profiles VALUES
(1, 'alice_dev',    'Full-stack developer',     NULL,              4.85, '2023-06-15', '2024-04-10 08:00:00', TRUE),
(2, 'bob_data',     'Data analyst',             'https://x.co/b', 4.20, '2023-09-20', '2024-04-09 17:30:00', TRUE),
(3, 'charlie_qa',   'Quality assurance engineer', NULL,           NULL,  '2024-01-05', '2024-04-08 12:00:00', TRUE),
(4, 'diana_pm',     'Product manager',          NULL,              4.95, '2023-03-01', '2024-04-10 10:15:00', TRUE),
(5, 'eve_ops',      NULL,                       'https://x.co/e', 3.70, '2024-02-14', NULL,                  FALSE);
```

---

## Numeric Types

Numeric types store integer and floating-point numbers. The choice between them determines storage, precision, and what operations are possible.

### Integer Types

| Type | Storage | Range (Signed) | Use When |
|------|---------|-----------------|----------|
| `TINYINT` | 1 byte | -128 to 127 | Small flags, status codes |
| `SMALLINT` | 2 bytes | -32,768 to 32,767 | Moderate ranges, counters |
| `INTEGER` / `INT` | 4 bytes | -2.1B to 2.1B | General-purpose IDs, counts |
| `BIGINT` | 8 bytes | ±9.2 × 10¹⁸ | Very large values, global counters |

> **PostgreSQL** does not have `TINYINT`. Use `SMALLINT` instead.
>
> **MySQL** supports `TINYINT`, `SMALLINT`, `MEDIUMINT`, `INT`, `BIGINT`.
>
> **SQL Server** supports `TINYINT`, `SMALLINT`, `INT`, `BIGINT`.
>
> **Oracle** supports `NUMBER(n)` with precision. `NUMBER(10)` or `INTEGER` for whole numbers.

```sql
-- SMALLINT: suitable for a department ID (small range)
CREATE TABLE departments (
    department_id   SMALLINT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL
);

-- INT: standard for most IDs and counts
CREATE TABLE employees (
    employee_id   INT PRIMARY KEY,
    first_name    VARCHAR(50) NOT NULL,
    salary        INT NOT NULL
);

-- BIGINT: for tables that will grow very large
CREATE TABLE page_views (
    view_id     BIGINT PRIMARY KEY,
    user_id     INT NOT NULL,
    page_url    VARCHAR(500) NOT NULL,
    viewed_at   TIMESTAMP NOT NULL
);
```

#### UNSIGNED Integers

> MySQL supports `UNSIGNED` integers, which doubles the positive range but removes the ability to store negative values.

```sql
-- MySQL: UNSIGNED TINYINT stores 0 to 255 instead of -128 to 127
CREATE TABLE flags (
    status TINYINT UNSIGNED NOT NULL  -- 0 to 255 only
);
```

> PostgreSQL, SQL Server, Oracle do **not** support `UNSIGNED`. Use `CHECK` constraints instead:

```sql
-- PostgreSQL / SQL Server / Oracle equivalent
CREATE TABLE flags (
    status SMALLINT NOT NULL CHECK (status >= 0 AND status <= 255)
);
```

### Decimal / Exact Numeric Types

| Type | Storage | Precision | Use When |
|------|---------|-----------|----------|
| `DECIMAL(p,s)` / `NUMERIC(p,s)` | Variable | Exact to `s` decimal places | Money, precise measurements |
| `MONEY` | 4 or 8 bytes | Fixed by locale | SQL Server currency (limited) |

- `p` = **precision** (total digits, 1–38 in most databases)
- `s` = **scale** (digits after decimal point)

```sql
-- DECIMAL(10,2): up to 10 total digits, 2 after the decimal point
-- Range: -99999999.99 to 99999999.99
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    price      DECIMAL(10,2) NOT NULL,
    weight_kg  DECIMAL(6,3)  NOT NULL
);
```

```sql
SELECT
    12345678.99::DECIMAL(10,2) AS fits,          -- 12345678.99
    123456789.01::DECIMAL(10,2) AS overflow;       -- ERROR: precision overflow
```

> **PostgreSQL** treats `DECIMAL` and `NUMERIC` identically.
>
> **MySQL** allows inserting values with more decimal places than `s`, but **silently rounds**. Other databases raise errors.

#### DECIMAL Storage

Internally, databases store DECIMAL in binary-coded decimal (BCD) format. Each group of 9 digits is packed into 4 bytes. This is slower than native binary arithmetic but guarantees exact results.

### Floating-Point / Approximate Numeric Types

| Type | Storage | Precision | Use When |
|------|---------|-----------|----------|
| `REAL` / `FLOAT` | 4 bytes | ~7 decimal digits | Scientific data, large ranges, non-financial |
| `DOUBLE PRECISION` / `DOUBLE` | 8 bytes | ~15 decimal digits | High-precision scientific data |

```sql
-- FLOAT: 4 bytes, approximately 7 significant digits
CREATE TABLE measurements (
    reading_id INT PRIMARY KEY,
    temperature FLOAT NOT NULL,
    humidity    DOUBLE PRECISION NOT NULL
);
```

```sql
SELECT
    0.1 + 0.2 AS result;
    -- FLOAT:     0.30000000000000004 (NOT 0.3)
    -- DECIMAL:   0.3 (exact)
```

> **Critical:** `0.1 + 0.2 != 0.3` in floating-point arithmetic. This is not a SQL bug — it is how IEEE 754 floating-point works.

### DECIMAL vs FLOAT — Side-by-Side

```sql
-- BAD: Using FLOAT for money
CREATE TABLE orders_bad (
    order_id INT PRIMARY KEY,
    total    FLOAT NOT NULL
);

INSERT INTO orders_bad VALUES (1, 0.1);
INSERT INTO orders_bad VALUES (2, 0.2);

SELECT SUM(total) FROM orders_bad;
-- Returns: 0.30000000000000004 (WRONG for financial data)

-- BETTER: Using DECIMAL for money
CREATE TABLE orders_good (
    order_id INT PRIMARY KEY,
    total    DECIMAL(10,2) NOT NULL
);

INSERT INTO orders_good VALUES (1, 0.1);
INSERT INTO orders_good VALUES (2, 0.2);

SELECT SUM(total) FROM orders_good;
-- Returns: 0.30 (correct)
```

> Production pitfall: Never use `FLOAT` or `DOUBLE` for money, financial calculations, or any domain where exact results matter. Floating-point rounding errors compound across calculations.

### INTEGER Division

This is a subtle data-type interaction that causes confusion:

```sql
-- SQL Server, MySQL: integer / integer = integer (truncated)
SELECT 7 / 2;          -- 3 (truncated, not rounded)
SELECT 7 / 2.0;        -- 3.50000 (decimal triggers floating-point division)

-- PostgreSQL: integer / integer = integer (truncated)
SELECT 7 / 2;          -- 3
SELECT 7 / 2.0;        -- 3.5 (decimal promotes to numeric)
SELECT 7::NUMERIC / 2; -- 3.5

-- Oracle: always returns a decimal result
SELECT 7 / 2 FROM DUAL; -- 3.5
```

```sql
-- BAD: Integer division truncates silently
SELECT 10 / 3 AS result;     -- 3 (in PostgreSQL, SQL Server, MySQL)

-- BETTER: Force decimal division
SELECT 10.0 / 3 AS result;   -- 3.3333333333333335
SELECT CAST(10 AS DECIMAL(10,1)) / 3 AS result; -- 3.333333...
```

> Interview trap: `SELECT 10 / 3` returns `3` in most databases (integer division). Many candidates expect `3.33`.

---

## Character / String Types

String types store text. The choice between fixed-length and variable-length, and the maximum length, affects storage and performance.

### Overview

| Type | Max Length | Storage | Use When |
|------|-----------|---------|----------|
| `CHAR(n)` | n characters | n bytes (padded) | Fixed-length codes (ISO country codes, state codes) |
| `VARCHAR(n)` | n characters | Actual length + overhead | Most text fields (names, emails, addresses) |
| `TEXT` | Very large (1 GB+) | Actual length + overhead | Long content (descriptions, articles, JSON) |
| `VARCHAR(MAX)` | 2 GB | Actual length + overhead | SQL Server equivalent of TEXT |
| `CLOB` | Very large | Varies | Oracle equivalent of TEXT |

### CHAR vs VARCHAR

```sql
-- CHAR(5): always stores 5 characters (padded with spaces)
-- VARCHAR(5): stores up to 5 characters (no padding)

CREATE TABLE char_vs_varchar (
    fixed_code  CHAR(5),
    variable    VARCHAR(5)
);

INSERT INTO char_vs_varchar VALUES ('AB', 'AB');

-- Storage:
-- fixed_code: 'AB   ' (padded to 5 characters)
-- variable:   'AB'    (2 characters)

-- Comparison behavior differs:
SELECT * FROM char_vs_varchar WHERE fixed_code = 'AB';
-- CHAR: may or may not match (depends on database padding rules)
-- The ANSI standard says trailing spaces are ignored in CHAR comparison
-- but behavior varies across databases.

SELECT * FROM char_vs_varchar WHERE variable = 'AB';
-- Always matches exactly.
```

> **When to use CHAR:** For fixed-length codes that are always the same length — ISO country codes (`CHAR(2)`), US state codes (`CHAR(2)`), yes/no flags (`CHAR(1)`), hash values (`CHAR(64)` for SHA-256).
>
> **When to use VARCHAR:** Almost everywhere else — names, emails, addresses, product names, descriptions.

> PostgreSQL has no `CHAR(n)` type in practice. It stores `CHAR(n)` as `VARCHAR(n)` internally but still enforces the length constraint.

### VARCHAR Length

```sql
-- VARCHAR(100) means: up to 100 characters
CREATE TABLE users (
    username VARCHAR(30) NOT NULL UNIQUE,
    email    VARCHAR(100) NOT NULL
);
```

> Common misconception: `VARCHAR(100)` does **not** always use more storage for shorter values. It only stores the actual characters plus a small length prefix (1–2 bytes). However, `VARCHAR(100)` and `VARCHAR(200)` may have different maximum lengths for index key size in some databases.

### TEXT Type

```sql
-- PostgreSQL: TEXT has unlimited length
CREATE TABLE articles (
    article_id INT PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    body       TEXT NOT NULL
);

-- SQL Server: use VARCHAR(MAX) instead of TEXT (TEXT is deprecated)
CREATE TABLE articles (
    article_id INT PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(MAX) NOT NULL
);

-- MySQL: TEXT can hold up to 65,535 bytes
-- LONGTEXT can hold up to 4 GB
CREATE TABLE articles (
    article_id INT PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    body       TEXT NOT NULL
);

-- Oracle: use CLOB (or VARCHAR2(4000) for smaller text)
CREATE TABLE articles (
    article_id NUMBER PRIMARY KEY,
    title      VARCHAR2(200) NOT NULL,
    body       CLOB NOT NULL
);
```

> Production pitfall: In MySQL, `TEXT` columns cannot have default values (before MySQL 8.0.13). In SQL Server, `TEXT` and `IMAGE` types are deprecated — use `VARCHAR(MAX)` and `VARBINARY(MAX)` instead.

### Collation and Case Sensitivity

Collation determines how strings are compared and sorted (case-sensitive, accent-sensitive, etc.).

| Database | Default Collation | Case-Sensitive? |
|----------|-------------------|-----------------|
| PostgreSQL | `en_US.UTF-8` | Yes |
| MySQL (Windows) | `utf8mb4_general_ci` | No (`ci` = case-insensitive) |
| MySQL (Linux) | `utf8mb4_general_ci` | No (default), but file system is case-sensitive |
| SQL Server | `SQL_Latin1_General_CP1_CI_AS` | No (`CI` = case-insensitive) |
| Oracle | Based on `NLS_COMP` / `NLS_SORT` | Depends on settings |

```sql
-- PostgreSQL: case-sensitive by default
SELECT * FROM users WHERE username = 'Alice';    -- matches 'Alice', NOT 'alice'

-- PostgreSQL: use ILIKE for case-insensitive
SELECT * FROM users WHERE username ILIKE 'alice'; -- matches 'Alice', 'ALICE', 'alice'

-- MySQL: case-insensitive by default (ci collation)
SELECT * FROM users WHERE username = 'alice';     -- matches 'Alice', 'ALICE', 'alice'

-- SQL Server: case-insensitive by default
SELECT * FROM users WHERE username = 'alice';     -- matches 'Alice', 'alice'
```

> Production pitfall: Code that works correctly on MySQL (case-insensitive) may fail silently on PostgreSQL (case-sensitive). Design your queries with explicit case handling from the start.

### String Length Functions

```sql
-- All databases: LENGTH() or LEN()
SELECT LENGTH('hello');            -- 5

-- PostgreSQL: LENGTH() returns character count
SELECT LENGTH('café');             -- 4

-- SQL Server: LEN() returns character count
SELECT LEN('café');                -- 4

-- PostgreSQL: use OCTET_LENGTH() for byte count
SELECT OCTET_LENGTH('café');       -- 5 (é is 2 bytes in UTF-8)
```

---

## Date and Time Types

Date and time types store temporal values. Choosing the right type determines what arithmetic and comparisons are possible.

### Overview

| Type | Stores | Range (approx.) | Use When |
|------|--------|------------------|----------|
| `DATE` | Date only | 4713 BC – 5874897 AD | Birth dates, order dates, deadlines |
| `TIME` | Time only | 00:00:00 – 23:59:59.999999 | Store hours/minutes (rarely alone) |
| `TIMESTAMP` / `DATETIME` | Date + Time (no timezone) | Varies by DB | When you control timezone handling |
| `TIMESTAMPTZ` / `DATETIMEOFFSET` | Date + Time + Timezone | Varies by DB | When you need timezone awareness |
| `INTERVAL` | Duration | Varies | Time differences, durations |

### DATE

```sql
-- Stores: year, month, day
-- Format: 'YYYY-MM-DD' (ISO 8601)

CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    event_date DATE NOT NULL
);

INSERT INTO events VALUES (1, '2024-03-15');
INSERT INTO events VALUES (2, DATE '2024-12-25');

-- Comparison
SELECT * FROM events WHERE event_date = '2024-03-15';
SELECT * FROM events WHERE event_date > '2024-01-01';
SELECT * FROM events WHERE event_date BETWEEN '2024-01-01' AND '2024-06-30';
```

> **Oracle:** `DATE` includes both date AND time (down to the second). This is a common source of confusion. To store only a date in Oracle, use `TRUNC(date_column)` in comparisons or use `TO_DATE`.

### TIME

```sql
-- Stores: hour, minute, second, fractional seconds
-- Format: 'HH:MI:SS' or 'HH24:MI:SS'

CREATE TABLE store_hours (
    store_id    INT,
    open_time   TIME NOT NULL,
    close_time  TIME NOT NULL
);

INSERT INTO store_hours VALUES (1, '09:00:00', '21:00:00');
```

### TIMESTAMP (without timezone)

```sql
-- Stores: date + time
-- Format: 'YYYY-MM-DD HH:MI:SS'

CREATE TABLE audit_log (
    log_id      INT PRIMARY KEY,
    log_time    TIMESTAMP NOT NULL
);

INSERT INTO audit_log VALUES (1, '2024-04-10 14:30:00');
INSERT INTO audit_log VALUES (2, CURRENT_TIMESTAMP);
```

> **MySQL:** `TIMESTAMP` stores the value in UTC internally and converts it to the session timezone on retrieval. `DATETIME` stores the value as-is without timezone conversion.

| MySQL | Behavior |
|-------|----------|
| `TIMESTAMP` | Stored in UTC, converted to session timezone on read |
| `DATETIME` | Stored literally, no timezone conversion |

```sql
-- MySQL
CREATE TABLE ts_vs_dt (
    ts TIMESTAMP,
    dt DATETIME
);

INSERT INTO ts_vs_dt VALUES ('2024-04-10 14:30:00', '2024-04-10 14:30:00');

SET session.time_zone = '+00:00';
SELECT * FROM ts_vs_dt;
-- ts: 2024-04-10 14:30:00
-- dt: 2024-04-10 14:30:00

SET session.time_zone = '+05:30';
SELECT * FROM ts_vs_dt;
-- ts: 2024-04-10 20:00:00 (converted from UTC to +05:30)
-- dt: 2024-04-10 14:30:00 (unchanged)
```

### TIMESTAMPTZ (with timezone)

```sql
-- PostgreSQL: TIMESTAMPTZ stores in UTC internally
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL
);

-- Stores as UTC, converts to session timezone on retrieval
INSERT INTO events VALUES (1, '2024-04-10 14:30:00+05:30');
-- Internally stored as: 2024-04-10 09:00:00 UTC

SET timezone = 'America/New_York';
SELECT * FROM events;
-- event_time: 2024-04-10 05:00:00-04 (EDT)

SET timezone = 'Asia/Tokyo';
SELECT * FROM events;
-- event_time: 2024-04-10 18:00:00+09 (JST)
```

> PostgreSQL uses `TIMESTAMPTZ`. SQL Server uses `DATETIMEOFFSET`. MySQL does not have a native timezone-aware timestamp type. Oracle uses `TIMESTAMP WITH TIME ZONE`.

### Date Arithmetic

```sql
-- PostgreSQL
SELECT DATE '2024-04-10' + INTERVAL '30 days';        -- 2024-05-10
SELECT DATE '2024-04-10' - DATE '2024-01-01';          -- 100 (days as integer)
SELECT TIMESTAMP '2024-04-10 14:00:00' + INTERVAL '2 hours'; -- 2024-04-10 16:00:00

-- MySQL
SELECT DATE_ADD('2024-04-10', INTERVAL 30 DAY);        -- 2024-05-10
SELECT DATEDIFF('2024-04-10', '2024-01-01');           -- 100

-- SQL Server
SELECT DATEADD(DAY, 30, '2024-04-10');                 -- 2024-05-10
SELECT DATEDIFF(DAY, '2024-01-01', '2024-04-10');      -- 100

-- Oracle
SELECT DATE '2024-04-10' + 30 FROM DUAL;               -- 2024-05-10
SELECT DATE '2024-04-10' - DATE '2024-01-01' FROM DUAL; -- 100
```

### Timestamp Boundary Issues

> Production pitfall: Comparing timestamps across date boundaries is a common source of bugs.

```sql
-- BAD: This misses orders placed exactly at midnight
SELECT * FROM transactions
WHERE txn_timestamp >= '2024-01-01'
  AND txn_timestamp <= '2024-01-31';

-- An order at '2024-01-31 00:00:00' is included
-- An order at '2024-02-01 00:00:00' is excluded (correct)
-- But: '2024-01-31 23:59:59.999' is included, while
--      '2024-02-01 00:00:00.000' is excluded

-- BETTER: Use exclusive upper bound
SELECT * FROM transactions
WHERE txn_timestamp >= '2024-01-01'
  AND txn_timestamp <  '2024-02-01';
-- This correctly captures all timestamps in January
```

### Extracting Date Parts

```sql
-- PostgreSQL
SELECT
    EXTRACT(YEAR FROM txn_date)  AS year,
    EXTRACT(MONTH FROM txn_date) AS month,
    EXTRACT(DAY FROM txn_date)   AS day
FROM transactions;

-- MySQL
SELECT
    YEAR(txn_date)  AS year,
    MONTH(txn_date) AS month,
    DAY(txn_date)   AS day
FROM transactions;

-- SQL Server
SELECT
    YEAR(txn_date)  AS year,
    MONTH(txn_date) AS month,
    DAY(txn_date)   AS day
FROM transactions;

-- Oracle
SELECT
    EXTRACT(YEAR FROM txn_date)  AS year,
    EXTRACT(MONTH FROM txn_date) AS month,
    EXTRACT(DAY FROM txn_date)   AS day
FROM transactions;
```

> See the sargability section: functions like `YEAR(txn_date)` prevent index usage. Use range predicates instead.

---

## Boolean Type

### SQL Standard

The SQL standard defines `BOOLEAN` with three values: `TRUE`, `FALSE`, and `NULL`.

| Database | Supports `BOOLEAN`? | Internally Stored As |
|----------|---------------------|----------------------|
| PostgreSQL | Yes | 1 byte (true/false/NULL) |
| MySQL | No native `BOOLEAN` | `TINYINT(1)` (0, 1, NULL) |
| SQL Server | No native `BOOLEAN` | `BIT` (0, 1, NULL) |
| Oracle | No native `BOOLEAN` | `NUMBER(1)` (0, 1, NULL) |

```sql
-- PostgreSQL: native BOOLEAN
CREATE TABLE features (
    feature_id INT PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_public  BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO features VALUES (1, TRUE, FALSE);
INSERT INTO features VALUES (2, DEFAULT, DEFAULT); -- FALSE, TRUE

SELECT * FROM features WHERE is_enabled = TRUE;
SELECT * FROM features WHERE is_enabled;             -- shorthand
SELECT * FROM features WHERE NOT is_enabled;
```

```sql
-- MySQL: BOOLEAN is an alias for TINYINT(1)
CREATE TABLE features (
    feature_id INT PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE
);

-- These are equivalent:
INSERT INTO features VALUES (1, TRUE);
INSERT INTO features VALUES (1, 1);
INSERT INTO features VALUES (1, '1');
INSERT INTO features VALUES (1, 'true');  -- MySQL casts string to int

SELECT * FROM features WHERE is_enabled = TRUE;
SELECT * FROM features WHERE is_enabled = 1;
SELECT * FROM features WHERE is_enabled;   -- works in MySQL
```

```sql
-- SQL Server: use BIT
CREATE TABLE features (
    feature_id INT PRIMARY KEY,
    is_enabled BIT NOT NULL DEFAULT 0
);

INSERT INTO features VALUES (1, 1);
INSERT INTO features VALUES (1, 'true');  -- converted to 1

SELECT * FROM features WHERE is_enabled = 1;
SELECT * FROM features WHERE is_enabled = 'true'; -- works

-- SQL Server does NOT support:
-- WHERE is_enabled          (syntax error)
-- WHERE NOT is_enabled      (syntax error)
-- You must compare: WHERE is_enabled = 1
```

> **Oracle** does not have a BOOLEAN type in SQL at all. PL/SQL has `BOOLEAN`, but you cannot use it in table columns. Use `NUMBER(1)` with `CHECK (col IN (0, 1))`.

> Common misconception: In MySQL, `BOOLEAN` columns accept `TRUE`, `FALSE`, `0`, `1`, `'true'`, `'false'`, `'yes'`, `'no'`, and more. It is purely a `TINYINT(1)` alias. Don't assume type safety.

---

## Binary Types

Binary types store raw byte data (files, images, encrypted content, hashes).

| Type | Max Size | Use When |
|------|----------|----------|
| `BINARY(n)` | n bytes | Fixed-length binary (hashes, UUIDs) |
| `VARBINARY(n)` | n bytes | Variable-length binary (signatures, keys) |
| `BIT` | 1 bit | Flags (SQL Server) |
| `BYTEA` | ~1 GB | PostgreSQL binary data |
| `BLOB` | Varies | MySQL binary large objects |
| `RAW(n)` | n bytes | Oracle binary data |

```sql
-- PostgreSQL: BYTEA for binary data
CREATE TABLE file_uploads (
    file_id    INT PRIMARY KEY,
    file_name  VARCHAR(200) NOT NULL,
    file_data  BYTEA NOT NULL,
    mime_type  VARCHAR(100) NOT NULL
);

-- SQL Server: VARBINARY(MAX) for large binary data
CREATE TABLE file_uploads (
    file_id    INT PRIMARY KEY,
    file_name  VARCHAR(200) NOT NULL,
    file_data  VARBINARY(MAX) NOT NULL,
    mime_type  VARCHAR(100) NOT NULL
);
```

> Production pitfall: Storing large binary objects (images, PDFs) in the database increases backup size, slows replication, and makes the database harder to manage. Consider storing files in object storage (S3, Azure Blob) and saving only the URL in the database.

---

## JSON and Structured Types

Modern databases support storing and querying structured data (JSON, arrays, ranges) inside columns.

### JSON Types

| Database | Type | Indexed JSON Queries |
|----------|------|----------------------|
| PostgreSQL | `JSONB` (binary, recommended) / `JSON` (text) | GIN indexes, path operators |
| MySQL | `JSON` | Generated columns + indexes |
| SQL Server | `NVARCHAR(MAX)` | JSON functions, no native type |
| Oracle | `CLOB` / `BLOB` | `JSON` data type (21c+), path expressions |

```sql
-- PostgreSQL: JSONB (recommended)
CREATE TABLE events (
    event_id    INT PRIMARY KEY,
    event_type  VARCHAR(50) NOT NULL,
    payload     JSONB NOT NULL
);

INSERT INTO events VALUES
(1, 'page_view', '{"url": "/home", "user_id": 42, "duration_ms": 1500}'),
(2, 'purchase',  '{"product_id": 7, "amount": 29.99, "currency": "USD"}');

-- Extract values
SELECT
    event_id,
    payload->>'url'       AS url,        -- text extraction
    payload->>'user_id'   AS user_id,    -- text extraction
    (payload->>'duration_ms')::INT AS duration  -- cast to int
FROM events
WHERE event_type = 'page_view';
```

| event_id | url | user_id | duration |
|----------|-----|---------|----------|
| 1 | /home | 42 | 1500 |

```sql
-- PostgreSQL: filter inside JSON
SELECT * FROM events
WHERE payload->>'product_id' = '7';

-- PostgreSQL: JSONB containment
SELECT * FROM events
WHERE payload @> '{"currency": "USD"}';
```

```sql
-- MySQL: JSON type
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    payload    JSON NOT NULL
);

INSERT INTO events VALUES
(1, 'page_view', '{"url": "/home", "user_id": 42}');

SELECT
    event_id,
    payload->>'$.url'     AS url,
    payload->>'$.user_id' AS user_id
FROM events;
```

> Common misconception: JSON columns are not a replacement for normalized tables. If you frequently query, filter, or join on fields inside JSON, those fields should usually be proper columns. JSON is best for semi-structured data that is rarely queried or whose structure changes over time.

---

## UUID Type

Universally Unique Identifiers. Used as primary keys to avoid coordination across distributed systems.

| Database | Type | Function |
|----------|------|----------|
| PostgreSQL | `UUID` | `gen_random_uuid()` |
| MySQL | `CHAR(36)` or `BINARY(16)` | `UUID()` |
| SQL Server | `UNIQUEIDENTIFIER` | `NEWID()` |
| Oracle | `RAW(16)` or `CHAR(36)` | `SYS_GUID()` |

```sql
-- PostgreSQL
CREATE TABLE users (
    user_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username   VARCHAR(30) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (username) VALUES ('alice_dev');
-- user_id automatically generated: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
```

```sql
-- MySQL: store as BINARY(16) for efficiency
CREATE TABLE users (
    user_id    BINARY(16) PRIMARY KEY,
    username   VARCHAR(30) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Convert UUID string to binary for storage
INSERT INTO users (user_id, username)
VALUES (UUID_TO_BIN(UUID()), 'alice_dev');
```

> Production pitfall: Storing UUIDs as `CHAR(36)` wastes 20 bytes of storage per row compared to `BINARY(16)`. For high-volume tables, use `BINARY(16)` and convert on retrieval. Also, random UUIDs (v4) are not sortable and make poor primary keys for large tables — they cause index fragmentation. Consider ordered UUIDs (v7) or ULIDs instead.

---

## ARRAY Type

Some databases support arrays as column types.

```sql
-- PostgreSQL: native ARRAY type
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    tags         TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO products VALUES
(1, 'Wireless Mouse', ARRAY['wireless', 'ergonomic']),
(2, 'Keyboard',       ARRAY['mechanical', 'backlit', 'rgb']);

-- Query arrays
SELECT * FROM products WHERE 'wireless' = ANY(tags);
SELECT * FROM products WHERE tags @> ARRAY['backlit'];
SELECT array_length(tags, 1) AS tag_count FROM products;

-- PostgreSQL also supports arrays of other types
CREATE TABLE scores (
    student_id INT PRIMARY KEY,
    grades     DECIMAL(4,2)[] NOT NULL
);

INSERT INTO scores VALUES (1, ARRAY[8.5, 9.0, 7.75]);
SELECT AVG(g) FROM unnest(ARRAY[8.5, 9.0, 7.75]) AS g;  -- 8.416...
```

> MySQL, SQL Server, Oracle do **not** support array column types. The typical pattern is a junction/join table (see many-to-many relationships section).

> Common misconception: Arrays in PostgreSQL are convenient but are not a replacement for proper normalization. If you need to query, update, or enforce uniqueness on individual array elements, a junction table is almost always better.

---

## ENUM and SET Types

Enumerated types restrict a column to a predefined set of values.

```sql
-- PostgreSQL: use CREATE TYPE + ENUM (or better, use CHECK constraints)
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    status   order_status NOT NULL DEFAULT 'pending'
);

INSERT INTO orders VALUES (1, 'shipped');     -- valid
INSERT INTO orders VALUES (2, 'unknown');     -- ERROR: invalid enum value
```

```sql
-- PostgreSQL: CHECK constraint (often preferred over ENUM for flexibility)
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    status   VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'))
);
```

```sql
-- MySQL: ENUM type (stores integers internally for efficiency)
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    status   ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled')
             NOT NULL DEFAULT 'pending'
);

-- MySQL ENUM stores 'pending'=1, 'processing'=2, etc. Internally uses 1-2 bytes.

-- MySQL SET type (allows multiple values)
CREATE TABLE product_features (
    product_id INT PRIMARY KEY,
    features   SET('wireless', 'ergonomic', 'backlit', 'waterproof') NOT NULL
);

INSERT INTO product_features VALUES (1, 'wireless,ergonomic');
```

> **Production pitfall with ENUM:** Adding a new value requires an `ALTER TABLE` which can lock the table. PostgreSQL ENUMs require `ALTER TYPE ... ADD VALUE` which cannot be done inside a transaction. CHECK constraints on VARCHAR are often more flexible and easier to maintain.

> **Oracle** does not have ENUM or SET types. Use CHECK constraints.

---

## Money and Currency — The DECIMAL vs FLOAT Problem

This deserves its own section because getting it wrong causes real financial losses.

### The Problem with FLOAT

```sql
-- BAD: FLOAT for money
SELECT
    0.1::FLOAT + 0.2::FLOAT AS result;
-- Result: 0.30000000000000004
-- This is IEEE 754 floating-point behavior, not a SQL bug.

-- Compounding the problem:
SELECT
    (0.1::FLOAT + 0.2::FLOAT) * 1000000 AS result;
-- Result: 300000.00000000006
```

### The DECIMAL Solution

```sql
-- BETTER: DECIMAL for money
SELECT
    0.1::DECIMAL(10,2) + 0.2::DECIMAL(10,2) AS result;
-- Result: 0.30

SELECT
    (0.1::DECIMAL(10,2) + 0.2::DECIMAL(10,2)) * 1000000 AS result;
-- Result: 300000.00
```

### Storing Money Properly

```sql
-- BAD: FLOAT
CREATE TABLE payments_bad (
    payment_id INT PRIMARY KEY,
    amount     FLOAT NOT NULL,          -- WRONG
    currency   CHAR(3) NOT NULL
);

-- BETTER: DECIMAL
CREATE TABLE payments_good (
    payment_id INT PRIMARY KEY,
    amount     DECIMAL(12,2) NOT NULL,  -- correct
    currency   CHAR(3) NOT NULL
);

-- BEST: DECIMAL + currency code + cents as integer
CREATE TABLE payments_best (
    payment_id      INT PRIMARY KEY,
    amount_cents    BIGINT NOT NULL,     -- store as smallest unit
    currency        CHAR(3) NOT NULL
);
-- $29.99 stored as 2999 cents
-- €150.50 stored as 15050 cents
```

> Production pitfall: Storing money in cents as `INT` or `BIGINT` avoids all decimal-point issues and is the recommended approach for many payment systems. However, you must handle currency conversion carefully (different currencies have different decimal places — JPY has 0, USD has 2, BHD has 3).

### SQL Server MONEY Type

```sql
-- SQL Server: MONEY type (convenient but limited)
CREATE TABLE payments (
    payment_id INT PRIMARY KEY,
    amount     MONEY NOT NULL
);

INSERT INTO payments VALUES (1, 29.99);

-- MONEY has fixed precision and is tied to locale.
-- DECIMAL(19,4) is generally safer and more portable.
```

---

## Type Conversion and Casting

### Explicit CAST

```sql
-- Standard SQL: CAST
SELECT CAST('123' AS INT);              -- 123
SELECT CAST(123 AS VARCHAR(10));        -- '123'
SELECT CAST('2024-04-10' AS DATE);      -- 2024-04-10
SELECT CAST(123.456 AS DECIMAL(10,1));  -- 123.5 (rounded)

-- PostgreSQL: :: operator (shorthand)
SELECT '123'::INT;                      -- 123
SELECT 123::VARCHAR(10);                -- '123'
SELECT NOW()::DATE;                     -- 2024-04-10 (today)

-- SQL Server: CONVERT (additional style parameter)
SELECT CONVERT(INT, '123');             -- 123
SELECT CONVERT(VARCHAR, 123);           -- '123'
SELECT CONVERT(VARCHAR, GETDATE(), 101); -- '04/10/2024' (US format)

-- Oracle: TO_CHAR, TO_NUMBER, TO_DATE
SELECT TO_NUMBER('123') FROM DUAL;              -- 123
SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD') FROM DUAL; -- '2024-04-10'
SELECT TO_DATE('2024-04-10', 'YYYY-MM-DD') FROM DUAL; -- 2024-04-10

-- MySQL: CAST or CONVERT
SELECT CAST('123' AS UNSIGNED);         -- 123
SELECT CONVERT('2024-04-10', DATE);     -- 2024-04-10
```

### Common Cast Operations

```sql
-- String to Number
SELECT CAST('42' AS INT);           -- 42
SELECT CAST('3.14' AS DECIMAL(5,2)); -- 3.14

-- Number to String
SELECT CAST(42 AS VARCHAR(10));      -- '42'

-- String to Date
SELECT CAST('2024-04-10' AS DATE);   -- 2024-04-10

-- Date to String
SELECT CAST(CURRENT_DATE AS VARCHAR(20)); -- '2024-04-10' (format varies by DB)

-- Integer to Boolean (MySQL, SQL Server)
SELECT CAST(1 AS BOOLEAN);           -- TRUE
SELECT CAST(0 AS BOOLEAN);           -- FALSE
```

> Production pitfall: Implicit casts can fail at runtime with bad data. Always use `CASE WHEN` or `COALESCE` to handle malformed values in conversion pipelines, rather than relying on the database to throw an error.

---

## Implicit Type Conversion (Implicit Cast)

SQL automatically converts between compatible types in some situations. This is convenient but dangerous.

### What Happens

```sql
-- PostgreSQL: implicit cast from string to integer
SELECT 1 + '2';                  -- 3 (string '2' cast to integer)

-- MySQL: implicit cast in comparison
SELECT * FROM employees WHERE salary = '95000';
-- '95000' is cast to DECIMAL for comparison. Index may still be used.

-- BAD: implicit cast on the indexed column
SELECT * FROM employees WHERE employee_id = '1';
-- If employee_id is INT and '1' is VARCHAR, the database may cast
-- employee_id to VARCHAR for comparison, PREVENTING index usage.
```

### Implicit Cast Pitfalls

```sql
-- BAD: Comparing VARCHAR to INT (type mismatch)
-- If email column is VARCHAR:
SELECT * FROM employees WHERE email = 12345;

-- Depending on the database:
-- PostgreSQL: ERROR (no implicit cast from integer to varchar)
-- MySQL: casts email to numeric, which fails silently for most emails
-- SQL Server: casts '12345' to VARCHAR, which works but may miss index

-- BETTER: Always match types
SELECT * FROM employees WHERE email = '12345';
```

```sql
-- BAD: CHAR padding issue
SELECT * FROM employees WHERE CHAR_COLUMN = 'value';
-- CHAR pads: 'value   ' (with trailing spaces)
-- Depending on database, this may or may not match.

-- BETTER: Use RTRIM or use VARCHAR columns
SELECT * FROM employees WHERE RTRIM(CHAR_COLUMN) = 'value';
```

> Production pitfall: Implicit type conversion is one of the top causes of slow queries. When a column is compared to a value of a different type, the database may cast every row's value (instead of just the literal), which prevents index usage. Always verify with EXPLAIN.

---

## Sargability and Data Types

A query is **sargable** (Search ARGument ABLE) when the optimizer can use an index to satisfy the predicate. Data type mismatches can destroy sargability.

```sql
-- BAD: Applying a function to the indexed column
SELECT * FROM employees WHERE YEAR(hire_date) = 2020;
-- hire_date index cannot be used (function on column)

-- BETTER: Range predicate on the column itself
SELECT * FROM employees
WHERE hire_date >= '2020-01-01' AND hire_date < '2021-01-01';
-- hire_date index CAN be used
```

```sql
-- BAD: Type mismatch prevents index usage
SELECT * FROM orders WHERE CAST(order_id AS VARCHAR) = '101';
-- Index on order_id cannot be used

-- BETTER: Match the type
SELECT * FROM orders WHERE order_id = 101;
-- Index on order_id CAN be used
```

> Always verify sargability with EXPLAIN / EXPLAIN ANALYZE. Execution plans show whether an index is actually used.

---

## NULL and Data Types

NULL interacts with data types in important ways. See the [NULL section in SQL Basics](01-SQL-Basics.md#null--the-most-misunderstood-concept) for full details.

### Key Points for Data Types

```sql
-- NULL is not a value and has no type
SELECT pg_typeof(NULL);  -- PostgreSQL: 'unknown'

-- NULL in typed columns
CREATE TABLE demo (
    int_col    INT,
    text_col   VARCHAR(50),
    date_col   DATE,
    bool_col   BOOLEAN
);

INSERT INTO demo VALUES (NULL, NULL, NULL, NULL);
-- All NULL values are stored, but they take up minimal storage
-- (usually just a NULL bitmap entry in the row header)

-- NULL propagation in arithmetic
SELECT int_col + 1 FROM demo;  -- NULL (any arithmetic with NULL = NULL)

-- NULL in aggregates
SELECT COUNT(*) FROM demo;       -- 1 (counts all rows, including NULLs)
SELECT COUNT(int_col) FROM demo; -- 0 (ignores NULL values)
```

### NULL and DEFAULT Values

```sql
-- A column can allow NULL but have a DEFAULT
CREATE TABLE users (
    user_id   INT PRIMARY KEY,
    nickname  VARCHAR(30) DEFAULT 'Anonymous'
);

-- INSERT without nickname: uses DEFAULT
INSERT INTO users (user_id) VALUES (1);
SELECT * FROM users;
-- user_id: 1, nickname: 'Anonymous'

-- INSERT with explicit NULL: NULL overrides DEFAULT
INSERT INTO users (user_id, nickname) VALUES (2, NULL);
SELECT * FROM users;
-- user_id: 2, nickname: NULL

-- To insert the default, use DEFAULT keyword
INSERT INTO users (user_id, nickname) VALUES (3, DEFAULT);
SELECT * FROM users;
-- user_id: 3, nickname: 'Anonymous'
```

> Common misconception: `DEFAULT` values are only used when the column is omitted from the INSERT. Explicitly passing NULL does NOT trigger the default.

---

## Identity / Auto-Increment

Generating unique sequential numbers for primary keys.

```sql
-- PostgreSQL: SERIAL or GENERATED ALWAYS AS IDENTITY
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,  -- creates a sequence automatically
    first_name  VARCHAR(50) NOT NULL
);

-- PostgreSQL 10+ (preferred): IDENTITY column
CREATE TABLE employees (
    employee_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL
);

INSERT INTO employees (first_name) VALUES ('Alice');
INSERT INTO employees (first_name) VALUES ('Bob');
SELECT * FROM employees;
-- employee_id: 1, first_name: 'Alice'
-- employee_id: 2, first_name: 'Bob'

-- To insert a specific value:
INSERT INTO employees (employee_id, first_name) OVERRIDING SYSTEM VALUE
VALUES (100, 'Charlie');
```

```sql
-- MySQL: AUTO_INCREMENT
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL
);

INSERT INTO employees (first_name) VALUES ('Alice');
-- employee_id: 1 (auto-generated)

-- MySQL: cannot insert explicit value by default (unless SQL_MODE allows it)
```

```sql
-- SQL Server: IDENTITY
CREATE TABLE employees (
    employee_id INT IDENTITY(1,1) PRIMARY KEY,  -- seed=1, increment=1
    first_name  VARCHAR(50) NOT NULL
);

INSERT INTO employees (first_name) VALUES ('Alice');
-- employee_id: 1

-- SQL Server: SET IDENTITY_INSERT ON to insert explicit values
SET IDENTITY_INSERT employees ON;
INSERT INTO employees (employee_id, first_name) VALUES (100, 'Charlie');
SET IDENTITY_INSERT employees OFF;
```

```sql
-- Oracle:SEQUENCE + trigger (or IDENTITY in 12c+)
-- Oracle 12c+:
CREATE TABLE employees (
    employee_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name  VARCHAR2(50) NOT NULL
);
```

> Production pitfall: `SERIAL` in PostgreSQL actually creates a sequence object behind the scenes. If you don't clean up sequences after dropping and recreating tables, you can run into sequence exhaustion or gaps. `IDENTITY` columns are managed automatically.

---

## Column Defaults

```sql
-- Default values for every data type
CREATE TABLE defaults_demo (
    -- Numeric default
    counter     INT DEFAULT 0,

    -- String default
    status      VARCHAR(20) DEFAULT 'pending',

    -- Boolean default
    is_active   BOOLEAN DEFAULT TRUE,

    -- Date default (current date)
    created_date DATE DEFAULT CURRENT_DATE,

    -- Timestamp default (current time)
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- NULL default (implicit when no DEFAULT and column allows NULL)
    notes       TEXT DEFAULT NULL
);

-- All defaults are used when the column is omitted from INSERT
INSERT INTO defaults_demo DEFAULT VALUES;
SELECT * FROM defaults_demo;
-- counter: 0, status: 'pending', is_active: TRUE,
-- created_date: 2024-04-10, created_at: <current timestamp>, notes: NULL
```

### Default Expressions

```sql
-- PostgreSQL: defaults can use functions
CREATE TABLE orders (
    order_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_date  DATE DEFAULT CURRENT_DATE,
    order_ref   VARCHAR(50) DEFAULT 'ORD-' || NEXTVAL('order_ref_seq'),
    total       DECIMAL(10,2) DEFAULT 0.00
);

-- MySQL: defaults can use expressions (8.0+)
CREATE TABLE orders (
    order_id    INT AUTO_INCREMENT PRIMARY KEY,
    order_ref   VARCHAR(50) DEFAULT (CONCAT('ORD-', UUID())),
    total       DECIMAL(10,2) DEFAULT (0.00)
);

-- SQL Server: defaults can use functions
CREATE TABLE orders (
    order_id    INT IDENTITY PRIMARY KEY,
    order_date  DATE DEFAULT GETDATE(),
    total       DECIMAL(10,2) DEFAULT 0.00
);
```

> Oracle does not support expression defaults in table DDL (before 21c). Use a view or trigger instead.

---

## Common Mistakes

### 1. Using FLOAT for Money

```sql
-- BAD
CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY,
    total      FLOAT NOT NULL     -- WRONG: floating-point rounding errors
);

-- BETTER
CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY,
    total      DECIMAL(12,2) NOT NULL
);
```

### 2. Storing Dates in VARCHAR

```sql
-- BAD: dates stored as strings
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    event_date VARCHAR(10) NOT NULL  -- '2024-04-10'
);

-- Problem: alphabetical sort ≠ chronological sort
SELECT * FROM events ORDER BY event_date;
-- '2024-01-10' '2024-02-01' '2024-11-01' '2024-12-25'
-- This happens to work for ISO format but fails for '04/10/2024' format

-- BETTER: use DATE
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    event_date DATE NOT NULL
);
```

### 3. VARCHAR Too Short

```sql
-- BAD: VARCHAR(20) for email — many emails are longer
CREATE TABLE users (
    email VARCHAR(20) NOT NULL  -- truncates 'very.long.email@example.com'
);

-- BETTER: VARCHAR(254) is the maximum email length per RFC 5321
CREATE TABLE users (
    email VARCHAR(254) NOT NULL
);

-- BETTER: VARCHAR(320) for maximum safety (local part + @ + domain)
CREATE TABLE users (
    email VARCHAR(320) NOT NULL
);
```

### 4. CHAR for Variable-Length Data

```sql
-- BAD: CHAR(100) for names — wastes 80 bytes for 'John'
CREATE TABLE users (
    name CHAR(100) NOT NULL  -- 'John' stored as 'John                                                            '
);

-- BETTER: VARCHAR(100)
CREATE TABLE users (
    name VARCHAR(100) NOT NULL  -- 'John' stored as 'John' (4 bytes + overhead)
);
```

### 5. INTEGER for ID that Will Grow Beyond 2 Billion

```sql
-- BAD: INT for a table that will exceed 2.1 billion rows
CREATE TABLE page_views (
    view_id INT PRIMARY KEY  -- will overflow at 2,147,483,647
);

-- BETTER: BIGINT
CREATE TABLE page_views (
    view_id BIGINT PRIMARY KEY  -- supports 9.2 × 10^18 rows
);
```

### 6. Ignoring Scale and Precision for DECIMAL

```sql
-- BAD: DECIMAL(5,2) can only store up to 999.99
CREATE TABLE prices (
    price DECIMAL(5,2) NOT NULL  -- ERROR: 1000.00 overflows
);

-- BETTER: Choose precision based on your domain
CREATE TABLE prices (
    price DECIMAL(10,2) NOT NULL  -- stores up to 99,999,999.99
);
```

### 7. Using TEXT When VARCHAR Suffices

```sql
-- BAD: TEXT for a column that is always short
CREATE TABLE users (
    country TEXT NOT NULL  -- wastes storage, prevents length constraint
);

-- BETTER: VARCHAR with appropriate length
CREATE TABLE users (
    country VARCHAR(100) NOT NULL  -- enforces reasonable limit
);
```

---

## Production Pitfalls

### 1. ALTER COLUMN TYPE on Large Tables

```sql
-- This can lock the table for hours on millions of rows
ALTER TABLE orders ALTER COLUMN total TYPE DECIMAL(15,2);
```

> Production pitfall: In PostgreSQL, `ALTER COLUMN TYPE` requires rewriting the entire table. On tables with millions of rows, this locks the table and takes a long time. Use a migration strategy:
> 1. Add a new column with the correct type
> 2. Copy data from old column to new column in batches
> 3. Swap columns
> 4. Drop old column

### 2. Implicit Cast Preventing Index Usage

```sql
-- If order_ref is VARCHAR and you compare to INTEGER:
SELECT * FROM orders WHERE order_ref = 101;
-- PostgreSQL: ERROR (no implicit cast)
-- MySQL: may cast all order_ref values to numeric, preventing index usage
-- SQL Server: depends on collation and SET compatibility level

-- Always match types explicitly
SELECT * FROM orders WHERE order_ref = '101';
```

### 3. TEXT/BLOB Columns and Temporary Tables

> MySQL and SQL Server may store TEXT/BLOB data off-page (in a separate location), which adds I/O overhead for retrieval. In MySQL, queries that use temporary tables with TEXT columns may fall back to on-disk temporary tables (slower).

### 4. TIMESTAMP Overflow

```sql
-- MySQL TIMESTAMP range: 1970-01-01 to 2038-01-19 03:14:07 UTC
-- This is the Year 2038 problem (same as Unix timestamp overflow)

-- MySQL DATETIME range: 1000-01-01 to 9999-12-31
-- Use DATETIME instead of TIMESTAMP if you need dates beyond 2038

-- PostgreSQL TIMESTAMPTZ range: 4713 BC to 294276 AD (no Year 2038 problem)
```

### 5. Empty String vs NULL

```sql
-- These are NOT the same
INSERT INTO users (user_id, nickname) VALUES (1, '');    -- empty string (NOT NULL)
INSERT INTO users (user_id, nickname) VALUES (2, NULL);  -- NULL (absence of value)

SELECT * FROM users WHERE nickname = '';    -- returns user 1 only
SELECT * FROM users WHERE nickname IS NULL; -- returns user 2 only
SELECT * FROM users WHERE nickname IS NULL OR nickname = ''; -- returns both
```

---

## Performance Implications

### Storage Size Affects Everything

Larger data types mean:
- More disk space
- More memory usage (buffer pool, sort operations)
- Larger indexes (slower scans, more I/O)
- Slower network transfer

| Type | Storage | Impact |
|------|---------|--------|
| `TINYINT` | 1 byte | Fastest |
| `SMALLINT` | 2 bytes | Fast |
| `INT` | 4 bytes | Standard |
| `BIGINT` | 8 bytes | Use when needed |
| `DECIMAL(10,2)` | 5 bytes (approx.) | Exact, moderate |
| `FLOAT` | 4 bytes | Fast, imprecise |
| `DOUBLE` | 8 bytes | Fast, more precise than FLOAT |
| `VARCHAR(30)` | Actual + 1-2 bytes | Efficient for short text |
| `VARCHAR(500)` | Actual + 2 bytes | Use when data is long |
| `TEXT` | Actual + overhead | May be stored off-page |

### Index Size by Type

```sql
-- Larger column types produce larger indexes
-- An index on BIGINT (8 bytes) is twice the size of an index on INT (4 bytes)
-- for the same number of rows.

-- PostgreSQL: check index size
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename = 'employees';
```

### DECIMAL vs FLOAT Performance

> In most databases, `FLOAT` and `DOUBLE` arithmetic is faster than `DECIMAL` because hardware has native floating-point support. `DECIMAL` requires software arithmetic. However, the difference is negligible for most queries. Always choose the correct type for correctness first, then optimize if profiling shows the type is a bottleneck.

> Verify with EXPLAIN ANALYZE — never guess about performance.

### VARCHAR Length and Indexes

```sql
-- Some databases limit index key size
-- MySQL InnoDB: max key length is 3072 bytes (for utf8mb4, that's ~768 characters)
-- PostgreSQL: max index key length is ~8191 bytes (depends on version)
-- SQL Server: max index key length is 900 bytes

-- If you create an index on a very wide VARCHAR, it may fail:
-- ERROR: index row size exceeds maximum
-- This is another reason not to use VARCHAR(MAX) or TEXT for indexed columns
```

---

## Comparison Tables

### Numeric Types

| Type | Storage | Exact? | Range | Use For |
|------|---------|--------|-------|---------|
| `TINYINT` | 1 B | Yes | -128 to 127 | Small codes |
| `SMALLINT` | 2 B | Yes | -32K to 32K | Moderate IDs |
| `INT` | 4 B | Yes | ±2.1B | Standard IDs |
| `BIGINT` | 8 B | Yes | ±9.2E18 | Large tables |
| `DECIMAL(p,s)` | ~5 B | Yes | Depends on p | Money |
| `REAL` | 4 B | No | ±3.4E38 | Scientific |
| `DOUBLE` | 8 B | No | ±1.7E308 | Scientific |

### String Types

| Type | Variable? | Max Size | Use For |
|------|-----------|----------|---------|
| `CHAR(n)` | No (padded) | n chars | Fixed codes (ISO) |
| `VARCHAR(n)` | Yes | n chars | Names, emails |
| `TEXT` | Yes | Very large | Long content |
| `VARCHAR(MAX)` | Yes | 2 GB | SQL Server long text |

### Date/Time Types

| Type | Stores | Timezone? | Use For |
|------|--------|-----------|---------|
| `DATE` | Date only | N/A | Birth dates, deadlines |
| `TIME` | Time only | N/A | Store hours |
| `TIMESTAMP` / `DATETIME` | Date + Time | No (literal) | Application-controlled |
| `TIMESTAMPTZ` / `DATETIMEOFFSET` | Date + Time + TZ | Yes (UTC internally) | Cross-timezone |

### Boolean Representations

| Database | Type | TRUE | FALSE | NULL |
|----------|------|------|-------|------|
| PostgreSQL | `BOOLEAN` | `TRUE` | `FALSE` | `NULL` |
| MySQL | `BOOLEAN` / `TINYINT(1)` | `1` / `TRUE` | `0` / `FALSE` | `NULL` |
| SQL Server | `BIT` | `1` | `0` | `NULL` |
| Oracle | `NUMBER(1)` | `1` | `0` | `NULL` |

---

## Best Practices

| Practice | Why |
|----------|-----|
| Use `DECIMAL` for money | Avoids floating-point rounding errors |
| Use `DATE` for dates, not `VARCHAR` | Correct sorting, arithmetic, indexing |
| Use `TIMESTAMPTZ` when timezone matters | Avoids ambiguous timestamps |
| Choose the smallest adequate integer type | Saves storage and speeds up indexes |
| Use `VARCHAR(n)` over `CHAR(n)` for variable-length data | Avoids wasted padding storage |
| Use `BIGINT` for high-volume tables | Avoids integer overflow |
| Set appropriate `VARCHAR` lengths | Enforce data quality at the database level |
| Use `BOOLEAN` in PostgreSQL, `BIT` in SQL Server, `TINYINT(1)` in MySQL | Platform-appropriate boolean storage |
| Store timestamps in UTC internally | Avoid timezone-related bugs |
| Avoid `TEXT` / `BLOB` for indexed columns | Some databases cannot index them efficiently |
| Store files in object storage, not database | Easier management, backup, CDN access |
| Use `IDENTITY` over `SERIAL` (PostgreSQL) | Better sequence management |
| Always match types in comparisons | Prevents implicit cast that kills index usage |

---

# Interview Questions

## Beginner

1. What is the difference between `CHAR` and `VARCHAR`?
2. When would you use `INT` vs `BIGINT` for a primary key?
3. What is the difference between `DATE` and `TIMESTAMP`?
4. Why should you use `DECIMAL` instead of `FLOAT` for money?
5. What does `BOOLEAN` mean in MySQL vs PostgreSQL?
6. What is the difference between `TEXT` and `VARCHAR(255)`?
7. What happens if you try to store `'2024-13-01'` in a `DATE` column?
8. What is the default value of a column if you do not specify `DEFAULT` and allow NULLs?

## Intermediate

9. What is the difference between `TIMESTAMP` and `TIMESTAMPTZ` in PostgreSQL?
10. How does MySQL's `TIMESTAMP` handle timezone conversion differently from `DATETIME`?
11. Explain integer division: what does `SELECT 7 / 2` return in PostgreSQL? In SQL Server? In Oracle?
12. Why can `VARCHAR(100)` and `VARCHAR(200)` have different performance characteristics?
13. What is implicit type conversion and why can it be dangerous?
14. Explain the `DECIMAL(10,2)` type. What is the precision? What is the scale? What is the range?
15. What is the Year 2038 problem and which databases are affected?

## Advanced

16. How do you add a new value to an ENUM type in PostgreSQL without locking the table?
17. Why might changing a column from `VARCHAR(50)` to `VARCHAR(500)` on a 50-million-row table be dangerous?
18. Explain how `BINARY(16)` UUID storage works in MySQL and why it is preferred over `CHAR(36)`.
19. What is the difference between `NUMERIC` and `FLOAT` in terms of internal representation?
20. How does `NULL` interact with `DEFAULT` values? If a column has `DEFAULT 'active'` and you `INSERT ... (col) VALUES (NULL)`, what is stored?

## Scenario Based

21. A developer stores monetary amounts in a `FLOAT` column. After processing 10,000 transactions, the total is off by $0.03. Explain the root cause and the fix.
22. Your team needs to store product descriptions (up to 10,000 characters), product names (up to 200 characters), and ISO country codes (exactly 2 characters). Choose the appropriate data types and justify each choice.
23. A query comparing a `VARCHAR` column to an integer value is slow. You verify the column has an index. Explain why the query might not be using the index and how to fix it.
24. Your application stores timestamps without timezone information. Users in New York and Tokyo see different "created_at" times for the same record. What went wrong and how do you fix it?
25. A table stores boolean flags as `VARCHAR(5)` with values `'true'` and `'false'`. A query `WHERE is_active = 'true'` returns all rows. Explain the likely cause.

## Tricky

26. What is the result of `SELECT CAST(0.1 AS FLOAT) + CAST(0.2 AS FLOAT) = 0.3`?
27. In PostgreSQL, what is the storage difference between `CHAR(100)` and `VARCHAR(100)` for the value `'hi'`?
28. What happens when you `INSERT INTO t (int_col) VALUES ('abc')` where `int_col` is `INT`?
29. Can a `BOOLEAN` column ever have a value other than `TRUE`, `FALSE`, or `NULL`? Explain.
30. What is the result of `SELECT 10 / 3; SELECT 10.0 / 3; SELECT 10 / 3.0;` in PostgreSQL?

## Output Prediction

Given the sample tables above, predict the output:

31.
```sql
SELECT
    CAST(price AS INT) AS truncated_price,
    price
FROM products
WHERE product_id <= 3;
```

32.
```sql
SELECT
    product_name,
    LENGTH(product_name) AS name_length,
    SUBSTRING(product_name FROM 1 FOR 3) AS first_three
FROM products
WHERE product_id = 2;
```

33.
```sql
SELECT
    txn_id,
    txn_date,
    txn_date + INTERVAL '7 days' AS one_week_later
FROM transactions
WHERE txn_id <= 3;
```

34.
```sql
SELECT
    user_id,
    username,
    bio IS NULL AS has_bio,
    avatar_url IS NOT NULL AS has_avatar
FROM user_profiles;
```

35.
```sql
SELECT
    product_id,
    price,
    CASE
        WHEN price < 10 THEN 'cheap'
        WHEN price < 50 THEN 'medium'
        ELSE 'expensive'
    END AS price_category
FROM products
WHERE product_id IN (4, 1, 6);
```

## Debugging

36. The following query returns 0 rows but the developer knows `'alice_dev'` exists. Why?
```sql
SELECT * FROM user_profiles WHERE username = Alice;
```

37. This INSERT fails with a truncation warning. What is wrong?
```sql
CREATE TABLE contacts (name VARCHAR(5));
INSERT INTO contacts VALUES ('Alexander');
```

38. A query `SELECT * FROM orders WHERE total = 0.1 + 0.2` returns rows with `total = 0.3`. But a developer claims their FLOAT column never matches. Explain why `0.1 + 0.2` can equal `0.3` in some cases but not others.

39. The following query works on MySQL but fails on PostgreSQL. Why?
```sql
SELECT * FROM users WHERE nickname = NULL;
```

40. A developer stores timestamps as `VARCHAR(20)` in format `'YYYY-MM-DD HH:MI:SS'`. They report that `ORDER BY timestamp_col` sometimes returns incorrect chronological order. Explain.

## Performance

41. You have a table with 50 million rows. The column `email VARCHAR(320)` is indexed. Queries filtering on `email` are slow. After investigation, you find many emails are actually short (10-30 characters). Suggest improvements and explain why shorter `VARCHAR` might help.
42. A table uses `TEXT` columns for `first_name`, `last_name`, and `email`. You add an index on `(last_name, first_name)`. Explain potential issues and suggest a better schema design.
43. You need to store 1 billion UUIDs as primary keys. Compare `CHAR(36)` vs `BINARY(16)` in terms of storage, index size, and query performance.
44. A table has a `status VARCHAR(50)` column with only 3 distinct values (`'active'`, `'inactive'`, `'pending'`). A developer suggests changing it to `ENUM` for performance. Is this correct? What other considerations exist?
45. You are designing a schema for an IoT system that will ingest 10 million timestamped sensor readings per day. What data types would you choose for the timestamp, sensor ID, and reading value? Justify your choices.
