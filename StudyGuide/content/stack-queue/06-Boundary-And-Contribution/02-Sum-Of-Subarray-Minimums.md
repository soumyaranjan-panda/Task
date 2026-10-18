# 20. Sum of Subarray Minimums

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/sum-of-subarray-minimums) · [Article](https://takeuforward.org/data-structure/sum-of-subarray-minimums) · [Video](https://youtu.be/v0e8p9JCgRc?si=XAU7ekECgS5nboRw) — **LeetCode:** [Problem](https://leetcode.com/problems/sum-of-subarray-minimums/)

## 1. Problem Understanding

Given an array, find the sum of the minimum value of **every** contiguous subarray, modulo `1_000_000_007`.

- **Input:** integer array `arr`.
- **Output:** `Σ over all subarrays S of min(S)`, mod 1e9+7.
- **The naive view:** there are `n(n+1)/2` subarrays, each with a minimum; summing them directly is O(n²) just to enumerate.

Example: `[3, 1, 2]` → subarray minima `3, 1, 1, 1, 1, 2` → sum `9`.

## 2. How to Think About the Problem

**What should I notice first?** The phrase "sum over all subarrays" is a strong hint that you should *not* enumerate subarrays. Instead, ask the contribution question: **how many subarrays have `arr[i]` as their minimum?** If there are `count` such subarrays, `arr[i]` contributes `arr[i] * count` to the total.

**What would I try first?** Enumerate all subarrays and track their running minimum. O(n²).

**Why is that too slow?** The running minima of overlapping subarrays repeat heavily. Every larger element that sits between two smaller ones is never anyone's minimum for long windows, yet brute force keeps looking at it.

**What observation unlocks the better solution?** An element `arr[i]` is the minimum of a subarray exactly when the subarray stays strictly to the right of the previous smaller barrier and strictly to the left of the next smaller barrier. So the count of subarrays where `arr[i]` is the minimum is

`(choices of left endpoint) × (choices of right endpoint) = (i - L) * (R - i)`

where `L` is the nearest index to the left that breaks `arr[i]` as minimum, and `R` is the nearest index to the right that breaks it. Both `L` and `R` are found with monotonic stacks.

## 3. Pattern Recognition

**Problem clue:** "sum over all subarrays" combined with "min" (or "max").
**Pattern:** Contribution technique + monotonic stack.
**Why this pattern:** the answer is a sum, so decompose it per index; each index's dominance is bounded on both sides, which is exactly a previous-smaller / next-smaller query.
**Mental model:** *"each element owns the subarrays where it is the smallest; count how many those are."*
**Similar problems:** Sum of Subarray Ranges (this problem done for min and max); Largest Rectangle in Histogram (same boundary distances, different objective).

## 4. Brute Force

```java
int sumSubarrayMinsBrute(int[] arr) {
    long mod = 1_000_000_007L;
    long total = 0;
    for (int i = 0; i < arr.length; i++) {
        int runningMin = Integer.MAX_VALUE;
        for (int j = i; j < arr.length; j++) {
            runningMin = Math.min(runningMin, arr[j]);
            total = (total + runningMin) % mod;
        }
    }
    return (int) total;
}
```

**Why is this too slow?** O(n²) subarray enumeration. Each new `j` extends many overlapping subarrays whose minima were already known, and recomputing `runningMin` per pair repeats that work.

## 5. Observation

Do not evaluate subarrays. Evaluate each *element's* contribution. Element `arr[i]` is the minimum for a subarray `[l, r]` as long as:

- `l` is after the previous element that would beat it on the left, and
- `r` is before the next element that would beat it on the right.

So count endpoint choices, not subarrays.

```text
arr = [3, 1, 2]      focus on i = 1 (value 1), the global minimum

  left reach  = 2 choices  (start at index 1, or index 0)
  right reach = 2 choices  (end at index 1, or index 2)

  subarrays where arr[1] = 1 is the minimum:

      [1]        [1,2]
      [3,1]      [3,1,2]
       ^-- 2 x 2 = 4 subarrays, each with minimum 1  -> contribution 1*4 = 4
```

**Figure 1 —** Contribution = value x (left choices) x (right choices).

## 6. Optimal Approach

1. Compute `left[i]` = number of consecutive elements ending at `i` (inclusive) that do not include anything smaller. Concretely, pop the stack while `arr[top] > arr[i]` (keeping equal values on the left), then `left[i] = (stack empty) ? i + 1 : i - stack.top()`.
2. Compute `right[i]` = number of consecutive elements starting at `i` (inclusive) until the next strictly-smaller element. Pop while `arr[top] >= arr[i]` (discarding equal values on the right), then `right[i] = (stack empty) ? n - i : stack.top() - i`.
3. Total `= Σ arr[i] * left[i] * right[i] mod 1e9+7`.

The asymmetry (`>` on the left, `>=` on the right) is what guarantees equal values are assigned to exactly one minimum, so no subarray is double counted.

## 7. Invariant

> **Invariant:** `left[i] * right[i]` equals the number of subarrays in which `arr[i]` is the *chosen* minimum, and the monotonic stacks ensure every subarray is charged to exactly one chosen minimum index.

## 8. Dry Run

Input: `[3, 1, 2]`.

Left pass — pop while `arr[top] > arr[i]` (previous smaller-or-equal):

| i | arr[i] | stack before | operation | left[i] | stack after |
|---|---|---|---|---|---|
| 0 | 3 | `[]` | push | `0+1=1` | `[0]` |
| 1 | 1 | `[0]` | `3>1` pop; push | `1+1=2` | `[1]` |
| 2 | 2 | `[1]` | `1>2`? no; push | `2-1=1` | `[1,2]` |

Right pass — pop while `arr[top] >= arr[i]` (next strictly smaller):

| i | arr[i] | stack before | operation | right[i] | stack after |
|---|---|---|---|---|---|
| 2 | 2 | `[]` | push | `3-2=1` | `[2]` |
| 1 | 1 | `[2]` | `2>=1` pop; push | `3-1=2` | `[1]` |
| 0 | 3 | `[1]` | `1>=3`? no; push | `1-0=1` | `[1,0]` |

Contributions:

| i | arr[i] | left[i] | right[i] | contribution = arr*left*right |
|---|---|---|---|---|
| 0 | 3 | 1 | 1 | 3 |
| 1 | 1 | 2 | 2 | 4 |
| 2 | 2 | 1 | 1 | 2 |
|   |   |   |   | **total 9** |

Result: **9**.

## 9. Why Does It Work?

Every subarray has a unique minimum *index* under the asymmetric comparison rule: among equal minima, the leftmost is chosen. For a chosen index `i`, the valid left endpoints are the `i - L` positions strictly after the previous smaller-or-equal element `L`, and the valid right endpoints are the `R - i` positions strictly before the next strictly-smaller element `R`. Their product counts exactly the subarrays whose chosen minimum is `i`. Summing `arr[i]` times that product over all `i` counts each subarray exactly once, hence reproduces the required sum.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int sumSubarrayMins(int[] arr) {
        long mod = 1_000_000_007L;
        int n = arr.length;

        long[] left = new long[n];   // choices: index i, and everything back to previous smaller-or-equal
        long[] right = new long[n];  // choices: index i, and everything forward to next strictly smaller

        Deque<Integer> stack = new ArrayDeque<>();

        // Previous smaller-or-equal: pop while top is strictly greater.
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && arr[stack.peek()] > arr[i]) {
                stack.pop();
            }
            left[i] = stack.isEmpty() ? i + 1 : i - stack.peek();
            stack.push(i);
        }

        stack.clear();

        // Next strictly smaller: pop while top is greater-or-equal.
        for (int i = n - 1; i >= 0; i--) {
            while (!stack.isEmpty() && arr[stack.peek()] >= arr[i]) {
                stack.pop();
            }
            right[i] = stack.isEmpty() ? n - i : stack.peek() - i;
            stack.push(i);
        }

        long answer = 0;
        for (int i = 0; i < n; i++) {
            answer = (answer + arr[i] * left[i] % mod * right[i]) % mod;
        }
        return (int) answer;
    }
}
```

## 11. Complexity

**Time:** O(n) — each of the two stack passes pushes and pops each index at most once; the final summation is O(n).
**Space:** O(n) — two `long` boundary arrays plus a stack of at most `n` indices.

## 12. Edge Cases

- **Duplicates** are the central edge case; the asymmetric `>` / `>=` handling must be preserved or subarrays get double counted.
- Single element — answer is that element.
- All elements equal — the leftmost occurrence owns every subarray (with the convention above).
- Strictly increasing / strictly decreasing arrays — the boundaries collapse to `left[i] = 1` or `right[i] = 1` respectively.
- Large values — `arr[i] * left[i] * right[i]` can overflow `int`, so use `long` and reduce modulo `1e9+7`.

## 13. Common Mistakes

- **Using strict comparison on both sides** (or non-strict on both) — this assigns equal minima twice or not at all, corrupting the count.
- **Forgetting the modulo**, or applying it after the multiplication in `int` arithmetic and overflowing.
- **Confusing span distance with count.** `left[i]` is the *number of left-endpoint choices* (`i - L`), not the index of the boundary.
- Reusing the same stack across both passes without clearing it.

## 14. Pattern to Remember

```text
Problem clue:  sum of the minimum (or maximum) over ALL subarrays.
Pattern:       contribution — count how many subarrays each element rules as minimum.
Data structure: two monotonic stacks to find previous-smaller and next-smaller boundaries.
What the stacks store: each element's boundary distances.
When to pop:   '>' on the left pass (keep equal), '>=' on the right pass (drop equal)
               so duplicates are assigned to exactly one owner.
Invariant:     every index gets a (prevSmaller, nextSmaller) pair before summing.
Key insight:   contribution = a[i] * (start choices) * (end choices)
                            = a[i] * (i - prevSmaller) * (nextSmaller - i).
Time / Space:  O(n) / O(n).
```

**Memory trick:** *"Do not count subarrays — count how many subarrays each element owns."*

## 15. Interview Trigger

> When I see "sum over all subarrays" together with min or max, I immediately ask: "Can I count how many subarrays each element contributes to?" That turns O(n²) enumeration into O(n) with boundary stacks.

## Related Problems

- [04-Sum-Of-Subarray-Ranges.md](04-Sum-Of-Subarray-Ranges.md) — this exact technique applied to both max and min.
- [01-Trapping-Rain-Water.md](01-Trapping-Rain-Water.md) — boundaries around each element determine its contribution.
- [../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — the next-smaller primitive used for the right boundary.

## See also

- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — previous/next smaller boundaries put to a different objective.
- [05-Remove-K-Digits.md](05-Remove-K-Digits.md) — another greedy monotonic-stack construction.
