# Comparison Tables

Two tables to use as a lookup, not as reading material. The first maps every problem in this guide to the exact pattern, data structure, monotonic direction, stored payload, and complexity, so you can confirm a guess or compare two approaches side by side. The second is the recognition shortcut: you read a phrase in a problem statement, and it points to the pattern to reach for.

## How to use them

- **Main comparison.** Scan the "Main pattern" and "Stack type" columns to see how neighbouring problems differ. When two problems look alike but use opposite comparisons, the "Push/offer condition" and "Pop/remove condition" columns show exactly where they diverge.
- **"If the question says..." table.** Use it during the first minute of an interview. Match the clue in the prompt to the right-hand "Think" cell, then jump to the [Pattern Grouping](02-Pattern-Grouping.md) or [Template Library](03-Template-Library.md) page for the mechanics.
- Treat both tables as indexes. The reasoning lives in the problem pages; these tell you where to look.

## Main comparison

| Problem | Main pattern | Data structure | Stack type | Stores | Push/offer condition | Pop/remove condition | Time | Space |
|---|---|---|---|---|---|---|---|---:|---:|
| Stack using array | Basic stack | Array | — | values | always | top op | O(1) | O(n) |
| Queue using array | Circular queue | Array | — | values | rear slot | front item | O(1) | O(n) |
| Stack using queue | Simulation | Queue | — | values | add + rotate | front | O(n) push | O(n) |
| Queue using stack | Two-stack reversal | 2 stacks | — | values | push input | move if needed | amortized O(1) | O(n) |
| Stack using linked list | Head stack | Linked list | — | nodes | head | head | O(1) | O(n) |
| Queue using linked list | Two-end list | Linked list | — | nodes | rear | front | O(1) | O(n) |
| Balanced Parentheses | Matching | Stack | normal | open brackets | on open | on matching close | O(n) | O(n) |
| Min Stack | Augmented stack | 2 stacks | normal | values + min | each push | each pop | O(1) | O(n) |
| Expression conversion | Precedence | Stack | operator stack | operators/expressions | operator | precedence/close | O(n) | O(n) |
| Next Greater | NGE | Monotonic stack | decreasing | unresolved indices | every index | current > top | O(n) | O(n) |
| NGE II | Circular NGE | Monotonic stack | decreasing | unresolved indices | first pass | current > top | O(n) | O(n) |
| Next Smaller | NSE | Monotonic stack | increasing | unresolved indices | every index | current < top | O(n) | O(n) |
| Count greater right | Order statistic | Fenwick tree | — | frequencies | insert right value | query greater count | O(n log n) | O(n) |
| Trapping Rain Water | Valley boundaries | Monotonic stack | decreasing | bar indices | each bar | current > top | O(n) | O(n) |
| Sum Subarray Minimums | Contribution | Monotonic stack | increasing | boundaries | each index | smaller boundary | O(n) | O(n) |
| Asteroid Collision | Simulation | Stack | normal | survivors | survivor | collision | O(n) amortized | O(n) |
| Sum Subarray Ranges | Contribution | Monotonic stacks | inc + dec | boundaries | each index | min/max boundary | O(n) | O(n) |
| Remove K Digits | Greedy | Monotonic stack | increasing digits | chosen digits | every digit | top > current | O(n) amortized | O(n) |
| Histogram | Nearest smaller | Monotonic stack | increasing | indices | each bar | current < top | O(n) | O(n) |
| Maximum Rectangles | 2D→histogram | Histogram stack | increasing | column heights | each row | smaller bar | O(RC) | O(C) |
| Sliding Window Maximum | Dominance | Monotonic deque | decreasing | candidate indices | every index | back smaller / front expired | O(n) | O(k) |
| Stock Span | Previous greater | Monotonic stack | decreasing | price + span | every price | <= current | O(n) total | O(n) |
| Celebrity | Candidate elimination | Stack / pointers | — | candidates | all people | impossible candidate | O(n) | O(n) or O(1) |
| LRU | Cache design | HashMap + DLL | — | key→node | on access/write | least recent | O(1) avg | O(capacity) |
| LFU | Cache design | HashMaps + DLLs | — | key/freq/buckets | on access/write | min freq + LRU | O(1) avg | O(capacity) |

## "If the question says..." → Think...

| Question clue | Think |
|---|---|
| Matching parentheses | Stack |
| Nested structure | Stack |
| Undo / most recent | Stack |
| Next greater | Decreasing monotonic stack |
| Next smaller | Increasing monotonic stack |
| Previous greater | Decreasing monotonic stack |
| Previous smaller | Increasing monotonic stack |
| Nearest greater/smaller | Monotonic stack |
| Stock span | Previous greater |
| Histogram | Nearest smaller |
| Circular next greater | Monotonic stack + 2 passes |
| Sum of subarray minimums | Contribution + increasing stack |
| Sum of subarray ranges | Max contribution - min contribution |
| Sliding window maximum | Decreasing monotonic deque |
| Sliding window minimum | Increasing monotonic deque |
| Remove elements to minimize sequence | Greedy monotonic stack |
| Collisions | Stack simulation |
| BFS | Queue |
| O(1) lookup + recency | HashMap + DLL |
| Frequency eviction + recency tie-break | LFU design |

## See also

- [Pattern Grouping](02-Pattern-Grouping.md)
- [Template Library](03-Template-Library.md)
- [Decision Tree](../10-Reference/01-Decision-Tree.md)
- [Revision Sheet](../10-Reference/02-Revision-Sheet.md)
