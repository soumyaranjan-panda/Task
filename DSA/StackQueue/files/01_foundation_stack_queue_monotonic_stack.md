# Stack & Queue Interview Guide — Part 1: Foundations

**Guide map:** `00_START_HERE.md` → **`01_foundation...md`** (you are here) → `02_universal_thinking_framework.md` → `03_problems_01to08...md` → `04_problems_09to14...md` → (more coming)

This file builds the mental toolkit you'll reuse for every problem in this guide. Read it once, properly — everything else leans on it.

---

## 1. Stack — One Page

### What a stack actually is

A stack is a data structure where you can only add or remove elements from **one end**, called the **top**. Picture a stack of plates: you place a new plate on top, and when you need a plate, you take the top one. You never pull one from the middle without first removing everything above it.

That one rule — "only touch the top" — is the entire definition. Everything else follows from it.

### LIFO — Last In, First Out

Because you can only add/remove at the top, whatever you placed most recently is the first thing you get back. This is called **LIFO**.

```
push(1)  push(2)  push(3)      pop() → 3      pop() → 2      pop() → 1

  [3]                           
  [2]        [3] out             [2] out          [1] out
  [1]        [2]                  [1]               [ ]
  ---        [1]                  ---
             ---
```

### Why LIFO is useful

LIFO is exactly the behavior you need whenever **"the most recent thing must be dealt with first."**

- **Undo** in an editor — the last edit you made is the first one undo reverses.
- **Function calls** — if `A()` calls `B()` calls `C()`, then `C` finishes first, then `B`, then `A`. This "reverse order of entry" unwinding is literally how your program's call stack works.
- **Backtracking** — when a path fails, you back up to the *most recent* decision point, not the first one.
- **Anything nested** — the innermost layer must close before the outer layer can.

### Core operations

| Operation | What it does | Time |
|---|---|---|
| `push(x)` | add `x` to the top | O(1) |
| `pop()` | remove and return the top element | O(1) |
| `peek()` / `top()` | look at the top element without removing it | O(1) |
| `isEmpty()` | check if the stack has no elements | O(1) |

All four are O(1) because they only ever touch the top — nothing needs to shift or search.

### Typical implementation

- **Resizable array**: `push` writes at `arr[top+1]` then increments `top`; `pop` reads `arr[top]` then decrements. Occasionally the array must be resized (doubled), which is O(n) but happens rarely enough that push is still O(1) *amortized*.
- **Singly linked list**: `push` = insert at head; `pop` = remove head. Always O(1), no resizing ever needed, but each element carries pointer overhead.

### Java: `Stack` vs `ArrayDeque`

Java gives you two ways to get stack behavior — interviewers expect you to know which to reach for.

| | `java.util.Stack` | `ArrayDeque` (recommended) |
|---|---|---|
| Extends | `Vector` (legacy, from Java 1.0) | `AbstractCollection`, implements `Deque` |
| Thread-safety | Synchronized — every method locks, even single-threaded use | Not synchronized — faster |
| Recommended by the Java docs themselves | No | Yes |
| Nulls allowed | Yes | No |

Use this in interviews:

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(10);       // add to top
int x = stack.pop();  // remove & return top
int y = stack.peek(); // look at top, don't remove
stack.isEmpty();       // check empty
```

`Deque` (double-ended queue) has built-in `push`/`pop`/`peek`, which operate on its "head" — exactly stack behavior. You'll see the *same* `ArrayDeque` used as a queue later in this page, just using different method names on the *other* end.

### Real-world intuition

Stack of plates/books · the undo button (Ctrl+Z) · the call stack running your own recursive function right now · a browser's "back" history.

---

### When should I think "STACK"?

This is the part that actually matters in an interview — recognizing the *signal*.

| Clue in the problem | Why it signals "stack" |
|---|---|
| "Last in, first out" / most recent first | That's the literal definition — no reasoning needed, it's handed to you. |
| Matching / open–close pairs (parentheses, tags, brackets) | To check something closes correctly, you need to know what was opened **most recently** — the innermost open thing must close first. "Most recent unclosed thing" is exactly a stack's top. |
| Nested structures | Nesting means "this is inside that." Unwinding nesting correctly means resolving the innermost layer before the outer one — LIFO again. |
| Undo | The last action taken is the first one reversed. |
| Previous/next greater or smaller element | You need to hold a list of "unresolved" elements and cancel them out in the *reverse* order you met them. This is the monotonic stack pattern — its own section below. |
| Removing elements while maintaining an order (e.g. greedy digit removal) | When a new element invalidates some of your *most recently* added elements, you undo your most recent decisions first. |
| Expression conversion/evaluation | An operator must wait for its operands, and the operator that was opened most recently (innermost, or highest precedence) must be applied first. |
| "I need to remember unresolved elements until something resolves them" | The deepest signal of all. Any time you're holding things because you don't have enough information *yet*, and whatever resolves them will resolve the most recent one first — that's a stack. |

**One sentence to internalize:** *A stack is for when the order you must undo/resolve/close things in is the reverse of the order you opened/started them in.*

---

## 2. Queue — One Page

### What a queue actually is

A queue is a data structure where you add elements at one end (the **back**/**rear**) and remove them from the *other* end (the **front**). Think of a checkout line: whoever joined first gets served first.

### FIFO — First In, First Out

```
enqueue(1) enqueue(2) enqueue(3)     dequeue() → 1

front → [1][2][3] ← rear             front → [2][3] ← rear
```

### Core operations

| Operation | What it does | Time |
|---|---|---|
| `enqueue(x)` / `offer(x)` | add `x` to the back | O(1) |
| `dequeue()` / `poll()` | remove and return the front element | O(1) |
| `front()` / `peek()` | look at the front without removing it | O(1) |
| `isEmpty()` | check if empty | O(1) |

### Typical implementation

- **Circular array** (fixed-size array with wraparound `front`/`rear` pointers): gives O(1) for everything. A *non-circular* array queue is a trap — see Problem 2, it's the "why is my brute force slow" example for this whole guide.
- **Doubly linked list** with head and tail pointers: O(1) add-to-tail, O(1) remove-from-head, no wraparound bookkeeping needed.

### Java: `ArrayDeque` for queues

```java
Deque<Integer> queue = new ArrayDeque<>();
queue.offer(10);      // add to back
int x = queue.poll(); // remove & return front
int y = queue.peek(); // look at front
queue.isEmpty();
```

`ArrayDeque` beats `LinkedList` for queue use too — it's backed by a resizable circular array, has better cache locality, and skips the per-node object overhead a linked list pays. (The *same* `ArrayDeque` class gives you stack behavior via `push`/`pop` and queue behavior via `offer`/`poll` — the difference is purely which end you're told to use.)

### Real-world intuition

A checkout line · a printer's job queue · support tickets handled in arrival order · BFS, visiting nodes level by level in discovery order.

---

### When should I think "QUEUE"?

| Clue in the problem | Why it signals "queue" |
|---|---|
| "First in, first out" / arrival order | Literal definition. |
| Processing things in the order they arrived | Fairness / arrival-order guarantee = FIFO. |
| BFS / level-order traversal | You must finish everything at the current "distance" before going further out — process nodes in exactly the order you discovered them. |
| Sliding window | As the window slides forward, the *oldest* element must leave before newer ones matter — first-added, first-removed. *(Careful: sliding-window **maximum/minimum** problems need a monotonic **deque**, not a plain queue — see Pattern 9, coming in a later file. Plain FIFO queues fit simpler windowed problems like windowed sums.)* |
| Maintaining "candidates" in discovery order | Same reasoning as BFS. |
| Scheduling / round robin | Everyone gets a turn in the order they queued up. |

**One sentence to internalize:** *A queue is for when the order you must process things in is the same order you received them in.*

---

## 3. Monotonic Stack — MOST IMPORTANT

This is the single idea that unlocks roughly half the problems in this guide. Slow down here.

### What is a monotonic stack?

A monotonic stack is a **regular stack** — still LIFO, still only `push`/`pop`/`peek` at the top — with one extra rule *you* enforce: **the values in the stack are always kept sorted, from bottom to top.**

- Values get bigger as you go from bottom to top → **increasing monotonic stack**.
- Values get smaller as you go from bottom to top → **decreasing monotonic stack**.

You enforce this by **popping** whatever would break the order, *before* you push the new element.

### What exactly is stored in the stack?

Almost always **indices**, not values. You store the index so that once an element's answer is found, you know exactly which slot of the original array/output to write it into. (Storing raw values instead of indices is one of the most common mistakes in this whole topic — you'll see it flagged in nearly every problem's "Common Mistakes" section.)

### Why do we pop? What does a popped element represent? What does the current element represent?

Every index sitting in the stack is **waiting** — it has a question that hasn't been answered yet ("what's my next greater element?", "how far left can I extend?", etc.).

The **current element** is new information arriving from the input. It does exactly two things:
1. It may **resolve** — and pop — one or more elements already waiting in the stack, because it finally answers their open question.
2. After it's done resolving others, it either gets discarded (if something already in the stack answers *its* question), or it gets **pushed** itself, becoming a new "unresolved" element waiting for some *future* element to resolve it.

So: **a popped element is one whose answer was *just* found**, and the element that triggered the pop is what answers it.

### Why does each element get pushed and popped at most once? How does this produce O(n)?

Every index enters the stack exactly once (when the loop reaches it) and leaves at most once (when something resolves it — or never, if nothing ever does, in which case it just sits there until the loop ends). No index is ever pushed a second time.

That's the whole reason a monotonic-stack loop is O(n) even though it *looks* like a `while` loop nested inside a `for` loop (which usually screams O(n²)): total pushes = n (exactly once each), and total pops ≤ n (at most once each, ever, across the *entire* run — not per iteration). Total work = O(n) + O(n) = O(n). This reasoning style is called **amortized analysis** — you're not bounding the cost of one iteration, you're bounding the total cost across all iterations combined.

### The most important mental model

> **The stack contains elements whose answer has NOT been found yet.**

Everything sitting in the stack right now is "still waiting." The moment the array hands us the information that resolves one of them, it leaves the stack — answer now known — and we move on.

### Small example — Next Greater Element

`arr = [2, 1, 2, 4, 3, 1]`. We want, for each index, the first value to its *right* that's bigger.

| Step | Looking at | Stack before (bottom→top, **values** shown) | What happens | Stack after |
|---|---|---|---|---|
| i=0 | 2 | `[]` | nothing to compare — push | `[2]` |
| i=1 | 1 | `[2]` | 1 isn't bigger than 2, so 2 keeps waiting — push 1 | `[2, 1]` |
| i=2 | 2 | `[2, 1]` | 2 > 1 → **1's answer found: next greater = 2**, pop it. Now top is 2; new 2 isn't *strictly* bigger, so old 2 keeps waiting — push new 2 | `[2, 2]` |
| i=3 | 4 | `[2, 2]` | 4 > 2 → pop, that 2's answer = 4. Still 4 > 2 (the other one) → pop, its answer = 4 too. Stack empty — push 4 | `[4]` |
| i=4 | 3 | `[4]` | 3 isn't bigger than 4, so 4 keeps waiting — push 3 | `[4, 3]` |
| i=5 | 1 | `[4, 3]` | 1 isn't bigger than 3 — push 1 | `[4, 3, 1]` |
| End | — | `[4, 3, 1]` | nothing left ever resolves them → answer = **-1** for all three | — |

Result: `[4, 2, 4, -1, -1, -1]`.

Notice: every popped element's answer was decided by whatever *caused* the pop. Every element still in the stack at the end never met a bigger element to its right, so it gets "none" (-1).

*(This exact algorithm — and the full worked walkthrough — is Problem 15 in a later file. This is just the concept.)*

### Increasing vs. decreasing — which one do I need?

This is the part people memorize instead of understand. Here's the actual reasoning, not just the rule:

- Looking for the **next greater** element (something bigger, to the right)? Every element in the stack is waiting to be beaten by something *bigger*. So the stack should hold elements that **haven't been beaten yet** — meaning every element above a given one in the stack must be *smaller* than it (otherwise it would already have been popped by that bigger element). That's a **decreasing** stack (bottom→top).
- Looking for the **next smaller** element? By the same logic, mirrored: a **increasing** stack (bottom→top).
- **Previous** greater/smaller (looking left instead of right) uses the *same* stack direction as the matching "next" problem — you're just reading the answer for the *current* element from whatever's left in the stack after popping, instead of writing the answer for the *popped* element. (Problems 15–18 make this concrete side-by-side.)

### How to recognize monotonic-stack problems

| Problem clue | Pattern | Stack type (bottom→top) | What the stack stores |
|---|---|---|---|
| "Next greater element" | Nearest greater to the right | Decreasing | Indices still waiting for something bigger on their right |
| "Next smaller element" | Nearest smaller to the right | Increasing | Indices still waiting for something smaller on their right |
| "Previous greater element" | Nearest greater to the left | Decreasing | Indices that are "the biggest so far, unbeaten" |
| "Previous smaller element" | Nearest smaller to the left | Increasing | Indices that are "the smallest so far, unbeaten" |
| "Stock span" | Distance to previous greater | Decreasing | Days not yet beaten by a higher price |
| "Largest rectangle in histogram" | Nearest smaller on both sides | Increasing | Bars that haven't yet found a shorter bar to their right |
| "Sum of subarray minimum/maximum" | Contribution technique (boundary distances) | Increasing (for min) / Decreasing (for max) | Indices whose full "range of influence" isn't known yet |
| "Remove k digits for smallest number" | Greedy monotonic construction | Increasing | Digits kept so far, still improvable by popping |
| "Next greater element II" (circular array) | Next greater, but the array wraps | Decreasing | Same as next greater — just traverse the array twice |
| "Asteroid collision" | LIFO pairwise-elimination simulation | Not strictly monotonic — but stack, because only the *most recent survivor* can ever collide with a new element | Surviving asteroids so far |
| "Trapping rain water" | Boundary technique (min of two walls) | Decreasing | Bars waiting for a taller bar to trap water above them |

You'll meet every row of this table as its own fully-worked problem later in the guide.

---

**Next:** [`02_universal_thinking_framework.md`](02_universal_thinking_framework.md) — the checklist you run through for *every* Stack/Queue problem, before you write a line of code.
