# 8. Implement Min Stack

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-min-stack) · [Article](https://takeuforward.org/data-structure/implement-min-stack-o2n-and-on-space-complexity/) · [Video](https://youtu.be/NdDIaH91P0g?si=4_Jbsq5trFvfSdUY) — **LeetCode:** [Problem](https://leetcode.com/problems/min-stack/)

## 1. Problem Understanding

Build a stack that supports `push`/`pop`/`top` **and** `getMin()`, all in true O(1) — not amortized, every single call, including `getMin()`.

- **Input:** sequence of push/pop/getMin calls.
- **Output:** results of pop/top/getMin.
- **Constraint:** O(1) `getMin()` rules out "just scan the stack for the minimum," which would be O(n).
- **What makes this different from earlier problems:** we need to track something *derived* from the stack's contents (the running minimum), and that derived value must update correctly as elements come and go — including, specifically, when the current minimum itself gets popped.

## 2. How to Think About the Problem

**What should I notice first?** "O(1) `getMin`" is the whole challenge. The tricky moment is: what's the new minimum *after* popping the element that currently holds the minimum?

A normal stack knows its top. It does not know its minimum. The question is:

> Can I store extra information at each level so that the minimum is always available?

**What would I try first?** A single `min` variable, updated on every push: `min = Math.min(min, x)`.

**Why does that break?** The moment that minimum value gets popped, there's no way to know what the "second smallest so far" was — that information was thrown away when we only kept a single number.

**What observation unlocks the fix?** Don't keep only *one* min value — keep the **full history** of "what was the minimum at each point in time," synchronized with the main stack, so popping the main stack can always "rewind" the minimum to exactly what it correctly was one step earlier.

Example, storing the running minimum at every depth:

```text
value:  5   2   4
min:    5   2   2
```

## 3. Pattern Recognition

**Problem clue:** "design a stack that also supports X in O(1)," where X is some running aggregate (min, max, etc.).
**Pattern:** Augmented Stack (an auxiliary stack tracks extra state).
**Why this pattern:** any value derived from "everything currently in the stack" needs to update/rewind in perfect lockstep with push/pop — a second stack, pushed and popped at exactly the same moments as the first, does this automatically.
**Mental model:** two stacks moving in lockstep — one holding the raw values, one holding "the answer to `getMin()` at this exact depth."
**Similar problems:** Max Stack (identical, mirrored). This "shadow stack" idea also shows up in variants of monotonic-stack problems that need to track more than one thing per entry.
**Recognizing this elsewhere:** any time you need an O(1) running aggregate that must correctly "undo" itself on pop, think: a second, parallel stack.

## 4. Brute Force

Two naive approaches:

1. Scan the entire stack on every `getMin()`. That is O(n) per query.
2. A single `min` variable with no history:

```java
// WRONG — cannot recover the old minimum once the current one is popped
class BrokenMinStack {
    Deque<Integer> stack = new ArrayDeque<>();
    int min = Integer.MAX_VALUE;
    void push(int x) { stack.push(x); min = Math.min(min, x); }
    int pop() { return stack.pop(); }   // min is never corrected here
    int getMin() { return min; }         // stale after the true min is popped
}
```

**Why is this wrong?** `push(5)`, `push(2)`, `push(8)` → `min` correctly tracks down to `2`. `pop()` removes `8` — fine, `min` is still validly `2`. But `pop()` *again* removes `2` — the actual minimum — and `min` is never updated on pop, so `getMin()` keeps wrongly returning `2` even though only `5` remains. Fixing this by rescanning the whole stack on every pop would work, but costs O(n) per pop, violating the O(1) requirement.

## 5. Observation

The only way to know "what was the minimum right before I pushed the element I'm about to pop" *without* rescanning is to have **recorded it at push time.** So record it — on *every* push, not just when a new minimum happens — by pushing the "minimum so far" onto a second, parallel stack. Popping the main stack then also pops the parallel stack, automatically rewinding the minimum to exactly what it was one push earlier.

When pushing `x`, the new minimum is `min(x, previousMin)`. Store it.

## 6. Optimal Approach

Two stacks: `mainStack` (actual values) and `minStack` (running minimum at each depth).

- `push(x)`: push `x` onto `mainStack`; push `min(x, minStack.isEmpty() ? x : minStack.peek())` onto `minStack`.
- `pop()`: pop **both** stacks together — always in lockstep, no exceptions.
- `getMin()`: `minStack.peek()` — O(1), no computation at read time; all the work already happened at push time.

At each depth, `minStack.top()` is the minimum of all values up to that depth.

## 7. Invariant

> **Invariant:** At every moment, for any depth `k`, `minStack`'s value at depth `k` equals the true minimum of `mainStack`'s bottom `k` elements. Both stacks always have exactly the same size, and always grow/shrink together. `minStack.peek()` is the minimum value currently present in the normal stack.

## 8. Dry Run

| op | mainStack | minStack | getMin() |
|---|---|---|---|
| `push(5)` | `[5]` | `[5]` | — |
| `push(3)` | `[5,3]` | `[5,3]` (3 < 5) | — |
| `push(7)` | `[5,3,7]` | `[5,3,3]` (min(7,3)=3, unchanged) | — |
| `push(2)` | `[5,3,7,2]` | `[5,3,3,2]` | **2** |
| `pop()` | `[5,3,7]` | `[5,3,3]` | **3** |
| `pop()` | `[5,3]` | `[5,3]` | **3** |

A smaller trace with a duplicate-later restore:

| op | values | mins |
|---|---|---|
| push(5) | [5] | [5] |
| push(2) | [5,2] | [5,2] |
| push(4) | [5,2,4] | [5,2,2] |
| pop | [5,2] | [5,2] |
| getMin | | 2 |

```text
mainStack        minStack
   [ 2 ]            [ 2 ]      <- getMin() = 2
   [ 7 ]            [ 3 ]
   [ 3 ]            [ 3 ]
   [ 5 ]            [ 5 ]
```

**Figure 1 —** The shadow stack records the running minimum at every depth, so popping rewinds it automatically.

## 9. Why Does It Work?

Because `minStack` records the minimum-so-far at **every** depth — not just at the moments it changes — popping it in perfect lockstep with `mainStack` always exposes exactly the correct minimum for whatever elements remain. Nothing is ever "forgotten," because nothing was thrown away; it was duplicated forward at every push instead.

## 10. Java Code

```java
class MinStack {
    private Deque<Integer> mainStack = new ArrayDeque<>();
    private Deque<Integer> minStack = new ArrayDeque<>();

    public void push(int x) {
        mainStack.push(x);
        // record the running minimum AT THIS DEPTH — every single push, not just on a new min
        if (minStack.isEmpty() || x <= minStack.peek()) {
            minStack.push(x);
        } else {
            minStack.push(minStack.peek());
        }
    }

    public void pop() {
        mainStack.pop();
        minStack.pop();   // ALWAYS pop both together — this is what "rewinds" the min
    }

    public int top()    { return mainStack.peek(); }
    public int getMin() { return minStack.peek(); } // O(1) — no scanning, ever
}
```

## 11. Complexity

**Time:** O(1) for every operation, including `getMin()` — that's the entire point of the problem.
**Space:** O(n), roughly double a plain stack, since `minStack` duplicates one integer per element regardless of whether the minimum actually changed at that step. *(A further space-optimized version only pushes to `minStack` when a genuinely new minimum is set, using counts to handle ties — worth knowing it exists, but the two-stack version above is the standard, safest interview answer.)*

## 12. Edge Cases

- `getMin()` on an empty stack — undefined; state your convention.
- Duplicate minimum values pushed multiple times (see Common Mistakes — this is where `<=` vs `<` matters).
- Popping down to empty and pushing again — both stacks must return to empty together.
- Single element.
- Negative values.

## 13. Common Mistakes

- **Using strict `<` instead of `<=`** when comparing `x` to `minStack.peek()`. If you push the *current* minimum value again (a duplicate) and use strict `<`, you won't duplicate it onto `minStack` — and a later pop of *one* of those duplicate copies will incorrectly pop the recorded minimum away too early, even though another copy of that same value is still logically sitting in the stack.
- **Popping only one of the two stacks** (or in the wrong order) — they must move in lockstep, always, or the invariant breaks permanently.
- Trying to save space by only pushing to `minStack` "when the min changes," without also correctly handling pop for that scheme — it *can* be done, but needs extra bookkeeping; don't attempt it under interview pressure unless specifically asked to optimize further.
- Storing only new minima, then mishandling duplicates.

## 14. Pattern to Remember

```text
Problem clue:  stack that also needs O(1) getMin/getMax
Pattern:       Augmented Stack (auxiliary "shadow" stack)
Data structure: mainStack (values) + minStack (running min at each depth)
Stores:        minStack stores the min-so-far, recorded at EVERY push
Push:          push x to main; push min(x, current min) to minStack
Pop:           pop BOTH, always together
Invariant:     minStack[k] = true min of mainStack's bottom k elements
Key insight:   record history at push time so pop needs no recomputation
Time / Space:  O(1) per op / O(n) (roughly double a plain stack)
```

**Memory trick:** *"A second stack, marching in lockstep, remembers the min at every depth — so popping can never forget it."* Need an O(1) query? Store enough metadata to answer it from the top.

## 15. Interview Trigger

> If asked for O(1) `getMin`/`getMax` alongside a normal stack, I immediately think: one stack isn't enough, because popping can "un-happen" the current best answer. I keep a second, parallel stack that records the running min at every depth — pushed in lockstep with every push (even when the min doesn't change), popped in lockstep with every pop — so `getMin()` is always just a peek, never a search.

## Related Problems

- [07-Balanced-Parentheses.md](07-Balanced-Parentheses.md) — another stack-as-tool problem.
- [../05-Monotonic-Stack-Core/01-Next-Greater-Element.md](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — the "track more than one thing per entry" idea reappears there.

## See also

- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md)
- [05-Implement-Stack-Using-Linked-List.md](05-Implement-Stack-Using-Linked-List.md)
