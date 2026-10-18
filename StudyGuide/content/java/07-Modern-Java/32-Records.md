# Records

Records (JEP 395, preview in Java 14/15, final in Java 16) are a compact syntax for modeling immutable data carriers. Instead of writing fields, a constructor, getters, `equals`, `hashCode`, and `toString` by hand (or via Lombok), you declare the components and the compiler generates the rest. Records model data as data — nominally typed tuples with accessors named after components.

## Syntax and implicit members

```java
public record Point(int x, int y) {}
public record User(String name, String email, int age) {}
```

From this single declaration the compiler generates:
- Private final fields for each component.
- A public canonical constructor `RecordType(component types...)` assigning each field.
- Public accessor methods named after components (`x()`, `y()`, `name()`, `email()`, `age()` — no `get` prefix).
- `equals(Object)` comparing all components component-wise (`Objects.equals`).
- `hashCode()` over all components.
- `toString()` in the form `ClassName[component1=value1, component2=value2]`.

```java
public record Point(int x, int y) {}

public class RecordDemo {
    public static void main(String[] args) {
        Point a = new Point(1, 2);
        Point b = new Point(1, 2);
        Point c = new Point(2, 1);

        System.out.println("a.x=" + a.x());        // accessor, no get prefix
        System.out.println("a=" + a);              // Point[x=1, y=2]
        System.out.println("a.equals(b)=" + a.equals(b)); // true
        System.out.println("a.equals(c)=" + a.equals(c)); // false
        System.out.println("a.hashCode()==b.hashCode()=" + (a.hashCode() == b.hashCode())); // true
    }
}
```

Output:

```
a.x=1
a=Point[x=1, y=2]
a.equals(b)=true
a.equals(c)=false
a.hashCode()==b.hashCode()=true
```

Records are implicitly `final` (cannot be extended), implement `java.lang.Record`, and cannot declare instance fields other than the component-backed private fields. Static fields and static methods are allowed.

## Compact constructor

You can validate or normalize components without restating the full parameter list:

```java
public record Range(int low, int high) {
    public Range {
        if (low > high) throw new IllegalArgumentException("low > high");
    }
}
```

The compact constructor's parameter list is implicit (the record components); you only write the body. `this` assignments are optional — the compiler auto-assigns unless you override.

## Reflection on records

```java
import java.lang.reflect.*;

public class RecordReflection {
    public static void main(String[] args) {
        Class<Point> c = Point.class;
        System.out.println("isRecord: " + c.isRecord()); // true
        for (RecordComponent rc : c.getRecordComponents()) {
            System.out.println(rc.getName() + " : " + rc.getType().getSimpleName()
                + " accessor=" + rc.getAccessor().getName());
        }
    }
}
```

Output:

```
isRecord: true
x : int accessor=x
y : int accessor=y
```

## Serialization

Records are serializable by default: `java.io.Serializable` is implemented implicitly, and deserialization invokes the canonical constructor (not `readObject`). You can still declare `serialVersionUID` and customize with `writeReplace`/`readResolve` (see module 29). Record components are the serialized form; `transient` is not meaningful for record components (all are serialized).

## Pattern matching and deconstruction

Records work naturally with pattern matching for `switch` (module 34). Java 21 preview record patterns let you deconstruct:

```java
// preview feature (Java 21+ with --enable-preview)
if (obj instanceof Point(int x, int y)) {
    System.out.println(x + "," + y);
}
```

Records also work well in exhaustive `switch` over sealed hierarchies (module 33).

## When to use records

Use records for:
- Immutable data carriers (DTOs, domain value objects, tuples).
- Map keys (with correct `hashCode`/`equals`).
- Transfer objects between layers/services.

Do NOT use records for:
- Mutable entities (records are implicitly final and component-based).
- Behavior-rich classes with complex invariants better expressed with methods.
- Cases where you need non-final instance fields or subclassing.

## Records vs classes vs enums vs Lombok

| | Record | Class | Enum | Lombok `@Value`/`@Data` |
|---|--------|-------|------|-------------------------|
| Boilerplate | Minimal (auto-generated) | Manual | Fixed | Generated at compile time |
| Mutable | No | Yes | No | Configurable (`@Value` immutable) |
| Extensible | No (final) | Yes | No (final) | No (`@Value`) |
| Identity components | Named, typed | Fields | Constants | Fields |
| `equals`/`hashCode`/`toString` | Component-based | Manual | Identity | Generated |
| Serialization | Built-in (canonical ctor) | Manual | Built-in | Manual/configured |

## Common mistakes

- Expecting records to be mutable — they are not; components are final.
- Adding non-final instance fields — not allowed (only static fields or component-backed private fields).
- Assuming records are "anonymous tuples" — they are nominally typed with named components; two records with the same shape but different names are different types.
- Using `getX()` accessors — record accessors are named `x()` not `getX()`.
- Assuming `==` means value equality — records use `equals` for value equality; `==` is identity.

## Performance

Records carry no runtime overhead compared to an equivalent hand-written class: components are fields, accessors are inlined by the JIT, and `equals`/`hashCode` are component-wise. Memory footprint equals that of a regular class with the same fields.

# Interview Questions

## Beginner

**Q1. What is a Java record?**

A record (Java 16+) is a concise syntax for immutable data carriers. You declare components; the compiler generates the canonical constructor, private final fields, accessors, `equals`, `hashCode`, and `toString`.

**Q2. What accessor names does a record generate?**

Accessors are named after the components with no `get` prefix: `record Point(int x, int y)` generates `x()` and `y()`.

**Q3. Are records mutable?**

No — records are implicitly `final` and their components are `final`, so records are immutable.

**Q4. What interface does every record implement?**

`java.lang.Record`.

**Q5. Can a record extend another class?**

No — records implicitly extend `java.lang.Record` and cannot extend any other class.

## Intermediate

**Q6. What is a compact constructor?**

A constructor that validates or normalizes components without restating the parameter list; the compiler supplies the component parameters and auto-assigns them unless you override.

**Q7. Can records have static members?**

Yes — static fields and static methods are allowed. Instance fields beyond the components are not.

**Q8. How is `equals` implemented for records?**

Component-wise using `Objects.equals` for each component; two records are equal if they are the same type and all components are equal.

**Q9. What does `record` `toString` look like?**

`ClassName[component1=value1, component2=value2]` — e.g. `Point[x=1, y=2]`.

**Q10. Are record components serialized?**

Yes — all components are serialized, and deserialization invokes the canonical constructor. `transient` is not meaningful for record components.

## Advanced

**Q11. Can a record be `sealed`?**

No — records are implicitly `final`, so they cannot be `sealed`. A record can implement a sealed interface, though.

**Q12. How do you reflect on record components?**

`Class.isRecord()` and `Class.getRecordComponents()` return `RecordComponent` objects exposing name, type, generic type, annotations, and the accessor method.

**Q13. Can a record component be `null`?**

Yes — unless the compact constructor validates/rejects it. `equals` uses `Objects.equals`, which handles `null` correctly.

**Q14. What is a record pattern (preview in Java 21)?**

A pattern that matches a record and deconstructs its components in one expression: `if (obj instanceof Point(int x, int y)) { ... }`. Requires `--enable-preview` in Java 21.

**Q15. How do records differ from Lombok `@Value`?**

Records are a language feature (JVM-level, `java.lang.Record`, component accessors, serialization support). Lombok `@Value` is a compile-time annotation-processor generation; they are similar in spirit but different in mechanism and tooling.

## Expert

**Q16. Can records be used as map keys?**

Yes — with correct component-based `equals`/`hashCode`, records make good immutable map keys, provided their components are also immutable or at least hash/equals-consistent while used as keys.

**Q17. What happens if you try to serialize a record whose components are not serializable?**

`NotSerializableException` at serialization time (same as regular classes). Components must be serializable, or use `writeReplace`/`readResolve` / `transient`-like handling via custom serialization (not `transient` on components).

**Q18. Do records support `final` fields beyond components?**

Records cannot declare additional instance fields (only static fields). The components themselves are the private final fields.

**Q19. Is a record's canonical constructor invoked during deserialization?**

Yes — Java serialization for records invokes the canonical constructor with the streamed component values, bypassing `readObject` by default.

**Q20. Can you have a record with zero components?**

Yes — `record Empty() {}` is valid (similar to `java.lang.Void`-like marker), though uncommon.

## Scenario Based

**Q21. You are modeling a database row as a DTO between services. Record or class?**

Record — it's an immutable data carrier, generates `equals`/`hashCode`/`toString`, is concise, and clearly signals "data only." Use a class if you need mutation or complex behavior.

**Q22. A teammate wants to make a record extend a base class to share behavior. What do you say?**

Records cannot extend classes. Use composition, a shared interface (possibly sealed), or static helper methods instead; reconsider whether a record is the right model if you need inheritance.

**Q23. You need exhaustive `switch` over shape variants. Records or sealed classes?**

Use sealed classes for the hierarchy (enables exhaustiveness checking), with records as the leaf variants if they are pure data. Sealed + records + pattern matching is the modern algebraic-data-type style.

**Q24. You are serializing records to send over the network. Any concerns?**

Records serialize component values; ensure all components are serializable, version carefully (`serialVersionUID`), and prefer safer formats (JSON/Protobuf) at untrusted boundaries (see module 29).

**Q25. Your team debates `record` vs Lombok `@Data`. Which do you recommend for new code?**

`record` — it's standardized, part of the language/JVM, works with reflection (`isRecord`, `getRecordComponents`), and serializes canonically. Reserve Lombok for legacy codebases stuck on Java 8/11.

## Output Prediction

**Q26. What does this print?**

```java
public record Point(int x, int y) {}
public class Q26 {
    public static void main(String[] args) {
        Point a = new Point(1, 2);
        Point b = new Point(1, 2);
        System.out.println(a == b);
        System.out.println(a.equals(b));
        System.out.println(a.hashCode() == b.hashCode());
    }
}
```

**Output:**
```
false
true
true
```

**Reason:** `==` is identity (different objects); `equals` compares components (true); `hashCode` is component-based (equal).

**Q27. What does this print?**

```java
public record Name(String first, String last) {}
public class Q27 {
    public static void main(String[] args) {
        Name n = new Name("Ada", "Lovelace");
        System.out.println(n.first());
        System.out.println(n);
    }
}
```

**Output:**
```
Ada
Name[first=Ada, last=Lovelace]
```

**Reason:** Accessor is `first()` (no `get`); `toString` is `ClassName[component=value, ...]`.

**Q28. What does this print?**

```java
public record Box(int value) {}
public class Q28 {
    public static void main(String[] args) {
        System.out.println(Box.class.isRecord());
        System.out.println(java.util.Arrays.toString(Box.class.getRecordComponents()));
    }
}
```

**Output:**
```
true
[Box.component int value]
```

**Reason:** `isRecord()` true; `getRecordComponents()` returns `RecordComponent` metadata.

**Q29. What does this print?**

```java
public record Pair(String a, String b) {}
public class Q29 {
    public static void main(String[] args) {
        Pair p1 = new Pair("x", "y");
        Pair p2 = new Pair("x", "y");
        System.out.println(p1.hashCode() == p2.hashCode());
        System.out.println(p1 == p2);
    }
}
```

**Output:**
```
true
false
```

**Reason:** `hashCode` is component-based (equal for equal components); `==` is identity (different instances).

**Q30. What does this print?**

```java
public record Point(int x, int y) {
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("negative");
    }
}
public class Q30 {
    public static void main(String[] args) {
        try { new Point(-1, 5); } catch (IllegalArgumentException e) {
            System.out.println("caught: " + e.getMessage());
        }
    }
}
```

**Output:**
```
caught: negative
```

**Reason:** The compact constructor validates components; `Point(-1, 5)` throws before the record is created.

## Internal Working

**Q31. Does the JVM treat records specially at the bytecode level?**

Records are ordinary classes implementing `java.lang.Record`; the compiler generates the members and records the `Record` attribute in the class file so `isRecord()` and `getRecordComponents()` work.

**Q32. Are record accessors subject to JIT inlining?**

Yes — they are simple field-returning methods and are aggressively inlined; records have no runtime performance penalty vs hand-written classes.

**Q33. How does record serialization differ from regular class serialization?**

Records bypass `writeObject`/`readObject` by default and reconstruct via the canonical constructor using component values; `serialVersionUID` and `writeReplace`/`readResolve` still apply.

**Q34. Can a record implement an interface?**

Yes — records can implement interfaces (including sealed interfaces). They just cannot extend classes.

**Q35. What is the `Record` attribute in the class file?**

A class-file attribute (introduced for records) that lists the components, enabling `Class.isRecord()` and `Class.getRecordComponents()` without reconstructing them from methods/fields.

## Tricky Questions

**Q36. Is `record Point(int x, int y) {}` the same as `class Point { private final int x, y; ... }`?**

Semantically similar for data, but records are nominally typed (different names = different types), implicitly final, implement `java.lang.Record`, and auto-generate canonical members; a hand-written class is more flexible.

**Q37. Can a record have a no-arg constructor?**

No — the canonical constructor takes all components; you may add other constructors but they must delegate to the canonical one (`this(...)`).

**Q38. Are record component names part of the type identity?**

No — type identity is the record class name, but component names are reflected via `getRecordComponents()` and used in `toString`/pattern matching.

**Q39. Can a record be abstract?**

No — records are implicitly final and cannot be abstract.

**Q40. Do record annotations on components carry to the accessor?**

Component annotations are retained on the component metadata (`RecordComponent`) and can be reflected; they do not automatically move to the accessor method.