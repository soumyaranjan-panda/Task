# 21. Asteroid Collision

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/asteroid-collision) · [Article](https://takeuforward.org/data-structure/asteroid-collision) · [Video](https://youtu.be/_eYGqw_VDR4?si=YyxibcHq800RqgIQ) — **LeetCode:** [Problem](https://leetcode.com/problems/asteroid-collision/)

## 1. Problem Understanding

An array of asteroids is given. The absolute value is the size; the sign is the direction: **positive moves right, negative moves left**. Asteroids move at the same speed. When two meet, the smaller one explodes; if they are equal, both explode. Return the state of the asteroids after all collisions.

- **Input:** integer array `asteroids`.
- **Output:** the surviving asteroids, in original relative order.
- **Key fact:** a collision can only happen between a right-mover on the *left* and a left-mover on the *right*: `positive ... negative`. Same-direction asteroids never collide.

Example: `[5, 10, -5]` → `10` and `-5` collide, `10` survives → `[5, 10]`.

## 2. How to Think About the Problem

**What should I notice first?** Collisions depend on the *most recent* asteroid that is still moving right and still alive. A new left-mover can only hit the nearest surviving right-mover — never one behind it until that one is resolved. "Newest survivor interacts first" is the definition of LIFO.

**What would I try first?** Repeatedly scan the array, resolve any adjacent `positive, negative` pair, and repeat until stable. This is correct but can be O(n²) under chain reactions.

**What observation unlocks the better solution?** Maintain a stack of the asteroids that are currently alive. When a new asteroid arrives, resolve it against the stack top — the only possible immediate collision partner — repeatedly until either the newcomer dies or no collision is possible. Then push it if it survived.

## 3. Pattern Recognition

**Problem clue:** moving objects that destroy each other; survivors remain; the newest survivor interacts first.
**Pattern:** Stack simulation.
**Why this pattern:** only the most recent surviving right-mover can be hit by an incoming left-mover, so the set of "alive" asteroids behaves exactly like a stack.
**Mental model:** the stack is the list of survivors so far, in original order.
**Similar problems:** Balanced Parentheses (LIFO matching of opens and closes); any "process a stream where the newest element may cancel prior elements" simulation.

## 4. Brute Force

Repeatedly sweep the array, removing `positive, negative` adjacent pairs where the left is smaller-or-equal, until a full pass makes no change.

```java
int[] asteroidCollisionBrute(int[] asteroids) {
    java.util.List<Integer> list = new java.util.ArrayList<>();
    for (int a : asteroids) list.add(a);

    boolean changed = true;
    while (changed) {
        changed = false;
        for (int i = 0; i + 1 < list.size(); i++) {
            int left = list.get(i);
            int right = list.get(i + 1);
            if (left > 0 && right < 0) {
                if (left < -right) { list.remove(i); changed = true; }
                else if (left == -right) { list.remove(i + 1); list.remove(i); changed = true; }
                else { list.remove(i + 1); changed = true; }
                break; // restart the sweep after any collision
            }
        }
    }
    int[] result = new int[list.size()];
    for (int i = 0; i < result.length; i++) result[i] = list.get(i);
    return result;
}
```

**Why is this too slow?** A long chain (for example `[1,2,3,...,n,-(n+1)]`) removes one asteroid per full sweep, giving O(n²) total work. The stack simulation resolves the whole chain in one pass.

## 5. Observation

A stack stores exactly the asteroids that are still alive. Only the **top** can collide with the incoming asteroid, because everything below is shielded by the top until the top is resolved.

```text
Incoming negative asteroid -x interacts only with the top survivor:

  stack (bottom -> top)
  +------+------+------+
  |  5   |  10  | top  |   <-- a new -x can only reach "top" first
  +------+------+------+
                 ^
        after the top is resolved, the new top becomes reachable
```

**Figure 1 —** The top is the only possible immediate collision partner.

## 6. Optimal Approach

For each asteroid `x`:

- While `x` is negative, the stack is not empty, and the top is positive (a right-mover):
  - If `top < -x` (incoming is bigger): pop the top; the incoming survives, continue against the next top.
  - Else if `top == -x` (equal size): pop the top and mark the incoming dead; stop.
  - Else (`top > -x`, top is bigger): mark the incoming dead; stop.
- If the incoming survived, push it.

Finally, read the survivors out of the stack in original order.

## 7. Invariant

> **Invariant:** After processing a prefix, the stack contains exactly the surviving asteroids of that prefix, in their original order, and no two asteroids in the stack would still collide.

## 8. Dry Run

Input: `[5, 10, -5]`. Stack shown bottom→top.

| step | current | stack before | action | stack after |
|---|---|---|---|---|
| 1 | 5 | `[]` | no collision; push | `[5]` |
| 2 | 10 | `[5]` | positive, no collision; push | `[5,10]` |
| 3 | -5 | `[5,10]` | top 10 > 0 and `10 < 5`? no; `10 == 5`? no; 10 bigger → -5 dies | `[5,10]` |

Result: **`[5, 10]`**.

Chain reaction — `[1, 2, 3, -5]`:

| step | current | stack before | action | stack after |
|---|---|---|---|---|
| 1 | 1 | `[]` | push | `[1]` |
| 2 | 2 | `[1]` | push | `[1,2]` |
| 3 | 3 | `[1,2]` | push | `[1,2,3]` |
| 4 | -5 | `[1,2,3]` | `3 < 5` → pop 3; `2 < 5` → pop 2; `1 < 5` → pop 1; stack empty → -5 survives | `[-5]` |

Result: **`[-5]`**.

## 9. Why Does It Work?

Any positive asteroid below the top cannot interact with a new negative asteroid until the top one has been resolved — the top physically blocks it. Therefore processing collisions strictly against the top exactly matches the physical order of collisions. Popping a destroyed top exposes the next asteroid that could be hit, so chains are handled naturally by the same loop. Asteroids separated by a direction change that does not collide (for example a left-mover already to the left of a right-mover) never meet, and the stack preserves that relative order for the final output.

## 10. Java Code

```java
import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    public int[] asteroidCollision(int[] asteroids) {
        Deque<Integer> stack = new ArrayDeque<>(); // survivors, bottom -> top

        for (int asteroid : asteroids) {
            boolean alive = true;

            while (alive
                    && asteroid < 0
                    && !stack.isEmpty()
                    && stack.peek() > 0) {

                if (stack.peek() < -asteroid) {
                    stack.pop();          // top explodes; incoming continues
                } else if (stack.peek() == -asteroid) {
                    stack.pop();          // both explode
                    alive = false;
                } else {
                    alive = false;        // incoming explodes
                }
            }

            if (alive) {
                stack.push(asteroid);
            }
        }

        int[] answer = new int[stack.size()];
        for (int i = answer.length - 1; i >= 0; i--) {
            answer[i] = stack.pop();
        }
        return answer;
    }
}
```

## 11. Complexity

**Time:** O(n) amortized — every asteroid is pushed exactly once and popped at most once, so the total number of pop operations across the whole run is bounded by `n`.
**Space:** O(n) — the stack can hold all asteroids if nothing collides.

## 12. Edge Cases

- **Equal sizes** — both explode; the incoming asteroid must not be pushed afterward.
- **No collision** — for example `[-5, 5]` (a left-mover already left of a right-mover) or any all-same-direction input.
- **Chain reactions** — a large negative asteroid can clear several positive asteroids in a single arrival.
- **All moving the same direction** — the answer equals the input.
- Empty input — returns an empty array.

## 13. Common Mistakes

- **Colliding same-direction asteroids.** Only `top > 0` with `asteroid < 0` triggers a collision; two positives or two negatives never interact.
- **Stopping after one collision.** A single incoming asteroid may destroy many positives (chain), so the collision loop must continue.
- **Pushing an asteroid after it exploded.** Track the `alive` flag and only push when it is still `true`.
- **Output order.** Popping the stack reverses order; rebuild the answer by writing from the back (as in the code) or by reversing.

## 14. Pattern to Remember

```text
Problem clue:  moving objects that destroy each other; survivors remain.
Pattern:       simulation where the newest survivor interacts first.
Data structure: Deque<Integer> stack of survivors.
What the stack stores: asteroids that have not collided yet.
When to push:  a right-mover, or a left-mover that destroys its rivals and survives.
When to pop:   while top is positive and smaller than the incoming negative's magnitude.
Invariant:     the stack never contains two asteroids that would still collide.
Key insight:   only the most recent right-mover can be hit by an incoming left-mover —
               the definition of a stack.
Time / Space:  O(n) amortized / O(n).
```

**Memory trick:** *"The stack is the survivors; a new item fights the latest survivor first."*

## 15. Interview Trigger

> When objects arrive one by one and the new object may destroy recent survivors, I think stack simulation. The top is the only possible immediate collision partner, and a loop against the top handles chains for free.

## Related Problems

- [02-Sum-Of-Subarray-Minimums.md](02-Sum-Of-Subarray-Minimums.md) — a different use of stacks, but the same "process a stream" framing.
- [05-Remove-K-Digits.md](05-Remove-K-Digits.md) — greedy monotonic stack where a new element can eliminate previous ones.
- [../05-Monotonic-Stack-Core/01-Next-Greater-Element.md](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md) — "a new element resolves waiting elements," the shared kernel.

## See also

- [01-Trapping-Rain-Water.md](01-Trapping-Rain-Water.md) — another stack simulation driven by the top of the stack.
- [01-Largest-Rectangle-In-A-Histogram.md](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md) — classic stack-based simulation of boundaries.
