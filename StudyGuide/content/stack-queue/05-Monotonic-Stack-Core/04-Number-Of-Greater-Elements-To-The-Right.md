# 18. Number of Greater Elements to the Right

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/number-of-greater-elements-to-the-right) · [Article](https://takeuforward.org/data-structure/number-of-nges-to-the-right) — **LeetCode:** none

## 1. Problem Understanding

For every element, count **how many** elements to its right are strictly greater than it — not just find the *nearest* one, count **all** of them.

- **Input:** array of integers.
- **Output:** array of the same length, each slot holding a count.

Example: `[5, 2, 6, 1]` → `[1, 1, 0, 0]` (5 has just `6` beating it; 2 has just `6`; 6 has nothing; 1 has nothing).

**This problem is deliberately placed here, next to the "next greater" family, to make an important point: it looks like it belongs to the same family, but it does not quite.**

## 2. How to Think About the Problem

**What should I notice first?** This is *not* asking "what is the nearest bigger element" — it is asking for a **count of every** bigger element to the right. That is a meaningfully different question.

**Would a monotonic stack solve this directly?** Try it: a monotonic stack, as used in Problems 15–17, resolves each element **once**, the instant it is beaten, and then discards it. That is exactly right when you only need the *first* beater — but here we need to know about **every** beater, and a stack-based element is popped (and forgotten) the moment the *first* one arrives. The information "how many more things after this one are *also* bigger" is not something the monotonic stack invariant tracks at all.

**So what does work?** This becomes a **counting** problem: "as I scan, how many values already seen are greater than the current one?" That is the classic shape of "count of smaller/greater elements after each element" — solved with a **Fenwick tree (Binary Indexed Tree, BIT)** over coordinate-compressed values, processing the array **right to left** and asking, for each element, "how many values inserted so far (i.e., to my right) are greater than me?" *before* inserting the current value.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`count of ALL greater elements, not just nearest` → `a monotonic stack only ever remembers the nearest unresolved candidate — it can't count` → `Counting problem, not a "next X" problem` → `Fenwick Tree (BIT) with coordinate compression` → `scan right to left; for each value, query "how many already-inserted values are strictly greater," then insert`.

## 3. Pattern Recognition

**Problem clue:** "number/count of greater (or smaller) elements to the right/left," for every element.
**Pattern:** **Not** a monotonic-stack pattern — a Fenwick Tree (BIT) counting pattern.
**Why a stack fails here:** a stack answers "what/where is the nearest one," by permanently discarding elements once they are beaten. Counting needs to know about *every* beater, not just the first — information a stack throws away by design.
**Mental model:** process right to left; a Fenwick tree lets you ask "how many numbers smaller-or-equal to X have I seen so far" in O(log n), so "how many are greater" is just `(total seen) − (that answer)`.
**Similar problems:** "Count of Smaller Numbers After Self" is the mirror (flip the comparison, same technique). Not closely related to Problems 15–17 despite the surface-level similar wording — that is exactly the trap this problem is here to teach you to notice.
**Recognizing this elsewhere:** if a problem says "count of \_\_\_ elements" (plural, an aggregate) rather than "the next/previous \_\_\_ element" (singular, a nearest match), that is your signal this is a counting/BIT problem, not a monotonic-stack one.

## 4. Brute Force

```java
int[] countGreaterToRightBrute(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    for (int i = 0; i < n; i++) {
        int count = 0;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] > arr[i]) count++;
        }
        result[i] = count;
    }
    return result;
}
```

**Why is this too slow?** For every one of the `n` elements, we scan all remaining elements to its right — classic O(n²), and unlike Problems 15–17, there is no "discard forever" shortcut available here, because we are not looking for a nearest match to stop at — we deliberately need to examine *every* remaining element to get an accurate count. The repeated work is "the same underlying question — how does this value compare against a large, slowly-shrinking pool — asked freshly, one comparison at a time, for every single pair."

## 5. Observation

The real question buried in "how many elements already seen are greater than X" is a **counting-by-value-range** question, and that is exactly what a Fenwick tree is built for: it lets you maintain a frequency table over values (compressed to ranks, since raw values might be large or sparse) and answer "how many inserted values are ≤ some threshold" in O(log n), instead of O(n) per query.

```text
Brute force (recount from scratch for every element)
     ↓
Repeated work: re-scanning largely-overlapping suffixes, over and over
     ↓
Observation: a running "how many seen so far are greater than X"
             is exactly what a frequency-counting structure answers fast
     ↓
Data structure: Fenwick Tree (BIT) over compressed values
     ↓
Optimized: O(n log n), one right-to-left pass
```

**Figure 1 —** From suffix re-scans to a Fenwick tree over value ranks.

## 6. Optimal Approach

1. **Coordinate-compress** the array's values: sort the distinct values, and assign each one a rank (`1` = smallest, `2` = next, …).
2. Build a Fenwick tree sized to the number of distinct values, supporting: `update(rank, +1)` (record one more occurrence of this value) and `query(rank)` (count of all inserted values with rank ≤ this one, i.e., **≤** the given value).
3. Scan the array **right to left**, keeping a running `totalInserted` count. For each `arr[i]`: `countGreater = totalInserted − query(rank(arr[i]))` (everything inserted so far, minus everything that was ≤ `arr[i]`, leaves exactly what is *strictly* greater); this is `result[i]`. Then insert `arr[i]` into the tree and increment `totalInserted`.

## 7. Invariant

> **Invariant:** At the moment `arr[i]` is processed, the Fenwick tree contains exactly the frequency counts of every element with index `> i` (i.e., everything to `arr[i]`'s right that has already been processed, since we are moving right to left) — no more, no less.

## 8. Dry Run

Input: `[5, 2, 6, 1]`.

Distinct sorted values: `1, 2, 5, 6` → ranks `1→1, 2→2, 5→3, 6→4`.

| i (right→left) | value | rank | query(rank) (≤ this value, so far) | totalInserted so far | result[i] = total − query | after: insert |
|---|---|---|---|---|---|---|
| 3 | 1 | 1 | 0 | 0 | **0** | rank 1 (+1) |
| 2 | 6 | 4 | 1 *(the `1` already inserted)* | 1 | **0** | rank 4 (+1) |
| 1 | 2 | 2 | 1 *(the `1`, rank 1 ≤ 2)* | 2 | **1** | rank 2 (+1) |
| 0 | 5 | 3 | 2 *(the `1` and `2`, both ≤ 5)* | 3 | **1** | rank 3 (+1) |

Result: **`[1, 1, 0, 0]`**.

```text
Right-to-left sweep over [5, 2, 6, 1]   ("seen" = everything to my right)

  seen: {}          seen: {1}        seen: {1,6}      seen: {1,2,6}
   i=3 val 1         i=2 val 6        i=1 val 2        i=0 val 5
   >1 ? 0            >6 ? 0           >2 ? 1           >5 ? 1
   insert 1          insert 6         insert 2         insert 5
```

**Figure 2 —** Each step asks "how many already-inserted values beat me?"

## 9. Why Does It Work?

Because we insert elements right to left, at the moment we query for `arr[i]`, the tree contains *exactly* — no more, no less — the elements to `arr[i]`'s right (the invariant above). `query(rank(arr[i]))` counts everything inserted so far with value ≤ `arr[i]` — which, subtracted from the total inserted, leaves precisely the count of elements strictly greater. Coordinate compression does not lose any comparison information — it only needs to preserve *relative order*, which sorting-then-ranking does exactly, so all comparisons (`≤`, `>`) come out identical to using the raw values.

## 10. Java Code

```java
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

class BIT { // Fenwick Tree — 1-indexed
    private final int[] tree;
    private final int n;

    BIT(int n) {
        this.n = n;
        this.tree = new int[n + 1];
    }

    void update(int i, int delta) {
        for (; i <= n; i += i & (-i)) tree[i] += delta;
    }

    int query(int i) { // prefix sum [1..i]
        int sum = 0;
        for (; i > 0; i -= i & (-i)) sum += tree[i];
        return sum;
    }
}

class Solution {
    public int[] countGreaterToRight(int[] arr) {
        int n = arr.length;
        int[] sorted = arr.clone();
        Arrays.sort(sorted);

        int m = 0;
        int[] distinct = new int[n];
        for (int i = 0; i < n; i++) {
            if (i == 0 || sorted[i] != sorted[i - 1]) distinct[m++] = sorted[i];
        }

        Map<Integer, Integer> rank = new HashMap<>();
        for (int i = 0; i < m; i++) rank.put(distinct[i], i + 1); // 1-indexed rank

        BIT bit = new BIT(m);
        int[] result = new int[n];
        int totalInserted = 0;

        for (int i = n - 1; i >= 0; i--) {
            int r = rank.get(arr[i]);
            int countLessOrEqual = bit.query(r);
            result[i] = totalInserted - countLessOrEqual;
            bit.update(r, 1);
            totalInserted++;
        }
        return result;
    }
}
```

## 11. Complexity

**Time:** O(n log n) — sorting for coordinate compression is O(n log n); the right-to-left scan does one `query` and one `update` per element, each O(log n), for O(n log n) total.
**Space:** O(n) for the Fenwick tree, rank map, and result array.

## 12. Edge Cases

- All elements equal — every count is `0` (nothing is *strictly* greater than an equal value).
- Strictly increasing input — `result[i]` counts down `n-1, n-2, ..., 1, 0`.
- Strictly decreasing input — every count is `0`.
- Single element — `[0]`.
- Large value ranges with few distinct values — coordinate compression handles this gracefully (the tree is sized to *distinct* values, not the raw value range).

## 13. Common Mistakes

- **Reaching for a monotonic stack out of habit**, because the problem sits next to "next greater" family problems and shares vocabulary — the stack silently gives you *whether* something is beaten and by what, never *how many times*. If you find yourself trying to make a stack "remember a count," that is the signal you are forcing the wrong tool onto this problem.
- **Using `query(rank − 1)` instead of `query(rank)`** when trying to count strictly-greater elements directly (rather than the total-minus-≤ approach shown here) — off-by-one errors here are common; the total-minus-≤-count framing above sidesteps this by always computing a clean "≤" prefix sum and subtracting.
- Forgetting coordinate compression entirely and sizing the Fenwick tree to the raw value range — wastes memory, and breaks entirely if values can be negative or very large (BIT indices must be positive).
- Off-by-one in the BIT's own `update`/`query` loops (`i & (-i)` bit-manipulation) — copy the template exactly rather than trying to rederive it under pressure.

## 14. Pattern to Remember

```text
Problem clue:  COUNT of greater/smaller elements to the right/left (plural, aggregate)
Pattern:       Fenwick Tree (BIT) + coordinate compression — NOT monotonic stack
Data structure: BIT sized to the number of distinct values
Stores:        running frequency counts of values seen so far
Scan direction: right to left (so "seen so far" = "to my right")
Per element:   result = totalInserted - query(rank(value)); then insert
Invariant:     at each step, the BIT holds exactly the frequencies of elements to the right
Key insight:   monotonic stack answers "nearest match"; this needs "count of ALL matches" —
               different questions, different tools
Time / Space:  O(n log n) / O(n)
```

**Memory trick:** *"Next X is a stack question. Count of X is a Fenwick-tree question. Do not let similar wording fool you."*

## 15. Interview Trigger

> If a problem asks for a **count** of greater/smaller elements (not the nearest one), I immediately flag that a monotonic stack is the wrong tool — it discards elements after their first match, which throws away exactly the information counting needs. I reach for a Fenwick tree over coordinate-compressed values instead, scanning in the direction that makes "already inserted" mean "already seen on the relevant side."

## Related Problems

- [01-Next-Greater-Element.md](01-Next-Greater-Element.md) — the "nearest" sibling; same vocabulary, different question.
- [03-Next-Smaller-Element.md](03-Next-Smaller-Element.md) — flip every comparison for the "count smaller" mirror.
- [02-Next-Greater-Element-II-Circular.md](02-Next-Greater-Element-II-Circular.md) — another extension of the same base problem.

## See also

- [02-Sum-Of-Subarray-Minimums.md](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md) — counting each element's contribution with monotonic stacks.
- [04-Sum-Of-Subarray-Ranges.md](../06-Boundary-And-Contribution/04-Sum-Of-Subarray-Ranges.md) — the same contribution idea applied twice.
