#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# ============================================================
# SQL HANDBOOK REPAIR ENGINE
#
# Reads validation reports/logs, repairs verified problems in
# generated Markdown files, then re-validates the repaired SQL.
#
# Usage:
#   ./repair-sql-handbook.sh [OUTPUT_DIR] [VALIDATOR_SCRIPT] [REPAIR_PROMPT]
#
# Example:
#   ./repair-sql-handbook.sh \
#       ./sql-handbook \
#       ./validate-sql-handbook.sh \
#       ./sql-repair-prompt.md
#
# Environment:
#   MAX_REPAIR_ROUNDS=3
#   AUTO_COMMIT=0
#
# PostgreSQL uses the normal libpq environment:
#   PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
# ============================================================

OUTPUT_DIR="${1:-./sql-handbook}"
VALIDATOR_SCRIPT="${2:-./validate-sql-handbook.sh}"
REPAIR_PROMPT_FILE="${3:-./sql-repair-prompt.md}"

MAX_REPAIR_ROUNDS="${MAX_REPAIR_ROUNDS:-3}"
AUTO_COMMIT="${AUTO_COMMIT:-0}"

VALIDATION_DIR="$OUTPUT_DIR/validation"
REPAIR_DIR="$VALIDATION_DIR/repair"
BACKUP_DIR="$REPAIR_DIR/backups"
DIFF_DIR="$REPAIR_DIR/diffs"
HISTORY_DIR="$REPAIR_DIR/history"

mkdir -p "$REPAIR_DIR" "$BACKUP_DIR" "$DIFF_DIR" "$HISTORY_DIR"

log() {
    printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

die() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

[[ -d "$OUTPUT_DIR" ]] || die "Output directory not found: $OUTPUT_DIR"
[[ -f "$VALIDATOR_SCRIPT" ]] || die "Validator script not found: $VALIDATOR_SCRIPT"
[[ -f "$REPAIR_PROMPT_FILE" ]] || die "Repair prompt not found: $REPAIR_PROMPT_FILE"

command -v opencode >/dev/null 2>&1 ||
    die "opencode command not found."

command -v git >/dev/null 2>&1 ||
    die "git command not found."

command -v diff >/dev/null 2>&1 ||
    die "diff command not found."

# ------------------------------------------------------------
# Locate the validation report.
# ------------------------------------------------------------

REPORT="$VALIDATION_DIR/SQL-HANDBOOK-VALIDATION.md"

if [[ ! -s "$REPORT" ]]; then
    log "Validation report does not exist."
    log "Running validator first..."

    "$VALIDATOR_SCRIPT" "$OUTPUT_DIR" \
        "${MASTER_PROMPT:-./sql-master-prompt.md}" \
        "${GENERATOR_SCRIPT:-./script.sh}" \
        "$REPAIR_PROMPT_FILE" >/dev/null
fi

[[ -s "$REPORT" ]] ||
    die "Validation report was not generated: $REPORT"

# ------------------------------------------------------------
# Ask OpenCode to identify files that actually require repair.
#
# This is deliberately separate from the repair step.
# We don't blindly edit every file.
# ------------------------------------------------------------

for ((round=1; round<=MAX_REPAIR_ROUNDS; round++)); do

    ROUND_DIR="$REPAIR_DIR/round-$round"
    mkdir -p "$ROUND_DIR"

    TARGETS="$ROUND_DIR/repair-targets.tsv"
    PLAN="$ROUND_DIR/repair-plan.md"

    log "============================================================"
    log "REPAIR ROUND $round / $MAX_REPAIR_ROUNDS"
    log "============================================================"

    cat > "$ROUND_DIR/target-prompt.md" <<EOF
You are the triage stage of a SQL handbook repair system.

Read:

1. The validation report:
   $REPORT

2. The complete PostgreSQL execution logs:
   $VALIDATION_DIR

3. The generated handbook:
   $OUTPUT_DIR

Your job is ONLY to identify files that require an actual correction.

Do not modify any file.

Return ONLY TSV with this exact header:

file<TAB>severity<TAB>reason

Rules:

- Include only files with a genuine problem.
- Do not include files that merely contain intentionally invalid SQL if the
  handbook clearly labels it as intentional.
- Do not include files where the only issue is a nondeterministic row order
  unless the documented expected output incorrectly depends on ordering.
- Prefer the smallest possible repair.
- Preserve correct existing content.
- If a problem is caused by another file, identify the file that actually
  needs modification when possible.
- Severity must be one of:
  CRITICAL
  HIGH
  MEDIUM
  LOW

Every file path must be relative to:

$OUTPUT_DIR

Do not include SQL-MASTER-CHEAT-SHEET.md or SQL-AUDIT.md unless the validation
report explicitly says they contain a concrete factual/SQL error.

Do not put tabs inside the reason.
EOF

    if ! opencode run "$(cat "$ROUND_DIR/target-prompt.md")" \
        > "$TARGETS" \
        2> "$ROUND_DIR/triage-errors.log"; then
        die "OpenCode triage failed in round $round."
    fi

    # Remove accidental Markdown fences/header noise while preserving TSV.
    awk -F '\t' '
        NR == 1 {
            if ($1 == "file") print
            next
        }
        NF >= 3 && $1 !~ /^#/ && $1 !~ /^```/ {
            print
        }
    ' "$TARGETS" > "$ROUND_DIR/repair-targets.clean.tsv"

    mv "$ROUND_DIR/repair-targets.clean.tsv" "$TARGETS"

    TARGET_COUNT="$(
        awk 'NR > 1 && NF >= 3 { count++ } END { print count+0 }' "$TARGETS"
    )"

    log "Files requiring repair: $TARGET_COUNT"

    if [[ "$TARGET_COUNT" -eq 0 ]]; then
        log "No repair targets found."
        break
    fi

    # --------------------------------------------------------
    # Build a repair plan.
    # --------------------------------------------------------

    cat > "$ROUND_DIR/plan-prompt.md" <<EOF
You are preparing a repair plan for a SQL handbook.

Read:

- Validation report:
  $REPORT

- Repair targets:
  $TARGETS

- Handbook:
  $OUTPUT_DIR

- Original master prompt:
  ${MASTER_PROMPT:-./sql-master-prompt.md}

Do not edit files.

Create a Markdown repair plan.

For every target file include:

## <file>

### Verified problem
### Evidence
### Exact correction required
### What must be preserved
### Validation requirement after repair

Do not invent issues.
Use the PostgreSQL logs when SQL execution evidence exists.
If a validation finding is ambiguous, mark it "DO NOT REPAIR" rather than
guessing.

Return ONLY Markdown.
EOF

    opencode run "$(cat "$ROUND_DIR/plan-prompt.md")" \
        > "$PLAN" \
        2> "$ROUND_DIR/plan-errors.log" ||
        die "OpenCode repair planning failed in round $round."

    # --------------------------------------------------------
    # Repair each target independently.
    # --------------------------------------------------------

    while IFS=$'\t' read -r file severity reason; do

        [[ "$file" == "file" ]] && continue
        [[ -n "$file" ]] || continue

        SOURCE="$OUTPUT_DIR/$file"

        if [[ ! -f "$SOURCE" ]]; then
            log "WARNING: target file does not exist: $SOURCE"
            continue
        fi

        SAFE_NAME="$(printf '%s' "$file" |
            sed 's#[^A-Za-z0-9_.-]#_#g')"

        BACKUP="$BACKUP_DIR/round-${round}_${SAFE_NAME}.bak"
        BEFORE="$ROUND_DIR/${SAFE_NAME}.before.md"
        AFTER="$ROUND_DIR/${SAFE_NAME}.after.md"
        DIFF_FILE="$DIFF_DIR/round-${round}_${SAFE_NAME}.diff"

        cp "$SOURCE" "$BACKUP"
        cp "$SOURCE" "$BEFORE"

        log "Repairing [$severity] $file"

        # The file itself is given to OpenCode through the shell prompt.
        # OpenCode is instructed to write the complete corrected Markdown to
        # stdout, not to edit the source directly.
        cat > "$ROUND_DIR/file-prompt.md" <<EOF
You are repairing ONE SQL handbook file.

Target file:
$SOURCE

Severity:
$severity

Triage reason:
$reason

Repair plan:
$PLAN

Validation report:
$REPORT

PostgreSQL execution logs:
$VALIDATION_DIR

Original master prompt:
${MASTER_PROMPT:-./sql-master-prompt.md}

Read the target file completely before making changes.

IMPORTANT RULES:

1. Fix ONLY verified problems.
2. Do not rewrite the section unnecessarily.
3. Preserve correct explanations, examples, headings, tables, and interview
   questions.
4. Preserve the original structure and teaching style.
5. Do not remove useful edge cases merely to make SQL execute.
6. If an SQL example is intentionally invalid, keep it invalid if the text
   clearly labels and explains it.
7. If a query is intended to be PostgreSQL, make it valid PostgreSQL.
8. If a query is intended to be ANSI SQL, keep it portable where possible.
9. Never silently convert another database dialect into PostgreSQL.
10. Correct expected output when the SQL is correct and the documented output
    is wrong.
11. Correct SQL when the documented expected output demonstrates the intended
    behavior and the SQL is wrong.
12. If both SQL and explanation are wrong, correct both.
13. Never invent table columns or sample data.
14. Make examples reproducible when the existing section provides sample data.
15. Do not make unsupported performance claims.
16. Preserve warnings such as "Interview trap", "Production pitfall", and
    dialect labels where they remain relevant.
17. Do not add unrelated concepts.

Return ONLY the complete corrected Markdown for this ONE file.
Do not use Markdown fences around the entire document.
Do not explain your changes outside the Markdown document.
EOF

        if ! opencode run "$(cat "$ROUND_DIR/file-prompt.md")" \
            > "$AFTER" \
            2> "$ROUND_DIR/${SAFE_NAME}.repair-errors.log"; then
            log "FAILED repair: $file"
            continue
        fi

        if [[ ! -s "$AFTER" ]]; then
            log "FAILED repair: OpenCode returned empty output for $file"
            continue
        fi

        # ----------------------------------------------------
        # Basic sanity checks before replacing source.
        # ----------------------------------------------------

        if ! grep -q '^#' "$AFTER"; then
            log "FAILED sanity check: repaired file has no Markdown headings: $file"
            continue
        fi

        if grep -q '^```' "$BEFORE" && ! grep -q '^```' "$AFTER"; then
            log "FAILED sanity check: code fences disappeared: $file"
            continue
        fi

        diff -u "$BEFORE" "$AFTER" > "$DIFF_FILE" || true

        if [[ ! -s "$DIFF_FILE" ]]; then
            log "NO CHANGE: $file"
            continue
        fi

        # ----------------------------------------------------
        # Replace only after sanity checks pass.
        # ----------------------------------------------------

        cp "$AFTER" "$SOURCE"

        log "UPDATED: $file"

    done < "$TARGETS"

    # --------------------------------------------------------
    # Re-run the actual PostgreSQL validator after every round.
    # --------------------------------------------------------

    log "Re-validating repaired handbook..."

    "$VALIDATOR_SCRIPT" \
        "$OUTPUT_DIR" \
        "${MASTER_PROMPT:-./sql-master-prompt.md}" \
        "${GENERATOR_SCRIPT:-./script.sh}" \
        "$REPAIR_PROMPT_FILE" \
        > "$ROUND_DIR/revalidation-output.log" \
        2> "$ROUND_DIR/revalidation-errors.log" || true

    # Save the new report into this round for history.
    cp "$REPORT" "$ROUND_DIR/SQL-HANDBOOK-VALIDATION.md"

    # Preserve a compact history entry.
    {
        echo "# Repair Round $round"
        echo
        echo "Date: $(date)"
        echo
        echo "Target files: $TARGET_COUNT"
        echo
        echo "## Files"
        awk -F '\t' 'NR > 1 && NF >= 3 {
            printf "- `%s` — %s — %s\n", $1, $2, $3
        }' "$TARGETS"
    } > "$HISTORY_DIR/round-$round.md"

    # If no actual files changed, continuing cannot help.
    CHANGED_COUNT="$(
        find "$DIFF_DIR" \
            -type f \
            -name "round-${round}_*.diff" \
            -size +0c |
        wc -l | tr -d ' '
    )"

    log "Files changed this round: $CHANGED_COUNT"

    if [[ "$CHANGED_COUNT" -eq 0 ]]; then
        log "No changes made. Stopping repair loop."
        break
    fi

done

# ------------------------------------------------------------
# Final cross-file audit.
# ------------------------------------------------------------

FINAL_AUDIT="$REPAIR_DIR/FINAL-CROSS-FILE-AUDIT.md"

log "Running final cross-file consistency audit..."

cat > "$REPAIR_DIR/final-audit-prompt.md" <<EOF
You are the final cross-file auditor for a PostgreSQL SQL handbook.

Read the COMPLETE handbook:

$OUTPUT_DIR

Also read the latest validation report:

$REPORT

Read all repair history:

$HISTORY_DIR

Read all repair diffs:

$DIFF_DIR

Check for problems introduced by repairs, especially:

- contradictory explanations between sections;
- different definitions of the same SQL behavior;
- different expected outputs for equivalent examples;
- inconsistent NULL behavior;
- inconsistent JOIN guidance;
- inconsistent PostgreSQL behavior;
- incorrect cross-references;
- broken Markdown;
- missing code fences;
- duplicate or conflicting advice;
- performance claims that contradict each other;
- cheat sheet statements that contradict the detailed sections;
- audit statements that no longer match the handbook.

Do not modify any files.

Return ONLY:

# Final Cross-File Audit

## Remaining Critical Issues
## Remaining High Issues
## Remaining Medium Issues
## Remaining Low Issues
## Repaired Areas Verified
## Cross-File Consistency Checks
## Final Recommendation

Do not claim an issue exists without evidence from the handbook or validation
report.
EOF

opencode run "$(cat "$REPAIR_DIR/final-audit-prompt.md")" \
    > "$FINAL_AUDIT" \
    2> "$REPAIR_DIR/final-audit-errors.log" || true

# ------------------------------------------------------------
# Optional Git commit.
# ------------------------------------------------------------

if [[ "$AUTO_COMMIT" == "1" ]]; then
    log "Creating Git commit..."

    git add "$OUTPUT_DIR"

    git commit \
        -m "Repair and validate SQL handbook - $(date +%Y-%m-%d)" \
        || log "Nothing new to commit."
else
    log "AUTO_COMMIT=0; no Git commit created."
fi

log "============================================================"
log "SQL HANDBOOK REPAIR COMPLETE"
log "============================================================"
log "Repair directory : $REPAIR_DIR"
log "Final validation : $REPORT"
log "Cross-file audit  : $FINAL_AUDIT"
log "Backups           : $BACKUP_DIR"
log "Diffs             : $DIFF_DIR"
