# Finance Problems — SQL Handbook

## Table of Contents

1. [Grain & Schema Fundamentals](#grain--schema-fundamentals)
2. [Core Financial Calculations](#core-financial-calculations)
3. [Running Balances & Cumulative Metrics](#running-balances--cumulative-metrics)
4. [Period-over-Period Comparisons](#period-over-period-comparisons)
5. [Interest & Amortization](#interest--amortization)
6. [Revenue Recognition](#revenue-recognition)
7. [Currency & Rounding](#currency--rounding)
8. [Anti-Fraud & Anomaly Detection](#anti-fraud--anomaly-detection)
9. [Timezone & Timestamp Boundaries](#timezone--timestamp-boundaries)
10. [Common Mistakes & Production Pitfalls](#common-mistakes--production-pitfalls)
11. [Interview Questions](#interview-questions)

---

## Grain & Schema Fundamentals

Every financial query must start with one question: **what does one row represent?**

| Table | Grain | One row = |
|---|---|---|
| `accounts` | One row per account | One bank account |
| `transactions` | One row per transaction | One debit or credit event |
| `payments` | One row per payment | One payment attempt |
| `loans` | One row per loan | One loan agreement |
| `loan_payments` | One row per installment | One scheduled payment on a loan |
| `trades` | One row per trade | One executed trade |
| `balances` | One row per account per period | End-of-period balance snapshot |
| `fx_rates` | One row per currency pair per date | One exchange rate observation |

> Common mistake: assuming a `LEFT JOIN` from `accounts` to `transactions` preserves account-level granularity. It does not — it produces one row per transaction per account, which can inflate aggregates.

### Sample Schema

```sql
CREATE TABLE accounts (
    account_id    INT PRIMARY KEY,
    customer_id   INT NOT NULL,
    account_type  VARCHAR(20),  -- 'checking','savings','credit','loan'
    opened_date   DATE,
    currency      CHAR(3),      -- ISO 4217
    status        VARCHAR(10)   -- 'active','closed','frozen'
);

CREATE TABLE transactions (
    transaction_id   INT PRIMARY KEY,
    account_id       INT REFERENCES accounts(account_id),
    transaction_date TIMESTAMP,
    amount           DECIMAL(15,2),  -- positive = credit, negative = debit
    category         VARCHAR(30),
    description      TEXT,
    is_reversal      BOOLEAN DEFAULT FALSE
);

CREATE TABLE loans (
    loan_id        INT PRIMARY KEY,
    account_id     INT REFERENCES accounts(account_id),
    principal      DECIMAL(15,2),
    annual_rate    DECIMAL(5,4),  -- e.g. 0.0525 = 5.25%
    term_months    INT,
    start_date     DATE,
    loan_status    VARCHAR(10)
);

CREATE TABLE loan_payments (
    payment_id     INT PRIMARY KEY,
    loan_id        INT REFERENCES loans(loan_id),
    payment_date   DATE,
    amount_paid    DECIMAL(15,2),
    principal_part DECIMAL(15,2),
    interest_part  DECIMAL(15,2),
    remaining_bal  DECIMAL(15,2)
);

CREATE TABLE fx_rates (
    rate_date  DATE,
    base_ccy   CHAR(3),
    quote_ccy  CHAR(3),
    rate       DECIMAL(18,8),
    PRIMARY KEY (rate_date, base_ccy, quote_ccy)
);
```

---

## Core Financial Calculations

### Balance per Account

```sql
SELECT
    account_id,
    SUM(amount) AS net_balance
FROM transactions
GROUP BY account_id;
```

**Why this can be wrong:** If `transactions` includes pending, reversed, or duplicate rows, the balance is inflated.

**Better approach:**

```sql
SELECT
    account_id,
    SUM(amount) AS net_balance
FROM transactions
WHERE is_reversal = FALSE
GROUP BY account_id;
```

> Production pitfall: Always filter reversals and voided transactions unless you have a specific reason not to. A single reversed transaction left in can silently double-count an amount.

### Income vs. Expense Separation

```sql
SELECT
    account_id,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS total_expenses,
    SUM(amount)                                       AS net_flow
FROM transactions
WHERE is_reversal = FALSE
GROUP BY account_id;
```

### Average Transaction Value

```sql
-- BAD: includes accounts with zero transactions if using LEFT JOIN
SELECT
    a.account_id,
    AVG(t.amount) AS avg_transaction
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.account_id
GROUP BY a.account_id;
-- Problem: AVG over a single NULL row returns NULL, which may mislead

-- BETTER: explicit filter
SELECT
    account_id,
    AVG(amount) AS avg_transaction,
    COUNT(*)    AS transaction_count
FROM transactions
WHERE is_reversal = FALSE
GROUP BY account_id;
```

### Percentile / Median of Transaction Amounts

PostgreSQL:

```sql
SELECT
    account_id,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) AS median_amount
FROM transactions
WHERE is_reversal = FALSE
GROUP BY account_id;
```

> MySQL: MySQL 8.0+ supports `PERCENTILE_CONT` via窗口函数语法, but not inside `WITHIN GROUP` in older versions. Use a workaround with `ROW_NUMBER`.

> SQL Server: Supports `PERCENTILE_CONT` and `PERCENTILE_DISC` with `WITHIN GROUP`.

---

## Running Balances & Cumulative Metrics

### Running Total of Transactions (Chronological)

```sql
SELECT
    transaction_id,
    account_id,
    transaction_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY account_id
        ORDER BY transaction_date, transaction_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance
FROM transactions
WHERE is_reversal = FALSE
ORDER BY account_id, transaction_date;
```

**Critical detail:** The `ORDER BY` inside the window must be deterministic. If two transactions share the same `transaction_date`, a tiebreaker (`transaction_id`) prevents non-deterministic row ordering. Without it, the running total may vary between executions.

### Cumulative Revenue by Month

```sql
WITH monthly_revenue AS (
    SELECT
        DATE_TRUNC('month', transaction_date) AS month,
        SUM(amount)                          AS revenue
    FROM transactions
    WHERE is_reversal = FALSE AND amount > 0
    GROUP BY DATE_TRUNC('month', transaction_date)
)
SELECT
    month,
    revenue,
    SUM(revenue) OVER (ORDER BY month) AS cumulative_revenue
FROM monthly_revenue
ORDER BY month;
```

### Cumulative Sum with Partition Reset

```sql
-- Running total that resets when account status changes
SELECT
    transaction_id,
    account_id,
    transaction_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY account_id
        ORDER BY transaction_date, transaction_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance
FROM transactions
WHERE is_reversal = FALSE;
```

If you need the running total to reset on specific conditions (e.g., monthly reset):

```sql
SELECT
    transaction_id,
    account_id,
    transaction_date,
    DATE_TRUNC('month', transaction_date) AS month_bucket,
    amount,
    SUM(amount) OVER (
        PARTITION BY account_id, DATE_TRUNC('month', transaction_date)
        ORDER BY transaction_date, transaction_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS monthly_running_balance
FROM transactions
WHERE is_reversal = FALSE;
```

> Common mistake: Using `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` instead of `ROWS`. `RANGE` includes all rows with the same ORDER BY value, which can produce unexpected jumps when timestamps are not unique.

---

## Period-over-Period Comparisons

### Month-over-Month Growth

```sql
WITH monthly AS (
    SELECT
        DATE_TRUNC('month', transaction_date) AS month,
        SUM(amount)                          AS revenue
    FROM transactions
    WHERE is_reversal = FALSE AND amount > 0
    GROUP BY DATE_TRUNC('month', transaction_date)
)
SELECT
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
    ROUND(
        (revenue - LAG(revenue) OVER (ORDER BY month))
        / NULLIF(LAG(revenue) OVER (ORDER BY month), 0) * 100,
        2
    ) AS mom_growth_pct
FROM monthly
ORDER BY month;
```

**NULL behavior:** `NULLIF(LAG(...), 0)` prevents division by zero. If the previous month had zero revenue, the growth percentage returns `NULL` instead of an error.

> Common mistake: forgetting `NULLIF` and getting `division by zero` errors when a period has zero revenue.

### Year-over-Year Same Month

```sql
WITH monthly AS (
    SELECT
        DATE_TRUNC('month', transaction_date) AS month,
        SUM(amount)                          AS revenue
    FROM transactions
    WHERE is_reversal = FALSE AND amount > 0
    GROUP BY DATE_TRUNC('month', transaction_date)
)
SELECT
    curr.month,
    curr.revenue                                    AS current_revenue,
    prev.revenue                                    AS last_year_revenue,
    ROUND(
        (curr.revenue - prev.revenue)
        / NULLIF(prev.revenue, 0) * 100,
        2
    )                                               AS yoy_growth_pct
FROM monthly curr
LEFT JOIN monthly prev
    ON prev.month = curr.month - INTERVAL '1 year'
ORDER BY curr.month;
```

### Rolling 3-Month Average

```sql
SELECT
    month,
    revenue,
    AVG(revenue) OVER (
        ORDER BY month
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS rolling_3m_avg
FROM monthly
ORDER BY month;
```

> Production pitfall: `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` requires at least 3 rows of history to produce a value. Earlier rows get partial averages. If you need exactly 3 months, use `COUNT(*)` alongside and filter.

---

## Interest & Amortization

### Simple Interest

```sql
-- Simple interest: I = P * r * t
-- P = principal, r = annual rate, t = time in years
SELECT
    loan_id,
    principal,
    annual_rate,
    start_date,
    CURRENT_DATE                                              AS today,
    EXTRACT(DAY FROM (CURRENT_DATE - start_date)) / 365.25   AS years_elapsed,
    ROUND(
        principal * annual_rate * EXTRACT(DAY FROM (CURRENT_DATE - start_date)) / 365.25,
        2
    ) AS accrued_interest
FROM loans
WHERE loan_status = 'active';
```

### Amortization Schedule (Recursive CTE)

```sql
WITH RECURSIVE amort AS (
    SELECT
        loan_id,
        principal,
        annual_rate,
        term_months,
        annual_rate / 12             AS monthly_rate,
        principal                    AS balance,
        1                            AS month_num,
        ROUND(
            principal * (annual_rate / 12)
            / (1 - POWER(1 + annual_rate / 12, -term_months)),
            2
        ) AS monthly_payment
    FROM loans
    WHERE loan_id = 1

    UNION ALL

    SELECT
        loan_id,
        principal,
        annual_rate,
        term_months,
        monthly_rate,
        ROUND(balance - (monthly_payment - ROUND(balance * monthly_rate, 2)), 2),
        month_num + 1,
        monthly_payment
    FROM amort
    WHERE month_num < term_months AND balance > 0
)
SELECT
    loan_id,
    month_num,
    monthly_payment,
    ROUND(balance * monthly_rate, 2)  AS interest_portion,
    ROUND(monthly_payment - ROUND(balance * monthly_rate, 2), 2) AS principal_portion,
    balance                           AS remaining_balance
FROM amort
ORDER BY loan_id, month_num;
```

**How it works:**
- Month 1: interest = principal × monthly rate; principal portion = payment − interest
- Each subsequent month: interest = remaining balance × monthly rate
- Balance decreases until it reaches zero at the final month

> Production pitfall: Recursive CTEs can hit recursion limits. PostgreSQL defaults to 100 iterations (`max_recursive_iterations`). For long-term loans (360 months), increase the limit:
> ```sql
> SET max_recursive_iterations = 400;
> ```

### Compound Interest (Annual Compounding)

```sql
SELECT
    loan_id,
    principal,
    annual_rate,
    term_months,
    ROUND(
        principal * POWER(1 + annual_rate, term_months / 12.0),
        2
    ) AS future_value
FROM loans;
```

---

## Revenue Recognition

### Recognizing Revenue Monthly (Straight-Line)

```sql
-- Given a contract with a start_date, end_date, and total_amount
-- Recognize revenue evenly across months

CREATE TABLE contracts (
    contract_id   INT PRIMARY KEY,
    customer_id   INT,
    start_date    DATE,
    end_date      DATE,
    total_amount  DECIMAL(15,2)
);

WITH months AS (
    SELECT
        contract_id,
        start_date,
        end_date,
        total_amount,
        generate_series(
            DATE_TRUNC('month', start_date),
            DATE_TRUNC('month', end_date),
            INTERVAL '1 month'
        ) AS month
    FROM contracts
),
month_bounds AS (
    SELECT
        contract_id,
        month,
        total_amount,
        -- Clamp start and end to contract boundaries
        GREATEST(month, start_date)                      AS actual_start,
        LEAST(month + INTERVAL '1 month' - INTERVAL '1 day', end_date) AS actual_end
    FROM months
)
SELECT
    contract_id,
    DATE_TRUNC('month', month)                            AS recognition_month,
    ROUND(
        total_amount
        * (actual_end - actual_start + 1)
        / (end_date - start_date + 1),
        2
    )                                                     AS recognized_revenue
FROM month_bounds
ORDER BY contract_id, recognition_month;
```

**Grain:** One row per contract per month = the revenue recognized in that month for that contract.

> Common mistake: Using integer division (`/`) for date differences. In PostgreSQL, `DATE - DATE` returns an integer (days), which is fine. But in SQL Server, `DATEDIFF(day, start, end)` also returns an integer. The issue arises when dividing integers in databases that truncate (e.g., SQL Server: `5/2 = 2`). Always cast to `DECIMAL` or `FLOAT`.

### Revenue by Customer with First/Last Purchase

```sql
SELECT
    customer_id,
    MIN(transaction_date)            AS first_purchase,
    MAX(transaction_date)            AS last_purchase,
    COUNT(*)                         AS total_transactions,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS lifetime_revenue,
    EXTRACT(DAY FROM MAX(transaction_date) - MIN(transaction_date)) AS customer_tenure_days
FROM transactions
WHERE is_reversal = FALSE
GROUP BY customer_id;
```

---

## Currency & Rounding

### Converting Between Currencies

```sql
SELECT
    t.transaction_id,
    t.account_id,
    t.amount                                        AS original_amount,
    a.currency                                      AS original_currency,
    fx.rate                                         AS exchange_rate,
    ROUND(t.amount * fx.rate, 2)                    AS amount_usd
FROM transactions t
JOIN accounts a ON a.account_id = t.account_id
LEFT JOIN fx_rates fx
    ON fx.rate_date = t.transaction_date::date
    AND fx.base_ccy = a.currency
    AND fx.quote_ccy = 'USD';
```

**NULL behavior:** If no exchange rate exists for a given date/currency pair, `amount_usd` returns `NULL`. This silently drops transactions from USD-denominated reports.

**Better approach:**

```sql
LEFT JOIN fx_rates fx
    ON fx.rate_date = (
        SELECT MAX(fx2.rate_date)
        FROM fx_rates fx2
        WHERE fx2.base_ccy = a.currency
          AND fx2.quote_ccy = 'USD'
          AND fx2.rate_date <= t.transaction_date::date
    )
    AND fx.base_ccy = a.currency
    AND fx.quote_cy = 'USD'
```

This uses the most recent available rate before the transaction date (common in FX handling).

> Production pitfall: Using `ROUND` at every intermediate step compounds rounding errors. Do rounding only at the final output. Intermediate calculations should use higher precision.

### Rounding Rules in Finance

```sql
-- Standard rounding
ROUND(amount, 2)

-- Banker's rounding (round half to even) — PostgreSQL default
SELECT ROUND(1.25::numeric, 1);  -- 1.2 (not 1.3)
SELECT ROUND(1.35::numeric, 1);  -- 1.4 (not 1.3)

-- Truncation (floor for positive, ceiling for negative)
TRUNC(amount, 2)

-- SQL Server: explicit rounding mode
SELECT ROUND(1.25, 1);  -- SQL Server default: round half away from zero = 1.3
```

> Common misconception: `ROUND` behaves identically across databases. It does not. PostgreSQL uses banker's rounding by default; SQL Server rounds half away from zero.

---

## Anti-Fraud & Anomaly Detection

### Duplicate Transactions (Same Amount, Same Second)

```sql
SELECT
    account_id,
    transaction_date,
    amount,
    COUNT(*) AS duplicate_count
FROM transactions
GROUP BY account_id, transaction_date, amount
HAVING COUNT(*) > 1;
```

### Transactions Outside Normal Hours

```sql
SELECT *
FROM transactions
WHERE EXTRACT(HOUR FROM transaction_date) NOT BETWEEN 6 AND 23
  AND ABS(amount) > 1000;
```

### Large Deviation from Account Average

```sql
WITH stats AS (
    SELECT
        account_id,
        AVG(amount)    AS avg_amount,
        STDDEV(amount) AS stddev_amount
    FROM transactions
    WHERE is_reversal = FALSE
    GROUP BY account_id
)
SELECT
    t.transaction_id,
    t.account_id,
    t.amount,
    s.avg_amount,
    s.stddev_amount,
    (t.amount - s.avg_amount) / NULLIF(s.stddev_amount, 0) AS z_score
FROM transactions t
JOIN stats s ON s.account_id = t.account_id
WHERE ABS((t.amount - s.avg_amount) / NULLIF(s.stddev_amount, 0)) > 3;
```

**NULL behavior:** `NULLIF(stddev_amount, 0)` handles accounts with only one transaction (stddev = 0). Without it, you get a division-by-zero error.

> Production pitfall: Z-score based anomaly detection assumes a roughly normal distribution. Financial transaction amounts are typically right-skewed. Consider using percentile-based thresholds or log-transformation in production.

### Velocity Check (Multiple Transactions in Short Window)

```sql
SELECT
    account_id,
    transaction_date,
    amount,
    COUNT(*) OVER (
        PARTITION BY account_id
        ORDER BY transaction_date
        RANGE BETWEEN INTERVAL '5 minutes' PRECEDING AND CURRENT ROW
    ) AS tx_count_last_5min
FROM transactions
WHERE is_reversal = FALSE
ORDER BY account_id, transaction_date;
```

---

## Timezone & Timestamp Boundaries

### Daily Cutoff at Midnight UTC

```sql
-- BAD: uses local timezone, may shift across DST boundaries
WHERE transaction_date::date = '2025-01-15'

-- BETTER: explicit UTC truncation
WHERE DATE_TRUNC('day', transaction_date AT TIME ZONE 'UTC') = '2025-01-15'
```

### Monthly Boundary Edge Case

```sql
-- January 31 transactions: which month?
-- Using DATE_TRUNC is safe:
SELECT DATE_TRUNC('month', '2025-01-31 23:59:59'::timestamp);
-- Returns: 2025-01-01 00:00:00

-- But using to_char or date arithmetic can misclassify:
-- Don't do this:
SELECT DATE_TRUNC('month', '2025-02-01 00:00:00'::timestamp - INTERVAL '1 second');
-- Returns: 2025-01-01 00:00:00 — correct, but fragile and hard to read
```

### Fiscal Year vs. Calendar Year

```sql
-- Fiscal year starting April 1
SELECT
    transaction_id,
    CASE
        WHEN transaction_date >= DATE_TRUNC('year', transaction_date) + INTERVAL '3 months'
        THEN EXTRACT(YEAR FROM transaction_date) + 1
        ELSE EXTRACT(YEAR FROM transaction_date)
    END AS fiscal_year
FROM transactions;
```

> Production pitfall: Financial systems in different countries have different fiscal year starts. Never hardcode month boundaries. Store fiscal year metadata in a separate table.

---

## Common Mistakes & Production Pitfalls

### 1. Integer Division Truncation

```sql
-- SQL Server: this truncates to integer
SELECT 5 / 2;  -- returns 2, not 2.5

-- Fix: cast to decimal
SELECT 5.0 / 2;  -- returns 2.5
SELECT CAST(5 AS DECIMAL) / 2;  -- returns 2.5

-- PostgreSQL: 5/2 returns 2 (integer division with integer inputs)
SELECT 5::numeric / 2;  -- returns 2.5
```

### 2. SUM of NULLs

```sql
-- If all amounts are NULL, SUM returns NULL (not 0)
SELECT SUM(amount) FROM transactions WHERE amount IS NULL;
-- Returns: NULL

-- Fix:
SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE amount IS NULL;
-- Returns: 0
```

### 3. COUNT(*) vs. COUNT(column)

```sql
-- COUNT(*) counts all rows (including NULLs)
SELECT COUNT(*) FROM transactions;
-- Returns: 1000

-- COUNT(column) excludes NULLs
SELECT COUNT(amount) FROM transactions;
-- Returns: 997 (if 3 rows have NULL amount)
```

### 4. LEFT JOIN Becoming INNER JOIN

```sql
-- BAD: WHERE clause after LEFT JOIN filters out NULLs from the right table
SELECT
    a.account_id,
    t.amount
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.account_id
WHERE t.amount > 0;
-- The WHERE t.amount > 0 turns this into an INNER JOIN

-- BETTER: move the condition into ON
SELECT
    a.account_id,
    t.amount
FROM accounts a
LEFT JOIN transactions t
    ON t.account_id = a.account_id
   AND t.amount > 0;
```

### 5. Cartesian Products on Financial Data

```sql
-- BAD: accidental cross join between accounts and payments
SELECT
    a.account_id,
    p.amount_paid
FROM accounts a, loan_payments p;
-- Returns: N × M rows (every account paired with every payment)

-- BETTER: explicit JOIN with condition
SELECT
    a.account_id,
    p.amount_paid
FROM accounts a
JOIN loans l ON l.account_id = a.account_id
JOIN loan_payments p ON p.loan_id = l.loan_id;
```

### 6. Double Counting with Fan-Out

```sql
-- If one order has multiple items and one customer has multiple orders:
-- BAD: this double-counts revenue
SELECT
    c.customer_id,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id;
-- If the JOIN creates duplicates (e.g., a payments JOIN), revenue is inflated

-- BETTER: aggregate at the right grain first
WITH order_totals AS (
    SELECT
        o.order_id,
        o.customer_id,
        SUM(oi.quantity * oi.unit_price) AS order_revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.order_id, o.customer_id
)
SELECT
    c.customer_id,
    SUM(ot.order_revenue) AS total_revenue
FROM customers c
JOIN order_totals ot ON ot.customer_id = c.customer_id
GROUP BY c.customer_id;
```

> Interview trap: A query joins `customers → orders → order_items → payments`. If one order has multiple payments, the join multiplies `order_items` rows. Aggregating `SUM(amount)` on the join result counts each item once per payment. The fix is to aggregate at the correct grain before joining.

### 7. NOT IN with NULLs

```sql
-- BAD: if excluded_ids contains any NULL, NOT IN returns zero rows
SELECT *
FROM accounts
WHERE account_id NOT IN (SELECT account_id FROM excluded_accounts);
-- If excluded_accounts has a NULL row, this returns NOTHING

-- BETTER: use NOT EXISTS
SELECT a.*
FROM accounts a
WHERE NOT EXISTS (
    SELECT 1 FROM excluded_accounts e WHERE e.account_id = a.account_id
);

-- Or use NOT IN with explicit NULL filter
SELECT *
FROM accounts
WHERE account_id NOT IN (
    SELECT account_id FROM excluded_accounts WHERE account_id IS NOT NULL
);
```

### 8. Using Floating Point for Money

```sql
-- BAD: floating point precision errors
SELECT (0.1 + 0.2)::float;
-- Returns: 0.30000000000000004

-- BETTER: use DECIMAL/NUMERIC
SELECT (0.1 + 0.2)::numeric;
-- Returns: 0.3

-- In PostgreSQL, prefer numeric for financial calculations
-- In MySQL, use DECIMAL(15,2) or similar
-- In SQL Server, use MONEY or DECIMAL (MONEY has its own rounding issues)
```

> Production pitfall: The `MONEY` type in SQL Server uses fixed precision internally but can produce unexpected results with large values. Prefer `DECIMAL(19,4)` or `DECIMAL(15,2)` for explicit control.

---

## Performance Implications

### Indexes for Financial Queries

```sql
-- Running balance queries benefit from:
CREATE INDEX idx_txn_account_date ON transactions(account_id, transaction_date);

-- Monthly aggregations benefit from:
CREATE INDEX idx_txn_date_amount ON transactions(transaction_date, amount)
    WHERE is_reversal = FALSE;  -- partial index (PostgreSQL)

-- FX lookups benefit from:
CREATE INDEX idx_fx_date_pair ON fx_rates(rate_date, base_ccy, quote_ccy);
```

> Common misconception: Indexes always make queries faster. A covering index on `(transaction_date, amount)` helps aggregation but adds overhead on `INSERT`/`UPDATE`. For write-heavy financial systems, monitor write latency.

### Window Functions Performance

Window functions with `ORDER BY` inside require sorting. For large datasets:

```sql
-- This sorts all rows per partition
SUM(amount) OVER (
    PARTITION BY account_id
    ORDER BY transaction_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)

-- Verify with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT
    account_id,
    transaction_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY account_id
        ORDER BY transaction_date, transaction_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance
FROM transactions;
```

Look for `WindowAgg` node with `Sort` in the execution plan. If sorting is expensive, consider pre-sorting with an index on `(account_id, transaction_date, transaction_id)`.

### Recursive CTEs for Amortization

Recursive CTEs can be slow for large numbers of loans. Alternatives:

- **Procedural approach:** Use a stored procedure with a loop (often faster in SQL Server)
- **Mathematical formula:** For fixed-rate loans, compute each row's values directly using the amortization formula (no recursion needed)

---

## Comparison Tables

### NULL Handling in Financial Contexts

| Expression | Result | When |
|---|---|---|
| `SUM(NULL, NULL, NULL)` | `NULL` | All values are NULL |
| `COALESCE(SUM(NULL), 0)` | `0` | Safe default |
| `AVG(1, 2, NULL)` | `1.5` | AVG ignores NULLs |
| `COUNT(NULL)` | `0` | COUNT(column) ignores NULLs |
| `COUNT(*)` | `3` | Counts all rows |
| `NULL = NULL` | `NULL` (not TRUE) | Three-valued logic |
| `NULL <> NULL` | `NULL` (not TRUE) | Three-valued logic |
| `NULL IS NULL` | `TRUE` | Use IS NULL |
| `1 + NULL` | `NULL` | NULL propagates in arithmetic |

### JOIN Behavior for Financial Reports

| Scenario | Risk | Mitigation |
|---|---|---|
| `orders JOIN payments` | Fan-out if 1:N | Aggregate payments first |
| `accounts LEFT JOIN transactions` | WHERE turns it INNER | Move filter to ON |
| `customers JOIN orders JOIN items` | Row multiplication | Aggregate at order level first |
| `accounts CROSS JOIN fx_rates` | Cartesian product | Always use explicit JOIN |
| `transactions JOIN transactions t2` | Self-join explosion | Carefully qualify conditions |

### Rounding Across Databases

| Database | `ROUND(1.25, 1)` | `ROUND(1.35, 1)` | Behavior |
|---|---|---|---|
| PostgreSQL | 1.2 | 1.4 | Banker's rounding (half to even) |
| SQL Server | 1.3 | 1.4 | Round half away from zero |
| MySQL | 1.3 | 1.4 | Round half away from zero |
| Oracle | 1.2 | 1.4 | Banker's rounding (default) |

---

## Interview Questions

### Beginner

1. Write a query to find the total balance (sum of all transaction amounts) for each account. How do you handle accounts with no transactions?

2. Write a query to find all accounts where the total credits (positive amounts) exceed the total debits (negative amounts). What is the grain of your result?

3. Write a query to calculate the average transaction amount per account for accounts that have at least 10 transactions. Why do you filter on count before averaging?

4. Explain the difference between `COUNT(*)` and `COUNT(amount)` in the context of a `transactions` table. Which one should you use for "number of transactions"?

5. Write a query to find the top 5 accounts by total transaction volume (absolute value of amount). Does `SUM(ABS(amount))` give you what you need?

### Intermediate

6. Write a query to produce a monthly revenue report with columns: `month`, `revenue`, `previous_month_revenue`, `month_over_month_growth_pct`. Handle the first month (no previous month) gracefully.

7. Write a query to find accounts that had transactions in every month of 2025. What approach would you use, and why might `COUNT(DISTINCT month) = 12` be insufficient?

8. Write a query to find the running balance for each account, ordered by transaction date. What happens when two transactions have the same timestamp? How do you ensure deterministic results?

9. Write a query to convert all transactions to USD using the `fx_rates` table. What happens when an exchange rate is missing? How do you handle this?

10. Write a query to find the 3-month rolling average of revenue by month. What happens in the first two months of data?

### Advanced

11. Write a recursive CTE to generate a full amortization schedule for a loan with a given principal, annual interest rate, and term in months. What are the columns in your output?

12. Write a query to detect potential duplicate transactions: same account, same amount, within 60 seconds of each other. How do you handle the case where a legitimate rapid sequence of identical transactions occurs?

13. Write a query to calculate the "Days Sales Outstanding" (DSO) for each customer: the average number of days between an order date and the payment date. What happens when a customer has orders with no matching payments?

14. Write a query to identify month-end closing anomalies: find months where the sum of transactions does not match the expected balance from the previous month's closing balance. What assumptions are you making?

15. Write a query to calculate the compound annual growth rate (CAGR) of revenue over a multi-year period. What happens if the starting year has zero revenue?

### Scenario Based

16. **Bank reconciliation:** You have two tables — `bank_statements` (bank's view of transactions) and `ledger_entries` (your system's view). Write a query to find discrepancies: transactions in one but not the other, or transactions with different amounts.

17. **Portfolio valuation:** You have `holdings` (account_id, stockticker, quantity) and `prices` (ticker, price_date, close_price). Write a query to calculate the total portfolio value for each account as of a given date. What if a price is missing for a holding?

18. **Revenue recognition:** You have `contracts` (contract_id, start_date, end_date, total_value). Write a query to recognize revenue monthly on a straight-line basis. Handle contracts that start or end mid-month.

19. **Cash flow analysis:** You have `transactions` with categories 'salary', 'rent', 'utilities', 'food', 'entertainment', 'investment', 'loan_payment'. Write a query to produce a cash flow statement: operating cash flow, investing cash flow, financing cash flow, net cash flow.

20. **Fraud detection:** Write a query to find accounts where: (a) the average transaction amount increased by more than 200% in the last 30 days compared to the previous 90 days, AND (b) the number of transactions in the last 30 days is at least double the daily average of the previous 90 days.

### Tricky

21. What is the result of:
```sql
SELECT SUM(amount) FROM transactions WHERE amount > 0 AND amount < 0;
```
Why? What is the correct way to find transactions between -100 and +100?

22. Given:
```sql
CREATE TABLE balances (account_id INT, balance DECIMAL(10,2));
INSERT INTO balances VALUES (1, NULL), (2, 100.00), (3, 200.00);
SELECT AVG(balance) FROM balances;
```
What is the result? What is `AVG` of `{NULL, 100, 200}`? How does this affect financial reporting?

23. Given:
```sql
SELECT account_id, SUM(amount)
FROM transactions
WHERE transaction_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY account_id
HAVING SUM(amount) > 1000;
```
If `transaction_date` is a `TIMESTAMP`, does `BETWEEN '2025-01-01' AND '2025-01-31'` include all of January? Why or why not?

24. What is wrong with:
```sql
SELECT
    account_id,
    amount / (SELECT SUM(amount) FROM transactions) * 100 AS pct_of_total
FROM transactions;
```
in terms of correctness, NULL handling, and performance?

25. Two analysts write different queries for "total revenue per customer." One uses `JOIN`, the other uses a correlated subquery. Both return different numbers for the same customer. Which is correct, and why might they differ?

### Output Prediction

26. What does this query return?
```sql
WITH RECURSIVE cte AS (
    SELECT 1 AS n, 100.00 AS balance
    UNION ALL
    SELECT n + 1, balance * 1.05
    FROM cte
    WHERE n < 3
)
SELECT * FROM cte;
```

27. What is the result of:
```sql
SELECT
    CASE
        WHEN NULL = NULL THEN 'equal'
        WHEN NULL <> NULL THEN 'not equal'
        ELSE 'unknown'
    END;
```

28. Given a `transactions` table with amounts `[100, -50, NULL, 200, -30]`, what is the result of:
```sql
SELECT
    SUM(amount) AS total,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS credits,
    SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS debits,
    SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END) AS non_negative_sum
FROM transactions;
```

29. What does `LAG(revenue, 1, 0) OVER (ORDER BY month)` do when applied to the first row? What about `LEAD(revenue, 1, 0) OVER (ORDER BY month)` on the last row?

30. Given the `amortization` recursive CTE above, if you change the base case to `WHERE balance > 0.01` instead of `WHERE month_num < term_months AND balance > 0`, what happens?

### Debugging

31. A financial report shows `revenue = $10,000,000` but the accounting team says it should be `$5,000,000`. The query joins `orders → order_items → payments`. What are three possible causes of the discrepancy?

32. A running balance query occasionally shows negative balances for accounts that should never go negative. The query uses `SUM(amount) OVER (PARTITION BY account_id ORDER BY transaction_date)`. What could cause this?

33. A monthly report shows January revenue as `$0` but individual transactions in January total `$50,000`. The query filters `WHERE transaction_date >= '2025-01-01' AND transaction_date <= '2025-01-31'`. The `transaction_date` column is `TIMESTAMP WITH TIME ZONE` and the database is in `America/New_York`. What is the issue?

34. A recursive CTE for amortization returns only 100 rows for a 360-month mortgage. The query structure is correct. What is the likely cause and fix?

35. A currency conversion query returns `NULL` for USD transactions. The join is `LEFT JOIN fx_rates ON fx.base_ccy = a.currency AND fx.quote_ccy = 'USD'`. The `fx_rates` table contains entries for `('USD', 'USD', 1.0)`. Why does the query still return NULL?

### Performance

36. A running balance query on a table with 50 million transactions takes 45 minutes. The query uses `SUM(amount) OVER (PARTITION BY account_id ORDER BY transaction_date)`. The execution plan shows a `Sort` node with high cost. What index would help, and what should you verify in the execution plan?

37. A monthly aggregation query scans the entire `transactions` table even though the user only needs data for 2025. The table has a composite index on `(transaction_date, amount)`. Why might the query still be slow, and what can you do?

38. A recursive CTE for amortization schedules is hitting the recursion limit for 30-year mortgages (360 months). The database is PostgreSQL. How do you fix this, and what should you watch for?

39. A query joining `accounts` (1M rows) to `transactions` (100M rows) to produce daily balances is extremely slow. The join is on `account_id` and filters by `transaction_date`. Suggest a composite index strategy and explain why.

40. A query using `NOT IN (SELECT account_id FROM excluded_accounts)` returns zero rows even though the main table has millions of rows. The `excluded_accounts` table has 10,000 rows including one `NULL`. The query runs slowly before returning empty. Why is it slow AND why does it return zero rows? What is the fix?

---

*This section covers financial SQL patterns. For related concepts, see: [Window Functions](../08-Window-Functions), [Recursive CTEs](../07-CTEs), [NULL Handling](../03-NULL-and-Three-Valued-Logic), [JOIN pitfalls](../05-Joins-and-Relationships), [Index design](../11-Performance-and-Optimization).*
