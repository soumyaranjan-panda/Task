# Binary Search — 31 Problems Study Guide (Java)

A complete personal walkthrough of 31 DSA problems, all solved with Binary Search
thinking. This is not a list of code snippets. It is a guide that teaches *how to
think*: what to observe, which pattern the problem belongs to, and how to derive
the solution instead of memorizing it.

Every problem follows the same structure:

1. Problem Understanding
2. How to Think About the Problem
3. Intuition (Brute → Observation → Optimization)
4. Solutions (Brute Force / Better / Optimal)
5. Dry Run
6. Complexity Calculation
7. Pattern to Remember + Similar Problems

---

## 0. The Foundation: Binary Search in One Page

Before touching any problem, understand the core idea deeply. Everything else in
this guide is a variation of this one page.

### What binary search actually is

Binary search is a way to *search a monotonically ordered space by repeatedly
discarding half of it*. The reason it works is that after one comparison you can
be **100% sure** which half the answer cannot be in.

Two things are always needed:

1. **A search space** (a range of indices, or a range of possible answers).
2. **A monotonic property** — the ability to say "if it works at X, it works on
   one whole side of X" (or "if X is too big, everything bigger is too big").

### The two-loop template problem

New learners memorize `while (low <= high)` or `while (low < high)` and get the
off-by-one wrong. Instead, think in terms of what you are looking for:

| What you want | Loop style | Example |
|---|---|---|
| An exact element / exact index | `while (low <= high)`, return the found index | Search for target |
| A boundary index (first/last, lower/upper bound, insert position, single element, peak) | `while (low < high)`, loop collapses to the answer | Lower bound, peak |
| An answer value inside a continuous band | `while (low <= high)` + track `ans` | Sqrt, BS-on-answer |

### The universal skeleton

```
low = 0, high = n - 1
while (low <= high) {
    mid = low + (high - low) / 2   // safe mid: avoids overflow
    if (condition on mid) {
        record/decide
        high = mid - 1   // or low = mid + 1
    } else {
        low = mid + 1    // or high = mid - 1
    }
}
```

`low + (high - low) / 2` instead of `(low + high) / 2` avoids integer overflow
when `low + high` exceeds `int` range. This matters in Java.

### The invariant habit — the single most important skill

For every binary search you write, ask yourself:

> "After I move low/high, what do I **know for sure**?"

That sentence IS the invariant. State it out loud before writing the loop.

Example for lower bound (first index where `arr[i] >= x`):

- Everything to the left of `low` is `< x`.
- Everything to the right of `high` is `>= x`.
- When `low == high`, the invariant forces that index to be the first `>= x`.

Once you can state the invariant, you never get confused about return values.

### What the 6 patterns mean (overview)

| Pattern | Signature clue | Mental model |
|---|---|---|
| 1. Find exact element | "Is X present?" in sorted array | compare with mid, eliminate half |
| 2. Find boundary | "first/last", "insert position", "lower/upper bound" | search for the crossing point |
| 3. Rotated sorted array | "rotated", "how many times rotated", "minimum" | one half is always sorted |
| 4. Binary search on answer | "minimum possible / maximum possible / minimum days / capacity" | answer in a range + feasibility check |
| 5. Partition binary search | "kth element of two sorted arrays" | split at k, compare around the cut |
| 6. Matrix binary search | "2D matrix", "matrix median", "peak in matrix" | flatten, staircase walk, or column elimination |

You will see each pattern again, many times, in the 31 problems. There are only a
handful of ideas here. The problems just ring different bells on the same ideas.

---

# PART A — Classic Binary Search

---

## 1. Search X in Sorted Array

### Problem Understanding
You are given a **sorted** array (ascending) of integers and a target value `x`.
Return the index of `x` if present, otherwise `-1`.

- **Input:** sorted `int[] arr`, `int x`
- **Output:** index of `x`, or `-1`
- **Constraints/observations:**
  - Array is sorted → this is the single most important fact.
  - If there are duplicates, any one index of `x` is fine.

**Example:** `arr = [-1, 0, 3, 5, 9, 12]`, `x = 9` → returns `4`.

### How to Think About the Problem
- **What should I notice first?** The array is sorted.
- **Can I use the sorted property?** Yes — that is the whole point.
- **Am I searching for an element, an answer, a boundary, or a position?** An
  exact element.
- **Can I eliminate half the search space?** Yes. Compare the middle element.
  If `arr[mid] == x`, done. If `arr[mid] > x`, everything to the right of `mid`
  is bigger than `x` — discard it. If `arr[mid] < x`, discard the left half.
- **Clue → Pattern:** *sorted + search target* is the textbook **Pattern 1:
  Classic Binary Search**.

### Intuition (Brute → Optimal)

```text
Brute force: scan the whole array from left to right, O(n).
        ↓
Observation: the array is sorted, so after looking at ONE middle element
I can ignore an entire half with certainty.
        ↓
Optimal: classic binary search, O(log n).
```

### Brute Force Approach

**Basic idea:** linear scan — check every element until you find `x`.

**Why it works:** it is exhaustive; if `x` exists it will be found.

**Java code:**
```java
public int linearSearch(int[] arr, int x) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == x) return i;
    }
    return -1;
}
```

**Time Complexity Calculation:** one loop over `n` elements → `O(n)`.
**Space Complexity Calculation:** only the loop variable; no extra storage →
auxiliary space `O(1)`.

> **Why can this be improved?**
> A linear scan wastes the sorted information. Every element we check tells us
> nothing about the rest of the array. But in a sorted array, one comparison at
> the middle tells us about *half* the array.

### Optimal Approach — Classic Binary Search

#### Core Observation
When the array is sorted, for any element at index `mid`:
- `arr[mid] == x` → found.
- `x < arr[mid]` → `x` can only be in `[low, mid-1]`.
- `x > arr[mid]` → `x` can only be in `[mid+1, high]`.

Every step discards half the remaining range.

#### Pattern Identification
**Classic Binary Search (Pattern 1):** sorted array → compare with mid → eliminate half.

#### Step-by-Step Intuition
1. Start with the whole array: `low = 0`, `high = n-1`.
2. Look at the middle element.
3. Compare it with `x` and shrink the range to the only half that can contain `x`.
4. Repeat until found or the range is empty (`low > high`).

#### Dry Run
`arr = [-1, 0, 3, 5, 9, 12]`, `x = 9`, `n = 6`

| Step | low | high | mid | arr[mid] | Action |
|---|---|---|---|---|---|
| 1 | 0 | 5 | 2 | 3 | `3 < 9` → go right, `low = 3` |
| 2 | 3 | 5 | 4 | 9 | `9 == 9` → **return 4** |

#### Why Does It Work?
The invariant is: *`x` (if present) is definitely inside `[low, high]`.* Each
step either finds it or narrows the range using the sorted property, so we never
discard a range that could contain `x`.

#### Java Code
```java
public int search(int[] arr, int x) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;   // safe mid, avoids overflow
        if (arr[mid] == x) return mid;      // exact match -> pattern 1
        else if (arr[mid] < x) low = mid + 1;   // x must be on right
        else high = mid - 1;                    // x must be on left
    }
    return -1;   // low > high means x is absent
}
```

#### Complexity
**Time Complexity Calculation:** every iteration halves the range. Starting with
`n` elements, after `k` iterations we have `n/2^k`. We stop when `n/2^k ≈ 1`, so
`k = log₂(n)`. Each iteration is `O(1)`. Total: **`O(log n)`**.
**Space Complexity Calculation:** only `low`, `high`, `mid` variables →
auxiliary space **`O(1)`**. (The input array is input space, not extra space.)

### Pattern to Remember
```text
Problem clue:  "Sorted array" + "search for value"
Pattern:       Classic Binary Search
Requirement:   Monotonic (sorted) input -> one comparison discards half
Mental model:  compare with arr[mid], eliminate the impossible half
```

**Similar pattern:** Every boundary problem below builds on this loop.

---

## 2. Lower Bound

### Problem Understanding
Given a sorted array and a value `x`, the **lower bound** is the **first index
`i` such that `arr[i] >= x`** (read carefully: *greater than or equal*). If no
such index exists, return `n` (one past the end).

- **Input:** sorted `int[] arr`, `int x`
- **Output:** first index where `arr[i] >= x`, or `n`
- **Observation:** With duplicates, `arr[i] >= x` can match the *earliest*
  duplicate of `x`, which is what makes this different from Problem 1.

**Example:** `arr = [3, 5, 8, 15, 19]`, `x = 8` → `2`. `x = 9` → `3` (15 is the
first element ≥ 9). `x = 20` → `5` (one past the end).

### How to Think About the Problem
- **What should I notice first?** Sorted array, but we are **not** asked "is x
  present". We are asked for the *first position where a property becomes true*.
- **Am I searching for an element, an answer, a boundary, or a position?** A
  **boundary** — the edge between `< x` and `>= x`.
- **Is the property monotonic?** Yes! As you walk the array, `arr[i] >= x` is
  `false...false, true...true`. It never flips back. That single fact enables
  binary search.
- **Clue → Pattern:** *first / boundary* → **Pattern 2: Boundary Search**.

### Intuition (Brute → Optimal)

```text
Brute force: walk from index 0 and stop at the first arr[i] >= x, O(n).
        ↓
Observation: the predicate "arr[i] >= x" is monotonic (false then true).
        ↓
Optimal: binary search the flipping point, O(log n).
```

### Brute Force Approach

**Basic idea:** linear scan.

**Java code:**
```java
public int lowerBound(int[] arr, int x) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] >= x) return i;   // first element >= x
    }
    return arr.length;
}
```
**Time Complexity:** `O(n)`. **Space Complexity:** `O(1)`.
**Why can this be improved?** The predicate is monotonic, so we can binary search the flip point.

### Optimal Approach

#### Core Observation
Define `isValid(i) = arr[i] >= x`. In a sorted (non-decreasing) array this is
`false` for the left part and `true` for the right part. We want the **first
`true`**.

#### Pattern Identification
**Pattern 2: Binary Search for Boundary** — search for the crossing point using
the contrast "mid is fine vs mid is not fine".

#### Step-by-Step Intuition
1. Set `low = 0`, `high = n`.
2. Check the middle. If `arr[mid] >= x`, `mid` is a potential answer, but a
   better (smaller) one may lie to the left → `ans = mid` (keep it), go left.
3. Else (`arr[mid] < x`), the answer must be strictly to the right.
4. Why is `high` initialized to `n`? Because the answer may be `n` (no element
   is ≥ `x`). Never initialize high to `n-1` for boundary problems — you would
   lose the `return n` case.

*Note:* the invariant version with `while (low < high)` also works and returns
`low` at the end. The `ans` version is more beginner-friendly and generalizes to
all boundary and BS-on-answer problems, so I recommend that habit.

#### Dry Run
`arr = [3, 5, 8, 15, 19]`, `x = 9`, `n = 5`

| Step | low | high | mid | arr[mid] | `>= 9`? | Action / ans |
|---|---|---|---|---|---|---|
| 1 | 0 | 5 | 2 | 8 | false | `low = 3` |
| 2 | 3 | 5 | 4 | 19 | true | `ans = 4`, `high = 3` |
| 3 | 3 | 3 | 3 | 15 | true | `ans = 3`, `high = 2` |
| 4 | 3 | 2 | — | — | loop ends, **ans = 3** |

Check: `arr[3]=15 >= 9` ✓, and `arr[2]=8 < 9` ✓ → correct first `>=`.

#### Why Does It Work?
The invariant maintained: **`ans` always holds the smallest index seen so far
with `arr[i] >= x`, and the range `[low, high]` always contains any better
candidate.** Every `true` snapshot shrinks strictly toward the first `true`.

#### Java Code
```java
public int lowerBound(int[] arr, int x) {
    int low = 0, high = arr.length, ans = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] >= x) {      // possible answer, try to improve leftward
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;        // all left elements are < x, go right
        }
    }
    return ans;
}
```

#### Complexity
**Time Complexity Calculation:** one `O(1)` comparison per step, range halves
each step over a space of size `n+1` → **`O(log n)`**.
**Space Complexity Calculation:** only integer variables → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "first index where arr[i] >= x"
Pattern:       Boundary Binary Search
Requirement:   Predicate is monotonic (false-then-true)
Mental model:  false...false | TRUE...TRUE — binary search the flip point
```

**Similar pattern:** Upper Bound (3), Search Insert Position (4), Floor & Ceil
(5), First & Last Occurrence (6) — all are boundary searches.

---

## 3. Upper Bound

### Problem Understanding
Given a sorted array and value `x`, the **upper bound** is the **first index `i`
such that `arr[i] > x`** (strictly greater). If none exists, return `n`.

This is the exact twin of lower bound — the **only difference is `>` vs `>=`**.

- **Input:** sorted `int[] arr`, `int x`
- **Output:** first index with `arr[i] > x`, or `n`

**Example:** `arr = [3, 5, 8, 15, 19]`, `x = 8` → `3` (15 is the first > 8).
Compare with lower bound of `8` which was `2`.

### How to Think About the Problem
- It is identical to Problem 2 in every structural way.
- Only ask: **does "arr[mid] > x" flip from false to true once?** Yes.
- **Clue → Pattern:** boundary → **Pattern 2**.

### Intuition (Brute → Optimal)
```text
Brute force: linear scan, O(n).
        ↓
Observation: predicate "arr[i] > x" is monotonic.
        ↓
Optimal: boundary binary search, O(log n).
```

### Brute Force Approach
```java
public int upperBound(int[] arr, int x) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] > x) return i;
    }
    return arr.length;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Monotonic predicate → binary searchable.

### Optimal Approach

#### Core Observation
Same as lower bound, but the predicate is `arr[mid] > x`. Everything else is
mechanical.

#### Pattern Identification
**Pattern 2: Boundary Search.**

#### Step-by-Step Intuition
Same four steps as lower bound. When `arr[mid] > x`, record `ans = mid` and move
left; otherwise move right.

#### Dry Run
`arr = [3, 5, 8, 15, 19]`, `x = 8`

| Step | low | high | mid | arr[mid] | `> 8`? | Action / ans |
|---|---|---|---|---|---|---|
| 1 | 0 | 5 | 2 | 8 | false | `low = 3` |
| 2 | 3 | 5 | 4 | 19 | true | `ans = 4`, `high = 3` |
| 3 | 3 | 3 | 3 | 15 | true | `ans = 3`, `high = 2` |
| 4 | 3 | 2 | — | — | **ans = 3** |

#### Why Does It Work?
Same reasoning as lower bound: monotonic flip is searched with the `ans`-snapshot
technique; `ans` can only improve toward smaller indices.

#### Java Code
```java
public int upperBound(int[] arr, int x) {
    int low = 0, high = arr.length, ans = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] > x) {       // strictly greater -> candidate
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}
```

#### Complexity
**Time Complexity Calculation:** range halves or better each step,
`O(1)` work per step → **`O(log n)`**.
**Space Complexity Calculation:** constant variables → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "first index where arr[i] > x"
Pattern:       Boundary Binary Search
Difference vs lower bound: only '>' vs '>='
Mental model:  upper_bound(x) = lower_bound(x + 1) in spirit — the flip point
```

**Similar pattern:** Lower Bound (2), Insert Position (4), First/Last (6),
Count (7).

---

## 4. Search Insert Position

### Problem Understanding
Given a sorted array and a target `x`, return the index where `x` would be
**inserted to keep the array sorted**. If `x` already exists, return its index.

- **Input:** sorted `int[] arr`, `int x`
- **Output:** insertion index
- **Observation:** this is a *disguised lower bound*.

**Example:** `arr = [1, 3, 5, 6]`, `x = 5` → `2` (already present). `x = 2` → `1`.
`x = 7` → `4`.

### How to Think About the Problem
- **What am I really being asked?** The first position where the inserted value
  will not disturb ordering → the first index `i` with `arr[i] >= x`.
- Already present? `arr[i] == x` → that index is exactly the lower bound.
- Not present? Inserting at the first `arr[i] >= x` keeps order by pushing that
  element right.
- **Clue → Pattern:** *insert position* is literally *lower bound* → **Pattern 2**.

### Intuition (Brute → Optimal)
```text
Brute force: scan for the first arr[i] >= x, O(n).
        ↓
Observation: that is exactly the lower bound definition.
        ↓
Optimal: reuse lower-bound binary search, O(log n).
```

### Brute Force Approach
```java
public int searchInsert(int[] arr, int x) {
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] >= x) return i;
    }
    return arr.length;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Same monotonic predicate argument.

### Optimal Approach

#### Core Observation
The answer is the first index with `arr[i] >= x`. That is exactly
`lowerBound(arr, x)` from Problem 2. No new algorithm needed — just recognition.

#### Pattern Identification
**Pattern 2: Boundary Search.**

#### Step-by-Step Intuition
1. Run the lower-bound loop.
2. The `ans` it returns is the insertion index, whether `x` exists or not.

#### Dry Run
`arr = [1, 3, 5, 6]`, `x = 2`

| Step | low | high | mid | arr[mid] | `>= 2`? | Action / ans |
|---|---|---|---|---|---|---|
| 1 | 0 | 4 | 2 | 5 | true | `ans = 2`, `high = 1` |
| 2 | 0 | 1 | 0 | 1 | false | `low = 1` |
| 3 | 1 | 1 | 1 | 3 | true | `ans = 1`, `high = 0` |
| 4 | 1 | 0 | — | — | **ans = 1** |

Check: inserting `2` at index 1 gives `[1, 2, 3, 5, 6]` ✓.

#### Why Does It Work?
Inserting `x` before the first `>= x` element keeps every element before it
smaller and every element from it onward greater-or-equal — exactly sorted order.

#### Java Code
```java
public int searchInsert(int[] arr, int x) {
    int low = 0, high = arr.length, ans = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] >= x) {      // lower bound of x
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}
```

#### Complexity
**Time Complexity Calculation:** binary search over `n+1`-sized space,
`O(1)` per step → **`O(log n)`**.
**Space Complexity Calculation:** constant variables → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "insert position", "keep array sorted"
Pattern:       Boundary Binary Search (= lower bound)
Mental model:  recognize the disguise: insert position <=> lower_bound(x)
```

**Similar pattern:** Lower Bound (2). Also the base for First/Last Occurrence (6).

---

## 5. Floor and Ceil in Sorted Array

### Problem Understanding
Given a sorted array and value `x`:

- **Floor(x)** = the largest element in the array that is **`<= x`** (if no
  element is `<= x`, there is no floor).
- **Ceil(x)** = the smallest element in the array that is **`>= x`** (if none,
  no ceil).

Return both (or `-1` for "does not exist").

- **Input:** sorted `int[] arr`, `int x`
- **Output:** floor value and ceil value (or -1)
- **Observation:** "Ceil" is literally the element at the **lower bound index**.
  "Floor" is the element just *before* the lower bound index.

**Example:** `arr = [3, 4, 4, 7, 8, 10]`, `x = 5` → floor = `4`, ceil = `7`.
`x = 8` → floor = `8`, ceil = `8`.

### How to Think About the Problem
- **What am I searching for?** Boundaries around `x` in value space.
- **What is the monotonic property?** Look at the lower-bound index `lb`:
  - Everything left of `lb` is `< x` → the last of them is the floor.
  - Everything from `lb` onward is `>= x` → `arr[lb]` is the ceil.
- **Clue → Pattern:** *floor / ceil / closest lower / closest upper* →
  **Pattern 2: Boundary Search** in the sorted array, then translate index → value.

### Intuition (Brute → Optimal)
```text
Brute force: scan both sides of x after finding lower bound linearly, O(n).
        ↓
Observation: one lower-bound binary search locates BOTH neighbors.
        ↓
Optimal: single binary search, O(log n).
```

### Brute Force Approach
```java
// Straightforward: find first >= x by linear scan, neighbors fall out.
public int[] floorAndCeil(int[] arr, int x) {
    int lb = arr.length;
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] >= x) { lb = i; break; }
    }
    int ceil = (lb < arr.length) ? arr[lb] : -1;
    int floor = (lb > 0) ? arr[lb - 1] : -1;
    return new int[]{floor, ceil};
}
```
This naive version has a **subtle bug**, and finding it teaches the pattern.
Check `x=5`, `arr=[3,4,4,7,8,10]`: `lb=3`, ceil = 7 ✓, floor = arr[2] = 4 ✓.
Now check `x=8`: `lb=4`, ceil = 8 ✓, but floor = `arr[3] = 7` ✗ — the floor of `8`
should be `8` itself! Because `8` is present, "largest element `<= x`" is `8`, not
the element before the lower bound.

The fix: think in terms of the **upper bound**. The floor is the last element that
is `<= x`, and that block ends exactly where elements become **`> x`** — i.e. at
`ub - 1`, where `ub = upperBound(x)`. For every case this is right:

- Find `ub` = first index with `arr[i] > x` (upper bound).
- Elements `<= x` end at `ub - 1`. So `floor = (ub > 0) ? arr[ub - 1] : -1`.
- Ceil: first index with `arr[i] >= x` (lower bound). `ceil = (lb < n) ? arr[lb] : -1`.

Verify with examples:
- `x = 5`, `[3,4,4,7,8,10]`: ub (first > 5) = 3 → floor = arr[2] = 4 ✓;
  lb (first >= 5) = 3 → ceil = arr[3] = 7 ✓.
- `x = 8`: ub (first > 8) = 5 → floor = arr[4] = 8 ✓;
  lb (first >= 8) = 4 → ceil = arr[4] = 8 ✓.
- `x = 1`: ub = 0 → floor = -1 ✓; lb = 0 → ceil = arr[0] = 3 ✓.
- `x = 12`: ub = 6 → floor = arr[5] = 10 ✓; lb = 6 → ceil = -1 ✓.

**Takeaway:** using **upper bound for floor** and **lower bound for ceil** handles
duplicates correctly. The naive "floor = arr[lb - 1]" rule fails exactly when `x`
exists in the array — this is why strictness (`>` vs `>=`) matters so much in
boundary problems.

**Time:** `O(n)`. **Space:** `O(1)`.
**Why improve?** Both bounds can be found by binary search instead of a scan.

### Optimal Approach

#### Core Observation
Floor and ceil are one index-step away from two monotonic boundaries:
`ub - 1` gives the last `<= x`; `lb` gives the first `>= x`.

#### Pattern Identification
**Pattern 2: Boundary Search** — run two boundary searches (or one and derive
the other). Since we can also note `lb` and `ub` differ by at most the run of
`x`, running both independently is clean and readable.

#### Step-by-Step Intuition
1. Find lower bound index `lb` (first `arr[i] >= x`).
2. Find upper bound index `ub` (first `arr[i] > x`).
3. `ceil = (lb < n) ? arr[lb] : -1`.
4. `floor = (ub > 0) ? arr[ub - 1] : -1`.

#### Dry Run
`arr = [3, 4, 4, 7, 8, 10]`, `x = 4`

| Bound | Steps | Result index | Value |
|---|---|---|---|
| lb (first `>= 4`) | 0,6 → mid 2 (4≥4 → high=1) → mid 0 (3<4 → low=1) → mid 1 (4≥4 → high=0) | 1 | ceil = arr[1] = 4 |
| ub (first `> 4`) | 0,6 → mid 2 (4>4 false → low=3) → mid 4 (8>4 → high=3) → mid 3 (7>4 → high=2) | 3 | floor = arr[2] = 4 |

floor = 4, ceil = 4 ✓ (because 4 exists, both equal it).

#### Why Does It Work?
Every element at index `<= ub - 1` is `<= x`, and `arr[ub] > x`, so `ub - 1` is
exactly the last `<= x`. Every element before `lb` is `< x` and `arr[lb] >= x`,
so `lb` is exactly the first `>= x`. Translation index → value is immediate.

#### Java Code
```java
public int[] floorAndCeil(int[] arr, int x) {
    // lower bound of x -> first index with arr[i] >= x
    int low = 0, high = arr.length, lb = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] >= x) { lb = mid; high = mid - 1; }
        else low = mid + 1;
    }
    // upper bound of x -> first index with arr[i] > x
    low = 0; high = arr.length;
    int ub = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] > x) { ub = mid; high = mid - 1; }
        else low = mid + 1;
    }
    int ceil = (lb < arr.length) ? arr[lb] : -1;
    int floor = (ub > 0) ? arr[ub - 1] : -1;   // last element <= x
    return new int[]{floor, ceil};
}
```

#### Complexity
**Time Complexity Calculation:** two independent binary searches, each `O(log n)`
→ **`O(log n)`** total (constant factor 2 is ignored).
**Space Complexity Calculation:** only variables → **`O(1)`**.

### Edge Cases
- `x` smaller than every element → floor `-1`, ceil = first element.
- `x` larger than every element → floor = last element, ceil `-1`.
- `x` present multiple times → floor and ceil both equal `x` (thanks to the
  upper-bound trick above; the naive `arr[lb - 1]` would fail here).

### Pattern to Remember
```text
Problem clue:  "floor", "ceil", "just smaller / just larger"
Pattern:       Boundary Binary Search
Key insight:   floor = element right before upper_bound(x)
               ceil  = element at lower_bound(x)
Mental model:  two boundary searches => answers are neighbors of the boundaries
```

**Similar pattern:** Lower/Upper Bound (2, 3), Insert Position (4).

---

## 6. First and Last Occurrence

### Problem Understanding
Given a sorted array that may contain duplicates of `x`, find the **first** index
where `x` occurs and the **last** index where `x` occurs. Return `[-1, -1]` if
`x` is absent.

- **Input:** sorted `int[] arr`, `int x`
- **Output:** `[firstIndex, lastIndex]`
- **Observation:** first = lower bound of `x`; last = upper bound of `x` minus 1.

**Example:** `arr = [2, 4, 4, 4, 6, 7]`, `x = 4` → `[1, 3]`.

### How to Think About the Problem
- The range of duplicates is exactly the block `[lb, ub-1]`.
- **First occurrence:** is `lb == x`? i.e., lower bound index points at `x`.
- **Last occurrence:** `ub - 1` points at the last `x` (check it equals `x`).
- **Clue → Pattern:** *first and last / frequency / range of a value* →
  **Pattern 2: Boundary Search**.

### Intuition (Brute → Optimal)
```text
Brute force: linear scans from both ends, O(n).
        ↓
Observation: first = lower_bound(x), last = upper_bound(x) - 1.
        ↓
Optimal: two binary searches, O(log n).
```

### Brute Force Approach
```java
public int[] searchRange(int[] arr, int x) {
    int first = -1, last = -1;
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] == x) {
            if (first == -1) first = i;
            last = i;
        }
    }
    return new int[]{first, last};
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Both boundaries are binary-searchable.

### Optimal Approach

#### Core Observation
A sorted array places all copies of `x` contiguously. The block starts where
elements become `>= x` and ends just before elements become `> x`.

#### Pattern Identification
**Pattern 2: Boundary Search** — first via lower bound, last via upper bound − 1.

#### Step-by-Step Intuition
1. `lb = lowerBound(arr, x)`.
2. If `lb == n || arr[lb] != x` → `x` is absent → return `[-1, -1]`.
3. `ub = upperBound(arr, x)`.
4. Return `[lb, ub - 1]`.

#### Dry Run
`arr = [2, 4, 4, 4, 6, 7]`, `x = 4`

| Bound | Result |
|---|---|
| lb (first `>= 4`) | 1 |
| ub (first `> 4`) | 4 |

Return `[1, 3]` ✓. For `x = 5`: lb = 4, `arr[4] = 6 != 5` → `[-1, -1]` ✓.

#### Why Does It Work?
Before `lb`, all elements `< x`. `arr[lb] == x` proves a copy exists. All copies
occupy `[lb, ub-1]` because anything after `ub-1` is `> x`. That interval is
exactly all occurrences.

#### Java Code
```java
public int[] searchRange(int[] arr, int x) {
    int lb = lowerBound(arr, x);
    // absent check: x does not exist at the lower bound position
    if (lb == arr.length || arr[lb] != x) {
        return new int[]{-1, -1};
    }
    int ub = upperBound(arr, x);
    return new int[]{lb, ub - 1};   // first .. last
}

private int lowerBound(int[] arr, int x) {
    int low = 0, high = arr.length, ans = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] >= x) { ans = mid; high = mid - 1; }
        else low = mid + 1;
    }
    return ans;
}

private int upperBound(int[] arr, int x) {
    int low = 0, high = arr.length, ans = arr.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] > x) { ans = mid; high = mid - 1; }
        else low = mid + 1;
    }
    return ans;
}
```

#### Complexity
**Time Complexity Calculation:** two binary searches of `O(log n)` each →
**`O(log n)`** total.
**Space Complexity Calculation:** constant variables → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "first and last occurrence", "range of x", "number of times x appears"
Pattern:       Boundary Binary Search
Key insight:   [first, last] = [lower_bound(x), upper_bound(x) - 1]
Mental model:  the duplicate block of x is bounded by the two boundary searches
```

**Similar pattern:** Count Occurrences (7) — one line on top of this.

---

## 7. Count Occurrences in a Sorted Array

### Problem Understanding
Count how many times `x` appears in a sorted array.

- **Input:** sorted `int[] arr`, `int x`
- **Output:** a number (count), or 0 if absent
- **Observation:** this is Problem 6's result collapsed into one number:
  `last - first + 1`.

**Example:** `arr = [2, 4, 4, 4, 6, 7]`, `x = 4` → `3`. `x = 5` → `0`.

### How to Think About the Problem
- If you already know how to find first and last occurrence, counting is trivial.
- But that is the *pattern recognition win*: **"count occurrences in a sorted
  array" is never a counting problem. It is a two-boundary problem.**
- **Clue → Pattern:** *count in sorted* → **Pattern 2**, then subtract.

### Intuition (Brute → Optimal)
```text
Brute force: count in one pass, O(n).
        ↓
Observation: occurrences form one contiguous block = [first, last].
        ↓
Optimal: two binary searches, O(log n).
```

### Brute Force Approach
```java
public int count(int[] arr, int x) {
    int c = 0;
    for (int v : arr) if (v == x) c++;
    return c;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Block width from two binary searches.

### Optimal Approach

#### Core Observation
```text
count = upper_bound(x) - lower_bound(x)
```
or equivalently `last - first + 1`.

#### Pattern Identification
**Pattern 2: Boundary Search** (reuses 6).

#### Step-by-Step Intuition
1. `lb = lowerBound(arr, x)`.
2. If absent (`lb == n || arr[lb] != x`) → 0.
3. `ub = upperBound(arr, x)`.
4. Return `ub - lb` (equals `(ub-1) - lb + 1`).

#### Dry Run
`arr = [2, 4, 4, 4, 6, 7]`, `x = 4`: `lb = 1`, `ub = 4` → `4 - 1 = 3` ✓.
`x = 5`: `lb = 4`, `arr[4] = 6 != 5` → `0` ✓.

#### Why Does It Work?
`ub - lb` counts exactly the indices strictly between (and including) the two
boundaries, which is precisely the number of copies of `x`.

#### Java Code
```java
public int countOccurrences(int[] arr, int x) {
    int lb = lowerBound(arr, x);
    if (lb == arr.length || arr[lb] != x) return 0;
    int ub = upperBound(arr, x);
    return ub - lb;
}
// lowerBound and upperBound are identical to the ones in Problem 6.
```

#### Complexity
**Time Complexity Calculation:** two binary searches → **`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "count occurrences" or "frequency of x" IN A SORTED ARRAY
Pattern:       Boundary Binary Search disguised as a counting problem
Mental model:  whenever you must COUNT in a sorted array, count with boundaries
```

**Similar pattern:** First/Last Occurrence (6). Also the reason 6 and 7 are
usually asked together in interviews.

---

# PART B — Rotated Sorted Array

## The "One Half is Always Sorted" Idea

A rotated array like `[4, 5, 6, 7, 0, 1, 2]` is a sorted array that was cut and
re-joined. The single most important observation for **every** rotated-array
problem:

```text
In a rotated sorted array, at least one of the two halves
[left..mid] or [mid..right] is ALWAYS fully sorted.
```

If `arr[low] <= arr[mid]`, the left half is sorted. Otherwise the right half is
(`arr[mid] <= arr[high]`). All four problems in this part use only this.

---

## 8. Search in Rotated Sorted Array — I

### Problem Understanding
Given a rotated sorted array with **distinct** elements and a target `x`, return
the index of `x` or `-1`.

- **Input:** rotated sorted `int[] arr` (unique), `int x`
- **Output:** index of `x`, or `-1`
- **Observation:** the plain "compare with mid and eliminate" trick from Problem
  1 no longer works directly because `arr[mid]` has two neighbors and the
  ordering wraps around.

**Example:** `arr = [4, 5, 6, 7, 0, 1, 2]`, `x = 0` → `4`.

### How to Think About the Problem
- **What should I notice first?** The array is *composed of two sorted runs*. We
  just don't know where the break is.
- **Can I still eliminate half?** Yes — here is the trick. Whichever half is
  *sorted*, I can test membership in it easily. If `x` lies inside the sorted
  half's range `[arr[low]..arr[mid]]`, go there; otherwise go to the other half.
- **Am I searching for an element, a boundary, or an answer?** An exact element.
- **Clue → Pattern:** *rotated + find target* → **Pattern 3: Rotated Sorted Array**.

### Intuition (Brute → Optimal)
```text
Brute force: linear scan, O(n).
        ↓
Observation: one half is always sorted -> we can test membership in it O(1).
        ↓
Optimal: "identify sorted half, check if target belongs, else go other side", O(log n).
```

### Brute Force Approach
```java
public int search(int[] arr, int x) {
    for (int i = 0; i < arr.length; i++) if (arr[i] == x) return i;
    return -1;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** The half-sorted structure is
binary-searchable.

### Optimal Approach

#### Core Observation
Exactly one half is sorted (in the distinct-elements version, if `arr[low] <=
arr[mid]` the left is sorted, else the right is). We take the sorted half and check
whether the target could be inside it — this decides which half to keep.

#### Pattern Identification
**Pattern 3: Rotated Sorted Array** — *identify the sorted half → check where the
target belongs → eliminate*.

#### Step-by-Step Intuition
1. `low = 0`, `high = n-1`.
2. `mid` divides the range. Determine which half is sorted:
   - If `arr[low] <= arr[mid]`: left half `[low..mid]` is sorted.
     - If `target` is in `[arr[low], arr[mid]]`, search left: `high = mid - 1`.
     - Else search right: `low = mid + 1`.
   - Else: right half `[mid..high]` is sorted.
     - If `target` is in `[arr[mid], arr[high]]`, search right: `low = mid + 1`.
     - Else search left: `high = mid - 1`.
3. Stop at `arr[mid] == target`.

Why "the target belongs" check is careful: use `>=` / `<=`, i.e.
`arr[low] <= x && x <= arr[mid]`. Equality is allowed on both ends.

#### Dry Run
`arr = [4, 5, 6, 7, 0, 1, 2]`, `x = 0`

| Step | low | high | mid | arr[low..mid] sorted? | Decision |
|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 4..7, left sorted, `0 in [4,7]`? no | go right: low=4 |
| 2 | 4 | 6 | 5 | arr[low]=0 <= arr[mid]=1, left sorted, `0 in [0,1]`? yes | go left: high=4 |
| 3 | 4 | 4 | 4 | arr[4] = 0 == target | **return 4** |

#### Why Does It Work?
The sorted half is fully linear, so range membership checks are correct. If the
target isn't in the sorted half, it provably lives in the other half (the target
exists somewhere, and the array is partitioned by sorted runs). Each step halves
the range regardless, so it runs in `O(log n)`.

#### Java Code
```java
public int search(int[] arr, int x) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == x) return mid;
        if (arr[low] <= arr[mid]) {          // left half is sorted
            if (arr[low] <= x && x < arr[mid]) high = mid - 1;  // x fits on left
            else low = mid + 1;                                  // go right
        } else {                             // right half is sorted
            if (arr[mid] < x && x <= arr[high]) low = mid + 1;  // x fits on right
            else high = mid - 1;                                 // go left
        }
    }
    return -1;
}
```

#### Complexity
**Time Complexity Calculation:** each step discards half the range, `O(1)` work
per step → **`O(log n)`**.
**Space Complexity Calculation:** constants only → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "rotated sorted array" + distinct values + "search target"
Pattern:       Rotated Sorted Array
Mental model:  one half is always sorted; decide which half the target can live in
Similar:       Min in rotated (10), Rotation count (11), Rotated with duplicates (9)
```

---

## 9. Search in Rotated Sorted Array — II

### Problem Understanding
Same as Problem 8, but the array **now contains duplicates**. The return value is
changed to a boolean (does `x` exist?).

- **Input:** rotated sorted `int[] arr` (may contain duplicates), `int x`
- **Output:** `true` / `false`

**Example:** `arr = [2, 5, 6, 0, 0, 1, 2]`, `x = 0` → `true`. `x = 3` → `false`.

### How to Think About the Problem
- **What broke?** The check `arr[low] <= arr[mid]` no longer guarantees the left
  half is sorted! Example: `[1, 0, 1, 1, 1]`, `mid = 2` (value 1):
  `arr[low]=1 = arr[mid]=1`, so left is "sorted" by our test, but it is actually
  `[1,0,1]`, not sorted. Duplicates lie.
- **What still helps?** When `arr[low] == arr[mid] == arr[high]`, the middle is
  ambiguous. We cannot decide, so we *shrink from both ends* (`low++`, `high--`)
  and retry. Removing equal boundary elements is safe because:
  - If `arr[low]` were the target, we would have already matched at `arr[high]`
    too (same value) — so deleting either boundary value can't delete the answer.
- **Clue → Pattern:** *rotated + duplicates* → **Pattern 3**, with a duplicate-handling twist.

### Intuition (Brute → Optimal)
```text
Brute force: scan, O(n).
        ↓
Observation: `arr[low] == arr[mid] == arr[high]` makes halves ambiguous.
        ↓
Optimization: shrink both ends and continue; otherwise reuse problem 8's logic.
        ↓
Optimal: same search, with a guard, O(log n) best / O(n) worst.
```

### Brute Force Approach
```java
public boolean search(int[] arr, int x) {
    for (int v : arr) if (v == x) return true;
    return false;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Usually much faster via
half elimination; only rare all-equal cases degrade to `O(n)`.

### Optimal Approach

#### Core Observation
The only new case the duplicates introduce is:
`arr[low] == arr[mid] == arr[high]`. In that case we shrink both ends and re-check.
Every other case is identical to Problem 8.

#### Pattern Identification
**Pattern 3: Rotated Sorted Array** + **duplicate-elimination guard**.

#### Step-by-Step Intuition
1. Standard rotated-search loop.
2. Extra branch first: if `arr[low] == arr[mid] && arr[mid] == arr[high]`,
   do `low++; high--;` and `continue`.
3. Then proceed exactly like Problem 8.

#### Dry Run
`arr = [1, 0, 1, 1, 1]`, `x = 0`

| Step | low | high | mid | situation | action |
|---|---|---|---|---|---|
| 1 | 0 | 4 | 2 | arr[0]=arr[2]=arr[4]=1==1 | low=1, high=3 |
| 2 | 1 | 3 | 2 | arr[1]=0, arr[2]=1 — not all equal | arr[low]<=arr[mid] (0<=1): left sorted; `0 in [0,1]` yes → high=1 |
| 3 | 1 | 1 | 1 | arr[1] = 0 == target | **true** |

#### Why Does It Work?
When `arr[low] == arr[mid] == arr[high]`, we can't tell which half is sorted, but
we *can* say the values at both ends are useless to keep: if they were the
target, the other equal end already answers `true`. So trimming them never loses
the answer. Worst case (all values equal) we trim one element per step → `O(n)`.

#### Java Code
```java
public boolean search(int[] arr, int x) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == x) return true;
        // duplicate guard: trim ambiguous equal ends
        if (arr[low] == arr[mid] && arr[mid] == arr[high]) {
            low++;
            high--;
        } else if (arr[low] <= arr[mid]) {          // left half sorted
            if (arr[low] <= x && x < arr[mid]) high = mid - 1;
            else low = mid + 1;
        } else {                                     // right half sorted
            if (arr[mid] < x && x <= arr[high]) low = mid + 1;
            else high = mid - 1;
        }
    }
    return false;
}
```

#### Complexity
**Time Complexity Calculation:** best/average case one half is eliminated per
step → `O(log n)`. Worst case (like `[1,1,1,...,2,1,1,...]`), the guard trims
one element per step → **`O(n)`**. So we state `O(log n)` average, `O(n)` worst.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  rotated sorted + duplicates
Pattern:       Rotated Sorted Array + duplicate guard
Mental model:  ambiguity at arr[low]==arr[mid]==arr[high] -> trim ends, don't guess
```

**Similar pattern:** Problem 8 (distinct version), Min in Rotated (10).

---

## 10. Find Minimum in Rotated Sorted Array

### Problem Understanding
Given a rotated sorted array of **distinct** elements, find the minimum element.
Special case: a fully sorted array is a valid "rotation by 0".

- **Input:** rotated sorted `int[] arr` (distinct)
- **Output:** the minimum value
- **Observation:** the minimum sits exactly at the rotation break — it is the
  element smaller than its predecessor.

**Example:** `arr = [4, 5, 6, 7, 0, 1, 2]` → `0`. `arr = [11, 13, 15, 17]` → `11`.

### How to Think About the Problem
- **What should I notice first?** This is the same family as Problem 8. One half
  is always sorted.
- **Can I decide which half holds the minimum?** Yes:
  - If `arr[mid] > arr[high]`, the array "jumps down" somewhere to the right of
    `mid` → the minimum is in the right part.
  - Otherwise the right part `[mid..high]` is sorted upward → the minimum is `mid`
    or to its left.
- **Am I searching for an element, a boundary, or an answer?** A boundary (the
  dip) — but we return a value.
- **Clue → Pattern:** *rotated + minimum* → **Pattern 3**.

### Intuition (Brute → Optimal)
```text
Brute force: scan for the dip, O(n).
        ↓
Observation: compare arr[mid] with arr[high]: if arr[mid] > arr[high],
the break is on the right; otherwise the right is smooth and the break is left.
        ↓
Optimal: "compare with the right end", O(log n).
```

### Brute Force Approach
```java
public int findMin(int[] arr) {
    int min = arr[0];
    for (int v : arr) min = Math.min(min, v);
    return min;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Sorted half structure again.

### Optimal Approach

#### Core Observation
In a rotated sorted array (distinct), the region `[mid..high]` is either
"normal ascending up to the end" or "contains the break". Compare the middle with
the right end:

- `arr[mid] > arr[high]` → the dip is somewhere in `[mid+1..high]` → go right.
- else → `mid` itself may be the min and the break is to the left → go left:
  `high = mid`.

#### Pattern Identification
**Pattern 3: Rotated Sorted Array** (minimum-flavor).

#### Step-by-Step Intuition
1. `low = 0`, `high = n-1`.
2. While `low < high`: `mid = low + (high - low) / 2`.
3. `arr[mid] > arr[high]` → `low = mid + 1` else `high = mid`.
4. When `low == high`, that single index holds the minimum.

Note: when `arr[mid] <= arr[high]`, we set `high = mid` (not `mid - 1`) because
`mid` itself could be the minimum (e.g., fully sorted array, mid at 0 is min).

#### Dry Run
`arr = [4, 5, 6, 7, 0, 1, 2]`

| Step | low | high | mid | arr[mid] vs arr[high] | action |
|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 7 > 2 | low = 4 |
| 2 | 4 | 6 | 5 | 1 <= 2 | high = 5 |
| 3 | 4 | 5 | 4 | 0 <= 1 | high = 4 |
| 4 | 4 | 4 | — | loop ends | **arr[4] = 0** |

`arr = [11, 13, 15, 17]` (rotated by 0)

| Step | low | high | mid | comparison | action |
|---|---|---|---|---|---|
| 1 | 0 | 3 | 1 | 13 <= 17 | high = 1 |
| 2 | 0 | 1 | 0 | 11 <= 13 | high = 0 |
| 3 | 0 | 0 | — | — | **arr[0] = 11** |

#### Why Does It Work?
Invariant: *the minimum is always inside `[low, high]`.* If `arr[mid] > arr[high]`,
the right part must contain the dip (the right end is smaller than the middle, so
the sequence from `mid` to `high` descends somewhere → break is inside
`[mid+1..high]`). Otherwise the range `[mid..high]` is ascending, so the smallest
element of it is `arr[mid]`; the overall minimum is `mid` or left of it. Narrowing
with `high = mid` or `low = mid+1` preserves the invariant.

#### Java Code
```java
public int findMin(int[] arr) {
    int low = 0, high = arr.length - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] > arr[high]) low = mid + 1;  // break/dip on the right
        else high = mid;                          // min is mid or left
    }
    return arr[low];
}
```

#### Complexity
**Time Complexity Calculation:** range halves each step → **`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "rotated array" + "minimum"
Pattern:       Rotated Sorted Array
Key comparison: arr[mid] vs arr[high] decides which side holds the dip
Mental model:  the dip is a boundary between the two sorted runs
```

**Similar pattern:** Rotation Count (11) — same code, but return the index.

---

## 11. Find Out How Many Times the Array Is Rotated

### Problem Understanding
A sorted array was rotated right by `k` positions. Given the rotated array
(distinct elements), find `k`.

- **Input:** rotated sorted `int[] arr` (distinct)
- **Output:** `k` (number of rotations)
- **Observation:** the index of the minimum element IS `k`. Rotating by `n`
  is identity, so `k` is always in `[0, n-1]`; a fully sorted array → `0`.

**Example:** `arr = [4, 5, 6, 7, 0, 1, 2]` → `4` (min `0` is at index 4).
`arr = [0, 1, 2, 3]` → `0`.

### How to Think About the Problem
- **What should I notice first?** `k` = index of the minimum. This is Problem 10
  with a different return type.
- **Am I searching for an element, a boundary, or an answer?** I am searching for
  the **boundary where the array dips** — the exact seam between the two sorted runs.
- **Clue → Pattern:** *how many times rotated* → **Pattern 3**, same as minimum.

### Intuition (Brute → Optimal)
```text
Brute force: find the dip by linear scan, return its index, O(n).
        ↓
Observation: the dip index is exactly the rotation count k.
        ↓
Optimal: reuse the "compare mid with high" search, O(log n).
```

### Brute Force Approach
```java
public int findKRotation(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n; i++) {
        int prev = arr[(i - 1 + n) % n], next = arr[(i + 1) % n];
        // in a rotation the dip satisfies: arr[i] <= prev && arr[i] <= next
        if (arr[i] <= prev && arr[i] <= next) return i;
    }
    return 0;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Same binary structure.

### Optimal Approach

#### Core Observation
The minimum is the only element that is **smaller than its left neighbor** (the
array wraps around it). Finding its index is exactly Problem 10's loop — return
`low` instead of `arr[low]`.

#### Pattern Identification
**Pattern 3: Rotated Sorted Array** (find the break / min index).

#### Step-by-Step Intuition
1. Same loop as Problem 10: `while (low < high)`, compare `arr[mid]` with
   `arr[high]`.
2. `low` ends at the index of the minimum → that IS `k`.

Verification idea: rotating `[0,1,2,3,4]` by `k` moves the minimum `0` to
position `k`. So `indexOf(min) == k`. A fully sorted (rotation-by-0) array
converges `low` to `0` via the `else` branch.

#### Dry Run
`arr = [3, 4, 5, 1, 2]`

| Step | low | high | mid | arr[mid] vs arr[high] | action |
|---|---|---|---|---|---|
| 1 | 0 | 4 | 2 | 5 > 2 | low = 3 |
| 2 | 3 | 4 | 3 | 1 <= 2 | high = 3 |
| 3 | 3 | 3 | — | — | **rotations = 3** |

Check: `[3,4,5,1,2]` is the sorted array `[1,2,3,4,5]` rotated right by 3 — the
minimum `1` sits at index 3, so the rotation count is indeed 3 ✓.

#### Why Does It Work?
The minimum is the unique element satisfying `arr[i] < arr[i-1]` (the "drop").
The loop converges to exactly that drop via the same invariant as Problem 10:
the minimum always stays inside `[low, high]`.

#### Java Code
```java
public int findKRotation(int[] arr) {
    int low = 0, high = arr.length - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] > arr[high]) low = mid + 1;  // break on right
        else high = mid;                          // break is mid or left
    }
    return low;   // index of the minimum == number of rotations
}
```

#### Complexity
**Time Complexity Calculation:** one binary search → **`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "how many times rotated", "rotation count"
Pattern:       Rotated Sorted Array
Key insight:   rotation count == index of the minimum == position of the drop
Mental model:  three-word question -> find the dip -> answer = its index
```

**Similar pattern:** Min in Rotated (10). Both share the exact same loop.

---

# PART C — Boundary Thinking on Special Sequences

---

## 12. Single Element in a Sorted Array

### Problem Understanding
A sorted array where **every element appears exactly twice except one** that
appears once. Find that unique element. (`n` is odd.)

- **Input:** sorted `int[] arr`, length is odd
- **Output:** the element occurring once
- **Observation:** "every element twice except one" is an extremely heavy
  constraint. It imposes a strict parity structure.

**Example:** `arr = [1, 1, 2, 3, 3, 4, 4, 8, 8]` → `2`.

### How to Think About the Problem
- **What should I notice first?** Pairs and parity. If I stand at the unique
  element, everything left of it is perfectly paired (first of each pair on an
  even index, second on odd). Everything right of it is also paired but the
  parity is *shifted*.
- **What is the monotonic boundary?** The unique element is the boundary.
  - Left of it: `arr[evenIndex] == arr[evenIndex + 1]` (pair starts on even).
  - Right of it: this starts to fail — a pair now starts on an odd index.
- **Can I eliminate half?** Yes — check the pair containing `mid`. Depending on
  whether that pair is "normal", the unique element is left or right.
- **Clue → Pattern:** *twice except once + sorted* → **Pattern 2: Boundary**,
  with a parity twist.

### Intuition (Brute → Optimal)
```text
Brute force: XOR everything -> the bulk element XORs away, O(n). (Or count array, O(n))
        ↓
Observation: pairs to the LEFT of the answer start on even indices;
pairs to the RIGHT start on odd indices. Parity is a monotonic boundary.
        ↓
Optimal: binary search on the parity boundary, O(log n). Binary search beats
XOR here because of the O(log n) win on a big array.
```

### Brute Force Approach (XOR)
```java
public int singleNonDuplicate(int[] arr) {
    int ans = 0;
    for (int v : arr) ans ^= v;   // x^x = 0, so pairs vanish
    return ans;
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** The parity structure is
binary-searchable in `O(log n)`.

### Optimal Approach

#### Core Observation
Number the indices 0-based. Before the unique element, every pair is
`(even, odd)`. After the unique element, every pair is `(odd, even)`.

So the predicate:
```text
"arr[2*i] == arr[2*i+1]" is TRUE to the left of the answer, FALSE to the right.
```
That is a **monotonic flip** — exactly what binary search eats for breakfast.

#### Pattern Identification
**Pattern 2: Boundary Search** on the parity structure (a clever disguise).

#### Step-by-Step Intuition
A clean trick: make `mid` always even (`mid -= mid % 2` effectively via
`if (mid % 2 == 1) mid--`). Then `arr[mid]` and `arr[mid + 1]` are a candidate pair.
- If they are equal → all pairs are normal up to here → unique element is to the
  right → `low = mid + 2`.
- If they differ → either `mid` is the unique element or the boundary is to the
  left → `high = mid`.

Loop with `while (low < high)`; when `low == high`, that index is the answer.

#### Dry Run
`arr = [1, 1, 2, 3, 3, 4, 4, 8, 8]`, `n = 9`

| Step | low | high | mid | mid made even | pair (arr[mid], arr[mid+1]) | equal? | action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 8 | 4 | 4 | (3, 4) | no | high = 4 |
| 2 | 0 | 4 | 2 | 2 | (2, 3) | no | high = 2 |
| 3 | 0 | 2 | 1 | 0 | (1, 1) | yes | low = 2 |
| 4 | 2 | 2 | — | — | — | — | **answer = arr[2] = 2** |

Edge case: `n = 1` → loop never runs, return `arr[0]`, the single element. Also
note `mid + 1` is always in bounds because the loop runs only while `low < high`,
so `mid < high ≤ n-1`.

#### Why Does It Work?
Before the unique element, pairs occupy even indices, so the "even pair" test
always passes. The unique element breaks the first pair it belongs to; after it,
pairing shifts by one, so the even-pair test always fails. The boundary of this
fail/pass is exactly the unique element, and the loop homes in on it.

#### Java Code
```java
public int singleNonDuplicate(int[] arr) {
    int low = 0, high = arr.length - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (mid % 2 == 1) mid--;              // make mid even: test "first of pair"
        if (arr[mid] == arr[mid + 1]) {       // normal pair -> boundary is right
            low = mid + 2;
        } else {                              // broken pair -> boundary here or left
            high = mid;
        }
    }
    return arr[low];
}
```

#### Complexity
**Time Complexity Calculation:** each step halves the range → **`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "every element appears exactly twice, one appears once" + SORTED
Pattern:       Boundary Binary Search (parity-flip boundary)
Mental model:  pairs start on EVEN indices to the left, ODD to the right;
               binary search the flip point, test using "arr[mid] == arr[mid^1-ish after making mid even]"
```

**Similar pattern:** Peak element (13) is the same "sequence flips direction" idea.

---

## 13. Find Peak Element

### Problem Understanding
An element is a **peak** if it is strictly greater than its neighbors. In an
array (NOT sorted), find **any** peak index. Assume `arr[i] != arr[i+1]` for all
`i` (edges compare with only one neighbor; a single element is its own peak).

- **Input:** `int[] arr` (any ordering), no equal neighbors
- **Output:** any peak index
- **Observation:** a peak *always exists* in any such array — walk ever-upward
  and you must stop at a peak or the end. This guarantee is what binary search exploits.

**Example:** `arr = [1, 2, 3, 1]` → `2` (3 > 2 and 3 > 1). `arr = [1, 2, 1, 3, 5, 6, 4]` → `5` (or `1`).

### How to Think About the Problem
- **What should I notice first?** The array is NOT sorted, so "compare with mid"
  from Problem 1 is useless. But the shape is mountaion-like and there is a
  guaranteed peak.
- **What is the monotonic property?** Compare `arr[mid]` with `arr[mid+1]`:
  - If `arr[mid] < arr[mid+1]`, we are on an up-slope → a peak MUST be to the
    right (to the right of `mid`).
  - If `arr[mid] > arr[mid+1]`, we are on a down-slope → a peak MUST be at
    `mid` or to the left.
  This is a monotone "where did the climb end" boundary.
- **Am I searching for an element, a boundary, or an answer?** A boundary (the
  top of a slope) — return any.
- **Clue → Pattern:** *peak / at least one greater then at least one smaller +
  guarantee of existence* → **Pattern 2 boundary search on slope direction**.

### Intuition (Brute → Optimal)
```text
Brute force: check every index against its neighbors, O(n).
        ↓
Observation: slope direction (up/down) between mid and mid+1 tells us
which half must contain a peak — guaranteed to exist.
        ↓
Optimal: binary search the slope top, O(log n).
```

### Brute Force Approach
```java
public int findPeakElement(int[] arr) {
    int n = arr.length;
    for (int i = 0; i < n; i++) {
        long left  = i - 1 >= 0 ? arr[i - 1] : Long.MIN_VALUE;
        long right = i + 1 < n  ? arr[i + 1] : Long.MIN_VALUE;
        if (arr[i] > left && arr[i] > right) return i;
    }
    return -1;   // unreachable: a peak always exists
}
```
**Time:** `O(n)`. **Space:** `O(1)`. **Why improve?** Existence guarantee enables half-elimination.

### Optimal Approach

#### Core Observation
If `arr[mid] < arr[mid+1]`, the array climbs at `mid`. Starting at `mid+1` and
walking right, the values either keep climbing (peak at the right edge) or turn
down at some point (that turn IS a peak). Either way a peak lies strictly to the
right. Symmetrically, `arr[mid] > arr[mid+1]` puts a peak at `mid` or to the left.

#### Pattern Identification
**Pattern 2: Boundary Search** — the "direction of slope" is the monotonic
predicate. (This is *not* a classic sorted-array search.)

#### Step-by-Step Intuition
1. `low = 0`, `high = n-1`.
2. `mid`. If `arr[mid] > arr[mid+1]`: peak in `[low..mid]` → `high = mid`.
3. Else: peak in `[mid+1..high]` → `low = mid + 1`.
4. Loop `while (low < high)`; answer is `low`. Note `mid+1` is always valid
   because the loop guarantees `mid < high ≤ n-1`.

This variant returns *a* peak; the guarantee of existence is what lets us discard
a half confidently.

#### Dry Run
`arr = [1, 2, 1, 3, 5, 6, 4]`

| Step | low | high | mid | arr[mid] vs arr[mid+1] | slope | action |
|---|---|---|---|---|---|---|
| 1 | 0 | 6 | 3 | 3 vs 5 → `<` | up | low = 4 |
| 2 | 4 | 6 | 5 | 6 vs 4 → `>` | down | high = 5 |
| 3 | 4 | 5 | 4 | 5 vs 6 → `<` | up | low = 5 |
| 4 | 5 | 5 | — | — | — | **peak = 5 (value 6)** |

Verify: neighbors of `6` are `5` and `4`, both smaller ✓.

#### Why Does It Work?
Two invariants, both always true:
1. `[low, high]` always contains at least one peak.
2. Each move preserves #1 because an up-slope at `mid` forces a future peak on
   the right and a down-slope forces one on the left or at `mid`.
When `low == high`, the single element is the peak.

#### Java Code
```java
public int findPeakElement(int[] arr) {
    int low = 0, high = arr.length - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] > arr[mid + 1]) high = mid;   // descending -> peak left side
        else low = mid + 1;                        // ascending -> peak right side
    }
    return low;
}
```

#### Complexity
**Time Complexity Calculation:** halves each step → **`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`** (no recursion).

### Pattern to Remember
```text
Problem clue:  "peak", guaranteed existence of at least one answer
Pattern:       Boundary Binary Search on slope direction (NOT a sorted search)
Mental model:  arr[mid] vs arr[mid+1] = direction of slope
               up -> answer right; down -> answer here or left
Similar:       Peak Element II (30) extends this to a 2D matrix
```

**Similar pattern:** Single Element (12) also uses a direction/boundary flip.

---

# PART D — Binary Search on Answer (Introduction)

## The "Binary Search on Answer" Mental Model (read this once)

Some problems don't ask you to search an *index*. They ask you to find *a value*
(the answer) that satisfies some rule. The trick:

```text
The answer lives in a known numeric range [low, high].
Pick mid = a candidate answer.
Ask a feasibility question: "does this candidate work?"
Because of monotonicity, "feasible(mid)" flips from false→true exactly once.
Move low/high based on feasibility. 
```

The pattern is always:

1. Establish the range of possible answers.
2. Define a `feasible(x)` check (this is the real work of the problem).
3. Binary search the smallest (or largest) feasible value.

The reason it's called "on answer" is that the *variable being binary-searched is
the answer itself*, not an index. Problems 14–25 are almost all this pattern dressed
up in different clothes.

---

## 14. Find Square Root of a Number

### Problem Understanding
Given a non-negative integer `n`, return the **floor** of `√n` (the largest
integer whose square is `<= n`).

- **Input:** `int n` (non-negative)
- **Output:** `int` floor of square root
- **Observations:** sqrt grows monotonically with `n`. The answer is between
  `0` and `n`. If we can test "is `mid² <= n`?", we can binary search.

**Example:** `n = 28` → `5` (5²=25 ≤ 28, 6²=36 > 28). `n = 0` → `0`. `n = 1` → `1`.

### How to Think About the Problem
- **Am I searching for an element, a boundary, or an answer?** An **answer value**.
- **What is the range?** `0..n`. (For `n >= 1`, `1..n`.)
- **What is the feasibility check?** `mid * mid <= n` — monotonic: once true, it
  stays true as `mid` grows smaller; once false, stays false as `mid` grows larger.
- **Am I looking for the largest feasible or smallest feasible?** The floor = the
  **largest** `mid` with `mid² <= n`.
- **Clue → Pattern:** *find the max x such that f(x) <= n, for monotonic f* →
  **Pattern 4: Binary Search on Answer**.

### Intuition (Brute → Optimal)
```text
Brute force: try 1, 2, 3, ... until i*i > n, answer is i-1, O(√n).
        ↓
Observation: the predicate "i*i <= n" is monotonic (true...true, false...false).
        ↓
Optimal: binary search the largest i with i*i <= n, O(log n).
```

### Brute Force Approach
```java
public int sqrtBrute(int n) {
    if (n < 2) return n;
    int i = 1;
    while ((long) i * i <= n) i++;   // stop at first i with i^2 > n
    return i - 1;
}
```
Walkthrough `n = 28`: `i=1,2,3,4,5` all pass (25 ≤ 28), `i=6` fails (36 > 28) →
return `5`. Correct.
**Time Complexity Calculation:** loop runs until `i ≈ √n` → **`O(√n)`**.
**Space Complexity Calculation:** **`O(1)`**.
**Why improve?** `√n` steps is huge for big `n`; the predicate is monotonic → log steps possible.

### Optimal Approach

#### Core Observation
`isOk(mid) = mid*mid <= n` is `true` for all mids `<= √n` and `false` after. We
want the last `true`. That is a boundary search on an answer value, not an index.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** — the first (and simplest) example of it.

#### Step-by-Step Intuition
1. `low = 1`, `high = n`.
2. `mid`. If `mid*mid <= n` → `mid` is a valid candidate; record `ans = mid` and try
   bigger values: `low = mid + 1`.
3. Else → `mid` too big: `high = mid - 1`.
4. Overflow guard: use `(long) mid * mid <= n` so that `mid²` for `mid` up to `n`
   (~2×10⁹ for int max) stays within `long`.

Overflow check: `(long) mid * mid` with `mid` up to `≈ 2^31` gives `≈ 4.6e18`,
which is inside `long`'s max of `9.2e18` — safe.

#### Dry Run
`n = 28`

| Step | low | high | mid | mid² | `<= 28`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 1 | 28 | 14 | 196 | false | high = 13 |
| 2 | 1 | 13 | 7 | 49 | false | high = 6 |
| 3 | 1 | 6 | 3 | 9 | true | ans = 3, low = 4 |
| 4 | 4 | 6 | 5 | 25 | true | ans = 5, low = 6 |
| 5 | 6 | 6 | 6 | 36 | false | high = 5 |
| 6 | 6 | 5 | — | loop ends | — | **ans = 5** |

#### Why Does It Work?
Invariant: `ans` = largest candidate seen with `ans² <= n`, and any *larger*
candidate remains in `[low, high]`. When the loop ends, nothing left in
`[low, high]` is feasible, so `ans` is the largest feasible value — the floor.

#### Java Code
```java
public int mySqrt(int n) {
    if (n < 2) return n;
    int low = 1, high = n, ans = 0;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if ((long) mid * mid <= n) {  // feasible: mid^2 fits under n
            ans = mid;                // candidate kept; try larger
            low = mid + 1;
        } else {
            high = mid - 1;           // mid too big
        }
    }
    return ans;
}
```

#### Complexity
**Time Complexity Calculation:** search space is `n` values, halved each step →
**`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "floor of square root", "largest x such that x^2 <= n"
Pattern:       Binary Search on Answer
Requirement:   monotonic check (mid*mid <= n is true-then-false as mid grows)
Mental model:  binary-search the VALUE, not an index; keep last feasible candidate
```

**Similar pattern:** EVERY problem in Part D/E — this is the seed of the whole family.

---

## 15. Find Nth Root of a Number

### Problem Understanding
Given integer `n` (the root degree) and integer `m`, return the integer part of
`m^(1/n)` — the largest integer `x` such that `x^n <= m`.

- **Input:** two ints: `n`, `m`
- **Output:** largest `x` with `x^n <= m`
- **Observations:** `x` is in `[1, m]` (for `m >= 1`). The check is monotonic in `x`.

**Example:** `n = 3`, `m = 27` → `3` (3³ = 27). `n = 4`, `m = 69` → `2` (2⁴=16 ≤ 69, 3⁴=81 > 69).

### How to Think About the Problem
- Same as Problem 14, but the feasibility test is `multiplication done n times`
  instead of a square.
- Watch for one trap: **`x^n` can overflow.** Guard the multiplication and stop
  early as soon as it exceeds `m`.
- **Clue → Pattern:** *nth root / largest x with x^n <= m* → **Pattern 4**.

### Intuition (Brute → Optimal)
```text
Brute force: try 1, 2, ... and compute powers until x^n > m, O(m^(1/n) * n).
        ↓
Observation: predicate "x^n <= m" is monotonic in x.
        ↓
Optimal: binary search x with an overflow-safe power check, O(log m * n).
```

### Brute Force Approach
```java
public int nthRootBrute(int n, int m) {
    for (int x = 1; x <= m; x++) {
        if (power(x, n) > m) return x - 1;
    }
    return m;
}
long power(int a, int b) {
    long res = 1;
    for (int i = 0; i < b; i++) res *= a;
    return res;
}
```
**Time Complexity Calculation:** up to `m^(1/n)` candidates each computing an
`O(n)` power → **`O(m^(1/n) · n)`**.
**Space Complexity Calculation:** **`O(1)`**.
**Why improve?** Monotonic predicate → binary search the exponent boundary.

### Optimal Approach

#### Core Observation
Binary search `x` in `[1, m]` using `powerWithinLimit(x, n, m)`: returns true if
`x^n <= m`, computed with overflow control.

#### Pattern Identification
**Pattern 4: Binary Search on Answer.**

#### Step-by-Step Intuition
1. `low = 1`, `high = m`.
2. Compute `mid`. If `mid^n <= m` → candidate, try larger: `low = mid + 1`.
3. Else → `high = mid - 1`.
4. `powerWithinLimit`: multiply `n` times; at each step if the running product
   already exceeds `m`, return false immediately. Since `m` is an int,
   the product never reaches values that overflow long *before* being caught
   (it exceeds `m ≈ 2^31` long before `9.2e18`).

#### Dry Run
`n = 4`, `m = 69`

| Step | low | high | mid | mid⁴ | `<= 69`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 1 | 69 | 35 | huge (≥ 69) | false | high = 34 |
| 2 | 1 | 34 | 17 | huge | false | high = 16 |
| 3 | 1 | 16 | 8 | 4096 | false | high = 7 |
| 4 | 1 | 7 | 4 | 256 | false | high = 3 |
| 5 | 1 | 3 | 2 | 16 | true | ans = 2, low = 3 |
| 6 | 3 | 3 | 3 | 81 | false | high = 2 |
| 7 | 3 | 2 | — | — | — | **ans = 2** |

#### Why Does It Work?
Identical to Problem 14: `x^n <= m` is false for small-enough `x`... careful — it
is true for small x and false for large x; we track the last `true`. The overflow
guard never miscounts because we bail on the first multiplication past `m`.

#### Java Code
```java
public int nthRoot(int n, int m) {
    int low = 1, high = m, ans = 0;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (powerWithinLimit(mid, n, m)) {  // feasible: mid^n <= m
            ans = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return ans;
}

// returns true if mid^n <= m, without overflowing
private boolean powerWithinLimit(int base, int exp, int limit) {
    long prod = 1;
    for (int i = 0; i < exp; i++) {
        prod *= base;
        if (prod > limit) return false;   // early exit: already too big
    }
    return true;
}
```

#### Complexity
**Time Complexity Calculation:** binary search over `m` values → `O(log m)`
iterations, each costing an `O(n)` power check → **`O(n · log m)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "nth root", "integer part of m^(1/n)"
Pattern:       Binary Search on Answer
Feasibility:   x^n <= m (monotonic in x)
Pitfall:       overflow -> multiply with early exit / long guards
Mental model:  identical to sqrt, just a heavier feasibility check
```

**Similar pattern:** Sqrt (14); the family explodes from here.

---

# PART E — Binary Search on Answer: Maximize/Minimize, Nature-Style

---

## 16. Koko Eating Bananas

### Problem Understanding
Koko has `n` piles of bananas. She eats at a constant **rate `k` bananas per
hour** (same speed every hour — but she can only eat from *one pile per hour*,
and if a pile has fewer than `k` bananas, she finishes it that hour and does not
move to another pile). She must finish **all** bananas within `h` hours. Find the
**minimum** possible `k`.

- **Input:** `int[] piles`, `int h`
- **Output:** minimum integer rate `k`
- **Observation:** the time a pile takes = `ceil(pile / k)` hours. The harder to
  see monotonic fact: *larger k → fewer hours.*

**Example:** `piles = [3, 6, 7, 11]`, `h = 8` → `4`.

### How to Think About the Problem
- **Am I searching for an element, a boundary, or an answer?** An **answer value**:
  the minimal speed.
- **What is the range of answers?** At minimum she must eat ≥ 1 per hour; at
  maximum, eating `max(piles)` per hour means every pile takes 1 hour — any bigger
  is pointless. So `k ∈ [1, max(piles)]`.
- **What is the monotonic predicate?** `canFinish(k, h): hours(k) <= h`. As `k`
  grows, `hours(k)` shrinks → predicate flips `false...false, true...true`.
- **Am I looking for the min or max feasible?** Minimum `k` that is feasible.
- **Clue → Pattern:** *minimum speed / minimum rate such that constraint holds* →
  **Pattern 4: Binary Search on Answer**.

### Intuition (Brute → Optimal)
```text
Brute force: try k = 1, 2, ... and compute hours each time — O(max(pile) * n).
        ↓
Observation: hours(k) is monotone decreasing in k -> feasibility flips once.
        ↓
Optimal: binary search k, each candidate costs O(n) to simulate. O(n * log(max)).
```

### Brute Force Approach
```java
public int minEatingSpeed(int[] piles, int h) throws IllegalArgumentException {
    int max = 0;
    for (int p : piles) max = Math.max(max, p);
    for (int k = 1; k <= max; k++) {
        if (hoursNeeded(piles, k) <= h) return k;
    }
    throw new IllegalArgumentException();  // unreachable: k = max always fits
}
int hoursNeeded(int[] piles, int k) {
    int hrs = 0;
    for (int p : piles) hrs += (p + k - 1) / k;   // ceil(p/k) without floating point
    return hrs;
}
```
The `(p + k - 1) / k` trick is `ceil(p / k)` in pure integers: adds `k-1` before
integer division. **Time:** `O(max(piles) · n)`. **Space:** `O(1)`.
**Why improve?** Feasibility is monotonic → binary search instead of stepping one by one.

### Optimal Approach

#### Core Observation
Feasibility is monotonic: if speed `k` works, every speed `k' > k` also works
(you'd eat even faster). So the feasible region is a right-ending interval and the
minimum feasible is a boundary — find it with binary search.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** with an `O(n)` feasibility simulation.

#### Step-by-Step Intuition
1. Range: `low = 1`, `high = max(piles)`.
2. `mid`. Compute `hours(mid) = Σ ceil(pile / mid)`.
   - `hours <= h` → feasible → record and try slower: `high = mid - 1`.
   - else → need more speed: `low = mid + 1`.
3. Return the last feasible candidate (`ans`).

This is the same skeleton as sqrt — only the feasibility function changed.

#### Dry Run
`piles = [3, 6, 7, 11]`, `h = 8`, `max = 11`

| Step | low | high | mid | hours(mid) | feasible (≤8)? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 1 | 11 | 6 | ceil(3/6)+ceil(6/6)+ceil(7/6)+ceil(11/6) = 1+1+2+2 = 6 | yes | ans=6, high=5 |
| 2 | 1 | 5 | 3 | 1+2+3+4 = 10 | no | low=4 |
| 3 | 4 | 5 | 4 | 1+2+2+3 = 8 | yes | ans=4, high=3 |
| 4 | 4 | 3 | — | — | — | **ans = 4** |

Check: rate 3 → 10 h > 8 ✗; rate 4 → 8 h ✓; so 4 is minimal. ✓

#### Why Does It Work?
Correctness = monotonicity + exhaustive range. Every `k < ans` fails (we moved
past them only when infeasible), and `hours(k)` is exact (ceil per pile, one pile
per hour). `ans` is therefore the smallest speed meeting the deadline. Note that
ceil means fractional last bites still cost a full hour — that's exactly why the
pile "≤ k bananas" rule matters.

#### Java Code
```java
public int minEatingSpeed(int[] piles, int h) {
    int max = 0;
    for (int p : piles) max = Math.max(max, p);
    int low = 1, high = max, ans = max;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (hoursNeeded(piles, mid) <= h) {   // feasible candidate
            ans = mid;
            high = mid - 1;                   // try a slower speed
        } else {
            low = mid + 1;                    // speed too slow, eat faster
        }
    }
    return ans;
}

private int hoursNeeded(int[] piles, int k) {
    int hrs = 0;
    for (int p : piles) hrs += (p + k - 1) / k;  // ceil(p/k) in integers
    return hrs;
}
```

#### Complexity
**Time Complexity Calculation:** binary search space is `max(piles)` wide →
`O(log max)` iterations; each iteration scans all `n` piles → **`O(n · log(max))`**.
**Space Complexity Calculation:** a few variables → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "minimum speed/rate", "finish within h hours/days"
Pattern:       Binary Search on Answer
Feasibility:   simulate the process with candidate k; check <= h
Mental model:  1) range = [1, max(batch)]  2) simulate  3) move based on feasibility
```

**Similar pattern:** The whole Part E: Bouquets (17), Divisor (18), Ship capacity
(19) — identical skeleton, different simulation.

---

## 17. Minimum Days to Make M Bouquets

### Problem Understanding
A garden has `n` flowers on a line. Flower `i` blooms on day `bloomDay[i]`.
You can take **`k` adjacent bloomed flowers** to tie **one bouquet**. You need
`m` bouquets total. Each flower is used once. Find the **minimum day** on which
you can make `m` bouquets.

- **Input:** `int[] bloomDay`, `int m`, `int k`
- **Output:** minimum day, or `-1` if impossible
- **Observations:**
  - If `m * k > n` → impossible (not enough flowers).
  - Blooming is monotone in time: on day `d`, a flower is available exactly if
    `bloomDay[i] <= d`.
  - The answer day is in `[min(bloomDay), max(bloomDay)]`.

**Example:** `bloomDay = [7, 7, 7, 7, 13, 11, 12, 7]`, `m = 2`, `k = 3` → `12`.

### How to Think About the Problem
- **Am I searching for a day (a value)?** Yes — the **minimum day**.
- **What is the range?** `[min bloom, max bloom]`.
- **What is the monotonic predicate?** `canMake(d, m, k)`: by day `d`, can we make
  `m` bouquets of size `k`? As `d` increases, more flowers are available, and the
  count of possible bouquets only grows → predicate flips false→true once.
- **Clue → Pattern:** *minimum day / minimum time* → **Pattern 4**.

### Intuition (Brute → Optimal)
```text
Brute force: simulate day by day from min to max, O((max-min) * n).
        ↓
Observation: more days => more blooms => feasibility monotone.
        ↓
Optimal: binary search the day; feasibility = O(n) consecutive-block scan.
```

### Brute Force Approach
```java
public int minDaysBrute(int[] bloomDay, int m, int k) {
    if ((long) m * k > bloomDay.length) return -1;
    int lo = Integer.MAX_VALUE, hi = 0;
    for (int d : bloomDay) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
    for (int day = lo; day <= hi; day++) {
        if (canMake(bloomDay, day, m, k)) return day;
    }
    return -1;
}
```
**Time:** `O((hi−lo) · n)` — worst case huge. **Space:** `O(1)`.
**Why improve?** The day axis is monotonic → binary search it.

### Optimal Approach

#### Core Observation
On a fixed day `d`, flowers with `bloomDay[i] <= d` are "on". The maximal number
of bouquets is obtained by splitting consecutive runs of on-flowers into blocks of
size `k` (greedy — no reason to leave gaps). Binary search `d`.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** with a longest-run feasibility scan.

#### Step-by-Step Intuition
1. If `m*k > n` → -1 (edge).
2. Range `low = min(bloomDay)`, `high = max(bloomDay)`.
3. `mid`. Scan the garden: count consecutive "on" flowers; every time the run
   reaches length `k`, make a bouquet and reset the run counter.
   - bouquets `>= m` → feasible day → try earlier: `high = mid - 1`.
   - else → `low = mid + 1`.
4. Return last feasible `ans`.

#### Dry Run
`bloomDay = [7, 7, 7, 7, 13, 11, 12, 7]`, `m = 2`, `k = 3`

Day 12: flowers `[7,7,7,7,13,11,12,7]` → on/off = `[on,on,on,on,off,on,on,on]`.
Run 1 = 4 flowers → 1 bouquet of 3 (1 leftover). Run 2 = 3 flowers → 1 bouquet.
Total 2 ✓ → day 12 feasible.

| Step | low | high | mid | bouquets(mid) | feasible? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 7 | 13 | 10 | day10: run1=4 on-flowers → 1 bouquet; trailing single 7 at index 7 → 0 → total 1 | no | low = 11 |
| 2 | 11 | 13 | 12 | run1=4→1, run2(at 11,12,7 → 3 flowers)=1 → 2 | yes | ans=12, high=11 |
| 3 | 11 | 11 | 11 | day11: on=[7,7,7,7,11] → run=5 → 1 bouquet (then 13,12 off) | no | low = 12 |
| 4 | 12 | 11 | — | — | — | **ans = 12** |

#### Why Does It Work?
Greedy block-packing is optimal for a fixed day: bouquets can only use adjacent
on-flowers, so splitting each maximal run into as many size-`k` groups as possible
is maximal no matter how you slice. Monotonicity then guarantees the binary search
returns the earliest feasible day.

#### Java Code
```java
public int minDays(int[] bloomDay, int m, int k) {
    if ((long) m * k > bloomDay.length) return -1;   // not enough flowers
    int low = Integer.MAX_VALUE, high = 0;
    for (int d : bloomDay) {
        low = Math.min(low, d);
        high = Math.max(high, d);
    }
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (canMake(bloomDay, mid, m, k)) {   // feasible by this day
            ans = mid;
            high = mid - 1;                   // try earlier
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

private boolean canMake(int[] bloomDay, int day, int m, int k) {
    int bouquets = 0, run = 0;
    for (int d : bloomDay) {
        if (d <= day) {                       // flower available
            run++;
            if (run == k) { bouquets++; run = 0; }   // close one bouquet
        } else {
            run = 0;                          // gap breaks adjacency
        }
    }
    return bouquets >= m;
}
```

#### Complexity
**Time Complexity Calculation:** search space is `max−min` days → `O(log(range))`
iterations; each iteration scans `n` flowers → **`O(n · log(range))`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "minimum days", "bloom", adjacency constraint on candidates
Pattern:       Binary Search on Answer
Feasibility:   greedy run-counting over the on/off sequence
Mental model:  1) range = [min, max]  2) feasibility via greedy blocks  3) search
```

**Similar pattern:** Koko (16), Smallest Divisor (18), Ship Capacity (19) —
"as day/amount grows, feasibility only improves".

---

## 18. Find the Smallest Divisor

### Problem Understanding
Given an array of integers and a threshold `limit`, choose a **divisor `d`** such
that `sum(ceil(nums[i] / d)) <= limit`. Find the **smallest** such `d`.

- **Input:** `int[] nums`, `int limit`
- **Output:** smallest integer divisor
- **Observations:**
  - As `d` grows, each `ceil(nums[i]/d)` shrinks → the sum is **monotone
    decreasing** in `d`.
  - If `d` is large enough, every term is 1, sum = `n`, so a `d` always exists
    provided `n <= limit`; the problem guarantees solvability (LeetCode 1283).

**Example:** `nums = [1, 2, 5, 9]`, `limit = 6` → `5` (at 5: 1+1+1+2 = 5 ≤ 6; at 4: 1+1+2+3 = 7 > 6).

### How to Think About the Problem
- **Am I searching for an answer value?** Yes — the smallest `d`.
- **What is the range?** `[1, max(nums)]` (beyond `max`, every term is 1, sum stops shrinking).
- **What is the monotonic predicate?** `canDiv(d): totalCeil(d) <= limit`:
  false for small `d`, true for large `d` → flips once.
- **Small-d or large-d feasible?** Large → find the **first feasible** (minimum).
- **Clue → Pattern:** *smallest divisor such that a threshold holds* →
  **Pattern 4**.

### Intuition (Brute → Optimal)
```text
Brute force: try d = 1, 2, ..., recompute the sum each time, O(max(nums)*n).
        ↓
Observation: total is monotone decreasing in d -> feasibility flips once.
        ↓
Optimal: binary search d, O(n * log(max)).
```

### Brute Force Approach
```java
public int smallestDivisorBrute(int[] nums, int limit) {
    int max = 0;
    for (int v : nums) max = Math.max(max, v);
    for (int d = 1; d <= max; d++) {
        if (totalCeil(nums, d) <= limit) return d;
    }
    return max;   // guaranteed to pass
}
int totalCeil(int[] nums, int d) {
    int sum = 0;
    for (int v : nums) sum += (v + d - 1) / d;   // ceil(v/d)
    return sum;
}
```
**Time:** `O(max(nums) · n)`. **Space:** `O(1)`. **Why improve?** Monotone sum → binary search the boundary.

### Optimal Approach

#### Core Observation
`totalCeil(d)` decreases monotonically with `d`. Binary search the `d` where the
sum first crosses below `limit`.

#### Pattern Identification
**Pattern 4: Binary Search on Answer.**

#### Step-by-Step Intuition
1. Range `low = 1`, `high = max(nums)`.
2. `mid`. Compute `totalCeil(mid)`.
   - `total <= limit` → feasible → try smaller denominator: `high = mid - 1`, record `ans`.
   - else → denominator too small → `low = mid + 1`.
3. Return `ans`.

#### Dry Run
`nums = [1, 2, 5, 9]`, `limit = 6`, `max = 9`

| Step | low | high | mid | totalCeil(mid) | `<= 6`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 1 | 9 | 5 | 1+1+1+2 = 5 | yes | ans=5, high=4 |
| 2 | 1 | 4 | 2 | 1+1+3+5 = 10 | no | low=3 |
| 3 | 3 | 4 | 3 | 1+1+2+3 = 7 | no | low=4 |
| 4 | 4 | 4 | 4 | 1+1+2+3 = 7 | no | low=5 |
| 5 | 5 | 4 | — | — | — | **ans = 5** |

#### Why Does It Work?
Exactly the "last feasible false → first feasible" boundary the loop tracks: all
`d < ans` fail, `ans` passes, and any larger `d` also passes (monotonicity), so
`ans` is minimal.

#### Java Code
```java
public int smallestDivisor(int[] nums, int limit) {
    int low = 1, high = 0;
    for (int v : nums) high = Math.max(high, v);
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (totalCeil(nums, mid) <= limit) {   // feasible divisor
            ans = mid;
            high = mid - 1;                    // try even smaller divisor
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

private int totalCeil(int[] nums, int d) {
    int sum = 0;
    for (int v : nums) sum += (v + d - 1) / d;  // ceil(v / d)
    return sum;
}
```

#### Complexity
**Time Complexity Calculation:** binary search over `max(nums)` values →
`O(log max)` iterations × `O(n)` sum each → **`O(n · log(max))`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "smallest divisor", "sum of ceilings <= threshold"
Pattern:       Binary Search on Answer
Feasibility:   totalCeil(d) = Σ ceil(nums[i]/d)  — monotone decreasing in d
Mental model:  same as Koko: minimize denominator so total work stays <= budget
```

**Similar pattern:** Koko (16), Ship Capacity (19) — feel the shared skeleton.

---

## 19. Capacity to Ship Packages Within D Days

### Problem Understanding
`weights[i]` = weight of package `i`. Packages must be shipped **in order** on a
conveyor belt: consecutive packages per day, each day's total `<= capacity`.
Ship everything within `days` days. Find the **minimum** ship capacity.

- **Input:** `int[] weights`, `int days`
- **Output:** minimum integer capacity
- **Observations:**
  - The heaviest single package must fit on day one → capacity `>= max(weights)`.
  - Shipping everything on one day needs `capacity = sum(weights)` → ultra upper bound.
  - As capacity grows, days needed **shrinks monotonically**.

**Example:** `weights = [1,2,3,4,5,6,7,8,9,10]`, `days = 5` → `15`.

### How to Think About the Problem
- **Am I searching for an answer value?** Yes — the minimum capacity.
- **What is the range?** `[max(weights), sum(weights)]`.
- **What is the monotonic predicate?** `canShip(c): daysNeeded(c) <= days` —
  larger `c` → fewer days → predicate flips false→true.
- **Clue → Pattern:** *minimum capacity / minimum "X" such that deadline met* →
  **Pattern 4**.

### Intuition (Brute → Optimal)
```text
Brute force: try every capacity from max to sum, simulate each, O(sum * n).
        ↓
Observation: days are monotone decreasing in capacity.
        ↓
Optimal: binary search capacity; simulate greedily per candidate, O(n * log(sum)).
```

### Brute Force Approach
```java
public int shipWithinDaysBrute(int[] weights, int days) {
    int max = 0, sum = 0;
    for (int w : weights) { max = Math.max(max, w); sum += w; }
    for (int c = max; c <= sum; c++) {
        if (daysNeeded(weights, c) <= days) return c;
    }
    return sum;
}
int daysNeeded(int[] weights, int capacity) {
    int daysUsed = 1, load = 0;
    for (int w : weights) {
        if (load + w > capacity) { daysUsed++; load = w; }  // new day, start with w
        else load += w;
    }
    return daysUsed;
}
```
**Time:** `O(sum(weights) · n)` — bad when sum is huge. **Space:** `O(1)`.
**Why improve?** Capacity axis is monotonic → binary search.

### Optimal Approach

#### Core Observation
For a fixed capacity, the *minimum number of days* is achieved by greedy
packing: fill each day to the brim in order (you cannot skip or permute, due to
the conveyor ordering), moving to a new day only when the next package doesn't
fit. Greedy is optimal here because packages are forced to keep their order.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** with an in-order packing simulation.

#### Step-by-Step Intuition
1. `low = max(weights)`, `high = sum(weights)`.
2. `mid`. Greedy-simulate days for capacity `mid`.
   - If `daysUsed <= days` → feasible → try smaller capacity: `high = mid - 1`, `ans = mid`.
   - Else → `low = mid + 1`.
3. Return `ans`.

#### Dry Run
`weights = [1,2,3,4,5,6,7,8,9,10]`, `days = 5`, `sum = 55`, `max = 10`

Showcasing the greedy packing math — e.g. for capacity 15:
```
day1: 1+2+3+4+5 = 15              (8 would exceed 15)
day2: 6+7 = 13        (8 would exceed 15)
day3: 8                (9 would exceed 15)
day4: 9                (10 would exceed 15)
day5: 10
=> 5 days
```
And for capacity 14:
```
day1: 1+2+3+4 = 10    day2: 5+6 = 11    day3: 7    day4: 8    day5: 9    day6: 10
=> 6 days  (too many)
```

| Step | low | high | mid | daysNeeded(mid) | feasible (≤5)? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 10 | 55 | 32 | day1:1-7=28; day2:8-10=27 → 2 | yes | ans=32, high=31 |
| 2 | 10 | 31 | 20 | day1:1-5=15; day2:6-7=13; day3:8-9=17; day4:10 → 4 | yes | ans=20, high=19 |
| 3 | 10 | 19 | 14 | day1:1-4=10; day2:5-6=11; day3:7; day4:8; day5:9; day6:10 → 6 | no | low=15 |
| 4 | 15 | 19 | 17 | day1:1-5=15; day2:6-7=13; day3:8-9=17; day4:10 → 4 | yes | ans=17, high=16 |
| 5 | 15 | 16 | 15 | day1:1-5; day2:6-7; day3:8; day4:9; day5:10 → 5 | yes | ans=15, high=14 |
| 6 | 15 | 14 | — | — | — | **ans = 15** |

So capacity 15 works and 14 does not → 15 is the minimum feasible.

#### Why Does It Work?
Greedy packing gives the true minimum days for a capacity (no reordering allowed).
Monotonicity of days in capacity lets binary search converge to the smallest
capacity with `days <= target`.

#### Java Code
```java
public int shipWithinDays(int[] weights, int days) {
    int low = 0, high = 0;
    for (int w : weights) {
        low = Math.max(low, w);     // heaviest must fit alone
        high += w;                  // all on one trip
    }
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (daysNeeded(weights, mid) <= days) {   // feasible capacity
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

private int daysNeeded(int[] weights, int capacity) {
    int used = 1, load = 0;
    for (int w : weights) {
        if (load + w > capacity) { used++; load = w; }  // overflow to next day
        else load += w;
    }
    return used;
}
```

#### Complexity
**Time Complexity Calculation:** search space `sum(weights) - max(weights) + 1`
→ `O(log(sum))` iterations; each iteration is one `O(n)` pass → **`O(n · log(sum))`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "minimum capacity", "ship all within D days", "in order"
Pattern:       Binary Search on Answer
Feasibility:   greedy in-order packing; days(capacity) is monotone ↓
Mental model:  low = max item, high = sum, simulate with a greedy loader
```

**Similar pattern:** Book Allocation (22), Split Array (23), Painter (24) — all
the same "cut a sequence into k parts with bounded sum" shape.

---

## 20. Kth Missing Positive Number

### Problem Understanding
Given a **strictly increasing** array `arr` of positive integers and an integer
`k`, find the **k-th positive integer that is missing** from the array. Missing
means absent from the array (starting from 1, 2, 3, ...).

- **Input:** sorted `int[] arr` (strictly increasing), `int k`
- **Output:** the k-th missing positive number
- **Observations:** numbers not in `arr`, in natural order; e.g. missing set for
  `[2,3,4,7,11]` is `{1, 5, 6, 8, 9, 10, 12, ...}`.

**Example:** `arr = [2, 3, 4, 7, 11]`, `k = 5` → `9`.

### How to Think About the Problem
- **What should I notice first?** The array is sorted, but the answer is a *value*
  built from a running difference — that's a strong hint to express missing-count
  per index.
- **Key observation — "missing so far" at index `i`:**
  ```text
  missing(i) = arr[i] - (i + 1)
  ```
  Because if there were no missing numbers, the array would read `1,2,3,...` and
  `arr[i]` would equal `i+1`. Any gap is exactly the missing count.
- **Is `missing(i)` monotonic?** Yes — as `i` grows, the count of missing numbers
  only increases (array is increasing). Flip point: index where `missing` first
  reaches `>= k`.
- **Clue → Pattern:** *k-th missing in a sorted array* → **binary search that
  flip point** (Pattern 2 energy, BS-on-answer flavor).

### Intuition (Brute → Optimal)
```text
Brute force: walk the number line 1,2,3,... and skip present numbers; O(n + k).
        ↓
Observation: missing(i) = arr[i] - (i+1) is monotone and computable in O(1).
        ↓
Optimal: binary search the index where missing(i) crosses k, then compute the
answer in O(1). Total O(log n).
```

### Brute Force Approach
```java
public int findKthPositiveBrute(int[] arr, int k) {
    int num = 1, i = 0, missed = 0;
    // feed natural numbers, count the ones that are missing
    while (missed < k) {
        if (i < arr.length && arr[i] == num) i++;   // present in arr
        else missed++;                              // not present -> it's missing
        num++;
    }
    return num - 1;
}
```
Walkthrough `arr = [2,3,4,7,11]`, `k=5`: missing count hits 5 at `num=9` →
return 9 ✓. **Time:** `O(n + k)` (max one pass over arr plus k misses).
**Space:** `O(1)`. **Why improve?** `missing(i)` is monotone → binary search.

### Optimal Approach

#### Core Observation
Compute `missing(i) = arr[i] - (i + 1)` for the middle element. If
`missing(mid) < k`, then by index `mid` we haven't yet encountered the k-th
missing number → it lies to the **right**. Otherwise move left.

After the loop, `low` is the first index where `missing >= k`. Let
`more = k - missing(low - 1)` = how many missing numbers to count from the edge of
the last "safe" element. Then the answer is `arr[low - 1] + more`. Since
`missing(low - 1) < k`, this simplifies to the clean formula:

```text
answer = low + k
```

derivation: `answer = arr[low-1] + (k - (arr[low-1] - low)) = k + low`.

Wait, check: `missing(low-1) = arr[low-1] - low`. Then `answer = arr[low-1] +
(k - missing(low-1)) = arr[low-1] + k - arr[low-1] + low = k + low`. Neat —
only needs `low`, not the array contents!

When no index ever reaches `missing >= k` (k-th missing is beyond the whole
array), `low` ends at `n` and the same formula gives `n + k` which is correct
(all n array elements are "safe", count k more from `arr[n-1]`).

#### Pattern Identification
**Boundary Binary Search** (the flip of `missing(i) >= k`) — a concise instance of
"search the monotone gap function".

#### Step-by-Step Intuition
1. `low = 0`, `high = n - 1`.
2. `mid`. If `arr[mid] - (mid + 1) < k` → more missing needed → `low = mid + 1`.
   Else → `high = mid - 1`.
3. Return `low + k`.

#### Dry Run
`arr = [2, 3, 4, 7, 11]`, `k = 5`

| Step | low | high | mid | missing(mid) | `< 5`? | action |
|---|---|---|---|---|---|---|
| 1 | 0 | 4 | 2 | 4 - 3 = 1 | yes | low = 3 |
| 2 | 3 | 4 | 3 | 7 - 4 = 3 | yes | low = 4 |
| 3 | 4 | 4 | 4 | 11 - 5 = 6 | no | high = 3 |
| 4 | 4 | 3 | — | loop ends | — | **answer = low + k = 4 + 5 = 9** |

Mental check: missing set `{1, 5, 6, 8, 9, ...}` → 5th = 9 ✓.

Second example: `arr = [1, 2, 3, 4]`, `k = 2` → missing set `{5, 6, ...}`.
missing(i) for i=0..3: 0,0,0,0 all `< 2` → low climbs to 4 → answer = 4 + 2 = 6 ✓.

#### Why Does It Work?
Because `missing(i)` is non-decreasing, the loop's invariant is:

```text
missing(low - 1) < k <= missing(high + 1)   (with sentinels at both ends)
```

After the loop, `low` is the exact boundary = the number of "safe" elements that
are `<= the k-th missing number`. Adding `k` to it yields the k-th missing value
(derivation above), including the beyond-the-end case.

#### Java Code
```java
public int findKthPositive(int[] arr, int k) {
    int low = 0, high = arr.length - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        int missing = arr[mid] - (mid + 1);       // missing numbers up to mid
        if (missing < k) low = mid + 1;           // need to go further right
        else high = mid - 1;
    }
    return low + k;   // k-th missing number
}
```

#### Complexity
**Time Complexity Calculation:** single binary search over `n` indices →
**`O(log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "k-th missing", strictly increasing array
Pattern:       Boundary Binary Search on the gap function
Feasibility:   missing(i) = arr[i] - (i + 1) — monotone increasing
Mental model:  count missing-so-far; binary search where it reaches k;
               answer = k + (number of safe predecessors)
```

**Similar pattern:** conceptually a first/last-boundary twin (6); value-side
siblings are Insert Position (4).

---

# PART F — Binary Search on Answer: Minimize the Maximum Gap / Workload

These four problems (21–24) are the same problem wearing different costumes:

```text
Problem 21: place C cows, maximize minimum distance.     (MAX the MIN gap, sorted positions)
Problem 22: split books into M students, minimize max pages. (MIN the MAX workload, in order)
Problem 23: split array into K parts, minimize max sum.       (MIN the MAX, in order)
Problem 24: paint boards with K painters, minimize max time.  (MIN the MAX, in order)
```

21 is "**maximize the minimum**" — a *distribution* problem on positions.
22–24 are "**minimize the maximum**" — *cut sequence into K chunks* problems.
All of them use Binary Search on Answer + a greedy feasibility check.

---

## 21. Aggressive Cows

### Problem Understanding
Given `n` stalls at positions `stalls[i]` (arbitrary order, must sort) and `c`
aggressive cows, place the cows in distinct stalls so that the **minimum distance
between any two cows is as large as possible**. Return that maximum minimum
distance.

- **Input:** `int[] stalls`, `int c`
- **Output:** the largest possible minimum distance
- **Observations:**
  - Sort the stalls first — the problem is about gaps, order on the line matters.
  - Minimum distance is `>= 1` and `<= stalls[n-1] - stalls[0]`.

**Example:** `stalls = [0, 3, 4, 7, 9, 10]`, `c = 4` → `3`.

### How to Think About the Problem
- **Am I searching for an element, a boundary, or an answer?** An **answer**:
  a distance value.
- **What is the range?** `[1, maxPos - minPos]`.
- **What is the monotonic predicate?** `canPlace(dist)`: can we place `c` cows so
  every two are `>= dist` apart? If `dist` works, any *smaller* `dist` also works
  (easier) → predicate is `true...true, false...false` as dist grows.
- **Do I want the largest feasible or smallest?** Largest feasible `dist`.
- **Clue → Pattern:** *maximize the minimum* → **Pattern 4: Binary Search on Answer**.

### Intuition (Brute → Optimal)
```text
Brute force: for every distance d from 1 to max-min, test placement — O((max-min) * n).
        ↓
Observation: monotonic: big d fails, small d succeeds (greedy placement works).
        ↓
Optimal: binary search d; feasibility = greedy cow placement in O(n).
```

### Brute Force Approach
```java
public int aggressiveCowsBrute(int[] stalls, int c) {
    Arrays.sort(stalls);
    int maxDist = stalls[stalls.length - 1] - stalls[0];
    for (int d = maxDist; d >= 1; d--) {
        if (canPlace(stalls, c, d)) return d;   // first feasible from top
    }
    return 1;
}
```
**Time:** `O((max-min) · n)` after sorting. **Space:** `O(1)`.
**Why improve?** Placement feasibility is monotonic → binary search the distance.

### Optimal Approach

#### Core Observation
To test a distance `d`, place the first cow at the leftmost stall, then greedily
place each next cow at the **earliest** stall that is at least `d` away from the
previous cow. This greedy is optimal: starting earlier never hurts future
placements. Count how many cows fit; if `>= c`, `d` works.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** (the "maximize the minimum" flavor),
with greedy-positioning feasibility.

#### Step-by-Step Intuition
1. Sort stalls.
2. Range `low = 1`, `high = stalls[n-1] - stalls[0]`.
3. `mid`. Greedy place:
   - `last = stalls[0]`, `placed = 1` (first cow seated immediately).
   - For each stall, if `stall - last >= mid`, place a cow here: `placed++`,
     `last = thisStall`.
   - If `placed >= c` → feasible → try larger distance: `ans = mid`, `low = mid + 1`.
   - Else → `high = mid - 1`.
4. Return `ans` (largest feasible).

#### Dry Run
`stalls = [0, 3, 4, 7, 9, 10]`, `c = 4`

| Step | low | high | mid | greedy cow count at dist=mid | `>= c=4`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 1 | 10 | 5 | 0 → 7 → (9,10 too close) → 2 cows | no | high = 4 |
| 2 | 1 | 4 | 2 | 0 → 3 → 7 → 9 → 4 cows | yes | ans=2, low=3 |
| 3 | 3 | 4 | 3 | 0 → 3 → 7 → 10 → 4 cows | yes | ans=3, low=4 |
| 4 | 4 | 4 | 4 | 0 → 4 → 9 → only 3 cows | no | high = 3 |
| 5 | 4 | 3 | — | — | — | **ans = 3** |

Sanity check on the boundaries: distance 3 allows cows at `0, 3, 7, 10` (4 cows ✓),
but distance 4 only allows `0, 4, 9` (3 cows ✗) → maximum minimum distance is 3.

#### Why Does It Work?
Greedy placement achieves the maximum possible number of cows for a fixed `d`
(start-as-early-as-possible never hurts), so `canPlace` is exact. Monotonicity
then lets binary search return the largest feasible `d`.

#### Java Code
```java
public int aggressiveCows(int[] stalls, int c) {
    Arrays.sort(stalls);
    int low = 1;
    int high = stalls[stalls.length - 1] - stalls[0];
    int ans = 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (canPlace(stalls, c, mid)) {   // mid min-distance is achievable
            ans = mid;
            low = mid + 1;                // try a bigger distance
        } else {
            high = mid - 1;
        }
    }
    return ans;
}

// can we place c cows so every pair is at least dist apart? (greedy)
private boolean canPlace(int[] stalls, int c, int dist) {
    int last = stalls[0];
    int placed = 1;                        // first cow at leftmost stall
    for (int i = 1; i < stalls.length; i++) {
        if (stalls[i] - last >= dist) {    // far enough from the previous cow
            placed++;
            last = stalls[i];
            if (placed == c) return true;  // all cows seated
        }
    }
    return false;
}
```

#### Complexity
**Time Complexity Calculation:** sort `O(n log n)` + binary search over the
distance range `(max-min)` in `O(log(range))` iterations × `O(n)` greedy check →
**`O(n log n + n log(range))`**, commonly written **`O(n log n)`** if range is
bounded by position span (which it is, ≤ max position value).
**Space Complexity Calculation:** **`O(1)`** (sorting in place).

### Pattern to Remember
```text
Problem clue:  "maximize the minimum distance", "place C objects apart as far as possible"
Pattern:       Binary Search on Answer (MAX the MIN family)
Feasibility:   greedy early placement; count placed >= c
Mental model:  distance is the answer; can-can-dist(d) flips true→false; take last true
```

**Similar pattern:** 22–24 are the mirror-image MIN-the-MAX family; Koko (16)
and the rest of Part E share the same skeleton.

---

## 22. Book Allocation Problem

### Problem Understanding
There are `n` books with `pages[i]` pages (given) and `m` students. Books must be
assigned **consecutively** — each student gets a contiguous block of books — and
every book goes to exactly one student. We want to **minimize the maximum total
pages any student gets**.

- **Input:** `int[] pages`, `int m` (students)
- **Output:** the minimized maximum pages per student
- **Observations:**
  - `m <= n` required; if `m > n` → impossible (`-1`).
  - Capacity `>= max(pages)` (the heaviest book alone must fit one student) and
    `<= sum(pages)` (one student takes all).
  - As capacity grows, students needed shrinks → monotone.

**Example:** `pages = [12, 34, 67, 90]`, `m = 2` → `113`.
(E.g., student A gets `[12,34,67]=113`, student B gets `[90]`.)

### How to Think About the Problem
- **Am I searching for an answer value?** Yes — a maximum pages value (capacity).
- **What is the range?** `[max(pages), sum(pages)]`.
- **What is the monotonic predicate?** `canAllocate(cap): number of students needed <= m`
  under greedy allocation. Larger cap → fewer students → predicate flips
  false→true.
- **Find the min or max feasible?** The **minimum** feasible capacity.
- **Clue → Pattern:** *minimize the maximum workload* → **Pattern 4**, greedy chunking.

### Intuition (Brute → Optimal)
```text
Brute force: try every capacity from max to sum, allocate greedily, O(sum * n).
        ↓
Observation: needed-students(cap) is monotone decreasing in cap.
        ↓
Optimal: binary search capacity; feasibility = O(n) greedy allocation.
```

### Brute Force Approach
```java
public int bookAllocationBrute(int[] pages, int m) {
    int max = 0, sum = 0;
    for (int p : pages) { max = Math.max(max, p); sum += p; }
    for (int cap = max; cap <= sum; cap++) {
        if (studentsNeeded(pages, cap) <= m) return cap;
    }
    return -1;
}
```
**Time:** `O(sum · n)`. **Space:** `O(1)`. **Why improve?** Monotone need → binary search.

### Optimal Approach

#### Core Observation
For a fixed capacity, the *minimum* number of students is found greedily: give
books to the current student until the next book would exceed the capacity,
then move to a new student. Greedy is optimal because books must stay consecutive
— there is no advantage to splitting a block early.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** ("minimize the maximum" flavor),
feasibility = greedy consecutive-block packing.

#### Step-by-Step Intuition
1. `low = max(pages)`, `high = sum(pages)`.
2. `mid`. Greedily count students needed at that capacity.
3. If `needed <= m` → feasible → `ans = mid`, `high = mid - 1` (try smaller max).
4. Else → `low = mid + 1`.

#### Dry Run
`pages = [12, 34, 67, 90]`, `m = 2`

| Step | low | high | mid | studentsNeeded(mid) | `<= 2`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 90 | 203 | 146 | [12+34+67=113, 90] → 2 | yes | ans=146, high=145 |
| 2 | 90 | 145 | 117 | [12+34+67=113, 90] → 2 | yes | ans=117, high=116 |
| 3 | 90 | 116 | 103 | [12+34=46, 67, 90] → 3 | no | low=104 |
| 4 | 104 | 116 | 110 | [12+34+67=113>110 → 12+34=46; 67; 90] → 3 | no | low=111 |
| 5 | 111 | 116 | 113 | [12+34+67=113, 90] → 2 | yes | ans=113, high=112 |
| 6 | 111 | 112 | 111 | 12+34=46, 67, 90 → 3 | no | low=112 |
| 7 | 112 | 112 | 112 | [12+34=46, 67, 90] → 3 | no | low=113 |
| 8 | 113 | 112 | — | — | — | **ans = 113** |

Let me sanity-check capacity 112: 12+34=46, +67=113>112 → block [12,34]; 67; 90 → 3
students ✗. Capacity 113: 12+34+67=113, then 90 → 2 students ✓. So 113 minimal ✓.

#### Why Does It Work?
Greedy chunking gives the true minimal student count for a capacity, so the
feasibility test is exact. Monotonicity guarantees the binary search finds the
smallest capacity meeting the `m`-student limit. If `m > n`, even capacity `sum`
needs `n` students > m → return -1 upfront (edge).

#### Java Code
```java
public int allocateBooks(int[] pages, int m) {
    if (m > pages.length) return -1;              // more students than books
    int low = 0, high = 0;
    for (int p : pages) {
        low = Math.max(low, p);                   // heaviest book must fit
        high += p;                                // one student takes all
    }
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (studentsNeeded(pages, mid) <= m) {    // feasible max-pages
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

private int studentsNeeded(int[] pages, int cap) {
    int students = 1, load = 0;
    for (int p : pages) {
        if (load + p > cap) { students++; load = p; }   // start new block
        else load += p;
    }
    return students;
}
```

#### Complexity
**Time Complexity Calculation:** binary search over `sum(pages)` choices →
`O(log(sum))` iterations × `O(n)` greedy check → **`O(n · log(sum))`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "minimize the maximum pages", "consecutive assignment", "M students"
Pattern:       Binary Search on Answer (MIN the MAX family)
Feasibility:   greedy consecutive blocks; block count <= m
Mental model:  capacity is the answer; needed-studs(cap) monotone ↓; take first true
```

**Similar pattern:** Identical to 23 and 24. Ship (19) too.

---

## 23. Split Array — Largest Sum

### Problem Understanding
Given an array of non-negative integers and a number `k`, split it into `k`
**contiguous** subarrays (empty pieces not allowed) so that the **largest sum
among the subarrays is minimized**. Return that minimized largest sum.

- **Input:** `int[] nums`, `int k`
- **Output:** the minimized maximum subarray sum
- **Observation:** this is the *exact same problem* as Book Allocation (22):
  books = array, students = `k`, pages = values. Every trick transfers.

**Example:** `nums = [7, 2, 5, 10, 8]`, `k = 2` → `18` (split `[7,2,5]` + `[10,8]`).

### How to Think About the Problem
- **Am I searching for an answer value?** Yes — the largest allowed subarray sum.
- **Range?** `[max(nums), sum(nums)]`.
- **Monotonic predicate?** `canSplit(cap): number of chunks needed <= k`.
- **Min or max feasible?** Minimum feasible.
- **Clue → Pattern:** *minimize the maximum sum of k subarrays* →
  **Pattern 4**, identical skeleton to 22.

### Intuition (Brute → Optimal)
```text
Brute force: enumerate all split points — exponential (choose k-1 cuts), O(n^(k-1)).
        ↓
Observation: "minimize max" + greedy-testable feasibility => BS on answer.
        ↓
Optimal: binary search the max-sum cap, greedy split to count parts, O(n log(sum)).
```

### Brute Force Approach
Try all ways to place `k-1` cuts — a combinatorial explosion. For `n=8, k=4`
that is `C(7,3)=35` splits, each `O(k)` to score → explodes for large `n`.
```java
// illustrative only — exponential
public int splitArrayBrute(int[] nums, int k) {
    // recursion over cut positions
    return brute(nums, 0, k);
}
int brute(int[] nums, int start, int parts) {
    if (parts == 1) {
        int s = 0;
        for (int i = start; i < nums.length; i++) s += nums[i];
        return s;
    }
    int best = Integer.MAX_VALUE, sum = 0;
    for (int i = start; i < nums.length - parts + 1; i++) {
        sum += nums[i];                                          // [start..i] is one part
        best = Math.min(best, Math.max(sum, brute(nums, i + 1, parts - 1)));
    }
    return best;
}
```
**Time Complexity Calculation:** number of ways to place `k-1` cuts among `n-1`
gaps = `C(n-1, k-1)` → **exponential**.
**Space Complexity Calculation:** `O(k)` for the recursion stack.
**Why improve?** "Minimize the maximum" + monotone
feasibility → binary search.

### Optimal Approach

#### Core Observation
If every part must have sum `<= cap`, the minimum number of parts needed is
obtained greedily (pack as much as fits, then start a new part). If that minimum
`<= k`, then `cap` works. Binary search `cap`.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** — literally Book Allocation.

#### Step-by-Step Intuition
1. `low = max(nums)`, `high = sum(nums)`.
2. `mid`. Greedy-cut: count parts needed when max part sum is `mid`.
3. If parts `<= k` → `ans = mid`, `high = mid - 1`; else `low = mid + 1`.

#### Dry Run
`nums = [7, 2, 5, 10, 8]`, `k = 2`, `sum = 32`, `max = 10`

First, intuition check on the answer: with 2 parts the only cuts are after index 1
(`[7,2]`+`[5,10,8]` → max 25), 2 (`[7,2,5]`+`[10,8]` → max 18), or 3
(`[7,2,5,10]`+`[8]` → max 24). The minimized maximum is 18.

| Step | low | high | mid | partsNeeded(mid) | `<= 2`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 10 | 32 | 21 | [7+2+5],[10+8] → 2 | yes | ans=21, high=20 |
| 2 | 10 | 20 | 15 | [7+2+5],[10],[8] → 3 | no | low=16 |
| 3 | 16 | 20 | 18 | [7+2+5],[10+8] → 2 | yes | ans=18, high=17 |
| 4 | 16 | 17 | 16 | [7+2+5],[10],[8] → 3 | no | low=17 |
| 5 | 17 | 17 | 17 | [7+2+5],[10],[8] → 3 | no | low=18 |
| 6 | 18 | 17 | — | — | — | **ans = 18** |

#### Why Does It Work?
Same as 22: greedy chunking minimizes parts for a cap; binary search the smallest
cap with parts ≤ k. Also note `low = max(nums)` because a single element larger
than the cap can never fit in any part.

#### Java Code
```java
public int splitArray(int[] nums, int k) {
    int low = 0, high = 0;
    for (int v : nums) {
        low = Math.max(low, v);
        high += v;
    }
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (partsNeeded(nums, mid) <= k) {    // feasible max-subarray-sum
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

private int partsNeeded(int[] nums, int cap) {
    int parts = 1, sum = 0;
    for (int v : nums) {
        if (sum + v > cap) { parts++; sum = v; }
        else sum += v;
    }
    return parts;
}
```

#### Complexity
**Time Complexity Calculation:** `O(log(sum))` iterations × `O(n)` greedy →
**`O(n · log(sum))`**. Contrast the exponential brute force!
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "split into k contiguous subarrays", "minimize the largest sum"
Pattern:       Binary Search on Answer (MIN the MAX), greedy chunk feasibility
Mental model:  identical to Book Allocation; only the story changed.
```

**Similar pattern:** Book Allocation (22), Painter's Partition (24), Ship (19).

---

## 24. Painter's Partition

### Problem Understanding
We have `n` boards of length `boards[i]` and `p` painters. Each painter paints a
**contiguous block** of boards. Painting 1 unit takes 1 unit of time. All painters
work **in parallel**, so the total time = the **maximum** time any painter works.
Find the **minimum total time** (i.e., minimize the maximum sum for a painter).

- **Input:** `int[] boards`, `int p`
- **Output:** minimum possible (maximum) paint time
- **Observation:** parallel → total time is the max workload → identical shape to
  22/23. Contiguous constraint again.

**Example:** `boards = [10, 20, 30, 40]`, `p = 2` → `60`.

### How to Think About the Problem
- **Am I searching for an answer value?** Yes, a time limit per painter.
- **Range?** `[max(boards), sum(boards)]`.
- **Monotonic predicate?** `canPaint(timeLimit): painters needed <= p`, and needs
  shrink as the limit grows.
- **Clue → Pattern:** *minimize the maximum time with parallel workers + contiguous
  chunks* → **Pattern 4**, same greedy chunk feasibility as 22/23.

### Intuition (Brute → Optimal)
```text
Brute force: exponential over cut positions, like 23.
        ↓
Observation: parallel time = max worker load; "minimize the max" again.
        ↓
Optimal: BS on time limit + greedy contiguous assignment.
```

### Brute Force Approach
Same exponential cut-enumeration as Problem 23 — skip re-deriving it. Read 23's
brute force; it is structurally identical (`Time: exponential`, `Space: O(p)`).

### Optimal Approach

#### Core Observation
With a time limit `mid`, each painter should paint as many consecutive boards as
fit — that minimizes the painter count needed. Feasibility = `painters(mid) <= p`.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** — the third twin of 22/23.

#### Step-by-Step Intuition
1. `low = max(boards)`, `high = sum(boards)`.
2. `mid` → greedy count painters.
3. `<= p` → feasible → `ans = mid`, `high = mid - 1`; else `low = mid + 1`.

#### Dry Run
`boards = [10, 20, 30, 40]`, `p = 2`, `sum = 100`, `max = 40`

| Step | low | high | mid | paintersNeeded(mid) | `<= 2`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 40 | 100 | 70 | [10+20+30=60], [40] → 2 | yes | ans=70, high=69 |
| 2 | 40 | 69 | 54 | [10+20=30], [30+40=70>54 → 30], [40] → 3 | no | low=55 |
| 3 | 55 | 69 | 62 | [10+20+30=60], [40] → 2 | yes | ans=62, high=61 |
| 4 | 55 | 61 | 58 | [10+20+30=60>58 → 10+20=30], [30], [40] → 3 | no | low=59 |
| 5 | 59 | 61 | 60 | [10+20+30=60], [40] → 2 | yes | ans=60, high=59 |
| 6 | 59 | 59 | 59 | [10+20=30+30=60>59 → 10+20=30],[30],[40] → 3 | no | low=60 |
| 7 | 60 | 59 | — | — | — | **ans = 60** |

Verify: time limit 60 → painter1 `[10,20,30]`=60, painter2 `[40]` → max 60. Time
limit 59 → 3 painters needed ✗. So 60 is minimal ✓.

#### Why Does It Work?
Same correctness recipe as 22/23: greedy is the minimal supply of painters for a
limit; binary search finds the smallest limit meeting `p`. Because painters work
in parallel, minimizing the largest block = minimizing total time.

#### Java Code
```java
public int minTime(int[] boards, int p) {
    int low = 0, high = 0;
    for (int b : boards) {
        low = Math.max(low, b);
        high += b;
    }
    int ans = high;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (paintersNeeded(boards, mid) <= p) {   // feasible time limit
            ans = mid;
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

private int paintersNeeded(int[] boards, int limit) {
    int painters = 1, sum = 0;
    for (int b : boards) {
        if (sum + b > limit) { painters++; sum = b; }
        else sum += b;
    }
    return painters;
}
```

#### Complexity
**Time Complexity Calculation:** `O(log(sum))` iterations × `O(n)` greedy →
**`O(n · log(sum))`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "minimize the maximum time", "parallel workers", "contiguous segments"
Pattern:       Binary Search on Answer (MIN the MAX), greedy chunking
Mental model:  identical to Book Allocation & Split Array — change the nouns only
```

**Similar pattern:** 19, 22, 23. Four problems, one brain.

---

## 25. Minimize Max Distance to Gas Station

### Problem Understanding
There are `n` fuel stations on a line at positions `stations[i]` (sorted). We may
add **`k` new stations** anywhere. We want to place them so that the **maximum
distance between any two adjacent stations is minimized**. Return that minimized
maximum distance as a **double**.

- **Input:** sorted `int[] stations`, `int k`
- **Output:** minimized largest gap, a double
- **Observations:**
  - Adding stations only ever *shrinks* a gap (you split an interval).
  - The current largest gap is an upper bound; `0` (or `1e-6` tolerance) is the floor.
  - **Monotonic predicate:** `canSplit(gap): total new stations needed <= k` —
    if we require every gap `<= gapSize`, the number of stations needed to split a
    gap of length `d` is `ceil(d / gapSize) - 1`. Larger `gapSize` → fewer stations
    needed → predicate flips false→true.

**Example:** `stations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`, `k = 9` → `0.5`.

### How to Think About the Problem
- **Am I searching for an answer value?** Yes — and it's a **double**, which
  changes the mechanics slightly.
- **What is the range?** `[0, max adjacent gap]`.
- **What is the monotonic predicate?** `neededStations(gap) <= k` (false→true as
  gap grows).
- **How do binary search with doubles?** Two options: (a) loop a fixed number of
  iterations (e.g., 100), which always beats the 1e-6 tolerance; (b) loop
  `while (high - low > 1e-6)`. Option (a) is simpler and deterministic.
- **Clue → Pattern:** *minimize the maximum distance, fractional answer* →
  **Pattern 4** with floating-point search.

### Intuition (Brute → Optimal)
```text
Brute force: try placing stations recursively — combinatorial, O(k^n).
        ↓
Observation: for a target gap, stations-per-gap is computable greedily
             as ceil(d / gap) - 1; feasibility monotone in gap.
        ↓
Optimal: binary search the gap with a greedy feasibility count.
```

### Brute Force Approach
Enumerate all placements of `k` stations among all gaps — exponential in `k`.
Explicitly: distributing `k` stations among `n-1` gaps = `C(k + n - 2, n - 2)`
configurations, each scored in `O(n)`. Not practical; that's why we BS the answer
instead.

### Optimal Approach

#### Core Observation
Fix a candidate `gap = mid`. For every original gap of length `d`, we must insert
enough stations so every sub-gap is `<= mid`. The minimum needed is
`ceil(d / mid) - 1`. Sum over all gaps. If the total `<= k`, `mid` is feasible.

Precision note: with doubles, add a tiny safety so that a borderline integer ratio
doesn't misreport, e.g. use `(long)(1e-9 * ...)`-style guards, or simply rely on
100 fixed iterations which keep `low` and `high` within `1e-6` of each other.
The cleanest robust approach: on a tie, `ceil(d / mid)` computed with floating
division can be off by one — guard by checking
`double x = d / mid; int need = (int) Math.ceil(x - 1e-9);` so values like
`2.0000000001` don't count as 3.

#### Pattern Identification
**Pattern 4: Binary Search on Answer** — on real numbers.

#### Step-by-Step Intuition
1. `low = 0`, `high = max original adjacent gap`.
2. Repeat ~100 times:
   - `mid = (low + high) / 2`.
   - Compute `needed = Σ (ceil(gap_i / mid) - 1)`.
   - If `needed <= k` → feasible → `high = mid` (try smaller).
   - Else → `low = mid`.
3. Return `low` (or `mid`) — precision is inside the 1e-6 tolerance.

Edge case `mid = 0` never happens because we only probe mids inside a shrinking
positive interval; but guard `needed` computation for tiny mid with the
`ceil(x - 1e-9)` trick anyway.

#### Dry Run
`stations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`, `k = 9`. All gaps = 1.
Initial `low = 0`, `high = 1`.

| Iteration | low | high | mid | needed = Σ(ceil(1/mid)-1) | feasible? | move |
|---|---|---|---|---|---|---|
| 1 | 0 | 1 | 0.5 | 9× (ceil(2)-1 = 1) = 9 | yes (9 ≤ 9) | high = 0.5 |
| 2 | 0 | 0.5 | 0.25 | 9× (ceil(4)-1 = 3) = 27 | no | low = 0.25 |
| 3 | 0.25 | 0.5 | 0.375 | 9× (ceil(2.67...)-1 = 2) = 18 | no | low = 0.375 |
| 4 | 0.375 | 0.5 | 0.4375 | 9× (ceil(2.2857)-1 = 2) = 18 | no | low = 0.4375 |
| 5 | 0.4375 | 0.5 | 0.46875 | 9× (ceil(2.13...)-1 = 2) = 18 | no | low = 0.46875 |
| ... | → | → | → | converges toward 0.5 | — | — |

After ~100 iterations `low ≈ 0.5`. Check: with gap 0.5, each 1-gap needs 1 station
→ 9 stations total ✓. Answer 0.5 ✓.

#### Why Does It Work?
`ceil(d / gap) - 1` is exactly the number of stations needed to make every piece
of a `d`-long gap `<= gap`. The sum is monotone decreasing in `gap`, so 100
iterations of narrowing (halving the interval each time) guarantee the returned
value is within `1e-6` of the optimum — tighter than the tolerance.

#### Java Code
```java
public double minMaxGasDist(int[] stations, int k) {
    double low = 0, high = 0;
    for (int i = 1; i < stations.length; i++) {
        high = Math.max(high, stations[i] - stations[i - 1]);  // current largest gap
    }
    for (int iter = 0; iter < 100; iter++) {        // 100 halvings -> precision ~1e-30
        double mid = (low + high) / 2;
        int needed = 0;
        for (int i = 1; i < stations.length; i++) {
            double d = stations[i] - stations[i - 1];
            needed += (int) Math.ceil(d / mid - 1e-9) - 1;   // stations for this gap
            if (needed > k) break;                 // early exit: already too many
        }
        if (needed <= k) high = mid;               // feasible -> try smaller gap
        else low = mid;                            // need a bigger allowed gap
    }
    return low;
}
```

#### Complexity
**Time Complexity Calculation:** 100 iterations (constant!) × `O(n)` scan each →
**`O(100 · n)` = `O(n)`**. (Conceptually `O(n · log(range/ε))`, but with fixed
iterations it's effectively linear in `n`.)
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "minimize maximum distance", "add k stations", fractional answer
Pattern:       Binary Search on Answer on DOUBLES
Feasibility:   needed = Σ(ceil(d_i / gap) - 1) <= k
Mental model:  same MIN-the-MAX skeleton; swap integer range for 100 halvings
```

**Similar pattern:** MIN-the-MAX family (19, 22, 23, 24). Floating-point is the
only true novelty here.

---

# PART G — Partition Binary Search on Two Arrays

---

## 26. Kth Element of Two Sorted Arrays

### Problem Understanding
Given two **sorted** arrays (not necessarily equal length) and `k`, return the
**k-th smallest element** of the *merged* array **without merging it**.

- **Input:** sorted `int[] a`, sorted `int[] b`, `int k` (1-indexed)
- **Output:** the k-th smallest of `a ∪ b`
- **Observations:** merging is `O(m+n)`; we want `O(log(min(m,n)))`. The sorted
  order of both arrays is the fuel.

**Example:** `a = [1, 10, 15, 26, 38]`, `b = [2, 20, 30, 40]`, `k = 7` → `30`.

### How to Think About the Problem
- **What should I notice first?** Two sorted arrays → binary search on **where to
  split each array**, not on values.
- **Key structural idea — a "cut":** In the merged array, the k-th element is the
  last element of the "left block" of size `k`. Any valid split of the two arrays
  such that the left block holds `k` elements total and ALL left elements are
  `<= ALL right elements` pins the answer.
- **The invariant:** choose `cut1` elements from array `a` and`cut2 = k - cut1`
  from array `b` to form the left block. It is valid iff
  `a[cut1-1] <= b[cut2]` AND `b[cut2-1] <= a[cut1]`. Then the answer is
  `max(a[cut1-1], b[cut2-1])`.
- **Clue → Pattern:** *k-th element of two sorted arrays* →
  **Pattern 5: Partition Binary Search**.

### Intuition (Brute → Optimal)
```text
Brute force: merge and index, O(m+n).
        ↓
Observation: we don't need a full merge. We need ONE split that divides the
merged array into k-on-the-left / rest-on-the-right.
        ↓
Optimization: binary search that split on the SHORTER array -> O(log(min(m,n))).
```

### Brute Force Approach
```java
public int kthBrute(int[] a, int[] b, int k) {
    int i = 0, j = 0, count = 0;
    while (i < a.length || j < b.length) {
        int cur;
        if (j == b.length || (i < a.length && a[i] <= b[j])) cur = a[i++];
        else cur = b[j++];
        if (++count == k) return cur;
    }
    return -1;
}
```
**Time Complexity Calculation:** merge walks `m + n` elements → **`O(m + n)`**.
**Space Complexity Calculation:** **`O(1)`** (two pointers, no merged array).
**Why improve?** `O(m+n)` ignores the sorted structure; the answer is determined
by ONE cut position we can locate by binary search.

### Optimal Approach — Partition Binary Search

#### Core Observation
WLOG binary search on the **smaller** array (why: the split of the bigger array is
then determined, and fewer possible cut positions → fewer iterations).

The plan in one picture:
```text
a:  ... | aL          aR | ...      take cut1 from a
b:  ... | bL          bR | ...      take cut2 = k - cut1 from b
left block = aL + bL  (k elements)      right block = aR + bR
valid  <=>  aL <= bR  and  bL <= aR
answer = max(aL, bL)
```
If `aL > bR` → too many taken from `a` → move the cut left in `a`.
Else → move the cut right in `a`.

#### Pattern Identification
**Pattern 5: Partition Binary Search** — instead of searching for a value, search
for the correct position of a *cut* defined by a size-k constraint.

#### Step-by-Step Intuition
1. Ensure `a` is the smaller array (`if (a.length > b.length)` swap).
2. `low = max(0, k - b.length)`, `high = min(k, a.length)` —
   the cut can't exceed either array's length, and `k - cut1` must stay within `b`.
3. `mid` = cut in `a`; `cut2 = k - mid` cut in `b`.
4. Read the four boundary elements with **sentinel** values:
   - `aL = mid > 0 ? a[mid-1] : Integer.MIN_VALUE`
   - `aR = mid < a.length ? a[mid] : Integer.MAX_VALUE`
   - similarly `bL`, `bR`.
   (Sentinels handle cuts at the very ends.)
5. If `aL <= bR && bL <= aR` → found. Answer = `max(aL, bL)`.
   Else if `aL > bR` → cut1 too big → `high = mid - 1`.
   Else → `low = mid + 1`.

#### Dry Run
**Example 1 — single step:** `a = [1, 10, 15, 26, 38]` (m=5), `b = [2, 20, 30, 40]` (n=4), `k = 7`.

`low = max(0, 7-4) = 3`, `high = min(7, 5) = 5`.

| Step | low | high | mid (cut1) | cut2 = 7-mid | aL, aR | bL, bR | valid? | action |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 5 | 4 | 3 | aL=26, aR=38 | bL=30, bR=40 | 26≤40 ✓, 30≤38 ✓ | **found** |

Left block = 4 from `a = {1,10,15,26}` + 3 from `b = {2,20,30}` = 7 elements, and
`max(aL, bL) = 30`. Merged array `[1,2,10,15,20,26,30,38,40]` → 7th element = 30 ✓.

**Example 2 — shows actual movement:** `a = [1,2]`, `b = [3,4,5,6,7,8]`, `k = 5`.
`a` is already the shorter array. `low = max(0, 5-6) = 0`, `high = min(5, 2) = 2`.

| Step | low | high | cut1 | cut2 | aL, aR | bL, bR | which condition fails | action |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | 4 | 1, 2 | 6, 7 | `bL=6 <= aR=2` is FALSE | low = 2 (take more from a) |
| 2 | 2 | 2 | 2 | 3 | 2, MAX | 5, 6 | none: 2≤6 ✓, 5≤MAX ✓ | **found, max(2,5)=5** |

Merged: `[1,2,3,4,5,6,7,8]`, 5th = 5 ✓. The failing condition `bL > aR` means
`b`'s left block holds an element that must move right → take more from `a`.

#### Why Does It Work?
The search maintains the invariant that a valid cut with exactly `k` elements on
the left exists, and every move preserves the "k total on the left" property.
Because both arrays are sorted, `aL <= aR` and `bL <= bR` always hold, so the only
violations come from cross-comparisons, which point unambiguously at which cut to
adjust. Binary search guarantees the cut converges to the valid position in
`O(log(min(m,n)))`.

#### Java Code
```java
public int kthElement(int[] a, int[] b, int k) {
    if (a.length > b.length) return kthElement(b, a, k);   // search the shorter
    int m = a.length, n = b.length;

    // cut1 = elements taken from a (in [0..k], bounded by a's size)
    int low = Math.max(0, k - n), high = Math.min(k, m);

    while (low <= high) {
        int cut1 = low + (high - low) / 2;
        int cut2 = k - cut1;

        int aL = (cut1 > 0)     ? a[cut1 - 1] : Integer.MIN_VALUE;   // sentinels
        int aR = (cut1 < m)     ? a[cut1]     : Integer.MAX_VALUE;
        int bL = (cut2 > 0)     ? b[cut2 - 1] : Integer.MIN_VALUE;
        int bR = (cut2 < n)     ? b[cut2]     : Integer.MAX_VALUE;

        if (aL <= bR && bL <= aR)                 // perfect split found
            return Math.max(aL, bL);

        if (aL > bR) high = cut1 - 1;             // took too much from a
        else        low  = cut1 + 1;              // took too little from a
    }
    return -1;                                    // unreachable for valid k
}
```

#### Complexity
**Time Complexity Calculation:** binary search space is the cut positions on the
smaller array of size `min(m,n)` → `O(log(min(m,n)))` iterations, constant work per
iteration → **`O(log(min(m,n)))`**. (The swap runs once, `O(1)`.)
**Space Complexity Calculation:** only variables → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "k-th element of two sorted arrays", "median of two sorted arrays"
Pattern:       Partition Binary Search
Mental model:  size-k cut is valid iff cross orders hold; binary search the cut
               on the shorter array; answer = max of the two left-boundary elements
Similar:       Median of two sorted arrays is literally k = (m+n)/2 of this same
```

**Similar pattern:** Not in this list directly, but "median of two sorted arrays"
is the same algorithm. Nothing else in the 31 uses Pattern 5 — it stands alone.

---

# PART H — Matrix Problems (Pattern 6)

Matrix problems reuse the same intuition, but the search space is 2D. Three shapes
keep showing up. Learn all three:

```text
A. Fully sorted matrix (flattenable): rows sorted AND last elem of row i
   < first elem of row i+1  -> treat as one big sorted array, Problem 28.

B. Rows-only sorted / "staircase" matrix: each ROW sorted (each col also
   sorted in one direction) -> walk from top-right, Problem 29.

C. Value-space questions (median, kth smallest): binary search the VALUE and
   count how many cells are <= it, Problem 31.
```

---

## 27. Find Row with Maximum 1's

### Problem Understanding
Given a binary matrix where each row is sorted (0s then 1s), find the row with the
**maximum number of 1s**.

- **Input:** `int[][] mat` (binary, every row sorted 0→1)
- **Output:** index of the row with most 1s (first row wins ties)
- **Observations:**
  - "Number of 1s in a row" = `n - (index of the first 1)`. So the problem is
    *minimum first-1 index*.
  - Rows sorted → the first 1 in a row is findable by binary search.

**Example:**
```
R0: 0 0 1 1
R1: 0 1 1 1
R2: 0 0 0 1
```
→ `1` (row 1 has 3 ones).

### How to Think About the Problem
- **What should I notice first?** Each row is monotonic. Also: if I stand at a
  cell and it's a `1`, everything to its right is `1`; everything above (already
  scanned) has some count.
- **Am I searching for a value, a boundary, or a position?** A position (row), but
  the decision per row is a boundary (first 1) within each row.
- **What is the best-known trick?** Start at the **top-right** corner. If the cell
  is `1`, this row might be better — step left. If it's `0`, no cell in this row to
  the left can be `1` — step down. Each step discards an entire row-or-tail.
- **Clue → Pattern:** *rows sorted, staircase 2D walk* → **Pattern 6B**.

### Intuition (Brute → Better → Optimal)
```text
Brute: count 1s in every row by scanning, O(m*n).
        ↓
Better: per row, binary-search the first 1 (row is sorted!) -> O(m log n).
        ↓
Optimal: staircase walk from top-right -> only O(m + n) cells visited.
```

### Brute Force Approach
```java
public int rowWithMaxOnesBrute(int[][] mat) {
    int m = mat.length, best = -1, bestCount = -1;
    for (int r = 0; r < m; r++) {
        int cnt = 0;
        for (int c = 0; c < mat[0].length; c++) cnt += mat[r][c];
        if (cnt > bestCount) { bestCount = cnt; best = r; }
    }
    return best;
}
```
**Time Complexity Calculation:** visit all `m*n` cells → **`O(m*n)`**.
**Space Complexity Calculation:** **`O(1)`**.
**Why improve?** Rows are sorted — inside each row the first 1 is a boundary we
can binary search.

### Better Approach — Binary Search Per Row
#### Observation
For each row, `lowerBound(1)` gives the first `1`; ones count = `n - lb`. Because
each row is monotone, that's `O(log n)` per row.

```java
public int rowWithMaxOnesBetter(int[][] mat) {
    int m = mat.length, n = mat[0].length;
    int best = -1, bestCount = -1;
    for (int r = 0; r < m; r++) {
        int lb = lowerBound(mat[r], 1);          // first index with 1
        int cnt = n - lb;
        if (cnt > bestCount) { bestCount = cnt; best = r; }
    }
    return best;
}
private int lowerBound(int[] row, int x) {
    int low = 0, high = row.length, ans = row.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (row[mid] >= x) { ans = mid; high = mid - 1; }
        else low = mid + 1;
    }
    return ans;
}
```
**Time Complexity Calculation:** `m` rows × `O(log n)` each → **`O(m log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

Could it be better? Yes — `O(m + n)` beats `O(m log n)` when `m, n` are close.

### Optimal Approach — Staircase Walk From Top-Right

#### Core Observation
Start at `(0, n-1)`. The cell tells us a lot:
- `mat[r][c] == 1` → this row's first 1 is at `<= c` → count `>= n - c`. Move
  **left** (we might find even more 1s in this row). Record this row.
- `mat[r][c] == 0` → this row and every reachable cell to its left is 0; the row's
  count is at most `n - c - 1`, which cannot beat the count already recorded at
  column `c+1` or beyond. Move **down** (this row is done).

Each move either decrements `c` or increments `r` → at most `m + n` moves.

#### Pattern Identification
**Pattern 6B: 2D staircase search** — each step discards a whole row or a whole
tail, exploiting both axes.

#### Step-by-Step Intuition
1. `r = 0`, `c = n - 1`, `bestRow = -1`.
2. While inside the grid:
   - If `mat[r][c] == 1` → `bestRow = r` (best so far), `c--` (look further left).
   - Else → `r++` (this row can't be the best).
3. Return `bestRow`.

Why recording on *every* `1` is correct: each `1` we meet is at a column strictly
smaller than the previous record, so the count `n - c` strictly improves — old best
rows are only replaced by strictly-better rows.

#### Dry Run
```
mat =
R0: 0 0 1 1
R1: 0 1 1 1
R2: 0 0 0 1
```
n = 4, m = 3.

| Step | (r,c) | value | action |
|---|---|---|---|
| 1 | (0,3) | 1 | bestRow = 0, c = 2 |
| 2 | (0,2) | 1 | bestRow = 0, c = 1 |
| 3 | (0,1) | 0 | r = 1 |
| 4 | (1,1) | 1 | bestRow = 1, c = 0 |
| 5 | (1,0) | 0 | r = 2 |
| 6 | (2,0) | 0 | r = 3 (exit) |

`bestRow = 1` ✓ (row1 has 3 ones — the max).

#### Why Does It Work?
Invariant: all rows above `r` were left only when their reached column held a `0`,
so each such row has **at most** `n - c - 1` ones at that moment, while we already
hold `bestCount >= n - c` from a `1` at column `c+1` (that `1` is what allowed us
to move left to `c`). So no skipped row can exceed the recorded best. The walk
exhausts both axes in `m + n` steps.

#### Java Code
```java
public int rowWithMaxOnes(int[][] mat) {
    int m = mat.length, n = mat[0].length;
    int r = 0, c = n - 1;
    int bestRow = -1;
    while (r < m && c >= 0) {
        if (mat[r][c] == 1) {
            bestRow = r;          // this row has n - c ones; strictly improving
            c--;                  // search further left within this row
        } else {
            r++;                  // no 1 on the left in this row: skip it
        }
    }
    return bestRow;
}
```

#### Complexity
**Time Complexity Calculation:** `r` only increases (`m` max) and `c` only
decreases (`n` max) → at most `m + n` cells → **`O(m + n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  matrix, each ROW sorted, counting 1s / maxima by position
Pattern:       Staircase 2D walk (Pattern 6B)
Mental model:  top-right start; 1 -> go left, 0 -> go down; answer = last row with a 1
Similar:       Search 2D Matrix II (29) is literally the same walk with == target
```

---

## 28. Search in a 2D Matrix

### Problem Understanding
Given a `m x n` matrix that is sorted as if **flattened into one long array**
(each row sorted, and the last element of row `i` < the first element of row
`i+1`), find if `target` exists.

- **Input:** `int[][] mat` (fully monotone), `int target`
- **Output:** boolean (`true`/`false`) — or index, per variant
- **Observation:** the ordering is equivalent to a single sorted array of length
  `m*n`, where index `i` maps to `mat[i / n][i % n]`.

**Example:**
```
mat =
1  3  5  7
10 11 16 20
23 30 34 60
```
`target = 3` → `true`. `target = 13` → `false`.

### How to Think About the Problem
- **What should I notice first?** The whole matrix, read row by row, is one
  ascending sequence. That makes this Problem 1 in disguise.
- **Am I searching for an element, a boundary, or an answer?** An exact element.
- **Can I eliminate half?** Yes — flatten conceptually and run classic binary
  search; mapping mid to row/col is pure arithmetic.
- **Clue → Pattern:** *fully sorted matrix* → **Pattern 6A: flattened 2D search**.

### Intuition (Brute → Optimal)
```text
Brute force: scan every cell, O(m*n).
        ↓
Observation: row-major reading is sorted; a single logical array exists.
        ↓
Optimal: binary search over the m*n indices with 1-row/col conversion each step.
```

### Brute Force Approach
```java
public boolean searchMatrixBrute(int[][] mat, int target) {
    for (int[] row : mat)
        for (int v : row)
            if (v == target) return true;
    return false;
}
```
**Time:** `O(m*n)`. **Space:** `O(1)`. **Why improve?** Global monotonicity → binary search.

### Optimal Approach — Flattened Binary Search

#### Core Observation
Index `k` in `0..m*n-1` corresponds to `mat[k / n][k % n]`, and the sequence of
those values is strictly increasing. So `low=0`, `high=m*n-1` and standard
"compare with mid" works — the conversion is the only new detail.

#### Pattern Identification
**Pattern 6A: Flattened Matrix Binary Search** (classic binary search on a virtual
array).

#### Step-by-Step Intuition
1. `low = 0`, `high = m*n - 1`.
2. `mid`. Convert: `r = mid / n`, `c = mid % n`.
3. Compare `mat[r][c]` with target; eliminate the half exactly like Problem 1.

#### Dry Run
`target = 16`, matrix above (m=3, n=4). Virtual indices 0..11.

| Step | low | high | mid | (r,c) | val | compare | action |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 5 | (1,1) | 11 | 11 < 16 | low = 6 |
| 2 | 6 | 11 | 8 | (2,0) | 23 | 23 > 16 | high = 7 |
| 3 | 6 | 7 | 6 | (1,2) | 16 | 16 == target | **true** |

#### Why Does It Work?
Row-major order produces a strictly increasing virtual array (guaranteed by the
problem's cross-row constraint), so Problem 1's entire correctness argument
transfers unchanged.

#### Java Code
```java
public boolean searchMatrix(int[][] mat, int target) {
    int m = mat.length, n = mat[0].length;
    int low = 0, high = m * n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        int r = mid / n, c = mid % n;          // virtual index -> cell
        if (mat[r][c] == target) return true;
        else if (mat[r][c] < target) low = mid + 1;
        else high = mid - 1;
    }
    return false;
}
```

#### Complexity
**Time Complexity Calculation:** binary search over `m*n` virtual elements →
`O(1)` work per iteration → **`O(log(m*n))`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  matrix sorted across row boundaries too ("flattenable")
Pattern:       Flattened Matrix Binary Search
Mental model:  one virtual sorted array; mid/n and mid%n are the row/col
```

**Similar pattern:** Classic Search (1). The virtual-index trick reappears in
value questions like Matrix Median (31) in a different form.

---

## 29. Search in a 2D Matrix — II

### Problem Understanding
Same question, but the matrix is now sorted **independently per row and per
column** (each row ascending, each column ascending). This is weaker — the
flattened array is NOT sorted (`mat[0][n-1]` can exceed `mat[1][0]`). Return
whether `target` exists.

- **Input:** `int[][] mat` (rows and columns sorted), `int target`
- **Output:** boolean
- **Observation:** at the **top-right** corner, both axes give information:
  - everything below is larger (column sorted),
  - everything to the left is smaller (row sorted).

**Example:**
```
mat =
1  4  7  11 15
2  5  8  12 19
3  6  9  16 22
10 13 14 17 24
18 21 23 26 30
```
`target = 5` → true; `target = 20` → false.

### How to Think About the Problem
- **What should I notice first?** Problem 28's flattening is now illegal. But a
  cell has exactly two "directions of truth".
- **What is the eliminating direction?** Stand at top-right.
  - `cell == target` → found.
  - `cell > target` → this column below is all larger → drop the entire column.
  - `cell < target` → this row to the left is all smaller → drop the entire row.
- **Am I searching for an element?** Yes, exact element — but the search space
  shrinks by a whole row/column per step, not by half the *array*.
- **Clue → Pattern:** *rows AND columns sorted, independent* →
  **Pattern 6B: staircase walk**.

### Intuition (Brute → Optimal)
```text
Brute force: scan everything, O(m*n).
        ↓
Observation: top-right cell lets us discard one whole row or column at a time.
        ↓
Optimal: staircase walk, at most m+n steps.
```

### Brute Force Approach
```java
public boolean searchMatrixBrute(int[][] mat, int target) {
    for (int[] row : mat)
        for (int v : row)
            if (v == target) return true;
    return false;
}
```
**Time:** `O(m*n)`. **Space:** `O(1)`. **Why improve?** The 2D monotonicity lets us cut whole rows/cols.

### Optimal Approach — Staircase Search (Top-Right)

#### Core Observation
At `(0, n-1)`:
- all cells below share this column → all `> mat[0][n-1]`;
- all cells to the left share this row → all `< mat[0][n-1]`.
One comparison prunes an entire row or column. Notice each move keeps the
*opposite* direction valid, so we never walk backward and never loop.

#### Pattern Identification
**Pattern 6B: 2D staircase search.**

#### Step-by-Step Intuition
1. `r = 0`, `c = n-1`.
2. If `mat[r][c] == target` → true.
3. If `mat[r][c] > target` → `c--` (drop column; everything below is too big).
4. Else → `r++` (drop row; everything left is too small).
5. Repeat until out of bounds → false.

#### Dry Run
`target = 5` on the matrix above (m=5, n=5)

| Step | (r,c) | value | compare (5) | action |
|---|---|---|---|---|
| 1 | (0,4) | 15 | 15 > 5 | c = 3 |
| 2 | (0,3) | 11 | 11 > 5 | c = 2 |
| 3 | (0,2) | 7 | 7 > 5 | c = 1 |
| 4 | (0,1) | 4 | 4 < 5 | r = 1 |
| 5 | (1,1) | 5 | 5 == target | **true** |

`target = 20`: `(0,4)=15 <20 → r1; (1,4)=19 <20 → r2; (2,4)=22 >20 → c3; (2,3)=16 <20 → r3; (3,3)=17 <20 → r4; (4,3)=26 >20 → c2; (4,2)=23 >20 → c1; (4,1)=21 >20 → c0; (4,0)=18 <20 → r5 → exit → **false** ✓.

#### Why Does It Work?
Invariant: the target, if present, lies in the sub-matrix with rows `>= r` and
columns `<= c`. Moving right when the cell is smaller (that row is all smaller to
the left) and moving down when the cell is bigger (that column is all bigger
below) both preserve the invariant strictly. Since `r` only grows and `c` only
shrinks, after at most `m+n` steps we either hit the target or exhaust the zone.

#### Java Code
```java
public boolean searchMatrix(int[][] mat, int target) {
    int r = 0, c = mat[0].length - 1;
    while (r < mat.length && c >= 0) {
        if (mat[r][c] == target) return true;
        else if (mat[r][c] > target) c--;   // column too big: discard it
        else r++;                           // row too small: discard it
    }
    return false;
}
```

#### Complexity
**Time Complexity Calculation:** `r` increases at most `m` times, `c` decreases at
most `n` times → **`O(m + n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  rows AND columns each sorted, but no global order
Pattern:       Staircase 2D search
Mental model:  top-right corner holds the pivot of two perpendicular cuts
Similar:       27 (row with max 1s) uses this exact walk
```

**Similar pattern:** Row with Max 1s (27). Same walk, different goal.

---

## 30. Find Peak Element — II

### Problem Understanding
In an `m x n` matrix, a cell is a peak if it is **strictly greater than all four
neighbors** (up, down, left, right; boundary cells compare fewer). Return the
position of **any** peak.

- **Input:** `int[][] mat`
- **Output:** `int[] {r, c}` (row, col) of any peak
- **Observations:**
  - A peak is **guaranteed** to exist in any such matrix (walk ever-upward in any
    direction and you must stop somewhere or at an edge) — the same guarantee as
    Problem 13, in 2D.
  - The "max element of a column" is a natural pivot: it's `>=` everything above
    and below in that column; it only needs to beat its row-neighbors.

**Example:**
```
mat =
10 20 15
21 30 14
 7 16 32
```
→ `(1,1)` (30 > 21, 14, 20, 16).

### How to Think About the Problem
- **What should I notice first?** "Any peak" + guaranteed existence = binary
  search territory (Problem 13 in 2D).
- **What can I pivot on?** The max element of the middle column. It already beats
  all vertical neighbors in its column. Compare it with its left/right neighbors —
  exactly one dimension of the 1D peak test remains.
  - If it's smaller than the left neighbor, a peak must exist on the left side.
  - If smaller than the right neighbor, a peak exists on the right side.
  - If bigger than both → it IS a peak.
- **Am I searching for a position?** Yes — binary search the **column index**,
  scanning the whole column to find its max. 
- **Clue → Pattern:** *peak + guaranteed existence* → **Pattern 2's slope-trick in
  a column space (Pattern 6C)**.

### Intuition (Brute → Optimal)
```text
Brute force: check every cell against its neighbors, O(m*n).
        ↓
Observation: peak existence + column-max pivot -> each column check prunes half the columns.
        ↓
Optimal: binary search columns; per column scan of m cells -> O(m log n).
```

### Brute Force Approach
```java
public int[] findPeakGridBrute(int[][] mat) {
    int m = mat.length, n = mat[0].length;
    for (int r = 0; r < m; r++) {
        for (int c = 0; c < n; c++) {
            int v = mat[r][c];
            boolean peak = true;
            if (r > 0          && mat[r - 1][c] >= v) peak = false;  // top
            if (r < m - 1      && mat[r + 1][c] >= v) peak = false;  // bottom
            if (c > 0          && mat[r][c - 1] >= v) peak = false;  // left
            if (c < n - 1      && mat[r][c + 1] >= v) peak = false;  // right
            if (peak) return new int[]{r, c};
        }
    }
    return new int[]{-1, -1};   // unreachable: a peak always exists
}
```
**Time:** `O(m*n)` (each cell, constant neighbor checks). **Space:** `O(1)`.
**Why improve?** Column-based half-elimination.

### Optimal Approach — Binary Search on Columns

#### Core Observation
Pick a middle column `mid`. Find the row `r` where `mat[r][mid]` is the column's
**maximum**. Because it's the column max, `mat[r][mid] >= mat[r-1][mid]` and
`mat[r][mid] >= mat[r+1][mid]` (vertical neighbors satisfied). Now test only the
row-neighbors:
- `mat[r][mid] > mat[r][mid-1]` and `> mat[r][mid+1]` → peak found.
- `mat[r][mid] < mat[r][mid-1]` → a peak lies in the LEFT set of columns (walk
  left up the "mountain": on the left there is a guaranteed peak).
- else (`< mat[r][mid+1]`) → a peak lies on the right.

Repeat on the surviving column range. This is Problem 13's slope argument applied
to the sequence of column-maxes.

#### Pattern Identification
**Pattern 6C: Column-wise Binary Search** — a 1D boundary/peak search lifted onto
a 2D grid via the column-max reduction.

#### Step-by-Step Intuition
1. `lowCol = 0`, `highCol = n-1`.
2. `midCol = (lowCol + highCol) / 2`. Scan column `midCol`, find row `maxRow`
   (the row of its maximum).
3. Compare `mat[maxRow][midCol]` with its horizontal neighbors:
   - bigger than both → return `{maxRow, midCol}`.
   - smaller than left neighbor → `highCol = midCol - 1`.
   - smaller than right neighbor → `lowCol = midCol + 1`.
4. Loop `while (lowCol <= highCol)`.

Neighbor access at edges: use guards (`midCol-1 >= 0`, `midCol+1 < n`).

#### Dry Run
```
mat =
10 20 15
21 30 14
 7 16 32
```
m = 3, n = 3.

| Step | lowCol | highCol | midCol | max of column | row-neighbors | decision |
|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | col1 = {20,30,16} → max 30 at row1 | 30 vs left 21, right 14 → 30 > both | **peak (1,1)** |

Second example (not a peak at first try):
```
mat =
1 4 7
2 5 8
3 6 9
```
| Step | lowCol | highCol | midCol | max of column | row-neighbors | decision |
|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 1 | col1 = {4,5,6} → 6 at row2 | 6 vs left 3, right 9 → 6 < 9 | lowCol = 2 |
| 2 | 2 | 2 | 2 | col2 = {7,8,9} → 9 at row2 | 9 vs left 6 (no right) → 9 > 6 | **peak (2,2)** |

9 ≥ 8 (up), no down, ≥ 6 left, no right → valid peak ✓.

#### Why Does It Work?
Arguments of correctness:
1. A peak is guaranteed to exist (mountain-climbing argument).
2. When the column-max at `midCol` is smaller than its left neighbor, consider the
   sequence of column-maxes as you walk left: some direction must eventually climb
   down to an edge, and the first "top" is a peak — so restricting to the left
   keeps at least one peak. Symmetric for the right. Thus the invariant "a peak
   lives in [lowCol, highCol]" holds while the range halves.

#### Java Code
```java
public int[] findPeakGrid(int[][] mat) {
    int m = mat.length, n = mat[0].length;
    int lowCol = 0, highCol = n - 1;
    while (lowCol <= highCol) {
        int midCol = lowCol + (highCol - lowCol) / 2;

        // 1) the maximum of this column: already beats top & bottom
        int maxRow = 0;
        for (int r = 1; r < m; r++) {
            if (mat[r][midCol] > mat[maxRow][midCol]) maxRow = r;
        }

        // 2) test only horizontal neighbors
        int left  = (midCol > 0)        ? mat[maxRow][midCol - 1] : Integer.MIN_VALUE;
        int right = (midCol < n - 1)    ? mat[maxRow][midCol + 1] : Integer.MIN_VALUE;

        if (mat[maxRow][midCol] > left && mat[maxRow][midCol] > right) {
            return new int[]{maxRow, midCol};          // it's a peak
        }
        if (mat[maxRow][midCol] < left) highCol = midCol - 1;  // go left
        else                          lowCol  = midCol + 1;   // go right
    }
    return new int[]{-1, -1};   // unreachable: a peak always exists
}
```

#### Complexity
**Time Complexity Calculation:** binary search over `n` columns →
`O(log n)` iterations, each scanning one column of `m` cells → **`O(m · log n)`**.
**Space Complexity Calculation:** **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "peak in a 2D matrix", guaranteed existence
Pattern:       Column-wise Binary Search (1D idea lifted to 2D)
Mental model:  column max kills vertical comparisons; horizontal compare decides
               which half of the columns still holds a peak
Similar:       Peak Element I (13) — the 1D seed of this problem
```

---

## 31. Matrix Median

### Problem Understanding
Given an `m x n` matrix whose **rows are sorted**, and `n` (columns) is odd.
The total number of elements `m*n` is odd. Return the **median** of all elements.

- **Input:** sorted-rows `int[][] mat` (m x n, n odd)
- **Output:** the median value
- **Observations:**
  - Median = the element at rank `(m*n + 1) / 2` when all elements are sorted.
  - Rather than merge everything into a list, we can ask: **what is the smallest
    value `x` such that the count of elements `<= x` is at least `(m*n)/2 + 1`?**
    That `x` is the median. The count function is monotone in `x` → binary
    search the *value*.

**Example:**
```
mat =
1 3 5
2 6 9
3 6 9
```
→ `5`.

### How to Think About the Problem
- **Am I searching for an element, a boundary, or an answer?** An **answer value**
  (Pattern 4 energy, but inside a matrix).
- **What is the range?** `[min cell, max cell]` — values, not indices. This is a
  Binary-Search-on-Answer where the "check" counts cells in a matrix.
- **What is the feasibility check?** `countLE(x) = number of cells <= x`.
  - It's monotone: as `x` grows, `countLE(x)` only increases.
  - We want the smallest `x` with `countLE(x) >= (m*n + 1) / 2`.
- **How to count fast?** Each row is sorted → `upperBound(row, x)` = position of
  first `> x`, which is exactly the number of `<= x` in that row. Sum over rows.
- **Clue → Pattern:** *median in a partly-sorted matrix* →
  **Pattern 4 + 6C (value-space search with per-row binary counting)**.

### Intuition (Brute → Optimal)
```text
Brute force: collect all m*n values, sort, pick middle -> O(m*n log(m*n)) memory too.
        ↓
Observation: "median" = smallest x with #(elements <= x) >= rank. Count is monotone.
        ↓
Optimal: binary search the VALUE between min and max cell; count via
         per-row binary search. O(log(range) * m * log n).
```

### Brute Force Approach
```java
public int matrixMedianBrute(int[][] mat) {
    int m = mat.length, n = mat[0].length;
    int[] all = new int[m * n];
    int idx = 0;
    for (int[] row : mat) for (int v : row) all[idx++] = v;
    Arrays.sort(all);
    return all[all.length / 2];   // median index (total is odd)
}
```
**Time Complexity Calculation:** collecting is `O(m*n)`, sorting is
`O(m*n log(m*n))` → **`O(m*n log(m*n))`**.
**Space Complexity Calculation:** a copy of the whole matrix → **`O(m*n)`**.
**Why improve?** Rows are sorted — we can answer "how many ≤ x" in `O(log n)` per
row without materializing anything.

### Optimal Approach — Binary Search on the Value

#### Core Observation
Define `countLE(x) = Σ rows upperBound(row, x)`. This is monotone increasing in
`x`. The median is the smallest `x` where `countLE(x) > (m*n)/2`
(equivalently `>= (m*n+1)/2`, same for odd totals). Binary search `x` over the
integer value range.

#### Pattern Identification
**Pattern 4 (Binary Search on Answer)** applied inside a matrix, with a
per-row binary-search counting feasibility — the intersection of Pattern 4 and
Pattern 6.

#### Step-by-Step Intuition
1. `low = min cell`, `high = max cell` over the matrix.
2. `mid`. Compute `countLE(mid)` by `upperBound` on every row (rows are sorted —
   reuse the boundary-search code).
3. If `countLE(mid) > (m*n)/2` → feasible (median `<= mid`) → try smaller:
   `ans = mid`, `high = mid - 1`.
4. Else → `low = mid + 1`.
5. Return `ans`.

#### Dry Run
```
mat =
1 3 5
2 6 9
3 6 9
```
m*n = 9, `(m*n)/2 = 4`, need `countLE > 4`, i.e. `>= 5`. Range `[1, 9]`.

| Step | low | high | mid | countLE(mid) | `> 4`? | action / ans |
|---|---|---|---|---|---|---|
| 1 | 1 | 9 | 5 | row1: ≤5 → {1,3,5}=3; row2: {2}=1; row3: {3}=1 → 5 | yes | ans=5, high=4 |
| 2 | 1 | 4 | 2 | row1:{1}=1; row2:{2}=1; row3:0 → 2 | no | low=3 |
| 3 | 3 | 4 | 3 | row1:{1,3}=2; row2:{2}=1; row3:{3}=1 → 4 | no | low=4 |
| 4 | 4 | 4 | 4 | row1:{1,3}=2; row2:{2}=1; row3:{3}=1 → 4 | no | low=5 |
| 5 | 5 | 4 | — | — | — | **ans = 5** |

Check: sorted values = [1,2,3,3,5,6,6,9,9] → median (5th) = 5 ✓.

#### Why Does It Work?
For any `x`, the count of elements `<= x` is exactly computable (upperBound per
row). The predicate `countLE(x) > (m*n)/2` is monotone (true for all `x >= median`),
so binary search converges to the smallest such `x` — precisely the definition of
the median. This works even with duplicates because it's a rank criterion, not a
membership test.

#### Java Code
```java
public int findMedian(int[][] mat) {
    int m = mat.length, n = mat[0].length;
    int low = Integer.MAX_VALUE, high = Integer.MIN_VALUE;
    for (int[] row : mat) {
        low  = Math.min(low, row[0]);          // min of matrix
        high = Math.max(high, row[n - 1]);     // max of matrix
    }
    int ans = low;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (countLE(mat, mid) > (m * n) / 2) {   // median is <= mid
            ans = mid;
            high = mid - 1;                      // try smaller value
        } else {
            low = mid + 1;
        }
    }
    return ans;
}

// how many matrix elements are <= x ? (rows are sorted)
private int countLE(int[][] mat, int x) {
    int count = 0;
    for (int[] row : mat) count += upperBound(row, x);
    return count;
}

private int upperBound(int[] row, int x) {       // first index with row[i] > x
    int low = 0, high = row.length, ans = row.length;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (row[mid] > x) { ans = mid; high = mid - 1; }
        else low = mid + 1;
    }
    return ans;
}
```

#### Complexity
**Time Complexity Calculation:** value range is at most `[1, 2e9]` →
`log₂(2e9) ≈ 31` iterations. Each iteration counts `m` rows, each count costs
`O(log n)` (upperBound) → **`O(31 · m · log n)` ≈ `O(m log n)`** (log on the
value range is a constant ~31 for all practical int inputs).
**Space Complexity Calculation:** no extra storage → **`O(1)`**.

### Pattern to Remember
```text
Problem clue:  "median of a matrix", rows sorted
Pattern:       Binary Search on Answer (value-space) + per-row counting
Feasibility:   countLE(x) := Σ rows upperBound(row, x); want countLE(x) > mn/2
Mental model:  median = smallest value whose rank exceeds half the matrix
```

**Similar pattern:** CPA: value-space searching is the same family as 14–25; the
per-row binary counting is the matrix flavor of Pattern 6C. Strong sibling of
"Kth smallest element in a sorted matrix".

---

# Final Summary — All 31 Questions Grouped by Pattern

This table is the single "cheat sheet" to review before interviews. For each
pattern, the *trigger phrase* tells you when to reach for it.

## Pattern Grouping

```text
CLASSIC BINARY SEARCH  (pattern: compare with mid, eliminate half)
- 1.  Search X in Sorted Array
  trigger: "sorted array + find value"
  mental:   low/high/mid; one comparison discards half

BOUNDARY SEARCH  (pattern: monotone predicate, find flip point)
- 2.  Lower Bound                     arr[mid] >= x, first such index
- 3.  Upper Bound                     arr[mid] > x, first such index
- 4.  Search Insert Position          = lower bound(x)
- 5.  Floor and Ceil                  floor = before upper_bound, ceil = lower_bound
- 6.  First and Last Occurrence       [lower_bound(x), upper_bound(x)-1]
- 7.  Count Occurrences               upper_bound(x) - lower_bound(x)
- 12. Single Element in Sorted Array  parity-flip boundary (pairs start even/odd)
- 13. Peak Element (1D)               slope-direction boundary, guaranteed peak
- 20. Kth Missing Positive Number     missing(i) = arr[i]-(i+1) crosses k
  trigger: "first/last", "insert", "lower/upper bound", "occurrence", "peak"

ROTATED SORTED ARRAY  (pattern: one half is always sorted)
- 8.  Search in Rotated Array I       identify sorted half, test membership
- 9.  Search in Rotated Array II      + duplicate guard (trim equal ends)
- 10. Find Minimum in Rotated Array   compare arr[mid] vs arr[high]
- 11. Number of Rotations             index of the minimum == rotation count
  trigger: "rotated", "minimum", "rotation count"

BINARY SEARCH ON ANSWER  (pattern: answer in a range + feasibility check)
- 14. Square Root                     x^2 <= n, largest feasible
- 15. Nth Root                        x^n <= m (overflow-safe power)
- 16. Koko Eating Bananas             min speed, hours <= h
- 17. Min Days for M Bouquets         min day, bouquets >= m (greedy runs)
- 18. Smallest Divisor                sum of ceilings <= limit
- 19. Ship Within D Days              min capacity, greedy packing
- 21. Aggressive Cows                 MAX the MIN distance, greedy placement
- 22. Book Allocation                 MIN the MAX pages, greedy blocks
- 23. Split Array - Largest Sum       = Book Allocation (story changed)
- 24. Painter's Partition             = Book Allocation (parallel version)
- 25. Minimize Max Dist to Gas Stations  fractional answer, 100 iterations
  trigger: "minimum X such that", "maximum X such that", "within D days", "capacity"

PARTITION BINARY SEARCH  (pattern: binary search a CUT, not a value)
- 26. Kth Element of Two Sorted Arrays   cut1 from A, cut2 = k - cut1, cross-check
  trigger: "k-th/median of two sorted arrays"

MATRIX BSEARCH  (pattern: flatten, staircase, column, value-space)
- 27. Row with Max 1's               staircase (1 -> left, 0 -> down) O(m+n)
- 28. Search in 2D Matrix            flattened virtual array O(log(mn))
- 29. Search in 2D Matrix II         staircase from top-right O(m+n)
- 30. Peak Element II                column binary search O(m log n)
- 31. Matrix Median                  value-space BS + per-row upperBound
  trigger: "matrix", "2D", "median", "row/col sorted"

## One-Paragraph Takeaways

1. **Every** boundary problem is the same loop with a different predicate. Nail
   lower bound once; upper bound, insert position, first/last, count, floor/ceil
   are free derivations. Problems 2–7, 12, 13, 20 are all "find the flip".

2. **Rotated arrays** always reduce to "which half is sorted". Four problems
   (8–11) are three lines of decision logic each once you absorb that.

3. **Binary Search on Answer** is the most common interview family (12 of 31
   problems!). Procedure: define the answer range → define feasibility → binary
   search. The "feasibility function" is normally a greedy simulation. If the
   answer is a double, run a fixed number of iterations.

4. **The MIN-the-MAX group (19, 22, 23, 24) is one problem.** Learn it once, in
   any costume (shipping boats, students, subarrays, painters), and you have all
   four.

5. **Matrix questions** pick one of three tools: stretch it into a virtual array
   (28), walk a staircase (27, 29), or binary-search the value with per-row
   counting (31). Peak II (30) is the 1D peak literally hoisted onto columns.

## Exam Checklist — How To Recognize On The Spot

```text
Sorted array?  -> classic / boundary search
First or last / insert / appears?  -> boundary search
Rotated + sorted?  -> identify sorted half
Minimum/maximum days, speed, capacity, distance?  -> BS on answer
"Maximize the minimum" or "minimize the maximum"?  -> BS on answer
Two sorted arrays + k-th?  -> partition BS
2D matrix + fully sorted?  -> flatten
2D matrix + rows & cols sorted?  -> staircase
Median in matrix / kth value?  -> value-space BS
Guaranteed peak?  -> slope-direction boundary search
Duplicates + rotated?  -> add the trim-equal-ends guard
```

---

## Complexity Cheat Sheet

| Problem | Brute | Optimal |
|---|---|---|
| 1 Search sorted | O(n) | O(log n) |
| 2–7 Boundary family | O(n) | O(log n) each |
| 8,9 Rotated search | O(n) | O(log n) / O(n) worst dup |
| 10 Min rotated | O(n) | O(log n) |
| 11 Rotation count | O(n) | O(log n) |
| 12 Single element | O(n) (XOR) | O(log n) |
| 13 Peak I | O(n) | O(log n) |
| 14 Sqrt | O(√n) | O(log n) |
| 15 Nth root | O(m^(1/n)·n) | O(n log m) |
| 16 Koko | O(max·n) | O(n log max) |
| 17 Bouquets | O(range·n) | O(n log range) |
| 18 Divisor | O(max·n) | O(n log max) |
| 19 Ship | O(sum·n) | O(n log sum) |
| 20 Kth missing | O(n+k) | O(log n) |
| 21 Cows | O(range·n) | O(n log n + n log range) |
| 22–24 Alloc/Split/Painter | exponential / O(sum·n) | O(n log sum) |
| 25 Gas stations | exponential | O(100·n) ≈ O(n) |
| 26 Kth of 2 arrays | O(m+n) | O(log min(m,n)) |
| 27 Row max 1s | O(mn) | O(m+n) |
| 28 Search 2D | O(mn) | O(log(mn)) |
| 29 Search 2D II | O(mn) | O(m+n) |
| 30 Peak II | O(mn) | O(m log n) |
| 31 Matrix median | O(mn log mn) | O(31·m·log n) ≈ O(m log n) |

---

## A Closing Note on How to Study This

- Do not memorize the code. Memorize the **trigger phrase → pattern → feasibility
  function** triple. That is the thing an interviewer is probing.
- For any new problem, ask in order:
  1. Is the input sorted (in any dimension)? → search family.
  2. Am I hunting a value, an index, a boundary, or an answer? 
  3. Is there any monotone predicate I can test cheaply? → BS on answer.
  4. Is a greedy simulation the natural feasibility check? 
- Re-derive lower bound and one BS-on-answer problem from scratch on a whiteboard
  until the invariants feel automatic. Everything else in this document stacks on
  those two rocks.

Good luck — and remember, there are only ~6 ideas in all 31 problems.