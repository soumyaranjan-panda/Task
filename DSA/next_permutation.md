# Next Permutation — Complete Notes

## 1. Problem

Given an integer array, rearrange it into the **next lexicographically greater permutation**.

If no greater permutation exists, return the **smallest permutation** by sorting the array in ascending order.

### Examples

```text
[1, 2, 3] → [1, 3, 2]

[1, 3, 2] → [2, 1, 3]

[2, 3, 1] → [3, 1, 2]

[3, 2, 1] → [1, 2, 3]
```

---

# 2. First understand "next permutation"

Think about a number:

```text
123
```

All permutations in increasing order are:

```text
123
132
213
231
312
321
```

So:

```text
123 → 132
132 → 213
213 → 231
231 → 312
312 → 321
321 → 123
```

The important question is:

> How can we make the current number just slightly bigger?

We don't want to randomly rearrange the array.

We want the **smallest possible number that is greater than the current number**.

---

# 3. The main intuition

Consider:

```text
1 2 3 6 5 4
```

We want the next permutation.

Look from the **right side**.

Why?

Because the right side is where we can make the **smallest possible change**.

Compare adjacent elements:

```text
1 2 3 6 5 4
      ↑ ↑
      6 > 5 ❌
```

Continue moving left:

```text
1 2 3 6 5 4
    ↑ ↑
    3 < 6 ✅
```

We found:

```text
3
```

This is the **breakpoint**.

```text
1 2 [3] 6 5 4
```

Everything after `3` is:

```text
6 5 4
```

Notice something important:

```text
6 > 5 > 4
```

The suffix is in **descending order**.

That means the suffix is already the **largest possible arrangement**.

So we cannot make the permutation bigger by changing only the suffix.

We must change something before it.

---

# 4. Step 1 — Find the breakpoint

The breakpoint is the first index from the right where:

```text
nums[i] > nums[i - 1]
```

In other words:

```text
nums[i - 1] < nums[i]
```

Your code:

```java
int breakpoint = -1;

for(int i = nums.length - 1; i >= 1; i--) {

    if(nums[i] > nums[i - 1]){
        breakpoint = i - 1;
        break;
    }
}
```

For:

```text
1 2 3 6 5 4
```

we check:

```text
4 > 5 ❌
5 > 6 ❌
6 > 3 ✅
```

Therefore:

```text
breakpoint = 2
```

Array:

```text
1 2 [3] 6 5 4
      ↑
```

---

# 5. Why do we search from the right?

This is one of the most important ideas.

Suppose:

```text
1 2 3 6 5 4
```

The suffix:

```text
6 5 4
```

is descending.

Therefore it is already the **maximum permutation** of those elements.

There is no way to make:

```text
6 5 4
```

any larger.

So we move left until we find something that can be increased.

That gives us:

```text
3
```

This is why the breakpoint is found from right to left.

### General pattern

Whenever a problem asks for:

> next greater arrangement with minimum change

look for a **rightmost position where an increase is possible**.

---

# 6. Step 2 — Find the element to swap

We have:

```text
1 2 [3] 6 5 4
```

Breakpoint:

```text
3
```

We need to replace `3` with something **slightly larger than 3**.

Candidates:

```text
6
5
4
```

The smallest number greater than `3` is:

```text
4
```

So:

```text
1 2 3 6 5 4
      ↓     ↓
      3 ↔ 4
```

Result:

```text
1 2 4 6 5 3
```

Your code searches from the right:

```java
for(int i = nums.length - 1; i >= breakpoint; i--) {

    if(nums[i] > nums[breakpoint]){
        swap(nums, i, breakpoint);
        break;
    }
}
```

Why does the **first element from the right** work?

Because the suffix is descending.

```text
6 5 4
```

When searching from right to left:

```text
4
```

is the first element greater than `3`.

Therefore it is automatically the **smallest element greater than the breakpoint**.

---

# 7. Step 3 — Reverse the suffix

After swapping:

```text
1 2 4 6 5 3
```

We now have:

```text
1 2 4 | 6 5 3
        -------
        suffix
```

But we want the **smallest possible permutation after 4**.

The suffix should therefore be ascending:

```text
3 5 6
```

So:

```text
1 2 4 6 5 3
       ↓
1 2 4 3 5 6
```

And that's the answer.

Your code:

```java
reverse(nums, breakpoint + 1, nums.length - 1);
```

Result:

```text
[1, 2, 4, 3, 5, 6]
```

---

# 8. Complete example

Let's walk through:

```text
[1, 2, 3, 6, 5, 4]
```

### Step 1: Find breakpoint

From right:

```text
6 5 4
```

is descending.

Find:

```text
3 < 6
```

Therefore:

```text
breakpoint = index 2
```

```text
1 2 [3] 6 5 4
```

### Step 2: Find smallest larger element

Search from right:

```text
4 > 3
```

Swap:

```text
1 2 4 6 5 3
```

### Step 3: Reverse suffix

```text
6 5 3
```

becomes:

```text
3 5 6
```

Final:

```text
1 2 4 3 5 6
```

---

# 9. What if there is no breakpoint?

Consider:

```text
[3, 2, 1]
```

Check from right:

```text
1 > 2 ❌
2 > 3 ❌
```

No breakpoint.

That means the entire array is descending:

```text
3 2 1
```

This is already the **largest possible permutation**.

There is no next greater permutation.

So we need to go back to the smallest permutation:

```text
1 2 3
```

That's exactly what your code does:

```java
if(breakpoint == -1){
    reverse(nums, 0, nums.length - 1);
    return;
}
```

Because reversing a completely descending array produces an ascending array.

---

# 10. Another example

Consider:

```text
[2, 4, 1, 7, 5, 3]
```

Find breakpoint from right:

```text
3 > 5 ❌
5 > 7 ❌
7 > 1 ✅
```

Therefore:

```text
2 4 [1] 7 5 3
```

Breakpoint = `1`.

Now find the smallest element greater than `1`.

From right:

```text
3 > 1
```

Swap:

```text
2 4 3 7 5 1
```

Reverse suffix:

```text
7 5 1
```

becomes:

```text
1 5 7
```

Final:

```text
[2, 4, 3, 1, 5, 7]
```

---

# 11. Example with duplicate values

Consider:

```text
[1, 2, 2, 3]
```

Next permutation:

```text
[1, 2, 3, 2]
```

Breakpoint:

```text
2 < 3
```

Swap with the `3`:

```text
1 2 3 2
```

Suffix has only one element, so we're done.

---

Consider:

```text
[1, 3, 2, 2]
```

From right:

```text
2 > 2 ❌
2 > 2 ❌
3 > 1 ❌
```

Actually check carefully from the end:

```text
nums[3] > nums[2]
2 > 2 ❌

nums[2] > nums[1]
2 > 3 ❌

nums[1] > nums[0]
3 > 1 ✅
```

Breakpoint:

```text
1
```

Array:

```text
[1, 3, 2, 2]
    ↑
```

Smallest element greater than `1` is `2`.

Swap:

```text
[2, 3, 2, 1]
```

Reverse suffix:

```text
[1, 2, 3]
```

Final:

```text
[2, 1, 2, 3]
```

---

# 12. Why not sort the entire array?

A common first thought is:

> Generate permutations → sort them → find the next one.

That's extremely inefficient.

For `n` elements there can be:

```text
n!
```

permutations.

For example:

```text
10! = 3,628,800
```

We don't need to generate any permutations.

The structure of the current permutation gives us the answer directly.

---

# 13. The key observation

The entire algorithm comes from this one observation:

> The longest suffix that is in descending order is already the maximum permutation of that suffix.

Example:

```text
1 4 7 6 5 3
    -------
    descending
```

The suffix:

```text
7 6 5 3
```

is already as large as possible.

Therefore, to create the next permutation, we must modify something before it.

The first possible position is:

```text
4
```

So:

```text
1 [4] 7 6 5 3
```

Then:

1. Find the rightmost breakpoint.
2. Find the smallest larger element in the suffix.
3. Swap.
4. Minimize the suffix by reversing it.

---

# 14. Why reverse instead of sort?

After finding the breakpoint, the suffix is descending.

Example:

```text
7 6 5 3
```

After swapping:

```text
5 7 6 3
```

We need the smallest possible suffix.

Because it was originally descending, after the swap it can be transformed into ascending order simply by reversing:

```text
3 6 7
```

So we don't need:

```java
Arrays.sort(...)
```

We can do:

```java
reverse(...)
```

in `O(n)`.

This is an important optimization.

---

# 15. Algorithm to remember

Memorize these **4 steps**:

### Step 1 — Breakpoint

Find the first index from the right where:

```text
nums[i] > nums[i - 1]
```

Set:

```text
breakpoint = i - 1
```

---

### Step 2 — Swap candidate

Find the first element from the right such that:

```text
nums[i] > nums[breakpoint]
```

Swap them.

---

### Step 3 — Reverse suffix

Reverse:

```text
breakpoint + 1 → end
```

---

### Step 4 — No breakpoint

If breakpoint doesn't exist:

```text
reverse entire array
```

---

# 16. Visual template

Whenever you see:

```text
A B C | D E F
```

where:

```text
D > E > F
```

you know:

```text
D E F
```

is the largest arrangement of that suffix.

Find the rightmost element before it that can be increased:

```text
A B [C] D E F
```

Find the smallest value greater than `C`:

```text
A B [C] D E [X]
```

Swap:

```text
A B [X] D E C
```

Then make the suffix smallest:

```text
A B [X] C D E
```

That's the whole idea.

---

# 17. Your code explained

### Finding breakpoint

```java
int breakpoint = -1;

for(int i = nums.length - 1; i >= 1; i--) {

    if(nums[i] > nums[i - 1]){
        breakpoint = i - 1;
        break;
    }
}
```

Meaning:

> Starting from the right, find the first place where the increasing order can be created.

---

### No breakpoint

```java
if(breakpoint == -1){
    reverse(nums, 0, nums.length - 1);
    return;
}
```

Meaning:

> The array is completely descending, so this is the last permutation. Return the first permutation.

---

### Find swap candidate

```java
for(int i = nums.length - 1; i >= breakpoint; i--){

    if(nums[i] > nums[breakpoint]){
        swap(nums, i, breakpoint);
        break;
    }
}
```

Meaning:

> Find the smallest element on the right that is greater than the breakpoint.

Because the suffix is descending, searching from right to left gives us exactly that element.

---

### Reverse suffix

```java
reverse(nums, breakpoint + 1, nums.length - 1);
```

Meaning:

> After increasing the breakpoint, make everything after it as small as possible.

---

# 18. Time and space complexity

There are three operations:

### Find breakpoint

```text
O(n)
```

### Find swap candidate

```text
O(n)
```

### Reverse suffix

```text
O(n)
```

Overall:

```text
Time: O(n)
Space: O(1)
```

This is optimal because we need to inspect the array at least once.

---

# 19. How to recognize similar problems

This problem teaches a useful general pattern.

When you see a problem involving:

* permutations
* lexicographical order
* next greater arrangement
* previous smaller arrangement
* minimum change
* rearranging an array in-place

look for:

### 1. A boundary/breakpoint

Find where the current arrangement can still be improved.

### 2. A greedy replacement

Choose the **smallest possible improvement**.

### 3. Optimize the remaining part

After making the necessary improvement, arrange the rest to be as small as possible.

This is a common **greedy + array manipulation** pattern.

---

# 20. Mental model

Don't memorize the code.

Remember this story:

> **Find where I can increase.**
>
> **Increase it by the smallest amount possible.**
>
> **Make everything after it as small as possible.**

For next permutation:

```text
Find breakpoint
       ↓
Find smallest greater element
       ↓
Swap
       ↓
Reverse suffix
```

Or simply:

```text
BREAK → SWAP → REVERSE
```

---

# 21. One important correction in your understanding

Your implementation is correct.

But when explaining it in an interview, don't say:

> "I find an element that is smaller than the next element."

Instead say:

> "I scan from right to left to find the rightmost index `i` such that `nums[i] < nums[i+1]`. This is the breakpoint because everything after it is in descending order and therefore already represents the maximum arrangement of that suffix."

That explanation shows that you understand **why** the algorithm works, not just the code.

---

# 22. Interview-ready explanation

A concise explanation would be:

> "To find the next permutation, I first scan from right to left and find the rightmost position where `nums[i] < nums[i+1]`. This is the breakpoint. The suffix after this position is in descending order, so it is already the largest possible arrangement of that suffix. I then scan from the end to find the first element greater than the breakpoint and swap them. Finally, I reverse the suffix to make it ascending, giving the smallest possible permutation greater than the original. If no breakpoint exists, the array is already the largest permutation, so I reverse the entire array."

That is the explanation I'd use in an interview.
