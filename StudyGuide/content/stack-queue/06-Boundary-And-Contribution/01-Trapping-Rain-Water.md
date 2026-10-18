# 19. Trapping Rain Water

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/trapping-rainwater) · [Article](https://takeuforward.org/data-structure/trapping-rainwater/) · [Video](https://youtu.be/1_5VuquLbXg?si=NFG6df318_6OtGvg) — **LeetCode:** [Problem](https://leetcode.com/problems/trapping-rain-water/)

## 1. Problem Understanding

Given an array of non-negative bar heights, determine how much water is trapped between the bars after it rains.

- **Input:** `height[]`, where `height[i]` is the height of a vertical bar at position `i`.
- **Output:** total units of water trapped.
- **Key fact:** water sits above a bar only if there is a taller bar somewhere to its **left** and a taller bar somewhere to its **right**. The amount above position `i` is `min(tallestLeft, tallestRight) - height[i]`, and it is never negative.

```text
index:    0   1   2   3   4   5
height:   4   2   0   3   2   5

          |
      |   |         |
      |   |   |     |
      | | | | | |   |
      | | | | | | | |
     _|_|_|_|_|_|_|_|_
      4 2 0 3 2 5

water per column: 0 2 4 1 2 0   ->  total 9
```

**Figure 1 —** A valley (indices 1–4) holds water; the outer maxima bound it.

## 2. How to Think About the Problem

**What should I notice first?** Each column's trapped water depends on the highest wall on each side, not on its immediate neighbors. A middle bar is "unresolved" until a tall enough right wall arrives to close the basin above it.

**What would I try first?** For each index, scan left to find the maximum and scan right to find the maximum. That is O(n²).

**Why is that too slow?** Every index re-scans the same suffix and prefix. `maxLeft` and `maxRight` for adjacent indices differ by at most one element, yet the brute force recomputes each from scratch — the same "rediscover the same information over and over" waste seen in the monotonic-stack family.

**What observation unlocks the better solution?** When scanning left to right, a bar can stay "unresolved" until we meet a bar taller than it. At that moment, the basin *just closed on its right side* — the popped bar is a valley floor, the new stack top is its nearest left wall, and the current bar is its right wall. That is the unresolved-element pattern again: `water = min(leftWall, rightWall) - floorHeight`, over the width between the two walls.

## 3. Pattern Recognition

**Problem clue:** water trapped between taller bars on both sides; middle valleys resolved when a right boundary arrives.
**Pattern:** Monotonic Stack (decreasing) of indices.
**Why this pattern:** valley bars wait for a taller bar to their right; the moment one appears, a bounded region becomes fully known and can be added to the answer.
**Mental model:** the stack holds bars that are still waiting for a taller right wall.
**Similar problems:** Largest Rectangle in Histogram (same "nearest smaller on both sides" boundary machinery, applied horizontally); Next Greater Element (a bar is resolved by the first taller bar to its right).

## 4. Brute Force

For each column, find the maximum height to its left and to its right, then add `min(left, right) - height[i]`.

```java
int trapBrute(int[] height) {
    int n = height.length;
    int water = 0;
    for (int i = 0; i < n; i++) {
        int leftMax = 0, rightMax = 0;
        for (int l = 0; l <= i; l++) leftMax = Math.max(leftMax, height[l]);
        for (int r = i; r < n; r++) rightMax = Math.max(rightMax, height[r]);
        water += Math.min(leftMax, rightMax) - height[i];
    }
    return water;
}
```

**Why is this too slow?** The inner scans for `leftMax` and `rightMax` differ by a single element between consecutive `i` values, yet are recomputed from scratch — O(n²) time for O(n) of genuinely new information.

## 5. Observation

Instead of recomputing both boundaries for every index, keep a **decreasing** monotonic stack of indices. While the current bar is taller than the stack top, that top is a valley floor whose right wall is now known. Popping it exposes the nearest left wall as the new top.

```text
Before right = 3 (height 3), stack bottom->top: [0(4), 1(2), 2(0)]

  height:   4       2       0      | 3
           idx0    idx1    idx2    idx3
            |       |       |       |
            +-------+-------+-------+--- left wall = idx1 (2)
                    ^ floor = idx2 (0)
                                    ^ right wall = idx3 (3)

  bounded height = min(2, 3) - 0 = 2
  width          = 3 - 1 - 1     = 1
  water added    = 2 * 1         = 2
```

**Figure 2 —** On pop, the new top is the left wall and the current index is the right wall.

## 6. Optimal Approach

Scan left to right with a decreasing stack of indices. For each `right`:

- While the stack is not empty and `height[right] > height[stack.top()]`:
  - Pop the top as `bottom` (the valley floor).
  - If the stack is now empty, there is no left wall — stop (this bar cannot hold water).
  - Otherwise, `left = stack.top()` is the nearest left wall.
  - `width = right - left - 1`.
  - `boundedHeight = min(height[left], height[right]) - height[bottom]`.
  - Add `width * boundedHeight` to the total.
- Push `right`.

## 7. Invariant

> **Invariant:** The stack (bottom→top) always holds indices with non-increasing heights, and every bar in the stack is still waiting for a taller bar to its right to close the basin above it.

## 8. Dry Run

Input: `[4, 2, 0, 3, 2, 5]`.

| right | height | stack before (indices) | operation | water added | running total | stack after |
|---|---|---|---|---|---|---|
| 0 | 4 | `[]` | push | 0 | 0 | `[0]` |
| 1 | 2 | `[0]` | `2>4`? no; push | 0 | 0 | `[0,1]` |
| 2 | 0 | `[0,1]` | `0>2`? no; push | 0 | 0 | `[0,1,2]` |
| 3 | 3 | `[0,1,2]` | pop 2 (floor 0); left=1, right=3, w=1, h=min(2,3)-0=2 → +2 | 2 | 2 | `[0,1]` |
|   |     |            | pop 1 (floor 2); left=0, right=3, w=2, h=min(4,3)-2=1 → +2 | 2 | 4 | `[0]` |
|   |     |            | `3>4`? no; push 3 | 0 | 4 | `[0,3]` |
| 4 | 2 | `[0,3]` | `2>3`? no; push | 0 | 4 | `[0,3,4]` |
| 5 | 5 | `[0,3,4]` | pop 4 (floor 2); left=3, right=5, w=1, h=min(3,5)-2=1 → +1 | 1 | 5 | `[0,3]` |
|   |     |            | pop 3 (floor 3); left=0, right=5, w=4, h=min(4,5)-3=1 → +4 | 4 | 9 | `[0]` |
|   |     |            | pop 0 (floor 4); stack empty → stop | 0 | 9 | `[]` |
|   |     |            | push 5 | 0 | 9 | `[5]` |

Result: **9**.

## 9. Why Does It Work?

When a bar `bottom` is popped, the current `right` is the first bar to `bottom`'s right that is taller than it, and the new top `left` is the nearest bar to `bottom`'s left that is at least as tall (the stack is non-increasing, so anything taller would have popped `bottom` earlier). Therefore `min(height[left], height[right])` is exactly the height of water `bottom` can hold, and `right - left - 1` is exactly the horizontal span between its two walls. Every basin is charged precisely once: it is finalized at the pop that closes it. Bars that never get popped (a monotonic run) have a higher wall on one side only and never hold water above themselves, so they are correctly skipped.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int trap(int[] height) {
        int water = 0;
        Deque<Integer> stack = new ArrayDeque<>(); // indices; heights non-increasing, bottom -> top

        for (int right = 0; right < height.length; right++) {
            while (!stack.isEmpty() && height[right] > height[stack.peek()]) {
                int bottom = stack.pop();

                if (stack.isEmpty()) {
                    break; // no left wall -> this floor cannot trap water
                }

                int left = stack.peek();
                int width = right - left - 1;
                int boundedHeight =
                        Math.min(height[left], height[right]) - height[bottom];

                water += width * boundedHeight;
            }
            stack.push(right);
        }
        return water;
    }
}
```

## 11. Complexity

**Time:** O(n) — each index is pushed exactly once and popped at most once; the while-loop's total work across the whole run is O(n).
**Space:** O(n) auxiliary — the stack can grow to hold a strictly decreasing run of all `n` bars.

## 12. Edge Cases

- Fewer than 3 bars — no basin is possible; the answer is `0`.
- Strictly increasing heights `[1,2,3]` — the stack only ever grows; nothing pops; answer `0`.
- Strictly decreasing heights `[3,2,1]` — each new bar is shorter, so no pop occurs until the end; answer `0`.
- Flat heights `[2,2,2]` — equal heights never satisfy the strict `>` comparison, so no water is counted (correct: flat top holds nothing).
- A single tall bar in the middle of shorter bars on both sides.

## 13. Common Mistakes

- **Wrong width.** Width is the gap *between* the two walls: `right - left - 1`, not `right - left`. Forgetting the `-1` overcounts by one column.
- **Using the floor height instead of the bounding height.** The water height is `min(leftWall, rightWall) - floorHeight`, not the floor itself.
- **Forgetting the empty-stack case.** After popping the floor, if the stack is empty there is no left wall, and the region is unbounded — you must `break` rather than read a nonexistent top.
- Using `>=` instead of `>` in the pop condition, which mishandles flat/equal sections.

## 14. Pattern to Remember

```text
Problem clue:  water trapped between taller bars on both sides.
Pattern:       valley boundaries — a bar's water needs a higher bar on each side.
Data structure: decreasing monotonic stack of indices.
What the stack stores: bars waiting for a taller right boundary.
When to push: every bar index.
When to pop: when current height exceeds the top — the popped bar is a valley floor.
Invariant: heights of stacked indices are non-increasing.
Key insight: on pop, the new top is the left wall, current is the right wall,
             so the trapped width is now final.
Time / Space: O(n) / O(n).
```

**Memory trick:** *"A basin closes the moment a taller right wall arrives — the floor pops, the new top is the left wall."*

## 15. Interview Trigger

> When bars form unresolved valleys and a future taller wall closes them, I think monotonic stack. A pop reveals the left wall while the current index is the right wall, and the bounded region is added immediately.

## Related Problems

- [02-Sum-Of-Subarray-Minimums.md](02-Sum-Of-Subarray-Minimums.md) — another problem where each element's enclosing boundaries determine its contribution.
- [04-Sum-Of-Subarray-Ranges.md](04-Sum-Of-Subarray-Ranges.md) — the same contribution-counting mindset applied to max and min.
- [../05-Monotonic-Stack-Core/01-Next-Greater-Element.md](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — the base "resolved by a taller right bar" pattern.

## See also

- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — nearest-smaller boundaries on both sides, the horizontal cousin of this problem.
- [03-Next-Smaller-Element.md](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — the increasing-stack boundary routine reused throughout this family.
