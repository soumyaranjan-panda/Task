# 3. Implement Stack Using Queue

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-stack-using-queue) · [Article](https://takeuforward.org/data-structure/implement-stack-using-single-queue) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w) — **LeetCode:** [Problem](https://leetcode.com/problems/implement-stack-using-queues/)

## 1. Problem Understanding

Build stack `push`/`pop`/`top` using **only** queue operations (`enqueue`/`dequeue`) as primitives — no array indexing, no direct access to the middle.

- **Input:** sequence of push/pop/top calls.
- **Output:** results of pop/top.
- **Constraint:** internally, you may use one or two queues.
- **What makes this different:** you're forced to build LIFO behavior on top of a primitive (queue) that natively does the *opposite* (FIFO). Somewhere, an order must get reversed.

We have FIFO primitives but need LIFO behavior. That means we must somehow make the newest element appear at the front.

## 2. How to Think About the Problem

**What should I notice first?** `queue.poll()` always returns the *oldest* element. `stack.pop()` needs the *newest*. Direct conflict.

```text
Queue gives: oldest first
Stack needs: newest first
```

There are two common strategies. The one we lead with makes `push` pay the reordering cost.

**What would I try first?** Pick ONE operation to make "expensive" (do reordering work there), so the other stays cheap and simple — this is a recurring theme in "implement A using B" problems.

**What observation unlocks the trick?** After enqueuing a new element to the back of a queue of size `k`, if you immediately dequeue-then-re-enqueue the `k - 1` elements that were sitting in front of it, the new element ends up at the **front**. From then on, `queue.peek()` gives the most-recently-pushed element — exactly what `stack.peek()`/`pop()` need.

```text
queue: [1,2]
add 3 -> [1,2,3]
rotate 1,2 -> [3,1,2]

Now poll() behaves like stack pop().
```

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** need LIFO from FIFO
**Observation:** rotating the queue right after insertion moves the newest element to the front
**Pattern:** Stack ⟷ Queue Conversion
**Data structure:** single queue
**Algorithm:** `enqueue`, then rotate (size − 1) times

## 3. Pattern Recognition

**Problem clue:** "implement X using only Y's operations."
**Pattern:** Stack ⟷ Queue Conversion.
**Why this pattern:** you must simulate one ADT's ordering with the other's native primitives.
**Mental model:** pick one operation to pay the reordering cost, so the other operation stays free.
**Similar problems:** Problem 4 is the exact mirror image (Queue using Stack).
**Recognizing this elsewhere:** any "implement A using only B's operations" question is really asking "what invariant on B's internal arrangement fakes A's external behavior?"

## 4. Brute Force

The naive idea: don't reorder on push at all. Instead, make `pop()` drain the *whole* queue to reach the last-inserted element, remember it, then rebuild the queue (minus that element) to restore order.

```java
// Naive: O(n) EVERY pop, plus bookkeeping to restore order
int popNaive(Queue<Integer> q) {
    int n = q.size();
    int last = -1;
    for (int i = 0; i < n; i++) {
        int val = q.poll();
        if (i < n - 1) q.offer(val); else last = val;
    }
    return last;
}
```

**Why is this too slow?** Every single `pop()` touches all `n` elements, even though only *one* of them (the last) is actually the answer — the other `n - 1` are moved purely to restore the queue to where it started. Storing everything elsewhere or using two queues also works, but uses extra structure.

## 5. Observation

Instead of paying this cost on **every pop**, pay a similar cost **once, on every push**, and get pop for free afterward: right after enqueueing the new element, rotate the *older* `size - 1` elements from front to back, one at a time. Since they were sitting in front of the new element, moving all of them behind it leaves the new element at the front.

## 6. Optimal Approach

Single queue.

- `push(x)`: enqueue `x` (lands at the back); let `rotations = current size − 1` (how many elements were there *before* `x`); repeat `rotations` times: dequeue the front element and immediately re-enqueue it. After this, `x` sits at the front.
- `pop()`: just dequeue — the front is guaranteed correct by the invariant.
- `top()`: just peek at the front.

## 7. Invariant

> **Invariant:** After every completed `push()` call, the queue's front-to-back order is exactly the *reverse* of insertion order — `queue.peek()` always equals the most-recently-pushed, not-yet-popped element. The front of the queue is always the stack's top.

## 8. Dry Run

| op | queue before | operation | queue after |
|---|---|---|---|
| `push(1)` | `[]` | enqueue 1, 0 rotations | `[1]` |
| `push(2)` | `[1]` | enqueue 2 → `[1,2]`, rotate 1 → move `1` to back | `[2,1]` |
| `push(3)` | `[2,1]` | enqueue 3 → `[2,1,3]`, rotate 2 → move `2`, then `1` | `[3,2,1]` |
| `pop()` | `[3,2,1]` | dequeue front | `[2,1]` → returns **3** |
| `pop()` | `[2,1]` | dequeue front | `[1]` → returns **2** |
| `push(5)` | `[1]` | enqueue 5 → `[1,5]`, rotate 1 → move `1` | `[5,1]` |
| `top()` | `[5,1]` | peek front | returns **5** |

```text
push(3) onto queue [2,1]:

step 1: enqueue 3        front           back
                        [ 2 | 1 | 3 ]
                            ^       ^
step 2: rotate 2,1      [ 3 | 2 | 1 ]
                            ^
                        newest is now front
```

**Figure 1 —** Rotating older elements behind the newcomer moves it to the front.

## 9. Why Does It Work?

Rotating exactly `size − 1` elements after every push guarantees the newest element reaches the front, because that's precisely how many "older" elements existed ahead of it at that moment — no more, no less. Every push pays for its own reordering in full, so `pop`/`top` never need to do anything beyond a native O(1) queue operation.

## 10. Java Code

```java
class StackUsingQueue {
    private Deque<Integer> queue = new ArrayDeque<>(); // used purely as a FIFO here

    public void push(int x) {
        queue.offer(x);
        int rotations = queue.size() - 1;
        for (int i = 0; i < rotations; i++) {
            queue.offer(queue.poll()); // move one "older" element from front to back
        }
    }

    public int pop() { return queue.poll(); }
    public int top()  { return queue.peek(); }
    public boolean isEmpty() { return queue.isEmpty(); }
}
```

## 11. Complexity

**Time:** `push` is O(n) (up to `size − 1` rotations); `pop` and `top` are O(1). This is a deliberate trade-off, not a limitation — the reordering cost has to live *somewhere*, and this design puts it on push.
**Space:** O(n) for the underlying queue holding all elements.

## 12. Edge Cases

- Push/pop on an empty stack.
- Single-element stack.
- Many pushes then many pops interleaved (worth tracing by hand once to build confidence).

## 13. Common Mistakes

- **Rotating the wrong number of times** — using `size` instead of `size − 1` rotates the new element itself back to the rear, undoing the entire point.
- Forgetting the new element is already inserted — noting `size` *after* adding it makes the rotation count off by one; capture the size before enqueuing, or subtract one after.
- Forgetting this trades push's simplicity for pop's — some interviewers specifically want the *other* trade-off (two queues: O(1) push, O(n) pop by draining one queue into another to reach the bottom element). Know that alternative exists even if you lead with this one.
- Assuming `poll()` immediately followed by `offer()` is a single atomic step — it's two real operations, not free.

## 14. Pattern to Remember

```text
Problem clue:  implement Stack using only Queue operations
Pattern:       Stack ⟷ Queue Conversion
Data structure: single queue
Stores:        raw values, kept in reverse-insertion order
Push:          enqueue, then rotate (size-1) older elements to the back
Pop / Top:     plain dequeue / peek — free, by the push-time invariant
Invariant:     queue front == most recently pushed, not-yet-popped element
Key insight:   pick ONE op to pay the reordering cost; the other rides free
Time:          push O(n), pop/top O(1)
Space:         O(n)
```

**Memory trick:** *"Rotate right after you push — the newcomer muscles its way to the front."*

## 15. Interview Trigger

> If asked to implement a Stack using only Queue operations, I think: I need one ADT's data arranged internally to fake the other's order. I'll make `push()` do the reordering — enqueue the new value, then rotate every older element from front to back exactly `size − 1` times — so the queue's own front is always my most recent push.

## Related Problems

- [04-Implement-Queue-Using-Stack.md](04-Implement-Queue-Using-Stack.md) — the exact mirror image: Queue built from Stack primitives.

## See also

- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md)
- [02-Implement-Queue-Using-Arrays.md](02-Implement-Queue-Using-Arrays.md)
- [07-Balanced-Parentheses.md](07-Balanced-Parentheses.md)
