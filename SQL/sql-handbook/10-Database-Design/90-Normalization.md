Wrote `90-Normalization.md` (834 lines) to `sql-handbook/10-Database-Design/`. Covers: anomalies, FD/keys vocabulary, all normal forms (1NF→BCNF in depth, 4NF/5NF in brief), per-engine DDL for identity/UNIQUE-NULL/deferrable/FK-indexing, a full step-0-mega-table → 3NF decomposition, snapshot-vs-catalog-price nuance, NULL behavior, common mistakes, lock-aware constraint-add pitfalls, measured denormalization guidance, BAD-vs-BETTER examples, and 42 unanswered interview questions across all 8 categories, ending with cross-references.
out which constraints capture the real-world rules is your job as the designer.

This section answers: what each normal form actually says, why it exists, the SQL needed to build a normalized schema, how NULL holes the theory, when to stop — and how to tell a beginner from an expert in an interview.

> Cross-referenced sections: 86-ACID and 87-Isolation-Levels for the transactional behavior behind constraint maintenance; 88-Locks-and-Blocking for why adding constraints on big tables can block production; 72-Indexes-Basics and 73-Composite-and-Covering-Indexes for why every `PRIMARY KEY`/`UNIQUE`/`FOREIGN KEY` creates or consumes an index; 78-EXPLAIN-Execution-Plans for the reminder that all performance claims must be verified with a plan.

---

## Fundamentals

### What normalization is (the one-sentence idea)

A table is a collection of rows with a fixed set of columns. **Normalization is the rule that decides which columns should be in which table.**

The target is deceptively simple:

> Every non-key fact must be dependent on **the key, the whole key, and nothing but the key**.

That slogan maps onto the first three normal forms almost exactly:

| Slogan part           | Normal form it maps to                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------- |
| "the key"             | **1NF** — columns are atomic, there is a real key, no repeating groups                        |
| "the whole key"       | **2NF** — no _partial_ dependency (part of a composite key alone determines a non-key column) |
| "nothing but the key" | **3NF** — no _transitive_ dependency (a non-key column determines another non-key column)     |

Everything above that (BCNF, 4NF, 5NF) sharpens the same idea for edge cases involving overlapping keys and multi-valued facts.

### Why it exists: update anomalies

Normalization exists to kill the three classic **anomalies** that appear the moment one real-world fact is stored in more than one row. They are best understood by staring at a bad table and asking "what happens when I INSERT / UPDATE / DELETE?":

| Anomaly            | Symptom                                                                                                             | Example                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Insert anomaly** | You cannot record a fact unless it comes with a payload of unrelated facts.                                         | You cannot add a brand-new product unless it is already attached to an order.                                   |
| **Update anomaly** | One real-world fact is stored in many rows, so a single change requires many — and possibly inconsistent — updates. | The customer's phone number lives in 40 order rows; one row gets updated, 39 don't.                             |
| **Delete anomaly** | Deleting one thing silently deletes an unrelated thing.                                                             | Deleting the only order that mentions a product deletes the product's name, category and price from the system. |

All three anomalies are **the same disease**: one fact stored in multiple rows, with no single owner row. Normalization makes sure every fact has exactly one owner.

> Common misconception: "Normalization is about saving disk space." Disk space is a symptom, not the goal. The goal is **single-source-of-truth consistency**. A normalized schema can occasionally store _more_ bytes (surrogate IDs, extra join keys) while eliminating much larger _semantic_ redundancy. Disk was never the point; correctness and maintainability are.

### The normal forms ladder

| Normal form    | Requires (each level builds on the previous)                                          | Introduced by     |
| -------------- | ------------------------------------------------------------------------------------- | ----------------- |
| **1NF**        | Atomic values, no repeating groups, a key exists                                      | Codd 1970         |
| **2NF**        | 1NF + no partial dependency on any **composite** candidate key                        | Codd 1971         |
| **3NF**        | 2NF + no transitive dependency on a non-key attribute                                 | Codd 1971         |
| **BCNF**       | 3NF + every determinant is a superkey (closes the 3NF loophole with overlapping keys) | Boyce & Codd 1974 |
| **4NF**        | BCNF + no independent multi-valued dependencies                                       | Fagin 1977        |
| **5NF**        | 4NF + no join dependencies (lossless-join preservation at every split)                | Fagin 1979        |
| **6NF / DKNF** | Query-specific; arbitrary relations decomposed to atomic facts                        | Date & Fagin      |

> Practical reality: 99% of production relational schemas target **3NF or BCNF**. 4NF and 5NF surface in real modeling but rarely as an explicit decision; usually they come along for free when you think in terms of "one entity → one table" and "one relationship → one table." Going after 5NF by hand, without a concrete join-dependency problem, is over-engineering.

---

## The core vocabulary (learn these precisely — interviews hinge on them)

- **Attribute / column.** A named fact about a row.
- **Tuple / row / record.** One instance of all the attributes.
- **Functional dependency (FD):** `X → Y` means: _if two rows have the same value for X, they must have the same value for Y._ In other words, X **determines** Y. The left side X is the **determinant**, the right side Y is the **dependent**.
- **Trivial FD:** `X → Y` where Y is a subset of X. Holds for free; never a design concern. Example: `(order_id, product_id) → order_id`.
- **Superkey:** any set of columns whose value is _unique_ across all rows.
- **Candidate key:** a _minimal_ superkey — a superkey with no unnecessary column. You cannot remove any column and still guarantee uniqueness.
- **Primary key (PK):** the candidate key you designate as the row identity. Only one per table, `NOT NULL` by definition.
- **Composite key:** a candidate key with more than one column, e.g. `(order_id, product_id)` in `order_items`.
- **Prime attribute:** a column that is part of **some** candidate key (not necessarily the PK).
- **Non-prime attribute:** a column that is in _no_ candidate key.
- **Partial dependency:** a non-prime column depends on **part** of a composite candidate key. Only possible in tables with a composite key.
- **Transitive dependency:** `A → B` and `B → C` where `B` is _not_ a key, giving `A → C` "through" B.

> Interview trap: "Prime attribute" and "primary key attribute" are **not** the same thing. A column can be part of a candidate key other than the PK and still be prime. The 3NF definition is written in terms of _candidate_ keys, not the PK you happened to pick.

### How do you _find_ functional dependencies?

FDs come from **business rules about the real world**, not from peeking at data:

- "Each product belongs to exactly one category" → `product_id → category_id`
- "Each order belongs to exactly one customer" → `order_id → customer_id`
- "Each (order, product) line has one quantity" → `(order_id, product_id) → quantity`
- "Each customer email is unique" → `email → customer_id`

> Common misconception: "I ran a query and saw that X is always unique, so X is a key." Data can only **disprove** an FD (two rows with the same X but different Y), never prove one. `SELECT ... GROUP BY X HAVING COUNT(DISTINCT Y) > 1` can show you an FD is _false_; no query shows an FD is _true_, because the next insert may violate it. FDs are declarations about the domain.

The process of deriving normal forms is mechanical once you have the FD list for a table:

1. Write down every known FD for the table.
2. Compute the candidate keys (closure of attribute sets — the "attribute closure" algorithm from relational theory).
3. Walk each normal form's checklist; on violation, decompose the table and repeat.

That is the _theory_. In practice you rarely run the closure algorithm; you either inherit a schema or model the entities by hand and sanity-check with these rules.

---

## The SQL building blocks: declaring the design

Normalized schema = plenty of small tables + constraints that encode the FDs. The **constraints** are the DBMS's enforcement layer; without them the schema is only _nominally_ normalized.

### The primary constraint types

| Constraint                                         | What it enforces                                                   | FD it encodes to the engine                      |
| -------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `PRIMARY KEY (cols)`                               | Uniqueness + `NOT NULL` on the key columns; creates a unique index | "these columns identify a row"                   |
| `UNIQUE (cols)`                                    | Uniqueness; creates a unique index                                 | "these columns determine a row"                  |
| `FOREIGN KEY (child_cols) REFERENCES parent(cols)` | Every child value must `=` some parent key value, or be `NULL`     | "child fact belongs to exactly one parent row"   |
| `NOT NULL`                                         | Column cannot be `NULL`                                            | "every row has a value here"                     |
| `CHECK (expr)`                                     | Row-level predicate                                                | "every row satisfies this business rule"         |
| `DEFERRABLE` (PG, Oracle)                          | Constraint check moved to `COMMIT` instead of statement end        | "deal with circular dependencies at commit time" |

### Engine differences for identity/PK columns

The DDL is standard, but the _syntax to auto-generate key values_ differs significantly:

> PostgreSQL
>
> ```sql
> customer_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY  -- SQL:2016
> -- older: customer_id SERIAL PRIMARY KEY
> ```

> MySQL
>
> ```sql
> customer_id INT AUTO_INCREMENT PRIMARY KEY
> ```

> SQL Server
>
> ```sql
> customer_id INT IDENTITY(1,1) PRIMARY KEY
> ```

> Oracle
>
> ```sql
> customer_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY  -- 12c+
> -- pre-12c: SEQUENCE + BEFORE INSERT trigger in the application
> ```

### A fully normalized running example

We will carry one scenario through the entire section: an e-commerce catalog. Statement of grain up front — always do this before designing anything:

| Table         | Grain (what one row represents)        |
| ------------- | -------------------------------------- |
| `customers`   | one customer                           |
| `categories`  | one product category                   |
| `products`    | one product, currently in one category |
| `orders`      | one order (header: who, when, ship-to) |
| `order_items` | one product line _within_ one order    |

This is the **target** schema (3NF/BCNF) we will derive step by step:

```sql
CREATE TABLE customers (
    customer_id   INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255)  NOT NULL UNIQUE,        -- email -> customer_id
    full_name     VARCHAR(100)  NOT NULL,
    phone         VARCHAR(30)                            -- optional: NULL = no phone
);

CREATE TABLE categories (
    category_id   INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(50)   NOT NULL UNIQUE
);

CREATE TABLE products (
    product_id    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name  VARCHAR(100)  NOT NULL,
    category_id   INTEGER       NOT NULL REFERENCES categories (category_id),
    current_price NUMERIC(10,2) NOT NULL CHECK (current_price >= 0)
);
-- product_id -> category_id    (each product in exactly one category)

CREATE TABLE orders (
    order_id      INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id   INTEGER       NOT NULL REFERENCES customers (customer_id),
    ordered_at    TIMESTAMPTZ   NOT NULL DEFAULT current_timestamp,
    ship_to       TEXT          NOT NULL
);
-- order_id -> customer_id

CREATE TABLE order_items (
    order_id    INTEGER        NOT NULL REFERENCES orders (order_id)   ON DELETE CASCADE,
    product_id  INTEGER        NOT NULL REFERENCES products (product_id),
    quantity    INTEGER        NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10,2)  NOT NULL,           -- snapshot at order time (see the price discussion below)
    PRIMARY KEY (order_id, product_id)
);
-- (order_id, product_id) -> quantity, unit_price
```

Every FD above is now _enforced_ by the engine: a duplicate key insert fails, an orphan child insert fails, a parent delete with children fails (or cascades by design).

> Production pitfall: **FKs need an index on the child side.** `orders.customer_id` is no good for lookups by customer unless it is indexed. The PK index on `customers.customer_id` is the _parent_ side. Every major engine will let you create the FK without a child index, then do a full scan every time you delete/update a parent row (PostgreSQL even warns: `there is no unique constraint matching given keys` or `missing index ... referencing constraint`). Check 73-Composite-and-Covering-Indexes for the guidance; verify with `EXPLAIN` (78-EXPLAIN-Execution-Plans).

---

## First Normal Form (1NF)

### What it says

1. All columns are **atomic** — one value per cell, no "lists" or "packed" values inside a column.
2. **No repeating groups** — a set of facts that repeats for one row must be modeled as rows in a child table, not as repeated columns.
3. There is a **key** identifying each row.

1NF is the _barrier to entry_ for the relational model. Everything below it is a spreadsheet, not a relation.

### BAD APPROACH A — comma-separated list inside one column

```sql
CREATE TABLE customers (
    customer_id   INTEGER PRIMARY KEY,
    customer_name VARCHAR(100),
    addresses     VARCHAR(500)   -- "12 Elm St|Boston|MA, 90 Maple Ave|Newark|NJ"
);
```

Why this violates 1NF (and then everything else):

- One cell holds several facts; the engine cannot index, compare, or validate "the 2nd address".
- **NULL behavior:** an empty string `''` is a _value_; a missing list is `NULL`. Two customers with no addresses are indistinguishable as "no addresses" vs "one address that is an empty string" — and `count(*)` treats them differently.
- Capitalization, delimiter collisions (`"1, Main St"` in a CSV column!), and order-of-values bugs corrupt the data.
- Queries become string gymnastics: `WHERE addresses LIKE '%Boston%'` on every request.

> Interview trap: "Atomicity" does _not_ mean a value must be a single scalar of one type — PostgreSQL arrays, JSON, and `TEXT` blobs of structured payloads are legal column types. A `jsonb` document inside a cell is atomic _as a cell_. 1NF is about **multi-valued business facts smuggled into one column for reuse**, e.g. "all of this customer's addresses" or "all the items in this order" — not about whether the payload is JSON. Modeling tips: if a fact is _queried/aggregated/constrained on its own_, it wants to be a column or a child row — verify each case against the queries you actually run.

### BAD APPROACH B — repeating columns

```sql
CREATE TABLE customers (
    customer_id   INTEGER PRIMARY KEY,
    customer_name VARCHAR(100),
    phone1        VARCHAR(30),
    phone2        VARCHAR(30),
    phone3        VARCHAR(30)
);
```

A customer with one phone leaves two cells `NULL`; a customer with four phones either loses one or forces a schema change (`ALTER TABLE customers ADD COLUMN phone4 ...`).

### BETTER APPROACH — atomic + child table

```sql
CREATE TABLE customer_addresses (
    customer_id INTEGER      NOT NULL REFERENCES customers (customer_id),
    address     TEXT         NOT NULL,
    is_primary  BOOLEAN      NOT NULL DEFAULT false,
    PRIMARY KEY (customer_id, address)
);

CREATE TABLE customer_phones (
    customer_id INTEGER      NOT NULL REFERENCES customers (customer_id),
    phone       VARCHAR(30)  NOT NULL,
    PRIMARY KEY (customer_id, phone)
);
```

Now "one customer can have many phone numbers" is a real relationship represented by rows, not by ceilings in the DDL.

### Expected result of the BETTER design

Query "every primary address in Boston":

```sql
SELECT c.customer_name, ca.address
FROM   customers c
JOIN   customer_addresses ca USING (customer_id)
WHERE  ca.is_primary
AND    ca.address ILIKE '% Boston %';
```

Each returned row = one customer + one of their addresses. The grain is documented right in the `FROM`/`JOIN` (see 3-Joins for fan-out: customers with 3 addresses now produce 3 rows — that is _correct_ here because the ask is per-address).

---

## Second Normal Form (2NF)

### What it says

Be in 1NF and have **no partial dependency**: no non-prime column may depend on only _part_ of a composite candidate key.

2NF is **vacuously satisfied** by any table whose candidate key is a single column. Partial dependency can only exist with a composite key. So 2NF exists purely to discipline composite-key tables.

### BAD APPROACH — the pre-2NF `order_items`

```sql
CREATE TABLE order_items (
    order_id      INTEGER        NOT NULL,
    product_id    INTEGER        NOT NULL,
    quantity      INTEGER        NOT NULL,
    product_name  VARCHAR(100)   NOT NULL,   -- depends only on product_id
    product_price NUMERIC(10,2)  NOT NULL,   -- depends only on product_id
    PRIMARY KEY (order_id, product_id)
);
```

Grain: one row per product-line within one order.

The candidate key is `(order_id, product_id)`. Now observe the FDs:

- `(order_id, product_id) → quantity` — fine, full key.
- `product_id → product_name` — **partial dependency** (product_name is non-prime and depends on half the key).
- `product_id → product_price` — **partial dependency**.

Consequences:

- **Update anomaly:** the moment two orders contain the same product, its name is stored twice. Renaming the product means updating every `order_items` row — atomically and _simultaneously_, or the catalog becomes internally inconsistent.
- **Insert anomaly:** you cannot know a product's name unless some order has already referenced it.
- **Delete anomaly:** deleting the last order containing a product deletes the product's name and price from the database.

### BETTER APPROACH — split into `products` and `order_items`

As in the target schema:

```sql
CREATE TABLE products (
    product_id    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name  VARCHAR(100)  NOT NULL,
    current_price NUMERIC(10,2) NOT NULL CHECK (current_price >= 0)
);

CREATE TABLE order_items (
    order_id   INTEGER       NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
    product_id INTEGER       NOT NULL REFERENCES products (product_id),
    quantity   INTEGER       NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id)
);
```

`product_name` and `current_price` now live **once**, keyed by `product_id`. The `order_items` table keeps only facts that genuinely depend on the full composite key (`quantity`), plus the two key columns that ARE the relationship.

### The deliberate exception — the `unit_price` snapshot

Notice the target schema _did_ keep `order_items.unit_price`, even though price lives in `products`. Is that a 2NF violation? No:

- The FD `product_id → unit_price` still holds if we today's price. But the _business_ wants "price **at the moment of sale**", which is a fact about the _line_, not the product. `unit_price` is a genuine attribute of the `(order_id, product_id)` key because it is qualified by _time_ — it varies with each order.
- The 2NF question is about _what the column means_, not its name. If the column means "current catalog price," it's a partial dependency and must go to `products`. If it means "price this line was sold for," it belongs in `order_items`.

> This is the single most common normalization modeling mistake in e-commerce: **conflating "current price" with "sold-at price."** Both are legitimate; they are just different facts with different keys. The variant that stores the catalog price in the line table creates the update anomaly (changing the current price would retroactively lie about 3-year-old invoices, unless you _want_ that — in which case you've built the snapshot variant with the wrong name).

---

## Third Normal Form (3NF)

### What it says

Be in 2NF and have **no transitive dependency**: a non-prime column may not depend on any determinant that is not a superkey.

The textbook form: `A → B` and `B → C` (B not a superkey) implies `A → C`. The non-prime `C` is then redundant — one row per distinct B already knows C.

### BAD APPROACH — transitive dependency in `employees`

Grain: one row per employee.

```sql
CREATE TABLE employees (
    employee_id     INTEGER      PRIMARY KEY,
    employee_name   VARCHAR(100) NOT NULL,
    department_code VARCHAR(10)  NOT NULL,      -- employee_id -> department_code
    department_name VARCHAR(100) NOT NULL,      -- department_name depends on department_code, not on the employee!
    department_head VARCHAR(100) NOT NULL,
    salary          NUMERIC(12,2) NOT NULL
);
```

FDs: `employee_id → department_code → department_name, department_head`.

Update anomaly: rename a department → update every employee row in it, atomically. Insert anomaly: a brand-new empty department cannot exist until an employee joins it. Delete anomaly: firing the last employee of `R&D` deletes the fact that `R&D` has a head called "Alice".

### BETTER APPROACH — extract `departments`

```sql
CREATE TABLE departments (
    department_code VARCHAR(10)  PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    department_head VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
    employee_id     INTEGER       PRIMARY KEY,
    employee_name   VARCHAR(100)  NOT NULL,
    department_code VARCHAR(10)   NOT NULL REFERENCES departments (department_code),
    salary          NUMERIC(12,2) NOT NULL
);
```

`department_name` and `department_head` are now attached to the entity they describe. Renaming a department is **one `UPDATE departments`** statement. An empty department can exist. Firing the last employee no longer deletes the department. That is the whole payoff of 3NF.

### A second BAD example (products/categories) — with sample data

Grain: one row per product.

```sql
CREATE TABLE products_bad (
    product_id           INTEGER       PRIMARY KEY,
    product_name         VARCHAR(100)  NOT NULL,
    category_name        VARCHAR(50)   NOT NULL,   -- product_id -> category_name
    category_description VARCHAR(200)  NOT NULL    -- depends on category_name, not the product
);

INSERT INTO products_bad VALUES
  (1, 'Espresso Machine', 'Kitchen', 'Appliances and cookware'),
  (2, 'Kettle',           'Kitchen', 'Appliances and cookware'),
  (3, 'Desk Lamp',        'Lighting', 'Indoor illumination');
```

`'Appliances and cookware'` is duplicated for every Kitchen product. Checking all rows agree:

```sql
SELECT category_name, COUNT(DISTINCT category_description) AS desc_count
FROM   products_bad
GROUP  BY category_name;
```

Expected result:

| category_name | desc_count |
| ------------- | ---------- |
| Kitchen       | 1          |
| Lighting      | 1          |

Today it is consistent — but only by luck of the INSERT. Nothing stops `('Kitchen', 'cooking stuff')` from being added, and nothing makes the two update together. The design _permits_ the anomaly; the DBMS won't catch it.

BETTER (as in target schema): `categories(category_id, category_name, category_description)` + `products.product_id REFERENCES categories`. `category_description` is non-prime and depends only on `category_id`; `product_id → category_id` is a full, correct dependency; there is no column left that depends on a non-key.

### The 3NF checklist heuristic

For each non-prime column Y, ask: "other than the key, what set of columns determines Y?" If that set is not a superkey, decompose. This is the same mental move as 2NF, but now the determinant is arbitrary (not just part of the key).

---

## Boyce–Codd Normal Form (BCNF)

### What it says

For **every non-trivial FD** `X → Y`, the determinant `X` must be a **superkey**.

BCNF is _stricter_ than 3NF. 3NF has a loophole: an FD `X → Y` is allowed in 3NF if Y is a _prime_ attribute — even when X is not a superkey. BCNF closes the loophole. Because the exceptional case only arises with **overlapping candidate keys**, BCNF is almost always already satisfied by schemas designed as "one entity = one table."

### The classic missing example: 3NF satisfied, BCNF violated

Consider exam invigilation. Grain: one row per (student, subject) — each pair has one examiner, and each examiner covers exactly one subject.

```sql
CREATE TABLE exams_bad (
    student_id  INTEGER NOT NULL,
    subject     VARCHAR(30) NOT NULL,
    examiner_id INTEGER NOT NULL,
    PRIMARY KEY (student_id, subject),
    UNIQUE (student_id, examiner_id)   -- a student sees each examiner once
);
```

FDs:

- `(student_id, subject) → examiner_id` — from the PK.
- `examiner_id → subject` — each examiner covers exactly one subject.
- Candidate keys: `(student_id, subject)` **and** `(student_id, examiner_id)` (the second follows from `examiner_id → subject` + the PK).

Now the FD `examiner_id → subject`: `examiner_id` is **not a superkey** (one examiner appears in many rows). Is the schema 3NF? Yes — `subject` is a _prime attribute_ (it is part of candidate key `(student_id, subject)`), and 3NF allows the violation when Y is prime. Is it BCNF? No. Is it terrible? Somewhat: the same examiner-subject pair is repeated for every student who takes that subject; when examiner 7 switches from Math to Physics, every row with examiner 7 must be updated.

> Interview trap: because all three columns are prime here, there is **no** non-prime column, so insert/update/delete anomalies as taught for 3NF don't quite appear — but the _redundancy itself_ survived, which is exactly why BCNF exists. A 3NF table can still store the same fact twice. The sign: a non-superkey determinant.

### BETTER APPROACH — decompose

```sql
CREATE TABLE student_subject (
    student_id INTEGER      NOT NULL,
    subject    VARCHAR(30)  NOT NULL,
    PRIMARY KEY (student_id, subject)
);

CREATE TABLE examiners (
    examiner_id INTEGER      PRIMARY KEY,
    subject     VARCHAR(30)  NOT NULL
);
```

`examiner_id → subject` now lives where `examiner_id` IS the key. Testing for BCNF: enumerate every FD, confirm every determinant is a superkey. Done.

> The minimal abstract example (know it, interviews love it): relation `R(A, B, C)` with FDs `AB → C` and `C → B`. Candidate keys: `AB` and `AC`. All attributes are prime, so 3NF holds; `C → B` where C is not a superkey breaks BCNF. Decompose to `R1(A, C)` and `R2(C, B)` — lossless and dependency-preserving.

---

## Fourth and Fifth Normal Form (in brief)

Do not let these derail the section; they are the same philosophy applied to _multi-valued_ facts rather than single-valued columns.

**4NF**: removes **independent multi-valued dependencies**. If a table's key determines two sets of values that have nothing to do with each other, they must each become their own table.

Example, grain: one row per (employee, skill, language):

```sql
CREATE TABLE employee_skills_languages_bad (
    employee_id INTEGER NOT NULL,
    skill       VARCHAR(30) NOT NULL,
    language    VARCHAR(30) NOT NULL,
    PRIMARY KEY (employee_id, skill, language)
);
```

If an employee knows 3 languages and 2 skills, this table stores all `3 × 2 = 6` combinations even though skill and language are unrelated — every combination implies the others. The two multi-valued facts are **independent**, so the table is in BCNF but **not 4NF**. Split into:

```sql
CREATE TABLE employee_skills     (employee_id INTEGER NOT NULL REFERENCES employees   (employee_id), skill VARCHAR(30) NOT NULL, PRIMARY KEY (employee_id, skill));
CREATE TABLE employee_languages  (employee_id INTEGER NOT NULL REFERENCES employees   (employee_id), language VARCHAR(30) NOT NULL, PRIMARY KEY (employee_id, language));
```

Now 5 rows instead of 6, and adding a language touches one table. (Pragmatists: this is also the case where JSONB would honestly fit — "skills/languages are a document about the employee" — and 71 and 75 of this handbook discuss when rows vs blobs are right.)

**5NF**: handles **join dependencies** — a fact that can only be represented as a 3-way relationship where pairwise combinations are not enough. It matters for exotic many-to-many-to-many join tables and is essentially never a production decision; the practical warning is: **split carefully, because a careless decomposition that is not a lossless join reconstructs _false rows_** when you re-join. Verify with a full outer join / anti-join test in 8-DML-and-Sets.

---

## The full worked scenario — one bad table becomes good

Let's run the whole ladder on a single messy table so the progression is visible, end to end.

### STEP 0 — the unnormalized monster (grain: one row per order line)

```sql
CREATE TABLE mega_order (
    order_id          INTEGER,
    customer_name     VARCHAR(100),
    customer_phone    VARCHAR(30),
    product_name      VARCHAR(100),
    product_category  VARCHAR(50),
    product_price     NUMERIC(10,2),
    quantity          INTEGER,
    order_date        DATE,
    PRIMARY KEY (order_id, product_name)
);
```

Not even 1NF is the _goal_ here — this is worse: nothing is atomic (a "product_name" is a string, that's atomic, but the row mixes two entities), every non-key fact is partially or transitively dependent, and the wrong PK means two same products on one order collide.

Sample data:

```sql
INSERT INTO mega_order VALUES
  (1,'Ada','555-0100','Kettle','Kitchen',29.99,1,'2026-01-02'),
  (1,'Ada','555-0100','Mug','Kitchen',12.50,2,'2026-01-02'),
  (2,'Linus','555-0200','Mug','Kitchen',12.50,1,'2026-01-05'),
  (3,'Grace','555-0300','Desk Lamp','Lighting',45.00,1,'2026-01-05');
```

Inspect the damage:

```sql
SELECT customer_name, COUNT(*) AS rows_per_customer
FROM   mega_order
GROUP  BY customer_name;
```

Expected:

| customer_name | rows_per_customer |
| ------------- | ----------------- |
| Ada           | 2                 |
| Grace         | 1                 |
| Linus         | 1                 |

Update anomaly visible: `Ada`'s phone, `Mug`'s price, `Kitchen`'s meaning — each stored 2–3 times.

### STEP 1 — 1NF target outcome

The repeating thing here ("one customer repeated per line"; "one product repeated per order") is a repeating _group_ in disguise. 1NF is achieved by splitting into header and line tables — a **one-to-many** split (see 3-Joins for how to re-join):

```sql
CREATE TABLE orders_1nf (
    order_id        INTEGER PRIMARY KEY,
    customer_name   VARCHAR(100),
    customer_phone  VARCHAR(30),
    order_date      DATE
);

CREATE TABLE order_lines_1nf (
    order_id         INTEGER REFERENCES orders_1nf (order_id),
    product_name     VARCHAR(100),
    product_category VARCHAR(50),
    product_price    NUMERIC(10,2),
    quantity         INTEGER,
    PRIMARY KEY (order_id, product_name)
);
```

Now the rows are atomic and the repeating groups are gone; orders with no lines are representable (insert anomaly fixed at the header level).

### STEP 2 — 2NF outcome

`product_name`, `product_category`, `product_price` all depend only on `product_name` (part of the composite PK). Move them to `products`:

```sql
CREATE TABLE products_2nf (
    product_name     VARCHAR(100) PRIMARY KEY,
    product_category VARCHAR(50),
    product_price    NUMERIC(10,2)
);

CREATE TABLE order_lines_2nf (
    order_id    INTEGER  REFERENCES orders_1nf (order_id),
    product_name VARCHAR(100) REFERENCES products_2nf (product_name),
    quantity    INTEGER,
    PRIMARY KEY (order_id, product_name)
);
```

### STEP 3 — 3NF outcome

`product_category` is still transitively stored inside `products_2nf`? No — `product_name → product_category` is a genuine full-key dependency _now_, because category is a fact about the product. But _another_ fact, the category's own attributes (description, discount policy), would be transitive. And `customer` facts still lurk in `orders_1nf` (`customer_name → customer_phone`): phone depends on the customer, not the order → another transitive/partial mess. Decompose:

```sql
-- 3NF work: customers, orders, products, categories
```

which is exactly the **target schema** shown in "The SQL building blocks." The monster became five clean tables where every FD's determinant is a key.

### Rejoin sanity check

Reconstructing order 1's price comes straight from facts:

```sql
SELECT o.order_id,
       c.full_name,
       p.product_name,
       oi.quantity,
       pr.unit_price
FROM   orders o
JOIN   customers   c  ON c.customer_id  = o.customer_id
JOIN   order_items oi ON oi.order_id    = o.order_id
JOIN   products    p  ON p.product_id   = oi.product_id
JOIN   categories  ca ON ca.category_id = p.category_id;  -- only keeps FKs honest
```

Grain: one row per order line. Nothing here is double-counted because the join fan-out is exactly the real 1-to-many structure (5-Aggregation warns: the moment you also count `order_items` rows for _orders with multiple lines_, you're counting the join, not orders).

---

## When trying hard to "fix" a schema that is already fine is wrong

Normalization is a **decision about what a column means**, and the same column storage can be in-NF or not depending on your intent. Revisit these two:

| Column design                                                       | Meaning                                          | Verdict                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `order_items.unit_price` snapshot                                   | "price agreed at sale time" — a fact of the line | normalized (or at least _deliberate_)                                                                                                            |
| `order_items.unit_price` kept in sync with `products.current_price` | "current catalog price, denormalized for speed"  | denormalized by choice — see the denormalization section below                                                                                   |
| `employees.department_name`                                         | "the department this employee belongs to"        | redundant (3NF violation) unless you mean "the name of the department at hire time", a historical fact → then it needs its own meaning/timestamp |
| `customers.address_country_code`                                    | "country of the address"                         | depends on the address, not the customer; broken if a customer has several addresses                                                             |
| `customers.country_of_registration`                                 | "country stored at sign-up"                      | a real customer fact — perfectly fine in `customers`                                                                                             |

> Interview trap: "This table is not normalized because it has duplicate values." **Redundancy alone is not the test.** Every join-powered schema stores the same _key values_ in many places; without that, there is no relational model. Normalization removes redundancy of _dependent attributes_ — facts that vary with a non-key determinant — not the key values that define relationships. `order_items.order_id` appearing 5 times is not a normalization failure.

---

## NULL behavior in normalized schemas

NULL interacts with normalization in surprisingly sharp ways. The biggest ones:

### 1. NULL is not "a value," so FDs don't see it

The FD definition "same X ⇒ same Y" assumes every row _has_ an X and a Y. SQL NULLs break the premise: `NULL` is _unknown_, not a specific value, and `NULL = NULL` is UNKNOWN (2-NULL-and-Logic). Consequence:

- You can only _design_ FDs over columns you promise are `NOT NULL` for the facts involved. A nullable `email` column has "two customers with the same email" behavior that nothing can pin down — the UNIQUE constraint _will_ allow multiple NULLs on every major engine:

> PostgreSQL, MySQL, SQL Server, Oracle: all four treat NULLs as _distinct_ absent values, so `UNIQUE (email)` happily allows many rows with `email = NULL`. If NULL must mean "not yet known, but one day unique," you need a filtered/partial unique index (PostgreSQL: `CREATE UNIQUE INDEX ... WHERE email IS NOT NULL`) or a `CHECK` + a unique sentinel (`''`), schema decisions that differ per engine.

### 2. NULL foreign keys = optional relationships

`orders.customer_id INTEGER REFERENCES customers` (nullable) means "this order may belong to _no known_ customer" (e.g., a guest checkout). Inserts with NULL skip the referential check. That is a deliberate modeling choice: **nullable FK → optional relationship**, non-nullable FK → mandatory relationship. If the business rule says every order has a customer, declare `NOT NULL` — a nullable FK is 1NF-fine but _business-unenforced_.

### 3. Candidate keys cannot contain NULL

A `PRIMARY KEY` is non-nullable by definition in every engine. A _candidate_ key (say, a natural key you chose as `UNIQUE`) that is nullable is not really a key — a NULL value means the row cannot be identified. If a column is genuinely optional, it cannot be the sole identity of a row.

### 4. NULLs in the denormalized/bad schemas hide _which_ anomaly

In the CSV column example, a row `('Alice', NULL)` vs `('Alice','')` is two different promises about whether Alice has addresses. Normalization makes "having no addresses" _real_ as a state of the relationship (zero rows in `customer_addresses`), instead of a fragmented encoding inside a single nullable cell.

### 5. Aggregations mislead in denormalized tables you are about to "fix"

If you suspect a table is denormalized and want to prove redundancy, count carefully. `COUNT(*)` counts rows; `COUNT(DISTINCT x)` counts distinct values; NULLs are skipped by `COUNT(col)` but not by `COUNT(*)`. Redundant storage is not visible from row count alone — compare `COUNT(DISTINCT dependent_col)` against the size of the parent table.

---

## Common mistakes

1. **Believing "more tables = slower."** False as a law. Query speed depends on the execution plan, indexes, statistics, and cardinality — a normalized schema often yields _smaller_ rows, better cache locality, and indexes that are more selective. Verify each query with `EXPLAIN ANALYZE` (78-EXPLAIN-Execution-Plans). What normalization costs you is _joins_; what it buys you is _fewer writes and no anomaly repair code_.
2. **Fixing 2NF symptoms without checking the actual key.** 2NF is only meaningful with composite candidate keys; slapping a surrogate `id` on a table silently converts "partial dependency" questions.
3. **Declaring a UNIQUE constraint "because the data looks unique today."** See the FD disproof rule above. Constraints are business promises, not empirical observations.
4. **Forgetting PK/FK/UNIQUE/NOT NULL/CHECK entirely** — a "normalized-looking" schema with no constraints is a drawing, not a database. The engine enforces nothing; anomalies return with interest.
5. **Snapshot columns that silently masquerade as current columns** (the price problem). If you store `order_items.unit_price`, _name it like a snapshot_ and never let a trigger or app overwrite history from current catalog values.
6. **Splitting into too many tables** then re-joining on EVERY read. 3NF is not 6NF-by-hand; if the only reads are full-table "give me everything," the extra joins buy nothing (see denormalization below).
7. **Denormalizing reactively without measuring.** The canonical trap: "I'll store `ORDER_TOTAL` on the order to avoid a JOIN." Then a discount feature appears, or a promo, and now `order_total` must be updated "somewhere." The column drifts. Denormalize only when the optimizer + workload measurement tells you it pays, or make it computed and enforced from source facts.

> Production pitfall: **FK additions on large tables can block writes.** Adding a `FOREIGN KEY` (or `NOT NULL`, or `UNIQUE`) to a huge production table usually takes a table-level lock while it scans/validates, and implicitly builds indexes — under load on MySQL/InnoDB and SQL Server this means lock wait and potential blocking; PostgreSQL's `NOT VALID ... VALIDATE` and concurrent index builds exist exactly for this. Plan constraint adds as a migration, at low-traffic windows, and measure lock wait (cross-ref 88-Locks-and-Blocking). Do not `ALTER ... ADD CONSTRAINT ... UNIQUE` on a 200 GB table during peak hours.

---

## Performance implications

Honest performance claims only, tied to what a normalized schema _actually changes_:

- **Fewer bytes per row and per index** in each table → more rows per page → potentially fewer physical reads _when the query touches one table_. Not a guarantee; a guarantee would depend on the query and cardinality.
- **More joins.** Each normalized read that spans entities joins 2–5 tables. Join strategy (nested loop / hash / merge) is the optimizer's call; driven by stats, indexes, and shape (3-Joins, 78-EXPLAIN).
- **FK lookup cost on write paths.** Inserting into a child table validates the FK: an index on the child's FK column and a point lookup into the parent's PK. That's a small but real per-row cost; bulk loads notice it.
- **Index fan-out.** Every candidate key you declare builds an index; composite candidates build composite indexes. More constraints = more indexes to maintain on write (73-Composite-and-Covering-Indexes).
- **What normalization does NOT do:** it does not hand you an execution plan. Any claim about joins being "expensive" must be confirmed with `EXPLAIN (ANALYZE)`, not asserted.

The _strategic_ performance story is: normalized OLTP for correct writes; **denormalized/aggregated views for reads** — but at the _design_ level, via materialized views, summary tables, or a star schema fed by ETL, not by leaking denormalized columns into the transactional schema (until measurement says otherwise).

---

## When (and how) to denormalize — the honest guide

Denormalization is _storing redundancy deliberately_, accepting the update-anomaly cost in exchange for a cheaper read shape. It is a **trade, not a sin**. It should be decisioned, documented, and re-checked:

| Consider normalizing (keep 3NF/BCNF)                  | Consider denormalizing (with measurement)                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| OLTP writes are frequent and must be fast             | Reads dominate by orders of magnitude                                                        |
| Facts change and must never contradict                | Facts are immutable (event/audit data), so no drift is possible                              |
| Multiple writers, hard to coordinate in code          | One writer, carefully controlled code path                                                   |
| No measured evidence the join hurts                   | `EXPLAIN ANALYZE` shows a hot join / expensive aggregate repeated per query                  |
| Your next feature needs the same fact for new reasons | The denormalized column is read-only by contract and rebuilt by a scheduled/materialized job |

Patterns that let you have both (prefer these over hand-rolled duplicate columns):

1. **Materialized views** (PostgreSQL `MATERIALIZED VIEW`, Oracle, SQL Server indexed views, MySQL 8.0 is not yet there) — the _engine_ owns the redundancy and refreshes it.
2. **Summary/aggregate tables refreshed by ETL or batch** — denormalization lives away from the transactional tables.
3. **Star schema for reporting** — a dimensional model is denormalized _on purpose_; fact tables carry surrogate keys, dimension tables are the "denormalized" natural-key text. That's a different, deliberate modeling family (80-Backfills-and-SCD-style modeling), not accidental drift.
4. **Computed/generated columns** — SQL Server `PERSISTED`, PostgreSQL `GENERATED ALWAYS AS (...) STORED`, MySQL generated columns — let the engine recompute a "denormalized" value from source facts, and keep the fact normalized underneath.
5. **Snapshot columns** — legal denormalization with a _time_ qualifier; the moment you add "at this time," the column is no longer a duplicate of the current value (see unit_price above).

> Production pitfall: **denormalized counters drift silently.** Storing `customers.order_count` on the customer row, updated by the app at insert time, is the #1 source of invisible data corruption in e-commerce codebases: a refund path forgets to decrement, a retry double-increments. If you must denormalize a counter, derive it, compute it, or back it with a trigger you own in one place — and reconcile it periodically with `COUNT(*)` over the source of truth.

---

## Best practices

1. **State the grain of every table before writing it down** ("one row per order line"). The grain decides the key, and the key decides the normal forms.
2. **Enumerate the FDs from the business rules**, not from sample data. Enforce the important ones with constraints.
3. **Design the fully normalized target first**; only then ask "which read, measured, is harmed by the join?"
4. **One entity per table, one relationship per table.** That discipline naturally yields 3NF–4NF without running the algorithms.
5. **Choose keys deliberately**: natural keys (get them `NOT NULL` + `UNIQUE`) vs a surrogate `id` (stable, arbitrary, immune to business-value drift). Composite natural keys are fine but wide and slow to join; surrogate + `UNIQUE (natural_key)` is the common production compromise. (Cross-ref 90-related 72-Indexes-Basics for key-size effects; your key width is your index width.)
6. **Be explicit about snapshots** — name them (`unit_price`, `shipped_at`), and keep a documented invariant that they are _immutable historical_ values.
7. **Add FK columns and their indexes together**; verify with the plan that parent deletes use an index on the child.
8. **Test re-joins after any split** — a lossless decomposition must reconstruct every original fact exactly; anti-join `NOT IN`/`NOT EXISTS` checks and a union of both sides will expose lost or invented row pairs.
9. **Document the NF level per table** (a small header comment or schema doc: "3NF, snapshot column `unit_price` is deliberate"). Future readers will not re-derive your intent.
10. **Measure before denormalizing and after** — plan shape, latency percentiles, row counts — and keep the artifact (the query + its `EXPLAIN`) in the PR.

### The mental model

1. Normalization = _one fact, one owner row_. 1NF atomizes values, 2NF removes partial dependencies, 3NF removes transitive dependencies, BCNF closes the overlapping-key loophole, 4NF/5NF handle multi-valued/join facts.
2. It is expressed as constraints (PK/UNIQUE/FK/NOT NULL/CHECK); the engine enforces declarations, not intentions.
3. FDs come from business rules; NULLs make them unprovable, so design FDs over `NOT NULL` business facts.
4. Anomalies (insert/update/delete) are the _symptom_; redundancy of dependent attributes is the _disease_. Key-value repetition is not the disease.
5. 3NF/BCNF is the production sweet spot; denormalization is a measured, documented, rebuildable exception — never a default.

---

# Interview Questions

> Intentionally **no answers here** — practice them. Everything you need is in this section, plus 72-Indexes-Basics, 73-Composite-and-Covering-Indexes and 78-EXPLAIN-Execution-Plans for the performance-claim questions, and 2-NULL-and-Logic for anything involving NULLs.

## Beginner

1. Define normalization in one sentence. What is the single problem it solves?
2. Name the three anomalies and give one realistic example of each for a table that stores order lines with customer data.
3. What exactly is a functional dependency? Write `X → Y` in words and give a real-world example from `order_items`.
4. What is the difference between a superkey, a candidate key, and a primary key? Give an example where a table has two candidate keys.
5. What does 1NF require, and why is a comma-separated list inside one column a violation?
6. Is a table with a single-column primary key automatically in 2NF? Why or why not?
7. State the differences between `PRIMARY KEY` and `UNIQUE` in SQL.

## Intermediate

8. Explain 2NF using `order_items(order_id, product_id, quantity, product_name)`. Which column is a partial dependency and which normal form fixes it?
9. Explain 3NF using `employees(employee_id, name, department_code, department_name)`. Why is `department_name` a transitive dependency?
10. If a table is in 3NF, can it still have redundant data? Describe a table that does.
11. What is a "snapshot" column such as `order_items.unit_price`, and why is it _not_ automatically a normalization violation? What would make it a violation?
12. How does a nullable foreign key change the meaning of a relationship?
13. All four major engines allow multiple `NULL`s in a `UNIQUE` column. What does that imply about NULL as a "value" for identity?

## Advanced

14. Prove that the relation `R(A, B, C)` with FDs `AB → C` and `C → B` is in 3NF but not BCNF. What are both candidate keys? Decompose it losslessly.
15. Give a _real-world_ (non-abstract) table that satisfies 3NF but violates BCNF, explain which determinant breaks it, and show the decomposition.
16. Explain the difference between a partial dependency and a transitive dependency using the definitions of prime/non-prime attributes. Can a table with no composite candidate key have a partial dependency?
17. What is a multi-valued dependency, and when does it force a table to be split to reach 4NF? Give an employee example.
18. Define a lossless join. After decomposing a table, how would you prove in SQL that the reconstruction lost no facts and invented no rows?
19. How do `DEFERRABLE` constraints (PostgreSQL, Oracle) interact with circular foreign keys, and why do MySQL and SQL Server lack them?

## Scenario Based

20. A `products` table also contains `category_name` and `category_description`, and the app reads them via a JOIN on products for every catalog page. The catalog page is slow. Walk the decision: normalize vs denormalize vs materialized view, and what you would measure first.
21. An e-commerce site lets guests order without accounts, and `orders.customer_id` is nullable. Orders are then reported by customer. What is the correct modeling guidance, and what does the LEFT JOIN need to do with NULL customer rows?
22. Your invoice stores `unit_price` per line and `order_total` on the header. After a discount campaign, the two drift apart. Diagnose _why_ and design three fixes (computed column, trigger, materialized view), with trade-offs.
23. A company has "an employee may work in many departments; each department has one head." Model it. Where would the head live if you wanted every department head guaranteed exactly one employee, and how do NULLs complicate "headless" departments?
24. Design the normalized schema for: students, courses, and "each course has one lecturer; each lecturer may teach many courses." Then add "course grades are given by one lecturer only." Show the FDs and any BCNF decomposition required.

## Tricky

25. "Normalization always saves disk space." Defend or refute with both directions (surrogate keys vs repeated dependent attributes).
26. A column is "atomic" but stores JSON. Is the table 1NF? Build the interview-quality argument for both yes and no.
27. `UNIQUE(email)` allows three rows with `email = NULL`. Is that a candidate-key violation? What alternative enforcement makes NULL mean "not yet known but unique-if-present"?
28. Redundancy of key values is required for joins; redundancy of dependent attributes is not. Give a table where this distinction matters for an audit report.
29. Pure 5NF is rarely used, yet careless decompositions can invent rows on re-join. Construct a 3-way (join-dependency) example where a pairwise-split reconstruction creates a fact that never existed.

## Output Prediction

30. Table `products_bad(product_id, product_name, category_name)` with `category_description` — after an UPDATE changes one row's description, query "how many descriptions per category" shows 2. Predict the anomaly and the query output. (Write the GROUP BY.)
31. After converting `mega_order` to the 5-table target schema, predict the row count of `SELECT COUNT(DISTINCT order_id) FROM order_items` vs `SELECT COUNT(*) FROM orders` when an order has zero lines. Explain the difference.
32. Given `employees.manager_name` stored on every employee row, predict what happens to the employee-management query when a manager is transferred between departments. Which rows silently contradict?
33. `order_items` stores `quantity` and `unit_price`. What does `SELECT order_id, SUM(quantity*unit_price) FROM order_items GROUP BY order_id` return when the same product appears twice in one order — and why does your answer depend on the PK being `(order_id, product_id)` or `(order_id, line_no)`?

## Debugging

34. Production shows a product whose name differs between two order lines in the same `order_items` table. Give at least three possible root causes (schema, writes, joins) and how you'd confirm which.
35. A `LEFT JOIN` reports customers with zero orders missing, but `COUNT(*)` in a dashboard is suddenly inflated. Walk the likely schema mistake and the single `GROUP BY` change that would have caught it.
36. After splitting a table, a re-joined view returns _extra_ plausible-looking rows. Design an anti-join test to prove rows were invented by a non-lossless decomposition.
37. `ALTER TABLE … ADD CONSTRAINT customers_email_unique UNIQUE (email)` on a live table blocks writes for 20 seconds around midnight. Explain the lock mechanism and the per-engine mitigation (PostgreSQL `NOT VALID`/concurrent build, MySQL, SQL Server).
38. A nightly aggregation joins `orders` to `order_items` and double-counts revenue for multi-line orders. Explain exactly which join + aggregation shape does this, and show the corrected query.

## Performance

39. "Normalized schemas join more, so they're slower." Evaluate using: execution plan, indexes, cardinality, statistics. What measurement proves or disproves it for _your_ system?
40. Somebody proposes storing `order_total` on the header to avoid a SUM join per report. List the costs (write path, drift, multi-line correctness) and the alternatives that keep normalization while removing the repeated SUM.
41. Compare "denormalizing one column" vs "materialized view" vs "star schema" for a read-heavy sales report. Under what workload does each win, and what would you check in `EXPLAIN` to decide?
42. A fully normalized `customers/product/order` schema spends 40% of report time in joins that touch only two tables repeatedly. Which three candidate fixes would you weigh, and which single piece of evidence (plan, stats, index) decides?

---

_Cross-references: 2-NULL-and-Logic for `NULL` in `UNIQUE`, `NOT NULL`, and predicate semantics; 3-Joins for the one-to-many fan-out that normalized tables introduce on read; 5-Aggregation for why counting `order_items` rows overcounts orders; 8-DML-and-Sets for reconciling decomposed tables (`NOT IN`/anti-join lossless-join checks); 72-Indexes-Basics and 73-Composite-and-Covering-Indexes for key-width and FK-column indexing; 77-SARGability for why constraints and index shape decide the plan; 78-EXPLAIN-Execution-Plans for measuring every performance claim here; 86-ACID and 87-Isolation-Levels for how constraint/FK maintenance behaves inside transactions; 88-Locks-and-Blocking for why adding constraints to big tables can block; 84-Pagination-and-Keyset-Pagination for chunked backfill when migrating an unnormalized table._
