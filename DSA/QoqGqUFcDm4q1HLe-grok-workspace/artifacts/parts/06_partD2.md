## 35. Network Delay Time

### Problem Understanding

A directed weighted network of `n` nodes (labeled `1..n`) sends a signal from node `k`. Edge `times[i] = [u, v, w]` means `u` takes `w` time to reach `v`. The signal travels along outgoing edges as soon as a node receives it. You want the time at which **every** node has received the signal — the maximum over the shortest-path distances from `k`. If any node is unreachable, return `-1`.

**Input / Output / Constraints**
- Input: `times[i] = [u, v, w]` directed edges, `n` nodes, source `k` (all **1-indexed**).
- Output: `int` — max shortest-path distance from `k`, or `-1`.
- `1 <= k <= n <= 100`, `1 <= times.length <= 6000`, `0 <= w <= 100`, pairs `(u, v)` unique, `u != v`.
- Judge: `public int networkDelayTime(int[][] times, int n, int k)`.

**Observations**
- Last node to hear the signal is the bottleneck. Answer is `max(dist[i])`, not the sum, not a longest path.
- Weights are non-negative → Dijkstra's first-pop invariant holds.
- Directed: an edge `u → v` does not help `v → u`.
- `n = 1`: the source already has the signal at time `0`.
- A node with no incoming path from `k` makes the answer `-1`, even if the rest of the graph is connected.

**Example**
```text
n = 4, k = 2
times = [[2,1,1],[2,3,1],[3,4,1]]

        1
   (1) /
      2          source
   (1) \
        3 --(1)--> 4
```
Shortest times: `dist[2]=0`, `dist[1]=1`, `dist[3]=1`, `dist[4]=2`. Last arrival = `2`.

**Example (unreachable)**
```text
n = 3, k = 1, times = [[1,2,1]]
Node 3 has no path from 1 → -1.
```

**Example (`n = 1`)**
```text
n = 1, k = 1, times = []  →  0
```

### How to Think About the Problem

- What should I notice first? Every node must receive the signal. The clock is the arrival time of the **slowest** node, and that arrival time is a shortest-path distance. If you take a detour, that node hears the signal later, never earlier.
- Which representation? Directed weighted adjacency list. Nodes are `1..n` — either allocate `n+1` or convert to `0..n-1` once.
- Minimizing per-node arrival, then maximizing those minima: single-source shortest path, then a scan.
- BFS on a queue treats every edge as cost `1`. Here costs differ, so a min-heap (Dijkstra) is the natural traversal. You always settle the unsettled node with the smallest tentative distance.
- **Clue → Pattern:** *Time for a signal to reach all nodes = max of single-source shortest paths on a directed non-negative graph; any `INF` leftover means `-1`.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: DFS/enumerate every simple path from k, keep min arrival per node. O(n!)
        ↓
Observation: a longer path cannot beat a shorter one (weights ≥ 0).
             First time you pop a node from a min-heap, its dist is final.
        ↓
Optimal: Dijkstra from k, answer = max(dist). Unreachable → -1.
         O((V + E) log V)
```

### Brute Force Approach

- Basic idea: from `k`, DFS along simple paths (skip nodes on the current path to avoid cycles). For every visit to `u` at time `t`, set `best[u] = min(best[u], t)`. After the search, if any `best[i]` is untouched return `-1`, else return the max.
- Why it works: the shortest path is simple (non-negative weights, no reason to loop). Enumerating all simple paths includes it.
- Java code:

```java
import java.util.*;

class NetworkDelayTime {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : times) adj.get(e[0]).add(new int[]{e[1], e[2]});

        int[] best = new int[n + 1];
        Arrays.fill(best, Integer.MAX_VALUE);
        dfs(k, 0, adj, best, new boolean[n + 1]);

        int ans = 0;
        for (int i = 1; i <= n; i++) {
            if (best[i] == Integer.MAX_VALUE) return -1;
            ans = Math.max(ans, best[i]);
        }
        return ans;
    }

    private void dfs(int u, int t, List<List<int[]>> adj, int[] best, boolean[] onPath) {
        if (t >= best[u]) return;
        best[u] = t;
        onPath[u] = true;
        for (int[] e : adj.get(u)) {
            if (!onPath[e[0]]) dfs(e[0], t + e[1], adj, best, onPath);
        }
        onPath[u] = false;
    }
}
```

**Time Complexity Calculation:**
Up to `O(n!)` simple paths in a dense tournament-like digraph. Each path can be length `n`. `n = 100` is dead on arrival.

**Space Complexity Calculation:**
Adj list `O(V + E)`, recursion + `onPath` `O(V)`.

- **Why can this be improved?** You re-explore prefixes that a greedy order would have settled. Non-negative weights let you freeze a node the first time it becomes the global closest unsettled node — Dijkstra. Naive DFS fails the constraint; it also fails the "why would a longer walk ever help?" test.

### Optimal Approach

Directed, weighted, **non-negative** edges. Single-source shortest paths from `k`; the answer is the max finite distance.

**Core Observation**
The signal reaches `u` at `dist[u]`. Node `u` then forwards along each outgoing edge. That is exactly Dijkstra's relaxation: `dist[v] = min(dist[v], dist[u] + w(u,v))`. The time the whole network is informed is `max_u dist[u]`. One unreachable `u` makes `max` undefined → `-1`.

**Pattern Identification**
Single-source Dijkstra + "reduce the dist array to one integer (the max)". Same engine as problem 30, different aggregator. Not Cheapest Flights (34): there is no hop limit.

**Step-by-Step Intuition**
1. Build a 0-indexed adj list from the 1-indexed edge list.
2. `dist[k] = 0`, everything else `INF`. Push `(0, k)` into a min-heap keyed on distance.
3. *Invariant: the first time you pop `u` with `d == dist[u]`, no unused path can undercut `d` (weights ≥ 0).* Skip stale pops (`d > dist[u]`).
4. Relax every outgoing edge. On improvement, update `dist[v]` and push `(dist[v], v)`. You never decrease-key; you leave garbage in the heap and skip it later.
5. Scan `dist`. Any `INF` → `-1`. Otherwise return the max. `dist[k] = 0` so `n = 1` returns `0` without special-casing.

**Dry Run**

`n=4, k=2, times=[[2,1,1],[2,3,1],[3,4,1]]`. 0-index: source `1`, edges `1→0 (1)`, `1→2 (1)`, `2→3 (1)`.

| Step | PQ (d, u) | dist `[0,1,2,3]` | Action |
|------|-----------|------------------|--------|
| init | `(0,1)` | `[INF, 0, INF, INF]` | source settled-pending |
| 1 | pop `(0,1)` | `[1, 0, 1, INF]` | relax 0 and 2 |
| 2 | `(1,0),(1,2)` | same | pop `(1,0)`, no outgoing |
| 3 | `(1,2)` | `[1, 0, 1, 2]` | pop `(1,2)`, relax 3 |
| 4 | `(2,3)` | `[1, 0, 1, 2]` | pop `(2,3)`, done |

`max = 2`. No `INF` leftover.

Unreachable example `n=3, k=1, times=[[1,2,1]]`: `dist = [0, 1, INF]` → `-1`.

**Why Does It Work?**
Non-negative weights make the set of settled distances grow by always taking the smallest frontier value. Any better path to that node would have to go through some unsettled node, which already has a tentative dist ≥ the one you popped — adding a non-negative edge cannot undercut. When the heap empties, every reachable dist is shortest. The last node to receive the signal is the reachable node with largest dist.

**Java Code**

```java
import java.util.*;

class NetworkDelayTime {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : times) {
            adj.get(e[0] - 1).add(new int[]{e[1] - 1, e[2]});
        }

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[k - 1] = 0;

        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.offer(new int[]{0, k - 1});

        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue; // stale heap entry from an older dist[u]
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }

        int ans = 0;
        for (int x : dist) {
            if (x == Integer.MAX_VALUE) return -1;
            ans = Math.max(ans, x);
        }
        return ans;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Build adj `O(E)`. Each node is popped with a useful dist once, but the heap may hold several stale copies. Heap operations are `O(E log E)` in the lazy-Dijkstra model (`E` pushes, each `O(log E)`). With `n ≤ 100`, `E ≤ 6000`, this is trivial. Scanning `dist` is `O(V)`. Overall `O((V + E) log V)` as usually quoted (bound `E` by `V^2`).

**Space Complexity Calculation:**
Adj `O(V + E)`, `dist` `O(V)`, heap `O(E)` in the worst case of many stale entries.

### Pattern to Remember

```text
Clue: time until ALL nodes receive a signal from k (or impossible)
Pattern: Dijkstra from k, answer = max(dist[i]); any INF → -1
Mental model: last arrival = bottleneck of shortest paths, not a longest path
```

**Similar problems:** 30 Dijkstra's Algorithm; 34 Cheapest Flights Within K Stops (hop-capped, not the same); 36 Number of Ways to Arrive at Destination; 40 Find the City (all-pairs version of "who is close").

**Interview tip:** Say out loud that the answer is `max(dist)`, not `dist[n]`, and that you must return `-1` if the max is `INF` — that is the entire difference from textbook Dijkstra.

---

## 36. Number of Ways to Arrive at Destination

### Problem Understanding

Undirected weighted graph, `n` nodes `0..n-1`, edges `roads[i] = [u, v, time]`. Count the number of **shortest** paths from `0` to `n-1`, modulo `1_000_000_007`. A path is shortest if its total time equals the minimum possible time.

**Input / Output / Constraints**
- Input: `n`, `roads[u, v, time]` undirected, unique pairs, `u != v`.
- Output: `int` — number of shortest `0 → n-1` paths, mod `10^9+7`.
- `1 <= n <= 200`, `n-1 <= roads.length <= n(n-1)/2`, `1 <= time <= 10^9`.
- Judge: `public int countPaths(int n, int[][] roads)`.

**Observations**
- You need two things at once: the shortest distance **and** how many ways realize it.
- `time` up to `1e9` and a path can have `n-1` edges → distance does not fit in 32-bit. Use `long[] dist`.
- Weights are positive (`time >= 1`). That lets you finalize `ways[u]` the first time you pop `u`.
- Equal-length discovery: do **not** reset, **add**. Strictly better: reset `ways[v] = ways[u]` and push. Equal: `ways[v] += ways[u]`, no push.
- Init `ways[src] = 1` (one way to sit at the source: do nothing). `ways[src] = 0` poisons the entire count.

**Example**
```text
n = 4
roads = [[0,1,1],[0,2,2],[1,2,1],[1,3,3],[2,3,1]]

0 --1-- 1 --3-- 3
 \      |      /
  2     1     1
   \    |    /
        2

paths 0→3:
  0-1-3     time 4
  0-2-3     time 3
  0-1-2-3   time 3
shortest = 3, ways = 2
```

**Example (LeetCode 1976)**
```text
n = 7, roads = [[0,6,7],[0,1,2],[1,2,3],[1,3,3],[6,3,3],
                [3,5,1],[6,5,1],[2,5,1],[0,4,5],[4,6,2]]
shortest time 0→6 is 7, four routes: 0-6, 0-4-6, 0-1-2-5-6, 0-1-3-5-6 → 4
```

### How to Think About the Problem

- What should I notice first? "Number of shortest paths", not number of paths, not the shortest path itself. Two arrays, same Dijkstra loop: `dist[]` and `ways[]`.
- Which representation? Undirected weighted adj list, 0-indexed.
- Counting + minimizing together. The DP on a DAG of shortest-path edges is the mental model: `ways[v] = sum of ways[u]` over incoming shortest-path edges `u → v`.
- You do not build that DAG explicitly. Dijkstra discovers shortest-path edges on the fly: an edge is a shortest-path edge iff `dist[u] + w == dist[v]`.
- **Clue → Pattern:** *Count shortest paths = Dijkstra + `ways[v]` reset-on-better, add-on-equal; `ways[src]=1`; `long` distances.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: Dijkstra (or any SSSP) to get T = dist[n-1],
             then DFS/BFS every path whose time equals T. Exponential.
        ↓
Observation: ways[v] depends only on ways[u] of parents that realize dist[v].
             Positive weights ⇒ when u is first popped, ways[u] is complete.
        ↓
Optimal: one Dijkstra, extra ways[] array. O((V + E) log V)
```

### Brute Force Approach

- Basic idea: run Dijkstra to learn the shortest time `T`. Then DFS from `0`, accumulating time, counting visits to `n-1` whose time equals `T`. Mark `onPath` so you do not loop.
- Why it works: every simple path is considered; only those matching `T` increment the answer.
- Java code:

```java
import java.util.*;

class NumberOfWaysToArrive {
    static final int MOD = 1_000_000_007;
    int ans;
    long target;

    public int countPaths(int n, int[][] roads) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] r : roads) {
            adj.get(r[0]).add(new int[]{r[1], r[2]});
            adj.get(r[1]).add(new int[]{r[0], r[2]});
        }
        target = shortest(n, adj);
        ans = 0;
        dfs(0, 0L, n, adj, new boolean[n]);
        return ans;
    }

    private void dfs(int u, long t, int n, List<List<int[]>> adj, boolean[] onPath) {
        if (t > target) return;
        if (u == n - 1) {
            if (t == target) ans = (ans + 1) % MOD;
            return;
        }
        onPath[u] = true;
        for (int[] e : adj.get(u)) {
            if (!onPath[e[0]]) dfs(e[0], t + e[1], n, adj, onPath);
        }
        onPath[u] = false;
    }

    private long shortest(int n, List<List<int[]>> adj) {
        long[] dist = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE / 4);
        dist[0] = 0;
        PriorityQueue<long[]> pq = new PriorityQueue<>(Comparator.comparingLong(a -> a[0]));
        pq.offer(new long[]{0, 0});
        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            long d = cur[0];
            int u = (int) cur[1];
            if (d > dist[u]) continue;
            for (int[] e : adj.get(u)) {
                if (dist[u] + e[1] < dist[e[0]]) {
                    dist[e[0]] = dist[u] + e[1];
                    pq.offer(new long[]{dist[e[0]], e[0]});
                }
            }
        }
        return dist[n - 1];
    }
}
```

**Time Complexity Calculation:**
Dijkstra `O((V+E) log V)` then up to `O(n!)` simple paths. `n = 200` is impossible. Even on a DAG of moderate width the path count itself can be exponential, so enumeration cannot pay `O(1)` per path.

**Space Complexity Calculation:**
Adj `O(V+E)`, recursion `O(V)`.

- **Why can this be improved?** You do not need the paths, you need the count. That count satisfies a linear recurrence along shortest-path edges. Computing it inside Dijkstra is `O(1)` extra work per relaxation. Naive enumeration fails because the number of shortest paths can be huge (that is why the problem asks for a count modulo `10^9+7` in the first place).

### Optimal Approach

Undirected, positive weights. The shortest-path subgraph is a DAG (positive weights ⇒ no shortest-path cycle). `ways[v]` is a DP on that DAG, evaluated in Dijkstra order.

**Core Observation**
When you relax `u → v` with weight `w`:
- `dist[u] + w < dist[v]` → you found a strictly better distance. All previously counted ways to `v` are obsolete. `ways[v] = ways[u]`. Push `v`.
- `dist[u] + w == dist[v]` → another shortest bundle. `ways[v] = (ways[v] + ways[u]) % MOD`. Do not push: `v` is already queued at this distance.
- `dist[u] + w > dist[v]` → useless.

**Pattern Identification**
Dijkstra with a second array. Same skeleton as 35, plus a counting recurrence. Interviewers look for the equal-case add and for `long` distances.

**Step-by-Step Intuition**
1. Build undirected weighted adj.
2. `dist[0] = 0`, other dist `INF` (a `long` INF, e.g. `Long.MAX_VALUE / 4`). `ways[0] = 1`, other ways `0`.
3. *Invariant: when `u` is first popped with `d == dist[u]`, every shortest path to `u` has already contributed to `ways[u]`.* Reason: any parent `p` on a shortest path has `dist[p] = dist[u] - w < dist[u]` (since `w ≥ 1`), so `p` was popped earlier and already propagated.
4. Propagate to neighbors with the three-way branch above.
5. Return `ways[n-1]`.

**Dry Run**

Graph of the first example. `MOD` unused because counts are tiny.

`dist` init `[0, INF, INF, INF]`, `ways` init `[1, 0, 0, 0]`.

| Step | PQ (d, u) | dist | ways | Action |
|------|-----------|------|------|--------|
| 1 | pop `(0,0)` | `[0, 1, 2, INF]` | `[1, 1, 1, 0]` | better to 1 and 2, ways copied from 0 |
| 2 | pop `(1,1)` | `[0, 1, 2, 4]` | `[1, 1, 2, 1]` | 1+1 **equals** dist[2] → ways[2] += 1 → 2; better to 3 with ways=1 |
| 3 | pop `(2,2)` | `[0, 1, 2, 3]` | `[1, 1, 2, 2]` | 2+1 **better** than dist[3]=4 → reset ways[3]=ways[2]=2 |
| 4 | stale `(4,3)` skipped; pop `(3,3)` | same | same | dest done |

`ways[3] = 2`.

**Why Does It Work?**
Positive weights totally order Dijkstra pops by increasing `dist`. Parents of `u` on shortest paths live at strictly smaller dist, so they have been popped and have finished writing into `ways[u]` before you pop `u`. Then `u` ships a complete `ways[u]` downstream. The equal-branch is the only place two shortest routes merge; missing it undercounts, treating it as "better" overcounts by wiping a valid bundle.

Zero-weight edges would break "parents already popped". This problem forbids them.

**Java Code**

```java
import java.util.*;

class NumberOfWaysToArrive {
    static final int MOD = 1_000_000_007;

    public int countPaths(int n, int[][] roads) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] r : roads) {
            adj.get(r[0]).add(new int[]{r[1], r[2]});
            adj.get(r[1]).add(new int[]{r[0], r[2]});
        }

        long[] dist = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE / 4);
        int[] ways = new int[n];
        dist[0] = 0;
        ways[0] = 1;

        PriorityQueue<long[]> pq = new PriorityQueue<>(Comparator.comparingLong(a -> a[0]));
        pq.offer(new long[]{0, 0});

        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            long d = cur[0];
            int u = (int) cur[1];
            if (d > dist[u]) continue;
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                long nd = dist[u] + w;
                if (nd < dist[v]) {
                    dist[v] = nd;
                    ways[v] = ways[u];
                    pq.offer(new long[]{nd, v});
                } else if (nd == dist[v]) {
                    ways[v] = (ways[v] + ways[u]) % MOD; // another shortest bundle
                }
            }
        }
        return ways[n - 1];
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Identical to lazy Dijkstra: `O((V + E) log V)` heap operations. The `ways` update is `O(1)` per edge scan. `V ≤ 200`, `E ≤ V(V-1)/2`.

**Space Complexity Calculation:**
Adj `O(V + E)`, `dist`/`ways` `O(V)`, heap `O(E)`.

### Pattern to Remember

```text
Clue: count how many paths share the shortest distance (mod 1e9+7)
Pattern: Dijkstra + ways[]; reset on strictly better, add on equal; ways[src]=1
Mental model: DP on the DAG of shortest-path edges, evaluated in dist order
```

**Similar problems:** 30 Dijkstra's Algorithm; 35 Network Delay Time (same engine, max instead of count); 34 Cheapest Flights Within K Stops.

**Interview tip:** Write `long[] dist` before you write the loop — `n=200` times `1e9` overflows `int` silently and you will count the wrong "shortest" paths.

---

## 37. Minimum Multiplications to Reach End

### Problem Understanding

You start at integer `start`. One operation: pick any `arr[i]`, replace the current value with `(current * arr[i]) % 100000`. Find the minimum number of multiplications to reach `end`. If impossible, return `-1`.

**Input / Output / Constraints**
- Input: `int[] arr`, `int start`, `int end`.
- Output: min operations, or `-1`.
- `0 ≤ start, end < 100000`, `1 ≤ arr[i] ≤ 100`, `1 ≤ arr.length ≤ 10^4`.
- Modulo is **always** `100000` (the state space size), not `1e9+7`.
- Typical signature: `public int minimumMultiplications(int[] arr, int start, int end)`.

**Observations**
- The value after every operation is in `0..99999`. That is a graph with `V = 100000` implicit nodes.
- From residue `x`, edges go to `(x * arr[i]) % 100000` for each multiplier. Edge weight = `1`.
- Unweighted → BFS, not Dijkstra. A heap adds log factors and no new information.
- First time BFS visits a residue, that step count is minimal. Mark visited **on the value**, not on the path. Path-visiting would re-expand the same residue forever (`arr` can contain `1`).
- `start == end` → `0` (zero multiplications). Do not search.
- Some residues are unreachable (e.g. you can only produce evens, `end` is odd).

**Example**
```text
arr = [2, 5, 7], start = 3, end = 30

3 --*2--> 6 --*5--> 30     (2 steps)
3 --*5--> 15 --*2--> 30    (2 steps)
3 --*7--> 21 --*2--> 42 ...
Answer: 2
```

**Example (longer chain)**
```text
arr = [3, 4, 65], start = 7, end = 66175
7 → 21 → 63 → 4095 → 66175    (4 multiplications)
```

**Example (edges)**
```text
start == end, any arr        → 0
start = 10, end = 1, arr = [2, 4]  → -1   (parity / gcd trap)
```

### How to Think About the Problem

- What should I notice first? You are not walking a given graph. You are walking the graph of residues under multiplication. `V = 10^5` is small enough to BFS.
- Which representation? None stored. Neighbors of `x` are generated: `for (int m : arr) nxt = (int) ((long) x * m % MOD)`.
- Searching a minimum **operation count**, every operation costs 1 → unweighted shortest path on an implicit graph. Same family as Word Ladder (16) and 0-1 BFS mazes (32), not Dijkstra (30).
- Why not Dijkstra? All edges weight 1, so a queue already pops in increasing distance.
- **Clue → Pattern:** *Min operations on `x := (x * a) % M` = BFS over residues `0..M-1`, visited-on-value.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: recurse on sequences of multipliers. No visited → non-termination
             (multiply by 1, or cycles in residue graph). With path-visited → still
             exponential, and not shortest (DFS).
        ↓
Observation: state = residue. Edge cost = 1. First visit is shortest.
        ↓
Optimal: BFS from start over 0..99999. O(MOD * |arr|)
```

### Brute Force Approach

- Basic idea: DFS/backtracking that tries every `arr[i]` from the current value, depth = number of multiplications. Cap depth at `MOD` (a shortest path in this graph has length `< MOD`). Track the current residue; if you use a path-set instead of a global visited, you explode.
- Why it "works": a finite cap plus simple-path restriction on residues eventually enumerates a shortest sequence if one exists.
- Java code (already using a global `best[]` prune — still not BFS, still can TLE):

```java
import java.util.*;

class MinimumMultiplications {
    static final int MOD = 100000;
    int ans = Integer.MAX_VALUE;

    public int minimumMultiplications(int[] arr, int start, int end) {
        if (start == end) return 0;
        int[] best = new int[MOD];
        Arrays.fill(best, Integer.MAX_VALUE);
        best[start] = 0;
        dfs(start, 0, arr, end, best);
        return ans == Integer.MAX_VALUE ? -1 : ans;
    }

    private void dfs(int x, int steps, int[] arr, int end, int[] best) {
        if (x == end) {
            ans = Math.min(ans, steps);
            return;
        }
        for (int m : arr) {
            int nxt = (int) (((long) x * m) % MOD);
            if (steps + 1 < best[nxt]) {
                best[nxt] = steps + 1;
                dfs(nxt, steps + 1, arr, end, best);
            }
        }
    }
}
```

**Time Complexity Calculation:**
Even with `best[]` pruning this is an unordered search; worst case you still expand nearly every state from many parents before the prune kicks in. Recursion depth up to `MOD`. Not the algorithm you want at `MOD = 1e5`, `|arr| = 1e4`.

**Space Complexity Calculation:**
`O(MOD)` for `best`, `O(MOD)` recursion in the worst chain.

- **Why can this be improved?** The graph is unweighted. DFS finds *a* path, not the shortest, unless you add extra pruning that essentially reconstructs BFS. A queue gives shortest for free: first time you reach `end`, stop. Naive DFS fails both termination (if you forget visited-on-value) and optimality (if you visit-on-path only).

### Optimal Approach

Implicit directed graph, vertices = residues `0..MOD-1`, every edge weight 1. BFS from `start`.

**Core Observation**
`(a * b) % MOD` is closed on `0..MOD-1`. You will never see a state outside that range, so a `boolean[100000]` (or a `dist[]` filled with `-1`) is a complete visited structure. Because every edge costs 1, the BFS layer index **is** the multiplication count.

**Pattern Identification**
Implicit-graph BFS. Identical mental model to Word Ladder: nodes are values, edges are allowed operations, first time you hit the target you have the minimum operations.

**Step-by-Step Intuition**
1. If `start == end` return `0`.
2. `dist[MOD]` filled with `-1` (unvisited). `dist[start] = 0`. Queue the residue.
3. *Invariant: when you pop `x`, `dist[x]` is the minimum multiplications to produce `x`. Every previously popped residue had `dist ≤ dist[x]`.*
4. For each multiplier, `nxt = (x * m) % MOD` using `long` to stay honest. If `dist[nxt] == -1`, set `dist[nxt] = dist[x] + 1` and push. If `nxt == end`, you may return immediately.
5. Queue empty and `end` never painted → `-1`.

**Dry Run**

`arr=[2,5,7], start=3, end=30`. `MOD=100000`.

| Step | queue (front→back) | pop | generated (unvisited) | dist of new |
|------|--------------------|-----|------------------------|-------------|
| 0 | `3` | — | — | `dist[3]=0` |
| 1 | `6,15,21` | `3` | `3*2=6`, `3*5=15`, `3*7=21` | all 1 |
| 2 | `15,21,12,30,42` | `6` | `12, 30, 42` | all 2 |
| 3 | hit `30` | | | return `2` |

You never need the rest of the graph. `15` would also have produced `30` at dist 2; visited-on-value already recorded `30` at 2 from `6`, so the second parent is ignored — correct, not shorter.

Unreachable: `start=10, end=1, arr=[2,4]`. All generated residues stay even (and 0). `1` never painted → `-1`.

**Why Does It Work?**
Unweighted BFS shortest-path theorem: the first time a vertex is dequeued (or, equivalently, the first time it is painted), the path that painted it has the fewest edges. Re-visiting a residue later cannot use fewer multiplications. That is why visited-on-value is sufficient and why visited-on-path is the wrong granularity — it both explodes and lets a longer walk to the same residue continue.

**Java Code**

```java
import java.util.*;

class MinimumMultiplications {
    static final int MOD = 100000;

    public int minimumMultiplications(int[] arr, int start, int end) {
        if (start == end) return 0;

        int[] dist = new int[MOD];
        Arrays.fill(dist, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        dist[start] = 0;
        q.offer(start);

        while (!q.isEmpty()) {
            int x = q.poll();
            if (x == end) return dist[x];
            for (int m : arr) {
                int nxt = (int) (((long) x * m) % MOD);
                if (dist[nxt] == -1) {
                    dist[nxt] = dist[x] + 1;
                    q.offer(nxt);
                }
            }
        }
        return -1;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
At most `MOD` residues enter the queue, each once. Each expands `|arr|` edges. `O(MOD · |arr|) = O(10^5 · |arr|)`. With `|arr| ≤ 10^4` this is the tight worst case the constraint allows; in practice many residues are unreachable and you return early on hitting `end`.

**Space Complexity Calculation:**
`dist[MOD]` is `O(MOD)`. Queue holds `O(MOD)` in the worst layer. No explicit adj list — that is the point of the implicit graph.

### Pattern to Remember

```text
Clue: min operations under (x * a) % M, values wrap into a small range
Pattern: BFS on implicit residue graph 0..M-1; visited-on-value, not on-path
Mental model: Word Ladder, but the "word" is an integer and the "change" is a multiply
```

**Similar problems:** 16 Word Ladder I (implicit BFS); 32 Shortest Path in Binary Maze; 28 Shortest Path in UG with unit weights; 35 Network Delay Time (weighted cousin — do not put a heap here).

**Interview tip:** Multiply in `long` and take `% 100000`, and return `0` when `start == end` before touching the queue — both are the bugs people ship.

---

## 38. Bellman-Ford Algorithm

### Problem Understanding

Directed weighted graph, edge list `edges[i] = [u, v, w]` (`w` may be **negative**), source `src`. Compute shortest-path distances from `src` to every vertex. If a negative cycle is reachable from `src` (and can affect some dist), report it.

**Input / Output / Constraints**
- Input: `V` vertices `0..V-1`, directed `edges[u,v,w]`, `src`.
- Output: `int[] dist` of size `V`, or `[-1]` if a negative cycle is detectable by a V-th relaxation.
- Typical GFG: `V ≤ 500`, weights can be negative, graph may be disconnected.
- Signature used here: `public int[] bellmanFord(int V, int[][] edges, int src)`.

**Observations**
- Dijkstra's "first pop is final" dies as soon as a negative edge can improve a settled node. You need an algorithm that is willing to update a node many times.
- A simple path has at most `V-1` edges. Relaxing **all** edges `V-1` times is enough for every simple shortest path to propagate from `src`.
- A V-th successful relaxation means some path with `≥ V` edges is still improving dist → a cycle, and that cycle has negative total weight.
- Undirected graph + one negative edge: you would store both `(u,v,w)` and `(v,u,w)`, forming a 2-cycle of weight `2w < 0`. Bellman-Ford on undirected-with-negatives is not a shortest-path algorithm; it is a negative-cycle detector that will always fire.
- `INF + w`: if you use `Integer.MAX_VALUE` and forget to skip unreachable `u`, overflow (or `INF + (negative)` looking like a real path) corrupts dist. Use a large `INF` **and** `if (dist[u] == INF) continue`.
- After `i` iterations, `dist[u]` is correct for the shortest path that uses **at most `i` edges** ("nearby first").

**Example**
```text
V = 4, src = 0
edges: 0→1 (4), 0→2 (5), 1→2 (-3), 2→3 (4), 1→3 (6)

0 --4--> 1 --6--> 3
 \       |       /
  5     -3      4
   \     |     /
         2

dist = [0, 4, 1, 5]
  0→1 = 4
  0→1→2 = 4-3 = 1   (beats direct 5)
  0→1→2→3 = 1+4 = 5 (beats 0→1→3 = 10)
```

**Example (negative cycle)**
```text
V = 3, src = 0
0→1 (1), 1→2 (-4), 2→1 (1)
cycle 1→2→1 has weight -3. V-th pass still relaxes → [-1].
```

**Example (undirected trap)**
```text
Undirected edge {0,1} weight -5
stored as 0→1 (-5) and 1→0 (-5)
cycle 0-1-0 weight -10. Always reported as a negative cycle.
```

### How to Think About the Problem

- What should I notice first? Negative weights. Ask "is there a negative cycle?" before you trust any dist array. Dijkstra is off the table as the correct tool.
- Which representation? **Edge list**, not adj list. One pass = one scan of `E` triples. That is why the Java is a triple loop over `edges`, not over `adj.get(u)`.
- Minimizing under possible negatives, detecting a certificate of unboundedness (the extra pass).
- No "natural" traversal order. You brute-force-relax every edge, `V-1` rounds, so information from `src` can walk across the longest possible simple path.
- **Clue → Pattern:** *Negatives allowed, no Dijkstra; relax all E edges V-1 times, one more pass for a negative cycle.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: enumerate simple paths from src (exponential), or
             Dijkstra-with-settle which is incorrect on negatives.
        ↓
Observation: shortest simple path has ≤ V-1 edges.
             DP: dist^{(i)}[v] = min over edges u→v of dist^{(i-1)}[u] + w.
        ↓
Optimal: Bellman-Ford. O(V E). Extra pass → negative cycle.
```

### Brute Force Approach

- Basic idea (the wrong algorithm people reach for): run Dijkstra anyway. It is faster and you already have the code from 30/35.
- Why it does **not** work: the greedy settle step assumes no later edge can reduce a popped dist. A negative edge from a not-yet-processed (or already-processed, then improved) node violates that. Even "Dijkstra with re-push" can degrade to exponential expansions; it is not the algorithm for this problem.
- Java code (Dijkstra — **incorrect** on the example, shown to pin the failure):

```java
import java.util.*;

class BellmanFord {
    // WRONG on negative weights. Kept as the naive idea you must reject.
    public int[] dijkstraNaive(int V, int[][] edges, int src) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(new int[]{e[1], e[2]});

        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE / 4);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.offer(new int[]{0, src});
        boolean[] vis = new boolean[V];

        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int u = cur[1];
            if (vis[u]) continue;
            vis[u] = true; // this freeze is the bug once negatives exist
            for (int[] e : adj.get(u)) {
                if (dist[u] + e[1] < dist[e[0]]) {
                    dist[e[0]] = dist[u] + e[1];
                    pq.offer(new int[]{dist[e[0]], e[0]});
                }
            }
        }
        return dist;
    }
}
```

Counterexample: `0→1 (4)`, `0→2 (5)`, `2→1 (-10)`. Dijkstra with `vis` pops `1` at dist 4 and freezes it; true dist is `5-10 = -5`.

**Time Complexity Calculation:**
`O((V+E) log V)` and wrong. Fast and incorrect is not a candidate.

**Space Complexity Calculation:**
`O(V+E)`.

- **Why can this be improved?** You cannot. You replace it. The improvement is a different DP: allow each dist to change up to `V-1` times, once per additional hop. That is Bellman-Ford. Naive Dijkstra fails on any negative edge that undercuts a settled node; naive path enumeration fails the time limit.

### Optimal Approach

Directed graph, arbitrary (possibly negative) weights, **edge-list** representation. Dynamic programming on hop count.

**Core Observation**
Let `dist_i[v]` be the shortest path from `src` to `v` that uses at most `i` edges.

```text
dist_0[src] = 0, dist_0[other] = INF

dist_i[v] = min( dist_{i-1}[v],
                 min over edges u→v of dist_{i-1}[u] + w(u,v) )
```

`dist_{V-1}` is the shortest **simple** path (a shortest path, if finite, can be chosen simple). If `dist_V[v] < dist_{V-1}[v]` for any `v`, a walk with `V` edges improved it → some vertex repeats → a cycle with negative total weight is reachable from `src` on a path that continues to `v`.

**Pattern Identification**
SSSP with negatives; negative-cycle detection. Cheapest Flights Within K Stops (34) is Bellman-Ford stopped after `K+1` hops.

**Step-by-Step Intuition**
1. `dist[src] = 0`, others `INF = 100_000_000` (fits `int`, leaves room for `+ w`).
2. Repeat `V-1` times: for every edge `u → v` weight `w`, if `dist[u]` is finite and `dist[u] + w < dist[v]`, write the new dist. Optional early exit if a whole pass does nothing.
3. *Invariant after pass `i`: every vertex whose true shortest path has ≤ `i` edges now has the correct dist. Vertices farther out may still be `INF` or only partially improved — "nearby first".*
4. One more pass. If any edge still relaxes, return `[-1]`.
5. Leave unreachable vertices at `INF`. Do not convert them to `0`.

**Dry Run**

Edges in this order: `(0,1,4), (0,2,5), (1,2,-3), (2,3,4), (1,3,6)`. `V=4`, so 3 passes. `INF` written as `∞`.

| Pass | edge scan (only firing relaxations) | dist `[0,1,2,3]` |
|------|--------------------------------------|------------------|
| 0 | init | `[0, ∞, ∞, ∞]` |
| 1 | 0→1: 4; 0→2: 5; 1→2: 4-3=1; 2→3: 1+4=5; 1→3: 4+6=10→ keep 5 | `[0, 4, 1, 5]` |
| 2 | none fire | `[0, 4, 1, 5]` |
| 3 | none fire | `[0, 4, 1, 5]` |
| 4th | none fire → no negative cycle | return dist |

Pass 1 already finished because the edge order happened to match the path `0-1-2-3`. Reverse the edge list and the same numbers arrive "nearby first": after pass 1 only `dist[1]` and maybe `dist[2]` move; `dist[3]` waits for a later pass. Both orders are correct after `V-1`.

Negative-cycle dry run: add `3→1 (-10)`.

Cycle `1→2→3→1` weight `-3+4-10 = -9`. After the `V-1` passes dist is already drifting; the V-th pass still finds `dist[1] + (-3) < dist[2]` (or a similar edge) → `[-1]`.

**Why Does It Work?**
Induction on hop count: a shortest walk with `i` edges is a shortest walk with `i-1` edges to some `u`, plus one edge `u → v`. Scanning every edge once per hop considers that last edge. After `V-1` hops every simple path has been given a chance. A further improvement is possible only by repeating a vertex, i.e. closing a cycle whose total weight is negative (otherwise taking the cycle would not improve dist). Skipping `dist[u] == INF` is required for correctness, not speed: an unreachable `u` must not leak `INF + (negative w)` into the reachable component.

**Java Code**

```java
import java.util.*;

class BellmanFord {
    static final int INF = 100_000_000;

    public int[] bellmanFord(int V, int[][] edges, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;

        for (int i = 0; i < V - 1; i++) {
            boolean updated = false;
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (dist[u] == INF) continue; // unreachable must not leak through negative w
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    updated = true;
                }
            }
            if (!updated) break;
        }

        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != INF && dist[u] + w < dist[v]) {
                return new int[]{-1}; // V-th relaxation still fires → negative cycle
            }
        }
        return dist;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
`V-1` passes × `E` edges, plus one detection pass: `O(V E)`. Early break helps typical acyclic / already-shortest cases but does not change the worst case (a path that is a chain of `V-1` edges in the worst edge order needs all `V-1` passes).

**Space Complexity Calculation:**
`O(V)` for `dist`. The edge list is the input, `O(E)`. No heap, no adj list required.

### Pattern to Remember

```text
Clue: single-source shortest paths, negative weights, or "is there a negative cycle?"
Pattern: relax all E edges V-1 times; one more pass. Edge list, not a heap.
Mental model: DP on hop count; after i passes, ≤ i-edge paths are correct ("nearby first")
```

**Similar problems:** 34 Cheapest Flights Within K Stops (Bellman-Ford for exactly/at most `K` hops); 30 Dijkstra's Algorithm (the algorithm you must **not** use here); 39 Floyd-Warshall (all-pairs, also handles negatives).

**Interview tip:** Name the two reasons Dijkstra dies (greedy settle is false; re-push is not `O(E log V)` with negatives) and the overflow skip (`if (dist[u] == INF) continue`) — that skip is a correctness bug, not a micro-opt.

---

## 39. Floyd-Warshall Algorithm

### Problem Understanding

All-pairs shortest paths on a directed graph given as a matrix. `matrix[i][j]` is the weight of `i → j`, or a sentinel (`INF` / `-1` on GFG) if no edge. After the algorithm, `matrix[i][j]` is the shortest `i → j` distance, still sentinel if unreachable. If any `dist[i][i] < 0`, a negative cycle exists.

**Input / Output / Constraints**
- Input: `n × n` matrix, `n` typically `≤ 100..400` in interview settings. No-edge = `-1` (GFG) or `INF`.
- Output: in-place matrix of all-pairs distances; optional negative-cycle flag via the diagonal.
- Self distance `matrix[i][i] = 0` (unless a negative self-loop).
- Signature used here: `public void shortestDistance(int[][] matrix)`.

**Observations**
- You are no longer asking "from one `src`". You are filling an entire table.
- Negative weights are allowed. Negative cycles are detected by `dist[i][i] < 0`, not by a V-th pass.
- The recurrence needs a third index: "which vertices are allowed as intermediates." That index **must** be the outermost loop. Swapping it with `i`/`j` silently computes the wrong DP.
- 3D DP `dp[k][i][j]` collapses to in-place 2D because the values `dist[i][k]` and `dist[k][j]` do not themselves use `k` as an intermediate on a simple path.
- `INF + INF` (or `INF + w`) overflow is the same trap as Bellman-Ford. Skip if either side is unreachable.

**Example**
```text
matrix (INF = no edge):

      0    1    2
0     0    4   INF
1    INF   0    1
2     2   INF   0

0 --4--> 1 --1--> 2
 ↑                |
 └------- 2 ------┘
```
All-pairs result:

```text
      0    1    2
0     0    4    5     (0→1→2)
1     3    0    1     (1→2→0)
2     2    6    0     (2→0→1)
```

**Example (negative cycle)**
```text
0 → 1 (-2), 1 → 0 (-2)  or any i with dist[i][i] < 0 after Floyd.
Diagonal goes negative → report a cycle. Distances are then meaningless.
```

### How to Think About the Problem

- What should I notice first? All pairs, `n` small, matrix already there. Three nested loops, `k` outside. If you catch yourself writing Dijkstra `n` times, that is valid for **non-negative** sparse graphs and a different pattern.
- Which representation? Adjacency **matrix**. Floyd is the rare graph algorithm that wants `dist[i][j]`, not an adj list.
- Minimizing over a choice of intermediate "hub" vertices. This is DP, not a traversal.
- No queue, no heap, no recursion. The "traversal" is `for k, for i, for j`.
- **Clue → Pattern:** *All-pairs + matrix + `n ≲ 400` → Floyd-Warshall, `k` outermost; `dist[i][i] < 0` means a negative cycle.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every pair (s,t), enumerate simple s-t paths. O(n! ) per pair.
        ↓
Better: Bellman-Ford from every source. O(V · V E) = O(V^2 E).
        Dijkstra from every source if all weights ≥ 0: O(V (E log V)).
        ↓
Observation: shortest i→j either avoids k, or is i→k plus k→j,
             where both halves only use hubs {0..k-1}.
        ↓
Optimal: Floyd-Warshall O(V^3), one in-place matrix, negatives OK (no neg cycle).
```

### Brute Force Approach

- Basic idea: run Bellman-Ford from every vertex. All-pairs, negatives allowed, cycle check per source.
- Why it works: each source independently gets a correct `dist` row, or a negative-cycle report.
- Java code:

```java
import java.util.*;

class FloydWarshall {
    static final int INF = 100_000_000;

    public int[][] allPairsBellman(int n, int[][] edges) {
        int[][] dist = new int[n][n];
        for (int s = 0; s < n; s++) {
            int[] row = new BellmanFord().bellmanFord(n, edges, s);
            if (row.length == 1 && row[0] == -1) {
                return new int[][]{{-1}}; // a negative cycle is reachable from s
            }
            dist[s] = row;
        }
        return dist;
    }
}
```

(Uses the `BellmanFord` class from problem 38.)

**Time Complexity Calculation:**
`V` sources × `O(V E)` = `O(V^2 E)`. On a dense graph `E ~ V^2`, that is `O(V^4)`. Floyd's `O(V^3)` is a full factor of `V` faster in that regime, and the code is three loops.

**Space Complexity Calculation:**
`O(V^2)` for the answer matrix, plus `O(V)` scratch per source.

- **Why can this be improved?** You recompute overlapping subpaths. Floyd shares them: once `k` is a legal hub, every pair reuses the already-computed `i→k` and `k→j`. Naive per-source Bellman-Ford fails the dense `n ~ 400` budget (`400^4` is out). Per-source Dijkstra is faster on sparse **non-negative** graphs — different problem.

### Optimal Approach

Directed (or undirected, stored symmetrically), weighted, matrix. DP on the **set of allowed intermediate vertices**.

**Core Observation**

```text
dp[k][i][j] = shortest i→j using intermediate vertices ⊆ {0, 1, ..., k-1}

dp[0][i][j] = matrix[i][j]          (no intermediates: the direct edge)
dp[0][i][i] = 0

dp[k+1][i][j] = min(
    dp[k][i][j],                    // do not use vertex k
    dp[k][i][k] + dp[k][k][j]       // use k as a single hub
)
```

`k` is the size of the allowed-hub set. It **must** be the outermost loop: to compute the `k`-using option you need *every* pair's answer for hub-set `{0..k-1}` already finished.

In-place 2D is safe: `dp[k][i][k] = dp[k-1][i][k]` (a shortest `i→k` has no reason to visit `k` in the middle), similarly `dp[k][k][j] = dp[k-1][k][j]`. So reading `dist[i][k]` and `dist[k][j]` while writing `dist[i][j]` still sees the previous-k values.

**Pattern Identification**
All-pairs DP. After it, one scan of the diagonal for negative cycles. Problem 40 is this algorithm plus a counting/tie-break wrapper.

**Step-by-Step Intuition**
1. Copy/sanitize the matrix: `-1` → `INF`, `dist[i][i] = 0`.
2. `for k in 0..n-1`, `for i`, `for j`: if both `dist[i][k]` and `dist[k][j]` are finite, `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`.
3. *Invariant after finishing a given `k`: `dist[i][j]` is the shortest `i→j` path whose internal vertices all have index `≤ k`.*
4. Convert remaining `INF` back to `-1` if the judge uses that sentinel.
5. If any `dist[i][i] < 0`, a negative cycle exists (a walk from `i` to `i` using some hubs went below zero).

**Dry Run**

Start (after sanitizing):

| k done | dist[0] | dist[1] | dist[2] | what changed |
|--------|---------|---------|---------|--------------|
| none | `0, 4, ∞` | `∞, 0, 1` | `2, ∞, 0` | direct edges |
| k=0 | `0, 4, ∞` | `∞, 0, 1` | `2, 6, 0` | 2→0→1 = 2+4=6 |
| k=1 | `0, 4, 5` | `∞, 0, 1` | `2, 6, 0` | 0→1→2 = 4+1=5 |
| k=2 | `0, 4, 5` | `3, 0, 1` | `2, 6, 0` | 1→2→0 = 1+2=3 |

Matches the example. If you had looped `i, j, k` instead, the `k=2` update `1→0` would have been attempted before `0→1→2` even existed, and you can both miss paths and use a mix of old/new hub-sets. That is not a style preference; it is a wrong recurrence.

**Why Does It Work?**
Any simple path's internal vertices can be ordered by a "highest index `k`". Split the path at that `k`: left half and right half both use only hubs `< k`. The recurrence considers exactly that split, for every pair, for every possible highest hub. Trying hubs in increasing `k` therefore builds shortest paths of growing hub-sets. A negative cycle is a closed walk of negative weight; once all vertices are legal hubs, that walk appears as `dist[i][i] < 0` for each `i` on the cycle.

**Java Code**

```java
import java.util.*;

class FloydWarshall {
    static final int INF = 100_000_000;

    public void shortestDistance(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) matrix[i][j] = 0;
                else if (matrix[i][j] == -1) matrix[i][j] = INF;
            }
        }

        for (int k = 0; k < n; k++) {          // k MUST be outermost
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (matrix[i][k] == INF || matrix[k][j] == INF) continue;
                    matrix[i][j] = Math.min(matrix[i][j], matrix[i][k] + matrix[k][j]);
                }
            }
        }

        // Optional detection: a negative cycle exists iff some dist[i][i] < 0.
        // for (int i = 0; i < n; i++) if (matrix[i][i] < 0) { ... }

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (matrix[i][j] >= INF) matrix[i][j] = -1;
            }
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Three nested loops over `n`: `O(V^3)`. Independent of `E`. Dense and sparse cost the same — that is why you do not pick Floyd on a 10^5-vertex sparse graph.

**Space Complexity Calculation:**
In-place on the `n × n` matrix: `O(1)` extra, `O(V^2)` total. The 3D formulation would be `O(V^3)` and is never stored.

### Pattern to Remember

```text
Clue: shortest path between EVERY pair, n is small, matrix input
Pattern: for k, for i, for j: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
Mental model: DP on allowed intermediate vertices; k outermost or the DP is wrong
```

**Similar problems:** 38 Bellman-Ford (single-source, hop DP); 40 Find the City with the Smallest Number of Neighbors (Floyd + count/tie-break); 35 Network Delay Time (one source, heap).

**Interview tip:** Write the `k` loop first, out loud: "k is the hub we are introducing." If the interviewer asks why not `i,j,k`, say the 3D recurrence needs the entire previous hub-set finished.

---

## 40. Find the City with the Smallest Number of Neighbors at a Threshold Distance

### Problem Understanding

`n` cities `0..n-1`, undirected weighted edges `edges[i] = [from, to, weight]`, integer `distanceThreshold`. For each city `i`, count how many other cities `j` satisfy `dist(i,j) ≤ distanceThreshold`. Return the city whose count is **smallest**. If several cities share that smallest count, return the **largest** city index.

**Input / Output / Constraints**
- Input: `n`, `edges[from,to,weight]` undirected unique pairs, `distanceThreshold`.
- Output: `int` city index.
- `1 <= n <= 100`, `1 <= weight, distanceThreshold <= 10^4`.
- Judge: `public int findTheCity(int n, int[][] edges, int distanceThreshold)`.

**Observations**
- You need distances between **all** pairs. `n ≤ 100` → Floyd-Warshall is the intended tool. Dijkstra from every city is also in budget.
- Count is "how many cities are close to me", not "how far is the farthest". A well-connected hub loses this problem.
- Tie-break is the trap: **largest** index, not smallest, not "any". A scan `i = 0..n-1` with `<=` on the count (strict on improvement, equal allowed to overwrite) picks the largest index automatically.
- `dist[i][i] = 0` must **not** count as a neighbor. Loop `j != i`.
- `n = 1`: zero neighbors, answer `0`.
- Undirected: fill `dist[u][v] = dist[v][u] = w`. Forgetting the reverse edge makes one direction look unreachable and wrecks the counts.

**Example**
```text
n = 4, distanceThreshold = 4
edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]]

0 --3-- 1 --1-- 2
         \      /
          4    1
           \  /
            3

all-pairs:
  0-1 = 3, 0-2 = 4, 0-3 = 5
  1-2 = 1, 1-3 = 2 (via 2, beats 4), 2-3 = 1
```

| city | reachable with dist ≤ 4 | count |
|------|-------------------------|-------|
| 0 | 1, 2 (3 is 5) | 2 |
| 1 | 0, 2, 3 | 3 |
| 2 | 0, 1, 3 | 3 |
| 3 | 1, 2 (0 is 5) | 2 |

Smallest count = 2, cities `{0, 3}`, largest index = **3**.

**Example (`n = 1`)**
```text
n = 1, edges = [], distanceThreshold = 100 → 0
```

**Example (tie only)**
```text
A complete graph with equal weights, threshold large enough that every city sees n-1 others.
Every count equal → return n-1.
```

### How to Think About the Problem

- What should I notice first? The scoring is "fewest cities I can reach within T", and the loser-of-ties is the small index. The graph problem is all-pairs; the interview problem is the tie-break.
- Which representation? Matrix for Floyd. Adj list if you Dijkstra `n` times.
- Counting after minimizing. Two phases: fill `dist[][]`, then for each row count `dist[i][j] ≤ T`, track `(minCount, bestCity)`.
- Floyd is the natural all-pairs pass (`n ≤ 100` ⇒ `n^3 = 1e6`). Dijkstra-from-each is the natural alternative and a good thing to mention.
- **Clue → Pattern:** *All-pairs distances, then per-row count ≤ threshold; minimize count, maximize index on ties.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: for each city, DFS/BFS all paths, keep min dist, count. Exponential.
        ↓
Better: Dijkstra from each city. O(V (E log V)). Fine at n=100.
        ↓
Observation: n ≤ 100, need every pair. Floyd is shorter to write and handles
             the matrix in one breath.
        ↓
Optimal: Floyd-Warshall + linear scan with the largest-index tie-break.
```

### Brute Force Approach

- Basic idea: from every city run Dijkstra (problem 30/35) on the undirected graph. Count `dist[j] ≤ threshold` for `j != src`. Track the city with smallest count, breaking ties by larger index.
- Why it works: each Dijkstra row is correct (weights are positive here). The second pass is the problem's scoring rule.
- Java code:

```java
import java.util.*;

class FindTheCity {
    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            adj.get(e[1]).add(new int[]{e[0], e[2]});
        }

        int bestCity = -1, bestCnt = n + 1;
        for (int src = 0; src < n; src++) {
            int cnt = reachable(src, n, adj, distanceThreshold);
            if (cnt <= bestCnt) { // equal → later (larger) src wins
                bestCnt = cnt;
                bestCity = src;
            }
        }
        return bestCity;
    }

    private int reachable(int src, int n, List<List<int[]>> adj, int T) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE / 4);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.offer(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue;
            for (int[] e : adj.get(u)) {
                if (dist[u] + e[1] < dist[e[0]]) {
                    dist[e[0]] = dist[u] + e[1];
                    pq.offer(new int[]{dist[e[0]], e[0]});
                }
            }
        }
        int cnt = 0;
        for (int j = 0; j < n; j++) {
            if (j != src && dist[j] <= T) cnt++;
        }
        return cnt;
    }
}
```

**Time Complexity Calculation:**
`V` Dijkstras, each `O((V+E) log V)`. `E ≤ n(n-1)/2`, `n ≤ 100` → comfortably passes. This is a valid accepted solution.

**Space Complexity Calculation:**
Adj `O(V+E)`, plus `O(V)` scratch per Dijkstra.

- **Why can this be improved?** Asymptotically Floyd is `O(V^3)` vs `O(V (E log V))`. On this dense-ish `n=100` they are the same order. The real improvement is code surface: one triple loop, no heap, and you already have Floyd from 39. Naive path-enumeration from each city fails the time limit; the "naive" Dijkstra-from-each does not fail correctness, it is only heavier to write under a clock.

### Optimal Approach

Undirected, weighted, non-negative, `n ≤ 100`. All-pairs via Floyd-Warshall, then a scoring scan.

**Core Observation**
City `i`'s score is the size of `{ j ≠ i | dist[i][j] ≤ T }`. You want `argmin_i score(i)`, and on a tie `argmax i`. After Floyd, `dist[i][j]` is sitting there; the rest is a double loop and a comparison.

**Pattern Identification**
Floyd (39) as a subroutine + a reduction (min count, max index). Network Delay Time (35) is the single-source analogue ("max dist from one source"); here you compare **counts of close nodes** across sources.

**Step-by-Step Intuition**
1. Allocate `dist[n][n] = INF`, `dist[i][i] = 0`. Write both directions of every edge.
2. Floyd: `k` outer, skip `INF` endpoints, `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`.
3. *Invariant: after Floyd, `dist[i][j]` is the shortest i–j distance in the undirected graph (finite iff a path exists).*
4. `bestCnt = n+1`, `bestCity = -1`. For `i = 0..n-1` count `j ≠ i` with `dist[i][j] ≤ T`. If `cnt <= bestCnt`, take `i`. The `<=` (not `<`) is the tie-break: a later city with the same count overwrites.
5. Return `bestCity`. `n = 1` yields count `0` and city `0`.

**Dry Run**

Threshold `T = 4`. After Floyd:

| | 0 | 1 | 2 | 3 |
|--|---|---|---|---|
| 0 | 0 | 3 | 4 | 5 |
| 1 | 3 | 0 | 1 | 2 |
| 2 | 4 | 1 | 0 | 1 |
| 3 | 5 | 2 | 1 | 0 |

| Step | city i | neighbors ≤ 4 | cnt | bestCnt | bestCity |
|------|--------|----------------|-----|---------|----------|
| 1 | 0 | 1,2 | 2 | 2 | 0 |
| 2 | 1 | 0,2,3 | 3 | 2 | 0 (3 > 2, ignore) |
| 3 | 2 | 0,1,3 | 3 | 2 | 0 |
| 4 | 3 | 1,2 | 2 | 2 | **3** (`cnt == bestCnt`, larger index wins) |

Answer `3`.

If you had used `<` instead of `<=`, city `0` would survive the tie and you would fail the example. That is the entire trick.

**Why Does It Work?**
Floyd is correct on non-negative undirected graphs (special case of 39). The score is a definition, not a graph theorem. Scanning cities in increasing index and allowing equal-count overwrite implements "smaller count, then larger index" without a second key. Unreachable pairs stay `INF`, which is `> T`, so they do not increment the count — a disconnected city looks "small" and is a legitimate winner if the threshold isolates it.

**Java Code**

```java
import java.util.*;

class FindTheCity {
    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
        int INF = 1_000_000_000;
        int[][] dist = new int[n][n];
        for (int i = 0; i < n; i++) {
            Arrays.fill(dist[i], INF);
            dist[i][i] = 0;
        }
        for (int[] e : edges) {
            dist[e[0]][e[1]] = e[2];
            dist[e[1]][e[0]] = e[2];
        }

        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (dist[i][k] == INF || dist[k][j] == INF) continue;
                    dist[i][j] = Math.min(dist[i][j], dist[i][k] + dist[k][j]);
                }
            }
        }

        int bestCity = -1, bestCnt = n + 1;
        for (int i = 0; i < n; i++) {
            int cnt = 0;
            for (int j = 0; j < n; j++) {
                if (i != j && dist[i][j] <= distanceThreshold) cnt++;
            }
            if (cnt <= bestCnt) { // <= so a later city with the same count wins
                bestCnt = cnt;
                bestCity = i;
            }
        }
        return bestCity;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Floyd `O(n^3)`. Scoring scan `O(n^2)`. Dominated by `O(n^3)`. At `n = 100`, `10^6` operations.

**Space Complexity Calculation:**
`O(n^2)` for `dist`. Input edges `O(E)`.

### Pattern to Remember

```text
Clue: among all cities, who has the fewest nodes within distance T? ties → largest index
Pattern: all-pairs (Floyd, n≤100) then count per row; overwrite on equal count
Mental model: Floyd as a table, the graph problem is the table, the interview is the tie-break
```

**Similar problems:** 39 Floyd-Warshall Algorithm (the engine); 35 Network Delay Time (single-source "how far does the signal go"); 30 Dijkstra's Algorithm (the per-source alternative).

**Interview tip:** Before you code, say the tie-break twice: "smallest number of neighbors, if tie the **largest** city index." Then write `if (cnt <= bestCnt)` and move on.
