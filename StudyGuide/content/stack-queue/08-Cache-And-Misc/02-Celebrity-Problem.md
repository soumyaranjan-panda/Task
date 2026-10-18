# 28. Celebrity Problem

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/celebrity-problem) · [Article](https://takeuforward.org/data-structure/celebrity-problem) · [Video](https://youtu.be/cEadsbTeze4?si=olXYfOs7l-SEn2zl) — **LeetCode:** [Problem](https://leetcode.com/accounts/login/?next=/problems/find-the-celebrity/)

## 1. Problem Understanding

There are `n` people at a party, indexed `0` to `n - 1`. A **celebrity** is a person who:

- is known by **everyone** (including indirectly, by all `n - 1` other people), and
- knows **nobody** (knows none of the other `n - 1` people).

We are given a way to ask whether person `a` knows person `b`. Two common representations:

- `knows(a, b)` returning a boolean (the LeetCode API), or
- a matrix `knows[a][b] == 1` meaning `a` knows `b` (the TUF version).

We must return the celebrity's index, or `-1` if there is none. The target is `O(n)` queries; a naive check of every person against everyone is `O(n^2)`.

Note: many definitions allow a person to "know themselves"; the matrix diagonal is irrelevant to the answer and must not affect it.

## 2. How to Think About the Problem

Start with everyone as a candidate. Take any two candidates `a` and `b` and ask one question: does `a` know `b`?

- If `a` knows `b`, then `a` cannot be the celebrity (a celebrity knows nobody). Eliminate `a`; keep `b`.
- If `a` does not know `b`, then `b` cannot be the celebrity (a celebrity is known by everyone). Eliminate `b`; keep `a`.

Either way, **one question eliminates exactly one person**. After `n - 1` such questions only one candidate remains. This is **candidate elimination**.

The candidate that survives the elimination is the only person who could possibly be the celebrity. But elimination only guarantees that the celebrity (if one exists) survives — it does not prove the survivor is a celebrity. So a final **verification** pass checks the survivor against everyone: the survivor must know nobody and be known by all.

Why is the survivor guaranteed correct if a celebrity exists? Because the true celebrity can never be eliminated: it is never the one who "knows" in a pair (it knows nobody), and it is always the one who is known. So every question keeps it.

## 3. Pattern Recognition

**Clue:** find one special person/item satisfying two strong global conditions.

**Pattern:** pairwise elimination to isolate a single candidate, followed by verification.

| Signal | This problem |
|---|---|
| One special element with global properties | Reduce candidates before checking |
| A single pairwise comparison proves one candidate impossible | Eliminate one per question |
| Elimination leaves one candidate | Verify only that one |
| `O(n^2)` checks feel wasteful | `O(n)` elimination + `O(n)` verification |

The elimination is often implemented with a **stack** (push all, compare the top two each round), but the same logic works with two pointers, which uses `O(1)` extra space.

## 4. Brute Force

For each person `c`, check that `c` knows nobody (`knows[c][i] == 0` for all `i != c`) and is known by everyone (`knows[i][c] == 1` for all `i != c`). The first person passing is the celebrity.

```java
class BruteForce {
    public int findCelebrity(int n, int[][] knows) {
        for (int c = 0; c < n; c++) {
            boolean ok = true;
            for (int i = 0; i < n && ok; i++) {
                if (i == c) continue;
                if (knows[c][i] == 1 || knows[i][c] == 0) {
                    ok = false;
                }
            }
            if (ok) return c;
        }
        return -1;
    }
}
```

This is `O(n^2)` relationship checks and `O(1)` extra space.

## 5. Observation

You do not need to fully verify a person before moving on. A single question about a pair can prove one of them impossible as a celebrity, so you can shrink the candidate set first and verify only at the end.

**Figure 1 —** pairwise elimination.

```text
candidates:   0    1    2    3   ...   n-1
              a                         b
ask knows(a, b):
    true  -> a knows b  -> a is OUT, keep b
    false -> a !knows b -> b is OUT, keep a

exactly one person eliminated per question
n-1 questions  ->  one candidate survives
```

Because every question kills exactly one candidate, only `n - 1` questions are needed to get from `n` candidates to one.

## 6. Optimal Approach

**Stack version:**

1. Push all indices `0..n-1` onto a stack.
2. While the stack has more than one element:
   - Pop `a`, then pop `b`.
   - If `a` knows `b`, push `b` back (eliminate `a`); otherwise push `a` back (eliminate `b`).
3. The last remaining element is the candidate.
4. Verify the candidate against all others: for every `i != candidate`, require `knows[candidate][i] == 0` and `knows[i][candidate] == 1`. If any check fails, return `-1`; otherwise return the candidate.

**Two-pointer version (no extra space):**

Keep a single `candidate = 0`. For `i = 1..n-1`, if `candidate` knows `i`, then `candidate` cannot be the celebrity, so set `candidate = i`. Otherwise `i` cannot be the celebrity and `candidate` stays. Then verify `candidate` against everyone.

## 7. Invariant

> **Invariant:** Every element in the stack (or the single pointer candidate) has not yet been proven impossible to be the celebrity. Each elimination removes exactly one person who cannot be the celebrity, and the true celebrity, if it exists, always survives every elimination.

## 8. Dry Run

`n = 3`, with the matrix below (`1` = row person knows column person).

```text
        knows 0  1  2
  person 0 [   0  1  1 ]
  person 1 [   0  0  1 ]
  person 2 [   0  0  0 ]
```

Person `2` knows nobody (`row 2` is all zeros) and is known by `0` and `1` (column 2 is all ones), so the answer is `2`.

Stack trace (top of stack shown leftmost):

| step | stack (top→bottom) | action | eliminated |
|------|--------------------|--------|------------|
| init | `[2,1,0]` | push 0,1,2 | — |
| 1 | `[2,0]` | pop `a=2`, pop `b=1`; `knows[2][1]=0` so push `2` | 1 |
| 2 | `[2]` | pop `a=0`, pop `b=2`; `knows[0][2]=1` so push `2` | 0 |
| 3 | `[2]` | one candidate left | — |

Verification of candidate `2`:

| other `i` | `knows[2][i]` must be 0 | `knows[i][2]` must be 1 | pass |
|-----------|-------------------------|--------------------------|------|
| 0 | `knows[2][0]=0` | `knows[0][2]=1` | yes |
| 1 | `knows[2][1]=0` | `knows[1][2]=1` | yes |

All checks pass; return `2`.

**Figure 2 —** final verification.

```text
candidate c:
  for each other person p:
      knows[c][p] == 0   (c knows nobody)
      knows[p][c] == 1   (everyone knows c)
  if any fails -> no celebrity -> -1
```

## 9. Why Does It Work?

Each comparison eliminates one person using a fact about the celebrity definition:

- If `a` knows `b`, then `a` knows at least one person, so `a` is not the celebrity. `b` is retained because it might still be.
- If `a` does not know `b`, then `b` is not known by everyone (at least `a` does not know `b`), so `b` is not the celebrity. `a` is retained.

So exactly one of the two is definitively excluded, and the other remains possible. Since the true celebrity, if any, is never the excluded one, it survives all eliminations. After `n - 1` questions only one candidate remains. If a celebrity exists, it must be this candidate, so a single verification pass is enough to confirm or reject it. If verification fails, no celebrity exists.

## 10. Java Code

Stack version:

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int findCelebrity(int n, int[][] knows) {
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            stack.push(i);
        }

        while (stack.size() > 1) {
            int a = stack.pop();
            int b = stack.pop();

            if (knows[a][b] == 1) {
                stack.push(b);
            } else {
                stack.push(a);
            }
        }

        int candidate = stack.pop();

        for (int i = 0; i < n; i++) {
            if (i == candidate) continue;

            if (knows[candidate][i] == 1 || knows[i][candidate] == 0) {
                return -1;
            }
        }

        return candidate;
    }
}
```

Two-pointer version, `O(1)` extra space:

```java
class Solution {
    public int findCelebrity(int n, int[][] knows) {
        int candidate = 0;

        for (int i = 1; i < n; i++) {
            if (knows[candidate][i] == 1) {
                candidate = i;
            }
        }

        for (int i = 0; i < n; i++) {
            if (i == candidate) continue;

            if (knows[candidate][i] == 1 || knows[i][candidate] == 0) {
                return -1;
            }
        }

        return candidate;
    }
}
```

With the LeetCode `boolean knows(int a, int b)` API, replace `knows[a][b] == 1` with `knows(a, b)` and `knows[i][candidate] == 0` with `!knows(i, candidate)`.

## 11. Complexity

| Resource | Cost | Why |
|---|---|---|
| Time | O(n) | `n - 1` comparisons to isolate plus `O(n)` to verify |
| Space | O(n) with stack, O(1) with two pointers | The stack holds candidates; pointers need none |

The number of relationship checks is at most `(n - 1) + 2n = O(n)`, far better than the `O(n^2)` brute force.

## 12. Edge Cases

- **`n = 1`**: the single person is trivially the celebrity; elimination loop does not run, verification skips the only person, return `0`.
- **No celebrity**: elimination still yields a candidate; verification fails and returns `-1`. Example: two people who know each other — neither can qualify.
- **Multiple apparent candidates**: elimination collapses to one; verification rejects it if it fails either condition.
- **Self-knowledge on the diagonal**: ignored by both loops (`i == candidate` skipped); it must not influence the result.
- **All zeros matrix** (everyone knows nobody): the candidate is the last index, but not everyone knows it, so verification returns `-1`.
- **All ones matrix** (everyone knows everyone): everyone knows someone, so no celebrity; verification returns `-1`.

## 13. Common Mistakes

1. **Forgetting final verification.** Elimination only finds the only possible candidate; it does not prove the candidate is valid.
2. **Assuming the last candidate is automatically the celebrity.** No celebrity means the candidate must be rejected.
3. **Reversing the elimination rule.** `knows(a,b) == 1` eliminates `a`, not `b`; mixing this up returns wrong answers.
4. **Letting the diagonal affect verification.** Do not require `knows[c][c] == 0` or `knows[c][c] == 1`; skip `i == candidate`.
5. **Using `O(n^2)` verification inside the loop.** Verify once, after isolation.
6. **Off-by-one in the two-pointer start.** Start the candidate at `0` and scan `i` from `1`.

## 14. Pattern to Remember

```text
**Problem clue:** find the person everyone knows, who knows nobody.
**Pattern:** candidate elimination — each `knows(a,b)` answer eliminates exactly one person.
**Data structure:** stack of candidates (or two pointers).
**What the stack stores:** people who may still be the celebrity.
**When to push:** the survivor of each pairwise comparison.
**When to pop:** the person proven impossible.
**Invariant:** the celebrity (if one exists) always survives every elimination.
**Key insight:** `knows(a,b)` being true kills `a`; being false kills `b` — one dead person per question -> only O(n) questions.
**Time:** O(n) to isolate, O(n) to verify (using the knows matrix).
**Space:** O(n) stack, or O(1) with two pointers.
```

**Find one special candidate -> eliminate impossible candidates -> verify the survivor.**

## 15. Interview Trigger

> When a problem asks for one person/item satisfying strong global conditions, ask whether a pairwise comparison can prove one candidate impossible. If yes, candidate elimination may reduce O(n^2) to O(n).

## Related Problems

- [27. Stock Span](01-Stock-Span.md) — elimination while scanning a stream.
- [29. LRU Cache](03-LRU-Cache.md) — design problem with a candidate/order structure.
- [30. LFU Cache](04-LFU-Cache.md) — layered bookkeeping design.
- [Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — monotonic candidate elimination.
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — the canonical "one answer per question" elimination.

## See also

- [Next Smaller Element](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md)
- [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md)
- [Sliding Window Maximum](../07-Histogram-And-Deque/03-Sliding-Window-Maximum.md)
