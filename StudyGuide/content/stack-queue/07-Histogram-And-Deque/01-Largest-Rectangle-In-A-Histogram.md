# 24. Largest Rectangle in a Histogram

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/largest-rectangle-in-a-histogram) · [Article](https://takeuforward.org/data-structure/area-of-largest-rectangle-in-histogram/) · [Video](https://youtu.be/Bzat9vgD0fs?si=DiBlLejXcr6EJoyB) — **LeetCode:** [Problem](https://leetcode.com/problems/largest-rectangle-in-histogram/)

## 1. Problem Understanding

You are given an array `heights`, where `heights[i]` is the height of a bar of width 1 standing at position `i`. All bars sit on a common baseline. Pick any contiguous run of bars and form the largest axis-aligned rectangle whose base is that run and whose height is the minimum bar in the run. Return the maximum area.

The rectangle is always as tall as the **shortest bar** it spans. If you wanted to go taller, that shortest bar would block you; if you wanted to go wider, you would have to include an even shorter bar. So every candidate rectangle is completely described by its **limiting bar**: the one bar that attains the minimum height across the span.

Formally, for a bar at index `i` used as the limiting height:

```text
left  = index of nearest bar strictly smaller than heights[i], on the left
right = index of nearest bar strictly smaller than heights[i], on the right
width = right - left - 1
area  = heights[i] * width
```

The answer is the maximum of `area` over every `i`.

Example: `heights = [2,1,5,6,2,3]`. The best rectangle uses bars at indices 2 and 3 (`5` and `6`): the limiting bar is `5`, the span is width 2, and the area is `5 * 2 = 10`.

## 2. How to Think About the Problem

Start from the limiting-bar idea. For each bar, you need to know how far left and right you can extend before hitting something strictly shorter. Those two distances depend only on the array, not on each other, so the problem becomes:

> For every index, find the nearest smaller element to the left and the nearest smaller element to the right.

That is a **nearest-smaller** problem, which is the monotonic-stack pattern from the core chapter. The naive version scans outward from each bar. The fast version computes both boundaries in a single left-to-right pass by keeping bars whose right boundary has not been found yet.

The key mental shift: instead of asking "for bar `i`, where are my boundaries?", ask "when this new bar arrives, whose boundary has just been discovered?" A bar's right boundary is discovered exactly when the first strictly shorter bar appears to its right.

Two bars of equal height must not treat each other as the "smaller" boundary, otherwise the width computation collapses. Use `>` (strict) when popping so equal heights are allowed to extend the span.

## 3. Pattern Recognition

**Clue:** a 1-D histogram, "largest rectangle", "maximal area under a skyline".

**Pattern:** nearest smaller boundaries, implemented with an **increasing monotonic stack** of indices.

| Signal | This problem |
|---|---|
| Need area of a run of bars | Rectangle height = range minimum |
| Range minimum determined by a single limiting bar | Nearest smaller on both sides |
| Boundaries unknown until a shorter bar appears | Monotonic stack of unresolved indices |
| One pass, amortized O(n) | Each index pushed once and popped once |

## 4. Brute Force

For every bar, walk left while bars are at least as tall, and walk right while bars are at least as tall. The distance walked plus one is the width, and the area uses the current bar's height.

```java
class BruteForce {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length;
        int best = 0;

        for (int i = 0; i < n; i++) {
            int left = i;
            while (left - 1 >= 0 && heights[left - 1] >= heights[i]) {
                left--;
            }

            int right = i;
            while (right + 1 < n && heights[right + 1] >= heights[i]) {
                right++;
            }

            int width = right - left + 1;
            best = Math.max(best, heights[i] * width);
        }

        return best;
    }
}
```

This is `O(n^2)` time and `O(1)` extra space. It is correct but wastes work: the same segment is rescanned for every bar whose span covers it.

## 5. Observation

A bar's maximal rectangle ends exactly where a strictly smaller bar appears on each side. Every candidate rectangle in the whole problem corresponds to some bar as its minimum. Therefore it is enough to find, for each bar, the first strictly smaller bar on the left and the first strictly smaller bar on the right.

Crucially, we do not need to compute the two boundaries separately. When a new smaller bar arrives at index `i`, it is the right boundary for every taller bar currently waiting on the stack. When such a bar is popped, the bar now on top of the stack is precisely its nearest smaller bar to the left (because everything taller in between has already been popped). So one pass yields both boundaries at the moment a bar is finalized.

```text
For bar i, the width is fixed the instant both boundaries are known:
    right boundary = current index i       (we just found it)
    left  boundary = new stack top (or -1) (revealed by the pop)
```

## 6. Optimal Approach

Maintain a stack of indices whose heights are **strictly increasing** from bottom to top. These are bars still waiting for their first shorter bar on the right.

Scan `i` from `0` to `n`, where `i == n` is a sentinel with height `0` that forces the stack to flush.

At each `i`, let `current` be `heights[i]` (or `0` at the sentinel).

1. While the stack is non-empty and `heights[stack.peek()] > current`:
   - Pop `mid`.
   - Its height is `heights[mid]`.
   - Its left boundary is the new stack top, or `-1` if the stack is now empty.
   - Its right boundary is `i`.
   - Compute `width = i - left - 1` and update the best area.
2. If `i < n`, push `i`.

The strict `>` means a bar of equal height is left on the stack and extends the span of the later equal bar, which is required for correct widths.

## 7. Invariant

> **Invariant:** Stack indices have strictly increasing heights from bottom to top, and each stacked bar is still waiting for its first strictly smaller bar to the right. When a bar is popped at index `i`, its right boundary is `i` and its left boundary is the new stack top (or `-1`), so its width is final and can never improve later.

## 8. Dry Run

Input `heights = [2,1,5,6,2,3]`, `n = 6`. The loop runs `i = 0..6`, with `i = 6` being the sentinel `0`.

**Figure 1 —** the histogram.

```text
 h
 6 |          #
 5 |       #  #
 4 |       #  #
 3 |       #  #     #
 2 | #     #  #  #  #
 1 | #  #  #  #  #  #
   +-------------------
     0  1  2  3  4  5
```

The best rectangle is the `5 x 2` block over indices 2–3.

| i | current | action | stack (bottom→top) | area computed | best |
|---|---------|--------|--------------------|---------------|------|
| 0 | 2 | push 0 | [0] | — | 0 |
| 1 | 1 | pop 0: h=2, left=-1, w=1; push 1 | [1] | 2 | 2 |
| 2 | 5 | push 2 | [1,2] | — | 2 |
| 3 | 6 | push 3 | [1,2,3] | — | 2 |
| 4 | 2 | pop 3: h=6, left=2, w=1; pop 2: h=5, left=1, w=2; push 4 | [1,4] | 6, **10** | 10 |
| 5 | 3 | push 5 | [1,4,5] | — | 10 |
| 6 | 0 (sentinel) | pop 5: h=3, left=4, w=1; pop 4: h=2, left=1, w=4; pop 1: h=1, left=-1, w=6 | [] | 3, 8, 6 | 10 |

**Figure 2 —** stack evolution at the interesting moments.

```text
i=0   [0]            push 0
i=1   [] -> [1]      pop 0, area 2*1 = 2
i=2   [1,2]          push 2
i=3   [1,2,3]        push 3
i=4   [1] -> [1,4]   pop 3 (6*1=6), pop 2 (5*2=10)
i=5   [1,4,5]        push 5
i=6   []             sentinel pops 5 (3), 4 (8), 1 (6)
```

The maximum area found is **10**.

## 9. Why Does It Work?

When bar `mid` is popped because `heights[mid] > heights[i]`, the scanning order guarantees that `i` is the **first** index to the right of `mid` with a strictly smaller height. Every index between `mid` and `i` had height at least `heights[mid]` (otherwise `mid` would already have been popped). So `mid`'s rectangle can extend right up to `i - 1`.

After the pop, the new stack top is the nearest surviving index to the left of `mid`. Because we always pop taller-or-equal-in-violation bars, the top is the first index to the left with height strictly less than `heights[mid]`. So the left boundary is exactly the new top (or `-1`).

Both boundaries are final at the pop instant and will never change, which is why the area computed there is the true best rectangle for that limiting bar. Since every bar is considered as a limiting bar exactly once, and every possible rectangle has some limiting bar, the maximum over all pops is the global answer.

The sentinel `0` at the far right guarantees the stack empties so no waiting bar is left unprocessed.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length;
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;

        for (int i = 0; i <= n; i++) {
            int current = (i == n) ? 0 : heights[i];

            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int mid = stack.pop();
                int height = heights[mid];
                int left = stack.isEmpty() ? -1 : stack.peek();
                int width = i - left - 1;
                best = Math.max(best, height * width);
            }

            if (i < n) {
                stack.push(i);
            }
        }

        return best;
    }
}
```

## 11. Complexity

| Resource | Cost | Why |
|---|---|---|
| Time | O(n) | Each index is pushed once and popped at most once; total stack work is linear |
| Space | O(n) | The stack can hold every index in a strictly increasing array |

The inner `while` may run many times on a single `i` (for example, the sentinel flushes the whole stack), but summed over the entire scan the number of pops is at most `n`.

## 12. Edge Cases

- **Single bar** `[h]`: pushed at `i=0`, popped at the sentinel, area `h * 1`. Correct.
- **Strictly increasing** `[1,2,3,4]`: nothing is popped until the sentinel, then all four are popped; the best is `1 * 4`, which is correct (the shortest bar spans everything).
- **Strictly decreasing** `[4,3,2,1]`: each new bar pops the previous, so each bar's span is width 1; best is `4`.
- **Equal heights** `[2,2,2]`: the strict `>` leaves the earlier equal bar on the stack, so the popped middle/left bars get the full width `3`; answer `6`. If the pop condition used `>=`, the widths would be wrong.
- **Zero-height bars** `[0,2,0]`: zero bars act as boundaries; the best is `2`. The sentinel handles a trailing zero correctly.
- **All zeros**: answer `0`.
- **Empty input** `[]`: the loop never runs past the sentinel and returns `0`.

## 13. Common Mistakes

1. **Off-by-one width.** `width = right - left - 1`, not `right - left`. The boundaries are exclusive.
2. **Forgetting the sentinel.** Without the trailing `0`, bars still on the stack never get a right boundary and are never counted.
3. **Using `>=` in the pop condition.** Equal-height bars would cut each other's spans, producing too-small widths. Use strict `>`.
4. **Pushing `i == n`.** The sentinel index must never be pushed; pushing it then reading `heights[n]` throws or reads garbage.
5. **Storing heights instead of indices.** You need indices to compute widths, and you need to detect the left boundary as the stack top's index.
6. **Computing left/right boundaries in two separate passes** when one pass already has both at pop time — correct but needlessly complex.

## 14. Pattern to Remember

```text
**Problem clue:** largest rectangle; a bar's rectangle ends at a smaller bar on either side.
**Pattern:** nearest smaller boundaries.
**Data structure:** increasing monotonic stack of indices.
**What the stack stores:** bar indices still waiting for their right boundary.
**When to push:** every bar index (plus a sentinel height 0 at the end).
**When to pop:** when current height `<` top — the popped bar's width is now fully known.
**Invariant:** stacked bar heights are strictly increasing.
**Key insight:** on pop, left boundary = new top (or -1), right boundary = `i`; width = `i - left - 1`.
**Time:** O(n).
**Space:** O(n).
```

```text
Histogram
→ nearest smaller left/right
→ increasing stack
→ pop when smaller arrives
→ popped bar's width becomes final
```

## 15. Interview Trigger

> Histogram problems often hide a nearest-smaller question. Ask: "For this bar, where is the first shorter bar on each side?"

If the problem involves areas, containers, or spans whose height is the minimum of a range, reach for an increasing monotonic stack and compute each element's width at the moment it is popped.

## Related Problems

- [25. Maximal Rectangle](02-Maximal-Rectangle.md) — same solver reused per row.
- [26. Sliding Window Maximum](03-Sliding-Window-Maximum.md) — the deque counterpart of keeping only useful candidates.
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — the sibling boundary problem.
- [Next Smaller Element](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — the exact boundary used here.
- [Trapping Rain Water](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md) — boundaries on both sides.
- [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md) — same smaller-on-both-sides boundaries, counted instead of measured.

## See also

- [Sum of Subarray Ranges](../06-Boundary-And-Contribution/04-Sum-Of-Subarray-Ranges.md)
- [Remove K Digits](../06-Boundary-And-Contribution/05-Remove-K-Digits.md)
- [27. Stock Span](../08-Cache-And-Misc/01-Stock-Span.md)
