# 64 — Regular Expressions

> **What it is:** A declarative mini-langThe file is empty. Let me now write the comprehensive section:
> Let me verify the file was written correctly:
> The section has been written to `/home/soumrnjn/Desktop/Task/SQL/sql-handbook/7-Dates-and-Strings/64-Regular-Expressions.md` — **1,407 lines**.

**Structure (21 subsections):**

| #   | Section                        | Coverage                                                      |
| --- | ------------------------------ | ------------------------------------------------------------- | -------------- |
| 1   | Why Regular Expressions Matter | Motivation, real-world use cases                              |
| 2   | Regex vs LIKE                  | Comparison table, rule of thumb                               |
| 3   | Database Dialect Overview      | PostgreSQL, MySQL, SQL Server, Oracle syntax matrix           |
| 4   | Sample Data                    | `customers`, `orders` tables with realistic edge cases        |
| 5   | REGEXP_LIKE / ~                | Pattern testing, syntax per engine, examples                  |
| 6   | REGEXP_MATCHES                 | Extracting all matches, `g` flag, set-returning behavior      |
| 7   | REGEXP_SUBSTR                  | First/Nth match extraction, capture group indexing            |
| 8   | REGEXP_REPLACE                 | Global replace, backreferences, masking, camelCase→snake_case |
| 9   | Anchors & Boundaries           | `^`, `$`, `\b`, `\B`, anchoring mistakes                      |
| 10  | Character Classes              | `\d`, `\w`, `\s`, `.`, negated classes, Unicode               |
| 11  | Quantifiers                    | Greedy vs lazy, `{n,m}` syntax, examples                      |
| 12  | Groups & Alternation           | Capture groups, non-capture, `                                | `, SKU parsing |
| 13  | Case Sensitivity               | Operator/flag/collation interaction, MySQL gotcha             |
| 14  | Common Patterns Cookbook       | Email, phone, IP, UUID, date, hashtag extraction              |
| 15  | NULL Behavior                  | NULL propagation table, `regexp_matches` vs `regexp_match`    |
| 16  | Edge Cases                     | Empty string, greedy overlap, special chars, ReDoS            |
| 17  | Common Mistakes                | 7 BAD→BETTER examples with explanations                       |
| 18  | When to Use / NOT to Use       | Decision table for regex vs simpler tools                     |
| 19  | Performance Implications       | Indexing, functional indexes, `EXPLAIN ANALYZE`, backtracking |
| 20  | Best Practices                 | 11 actionable rules                                           |
| 21  | Interview Questions            | 40 questions across 8 categories                              |

**Callouts included:** `> **Interview trap:**`, `> **Production pitfall:**`, `> **Common misconception:**`, `> **PostgreSQL**`, `> **MySQL**`, `> **Oracle**`, `> **See also:**` cross-references.
hese in a single pattern.

> **See also:** Section 63 (String Functions) for `LIKE`, `SUBSTRING`,
> `POSITION`, `REPLACE`, and other built-in string operations.

---

## 2. Regular Expressions vs LIKE — Read This First

Before diving into regex, understand what `LIKE` already provides and where it
falls short.

| Feature                   | `LIKE`                  | Regular Expressions       |
| ------------------------- | ----------------------- | ------------------------- |
| Simple prefix/suffix      | `LIKE 'foo%'`           | `~ '^foo'` or `~ 'foo$'`  |
| Single-character wildcard | `LIKE '_at'`            | `~ '.at'`                 |
| Character classes         | Not supported           | `~ '[aeiou]'`             |
| Quantifiers (repetition)  | Not supported           | `~ '[0-9]{3}'`            |
| Alternation               | Not supported           | `~ 'cat\|dog'`            |
| Anchors (start/end)       | Implicit with `%`       | `^` and `$`               |
| Capture groups            | Not supported           | Supported                 |
| Case-insensitive          | Depends on collation    | Explicit flag             |
| Portability               | ANSI SQL, all databases | Syntax varies by database |

**Rule of thumb:** If `LIKE` with `%` and `_` does the job, use it — it is
simpler, faster, and portable. Reach for regex only when you need pattern
complexity beyond wildcards.

```sql
-- LIKE handles this fine
SELECT * FROM products WHERE sku LIKE 'KB-%';

-- Regex is needed here: match a dash followed by exactly 2 digits
SELECT * FROM products WHERE sku ~ 'KB-\d{2}';
```

---

## 3. Database Dialect Overview

Regular expression syntax is **not** portable across databases. Every major
engine has its own function names, operator syntax, and regex flavor.

| Capability                | PostgreSQL                                                         | MySQL (8.0+)                                      | SQL Server (2017+)                                                                     | Oracle                                            |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Pattern test**          | `column ~ 'pattern'`                                               | `column REGEXP 'pattern'`                         | `column LIKE 'pattern'` with `RLIKE` (proprietary) or `REGEXP_LIKE(column, 'pattern')` | `REGEXP_LIKE(column, 'pattern')`                  |
| **Case-insensitive test** | `column ~* 'pattern'`                                              | `column REGEXP 'pattern'` (collation-dependent)   | `REGEXP_LIKE(column, 'pattern', 'i')`                                                  | `REGEXP_LIKE(column, 'pattern', 'i')`             |
| **Extract matches**       | `regexp_matches(column, 'pattern')`                                | N/A (no built-in)                                 | N/A (no built-in)                                                                      | `REGEXP_SUBSTR` + `REGEXP_MATCHES` via XML        |
| **Extract first match**   | `regexp_match(column, 'pattern')` or `regexp_substr` via extension | `REGEXP_SUBSTR(column, pattern, pos, occurrence)` | `SUBSTRING(column, PATINDEX('%pattern%', column), len)` (limited)                      | `REGEXP_SUBSTR(column, pattern, pos, occurrence)` |
| **Replace by pattern**    | `regexp_replace(column, 'pattern', replacement)`                   | `REGEXP_REPLACE(column, pattern, replacement)`    | N/A natively (use `TRANSLATE` or CLR)                                                  | `REGEXP_REPLACE(column, pattern, replacement)`    |
| **Regex flavor**          | POSIX (ERE-like, with extensions)                                  | Henry Spencer regex                               | Boost (XRegExp-like)                                                                   | POSIX (ERE-like)                                  |
| **Flags**                 | `i` (case-insensitive), `g` (global)                               | `i` (case-insensitive)                            | `i`, `c` (case-sensitive), `n`, `m`, `x`                                               | `i`, `c`, `n`, `m`, `x`                           |

> **PostgreSQL** PostgreSQL uses POSIX regular expressions by default. The `~`
> operator is case-sensitive; `~*` is case-insensitive. Use `SIMILAR TO` for
> SQL-standard regex (different syntax — avoid it in favor of `~`).

> **MySQL** MySQL 8.0 added `REGEXP_LIKE()`, `REGEXP_REPLACE()`,
> `REGEXP_INSTR()`, and `REGEXP_SUBSTR()` with standard syntax. The older
> `REGEXP` / `RLIKE` operator still works but is less featureful. The default
> collation determines case sensitivity.

> **SQL Server** SQL Server 2017+ added `REGEXP_LIKE()`, `REGEXP_REPLACE()`,
> `REGEXP_SUBSTR()`, and `REGEXP_MATCHES()` in the `msdb` context. Prior to
> that, SQL Server had **no native regex support** — developers relied on CLR
> functions or `LIKE` patterns.

> **Oracle** Oracle has had `REGEXP_LIKE`, `REGEXP_SUBSTR`, `REGEXP_INSTR`,
> and `REGEXP_REPLACE` since version 10g. They use POSIX-style regex.

```sql
-- PostgreSQL
SELECT * FROM users WHERE email ~* '^[a-z0-9._%+-]+@example\.com$';

-- MySQL 8.0+
SELECT * FROM users WHERE REGEXP_LIKE(email, '^[a-z0-9._%+-]+@example\\.com$', 'i');

-- Oracle
SELECT * FROM users WHERE REGEXP_LIKE(email, '^[a-z0-9._%+-]+@example\.com$', 'i');
```

---

## 4. Sample Data

```sql
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    full_name   VARCHAR(100),
    email       VARCHAR(255),
    phone       VARCHAR(30),
    city        VARCHAR(50)
);

INSERT INTO customers (customer_id, full_name, email, phone, city) VALUES
(1, 'Ana Silva',       'Ana.Silva@example.com',    '+1 (555) 123-4567', 'Sao Paulo'),
(2, 'chen wei',        'chenwei@example.org',       '555.987.6543',      'Shanghai'),
(3, 'Maria Garcia',    'maria.garcia@example.com',  '555-222-0000',      NULL),
(4, 'John Smith',      NULL,                        '(555) 312-9999',    'Austin'),
(5, 'Priya Sharma',    'PRIYA.SHARMA@example.net',  NULL,                'Mumbai'),
(6, 'O''Brien, Sean',  'sean.obrien@corp.io',       '44 20 7946 0958',  'London'),
(7, 'user@broken',     'not-an-email',               'abc',              'Berlin'),
(8, 'spaces  in name','  too@many@at.com',          '12345',            'Tokyo'),
(9, NULL,              NULL,                         NULL,               NULL),
(10,'Jean-Paul Sartre','j.p.sartre@philosophy.fr',  '+33 1 23 45 67 89','Paris');

CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date  DATE,
    sku         VARCHAR(30),
    notes       VARCHAR(500)
);

INSERT INTO orders (order_id, customer_id, order_date, sku, notes) VALUES
(1001, 1,  '2025-01-15', 'KB-2024-041', 'Urgent: needs overnight shipping'),
(1002, 2,  '2025-02-20', 'CH-50W-X12',  NULL),
(1003, 3,  '2025-03-01', 'LS-AL-007',   'Gift wrap please'),
(1004, 1,  '2025-06-15', 'KB-2024-041', 'Second order - same item'),
(1005, 5,  '2025-07-04', 'CH-50W-X12',  'Call customer before delivery!!!'),
(1006, 6,  '2025-08-22', 'LS-AL-007',   'Ref: INV-2025-8842'),
(1007, 3,  '2025-09-01', 'DOESNOTEXIST-123', 'Bad SKU format');
```

**Grain:** One row in `customers` represents one customer. One row in `orders`
represents one order placed by one customer for one product.

---

## 5. Pattern Testing: REGEXP_LIKE / ~

The most fundamental regex operation: _does this string match this pattern?_

### Syntax by Database

```sql
-- PostgreSQL: ~ (case-sensitive), ~* (case-insensitive)
SELECT column FROM table WHERE column ~ 'pattern';

-- MySQL 8.0+
SELECT column FROM table WHERE REGEXP_LIKE(column, 'pattern');
SELECT column FROM table WHERE REGEXP_LIKE(column, 'pattern', 'i');

-- Oracle
SELECT column FROM table WHERE REGEXP_LIKE(column, 'pattern');
SELECT column FROM table WHERE REGEXP_LIKE(column, 'pattern', 'i');

-- SQL Server 2017+
SELECT column FROM table WHERE REGEXP_LIKE(column, 'pattern', 'i');
```

### Example: Find valid email addresses

```sql
-- PostgreSQL
SELECT full_name, email
FROM customers
WHERE email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND email IS NOT NULL;
```

| full_name        | email                    |
| ---------------- | ------------------------ |
| Ana Silva        | Ana.Silva@example.com    |
| chen wei         | chenwei@example.org      |
| Maria Garcia     | maria.garcia@example.com |
| Priya Sharma     | PRIYA.SHARMA@example.net |
| O'Brien, Sean    | sean.obrien@corp.io      |
| Jean-Paul Sartre | j.p.sartre@philosophy.fr |

Rows 7 (`not-an-email`) and 8 (`too@many@at.com`) are excluded because they
fail the pattern.

### Example: Find SKUs with exactly 4-digit year

```sql
-- Oracle / MySQL 8.0+
SELECT order_id, sku
FROM orders
WHERE REGEXP_LIKE(sku, '^KB-\d{4}-\d{3}$');
```

| order_id | sku         |
| -------- | ----------- |
| 1001     | KB-2024-041 |
| 1004     | KB-2024-041 |

---

## 6. Extracting Substrings: REGEXP_MATCHES

`REGEXP_MATCHES` returns **all** matches of a pattern against a string. In
PostgreSQL this returns a set of arrays. In Oracle this is not natively
available (use `REGEXP_SUBSTR` in a loop or `XMLTABLE`).

### Syntax

```sql
-- PostgreSQL
SELECT regexp_matches(column, 'pattern', 'g') FROM table;
-- Returns a set of text[] arrays. The 'g' flag means "find all matches".

-- Oracle (workaround for multiple matches using XMLTABLE)
SELECT EXTRACTVALUE(VALUE(t), '/m') AS match
FROM (
    SELECT REGEXP_SUBSTR(column, 'pattern', 1, LEVEL) AS VALUE
    FROM table
    CONNECT BY REGEXP_SUBSTR(column, 'pattern', 1, LEVEL) IS NOT NULL
) t;
```

### Example: Extract all numbers from a string

```sql
-- PostgreSQL
SELECT
    phone,
    regexp_matches(phone, '\d+', 'g') AS digit_groups
FROM customers
WHERE phone IS NOT NULL
LIMIT 4;
```

| phone             | digit_groups |
| ----------------- | ------------ |
| +1 (555) 123-4567 | {1}          |
| +1 (555) 123-4567 | {555}        |
| +1 (555) 123-4567 | {123}        |
| +1 (555) 123-4567 | {4567}       |

Each match is returned as a separate row. The `g` flag is critical — without
it, only the first match is returned.

### Example: Extract all words containing only lowercase

```sql
-- PostgreSQL
SELECT
    full_name,
    regexp_matches(full_name, '[a-z]+', 'g') AS lowercase_words
FROM customers
WHERE full_name IS NOT NULL
LIMIT 5;
```

| full_name    | lowercase_words |
| ------------ | --------------- |
| Ana Silva    | {Ana}           |
| Ana Silva    | {Silva}         |
| chen wei     | {chen}          |
| chen wei     | {wei}           |
| Maria Garcia | {Maria}         |

> **Note:** In PostgreSQL, `regexp_matches` without the `'g'` flag returns
> exactly one row per input row (or zero rows if no match). With `'g'`, it
> returns zero or more rows per input.

---

## 7. First Match Extraction: REGEXP_SUBSTR

Extracts the **first** (or Nth) occurrence of a pattern from a string.

### Syntax

```sql
-- MySQL 8.0+ / Oracle
REGEXP_SUBSTR(string, pattern, start_position, occurrence, match_type, subexpression)

-- PostgreSQL (use regexp_match for first match, regexp_matches for all)
regexp_match(string, 'pattern')   -- returns text[]
```

### Example: Extract the domain from email addresses

```sql
-- MySQL
SELECT
    full_name,
    email,
    REGEXP_SUBSTR(email, '@([a-zA-Z0-9.-]+)', 1, 1, '', 1) AS domain
FROM customers
WHERE email LIKE '%@%';
```

| full_name        | email                    | domain        |
| ---------------- | ------------------------ | ------------- |
| Ana Silva        | Ana.Silva@example.com    | example.com   |
| chen wei         | chenwei@example.org      | example.org   |
| Maria Garcia     | maria.garcia@example.com | example.com   |
| Priya Sharma     | PRIYA.SHARMA@example.net | example.net   |
| O'Brien, Sean    | sean.obrien@corp.io      | corp.io       |
| Jean-Paul Sartre | j.p.sartre@philosophy.fr | philosophy.fr |

The fifth parameter (`subexpression`) extracts the content of capture group 1
(the part inside parentheses).

### PostgreSQL Equivalent

```sql
-- PostgreSQL
SELECT
    full_name,
    email,
    (regexp_match(email, '@([a-zA-Z0-9.-]+)'))[1] AS domain
FROM customers
WHERE email LIKE '%@%';
```

`regexp_match` returns a `text[]` array. Index `[1]` is the first capture
group. Index `[0]` is the entire match.

### Example: Extract the first word from a string

```sql
-- Oracle
SELECT
    full_name,
    REGEXP_SUBSTR(full_name, '^\S+') AS first_word
FROM customers
WHERE full_name IS NOT NULL;
```

| full_name     | first_word |
| ------------- | ---------- |
| Ana Silva     | Ana        |
| chen wei      | chen       |
| Maria Garcia  | Maria      |
| John Smith    | John       |
| O'Brien, Sean | O'Brien    |

> **PostgreSQL** Use `regexp_match(full_name, '(\S+)')[1]` or split on
> spaces and take the first element.

---

## 8. Search & Replace: REGEXP_REPLACE

Replace text that matches a pattern, not just a literal substring.

### Syntax

```sql
-- PostgreSQL
regexp_replace(string, pattern, replacement, flags)

-- MySQL 8.0+ / Oracle
REGEXP_REPLACE(string, pattern, replacement, position, occurrence, match_type)
```

### Flags (PostgreSQL)

| Flag         | Meaning                              |
| ------------ | ------------------------------------ |
| `g`          | Replace **all** occurrences (global) |
| `i`          | Case-insensitive matching            |
| `gi` or `ig` | Both                                 |

Without `g`, only the **first** match is replaced.

### Example: Normalize phone numbers to digits only

```sql
-- PostgreSQL
SELECT
    phone,
    regexp_replace(phone, '[^0-9]', '', 'g') AS phone_digits_only
FROM customers
WHERE phone IS NOT NULL;
```

| phone             | phone_digits_only |
| ----------------- | ----------------- |
| +1 (555) 123-4567 | 15551234567       |
| 555.987.6543      | 5559876543        |
| 555-222-0000      | 5552220000        |
| (555) 312-9999    | 5553129999        |
| 44 20 7946 0958   | 442079460958      |
| 12345             | 12345             |

### Example: Remove consecutive spaces

```sql
-- MySQL
SELECT
    full_name,
    REGEXP_REPLACE(full_name, ' {2,}', ' ') AS cleaned_name
FROM customers;
```

| full_name      | cleaned_name   |
| -------------- | -------------- |
| spaces in name | spaces in name |

### Example: Mask credit card numbers (show last 4 only)

```sql
-- PostgreSQL
-- Assume a cards table with card_number like '4111 1111 1111 1111'
SELECT
    card_number,
    regexp_replace(
        card_number,
        '(\d{4})\s?(\d{4})\s?(\d{4})\s?(\d{4})',
        '**** **** **** \4'
    ) AS masked
FROM payments;
```

| card_number         | masked                          |
| ------------------- | ------------------------------- |
| 4111 1111 1111 1111 | \*\*\*\* \*\*\*\* \*\*\*\* 1111 |
| 5500 0000 0000 0004 | \*\*\*\* \*\*\*\* \*\*\*\* 0004 |

> **Production pitfall:** Always escape replacement strings. If the
> replacement contains `\` or `$`, they are interpreted as backreferences.
> To insert a literal `$`, use `$$` in PostgreSQL. Test replacements carefully.

### Example: Convert camelCase to snake_case

```sql
-- PostgreSQL
SELECT
    'firstName' AS input,
    regexp_replace('firstName', '([a-z])([A-Z])', '\1_\2', 'g') AS output;
```

| input     | output     |
| --------- | ---------- |
| firstName | first_Name |

Apply twice for multi-word camelCase:

```sql
SELECT regexp_replace(
    regexp_replace('firstName', '([a-z])([A-Z])', '\1_\2', 'g'),
    '([a-z])([A-Z])', '\1_\2', 'g'
);
-- Result: first_name
```

---

## 9. Anchors and Boundaries

Anchors match **positions**, not characters.

| Anchor | Meaning                                      | Example                                               |
| ------ | -------------------------------------------- | ----------------------------------------------------- |
| `^`    | Start of string (or line in multi-line mode) | `^A` matches strings starting with `A`                |
| `$`    | End of string (or line in multi-line mode)   | `com$` matches strings ending with `com`              |
| `\b`   | Word boundary                                | `\bcat\b` matches "the cat sat" but not "concatenate" |
| `\B`   | Non-word boundary                            | `\Bcat\B` matches "concatenate" but not "the cat"     |

### Example: Match exact strings, not substrings

```sql
-- BAD: matches 'Johnston', 'Johnny', 'John Smith'
SELECT * FROM customers WHERE full_name ~ 'John';

-- BETTER: anchors to ensure exact match
SELECT * FROM customers WHERE full_name ~ '^John$';
```

### Example: Find strings that start with a digit

```sql
-- PostgreSQL
SELECT phone
FROM customers
WHERE phone ~ '^\d';
```

| phone        |
| ------------ |
| 555.987.6543 |
| 555-222-0000 |
| 12345        |

### Example: Match whole words only

```sql
-- BAD: 'cat' also matches 'category', 'concatenate'
SELECT * FROM logs WHERE message ~ 'cat';

-- BETTER: use word boundaries
SELECT * FROM logs WHERE message ~ '\bcat\b';
```

> **Common misconception:** `^` and `$` match the start/end of the _entire
> string_ by default in SQL regex engines. To make them match start/end of
> each _line_, you need multi-line mode (`m` flag). This differs from some
> programming languages where multi-line is the default.

---

## 10. Character Classes

Character classes match **one character** from a defined set.

| Syntax        | Meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `[abc]`       | Matches `a`, `b`, or `c`                                     |
| `[^abc]`      | Matches anything **except** `a`, `b`, or `c`                 |
| `[a-z]`       | Matches any lowercase letter                                 |
| `[A-Z]`       | Matches any uppercase letter                                 |
| `[0-9]`       | Matches any digit                                            |
| `[a-zA-Z0-9]` | Matches any alphanumeric character                           |
| `\d`          | Matches any digit (same as `[0-9]`)                          |
| `\D`          | Matches any non-digit                                        |
| `\w`          | Matches any word character (`[a-zA-Z0-9_]`)                  |
| `\W`          | Matches any non-word character                               |
| `\s`          | Matches any whitespace character (space, tab, newline)       |
| `\S`          | Matches any non-whitespace character                         |
| `.`           | Matches **any single character** except newline (by default) |

### Example: Extract only the numeric parts

```sql
-- PostgreSQL
SELECT
    phone,
    regexp_matches(phone, '\d+', 'g') AS numbers
FROM customers
WHERE phone IS NOT NULL
LIMIT 3;
```

| phone             | numbers |
| ----------------- | ------- |
| +1 (555) 123-4567 | {1}     |
| +1 (555) 123-4567 | {555}   |
| +1 (555) 123-4567 | {123}   |

### Example: Find names containing non-ASCII characters

```sql
-- PostgreSQL
SELECT full_name
FROM customers
WHERE full_name ~ '[^a-zA-Z\s''-]';
```

| full_name        |
| ---------------- |
| Ana Silva        |
| Jean-Paul Sartre |

The `ã` in "Sao Paulo" would match if it were written as `São Paulo`.

> **PostgreSQL** PostgreSQL regex supports Unicode character classes. You can
> use `\p{Letter}` to match any Unicode letter, `\p{Digit}` for digits, etc.
> MySQL and SQL Server do not support Unicode property escapes by default.

---

## 11. Quantifiers

Quantifiers control **how many times** the preceding element must occur.

| Quantifier | Meaning                           |
| ---------- | --------------------------------- |
| `*`        | Zero or more                      |
| `+`        | One or more                       |
| `?`        | Zero or one (optional)            |
| `{n}`      | Exactly n times                   |
| `{n,}`     | n or more times                   |
| `{n,m}`    | Between n and m times (inclusive) |

### Greedy vs Lazy

By default, quantifiers are **greedy** — they match as much as possible.

| Syntax   | Meaning                |
| -------- | ---------------------- |
| `*?`     | Zero or more (lazy)    |
| `+?`     | One or more (lazy)     |
| `??`     | Zero or one (lazy)     |
| `{n,m}?` | Between n and m (lazy) |

### Example: Extract a 4-digit year

```sql
-- PostgreSQL
SELECT
    sku,
    regexp_match(sku, '(\d{4})') AS year_part
FROM orders
WHERE sku IS NOT NULL;
```

| sku              | year_part |
| ---------------- | --------- |
| KB-2024-041      | {2024}    |
| CH-50W-X12       | NULL      |
| LS-AL-007        | NULL      |
| KB-2024-041      | {2024}    |
| CH-50W-X12       | NULL      |
| LS-AL-007        | NULL      |
| DOESNOTEXIST-123 | NULL      |

### Example: Greedy vs Lazy — extracting between parentheses

```sql
-- Data with nested-ish parentheses
-- 'result is (100 + 200) and (300 + 400)'

-- Greedy (default): matches everything from first '(' to last ')'
-- Pattern: '\(.*\)'
-- Result: '(100 + 200) and (300 + 400)' — one big match

-- Lazy: matches each pair individually
-- Pattern: '\(.*?\)'
-- Result: first match '(100 + 200)', second match '(300 + 400)'
```

```sql
-- PostgreSQL: greedy vs lazy
SELECT
    'price: ($100) final ($200)' AS text,
    regexp_matches('price: ($100) final ($200)', '\(.*\)')  AS greedy,
    regexp_matches('price: ($100) final ($200)', '\(.*?\)') AS lazy;
```

| text                       | greedy                | lazy     |
| -------------------------- | --------------------- | -------- |
| price: ($100) final ($200) | {($100) final ($200)} | {($100)} |

With `'g'` flag, lazy returns multiple rows (one per pair).

---

## 12. Groups and Alternation

### Capture Groups

Parentheses `()` create **capture groups** — they let you extract specific
parts of a match.

```sql
-- Match an email and capture the domain
-- PostgreSQL
SELECT
    email,
    regexp_match(email, '@([a-zA-Z0-9.-]+)') AS domain_array
FROM customers
WHERE email LIKE '%@%';
```

| email                    | domain_array  |
| ------------------------ | ------------- |
| Ana.Silva@example.com    | {example.com} |
| chenwei@example.org      | {example.org} |
| maria.garcia@example.com | {example.com} |

Access the capture group by index:

```sql
-- PostgreSQL: extract username and domain separately
SELECT
    email,
    regexp_match(email, '^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)$') AS parts
FROM customers
WHERE email LIKE '%@%';
```

| email                 | parts                   |
| --------------------- | ----------------------- |
| Ana.Silva@example.com | {Ana.Silva,example.com} |

```sql
-- Access individual groups
SELECT
    email,
    (regexp_match(email, '^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)$'))[1] AS username,
    (regexp_match(email, '^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)$'))[2] AS domain
FROM customers
WHERE email LIKE '%@%';
```

| email                 | username  | domain      |
| --------------------- | --------- | ----------- |
| Ana.Silva@example.com | Ana.Silva | example.com |
| chenwei@example.org   | chenwei   | example.org |

### Non-Capturing Groups

Some engines support `(?:...)` which groups without capturing:

```sql
-- PostgreSQL: match 'ab' or 'ac' but only capture the variable part
SELECT regexp_match('ab', '(?:a)([bc])');
-- Result: {b}
```

### Alternation

The `|` operator means "OR".

```sql
-- Find rows where notes contain urgency keywords
-- PostgreSQL
SELECT order_id, notes
FROM orders
WHERE notes ~* '\b(urgent|asap|immediately|emergency)\b';
```

| order_id | notes                            |
| -------- | -------------------------------- |
| 1001     | Urgent: needs overnight shipping |

### Example: Parse a SKU into components

```sql
-- PostgreSQL
SELECT
    sku,
    (regexp_match(sku, '^([A-Z]+)-(.+)-(\d+)$'))[1] AS prefix,
    (regexp_match(sku, '^([A-Z]+)-(.+)-(\d+)$'))[2] AS middle,
    (regexp_match(sku, '^([A-Z]+)-(.+)-(\d+)$'))[3] AS suffix
FROM orders
WHERE sku ~ '^[A-Z]+-.+-\d+$';
```

| sku         | prefix | middle | suffix |
| ----------- | ------ | ------ | ------ |
| KB-2024-041 | KB     | 2024   | 041    |
| CH-50W-X12  | CH     | 50W    | X12    |
| LS-AL-007   | LS     | AL     | 007    |

> **Interview trap:** `regexp_match` returns `NULL` when there is no match.
> If you use `[1]` on a `NULL` array, the result is also `NULL`. Always check
> for this in downstream calculations.

---

## 13. Case Sensitivity

Case sensitivity depends on three factors:

1. **The regex operator used** (`~` vs `~*` in PostgreSQL)
2. **The flag parameter** (`'i'` for case-insensitive)
3. **The database collation** (MySQL, SQL Server)

| Engine     | Case-Sensitive Default | Case-Insensitive Option               |
| ---------- | ---------------------- | ------------------------------------- |
| PostgreSQL | `~` is case-sensitive  | `~*` or `~` with `'i'` flag           |
| MySQL      | Depends on collation   | `REGEXP` with `REGEXP_LIKE(..., 'i')` |
| SQL Server | Depends on collation   | `REGEXP_LIKE(..., 'i')`               |
| Oracle     | Case-sensitive         | `REGEXP_LIKE(..., 'i')`               |

```sql
-- PostgreSQL: case-sensitive
SELECT * FROM customers WHERE email ~ '^ana';
-- Returns nothing (email is 'Ana.Silva@example.com')

-- PostgreSQL: case-insensitive
SELECT * FROM customers WHERE email ~* '^ana';
-- Returns Ana Silva
```

> **Production pitfall:** In MySQL, case sensitivity of `REGEXP` depends on
> the table's collation. `utf8mb4_general_ci` is case-insensitive; `utf8mb4_bin`
> is case-sensitive. Do not assume a specific behavior without checking the
> collation. Use `SHOW CREATE TABLE` to inspect it.

---

## 14. Common Patterns — The Cookbook

### 14.1 Email Validation

```sql
-- PostgreSQL
SELECT * FROM customers
WHERE email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
```

> **Production pitfall:** RFC-compliant email validation is extremely complex.
> The pattern above catches the vast majority of real-world addresses but is
> not 100% compliant. For strict validation, use application-level validation
> or a dedicated library. In SQL, aim for _plausible_ filtering, not
> impenetrable security.

### 14.2 Phone Number Normalization

```sql
-- PostgreSQL: extract just digits
SELECT
    phone,
    regexp_replace(phone, '[^0-9]', '', 'g') AS digits
FROM customers
WHERE phone IS NOT NULL;
```

### 14.3 IP Address Validation

```sql
-- PostgreSQL
-- Matches IPv4 addresses (basic validation — doesn't check octet ranges)
SELECT * FROM logs
WHERE ip_address ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$';
```

For strict validation (checking each octet is 0-255):

```sql
-- PostgreSQL
SELECT * FROM logs
WHERE ip_address ~ '^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$';
```

### 14.4 Date-Like Strings (YYYY-MM-DD)

```sql
-- PostgreSQL
SELECT * FROM events
WHERE event_date::TEXT ~ '^\d{4}-\d{2}-\d{2}$';
```

### 14.5 Version Number Extraction

```sql
-- PostgreSQL
SELECT
    version,
    regexp_match(version, '^(\d+)\.(\d+)\.(\d+)$') AS parts
FROM app_releases;
```

| version | parts    |
| ------- | -------- |
| 1.9.0   | {1,9,0}  |
| 1.10.0  | {1,10,0} |
| 1.2.0   | {1,2,0}  |
| 2.0.0   | {2,0,0}  |
| 1.9.2   | {1,9,2}  |

### 14.6 Find Strings Containing Special Characters

```sql
-- PostgreSQL: names with non-alphanumeric, non-space characters
SELECT full_name
FROM customers
WHERE full_name ~ '[^a-zA-Z\s]';
```

| full_name        |
| ---------------- |
| O'Brien, Sean    |
| Jean-Paul Sartre |

### 14.7 Extract Hashtags

```sql
-- PostgreSQL
-- Input: 'Check out #SQL and #PostgreSQL tips'
SELECT regexp_matches('Check out #SQL and #PostgreSQL tips', '#(\w+)', 'g');
```

| regexp_matches |
| -------------- |
| {SQL}          |
| {PostgreSQL}   |

### 14.8 Validate UUID Format

```sql
-- PostgreSQL
SELECT * FROM sessions
WHERE session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

---

## 15. NULL Behavior

Regex functions follow standard SQL NULL propagation rules:

| Expression                             | Result when input is NULL |
| -------------------------------------- | ------------------------- |
| `NULL ~ 'pattern'`                     | `NULL`                    |
| `REGEXP_LIKE(NULL, 'pattern')`         | `NULL`                    |
| `regexp_matches(NULL, 'pattern')`      | No rows returned          |
| `regexp_replace(NULL, 'pattern', 'r')` | `NULL`                    |
| `regexp_match(NULL, 'pattern')`        | `NULL`                    |
| `REGEXP_SUBSTR(NULL, pattern)`         | `NULL`                    |

```sql
-- PostgreSQL
SELECT
    NULL ~ '.*' AS null_test,
    REGEXP_REPLACE(NULL, 'a', 'b') AS null_replace,
    regexp_matches(NULL, '.*') AS null_matches;
```

| null_test | null_replace | null_matches |
| --------- | ------------ | ------------ |
| NULL      | NULL         | _(no rows)_  |

> **See also:** NULL behavior deep-dive (Section 09), three-valued logic.

> **Interview trap:** `regexp_matches(NULL, '.*')` returns **zero rows**, not
> `NULL`. This is because it is a set-returning function. A non-matching
> pattern also returns zero rows. This can cause unexpected empty result sets
> in joins.

---

## 16. Edge Cases

### Empty String vs NULL

```sql
-- PostgreSQL
SELECT
    '' ~ '.*' AS empty_match,    -- true (empty string matches zero-or-more)
    '' ~ '^.+$' AS empty_require; -- false (empty string has no characters)
```

| empty_match | empty_require |
| ----------- | ------------- |
| true        | false         |

An empty string is **not** the same as `NULL`. Regex operates on actual
strings — `NULL` means "unknown" and produces `NULL`.

### Pattern Matches Everything

```sql
-- '.*' matches every non-NULL string (including empty strings)
SELECT full_name FROM customers WHERE full_name ~ '.*';
-- Returns all non-NULL full_name rows
```

### Greedy Matching Overlapping Results

```sql
-- PostgreSQL: greedy matches 'aa' as one match, not two
SELECT regexp_matches('aaa', 'aa', 'g');
-- Returns: {aa}  (only one match, greedy consumed two chars)
-- The third 'a' is left over and doesn't form a complete 'aa' match

-- Lazy version
SELECT regexp_matches('aaa', 'aa?', 'g');
-- Returns: {a}, {a}, {a} — each 'a' matched individually
```

### Special Characters in Pattern

Characters `.` `*` `+` `?` `(` `)` `[` `{` `|` `^` `$` `\` are **metacharacters**.
To match them literally, escape them with `\`:

```sql
-- PostgreSQL: match a literal dot
SELECT * FROM customers WHERE email ~ '\.com$';

-- Match a literal question mark
SELECT * FROM events WHERE notes ~ 'What\?';
```

> **Production pitfall:** Always escape user-provided input before embedding
> it in a regex pattern. An unescaped `(` in user input causes a syntax error.
> Worse, an attacker could craft a **ReDoS** (Regular Expression Denial of
> Service) pattern that causes catastrophic backtracking.

---

## 17. Common Mistakes

### Mistake 1: Forgetting `g` Flag for Global Replace

```sql
-- BAD: replaces only the first space
SELECT REGEXP_REPLACE('a b c d', ' ', '-');
-- Result: 'a-b c d'

-- BETTER: replace all spaces
-- PostgreSQL
SELECT regexp_replace('a b c d', ' ', '-', 'g');
-- Result: 'a-b-c-d'
```

### Mistake 2: Not Anchoring When You Need Exact Match

```sql
-- BAD: matches 'John' inside 'Johnston', 'Johnny'
SELECT * FROM customers WHERE full_name ~ 'John';

-- BETTER: anchor for exact match
SELECT * FROM customers WHERE full_name ~ '^John Smith$';
```

### Mistake 3: Using Regex When LIKE Suffices

```sql
-- BAD: unnecessarily complex
SELECT * FROM orders WHERE sku ~ '^KB-';

-- BETTER: simpler, more readable, potentially faster
SELECT * FROM orders WHERE sku LIKE 'KB-%';
```

### Mistake 4: Double-Escaping in Replacement Strings

```sql
-- BAD (PostgreSQL): \1 is interpreted as a backreference
SELECT regexp_replace('John Smith', '(\w+) (\w+)', '\2 \1');
-- Result: 'Smith John' — works, but only by accident

-- BETTER: be explicit about what you mean
SELECT regexp_replace('John Smith', '(\w+) (\w+)', '\2 \1');
-- This is actually correct. But watch out for literal backslashes:
-- BAD: trying to insert a literal backslash
SELECT regexp_replace('test', 'test', '\');
-- ERROR: invalid backreference

-- BETTER: escape it
SELECT regexp_replace('test', 'test', '\\');
-- Result: '\'
```

### Mistake 5: Forgetting NULL Rows Disappear

```sql
-- BAD: expects 10 rows but gets 9
SELECT full_name, regexp_match(full_name, '(\w+)$')
FROM customers;
-- Row 9 (NULL full_name) produces NULL, not a row with NULL result

-- BETTER: use LEFT behavior awareness
-- regexp_match returns NULL for NULLs, but the row still appears
-- regexp_matches returns ZERO rows for NULLs, which loses the row
```

> **See also:** Section 63 (String Functions) for `REPLACE` vs
> `REGEXP_REPLACE`, and the NULL deep-dive for propagation rules.

### Mistake 6: Assuming Cross-Database Portability

```sql
-- PostgreSQL only — fails on MySQL
SELECT * FROM users WHERE email ~ 'pattern';

-- MySQL only — different syntax
SELECT * FROM users WHERE email REGEXP 'pattern';

-- Portable across MySQL 8.0+ and Oracle
SELECT * FROM users WHERE REGEXP_LIKE(email, 'pattern');
```

### Mistake 7: Not Handling the Anchoring Trap with LIKE Equivalent

```sql
-- BAD: trying to mimic regex with LIKE and getting wrong results
-- Intent: find names that contain exactly one space
SELECT * FROM customers WHERE full_name LIKE '% %'
  AND full_name NOT LIKE '% % %';
-- Fragile and hard to read

-- BETTER: use regex with a clearer pattern
-- PostgreSQL
SELECT * FROM customers WHERE full_name ~ '^[^ ]+ [^ ]+$';
```

---

## 18. When to Use / When NOT to Use

### Use Regular Expressions When

- Pattern requires character classes, quantifiers, or alternation.
- You need to extract structured data from unstructured text.
- Validating formats (emails, phone numbers, IDs, UUIDs).
- Normalizing messy text (removing non-alphanumeric chars).
- Pattern matching across multiple positions in a string.
- Searching for words near other words.

### Do NOT Use Regular Expressions When

- Simple prefix/suffix/pattern matching via `LIKE` works.
- You only need `SUBSTRING` and `POSITION`.
- The pattern is trivial and readability matters more.
- Performance is critical and the table is large (regex cannot use indexes
  on the patterned column in most cases).
- Input is not sanitized (ReDoS risk).

| Scenario                            | Recommended Tool              |
| ----------------------------------- | ----------------------------- |
| `column LIKE 'foo%'`                | `LIKE`                        |
| `column LIKE '%bar%'`               | `LIKE` or full-text search    |
| Extract domain from email           | Regex (`REGEXP_SUBSTR`)       |
| Validate UUID format                | Regex                         |
| Replace all spaces with dashes      | `REGEXP_REPLACE` or `REPLACE` |
| Find strings starting with digit    | Regex (`^[0-9]`)              |
| Match exact string                  | `=` operator                  |
| Find rows where column has 3+ words | Regex (`^\S+(\s+\S+){2,}$`)   |

---

## 19. Performance Implications

### Key Performance Facts

1. **Regex functions cannot use indexes.** A query like
   `WHERE email ~ 'pattern'` forces a **full table scan** (or full index scan
   on a functional index — see below). This is the single most important
   performance consideration.

2. **Regex is inherently slower than simple pattern matching.** The regex
   engine must compile and execute a pattern for every row. `LIKE 'prefix%'`
   can use a B-tree index; `~ '^prefix'` usually cannot.

3. **Catastrophic backtracking is real.** Poorly designed patterns (especially
   with nested quantifiers like `(a+)+`) can cause exponential execution
   time. Test with large inputs before deploying.

4. **Replacing all occurrences (global flag) is more expensive than replacing
   the first match.** The engine must continue scanning the entire string.

### Verify with EXPLAIN

Always use `EXPLAIN` (PostgreSQL) or `EXPLAIN ANALYZE` to see the actual
execution plan:

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM customers WHERE email ~ '^Ana';
```

Look for `Seq Scan` or `Index Scan` in the output. If you see `Seq Scan` on a
large table, the regex is the bottleneck.

### Functional Indexes for Regex

PostgreSQL supports **expression indexes** that can speed up regex queries:

```sql
-- Create an index on lower(email) for case-insensitive regex
CREATE INDEX idx_customers_email_lower ON customers (LOWER(email));

-- Now this query can use the index
SELECT * FROM customers WHERE LOWER(email) ~ '^ana';
```

MySQL 8.0+ supports **functional indexes** similarly:

```sql
-- MySQL 8.0+
CREATE INDEX idx_customers_email_lower ON customers ((LOWER(email)));
```

> **Production pitfall:** On tables with millions of rows, regex without an
> appropriate index causes full scans. Before adding regex predicates to
> production queries, verify with `EXPLAIN ANALYZE` that the query plan is
> acceptable. Consider pre-processing data into structured columns if regex
> is used frequently.

### Performance Comparison Rule of Thumb

| Operation                      | Typical Relative Cost            |
| ------------------------------ | -------------------------------- |
| `column = 'literal'`           | Cheapest (index seek)            |
| `column LIKE 'prefix%'`        | Fast (index range scan)          |
| `column ~ '^prefix'`           | Moderate (depends on index)      |
| `column ~ 'complex.*pattern'`  | Slow (full scan + regex per row) |
| `column ~* 'case.insensitive'` | Slow (may prevent index use)     |

These are relative guides — **always verify with your database's execution
plan tool.** Do not assume.

---

## 20. Best Practices

1. **Use `LIKE` when it suffices.** Regex is more powerful but more expensive
   and less portable.

2. **Always anchor patterns** when you need an exact or prefix/suffix match.
   Unanchored patterns scan every position in every string.

3. **Use the `g` flag intentionally.** Without it, `REGEXP_REPLACE` only
   replaces the first match.

4. **Prefer `REGEXP_LIKE` over `REGEXP_SUBSTR`** when you only need a boolean
   test — it is cheaper.

5. **Escape user input** before embedding it in regex patterns to prevent
   syntax errors and ReDoS attacks.

6. **Test patterns on large datasets** before deploying. A pattern that runs
   in 1 ms on 100 rows may take 10 minutes on 10 million rows.

7. **Use `EXPLAIN ANALYZE`** to verify the query plan is acceptable.

8. **Create functional/expression indexes** if you frequently filter on regex
   patterns.

9. **Document complex patterns** with comments or a reference table. Regex is
   notoriously hard to read.

10. **Avoid regex in `ON` clauses of joins** unless absolutely necessary —
    joins are already expensive, and regex adds per-row compilation cost.

11. **Consider pre-processing.** If you always extract the same field (e.g.,
    domain from email), store it in a dedicated column and index it.

---

## 21. Interview Questions

### Beginner

1. What is the difference between `LIKE` and regular expressions in SQL?
2. How do you check if a string contains only digits using regex?
3. What does the `^` anchor do in a regex pattern? What does `$` do?
4. How do you make a regex match case-insensitive in PostgreSQL? In Oracle?
5. What does `.*` match?

### Intermediate

6. What is the difference between greedy and lazy quantifiers? Give a SQL example.
7. How do you extract a substring that matches a pattern (not a literal)?
8. Write a regex to validate that a string looks like a UUID.
9. What happens when you call `REGEXP_LIKE(NULL, '.*')`? What about
   `regexp_matches(NULL, '.*')`?
10. How would you normalize phone numbers to digits-only using regex?

### Advanced

11. Explain catastrophic backtracking with regex. How can you prevent it?
12. How would you create a PostgreSQL expression index to optimize a
    case-insensitive regex query?
13. What is the difference between `regexp_match` and `regexp_matches` in
    PostgreSQL?
14. How would you parse a composite log format like `2025-01-15 10:30:00 [ERROR] message here` into separate date, time, level, and message fields using regex?
15. Why can't SQL Server (pre-2017) use regex at all, and what workarounds existed?

### Scenario Based

16. You have a table of 50 million rows with a `url` column. You need to find
    all URLs where the path contains exactly three segments (e.g.,
    `/a/b/c`). How would you approach this efficiently?
17. A client stores dates as free-text in a `notes` column in formats like
    `2025-01-15`, `01/15/2025`, `Jan 15, 2025`. How would you extract and
    normalize all date-like strings?
18. You receive CSV data in a `payload` column and need to extract all
    email addresses found anywhere in the text. How would you do this?
19. A table stores country codes mixed with phone numbers like
    `+1-555-1234` and `+44-20-79460958`. How would you separate the country
    code from the rest?
20. Your regex-based `WHERE` clause causes a sequential scan on a 100M-row
    table. What strategies can you use to improve performance?

### Tricky

21. Does `'abc' ~ 'a.c'` return `true` or `false` in PostgreSQL? Why?
22. What is the result of `regexp_matches('aaa', 'aa', 'g')` — one row or two?
23. Is `REGEXP_REPLACE('hello world', 'world', 'SQL')` the same as
    `REGEXP_REPLACE('hello world', 'world', 'SQL', 'g')`? Why or why not?
24. Does `NULL ~ '^$'` return `true`, `false`, or `NULL`? What about
    `'' ~ '^$'`?
25. How does `REGEXP_LIKE` behave in MySQL with a `utf8mb4_bin` collation
    versus `utf8mb4_general_ci`?

### Output Prediction

26. What is the output of:

```sql
-- PostgreSQL
SELECT regexp_replace('aabbcc', '(\w)\1', '\1', 'g');
```

27. What is the output of:

```sql
-- PostgreSQL
SELECT (regexp_match('user@example.com', '@(.+)$'))[1];
```

28. What is the output of:

```sql
-- PostgreSQL
SELECT regexp_matches('123-456-7890', '\d{3}', 'g');
```

29. What is the output of:

```sql
-- PostgreSQL
SELECT
    '' ~ '.*' AS test1,
    '' ~ '^.+$' AS test2,
    NULL ~ '.*' AS test3;
```

30. What is the output of:

```sql
-- Oracle
SELECT REGEXP_SUBSTR('abc-123-def-456', '[0-9]+', 1, 2) FROM dual;
```

### Debugging

31. This query returns no rows when it should return customers with Gmail
    addresses. What is wrong?

```sql
SELECT * FROM customers WHERE email REGEXP '@gmail.com';
```

32. This replace should mask all digits but only masks the first one. Fix it:

```sql
-- MySQL
SELECT REGEXP_REPLACE('Order 12345 confirmed', '[0-9]', '*');
```

33. This regex is supposed to validate a date string but matches invalid dates.
    How would you improve it?

```sql
SELECT * FROM events WHERE event_text ~ '^\d{4}-\d{2}-\d{2}$';
```

34. A developer writes this query and it takes 45 seconds on a table with
    1M rows. What is the problem?

```sql
SELECT * FROM users WHERE LOWER(email) ~ '.*\.com$';
```

35. This query produces unexpected duplicate rows. Why?

```sql
-- PostgreSQL
SELECT o.order_id, c.full_name, regexp_matches(o.notes, '\d+', 'g') AS numbers
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;
```

### Performance

36. Under what conditions can a PostgreSQL expression index speed up a query
    with `REGEXP_LIKE`?
37. You have a pattern `'^(cat|dog|fish)$'` and an alternative pattern
    `'^(cat|dog|fish)\b'`. Which is likely faster on a 10M-row table and why?
38. How does the number of capture groups in a regex affect the performance of
    `REGEXP_REPLACE`?
39. A regex with nested quantifiers like `(a+)+` causes a 30-second query on
    100K rows. Explain why and provide a fix.
40. You need to check if 50 million strings match a complex pattern. The
    current query does a full table scan. Propose at least three strategies
    to improve performance.
