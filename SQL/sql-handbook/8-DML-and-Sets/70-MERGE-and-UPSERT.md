# MERGE and UPSERT

## What Is an UPSERT?

An **UPSERT** is a DML operation that **inserts** a row if it does not already exist, or **updates** it if it does. The term is a portmanteau of **"update" + "insert"**.

Every relational database supports upserts, but the syntax differs significantly:

| Database   | UPSERT Syntax                                         |
| ---------- | ----------------------------------------------------- |
| ANSI SQL   | `MERGE`                                               |
| PostgreSQL | `INSERT ... ON CONFLICT`                              |
| MySQL      | `INSERT ... ON DUPLICATE KEY UPDATE` / `REPLACE INTO` |
| SQL Server | `MERGE`                                               |
| Oracle     | `MERGE`                                               |

---

## Grain of Sample Tables

Before any example, always state the grain:

> One row in `products` represents one product. `product_id` is the primary key.
> One row in `inventory` represents the current stock level for one product in one warehouse. The grain is `(product_id, warehouse_id)`.
> One row in `customer_emails` represents one email address for one customer. `customer_id` is the primary key (one email per customer in this simplified schema).

---

## Sample Tables

```sql
CREATE TABLE products (
    product_id   INT PRIMARY KEY,
    product_name VARCHAR(100),
    price        DECIMAL(10,2),
    category     VARCHAR(50)
);

INSERT INTO products VALUES
(1, 'Laptop',      999.99, 'Electronics'),
(2, 'Mouse',        29.99, 'Electronics'),
(3, 'Desk Chair',  199.99, 'Furniture'),
(4, 'Monitor',     449.99, 'Electronics'),
(5, 'Keyboard',     79.99, 'Electronics');

CREATE TABLE inventory (
    product_id   INT,
    warehouse_id INT,
    quantity     INT,
    PRIMARY KEY (product_id, warehouse_id)
);

INSERT INTO inventory VALUES
(1, 10, 50),
(1, 20, 30),
(2, 10, 200),
(3, 10, 15),
(4, 10, 75);

CREATE TABLE staging_products (
    product_id   INT,
    product_name VARCHAR(100),
    price        DECIMAL(10,2),
    category     VARCHAR(50)
);

INSERT INTO staging_products VALUES
(1, 'Laptop Pro',   1199.99, 'Electronics'),   -- exists: price changed
(2, 'Mouse',          29.99, 'Electronics'),     -- exists: no change
(6, 'Webcam',         89.99, 'Electronics'),     -- new product
(7, 'Standing Desk',  599.99, 'Furniture');      -- new product

CREATE TABLE customer_emails (
    customer_id INT PRIMARY KEY,
    email       VARCHAR(255)
);

INSERT INTO customer_emails VALUES
(1, 'alice@example.com'),
(2, 'bob@example.com');

CREATE TABLE new_emails (
    customer_id INT,
    email       VARCHAR(255)
);

INSERT INTO new_emails VALUES
(2, 'bob_new@example.com'),    -- exists: update email
(3, 'charlie@example.com'),    -- new: insert
(4, NULL);                      -- new: insert with NULL email
```

---

## MERGE (ANSI SQL / SQL Server / Oracle)

### Syntax

```sql
MERGE INTO target_table AS t
USING source_table AS s
ON join_condition
WHEN MATCHED THEN
    UPDATE SET column1 = s.value1, column2 = s.value2, ...
WHEN NOT MATCHED THEN
    INSERT (column1, column2, ...)
    VALUES (s.value1, s.value2, ...);
```

### How It Works Internally

1. The database evaluates the `USING` clause to produce a source rowset.
2. For **each source row**, it tests the `ON` condition against the target.
3. If a match is found → executes `WHEN MATCHED`.
4. If no match → executes `WHEN NOT MATCHED`.
5. `WHEN NOT MATCHED BY SOURCE` (SQL Server / Oracle) handles target rows with no source counterpart.

### Basic Example — SQL Server / Oracle

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED THEN
    UPDATE SET
        t.product_name = s.product_name,
        t.price        = s.price,
        t.category     = s.category
WHEN NOT MATCHED THEN
    INSERT (product_id, product_name, price, category)
    VALUES (s.product_id, s.product_name, s.price, s.category);
```

**Result after MERGE:**

| product_id | product_name  | price   | category    |
| ---------- | ------------- | ------- | ----------- |
| 1          | Laptop Pro    | 1199.99 | Electronics |
| 2          | Mouse         | 29.99   | Electronics |
| 3          | Desk Chair    | 199.99  | Furniture   |
| 4          | Monitor       | 449.99  | Electronics |
| 5          | Keyboard      | 79.99   | Electronics |
| 6          | Webcam        | 89.99   | Electronics |
| 7          | Standing Desk | 599.99  | Furniture   |

- Row 1: **updated** (name and price changed)
- Row 2: **updated** (values are the same, but the UPDATE still fires — see edge cases below)
- Rows 6, 7: **inserted** (new)
- Rows 3, 4, 5: **untouched** (no source match)

### Conditional UPDATE — Only When Values Differ

A common pattern to avoid unnecessary writes:

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED AND (
    t.product_name <> s.product_name
    OR t.price <> s.price
    OR t.category <> s.category
) THEN
    UPDATE SET
        t.product_name = s.product_name,
        t.price        = s.price,
        t.category     = s.category
WHEN NOT MATCHED THEN
    INSERT (product_id, product_name, price, category)
    VALUES (s.product_id, s.product_name, s.price, s.category);
```

> **Production pitfall:** Without the `AND` guard, SQL Server fires the `UPDATE` even when no values changed. This wastes I/O, triggers `AFTER UPDATE` triggers, increments `UPDATE` counters, and can cause replication overhead.

### DELETE with MERGE — SQL Server / Oracle

SQL Server and Oracle support `WHEN MATCHED AND <condition> THEN DELETE`:

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED AND s.is_deleted = 1 THEN
    DELETE
WHEN MATCHED THEN
    UPDATE SET
        t.product_name = s.product_name,
        t.price        = s.price
WHEN NOT MATCHED THEN
    INSERT (product_id, product_name, price, category)
    VALUES (s.product_id, s.product_name, s.price, s.category);
```

> **Oracle:** `DELETE` in `WHEN MATCHED` only fires for rows that satisfied the `ON` condition **and** the additional `AND` predicate. It does **not** delete all matched rows unconditionally — that would require a separate `DELETE` with a `WHERE` clause inside `WHEN MATCHED`.

> **Interview trap:** In Oracle, `WHEN MATCHED THEN DELETE` without an `AND` clause deletes **every** matched row. If your source has more rows than the target, you will not notice. But if your source is a subset, the entire matched portion of the target is removed.

### WHEN NOT MATCHED BY SOURCE — SQL Server / Oracle

Handles **target rows that have no corresponding source row**:

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED THEN
    UPDATE SET
        t.product_name = s.product_name,
        t.price        = s.price,
        t.category     = s.category
WHEN NOT MATCHED BY TARGET THEN
    INSERT (product_id, product_name, price, category)
    VALUES (s.product_id, s.product_name, s.price, s.category)
WHEN NOT MATCHED BY SOURCE THEN
    DELETE;
```

This deletes products 3, 4, 5 from `products` because they are not in `staging_products`.

> **Production pitfall:** `WHEN NOT MATCHED BY SOURCE THEN DELETE` without a `WHERE` guard is a data-loss disaster waiting to happen. Always add explicit conditions:

```sql
WHEN NOT MATCHED BY SOURCE AND t.category = 'Legacy' THEN
    DELETE;
```

> **MySQL:** MySQL does **not** have `MERGE` syntax. See `INSERT ... ON DUPLICATE KEY UPDATE` below.

---

## PostgreSQL — INSERT ... ON CONFLICT

PostgreSQL does **not** support `MERGE` (as of PostgreSQL 16). Instead it provides `INSERT ... ON CONFLICT`.

### Syntax — Upsert (Insert or Update)

```sql
INSERT INTO target_table (col1, col2, col3)
VALUES (val1, val2, val3)
ON CONFLICT (conflict_column)
DO UPDATE SET
    col1 = EXCLUDED.col1,
    col2 = EXCLUDED.col2;
```

- `EXCLUDED` is a special reference to the **proposed row** (the values you tried to insert).
- `conflict_column` must be a column with a **unique index** or **primary key**.

### Example — Upsert One Row

```sql
INSERT INTO customer_emails (customer_id, email)
VALUES (2, 'bob_new@example.com')
ON CONFLICT (customer_id)
DO UPDATE SET email = EXCLUDED.email;
```

**Result:**

| customer_id | email               |
| ----------- | ------------------- |
| 1           | alice@example.com   |
| 2           | bob_new@example.com |

### Example — Upsert from a Source Table

```sql
INSERT INTO customer_emails (customer_id, email)
SELECT customer_id, email
FROM new_emails
ON CONFLICT (customer_id)
DO UPDATE SET email = EXCLUDED.email;
```

**Result:**

| customer_id | email               |
| ----------- | ------------------- |
| 1           | alice@example.com   |
| 2           | bob_new@example.com |
| 3           | charlie@example.com |
| 4           | NULL                |

> **NULL behavior:** `EXCLUDED.email` is `NULL` when the source value is `NULL`. The `UPDATE SET email = EXCLUDED.email` will overwrite the existing value with `NULL`. If that is not desired, add a guard:

```sql
ON CONFLICT (customer_id)
DO UPDATE SET email = COALESCE(EXCLUDED.email, customer_emails.email);
```

### ON CONFLICT DO NOTHING

Silently discards the conflicting row without inserting or updating:

```sql
INSERT INTO customer_emails (customer_id, email)
SELECT customer_id, email
FROM new_emails
ON CONFLICT (customer_id)
DO NOTHING;
```

Only row 3 (charlie) gets inserted. Rows 2 and 4 are silently skipped.

### Conflict Target — Partial Unique Index

You can restrict which unique constraint triggers the conflict:

```sql
CREATE UNIQUE INDEX idx_active_email
ON customer_emails (email)
WHERE email IS NOT NULL;

INSERT INTO customer_emails (customer_id, email)
VALUES (5, 'alice@example.com')  -- email already exists for customer 1
ON CONFLICT ON CONSTRAINT idx_active_email
DO UPDATE SET email = EXCLUDED.email;
```

### Multi-Column Conflict

```sql
INSERT INTO inventory (product_id, warehouse_id, quantity)
VALUES (1, 10, 100)
ON CONFLICT (product_id, warehouse_id)
DO UPDATE SET quantity = EXCLUDED.quantity;
```

### NO ACTION vs RESTRICT vs ROW Exclusion

PostgreSQL distinguishes between **constraint-level** and **row-level** exclusions:

- **Constraint-level** (`ON CONFLICT ON CONSTRAINT`): matches the unique index or PK that was violated.
- **Column-level** (`ON CONFLICT (col)`): matches any unique index that includes the listed column.

> **Production pitfall:** If a unique index covers more columns than the `ON CONFLICT` list, PostgreSQL may raise `there is no unique or exclusion constraint matching the ON CONFLICT specification`. Always ensure the `ON CONFLICT` columns align with an existing unique index.

---

## MySQL — INSERT ... ON DUPLICATE KEY UPDATE

### Syntax

```sql
INSERT INTO target_table (col1, col2, col3)
VALUES (val1, val2, val3)
ON DUPLICATE KEY UPDATE
    col1 = VALUES(col1),
    col2 = VALUES(col2);
```

`VALUES(col)` is **deprecated** in MySQL 8.0.20+. Use an alias instead:

```sql
INSERT INTO target_table (col1, col2, col3)
VALUES (val1, val2, val3) AS new_vals
ON DUPLICATE KEY UPDATE
    col1 = new_vals.col1,
    col2 = new_vals.col2;
```

### Example

```sql
INSERT INTO products (product_id, product_name, price, category)
VALUES (1, 'Laptop Ultra', 1499.99, 'Electronics')
ON DUPLICATE KEY UPDATE
    product_name = VALUES(product_name),
    price        = VALUES(price),
    category     = VALUES(category);
```

The conflict is triggered by the **primary key** or any **unique index**.

### Affected Rows — MySQL-Specific Behavior

MySQL's `ROW_COUNT()` returns:

| Action    | `ROW_COUNT()` |
| --------- | ------------- |
| INSERT    | 1             |
| UPDATE    | 2             |
| No change | 0             |

> **Production pitfall:** `ROW_COUNT() = 2` for UPDATE is counterintuitive. If you rely on row counts for logic (e.g., application-level logging), this can cause bugs. Some ORMs normalize this, but raw MySQL does not.

> **Interview trap:** In MySQL, `INSERT ... ON DUPLICATE KEY UPDATE` never returns the ID of the updated row via `LAST_INSERT_ID()` when the UPDATE branch fires. It only returns the ID when the INSERT branch fires. Plan accordingly if you need the PK after an upsert.

### REPLACE INTO — MySQL Only

```sql
REPLACE INTO products (product_id, product_name, price, category)
VALUES (1, 'Laptop Ultra', 1499.99, 'Electronics');
```

`REPLACE INTO` **deletes** the existing row and **inserts** a new one. This means:

- **Auto-increment IDs change** (new row gets a new ID).
- **`ON DELETE` triggers** fire.
- **Foreign keys** referencing the old ID break.
- **`AFTER INSERT` triggers** fire (not `AFTER UPDATE`).

> **Production pitfall:** `REPLACE INTO` is almost always the wrong choice for upserts. It silently deletes + reinserts, which breaks referential integrity if other tables reference the primary key. Use `INSERT ... ON DUPLICATE KEY UPDATE` instead.

> **Comparison:**
>
> | Behavior                     | `INSERT ... ON DUPLICATE KEY UPDATE` | `REPLACE INTO`               |
> | ---------------------------- | ------------------------------------ | ---------------------------- |
> | Mechanism                    | Updates in place                     | DELETE + INSERT              |
> | PK preserved                 | Yes                                  | No (new auto-increment ID)   |
> | Triggers                     | `AFTER UPDATE`                       | `ON DELETE` + `AFTER INSERT` |
> | FK safe                      | Yes                                  | No                           |
> | `LAST_INSERT_ID()` on update | Returns old ID                       | Returns new ID               |

---

## MERGE Internal Working

Understanding the execution model helps with performance and correctness:

```
┌──────────────────────────────────────────────────────┐
│                   MERGE Execution                     │
│                                                       │
│  1. Evaluate USING source                             │
│         │                                             │
│         ▼                                             │
│  2. For each source row:                              │
│         │                                             │
│         ├── Evaluate ON condition against target      │
│         │        │                                    │
│         │        ├── MATCHED ──► WHEN MATCHED branch  │
│         │        │                                     │
│         │        └── NOT MATCHED ──► WHEN NOT MATCHED │
│         │                                             │
│  3. Apply all modifications atomically                │
│                                                       │
│  Note: SQL Server processes MATCHED and NOT MATCHED   │
│  in separate passes, not interleaved per-row.         │
└──────────────────────────────────────────────────────┘
```

### Key Internal Detail — SQL Server

SQL Server executes MERGE in **two separate passes**:

1. **Pass 1:** Identifies all MATCHED rows.
2. **Pass 2:** Identifies all NOT MATCHED rows.
3. Applies all modifications.

This means a row inserted in the NOT MATCHED pass **cannot** be immediately matched by the MATCHED pass within the same MERGE statement. This is an important subtlety for self-referencing MERGE logic.

> **Production pitfall (SQL Server):** Because of the two-pass execution, a `WHEN MATCHED THEN UPDATE` can see rows that were modified by earlier rows in the same MERGE, but a `WHEN NOT MATCHED THEN INSERT` cannot see rows inserted by previous NOT MATCHED branches in the same MERGE. This can lead to subtle bugs in complex MERGE statements.

---

## Edge Cases

### 1. MERGE with NULLs in the ON Condition

```sql
MERGE INTO target t
USING source s
ON t.id = s.id  -- if s.id is NULL, the comparison is NULL (unknown), never TRUE
WHEN MATCHED THEN UPDATE SET t.val = s.val
WHEN NOT MATCHED THEN INSERT VALUES (s.id, s.val);
```

**Result:** Rows where `s.id IS NULL` will **never match** — they go to `NOT MATCHED`. If `target` has a row with `id = NULL`, it will **also never match** (because `NULL = NULL` is `NULL`, not `TRUE`). The NULL source row gets inserted, and the NULL target row stays unchanged.

> See the [NULL and Three-Valued Logic](#) section for deeper explanation.

### 2. ON CONFLICT with NULL in PostgreSQL

```sql
CREATE TABLE t (id INT, val TEXT);
INSERT INTO t VALUES (1, 'old');

INSERT INTO t (id, val)
VALUES (1, NULL)
ON CONFLICT (id)
DO UPDATE SET val = EXCLUDED.val;

SELECT * FROM t;
-- Result: id=1, val=NULL  (old value overwritten with NULL)
```

### 3. One-to-Many in MERGE Source

If the `USING` source has **duplicate keys** (one-to-many relative to the target), SQL Server raises an error:

```
The MERGE statement attempted to UPDATE or DELETE the same row more
than once. This happens when a target row matches more than one
source row. A MERGE statement cannot UPDATE/DELETE the same row
of the target table multiple times.
```

> **Production pitfall:** Always ensure your `USING` source is **unique** on the join columns. Use a subquery or CTE with `ROW_NUMBER()` to deduplicate:

```sql
WITH deduped AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn
    FROM staging_products
)
MERGE INTO products AS t
USING (SELECT * FROM deduped WHERE rn = 1) AS s
ON t.product_id = s.product_id
WHEN MATCHED THEN UPDATE SET ...
WHEN NOT MATCHED THEN INSERT ...;
```

### 4. Updating to NULL with ON CONFLICT

```sql
INSERT INTO customer_emails (customer_id, email)
VALUES (1, NULL)
ON CONFLICT (customer_id)
DO UPDATE SET email = EXCLUDED.email;
-- Sets email to NULL (overwrites existing value)
```

To avoid setting NULL:

```sql
DO UPDATE SET email = COALESCE(EXCLUDED.email, customer_emails.email);
```

### 5. MERGE — No Rows in Source

If the `USING` clause produces zero rows, nothing happens. No error.

### 6. MERGE — No Rows in Target

If the target is empty, all source rows hit `WHEN NOT MATCHED` and get inserted. This is a valid and common bulk-load pattern.

### 7. Multiple WHEN MATCHED Clauses

SQL Server supports **multiple** `WHEN MATCHED` clauses with different conditions, evaluated in order:

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED AND s.is_discontinued = 1 THEN
    DELETE
WHEN MATCHED THEN
    UPDATE SET t.product_name = s.product_name, t.price = s.price
WHEN NOT MATCHED THEN
    INSERT (...) VALUES (...);
```

The first matching `WHEN MATCHED` clause wins. If a row matches the `DELETE` condition, the `UPDATE` clause is **not** evaluated for that row.

> **PostgreSQL:** `INSERT ... ON CONFLICT` does not support conditional upserts natively. You must use a `CASE` expression inside `DO UPDATE SET` or use a CTE + `DELETE` pattern.

---

## DELETE vs TRUNCATE vs DROP — Quick Reference

Since we are in the DML section, a brief comparison for context:

| Operation  | Lock Level  | Rollback  | Triggers | WHERE clause | Speed   |
| ---------- | ----------- | --------- | -------- | ------------ | ------- |
| `DELETE`   | Row-level   | Yes       | Fires    | Yes          | Slow    |
| `TRUNCATE` | Table-level | Depends\* | No       | No           | Fast    |
| `DROP`     | Table-level | Depends\* | No       | No           | Fastest |

\* In SQL Server, `TRUNCATE` is fully logged and can be rolled back. In PostgreSQL, `TRUNCATE` can be rolled back.

> Cross-reference: See the **DELETE vs TRUNCATE vs DROP** section for full details.

---

## Common Mistakes

### Mistake 1: Using MERGE Without Deduplicating the Source

```sql
-- BAD: staging_products has duplicate product_ids
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
...
-- ERROR in SQL Server: "row matched more than once"
```

**Fix:** Deduplicate the source with `ROW_NUMBER()` or a `GROUP BY`.

### Mistake 2: Assuming MERGE Is Atomic Across Multiple WHEN Clauses

```sql
-- BAD:以为 MATCHED DELETE + NOT MATCHED INSERT works as "move"
MERGE INTO archive_log AS t
USING source AS s
ON t.id = s.id
WHEN MATCHED THEN DELETE
WHEN NOT MATCHED THEN INSERT VALUES (s.id, s.val);
-- This does NOT "move" rows. It deletes matched rows from archive_log
-- and inserts rows from source that don't exist in archive_log.
```

### Mistake 3: Using REPLACE INTO in MySQL for Upserts

```sql
-- BAD
REPLACE INTO orders (order_id, status)
VALUES (100, 'shipped');
-- This deletes the old row (breaking FK references) and inserts a new one.
```

**Fix:** Use `INSERT ... ON DUPLICATE KEY UPDATE`.

### Mistake 4: Forgetting the ON CONFLICT Column Matches a Unique Index

```sql
-- BAD: no unique index on (customer_id)
INSERT INTO customer_emails (customer_id, email)
VALUES (1, 'new@example.com')
ON CONFLICT (customer_id)
DO UPDATE SET email = EXCLUDED.email;
-- ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

### Mistake 5: MERGE in SQL Server Fires UPDATE Even When Values Are Identical

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED THEN UPDATE SET t.price = s.price;
-- Fires UPDATE for row 2 (Mouse, price unchanged at 29.99)
-- This causes unnecessary trigger invocations and transaction log writes
```

**Fix:** Add an `AND` guard:

```sql
WHEN MATCHED AND t.price <> s.price THEN UPDATE SET t.price = s.price;
```

> **Note:** PostgreSQL's `ON CONFLICT DO UPDATE` also fires the UPDATE even when values are identical, but since PostgreSQL does not have `AFTER UPDATE` triggers that fire only on actual changes (unless you use `WHEN (OLD IS DISTINCT FROM NEW)`), the impact is lower. You can still guard with:

```sql
DO UPDATE SET email = EXCLUDED.email
WHERE customer_emails.email IS DISTINCT FROM EXCLUDED.email;
```

---

## Production Pitfalls

### 1. MERGE and Transactions

MERGE is a single statement but can acquire **multiple locks**. In SQL Server, a MERGE that touches many rows can cause:

- Lock escalation (row → page → table)
- Blocking other sessions
- Deadlocks if other sessions hold conflicting locks

**Mitigation:** Batch large MERGE operations:

```sql
-- Process in batches of 1000
WHILE EXISTS (SELECT 1 FROM staging_products)
BEGIN
    MERGE INTO products AS t
    USING (SELECT TOP 1000 * FROM staging_products) AS s
    ON t.product_id = s.product_id
    WHEN MATCHED AND t.price <> s.price THEN
        UPDATE SET t.price = s.price
    WHEN NOT MATCHED THEN
        INSERT (...) VALUES (...);

    DELETE TOP (1000) FROM staging_products;
END
```

### 2. MERGE and Triggers

In SQL Server, `MERGE` can fire both `INSERT`, `UPDATE`, and `DELETE` triggers in a single statement. If your trigger logic assumes single-operation statements, it can break:

```sql
CREATE TRIGGER trg_products_audit ON products
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    -- This trigger sees both INSERTED and DELETED tables simultaneously
    -- during a MERGE that inserts AND updates
    INSERT INTO audit_log (operation, ...)
    SELECT 'INSERT', ... FROM INSERTED
    UNION ALL
    SELECT 'UPDATE', ... FROM INSERTED;
END
```

> **Production pitfall:** Always test MERGE with your triggers present. Unexpected trigger behavior during MERGE is a leading cause of data corruption bugs.

### 3. MERGE in Oracle — ORA-30926

Oracle raises `ORA-30926: unable to get a stable set of rows in the source tables` when the source has duplicate join columns. Always deduplicate.

### 4. ON CONFLICT and Index Bloat in PostgreSQL

Frequent `ON CONFLICT DO UPDATE` on hot rows can cause **index bloat** and **dead tuples**. Ensure autovacuum is configured aggressively for heavily upserted tables.

### 5. Foreign Key Cascades

If the target table has `ON DELETE CASCADE` foreign keys, a MERGE with `WHEN NOT MATCHED BY SOURCE THEN DELETE` (SQL Server) or a `REPLACE INTO` (MySQL) can cascade-delete related rows. Always audit cascade rules before using delete-capable upserts.

---

## Performance Implications

### What to Verify with Execution Plans

| Database   | Command                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| PostgreSQL | `EXPLAIN (ANALYZE, BUFFERS) <statement>`                                      |
| MySQL      | `EXPLAIN ANALYZE <statement>` or `EXPLAIN FORMAT=JSON <statement>`            |
| SQL Server | `SET STATISTICS PROFILE ON` or include Actual Execution Plan                  |
| Oracle     | `EXPLAIN PLAN FOR <statement>` then `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)` |

### Factors That Affect MERGE/UPSERT Performance

1. **Index type on conflict column:** B-tree is standard. GiST/GIN for exclusion constraints.
2. **Source size:** Large source sets mean more rows to evaluate.
3. **Selectivity of ON condition:** If most rows are NOT MATCHED, the INSERT path dominates.
4. **Lock contention:** MERGE acquires update locks; high-concurrency upserts can cause contention.
5. **Write amplification:** Updating unchanged rows wastes I/O and WAL traffic.
6. **Statistics freshness:** Stale statistics can lead to poor join strategies in the execution plan.

### Comparison: MERGE vs Separate INSERT + UPDATE

| Factor             | MERGE                        | Separate INSERT + UPDATE      |
| ------------------ | ---------------------------- | ----------------------------- |
| Round trips        | 1                            | 2 (or more)                   |
| Atomicity          | Single statement             | Requires explicit transaction |
| Complexity         | Higher                       | Lower                         |
| Debugging          | Harder                       | Easier                        |
| PostgreSQL support | No (pre-v17)                 | Yes                           |
| Performance        | Varies (optimizer dependent) | Varies                        |

> **Production pitfall:** "MERGE is always faster because it is one statement" is a myth. The execution plan, not the number of statements, determines performance. Some databases execute MERGE by internally decomposing it into separate operations anyway.

### Concurrency — PostgreSQL ON CONFLICT

PostgreSQL uses **serializable snapshot isolation** for `ON CONFLICT DO UPDATE`. Under high concurrency:

- Two concurrent upserts on the same key can cause one to retry.
- Retries consume CPU and may appear as deadlocks in logs.
- Use `ON CONFLICT DO UPDATE ... WHERE` to reduce contention scope.

### Concurrency — MySQL ON DUPLICATE KEY UPDATE

MySQL acquires a **unique key lock** (InnoDB). Two concurrent upserts on the same key will serialize — one waits for the other's row lock. This is generally efficient but can become a bottleneck under extreme write load on the same key.

---

## Comparison Table

| Feature                | ANSI MERGE                 | PostgreSQL ON CONFLICT  | MySQL ON DUPLICATE KEY | MySQL REPLACE INTO        |
| ---------------------- | -------------------------- | ----------------------- | ---------------------- | ------------------------- |
| INSERT + UPDATE        | Yes                        | Yes                     | Yes                    | Yes (via DELETE + INSERT) |
| DELETE capability      | Yes (SQL Server, Oracle)   | No (use CTE)            | No                     | No (implicit via DELETE)  |
| Conditional update     | Yes (WHEN MATCHED AND ...) | Yes (WHERE on EXCLUDED) | No (always updates)    | No                        |
| Conditional insert     | Yes                        | Yes (DO NOTHING)        | No                     | No                        |
| PK preserved on update | Yes                        | Yes                     | Yes                    | No (new auto-increment)   |
| NULL handling          | Standard three-valued      | Standard three-valued   | Standard three-valued  | Standard three-valued     |
| Triggers fired         | INSERT / UPDATE / DELETE   | INSERT / UPDATE         | INSERT / UPDATE        | DELETE / INSERT           |
| Batch support          | Yes                        | Yes                     | Yes                    | Yes                       |
| Multi-table source     | Yes                        | No                      | No                     | No                        |

---

## Best Practices

1. **Always deduplicate the source** before MERGE or `ON CONFLICT` when joining on non-PK columns.

2. **Add `AND` guards** to `WHEN MATCHED` to avoid unnecessary writes:

   ```sql
   WHEN MATCHED AND t.col1 <> s.col1 OR t.col2 <> s.col2 THEN
       UPDATE SET ...
   ```

3. **State the grain** of both source and target before writing any upsert.

4. **Test with empty source, empty target, and overlapping source/target** to cover all branches.

5. **Check execution plans** after writing any MERGE/UPSERT. Do not guess about performance.

6. **Avoid `REPLACE INTO`** in MySQL — use `INSERT ... ON DUPLICATE KEY UPDATE`.

7. **Use `COALESCE`** in `ON CONFLICT DO UPDATE SET` when you do not want NULLs to overwrite existing values.

8. **Batch large operations** to avoid lock escalation and long transactions.

9. **Audit trigger logic** to handle multi-operation MERGE statements.

10. **Prefer `INSERT ... ON CONFLICT`** in PostgreSQL over application-level SELECT-then-INSERT to avoid race conditions.

11. **Use `EXPLAIN ANALYZE`** to verify that the conflict detection uses an index scan, not a sequential scan.

12. **For high-concurrency upserts**, consider:
    - Application-level retry logic
    - Reducing transaction isolation where acceptable
    - Using queue-based patterns instead of direct upserts

---

# Interview Questions

## Beginner

1. What is the difference between `INSERT`, `UPDATE`, and an upsert?

2. What does `ON CONFLICT DO NOTHING` do in PostgreSQL?

3. Why does `REPLACE INTO` in MySQL differ from `INSERT ... ON DUPLICATE KEY UPDATE`?

4. What column must be referenced in the `ON CONFLICT` clause in PostgreSQL?

5. In SQL Server's MERGE, what do `WHEN MATCHED` and `WHEN NOT MATCHED` mean?

## Intermediate

6. Write a MERGE statement that updates `price` only when the new price differs from the old price.

7. How does `EXCLUDED` work in PostgreSQL's `ON CONFLICT DO UPDATE`?

8. What happens when the USING source in a MERGE has duplicate join keys in SQL Server?

9. Write an `ON CONFLICT DO UPDATE` that sets `email` to the new value only if the new value is not NULL.

10. Explain the difference between `WHEN NOT MATCHED BY TARGET` and `WHEN NOT MATCHED BY SOURCE`.

## Advanced

11. Why does SQL Server execute MERGE in two passes? What are the implications?

12. How would you implement a conditional upsert in PostgreSQL that only updates if the new row is "newer" (based on a `version` column)?

13. A MERGE statement inserts rows into a table that has `ON DELETE CASCADE` foreign keys. What can go wrong?

14. Write a PostgreSQL upsert using a partial unique index to allow multiple NULL emails but reject duplicate non-NULL emails.

15. In MySQL, you run `INSERT ... ON DUPLICATE KEY UPDATE` and `ROW_COUNT()` returns 2. What does this mean?

## Scenario Based

16. You have a `users` table and a `user_preferences` table. Some users have preferences, some do not. You receive a CSV upload of all users (some existing, some new) with their preferences. Write the upsert.

17. You need to sync `products` from an external API. The API may return products you already have (update price), products you don't have (insert), and products that were removed from the catalog (delete). Write a single MERGE statement.

18. Two concurrent processes call `ON CONFLICT DO UPDATE` on the same row with different columns. What happens? How do you handle it?

19. You need to merge 10 million rows from a staging table into a production table. The staging table has duplicates. Design the solution.

20. A MERGE statement with `WHEN NOT MATCHED BY SOURCE THEN DELETE` is run in production. 50,000 rows are deleted that should not have been. How could this have been prevented?

## Tricky

21. Does `MERGE INTO target USING (SELECT NULL AS id) AS s ON target.id = s.id WHEN MATCHED THEN UPDATE SET val = 99` ever fire the UPDATE? Why or why not?

22. In PostgreSQL, what happens when you `ON CONFLICT DO UPDATE SET val = EXCLUDED.val` and the excluded value is the same as the existing value? Does the row count change?

23. Can a MERGE statement in SQL Server fire both an INSERT trigger and a DELETE trigger for the same source row? Explain.

24. You write `INSERT INTO t (id, val) VALUES (1, 'a') ON CONFLICT (id) DO UPDATE SET val = 'a'`. The row already exists with `val = 'a'`. Does PostgreSQL consider this a conflict? Does it write to WAL?

25. In MySQL, if `id` is auto-increment and you use `REPLACE INTO` with `id = 5` (existing row), what happens to the auto-increment counter?

## Output Prediction

26. Given:

```sql
CREATE TABLE t (id INT PRIMARY KEY, val INT);
INSERT INTO t VALUES (1, 10), (2, 20);

MERGE INTO t
USING (VALUES (2, 25), (3, 30)) AS s(id, val)
ON t.id = s.id
WHEN MATCHED THEN UPDATE SET t.val = s.val
WHEN NOT MATCHED THEN INSERT VALUES (s.id, s.val);

SELECT * FROM t ORDER BY id;
```

What is the output?

27. Given:

```sql
CREATE TABLE t (id INT PRIMARY KEY, val INT);
INSERT INTO t VALUES (1, 10);

INSERT INTO t (id, val)
VALUES (1, 99)
ON CONFLICT (id)
DO UPDATE SET val = EXCLUDED.val + t.val;

SELECT * FROM t;
```

What is the output?

28. Given:

```sql
CREATE TABLE t (id INT PRIMARY KEY, val INT);
INSERT INTO t VALUES (1, 10), (2, 20);

INSERT INTO t (id, val)
VALUES (1, 99)
ON CONFLICT (id)
DO UPDATE SET val = EXCLUDED.val
WHERE t.val > 50;

SELECT * FROM t ORDER BY id;
```

What is the output? Why?

## Debugging

29. A developer writes:

```sql
MERGE INTO products AS t
USING staging_products AS s
ON t.product_id = s.product_id
WHEN MATCHED THEN
    UPDATE SET t.product_name = s.product_name
WHEN NOT MATCHED THEN
    INSERT (product_id, product_name) VALUES (s.product_id, s.product_name);
```

They report: "Some rows are updated with the wrong name." What could be wrong?

30. A PostgreSQL `ON CONFLICT DO UPDATE` fails with:

```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

The table has a primary key. What is the likely cause?

## Performance

31. You have 1 million rows to upsert. The target table has 10 million rows. The conflict column has a B-tree index. What should you check in the execution plan?

32. Under high concurrency (1000 upserts/second on overlapping keys), what are the trade-offs between PostgreSQL's `ON CONFLICT DO UPDATE` and a SELECT-then-INSERT/UPDATE application pattern?

33. A MERGE statement takes 30 seconds. The execution plan shows a table scan on the USING source. How would you improve this?

34. Why might `ON CONFLICT DO UPDATE` in PostgreSQL cause more WAL writes than a simple `UPDATE` statement?

35. You need to upsert 50 million rows. Compare: (a) one giant MERGE, (b) batched MERGE of 10,000 rows, (c) temporary table + single INSERT. What factors influence your choice?
