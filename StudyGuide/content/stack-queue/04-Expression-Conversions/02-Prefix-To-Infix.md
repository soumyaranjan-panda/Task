# 10. Prefix to Infix Conversion

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/prefix-to-infix-conversion) · [Article](https://takeuforward.org/data-structure/prefix-to-infix-conversion) · [Video](https://youtu.be/4pIc9UBHJtk?si=ryeVvQWpCgwbTQrh)

> **Notation primer:** see the infix/prefix/postfix table on [Infix to Postfix](01-Infix-To-Postfix.md). This page is part of that same conversion family.

## 1. Problem Understanding

Convert a prefix expression (operator *before* its operands, e.g. `"*+AB-CD"`) into fully-parenthesized infix (e.g. `"((A+B)*(C-D))"`).

**What's different here:** unlike Problem 9, there's no precedence reasoning to do at all — prefix notation already fully encodes structure via *position*. The only job is reconstruction, not decision-making.

## 2. How to Think About the Problem

**What should I notice first?** In prefix, an operator comes *before* its two operands. That means by the time you've read an operator (scanning left to right), you *haven't* seen its operands yet — awkward. But scan **right to left** instead, and by the time you reach an operator, both of its operands have already been read and are sitting ready and waiting.

**Clue → Observation → Pattern → Data Structure → Algorithm:**

`operator comes before its operands` → `scanning backwards makes the operands already available` → `right-to-left reconstruction` → `stack of built-up sub-expressions` → `push operands; on an operator, pop twice and combine`.

**Which pop is which operand?** Scanning right to left, the operand closer to the operator in the original string is read *first* (it's more to the right) — but in `"op A B"`, `A` is the *left* operand and `B` is the *right* operand, and `A` appears before `B`, meaning `A` is read *after* `B` in a right-to-left scan. So `A` (left) is pushed *last*, ending up on *top* — meaning **the first thing popped is the left operand, the second is the right operand.**

## 3. Pattern Recognition

**Problem clue:** convert *from* prefix notation.
**Pattern:** Skeleton A — right-to-left prefix reconstruction.
**Why this pattern:** reversing the scan direction makes both operands of any operator already available the moment you need them.
**Mental model:** the stack holds "sub-expressions already fully built," waiting to be combined into bigger ones.

```text
Prefix:   * + A B - C D        read this way  <----
          | |                    right to left
          | +-- operands pushed before their operator is reached
          +---- operator combines the top two sub-expressions
```

**Figure 1 —** Reading prefix backwards turns "operator first" into "operator last".

**Similar problems:** Problem 11 (Prefix→Postfix) uses the *identical* scan and pop order — only the final string-combining step differs.
**Recognizing this elsewhere:** any time a token's "arguments" appear *after* it in the input, reverse the scan direction to make them appear "before" it instead.

## 4. Brute Force

The natural first idea most people reach for is **recursive parsing with a shared index**: "the current token is an operator or an operand; if it's an operator, recursively parse the next sub-expression for the left operand, then recursively parse the one after that for the right operand."

```java
class PrefixToInfixRecursive {
    private int idx = 0; // shared position, moves forward through the tokens

    static boolean isOperator(char c) {
        return c == '+' || c == '-' || c == '*' || c == '/' || c == '^';
    }

    String parsePrefix(String[] tokens) {
        String token = tokens[idx++];
        if (isOperator(token.charAt(0))) {
            String left = parsePrefix(tokens);
            String right = parsePrefix(tokens);
            return "(" + left + token + right + ")";
        }
        return token; // operand
    }
}
```

This is **also O(n)** — it's not "too slow" in the Big-O sense. The reason interviews still prefer the explicit right-to-left stack version: recursion depth grows with expression depth (risking stack-overflow on very deeply nested/long expressions), and — the more important reason here — the recursive call stack **is** an implicit stack. Writing it explicitly as a `Deque` makes visible exactly what's really happening, which is the whole point of building pattern recognition rather than relying on the language's call stack to hide it from you.

## 5. Observation

Once you scan **right to left** instead of left to right, every operand is available *before* its operator is reached, because prefix's "operator first" ordering becomes "operator last" when read backwards. No recursion, no shared index — just push operands, and combine on operators.

## 6. Optimal Approach

Scan right to left. Operand → push (as a string). Operator → pop twice: first pop = left operand, second pop = right operand; push `"(" + left + operator + right + ")"`.

## 7. Invariant

> **Invariant:** At every point in the right-to-left scan, the stack (bottom→top) holds fully-formed infix sub-expressions for every prefix "chunk" fully consumed so far, in an order such that the top is always the most recently completed piece — exactly what the *next* operator (further left) needs as one of its two operands.

## 8. Dry Run

Dry run of `"*+AB-CD"`:

| i (right→left) | token | stack before | operation | stack after |
|---|---|---|---|---|
| `D` | operand | `[]` | push | `[D]` |
| `C` | operand | `[D]` | push | `[D,C]` |
| `-` | operator | `[D,C]` | pop `C`(left), pop `D`(right) → `"(C-D)"` | `[(C-D)]` |
| `B` | operand | `[(C-D)]` | push | `[(C-D),B]` |
| `A` | operand | `[(C-D),B]` | push | `[(C-D),B,A]` |
| `+` | operator | `[(C-D),B,A]` | pop `A`(left), pop `B`(right) → `"(A+B)"` | `[(C-D),(A+B)]` |
| `*` | operator | `[(C-D),(A+B)]` | pop `(A+B)`(left), pop `(C-D)`(right) → `"((A+B)*(C-D))"` | `[((A+B)*(C-D))]` |

Result: **`((A+B)*(C-D))`**.

Pop order on the final `*` (stack at that instant):

```text
   bottom                 top
   +---------+---------+
   | (C-D)   | (A+B)   |
   +---------+---------+
        ^          ^
        |          +---- 2nd pop = right operand
        +--------------- 1st pop = left operand
```

**Figure 2 —** Scanning right to left, the first pop is the left operand.

## 9. Why Does It Work?

Prefix notation places an operator *immediately before* its full sub-expression pair. Scanning backwards means we always meet the *pieces* of a sub-expression before we meet the operator that combines them — so by the time any operator is reached, both halves it needs are already sitting, fully resolved, at the top of the stack, ready in exactly the right order (left operand pushed last, so popped first).

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class PrefixToInfix {
    static String prefixToInfix(String s) {
        Deque<String> stack = new ArrayDeque<>();
        for (int i = s.length() - 1; i >= 0; i--) {
            char c = s.charAt(i);
            if (Character.isLetterOrDigit(c)) {
                stack.push(String.valueOf(c));
            } else { // operator
                String left = stack.pop();
                String right = stack.pop();
                stack.push("(" + left + c + right + ")");
            }
        }
        return stack.pop();
    }
}
```

## 11. Complexity

**Time:** O(n) single pass — but note: each `push` here is O(k) where `k` is the length of the (growing) sub-expression string, not O(1) like an integer push, because Java strings are immutable and concatenation copies. For a purely academic worst-case bound this makes the true cost closer to O(n²) in string-copying work for very large expressions; in interview terms, this is universally accepted as "O(n)" referring to the number of *tokens* processed, with the caveat worth mentioning if asked to optimize further (a `StringBuilder`-based tree structure avoids the repeated copying).
**Space:** O(n) for the stack of sub-expression strings.

## 12. Edge Cases

- Single operand, no operators.
- Deeply nested expressions (recursion-depth risk in the brute-force recursive version — not a concern for the iterative stack version).
- Right-to-left scanning off the start of the string correctly (loop bound `i >= 0`).

## 13. Common Mistakes

- **Swapping which pop is the left vs. right operand** — this is the single most common bug in this whole family of problems. Scanning right to left, the **first** pop is always the **left** operand, the **second** pop is always the **right** operand. Getting this backwards silently produces a plausible-looking but wrong expression (e.g. `(D-C)` instead of `(C-D)`), which is easy to miss without testing a non-commutative operator like `-` or `/`.
- Scanning left to right out of habit (works for postfix, not prefix).
- Forgetting to convert `char` to `String` before pushing operands onto a `Deque<String>`.

## 14. Pattern to Remember

```text
Problem clue:  convert FROM prefix notation
Pattern:       Skeleton A -- right-to-left prefix reconstruction
Data structure: stack of (sub-)expression strings
Stores:        fully-built pieces, waiting to be combined
Scan direction: right to left
On operand:    push
On operator:   pop TWICE -- first pop = LEFT, second pop = RIGHT operand
Invariant:     stack top = most recently completed sub-expression
Key insight:   reverse the scan so operands always arrive before their
               operator
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Prefix: scan backwards. First pop is left, second pop is right — always."*

## 15. Interview Trigger

> If asked to convert FROM prefix, I immediately think: scan right to left so operands are always ready before their operator arrives. Push operands; on an operator, pop twice — first pop is the left operand, second is the right — and push the combined result back.

## Related Problems

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — the precedence-driven foundation page.
- [03-Prefix-To-Postfix.md](03-Prefix-To-Postfix.md) — same scan and pop order, different combine step.
- [04-Postfix-To-Prefix.md](04-Postfix-To-Prefix.md) — the mirror-image scan and pop order.
- [05-Postfix-To-Infix.md](05-Postfix-To-Infix.md) — mirror of this page.
- [06-Infix-To-Prefix.md](06-Infix-To-Prefix.md) — produces exactly the prefix form this page consumes.

## See also

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — notation primer for the whole family.
- [01-Implement-Stack-Using-Arrays.md](../03-Implementations/01-Implement-Stack-Using-Arrays.md) — the stack primitive behind these scans.
- Problems 10↔12 and 11↔13 are inverses of each other; round-tripping one into the other and back is a great way to sanity-check your own implementation.
