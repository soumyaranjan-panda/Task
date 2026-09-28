# Part 1: Basic Binary Search & Boundaries

Questions covered:

1. Search X in Sorted Array
2. Lower Bound
3. Upper Bound
4. Search Insert Position
5. Floor and Ceil in Sorted Array
6. First and Last Occurrence
7. Count Occurrences in a Sorted Array

---

# Before starting: The Binary Search Mental Model

Binary Search works when we can use some property to **eliminate half of the search space**.

The most common clue is:

> The array is sorted.

Example:

```text
[1, 3, 5, 7, 9, 11, 13]
```

Suppose we want `9`.

Check the middle:

```text
          mid
           ↓
[1, 3, 5, 7, 9, 11, 13]
```

If:

```text
arr[mid] < target
```

Then everything before `mid` can be ignored.

Why?

Because the array is sorted.

```text
[1, 3, 5, 7 | 9, 11, 13]
 ↑-------------↑
 all smaller than target
```

So:

```java
low = mid + 1;
```

Similarly:

```text
arr[mid] > target
```

means the answer must be on the left.

```java
high = mid - 1;
```

---

## Standard Binary Search Template

```java
int low = 0;
int high = arr.length - 1;

while (low <= high) {
    int mid = low + (high - low) / 2;

    if (arr[mid] == target) {
        return mid;
    } 
    else if (arr[mid] < target) {
        low = mid + 1;
    } 
    else {
        high = mid - 1;
    }
}
```

### Why this is `O(log n)`?

Each iteration cuts the search space approximately in half.

```text
n
↓
n/2
↓
n/4
↓
n/8
↓
...
↓
1
```

Number of divisions:

$$
\log_2 n
$$

So:

```text
Time: O(log n)
```

Only a few variables are used:

```text
low
high
mid
```

So:

```text
Space: O(1)
```

---

# 1. Search X in Sorted Array

## Problem

Given a sorted array and a target `X`, find its index.

Example:

```text
arr = [1, 3, 5, 7, 9]
target = 7

Answer = 3
```

---

## How should you think?

The first observation should be:

> The array is sorted.

Then ask:

> If I check one element, can I eliminate part of the array?

Yes.

If:

```text
arr[mid] < target
```

Then the target cannot exist on the left.

If:

```text
arr[mid] > target
```

Then the target cannot exist on the right.

This is classic Binary Search.

---

## Brute Force

Check every element.

```java
class Solution {
    public int search(int[] nums, int target) {

        for (int i = 0; i < nums.length; i++) {
            if (nums[i] == target) {
                return i;
            }
        }

        return -1;
    }
}
```

### Time Complexity

One loop may visit all `n` elements.

```text
O(n)
```

### Space Complexity

Only `i` is used.

```text
O(1)
```

---

## Optimal: Binary Search

```java
class Solution {
    public int search(int[] nums, int target) {

        int low = 0;
        int high = nums.length - 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] == target) {
                return mid;
            }
            else if (nums[mid] < target) {
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }

        return -1;
    }
}
```

### Dry Run

```text
nums = [1, 3, 5, 7, 9]
target = 7
```

Initially:

```text
low = 0
high = 4
```

### Iteration 1

```text
mid = 2
nums[2] = 5
```

Since:

```text
5 < 7
```

Move right:

```text
low = 3
```

### Iteration 2

```text
low = 3
high = 4

mid = 3
nums[3] = 7
```

Found.

---

### Pattern to Remember

```text
Sorted array
+
Find an exact element
↓
Classic Binary Search
```

---

# 2. Lower Bound

## Problem

Find the first index where:

$$
arr[index] \geq target
$$

Example:

```text
arr = [1, 2, 2, 3, 5]

target = 2

Lower Bound = index 1
```

Because index `1` is the first position where:

```text
arr[i] >= 2
```

---

## Important Difference

Normal Binary Search asks:

> Does target exist?

Lower Bound asks:

> What is the first position where the value becomes greater than or equal to target?

This is a **boundary search** problem.

---

## Brute Force

```java
class Solution {
    public int lowerBound(int[] arr, int target) {

        for (int i = 0; i < arr.length; i++) {
            if (arr[i] >= target) {
                return i;
            }
        }

        return arr.length;
    }
}
```

### Time Complexity

Worst case: visit every element.

```text
O(n)
```

### Space Complexity

```text
O(1)
```

---

## Optimal: Binary Search

```java
class Solution {
    public int lowerBound(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;
        int ans = arr.length;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] >= target) {

                ans = mid;

                high = mid - 1;

            } else {

                low = mid + 1;

            }
        }

        return ans;
    }
}
```

---

## The Important Intuition

Suppose:

```text
arr = [1, 2, 2, 2, 4, 5]
target = 2
```

We find:

```text
arr[mid] = 2
```

Can we immediately return?

No.

Because this might not be the **first** `2`.

So:

```text
This is a valid answer
↓
Store it
↓
Can there be a better answer on the left?
↓
Search left
```

That's why:

```java
ans = mid;
high = mid - 1;
```

### Boundary Search Pattern

```text
Found a valid answer
        ↓
Don't immediately return
        ↓
Save the answer
        ↓
Search for a better boundary
```

---

### Pattern to Remember

```text
First index satisfying:
arr[i] >= target

↓
Lower Bound
↓
Valid answer → move left
```

---

# 3. Upper Bound

## Problem

Find the first index where:

$$
arr[index] > target
$$

Example:

```text
arr = [1, 2, 2, 2, 3, 5]
target = 2
```

Answer:

```text
index = 4
```

Because:

```text
arr[4] = 3
```

and this is the first element greater than `2`.

---

## Brute Force

```java
class Solution {
    public int upperBound(int[] arr, int target) {

        for (int i = 0; i < arr.length; i++) {
            if (arr[i] > target) {
                return i;
            }
        }

        return arr.length;
    }
}
```

### Time Complexity

```text
O(n)
```

### Space Complexity

```text
O(1)
```

---

## Optimal: Binary Search

```java
class Solution {
    public int upperBound(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;
        int ans = arr.length;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] > target) {

                ans = mid;
                high = mid - 1;

            } else {

                low = mid + 1;
            }
        }

        return ans;
    }
}
```

---

## Lower Bound vs Upper Bound

Take:

```text
[1, 2, 2, 2, 3, 5]
```

Target:

```text
2
```

```text
Index:       0  1  2  3  4  5
Array:       1  2  2  2  3  5
                 ↑        ↑
            Lower Bound  Upper Bound
```

### Lower Bound

First:

```text
>= target
```

### Upper Bound

First:

```text
> target
```

---

# 4. Search Insert Position

## Problem

Find where a target exists or where it should be inserted to maintain sorted order.

Example:

```text
arr = [1, 3, 5, 6]
target = 2
```

Answer:

```text
1
```

Because:

```text
[1, |2|, 3, 5, 6]
     ↑
   index 1
```

---

## Key Observation

We want the first position where:

```text
arr[i] >= target
```

Wait...

That's exactly the definition of:

> Lower Bound

So this problem is simply Lower Bound.

---

## Brute Force

```java
class Solution {
    public int searchInsert(int[] nums, int target) {

        for (int i = 0; i < nums.length; i++) {
            if (nums[i] >= target) {
                return i;
            }
        }

        return nums.length;
    }
}
```

---

## Optimal

```java
class Solution {
    public int searchInsert(int[] nums, int target) {

        int low = 0;
        int high = nums.length - 1;
        int ans = nums.length;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] >= target) {
                ans = mid;
                high = mid - 1;
            }
            else {
                low = mid + 1;
            }
        }

        return ans;
    }
}
```

### Complexity

```text
Time: O(log n)
Space: O(1)
```

---

## Pattern Recognition

When you see:

> Find the position where this element should be inserted.

Think:

```text
First position where
arr[i] >= target

↓
Lower Bound
```

---

# 5. Floor and Ceil in Sorted Array

## Definitions

### Floor

Largest element:

$$
\leq target
$$

### Ceil

Smallest element:

$$
\geq target
$$

Example:

```text
arr = [1, 2, 4, 6, 8]
target = 5
```

```text
Floor = 4
Ceil = 6
```

---

# Brute Force

```java
class Solution {

    public int[] floorAndCeil(int[] arr, int target) {

        int floor = -1;
        int ceil = -1;

        for (int num : arr) {

            if (num <= target) {
                floor = Math.max(floor, num);
            }

            if (num >= target) {

                if (ceil == -1) {
                    ceil = num;
                } else {
                    ceil = Math.min(ceil, num);
                }
            }
        }

        return new int[]{floor, ceil};
    }
}
```

### Time

```text
One loop → O(n)
```

### Space

```text
Only variables → O(1)
```

---

# Optimal: Binary Search

We can find both in one Binary Search.

```java
class Solution {

    public int[] floorAndCeil(int[] arr, int target) {

        int floor = -1;
        int ceil = -1;

        int low = 0;
        int high = arr.length - 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] == target) {
                return new int[]{target, target};
            }

            else if (arr[mid] < target) {

                floor = arr[mid];

                low = mid + 1;
            }

            else {

                ceil = arr[mid];

                high = mid - 1;
            }
        }

        return new int[]{floor, ceil};
    }
}
```

---

## Intuition

Suppose:

```text
arr = [1, 2, 4, 6, 8]
target = 5
```

If:

```text
arr[mid] < target
```

Example:

```text
arr[mid] = 4
```

Then `4` is a possible floor.

But maybe there is something bigger and still less than `5`.

So:

```text
floor = 4
low = mid + 1
```

We search right.

---

If:

```text
arr[mid] > target
```

Example:

```text
arr[mid] = 6
```

Then `6` is a possible ceil.

But maybe there is a smaller valid ceil.

So:

```text
ceil = 6
high = mid - 1
```

We search left.

---

### Pattern

```text
arr[mid] < target
→ possible floor
→ search right

arr[mid] > target
→ possible ceil
→ search left
```

---

# 6. First and Last Occurrence

## Problem

Find the first and last occurrence of a target.

Example:

```text
arr = [1, 2, 2, 2, 3, 4]
target = 2
```

Answer:

```text
first = 1
last = 3
```

---

## Brute Force

```java
class Solution {

    public int[] firstAndLast(int[] arr, int target) {

        int first = -1;
        int last = -1;

        for (int i = 0; i < arr.length; i++) {

            if (arr[i] == target) {

                if (first == -1) {
                    first = i;
                }

                last = i;
            }
        }

        return new int[]{first, last};
    }
}
```

### Time

```text
One complete loop → O(n)
```

### Space

```text
O(1)
```

---

# Optimal Approach

We can perform Binary Search twice.

### Find First Occurrence

When we find target:

```text
Don't stop.
```

Store it and search left.

### Find Last Occurrence

When we find target:

```text
Don't stop.
```

Store it and search right.

---

## Code

```java
class Solution {

    public int[] firstAndLast(int[] arr, int target) {

        int first = findFirst(arr, target);
        int last = findLast(arr, target);

        return new int[]{first, last};
    }

    private int findFirst(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;
        int ans = -1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] == target) {

                ans = mid;
                high = mid - 1;

            }
            else if (arr[mid] < target) {

                low = mid + 1;

            }
            else {

                high = mid - 1;
            }
        }

        return ans;
    }

    private int findLast(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;
        int ans = -1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] == target) {

                ans = mid;
                low = mid + 1;

            }
            else if (arr[mid] < target) {

                low = mid + 1;

            }
            else {

                high = mid - 1;
            }
        }

        return ans;
    }
}
```

---

## Core Difference

### First occurrence

```text
Found target
↓
Save answer
↓
Search LEFT
```

```java
high = mid - 1;
```

### Last occurrence

```text
Found target
↓
Save answer
↓
Search RIGHT
```

```java
low = mid + 1;
```

---

## Complexity

Two Binary Searches:

```text
O(log n) + O(log n)
```

Ignoring constants:

```text
O(log n)
```

Space:

```text
O(1)
```

---

# 7. Count Occurrences in a Sorted Array

## Problem

Count how many times a target appears.

Example:

```text
arr = [1, 2, 2, 2, 3, 4]
target = 2
```

Answer:

```text
3
```

---

## Brute Force

Count every occurrence.

```java
class Solution {

    public int countOccurrences(int[] arr, int target) {

        int count = 0;

        for (int num : arr) {
            if (num == target) {
                count++;
            }
        }

        return count;
    }
}
```

### Time

```text
O(n)
```

### Space

```text
O(1)
```

---

# Better Approach

Since the array is sorted, once we find the target, duplicates are adjacent.

We could find one occurrence and then expand left and right.

```java
class Solution {

    public int countOccurrences(int[] arr, int target) {

        int index = binarySearch(arr, target);

        if (index == -1) {
            return 0;
        }

        int left = index;
        int right = index;

        while (left - 1 >= 0 && arr[left - 1] == target) {
            left--;
        }

        while (right + 1 < arr.length && arr[right + 1] == target) {
            right++;
        }

        return right - left + 1;
    }

    private int binarySearch(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] == target) {
                return mid;
            }
            else if (arr[mid] < target) {
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }

        return -1;
    }
}
```

### Complexity

Binary Search:

```text
O(log n)
```

Then expansion could visit `n` elements.

Worst case:

```text
O(n)
```

So total:

```text
O(log n + n)
= O(n)
```

This doesn't improve the worst-case complexity, but it uses the sorted property partially.

---

# Optimal Approach

Find:

```text
First occurrence
Last occurrence
```

Then:

$$
count = last - first + 1
$$

Example:

```text
arr = [1, 2, 2, 2, 3]

First = 1
Last = 3

Count = 3 - 1 + 1
      = 3
```

---

## Code

```java
class Solution {

    public int countOccurrences(int[] arr, int target) {

        int first = findFirst(arr, target);

        if (first == -1) {
            return 0;
        }

        int last = findLast(arr, target);

        return last - first + 1;
    }

    private int findFirst(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;
        int ans = -1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] >= target) {

                if (arr[mid] == target) {
                    ans = mid;
                }

                high = mid - 1;

            }
            else {

                low = mid + 1;
            }
        }

        return ans;
    }

    private int findLast(int[] arr, int target) {

        int low = 0;
        int high = arr.length - 1;
        int ans = -1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (arr[mid] <= target) {

                if (arr[mid] == target) {
                    ans = mid;
                }

                low = mid + 1;

            }
            else {

                high = mid - 1;
            }
        }

        return ans;
    }
}
```

### Time Complexity

Two Binary Searches:

```text
O(log n) + O(log n)
```

Therefore:

```text
O(log n)
```

### Space Complexity

Only a few variables:

```text
low
high
mid
ans
```

Therefore:

```text
O(1)
```

---

# Part 1 Pattern Summary

## Pattern 1: Exact Search

### Question

```text
Search X in Sorted Array
```

Mental model:

```text
Sorted array
+
Find exact value
↓
Classic Binary Search
```

---

## Pattern 2: Lower Boundary

### Questions

```text
Lower Bound
Search Insert Position
First Occurrence
```

Mental model:

```text
Find first valid position
↓
When valid:
save answer
search left
```

Typical condition:

```text
arr[mid] >= target
```

---

## Pattern 3: Upper Boundary

### Questions

```text
Upper Bound
Last Occurrence
```

Mental model:

```text
Find last valid position
↓
When valid:
save answer
search right
```

---

## Pattern 4: Find Nearest Valid Values

### Question

```text
Floor and Ceil
```

Mental model:

```text
arr[mid] < target
→ possible floor
→ search right

arr[mid] > target
→ possible ceil
→ search left
```

---

## Pattern 5: Convert One Problem Into Another

### Question

```text
Count Occurrences
```

Observation:

```text
Count directly?
```

Instead:

```text
Find First
+
Find Last
↓
last - first + 1
```

This is an important DSA habit:

> Sometimes you don't need to solve the problem directly. You can transform it into two easier problems you already know.

---

# The Most Important Thing to Remember From Part 1

Binary Search is not just:

```java
if (arr[mid] == target)
```

There are different questions Binary Search can answer:

```text
1. Does it exist?

2. What is the first valid position?

3. What is the last valid position?

4. What is the smallest value >= target?

5. What is the smallest value > target?

6. What is the largest value <= target?
```

The key question before writing Binary Search is:

> **When I find a valid `mid`, should I return, search left, or search right?**

That single question helps distinguish most Binary Search patterns.
# Part 2: Rotated Arrays & Special Binary Search

Questions covered:

8. Search in Rotated Sorted Array – I
9. Search in Rotated Sorted Array – II
10. Find Minimum in Rotated Sorted Array
11. Find How Many Times the Array Is Rotated
12. Single Element in a Sorted Array
13. Find Peak Element
14. Find Square Root of a Number
15. Find Nth Root of a Number

---

# First: What changes in these Binary Search problems?

In Part 1, the array was completely sorted:

```text
[1, 2, 3, 4, 5, 6]
```

Now the array may look like:

```text
[4, 5, 6, 7, 1, 2, 3]
```

It was originally sorted:

```text
[1, 2, 3, 4, 5, 6, 7]
```

Then rotated:

```text
[4, 5, 6, 7 | 1, 2, 3]
```

The important observation is:

> Even though the complete array is not sorted, at least one half is always sorted.

That observation is the foundation of rotated-array Binary Search.

---

# 8. Search in Rotated Sorted Array – I

## Problem

Given a rotated sorted array with distinct elements, find the target.

Example:

```text
nums = [4, 5, 6, 7, 0, 1, 2]
target = 0

Answer = 4
```

---

## How to think about it

First notice:

```text
The array is not completely sorted.
```

So normal Binary Search cannot directly decide:

```text
arr[mid] < target
→ search right
```

Because the array has a rotation.

But look at this:

```text
[4, 5, 6 | 7 | 0, 1, 2]
           mid
```

One of these halves must be sorted:

```text
[4, 5, 6, 7]
```

or:

```text
[0, 1, 2]
```

So the thinking becomes:

```text
Step 1:
Find mid

Step 2:
Identify which half is sorted

Step 3:
Check whether target belongs in that sorted half

Step 4:
Eliminate the other half
```

---

## Brute Force

```java
class Solution {
    public int search(int[] nums, int target) {

        for (int i = 0; i < nums.length; i++) {
            if (nums[i] == target) {
                return i;
            }
        }

        return -1;
    }
}
```

### Time Complexity

One loop may check all elements:

```text
O(n)
```

### Space Complexity

Only loop variables:

```text
O(1)
```

---

## Optimal: Binary Search

```java
class Solution {
    public int search(int[] nums, int target) {

        int low = 0;
        int high = nums.length - 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] == target) {
                return mid;
            }

            // Left half is sorted
            if (nums[low] <= nums[mid]) {

                if (nums[low] <= target && target < nums[mid]) {
                    high = mid - 1;
                } else {
                    low = mid + 1;
                }
            }

            // Right half is sorted
            else {

                if (nums[mid] < target && target <= nums[high]) {
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
        }

        return -1;
    }
}
```

---

## The main intuition

Take:

```text
[4, 5, 6, 7, 0, 1, 2]
```

Suppose:

```text
low = 0
high = 6
mid = 3

nums[mid] = 7
```

Visual:

```text
[4, 5, 6 | 7 | 0, 1, 2]
 ↑         ↑
low       mid
```

Check:

```text
nums[low] <= nums[mid]

4 <= 7
```

So the left half is sorted:

```text
[4, 5, 6, 7]
```

Now suppose target is `0`.

Does `0` belong between `4` and `7`?

```text
4 <= 0 < 7

False
```

So target must be on the other side:

```text
low = mid + 1
```

---

## Pattern to Remember

```text
Rotated sorted array
        ↓
Find which half is sorted
        ↓
Check if target belongs there
        ↓
Eliminate the other half
```

---

# 9. Search in Rotated Sorted Array – II

## What's different?

Now duplicates are allowed.

Example:

```text
[2, 5, 6, 0, 0, 1, 2]
```

The previous approach mostly works.

But duplicates can create ambiguity.

Example:

```text
[1, 0, 1, 1, 1]
```

Suppose:

```text
low = 0
mid = 2
high = 4
```

Then:

```text
nums[low] = 1
nums[mid] = 1
nums[high] = 1
```

Can we determine which half is sorted?

No.

---

## Key Observation

When:

```text
nums[low] == nums[mid]
&&
nums[mid] == nums[high]
```

We cannot determine the sorted half.

So we shrink the search space:

```java
low++;
high--;
```

---

## Code

```java
class Solution {
    public boolean search(int[] nums, int target) {

        int low = 0;
        int high = nums.length - 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] == target) {
                return true;
            }

            // Cannot identify sorted half
            if (nums[low] == nums[mid] &&
                nums[mid] == nums[high]) {

                low++;
                high--;
                continue;
            }

            // Left half sorted
            if (nums[low] <= nums[mid]) {

                if (nums[low] <= target &&
                    target < nums[mid]) {

                    high = mid - 1;

                } else {

                    low = mid + 1;
                }
            }

            // Right half sorted
            else {

                if (nums[mid] < target &&
                    target <= nums[high]) {

                    low = mid + 1;

                } else {

                    high = mid - 1;
                }
            }
        }

        return false;
    }
}
```

---

## Complexity

### Average case

Binary Search:

```text
O(log n)
```

### Worst case

Because of duplicates:

```java
low++;
high--;
```

We may only remove one element at a time.

So:

```text
O(n)
```

### Space

```text
O(1)
```

---

## Pattern to Remember

```text
Rotated array + duplicates

If:
low == mid == high

↓
Cannot identify sorted half

↓
Shrink both sides
```

---

# 10. Find Minimum in Rotated Sorted Array

## Problem

Example:

```text
[4, 5, 6, 7, 0, 1, 2]
```

Find:

```text
0
```

---

## Brute Force

```java
class Solution {
    public int findMin(int[] nums) {

        int min = Integer.MAX_VALUE;

        for (int num : nums) {
            min = Math.min(min, num);
        }

        return min;
    }
}
```

### Time

```text
O(n)
```

### Space

```text
O(1)
```

---

## Better Thinking

Look at the rotated array:

```text
[4, 5, 6, 7 | 0, 1, 2]
```

The minimum is the point where the sorted order "breaks".

The array consists of two sorted parts:

```text
[4, 5, 6, 7]
[0, 1, 2]
```

We want to identify which side contains the minimum.

---

## Optimal Approach

Compare `nums[mid]` with `nums[high]`.

Example:

```text
[4, 5, 6, 7, 0, 1, 2]
             mid       high
```

If:

```text
nums[mid] > nums[high]
```

Example:

```text
7 > 2
```

Then the minimum must be on the right.

Why?

Because:

```text
[4, 5, 6, 7]
```

is larger than:

```text
[0, 1, 2]
```

So:

```java
low = mid + 1;
```

---

If:

```text
nums[mid] < nums[high]
```

Then the right side is already sorted and `mid` could itself be the minimum.

So:

```java
high = mid;
```

Notice:

```text
high = mid
```

not:

```text
high = mid - 1
```

Because `mid` might be the answer.

---

## Code

```java
class Solution {
    public int findMin(int[] nums) {

        int low = 0;
        int high = nums.length - 1;

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] > nums[high]) {

                low = mid + 1;

            } else {

                high = mid;
            }
        }

        return nums[low];
    }
}
```

---

## Dry Run

```text
nums = [4, 5, 6, 7, 0, 1, 2]
```

### Iteration 1

```text
low = 0
high = 6
mid = 3

nums[mid] = 7
nums[high] = 2

7 > 2
```

Minimum is on right.

```text
low = 4
```

---

### Iteration 2

```text
low = 4
high = 6
mid = 5

nums[mid] = 1
nums[high] = 2

1 < 2
```

Minimum could be `1` or somewhere left.

```text
high = 5
```

---

### Iteration 3

```text
low = 4
high = 5
mid = 4

nums[mid] = 0
nums[high] = 1

0 < 1
```

```text
high = 4
```

Now:

```text
low == high == 4
```

Answer:

```text
nums[4] = 0
```

---

# 11. Find How Many Times the Array Is Rotated

## Key Observation

Take the original array:

```text
[1, 2, 3, 4, 5]
```

Rotate once:

```text
[5, 1, 2, 3, 4]
```

Minimum is at index:

```text
1
```

Rotate twice:

```text
[4, 5, 1, 2, 3]
```

Minimum is at index:

```text
2
```

Rotate three times:

```text
[3, 4, 5, 1, 2]
```

Minimum is at index:

```text
3
```

Therefore:

> Number of rotations = index of minimum element.

So this problem is actually:

```text
Find minimum
+
Return its index
```

---

## Brute Force

```java
class Solution {
    public int findKRotation(int[] nums) {

        int min = nums[0];
        int index = 0;

        for (int i = 1; i < nums.length; i++) {

            if (nums[i] < min) {
                min = nums[i];
                index = i;
            }
        }

        return index;
    }
}
```

### Time

```text
O(n)
```

### Space

```text
O(1)
```

---

## Optimal

```java
class Solution {
    public int findKRotation(int[] nums) {

        int low = 0;
        int high = nums.length - 1;

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] > nums[high]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }
}
```

---

## Pattern to Remember

```text
How many rotations?

↓
Where is the minimum?

↓
Index of minimum = number of rotations
```

This is a good example of transforming a problem.

---

# 12. Single Element in a Sorted Array

## Problem

Every element appears twice except one element.

Example:

```text
[1, 1, 2, 2, 3, 4, 4, 5, 5]
```

Answer:

```text
3
```

---

# Brute Force

Check every element.

```java
class Solution {
    public int singleNonDuplicate(int[] nums) {

        for (int i = 0; i < nums.length; i++) {

            boolean leftSame =
                i > 0 && nums[i] == nums[i - 1];

            boolean rightSame =
                i < nums.length - 1 &&
                nums[i] == nums[i + 1];

            if (!leftSame && !rightSame) {
                return nums[i];
            }
        }

        return -1;
    }
}
```

### Time

```text
O(n)
```

### Space

```text
O(1)
```

---

# Better Approach: XOR

Because:

```text
a ^ a = 0
```

and:

```text
a ^ 0 = a
```

All pairs cancel.

```java
class Solution {
    public int singleNonDuplicate(int[] nums) {

        int xor = 0;

        for (int num : nums) {
            xor ^= num;
        }

        return xor;
    }
}
```

### Time

```text
O(n)
```

### Space

```text
O(1)
```

This doesn't improve time complexity, but it gives a simpler logical approach.

---

# Optimal: Binary Search

This problem has a beautiful observation.

Before the single element:

```text
pairs start at even indices
```

Example:

```text
Index:  0  1  2  3  4  5  6  7  8
Array: [1, 1, 2, 2, 3, 4, 4, 5, 5]
```

Before `3`:

```text
1 starts at 0 → even
2 starts at 2 → even
```

After the single element:

```text
4 starts at 5 → odd
5 starts at 7 → odd
```

The single element shifts the pair structure.

---

## Easier observation

If `mid` is odd, make it even:

```java
if (mid % 2 == 1) {
    mid--;
}
```

Now `mid` always points to the expected first element of a pair.

Check:

```text
nums[mid] == nums[mid + 1]
```

### If true

The pair is correct.

So the single element must be after it.

```java
low = mid + 2;
```

### If false

The pair structure is broken.

The single element is at `mid` or before it.

```java
high = mid;
```

---

## Code

```java
class Solution {
    public int singleNonDuplicate(int[] nums) {

        int low = 0;
        int high = nums.length - 1;

        while (low < high) {

            int mid = low + (high - low) / 2;

            // Make mid even
            if (mid % 2 == 1) {
                mid--;
            }

            if (nums[mid] == nums[mid + 1]) {

                low = mid + 2;

            } else {

                high = mid;
            }
        }

        return nums[low];
    }
}
```

---

## Pattern to Remember

```text
Sorted array
+
Pairs
+
One element breaks pairing pattern

↓
Find where the index pattern changes
```

This is Binary Search on a structural property.

---

# 13. Find Peak Element

## Problem

A peak element is greater than its neighbors.

Example:

```text
[1, 2, 3, 1]
```

Answer:

```text
index 2
```

Because:

```text
3 > 2
3 > 1
```

---

## Brute Force

Check every element.

```java
class Solution {
    public int findPeakElement(int[] nums) {

        int n = nums.length;

        for (int i = 0; i < n; i++) {

            boolean left =
                i == 0 || nums[i] > nums[i - 1];

            boolean right =
                i == n - 1 || nums[i] > nums[i + 1];

            if (left && right) {
                return i;
            }
        }

        return -1;
    }
}
```

### Time

```text
O(n)
```

### Space

```text
O(1)
```

---

# Optimal: Binary Search

The key question is:

> Which direction should we move?

Compare:

```text
nums[mid]
```

with:

```text
nums[mid + 1]
```

### Case 1

```text
nums[mid] < nums[mid + 1]
```

Example:

```text
2 < 3
```

We are going uphill:

```text
2 → 3
```

A peak must exist on the right.

So:

```java
low = mid + 1;
```

---

### Case 2

```text
nums[mid] > nums[mid + 1]
```

Example:

```text
5 > 3
```

We are going downhill.

A peak could be `mid` or exist on the left.

So:

```java
high = mid;
```

---

## Code

```java
class Solution {
    public int findPeakElement(int[] nums) {

        int low = 0;
        int high = nums.length - 1;

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (nums[mid] < nums[mid + 1]) {

                low = mid + 1;

            } else {

                high = mid;
            }
        }

        return low;
    }
}
```

---

## Why does this work?

Imagine you're standing on a mountain.

```text
1 → 2 → 3 → 5 → 4 → 2
```

If you're moving upward:

```text
nums[mid] < nums[mid + 1]
```

Then continue right.

Eventually you must reach a peak.

If you're moving downward:

```text
nums[mid] > nums[mid + 1]
```

Then `mid` might already be a peak, so keep it.

---

## Pattern to Remember

```text
Compare neighbors

Going uphill?
→ Search uphill

Going downhill?
→ Peak is here or behind
```

---

# 14. Find Square Root of a Number

## Problem

Find:

$$
\lfloor \sqrt{x} \rfloor
$$

Example:

```text
x = 28
```

Square root:

```text
√28 ≈ 5.29
```

Answer:

```text
5
```

---

## Brute Force

Try every number.

```java
class Solution {
    public int sqrt(int x) {

        int ans = 0;

        for (int i = 1; i <= x; i++) {

            if ((long) i * i <= x) {
                ans = i;
            } else {
                break;
            }
        }

        return ans;
    }
}
```

### Time

Worst case:

```text
O(√x)
```

Because we stop once:

```text
i² > x
```

### Space

```text
O(1)
```

---

# Optimal: Binary Search on the Answer

Notice something.

We are not searching inside an array.

We are searching possible answers:

```text
1, 2, 3, 4, 5, ...
```

For `x = 28`:

```text
Possible answers:

1 2 3 4 5 6 ... 28
```

Check:

```text
5² = 25 ≤ 28 → valid
6² = 36 > 28 → invalid
```

We need:

> The largest valid answer.

This is Binary Search on Answer.

---

## Code

```java
class Solution {
    public int mySqrt(int x) {

        if (x == 0 || x == 1) {
            return x;
        }

        int low = 1;
        int high = x;
        int ans = 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            long square = (long) mid * mid;

            if (square <= x) {

                ans = mid;
                low = mid + 1;

            } else {

                high = mid - 1;
            }
        }

        return ans;
    }
}
```

---

## Dry Run: x = 28

```text
low = 1
high = 28
```

### Mid = 14

```text
14² = 196
```

Too large.

```text
high = 13
```

### Mid = 7

```text
7² = 49
```

Too large.

```text
high = 6
```

### Mid = 3

```text
3² = 9
```

Valid.

```text
ans = 3
low = 4
```

### Mid = 5

```text
5² = 25
```

Valid.

```text
ans = 5
low = 6
```

### Mid = 6

```text
6² = 36
```

Invalid.

```text
high = 5
```

Loop ends.

Answer:

```text
5
```

---

# 15. Find Nth Root of a Number

## Problem

Find integer `x` such that:

$$
x^n = m
$$

Example:

```text
n = 3
m = 27
```

Find:

```text
x
```

Because:

```text
3³ = 27
```

Answer:

```text
3
```

If no integer root exists:

```text
n = 3
m = 28
```

Answer:

```text
-1
```

---

# Brute Force

Try all possible numbers.

```java
class Solution {
    public int nthRoot(int n, int m) {

        for (int i = 1; i <= m; i++) {

            long power = 1;

            for (int j = 0; j < n; j++) {
                power *= i;
            }

            if (power == m) {
                return i;
            }

            if (power > m) {
                break;
            }
        }

        return -1;
    }
}
```

### Time Complexity

Outer loop:

```text
up to approximately m^(1/n)
```

Inner loop:

```text
n
```

So roughly:

```text
O(n × m^(1/n))
```

### Space

```text
O(1)
```

---

# Optimal: Binary Search on Answer

Again, there is no array.

We search possible answers:

```text
1, 2, 3, ..., m
```

For each possible answer:

```text
mid
```

Calculate:

$$
mid^n
$$

Then:

```text
mid^n == m
→ answer found

mid^n < m
→ need larger number

mid^n > m
→ need smaller number
```

---

## Code

```java
class Solution {

    public int nthRoot(int n, int m) {

        int low = 1;
        int high = m;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            long value = power(mid, n, m);

            if (value == m) {
                return mid;
            }

            else if (value < m) {
                low = mid + 1;
            }

            else {
                high = mid - 1;
            }
        }

        return -1;
    }

    private long power(int base, int exponent, int limit) {

        long result = 1;

        for (int i = 0; i < exponent; i++) {

            result *= base;

            // Prevent unnecessary overflow
            if (result > limit) {
                return result;
            }
        }

        return result;
    }
}
```

---

## Why Binary Search works here?

Because the function:

$$
x^n
$$

is monotonic for positive integers.

```text
1³ = 1
2³ = 8
3³ = 27
4³ = 64
5³ = 125
```

As `x` increases:

```text
xⁿ increases
```

Therefore:

```text
Too small → move right
Too large → move left
```

This monotonic behavior allows Binary Search.

---

# Part 2 Pattern Summary

## Pattern 1: Rotated Sorted Array

Questions:

```text
8. Search in Rotated Sorted Array I
9. Search in Rotated Sorted Array II
10. Find Minimum
11. Rotation Count
```

Mental model:

```text
Array is rotated
↓
Find structural information
↓
At least one half is sorted
OR
Find the rotation point
```

---

## Pattern 2: Structural Break

Questions:

```text
10. Find Minimum
11. Rotation Count
12. Single Element
```

Mental model:

```text
There is a predictable pattern
↓
Something breaks that pattern
↓
Binary Search the breaking point
```

Examples:

```text
Rotated Array:
sorted order breaks at minimum

Single Element:
pair index pattern breaks at unique element
```

---

## Pattern 3: Binary Search Using Neighbor Comparison

Question:

```text
13. Find Peak Element
```

Mental model:

```text
Compare current element with neighbor

Increasing?
→ go right

Decreasing?
→ go left / keep mid
```

---

## Pattern 4: Binary Search on Answer

Questions:

```text
14. Square Root
15. Nth Root
```

Mental model:

```text
No sorted array?

Ask:

Can I search the possible answers?
```

Then:

```text
Possible answer
↓
Check if valid
↓
Too small → right
Too large → left
```

The requirement is usually:

> There must be a monotonic relationship.

For example:

```text
mid² <= x

True True True True False False
```

That transition allows Binary Search.

---

# The Most Important Lesson From Part 2

Binary Search does **not** require a normal sorted array.

You can use Binary Search whenever you can create a search space where one condition behaves predictably:

```text
True True True False False
```

or:

```text
Too Small → Too Small → Correct → Too Large → Too Large
```

The main question to ask is:

> **What property changes monotonically as my answer increases?**

If you can answer that, there is a good chance Binary Search can be used.
# Part 3: Binary Search on Answers

This part covers one of the most important Binary Search patterns.

Unlike normal Binary Search:

```text
Search for a target in a sorted array
```

Here we do:

```text
Search for the best possible answer
```

The questions are:

1. Koko Eating Bananas
2. Minimum Days to Make M Bouquets
3. Find the Smallest Divisor
4. Capacity to Ship Packages Within D Days
5. Kth Missing Positive Number
6. Aggressive Cows
7. Book Allocation Problem
8. Split Array - Largest Sum
9. Painter's Partition
10. Minimize Max Distance to Gas Station
11. Kth Element of 2 Sorted Arrays
12. Find Row with Maximum 1's
13. Search in a 2D Matrix
14. Search in 2D Matrix - II
15. Find Peak Element - II
16. Matrix Median

We'll divide these into patterns.

---

# Part 3A: Binary Search on Answer

Questions:

```text
1. Koko Eating Bananas
2. Minimum Days to Make M Bouquets
3. Find the Smallest Divisor
4. Capacity to Ship Packages Within D Days
6. Aggressive Cows
7. Book Allocation
8. Split Array - Largest Sum
9. Painter's Partition
10. Minimize Max Distance to Gas Station
```

The core pattern:

```text
Possible answers
        ↓
Can this answer work?
        ↓
YES → maybe try smaller
NO  → need larger
```

---

# 1. Koko Eating Bananas

## Problem

Koko has banana piles:

```text
[3, 6, 7, 11]
```

She has:

```text
h = 8 hours
```

She can choose an eating speed `k`.

If:

```text
k = 1
```

She eats 1 banana per hour.

If:

```text
k = 4
```

She eats 4 bananas per hour.

We need to find:

> The minimum eating speed so she can finish within `h` hours.

---

## First thought: Try every possible speed

Possible speeds:

```text
1 → 11
```

Because the maximum pile is 11.

For every speed, calculate required hours.

Example:

```text
piles = [3, 6, 7, 11]
speed = 4
```

Hours:

```text
3 / 4 → 1 hour
6 / 4 → 2 hours
7 / 4 → 2 hours
11 / 4 → 3 hours
```

Total:

```text
1 + 2 + 2 + 3 = 8
```

So speed `4` works.

---

## Important: Ceiling Division

We need:

```java
Math.ceil((double)pile / speed)
```

But in integer math:

```java
(pile + speed - 1) / speed
```

Example:

```text
7 bananas
speed = 4

7 / 4 = 1.75

Need 2 hours
```

Integer formula:

```text
(7 + 4 - 1) / 4
= 10 / 4
= 2
```

---

## Brute Force

```java
class Solution {

    public int minEatingSpeed(int[] piles, int h) {

        int max = 0;

        for (int pile : piles) {
            max = Math.max(max, pile);
        }

        for (int speed = 1; speed <= max; speed++) {

            int hours = calculateHours(piles, speed);

            if (hours <= h) {
                return speed;
            }
        }

        return max;
    }

    private int calculateHours(int[] piles, int speed) {

        int hours = 0;

        for (int pile : piles) {
            hours += (pile + speed - 1) / speed;
        }

        return hours;
    }
}
```

### Time Complexity

We try up to `maxPile` speeds.

For every speed, traverse `n` piles.

```text
O(maxPile × n)
```

### Space Complexity

```text
O(1)
```

---

## Optimal: Binary Search

Look at the possible answers:

```text
Speed:

1  2  3  4  5  6  7 ...
```

Suppose:

```text
1 → doesn't work
2 → doesn't work
3 → doesn't work
4 → works
5 → works
6 → works
7 → works
```

So the pattern becomes:

```text
False False False True True True True
```

This is perfect for Binary Search.

We want:

> The first `True`.

---

## Code

```java
class Solution {

    public int minEatingSpeed(int[] piles, int h) {

        int low = 1;
        int high = 0;

        for (int pile : piles) {
            high = Math.max(high, pile);
        }

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (canFinish(piles, h, mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    private boolean canFinish(int[] piles, int h, int speed) {

        int hours = 0;

        for (int pile : piles) {

            hours += (pile + speed - 1) / speed;
        }

        return hours <= h;
    }
}
```

---

## Pattern

```text
Minimum possible answer

Does speed work?

NO  → increase speed
YES → try smaller speed
```

---

# 2. Minimum Days to Make M Bouquets

## Problem

Example:

```text
bloomDay = [1, 10, 3, 10, 2]

m = 3
k = 1
```

We need:

```text
3 bouquets
```

Each bouquet needs:

```text
k adjacent flowers
```

For `k = 1`, we need any 3 flowers.

Find the minimum number of days.

---

## Example

```text
Day 1:

[1, 10, 3, 10, 2]

Bloomed:

[✓, X, X, X, X]

Bouquets = 1
```

Day 2:

```text
[✓, X, X, X, ✓]

Bouquets = 2
```

Day 3:

```text
[✓, X, ✓, X, ✓]

Bouquets = 3
```

Answer:

```text
3 days
```

---

## Search Space

What are possible answers?

Minimum day:

```text
minimum bloomDay
```

Maximum day:

```text
maximum bloomDay
```

So:

```text
low = minimum bloom day
high = maximum bloom day
```

For every day, ask:

> Can I make `m` bouquets?

---

## Monotonic Property

```text
Day 1 → Cannot
Day 2 → Cannot
Day 3 → Can
Day 4 → Can
Day 5 → Can
...
```

Again:

```text
False False True True True
```

Find first `True`.

---

## Checking if a day works

Example:

```text
bloomDay = [1, 10, 3, 10, 2]

day = 3
k = 1
```

Scan:

```text
1 <= 3 → flower available
```

Count consecutive flowers.

When:

```text
count == k
```

Make one bouquet:

```java
bouquets++;
count = 0;
```

---

## Code

```java
class Solution {

    public int minDays(int[] bloomDay, int m, int k) {

        if ((long) m * k > bloomDay.length) {
            return -1;
        }

        int low = Integer.MAX_VALUE;
        int high = Integer.MIN_VALUE;

        for (int day : bloomDay) {
            low = Math.min(low, day);
            high = Math.max(high, day);
        }

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (canMake(bloomDay, m, k, mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    private boolean canMake(int[] bloomDay, int m, int k, int day) {

        int bouquets = 0;
        int consecutive = 0;

        for (int bloom : bloomDay) {

            if (bloom <= day) {

                consecutive++;

                if (consecutive == k) {
                    bouquets++;
                    consecutive = 0;
                }

            } else {
                consecutive = 0;
            }
        }

        return bouquets >= m;
    }
}
```

---

# 3. Find the Smallest Divisor

## Problem

Given:

```text
nums = [1, 2, 5, 9]

threshold = 6
```

Find the smallest divisor such that:

```text
ceil(1/divisor)
+
ceil(2/divisor)
+
ceil(5/divisor)
+
ceil(9/divisor)

<= threshold
```

---

## Example

Try divisor:

```text
divisor = 5
```

```text
ceil(1/5) = 1
ceil(2/5) = 1
ceil(5/5) = 1
ceil(9/5) = 2

Total = 5
```

Since:

```text
5 <= 6
```

It works.

But we need:

> The smallest divisor that works.

---

## Important Observation

As divisor increases:

```text
divisor ↑
sum ↓
```

Example:

```text
divisor = 1 → sum = large
divisor = 2 → sum = smaller
divisor = 3 → sum = smaller
```

So:

```text
False False False True True True
```

Again Binary Search.

---

## Code

```java
class Solution {

    public int smallestDivisor(int[] nums, int threshold) {

        int low = 1;
        int high = 0;

        for (int num : nums) {
            high = Math.max(high, num);
        }

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (isValid(nums, threshold, mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    private boolean isValid(int[] nums, int threshold, int divisor) {

        int sum = 0;

        for (int num : nums) {

            sum += (num + divisor - 1) / divisor;
        }

        return sum <= threshold;
    }
}
```

---

# 4. Capacity to Ship Packages Within D Days

## Problem

```text
weights = [1,2,3,4,5,6,7,8,9,10]

days = 5
```

Find the minimum ship capacity.

---

## Important Constraint

Packages must be shipped in order.

Suppose capacity:

```text
15
```

Day 1:

```text
1 + 2 + 3 + 4 + 5 = 15
```

Day 2:

```text
6 + 7 = 13
```

And so on.

---

## Search Space

Minimum capacity:

```text
maximum element
```

Why?

Because at least the heaviest package must fit.

```text
low = max(weights)
```

Maximum capacity:

```text
sum of all weights
```

Because we can ship everything in one day.

```text
high = sum(weights)
```

---

## Check a capacity

Suppose:

```text
capacity = 15
```

Traverse weights.

If adding a package exceeds capacity:

```text
Start new day
```

Example:

```text
current = 10
next = 6

10 + 6 > 15

→ new day
```

Count required days.

If:

```text
requiredDays <= D
```

Then capacity works.

---

## Code

```java
class Solution {

    public int shipWithinDays(int[] weights, int days) {

        int low = 0;
        int high = 0;

        for (int weight : weights) {
            low = Math.max(low, weight);
            high += weight;
        }

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (canShip(weights, days, mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    private boolean canShip(int[] weights, int days, int capacity) {

        int requiredDays = 1;
        int currentWeight = 0;

        for (int weight : weights) {

            if (currentWeight + weight > capacity) {

                requiredDays++;
                currentWeight = 0;
            }

            currentWeight += weight;
        }

        return requiredDays <= days;
    }
}
```

---

# 5. Kth Missing Positive Number

This one is slightly different.

## Problem

```text
arr = [2, 3, 4, 7, 11]

k = 5
```

Missing positive numbers:

```text
1, 5, 6, 8, 9, 10, ...
```

5th missing number:

```text
9
```

---

## Key Observation

At index `i`, expected number without missing elements:

```text
i + 1
```

Actual number:

```text
arr[i]
```

So missing numbers before index `i`:

```text
arr[i] - (i + 1)
```

---

## Example

```text
Index:  0  1  2  3  4
Array: [2, 3, 4, 7, 11]
```

Calculate missing count:

```text
index 0:

2 - 1 = 1 missing
```

```text
index 1:

3 - 2 = 1 missing
```

```text
index 2:

4 - 3 = 1 missing
```

```text
index 3:

7 - 4 = 3 missing
```

```text
index 4:

11 - 5 = 6 missing
```

So:

```text
Missing count:

1, 1, 1, 3, 6
```

We need:

```text
k = 5
```

We want the first position where missing count becomes at least `5`.

---

## Optimal Code

```java
class Solution {

    public int findKthPositive(int[] arr, int k) {

        int low = 0;
        int high = arr.length - 1;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            int missing = arr[mid] - (mid + 1);

            if (missing < k) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return low + k;
    }
}
```

---

## Why `low + k`?

After Binary Search:

```text
low = number of elements before answer
```

Normally, without missing elements:

```text
answer = low
```

But `k` numbers are missing.

So:

```text
answer = low + k
```

This is a useful formula to understand, not memorize blindly.

---

# 6. Aggressive Cows

## Problem

You have stall positions:

```text
[1, 2, 4, 8, 9]
```

Place:

```text
3 cows
```

Maximize the minimum distance between cows.

---

## Example

Place cows:

```text
1, 4, 8
```

Distances:

```text
3 and 4
```

Minimum distance:

```text
3
```

Can we achieve minimum distance `4`?

Try:

```text
1 → 8
```

Then next would need to be:

```text
12
```

Doesn't exist.

So answer:

```text
3
```

---

## Important Change

Most previous problems asked:

> Find minimum possible answer.

This asks:

> Find maximum possible answer.

---

## Search Space

Minimum possible distance:

```text
1
```

Maximum:

```text
last position - first position
```

---

## Feasibility Function

Ask:

> Can I place all cows such that minimum distance is at least `mid`?

If yes:

```text
Try larger distance
```

If no:

```text
Try smaller distance
```

Pattern:

```text
True True True True False False
```

We want the last `True`.

---

## Code

```java
import java.util.Arrays;

class Solution {

    public int aggressiveCows(int[] stalls, int k) {

        Arrays.sort(stalls);

        int low = 1;
        int high = stalls[stalls.length - 1] - stalls[0];
        int answer = 0;

        while (low <= high) {

            int mid = low + (high - low) / 2;

            if (canPlace(stalls, k, mid)) {

                answer = mid;
                low = mid + 1;

            } else {

                high = mid - 1;
            }
        }

        return answer;
    }

    private boolean canPlace(int[] stalls, int cows, int distance) {

        int count = 1;
        int lastPosition = stalls[0];

        for (int i = 1; i < stalls.length; i++) {

            if (stalls[i] - lastPosition >= distance) {

                count++;
                lastPosition = stalls[i];
            }
        }

        return count >= cows;
    }
}
```

---

# 7. Book Allocation Problem

## Problem

Books:

```text
[12, 34, 67, 90]
```

Students:

```text
2
```

Each student gets contiguous books.

Minimize the maximum pages assigned to any student.

---

## Possible division

```text
Student 1: [12, 34, 67]
Student 2: [90]

Maximum = 113
```

Another:

```text
Student 1: [12, 34]
Student 2: [67, 90]

Maximum = 157
```

Best answer:

```text
113
```

---

## Search Space

Minimum possible maximum:

```text
max(arr)
```

Because one student must read the largest book.

Maximum possible:

```text
sum(arr)
```

One student reads everything.

---

## Check Function

Suppose maximum allowed pages:

```text
mid = 113
```

Keep adding books.

If:

```text
currentPages + book > mid
```

Give the next book to another student.

Count students.

If:

```text
students <= m
```

Then `mid` works.

---

## Code

```java
class Solution {

    public int findPages(int[] arr, int n, int m) {

        if (m > n) {
            return -1;
        }

        int low = 0;
        int high = 0;

        for (int pages : arr) {
            low = Math.max(low, pages);
            high += pages;
        }

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (canAllocate(arr, m, mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    private boolean canAllocate(int[] arr, int students, int maxPages) {

        int requiredStudents = 1;
        int currentPages = 0;

        for (int pages : arr) {

            if (currentPages + pages > maxPages) {

                requiredStudents++;
                currentPages = 0;
            }

            currentPages += pages;
        }

        return requiredStudents <= students;
    }
}
```

---

# 8. Split Array - Largest Sum

This is almost the same as Book Allocation.

## Problem

```text
nums = [7, 2, 5, 10, 8]

k = 2
```

Split into 2 subarrays.

Minimize the largest subarray sum.

Possible:

```text
[7, 2, 5] | [10, 8]

14          18

Largest = 18
```

Answer:

```text
18
```

---

## Pattern

```text
Book Allocation
=
Split Array Largest Sum
=
Capacity Partitioning
```

The story changes.

The algorithm remains almost identical.

---

## Code

```java
class Solution {

    public int splitArray(int[] nums, int k) {

        int low = 0;
        int high = 0;

        for (int num : nums) {
            low = Math.max(low, num);
            high += num;
        }

        while (low < high) {

            int mid = low + (high - low) / 2;

            if (canSplit(nums, k, mid)) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        return low;
    }

    private boolean canSplit(int[] nums, int k, int maxSum) {

        int subarrays = 1;
        int currentSum = 0;

        for (int num : nums) {

            if (currentSum + num > maxSum) {

                subarrays++;
                currentSum = 0;
            }

            currentSum += num;
        }

        return subarrays <= k;
    }
}
```

---

# 9. Painter's Partition

Again, same pattern.

## Story

Boards:

```text
[10, 20, 30, 40]
```

Painters:

```text
2
```

Each painter paints contiguous boards.

Find the minimum possible maximum workload.

---

## Example

```text
Painter 1:

[10, 20, 30]

Total = 60
```

```text
Painter 2:

[40]

Total = 40
```

Maximum workload:

```text
60
```

---

## Pattern

```text
Book Allocation
        =
Split Array
        =
Painter's Partition
```

All are:

> Divide an array into `k` contiguous parts while minimizing the maximum sum.

---

## Generic Template

```java
int low = maxElement;
int high = totalSum;

while (low < high) {

    int mid = low + (high - low) / 2;

    if (possible(mid)) {
        high = mid;
    } else {
        low = mid + 1;
    }
}
```

---

# 10. Minimize Max Distance to Gas Station

This one is slightly harder.

## Problem

Existing stations:

```text
[1, 2, 3, 4, 5]
```

You can add:

```text
k new stations
```

Goal:

> Minimize the maximum distance between adjacent gas stations.

---

## Example

Suppose we have:

```text
1 ----------- 10
```

Distance:

```text
9
```

Add one station at:

```text
5.5
```

Now:

```text
1 ---- 5.5 ---- 10
```

Maximum distance:

```text
4.5
```

---

## Binary Search on Distance

Instead of asking:

```text
Which position should I put the station?
```

Ask:

> Is maximum distance `mid` possible?

Example:

```text
distance = 3
```

For every gap, calculate how many stations are required.

If a gap is:

```text
10
```

and allowed maximum distance is:

```text
3
```

We need to split it.

---

## Feasibility

If required stations:

```text
<= k
```

Then distance works.

Try smaller distance.

If:

```text
> k
```

Then impossible.

Try larger distance.

---

## Why Floating Point?

The answer can be:

```text
4.5
```

So integer Binary Search won't work.

Use:

```java
double low
double high
```

Repeat until precision is small enough.

---

## Pattern Summary

```text
Maximum gap too large?
        ↓
Add stations

Can we achieve max gap <= mid?
        ↓
YES → smaller distance
NO  → larger distance
```

---

# Complexity Pattern for Binary Search on Answer

Most of these problems follow:

```text
Binary Search iterations:
O(log(search space))
```

For every iteration:

```text
Traverse array:
O(n)
```

Total:

```text
O(n × log(search space))
```

---

# How to Recognize Binary Search on Answer

When you see phrases like:

```text
Minimum possible...
Maximum possible...
Smallest...
Largest...
At least...
At most...
Within D days...
Minimum speed...
Maximum distance...
```

Ask:

### Step 1

```text
What are all possible answers?
```

### Step 2

```text
Can I check if one answer is possible?
```

### Step 3

```text
If an answer works, what happens to larger answers?
```

For example Koko:

```text
Speed = 1 → no
Speed = 2 → no
Speed = 3 → no
Speed = 4 → yes
Speed = 5 → yes
Speed = 6 → yes
```

Monotonic:

```text
F F F T T T
```

Binary Search.

---

# Part 3 Remaining Patterns

The remaining questions belong to different categories:

### Binary Search on Two Sorted Arrays

```text
11. Kth Element of 2 Sorted Arrays
```

### Binary Search on Matrix

```text
12. Find Row with Maximum 1's
13. Search in a 2D Matrix
14. Search in 2D Matrix II
15. Find Peak Element II
16. Matrix Median
```

These should be treated as a separate section because the intuition is different.

---

## Master Pattern Map So Far

```text
BINARY SEARCH
│
├── Part 1
│   └── Basic Binary Search & Boundaries
│
├── Part 2
│   ├── Rotated Arrays
│   ├── Structural Break
│   ├── Peak Problems
│   └── Binary Search on Answer Basics
│
└── Part 3
    ├── Minimum Valid Answer
    │   ├── Koko
    │   ├── Bouquets
    │   ├── Smallest Divisor
    │   └── Shipping Capacity
    │
    ├── Maximum Valid Answer
    │   └── Aggressive Cows
    │
    ├── Array Partitioning
    │   ├── Book Allocation
    │   ├── Split Array
    │   └── Painter's Partition
    │
    ├── Missing Number Pattern
    │   └── Kth Missing Positive
    │
    └── Floating Point Binary Search
        └── Gas Stations
```

The biggest thing to understand from this part is:

> **Binary Search is not about arrays. It is about eliminating half of a monotonic search space.**

For these problems, the search space is usually:

```text
Possible speed
Possible days
Possible divisor
Possible capacity
Possible distance
Possible answer
```

That is the main shift in thinking.
