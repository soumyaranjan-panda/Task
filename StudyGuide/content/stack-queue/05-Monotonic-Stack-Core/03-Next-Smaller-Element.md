# 17. Next Smaller Element

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/next-smaller-element) · [Article](https://takeuforward.org/data-structure/next-smaller-element) — **LeetCode:** none

## 1. Problem Understanding

For every element, find the first element to its **right** that is strictly **smaller**. `-1` if none exists.

Example: `[4, 5, 2, 10, 8]` → `[2, 2, -1, 8, -1]`.

## 2. How to Think About the Problem

This is Problem 15 with every "greater" swapped for "smaller." **Nothing else changes conceptually** — it is worth deriving once explicitly so the mirror-image relationship is concrete rather than just asserted.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`next SMALLER element to the right` → `elements now wait to be beaten by something SMALLER` → `Monotonic Stack (increasing)` → `stack of indices, values increasing bottom→top` → `pop while the top is bigger than the current element`.

**Why does the stack direction flip?** In Problem 15, the stack held elements "not yet beaten by something bigger" — which meant everything in the stack, read bottom to top, had to be in *decreasing* order (otherwise a smaller one sitting above a bigger one would already have been beaten by the bigger one below it, contradiction). Here, the stack holds elements "not yet beaten by something smaller" — so by the identical logic, mirrored, it must be *increasing* bottom to top.

## 3. Pattern Recognition

**Problem clue:** "next smaller element."
**Pattern:** Monotonic Stack (increasing) — the direct mirror of Problem 15.
**Mental model:** same as Problem 15, "answer not found yet," with every comparison flipped.
**Similar problems:** Problem 15 (mirror); this exact "increasing stack" also appears inside Largest Rectangle in Histogram and Sum of Subarray Minimums — both lean on "next smaller" / "previous smaller" as a sub-step.

## 4. Brute Force

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

## 5. Observation

Same as Problem 15's observation, mirrored: once an element is beaten by something *smaller*, it can never be anyone's "next smaller" again, since whatever beat it is now a strictly better (smaller, and just as close or closer) candidate.

```text
NGE (Problem 15):  pop top while  top <  current   -> decreasing stack
NSE (this):        pop top while  top >  current   -> increasing stack

The inequality you pop on determines the stack's order.
```

**Figure 1 —** Next-greater and next-smaller differ only in the comparison.

## 6. Optimal Approach

Scan left to right with an increasing stack of indices. For each `arr[i]`: while the stack is not empty and the top's value is *bigger* than `arr[i]`, pop — that index's answer is `arr[i]`. Then push `i`.

## 7. Invariant

> **Invariant:** The stack (bottom→top) always holds indices with strictly increasing values, and every index in it has not yet found an element smaller than itself, among everything processed so far.

## 8. Dry Run

Input: `[4, 5, 2, 10, 8]`.

| i | arr[i] | stack before (values) | operation | stack after (values) | resolved |
|---|---|---|---|---|---|
| 0 | 4 | `[]` | push | `[4]` | — |
| 1 | 5 | `[4]` | `4` not `>5`; push | `[4,5]` | — |
| 2 | 2 | `[4,5]` | `5>2`→pop, resolved; `4>2`→pop, resolved; push | `[2]` | idx1→2, idx0→2 |
| 3 | 10 | `[2]` | `2` not `>10`; push | `[2,10]` | — |
| 4 | 8 | `[2,10]` | `10>8`→pop, resolved; `2` not `>8`; push | `[2,8]` | idx3→8 |
| end | — | `[2,8]` | leftovers → -1 | — | idx2,4 → -1 |

Result: **`[2, 2, -1, 8, -1]`**.

## 9. Why Does It Work?

Exactly Problem 15's correctness argument, mirrored: when index `k` gets popped by index `i`, every index strictly between them has already been fully processed and, by the invariant, none of them beat `k` (or it would already have been popped by then) — so `arr[i]` is provably the *nearest* smaller element, not just *a* smaller one.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

class Solution {
    public int[] nextSmallerElement(int[] arr) {
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
}
```

## 11. Complexity

**Time:** O(n), identical amortized argument to Problem 15. **Space:** O(n) worst case (strictly increasing input).

## 12. Edge Cases

Mirror of Problem 15's: strictly decreasing input resolves almost immediately; strictly increasing input is the worst case (nothing resolves, `O(n)` space); duplicates need strict `>` for the same reason Problem 15 needed strict `<`.

## 13. Common Mistakes

- **Using `>=` instead of `>`** — same duplicate-handling trap as Problem 15, mirrored.
- **Copy-pasting Problem 15's code and only flipping the comparison operator, but forgetting the stack's *storage order* concept also flips** (decreasing → increasing) — the code change is genuinely just the one operator, but make sure you can *say why* out loud, not just pattern-match the edit.
- Mixing up "next smaller" with "previous smaller" (different scan direction).

## 14. Pattern to Remember

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

## 15. Interview Trigger

> "Next smaller element" is Problem 15 with the comparison flipped: I keep an *increasing* stack of indices, popping whenever the current element is smaller than what is waiting — because once beaten by something smaller, an element can never be anyone's answer again.

## Related Problems

- [01-Next-Greater-Element.md](01-Next-Greater-Element.md) — the exact mirror this page is derived from.
- [02-Next-Greater-Element-II-Circular.md](02-Next-Greater-Element-II-Circular.md) — same flip applies to the circular variant.
- [04-Number-Of-Greater-Elements-To-The-Right.md](04-Number-Of-Greater-Elements-To-The-Right.md) — nearest vs. count, the boundary of this pattern.

## See also

- [02-Sum-Of-Subarray-Minimums.md](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md) — uses previous/next smaller boundaries.
- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — the canonical increasing-stack boundary problem.
