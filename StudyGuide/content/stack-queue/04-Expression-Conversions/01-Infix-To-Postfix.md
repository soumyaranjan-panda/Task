# 9. Infix to Postfix Conversion

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/infix-to-postfix-conversion) · [Article](https://takeuforward.org/data-structure/infix-to-postfix/) · [Video](https://youtu.be/4pIc9UBHJtk?si=ryeVvQWpCgwbTQrh)

> **Notation primer (family reference).** These six pages are one family — conversion between three ways of writing the same expression. The whole family links back to this table.

| Notation | Operator position | `A+B*C` | Structure encoded by |
|---|---|---|---|
| Infix | *between* operands | `A+B*C` | precedence + parentheses |
| Prefix | *before* operands | `+A*BC` | token position only |
| Postfix | *after* operands | `ABC*+` | token position only |

Precedence and associativity used throughout the family:

| Operator | Precedence | Associativity |
|---|---|---|
| `^` | 3 (highest) | **right** |
| `*` `/` | 2 | left |
| `+` `-` | 1 (lowest) | left |

## 1. Problem Understanding

Convert an infix expression (operators *between* operands, e.g. `"A+B*C"`) into postfix (operators *after* their operands, e.g. `"ABC*+"`), respecting operator precedence, associativity, and parentheses.

- **Input:** a string of single-letter operands, operators `+ - * / ^`, and parentheses.
- **Output:** the postfix string.
- **Precedence:** `^` highest, then `* /`, then `+ -`. `^` is right-associative; the rest are left-associative.
- **Important observation:** an operand's position in the output never has to wait for anything — the moment you see it, it's done, write it out. An **operator**, though, can't be written out immediately: whether it fires *now* or *later* depends on operators you haven't seen yet. That "must wait to see what comes next" is the whole problem.

Example: `"A+B*C"` → `"ABC*+"` (multiplication binds tighter, so `C` waits for `B`, `*` fires, and `+` — lowest precedence — fires last).

## 2. How to Think About the Problem

**What should I notice first?** Operands can go straight to the output. Operators cannot — an operator can only be safely written out once we're sure no higher-or-equal-precedence operator is about to "cut in line" ahead of it.

**Clue → Observation → Pattern → Data Structure → Algorithm:**

`operators must wait, operands don't` → `"waiting, to be resolved later" is the monotonic-stack mental model from the foundation` → `Expression Conversion` → `a stack of pending operators` → `push an operator; before pushing, pop out (to the output) any waiting operator whose precedence means it must apply first`.

**What would a human do without knowing the stack trick?** Repeatedly scan for whichever operator should logically apply *first* (highest precedence, respecting brackets and associativity), mentally "do" that operation, replace it with a placeholder, and rescan from the top. That's a completely valid way to get the right answer by hand — and it's exactly the brute force below.

## 3. Pattern Recognition

**Problem clue:** convert between notations, involving operator precedence.
**Pattern:** Expression Conversion (precedence-driven deferral).
**Why this pattern:** an operator's correct output position depends on information that hasn't arrived yet — the "unresolved elements held until something resolves them" signal.
**Mental model:** the stack holds operators that are "still waiting to see if something more urgent shows up."

```text
Operand  -> output immediately      (never waits)
Operator -> pending-operator stack  (waiting room)
'('      -> stack                   (hard wall)
')'      -> flush back to the wall
```

**Figure 1 —** Only operators are ever deferred; operands flow straight through.

**Similar problems:** Problem 14 (Infix→Prefix) reuses this exact precedence logic with a reversal twist — see there.

## 4. Brute Force

The "repeatedly resolve the most urgent operator, then rescan" idea, sketched here without parentheses handling for clarity:

```java
import java.util.List;

class InfixPostfixNaive {
    static boolean isOperator(String t) {
        return t.length() == 1 && "+-*/^".indexOf(t.charAt(0)) >= 0;
    }

    static int precedence(char op) {
        if (op == '^') return 3;
        if (op == '*' || op == '/') return 2;
        if (op == '+' || op == '-') return 1;
        return -1;
    }

    // Naive: repeatedly find the single most-urgent operator by rescanning
    // everything, resolve it, repeat. (Parentheses omitted for clarity --
    // supporting them adds yet more repeated scanning, not less.)
    static String infixToPostfixNaive(List<String> tokens) {
        while (tokens.size() > 1) {
            int bestIdx = -1, bestPrec = -1;
            for (int i = 0; i < tokens.size(); i++) {          // full rescan, every round
                if (isOperator(tokens.get(i))) {
                    int p = precedence(tokens.get(i).charAt(0));
                    if (p > bestPrec) {
                        bestPrec = p;
                        bestIdx = i;
                    }
                }
            }
            String merged = tokens.get(bestIdx - 1) + tokens.get(bestIdx + 1) + tokens.get(bestIdx);
            tokens.set(bestIdx - 1, merged);
            tokens.remove(bestIdx + 1);
            tokens.remove(bestIdx);
        }
        return tokens.get(0);
    }
}
```

**Why is this too slow?** Every single resolution re-scans the **entire** remaining token list from the start, just to find the one operator that's ready to fire — even though almost none of that list changed since the previous scan. With up to `n` operators to resolve, each needing an O(n) scan to locate, that's O(n²) total — for information (precedence relationships) that a stack could have kept sorted incrementally the whole time.

## 5. Observation

```text
Brute force (rescan the whole expression to find the next operator)
      |
      v
Repeated work: re-scanning tokens that haven't changed since last pass
      |
      v
Observation: only the MOST RECENT waiting operator can ever be "cut in
line" by a new one -- everything before it was already correctly ordered
      |
      v
Data structure: a stack of pending operators (LIFO -- the most recent
waiting operator is exactly the one to check against each newcomer)
      |
      v
Optimized solution: one left-to-right pass, O(n)
```

## 6. Optimal Approach

Scan left to right. Operand → straight to output. `(` → push. `)` → pop to output until `(` is found, then discard the `(`. Operator `c` → **while** the stack's top is an operator with precedence strictly greater than `c`, **or** equal precedence *and* `c` is left-associative, pop it to output; then push `c`.

The equal-precedence rule is precedence's version of the LIFO "who resolves first" question: for `A-B-C` (left-associative), the first `-` must fire before the second one is even placed, so equal precedence pops. For `A^B^C` (right-associative), the first `^` must **wait** for the second one to be placed first, so equal precedence does **not** pop.

## 7. Invariant

> **Invariant:** At every point in the scan, the stack (bottom→top) holds exactly the operators seen so far that have **not yet** been proven safe to output — each one is strictly lower precedence (or equal-and-right-associative) than everything below it, and every operand already output belongs entirely to operators that have already fired or are still validly waiting.

## 8. Dry Run

Dry run of `"A+B*(C-D)"`:

| i | token | stack before | operation | stack after | output so far |
|---|---|---|---|---|---|
| 0 | `A` | `[]` | → output | `[]` | `A` |
| 1 | `+` | `[]` | push (nothing to compare) | `[+]` | `A` |
| 2 | `B` | `[+]` | → output | `[+]` | `AB` |
| 3 | `*` | `[+]` | prec(+)=1 < prec(*)=2 → don't pop; push | `[+,*]` | `AB` |
| 4 | `(` | `[+,*]` | push (always) | `[+,*,(]` | `AB` |
| 5 | `C` | `[+,*,(]` | → output | `[+,*,(]` | `ABC` |
| 6 | `-` | `[+,*,(]` | top is `(` → stop condition, push | `[+,*,(,-]` | `ABC` |
| 7 | `D` | `[+,*,(,-]` | → output | `[+,*,(,-]` | `ABCD` |
| 8 | `)` | `[+,*,(,-]` | pop to output until `(`: pop `-` → output; pop & discard `(` | `[+,*]` | `ABCD-` |
| end | — | `[+,*]` | pop everything left: `*` then `+` | `[]` | `ABCD-*+` |

Result: **`ABCD-*+`** — matching `A + (B*(C-D))`. *(Verified separately against the classic textbook example `"A+B*(C^D-E)^(F+G*H)-I"` → `"ABCD^E-FGH*+^*+I-"`, including the right-associative `^` case.)*

Stack growth at the `(` boundary (just before `)`):

```text
   bottom                     top
   +-----+-----+-----+-----+
   |  +  |  *  |  (  |  -  |   <- '(' is a wall: '-' may pop, '+' may not
   +-----+-----+-----+-----+
```

**Figure 2 —** A `(` in the stack blocks every operator comparison behind it.

## 9. Why Does It Work?

Any operator sitting in the stack has, by the invariant, already been checked against every operator that arrived after it and survived — meaning nothing has proven it *needs* to fire yet. The moment a new operator arrives that a waiting one truly cannot outrank (or, for equal precedence, cannot even tie against, due to associativity), that waiting operator's fate is sealed: nothing later can un-decide it, because operator precedence only depends on what's immediately being compared, not on anything further away. So popping it *right now* — writing it to the output — is always safe and never needs to be undone.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class InfixPostfix {
    static int precedence(char op) {
        if (op == '^') return 3;
        if (op == '*' || op == '/') return 2;
        if (op == '+' || op == '-') return 1;
        return -1;
    }

    static boolean isRightAssociative(char op) {
        return op == '^';
    }

    static String infixToPostfix(String s) {
        StringBuilder output = new StringBuilder();
        Deque<Character> stack = new ArrayDeque<>();

        for (char c : s.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                output.append(c);
            } else if (c == '(') {
                stack.push(c);
            } else if (c == ')') {
                while (!stack.isEmpty() && stack.peek() != '(') output.append(stack.pop());
                stack.pop(); // discard the '('
            } else { // operator
                while (!stack.isEmpty() && stack.peek() != '(' &&
                       (precedence(stack.peek()) > precedence(c) ||
                        (precedence(stack.peek()) == precedence(c) && !isRightAssociative(c)))) {
                    output.append(stack.pop());
                }
                stack.push(c);
            }
        }
        while (!stack.isEmpty()) output.append(stack.pop());
        return output.toString();
    }
}
```

## 11. Complexity

**Time:** O(n) — every character is pushed at most once and popped at most once; the same bounded-total-touches argument as the monotonic stack.
**Space:** O(n) worst case (e.g. deeply nested parentheses, or a long chain of increasing-precedence operators).

## 12. Edge Cases

- Single operand, no operators.
- All same precedence, e.g. `"A-B-C-D"` (tests left-associativity).
- Right-associative chain, e.g. `"A^B^C"`.
- Fully parenthesized input, and unnecessary/redundant parentheses.
- Deeply nested parentheses.

## 13. Common Mistakes

- **Using `>` instead of `>=` (with the associativity check) at the equal-precedence boundary** — gets `A-B-C` or `A^B^C` backwards.
- **Forgetting the right-associativity exception for `^`** — treating it like every other operator silently breaks any expression with two or more `^` in a row.
- Popping past a `(` boundary — the stack's `(` must act as a hard stop for both operator comparisons and the closing-paren flush.
- Forgetting to discard the `(` itself after flushing to it on `)`.

## 14. Pattern to Remember

```text
Problem clue:  infix expression -> postfix, with precedence & parens
Pattern:       Expression Conversion (precedence-driven deferral)
Data structure: stack of pending operators
Stores:        operators not yet proven safe to output
Push:          after popping everything of >= precedence (mind assoc.)
Pop:           when a new operator or closing-paren proves a waiting
               one must fire now
Invariant:     stack holds operators in strictly decreasing order of
               "must-wait"
Key insight:   operands never wait; operators wait until precedence
               resolves them
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"Operands go straight through. Operators wait in line until someone more urgent shows up — or until it's finally their turn."*

## 15. Interview Trigger

> If asked to convert infix to postfix, I think: operands are free, operators must be deferred. I keep a stack of pending operators; before pushing a new one, I pop out anything already waiting that this new operator can't out-rank (watching precedence *and* associativity, especially for `^`), because parentheses form hard walls I never pop across.

## Related Problems

- [02-Prefix-To-Infix.md](02-Prefix-To-Infix.md) — prefix reconstruction, right-to-left scan.
- [03-Prefix-To-Postfix.md](03-Prefix-To-Postfix.md) — prefix input, postfix output.
- [04-Postfix-To-Prefix.md](04-Postfix-To-Prefix.md) — postfix input, prefix output.
- [05-Postfix-To-Infix.md](05-Postfix-To-Infix.md) — postfix reconstruction.
- [06-Infix-To-Prefix.md](06-Infix-To-Prefix.md) — this algorithm reversed and modified.

## See also

- [01-Implement-Stack-Using-Arrays.md](../03-Implementations/01-Implement-Stack-Using-Arrays.md) — the stack primitive this algorithm is built on.
- [02-Implement-Queue-Using-Arrays.md](../03-Implementations/02-Implement-Queue-Using-Arrays.md) — the FIFO sibling container.
- The rest of the family is two skeletons: Problems 10–11 scan prefix right→left and pop left-then-right; Problems 12–13 scan postfix left→right and pop right-then-left (the exact mirror). Problem 14 wraps this page in a reversal.
