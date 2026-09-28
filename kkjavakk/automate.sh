#!/bin/bash
set -o pipefail

# ==========================================
# Java Handbook Generator
# ==========================================

OUTPUT_DIR="./java-handbook"
MAX_JOBS=1

mkdir -p "$OUTPUT_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

log_section() {
    echo ""
    echo "==============================================="
    echo "  $1"
    echo "==============================================="
}

run_agent () {
    SECTION="$1"
    FILE="$OUTPUT_DIR/$SECTION.md"

    while (( $(jobs -rp | wc -l) >= MAX_JOBS )); do
        sleep 1
    done

    log "Starting: $SECTION"

    opencode run \
        "
You are writing a professional Java handbook.

Generate ONLY the section:

$SECTION

Rules:

- Cover everything.
- Skip nothing.
- Explain every concept deeply.
- Include diagrams using Mermaid whenever helpful.
- Include internal working.
- Include examples.
- Include edge cases.
- Include common mistakes.
- Include best practices.
- Include performance implications.
- Include comparison tables.
- Include interview tips.

DO NOT generate content from any other section.

At the END create:

# Interview Questions

Include:
- Beginner
- Intermediate
- Advanced
- Expert
- Scenario Based
- Output Prediction
- Internal Working
- Tricky Questions

Return only markdown.

Before writing also check the folders if the file already exists also check if there are any data. If it does, skip the generation and log that it was skipped.
" > "$FILE" 2>>"$OUTPUT_DIR/errors.log"
    if [ $? -eq 0 ]; then
        log "Done:     $SECTION"
    else
        log "FAILED:   $SECTION (see errors.log)"
    fi &

}

log_section "Generating 1/9 — Fundamentals"
run_agent "01-Java-Fundamentals"
run_agent "02-OOP"
run_agent "03-JVM-Architecture"
run_agent "04-Java-Memory"
run_agent "05-Class-Loading"
run_agent "06-Exception-Handling"
run_agent "07-Generics"

log_section "Generating 2/9 — Collections"
run_agent "08-Collections-Part1"
run_agent "09-Collections-Part2"
run_agent "10-HashMap-Internals"
run_agent "11-Concurrent-Collections"

log_section "Generating 3/9 — Functional"
run_agent "12-Lambda"
run_agent "13-Streams"
run_agent "14-Collectors"
run_agent "15-Optional"

log_section "Generating 4/9 — Multithreading"
run_agent "16-Threads"
run_agent "17-Synchronization"
run_agent "18-Locks"
run_agent "19-Concurrency-Utilities"
run_agent "20-CompletableFuture"
run_agent "21-ForkJoin"
run_agent "22-Virtual-Threads"
run_agent "23-Java-Memory-Model"

log_section "Generating 5/9 — IO"
run_agent "24-File-IO"
run_agent "25-NIO"
run_agent "26-Networking"

log_section "Generating 6/9 — Reflection"
run_agent "27-Reflection"
run_agent "28-Annotations"
run_agent "29-Serialization"

log_section "Generating 7/9 — Modern Java"
run_agent "30-Date-Time"
run_agent "31-Modules"
run_agent "32-Records"
run_agent "33-Sealed-Classes"
run_agent "34-Pattern-Matching"
run_agent "35-Switch-Expressions"
run_agent "36-Text-Blocks"

log_section "Generating 8/9 — Advanced"
run_agent "37-Design-Patterns"
run_agent "38-JVM-Performance"
run_agent "39-Garbage-Collection"
run_agent "40-Security"
run_agent "41-JNI"
run_agent "42-Unsafe"
run_agent "43-VarHandle"
run_agent "44-Bytecode"
run_agent "45-GraalVM"

log_section "Generating 9/9 — Version History"
run_agent "46-Java5"
run_agent "47-Java6"
run_agent "48-Java7"
run_agent "49-Java8"
run_agent "50-Java9"
run_agent "51-Java10"
run_agent "52-Java11"
run_agent "53-Java12-17"
run_agent "54-Java18-Latest"

############################################################

wait

echo ""
echo "===================================================================="
echo "  Java Handbook Generation Complete"
echo "  Output: $OUTPUT_DIR"
echo "  Total sections: $(ls $OUTPUT_DIR/*.md 2>/dev/null | wc -l)"
echo "  Errors: $(wc -l < $OUTPUT_DIR/errors.log 2>/dev/null || echo 0)"
echo "  Folders: $(ls -d $OUTPUT_DIR/*/ 2>/dev/null | wc -l)"
echo "____________________________________________________________________"

############################################################
# Git: init, organize into folders, commit
############################################################
log_section "Organizing & Committing"

if [ ! -d .git ]; then
    log "Initializing git repository..."
    git init
fi

# Organize into numbered subfolders
mkdir -p "$OUTPUT_DIR/1-Fundamentals"
mkdir -p "$OUTPUT_DIR/3-Collections"
mkdir -p "$OUTPUT_DIR/4-Functional"
mkdir -p "$OUTPUT_DIR/5-Multithreading"
mkdir -p "$OUTPUT_DIR/6-IO"
mkdir -p "$OUTPUT_DIR/2-Reflection"
mkdir -p "$OUTPUT_DIR/7-Modern-Java"
mkdir -p "$OUTPUT_DIR/8-Advanced"
mkdir -p "$OUTPUT_DIR/9-Version-History"

mv "$OUTPUT_DIR/01-Java-Fundamentals.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null
mv "$OUTPUT_DIR/02-OOP.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null
mv "$OUTPUT_DIR/03-JVM-Architecture.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null
mv "$OUTPUT_DIR/04-Java-Memory.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null
mv "$OUTPUT_DIR/05-Class-Loading.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null
mv "$OUTPUT_DIR/06-Exception-Handling.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null
mv "$OUTPUT_DIR/07-Generics.md" "$OUTPUT_DIR/1-Fundamentals/" 2>/dev/null

mv "$OUTPUT_DIR/27-Reflection.md" "$OUTPUT_DIR/2-Reflection/" 2>/dev/null
mv "$OUTPUT_DIR/28-Annotations.md" "$OUTPUT_DIR/2-Reflection/" 2>/dev/null
mv "$OUTPUT_DIR/29-Serialization.md" "$OUTPUT_DIR/2-Reflection/" 2>/dev/null

mv "$OUTPUT_DIR/08-Collections-Part1.md" "$OUTPUT_DIR/3-Collections/" 2>/dev/null
mv "$OUTPUT_DIR/09-Collections-Part2.md" "$OUTPUT_DIR/3-Collections/" 2>/dev/null
mv "$OUTPUT_DIR/10-HashMap-Internals.md" "$OUTPUT_DIR/3-Collections/" 2>/dev/null
mv "$OUTPUT_DIR/11-Concurrent-Collections.md" "$OUTPUT_DIR/3-Collections/" 2>/dev/null

mv "$OUTPUT_DIR/12-Lambda.md" "$OUTPUT_DIR/4-Functional/" 2>/dev/null
mv "$OUTPUT_DIR/13-Streams.md" "$OUTPUT_DIR/4-Functional/" 2>/dev/null
mv "$OUTPUT_DIR/14-Collectors.md" "$OUTPUT_DIR/4-Functional/" 2>/dev/null
mv "$OUTPUT_DIR/15-Optional.md" "$OUTPUT_DIR/4-Functional/" 2>/dev/null

mv "$OUTPUT_DIR/16-Threads.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/17-Synchronization.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/18-Locks.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/19-Concurrency-Utilities.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/20-CompletableFuture.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/21-ForkJoin.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/22-Virtual-Threads.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null
mv "$OUTPUT_DIR/23-Java-Memory-Model.md" "$OUTPUT_DIR/5-Multithreading/" 2>/dev/null

mv "$OUTPUT_DIR/24-File-IO.md" "$OUTPUT_DIR/6-IO/" 2>/dev/null
mv "$OUTPUT_DIR/25-NIO.md" "$OUTPUT_DIR/6-IO/" 2>/dev/null
mv "$OUTPUT_DIR/26-Networking.md" "$OUTPUT_DIR/6-IO/" 2>/dev/null
mv "$OUTPUT_DIR/24-File-IO-Continued.md" "$OUTPUT_DIR/6-IO/" 2>/dev/null
mv "$OUTPUT_DIR/24-File-IO-Part3.md" "$OUTPUT_DIR/6-IO/" 2>/dev/null

mv "$OUTPUT_DIR/30-Date-Time.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null
mv "$OUTPUT_DIR/31-Modules.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null
mv "$OUTPUT_DIR/32-Records.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null
mv "$OUTPUT_DIR/33-Sealed-Classes.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null
mv "$OUTPUT_DIR/34-Pattern-Matching.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null
mv "$OUTPUT_DIR/35-Switch-Expressions.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null
mv "$OUTPUT_DIR/36-Text-Blocks.md" "$OUTPUT_DIR/7-Modern-Java/" 2>/dev/null

mv "$OUTPUT_DIR/37-Design-Patterns.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/38-JVM-Performance.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/39-Garbage-Collection.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/40-Security.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/41-JNI.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/42-Unsafe.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/43-VarHandle.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/44-Bytecode.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null
mv "$OUTPUT_DIR/45-GraalVM.md" "$OUTPUT_DIR/8-Advanced/" 2>/dev/null

mv "$OUTPUT_DIR/46-Java5.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/47-Java6.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/48-Java7.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/49-Java8.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/50-Java9.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/51-Java10.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/52-Java11.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/53-Java12-17.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null
mv "$OUTPUT_DIR/54-Java18-Latest.md" "$OUTPUT_DIR/9-Version-History/" 2>/dev/null

log "Organizing into numbered subfolders..."
git add -A
git commit -m "Add Java handbook - $(date +%Y-%m-%d)"
log "Committed to git. All done!"