# 25. Maximal Rectangle

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/maximum-rectangles) · [Article](https://takeuforward.org/data-structure/maximum-rectangle-area-with-all-1s-dp-on-rectangles-dp-55/) · [Video](https://youtu.be/tOylVCugy9k) — **LeetCode:** [Problem](https://leetcode.com/problems/maximal-rectangle/)

## 1. Problem Understanding

Given a binary matrix of `'0'` and `'1'` characters, find the area of the largest axis-aligned rectangle that contains only `'1'`s. The rectangle is defined by choosing a set of consecutive rows and consecutive columns; every cell inside that block must be `'1'`.

Example:

```text
1 0 1 0 0
1 0 1 1 1
1 1 1 1 1
1 0 0 1 0
```

The largest all-`1` rectangle here is the `2 x 3` block spanning rows 1–2 and columns 2–4, area `6`.

The problem looks 2-D, but the important observation is that it is not a new pattern at all: it reduces to the histogram problem from the previous page.

## 2. How to Think About the Problem

Any all-`1` rectangle has a **bottom row** — the lowest row it occupies. Fix that bottom row and look upward: in each column, the rectangle can extend up through a run of consecutive `'1'`s. Let `heights[j]` be the number of consecutive `'1'`s ending at the current row in column `j`. Then the widest rectangle whose bottom edge lies on the current row is exactly the **largest rectangle in the histogram** `heights`.

So the reduction is:

```text
2-D binary matrix
    -> per-row histogram of consecutive 1s ending at that row
        -> Largest Rectangle in a Histogram
```

Run the histogram solver once per row, keeping the running maximum. Every possible rectangle has some bottom row, and it is found when that row is processed. This is a 2-D-to-1-D reduction, not a brand-new algorithm.

The height update mirrors a "count upward" recurrence. On row `r`, column `j`:

```text
heights[j] = 0                    if matrix[r][j] == '0'
heights[j] = heights[j] + 1       if matrix[r][j] == '1'
```

A `'0'` resets the column's run because the rectangle can no longer extend upward through it.

## 3. Pattern Recognition

**Clue:** largest rectangle of `'1'`s inside a binary grid.

**Pattern:** reduce the grid to one histogram per row, then apply the increasing monotonic stack.

| Signal | This problem |
|---|---|
| 2-D all-ones block | Fix a bottom row, look up |
| Consecutive vertical ones | Per-column running height |
| Largest area in a 1-D row of bars | Largest Rectangle in a Histogram |
| Bottom row varies | Sweep every row and keep the best |

**Maximum rectangle in a matrix = histogram per row + largest rectangle in a histogram.**

## 4. Brute Force

Enumerate every pair of rows `(top, bottom)` and every pair of columns `(left, right)`, then verify that the whole block is `'1'`. That is `O(R^2 * C^2)` cells to enumerate, and `O(R * C)` to verify, for roughly `O(R^3 * C^3)` in the worst case — far too slow.

A better brute force fixes a top row and grows a bottom row downward, maintaining per-column heights and recomputing the histogram with an `O(C^2)` scan each time:

```java
class BruteForce {
    public int maximalRectangle(char[][] matrix) {
        if (matrix.length == 0) return 0;
        int rows = matrix.length;
        int cols = matrix[0].length;
        int[] heights = new int[cols];
        int best = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                heights[c] = matrix[r][c] == '1' ? heights[c] + 1 : 0;
            }

            best = Math.max(best, naiveLargestRectangle(heights));
        }

        return best;
    }

    private int naiveLargestRectangle(int[] heights) {
        int best = 0;
        for (int i = 0; i < heights.length; i++) {
            int min = heights[i];
            for (int j = i; j < heights.length; j++) {
                min = Math.min(min, heights[j]);
                best = Math.max(best, min * (j - i + 1));
            }
        }
        return best;
    }
}
```

This is `O(R * C^2)` time. It is correct but slower than reusing the linear histogram solver.

## 5. Observation

For a fixed bottom row, consecutive `'1'`s stacked upward form histogram heights. For example, after processing the third row of the sample matrix, the heights are `[3,1,3,2,2]`:

**Figure 1 —** the sample matrix, with the answer shown.

```text
        +---+---+---+---+---+
 row 0  | 1 | 0 | 1 | 0 | 0 |
        +---+---+---+---+---+
 row 1  | 1 | 0 | 1 | 1 | 1 |   <- top of the 2x3 block
        +---+---+---+---+---+
 row 2  | 1 | 1 | 1 | 1 | 1 |   <- bottom (spans cols 2..4)
        +---+---+---+---+---+
 row 3  | 1 | 0 | 0 | 1 | 0 |
        +---+---+---+---+---+
          c0  c1  c2  c3  c4
```

The `2 x 3` block over columns 2–4 has area `6`.

**Figure 2 —** row 2 becomes a histogram.

```text
 heights = [3,1,3,2,2]

 3 | #
 2 | #     #  #
 1 | #  #  #  #  #
   +-----------------
     0  1  2  3  4
```

At this row the histogram's best rectangle is height `2` over columns 2–4, area `6` — exactly the answer.

## 6. Optimal Approach

For each row:

1. Update `heights[j]`: increment if the cell is `'1'`, reset to `0` if `'0'`.
2. Compute the largest rectangle in the histogram `heights` using the `O(C)` increasing-stack solver.
3. Keep the maximum area seen over all rows.

Because each row only changes heights in place, and each histogram pass is linear in the number of columns, the whole sweep is `O(R * C)`.

## 7. Invariant

> **Invariant:** Before processing a row, `heights[j]` equals the number of consecutive `'1'`s ending at the current row in column `j`. Therefore the histogram `heights` at row `r` represents, for every column, the tallest all-`1` tower whose bottom cell is on row `r` — and the best rectangle with bottom edge on row `r` is the best histogram rectangle of `heights`.

## 8. Dry Run

Matrix (same as above). Heights evolve row by row; after each update we run the histogram solver.

| row | cells | heights after update | best histogram area this row | running best |
|-----|-------|----------------------|------------------------------|--------------|
| 0 | `1 0 1 0 0` | `[1,0,1,0,0]` | 1 | 1 |
| 1 | `1 0 1 1 1` | `[2,0,2,1,1]` | 3 | 3 |
| 2 | `1 1 1 1 1` | `[3,1,3,2,2]` | 6 | 6 |
| 3 | `1 0 0 1 0` | `[4,0,0,3,0]` | 4 | 6 |

Row-by-row histogram reasoning:

- Row 0: only isolated columns of height 1; best `1`.
- Row 1: columns 2–4 form heights `2,1,1`; the minimum over the run is `1`, width `3`, area `3`.
- Row 2: columns 2–4 form heights `3,2,2`; height `2` over width `3` gives area `6` (columns 3 and 4 are `2`, and column 2's `3` clears the height-2 bar).
- Row 3: column 0 has height `4` but width `1`; column 3 has height `3`, width `1`; best `4`.

The overall maximum is **6**.

## 9. Why Does It Work?

Every all-`1` rectangle `B` occupies a contiguous set of rows and columns, so it has a unique bottom row `r` and a leftmost and rightmost column `[l, rC]`. When the sweep reaches row `r`, the height `heights[j]` for each column `j` in `[l, rC]` is at least the rectangle's height `h` (because the rectangle is all `1`s for `h` rows above and including `r`). Therefore the histogram over row `r` contains a rectangle of height at least `h` and width at least `rC - l + 1`, so its computed best is at least `area(B)`.

Taking the maximum over all rows, no rectangle is missed, and the histogram solver never reports an area larger than some actual all-`1` rectangle (each histogram rectangle corresponds to a real set of cells that are all `1`). Hence the sweep returns the true maximum.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int maximalRectangle(char[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;

        int cols = matrix[0].length;
        int[] heights = new int[cols];
        int best = 0;

        for (char[] row : matrix) {
            for (int c = 0; c < cols; c++) {
                heights[c] = row[c] == '1' ? heights[c] + 1 : 0;
            }

            best = Math.max(best, largestRectangleArea(heights));
        }

        return best;
    }

    private int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;

        for (int i = 0; i <= heights.length; i++) {
            int current = (i == heights.length) ? 0 : heights[i];

            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int height = heights[stack.pop()];
                int left = stack.isEmpty() ? -1 : stack.peek();
                int width = i - left - 1;
                best = Math.max(best, height * width);
            }

            if (i < heights.length) {
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
| Time | O(R × C) | Each cell updates one height (O(1)); each row runs an O(C) histogram pass |
| Space | O(C) | The `heights` array and the stack both hold at most one column's worth |

The matrix itself is `O(R × C)` memory; we add only `O(C)` auxiliary space, which is the point of the in-place row sweep.

## 12. Edge Cases

- **Empty matrix** (`matrix.length == 0`): return `0`. Guard `matrix[0].length` too.
- **All zeros**: every height resets to `0`; the histogram solver returns `0`.
- **All ones**: heights grow to `R`; the answer is `R * C`.
- **One row**: degenerates to the plain histogram problem.
- **One column**: answer is the longest vertical run of `'1'`s.
- **Zeros splitting a row**: heights reset correctly, preventing a rectangle from bridging a gap.
- **Ragged or null rows**: not valid input for this problem; assume a rectangular matrix.

## 13. Common Mistakes

1. **Resetting heights incorrectly.** A `'0'` must reset to `0`, a `'1'` must increment the previous value. Using `1` for every `'1'` loses vertical stacking.
2. **Solving each row with an `O(C^2)` histogram** when the `O(C)` solver is available — correct but `O(R * C^2)`.
3. **Forgetting this is exactly the histogram problem**, then trying to invent a 2-D DP.
4. **Reusing the stack array across rows without clearing it.** The histogram helper must start with a fresh stack each call.
5. **Mishandling the empty matrix.** Reading `matrix[0]` before checking `matrix.length > 0` throws.

## 14. Pattern to Remember

```text
**Problem clue:** largest rectangle of 1s inside a binary grid.
**Pattern:** reduce 2D to repeated 1D histograms.
**Data structure:** height array per row + the histogram monotonic stack.
**What the stack stores:** column indices of increasing bar heights for the current row.
**When to pop:** same rule as the histogram, whenever a shorter column appears.
**Invariant:** `heights[c]` = number of consecutive 1s ending at the current row in column `c`.
**Key insight:** running Maximal-Rectangle per row covers every possible base line of the 1s.
**Time:** O(row × col).
**Space:** O(col).
```

## 15. Interview Trigger

> When I see a binary matrix and am asked for the largest all-1 rectangle, turn the rows into histogram heights. Then I reuse the histogram pattern.

Ask: "If I fix a bottom row, what is the height of consecutive ones in each column?" If that question makes sense, the problem is Maximal Rectangle and the solver is the histogram stack.

## Related Problems

- [24. Largest Rectangle in a Histogram](01-Largest-Rectangle-In-A-Histogram.md) — the inner solver used verbatim.
- [26. Sliding Window Maximum](03-Sliding-Window-Maximum.md) — another candidate-elimination pass.
- [Next Smaller Element](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — the boundary used by the inner solver.
- [Trapping Rain Water](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md) — same height-array reasoning.
- [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md) — smaller-on-both-sides counting.

## See also

- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md)
- [Stock Span](../08-Cache-And-Misc/01-Stock-Span.md)
- [Remove K Digits](../06-Boundary-And-Contribution/05-Remove-K-Digits.md)
