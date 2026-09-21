#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# SQL HANDBOOK VALIDATOR
#
# Usage:
#   ./validate-sql-handbook.sh [OUTPUT_DIR] [MASTER_PROMPT] [GENERATOR_SCRIPT] [VALIDATOR_PROMPT]
#
# Example:
#   ./validate-sql-handbook.sh ./sql-handbook ./sql-master-prompt.md ./script.sh ./sql-validator-prompt.md
#
# PostgreSQL connection settings are taken from the normal libpq environment:
# PGHOST, PGPORT, PGUSER, PGPASSWORD, etc.
# If these are not set, psql/createdb use your normal local PostgreSQL setup.

OUTPUT_DIR="${1:-./sql-handbook}"
MASTER_PROMPT="${2:-./sql-master-prompt.md}"
GENERATOR_SCRIPT="${3:-./script.sh}"
VALIDATOR_PROMPT="${4:-./sql-validator-prompt.md}"

REPORT_DIR="${OUTPUT_DIR}/validation"
RUN_ID="$(date +%Y%m%d_%H%M%S)_$$"
DB_NAME="sql_handbook_validate_${RUN_ID//[^a-zA-Z0-9_]/_}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sql-handbook-validator.XXXXXX")"

cleanup() {
    set +e
    dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT INT TERM

log() {
    printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

die() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------

[[ -d "$OUTPUT_DIR" ]] || die "Output directory not found: $OUTPUT_DIR"
[[ -f "$MASTER_PROMPT" ]] || die "Master prompt not found: $MASTER_PROMPT"
[[ -f "$GENERATOR_SCRIPT" ]] || die "Generator script not found: $GENERATOR_SCRIPT"
[[ -f "$VALIDATOR_PROMPT" ]] || die "Validator prompt not found: $VALIDATOR_PROMPT"

for cmd in psql createdb dropdb pg_isready opencode awk sed grep find sort wc; do
    command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: $cmd"
done

# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------

log "Checking PostgreSQL..."
PGREADY_ARGS=()
[[ -n "${PGHOST:-}" ]] && PGREADY_ARGS+=("-h" "$PGHOST")
[[ -n "${PGPORT:-}" ]] && PGREADY_ARGS+=("-p" "$PGPORT")
[[ -n "${PGUSER:-}" ]] && PGREADY_ARGS+=("-U" "$PGUSER")

pg_isready "${PGREADY_ARGS[@]}" >/dev/null 2>&1 ||
    die "PostgreSQL is not accepting connections."

log "Creating isolated temporary database: $DB_NAME"
createdb "$DB_NAME"

mkdir -p "$REPORT_DIR"

# ---------------------------------------------------------------------------
# 1. Check generated structure against the original generator script.
# ---------------------------------------------------------------------------

log "Checking handbook structure..."

STRUCTURE_REPORT="$REPORT_DIR/structure.txt"

{
    echo "SQL Handbook Structure Validation"
    echo "Generated: $(date)"
    echo

    expected_count="$(
        grep -Ec 'run_agent[[:space:]]+"[^"]+"[[:space:]]+"[^"]+"' \
        "$GENERATOR_SCRIPT" || true
    )"

    actual_section_count="$(
        find "$OUTPUT_DIR" -mindepth 2 -type f -name '*.md' \
        ! -name 'SQL-AUDIT.md' \
        ! -name 'SQL-MASTER-CHEAT-SHEET.md' |
        wc -l | tr -d ' '
    )"

    echo "Expected section files: $expected_count"
    echo "Actual section files:   $actual_section_count"

    if [[ "$expected_count" -eq "$actual_section_count" ]]; then
        echo "SECTION_COUNT_STATUS=PASS"
    else
        echo "SECTION_COUNT_STATUS=FAIL"
    fi

    echo
    echo "Missing section files:"

    while IFS= read -r line; do
        category="$(
            sed -n 's/.*run_agent "\([^"]*\)" "\([^"]*\)".*/\2/p' <<< "$line"
        )"
        section="$(
            sed -n 's/.*run_agent "\([^"]*\)" "\([^"]*\)".*/\1/p' <<< "$line"
        )"

        file="$OUTPUT_DIR/$category/$section.md"

        [[ -s "$file" ]] || echo "$file"
    done < <(
        grep 'run_agent[[:space:]]*"[^"]*"[[:space:]]*"[^"]*"' \
        "$GENERATOR_SCRIPT" || true
    )

    echo
    for required in "SQL-AUDIT.md" "SQL-MASTER-CHEAT-SHEET.md"; do
        if [[ -s "$OUTPUT_DIR/$required" ]]; then
            echo "$required=PASS"
        else
            echo "$required=FAIL"
        fi
    done

    echo
    echo "Empty Markdown files:"
    find "$OUTPUT_DIR" -type f -name '*.md' -empty -print
} > "$STRUCTURE_REPORT"

# ---------------------------------------------------------------------------
# 2. Extract SQL code blocks.
#
# Only blocks explicitly marked sql/postgresql/pgsql are executed.
# MySQL/SQL Server/Oracle blocks are left for semantic/dialect review.
# ---------------------------------------------------------------------------

extract_sql_blocks() {
    local md="$1"
    local out="$2"

    awk '
        BEGIN { in_sql=0; block=0 }

        /^```[[:space:]]*(sql|SQL|postgresql|PostgreSQL|pgsql)[[:space:]]*$/ {
            in_sql=1
            block++
            print "\\echo '\''--- SQL BLOCK " block " ---'\''"
            print "\\echo '\''SOURCE: " FILENAME " ---'\''"
            next
        }

        /^```[[:space:]]*$/ && in_sql {
            in_sql=0
            print "\\echo '\''--- END SQL BLOCK " block " ---'\''"
            next
        }

        in_sql { print }
    ' "$md" > "$out"
}

run_sql_file() {
    local md="$1"
    local rel="${md#"$OUTPUT_DIR"/}"
    local safe
    safe="$(printf '%s' "$rel" | sed 's#[^A-Za-z0-9_.-]#_#g')"

    local sql="$WORK_DIR/$safe.sql"
    local logf="$REPORT_DIR/${safe}.psql.log"

    extract_sql_blocks "$md" "$sql"

    if ! grep -q 'SQL BLOCK' "$sql"; then
        {
            echo "FILE=$rel"
            echo "STATUS=NO_SQL_BLOCKS"
        } > "$logf"
        return 0
    fi

    {
        echo "FILE=$rel"
        echo "RUN_DATE=$(date)"
        echo "DATABASE=$DB_NAME"
        echo
        echo "Only fenced sql/postgresql/pgsql blocks are executed."
        echo "Other dialects are reviewed by the semantic auditor."
        echo
        echo "----- psql output -----"

        # ON_ERROR_STOP is deliberately OFF.
        #
        # We want the validator to see all errors in a file rather than stop at
        # the first one. The OpenCode audit then decides whether an error is a
        # genuine problem or an intentionally invalid/trap example.
        psql \
            -X \
            -d "$DB_NAME" \
            -v ON_ERROR_STOP=0 \
            -v VERBOSITY=verbose \
            -P pager=off \
            -P footer=on \
            -f "$sql"

        rc=$?

        echo
        echo "PSQL_EXIT_CODE=$rc"
    } > "$logf" 2>&1 || true
}

log "Executing PostgreSQL examples..."

while IFS= read -r -d '' md; do
    run_sql_file "$md"
done < <(
    find "$OUTPUT_DIR" -type f -name '*.md' -print0 | sort -z
)

# ---------------------------------------------------------------------------
# 3. Build an execution index for the semantic auditor.
# ---------------------------------------------------------------------------

INDEX="$REPORT_DIR/execution-index.tsv"

{
    printf 'file\tlog\tstatus\tpsql_exit\n'

    while IFS= read -r -d '' md; do
        rel="${md#"$OUTPUT_DIR"/}"
        safe="$(printf '%s' "$rel" | sed 's#[^A-Za-z0-9_.-]#_#g')"
        logf="$REPORT_DIR/${safe}.psql.log"

        if grep -q '^STATUS=NO_SQL_BLOCKS' "$logf"; then
            status="NO_SQL_BLOCKS"
            rc="N/A"
        else
            rc="$(
                sed -n 's/^PSQL_EXIT_CODE=//p' "$logf" | tail -1
            )"

            if [[ "$rc" == "0" ]]; then
                status="PASS"
            else
                status="ERRORS_REPORTED"
            fi
        fi

        printf '%s\t%s\t%s\t%s\n' "$rel" "$logf" "$status" "$rc"
    done < <(
        find "$OUTPUT_DIR" -type f -name '*.md' -print0 | sort -z
    )
} > "$INDEX"

# ---------------------------------------------------------------------------
# 4. Run the source-aware semantic audit.
# ---------------------------------------------------------------------------

FINAL_REPORT="$REPORT_DIR/SQL-HANDBOOK-VALIDATION.md"

PROMPT="$(cat "$VALIDATOR_PROMPT")"
PROMPT="${PROMPT//__OUTPUT_DIR__/$OUTPUT_DIR}"
PROMPT="${PROMPT//__MASTER_PROMPT__/$MASTER_PROMPT}"
PROMPT="${PROMPT//__GENERATOR_SCRIPT__/$GENERATOR_SCRIPT}"
PROMPT="${PROMPT//__INDEX__/$INDEX}"
PROMPT="${PROMPT//__REPORT_DIR__/$REPORT_DIR}"

log "Running final semantic audit with OpenCode..."

OPENCODE_TRACE="$REPORT_DIR/opencode-trace.log"
OPENCODE_ERROR_LOG="$REPORT_DIR/opencode-errors.log"

if opencode run "$PROMPT" \
    > "$FINAL_REPORT" \
    2> "$OPENCODE_TRACE"; then
    OPEN_CODE_STATUS="PASS"
    : > "$OPENCODE_ERROR_LOG"
else
    OPEN_CODE_STATUS="ERROR"
    {
        echo "OpenCode semantic audit exited with a non-zero status."
        echo "See $(basename "$OPENCODE_TRACE") for diagnostic output."
    } > "$OPENCODE_ERROR_LOG"
    log "OpenCode audit returned a non-zero exit code."
fi

# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------

TOTAL_MD="$(
    find "$OUTPUT_DIR" -type f -name '*.md' | wc -l | tr -d ' '
)"

TOTAL_LOGS="$(
    find "$REPORT_DIR" -type f -name '*.psql.log' | wc -l | tr -d ' '
)"

EXEC_ERRORS="$(
    grep -l '^PSQL_EXIT_CODE=[1-9]' \
        "$REPORT_DIR"/*.psql.log 2>/dev/null |
    wc -l | tr -d ' '
)"

NO_SQL="$(
    grep -l '^STATUS=NO_SQL_BLOCKS' \
        "$REPORT_DIR"/*.psql.log 2>/dev/null |
    wc -l | tr -d ' '
)"

cat > "$REPORT_DIR/README.txt" <<EOF
SQL Handbook Validation
=======================

Output directory:
$OUTPUT_DIR

Validation directory:
$REPORT_DIR

Temporary PostgreSQL database:
$DB_NAME

Markdown files checked:
$TOTAL_MD

Execution logs:
$TOTAL_LOGS

Files with reported PostgreSQL errors:
$EXEC_ERRORS

Files with no executable SQL blocks:
$NO_SQL

OpenCode semantic audit:
$OPEN_CODE_STATUS

Main report:
$FINAL_REPORT

The temporary PostgreSQL database is removed automatically when this script
exits.

Important:
- Only fenced sql/postgresql/pgsql blocks are executed.
- MySQL/SQL Server/Oracle blocks are reviewed semantically.
- A PostgreSQL execution error is not automatically a handbook error because
  some sections may intentionally demonstrate invalid SQL.
- Expected-output checking and semantic checking are performed by OpenCode
  using the generated Markdown plus the PostgreSQL execution logs.
EOF

log "Validation complete."
log "Main report: $FINAL_REPORT"
log "Execution logs: $REPORT_DIR"
