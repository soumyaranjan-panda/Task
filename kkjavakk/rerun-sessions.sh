#!/bin/bash
set -o pipefail

# ==========================================
# Rerun Java Handbook Sessions - Write Notes
# ==========================================

MAX_JOBS=5
OUTPUT_DIR="./rerun-output"
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

rerun_session() {
    local SESSION_ID="$1"
    local SECTION="$2"
    local FILE="$OUTPUT_DIR/$SECTION.md"

    while (( $(jobs -rp | wc -l) >= MAX_JOBS )); do
        sleep 1
    done

    log "Starting: $SECTION ($SESSION_ID)"

    opencode run \
        -s "$SESSION_ID" \
        --auto \
        "The previous output for this section was accidentally deleted. Please rewrite the complete notes for this section from scratch and save it to $FILE. Cover everything in detail with examples, diagrams (Mermaid), internal workings, edge cases, common mistakes, best practices, performance implications, comparison tables, and interview tips." \
        >>"$OUTPUT_DIR/run.log" 2>&1

    if [ $? -eq 0 ]; then
        log "Done: $SECTION"
    else
        log "FAILED: $SECTION (see errors.log)"
    fi &
}

log_section "Rerunning Java Handbook Sessions"

rerun_session "ses_07f849110ffe56Ql8MMoU2VMUI" "Java-11-Handbook"
rerun_session "ses_07f87c9c7ffeofYBJUdLH9bbzW" "Java-9-Handbook"
rerun_session "ses_07f856d55ffe32NRh0e7txK1us" "Java-10-Section"
rerun_session "ses_07f8243edffen7dhivT4V91llJ" "Java-18-Latest"
rerun_session "ses_07f88930dffeLJPK02FmQ2vdDw" "Java-8-Handbook"
rerun_session "ses_07f835a06ffe7TY46Ebw60A4j0" "Java-12-17-Handbook"
rerun_session "ses_07f890cf7ffedE3i3bxJkw2kje" "Java-7-Section"
rerun_session "ses_07f8a569fffe2LgTZ3oyYiL3xN" "Java-6-Handbook"
rerun_session "ses_07f90f3b4ffee000xanzp7hszf" "Java-VarHandle"
rerun_session "ses_07f8b8cf9ffefD7E9sRJYb2sJ3" "Java5-Section"
rerun_session "ses_07f8d8bb8ffed6LGFzYDDcpCvv" "GraalVM-Section"
rerun_session "ses_07f8f9cecffeLC7D8eRhO6o7w2" "Java-Bytecode"
rerun_session "ses_07f9161d3ffec8Jq7lsfLpY4FY" "Java-JNI"
rerun_session "ses_07f9117afffeMvw01kV2ukl9t9" "Java-Unsafe"
rerun_session "ses_07f94fd63ffew1x4kyqcF4JW20" "Java-Security"
rerun_session "ses_07f9761cdffe2m9VRVOuj9Pl36" "JVM-Performance"
rerun_session "ses_07f96e3dfffeCtd0ZJIZ5NqHUe" "Java-Garbage-Collection"
rerun_session "ses_07f983c96ffeMV4qoacKQL0UR3" "Java-Design-Patterns"
rerun_session "ses_07f9a9862ffeYFNd9UhaTRL1pk" "Pattern-Matching"
rerun_session "ses_07f98a72affe4URkasgpiBlE9m" "Text-Blocks"
rerun_session "ses_07f9edbcbffeV6CS38li7ewEJX" "Java-Date-Time"
rerun_session "ses_07f9924f1ffebkoOBckzGGTXKK" "Switch-Expressions"
rerun_session "ses_07f9bce16ffenqF3w6Haqj8f8l" "Sealed-Classes"
rerun_session "ses_07f9cc133ffem0YJT7xXeFsDnZ" "Java-Records"
rerun_session "ses_07fa5d80cffeXEbbTUlODEt8kC" "Java-File-IO"
rerun_session "ses_07f9d6e46ffe71xQrhL6Lrezj0" "Java-Modules"
rerun_session "ses_07f9f4a20ffeDp98pGzh5FEXRM" "Java-Serialization"
rerun_session "ses_07fa30414ffe4yoGLg8jP06laG" "Networking"
rerun_session "ses_07fa22f76ffeniTH9kQdpdE2yt" "Annotations"
rerun_session "ses_07fa36a82ffevZoHbSPEvMg4Xw" "Java-NIO"
rerun_session "ses_07fa2f546ffeF1Y7UjOVmTTHiY" "Java-Reflection"
rerun_session "ses_07fa6a888ffeH3xVOBN33gMmX7" "Virtual-Threads"
rerun_session "ses_07faa2971ffeZN5eBpmO5lo4li" "Concurrency-Utilities"
rerun_session "ses_07fac0c0dffesqp9nLiEz5QW3Y" "Synchronization"
rerun_session "ses_07fa78977ffeBmMco6ZifZrAfP" "ForkJoin"
rerun_session "ses_07fa694fdffemLbUHEnJdgTmaB" "Java-Memory-Model"
rerun_session "ses_07fa9d720ffesMnaCJ9Xl0IUCA" "CompletableFuture"
rerun_session "ses_07fac3010ffeLcO7pBrspzPM4I" "Java-Threads"
rerun_session "ses_07fab2c61ffeHGo3mydoqQvjqj" "Java-Locks"
rerun_session "ses_07faf31b0ffe8AWg20vtPwokRw" "Java-Collectors"
rerun_session "ses_07fb04ca1ffeheUCaJTgiYDTL2" "Java-Streams"
rerun_session "ses_07fad087fffe5dR7u7HAX05y26" "Java-Optional"
rerun_session "ses_07fb0b3b9ffedwmikDELRa0gEU" "Java-Lambda"
rerun_session "ses_07fbb03fdffeDgj6Jm0r64EAGs" "Java-Fundamentals"
rerun_session "ses_07fb2e393ffeAXumtO0WZBv7cG" "Concurrent-Collections"
rerun_session "ses_07fb39492ffe26DV0X093f016R" "HashMap-Internals"
rerun_session "ses_07fb568f2ffe1792gNcZF41OBt" "Collections-Part1"
rerun_session "ses_07fb535a8ffeQq6sv5vrHvTzze" "Collections-Part2"
rerun_session "ses_07fb71d99ffehrGtxzyH062tS5" "Java-Generics"
rerun_session "ses_07fb73855ffehmEpoC0hUeBPVw" "Exception-Handling"
rerun_session "ses_07fbb0374ffeem6wT8sxbCDGeh" "Java-Memory"
rerun_session "ses_07fbb03d4ffeY0v0Np2Bvtm5Bj" "Java-OOP"
rerun_session "ses_07fbb03a5ffeYSFO3kBc36cUcu" "JVM-Architecture"
rerun_session "ses_07fbb03b9ffeFl8noBFHwlLQBl" "Class-Loading"

wait
50-Java9.md

log_section "Rerun Complete"
echo "Output: $OUTPUT_DIR"
echo "Total files: $(ls $OUTPUT_DIR/*.md 2>/dev/null | wc -l)"
echo "Errors: $(wc -l < $OUTPUT_DIR/errors.log 2>/dev/null || echo 0)"


opencode -s ses_07f849110ffe56Ql8MMoU2VMUI
opencode -s ses_07f87c9c7ffeofYBJUdLH9bbzW
opencode -s ses_07f856d55ffe32NRh0e7txK1us
opencode -s ses_07f8243edffen7dhivT4V91llJ
opencode -s ses_07f88930dffeLJPK02FmQ2vdDw
opencode -s ses_07f835a06ffe7TY46Ebw60A4j0
opencode -s ses_07f890cf7ffedE3i3bxJkw2kje
opencode -s ses_07f8a569fffe2LgTZ3oyYiL3xN
opencode -s ses_07f90f3b4ffee000xanzp7hszf
opencode -s ses_07f8b8cf9ffefD7E9sRJYb2sJ3
opencode -s ses_07f8d8bb8ffed6LGFzYDDcpCvv
opencode -s ses_07f8f9cecffeLC7D8eRhO6o7w2
opencode -s ses_07f9161d3ffec8Jq7lsfLpY4FY
opencode -s ses_07f9117afffeMvw01kV2ukl9t9
opencode -s ses_07f94fd63ffew1x4kyqcF4JW20
opencode -s ses_07f9761cdffe2m9VRVOuj9Pl36
opencode -s ses_07f96e3dfffeCtd0ZJIZ5NqHUe
opencode -s ses_07f983c96ffeMV4qoacKQL0UR3
opencode -s ses_07f9a9862ffeYFNd9UhaTRL1pk
opencode -s ses_07f98a72affe4URkasgpiBlE9m
opencode -s ses_07f9edbcbffeV6CS38li7ewEJX
opencode -s ses_07f9924f1ffebkoOBckzGGTXKK
opencode -s ses_07f9bce16ffenqF3w6Haqj8f8l
opencode -s ses_07f9cc133ffem0YJT7xXeFsDnZ
opencode -s ses_07fa5d80cffeXEbbTUlODEt8kC
opencode -s ses_07f9d6e46ffe71xQrhL6Lrezj0
opencode -s ses_07f9f4a20ffeDp98pGzh5FEXRM
opencode -s ses_07fa30414ffe4yoGLg8jP06laG
opencode -s ses_07fa22f76ffeniTH9kQdpdE2yt
opencode -s ses_07fa36a82ffevZoHbSPEvMg4Xw
opencode -s ses_07fa2f546ffeF1Y7UjOVmTTHiY
opencode -s ses_07fa6a888ffeH3xVOBN33gMmX7
opencode -s ses_07faa2971ffeZN5eBpmO5lo4li
opencode -s ses_07fac0c0dffesqp9nLiEz5QW3Y
opencode -s ses_07fa78977ffeBmMco6ZifZrAfP
opencode -s ses_07fa694fdffemLbUHEnJdgTmaB
opencode -s ses_07fa9d720ffesMnaCJ9Xl0IUCA
opencode -s ses_07fac3010ffeLcO7pBrspzPM4I
opencode -s ses_07fab2c61ffeHGo3mydoqQvjqj
opencode -s ses_07faf31b0ffe8AWg20vtPwokRw
opencode -s ses_07fb04ca1ffeheUCaJTgiYDTL2
opencode -s ses_07fad087fffe5dR7u7HAX05y26
opencode -s ses_07fb0b3b9ffedwmikDELRa0gEU
opencode -s ses_07fbb03fdffeDgj6Jm0r64EAGs
opencode -s ses_07fb2e393ffeAXumtO0WZBv7cG
opencode -s ses_07fb39492ffe26DV0X093f016R
opencode -s ses_07fb568f2ffe1792gNcZF41OBt
opencode -s ses_07fb535a8ffeQq6sv5vrHvTzze
opencode -s ses_07fb71d99ffehrGtxzyH062tS5
opencode -s ses_07fb73855ffehmEpoC0hUeBPVw
opencode -s ses_07fbb0374ffeem6wT8sxbCDGeh
opencode -s ses_07fbb03d4ffeY0v0Np2Bvtm5Bj
opencode -s ses_07fbb03a5ffeYSFO3kBc36cUcu
opencode -s ses_07fbb03b9ffeFl8noBFHwlLQBl