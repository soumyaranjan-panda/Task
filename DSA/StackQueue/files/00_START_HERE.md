# Stack & Queue Interview Guide — START HERE

This is a full interview-prep guide covering all 30 requested problems, each with the complete 15-section treatment (understanding → how to think → pattern recognition → brute force → observation → optimal approach → invariant → dry run → why it works → Java code → complexity → edge cases → common mistakes → pattern-to-remember → interview trigger), plus foundations, a universal framework, comparison tables, a template library, a decision tree, and a revision sheet.

Given the size, it's built and delivered as a set of linked files instead of one unwieldy document — read them in order.

**A verification note:** every non-trivial algorithm in this guide (all the monotonic-stack variants, all six expression conversions, the circular-array logic, the Fenwick-tree solution, etc.) was written into an actual Java compiler and run against hand-derived expected outputs *before* being placed in these files — not just reasoned through on paper. If you spot a discrepancy anyway, it's worth flagging.

---

## Reading order & progress

| # | File | Covers | Status |
|---|---|---|---|
| 1 | `01_foundation_stack_queue_monotonic_stack.md` | Part 1 — Stack, Queue, Monotonic Stack foundations | ✅ Done |
| 2 | `02_universal_thinking_framework.md` | Part 2 — the 16-question checklist for any problem | ✅ Done |
| 3 | `03_problems_01to08_implementations_and_matching.md` | Problems 1–8: array/linked-list Stack & Queue, Stack⟷Queue conversion, Balanced Parentheses, Min Stack | ✅ Done |
| 4 | `04_problems_09to14_expression_conversions.md` | Problems 9–14: Infix↔Postfix↔Prefix, all six conversions | ✅ Done |
| 5 | `05_problems_15to18_monotonic_stack_core.md` | Problems 15–18: Next Greater/Smaller Element, circular variant, and the count-of-greater "exception that proves the rule" | ✅ Done |
| 6 | `06_problems_19to23_boundary_and_contribution.md` | Problems 19–23: Trapping Rain Water, Sum of Subarray Minimums, Asteroid Collision, Sum of Subarray Ranges, Remove K Digits | 🔜 Next |
| 7 | `07_problems_24to26_histogram_and_deque.md` | Problems 24–26: Largest Rectangle in Histogram, Maximal Rectangle, Sliding Window Maximum | 🔜 Planned |
| 8 | `08_problems_27to30_span_celebrity_cache.md` | Problems 27–30: Stock Span, Celebrity Problem, LRU Cache, LFU Cache | 🔜 Planned |
| 9 | `09_comparison_tables.md` | Part 4 — the big cross-problem comparison tables | 🔜 Planned |
| 10 | `10_pattern_grouping.md` | Part 5 — all 30 problems grouped by underlying idea, with templates/variations per group | 🔜 Planned |
| 11 | `11_template_library.md` | Part 6 — the 15 reusable Java templates | 🔜 Planned |
| 12 | `12_decision_tree.md` | Part 7 — "how to choose the pattern" decision tree | 🔜 Planned |
| 13 | `13_revision_sheet.md` | Part 8 — one-page final revision sheet | 🔜 Planned |
| 14 | `14_interview_checklist.md` | Part 9 — final pre-coding interview checklist | 🔜 Planned |

**To get the next batch, just say "continue."**

---

## All 30 problems, at a glance

| # | Problem | File |
|---|---|---|
| 1 | Implement Stack using Arrays | 03 ✅ |
| 2 | Implement Queue using Arrays | 03 ✅ |
| 3 | Implement Stack using Queue | 03 ✅ |
| 4 | Implement Queue using Stack | 03 ✅ |
| 5 | Implement Stack using Linked List | 03 ✅ |
| 6 | Implement Queue using Linked List | 03 ✅ |
| 7 | Balanced Parentheses | 03 ✅ |
| 8 | Implement Min Stack | 03 ✅ |
| 9 | Infix to Postfix Conversion | 04 ✅ |
| 10 | Prefix to Infix Conversion | 04 ✅ |
| 11 | Prefix to Postfix Conversion | 04 ✅ |
| 12 | Postfix to Prefix Conversion | 04 ✅ |
| 13 | Postfix to Infix Conversion | 04 ✅ |
| 14 | Infix to Prefix Conversion | 04 ✅ |
| 15 | Next Greater Element | 05 ✅ |
| 16 | Next Greater Element II | 05 ✅ |
| 17 | Next Smaller Element | 05 ✅ |
| 18 | Number of Greater Elements to the Right | 05 ✅ |
| 19 | Trapping Rain Water | 06 🔜 |
| 20 | Sum of Subarray Minimums | 06 🔜 |
| 21 | Asteroid Collision | 06 🔜 |
| 22 | Sum of Subarray Ranges | 06 🔜 |
| 23 | Remove K Digits | 06 🔜 |
| 24 | Largest Rectangle in a Histogram | 07 🔜 |
| 25 | Maximum Rectangles (Maximal Rectangle) | 07 🔜 |
| 26 | Sliding Window Maximum | 07 🔜 |
| 27 | Stock Span Problem | 08 🔜 |
| 28 | Celebrity Problem | 08 🔜 |
| 29 | LRU Cache | 08 🔜 |
| 30 | LFU Cache | 08 🔜 |

---

## What's already covered, if you want to jump around

By the end of file `05`, you already have the tools for the majority of "core" interview patterns: both basic containers built three ways each, both ADTs simulated using each other, the augmented-stack idea (Min Stack), all expression-notation conversions, and — the centerpiece — the full monotonic-stack family (next/previous greater/smaller, the circular extension, and the one deliberate non-example that teaches you the pattern's boundary). Files `06`–`08` extend the *same* monotonic-stack idea into boundary/contribution problems, histograms, deques, and finally two cache-design problems that are a different pattern entirely. Files `09`–`14` are the "zoom out" material — tables, templates, and checklists that only make sense once every problem exists to reference.
