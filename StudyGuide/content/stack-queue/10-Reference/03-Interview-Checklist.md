# Interview Checklist

Run this list before writing a single line of code. It forces you to commit to the output, the pattern, the stored payload, and the invariant while there is still time to change course.

## Before coding

Ask yourself, in order:

- [ ] 1. What is the exact output?
- [ ] 2. What is the brute force?
- [ ] 3. Where is the repeated work?
- [ ] 4. What clue gives me the pattern?
- [ ] 5. What data structure should I use?
- [ ] 6. What does each stored element represent?
- [ ] 7. What does top/front mean?
- [ ] 8. What is my invariant?
- [ ] 9. When do I push/offer?
- [ ] 10. When do I pop/poll?
- [ ] 11. Can I permanently eliminate any element?
- [ ] 12. What happens to elements remaining at the end?
- [ ] 13. What are the edge cases?
- [ ] 14. What is the true time complexity?
- [ ] 15. What is the auxiliary space?

## The three questions that decide everything

If you can answer only three of the fifteen, make them these:

1. **What is unresolved?** The waiting room is the stack or deque.
2. **When does an element become permanently final?** That moment is the pop.
3. **Can each element be popped more than once?** If not, the `while` loop is still O(n).

## Before you say done

Re-check the last three items on the list above against your code:

- Edge cases: empty input, one element, all-equal values, full/expired window, negative values.
- Complexity: the amortized argument, not just the worst-case loop.
- Space: what you actually allocated, not what you intended to.

## See also

- [Decision Tree](01-Decision-Tree.md)
- [Revision Sheet](02-Revision-Sheet.md)
- [Biggest Lessons and Memory Map](04-Biggest-Lessons-And-Memory-Map.md)
- [Universal Thinking Framework](../02-Thinking-Framework/01-Universal-Thinking-Framework.md)
- [Pattern Grouping](../09-Patterns-And-Templates/02-Pattern-Grouping.md)
