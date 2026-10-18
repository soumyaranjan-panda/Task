# Queue

## What a queue actually is

A **queue** is a data structure where you add elements at one end (the
**back** / **rear**) and remove them from the **other** end (the **front**).
Think of a checkout line: whoever joined first gets served first.

## FIFO — First In, First Out

Because removal happens at the opposite end from insertion, the earliest element
added is the first one removed. This is called **FIFO**.

```text
enqueue(1)   enqueue(2)   enqueue(3)        dequeue() -> 1
  ┌───┬───┬───┐                                ┌───┬───┐
  │ 1 │ 2 │ 3 │                                │ 2 │ 3 │
  └───┴───┴───┘                                └───┴───┘
  front     rear                               front   rear
```

**Figure 1 —** Add at the rear, remove from the front. FIFO.

## Core operations

| Operation | What it does | Time |
|---|---|---|
| `enqueue(x)` / `offer(x)` | add `x` to the back | O(1) |
| `dequeue()` / `poll()` | remove and return the front element | O(1) |
| `front()` / `peek()` | look at the front without removing it | O(1) |
| `isEmpty()` | check if empty | O(1) |

## Typical implementation

- **Circular array** — a fixed-size array with wraparound `front`/`rear` pointers
  gives O(1) for everything. A *non-circular* array queue is a trap: removing the
  front forces every remaining element to shift left, turning `dequeue` into O(n).
  That contrast is the "why is my brute force slow" example for this guide.
- **Doubly linked list** with head and tail pointers — O(1) add-to-tail, O(1)
  remove-from-head, no wraparound bookkeeping needed.

## Java: `ArrayDeque` for queues

Prefer **`ArrayDeque`** over `LinkedList` for queue use. It is backed by a
resizable circular array, has better cache locality, and skips the per-node
object overhead a linked list pays. The same `ArrayDeque` class gives stack
behaviour via `push`/`pop` and queue behaviour via `offer`/`poll` — the only
difference is which end you are told to use.

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class QueueDemo {

    public static void main(String[] args) {
        Deque<Integer> queue = new ArrayDeque<>();

        queue.offer(10);            // add to back
        queue.offer(20);
        queue.offer(30);

        int first = queue.peek();   // 10, without removing
        int removed = queue.poll(); // 10, removed
        boolean empty = queue.isEmpty();

        System.out.println(first);    // 10
        System.out.println(removed);  // 10
        System.out.println(empty);    // false
    }
}
```

## Real-world intuition

A checkout line · a printer's job queue · support tickets handled in arrival
order · BFS, visiting nodes level by level in discovery order.

## When should I think "QUEUE"?

| Clue in the problem | Why it signals "queue" |
|---|---|
| "First in, first out" / arrival order | Literal definition. |
| Processing things in the order they arrived | A fairness / arrival-order guarantee is FIFO. |
| BFS / level-order traversal | You must finish everything at the current "distance" before going further out — process nodes in exactly the order you discovered them. |
| Sliding window | As the window slides forward, the **oldest** element must leave before newer ones matter — first-added, first-removed. *(Careful: sliding-window maximum/minimum needs a monotonic **deque**, not a plain queue — plain FIFO queues fit simpler windowed problems such as windowed sums.)* |
| Maintaining "candidates" in discovery order | Same reasoning as BFS. |
| Scheduling / round robin | Everyone gets a turn in the order they queued up. |

**One sentence to internalize:** *A queue is for when the order you must process
things in is the same order you received them in.*

## See also

- [Start Here](00-Start-Here.md)
- [Stack](01-Stack.md)
- [Monotonic Stack](03-Monotonic-Stack.md)
- [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md)
