# 30. LFU Cache

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/lfu-cache) · [Article](https://takeuforward.org/data-structure/lfu-cache) · [Video](https://www.youtube.com/watch?v=0PSB9y8ehbk&list=PLgUwDviBIf0p4ozDR_kJJkONnb1wdx2Ma&index=79) — **LeetCode:** [Problem](https://leetcode.com/problems/lfu-cache/)

## 1. Problem Understanding

Design a cache that supports `get` and `put` in average `O(1)` time, but evicts the **least frequently used** (LFU) key when full. Frequency is the number of times a key has been accessed (`get` or `put`). Ties are broken by recency: among keys with the same lowest frequency, evict the **least recently used** one.

- `get(key)`: return the value or `-1`. A hit increases the key's frequency by 1.
- `put(key, value)`: insert or update. Updating an existing key increases its frequency. Inserting a new key uses frequency 1. If the cache is full, evict the LFU key (ties broken by LRU) before inserting.

Example with capacity 2:

```text
put(1, 10)
put(2, 20)
get(1)      -> 10        (key 1 frequency 1 -> 2)
put(3, 30)  -> evicts key 2 (the only key at frequency 1)
get(2)      -> -1
```

LFU adds one dimension beyond LRU: **frequency**, with recency as the tie-breaker.

## 2. How to Think About the Problem

LRU tracks only recency, so a single ordered list suffices. LFU needs three relationships at once:

```text
key  -> value
key  -> frequency
frequency -> keys at that frequency, ordered by recency
```

Represent each of those with a structure that answers it in `O(1)`:

- `keyToNode`: `HashMap<Integer, Node>` maps a key to its node (holds value and frequency).
- `freqToList`: `HashMap<Integer, DoublyList>` maps a frequency to a list of nodes at that frequency, most recent at the head.
- `minFrequency`: tracks the smallest non-empty frequency, so eviction never scans for it.

Each frequency bucket is itself an LRU list. That is the whole idea: **LFU is LRU inside each frequency bucket.** On access, a node moves from the head-position logic of one bucket to the next; on eviction, you take the tail of the `minFrequency` bucket.

Without `minFrequency`, you would have to scan all frequency buckets to find the smallest, which is `O(n)`.

## 3. Pattern Recognition

**Clue:** eviction by frequency, with recency as the tie-breaker.

**Pattern:** layered hash maps plus linked lists — frequency buckets, each an LRU list.

| Signal | This problem |
|---|---|
| Evict smallest access count | A bucket per frequency |
| Tie-break by least recent | Each bucket ordered by recency |
| `O(1)` find of the smallest frequency | Maintain `minFrequency` directly |
| `O(1)` find of a key's node | `keyToNode` map |

## 4. Brute Force

Keep all keys in a map and scan for the minimum frequency (and oldest timestamp) on every eviction.

```java
import java.util.HashMap;
import java.util.Map;

class BruteForceLFU {
    private final int capacity;
    private final Map<Integer, int[]> data = new HashMap<>();
    private int time = 0;

    BruteForceLFU(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        int[] entry = data.get(key);
        if (entry == null) return -1;
        entry[1]++;
        entry[2] = time++;
        return entry[0];
    }

    public void put(int key, int value) {
        if (capacity == 0) return;
        int[] entry = data.get(key);
        if (entry != null) {
            entry[0] = value;
            entry[1]++;
            entry[2] = time++;
            return;
        }
        if (data.size() == capacity) {
            int victim = -1;
            int bestFreq = Integer.MAX_VALUE;
            int bestTime = Integer.MAX_VALUE;
            for (Map.Entry<Integer, int[]> e : data.entrySet()) {
                int[] v = e.getValue();
                if (v[1] < bestFreq || (v[1] == bestFreq && v[2] < bestTime)) {
                    bestFreq = v[1];
                    bestTime = v[2];
                    victim = e.getKey();
                }
            }
            data.remove(victim);
        }
        data.put(key, new int[]{value, 1, time++});
    }
}
```

The eviction scan visits every key, making `put` `O(n)` in the worst case.

## 5. Observation

Maintain `minFrequency` directly instead of scanning. Within each frequency, maintain recency order with a doubly linked list, so the least recently used node at the minimum frequency is simply the tail of the `minFrequency` bucket.

**Figure 1 —** the layered structure.

```text
   minFrequency = 1
        |
        v
   freq 1 : head <-> [ key 3 ] <-> tail
   freq 2 : head <-> [ key 1 ] <-> tail
   freq 5 : head <-> [ key 7 ] <-> [ key 4 ] <-> tail
                                 ^
                                 least recent at that frequency

   each node = { key, value, frequency }
   keyToNode : key -> node   (one probe to find the bucket)
```

The tail of the `minFrequency` bucket is the global eviction victim: it has the smallest frequency, and the oldest recency among that frequency.

## 6. Optimal Approach

For `get(key)`:

1. Look up the node. If missing, return `-1`.
2. Remove the node from its current frequency bucket.
3. If that bucket became empty and its frequency equals `minFrequency`, increment `minFrequency`.
4. Increment the node's frequency.
5. Insert the node at the head of the bucket for the new frequency.
6. Return the value.

For `put(key, value)`:

1. If `capacity == 0`, return.
2. If the key exists, update its value and run the same promotion as `get`.
3. Otherwise, if the cache is full, evict the tail of the `minFrequency` bucket and remove its key from `keyToNode`.
4. Create a new node with frequency 1, insert it at the head of bucket 1, add it to `keyToNode`, and set `minFrequency = 1`.

## 7. Invariant

> **Invariant:** Every node lives in exactly one frequency bucket matching its current frequency, and within a bucket nodes are ordered by recency with the most recent at the head. `minFrequency` equals the smallest frequency among all stored keys, so the eviction victim is always `freqToList.get(minFrequency)`'s tail.

## 8. Dry Run

Capacity 2. Notation: within a bucket, order is `[most recent ... least recent]`.

| operation | freq buckets | keyToNode | minFrequency | notes |
|-----------|--------------|-----------|--------------|-------|
| `put(1, 10)` | `1:[1]` | `{1}` | 1 | new key at frequency 1 |
| `put(2, 20)` | `1:[2, 1]` | `{1, 2}` | 1 | 2 added at head, most recent |
| `get(1)` | `1:[2]  2:[1]` | `{1, 2}` | 1 | 1 promoted from freq 1 to freq 2; bucket 1 not empty, so `minFrequency` stays 1; returns 10 |
| `put(3, 30)` | `1:[3]  2:[1]` | `{1, 3}` | 1 | full: evict tail of freq 1 = key 2; insert 3 at freq 1 |

**Figure 2 —** the promotion of key 1 during `get(1)`.

```text
before:  freq1: [2, 1]     minFrequency = 1
get(1):
  remove 1 from freq1  ->  freq1: [2]   (still non-empty)
  node1.frequency = 2
  add 1 at head of freq2 -> freq2: [1]
after:   freq1: [2]   freq2: [1]   minFrequency = 1
```

If a promotion empties the `minFrequency` bucket, it must advance. For example, with only `freq1: [1]` and `minFrequency = 1`, a `get(1)` empties bucket 1, so `minFrequency` becomes `2` — matching the new sole bucket.

## 9. Why Does It Work?

`keyToNode` gives direct key access. The frequency buckets group all keys by frequency, and each bucket is a doubly linked LRU list, so within a bucket the least recently used node is the tail. Because `minFrequency` is kept equal to the smallest non-empty frequency, the eviction victim (`minFrequency` bucket's tail) is found in `O(1)` without scanning.

The promotion touches only two buckets (old and new), each in `O(1)` because the node already knows its neighbors. The `minFrequency` update rule is correct: it can only increase by one when the minimum bucket empties (frequencies change by exactly one), and any new insertion resets it to `1`.

## 10. Java Code

```java
import java.util.HashMap;
import java.util.Map;

class LFUCache {
    private static class Node {
        int key;
        int value;
        int frequency = 1;
        Node prev;
        Node next;

        Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }

    private static class DoublyList {
        private final Node head = new Node(0, 0);
        private final Node tail = new Node(0, 0);
        private int size = 0;

        DoublyList() {
            head.next = tail;
            tail.prev = head;
        }

        void addFirst(Node node) {
            node.next = head.next;
            node.prev = head;
            head.next.prev = node;
            head.next = node;
            size++;
        }

        void remove(Node node) {
            node.prev.next = node.next;
            node.next.prev = node.prev;
            node.prev = null;
            node.next = null;
            size--;
        }

        Node removeLast() {
            if (size == 0) return null;
            Node node = tail.prev;
            remove(node);
            return node;
        }

        boolean isEmpty() {
            return size == 0;
        }
    }

    private final int capacity;
    private int size = 0;
    private int minFrequency = 0;

    private final Map<Integer, Node> keyToNode = new HashMap<>();
    private final Map<Integer, DoublyList> freqToList = new HashMap<>();

    public LFUCache(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        Node node = keyToNode.get(key);
        if (node == null) return -1;

        increaseFrequency(node);
        return node.value;
    }

    public void put(int key, int value) {
        if (capacity == 0) return;

        if (keyToNode.containsKey(key)) {
            Node node = keyToNode.get(key);
            node.value = value;
            increaseFrequency(node);
            return;
        }

        if (size == capacity) {
            DoublyList minList = freqToList.get(minFrequency);
            Node evicted = minList.removeLast();

            keyToNode.remove(evicted.key);
            size--;
        }

        Node node = new Node(key, value);
        keyToNode.put(key, node);

        freqToList.computeIfAbsent(1, f -> new DoublyList()).addFirst(node);
        minFrequency = 1;
        size++;
    }

    private void increaseFrequency(Node node) {
        int oldFrequency = node.frequency;
        DoublyList oldList = freqToList.get(oldFrequency);
        oldList.remove(node);

        if (oldFrequency == minFrequency && oldList.isEmpty()) {
            minFrequency++;
        }

        node.frequency++;

        freqToList
                .computeIfAbsent(node.frequency, f -> new DoublyList())
                .addFirst(node);
    }
}
```

## 11. Complexity

| Resource | Cost | Why |
|---|---|---|
| Time | O(1) average per `get`/`put` | Each operation touches at most two buckets and one map entry |
| Space | O(capacity) | At most `capacity` nodes, plus map entries and bucket wrappers |

The `minFrequency` pointer removes the only potentially linear step, so no operation scans the set of keys.

## 12. Edge Cases

- **Capacity 0**: every `put` is a no-op and every `get` returns `-1`; guard at the top of `put`.
- **Capacity 1**: each access promotes the single key, and the next different `put` evicts it.
- **Frequency ties**: eviction must pick the least recently used among the minimum-frequency keys — the bucket tail, not the head.
- **Updating an existing key**: refreshes frequency even though the key was already present.
- **Promotion empties the minimum bucket**: `minFrequency` must increment; otherwise eviction reads an empty bucket.
- **Repeated `get` on the same key**: frequency climbs by one each time; the node moves buckets each time.
- **Insert then immediately evict**: a brand-new key has frequency 1 and resets `minFrequency` to 1, so it is not automatically the victim unless it is also the least recent at frequency 1.

## 13. Common Mistakes

1. **Forgetting the recency tie-breaker.** Using the wrong end of the bucket (head instead of tail) evicts the wrong key among equal frequencies.
2. **Updating the frequency without moving the node** to its new bucket.
3. **Failing to update `minFrequency`** when the minimum bucket empties, leading to eviction from an empty list (`NullPointerException`).
4. **Leaving stale nodes in old frequency lists**, corrupting bucket sizes.
5. **Resetting `minFrequency` incorrectly on insert.** A new key always has frequency 1, so `minFrequency` becomes `1`.
6. **Forgetting to keep the bucket map clean.** Empty buckets may remain in `freqToList`, which is fine, but `minFrequency` must never point at an empty one.
7. **Removing the evicted key from the bucket but not from `keyToNode`** (or vice versa).

## 14. Pattern to Remember

```text
**Problem clue:** evict the LEAST FREQUENTLY USED item; ties broken by least-recent.
**Pattern:** frequency buckets, each bucket an LRU list.
**Data structure:** `HashMap<Key, Node>` + `HashMap<Freq, LinkedList>` + `minFreq`.
**What it stores:** every key with its value and access count; one LRU list per frequency bucket.
**When to move:** on access, pull the node from its old bucket and add it to the head of the next bucket.
**When to remove:** the tail of the `minFreq` bucket when capacity is exceeded; rebuild `minFreq` if that bucket empties.
**Invariant:** `minFreq` is the smallest non-empty bucket; its tail is the least recent item at that frequency.
**Key insight:** LFU = buckets of LRU lists — each operation touches only a constant number of buckets.
**Time:** O(1) amortized per operation.
**Space:** O(capacity).
```

```text
LFU
-> key lookup
-> frequency tracking
-> recency inside each frequency
-> minFrequency pointer
```

## 15. Interview Trigger

> LFU is essentially "LRU inside each frequency bucket." Add frequency tracking and a pointer to the smallest frequency.

Whenever eviction depends on a per-key counter and recency is only a tie-breaker, build one LRU list per frequency plus a `minFreq` pointer.

## Related Problems

- [29. LRU Cache](03-LRU-Cache.md) — the single-bucket foundation LFU extends.
- [27. Stock Span](01-Stock-Span.md) — another amortized-`O(1)` streaming structure.
- [28. Celebrity Problem](02-Celebrity-Problem.md) — design-style elimination.
- [Sliding Window Maximum](../07-Histogram-And-Deque/03-Sliding-Window-Maximum.md) — ordered structure with expiry.

## See also

- [Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md)
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md)
- [Sum of Subarray Minimums](../06-Boundary-And-Contribution/02-Sum-Of-Subarray-Minimums.md)
