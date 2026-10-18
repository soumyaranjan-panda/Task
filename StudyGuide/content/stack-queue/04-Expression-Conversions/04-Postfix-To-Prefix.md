# 12. Postfix to Prefix Conversion

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/postfix-to-prefix-conversion) · [Article](https://takeuforward.org/data-structure/postfix-to-prefix-conversion) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

> **Notation primer:** see the infix/prefix/postfix table on [Infix to Postfix](01-Infix-To-Postfix.md). This page is part of that same conversion family.

## 1. Problem Understanding

Convert postfix (`"AB+CD-*"`) into prefix (`"*+AB-CD"`).

## 2. How to Think About the Problem

Postfix places the operator **after** its operands — the mirror image of prefix. So the mirror-image fix applies: instead of reversing the scan direction (like we did going the other way in Problems 10–11), here we can scan **left to right** directly, because by the time we reach an operator, both its operands have already appeared and are sitting ready on the stack.

**What's different from Problem 10's pop order?** Scanning left to right, the operand that appears *second* (more recently, closer to the operator) is pushed *last*, so it's popped *first* — and in postfix `"A B op"`, `A` is the left operand and `B` is the right operand, with `B` appearing second. So: **the first pop is the right operand, the second pop is the left operand** — the exact reverse of Problems 10–11's pop order. This flip is the one new thing to internalize in this half of the family.

**Clue → Observation → Pattern → Data Structure → Algorithm:**

`operator comes after its operands` → `scanning forward already gives us both operands before the operator` → `left-to-right reconstruction` → `stack of built-up sub-expressions` → `push operands; on an operator, pop twice (right first, then left) and combine`.

## 3. Pattern Recognition

**Problem clue:** convert *from* postfix notation.
**Pattern:** Skeleton B — left-to-right postfix reconstruction.
**Mental model:** same "stack of completed pieces" idea as Problems 10–11, but built forward instead of backward, with pop order flipped accordingly.

```text
Postfix:  A B + C D - *        read this way  ---->
          | |                    left to right
          | +-- operands pushed before their operator is reached
          +---- operator combines the top two sub-expressions
```

**Figure 1 —** Reading postfix forwards already puts operands before their operator.

**Similar problems:** Problem 13 (Postfix→Infix) uses the *identical* scan and pop order — only the final combine step differs, exactly as Problems 10 and 11 relate to each other.
**Recognizing this elsewhere:** whenever a token's "arguments" appear *before* it in the input (postfix, or Reverse Polish Notation calculators), a plain left-to-right scan already has everything it needs the moment it's needed — no direction reversal required.

## 4. Brute Force

Recursive parsing again, this time naturally working from the **end** of the string backward: "the last token is an operator or operand; if operator, recursively parse the operand ending just before it, twice."

```java
class PostfixToPrefixRecursive {
    private int idx; // starts at tokens.length - 1, moves BACKWARD

    PostfixToPrefixRecursive(int n) {
        this.idx = n - 1;
    }

    static boolean isOperator(char c) {
        return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
    }

    String parsePostfix(String[] tokens) {
        String token = tokens[idx--];
        if (isOperator(token.charAt(0))) {
            String right = parsePostfix(tokens); // right operand is closer to the end
            String left = parsePostfix(tokens);
            return token + left + right;
        }
        return token; // operand
    }
}
```

Also O(n) — same trade-off discussion as Problem 10: correct and linear, but the explicit stack avoids recursion-depth risk and makes the pattern visible rather than implicit in the call stack.

## 5. Observation

No reversal needed at all here — postfix already presents operands before their operator in natural reading order, so a single forward pass suffices. The only adjustment versus Problems 10–11 is which popped value is "left" and which is "right."

## 6. Optimal Approach

Scan left to right. Operand → push. Operator → pop twice: first pop = right operand, second pop = left operand; push `operator + left + right`.

## 7. Invariant

> **Invariant:** At every point in the left-to-right scan, the stack (bottom→top) holds fully-formed prefix sub-expressions for every postfix "chunk" fully consumed so far, top always being the most recently completed piece.

## 8. Dry Run

Dry run of `"AB+CD-*"` *(the postfix result from Problem 11 — this section undoes it, round-trip)*:

| i (left→right) | token | stack before | operation | stack after |
|---|---|---|---|---|
| `A` | operand | `[]` | push | `[A]` |
| `B` | operand | `[A]` | push | `[A,B]` |
| `+` | operator | `[A,B]` | pop `B`(right), pop `A`(left) → `"+AB"` | `[+AB]` |
| `C` | operand | `[+AB]` | push | `[+AB,C]` |
| `D` | operand | `[+AB,C]` | push | `[+AB,C,D]` |
| `-` | operator | `[+AB,C,D]` | pop `D`(right), pop `C`(left) → `"-CD"` | `[+AB,-CD]` |
| `*` | operator | `[+AB,-CD]` | pop `-CD`(right), pop `+AB`(left) → `"*+AB-CD"` | `[*+AB-CD]` |

Result: **`*+AB-CD`** — exactly the original prefix expression from Problem 10, confirming the round trip.

Pop order on the final `*` (stack at that instant):

```text
   bottom                 top
   +---------+---------+
   | +AB     | -CD     |
   +---------+---------+
        ^          ^
        |          +---- 1st pop = RIGHT operand
        +--------------- 2nd pop = LEFT operand
```

**Figure 2 —** Scanning left to right, the first pop is the right operand.

## 9. Why Does It Work?

Postfix places an operator immediately *after* the full sub-expression pair it combines. A left-to-right scan therefore always meets both pieces of any sub-expression *before* meeting the operator that needs them — the mirror image of why Problem 10 needed to scan backward. Because the second (right) operand is always the more-recently-pushed one, it's necessarily the one popped first.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class PostfixToPrefix {
    static String postfixToPrefix(String s) {
        Deque<String> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                stack.push(String.valueOf(c));
            } else { // operator
                String right = stack.pop();  // popped FIRST this time
                String left = stack.pop();   // popped SECOND this time
                stack.push(c + left + right);
            }
        }
        return stack.pop();
    }
}
```

## 11. Complexity

**Time:** O(n) tokens (same string-concatenation caveat as Problem 10). **Space:** O(n).

## 12. Edge Cases

Same family as Problem 10: single operand, deeply nested expressions, left-to-right scan bounds.

## 13. Common Mistakes

- **Using the SAME pop order as Problems 10–11 out of habit** — this is the single most common cross-problem mistake in this entire family. Scanning postfix left to right, it's `right` first, `left` second — the reverse of scanning prefix right to left. Mixing these up silently produces a plausible-but-wrong answer (e.g. `-DC` instead of `-CD`).
- Forgetting the operator itself goes at the *front* of the combined string for prefix (`c + left + right`), not somewhere in the middle.

## 14. Pattern to Remember

```text
Problem clue:  convert FROM postfix, TO prefix
Pattern:       Skeleton B -- left-to-right postfix reconstruction
Data structure: stack of sub-expression strings
Scan direction: left to right
On operator:   pop RIGHT first, then LEFT; push operator + left + right
Invariant:     stack top = most recently completed sub-expression
Key insight:   postfix already gives operands before their operator, so
               no reversal is needed; but the pop order flips versus the
               prefix-family problems
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Postfix: scan forwards. First pop is right, second pop is left — the mirror of the prefix family."*

## 15. Interview Trigger

> If asked to convert FROM postfix, I think: left to right works directly, no reversal — postfix already puts operands before their operator. Push operands; on an operator, pop twice, but remember it's flipped from the prefix problems: first pop is the *right* operand, second is the *left*. Push `operator + left + right`.

## Related Problems

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — the precedence-driven foundation page.
- [02-Prefix-To-Infix.md](02-Prefix-To-Infix.md) — prefix-family pop order.
- [03-Prefix-To-Postfix.md](03-Prefix-To-Postfix.md) — the inverse of this page.
- [05-Postfix-To-Infix.md](05-Postfix-To-Infix.md) — same scan and pop order, parenthesized output.
- [06-Infix-To-Prefix.md](06-Infix-To-Prefix.md) — produces the prefix form this page consumes.

## See also

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — notation primer for the whole family.
- [01-Implement-Stack-Using-Arrays.md](../03-Implementations/01-Implement-Stack-Using-Arrays.md) — the stack primitive behind these scans.
- Problems 10↔12 and 11↔13 are inverses of each other; round-tripping one into the other and back is a great way to sanity-check your own implementation.
