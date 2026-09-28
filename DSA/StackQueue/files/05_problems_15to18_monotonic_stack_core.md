# Stack & Queue Interview Guide — Part 3C: Problems 15–18 (Monotonic Stack Core)

**Guide map:** `00_START_HERE.md` → `01_foundation...md` → `02_universal_thinking_framework.md` → `03_problems_01to08...md` → `04_problems_09to14...md` → **`05_problems_15to18...md`** (you are here) → (more coming)

This is the family Part 1 called "the single idea that unlocks roughly half the problems in this guide." If you haven't read Part 1 §3 (Monotonic Stack) recently, it's worth a re-read before this file — everything here is that idea, applied.

---

# 15. Next Greater Element

### 1. Problem Understanding

For every element in an array, find the **first** element to its **right** that is strictly greater. If none exists, the answer is `-1`.

- **Input:** an array of integers.
- **Output:** an array of the same length — each slot holds the next-greater value, or `-1`.
- **Important observation:** "first" (nearest), not "maximum." We're not asking "what's the biggest thing to the right" — we're asking "what's the *closest* thing to the right that beats me."

Example: `[2, 1, 2, 4, 3, 1]` → `[4, 2, 4, -1, -1, -1]`.

### 2. How to Think About the Problem

**What should I notice first?** The phrase "next greater element" is, almost word-for-word, the trigger phrase from Part 1's clue table.

**What would I try first?** For each index, scan rightward until something bigger turns up.

**Why is that too slow?** Because it throws away everything it learns after each individual search finishes. Consider `[2, 1, 2, 4, 3, 1]`: when we're resolving index 0, we walk past index 1 and index 2 to reach index 3 (value 4). Later, when we're *also* resolving index 1 and index 2 independently, we walk past some of the *same ground again*, rediscovering that index 3's `4` is what resolves them too — each search rebuilding knowledge a previous search already had.

**What observation unlocks the better solution?** This connects directly to the Part 2 framework question *"can elements be eliminated permanently?"* — yes: the moment an element is beaten by something bigger, it can be discarded **forever**. No future index will ever need to compare against it again, because whatever beat it is now a strictly better (bigger, and just as close or closer) candidate for anyone still searching. So: keep a running set of "not yet beaten" elements, and resolve as many of them as possible the instant a bigger value shows up — one single left-to-right pass.

### 3. Pattern Recognition

**Problem clue:** "next greater element."
**Pattern:** Monotonic Stack (decreasing).
**Why this pattern:** elements wait to be beaten by something bigger to their right; the moment they are, that bigger thing *is* their answer.
**Mental model:** *"the stack contains elements whose answer has NOT been found yet"* — straight from Part 1.
**Similar problems:** Problem 16 (circular version); Problem 17 (mirror image — next *smaller*, flip the comparison); Problem 27, Stock Span (same core idea, but "previous" instead of "next," and reporting a *distance* instead of a *value*).

### 4. Brute Force

```java
int[] nextGreaterBrute(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    for (int i = 0; i < n; i++) {
        result[i] = -1;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] > arr[i]) { result[i] = arr[j]; break; }
        }
    }
    return result;
}
```

**Why is this too slow?** On a strictly decreasing array like `[5,4,3,2,1]`, every single index's inner scan runs all the way to the end and finds nothing — `4 + 3 + 2 + 1 = O(n²)` wasted comparisons for an answer that's `-1` everywhere. Even on inputs that resolve quickly, the *fundamental* waste is structural: each index's search independently rediscovers information (which nearby elements are "still in the running" to be someone's answer) that an earlier or later search already touched.

### 5. Observation

```text
Brute force (fresh scan per index)
     ↓
Repeated work: multiple indices independently rediscover that the SAME later
               element is what resolves them, each redoing its own walk to get there
     ↓
Observation: once an element is beaten by something bigger, discard it forever —
             no future index will ever need to compare against it again
     ↓
Data structure: decreasing monotonic stack (holds only "not yet beaten" candidates)
     ↓
Optimized solution: O(n), one pass, each element pushed once, popped at most once ever
```

### 6. Optimal Approach

Scan left to right, keeping a stack of indices whose answer isn't known yet. For each new `arr[i]`: while the stack isn't empty and the value at its top is smaller than `arr[i]`, pop that index — its answer is `arr[i]`. Then push `i`. Whatever's left in the stack when the loop ends never found anything bigger, and stays `-1`.

### 7. Invariant

> **Invariant:** The stack (bottom→top) always holds indices with strictly decreasing values, and every index currently in the stack has not yet found an element greater than itself, among everything processed so far.

### 8. Dry Run — `[2, 1, 2, 4, 3, 1]`

*(This is the full formal walkthrough of the example first previewed in Part 1.)*

| i | arr[i] | stack before (values) | operation | stack after (values) | newly resolved |
|---|---|---|---|---|---|
| 0 | 2 | `[]` | nothing to pop; push | `[2]` | — |
| 1 | 1 | `[2]` | `2` not `< 1`; push | `[2,1]` | — |
| 2 | 2 | `[2,1]` | `1<2` → pop, resolved; `2` not `<2` (strict) → stop; push | `[2,2]` | idx1 → 2 |
| 3 | 4 | `[2,2]` | `2<4` → pop, resolved; `2<4` → pop, resolved; push | `[4]` | idx2 → 4, idx0 → 4 |
| 4 | 3 | `[4]` | `4` not `<3`; push | `[4,3]` | — |
| 5 | 1 | `[4,3]` | `3` not `<1`; push | `[4,3,1]` | — |
| end | — | `[4,3,1]` | loop ends — leftovers get `-1` | — | idx3,4,5 → -1 |

Result: **`[4, 2, 4, -1, -1, -1]`**.

### 9. Why Does It Work?

When index `k` gets popped upon reaching index `i`, `arr[i]` is guaranteed to be the *nearest* greater element for `k` — not just *a* greater one. Here's why: every index between `k` and `i` has already been fully processed by the time we reach `i`, and by the invariant, `k` is still sitting in the stack, meaning *none* of those in-between indices ever beat it (if one had, `k` would already have been popped by it, before `i` was even reached). So `arr[i]` really is the first thing to `k`'s right that's bigger — nothing closer could possibly qualify. Indices that never get popped genuinely have no next-greater element: nothing in the rest of the array ever beat them, which the algorithm correctly reflects by leaving their initial `-1`.

### 10. Java Code

```java
int[] nextGreaterElement(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // indices; values strictly decreasing, bottom -> top

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {
            result[stack.pop()] = arr[i];
        }
        stack.push(i);
    }
    return result; // indices still in the stack never found a next greater -> stay -1
}
```

### 11. Complexity

**Time:** O(n). Every index is pushed exactly once (n pushes, total) and popped **at most once, ever, across the entire run** — not per iteration. Total work is O(n) + O(n) = O(n), the exact amortized argument from Part 1.
**Space:** O(n) worst case — a strictly decreasing array never resolves anything, so the stack grows to hold all `n` indices.

### 12. Edge Cases

- Empty array. Single element (always `-1`).
- Strictly increasing array — the stack rarely grows past size 1–2, since almost everything resolves almost immediately.
- Strictly decreasing array — worst-case space; nothing ever resolves, all answers are `-1`.
- Duplicate values (see Common Mistakes — must use strict `<`).
- The last element always gets `-1` — there's nothing to its right at all.

### 13. Common Mistakes

- **Using `<=` instead of `<` in the pop condition.** For `[2, 2]`, the correct answer is `[-1, -1]` — neither `2` is *strictly* greater than the other. Using `<=` would incorrectly pop index 0 when processing index 1 (since `2 <= 2`), giving `result[0] = 2` — wrong.
- **Storing values instead of indices.** Without the index, you don't know *which* original position to write the answer into — this breaks immediately with duplicate values, and is the wrong habit to build even when it happens to "work" on inputs with no duplicates.
- Forgetting to initialize `result` to `-1` before the loop — leftover stack entries need that default.
- Confusing "next" (look right, this problem) with "previous" (look left, Problem 27's Stock Span) — different scan directions, different information read from the stack.

### 14. Pattern to Remember

```text
Problem clue:  next greater element to the right
Pattern:       Monotonic Stack (decreasing)
Data structure: stack of indices
Stores:        indices whose next-greater answer isn't known yet
Push:          every index, after all necessary pops
Pop:           when arr[i] beats arr[stack.top()] — that index's answer is now arr[i]
Invariant:     stack holds indices with strictly decreasing values -> "not yet beaten"
Key insight:   once beaten, discard forever — no future index ever needs it again
Time / Space:  O(n) (each index pushed once, popped at most once, ever) / O(n) worst case
```

**Memory trick:** *"Push the newcomer — but first let it beat up everyone smaller still waiting in line."*

### 15. Interview Trigger

> The moment I see "next greater element," I think: I need, for each position, the first bigger value to its right. I keep unresolved elements in a decreasing stack of indices. Every new element pops (resolves) everything smaller currently waiting, then joins the stack to wait for its own resolution.

---

# 16. Next Greater Element II (Circular Array)

### 1. Problem Understanding

Same question as Problem 15, but the array is **circular** — after the last element, searching "to the right" wraps back around to the beginning, as if the array repeated itself.

Example: `[1, 2, 1]` → for index 0 (`1`): index 1 (`2`) is greater → answer `2`. For index 1 (`2`): looking right, then wrapping — `1`, then `1` again — nothing beats `2` → answer `-1`. For index 2 (`1`): wraps to index 0 (`1`, not greater), then index 1 (`2`, greater!) → answer `2`. Result: `[2, -1, 2]`.

### 2. How to Think About the Problem

**What's different from Problem 15?** The array wraps. **What clue matters?** "Circular" — think of the array as if it were written out **twice in a row**, and run ordinary Next Greater Element logic across that doubled view, but only *keep* answers for the first copy's positions (the "real" ones).

**What would I try first?** Literally concatenate `arr + arr` into a new array of size `2n` and run Problem 15's algorithm unchanged, keeping only the first `n` answers. This *works*, but allocates an unnecessary `O(n)` extra array.

**What observation removes that waste?** You don't need to materialize the doubled array at all — just let your loop counter run from `0` to `2n - 1`, and access the *real* underlying value via `arr[i % n]`. The modulo does the "wrapping" for you, for free, with zero extra memory.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`array wraps` → `simulate two laps using i % n, no extra array needed` → `Circular Monotonic Stack` → `same stack as Problem 15` → `run the identical algorithm for 2n steps instead of n, reading via arr[i % n]`.

### 3. Pattern Recognition

**Problem clue:** "circular array" + "next greater."
**Pattern:** Circular Monotonic Stack.
**Why this pattern:** identical monotonic-stack logic to Problem 15 — it just needs to see "one extra lap" of the array, because an element near the end might have its true next-greater sitting near the beginning.
**Mental model:** same "stack = unresolved elements" model; the loop just runs for `2n` steps using modulo to reuse the same underlying array.
**Similar problems:** Problem 15, directly — this is ~90% identical code. This same "double the loop, use `% n`" trick generalizes to making *any* "next X" monotonic-stack problem circular.

### 4. Brute Force

```java
int[] nextGreaterCircularBrute(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    for (int i = 0; i < n; i++) {
        result[i] = -1;
        for (int k = 1; k < n; k++) {          // check up to n-1 elements ahead, wrapping
            int j = (i + k) % n;
            if (arr[j] > arr[i]) { result[i] = arr[j]; break; }
        }
    }
    return result;
}
```

**Why is this too slow?** Exactly Problem 15's reasoning, except now the inner scan can wrap almost all the way around the array before giving up — still O(n²), for the same underlying reason: every index's search is thrown away and redone from scratch by the next index.

### 5. Observation

Same core insight as Problem 15 (once beaten, discard forever), **plus** the extra trick that makes circularity free: simulate "the array happening twice in a row" using `i % n`, so a single monotonic-stack pass naturally handles wraparound without doubling memory or writing fundamentally different logic.

### 6. Optimal Approach

Run the *same* algorithm as Problem 15, but let `i` range from `0` to `2n - 1`, always reading via `arr[i % n]`. **Only push during the first lap** (`i < n`) — the second lap exists purely to give still-unresolved first-lap elements one more chance to find something bigger wrapping around; it doesn't correspond to any *new* position needing its own answer, so nothing new needs to be pushed.

### 7. Invariant

> **Invariant:** Identical to Problem 15's, with one addition: only genuine (first-lap) indices are ever pushed, so the stack never grows past `n` entries even though the loop runs for `2n` iterations. Any index still in the stack after the full `2n` iterations genuinely has no next-greater element anywhere in the circular array.

### 8. Dry Run — `[1, 2, 1]` (n = 3)

| i | i % n | value | stack before | operation | stack after | resolved |
|---|---|---|---|---|---|---|
| 0 (lap 1) | 0 | 1 | `[]` | push (i<n) | `[0(1)]` | — |
| 1 (lap 1) | 1 | 2 | `[0(1)]` | `1<2`→pop, resolved; push | `[1(2)]` | idx0 → 2 |
| 2 (lap 1) | 2 | 1 | `[1(2)]` | `2` not `<1`; push (i<n) | `[1(2),2(1)]` | — |
| 3 (lap 2) | 0 | 1 | `[1(2),2(1)]` | `1` not `<1`; i≥n → don't push | `[1(2),2(1)]` | — |
| 4 (lap 2) | 1 | 2 | `[1(2),2(1)]` | `1<2`→pop, resolved; `2` not `<2`; i≥n → don't push | `[1(2)]` | idx2 → 2 |
| 5 (lap 2) | 2 | 1 | `[1(2)]` | `2` not `<1`; i≥n → don't push | `[1(2)]` | — |
| end | — | — | `[1(2)]` | leftover → -1 | — | idx1 → -1 |

Result: **`[2, -1, 2]`** ✓.

### 9. Why Does It Work?

The second lap doesn't need to push anything new because every *position* in the array already got its one authoritative push during the first lap — the second lap's only job is to let elements still stuck in the stack (i.e., still unresolved after seeing the whole array once) check against the *beginning* of the array too, exactly simulating "what if the array kept going instead of stopping." Since we never push the same position twice, the stack's total size is bounded by `n`, and the correctness argument from Problem 15 (nearest-beater reasoning) carries over unchanged — the only difference is that "to the right" now includes wrapped-around territory.

### 10. Java Code

```java
int[] nextGreaterElementsCircular(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < 2 * n; i++) {
        int idx = i % n;
        while (!stack.isEmpty() && arr[stack.peek()] < arr[idx]) {
            result[stack.pop()] = arr[idx];
        }
        if (i < n) stack.push(idx); // only push each real position once, during lap 1
    }
    return result;
}
```

### 11. Complexity

**Time:** O(n) — the loop runs `2n` times (still O(n)), and the push/pop bound is unchanged from Problem 15 (each of the `n` real indices is still pushed at most once and popped at most once, ever).
**Space:** O(n).

### 12. Edge Cases

- All elements equal (every answer is `-1` — nothing is *strictly* greater anywhere, even wrapping).
- Single element (`-1`, trivially — nothing to its right, wrapped or not).
- Strictly decreasing then the max at the very end wrapping to resolve everything (like `[5,4,3,2,1]` → `[-1,5,5,5,5]` — the maximum, sitting at the *end*, becomes everyone's answer once the second lap reaches it).
- Array where the maximum sits at the very end — worth tracing by hand, since it's the case that most directly exercises the wraparound.

### 13. Common Mistakes

- **Pushing on every iteration of both laps** (instead of only during `i < n`) — this doesn't necessarily break correctness by itself (duplicate pushes of an already-resolved index just get ignored since that index is no longer "the" authoritative one in some implementations), but it's wasted work and, depending on exactly how it's implemented, an easy way to introduce a subtle bug (e.g. double-writing a result). Simplest and safest: push only once per real index, during lap 1.
- **Looping only `n` times instead of `2n`** — this is just Problem 15 with extra steps; it never actually looks at the wrapped-around portion, silently producing the *non-circular* answer instead.
- Forgetting that `arr[stack.peek()]` must be read via the **stored index**, not `arr[idx]` a second time by mistake — the stored index refers to the *original* first-lap position, which is what needs its answer written.

### 14. Pattern to Remember

```text
Problem clue:  circular array + next greater
Pattern:       Circular Monotonic Stack
Data structure: same stack as Problem 15 (indices)
Loop range:    0 to 2n-1, always read via arr[i % n]
Push:          only real (first-lap, i<n) indices, once each
Pop:           identical condition/meaning to Problem 15
Invariant:     same as Problem 15 + "only real indices ever enter the stack"
Key insight:   simulate a second lap with i % n — no extra array needed
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"Walk the array twice with `% n` — but only introduce each real element to the stack once."*

### 15. Interview Trigger

> The instant I see "circular" attached to a next-greater/next-smaller question, I think: Problem 15's algorithm, unchanged, just run for `2n` iterations instead of `n`, reading through `arr[i % n]` — and I only push a given real index once, during the first lap, since the second lap exists purely to give leftovers a chance to wrap around, not to introduce new positions.

---

# 17. Next Smaller Element

### 1. Problem Understanding

For every element, find the first element to its **right** that is strictly **smaller**. `-1` if none exists.

Example: `[4, 5, 2, 10, 8]` → `[2, 2, -1, 8, -1]`.

### 2. How to Think About the Problem

This is Problem 15 with every "greater" swapped for "smaller." **Nothing else changes conceptually** — it's worth deriving once explicitly so the mirror-image relationship is concrete rather than just asserted.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`next SMALLER element to the right` → `elements now wait to be beaten by something SMALLER` → `Monotonic Stack (increasing)` → `stack of indices, values increasing bottom→top` → `pop while the top is bigger than the current element`.

**Why does the stack direction flip?** In Problem 15, the stack held elements "not yet beaten by something bigger" — which meant everything in the stack, read bottom to top, had to be in *decreasing* order (otherwise a smaller one sitting above a bigger one would already have been beaten by the bigger one below it, contradiction). Here, the stack holds elements "not yet beaten by something smaller" — so by the identical logic, mirrored, it must be *increasing* bottom to top.

### 3. Pattern Recognition

**Problem clue:** "next smaller element."
**Pattern:** Monotonic Stack (increasing) — the direct mirror of Problem 15.
**Mental model:** same as Problem 15, "answer not found yet," with every comparison flipped.
**Similar problems:** Problem 15 (mirror); this exact "increasing stack" also appears inside Problem 24 (Largest Rectangle in Histogram) and Problem 20 (Sum of Subarray Minimums) — both lean on "next smaller" / "previous smaller" as a sub-step.

### 4. Brute Force

```java
int[] nextSmallerBrute(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    for (int i = 0; i < n; i++) {
        result[i] = -1;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[i]) { result[i] = arr[j]; break; }
        }
    }
    return result;
}
```

**Why is this too slow?** Identical reasoning to Problem 15, mirrored: a strictly increasing array forces every inner scan to run to completion and find nothing, giving O(n²).

### 5. Observation

Same as Problem 15's observation, mirrored: once an element is beaten by something *smaller*, it can never be anyone's "next smaller" again, since whatever beat it is now a strictly better (smaller, and just as close or closer) candidate.

### 6. Optimal Approach

Scan left to right with an increasing stack of indices. For each `arr[i]`: while the stack isn't empty and the top's value is *bigger* than `arr[i]`, pop — that index's answer is `arr[i]`. Then push `i`.

### 7. Invariant

> **Invariant:** The stack (bottom→top) always holds indices with strictly increasing values, and every index in it has not yet found an element smaller than itself, among everything processed so far.

### 8. Dry Run — `[4, 5, 2, 10, 8]`

| i | arr[i] | stack before (values) | operation | stack after (values) | resolved |
|---|---|---|---|---|---|
| 0 | 4 | `[]` | push | `[4]` | — |
| 1 | 5 | `[4]` | `4` not `>5`; push | `[4,5]` | — |
| 2 | 2 | `[4,5]` | `5>2`→pop, resolved; `4>2`→pop, resolved; push | `[2]` | idx1→2, idx0→2 |
| 3 | 10 | `[2]` | `2` not `>10`; push | `[2,10]` | — |
| 4 | 8 | `[2,10]` | `10>8`→pop, resolved; `2` not `>8`; push | `[2,8]` | idx3→8 |
| end | — | `[2,8]` | leftovers → -1 | — | idx2,4 → -1 |

Result: **`[2, 2, -1, 8, -1]`** ✓.

### 9. Why Does It Work?

Exactly Problem 15's correctness argument, mirrored: when index `k` gets popped by index `i`, every index strictly between them has already been fully processed and, by the invariant, none of them beat `k` (or it would already have been popped by then) — so `arr[i]` is provably the *nearest* smaller element, not just *a* smaller one.

### 10. Java Code

```java
int[] nextSmallerElement(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // indices; values strictly increasing, bottom -> top

    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && arr[stack.peek()] > arr[i]) {
            result[stack.pop()] = arr[i];
        }
        stack.push(i);
    }
    return result;
}
```

### 11. Complexity

**Time:** O(n), identical amortized argument to Problem 15. **Space:** O(n) worst case (strictly increasing input).

### 12. Edge Cases

Mirror of Problem 15's: strictly decreasing input resolves almost immediately; strictly increasing input is the worst case (nothing resolves, `O(n)` space); duplicates need strict `>` for the same reason Problem 15 needed strict `<`.

### 13. Common Mistakes

- **Using `>=` instead of `>`** — same duplicate-handling trap as Problem 15, mirrored.
- **Copy-pasting Problem 15's code and only flipping the comparison operator, but forgetting the stack's *storage order* concept also flips** (decreasing → increasing) — the code change is genuinely just the one operator, but make sure you can *say why* out loud, not just pattern-match the edit.
- Mixing up "next smaller" with "previous smaller" (different scan direction — see the general Previous-vs-Next distinction from Part 1).

### 14. Pattern to Remember

```text
Problem clue:  next smaller element to the right
Pattern:       Monotonic Stack (increasing) — mirror of Problem 15
Data structure: stack of indices
Stores:        indices whose next-smaller answer isn't known yet
Pop:           when arr[i] is SMALLER than arr[stack.top()]
Invariant:     stack holds indices with strictly increasing values
Key insight:   identical to Problem 15, every comparison flipped
Time / Space:  O(n) / O(n) worst case
```

**Memory trick:** *"Problem 15's evil twin — same stack, flip every `<` to `>`."*

### 15. Interview Trigger

> "Next smaller element" is Problem 15 with the comparison flipped: I keep an *increasing* stack of indices, popping whenever the current element is smaller than what's waiting — because once beaten by something smaller, an element can never be anyone's answer again.

---

# 18. Number of Greater Elements to the Right

### 1. Problem Understanding

For every element, count **how many** elements to its right are strictly greater than it — not just find the *nearest* one, count **all** of them.

- **Input:** array of integers.
- **Output:** array of the same length, each slot holding a count.

Example: `[5, 2, 6, 1]` → `[1, 1, 0, 0]` (5 has just `6` beating it; 2 has just `6`; 6 has nothing; 1 has nothing).

**This problem is deliberately placed here, next to the "next greater" family, to make an important point: it looks like it belongs to the same family, but it doesn't quite.**

### 2. How to Think About the Problem

**What should I notice first?** This is *not* asking "what's the nearest bigger element" — it's asking for a **count of every** bigger element to the right. That's a meaningfully different question.

**Would a monotonic stack solve this directly?** Try it: a monotonic stack, as used in Problems 15–17, resolves each element **once**, the instant it's beaten, and then discards it. That's exactly right when you only need the *first* beater — but here we need to know about **every** beater, and a stack-based element is popped (and forgotten) the moment the *first* one arrives. The information "how many more things after this one are *also* bigger" isn't something the monotonic stack invariant tracks at all.

**So what does work?** This becomes a **counting** problem: "as I scan, how many values already seen are greater than the current one?" That's the classic shape of "count of smaller/greater elements after each element" — solved with a **Fenwick tree (Binary Indexed Tree, BIT)** over coordinate-compressed values, processing the array **right to left** and asking, for each element, "how many values inserted so far (i.e., to my right) are greater than me?" *before* inserting the current value.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`count of ALL greater elements, not just nearest` → `a monotonic stack only ever remembers the nearest unresolved candidate — it can't count` → `Counting problem, not a "next X" problem` → `Fenwick Tree (BIT) with coordinate compression` → `scan right to left; for each value, query "how many already-inserted values are strictly greater," then insert`.

### 3. Pattern Recognition

**Problem clue:** "number/count of greater (or smaller) elements to the right/left," for every element.
**Pattern:** **Not** a monotonic-stack pattern — a Fenwick Tree (BIT) counting pattern. Included in this guide specifically to mark the *boundary* of where monotonic stack stops applying.
**Why a stack fails here:** a stack answers "what/where is the nearest one," by permanently discarding elements once they're beaten. Counting needs to know about *every* beater, not just the first — information a stack throws away by design.
**Mental model:** process right to left; a Fenwick tree lets you ask "how many numbers smaller-or-equal to X have I seen so far" in O(log n), so "how many are greater" is just `(total seen) − (that answer)`.
**Similar problems:** LeetCode's "Count of Smaller Numbers After Self" is the mirror (flip the comparison, same technique). Not closely related to Problems 15–17 despite the surface-level similar wording — that's exactly the trap this problem is here to teach you to notice.
**Recognizing this elsewhere:** if a problem says "count of \_\_\_ elements" (plural, an aggregate) rather than "the next/previous \_\_\_ element" (singular, a nearest match), that's your signal this is a counting/BIT problem, not a monotonic-stack one.

### 4. Brute Force

```java
int[] countGreaterToRightBrute(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    for (int i = 0; i < n; i++) {
        int count = 0;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] > arr[i]) count++;
        }
        result[i] = count;
    }
    return result;
}
```

**Why is this too slow?** For every one of the `n` elements, we scan all remaining elements to its right — classic O(n²), and unlike Problems 15–17, there's no "discard forever" shortcut available here, because we're not looking for a nearest match to stop at — we deliberately need to examine *every* remaining element to get an accurate count. The repeated work isn't "redundant scanning we could skip" so much as "the same underlying question — how does this value compare against a large, slowly-shrinking pool — asked freshly, one comparison at a time, for every single pair."

### 5. Observation

The real question buried in "how many elements already seen are greater than X" is a **counting-by-value-range** question, and that's exactly what a Fenwick tree is built for: it lets you maintain a frequency table over values (compressed to ranks, since raw values might be large or sparse) and answer "how many inserted values are ≤ some threshold" in O(log n), instead of O(n) per query.

```text
Brute force (recount from scratch for every element)
     ↓
Repeated work: re-scanning largely-overlapping suffixes of the array, over and over
     ↓
Observation: this is a running "how many seen so far are greater than X" question —
             exactly what a frequency-counting structure answers fast
     ↓
Data structure: Fenwick Tree (BIT) over coordinate-compressed values
     ↓
Optimized solution: O(n log n), one right-to-left pass
```

### 6. Optimal Approach

1. **Coordinate-compress** the array's values: sort the distinct values, and assign each one a rank (`1` = smallest, `2` = next, …).
2. Build a Fenwick tree sized to the number of distinct values, supporting: `update(rank, +1)` (record one more occurrence of this value) and `query(rank)` (count of all inserted values with rank ≤ this one, i.e., **≤** the given value).
3. Scan the array **right to left**, keeping a running `totalInserted` count. For each `arr[i]`: `countGreater = totalInserted − query(rank(arr[i]))` (everything inserted so far, minus everything that was ≤ `arr[i]`, leaves exactly what's *strictly* greater); this is `result[i]`. Then insert `arr[i]` into the tree and increment `totalInserted`.

### 7. Invariant

> **Invariant:** At the moment `arr[i]` is processed, the Fenwick tree contains exactly the frequency counts of every element with index `> i` (i.e., everything to `arr[i]`'s right that's already been processed, since we're moving right to left) — no more, no less.

### 8. Dry Run — `[5, 2, 6, 1]`

Distinct sorted values: `1, 2, 5, 6` → ranks `1→1, 2→2, 5→3, 6→4`.

| i (right→left) | value | rank | query(rank) (≤ this value, so far) | totalInserted so far | result[i] = total − query | after: insert |
|---|---|---|---|---|---|---|
| 3 | 1 | 1 | 0 | 0 | **0** | rank 1 (+1) |
| 2 | 6 | 4 | 1 *(the `1` already inserted)* | 1 | **0** | rank 4 (+1) |
| 1 | 2 | 2 | 1 *(the `1`, rank 1 ≤ 2)* | 2 | **1** | rank 2 (+1) |
| 0 | 5 | 3 | 2 *(the `1` and `2`, both ≤ 5)* | 3 | **1** | rank 3 (+1) |

Result: **`[1, 1, 0, 0]`** ✓.

### 9. Why Does It Work?

Because we insert elements right to left, at the moment we query for `arr[i]`, the tree contains *exactly* — no more, no less — the elements to `arr[i]`'s right (the invariant above). `query(rank(arr[i]))` counts everything inserted so far with value ≤ `arr[i]` — which, subtracted from the total inserted, leaves precisely the count of elements strictly greater. Coordinate compression doesn't lose any comparison information — it only needs to preserve *relative order*, which sorting-then-ranking does exactly, so all comparisons (`≤`, `>`) come out identical to using the raw values.

### 10. Java Code

```java
class BIT { // Fenwick Tree — 1-indexed
    int[] tree;
    int n;
    BIT(int n) { this.n = n; tree = new int[n + 1]; }
    void update(int i, int delta) { for (; i <= n; i += i & (-i)) tree[i] += delta; }
    int query(int i) { int sum = 0; for (; i > 0; i -= i & (-i)) sum += tree[i]; return sum; } // prefix sum [1..i]
}

int[] countGreaterToRight(int[] arr) {
    int n = arr.length;
    int[] sorted = arr.clone();
    Arrays.sort(sorted);
    int m = 0;
    int[] distinct = new int[n];
    for (int i = 0; i < n; i++) {
        if (i == 0 || sorted[i] != sorted[i - 1]) distinct[m++] = sorted[i];
    }
    Map<Integer, Integer> rank = new HashMap<>();
    for (int i = 0; i < m; i++) rank.put(distinct[i], i + 1); // 1-indexed rank

    BIT bit = new BIT(m);
    int[] result = new int[n];
    int totalInserted = 0;
    for (int i = n - 1; i >= 0; i--) {
        int r = rank.get(arr[i]);
        int countLessOrEqual = bit.query(r);
        result[i] = totalInserted - countLessOrEqual;
        bit.update(r, 1);
        totalInserted++;
    }
    return result;
}
```

### 11. Complexity

**Time:** O(n log n) — sorting for coordinate compression is O(n log n); the right-to-left scan does one `query` and one `update` per element, each O(log n), for O(n log n) total.
**Space:** O(n) for the Fenwick tree, rank map, and result array.

### 12. Edge Cases

- All elements equal — every count is `0` (nothing is *strictly* greater than an equal value).
- Strictly increasing input — `result[i]` counts down `n-1, n-2, ..., 1, 0`.
- Strictly decreasing input — every count is `0`.
- Single element — `[0]`.
- Large value ranges with few distinct values — coordinate compression handles this gracefully (the tree is sized to *distinct* values, not the raw value range).

### 13. Common Mistakes

- **Reaching for a monotonic stack out of habit**, because the problem sits next to "next greater" family problems and shares vocabulary — the stack silently gives you *whether* something is beaten and by what, never *how many times*. If you find yourself trying to make a stack "remember a count," that's the signal you're forcing the wrong tool onto this problem.
- **Using `query(rank − 1)` instead of `query(rank)`** when trying to count strictly-greater elements directly (rather than the total-minus-≤ approach shown here) — off-by-one errors here are common; the total-minus-≤-count framing above sidesteps this by always computing a clean "≤" prefix sum and subtracting.
- Forgetting coordinate compression entirely and sizing the Fenwick tree to the raw value range — wastes memory, and breaks entirely if values can be negative or very large (BIT indices must be positive).
- Off-by-one in the BIT's own `update`/`query` loops (`i & (-i)` bit-manipulation) — copy the template exactly rather than trying to rederive it under pressure.

### 14. Pattern to Remember

```text
Problem clue:  COUNT of greater/smaller elements to the right/left (plural, aggregate)
Pattern:       Fenwick Tree (BIT) + coordinate compression — NOT monotonic stack
Data structure: BIT sized to the number of distinct values
Stores:        running frequency counts of values seen so far
Scan direction: right to left (so "seen so far" = "to my right")
Per element:   result = totalInserted - query(rank(value)); then insert
Invariant:     at each step, the BIT holds exactly the frequencies of elements to the right
Key insight:   monotonic stack answers "nearest match"; this needs "count of ALL matches" —
               different questions, different tools
Time / Space:  O(n log n) / O(n)
```

**Memory trick:** *"Next X is a stack question. Count of X is a Fenwick-tree question. Don't let similar wording fool you."*

### 15. Interview Trigger

> If a problem asks for a **count** of greater/smaller elements (not the nearest one), I immediately flag that a monotonic stack is the wrong tool — it discards elements after their first match, which throws away exactly the information counting needs. I reach for a Fenwick tree over coordinate-compressed values instead, scanning in the direction that makes "already inserted" mean "already seen on the relevant side."

---

## Pattern Connections Recap (Problems 15–18)

- **Problems 15 and 17** are exact mirror images — same algorithm, every comparison flipped, same correctness argument. If you can derive one from scratch, you can derive the other by symmetry alone.
- **Problem 16** is Problem 15 with one added trick (simulate a second lap via `i % n`) bolted on — not a new pattern, an extension of the same one.
- **Problem 18** is deliberately the odd one out: it *looks* like it belongs to this family (same vocabulary — "greater," "to the right") but needs a genuinely different tool, because it asks a genuinely different question (count vs. nearest). Recognizing *this* distinction — not just recognizing monotonic stack — is exactly the kind of judgment the Part 2 framework's question 5 ("Am I looking for previous/next greater/smaller?") is meant to sharpen: the word "next" or "previous" in the problem statement is what earns the stack; the word "count" or "number of" should make you pause.

---

**Next:** [`06_problems_19to23_boundary_and_contribution.md`](06_problems_19to23_boundary_and_contribution.md) — Trapping Rain Water, Sum of Subarray Minimums/Ranges, Asteroid Collision, and Remove K Digits: monotonic stack applied to boundaries, contributions, simulation, and greedy construction.
