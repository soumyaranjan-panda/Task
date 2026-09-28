# Stack & Queue Interview Guide — Part 3A: Problems 1–8

**Guide map:** `00_START_HERE.md` → `01_foundation...md` → `02_universal_thinking_framework.md` → **`03_problems_01to08...md`** (you are here) → `04_problems_09to14...md` → (more coming)

All Java code in this file was written into a real compiler and run against expected outputs before being placed here — see the note at the end of `00_START_HERE.md` if you want the details.

---

# 1. Implement Stack using Arrays

### 1. Problem Understanding

Build `push`, `pop`, `peek`, `isEmpty` (LIFO behavior) using a **plain fixed-size array** as the only storage — no built-in `Stack`/`Deque`/`ArrayList`.

- **Input:** a sequence of operations (`push x`, `pop`, `peek`, `isEmpty`).
- **Output:** the results of `pop`/`peek` calls.
- **Constraint:** a known maximum capacity.
- **Observation:** an array gives O(1) access to *any* index — we just need one variable that always tells us "where does the used part of the array currently end?"

Example: `push(10) → push(20) → push(30) → pop()` should return `30`.

### 2. How to Think About the Problem

**What should I notice first?** The problem only ever touches *one end*. That means I need exactly one piece of bookkeeping: a pointer to "the end."

**What would I try first?** Use an array plus an integer `top` marking the current end of the used region.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`push/pop only touch one end` → `an array index can act as "the end" pointer` → `Basic Stack Implementation` → `array + top index` → `increment top then write on push; read then decrement top on pop`.

This problem has no "trick" beyond that — it *is* the foundational pattern every later problem's stack is built out of (whether hand-rolled like here, or `ArrayDeque` under the hood).

### 3. Pattern Recognition

**Problem clue:** only one end is ever touched; the problem literally says "stack."
**Pattern:** Basic Stack Implementation.
**Why this pattern:** LIFO is given directly by the problem name.
**Mental model:** array + a single pointer marking "how full am I."
**Similar problems:** Problem 5 (Stack using Linked List) — identical external behavior, different internal storage.

### 4. Brute Force

There's a genuine naive-but-wrong-headed instinct here: pin `top` at **index 0** (thinking of "top" as "the front of the array"), and shift every element on every push/pop to keep it there.

```java
// Naive: insists the top must live at index 0
void pushNaive(int[] arr, int size, int x) {
    for (int i = size; i > 0; i--) arr[i] = arr[i - 1]; // shift everyone right
    arr[0] = x;
}
```

**Why is this too slow?** Every push re-copies the *entire* current contents, purely because of an arbitrary decision that index 0 must always hold the top. The data itself never needed to move — only our choice of "where top lives" forced it to.

### 5. Observation

The top doesn't have to live at a fixed index. If we let it live at the **highest used index** instead, insertion/removal there touches exactly one slot, because nothing else needs to shift out of the way.

### 6. Optimal Approach

Array + `top` index, starting at `-1` (empty).
- `push(x)`: increment `top`, then write `arr[top] = x`.
- `pop()`: read `arr[top]`, then decrement `top`.
- `peek()`: read `arr[top]`.
- `isEmpty()`: `top == -1`. `isFull()`: `top == capacity - 1`.

### 7. Invariant

> **Invariant:** At all times, `arr[0..top]` (inclusive) holds exactly the current stack contents in push order, with `arr[top]` being the most-recently-pushed, next-to-pop element. Indices beyond `top` are unused/stale.

This stays true after every push (we extend the valid range by one, at the new `top`) and every pop (we shrink it by one, abandoning the old `top` without erasing it — it's simply outside the valid range now).

### 8. Dry Run

| op | stack before (arr[0..top]) | operation | stack after | answer |
|---|---|---|---|---|
| `push(10)` | `[]`, top=-1 | `arr[0]=10`, top=0 | `[10]` | — |
| `push(20)` | `[10]`, top=0 | `arr[1]=20`, top=1 | `[10,20]` | — |
| `push(30)` | `[10,20]`, top=1 | `arr[2]=30`, top=2 | `[10,20,30]` | — |
| `pop()` | `[10,20,30]`, top=2 | read arr[2], top=1 | `[10,20]` | **30** |
| `peek()` | `[10,20]`, top=1 | read arr[1] | `[10,20]` | **20** |

### 9. Why Does It Work?

Array indexing is direct memory access — O(1) regardless of how big the array is. Since push/pop *only ever* read or write `arr[top]`, and `top` is updated in the same operation, no other slot is ever touched, so nothing needs to be searched for or shifted. LIFO order falls out automatically: the most recently written index is, by construction, always the current `top`.

### 10. Java Code

```java
class ArrayStack {
    private int[] arr;
    private int top;
    private int capacity;

    public ArrayStack(int capacity) {
        this.capacity = capacity;
        this.arr = new int[capacity];
        this.top = -1; // empty
    }

    public boolean isEmpty() { return top == -1; }
    public boolean isFull()  { return top == capacity - 1; }

    public void push(int x) {
        if (isFull()) throw new RuntimeException("Stack Overflow");
        arr[++top] = x;      // advance top FIRST, then write
    }

    public int pop() {
        if (isEmpty()) throw new RuntimeException("Stack Underflow");
        return arr[top--];   // read, THEN pull top back
    }

    public int peek() {
        if (isEmpty()) throw new RuntimeException("Stack is empty");
        return arr[top];
    }
}
```

### 11. Complexity

**Time:** O(1) for every operation — a single index read/write, no traversal, no shifting.
**Space:** O(capacity) — fixed and pre-allocated, independent of how many elements are actually in use right now.

### 12. Edge Cases

- Pop/peek on empty (must guard — `top == -1` would otherwise read `arr[-1]`).
- Push on full (`isFull()` check).
- Single push then pop (returns to exactly empty).
- Capacity of 0 or 1.

### 13. Common Mistakes

- **`arr[top++] = x` instead of `arr[++top] = x`.** With `top` starting at `-1`, post-increment writes to `arr[-1]` first (crash), *then* advances `top`. Pre-increment advances first, so the write lands in a valid slot. This exact off-by-one is the single most common bug in this problem.
- **`isFull()` checked as `top == capacity`** instead of `top == capacity - 1` — off-by-one, since valid indices only go up to `capacity - 1`.
- Forgetting `isEmpty()` guards before `pop()`/`peek()`.

### 14. Pattern to Remember

```text
Problem clue:  implement basic LIFO container with a raw array
Pattern:       Basic Stack Implementation
Data structure: array + top index
Stores:        raw values (no monotonic property here)
Push:          increment top, then write
Pop:           read at top, then decrement
Invariant:     arr[0..top] holds the stack; arr[top] = most recent
Key insight:   keep "top" at the END of the used region, not the front
Time / Space:  O(1) per op / O(capacity)
```

**Memory trick:** *"Top lives at the end, not the front — that's the whole trick."*

### 15. Interview Trigger

> If asked to implement a stack with a raw array, I immediately think: I need exactly one pointer, `top`, living at the *highest* used index — so push/pop never shift anything. Initialize `top = -1` for empty; push does `arr[++top] = x`; pop does `return arr[top--]`.

---

# 2. Implement Queue using Arrays

### 1. Problem Understanding

Build `enqueue`, `dequeue`, `front`, `isEmpty` (FIFO behavior) using a plain fixed-size array.

- **Input:** sequence of enqueue/dequeue/front calls.
- **Output:** results of dequeue/front.
- **Constraint:** known fixed capacity.
- **What makes this different from Problem 1:** a queue genuinely touches **both ends** — insert at the back, remove from the front. That single fact is the whole story of this problem.

### 2. How to Think About the Problem

**First instinct:** keep "front" pinned at index 0 (the simplest possible mental model). Enqueue writes at the next free slot; dequeue reads `arr[0]`, then **shifts everything left by one** so index 0 is still the front.

**Why might that be too slow?** Shifting is O(n) *per dequeue*, because every remaining element has to physically move — even though logically, nothing about the data itself required moving.

**What observation unlocks the better solution?** "Front" doesn't have to be a *fixed* index — it can be a **pointer that walks forward**. Then dequeue is just "read `arr[front]`, then `front++`" — zero data movement.

**But then:** after enough dequeues, `rear` eventually runs past the end of the array, even though slots at the *beginning* are free again (vacated by earlier dequeues). The fix: treat the array as **circular** — wrap indices with `% capacity` so freed space gets reused automatically.

### 3. Pattern Recognition

**Problem clue:** FIFO + fixed-size raw array.
**Pattern:** Basic Queue Implementation (circular buffer).
**Why this pattern:** two ends both matter, unlike a stack.
**Mental model:** two pointers walking around a circular track.
**Similar problems:** Problem 6 (Queue via Linked List) needs the same "track both ends" thinking, but no wraparound arithmetic, since a linked list can just grow.
**Recognizing this elsewhere:** any time you need O(1) FIFO on top of a *fixed-size* array without a linked list, "circular buffer" is the keyword to reach for.

### 4. Brute Force

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

**Why is brute force too slow?** Every `dequeue()` re-shifts the *entire* remaining array, even though only one element (the front) logically needed to be removed. Dequeue `n` times in a row and total shifting work is `n + (n-1) + (n-2) + ... ≈ O(n²)` for what should be `n` O(1) operations. The repeated work is: *re-copying elements that were already correctly placed, purely to keep "front" pinned at index 0.*

### 5. Observation

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

### 6. Optimal Approach

Keep `front`, `rear`, and `size` (size disambiguates "empty" from "full," since both can otherwise look like `front == rear`).

- Initial: `front = 0`, `rear = -1`, `size = 0`.
- `enqueue(x)`: `rear = (rear + 1) % capacity`; `arr[rear] = x`; `size++`.
- `dequeue()`: read `arr[front]`; `front = (front + 1) % capacity`; `size--`.

### 7. Invariant

> **Invariant:** At all times, the `size` valid elements occupy the circular range starting at index `front` and proceeding forward (wrapping via `% capacity`) for `size` steps. `front` always points at the oldest element (if any); `rear` always points at the most recently added element (if any).

### 8. Dry Run (capacity = 3)

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

### 9. Why Does It Work?

The `% capacity` operation makes index arithmetic "wrap" once it passes the last valid index, so slots freed by earlier dequeues get reused automatically — no searching for free space required. The invariant guarantees that whenever `size < capacity`, the slot `(rear + 1) % capacity` is *always* free, because it's exactly the slot that's `size` steps ahead of `front`, and everything from `front` for `size` steps is the only "occupied" region by definition.

### 10. Java Code

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

### 11. Complexity

**Time:** O(1) for every operation — one addition, one modulo, no traversal.
**Space:** O(capacity), fixed.

### 12. Edge Cases

- Empty dequeue/front. Full enqueue.
- `front`/`rear` wraparound crossing the array boundary (the dry run above hits this deliberately).
- Capacity of 1.

### 13. Common Mistakes

- **Using `front == rear` alone to distinguish empty from full** — both states can produce this, which is exactly why a `size` counter (or an equivalent "always leave one slot empty" convention) is necessary.
- **Forgetting the modulo** when advancing `front`/`rear` — they just run past the array end and crash.
- **Off-by-one in `isFull()`** — comparing against `capacity` incorrectly if `size` isn't tracked precisely.
- Assuming dequeue must be O(n) because of the naive version — no, that was purely a consequence of an implementation *choice* (pinning front at index 0), not a fundamental limitation of arrays.

### 14. Pattern to Remember

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

### 15. Interview Trigger

> If asked for a queue backed by a raw array, I think: two ends means two pointers. I'll let them wrap with `% capacity` so I never shift data, and I'll track `size` explicitly so `front == rear` doesn't ambiguously mean both "empty" and "full."

---

# 3. Implement Stack using Queue

### 1. Problem Understanding

Build stack `push`/`pop`/`top` using **only** queue operations (`enqueue`/`dequeue`) as primitives — no array indexing, no direct access to the middle.

- **Input:** sequence of push/pop/top calls.
- **Output:** results of pop/top.
- **Constraint:** internally, you may use one or two queues.
- **What makes this different:** you're forced to build LIFO behavior on top of a primitive (queue) that natively does the *opposite* (FIFO). Somewhere, an order must get reversed.

### 2. How to Think About the Problem

**What should I notice first?** `queue.poll()` always returns the *oldest* element. `stack.pop()` needs the *newest*. Direct conflict.

**What would I try first?** Pick ONE operation to make "expensive" (do reordering work there), so the other stays cheap and simple — this is a recurring theme in "implement A using B" problems.

**What observation unlocks the trick?** After enqueuing a new element to the back of a queue of size `k`, if you immediately dequeue-then-re-enqueue the `k - 1` elements that were sitting in front of it, the new element ends up at the **front**. From then on, `queue.peek()` gives the most-recently-pushed element — exactly what `stack.peek()`/`pop()` need.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`need LIFO from a FIFO primitive` → `rotating the queue right after insertion moves the newest element to the front` → `Stack ⟷ Queue Conversion` → `single queue` → `enqueue, then rotate (size − 1) times`.

### 3. Pattern Recognition

**Problem clue:** "implement X using only Y's operations."
**Pattern:** Stack ⟷ Queue Conversion.
**Why this pattern:** you must simulate one ADT's ordering with the other's native primitives.
**Mental model:** pick one operation to pay the reordering cost, so the other operation stays free.
**Similar problems:** Problem 4 is the exact mirror image (Queue using Stack).
**Recognizing this elsewhere:** any "implement A using only B's operations" question is really asking "what invariant on B's internal arrangement fakes A's external behavior?"

### 4. Brute Force

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

**Why is this too slow?** Every single `pop()` touches all `n` elements, even though only *one* of them (the last) is actually the answer — the other `n - 1` are moved purely to restore the queue to where it started.

### 5. Observation

Instead of paying this cost on **every pop**, pay a similar cost **once, on every push**, and get pop for free afterward: right after enqueueing the new element, rotate the *older* `size - 1` elements from front to back, one at a time. Since they were sitting in front of the new element, moving all of them behind it leaves the new element at the front.

### 6. Optimal Approach

Single queue.

- `push(x)`: enqueue `x` (lands at the back); let `rotations = current size − 1` (how many elements were there *before* `x`); repeat `rotations` times: dequeue the front element and immediately re-enqueue it. After this, `x` sits at the front.
- `pop()`: just dequeue — the front is guaranteed correct by the invariant.
- `top()`: just peek at the front.

### 7. Invariant

> **Invariant:** After every completed `push()` call, the queue's front-to-back order is exactly the *reverse* of insertion order — `queue.peek()` always equals the most-recently-pushed, not-yet-popped element.

### 8. Dry Run

| op | queue before | operation | queue after |
|---|---|---|---|
| `push(1)` | `[]` | enqueue 1, 0 rotations | `[1]` |
| `push(2)` | `[1]` | enqueue 2 → `[1,2]`, rotate 1 → move `1` to back | `[2,1]` |
| `push(3)` | `[2,1]` | enqueue 3 → `[2,1,3]`, rotate 2 → move `2`, then `1` | `[3,2,1]` |
| `pop()` | `[3,2,1]` | dequeue front | `[2,1]` → returns **3** |
| `pop()` | `[2,1]` | dequeue front | `[1]` → returns **2** |
| `push(5)` | `[1]` | enqueue 5 → `[1,5]`, rotate 1 → move `1` | `[5,1]` |
| `top()` | `[5,1]` | peek front | returns **5** |

### 9. Why Does It Work?

Rotating exactly `size − 1` elements after every push guarantees the newest element reaches the front, because that's precisely how many "older" elements existed ahead of it at that moment — no more, no less. Every push pays for its own reordering in full, so `pop`/`top` never need to do anything beyond a native O(1) queue operation.

### 10. Java Code

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

### 11. Complexity

**Time:** `push` is O(n) (up to `size − 1` rotations); `pop` and `top` are O(1). This is a deliberate trade-off, not a limitation — the reordering cost has to live *somewhere*, and this design puts it on push.
**Space:** O(n) for the underlying queue holding all elements.

### 12. Edge Cases

- Push/pop on an empty stack.
- Single-element stack.
- Many pushes then many pops interleaved (worth tracing by hand once to build confidence).

### 13. Common Mistakes

- **Rotating the wrong number of times** — using `size` instead of `size − 1` rotates the new element itself back to the rear, undoing the entire point.
- Forgetting this trades push's simplicity for pop's — some interviewers specifically want the *other* trade-off (two queues: O(1) push, O(n) pop by draining one queue into another to reach the bottom element). Know that alternative exists even if you lead with this one.
- Assuming `poll()` immediately followed by `offer()` is a single atomic step — it's two real operations, not free.

### 14. Pattern to Remember

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

### 15. Interview Trigger

> If asked to implement a Stack using only Queue operations, I think: I need one ADT's data arranged internally to fake the other's order. I'll make `push()` do the reordering — enqueue the new value, then rotate every older element from front to back exactly `size − 1` times — so the queue's own front is always my most recent push.

---

# 4. Implement Queue using Stack

### 1. Problem Understanding

Build queue `enqueue`/`dequeue`/`front` using **only** stack `push`/`pop` operations. The same "wrong native order" conflict as Problem 3, mirrored: a stack naturally gives LIFO, but we need FIFO.

### 2. How to Think About the Problem

**What should I notice first?** This is *structurally the same shape* as Problem 3, direction reversed.

**What would I try first?** Same idea — pick one operation to be "expensive," reorder there.

**The twist here:** with **two stacks**, reversing an order *twice* restores the original order — and this can be done far more cheaply than Problem 3's per-call rotation, because you only *need* to reverse when your "ready to dequeue" supply runs out, not on every single call.

**Clue → Observation → Pattern → Data Structure → Algorithm:**
`need FIFO from LIFO primitives` → `reversing twice restores the original order` → `Queue via two Stacks` → `inStack (arrivals) + outStack (departures)` → `push cheaply onto inStack always; only when outStack is empty, pour ALL of inStack into outStack (this reverses once); dequeue from outStack (this reverses again, restoring FIFO order)`.

### 3. Pattern Recognition

**Problem clue:** "implement Queue using only Stack operations."
**Pattern:** Stack ⟷ Queue Conversion (mirror of Problem 3).
**Why this pattern:** same "one ADT's ordering, faked using the other's primitives" idea.
**Mental model:** two stacks, reverse-then-reverse-again cancels out.
**Key contrast with Problem 3:** there, the reordering cost is paid on *every single push*. Here, it's paid in occasional big batches — which is why this version is normally preferred: it's **amortized** O(1), not worst-case O(n) on every call.

### 4. Brute Force

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

**Why is this too slow?** Every dequeue call redoes a *full* reversal-and-restoration, even for elements that were already correctly sorted into place by an earlier dequeue moments before. That earlier work is thrown away and repeated from scratch, every time.

### 5. Observation

Don't restore the order after dequeuing — **leave it reversed** as long as it's still usable! It only stops being usable once you've drained it completely and need fresh elements. So: only refill from the "arrivals" pile when the "departures" pile is *completely* empty. Each element then gets "flipped" from one pile to the other exactly once in its whole lifetime.

### 6. Optimal Approach

Two stacks: `inStack` (absorbs enqueues) and `outStack` (serves dequeues).

- `enqueue(x)`: always just `inStack.push(x)` — O(1), no exceptions, ever.
- `dequeue()`: if `outStack` is empty, pour *all* of `inStack` into `outStack` (pop from `inStack`, push to `outStack`, repeat until `inStack` is empty) — this reverses their order, so the oldest element (which was at the very bottom of `inStack`) ends up on **top** of `outStack`. Then `outStack.pop()`.

### 7. Invariant

> **Invariant:** At all times, `outStack` (top→bottom) holds the oldest still-pending elements in correct dequeue order, and `inStack` (top→bottom) holds the newer elements in reverse dequeue order. Every element lives in exactly one of the two stacks at any moment, and moves from `inStack` to `outStack` — reversing its position — exactly once in its entire lifetime.

### 8. Dry Run

| op | inStack | outStack | operation | answer |
|---|---|---|---|---|
| `enqueue(1,2,3)` | `[3,2,1]` (top=3) | `[]` | three pushes | — |
| `dequeue()` | `[3,2,1]` → `[]` | `[]` → `[3,2,1]` (top=1) | outStack empty → pour all of inStack, then pop | **1** |
| (state now) | `[]` | `[3,2]` (top=2) | | |
| `enqueue(4)` | `[4]` | `[3,2]` | push | — |
| `dequeue()` | `[4]` | `[3,2]` | outStack not empty → just pop | **2** |
| `dequeue()` | `[4]` | `[3]` | pop | **3** |
| `dequeue()` | `[4]` → `[]` | `[]` → `[4]` | outStack empty → pour inStack (just `4`), then pop | **4** |

### 9. Why Does It Work?

Reversing an order twice gives back the original order. `inStack` naturally reverses insertion order (most recent on top, as any stack does). Pouring it into `outStack` reverses it *again* — so `outStack` ends up in true FIFO order (oldest on top, ready to pop). As long as a pour only ever happens when `outStack` is completely empty, no element is ever mixed between "generations," so every element passes through exactly this reverse-then-reverse-again journey and comes out correctly ordered.

### 10. Java Code

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

### 11. Complexity

**Time:** `enqueue` is always O(1). `dequeue` is **amortized O(1)** — a single call *can* cost O(n) (when it triggers a pour), but pouring moves each element from `inStack` to `outStack` exactly once, ever, no matter how many enqueue/dequeue calls happen overall. Across any sequence of `m` operations, total pouring work is bounded by the total number of elements ever enqueued (≤ `m`), so spread across `m` calls, the average cost per call is O(1). This is the same "each element is touched a bounded number of times, total, across the whole run" argument used for the monotonic stack in Part 1 — just applied to a different structure.
**Space:** O(n) across both stacks combined.

### 12. Edge Cases

- Dequeue on completely empty (both stacks empty).
- Dequeue immediately after a pour vs. while `outStack` still has leftovers.
- Alternating single enqueue/dequeue pairs — worth tracing once to see that most calls are O(1) but not literally every single one.
- `front()`/`peek()` must also trigger a pour if needed, not just `dequeue()`.

### 13. Common Mistakes

- **Pouring from `inStack` to `outStack` even when `outStack` is not empty** — this interleaves old and new "generations" incorrectly and breaks the invariant permanently.
- Forgetting `front()` needs the same "pour if empty" check as `dequeue()`.
- Reporting worst-case O(1) instead of amortized O(1) — a good interviewer will ask "what's the worst case for one single call?" (answer: O(n)) and expects you to explain *why the average is still O(1)*.

### 14. Pattern to Remember

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

### 15. Interview Trigger

> If asked to implement a Queue using only Stack operations, I think: two stacks, because reversing an order twice cancels out. `inStack` absorbs enqueues cheaply. `outStack` serves dequeues cheaply — and I only ever refill `outStack` from `inStack` when `outStack` is completely empty, which guarantees each element is "flipped" exactly once in its lifetime, giving amortized O(1).

---

# 5. Implement Stack using Linked List

### 1. Problem Understanding

Same LIFO container as Problem 1, backed by a **singly linked list** instead of an array — no fixed capacity, grows/shrinks one node at a time.

**Key difference from the array version:** no resizing concerns and no capacity ceiling, but each element now carries pointer overhead (an object + a reference), and — crucially — a singly linked list is only cheap to modify at *one particular end*.

### 2. How to Think About the Problem

**What's cheap on a singly linked list?** Inserting/removing at the **head** is O(1) — you just rewire one pointer. Inserting/removing at the **tail** would require walking the whole list to find the node *before* the tail (a singly linked list has no "previous" pointer), which is O(n) — unless you maintain a separate tail pointer, and even then, *removing* from the tail is still O(n), because after removing it you'd need to find the *new* tail by walking from the head.

**The key realization:** a stack only ever needs *one* end — "the most recent thing." Since a linked list's head is exactly "whatever was most recently attached," the cheap end and the end we need are the *same* end. No cleverness required — just recognize it and use it directly.

### 3. Pattern Recognition

**Problem clue:** implement a stack "using a linked list."
**Pattern:** Basic Stack Implementation (same pattern as Problem 1, different storage).
**Mental model:** top = head, always, full stop.
**Similar problems:** Problem 1 (identical external behavior); Problem 6 (Queue via Linked List) is the contrast — a queue is forced to touch *both* ends, needing head **and** tail pointers.

### 4. Brute Force

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

### 5. Observation

The lesson here is the mirror image of Problem 2's: instead of a clever fix, recognize that the *cheap* end (head) already matches the end we actually need for LIFO ("top"). No wraparound trick, no auxiliary pointer — just use head directly as top.

### 6. Optimal Approach

Singly linked list with a `head` reference only — no tail pointer needed, because we never touch the tail.

- `push(x)`: create a new node; `newNode.next = head`; `head = newNode`.
- `pop()`: save `head.data`; `head = head.next`; return the saved value.
- `peek()`: `head.data`. `isEmpty()`: `head == null`.

### 7. Invariant

> **Invariant:** `head` always points at the most-recently-pushed, not-yet-popped node, and following `.next` pointers from `head` visits the remaining stack contents in exact "most recent first" order.

### 8. Dry Run

| op | list before | operation | list after |
|---|---|---|---|
| `push(10)` | `null` | new node, `next=null`, `head=`it | `10 → null` |
| `push(20)` | `10 → null` | new node, `next=`old head, `head=`it | `20 → 10 → null` |
| `push(30)` | `20→10→null` | same | `30 → 20 → 10 → null` |
| `pop()` | `30→20→10→null` | save 30, `head = head.next` | `20 → 10 → null` → returns **30** |
| `peek()` | `20→10→null` | read `head.data` | unchanged → returns **20** |

### 9. Why Does It Work?

A linked list's head is the one place where insertion/removal never requires knowing about, or touching, any *other* node — only `head` itself and the new/old node's `.next` are ever rewired. Since LIFO only ever needs "the most recent thing," and `head` *is*, by construction, "whatever was inserted most recently and hasn't been removed," the two line up perfectly with zero extra bookkeeping.

### 10. Java Code

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

### 11. Complexity

**Time:** O(1) for every operation — only `head` (and, for push, one new node's `.next`) is ever touched, never a traversal.
**Space:** O(n) total across all elements, no pre-allocated capacity like the array version — grows/shrinks exactly one node per operation, but each node carries extra overhead (object header + pointer) versus the array version's bare `int`.

### 12. Edge Cases

- Pop/peek on empty (`head == null` → guard, or you'll get a `NullPointerException`).
- Single element (push then pop returns cleanly to empty).
- Very long chains — no capacity ceiling like Problem 1, but real memory is still finite.

### 13. Common Mistakes

- **Setting `head = newNode` *before* wiring `newNode.next = head`** — this loses the reference to the old head entirely, since you overwrote `head` before reading its old value into `newNode.next`. Order matters.
- Forgetting the `isEmpty()`/null check before dereferencing `head.data`.
- Trying to *also* maintain a `tail` pointer "just in case" — unnecessary for a stack, and a common instinct wrongly carried over from queue implementations (see Problem 6).

### 14. Pattern to Remember

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

### 15. Interview Trigger

> If asked for a stack using a linked list, I immediately think: top = head, nothing else needed. Push wires the new node's `next` to the current head *then* updates head; pop reads `head.data` *then* advances head to `head.next`. No tail pointer, no traversal, ever.

---

# 6. Implement Queue using Linked List

### 1. Problem Understanding

FIFO container via linked list. Unlike Problem 5's stack (which only ever needs `head`), a queue's two ends genuinely do different jobs — insert at the back, remove from the front — so both must be tracked.

### 2. How to Think About the Problem

**What's cheap on a singly linked list?** Removing from **head**: O(1), always. Inserting at **tail**: O(1) *if* you maintain a tail pointer (otherwise O(n), walking from head to find it every time). Removing from the tail: O(n), always (no `previous` pointer) — so we must never need to do that.

Since FIFO removes from the front and adds at the back, and removal-from-front is the operation that's cheap "for free," let `front = head` (the removal side), and make insertion cheap too by explicitly tracking `tail` (the insertion side) with its own pointer.

### 3. Pattern Recognition

**Problem clue:** FIFO + "using a linked list."
**Pattern:** Basic Queue Implementation (same contract as Problem 2, different storage).
**Key structural contrast with Problem 5:** a stack needs *one* pointer (`head`), because both its operations happen at the same end. A queue needs *two* pointers (`head` and `tail`), because its two operations happen at opposite ends.

### 4. Brute Force

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

### 5. Observation

Just remember where the tail is instead of re-finding it: maintain a `tail` reference alongside `head`, and update it in O(1) on every enqueue — the new node *is* the new tail, by definition, the moment it's attached.

### 6. Optimal Approach

`head` and `tail` pointers.

- `enqueue(x)`: create `newNode`; if the queue is empty, `head = tail = newNode`; otherwise `tail.next = newNode`, then `tail = newNode`.
- `dequeue()`: save `head.data`; `head = head.next`; **if `head` becomes `null`, also set `tail = null`** — otherwise `tail` would dangle, pointing at a node that's no longer reachable from `head`.

### 7. Invariant

> **Invariant:** `head` always points to the oldest not-yet-dequeued node (the front); `tail` always points to the most-recently-enqueued node (the back); following `.next` from `head` reaches `tail` in exact FIFO order. When the queue is empty, **both** `head` and `tail` are `null`.

### 8. Dry Run

| op | list before | operation | list after |
|---|---|---|---|
| `enqueue(1)` | empty | `head = tail =` new node | `1` (head=tail) |
| `enqueue(2)` | `1` | `tail.next = 2`, `tail = 2` | `1 → 2` |
| `enqueue(3)` | `1→2` | `tail.next = 3`, `tail = 3` | `1 → 2 → 3` |
| `dequeue()` | `1→2→3` | save 1, `head = head.next` | `2 → 3` → returns **1** |
| `dequeue()` | `2→3` | save 2, `head = head.next` | `3` (head=tail=3) → returns **2** |
| `dequeue()` | `3` | save 3, `head = head.next = null` → **also `tail = null`** | empty → returns **3** |

### 9. Why Does It Work?

Because `tail` is updated at the *exact* moment a new tail node is created (during enqueue itself), we never need to search for it later — the invariant guarantees correctness without ever re-deriving it. And because removal only ever happens at `head` (the one end that's naturally cheap to shrink from on a singly linked list), dequeue never needs a `previous` pointer.

### 10. Java Code

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

### 11. Complexity

**Time:** O(1) for every operation, thanks to the maintained `tail` pointer.
**Space:** O(n), no capacity ceiling (unlike Problem 2), with extra per-node pointer overhead.

### 12. Edge Cases

- Dequeue down to exactly one element, then dequeue again — must correctly null out `tail` too.
- Enqueue on an empty queue — both `head` and `tail` must become the new node.
- Dequeue/front on empty.

### 13. Common Mistakes

- **Forgetting to reset `tail = null` when the last element is dequeued.** This is the classic bug: `tail` keeps pointing at a node that's no longer reachable from `head`, and the *next* enqueue silently attaches the new node to that orphaned node instead of extending the real list — so the new element becomes unreachable from `head` and effectively disappears.
- Confusing which pointer moves on which operation — `head` moves on dequeue, `tail` moves on enqueue, never the other way.

### 14. Pattern to Remember

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

### 15. Interview Trigger

> If asked for a queue using a linked list, I think: one pointer per end — `head` for removal (the naturally cheap side of a singly linked list), `tail` for insertion (made cheap by tracking it explicitly). The one detail I make a point of not forgetting: when the last element is dequeued, both `head` **and** `tail` must become `null`.

---

# 7. Balanced Parentheses

### 1. Problem Understanding

Given a string of brackets — possibly several types, `()`, `[]`, `{}` — determine whether every opening bracket has a matching closing bracket, in the correct nested order (not just equal *counts*).

- **Input:** a string of bracket characters (sometimes mixed with other characters to ignore).
- **Output:** boolean.
- **Important observation:** "correct order" is the whole problem. `"([)]"` has equal counts of every bracket type but is **not** balanced, because the brackets cross instead of nesting.

Example: `"{[()]}"` → `true`. `"{[(])}"` → `false`.

### 2. How to Think About the Problem

**What should I notice first?** The word "nested," or just visualizing brackets inside brackets.

**What clue matters?** When a *closing* bracket arrives, which opening bracket must it match? Answer: the most recently opened one that hasn't been closed yet — because valid brackets must nest, never cross.

**What would I try first (before knowing the trick)?** Count opens and closes of each type separately, and check the counts are equal.

**Why is that wrong (not just slow)?** It only checks *quantity*, never *order*. It happily accepts `"([)]"` as balanced, which is actually invalid. This isn't a speed problem — the brute-force idea can't even represent the concept of nesting, so no amount of optimizing it fixes it. A genuinely different data structure is needed: one that remembers *order*, not just counts.

**What observation unlocks the real solution?** "The most recently opened, still-unclosed bracket" is precisely what a stack's top gives you, automatically. Push every opener; when a closer arrives, it *must* match the top of the stack right now — if it doesn't, the string is unbalanced, immediately.

### 3. Pattern Recognition

**Problem clue:** matching / nesting / open–close pairs.
**Pattern:** Stack — Matching.
**Why this pattern:** correct nesting means "most recently opened, first closed" — LIFO by definition.
**Mental model:** the stack *is* your live record of "still open, waiting to be closed."
**Similar problems:** any "valid X" problem about nested structure — valid HTML/XML tags, path simplification, matching in a compiler/parser.
**Recognizing this elsewhere:** whenever a problem says "valid" and gives you paired tokens (opening/closing, start/end, begin/end), think stack immediately.

### 4. Brute Force

The "count only" idea:

```java
// WRONG — counts only, ignores order entirely
boolean countOnly(String s) {
    int round = 0, square = 0, curly = 0;
    for (char c : s.toCharArray()) {
        if (c == '(') round++;  else if (c == ')') round--;
        else if (c == '[') square++; else if (c == ']') square--;
        else if (c == '{') curly++;  else if (c == '}') curly--;
    }
    return round == 0 && square == 0 && curly == 0;
}
```

**Why is this wrong?** It passes `"([)]"` as balanced (all three counters end at 0), which is actually invalid. This isn't fixable by optimizing — the approach fundamentally cannot represent "order," only "quantity."

### 5. Observation

An unclosed opening bracket's *identity* matters, and specifically, only the **most recent** unclosed one is allowed to match the next closer. That's a LIFO relationship — exactly what a stack tracks natively.

### 6. Optimal Approach

Push every opening bracket onto a stack. On a closing bracket: if the stack is empty, there's nothing for it to match — unbalanced. Otherwise pop the top and check it's the correct matching opener; if not, unbalanced. At the end, the stack must be completely empty (no leftover unclosed openers).

### 7. Invariant

> **Invariant:** While scanning left to right, the stack (bottom→top) always holds exactly the sequence of opening brackets seen so far that have *not yet* been matched by a closer, in the order they were opened — so the top is always the most recently opened, still-unresolved bracket.

### 8. Dry Run — `"{[()]}"`

| i | char | stack before | operation | stack after |
|---|---|---|---|---|
| 0 | `{` | `[]` | push | `[{]` |
| 1 | `[` | `[{]` | push | `[{,[]` |
| 2 | `(` | `[{,[]` | push | `[{,[,(]` |
| 3 | `)` | `[{,[,(]` | pop `(`, matches `)` ✓ | `[{,[]` |
| 4 | `]` | `[{,[]` | pop `[`, matches `]` ✓ | `[{]` |
| 5 | `}` | `[{]` | pop `{`, matches `}` ✓ | `[]` |
| end | — | `[]` | stack empty → **balanced** | — |

For `"{[(])}"`: at position `)`, the stack top is `[` (not `(`) — the check fails immediately (popped `[`, needed `(` for `)`) → return `false` right there, without scanning further.

### 9. Why Does It Work?

Valid brackets must nest, never cross — so the only opener a given closer is ever allowed to match is the innermost one still open. "Innermost still open" is mathematically identical to "most recently pushed, not yet popped," which a stack gives you automatically, with zero extra bookkeeping. If a closer ever needs to reach past the top of the stack to find its match, that's precisely what "not balanced" means.

### 10. Java Code

```java
boolean isBalanced(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') {
            stack.push(c);
        } else if (c == ')' || c == ']' || c == '}') {
            if (stack.isEmpty()) return false;   // closer with nothing open
            char open = stack.pop();              // unbox to primitive char — see Common Mistakes
            if ((c == ')' && open != '(') ||
                (c == ']' && open != '[') ||
                (c == '}' && open != '{')) {
                return false;                      // wrong type matched
            }
        }
        // any other character is simply ignored
    }
    return stack.isEmpty();  // no leftover unclosed openers
}
```

### 11. Complexity

**Time:** O(n) — every character is pushed at most once and popped at most once (a simpler version of the same "bounded total touches" argument used for the monotonic stack in Part 1).
**Space:** O(n) worst case — e.g. a string of nothing but opening brackets pushes everything with nothing ever popped.

### 12. Edge Cases

- Empty string → balanced, vacuously (stack starts and ends empty).
- Only openers, e.g. `"((("` → stack non-empty at the end → `false`.
- Only closers, e.g. `")))"` → first closer hits an empty stack → `false`.
- Single pair `"()"` → `true`.
- Mismatched types, e.g. `"(]"` → `false`.
- Other characters interleaved, e.g. `"a(b)c"` — decide whether to ignore them (usually yes, per problem statement).

### 13. Common Mistakes

- **Comparing popped `Character` objects with `!=`.** `Deque<Character>` stores boxed `Character`s; `!=` between two boxed objects compares *references*, not values. It happens to "work" for ASCII brackets only because Java's `Character` cache covers that range — but that's fragile, not correct reasoning. Unbox to a primitive `char` (as done above: `char open = stack.pop();`) before comparing.
- Forgetting the empty-stack check before popping on a closer — crashes on inputs like `")"`.
- Forgetting the final `stack.isEmpty()` check — misses inputs like `"((("` that never had a mismatched closer, just leftover openers.
- Building a fresh matching-pairs map inside the loop instead of outside it — works, just wasteful.

### 14. Pattern to Remember

```text
Problem clue:  "valid"/"balanced" + paired opening/closing tokens
Pattern:       Stack — Matching
Data structure: stack of characters (openers)
Stores:        opening brackets not yet closed
Push:          on every opener
Pop:           on every closer — must match the top, or it's invalid
Invariant:     stack (bottom->top) = still-open brackets, in open order
Key insight:   "innermost still open" IS "top of stack" — no bookkeeping needed
Time / Space:  O(n) / O(n)
```

**Memory trick:** *"The closer must match whoever opened most recently — that's the stack's top, always."*

### 15. Interview Trigger

> The instant I see "valid parentheses/brackets/tags," I think: I need to know what's still open, specifically the *most recent* still-open thing — that's a stack. Push openers. On a closer, it must match the top of the stack exactly, or it's invalid. At the end, nothing may be left unclosed.

---

# 8. Implement Min Stack

### 1. Problem Understanding

Build a stack that supports `push`/`pop`/`top` **and** `getMin()`, all in true O(1) — not amortized, every single call, including `getMin()`.

- **Input:** sequence of push/pop/getMin calls.
- **Output:** results of pop/top/getMin.
- **Constraint:** O(1) `getMin()` rules out "just scan the stack for the minimum," which would be O(n).
- **What makes this different from earlier problems:** we need to track something *derived* from the stack's contents (the running minimum), and that derived value must update correctly as elements come and go — including, specifically, when the current minimum itself gets popped.

### 2. How to Think About the Problem

**What should I notice first?** "O(1) `getMin`" is the whole challenge. The tricky moment is: what's the new minimum *after* popping the element that currently holds the minimum?

**What would I try first?** A single `min` variable, updated on every push: `min = Math.min(min, x)`.

**Why does that break?** The moment that minimum value gets popped, there's no way to know what the "second smallest so far" was — that information was thrown away when we only kept a single number.

**What observation unlocks the fix?** Don't keep only *one* min value — keep the **full history** of "what was the minimum at each point in time," synchronized with the main stack, so popping the main stack can always "rewind" the minimum to exactly what it correctly was one step earlier.

### 3. Pattern Recognition

**Problem clue:** "design a stack that also supports X in O(1)," where X is some running aggregate (min, max, etc.).
**Pattern:** Augmented Stack (an auxiliary stack tracks extra state).
**Why this pattern:** any value derived from "everything currently in the stack" needs to update/rewind in perfect lockstep with push/pop — a second stack, pushed and popped at exactly the same moments as the first, does this automatically.
**Mental model:** two stacks moving in lockstep — one holding the raw values, one holding "the answer to `getMin()` at this exact depth."
**Similar problems:** Max Stack (identical, mirrored). This "shadow stack" idea also shows up in variants of monotonic-stack problems that need to track more than one thing per entry.
**Recognizing this elsewhere:** any time you need an O(1) running aggregate that must correctly "undo" itself on pop, think: a second, parallel stack.

### 4. Brute Force

A single `min` variable with no history:

```java
// WRONG — cannot recover the old minimum once the current one is popped
class BrokenMinStack {
    Deque<Integer> stack = new ArrayDeque<>();
    int min = Integer.MAX_VALUE;
    void push(int x) { stack.push(x); min = Math.min(min, x); }
    int pop() { return stack.pop(); }   // min is never corrected here
    int getMin() { return min; }         // stale after the true min is popped
}
```

**Why is this wrong?** `push(5)`, `push(2)`, `push(8)` → `min` correctly tracks down to `2`. `pop()` removes `8` — fine, `min` is still validly `2`. But `pop()` *again* removes `2` — the actual minimum — and `min` is never updated on pop, so `getMin()` keeps wrongly returning `2` even though only `5` remains. Fixing this by rescanning the whole stack on every pop would work, but costs O(n) per pop, violating the O(1) requirement.

### 5. Observation

The only way to know "what was the minimum right before I pushed the element I'm about to pop" *without* rescanning is to have **recorded it at push time.** So record it — on *every* push, not just when a new minimum happens — by pushing the "minimum so far" onto a second, parallel stack. Popping the main stack then also pops the parallel stack, automatically rewinding the minimum to exactly what it was one push earlier.

### 6. Optimal Approach

Two stacks: `mainStack` (actual values) and `minStack` (running minimum at each depth).

- `push(x)`: push `x` onto `mainStack`; push `min(x, minStack.isEmpty() ? x : minStack.peek())` onto `minStack`.
- `pop()`: pop **both** stacks together — always in lockstep, no exceptions.
- `getMin()`: `minStack.peek()` — O(1), no computation at read time; all the work already happened at push time.

### 7. Invariant

> **Invariant:** At every moment, for any depth `k`, `minStack`'s value at depth `k` equals the true minimum of `mainStack`'s bottom `k` elements. Both stacks always have exactly the same size, and always grow/shrink together.

### 8. Dry Run

| op | mainStack | minStack | getMin() |
|---|---|---|---|
| `push(5)` | `[5]` | `[5]` | — |
| `push(3)` | `[5,3]` | `[5,3]` (3 < 5) | — |
| `push(7)` | `[5,3,7]` | `[5,3,3]` (min(7,3)=3, unchanged) | — |
| `push(2)` | `[5,3,7,2]` | `[5,3,3,2]` | **2** |
| `pop()` | `[5,3,7]` | `[5,3,3]` | **3** |
| `pop()` | `[5,3]` | `[5,3]` | **3** |

### 9. Why Does It Work?

Because `minStack` records the minimum-so-far at **every** depth — not just at the moments it changes — popping it in perfect lockstep with `mainStack` always exposes exactly the correct minimum for whatever elements remain. Nothing is ever "forgotten," because nothing was thrown away; it was duplicated forward at every push instead.

### 10. Java Code

```java
class MinStack {
    private Deque<Integer> mainStack = new ArrayDeque<>();
    private Deque<Integer> minStack = new ArrayDeque<>();

    public void push(int x) {
        mainStack.push(x);
        // record the running minimum AT THIS DEPTH — every single push, not just on a new min
        if (minStack.isEmpty() || x <= minStack.peek()) {
            minStack.push(x);
        } else {
            minStack.push(minStack.peek());
        }
    }

    public void pop() {
        mainStack.pop();
        minStack.pop();   // ALWAYS pop both together — this is what "rewinds" the min
    }

    public int top()    { return mainStack.peek(); }
    public int getMin() { return minStack.peek(); } // O(1) — no scanning, ever
}
```

### 11. Complexity

**Time:** O(1) for every operation, including `getMin()` — that's the entire point of the problem.
**Space:** O(n), roughly double a plain stack, since `minStack` duplicates one integer per element regardless of whether the minimum actually changed at that step. *(A further space-optimized version only pushes to `minStack` when a genuinely new minimum is set, using counts to handle ties — worth knowing it exists, but the two-stack version above is the standard, safest interview answer.)*

### 12. Edge Cases

- `getMin()` on an empty stack — undefined; state your convention.
- Duplicate minimum values pushed multiple times (see Common Mistakes — this is where `<=` vs `<` matters).
- Popping down to empty and pushing again — both stacks must return to empty together.
- Single element.

### 13. Common Mistakes

- **Using strict `<` instead of `<=`** when comparing `x` to `minStack.peek()`. If you push the *current* minimum value again (a duplicate) and use strict `<`, you won't duplicate it onto `minStack` — and a later pop of *one* of those duplicate copies will incorrectly pop the recorded minimum away too early, even though another copy of that same value is still logically sitting in the stack.
- **Popping only one of the two stacks** (or in the wrong order) — they must move in lockstep, always, or the invariant breaks permanently.
- Trying to save space by only pushing to `minStack` "when the min changes," without also correctly handling pop for that scheme — it *can* be done, but needs extra bookkeeping; don't attempt it under interview pressure unless specifically asked to optimize further.

### 14. Pattern to Remember

```text
Problem clue:  stack that also needs O(1) getMin/getMax
Pattern:       Augmented Stack (auxiliary "shadow" stack)
Data structure: mainStack (values) + minStack (running min at each depth)
Stores:        minStack stores the min-so-far, recorded at EVERY push
Push:          push x to main; push min(x, current min) to minStack
Pop:           pop BOTH, always together
Invariant:     minStack[k] = true min of mainStack's bottom k elements
Key insight:   record history at push time so pop needs no recomputation
Time / Space:  O(1) per op / O(n) (roughly double a plain stack)
```

**Memory trick:** *"A second stack, marching in lockstep, remembers the min at every depth — so popping can never forget it."*

### 15. Interview Trigger

> If asked for O(1) `getMin`/`getMax` alongside a normal stack, I immediately think: one stack isn't enough, because popping can "un-happen" the current best answer. I keep a second, parallel stack that records the running min at every depth — pushed in lockstep with every push (even when the min doesn't change), popped in lockstep with every pop — so `getMin()` is always just a peek, never a search.

---

## Pattern Connections Recap (Problems 1–8)

- **Problems 1 & 5** are the *same* pattern (Basic Stack) on two different backing stores — array (fixed capacity, no pointer overhead) vs. linked list (no capacity ceiling, pointer overhead per node).
- **Problems 2 & 6** are the *same* pattern (Basic Queue) similarly split — array needs the circular-buffer trick specifically *because* it's fixed-size; a linked list sidesteps that by just growing, but pays for it with a `tail` pointer a stack never needs.
- **Problems 3 & 4** are exact mirror images of each other (Stack ⟷ Queue Conversion): #3 pays its reordering cost on every `push`; #4 pays it in occasional amortized batches. Interviewers sometimes ask for the *other* trade-off on each — know both directions exist for both problems.
- **Problem 7** is the first problem where the stack isn't just "the container the problem describes" — it's a *tool* you reach for because of a structural clue (nesting) in a differently-shaped problem.
- **Problem 8** introduces the "shadow stack" idea (a second stack tracking derived state in lockstep) — you'll see this idea again in a lighter form once we reach monotonic-stack problems that need to track more than one thing per entry.

---

**Next:** [`04_problems_09to14_expression_conversions.md`](04_problems_09to14_expression_conversions.md) — the six infix/prefix/postfix conversions, which are really just two patterns wearing six costumes.
