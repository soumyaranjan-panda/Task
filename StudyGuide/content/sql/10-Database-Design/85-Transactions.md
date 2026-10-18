# 85 — Transactions

## Table of Contents

1. [What Is a Transaction?](#1-what-is-a-transaction)
2. [Why Transactions Exist](#2-why-transactions-exist)
3. [ACID Properties](#3-acid-properties)
4. [Syntax](#4-syntax)
5. [Isolation Levels](#5-isolation-levels)
6. [Internal Working — Locks, MVCC, WAL](#6-internal-working--locks-mvcc-wal)
7. [Sample Tables](#7-sample-tables)
8. [Basic Examples](#8-basic-examples)
9. [Savepoints](#9-savepoints)
10. [Nested Transactions and Transaction Chains](#10-nested-transactions-and-transaction-chains)
11. [Autocommit Mode](#11-autocommit-mode)
12. [Read Phenomena and Isolation in Action](#12-read-phenomena-and-isolation-in-action)
13. [Edge Cases](#13-edge-cases)
14. [Common Mistakes](#14-common-mistakes)
15. [Production Pitfalls](#15-production-pitfalls)
16. [Performance Implications](#16-performance-implications)
17. [Transaction vs No-Transaction Comparison](#17-transaction-vs-no-transaction-comparison)
18. [Best Practices](#18-best-practices)
19. [Cross-References](#19-cross-references)
20. [Interview Questions](#20-interview-questions)

---

## 1. What Is a Transaction?

A **transaction** is a logical unit of work that contains one or more SQL statements. It has a beginning and an ending point. Either **all** statements in the transaction succeed, or **none** of them take effect.

> One row in the `orders` table represents one order. One transaction might insert that order row **and** its `order_items` rows together — all or nothing.

Think of a transaction like a bank transfer:

```
Step 1: Deduct $500 from Account A
Step 2: Credit $500 to Account B
```

If Step 1 succeeds but Step 2 fails, $500 vanishes. A transaction prevents this by making both steps atomic.

---

## 2. Why Transactions Exist

Without transactions, database operations face these problems:

| Problem                  | Description                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------- |
| **Partial failure**      | Some statements succeed, others fail, leaving data inconsistent                       |
| **Concurrent access**    | Multiple users read/write simultaneously, causing corruption                          |
| **Uncommitted reads**    | One session reads another session's not-yet-finalized changes                         |
| **Non-repeatable reads** | Reading the same row twice in one transaction yields different values                 |
| **Phantom reads**        | A query returns different rows when re-executed because another session inserted rows |

Transactions solve all of these through **atomicity**, **isolation**, and **durability**.

---

## 3. ACID Properties

ACID is an acronym for the four guarantees a transaction provides:

### 3.1 Atomicity

All statements in the transaction either **全部成功** or **全部回滚**. There is no partial completion.

```
BEGIN;
  INSERT INTO orders (customer_id, order_date, total) VALUES (1, CURRENT_DATE, 500);
  INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (currval('orders_id_seq'), 10, 2, 250);
COMMIT;
```

If the second INSERT fails, the first INSERT is also undone.

### 3.2 Consistency

A transaction brings the database from one **valid state** to another. All constraints (foreign keys, unique, NOT NULL, check constraints) must hold before and after the transaction.

If a transaction violates a constraint, it is rolled back entirely.

### 3.3 Isolation

Concurrent transactions do not interfere with each other. Each transaction appears to execute in isolation, as if it were the only transaction running.

The degree of isolation is controlled by the **isolation level**.

### 3.4 Durability

Once a transaction is **committed**, its effects are permanent — even if the system crashes immediately after. This is typically achieved through **Write-Ahead Logging (WAL)**.

```
┌─────────────────────────────────────────────────────────┐
│                     ACID Summary                        │
├──────────────┬──────────────────────────────────────────┤
│ Atomicity    │ All or nothing                           │
│ Consistency  │ Valid state before → valid state after   │
│ Isolation    │ Transactions don't see each other's      │
│              │ uncommitted work (degree varies)         │
│ Durability   │ Committed data survives crashes          │
└──────────────┴──────────────────────────────────────────┘
```

---

## 4. Syntax

### 4.1 Basic Transaction Control

```sql
-- Start a transaction
BEGIN;                       -- PostgreSQL, MySQL, SQLite
START TRANSACTION;           -- MySQL (alternative)
BEGIN TRANSACTION;           -- SQL Server (alternative)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- Can be combined

-- ... SQL statements ...

-- Make all changes permanent
COMMIT;

-- Undo all changes since BEGIN
ROLLBACK;
```

### 4.2 Database-Specific Notes

> **PostgreSQL**
> `BEGIN` starts a transaction block. All subsequent statements are part of this transaction until `COMMIT` or `ROLLBACK`.

> **MySQL (InnoDB)**
> `START TRANSACTION` or `BEGIN` disable autocommit until `COMMIT` or `ROLLBACK`. `SET autocommit = 0` disables autocommit for the entire session.

> **SQL Server**
> `BEGIN TRANSACTION` starts a transaction. Supports `COMMIT TRANSACTION` and `ROLLBACK TRANSACTION`. Also supports `SAVE TRANSACTION savepoint_name`.

> **Oracle**
> Oracle does not use explicit `BEGIN`/`COMMIT` in the traditional sense. Each SQL statement is implicitly a transaction. `COMMIT` is required to make changes permanent. `ROLLBACK` undoes the current transaction. `SAVEPOINT` is supported.

### 4.3 Transaction Characteristics

```sql
-- Set transaction properties (before any SQL in the transaction)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SET TRANSACTION READ WRITE;        -- or READ ONLY
SET TRANSACTION NAME 'monthly_report';
```

### 4.4 SAVEPOINT

```sql
BEGIN;
  INSERT INTO orders (customer_id, order_date, total) VALUES (1, CURRENT_DATE, 100);
  SAVEPOINT sp1;
  INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (currval('orders_id_seq'), 10, 2, 50);
  -- Oops, undo only the order_items insert
  ROLLBACK TO SAVEPOINT sp1;
  -- orders row still exists, order_items row is gone
  INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (currval('orders_id_seq'), 20, 1, 100);
COMMIT;
```

---

## 5. Isolation Levels

Isolation levels define the degree to which one transaction must be protected from interference by other concurrent transactions.

### 5.1 The Four Standard Isolation Levels

| Isolation Level      | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
| -------------------- | ---------- | ------------------- | ------------ | --------------------- |
| **READ UNCOMMITTED** | Possible   | Possible            | Possible     | Possible              |
| **READ COMMITTED**   | Prevented  | Possible            | Possible     | Possible              |
| **REPEATABLE READ**  | Prevented  | Prevented           | Possible\*   | Possible              |
| **SERIALIZABLE**     | Prevented  | Prevented           | Prevented    | Prevented             |

> \*In PostgreSQL, `REPEATABLE READ` actually prevents phantoms (it uses MVCC snapshots). In MySQL InnoDB, `REPEATABLE READ` also prevents phantoms via gap locking. In SQL Server, `REPEATABLE READ` does **not** prevent phantoms.

### 5.2 Setting Isolation Level

```sql
-- PostgreSQL
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- ... statements ...

-- MySQL
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- or for the entire session:
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- SQL Server
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
```

### 5.3 What Each Isolation Level Means

**READ UNCOMMITTED**

- Transactions can read uncommitted changes from other transactions (dirty reads).
- Basically no isolation. Rarely used in production.

**READ COMMITTED**

- A transaction can only read data that has been committed by other transactions.
- Prevents dirty reads. Default in PostgreSQL and SQL Server.
- Non-repeatable reads are possible: if you read the same row twice, another transaction might have updated and committed it between your reads.

**REPEATABLE READ**

- Guarantees that if you read a row, it will have the same value if you read it again within the same transaction.
- Prevents dirty reads and non-repeatable reads.
- Phantom reads are possible in SQL Server but not in PostgreSQL/MySQL (due to MVCC/gap locks).

**SERIALIZABLE**

- The strongest isolation level. Transactions appear to execute sequentially (one after another).
- Prevents all anomalies. Highest overhead.
- Uses predicate locking or serializable snapshot isolation.

### 5.4 Database-Specific Isolation Levels

> **PostgreSQL**
> Supports: `READ COMMITTED` (default), `REPEATABLE READ`, `SERIALIZABLE`.
> PostgreSQL does not support `READ UNCOMMITTED` — it behaves the same as `READ COMMITTED`.
> PostgreSQL's `SERIALIZABLE` uses Serializable Snapshot Isolation (SSI), which is lock-free but detects dangerous structures and aborts one transaction.

> **MySQL (InnoDB)**
> Supports: `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ` (default), `SERIALIZABLE`.
> `REPEATABLE READ` in InnoDB uses MVCC plus gap locking, preventing most phantoms.

> **SQL Server**
> Supports: `READ UNCOMMITTED`, `READ COMMITTED` (default), `REPEATABLE READ`, `SERIALIZABLE`, `SNAPSHOT`.
> `SNAPSHOT` isolation uses row versioning to provide a consistent view without locking.

> **Oracle**
> Supports: `READ COMMITTED` (default), `SERIALIZABLE`, `READ ONLY` (a variant of serializable).
> Oracle uses MVCC extensively.

---

## 6. Internal Working — Locks, MVCC, WAL

### 6.1 Locks

Locks prevent concurrent transactions from conflicting.

| Lock Type              | Description                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Shared (S) lock**    | Acquired during reads. Multiple transactions can hold S locks on the same row.                                                 |
| **Exclusive (X) lock** | Acquired during writes (INSERT, UPDATE, DELETE). Only one X lock per row.                                                      |
| **Row-level lock**     | Locks a single row. Used by most modern databases.                                                                             |
| **Page-level lock**    | Locks a data page (8KB in SQL Server).                                                                                         |
| **Table-level lock**   | Locks the entire table. Acquired during DDL, `LOCK TABLE`, or some bulk operations.                                            |
| **Intent lock**        | Indicates that a transaction intends to acquire locks at a lower level (row, page). Prevents conflicts with table-level locks. |
| **Gap lock**           | (MySQL InnoDB) Locks the gap between index records to prevent phantom inserts.                                                 |
| **Predicate lock**     | (PostgreSQL SERIALIZABLE) Locks based on a condition, not specific rows.                                                       |

```
Lock Compatibility Matrix (simplified):

        |  S lock  |  X lock  |
--------|----------|----------|
S lock  |  Yes     |  No      |
X lock  |  No      |  No      |
```

### 6.2 MVCC (Multi-Version Concurrency Control)

MVCC is the mechanism most modern databases use to allow readers and writers to coexist without blocking each other.

**How MVCC works (simplified):**

1. Each transaction gets a **snapshot** at the time it starts (or at the time of each statement, depending on isolation level).
2. When a row is updated, the old version is kept in a **version store** (also called undo log or version chain).
3. Readers see the snapshot — they never block writers.
4. Writers see the current committed data — they never block readers.
5. When no transaction needs the old version anymore, it is garbage-collected.

```
┌────────────────────────────────────────────────────────────┐
│                    MVCC Flow                              │
├────────────────────────────────────────────────────────────┤
│ Transaction A starts → snapshot at time T1                 │
│ Transaction B starts → snapshot at time T2                 │
│ Transaction B updates row X → old version preserved        │
│ Transaction A reads row X → sees version at T1             │
│ Transaction B commits → new version is committed           │
│ Transaction A reads row X → STILL sees version at T1       │
│ Transaction A ends → next transaction sees B's changes     │
└────────────────────────────────────────────────────────────┘
```

> **PostgreSQL** uses MVCC via tuple versioning. Old versions are stored in the same table page initially, then moved to an area called `pg_catalog` (the "heap"). Vacuuming reclaims space.

> **MySQL InnoDB** uses undo logs for MVCC. The undo log is a separate area.

> **SQL Server** uses `tempdb` for version store when `READ_COMMITTED_SNAPSHOT` or `ALLOW_SNAPSHOT_ISOLATION` is enabled.

> **Oracle** uses undo segments for MVCC.

### 6.3 Write-Ahead Logging (WAL)

WAL ensures durability. Before any change is written to the actual data files, the change is first written to a log.

```
Timeline:
1. Transaction modifies data in memory (buffer pool)
2. WAL record (redo log) is written to disk (fast sequential I/O)
3. Transaction is committed (COMMIT is fast — only WAL flush needed)
4. Later, the modified pages are written to the data files (checkpoint)
5. If crash occurs before step 4, WAL is replayed to recover
```

**Why WAL is fast:**

- Writing a log sequentially is much faster than writing random pages.
- Multiple changes to different pages can be batched into one log flush.
- The data file writes happen asynchronously.

---

## 7. Sample Tables

```sql
CREATE TABLE accounts (
    account_id   SERIAL PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL,
    balance      NUMERIC(12,2) NOT NULL DEFAULT 0,
    CHECK (balance >= 0)
);

CREATE TABLE transfers (
    transfer_id   SERIAL PRIMARY KEY,
    from_account  INT NOT NULL REFERENCES accounts(account_id),
    to_account    INT NOT NULL REFERENCES accounts(account_id),
    amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    transfer_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    log_id    SERIAL PRIMARY KEY,
    action    VARCHAR(50) NOT NULL,
    detail    TEXT,
    log_time  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO accounts (account_id, account_name, balance) VALUES
    (1, 'Alice',   1000.00),
    (2, 'Bob',      500.00),
    (3, 'Charlie', 2000.00),
    (4, 'Diana',    750.00);

-- Grain: One row in accounts = one bank account.
-- Grain: One row in transfers = one money transfer between two accounts.
-- Grain: One row in audit_log = one audit event.
```

**Current state of `accounts`:**

| account_id | account_name | balance |
| ---------- | ------------ | ------- |
| 1          | Alice        | 1000.00 |
| 2          | Bob          | 500.00  |
| 3          | Charlie      | 2000.00 |
| 4          | Diana        | 750.00  |

---

## 8. Basic Examples

### 8.1 Successful Transaction — Transfer Money

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100.00 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 100.00 WHERE account_id = 2;

INSERT INTO transfers (from_account, to_account, amount)
VALUES (1, 2, 100.00);

INSERT INTO audit_log (action, detail)
VALUES ('TRANSFER', 'Transferred $100 from Alice to Bob');

COMMIT;
```

**Result after COMMIT:**

| account_id | account_name | balance    |
| ---------- | ------------ | ---------- |
| 1          | Alice        | **900.00** |
| 2          | Bob          | **600.00** |
| 3          | Charlie      | 2000.00    |
| 4          | Diana        | 750.00     |

| transfer_id | from_account | to_account | amount |
| ----------- | ------------ | ---------- | ------ |
| 1           | 1            | 2          | 100.00 |

| log_id | action   | detail                             |
| ------ | -------- | ---------------------------------- |
| 1      | TRANSFER | Transferred $100 from Alice to Bob |

### 8.2 Failed Transaction — All Changes Rolled Back

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100.00 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 100.00 WHERE account_id = 2;

-- This violates a constraint or fails for some reason
INSERT INTO transfers (from_account, to_account, amount)
VALUES (1, 2, -50.00);  -- CHECK constraint fails: amount > 0

COMMIT;  -- Never reached — error occurs on INSERT
```

Because the INSERT fails, if the application handles the error and calls `ROLLBACK`:

```sql
ROLLBACK;
```

**Result:** No changes. Alice still has $1000.00, Bob still has $500.00. The UPDATE statements were undone.

### 8.3 BAD APPROACH — No Transaction

```sql
-- BAD: These are autocommit — each statement is its own transaction
UPDATE accounts SET balance = balance - 100.00 WHERE account_id = 1;
-- If the server crashes here, Alice lost $100 and Bob received nothing.
UPDATE accounts SET balance = balance + 100.00 WHERE account_id = 2;
```

> **Production pitfall:** In autocommit mode, each statement is an independent transaction. If the process dies between the two UPDATEs, the database is in an inconsistent state: Alice's money vanished.

### 8.4 BETTER APPROACH — Wrap in Transaction

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100.00 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 100.00 WHERE account_id = 2;
COMMIT;
```

If anything fails or the connection drops, the transaction is implicitly rolled back (by the database when it detects the disconnection).

---

## 9. Savepoints

Savepoints allow you to **partially roll back** within a transaction.

### 9.1 Basic Savepoint

```sql
BEGIN;

INSERT INTO accounts (account_name, balance) VALUES ('Eve', 300.00);
SAVEPOINT after_eve;

INSERT INTO accounts (account_name, balance) VALUES ('Frank', 200.00);
SAVEPOINT after_frank;

-- Oops, undo Frank but keep Eve
ROLLBACK TO SAVEPOINT after_frank;

-- Now continue with a corrected Frank
INSERT INTO accounts (account_name, balance) VALUES ('Frank', 250.00);

COMMIT;
```

**Result:**

| account_id | account_name | balance |
| ---------- | ------------ | ------- |
| ...        | ...          | ...     |
| 5          | Eve          | 300.00  |
| 6          | Frank        | 250.00  |

### 9.2 Savepoint with Error Handling (PostgreSQL PL/pgSQL)

```sql
DO $$
BEGIN
    INSERT INTO accounts (account_name, balance) VALUES ('Grace', 1000.00);

    SAVEPOINT sp_items;
    INSERT INTO transfers (from_account, to_account, amount)
    VALUES (1, currval('accounts_account_id_seq'), 50.00);

    -- If the above fails, we can recover
    EXCEPTION WHEN OTHERS THEN
        ROLLBACK TO SAVEPOINT sp_items;
        RAISE NOTICE 'Transfer insert failed, but account was created.';
END;
$$;
```

### 9.3 SAVEPOINT Behavior

| Action                          | Effect                                                           |
| ------------------------------- | ---------------------------------------------------------------- |
| `ROLLBACK TO SAVEPOINT sp_name` | Undoes everything after `sp_name`, but the transaction continues |
| `RELEASE SAVEPOINT sp_name`     | Destroys the savepoint (no undo), transaction continues          |
| `ROLLBACK`                      | Undoes the **entire** transaction (ignores all savepoints)       |

> **MySQL note:** MySQL supports `SAVEPOINT`, `ROLLBACK TO SAVEPOINT`, and `RELEASE SAVEPOINT` in InnoDB.

> **SQL Server note:** SQL Server supports `SAVE TRANSACTION savepoint_name` and `ROLLBACK TRANSACTION savepoint_name`.

---

## 10. Nested Transactions and Transaction Chains

### 10.1 True Nested Transactions

Most databases do **not** support true nested transactions. A `BEGIN` inside a transaction typically starts a **nested transaction block** whose outcome depends on the outer transaction.

> **PostgreSQL:** If you issue `BEGIN` inside a transaction, PostgreSQL will issue a **warning** (`WARNING: there is already a transaction in progress`) and the inner `BEGIN` is effectively ignored. You cannot commit or rollback independently.

> **SQL Server:** Supports nested transactions syntactically, but only the outermost `COMMIT` actually commits. Inner `COMMIT TRANSACTION` only releases the savepoint. `ROLLBACK` rolls back everything, including all nesting levels.

```sql
-- SQL Server: Nested transactions
BEGIN TRANSACTION outer_tx;
    INSERT INTO accounts (account_name, balance) VALUES ('Hank', 100.00);
    BEGIN TRANSACTION inner_tx;
        INSERT INTO accounts (account_name, balance) VALUES ('Iris', 200.00);
    COMMIT TRANSACTION inner_tx;  -- Does NOT actually commit to disk
-- If we ROLLBACK here, both inserts are undone
COMMIT TRANSACTION outer_tx;  -- NOW both inserts are committed
```

### 10.2 Transaction Chains

> **PostgreSQL:** Supports `COMMIT AND CHAIN` which commits the current transaction and immediately starts a new one with the same transaction characteristics.

```sql
-- PostgreSQL
BEGIN;
INSERT INTO accounts (account_name, balance) VALUES ('Jack', 100.00);
COMMIT AND CHAIN;
INSERT INTO accounts (account_name, balance) VALUES ('Karen', 200.00);
COMMIT;
```

---

## 11. Autocommit Mode

In autocommit mode, each individual SQL statement is implicitly wrapped in a transaction and committed immediately.

```sql
-- PostgreSQL: autocommit is ON by default
-- Each statement is its own transaction
INSERT INTO accounts (account_name, balance) VALUES ('Leo', 500.00);
-- This is automatically committed
```

To disable autocommit:

```sql
-- PostgreSQL
BEGIN;
-- Now multiple statements form one transaction
INSERT INTO accounts (account_name, balance) VALUES ('Mia', 300.00);
INSERT INTO accounts (account_name, balance) VALUES ('Noah', 400.00);
COMMIT;

-- MySQL
SET autocommit = 0;
INSERT INTO accounts (account_name, balance) VALUES ('Olivia', 250.00);
COMMIT;
SET autocommit = 1;  -- Re-enable

-- SQL Server: autocommit is the default connection mode
-- Use BEGIN to override
```

### Autocommit Behavior Comparison

| Database   | Default                       | How to start transaction                               |
| ---------- | ----------------------------- | ------------------------------------------------------ |
| PostgreSQL | Autocommit ON                 | `BEGIN`                                                |
| MySQL      | Autocommit ON                 | `BEGIN` or `START TRANSACTION` or `SET autocommit = 0` |
| SQL Server | Autocommit ON                 | `BEGIN TRANSACTION`                                    |
| Oracle     | Autocommit ON (per statement) | Implicit; `COMMIT`/`ROLLBACK` required                 |

---

## 12. Read Phenomena and Isolation in Action

### 12.1 Dirty Read

Transaction B reads data that Transaction A has modified but not yet committed. Transaction A then rolls back.

```
Time | Transaction A                    | Transaction B
-----|----------------------------------|----------------------------------
T1   | BEGIN;                           |
T2   | UPDATE accounts SET balance=999  |
T3   | WHERE account_id=1;              |
T4   |                                  | BEGIN;
T5   |                                  | SELECT balance FROM accounts
T6   |                                  | WHERE account_id=1;  → 999
T7   | ROLLBACK;  (balance back to 1000)|
T8   |                                  | -- Transaction B acted on
     |                                  |    stale/dirty data!
```

**Prevented by:** READ COMMITTED, REPEATABLE READ, SERIALIZABLE.

> **PostgreSQL:** Even `READ COMMITTED` prevents dirty reads because PostgreSQL's MVCC only exposes committed tuples.

### 12.2 Non-Repeatable Read

Transaction B reads the same row twice and gets different values because Transaction A committed an update in between.

```
Time | Transaction A                    | Transaction B
-----|----------------------------------|----------------------------------
T1   |                                  | BEGIN;
T2   |                                  | SELECT balance FROM accounts
T3   |                                  | WHERE account_id=1;  → 1000
T4   | BEGIN;                           |
T5   | UPDATE accounts SET balance=800  |
T6   | WHERE account_id=1;              |
T7   | COMMIT;                          |
T8   |                                  | SELECT balance FROM accounts
T9   |                                  | WHERE account_id=1;  → 800
     |                                  |  -- Different from T3!
```

**Prevented by:** REPEATABLE READ, SERIALIZABLE.

### 12.3 Phantom Read

Transaction B runs a query twice and gets different **sets** of rows because Transaction A inserted (or deleted) rows in between.

```
Time | Transaction A                    | Transaction B
-----|----------------------------------|----------------------------------
T1   |                                  | BEGIN;
T2   |                                  | SELECT COUNT(*) FROM accounts
T3   |                                  | WHERE balance > 500;  → 3
T4   | BEGIN;                           |
T5   | INSERT INTO accounts             |
T6   | (account_name, balance)          |
T7   | VALUES ('Phantom', 9999);        |
T8   | COMMIT;                          |
T9   |                                  | SELECT COUNT(*) FROM accounts
T10  |                                  | WHERE balance > 500;  → 4
     |                                  |  -- Different count!
```

**Prevented by:** SERIALIZABLE. In PostgreSQL and MySQL InnoDB, REPEATABLE READ also prevents phantoms.

### 12.4 Serialization Anomaly

Two transactions, each individually consistent, produce an inconsistent result when committed in a certain order.

```
Time | Transaction A                    | Transaction B
-----|----------------------------------|----------------------------------
T1   | BEGIN;                           | BEGIN;
T2   | SELECT SUM(balance) FROM         |
T3   | accounts;  → 4250                |
T4   |                                  | SELECT SUM(balance) FROM
T5   |                                  | accounts;  → 4250
T6   | UPDATE accounts SET balance =    |
T7   | balance + 100                    |
T8   | WHERE account_id = 1;            |
T9   | COMMIT;                          |
T10  |                                  | UPDATE accounts SET balance =
T11  |                                  | balance + 100
T12  |                                  | WHERE account_id = 2;
T13  |                                  | COMMIT;
```

If both transactions were based on `SUM(balance) = 4250` and applied business logic, the final state might not be what either expected. Only **SERIALIZABLE** detects and prevents this by aborting one transaction.

> **Interview trap:** "I checked the balance before updating — it was enough!" This is the classic **TOCTOU (Time-of-Check to Time-of-Use)** problem. The only correct solution is either serializable isolation or explicit locking (`SELECT ... FOR UPDATE`).

---

## 13. Edge Cases

### 13.1 Transaction Timeout / Idle Transaction

A transaction left open without being committed or rolled back holds locks and can cause blocking.

```sql
-- Session A: starts a transaction and walks away
BEGIN;
UPDATE accounts SET balance = 0 WHERE account_id = 1;
-- ... developer goes to lunch, connection is idle ...

-- Session B: tries to update the same row — BLOCKED
UPDATE accounts SET balance = 100 WHERE account_id = 1;
-- Session B waits (or times out depending on lock_timeout)
```

> **PostgreSQL:** Use `idle_in_transaction_session_timeout` to automatically kill idle transactions.
>
> ```sql
> SET idle_in_transaction_session_timeout = '5min';
> ```

> **SQL Server:** Use `SET LOCK_TIMEOUT` and monitor with `sys.dm_tran_session_transactions`.

### 13.2 ROLLBACK After COMMIT

```sql
BEGIN;
UPDATE accounts SET balance = 0 WHERE account_id = 1;
COMMIT;

ROLLBACK;  -- Error: no transaction in progress (PostgreSQL)
           -- In some contexts this is silently ignored
```

Once committed, a transaction cannot be rolled back. The undo is a **new** transaction that reverses the effect.

### 13.3 Implicit COMMIT on DDL

Some databases issue an **implicit COMMIT** when you run DDL (Data Definition Language) statements.

> **MySQL:** `ALTER TABLE`, `CREATE TABLE`, `DROP TABLE`, etc., all cause an implicit `COMMIT`. This means if you run DDL inside a transaction, everything before the DDL is committed and cannot be rolled back.

```sql
-- MySQL: DANGER
BEGIN;
UPDATE accounts SET balance = 0 WHERE account_id = 1;
ALTER TABLE accounts ADD COLUMN notes TEXT;  -- Implicit COMMIT!
-- The UPDATE is now permanent; you cannot ROLLBACK
```

> **PostgreSQL:** DDL is transactional. `ALTER TABLE`, `CREATE TABLE`, etc., can be rolled back.

> **Oracle:** DDL causes implicit COMMIT.

> **SQL Server:** DDL is transactional within a user transaction, but some DDL (like `CREATE DATABASE`) implicitly commits.

### 13.4 Error Handling and Transaction State

When an error occurs inside a transaction, the transaction enters an **aborted state**. In PostgreSQL, you must issue `ROLLBACK` before doing anything else.

```sql
BEGIN;
INSERT INTO accounts (account_name, balance) VALUES ('Bad', NULL);
-- ERROR: null value in column "balance" violates not-null constraint
-- Transaction is now aborted

INSERT INTO accounts (account_name, balance) VALUES ('Another', 100);
-- ERROR: current transaction is aborted, commands ignored until end of transaction block

ROLLBACK;  -- Must rollback first
```

### 13.5 Long-Running Transactions

Long-running transactions are dangerous because they:

- Hold locks that block other sessions
- Prevent vacuuming (in PostgreSQL), causing table bloat
- Accumulate WAL / undo logs
- May run out of transaction ID space (PostgreSQL: transaction ID wraparound)

> **Production pitfall:** In PostgreSQL, a long-running transaction prevents `VACUUM` from cleaning up dead tuples. This causes the table to grow unboundedly and can eventually lead to transaction ID wraparound, shutting down the database.

### 13.6 Distributed Transactions

When a transaction spans multiple databases (e.g., two different PostgreSQL servers), a two-phase commit (2PC) protocol is needed.

```sql
-- PostgreSQL 2PC
BEGIN;
-- ... operations ...
PREPARE TRANSACTION 'tx_12345';  -- Phase 1: prepare
-- Later:
COMMIT PREPARED 'tx_12345';     -- Phase 2: commit
-- Or:
ROLLBACK PREPARED 'tx_12345';   -- Phase 2: rollback
```

> **Performance implication:** 2PC adds significant overhead and latency. Prefer designing systems to avoid distributed transactions when possible (e.g., using the saga pattern).

---

## 14. Common Mistakes

### 14.1 Not Using a Transaction for Multi-Statement Operations

```sql
-- BAD: Autocommit, no explicit transaction
DELETE FROM order_items WHERE order_id = 100;
DELETE FROM orders WHERE order_id = 100;
-- If the second statement fails, order_items are deleted but order remains (orphan)
```

```sql
-- BETTER: Explicit transaction
BEGIN;
DELETE FROM order_items WHERE order_id = 100;
DELETE FROM orders WHERE order_id = 100;
COMMIT;
```

### 14.2 Assuming ROLLBACK Can Undo a COMMIT

```sql
BEGIN;
UPDATE accounts SET balance = 0 WHERE account_id = 1;
COMMIT;
-- Developer realizes mistake
ROLLBACK;  -- TOO LATE — cannot undo
-- Must issue a compensating UPDATE
```

### 14.3 Holding Transactions Across User Input

```sql
-- BAD: Transaction open while waiting for user interaction
BEGIN;
INSERT INTO orders (customer_id, order_date, total) VALUES (1, CURRENT_DATE, 0);
-- ... application shows a form and waits for user input ...
-- Meanwhile, locks are held, other sessions may be blocked
-- User goes to lunch, transaction stays open for hours
```

```sql
-- BETTER: Keep transactions short
-- Step 1: Insert order when user submits
BEGIN;
INSERT INTO orders (customer_id, order_date, total) VALUES (1, CURRENT_DATE, 0);
COMMIT;

-- Step 2: Insert items when user submits them (separate transaction)
BEGIN;
UPDATE orders SET total = 50.00 WHERE order_id = currval('orders_id_seq');
INSERT INTO order_items (...) VALUES (...);
COMMIT;
```

### 14.4 Mixing Isolation Levels Incorrectly

```sql
-- BAD: Setting isolation level AFTER statements in the transaction
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;  -- Too late for some databases
SELECT * FROM accounts WHERE balance > 500;  -- Ran at default isolation level

-- BETTER: Set isolation level at the start or before BEGIN
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
SELECT * FROM accounts WHERE balance > 500;
```

> **PostgreSQL:** The `SET TRANSACTION ISOLATION LEVEL` command must be the first statement in a transaction block.

### 14.5 Forgetting That NULL Propagates

```sql
BEGIN;
UPDATE accounts SET balance = NULL WHERE account_id = 1;
-- This violates the CHECK (balance >= 0) constraint!
-- Depending on the database, this might:
--   - Fail immediately (most databases)
--   - Succeed but cause the CHECK to evaluate to UNKNOWN
COMMIT;
```

### 14.6 Not Handling Errors in Application Code

```sql
-- BAD: Application does not handle transaction rollback
-- Pseudocode:
-- conn.execute("BEGIN")
-- conn.execute("INSERT INTO orders ...")
-- conn.execute("INSERT INTO order_items ...")  -- fails
-- conn.execute("COMMIT")  -- skipped due to exception
-- Transaction left hanging open!

-- BETTER: Use try/finally or equivalent
-- Pseudocode:
-- try:
--     conn.execute("BEGIN")
--     conn.execute("INSERT INTO orders ...")
--     conn.execute("INSERT INTO order_items ...")
--     conn.execute("COMMIT")
-- except:
--     conn.execute("ROLLBACK")
-- finally:
--     conn.close()
```

---

## 15. Production Pitfalls

### 15.1 Table Bloat from Long Transactions (PostgreSQL)

A long-running transaction pins the **oldest xmin** — the oldest transaction ID that any active transaction might need to see. `VACUUM` cannot remove dead tuples that are newer than this xmin.

```
Effect:
  Active transaction starts at T=1000
  1,000,000 updates occur (T=1001 to T=1001000)
  VACUUM cannot clean up any of them
  Table grows 1,000,000 dead tuples
  Disk fills up
  Performance degrades
```

**Mitigation:**

```sql
-- Kill idle transactions
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';

-- Auto-kill via configuration
ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min';
SELECT pg_reload_conf();
```

### 15.2 Deadlocks

Two (or more) transactions each hold a lock the other needs, creating a circular wait.

```
Transaction A:
  BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;  -- locks row 1
  UPDATE accounts SET balance = balance + 100 WHERE account_id = 2;  -- waits for row 2

Transaction B (concurrent):
  BEGIN;
  UPDATE accounts SET balance = balance - 50 WHERE account_id = 2;   -- locks row 2
  UPDATE accounts SET balance = balance + 50 WHERE account_id = 1;   -- waits for row 1

Result: Deadlock! One transaction is chosen as the victim and rolled back.
```

**Mitigation:**

1. **Always lock resources in the same order.**
2. **Keep transactions short.**
3. **Set a deadlock timeout.**

```sql
-- PostgreSQL
SET deadlock_timeout = '2s';  -- Detect deadlock quickly

-- SQL Server
SET DEADLOCK_PRIORITY LOW;  -- or NORMAL, HIGH

-- Check deadlock graph in SQL Server
-- Enable trace flag 1222 for logging
```

### 15.3 Lock Escalation (SQL Server)

When too many row-level locks are acquired, SQL Server may escalate them to a **table-level lock**, blocking all other sessions.

**Mitigation:** Keep transaction sizes manageable. Avoid locking millions of rows in one transaction.

### 15.4 Connection Pool Leaks

A connection with an uncommitted transaction returned to the connection pool can cause issues for the next user of that connection.

```sql
-- Connection pool resets autocommit but NOT the transaction state
-- in some configurations. The next user inherits a dirty transaction.

-- Fix: Always call RESET CONNECTION or use connection validation
```

> **Production pitfall:** This is one of the most common causes of mysterious blocking in production. Always ensure connection pool settings include transaction cleanup (`connectionValidationQuery`, `autoCommit`, etc.).

### 15.5 XID Wraparound (PostgreSQL)

Every row in PostgreSQL has a hidden `xmin` field (the transaction ID that created it). PostgreSQL uses 32-bit transaction IDs that wrap around after ~4.2 billion transactions. If `VACUUM` cannot run (due to a long transaction), the database will force a shutdown to prevent data loss.

```sql
-- Monitor wraparound risk
SELECT datname, age(datfrozenxoid)
FROM pg_database
ORDER BY age(datfrozenxoid) DESC;

-- Emergency: force vacuum
VACUUM FREEZE accounts;
```

---

## 16. Performance Implications

### 16.1 Transaction Size and Duration

| Factor                 | Impact                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Long transactions**  | Hold locks longer, block other sessions, prevent vacuuming, increase undo/redo log size |
| **Large transactions** | Consume more memory (buffer pool), generate more WAL, take longer to commit             |
| **Short transactions** | Less contention, better concurrency, smaller WAL, faster crash recovery                 |

> Performance depends on the workload, hardware, indexes, and database configuration. Verify with `EXPLAIN ANALYZE` and monitoring tools — do not assume.

### 16.2 Isolation Level Performance Cost

| Isolation Level  | Typical Overhead                                  |
| ---------------- | ------------------------------------------------- |
| READ UNCOMMITTED | Lowest (no shared locks for reads)                |
| READ COMMITTED   | Low (default, minimal locking)                    |
| REPEATABLE READ  | Moderate (snapshot retention, possibly gap locks) |
| SERIALIZABLE     | Highest (predicate locking, potential aborts)     |

> The actual performance difference depends heavily on:
>
> - **Concurrency** — how many transactions run simultaneously
> - **Contention** — how many transactions access the same rows
> - **Data distribution** — skewed vs uniform access patterns
> - **Workload type** — read-heavy vs write-heavy
> - **Database engine** — PostgreSQL SSI vs InnoDB gap locks vs SQL Server SNAPSHOT

### 16.3 Implicit Locking and SELECT FOR UPDATE

```sql
-- BAD: Read-then-write without locking (race condition)
BEGIN;
SELECT balance FROM accounts WHERE account_id = 1;  -- balance = 1000
-- Application logic: if balance >= 100, allow withdrawal
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
COMMIT;
-- Another transaction might have updated the same row between SELECT and UPDATE
```

```sql
-- BETTER: Lock the row during read
BEGIN;
SELECT balance FROM accounts WHERE account_id = 1 FOR UPDATE;  -- acquires X lock
-- Now no other transaction can modify this row until we commit/rollback
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
COMMIT;
```

### 16.4 Batch Operations

```sql
-- BAD: One giant transaction for 1 million inserts
BEGIN;
INSERT INTO audit_log (action, detail) VALUES ('event1', '...');
INSERT INTO audit_log (action, detail) VALUES ('event2', '...');
-- ... 1,000,000 more ...
COMMIT;
-- Large WAL, large undo log, long commit time, table bloat
```

```sql
-- BETTER: Batch into smaller transactions
-- (pseudocode: loop in application code)
BEGIN;
INSERT INTO audit_log (action, detail) VALUES ...;  -- 1000 rows
COMMIT;
BEGIN;
INSERT INTO audit_log (action, detail) VALUES ...;  -- 1000 rows
COMMIT;
-- Repeat
```

> **PostgreSQL:** Use `COPY` for bulk loading instead of individual INSERTs. It's dramatically faster.

### 16.5 Monitoring Transactions

```sql
-- PostgreSQL: Active transactions
SELECT pid, state, xact_start, query_start,
       NOW() - xact_start AS transaction_duration,
       query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY xact_start;

-- PostgreSQL: Lock monitoring
SELECT l.pid, l.mode, l.granted, a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;

-- SQL Server: Active transactions
SELECT session_id, transaction_id, transaction_begin_time,
       DATEDIFF(SECOND, transaction_begin_time, GETDATE()) AS seconds_open
FROM sys.dm_tran_active_transactions;

-- MySQL: InnoDB transaction status
SELECT * FROM information_schema.INNODB_TRX;
```

---

## 17. Transaction vs No-Transaction Comparison

| Scenario                                   | Without Transaction                                 | With Transaction                            |
| ------------------------------------------ | --------------------------------------------------- | ------------------------------------------- |
| Bank transfer (2 UPDATEs)                  | Money can vanish if process crashes between updates | Either both updates succeed or neither does |
| Order + Order Items (1 INSERT + N INSERTs) | Orphan order_items or incomplete order              | Consistent order with all items             |
| DELETE with foreign key cascade            | Partial delete possible if cascade fails            | All deletes succeed or all are rolled back  |
| Multi-table bulk update                    | Inconsistent state on partial failure               | Consistent state guaranteed                 |
| Importing CSV data                         | Some rows inserted, others not                      | All rows inserted or none                   |

---

## 18. Best Practices

1. **Keep transactions as short as possible.** Do not include user interaction, network calls, or file I/O inside a transaction.

2. **Always use explicit transactions** for multi-statement operations that must be atomic.

3. **Handle errors in application code.** Ensure `ROLLBACK` is called on exceptions (use try/finally patterns).

4. **Lock resources in a consistent order** across all code paths to prevent deadlocks.

5. **Use the lowest isolation level** that provides the correctness you need. Do not default to SERIALIZABLE unless necessary.

6. **Use `SELECT ... FOR UPDATE`** (or equivalent) when you need read-then-write correctness without SERIALIZABLE isolation.

7. **Avoid long-running transactions.** Set `idle_in_transaction_session_timeout` in PostgreSQL.

8. **Monitor active transactions** in production. Alert on transactions open for more than a few seconds.

9. **Test transaction behavior** under concurrent load, not just single-user scenarios.

10. **Be aware of DDL and implicit commits** in MySQL/Oracle — they can break atomicity.

11. **Use `EXPLAIN ANALYZE`** to verify that your queries within transactions are efficient, especially under the chosen isolation level.

12. **Understand your database's MVCC behavior** — dead tuples, vacuum, undo logs — to avoid production surprises.

---

## 19. Cross-References

- **[Normalization & Denormalization](#)** — Consistent state across normalized tables requires transactions
- **[Indexes](#)** — Indexes affect lock granularity and contention
- **[JOINs](#)** — Multi-table operations within a transaction must consider grain and fan-out
- **[DELETE vs TRUNCATE vs DROP](#)** — TRUNCATE is DDL and may behave differently in transactions
- **[Window Functions](#)** — Window functions operate within the transaction's snapshot
- **[NULL Behavior](#)** — NULL values inside transactions interact with constraints
- **[Query Optimization](#)** — Transaction isolation level affects execution plans (e.g., locking vs MVCC)

---

## 20. Interview Questions

### Beginner

1. What is a transaction? Why do we need it?

2. What does ACID stand for? Explain each property.

3. What is the difference between `COMMIT` and `ROLLBACK`?

4. What is autocommit? How do you disable it?

5. What is a dirty read?

### Intermediate

6. What is the difference between `READ COMMITTED` and `REPEATABLE READ`?

7. What is a savepoint? When would you use one?

8. What is a deadlock? How can you prevent it?

9. Why might a long-running transaction cause problems in PostgreSQL?

10. What is the difference between `ROLLBACK` and `ROLLBACK TO SAVEPOINT`?

### Advanced

11. Explain how MVCC works in PostgreSQL. How does it differ from SQL Server's approach?

12. What is a serialization anomaly? Give an example.

13. What is two-phase commit (2PC)? What are its drawbacks?

14. How does PostgreSQL's Serializable Snapshot Isolation (SSI) detect dangerous structures without traditional locking?

15. What is transaction ID wraparound, and how does it threaten PostgreSQL databases?

### Scenario Based

16. You have a transfer system: deduct from Account A, credit to Account B. Write the correct transaction, including error handling.

17. A batch job needs to update 5 million rows. Describe how you would structure the transaction(s). What trade-offs do you consider?

18. Two users simultaneously try to buy the last item in stock (quantity = 1). How do you prevent overselling?

19. You discover that `pg_stat_activity` shows a transaction that has been open for 3 hours. What steps do you take?

20. Your application has intermittent deadlocks in production. What is your investigation and resolution process?

### Tricky

21. If you run `BEGIN; ROLLBACK;` in PostgreSQL, what happens? What if you run `BEGIN; COMMIT;`?

22. In MySQL, if you run `BEGIN; UPDATE t SET x=1; ALTER TABLE t ADD COLUMN y INT; ROLLBACK;`, is the UPDATE rolled back?

23. You set `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;` in PostgreSQL after already running a SELECT in the same transaction. Does it take effect?

24. Can a `ROLLBACK TO SAVEPOINT` release locks in PostgreSQL? Which locks?

25. Two transactions both read a row. Transaction A updates and commits. Transaction B then tries to update the same row. What happens under READ COMMITTED vs REPEATABLE READ vs SERIALIZABLE?

### Output Prediction

26. Given this sequence, what is Alice's final balance?

```sql
-- Session 1
BEGIN;
UPDATE accounts SET balance = balance - 200 WHERE account_id = 1;

-- Session 2
BEGIN;
UPDATE accounts SET balance = balance + 500 WHERE account_id = 1;
-- What happens? Why?

-- Session 1
COMMIT;

-- Session 2
-- Session 2 sees what value of balance when it runs its UPDATE?
```

27. What does this return?

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT balance FROM accounts WHERE account_id = 1;
-- Returns 1000

-- Concurrent session:
UPDATE accounts SET balance = 0 WHERE account_id = 1;
COMMIT;

-- Back in first session:
SELECT balance FROM accounts WHERE account_id = 1;
-- Returns ? (and why)
```

### Debugging

28. A developer reports: "My application is getting `ERROR: deadlock detected`." What queries would you run to diagnose the problem? What would you look for?

29. Users report that sometimes data disappears. An audit shows that DELETE statements were run without WHERE clauses. How would you design a transaction-based solution to prevent this?

30. In production, `VACUUM` is not reclaiming space. You suspect a long-running transaction. How do you find and resolve the issue?

### Performance

31. You have a transaction that runs `SELECT`, then `UPDATE`, then `INSERT`. Under SERIALIZABLE isolation, you see frequent serialization failures. How do you optimize this?

32. Compare the performance characteristics of `SELECT ... FOR UPDATE` vs SERIALIZABLE isolation for a high-concurrency banking application. What would you choose and why?

33. A transaction that updates 10,000 rows takes 30 seconds. What strategies can you use to reduce the impact on other sessions?

34. Under what circumstances might switching from `REPEATABLE READ` to `READ COMMITTED` improve performance? When might it hurt correctness?

35. How does batch size affect transaction performance? What is the optimal batch size for bulk INSERTs in PostgreSQL vs MySQL?
