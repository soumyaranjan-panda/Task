# Pattern Grouping

The whole topic collapses into ten reusable patterns. Each one below states what it is, the shape of its template, and the problems that belong to it. Learn the pattern, not the problem: every new question is usually a fresh combination of these ten.

## Pattern 1 — Basic Stack Implementation

**What it is.** Direct LIFO storage where only one end is ever active.

**Core idea.** Push and pop at the same end; the top is the boundary between used and free space.

**Template shape.**

```text
push -> add at top
pop  -> remove at top
peek -> read top
```

**Problems that belong to it.**

- [1. Implement Stack using Arrays](../03-Implementations/01-Implement-Stack-Using-Arrays.md)
- [5. Implement Stack using Linked List](../03-Implementations/05-Implement-Stack-Using-Linked-List.md)

## Pattern 2 — Basic Queue Implementation

**What it is.** Direct FIFO storage with two active ends.

**Core idea.** Insert at the rear, remove at the front; a circular buffer avoids shifting.

**Template shape.**

```text
offer -> add at rear
poll  -> remove at front
peek  -> read front
```

**Problems that belong to it.**

- [2. Implement Queue using Arrays](../03-Implementations/02-Implement-Queue-Using-Arrays.md)
- [6. Implement Queue using Linked List](../03-Implementations/06-Implement-Queue-Using-Linked-List.md)

## Pattern 3 — Stack / Queue Conversion

**What it is.** One data structure is made to imitate the other.

**Core idea.** Change the order through rotation (newest to the front) or through reversal (two stacks cancel their LIFO bias).

**Template shape.**

```text
Stack using queue:  add new -> rotate old
Queue using stacks: in stack -> out stack
```

**Key lesson.** Do not memorize "two stacks." Understand the order you need, then pick the transformation that produces it.

**Problems that belong to it.**

- [3. Implement Stack using Queue](../03-Implementations/03-Implement-Stack-Using-Queue.md)
- [4. Implement Queue using Stack](../03-Implementations/04-Implement-Queue-Using-Stack.md)

## Pattern 4 — Parentheses / Matching

**What it is.** Nested opening and closing items that must pair up in reverse order.

**Core idea.** The latest unresolved opener must close first, so the stack top is always the innermost unmatched opener.

**Template shape.**

```text
on open:  push(open)
on close: pop and check it matches
at end:   stack must be empty
```

**Problems that belong to it.**

- [7. Balanced Parentheses](../03-Implementations/07-Balanced-Parentheses.md)

**Related.** [8. Min Stack](../03-Implementations/08-Min-Stack.md) is the augmented-stack sibling: same LIFO core, plus metadata stored per depth so an extra query is O(1).

## Pattern 5 — Monotonic Stack

**What it is.** A stack kept in sorted order whose entries are unresolved candidates.

**Core idea.** Store unresolved candidates and remove any element that a new element permanently dominates or resolves. Each element is pushed once and popped at most once, so the total work is O(n).

**Template shape.**

```java
while (!stack.isEmpty() && condition(current, stack.peek())) {
    int idx = stack.pop();
}
stack.push(i);
```

**Common variations.**

- greater vs smaller
- left vs right
- strict vs non-strict
- values vs indices

**Problems that belong to it.**

- [15. Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md)
- [17. Next Smaller Element](../05-Monotonic-Stack-Core/03-Next-Smaller-Element.md)
- [18. Number of Greater Elements to the Right](../05-Monotonic-Stack-Core/04-Number-Of-Greater-Elements-To-The-Right.md)
- [20. Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md)
- [22. Sum of Subarray Ranges](../06-Boundary-And-Contribution/04-Sum-Of-Subarray-Ranges.md)
- [24. Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md)
- [27. Stock Span](../08-Cache-And-Misc/01-Stock-Span.md)

## Pattern 6 — Circular Monotonic Stack

**What it is.** A monotonic-stack question on a circular array.

**Core idea.** Simulate two traversals with `% n` so each element can see a full lap of candidates; only collect answers on the first pass.

**Template shape.**

```java
for (int i = 0; i < 2 * n; i++) {
    int idx = i % n;
}
```

**Problems that belong to it.**

- [16. Next Greater Element II — Circular](../05-Monotonic-Stack-Core/02-Next-Greater-Element-II-Circular.md)

## Pattern 7 — Contribution Technique

**What it is.** A sum over all subarrays that involves the minimum, maximum, or another representative element.

**Core idea.** Count how many subarrays each index is the representative of, then add `value × leftChoices × rightChoices`.

**Template shape.**

```text
contribution =
value × leftChoices × rightChoices
```

**Common variations.**

- minimum
- maximum
- max - min
- sum of strengths / products in advanced variants

**Problems that belong to it.**

- [20. Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md)
- [22. Sum of Subarray Ranges](../06-Boundary-And-Contribution/04-Sum-Of-Subarray-Ranges.md)

## Pattern 8 — Histogram

**What it is.** The largest rectangle among bars, or a binary-matrix rectangle built row by row.

**Core idea.** Find the nearest smaller element on both sides of each bar to get its maximal width, then maximise `height × width`.

**Template shape.**

```text
pop when current is smaller
width = right - left - 1
```

**Key connection.** Maximum Rectangles is just Histogram repeated once per row, reusing the previous row's heights.

**Problems that belong to it.**

- [24. Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md)
- [25. Maximum Rectangles](../07-Histogram-And-Deque/02-Maximal-Rectangle.md)

## Pattern 9 — Monotonic Deque

**What it is.** A sliding-window maximum or minimum maintained in amortized O(1) per step.

**Core idea.** Remove expired candidates from the front and dominated candidates from the back; the front is always the answer for the current window.

**Template shape.**

```java
while (!deque.isEmpty() && expired(deque.peekFirst())) {
    deque.pollFirst();
}

while (!deque.isEmpty() && dominated(deque.peekLast(), i)) {
    deque.pollLast();
}

deque.offerLast(i);
```

**Problems that belong to it.**

- [26. Sliding Window Maximum](../07-Histogram-And-Deque/03-Sliding-Window-Maximum.md)

## Pattern 10 — Cache Design

**What it is.** O(1) lookup combined with dynamic ordering or eviction.

**Core idea.** Combine structures because no single structure satisfies every requirement: a map for lookup plus linked lists for ordering.

**LRU shape.**

```text
HashMap + Doubly Linked List
```

**LFU shape.**

```text
key -> node
frequency -> doubly linked list
minFrequency
```

**Problems that belong to it.**

- [29. LRU Cache](../08-Cache-And-Misc/03-LRU-Cache.md)
- [30. LFU Cache](../08-Cache-And-Misc/04-LFU-Cache.md)

## Problems not covered by the ten patterns

These sit at the edges of the grouping and are worth naming explicitly:

- [8. Min Stack](../03-Implementations/08-Min-Stack.md) — augmented stack.
- [9. Infix to Postfix](../04-Expression-Conversions/01-Infix-To-Postfix.md) through [14. Infix to Prefix](../04-Expression-Conversions/06-Infix-To-Prefix.md) — precedence stack / expression conversion.
- [19. Trapping Rain Water](../06-Boundary-And-Contribution/01-Trapping-Rain-Water.md) — valley boundaries with a decreasing stack.
- [21. Asteroid Collision](../06-Boundary-And-Contribution/03-Asteroid-Collision.md) — stack simulation.
- [23. Remove K Digits](../06-Boundary-And-Contribution/05-Remove-K-Digits.md) — greedy monotonic stack.
- [28. Celebrity Problem](../08-Cache-And-Misc/02-Celebrity-Problem.md) — candidate elimination with a stack or two pointers.

## See also

- [Comparison Tables](01-Comparison-Tables.md)
- [Template Library](03-Template-Library.md)
- [Decision Tree](../10-Reference/01-Decision-Tree.md)
- [Monotonic Stack](../01-Foundations/03-Monotonic-Stack.md)
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md)
