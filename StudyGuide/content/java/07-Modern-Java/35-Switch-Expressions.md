# Switch Expressions

Switch expressions (JEP 361, preview in Java 12/13, final in Java 14; `yield` in Java 13) turn `switch` into an expression that yields a value, with a new arrow syntax (`case L ->`) that eliminates fall-through and the need for `break`. Together with pattern matching (module 34) and sealed classes (module 33), they form Java's modern multi-way selection.

## From statements to expressions

A switch statement performs actions; a switch expression computes a value.

```java
// Old: switch statement (no value, fall-through via break)
String kind;
switch (day) {
    case MONDAY:
    case FRIDAY:
        kind = "weekday";
        break;
    case SATURDAY:
    case SUNDAY:
        kind = "weekend";
        break;
    default:
        kind = "other";
        break;
}

// New: switch expression (yields a value, no fall-through with arrow)
String kind = switch (day) {
    case MONDAY, FRIDAY -> "weekday";
    case SATURDAY, SUNDAY -> "weekend";
    default -> "other";
};
```

Key rules:
- Multiple case labels can share one arrow (`case MONDAY, FRIDAY ->`).
- Arrow branches do NOT fall through; each branch is independent.
- A switch expression must be **exhaustive**: cover all possible inputs (enum/sealed cases or `default`).
- The result of the chosen branch is the value of the whole expression.

```java
public class SwitchExprDemo {
    public static void main(String[] args) {
        Day d = Day.WEDNESDAY;
        String type = switch (d) {
            case MONDAY, FRIDAY -> "weekday";
            case SATURDAY, SUNDAY -> "weekend";
            default -> "other";
        };
        System.out.println(type); // other

        int n = switch (d) {
            case MONDAY -> 1;
            case TUESDAY -> 2;
            default -> 0;
        };
        System.out.println(n); // 0
    }
}

enum Day { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY }
```

Output:

```
other
0
```

## Arrow syntax vs colon syntax

| | `case L:` (colon) | `case L ->` (arrow) |
|---|-------------------|---------------------|
| Fall-through | Yes (unless `break`) | No |
| `break` needed | Yes (to stop fall-through) | No |
| Expression result | No (statement) | Yes (right side is value) |
| Multiple labels | `case A: case B:` | `case A, B ->` |

You should not mix arrow and colon in the same switch in confusing ways; the compiler restricts mixing (an expression switch uses arrow exclusively; a statement switch can use colon or arrow but with constraints).

## `yield` (Java 13+)

For multi-statement arrow branches in a switch expression, use `yield` to produce the value:

```java
String msg = switch (code) {
    case 200 -> "OK";
    case 404 -> {
        log("not found");
        yield "Not Found";
    };
    default -> "Unknown";
};
```

`yield v` ends the branch and makes `v` the branch's result. `break` in a switch expression block is a compile error.

## Exhaustiveness

- **Switch expression**: must cover all inputs. For `enum` types, listing all constants (or `default`) suffices; for `sealed` types, all permitted subtypes (or `default`); for `String`, `int`, etc., `default` is required unless all values are listed (impractical) — so effectively `default` is required.
- **Switch statement**: `default` optional.

```java
// Compile error: not exhaustive (no default, and Day is an enum but missing SATURDAY/SUNDAY)
String x = switch (d) {
    case MONDAY -> "a";
    case TUESDAY -> "b";
    // missing WEDNESDAY..SUNDAY, no default
};
```

## Pattern matching in switch

(See module 34 for depth.) Java 21 allows type patterns and guards:

```java
String fmt = switch (obj) {
    case Integer i -> "int " + i;
    case String s when s.length() > 0 -> "non-empty string";
    case String s -> "empty string";
    case null -> "null";
    default -> obj.toString();
};
```

`case null ->` (Java 21) handles null without throwing `NullPointerException`.

## Common mistakes

- Forgetting `default` in a switch expression over non-enum/non-sealed types.
- Using `break` to return a value in an expression block — use `yield`.
- Mixing arrow and colon branches in one switch (restricted/confusing).
- Assuming arrow branches fall through — they don't.
- Non-exhaustive enum switch expression (compile error).
- Fall-through bugs with colon syntax (the classic source of bugs).

## Performance

Switch expressions compile to the same bytecode (`tableswitch`/`lookupswitch`) as switch statements. No runtime cost difference; the benefit is safety and readability.

## Comparison table

| | Switch statement | Switch expression |
|---|------------------|-------------------|
| Returns a value | No | Yes |
| `case L ->` no fall-through | Yes | Yes (only form) |
| Exhaustiveness required | No | Yes |
| `break` for fall-through control | Yes | No (`yield` for values) |
| `default` required | No (statement) | Yes (unless enum/sealed exhaustive) |

# Interview Questions

## Beginner

**Q1. What is a switch expression?**

A `switch` that evaluates to a value (Java 14+), using arrow syntax `case L ->` with no fall-through.

**Q2. How does `case L ->` differ from `case L:`?**

Arrow branches don't fall through and don't need `break`; they produce a value in an expression. Colon branches fall through unless `break` and are statements.

**Q3. Must a switch expression be exhaustive?**

Yes — all possible inputs must be covered (enum/sealed variants or `default`).

**Q4. What keyword yields a value from a multi-statement arrow branch?**

`yield v` (Java 13+).

**Q5. Can `break` be used inside a switch expression block?**

No — use `yield`; `break` in a switch expression is a compile error.

## Intermediate

**Q6. Can multiple case labels share one arrow branch?**

Yes — `case MONDAY, FRIDAY -> "weekday";`.

**Q7. What happens if you forget `default` in a switch expression over `int`?**

Compile error — not exhaustive (you can't list all ints).

**Q8. How does `case null ->` work?**

Java 21: matches a null selector without throwing `NullPointerException`.

**Q9. Can you mix `case L:` and `case L ->` in one switch?**

Restricted — an expression switch uses arrow; mixing is discouraged and constrained by the compiler.

**Q10. Do switch expressions compile differently than statements?**

No — both become `tableswitch`/`lookupswitch`; no runtime cost difference.

## Advanced

**Q11. What is the relationship between switch expressions and sealed classes?**

Exhaustiveness checking works with sealed types: the compiler knows all permitted subtypes and verifies they're handled (or `default`).

**Q12. Can a switch expression branch be a block?**

Yes — `case L -> { ...; yield v; }` for multiple statements.

**Q13. What is `yield` vs `break`?**

`yield` produces the expression's result; `break` exits a switch statement (not allowed in expressions).

**Q14. Is `switch` on `String` supported in expressions?**

Yes — with `default` required (String isn't an enum/sealed type).

**Q15. Are switch expressions lazy/short-circuiting?**

Only the matched branch executes; branches are not evaluated before selection.

## Expert

**Q16. Can a switch expression return `void`?**

No — expressions always produce a value; use a statement for side-effect-only switches.

**Q17. What happens with duplicate case labels?**

Compile error (duplicate case labels), same as statements.

**Q18. Can an arrow branch throw an exception?**

Yes — any branch may throw; it propagates normally.

**Q19. How does exhaustiveness interact with `default`?**

`default` satisfies exhaustiveness for non-enum/non-sealed types; without it, all enum/sealed variants must be listed.

**Q20. Can switch expressions be nested?**

Yes — a branch's expression can itself be a switch expression.

## Scenario Based

**Q21. You are mapping HTTP status codes to messages. Switch expression or if-else chain?**

Switch expression — concise, exhaustive, returns the message directly, no fall-through bugs.

**Q22. A switch expression over an enum compiles today. You add a new enum constant. What happens?**

It fails to compile (not exhaustive) unless you add the new case or `default` — a useful compile-time reminder.

**Q23. You need to log inside a switch branch and return a value. How?**

Use an arrow block with `yield`: `case 404 -> { log(...); yield "Not Found"; }`.

**Q24. You are porting legacy switch-with-fall-through code. Should you use colon or arrow?**

Arrow — it eliminates fall-through bugs. Only use colon if you genuinely need intentional fall-through (rare).

**Q25. You need to match on a value's type, not just equality. Switch expression or pattern switch?**

Pattern switch (module 34) — `case Integer i ->` with type patterns and guards.

## Output Prediction

**Q26. What does this print?**

```java
enum Day { MONDAY, TUESDAY, WEDNESDAY }
public class Q26 {
    public static void main(String[] args) {
        Day d = Day.TUESDAY;
        System.out.println(switch (d) {
            case MONDAY -> "a";
            case TUESDAY -> "b";
            default -> "c";
        });
    }
}
```

**Output:**
```
b
```

**Reason:** Exhaustive enum switch (all constants covered); TUESDAY matches "b".

**Q27. What does this print?**

```java
public class Q27 {
    public static void main(String[] args) {
        int x = 2;
        System.out.println(switch (x) {
            case 1 -> "one";
            default -> "other";
        });
    }
}
```

**Output:**
```
other
```

**Reason:** `int` switch expression requires `default`; `default` matches.

**Q28. What does this print?**

```java
public class Q28 {
    public static void main(String[] args) {
        String s = switch ("b") {
            case "a" -> "A";
            case "b" -> {
                System.out.println("inside block");
                yield "B";
            };
            default -> "D";
        };
        System.out.println(s);
    }
}
```

**Output:**
```
inside block
B
```

**Reason:** Arrow block executes, prints "inside block", `yield "B"` is the branch result.

**Q29. What does this compile to / output?**

```java
public class Q29 {
    public static void main(String[] args) {
        int x = 0;
        // switch expression without default over int -> compile error
        String r = switch (x) {
            case 1 -> "one";
        };
        System.out.println(r);
    }
}
```

**Output:** Compile error — switch expression over `int` is not exhaustive (no `default`, can't list all ints).

**Q30. What does this print?**

```java
public class Q30 {
    public static void main(String[] args) {
        Object obj = null;
        System.out.println(switch (obj) {
            case null -> "null";
            default -> "not null";
        });
    }
}
```

**Output:**
```
null
```

**Reason:** `case null ->` (Java 21) matches null without NPE.

## Internal Working

**Q31. What bytecode do switch expressions compile to?**

`tableswitch` (dense keys) or `lookupswitch` (sparse keys), same as switch statements.

**Q32. Is there a performance difference between `switch` statement and expression?**

No — identical bytecode shape; only compile-time checking differs.

**Q33. How does the compiler verify exhaustiveness for enums?**

It checks that all enum constants appear as case labels, or that `default` is present.

**Q34. Can `yield` appear outside a switch expression block?**

No — `yield` is context-sensitive and only valid within a switch expression rule block.

**Q35. What is the type of a switch expression?**

The common type of all branch results (must be compatible); it must match the assignment target or be returned.

## Tricky Questions

**Q36. Can you use `continue` or `return` inside a switch expression branch?**

`return` works (returns from the enclosing method); `continue` only makes sense in loops (switch is not a loop).

**Q37. Can a switch expression be a statement (not assigned)?**

Yes — an expression statement can discard the result, though it's unusual.

**Q38. Are arrow branches allowed to fall through intentionally?**

No — arrow branches never fall through; that's the point.

**Q39. Is `default` allowed in an exhaustive enum switch expression?**

Yes — `default` is allowed and satisfies exhaustiveness, though redundant if all constants are listed.

**Q40. What if two arrow branches produce incompatible types?**

Compile error — all branch results must share a common type assignable to the expression's target.