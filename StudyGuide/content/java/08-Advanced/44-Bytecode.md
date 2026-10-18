# Bytecode & the Class File Format

Java source is compiled by `javac` into bytecode stored in `.class` files. The JVM loads, verifies, and either interprets or JIT-compiles this bytecode. Understanding bytecode helps with debugging, performance analysis, framework design (bytecode manipulation), and understanding what the compiler does with lambdas, switch, try-with-resources, and more.

## The class file structure

A `.class` file (binary) contains:
- Magic number (`0xCAFEBABE`), minor/major version (e.g., 61.0 = Java 17, 65.0 = Java 21)
- Constant pool: string literals, field/method references, class names, numbers
- Access flags (public, final, abstract, interface, etc.)
- `this_class`, `super_class`
- Interfaces
- Fields (name, descriptor, attributes)
- Methods (code, exceptions, attributes)
- Attributes: `Code`, `StackMapTable`, `Exceptions`, `Signature` (generics), `RuntimeVisibleAnnotations`, `BootstrapMethods` (invokedynamic), `Record` (Java 16+), `PermittedSubclasses` (sealed, Java 17+)

Descriptors: `I` int, `J` long, `F` float, `D` double, `Z` boolean, `B` byte, `C` char, `S` short, `V` void, `Ljava/lang/String;` object, `[I` int array, `(II)I` method `(params)return`.

## Reading bytecode with javap

```bash
javap -c -p -v MyClass.class
```

`-c` disassembles methods to bytecode; `-p` shows members; `-v` shows the constant pool and attributes.

Example:

```java
public class Demo {
    int add(int a, int b) { return a + b; }
}
```

```text
public int add(int, int);
  Code:
     0: iload_1
     1: iload_2
     2: iadd
     3: ireturn
```

Common opcodes: `iload_0/1/2` (load int local), `istore` (store int), `iadd`/`isub`/`imul` (int arithmetic), `aload_0` (`this`), `invokevirtual`/`invokespecial`/`invokestatic`/`invokeinterface` (method calls), `new`/`dup`/`invokespecial` (object construction), `getfield`/`putfield` (field access), `arraylength`, `iaload`/`iastore` (array access), `goto`/`ifeq`/`if_icmpeq` (branches), `tableswitch`/`lookupswitch` (switch), `monitorenter`/`monitorexit` (synchronized), `athrow` (throw), `invokedynamic` (lambdas/switch expressions).

## What the compiler generates

### Lambdas & method references → `invokedynamic`
`javac` does NOT generate a separate class per lambda. It emits `invokedynamic` with a bootstrap method (`LambdaMetafactory.metafactory`) that produces a `MethodHandle` to the lambda body (module 43).

```java
// Predicate<String> p = s -> s.startsWith("A");
// compiles to invokedynamic -> LambdaMetafactory
```

### Switch
- Dense int/enum → `tableswitch`
- Sparse → `lookupswitch`
- String → `invokedynamic` + two `equals` comparisons + a synthetic `switch` on hash code

### try-with-resources
Generates a synthetic `try/finally` with a suppressed-exception mechanism (`Throwable.addSuppressed`), closing resources in reverse order.

### Records
Generates the canonical constructor, private final fields, accessors, `equals`, `hashCode`, `toString`, plus a `Record` attribute listing components (module 32).

### Sealed types
Adds a `PermittedSubclasses` attribute listing allowed subclasses (module 33).

### try-with-resources / switch expressions / text blocks
All lowered to ordinary bytecode (`invokedynamic` for strings/text blocks via `StringConcatFactory`, `yield` for switch expressions).

## Bytecode manipulation

Libraries read/modify/write `.class` files:
- **ASM**: low-level, fast, event-based (visitor) API; used by many frameworks.
- **ByteBuddy**: higher-level, code-generation agent library; used by Mockito, Hibernate, Mockito.
- **cglib**: older (Hibernate proxies), largely superseded by ByteBuddy.

Use cases: mocking (Mockito creates subclasses at runtime), ORM enhancement (Hibernate lazy loading), agents (`java.lang.instrument`), coverage tools (JaCoCo).

```java
// Conceptual: defining a class at runtime via Instrumentation
// Instrumentation.appendToSystemClassLoader(...) / redefineClasses(...)
```

Agents run with `java -javaagent:agent.jar=agentArgs` and get a `java.lang.instrument.Instrumentation` object to transform classes.

## Performance implications

- More bytecode = larger `.class`, more verification/JIT work (usually negligible).
- `invokedynamic` has a one-time bootstrap cost; after warm-up the call site is inlined.
- Reflection (`Method.invoke`) is slower than `MethodHandle.invokeExact` (module 43).
- Synthetic/bridge methods (generics erasure, module 07) add small overhead.

## Common mistakes

- Assuming source line numbers map 1:1 to bytecode (compiler reorders/optimizes).
- Modifying bytecode without updating `StackMapTable` → `VerifyError`.
- Relying on `sun.*` bytecode APIs; use ASM/ByteBuddy instead.
- Forgetting that `invokedynamic` call sites are mutable (`CallSite`).

# Interview Questions

## Beginner

**Q1. What is Java bytecode?**

The intermediate instructions the JVM executes, stored in `.class` files (platform-independent).

**Q2. What is the magic number of a class file?**

`0xCAFEBABE`.

**Q3. What is `javap`?**

The JDK disassembler that prints bytecode (`-c`), members (`-p`), and constant pool/attributes (`-v`).

**Q4. What is the constant pool?**

A table of literals and symbolic references (strings, class names, field/method refs, numbers) used by the class.

**Q5. What does `iadd` do?**

Pops two ints, adds them, pushes the result.

## Intermediate

**Q6. What is a descriptor?**

The type signature in bytecode (e.g., `(II)I`, `Ljava/lang/String;`).

**Q7. How are lambdas compiled?**

Via `invokedynamic` + `LambdaMetafactory` producing a `MethodHandle` to the lambda body — no extra class per lambda.

**Q8. What is `invokedynamic`?**

Bytecode for dynamically linked call sites (Java 7+); used by lambdas, switch expressions, strings, and dynamic languages.

**Q9. What is a `StackMapTable`?**

Verifier metadata describing stack/local types at branch targets; required for Java 7+ classes.

**Q10. What happens if `StackMapTable` is wrong?**

`VerifyError` at class loading.

## Advanced

**Q11. What is `invokeinterface` vs `invokevirtual`?**

`invokevirtual` = instance method on a known class; `invokeinterface` = interface method (requires a lookup of the implementing method at runtime).

**Q12. What is `invokespecial`?**

Instance initialization (`<init>`), private methods, `super.method()` calls.

**Q13. What is `athrow`?**

Throws an exception (the throwable is on the operand stack).

**Q14. What is `monitorenter`/`monitorexit`?**

Bytecode for `synchronized` blocks/methods.

**Q15. How does `javac` compile `switch` on `String`?**

`invokedynamic` + `String.hashCode()` + `equals()` checks, then an `int` switch on the hash.

## Expert

**Q16. What is a `Code` attribute?**

Contains bytecode, max stack, max locals, exception table, and line-number table for one method.

**Q17. What is the exception table in `Code`?**

Maps `start_pc`–`end_pc` ranges to `handler_pc` and `catch_type` for `try/catch`.

**Q18. What is `java.lang.instrument`?**

The instrumentation API: agents can transform/redefine/retransform classes at runtime (`-javaagent`).

**Q19. What is `redefineClasses`?**

Replace method bodies of loaded classes (agent-only; cannot change class structure).

**Q20. What is `RetentionPolicy` in bytecode?**

Annotations: `RUNTIME` → `RuntimeVisibleAnnotations` attribute; `CLASS` → `RuntimeInvisibleAnnotations`; `SOURCE` → not emitted.

## Scenario Based

**Q21. You need to mock classes at runtime (Mockito).**

Mockito uses ByteBuddy to generate subclasses/interceptors at runtime via the instrumentation API or a `-javaagent`.

**Q22. You want to measure every method call in an app.**

Attach a `javaagent` that transforms classes, injecting entry/exit logging (ByteBuddy/ASM).

**Q23. You get `VerifyError` deploying a Java 8 library on Java 21.**

Likely missing/wrong `StackMapTable` or unsupported version; recompile with a modern `javac`.

**Q24. You need to add a field to an existing class at runtime.**

Use `redefineClasses` (limited — can't add fields) or bytecode generation (ASM/ByteBuddy) to create a subclass; or use `Unsafe`/field offset tricks (discouraged).

**Q25. You are writing a bytecode optimizer.**

Use ASM visitor API: read, transform instructions, recompute `StackMapTable`/`StackMapFrames`, write.

## Output Prediction

**Q26. What bytecode opcode adds two ints?**

`iadd`.

**Q27. What opcode loads `this`?**

`aload_0`.

**Q28. What opcode returns an int?**

`ireturn`.

**Q29. What opcode allocates a new object?**

`new` (then `dup` + constructor `invokespecial`).

**Q30. What opcode throws?**

`athrow`.

## Internal Working

**Q31. How does the verifier use `StackMapTable`?**

It checks type safety at branch targets without full data-flow analysis (faster verification for Java 7+).

**Q32. What is `BootstrapMethods` attribute?**

Holds bootstrap method references for `invokedynamic` call sites (lambdas, switch on String).

**Q33. What is the `Record` attribute?**

Lists a record's components (name, descriptor, flags) — enables `isRecord()`/`getRecordComponents()`.

**Q34. What is `PermittedSubclasses`?**

Lists classes/interfaces allowed to extend a sealed class/interface (Java 17+).

**Q35. Can `.class` files be version-incompatible?**

Yes — a class compiled for Java 21 (major 65) can't run on Java 17 (major 61): `UnsupportedClassVersionError`.

## Tricky Questions

**Q36. Is `invokedynamic` interpreted only?**

No — the JIT compiles the target `MethodHandle` like any other code after warm-up.

**Q37. Can `javac` produce `invokedynamic` for Java 7?**

Only with `--release 7` targeting? `invokedynamic` needs JVM support (Java 7+); `javac` may use it for lambdas (Java 8+) regardless.

**Q38. Do annotations appear in bytecode?**

Only `RUNTIME` and `CLASS` retention (`SOURCE` is dropped).

**Q39. Is `String` concatenation `+` compiled to `StringBuilder`?**

Since Java 9: `invokedynamic` → `StringConcatFactory` (not necessarily `StringBuilder`).

**Q40. What is `OuterClass.this` in bytecode?**

Accessed via an implicit constructor parameter (the outer instance) stored in a field `this$0`.