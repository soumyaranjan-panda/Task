# 23. Remove K Digits

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/remove-k-digits) · [Article](https://takeuforward.org/data-structure/remove-k-digits) · [Video](https://youtu.be/jmbuRzYPGrg?si=WN387gwQ7aXWkUao) — **LeetCode:** [Problem](https://leetcode.com/problems/remove-k-digits/)

## 1. Problem Understanding

Given a non-negative integer as a string and an integer `k`, remove exactly `k` digits so the remaining digits (order preserved) form the **smallest possible** number. Leading zeros are removed from the result; the empty result is `"0"`.

- **Input:** `num` (string of digits), `k`.
- **Output:** the smallest number string after removing exactly `k` digits.
- **Key fact:** an earlier digit dominates the magnitude of the number far more than any later digit, so deletions should target earlier digits whenever possible.

Example: `"1432219"`, `k = 3` → `"1219"`.

## 2. How to Think About the Problem

**What should I notice first?** To minimize a number, the most significant (leftmost) digits matter most. A digit is "hurting" the number if a smaller digit appears somewhere to its right and we still have deletions to spend.

**What would I try first?** Try every choice of `k` positions to delete, keep the smallest result. That is `C(n, k)` — combinatorial explosion.

**Why is that too slow?** The number of deletion subsets is astronomical, and correct greedy structure is buried in the comparison of adjacent digits.

**What observation unlocks the better solution?** Whenever we see a drop — a current digit smaller than the previous kept digit — deleting that previous digit strictly improves the prefix, and the earlier a digit is, the more it improves the number. So every time the current digit is smaller than the top of our kept-digits stack, we should pop the top and spend one deletion. This is exactly "current element resolves/removes previous element," the monotonic-stack shape.

## 3. Pattern Recognition

**Problem clue:** remove `k` elements while preserving order to minimize the lexicographic/numeric result.
**Pattern:** Greedy monotonic stack (increasing order).
**Why this pattern:** the kept digits should be non-decreasing; any adjacent descent is a candidate deletion, and a smaller current digit makes every larger digit immediately before it useless.
**Mental model:** *"keep a stack of chosen digits that is as increasing as possible; each descent lets you delete a larger digit."*
**Similar problems:** Next Greater Element (a bigger current value resolves waiting smaller ones — here a smaller current value resolves waiting bigger ones); Asteroid Collision (a new element can eliminate previous ones).

## 4. Brute Force

Enumerate every combination of `k` deletions, take the smallest surviving number.

```java
String removeKdigitsBrute(String num, int k) {
    int n = num.length();
    if (k == n) return "0";
    String best = null;
    // choose which k indices to delete: iterate all bitmasks of kept positions
    for (int keep = 0; keep < (1 << n); keep++) {
        if (Integer.bitCount(keep) != n - k) continue;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            if ((keep & (1 << i)) != 0) sb.append(num.charAt(i));
        }
        String candidate = trimLeadingZeros(sb.toString());
        if (best == null || candidate.compareTo(best) < 0) best = candidate;
    }
    return best;
}

private String trimLeadingZeros(String s) {
    int i = 0;
    while (i < s.length() - 1 && s.charAt(i) == '0') i++;
    return s.substring(i);
}
```

**Why is this too slow?** It examines `2^n` subsets (or `C(n, k)`), exponential in `n`, and discards the greedy structure that makes a linear scan sufficient.

## 5. Observation

Compare adjacent digits. If `prev > current`, then `prev` is a larger, more significant digit than `current`, so replacing the `prev` prefix with the `current` prefix yields a strictly smaller number. Spending a deletion on `prev` is therefore always at least as good as saving it for a later digit.

```text
"1432219", k = 3

  keep digits, popping a larger top when a smaller digit arrives:

   1  ->  4   ->  (3 arrives) pop 4  ->  1 3
                  (2 arrives) pop 3  ->  1 2
                  2, 1 -> (1 arrives) pop 2  ->  1 2 1
                  9

  result prefix "1219"
```

**Figure 1 —** Each descent removes a larger digit that is hurting the number.

## 6. Optimal Approach

Maintain a stack (increasing) of kept digits. For each digit `d`:

- While `k > 0`, the stack is not empty, and the top digit is greater than `d`: pop the top and decrement `k`.
- Push `d`.

After the scan, if `k` is still positive, the remaining digits are already non-decreasing, so the only deletions left that keep the result smallest are at the end: pop the last `k` digits. Then strip leading zeros; if nothing remains, return `"0"`.

## 7. Invariant

> **Invariant:** After processing the first `i` digits, the stack holds the smallest possible non-decreasing prefix obtainable from those `i` digits using the deletions already spent.

## 8. Dry Run

Input: `"1432219"`, `k = 3`. Stack shown bottom→top (the top is the digit just after the arrow's source).

| step | digit | stack before | pops (spent) | k left | stack after |
|---|---|---|---|---|---|
| 1 | `1` | `[]` | none | 3 | `[1]` |
| 2 | `4` | `[1]` | `1>4`? no | 3 | `[1,4]` |
| 3 | `3` | `[1,4]` | `4>3` pop (1) | 2 | `[1,3]` |
| 4 | `2` | `[1,3]` | `3>2` pop (1) | 1 | `[1,2]` |
| 5 | `2` | `[1,2]` | `2>2`? no | 1 | `[1,2,2]` |
| 6 | `1` | `[1,2,2]` | `2>1` pop (1) | 0 | `[1,2,1]` |
| 7 | `9` | `[1,2,1]` | k=0, none | 0 | `[1,2,1,9]` |
| end | — | `[1,2,1,9]` | k is 0, no tail removal | 0 | `[1,2,1,9]` |

Reading bottom→top gives `"1219"`. Result: **`"1219"`**.

Tail-deletion example — `"12345"`, `k = 2`:

| step | digit | stack before | pops (spent) | k left | stack after |
|---|---|---|---|---|---|
| 1 | `1` | `[]` | none | 2 | `[1]` |
| 2 | `2` | `[1]` | `1>2`? no | 2 | `[1,2]` |
| 3 | `3` | `[1,2]` | `2>3`? no | 2 | `[1,2,3]` |
| 4 | `4` | `[1,2,3]` | `3>4`? no | 2 | `[1,2,3,4]` |
| 5 | `5` | `[1,2,3,4]` | `4>5`? no | 2 | `[1,2,3,4,5]` |
| end | — | `[1,2,3,4,5]` | no descents left; remove last 2 | 0 | `[1,2,3]` |

Result: **`"123"`** — with no descent anywhere, the leftover `k` deletions are spent from the tail (the least significant end).

## 9. Why Does It Work?

A larger digit earlier in the number outweighs any later digit, so if a smaller digit follows it, deleting the larger one produces a lexicographically smaller, and therefore numerically smaller, result. The greedy is safe because that deletion is never worse than saving it for later: the position saved is more significant than any position not yet seen. When the digits are already non-decreasing, there is no larger-earlier digit to exploit, so the only remaining deletions that preserve the smallest prefix are at the end. This is a standard exchange argument: any optimal solution can be transformed into the greedy one without increasing the result.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public String removeKdigits(String num, int k) {
        Deque<Character> stack = new ArrayDeque<>(); // kept digits, increasing, bottom -> top

        for (char digit : num.toCharArray()) {
            while (k > 0 && !stack.isEmpty() && stack.peek() > digit) {
                stack.pop();
                k--;
            }
            stack.push(digit);
        }

        // No more descents: delete remaining digits from the end (least significant).
        while (k > 0 && !stack.isEmpty()) {
            stack.pop();
            k--;
        }

        StringBuilder result = new StringBuilder();
        while (!stack.isEmpty()) {
            result.append(stack.removeLast()); // removeLast -> oldest first = correct order
        }

        // Strip leading zeros.
        while (result.length() > 1 && result.charAt(0) == '0') {
            result.deleteCharAt(0);
        }

        return result.length() == 0 ? "0" : result.toString();
    }
}
```

## 11. Complexity

**Time:** O(n) amortized — each digit is pushed once and popped at most once (whether during the main loop or the tail-removal loop), plus O(n) for building and trimming the result.
**Space:** O(n) — the stack holds at most `n` characters, and the result string is at most `n` characters.

## 12. Edge Cases

- `k == n` — every digit is removed; the stack empties; return `"0"`.
- **Leading zeros** — trim them after building the result, but keep a single `"0"` if nothing but zeros remains (for example `"10200"`, `k = 1` → `"200"`; `"10"`, `k = 2` → `"0"`).
- **Already increasing** — no pops occur; the leftover `k` is removed from the tail.
- **All the same digit** — no strict descents; deletions come from the tail.
- Result longer than `1` but composed of zeros only — return `"0"`.

## 13. Common Mistakes

- **Removing from the wrong side.** Increments (descents) consume deletions during the scan; any leftover `k` is removed from the *end* (least significant digits), not the front.
- **Forgetting the leftover `k`.** After the scan, `k` may still be positive and must be spent on the tail.
- **Mishandling leading zeros**, including returning an empty string instead of `"0"` when everything is deleted.
- Using strict `>` versus `>=` incorrectly — here `stack.peek() > digit` is correct; equal digits should be kept so the earlier, equally sized digit is not needlessly removed.
- Reading the stack in the wrong order when reconstructing the number.

## 14. Pattern to Remember

```text
Problem clue:  make the number smallest possible by deleting exactly k digits (order preserved).
Pattern:       greedy — remove a larger previous digit when a smaller one follows it.
Data structure: increasing monotonic stack of chosen digits (Deque<Character>).
What the stack stores: the digits kept so far, non-decreasing.
When to push:  every digit, after popping.
When to pop:   while k > 0 and top digit > current — the top loses to the smaller current.
Invariant:     the stack is the smallest possible prefix using the digits seen so far
               and the deletions left.
Key insight:   a smaller digit makes every larger digit immediately before it useless.
Time / Space:  O(n) amortized / O(n).
```

**Memory trick:** *"A smaller current digit can make previous larger digits obsolete — pop while you still have deletions."*

## 15. Interview Trigger

> When I am deleting a limited number of items to make the sequence smallest, I look for "remove the previous item when the current one is better." That is a greedy monotonic stack, and any leftover deletions are taken from the end.

## Related Problems

- [03-Asteroid-Collision.md](03-Asteroid-Collision.md) — a new element eliminating previous survivors, the same stack kernel.
- [02-Sum-Of-Subarray-Minimums.md](02-Sum-Of-Subarray-Minimums.md) — another greedy/boundary use of monotonic stacks.
- [../05-Monotonic-Stack-Core/01-Next-Greater-Element.md](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — the base pattern of resolving waiting elements with a new value.

## See also

- [01-Trapping-Rain-Water.md](01-Trapping-Rain-Water.md) — stack-driven valley resolution.
- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — a canonical monotonic-stack construction.
