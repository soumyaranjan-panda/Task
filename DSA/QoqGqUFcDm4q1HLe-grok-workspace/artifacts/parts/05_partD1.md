# PART D — Shortest Path Algorithms and Problems

Every shortest-path algorithm is the same relaxation line: `if (dist[v] > dist[u] + w) dist[v] = dist[u] + w`. What changes is *when* you fire that line and *in what order*. BFS is the case `w = 1` (a FIFO queue already pops in increasing hop-distance); Dijkstra is the case `w ≥ 0` (a min-heap pops in increasing distance). On a DAG you topo-sort and relax each edge exactly once in `O(V+E)`, and negative weights are legal because a DAG cannot contain a negative cycle. Bellman-Ford fires the line for `|V|−1` rounds to survive negatives; Floyd-Warshall fires it for every triple `(k,u,v)` to get all-pairs. This part has 13 problems; this file covers 28–34.

## 28. Shortest Path in Undirected Graph with Unit Weights

takeUforward G-28.

### Problem Understanding
An undirected graph with `n` vertices (`0 … n-1`) and unit-weight edges. Return the shortest hop-distance from a given `src` to every vertex. Unreachable vertices get `-1`.

**Input / Output / Constraints**
- Input: `n`, undirected `edges[][2]`, `src`
- Output: `int[] dist` of length `n`; `dist[src] = 0`; unreachable = `-1`
- Graph may be disconnected. Single source — not a multi-source BFS.

**Observations**
- Every edge contributes `+1`. Distance = number of edges on a path.
- FIFO order *is* distance order when `w = 1`. The first time you visit a node you are on a shortest hop-path.
- Disconnected vertices (and anything with no path from `src`) stay `INF` and become `-1`.
- Directed unit-weight graphs use the same BFS; undirected only changes how you fill `adj` (both ways).

**Example**
```text
n = 6, src = 0
edges = [[0,1],[0,2],[1,3],[2,3],[3,4]]

        1 —— 3 —— 4
       /    /
      0 —— 2         5   (5 is disconnected)

Output: [0, 1, 1, 2, 3, -1]
```

**Example (edge)** — `src` isolated, `n = 3`, `edges = []` → `[0, -1, -1]`.

### How to Think About the Problem
- What should I notice first? Weights are uniformly `1`. The metric is hops, not a sum of arbitrary numbers.
- Which representation? Adjacency list. You scan neighbors, never a matrix.
- Counting / searching / ordering / minimizing → which mental model? Minimizing hops from one source. Unweighted single-source shortest path.
- Which traversal is natural? BFS. DFS has no hop-order. A Dijkstra heap is the same algorithm with a log factor you do not need.
- **Clue → Pattern:** *undirected (or directed) + every weight = 1 + single source → BFS into `dist[]`, first visit wins.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS every simple path, keep min hops          exponential
        ↓
Observation: FIFO expands one hop at a time, so the
             first time you reach v you are on a
             shortest hop-path. Marking permanently
             is then safe — unlike DFS.
        ↓
Optimal: BFS, dist[src]=0, relax dist[v]=dist[u]+1          O(V+E)
```

### Brute Force Approach
- Basic idea: walk every simple path from `src` with backtracking. Whenever you reach `v` with fewer hops than before, record it. Unmark `onPath` on the way out so a later, shorter route can still use `v`.
- Why it works: the set of simple paths includes a shortest one. You take the min.

```java
import java.util.*;

class ShortestPathUnitWeightsBrute {
    public int[] shortestPath(int n, int[][] edges, int src) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] best = new int[n];
        Arrays.fill(best, Integer.MAX_VALUE);
        dfs(src, 0, adj, new boolean[n], best);
        for (int i = 0; i < n; i++) {
            if (best[i] == Integer.MAX_VALUE) best[i] = -1;
        }
        return best;
    }

    private void dfs(int u, int d, List<List<Integer>> adj,
                     boolean[] onPath, int[] best) {
        if (d >= best[u]) return;
        best[u] = d;
        onPath[u] = true;
        for (int v : adj.get(u)) {
            if (!onPath[v]) dfs(v, d + 1, adj, onPath, best);
        }
        onPath[u] = false; // allow a different path to use u
    }
}
```

**Time Complexity Calculation:** Up to `O(n!)` simple paths in a dense undirected graph. Each path walks up to `V` vertices.
**Space Complexity Calculation:** Recursion + `onPath` = `O(V)`, plus `adj` = `O(V+E)`.

- **Why can this be improved?** DFS has no distance order. It can spend a 5-hop excursion on `v` before a 2-hop route is found, so you are forced to unmark and re-explore. BFS *is* the distance order, so the first hit is final.

Naive DFS that marks `vis` permanently is **wrong**: whichever neighbor DFS tries first freezes `dist[v]`. In the example, a DFS that walks `0 → 1 → 3 → 2` first freezes `dist[2] = 3` even though `0 → 2` is 1. That is why "visited-once DFS" is not a shortest-path algorithm.

### Optimal Approach
The structure being exploited is an **undirected unweighted graph**: unit edges, single source. BFS layers *are* distance layers.

**Core Observation**
In a FIFO queue, vertices leave in non-decreasing hop-distance. The first time `v` is discovered, no shorter hop-path can exist: any other path has at least as many edges, and BFS already processed every closer vertex.

**Pattern Identification**
Initialize `dist = INF`, `dist[src] = 0`, push `src`. Relax `dist[v] = dist[u] + 1` only when it improves, and enqueue on improvement. After the queue drains, leftover `INF` → `-1`.

**Step-by-Step Intuition**
1. Build an undirected adjacency list.
2. `dist[u] = INF` for all `u`, `dist[src] = 0`. That is the only finite seed.
3. Queue starts with `src`. *Invariant: every vertex in the queue already has its final hop-distance. Vertices not yet seen have `dist = INF`.*
4. Pop `u`. For each neighbor `v`, if `dist[u] + 1 < dist[v]`, this is the first (hence shortest) visit: write `dist[v]` and push `v`.
5. Because weights are `1`, `v` will never improve later. No decrease-key, no re-push.
6. Vertices that stay `INF` are in other components — write `-1`.

**Dry Run** — example above, `src = 0`.

| Step | State (queue / dist) | Action |
|------|----------------------|--------|
| init | q=`[0]`; `[0, ∞, ∞, ∞, ∞, ∞]` | seed |
| 1 | q=`[1, 2]`; `[0, 1, 1, ∞, ∞, ∞]` | pop 0; first-visit 1 and 2 |
| 2 | q=`[2, 3]`; `[0, 1, 1, 2, ∞, ∞]` | pop 1; first-visit 3 |
| 3 | q=`[3]`; `[0, 1, 1, 2, ∞, ∞]` | pop 2; `dist[3]` already 2, skip |
| 4 | q=`[4]`; `[0, 1, 1, 2, 3, ∞]` | pop 3; first-visit 4 |
| 5 | q=`[]`; `[0, 1, 1, 2, 3, ∞]` | pop 4; no new |
| end | `[0, 1, 1, 2, 3, -1]` | 5 never enqueued |

**Why Does It Work?**
BFS processes vertices by hop-distance `0, 1, 2, …`. A path of `d` edges is considered only after every path of `< d` edges. Therefore the discovering path is a shortest hop-path, and freezing `dist[v]` is sound. Vertex 5 is the proof that BFS does not invent edges: leftover `INF` is real unreachability.

**Java Code**

```java
import java.util.*;

class ShortestPathUnitWeights {
    public int[] shortestPath(int n, int[][] edges, int src) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(src);

        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                // first visit ⇔ shortest hop-path, because w = 1
                if (dist[v] > dist[u] + 1) {
                    dist[v] = dist[u] + 1;
                    q.add(v);
                }
            }
        }

        for (int i = 0; i < n; i++) {
            if (dist[i] == Integer.MAX_VALUE) dist[i] = -1;
        }
        return dist;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each vertex is enqueued at most once (first visit is final). Each edge is looked at once from each end. `O(V+E)`.

**Space Complexity Calculation:**
`adj` is `O(V+E)`, `dist` and the queue are `O(V)`.

### Pattern to Remember
```text
Clue: undirected / directed graph, every edge weight = 1, single source
Pattern: BFS into dist[], first visit is the answer; leftover INF → -1
Mental model: FIFO layers ARE distance layers when w = 1
```

**Similar problems:** 32 Shortest Path in a Binary Maze (unit BFS on a grid); 30 Dijkstra (same relaxation, non-unit weights).

**Interview tip:** If the interviewer says "unweighted" or "all edges are 1", writing Dijkstra is a signal you missed the cheaper algorithm — BFS is `O(V+E)`, not `O(E log V)`.

---

## 29. Shortest Path in a DAG

takeUforward G-27.

### Problem Understanding
A **directed acyclic graph** with weighted edges. Find shortest distances from a given `src` to every vertex. Unreachable stays `INF` (report `-1`). Weights may be negative: a DAG has no cycle, so it has no negative cycle.

**Input / Output / Constraints**
- Input: `n`, directed weighted `edges[][3] = {u, v, w}`, `src`
- Output: `int[] dist`; unreachable = `-1`
- Graph is a DAG (promised). `w` may be negative.

**Observations**
- Topological order: every edge `u → v` has `u` before `v`. If you relax in that order, by the time you process `u`, `dist[u]` is already finished.
- Each edge is relaxed **exactly once**. No heap. `O(V+E)`.
- Dijkstra also works when all `w ≥ 0`, but pays a log factor and **rejects negatives**. Topo+relax accepts negatives.
- Unreachable vertices never leave `INF` because no path from `src` ever relaxes them. Vertices before `src` in some topo orders are skipped by the `dist[u] == INF` guard.

**Example**
```text
n = 6, src = 0
edges: 0→1 (2), 0→4 (1), 1→2 (3), 4→2 (2), 2→3 (6), 4→5 (4), 5→3 (1)

      2        3         6
  0 ----→ 1 ----→ 2 ----→ 3
  |               ↑       ↑
  |1            2 |     1 |
  └----→ 4 -------┘       |
         |                |
         |4               |
         └----→ 5 ---------┘

Output: [0, 2, 3, 6, 1, 5]
  0→1           = 2
  0→4           = 1
  0→4→2         = 3   (beats 0→1→2 = 5)
  0→4→5→3       = 6   (beats 0→4→2→3 = 9)
```

**Example (edge, negatives).** Same DAG plus `4 → 1` with weight `-1`. Then `dist[1] = min(2, 1 + (-1)) = 0`, and `dist[2]` becomes `0+3 = 3` via `1`, tied with `4→2`. A DAG can carry negatives; a cyclic graph with the same negative edge might not.

### How to Think About the Problem
- What should I notice first? Directed **and** acyclic. That is a rare extra promise. Use it.
- Which representation? Weighted adj: `List<List<int[]>>` storing `{v, w}`.
- Counting / searching / ordering / minimizing → which mental model? Ordering. You already know a linear extension of the partial order.
- Which traversal is natural? Kahn or DFS-finish to produce topo, then a single relax pass. Not a PQ.
- **Clue → Pattern:** *weighted DAG + single source → topo order, then relax each edge once.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: enumerate every src-to-v path               exponential
        ↓
Observation: a topo order processes every
             predecessor of v before v, so one
             relax pass computes all shortest paths
        ↓
Optimal: Kahn/DFS topo + relax along that order          O(V+E)
```

### Brute Force Approach
- Basic idea: DFS every directed path from `src`. Keep the min cost per vertex. On a DAG there are no cycles; the cost is the exponential number of paths, not looping.
- Why it works: the shortest path is one of the directed paths. You take the min.

```java
import java.util.*;

class ShortestPathDAGBrute {
    public int[] shortestPath(int n, int[][] edges, int src) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(new int[]{e[1], e[2]});

        int[] best = new int[n];
        Arrays.fill(best, Integer.MAX_VALUE);
        dfs(src, 0, adj, best);
        for (int i = 0; i < n; i++) {
            if (best[i] == Integer.MAX_VALUE) best[i] = -1;
        }
        return best;
    }

    private void dfs(int u, int d, List<List<int[]>> adj, int[] best) {
        if (d >= best[u]) return;
        best[u] = d;
        for (int[] e : adj.get(u)) dfs(e[0], d + e[1], adj, best);
    }
}
```

**Time Complexity Calculation:** Number of directed paths can be exponential in `V` (a layered DAG with width `k` has `k^{layers}` paths).
**Space Complexity Calculation:** Recursion depth `O(V)`, `adj` `O(V+E)`.

- **Why can this be improved?** You re-walk prefixes. Topo order guarantees that when `u` is processed, every incoming path to `u` has already contributed, so `dist[u]` is final and you emit each outgoing edge once.

Dijkstra as a "better" middle ground is `O((V+E) log V)` and **silently wrong** if a negative weight exists. That is not an upgrade on a DAG; topo+relax dominates it on both speed and correctness.

### Optimal Approach
The structure being exploited is a **weighted DAG** (directed, no cycles). A topological order is a linear scan in which every predecessor is already solved.

**Core Observation**
Let `τ` be a topo order. For an edge `u → v`, `u` appears before `v` in `τ`. After all vertices before `v` have relaxed their outgoing edges, `dist[v]` holds a shortest path: every in-edge has been tried, and each predecessor's distance was already optimal.

**Pattern Identification**
(1) Kahn (indegree queue) or DFS-finish to get a topo order. (2) `dist = INF`, `dist[src] = 0`. (3) For `u` in topo order, if `dist[u]` is finite, relax every `u → v`.

**Step-by-Step Intuition**
1. Build directed weighted `adj` and an indegree array.
2. Kahn: enqueue indegree-0 vertices, pop and decrement neighbors, append to `topo`. *Invariant: `topo` is a valid topological order of the DAG.*
3. Seed `dist[src] = 0`.
4. Scan `topo`. Skip `u` while `dist[u]` is `INF` — `u` is not reachable from `src` (it may sit earlier in the DAG).
5. Relax `dist[v] = min(dist[v], dist[u] + w)` for each outgoing edge. Each edge fires once.
6. Convert leftover `INF` to `-1`.

**Dry Run** — example, `src = 0`.

Indegrees: `[0, 1, 2, 2, 1, 1]`. Kahn queue starts with `0`. One valid topo: `0, 1, 4, 2, 5, 3`.

| Step | State (u from topo / dist) | Action |
|------|----------------------------|--------|
| init | `[0, ∞, ∞, ∞, ∞, ∞]` | seed src |
| 1 | u=0 → `[0, 2, ∞, ∞, 1, ∞]` | `0→1 (2)`, `0→4 (1)` |
| 2 | u=1 → `[0, 2, 5, ∞, 1, ∞]` | `1→2 (3)` → 5 |
| 3 | u=4 → `[0, 2, 3, ∞, 1, 5]` | `4→2 (2)` beats 5 with 3; `4→5 (4)` |
| 4 | u=2 → `[0, 2, 3, 9, 1, 5]` | `2→3 (6)` → 9 |
| 5 | u=5 → `[0, 2, 3, 6, 1, 5]` | `5→3 (1)` beats 9 with 6 |
| 6 | u=3 → `[0, 2, 3, 6, 1, 5]` | no outgoing |
| end | `[0, 2, 3, 6, 1, 5]` | all reachable |

If vertex 3 had no in-path from 0 it would stay `∞ → -1`.

**Why Does It Work?**
Shortest paths are inductive on a topo order. Base: `dist[src] = 0` is correct. For `v`, every predecessor `u` of `v` appears earlier, so `dist[u]` is already a shortest path from `src` (or `INF`). The relaxation `dist[u] + w(u,v)` therefore tries every one-edge extension of an optimal prefix. No path to `v` is missed, and no later pass is required because nothing after `v` in topo can reach `v`. Negative weights do not break the induction: we never assumed `w ≥ 0`, only that there is no way back.

**Java Code**

```java
import java.util.*;

class ShortestPathDAG {
    public int[] shortestPath(int n, int[][] edges, int src) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            indeg[e[1]]++;
        }

        int[] topo = new int[n];
        int t = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
        while (!q.isEmpty()) {
            int u = q.poll();
            topo[t++] = u;
            for (int[] e : adj.get(u)) {
                if (--indeg[e[0]] == 0) q.add(e[0]);
            }
        }
        // t == n is promised on a DAG; if t < n a cycle exists

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        for (int i = 0; i < t; i++) {
            int u = topo[i];
            if (dist[u] == Integer.MAX_VALUE) continue; // unreachable from src
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
            }
        }

        for (int i = 0; i < n; i++) {
            if (dist[i] == Integer.MAX_VALUE) dist[i] = -1;
        }
        return dist;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Kahn is `O(V+E)`. The relax pass walks every edge once. Total `O(V+E)`, independent of the weight signs. Dijkstra on the same DAG would be `O((V+E) log V)` and would refuse negatives.

**Space Complexity Calculation:**
`adj` `O(V+E)`, indegree + topo + dist + queue `O(V)`.

### Pattern to Remember
```text
Clue: directed, acyclic, weighted (even negative), single source
Pattern: topo order, then one relaxation pass; each edge fires once
Mental model: predecessors are solved before you — no heap needed
```

**Similar problems:** 30 Dijkstra (use when the graph is *not* a DAG); 37 Bellman-Ford (use when negatives *and* cycles are possible).

**Interview tip:** If they confirm "it's a DAG", do not write Dijkstra. `O(V+E)` plus "negatives are fine" is the point of the question.

---

## 30. Dijkstra's Algorithm (Priority Queue)

takeUforward G-32.

### Problem Understanding
Weighted graph, **non-negative** edge weights, single source. Return shortest distances from `src` to every vertex. Unreachable → `-1`. The graph may be directed or undirected; the algorithm does not care once `adj` is built. Negative weights are **out of spec** — Dijkstra's greedy freeze is then wrong.

**Input / Output / Constraints**
- Input: `n`, weighted `edges[][3] = {u, v, w}` with `w ≥ 0`, `src`, directed vs undirected
- Output: `int[] dist`
- No negative weights. Graph may be disconnected.

**Observations**
- Relaxation is still `dist[v] > dist[u] + w`. The structure is *which `u` you relax from next*: always the unsettled vertex with smallest `dist`.
- Finalized-distance invariant: *the first time a node is popped with a `d` equal to `dist[u]`, that `d` is optimal.*
- Duplicates in the PQ are OK. Skip a pop when `d > dist[u]` (stale).
- Marking visited **on push** is wrong. Mark on pop (or skip stale, which is the same idea).
- Java's `PriorityQueue` has no decrease-key. Push a new pair; leave the old one to be skipped later.

**Example**
```text
n = 5, src = 0, undirected
edges = [[0,1,4],[0,2,1],[2,1,2],[1,3,1],[2,3,5],[3,4,3]]

        4         1         3
    0 ----- 1 ----- 3 ----- 4
    |       |
   1|      2|
    |       |
    2 ------+
        5
    (2 also connects to 3 with weight 5)

Output: [0, 3, 1, 4, 7]
  0→2           = 1
  0→2→1         = 3   (beats 0→1 = 4)
  0→2→1→3       = 4   (beats 0→2→3 = 6)
  0→2→1→3→4     = 7
```

**Example (edge, negative — Dijkstra is wrong).**
```text
Two-node trap for visited-on-push:
  0 --(10)--> 1
  0 --(-5)--> 1     (parallel edges; adj order puts +10 first)

If you push (10,1) and mark 1 visited, you never look at -5.
Correct Dijkstra (mark on pop) still survives this 2-node graph
because the heap pops -5 first.

Minimal graph where EVEN correct Dijkstra freezes too early
(negative in-edge into an already-popped node):

      4
  0 ----→ 1
  |       ↑
  |5      | -3
  └----→ 2

True shortest 0→1 is 0→2→1 = 2.
Dijkstra pops 1 at dist 4 and freezes it; the improving -3 arrives too late.
```

### How to Think About the Problem
- What should I notice first? Weights are non-negative and **not** all 1. BFS's FIFO order is no longer distance order: a 1-hop of weight 100 loses to a 2-hop of `1+1`, and a 1-hop of 1 beats a 2-hop of `1+5`. You need to pop **min `dist`**, not min hops.
- Which representation? Weighted adj list. PQ of `{dist, node}`.
- Counting / searching / ordering / minimizing → which mental model? Greedy freeze. Non-negative weights make "smallest tentative distance" a true shortest distance.
- Which traversal is natural? Like BFS, but the queue is a min-heap.
- **Clue → Pattern:** *non-negative weights + single source → Dijkstra, mark on pop, skip stale PQ entries.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: all simple paths, or Bellman-Ford O(VE)
        ↓
Observation: with w ≥ 0, the unsettled vertex of
             smallest dist is already optimal — freeze it
        ↓
Better: array-scan Dijkstra O(V^2 + E)   (dense graphs)
        ↓
Optimal: binary-heap Dijkstra O((V+E) log V) with lazy duplicates
```

### Brute Force Approach
- Basic idea: array-scan Dijkstra (the original 1959 form): `V` times, scan all unfinalized vertices for the one with min `dist`, freeze it, relax its edges. No heap.
- Why it works: same greedy invariant as the heap version. The scan finds the same `u` the heap would pop.

```java
import java.util.*;

class DijkstraScan {
    public int[] dijkstra(int n, int[][] edges, int src, boolean undirected) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            if (undirected) adj.get(e[1]).add(new int[]{e[0], e[2]});
        }
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        boolean[] done = new boolean[n];

        for (int it = 0; it < n; it++) {
            int u = -1;
            for (int i = 0; i < n; i++) {
                if (!done[i] && (u == -1 || dist[i] < dist[u])) u = i;
            }
            if (u == -1 || dist[u] == Integer.MAX_VALUE) break;
            done[u] = true;
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (!done[v] && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
            }
        }
        for (int i = 0; i < n; i++) {
            if (dist[i] == Integer.MAX_VALUE) dist[i] = -1;
        }
        return dist;
    }
}
```

**Time Complexity Calculation:** `V` scans of `V` vertices plus `O(E)` relaxations: `O(V^2 + E)`.
**Space Complexity Calculation:** `O(V+E)` for adj, `O(V)` for dist/done.

- **Why can this be improved?** Sparse graphs have `E ≪ V^2`. You should not scan all `V` vertices to find the min. A heap returns it in `O(log V)` (lazy: `O(log E)`).

A *different* naive idea — BFS with a plain queue, enqueue on every improvement — is SPFA. It is correct for non-negative weights but can re-process a vertex many times. A still worse naive idea — BFS that marks on first visit — is **incorrect** as soon as weights differ; the first FIFO visit is not the lightest path.

### Optimal Approach
The structure being exploited is a **weighted graph with `w ≥ 0`**, directed or undirected. The heap always yields an unfinalized vertex of minimum tentative distance.

**Core Observation**
Suppose `u` is the unfinalized vertex with smallest `dist[u]`, and all weights are `≥ 0`. Any other path to `u` must leave the finalized set through some unfinalized `x` and then reach `u`. That path's cost is at least `dist[x] + (non-negative remainder) ≥ dist[x] ≥ dist[u]`. So `dist[u]` cannot improve. Freeze it.

**Pattern Identification**
Min-heap of `{d, u}`. Skip stale pops (`d > dist[u]`). Relax neighbors; on improvement, **push another pair** (do not search-and-decrease). Do not set `vis` on push.

**Step-by-Step Intuition**
1. `dist = INF`, `dist[src] = 0`, push `{0, src}`.
2. Pop `{d, u}`. If `d > dist[u]`, this pair is a leftover worse copy — skip.
3. *Invariant: the first non-stale pop of `u` freezes `dist[u]` forever. Every later path is at least as long, because leftover weights are non-negative.*
4. For each edge `u → v` of weight `w`, if `dist[u] + w < dist[v]`, write `dist[v]` and push `{dist[v], v}`. The old `{oldDist, v}` stays in the heap as a stale entry.
5. Drain the heap. Leftover `INF` → `-1`.

**Decrease-key vs duplicates.** A textbook Fibonacci heap decrease-keys `v` in amortized `O(1)`. Java `PriorityQueue` cannot decrease-key. Pushing a duplicate is the standard engineering substitute: at most one live (best) pair per vertex, plus stale ones. You pay `O(log E)` per push, and `E` pushes in the worst case, so `O(E log E)`. Skipping stale pops restores the invariant.

**Visited-on-push is wrong.** Push order follows the adjacency list, not distance order. In the example, from `0` you might push `1` at cost `4` *before* you push `2` at cost `1`. If `1` is marked visited at that push, you never apply `0 → 2 → 1 = 3`. Mark on pop (after the heap has selected the real min).

**Dry Run** — example, `src = 0`. PQ shown as min-first.

| Step | State (PQ `(d,u)` / dist) | Action |
|------|---------------------------|--------|
| init | `(0,0)` / `[0, ∞, ∞, ∞, ∞]` | seed |
| 1 | `(1,2),(4,1)` / `[0, 4, 1, ∞, ∞]` | pop `(0,0)`; relax 1←4, 2←1 |
| 2 | `(3,1),(4,1),(6,3)` / `[0, 3, 1, 6, ∞]` | pop `(1,2)`; 2→1 improves 4→3; 2→3 = 6 |
| 3 | `(4,1),(4,3),(6,3)` / `[0, 3, 1, 4, ∞]` | pop `(3,1)`; 1→3 improves 6→4 |
| 4 | `(4,3),(6,3)` / unchanged | pop `(4,1)` stale: `4 > dist[1]=3`, skip |
| 5 | `(6,3),(7,4)` / `[0, 3, 1, 4, 7]` | pop `(4,3)`; 3→4 = 7 |
| 6 | `(7,4)` / unchanged | pop `(6,3)` stale: `6 > dist[3]=4`, skip |
| 7 | empty / `[0, 3, 1, 4, 7]` | pop `(7,4)`; 4 has no improving edge |

**Why Does It Work?**
Non-negative weights make the greedy choice safe: a cheaper path to a frozen `u` would have to come through some other unfrozen vertex whose tentative distance is already `≥ dist[u]`, and adding a non-negative tail cannot undercut `dist[u]`. Stale heap pairs are ghosts of old tentatives; the `d > dist[u]` check throws them away. Negative weights break the proof — a negative tail *can* undercut a frozen distance, as in the 0-1-2 counterexample.

**Java Code**

```java
import java.util.*;

class DijkstraPQ {
    public int[] dijkstra(int n, int[][] edges, int src, boolean undirected) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            if (undirected) adj.get(e[1]).add(new int[]{e[0], e[2]});
        }

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                (a, b) -> Integer.compare(a[0], b[0])); // compare, don't subtract
        pq.add(new int[]{0, src});

        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue; // stale duplicate
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.add(new int[]{dist[v], v});
                }
            }
        }

        for (int i = 0; i < n; i++) {
            if (dist[i] == Integer.MAX_VALUE) dist[i] = -1;
        }
        return dist;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each of `E` edges can cause one push. Each push/pop is `O(log H)` with heap size `H ≤ E`. Total `O((V + E) log E)`, commonly written `O(E log V)` when `E` is polynomial in `V`. Array-scan is `O(V^2)` and wins on dense graphs (`E ~ V^2`).

**Space Complexity Calculation:**
`adj` `O(V+E)`, heap `O(E)` in the lazy-duplicate version, `dist` `O(V)`.

### Pattern to Remember
```text
Clue: single source, non-negative weights, not all 1
Pattern: min-heap of {dist, node}; first non-stale pop is final; skip d > dist[u]
Mental model: BFS where the queue is sorted by distance, not by insertion time
```

**Similar problems:** 31 Dijkstra TreeSet (erase stale instead of skipping); 33 Path with Minimum Effort (Dijkstra on a max-metric); 34 Cheapest Flights (Dijkstra only if stops is part of the state); 35 Network Delay Time.

**Interview tip:** If they ask "why not a visited array on push?", give the `0→1` (weight 4) vs `0→2→1` (weight 1+2) example and say "I mark on pop." If they ask "does it work with negatives?", give the three-node −3 counterexample, not a shrug.

---

## 31. Dijkstra's Algorithm (Set version) — why a PQ/set is the right structure

takeUforward G-33.

### Problem Understanding
Same problem as 30: non-negative weighted single-source shortest paths. The data structure changes. A balanced tree (`TreeSet` in Java, `std::set` in C++) stores `{dist, node}` and **erases** the stale pair when a better distance is found, instead of leaving ghosts in a heap.

**Input / Output / Constraints**
- Identical to problem 30.
- Extra demand: explain *why* a priority queue / set, and why a plain FIFO queue is the wrong structure for Dijkstra.

**Observations**
- Dijkstra's only requirement of the container: "give me the unfinalized vertex of smallest `dist`, and let me update `dist[v]`".
- A binary heap does extract-min fast but not delete-arbitrary fast → lazy duplicates.
- A `TreeSet` does both in `O(log V)` → at most one pair per vertex.
- A plain `ArrayDeque` does neither extract-min nor ordered delete. Using it is a different algorithm (BFS or SPFA), not Dijkstra.
- 0-1 BFS (deque) is the special case of weights in `{0, 1}`: push 0-edges to the front, 1-edges to the back. Also not Dijkstra.

**Example** — same graph as 30: `dist = [0, 3, 1, 4, 7]`. The dry run below highlights the erase.

**Example (edge).** Two vertices, three improving relaxations of the same `v`: TreeSet size stays 1 for that `v`; a PQ would hold all three pairs until they pop.

### How to Think About the Problem
- What should I notice first? The *algorithm* (greedy freeze) is unchanged. The *container* is the interview question.
- Which representation? Weighted adj + an ordered set of live `{dist, node}` pairs, uniquely keyed by node.
- Counting / searching / ordering / minimizing → which mental model? Ordered-set Dijkstra vs lazy-heap Dijkstra vs FIFO. Match the structure to the weight set.
- Which traversal is natural? Still "always expand min dist". The set's first element *is* that vertex.
- **Clue → Pattern:** *need extract-min AND decrease-key → TreeSet; need extract-min only → PQ with duplicates; weights all 1 → queue; weights 0/1 → deque.*

### Intuition (Brute → Better → Optimal)
```text
Naive: FIFO queue, mark on first visit          WRONG when weights vary
        ↓
Observation: first FIFO visit ≠ lightest path
        ↓
SPFA: FIFO, re-queue on every improvement       correct, can be slow
        ↓
PQ Dijkstra: extract-min, lazy duplicates       O(E log E)
        ↓
TreeSet Dijkstra: extract-min + erase stale     O(E log V)
```

### Brute Force Approach
**(Naïve Approach)** — use a plain queue, BFS-style.

- Basic idea: same relaxation as Dijkstra, but pop FIFO. Two variants: (A) enqueue only on first visit; (B) re-enqueue on every improvement (SPFA).
- Why (A) fails: first FIFO visit can be a heavy direct edge while a cheap detour sits later in the queue. On the problem-30 graph, if `0` pushes `1` (weight 4) before `2` (weight 1) and you freeze `1` on that first visit, you report `dist[1] = 4` instead of `3`.
- Why (B) works but is not Dijkstra: re-queueing on improvement is Bellman-Ford with a queue (SPFA). Correct on non-negative graphs, worst-case exponential on some graphs with negative weights, and even without negatives it can relax the same vertex `Θ(V)` times. You lost the "pop = freeze" invariant.

```java
import java.util.*;

class DijkstraQueueWrong {
    // WRONG: FIFO + freeze on first visit. Do not ship this.
    public int[] bfsAsDijkstra(int n, int[][] edges, int src, boolean undirected) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            if (undirected) adj.get(e[1]).add(new int[]{e[0], e[2]});
        }
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(src);
        vis[src] = true;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (!vis[v] && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    vis[v] = true;       // freeze too early
                    q.add(v);
                }
            }
        }
        return dist; // dist[1] may be 4, not 3, on the sample
    }
}
```

**Time Complexity Calculation:** (A) `O(V+E)` and wrong. (B) `O(kE)` with `k` up to exponential in adversarial graphs.
**Space Complexity Calculation:** `O(V+E)`.

- **Why can this be improved?** You need extract-min, not extract-front. That is the entire difference between BFS and Dijkstra.

### Optimal Approach
The structure being exploited is a **non-negative weighted graph**. The container is a balanced BST of live tentative pairs so decrease-key is `remove` + `add`.

**Core Observation**
At any moment the set stores at most one pair per vertex — its current `dist`. `set.first()` is therefore the unfinalized vertex of smallest distance, the same `u` Dijkstra wants. When `v` improves, delete `{old, v}` and insert `{new, v}`. No stale pops.

**Pattern Identification**
`TreeSet<int[]>` ordered by `(dist, node)`. Node id is the tie-breaker so two vertices at the same distance are distinct, and so `remove(new int[]{old, v})` finds the pair (TreeSet uses the comparator as equality).

**Step-by-Step Intuition**
1. Seed `dist[src] = 0`, `set.add({0, src})`.
2. Poll the smallest pair `{d, u}`. *Invariant: `d == dist[u]` and `d` is optimal. The set never holds a stale pair for `u`.*
3. Relax outgoing edges. On improvement: `set.remove({dist[v], v})` (no-op if `v` was not in the set), write `dist[v]`, `set.add({dist[v], v})`.
4. Convert leftover `INF` to `-1`.

**When TreeSet wins.** A vertex that is improved many times: PQ stores every old pair (`O(E)` heap size, `O(E log E)`). TreeSet erases the old pair (`O(V)` set size, `O(E log V)`). Dense update patterns, or when you must also *know* the current best pair, favor the set. In Java interviews the PQ version is what you write by default — `TreeSet` of `int[]` has comparator-tax and worse constants — but you must be able to implement both.

**Comparator trap.** If you compare only `dist`, two different nodes with equal `dist` collapse to one set entry and one of them disappears. Always tie-break on node id. `TreeSet.remove` uses the comparator, not `Arrays.equals`, so `remove(new int[]{oldDist, v})` works.

**Dry Run** — same graph as 30. Set shown sorted.

| Step | State (TreeSet / dist) | Action |
|------|------------------------|--------|
| init | `{(0,0)}` / `[0, ∞, ∞, ∞, ∞]` | seed |
| 1 | `{(1,2),(4,1)}` / `[0, 4, 1, ∞, ∞]` | pop `(0,0)`; insert both |
| 2 | `{(3,1),(6,3)}` / `[0, 3, 1, 6, ∞]` | pop `(1,2)`; **erase (4,1)**, insert (3,1) and (6,3) |
| 3 | `{(4,3)}` / `[0, 3, 1, 4, ∞]` | pop `(3,1)`; **erase (6,3)**, insert (4,3) |
| 4 | `{(7,4)}` / `[0, 3, 1, 4, 7]` | pop `(4,3)`; insert (7,4) |
| 5 | empty / `[0, 3, 1, 4, 7]` | pop `(7,4)`; done |

Compare step 2 with the PQ dry run: the PQ still held `(4,1)` as a ghost. The set does not.

**Structure table**

| | BFS queue | Dijkstra PQ | Dijkstra TreeSet | 0-1 deque |
|--|-----------|-------------|------------------|-----------|
| Weights | all `1` | `≥ 0` | `≥ 0` | `{0, 1}` |
| Pop | FIFO | min `dist` (lazy) | min `dist` (exact) | 0-edge front, 1-edge back |
| Stale entries | none | leftover worse pairs | erased | none |
| Time | `O(V+E)` | `O(E log E)` | `O(E log V)` | `O(V+E)` |
| Freeze | first visit | first non-stale pop | first pop | first visit per 0/1 rule |

**Why Does It Work?**
Same proof as problem 30. The set is a correct extract-min with decrease-key, so the greedy freeze still applies. Erasing is an implementation detail that does not change which vertex is frozen next — it only changes heap size.

**Java Code** — both containers, same driver.

```java
import java.util.*;

class DijkstraSet {
    public int[] dijkstraTreeSet(int n, int[][] edges, int src, boolean undirected) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            if (undirected) adj.get(e[1]).add(new int[]{e[0], e[2]});
        }

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        TreeSet<int[]> set = new TreeSet<>((a, b) -> {
            if (a[0] != b[0]) return Integer.compare(a[0], b[0]);
            return Integer.compare(a[1], b[1]); // node id tie-break
        });
        set.add(new int[]{0, src});

        while (!set.isEmpty()) {
            int[] cur = set.pollFirst();
            int u = cur[1];
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                    set.remove(new int[]{dist[v], v}); // erase stale pair, if any
                    dist[v] = dist[u] + w;
                    set.add(new int[]{dist[v], v});
                }
            }
        }

        for (int i = 0; i < n; i++) {
            if (dist[i] == Integer.MAX_VALUE) dist[i] = -1;
        }
        return dist;
    }

    public int[] dijkstraPQ(int n, int[][] edges, int src, boolean undirected) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            if (undirected) adj.get(e[1]).add(new int[]{e[0], e[2]});
        }
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue;
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.add(new int[]{dist[v], v});
                }
            }
        }
        for (int i = 0; i < n; i++) if (dist[i] == Integer.MAX_VALUE) dist[i] = -1;
        return dist;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each relaxation does at most one `remove` and one `add`, each `O(log V)` because the set holds `≤ V` pairs. `O(E log V)` plus `O(V log V)` for the pops. PQ version is `O(E log E)` as in problem 30.

**Space Complexity Calculation:**
TreeSet `O(V)`, adj `O(V+E)`. PQ version `O(E)` heap.

### Pattern to Remember
```text
Clue: "implement Dijkstra" + they mention a set / decrease-key / "why not a queue"
Pattern: TreeSet of {dist,node} with (dist, id) comparator; erase before insert
Mental model: queue → unit; deque → 0-1; heap → non-neg lazy; set → non-neg with decrease-key
```

**Similar problems:** 30 Dijkstra PQ; 32 (queue, because unit); a later 0-1 BFS problem if present in the 53.

**Interview tip:** Draw the four-structure table. The sentence they want: "a queue does not extract the minimum distance, so the freeze-on-pop invariant dies."

---

## 32. Shortest Path in a Binary Maze

LeetCode 1091 Medium. takeUforward G-36.

### Problem Understanding
An `n × n` binary grid. `0` is empty, `1` is blocked. Move **8-directionally** (edge or corner). Start at `(0,0)`, end at `(n-1, n-1)`. Return the length of a shortest **clear** path, or `-1`. Length = **number of cells**, including the start cell.

**Input / Output / Constraints**
- Input: `int[][] grid`, `n = grid.length`, `1 ≤ n ≤ 100`, cells in `{0,1}`
- Output: path length (cell count), or `-1`
- 8-connected. Path cells must all be `0`.

**Observations**
- Every legal step has cost `1`. This is problem 28 on a grid. Dijkstra is overkill.
- "Is it the same as ordinary BFS?" **Yes** — 8-direction unit BFS.
- LC length includes the start cell: a 1-cell grid `[[0]]` returns `1`, not `0`.
- Start blocked (`grid[0][0] == 1`) or end blocked → `-1` (end-blocked is discovered when BFS never arrives).
- `n = 1`: only the start=end cell. Return `1` if `0`, else `-1`.

**Example**
```text
grid = [[0,0,0],
        [1,1,0],
        [1,1,0]]
Output: 4
Path: (0,0) → (0,1) → (1,2) → (2,2)    (4 cells)
```

**Example (edge).** `[[0,1],[1,0]]` → `2` (one diagonal step). `[[1,0],[0,0]]` → `-1` (start blocked). `[[0]]` → `1`. `[[1]]` → `-1`.

### How to Think About the Problem
- What should I notice first? Grid + 8-dir + uniform step cost. Not a weighted graph.
- Which representation? Implicit graph: cell `(r,c)` has up to 8 neighbors. `N = n*n` vertices, `E ≈ 8N`.
- Counting / searching / ordering / minimizing → which mental model? Min hops on an unweighted graph = BFS.
- Which traversal is natural? `ArrayDeque` of cells, `dist[][]` (or a steps counter with a `vis` mark on enqueue).
- **Clue → Pattern:** *grid, 8-dir, 0/1 cells, shortest clear path → unit BFS, length = cells.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS every 8-dir simple path                exponential
        ↓
Observation: every step costs 1, so BFS first
             arrival at (n-1,n-1) is shortest
        ↓
Optimal: 8-dir BFS, dist[0][0]=1 (start counts)         O(n^2)
```

### Brute Force Approach
- Basic idea: backtracking DFS. Track `onPath` so you do not reuse a cell. Keep a global min length when you hit the target.
- Why it works: the shortest clear path is a simple path (repeating a cell cannot help with unit positive cost). You enumerate them.

```java
import java.util.*;

class ShortestPathBinaryMatrixBrute {
    static final int[][] DIRS8 = {
            {-1, -1}, {-1, 0}, {-1, 1},
            { 0, -1},          { 0, 1},
            { 1, -1}, { 1, 0}, { 1, 1}
    };
    int best;

    public int shortestPathBinaryMatrix(int[][] grid) {
        int n = grid.length;
        if (grid[0][0] == 1 || grid[n - 1][n - 1] == 1) return -1;
        best = Integer.MAX_VALUE;
        boolean[][] onPath = new boolean[n][n];
        dfs(0, 0, 1, grid, onPath);
        return best == Integer.MAX_VALUE ? -1 : best;
    }

    private void dfs(int r, int c, int len, int[][] grid, boolean[][] onPath) {
        int n = grid.length;
        if (len >= best) return;
        if (r == n - 1 && c == n - 1) {
            best = len;
            return;
        }
        onPath[r][c] = true;
        for (int[] d : DIRS8) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
            if (in && grid[nr][nc] == 0 && !onPath[nr][nc]) {
                dfs(nr, nc, len + 1, grid, onPath);
            }
        }
        onPath[r][c] = false;
    }
}
```

**Time Complexity Calculation:** Up to `O(8^{n^2})` walks on an open grid. Unusable for `n = 100`.
**Space Complexity Calculation:** Recursion + `onPath` = `O(n^2)`.

- **Why can this be improved?** DFS order is not hop order. The same cell is reached via many paths. BFS guarantees the first time you enqueue `(r,c)` you have the min cell-count, so you mark it forever.

### Optimal Approach
The structure being exploited is an **unweighted 8-direction grid**. BFS on cells is Dijkstra with `w = 1`, without a heap.

**Core Observation**
Moving to any of 8 neighbors costs one cell. First time BFS dequeues (or enqueues, with a vis-on-enqueue) the target, the stored length is the minimum cell count.

**Pattern Identification**
Check start blocked. Seed queue with `(0,0)` and `dist = 1`. 8-dir deltas. Skip out-of-bounds, blocked, already-seen. Return `dist` when `(n-1,n-1)` is popped (or immediately if `n = 1`).

**Step-by-Step Intuition**
1. If `grid[0][0] == 1`, return `-1`. The start cell is not clear.
2. `dist[0][0] = 1` — the start cell counts. *Invariant: `dist[r][c]` is the min number of cells on a clear path from `(0,0)` to `(r,c)`, and a cell is enqueued at most once.*
3. BFS. For each of 8 neighbors, if in bounds, `grid == 0`, and unseen, set `dist = dist[r][c] + 1` and enqueue.
4. If the target is dequeued, return its dist. If the queue dies first, return `-1`.

**Dry Run** — `[[0,0,0],[1,1,0],[1,1,0]]`.

| Step | State (queue / pop) | Action |
|------|---------------------|--------|
| init | q=`(0,0,1)` | start counts as 1 |
| 1 | pop `(0,0,1)`; q=`(0,1,2)` | `(1,0)` and `(1,1)` blocked |
| 2 | pop `(0,1,2)`; q=`(0,2,3),(1,2,3)` | diagonal into `(1,2)` |
| 3 | pop `(0,2,3)`; q=`(1,2,3)` | `(1,2)` already seen |
| 4 | pop `(1,2,3)`; q=`(2,2,4)` | down to target |
| 5 | pop `(2,2,4)` | return **4** |

A DFS that wandered `(0,0)→(0,1)→(0,2)→(1,2)→(2,2)` would report 5 if it froze on first arrival without hop order; BFS never considers that as first arrival.

**Why Does It Work?**
Identical to problem 28: unit weights, FIFO = increasing distance. 8-direction only changes the neighbor list. Counting cells rather than edges is an off-by-one of `+1` at the source (`dist[src] = 1` instead of `0`); the differences along the path are still `1` per step.

**Java Code**

```java
import java.util.*;

class ShortestPathBinaryMatrix {
    public int shortestPathBinaryMatrix(int[][] grid) {
        int n = grid.length;
        if (grid[0][0] == 1) return -1;

        int[][] dirs = {
                {-1, -1}, {-1, 0}, {-1, 1},
                { 0, -1},          { 0, 1},
                { 1, -1}, { 1, 0}, { 1, 1}
        };

        int[][] dist = new int[n][n];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        dist[0][0] = 1; // start cell is part of the length

        ArrayDeque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0});

        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];
            if (r == n - 1 && c == n - 1) return dist[r][c];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
                if (!in || grid[nr][nc] == 1) continue;
                if (dist[nr][nc] > dist[r][c] + 1) {
                    dist[nr][nc] = dist[r][c] + 1;
                    q.add(new int[]{nr, nc});
                }
            }
        }
        return -1;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
`N = n*n` vertices, each enqueued once. Each has `≤ 8` edges, so `E ≤ 8N`. `O(N + E) = O(n^2)`.

**Space Complexity Calculation:**
`dist` and the queue are `O(n^2)`.

### Pattern to Remember
```text
Clue: grid, 0-empty / 1-blocked, 4- or 8-dir, shortest path, uniform step
Pattern: unit BFS; dist[start]=1 when the judge counts cells; blocked start/end → -1
Mental model: problem 28, vertices = cells, edges = legal moves
```

**Similar problems:** 28 (same algorithm off-grid); 33 Path with Minimum Effort (weights are *not* uniform — Dijkstra or BS+BFS).

**Interview tip:** Confirm 4-dir vs 8-dir and whether length counts cells or edges. LC 1091 is 8-dir and counts cells. Pulling Dijkstra for this question is the overkill they are fishing for you to reject.

---

## 33. Path with Minimum Effort

LeetCode 1631 Hard. takeUforward G-37.

### Problem Understanding
A `rows × cols` height map. Move 4-directionally. The **effort** of a path is the **maximum** absolute height difference between consecutive cells. Return the **minimum** effort required to go from `(0,0)` to `(rows-1, cols-1)`.

**Input / Output / Constraints**
- Input: `int[][] heights`, `1 ≤ rows, cols ≤ 100`, `1 ≤ heights[i][j] ≤ 10^6`
- Output: min achievable effort (a non-negative int). A single-cell grid returns `0`.
- 4-direction. You may visit cells freely; the cost is not a sum.

**Observations**
- Path cost is `max` of edge costs, not `sum`. You are not minimizing travel distance.
- The metric is still monotone: extending a path never decreases its effort (`max` is non-decreasing). Dijkstra's freeze still applies if "distance" = effort so far.
- Alternative: binary search the effort threshold `mid` and BFS "can I reach using only edges with `|Δh| ≤ mid`". That is binary search on the answer.
- Effort range: `0 … 10^6`.

**Example**
```text
heights = [[1,2,2],
           [3,8,2],
           [5,3,5]]
Output: 2
Path 1 → 3 → 5 → 3 → 5  has consecutive |Δ| = 2,2,2,2  max = 2
Path 1 → 2 → 2 → 2 → 5  has consecutive |Δ| = 1,0,0,3  max = 3  (worse)
```

**Example (edge).** `heights = [[7]]` → `0`. `[[1,10],[2,3]]`: path `1→2→3` has max `|Δ|` = `max(1,1) = 1`, beating `1→10→3` with `max(9,7) = 9`.

### How to Think About the Problem
- What should I notice first? The objective is min-max, not min-sum. That is still a shortest-path problem after you redefine edge relaxation as `max(effort_so_far, |Δh|)`.
- Which representation? Grid graph, 4-dir, edge weight `|heights[r][c] - heights[nr][nc]|`. `N = rows*cols`, `E ≈ 4N`.
- Counting / searching / ordering / minimizing → which mental model? Either Dijkstra on the max-metric, or "is `mid` feasible?" as a monotone predicate for binary search.
- Which traversal is natural? Min-heap of `{effort, r, c}`. Or BS + BFS.
- **Clue → Pattern:** *minimize the maximum edge on a grid path → Dijkstra with `d' = max(d, edge)`, or BS-on-answer + BFS.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS every path, track running max |Δh|      exponential
        ↓
Observation 1: effort is monotone in the threshold
             → binary search + BFS "can I reach"
        ↓
Observation 2: max(old, edge) is a non-decreasing
             "distance" → Dijkstra freeze still holds
        ↓
Optimal: Dijkstra on effort, pop min-effort cell         O(N log N)
         (BS+BFS is O(N log H), also interview-valid)
```

### Brute Force Approach
- Basic idea: DFS/backtrack all simple paths. At each step the path effort is `max(soFar, |Δh|)`. Record the min effort that reaches the target.
- Why it works: the optimum is achieved on a simple path.

```java
import java.util.*;

class PathWithMinimumEffortBrute {
    static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    int best;

    public int minimumEffortPath(int[][] heights) {
        int n = heights.length, m = heights[0].length;
        best = Integer.MAX_VALUE;
        dfs(0, 0, 0, heights, new boolean[n][m]);
        return best;
    }

    private void dfs(int r, int c, int effort, int[][] h, boolean[][] onPath) {
        int n = h.length, m = h[0].length;
        if (effort >= best) return;
        if (r == n - 1 && c == m - 1) {
            best = effort;
            return;
        }
        onPath[r][c] = true;
        for (int[] d : DIRS) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
            if (!in || onPath[nr][nc]) continue;
            int next = Math.max(effort, Math.abs(h[nr][nc] - h[r][c]));
            dfs(nr, nc, next, h, onPath);
        }
        onPath[r][c] = false;
    }
}
```

**Time Complexity Calculation:** Exponential in `N = n*m`. Dead at the constraint `100×100`.
**Space Complexity Calculation:** Recursion `O(N)`.

- **Why can this be improved?** You do not need every path. Dijkstra expands in increasing effort and freezes a cell the first time it is popped. Binary search asks a weaker yes/no (`can I stay under mid`?) that BFS can answer in linear time.

### Optimal Approach
The structure being exploited is a **4-direction grid whose path cost is the max edge, not the sum**. Dijkstra still applies because that cost is non-decreasing along any path.

**Core Observation**
Define `dist[r][c]` = minimum achievable effort of any path from `(0,0)` to `(r,c)`. Relaxation:

```text
cand = max(dist[r][c], abs(h[nr][nc] - h[r][c]))
if cand < dist[nr][nc]: improve
```

Because `cand ≥ dist[r][c]`, effort never drops as you walk. The first time the heap pops `(effort, r, c)`, no remaining path can arrive with a smaller max-edge: any alternative goes through some unfrozen cell whose effort is already `≥ effort`.

**Pattern Identification**
Min-heap `{effort, r, c}`. Skip stale pops. Early-exit when you pop the target. Secondary pattern: binary search `mid ∈ [0, 10^6]` + BFS on the subgraph of edges with `|Δh| ≤ mid`.

**Step-by-Step Intuition**
1. `dist[][] = INF`, `dist[0][0] = 0`, push `{0, 0, 0}`.
2. Pop min effort. If stale, skip. If `(r,c)` is the target, return — *invariant: pop min-effort to a cell → that effort is finalized.*
3. For each 4-dir neighbor in bounds, `cand = max(effort, |Δh|)`. If `cand` improves `dist[nr][nc]`, push it.
4. Binary-search alternative (same class, second method): `lo = 0, hi = 1_000_000`. `canReach(mid)` is a BFS that refuses any step with `|Δh| > mid`. Feasible → `hi = mid`; else `lo = mid + 1`.

**Dry Run** — `[[1,2,2],[3,8,2],[5,3,5]]`. Heap min-first, effort shown.

| Step | State (pop `(eff,r,c)` / effort grid) | Action |
|------|---------------------------------------|--------|
| init | `[[0,∞,∞],[∞,∞,∞],[∞,∞,∞]]` | seed |
| 1 | `(0,0,0)` → `[[0,1,∞],[2,∞,∞],[∞,∞,∞]]` | right `\|2-1\|=1`; down `\|3-1\|=2` |
| 2 | `(1,0,1)` → `[[0,1,1],[1,6,1],[∞,∞,∞]]` | `(1,0)` improves 2→1; `(1,2)=1`; `(1,1)=6` |
| 3 | `(1,0,2)` | target not yet |
| 4 | `(1,1,0)` → `[[0,1,1],[1,5,1],[2,1,∞]]` | `(2,1)=1`; `(1,1)` 6→5 |
| 5 | `(1,1,2)` → target tentatively 3 | `max(1,\|5-2\|)=3` |
| 6 | `(1,2,1)` → target improves to **2** | `max(1,\|5-3\|)=2` |
| 7 | `(2,2,2)` popped | return 2 (finalized) |

The path realizing 2 is `(0,0) → (1,0) → (2,1) → (2,2)` with diffs `2, 0, 2`.

**Why Does It Work?**
Let `f(path) = max edge on the path`. `f` is a bottleneck metric. Bottleneck shortest paths with non-negative edge labels are solved by Dijkstra after replacing the sum-relax with a max-relax: the key still weakly increases, which is all the freeze proof needs. Binary search works because the predicate `P(mid) = "a path exists with effort ≤ mid"` is monotone: if it holds for `mid`, it holds for every larger threshold.

**Java Code** — Dijkstra primary; BS+BFS included.

```java
import java.util.*;

class PathWithMinimumEffort {
    public int minimumEffortPath(int[][] heights) {
        int n = heights.length, m = heights[0].length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        int[][] dist = new int[n][m];
        for (int[] row : dist) Arrays.fill(row, Integer.MAX_VALUE);
        dist[0][0] = 0;

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                (a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, 0, 0}); // effort, r, c

        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int effort = cur[0], r = cur[1], c = cur[2];
            if (effort > dist[r][c]) continue;          // stale
            if (r == n - 1 && c == m - 1) return effort; // finalized
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (!in) continue;
                int cand = Math.max(effort, Math.abs(heights[nr][nc] - heights[r][c]));
                if (cand < dist[nr][nc]) {
                    dist[nr][nc] = cand;
                    pq.add(new int[]{cand, nr, nc});
                }
            }
        }
        return 0; // single-cell grid already returned 0 from dist[0][0]
    }

    // Binary search on answer + BFS. Same result, O(N log H).
    public int minimumEffortPathBS(int[][] heights) {
        int lo = 0, hi = 1_000_000, ans = 0;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (canReach(heights, mid)) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        return ans;
    }

    private boolean canReach(int[][] h, int mid) {
        int n = h.length, m = h[0].length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{0, 0});
        vis[0][0] = true;
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];
            if (r == n - 1 && c == m - 1) return true;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (!in || vis[nr][nc]) continue;
                if (Math.abs(h[nr][nc] - h[r][c]) > mid) continue;
                vis[nr][nc] = true;
                q.add(new int[]{nr, nc});
            }
        }
        return false;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Dijkstra: `N = n*m` vertices, `E ≈ 4N` possible improvements, heap ops `O(E log N)` = `O(n m log (n m))`. BS+BFS: `log(10^6) ≈ 20` BFS passes, each `O(N+E) = O(n m)`, so `O(n m log H)`.

**Space Complexity Calculation:**
`dist` / `vis` `O(N)`, heap / queue `O(N)`.

### Pattern to Remember
```text
Clue: minimize the MAXIMUM consecutive difference on a grid path
Pattern: Dijkstra with cand = max(effort, |Δh|), freeze on pop; or BS-on-answer + BFS
Mental model: bottleneck shortest path; max is a legal "distance" because it is monotone
```

**Similar problems:** 32 (unit BFS, different metric); 30 (same Dijkstra, sum metric); Swim in Rising Water (LC 778) is the same two-template problem.

**Interview tip:** Name both templates. Write Dijkstra first (one pass). Mention BS-on-answer so they know you saw the monotone predicate.

---

## 34. Cheapest Flights Within K Stops

LeetCode 787 Medium. takeUforward G-38.

### Problem Understanding
`n` cities, directed flights `[from, to, price]`. Return the cheapest price from `src` to `dst` using **at most `k` stops** (i.e. at most `k` intermediate cities, which means **at most `k+1` edges**). No such route → `-1`.

**Input / Output / Constraints**
- Input: `n`, `flights[][3]`, `src`, `dst`, `k`
- Output: min price, or `-1`
- `n ≤ 100`, `k ≤ n`, prices positive. Directed. Parallel flights possible.

**Observations**
- This is **not** unconstrained shortest path. A cheaper route with more than `k` stops is illegal.
- `k` stops = `k` intermediates = `k+1` flights. `k = 0` allows a **direct** flight (`1` edge) and also the `src == dst` zero-edge case (price `0`).
- Bellman-Ford's `i`-th round computes cheapest paths using **at most `i` edges**. So `k+1` rounds is exactly the budget.
- **THE BUG:** relaxing in place, using updates from the *same* round, lets a vertex be used twice in one round and consumes extra edges. You must relax from a **snapshot** of the previous round (or BFS by layers of stops).
- Dijkstra with state `(node, stopsUsed)` also works. Dijkstra on `node` alone does **not**: a costlier arrival with fewer stops can still be the one that reaches `dst` legally.

**Example**
```text
n = 4, src = 0, dst = 3, k = 1
flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]]

  0 --100--> 1 --100--> 2 --200--> 3
              |                    ↑
              +--------600---------+

Output: 700
  0→1→3           1 stop, cost 700     legal
  0→1→2→3         2 stops, cost 400    illegal (k = 1)
```

**Example (edge).** `k = 0`, same graph, `dst = 1` → `100` (direct). `k = 0`, `dst = 3` → `-1` (no direct). `src == dst` → `0` regardless of flights. Unreachable → `-1`.

### How to Think About the Problem
- What should I notice first? An extra dimension: hops / stops. Unconstrained Dijkstra from `src` would return `400` and fail the sample.
- Which representation? Edge list is enough for Bellman-Ford. Adj list for a layered BFS or for Dijkstra-on-state.
- Counting / searching / ordering / minimizing → which mental model? Shortest path with an edge-count cap = Bellman-Ford truncated at `k+1`, or BFS by layers, or Dijkstra on `(node, stops)`.
- Which traversal is natural? `k+1` rounds of "relax every flight from yesterday's `dist`".
- **Clue → Pattern:** *cheapest route with ≤ K edges → K rounds of Bellman-Ford from a snapshot; never relax a node twice in one round.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS every walk with ≤ k+1 edges             exponential
        ↓
Observation: after i relax rounds, dist[v] is the
             cheapest i-edge path (if you snapshot)
        ↓
Optimal: Bellman-Ford, k+1 snapshot rounds               O(k · E)
         or Dijkstra on state (node, stops)
```

### Brute Force Approach
- Basic idea: DFS from `src`. Count **edges used** and cap at `k+1`. Prune when cost already exceeds the best known to `dst`.
- Why it works: every legal walk is explored. You keep the min cost that lands on `dst`.

```java
import java.util.*;

class CheapestFlightsWithinKStopsBrute {
    int best;

    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] f : flights) adj.get(f[0]).add(new int[]{f[1], f[2]});
        best = Integer.MAX_VALUE;
        dfs(src, dst, k + 1, 0, adj); // edgesLeft = k+1
        return best == Integer.MAX_VALUE ? -1 : best;
    }

    private void dfs(int u, int dst, int edgesLeft, int cost, List<List<int[]>> adj) {
        if (cost >= best) return;
        if (u == dst) {
            best = cost;
            return;
        }
        if (edgesLeft == 0) return;
        for (int[] e : adj.get(u)) {
            dfs(e[0], dst, edgesLeft - 1, cost + e[1], adj);
        }
    }
}
```

**Time Complexity Calculation:** Branching up to degree per city, depth `k+1`. Exponential. `n = 100, k = 99` is impossible.
**Space Complexity Calculation:** Recursion `O(k)`, adj `O(n+E)`.

- **Why can this be improved?** Overlapping subproblems: cheapest to `u` with exactly `i` edges. That is a DP, and Bellman-Ford *is* that DP. Recomputing walks that share prefixes is wasted work.

### Optimal Approach
The structure being exploited is a **directed, positively weighted graph with an explicit cap of `k+1` edges**. Truncated Bellman-Ford computes that DP.

**Core Observation**
Let `dist_i[v]` be the cheapest cost to `v` using **at most `i` edges**. Then

```text
dist_{i+1}[v] = min( dist_i[v],  min over flights u→v of dist_i[u] + price )
```

The right-hand side must read `dist_i`, not `dist_{i+1}`. If you write into the same array and reuse it, a node updated this round becomes a valid `u` for another flight in the same round, which is an `(i+2)`-edge path sneaking into round `i+1`.

**Pattern Identification**
`k+1` rounds. At the start of each round, `backup = dist.clone()`. Relax every flight `u → v` as `dist[v] = min(dist[v], backup[u] + price)` (guard `backup[u]` finite). Equivalent: BFS by layers, where layer `i` is "all cities reachable with exactly `i` flights", carrying the best cost per city in that layer.

Dijkstra variant: PQ of `{cost, node, stopsUsed}`. Do **not** finalize a node on first pop — a more expensive arrival with fewer stops is a different state. Track `bestStops[node]` or `dist[node][stops]`. A common bug is `if (cost >= dist[node]) continue;` which drops the expensive-but-fewer-stops state that later wins.

**Step-by-Step Intuition**
1. `dist = INF`, `dist[src] = 0`.
2. Repeat `k+1` times: snapshot `backup = dist.clone()`, then for every flight `u → v` of price `p`, if `backup[u]` is finite, `dist[v] = min(dist[v], backup[u] + p)`.
3. *Invariant: after round `i` (1-based), `dist[v]` is the cheapest cost to `v` with at most `i` flights.*
4. Return `dist[dst]` or `-1`.

**Dry Run** — sample, `k = 1` so `2` rounds. `INF` written `∞`.

| Step | State (backup → dist) | Action |
|------|-----------------------|--------|
| init | `[0, ∞, ∞, ∞]` | seed src |
| round 1 | backup `[0, ∞, ∞, ∞]` → `[0, 100, ∞, ∞]` | only `0→1` fires |
| round 2 | backup `[0, 100, ∞, ∞]` → `[0, 100, 200, 700]` | `1→2 = 200`, `1→3 = 700`; `2→3` cannot fire (`backup[2]` is `∞`) |
| end | `dist[3] = 700` | legal 1-stop path |

**THE BUG, same input, in-place relax, one "round":**

| Flight order | In-place `dist` | Edges actually used |
|--------------|-----------------|---------------------|
| `0→1` | `[0, 100, ∞, ∞]` | 1 |
| `1→2` | `[0, 100, 200, ∞]` | 2  (uses this round's `dist[1]`) |
| `2→3` | `[0, 100, 200, 400]` | 3  (uses this round's `dist[2]`) |

You report `400`, which is the 2-stop path, with `k = 1`. That is the wrong answer the snapshot exists to prevent.

**Why Does It Work?**
Bellman-Ford's correctness is: after `i` snapshot-rounds, every walk of `≤ i` edges has had a chance to write its cost, and no walk of `> i` edges has. Setting `i = k+1` is exactly the stop budget. Positive prices are not required for this argument (negatives would still be fine *without* a negative cycle); they only make Dijkstra-on-state also valid.

**Java Code**

```java
import java.util.*;

class CheapestFlightsWithinKStops {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        for (int round = 0; round <= k; round++) {       // k+1 rounds = k+1 edges
            int[] backup = dist.clone();                 // snapshot: one edge per round
            for (int[] f : flights) {
                int u = f[0], v = f[1], p = f[2];
                if (backup[u] == Integer.MAX_VALUE) continue;
                if (backup[u] + p < dist[v]) dist[v] = backup[u] + p;
            }
        }
        return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
    }

    // Dijkstra on (node, stopsUsed). Correct, heavier.
    public int findCheapestPriceDijkstra(int n, int[][] flights, int src, int dst, int k) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] f : flights) adj.get(f[0]).add(new int[]{f[1], f[2]});

        // bestStops[u] = fewest flights with which we have reached u at any cost
        int[] bestStops = new int[n];
        Arrays.fill(bestStops, Integer.MAX_VALUE);

        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src, 0}); // cost, node, flightsUsed

        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int cost = cur[0], u = cur[1], stops = cur[2];
            if (u == dst) return cost;
            if (stops == k + 1) continue;        // no more flights allowed
            if (stops >= bestStops[u]) continue; // a ≤stops route to u already processed
            bestStops[u] = stops;
            for (int[] e : adj.get(u)) {
                pq.add(new int[]{cost + e[1], e[0], stops + 1});
            }
        }
        return -1;
    }
}
```

The Dijkstra form uses `bestStops[u]`: once you popped `u` with some stop-count (and the heap is ordered by cost, so this is the cheapest way to reach `u` with that many stops or fewer), any later arrival at `u` with **more or equal** stops is useless. An arrival with **fewer** stops must still be expanded even if it is costlier — that is why the cutoff is on stops, not on cost. Using `if (cost >= dist[u]) continue` with a 1-D `dist[u]` is the famous wrong pruning.

**Complexity**

**Time Complexity Calculation:**
Bellman-Ford: `k+1` rounds, each scans `E` flights. `O((k+1) · E)`. With `n ≤ 100` this is the intended solution. Dijkstra-on-state: each `(node, stops)` pair is expanded at most once, `stops ≤ k+1`, so `O(k · E log (k V))`.

**Space Complexity Calculation:**
Bellman-Ford `O(V)` for `dist`/`backup` (flights array is the input). Dijkstra: adj `O(V+E)`, heap `O(k E)`, `bestStops` `O(V)`.

### Pattern to Remember
```text
Clue: cheapest path WITH at most K stops / at most K+1 edges
Pattern: Bellman-Ford for K+1 snapshot rounds; copy dist before each round
Mental model: round i = "one more flight"; in-place relax steals extra flights
```

**Similar problems:** 30 Dijkstra (drop the stop cap and this collapses to ordinary Dijkstra); 37 Bellman-Ford (same algorithm, `|V|-1` rounds, plus a negative-cycle extra round); 36 Number of Ways to Arrive (Dijkstra, count ties).

**Interview tip:** First words out of your mouth: "`k` stops means `k+1` edges, and I will clone `dist` every round." Then give the 400-vs-700 snapshot bug. That is the problem.
