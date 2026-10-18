# 5. Implement Stack Using Linked List

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-stack-using-linkedlist) · [Article](https://takeuforward.org/data-structure/implement-stack-using-linked-list/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

Same LIFO container as Problem 1, backed by a **singly linked list** instead of an array — no fixed capacity, grows/shrinks one node at a time.

Use linked nodes with the head as the stack top.

```text
top
 ↓
30 -> 20 -> 10
```

**Figure 1 —** The linked-list stack, with `head` serving as the top.

**Key difference from the array version:** no resizing concerns and no capacity ceiling, but each element now carries pointer overhead (an object + a reference), and — crucially — a singly linked list is only cheap to modify at *one particular end*.

## 2. How to Think About the Problem

**What's cheap on a singly linked list?** Inserting/removing at the **head** is O(1) — you just rewire one pointer. Inserting/removing at the **tail** would require walking the whole list to find the node *before* the tail (a singly linked list has no "previous" pointer), which is O(n) — unless you maintain a separate tail pointer, and even then, *removing* from the tail is still O(n), because after removing it you'd need to find the *new* tail by walking from the head.

**The key realization:** a stack only ever needs *one* end — "the most recent thing." Since a linked list's head is exactly "whatever was most recently attached," the cheap end and the end we need are the *same* end. No cleverness required — just recognize it and use it directly.

## 3. Pattern Recognition

**Problem clue:** implement a stack "using a linked list."
**Pattern:** Basic Stack Implementation (same pattern as Problem 1, different storage).
**Mental model:** top = head, always, full stop.
**Similar problems:** Problem 1 (identical external behavior); Problem 6 (Queue via Linked List) is the contrast — a queue is forced to touch *both* ends, needing head **and** tail pointers.

**LIFO + linked structure** implies: use the head.

## 4. Brute Force

The genuine naive-but-wrong instinct here: treat the **tail** as the top instead (append new nodes at the end; "pop" removes from the end).

```java
// Naive: pop() has no way to find the new tail without walking the whole list
int popFromTailNaive(Node head) {
    if (head.next == null) { /* only element */ return head.data; }
    Node cur = head;
    while (cur.next.next != null) cur = cur.next; // walk to the SECOND-TO-LAST node
    int val = cur.next.data;
    cur.next = null;
    return val;
}
```

**Why is this too slow?** A singly linked list has no `previous` pointer, so finding the node *just before* the tail (needed to detach the tail and correctly form the new tail) requires walking from the head every single time — O(n) per pop, even though push (append at tail, with a maintained tail pointer) could stay O(1).

## 5. Observation

The lesson here is the mirror image of Problem 2's: instead of a clever fix, recognize that the *cheap* end (head) already matches the end we actually need for LIFO ("top"). No wraparound trick, no auxiliary pointer — just use head directly as top.

The head is naturally a single active end.

## 6. Optimal Approach

Singly linked list with a `head` reference only — no tail pointer needed, because we never touch the tail.

- `push(x)`: create a new node; `newNode.next = head`; `head = newNode`.
- `pop()`: save `head.data`; `head = head.next`; return the saved value.
- `peek()`: `head.data`. `isEmpty()`: `head == null`.

## 7. Invariant

> **Invariant:** `head` always points at the most-recently-pushed, not-yet-popped node, and following `.next` pointers from `head` visits the remaining stack contents in exact "most recent first" order. `head` is always the newest stack item.

## 8. Dry Run

| op | list before | operation | list after |
|---|---|---|---|
| `push(10)` | `null` | new node, `next=null`, `head=`it | `10 → null` |
| `push(20)` | `10 → null` | new node, `next=`old head, `head=`it | `20 → 10 → null` |
| `push(30)` | `20→10→null` | same | `30 → 20 → 10 → null` |
| `pop()` | `30→20→10→null` | save 30, `head = head.next` | `20 → 10 → null` → returns **30** |
| `peek()` | `20→10→null` | read `head.data` | unchanged → returns **20** |

```text
push 10 -> 10
push 20 -> 20 -> 10
pop -> 20
```

## 9. Why Does It Work?

A linked list's head is the one place where insertion/removal never requires knowing about, or touching, any *other* node — only `head` itself and the new/old node's `.next` are ever rewired. Since LIFO only ever needs "the most recent thing," and `head` *is*, by construction, "whatever was inserted most recently and hasn't been removed," the two line up perfectly with zero extra bookkeeping. Only the head changes, so each operation touches one node.

## 10. Java Code

```java
class StackLinkedList {
    private static class Node {
        int data;
        Node next;
        Node(int data) { this.data = data; }
    }

    private Node head;

    public boolean isEmpty() { return head == null; }

    public void push(int x) {
        Node newNode = new Node(x);
        newNode.next = head;   // new node points to the OLD top
        head = newNode;        // new node becomes the top
    }

    public int pop() {
        if (isEmpty()) throw new RuntimeException("Stack Underflow");
        int val = head.data;
        head = head.next;      // old top is dropped
        return val;
    }

    public int peek() {
        if (isEmpty()) throw new RuntimeException("Stack is empty");
        return head.data;
    }
}
```

## 11. Complexity

**Time:** O(1) for every operation — only `head` (and, for push, one new node's `.next`) is ever touched, never a traversal.
**Space:** O(n) total across all elements, no pre-allocated capacity like the array version — grows/shrinks exactly one node per operation, but each node carries extra overhead (object header + pointer) versus the array version's bare `int`.

## 12. Edge Cases

- Pop/peek on empty (`head == null` → guard, or you'll get a `NullPointerException`).
- Single element (push then pop returns cleanly to empty).
- Very long chains — no capacity ceiling like Problem 1, but real memory is still finite.

## 13. Common Mistakes

- **Setting `head = newNode` *before* wiring `newNode.next = head`** — this loses the reference to the old head entirely, since you overwrote `head` before reading its old value into `newNode.next`. Order matters.
- Forgetting the `isEmpty()`/null check before dereferencing `head.data`.
- Trying to *also* maintain a `tail` pointer "just in case" — unnecessary for a stack, and a common instinct wrongly carried over from queue implementations (see Problem 6).
- Pushing at the tail, which turns push into O(n).

## 14. Pattern to Remember

```text
Problem clue:  implement Stack using a linked list
Pattern:       Basic Stack Implementation
Data structure: singly linked list, head pointer only
Stores:        raw values
Push:          newNode.next = head; then head = newNode
Pop:           save head.data; then head = head.next
Invariant:     head = most recently pushed, not-yet-popped node
Key insight:   top = head, always — the cheap end IS the end we need
Time / Space:  O(1) per op / O(n), no capacity ceiling
```

**Memory trick:** *"Top = head. No tail, ever."*

## 15. Interview Trigger

> If asked for a stack using a linked list, I immediately think: top = head, nothing else needed. Push wires the new node's `next` to the current head *then* updates head; pop reads `head.data` *then* advances head to `head.next`. No tail pointer, no traversal, ever.

## Related Problems

- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md) — same LIFO contract, fixed-size array backing.
- [06-Implement-Queue-Using-Linked-List.md](06-Implement-Queue-Using-Linked-List.md) — the two-pointer contrast: a queue needs head **and** tail.

## See also

- [02-Implement-Queue-Using-Arrays.md](02-Implement-Queue-Using-Arrays.md)
- [08-Min-Stack.md](08-Min-Stack.md)
