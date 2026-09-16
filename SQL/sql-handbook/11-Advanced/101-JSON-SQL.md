# JSON in SQL — Comprehensive Guide

## Table of Contents

- [Fundamentals](#fundamentals)
- [Database-Specific JSON Support](#database-specific-json-support)
- [JSON Data Types](#json-data-types)
- [Creating and Inserting JSON](#creating-and-inserting-json)
- [Extracting Values from JSON](#extracting-values-from-json)
- [Modifying JSON Data](#modifying-json-data)
- [Querying JSON Data](#querying-json-data)
- [JSON Aggregation](#json-aggregation)
- [JSON and Relational Joins](#json-and-relational-joins)
- [JSON Schema Validation](#json-schema-validation)
- [Performance Optimization](#performance-optimization)
- [Edge Cases and NULL Behavior](#edge-cases-and-null-behavior)
- [Common Mistakes](#common-mistakes)
- [Production Pitfalls](#production-pitfalls)
- [Interview Traps](#interview-traps)
- [Comparison Tables](#comparison-tables)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Fundamentals

### What is JSON in SQL?

JSON (JavaScript Object Notation) in SQL refers to the ability to store, query, and manipulate semi-structured JSON data within a relational database. Modern RDBMS systems provide native JSON data types and functions to work with JSON documents.

### Why Does It Exist?

1. **Flexibility** — Schema-less data storage for evolving data structures
2. **Integration** — APIs, logs, and external systems often return JSON
3. **Hybrid Models** — Combine relational integrity with document flexibility
4. **Performance** — Native JSON types outperform storing JSON as text
5. **Queryability** — Index and query JSON fields like regular columns

### When to Use JSON in SQL

| Use Case | Recommendation |
|----------|----------------|
| External API responses | JSON columns |
| User preferences/settings | JSON columns |
| Event logs with variable schema | JSON columns |
| Audit trails | JSON columns |
| Core business entities (users, orders) | Relational columns |
| Data requiring complex joins | Relational columns |
| Reporting and analytics | Relational columns |
| Frequently queried fields | Relational columns (or generated columns with indexes) |

> **Production pitfall**: JSON should supplement, not replace, proper relational design. If you find yourself joining JSON documents frequently or querying multiple JSON fields, consider normalizing into proper tables.

---

## Database-Specific JSON Support

### Feature Comparison

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---------|------------|-------|------------|--------|
| Native JSON type | ✅ (9.4+) | ✅ (5.7+) | ✅ (2016+) | ✅ (21c+) |
| JSON extract operators | `->`, `->>`, `#>` , `#>>` | `->`, `->>`, `->'$'` | `JSON_VALUE`, `JSON_QUERY` | `JSON_VALUE`, `JSON_QUERY` |
| JSON path language | Custom | Custom (limited) | SQL/JSON (ISO) | SQL/JSON (ISO) |
| JSON aggregation | `json_agg`, `jsonb_agg` | `JSON_ARRAYAGG`, `JSON_OBJECTAGG` | `FOR JSON PATH` | `JSON_ARRAYAGG`, `JSON_OBJECTAGG` |
| JSON indexes | GIN, B-Tree on expression | Generated columns + indexes | Computed columns + indexes | Search index, Function-based |
| JSON validation | CHECK constraint | Limited | OPENJSON validation | JSON schema (21c+) |
| JSONB (binary) | ✅ | ❌ | ❌ | ❌ |
| JSONB operators | `@>`, `?`, `?&`, `?\|` | ❌ | ❌ | ❌ |
| JSON_TABLE | ❌ (use `json_to_recordset`) | ✅ (8.0+) | ✅ (2016+) | ✅ (21c+) |

### Terminology

| Database | JSON Type Name | Notes |
|----------|---------------|-------|
| PostgreSQL | `json`, `jsonb` | `jsonb` is binary, preferred for querying |
| MySQL | `JSON` | Stored as optimized binary format internally |
| SQL Server | `NVARCHAR(MAX)` with JSON | No native type, validated via functions |
| Oracle | `CLOB`, `BLOB` with `IS JSON` | 21c adds native `JSON` type |

---

## JSON Data Types

### PostgreSQL: json vs jsonb

```sql
-- json: Stores exact text, preserves formatting, slower queries
CREATE TABLE logs_json (
    id SERIAL PRIMARY KEY,
    data json
);

-- jsonb: Binary storage, faster indexing, supports operators
CREATE TABLE logs_jsonb (
    id SERIAL PRIMARY KEY,
    data jsonb
);
```

| Aspect | json | jsonb |
|--------|------|-------|
| Storage | Exact text | Binary decomposed |
| Indexing | Limited | Full GIN/GiST support |
| Operators | `->`, `->>` | All json operators + `@>`, `?`, `?&`, `?\|` |
| Reparsing | Every access | On insert only |
| Key ordering | Input order | Sorted (lossless) |
| Duplicate keys | Preserved | Last value wins |
| Recommendation | Rarely | **Preferred** |

> **Production pitfall**: Always use `jsonb` in PostgreSQL unless you have a specific reason to preserve exact text formatting.

### MySQL JSON

```sql
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payload JSON
);
```

MySQL validates JSON on insert. Invalid JSON is rejected:

```sql
INSERT INTO events (payload) VALUES ('not json');
-- Error: Invalid JSON text
```

### SQL Server

SQL Server stores JSON as `NVARCHAR(MAX)` — there is no dedicated JSON type:

```sql
CREATE TABLE events (
    id INT IDENTITY PRIMARY KEY,
    payload NVARCHAR(MAX)
);

-- Add constraint for validation (SQL Server 2016+)
ALTER TABLE events
ADD CONSTRAINT CK_valid_json CHECK (ISJSON(payload) = 1);
```

---

## Creating and Inserting JSON

### Sample Tables

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    profile JSONB
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    order_date TIMESTAMP,
    metadata JSONB
);

CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR(100),
    attributes JSONB
);

CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Sample Data

```sql
INSERT INTO users VALUES
(1, 'Alice Chen', 'alice@example.com',
 '{"age": 30, "address": {"city": "New York", "zip": "10001"}, "tags": ["premium", "active"], "phone": null}'),
(2, 'Bob Smith', 'bob@example.com',
 '{"age": 25, "address": {"city": "San Francisco", "zip": "94102"}, "tags": ["active"]}'),
(3, 'Carol Davis', 'carol@example.com',
 '{"age": 35, "address": {"city": "Chicago", "zip": "60601"}, "tags": ["premium"], "phone": "+1-555-0123"}'),
(4, 'Dave Wilson', 'dave@example.com',
 '{"address": {}}');

INSERT INTO orders VALUES
(101, 1, '2025-01-15', '{"status": "shipped", "items": [{"sku": "A1", "qty": 2}], "notes": "fragile"}'),
(102, 1, '2025-02-20', '{"status": "delivered", "items": [{"sku": "B2", "qty": 1}, {"sku": "C3", "qty": 3}]}'),
(103, 2, '2025-03-10', '{"status": "processing", "items": [{"sku": "A1", "qty": 1}], "discount": 0.10}');

INSERT INTO products VALUES
(1, 'Laptop', '{"color": "silver", "specs": {"ram": "16GB", "storage": "512GB SSD"}, "warranty_months": 24}'),
(2, 'Phone', '{"color": "black", "specs": {"ram": "8GB", "storage": "128GB"}, "warranty_months": 12, "accessories": ["case", "charger"]}'),
(3, 'Tablet', '{"color": "white", "specs": {"ram": "4GB", "storage": "64GB"}, "warranty_months": 12}');
```

**Grain**: Each row in `users` is one user. The `profile` column contains semi-structured data that varies between users.

---

## Extracting Values from JSON

### PostgreSQL Extraction Operators

| Operator | Returns | Nullable |
|----------|---------|----------|
| `->` | JSON object | No (returns JSON) |
| `->>` | Text | Yes |
| `#>` | JSON object by path | No |
| `#>>` | Text by path | Yes |

```sql
-- -> returns JSONB
SELECT profile -> 'age' FROM users WHERE user_id = 1;
-- Result: 30

-- ->> returns text
SELECT profile ->> 'age' FROM users WHERE user_id = 1;
-- Result: '30'

-- Nested access with #>>
SELECT profile #>> '{address,city}' AS city FROM users WHERE user_id = 1;
-- Result: 'New York'

-- Chain operators
SELECT profile -> 'address' ->> 'city' AS city FROM users WHERE user_id = 1;
-- Result: 'New York'
```

### JSON Path Expressions (PostgreSQL 12+)

```sql
-- Using jsonb_path_query for complex paths
SELECT jsonb_path_query(profile, '$.address.city') FROM users WHERE user_id = 1;

-- With filters
SELECT jsonb_path_query(profile, '$.tags[*] ? (@ == "premium")') FROM users WHERE user_id = 1;
```

### MySQL JSON Extraction

```sql
-- -> returns JSON
SELECT profile -> '$.age' FROM users WHERE user_id = 1;

-- ->> returns text
SELECT profile ->> '$.age' FROM users WHERE user_id = 1;

-- JSON_EXTRACT (equivalent to ->)
SELECT JSON_EXTRACT(profile, '$.address.city') FROM users WHERE user_id = 1;

-- Unquote with JSON_UNQUOTE
SELECT JSON_UNQUOTE(JSON_EXTRACT(profile, '$.address.city')) FROM users WHERE user_id = 1;
```

### SQL Server JSON Extraction

```sql
-- JSON_VALUE returns scalar value
SELECT JSON_VALUE(payload, '$.status') FROM orders WHERE order_id = 101;

-- JSON_QUERY returns JSON fragment
SELECT JSON_QUERY(payload, '$.items') FROM orders WHERE order_id = 101;

-- OPENJSON for parsing arrays into rows
SELECT value AS item
FROM orders
CROSS APPLY OPENJSON(payload, '$.items')
WHERE order_id = 101;
```

### Oracle JSON Extraction

```sql
-- JSON_VALUE returns scalar
SELECT JSON_VALUE(profile, '$.age') FROM users WHERE user_id = 1;

-- JSON_QUERY returns JSON fragment
SELECT JSON_QUERY(profile, '$.address') FROM users WHERE user_id = 1;
```

### Extracting Array Elements

```sql
-- PostgreSQL: Access array by index (0-based)
SELECT profile -> 'tags' -> 0 AS first_tag FROM users WHERE user_id = 1;
-- Result: "premium"

-- PostgreSQL: Array length
SELECT jsonb_array_length(profile -> 'tags') AS tag_count FROM users WHERE user_id = 1;
-- Result: 2

-- PostgreSQL: Unnest array into rows
SELECT user_id, jsonb_array_elements_text(profile -> 'tags') AS tag
FROM users
WHERE profile ? 'tags';
```

**Expected output:**

| user_id | tag |
|---------|-----|
| 1 | premium |
| 1 | active |
| 2 | active |
| 3 | premium |

### Converting JSON Types to SQL Types

```sql
-- PostgreSQL: Cast JSON text to native types
SELECT (profile ->> 'age')::int AS age FROM users WHERE user_id = 1;

-- PostgreSQL: Convert JSONB object to recordset
SELECT *
FROM jsonb_to_recordset(
    '[{"x": 1, "y": "a"}, {"x": 2, "y": "b"}]'
) AS t(x int, y text);

-- MySQL: CAST
SELECT CAST(profile ->> '$.age' AS UNSIGNED) FROM users WHERE user_id = 1;

-- SQL Server: OPENJSON with schema
SELECT *
FROM OPENJSON(
    (SELECT payload FROM orders WHERE order_id = 101),
    '$.items'
) WITH (
    sku VARCHAR(10) '$.sku',
    qty INT '$.qty'
);
```

---

## Modifying JSON Data

### PostgreSQL JSONB Modification

```sql
-- Set a value
UPDATE users
SET profile = jsonb_set(profile, '{age}', '31')
WHERE user_id = 1;

-- Set nested value
UPDATE users
SET profile = jsonb_set(profile, '{address,city}', '"Boston"')
WHERE user_id = 1;

-- Remove a key
UPDATE users
SET profile = profile - 'phone'
WHERE user_id = 1;

-- Remove nested key
UPDATE users
SET profile #- '{address,zip}'
WHERE user_id = 1;

-- Add key-value pair
UPDATE users
SET profile = profile || '{"role": "admin"}'
WHERE user_id = 1;

-- Merge objects (deep merge with #|| or shallow with ||)
UPDATE users
SET profile = profile || '{"address": {"country": "US"}}'
WHERE user_id = 1;
-- Note: || does shallow merge, overwrites 'address' entirely
-- Use #|| for deep merge (PostgreSQL 17+)
```

### MySQL JSON Modification

```sql
-- Set value
UPDATE users
SET profile = JSON_SET(profile, '$.age', 31)
WHERE user_id = 1;

-- Insert (only if key doesn't exist)
UPDATE users
SET profile = JSON_INSERT(profile, '$.role', 'admin')
WHERE user_id = 1;

-- Replace existing value
UPDATE users
SET profile = JSON_REPLACE(profile, '$.age', 32)
WHERE user_id = 1;

-- Remove key
UPDATE users
SET profile = JSON_REMOVE(profile, '$.phone')
WHERE user_id = 1;
```

### SQL Server JSON Modification

SQL Server does not support in-place JSON modification. You must reconstruct:

```sql
-- SQL Server: Rebuild JSON string
UPDATE orders
SET payload = JSON_MODIFY(payload, '$.status', 'shipped')
WHERE order_id = 101;

-- Remove key
UPDATE orders
SET payload = JSON_MODIFY(payload, '$.notes', NULL)
WHERE order_id = 101;
```

### Bulk JSON Updates

```sql
-- PostgreSQL: Use jsonb_build_object for structured updates
UPDATE users
SET profile = profile || jsonb_build_object(
    'last_updated', to_jsonb(NOW()),
    'version', COALESCE((profile ->> 'version')::int, 0) + 1
)
WHERE user_id = 1;
```

---

## Querying JSON Data

### Filtering by JSON Values

```sql
-- PostgreSQL: Find users older than 28
SELECT user_id, name, profile ->> 'age' AS age
FROM users
WHERE (profile ->> 'age')::int > 28;
```

**Expected output:**

| user_id | name | age |
|---------|------|-----|
| 1 | Alice Chen | 30 |
| 3 | Carol Davis | 35 |

```sql
-- PostgreSQL: Find users in New York
SELECT user_id, name
FROM users
WHERE profile -> 'address' ->> 'city' = 'New York';
```

```sql
-- MySQL: Equivalent
SELECT user_id, name, profile ->> '$.age' AS age
FROM users
WHERE JSON_EXTRACT(profile, '$.age') > 28;
```

```sql
-- SQL Server: Equivalent
SELECT user_id, name, JSON_VALUE(payload, '$.status') AS status
FROM orders
WHERE JSON_VALUE(payload, '$.status') = 'shipped';
```

### Array Containment Queries

```sql
-- PostgreSQL: Check if array contains value
SELECT user_id, name
FROM users
WHERE profile -> 'tags' ? 'premium';
```

**Expected output:**

| user_id | name |
|---------|------|
| 1 | Alice Chen |
| 3 | Carol Davis |

```sql
-- PostgreSQL: Check all values present
SELECT user_id, name
FROM users
WHERE profile -> 'tags' ?& ARRAY['premium', 'active'];

-- PostgreSQL: Check any value present
SELECT user_id, name
FROM users
WHERE profile -> 'tags' ?| ARRAY['premium', 'active'];

-- MySQL: Use JSON_CONTAINS
SELECT user_id, name
FROM users
WHERE JSON_CONTAINS(profile -> '$.tags', '"premium"');

-- SQL Server: Use OPENJSON
SELECT u.user_id, u.name
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM OPENJSON(u.profile, '$.tags')
    WHERE value = 'premium'
);
```

### Existence Checks

```sql
-- PostgreSQL: Check if key exists
SELECT user_id, name
FROM users
WHERE profile ? 'phone';

-- PostgreSQL: Check if path exists
SELECT user_id, name
FROM users
WHERE profile @? '$.address.city';

-- MySQL: Use JSON_CONTAINS_PATH
SELECT user_id, name
FROM users
WHERE JSON_CONTAINS_PATH(profile, 'one', '$.phone');
```

### Existence Checks with NULL Handling

```sql
-- PostgreSQL: jsonb vs json for existence
-- jsonb: ? operator excludes NULL values
SELECT user_id, name
FROM users
WHERE profile ? 'phone';
-- Returns user 3 only (user 1 has phone: null, jsonb ? excludes it)

-- For JSON type, ? includes NULL values
-- For jsonb, use jsonb_typeof to check
SELECT user_id, name
FROM users
WHERE profile -> 'phone' IS NOT NULL;
-- Returns user 3 only
```

> **Interview trap**: The `?` operator on `jsonb` returns true for keys that exist with non-null values. A key with a JSON null value (`"phone": null`) will NOT match `?`. This differs from `?&` which also excludes nulls. To find rows where the key exists regardless of value, use `@? '$.phone'` or `profile -> 'phone' IS NOT NULL`.

### Unnesting Arrays into Rows

```sql
-- PostgreSQL: Expand order items
SELECT
    o.order_id,
    item ->> 'sku' AS sku,
    (item ->> 'qty')::int AS qty
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item;
```

**Expected output:**

| order_id | sku | qty |
|----------|-----|-----|
| 101 | A1 | 2 |
| 102 | B2 | 1 |
| 102 | C3 | 3 |
| 103 | A1 | 1 |

```sql
-- MySQL: Equivalent using JSON_TABLE
SELECT
    o.order_id,
    t.sku,
    t.qty
FROM orders o,
JSON_TABLE(o.metadata, '$.items[*]' COLUMNS (
    sku VARCHAR(10) PATH '$.sku',
    qty INT PATH '$.qty'
)) AS t;
```

```sql
-- SQL Server: Equivalent using OPENJSON
SELECT
    o.order_id,
    j.sku,
    j.qty
FROM orders o
CROSS APPLY OPENJSON(o.payload, '$.items')
WITH (
    sku VARCHAR(10) '$.sku',
    qty INT '$.qty'
) AS j;
```

---

## JSON Aggregation

### Creating JSON from Relational Data

```sql
-- PostgreSQL: Build JSON array from rows
SELECT
    u.user_id,
    u.name,
    json_agg(
        json_build_object('order_id', o.order_id, 'date', o.order_date)
    ) AS orders
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.name;
```

**Expected output:**

| user_id | name | orders |
|---------|------|--------|
| 1 | Alice Chen | [{"order_id": 101, "date": "2025-01-15"}, {"order_id": 102, "date": "2025-02-20"}] |
| 2 | Bob Smith | [{"order_id": 103, "date": "2025-03-10"}] |
| 3 | Carol Davis | null |
| 4 | Dave Wilson | null |

```sql
-- PostgreSQL: Build JSON object from multiple columns
SELECT row_to_json(u) FROM users u WHERE user_id = 1;
```

```sql
-- MySQL: JSON_ARRAYAGG and JSON_OBJECTAGG
SELECT
    u.user_id,
    u.name,
    JSON_ARRAYAGG(
        JSON_OBJECT('order_id', o.order_id, 'date', o.order_date)
    ) AS orders
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.name;
```

```sql
-- SQL Server: FOR JSON PATH
SELECT
    u.user_id AS [user.id],
    u.name AS [user.name],
    o.order_id AS [user.orders[].id],
    o.order_date AS [user.orders[].date]
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
FOR JSON PATH, ROOT('users');
```

### Aggregating JSON Values

```sql
-- PostgreSQL: Aggregate JSONB values
SELECT
    u.user_id,
    jsonb_agg(DISTINCT tag) AS all_tags
FROM users u,
LATERAL jsonb_array_elements_text(u.profile -> 'tags') AS tag
GROUP BY u.user_id;

-- PostgreSQL: Merge JSONB objects
SELECT
    user_id,
    jsonb_object_agg(key, value) AS merged
FROM users,
LATERAL jsonb_each(profile) AS kv
WHERE user_id IN (1, 2)
GROUP BY user_id;
```

---

## JSON and Relational Joins

### Querying JSON with JOINs

```sql
-- Find orders with product details
-- Bad approach: unnesting JSON then joining without care
SELECT
    o.order_id,
    item ->> 'sku' AS sku,
    p.name AS product_name
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item
LEFT JOIN products p ON item ->> 'sku' = p.name;
-- Problem: p.name is not SKU, this join is wrong

-- Better approach: Store product_id in JSON, join properly
-- Or better yet, use a proper order_items table
```

### Fan-out with JSON Arrays

```sql
-- Potential fan-out when unnesting JSON arrays + joining
SELECT
    o.order_id,
    item ->> 'sku' AS sku,
    p.product_id
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item
LEFT JOIN products p ON item ->> 'sku' = p.name;
-- If a product has duplicate names, this creates fan-out
-- One order item can multiply into multiple rows

-- Always verify row counts match expectations
```

> **Production pitfall**: When unnesting JSON arrays and joining with relational tables, you can accidentally create duplicates. Always verify: does the row count after join match the count of unnested items? Use `DISTINCT` or aggregation if needed.

### Normalizing JSON to Relational

```sql
-- When to normalize: High-frequency queries on JSON fields
-- PostgreSQL: Extract and materialize
CREATE MATERIALIZED VIEW order_items AS
SELECT
    o.order_id,
    o.user_id,
    o.order_date,
    item ->> 'sku' AS sku,
    (item ->> 'qty')::int AS quantity
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item;

-- Refresh periodically
REFRESH MATERIALIZED VIEW order_items;
```

---

## JSON Schema Validation

### PostgreSQL CHECK Constraint

```sql
-- Validate JSON structure using CHECK constraint
ALTER TABLE users ADD CONSTRAINT valid_profile
CHECK (
    jsonb_typeof(profile) = 'object'
    AND profile ? 'age'
    AND jsonb_typeof(profile -> 'age') = 'number'
);
```

### MySQL JSON Validation

```sql
-- MySQL validates JSON syntax on insert automatically
-- For schema validation, use triggers:

DELIMITER //
CREATE TRIGGER validate_user_profile
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF JSON_EXTRACT(NEW.profile, '$.age') IS NULL
       OR NOT JSON_CONTAINS_PATH(NEW.profile, 'one', '$.address.city')
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid profile structure: age and address.city required';
    END IF;
END //
DELIMITER ;
```

### SQL Server Validation

```sql
-- SQL Server: Use ISJSON + JSON_VALUE
ALTER TABLE users ADD CONSTRAINT valid_profile
CHECK (
    ISJSON(profile) = 1
    AND JSON_VALUE(profile, '$.age') IS NOT NULL
);
```

### PostgreSQL 21c+ / Oracle 21c+ JSON Schema

```sql
-- Oracle 21c: Native JSON schema validation
CREATE TABLE users (
    user_id NUMBER PRIMARY KEY,
    profile JSON VALIDATE (
        '{"type": "object", "required": ["age", "address"], "properties": {
            "age": {"type": "number"},
            "address": {"type": "object", "required": ["city"]}
        }}'
    )
);
```

---

## Performance Optimization

### JSON Indexing

#### PostgreSQL GIN Index

```sql
-- General purpose GIN index for containment queries
CREATE INDEX idx_users_profile_gin ON users USING GIN (profile);

-- Supports: ?, ?|, ?&, @>, @?, @@
SELECT * FROM users WHERE profile ? 'premium';
SELECT * FROM users WHERE profile @> '{"tags": ["premium"]}';

-- Specific operator class for key-value queries
CREATE INDEX idx_users_profile_path ON users USING GIN (profile jsonb_path_ops);
-- jsonb_path_ops is smaller, faster for @> but doesn't support ? operators
```

#### Expression Indexes on JSON Fields

```sql
-- Index specific extracted values for faster equality/range queries
CREATE INDEX idx_users_age ON users ((profile ->> 'age')::int);
CREATE INDEX idx_users_city ON users ((profile #>> '{address,city}'));
CREATE INDEX idx_orders_status ON orders ((metadata ->> 'status'));

-- Now these queries can use the index:
SELECT * FROM users WHERE (profile ->> 'age')::int = 30;
SELECT * FROM users WHERE profile #>> '{address,city}' = 'New York';
SELECT * FROM orders WHERE metadata ->> 'status' = 'shipped';
```

#### MySQL Indexing

```sql
-- MySQL: Use generated columns + indexes
ALTER TABLE users
ADD COLUMN age INT GENERATED ALWAYS AS (profile ->> '$.age') VIRTUAL,
ADD INDEX idx_age (age);

ALTER TABLE users
ADD COLUMN city VARCHAR(50) GENERATED ALWAYS AS (profile ->> '$.address.city') VIRTUAL,
ADD INDEX idx_city (city);
```

#### SQL Server Indexing

```sql
-- SQL Server: Computed columns + indexes
ALTER TABLE users
ADD age AS JSON_VALUE(profile, '$.age') PERSISTED;
CREATE INDEX idx_users_age ON users(age);

-- Multi-attribute index
ALTER TABLE users
ADD city AS JSON_VALUE(profile, '$.address.city') PERSISTED;
CREATE INDEX idx_users_city ON users(city);
```

### Sargability and JSON

```sql
-- Bad: Non-sargable, cannot use index efficiently
SELECT * FROM users
WHERE UPPER(profile ->> 'status') = 'ACTIVE';

-- Better: If frequently queried, create a generated column
ALTER TABLE users
ADD COLUMN status TEXT GENERATED ALWAYS AS (profile ->> 'status') STORED;
CREATE INDEX idx_users_status ON users(UPPER(status));

SELECT * FROM users
WHERE UPPER(status) = 'ACTIVE';
```

### Execution Plan Verification

```sql
-- Always verify with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM users WHERE profile ->> 'status' = 'active';

-- Check for sequential scans vs index scans
-- Check for nested loops when unnesting arrays
```

### Performance Comparison: JSON vs Relational

| Operation | JSONB (PostgreSQL) | Relational | Winner |
|-----------|-------------------|------------|--------|
| Point lookup by key | Index scan (GIN or expression) | Index scan | Similar |
| Containment query (@>) | GIN index | Multiple indexes | JSONB with GIN |
| Range on numeric field | Expression index | B-tree index | Similar |
| Complex joins | Unnest + join | Direct join | Relational |
| Aggregation | Unnest + aggregate | Direct aggregate | Relational |
| Full-text search | GIN with tsvector | Full-text index | Similar |
| UPDATE single field | jsonb_set | UPDATE column | Relational |
| INSERT throughput | Slightly slower (validation) | Faster | Relational |

> **Production pitfall**: Don't assume JSONB is always slower or faster than relational. Benchmark with your actual data using `EXPLAIN ANALYZE`. The optimizer, indexes, data distribution, and query shape all matter.

---

## Edge Cases and NULL Behavior

### NULL Values in JSON

```sql
-- PostgreSQL: JSON null vs SQL NULL
INSERT INTO users VALUES (5, 'Eve', 'eve@test.com',
    '{"name": "Eve", "score": null}');

-- SQL NULL: Column contains no value
-- JSON null: Column contains the literal null value

-- profile ->> 'score' returns 'null' (text string)
-- profile -> 'score' returns null (JSON null, which is a valid value in jsonb)
-- But jsonb null is distinguishable from missing key

-- Check for JSON null
SELECT * FROM users WHERE profile -> 'score' IS NOT NULL;  -- excludes null
SELECT * FROM users WHERE profile ->> 'score' IS NOT NULL; -- excludes null AND missing

-- To distinguish missing from null:
SELECT
    user_id,
    profile -> 'score' IS NOT NULL AS key_exists,
    profile ->> 'score' AS value,
    jsonb_typeof(profile -> 'score') AS value_type
FROM users;
```

### NULL Propagation in JSON Operations

```sql
-- PostgreSQL: NULL propagation
-- If profile itself is NULL, all -> and ->> return NULL
SELECT profile ->> 'age' FROM users WHERE user_id = NULL;

-- If intermediate path is NULL, result is NULL
SELECT profile -> 'address' ->> 'zip' FROM users WHERE user_id = 4;
-- user 4 has '"address": {}', so 'zip' doesn't exist -> returns NULL

-- COALESCE for safe extraction
SELECT COALESCE(profile ->> 'phone', 'N/A') AS phone FROM users;
```

### NOT IN + NULL (Cross-Reference)

```sql
-- Dangerous pattern with JSON arrays
-- Find users NOT in a JSON array
-- This can fail with NULLs in the subquery results

-- Bad approach
SELECT * FROM users
WHERE user_id NOT IN (
    SELECT (item ->> 'user_id')::int
    FROM some_table
    WHERE some_column = 'condition'
);

-- If any (item ->> 'user_id') is NULL, NOT IN returns empty set
-- Better: Use NOT EXISTS or filter NULLs
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1
    FROM some_table t,
    LATERAL jsonb_array_elements(t.data -> 'users') AS item
    WHERE (item ->> 'user_id')::int = u.user_id
);
```

### Empty vs Missing Keys

```sql
-- PostgreSQL
INSERT INTO users VALUES (6, 'Frank', 'frank@test.com', '{}');

-- Missing key
SELECT profile ->> 'age' FROM users WHERE user_id = 6;
-- Returns: NULL

-- Key with empty value
INSERT INTO users VALUES (7, 'Grace', 'grace@test.com', '{"tags": []}');
SELECT jsonb_array_length(profile -> 'tags') FROM users WHERE user_id = 7;
-- Returns: 0

-- Distinguish empty object, empty array, and missing
SELECT
    user_id,
    jsonb_object_keys(profile) IS NOT NULL AS has_keys,
    jsonb_typeof(profile -> 'tags') AS tags_type,
    profile -> 'tags' = '[]'::jsonb AS is_empty_array
FROM users
WHERE user_id IN (6, 7);
```

### Duplicate Keys

```sql
-- PostgreSQL jsonb: Last value wins on insert
SELECT '{"a": 1, "a": 2}'::jsonb;
-- Result: {"a": 2}

-- PostgreSQL json: Preserves both (but behavior is undefined)
SELECT '{"a": 1, "a": 2}'::json;
-- Result: {"a": 1, "a": 2} (text preserved, but don't rely on this)

-- MySQL: Last value wins
SELECT JSON_OBJECT('a', 1, 'a', 2);
-- Result: {"a": 2}

-- SQL Server: Behavior varies, don't rely on it
```

### Type Mismatches

```sql
-- PostgreSQL: Comparing JSON types
-- jsonb stores types: number, string, boolean, null, array, object

SELECT * FROM users WHERE profile ->> 'age' = '30';  -- string comparison
SELECT * FROM users WHERE profile ->> 'age' = 30;    -- type error
SELECT * FROM users WHERE (profile ->> 'age')::int = 30;  -- correct numeric comparison

-- Don't assume JSON numbers behave like SQL integers
SELECT '{"val": 1.0}'::jsonb ->> 'val';  -- Returns '1' (no decimal)
SELECT '{"val": 1.5}'::jsonb ->> 'val';  -- Returns '1.5'
```

---

## Common Mistakes

### 1. Storing JSON When Relational Is Better

```sql
-- Bad: Store all order data as JSON
CREATE TABLE orders_bad (
    id SERIAL PRIMARY KEY,
    data JSONB  -- Contains user_id, items, status, everything
);

-- Good: Normalize core entities, use JSON for variable attributes
CREATE TABLE orders_good (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),  -- Enforces referential integrity
    status VARCHAR(20),                -- Queryable without extraction
    attributes JSONB                   -- Only variable/extensible data
);
```

### 2. Not Using Expression Indexes

```sql
-- Bad: Full table scan
SELECT * FROM orders WHERE metadata ->> 'status' = 'shipped';
-- Even with GIN index, equality on extracted text is slow

-- Good: Expression index
CREATE INDEX idx_orders_status ON orders ((metadata ->> 'status'));
SELECT * FROM orders WHERE metadata ->> 'status' = 'shipped';
-- Uses B-tree index on extracted value
```

### 3. Unnecessary JSON_UNQUOTE / ->>

```sql
-- Bad (MySQL): Double conversion
SELECT JSON_UNQUOTE(JSON_EXTRACT(profile, '$.name')) FROM users;

-- Good: Use ->> directly (MySQL 5.7+)
SELECT profile ->> '$.name' FROM users;
```

### 4. Assuming JSON Key Order

```sql
-- Bad: Relying on key order
SELECT profile::text FROM users WHERE user_id = 1;
-- '{"age": 30, "address": {...}}' -- might not be this order

-- Good: Query by key, not by position
SELECT profile ->> 'age' FROM users WHERE user_id = 1;
```

### 5. Ignoring JSON Validation

```sql
-- Bad: No validation, invalid JSON silently stored (SQL Server)
CREATE TABLE events (
    payload NVARCHAR(MAX)
);
INSERT INTO events VALUES ('{invalid json}');  -- Stored as-is

-- Good: Validate
ALTER TABLE events ADD CONSTRAINT ck_valid_json CHECK (ISJSON(payload) = 1);
```

### 6. Using JSON for High-Cardinality Lookup Keys

```sql
-- Bad: Storing lookup IDs inside JSON
CREATE TABLE orders_v2 (
    id SERIAL PRIMARY KEY,
    data JSONB  -- {"user_id": 1, ...}
);
-- Cannot use foreign key, slow lookups

-- Good: Extract to proper column
CREATE TABLE orders_v3 (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    data JSONB
);
```

### 7. Unnesting Without Considering Duplicates

```sql
-- Bad: Potential double counting
SELECT
    o.order_id,
    item ->> 'sku' AS sku,
    p.price,
    (item ->> 'qty')::int * p.price AS total
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item
JOIN products p ON item ->> 'sku' = p.name;
-- If products has duplicate names, order items multiply

-- Good: Ensure join is unique or aggregate first
SELECT
    o.order_id,
    item ->> 'sku' AS sku,
    MAX(p.price) AS price,  -- or use product_id instead
    (item ->> 'qty')::int * MAX(p.price) AS total
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item
JOIN products p ON item ->> 'sku' = p.name
GROUP BY o.order_id, item ->> 'sku', item ->> 'qty';
```

---

## Production Pitfalls

### 1. Unbounded JSON Growth

```sql
-- Danger: JSON arrays growing without limit
-- An events table with appended JSON data
-- Query performance degrades as array grows

-- Monitor JSON size
SELECT
    event_id,
    pg_column_size(payload) AS byte_size,
    jsonb_array_length(payload -> 'items') AS array_len
FROM events
ORDER BY byte_size DESC
LIMIT 10;

-- Solution: Archive old data, normalize hot paths
```

### 2. JSON in Joins (Anti-Pattern at Scale)

```sql
-- Anti-pattern: Frequent JSON extraction in JOIN conditions
SELECT *
FROM orders o
JOIN users u ON o.payload ->> 'user_email' = u.email;
-- This cannot use an index on the JSON field effectively at scale

-- Better: Use a proper foreign key
SELECT *
FROM orders o
JOIN users u ON o.user_id = u.user_id;
```

### 3. JSONB Bloat in PostgreSQL

```sql
-- JSONB can cause table bloat due to UPDATE creating new tuples
-- Monitor bloat
SELECT
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE relname = 'users';

-- Use VACUUM ANALYZE regularly
VACUUM ANALYZE users;
```

### 4. Transaction Isolation with JSON Updates

```sql
-- Race condition: Two concurrent updates to same JSONB field
-- Session 1: UPDATE users SET profile = profile || '{"x": 1}' WHERE id = 1;
-- Session 2: UPDATE users SET profile = profile || '{"y": 2}' WHERE id = 1;
-- One update may be lost (lost update anomaly)

-- Solution: Use row-level locking
SELECT * FROM users WHERE user_id = 1 FOR UPDATE;
-- Then update
```

### 5. Replication and JSON

```sql
-- Some replication methods may not replicate JSON functions correctly
-- Test JSON operations in your replication setup
-- PostgreSQL logical replication handles JSON well
-- MySQL row-based replication handles JSON well
-- Statement-based replication may have issues with function volatility
```

### 6. Backup and Restore

```sql
-- JSON in dumps can be enormous
-- pg_dump outputs JSONB as text, which is human-readable but large
-- Consider compressing backups: pg_dump | gzip > backup.sql.gz
-- Test restore to verify JSON integrity
```

---

## Interview Traps

### Trap 1: NULL = NULL in JSON

```sql
-- Question: What does this return?
SELECT * FROM users
WHERE profile -> 'phone' = NULL;

-- Answer: Nothing! In SQL, NULL = NULL is NULL (falsy)
-- Correct: Use IS NULL
SELECT * FROM users
WHERE profile -> 'phone' IS NULL;
-- OR
SELECT * FROM users
WHERE profile -> 'phone' IS NOT DISTINCT FROM NULL::jsonb;
```

### Trap 2: COUNT with JSON

```sql
-- Question: What's the difference?
SELECT COUNT(profile ->> 'phone') FROM users;
SELECT COUNT(*) FROM users WHERE profile -> 'phone' IS NOT NULL;

-- Answer:
-- COUNT(profile ->> 'phone') counts non-NULL text values
-- jsonb null values (phone: null) ARE counted (they return 'null' text)
-- Missing keys return NULL and are NOT counted
-- Use COUNT(*) with WHERE for explicit filtering
```

### Trap 3: JSON Array Contains

```sql
-- Question: Find users with both "premium" and "active" tags
-- Bad: Two separate ? conditions
SELECT * FROM users
WHERE profile -> 'tags' ? 'premium'
  AND profile -> 'tags' ? 'active';
-- This works but is verbose

-- Better: Use @> containment
SELECT * FROM users
WHERE profile -> 'tags' @> '["premium", "active"]';
```

### Trap 4: Aggregation After Unnesting

```sql
-- Question: Count total items across all orders
-- Bad approach: Aggregate without considering duplicates
SELECT SUM((item ->> 'qty')::int) AS total_items
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item;
-- This works correctly IF no products have duplicate names in the unnesting

-- But if you join products first:
SELECT SUM(p.stock * (item ->> 'qty')::int)
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item
JOIN products p ON item ->> 'sku' = p.name;
-- If products has duplicate names, this double-counts
```

### Trap 5: JSON Equality

```sql
-- Question: Are these equivalent?
SELECT * FROM users WHERE profile ->> 'age' = '30';
SELECT * FROM users WHERE profile -> 'age' = '30'::jsonb;
SELECT * FROM users WHERE profile -> 'age' = 30::jsonb;

-- Answer:
-- 1. String comparison: compares text '30'
-- 2. JSONB comparison: compares JSON number 30 to JSON string "30" -- NOT EQUAL
-- 3. JSONB comparison: compares JSON number 30 to JSON number 30 -- EQUAL
-- These are NOT all equivalent!
```

### Trap 6: JSONB vs JSON in PostgreSQL

```sql
-- Question: Which is faster for containment queries?
-- jsonb @> '{"tags": ["premium"]}'
-- json @> '{"tags": ["premium"]}'

-- Answer: jsonb with GIN index. json has no native containment operator support at the index level.
```

---

## Comparison Tables

### JSON Functions Across Databases

| Operation | PostgreSQL | MySQL | SQL Server |
|-----------|------------|-------|------------|
| **Extract scalar** | `profile ->> 'key'` | `profile ->> '$.key'` | `JSON_VALUE(payload, '$.key')` |
| **Extract JSON** | `profile -> 'key'` | `profile -> '$.key'` | `JSON_QUERY(payload, '$.key')` |
| **Extract nested** | `profile #>> '{a,b}'` | `JSON_EXTRACT(profile, '$.a.b')` | `JSON_VALUE(payload, '$.a.b')` |
| **Check key exists** | `profile ? 'key'` | `JSON_CONTAINS_PATH(profile, 'one', '$.key')` | `JSON_VALUE(payload, '$.key') IS NOT NULL` |
| **Check value exists** | `profile @> '{"a":1}'` | `JSON_CONTAINS(profile, '1', '$.a')` | `OPENJSON(...)` with WHERE |
| **Set value** | `jsonb_set(profile, '{key}', val)` | `JSON_SET(profile, '$.key', val)` | `JSON_MODIFY(payload, '$.key', val)` |
| **Remove key** | `profile - 'key'` | `JSON_REMOVE(profile, '$.key')` | `JSON_MODIFY(payload, '$.key', NULL)` |
| **Array elements** | `jsonb_array_elements()` | `JSON_TABLE()` | `OPENJSON()` |
| **Aggregate rows** | `json_agg()` | `JSON_ARRAYAGG()` | `FOR JSON PATH` |
| **Build object** | `json_build_object()` | `JSON_OBJECT()` | `FOR JSON PATH` |
| **Validate** | `jsonb_typeof()` | Automatic on insert | `ISJSON()` |

### JSON Path Syntax Comparison

| Path | PostgreSQL | MySQL | SQL Server |
|------|------------|-------|------------|
| Root object | `$` | `$` | `$` |
| Key access | `$.key` | `$.key` | `$.key` |
| Nested | `$.a.b` | `$.a.b` | `$.a.b` |
| Array index (0-based) | `$.arr[0]` | `$.arr[0]` | `$.arr[0]` |
| Array all | `$.arr[*]` | `$.arr[*]` | `$.arr[*]` |
| Filter | `$.arr[*] ? (@ > 5)` | N/A (use WHERE) | `$.arr[*] ? (@ > 5)` |
| Exists check | `@? '$.key'` | N/A | N/A |

### Performance: JSONB Operators (PostgreSQL)

| Operator | GIN Index | jsonb_path_ops Index | Notes |
|----------|-----------|---------------------|-------|
| `?` (key exists) | ✅ | ❌ | Use GIN for ? operator |
| `?\|` (any key exists) | ✅ | ❌ | Use GIN |
| `?&` (all keys exist) | ✅ | ❌ | Use GIN |
| `@>` (contains) | ✅ | ✅ | jsonb_path_ops is faster and smaller |
| `@@` (path exists) | ✅ | ❌ | Use GIN |
| `=` (equality) | ❌ | ❌ | Use B-tree on whole column |

---

## Best Practices

### 1. Design Principles

```
Decision Tree for JSON vs Relational:
                                   
Is the data queried independently? ──Yes──> Relational column
           │No
           ▼
Is the data part of a larger entity? ──Yes──> JSON column is OK
           │Yes
           ▼
Does the data structure vary between rows? ──Yes──> JSON column
           │No
           ▼
Is the data frequently aggregated? ──Yes──> Consider relational
           │No
           ▼
Is the data from external systems? ──Yes──> JSON column
           │No
           ▼
Consider relational with proper normalization
```

### 2. Schema Design

```sql
-- Hybrid approach: Core relational + JSON extension
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),  -- FK for integrity
    status VARCHAR(20) NOT NULL,            -- Queryable, indexed
    total_amount DECIMAL(10,2),             -- Reportable
    created_at TIMESTAMP NOT NULL,          -- Queryable
    metadata JSONB,                         -- Variable attributes
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered'))
);

-- Indexes for common access patterns
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
-- GIN index only if you frequently query metadata
CREATE INDEX idx_orders_metadata ON orders USING GIN (metadata jsonb_path_ops);
```

### 3. Query Patterns

```sql
-- Prefer specific extraction over GIN for known keys
-- GIN for ad-hoc exploration, expression indexes for known patterns

-- Ad-hoc exploration (GIN index)
SELECT * FROM users WHERE profile @> '{"tags": ["premium"]}';

-- Known frequent query (expression index)
CREATE INDEX idx_users_age ON users ((profile ->> 'age')::int);
SELECT * FROM users WHERE (profile ->> 'age')::int > 25;

-- Use COALESCE for safe defaults
SELECT
    user_id,
    COALESCE(profile ->> 'name', 'Anonymous') AS name,
    COALESCE((profile ->> 'age')::int, 0) AS age
FROM users;
```

### 4. Data Integrity

```sql
-- Validate at the database level
ALTER TABLE users ADD CONSTRAINT chk_age CHECK (
    (profile ->> 'age')::int BETWEEN 0 AND 150
);

-- Use generated columns for frequently accessed JSON fields
ALTER TABLE users
ADD COLUMN age INT GENERATED ALWAYS AS ((profile ->> 'age')::int) STORED,
ADD COLUMN city TEXT GENERATED ALWAYS AS (profile #>> '{address,city}') STORED;

CREATE INDEX idx_users_age ON users(age);
CREATE INDEX idx_users_city ON users(city);
```

### 5. Migration Strategy

```sql
-- When normalizing existing JSON to relational:
-- Step 1: Create target table
CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    sku VARCHAR(50),
    quantity INT
);

-- Step 2: Populate from JSON
INSERT INTO order_items (order_id, sku, quantity)
SELECT
    o.order_id,
    item ->> 'sku',
    (item ->> 'qty')::int
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item;

-- Step 3: Verify counts match
SELECT
    (SELECT COUNT(*) FROM orders o,
     LATERAL jsonb_array_elements(o.metadata -> 'items') AS item) AS json_count,
    (SELECT COUNT(*) FROM order_items) AS table_count;

-- Step 4: Add constraints, indexes, triggers
-- Step 5: Update application to use new table
-- Step 6: Remove JSON column after verification period
```

---

# Interview Questions

## Beginner

1. What is the difference between `json` and `jsonb` in PostgreSQL?
2. How do you extract a text value from a JSONB column in PostgreSQL?
3. How do you check if a key exists in a JSONB column?
4. What is the difference between `->` and `->>` operators?
5. How do you insert valid JSON into a MySQL JSON column?
6. How do you handle NULL values when extracting from JSON?
7. What is the difference between a missing JSON key and a key with JSON null?
8. How do you extract nested JSON values?
9. How do you create a GIN index on a JSONB column?
10. How do you validate JSON structure in SQL Server?

## Intermediate

11. Write a query to unnest a JSON array into rows and join with a relational table. What pitfalls should you watch for?
12. How do you build a JSON object from relational rows using aggregation?
13. Explain the difference between `?` operator and `@?` on jsonb in PostgreSQL.
14. How do you update a specific nested value in a JSONB column?
15. What is the difference between `||` and `#||` for JSONB merging in PostgreSQL?
16. How do you create a generated column from a JSON field for indexing?
17. Write a query to find all users who have both "premium" and "active" tags in their JSON profile.
18. How do you aggregate JSON arrays across multiple rows without duplicates?
19. Explain why `COUNT(profile ->> 'phone')` might not give the expected result.
20. How do you normalize a JSON array stored in a column into a separate relational table?

## Advanced

21. Explain the performance characteristics of GIN index vs expression index for JSONB queries. When would you choose each?
22. How do you handle concurrent JSONB updates without losing data?
23. Design a schema for an event logging system using JSON. When would you normalize vs keep as JSON?
24. How do you implement JSON schema validation in PostgreSQL without a trigger?
25. Explain the `jsonb_path_query` function and its use cases compared to `->` operator.
26. How do you efficiently query deeply nested JSON structures?
27. What are the implications of JSONB for PostgreSQL vacuuming and bloat?
28. Design a hybrid relational/JSON schema for an e-commerce system. Justify which fields are relational vs JSON.
29. How do you migrate from a fully JSON-based schema to a normalized relational schema without downtime?
30. Compare the execution plans for querying a JSON field with vs without an index. What would you look for?

## Scenario Based

31. You have a `users` table with a JSONB `profile` column containing `{"preferences": {"notifications": {"email": true, "sms": false}}}`. Write a query to find all users who have email notifications enabled. What index would you create?
32. An `orders` table stores items as JSONB: `{"items": [{"sku": "A1", "qty": 2}, {"sku": "B2", "qty": 1}]}`. A product recall affects SKU "A1". Write a query to find all affected orders and the total quantity recalled.
33. You receive API responses stored as JSONB in an `api_logs` table. The response structure varies by endpoint. Design a query to extract error messages regardless of the response structure.
34. Two applications update the same JSONB column concurrently. One adds `{"status": "processed"}` and another adds `{"priority": "high"}`. How do you prevent lost updates?
35. You need to generate a report showing each department with an aggregated JSON array of employee names and salaries. Write the query and handle edge cases (empty departments, NULL salaries).

## Tricky

36. What does this return and why?
```sql
SELECT '{"a": 1, "b": null}'::jsonb @> '{"b": null}';
```

37. What does this return?
```sql
SELECT '{"a": [1, 2, 3]}'::jsonb -> 'a' @> '[1, 2]';
```

38. Why might this query return fewer results than expected?
```sql
SELECT * FROM users
WHERE user_id NOT IN (
    SELECT (item ->> 'id')::int
    FROM events,
    LATERAL jsonb_array_elements(payload -> 'banned_users') AS item
);
```

39. What's wrong with this approach?
```sql
SELECT *
FROM orders o
WHERE o.metadata -> 'items' @> '[{"sku": "A1"}]'
  AND (SELECT price FROM products WHERE sku = o.metadata -> 'items' -> 0 ->> 'sku') > 100;
```

40. Why does this behave differently on jsonb vs json?
```sql
SELECT '{"a": 1, "a": 2}'::jsonb;  -- What's the result?
SELECT '{"a": 1, "a": 2}'::json;   -- What's the result?
```

## Output Prediction

41. Predict the output:
```sql
SELECT
    jsonb_typeof('{"a": [1, 2, 3]}'::jsonb -> 'a'),
    jsonb_array_length('{"a": [1, 2, 3]}'::jsonb -> 'a'),
    '{"a": [1, 2, 3]}'::jsonb -> 'a' -> 0;
```

42. Predict the output:
```sql
WITH data AS (
    SELECT '{"name": "Alice", "scores": [90, 85, 95]}'::jsonb AS profile
)
SELECT
    profile ->> 'name',
    (profile -> 'scores' ->> 0)::int,
    jsonb_array_length(profile -> 'scores');
```

43. Predict the output:
```sql
SELECT
    jsonb_object_agg(key, value)
FROM jsonb_each('{"a": 1, "b": 2, "c": 3}'::jsonb)
WHERE key > 'a';
```

44. Predict the output:
```sql
SELECT *
FROM jsonb_to_recordset('[{"x": 1, "y": "a"}, {"x": 2}]'::jsonb)
AS t(x int, y text);
```

45. Predict the output:
```sql
SELECT
    profile -> 'address' ->> 'city',
    profile #>> '{address,city}',
    profile -> 'address' -> 'zip'
FROM users WHERE user_id = 4;
```

## Debugging

46. This query returns no results. Debug it:
```sql
SELECT * FROM users
WHERE profile -> 'tags' = 'premium';
```

47. This query is slow. What's wrong?
```sql
SELECT * FROM orders
WHERE metadata ->> 'status' = 'shipped'
  AND (metadata ->> 'total')::numeric > 100;
```

48. This INSERT fails. Why?
```sql
INSERT INTO users (user_id, name, profile)
VALUES (1, 'Test', '{"age": "thirty"}');
-- users table has CHECK constraint on age being numeric
```

49. This UPDATE doesn't work as expected:
```sql
UPDATE users
SET profile = profile || '{"address": {"country": "US"}}'
WHERE user_id = 1;
-- Expected address.city to be preserved, but it's gone
```

50. Why does this return different counts?
```sql
-- Query A
SELECT COUNT(DISTINCT item ->> 'sku')
FROM orders o,
LATERAL jsonb_array_elements(o.metadata -> 'items') AS item;

-- Query B
SELECT COUNT(DISTINCT sku)
FROM order_items;
```

## Performance

51. You have a table with 10M rows and a JSONB column. Queries using `@>` with GIN index are fast, but queries extracting specific fields are slow. What's your approach?

52. Compare the performance of these two approaches for finding users in New York:
```sql
-- Approach A
SELECT * FROM users WHERE profile -> 'address' ->> 'city' = 'New York';

-- Approach B (with generated column)
-- ALTER TABLE users ADD COLUMN city TEXT GENERATED ALWAYS AS (profile #>> '{address,city}') STORED;
-- CREATE INDEX idx_users_city ON users(city);
SELECT * FROM users WHERE city = 'New York';
```

53. You need to aggregate JSON arrays from 1M rows. The query uses `jsonb_array_elements` and is consuming excessive memory. How do you optimize it?

54. Your JSONB UPDATE statements are causing table bloat. How do you mitigate this while keeping the JSONB column?

55. You're deciding between a GIN index with `jsonb_path_ops` and a GIN index with default operator class. Your workload has mostly `@>` containment queries. Which do you choose and why?

---

*See also: [Window Functions](/11-Advanced/window-functions), [Query Optimization](/11-Advanced/query-optimization), [Normalization](/09-Design/normalization), [NULL Behavior](/02-Fundamentals/null-behavior)*
