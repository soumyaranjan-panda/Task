#!/bin/bash
set -o pipefail

# ============================================================
# SQL MASTER HANDBOOK GENERATOR
# ============================================================

OUTPUT_DIR="./sql-handbook"
PROMPT_FILE="./sql-master-prompt.md"

# Keep this low if you have limited API/agent capacity.
# Increase to 2-4 if your OpenCode setup can handle parallel agents.
MAX_JOBS=1

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

log_section() {
    echo ""
    echo "==============================================================="
    echo "  $1"
    echo "==============================================================="
}

# ============================================================
# MASTER PROMPT
# ============================================================

cat > "$PROMPT_FILE" <<'EOF'
# SQL MASTER HANDBOOK — GLOBAL INSTRUCTIONS

You are contributing to a comprehensive SQL handbook.

The handbook is intended for:

- SQL beginners
- Backend developers
- Software engineers
- Data analysts
- Interview preparation
- LeetCode / HackerRank / StrataScratch
- Production SQL
- Query optimization
- Database design

Use simple language but explain concepts deeply.

Do NOT give shallow explanations.

Every important concept should explain:

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

Use Markdown.

Use SQL code blocks.

Use tables when comparisons help.

Use Mermaid diagrams when they genuinely improve understanding.

Prefer ANSI SQL.

When behavior differs between PostgreSQL, MySQL, SQL Server, and Oracle, explicitly mention the difference.

Do not make absolute performance claims such as:

"JOIN is always faster than subquery."

"EXISTS is always faster than IN."

"CTEs are always faster."

"Indexes always make queries faster."

Instead explain that performance depends on:

- optimizer
- indexes
- statistics
- cardinality
- data distribution
- query shape
- database engine
- execution plan

Whenever optimization is discussed, emphasize EXPLAIN / EXPLAIN ANALYZE or the equivalent execution-plan tool.

---

## VERY IMPORTANT SQL CONCEPTS

Do not miss:

- NULL
- Three-valued logic
- NULL = NULL
- NULL <> NULL
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
- Window functions
- ROW_NUMBER
- RANK
- DENSE_RANK
- CTE
- Recursive CTE
- correlated subquery
- non-correlated subquery
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
- query optimization
- timestamp boundaries
- timezone issues
- integer division
- duplicate rows
- one-to-many joins
- many-to-many joins
- fan-out
- double counting
- pagination
- keyset pagination
- transactions
- isolation levels
- ACID
- normalization
- denormalization

---

## SCENARIO-BASED TEACHING

Whenever possible, use realistic tables such as:

employees
departments
customers
orders
order_items
products
payments
users
logins
transactions
events

Always clearly state the grain of the table.

Example:

"One row in orders represents one order."

This is extremely important for preventing JOIN and aggregation mistakes.

---

## SQL REASONING

Teach the reader to ask:

1. What does one output row represent?
2. What is the grain of each table?
3. Which table is the driving table?
4. Do I need columns from another table?
5. Do I only need to know whether a row exists?
6. Can the JOIN create duplicates?
7. Do I need aggregation?
8. Do I need to preserve individual rows?
9. Do I need a window function?
10. Can NULL affect the result?
11. Do I need WHERE or HAVING?
12. Should a condition go inside ON or WHERE?
13. Could the query accidentally create a Cartesian product?
14. What happens when there are zero matching rows?
15. What happens when there are multiple matching rows?
16. What indexes might help?
17. What does the execution plan say?

---

## QUALITY REQUIREMENTS

Do not repeat huge explanations unnecessarily.

Cross-reference related concepts instead.

Do not assume the reader already knows database internals.

Do not hide important caveats.

If there is a common misconception, explicitly label it:

> Common misconception

If there is a common interview trap, label it:

> Interview trap

If there is a production danger, label it:

> Production pitfall

If something is database-specific, label it:

> PostgreSQL
> MySQL
> SQL Server
> Oracle

---

## IMPORTANT

Generate ONLY the requested section.

Do not generate another section merely because it is related.

However, briefly mention cross-references to other sections where useful.

Return ONLY Markdown.
EOF


# ============================================================
# AGENT FUNCTION
# ============================================================

run_agent() {

    SECTION="$1"
    CATEGORY="$2"
    FILE="$OUTPUT_DIR/$CATEGORY/$SECTION.md"

    mkdir -p "$OUTPUT_DIR/$CATEGORY"

    # Skip existing non-empty files
    if [ -s "$FILE" ]; then
        log "SKIPPED: $SECTION (already exists)"
        return
    fi

    while (( $(jobs -rp | wc -l) >= MAX_JOBS )); do
        sleep 1
    done

    log "Starting: $CATEGORY/$SECTION"

    (
        MASTER_PROMPT="$(cat "$PROMPT_FILE")"

        opencode run \
"
$MASTER_PROMPT

============================================================
CURRENT HANDBOOK SECTION
============================================================

Category:
$CATEGORY

Section:
$SECTION

============================================================

Generate ONLY this section.

Make it comprehensive.

Include:

- Fundamentals
- Internal working where relevant
- Syntax
- Examples
- Sample tables
- Expected output
- Scenario-based examples
- Edge cases
- NULL behavior where relevant
- Common mistakes
- Production pitfalls
- Performance implications
- Interview traps
- Comparison tables
- Best practices

For SQL examples, use realistic data.

Whenever appropriate, show:

BAD APPROACH

then:

BETTER APPROACH

and explain why.

For performance-related claims, do not guess.
Explain what should be verified using an execution plan.

At the end include:

# Interview Questions

Include:

- Beginner
- Intermediate
- Advanced
- Scenario Based
- Tricky
- Output Prediction
- Debugging
- Performance

Do not answer the questions immediately if they are intended as practice.

Return ONLY Markdown.
" > "$FILE" 2>>"$OUTPUT_DIR/errors.log"

        STATUS=$?

        if [ $STATUS -eq 0 ] && [ -s "$FILE" ]; then
            log "DONE:    $CATEGORY/$SECTION"
        else
            log "FAILED:  $CATEGORY/$SECTION"
        fi
    ) &

}


# ============================================================
# 1. FUNDAMENTALS
# ============================================================

log_section "1/12 — SQL Fundamentals"

run_agent "01-SQL-Basics" "1-Fundamentals"
run_agent "02-Data-Types" "1-Fundamentals"
run_agent "03-DDL-DML-DQL-DCL-TCL" "1-Fundamentals"
run_agent "04-Constraints-Keys" "1-Fundamentals"
run_agent "05-SELECT-FROM-WHERE" "1-Fundamentals"
run_agent "06-Logical-Query-Processing-Order" "1-Fundamentals"
run_agent "07-Filtering-Operators" "1-Fundamentals"
run_agent "08-CASE-Expressions" "1-Fundamentals"


# ============================================================
# 2. NULL + LOGIC
# ============================================================

log_section "2/12 — NULL & Three-Valued Logic"

run_agent "09-NULL-Deep-Dive" "2-NULL-and-Logic"
run_agent "10-Three-Valued-Logic" "2-NULL-and-Logic"
run_agent "11-NULL-Comparisons" "2-NULL-and-Logic"
run_agent "12-COALESCE-NULLIF" "2-NULL-and-Logic"
run_agent "13-IS-DISTINCT-FROM" "2-NULL-and-Logic"
run_agent "14-NOT-IN-NULL-Pitfalls" "2-NULL-and-Logic"


# ============================================================
# 3. JOINS
# ============================================================

log_section "3/12 — Joins"

run_agent "15-INNER-JOIN" "3-Joins"
run_agent "16-LEFT-JOIN" "3-Joins"
run_agent "17-RIGHT-FULL-JOIN" "3-Joins"
run_agent "18-CROSS-JOIN" "3-Joins"
run_agent "19-SELF-JOIN" "3-Joins"
run_agent "20-JOIN-ON-vs-WHERE" "3-Joins"
run_agent "21-JOIN-Duplicates-and-Fanout" "3-Joins"
run_agent "22-Many-to-Many-Joins" "3-Joins"
run_agent "23-Anti-Joins" "3-Joins"
run_agent "24-Semi-Joins" "3-Joins"
run_agent "25-JOIN-Pitfalls" "3-Joins"


# ============================================================
# 4. SUBQUERIES / EXISTS / CTE
# ============================================================

log_section "4/12 — Subqueries, EXISTS & CTEs"

run_agent "26-Scalar-Subqueries" "4-Subqueries"
run_agent "27-Subqueries-WHERE" "4-Subqueries"
run_agent "28-Subqueries-FROM" "4-Subqueries"
run_agent "29-Correlated-Subqueries" "4-Subqueries"
run_agent "30-IN-vs-EXISTS" "4-Subqueries"
run_agent "31-NOT-IN-vs-NOT-EXISTS" "4-Subqueries"
run_agent "32-JOIN-vs-SUBQUERY" "4-Subqueries"
run_agent "33-CTEs" "4-Subqueries"
run_agent "34-Recursive-CTEs" "4-Subqueries"
run_agent "35-CTE-vs-Subquery-vs-Temp-Table" "4-Subqueries"


# ============================================================
# 5. AGGREGATION
# ============================================================

log_section "5/12 — Aggregation"

run_agent "36-GROUP-BY" "5-Aggregation"
run_agent "37-HAVING" "5-Aggregation"
run_agent "38-COUNT-SUM-AVG-MIN-MAX" "5-Aggregation"
run_agent "39-COUNT-NULL-Pitfalls" "5-Aggregation"
run_agent "40-DISTINCT" "5-Aggregation"
run_agent "41-GROUP-BY-vs-DISTINCT" "5-Aggregation"
run_agent "42-Conditional-Aggregation" "5-Aggregation"
run_agent "43-ROLLUP-CUBE-GROUPING-SETS" "5-Aggregation"


# ============================================================
# 6. WINDOW FUNCTIONS
# ============================================================

log_section "6/12 — Window Functions"

run_agent "44-Window-Functions-Basics" "6-Window-Functions"
run_agent "45-PARTITION-BY" "6-Window-Functions"
run_agent "46-ROW-NUMBER" "6-Window-Functions"
run_agent "47-RANK-vs-DENSE-RANK" "6-Window-Functions"
run_agent "48-LAG-LEAD" "6-Window-Functions"
run_agent "49-Running-Totals" "6-Window-Functions"
run_agent "50-Moving-Averages" "6-Window-Functions"
run_agent "51-Window-Frames" "6-Window-Functions"
run_agent "52-ROWS-vs-RANGE-vs-GROUPS" "6-Window-Functions"
run_agent "53-Top-N-Per-Group" "6-Window-Functions"
run_agent "54-Latest-Row-Per-Group" "6-Window-Functions"
run_agent "55-Gaps-and-Islands" "6-Window-Functions"
run_agent "56-Window-vs-GROUP-BY" "6-Window-Functions"


# ============================================================
# 7. DATES / STRINGS
# ============================================================

log_section "7/12 — Dates, Times & Strings"

run_agent "57-Date-Time-Basics" "7-Dates-and-Strings"
run_agent "58-Date-Arithmetic" "7-Dates-and-Strings"
run_agent "59-Timestamp-Filtering" "7-Dates-and-Strings"
run_agent "60-Timezone-Pitfalls" "7-Dates-and-Strings"
run_agent "61-Monthly-Daily-Reporting" "7-Dates-and-Strings"
run_agent "62-MoM-YoY-Rolling-Metrics" "7-Dates-and-Strings"
run_agent "63-String-Functions" "7-Dates-and-Strings"
run_agent "64-Regular-Expressions" "7-Dates-and-Strings"


# ============================================================
# 8. SETS / DML
# ============================================================

log_section "8/12 — Set Operations & Data Modification"

run_agent "65-UNION-UNION-ALL" "8-DML-and-Sets"
run_agent "66-INTERSECT-EXCEPT-MINUS" "8-DML-and-Sets"
run_agent "67-INSERT" "8-DML-and-Sets"
run_agent "68-UPDATE" "8-DML-and-Sets"
run_agent "69-DELETE" "8-DML-and-Sets"
run_agent "70-MERGE-and-UPSERT" "8-DML-and-Sets"
run_agent "71-Safe-UPDATE-DELETE" "8-DML-and-Sets"


# ============================================================
# 9. INDEXING / OPTIMIZATION
# ============================================================

log_section "9/12 — Indexing & Query Optimization"

run_agent "72-Indexes-Basics" "9-Optimization"
run_agent "73-Composite-Indexes" "9-Optimization"
run_agent "74-Covering-Indexes" "9-Optimization"
run_agent "75-Clustered-vs-Nonclustered" "9-Optimization"
run_agent "76-Partial-Filtered-Indexes" "9-Optimization"
run_agent "77-SARGability" "9-Optimization"
run_agent "78-EXPLAIN-Execution-Plans" "9-Optimization"
run_agent "79-Cardinality-and-Statistics" "9-Optimization"
run_agent "80-Join-Algorithms" "9-Optimization"
run_agent "81-Query-Rewriting" "9-Optimization"
run_agent "82-Performance-Pitfalls" "9-Optimization"
run_agent "83-Index-Design-Strategy" "9-Optimization"
run_agent "84-Pagination-and-Keyset-Pagination" "9-Optimization"


# ============================================================
# 10. TRANSACTIONS / DATABASE DESIGN
# ============================================================

log_section "10/12 — Transactions & Database Design"

run_agent "85-Transactions" "10-Database-Design"
run_agent "86-ACID" "10-Database-Design"
run_agent "87-Isolation-Levels" "10-Database-Design"
run_agent "88-Locks-and-Blocking" "10-Database-Design"
run_agent "89-Deadlocks" "10-Database-Design"
run_agent "90-Normalization" "10-Database-Design"
run_agent "91-Denormalization" "10-Database-Design"
run_agent "92-Keys-and-Relationships" "10-Database-Design"


# ============================================================
# 11. ADVANCED SQL
# ============================================================

log_section "11/12 — Advanced SQL"

run_agent "93-Views" "11-Advanced"
run_agent "94-Materialized-Views" "11-Advanced"
run_agent "95-Temporary-Tables" "11-Advanced"
run_agent "96-Stored-Procedures" "11-Advanced"
run_agent "97-Functions" "11-Advanced"
run_agent "98-Triggers" "11-Advanced"
run_agent "99-Pivot-Unpivot" "11-Advanced"
run_agent "100-Lateral-Joins-CROSS-APPLY" "11-Advanced"
run_agent "101-JSON-SQL" "11-Advanced"
run_agent "102-Recursive-Hierarchies" "11-Advanced"


# ============================================================
# 12. REAL WORLD / INTERVIEW
# ============================================================

log_section "12/12 — Real World & Interview Problems"

run_agent "103-SQL-Problem-Solving-Framework" "12-Interview-and-Scenarios"
run_agent "104-Employee-Problems" "12-Interview-and-Scenarios"
run_agent "105-Customer-Order-Problems" "12-Interview-and-Scenarios"
run_agent "106-Product-Problems" "12-Interview-and-Scenarios"
run_agent "107-User-Activity-Problems" "12-Interview-and-Scenarios"
run_agent "108-Finance-Problems" "12-Interview-and-Scenarios"
run_agent "109-Analytics-Problems" "12-Interview-and-Scenarios"
run_agent "110-Top-100-SQL-Interview-Questions" "12-Interview-and-Scenarios"
run_agent "111-Tricky-SQL-Questions" "12-Interview-and-Scenarios"
run_agent "112-SQL-Debugging-Problems" "12-Interview-and-Scenarios"
run_agent "113-SQL-Optimization-Problems" "12-Interview-and-Scenarios"
run_agent "114-SQL-Patterns-Cheat-Sheet" "12-Interview-and-Scenarios"


# ============================================================
# WAIT FOR ALL AGENTS
# ============================================================

wait


# ============================================================
# AUDIT PHASE
# ============================================================

log_section "AUDIT — Checking for Missing SQL Topics"

AUDIT_FILE="$OUTPUT_DIR/SQL-AUDIT.md"

if [ ! -s "$AUDIT_FILE" ]; then

    opencode run \
"
You are the final SQL handbook auditor.

The SQL handbook has been generated in:

$OUTPUT_DIR

Read ALL Markdown files in that directory.

Your job is NOT to rewrite the handbook.

Audit it for:

1. Missing SQL concepts
2. Missing edge cases
3. Incorrect SQL
4. Contradictory explanations
5. Duplicate explanations
6. Incorrect performance claims
7. Missing NULL behavior
8. Missing JOIN pitfalls
9. Missing JOIN vs subquery guidance
10. Missing EXISTS/NOT EXISTS guidance
11. Missing execution-plan concepts
12. Missing optimization concepts
13. Missing interview patterns
14. Missing database dialect differences
15. Missing real-world scenarios

Pay special attention to:

- NULL = NULL
- IS DISTINCT FROM
- IS NOT DISTINCT FROM
- NOT IN + NULL
- LEFT JOIN + WHERE
- JOIN duplication
- fan-out
- double counting
- COUNT(*)
- COUNT(column)
- COUNT(DISTINCT)
- GROUP BY
- HAVING
- DISTINCT
- ROW_NUMBER
- RANK
- DENSE_RANK
- window frames
- JOIN vs EXISTS
- JOIN vs subquery
- CTE vs subquery
- correlated subqueries
- recursive CTEs
- indexes
- composite indexes
- sargability
- execution plans
- cardinality
- statistics
- pagination
- timestamp boundaries
- transactions
- isolation levels

Create:

# SQL Handbook Audit

## Missing Topics

## Incorrect or Risky Explanations

## Important Edge Cases Missing

## Performance Issues

## Interview Gaps

## Dialect Differences Missing

## Recommended Additions

For every issue, identify the file where it occurs.

Return ONLY Markdown.
" > "$AUDIT_FILE" 2>>"$OUTPUT_DIR/errors.log"

fi


# ============================================================
# FINAL CHEAT SHEET AGENT
# ============================================================

log_section "FINAL — Generating Master Cheat Sheet"

CHEAT_FILE="$OUTPUT_DIR/SQL-MASTER-CHEAT-SHEET.md"

if [ ! -s "$CHEAT_FILE" ]; then

    opencode run \
"
You are creating the final SQL master cheat sheet.

Read the complete handbook in:

$OUTPUT_DIR

Create a concise but comprehensive reference.

Include:

# SQL Mental Model

# Logical Query Execution Order

# JOIN Decision Tree

# JOIN vs Subquery Decision Tree

# EXISTS vs IN

# NOT EXISTS vs NOT IN

# NULL Cheat Sheet

# GROUP BY vs Window Functions

# ROW_NUMBER vs RANK vs DENSE_RANK

# WHERE vs HAVING

# ON vs WHERE

# UNION vs UNION ALL

# DELETE vs TRUNCATE vs DROP

# CTE vs Subquery vs Temporary Table

# Index Checklist

# SARGability Checklist

# Query Optimization Checklist

# Execution Plan Checklist

# Common SQL Pitfalls

# Timestamp Pitfalls

# SQL Interview Patterns

# Top 50 SQL Query Templates

# SQL Problem-Solving Framework

Use tables wherever useful.

Return ONLY Markdown.
" > "$CHEAT_FILE" 2>>"$OUTPUT_DIR/errors.log"

fi


# ============================================================
# FINAL STATS
# ============================================================

echo ""
echo "===================================================================="
echo "  SQL HANDBOOK GENERATION COMPLETE"
echo "===================================================================="

TOTAL_FILES=$(find "$OUTPUT_DIR" -type f -name "*.md" | wc -l)

ERROR_LINES=0

if [ -f "$OUTPUT_DIR/errors.log" ]; then
    ERROR_LINES=$(wc -l < "$OUTPUT_DIR/errors.log")
fi

echo "Output directory : $OUTPUT_DIR"
echo "Markdown files   : $TOTAL_FILES"
echo "Error lines      : $ERROR_LINES"
echo "===================================================================="


# ============================================================
# GIT
# ============================================================

log_section "Git — Initializing / Committing"

if [ ! -d .git ]; then
    log "Initializing git repository..."
    git init
fi

git add "$OUTPUT_DIR"
git add "$PROMPT_FILE"

git commit \
    -m "Generate comprehensive SQL handbook - $(date +%Y-%m-%d)" \
    || log "Nothing new to commit."

log "SQL handbook generation complete."