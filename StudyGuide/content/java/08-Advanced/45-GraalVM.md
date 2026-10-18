# GraalVM

GraalVM is a high-performance, polyglot JDK distribution built around the **Graal JIT compiler** (a Java-written JIT replacing C2) and the **Native Image** ahead-of-time compiler. It offers: faster peak throughput (Graal JIT), ahead-of-time compiled native executables (fast startup, low memory, no warm-up), and polyglot execution (Java, JavaScript/Node, Python, Ruby, R, WebAssembly, C/C++ via LLVM bitcode in one process).

## Graal JIT vs C2

HotSpot's default JIT is C2 (C++, opaque). Graal is a JIT compiler written in Java, modular, and more aggressive with optimizations (partial escape analysis, advanced inlining, vectorization). On `-XX:+UseJVMCICompiler` (JVMCI interface), HotSpot uses Graal instead of C2.

- Graal JIT: available as an Oracle GraalVM component; experimental JVMCI in OpenJDK.
- Benefits: often higher throughput, better optimizations for some workloads.
- Trade-offs: higher compile time/memory, less battle-tested than C2 in some scenarios.

## Native Image

**Native Image** compiles Java bytecode ahead-of-time into a native executable (ELF/PE/Mach-O) via static analysis (reachability from main). Result:
- Fast startup (milliseconds, no JIT warm-up).
- Low memory (no JIT compiler, no class parsing at runtime).
- Ideal for serverless (AWS Lambda, Knative), CLI tools, containers, microservices.

```bash
native-image --no-fallback -H:Name=myapp -cp app.jar com.example.app.Main
./myapp
```

Key flags:
- `--no-fallback` — fail if a runtime fallback is required (ensures AOT purity).
- `-H:Name=` — output executable name.
- `-H:+ReportExceptionStackTraces` — print stack traces at runtime.
- `-H:ReflectionConfigurationFiles=reflect.json` — register reflective access (see below).
- `-H:+AllowIncompleteClasspath` — build with incomplete classpath.

## Closed-world assumption

Native Image analyzes the application **at build time** and includes only reachable classes/methods. Anything not provably reachable is omitted. This breaks:
- **Reflection** on dynamically-loaded classes (must register via JSON configuration).
- **`Class.forName`** with runtime-computed names.
- **`sun.misc.Unsafe`** `defineClass` / runtime class generation.
- **Dynamic proxies** (`java.lang.reflect.Proxy`) — need proxy configuration.
- **JNI** — native libraries must be bundled/linked.
- **Resources** loaded by name — must be marked as reachable resources.

Configuration files (`reflect-config.json`, `resource-config.json`, `jni-config.json`, `proxy-config.json`) list what to preserve.

```json
// reflect-config.json
[
  {"name":"com.example.app.Config","allDeclaredConstructors":true,"allPublicMethods":true}
]
```

## Polyglot (Truffle)

GraalVM's **Truffle** framework lets languages implement AST interpreters that Graal JIT-compiles. A single GraalVM can run Java, JavaScript (Node.js compatible), Python, Ruby, R, and WebAssembly, sharing objects and calling across languages with low overhead.

```java
// Host Java calling JavaScript via polyglot API
import org.graalvm.polyglot.*;

Context ctx = Context.create();
Value js = ctx.eval("js", "function add(a,b){return a+b;} add");
int result = js.execute(1, 2).asInt(); // 3
```

Use cases: embedding a rules engine (JS), embedded Python for data science, DSLs.

## Native Image limitations & configuration

- No `sun.misc.Unsafe` `defineClass`/`allocateInstance` (some supported via `--allow-incomplete-classpath`/`H:` flags; prefer `VarHandle`/`MemorySegment`).
- No dynamic class loading (`URLClassLoader` adding jars at runtime is restricted).
- Reflection must be registered.
- Serialization frameworks relying on `Unsafe.allocateInstance` need configuration.
- GraalVM supports `java.util.logging`, `javax.crypto`, common JDK APIs.

## GraalVM vs OpenJDK HotSpot

| | OpenJDK HotSpot | GraalVM |
|---|-----------------|---------|
| JIT | C2 (C++) | Graal (Java, optional via JVMCI) |
| Startup | JIT warm-up needed | Native Image: instant |
| Memory | Higher (JIT + class parsing) | Native Image: lower |
| Peak throughput | Very good (C2) | Often better (Graal) |
| Polyglot | No | Yes (Truffle) |
| AOT native exe | No | Yes (Native Image) |
| Maturity | Highest | High (Native Image production-ready) |

## When to use GraalVM Native Image

- Serverless functions (fast start, low memory = lower cost).
- CLI tools (instant start).
- Containers/microservices (small image, fast scale-up).
- When you control all entry points and can configure reflection/resources.

## When NOT to use Native Image

- Heavy reflection/`Class.forName` with dynamic names (hard to configure).
- Dynamic class loading / OSGi / JSP-like runtime compilation.
- Heavy `sun.misc.Unsafe` use.
- Long-running servers where warm-up is acceptable and peak throughput matters more (HotSpot C2 is fine).

## Common mistakes

- Forgetting reflection/resource configuration → runtime `NoSuchMethodException`/`ClassNotFoundException` in native image.
- Using `Class.forName` with computed strings.
- Expecting JIT warm-up behavior in native image (there is none).
- Bundling native libraries without `jni-config`.

# Interview Questions

## Beginner

**Q1. What is GraalVM?**

A high-performance JDK distribution built around the Graal JIT compiler, Native Image (AOT), and Truffle polyglot runtime.

**Q2. What is Native Image?**

An ahead-of-time compiler that turns Java bytecode into a native executable (fast startup, low memory, no warm-up).

**Q3. What is the Graal JIT?**

A JIT compiler written in Java (replacing C2 in HotSpot via JVMCI) with aggressive optimizations.

**Q4. What is Truffle?**

A framework for building languages whose AST interpreters Graal JIT-compiles; enables polyglot execution.

**Q5. What is the closed-world assumption?**

Native Image analyzes the whole app at build time and includes only reachable code; dynamic features (reflection, `Class.forName`) must be registered.

## Intermediate

**Q6. What is JVMCI?**

The JVM Compiler Interface — lets HotSpot use a Java-based JIT (Graal) instead of C2.

**Q7. What is a Native Image configuration file?**

JSON files (`reflect-config.json`, `resource-config.json`, etc.) telling the builder what reflective members, resources, JNI, or proxies to preserve.

**Q8. What is `--no-fallback`?**

Fail the native-image build if a runtime fallback would be needed (guarantees a pure AOT executable).

**Q9. What is a polyglot call?**

Calling a function written in another language (JS/Python/R) from Java in the same GraalVM context via the Polyglot API.

**Q10. Does Native Image need a JVM at runtime?**

No — the native executable runs directly (the needed VM components are linked in).

## Advanced

**Q11. How does Native Image handle reflection?**

Only reflected members listed in `reflect-config.json` are preserved; everything else is stripped (closed-world assumption).

**Q12. What is `--allow-incomplete-classpath`?**

Permits building when the classpath is incomplete (classes may be supplied at runtime); use with care.

**Q13. Can Native Image run Spring Boot?**

Yes — Spring Boot 3+ has native support (Spring AOT, `spring-boot-maven-plugin` generates the config), but you still need to register reflection for proxies/lambdas.

**Q14. What is the difference between Graal JIT and Native Image?**

Graal JIT is a just-in-time compiler (runs in the JVM); Native Image is ahead-of-time (produces a native executable).

**Q15. Is GraalVM a different language?**

No — it runs Java (and other languages via Truffle); Java source compiles to the same bytecode.

## Expert

**Q16. How do you debug a Native Image?**

Use `-H:+ReportExceptionStackTraces`, build with debug info (`-H:+DebugInfo`), use standard native debuggers (`gdb`, `lldb`), and enable traces.

**Q17. What is a "substrate VM"?**

The runtime embedded in a Native Image (GC, thread scheduler, class system) — the successor concept is the Native Image runtime.

**Q18. Can you use reflection in Native Image?**

Yes, but only for members registered in `reflect-config.json` (or via `@ReflectionMarker`/reachability metadata).

**Q19. What is the `svm` entry point?**

The Native Image runtime entry (`org.graalvm.nativeimage.ImageSingletons`, `com.oracle.svm.core...`) — internal, not for application use.

**Q20. How does GraalVM handle JNI in Native Image?**

Via `jni-config.json` listing native methods; native libraries must be shipped and linked.

## Scenario Based

**Q21. You are deploying a function to AWS Lambda. HotSpot JAR or Native Image?**

Native Image — millisecond cold start and low memory reduce cost and latency.

**Q22. You are building a CLI tool users download.**

Native Image — instant start, single executable, no JRE install needed.

**Q23. Your app uses heavy reflection and `Class.forName` with runtime names.**

Native Image is painful (must enumerate everything); use HotSpot JAR instead.

**Q24. You need to run Python and Java in the same process.**

GraalVM polyglot (Truffle) — embed Python via the Polyglot API.

**Q25. You want peak throughput for a long-running server.**

HotSpot with C2 (or Graal JIT via JVMCI) — Native Image's lack of warm-up is less valuable than C2's long-term peak optimization.

## Output Prediction

**Q26. What does Native Image eliminate at runtime?**

JIT compilation, class loading/verification of unused code, and warm-up — producing faster startup and lower memory.

**Q27. Will `Class.forName("com.example.SomeRuntimeClass")` work in Native Image?**

Only if `com.example.SomeRuntimeClass` is reachable/registered; otherwise `ClassNotFoundException` at runtime (closed world).

**Q28. What is the output of `native-image` by default?**

A native executable (no `.jar`/`.class` needed at runtime) — e.g., `myapp`.

**Q29. Does Native Image support `sun.misc.Unsafe` `allocateInstance`?**

Partially/restricted; many Unsafe operations are unsupported — migrate to `VarHandle`/`MemorySegment`.

**Q30. Can a Native Image run on a machine without GraalVM installed?**

Yes — it's a self-contained native executable.

## Internal Working

**Q31. How does Native Image determine reachability?**

Static analysis from `main` (and entry points), following `new`, `invoke`, reflection registrations, resources, and JNI.

**Q32. What is a "reachability metadata" file?**

JSON describing what to keep (reflection, resources, proxies, JNI) for the closed-world build.

**Q33. Does Graal JIT compile all methods?**

No — it compiles hot methods (like C2); rarely-used methods stay interpreted.

**Q34. Can Native Image and HotSpot coexist?**

Yes — install both; use `native-image` tool from GraalVM, run JARs with HotSpot.

**Q35. What is the Polyglot API?**

`org.graalvm.polyglot.Context` / `Value` — evaluates and calls code in guest languages from Java.

## Tricky Questions

**Q36. Is Native Image faster than HotSpot at peak throughput?**

Usually HotSpot C2/Graal JIT wins on long-running peak throughput; Native Image wins on startup/memory.

**Q37. Can Native Image load a `.jar` at runtime?**

Not dynamically (classpath is fixed at build); resources embedded in the image are accessible.

**Q38. Does Native Image support reflection on JDK classes?**

Only if configured in `reflect-config.json` (JDK reflection is heavily restricted).

**Q39. Is GraalVM free?**

GraalVM Community Edition is open source (GPLv2 with Classpath exception); Oracle GraalVM Enterprise has additional features/SLA.

**Q40. What is `image-singletons`?**

Internal Native Image singleton registry (`org.graalvm.nativeimage.ImageSingletons`) — not for application code.