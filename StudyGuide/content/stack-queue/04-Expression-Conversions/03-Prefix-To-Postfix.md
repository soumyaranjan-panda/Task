# 11. Prefix to Postfix Conversion

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/prefix-to-postfix-conversion) · [Article](https://takeuforward.org/data-structure/prefix-to-postfix-conversion) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

> **Notation primer:** see the infix/prefix/postfix table on [Infix to Postfix](01-Infix-To-Postfix.md). This page is part of that same conversion family.

## 1. Problem Understanding

Convert prefix (`"*+AB-CD"`) directly into postfix (`"AB+CD-*"`) — **without** going through infix as an intermediate step.

## 2. How to Think About the Problem

This is **Problem 10's algorithm, unchanged**, right down to the scan direction and which pop is which operand. The *only* thing that changes is the very last line: instead of building `"(" + left + op + right + ")"`, postfix order is simply `left + right + op` — no parentheses needed at all, because postfix's *position* alone (not brackets) is what encodes structure.

**Clue → Observation → Pattern → Data Structure → Algorithm:** identical to Problem 10 — the only difference is the output-combining rule, so if you understand Problem 10, you already understand this one.

## 3. Pattern Recognition

**Problem clue:** convert FROM prefix, TO postfix.
**Pattern:** Skeleton A (same as Problem 10) — right-to-left prefix reconstruction, different combine step.
**Mental model:** identical to Problem 10.

```text
Input  (prefix) :  * + A B - C D     scan  <----  right to left
Output (postfix):  A B + C D - *     combine  left + right + op
```

**Figure 1 —** Same right-to-left walk as Problem 10; only the assembly order changes.

**Similar problems:** Problem 10, almost verbatim.

## 4. Brute Force

Same as Problem 10: recursive parsing with a shared index, then a post-order-style string build instead of a parenthesized one.

```java
class PrefixToPostfixRecursive {
    private int idx = 0; // shared position, moves forward through the tokens

    static boolean isOperator(char c) {
        return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
    }

    String parsePrefix(String[] tokens) {
        String token = tokens[idx++];
        if (isOperator(token.charAt(0))) {
            String left = parsePrefix(tokens);
            String right = parsePrefix(tokens);
            return left + right + token; // same walk, postfix combine
        }
        return token; // operand
    }
}
```

Same conclusion — O(n) either way; the explicit stack is preferred for the same reasons (no recursion-depth risk, and it makes the underlying stack usage visible instead of hidden inside the language's call stack).

## 5. Observation

Identical to Problem 10's observation: scanning right to left makes both operands available before the operator that needs them.

## 6. Optimal Approach

Same scan, same pop order as Problem 10. Only the combine step changes: `stack.push(left + right + op)` instead of wrapping in parentheses.

## 7. Invariant

> **Invariant:** Identical in spirit to Problem 10 — the stack holds fully-built postfix sub-expressions, with the top always being the most recently completed piece.

## 8. Dry Run

Dry run of `"*+AB-CD"`:

| i (right→left) | token | stack before | operation | stack after |
|---|---|---|---|---|
| `D` | operand | `[]` | push | `[D]` |
| `C` | operand | `[D]` | push | `[D,C]` |
| `-` | operator | `[D,C]` | pop `C`(left), pop `D`(right) → `"CD-"` | `[CD-]` |
| `B` | operand | `[CD-]` | push | `[CD-,B]` |
| `A` | operand | `[CD-,B]` | push | `[CD-,B,A]` |
| `+` | operator | `[CD-,B,A]` | pop `A`(left), pop `B`(right) → `"AB+"` | `[CD-,AB+]` |
| `*` | operator | `[CD-,AB+]` | pop `AB+`(left), pop `CD-`(right) → `"AB+CD-*"` | `[AB+CD-*]` |

Result: **`AB+CD-*`** — note this is precisely the postfix form of the same expression Problem 10 converted to infix. Same input, same intermediate stack shape, different final assembly.

## 9. Why Does It Work?

Same reasoning as Problem 10: reversing the scan direction guarantees both operands of any operator are already fully resolved by the time the operator is reached. Postfix's `left + right + op` ordering is simply a direct readout of "the two most recently completed pieces, followed by what combines them" — no parentheses are needed because in postfix, *position* alone (not brackets) tells a reader unambiguously where each sub-expression starts and ends.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class PrefixToPostfix {
    static String prefixToPostfix(String s) {
        Deque<String> stack = new ArrayDeque<>();
        for (int i = s.length() - 1; i >= 0; i--) {
            char c = s.charAt(i);
            if (Character.isLetterOrDigit(c)) {
                stack.push(String.valueOf(c));
            } else { // operator
                String left = stack.pop();
                String right = stack.pop();
                stack.push(left + right + c); // the only line that differs from Problem 10
            }
        }
        return stack.pop();
    }
}
```

## 11. Complexity

Same as Problem 10: **Time** O(n) tokens (with the same string-concatenation caveat). **Space** O(n).

## 12. Edge Cases

Identical to Problem 10: single operand, deeply nested expressions, right-to-left scan bounds.

## 13. Common Mistakes

Identical to Problem 10 — swapping left/right pop order is still the #1 bug. One postfix-specific extra: **forgetting there's no parenthesis step to "save you"** — in Problem 10, a swapped-operand bug still produces syntactically valid (if wrong) parenthesized infix; here, a swapped-operand bug produces postfix that's easy to misread as correct if you don't mentally re-evaluate it.

## 14. Pattern to Remember

```text
Problem clue:  convert FROM prefix, TO postfix
Pattern:       Skeleton A (identical to Problem 10)
Data structure: stack of sub-expression strings
Scan direction: right to left
On operator:   pop LEFT then RIGHT; push left + right + operator (no parens)
Key insight:   same as Problem 10 -- only the combine step changed
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Same walk as Problem 10 — just drop the parentheses and put the operator last."*

## 15. Interview Trigger

> This is Problem 10 with a one-line change. I scan prefix right to left, push operands, and on an operator pop left-then-right — but instead of wrapping in parentheses, I just concatenate `left + right + operator`, since postfix doesn't need brackets to be unambiguous.

## Related Problems

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — the precedence-driven foundation page.
- [02-Prefix-To-Infix.md](02-Prefix-To-Infix.md) — same walk, parenthesized output.
- [04-Postfix-To-Prefix.md](04-Postfix-To-Prefix.md) — the inverse of this page.
- [05-Postfix-To-Infix.md](05-Postfix-To-Infix.md) — mirror-pop family.
- [06-Infix-To-Prefix.md](06-Infix-To-Prefix.md) — where this prefix input usually comes from.

## See also

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — notation primer for the whole family.
- [02-Implement-Queue-Using-Arrays.md](../03-Implementations/02-Implement-Queue-Using-Arrays.md) — the FIFO sibling primitive.
- Problems 10↔12 and 11↔13 are inverses of each other; round-tripping one into the other and back is a great way to sanity-check your own implementation.
