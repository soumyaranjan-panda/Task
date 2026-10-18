# 4. Implement Queue Using Stack

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-queue-using-stack) · [Article](https://takeuforward.org/data-structure/implement-queue-using-stack/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w) — **LeetCode:** [Problem](https://leetcode.com/problems/implement-queue-using-stacks/)

## 1. Problem Understanding

Build queue `enqueue`/`dequeue`/`front` using **only** stack `push`/`pop` operations. The same "wrong native order" conflict as Problem 3, mirrored: a stack naturally gives LIFO, but we need FIFO.

We have LIFO but need FIFO. The classic solution uses **two stacks**.

- **Input:** sequence of enqueue/dequeue/front calls.
- **Output:** results of dequeue/front.
- **Constraint:** only stack `push`/`pop` are allowed as primitives.

## 2. How to Think About the Problem

**What should I notice first?** This is *structurally the same shape* as Problem 3, direction reversed.

**What would I try first?** Same idea — pick one operation to be "expensive," reorder there.

**The twist here:** with **two stacks**, reversing an order *twice* restores the original order — and this can be done far more cheaply than Problem 3's per-call rotation, because you only *need* to reverse when your "ready to dequeue" supply runs out, not on every single call.

One stack reverses the order. A second reversal restores FIFO behavior.

```text
in stack:  1 2 3
transfer ->
out stack: 3 2 1
top of out = 1
```

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** need FIFO from LIFO primitives
**Observation:** reversing twice restores the original order
**Pattern:** Queue via two Stacks
**Data structure:** `inStack` (arrivals) + `outStack` (departures)
**Algorithm:** push cheaply onto `inStack` always; only when `outStack` is empty, pour ALL of `inStack` into `outStack` (this reverses once); dequeue from `outStack` (this reverses again, restoring FIFO order)

## 3. Pattern Recognition

**Problem clue:** "implement Queue using only Stack operations."
**Pattern:** Stack ⟷ Queue Conversion (mirror of Problem 3).
**Why this pattern:** same "one ADT's ordering, faked using the other's primitives" idea.
**Mental model:** two stacks, reverse-then-reverse-again cancels out.
**Key contrast with Problem 3:** there, the reordering cost is paid on *every single push*. Here, it's paid in occasional big batches — which is why this version is normally preferred: it's **amortized** O(1), not worst-case O(n) on every call.

## 4. Brute Force

Single-stack idea, same flavor as Problem 3's naive approach: to dequeue, pop everything into a temp stack to reach the bottom (oldest) element, then push everything back to restore order.

```java
// Naive: full reversal-and-restoration on EVERY dequeue
int dequeueNaive(Deque<Integer> stack) {
    Deque<Integer> temp = new ArrayDeque<>();
    while (stack.size() > 1) temp.push(stack.pop());
    int frontVal = stack.pop();
    while (!temp.isEmpty()) stack.push(temp.pop());
    return frontVal;
}
```

**Why is this too slow?** Every dequeue call redoes a *full* reversal-and-restoration, even for elements that were already correctly sorted into place by an earlier dequeue moments before. That earlier work is thrown away and repeated from scratch, every time. Moving all elements between stacks on every operation is unnecessarily expensive.

## 5. Observation

Don't restore the order after dequeuing — **leave it reversed** as long as it's still usable! It only stops being usable once you've drained it completely and need fresh elements. So: only refill from the "arrivals" pile when the "departures" pile is *completely* empty. Each element then gets "flipped" from one pile to the other exactly once in its whole lifetime.

If `out` is non-empty, its top is already the oldest queue element. No transfer is needed.

## 6. Optimal Approach

Two stacks: `inStack` (absorbs enqueues) and `outStack` (serves dequeues).

- `enqueue(x)`: always just `inStack.push(x)` — O(1), no exceptions, ever.
- `dequeue()`: if `outStack` is empty, pour *all* of `inStack` into `outStack` (pop from `inStack`, push to `outStack`, repeat until `inStack` is empty) — this reverses their order, so the oldest element (which was at the very bottom of `inStack`) ends up on **top** of `outStack`. Then `outStack.pop()`.

```text
in:  newest arrivals
out: next elements to dequeue

When out is empty:
while in not empty:
    out.push(in.pop())
```

## 7. Invariant

> **Invariant:** At all times, `outStack` (top→bottom) holds the oldest still-pending elements in correct dequeue order, and `inStack` (top→bottom) holds the newer elements in reverse dequeue order. Every element lives in exactly one of the two stacks at any moment, and moves from `inStack` to `outStack` — reversing its position — exactly once in its entire lifetime. When `out` is non-empty, its top is the oldest element waiting in the queue.

## 8. Dry Run

| op | inStack | outStack | operation | answer |
|---|---|---|---|---|
| `enqueue(1,2,3)` | `[3,2,1]` (top=3) | `[]` | three pushes | — |
| `dequeue()` | `[3,2,1]` → `[]` | `[]` → `[3,2,1]` (top=1) | outStack empty → pour all of inStack, then pop | **1** |
| (state now) | `[]` | `[3,2]` (top=2) | | |
| `enqueue(4)` | `[4]` | `[3,2]` | push | — |
| `dequeue()` | `[4]` | `[3,2]` | outStack not empty → just pop | **2** |
| `dequeue()` | `[4]` | `[3]` | pop | **3** |
| `dequeue()` | `[4]` → `[]` | `[]` → `[4]` | outStack empty → pour inStack (just `4`), then pop | **4** |

```text
enqueue(1,2,3):

inStack (top->bottom)     outStack
   [ 3 2 1 ]                 [ ]

dequeue(): pour inStack into outStack, then pop
   inStack []              outStack [ 3 2 1 ]  -> top is oldest (1)
                                       ^
                                    pop() = 1
```

**Figure 1 —** Pouring reverses once; popping the second stack reverses again, restoring FIFO.

## 9. Why Does It Work?

Reversing an order twice gives back the original order. `inStack` naturally reverses insertion order (most recent on top, as any stack does). Pouring it into `outStack` reverses it *again* — so `outStack` ends up in true FIFO order (oldest on top, ready to pop). As long as a pour only ever happens when `outStack` is completely empty, no element is ever mixed between "generations," so every element passes through exactly this reverse-then-reverse-again journey and comes out correctly ordered.

## 10. Java Code

```java
class QueueUsingStack {
    private Deque<Integer> inStack = new ArrayDeque<>();
    private Deque<Integer> outStack = new ArrayDeque<>();

    public void enqueue(int x) {
        inStack.push(x); // always cheap
    }

    public int dequeue() {
        if (outStack.isEmpty()) {
            // one-time "flip": each element moves inStack -> outStack exactly once
            while (!inStack.isEmpty()) outStack.push(inStack.pop());
        }
        return outStack.pop();
    }
}
```

## 11. Complexity

**Time:** `enqueue` is always O(1). `dequeue` is **amortized O(1)** — a single call *can* cost O(n) (when it triggers a pour), but pouring moves each element from `inStack` to `outStack` exactly once, ever, no matter how many enqueue/dequeue calls happen overall. Across any sequence of `m` operations, total pouring work is bounded by the total number of elements ever enqueued (≤ `m`), so spread across `m` calls, the average cost per call is O(1). This is the same "each element is touched a bounded number of times, total, across the whole run" argument used for the monotonic stack in Part 1 — just applied to a different structure.
**Space:** O(n) across both stacks combined.

## 12. Edge Cases

- Dequeue on completely empty (both stacks empty).
- Dequeue immediately after a pour vs. while `outStack` still has leftovers.
- Alternating single enqueue/dequeue pairs — worth tracing once to see that most calls are O(1) but not literally every single one.
- `front()`/`peek()` must also trigger a pour if needed, not just `dequeue()`.

## 13. Common Mistakes

- **Pouring from `inStack` to `outStack` even when `outStack` is not empty** — this interleaves old and new "generations" incorrectly and breaks the invariant permanently.
- Forgetting `front()` needs the same "pour if empty" check as `dequeue()`.
- Reporting worst-case O(1) instead of amortized O(1) — a good interviewer will ask "what's the worst case for one single call?" (answer: O(n)) and expects you to explain *why the average is still O(1)*.

## 14. Pattern to Remember

```text
Problem clue:  implement Queue using only Stack operations
Pattern:       Stack ⟷ Queue Conversion (mirror of Problem 3)
Data structure: two stacks — inStack (arrivals), outStack (departures)
Stores:        raw values
Enqueue:       inStack.push(x) — always O(1)
Dequeue:       if outStack empty, pour all of inStack into it; then outStack.pop()
Invariant:     each element flips inStack -> outStack exactly once, ever
Key insight:   reverse twice = restore order; only reverse when you must
Time:          enqueue O(1); dequeue amortized O(1), worst case O(n)
Space:         O(n)
```

**Memory trick:** *"Two stacks, reverse twice — but only reverse when the well runs dry."*

## 15. Interview Trigger

> If asked to implement a Queue using only Stack operations, I think: two stacks, because reversing an order twice cancels out. `inStack` absorbs enqueues cheaply. `outStack` serves dequeues cheaply — and I only ever refill `outStack` from `inStack` when `outStack` is completely empty, which guarantees each element is "flipped" exactly once in its lifetime, giving amortized O(1).

## Related Problems

- [03-Implement-Stack-Using-Queue.md](03-Implement-Stack-Using-Queue.md) — the exact mirror image: Stack built from Queue primitives.

## See also

- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md)
- [06-Implement-Queue-Using-Linked-List.md](06-Implement-Queue-Using-Linked-List.md)
- [08-Min-Stack.md](08-Min-Stack.md)
