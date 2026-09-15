# Three-Valued Logic

---

## What It Is

Three-valued logic (3VL) is SQL's foundation for handling **UNKNOWN** comparisons. Unlike boolean logic (TRUE / FALSE), SQL introduces a third truth value: **UNKNOWN**. Every comparison involving `NULL` produces UNKNOWN rather than TRUE or FALSE.

This is not a bug. It is a deliberate design derived from C.J. Date and Chris Date's interpretation of Edgar Codd's relational model. `NULL` represents a missing or inapplicable value, and SQL cannot determine whether that missing value equals or differs from anything else.

---

## Why It Exists

Consider a table of employees where some have no `commission_pct`:

```
Is Alice's commission equal to 100?
```

Alice's commission is unknown. SQL cannot say TRUE (it might be 100, it might not be). SQL cannot say FALSE (it might actually be 100). So it returns **UNKNOWN**.

If SQL treated UNKNOWN as FALSE, queries like "find employees whose commission is NOT 100" would silently exclude Alice — which is wrong. If SQL treated UNKNOWN as TRUE, then "find employees whose commission IS 100" would also include Alice — which is also wrong. 3VL avoids both problems by making UNKNOWN explicit.

---

## The Three Truth Values

| Value | Meaning |
|-------|---------|
| **TRUE** | The comparison is definitely true |
| **FALSE** | The comparison is definitely false |
| **UNKNOWN** | The comparison involves a missing value; truth cannot be determined |

> Common misconception: Many developers think `NULL = NULL` returns FALSE. It actually returns **UNKNOWN**, not FALSE. FALSE would mean "I know these are different." UNKNOWN means "I cannot determine."

---

## Sample Tables

```sql
CREATE TABLE employees (
    emp_id      INT PRIMARY KEY,
    emp_name    VARCHAR(100) NOT NULL,
    department  VARCHAR(50),
    salary      DECIMAL(10,2),
    commission  DECIMAL(5,2),
    hire_date   DATE,
    manager_id  INT
);

INSERT INTO employees VALUES
(1, 'Alice',   'Engineering', 95000.00, 0.15, '2020-03-15', NULL),
(2, 'Bob',     'Engineering', 82000.00, NULL, '2021-07-22', 1),
(3, 'Charlie', 'Marketing',   67000.00, 0.10, '2019-11-30', 1),
(4, 'Diana',   'Marketing',   71000.00, NULL, '2022-01-10', 1),
(5, 'Eve',     NULL,          88000.00, NULL, NULL, 1),
(6, 'Frank',   'Engineering', 91000.00, 0.12, '2018-06-01', NULL);
```

**Grain:** One row per employee.

| emp_id | emp_name | department | salary | commission | hire_date  | manager_id |
|--------|----------|------------|--------|------------|------------|------------|
| 1 | Alice | Engineering | 95000.00 | 0.15 | 2020-03-15 | NULL |
| 2 | Bob | Engineering | 82000.00 | NULL | 2021-07-22 | 1 |
| 3 | Charlie | Marketing | 67000.00 | 0.10 | 2019-11-30 | 1 |
| 4 | Diana | Marketing | 71000.00 | NULL | 2022-01-10 | 1 |
| 5 | Eve | NULL | 88000.00 | NULL | NULL | 1 |
| 6 | Frank | Engineering | 91000.00 | 0.12 | 2018-06-01 | NULL |

---

## NULL Comparison Behavior

### The core rule

Any comparison operator (`=`, `<>`, `<`, `>`, `<=`, `>=`) returns **UNKNOWN** when one or both operands are NULL.

```sql
-- NULL = NULL
SELECT NULL = NULL;                    -- UNKNOWN (not TRUE, not FALSE)

-- NULL <> NULL
SELECT NULL <> NULL;                   -- UNKNOWN

-- NULL > 5
SELECT NULL > 5;                       -- UNKNOWN

-- NULL < 5
SELECT NULL < 5;                       -- UNKNOWN

-- NULL <= NULL
SELECT NULL <= NULL;                   -- UNKNOWN

-- 5 = NULL
SELECT 5 = NULL;                       -- UNKNOWN
```

### How databases report these

Most databases do not display UNKNOWN directly. They display `NULL`:

```sql
-- PostgreSQL
SELECT NULL = NULL;       -- Result: NULL

-- MySQL
SELECT NULL = NULL;       -- Result: NULL

-- SQL Server
SELECT NULL = NULL;       -- Result: NULL

-- Oracle
SELECT NULL FROM dual;    -- Result: NULL
```

The result is UNKNOWN, but rendered as NULL in output.

### NULL-safe equality operators

Each database provides a way to compare values that treats NULL as a real value:

```sql
-- ANSI SQL standard
SELECT * FROM employees
WHERE commission IS NOT DISTINCT FROM 0.15;

-- PostgreSQL
SELECT * FROM employees
WHERE commission <=> 0.15;          -- MySQL NULL-safe equality

-- SQL Server
SELECT * FROM employees
WHERE ISNULL(commission, 0) = 0;   -- workaround
-- or
SELECT * FROM employees
WHERE EXISTS (
    SELECT 1 WHERE e.commission = 0.15 OR (e.commission IS NULL AND 0.15 IS NULL)
);
```

| Operator | NULL = NULL | NULL <> NULL | NULL > 5 | Purpose |
|----------|-------------|--------------|----------|---------|
| `=` | UNKNOWN | — | — | Standard comparison |
| `<>` | — | UNKNOWN | — | Standard comparison |
| `IS NULL` | TRUE | — | — | Tests for NULL |
| `IS NOT NULL` | FALSE | — | — | Tests for non-NULL |
| `IS DISTINCT FROM` | FALSE | FALSE | TRUE | NULL-safe inequality |
| `IS NOT DISTINCT FROM` | TRUE | TRUE | FALSE | NULL-safe equality |
| `<=>` (MySQL) | TRUE | FALSE | FALSE | MySQL NULL-safe equality |

---

## Truth Tables

### AND truth table

| AND | TRUE | FALSE | UNKNOWN |
|-----|------|-------|---------|
| **TRUE** | TRUE | FALSE | UNKNOWN |
| **FALSE** | FALSE | FALSE | FALSE |
| **UNKNOWN** | UNKNOWN | FALSE | UNKNOWN |

```sql
-- TRUE AND UNKNOWN → UNKNOWN
SELECT TRUE AND NULL;          -- NULL

-- FALSE AND UNKNOWN → FALSE
SELECT FALSE AND NULL;         -- FALSE (short-circuit: false stays false)
```

**Key insight:** `FALSE AND UNKNOWN` evaluates to **FALSE**, not UNKNOWN. Once SQL knows one side is FALSE, the entire AND is FALSE regardless of the other side. This is called short-circuit evaluation.

### OR truth table

| OR | TRUE | FALSE | UNKNOWN |
|----|------|-------|---------|
| **TRUE** | TRUE | TRUE | TRUE |
| **FALSE** | FALSE | FALSE | UNKNOWN |
| **UNKNOWN** | TRUE | UNKNOWN | UNKNOWN |

```sql
-- TRUE OR UNKNOWN → TRUE
SELECT TRUE OR NULL;           -- TRUE (short-circuit: true stays true)

-- FALSE OR UNKNOWN → UNKNOWN
SELECT FALSE OR NULL;          -- NULL
```

**Key insight:** `TRUE OR UNKNOWN` evaluates to **TRUE**. Once SQL knows one side is TRUE, the entire OR is TRUE.

### NOT truth table

| NOT | Result |
|-----|--------|
| TRUE | FALSE |
| FALSE | TRUE |
| UNKNOWN | UNKNOWN |

```sql
-- NOT UNKNOWN → UNKNOWN
SELECT NOT NULL;               -- NULL
```

### Compound expression examples

```sql
-- (NULL = 5) AND (3 > 1)  →  UNKNOWN AND TRUE  →  UNKNOWN
SELECT (NULL = 5) AND (3 > 1);   -- NULL

-- (NULL = 5) OR (3 > 1)   →  UNKNOWN OR TRUE   →  TRUE
SELECT (NULL = 5) OR (3 > 1);    -- TRUE

-- NOT (NULL = 5)          →  NOT UNKNOWN       →  UNKNOWN
SELECT NOT (NULL = 5);           -- NULL

-- (NULL = 5) AND (1 > 2)  →  UNKNOWN AND FALSE →  FALSE
SELECT (NULL = 5) AND (1 > 2);   -- FALSE
```

---

## NULL in WHERE Clauses

This is where most bugs originate.

### BAD APPROACH

```sql
-- "Find employees NOT in department 'Engineering'"
SELECT *
FROM employees
WHERE department <> 'Engineering';
```

**Result:**

| emp_id | emp_name | department | salary | commission | hire_date | manager_id |
|--------|----------|------------|--------|------------|-----------|------------|
| 3 | Charlie | Marketing | 67000.00 | 0.10 | 2019-11-30 | 1 |
| 4 | Diana | Marketing | 71000.00 | NULL | 2022-01-10 | 1 |

**Eve is missing.** Her department is NULL. The condition `NULL <> 'Engineering'` returns UNKNOWN. `WHERE` filters out UNKNOWN rows (it only keeps TRUE rows). So Eve silently disappears.

### BETTER APPROACH

```sql
-- Include NULL departments explicitly
SELECT *
FROM employees
WHERE department <> 'Engineering'
   OR department IS NULL;
```

| emp_id | emp_name | department | salary | commission | hire_date | manager_id |
|--------|----------|------------|--------|------------|-----------|------------|
| 3 | Charlie | Marketing | 67000.00 | 0.10 | 2019-11-30 | 1 |
| 4 | Diana | Marketing | 71000.00 | NULL | 2022-01-10 | 1 |
| 5 | Eve | NULL | 88000.00 | NULL | NULL | 1 |

### Using IS DISTINCT FROM for a cleaner solution

```sql
-- PostgreSQL / standard SQL
SELECT *
FROM employees
WHERE department IS DISTINCT FROM 'Engineering';
```

This returns TRUE when department is NULL (NULL is distinct from 'Engineering'), so Eve is included automatically.

### The WHERE filter principle

`WHERE` only keeps rows where the condition evaluates to **TRUE**. UNKNOWN and FALSE are both discarded.

```
WHERE condition
  ┌──────────────────┐
  │ TRUE  → keep row │
  │ FALSE → discard  │
  │ UNKNOWN → discard│
  └──────────────────┘
```

This is critical to understand: `NOT (NULL = 5)` is UNKNOWN, not TRUE, so rows with NULL are still excluded.

```sql
-- Find all employees where commission is NOT 0.15
SELECT * FROM employees
WHERE NOT (commission = 0.15);

-- Result excludes Eve (commission is NULL)
-- NOT (NULL = 0.15) → NOT UNKNOWN → UNKNOWN → filtered out
```

---

## NULL in Expressions

NULL propagates through arithmetic and string operations.

```sql
-- Any arithmetic with NULL returns NULL
SELECT 10 + NULL;           -- NULL
SELECT 10 * NULL;           -- NULL
SELECT NULL / NULL;          -- NULL
SELECT NULL + 5;            -- NULL

-- String concatenation
SELECT 'Hello' || NULL;     -- NULL (PostgreSQL, Oracle)
SELECT CONCAT('Hello', NULL); -- NULL (MySQL, SQL Server)
```

### EXCEPTION: COALESCE and CASE

```sql
-- COALESCE returns the first non-NULL value
SELECT COALESCE(NULL, NULL, 42, 100);  -- 42

-- CASE can handle NULL via IS NULL
SELECT
    CASE
        WHEN commission IS NULL THEN 'No commission'
        WHEN commission = 0 THEN 'Zero commission'
        ELSE 'Has commission: ' || commission::TEXT
    END AS commission_status
FROM employees;
```

### NULL with aggregate functions

NULL values are **excluded** from all aggregate functions except `COUNT(*)`.

```sql
SELECT
    COUNT(*)                  AS count_rows,        -- 6 (all rows)
    COUNT(commission)         AS count_commission,   -- 3 (NULLs excluded)
    COUNT(DISTINCT commission) AS count_distinct_com, -- 3
    SUM(commission)           AS sum_commission,     -- 0.37 (NULLs ignored)
    AVG(commission)           AS avg_commission,     -- 0.123333... (0.37/3, not 0.37/6)
    MAX(commission)           AS max_commission,     -- 0.15
    MIN(commission)           AS min_commission      -- 0.10
FROM employees;
```

> Common misconception: `AVG(commission)` divides the sum of non-NULL values by the count of non-NULL values, not by the total row count. If you want NULLs to count as zero, use `AVG(COALESCE(commission, 0))`.

---

## NULL in Subqueries: The NOT IN Trap

This is one of the most dangerous SQL pitfalls.

### BAD APPROACH

```sql
CREATE TABLE valid_departments (
    dept_name VARCHAR(50)
);

INSERT INTO valid_departments VALUES
('Engineering'),
('Marketing'),
(NULL);

-- "Find employees NOT in valid_departments"
SELECT *
FROM employees
WHERE department NOT IN (SELECT dept_name FROM valid_departments);
```

**Result: EMPTY SET.** Zero rows returned.

**Why?** The subquery returns `('Engineering', 'Marketing', NULL)`. The NOT IN condition expands to:

```
department <> 'Engineering'
AND department <> 'Marketing'
AND department <> NULL
```

The last condition `department <> NULL` evaluates to UNKNOWN for every row. `UNKNOWN AND ...` makes the entire condition UNKNOWN or FALSE for every row. No row passes the WHERE filter.

### BETTER APPROACH: Use NOT EXISTS

```sql
SELECT e.*
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM valid_departments d
    WHERE d.dept_name = e.department
);
```

**Result:**

| emp_id | emp_name | department | salary | commission | hire_date | manager_id |
|--------|----------|------------|--------|------------|-----------|------------|
| 5 | Eve | NULL | 88000.00 | NULL | NULL | 1 |

Eve is correctly returned because `NOT EXISTS` uses `=` which returns UNKNOWN when comparing NULL to NULL, and `EXISTS` treats UNKNOWN as "not found" — so the correlated subquery finds no matching row, and Eve passes.

> Interview trap: "Why does `NOT IN` with a NULL in the subquery return no rows?" This is asked frequently. The answer is the 3VL expansion of NOT IN creates AND conditions with `<> NULL`, which always produces UNKNOWN.

### Comparison: IN vs EXISTS vs NOT IN vs NOT EXISTS

```sql
-- IN: returns rows where department is in the list
-- NULL in list does NOT cause problems with IN
SELECT * FROM employees
WHERE department IN (SELECT dept_name FROM valid_departments);
-- Eve is excluded (NULL NOT IN list → UNKNOWN → filtered)
-- But other rows work correctly

-- NOT IN: dangerous when subquery contains NULLs
SELECT * FROM employees
WHERE department NOT IN (SELECT dept_name FROM valid_departments);
-- Returns EMPTY SET because of NULL in subquery

-- EXISTS: works correctly with NULLs
SELECT * FROM employees e
WHERE EXISTS (SELECT 1 FROM valid_departments d WHERE d.dept_name = e.department);
-- Eve excluded (NULL = NULL → UNKNOWN → EXISTS treats as not found)

-- NOT EXISTS: works correctly with NULLs
SELECT * FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM valid_departments d WHERE d.dept_name = e.department);
-- Eve included (subquery finds no match → NOT EXISTS → TRUE)
```

| Operator | NULL in subquery | NULL in main table column | Safe? |
|----------|------------------|---------------------------|-------|
| `IN` | No problem for matches | NULL column → UNKNOWN → excluded | Partially safe |
| `NOT IN` | **Causes empty result** | NULL column → UNKNOWN → excluded | **Dangerous** |
| `EXISTS` | No problem | NULL column → UNKNOWN → subquery finds no match | Safe |
| `NOT EXISTS` | No problem | NULL column → subquery finds no match → NOT EXISTS TRUE | **Safe** |

---

## NULL in JOINs

### JOIN ON with NULL

```sql
-- employees.manager_id references employees.emp_id (self-join)
-- Alice, Frank have NULL manager_id
SELECT
    e.emp_name AS employee,
    m.emp_name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;
```

| employee | manager |
|----------|---------|
| Alice | NULL |
| Bob | Alice |
| Charlie | Alice |
| Diana | Alice |
| Eve | Alice |
| Frank | NULL |

The LEFT JOIN preserves Alice and Frank even though their `manager_id` is NULL. The join condition `NULL = m.emp_id` returns UNKNOWN, so no match is found. Since it is a LEFT JOIN, the row is preserved with NULL in the manager columns.

### BAD APPROACH: Accidental NULL-based join exclusion

```sql
-- If this were INNER JOIN instead of LEFT JOIN:
SELECT
    e.emp_name AS employee,
    m.emp_name AS manager
FROM employees e
INNER JOIN employees m ON e.manager_id = m.emp_id;
```

Alice and Frank disappear because `NULL = m.emp_id` is UNKNOWN → not matched → row filtered out.

### NULL in multiple-column joins

```sql
-- Joining on composite keys where one column is NULL
-- This is safe in most databases:
SELECT *
FROM table_a a
JOIN table_b b ON a.key1 = b.key1 AND a.key2 = b.key2;
-- If a.key2 is NULL, the join condition returns UNKNOWN → no match
-- Rows with NULL in join columns are excluded from INNER JOIN
```

---

## NULL in UNION

```sql
-- UNION removes duplicates, NULL = NULL is UNKNOWN, so...
-- PostgreSQL treats duplicate NULLs as duplicates (removes them)
-- SQL Server treats duplicate NULLs as duplicates (removes them)

SELECT NULL UNION SELECT NULL;    -- Returns 1 row

-- UNION ALL keeps all rows including duplicate NULLs
SELECT NULL UNION ALL SELECT NULL; -- Returns 2 rows
```

> PostgreSQL: NULLs are considered equal for DISTINCT and UNION deduplication.
> Oracle: Same behavior.
> SQL Server: Same behavior.

---

## NULL in GROUP BY

```sql
-- GROUP BY treats all NULLs as one group
SELECT department, COUNT(*) AS emp_count
FROM employees
GROUP BY department;
```

| department | emp_count |
|------------|-----------|
| Engineering | 3 |
| Marketing | 2 |
| NULL | 1 |

All NULL department values are grouped together into a single group.

---

## NULL in ORDER BY

```sql
-- NULLs sort behavior varies by database:

-- PostgreSQL / Oracle: NULLs sort LAST by default (ASC), FIRST by default (DESC)
SELECT emp_name, commission
FROM employees
ORDER BY commission ASC;

-- To control NULL position:
SELECT emp_name, commission
FROM employees
ORDER BY commission ASC NULLS LAST;    -- PostgreSQL, Oracle
-- or
SELECT emp_name, commission
FROM employees
ORDER BY commission ASC NULLS FIRST;   -- PostgreSQL, Oracle

-- SQL Server: NULLs sort FIRST by default in both ASC and DESC
-- MySQL: NULLs sort FIRST in ASC, LAST in DESC
-- Oracle: NULLs sort LAST in ASC, FIRST in DESC
```

| Database | NULLs in ASC | NULLs in DESC | Customizable? |
|----------|--------------|---------------|---------------|
| PostgreSQL | LAST | FIRST | Yes (`NULLS FIRST/LAST`) |
| Oracle | LAST | FIRST | Yes (`NULLS FIRST/LAST`) |
| SQL Server | FIRST | FIRST | No native syntax (use CASE or ISNULL) |
| MySQL | FIRST | LAST | No native syntax (use CASE or IFNULL) |

---

## NULL-Safe Comparison Functions

### COALESCE

```sql
-- Returns the first non-NULL argument
SELECT COALESCE(NULL, NULL, 'default');  -- 'default'

-- Practical use: handle NULL commission
SELECT
    emp_name,
    COALESCE(commission, 0) AS commission_safe
FROM employees;
```

| emp_name | commission_safe |
|----------|-----------------|
| Alice | 0.15 |
| Bob | 0.00 |
| Charlie | 0.10 |
| Diana | 0.00 |
| Eve | 0.00 |
| Frank | 0.12 |

### NULLIF

```sql
-- Returns NULL if the two arguments are equal; otherwise returns the first argument
-- Useful for preventing division by zero
SELECT 10 / NULLIF(0, 0);    -- NULL (instead of error)

-- Practical use: convert sentinel values to NULL
SELECT NULLIF(department, 'UNKNOWN') AS department
FROM employees;
```

### CASE with NULL

```sql
-- CASE WHEN uses = which returns UNKNOWN for NULL comparisons
SELECT
    emp_name,
    CASE
        WHEN department = 'Engineering' THEN 'Eng'
        WHEN department = 'Marketing' THEN 'Mkt'
        WHEN department IS NULL THEN 'Unassigned'
        ELSE 'Other'
    END AS dept_group
FROM employees;
```

### NVL / IFNULL / ISNULL (database-specific)

| Database | Function | Syntax |
|----------|----------|--------|
| Oracle | `NVL(commission, 0)` | Returns second arg if first is NULL |
| MySQL | `IFNULL(commission, 0)` | Returns second arg if first is NULL |
| SQL Server | `ISNULL(commission, 0)` | Returns second arg if first is NULL |
| PostgreSQL | `COALESCE(commission, 0)` | Standard, works everywhere |

> Prefer `COALESCE` for portability. It is ANSI SQL standard and supported by all databases.

---

## NULL in Boolean Contexts

```sql
-- A WHERE clause implicitly treats expressions as boolean

-- This is valid:
SELECT * FROM employees WHERE department;

-- This returns rows where department is NOT NULL and NOT empty string
-- (in MySQL, empty string is falsy)
-- In PostgreSQL, this would error (department is VARCHAR, not BOOLEAN)

-- SAFE: explicit NULL check
SELECT * FROM employees WHERE department IS NOT NULL;
```

### NULL in CASE expressions

```sql
-- CASE returns the first matching THEN value
-- If no WHEN matches, CASE returns ELSE
-- If no ELSE, CASE returns NULL

SELECT
    CASE
        WHEN commission > 0.12 THEN 'High'
        WHEN commission <= 0.12 THEN 'Low'
    END AS commission_tier
FROM employees;
-- Eve (NULL commission): neither condition is TRUE → no ELSE → returns NULL
```

---

## NULL with Window Functions

```sql
-- NULLs are treated as the lowest value in ORDER BY within window functions
-- by default in some databases

SELECT
    emp_name,
    department,
    salary,
    RANK() OVER (ORDER BY commission DESC NULLS LAST) AS rank_by_commission
FROM employees;
```

- `NULLS LAST` ensures NULLs rank lowest (PostgreSQL, Oracle)
- Without `NULLS LAST`, behavior varies by database

```sql
-- NULLS are excluded from window frame aggregation
SELECT
    emp_name,
    department,
    salary,
    AVG(salary) OVER (
        PARTITION BY department
        ORDER BY hire_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_avg
FROM employees;
```

If `hire_date` is NULL (Eve), the ORDER BY places her according to database-specific NULL sorting rules, and the running average calculation may include or exclude her depending on the frame.

---

## NULL in Indexes

```sql
-- B-tree indexes generally do NOT index NULLs in most databases
-- (exception: partial indexes in PostgreSQL)

-- This query may not use an index:
SELECT * FROM employees WHERE commission IS NULL;

-- PostgreSQL: create a partial index for NULL lookups
CREATE INDEX idx_commission_null ON employees (emp_id)
WHERE commission IS NULL;

-- SQL Server: filtered index
CREATE INDEX idx_commission_null ON employees (emp_id)
WHERE commission IS NULL;
```

> Performance implication: If your workload frequently queries for NULL values, consider a filtered/partial index. Without it, the database must scan all rows to find NULLs.

---

## Common Mistakes

### Mistake 1: Using = NULL

```sql
-- WRONG
SELECT * FROM employees WHERE commission = NULL;
-- Returns nothing (UNKNOWN → filtered out)

-- CORRECT
SELECT * FROM employees WHERE commission IS NULL;
```

### Mistake 2: Using <> NULL

```sql
-- WRONG
SELECT * FROM employees WHERE department <> NULL;
-- Returns nothing

-- CORRECT
SELECT * FROM employees WHERE department IS NOT NULL;
```

### Mistake 3: Assuming NOT IN handles NULLs

```sql
-- DANGEROUS
SELECT * FROM employees
WHERE department NOT IN (SELECT dept_name FROM some_table);
-- If some_table contains NULL, returns empty set

-- SAFE
SELECT * FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM some_table s WHERE s.dept_name = e.department
);
```

### Mistake 4: Forgetting NULL in arithmetic

```sql
-- BAD: commission calculation disappears when commission is NULL
SELECT emp_name, salary + (salary * commission) AS total_comp
FROM employees;
-- Eve and Bob get NULL for total_comp

-- BETTER: treat NULL as 0
SELECT emp_name, salary + (salary * COALESCE(commission, 0)) AS total_comp
FROM employees;
```

### Mistake 5: NULL in DISTINCT / GROUP BY surprises

```sql
-- All NULLs in department are grouped together
-- This may not be what you expect if NULL means "unknown department"
-- vs "no department"
SELECT department, COUNT(*)
FROM employees
GROUP BY department;
-- NULL group count: 1 (Eve)
```

### Mistake 6: NULL in CHECK constraints

```sql
-- This CHECK constraint does NOT prevent NULLs
ALTER TABLE employees
ADD CONSTRAINT chk_salary CHECK (salary > 0);
-- NULL still allowed (UNKNOWN → constraint not violated)

-- To prevent NULLs:
ALTER TABLE employees ALTER COLUMN salary SET NOT NULL;
```

---

## Production Pitfalls

### Pitfall 1: NULL in unique constraints

```sql
-- Most databases allow multiple NULLs in a UNIQUE column
-- PostgreSQL: allows unlimited NULLs
-- SQL Server: allows one NULL (before 2022), unlimited after
-- MySQL/InnoDB: allows multiple NULLs
-- Oracle: allows unlimited NULLs

CREATE TABLE users (
    email VARCHAR(255) UNIQUE
);

INSERT INTO users VALUES (NULL);
INSERT INTO users VALUES (NULL);  -- succeeds in most databases
```

> Production pitfall: If you rely on UNIQUE to enforce a "at most one unknown" rule, it will not work. Use a partial index or application logic.

### Pitfall 2: NULL in NOT NULL columns in data migrations

```sql
-- When migrating data, NULLs in NOT NULL columns cause failures
-- Always COALESCE or handle NULLs before adding NOT NULL constraints

-- Step 1: Fill NULLs
UPDATE employees SET department = 'Unknown' WHERE department IS NULL;

-- Step 2: Add constraint
ALTER TABLE employees ALTER COLUMN department SET NOT NULL;
```

### Pitfall 3: NULL in partitioning / sharding keys

```sql
-- NULL partition keys may cause rows to go to unexpected partitions
-- Some databases route NULL partition keys to a default partition
-- Others may reject the row

-- Always ensure partition keys are NOT NULL
```

### Pitfall 4: NULL in replication / ETL

```
NULL handling differs across databases. When replicating data:
- A NULL in PostgreSQL may be stored as NULL in MySQL
- But NVL/IFNULL/ISNULL function calls may not translate
- ETL pipelines must handle NULL explicitly
```

---

## Performance Implications

1. **NULL checks in WHERE clauses** can prevent index usage in some databases. A filtered index (`WHERE column IS NULL`) can help.

2. **COALESCE in WHERE clauses** can make predicates non-sargable:
   ```sql
   -- BAD: function on column prevents index use
   WHERE COALESCE(department, 'Unknown') = 'Engineering'

   -- BETTER: rewrite as
   WHERE department = 'Engineering' OR department IS NULL
   -- Then create appropriate indexes
   ```

3. **AVG with NULLs** produces different results than `AVG(COALESCE(col, 0))`. Verify which behavior you need.

4. **Execution plan verification:** Use `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL), `EXPLAIN PLAN FOR` (Oracle), or `SET STATISTICS IO ON` (SQL Server) to verify that NULL-handling logic does not cause full table scans.

5. **Cardinality estimation:** Some optimizers struggle to estimate the selectivity of `IS NULL` predicates. Check the execution plan's estimated vs actual rows.

---

## Interview Traps

> Interview trap: "`NULL = NULL` returns TRUE, right?"
> **No.** It returns UNKNOWN.

> Interview trap: "If a subquery returns NULLs, `NOT IN` works fine, right?"
> **No.** `NOT IN` with NULLs in the subquery returns zero rows.

> Interview trap: "`COUNT(column)` and `COUNT(*)` return the same thing, right?"
> **No.** `COUNT(column)` excludes NULLs. `COUNT(*)` counts all rows.

> Interview trap: "NULL is the same as empty string, right?"
> **No.** `NULL = ''` returns UNKNOWN. They are completely different.

> Interview trap: "NULL is the same as 0, right?"
> **No.** `NULL = 0` returns UNKNOWN.

> Interview trap: "`WHERE column <> 'value'` returns all rows where column is not 'value', including NULLs."
> **No.** It excludes NULLs. Use `column <> 'value' OR column IS NULL`.

---

## Comparison Summary Table

| Expression | Result | Explanation |
|------------|--------|-------------|
| `NULL = NULL` | UNKNOWN | Cannot determine equality of unknowns |
| `NULL <> NULL` | UNKNOWN | Cannot determine inequality of unknowns |
| `NULL < 5` | UNKNOWN | Cannot determine ordering with unknown |
| `NULL > 5` | UNKNOWN | Cannot determine ordering with unknown |
| `NULL = 5` | UNKNOWN | Cannot determine equality |
| `NULL <> 5` | UNKNOWN | Cannot determine inequality |
| `NULL AND TRUE` | UNKNOWN | TRUE AND UNKNOWN = UNKNOWN |
| `NULL AND FALSE` | FALSE | FALSE AND anything = FALSE (short-circuit) |
| `NULL OR TRUE` | TRUE | TRUE OR anything = TRUE (short-circuit) |
| `NULL OR FALSE` | UNKNOWN | FALSE OR UNKNOWN = UNKNOWN |
| `NOT NULL` | UNKNOWN | NOT UNKNOWN = UNKNOWN |
| `NULL IN (1,2,3)` | UNKNOWN | Cannot determine membership |
| `NULL NOT IN (1,2,3)` | UNKNOWN | Cannot determine non-membership |
| `NULL IN (1,2,NULL)` | UNKNOWN | One branch UNKNOWN, others FALSE → UNKNOWN |
| `NULL NOT IN (1,2,NULL)` | UNKNOWN | All branches UNKNOWN or FALSE → UNKNOWN |
| `NULL IS NULL` | TRUE | IS NULL tests for NULL directly |
| `NULL IS NOT NULL` | FALSE | IS NOT NULL tests for non-NULL |
| `COALESCE(NULL, 5)` | 5 | Returns first non-NULL |
| `NULLIF(5, 5)` | NULL | Arguments equal → NULL |
| `NULLIF(5, 3)` | 5 | Arguments differ → first argument |
| `COUNT(NULL)` | 0 | COUNT excludes NULLs |
| `COUNT(*)` | N | Counts all rows |
| `SUM(NULL)` | NULL | All-NULL input → NULL |
| `AVG(NULL)` | NULL | All-NULL input → NULL |

---

## Best Practices

1. **Always use `IS NULL` / `IS NOT NULL`** — never `= NULL` or `<> NULL`.

2. **Default to `NOT EXISTS` over `NOT IN`** — especially when the subquery might contain NULLs.

3. **Use `COALESCE`** to provide defaults for NULLs in calculations.

4. **Use `IS DISTINCT FROM`** (PostgreSQL, Oracle) or `NULL-safe equality` (MySQL `<=>`) for NULL-safe comparisons.

5. **Add `NULLS LAST` / `NULLS FIRST`** in ORDER BY for deterministic sorting.

6. **Declare `NOT NULL` constraints** wherever business logic requires a value. Do not rely on application code.

7. **Design grain explicitly** — know whether NULL means "missing", "not applicable", or "unknown". Document this.

8. **Test with NULLs** — always include NULL values in test data to verify query behavior.

9. **Use filtered indexes** for frequently queried NULL columns.

10. **Verify with EXPLAIN** — do not assume NULL-handling logic is optimized. Check the execution plan.

---

## Cross-References

- See **NULL** (2-NULL-and-Logic) for detailed NULL fundamentals.
- See **COALESCE and NULLIF** for handling functions.
- See **NOT EXISTS vs NOT IN** for the subquery trap deep-dive.
- See **Execution Plans** (Performance) for verifying NULL predicate optimization.
- See **Indexes** (Performance) for filtered index strategies.

---

# Interview Questions

## Beginner

1. What are the three truth values in SQL?
2. What does `NULL = NULL` evaluate to?
3. How do you test if a column is NULL?
4. What is the difference between `COUNT(*)` and `COUNT(column)`?
5. What does `COALESCE(NULL, 10, 20)` return?
6. Write a query to find all employees whose department is NULL.

## Intermediate

7. Why does `WHERE commission <> 0.15` exclude rows where `commission` is NULL?
8. What happens when you use `NOT IN` with a subquery that contains NULLs? Explain why.
9. What is the difference between `IS DISTINCT FROM` and `<>`?
10. Write a query to calculate `salary + bonus` where `bonus` may be NULL, treating NULL bonus as 0.
11. Explain how NULL values are handled in `GROUP BY`.
12. How do NULL values affect `AVG()` calculations?

## Advanced

13. Trace the evaluation of `(NULL = 5) AND (1 > 2)`. Show each step.
14. Why does `NOT IN (SELECT col FROM t WHERE col IS NULL)` return no rows regardless of the outer table?
15. How do different databases (PostgreSQL, MySQL, SQL Server) handle NULL sorting in ORDER BY?
16. Design a schema where NULL means "not applicable" vs "unknown". What constraints would you apply?
17. Explain why `WHERE COALESCE(department, 'Unknown') = 'Engineering'` is non-sargable.
18. How do filtered indexes help with NULL queries?

## Scenario Based

19. You have a table `orders` with `shipped_date` that is NULL for unshipped orders. Write a query to find all orders that have NOT been shipped.
20. A query `SELECT * FROM users WHERE role <> 'admin'` returns fewer rows than expected. The table has users with `role = NULL`. What is wrong and how do you fix it?
21. You need to join `employees` to `departments` but some employees have no department assigned. Write a query that includes all employees, showing department name or 'N/A'.
22. A NOT IN subquery suddenly started returning empty results after a data migration added NULLs to the referenced column. How do you fix it?

## Tricky

23. What does this return?
```sql
SELECT CASE WHEN NULL = NULL THEN 'Equal' ELSE 'Not Equal' END;
```
24. What does this return?
```sql
SELECT * FROM (VALUES (1),(2),(3),(NULL)) AS t(val)
WHERE val NOT IN (SELECT * FROM (VALUES (1),(NULL)) AS s(val));
```
25. What does this return?
```sql
SELECT NULL = NULL AND NULL = NULL;
```
26. What does this return?
```sql
SELECT NOT (NULL IN (NULL));
```

## Output Prediction

27. Given:
```sql
CREATE TABLE t (a INT, b INT);
INSERT INTO t VALUES (1, NULL), (NULL, 2), (3, 3), (NULL, NULL);
SELECT a + b FROM t;
```
What rows are returned?

28. Given:
```sql
SELECT
    CASE
        WHEN a > b THEN 'a wins'
        WHEN a < b THEN 'b wins'
        ELSE 'tie'
    END AS result
FROM t;
```
Using the same table `t` above, what rows are returned?

## Debugging

29. This query returns fewer rows than expected:
```sql
SELECT * FROM employees WHERE department <> 'Sales' AND commission > 0.10;
```
The user expects all non-Sales employees with commission above 0.10. What might be wrong?

30. This INSERT fails:
```sql
ALTER TABLE employees ADD CONSTRAINT chk_dept CHECK (department <> '');
INSERT INTO employees VALUES (7, 'Grace', NULL, 70000, NULL, NULL, 1);
```
Why? How do you fix it?

## Performance

31. You have a query `SELECT * FROM orders WHERE shipped_date IS NULL`. The table has 10 million rows. How might you optimize this without changing the query?
32. The query `SELECT * FROM employees WHERE COALESCE(department, 'Unknown') = 'Engineering'` is slow. Why? Rewrite it for better performance.
33. You need to find all customers who have never placed an order. Compare using `NOT IN`, `NOT EXISTS`, and `LEFT JOIN ... IS NULL`. Which approach should you prefer and why?
