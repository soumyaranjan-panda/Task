# Stack & Queue Interview Guide — Part 2: Universal Thinking Framework

**Guide map:** `00_START_HERE.md` → `01_foundation...md` → **`02_universal_thinking_framework.md`** (you are here) → `03_problems_01to08...md` → `04_problems_09to14...md` → (more coming)

This is the checklist to run through on **any** new Stack/Queue problem, before writing code — including ones you've never seen. Every problem in this guide is solved by explicitly walking through these questions; watching that happen 30 times is how the pattern stops being memorized and starts being *derived*.

---

## The checklist

| # | Question | Why it matters |
|---|---|---|
| 1 | **What exactly is being asked?** | Restate the output in your own words. Half of wrong solutions come from solving a slightly different problem than the one asked. |
| 2 | **Is this about order?** | Stack/Queue problems are fundamentally about the *order* things happen in or get processed in — not about their values in isolation. |
| 3 | **Is it LIFO or FIFO?** | If order matters, which direction does it matter in — most-recent-first, or first-come-first-served? |
| 4 | **Do I need to remember unresolved elements?** | If you're holding onto things because you don't have enough information *yet* to finish with them, that's the core stack/queue signal. |
| 5 | **Am I looking for previous/next greater/smaller?** | This specific phrasing is the monotonic-stack trigger — see Part 1 §3. |
| 6 | **Is there a nested structure?** | Nesting (parentheses, tags, recursive structures) almost always means stack. |
| 7 | **Is there a window?** | A contiguous range that slides — could be a plain queue (windowed sum) or a monotonic deque (windowed max/min). |
| 8 | **Can elements be eliminated permanently?** | If, once beaten, an element can *never* matter again (e.g. a smaller bar can never be the tallest again once a taller one appears), that permanent elimination is what makes a stack-based solution O(n) instead of O(n²). |
| 9 | **Can I process each element once?** | If yes, you're looking at an O(n) or O(n log n) solution — a strong hint the answer involves a stack/queue/deque rather than nested loops. |
| 10 | **Is there a monotonic property?** | Would keeping the stack/deque sorted (increasing or decreasing) let you answer the question in O(1) at each step? |
| 11 | **What should the stack/queue contain?** | Values, or indices? (Usually indices — see Part 1 §3.) |
| 12 | **What does the top/front represent?** | Name it in plain English before coding: "the most recent day whose price hasn't been beaten yet," etc. |
| 13 | **When should I push?** | Almost always: after all necessary pops are done for the current element. |
| 14 | **When should I pop/remove?** | Precisely when the current element gives new information that answers an open question for the stack/queue's top/front. |
| 15 | **What does a popped element mean?** | Its answer was *just* found — say out loud what that answer is. |
| 16 | **What is the invariant?** | The property that's true *before* and *after* every single operation, without exception. If you can't state it, you don't yet understand the solution — you've just pattern-matched to a template. |

---

## How to actually use this in an interview

You don't recite all 16 questions out loud — that would be slow and stilted. Instead, internalize the **flow** they represent:

```
1-3:  Understand the ask, and its order-property (LIFO or FIFO?)
4-7:  Look for the specific trigger phrases / structural clues
8-10: Confirm WHY a stack/queue actually helps here (not just "it's the topic of this chapter")
11-12: Decide what's stored, and what it represents
13-15: Decide exactly when to push/pop, and what popping means
16:    State the invariant — this is your correctness proof, and your safety net while coding
```

Every problem in Parts 3+ is explicitly walked through this exact flow in its **"How to Think About the Problem"** section, so you can watch the checklist in action before trying it cold yourself.

---

**Next:** [`03_problems_01to08_implementations_and_matching.md`](03_problems_01to08_implementations_and_matching.md) — the first batch of fully-worked problems.
