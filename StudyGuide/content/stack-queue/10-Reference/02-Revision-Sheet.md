# Revision Sheet

One page to read the night before an interview. Everything here is a compressed reminder, not a lesson.

## Stack

**Core idea.** LIFO — the most recent item is handled first.

| Operation | Meaning | Cost |
|---|---|---:|
| `push(x)` | Add to top | O(1) |
| `pop()` | Remove top | O(1) |
| `peek()` | Read top | O(1) |
| `isEmpty()` | Check empty | O(1) |

**When to use.** Nested structures, matching, undo, unresolved elements, nearest/previous/next, removing elements while keeping order.

**Java.** `Deque<Integer> stack = new ArrayDeque<>();`

## Queue

**Core idea.** FIFO — the earliest item is handled first.

| Operation | Meaning | Cost |
|---|---|---:|
| `offer(x)` | Add at rear | O(1) |
| `poll()` | Remove at front | O(1) |
| `peek()` | Read front | O(1) |
| `isEmpty()` | Check empty | O(1) |

**When to use.** Arrival order, scheduling, BFS, window management.

**Java.** `Deque<Integer> queue = new ArrayDeque<>();`

## Monotonic Stack

| Variant | Order (bottom → top) | Used for |
|---|---|---|
| Increasing | values increase | smaller-element boundaries |
| Decreasing | values decrease | greater-element boundaries |

- **What the stack represents.** Unresolved candidates.
- **Push.** When the current element does not resolve the stack top.
- **Pop.** When the current element gives the answer or boundary for the stack top.
- **Invariant.** The stack always preserves the chosen monotonic order.
- **Amortized cost.** O(n) total: each element is pushed once and popped at most once.

## Monotonic Deque

Stores candidates for a sliding window.

- **For maximum.** Values decrease from front to back; the front is the maximum.
- **Remove expired.** Drop candidates leaving the window from the front.
- **Remove dominated.** Drop candidates the new element beats from the back.
- **Cost.** O(n) total, O(k) space.

## Most important formulas

```text
Next greater -> decreasing stack
Next smaller -> increasing stack

Previous greater -> decreasing stack
Previous smaller -> increasing stack

Stock span -> previous greater

Histogram -> nearest smaller on both sides

Circular next greater -> simulate 2 passes

Sliding window maximum -> decreasing deque

Count subarray minimum contribution
-> left choices x right choices

Subarray range
-> sum of maxima - sum of minima

Remove K digits
-> pop previous larger digits when current is smaller

LRU
-> HashMap + Doubly Linked List

LFU
-> HashMap + frequency buckets + minFrequency
```

## See also

- [Decision Tree](01-Decision-Tree.md)
- [Interview Checklist](03-Interview-Checklist.md)
- [Comparison Tables](../09-Patterns-And-Templates/01-Comparison-Tables.md)
- [Template Library](../09-Patterns-And-Templates/03-Template-Library.md)
- [Monotonic Stack](../01-Foundations/03-Monotonic-Stack.md)
