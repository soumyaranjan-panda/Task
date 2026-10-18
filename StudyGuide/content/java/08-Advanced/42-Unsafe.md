# sun.misc.Unsafe

`sun.misc.Unsafe` is an internal, unsupported JDK class providing low-level operations: direct memory allocation/access, CAS (compare-and-swap), object field offsets, `allocateInstance` (no constructor), `throwException`, `park`/`unpark`, fences, and array base offsets. It underpins `java.util.concurrent` atomics, `java.lang.invoke.VarHandle`, and off-heap memory. It is **not** for application code: access is restricted (only JDK classes in `java.base` can load it via the caller check), it can crash the JVM, and it is not portable. Since Java 17 strong encapsulation blocks direct use (`--add-opens java.base/jdk.internal.misc=ALL-UNNAMED` as a stopgap).

## What Unsafe provides

- `allocateInstance(Class)` — allocate an object without running any constructor (used by serialization frameworks, mock libraries).
- `objectFieldOffset(Field)` / `staticFieldOffset(Field)` — memory offset of a field (for CAS-based atomics).
- `compareAndSwapObject/Int/Long(Object, long offset, long expect, long update)` — atomic CAS on an object field at a given offset.
- `putInt/Long/Object(Object, long offset, long value)` / `getInt/Long/Object` — direct field access bypassing access control.
- `allocateMemory(long bytes)` / `reallocateMemory` / `freeMemory` / `setMemory` / `copyMemory` — off-heap (native) memory.
- `addressSize()` / `arrayBaseOffset(Class)` / `arrayIndexScale(Class)` — array memory layout.
- `park(boolean, long)` / `unpark(Thread)` — thread parking (underpins `LockSupport`, `java.util.concurrent.locks`).
- `loadFence`/`storeFence`/`fullFence` — memory barriers.
- `throwException(Throwable)` — throw a checked exception without declaring it.
- `defineClass` / `defineAnonymousClass` — define classes (JDK internal).

```java
// Accessing Unsafe (reflection — JDK-restricted)
import sun.misc.Unsafe;
import java.lang.reflect.Field;

public class UnsafeDemo {
    private static final Unsafe UNSAFE;
    static {
        try {
            Field f = Unsafe.class.getDeclaredField("theUnsafe");
            f.setAccessible(true);
            UNSAFE = (Unsafe) f.get(null);
        } catch (Exception e) { throw new Error(e); }
    }

    public static void main(String[] args) {
        // allocateInstance without constructor
        Object o = UNSAFE.allocateInstance(String.class);
        System.out.println("allocated: " + (o == null ? "null" : o.getClass().getName()));

        // off-heap memory
        long addr = UNSAFE.allocateMemory(1024);
        try {
            UNSAFE.setMemory(addr, 1024, (byte) 0);
            UNSAFE.putInt(addr, 0, 42);
            System.out.println("offheap int: " + UNSAFE.getInt(addr, 0));
        } finally {
            UNSAFE.freeMemory(addr);
        }
    }
}
```

Output:

```
allocated: java.lang.String
offheap int: 42
```

Note: Accessing `Unsafe` from application code triggers `SecurityException`/`InaccessibleObjectException` in modern JDKs; the above requires `--add-opens java.base/jdk.internal.misc=ALL-UNNAMED` and the class on the classpath/bootclasspath.

## What Unsafe is used for (internally)

- `java.util.concurrent.atomic.*` (`AtomicInteger`, `AtomicReference`, `LongAdder`) — CAS via `objectFieldOffset`.
- `java.util.concurrent.locks.LockSupport.park/unpark` — `park`/`unpark`.
- Serialization frameworks (Kryo, Objenesis) — `allocateInstance`.
- Off-heap caches / direct memory (before `ByteBuffer`/`MemorySegment`).

## Dangers

- **JVM crashes**: invalid addresses, wrong offsets, type mismatches segfault the JVM.
- **No GC tracking**: off-heap memory (`allocateMemory`) is NOT garbage-collected; you must `freeMemory` or leak.
- **Bypasses type safety**: `putObject` with the wrong type corrupts the heap.
- **Not portable**: offsets and layout differ across JVMs/architectures; `Unsafe` may be removed or restricted in future releases.
- **Strong encapsulation**: blocked by JPMS in Java 9+.

## Alternatives

- Off-heap memory: `ByteBuffer.allocateDirect`, Panama `MemorySegment` (module 45).
- Atomic fields: `java.util.concurrent.atomic`, `VarHandle` (module 43).
- Object instantiation: constructors, `Constructor.newInstance`, serialization.
- Thread parking: `LockSupport` (public API over `Unsafe.park`).

# Interview Questions

## Beginner

**Q1. What is `sun.misc.Unsafe`?**

An internal JDK class providing low-level operations (memory, CAS, field offsets, parking) used by the JDK itself; unsupported and restricted.

**Q2. Is `Unsafe` part of the public Java API?**

No — it's in `sun.misc`, not `java.*`, and access is blocked by strong encapsulation in Java 9+.

**Q3. What does `allocateInstance` do?**

Allocates an object without running its constructor.

**Q4. Why is `Unsafe` dangerous?**

It can crash the JVM (invalid memory access), bypass type safety and GC tracking, and is not portable across JVMs.

**Q5. What does `compareAndSwapObject` do?**

Atomically compares and swaps an object field at a given offset — the basis of `java.util.concurrent.atomic`.

## Intermediate

**Q6. How do you obtain `Unsafe`?**

Reflectively read `Unsafe.theUnsafe` (restricted; only JDK-internal code can access it directly).

**Q7. What is `objectFieldOffset` used for?**

Gets a field's memory offset so CAS operations can target that field directly (used by atomic classes).

**Q8. What is off-heap memory in `Unsafe`?**

`allocateMemory`/`freeMemory` allocate native (non-heap) memory not managed by the GC — you must free it manually.

**Q9. What does `park`/`unpark` do?**

Blocks/unblocks a thread (used by `LockSupport` and `java.util.concurrent.locks`).

**Q10. Why can't application code use `Unsafe` in Java 17+?**

Strong encapsulation (JPMS) blocks access to `sun.misc`; only `--add-opens` can relax it (discouraged).

## Advanced

**Q11. How do `AtomicInteger` and `Unsafe` relate?**

`AtomicInteger` uses `Unsafe.objectFieldOffset` + `compareAndSwapInt` for lock-free increments.

**Q12. What is `throwException` used for?**

Throws a `Throwable` without declaring it (bypasses checked-exception rules); used internally.

**Q13. What is `defineClass` in `Unsafe`?**

Defines a class from bytes (JDK internal; used by class loaders/reflection internally).

**Q14. Is `Unsafe` available on all JVMs?**

No — it's a HotSpot/OpenJDK internal; other JVMs may not have it.

**Q15. What is `arrayBaseOffset` / `arrayIndexScale`?**

The memory offset of an array's first element and the scale (bytes per element) — used to compute field addresses for primitive arrays.

## Expert

**Q16. Can `Unsafe` access private fields?**

Yes — `putObject`/`getInt` etc. bypass access control via field offsets.

**Q17. Is off-heap memory garbage-collected?**

No — `allocateMemory` memory must be freed with `freeMemory` manually.

**Q18. What is `fullFence`/`loadFence`/`storeFence`?**

Memory barriers (JMM) to enforce ordering without full synchronization.

**Q19. Will `Unsafe` be removed?**

It's deprecated/ discouraged; the JDK is migrating users to public APIs (`VarHandle`, `MemorySegment`, `VarHandle`). Direct use is increasingly blocked.

**Q20. What replaces `Unsafe` for off-heap memory?**

`ByteBuffer.allocateDirect` and Panama `MemorySegment` (module 45).

## Scenario Based

**Q21. You need off-heap memory for a large cache. `Unsafe` or `ByteBuffer`/`MemorySegment`?**

Prefer `ByteBuffer.allocateDirect` or Panama `MemorySegment`; avoid `Unsafe` (unsupported, unsafe).

**Q22. A library uses `Unsafe` and breaks on Java 17.**

Add `--add-opens java.base/jdk.internal.misc=ALL-UNNAMED` temporarily, or migrate the library to public APIs (`VarHandle`, `MemorySegment`).

**Q23. You need lock-free atomic updates to an object field.**

Use `java.util.concurrent.atomic.AtomicReferenceFieldUpdater` or `VarHandle` — not raw `Unsafe`.

**Q24. You need to instantiate a class without calling its constructor.**

Use `Unsafe.allocateInstance` (frameworks only) or `Constructor.newInstance` / serialization; prefer constructors.

**Q25. You are debugging a JVM segfault in native/JNI code.**

Suspect `Unsafe`/native memory corruption; get a core dump, reproduce with `-Xcheck:jni`, and isolate the unsafe/native section.

## Output Prediction

**Q26. What does this print?**

```java
import sun.misc.Unsafe;
public class Q26 {
    public static void main(String[] args) throws Exception {
        Field f = Unsafe.class.getDeclaredField("theUnsafe");
        f.setAccessible(true);
        Unsafe u = (Unsafe) f.get(null);
        System.out.println(u.addressSize());
    }
}
```

**Output:**
```
8   (on a 64-bit JVM; 4 on 32-bit)
```

**Reason:** `addressSize()` returns the native address size (4 or 8 bytes). Requires `--add-opens` on JDK 9+.

**Q27. What happens if you call `allocateMemory(0)`?**

It returns a non-null address (implementation-defined) or a minimal allocation; you must still `freeMemory` it.

**Q28. Does `allocateInstance` run constructors?**

No — the object is allocated with default field values; no constructor runs.

**Q29. Is off-heap memory from `Unsafe.allocateMemory` garbage-collected?**

No — it is native memory; you must call `freeMemory` or leak it.

**Q30. What is `arrayIndexScale(int[].class)`?**

Typically 4 (bytes per `int` element); used to compute element addresses.

## Internal Working

**Q31. How does `Unsafe` restrict access to itself?**

The `theUnsafe` field is set only by the VM during initialization for the bootstrap class loader; `getUnsafe()` (older) checked the caller's class loader.

**Q32. How does `compareAndSwapInt` work?**

It issues a hardware CAS (e.g., `cmpxchg` on x86) on the object field at the given offset, with a full memory barrier.

**Q33. Does `Unsafe.park` require a lock held?**

No — `park` blocks the thread until `unpark` is called or a timeout/interrupt occurs (like `LockSupport`).

**Q34. Can `Unsafe` allocate objects with final fields?**

`allocateInstance` bypasses constructors, so `final` fields are default-valued; mutating them later via `Unsafe` is possible but fragile/unspecified.

**Q35. What is `theUnsafe`?**

The single `Unsafe` instance created by the JVM at startup; exposed only to trusted JDK code.

## Tricky Questions

**Q36. Is `Unsafe` part of the Java SE specification?**

No — it's an internal implementation detail of HotSpot/OpenJDK.

**Q37. Can `Unsafe` cause a memory leak?**

Yes — off-heap `allocateMemory` without `freeMemory` leaks native memory.

**Q38. Is `Unsafe` faster than `VarHandle`?**

Comparable for atomic ops; `VarHandle` is the supported, JIT-friendly successor.

**Q39. Does `Unsafe` work with `java.lang.invoke`?**

They're complementary: `VarHandle` (module 43) is the supported API; `Unsafe` is the legacy internal it often replaces.

**Q40. What is the biggest risk of production `Unsafe` use?**

JVM crashes and breakage across JDK releases (it's unsupported and may change or be removed).