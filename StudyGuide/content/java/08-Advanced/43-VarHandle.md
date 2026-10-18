# VarHandle & MethodHandles

`java.lang.invoke.VarHandle` (Java 9) and `java.lang.invoke.MethodHandle` (Java 7) are the supported, JIT-friendly successors to `sun.misc.Unsafe` for low-level field/array access and method invocation. `VarHandle` gives typed, access-mode–based access to fields and array elements with full control over memory ordering (volatile, acquire, release, opaque, plain). `MethodHandle` is a typed, directly executable reference to a method, constructor, or field, used by `invokedynamic` (lambdas, method references) and language runtimes.

## MethodHandle basics

```java
import java.lang.invoke.*;

public class MethodHandleDemo {
    public int add(int a, int b) { return a + b; }
    public static void main(String[] args) throws Throwable {
        MethodHandles.Lookup lookup = MethodHandles.lookup();
        MethodHandle mh = lookup.findVirtual(MethodHandleDemo.class, "add",
            MethodType.methodType(int.class, int.class, int.class));
        MethodHandleDemo d = new MethodHandleDemo();
        Object result = mh.invoke(d, 2, 3);
        System.out.println(result); // 5
    }
}
```

- `MethodType` describes the signature (return type + parameter types).
- `Lookup` controls access (public/private/protected/package) based on the lookup class.
- `invoke`/`invokeExact` — `invokeExact` is strict about types (JIT-friendly); `invoke` performs asType conversion.
- `MethodHandles.insertArguments`, `bindTo`, `filterArguments`, `collectArguments`, `guardWithTest` — combinators for building adapters.

## VarHandle basics

```java
import java.lang.invoke.*;

class Counter {
    private volatile int value;
    private static final VarHandle VH;
    static {
        try {
            VH = MethodHandles.lookup()
                .findVarHandle(Counter.class, "value", int.class);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            throw new Error(e);
        }
    }
    public void increment() { VH.getAndAdd(this, 1); }   // atomic, volatile write
    public int get() { return (int) VH.getVolatile(this); }
}

public class VarHandleDemo {
    public static void main(String[] args) throws InterruptedException {
        Counter c = new Counter();
        Thread t1 = new Thread(() -> { for (int i=0;i<10000;i++) c.increment(); });
        Thread t2 = new Thread(() -> { for (int i=0;i<10000;i++) c.increment(); });
        t1.start(); t2.start(); t1.join(); t2.join();
        System.out.println(c.get()); // 20000
    }
}
```

## VarHandle access modes

| Access mode | Semantics | Use |
|-------------|-----------|-----|
| `get`/`set` | plain (no ordering guarantees) | relaxed |
| `getVolatile`/`setVolatile` | volatile (visibility + no reordering) | like `volatile` field |
| `getAcquire`/`setRelease` | acquire/release (weaker than volatile) | lock-free algorithms |
| `getOpaque`/`setOpaque` | opaque (no ordering) | counters, stats |
| `compareAndSet`/`compareAndExchange` | CAS | atomic update |
| `getAndAdd`/`getAndSet` | atomic read-modify-write | counters |

## Unsafe vs VarHandle

| | `sun.misc.Unsafe` | `VarHandle` |
|---|-------------------|-------------|
| Support | Unsupported internal | Public, standardized API |
| Access control | Bypasses (caller check) | `Lookup`-based, respects encapsulation |
| Memory ordering | `fullFence` etc. | Full access-mode control (volatile/acquire/release/opaque) |
| Array access | manual offset math | `VarHandle` for arrays (index-aware) |
| JIT optimization | limited | JIT-friendly (intrinsics) |

`VarHandle` is the recommended replacement for `Unsafe` field/CAS operations (module 42).

## Performance

`MethodHandle.invokeExact` can be JIT-inlined to near-direct-call performance after warm-up (call-site caching via `invokedynamic` bootstrap). `VarHandle` operations are similarly optimized. Avoid reflective `Method`/`Field` in hot paths (module 27).

## Common mistakes

- `invoke` vs `invokeExact`: `invoke` does type conversion (slower); `invokeExact` requires exact types.
- `Lookup` access: you can only look up members the lookup class could access.
- VarHandle memory ordering: using `get`/`set` (plain) when you need `volatile` semantics breaks visibility guarantees.
- `MethodHandle` signatures must match exactly for `invokeExact`.

# Interview Questions

## Beginner

**Q1. What is a `MethodHandle`?**

A typed, directly executable reference to a method, constructor, or field (`java.lang.invoke`).

**Q2. What is `MethodType`?**

The signature of a callable: return type + parameter types.

**Q3. What is a `Lookup`?**

A factory for creating `MethodHandle`s/VarHandles, enforcing access control based on the lookup class.

**Q4. What is a `VarHandle`?**

A typed reference to a field or array element with selectable memory-ordering access modes (Java 9+).

**Q5. How do `MethodHandle` and `VarHandle` relate to `Unsafe`?**

They are the supported, JIT-friendly public replacements for `Unsafe` field/CAS/memory operations.

## Intermediate

**Q6. `invoke` vs `invokeExact`?**

`invokeExact` requires exact type match (faster, JIT-friendly); `invoke` performs `asType` conversion (slower).

**Q7. What access modes does `VarHandle` provide?**

`get`/`set` (plain), `getVolatile`/`setVolatile`, `getAcquire`/`setRelease`, `getOpaque`/`setOpaque`, plus atomic RMW (`getAndAdd`, `compareAndSet`).

**Q8. How does `VarHandle` compare to `volatile` fields?**

`getVolatile`/`setVolatile` on a `VarHandle` is equivalent to `volatile` field access; `VarHandle` additionally offers weaker acquire/release/opaque modes.

**Q9. What is `MethodHandles.lookup()`?**

Creates a `Lookup` for the current class, respecting its access rights (can access private members of its own class).

**Q10. Can `MethodHandle` invoke constructors?**

Yes — `findConstructor` returns a `MethodHandle` that, when invoked, creates a new instance.

## Advanced

**Q11. What is `invokedynamic`?**

A JVM bytecode instruction (Java 7+) that delegates call-site linkage to a bootstrap method producing a `CallSite` with a `MethodHandle`; used by lambdas, method references, and dynamic languages.

**Q12. What is a `CallSite`?**

The target of an `invokedynamic` call site; holds a `MethodHandle` that can be swapped (mutable call site).

**Q13. How are lambdas implemented?**

The compiler emits `invokedynamic` with a bootstrap (`LambdaMetafactory.metafactory`) that produces a `MethodHandle` to the lambda body; the JVM instantiates a functional interface invoking that handle.

**Q14. What are method handle combinators?**

`insertArguments`, `bindTo`, `filterArguments`, `collectArguments`, `guardWithTest`, `dropArguments` — build new handles from existing ones.

**Q15. Is `MethodHandle.invokeExact` faster than reflection?**

Yes — it avoids `Method.invoke` overhead and is JIT-inlinable after warm-up.

## Expert

**Q16. What is `asType`?**

Adapts a `MethodHandle` to a different `MethodType` (argument/return conversion) — used by `invoke`.

**Q17. What is `guardWithTest`?**

`if (guard.test()) onTrue() else onFalse()` as a single method handle — builds conditional adapters.

**Q18. How does `MethodHandle` respect access control?**

`Lookup` is created in a class context; `find*` methods throw `IllegalAccessException` if the lookup class couldn't access the member.

**Q19. What is `VarHandle` memory ordering `opaque`?**

No ordering guarantees; useful for counters/statistics where only atomicity matters.

**Q20. Can `VarHandle` work on array elements?**

Yes — `findVarHandle` on `int[].class` with `int` index type gives an element accessor (`get(obj, i)`).

## Scenario Based

**Q21. You need a lock-free counter with release semantics.**

`VarHandle` with `setRelease`/`getAndAdd` (acquire/release) — lighter than `synchronized`, stronger than plain.

**Q22. You are implementing a dynamic language on the JVM.**

Use `invokedynamic` + `CallSite` + `MethodHandle` for dynamic dispatch (like Nashorn, JRuby).

**Q23. You need to invoke a private method reflectively with high performance.**

`MethodHandles.privateLookupIn(targetClass, lookup)` + `findVirtual` → `MethodHandle.invokeExact`.

**Q24. You want to replace `sun.misc.Unsafe` CAS.**

Use `VarHandle.compareAndSet` / `getAndAdd`.

**Q25. You are building a serialization framework that sets final fields.**

`VarHandle` can set `final` fields (like `Unsafe`), but only if the lookup class has access; prefer constructors.

## Output Prediction

**Q26. What does this print?**

```java
import java.lang.invoke.*;
public class Q26 {
    public int add(int a, int b) { return a + b; }
    public static void main(String[] args) throws Throwable {
        MethodHandle mh = MethodHandles.lookup()
            .findVirtual(Q26.class, "add", MethodType.methodType(int.class, int.class, int.class));
        System.out.println(mh.invokeExact(new Q26(), 2, 3));
    }
}
```

**Output:**
```
5
```

**Reason:** `invokeExact` with exact types invokes `add(2,3)` → 5.

**Q27. What does this print?**

```java
import java.lang.invoke.*;
public class Q27 {
    static int v;
    static final VarHandle VH;
    static { try { VH = MethodHandles.lookup().findVarHandle(Q27.class, "v", int.class);}catch(Exception e){throw new Error(e);}}
    public static void main(String[] args) {
        VH.set(Q27.class, null, 42); // static field: object arg is the class (null ignored)?
        System.out.println(v);
    }
}
```

**Output:**
```
42
```

**Reason:** For a static field, `VH.set` is called with the class (receiver ignored); `v` becomes 42.

**Q28. What does this print?**

```java
import java.lang.invoke.*;
public class Q28 {
    public static void main(String[] args) throws Throwable {
        MethodHandle mh = MethodHandles.lookup()
            .findStatic(Q28.class, "identity", MethodType.methodType(int.class, int.class));
        System.out.println(mh.invokeExact(7));
    }
    static int identity(int x) { return x; }
}
```

**Output:**
```
7
```

**Reason:** Static method handle invoked with exact type int → returns 7.

**Q29. What access mode gives volatile semantics on a VarHandle?**

`getVolatile`/`setVolatile`.

**Q30. What does `MethodHandles.insertArguments` do?**

Binds some arguments to a method handle, producing a new handle with the remaining parameters.

## Internal Working

**Q31. How does `invokedynamic` link a call site?**

A bootstrap method (specified in the `invokedynamic` operand) runs once, returning a `CallSite`; subsequent invocations call the `CallSite`'s `MethodHandle` directly.

**Q32. Is `MethodHandle` a functional interface?**

No — it's a class (`java.lang.invoke.MethodHandle`) with `invokeExact`/`invoke`, not a SAM.

**Q33. How does `VarHandle` achieve memory ordering?**

It maps access modes to JVM intrinsics/compiler barriers (load/store barriers, volatile semantics).

**Q34. Can `MethodHandle` be serialized?**

No — `MethodHandle` instances are not serializable.

**Q35. What is `MethodHandles.publicLookup()`?**

A `Lookup` with `PUBLIC` access only (can only access public members), safe to publish.

## Tricky Questions

**Q36. Can `MethodHandle.invokeExact` accept a subtype argument?**

No — `invokeExact` requires exact types (no widening/subtyping); use `invoke` for conversion.

**Q37. Is `MethodHandle.invoke` thread-safe?**

Yes — method handles are immutable and thread-safe after creation.

**Q38. Can a `VarHandle` access a `volatile` field with plain `get`/`set`?**

Yes, but you lose the volatile guarantee; use `getVolatile`/`setVolatile` for volatile semantics.

**Q39. Can `MethodHandle` represent a method with varargs?**

Varargs are represented as array parameters in the `MethodType` (varargs is a source-level concept).

**Q40. What is the overhead of `MethodHandle` vs direct call?**

First invocation: bootstrap/linking cost; after warm-up and inlining, near-direct-call performance.