# 13. Postfix to Infix Conversion

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/postfix-to-infix-conversion) · [Article](https://takeuforward.org/data-structure/postfix-to-infix) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

> **Notation primer:** see the infix/prefix/postfix table on [Infix to Postfix](01-Infix-To-Postfix.md). This page is part of that same conversion family.

## 1. Problem Understanding

Convert postfix (`"AB+CD-*"`) into fully-parenthesized infix (`"((A+B)*(C-D))"`).

## 2. How to Think About the Problem

**This is Problem 12's algorithm, unchanged** — same scan direction, same pop order (right first, then left). The only difference is the final combine step: wrap in parentheses with the operator in the middle, exactly the same relationship Problem 11 has to Problem 10.

## 3. Pattern Recognition

**Problem clue:** convert FROM postfix, TO infix.
**Pattern:** Skeleton B (same as Problem 12) — left-to-right postfix reconstruction, different combine step.

The four-way symmetry across Problems 10–13 is the thing to internalize once and reuse everywhere:

| | Scan direction | 1st pop | 2nd pop | Combine |
|---|---|---|---|---|
| **10.** Prefix→Infix | right→left | left | right | `(left op right)` |
| **11.** Prefix→Postfix | right→left | left | right | `left right op` |
| **12.** Postfix→Prefix | left→right | right | left | `op left right` |
| **13.** Postfix→Infix | left→right | right | left | `(left op right)` |

**Similar problems:** Problem 12, almost verbatim.

## 4. Brute Force

Same recursive-from-the-end idea as Problem 12, same O(n) vs. explicit-stack trade-off discussion.

```java
class PostfixToInfixRecursive {
    private int idx; // starts at tokens.length - 1, moves BACKWARD

    PostfixToInfixRecursive(int n) {
        this.idx = n - 1;
    }

    static boolean isOperator(char c) {
        return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
    }

    String parsePostfix(String[] tokens) {
        String token = tokens[idx--];
        if (isOperator(token.charAt(0))) {
            String right = parsePostfix(tokens);
            String left = parsePostfix(tokens);
            return "(" + left + token + right + ")";
        }
        return token; // operand
    }
}
```

## 5. Observation

Identical to Problem 12's observation: a forward scan meets both operands before their operator, so both are always ready when needed. Only the assembly differs — parentheses around a middle operator instead of an operator at the front.

## 6. Optimal Approach

Same scan and pop order as Problem 12. Combine step: `"(" + left + operator + right + ")"`.

## 7. Invariant

> **Invariant:** Identical in spirit to Problem 12 — the stack holds fully-built infix sub-expressions, top always the most recently completed piece.

## 8. Dry Run

Dry run of `"AB+CD-*"`:

| i (left→right) | token | stack before | operation | stack after |
|---|---|---|---|---|
| `A` | operand | `[]` | push | `[A]` |
| `B` | operand | `[A]` | push | `[A,B]` |
| `+` | operator | `[A,B]` | pop `B`(right), pop `A`(left) → `"(A+B)"` | `[(A+B)]` |
| `C` | operand | `[(A+B)]` | push | `[(A+B),C]` |
| `D` | operand | `[(A+B),C]` | push | `[(A+B),C,D]` |
| `-` | operator | `[(A+B),C,D]` | pop `D`(right), pop `C`(left) → `"(C-D)"` | `[(A+B),(C-D)]` |
| `*` | operator | `[(A+B),(C-D)]` | pop `(C-D)`(right), pop `(A+B)`(left) → `"((A+B)*(C-D))"` | `[((A+B)*(C-D))]` |

Result: **`((A+B)*(C-D))`** — the same infix expression Problem 10 produced from the equivalent prefix form. Problems 10–13 form two clean round-trip pairs.

## 9. Why Does It Work?

Same reasoning as Problem 12: a forward scan meets both operands before their operator, so both are always ready when needed. Wrapping in parentheses with the operator placed between the two operands is just infix's positional convention for the same structural information postfix and prefix encode purely through token order.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class PostfixToInfix {
    static String postfixToInfix(String s) {
        Deque<String> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                stack.push(String.valueOf(c));
            } else { // operator
                String right = stack.pop();
                String left = stack.pop();
                stack.push("(" + left + c + right + ")");
            }
        }
        return stack.pop();
    }
}
```

## 11. Complexity

**Time:** O(n) tokens. **Space:** O(n).

## 12. Edge Cases

Same family as Problem 12: single operand, deeply nested expressions, left-to-right scan bounds.

## 13. Common Mistakes

Same #1 mistake as Problem 12 (pop-order mix-up with the prefix family) — plus, specifically here, putting the operator in the wrong position when building the parenthesized string (it must sit *between* `left` and `right`, not at the front like Problem 12's prefix output).

## 14. Pattern to Remember

```text
Problem clue:  convert FROM postfix, TO infix
Pattern:       Skeleton B (identical to Problem 12)
Data structure: stack of sub-expression strings
Scan direction: left to right
On operator:   pop RIGHT then LEFT; push "(" + left + operator + right + ")"
Key insight:   same as Problem 12 -- only the combine step changed
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Same walk as Problem 12 — just add parentheses and put the operator in the middle."*

## 15. Interview Trigger

> This is Problem 12 with a one-line change. Left-to-right scan, pop right-then-left on an operator — but instead of `operator + left + right`, I wrap it as `"(" + left + operator + right + ")"`.

## Related Problems

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — the precedence-driven foundation page.
- [02-Prefix-To-Infix.md](02-Prefix-To-Infix.md) — the prefix-family equivalent of this page.
- [03-Prefix-To-Postfix.md](03-Prefix-To-Postfix.md) — prefix input, postfix output.
- [04-Postfix-To-Prefix.md](04-Postfix-To-Prefix.md) — same walk, prefix output.
- [06-Infix-To-Prefix.md](06-Infix-To-Prefix.md) — the other precedence-requiring conversion.

## See also

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — notation primer for the whole family.
- [02-Implement-Queue-Using-Arrays.md](../03-Implementations/02-Implement-Queue-Using-Arrays.md) — the FIFO sibling primitive.
- Problems 10↔12 and 11↔13 are inverses of each other; round-tripping one into the other and back is a great way to sanity-check your own implementation.
