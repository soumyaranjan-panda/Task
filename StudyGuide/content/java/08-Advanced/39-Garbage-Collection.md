# Garbage Collection

Garbage collection (GC) automatically reclaims memory occupied by unreachable objects. This module covers reachability, generations, the collectors (Serial, Parallel, G1, ZGC, Shenandoah, Epsilon), GC tuning, common problems (leaks, pauses, promotion failure), monitoring, and the interplay between GC and application code. GC tuning is empirical — measure with `jstat`, JFR, and GC logs.

## Reachability and roots

An object is **reachable** if there is a path from a GC root:
- Local variables / operand stack of live threads
- Static fields
- JNI handles
- Interned strings, classes, `Class` objects

Objects not reachable from any root are garbage. Note: an object with a `finalize()` method (deprecated) is resurrected once if `finalize` makes it reachable again.

## Generational hypothesis

Most objects die young (weak generational hypothesis). HotSpot divides the heap:
- **Young generation**: Eden + Survivor spaces (S0/S1). Minor GC collects here; survivors are copied and age; after tenuring threshold they promote to old gen.
- **Old generation**: tenured long-lived objects. Major/Full GC collects here (stop-the-world for most collectors).
- **Humongous objects** (G1): objects > half a region, allocated directly in old gen.

## Collectors overview

| Collector | Generations | Compaction | Pauses | Best for |
|-----------|-------------|------------|--------|----------|
| Serial | Yes | Yes | Stop-the-world, single-thread | Small heaps, single-core, CLI tools |
| Parallel (throughput) | Yes | Yes | Stop-the-world, parallel | Batch jobs, throughput-first |
| G1 | Regions (logical gen) | Yes (incremental) | Mostly concurrent, predictable pauses | General purpose, server apps (default JDK 9+) |
| ZGC | Regions | Yes (concurrent) | Sub-millisecond, concurrent | Very large heaps, low-latency (Java 15+) |
| Shenandoah | Regions | Yes (concurrent) | Sub-millisecond, concurrent | Low-latency, large heaps (OpenJDK) |
| Epsilon | No | No | None (no reclamation) | Performance testing, ultra-short-lived jobs |

### Serial GC
Single-threaded, stop-the-world, copying young / mark-sweep-compact old. `-XX:+UseSerialGC`.

### Parallel GC (`-XX:+UseParallelGC`)
Multi-threaded young and old collections, maximizes throughput, larger pauses. Good for batch/throughput workloads.

### G1 (`-XX:+UseG1GC`, default since JDK 9)
Region-based heap (no fixed young/old split), remembered sets (card table) for cross-region references, concurrent marking, incremental compaction (evacuation), predictable pauses via `-XX:MaxGCPauseMillis`. Mixed collections evacuate both young and old regions.

### ZGC (`-XX:+UseZGC`)
Concurrent, region-based, colored pointers, load barriers, sub-millisecond pauses even with TB heaps, concurrent compaction/relocation. JDK 15+.

### Shenandoah
Concurrent compaction with Brooks pointers, sub-millisecond pauses, similar goals to ZGC (OpenJDK, not Oracle JDK).

### Epsilon (`-XX:+UseEpsilonGC`)
No-op allocator, no GC — memory is never reclaimed (OOM when full). For ultra-short-lived jobs or performance baseline testing.

## GC phases

- **Minor/Young GC**: collects Eden; copies live objects to a survivor space or old gen; stop-the-world but fast.
- **Old/Marking (G1 concurrent mark)**: marks reachable objects concurrently with application threads.
- **Mixed GC (G1)**: collects young + selected old regions (based on garbage density and pause goal).
- **Full GC**: stop-the-world, collects entire heap; indicates trouble (promotion failure, humongous objects, `System.gc()`).

## GC tuning flags

| Flag | Purpose |
|------|---------|
| `-Xms` / `-Xmx` | initial / max heap |
| `-XX:MaxGCPauseMillis=200` | G1 pause target (ms) |
| `-XX:+UseG1GC` / `-XX:+UseZGC` | select collector |
| `-XX:+PrintGCDetails` / `-Xlog:gc*` | GC logging (JDK 9+ unified logging) |
| `-XX:+HeapDumpOnOutOfMemoryError` | dump on OOM |
| `-XX:SurvivorRatio` / `-XX:NewRatio` | generation sizing (legacy collectors) |
| `-XX:InitiatingHeapOccupancyPercent` | G1 concurrent-mark start (default 45%) |
| `-XX:+UseStringDeduplication` | G1 string dedup |

## Common GC problems

- **Promotion failure**: young objects can't fit in survivor/old → Full GC. Fix: increase old gen, reduce tenuring threshold.
- **Humongous objects**: >50% region allocated directly old; can fragment and trigger Full GC. Avoid large arrays; use off-heap.
- **GC overhead limit exceeded**: >98% time in GC, <2% heap recovered → `OutOfMemoryError: GC overhead limit exceeded`.
- **Memory leak (retention)**: objects unintentionally kept reachable (static collections, listeners, ThreadLocals, classloader leaks) → heap grows until OOM.
- **Explicit `System.gc()`**: triggers Full GC; disable with `-XX:+DisableExplicitGC` (common in app servers).

## Monitoring

```bash
jstat -gcutil <pid> 1s          # GC utilization per second
jcmd <pid> GC.heap_info         # heap regions
jmap -histo <pid> | head -20    # top object types
jcmd <pid> GC.heap_dump /tmp/dump.hprof  # heap dump (analyze with MAT/Eclipse)
-Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=10M  # unified logging
```

## Object lifecycle & cost

- Allocation: bump-the-pointer in TLAB (~10 ns), very cheap.
- Minor GC: proportional to live young set, not total heap.
- Full GC: proportional to whole heap; pause can be seconds for large heaps without concurrent compaction.

## Comparison table

| Collector | Pause | Concurrency | Heap size | Throughput |
|-----------|-------|-------------|-----------|------------|
| Serial | STW single thread | No | Small | Low |
| Parallel | STW parallel | Partial (mark) | Medium–Large | High |
| G1 | Mostly concurrent | Yes | Medium | Good |
| ZGC | Sub-ms | Yes (concurrent) | Very large | Good |
| Shenandoah | Sub-ms | Yes | Large | Good |
| Epsilon | None | N/A | N/A | Max (no GC) |

## Common mistakes

- Calling `System.gc()` in application code.
- Keeping large object graphs in static maps (leaks).
- Not sizing `-Xms`/`-Xmx` equally (resize pauses).
- Tuning GC before profiling (blind flag changes).
- Using `finalize()` (deprecated, unpredictable, slow).

# Interview Questions

## Beginner

**Q1. What is garbage collection?**

Automatic reclamation of memory occupied by unreachable objects (no path from GC roots).

**Q2. What are GC roots?**

Live thread stacks, static fields, JNI handles, interned strings/classes.

**Q3. What is the young generation?**

Eden + survivor spaces; most objects die young (generational hypothesis).

**Q4. What is a Minor GC vs a Full GC?**

Minor = young generation (fast, STW); Full = entire heap (slow, STW for most collectors).

**Q5. What is `-XX:+UseG1GC`?**

Selects the G1 garbage collector (default since JDK 9).

## Intermediate

**Q6. What is promotion?**

Moving objects from young to old generation after surviving enough minor GCs (tenuring threshold).

**Q7. What is a remembered set / card table?**

G1 structures tracking references from old to young regions, so young GC doesn't scan all old gen.

**Q8. What is promotion failure?**

Young objects can't be promoted (old gen full) → triggers Full GC.

**Q9. What is `OutOfMemoryError: GC overhead limit exceeded`?**

JVM spends >98% of time in GC recovering <2% heap — treat as an OOM.

**Q10. What does `-XX:+HeapDumpOnOutOfMemoryError` do?**

Writes a heap dump (`.hprof`) when an OOM occurs, for analysis in Eclipse MAT.

## Advanced

**Q11. How does G1 achieve predictable pauses?**

Region-based heap + concurrent marking + incremental compaction; it collects the "garbage-first" regions and uses `-XX:MaxGCPauseMillis` as a target (not a guarantee).

**Q12. How does ZGC achieve sub-millisecond pauses?**

Concurrent marking, relocation, and compaction with colored pointers and load barriers; application threads barely pause.

**Q13. What is a humongous object?**

>50% of a G1 region; allocated directly in old gen, can cause fragmentation and Full GC.

**Q14. What is string deduplication?**

G1 identifies duplicate `String` char arrays and points them to one array (`-XX:+UseStringDeduplication`).

**Q15. What is `InitiatingHeapOccupancyPercent`?**

Heap occupancy (% of entire heap) at which G1 starts concurrent marking (default 45%).

## Expert

**Q16. G1 vs ZGC: when to use which?**

G1: general-purpose server apps, medium heaps. ZGC: very large heaps (GB–TB) and ultra-low-latency requirements.

**Q17. How do you reduce GC pause times?**

Size heap appropriately, allocate less (pooling, primitives), avoid humongous objects, choose ZGC/Shenandoah for latency, tune `-XX:MaxGCPauseMillis`.

**Q18. What is a classloader leak?**

Classes (and their static fields) stay reachable because the classloader is reachable → metaspace/heap growth on redeploys (common in app servers/OSGi).

**Q19. How do you find a memory leak?**

Heap dump → Eclipse MAT → dominator tree → find the root path retaining objects (static map, listener, ThreadLocal).

**Q20. What is `-XX:+DisableExplicitGC`?**

Ignores `System.gc()` calls (common in app servers/libraries that trigger Full GCs).

## Scenario Based

**Q21. Your app's heap climbs steadily until OOM. What do you do?**

Heap dump → MAT dominator tree → identify the retaining root (static collection, listener, ThreadLocal, classloader) → fix the leak.

**Q22. Full GCs happen every few minutes with long pauses.**

Check promotion failure / humongous objects / explicit `System.gc()` via GC logs; consider increasing old gen or switching to ZGC/Shenandoah.

**Q23. Minor GC is fast but Full GC takes 10 seconds.**

Old generation is large; enable concurrent compaction (ZGC/Shenandoah) or tune G1 mixed collections.

**Q24. You see `GC overhead limit exceeded`.**

Heap too small for live set or a leak; increase heap or fix retention; not purely a flag fix.

**Q25. You need sub-millisecond pauses on a 100 GB heap.**

Use ZGC or Shenandoah (concurrent, region-based).

## Output Prediction

**Q26. What does this print?**

```java
public class Q26 {
    public static void main(String[] args) {
        Object o = new Object();
        o = null;
        System.gc();
        System.out.println("done");
    }
}
```

**Output:**
```
done
```

**Reason:** `System.gc()` is a hint; the object may or may not be collected before `done` prints. Output is "done" regardless.

**Q27. What does this print?**

```java
public class Q27 {
    public static void main(String[] args) {
        Runtime.getRuntime().gc();
        System.out.println(Runtime.getRuntime().maxMemory() / (1024*1024) + "MB");
    }
}
```

**Output:**
```
<max heap in MB>
```

**Reason:** `maxMemory()` returns the max heap (from `-Xmx`), in bytes; divided by MiB.

**Q28. Does `finalize()` run before an object is collected?**

It may run once (deprecated, unpredictable); do not rely on it.

**Q29. What does `jstat -gcutil <pid>` show?**

Percentage of time in each GC phase (YGC, YGCT, FGC, FGCT, GCT) and heap utilization.

**Q30. What is the difference between `jmap -histo` and a heap dump?**

`-histo` gives a live object type histogram (quick); a heap dump (`.hprof`) is a full snapshot for root-path analysis in MAT.

## Internal Working

**Q31. What is a remembered set?**

Per-region set of locations with references from outside the region; lets young GC avoid scanning the whole old gen.

**Q32. What is a card table?**

Byte array where each "card" marks a heap region that may contain young→old references; used to scan only dirty cards.

**Q33. What is tenuring?**

Moving survivors from young to old after surviving N minor GCs (tenuring threshold, `-XX:MaxTenuringThreshold`).

**Q34. What is a collection set (CSet)?**

The set of regions selected for collection in a G1 mixed GC (young + chosen old regions).

**Q35. What is a load barrier (ZGC)?**

Code inserted on reference loads to handle concurrent relocation/colored pointers.

## Tricky Questions

**Q36. Is `System.gc()` guaranteed to run a Full GC?**

No — it's a hint; the JVM may ignore it (especially with `-XX:+DisableExplicitGC`).

**Q37. Can an object be resurrected?**

Yes, once, via `finalize()` (deprecated) making itself reachable again.

**Q38. Is `WeakHashMap` garbage-collected when keys are weakly reachable?**

Yes — entries are removed when the key is only weakly reachable (useful for caches).

**Q39. Does `-XX:+UseParallelGC` compact the old generation?**

Yes — Parallel GC does mark-sweep-compact (stop-the-world, parallel).

**Q40. What is the difference between throughput and pause-time collectors?**

Throughput (Parallel) maximizes work done (longer STW pauses); pause-time (G1/ZGC/Shenandoah) minimizes worst-case pause.