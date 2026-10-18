# Monotonic Stack

This is the single idea that unlocks roughly half the problems in this guide.
Slow down here.

## What is a monotonic stack?

A monotonic stack is a **regular stack** — still LIFO, still only
`push`/`pop`/`peek` at the top — with one extra rule *you* enforce: **the values
in the stack are always kept sorted, from bottom to top.**

- Values get bigger as you go from bottom to top → **increasing monotonic stack**.
- Values get smaller as you go from bottom to top → **decreasing monotonic stack**.

You enforce this by **popping** whatever would break the order, *before* you push
the new element.

```text
increasing (bottom→top)      decreasing (bottom→top)
      ┌───┐ top                    ┌───┐ top
      │ 9 │                        │ 2 │
      ├───┤                        ├───┤
      │ 5 │                        │ 6 │
      ├───┤                        ├───┤
      │ 2 │                        │ 9 │
      └───┘ bottom                 └───┘ bottom
```

**Figure 1 —** The stack is kept sorted on only one axis: bottom to top.

## What exactly is stored in the stack?

Almost always **indices**, not values. You store the index so that once an
element's answer is found, you know exactly which slot of the original
array/output to write it into. Storing raw values instead of indices is one of
the most common mistakes in this whole topic — you will see it flagged in nearly
every problem's "Common Mistakes" section.

## Why do we pop? What does a popped element represent?

Every index sitting in the stack is **waiting** — it has a question that has not
been answered yet ("what is my next greater element?", "how far left can I
extend?", and so on).

The **current element** is new information arriving from the input. It does
exactly two things:

1. It may **resolve** — and pop — one or more elements already waiting in the
   stack, because it finally answers their open question.
2. After it is done resolving others, it either gets discarded (if something
   already in the stack answers *its* question), or it gets **pushed** itself,
   becoming a new "unresolved" element waiting for some *future* element to
   resolve it.

So: **a popped element is one whose answer was just found**, and the element that
triggered the pop is what answers it. **The current element is the candidate that
may resolve smaller/larger unresolved elements before joining the waiting room
itself.**

## Why does each element get pushed and popped at most once?

Every index enters the stack exactly once (when the loop reaches it) and leaves
at most once (when something resolves it — or never, if nothing ever does, in
which case it just sits there until the loop ends). No index is ever pushed a
second time.

That is the whole reason a monotonic-stack loop is O(n) even though it *looks*
like a `while` loop nested inside a `for` loop (which usually screams O(n²)):
total pushes = n (exactly once each), and total pops ≤ n (at most once each,
ever, across the *entire* run — not per iteration). Total work = O(n) + O(n) =
O(n).

This reasoning style is called **amortized analysis** — you are not bounding the
cost of one iteration, you are bounding the total cost across all iterations
combined.

## The most important mental model

> **The stack contains elements whose answer has NOT been found yet.**

Everything sitting in the stack right now is "still waiting." The moment the
array hands us the information that resolves one of them, it leaves the stack —
answer now known — and we move on.

## Small example — Next Greater Element

`arr = [2, 1, 2, 4, 3, 1]`. For each index we want the first value to its *right*
that is bigger.

```text
  read 2    read 1    read 2      read 4       read 3    read 1
  ┌───┐     ┌───┐     ┌───┐       ┌───┐        ┌───┐     ┌───┐
  │   │     │ 1 │     │ 2 │       │ 4 │        │ 3 │     │ 1 │
  ├───┤     ├───┤     ├───┤       └───┘        ├───┤     ├───┤
  │   │     │ 2 │     │ 2 │                    │ 4 │     │ 3 │
  └───┘     └───┘     └───┘                    └───┘     ├───┤
   push      push     pop 1       pop x2        push      │ 4 │
   (2)       (1)      push 2      push 4                   └───┘
                                                           push
```

**Figure 2 —** Each column is the stack (top drawn first) after reading that value.

| Step | Looking at | Stack before (bottom→top) | What happens | Stack after |
|---|---|---|---|---|
| i=0 | 2 | `[]` | nothing to compare — push | `[2]` |
| i=1 | 1 | `[2]` | 1 is not bigger than 2, so 2 keeps waiting — push 1 | `[2, 1]` |
| i=2 | 2 | `[2, 1]` | 2 > 1 → **1's answer found: 2**, pop it. Top is now 2; new 2 is not *strictly* bigger, so old 2 keeps waiting — push new 2 | `[2, 2]` |
| i=3 | 4 | `[2, 2]` | 4 > 2 → pop, that 2's answer = 4. Still 4 > 2 → pop, its answer = 4 too. Empty — push 4 | `[4]` |
| i=4 | 3 | `[4]` | 3 is not bigger than 4, so 4 keeps waiting — push 3 | `[4, 3]` |
| i=5 | 1 | `[4, 3]` | 1 is not bigger than 3 — push 1 | `[4, 3, 1]` |
| End | — | `[4, 3, 1]` | nothing left ever resolves them → answer = **-1** for all three | — |

Result: `[4, 2, 4, -1, -1, -1]`.

Notice: every popped element's answer was decided by whatever *caused* the pop.
Every element still in the stack at the end never met a bigger element to its
right, so it gets "none" (-1).

Here is that exact algorithm as a complete, compilable class:

```java
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

public class MonotonicStackDemo {

    static int[] nextGreaterElement(int[] arr) {
        int n = arr.length;
        int[] result = new int[n];
        Arrays.fill(result, -1);
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && arr[i] > arr[stack.peek()]) {
                int idx = stack.pop();
                result[idx] = arr[i];
            }
            stack.push(i);
        }
        return result;
    }

    public static void main(String[] args) {
        int[] arr = {2, 1, 2, 4, 3, 1};
        System.out.println(Arrays.toString(nextGreaterElement(arr)));
        // [4, 2, 4, -1, -1, -1]
    }
}
```

## Increasing vs. decreasing — which one do I need?

This is the part people memorize instead of understand. Here is the actual
reasoning, not just the rule:

- Looking for the **next greater** element (something bigger, to the right)?
  Every element in the stack is waiting to be beaten by something *bigger*. So
  the stack should hold elements that **have not been beaten yet** — meaning every
  element above a given one in the stack must be *smaller* than it (otherwise it
  would already have been popped by that bigger element). That is a **decreasing**
  stack (bottom→top).
- Looking for the **next smaller** element? By the same logic, mirrored: an
  **increasing** stack (bottom→top).
- **Previous** greater/smaller (looking left instead of right) uses the *same*
  stack direction as the matching "next" problem — you are just reading the answer
  for the *current* element from whatever is left in the stack after popping,
  instead of writing the answer for the *popped* element.

## How to recognize monotonic-stack problems

| Problem clue | Pattern | Stack type (bottom→top) | What the stack stores |
|---|---|---|---|
| "Next greater element" | Nearest greater to the right | Decreasing | Indices still waiting for something bigger on their right |
| "Next smaller element" | Nearest smaller to the right | Increasing | Indices still waiting for something smaller on their right |
| "Previous greater element" | Nearest greater to the left | Decreasing | Indices that are "the biggest so far, unbeaten" |
| "Previous smaller element" | Nearest smaller to the left | Increasing | Indices that are "the smallest so far, unbeaten" |
| "Stock span" | Distance to previous greater | Decreasing | Days not yet beaten by a higher price |
| "Largest rectangle in histogram" | Nearest smaller on both sides | Increasing | Bars that have not yet found a shorter bar to their right |
| "Sum of subarray minimum/maximum" | Contribution technique (boundary distances) | Increasing (min) / Decreasing (max) | Indices whose full "range of influence" is not known yet |
| "Remove k digits for smallest number" | Greedy monotonic construction | Increasing | Digits kept so far, still improvable by popping |
| "Next greater element II" (circular array) | Next greater, but the array wraps | Decreasing | Same as next greater — just traverse the array twice |
| "Asteroid collision" | LIFO pairwise-elimination simulation | Not strictly monotonic — but a stack, because only the *most recent survivor* can collide with a new element | Surviving asteroids so far |
| "Trapping rain water" | Boundary technique (min of two walls) | Decreasing | Bars waiting for a taller bar to trap water above them |

You will meet every row of this table as its own fully-worked problem later in the
guide.

## See also

- [Start Here](00-Start-Here.md)
- [Stack](01-Stack.md)
- [Queue](02-Queue.md)
- [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md)
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md)
