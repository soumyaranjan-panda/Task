# Stack & Queue Interview Guide — Part 3B: Problems 9–14 (Expression Conversions)

**Guide map:** `00_START_HERE.md` → `01_foundation...md` → `02_universal_thinking_framework.md` → `03_problems_01to08...md` → **`04_problems_09to14...md`** (you are here) → (more coming)

These six problems look like six separate things to memorize. They're actually **two algorithm skeletons**, each reused three times:

- **Skeleton A** (Problems 10 & 11): scan a **prefix** expression **right → left**, push operands, and on an operator pop **first = left operand, second = right operand**.
- **Skeleton B** (Problems 12 & 13): scan a **postfix** expression **left → right**, push operands, and on an operator pop **first = right operand, second = left operand**.
- **Problem 9** (Infix→Postfix) stands alone as the foundation — it's the one that actually reasons about precedence live, character by character.
- **Problem 14** (Infix→Prefix) reuses Problem 9's machinery wrapped in a reversal trick, with one crucial modification.

Read them in this order — each one leans on the last.

---

# 9. Infix to Postfix Conversion

### 1. Problem Understanding

Convert an infix expression (operators *between* operands, e.g. `"A+B*C"`) into postfix (operators *after* their operands, e.g. `"ABC*+"`), respecting operator precedence, associativity, and parentheses.

- **Input:** a string of single-letter operands, operators `+ - * / ^`, and parentheses.
- **Output:** the postfix string.
- **Precedence:** `^` highest, then `* /`, then `+ -`. `^` is right-associative; the rest are left-associative.
- **Important observation:** an operand's position in the output never has to wait for anything — the moment you see it, it's done, write it out. An **operator**, though, can't be written out immediately: whether it fires *now* or *later* depends on operators you haven't seen yet. That "must wait to see what comes next" is the whole problem.

Example: `"A+B*C"` → `"ABC*+"` (multiplication binds tighter, so `C` waits for `B`, `*` fires, and `+` — lowest precedence — fires last).

### 2. How to Think About the Problem

**What should I notice first?** Operands can go straight to the output. Operators cannot — an operator can only be safely written out once we're sure no higher-or-equal-precedence operator is about to "cut in line" ahead of it.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`operators must wait, operands don't` → `"waiting, to be resolved later" is the monotonic-stack mental model from Part 1` → `Expression Conversion` → `a stack of pending operators` → `push an operator; before pushing, pop out (to the output) any waiting operator whose precedence means it must apply first`.

**What would a human do without knowing the stack trick?** Repeatedly scan for whichever operator should logically apply *first* (highest precedence, respecting brackets and associativity), mentally "do" that operation, replace it with a placeholder, and rescan from the top. That's a completely valid way to get the right answer by hand — and it's exactly the brute force below.

### 3. Pattern Recognition

**Problem clue:** convert between notations, involving operator precedence.
**Pattern:** Expression Conversion (precedence-driven deferral).
**Why this pattern:** an operator's correct output position depends on information that hasn't arrived yet — the "unresolved elements held until something resolves them" signal from Part 1.
**Mental model:** the stack holds operators that are "still waiting to see if something more urgent shows up."
**Similar problems:** Problem 14 (Infix→Prefix) reuses this exact precedence logic with a twist — see there.

### 4. Brute Force

The "repeatedly resolve the most urgent operator, then rescan" idea, sketched here without parentheses handling for clarity:

```java
// Naive: repeatedly find the single most-urgent operator by rescanning everything, resolve it, repeat.
// (Parentheses omitted here for clarity — supporting them adds yet more repeated scanning, not less.)
String infixToPostfixNaive(List<String> tokens) {
    while (tokens.size() > 1) {
        int bestIdx = -1, bestPrec = -1;
        for (int i = 0; i < tokens.size(); i++) {           // <-- full rescan, every round
            if (isOperator(tokens.get(i))) {
                int p = precedence(tokens.get(i).charAt(0));
                if (p > bestPrec) { bestPrec = p; bestIdx = i; }
            }
        }
        String merged = tokens.get(bestIdx - 1) + tokens.get(bestIdx + 1) + tokens.get(bestIdx);
        tokens.set(bestIdx - 1, merged);
        tokens.remove(bestIdx + 1);
        tokens.remove(bestIdx);
    }
    return tokens.get(0);
}
```

**Why is this too slow?** Every single resolution re-scans the **entire** remaining token list from the start, just to find the one operator that's ready to fire — even though almost none of that list changed since the previous scan. With up to `n` operators to resolve, each needing an O(n) scan to locate, that's O(n²) total — for information (precedence relationships) that a stack could have kept sorted incrementally the whole time.

### 5. Observation

```text
Brute force (rescan the whole expression to find the next operator to resolve)
     ↓
Repeated work: re-scanning tokens that haven't changed since the last pass
     ↓
Observation: only the MOST RECENT waiting operator can ever be "cut in line" by a new one —
             everything before it was already correctly ordered relative to each other
     ↓
Data structure: a stack of pending operators (LIFO — the most recent waiting operator is
                 exactly the one that needs to be checked against each newcomer)
     ↓
Optimized solution: one left-to-right pass, O(n)
```

### 6. Optimal Approach

Scan left to right. Operand → straight to output. `(` → push. `)` → pop to output until `(` is found, then discard the `(`. Operator `c` → **while** the stack's top is an operator with precedence strictly greater than `c`, **or** equal precedence *and* `c` is left-associative, pop it to output; then push `c`.

The equal-precedence rule is precedence's version of the LIFO "who resolves first" question: for `A-B-C` (left-associative), the first `-` must fire before the second one is even placed, so equal precedence pops. For `A^B^C` (right-associative), the first `^` must **wait** for the second one to be placed first, so equal precedence does **not** pop.

### 7. Invariant

> **Invariant:** At every point in the scan, the stack (bottom→top) holds exactly the operators seen so far that have **not yet** been proven safe to output — each one is strictly lower precedence (or equal-and-right-associative) than everything below it, and every operand already output belongs entirely to operators that have already fired or are still validly waiting.

### 8. Dry Run — `"A+B*(C-D)"`

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

### 9. Why Does It Work?

Any operator sitting in the stack has, by the invariant, already been checked against every operator that arrived after it and survived — meaning nothing has proven it *needs* to fire yet. The moment a new operator arrives that a waiting one truly cannot outrank (or, for equal precedence, cannot even tie against, due to associativity), that waiting operator's fate is sealed: nothing later can un-decide it, because operator precedence only depends on what's immediately being compared, not on anything further away. So popping it *right now* — writing it to the output — is always safe and never needs to be undone.

### 10. Java Code

```java
int precedence(char op) {
    if (op == '^') return 3;
    if (op == '*' || op == '/') return 2;
    if (op == '+' || op == '-') return 1;
    return -1;
}
boolean isRightAssociative(char op) { return op == '^'; }

String infixToPostfix(String s) {
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
```

### 11. Complexity

**Time:** O(n) — every character is pushed at most once and popped at most once; the same bounded-total-touches argument as the monotonic stack.
**Space:** O(n) worst case (e.g. deeply nested parentheses, or a long chain of increasing-precedence operators).

### 12. Edge Cases

- Single operand, no operators.
- All same precedence, e.g. `"A-B-C-D"` (tests left-associativity).
- Right-associative chain, e.g. `"A^B^C"`.
- Fully parenthesized input, and unnecessary/redundant parentheses.
- Deeply nested parentheses.

### 13. Common Mistakes

- **Using `>` instead of `>=` (with the associativity check) at the equal-precedence boundary** — gets `A-B-C` or `A^B^C` backwards.
- **Forgetting the right-associativity exception for `^`** — treating it like every other operator silently breaks any expression with two or more `^` in a row.
- Popping past a `(` boundary — the stack's `(` must act as a hard stop for both operator comparisons and the closing-paren flush.
- Forgetting to discard the `(` itself after flushing to it on `)`.

### 14. Pattern to Remember

```text
Problem clue:  infix expression -> postfix, with precedence & parens
Pattern:       Expression Conversion (precedence-driven deferral)
Data structure: stack of pending operators
Stores:        operators not yet proven safe to output
Push:          after popping everything of >= precedence (mind associativity)
Pop:           when a new operator/closing-paren proves a waiting one must fire now
Invariant:     stack holds operators in strictly decreasing "must-wait" order
Key insight:   operands never wait; operators wait until precedence resolves them
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"Operands go straight through. Operators wait in line until someone more urgent shows up — or until it's finally their turn."*

### 15. Interview Trigger

> If asked to convert infix to postfix, I think: operands are free, operators must be deferred. I keep a stack of pending operators; before pushing a new one, I pop out anything already waiting that this new operator can't out-rank (watching precedence *and* associativity, especially for `^`), because parentheses form hard walls I never pop across.

---

# 10. Prefix to Infix Conversion

### 1. Problem Understanding

Convert a prefix expression (operator *before* its operands, e.g. `"*+AB-CD"`) into fully-parenthesized infix (e.g. `"((A+B)*(C-D))"`).

**What's different here:** unlike Problem 9, there's no precedence reasoning to do at all — prefix notation already fully encodes structure via *position*. The only job is reconstruction, not decision-making.

### 2. How to Think About the Problem

**What should I notice first?** In prefix, an operator comes *before* its two operands. That means by the time you've read an operator (scanning left to right), you *haven't* seen its operands yet — awkward. But scan **right to left** instead, and by the time you reach an operator, both of its operands have already been read and are sitting ready and waiting.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`operator comes before its operands` → `scanning backwards makes the operands already available` → `right-to-left reconstruction` → `stack of built-up sub-expressions` → `push operands; on an operator, pop twice and combine`.

**Which pop is which operand?** Scanning right to left, the operand closer to the operator in the original string is read *first* (it's more to the right) — but in `"op A B"`, `A` is the *left* operand and `B` is the *right* operand, and `A` appears before `B`, meaning `A` is read *after* `B` in a right-to-left scan. So `A` (left) is pushed *last*, ending up on *top* — meaning **the first thing popped is the left operand, the second is the right operand.**

### 3. Pattern Recognition

**Problem clue:** convert *from* prefix notation.
**Pattern:** Skeleton A — right-to-left prefix reconstruction.
**Why this pattern:** reversing the scan direction makes both operands of any operator already available the moment you need them.
**Mental model:** the stack holds "sub-expressions already fully built," waiting to be combined into bigger ones.
**Similar problems:** Problem 11 (Prefix→Postfix) uses the *identical* scan and pop order — only the final string-combining step differs.
**Recognizing this elsewhere:** any time a token's "arguments" appear *after* it in the input, reverse the scan direction to make them appear "before" it instead.

### 4. Brute Force

The natural first idea most people reach for is **recursive parsing with a shared index**: "the current token is an operator or an operand; if it's an operator, recursively parse the next sub-expression for the left operand, then recursively parse the one after that for the right operand."

```java
int idx = 0; // shared position, moves forward through the tokens
String parsePrefix(String[] tokens) {
    String token = tokens[idx++];
    if (isOperator(token.charAt(0))) {
        String left = parsePrefix(tokens);
        String right = parsePrefix(tokens);
        return "(" + left + token + right + ")";
    }
    return token; // operand
}
```

This is **also O(n)** — it's not "too slow" in the Big-O sense. The reason interviews still prefer the explicit right-to-left stack version: recursion depth grows with expression depth (risking stack-overflow on very deeply nested/long expressions), and — the more important reason for *this guide* — the recursive call stack **is** an implicit stack. Writing it explicitly as a `Deque` makes visible exactly what's really happening, which is the whole point of building pattern recognition rather than relying on the language's call stack to hide it from you.

### 5. Observation

Once you scan **right to left** instead of left to right, every operand is available *before* its operator is reached, because prefix's "operator first" ordering becomes "operator last" when read backwards. No recursion, no shared index — just push operands, and combine on operators.

### 6. Optimal Approach

Scan right to left. Operand → push (as a string). Operator → pop twice: first pop = left operand, second pop = right operand; push `"(" + left + operator + right + ")"`.

### 7. Invariant

> **Invariant:** At every point in the right-to-left scan, the stack (bottom→top) holds fully-formed infix sub-expressions for every prefix "chunk" fully consumed so far, in an order such that the top is always the most recently completed piece — exactly what the *next* operator (further left) needs as one of its two operands.

### 8. Dry Run — `"*+AB-CD"`

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

### 9. Why Does It Work?

Prefix notation places an operator *immediately before* its full sub-expression pair. Scanning backwards means we always meet the *pieces* of a sub-expression before we meet the operator that combines them — so by the time any operator is reached, both halves it needs are already sitting, fully resolved, at the top of the stack, ready in exactly the right order (left operand pushed last, so popped first).

### 10. Java Code

```java
String prefixToInfix(String s) {
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
```

### 11. Complexity

**Time:** O(n) single pass — but note: each `push` here is O(k) where `k` is the length of the (growing) sub-expression string, not O(1) like an integer push, because Java strings are immutable and concatenation copies. For a purely academic worst-case bound this makes the true cost closer to O(n²) in string-copying work for very large expressions; in interview terms, this is universally accepted as "O(n)" referring to the number of *tokens* processed, with the caveat worth mentioning if asked to optimize further (a `StringBuilder`-based tree structure avoids the repeated copying).
**Space:** O(n) for the stack of sub-expression strings.

### 12. Edge Cases

- Single operand, no operators.
- Deeply nested expressions (recursion-depth risk in the brute-force recursive version — not a concern for the iterative stack version).
- Right-to-left scanning off the start of the string correctly (loop bound `i >= 0`).

### 13. Common Mistakes

- **Swapping which pop is the left vs. right operand** — this is the single most common bug in this whole family of problems. Scanning right to left, the **first** pop is always the **left** operand, the **second** pop is always the **right** operand. Getting this backwards silently produces a plausible-looking but wrong expression (e.g. `(D-C)` instead of `(C-D)`), which is easy to miss without testing a non-commutative operator like `-` or `/`.
- Scanning left to right out of habit (works for postfix, not prefix).
- Forgetting to convert `char` to `String` before pushing operands onto a `Deque<String>`.

### 14. Pattern to Remember

```text
Problem clue:  convert FROM prefix notation
Pattern:       Skeleton A — right-to-left prefix reconstruction
Data structure: stack of (sub-)expression strings
Stores:        fully-built pieces, waiting to be combined
Scan direction: right to left
On operand:    push
On operator:   pop TWICE — first pop = LEFT operand, second pop = RIGHT operand
Invariant:     stack top = most recently completed sub-expression
Key insight:   reverse the scan so operands always arrive before their operator
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Prefix: scan backwards. First pop is left, second pop is right — always."*

### 15. Interview Trigger

> If asked to convert FROM prefix, I immediately think: scan right to left so operands are always ready before their operator arrives. Push operands; on an operator, pop twice — first pop is the left operand, second is the right — and push the combined result back.

---

# 11. Prefix to Postfix Conversion

### 1. Problem Understanding

Convert prefix (`"*+AB-CD"`) directly into postfix (`"AB+CD-*"`) — **without** going through infix as an intermediate step.

### 2. How to Think About the Problem

This is **Problem 10's algorithm, unchanged**, right down to the scan direction and which pop is which operand. The *only* thing that changes is the very last line: instead of building `"(" + left + op + right + ")"`, postfix order is simply `left + right + op` — no parentheses needed at all, because postfix's *position* alone (not brackets) is what encodes structure.

**Clue → Observation → Pattern → Data Structure → Algorithm:** identical to Problem 10 — the only difference is the output-combining rule, so if you understand Problem 10, you already understand this one.

### 3. Pattern Recognition

**Problem clue:** convert FROM prefix, TO postfix.
**Pattern:** Skeleton A (same as Problem 10) — right-to-left prefix reconstruction, different combine step.
**Mental model:** identical to Problem 10.
**Similar problems:** Problem 10, almost verbatim.

### 4. Brute Force

Same as Problem 10: recursive parsing with a shared index, then a post-order-style string build instead of a parenthesized one. Same conclusion — O(n) either way; the explicit stack is preferred for the same reasons (no recursion-depth risk, and it makes the underlying stack usage visible instead of hidden inside the language's call stack).

### 5. Observation

Identical to Problem 10's observation: scanning right to left makes both operands available before the operator that needs them.

### 6. Optimal Approach

Same scan, same pop order as Problem 10. Only the combine step changes: `stack.push(left + right + op)` instead of wrapping in parentheses.

### 7. Invariant

> **Invariant:** Identical in spirit to Problem 10 — the stack holds fully-built postfix sub-expressions, with the top always being the most recently completed piece.

### 8. Dry Run — `"*+AB-CD"`

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

### 9. Why Does It Work?

Same reasoning as Problem 10: reversing the scan direction guarantees both operands of any operator are already fully resolved by the time the operator is reached. Postfix's `left + right + op` ordering is simply a direct readout of "the two most recently completed pieces, followed by what combines them" — no parentheses are needed because in postfix, *position* alone (not brackets) tells a reader unambiguously where each sub-expression starts and ends.

### 10. Java Code

```java
String prefixToPostfix(String s) {
    Deque<String> stack = new ArrayDeque<>();
    for (int i = s.length() - 1; i >= 0; i--) {
        char c = s.charAt(i);
        if (Character.isLetterOrDigit(c)) {
            stack.push(String.valueOf(c));
        } else { // operator
            String left = stack.pop();
            String right = stack.pop();
            stack.push(left + right + c); // <-- the only line that differs from Problem 10
        }
    }
    return stack.pop();
}
```

### 11. Complexity

Same as Problem 10: **Time** O(n) tokens (with the same string-concatenation caveat). **Space** O(n).

### 12. Edge Cases

Identical to Problem 10.

### 13. Common Mistakes

Identical to Problem 10 — swapping left/right pop order is still the #1 bug. One postfix-specific extra: **forgetting there's no parenthesis step to "save you"** — in Problem 10, a swapped-operand bug still produces syntactically valid (if wrong) parenthesized infix; here, a swapped-operand bug produces postfix that's easy to misread as correct if you don't mentally re-evaluate it.

### 14. Pattern to Remember

```text
Problem clue:  convert FROM prefix, TO postfix
Pattern:       Skeleton A (identical to Problem 10)
Data structure: stack of sub-expression strings
Scan direction: right to left
On operator:   pop LEFT then RIGHT; push left + right + operator (no parens)
Key insight:   same as Problem 10 — only the combine step changed
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Same walk as Problem 10 — just drop the parentheses and put the operator last."*

### 15. Interview Trigger

> This is Problem 10 with a one-line change. I scan prefix right to left, push operands, and on an operator pop left-then-right — but instead of wrapping in parentheses, I just concatenate `left + right + operator`, since postfix doesn't need brackets to be unambiguous.

---

# 12. Postfix to Prefix Conversion

### 1. Problem Understanding

Convert postfix (`"AB+CD-*"`) into prefix (`"*+AB-CD"`).

### 2. How to Think About the Problem

Postfix places the operator **after** its operands — the mirror image of prefix. So the mirror-image fix applies: instead of reversing the scan direction (like we did going the other way in Problems 10–11), here we can scan **left to right** directly, because by the time we reach an operator, both its operands have already appeared and are sitting ready on the stack.

**What's different from Problem 10's pop order?** Scanning left to right, the operand that appears *second* (more recently, closer to the operator) is pushed *last*, so it's popped *first* — and in postfix `"A B op"`, `A` is the left operand and `B` is the right operand, with `B` appearing second. So: **the first pop is the right operand, the second pop is the left operand** — the exact reverse of Problems 10–11's pop order. This flip is the one new thing to internalize in this half of the file.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`operator comes after its operands` → `scanning forward already gives us both operands before the operator` → `left-to-right reconstruction` → `stack of built-up sub-expressions` → `push operands; on an operator, pop twice (right first, then left) and combine`.

### 3. Pattern Recognition

**Problem clue:** convert *from* postfix notation.
**Pattern:** Skeleton B — left-to-right postfix reconstruction.
**Mental model:** same "stack of completed pieces" idea as Problems 10–11, but built forward instead of backward, with pop order flipped accordingly.
**Similar problems:** Problem 13 (Postfix→Infix) uses the *identical* scan and pop order — only the final combine step differs, exactly as Problems 10 and 11 relate to each other.
**Recognizing this elsewhere:** whenever a token's "arguments" appear *before* it in the input (postfix, or Reverse Polish Notation calculators), a plain left-to-right scan already has everything it needs the moment it's needed — no direction reversal required.

### 4. Brute Force

Recursive parsing again, this time naturally working from the **end** of the string backward: "the last token is an operator or operand; if operator, recursively parse the operand ending just before it, twice." Also O(n) — same trade-off discussion as Problem 10: correct and linear, but the explicit stack avoids recursion-depth risk and makes the pattern visible rather than implicit in the call stack.

### 5. Observation

No reversal needed at all here — postfix already presents operands before their operator in natural reading order, so a single forward pass suffices. The only adjustment versus Problems 10–11 is which popped value is "left" and which is "right."

### 6. Optimal Approach

Scan left to right. Operand → push. Operator → pop twice: first pop = right operand, second pop = left operand; push `operator + left + right`.

### 7. Invariant

> **Invariant:** At every point in the left-to-right scan, the stack (bottom→top) holds fully-formed prefix sub-expressions for every postfix "chunk" fully consumed so far, top always being the most recently completed piece.

### 8. Dry Run — `"AB+CD-*"` *(the postfix result from Problem 11 — this section undoes it, round-trip)*

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

### 9. Why Does It Work?

Postfix places an operator immediately *after* the full sub-expression pair it combines. A left-to-right scan therefore always meets both pieces of any sub-expression *before* meeting the operator that needs them — the mirror image of why Problem 10 needed to scan backward. Because the second (right) operand is always the more-recently-pushed one, it's necessarily the one popped first.

### 10. Java Code

```java
String postfixToPrefix(String s) {
    Deque<String> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (Character.isLetterOrDigit(c)) {
            stack.push(String.valueOf(c));
        } else { // operator
            String right = stack.pop();  // <-- popped FIRST this time
            String left = stack.pop();   // <-- popped SECOND this time
            stack.push(c + left + right);
        }
    }
    return stack.pop();
}
```

### 11. Complexity

**Time:** O(n) tokens (same string-concatenation caveat as Problem 10). **Space:** O(n).

### 12. Edge Cases

Same family as Problem 10: single operand, deeply nested expressions, left-to-right scan bounds.

### 13. Common Mistakes

- **Using the SAME pop order as Problems 10–11 out of habit** — this is the single most common cross-problem mistake in this entire section. Scanning postfix left to right, it's `right` first, `left` second — the reverse of scanning prefix right to left. Mixing these up silently produces a plausible-but-wrong answer (e.g. `-DC` instead of `-CD`).
- Forgetting the operator itself goes at the *front* of the combined string for prefix (`c + left + right`), not somewhere in the middle.

### 14. Pattern to Remember

```text
Problem clue:  convert FROM postfix, TO prefix
Pattern:       Skeleton B — left-to-right postfix reconstruction
Data structure: stack of sub-expression strings
Scan direction: left to right
On operator:   pop RIGHT first, then LEFT; push operator + left + right
Invariant:     stack top = most recently completed sub-expression
Key insight:   postfix already gives operands before their operator — no reversal needed;
               but the pop order flips versus the prefix-family problems
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Postfix: scan forwards. First pop is right, second pop is left — the mirror of the prefix family."*

### 15. Interview Trigger

> If asked to convert FROM postfix, I think: left to right works directly, no reversal — postfix already puts operands before their operator. Push operands; on an operator, pop twice, but remember it's flipped from the prefix problems: first pop is the *right* operand, second is the *left*. Push `operator + left + right`.

---

# 13. Postfix to Infix Conversion

### 1. Problem Understanding

Convert postfix (`"AB+CD-*"`) into fully-parenthesized infix (`"((A+B)*(C-D))"`).

### 2. How to Think About the Problem

**This is Problem 12's algorithm, unchanged** — same scan direction, same pop order (right first, then left). The only difference is the final combine step: wrap in parentheses with the operator in the middle, exactly the same relationship Problem 11 has to Problem 10.

### 3. Pattern Recognition

**Problem clue:** convert FROM postfix, TO infix.
**Pattern:** Skeleton B (same as Problem 12) — left-to-right postfix reconstruction, different combine step.
**Similar problems:** Problem 12, almost verbatim — and note the four-way symmetry across Problems 10–13:

| | Scan direction | 1st pop | 2nd pop | Combine |
|---|---|---|---|---|
| **10.** Prefix→Infix | right→left | left | right | `(left op right)` |
| **11.** Prefix→Postfix | right→left | left | right | `left right op` |
| **12.** Postfix→Prefix | left→right | right | left | `op left right` |
| **13.** Postfix→Infix | left→right | right | left | `(left op right)` |

### 4. Brute Force

Same recursive-from-the-end idea as Problem 12, same O(n) vs. explicit-stack trade-off discussion.

### 5. Observation

Identical to Problem 12's observation.

### 6. Optimal Approach

Same scan and pop order as Problem 12. Combine step: `"(" + left + operator + right + ")"`.

### 7. Invariant

> **Invariant:** Identical in spirit to Problem 12 — the stack holds fully-built infix sub-expressions, top always the most recently completed piece.

### 8. Dry Run — `"AB+CD-*"`

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

### 9. Why Does It Work?

Same reasoning as Problem 12: a forward scan meets both operands before their operator, so both are always ready when needed. Wrapping in parentheses with the operator placed between the two operands is just infix's positional convention for the same structural information postfix and prefix encode purely through token order.

### 10. Java Code

```java
String postfixToInfix(String s) {
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
```

### 11. Complexity

**Time:** O(n) tokens. **Space:** O(n).

### 12. Edge Cases

Same family as Problem 12.

### 13. Common Mistakes

Same #1 mistake as Problem 12 (pop-order mix-up with the prefix family) — plus, specifically here, putting the operator in the wrong position when building the parenthesized string (it must sit *between* `left` and `right`, not at the front like Problem 12's prefix output).

### 14. Pattern to Remember

```text
Problem clue:  convert FROM postfix, TO infix
Pattern:       Skeleton B (identical to Problem 12)
Data structure: stack of sub-expression strings
Scan direction: left to right
On operator:   pop RIGHT then LEFT; push "(" + left + operator + right + ")"
Key insight:   same as Problem 12 — only the combine step changed
Time / Space:  O(n) tokens / O(n)
```

**Memory trick:** *"Same walk as Problem 12 — just add parentheses and put the operator in the middle."*

### 15. Interview Trigger

> This is Problem 12 with a one-line change. Left-to-right scan, pop right-then-left on an operator — but instead of `operator + left + right`, I wrap it as `"(" + left + operator + right + ")"`.

---

# 14. Infix to Prefix Conversion

### 1. Problem Understanding

Convert infix (`"(A+B)*(C-D)"`) directly into prefix (`"*+AB-CD"`).

This is the hardest of the six, because — unlike Problems 10–13, which had no precedence reasoning to do — infix genuinely needs Problem 9's precedence logic. The twist: we need it running in the **opposite reading direction**, and that changes one rule in a way that's easy to get wrong.

### 2. How to Think About the Problem

**What would I try first?** "I already know how to do Infix→Postfix (Problem 9). What if I just reverse the input, swap `(`/`)`, run the *same* Problem 9 algorithm, then reverse the output?" This is a very natural instinct — and it's *almost* right.

**Why does the naive version of this fail?** Let's actually try it on `"A-B-C"` (which means `(A-B)-C`, and should become prefix `"--ABC"`). Reverse + swap brackets → `"C-B-A"`. Now run the **unmodified** Problem 9 algorithm (pop on greater-**or-equal** precedence, since `-` is left-associative):

```text
C -> output "C"
'-' -> stack empty, push               stack: [-]
B -> output "CB"
'-' -> top is '-', SAME precedence, left-assoc rule says POP -> output "CB-", push new '-'   stack: [-]
A -> output "CB-A"
end -> pop remaining '-'  -> output "CB-A-"
```

Reversing `"CB-A-"` gives `"-A-BC"` — **not** `"--ABC"`. Wrong!

**What went wrong?** Reversing the string also silently reverses the *effective handedness* of left-associativity. The standard "pop on equal precedence" rule is specifically correct for evaluating left-to-right ties in the *forward* direction — running it on a *reversed* string evaluates ties in the wrong effective order.

**The fix:** in this specific reversed pass, do **not** pop on equal precedence at all — only pop when the waiting operator's precedence is *strictly* greater. This one change correctly compensates for the reversal.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`need prefix, only know infix->postfix` → `reversing the string also reverses associativity's effect, so the equal-precedence tie-break must be suppressed in this direction` → `Expression Conversion, reversed` → `reverse input + swap brackets, run a MODIFIED Problem-9 pass (strict `>` only), then reverse the result`.

### 3. Pattern Recognition

**Problem clue:** convert infix → prefix.
**Pattern:** Expression Conversion, run backward (reuses Problem 9's core, with one rule suppressed).
**Why this pattern:** prefix is infix "read as if standing at the other end" — literally reverse the reading direction, but precedence ties need special handling because handedness flips too.
**Mental model:** "Problem 9, but blindfolded to equal-precedence ties, because the string is facing the wrong way."
**Similar problems:** Problem 9 directly — same precedence table, same stack mechanics, only the equal-precedence pop rule and the reverse/swap wrapper are new.

### 4. Brute Force

The "obvious" idea — reverse, swap brackets, run the **unmodified** Problem 9 algorithm, reverse the result — demonstrated above on `"A-B-C"`. It's not a *speed* problem (it's still one O(n) pass); it's a **correctness** trap: it silently produces a wrong-but-plausible-looking answer whenever an expression has two or more same-precedence, left-associative operators in a row. That's exactly the kind of bug that slips past a quick test with a single operator and only shows up on a chained expression — worth explicitly testing for.

### 5. Observation

The reversal already handles *structure* correctly (which operators are inside which parentheses, overall operator-vs-operand order). The **only** thing it gets wrong is same-precedence tie-breaking, because reversing a string reverses the effective reading order that left-associativity depends on. So: keep everything else from Problem 9 exactly as-is, and change exactly one condition — drop the "or equal precedence, if left-associative" clause, popping *only* on strictly-greater precedence.

### 6. Optimal Approach

1. Reverse the infix string, and swap every `(` for `)` and vice versa.
2. Run a modified version of Problem 9's infix-to-postfix algorithm on this reversed-and-swapped string: identical in every way, **except** the operator-popping condition becomes strict `precedence(stack.top()) > precedence(current)` only — never pop on equal precedence, regardless of associativity.
3. Reverse the resulting string. That's the prefix expression.

### 7. Invariant

> **Invariant:** Steps 1 and 3 (reverse + bracket-swap) are pure structural mirroring and preserve full correctness on their own. Step 2 maintains exactly Problem 9's invariant (the stack holds operators not yet proven safe to output) but with a redefined notion of "proven safe": in this reversed pass, only strictly-lower-precedence status proves an operator safe to keep waiting — equality is no longer sufficient, because ties need to resolve in the *original* string's left-to-right order, which this reversed pass cannot see directly.

### 8. Dry Run — `"A-B-C"` (correct version)

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
| 3. Reverse the result | **`--ABC`** ✓ |

Matches the expected prefix form exactly.

### 9. Why Does It Work?

Reversing a string and swapping its brackets is a *perfect structural mirror* — every parenthesis still bounds exactly the same sub-expression, just approached from the other side, so the "which operators can see which operands" structure survives completely intact. The only casualty of mirroring is tie-breaking order for equal-precedence operators, and suppressing the equal-precedence pop is precisely the correction needed: it forces same-precedence operators encountered in the reversed pass to stack up *without* prematurely resolving each other, so their final relative order — once the whole result is reversed back — comes out matching the *original* string's left-to-right resolution order.

### 10. Java Code

```java
String reverseAndSwapBrackets(String s) {
    StringBuilder sb = new StringBuilder();
    for (int i = s.length() - 1; i >= 0; i--) {
        char c = s.charAt(i);
        if (c == '(') sb.append(')');
        else if (c == ')') sb.append('(');
        else sb.append(c);
    }
    return sb.toString();
}

// Same as infixToPostfix (Problem 9), EXCEPT: pop only on STRICTLY greater precedence — never on equal.
String modifiedPostfixForPrefix(String s) {
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
                output.append(stack.pop());   // <-- strictly-greater ONLY, no equal-precedence clause
            }
            stack.push(c);
        }
    }
    while (!stack.isEmpty()) output.append(stack.pop());
    return output.toString();
}

String infixToPrefix(String s) {
    String reversed = reverseAndSwapBrackets(s);
    String modifiedPostfix = modifiedPostfixForPrefix(reversed);
    return new StringBuilder(modifiedPostfix).reverse().toString();
}
```

### 11. Complexity

**Time:** O(n) — three linear passes (reverse+swap, modified conversion, final reverse), each O(n), so O(n) total.
**Space:** O(n) for the stack plus the intermediate strings.

### 12. Edge Cases

- Chains of same-precedence, left-associative operators (`"A-B-C-D"`) — exactly the case the naive version gets wrong; always test this specifically.
- Right-associative chains (`"A^B^C"`) — worth double-checking these still come out correctly under the modified (strict `>` only) rule too, since the *reason* `^` needed special handling in Problem 9 (right-associativity) is a different reason than why the equal-precedence rule changed here; the two corrections don't cancel each other out, they're independent and both apply.
- Fully parenthesized and redundantly parenthesized input.
- Single operand.

### 13. Common Mistakes

- **Reusing Problem 9's UNMODIFIED popping condition** — this is the defining mistake of this entire problem, demonstrated concretely above. It passes simple single-operator test cases and fails silently on chained same-precedence operators.
- Forgetting to swap brackets along with reversing the string (reversing alone inverts which paren means "open" without this fix).
- Reversing the *final* output but forgetting the *input* also needed reversing (or vice versa) — both reversals are required, one at the start and one at the end.
- Trying to "shortcut" by reusing the exact `infixToPostfix` function from Problem 9 unchanged — it looks like it should work, and that's exactly the trap.

### 14. Pattern to Remember

```text
Problem clue:  infix expression -> prefix
Pattern:       Expression Conversion, reversed (builds on Problem 9)
Data structure: stack of pending operators (same as Problem 9)
Algorithm:     reverse input + swap brackets -> modified Problem-9 pass
               (pop ONLY on strictly greater precedence, never on equal) -> reverse result
Invariant:     reversal preserves structure; suppressing equal-precedence pops
               corrects the tie-break direction that reversal flips
Key insight:   reversing a string reverses left-associativity's effective direction —
               so equal-precedence ties must NOT resolve during the reversed pass
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"Reverse, swap, convert blindfolded-to-ties, reverse again."*

### 15. Interview Trigger

> If asked to convert infix to prefix, I think: reverse the string, swap the brackets, and run Problem 9's algorithm — but with one deliberate change: never pop on equal precedence, only strictly greater. Then reverse the result. I specifically test a chain like `A-B-C` to make sure I actually applied that change, because skipping it produces a wrong answer that still *looks* plausible.

---

## Pattern Connections Recap (Problems 9–14)

- **Problem 9** is the only one of the six that does *live* precedence reasoning character-by-character — everything else in this file either reuses its logic (Problem 14) or sidesteps precedence entirely because prefix/postfix already encode structure positionally (Problems 10–13).
- **Problems 10 & 11** are one algorithm (scan prefix right→left, pop left-then-right) wearing two output formats.
- **Problems 12 & 13** are one algorithm (scan postfix left→right, pop right-then-left) wearing two output formats — and note this pop order is the exact *mirror* of Problems 10–11's, which is the single most common mix-up across this whole family.
- **Problem 14** is Problem 9 wrapped in a reversal, with exactly one rule suppressed (no popping on equal precedence) to correct for the fact that reversing a string reverses left-associativity's effective direction.
- Problems 10↔12 and 11↔13 are inverses of each other — round-tripping one into the other and back is a great way to sanity-check your own implementation.

---

**Next:** [`05_problems_15to18_monotonic_stack_core.md`](05_problems_15to18_monotonic_stack_core.md) — Next Greater Element and its three closest relatives: the core monotonic-stack family flagged as most important back in Part 1.
