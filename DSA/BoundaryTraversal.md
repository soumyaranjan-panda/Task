Yes. For an interview, don't just explain the code. Explain **what boundary traversal means, how you divide the problem, and why the order is correct**.

## Boundary Traversal — Interview Notes

### 1. What is boundary traversal?

Boundary traversal means traversing the nodes on the **boundary of a binary tree in anti-clockwise order**.

The boundary consists of 4 parts:

```text
1. Root
2. Left boundary
3. Leaf nodes
4. Right boundary in reverse
```

Example:

```text
             1
           /   \
          2     3
         / \   / \
        4   5 6   7
```

Boundary traversal:

```text
1 → 2 → 4 → 5 → 6 → 7 → 3
```

Notice that the leaf nodes are included separately.

---

# 2. The main idea

I would break the problem into **three helper functions**:

```text
boundary()
    |
    ├── leftBoundary()
    |
    ├── leafNode()
    |
    └── rightBoundary()
```

The final result is:

```text
root
+ left boundary
+ leaves
+ reversed right boundary
```

---

# 3. Why do we exclude leaf nodes from left/right boundary?

This is very important in an interview.

Suppose:

```text
       1
      /
     2
    /
   3
```

Here `3` is both:

* part of the left boundary
* a leaf

If `leftBoundary()` adds `3` and `leafNode()` also adds `3`, we'd get:

```text
1 2 3 3
```

So when processing the left and right boundaries, we **stop when we reach a leaf**.

```java
if (root == null || 
    (root.left == null && root.right == null)) {
    return;
}
```

The leaves are handled separately.

---

# 4. Left boundary

The left boundary means:

> Start from `root.left` and keep going down, preferring the left child. If there is no left child, go to the right child.

For example:

```text
       1
      /
     2
      \
       4
        \
         5
```

The left boundary is:

```text
2 → 4 → 5
```

So this is **wrong**:

```java
leftBoundary(root.left);
```

if inside we always do:

```java
leftBoundary(root.left);
```

because `2.left == null`.

Instead:

```java
if (root.left != null) {
    leftBoundary(root.left, res);
} else {
    leftBoundary(root.right, res);
}
```

### Interview explanation

You can say:

> "For the left boundary, I prefer the left child. But if the left child doesn't exist, I move to the right child because that node can still be part of the boundary."

---

# 5. Right boundary

It's the mirror image.

For the right boundary:

> Prefer the right child. If the right child doesn't exist, go to the left child.

```java
if (root.right != null) {
    rightBoundary(root.right, res);
} else {
    rightBoundary(root.left, res);
}
```

But there is one extra thing.

The right boundary needs to appear **bottom-up**.

For example:

```text
    1
     \
      2
       \
        3
```

We collect:

```text
2 → 3
```

But boundary traversal requires:

```text
3 → 2
```

So we can either:

* recurse and add while returning, or
* collect normally and reverse the list.

Your approach uses:

```java
Collections.reverse(rightList);
```

which is perfectly fine.

---

# 6. Leaf nodes

Now we collect **every leaf from left to right**.

A leaf is simply:

```java
root.left == null && root.right == null
```

So:

```java
public void leafNode(TreeNode root, List<Integer> leafs) {
    if (root == null) return;

    if (root.left == null && root.right == null) {
        leafs.add(root.data);
        return;
    }

    leafNode(root.left, leafs);
    leafNode(root.right, leafs);
}
```

The `return` is useful because once we've found a leaf, there is no point trying to traverse its children.

---

# 7. Complete solution

```java
class Solution {
    public List<Integer> boundary(TreeNode root) {

        List<Integer> res = new ArrayList<>();

        if (root == null) {
            return res;
        }

        // Root
        res.add(root.data);

        // If root itself is a leaf
        if (root.left == null && root.right == null) {
            return res;
        }

        // Left boundary
        leftBoundary(root.left, res);

        // All leaf nodes
        leafNode(root, res);

        // Right boundary
        List<Integer> rightList = new ArrayList<>();
        rightBoundary(root.right, rightList);

        // Right boundary should be bottom-up
        Collections.reverse(rightList);

        res.addAll(rightList);

        return res;
    }


    private void leftBoundary(TreeNode root, List<Integer> res) {

        if (root == null ||
            (root.left == null && root.right == null)) {
            return;
        }

        res.add(root.data);

        if (root.left != null) {
            leftBoundary(root.left, res);
        } else {
            leftBoundary(root.right, res);
        }
    }


    private void rightBoundary(TreeNode root, List<Integer> res) {

        if (root == null ||
            (root.left == null && root.right == null)) {
            return;
        }

        res.add(root.data);

        if (root.right != null) {
            rightBoundary(root.right, res);
        } else {
            rightBoundary(root.left, res);
        }
    }


    private void leafNode(TreeNode root, List<Integer> res) {

        if (root == null) {
            return;
        }

        if (root.left == null && root.right == null) {
            res.add(root.data);
            return;
        }

        leafNode(root.left, res);
        leafNode(root.right, res);
    }
}
```

---

# 8. How I'd explain it in an actual interview

You can say this almost word-for-word:

> "I'll solve this by dividing the boundary into three parts: the left boundary, all the leaf nodes, and the right boundary."
>
> "First, I'll add the root. Then I'll traverse the left boundary, excluding leaf nodes because I'll add all leaves separately."
>
> "For the left boundary, I prefer the left child. If the left child doesn't exist, I go to the right child. This is important because the boundary doesn't necessarily consist only of left children."
>
> "Then I'll do a DFS to collect all leaf nodes from left to right."
>
> "For the right boundary, I'll use the mirror logic: prefer the right child, otherwise go to the left child. I'll collect those nodes top-down and reverse them at the end because the boundary has to be traversed bottom-up on the right side."
>
> "Finally, I concatenate root, left boundary, leaves, and reversed right boundary."

That's a strong interview explanation because you're explaining **the reasoning**, not just reading the code.

---

# 9. Complexity

Let `N` be the number of nodes.

### Time

Each node is visited at most a constant number of times:

```text
Left boundary  → O(N)
Leaves         → O(N)
Right boundary → O(N)
```

Therefore:

```text
Time = O(N)
```

### Space

We store the answer:

```text
O(N)
```

And recursion can go as deep as the height of the tree:

```text
O(H)
```

So auxiliary recursion space is:

```text
O(H)
```

Overall, including the result:

```text
O(N)
```

---

## 10. Things to remember for interviews

The easiest way to remember the whole problem:

```text
BOUNDARY =

        ROOT
          ↓
   LEFT BOUNDARY
          ↓
      ALL LEAVES
          ↓
   RIGHT BOUNDARY ← REVERSE
```

And the two boundary rules:

```text
LEFT  → prefer LEFT, otherwise RIGHT

RIGHT → prefer RIGHT, otherwise LEFT
```

And:

> **Never add leaves in the left/right boundary functions. Add them separately.**

That's the key idea behind the whole problem.
