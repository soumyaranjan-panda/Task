# 16. Next Greater Element II (Circular)

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/next-greater-element---2) · [Article](https://takeuforward.org/data-structure/next-greater-element-2) · [Video](https://youtu.be/7PrncD7v9YQ?si=UkBc7eVy9HGlBpeW) — **LeetCode:** [Problem](https://leetcode.com/problems/next-greater-element-ii/)

## 1. Problem Understanding

Same question as Problem 15, but the array is **circular** — after the last element, searching "to the right" wraps back around to the beginning, as if the array repeated itself.

Example: `[1, 2, 1]` → for index 0 (`1`): index 1 (`2`) is greater → answer `2`. For index 1 (`2`): looking right, then wrapping — `1`, then `1` again — nothing beats `2` → answer `-1`. For index 2 (`1`): wraps to index 0 (`1`, not greater), then index 1 (`2`, greater!) → answer `2`. Result: `[2, -1, 2]`.

## 2. How to Think About the Problem

**What is different from Problem 15?** The array wraps. **What clue matters?** "Circular" — think of the array as if it were written out **twice in a row**, and run ordinary Next Greater Element logic across that doubled view, but only *keep* answers for the first copy's positions (the "real" ones).

**What would I try first?** Literally concatenate `arr + arr` into a new array of size `2n` and run Problem 15's algorithm unchanged, keeping only the first `n` answers. This *works*, but allocates an unnecessary `O(n)` extra array.

**What observation removes that waste?** You do not need to materialize the doubled array at all — just let your loop counter run from `0` to `2n - 1`, and access the *real* underlying value via `arr[i % n]`. The modulo does the "wrapping" for you, for free, with zero extra memory.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`array wraps` → `simulate two laps using i % n, no extra array needed` → `Circular Monotonic Stack` → `same stack as Problem 15` → `run the identical algorithm for 2n steps instead of n, reading via arr[i % n]`.

## 3. Pattern Recognition

**Problem clue:** "circular array" + "next greater."
**Pattern:** Circular Monotonic Stack.
**Why this pattern:** identical monotonic-stack logic to Problem 15 — it just needs to see "one extra lap" of the array, because an element near the end might have its true next-greater sitting near the beginning.
**Mental model:** same "stack = unresolved elements" model; the loop just runs for `2n` steps using modulo to reuse the same underlying array.
**Similar problems:** Problem 15, directly — this is about 90% identical code. This same "double the loop, use `% n`" trick generalizes to making *any* "next X" monotonic-stack problem circular.

## 4. Brute Force

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

## 5. Observation

Same core insight as Problem 15 (once beaten, discard forever), **plus** the extra trick that makes circularity free: simulate "the array happening twice in a row" using `i % n`, so a single monotonic-stack pass naturally handles wraparound without doubling memory or writing fundamentally different logic.

```text
Virtual doubled view of [1, 2, 1]:

lap 1:  index 0    1    2
                1   2   1
lap 2:  index 0    1    2
                1   2   1

Real positions = lap 1 only. Lap 2 re-reads the same cells via i % n,
giving end-of-array elements a chance to find a wrap-around answer.
```

**Figure 1 —** Two virtual laps over the same physical array.

## 6. Optimal Approach

Run the *same* algorithm as Problem 15, but let `i` range from `0` to `2n - 1`, always reading via `arr[i % n]`. **Only push during the first lap** (`i < n`) — the second lap exists purely to give still-unresolved first-lap elements one more chance to find something bigger wrapping around; it does not correspond to any *new* position needing its own answer, so nothing new needs to be pushed.

## 7. Invariant

> **Invariant:** Identical to Problem 15's, with one addition: only genuine (first-lap) indices are ever pushed, so the stack never grows past `n` entries even though the loop runs for `2n` iterations. Any index still in the stack after the full `2n` iterations genuinely has no next-greater element anywhere in the circular array.

## 8. Dry Run

Input: `[1, 2, 1]` (n = 3).

| i | i % n | value | stack before | operation | stack after | resolved |
|---|---|---|---|---|---|---|
| 0 (lap 1) | 0 | 1 | `[]` | push (i<n) | `[0(1)]` | — |
| 1 (lap 1) | 1 | 2 | `[0(1)]` | `1<2`→pop, resolved; push | `[1(2)]` | idx0 → 2 |
| 2 (lap 1) | 2 | 1 | `[1(2)]` | `2` not `<1`; push (i<n) | `[1(2),2(1)]` | — |
| 3 (lap 2) | 0 | 1 | `[1(2),2(1)]` | `1` not `<1`; i≥n → don't push | `[1(2),2(1)]` | — |
| 4 (lap 2) | 1 | 2 | `[1(2),2(1)]` | `1<2`→pop, resolved; `2` not `<2`; i≥n → don't push | `[1(2)]` | idx2 → 2 |
| 5 (lap 2) | 2 | 1 | `[1(2)]` | `2` not `<1`; i≥n → don't push | `[1(2)]` | — |
| end | — | — | `[1(2)]` | leftover → -1 | — | idx1 → -1 |

Result: **`[2, -1, 2]`**.

## 9. Why Does It Work?

The second lap does not need to push anything new because every *position* in the array already got its one authoritative push during the first lap — the second lap's only job is to let elements still stuck in the stack (i.e., still unresolved after seeing the whole array once) check against the *beginning* of the array too, exactly simulating "what if the array kept going instead of stopping." Since we never push the same position twice, the stack's total size is bounded by `n`, and the correctness argument from Problem 15 (nearest-beater reasoning) carries over unchanged — the only difference is that "to the right" now includes wrapped-around territory.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

class Solution {
    public int[] nextGreaterElementsCircular(int[] arr) {
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
}
```

## 11. Complexity

**Time:** O(n) — the loop runs `2n` times (still O(n)), and the push/pop bound is unchanged from Problem 15 (each of the `n` real indices is still pushed at most once and popped at most once, ever).
**Space:** O(n).

## 12. Edge Cases

- All elements equal (every answer is `-1` — nothing is *strictly* greater anywhere, even wrapping).
- Single element (`-1`, trivially — nothing to its right, wrapped or not).
- Strictly decreasing with the max at the very end wrapping to resolve everything (like `[5,4,3,2,1]` → `[-1,5,5,5,5]` — the maximum, sitting at the *end*, becomes everyone's answer once the second lap reaches it).
- Array where the maximum sits at the very end — worth tracing by hand, since it is the case that most directly exercises the wraparound.

## 13. Common Mistakes

- **Pushing on every iteration of both laps** (instead of only during `i < n`) — this wastes work and is an easy way to introduce a subtle bug (for example, double-writing a result). Simplest and safest: push only once per real index, during lap 1.
- **Looping only `n` times instead of `2n`** — this is just Problem 15 with extra steps; it never actually looks at the wrapped-around portion, silently producing the *non-circular* answer instead.
- Forgetting that `arr[stack.peek()]` must be read via the **stored index**, not `arr[idx]` a second time by mistake — the stored index refers to the *original* first-lap position, which is what needs its answer written.

## 14. Pattern to Remember

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

## 15. Interview Trigger

> The instant I see "circular" attached to a next-greater/next-smaller question, I think: Problem 15's algorithm, unchanged, just run for `2n` iterations instead of `n`, reading through `arr[i % n]` — and I only push a given real index once, during the first lap, since the second lap exists purely to give leftovers a chance to wrap around, not to introduce new positions.

## Related Problems

- [01-Next-Greater-Element.md](01-Next-Greater-Element.md) — the base problem this extends with one extra lap.
- [03-Next-Smaller-Element.md](03-Next-Smaller-Element.md) — flip the comparison for the circular smaller variant.
- [04-Number-Of-Greater-Elements-To-The-Right.md](04-Number-Of-Greater-Elements-To-The-Right.md) — the counting sibling that needs a different tool.

## See also

- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — another monotonic-stack boundary problem.
- [01-Trapping-Rain-Water.md](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md) — a decreasing stack that resolves elements when a boundary arrives.
