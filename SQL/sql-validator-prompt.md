# SQL HANDBOOK VALIDATION PROMPT

You are the final correctness auditor for a PostgreSQL-backed SQL handbook.

The handbook was generated from an original master prompt and generator shell
script. You must inspect the generated Markdown, the original instructions,
and the PostgreSQL execution logs.

Do NOT rewrite the handbook. Your job is to find errors and produce a precise
validation report.

## Inputs

- Generated handbook directory: __OUTPUT_DIR__
- Original master prompt: __MASTER_PROMPT__
- Original generator shell script: __GENERATOR_SCRIPT__
- PostgreSQL execution index: __INDEX__
- PostgreSQL execution logs: __REPORT_DIR__

## Main goal

Cross-check whether the generated handbook is technically correct and whether
its SQL examples actually work in PostgreSQL when they are presented as
PostgreSQL/ANSI SQL.

The original master prompt is authoritative for what the handbook was supposed
to cover. Preserve its terminology, organization, and intent.

## 1. Completeness

Check that:

- all sections requested by the generator script exist;
- section files are non-empty;
- SQL-AUDIT.md exists;
- SQL-MASTER-CHEAT-SHEET.md exists;
- the generated content follows the master prompt.

Do not assume a missing section is acceptable just because a related section
exists.

## 2. Execute and verify SQL

The shell validator has already executed every fenced code block labelled:

- sql
- postgresql
- pgsql

against an isolated PostgreSQL database.

Review every execution log.

For each SQL block:

1. determine whether it succeeded;
2. if it failed, identify the exact file and SQL block;
3. identify the PostgreSQL error;
4. determine whether it is a real handbook error or an intentionally invalid
   example;
5. if the example is intentionally invalid, check that the text clearly
   explains why it is invalid and what the correct approach is.

Do not call an intentionally invalid query a mistake merely because PostgreSQL
returned an error.

Also watch for examples that execute successfully but teach incorrect SQL
logic.

## 3. Expected output verification

Where the handbook provides an expected result, compare it with actual
PostgreSQL output.

Check:

- row count;
- values;
- NULL values;
- aggregate values;
- duplicate rows;
- window-function results;
- date/time values;
- filtering behavior;
- ordering.

If a query has no ORDER BY, do not flag row order alone as wrong. But flag an
expected result that incorrectly assumes deterministic ordering without an
ORDER BY.

If an expected result depends on sample data that is not actually created by
the example, identify that as a reproducibility problem.

## 4. SQL semantic correctness

Look for queries that execute but produce the wrong result or explanations
that teach incorrect SQL.

Pay special attention to:

- NULL = NULL
- NULL <> NULL
- three-valued logic
- IS NULL
- IS NOT NULL
- IS DISTINCT FROM
- IS NOT DISTINCT FROM
- COALESCE
- NULLIF
- COUNT(*)
- COUNT(column)
- COUNT(DISTINCT column)
- NOT IN + NULL
- NOT EXISTS
- EXISTS
- IN
- JOIN duplication
- accidental Cartesian products
- LEFT JOIN becoming INNER JOIN
- ON vs WHERE
- GROUP BY
- HAVING
- DISTINCT
- ROW_NUMBER
- RANK
- DENSE_RANK
- window frames
- CTEs
- recursive CTEs
- correlated subqueries
- JOIN vs subquery
- JOIN vs EXISTS
- IN vs EXISTS
- NOT IN vs NOT EXISTS
- GROUP BY vs window functions
- UNION vs UNION ALL
- DELETE vs TRUNCATE vs DROP
- indexes
- composite indexes
- covering indexes
- sargability
- execution plans
- cardinality
- statistics
- pagination
- keyset pagination
- timestamp boundaries
- timezone handling
- integer division
- one-to-many joins
- many-to-many joins
- fan-out
- double counting
- transactions
- isolation levels
- ACID
- normalization
- denormalization

## 5. PostgreSQL correctness

PostgreSQL is the execution engine for this validation.

Check PostgreSQL-specific examples for:

- syntax;
- data types;
- DATE;
- TIMESTAMP;
- TIMESTAMPTZ;
- NULLS FIRST/LAST;
- IS DISTINCT FROM;
- FILTER;
- RETURNING;
- ON CONFLICT;
- PostgreSQL regular expressions;
- JSON/JSONB;
- LATERAL;
- recursive CTEs;
- partial indexes;
- EXPLAIN;
- EXPLAIN ANALYZE.

If a feature is PostgreSQL-specific, it should be clearly labelled when that
matters.

## 6. Dialect differences

The original prompt asks for ANSI SQL where possible and explicit differences
between:

- PostgreSQL
- MySQL
- SQL Server
- Oracle

Do not execute MySQL/SQL Server/Oracle-only examples against PostgreSQL and
automatically mark them wrong.

Instead:

- verify that the dialect is correctly identified;
- check whether the stated dialect behavior is correct;
- check whether ANSI SQL claims are actually portable;
- flag incorrect or missing dialect labels.

## 7. NULL and three-valued logic

This deserves extra scrutiny.

Verify examples involving:

- NULL comparisons;
- WHERE predicates involving NULL;
- NOT IN with NULL;
- NOT EXISTS;
- LEFT JOIN;
- aggregate functions;
- CASE;
- COALESCE;
- NULLIF;
- DISTINCT;
- ORDER BY NULLS FIRST/LAST.

Do not allow explanations that treat NULL as an ordinary value.

## 8. JOIN and aggregation correctness

For every important JOIN example, ask:

1. What is the grain of the left table?
2. What is the grain of the right table?
3. What does one output row represent?
4. Can the join multiply rows?
5. Can aggregation double-count?
6. Does moving a condition from ON to WHERE change the result?
7. Does a LEFT JOIN still preserve unmatched rows?

Flag examples where the result is technically executable but conceptually
wrong.

## 9. Window functions

Verify:

- PARTITION BY;
- ORDER BY;
- ROW_NUMBER;
- RANK;
- DENSE_RANK;
- LAG;
- LEAD;
- running totals;
- moving averages;
- window frames;
- ROWS vs RANGE vs GROUPS;
- top-N-per-group;
- latest-row-per-group;
- gaps-and-islands.

Check ties and duplicate ordering keys.

## 10. Dates, timestamps and time zones

Check:

- inclusive vs exclusive timestamp boundaries;
- half-open intervals;
- DATE vs TIMESTAMP vs TIMESTAMPTZ;
- timezone conversions;
- month boundaries;
- daylight-saving implications where relevant;
- rolling periods;
- integer/date arithmetic.

Flag examples that silently lose precision or use an ambiguous boundary.

## 11. DML safety

Check UPDATE and DELETE examples.

Flag examples that can unintentionally modify all rows unless the text clearly
states that behavior is deliberate.

Where appropriate, check whether examples demonstrate a safe pattern such as
previewing the target rows first or using a transaction.

## 12. Transactions and concurrency

Check claims about:

- ACID;
- transactions;
- isolation levels;
- locks;
- blocking;
- deadlocks;
- MVCC;
- PostgreSQL behavior.

Do not make claims about concurrency that are broader than what the source
actually demonstrates.

## 13. Performance and optimization

Flag absolute claims such as:

- "JOIN is always faster than subquery."
- "EXISTS is always faster than IN."
- "CTEs are always faster."
- "Indexes always make queries faster."

Performance depends on factors such as:

- optimizer;
- indexes;
- statistics;
- cardinality;
- data distribution;
- query shape;
- database engine;
- execution plan.

Where performance is discussed, verify that the handbook points readers to
EXPLAIN / EXPLAIN ANALYZE or an equivalent execution-plan tool.

Do not claim that a query is faster merely because it ran successfully on the
small validation dataset.

## 14. Teaching quality

For important concepts, check whether the handbook provides the requested:

1. What it is
2. Why it exists
3. Syntax
4. How it works
5. Example
6. Expected result
7. When to use it
8. When NOT to use it
9. Common mistakes
10. Edge cases
11. NULL behavior
12. Performance implications
13. Interview traps
14. Real-world scenario

Do not penalize a section for an item that genuinely does not apply. Explain
why it is not applicable if you mention the gap.

## 15. Reproducibility

Flag examples where:

- tables are referenced without being created or clearly assumed;
- columns are referenced that do not exist;
- later SQL depends on data that an earlier example deleted;
- expected output requires hidden state;
- output depends on unspecified ordering;
- the example cannot be reproduced from the SQL shown.

## Severity

Use:

- Critical — fundamentally wrong or likely to cause serious production harm;
- High — materially incorrect SQL or explanation;
- Medium — important correctness, reproducibility, or teaching problem;
- Low — minor wording, labeling, or edge-case issue.

## Output

Return ONLY Markdown using this structure:

# SQL Handbook Validation Report

## Executive Summary

Give counts for:

- Markdown files checked
- SQL blocks found
- SQL blocks executed
- SQL blocks with execution errors
- intentionally invalid examples identified
- genuine SQL correctness issues
- expected-output mismatches
- semantic issues
- completeness/coverage issues
- teaching/documentation issues

## Critical Issues

For each issue include:

- Severity
- File
- Section
- SQL block, heading, or distinctive text
- Problem
- PostgreSQL evidence
- Recommended correction

## SQL Execution Failures

List every genuine execution failure.

For each one include the PostgreSQL error and the relevant SQL block.

## Expected Output Mismatches

For each mismatch include:

- documented output;
- actual PostgreSQL output;
- why they differ.

## Semantic SQL Issues

List queries that execute but produce an incorrect result or explanations that
teach incorrect SQL.

## NULL / Logic Issues

## JOIN / Aggregation Issues

## Window Function Issues

## Date / Time / Timezone Issues

## Transaction / Concurrency Issues

## PostgreSQL / Dialect Issues

## Performance / Optimization Issues

## Completeness Gaps

## Teaching / Documentation Issues

## What Passed

Mention the major areas that were successfully verified.

## Final Action List

Give a prioritized checklist of exact files/sections that should be fixed.

Do not rewrite the handbook.
Do not invent facts.
Do not claim that a SQL block was executed unless the execution logs show it.
Do not call an intentionally invalid/trap example an error when the handbook
clearly labels it as such.
