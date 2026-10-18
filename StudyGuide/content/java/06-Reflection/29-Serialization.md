# Serialization

Java Serialization converts an object graph into a byte stream and reconstructs it later. It underpins RMI, HTTP session replication, distributed caches, and object persistence. Because deserialization reconstructs objects without running constructors, it is also a notorious source of remote code execution (gadget chains). This module covers the mechanism, the wire format, versioning, customization, security, and alternatives.

## Core mechanism

A class opts in by implementing `java.io.Serializable` (a marker interface — no methods). Serialization writes an object's non-static, non-transient fields to an `ObjectOutputStream`; deserialization reads them back via `ObjectInputStream` without invoking constructors.

```java
import java.io.*;

class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private String name;
    private transient int temp;   // excluded
    public User(String name) { this.name = name; }
}

public class SerializationDemo {
    public static void main(String[] args) throws Exception {
        User u = new User("Ada");
        try (ObjectOutputStream out = new ObjectOutputStream(
                new BufferedOutputStream(Files.newOutputStream(Path.of("/tmp/user.ser"))))) {
            out.writeObject(u);
        }
        try (ObjectInputStream in = new ObjectInputStream(
                new BufferedInputStream(Files.newInputStream(Path.of("/tmp/user.ser"))))) {
            User restored = (User) in.readObject();
            System.out.println("name=" + restored.name + " temp=" + restored.temp);
        }
    }
}
```

Output:

```
name=Ada temp=0
```

`temp` is `transient`, so it was not serialized and defaults to 0.

## The serialization stream format

The stream is a self-describing binary protocol:

- `STREAM_MAGIC` (`0xACED`) + `STREAM_VERSION` (5)
- Objects written once are referenced by handle thereafter (`TC_REFERENCE`) — preserves object identity and handles cycles.
- Class descriptors (`TC_CLASSDESC`) describe class name, `serialVersionUID`, fields, and superclass.
- Primitive arrays, objects, enums, and strings each have type codes (`TC_OBJECT`, `TC_CLASS`, `TC_STRING`, `TC_ARRAY`, `TC_ENUM`, `TC_NULL`, `TC_RESET`).

Objects are written depth-first; handles are assigned in order so references back to earlier objects resolve correctly.

## serialVersionUID

The `serialVersionUID` stamps a class version. If you do not declare it, `javac`/`serialver` computes one from the class members — and small changes (adding a field, changing a modifier) can change it, causing `InvalidClassException` on deserialization.

```bash
serialver com.example.User
```

Best practice: always declare an explicit `private static final long serialVersionUID = 1L;` and bump it only on incompatible changes.

## Customizing serialization

| Method | Purpose |
|--------|---------|
| `writeObject(ObjectOutputStream)` | Custom write logic (called by `ObjectOutputStream`) |
| `readObject(ObjectInputStream)` | Custom read logic |
| `readObjectNoData()` | Initialize when stream lacks class data |
| `writeReplace()` | Return a replacement object to serialize |
| `readResolve()` | Return a replacement object after deserialization |
| `ObjectOutputStream.writeUnshared` / `readUnshared` | Serialize without sharing handles |
| `ObjectOutputStream.replaceObject` / `enableReplaceObject` | Global replacement hook (subclass `ObjectOutputStream`) |

`writeReplace`/`readResolve` are the classic way to preserve singletons and enums through serialization.

```java
import java.io.*;

class Singleton implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() {}
    public static Singleton getInstance() { return INSTANCE; }
    // Deserialization would normally create a second instance; readResolve prevents it.
    private Object readResolve() { return INSTANCE; }
}
```

## Versioning and evolution

Compatible changes (usually safe without changing `serialVersionUID`):

- Adding fields (default values on read)
- Changing a field from `transient` to non-transient
- Adding `writeObject`/`readObject`/`readObjectNoData`
- Moving a class up/down the hierarchy (with care)

Incompatible changes (require new `serialVersionUID`):

- Deleting fields
- Changing field types
- Changing `Serializable` to `Externalizable` or vice versa
- Changing the class hierarchy

`ObjectStreamClass` and `serialPersistentFields` allow explicit field descriptors for fine-grained versioning control.

## Security: deserialization vulnerabilities

Deserialization instantiates objects without constructors and can invoke `readObject`, `readResolve`, and `finalize` (legacy). Attackers craft malicious streams whose object graphs trigger gadget chains (e.g., Apache Commons Collections, Spring) leading to arbitrary code execution. Never deserialize untrusted data.

Mitigations:

- **`ObjectInputFilter` (Java 9+, JEP 290)**: allowlist/denylist classes, max depth, array length, total references.
- **Context-specific filters (Java 17+, JEP 415)**: `ObjectInputFilter.Config.setSerialFilter` / per-`ObjectInputStream` filter.
- Validate the deserialized graph before use.
- Prefer safer formats (JSON, Protobuf, CBOR) over Java serialization at trust boundaries.

```java
import java.io.*;

ObjectInputFilter.Config.setSerialFilter(
    ObjectInputFilter.Config.createPatternFilter("!java.lang.*;java.util.*;*"));
```

## Externalizable

`java.io.Externalizable` gives full control: implement `writeExternal(ObjectOutput)` and `readExternal(ObjectInput)`. You write every field yourself, including calling `super.writeExternal`. Use it when you need a custom format or performance, but it is more error-prone than default serialization.

## Alternatives

| Format | Schema | Human-readable | Fast | Notes |
|--------|--------|----------------|------|-------|
| Java Serialization | No | No | Medium | Built-in, insecure by default |
| JSON (Jackson/Gson) | Optional | Yes | Medium | Universal, safe |
| Protobuf | Yes | No | Fast | Compact, strict schema |
| Avro | Yes | No | Fast | Schema evolution |
| CBOR/MessagePack | No/Yes | No | Fast | Binary JSON-like |

At trust boundaries (network, messages, cached blobs), prefer JSON or Protobuf over Java serialization.

## Performance

Serialization is relatively slow and allocates heavily (stream, handles, reflection). Optimizations:

- Declare explicit `serialVersionUID` (avoids recomputation).
- Mark large/unneeded fields `transient`.
- Use `Externalizable` or write custom `writeObject`/`readObject` to skip unneeded data.
- Reuse `ByteArrayOutputStream`/`ObjectOutputStream` buffers.
- Consider off-heap or binary formats for hot paths.

## Common mistakes

- Serializing objects with non-serializable fields (not `transient`) → `NotSerializableException`.
- Assuming `transient` fields retain values — they default-initialize on read.
- Forgetting `serialVersionUID` → brittle versioning.
- Deserializing untrusted data → RCE via gadget chains.
- Relying on constructors running during deserialization — they do not.
- Serializing `static` fields — they are not serialized.
- Modifying the object graph during serialization — undefined results.

# Interview Questions

## Beginner

**Q1. What is Java Serialization, and what interface must a class implement?**

Serialization converts an object's state into a byte stream (and back). A class implements `java.io.Serializable`, a marker interface with no methods.

**Q2. Which classes perform serialization and deserialization?**

`ObjectOutputStream.writeObject()` serializes; `ObjectInputStream.readObject()` deserializes. They are typically wrapped around `FileOutputStream`/`FileInputStream` or `ByteArrayOutputStream`/`ByteArrayInputStream`.

**Q3. What does `transient` do?**

It excludes a field from serialization. On deserialization, a `transient` field is initialized to its default value (0, `false`, `null`).

**Q4. What is `serialVersionUID`?**

A version identifier for a serializable class. If the stream's UID differs from the class's UID, `InvalidClassException` is thrown. Declare it explicitly to control compatibility.

**Q5. Are constructors invoked during deserialization?**

No. The object is allocated without calling any constructor; fields are restored directly from the stream.

## Intermediate

**Q6. What fields are NOT serialized by default?**

`static` fields and `transient` fields are excluded.

**Q7. How do you customize serialization for a class?**

Implement `writeObject(ObjectOutputStream)` and `readObject(ObjectInputStream)`, and optionally `readObjectNoData()`, `writeReplace()`, and `readResolve()`.

**Q8. How do you preserve a singleton through serialization?**

Implement `readResolve()` to return the existing singleton instance instead of the deserialized copy.

**Q9. What happens if `serialVersionUID` mismatches between sender and receiver?**

`InvalidClassException` is thrown during deserialization.

**Q10. What is the difference between `Serializable` and `Externalizable`?**

`Serializable` uses default reflection-based serialization; `Externalizable` requires you to implement `writeExternal`/`readExternal` for full control.

## Advanced

**Q11. How does the stream preserve object identity and cycles?**

Each object is assigned a handle when first written; subsequent references to the same object are written as `TC_REFERENCE` handles, so identity and cycles are preserved.

**Q12. What is `readResolve`, and when is it called?**

`readResolve` is invoked after an object is deserialized and lets you return a replacement object (commonly used for singletons and enums).

**Q13. What is `ObjectInputFilter`, and why was it introduced (JEP 290)?**

It lets you allowlist/denylist classes during deserialization and set limits (depth, array length, references) to block deserialization gadget attacks.

**Q14. What is `serialPersistentFields`?**

A declared `ObjectStreamClass[]` that explicitly lists the fields participating in serialization, used for fine-grained versioning control.

**Q15. Why should you never deserialize untrusted data?**

Malicious streams can trigger gadget chains that execute arbitrary code during `readObject`/`readResolve` (e.g., Commons Collections, Spring, JDK classes).

## Expert

**Q16. Can you serialize an object whose class implements `Serializable` but contains a non-serializable field?**

Only if that field is `transient`; otherwise `NotSerializableException` is thrown.

**Q17. How do you serialize an object graph with shared references?**

`ObjectOutputStream` handles shared references automatically via object handles — the object is serialized once, and later references point to the handle.

**Q18. How does `writeReplace` differ from `readResolve`?**

`writeReplace` runs during serialization and returns a substitute to write to the stream; `readResolve` runs during deserialization and returns a substitute to hand to the caller.

**Q19. What is `ObjectOutputStream.useProtocolVersion` for?**

It selects the stream protocol version (e.g., `PROTOCOL_VERSION_2` for more efficient reflection-based descriptions) to improve performance at the cost of compatibility with older JVMs.

**Q20. How do records interact with serialization?**

Records are serializable by default via their canonical constructor and accessors; you can still customize with `writeReplace`/`readResolve` and declare `serialVersionUID`.

## Scenario Based

**Q21. You need to send objects between two services over the network. Is Java Serialization a good choice?**

No for untrusted/network boundaries. Use JSON, Protobuf, or CBOR instead; Java Serialization has a long history of deserialization RCE vulnerabilities. Reserve it for trusted internal caches with filters configured.

**Q22. A deserialized object is missing expected field values. What could be wrong?**

The fields may be `transient`, the class `serialVersionUID` may differ, `readObject`/`readResolve` may have replaced the object, or the stream was truncated/corrupted.

**Q23. You are adding a new field to a serializable class. Do you need to change `serialVersionUID`?**

No — adding a field is a compatible change (old streams read it as default; new streams include it). Change the UID only for incompatible changes (deleted fields, changed types).

**Q24. A legacy system sends Java-serialized blobs; you must deserialize them in a new service with different class layout. What do you do?**

Align `serialVersionUID` and field names/types for compatibility, or implement `readObject`/`readObjectNoData` to handle old stream shapes, or use `ObjectStreamClass`/`serialPersistentFields`. Prefer translating to a safe format at the boundary.

**Q25. How do you limit the damage of a deserialization gadget chain?**

Install an `ObjectInputFilter` allowlisting only expected classes and bounding depth/array length/references; validate the graph after deserialization; never expose deserialization over the network.

## Output Prediction

**Q26. What does this print?**

```java
import java.io.*;

class Point implements Serializable {
    private static final long serialVersionUID = 1L;
    int x;
    transient int y;
    Point(int x, int y) { this.x = x; this.y = y; }
}

public class Q26 {
    public static void main(String[] args) throws Exception {
        Point p = new Point(1, 2);
        try (ObjectOutputStream oos = new ObjectOutputStream(new ByteArrayOutputStream())) {
            oos.writeObject(p);
            byte[] b = ((ByteArrayOutputStream) oos).toByteArray();
            try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(b))) {
                Point r = (Point) ois.readObject();
                System.out.println(r.x + " " + r.y);
            }
        }
    }
}
```

**Output:**
```
1 0
```

**Reason:** `x` is serialized (1); `y` is `transient`, so it defaults to 0 on read.

**Q27. What does this print?**

```java
import java.io.*;

public class Q27 {
    static class A implements Serializable {
        static int count = 0;
        A() { count++; }
    }
    public static void main(String[] args) throws Exception {
        A a = new A();
        System.out.println(A.count);   // 1
        try (ObjectOutputStream oos = new ObjectOutputStream(new ByteArrayOutputStream())) {
            oos.writeObject(a);
            byte[] b = ((ByteArrayOutputStream) oos).toByteArray();
            try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(b))) {
                A r = (A) ois.readObject();
                System.out.println(A.count);  // ?
            }
        }
    }
}
```

**Output:**
```
1
1
```

**Reason:** `static` fields are not serialized; deserialization does not run the constructor, so `count` stays 1.

**Q28. What does this print?**

```java
import java.io.*;

class S implements Serializable {
    private static final long serialVersionUID = 1L;
    private static final S INSTANCE = new S();
    private S() {}
    public static S getInstance() { return INSTANCE; }
    private Object readResolve() { return INSTANCE; }
}

public class Q28 {
    public static void main(String[] args) throws Exception {
        byte[] b;
        try (ObjectOutputStream oos = new ObjectOutputStream(new ByteArrayOutputStream())) {
            oos.writeObject(S.getInstance());
            b = ((ByteArrayOutputStream) oos).toByteArray();
        }
        try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(b))) {
            S r1 = (S) ois.readObject();
            S r2 = (S) ois.readObject();
            System.out.println(r1 == r2);
            System.out.println(r1 == S.getInstance());
        }
    }
}
```

**Output:**
```
true
true
```

**Reason:** `readResolve` returns `INSTANCE` for every deserialized `S`, so both reads and the live singleton are the same object.

**Q29. What does this print?**

```java
import java.io.*;

public class Q29 {
    public static void main(String[] args) throws Exception {
        try (ObjectOutputStream oos = new ObjectOutputStream(new ByteArrayOutputStream())) {
            oos.writeObject("hello");
            oos.writeObject("hello");
            byte[] b = ((ByteArrayOutputStream) oos).toByteArray();
            try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(b))) {
                Object a = ois.readObject();
                Object c = ois.readObject();
                System.out.println(a == c);
            }
        }
    }
}
```

**Output:**
```
true
```

**Reason:** Strings (and all objects) are handle-referenced; the second `"hello"` references the first via handle, so `a == c` is true.

**Q30. What happens if you deserialize a stream whose `serialVersionUID` differs from the current class?**

It throws `java.io.InvalidClassException` with a message about `serialVersionUID` mismatch.

## Internal Working

**Q31. What is `ObjectStreamClass`, and how is `serialVersionUID` computed if not declared?**

`ObjectStreamClass` is the descriptor for a serializable class (name, UID, fields). Without an explicit UID, it is computed by `ObjectStreamClass` using the class name, modifiers, interfaces, methods, and fields via a hash algorithm — sensitive to class layout.

**Q32. How does `ObjectOutputStream` avoid writing the same object twice?**

It maintains a `handles` table mapping objects to handles; `writeObject` checks `writeObject0` → if already handled, emits `TC_REFERENCE` instead of re-serializing.

**Q33. Why does deserialization not call constructors, and what are the consequences?**

The JVM allocates the object and populates fields directly from the stream to allow reconstructing arbitrary graphs (including non-public classes). Consequences: no constructor validation, `final` fields can be set by the stream, and invariant-establishing code is bypassed — a root cause of many deserialization bugs.

**Q34. How does `ObjectInputFilter` block a gadget chain?**

The filter is consulted for each class being deserialized; classes not on the allowlist (or on the denylist), or streams exceeding depth/array/reference limits, cause the deserialization to abort before dangerous code runs.

**Q35. What stream types codes exist, and what is `TC_RESET`?**

Codes include `TC_OBJECT`, `TC_CLASS`, `TC_CLASSDESC`, `TC_ARRAY`, `TC_STRING`, `TC_ENUM`, `TC_NULL`, `TC_REFERENCE`, `TC_RESET`. `TC_RESET` resets the handle table, after which all objects are rewritten from scratch (used by `reset()`).

## Tricky Questions

**Q36. Can `transient` fields be serialized via custom `writeObject`?**

Yes — in custom `writeObject`, you may manually call `out.writeInt`/`out.writeObject` for a `transient` field; `transient` only suppresses default serialization.

**Q37. Does serialization include the class's methods?**

No. Only field values and class metadata (name, UID, field descriptors) are streamed; methods live in the `.class` file on both sides.

**Q38. Is `Serializable` inherited by subclasses?**

Yes — if a superclass implements `Serializable`, all subclasses are serializable (provided their own fields are serializable or `transient`).

**Q39. What happens if a superclass is not `Serializable` but a subclass is?**

The subclass is serializable, but the superclass's fields are restored by calling the superclass's no-arg constructor during deserialization (so the superclass must have an accessible no-arg constructor).

**Q40. Can an `Enum` be serialized?**

Yes — enums are serialized by name only (not ordinal), and deserialization looks up the enum constant by name via `Enum.valueOf`.