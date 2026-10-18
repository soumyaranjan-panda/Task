# 29. LRU Cache

**TUF:** [Solve](https://takeuforward.org/plus/dsa/problems/lru-cache) · [Article](https://takeuforward.org/data-structure/program-for-least-recently-used-lru-page-replacement-algorithm) — **LeetCode:** [Problem](https://leetcode.com/problems/lru-cache/)

## 1. Problem Understanding

Design a cache that supports two operations in average `O(1)` time:

- `get(key)`: return the stored value, or `-1` if absent. A successful `get` counts as a use.
- `put(key, value)`: insert or update a key.

The cache has a fixed `capacity`. When inserting a new key would exceed capacity, evict the **least recently used** (LRU) key — the key whose most recent `get` or `put` is the oldest.

"Recently used" is measured per key, and both `get` hits and `put`s refresh a key's recency. The classic example:

```text
LRUCache(2)
put(1, A)
put(2, B)
get(1)     -> A          (1 is now most recent)
put(3, C)  -> evicts key 2 (least recently used)
get(2)     -> -1
```

The challenge is that two separate requirements must both be `O(1)`:

1. find a key quickly,
2. maintain and update usage order quickly.

## 2. How to Think About the Problem

A hash map gives `O(1)` key lookup but maintains no order. A doubly linked list maintains order with `O(1)` insert and remove at the ends **provided you already hold the node**, but finding a key by value is `O(n)`.

Neither structure alone satisfies both requirements, so combine them:

- the **hash map** answers "where is this key?" in `O(1)`, and
- the **doubly linked list** answers "what is the most/least recent?" and supports `O(1)` moves.

The trick that makes it work is to store the **list node itself** as the map's value, not the raw value. Then a lookup yields the node directly, and moving or removing it is `O(1)` because a doubly linked node knows both its neighbors. A singly linked list would need the predecessor, which is not `O(1)` to find.

Use two **sentinel** nodes, `head` and `tail`, that never hold real data. They remove all null-pointer special cases at the ends of the list.

## 3. Pattern Recognition

**Clue:** `O(1)` `get`/`put` with eviction of the least recently used item.

**Pattern:** combine a lookup structure with an order structure.

| Signal | This problem |
|---|---|
| `O(1)` key lookup | Hash map |
| `O(1)` recency update and eviction | Doubly linked list |
| Need to locate a list node from a key | Store the node in the map |
| Remove/move in the middle in `O(1)` | Doubly linked (has `prev` and `next`) |

This is a **multi-requirement data structure design** problem: whenever one structure provides one required operation and another provides the missing one, combine them.

## 4. Brute Force

A hash map plus a plain list that is scanned to find and move the touched key. The scan is `O(n)` per operation.

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class BruteForceLRU {
    private final int capacity;
    private final Map<Integer, Integer> map = new HashMap<>();
    private final List<Integer> order = new ArrayList<>();

    BruteForceLRU(int capacity) {
        this.capacity = capacity;
    }

    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        order.remove(Integer.valueOf(key));
        order.add(0, key);
        return map.get(key);
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) {
            map.put(key, value);
            order.remove(Integer.valueOf(key));
            order.add(0, key);
            return;
        }
        if (map.size() == capacity) {
            int lru = order.remove(order.size() - 1);
            map.remove(lru);
        }
        map.put(key, value);
        order.add(0, key);
    }
}
```

`order.remove(Integer.valueOf(key))` scans the list, so operations are `O(n)`.

## 5. Observation

Store the actual list node in the map. Then a key gives direct access to its node, and the doubly linked node lets you detach and re-insert it in constant time. Recency is encoded purely by position in the list:

- the node just after `head` is the most recently used,
- the node just before `tail` is the least recently used.

**Figure 1 —** the combined structure.

```text
   HashMap<Key, Node>            Doubly Linked List (recency order)

   +---------+---------+     head                                 tail
   |   key   |  node   |    +----+   +----+   +----+   +----+   +----+
   +---------+---------+    | H  |<->| 3  |<->| 1  |<->| 5  |<->| T  |
   |    1    |    .----+--->|    |   |    |   |    |   |    |   |    |
   |    3    |    .----+--->+----+   +----+   +----+   +----+   +----+
   |    5    |    .-------------------^        ^                 ^
   +---------+---------+                  map[1]             map[5]
        MRU = head.next (key 3)              LRU = tail.prev (key 5)
```

Every map entry points straight at its node, so a lookup is a single map probe followed by `O(1)` pointer rewiring.

## 6. Optimal Approach

Maintain the map and the doubly linked list with sentinels. Recency rule: `head.next` is MRU, `tail.prev` is LRU.

- `get(key)`:
  - If the key is absent, return `-1`.
  - Otherwise detach the node and re-insert it right after `head` (it is now MRU), and return its value.
- `put(key, value)`:
  - If the key exists, update the value, detach the node, and move it to the front.
  - Otherwise create a new node, insert it at the front, and add it to the map.
  - If the size now exceeds capacity, remove `tail.prev` from both the list and the map (that node is the LRU).

The two private helpers `remove(node)` and `addToFront(node)` do the pointer rewiring.

## 7. Invariant

> **Invariant:** The linked list is ordered from most recently used (`head.next`) to least recently used (`tail.prev`), and every key in the map points directly to its node in the list. The map and the list always contain exactly the same keys.

## 8. Dry Run

Capacity 2. Notation: list shown from MRU to LRU.

| operation | list (MRU → LRU) | map keys | notes |
|-----------|------------------|----------|-------|
| `put(1, A)` | `[1]` | `{1}` | new key inserted at front |
| `put(2, B)` | `[2, 1]` | `{1, 2}` | 2 becomes MRU |
| `get(1)` | `[1, 2]` | `{1, 2}` | hit; node 1 moved to front, returns `A` |
| `put(3, C)` | `[3, 1]` | `{1, 3}` | full; evict LRU key 2 from list and map |
| `get(2)` | `[3, 1]` | `{1, 3}` | miss; returns `-1` |

**Figure 2 —** the eviction step of `put(3, C)`.

```text
before:  head <-> 1 <-> 2 <-> tail      map {1,2}   size 2/2
put(3):
  insert 3 at front:  head <-> 3 <-> 1 <-> 2 <-> tail   map {1,2,3} size 3
  over capacity -> evict tail.prev = 2:
    remove 2 from list:  head <-> 3 <-> 1 <-> tail
    remove 2 from map:   {1,3}
result:  [3, 1]
```

## 9. Why Does It Work?

The map gives `O(1)` access from a key to its node. The doubly linked list gives `O(1)` detach and `O(1)` insert because each node stores both neighbors, so no traversal is needed. The sentinels `head` and `tail` guarantee that the "front" and "back" positions always exist, so `addToFront` and the eviction at `tail.prev` never need null checks.

Moving a node to the front is just two pointer updates on each side. Eviction removes the node that has gone the longest without a `get` or `put`, which is exactly `tail.prev` by the ordering invariant. Both operations touch a constant number of pointers and one map entry, so all work is `O(1)` average.

## 10. Java Code

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

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;

        remove(node);
        addToFront(node);
        return node.value;
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) {
            Node node = map.get(key);
            node.value = value;
            remove(node);
            addToFront(node);
            return;
        }

        Node node = new Node(key, value);
        map.put(key, node);
        addToFront(node);

        if (map.size() > capacity) {
            Node leastRecent = tail.prev;
            remove(leastRecent);
            map.remove(leastRecent.key);
        }
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addToFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
}
```

## 11. Complexity

| Resource | Cost | Why |
|---|---|---|
| Time | O(1) average per `get`/`put` | One map operation plus a constant number of pointer updates |
| Space | O(capacity) | At most `capacity` nodes plus `capacity` map entries (plus two sentinels) |

Map operations are `O(1)` on average; the worst case is `O(n)` only under adversarial hash collisions, which is not a concern in normal interviews.

## 12. Edge Cases

- **Capacity 1**: every new `put` of a different key evicts the previous one immediately.
- **Update an existing key**: must refresh recency, not just the value; forgetting to move it to the front is a classic bug.
- **`get` a missing key**: returns `-1` and must not change recency.
- **Repeated `get` on the MRU key**: detach and re-insert; result unchanged but semantics preserved.
- **`put` an existing key then `get` it**: value updated and recency refreshed.
- **Capacity 0**: not typically allowed by the problem; if permitted, every `put` would be a no-op or immediate eviction. Guard if your spec permits it.

## 13. Common Mistakes

1. **Removing from the list but not the map** (or vice versa), which desynchronizes the two structures and leaks keys.
2. **Updating the value but not the recency** on an existing key.
3. **Forgetting to move a `get` hit to the front**, so eviction picks the wrong key.
4. **Using a singly linked list**, which cannot detach a middle node in `O(1)` without its predecessor.
5. **Omitting sentinels**, then writing fragile null checks at both ends.
6. **Evicting `head.next`** instead of `tail.prev` — that removes the MRU, the opposite of LRU.
7. **Forgetting to store the key in the node**, so eviction cannot remove the map entry.

## 14. Pattern to Remember

```text
**Problem clue:** O(1) get/put with eviction of the LEAST RECENTLY USED item.
**Pattern:** recency order + hash lookup.
**Data structure:** `HashMap<Key, Node>` + a doubly linked list (LRU at the tail).
**What it stores:** every cached key with its recency position.
**When to move:** on any get/put the touched node jumps to the head (most recent).
**When to remove:** the tail node when capacity is exceeded.
**Invariant:** the list is ordered by recency — head = MRU, tail = LRU — and the map points at each node.
**Key insight:** the DLL gives O(1) move-to-front and O(1) tail eviction; the map gives O(1) access.
**Time:** O(1) per operation.
**Space:** O(capacity).
```

**Need lookup + ordering? Combine HashMap + Doubly Linked List.**

> Note: Java's `LinkedHashMap` with `accessOrder = true` and an overridden `removeEldestEntry` implements LRU in a few lines, but an interview expects the hand-built map-plus-list version because it demonstrates the reasoning above.

## 15. Interview Trigger

> LRU immediately makes me think: "I need O(1) lookup and O(1) order updates." That is exactly HashMap + Doubly Linked List.

Any request for `O(1)` access plus `O(1)` eviction/ordering should trigger the combined structure. If a tie-breaker by frequency is added, move on to LFU.

## Related Problems

- [30. LFU Cache](04-LFU-Cache.md) — LRU inside frequency buckets.
- [27. Stock Span](01-Stock-Span.md) — another `O(1)`-amortized streaming structure.
- [28. Celebrity Problem](02-Celebrity-Problem.md) — design-style elimination.
- [Sliding Window Maximum](../07-Histogram-And-Deque/03-Sliding-Window-Maximum.md) — ordered candidate structure with expiry.

## See also

- [Largest Rectangle in a Histogram](../07-Histogram-And-Deque/01-Largest-Rectangle-In-A-Histogram.md)
- [Stock Span](01-Stock-Span.md)
- [Next Greater Element](../05-Monotonic-Stack-Core/01-Next-Greater-Element.md)
