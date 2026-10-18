# Stack

## What a stack actually is

A **stack** is a data structure where you can only add or remove elements from
**one end**, called the **top**. Picture a stack of plates: you place a new plate
on top, and when you need a plate, you take the top one. You never pull one from
the middle without first removing everything above it.

That one rule — "only touch the top" — is the entire definition. Everything else
follows from it.

## LIFO — Last In, First Out

Because you can only add or remove at the top, whatever you placed most recently
is the first thing you get back. This is called **LIFO**.

```text
push(1)   push(2)   push(3)          pop() -> 3        pop() -> 2
  ┌───┐     ┌───┐     ┌───┐            ┌───┐             ┌───┐
  │ 1 │     │ 2 │     │ 3 │ <- top     │ 2 │ <- top      │ 1 │ <- top
  └───┘     ├───┤     ├───┤            ├───┤             └───┘
            │ 1 │     │ 2 │            │ 1 │
            └───┘     ├───┤            └───┘
                      │ 1 │
                      └───┘
```

**Figure 1 —** Every push lands on top; every pop takes the top. LIFO.

## Why LIFO is useful

LIFO is exactly the behaviour you need whenever **"the most recent thing must be
dealt with first"**:

- **Undo** in an editor — the last edit you made is the first one undo reverses.
- **Function calls** — if `A()` calls `B()` calls `C()`, then `C` finishes first,
  then `B`, then `A`. The program's call stack is a stack.
- **Backtracking** — when a path fails, you back up to the *most recent* decision
  point, not the first one.
- **Anything nested** — the innermost layer must close before the outer layer can.

```text
A() calls B()          call stack over time
   │                   ┌─────────┐
   ▼                   │  A      │   A starts
B() calls C()          └─────────┘
   │                   ┌─────────┐
   ▼                   │  B      │   B starts, waits on C
C() returns first      ├─────────┤
   │                   │  A      │
   ▼                   └─────────┘
B() then A()           ... C returns, then B, then A
```

**Figure 2 —** The innermost (most recent) call unwinds first.

## Core operations

| Operation | What it does | Time |
|---|---|---|
| `push(x)` | add `x` to the top | O(1) |
| `pop()` | remove and return the top element | O(1) |
| `peek()` / `top()` | look at the top element without removing it | O(1) |
| `isEmpty()` | check if the stack has no elements | O(1) |

All four are O(1) because they only ever touch the top — nothing needs to shift
or search.

## Typical implementation

- **Resizable array** — `push` writes at `arr[top+1]` then increments `top`;
  `pop` reads `arr[top]` then decrements. Occasionally the array is doubled,
  which is O(n), but it happens rarely enough that push stays O(1) *amortized*.
- **Singly linked list** — `push` inserts at the head; `pop` removes the head.
  Always O(1), no resizing ever, but each element carries pointer overhead.

## Java: `Stack` vs `ArrayDeque`

Java gives you two ways to get stack behaviour — interviewers expect you to know
which to reach for.

| | `java.util.Stack` | `ArrayDeque` (recommended) |
|---|---|---|
| Extends | `Vector` (legacy, from Java 1.0) | `AbstractCollection`, implements `Deque` |
| Thread-safety | Synchronized — every method locks, even single-threaded use | Not synchronized — faster |
| Recommended by the Java docs themselves | No | Yes |
| Nulls allowed | Yes | No |

Prefer **`ArrayDeque`**. `Deque` (double-ended queue) has built-in
`push`/`pop`/`peek` that operate on its head — exactly stack behaviour. The same
`ArrayDeque` class also gives queue behaviour later, using method names on the
other end.

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class StackDemo {

    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<>();

        stack.push(10);            // add to top
        stack.push(20);
        stack.push(30);

        int top = stack.peek();    // 30, without removing
        int removed = stack.pop(); // 30, removed
        boolean empty = stack.isEmpty();

        System.out.println(top);      // 30
        System.out.println(removed);  // 30
        System.out.println(empty);    // false
    }
}
```

## Real-world intuition

A stack of plates or books · the undo button (Ctrl+Z) · the call stack running
your own recursive function right now · a browser's back history.

## When should I think "STACK"?

This is the part that actually matters in an interview — recognizing the signal.

| Clue in the problem | Why it signals "stack" |
|---|---|
| "Last in, first out" / most recent first | That is the literal definition — no reasoning needed. |
| Matching / open–close pairs (parentheses, tags, brackets) | To check something closes correctly, you must know what was opened **most recently** — the innermost open thing closes first. |
| Nested structures | Unwinding nesting correctly means resolving the innermost layer before the outer one — LIFO again. |
| Undo | The last action taken is the first one reversed. |
| Previous/next greater or smaller element | You hold a list of "unresolved" elements and cancel them out in the **reverse** order you met them. This is the monotonic stack — its own page below. |
| Removing elements while maintaining an order (e.g. greedy digit removal) | When a new element invalidates some of your **most recently** added elements, you undo your most recent decisions first. |
| Expression conversion/evaluation | An operator waits for its operands, and the operator opened most recently (innermost, or highest precedence) is applied first. |
| "I need to remember unresolved elements until something resolves them" | The deepest signal. Any time you hold things because you do not yet have enough information, and whatever resolves them resolves the most recent one first — that is a stack. |

**One sentence to internalize:** *A stack is for when the order you must
undo/resolve/close things in is the reverse of the order you opened/started them
in.*

## See also

- [Start Here](00-Start-Here.md)
- [Queue](02-Queue.md)
- [Monotonic Stack](03-Monotonic-Stack.md)
- [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md)
