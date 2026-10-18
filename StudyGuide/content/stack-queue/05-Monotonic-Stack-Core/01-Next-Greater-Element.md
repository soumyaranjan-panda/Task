# 15. Next Greater Element

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/next-greater-element) · [Article](https://takeuforward.org/data-structure/next-greater-element-using-stack/) · [Video](https://youtu.be/e7XQLtOQM3I?si=QdcHpTtx6gAHsext) — **LeetCode:** [Problem](https://leetcode.com/problems/next-greater-element-i/)

## 1. Problem Understanding

For every element in an array, find the **first** element to its **right** that is strictly greater. If none exists, the answer is `-1`.

- **Input:** an array of integers.
- **Output:** an array of the same length — each slot holds the next-greater value, or `-1`.
- **Important observation:** "first" (nearest), not "maximum." We are not asking "what is the biggest thing to the right" — we are asking "what is the *closest* thing to the right that beats me."

Example: `[2, 1, 2, 4, 3, 1]` → `[4, 2, 4, -1, -1, -1]`.

## 2. How to Think About the Problem

**What should I notice first?** The phrase "next greater element" is, almost word-for-word, the trigger phrase from the monotonic-stack clue table.

**What would I try first?** For each index, scan rightward until something bigger turns up.

**Why is that too slow?** Because it throws away everything it learns after each individual search finishes. Consider `[2, 1, 2, 4, 3, 1]`: when we are resolving index 0, we walk past index 1 and index 2 to reach index 3 (value 4). Later, when we are *also* resolving index 1 and index 2 independently, we walk past some of the *same ground again*, rediscovering that index 3's `4` is what resolves them too — each search rebuilding knowledge a previous search already had.

**What observation unlocks the better solution?** Can elements be eliminated permanently? Yes: the moment an element is beaten by something bigger, it can be discarded **forever**. No future index will ever need to compare against it again, because whatever beat it is now a strictly better (bigger, and just as close or closer) candidate for anyone still searching. So: keep a running set of "not yet beaten" elements, and resolve as many of them as possible the instant a bigger value shows up — one single left-to-right pass.

## 3. Pattern Recognition

**Problem clue:** "next greater element."
**Pattern:** Monotonic Stack (decreasing).
**Why this pattern:** elements wait to be beaten by something bigger to their right; the moment they are, that bigger thing *is* their answer.
**Mental model:** *"the stack contains elements whose answer has NOT been found yet."*
**Similar problems:** Problem 16 (circular version); Problem 17 (mirror image — next *smaller*, flip the comparison); Problem 27, Stock Span (same core idea, but "previous" instead of "next," and reporting a *distance* instead of a *value*).

## 4. Brute Force

For every `i`, scan `j = i+1 ... n-1` until a greater value is found.

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

**Why is this too slow?** On a strictly decreasing array like `[5,4,3,2,1]`, every single index's inner scan runs all the way to the end and finds nothing — `4 + 3 + 2 + 1 = O(n²)` wasted comparisons for an answer that is `-1` everywhere. Even on inputs that resolve quickly, the *fundamental* waste is structural: each index's search independently rediscovers information (which nearby elements are "still in the running" to be someone's answer) that an earlier or later search already touched.

## 5. Observation

```text
Brute force (fresh scan per index)
     ↓
Repeated work: several indices independently rediscover that the
               SAME later element resolves them, each redoing its walk
     ↓
Observation: once beaten by something bigger, an element can be
             discarded forever — no future index needs it again
     ↓
Data structure: decreasing monotonic stack (only "not yet beaten")
     ↓
Optimized: O(n), one pass, each element pushed once, popped once
```

**Figure 1 —** From repeated suffix scans to a single decreasing stack.

## 6. Optimal Approach

Scan left to right, keeping a stack of indices whose answer is not known yet. For each new `arr[i]`: while the stack is not empty and the value at its top is smaller than `arr[i]`, pop that index — its answer is `arr[i]`. Then push `i`. Whatever is left in the stack when the loop ends never found anything bigger, and stays `-1`.

## 7. Invariant

> **Invariant:** The stack (bottom→top) always holds indices with strictly decreasing values, and every index currently in the stack has not yet found an element greater than itself, among everything processed so far.

## 8. Dry Run

Input: `[2, 1, 2, 4, 3, 1]`.

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

## 9. Why Does It Work?

When index `k` gets popped upon reaching index `i`, `arr[i]` is guaranteed to be the *nearest* greater element for `k` — not just *a* greater one. Here is why: every index between `k` and `i` has already been fully processed by the time we reach `i`, and by the invariant, `k` is still sitting in the stack, meaning *none* of those in-between indices ever beat it (if one had, `k` would already have been popped by it, before `i` was even reached). So `arr[i]` really is the first thing to `k`'s right that is bigger — nothing closer could possibly qualify. Indices that never get popped genuinely have no next-greater element: nothing in the rest of the array ever beat them, which the algorithm correctly reflects by leaving their initial `-1`.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

class Solution {
    public int[] nextGreaterElement(int[] arr) {
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
}
```

## 11. Complexity

**Time:** O(n). Every index is pushed exactly once (n pushes, total) and popped **at most once, ever, across the entire run** — not per iteration. Total work is O(n) + O(n) = O(n).
**Space:** O(n) worst case — a strictly decreasing array never resolves anything, so the stack grows to hold all `n` indices.

## 12. Edge Cases

- Empty array. Single element (always `-1`).
- Strictly increasing array — the stack rarely grows past size 1–2, since almost everything resolves almost immediately.
- Strictly decreasing array — worst-case space; nothing ever resolves, all answers are `-1`.
- Duplicate values (must use strict `<`).
- The last element always gets `-1` — there is nothing to its right at all.

## 13. Common Mistakes

- **Using `<=` instead of `<` in the pop condition.** For `[2, 2]`, the correct answer is `[-1, -1]` — neither `2` is *strictly* greater than the other. Using `<=` would incorrectly pop index 0 when processing index 1 (since `2 <= 2`), giving `result[0] = 2` — wrong.
- **Storing values instead of indices.** Without the index, you do not know *which* original position to write the answer into — this breaks immediately with duplicate values, and is the wrong habit to build even when it happens to "work" on inputs with no duplicates.
- Forgetting to initialize `result` to `-1` before the loop — leftover stack entries need that default.
- Confusing "next" (look right, this problem) with "previous" (look left, Stock Span) — different scan directions, different information read from the stack.

## 14. Pattern to Remember

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

## 15. Interview Trigger

> The moment I see "next greater element," I think: I need, for each position, the first bigger value to its right. I keep unresolved elements in a decreasing stack of indices. Every new element pops (resolves) everything smaller currently waiting, then joins the stack to wait for its own resolution.

## Related Problems

- [02-Next-Greater-Element-II-Circular.md](02-Next-Greater-Element-II-Circular.md) — same algorithm, one extra lap to handle wrap-around.
- [03-Next-Smaller-Element.md](03-Next-Smaller-Element.md) — exact mirror, every comparison flipped.
- [04-Number-Of-Greater-Elements-To-The-Right.md](04-Number-Of-Greater-Elements-To-The-Right.md) — the same vocabulary but a *count*, not a nearest match; a different tool.

## See also

- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — builds on the "previous smaller / next smaller" boundaries this pattern reveals.
- [01-Trapping-Rain-Water.md](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md) — decreasing stack used for valley boundaries.
