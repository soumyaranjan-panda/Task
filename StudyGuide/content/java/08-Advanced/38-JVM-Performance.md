# JVM Performance & Tuning

JVM performance is determined by how well the runtime maps your Java code to CPU, memory, and cache. This module covers measurement methodology, the execution engine (JIT, inlining, intrinsics, escape analysis), common performance killers (boxing, false sharing, allocation), profiling tooling (`JFR`, `jcmd`, `async-profiler`), and tuning flags. Performance is empirical: measure before you optimize.

## The performance loop

1. Establish a baseline (throughput, latency, GC pause, heap).
2. Profile to find hot spots (CPU, allocation, locks, I/O).
3. Change one thing (code, flags, libraries).
4. Re-measure; keep only what improves the baseline.
5. Beware microbenchmarking pitfalls (JIT warm-up, dead-code elimination, constant folding, bimorphic call sites) — use JMH.

## JIT compilation

HotSpot compiles bytecode to native machine code at runtime:
- **Interpreter**: runs bytecode immediately, no compilation cost, slower execution.
- **C1 (client)**: fast compilation, quick startup, decent optimizations.
- **C2 (server)**: slower compilation, aggressive optimizations (inlining, loop unrolling, vectorization, intrinsics), best peak throughput.
- **Tiered compilation** (default since Java 8): starts interpreted/C1, compiles hot methods to C2.
- Levels 0 (interpreter) to 4 (full C2).

Use `-XX:+PrintCompilation` / `-XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining` to inspect.

## Inlining

The JIT replaces a method call with the method body, removing call overhead and enabling further optimizations. Inlining is limited by method size (`-XX:MaxInlineSize`, `-XX:FreqInlineSize`), virtual call site polymorphism (monomorphic/bimorphic vs megamorphic), and exceptions.

```java
public class InliningDemo {
    public int compute(int x) { return helper(x) + helper(x); }
    public int helper(int x) { return x * 2; }   // likely inlined
    public static void main(String[] args) {
        InliningDemo d = new InliningDemo();
        long sum = 0;
        for (int i = 0; i < 100_000_000; i++) sum += d.compute(i);
        System.out.println("sum=" + sum);
    }
}
```

A megamorphic call site (many implementations) resists inlining; prefer stable types.

## Escape analysis & scalar replacement

The JIT can prove an object does not escape a method and:
- **Scalar replacement**: allocate fields as registers/stack values instead of a heap object.
- **Stack allocation**: allocate on the stack.
- **Lock elision**: remove synchronization on thread-local objects.

`-XX:+DoEscapeAnalysis` (default on). Not guaranteed; avoid letting objects escape (returning them, storing to fields, passing to unknown methods) if you want these optimizations.

## Intrinsics

HotSpot replaces certain JDK methods with hand-written assembly (e.g., `Math.abs`, `String.indexOf`, `ArrayCopy`, `Arrays.equals`). Intrinsics are faster than equivalent Java code; don't try to "outsmart" them.

## Common performance killers

| Killer | Effect | Fix |
|--------|--------|-----|
| Autoboxing | Heap allocation per `int`→`Integer` | primitive collections, `int` streams, avoid boxing in loops |
| Hidden allocation | `String.concat`, `substring` (pre-Java 7), regex | reuse, `StringBuilder`, precompiled `Pattern` |
| Polymorphism (megamorphic) | blocks inlining | stable types, final classes/methods |
| False sharing | threads contend on same cache line | `@Contended`, pad fields, separate hot fields |
| Synchronization contention | lock convoy, context switches | lock stripping, immutability, `LongAdder`, lock-free |
| Exceptions for control flow | stack trace capture is expensive | return `Optional`/sentinel, validate before |
| Reflection | no inlining, access checks | cache `Method`/`Field`, use `MethodHandle` |

### Boxing example

```java
// Bad: boxes every int
Integer sum = 0;
for (int i = 0; i < N; i++) sum += i;

// Better: primitive
int sum = 0;
for (int i = 0; i < N; i++) sum += i;
```

### False sharing

Threads writing to different `long` fields that share a CPU cache line (64 bytes) invalidate each other's caches. `@Contended` (JDK 8+, `-XX:-RestrictContended`) pads fields.

## Allocation & memory

- Object header (~12–16 bytes) + fields + alignment (8-byte). Use JOL (`org.openjdk.jol`) to measure real object sizes.
- TLABs (thread-local allocation buffers) make allocation fast (bump-the-pointer).
- Large arrays go directly to old gen/humongous regions (G1).
- `String` duplication: `String.intern()` for duplicates (costs perm/metaspace), `String` deduplication (`-XX:+UseStringDeduplication`, G1).

## Profiling tooling

| Tool | Purpose |
|------|---------|
| `jcmd <pid> GC.heap_dump` | heap dump |
| `jcmd <pid> Thread.print` | thread dump |
| `jstat -gcutil <pid> 1s` | GC statistics |
| `jmap -histo <pid>` | object histogram |
| JFR (`-XX:StartFlightRecording`) | continuous low-overhead profiling (JDK 11+ free) |
| `async-profiler` | CPU/allocation profiling (safepoint-biased vs async) |
| `javap -c -p -v` | bytecode inspection |

## JMH (Java Microbenchmark Harness)

Always use JMH for microbenchmarks; it handles warm-up, dead-code elimination, constant folding, fork control, and statistics.

```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
public class BoxBench {
    @Benchmark public int sumPrimitive() { int s=0; for(int i=0;i<1000;i++)s+=i; return s; }
    @Benchmark public Integer sumBoxed() { Integer s=0; for(int i=0;i<1000;i++)s+=i; return s; }
}
```

Never write `for (int i=0;i<N;i++) {}` and time it by hand — the JIT may eliminate it.

## Tuning flags

| Flag | Meaning |
|------|---------|
| `-Xms` / `-Xmx` | initial / max heap |
| `-XX:MaxMetaspaceSize` | metaspace cap |
| `-XX:+UseG1GC` / `-XX:+UseZGC` | GC algorithm |
| `-XX:+PrintGCDetails` | GC log |
| `-XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining` | inlining debug |
| `-XX:MaxInlineSize=...` | inline size threshold |
| `-XX:+DoEscapeAnalysis` | escape analysis (default on) |

## Comparison table

| Technique | Cost | Best for |
|-----------|------|----------|
| Interpreter | slow start, slow run | short-lived scripts |
| C1 | fast compile, medium run | tiered, UI |
| C2 | slow compile, fast run | long-running servers |
| Intrinsic | very fast | JDK-provided ops |
| Escape analysis | removes alloc | short-lived method-local objects |

## Common mistakes

- Tuning without a baseline.
- Microbenchmarking without JMH (dead-code elimination).
- Forcing `-server` on clients, `-client` on servers.
- Assuming `StringBuilder` is always faster (small concatenations are optimized by `javac` via `invokedynamic`/`StringConcatFactory` since Java 9).
- Setting `-Xms != -Xmx` in production (causes resize pauses); set them equal.

# Interview Questions

## Beginner

**Q1. What is the JIT compiler?**

It compiles Java bytecode to native machine code at runtime (HotSpot: interpreter → C1 → C2 tiered compilation).

**Q2. What is tiered compilation?**

Running methods interpreted/C1 first, compiling hot methods to C2 for peak throughput; default since Java 8.

**Q3. What is inlining?**

Replacing a method call with the method body; removes call overhead and enables further optimizations.

**Q4. What is escape analysis?**

Proving an object doesn't escape a method, allowing scalar replacement/stack allocation/lock elision.

**Q5. Why use JMH instead of hand-written timing?**

JMH handles warm-up, dead-code elimination, constant folding, and statistics correctly.

## Intermediate

**Q6. What is an intrinsic?**

A JDK method replaced by hand-written assembly in the JVM (e.g., `Math.abs`, `System.arraycopy`).

**Q7. What is false sharing?**

Threads writing to different variables on the same CPU cache line causing cache invalidation; fixed with `@Contended`/padding.

**Q8. What is a TLAB?**

Thread-Local Allocation Buffer — each thread allocates into its own buffer (bump-the-pointer) without locking.

**Q9. What does `-XX:+PrintCompilation` show?**

JIT compilation events (method compiled, level, size, bytescode).

**Q10. Why avoid exceptions for control flow?**

Creating an exception captures a full stack trace, which is expensive.

## Advanced

**Q11. What is scalar replacement?**

Escape-analysis optimization that replaces an object with its fields in registers/stack, avoiding heap allocation.

**Q12. What is lock elision?**

Removing synchronization on objects proven thread-local via escape analysis.

**Q13. What is a megamorphic call site?**

A call site with many receiver types; resists inlining; prefer monomorphic/bimorphic stable types.

**Q14. What is `-XX:+UseStringDeduplication`?**

G1 feature that deduplicates identical `String` char arrays to reduce heap (minor GC overhead).

**Q15. What is JFR?**

Java Flight Recorder — continuous, low-overhead profiling and event recording (free in JDK 11+).

## Expert

**Q16. How do you choose between G1 and ZGC?**

G1: general-purpose, predictable pauses, good for most heaps. ZGC: sub-millisecond pauses, very large heaps, concurrent compaction (Java 15+).

**Q17. How do you reduce GC pressure?**

Allocate less (reuse objects, primitives over boxing), size collections upfront, avoid short-lived large objects.

**Q18. What is safepoint bias in profilers?**

Safepoint-based profilers (e.g., `async-profiler` in some modes) skew toward safepoint polls; use async sampling for accurate CPU profiles.

**Q19. How do you profile allocation?**

`-XX:+PrintGCDetails`, JFR allocation events, `jmap -histo`, `async-profiler` alloc mode.

**Q20. What is deoptimization?**

The JVM reverts compiled code to the interpreter when assumptions (class hierarchy, monomorphism) are violated (uncommon trap).

## Scenario Based

**Q21. Your service has high GC pause times. What do you check first?**

`jstat -gcutil`, heap histogram (`jmap -histo`), JFR recording, then tune generation sizes or switch GC (G1/ZGC).

**Q22. A loop allocates millions of short-lived objects. What do you do?**

Object pooling (careful), reuse buffers, primitives over boxing, escape analysis-friendly code (don't let objects escape).

**Q23. Throughput is low; `-XX:+PrintCompilation` shows little C2 compilation.**

Check tiered compilation is on, methods are warm enough, call sites are monomorphic, and `-XX:CompileThreshold` is appropriate.

**Q24. Two threads update adjacent `long` fields and performance collapses.**

False sharing — separate the fields or annotate with `@Contended`.

**Q25. You need to benchmark two JSON parsers.**

Use JMH with warm-up, multiple forks, realistic payloads, and report mean + confidence interval.

## Output Prediction

**Q26. What does this print?**

```java
public class Q26 {
    static int sink;
    public static void main(String[] args) {
        long t0 = System.nanoTime();
        int sum = 0;
        for (int i = 0; i < 10_000_000; i++) sum += i;
        sink = sum;
        long t1 = System.nanoTime();
        System.out.println("sum=" + sum + " ns=" + (t1-t0));
    }
}
```

**Output:**
```
sum=49999995000000 ns=<varies>
```

**Reason:** Sum of 0..9,999,999 = 49,999,995,000,000. `sink` prevents dead-code elimination.

**Q27. What is wrong with this benchmark?**

```java
public static void main(String[] args) {
    long t0 = System.nanoTime();
    for (int i = 0; i < N; i++) { Math.sin(i); }
    System.out.println(System.nanoTime() - t0);
}
```

**Reason:** No warm-up (JIT not kicked in), no JMH, `Math.sin` may be intrinsic/inlined, result unused (DCE risk), single iteration noise.

**Q28. What does `Integer.sum(1, 2)` do vs `1 + 2`?**

`Integer.sum` boxes/unboxes (`Integer.valueOf`/`intValue`) — slower than primitive `+`.

**Q29. What does `-XX:+UseG1GC` do?**

Selects the Garbage-First collector (region-based, concurrent, predictable pauses).

**Q30. What does `@Contended` do?**

Pads a field to avoid false sharing on CPU cache lines (needs `-XX:-RestrictContended` in JDK 8–15, unrestricted Java 16+).

## Internal Working

**Q31. How does C2 decide what to inline?**

Based on call-site frequency, method size (`MaxInlineSize`/`FreqInlineSize`), call-site polymorphism (monomorphic best), and whether inlining enables further optimizations.

**Q32. What is an uncommon trap?**

Deoptimization point where compiled code bails to the interpreter when a guarded assumption fails (e.g., unexpected class).

**Q33. What is on-stack replacement (OSR)?**

Replacing an interpreted frame with compiled code mid-method (for long-running loops) without restarting.

**Q34. How does escape analysis interact with allocation?**

If an object doesn't escape, the JIT may allocate its fields as scalars or on the stack instead of the heap.

**Q35. What is a safepoint?**

A point where all threads pause for GC, deoptimization, or `jstack`; threads reach safepoints at loop back-edges, method returns, etc.

## Tricky Questions

**Q36. Is `StringBuilder` always faster than `+` concatenation?**

No — `javac` converts `+` in a single expression to `invokedynamic`/`StringConcatFactory` (Java 9+); `StringBuilder` matters in loops.

**Q37. Does `-Xms != -Xmx` matter in production?**

Yes — heap resizing causes pauses; set them equal for predictable behavior.

**Q38. Can the JIT remove your benchmark loop entirely?**

Yes — dead-code elimination; use JMH and a `Blackhole`/sink.

**Q39. Is `Math.abs(Integer.MIN_VALUE)` safe?**

No — it returns `Integer.MIN_VALUE` (overflow), a known intrinsic edge case.

**Q40. What is deoptimization (uncommon trap)?**

Reverting optimized code to the interpreter when a speculative assumption is violated.