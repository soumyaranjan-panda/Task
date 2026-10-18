# 7. Balanced Parentheses

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/balanced-paranthesis) · [Article](https://takeuforward.org/data-structure/check-for-balanced-parentheses/) · [Video](https://youtu.be/xwjS0iZhw4I?si=UoyKpFn4Q3nf5h2R) — **LeetCode:** [Problem](https://leetcode.com/problems/valid-parentheses/)

## 1. Problem Understanding

Given a string of brackets — possibly several types, `()`, `[]`, `{}` — determine whether every opening bracket has a matching closing bracket, in the correct nested order (not just equal *counts*).

- **Input:** a string of bracket characters (sometimes mixed with other characters to ignore).
- **Output:** boolean.
- **Important observation:** "correct order" is the whole problem. `"([)]"` has equal counts of every bracket type but is **not** balanced, because the brackets cross instead of nesting.

Example:

```text
{ [ ( ) ] }  -> valid
{ [ ( ] ) }  -> invalid
```

`"{[()]}"` → `true`. `"{[(])}"` → `false`.

## 2. How to Think About the Problem

**What should I notice first?** The word "nested," or just visualizing brackets inside brackets.

**What clue matters?** When a *closing* bracket arrives, which opening bracket must it match? Answer: the most recently opened one that hasn't been closed yet — because valid brackets must nest, never cross.

**What would I try first (before knowing the trick)?** Count opens and closes of each type separately, and check the counts are equal.

**Why is that wrong (not just slow)?** It only checks *quantity*, never *order*. It happily accepts `"([)]"` as balanced, which is actually invalid. This isn't a speed problem — the brute-force idea can't even represent the concept of nesting, so no amount of optimizing it fixes it. A genuinely different data structure is needed: one that remembers *order*, not just counts.

**What observation unlocks the real solution?** "The most recently opened, still-unclosed bracket" is precisely what a stack's top gives you, automatically. Push every opener; when a closer arrives, it *must* match the top of the stack right now — if it doesn't, the string is unbalanced, immediately.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** nested/matching brackets
**Observation:** the latest unmatched opening bracket must close first
**Pattern:** LIFO matching
**Data structure:** stack
**Algorithm:** push opens, pop on closes

## 3. Pattern Recognition

**Problem clue:** matching / nesting / open–close pairs.
**Pattern:** Stack — Matching.
**Why this pattern:** correct nesting means "most recently opened, first closed" — LIFO by definition. Nested structures close in reverse order of opening.
**Mental model:** the stack *is* your live record of "still open, waiting to be closed."

```text
push '('
push '['
push '{'
close '}' -> must match '{'
close ']' -> must match '['
close ')' -> must match '('
```

**Similar problems:** any "valid X" problem about nested structure — valid HTML/XML tags, path simplification, matching in a compiler/parser, XML-like nesting, expression parsing, function scopes.
**Recognizing this elsewhere:** whenever a problem says "valid" and gives you paired tokens (opening/closing, start/end, begin/end), think stack immediately.

## 4. Brute Force

The "count only" idea:

```java
// WRONG — counts only, ignores order entirely
boolean countOnly(String s) {
    int round = 0, square = 0, curly = 0;
    for (char c : s.toCharArray()) {
        if (c == '(') round++;  else if (c == ')') round--;
        else if (c == '[') square++; else if (c == ']') square--;
        else if (c == '{') curly++;  else if (c == '}') curly--;
    }
    return round == 0 && square == 0 && curly == 0;
}
```

**Why is this wrong?** It passes `"([)]"` as balanced (all three counters end at 0), which is actually invalid. This isn't fixable by optimizing — the approach fundamentally cannot represent "order," only "quantity."

Another brute-force flavor: repeatedly remove `()`, `[]`, `{}` pairs from the string. This repeatedly scans and modifies the string, which can become O(n²).

## 5. Observation

An unclosed opening bracket's *identity* matters, and specifically, only the **most recent** unclosed one is allowed to match the next closer. That's a LIFO relationship — exactly what a stack tracks natively.

We only need the most recent unmatched opening bracket. The stack remembers exactly that.

```text
repeated rescanning
        ↓
remember unresolved opens
        ↓
stack
```

## 6. Optimal Approach

Push every opening bracket onto a stack. On a closing bracket: if the stack is empty, there's nothing for it to match — unbalanced. Otherwise pop the top and check it's the correct matching opener; if not, unbalanced. At the end, the stack must be completely empty (no leftover unclosed openers).

For each character:

- opening bracket -> push it
- closing bracket -> top must be its matching opener, then pop
- otherwise invalid

## 7. Invariant

> **Invariant:** While scanning left to right, the stack (bottom→top) always holds exactly the sequence of opening brackets seen so far that have *not yet* been matched by a closer, in the order they were opened — so the top is always the most recently opened, still-unresolved bracket.

## 8. Dry Run

Input `"{[()]}"`:

| i | char | stack before | operation | stack after |
|---|---|---|---|---|
| 0 | `{` | `[]` | push | `[{]` |
| 1 | `[` | `[{]` | push | `[{,[]` |
| 2 | `(` | `[{,[]` | push | `[{,[,(]` |
| 3 | `)` | `[{,[,(]` | pop `(`, matches `)` (OK) | `[{,[]` |
| 4 | `]` | `[{,[]` | pop `[`, matches `]` (OK) | `[{]` |
| 5 | `}` | `[{]` | pop `{`, matches `}` (OK) | `[]` |
| end | — | `[]` | stack empty → **balanced** | — |

Also, for input `([{}])`:

| char | stack before | action | stack after |
|---|---|---|---|
| `(` | [] | push | [(] |
| `[` | [(] | push | [(,[] |
| `{` | [(,[] | push | [(,[,{] |
| `}` | ... | pop `{` | [(,[] |
| `]` | ... | pop `[` | [(] |
| `)` | ... | pop `(` | [] |

For `"{[(])}"`: at position `)`, the stack top is `[` (not `(`) — the check fails immediately (popped `[`, needed `(` for `)`) → return `false` right there, without scanning further.

## 9. Why Does It Work?

Valid brackets must nest, never cross — so the only opener a given closer is ever allowed to match is the innermost one still open. "Innermost still open" is mathematically identical to "most recently pushed, not yet popped," which a stack gives you automatically, with zero extra bookkeeping. If a closer ever needs to reach past the top of the stack to find its match, that's precisely what "not balanced" means.

## 10. Java Code

```java
class Solution {
    public boolean isBalanced(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                stack.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                if (stack.isEmpty()) return false;   // closer with nothing open
                char open = stack.pop();              // unbox to primitive char — see Common Mistakes
                if ((c == ')' && open != '(') ||
                    (c == ']' && open != '[') ||
                    (c == '}' && open != '{')) {
                    return false;                      // wrong type matched
                }
            }
            // any other character is simply ignored
        }
        return stack.isEmpty();  // no leftover unclosed openers
    }
}
```

## 11. Complexity

**Time:** O(n) — every character is pushed at most once and popped at most once (a simpler version of the same "bounded total touches" argument used for the monotonic stack in Part 1).
**Space:** O(n) worst case — e.g. a string of nothing but opening brackets pushes everything with nothing ever popped.

## 12. Edge Cases

- Empty string → balanced, vacuously (stack starts and ends empty).
- Only openers, e.g. `"((("` → stack non-empty at the end → `false`.
- Only closers, e.g. `")))"` → first closer hits an empty stack → `false`.
- Single pair `"()"` → `true`.
- Mismatched types, e.g. `"(]"` → `false`.
- Other characters interleaved, e.g. `"a(b)c"` — decide whether to ignore them (usually yes, per problem statement).
- Odd length.

## 13. Common Mistakes

- **Comparing popped `Character` objects with `!=`.** `Deque<Character>` stores boxed `Character`s; `!=` between two boxed objects compares *references*, not values. It happens to "work" for ASCII brackets only because Java's `Character` cache covers that range — but that's fragile, not correct reasoning. Unbox to a primitive `char` (as done above: `char open = stack.pop();`) before comparing.
- Forgetting the empty-stack check before popping on a closer — crashes on inputs like `")"`.
- Forgetting the final `stack.isEmpty()` check — misses inputs like `"((("` that never had a mismatched closer, just leftover openers.
- Building a fresh matching-pairs map inside the loop instead of outside it — works, just wasteful.
- Checking counts only.
- Matching against the oldest opening bracket instead of the newest.

## 14. Pattern to Remember

```text
Problem clue:  "valid"/"balanced" + paired opening/closing tokens
Pattern:       Stack — Matching
Data structure: stack of characters (openers)
Stores:        opening brackets not yet closed
Push:          on every opener
Pop:           on every closer — must match the top, or it's invalid
Invariant:     stack (bottom->top) = still-open brackets, in open order
Key insight:   "innermost still open" IS "top of stack" — no bookkeeping needed
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"The closer must match whoever opened most recently — that's the stack's top, always."* Nested things close backwards.

## 15. Interview Trigger

> The instant I see "valid parentheses/brackets/tags," I think: I need to know what's still open, specifically the *most recent* still-open thing — that's a stack. Push openers. On a closer, it must match the top of the stack exactly, or it's invalid. At the end, nothing may be left unclosed.

## Related Problems

- [08-Min-Stack.md](08-Min-Stack.md) — another "stack as a tool for a differently-shaped problem" design.
- [03-Implement-Stack-Using-Queue.md](03-Implement-Stack-Using-Queue.md) — the stack primitive this solution leans on.

## See also

- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md)
- [05-Implement-Stack-Using-Linked-List.md](05-Implement-Stack-Using-Linked-List.md)
