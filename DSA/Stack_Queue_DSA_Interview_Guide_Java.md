# Stack & Queue DSA Study Guide in Java
## Interview-Focused: How to Think, Recognize Patterns, and Derive the Solution

> **Goal:** When you meet a new Stack/Queue problem, do not ask "Which template do I remember?" Ask "What information is unresolved, what order matters, and what work can be made permanent?"

This guide follows the requested learning-first approach: understand the clue, derive the data structure, state the invariant, compare brute force with the optimized idea, and then write clean Java. The problem set is the 30 items specified in the source brief.

---

# PART 1 — FOUNDATION

# 1. Stack — One Page

A **stack** is a collection where the most recently added item is the first one removed.

That is **LIFO**:

```text
push(10)
push(20)
push(30)

top
 ↓
30
20
10

pop() -> 30
```

Why is LIFO useful? Because many problems naturally have a "most recent unresolved thing" relationship.

## Core operations

| Operation | Meaning | Typical cost |
|---|---|---:|
| `push(x)` | Add to top | O(1) |
| `pop()` | Remove top | O(1) |
| `peek()` | Look at top without removing | O(1) |
| `isEmpty()` | Check whether empty | O(1) |

In Java, prefer:

```java
Deque<Integer> stack = new ArrayDeque<>();

stack.push(10);
stack.push(20);
int top = stack.peek();
int removed = stack.pop();
boolean empty = stack.isEmpty();
```

`Stack` is a legacy class. `ArrayDeque` is generally the better interview choice for stack behavior.

## Real-world intuition

Think of:

- plates stacked on a table
- browser back history
- function calls
- undo history
- nested brackets

In all of them, the newest active item is handled first.

## When should I think "STACK"?

### 1. Last in, first out
The newest thing must be handled first.

### 2. Matching open/close
`(` must match the most recent unmatched `(`.

### 3. Nested structures
For `A(B(C))`, the active inner structure finishes before the outer one.

### 4. Undo
The most recent action is the first action to undo.

### 5. Previous/next greater or smaller
An element may stay unresolved until some future element "answers" it.

### 6. Removing elements while maintaining order
Problems such as **Remove K Digits** repeatedly remove the latest item when the new item makes it worse.

### 7. Expression conversion/evaluation
Operators depend on precedence and the order in which operands become available.

### 8. Need to remember unresolved elements
This is the deepest clue.

> **Mental model:** The stack is often not "the answer." It is a waiting room for things whose answer has not been discovered yet.

---

# 2. Queue — One Page

A **queue** is a collection where the earliest added item is the first one removed.

That is **FIFO**:

```text
enqueue: 10 -> 20 -> 30

front
 ↓
10 20 30

dequeue() -> 10
```

## Core operations

| Operation | Meaning | Typical cost with `ArrayDeque` |
|---|---|---:|
| `offer(x)` | Add at rear | O(1) |
| `poll()` | Remove from front | O(1) |
| `peek()` | Read front | O(1) |
| `isEmpty()` | Check empty | O(1) |

```java
Deque<Integer> queue = new ArrayDeque<>();

queue.offer(10);
queue.offer(20);
queue.offer(30);

int first = queue.peek(); // 10
int removed = queue.poll(); // 10
```

## When should I think "QUEUE"?

### First in, first out
Items must be processed in arrival order.

### Processing in arrival order
People, jobs, packets, tasks, requests.

### BFS
Breadth-first search explores the current layer before the next layer.

### Sliding window
A queue/deque can keep track of what is still inside the active window.

### Maintaining candidates in a window
A **deque** is useful when candidates can be removed from either end.

### Scheduling
The next eligible item is often the oldest waiting item.

---

# 3. Monotonic Stack — Most Important

A **monotonic stack** is a stack whose elements are kept in sorted order.

Two common versions:

- **Increasing stack:** values from bottom to top are increasing.
- **Decreasing stack:** values from bottom to top are decreasing.

But the important idea is not "sorted stack."

It is:

> **The stack contains unresolved candidates, and the order tells us which candidates can still be useful.**

## The most important mental model

> **"The stack contains elements whose answer has NOT been found yet."**

Example: Next Greater Element.

```text
array:  2  1  5

2 is waiting.
1 is waiting.

5 arrives.

5 > 1  -> answer for 1 is 5
5 > 2  -> answer for 2 is 5
```

So we pop both.

After processing `5`, those elements are no longer unresolved.

## Why can an element be popped permanently?

Suppose we want **next greater**.

When `current > stackTop`:

- `current` is the first greater element seen for `stackTop`.
- Because we scan left to right, there is no unprocessed element between them.
- Therefore the answer for `stackTop` is final.
- `stackTop` never needs to return.

That is why popping is safe.

## What does the popped element represent?

It represents an element whose answer has just been found.

## What does the current element represent?

It is the candidate that may resolve smaller/larger unresolved elements before itself joining the waiting room.

## Why is the algorithm O(n)?

Every element:

- enters the stack once
- leaves the stack at most once

So total stack operations are linear:

```text
n pushes + at most n pops = O(n)
```

Even though there is a `while` loop, the total number of executions across the entire input is O(n).

## How to recognize monotonic-stack problems

Look for:

- next greater
- next smaller
- previous greater
- previous smaller
- nearest greater/smaller
- stock span
- histogram
- contribution of minimum/maximum
- remove elements while maintaining order
- circular next greater

## Pattern table

| Problem clue | Pattern | Stack type | What stack stores |
|---|---|---|---|
| Next greater to right | Monotonic stack | Decreasing | unresolved indices |
| Next smaller to right | Monotonic stack | Increasing | unresolved indices |
| Previous greater | Monotonic stack | Decreasing | useful left candidates |
| Previous smaller | Monotonic stack | Increasing | useful left candidates |
| Stock span | Previous greater | Decreasing | indices |
| Histogram | Nearest smaller boundaries | Increasing | indices |
| Subarray minimum | Contribution | Increasing | indices |
| Remove K digits | Greedy monotonic stack | Increasing by digit value | chosen digits |
| Circular next greater | Monotonic stack + 2 passes | Decreasing | indices |

---

# PART 2 — UNIVERSAL THINKING FRAMEWORK

For every new Stack/Queue problem, ask:

## Reusable checklist

1. **What exactly is being asked?**
2. **Is this about order?**
3. **Is the natural order LIFO or FIFO?**
4. **Do I need to remember unresolved elements?**
5. **Is it previous/next greater/smaller?**
6. **Is there a nested structure?**
7. **Is there a sliding window?**
8. **Can some elements be eliminated permanently?**
9. **Can each element be processed once?**
10. **Is there a monotonic property?**
11. **What exactly should the stack/deque contain?**
12. **What does top/front represent?**
13. **When do I push/offer?**
14. **When do I pop/poll from the front or back?**
15. **What does a popped element mean?**
16. **What invariant must remain true?**

## The interview derivation chain

```text
Problem clue
    ↓
What information is unresolved?
    ↓
What order must unresolved items be processed in?
    ↓
Data structure
    ↓
What does one stored item represent?
    ↓
When can an item be finalized?
    ↓
Pop/remove it permanently
    ↓
State invariant
    ↓
Code
```

---

# PART 3 — SOLVE EVERY PROBLEM

The sections below use the same thinking pattern repeatedly. The goal is to connect problems rather than memorize 30 unrelated implementations. Repeated patterns are explicitly linked to each other, and every problem carries its official **TakeUForward solve link** plus the LeetCode link where one exists.

## Quick Links — all 30 problems (official TUF solve links)

Every problem below has its link under its own heading too. This is the one-stop index:

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

# 1. Implement Stack using Arrays

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-stack-using-arrays) · [TUF article](https://takeuforward.org/data-structure/implement-stack-using-array/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

We need a stack backed by an array.

Required behavior:

- push
- pop
- peek
- isEmpty
- usually `size`

Example:

```text
push(10)
push(20)
push(30)

[10, 20, 30]
          ^
         top
```

## 2. How to Think About the Problem

The array gives contiguous storage. We need one variable telling us where the current top is.

The easiest representation is:

```text
top = -1   -> empty
top = 0    -> one item
```

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** LIFO  
**Observation:** Only one end is active  
**Pattern:** Track the active end  
**Data structure:** Array + `top`  
**Algorithm:** Increment on push, decrement on pop

## 3. Pattern Recognition

**Problem clue:** implement stack directly.

**Pattern:** fixed storage + pointer to active end.

**Mental model:** `top` is the boundary between stack and free array space.

## 4. Brute Force

There is no meaningful brute-force version here. The direct array implementation is already the basic representation.

## 5. Observation

No shifting is needed.

```text
push -> arr[++top] = value
pop  -> arr[top--]
```

## 6. Optimal Approach

Use an array and an integer `top`.

## 7. Invariant

> **Invariant:** Valid stack elements occupy `arr[0..top]`.

## 8. Dry Run

| Operation | top before | Stack after |
|---|---:|---|
| push(5) | -1 | [5] |
| push(8) | 0 | [5, 8] |
| pop() | 1 | [5] |
| push(2) | 0 | [5, 2] |

## 9. Why Does It Work?

`top` always points to the newest item. Therefore the next pop removes exactly the latest pushed item.

## 10. Java Code

```java
class ArrayStack {
    private final int[] data;
    private int top = -1;

    public ArrayStack(int capacity) {
        data = new int[capacity];
    }

    public void push(int value) {
        if (top == data.length - 1) {
            throw new IllegalStateException("Stack overflow");
        }
        data[++top] = value;
    }

    public int pop() {
        if (isEmpty()) {
            throw new IllegalStateException("Stack is empty");
        }
        return data[top--];
    }

    public int peek() {
        if (isEmpty()) {
            throw new IllegalStateException("Stack is empty");
        }
        return data[top];
    }

    public boolean isEmpty() {
        return top == -1;
    }
}
```

## 11. Complexity

Push, pop, peek: **O(1)** because only one cell changes.

Space: **O(n)** for the array.

## 12. Edge Cases

- empty pop/peek
- full stack
- one element

## 13. Common Mistakes

- `top` initialized to `0` instead of `-1`
- incrementing/decrementing in the wrong order
- forgetting overflow/underflow checks

## 14. Pattern to Remember

```text
**Problem clue:** LIFO behavior with a fixed-size array.
**Pattern:** Array + a pointer to the active end.
**Data structure:** `int[]` + `int top`.
**What the stack/queue stores:** the elements below the current top.
**When to push:** write into the slot just above the current top.
**When to pop:** remove from the current top.
**Invariant:** valid elements occupy `arr[0..top]`.
**Key insight:** only one end is active, so a single `top` variable encodes the whole state.
**Time:** O(1) per operation.
**Space:** O(n) for the array.
```

```text
Problem clue: direct stack implementation
Pattern: active-end pointer
Data structure: array + top
When to push: top++, write
When to pop: read top, top--
Invariant: arr[0..top] is the stack
Key insight: only one end changes
Time: O(1) per operation
Space: O(n)
```

**Memory trick:** **Stack = array + top.**

## 15. Interview Trigger

> If I am asked to build a stack from scratch, I should not overthink it. I need LIFO, so only one end matters. An array plus a `top` index gives every operation in O(1).

---

# 2. Implement Queue using Arrays

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-queue-using-arrays) · [TUF article](https://takeuforward.org/data-structure/implement-queue-using-array/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

A queue is FIFO.

A naive array queue that shifts everything left after dequeue becomes O(n).

The key is to avoid shifting.

## 2. How to Think

The queue has two active boundaries:

```text
front -> first valid item
rear  -> next insertion position
```

For a reusable queue, a circular array is the cleanest bounded implementation.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** FIFO  
**Observation:** remove from front, add at rear  
**Pattern:** two boundaries  
**Data structure:** circular array + front + size  
**Algorithm:** move boundaries modulo capacity

## 3. Pattern Recognition

**Problem clue:** enqueue at one end, dequeue at the other.

**Pattern:** two-sided access.

**Why:** shifting items is unnecessary work.

## 4. Brute Force

Store items in a normal array and on every dequeue shift:

```text
[10,20,30]
dequeue 10
shift -> [20,30]
```

Each dequeue can move O(n) items.

## 5. Observation

Instead of moving elements, move `front`.

Circular indexing:

```java
(index + 1) % capacity
```

## 6. Optimal Approach

Store:

- `front`: index of first element
- `size`: number of elements

Insertion position is:

```text
(front + size) % capacity
```

## 7. Invariant

> **Invariant:** `size` is the exact number of elements currently in the queue, and the valid sequence starts at `front`.

## 8. Dry Run

Capacity 5:

| op | front | size | logical queue |
|---|---:|---:|---|
| offer(10) | 0 | 1 | 10 |
| offer(20) | 0 | 2 | 10,20 |
| poll() | 1 | 1 | 20 |
| offer(30) | 1 | 2 | 20,30 |

## 9. Why Does It Work?

We never move existing values. We only move the front boundary and calculate the next rear position.

## 10. Java Code

```java
class ArrayQueue {
    private final int[] data;
    private int front = 0;
    private int size = 0;

    public ArrayQueue(int capacity) {
        data = new int[capacity];
    }

    public void offer(int value) {
        if (size == data.length) {
            throw new IllegalStateException("Queue is full");
        }

        int rear = (front + size) % data.length;
        data[rear] = value;
        size++;
    }

    public int poll() {
        if (isEmpty()) {
            throw new IllegalStateException("Queue is empty");
        }

        int value = data[front];
        front = (front + 1) % data.length;
        size--;
        return value;
    }

    public int peek() {
        if (isEmpty()) {
            throw new IllegalStateException("Queue is empty");
        }
        return data[front];
    }

    public boolean isEmpty() {
        return size == 0;
    }
}
```

## 11. Complexity

Each operation is **O(1)**. No shifting.

Space: **O(n)**.

## 12. Edge Cases

- empty
- full
- wrap-around
- one item

## 13. Common Mistakes

- using `rear++` without modulo
- confusing `rear` with last occupied position
- forgetting that `front` wraps

## 14. Pattern to Remember

```text
**Problem clue:** FIFO behavior with a fixed-size array.
**Pattern:** circular buffer with `front`, `rear`, `size`.
**Data structure:** `int[]` + three pointers.
**What the stack/queue stores:** elements wrapped circularly starting at `front`.
**When to push:** write at `rear`, then `rear = (rear + 1) % n`.
**When to pop:** remove from `front`, then `front = (front + 1) % n`.
**Invariant:** the active elements are the `size` slots starting at `front`, going around the ring.
**Key insight:** wrapping (`% n`) avoids shifting all elements when space frees at the front.
**Time:** O(1) per operation.
**Space:** O(n) for the array.
```

```text
Problem clue: FIFO implementation
Pattern: two moving boundaries
Data structure: circular array
Invariant: front points to first valid element
Time: O(1)
Space: O(n)
```

**Memory trick:** **Queue = front moves, rear wraps.**

## 15. Interview Trigger

> A queue needs removal from one end and insertion at the other. If I see shifting after dequeue, I should ask whether I can move a pointer instead. The circular-array idea makes both operations O(1).

---

# 3. Implement Stack using Queue

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-stack-using-queue) · [LeetCode](https://leetcode.com/problems/implement-stack-using-queues/) · [TUF article](https://takeuforward.org/data-structure/implement-stack-using-single-queue) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

We have FIFO primitives but need LIFO behavior.

That means we must somehow make the newest element appear at the front.

## 2. How to Think

The conflict is:

```text
Queue gives: oldest first
Stack needs: newest first
```

There are two common strategies.

### Cost push more
After adding a new element, rotate older elements behind it.

Example:

```text
queue: [1,2]
add 3 -> [1,2,3]
rotate 1,2 -> [3,1,2]
```

Now `poll()` behaves like stack `pop()`.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** need LIFO from FIFO  
**Observation:** newest item must become front  
**Pattern:** reorder queue after push  
**Data structure:** queue  
**Algorithm:** add + rotate previous elements

## 3. Pattern Recognition

This is a **simulation** problem: one data structure is being used to emulate another.

## 4. Brute Force

Store everything elsewhere or use two queues. That works but uses extra structure.

## 5. Observation

If we rotate the old items behind the newly added item, the front becomes the newest item.

## 6. Optimal Approach

One queue:

1. note current size
2. add new item
3. rotate `size` old items
4. now front = newest

## 7. Invariant

> **Invariant:** The queue's front is always the stack's top.

## 8. Dry Run

| operation | queue |
|---|---|
| push(1) | [1] |
| push(2) | [2,1] |
| push(3) | [3,2,1] |
| pop() | 3, queue [2,1] |

## 9. Why Does It Work?

We explicitly rearrange the FIFO structure so the newest element is always first.

## 10. Java Code

```java
class StackUsingQueue {
    private final Deque<Integer> queue = new ArrayDeque<>();

    public void push(int value) {
        int size = queue.size();
        queue.offer(value);

        for (int i = 0; i < size; i++) {
            queue.offer(queue.poll());
        }
    }

    public int pop() {
        if (queue.isEmpty()) {
            throw new IllegalStateException("Empty stack");
        }
        return queue.poll();
    }

    public int top() {
        if (queue.isEmpty()) {
            throw new IllegalStateException("Empty stack");
        }
        return queue.peek();
    }

    public boolean empty() {
        return queue.isEmpty();
    }
}
```

## 11. Complexity

Push: **O(n)** because of rotation.  
Pop/peek: **O(1)**.  
Space: **O(n)**.

## 12. Edge Cases

Empty pop/peek, one item.

## 13. Common Mistakes

- rotating the wrong number of elements
- forgetting that the new element is already inserted
- using `size()` after modifying the queue

## 14. Pattern to Remember

```text
**Problem clue:** build LIFO behavior from a FIFO primitive.
**Pattern:** rotation — move the newest element to the front.
**Data structure:** one `Queue` (two queues is an over-engineering trap; one suffices).
**What the queue stores:** stack elements with the TOP at the front.
**When to push:** add the new element, then rotate the older ones behind it.
**When to pop:** poll the front.
**Invariant:** the front of the queue is always the top of the stack.
**Key insight:** one rotation per push makes the most recent element reachable first.
**Time:** push O(n), pop O(1).
**Space:** O(n).
```

**Queue can simulate Stack by making the newest item the front.**

## 15. Interview Trigger

> When one data structure must imitate another, first identify the behavior mismatch. Here FIFO is wrong for LIFO, so I rearrange the queue until its front represents the stack top.

---

# 4. Implement Queue using Stack

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-queue-using-stack) · [LeetCode](https://leetcode.com/problems/implement-queue-using-stacks/) · [TUF article](https://takeuforward.org/data-structure/implement-queue-using-stack/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

We have LIFO but need FIFO.

The classic solution uses **two stacks**.

## 2. How to Think

One stack reverses the order. A second reversal restores FIFO behavior.

```text
in stack:  1 2 3
transfer ->
out stack: 3 2 1
top of out = 1
```

## 3. Pattern Recognition

This is a **reversal** problem.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** FIFO from LIFO  
**Observation:** two reversals restore original order  
**Pattern:** input stack + output stack  
**Data structure:** two stacks  
**Algorithm:** transfer only when output stack is empty

## 4. Brute Force

Move all elements between stacks on every operation. That is unnecessarily expensive.

## 5. Observation

If `out` is non-empty, its top is already the oldest queue element. No transfer is needed.

## 6. Optimal Approach

- `in`: newest arrivals
- `out`: next elements to dequeue

When `out` is empty:

```text
while in not empty:
    out.push(in.pop())
```

## 7. Invariant

> **Invariant:** When `out` is non-empty, its top is the oldest element waiting in the queue.

## 8. Dry Run

| operation | in | out | result |
|---|---|---|---|
| offer 1 | [1] | [] | |
| offer 2 | [2,1] | [] | |
| offer 3 | [3,2,1] | [] | |
| poll | [] | [1,2,3] | 1 |
| poll | [] | [2,3] | 2 |

## 9. Why Does It Work?

The first stack stores arrivals in reverse order. Transferring to the second stack reverses them again, exposing the oldest arrival first.

## 10. Java Code

```java
class QueueUsingStacks {
    private final Deque<Integer> in = new ArrayDeque<>();
    private final Deque<Integer> out = new ArrayDeque<>();

    public void offer(int value) {
        in.push(value);
    }

    public int poll() {
        moveIfNeeded();
        if (out.isEmpty()) {
            throw new IllegalStateException("Empty queue");
        }
        return out.pop();
    }

    public int peek() {
        moveIfNeeded();
        if (out.isEmpty()) {
            throw new IllegalStateException("Empty queue");
        }
        return out.peek();
    }

    private void moveIfNeeded() {
        if (out.isEmpty()) {
            while (!in.isEmpty()) {
                out.push(in.pop());
            }
        }
    }
}
```

## 11. Complexity

Each element moves from `in` to `out` at most once.

Amortized time: **O(1)** per operation.

Space: **O(n)**.

## 12. Edge Cases

- empty queue
- one item
- many offers before first poll
- many polls after transfer

## 13. Common Mistakes

- always transferring
- transferring into a non-empty `out`
- claiming every poll is O(n)

## 14. Pattern to Remember

```text
**Problem clue:** build FIFO behavior from a LIFO primitive.
**Pattern:** two stacks — a push side and a pop side that reverses order.
**Data structure:** two `Deque` stacks (`in` and `out`).
**What the stacks store:** `in` keeps arrival order; `out` holds a reversed copy ready to pop.
**When to push:** always onto `in`.
**When to pop:** if `out` is empty, dump all of `in` into `out`, then pop `out`.
**Invariant:** `out` (when non-empty) holds elements in FIFO order with the front on top.
**Key insight:** two reversals cancel out — composing LIFO with LIFO gives FIFO.
**Time:** amortized O(1) per operation (each element moves stacks once).
**Space:** O(n).
```

**Queue from stacks = two reversals.**

## 15. Interview Trigger

> When a FIFO requirement meets stack-only primitives, I think "Can I reverse twice?" Two stacks give exactly that.

---

# 5. Implement Stack using Linked List

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-stack-using-linkedlist) · [TUF article](https://takeuforward.org/data-structure/implement-stack-using-linked-list/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

Use linked nodes with the head as the stack top.

## 2. How to Think

A linked list gives constant-time insertion/removal at the head.

So:

```text
top
 ↓
30 -> 20 -> 10
```

## 3. Pattern Recognition

**LIFO + linked structure** => use the head.

## 4. Brute Force

Using the tail would require walking to the previous node for pop unless extra links are maintained.

## 5. Observation

The head is naturally a single active end.

## 6. Optimal Approach

Push and pop at the head.

## 7. Invariant

> **Invariant:** `head` is always the newest stack item.

## 8. Dry Run

```text
push 10 -> 10
push 20 -> 20 -> 10
pop -> 20
```

## 9. Why Does It Work?

Only the head changes, so each operation touches one node.

## 10. Java Code

```java
class LinkedStack {
    private static class Node {
        int value;
        Node next;

        Node(int value, Node next) {
            this.value = value;
            this.next = next;
        }
    }

    private Node head;

    public void push(int value) {
        head = new Node(value, head);
    }

    public int pop() {
        if (head == null) {
            throw new IllegalStateException("Empty stack");
        }
        int value = head.value;
        head = head.next;
        return value;
    }

    public int peek() {
        if (head == null) {
            throw new IllegalStateException("Empty stack");
        }
        return head.value;
    }

    public boolean isEmpty() {
        return head == null;
    }
}
```

## 11. Complexity

Push/pop/peek: **O(1)**.  
Space: **O(n)**.

## 12. Edge Cases

Empty, one node.

## 13. Common Mistakes

Pushing at the tail, which turns push into O(n).

## 14. Pattern to Remember

```text
**Problem clue:** LIFO with dynamic (unbounded) size.
**Pattern:** head insertion / head removal on a singly linked list.
**Data structure:** `Node` + a `head` pointer.
**What the stack stores:** nodes, with `head` pointing at the top.
**When to push:** make a new node the head.
**When to pop:** remove the head.
**Invariant:** the head node is always the most recently pushed element.
**Key insight:** a singly linked list already supports O(1) insert/remove at the head — that IS a stack.
**Time:** O(1) per operation.
**Space:** O(n).
```

**Linked-list stack = operate at head.**

## 15. Interview Trigger

> For LIFO on a linked list, I want a single end where insertion and deletion are both constant time. That end is the head.

---

# 6. Implement Queue using Linked List

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-queue-using-linkedlist) · [TUF article](https://takeuforward.org/data-structure/implement-queue-using-linked-list/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

Need FIFO:

```text
front -> 10 -> 20 -> 30 <- rear
```

## 2. How to Think

If we keep only a head pointer, enqueue at the tail may require traversal.

So keep **both** `front` and `rear`.

## 3. Pattern Recognition

FIFO on linked list = two active ends.

## 4. Brute Force

Walk to the tail on every enqueue: O(n).

## 5. Observation

Store the tail pointer.

## 6. Optimal Approach

- enqueue at `rear`
- dequeue at `front`

## 7. Invariant

> **Invariant:** `front` points to the next item to remove and `rear` points to the last inserted item.

## 8. Dry Run

```text
offer 10: front=10, rear=10
offer 20: front=10, rear=20
poll: removes 10, front=20
```

## 9. Why Does It Work?

Both ends are directly accessible.

## 10. Java Code

```java
class LinkedQueue {
    private static class Node {
        int value;
        Node next;

        Node(int value) {
            this.value = value;
        }
    }

    private Node front;
    private Node rear;

    public void offer(int value) {
        Node node = new Node(value);

        if (rear == null) {
            front = rear = node;
            return;
        }

        rear.next = node;
        rear = node;
    }

    public int poll() {
        if (front == null) {
            throw new IllegalStateException("Empty queue");
        }

        int value = front.value;
        front = front.next;

        if (front == null) {
            rear = null;
        }

        return value;
    }

    public int peek() {
        if (front == null) {
            throw new IllegalStateException("Empty queue");
        }
        return front.value;
    }

    public boolean isEmpty() {
        return front == null;
    }
}
```

## 11. Complexity

Offer/poll/peek: **O(1)**.  
Space: **O(n)**.

## 12. Edge Cases

Removing last item must also set `rear = null`.

## 13. Common Mistakes

- forgetting to update rear when queue becomes empty
- traversing from front to enqueue

## 14. Pattern to Remember

```text
**Problem clue:** FIFO with dynamic size.
**Pattern:** linked list with both a head (front) and a tail (rear).
**Data structure:** `Node` + `head`/`tail` pointers.
**What the queue stores:** nodes ordered from `head` (oldest) to `tail` (newest).
**When to push:** append after `tail` and advance `tail`.
**When to pop:** remove the head.
**Invariant:** `head` is the front and `tail` is the rear.
**Key insight:** the `tail` pointer is what makes enqueue O(1); without it you would scan the whole list.
**Time:** O(1) per operation.
**Space:** O(n).
```

**Queue linked list = front + rear.**

## 15. Interview Trigger

> FIFO means two active ends. In a linked list, keep a pointer to both so neither side needs traversal.

---

# 7. Balanced Parentheses

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/balanced-paranthesis) · [LeetCode](https://leetcode.com/problems/valid-parentheses/) · [TUF article](https://takeuforward.org/data-structure/check-for-balanced-parentheses/) · [Video](https://youtu.be/xwjS0iZhw4I?si=UoyKpFn4Q3nf5h2R)

## 1. Problem Understanding

Given a string containing brackets such as `()[]{}`, determine whether they are properly matched and nested.

Example:

```text
{ [ ( ) ] }  -> valid
{ [ ( ] ) }  -> invalid
```

## 2. How to Think About the Problem

The key word is **matching + nested**.

When a closing bracket arrives, which opening bracket should it match?

The answer is the **most recent unmatched opening bracket**.

That is LIFO.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** nested/matching brackets  
**Observation:** latest unmatched opening bracket must close first  
**Pattern:** LIFO matching  
**Data structure:** stack  
**Algorithm:** push opens, pop on closes

## 3. Pattern Recognition

**Problem clue:** matching parentheses.

**Pattern:** stack.

**Why:** nested structures close in reverse order of opening.

**Mental model:**

```text
push '('
push '['
push '{'
close '}' -> must match '{'
close ']' -> must match '['
close ')' -> must match '('
```

Similar problems: XML-like nesting, expression parsing, function scopes.

## 4. Brute Force

Repeatedly remove `()`, `[]`, `{}` pairs from the string.

This repeatedly scans and modifies the string, which can become O(n²).

## 5. Observation

We only need the most recent unmatched opening bracket.

The stack remembers exactly that.

```text
repeated rescanning
        ↓
remember unresolved opens
        ↓
stack
```

## 6. Optimal Approach

For each character:

- opening bracket -> push it
- closing bracket -> top must be its matching opener, then pop
- otherwise invalid

At the end, stack must be empty.

## 7. Invariant

> **Invariant:** The stack contains exactly the opening brackets that have appeared but have not yet been matched, in nesting order.

## 8. Dry Run

Input: `([{}])`

| char | stack before | action | stack after |
|---|---|---|---|
| `(` | [] | push | [(] |
| `[` | [(] | push | [(,[] |
| `{` | [(,[] | push | [(,[,{] |
| `}` | ... | pop `{` | [(,[] |
| `]` | ... | pop `[` | [(] |
| `)` | ... | pop `(` | [] |

## 9. Why Does It Work?

Every close must match the innermost open bracket. The stack top is exactly the innermost unmatched bracket.

## 10. Java Code

```java
class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();

        for (char ch : s.toCharArray()) {
            if (ch == '(' || ch == '[' || ch == '{') {
                stack.push(ch);
            } else {
                if (stack.isEmpty()) return false;

                char open = stack.pop();

                if ((ch == ')' && open != '(') ||
                    (ch == ']' && open != '[') ||
                    (ch == '}' && open != '{')) {
                    return false;
                }
            }
        }

        return stack.isEmpty();
    }
}
```

## 11. Complexity

Time **O(n)** because each character is pushed/popped at most once.

Space **O(n)** in the worst case.

## 12. Edge Cases

- empty string
- only open brackets
- starts with a close bracket
- mixed bracket types
- odd length

## 13. Common Mistakes

- checking counts only
- matching against the oldest opening bracket instead of the newest
- forgetting final `stack.isEmpty()`

## 14. Pattern to Remember

```text
**Problem clue:** nested open/close symbols that must match.
**Pattern:** matching pairs handled most-recent-first.
**Data structure:** `Deque` stack of opening brackets.
**What the stack stores:** every opening bracket whose matching close has not been seen.
**When to push:** on any opening bracket.
**When to pop:** on a closing bracket, after verifying it matches the top.
**Invariant:** the stack top is the most recent bracket still waiting to close.
**Key insight:** the most recent opener must close first — that is LIFO by definition.
**Time:** O(n).
**Space:** O(n).
```

```text
Clue: nested matching
Pattern: LIFO
Data structure: stack
Stores: unmatched opening brackets
Push: opening bracket
Pop: matching closing bracket
Invariant: stack = unresolved opens
Time: O(n)
Space: O(n)
```

**Memory trick:** **Nested things close backwards.**

## 15. Interview Trigger

> When I see nested brackets, I immediately think "most recent unmatched opener." That is LIFO, so I use a stack.

---

# 8. Implement Min Stack

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/implement-min-stack) · [LeetCode](https://leetcode.com/problems/min-stack/) · [TUF article](https://takeuforward.org/data-structure/implement-min-stack-o2n-and-on-space-complexity/) · [Video](https://youtu.be/NdDIaH91P0g?si=4_Jbsq5trFvfSdUY)

## 1. Problem Understanding

Support:

- push
- pop
- top
- getMin

all in O(1).

The difficulty is that the minimum may be buried deep in the stack.

## 2. How to Think

A normal stack knows its top. It does not know its minimum.

Question:

> Can I store extra information at each level so that the minimum is always available?

Yes. For every stack state, store its minimum.

Example:

```text
value:  5   2   4
min:    5   2   2
```

## 3. Pattern Recognition

**Problem clue:** one normal operation plus a global property that must be queried instantly.

**Pattern:** augment the data structure with metadata.

## 4. Brute Force

Scan the entire stack on every `getMin()`.

That is O(n) per query.

## 5. Observation

When pushing `x`, the new minimum is:

```text
min(x, previousMin)
```

Store it.

## 6. Optimal Approach

Use two stacks:

- value stack
- min stack

At each depth, `minStack.top()` is the minimum of all values up to that depth.

## 7. Invariant

> **Invariant:** `minStack.peek()` is the minimum value currently present in the normal stack.

## 8. Dry Run

| op | values | mins |
|---|---|---|
| push(5) | [5] | [5] |
| push(2) | [5,2] | [5,2] |
| push(4) | [5,2,4] | [5,2,2] |
| pop | [5,2] | [5,2] |
| getMin | | 2 |

## 9. Why Does It Work?

Each pushed element records the minimum for the stack state created by that push. When it is removed, the previous minimum is restored automatically by the min stack.

## 10. Java Code

```java
class MinStack {
    private final Deque<Integer> values = new ArrayDeque<>();
    private final Deque<Integer> mins = new ArrayDeque<>();

    public void push(int value) {
        values.push(value);

        if (mins.isEmpty()) {
            mins.push(value);
        } else {
            mins.push(Math.min(value, mins.peek()));
        }
    }

    public void pop() {
        if (values.isEmpty()) {
            throw new IllegalStateException("Empty stack");
        }

        values.pop();
        mins.pop();
    }

    public int top() {
        if (values.isEmpty()) {
            throw new IllegalStateException("Empty stack");
        }
        return values.peek();
    }

    public int getMin() {
        if (mins.isEmpty()) {
            throw new IllegalStateException("Empty stack");
        }
        return mins.peek();
    }
}
```

## 11. Complexity

Every operation is O(1). Space O(n).

## 12. Edge Cases

Duplicates of the minimum, one element, negative values.

## 13. Common Mistakes

- storing only new minima, then mishandling duplicates
- forgetting to pop the min stack with the value stack

## 14. Pattern to Remember

```text
**Problem clue:** stack + an extra O(1) query (current minimum) on top of normal ops.
**Pattern:** augmented stack — store the answer for every depth.
**Data structure:** two stacks (values + running minima).
**What the stacks store:** each pushed value, and the minimum of everything below it.
**When to push:** push the value AND `min(value, currentMin)`.
**When to pop:** pop both stacks.
**Invariant:** `minStack.peek()` is the minimum of the values currently in the stack.
**Key insight:** maintaining "min so far per depth" answers the query from the top instead of scanning.
**Time:** O(1) for every operation.
**Space:** O(n).
```

**Need O(1) query? Store enough metadata to answer it from the top.**

## 15. Interview Trigger

> When a stack needs an extra query in O(1), ask: "Can I maintain the answer for each stack depth?" That turns a global scan into a top lookup.

---

# 9. Infix to Postfix Conversion

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/infix-to-postfix-conversion) · [TUF article](https://takeuforward.org/data-structure/infix-to-postfix/) · [Video](https://youtu.be/4pIc9UBHJtk?si=ryeVvQWpCgwbTQrh)

## 1. Problem Understanding

Infix:

```text
A + B * C
```

Postfix:

```text
A B C * +
```

Why is this useful? Postfix removes the ambiguity of operator precedence.

## 2. How to Think

Operands can go directly to output.

Operators cannot always go directly because a higher-priority operator may need to appear first.

So operators need to wait.

What structure naturally stores the most recent waiting operators?

A stack.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** operator precedence + delayed output  
**Observation:** operators wait until it is safe to output them  
**Pattern:** operator stack  
**Data structure:** stack  
**Algorithm:** output operands; pop higher/equal precedence operators before pushing current

## 3. Pattern Recognition

**Problem clue:** expression conversion.

**Pattern:** precedence stack.

**Mental model:** The output is immediate for operands; operators enter a waiting room.

## 4. Brute Force

Repeatedly evaluate or parenthesize subexpressions based on precedence.

That is more complicated and can be inefficient.

## 5. Observation

We only need to delay operators.

## 6. Optimal Approach

Scan left to right:

- operand -> output
- `(` -> push
- `)` -> pop until `(`
- operator -> pop operators with higher/equal precedence, then push current
- end -> pop remaining operators

Associativity matters for `^`.

## 7. Invariant

> **Invariant:** The operator stack contains operators that have been seen but cannot yet be emitted, ordered so the next safe operator is near the top.

## 8. Dry Run

`A+B*C`

| token | stack | output |
|---|---|---|
| A | [] | A |
| + | [+] | A |
| B | [+] | AB |
| * | [+,*] | AB |
| C | [+,*] | ABC |
| end | [] | ABC*+ |

## 9. Why Does It Work?

Before pushing an operator, every operator above it in precedence must be emitted first. Thus the stack delays exactly the operators whose output order has not been finalized.

## 10. Java Code

```java
class InfixPostfix {
    private static int precedence(char op) {
        return switch (op) {
            case '+', '-' -> 1;
            case '*', '/' -> 2;
            case '^' -> 3;
            default -> -1;
        };
    }

    public static String convert(String expression) {
        StringBuilder out = new StringBuilder();
        Deque<Character> stack = new ArrayDeque<>();

        for (char ch : expression.toCharArray()) {
            if (Character.isLetterOrDigit(ch)) {
                out.append(ch);
            } else if (ch == '(') {
                stack.push(ch);
            } else if (ch == ')') {
                while (!stack.isEmpty() && stack.peek() != '(') {
                    out.append(stack.pop());
                }
                stack.pop();
            } else {
                while (!stack.isEmpty()
                        && stack.peek() != '('
                        && precedence(stack.peek()) >= precedence(ch)
                        && ch != '^') {
                    out.append(stack.pop());
                }
                stack.push(ch);
            }
        }

        while (!stack.isEmpty()) {
            out.append(stack.pop());
        }

        return out.toString();
    }
}
```

## 11. Complexity

Time O(n), space O(n).

## 12. Edge Cases

Parentheses, repeated precedence, right-associative exponentiation.

## 13. Common Mistakes

- wrong associativity for `^`
- not flushing the stack
- popping past `(`

## 14. Pattern to Remember

```text
**Problem clue:** expression conversion where operator output order depends on precedence.
**Pattern:** shunting-yard operator stack.
**Data structure:** `Deque<Character>` of pending operators.
**What the stack stores:** operators that have been seen but cannot be emitted yet.
**When to push:** on `(`, or on an operator after popping higher/equal-precedence operators.
**When to pop:** higher/equal-precedence operators before pushing the current one, up to `(` on `)`, and the rest at the end.
**Invariant:** the stack keeps operators ordered so the next safe operator sits on top.
**Key insight:** operands are output immediately; only operators need a waiting room.
**Time:** O(n).
**Space:** O(n).
```

**Operands output now; operators wait in a precedence stack.**

## 15. Interview Trigger

> Expression conversion is not mainly about strings. It is about delayed operators and precedence. Once operators need to wait, a stack is the natural structure.

---

# 10–14. Prefix/Postfix Expression Conversions

These five problems are mostly the **same underlying pattern**.

The small difference is **scan direction** and **operand order**.

## Core pattern

### Prefix

```text
+ A * B C
```

Scan **right to left**.

### Postfix

```text
A B C * +
```

Scan **left to right**.

Why?

Because in prefix, an operator comes before its operands, so its required operands lie to its right. In postfix, the operands have already appeared on its left.

## 10. Prefix to Infix Conversion

### Pattern to Remember

```text
**Problem clue:** operator comes before its operands; output must be infix.
**Pattern:** expression stack, scanned right-to-left.
**Data structure:** `Deque<String>` of partial expressions.
**What the stack stores:** one complete sub-expression per already-processed token.
**When to push:** an operand or a freshly combined expression.
**When to pop:** two operands when an operator is read, then push the combined result.
**Invariant:** after each token, the stack holds complete, valid sub-expressions.
**Key insight:** scanning right-to-left makes an operator's operands already available beneath it.
**Time:** O(n).
**Space:** O(n).
```

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/prefix-to-infix-conversion) · [TUF article](https://takeuforward.org/data-structure/prefix-to-infix-conversion) · [Video](https://youtu.be/4pIc9UBHJtk?si=ryeVvQWpCgwbTQrh)

### Problem Understanding

Input:

```text
* + A B C
```

Output:

```text
((A+B)*C)
```

### How to Think

Scan from right to left.

When you see an operand, push its expression.

When you see an operator:

- pop first operand
- pop second operand
- combine
- push result

### Invariant

> **Invariant:** The stack contains complete infix expressions for already processed parts.

### Java

```java
public static String prefixToInfix(String expression) {
    Deque<String> stack = new ArrayDeque<>();

    for (int i = expression.length() - 1; i >= 0; i--) {
        char ch = expression.charAt(i);

        if (Character.isWhitespace(ch)) continue;

        if (Character.isLetterOrDigit(ch)) {
            stack.push(String.valueOf(ch));
        } else {
            String first = stack.pop();
            String second = stack.pop();
            stack.push("(" + first + ch + second + ")");
        }
    }

    return stack.peek();
}
```

### Complexity

O(n) time, O(n) space.

### Interview trigger

> Prefix means the operator comes first, so scan from the opposite side—right to left—so the operands are available when I need them.

---

## 11. Prefix to Postfix Conversion

### Pattern to Remember

```text
**Problem clue:** operator first, output operator-last form.
**Pattern:** same right-to-left expression stack as Prefix→Infix.
**Data structure:** `Deque<String>`.
**What the stack stores:** partial postfix sub-expressions.
**When to push:** an operand or a combined sub-expression.
**When to pop:** two operands on an operator; combine as `"operand1 operand2 op"`.
**Invariant:** every stack entry is a valid postfix sub-expression.
**Key insight:** identical to Prefix→Infix except the combine order/output format.
**Time:** O(n).
**Space:** O(n).
```

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/prefix-to-postfix-conversion) · [TUF article](https://takeuforward.org/data-structure/prefix-to-postfix-conversion) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

### How to Think

Exactly the same scan direction and stack idea.

For:

```text
* + A B C
```

Build:

```text
A B + C *
```

### Java

```java
public static String prefixToPostfix(String expression) {
    Deque<String> stack = new ArrayDeque<>();

    for (int i = expression.length() - 1; i >= 0; i--) {
        char ch = expression.charAt(i);

        if (Character.isWhitespace(ch)) continue;

        if (Character.isLetterOrDigit(ch)) {
            stack.push(String.valueOf(ch));
        } else {
            String left = stack.pop();
            String right = stack.pop();
            stack.push(left + right + ch);
        }
    }

    return stack.pop();
}
```

### Important connection

> Same as Prefix → Infix. Only the combination formula changes.

---

## 12. Postfix to Prefix Conversion

### Pattern to Remember

```text
**Problem clue:** operands first, output operator-first form.
**Pattern:** left-to-right expression stack.
**Data structure:** `Deque<String>`.
**What the stack stores:** partial prefix sub-expressions.
**When to push:** an operand.
**When to pop:** two operands on an operator; combine as `"op operand1 operand2"`.
**Invariant:** every stack entry is a valid prefix sub-expression.
**Key insight:** scan the direction in which operands appear before the operator — here left-to-right.
**Time:** O(n).
**Space:** O(n).
```

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/postfix-to-prefix-conversion) · [TUF article](https://takeuforward.org/data-structure/postfix-to-prefix-conversion) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

### How to Think

Postfix means operands arrive before the operator, so scan left to right.

When an operator arrives, pop:

- `right`
- then `left`

Build:

```text
operator + left + right
```

### Java

```java
public static String postfixToPrefix(String expression) {
    Deque<String> stack = new ArrayDeque<>();

    for (char ch : expression.toCharArray()) {
        if (Character.isWhitespace(ch)) continue;

        if (Character.isLetterOrDigit(ch)) {
            stack.push(String.valueOf(ch));
        } else {
            String right = stack.pop();
            String left = stack.pop();
            stack.push("" + ch + left + right);
        }
    }

    return stack.pop();
}
```

### Critical mistake

Do not reverse the operand order:

```text
a b -
```

means:

```text
a - b
```

not:

```text
b - a
```

---

## 13. Postfix to Infix Conversion

### Pattern to Remember

```text
**Problem clue:** operands first, need infix with grouping.
**Pattern:** left-to-right expression stack (same scan as Postfix→Prefix).
**Data structure:** `Deque<String>`.
**What the stack stores:** partial infix sub-expressions.
**When to push:** an operand.
**When to pop:** two operands on an operator; combine as `"(operand1 op operand2)"`.
**Invariant:** every stack entry is a valid parenthesized infix expression.
**Key insight:** identical scan to Postfix→Prefix; only the wrapping/combine format changes.
**Time:** O(n).
**Space:** O(n).
```

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/postfix-to-infix-conversion) · [TUF article](https://takeuforward.org/data-structure/postfix-to-infix) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

### Java

```java
public static String postfixToInfix(String expression) {
    Deque<String> stack = new ArrayDeque<>();

    for (char ch : expression.toCharArray()) {
        if (Character.isWhitespace(ch)) continue;

        if (Character.isLetterOrDigit(ch)) {
            stack.push(String.valueOf(ch));
        } else {
            String right = stack.pop();
            String left = stack.pop();
            stack.push("(" + left + ch + right + ")");
        }
    }

    return stack.pop();
}
```

### Mental model

> Postfix: operands are ready before the operator arrives.

---

## 14. Infix to Prefix Conversion

### Pattern to Remember

```text
**Problem clue:** convert infix to prefix.
**Pattern:** mirror trick — reuse Infix→Postfix on a reversed string, then reverse the result.
**Data structure:** `Deque<Character>` operator stack (the close cousin of Infix→Postfix).
**What the stack stores:** pending operators during the mirrored pass.
**When to push:** same rule as Infix→Postfix, on the reversed string with `(` and `)` swapped.
**When to pop:** same rule as Infix→Postfix.
**Invariant:** the mirrored pass produces a valid postfix of the reversed expression.
**Key insight:** reversing again turns that postfix into the required prefix.
**Time:** O(n).
**Space:** O(n).
```

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/infix-to-prefix-conversion) · [TUF article](https://takeuforward.org/data-structure/infix-to-prefix/) · [Video](https://youtu.be/4pIc9UBHJtk?si=0pWtyDC1GhbiYP3P)

This is the one that differs more because infix has precedence and parentheses.

A reliable interview derivation:

1. reverse the infix expression
2. swap `(` and `)`
3. convert that expression to postfix
4. reverse the result

Example:

```text
(A+B)*C
   ↓ reverse
C*)B+A(
   ↓ swap brackets
C*(B+A)
   ↓ postfix
CBA+*
   ↓ reverse
*+ABC
```

### Java

```java
class InfixPrefix {
    private static int precedence(char op) {
        return switch (op) {
            case '+', '-' -> 1;
            case '*', '/' -> 2;
            case '^' -> 3;
            default -> -1;
        };
    }

    public static String convert(String expression) {
        StringBuilder reversed = new StringBuilder();

        for (int i = expression.length() - 1; i >= 0; i--) {
            char ch = expression.charAt(i);

            if (ch == '(') reversed.append(')');
            else if (ch == ')') reversed.append('(');
            else reversed.append(ch);
        }

        String postfix = toPostfixForPrefix(reversed.toString());
        return new StringBuilder(postfix).reverse().toString();
    }

    private static String toPostfixForPrefix(String expression) {
        StringBuilder out = new StringBuilder();
        Deque<Character> stack = new ArrayDeque<>();

        for (char ch : expression.toCharArray()) {
            if (Character.isWhitespace(ch)) continue;

            if (Character.isLetterOrDigit(ch)) {
                out.append(ch);
            } else if (ch == '(') {
                stack.push(ch);
            } else if (ch == ')') {
                while (!stack.isEmpty() && stack.peek() != '(') {
                    out.append(stack.pop());
                }
                stack.pop();
            } else {
                while (!stack.isEmpty()
                        && stack.peek() != '('
                        && precedence(stack.peek()) > precedence(ch)) {
                    out.append(stack.pop());
                }
                stack.push(ch);
            }
        }

        while (!stack.isEmpty()) {
            out.append(stack.pop());
        }

        return out.toString();
    }
}
```

### Pattern to remember for 10–14

```text
Prefix -> scan right to left
Postfix -> scan left to right
Operator -> pop two expressions
Order matters: second pop is usually the left operand
Infix -> precedence stack
```

---

# 15. Next Greater Element

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/next-greater-element) · [LeetCode](https://leetcode.com/problems/next-greater-element-i/) · [TUF article](https://takeuforward.org/data-structure/next-greater-element-using-stack/) · [Video](https://youtu.be/e7XQLtOQM3I?si=QdcHpTtx6gAHsext)

## 1. Problem Understanding

For every element, find the first element to its right that is greater.

Example:

```text
[2, 1, 5, 3, 4]

2 -> 5
1 -> 5
5 -> -1
3 -> 4
4 -> -1
```

## 2. How to Think

The phrase **next greater** is the giant clue.

For each element, we are asking:

> "Which future element is the first one that can resolve me?"

So unresolved elements should wait.

What order should they wait in?

A **decreasing stack of values/indices**.

Why decreasing?

If the top is smaller than current, current can resolve it.

## 3. Pattern Recognition

**Problem clue:** next + greater + to right.

**Pattern:** monotonic decreasing stack.

**Mental model:** stack = unresolved elements.

## 4. Brute Force

For every `i`, scan `j = i+1...n-1` until a greater value is found.

Worst case:

```text
[5,4,3,2,1]
```

For almost every element, we scan a long suffix.

Time O(n²).

## 5. Observation

A current value can resolve multiple smaller unresolved elements at once.

```text
stack: [5,4,3,2]
current = 6

6 resolves 2,3,4,5
```

## 6. Optimal Approach

Scan left to right.

While stack top value < current:

- pop index
- answer for popped index = current

Then push current index.

## 7. Invariant

> **Invariant:** Stack indices represent unresolved elements, and their values are in decreasing order from bottom to top.

## 8. Dry Run

Input `[2,1,5,3,4]`

| current | stack before | pops | stack after | answers |
|---|---|---|---|---|
| 2 | [] | none | [2] | |
| 1 | [2] | none | [2,1] | |
| 5 | [2,1] | 1->5, 2->5 | [5] | [5,5,-1,-1,-1] |
| 3 | [5] | none | [5,3] | |
| 4 | [5,3] | 3->4 | [5,4] | [5,5,-1,4,-1] |

## 9. Why Does It Work?

For a popped element `x`, current is the first greater value seen to its right because:

1. we process left to right
2. no earlier right-side element greater than `x` was able to pop it
3. current is now greater, so it is the first such element

## 10. Java Code

```java
class Solution {
    public int[] nextGreaterElement(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        Arrays.fill(answer, -1);

        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
                int index = stack.pop();
                answer[index] = nums[i];
            }

            stack.push(i);
        }

        return answer;
    }
}
```

## 11. Complexity

Time O(n): each index is pushed once and popped at most once.

Space O(n).

## 12. Edge Cases

Increasing, decreasing, equal values, one element.

## 13. Common Mistakes

- using a stack that is increasing instead
- storing values when index is needed for answers
- using `<=` without considering duplicate semantics

## 14. Pattern to Remember

```text
**Problem clue:** first strictly greater element to the right.
**Pattern:** unresolved elements waiting for a greater value.
**Data structure:** decreasing monotonic stack of indices.
**What the stack stores:** indices whose next greater element has NOT been found yet.
**When to push:** every index, after processing.
**When to pop:** while `nums[top] < nums[current]` — current answers those tops.
**Invariant:** the values of stacked indices are non-increasing, and all of them are unresolved.
**Key insight:** an element stays in the stack exactly until a greater element to its right appears.
**Time:** O(n) — each index pushed once, popped at most once.
**Space:** O(n).
```

```text
Clue: next greater
Pattern: decreasing monotonic stack
Stores: unresolved indices
Push: every index
Pop: while current > stack top
Invariant: unresolved values decrease
```

**Memory trick:** **Next greater waits in a decreasing stack.**

## 15. Interview Trigger

> "Next greater" means each element is waiting for a future answer. I scan left to right and keep unresolved elements in decreasing order. A larger current value resolves smaller elements.

---

# 16. Next Greater Element II — Circular

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/next-greater-element---2) · [LeetCode](https://leetcode.com/problems/next-greater-element-ii/) · [TUF article](https://takeuforward.org/data-structure/next-greater-element-2) · [Video](https://youtu.be/7PrncD7v9YQ?si=UkBc7eVy9HGlBpeW)

## 1. Problem Understanding

Same problem, but the array is circular.

For the last element, the "right side" continues at the beginning.

## 2. How to Think

This is **not a new pattern**.

> It is Next Greater Element + wrap-around.

The trick is to simulate two traversals without copying the array.

Process indices:

```text
0,1,2,...,n-1,0,1,2,...,n-1
```

Use `i % n`.

## 3. Pattern Recognition

**Clue:** next greater + circular.

**Pattern:** same monotonic stack, double pass.

## 4. Brute Force

For each index, search at most n-1 wrapped elements: O(n²).

## 5. Observation

Every element gets a second chance after the end, but only once is necessary.

## 6. Optimal Approach

Loop `i = 0` to `2n-1`.

Current index:

```java
int index = i % n;
```

Only push during the first pass.

## 7. Invariant

> **Invariant:** The stack contains unresolved indices whose possible greater element may still appear in the simulated future traversal.

## 8. Dry Run

`[1,2,1]`

Second pass lets index 2 see index 1/0 again.

Answers:

```text
1 -> 2
2 -> -1
1 -> 2
```

## 9. Why Does It Work?

The doubled traversal contains exactly the next `n-1` positions available to each index in the circular array.

## 10. Java Code

```java
class Solution {
    public int[] nextGreaterElements(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        Arrays.fill(answer, -1);

        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < 2 * n; i++) {
            int index = i % n;

            while (!stack.isEmpty() && nums[stack.peek()] < nums[index]) {
                answer[stack.pop()] = nums[index];
            }

            if (i < n) {
                stack.push(index);
            }
        }

        return answer;
    }
}
```

## 11. Complexity

O(n) time, O(n) space.

## 12. Edge Cases

- Single element → answer `-1`.
- All elements equal, or strictly increasing → every answer stays `-1` (no wrapped neighbor is greater).
- Strictly decreasing array → each element resolves to the very next element, and the last one resolves to index 0.
- Duplicates → keep a strict `<`; equal values never resolve each other.
- The maximum element → `-1` even after the whole second pass.

## 13. Common Mistakes

- Iterating only `n` times — the last few indices never get their wrapped chance.
- Pushing indices during the second pass — duplicates pollute the stack.
- Forgetting `% n` on the doubled loop.
- Using `<=` so equal elements wrongly resolve each other.

## 14. Pattern to Remember

```text
**Problem clue:** next greater, but the array is circular.
**Pattern:** decreasing monotonic stack + a simulated double traversal.
**Data structure:** decreasing monotonic stack of indices.
**What the stack stores:** unresolved indices (only pushed in the first pass).
**When to push:** index `i` when `i < n`.
**When to pop:** while `nums[top] < nums[i % n]` over indices `0..2n-1`.
**Invariant:** same as Next Greater Element, applied over the virtual `2n` array.
**Key insight:** the second pass is the "wrap-around" — reuse the exact same loop.
**Time:** O(n).
**Space:** O(n).
```

**Circular next greater = same stack + 2n simulation.**  (memory trick)

## 15. Interview Trigger

> When a monotonic-stack problem becomes circular, first ask: "Can I simulate the wrapped section by traversing twice?" Usually yes.

---

# 17. Next Smaller Element

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/next-smaller-element) · [TUF article](https://takeuforward.org/data-structure/next-smaller-element)

This is the exact mirror of Next Greater.

## 1. Problem Understanding

Find first smaller element to the right.

Example:

```text
[5,3,4,2]

5 -> 3
3 -> 2
4 -> 2
2 -> -1
```

## 2. How to Think

Same unresolved-element idea.

But now a smaller current value resolves larger waiting values.

Therefore the stack must be **increasing**.

## 3. Pattern Recognition

**Clue:** next smaller.

**Pattern:** increasing monotonic stack.

## 4. Brute Force

Scan right until a smaller value: O(n²).

## 5. Observation

A current small value may resolve several larger unresolved elements.

## 6. Optimal Approach

While stack top value > current:

```text
answer[stack.pop()] = current
```

Then push current index.

## 7. Invariant

> **Invariant:** Stack values are increasing and unresolved.

## 8. Dry Run

`[5,3,4,2]`

At `3`, pop `5`.
At `2`, pop `4`, then `3`.

## 9. Why Does It Work?

The current value is the first smaller value encountered for every popped index.

## 10. Java Code

```java
class Solution {
    public int[] nextSmallerElement(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        Arrays.fill(answer, -1);

        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] > nums[i]) {
                answer[stack.pop()] = nums[i];
            }
            stack.push(i);
        }

        return answer;
    }
}
```

## 11. Complexity

O(n) time, O(n) space.

## 12. Edge Cases

- Empty / single element → answer `-1`.
- Strictly increasing array → each element resolves to the very next one.
- Strictly decreasing array → every answer is `-1` (nothing smaller to the right).
- Duplicates → keep a strict `>`; equal values never resolve each other.

## 13. Common Mistakes

- Keeping the "greater" comparison but a "smaller" stack order.
- Using `>=` / `<=` so equal values wrongly resolve each other.
- Reading `stack.peek()` instead of `nums[stack.peek()]`.

## 14. Pattern to Remember

```text
**Problem clue:** first strictly smaller element to the right.
**Pattern:** exact mirror of Next Greater Element.
**Data structure:** increasing monotonic stack of indices.
**What the stack stores:** indices whose next smaller element has NOT been found.
**When to push:** every index, after processing.
**When to pop:** while `nums[top] > nums[current]`.
**Invariant:** the values of stacked indices are non-decreasing, and all are unresolved.
**Key insight:** flip the inequality (and thereby the stack order) and NGE becomes NSE.
**Time:** O(n).
**Space:** O(n).
```

```text
Next greater -> decreasing stack
Next smaller -> increasing stack
```
(memory trick: the clue gives the inequality; the inequality sets the stack direction)

## 15. Interview Trigger

> "Next smaller" → increasing stack → pop while `top > current`. This is Next Greater Element with the comparison flipped — everything else is identical.

---

# 18. Number of Greater Elements to the Right

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/number-of-greater-elements-to-the-right) · [TUF article](https://takeuforward.org/data-structure/number-of-nges-to-the-right)

## 1. Problem Understanding

For each query index, count how many elements to its right are greater than it.

This is different from **next greater**.

We are not looking for the first greater. We want a **count**.

## 2. How to Think

A naive approach compares against every element to the right.

Can a stack alone give the exact count? Not for arbitrary values with this basic setup.

An efficient general approach is to scan from right to left and maintain an ordered frequency structure, such as a Fenwick tree after coordinate compression.

This problem is therefore a useful warning:

> Not every "greater to the right" problem is a monotonic-stack problem.

## 3. Pattern Recognition

**Clue:** count how many greater elements exist, not nearest greater.

**Pattern:** right-to-left + order statistics.

## 4. Brute Force

For each `i`, count `j > i` with `nums[j] > nums[i]`.

O(n²).

## 5. Observation

When scanning right to left, all elements already seen are exactly the elements to the right.

So we need:

```text
count(values > nums[i])
```

Use coordinate compression + Fenwick tree.

## 6. Optimal Approach

1. compress values to ranks
2. scan right to left
3. Fenwick tree stores frequencies
4. query total count - count(values <= current)

## 7. Invariant

> **Invariant:** Before processing index `i`, the Fenwick tree contains exactly the multiset of values strictly to the right of `i`.

## 8. Dry Run

`[3,1,4,2]`

At `3`, right side = `[1,4,2]`; only `4` is greater.

At `1`, right side = `[4,2]`; both are greater.

## 9. Why Does It Work?

The ordered-frequency tree summarizes the entire suffix while supporting prefix counts in O(log n).

## 10. Java Code

```java
class Fenwick {
    private final int[] tree;

    Fenwick(int n) {
        tree = new int[n + 1];
    }

    void add(int index, int delta) {
        for (; index < tree.length; index += index & -index) {
            tree[index] += delta;
        }
    }

    int sum(int index) {
        int result = 0;
        for (; index > 0; index -= index & -index) {
            result += tree[index];
        }
        return result;
    }
}

class Solution {
    public int[] countGreaterRight(int[] nums) {
        int n = nums.length;
        int[] sorted = nums.clone();
        Arrays.sort(sorted);

        Map<Integer, Integer> rank = new HashMap<>();
        int r = 1;
        for (int value : sorted) {
            if (!rank.containsKey(value)) {
                rank.put(value, r++);
            }
        }

        Fenwick bit = new Fenwick(r);
        int[] answer = new int[n];
        int seen = 0;

        for (int i = n - 1; i >= 0; i--) {
            int currentRank = rank.get(nums[i]);
            int lessOrEqual = bit.sum(currentRank);
            answer[i] = seen - lessOrEqual;

            bit.add(currentRank, 1);
            seen++;
        }

        return answer;
    }
}
```

## 11. Complexity

Sorting O(n log n), each Fenwick operation O(log n), total O(n log n). Space O(n).

## 12. Edge Cases

Duplicates: greater means strictly greater.

## 13. Common Mistake

Assuming every "greater to the right" question should be solved with the standard next-greater stack.

## 14. Pattern to Remember

```text
**Problem clue:** COUNT all greater elements to the right, not just the nearest one.
**Pattern:** order statistic over the suffix — "count" is not "nearest".
**Data structure:** brute suffix scan O(n²); Fenwick tree (BIT) O(n log n) for repeated queries.
**What it stores:** every value seen to the right.
**When to process:** iterate right-to-left; ask "how many seen values > current".
**When to pop:** n/a — a plain stack collapses duplicates and under-counts; use a range structure.
**Invariant:** the structure contains exactly the elements to the right of `i`.
**Key insight:** the word "count" (not "nearest") tells you a range query is needed.
**Time:** O(n) with brute / O(n log n) preprocess with BIT.
**Space:** O(1) or O(n).
```

```text
Nearest greater -> monotonic stack
Count of greater -> ordered frequency structure
```

## 15. Interview Trigger

> First ask whether the problem needs the **nearest** greater element or the **number** of greater elements. "Count" changes the pattern.

---

# 19. Trapping Rain Water

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/trapping-rainwater) · [LeetCode](https://leetcode.com/problems/trapping-rain-water/) · [TUF article](https://takeuforward.org/data-structure/trapping-rainwater/) · [Video](https://youtu.be/1_5VuquLbXg?si=NFG6df318_6OtGvg)

## 1. Problem Understanding

Given heights, determine how much water is trapped between bars.

Example:

```text
      |
  |   | |
  | | | |
 _|_|_|_|_
```

The water above a position depends on the highest wall on the left and right.

## 2. How to Think

At index `i`:

```text
water[i] = min(maxLeft, maxRight) - height[i]
```

There are several approaches:

- prefix/suffix maxima: O(n) space
- two pointers: O(1) extra space
- monotonic stack: O(n) space

Because this is a Stack/Queue guide, derive the stack version.

### Why stack?

A bar may remain unresolved until we see a right wall tall enough to trap water above it.

That is another unresolved-element pattern.

## 3. Pattern Recognition

**Clue:** middle valleys are resolved when a right boundary arrives.

**Pattern:** decreasing stack of indices.

## 4. Brute Force

For each index find max left and max right: O(n²).

## 5. Observation

Instead of recomputing boundaries for every index, a monotonic stack remembers valley bars.

When current bar is higher than the stack top, a trapped region can close.

## 6. Optimal Approach

While current height > stack-top height:

- pop `bottom`
- if stack empty, there is no left wall
- otherwise new top is left wall
- current is right wall
- width = current index - left index - 1
- bounded height = min(leftHeight, rightHeight) - bottomHeight

## 7. Invariant

> **Invariant:** Stack indices have non-increasing heights and represent bars that are still waiting for a right boundary.

## 8. Dry Run

For `[4,2,0,3,2,5]`, when `3` arrives:

```text
bottom = 0-height bar
left boundary = 2
right boundary = 3
```

A bounded region is now known.

Later `5` closes a larger region.

## 9. Why Does It Work?

A popped bar becomes the bottom of a basin precisely when a taller right boundary appears. The stack top after popping provides the nearest left boundary.

## 10. Java Code

```java
class Solution {
    public int trap(int[] height) {
        int water = 0;
        Deque<Integer> stack = new ArrayDeque<>();

        for (int right = 0; right < height.length; right++) {
            while (!stack.isEmpty() && height[right] > height[stack.peek()]) {
                int bottom = stack.pop();

                if (stack.isEmpty()) {
                    break;
                }

                int left = stack.peek();
                int width = right - left - 1;
                int boundedHeight =
                        Math.min(height[left], height[right]) - height[bottom];

                water += width * boundedHeight;
            }

            stack.push(right);
        }

        return water;
    }
}
```

## 11. Complexity

O(n) time, O(n) auxiliary space. Every index is pushed and popped at most once.

## 12. Edge Cases

- less than 3 bars
- monotonic increasing/decreasing
- flat heights

## 13. Common Mistakes

- wrong width: `right-left-1`
- using bottom height instead of min boundary
- forgetting the empty-stack case

## 14. Pattern to Remember

```text
**Problem clue:** water trapped between taller bars on both sides.
**Pattern:** valley boundaries — a bar's water needs a higher bar on each side.
**Data structure:** decreasing monotonic stack of indices.
**What the stack stores:** bars waiting for a taller right boundary.
**When to push:** every bar index.
**When to pop:** when current height exceeds the top — the popped bar is a valley floor.
**Invariant:** heights of stacked indices are non-increasing.
**Key insight:** on pop, the new top is the left wall, current is the right wall, so the trapped width is now final.
**Time:** O(n).
**Space:** O(n).
```

**Histogram-like valleys are closed when a right boundary arrives.**

## 15. Interview Trigger

> When bars form unresolved valleys and a future taller wall closes them, think monotonic stack. A pop can reveal the left wall, while the current index is the right wall.

---

# 20. Sum of Subarray Minimums

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/sum-of-subarray-minimums) · [LeetCode](https://leetcode.com/problems/sum-of-subarray-minimums/) · [TUF article](https://takeuforward.org/data-structure/sum-of-subarray-minimums) · [Video](https://youtu.be/v0e8p9JCgRc?si=XAU7ekECgS5nboRw)

## 1. Problem Understanding

Find:

```text
sum of min(subarray)
```

over all subarrays.

Brute force over all subarrays is O(n²) just to enumerate them, and computing minima naively can add more work.

## 2. How to Think

The key change is:

> Do not calculate every subarray. Calculate how many subarrays each element is the minimum of.

For an element `arr[i]`, suppose:

- previous strictly smaller boundary = `L`
- next smaller-or-equal boundary = `R`

Then number of subarrays where `arr[i]` is chosen as the minimum is:

```text
(i - L) * (R - i)
```

Contribution:

```text
arr[i] * (i-L) * (R-i)
```

## 3. Pattern Recognition

**Clue:** sum over all subarrays + min.

**Pattern:** contribution technique + monotonic stack.

## 4. Brute Force

Enumerate all subarrays and maintain the running minimum.

O(n²).

## 5. Observation

Each element can represent many subarrays. Count those subarrays directly.

## 6. Optimal Approach

Find left/right boundaries with monotonic stacks.

Important duplicate detail:

Use asymmetric comparisons, for example:

- left: previous **strictly smaller**
- right: next **smaller or equal**

This assigns equal minima consistently without double counting.

## 7. Invariant

> **Invariant:** The increasing stack is used to find the nearest boundary that prevents the current value from remaining the chosen minimum.

## 8. Dry Run

For `[3,1,2]`, element `1` is the minimum for all 3 subarrays:

```text
[1]
[3,1]
[3,1,2]
```

Its left choice count = 2, right choice count = 2.

Contribution = `1 * 2 * 2 = 4`, but note carefully: boundary choice conventions determine exact count; with strict/non-strict asymmetry the formula counts each subarray exactly once.

## 9. Why Does It Work?

Every subarray has a minimum. We assign each subarray to exactly one minimum index. Boundary distances count how far we can extend left and right while preserving that element as the selected minimum.

## 10. Java Code

```java
class Solution {
    public int sumSubarrayMins(int[] arr) {
        long mod = 1_000_000_007L;
        int n = arr.length;

        long[] left = new long[n];
        long[] right = new long[n];

        Deque<Integer> stack = new ArrayDeque<>();

        // Previous strictly smaller.
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && arr[stack.peek()] > arr[i]) {
                stack.pop();
            }

            left[i] = stack.isEmpty() ? i + 1 : i - stack.peek();
            stack.push(i);
        }

        stack.clear();

        // Next smaller or equal.
        for (int i = n - 1; i >= 0; i--) {
            while (!stack.isEmpty() && arr[stack.peek()] >= arr[i]) {
                stack.pop();
            }

            right[i] = stack.isEmpty() ? n - i : stack.peek() - i;
            stack.push(i);
        }

        long answer = 0;

        for (int i = 0; i < n; i++) {
            answer = (answer + arr[i] * left[i] % mod * right[i]) % mod;
        }

        return (int) answer;
    }
}
```

## 11. Complexity

O(n) time, O(n) space.

## 12. Edge Cases

Duplicates are the most important.

## 13. Common Mistakes

- using strict comparison on both sides
- using non-strict on both sides
- forgetting modulo
- confusing span distance with count

## 14. Pattern to Remember

```text
**Problem clue:** sum of the minimum over ALL subarrays.
**Pattern:** contribution — count how many subarrays each element rules as minimum.
**Data structure:** two monotonic stacks to find previous-smaller and next-smaller boundaries.
**What the stacks store:** each element's boundary distances.
**When to pop:** `>=` for the previous side (strict) and `>` for the next side (equal) to count duplicates fairly.
**Invariant:** every index gets a (prevSmaller, nextSmaller) pair before summing.
**Key insight:** contribution = `a[i] × (number of start choices) × (number of end choices)` = `a[i] × (i - prevSmaller) × (nextSmaller - i)`.
**Time:** O(n).
**Space:** O(n).
```

```text
Sum of subarray minimums
→ contribution of each index
→ nearest smaller boundaries
→ increasing monotonic stack
→ (left choices) × (right choices)
```

## 15. Interview Trigger

> When I see "sum over all subarrays" with min/max, I should ask: "Can I count how many subarrays each element contributes to?" That often turns O(n²) into O(n).

---

# 21. Asteroid Collision

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/asteroid-collision) · [LeetCode](https://leetcode.com/problems/asteroid-collision/) · [TUF article](https://takeuforward.org/data-structure/asteroid-collision) · [Video](https://youtu.be/_eYGqw_VDR4?si=YyxibcHq800RqgIQ)

## 1. Problem Understanding

Positive = moving right. Negative = moving left.

A collision happens only when:

```text
positive ... negative
```

Example:

```text
[5,10,-5]
```

`10` and `-5` collide; `10` survives.

## 2. How to Think

We process left to right.

A new negative asteroid may collide with the most recent positive asteroid still alive.

That is LIFO.

## 3. Pattern Recognition

**Clue:** collisions among active objects, and the most recent active object interacts first.

**Pattern:** stack simulation.

## 4. Brute Force

Repeatedly scan backward through surviving asteroids after every collision. Can become O(n²).

## 5. Observation

A stack naturally stores the asteroids that are currently alive.

Only the top can collide with the incoming asteroid.

## 6. Optimal Approach

For each asteroid `x`:

While:

- stack not empty
- top > 0
- x < 0

resolve collision.

Cases:

- `top < -x` -> top explodes; continue
- `top == -x` -> both explode; stop
- `top > -x` -> incoming explodes; stop

If incoming survives, push it.

## 7. Invariant

> **Invariant:** The stack contains exactly the surviving asteroids from the processed prefix, in original order.

## 8. Dry Run

`[5,10,-5]`

| current | stack before | action | stack after |
|---|---|---|---|
| 5 | [] | push | [5] |
| 10 | [5] | no collision | [5,10] |
| -5 | [5,10] | 10 survives | [5,10] |

## 9. Why Does It Work?

Any positive asteroid below the top cannot interact with the new negative asteroid until the top one has been resolved. Therefore top-first simulation exactly matches physical collision order.

## 10. Java Code

```java
class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        Deque<Integer> stack = new ArrayDeque<>();

        for (int asteroid : asteroids) {
            boolean alive = true;

            while (alive
                    && asteroid < 0
                    && !stack.isEmpty()
                    && stack.peek() > 0) {

                if (stack.peek() < -asteroid) {
                    stack.pop();
                } else if (stack.peek() == -asteroid) {
                    stack.pop();
                    alive = false;
                } else {
                    alive = false;
                }
            }

            if (alive) {
                stack.push(asteroid);
            }
        }

        int[] answer = new int[stack.size()];
        for (int i = answer.length - 1; i >= 0; i--) {
            answer[i] = stack.pop();
        }

        return answer;
    }
}
```

## 11. Complexity

O(n) amortized. Every asteroid is pushed once and popped at most once.

## 12. Edge Cases

- same size
- no collision
- chain reaction
- all moving same direction

## 13. Common Mistakes

- colliding same-direction asteroids
- forgetting chain collisions
- pushing an asteroid after it has exploded

## 14. Pattern to Remember

```text
**Problem clue:** moving objects that destroy each other; survivors remain.
**Pattern:** simulation where the newest survivor interacts first.
**Data structure:** `Deque<Integer>` stack of survivors.
**What the stack stores:** asteroids that have not collided yet.
**When to push:** a right-mover, or a left-mover that destroys its rivals and survives.
**When to pop:** while top is positive and smaller than the incoming negative's magnitude.
**Invariant:** the stack never contains two asteroids that would still collide.
**Key insight:** only the most recent right-mover can be hit by an incoming left-mover — the definition of a stack.
**Time:** O(n) amortized.
**Space:** O(n).
```

**The stack represents survivors. A new item interacts with the latest survivor first.**

## 15. Interview Trigger

> When objects arrive one by one and the new object may destroy recent survivors, I think stack simulation. The top is the only possible immediate collision partner.

---

# 22. Sum of Subarray Ranges

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/sum-of-subarray-ranges) · [LeetCode](https://leetcode.com/problems/sum-of-subarray-ranges/) · [TUF article](https://takeuforward.org/data-structure/sum-of-subarray-ranges) · [Video](https://youtu.be/gIrMptNPf5M?si=Q_GHuBvzZVs27X_U)

## 1. Problem Understanding

For every subarray:

```text
range = max - min
```

Need the total.

Rewrite:

```text
sum of subarray maximums
-
sum of subarray minimums
```

That is the unlock.

## 2. How to Think

We already know the minimum contribution technique.

Now do it twice:

- one monotonic stack for minimums
- one monotonic stack for maximums

## 3. Pattern Recognition

**Clue:** max - min over every subarray.

**Pattern:** contribution decomposition.

## 4. Brute Force

Enumerate every subarray and track min/max.

O(n²).

## 5. Observation

Instead of evaluating each subarray, count how many subarrays each element contributes to as max and as min.

## 6. Optimal Approach

Calculate:

```text
sumMax - sumMin
```

Using boundary distances.

## 7. Invariant

> **Invariant:** The stack finds the nearest boundaries that prevent the current value from being the selected maximum/minimum.

## 8. Dry Run

For `[1,3,2]`:

```text
subarrays:
[1] -> 0
[3] -> 0
[2] -> 0
[1,3] -> 2
[3,2] -> 1
[1,3,2] -> 2
total = 5
```

Equivalent:

```text
sumMax = 3 + 3 + 3 + 2 + ...
sumMin = ...
difference = 5
```

## 9. Why Does It Work?

Every subarray contributes one maximum and one minimum. Contribution counting assigns each subarray to boundary-defined representative indices.

## 10. Java Code

```java
class Solution {
    public long subArrayRanges(int[] nums) {
        return sumOfMax(nums) - sumOfMin(nums);
    }

    private long sumOfMin(int[] a) {
        int n = a.length;
        long[] left = new long[n];
        long[] right = new long[n];
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && a[stack.peek()] > a[i]) {
                stack.pop();
            }
            left[i] = stack.isEmpty() ? i + 1L : i - stack.peek();
            stack.push(i);
        }

        stack.clear();

        for (int i = n - 1; i >= 0; i--) {
            while (!stack.isEmpty() && a[stack.peek()] >= a[i]) {
                stack.pop();
            }
            right[i] = stack.isEmpty() ? n - i : stack.peek() - i;
            stack.push(i);
        }

        long result = 0;
        for (int i = 0; i < n; i++) {
            result += (long) a[i] * left[i] * right[i];
        }
        return result;
    }

    private long sumOfMax(int[] a) {
        int n = a.length;
        long[] left = new long[n];
        long[] right = new long[n];
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && a[stack.peek()] < a[i]) {
                stack.pop();
            }
            left[i] = stack.isEmpty() ? i + 1L : i - stack.peek();
            stack.push(i);
        }

        stack.clear();

        for (int i = n - 1; i >= 0; i--) {
            while (!stack.isEmpty() && a[stack.peek()] <= a[i]) {
                stack.pop();
            }
            right[i] = stack.isEmpty() ? n - i : stack.peek() - i;
            stack.push(i);
        }

        long result = 0;
        for (int i = 0; i < n; i++) {
            result += (long) a[i] * left[i] * right[i];
        }
        return result;
    }
}
```

## 11. Complexity

O(n) time, O(n) space.

## 12. Edge Cases

Single element, duplicates, negative values.

## 13. Common Mistakes

Using the same duplicate convention blindly for max and min without checking ownership.

## 14. Pattern to Remember

```text
**Problem clue:** sum of (max − min) over ALL subarrays.
**Pattern:** contribution applied twice — once for maximum, once for minimum.
**Data structure:** monotonic stacks for previous/next greater AND previous/next smaller.
**What they store:** boundary distances for each element.
**When to pop:** `>=`/`>` choices follow the duplicate rules from Sum of Subarray Minimums.
**Invariant:** `sum(max) − sum(min)` over all subarrays equals the required answer.
**Key insight:** this is two "Sum of Subarray Minimums" computations glued together.
**Time:** O(n).
**Space:** O(n).
```

**Range = maximum contribution - minimum contribution.**

## 15. Interview Trigger

> Whenever a subarray quantity is `max - min`, split it into two independent contribution problems.

---

# 23. Remove K Digits

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/remove-k-digits) · [LeetCode](https://leetcode.com/problems/remove-k-digits/) · [TUF article](https://takeuforward.org/data-structure/remove-k-digits) · [Video](https://youtu.be/jmbuRzYPGrg?si=WN387gwQ7aXWkUao)

## 1. Problem Understanding

Given a number as a string, remove exactly `k` digits to get the smallest possible number.

Example:

```text
1432219, k=3
-> 1219
```

## 2. How to Think

To make a number smaller, an earlier digit matters more than a later digit.

So if:

```text
... 5 3 ...
```

and we can remove one digit, removing `5` is better than removing `3`.

Thus:

> Remove a digit when a smaller digit arrives after it.

That is the same "current element resolves/removes previous element" shape as monotonic stacks.

## 3. Pattern Recognition

**Clue:** remove k elements while preserving order and minimize lexicographic/numeric result.

**Pattern:** greedy monotonic stack.

## 4. Brute Force

Try all choices of k deletions. Combinatorial explosion.

## 5. Observation

Every time:

```text
previous digit > current digit
```

the previous digit is hurting the number and is a greedy deletion candidate.

## 6. Optimal Approach

For each digit:

```text
while k > 0 and top > current:
    pop
    k--
push current
```

If `k` remains, remove from the end because no earlier decrease was available.

## 7. Invariant

> **Invariant:** The stack stores the smallest possible prefix obtainable from processed digits using the deletions already spent.

## 8. Dry Run

`1432219`, `k=3`

```text
1
14
current 3 -> remove 4 => 13
2 -> remove 3 => 12
2
1 -> remove 2 => 121
9
```

Result `1219`.

## 9. Why Does It Work?

An earlier larger digit dominates the numeric value more than any later digit. Removing it as soon as a smaller successor appears is always at least as good as saving that deletion for later.

## 10. Java Code

```java
class Solution {
    public String removeKdigits(String num, int k) {
        Deque<Character> stack = new ArrayDeque<>();

        for (char digit : num.toCharArray()) {
            while (k > 0 && !stack.isEmpty() && stack.peek() > digit) {
                stack.pop();
                k--;
            }
            stack.push(digit);
        }

        while (k > 0 && !stack.isEmpty()) {
            stack.pop();
            k--;
        }

        StringBuilder result = new StringBuilder();
        while (!stack.isEmpty()) {
            result.append(stack.removeLast());
        }

        while (result.length() > 1 && result.charAt(0) == '0') {
            result.deleteCharAt(0);
        }

        return result.length() == 0 ? "0" : result.toString();
    }
}
```

## 11. Complexity

O(n) amortized, because each digit is pushed once and popped at most once.

Space O(n).

## 12. Edge Cases

- `k == n`
- leading zeros
- already increasing number
- all same digit

## 13. Common Mistakes

- removing from the wrong side
- forgetting leftover `k`
- mishandling leading zeros

## 14. Pattern to Remember

```text
**Problem clue:** make the number smallest possible by deleting k digits (order preserved).
**Pattern:** greedy — remove a larger previous digit when a smaller one follows it.
**Data structure:** increasing monotonic stack of chosen digits (a `Deque<StringBuilder>`-style structure).
**What the stack stores:** the digits kept so far, non-decreasing.
**When to push:** every digit, after popping.
**When to pop:** while `k > 0` and top digit `> current` — the top loses to the smaller current.
**Invariant:** the stack is the smallest possible prefix using the digits seen so far and the deletions left.
**Key insight:** a smaller digit makes every larger digit immediately before it useless.
**Time:** O(n) amortized.
**Space:** O(n).
```

**Smaller current value can make previous larger values obsolete.**

## 15. Interview Trigger

> When I am deleting a limited number of items to make the sequence smallest, I look for "remove previous item when current is better." That often leads to a greedy monotonic stack.

---

# 24. Largest Rectangle in a Histogram

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/largest-rectangle-in-a-histogram) · [LeetCode](https://leetcode.com/problems/largest-rectangle-in-histogram/) · [TUF article](https://takeuforward.org/data-structure/area-of-largest-rectangle-in-histogram/) · [Video](https://youtu.be/Bzat9vgD0fs?si=DiBlLejXcr6EJoyB)

## 1. Problem Understanding

Given bar heights, find the largest rectangle.

For each bar as the minimum height of a rectangle, we need its nearest smaller boundary on both sides.

## 2. How to Think

For bar `i`:

```text
width = rightSmaller[i] - leftSmaller[i] - 1
area = height[i] * width
```

So this is a nearest-smaller problem in disguise.

## 3. Pattern Recognition

**Clue:** histogram + largest rectangle.

**Pattern:** increasing monotonic stack.

## 4. Brute Force

For every pair of boundaries, compute minimum height: O(n²) or worse.

## 5. Observation

A bar's maximal rectangle ends exactly where a smaller bar appears on each side.

## 6. Optimal Approach

Scan left to right.

When current height is smaller than stack-top height, the current index is the right boundary for popped bars.

Use a sentinel zero at the end to flush the stack.

## 7. Invariant

> **Invariant:** Stack indices have increasing heights; each stacked bar is waiting for its first smaller bar to the right.

## 8. Dry Run

`[2,1,5,6,2,3]`

When `2` arrives after `6`:

- pop `6`: width 1
- pop `5`: width 2

This discovers the maximal rectangles.

## 9. Why Does It Work?

When a bar is popped, we now know its nearest smaller bar on the right (current index) and, after popping, its nearest smaller bar on the left (new stack top). Therefore its maximum possible width is final.

## 10. Java Code

```java
class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;

        for (int i = 0; i <= heights.length; i++) {
            int current = (i == heights.length) ? 0 : heights[i];

            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int height = heights[stack.pop()];
                int left = stack.isEmpty() ? -1 : stack.peek();
                int width = i - left - 1;

                best = Math.max(best, height * width);
            }

            stack.push(i);
        }

        return best;
    }
}
```

**Note:** The sentinel index is only used as a flush trigger; for code safety in a production version, use a structure/loop variant that avoids indexing `heights[n]` when pushed. A robust interview implementation is:

```java
class Solution {
    public int largestRectangleArea(int[] heights) {
        int n = heights.length;
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;

        for (int i = 0; i <= n; i++) {
            int current = (i == n) ? 0 : heights[i];

            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int mid = stack.pop();
                int left = stack.isEmpty() ? -1 : stack.peek();

                int width = i - left - 1;
                best = Math.max(best, heights[mid] * width);
            }

            if (i < n) {
                stack.push(i);
            }
        }

        return best;
    }
}
```

## 11. Complexity

O(n) time, O(n) space.

## 12. Edge Cases

- one bar
- increasing heights
- decreasing heights
- equal heights
- zero-height bars

## 13. Common Mistakes

- wrong width
- forgetting to flush the stack
- bad handling of equal heights

## 14. Pattern to Remember

```text
**Problem clue:** largest rectangle; a bar's rectangle ends at a smaller bar on either side.
**Pattern:** nearest smaller boundaries.
**Data structure:** increasing monotonic stack of indices.
**What the stack stores:** bar indices still waiting for their right boundary.
**When to push:** every bar index (plus a sentinel height 0 at the end).
**When to pop:** when current height `<` top — the popped bar's width is now fully known.
**Invariant:** stacked bar heights are non-decreasing.
**Key insight:** on pop, left boundary = new top (or -1), right boundary = `i`; width = `i - newTop - 1`.
**Time:** O(n).
**Space:** O(n).
```

```text
Histogram
→ nearest smaller left/right
→ increasing stack
→ pop when smaller arrives
→ popped bar's width becomes final
```

## 15. Interview Trigger

> Histogram problems often hide a nearest-smaller question. Ask: "For this bar, where is the first shorter bar on each side?"

---

# 25. Maximum Rectangles

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/maximum-rectangles) · [LeetCode](https://leetcode.com/problems/maximal-rectangle/) · [TUF article](https://takeuforward.org/data-structure/maximum-rectangle-area-with-all-1s-dp-on-rectangles-dp-55/) · [Video](https://youtu.be/tOylVCugy9k)

Assumption: **Maximum Rectangles in a binary matrix** (the standard "Maximal Rectangle" problem).

## 1. Problem Understanding

Given a binary matrix, find the largest rectangle containing only `1`s.

## 2. How to Think

This looks 2D, but each row can be turned into a histogram.

For each row:

```text
heights[j] =
    0 if matrix[row][j] == '0'
    heights[j] + 1 otherwise
```

Then solve:

> Largest Rectangle in Histogram

So this is not a new pattern.

It is:

```text
2D matrix
   ↓
histogram per row
   ↓
Largest Rectangle in Histogram
```

## 3. Pattern Recognition

**Clue:** rectangle of 1s in a matrix.

**Pattern:** histogram reduction + monotonic stack.

## 4. Brute Force

Try every rectangle and verify all cells are 1. Too slow.

## 5. Observation

For a fixed bottom row, consecutive `1`s form heights.

Example:

```text
row heights: [3,2,3,3]
```

Now the question is exactly histogram area.

## 6. Optimal Approach

For each row:

1. update heights
2. compute largest histogram rectangle
3. keep maximum

## 7. Invariant

> **Invariant:** Before processing a row, `heights[j]` is the number of consecutive `1`s ending at the current row in column `j`.

## 8. Dry Run

Matrix:

```text
1 0 1 0 0
1 0 1 1 1
1 1 1 1 1
1 0 0 1 0
```

Heights evolve:

```text
[1,0,1,0,0]
[2,0,2,1,1]
[3,1,3,2,2]
[4,0,0,3,0]
```

Run histogram solver after each row.

## 9. Why Does It Work?

Every all-1 rectangle has some bottom row. At that row, its columns become histogram bars whose heights are at least the rectangle's height.

So histogram analysis finds every candidate rectangle.

## 10. Java Code

```java
class Solution {
    public int maximalRectangle(char[][] matrix) {
        if (matrix.length == 0) return 0;

        int cols = matrix[0].length;
        int[] heights = new int[cols];
        int best = 0;

        for (char[] row : matrix) {
            for (int c = 0; c < cols; c++) {
                heights[c] = row[c] == '1' ? heights[c] + 1 : 0;
            }

            best = Math.max(best, largestRectangleArea(heights));
        }

        return best;
    }

    private int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        int best = 0;

        for (int i = 0; i <= heights.length; i++) {
            int current = (i == heights.length) ? 0 : heights[i];

            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int h = heights[stack.pop()];
                int left = stack.isEmpty() ? -1 : stack.peek();
                int width = i - left - 1;
                best = Math.max(best, h * width);
            }

            if (i < heights.length) {
                stack.push(i);
            }
        }

        return best;
    }
}
```

## 11. Complexity

For `R x C`: O(R*C) time, O(C) auxiliary space.

## 12. Edge Cases

All zeros, all ones, one row, one column.

## 13. Common Mistakes

- resetting heights incorrectly
- solving each row with O(C²)
- forgetting this is exactly the histogram problem

## 14. Pattern to Remember

```text
**Problem clue:** largest rectangle of 1s inside a binary grid.
**Pattern:** reduce 2D to repeated 1D histograms.
**Data structure:** height array per row + the histogram monotonic stack.
**What the stack stores:** column indices of increasing bar heights for the current row.
**When to pop:** same rule as the histogram, whenever a shorter column appears.
**Invariant:** `heights[c]` = number of consecutive 1s ending at the current row in column `c`.
**Key insight:** running Maximal-Rectangle per row covers every possible base line of the 1s.
**Time:** O(row × col).
**Space:** O(col).
```

**Maximum rectangle in matrix = histogram per row + largest rectangle in histogram.**

## 15. Interview Trigger

> When I see a binary matrix and ask for the largest all-1 rectangle, I should try turning rows into histogram heights. Then I reuse the histogram pattern.

---

# 26. Sliding Window Maximum

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/sliding-window-maximum) · [LeetCode](https://leetcode.com/problems/sliding-window-maximum/) · [TUF article](https://takeuforward.org/data-structure/sliding-window-maximum/) · [Video](https://youtu.be/NwBvene4Imo?si=eU1PY-bcQfk5wdog)

## 1. Problem Understanding

For every window of size `k`, return the maximum.

Example:

```text
[1,3,-1,-3,5,3,6,7], k=3
-> [3,3,5,5,6,7]
```

## 2. How to Think

A simple queue gives order, but the maximum could be anywhere inside.

A max-heap works in O(log n) per element.

Can we keep only candidates that can still become maximum?

Yes.

If a new value is larger than an older value behind it, that older value can never be the window maximum while the new value is present.

This is **candidate elimination**.

A deque allows removal from both ends.

## 3. Pattern Recognition

**Clue:** sliding window + max/min + many windows.

**Pattern:** monotonic deque.

## 4. Brute Force

Compute max of each window by scanning k elements.

O(nk).

## 5. Observation

Maintain deque indices such that:

- indices are increasing
- values are decreasing

Front is always the maximum candidate.

## 6. Optimal Approach

For each index `i`:

1. remove front if outside window
2. remove back while its value <= current
3. add current
4. front = window maximum

## 7. Invariant

> **Invariant:** The deque contains indices inside the current window, in increasing index order, and their values are decreasing.

## 8. Dry Run

For `[1,3,-1]`:

```text
1 -> [1]
3 -> remove 1, [3]
-1 -> [3,-1]
max = front = 3
```

When `5` arrives later, it eliminates all smaller candidates behind it.

## 9. Why Does It Work?

Any smaller element behind a newer larger element is dominated: the newer element expires later and is larger. Therefore the older smaller candidate can be removed forever.

## 10. Java Code

```java
class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] answer = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!deque.isEmpty() && deque.peekFirst() <= i - k) {
                deque.pollFirst();
            }

            while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
                deque.pollLast();
            }

            deque.offerLast(i);

            if (i >= k - 1) {
                answer[i - k + 1] = nums[deque.peekFirst()];
            }
        }

        return answer;
    }
}
```

## 11. Complexity

O(n) time: each index enters and leaves deque at most once.

Space O(k).

## 12. Edge Cases

`k=1`, `k=n`, duplicates, decreasing array, increasing array.

## 13. Common Mistakes

- removing expired elements from the back instead of front
- storing values instead of indices when expiration matters
- using `<` vs `<=` inconsistently with duplicates

## 14. Pattern to Remember

```text
**Problem clue:** maximum of every contiguous window of size k.
**Pattern:** dominance + expiry → decreasing monotonic deque.
**Data structure:** `ArrayDeque` of indices, decreasing by value.
**What it stores:** the only candidates that can still become a window maximum.
**When to push:** every index, after trimming the back.
**When to pop:** back while its value `<=` current (current dominates it); front when it expires (`< i - k + 1`).
**Invariant:** the front holds the current window maximum; values decrease back-to-front by value and increase by index.
**Key insight:** a newer and larger element makes older smaller ones permanently useless.
**Time:** O(n).
**Space:** O(k).
```

```text
Sliding window max
→ keep only useful candidates
→ decreasing deque
→ front is max
```

## 15. Interview Trigger

> If I need a max/min for every sliding window, ask: "Which candidates can never win again?" Remove dominated candidates and keep the rest in a monotonic deque.

---

# 27. Stock Span Problem

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/stock-span-problem) · [LeetCode](https://leetcode.com/problems/online-stock-span/) · [TUF article](https://takeuforward.org/data-structure/stock-span-problem) · [Video](https://youtu.be/eay-zoSRkVc?si=deNNe5i38BOAntha)

## 1. Problem Understanding

For today's price, span = number of consecutive days ending today whose price is <= today's price.

Example:

```text
[100,80,60,70,60,75,85]

span:
[1,1,1,2,1,4,6]
```

## 2. How to Think

For today's price, I need the nearest previous day with a **greater** price.

That is a previous-greater problem.

Once we find that boundary:

```text
span = i - previousGreaterIndex
```

## 3. Pattern Recognition

**Clue:** consecutive previous days <= current.

**Pattern:** previous greater + decreasing monotonic stack.

## 4. Brute Force

Walk backwards until a greater price.

O(n²).

## 5. Observation

Previous queries repeatedly walk across the same old prices. Maintain them in a stack.

## 6. Optimal Approach

Stack stores indices of prices that are still useful as "previous greater" candidates.

While:

```text
price[stack.top] <= current
```

pop because current invalidates those candidates.

## 7. Invariant

> **Invariant:** Stack indices have decreasing prices, and the top is the nearest previous strictly greater price candidate.

## 8. Dry Run

At price `75`:

```text
60 pop
70 pop
60 pop
80 stays
```

Nearest greater = 80.

Span = `5 - 1 = 4`.

## 9. Why Does It Work?

Any previous price <= current cannot become the first greater boundary for the current day, so it can be removed from the candidate stack.

## 10. Java Code

```java
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

## 11. Complexity

Amortized O(1) per call; O(n) total for n calls.

## 12. Edge Cases

Strictly increasing, strictly decreasing, equal prices.

## 13. Common Mistakes

- using `<` instead of `<=`
- storing only price but not span/index information
- thinking this is a next-greater problem

## 14. Pattern to Remember

```text
**Problem clue:** consecutive days with price ≤ today, counted backwards.
**Pattern:** previous greater boundary — the day that stops the span.
**Data structure:** decreasing monotonic stack (of days with accumulated spans).
**What the stack stores:** days whose greater price has not appeared, plus their span.
**When to push:** every new day.
**When to pop:** while top price `<=` current — fold its span into the current day.
**Invariant:** stacked spans are non-increasing in price and never overlap.
**Key insight:** span is computed by folding consecutive smaller spans, exactly like the nearest previous greater.
**Time:** O(n) total.
**Space:** O(n).
```

**Stock span = previous greater boundary.**

## 15. Interview Trigger

> Stock span asks "how far back can I go before a greater price blocks me?" That is previous greater, so use a decreasing monotonic stack.

---

# 28. Celebrity Problem

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/celebrity-problem) · [LeetCode](https://leetcode.com/accounts/login/?next=/problems/find-the-celebrity/) · [TUF article](https://takeuforward.org/data-structure/celebrity-problem) · [Video](https://youtu.be/cEadsbTeze4?si=olXYfOs7l-SEn2zl)

## 1. Problem Understanding

There are `n` people.

A celebrity:

- is known by everyone
- knows nobody

Need find one in O(n) queries.

## 2. How to Think

Start with everyone as candidates.

Compare two candidates `a` and `b`.

If `a` knows `b`, then `a` cannot be celebrity.

Otherwise, `b` cannot be celebrity.

So one comparison eliminates one candidate.

This is **candidate elimination**, often implemented with a stack.

## 3. Pattern Recognition

**Clue:** find one special person satisfying two global conditions.

**Pattern:** pairwise elimination + final verification.

## 4. Brute Force

Check each person against everyone: O(n²).

## 5. Observation

You don't need to verify everyone immediately. First reduce the candidate set to one.

## 6. Optimal Approach

Using a stack:

1. push all indices
2. compare top two
3. eliminate the impossible celebrity
4. one candidate remains
5. verify candidate against everyone

## 7. Invariant

> **Invariant:** The stack contains only people who have not yet been proven impossible to be the celebrity.

## 8. Dry Run

If `a` knows `b`:

```text
a -> eliminated
b -> survives
```

If `a` does not know `b`:

```text
b -> eliminated
a -> survives
```

## 9. Why Does It Work?

Every comparison proves one of the two people cannot satisfy the celebrity definition. Therefore one candidate can always be discarded without losing a valid celebrity.

## 10. Java Code

```java
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

## 11. Complexity

Candidate elimination uses O(n) comparisons; verification uses O(n). Total O(n) relationship checks.

Auxiliary space: O(n) with stack. The classic two-pointer version can reduce extra space to O(1).

## 12. Edge Cases

One person, no celebrity, multiple apparent candidates but failed verification.

## 13. Common Mistakes

- forgetting final verification
- assuming the last candidate is automatically valid
- reversing the elimination rule

## 14. Pattern to Remember

```text
**Problem clue:** find the person everyone knows, who knows nobody.
**Pattern:** candidate elimination — each `knows(a,b)` answer eliminates exactly one person.
**Data structure:** stack of candidates (or two pointers).
**What the stack stores:** people who may still be the celebrity.
**When to push:** the survivor of each pairwise comparison.
**When to pop:** the person proven impossible.
**Invariant:** the celebrity (if one exists) always survives every elimination.
**Key insight:** `knows(a,b)` being true kills `a`; being false kills `b` — one dead person per question → only O(n) questions.
**Time:** O(n) to isolate, O(n) to verify (using the knows matrix).
**Space:** O(n) stack, or O(1) with two pointers.
```

**Find one special candidate -> eliminate impossible candidates -> verify the survivor.**

## 15. Interview Trigger

> When a problem asks for one person/item satisfying strong global conditions, ask whether a pairwise comparison can prove one candidate impossible. If yes, candidate elimination may reduce O(n²) to O(n).

---

# 29. LRU Cache

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/lru-cache) · [LeetCode](https://leetcode.com/problems/lru-cache/) · [TUF article](https://takeuforward.org/data-structure/program-for-least-recently-used-lru-page-replacement-algorithm)

## 1. Problem Understanding

LRU = **Least Recently Used**.

Need:

- `get(key)` in O(1)
- `put(key,value)` in O(1)
- when full, remove the least recently used item

The challenge is two requirements at once:

1. find a key quickly
2. maintain usage order quickly

## 2. How to Think

A hash map solves lookup.

But a hash map does not maintain recency order.

A doubly linked list solves order updates:

```text
head <-> most recent ... least recent <-> tail
```

So combine them.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** O(1) lookup + O(1) recency update/eviction  
**Observation:** need two independent capabilities  
**Pattern:** map + doubly linked list  
**Data structure:** HashMap + Doubly Linked List  
**Algorithm:** map finds node; list moves/removes node

## 3. Pattern Recognition

This is a **multi-requirement data structure design** problem.

Whenever one structure gives one required operation and another gives the missing one, combine them.

## 4. Brute Force

HashMap + list scan to update/remove recency.

The scan makes operations O(n).

## 5. Observation

Store the actual list node in the map.

Then a key gives direct access to its node.

## 6. Optimal Approach

Rules:

- head.next = most recently used
- tail.prev = least recently used
- get -> remove node, add to front
- put existing -> update + move to front
- put new -> add front
- if over capacity -> remove tail.prev and map entry

## 7. Invariant

> **Invariant:** The linked list is ordered from most recently used to least recently used, and every map entry points directly to the corresponding node.

## 8. Dry Run

Capacity 2:

```text
put(1,A) -> [1]
put(2,B) -> [2,1]
get(1)   -> [1,2]
put(3,C) -> evict 2 -> [3,1]
```

## 9. Why Does It Work?

The map gives O(1) node lookup. The doubly linked list gives O(1) detach and reinsert because every node has both neighbors.

## 10. Java Code

```java
class LRUCache {
    private static class Node {
        int key;
        int value;
        Node prev;
        Node next;

        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0);
    private final Node tail = new Node(0, 0);

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;

        remove(node);
        addToFront(node);
        return node.value;
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) {
            Node node = map.get(key);
            node.value = value;
            remove(node);
            addToFront(node);
            return;
        }

        Node node = new Node(key, value);
        map.put(key, node);
        addToFront(node);

        if (map.size() > capacity) {
            Node leastRecent = tail.prev;
            remove(leastRecent);
            map.remove(leastRecent.key);
        }
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addToFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
}
```

## 11. Complexity

Average O(1) for get and put.

Space O(capacity).

## 12. Edge Cases

Capacity 1, update existing key, get missing key.

## 13. Common Mistakes

- removing from list but not map
- updating key but not recency
- forgetting to move accessed items to front

## 14. Pattern to Remember

```text
**Problem clue:** O(1) get/put with eviction of the LEAST RECENTLY USED item.
**Pattern:** recency order + hash lookup.
**Data structure:** `HashMap<Key, Node>` + a doubly linked list (LRU at the tail).
**What it stores:** every cached key with its recency position.
**When to move:** on any get/put the touched node jumps to the head (most recent).
**When to remove:** the tail node when capacity is exceeded.
**Invariant:** the list is ordered by recency — head = MRU, tail = LRU — and the map points at each node.
**Key insight:** the DLL gives O(1) move-to-front and O(1) tail eviction; the map gives O(1) access.
**Time:** O(1) per operation.
**Space:** O(capacity).
```

**Need lookup + ordering? Combine HashMap + Doubly Linked List.**

## 15. Interview Trigger

> LRU immediately makes me think: "I need O(1) lookup and O(1) order updates." That is exactly HashMap + Doubly Linked List.

---

# 30. LFU Cache

> [**TUF solve**](https://takeuforward.org/plus/dsa/problems/lfu-cache) · [LeetCode](https://leetcode.com/problems/lfu-cache/) · [TUF article](https://takeuforward.org/data-structure/lfu-cache) · [Video](https://www.youtube.com/watch?v=0PSB9y8ehbk&list=PLgUwDviBIf0p4ozDR_kJJkONnb1wdx2Ma&index=79)

## 1. Problem Understanding

LFU = **Least Frequently Used**.

Need O(1) average `get`/`put`.

When full:

1. evict the smallest frequency
2. if several have the same frequency, evict the least recently used among them

This adds one dimension beyond LRU: **frequency**.

## 2. How to Think

LRU alone tracks recency.

LFU needs:

```text
key -> value
key -> frequency
frequency -> keys ordered by recency
```

So we need multiple relationships.

A clean design:

- `keyToNode`
- `freqToList`
- `minFrequency`

Each frequency owns a doubly linked list.

## 3. Pattern Recognition

**Clue:** eviction by frequency, with recency as tie-breaker.

**Pattern:** layered hash maps + linked lists.

## 4. Brute Force

Scan every key to find the minimum frequency.

O(n).

## 5. Observation

Maintain `minFrequency` directly.

Within each frequency, maintain recency order.

## 6. Optimal Approach

For `get(key)`:

- find node
- remove from current frequency list
- increment frequency
- add to next frequency list
- update `minFrequency` when necessary

For new `put`:

- if full, remove least recent node from `minFrequency` list
- insert new key with frequency 1
- set `minFrequency = 1`

## 7. Invariant

> **Invariant:** Every node is stored in exactly one frequency list matching its current frequency, and `minFrequency` equals the minimum frequency among all stored keys.

## 8. Dry Run

Capacity 2:

```text
put(1) -> freq1: [1]
put(2) -> freq1: [2,1]

get(1)
freq1: [2]
freq2: [1]

put(3)
min freq = 1
evict 2
freq1: [3]
freq2: [1]
```

## 9. Why Does It Work?

The map gives direct key access. Frequency lists group all keys by frequency. Doubly linked lists allow O(1) recency updates and O(1) eviction of the least recent key inside the minimum-frequency group.

## 10. Java Code

```java
class LFUCache {
    private static class Node {
        int key;
        int value;
        int frequency = 1;
        Node prev;
        Node next;

        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    private static class DoublyList {
        private final Node head = new Node(0, 0);
        private final Node tail = new Node(0, 0);
        private int size = 0;

        DoublyList() {
            head.next = tail;
            tail.prev = head;
        }

        void addFirst(Node node) {
            node.next = head.next;
            node.prev = head;
            head.next.prev = node;
            head.next = node;
            size++;
        }

        void remove(Node node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            node.prev = null;
            node.next = null;
            size--;
        }

        Node removeLast() {
            if (size == 0) return null;
            Node node = tail.prev;
            remove(node);
            return node;
        }

        boolean isEmpty() {
            return size == 0;
        }
    }

    private final int capacity;
    private int size = 0;
    private int minFrequency = 0;

    private final Map<Integer, Node> keyToNode = new HashMap<>();
    private final Map<Integer, DoublyList> freqToList = new HashMap<>();

    public LFUCache(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        Node node = keyToNode.get(key);
        if (node == null) return -1;

        increaseFrequency(node);
        return node.value;
    }

    public void put(int key, int value) {
        if (capacity == 0) return;

        if (keyToNode.containsKey(key)) {
            Node node = keyToNode.get(key);
            node.value = value;
            increaseFrequency(node);
            return;
        }

        if (size == capacity) {
            DoublyList minList = freqToList.get(minFrequency);
            Node evicted = minList.removeLast();

            keyToNode.remove(evicted.key);
            size--;
        }

        Node node = new Node(key, value);
        keyToNode.put(key, node);

        freqToList.computeIfAbsent(1, f -> new DoublyList()).addFirst(node);
        minFrequency = 1;
        size++;
    }

    private void increaseFrequency(Node node) {
        int oldFrequency = node.frequency;
        DoublyList oldList = freqToList.get(oldFrequency);
        oldList.remove(node);

        if (oldFrequency == minFrequency && oldList.isEmpty()) {
            minFrequency++;
        }

        node.frequency++;

        freqToList
                .computeIfAbsent(node.frequency, f -> new DoublyList())
                .addFirst(node);
    }
}
```

## 11. Complexity

Average O(1) for `get` and `put`.

Space O(capacity).

## 12. Edge Cases

Capacity 0, capacity 1, ties on frequency, updating an existing key.

## 13. Common Mistakes

- forgetting tie-breaker by recency
- updating frequency without moving the node
- failing to update `minFrequency`
- leaving stale nodes in frequency lists

## 14. Pattern to Remember

```text
**Problem clue:** evict the LEAST FREQUENTLY USED item; ties broken by least-recent.
**Pattern:** frequency buckets, each bucket an LRU list.
**Data structure:** `HashMap<Key, Node>` + `HashMap<Freq, LinkedList>` + `minFreq`.
**What it stores:** every key with its value and access count; one LRU list per frequency bucket.
**When to move:** on access, pull the node from its old bucket and add it to the head of the next bucket.
**When to remove:** the tail of the `minFreq` bucket when capacity is exceeded; rebuild `minFreq` if that bucket empties.
**Invariant:** `minFreq` is the smallest non-empty bucket; its tail is the least recent item at that frequency.
**Key insight:** LFU = buckets of LRU lists — each operation touches only a constant number of buckets.
**Time:** O(1) amortized per operation.
**Space:** O(capacity).
```

```text
LFU
→ key lookup
→ frequency tracking
→ recency inside each frequency
→ minFrequency pointer
```

## 15. Interview Trigger

> LFU is essentially "LRU inside each frequency bucket." Add frequency tracking and a pointer to the smallest frequency.

---

# PART 4 — COMPARISON TABLES

## Main comparison

| Problem | Main pattern | Data structure | Stack type | Stores | Push/offer condition | Pop/remove condition | Time | Space |
|---|---|---|---|---|---|---|---:|---:|
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

---

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

---

# PART 5 — PATTERN GROUPING

# Pattern 1 — Basic Stack Implementation

**Problems:** 1, 5

### How to recognize
You simply need LIFO behavior.

### Core idea
Only one end is active.

### Template
```java
Deque<Integer> stack = new ArrayDeque<>();
```

### Common variations
Array-backed, linked-list-backed, generic types.

---

# Pattern 2 — Basic Queue Implementation

**Problems:** 2, 6

### How to recognize
Need FIFO.

### Core idea
Insert at rear, remove at front.

### Template
```java
Deque<Integer> queue = new ArrayDeque<>();
```

### Common variations
Circular array, linked list, blocking queue in systems.

---

# Pattern 3 — Stack / Queue Conversion

**Problems:** 3, 4

### How to recognize
One data structure must imitate another.

### Core idea
Change order through rotation or reversal.

### Template
Stack using queue:
```text
add new -> rotate old
```

Queue using stacks:
```text
in stack -> out stack
```

### Key lesson
Do not memorize "two stacks." Understand the desired order.

---

# Pattern 4 — Parentheses / Matching

**Problems:** 7

### How to recognize
Nested opening/closing items.

### Core idea
Latest unresolved opener must close first.

### Template
```java
push(open)
pop(match)
```

### Common variations
Brackets, XML tags, expression parser state.

---

# Pattern 5 — Monotonic Stack

**Problems:** 15, 17, 18-adjacent boundary problems, 20, 22, 24, 27

### How to recognize
Previous/next/nearest greater/smaller, histogram, contribution.

### Core idea
Store unresolved candidates and remove dominated/useless elements.

### Template
```java
while (!stack.isEmpty() && condition(current, stack.peek())) {
    int idx = stack.pop();
}
stack.push(i);
```

### Common variations
- greater vs smaller
- left vs right
- strict vs non-strict
- values vs indices

---

# Pattern 6 — Circular Monotonic Stack

**Problem:** 16

### How to recognize
Monotonic-stack question + circular array.

### Core idea
Simulate two traversals with `% n`.

### Template
```java
for (int i = 0; i < 2 * n; i++) {
    int idx = i % n;
}
```

---

# Pattern 7 — Contribution Technique

**Problems:** 20, 22

### How to recognize
A sum over all subarrays involving minimum, maximum, or another representative element.

### Core idea
Count how many subarrays each index contributes to.

### Template
```text
contribution =
value × leftChoices × rightChoices
```

### Common variations
- minimum
- maximum
- max - min
- sum of strengths / products in advanced variants

---

# Pattern 8 — Histogram

**Problems:** 24, 25

### How to recognize
Rectangle area among bars, or binary matrix rectangle.

### Core idea
Nearest smaller boundaries.

### Template
```text
pop when current is smaller
width = right - left - 1
```

### Key connection
Maximum Rectangle is just repeated Histogram.

---

# Pattern 9 — Monotonic Deque

**Problem:** 26

### How to recognize
Sliding window + max/min.

### Core idea
Remove:
- expired candidates from front
- dominated candidates from back

### Template
```java
while (!deque.isEmpty() && expired(deque.peekFirst())) {
    deque.pollFirst();
}

while (!deque.isEmpty() && dominated(deque.peekLast(), i)) {
    deque.pollLast();
}

deque.offerLast(i);
```

---

# Pattern 10 — Cache Design

**Problems:** 29, 30

### How to recognize
Need O(1) lookup plus dynamic ordering/eviction.

### Core idea
Combine structures because one structure cannot provide every requirement.

### LRU
```text
HashMap + Doubly Linked List
```

### LFU
```text
key -> node
frequency -> doubly linked list
minFrequency
```

---

# PART 6 — TEMPLATE LIBRARY

## 1. Basic Stack

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(x);
int x = stack.pop();
int top = stack.peek();
```

**Use when:** LIFO.

---

## 2. Basic Queue

```java
Deque<Integer> queue = new ArrayDeque<>();
queue.offer(x);
int x = queue.poll();
int front = queue.peek();
```

**Use when:** FIFO.

---

## 3. Stack using Queue

```java
queue.offer(x);
int size = queue.size();

for (int i = 0; i < size - 1; i++) {
    queue.offer(queue.poll());
}
```

Use when you want the newest item at the front.

---

## 4. Queue using Stack

```java
in.push(x);

if (out.isEmpty()) {
    while (!in.isEmpty()) {
        out.push(in.pop());
    }
}
```

Use when you need FIFO from LIFO primitives.

---

## 5. Parentheses Matching

```java
for (char ch : s.toCharArray()) {
    if (isOpen(ch)) {
        stack.push(ch);
    } else {
        if (stack.isEmpty() || !matches(stack.pop(), ch)) {
            return false;
        }
    }
}

return stack.isEmpty();
```

---

## 6. Next Greater Element

```java
while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
    answer[stack.pop()] = nums[i];
}
stack.push(i);
```

Use for next greater to the right.

---

## 7. Next Smaller Element

```java
while (!stack.isEmpty() && nums[stack.peek()] > nums[i]) {
    answer[stack.pop()] = nums[i];
}
stack.push(i);
```

Use for next smaller to the right.

---

## 8. Previous Greater Element

Scan left to right and maintain a decreasing stack.

```java
while (!stack.isEmpty() && nums[stack.peek()] <= nums[i]) {
    stack.pop();
}

int previousGreater =
        stack.isEmpty() ? -1 : stack.peek();

stack.push(i);
```

---

## 9. Previous Smaller Element

```java
while (!stack.isEmpty() && nums[stack.peek()] >= nums[i]) {
    stack.pop();
}

int previousSmaller =
        stack.isEmpty() ? -1 : stack.peek();

stack.push(i);
```

---

## 10. Circular Next Greater

```java
for (int i = 0; i < 2 * n; i++) {
    int idx = i % n;

    while (!stack.isEmpty() && nums[stack.peek()] < nums[idx]) {
        answer[stack.pop()] = nums[idx];
    }

    if (i < n) {
        stack.push(idx);
    }
}
```

---

## 11. Stock Span

```java
while (!stack.isEmpty() && stack.peek()[0] <= price) {
    span += stack.pop()[1];
}

stack.push(new int[]{price, span});
```

Use for previous-greater boundary in online form.

---

## 12. Largest Rectangle in Histogram

```java
for (int i = 0; i <= n; i++) {
    int current = (i == n) ? 0 : heights[i];

    while (!stack.isEmpty() && heights[stack.peek()] > current) {
        int h = heights[stack.pop()];
        int left = stack.isEmpty() ? -1 : stack.peek();
        int width = i - left - 1;

        best = Math.max(best, h * width);
    }

    if (i < n) stack.push(i);
}
```

---

## 13. Sliding Window Maximum

```java
for (int i = 0; i < n; i++) {
    while (!deque.isEmpty() && deque.peekFirst() <= i - k) {
        deque.pollFirst();
    }

    while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
        deque.pollLast();
    }

    deque.offerLast(i);

    if (i >= k - 1) {
        answer[i - k + 1] = nums[deque.peekFirst()];
    }
}
```

---

## 14. LRU Cache

Use:

```text
HashMap<key, Node>
Doubly Linked List
```

The map finds the node. The list manages recency.

---

## 15. LFU Cache

Use:

```text
Map<key, Node>
Map<frequency, DoublyList>
minFrequency
```

The map finds the node. Frequency lists manage both frequency and recency.

---

# PART 7 — HOW TO CHOOSE THE PATTERN — DECISION TREE

```text
Read the problem
      |
      v
Is it about nested / matching / most-recent behavior?
      |---- YES --> STACK
      |
      NO
      |
Is it about arrival order / first-in-first-out?
      |---- YES --> QUEUE
      |
      NO
      |
Is it asking previous/next/nearest greater or smaller?
      |---- YES --> MONOTONIC STACK
      |
      NO
      |
Is it asking for max/min for every sliding window?
      |---- YES --> MONOTONIC DEQUE
      |
      NO
      |
Is it a histogram / largest rectangle?
      |---- YES --> MONOTONIC STACK
      |
      NO
      |
Is it sum over all subarrays involving min/max?
      |---- YES --> CONTRIBUTION + MONOTONIC STACK
      |
      NO
      |
Does a new element make older elements permanently useless?
      |---- YES --> GREEDY MONOTONIC STACK
      |
      NO
      |
Do arriving objects collide with recent surviving objects?
      |---- YES --> STACK SIMULATION
      |
      NO
      |
Is it a circular next-greater problem?
      |---- YES --> MONOTONIC STACK + TWO PASSES
      |
      NO
      |
Do I need O(1) lookup + recency ordering?
      |---- YES --> HASHMAP + DOUBLY LINKED LIST
      |
      NO
      |
Do I need O(1) lookup + frequency buckets + recency tie-break?
      |---- YES --> LFU DESIGN
      |
      NO
      |
Do I need a count/rank of all greater values, not just nearest greater?
      |---- YES --> ORDER-STATISTIC STRUCTURE
```

---

# PART 8 — FINAL REVISION SHEET

## Stack

**Core idea:** LIFO.

**When to use:**
- nested
- matching
- undo
- unresolved elements
- nearest/previous/next
- remove while maintaining order

**Operations:**
```java
push
pop
peek
isEmpty
```

**Template:**
```java
Deque<Integer> stack = new ArrayDeque<>();
```

---

## Queue

**Core idea:** FIFO.

**When to use:**
- arrival order
- scheduling
- BFS
- window management

**Template:**
```java
Deque<Integer> queue = new ArrayDeque<>();
```

---

## Monotonic Stack

### Increasing

```text
bottom -> top = increasing
```

Usually used for **smaller-element boundaries**.

### Decreasing

```text
bottom -> top = decreasing
```

Usually used for **greater-element boundaries**.

### What the stack represents

Unresolved candidates.

### Push

When current is not enough to resolve the stack top.

### Pop

When current gives the answer/boundary for the stack top.

### Invariant

The stack always preserves the chosen monotonic order.

---

## Monotonic Deque

Stores candidates for a sliding window.

For max:

```text
values decrease from front to back
```

Operations:

- remove expired from front
- remove dominated from back
- front = maximum

---

## Most Important Formulas

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
-> left choices × right choices

Subarray range
-> sum of maxima - sum of minima

Remove K digits
-> pop previous larger digits when current is smaller

LRU
-> HashMap + Doubly Linked List

LFU
-> HashMap + frequency buckets + minFrequency
```

---

# PART 9 — FINAL INTERVIEW CHECKLIST

## Before Coding

Ask yourself:

1. What is the exact output?
2. What is the brute force?
3. Where is the repeated work?
4. What clue gives me the pattern?
5. What data structure should I use?
6. What does each stored element represent?
7. What does top/front mean?
8. What is my invariant?
9. When do I push/offer?
10. When do I pop/poll?
11. Can I permanently eliminate any element?
12. What happens to elements remaining at the end?
13. What are the edge cases?
14. What is the true time complexity?
15. What is the auxiliary space?

---

# THE BIGGEST LESSONS TO CARRY INTO NEW PROBLEMS

## 1. Do not memorize "monotonic stack"

Instead ask:

> "What is unresolved?"

If elements are waiting for some future event, a stack may be the waiting room.

---

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

---

## 3. Indices are often more useful than values

Use indices when you need:

- position
- width
- distance
- expiry
- boundaries

That is why histogram, sliding window, stock span, and next-greater problems usually store indices.

---

## 4. Popping should mean something

Never write:

```java
while (...) stack.pop();
```

without being able to say:

> "I pop because this element's answer/boundary has just become final, or because it can never be useful again."

That sentence is the heart of the algorithm.

---

## 5. O(n) with a while loop is possible

Do not panic when you see:

```java
while (...) {
    stack.pop();
}
```

Ask:

> "Can an element be popped more than once?"

If not, the total work can still be O(n).

---

## 6. Similar-looking words can mean different patterns

### "Next greater"
Nearest future answer.

→ monotonic stack.

### "Count greater"
How many future values satisfy a condition.

→ may need an ordered-frequency structure.

This distinction is important.

---

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

---

# FINAL MEMORY MAP

```text
STACK / QUEUE
│
├── LIFO
│   ├── Basic stack
│   ├── Parentheses
│   ├── Expression conversion
│   ├── Collision simulation
│   └── Greedy removal
│
├── FIFO
│   ├── Basic queue
│   └── BFS / scheduling
│
├── MONOTONIC STACK
│   ├── Next greater
│   ├── Next smaller
│   ├── Previous greater
│   ├── Previous smaller
│   ├── Stock span
│   ├── Histogram
│   ├── Trapping rain water
│   └── Subarray contribution
│
├── MONOTONIC DEQUE
│   └── Sliding window max/min
│
├── CANDIDATE ELIMINATION
│   └── Celebrity
│
└── CACHE DESIGN
    ├── LRU
    └── LFU
```

# One sentence to remember

> **A stack is most powerful when elements are waiting for a future answer, and a monotonic stack is most powerful when some future element can permanently resolve or eliminate them.**
