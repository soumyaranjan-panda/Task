# 1. Implement Stack Using Arrays

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/implement-stack-using-arrays) · [Article](https://takeuforward.org/data-structure/implement-stack-using-array/) · [Video](https://youtu.be/tqQ5fTamIN4?si=ofLt8Zt1ZvhikZ6w)

## 1. Problem Understanding

Build `push`, `pop`, `peek`, `isEmpty` (LIFO behavior) using a **plain fixed-size array** as the only storage — no built-in `Stack`/`Deque`/`ArrayList`.

- **Input:** a sequence of operations (`push x`, `pop`, `peek`, `isEmpty`).
- **Output:** the results of `pop`/`peek` calls.
- **Constraint:** a known maximum capacity.
- **Observation:** an array gives O(1) access to *any* index — we just need one variable that always tells us "where does the used part of the array currently end?"

Example: `push(10) → push(20) → push(30) → pop()` should return `30`.

```text
push(10) -> push(20) -> push(30)

index:   0     1     2     3
       +-----+-----+-----+-----+
       | 10  | 20  | 30  |     |
       +-----+-----+-----+-----+
                       ^
                      top
```

**Figure 1 —** `top` marks the end of the used region, not the front.

## 2. How to Think About the Problem

**What should I notice first?** The problem only ever touches *one end*. That means I need exactly one piece of bookkeeping: a pointer to "the end."

**What would I try first?** Use an array plus an integer `top` marking the current end of the used region.

**Clue → Observation → Pattern → Data Structure → Algorithm:**

`push/pop only touch one end` → `an array index can act as "the end" pointer` → `Basic Stack Implementation` → `array + top index` → `increment top then write on push; read then decrement top on pop`.

This problem has no "trick" beyond that — it *is* the foundational pattern every later problem's stack is built out of (whether hand-rolled like here, or `ArrayDeque` under the hood).

## 3. Pattern Recognition

**Problem clue:** only one end is ever touched; the problem literally says "stack."
**Pattern:** Basic Stack Implementation.
**Why this pattern:** LIFO is given directly by the problem name.
**Mental model:** array + a single pointer marking "how full am I."
**Similar problems:** Problem 5 (Stack using Linked List) — identical external behavior, different internal storage.

## 4. Brute Force

There's a genuine naive-but-wrong-headed instinct here: pin `top` at **index 0** (thinking of "top" as "the front of the array"), and shift every element on every push/pop to keep it there.

```java
// Naive: insists the top must live at index 0
void pushNaive(int[] arr, int size, int x) {
    for (int i = size; i > 0; i--) arr[i] = arr[i - 1]; // shift everyone right
    arr[0] = x;
}
```

**Why is this too slow?** Every push re-copies the *entire* current contents, purely because of an arbitrary decision that index 0 must always hold the top. The data itself never needed to move — only our choice of "where top lives" forced it to.

## 5. Observation

The top doesn't have to live at a fixed index. If we let it live at the **highest used index** instead, insertion/removal there touches exactly one slot, because nothing else needs to shift out of the way.

```text
push -> arr[++top] = value
pop  -> arr[top--]        (read, then pull top back)
```

No shifting is needed.

## 6. Optimal Approach

Array + `top` index, starting at `-1` (empty).

- `push(x)`: increment `top`, then write `arr[top] = x`.
- `pop()`: read `arr[top]`, then decrement `top`.
- `peek()`: read `arr[top]`.
- `isEmpty()`: `top == -1`. `isFull()`: `top == capacity - 1`.

## 7. Invariant

> **Invariant:** At all times, `arr[0..top]` (inclusive) holds exactly the current stack contents in push order, with `arr[top]` being the most-recently-pushed, next-to-pop element. Indices beyond `top` are unused/stale.

This stays true after every push (we extend the valid range by one, at the new `top`) and every pop (we shrink it by one, abandoning the old `top` without erasing it — it is simply outside the valid range now).

## 8. Dry Run

| op | stack before (arr[0..top]) | operation | stack after | answer |
|---|---|---|---|---|
| `push(10)` | `[]`, top=-1 | `arr[0]=10`, top=0 | `[10]` | — |
| `push(20)` | `[10]`, top=0 | `arr[1]=20`, top=1 | `[10,20]` | — |
| `push(30)` | `[10,20]`, top=1 | `arr[2]=30`, top=2 | `[10,20,30]` | — |
| `pop()` | `[10,20,30]`, top=2 | read arr[2], top=1 | `[10,20]` | **30** |
| `peek()` | `[10,20]`, top=1 | read arr[1] | `[10,20]` | **20** |

## 9. Why Does It Work?

Array indexing is direct memory access — O(1) regardless of how big the array is. Since push/pop *only ever* read or write `arr[top]`, and `top` is updated in the same operation, no other slot is ever touched, so nothing needs to be searched for or shifted. LIFO order falls out automatically: the most recently written index is, by construction, always the current `top`.

## 10. Java Code

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

## 11. Complexity

**Time:** O(1) for every operation — a single index read/write, no traversal, no shifting.
**Space:** O(capacity) — fixed and pre-allocated, independent of how many elements are actually in use right now.

## 12. Edge Cases

- Pop/peek on empty (must guard — `top == -1` would otherwise read `arr[-1]`).
- Push on full (`isFull()` check).
- Single push then pop (returns to exactly empty).
- Capacity of 0 or 1.

## 13. Common Mistakes

- **`arr[top++] = x` instead of `arr[++top] = x`.** With `top` starting at `-1`, post-increment writes to `arr[-1]` first (crash), *then* advances `top`. Pre-increment advances first, so the write lands in a valid slot. This exact off-by-one is the single most common bug in this problem.
- **`isFull()` checked as `top == capacity`** instead of `top == capacity - 1` — off-by-one, since valid indices only go up to `capacity - 1`.
- Forgetting `isEmpty()` guards before `pop()`/`peek()`.
- Initializing `top` to `0` instead of `-1` (then the first element overwrites index 0 and "empty" is ambiguous).

## 14. Pattern to Remember

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

## 15. Interview Trigger

> If asked to implement a stack with a raw array, I immediately think: I need exactly one pointer, `top`, living at the *highest* used index — so push/pop never shift anything. Initialize `top = -1` for empty; push does `arr[++top] = x`; pop does `return arr[top--]`.

## Related Problems

- [05-Implement-Stack-Using-Linked-List.md](05-Implement-Stack-Using-Linked-List.md) — same LIFO contract, dynamic storage.
- [02-Implement-Queue-Using-Arrays.md](02-Implement-Queue-Using-Arrays.md) — the two-ended sibling of this one-ended container.

## See also

- [03-Implement-Stack-Using-Queue.md](03-Implement-Stack-Using-Queue.md)
- [07-Balanced-Parentheses.md](07-Balanced-Parentheses.md)
