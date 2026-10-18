# 26. Sliding Window Maximum

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/sliding-window-maximum) · [Article](https://takeuforward.org/data-structure/sliding-window-maximum/) · [Video](https://youtu.be/NwBvene4Imo?si=eU1PY-bcQfk5wdog) — **LeetCode:** [Problem](https://leetcode.com/problems/sliding-window-maximum/)

## 1. Problem Understanding

Given an integer array `nums` and a window size `k`, slide a window of width `k` from left to right and report the maximum value inside each window. There are `n - k + 1` windows, and the answer is an array of those maxima.

Example:

```text
nums = [1, 3, -1, -3, 5, 3, 6, 7],  k = 3
result = [3, 3, 5, 5, 6, 7]
```

The windows are `[1,3,-1]`, `[3,-1,-3]`, `[-1,-3,5]`, `[-3,5,3]`, `[5,3,6]`, `[3,6,7]`.

The naive approach recomputes the maximum of each window from scratch. The goal is to reuse work as the window slides.

## 2. How to Think About the Problem

A plain queue preserves arrival order, but the maximum can sit anywhere inside, so a queue alone tells you nothing about where the max is. A max-heap gives the maximum in `O(log n)` per element but cannot easily drop elements that have left the window.

The right question is a **candidate** question:

> Which elements can still become the maximum of some future window?

Suppose we have two indices `i < j` with `nums[i] <= nums[j]`. Then `j` is at least as large as `i`, and `j` will leave the window later than `i`. So whenever `i` is inside a window, `j` is also inside that window and is at least as large. Therefore `i` can **never** be the unique maximum of any window that contains it while `j` is present. `i` is dominated and can be discarded forever.

This is **candidate elimination**. Only candidates that are not dominated by a newer, larger element remain useful. They form a sequence of decreasing values with increasing indices — a **decreasing monotonic deque**. The front holds the maximum of the current window; the back is where new candidates enter and dominated ones are discarded.

A deque is used (rather than a stack) because we must remove from both ends: expired indices leave from the front, dominated candidates leave from the back.

## 3. Pattern Recognition

**Clue:** sliding window plus maximum (or minimum) for every window, many windows over one array.

**Pattern:** dominance + expiry, implemented as a **decreasing monotonic deque** of indices.

| Signal | This problem |
|---|---|
| Need max of every width-`k` window | Maintain only live candidates |
| Old small element behind a new large element | Dominated, discard from the back |
| Element falls out of the window | Expired, discard from the front |
| Front is always the current window max | Candidate order encodes the answer |

For minimums, keep the deque **increasing** instead: pop from the back while the value is `>=` the current value.

## 4. Brute Force

For each of the `n - k + 1` windows, scan its `k` elements to find the maximum.

```java
class BruteForce {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] answer = new int[n - k + 1];

        for (int start = 0; start + k <= n; start++) {
            int max = nums[start];
            for (int i = start + 1; i < start + k; i++) {
                max = Math.max(max, nums[i]);
            }
            answer[start] = max;
        }

        return answer;
    }
}
```

This is `O(n * k)` time and `O(1)` auxiliary space. It redoes `k - 1` comparisons of work for every slide even though only one element enters and one leaves.

## 5. Observation

Maintain a deque of indices such that:

- indices are increasing from front to back,
- values are strictly decreasing from front to back.

Then the front index holds the maximum of the current window. When a new index `i` arrives:

1. Remove the front while it is outside the window.
2. Remove the back while its value is `<= nums[i]` — `i` dominates it.
3. Add `i` at the back.

The deque never contains a value smaller than something behind it, so it is always the sorted list of live candidates.

**Figure 1 —** the deque layout.

```text
             front                     back
               |                         |
               v                         v
        +------+------+------+------+
        | idx  | idx  | idx  | idx  |  values decrease  L -> R
        | val  | val  | val  | val  |  indices increase L -> R
        +------+------+------+------+
           ^
           current window maximum
```

## 6. Optimal Approach

For each index `i` from `0` to `n - 1`:

1. **Expire:** while the deque is non-empty and `deque.peekFirst() <= i - k`, remove from the front. Those indices have fallen out of the window.
2. **Dominate:** while the deque is non-empty and `nums[deque.peekLast()] <= nums[i]`, remove from the back. The current value is at least as large and lasts longer.
3. **Insert:** add `i` at the back.
4. **Record:** once `i >= k - 1`, the window is fully formed and the maximum is `nums[deque.peekFirst()]`.

The `<=` in the dominate step pops equal values too. This is safe and keeps values strictly decreasing, so the front is a well-defined unique maximum.

## 7. Invariant

> **Invariant:** At the start of iteration `i`, the deque contains exactly the indices in `[i - k + 1, i - 1]` that are not dominated by any later index in that range, stored in increasing index order and decreasing value order. The front holds the maximum value of the previous window; after inserting `i`, the front holds the maximum of the current window.

## 8. Dry Run

`nums = [1,3,-1,-3,5,3,6,7]`, `k = 3`. The window is valid from `i = 2` onward.

| i | nums[i] | expire front (`<= i-k`) | pop back (`<=` current) | deque after | output |
|---|---------|-------------------------|-------------------------|-------------|--------|
| 0 | 1 | no | no | `[0]` | — |
| 1 | 3 | no | pop 0 | `[1]` | — |
| 2 | -1 | no | no | `[1,2]` | 3 |
| 3 | -3 | no | no | `[1,2,3]` | 3 |
| 4 | 5 | pop 1 | pop 3, pop 2 | `[4]` | 5 |
| 5 | 3 | no | no | `[4,5]` | 5 |
| 6 | 6 | no | pop 5, pop 4 | `[6]` | 6 |
| 7 | 7 | no | pop 6 | `[7]` | 7 |

Result: `[3, 3, 5, 5, 6, 7]`.

**Figure 2 —** the decisive step, when `5` arrives at `i = 4`.

```text
window before i=4 covers indices 2..4:  [-1, -3, 5]
deque before:   [ idx2(-1), idx3(-3) ]
                 front          back

nums[i] = 5 dominates both (-1 <= 5, -3 <= 5):
   pop back -> remove idx3
   pop back -> remove idx2
deque now:      [ idx4(5) ]
window max = 5
```

Earlier, at `i = 1`, the value `3` dominated `1` because `3 >= 1` and index `1` outlives index `0`; `1` was discarded permanently.

## 9. Why Does It Work?

For the expire step: any index `<= i - k` is to the left of the current window `[i - k + 1, i]`, so it can no longer contribute. Removing it from the front is correct because index order in the deque is increasing.

For the dominate step: if `nums[back] <= nums[i]`, index `i` is newer (leaves the window no earlier) and at least as large, so `back` can never be a window maximum while `i` is present. Removing it is permanent and safe.

After both steps, every index still in the deque is a genuine candidate: it is inside the window (not expired) and no newer candidate dominates it. Because values are strictly decreasing from front to back, the front is the largest candidate, hence the maximum of the current window. Every index enters once and leaves at most once, so the total work is linear.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] answer = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!deque.isEmpty() && deque.peekFirst() <= i - k) {
                deque.pollFirst();
            }

            while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
                deque.pollLast();
            }

            deque.offerLast(i);

            if (i >= k - 1) {
                answer[i - k + 1] = nums[deque.peekFirst()];
            }
        }

        return answer;
    }
}
```

## 11. Complexity

| Resource | Cost | Why |
|---|---|---|
| Time | O(n) | Each index is offered once and polled at most once (front or back) |
| Space | O(k) | The deque holds at most `k` indices, one per window position |

The nested `while` loops do not make this quadratic: across the whole scan there are at most `n` offers and at most `n` polls, so total deque operations are `2n`.

## 12. Edge Cases

- **`k = 1`**: every window is a single element, so the answer equals `nums`. The deque trims the previous element with the expire check each step.
- **`k = n`**: one window; the answer has length 1 and is the global maximum.
- **All equal values**: the `<=` dominate step keeps only the newest index, and the front is always the current value. Correct.
- **Strictly increasing** `[1,2,3,4]`, `k = 2`: each new value pops the previous, deque holds one index; output `[2,3,4]`.
- **Strictly decreasing** `[4,3,2,1]`, `k = 2`: nothing is dominated, the deque grows and then expires from the front; output `[4,3,2]`.
- **Negative numbers**: dominance and expiry are value-agnostic, so negatives work without changes.
- **`k > n`**: invalid input for the stated constraints; a window never forms.

## 13. Common Mistakes

1. **Expiring from the back instead of the front.** Expired indices are always the oldest, so they live at the front; removing from the back corrupts the candidate order.
2. **Storing values instead of indices.** Without indices you cannot tell when an element leaves the window.
3. **Using `<` instead of `<=` in the dominate step.** Duplicates would accumulate and the front could be a stale equal value, though the answer is often still correct; the strict version keeps the deque clean and the max unique.
4. **Reading `nums[deque.peekFirst()]` before the first full window.** Guard with `i >= k - 1`; before that the window is not complete.
5. **Wrong output index.** The result slot is `i - k + 1`, not `i`.
6. **Forgetting the array size.** There are exactly `n - k + 1` windows; allocating `n` leaves trailing zeros or overflows.

## 14. Pattern to Remember

```text
**Problem clue:** maximum of every contiguous window of size k.
**Pattern:** dominance + expiry -> decreasing monotonic deque.
**Data structure:** `ArrayDeque` of indices, decreasing by value.
**What it stores:** the only candidates that can still become a window maximum.
**When to push:** every index, after trimming the back.
**When to pop:** back while its value `<=` current (current dominates it); front when it expires (`< i - k + 1`).
**Invariant:** the front holds the current window maximum; values decrease front-to-back, indices increase front-to-back.
**Key insight:** a newer and larger element makes older smaller ones permanently useless.
**Time:** O(n).
**Space:** O(k).
```

```text
Sliding window max
→ keep only useful candidates
→ decreasing deque
→ front is max
```

## 15. Interview Trigger

> If I need a max/min for every sliding window, ask: "Which candidates can never win again?" Remove dominated candidates and keep the rest in a monotonic deque.

The presence of a fixed-size window plus a range maximum or minimum is the trigger. A deque (not a stack) appears whenever removal is needed from both ends.

## Related Problems

- [24. Largest Rectangle in a Histogram](01-Largest-Rectangle-In-A-Histogram.md) — monotonic stack instead of deque.
- [25. Maximal Rectangle](02-Maximal-Rectangle.md) — reuse of the histogram pattern.
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — candidate elimination with a stack.
- [Next Smaller Element](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — the mirror ordering.
- [Stock Span](../08-Cache-And-Misc/01-Stock-Span.md) — a decreasing candidate stack with accumulated widths.

## See also

- [Trapping Rain Water](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md)
- [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md)
- [LRU Cache](../08-Cache-And-Misc/03-LRU-Cache.md)
