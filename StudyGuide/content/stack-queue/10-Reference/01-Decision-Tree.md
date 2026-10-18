# Decision Tree

When a new problem arrives, walk this tree top to bottom and stop at the first question that answers yes. Each leaf names the pattern to start with; the sections after the diagram point to the page that explains it. If every question is "no", you may not be looking at a stack/queue problem at all.

## How to choose the pattern

**Figure 1 —** Recognition tree: read the prompt, then fall through the questions until one matches.

```text
Read the problem
      |
      v
Is it about nested / matching / most-recent behavior?
      |---- YES --> STACK
      |
      NO
      v
Is it about arrival order / first-in-first-out?
      |---- YES --> QUEUE
      |
      NO
      v
Is it asking previous/next/nearest greater or smaller?
      |---- YES --> MONOTONIC STACK
      |
      NO
      v
Is it asking for max/min for every sliding window?
      |---- YES --> MONOTONIC DEQUE
      |
      NO
      v
Is it a histogram / largest rectangle?
      |---- YES --> MONOTONIC STACK
      |
      NO
      v
Is it sum over all subarrays involving min/max?
      |---- YES --> CONTRIBUTION + MONOTONIC STACK
      |
      NO
      v
Does a new element make older elements permanently useless?
      |---- YES --> GREEDY MONOTONIC STACK
      |
      NO
      v
Do arriving objects collide with recent surviving objects?
      |---- YES --> STACK SIMULATION
      |
      NO
      v
Is it a circular next-greater problem?
      |---- YES --> MONOTONIC STACK + TWO PASSES
      |
      NO
      v
Do I need O(1) lookup + recency ordering?
      |---- YES --> HASHMAP + DOUBLY LINKED LIST
      |
      NO
      v
Do I need O(1) lookup + frequency buckets + recency tie-break?
      |---- YES --> LFU DESIGN
      |
      NO
      v
Do I need a count/rank of all greater values, not just nearest greater?
      |---- YES --> ORDER-STATISTIC STRUCTURE
```

## Where each answer leads

| Branch answer | Pattern | Start here |
|---|---|---|
| Nested / matching / most-recent | Stack | [Stack](../01-Foundations/01-Stack.md) |
| Arrival order / FIFO | Queue | [Queue](../01-Foundations/02-Queue.md) |
| Previous/next/nearest greater or smaller | Monotonic stack | [Monotonic Stack](../01-Foundations/03-Monotonic-Stack.md) |
| Max/min for every sliding window | Monotonic deque | [Sliding Window Maximum](../07-Histogram-And-Deque/03-Sliding-Window-Maximum.md) |
| Histogram / largest rectangle | Monotonic stack | [Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) |
| Sum over all subarrays involving min/max | Contribution + monotonic stack | [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md) |
| New element makes older elements useless | Greedy monotonic stack | [Remove K Digits](../06-Boundary-And-Contribution/05-Remove-K-Digits.md) |
| Arriving objects collide with survivors | Stack simulation | [Asteroid Collision](../06-Boundary-And-Contribution/03-Asteroid-Collision.md) |
| Circular next-greater | Monotonic stack + two passes | [Next Greater Element II — Circular](../05-Monotonic-Stack-Core/02-Next-Greater-Element-II-Circular.md) |
| O(1) lookup + recency ordering | HashMap + doubly linked list | [LRU Cache](../08-Cache-And-Misc/03-LRU-Cache.md) |
| O(1) lookup + frequency buckets + recency tie-break | LFU design | [LFU Cache](../08-Cache-And-Misc/04-LFU-Cache.md) |
| Count/rank of all greater values | Order-statistic structure | [Number of Greater Elements to the Right](../05-Monotonic-Stack-Core/04-Number-Of-Greater-Elements-To-The-Right.md) |

## See also

- [Comparison Tables](../09-Patterns-And-Templates/01-Comparison-Tables.md)
- [Pattern Grouping](../09-Patterns-And-Templates/02-Pattern-Grouping.md)
- [Revision Sheet](02-Revision-Sheet.md)
- [Interview Checklist](03-Interview-Checklist.md)
- [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md)
