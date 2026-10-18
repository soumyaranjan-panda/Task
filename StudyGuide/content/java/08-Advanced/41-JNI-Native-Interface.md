# JNI (Java Native Interface)

JNI lets Java code call native code (C/C++) and native code call Java. It is used for performance-critical sections, accessing OS/hardware features, and integrating legacy native libraries. JNI breaks Java's safety guarantees: native code can crash the JVM (segfault), bypass access control, and leak memory. Use it sparingly; prefer pure Java, `VarHandle`/`MethodHandle`, or Panama (FFM) first.

## The JNI model

- Java side: declare `native` methods, load the native library (`System.loadLibrary("mylib")` or `System.load("/path/libmylib.so")`).
- Native side: implement functions with the `Java_<package>_<class>_<method>` naming convention, receiving `JNIEnv*` and `jobject` (or `jclass` for static).
- Types map: `jint`, `jlong`, `jdouble`, `jobject`, `jstring`, `jclass`, `jarray`, `jbooleanArray`, etc.
- References: local (auto-freed when native method returns), global (`NewGlobalRef`/`DeleteGlobalRef`, manual), weak global.

```java
// Java side
public class NativeDemo {
    static { System.loadLibrary("nativedemo"); }
    public native int add(int a, int b);
    public native String greet(String name);
    public static void main(String[] args) {
        NativeDemo d = new NativeDemo();
        System.out.println(d.add(2, 3));        // 5
        System.out.println(d.greet("Ada"));     // Hello, Ada
    }
}
```

```c
/* C side (generated header via javac -h) */
#include <jni.h>
#include "NativeDemo.h"

JNIEXPORT jint JNICALL Java_NativeDemo_add(JNIEnv *env, jobject obj, jint a, jint b) {
    return a + b;
}

JNIEXPORT jstring JNICALL Java_NativeDemo_greet(JNIEnv *env, jobject obj, jname) {
    const char *c = (*env)->GetStringUTFChars(env, name, NULL);
    char buf[128];
    snprintf(buf, sizeof(buf), "Hello, %s", c);
    (*env)->ReleaseStringUTFChars(env, name, c);
    return (*env)->NewStringUTF(env, buf);
}
```

## Critical rules

- **Release what you get**: `GetStringUTFChars`/`ReleaseStringUTFChars`, `GetArrayElements`/`ReleaseArrayElements`, `GetPrimitiveArrayCritical`/`ReleasePrimitiveArrayCritical`. Forgetting leaks memory.
- **Local references**: valid only during the native call; use `DeleteLocalRef` or `PushLocalFrame`/`PopLocalFrame` in loops creating many locals.
- **No exceptions propagation**: check `ExceptionOccurred`/`ExceptionDescribe`/`ExceptionClear` after JNI calls that can throw.
- **Thread attachment**: native threads must `AttachCurrentThread` before calling JNI; detach when done (`DetachCurrentThread`).
- **`jstring` is not `char*`**: use `GetStringUTFChars`/`GetStringRegion`; never cast `jstring` to `char*`.

## Performance & safety

- JNI calls have overhead (transition, validation). Fine-grained JNI in a hot loop is slower than pure Java.
- Native code can corrupt the JVM (invalid pointers, buffer overruns) — no safety net.
- Prefer alternatives: pure Java, `VarHandle`/`MethodHandle` (module 43), Panama Foreign Function & Memory API (module 45, Java 20+ preview/22+).

## Alternatives

- **JNA**: simpler, no header generation, but slower (reflection-based).
- **Panama FFM (`java.lang.foreign`)**: modern, safer, better performance than JNI; `MemorySegment`, `Linker`, `FunctionDescriptor` (Java 22+ finalized; preview 19–21).

## Common mistakes

- Forgetting `ReleaseStringUTFChars` → memory leak.
- Casting `jstring` to `char*`.
- Calling JNI from an unattached native thread.
- Throwing exceptions across the JNI boundary without clearing them.
- Using JNI where pure Java suffices (maintenance burden, portability).

# Interview Questions

## Beginner

**Q1. What is JNI?**

Java Native Interface — a framework for Java code to call native (C/C++) code and vice versa.

**Q2. How do you load a native library in Java?**

`System.loadLibrary("name")` (searches `java.library.path`) or `System.load("/absolute/path")`.

**Q3. What is a `native` method?**

A method declared without a body, implemented in native code.

**Q4. What are the two parameters every native method receives?**

`JNIEnv*` (interface pointer to JNI functions) and `jobject` (the `this` instance, or `jclass` for static methods).

**Q5. Why is JNI dangerous?**

Native code can crash the JVM (segfault), bypass Java access control, and leak memory — no safety net.

## Intermediate

**Q6. Local vs global vs weak global references?**

Local: auto-freed when the native method returns. Global: manual (`NewGlobalRef`/`DeleteGlobalRef`), lives until explicitly deleted. Weak global: GC-collectible.

**Q7. Why must you call `ReleaseStringUTFChars`?**

`GetStringUTFChars` pins/copies string data; not releasing leaks memory and can block GC.

**Q8. Can a native thread call JNI directly?**

No — it must `AttachCurrentThread` first, then `DetachCurrentThread` when done.

**Q9. What is `javac -h` used for?**

Generates JNI C header files (function signatures) from a class with `native` methods.

**Q10. What happens if a JNI call throws a Java exception?**

Check `ExceptionOccurred`; clear with `ExceptionClear` before making further JNI calls.

## Advanced

**Q11. `GetPrimitiveArrayCritical` vs `GetArrayElements`?**

Critical: may return a direct pointer (no copy) but the thread must not block while holding it; faster but more restrictive.

**Q12. How do native threads attach to the JVM?**

`JavaVM*` → `AttachCurrentThread` → get `JNIEnv*` → work → `DetachCurrentThread`.

**Q13. Can native code call back into Java?**

Yes — via `JNIEnv` (`FindClass`, `GetMethodID`, `CallObjectMethod`, etc.) using stored global references to classes/methods/objects.

**Q14. What is `RegisterNatives`?**

Registers native method implementations explicitly (by name/function pointer) instead of relying on the naming convention/dynamic lookup.

**Q15. Is JNI portable across JVMs?**

The API is standardized, but native libraries are platform-specific (.so/.dll/.dylib) and must be compiled per architecture/OS.

## Expert

**Q16. When would you use JNI over pure Java?**

Performance-critical loops (after profiling), OS/hardware access not available in Java, integrating legacy C/C++ libraries.

**Q17. JNA vs JNI?**

JNA: simpler (no headers/compile step), uses reflection, slower. JNI: faster, more control, more complex.

**Q18. Panama FFM vs JNI?**

Panama (`java.lang.foreign`) is safer, easier, and often faster than JNI; it's the modern replacement (Java 22+).

**Q19. What is `jlong` on a 32-bit JVM?**

Still 64-bit (JNI types are fixed-width regardless of platform).

**Q20. Can JNI access private Java members?**

Yes — native code bypasses Java access control (another reason to minimize JNI).

## Scenario Based

**Q21. You need to call a C crypto library from Java.**

Use Panama FFM (preferred) or JNI; wrap in a small Java facade; load the native lib via `System.loadLibrary`.

**Q22. Your native method crashes the JVM with a segfault.**

Debug with a core dump / `gdb`; check for null `jstring`, missing releases, buffer overruns, invalid references.

**Q23. You need to call Java from a C callback.**

Store a `jobject`/`jclass` global reference (`NewGlobalRef`) and invoke methods via `JNIEnv` from the callback thread (attach first if native thread).

**Q24. JNI call overhead is high in a hot loop.**

Batch work (pass arrays instead of individual elements), reduce JNI crossings, or move the loop to native code entirely.

**Q25. You need native memory (off-heap) in Java.**

Use Panama `MemorySegment` (preferred) or `ByteBuffer.allocateDirect`/`sun.misc.Unsafe` (module 42) rather than JNI `malloc` directly.

## Output Prediction

**Q26. What does this print?**

```java
public class Q26 {
    static { System.loadLibrary("nonexistent"); }
    public static void main(String[] args) {}
}
```

**Output:**
```
Exception in thread "main" java.lang.UnsatisfiedLinkError: no nonexistent in java.library.path
```

**Reason:** `loadLibrary` fails if the native library isn't found.

**Q27. What does this print?**

```java
public class Q27 {
    public native int compute();
    static { System.loadLibrary("mylib"); }
    public static void main(String[] args) {
        Q27 q = new Q27();
        System.out.println(q.compute());
    }
}
```

**Output:**
```
<whatever the native function returns>
```

**Reason:** Depends on the native implementation; demonstrates `native` delegation.

**Q28. What happens if you forget `ReleaseStringUTFChars`?**

Native heap/native memory leak (the pinned UTF-8 buffer is never released), potentially growing until OOM.

**Q29. What does `GetStringUTFChars` return?**

A `const char*` pointer to the string's UTF-8 representation (a copy or pinned pointer), valid until `ReleaseStringUTFChars`.

**Q30. Can `System.loadLibrary` load a `.jar`?**

No — it loads native libraries (`.so`, `.dll`, `.dylib`), not JARs.

## Internal Working

**Q31. How does the JVM find `Java_Class_method` functions?**

It either mangles the class/method name into the expected C symbol (dynamic lookup) or uses `RegisterNatives`.

**Q32. What is `JNIEnv`?**

A pointer to a function table; all JNI operations are called through it (`(*env)->Func(env, ...)`).

**Q33. Is `JNIEnv` thread-safe?**

No — `JNIEnv` is valid only for the thread that attached/created it; don't share across threads.

**Q34. What is `jobject` vs `jclass`?**

`jobject` = instance; `jclass` = class (for static methods, the second param is `jclass`).

**Q35. Do local references survive the native method returning?**

No — they are invalid after the native call returns; use global references for longer life.

## Tricky Questions

**Q36. Can native code throw a Java exception?**

Yes — `ThrowNew`/`Throw` via `JNIEnv`; the exception is pending in Java until caught or cleared.

**Q37. Is `jstring` null-terminated?**

`GetStringUTFChars` returns null-terminated UTF-8, but the string itself may contain embedded nulls (use `GetStringUTFLength`).

**Q38. Do you need `DeleteLocalRef` for every local reference?**

Not strictly (freed at native method return), but in loops creating many locals, use `DeleteLocalRef` or `PushLocalFrame`/`PopLocalFrame` to avoid exhausting the local reference table.

**Q39. Can JNI call a private method?**

Yes — native code bypasses access checks via `GetMethodID`/`Call*Method`.

**Q40. What is `java.library.path`?**

The search path for `System.loadLibrary` (set via `-Djava.library.path=...` or the `PATH`/`LD_LIBRARY_PATH`).