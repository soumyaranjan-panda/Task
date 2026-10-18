# 27. Stock Span

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/stock-span-problem) · [Article](https://takeuforward.org/data-structure/stock-span-problem) · [Video](https://youtu.be/eay-zoSRkVc?si=deNNe5i38BOAntha) — **LeetCode:** [Problem](https://leetcode.com/problems/online-stock-span/)

## 1. Problem Understanding

You get a stream of daily stock prices, one per day. For today's price, the **span** is the number of consecutive days ending today (including today) whose price is less than or equal to today's price. The streak stops as soon as it hits a day with a strictly greater price.

Given `[100, 80, 60, 70, 60, 75, 85]`, the spans are:

```text
price: 100  80  60  70  60  75  85
span:    1   1   1   2   1   4   6
```

Read each span backwards from that day: day `75` reaches back over `60`, `70`, `60`, then hits `80` (greater), so its span is `4`. Day `85` reaches back over `75`, `60`, `70`, `60`, `80`, then hits `100`, so its span is `6`.

The API is online: prices arrive one at a time, and each call must return that day's span.

## 2. How to Think About the Problem

The span ends exactly at the nearest previous day with a price **strictly greater** than today's. If that day is at index `p` (or `-1` if none exists), then:

```text
span = todayIndex - p
```

That makes this a **previous greater** problem: for each day, find the closest earlier day whose price is greater. Everything after that day has price `<=` today's and counts toward the span.

The plain approach walks backward one day at a time until it finds a greater price. The waste is that consecutive queries keep re-walking the same old prices. A **decreasing monotonic stack** fixes this: it keeps only the days whose "previous greater" is still unresolved. Any earlier day whose price is `<=` today's can never be the first greater boundary for today or any later day, so it can be discarded — but not before folding its span into today's, because those days still count.

This is why the stack stores `(price, span)` pairs: when a smaller day is popped, its accumulated span is absorbed into the current day's span.

## 3. Pattern Recognition

**Clue:** count consecutive previous days with price `<=` today, possibly as an online stream.

**Pattern:** previous greater boundary — a **decreasing monotonic stack** with accumulated spans.

| Signal | This problem |
|---|---|
| Count backwards until a larger value blocks you | Previous greater boundary |
| Repeated backward scans over the same prefix | Keep only unresolved days on a stack |
| Popped day's range still counts toward today | Fold its span into today's |
| Online calls, amortized O(1) | Each day pushed once, popped once |

## 4. Brute Force

For each day, walk backward while the previous price is `<=` today's, counting steps.

```java
import java.util.ArrayList;
import java.util.List;

class BruteForce {
    public List<Integer> stockSpan(int[] prices) {
        List<Integer> spans = new ArrayList<>();
        for (int i = 0; i < prices.length; i++) {
            int span = 1;
            int j = i - 1;
            while (j >= 0 && prices[j] <= prices[i]) {
                span++;
                j--;
            }
            spans.add(span);
        }
        return spans;
    }
}
```

This is `O(n^2)` time in the worst case (a non-decreasing sequence makes every query walk to the start) and `O(1)` extra space.

## 5. Observation

Maintain a stack of days with their spans, ordered by **decreasing price** from bottom to top. Before pushing today, pop every day whose price is `<= today's`, adding each popped span into today's span. The day that remains on top after popping (if any) is the nearest previous day with a strictly greater price; it is the boundary that stops the span.

Two facts make this correct:

- A popped day has price `<= today`, so it is inside today's span and its span must be folded in.
- It can never be the boundary for a future day either, because today is both `>=` in price and closer in time. So it is safe to remove permanently.

## 6. Optimal Approach

Keep a stack of `int[]{price, span}`. For each new price:

1. Start `span = 1` (counting today).
2. While the stack is non-empty and `stack.peek()[0] <= price`, pop and add the popped span to `span`.
3. Push `{price, span}`.
4. Return `span`.

Because popped days are gone for good, total work across all calls is linear.

## 7. Invariant

> **Invariant:** The stack stores days in decreasing price order from bottom to top, and each stored span is finalized (its own span was fully computed when it was pushed). The top is the nearest previous strictly greater price still relevant to future days.

**Figure 1 —** the decreasing price stack after day 4 (`60`).

```text
    top
     |
     v
  +----------+
  | 60 ,  1  |
  +----------+
  | 70 ,  2  |
  +----------+
  | 80 ,  1  |
  +----------+
  | 100,  1  |
  +----------+
   bottom
```

## 8. Dry Run

Input `[100, 80, 60, 70, 60, 75, 85]`.

| day | price | pops (top price `<=` price) | span folded | stack after (bottom→top) | result |
|-----|-------|-----------------------------|-------------|--------------------------|--------|
| 0 | 100 | none | 1 | `(100,1)` | 1 |
| 1 | 80 | none | 1 | `(100,1) (80,1)` | 1 |
| 2 | 60 | none | 1 | `(100,1) (80,1) (60,1)` | 1 |
| 3 | 70 | pop `(60,1)` | 1 + 1 = 2 | `(100,1) (80,1) (70,2)` | 2 |
| 4 | 60 | none | 1 | `(100,1) (80,1) (70,2) (60,1)` | 1 |
| 5 | 75 | pop `(60,1)`, pop `(70,2)` | 1 + 1 + 2 = 4 | `(100,1) (80,1) (75,4)` | 4 |
| 6 | 85 | pop `(75,4)`, pop `(80,1)` | 1 + 4 + 1 = 6 | `(100,1) (85,6)` | 6 |

The output is `[1, 1, 1, 2, 1, 4, 6]`.

**Figure 2 —** day 5 (`75`) folding the spans of `60` and `70`.

```text
before:  ... (80,1) (70,2) (60,1)   top = 1
75 arrives:
  pop 60 -> span = 1 + 1 = 2
  pop 70 -> span = 2 + 2 = 4
  top is 80 (> 75, stop)
push (75, 4)
after:   ... (80,1) (75,4)   top = 4
```

## 9. Why Does It Work?

When a day is popped because its price is `<=` the current price, it belongs to today's span (consecutive days `<=` today). Its already-computed span covers the days it itself reached back over, all of which are also `<=` today's price (they were `<=` the popped day's price, which is `<=` today's). So folding `span += popped.span` counts exactly those days once.

After popping, the new top (if it exists) has price strictly greater than today's, and it is the nearest such day because every day between it and today has been popped (all had price `<=` today). Hence it is the true boundary.

Any popped day can never appear as a boundary for a later day: today's price is at least as large and today is more recent, so today blocks that day just as the popped day would, only later. Removing it is permanent and lossless.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class StockSpanner {
    private final Deque<int[]> stack = new ArrayDeque<>();

    public int next(int price) {
        int span = 1;

        while (!stack.isEmpty() && stack.peek()[0] <= price) {
            span += stack.pop()[1];
        }

        stack.push(new int[]{price, span});
        return span;
    }
}
```

A batch variant over an array works identically:

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int[] stockSpan(int[] prices) {
        int n = prices.length;
        int[] spans = new int[n];
        Deque<int[]> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            int span = 1;
            while (!stack.isEmpty() && stack.peek()[0] <= prices[i]) {
                span += stack.pop()[1];
            }
            stack.push(new int[]{prices[i], span});
            spans[i] = span;
        }

        return spans;
    }
}
```

## 11. Complexity

| Resource | Cost | Why |
|---|---|---|
| Time | Amortized O(1) per call, O(n) total | Each day is pushed once and popped at most once |
| Space | O(n) | The stack can hold up to `n` days in a strictly decreasing stream |

The `while` loop can be long on a single call (a new high clears the stack), but summed over all calls the total number of pops is at most `n`.

## 12. Edge Cases

- **Strictly increasing prices** `[1,2,3,4]`: every new day pops all previous days; spans grow `1,2,3,4`. The stack holds one entry after each call.
- **Strictly decreasing prices** `[4,3,2,1]`: no pops; every span is `1`; the stack grows.
- **Equal prices** `[5,5,5]`: the `<=` condition pops the previous equal day, so spans are `1,2,3`. If you used `<`, spans would be `1,1,1`, which is wrong because equal prices count toward the span.
- **Single day** `[p]`: span `1`.
- **Empty stream**: the class simply never returns a value; recall `next` is only meaningful per price.
- **Very large spans**: use `int` (spans are at most `n`, which fits in `int` for realistic inputs); for enormous streams use `long`.

## 13. Common Mistakes

1. **Using `<` instead of `<=`.** Equal prices must count, so the pop condition is `<=`; otherwise spans are too short on flat days.
2. **Storing only the price.** You must also store the accumulated span, or you cannot fold popped days into the current one.
3. **Thinking this is a next-greater problem.** It is a **previous** greater problem; the direction of the boundary matters.
4. **Counting the boundary day itself.** The boundary is strictly greater and is excluded, so the span is `today - boundary - 1 + 1`, handled correctly by starting `span = 1` and folding popped spans.
5. **Recomputing spans from scratch** instead of folding, which degrades to `O(n^2)`.

## 14. Pattern to Remember

```text
**Problem clue:** consecutive days with price <= today, counted backwards.
**Pattern:** previous greater boundary — the day that stops the span.
**Data structure:** decreasing monotonic stack (of days with accumulated spans).
**What the stack stores:** days whose greater price has not appeared, plus their span.
**When to push:** every new day.
**When to pop:** while top price `<=` current — fold its span into the current day.
**Invariant:** stacked prices strictly decrease bottom-to-top and spans never overlap.
**Key insight:** span is computed by folding consecutive smaller spans, exactly like the nearest previous greater.
**Time:** O(n) total.
**Space:** O(n).
```

**Stock span = previous greater boundary.**

## 15. Interview Trigger

> Stock span asks "how far back can I go before a greater price blocks me?" That is previous greater, so use a decreasing monotonic stack.

The stream framing plus "consecutive days <= today" is the tell. Whenever a backward scan would repeat the same work across queries, look for a monotonic stack that folds earlier results.

## Related Problems

- [28. Celebrity Problem](02-Celebrity-Problem.md) — another elimination-based sweep.
- [29. LRU Cache](03-LRU-Cache.md) — ordered-update data structure design.
- [30. LFU Cache](04-LFU-Cache.md) — layered frequency structure.
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — the right-side boundary analogue.
- [Next Smaller Element](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md) — the mirror ordering.
- [Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — boundaries plus widths.

## See also

- [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md)
- [Sliding Window Maximum](../07-Histogram-And-Deque/03-Sliding-Window-Maximum.md)
- [Trapping Rain Water](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md)
