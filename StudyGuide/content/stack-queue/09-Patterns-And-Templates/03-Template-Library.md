# Template Library

Fifteen reusable Java templates. Each is a complete, compilable class or method that preserves the core logic of the pattern, so you can paste it and adapt it instead of recalling it from memory. The purpose line tells you when to reach for it.

## 1. Basic Stack

**Purpose.** LIFO storage; use whenever the most recent unresolved item is handled first.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class BasicStack {
    private final Deque<Integer> stack = new ArrayDeque<>();

    void push(int x) {
        stack.push(x);
    }

    int pop() {
        return stack.pop();
    }

    int peek() {
        return stack.peek();
    }

    boolean isEmpty() {
        return stack.isEmpty();
    }
}
```

## 2. Basic Queue

**Purpose.** FIFO storage; use whenever items must be processed in arrival order.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class BasicQueue {
    private final Deque<Integer> queue = new ArrayDeque<>();

    void offer(int x) {
        queue.offer(x);
    }

    int poll() {
        return queue.poll();
    }

    int peek() {
        return queue.peek();
    }

    boolean isEmpty() {
        return queue.isEmpty();
    }
}
```

## 3. Stack using Queue

**Purpose.** Make the newest item land at the front of a FIFO structure so `poll` acts like `pop`.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class StackUsingQueue {
    private final Deque<Integer> queue = new ArrayDeque<>();

    void push(int x) {
        queue.offer(x);
        int size = queue.size();

        for (int i = 0; i < size - 1; i++) {
            queue.offer(queue.poll());
        }
    }

    int pop() {
        return queue.poll();
    }

    int peek() {
        return queue.peek();
    }

    boolean isEmpty() {
        return queue.isEmpty();
    }
}
```

## 4. Queue using Stack

**Purpose.** Produce FIFO from LIFO primitives by reversing the order twice across two stacks.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class QueueUsingStack {
    private final Deque<Integer> in = new ArrayDeque<>();
    private final Deque<Integer> out = new ArrayDeque<>();

    void offer(int x) {
        in.push(x);

        if (out.isEmpty()) {
            while (!in.isEmpty()) {
                out.push(in.pop());
            }
        }
    }

    int poll() {
        return out.pop();
    }

    int peek() {
        return out.peek();
    }

    boolean isEmpty() {
        return in.isEmpty() && out.isEmpty();
    }
}
```

## 5. Parentheses Matching

**Purpose.** Validate nested open/close pairs where the most recent opener must close first.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class ParenthesesMatcher {
    static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();

        for (char ch : s.toCharArray()) {
            if (isOpen(ch)) {
                stack.push(ch);
            } else {
                if (stack.isEmpty() || !matches(stack.pop(), ch)) {
                    return false;
                }
            }
        }

        return stack.isEmpty();
    }

    private static boolean isOpen(char ch) {
        return ch == '(' || ch == '[' || ch == '{';
    }

    private static boolean matches(char open, char close) {
        return (open == '(' && close == ')')
                || (open == '[' && close == ']')
                || (open == '{' && close == '}');
    }
}
```

## 6. Next Greater Element

**Purpose.** For each index, find the nearest element to its right that is strictly greater.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class NextGreaterElement {
    static int[] nextGreater(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        java.util.Arrays.fill(answer, -1);
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
                answer[stack.pop()] = nums[i];
            }
            stack.push(i);
        }

        return answer;
    }
}
```

## 7. Next Smaller Element

**Purpose.** For each index, find the nearest element to its right that is strictly smaller.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class NextSmallerElement {
    static int[] nextSmaller(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        java.util.Arrays.fill(answer, -1);
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] > nums[i]) {
                answer[stack.pop()] = nums[i];
            }
            stack.push(i);
        }

        return answer;
    }
}
```

## 8. Previous Greater Element

**Purpose.** Scan left to right and maintain a decreasing stack to find the nearest greater element to the left.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class PreviousGreaterElement {
    static int[] previousGreater(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] <= nums[i]) {
                stack.pop();
            }

            answer[i] = stack.isEmpty() ? -1 : stack.peek();

            stack.push(i);
        }

        return answer;
    }
}
```

## 9. Previous Smaller Element

**Purpose.** Scan left to right and maintain an increasing stack to find the nearest smaller element to the left.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class PreviousSmallerElement {
    static int[] previousSmaller(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] >= nums[i]) {
                stack.pop();
            }

            answer[i] = stack.isEmpty() ? -1 : stack.peek();

            stack.push(i);
        }

        return answer;
    }
}
```

## 10. Circular Next Greater

**Purpose.** Find the next greater element when the array wraps around, by scanning the array twice with `% n`.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class CircularNextGreater {
    static int[] nextGreaterCircular(int[] nums) {
        int n = nums.length;
        int[] answer = new int[n];
        java.util.Arrays.fill(answer, -1);
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i < 2 * n; i++) {
            int idx = i % n;

            while (!stack.isEmpty() && nums[stack.peek()] < nums[idx]) {
                answer[stack.pop()] = nums[idx];
            }

            if (i < n) {
                stack.push(idx);
            }
        }

        return answer;
    }
}
```

## 11. Stock Span

**Purpose.** For each incoming price, count consecutive previous days whose price was less than or equal, in online fashion.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class StockSpanner {
    private final Deque<int[]> stack = new ArrayDeque<>();

    int next(int price) {
        int span = 1;
        while (!stack.isEmpty() && stack.peek()[0] <= price) {
            span += stack.pop()[1];
        }
        stack.push(new int[]{price, span});
        return span;
    }
}
```

## 12. Largest Rectangle in Histogram

**Purpose.** Maximise `height × width` over all bars by finding the nearest smaller bar on both sides.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class LargestRectangle {
    static int largestRectangleArea(int[] heights) {
        int n = heights.length;
        int best = 0;
        Deque<Integer> stack = new ArrayDeque<>();

        for (int i = 0; i <= n; i++) {
            int current = (i == n) ? 0 : heights[i];

            while (!stack.isEmpty() && heights[stack.peek()] > current) {
                int h = heights[stack.pop()];
                int left = stack.isEmpty() ? -1 : stack.peek();
                int width = i - left - 1;

                best = Math.max(best, h * width);
            }

            if (i < n) stack.push(i);
        }

        return best;
    }
}
```

## 13. Sliding Window Maximum

**Purpose.** Return the maximum of every window of size `k` in amortized O(1) per step using a decreasing deque.

```java
import java.util.ArrayDeque;
import java.util.Deque;

class SlidingWindowMaximum {
    static int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] answer = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            while (!deque.isEmpty() && deque.peekFirst() <= i - k) {
                deque.pollFirst();
            }

            while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[i]) {
                deque.pollLast();
            }

            deque.offerLast(i);

            if (i >= k - 1) {
                answer[i - k + 1] = nums[deque.peekFirst()];
            }
        }

        return answer;
    }
}
```

## 14. LRU Cache

**Purpose.** O(1) average `get` and `put` with least-recently-used eviction, using a map for lookup and a doubly linked list for recency.

```java
import java.util.HashMap;
import java.util.Map;

class LRUCache {
    private static class Node {
        int key;
        int value;
        Node prev;
        Node next;

        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0);
    private final Node tail = new Node(0, 0);

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    int get(int key) {
        Node node = map.get(key);
        if (node == null) {
            return -1;
        }
        remove(node);
        addFirst(node);
        return node.value;
    }

    void put(int key, int value) {
        Node node = map.get(key);
        if (node != null) {
            node.value = value;
            remove(node);
            addFirst(node);
            return;
        }

        if (map.size() == capacity) {
            Node last = tail.prev;
            remove(last);
            map.remove(last.key);
        }

        Node created = new Node(key, value);
        map.put(key, created);
        addFirst(created);
    }

    private void addFirst(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
}
```

## 15. LFU Cache

**Purpose.** O(1) average `get` and `put` with least-frequently-used eviction and least-recently-used tie-break, using frequency buckets.

```java
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;

class LFUCache {
    private final int capacity;
    private final Map<Integer, Integer> values = new HashMap<>();
    private final Map<Integer, Integer> frequencies = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>();
    private int minFrequency;

    LFUCache(int capacity) {
        this.capacity = capacity;
    }

    int get(int key) {
        if (!values.containsKey(key)) {
            return -1;
        }
        int value = values.get(key);
        touch(key);
        return value;
    }

    void put(int key, int value) {
        if (capacity == 0) {
            return;
        }

        if (values.containsKey(key)) {
            values.put(key, value);
            touch(key);
            return;
        }

        if (values.size() == capacity) {
            LinkedHashSet<Integer> least = buckets.get(minFrequency);
            int evict = least.iterator().next();
            least.remove(evict);
            values.remove(evict);
            frequencies.remove(evict);
        }

        values.put(key, value);
        frequencies.put(key, 1);
        buckets.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFrequency = 1;
    }

    private void touch(int key) {
        int oldFrequency = frequencies.get(key);
        LinkedHashSet<Integer> oldBucket = buckets.get(oldFrequency);
        oldBucket.remove(key);
        if (oldBucket.isEmpty() && oldFrequency == minFrequency) {
            minFrequency++;
        }

        int newFrequency = oldFrequency + 1;
        frequencies.put(key, newFrequency);
        buckets.computeIfAbsent(newFrequency, k -> new LinkedHashSet<>()).add(key);
    }
}
```

## See also

- [Comparison Tables](01-Comparison-Tables.md)
- [Pattern Grouping](02-Pattern-Grouping.md)
- [Decision Tree](../10-Reference/01-Decision-Tree.md)
- [Revision Sheet](../10-Reference/02-Revision-Sheet.md)
- [Monotonic Stack](../01-Foundations/03-Monotonic-Stack.md)
