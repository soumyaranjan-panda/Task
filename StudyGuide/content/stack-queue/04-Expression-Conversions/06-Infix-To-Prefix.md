# 14. Infix to Prefix Conversion

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/infix-to-prefix-conversion) · [Article](https://takeuforward.org/data-structure/infix-to-prefix/) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

> **Notation primer:** see the infix/prefix/postfix table on [Infix to Postfix](01-Infix-To-Postfix.md). This page is part of that same conversion family.

## 1. Problem Understanding

Convert infix (`"(A+B)*(C-D)"`) directly into prefix (`"*+AB-CD"`).

A smaller version of the same conversion is `"(A+B)*C"` → `"*+ABC"`.

This is the hardest of the six, because — unlike Problems 10–13, which had no precedence reasoning to do — infix genuinely needs Problem 9's precedence logic. The twist: we need it running in the **opposite reading direction**, and that changes one rule in a way that's easy to get wrong.

## 2. How to Think About the Problem

**What would I try first?** "I already know how to do Infix→Postfix (Problem 9). What if I just reverse the input, swap `(`/`)`, run the *same* Problem 9 algorithm, then reverse the output?" This is a very natural instinct — and it's *almost* right.

**Why does the naive version of this fail?** Let's actually try it on `"A-B-C"` (which means `(A-B)-C`, and should become prefix `"--ABC"`). Reverse + swap brackets → `"C-B-A"`. Now run the **unmodified** Problem 9 algorithm (pop on greater-**or-equal** precedence, since `-` is left-associative):

```text
C   -> output "C"
'-' -> stack empty, push                         stack: [-]
B   -> output "CB"
'-' -> top is '-', SAME precedence, left-assoc rule pops:
       output "CB-", push '-'   stack: [-]
A   -> output "CB-A"
end -> pop remaining '-' -> output "CB-A-"
```

Reversing `"CB-A-"` gives `"-A-BC"` — **not** `"--ABC"`. Wrong!

**What went wrong?** Reversing the string also silently reverses the *effective handedness* of left-associativity. The standard "pop on equal precedence" rule is specifically correct for evaluating left-to-right ties in the *forward* direction — running it on a *reversed* string evaluates ties in the wrong effective order.

**The fix:** in this specific reversed pass, do **not** pop on equal precedence at all — only pop when the waiting operator's precedence is *strictly* greater. This one change correctly compensates for the reversal.

**Clue → Observation → Pattern → Data Structure → Algorithm:**

`need prefix, only know infix->postfix` → `reversing the string also reverses associativity's effect, so the equal-precedence tie-break must be suppressed in this direction` → `Expression Conversion, reversed` → `reverse input + swap brackets, run a MODIFIED Problem-9 pass (strict > only), then reverse the result`.

## 3. Pattern Recognition

**Problem clue:** convert infix → prefix.
**Pattern:** Expression Conversion, run backward (reuses Problem 9's core, with one rule suppressed).
**Why this pattern:** prefix is infix "read as if standing at the other end" — literally reverse the reading direction, but precedence ties need special handling because handedness flips too.
**Mental model:** "Problem 9, but blindfolded to equal-precedence ties, because the string is facing the wrong way."

```text
(A+B)*C
   |  reverse
   v
C*)B+A(
   |  swap brackets
   v
C*(B+A)
   |  modified Problem-9 pass (strict > only)
   v
CBA+*
   |  reverse
   v
*+ABC        <- prefix
```

**Figure 1 —** The four-step mirror: reverse, swap brackets, convert, reverse.

**Similar problems:** Problem 9 directly — same precedence table, same stack mechanics, only the equal-precedence pop rule and the reverse/swap wrapper are new.

## 4. Brute Force

The "obvious" idea — reverse, swap brackets, run the **unmodified** Problem 9 algorithm, reverse the result — is demonstrated above on `"A-B-C"`. It's not a *speed* problem (it's still one O(n) pass); it's a **correctness** trap: it silently produces a wrong-but-plausible-looking answer whenever an expression has two or more same-precedence, left-associative operators in a row. That's exactly the kind of bug that slips past a quick test with a single operator and only shows up on a chained expression — worth explicitly testing for.

## 5. Observation

The reversal already handles *structure* correctly (which operators are inside which parentheses, overall operator-vs-operand order). The **only** thing it gets wrong is same-precedence tie-breaking, because reversing a string reverses the effective reading order that left-associativity depends on. So: keep everything else from Problem 9 exactly as-is, and change exactly one condition — drop the "or equal precedence, if left-associative" clause, popping *only* on strictly-greater precedence.

## 6. Optimal Approach

1. Reverse the infix string, and swap every `(` for `)` and vice versa.
2. Run a modified version of Problem 9's infix-to-postfix algorithm on this reversed-and-swapped string: identical in every way, **except** the operator-popping condition becomes strict `precedence(stack.top()) > precedence(current)` only — never pop on equal precedence, regardless of associativity.
3. Reverse the resulting string. That's the prefix expression.

## 7. Invariant

> **Invariant:** Steps 1 and 3 (reverse + bracket-swap) are pure structural mirroring and preserve full correctness on their own. Step 2 maintains exactly Problem 9's invariant (the stack holds operators not yet proven safe to output) but with a redefined notion of "proven safe": in this reversed pass, only strictly-lower-precedence status proves an operator safe to keep waiting — equality is no longer sufficient, because ties need to resolve in the *original* string's left-to-right order, which this reversed pass cannot see directly.

## 8. Dry Run

Dry run of `"A-B-C"` (correct version):

| Step | Value |
|---|---|
| Original | `A-B-C` |
| 1. Reverse + swap brackets | `C-B-A` |

| i | token | stack before | modified rule: pop only if strictly greater | stack after | output |
|---|---|---|---|---|---|
| 0 | `C` | `[]` | → output | `[]` | `C` |
| 1 | `-` | `[]` | push (nothing to compare) | `[-]` | `C` |
| 2 | `B` | `[-]` | → output | `[-]` | `CB` |
| 3 | `-` | `[-]` | top `-` has EQUAL precedence, not strictly greater → do **not** pop; push | `[-,-]` | `CB` |
| 4 | `A` | `[-,-]` | → output | `[-,-]` | `CBA` |
| end | — | `[-,-]` | pop both remaining | `[]` | `CBA--` |

| Step | Value |
|---|---|
| 2. Modified postfix of reversed string | `CBA--` |
| 3. Reverse the result | **`--ABC`** (correct) |

Matches the expected prefix form exactly.

## 9. Why Does It Work?

Reversing a string and swapping its brackets is a *perfect structural mirror* — every parenthesis still bounds exactly the same sub-expression, just approached from the other side, so the "which operators can see which operands" structure survives completely intact. The only casualty of mirroring is tie-breaking order for equal-precedence operators, and suppressing the equal-precedence pop is precisely the correction needed: it forces same-precedence operators encountered in the reversed pass to stack up *without* prematurely resolving each other, so their final relative order — once the whole result is reversed back — comes out matching the *original* string's left-to-right resolution order.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class InfixPrefix {
    static int precedence(char op) {
        if (op == '^') return 3;
        if (op == '*' || op == '/') return 2;
        if (op == '+' || op == '-') return 1;
        return -1;
    }

    static String reverseAndSwapBrackets(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = s.length() - 1; i >= 0; i--) {
            char c = s.charAt(i);
            if (c == '(') sb.append(')');
            else if (c == ')') sb.append('(');
            else sb.append(c);
        }
        return sb.toString();
    }

    // Same as infixToPostfix (Problem 9), EXCEPT: pop only on STRICTLY
    // greater precedence -- never on equal.
    static String modifiedPostfixForPrefix(String s) {
        StringBuilder output = new StringBuilder();
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                output.append(c);
            } else if (c == '(') {
                stack.push(c);
            } else if (c == ')') {
                while (!stack.isEmpty() && stack.peek() != '(') output.append(stack.pop());
                stack.pop();
            } else { // operator
                while (!stack.isEmpty() && stack.peek() != '(' && precedence(stack.peek()) > precedence(c)) {
                    output.append(stack.pop());   // strictly-greater ONLY, no equal-precedence clause
                }
                stack.push(c);
            }
        }
        while (!stack.isEmpty()) output.append(stack.pop());
        return output.toString();
    }

    static String infixToPrefix(String s) {
        String reversed = reverseAndSwapBrackets(s);
        String modifiedPostfix = modifiedPostfixForPrefix(reversed);
        return new StringBuilder(modifiedPostfix).reverse().toString();
    }
}
```

## 11. Complexity

**Time:** O(n) — three linear passes (reverse+swap, modified conversion, final reverse), each O(n), so O(n) total.
**Space:** O(n) for the stack plus the intermediate strings.

## 12. Edge Cases

- Chains of same-precedence, left-associative operators (`"A-B-C-D"`) — exactly the case the naive version gets wrong; always test this specifically.
- Right-associative chains (`"A^B^C"`) — worth double-checking these still come out correctly under the modified (strict `>` only) rule too, since the *reason* `^` needed special handling in Problem 9 (right-associativity) is a different reason than why the equal-precedence rule changed here; the two corrections don't cancel each other out, they're independent and both apply.
- Fully parenthesized and redundantly parenthesized input.
- Single operand.

## 13. Common Mistakes

- **Reusing Problem 9's UNMODIFIED popping condition** — this is the defining mistake of this entire problem, demonstrated concretely above. It passes simple single-operator test cases and fails silently on chained same-precedence operators.
- Forgetting to swap brackets along with reversing the string (reversing alone inverts which paren means "open" without this fix).
- Reversing the *final* output but forgetting the *input* also needed reversing (or vice versa) — both reversals are required, one at the start and one at the end.
- Trying to "shortcut" by reusing the exact `infixToPostfix` function from Problem 9 unchanged — it looks like it should work, and that's exactly the trap.

## 14. Pattern to Remember

```text
Problem clue:  infix expression -> prefix
Pattern:       Expression Conversion, reversed (builds on Problem 9)
Data structure: stack of pending operators (same as Problem 9)
Algorithm:     reverse input + swap brackets -> modified Problem-9 pass
               (pop ONLY on strictly greater, never on equal) -> reverse
Invariant:     reversal preserves structure; suppressing equal-precedence
               pops corrects the tie-break direction reversal flips
Key insight:   reversing a string reverses left-associativity's effective
               direction -- so equal-precedence ties must NOT resolve
               during the reversed pass
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"Reverse, swap, convert blindfolded-to-ties, reverse again."*

## 15. Interview Trigger

> If asked to convert infix to prefix, I think: reverse the string, swap the brackets, and run Problem 9's algorithm — but with one deliberate change: never pop on equal precedence, only strictly greater. Then reverse the result. I specifically test a chain like `A-B-C` to make sure I actually applied that change, because skipping it produces a wrong answer that still *looks* plausible.

## Related Problems

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — the unmodified algorithm this page wraps.
- [02-Prefix-To-Infix.md](02-Prefix-To-Infix.md) — consumes the prefix form this page produces.
- [03-Prefix-To-Postfix.md](03-Prefix-To-Postfix.md) — prefix-family sibling.
- [04-Postfix-To-Prefix.md](04-Postfix-To-Prefix.md) — converts back to prefix.
- [05-Postfix-To-Infix.md](05-Postfix-To-Infix.md) — the other reconstruction page.

## See also

- [01-Infix-To-Postfix.md](01-Infix-To-Postfix.md) — notation primer and the precedence table reused here.
- [01-Implement-Stack-Using-Arrays.md](../03-Implementations/01-Implement-Stack-Using-Arrays.md) — the stack primitive behind the mirrored pass.
- Problem 9 is the only one of the six that does *live* precedence reasoning character-by-character; this page reuses that logic (with one rule suppressed), while Problems 10–13 sidestep precedence entirely because prefix/postfix already encode structure positionally.
