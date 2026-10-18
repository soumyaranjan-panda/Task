# 6. Implement Queue Using Linked List

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-queue-using-linkedlist) · [Article](https://takeuforward.org/data-structure/implement-queue-using-linked-list/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

FIFO container via linked list. Unlike Problem 5's stack (which only ever needs `head`), a queue's two ends genuinely do different jobs — insert at the back, remove from the front — so both must be tracked.

```text
front -> 10 -> 20 -> 30 <- rear
```

**Figure 1 —** A linked-list queue keeps a pointer at each end: `front` (removal) and `rear` (insertion).

## 2. How to Think About the Problem

**What's cheap on a singly linked list?** Removing from **head**: O(1), always. Inserting at **tail**: O(1) *if* you maintain a tail pointer (otherwise O(n), walking from head to find it every time). Removing from the tail: O(n), always (no `previous` pointer) — so we must never need to do that.

If we keep only a head pointer, enqueue at the tail may require traversal. So keep **both** `front` and `rear`.

Since FIFO removes from the front and adds at the back, and removal-from-front is the operation that's cheap "for free," let `front = head` (the removal side), and make insertion cheap too by explicitly tracking `tail` (the insertion side) with its own pointer.

## 3. Pattern Recognition

**Problem clue:** FIFO + "using a linked list."
**Pattern:** Basic Queue Implementation (same contract as Problem 2, different storage).
**Key structural contrast with Problem 5:** a stack needs *one* pointer (`head`), because both its operations happen at the same end. A queue needs *two* pointers (`head` and `tail`), because its two operations happen at opposite ends.

FIFO on linked list = two active ends.

## 4. Brute Force

Keep only a `head` pointer (no `tail`), and find the tail by walking from `head` every time you enqueue.

```java
// Naive: re-discovers the tail from scratch on every single enqueue
void enqueueNaive(int x) {
    Node newNode = new Node(x);
    if (head == null) { head = newNode; return; }
    Node cur = head;
    while (cur.next != null) cur = cur.next; // O(n) walk to find the tail
    cur.next = newNode;
}
```

**Why is this too slow?** You're re-discovering information (where the tail is) that you already knew a moment ago, right after the *previous* enqueue — and re-discovering it means walking further and further as the queue grows, for *every* single enqueue.

## 5. Observation

Just remember where the tail is instead of re-finding it: maintain a `tail` reference alongside `head`, and update it in O(1) on every enqueue — the new node *is* the new tail, by definition, the moment it's attached.

Store the tail pointer.

## 6. Optimal Approach

`head` and `tail` pointers.

- `enqueue(x)`: create `newNode`; if the queue is empty, `head = tail = newNode`; otherwise `tail.next = newNode`, then `tail = newNode`.
- `dequeue()`: save `head.data`; `head = head.next`; **if `head` becomes `null`, also set `tail = null`** — otherwise `tail` would dangle, pointing at a node that's no longer reachable from `head`.
- Operations: enqueue at `rear`, dequeue at `front`.

## 7. Invariant

> **Invariant:** `head` always points to the oldest not-yet-dequeued node (the front); `tail` always points to the most-recently-enqueued node (the back); following `.next` from `head` reaches `tail` in exact FIFO order. When the queue is empty, **both** `head` and `tail` are `null`.

## 8. Dry Run

| op | list before | operation | list after |
|---|---|---|---|
| `enqueue(1)` | empty | `head = tail =` new node | `1` (head=tail) |
| `enqueue(2)` | `1` | `tail.next = 2`, `tail = 2` | `1 → 2` |
| `enqueue(3)` | `1→2` | `tail.next = 3`, `tail = 3` | `1 → 2 → 3` |
| `dequeue()` | `1→2→3` | save 1, `head = head.next` | `2 → 3` → returns **1** |
| `dequeue()` | `2→3` | save 2, `head = head.next` | `3` (head=tail=3) → returns **2** |
| `dequeue()` | `3` | save 3, `head = head.next = null` → **also `tail = null`** | empty → returns **3** |

```text
offer 10: front=10, rear=10
offer 20: front=10, rear=20
poll: removes 10, front=20
```

## 9. Why Does It Work?

Because `tail` is updated at the *exact* moment a new tail node is created (during enqueue itself), we never need to search for it later — the invariant guarantees correctness without ever re-deriving it. And because removal only ever happens at `head` (the one end that's naturally cheap to shrink from on a singly linked list), dequeue never needs a `previous` pointer. Both ends are directly accessible.

## 10. Java Code

```java
class QueueLinkedList {
    private static class Node {
        int data;
        Node next;
        Node(int data) { this.data = data; }
    }

    private Node head, tail; // front, back

    public boolean isEmpty() { return head == null; }

    public void enqueue(int x) {
        Node newNode = new Node(x);
        if (isEmpty()) {
            head = tail = newNode;
        } else {
            tail.next = newNode;  // attach after the current tail
            tail = newNode;       // new node becomes the tail
        }
    }

    public int dequeue() {
        if (isEmpty()) throw new RuntimeException("Queue Underflow");
        int val = head.data;
        head = head.next;
        if (head == null) tail = null; // queue just became empty — clear tail too
        return val;
    }

    public int front() {
        if (isEmpty()) throw new RuntimeException("Queue is empty");
        return head.data;
    }
}
```

## 11. Complexity

**Time:** O(1) for every operation, thanks to the maintained `tail` pointer.
**Space:** O(n), no capacity ceiling (unlike Problem 2), with extra per-node pointer overhead.

## 12. Edge Cases

- Dequeue down to exactly one element, then dequeue again — must correctly null out `tail` too.
- Enqueue on an empty queue — both `head` and `tail` must become the new node.
- Dequeue/front on empty.
- Removing the last item must also set `rear = null`.

## 13. Common Mistakes

- **Forgetting to reset `tail = null` when the last element is dequeued.** This is the classic bug: `tail` keeps pointing at a node that's no longer reachable from `head`, and the *next* enqueue silently attaches the new node to that orphaned node instead of extending the real list — so the new element becomes unreachable from `head` and effectively disappears.
- Confusing which pointer moves on which operation — `head` moves on dequeue, `tail` moves on enqueue, never the other way.
- Traversing from front to enqueue instead of keeping the tail pointer.

## 14. Pattern to Remember

```text
Problem clue:  implement Queue using a linked list
Pattern:       Basic Queue Implementation
Data structure: singly linked list, head (front) + tail (back)
Stores:        raw values
Enqueue:       attach after tail, then tail = new node
Dequeue:       read head.data, then head = head.next (and null tail if list is now empty)
Invariant:     head = front (oldest), tail = back (newest); both null iff empty
Key insight:   two ends touched -> two pointers; head is the naturally cheap removal side
Time / Space:  O(1) per op / O(n), no capacity ceiling
```

**Memory trick:** *"Two ends, two pointers — and don't forget to null the tail on the last dequeue."*

## 15. Interview Trigger

> If asked for a queue using a linked list, I think: one pointer per end — `head` for removal (the naturally cheap side of a singly linked list), `tail` for insertion (made cheap by tracking it explicitly). The one detail I make a point of not forgetting: when the last element is dequeued, both `head` **and** `tail` must become `null`.

## Related Problems

- [02-Implement-Queue-Using-Arrays.md](02-Implement-Queue-Using-Arrays.md) — same FIFO contract, circular-buffer backing.
- [05-Implement-Stack-Using-Linked-List.md](05-Implement-Stack-Using-Linked-List.md) — the one-pointer contrast: a stack only needs `head`.

## See also

- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md)
- [04-Implement-Queue-Using-Stack.md](04-Implement-Queue-Using-Stack.md)
