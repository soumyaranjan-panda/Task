# Biggest Lessons and Memory Map

The seven ideas that transfer to problems you have never seen, followed by the one-page map of the whole topic.

## 1. Do not memorize "monotonic stack"

Instead ask:

> "What is unresolved?"

If elements are waiting for some future event, a stack may be the waiting room.

## 2. The comparison operator is not a small detail

These are different patterns:

```text
top < current
top > current
top <= current
top >= current
```

The choice determines:

- what gets popped
- how duplicates are treated
- which elements own the answer

## 3. Indices are often more useful than values

Use indices when you need:

- position
- width
- distance
- expiry
- boundaries

That is why histogram, sliding window, stock span, and next-greater problems usually store indices.

## 4. Popping should mean something

Never write:

```text
while (...) stack.pop();
```

without being able to say:

> "I pop because this element's answer/boundary has just become final, or because it can never be useful again."

That sentence is the heart of the algorithm.

## 5. O(n) with a while loop is possible

Do not panic when you see:

```text
while (...) {
    stack.pop();
}
```

Ask:

> "Can an element be popped more than once?"

If not, the total work can still be O(n).

## 6. Similar-looking words can mean different patterns

### "Next greater"

Nearest future answer.

→ monotonic stack.

### "Count greater"

How many future values satisfy a condition.

→ may need an ordered-frequency structure.

This distinction is important.

## 7. Many "hard" stack problems are just combinations

```text
Maximal Rectangle
= row heights
+ Histogram

Sum of Ranges
= Maximum contribution
- Minimum contribution

LFU
= HashMap
+ Doubly Linked Lists
+ Frequency tracking

Circular NGE
= Next Greater
+ circular traversal
```

The interview skill is seeing the old pattern inside the new problem.

## Final memory map

**Figure 1 —** The whole topic as one tree.

```text
STACK / QUEUE
|
+-- LIFO
|   +-- Basic stack
|   +-- Parentheses
|   +-- Expression conversion
|   +-- Collision simulation
|   +-- Greedy removal
|
+-- FIFO
|   +-- Basic queue
|   +-- BFS / scheduling
|
+-- MONOTONIC STACK
|   +-- Next greater
|   +-- Next smaller
|   +-- Previous greater
|   +-- Previous smaller
|   +-- Stock span
|   +-- Histogram
|   +-- Trapping rain water
|   +-- Subarray contribution
|
+-- MONOTONIC DEQUE
|   +-- Sliding window max/min
|
+-- CANDIDATE ELIMINATION
|   +-- Celebrity
|
+-- CACHE DESIGN
    +-- LRU
    +-- LFU
```

## One sentence to remember

> **A stack is most powerful when elements are waiting for a future answer, and a monotonic stack is most powerful when some future element can permanently resolve or eliminate them.**

## See also

- [Interview Checklist](03-Interview-Checklist.md)
- [Revision Sheet](02-Revision-Sheet.md)
- [Decision Tree](01-Decision-Tree.md)
- [Pattern Grouping](../09-Patterns-And-Templates/02-Pattern-Grouping.md)
- [Template Library](../09-Patterns-And-Templates/03-Template-Library.md)
