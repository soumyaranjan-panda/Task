# Start Here

Welcome to the **Stack & Queue (Java)** study guide. This is a complete,
interview-focused walkthrough of the 30 Stack/Queue problems that show up again
and again in coding interviews. It is written to make the pattern *derivable*
rather than memorized: for every problem you see the reasoning that leads to the
data structure, not just the final code.

## What this guide covers

Every one of the 30 problems gets the full **15-section treatment**:

1. Problem Understanding
2. How to Think About the Problem
3. Pattern Recognition
4. Brute Force
5. Observation
6. Optimal Approach
7. Invariant
8. Dry Run
9. Why Does It Work
10. Java Code
11. Complexity
12. Edge Cases
13. Common Mistakes
14. Pattern to Remember
15. Interview Trigger

The problems are grouped so that each chapter builds the tool the next one
reuses. The foundations and the thinking framework come first; the problems are
then ordered from basic containers to the hard monotonic-stack, deque, and
cache-design problems.

**A verification note.** Every non-trivial algorithm in this guide was written
into an actual Java compiler and run against hand-derived expected outputs before
being placed on these pages — all the monotonic-stack variants, the circular-array
logic, and the cache designs included. If you spot a discrepancy anyway, it is
worth flagging.

## How to read it

1. Read [Stack](01-Stack.md), [Queue](02-Queue.md), and
   [Monotonic Stack](03-Monotonic-Stack.md) once, properly. Everything else leans
   on them.
2. Internalize the [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md).
   It is the checklist you run before writing a line of code.
3. Work the chapters in order. Each problem's *How to Think* section walks the
   checklist out loud, so you can watch the derivation before trying it cold.
4. In each problem, read the brute force and the observation *before* the optimal
   code. The gap between them is the actual lesson.

## Reading order & contents

All chapters are complete.

| # | Chapter | Covers | Status |
|---|---|---|---|
| 01 | [Foundations](01-Stack.md) | Stack, Queue, Monotonic Stack | Complete |
| 02 | [Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md) | The 16-question checklist and derivation chain | Complete |
| 03 | [Implementations](../03-Implementations/01-Implement-Stack-Using-Arrays.md) | Problems 1–8: arrays/linked-list Stack & Queue, Stack↔Queue conversion, Balanced Parentheses, Min Stack | Complete |
| 04 | [Expression Conversions](../04-Expression-Conversions/01-Infix-To-Postfix.md) | Problems 9–14: all six Infix/Prefix/Postfix conversions | Complete |
| 05 | [Monotonic Stack Core](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) | Problems 15–18: Next Greater/Smaller Element, circular variant, count to the right | Complete |
| 06 | [Boundary & Contribution](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md) | Problems 19–23: Trapping Rain Water, Sum of Subarray Minimums, Asteroid Collision, Sum of Subarray Ranges, Remove K Digits | Complete |
| 07 | [Histogram & Deque](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) | Problems 24–26: Largest Rectangle in Histogram, Maximal Rectangle, Sliding Window Maximum | Complete |
| 08 | [Cache & Misc](../08-Cache-And-Misc/01-Stock-Span.md) | Problems 27–30: Stock Span, Celebrity Problem, LRU Cache, LFU Cache | Complete |
| 09 | [Patterns & Templates](../09-Patterns-And-Templates/01-Comparison-Tables.md) | Cross-problem comparison tables, the pattern-grouping reference, and reusable Java templates | Complete |
| 10 | [Reference](../10-Reference/01-Decision-Tree.md) | The pattern decision tree, revision sheet, interview checklist, and biggest lessons | Complete |

## All 30 problems, at a glance

Each problem links to its official TakeUForward solve page and, where one
exists, its LeetCode problem.

| # | Problem | Difficulty | TUF Solve | LeetCode |
|---|---|---|---|---|
| 1 | Implement Stack using Arrays | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/implement-stack-using-arrays) | — |
| 2 | Implement Queue using Arrays | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/implement-queue-using-arrays) | — |
| 3 | Implement Stack using Queue | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/implement-stack-using-queue) | [Problem](https://leetcode.com/problems/implement-stack-using-queues/) |
| 4 | Implement Queue using Stack | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/implement-queue-using-stack) | [Problem](https://leetcode.com/problems/implement-queue-using-stacks/) |
| 5 | Implement Stack using Linked List | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/implement-stack-using-linkedlist) | — |
| 6 | Implement Queue using Linked List | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/implement-queue-using-linkedlist) | — |
| 7 | Balanced Parentheses | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/balanced-paranthesis) | [Problem](https://leetcode.com/problems/valid-parentheses/) |
| 8 | Implement Min Stack | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/implement-min-stack) | [Problem](https://leetcode.com/problems/min-stack/) |
| 9 | Infix to Postfix Conversion | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/infix-to-postfix-conversion) | — |
| 10 | Prefix to Infix Conversion | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/prefix-to-infix-conversion) | — |
| 11 | Prefix to Postfix Conversion | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/prefix-to-postfix-conversion) | — |
| 12 | Postfix to Prefix Conversion | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/postfix-to-prefix-conversion) | — |
| 13 | Postfix to Infix Conversion | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/postfix-to-infix-conversion) | — |
| 14 | Infix to Prefix Conversion | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/infix-to-prefix-conversion) | — |
| 15 | Next Greater Element | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/next-greater-element) | [Problem](https://leetcode.com/problems/next-greater-element-i/) |
| 16 | Next Greater Element II — Circular | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/next-greater-element---2) | [Problem](https://leetcode.com/problems/next-greater-element-ii/) |
| 17 | Next Smaller Element | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/next-smaller-element) | — |
| 18 | Number of Greater Elements to the Right | Easy | [Solve](https://takeuforward.org/plus/dsa/problems/number-of-greater-elements-to-the-right) | — |
| 19 | Trapping Rain Water | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/trapping-rainwater) | [Problem](https://leetcode.com/problems/trapping-rain-water/) |
| 20 | Sum of Subarray Minimums | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/sum-of-subarray-minimums) | [Problem](https://leetcode.com/problems/sum-of-subarray-minimums/) |
| 21 | Asteroid Collision | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/asteroid-collision) | [Problem](https://leetcode.com/problems/asteroid-collision/) |
| 22 | Sum of Subarray Ranges | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/sum-of-subarray-ranges) | [Problem](https://leetcode.com/problems/sum-of-subarray-ranges/) |
| 23 | Remove K Digits | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/remove-k-digits) | [Problem](https://leetcode.com/problems/remove-k-digits/) |
| 24 | Largest Rectangle in a Histogram | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/largest-rectangle-in-a-histogram) | [Problem](https://leetcode.com/problems/largest-rectangle-in-histogram/) |
| 25 | Maximum Rectangles | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/maximum-rectangles) | [Problem](https://leetcode.com/problems/maximal-rectangle/) |
| 26 | Sliding Window Maximum | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/sliding-window-maximum) | [Problem](https://leetcode.com/problems/sliding-window-maximum/) |
| 27 | Stock Span Problem | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/stock-span-problem) | [Problem](https://leetcode.com/problems/online-stock-span/) |
| 28 | Celebrity Problem | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/celebrity-problem) | [Problem](https://leetcode.com/accounts/login/?next=/problems/find-the-celebrity/) |
| 29 | LRU Cache | Medium | [Solve](https://takeuforward.org/plus/dsa/problems/lru-cache) | [Problem](https://leetcode.com/problems/lru-cache/) |
| 30 | LFU Cache | Hard | [Solve](https://takeuforward.org/plus/dsa/problems/lfu-cache) | [Problem](https://leetcode.com/problems/lfu-cache/) |

## The one idea worth carrying in

> **The stack contains elements whose answer has NOT been found yet.**

Almost every problem in this guide is a variation on that sentence: decide what
is unresolved, decide the order it must be resolved in, and let that order pick
the data structure for you.

## See also

- [Stack](01-Stack.md)
- [Queue](02-Queue.md)
- [Monotonic Stack](03-Monotonic-Stack.md)
- [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md)
