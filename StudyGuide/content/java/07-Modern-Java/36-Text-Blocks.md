# Text Blocks

Text blocks (JEP 355, preview in Java 13/14, final in Java 15) are multi-line string literals delimited by triple double-quotes (`""" ... """`). They eliminate `+` concatenation and `\n` escaping for multi-line content such as SQL, JSON, HTML, and scripts.

## Syntax

A text block opens with `"""`. The opening `"""` must be followed by a line terminator (the content begins on the next line), or content can start on the same line as the closing considerations. The closing `"""` must appear alone on its own line (or at the end of content).

```java
public class TextBlockDemo {
    public static void main(String[] args) {
        String html = """
            <html>
                <body>
                    <p>Hello, world</p>
                </body>
            </html>
            """;
        System.out.println(html);
    }
}
```

The resulting string has incidental common leading whitespace stripped based on the least-indented non-empty line and the closing `"""` position.

## Incidental whitespace and stripping

The Java compiler strips incidental (common) leading whitespace. The closing `"""` position influences indentation: if the closing `"""` is indented less than content lines, content is stripped to match.

```java
String sql = """
    SELECT id, name
    FROM users
    WHERE active = 1
    """;
```

Here the common leading indent (4 spaces) is removed, producing:

```
SELECT id, name
FROM users
WHERE active = 1
```

(with a trailing newline).

Use `String.stripIndent()` (Java 11+) to remove incidental whitespace at runtime if needed.

## Line continuation

A backslash `\` at the end of a line joins it with the next (no newline). A backslash followed by a single space preserves a space.

```java
String msg = """
    Line one \
    continues here""";
// "Line one continues here"
```

## Escaping

Inside text blocks:
- `\"` is needed only when a `"` appears that could be confused with the closing `"""` (e.g., `"""` inside content). A single `"` does not need escaping.
- `\` escapes a backslash.
- `\s` represents a single space (Java 15+) — useful to preserve trailing spaces that would otherwise be trimmed.

```java
String json = """
    {
      "name": "Ada",
      "quote": \"hello\"
    }
    """;
```

## Helper methods

- `String.stripIndent()` — removes incidental whitespace (Java 11).
- `String.formatted(Object... args)` — like `String.format` but invoked on the string (Java 15).
- `String.translateEscapes()` — converts escape sequences (Java 15).

```java
String greeting = """
    Hello, %s!
    Today is %s.
    """.formatted("Ada", LocalDate.now());
```

## Use cases

- SQL queries, JSON payloads, HTML snippets, XML, regex patterns, shell scripts, multi-line error messages, JShell snippets.

## When NOT to use

- Single-line strings (use `"`).
- Performance-critical hot loops (text blocks still produce a `String`; no allocation difference vs concatenation, but no benefit either).
- Content where incidental whitespace is semantically meaningful (though `stripIndent()` normalizes).

## Edge cases

- Content that starts with `"` or `""` — escape as `\"` or break the string to avoid premature closing.
- The closing `"""` must be alone on its line; content after `"""` on the same line is not allowed at the opening.
- Trailing whitespace on lines is trimmed unless `\s` is used.

## Comparison table

| | String literal (`"..."` + `+`) | Text block (`"""..."""`) |
|---|---|---|
| Multi-line | Requires `+` and `\n` | Native |
| Escaping quotes | `\"` needed | `"` mostly fine (except `"""` sequences) |
| Readability for SQL/HTML/JSON | Poor | Good |
| Incidental whitespace | Manual | Stripped automatically |
| Runtime result | `String` | `String` |

## Performance

Text blocks compile to a constant-pool `ldc` of a `String`, identical to a regular string literal. No allocation or performance difference vs. concatenation; formatting cost applies only when calling `formatted`/`format`.

# Interview Questions

## Beginner

**Q1. What is a text block?**

A multi-line string literal delimited by `""" ... """` (Java 15+), avoiding `+` concatenation and `\n` escaping.

**Q2. What is incidental whitespace in text blocks?**

Common leading whitespace that the compiler strips based on the least-indented content line and the closing `"""` position.

**Q3. How do you continue a line without a newline in a text block?**

End the line with `\` (line continuation).

**Q4. Do you need to escape `"` inside a text block?**

Only when it forms part of `"""` that could be mistaken for the closing delimiter; a lone `"` does not need escaping.

**Q5. Are text blocks a different type from strings?**

No — they produce a regular `java.lang.String`.

## Intermediate

**Q6. How do you preserve leading whitespace that the compiler strips?**

Use `String.stripIndent()` at runtime, or `\s` for single spaces, or structure the closing `"""` indentation.

**Q7. What is `String.formatted()`?**

A `String` method (Java 15) equivalent to `String.format(this, args)` — convenient for text blocks with placeholders.

**Q8. Can text blocks contain escape sequences like `\n` and `\t`?**

Yes — they are processed normally (use `translateEscapes()` if you want raw backslashes).

**Q9. What is `translateEscapes()`?**

Converts escape sequences (`\n`, `\t`, etc.) in the string to their actual characters (Java 15).

**Q10. Is there a performance difference between text blocks and string concatenation?**

No — both produce a `String`; text blocks compile to a constant-pool entry just like literals.

## Advanced

**Q11. What is `\s` in a text block?**

Represents a single space (Java 15), used to preserve trailing spaces that trimming would otherwise remove.

**Q12. Can a text block be empty?**

`""""""` — an opening `"""` immediately followed by closing `"""` on the next line yields an empty string (with newline handling per rules).

**Q13. How does the compiler determine incidental whitespace?**

It finds the least indentation among non-empty content lines and the line containing the closing `"""`, then strips that common prefix from all content lines.

**Q14. Can text blocks be used in annotations or switch case labels?**

Anywhere a `String` constant is allowed (annotations with String elements, case labels in switch on String, etc.).

**Q15. Are text blocks thread-safe?**

They produce immutable `String` instances — yes, like all strings.

## Expert

**Q16. Can a text block contain the sequence `"""` inside content?**

Yes, but you must escape at least one quote (`\"`) so the compiler doesn't treat it as the closing delimiter.

**Q17. What is the difference between `stripIndent()` and the compiler's stripping?**

Compiler stripping happens at compile time based on source indentation; `stripIndent()` runs at runtime on an already-constructed string (useful for strings built at runtime, not text blocks).

**Q18. Do text blocks support raw strings (no escape processing)?**

No — Java text blocks still process escapes (`\n`, `\"`, etc.); there is no true raw-string mode (unlike some other languages).

**Q19. Can text blocks be `static final` fields?**

Yes — they are constant expressions if the content is constant.

**Q20. Does a text block include a trailing newline?**

If the closing `"""` is on its own line, the content before it ends with a newline (the line terminator before the closing `"""`).

## Scenario Based

**Q21. You need to embed a multi-line SQL query in Java. Text block or concatenation?**

Text block — preserves the SQL's natural formatting, is readable, and avoids `+`/`\n` clutter.

**Q22. A JSON payload has embedded double-quotes. How do you write it in a text block?**

Escape the inner quotes as `\"` where they could form `"""`; lone quotes are fine.

**Q23. Your text block has inconsistent indentation across lines. What happens?**

The compiler strips the common prefix (based on the least-indented line); remaining relative indentation is preserved.

**Q24. You want a multi-line string with no leading indentation at all. How?**

Place the closing `"""` at column 0 (no indent) so the common prefix is zero; or use `stripIndent()`.

**Q25. Are text blocks appropriate for generating source code in an annotation processor?**

Yes — they make the generated code template readable; combine with `String.formatted()` for substitution.

## Output Prediction

**Q26. What does this print?**

```java
public class Q26 {
    public static void main(String[] args) {
        String s = """
            line1
            line2
            """;
        System.out.print(s);
    }
}
```

**Output:**
```
line1
line2
```

(with a trailing newline after `line2`)

**Reason:** Common indent (8 spaces) stripped; content lines `line1`/`line2` remain, plus trailing newline before closing `"""`.

**Q27. What does this print?**

```java
public class Q27 {
    public static void main(String[] args) {
        String s = """
            Hello, %s!
            """.formatted("Ada");
        System.out.print(s);
    }
}
```

**Output:**
```
Hello, Ada!
```

**Reason:** `String.formatted` substitutes `%s`.

**Q28. What does this print?**

```java
public class Q28 {
    public static void main(String[] args) {
        String s = """
            a\
            b""";
        System.out.println(s);
    }
}
```

**Output:**
```
ab
```

**Reason:** `\` at end of line joins `a` and `b` without a newline.

**Q29. What does this print?**

```java
public class Q29 {
    public static void main(String[] args) {
        String s = """
            She said \"hi\"
            """;
        System.out.println(s);
    }
}
```

**Output:**
```
She said "hi"
```

**Reason:** `\"` escapes the inner quote; a lone `"` would also be fine here.

**Q30. What does this print?**

```java
public class Q30 {
    public static void main(String[] args) {
        String s = """
            value\s
            """;
        System.out.println("[" + s + "]");
    }
}
```

**Output:**
```
[value ]
```

**Reason:** `\s` preserves the trailing space that would otherwise be trimmed.

## Internal Working

**Q31. How does the compiler represent a text block in bytecode?**

As a constant-pool `String` (via `ldc`), identical to a regular string literal; the stripping/escape processing happens at compile time.

**Q32. Is there a `String` subclass for text blocks?**

No — they produce ordinary `java.lang.String` instances.

**Q33. When is incidental whitespace stripped — compile time or runtime?**

Compile time (for text blocks); `stripIndent()` is a separate runtime method for strings built at runtime.

**Q34. Can text blocks be interned?**

Yes — constant text blocks may be interned like any string literal (subject to the string pool).

**Q35. Do text blocks support raw strings?**

No — escapes are still processed; Java has no true raw-string literal.

## Tricky Questions

**Q36. What if content has more indentation than the closing `"""`?**

The common prefix is determined by the least-indented line (including the closing `"""` line if it has content-indent implications); extra-indented lines keep their relative extra indentation.

**Q37. Can a text block start content on the same line as the opening `"""`?**

No — `"""` must be followed by a line terminator; content begins on the next line.

**Q38. Is `\n` needed inside a text block for line breaks?**

No — actual line breaks in the source become newlines in the string.

**Q39. Are text blocks allowed in `switch` case labels (switch on String)?**

Yes — any constant string expression context accepts them.

**Q40. Does `textBlock.indent(n)` exist?**

`String.indent(int)` (Java 12+) adds/removes indentation; it works on any string including text-block results.