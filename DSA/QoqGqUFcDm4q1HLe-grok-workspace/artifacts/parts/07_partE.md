# PART E — MST / Disjoint Set and Problems

A spanning tree of a connected undirected weighted graph is a subset of V−1 edges that touches every vertex and contains no cycle. The MST is the spanning tree of minimum total weight; the cut property (lightest edge across a cut sits in some MST) is the reason a greedy choice is safe. Prim grows one tree from a seed, always pulling the lightest edge that leaves the tree, with a priority queue that looks like Dijkstra except the key is the edge into the tree, not a path distance from the source. Kruskal sorts every edge and feeds them to a DSU, skipping any edge whose ends already share a parent — that edge would close a cycle. DSU is the star of the remaining problems: counting components, moving cables, merging emails, connecting stones by row or column, and adding islands online.

## 41. MST Theory

### Problem Understanding
A spanning tree of a connected undirected graph is a subgraph that includes every vertex, is connected, and has no cycle. Any such subgraph has exactly V−1 edges: fewer and some vertex is cut off, more and a cycle appears. When edges have weights, a **minimum spanning tree (MST)** is a spanning tree whose sum of weights is as small as possible. You are not asked to code a judge problem here; you are asked to know *why* greedy MST algorithms are correct, when the MST is unique, and what Prim/Kruskal actually optimize (total edge weight, **not** path distances).

**Input / Output / Constraints**
- Input: connected undirected weighted graph, V vertices, E edges with weights (possibly negative; MST does not care about sign).
- Output (conceptual): a set of V−1 edges of minimum total weight, or that total.
- Constraints: think V, E up to 10^5 for the algorithms that follow; uniqueness is a property of the weights, not of V.

**Observations**
- BFS/DFS trees are spanning trees of an unweighted (or unit-weight) connected graph. They are not MSTs unless all weights are equal.
- Removing any MST edge disconnects the tree into a **cut** (S, V−S). The edge you removed was a lightest edge across that cut.
- Adding any non-tree edge to an MST creates a unique cycle. The **cycle property** says a heaviest edge on that cycle is not required in an MST.
- If all edge weights are distinct, the MST is unique. Equal weights → several MSTs, all with the same total.
- Directed graphs do not have spanning trees in this sense; you want an arborescence, which is a different algorithm.

**Example**
```text
n = 4
edges (u, v, w): (0,1,1), (0,2,2), (1,2,3), (1,3,4), (2,3,5)

      1
  0 ----- 1
  |     / |
 2|   3/  |4
  |   /   |
  2 ----- 3
      5
```
MST edges: 0−1 (1), 0−2 (2), 1−3 (4). Total **7**. The edge 1−2 (3) is the heaviest on cycle 0−1−2, so the cycle property drops it. 2−3 (5) is heavier than 1−3 across the cut ({0,1,2}, {3}).

Second example (disconnected): n=3, edges (0,1,1) only. No spanning tree exists. The minimum spanning *forest* is that one edge plus an isolated vertex; weight 1. Problems that demand a tree return −1.

### How to Think About the Problem
- What should I notice first? The goal is a **tree on all vertices**, not a shortest-path tree. Path 0↝3 can be expensive in an MST; you only care about the sum of the V−1 chosen edges.
- Which representation? Edge list for Kruskal. Adjacency list for Prim.
- Counting / searching / ordering / minimizing → which mental model? **Greedy ordering of edges** (Kruskal) or **greedy growth of a set** (Prim). Both rest on the cut property.
- Which traversal is natural? Neither BFS nor DFS. You pick by weight.
- **Clue → Pattern:** *undirected, connect everyone, minimize sum of used edge weights, cycles forbidden → MST.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: enumerate every subset of V-1 edges, keep the
acyclic ones, take min total. O(C(E, V-1) · (V+E))
        ↓
Observation: the lightest edge across any cut is safe
(cut property). You never need to try a heavier cut-edge.
        ↓
Optimal: Prim (grow a tree) or Kruskal (sort + DSU).
O(E log E) or O(E log V)
```

### Brute Force Approach
- Basic idea: every spanning tree uses exactly V−1 edges. Walk every subset of that size, reject it if those edges form a cycle (or fail to touch all vertices), keep the minimum weight.
- Why it works: the definition of MST is "minimum among spanning trees". You compare them all.
- Java code:

```java
class MstTheory {
    // Brute: every (V-1)-edge subset. n small, E <= 20.
    int bruteMstWeight(int n, int[][] edges) {
        int m = edges.length;
        int best = Integer.MAX_VALUE;
        int totalMasks = 1 << m;
        for (int mask = 0; mask < totalMasks; mask++) {
            if (Integer.bitCount(mask) != n - 1) continue;
            int[] parent = new int[n];
            for (int i = 0; i < n; i++) parent[i] = i;
            int weight = 0;
            boolean cycle = false;
            int used = 0;
            for (int i = 0; i < m; i++) {
                if ((mask & (1 << i)) == 0) continue;
                int u = findNaive(parent, edges[i][0]);
                int v = findNaive(parent, edges[i][1]);
                if (u == v) { cycle = true; break; }
                parent[u] = v;
                weight += edges[i][2];
                used++;
            }
            // V-1 edges and no cycle ⇒ connected ⇒ spanning tree
            if (!cycle && used == n - 1) best = Math.min(best, weight);
        }
        return best == Integer.MAX_VALUE ? -1 : best;
    }

    private int findNaive(int[] parent, int x) {
        while (parent[x] != x) x = parent[x];
        return x;
    }
}
```

- **Time Complexity Calculation:** There are C(E, V−1) candidate subsets. Each is checked with a linear union-find pass over V−1 edges, O(V). For a dense graph this is exponential in V. Bitmask version is Θ(2^E · E).
- **Space Complexity Calculation:** O(V) parent array plus O(E) to hold the edge list.
- **Why can this be improved?** Almost every subset is garbage. The cut property lets you commit to a lightest cut-edge without looking at the rest of the subset space.

### Optimal Approach
The structure being exploited is an **undirected weighted graph**; connectivity is symmetric and the thing you build is a tree, not a path.

**Core Observation**
Cut property: for any partition of V into S and V−S, a minimum-weight edge with one end in S and one end in V−S belongs to some MST. Cycle property: a maximum-weight edge on any cycle can be excluded from some MST. If weights are all distinct, "some" becomes "every" / "none", and the MST is unique.

**Pattern Identification**
Greedy edge selection under a cycle-free constraint. Two standard realizations: grow one set (Prim, §42) or sort globally and skip cycle-closing edges (Kruskal, §44). Both need a way to know "would this edge close a cycle?" — DSU in Kruskal, a `visited` set in Prim.

**Step-by-Step Intuition**
1. Start with no edges. You have V components (each vertex a tiny tree).
2. Repeatedly add a globally safe edge: one that is lightest across some current cut. *Invariant: the edges chosen so far are a subset of some MST (a forest of MST fragments).*
3. Stop at V−1 edges. The forest has become one tree.
4. Uniqueness: if two MSTs existed and weights were distinct, their symmetric difference would contain a cycle where a strictly lighter swap would improve one of them.

**Dry Run**
Same 4-node graph. Kruskal order and Prim growth, side by side.

Kruskal (sort, skip cycles):

| Step | Edge | DSU parents (0..3) | Action |
| --- | --- | --- | --- |
| sort | 0-1:1, 0-2:2, 1-2:3, 1-3:4, 2-3:5 | [0,1,2,3] | — |
| 1 | 0-1 w=1 | [0,0,2,3] | different parents, add, total=1 |
| 2 | 0-2 w=2 | [0,0,0,3] | add, total=3 |
| 3 | 1-2 w=3 | [0,0,0,3] | same parent, skip (cycle 0-1-2) |
| 4 | 1-3 w=4 | [0,0,0,0] | add, total=7, V−1 edges, stop |

Prim (grow from 0):

| Step | Tree S | PQ (w, node, parent) | Action |
| --- | --- | --- | --- |
| 0 | {0} | (1,1,0), (2,2,0) | seed 0, dummy weight 0 |
| 1 | {0,1} | (2,2,0), (3,2,1), (4,3,1) | take 0-1, sum=1 |
| 2 | {0,1,2} | (3,2,1 vis), (4,3,1), (5,3,2) | take 0-2, sum=3 |
| 3 | {0,1,2,3} | (5,3,2) leftover | take 1-3, sum=7 |

**Why Does It Work?**
Any MST must cross every cut. If it crossed a cut with something heavier than the lightest cut-edge e, swap that crossing for e and the total drops — contradiction. So a greedy algorithm that only ever adds a lightest cut-edge is assembling an MST, not an arbitrary spanning tree. The cycle property is the same fact run backwards: a heaviest cycle edge is never the unique lightest edge of its cut.

**Java Code**
Preview of Kruskal. Full DSU lives in §43; full Kruskal in §44. This method returns the MST weight given `n` and `edges[i] = {u, v, w}`.

```java
class MstTheory {
    int spanningTreeWeight(int n, int[][] edges) {
        Arrays.sort(edges, Comparator.comparingInt(e -> e[2]));
        int[] parent = new int[n];
        int[] size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        int total = 0, used = 0;
        for (int[] e : edges) {
            int pu = find(parent, e[0]);
            int pv = find(parent, e[1]);
            if (pu == pv) continue;          // would close a cycle
            if (size[pu] < size[pv]) {
                int t = pu; pu = pv; pv = t;
            }
            parent[pv] = pu;
            size[pu] += size[pv];
            total += e[2];
            used++;
            if (used == n - 1) break;
        }
        return used == n - 1 ? total : -1;   // disconnected → no MST
    }

    private int find(int[] parent, int x) {
        int r = x;
        while (parent[r] != r) r = parent[r];
        while (parent[x] != x) {
            int next = parent[x];
            parent[x] = r;
            x = next;
        }
        return r;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** Sorting E edges is O(E log E). Each of up to E unions/finds is amortized α(V). Dominated by the sort: O(E log E).
- **Space Complexity Calculation:** O(V) for parent and size. The sort is in-place on the edge array (clone first if the caller still needs the original order).

### Pattern to Remember
```text
Clue: undirected, connect all vertices, minimize sum of chosen edge weights
Pattern: MST — cut property licenses greedy (Prim or Kruskal)
Mental model: a tree of V-1 edges, not a shortest-path tree from a source
```
**Similar problems:** 42 Prim's Algorithm, 44 Find the MST Weight, 8 Detect Cycle in an Undirected Graph (the cycle you refuse to close), 30 Dijkstra (same PQ shape, different key).
**Interview tip:** If they ask "is the shortest-path tree an MST?" say no — draw a triangle with weights 1, 1, 100 and source at the 100's opposite vertex.

## 42. Prim's Algorithm

### Problem Understanding
Build an MST by growing a single tree. Start at vertex 0. Repeatedly add the lightest edge that has one end inside the tree and one end outside. A min-heap stores candidate crossing edges as `[weight, node, parent]`. The sum of accepted weights is the MST cost; the `(parent, node)` pairs are the MST edges.

**Input / Output / Constraints**
- Input: n vertices, undirected weighted edges. 0-index.
- Output: MST weight; optionally the list of MST edges.
- Constraints: typical n ≤ 10^5, E ≤ 10^5. Weights fit in 32-bit if you do not subtract them in the comparator.
- Disconnected input: Prim started only at 0 returns the MST of 0's component. A spanning *forest* needs a loop over unvisited vertices. If the problem requires a tree of the whole graph, detect `visitedCount < n` and return −1.

**Observations**
- Prim is Dijkstra with a different key. Dijkstra stores `dist[source ↝ u]`. Prim stores `dist[tree ↝ u]` = weight of the cheapest edge that currently enters u from the tree.
- Once a node is popped from the PQ and marked visited, it is in the MST for good. Later PQ entries for that node are stale and skipped.
- Negative weights are fine. There is no path-sum, so "negative cycle" is meaningless.
- Dense graphs (E ≈ V²): a `int[] key` + linear scan (O(V²) Prim) beats a heap.

**Example**
Same graph as §41. Prim from 0 yields edges 0−1, 0−2, 1−3, weight 7.

Second example (disconnected): n=4, edges (0,1,1), (2,3,1). Prim from 0 visits {0,1} only. Forest weight 2 if you restart at 2; otherwise "no MST".

### How to Think About the Problem
- What should I notice first? You grow **one** component. The cut is always (tree, rest of graph).
- Which representation? Adjacency list: `List<List<int[]>> adj` with `{v, w}`.
- Counting / searching / ordering / minimizing → which mental model? Repeatedly take the min outgoing edge — a PQ over the cut.
- Which traversal is natural? Best-first over edge weight, not BFS layers, not DFS.
- **Clue → Pattern:** *grow a tree by lightest leaving edge → Prim. Same skeleton as Dijkstra, key = edge weight.*

### Intuition (Brute → Better → Optimal)
```text
Brute: at each of V-1 steps, scan every edge to find the
lightest one that crosses (S, V-S). O(V · E)
        ↓
Observation: the candidate leaving-edges of S live on the
adjacency lists of vertices already in S. A min-heap
holds them. Stale entries are skipped via vis[].
        ↓
Optimal lazy Prim: O(E log E) with a binary heap
(each edge pushed at most twice)
```

### Brute Force Approach
- Basic idea: S starts as `{0}`. V−1 times, walk the whole edge list, pick the minimum-weight edge with exactly one end in S, add the other end to S.
- Why it works: each chosen edge is a lightest edge across the current cut, so the cut property applies at every step.
- Java code:

```java
class PrimsAlgorithm {
    int brutePrim(int n, int[][] edges) {
        boolean[] in = new boolean[n];
        in[0] = true;
        int sum = 0, inside = 1;
        for (int step = 0; step < n - 1; step++) {
            int bestW = Integer.MAX_VALUE, bestU = -1, bestV = -1;
            for (int[] e : edges) {
                int u = e[0], v = e[1], w = e[2];
                if (in[u] == in[v]) continue;       // both in or both out
                if (w < bestW) { bestW = w; bestU = u; bestV = v; }
            }
            if (bestU < 0) return -1;              // remaining vertices unreachable
            in[bestU] = in[bestV] = true;
            sum += bestW;
            inside++;
        }
        return inside == n ? sum : -1;
    }
}
```

- **Time Complexity Calculation:** V−1 steps, each scans E edges → O(V E). Fine for V ≤ 400, not for 10^5.
- **Space Complexity Calculation:** O(V) for `in[]`. Edges stored as given, O(E).
- **Why can this be improved?** You re-scan edges that cannot enter the cut until their inner endpoint is added. A heap lets each edge compete in log time when that endpoint joins.

### Optimal Approach
The structure being exploited is an **undirected weighted connected graph**; Prim explores a growing tree's boundary.

**Core Observation**
The next MST vertex is the one outside S whose cheapest edge into S is globally minimum. A min-heap of `[weight, node, parent]` maintains that boundary. `visited[u] = true` means u is in S; popping a visited node is a no-op (lazy heap, no decrease-key).

**Pattern Identification**
Best-first search on **edge weight into the tree**. Swap the relaxation `dist[v] = dist[u] + w` (Dijkstra) for `dist[v] = w(u, v)` (Prim) and the same code produces an MST instead of shortest paths.

| | Dijkstra | Prim |
| --- | --- | --- |
| Graph | directed or undirected, non-negative | undirected, any real weights |
| PQ key | `dist[src ↝ u]` | `dist[tree ↝ u]` = min incident tree-edge |
| Relax | `dist[v] = dist[u] + w(u,v)` | `key[v] = min(key[v], w(u,v))` |
| On pop | `dist[u]` is shortest | `u` joins the MST |
| Output | `dist[]` / path | tree edges / total weight |

**Step-by-Step Intuition**
1. Push `[0, 0, -1]` — a dummy edge into the seed. *Invariant: every vertex in `vis` is already an MST vertex; the heap holds edges from that tree to the outside.*
2. Pop the lightest heap entry. If the node is visited, skip (a cheaper tree-edge already claimed it).
3. Mark visited, add `weight` to the answer, record `(parent, node)` unless parent is −1.
4. Push every edge from this node to an unvisited neighbour.
5. Stop when the heap is empty. If you visited n nodes, you have an MST; otherwise a forest of 0's component.

**Dry Run**
Graph of §41. adj: 0: (1,1)(2,2); 1: (0,1)(2,3)(3,4); 2: (0,2)(1,3)(3,5); 3: (1,4)(2,5).

| Step | Pop (w,u,p) | vis | sum | MST edges | PQ after pushes |
| --- | --- | --- | --- | --- | --- |
| seed | (0,0,−1) | {0} | 0 | — | (1,1,0), (2,2,0) |
| 1 | (1,1,0) | {0,1} | 1 | 0-1 | (2,2,0), (3,2,1), (4,3,1) |
| 2 | (2,2,0) | {0,1,2} | 3 | 0-1, 0-2 | (3,2,1), (4,3,1), (5,3,2) |
| skip | (3,2,1) | 2 already vis | 3 | same | (4,3,1), (5,3,2) |
| 3 | (4,3,1) | {0,1,2,3} | 7 | + 1-3 | (5,3,2) leftover, 3 vis |

**Why Does It Work?**
At the moment you pop u, the popped edge is a lightest edge across the cut (S, V−S). Cut property ⇒ it belongs to some MST that already contains S (the invariant from previous steps). Induction from the dummy seed gives a full MST. Visited-on-pop, not on-push, is required: a node may have several heap entries and only the lightest accepted one is the tree edge.

**Java Code**

```java
class PrimsAlgorithm {
    // returns mstWeight and fills mstEdges with {parent, node, w}
    int spanningTree(int n, int[][] edges, List<int[]> mstEdges) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            adj.get(e[1]).add(new int[]{e[0], e[2]});
        }

        boolean[] vis = new boolean[n];
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.offer(new int[]{0, 0, -1});          // weight, node, parent
        int sum = 0, taken = 0;
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int w = cur[0], u = cur[1], p = cur[2];
            if (vis[u]) continue;
            vis[u] = true;
            sum += w;
            taken++;
            if (p != -1) mstEdges.add(new int[]{p, u, w});
            for (int[] edge : adj.get(u)) {
                int v = edge[0], wt = edge[1];
                if (!vis[v]) pq.offer(new int[]{wt, v, u});
            }
        }
        return taken == n ? sum : -1;           // -1 if 0's component ≠ whole graph
    }

    // spanning forest: restart Prim on every unvisited vertex
    int spanningForest(int n, List<List<int[]>> adj) {
        boolean[] vis = new boolean[n];
        int sum = 0;
        for (int s = 0; s < n; s++) {
            if (vis[s]) continue;
            PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
            pq.offer(new int[]{0, s, -1});
            while (!pq.isEmpty()) {
                int[] cur = pq.poll();
                int w = cur[0], u = cur[1];
                if (vis[u]) continue;
                vis[u] = true;
                sum += w;
                for (int[] edge : adj.get(u)) {
                    if (!vis[edge[0]]) pq.offer(new int[]{edge[1], edge[0], u});
                }
            }
        }
        return sum;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** Each edge is pushed at most twice (once from each end) and each push/pop is O(log E). Total O(E log E). Equivalent to O(E log V) because E < V² so log E = O(log V). Building adj is O(V+E).
- **Space Complexity Calculation:** O(V+E) adj, O(V) vis, O(E) heap in the worst case (lazy duplicates).

### Pattern to Remember
```text
Clue: undirected MST, grow from a vertex, "lightest edge leaving the tree"
Pattern: Prim — PQ of [w, node, parent], vis on pop, key = edge weight
Mental model: Dijkstra's skeleton, but dist[tree → u] not dist[src → u]
```
**Similar problems:** 41 MST Theory, 44 Kruskal (same output, edge-sort + DSU), 30 Dijkstra, 33 Path with Minimum Effort (another "key on the edge, not the path sum").
**Interview tip:** Draw the one-row table "Dijkstra adds, Prim overwrites with w(u,v)". If they give a dense graph, switch to O(V²) array-Prim and drop the heap.

## 43. Disjoint Set (Union by Rank / by Size, Path Compression)

### Problem Understanding
A disjoint-set (Union-Find, DSU) maintains a partition of `{0, …, n−1}`. Two operations: `find(x)` returns the representative of x's set; `union(a, b)` merges the two sets. You need this as a data structure, not as a one-off trick: Kruskal (§44) and every remaining problem in this part call it.

**Input / Output / Constraints**
- Input: n elements, a sequence of unions and "are a and b connected?" queries.
- Output: after each union, the partition is coarser; find answers in almost O(1).
- Constraints: n and operations up to 10^5–10^6. Amortized α(n) ≤ 4 for every n you will ever see.

**Observations**
- The forest of parent pointers *is* the partition. A root has `parent[root] == root`.
- Naive `parent[a] = b` builds a linked list of height n. Then each find is O(n).
- Two independent fixes: **union by size/rank** (always hang the smaller tree under the larger → height O(log n)) and **path compression** (after you know the root, point every node on the walk at it). Together: amortized inverse-Ackermann α(n) ≈ 4. People say "almost O(1)".
- Without compression, find is O(h). With union-by-size, h = O(log n). With both, h is "constant" in practice.
- Rank is an upper bound on height. Path compression does not update rank (updating it correctly is not worth the code). Size is exact and is the quantity later problems actually read (`sizeOf(root)` = component size).
- Recursive find is shorter; iterative find cannot blow the stack on a degenerate chain before compression has run.

**Example**
n = 5 (index 0 unused), operations `union(1,2)`, `union(3,4)`, `union(2,3)`. After the three unions, `{1,2,3,4}` is one component of size 4. `find(4) == find(1)`.

Second example: `union(1,2)` twice. Second call must return false (already same set) — that is Kruskal's cycle test and Islands II's "do not decrement twice".

### How to Think About the Problem
- What should I notice first? You do **not** need the graph. You need "same component?" as a primitive, online.
- Which representation? `parent[]`, `size[]`, optionally `rank[]`. Arrays, 0-index, size n (or n+1 if the problem is 1-index).
- Counting / searching / ordering / minimizing → which mental model? Maintaining a **partition**. Merges only grow sets; you never split (not in this series).
- Which traversal is natural? None. `find` walks parent pointers, not adj lists.
- **Clue → Pattern:** *online "are these two already connected?" / "merge these two groups" → DSU.*

### Intuition (Brute → Better → Optimal)
```text
Brute: boolean[n][n] "same set" matrix, union = O(n) row copy.
        ↓
Observation: a tree of parents, find = walk to root.
Without heuristics find is O(n) (a snake).
        ↓
Union by size/rank  →  height O(log n)
        ↓
+ path compression  →  amortized α(n) ≈ 4
```

### Brute Force Approach
- Basic idea: each element stores an integer set-id. `union` scans all n elements and relabels. `find` is an array read.
- Why it works: the id *is* the partition. Correct, slow.
- Java code:

```java
class NaiveDisjointSet {
    final int[] id;
    NaiveDisjointSet(int n) {
        id = new int[n];
        for (int i = 0; i < n; i++) id[i] = i;
    }
    int find(int x) { return id[x]; }
    boolean union(int a, int b) {
        int ia = id[a], ib = id[b];
        if (ia == ib) return false;
        for (int i = 0; i < id.length; i++) if (id[i] == ib) id[i] = ia;
        return true;
    }
}
```

- **Time Complexity Calculation:** Each union is Θ(n). k unions → O(k n). At n = k = 10^5 this is 10^10.
- **Space Complexity Calculation:** O(n).
- **Why can this be improved?** Relabeling a whole set is waste. Point the root of one tree at the root of the other, O(1) after two finds, and pay the walk on find instead — then shorten those walks.

### Optimal Approach
The structure being exploited is a **dynamic partition of a finite set**; the graph, if any, is only the sequence of unions the caller feeds you.

**Core Observation**
Hang the smaller component under the larger (`union by size`) so roots of big sets stay roots. After `find`, flatten the walked path onto the root (`path compression`) so the next find is one hop. Size of a component is `size[find(x)]` and is already maintained.

**Pattern Identification**
This class is the canonical DSU for §44–§50. Later problems do not re-implement it; they call `find` / `union` / `sizeOf`.

**Step-by-Step Intuition**
1. `parent[i] = i`, `size[i] = 1`, `rank[i] = 0`. *Invariant: following parent from any x reaches the unique root of x's set; `size[root]` equals the set cardinality.*
2. `find(x)`: walk to the root, then walk again writing `parent = root` (two-pass iterative compression). Recursive equivalent: `parent[x] = find(parent[x])`.
3. `union(a,b)`: if `find(a) == find(b)` return false (already together — this boolean is the cycle detector). Else attach the smaller `size` root under the larger, add sizes.
4. Rank variant: attach the lower rank under the higher; on a tie, attach either and increment the winner's rank by 1.

**Dry Run**
Operations `union(1,2)`, `union(3,4)`, `union(2,3)` on n=5. Size is primary.

| Step | Action | parent[0..4] | size[0..4] | Notes |
| --- | --- | --- | --- | --- |
| init | — | [0, 1, 2, 3, 4] | [1, 1, 1, 1, 1] | each a root |
| 1 | union(1,2): find=1,2 equal size, attach 2→1 | [0, 1, 1, 3, 4] | [1, 2, 1, 1, 1] | size[1]=2 |
| 2 | union(3,4): attach 4→3 | [0, 1, 1, 3, 3] | [1, 2, 1, 2, 1] | size[3]=2 |
| 3 | union(2,3): find(2)=1, find(3)=3, sizes 2=2, attach 3→1 | [0, 1, 1, 1, 3] | [1, 4, 1, 2, 1] | size[1]=4; 4 still points at 3 |
| 4 | find(4): walk 4→3→1, compress | [0, 1, 1, 1, 1] | [1, 4, 1, 2, 1] | parent[4]=1, parent[3]=1 |

```text
after step 3, before compression:        after find(4):

        1                                      1
       / \                                   / | \
      2   3                                 2  3  4
           \
            4
```

**Why Does It Work?**
Union by size guarantees that when a node is hung under a new root, the new set is at least twice as big, so a node can be demoted O(log n) times. Path compression does not break the "parent leads to root" invariant; it only shortens paths. The Ackermann bound is the theorem you cite, not something you re-prove at a whiteboard — say "amortized almost constant, inverse Ackermann".

**Java Code**

```java
class DisjointSet {
    final int[] parent;
    final int[] size;
    final int[] rank;

    DisjointSet(int n) {
        parent = new int[n];
        size = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }

    // iterative find + two-pass path compression (preferred)
    int find(int x) {
        int r = x;
        while (parent[r] != r) r = parent[r];
        while (parent[x] != x) {
            int next = parent[x];
            parent[x] = r;
            x = next;
        }
        return r;
    }

    // recursive equivalent (mention, don't ship on deep chains):
    // int findRec(int x) {
    //     return parent[x] == x ? x : (parent[x] = findRec(parent[x]));
    // }

    boolean union(int a, int b) {             // size is primary
        return unionBySize(a, b);
    }

    boolean unionBySize(int a, int b) {
        int pa = find(a), pb = find(b);
        if (pa == pb) return false;
        if (size[pa] < size[pb]) {
            int t = pa; pa = pb; pb = t;
        }
        parent[pb] = pa;
        size[pa] += size[pb];
        return true;
    }

    boolean unionByRank(int a, int b) {
        int pa = find(a), pb = find(b);
        if (pa == pb) return false;
        if (rank[pa] < rank[pb]) {
            parent[pa] = pb;
        } else if (rank[pb] < rank[pa]) {
            parent[pb] = pa;
        } else {
            parent[pb] = pa;
            rank[pa]++;
        }
        return true;
    }

    int sizeOf(int x) { return size[find(x)]; }

    boolean connected(int a, int b) { return find(a) == find(b); }
}
```

**Complexity**
- **Time Complexity Calculation:** With union by size (or rank) **and** path compression, a sequence of m operations on n elements is O(m · α(n)). α(n) ≤ 4 for n less than the number of atoms in the universe. Without compression, find is O(h) and h is O(log n) with union by size, O(n) without it.
- **Space Complexity Calculation:** O(n) for parent, size, rank.

### Pattern to Remember
```text
Clue: merge groups / query "already in the same component?" online
Pattern: DSU — iterative find + path compression + union by size
Mental model: a forest of parents; roots name the sets; size[root] is the set
```
**Similar problems:** 44 Kruskal, 45 Make Network Connected, 4 Number of Provinces (DSU instead of DFS), 8 Cycle in Undirected Graph (`union` returning false).
**Interview tip:** Write union-by-size, not rank, unless they ask for rank. Size is the value §46–§49 read. Return boolean from union so cycle/merge detection is one call.

## 44. Find the MST Weight

### Problem Understanding
Given n vertices and a list of undirected weighted edges, return the total weight of an MST. This is Kruskal's algorithm sitting on the DSU from §43. Prim from §42 solves the same problem; Kruskal is the edge-list form.

**Input / Output / Constraints**
- Input: n, `edges[i] = {u, v, w}`, 0-index, undirected.
- Output: MST weight. If the graph is disconnected: return −1 when the problem wants a tree, or the spanning-forest weight when it wants "connect whatever you can".
- Constraints: n, E ≤ 10^5. Sorting dominates.

**Observations**
- Sort edges by weight ascending. Walk them. `ds.union(u,v)` succeeds ⇔ the edge did not close a cycle ⇔ it is safe to add.
- You add at most n−1 edges. Early-exit when `used == n-1`.
- Extra edges that Kruskal skips are the "redundant cables" of §45.
- Kruskal does not need an adjacency list. If the input is already an edge list, do not build one.
- Equal weights: any order among ties is valid; you get some MST, not a specific one.

**Example**
n=4, edges `(0,1,1),(0,2,2),(1,2,3),(1,3,4),(2,3,5)` → MST weight **7** (edges 0−1, 0−2, 1−3).

Second example (disconnected): n=4, edges `(0,1,1),(2,3,5)`. `used = 2 < 3`. Return −1 if a tree is required; forest weight 6 otherwise.

### How to Think About the Problem
- What should I notice first? Global order of edges, not a walk from a source.
- Which representation? Edge list. DSU on vertices.
- Counting / searching / ordering / minimizing → which mental model? Sort, then accept an edge iff it merges two components.
- Which traversal is natural? None. The DSU *is* the connectivity query.
- **Clue → Pattern:** *sort edges, add if different parents → Kruskal MST.*

### Intuition (Brute → Better → Optimal)
```text
Brute: enumerate spanning trees (§41) O(2^E)
        ↓
Observation: a lightest remaining edge that does not
cycle is always safe (cut property on the two DSU sets).
        ↓
Optimal Kruskal: sort O(E log E) + DSU O(E α(V))
(Prim from §42 is the other optimal)
```

### Brute Force Approach
- Basic idea: the bitmask enumerator of §41. Correct, exponential.
- Why it works: definition of MST.
- Java code:

```java
class FindMstWeight {
    int bruteMstWeight(int n, int[][] edges) {
        // identical to MstTheory.bruteMstWeight in §41
        int m = edges.length, best = Integer.MAX_VALUE;
        for (int mask = 0; mask < (1 << m); mask++) {
            if (Integer.bitCount(mask) != n - 1) continue;
            int[] p = new int[n];
            for (int i = 0; i < n; i++) p[i] = i;
            int w = 0, used = 0;
            boolean cycle = false;
            for (int i = 0; i < m; i++) {
                if ((mask & (1 << i)) == 0) continue;
                int a = edges[i][0], b = edges[i][1];
                while (p[a] != a) a = p[a];
                while (p[b] != b) b = p[b];
                if (a == b) { cycle = true; break; }
                p[a] = b;
                w += edges[i][2];
                used++;
            }
            if (!cycle && used == n - 1) best = Math.min(best, w);
        }
        return best == Integer.MAX_VALUE ? -1 : best;
    }
}
```

- **Time Complexity Calculation:** Θ(2^E · E). Only a demo for E ≤ 20.
- **Space Complexity Calculation:** O(V).
- **Why can this be improved?** You only need the greedy scan of the sorted edge list; the cut property proves you will not miss a better tree.

### Optimal Approach
The structure being exploited is an **undirected weighted graph** presented as an edge list; DSU tests the cycle property in α(V).

**Core Observation**
After sorting, the first edge that connects two different DSU roots is a lightest edge of the cut (those two components vs the rest, or specifically between those two). Accept it, merge. Skip otherwise. The accepted set is an MST (or a minimum spanning forest).

**Pattern Identification**
Kruskal = `sort by w` + `if union(u,v) then ans += w`. Prim (§42) is the alternative when you already have adj lists or the graph is dense.

**Step-by-Step Intuition**
1. Sort `edges` by `w` ascending.
2. `DisjointSet ds = new DisjointSet(n)`. *Invariant: the accepted edges are an MST of the subgraph they span; DSU roots are the current trees of the forest.*
3. For each edge, `if (ds.union(u, v)) { ans += w; used++; }`.
4. If `used == n-1` return `ans`. If the problem requires a connected MST and `used < n-1`, return −1.

**Dry Run**
n=4, edges as above.

| Step | Edge | find u,v | union? | used | total | DSU roots |
| --- | --- | --- | --- | --- | --- | --- |
| sort | (0,1,1), (0,2,2), (1,2,3), (1,3,4), (2,3,5) | — | — | 0 | 0 | 0,1,2,3 |
| 1 | 0-1 w=1 | 0, 1 | yes | 1 | 1 | {0,1}, 2, 3 |
| 2 | 0-2 w=2 | 0, 2 | yes | 2 | 3 | {0,1,2}, 3 |
| 3 | 1-2 w=3 | 0, 0 | no (cycle) | 2 | 3 | same |
| 4 | 1-3 w=4 | 0, 3 | yes | 3 | 7 | {0,1,2,3} |
| stop | used == n-1 | | | 3 | **7** | one tree |

**Why Does It Work?**
Induct on the number of accepted edges. The next accepted edge is a lightest edge connecting two different trees of the current MST-forest, i.e. a lightest edge across that cut. Cut property extends the invariant. Skipping an edge whose ends already share a root is the cycle property: that edge is the heaviest (or tied-heaviest) on the cycle it would form with the tree path.

**Java Code**
use DisjointSet from §43.

```java
class FindMstWeight {
    // connected MST weight, or -1 if disconnected
    int spanningTreeWeight(int n, int[][] edges) {
        int[][] es = Arrays.copyOf(edges, edges.length);
        Arrays.sort(es, Comparator.comparingInt(e -> e[2]));
        DisjointSet ds = new DisjointSet(n);
        int total = 0, used = 0;
        for (int[] e : es) {
            if (ds.union(e[0], e[1])) {
                total += e[2];
                used++;
                if (used == n - 1) break;
            }
        }
        return used == n - 1 ? total : -1;
    }

    // minimum spanning forest weight (always defined)
    int spanningForestWeight(int n, int[][] edges) {
        int[][] es = Arrays.copyOf(edges, edges.length);
        Arrays.sort(es, Comparator.comparingInt(e -> e[2]));
        DisjointSet ds = new DisjointSet(n);
        int total = 0;
        for (int[] e : es) {
            if (ds.union(e[0], e[1])) total += e[2];
        }
        return total;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** O(E log E) for the sort, plus O(E α(V)) DSU. Building nothing else. Prim on an adj list is O(E log E) as well; pick Kruskal when the input is an edge list, Prim when it is already adj (or V²-dense).
- **Space Complexity Calculation:** O(V) DSU. O(E) extra if you copy before sorting.

### Pattern to Remember
```text
Clue: MST weight from an edge list
Pattern: Kruskal — sort edges, DSU-skip if same parent, accumulate w
Mental model: grow a forest; an accepted edge always merges two trees
```
**Similar problems:** 41 MST Theory, 42 Prim, 45 Network Connected (the skipped edges are spare cables), 8 Cycle Undirected.
**Interview tip:** State the disconnected policy in the first sentence of your answer: "−1 if I cannot get n−1 unions, forest sum otherwise." Then code Kruskal in ten lines.

## 45. Number of Operations to Make Network Connected

### Problem Understanding
You have n computers (nodes 0..n−1) and `connections[i] = [a, b]` cables. A cable can be removed from a redundant place and reused between two components. One operation = move one cable. Return the minimum number of operations to make the whole network connected, or −1 if you do not have enough cables.

**Input / Output / Constraints**
- Input: n, `connections` as undirected unweighted edges. 0-index.
- Output: `components − 1`, or −1 if `connections.length < n − 1`.
- Constraints: n ≤ 10^5, connections ≤ 10^5. DSU.

**Observations**
- A connected graph on n vertices needs at least n−1 edges. If `connections.length < n-1` you cannot succeed, no matter how you move cables. Return −1.
- Inside a component of size s you need s−1 cables to keep it connected. Any extra cable in that component is movable.
- Globally: extras = `connections.length − (n − components)` because a forest of `components` trees uses `n − components` edges. You need `components − 1` extras to link the trees into one. The inequality `extras >= components − 1` rearranges to `connections.length >= n − 1`. So the extra-count is redundant with the early length check: **if `connections.length < n-1` return −1, else return `components-1`.**
- Moving a cable is not something you simulate. The answer is a count.

**Example**
n=4, connections=`[[0,1],[0,2],[1,2]]`.
```text
0 — 1
| /
2     3
```
3 cables, 4 nodes. Components = 2 (`{0,1,2}`, `{3}`). `3 >= 3`, answer `2-1 = 1`. Move the redundant 1−2 onto 2−3.

Second example: n=6, connections=`[[0,1],[0,2],[0,3],[1,2]]`. 4 cables < 5, return **−1**. Three components would need 2 moves, but you only have `4 − (6-3) = 1` extra.

### How to Think About the Problem
- What should I notice first? Cables are **undirected edges**. The operation does not create new cables; it relocates existing ones.
- Which representation? DSU on n computers. You do not need adj lists.
- Counting / searching / ordering / minimizing → which mental model? Count components. Connecting k components takes k−1 edges.
- Which traversal is natural? Any component count (DFS/BFS/DSU). DSU is the one-liner because the input is an edge list.
- **Clue → Pattern:** *n nodes, spare edges, make one component → DSU, answer = components−1, or −1 if E < n−1.*

### Intuition (Brute → Better → Optimal)
```text
Brute: try every way to reassign redundant edges. Exponential.
        ↓
Observation: you never care which cable moves where.
k components become 1 with exactly k-1 moves, iff enough extras.
        ↓
Optimal: DSU count components. O(E α(n))
if E < n-1 → -1 else components-1
```

### Brute Force Approach
- Basic idea: DFS/BFS to label components, then recurse on every extra edge and every pair of components to assign it. Search the minimum number of assignments that yield one component.
- Why it works: it enumerates legal sequences of operations.
- Java code (the component-count half, which is all you actually need; the search is the waste):

```java
class MakeConnected {
    int bruteComponentCount(int n, int[][] connections) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : connections) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        boolean[] vis = new boolean[n];
        int comp = 0;
        for (int i = 0; i < n; i++) {
            if (vis[i]) continue;
            comp++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.offer(i);
            vis[i] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) if (!vis[v]) {
                    vis[v] = true;
                    q.offer(v);
                }
            }
        }
        return comp;
    }
}
```

- **Time Complexity Calculation:** Component count is O(n+E). The hypothetical search over assignments is exponential in the number of extras.
- **Space Complexity Calculation:** O(n+E) adj + vis.
- **Why can this be improved?** The search is fake work. Once you know k and E, the answer is closed-form.

### Optimal Approach
The structure being exploited is an **undirected unweighted graph** whose connectivity we may rearrange by relocating edges; DSU counts the current components.

**Core Observation**
`components − 1` is both the number of cables you must add and the number of operations, provided a surplus exists. Surplus exists iff `E ≥ n−1`. You do not pick which cable to move.

**Pattern Identification**
Offline component count + arithmetic. Same DSU as Kruskal, ignoring weights.

**Step-by-Step Intuition**
1. If `connections.length < n-1` return −1. *Invariant after this check: there exist enough edges in total to build a tree on n vertices.*
2. Union every cable. Redundant cables (`union` returns false) stay in DSU as no-ops; they are the extras.
3. Count roots: `components = |{i | find(i)==i}|`.
4. Return `components - 1`.

**Dry Run**
n=4, connections=`[[0,1],[0,2],[1,2]]`.

| Step | Edge | union? | components (roots) |
| --- | --- | --- | --- |
| init | — | — | 4  (0,1,2,3) |
| 1 | 0-1 | yes | 3  (0,2,3) |
| 2 | 0-2 | yes | 2  (0,3) |
| 3 | 1-2 | no (already same) | 2 |
| end | E=3 ≥ 3 | | answer = 2−1 = **1** |

Disconnected failure: n=6, E=4 < 5 → return −1 before DSU. (If you still ran DSU you would see 3 components and 1 extra, which is less than 2 needed — same −1.)

**Why Does It Work?**
A tree on n vertices has n−1 edges. Having at least that many edges is necessary. It is also sufficient: extras live somewhere in the current forest, and each extra can be pulled onto a gap between two trees. You need exactly `components−1` such gaps. No smaller number connects k components.

**Java Code**
use DisjointSet from §43.

```java
class MakeConnected {
    public int makeConnected(int n, int[][] connections) {
        if (connections.length < n - 1) return -1;
        DisjointSet ds = new DisjointSet(n);
        for (int[] e : connections) ds.union(e[0], e[1]);
        int components = 0;
        for (int i = 0; i < n; i++) if (ds.find(i) == i) components++;
        return components - 1;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** O(n + E α(n)) to union all cables and scan roots. Linear in the input.
- **Space Complexity Calculation:** O(n) DSU. No adjacency list.

### Pattern to Remember
```text
Clue: move existing edges so the graph becomes connected
Pattern: DSU components; answer = components-1, else -1 if E < n-1
Mental model: extras = E - (n - components); need components-1 of them
```
**Similar problems:** 4 Number of Provinces (the component count), 44 Kruskal (redundant = skipped edges), 48 Islands II (component count that changes).
**Interview tip:** Say the one-liner `E < n-1 ? -1 : components-1` before you touch DSU. Then the interviewer knows you will not simulate cable moves.

## 46. Most Stones Removed with Same Row or Column

### Problem Understanding
Stones sit at distinct integer points `stones[i] = [x, y]`. You may remove a stone if some remaining stone shares its row or its column. Return the maximum number of stones you can remove.

**Input / Output / Constraints**
- Input: `stones`, length n ≤ 1000, coordinates in `[0, 10^4]`.
- Output: max removals.
- A stone with no row/col-mate can never be removed.

**Observations**
- Sharing a row or column is an undirected edge. The rule "remove if a neighbour still exists" means: inside a connected component of size s you can remove s−1 stones and must leave 1 (the last stone has no mate left).
- Max removed = `n − (number of connected components)`.
- Building the n-node graph costs O(n²) row/col comparisons. Fine for n=1000, not the interesting solution.
- Sentinel trick: give every row-x a DSU node and every col-y a DSU node (col index shifted by an offset so rows and cols never collide). Each stone unions `row[x]` with `col[y+offset]`. Stones that share a row or a col share a sentinel and therefore a component. Count components among *used* sentinels, not among the 20002 possible ones.
- Offset = 10001 (coords 0..10000). DSU size 20002.

**Example**
`stones = [[0,0],[0,1],[1,0],[1,2],[2,1],[2,2]]`
```text
(0,0) (0,1)
(1,0)       (1,2)
      (2,1) (2,2)
```
One component (every stone shares a row or col with another, chained). Answer `6-1 = 5`.

Second example: `[[0,0],[0,2],[1,1],[2,0],[2,2]]`. Two components (the four corners share rows/cols; (1,1) is isolated — its row and col contain no other stone). Answer `5-2 = 3`.

### How to Think About the Problem
- What should I notice first? The remove-rule is *not* "remove one stone per row". It is graph connectivity on the "same row or same col" relation.
- Which representation? Implicit graph on n stones, or DSU on row/col sentinels.
- Counting / searching / ordering / minimizing → which mental model? Count components, then `n − components`.
- Which traversal is natural? DSU. DFS on the O(n²) graph also works at this n.
- **Clue → Pattern:** *objects connected if they share an attribute (row/col), max remove all but one per component → DSU, n − components.*

### Intuition (Brute → Better → Optimal)
```text
Brute: O(n²) build graph (edge if same row/col) + DFS components.
        ↓
Observation: you only need components, not the edge list.
DSU on n stones, union i-j if same row or col. O(n² α)
        ↓
Optimal: DSU on row and col sentinels. Each stone is one
union(row, col). O(n α). Components among used sentinels.
```

### Brute Force Approach
- Basic idea: n nodes, undirected edge when `xi==xj || yi==yj`, DFS/BFS component count, return n − components.
- Why it works: a component is exactly a set you can strip down to one stone by always removing a stone that still has a mate.
- Java code:

```java
class RemoveStones {
    public int bruteRemove(int[][] stones) {
        int n = stones.length;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (stones[i][0] == stones[j][0] || stones[i][1] == stones[j][1]) {
                    adj.get(i).add(j);
                    adj.get(j).add(i);
                }
            }
        }
        boolean[] vis = new boolean[n];
        int comp = 0;
        for (int i = 0; i < n; i++) {
            if (vis[i]) continue;
            comp++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.offer(i);
            vis[i] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) if (!vis[v]) {
                    vis[v] = true;
                    q.offer(v);
                }
            }
        }
        return n - comp;
    }
}
```

- **Time Complexity Calculation:** O(n²) to build edges, O(n²) BFS on a graph that can be dense (all stones on one row). n=1000 → 10^6, acceptable, not the intended peak.
- **Space Complexity Calculation:** O(n²) adj in the worst case.
- **Why can this be improved?** Pairwise comparison is the cost. Sentinels turn "same row" into "everyone in this row is unioned to the same row-node", O(n) unions.

### Optimal Approach
The structure being exploited is an **implicit undirected graph** whose vertices are stones and whose edges are "share a row or a column"; sentinels compress that graph.

**Core Observation**
A row is a clique. A column is a clique. Connecting a stone is connecting its row-clique to its col-clique. DSU nodes = rows ∪ columns. One union per stone. The number of DSU components among sentinels that actually appear equals the number of stone-components.

**Pattern Identification**
Attribute DSU: union on shared keys rather than on vertex ids. Same idea as §47 (union accounts that share an email).

**Step-by-Step Intuition**
1. Offset columns by 10001 so row 0 and col 0 are different nodes.
2. For each stone `[x,y]`, `ds.union(x, y + OFFSET)` and mark both sentinels used. *Invariant: two stones are in the same stone-component iff their row/col sentinels share a DSU root.*
3. `components = number of distinct find(u) over used sentinels`.
4. Answer `stones.length - components`. A lonely stone still unions its row to its col, producing **one** used-component of two sentinels, so it contributes 1−1=0 removals.

**Dry Run**
Stones `(0,0),(0,1),(1,0)`. OFFSET=10001. Sentinels: rows 0,1 cols 10001,10002.

| Step | Stone | union | used sentinels | roots |
| --- | --- | --- | --- | --- |
| 1 | (0,0) | 0 ↔ 10001 | {0,10001} | one |
| 2 | (0,1) | 0 ↔ 10002 | {0,10001,10002} | 10002 joins 0's set, still one |
| 3 | (1,0) | 1 ↔ 10001 | {0,1,10001,10002} | 1 joins via 10001, still one |

components = 1, n = 3, answer **2**. Matches "one row-clique plus one extra stone on col 0".

**Why Does It Work?**
Transitivity of "share a sentinel": stone A shares row x with stone B, stone B shares col y with stone C ⇒ A,B,C are one DSU component, and in the original rule you can remove them down to one stone by walking those shared rows/cols. Distinct sentinel-components have no shared row *and* no shared col, so no removal can cross them. Leaving one stone per component is forced.

**Java Code**
use DisjointSet from §43.

```java
class RemoveStones {
    public int removeStones(int[][] stones) {
        final int OFFSET = 10001;
        DisjointSet ds = new DisjointSet(2 * OFFSET);
        boolean[] used = new boolean[2 * OFFSET];
        for (int[] s : stones) {
            int row = s[0];
            int col = s[1] + OFFSET;
            ds.union(row, col);
            used[row] = true;
            used[col] = true;
        }
        int components = 0;
        for (int i = 0; i < used.length; i++) {
            if (used[i] && ds.find(i) == i) components++;
        }
        return stones.length - components;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** O(n α(C) + C) with C = 2·10001. Linear in n plus a scan of the sentinel array. For n=1000 this is trivial. (If coordinates were up to 10^9 you would HashMap the used sentinels instead of allocating 2e4.)
- **Space Complexity Calculation:** O(C) DSU + used flags. Independent of n except for the input array.

### Pattern to Remember
```text
Clue: remove an object if it shares an attribute with another; max removals
Pattern: DSU on the attributes (row/col sentinels); answer = n - components
Mental model: each component donates exactly one stone you cannot remove
```
**Similar problems:** 47 Accounts Merge (union on a shared key), 4 Number of Provinces, 49 Making a Large Island (component sizes, not counts).
**Interview tip:** If you code O(n²) DSU on stones they will accept it at n=1000. Then offer the sentinel version unprompted — that is the signal you have seen G-53.

## 47. Accounts Merge

### Problem Understanding
`accounts[i] = [name, email1, email2, …]`. Two accounts belong to the same person if they share at least one email (possibly through a chain of accounts). Merge those accounts: one record per person, name plus the sorted union of emails. Names of accounts that do not share an email stay separate even if the name string is equal ("John" is a common name).

**Input / Output / Constraints**
- Input: list of accounts, 1 ≤ accounts ≤ 1000, 1–10 emails each, emails length ≤ 30.
- Output: `List<List<String>>` — each inner list is `[name, ...sorted emails]`. Order of records does not matter.
- 0-index over account ids.

**Observations**
- The merge relation is connectivity on **account indices**, with emails as bridges. DSU of size `accounts.size()`.
- `Map<String, Integer> emailToId`: first time you see an email, record the account index; next time, `union(previous, current)`.
- After all unions, group emails by `find(accountId)`. Sort each group. Prepend the name from *any* account of that root — they are the same person, so the names match. (If a buggy input mixed names on a shared email, the problem still tells you to use one of them; LeetCode guarantees they match.)
- Do not DSU on names. Two Marys with disjoint emails are two records.

**Example**
```text
[["John","johnsmith@mail.com","john_newyork@mail.com"],
 ["John","johnsmith@mail.com","john00@mail.com"],
 ["Mary","mary@mail.com"],
 ["John","johnnybravo@mail.com"]]
```
Accounts 0 and 1 share `johnsmith@mail.com` → merge. Mary alone. johnnybravo alone.

Output (emails sorted):
```text
["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"]
["Mary","mary@mail.com"]
["John","johnnybravo@mail.com"]
```

Second example: two accounts, same name, no shared email → two output records. The name is not a key.

### How to Think About the Problem
- What should I notice first? Emails are unique identifiers of a *person-fragment*. Names are labels, not keys.
- Which representation? DSU on account indices. HashMap email → account id.
- Counting / searching / ordering / minimizing → which mental model? Connected components, then gather + sort.
- Which traversal is natural? DSU. Building an email-graph and DFS also works; DSU is cleaner because the input is already "account = bag of emails".
- **Clue → Pattern:** *merge records that share a key, output grouped keys → DSU on record ids + map from key to first id.*

### Intuition (Brute → Better → Optimal)
```text
Brute: for every pair of accounts, if email sets intersect,
merge (list union). Repeat to a fixpoint. O(A² · emails)
        ↓
Observation: transitivity = DSU. An email is an edge
between the first account that owned it and the current one.
        ↓
Optimal: one pass over all emails, then group by root, sort.
O(E log E) dominated by sorting emails per component
```

### Brute Force Approach
- Basic idea: treat accounts as sets of emails. Repeatedly merge any two intersecting sets. Slow because every pair is compared and sets keep growing.
- Why it works: intersection-graph connectivity is exactly the merge relation.
- Java code:

```java
class AccountsMerge {
    List<List<String>> brute(List<List<String>> accounts) {
        int n = accounts.size();
        DisjointSet ds = new DisjointSet(n);
        for (int i = 0; i < n; i++) {
            HashSet<String> a = new HashSet<>(accounts.get(i).subList(1, accounts.get(i).size()));
            for (int j = i + 1; j < n; j++) {
                for (int k = 1; k < accounts.get(j).size(); k++) {
                    if (a.contains(accounts.get(j).get(k))) {
                        ds.union(i, j);
                        break;
                    }
                }
            }
        }
        return gather(accounts, ds);
    }

    private List<List<String>> gather(List<List<String>> accounts, DisjointSet ds) {
        Map<Integer, TreeSet<String>> emails = new HashMap<>();
        for (int i = 0; i < accounts.size(); i++) {
            int r = ds.find(i);
            emails.computeIfAbsent(r, k -> new TreeSet<>());
            for (int j = 1; j < accounts.get(i).size(); j++) {
                emails.get(r).add(accounts.get(i).get(j));
            }
        }
        List<List<String>> ans = new ArrayList<>();
        for (var e : emails.entrySet()) {
            List<String> rec = new ArrayList<>();
            rec.add(accounts.get(e.getKey()).get(0));
            rec.addAll(e.getValue());
            ans.add(rec);
        }
        return ans;
    }
}
```

- **Time Complexity Calculation:** O(A² · K) for pairwise membership, K ≤ 10. Plus gathering.
- **Space Complexity Calculation:** O(total emails).
- **Why can this be improved?** You do not need pairwise account comparison. Each email is a hub: union every account that contains it, in one map lookup per email occurrence.

### Optimal Approach
The structure being exploited is an **undirected bipartite graph** of accounts and emails; DSU projects it onto account vertices.

**Core Observation**
The first account that sees an email becomes that email's owner. Every later account containing the same email is `union`ed with the owner. Chains of shared emails collapse to one root.

**Pattern Identification**
Index-DSU + hashmap from item → first index. Same skeleton as "merge stones that share a row" without the sentinel trick.

**Step-by-Step Intuition**
1. `DisjointSet ds = new DisjointSet(n)` over account indices. *Invariant: if two accounts share an email, directly or by a chain, they have the same root.*
2. For account i, for each email: if unseen, `emailToId.put(email, i)`; else `ds.union(emailToId.get(email), i)`.
3. Walk `emailToId`. Place each email into a list keyed by `ds.find(accountId)`.
4. Sort each list, prepend `accounts[root].get(0)`.

**Dry Run**
Four accounts of the example. Email map grows as follows.

| Account | Email | Map before | Action | DSU |
| --- | --- | --- | --- | --- |
| 0 | johnsmith | empty | bind → 0 | 0,1,2,3 |
| 0 | john_newyork | | bind → 0 | |
| 1 | johnsmith | → 0 | union(0,1) | {0,1}, 2, 3 |
| 1 | john00 | | bind → 1 | |
| 2 | mary | | bind → 2 | |
| 3 | johnnybravo | | bind → 3 | |

Gather by root: root 0 gets johnsmith, john_newyork, john00 (via find(1)=0). Root 2: mary. Root 3: johnnybravo. Sort, prepend "John"/"Mary"/"John".

**Why Does It Work?**
An email is an edge between accounts. Union-find computes the connected components of that graph. Emails of a component are exactly the emails that appeared in any account of the component, and sorting them is the required output format. Names never enter the DSU, so equal names without a shared email stay apart.

**Java Code**
use DisjointSet from §43.

```java
class AccountsMerge {
    public List<List<String>> accountsMerge(List<List<String>> accounts) {
        int n = accounts.size();
        DisjointSet ds = new DisjointSet(n);
        Map<String, Integer> emailToId = new HashMap<>();
        for (int i = 0; i < n; i++) {
            List<String> acc = accounts.get(i);
            for (int j = 1; j < acc.size(); j++) {
                String email = acc.get(j);
                Integer prev = emailToId.get(email);
                if (prev == null) emailToId.put(email, i);
                else ds.union(prev, i);
            }
        }
        Map<Integer, List<String>> rootEmails = new HashMap<>();
        for (var e : emailToId.entrySet()) {
            int r = ds.find(e.getValue());
            rootEmails.computeIfAbsent(r, k -> new ArrayList<>()).add(e.getKey());
        }
        List<List<String>> ans = new ArrayList<>();
        for (var e : rootEmails.entrySet()) {
            List<String> emails = e.getValue();
            Collections.sort(emails);
            List<String> rec = new ArrayList<>();
            rec.add(accounts.get(e.getKey()).get(0));
            rec.addAll(emails);
            ans.add(rec);
        }
        return ans;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** O(N α(A) + M log M) where N is total email occurrences, A is number of accounts, M is distinct emails (the sort). HashMap operations expected O(1) per email.
- **Space Complexity Calculation:** O(N) for the map, the grouped lists, and O(A) DSU.

### Pattern to Remember
```text
Clue: merge records that share a key (email), output grouped sorted keys
Pattern: DSU on record indices + map key → first index, then gather by root
Mental model: emails are edges; accounts are vertices; names are labels only
```
**Similar problems:** 46 Stones (union on a shared attribute), 4 Number of Provinces, 45 Network Connected.
**Interview tip:** The bug they wait for is merging two "John"s that do not share an email. Say out loud "name is not a DSU key" before you write the map.

## 48. Number of Islands II

### Problem Understanding
An n × m grid starts as water. `positions[k] = [r, c]` turns that cell into land, in order. After each add, report how many islands (4-connected land components) exist. Online queries: you cannot afford to rescan the grid.

**Input / Output / Constraints**
- Input: n, m, `positions` (0-index). A position may be added twice; the second add must not change the count.
- Output: list of island counts, one per add.
- Constraints (LeetCode 305): n, m, Q ≤ 10^4, so n·m can be 10^8. Teaching version uses an array DSU of size n·m; if memory is tight, switch to a HashMap DSU of size O(Q).
- `id = r * m + c`.

**Observations**
- Adding a land cell creates a new island (`count++`), then unions with already-land 4-neighbours. Each successful union means two islands became one (`count--`).
- `union` returning false (already same island, or not land) must **not** decrement. Two neighbours can belong to the same island (U-shape); a HashSet of neighbour roots, or the boolean from union, both protect you.
- Recomputing BFS from scratch after every add is O(Q · n · m) — 10^12 at the upper constraint. That is the naive idea that fails.
- Duplicate add of a cell that is already land: skip, append the current count.

**Example**
n=3, m=3, positions=`[[0,0],[0,1],[1,2],[2,1]]`
```text
add (0,0):  1 . .      count=1
            . . .
            . . .

add (0,1):  1 1 .      neighbour (0,0) land, union, count=1
            . . .
            . . .

add (1,2):  1 1 .      no land neighbour, count=2
            . . 1
            . . .

add (2,1):  1 1 .      no land neighbour, count=3
            . . 1
            . 1 .
```
Output `[1,1,2,3]`.

Second example (U-merge and duplicate): positions `(0,0),(1,0),(1,1),(0,1),(0,1)`. Counts: 1, 1, 1, 1 (the last add closes a 4-cycle, already one island), then 1 again (duplicate).

### How to Think About the Problem
- What should I notice first? The grid is **dynamic**. Islands merge; they never split. That is exactly DSU's one-way merge.
- Which representation? 1D id `r*m+c`. Boolean `land[id]`. DSU of n·m (or of seen cells).
- Counting / searching / ordering / minimizing → which mental model? Online component count. `count += 1` on insert, `count -= 1` on merge.
- Which traversal is natural? 4-neighbour check, not a full BFS.
- **Clue → Pattern:** *online "add a vertex, union with live neighbours, report component count" → incremental DSU.*

### Intuition (Brute → Better → Optimal)
```text
Brute: after each add, BFS/DFS the whole grid. O(Q N), N=n*m
        ↓
Observation: one add touches 1 cell and ≤4 neighbours.
Only those can change connectivity.
        ↓
Optimal: DSU, count += 1; count -= 1 per successful neighbour union.
O(Q α(N))
```

### Brute Force Approach
- Basic idea: keep a `grid[n][m]`. After writing a 1, run a full Number-of-Islands BFS (§5) and append that count.
- Why it works: it answers the definition after every prefix of `positions`.
- Java code:

```java
class NumberOfIslandsII {
    public List<Integer> brute(int n, int m, int[][] positions) {
        int[][] grid = new int[n][m];
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        List<Integer> ans = new ArrayList<>();
        for (int[] p : positions) {
            grid[p[0]][p[1]] = 1;
            ans.add(countIslands(grid, n, m, dirs));
        }
        return ans;
    }

    private int countIslands(int[][] grid, int n, int m, int[][] dirs) {
        boolean[][] vis = new boolean[n][m];
        int count = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 0 || vis[r][c]) continue;
                count++;
                ArrayDeque<int[]> q = new ArrayDeque<>();
                q.offer(new int[]{r, c});
                vis[r][c] = true;
                while (!q.isEmpty()) {
                    int[] cur = q.poll();
                    for (int[] d : dirs) {
                        int nr = cur[0] + d[0], nc = cur[1] + d[1];
                        boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                        if (in && grid[nr][nc] == 1 && !vis[nr][nc]) {
                            vis[nr][nc] = true;
                            q.offer(new int[]{nr, nc});
                        }
                    }
                }
            }
        }
        return count;
    }
}
```

- **Time Complexity Calculation:** Q queries, each a full grid BFS. Vertices N = n·m, edges ≈ 4N. Total O(Q N). At n=m=Q=10^4 this is 10^12.
- **Space Complexity Calculation:** O(N) grid + vis.
- **Why can this be improved?** Past land cells that are far from the new cell cannot change this query's connectivity. Only the new cell and its 4-neighbours matter.

### Optimal Approach
The structure being exploited is a **grid graph whose vertex set grows over time**; DSU maintains 4-connectivity of the land subset.

**Core Observation**
Inserting a vertex into a graph of components increases the component count by 1, then each edge to an already-present neighbour of a *different* component decreases it by 1. DSU's boolean `union` is that "different component" test.

**Pattern Identification**
Online connectivity on a grid. Same DSU as Kruskal, but edges appear as 4-neighbour relations the moment both ends are land.

**Step-by-Step Intuition**
1. `id = r * m + c`. `land[id]` starts false. `islands = 0`. *Invariant: `islands` equals the number of DSU components among cells with `land == true`.*
2. On add of an already-land cell: append `islands`, continue.
3. Mark land, `islands++`.
4. For each 4-neighbour in bounds and land: `if (ds.union(id, nid)) islands--`.
5. Append `islands`.

**Dry Run**
n=3, m=3. ids: (r,c) → 3r+c.

| Step | Cell | id | land neighbours | unions that fire | islands |
| --- | --- | --- | --- | --- | --- |
| 1 | (0,0) | 0 | none | — | 0→1 → **1** |
| 2 | (0,1) | 1 | id 0 | 1↔0 yes | 1→2→1 → **1** |
| 3 | (1,2) | 5 | none (1,1)(0,2)(2,2)(1,3) water/OOB | — | 1→2 → **2** |
| 4 | (2,1) | 7 | none | — | 2→3 → **3** |

U-shape merge (second example), last real add (0,1) with both (0,0) and (1,1) already in the same component: first neighbour union succeeds (or not, depending on earlier merges), second `union` returns false, `islands` drops by 1 total, not 2.

**Why Does It Work?**
The invariant holds at empty grid (0 islands). An add of a new cell is the only time a component can appear; a successful union is the only time two land-components can become one. Duplicates do not insert a vertex. 4-connectivity matches the island definition. You never need a global rescan.

**Java Code**
use DisjointSet from §43.

```java
class NumberOfIslandsII {
    public List<Integer> numIslands2(int n, int m, int[][] positions) {
        DisjointSet ds = new DisjointSet(n * m);
        boolean[] land = new boolean[n * m];
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        List<Integer> ans = new ArrayList<>();
        int islands = 0;
        for (int[] p : positions) {
            int r = p[0], c = p[1];
            int id = r * m + c;
            if (land[id]) {                     // duplicate add
                ans.add(islands);
                continue;
            }
            land[id] = true;
            islands++;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (!in) continue;
                int nid = nr * m + nc;
                if (land[nid] && ds.union(id, nid)) islands--;
            }
            ans.add(islands);
        }
        return ans;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** Q adds, 4 neighbour checks, each DSU op α(N), N = n·m. Total O(Q α(N)). Independent of scanning the grid.
- **Space Complexity Calculation:** O(N) for DSU + land. If N = 10^8 and Q = 10^4, allocate DSU only for seen ids via HashMap (same union logic).

### Pattern to Remember
```text
Clue: add land cells one by one, report island count after each
Pattern: incremental DSU; count += 1 on add, -= 1 on each successful union
Mental model: islands merge, they never split — DSU's direction of time
```
**Similar problems:** 5 Number of Islands (offline version of the same count), 49 Making a Large Island, 45 Network Connected (component arithmetic).
**Interview tip:** Mention the duplicate-add case and the U-shape double-neighbour before you write the loop. Both are the tests that break `islands--` without a `union` boolean.

## 49. Making a Large Island

### Problem Understanding
An n × n grid of 0s (water) and 1s (land). You may flip **at most one** 0 into 1. Return the size of the largest island you can obtain. 4-connected. If the grid is already all 1s, return n² (the "flip nothing" case).

**Input / Output / Constraints**
- Input: `grid[n][n]`, n ≤ 500, so N = n² ≤ 250000.
- Output: max island size after at most one flip.
- 0-index.

**Observations**
- Flipping a 1 is illegal (you flip a 0, or you flip nothing).
- Two-phase: (1) label every existing island with a DSU root and know its size; (2) for each 0, look at 4-neighbours, **sum sizes of DISTINCT neighbour roots**, add 1 for the flipped cell.
- The bug: a 0 in a corner of one island touches that island twice. Summing without a `HashSet<Integer>` of roots double-counts. `seen.add(root)` is the whole trick.
- Also take `max` over already-existing island sizes, in case the best move is to flip nothing (grid has no 0, or every 0 sits next to tiny islands).

**Example**
```text
grid = [[1,0],
        [0,1]]
```
Two islands of size 1. Flip either 0: it touches both islands → 1+1+1 = 3. Answer **3**.

Second example:
```text
grid = [[1,1],[1,0]]
```
One island of size 3. Flip (1,1) → 4. Answer **4**.

Third (the double-count trap):
```text
1 1 0
1 0 0
0 0 0
```
The 0 at (1,1) touches the same island twice (up and left). Distinct roots: one island of size 3, plus 1 → 4, not 3+3+1=7.

### How to Think About the Problem
- What should I notice first? You get **one** flip. Brute "flip each 0 and flood-fill" is O(n⁴) at n=500 → 6.25·10^10.
- Which representation? Grid as a graph, id `r*n+c`. DSU or a `id[][]` painted by DFS, plus `size[id]`.
- Counting / searching / ordering / minimizing → which mental model? Precompute component sizes, then a local 4-neighbour query per 0.
- Which traversal is natural? Union adjacent 1s first (DSU or DFS). Then a constant-time look around each 0.
- **Clue → Pattern:** *flip at most one 0, max 4-connected size → label islands, sum DISTINCT neighbour sizes + 1.*

### Intuition (Brute → Better → Optimal)
```text
Brute: for each 0, copy the grid, flip, DFS the new island. O(n^4)
        ↓
Observation: the new island = {the 0} ∪ neighbouring islands.
Those islands already exist. Precompute their sizes.
        ↓
Optimal: DSU/DFS label + HashSet of neighbour roots. O(n²)
```

### Brute Force Approach
- Basic idea: for every 0, flip it, run a full flood-fill for the island containing that cell, unflip, track max. Also track the max island without a flip.
- Why it works: there are only n² candidate flips and the definition is the flood-fill size.
- Java code:

```java
class LargestIsland {
    public int brute(int[][] grid) {
        int n = grid.length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        int max = 0;
        boolean hasZero = false;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) continue;
                hasZero = true;
                grid[r][c] = 1;
                max = Math.max(max, dfs(grid, r, c, new boolean[n][n], dirs));
                grid[r][c] = 0;
            }
        }
        if (!hasZero) return n * n;
        return max;
    }

    private int dfs(int[][] grid, int r, int c, boolean[][] vis, int[][] dirs) {
        int n = grid.length;
        vis[r][c] = true;
        int size = 1;
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
            if (in && grid[nr][nc] == 1 && !vis[nr][nc]) {
                size += dfs(grid, nr, nc, vis, dirs);
            }
        }
        return size;
    }
}
```

- **Time Complexity Calculation:** Up to n² zeros, each DFS O(n²) → O(n⁴). n=500 is impossible.
- **Space Complexity Calculation:** O(n²) vis per DFS (can reuse), plus recursion O(n²).
- **Why can this be improved?** Every DFS re-walks islands that never changed. Label once.

### Optimal Approach
The structure being exploited is a **grid of static land components plus one optional extra vertex**; the extra vertex's value is 1 + the sum of distinct neighbouring component sizes.

**Core Observation**
After DSU-unions of adjacent 1s, `sizeOf(root)` is the island size. A 0's best flip is determined entirely by the set of roots among its land-neighbours. The HashSet is mandatory.

**Pattern Identification**
Two-phase grid DSU: paint, then query around zeros. Same "distinct neighbour ids" idea you will reuse on any "connect existing components with one extra cell" problem.

**Step-by-Step Intuition**
1. Union every 1 with its right/down (or all 4) land neighbours. *Invariant: two land cells are 4-connected iff they share a DSU root; `sizeOf(root)` is the island size.*
2. `max = max sizeOf` over all land cells (the no-flip answer).
3. For each 0: `HashSet<Integer> seen`, `sum = 1`. For each in-bounds land neighbour, `if (seen.add(root)) sum += sizeOf(root)`.
4. `max = max(max, sum)`.

**Dry Run**
```text
1 0
0 1
```
ids 0=(0,0), 1=(0,1), 2=(1,0), 3=(1,1). No two 1s are adjacent, so two components of size 1.

| Cell | neighbours (id, root, size) | seen roots | sum |
| --- | --- | --- | --- |
| (0,1) id=1 | up none; down (3,3,1); left (0,0,1); right none | {3, 0} | 1+1+1=3 |
| (1,0) id=2 | up (0,0,1); down none; left none; right (3,3,1) | {0, 3} | 3 |

No-flip max=1. Answer **3**.

Trap grid `[[1,1,0],[1,0,0],[0,0,0]]`: island root of the three 1s has size 3. Cell (1,1) sees that root twice; HashSet keeps sum = 1+3 = 4.

**Why Does It Work?**
Flipping a 0 cannot join islands that do not touch it. The islands that do touch it are exactly the distinct neighbouring roots. Adding their sizes plus one counts every cell of the new island once. The no-flip candidate covers an already-maximum island and the all-1s grid.

**Java Code**
use DisjointSet from §43.

```java
class LargestIsland {
    public int largestIsland(int[][] grid) {
        int n = grid.length;
        DisjointSet ds = new DisjointSet(n * n);
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 0) continue;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
                    if (in && grid[nr][nc] == 1) {
                        ds.union(r * n + c, nr * n + nc);
                    }
                }
            }
        }

        int max = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) max = Math.max(max, ds.sizeOf(r * n + c));
            }
        }

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) continue;
                HashSet<Integer> seen = new HashSet<>();
                int sum = 1;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
                    if (!in || grid[nr][nc] == 0) continue;
                    int root = ds.find(nr * n + nc);
                    if (seen.add(root)) sum += ds.sizeOf(root);
                }
                max = Math.max(max, sum);
            }
        }
        return max;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** N = n² vertices, E ≈ 4N grid edges. DSU unions O(N α(N)). Second pass visits each cell's 4 neighbours, HashSet of at most 4 ints. Total O(N) = O(n²). n=500 is ~2.5·10^5.
- **Space Complexity Calculation:** O(N) DSU. HashSet is O(1) per 0 (≤4 roots).

### Pattern to Remember
```text
Clue: flip at most one 0, maximize the 4-connected island
Pattern: label islands (DSU/DFS) + for each 0 sum DISTINCT neighbour sizes + 1
Mental model: one extra vertex joining ≤4 existing components; HashSet the roots
```
**Similar problems:** 5 Number of Islands, 48 Islands II (dynamic count vs static sizes), 46 Stones (n − components, here you want sizes).
**Interview tip:** Write `if (seen.add(root)) sum += size` on the first draft. Then mention the all-1s / no-flip max. Those two lines are the offer/reject.

## 50. Swim in Rising Water

### Problem Understanding
An n × n grid of heights. At time t the water level is t, and you may step between 4-adjacent cells only if **both** cells have height ≤ t. You start at (0,0) and want (n−1,n−1). Movement itself is free (infinite swim speed). Return the least t at which a path exists.

This is "minimize the maximum height on the path" — the same cost as problem 33 (Path with Minimum Effort), except here the cost of a path is the max *cell* height on it, not the max *edge difference*.

**Input / Output / Constraints**
- Input: `grid[n][n]`, 1 ≤ n ≤ 50, heights unique in `[0, n²)`.
- Output: minimum t.
- t is at least `max(grid[0][0], grid[n-1][n-1])` — you wait for the start cell and the end cell to be underwater regardless of the path.
- 0-index.

**Observations**
- t works iff in the subgraph of cells with `height ≤ t`, (0,0) is connected to (n−1,n−1).
- Three equivalent algorithms:
  1. **Dijkstra on max-so-far** (primary): PQ key = `max(t_so_far, grid[nr][nc])`. First time you pop the end, that key is the answer. Minimize the maximum.
  2. **Binary search t + BFS**: t in `[lo, n²-1]`, `lo = max(grid[0][0], grid[n-1][n-1])`. Check connectivity among cells ≤ mid.
  3. **DSU**: sort all cells by height, activate them in that order, union with already-active 4-neighbours, stop when `find(0) == find(n*n-1)`. The height of the cell that caused the connection is t.
- Dijkstra and the DSU scan are both O(N log N). Binary search is O(N log H) with H ≤ n².

**Example**
```text
grid = [[0,2],
        [1,3]]
```
Path 0→1→3 has max 3. Path 0→2→3 has max 3. You also need t ≥ 3 to enter the end cell. Answer **3**.

Second example (the "border walk"):
```text
 0  1  2  3  4
24 23 22 21  5
12 13 14 15 16
11 17 18 19 20
10  9  8  7  6
```
Walk 0-1-2-3-4-5-6. Max on that path is 6. Any path through the 24-side is worse. Answer **6**.

### How to Think About the Problem
- What should I notice first? Time t is a **threshold on cells**, not a step counter. You wait, then the whole path is available at once.
- Which representation? Grid graph, N = n² vertices, E ≈ 4N.
- Counting / searching / ordering / minimizing → which mental model? Minimize the maximum. Three templates: modified Dijkstra, binary search on t + BFS, Kruskal-like DSU on sorted cells.
- Which traversal is natural? Best-first on the running max (Dijkstra), or BFS inside a guessed t, or union in height order.
- **Clue → Pattern:** *least t such that cells ≤ t connect start to end → min-max path = problem 33's cost, three solvers.*

### Intuition (Brute → Better → Optimal)
```text
Brute: enumerate all simple paths, take min over paths of
max-cell-on-path. Exponential.
        ↓
Observation: t is monotonic — if t works, t+1 works.
Binary search t + BFS on cells ≤ t. O(N log H)
        ↓
Optimal A: Dijkstra, key = max(path max, next cell).
Optimal B: DSU, activate cells by increasing height until
start meets end. Same answer, Kruskal's clothing.
```

### Brute Force Approach
- Basic idea: DFS every simple path from (0,0) to (n−1,n−1), track the max cell on the current path, keep the min of those maxima.
- Why it works: the definition. n=50 makes it fantasy.
- Java code:

```java
class SwimInRisingWater {
    int best;

    int brute(int[][] grid) {
        int n = grid.length;
        best = n * n;
        boolean[][] vis = new boolean[n][n];
        dfs(grid, 0, 0, grid[0][0], vis);
        return best;
    }

    private void dfs(int[][] grid, int r, int c, int maxOnPath, boolean[][] vis) {
        int n = grid.length;
        if (r == n - 1 && c == n - 1) {
            best = Math.min(best, maxOnPath);
            return;
        }
        vis[r][c] = true;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
            if (!in || vis[nr][nc]) continue;
            int next = Math.max(maxOnPath, grid[nr][nc]);
            if (next >= best) continue;          // branch-and-bound, still exponential
            dfs(grid, nr, nc, next, vis);
        }
        vis[r][c] = false;
    }
}
```

- **Time Complexity Calculation:** O(4^{N}) simple paths in the worst case, N=n². Branch-and-bound prunes; it does not save you at n=50.
- **Space Complexity Calculation:** O(N) recursion + vis.
- **Why can this be improved?** You do not need the path, only the min possible bottleneck. Dijkstra / binary search / DSU each compute the bottleneck without listing paths.

### Optimal Approach
The structure being exploited is an **undirected grid with a min-max path cost** (threshold connectivity). Same family as §33.

**Core Observation**
The least feasible t is the minimum, over paths P from start to end, of `max_{cells on P} grid[cell]`. Dijkstra with key `max(key[u], grid[v])` pops vertices in increasing bottleneck order; the first pop of the end is optimal (non-negative keys, the key only grows). Equivalently, cells sorted by height are Kruskal's edge set against a "cell becomes available" event.

**Pattern Identification**
Minimize-the-maximum. Pick one of:
- Dijkstra (primary, matches §30's skeleton, key changed).
- Binary search + BFS (matches §33's usual write-up).
- DSU on sorted cells (matches §44: "add in order, stop when connected").

**Step-by-Step Intuition**
1. **Dijkstra.** PQ of `[t, r, c]`, vis on push. Push neighbour with `nt = max(t, grid[nr][nc])`. *Invariant: the first time a cell is pushed, t is the least bottleneck from the start to that cell* (true here because `max` is monotone: a later neighbour has a larger or equal popped key, so it cannot improve this cell). vis-on-pop is the safe default if you ever swap `max` for `+`.
2. **Binary search.** `lo = max(grid[0][0], grid[n-1][n-1])`, `hi = n*n-1`. Mid works iff BFS/DFS stays on cells `≤ mid` and reaches the end.
3. **DSU.** Create a list of all cells sorted by height. Activate in that order: mark land, union 4-neighbours already active. When `ds.connected(0, n*n-1)`, return that cell's height. The connecting cell is the bottleneck.

**Dry Run**
`[[0,2],[1,3]]`. ids 0,1,2,3 with heights 0,2,1,3.

Dijkstra:

| Step | Pop (t,r,c) | vis | Push |
| --- | --- | --- | --- |
| seed | (0,0,0) | (0,0) | (max(0,2),0,1)=(2,0,1); (max(0,1),1,0)=(1,1,0) |
| 1 | (1,1,0) | + (1,0) | (max(1,3),1,1)=(3,1,1) |
| 2 | (2,0,1) | + (0,1) | (max(2,3),1,1)=(3,1,1) duplicate |
| 3 | (3,1,1) | end | return **3** |

DSU (cells in height order 0,1,2,3):

| Activate | Cell | Unions with active neighbours | start↔end? |
| --- | --- | --- | --- |
| h=0 | (0,0) | none | no |
| h=1 | (1,0) | up (0,0) yes | no |
| h=2 | (0,1) | left (0,0) yes | no (end still inactive) |
| h=3 | (1,1) | left (1,0), up (0,1) | **yes**, return 3 |

Binary search on this 2×2: `lo = max(0, 3) = 3`, `hi = 3`, only t=3 is feasible. On the 5×5 example, `lo = max(0, 6) = 6` because the end cell has height 6; t=5 is not feasible — you cannot stand on a cell of height 6 until t=6.

**Why Does It Work?**
Bottleneck keys are monotone along a path, so Dijkstra's greedy pop is correct for min-max (the same proof as Dijkstra, with `+` replaced by `max`). Binary search is correct because feasibility of t is monotonic. DSU is Kruskal on the complete timeline of cells: the moment start and end share a parent, every cell on some connecting path has been activated, and the last (highest) of them is the min possible such highest — i.e. the MST bottleneck between start and end on the grid graph with node weights. (On graphs, the min-max path between two vertices is the max edge on the unique MST path. Same theorem.)

**Java Code**
use DisjointSet from §43. Primary solver is Dijkstra; the other two follow.

```java
class SwimInRisingWater {
    public int swimInWater(int[][] grid) {
        int n = grid.length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        boolean[][] vis = new boolean[n][n];
        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
        pq.offer(new int[]{grid[0][0], 0, 0});     // t, r, c
        vis[0][0] = true;
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int t = cur[0], r = cur[1], c = cur[2];
            if (r == n - 1 && c == n - 1) return t;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
                if (!in || vis[nr][nc]) continue;
                vis[nr][nc] = true;
                pq.offer(new int[]{Math.max(t, grid[nr][nc]), nr, nc});
            }
        }
        return -1;
    }

    int swimBinarySearch(int[][] grid) {
        int n = grid.length;
        int lo = Math.max(grid[0][0], grid[n - 1][n - 1]);
        int hi = n * n - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (reachable(grid, mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    private boolean reachable(int[][] grid, int t) {
        int n = grid.length;
        if (grid[0][0] > t) return false;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        boolean[][] vis = new boolean[n][n];
        ArrayDeque<int[]> q = new ArrayDeque<>();
        q.offer(new int[]{0, 0});
        vis[0][0] = true;
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            if (cur[0] == n - 1 && cur[1] == n - 1) return true;
            for (int[] d : dirs) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
                if (in && !vis[nr][nc] && grid[nr][nc] <= t) {
                    vis[nr][nc] = true;
                    q.offer(new int[]{nr, nc});
                }
            }
        }
        return false;
    }

    int swimDsu(int[][] grid) {
        int n = grid.length;
        int N = n * n;
        int[][] cells = new int[N][3];          // h, r, c
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                cells[r * n + c] = new int[]{grid[r][c], r, c};
            }
        }
        Arrays.sort(cells, Comparator.comparingInt(a -> a[0]));
        DisjointSet ds = new DisjointSet(N);
        boolean[] on = new boolean[N];
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] cell : cells) {
            int h = cell[0], r = cell[1], c = cell[2];
            int id = r * n + c;
            on[id] = true;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < n;
                if (in && on[nr * n + nc]) ds.union(id, nr * n + nc);
            }
            if (on[0] && on[N - 1] && ds.connected(0, N - 1)) return h;
        }
        return -1;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** N = n², E ≈ 4N. Dijkstra: each vertex pushed once (vis on push) → O(N log N). Binary search: O(log H) BFS passes, H ≤ N, each O(N) → O(N log N). DSU: sort cells O(N log N) + O(N α(N)) unions. All three are O(N log N) = O(n² log n). n ≤ 50 is tiny; the log is not the story, the pattern is.
- **Space Complexity Calculation:** O(N) for vis / PQ / DSU / BFS queue.

### Pattern to Remember
```text
Clue: least t such that a path exists using only cells (or edges) ≤ t
Pattern: minimize-the-maximum — Dijkstra on running max, or BS+BFS, or DSU in sorted order
Mental model: problem 33; MST bottleneck between two vertices; t ≥ max(start, end)
```
**Similar problems:** 33 Path with Minimum Effort (same min-max, edge diffs instead of cell heights), 30 Dijkstra, 44 Kruskal (DSU in weight order), 32 Shortest Path in a Binary Maze (the BFS inside a guessed t).
**Interview tip:** Start with `t >= max(grid[0][0], grid[n-1][n-1])`. Then say "three solvers, I will write Dijkstra on the running max" and put `Math.max(t, grid[nr][nc])` in the PQ offer. That one expression is the problem.
