# 2. Implement Queue Using Arrays

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-queue-using-arrays) · [Article](https://takeuforward.org/data-structure/implement-queue-using-array/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

Build `enqueue`, `dequeue`, `front`, `isEmpty` (FIFO behavior) using a plain fixed-size array.

- **Input:** sequence of enqueue/dequeue/front calls.
- **Output:** results of dequeue/front.
- **Constraint:** known fixed capacity.
- **What makes this different from Problem 1:** a queue genuinely touches **both ends** — insert at the back, remove from the front. That single fact is the whole story of this problem.

```text
front -> first valid item
rear  -> next insertion position
```

## 2. How to Think About the Problem

**First instinct:** keep "front" pinned at index 0 (the simplest possible mental model). Enqueue writes at the next free slot; dequeue reads `arr[0]`, then **shifts everything left by one** so index 0 is still the front.

**Why might that be too slow?** Shifting is O(n) *per dequeue*, because every remaining element has to physically move — even though logically, nothing about the data itself required moving.

**What observation unlocks the better solution?** "Front" doesn't have to be a *fixed* index — it can be a **pointer that walks forward**. Then dequeue is just "read `arr[front]`, then `front++`" — zero data movement.

**But then:** after enough dequeues, `rear` eventually runs past the end of the array, even though slots at the *beginning* are free again (vacated by earlier dequeues). The fix: treat the array as **circular** — wrap indices with `% capacity` so freed space gets reused automatically.

### Clue → Observation → Pattern → Data Structure → Algorithm

**Clue:** FIFO
**Observation:** remove from front, add at rear
**Pattern:** two boundaries
**Data structure:** circular array + `front` + `rear` + `size`
**Algorithm:** move boundaries modulo capacity

## 3. Pattern Recognition

**Problem clue:** FIFO + fixed-size raw array.
**Pattern:** Basic Queue Implementation (circular buffer).
**Why this pattern:** two ends both matter, unlike a stack.
**Mental model:** two pointers walking around a circular track.
**Similar problems:** Problem 6 (Queue via Linked List) needs the same "track both ends" thinking, but no wraparound arithmetic, since a linked list can just grow.
**Recognizing this elsewhere:** any time you need O(1) FIFO on top of a *fixed-size* array without a linked list, "circular buffer" is the keyword to reach for.

## 4. Brute Force

Store items in a normal array and on every dequeue shift everything left:

```text
[10,20,30]
dequeue 10
shift -> [20,30]
```

```java
class NaiveArrayQueue {
    private int[] arr;
    private int size, capacity;

    NaiveArrayQueue(int capacity) { this.capacity = capacity; arr = new int[capacity]; }

    boolean isEmpty() { return size == 0; }
    boolean isFull()  { return size == capacity; }

    void enqueue(int x) {
        if (isFull()) throw new RuntimeException("Queue full");
        arr[size++] = x;
    }

    int dequeue() {
        if (isEmpty()) throw new RuntimeException("Queue empty");
        int front = arr[0];
        for (int i = 1; i < size; i++) arr[i - 1] = arr[i]; // shift everyone left
        size--;
        return front;
    }
}
```

**Why is this too slow?** Every `dequeue()` re-shifts the *entire* remaining array, even though only one element (the front) logically needed to be removed. Dequeue `n` times in a row and total shifting work is `n + (n-1) + (n-2) + ... ≈ O(n²)` for what should be `n` O(1) operations. The repeated work is: *re-copying elements that were already correctly placed, purely to keep "front" pinned at index 0.*

## 5. Observation

Instead of moving elements, move `front`.

```text
Brute force (shift on every dequeue)
     ↓
Repeated work: re-copying every remaining element, every single dequeue
     ↓
Observation: "front" can be a moving pointer instead of a fixed index
     ↓
New snag: rear eventually runs past the array end, even though early slots are free again
     ↓
Data structure: circular array — wrap indices with % capacity
     ↓
Optimized solution: O(1) enqueue AND dequeue
```

Circular indexing:

```java
(index + 1) % capacity
```

## 6. Optimal Approach

Keep `front`, `rear`, and `size` (size disambiguates "empty" from "full," since both can otherwise look like `front == rear`).

- Initial: `front = 0`, `rear = -1`, `size = 0`.
- `enqueue(x)`: `rear = (rear + 1) % capacity`; `arr[rear] = x`; `size++`.
- `dequeue()`: read `arr[front]`; `front = (front + 1) % capacity`; `size--`.

Insertion position can equivalently be written as `(front + size) % capacity`.

## 7. Invariant

> **Invariant:** At all times, the `size` valid elements occupy the circular range starting at index `front` and proceeding forward (wrapping via `% capacity`) for `size` steps. `front` always points at the oldest element (if any); `rear` always points at the most recently added element (if any).

## 8. Dry Run

Capacity = 3:

| op | front,rear,size before | operation | front,rear,size after | answer |
|---|---|---|---|---|
| `enqueue(1)` | 0,-1,0 | `rear=0`, arr[0]=1 | 0,0,1 | — |
| `enqueue(2)` | 0,0,1 | `rear=1`, arr[1]=2 | 0,1,2 | — |
| `enqueue(3)` | 0,1,2 | `rear=2`, arr[2]=3 (now full) | 0,2,3 | — |
| `dequeue()` | 0,2,3 | read arr[0]=1, `front=1` | 1,2,2 | **1** |
| `enqueue(4)` | 1,2,2 | `rear=(2+1)%3=0`, arr[0]=4 (overwrites the already-dequeued 1) | 1,0,3 | — |
| `dequeue()` | 1,0,3 | read arr[1]=2, `front=2` | 2,0,2 | **2** |
| `dequeue()` | 2,0,2 | read arr[2]=3, `front=0` | 0,0,1 | **3** |
| `dequeue()` | 0,0,1 | read arr[0]=4, `front=1` | 1,0,0 | **4** |

Notice `rear` **wraps around** to index 0 at the `enqueue(4)` step, reusing the slot vacated by the dequeue of `1` — exactly the trick this problem is testing.

```text
capacity = 3, after enqueue(1,2,3) then dequeue():

index:   0     1     2
       +-----+-----+-----+
       |  1  |  2  |  3  |      front=1, rear=2, size=2
       +-----+-----+-----+       ^           ^
                                 |           |
                              (vacated)    rear
```

**Figure 1 —** A circular buffer: `front` walks forward, `rear` wraps to reuse freed slots.

## 9. Why Does It Work?

The `% capacity` operation makes index arithmetic "wrap" once it passes the last valid index, so slots freed by earlier dequeues get reused automatically — no searching for free space required. The invariant guarantees that whenever `size < capacity`, the slot `(rear + 1) % capacity` is *always* free, because it's exactly the slot that's `size` steps ahead of `front`, and everything from `front` for `size` steps is the only "occupied" region by definition.

## 10. Java Code

```java
class CircularArrayQueue {
    private int[] arr;
    private int front, rear, size, capacity;

    public CircularArrayQueue(int capacity) {
        this.capacity = capacity;
        this.arr = new int[capacity];
        this.front = 0;
        this.rear = -1;
        this.size = 0;
    }

    public boolean isEmpty() { return size == 0; }
    public boolean isFull()  { return size == capacity; }

    public void enqueue(int x) {
        if (isFull()) throw new RuntimeException("Queue full");
        rear = (rear + 1) % capacity;  // wrap around
        arr[rear] = x;
        size++;
    }

    public int dequeue() {
        if (isEmpty()) throw new RuntimeException("Queue empty");
        int val = arr[front];
        front = (front + 1) % capacity; // wrap around
        size--;
        return val;
    }
}
```

## 11. Complexity

**Time:** O(1) for every operation — one addition, one modulo, no traversal.
**Space:** O(capacity), fixed.

## 12. Edge Cases

- Empty dequeue/front. Full enqueue.
- `front`/`rear` wraparound crossing the array boundary (the dry run above hits this deliberately).
- Capacity of 1.

## 13. Common Mistakes

- **Using `front == rear` alone to distinguish empty from full** — both states can produce this, which is exactly why a `size` counter (or an equivalent "always leave one slot empty" convention) is necessary.
- **Forgetting the modulo** when advancing `front`/`rear` — they just run past the array end and crash.
- **Off-by-one in `isFull()`** — comparing against `capacity` incorrectly if `size` isn't tracked precisely.
- Assuming dequeue must be O(n) because of the naive version — no, that was purely a consequence of an implementation *choice* (pinning front at index 0), not a fundamental limitation of arrays.
- Confusing `rear` with the last occupied position instead of the next insertion slot.

## 14. Pattern to Remember

```text
Problem clue:  FIFO using a fixed-size raw array
Pattern:       Basic Queue Implementation (circular buffer)
Data structure: array + front pointer + rear pointer + size counter
Stores:        raw values
Enqueue:       rear = (rear+1)%capacity; write; size++
Dequeue:       read at front; front = (front+1)%capacity; size--
Invariant:     the size valid elements occupy the circular range starting at front
Key insight:   don't move the data — move the pointer, and let it wrap
Time / Space:  O(1) per op / O(capacity)
```

**Memory trick:** *"Don't move the data, move the pointer — and let the pointer wrap around."*

## 15. Interview Trigger

> If asked for a queue backed by a raw array, I think: two ends means two pointers. I'll let them wrap with `% capacity` so I never shift data, and I'll track `size` explicitly so `front == rear` doesn't ambiguously mean both "empty" and "full."

## Related Problems

- [06-Implement-Queue-Using-Linked-List.md](06-Implement-Queue-Using-Linked-List.md) — same FIFO contract, dynamic storage instead of wraparound.
- [01-Implement-Stack-Using-Arrays.md](01-Implement-Stack-Using-Arrays.md) — single-ended sibling with no wraparound arithmetic.

## See also

- [04-Implement-Queue-Using-Stack.md](04-Implement-Queue-Using-Stack.md)
- [05-Implement-Stack-Using-Linked-List.md](05-Implement-Stack-Using-Linked-List.md)
