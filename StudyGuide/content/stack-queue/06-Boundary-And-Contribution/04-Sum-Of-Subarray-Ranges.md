# 22. Sum of Subarray Ranges

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/sum-of-subarray-ranges) · [Article](https://takeuforward.org/data-structure/sum-of-subarray-ranges) · [Video](https://youtu.be/gIrMptNPf5M?si=Q_GHuBvzZVs27X_U) — **LeetCode:** [Problem](https://leetcode.com/problems/sum-of-subarray-ranges/)

## 1. Problem Understanding

For every contiguous subarray, its **range** is `max - min`. Return the sum of the ranges over all subarrays.

- **Input:** integer array `nums`.
- **Output:** `Σ over all subarrays S of (max(S) - min(S))`.
- **The unlock:** split the sum:

```text
Σ (max(S) - min(S))  =  Σ max(S)  -  Σ min(S)
```

The two halves can be computed independently with the contribution technique.

Example: `[1, 3, 2]` → subarray ranges `0, 2, 2, 0, 1, 0` → sum `5`.

## 2. How to Think About the Problem

**What should I notice first?** The range is a difference, and summation distributes over the subtraction. Rather than handling `max - min` per subarray, compute the total of all maxima and the total of all minima separately.

**What would I try first?** Enumerate every subarray, track its min and max, and add the range. O(n²).

**Why is that too slow?** Same redundant suffix scanning as Sum of Subarray Minimums — the running min/max of overlapping subarrays is recomputed repeatedly.

**What observation unlocks the better solution?** Each element contributes to the maximum total for every subarray in which it is the chosen max, and to the minimum total for every subarray in which it is the chosen min. Both counts come from boundary distances found by monotonic stacks — exactly the Sum of Subarray Minimums machinery, run twice with opposite comparisons.

## 3. Pattern Recognition

**Problem clue:** `max - min` summed over all subarrays.
**Pattern:** Contribution decomposition — two independent contribution problems.
**Why this pattern:** the objective is linear in max and min, so it splits; each piece is a boundary-counting problem.
**Mental model:** *"This is Sum of Subarray Minimums done once for the minimum and once for the maximum, then subtracted."*
**Similar problems:** Sum of Subarray Minimums (one half of this); Largest Rectangle in Histogram (same boundary distances).

## 4. Brute Force

```java
long subArrayRangesBrute(int[] nums) {
    int n = nums.length;
    long total = 0;
    for (int i = 0; i < n; i++) {
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (int j = i; j < n; j++) {
            min = Math.min(min, nums[j]);
            max = Math.max(max, nums[j]);
            total += (long) (max - min);
        }
    }
    return total;
}
```

**Why is this too slow?** Enumerating all `O(n²)` subarrays and recomputing min/max incrementally still visits every pair, and provides no way to reuse the boundary information that the contribution method exploits.

## 5. Observation

Because `Σ(max - min) = Σmax - Σmin`, compute each sum by counting how many subarrays each element "owns" as the maximum or minimum. The ownership count is again a product of left and right choices determined by the nearest boundaries.

```text
nums = [1, 3, 2]         focus on i = 1 (value 3), the global maximum

  left choices  = 2   (start at index 1, or index 0)
  right choices = 2   (end at index 1, or index 2)
  3 owns 2*2 = 4 subarrays as maximum  ->  contributes 3 * 4 = 12 to SumMax

  Meanwhile SumMin over all subarrays = 10, SumMax = 15
  answer = SumMax - SumMin = 15 - 10 = 5
```

**Figure 1 —** Range sum = (total of all subarray maxima) minus (total of all subarray minima).

## 6. Optimal Approach

1. Compute `sumOfMax(nums)` using the same two-stack boundary routine as Sum of Subarray Minimums, but flipped: an element owns subarrays where it is the maximum. Use `left` pop condition `a[top] < a[i]` (previous greater-or-equal) and `right` pop condition `a[top] <= a[i]` (next strictly greater).
2. Compute `sumOfMin(nums)` with the min version (`>` on the left, `>=` on the right).
3. Return `sumOfMax - sumOfMin`.

Both routines accumulate `value * leftChoices * rightChoices` in a `long`.

## 7. Invariant

> **Invariant:** For each routine, `left[i] * right[i]` counts exactly the subarrays in which `arr[i]` is the chosen maximum (or minimum), so the sum of `arr[i] * left[i] * right[i]` over all `i` equals the total of subarray maxima (or minima).

## 8. Dry Run

Input: `[1, 3, 2]`.

`sumOfMin` (pop `>` on left, `>=` on right):

| i | arr[i] | left[i] | right[i] | contribution |
|---|---|---|---|---|
| 0 | 1 | 1 | 3 | 3 |
| 1 | 3 | 1 | 1 | 3 |
| 2 | 2 | 2 | 1 | 4 |
|   |   |   |   | **sumOfMin = 10** |

`sumOfMax` (pop `<` on left, `<=` on right):

| i | arr[i] | left[i] | right[i] | contribution |
|---|---|---|---|---|
| 0 | 1 | 1 | 1 | 1 |
| 1 | 3 | 2 | 2 | 12 |
| 2 | 2 | 1 | 1 | 2 |
|   |   |   |   | **sumOfMax = 15** |

Answer `= 15 - 10 =` **5**.

Cross-check by enumerating subarrays:

| subarray | min | max | range |
|---|---|---|---|
| `[1]` | 1 | 1 | 0 |
| `[1,3]` | 1 | 3 | 2 |
| `[1,3,2]` | 1 | 3 | 2 |
| `[3]` | 3 | 3 | 0 |
| `[3,2]` | 2 | 3 | 1 |
| `[2]` | 2 | 2 | 0 |
|   |   |   | **total 5** |

## 9. Why Does It Work?

`Σ(max - min)` distributes into `Σmax - Σmin` because summation is linear. Each `Σmax` and `Σmin` is computed by the same argument as Sum of Subarray Minimums: with the asymmetric comparison rule, each subarray is charged to exactly one chosen maximum index and exactly one chosen minimum index, so both totals are correct, and their difference is the required range sum.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public long subArrayRanges(int[] nums) {
        return sumOfMax(nums) - sumOfMin(nums);
    }

    private long sumOfMin(int[] a) {
        int n = a.length;
        long[] left = new long[n];
        long[] right = new long[n];
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && a[stack.peek()] > a[i]) {
                stack.pop();
            }
            left[i] = stack.isEmpty() ? i + 1L : i - stack.peek();
            stack.push(i);
        }

        stack.clear();

        for (int i = n - 1; i >= 0; i--) {
            while (!stack.isEmpty() && a[stack.peek()] >= a[i]) {
                stack.pop();
            }
            right[i] = stack.isEmpty() ? n - i : stack.peek() - i;
            stack.push(i);
        }

        long result = 0;
        for (int i = 0; i < n; i++) {
            result += (long) a[i] * left[i] * right[i];
        }
        return result;
    }

    private long sumOfMax(int[] a) {
        int n = a.length;
        long[] left = new long[n];
        long[] right = new long[n];
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && a[stack.peek()] < a[i]) {
                stack.pop();
            }
            left[i] = stack.isEmpty() ? i + 1L : i - stack.peek();
            stack.push(i);
        }

        stack.clear();

        for (int i = n - 1; i >= 0; i--) {
            while (!stack.isEmpty() && a[stack.peek()] <= a[i]) {
                stack.pop();
            }
            right[i] = stack.isEmpty() ? n - i : stack.peek() - i;
            stack.push(i);
        }

        long result = 0;
        for (int i = 0; i < n; i++) {
            result += (long) a[i] * left[i] * right[i];
        }
        return result;
    }
}
```

## 11. Complexity

**Time:** O(n) — four stack passes in total (two per routine), each O(n) amortized, plus two O(n) summations.
**Space:** O(n) — the two boundary arrays and the stack.

## 12. Edge Cases

- Single element — range is `0`; both sums equal the element, and the difference is `0`.
- **Duplicates** — the max and min routines must each use their own asymmetric comparison to avoid double counting.
- Negative values — handled naturally, since the routine only compares values and never uses them as indices.
- Strictly increasing or decreasing arrays — one of the boundary distances collapses to `1` throughout.
- Large arrays — the total can exceed `int`, so accumulate in `long`.

## 13. Common Mistakes

- **Using the same duplicate convention blindly for max and min.** The ownership tie-break must be consistent *within* each routine, but the comparison operators are mirrored (`<` / `<=` for max, `>` / `>=` for min).
- Forgetting to `stack.clear()` between the left and right passes.
- Accumulating in `int` and overflowing on large inputs.
- Trying to compute `max - min` in a single pass instead of splitting into two independent contribution problems.

## 14. Pattern to Remember

```text
Problem clue:  sum of (max - min) over ALL subarrays.
Pattern:       contribution applied twice — once for maximum, once for minimum.
Data structure: monotonic stacks for previous/next greater AND previous/next smaller.
What they store: boundary distances for each element.
When to pop:   '<' then '<=' for the max routine; '>' then '>=' for the min routine
               (mirrored asymmetry keeps duplicates single-owned).
Invariant:     sum(max) - sum(min) over all subarrays equals the required answer.
Key insight:   this is two "Sum of Subarray Minimums" computations glued together.
Time / Space:  O(n) / O(n).
```

**Memory trick:** *"Range = maximum contribution minus minimum contribution."*

## 15. Interview Trigger

> Whenever a subarray quantity is `max - min`, I split it into two independent contribution problems — total of maxima and total of minima — and solve each with the boundary-stack technique.

## Related Problems

- [02-Sum-Of-Subarray-Minimums.md](02-Sum-Of-Subarray-Minimums.md) — the single half this problem runs twice.
- [01-Trapping-Rain-Water.md](01-Trapping-Rain-Water.md) — element contributions determined by boundaries.
- [../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — next-smaller primitive behind the boundary distances.

## See also

- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — nearest-smaller boundaries as a standalone problem.
- [05-Remove-K-Digits.md](05-Remove-K-Digits.md) — greedy monotonic stack, another application of the same core.
