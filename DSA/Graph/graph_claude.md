# Graphs — 53 Problems Study Guide (Java)

This guide teaches graphs as one shared way of thinking that gets specialized 53 times. Every problem in Striver's A2Z "Graphs" section is really the same four questions asked in different clothes: _is this a graph (and if so, what does a node/edge mean here)? which traversal fits the question being asked? what invariant does that traversal guarantee? and where does the brute-force idea break, forcing the smarter one?_ Read the Foundation once, slowly — it is the vocabulary the rest of the guide assumes. Then read the 53 problems in order; later ones deliberately reuse code and reasoning from earlier ones instead of re-deriving it, exactly the way you should think in an interview.

Every problem follows the same seven-step shape: **Problem Understanding → How to Think About the Problem → Intuition (Brute → Better → Optimal) → Brute Force Approach → Optimal Approach (Core Observation, Pattern Identification, Step-by-Step Intuition, Dry Run, Why Does It Work?, Java Code, Complexity) → Pattern to Remember**. The point of repeating the shape 53 times is that by problem 30 you stop reading the scaffolding and start _predicting_ it — that's the goal.

All code is Java 21, `java.util.*` only, `ArrayDeque` instead of `Stack`, primitive arrays over boxed types wherever the hot path allows it.

---

## 0. The Foundation: Graphs in One Page

### 0.1 Vocabulary

| Term                     | Meaning                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Vertex / node            | An entity. Numbered `0..V-1` unless stated otherwise.                                                                                   |
| Edge                     | A connection between two vertices. `(u, v)` — undirected means `u-v` is usable both ways; directed means only `u -> v`.                 |
| Weighted / unweighted    | Edge carries a cost `w`, or every edge costs `1`.                                                                                       |
| Degree                   | Number of edges touching a vertex. Directed graphs split this into in-degree and out-degree.                                            |
| Cycle                    | A path that starts and ends at the same vertex with no repeated edge.                                                                   |
| Connected / disconnected | Undirected graph where every vertex can reach every other (connected), or not.                                                          |
| Connected component      | A maximal connected chunk of a disconnected graph.                                                                                      |
| DAG                      | Directed Acyclic Graph — directed, no cycles. Only DAGs have a topological order.                                                       |
| Bipartite                | Vertices split into two sets such that every edge crosses between the sets (no edge inside a set). Equivalent to "no odd-length cycle". |
| Self-loop / multi-edge   | An edge from a vertex to itself / more than one edge between the same pair.                                                             |

### 0.2 Representations

| Representation   | Build                                       | Space    | Check edge `(u,v)` | Iterate neighbours of `u` | When to use                                                           |
| ---------------- | ------------------------------------------- | -------- | ------------------ | ------------------------- | --------------------------------------------------------------------- |
| Adjacency matrix | `boolean[V][V]` or `int[V][V]`              | `O(V²)`  | `O(1)`             | `O(V)`                    | Dense graphs, small `V`, need `O(1)` edge lookup (Floyd-Warshall).    |
| Adjacency list   | `List<Integer>[V]` or `List<List<Integer>>` | `O(V+E)` | `O(deg(u))`        | `O(deg(u))`               | Default choice — almost every problem in this guide.                  |
| Edge list        | `int[][] edges` of `{u, v, w}`              | `O(E)`   | `O(E)`             | `O(E)`                    | Kruskal's MST — you need to _sort all edges_, not walk from a vertex. |

Building an adjacency list from `n` vertices and `m` edges:

```java
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
for (int[] e : edges) {
    adj.get(e[0]).add(e[1]);
    adj.get(e[1]).add(e[0]); // omit this line for a directed graph
}
```

Weighted version: store `int[]{neighbour, weight}` per entry, or parallel `List<int[]>[]`.

### 0.3 Grids are graphs

A `char[][]`/`int[][]` grid of size `n x m` is a graph with `n*m` vertices, where cell `(r, c)` is neighbours with up to 4 (or 8) adjacent cells. Two facts make grid problems tractable with the exact same BFS/DFS code as adjacency-list graphs:

- **Directions array.** `int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};` (4-directional) or add the four diagonals for 8-directional. Always bounds-check before use: `0 <= nr < n && 0 <= nc < m`.
- **2D ↔ 1D mapping.** `id = r * cols + c` and back `r = id / cols, c = id % cols`. This matters the moment you need a `visited[]` array sized by a single integer (DSU, BFS distance arrays) instead of a 2D one — same idea, just flattened.

```java
int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
for (int[] d : dirs) {
    int nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
    // process (nr, nc)
}
```

### 0.4 BFS template

BFS visits vertices in increasing order of edge-count from the source, because it processes a queue **level by level** — every vertex at distance `d` is dequeued before any vertex at distance `d+1` is. That single fact is _why_ BFS gives the shortest path in an unweighted graph: the first time you reach a vertex is guaranteed to be via the fewest edges possible.

```java
int[] dist = new int[n];
Arrays.fill(dist, -1);
ArrayDeque<Integer> q = new ArrayDeque<>();
dist[src] = 0;
q.add(src);
while (!q.isEmpty()) {
    int u = q.poll();
    for (int v : adj.get(u)) {
        if (dist[v] == -1) {
            dist[v] = dist[u] + 1;
            q.add(v);
        }
    }
}
```

**Multi-source BFS**: push _every_ source into the queue with `dist = 0` before the loop starts, instead of running BFS once per source. The queue still processes strictly in order of true distance from the _nearest_ source, because all sources start "tied" at level 0. This single trick answers Rotten Oranges, 01 Matrix, and Number of Enclaves.

### 0.5 DFS template

DFS commits to one neighbour, recurses all the way down, then backtracks. It doesn't give shortest paths, but it naturally exposes **tree edges** (edges used to first discover a vertex) and **back edges** (edges to an already-visited ancestor) — and a back edge is exactly what a cycle _is_.

```java
void dfs(int u, boolean[] visited, List<List<Integer>> adj) {
    visited[u] = true;
    for (int v : adj.get(u)) {
        if (!visited[v]) dfs(v, visited, adj);
    }
}
```

Iterative version when recursion depth risks a stack overflow (`V` up to `10^5`+): use an explicit `ArrayDeque<Integer>` as a stack, pushing unvisited neighbours.

### 0.6 Two cycle-detection mini-templates

**Undirected graph** — a back edge to anyone _other than your immediate parent_ is a cycle (an edge back to the parent is just the edge you arrived on, not a cycle):

```java
boolean dfs(int u, int parent, boolean[] vis, List<List<Integer>> adj) {
    vis[u] = true;
    for (int v : adj.get(u)) {
        if (!vis[v]) { if (dfs(v, u, vis, adj)) return true; }
        else if (v != parent) return true;
    }
    return false;
}
```

**Directed graph** — the parent trick fails, because in a directed graph an edge to an already-visited vertex that is _not_ on your current recursion path is perfectly fine (it's just a cross/forward edge, e.g. a diamond shape). You need a second array, `pathVisited` (the recursion stack), and only flag a cycle when you hit a vertex that is visited **and currently on the path**:

```java
boolean dfs(int u, boolean[] vis, boolean[] pathVis, List<List<Integer>> adj) {
    vis[u] = true; pathVis[u] = true;
    for (int v : adj.get(u)) {
        if (!vis[v]) { if (dfs(v, vis, pathVis, adj)) return true; }
        else if (pathVis[v]) return true;
    }
    pathVis[u] = false; // backtrack: leaving this path
    return false;
}
```

This `pathVisited`/recursion-stack idea is also exactly what topological-sort-by-DFS and Tarjan's `tin/low` build on.

### 0.7 Topological sort

A topological order exists **iff the graph is a DAG**. The single invariant: _a vertex is placed in the order only after every vertex it depends on (every predecessor) is already placed._

- **DFS version**: run DFS from every unvisited vertex; when a vertex finishes (all its neighbours are done), push it onto a stack. Reverse the stack (or pop it) at the end — a vertex finishes _after_ everything it points to, so finishing order reversed is a valid dependency order.
- **Kahn's algorithm (BFS version)**: compute in-degree for every vertex, push all in-degree-0 vertices into a queue, pop one, "remove" it (decrement its neighbours' in-degree), push any neighbour whose in-degree drops to 0. If you process fewer than `V` vertices total, the graph has a cycle (Kahn's algorithm doubles as directed-cycle detection).

### 0.8 The relaxation primitive

Every shortest-path algorithm in this guide is the same one line, applied differently:

```java
if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
```

- Do it once per BFS step with `w = 1` → unweighted shortest path.
- Do it in topological order once per DAG edge → shortest path in a DAG, `O(V+E)`.
- Do it greedily, always relaxing out of the globally-nearest unfinalized vertex (a priority queue) → Dijkstra.
- Do it blindly `V-1` times over _all_ edges → Bellman-Ford (also handles negative weights, and a `V`-th pass that still relaxes something proves a negative cycle).
- Do it with every vertex as an allowed intermediate, `k` from `0` to `V-1` → Floyd-Warshall (all-pairs).

### 0.9 Disjoint Set Union (DSU)

DSU answers "are `u` and `v` in the same group?" and "merge these two groups" in almost `O(1)` amortized time — indispensable whenever a problem is about **merging or splitting connected pieces dynamically** (as opposed to a graph that's fixed before you start, where plain BFS/DFS would do).

```java
class DSU {
    int[] parent, rank_, size_;
    DSU(int n) {
        parent = new int[n]; rank_ = new int[n]; size_ = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size_[i] = 1; }
    }
    int find(int x) {
        while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } // path compression
        return x;
    }
    boolean unionByRank(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (rank_[ra] < rank_[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        if (rank_[ra] == rank_[rb]) rank_[ra]++;
        return true;
    }
    boolean unionBySize(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (size_[ra] < size_[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra; size_[ra] += size_[rb];
        return true;
    }
}
```

Path compression flattens the tree every time `find` is called; union by rank/size keeps the tree shallow by always hanging the smaller tree under the bigger one's root. Together they give `find`/`union` an amortized complexity of `O(α(V))` — the inverse Ackermann function, which is `≤ 4` for any `V` you will ever see, i.e. effectively `O(1)`.

### 0.10 MST keyword triples

- **Prim's**: grow one tree from an arbitrary start; a priority queue of `(weight, vertex)` always pops the cheapest edge leaving the _current visited set_. Feels exactly like Dijkstra, except you relax by raw edge weight, not by `dist[u] + w`.
- **Kruskal's**: sort _all_ edges by weight ascending; walk the sorted list, and use DSU to add an edge only if its endpoints aren't already connected. Simpler to reason about when the input is naturally an edge list.

### 0.11 Hard-algorithm toolbox: `tin[]`/`low[]` and Kosaraju

- **`tin[u]`** = the DFS discovery time of `u`. **`low[u]`** = the smallest `tin` reachable from `u`'s subtree using at most one back edge. `low[u] = min(tin[u], tin of back-edge targets, low[v] for every child v)`.
  - **Bridge** `(u, v)` (tree edge, `u` is `v`'s parent in the DFS tree): `low[v] > tin[u]` — nothing in `v`'s subtree can reach back to `u` or earlier, so removing `(u,v)` disconnects the graph.
  - **Articulation point** `u`: either `u` is the DFS root with `≥ 2` DFS-tree children, or `u` has a child `v` with `low[v] >= tin[u]` (note `>=`, not `>` — a child that can reach _exactly_ `u` but no further up still leaves `u` critical).
- **Kosaraju's algorithm** (Strongly Connected Components): (1) DFS the original graph, pushing each vertex onto a stack on **finish**; (2) transpose all edges; (3) pop the stack and DFS the transposed graph — each DFS tree you get is exactly one SCC. Reversing edges plus popping in finish-order forces each new DFS to only wander into vertices that can reach _and_ be reached from the popped vertex.

### 0.12 The decision question every problem asks first

```text
Am I counting/visiting reachable stuff at all?         -> BFS or DFS
Am I ordering dependencies ("before/after", "course")?  -> topological sort
Am I minimizing a path cost?                            -> BFS(unit) / Dijkstra / Bellman-Ford / Floyd-Warshall
Am I merging or splitting connected parts dynamically?  -> DSU
Am I asking "what breaks if I remove this edge/vertex"? -> Tarjan tin/low
Am I asking "which groups can reach each other both ways"? -> Kosaraju SCC
```

### 0.13 The 6 core mental models

| Signature clue                                                           | Mental model         | Template                                                                                          |
| ------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------- |
| "connected region", "group of 1s/land", flood-fill                       | Component counting   | BFS/DFS wrapped in a `for` loop over all unvisited vertices                                       |
| "spreads simultaneously", "minutes until all", "nearest X to every cell" | Multi-source BFS     | Push all sources with `dist=0` before the loop                                                    |
| "prerequisite", "before/after", "build order", "safe states"             | Topological ordering | Kahn's (BFS) or DFS finish-stack                                                                  |
| "shortest/cheapest path", weights involved                               | Shortest path family | BFS (unit) / Dijkstra (≥0 weights) / Bellman-Ford (negative weights) / Floyd-Warshall (all pairs) |
| "connect", "merge", "same group as", "remove stones/edges dynamically"   | DSU                  | `find`/`union` with path compression + rank/size                                                  |
| "removing this disconnects...", "critical connections"                   | Tarjan tin/low       | Bridges / articulation points                                                                     |

---

# PART A — Learning & Traversal

These six problems don't each need a "brute force" section in the usual sense — they _are_ the primitives. Read them as the toolbox that every later problem calls into.

## 1. Introduction to Graph & Graph Representation (Java)

### Problem Understanding

Given `n` vertices and `m` edges (each `u v`, optionally `u v w` if weighted), build a representation you can traverse efficiently. Input can also arrive as a grid (`char[][]`/`int[][]`) where adjacency is implicit in position rather than listed explicitly.

**Example**: `n=5, edges=[[0,1],[0,2],[1,3],[2,3],[3,4]]` → adjacency list `0:[1,2], 1:[0,3], 2:[0,3], 3:[1,2,4], 4:[3]`.

### How to Think About the Problem

- What should I notice first? There is no "algorithm" here — this is the data structure decision every later problem depends on.
- Which representation makes sense? Depends on density: sparse graph (`E ≈ V`) → adjacency list; dense (`E ≈ V²`) or need `O(1)` edge lookup → matrix; need globally sorted edges (MST) → edge list.
- Clue → Pattern: _"n vertices, m edges given as pairs"_ → build `List<List<Integer>>` once, reuse everywhere below.

### Intuition (Brute → Better → Optimal)

```text
Matrix: O(V²) space always, even if the graph is a sparse tree
        ↓
Observation: most graphs in practice have E << V², so V² space is wasted
        ↓
Adjacency list: O(V+E) space, iterate only real neighbours
```

### Optimal Approach

**Core Observation**: space and neighbour-iteration cost should scale with how many edges actually exist, not with `V²`.

**Java Code**

```java
List<List<Integer>> buildAdjList(int n, int[][] edges, boolean directed) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        if (!directed) adj.get(e[1]).add(e[0]);
    }
    return adj;
}

List<List<int[]>> buildWeightedAdjList(int n, int[][] edges, boolean directed) {
    List<List<int[]>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(new int[]{e[1], e[2]});
        if (!directed) adj.get(e[1]).add(new int[]{e[0], e[2]});
    }
    return adj;
}
```

**Complexity**: Time Complexity Calculation: each of the `m` edges is processed in `O(1)`, so `O(V + E)` total to build. Space Complexity Calculation: `O(V)` for the list-of-lists shells plus `O(E)` (or `O(2E)` undirected) for the stored neighbours → `O(V+E)`.

### Pattern to Remember

```text
Clue: "n vertices, m edges" input format
Pattern: adjacency list build, reused by every traversal below
Mental model: representation choice
```

**Similar problems**: every problem 7–53. **Interview tip**: say out loud _why_ you picked a list over a matrix (sparsity) before writing a line of code.

## 2. Graph Representation | C++ (equivalent Java)

### Problem Understanding

Same content, viewed from "which Java collection is fastest/lightest": `List<List<Integer>>` (flexible, boxed `Integer` overhead) vs `List<Integer>[]` (raw array of lists, less overhead, needs an unchecked-cast suppression) vs a manual CSR-style `int[]` adjacency (fastest, used in competitive programming for `V,E` up to `10^6`).

### How to Think About the Problem

- Is this a new algorithm? No — it's an engineering trade-off question, useful to mention when interviewers probe on performance.
- Clue → Pattern: _"how would you make this faster in Java specifically"_ → CSR (compressed sparse row) representation.

### Intuition

```text
List<List<Integer>>: simplest, boxed Integer per entry, GC pressure at scale
        ↓
List<Integer>[] adj = new List[n]: same complexity, slightly less overhead
        ↓
CSR arrays (head[], next[], to[]): O(V+E) space with zero boxing, fastest
```

### Optimal Approach

**Core Observation**: for `V, E` in the millions, boxed `Integer` objects and per-node `ArrayList` overhead dominate; a CSR layout stores all neighbours in one flat primitive array.

**Java Code**

```java
int[] head, nxt, to; int edgeCnt = 0;
void initCSR(int n, int m) {
    head = new int[n]; Arrays.fill(head, -1);
    nxt = new int[2*m]; to = new int[2*m];
}
void addEdge(int u, int v) {
    to[edgeCnt] = v; nxt[edgeCnt] = head[u]; head[u] = edgeCnt++;
}
// iterate neighbours of u: for (int e = head[u]; e != -1; e = nxt[e]) { int v = to[e]; ... }
```

**Complexity**: Time Complexity Calculation: build is `O(E)`, each neighbour visited in `O(1)` per edge → same `O(V+E)` as adjacency list. Space Complexity Calculation: `O(V+E)`, but with a much smaller constant factor (no object headers).

### Pattern to Remember

```text
Clue: "optimize for very large V/E in Java"
Pattern: CSR array-based adjacency instead of List<List<Integer>>
Mental model: representation choice, performance variant
```

**Similar problems**: 1. **Interview tip**: mention this only if asked about scale — for the other 51 problems, `List<List<Integer>>` is the right default; don't over-engineer.

## 3. Connected Components

### Problem Understanding

Given an undirected graph (possibly disconnected), identify or count the maximal connected chunks. Every later "BFS/DFS on the whole graph" problem needs this outer wrapper because a single BFS/DFS call only reaches one component.

**Example**: `n=6, edges=[[0,1],[1,2],[3,4]]` → components `{0,1,2}`, `{3,4}`, `{5}` → 3 components.

### How to Think About the Problem

- What should I notice first? A single `bfs(0)` call silently misses vertex 5 and the `{3,4}` component — you must loop over _every_ vertex and only start a new traversal if it's unvisited.
- Clue → Pattern: _"graph may be disconnected"_ → outer `for (v = 0; v < n; v++) if (!visited[v]) traverse(v)`.

### Intuition

```text
Single BFS/DFS from vertex 0: O(V+E) but only covers one component
        ↓
Observation: unreached vertices need their own traversal
        ↓
Wrap in for-loop over all vertices, skip visited ones: still O(V+E) total
```

### Optimal Approach

**Core Observation**: total work across _all_ components is still `O(V+E)` — each vertex and edge is touched exactly once overall, the outer loop just decides _where_ the next traversal starts.

**Step-by-Step Intuition**

1. `visited[] = false` for all `n` vertices.
2. For `v` from `0` to `n-1`: if `visited[v]` is false, run BFS/DFS from `v`, incrementing a component counter once per new start.
3. Every vertex touched inside that BFS/DFS belongs to the same component as `v`.

**Java Code**

```java
int countComponents(int n, List<List<Integer>> adj) {
    boolean[] visited = new boolean[n];
    int count = 0;
    for (int v = 0; v < n; v++) {
        if (!visited[v]) {
            count++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(v); visited[v] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int nb : adj.get(u)) {
                    if (!visited[nb]) { visited[nb] = true; q.add(nb); }
                }
            }
        }
    }
    return count;
}
```

**Complexity**: Time Complexity Calculation: the outer loop is `O(V)`, and across all inner BFS calls every vertex is dequeued once and every edge examined at most twice (once from each endpoint) → `O(V+E)` total, not `O(V) * O(V+E)`. Space Complexity Calculation: `O(V)` for `visited[]` and the queue.

### Pattern to Remember

```text
Clue: "graph is not guaranteed connected"
Pattern: outer for-loop + visited check before each new BFS/DFS
Mental model: component counting
```

**Similar problems**: 7, 8, 18, 45. **Interview tip**: always ask "can this graph be disconnected?" before writing a single `bfs(0)`.

## 4. Traversal Techniques — BFS

### Problem Understanding

Produce the BFS order (or distance array) of a graph from a given source, handling disconnection with the Problem 3 wrapper if needed.

### How to Think About the Problem

- Which traversal is natural? Directly BFS — this problem _is_ the primitive from §0.4.
- Clue → Pattern: _"level order"_, _"minimum number of edges/steps"_ → BFS.

### Intuition

```text
DFS order: valid traversal but gives no distance guarantee
        ↓
Observation: I need "processed in order of distance from source"
        ↓
BFS with a queue: FIFO order enforces level-by-level processing
```

### Optimal Approach

**Core Observation**: a FIFO queue guarantees that all vertices at distance `d` are removed before any vertex at distance `d+1` is even added correctly-distanced, because a vertex is only enqueued the first time it's discovered, and discovery happens strictly through a shortest-length path.

**Dry Run** on `0:[1,2], 1:[0,3], 2:[0,3], 3:[1,2,4], 4:[3]`, source `0`:

| Step  | Queue after | dist[] known           |
| ----- | ----------- | ---------------------- |
| start | `[0]`       | `dist[0]=0`            |
| pop 0 | `[1,2]`     | `dist[1]=1, dist[2]=1` |
| pop 1 | `[2,3]`     | `dist[3]=2`            |
| pop 2 | `[3]`       | (3 already set)        |
| pop 3 | `[4]`       | `dist[4]=3`            |

**Java Code**: identical to §0.4's template. **Complexity**: Time Complexity Calculation: `O(V+E)` — each vertex dequeued once, each edge examined once (twice for undirected). Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "shortest number of edges", "level order"
Pattern: queue + visited-on-enqueue, one level fully drained before the next begins
Mental model: BFS
```

**Similar problems**: 9, 13, 16, 28, 32. **Interview tip**: mark `visited` at _enqueue_ time, not at _dequeue_ time — otherwise the same vertex can be pushed multiple times before it's first processed.

## 5. DFS

### Problem Understanding

Produce the DFS order of a graph from a source (or all components), recursively or iteratively.

### How to Think About the Problem

- Clue → Pattern: _"explore as deep as possible"_, _"backtracking"_, _"pre/post order"_ → DFS.
- Recursive is simplest to write and prove correct; switch to an explicit `ArrayDeque` stack only if `V` is large enough to blow the call stack (roughly `> 10^4`–`10^5` depending on JVM stack size).

### Intuition

```text
BFS: correct but doesn't naturally expose back-edges / ancestor relationships
        ↓
Observation: cycle detection, topological order, and tin/low all need "am I revisiting an ancestor" — that's a DFS-shaped question
        ↓
DFS with recursion, tracking the current path
```

### Optimal Approach

**Core Observation**: DFS's call stack literally _is_ the current root-to-node path, which is exactly the information cycle detection (directed) and Tarjan's algorithm need.

**Java Code (recursive)**

```java
void dfs(int u, boolean[] visited, List<List<Integer>> adj, List<Integer> order) {
    visited[u] = true;
    order.add(u);
    for (int v : adj.get(u)) if (!visited[v]) dfs(v, visited, adj, order);
}
```

**Java Code (iterative, explicit stack)**

```java
void dfsIterative(int src, boolean[] visited, List<List<Integer>> adj) {
    ArrayDeque<Integer> st = new ArrayDeque<>();
    st.push(src);
    while (!st.isEmpty()) {
        int u = st.pop();
        if (visited[u]) continue;
        visited[u] = true;
        for (int v : adj.get(u)) if (!visited[v]) st.push(v);
    }
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`, identical structure to BFS. Space Complexity Calculation: `O(V)` for `visited[]` plus `O(V)` recursion/stack depth in the worst case (a path graph).

### Pattern to Remember

```text
Clue: "explore fully before backtracking", cycle/ordering questions
Pattern: recursion + visited, current call stack = current path
Mental model: DFS
```

**Similar problems**: 11, 12, 18, 19, 20, 21. **Interview tip**: if asked "why DFS over BFS here", the honest answer is almost always "because I need the notion of _ancestor on the current path_".

## 6. DFS on a Grid / Connected Components Problem in Matrix

### Problem Understanding

Given a `char[][]`/`int[][]` grid, treat each cell as a vertex connected to its 4 (or 8) neighbours of the same "type" (e.g., same land value), and count/enumerate connected regions.

**Example**: grid `[[1,1,0],[0,1,0],[0,0,1]]` (4-directional) → two regions: the 3 connected `1`s top-left, and the isolated `1` bottom-right.

### How to Think About the Problem

- What should I notice first? This is Problem 3 (component counting) plus §0.3 (grid = graph), nothing new conceptually.
- Which representation makes sense? Don't build an explicit adjacency list — generate neighbours on the fly with the `dirs[]` array; building `n*m` list entries would waste memory for no benefit.

### Intuition

```text
Treat grid as adjacency list explicitly built: O(n*m) extra memory, unnecessary
        ↓
Observation: neighbours are always computable from (r,c) via dirs[]
        ↓
DFS/BFS directly on grid coordinates, visited[][] sized n x m
```

### Optimal Approach

**Core Observation**: the "outer loop over unvisited vertices" from Problem 3 becomes a double `for (r) for (c)`, and "neighbours of vertex u" becomes "4 cells around `(r,c)`, bounds-checked".

**Java Code**

```java
int countRegions(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    boolean[][] visited = new boolean[n][m];
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    int regions = 0;
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < m; c++) {
            if (grid[r][c] == 1 && !visited[r][c]) {
                regions++;
                ArrayDeque<int[]> q = new ArrayDeque<>();
                q.add(new int[]{r, c}); visited[r][c] = true;
                while (!q.isEmpty()) {
                    int[] cur = q.poll();
                    for (int[] d : dirs) {
                        int nr = cur[0] + d[0], nc = cur[1] + d[1];
                        if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                        if (grid[nr][nc] == 1 && !visited[nr][nc]) {
                            visited[nr][nc] = true;
                            q.add(new int[]{nr, nc});
                        }
                    }
                }
            }
        }
    }
    return regions;
}
```

**Complexity**: Time Complexity Calculation: every cell is visited and enqueued at most once, each with `O(4)` neighbour checks → `O(n*m)`. Space Complexity Calculation: `O(n*m)` for `visited[][]` plus queue.

### Pattern to Remember

```text
Clue: "grid", "matrix", "region", "island"
Pattern: BFS/DFS with dirs[] array instead of adjacency list, visited[][] sized n x m
Mental model: component counting, grid variant
```

**Similar problems**: 7, 18, 48, 49. **Interview tip**: state the vertex count as `n*m` and edge count as `≈4*n*m` immediately — it anchors your complexity answer.

---

# PART B — Problems on BFS/DFS (14 problems)

## 7. Number of Provinces (LeetCode 547, Medium)

### Problem Understanding

`isConnected[n][n]` is an adjacency **matrix** (`isConnected[i][j]=1` means city `i` and `j` are directly connected). Count provinces = connected components.

**Example**: `[[1,1,0],[1,1,0],[0,0,1]]` → 2 provinces.

### How to Think About the Problem

- Is this a graph? Yes, given as a matrix instead of an edge list — no conversion needed, just iterate row `i` to get neighbours of `i`.
- Clue → Pattern: this is literally Problem 3 with the input format swapped.

### Intuition

```text
Union-Find over the matrix: works, O(V^2 * α(V))
        ↓
Observation: it's still just "count components" — no merging logic is actually needed
        ↓
BFS/DFS wrapped in a for-loop, same as Problem 3, reading neighbours from a matrix row
```

### Brute Force Approach

Same as optimal here — there is no meaningfully "worse" approach beyond picking DSU vs BFS; both are `O(V²)` because reading a matrix row is `O(V)`.

### Optimal Approach

**Core Observation**: matrix row `i` is exactly "the neighbour list of `i`" — no adjacency list needs to be built.

**Pattern Identification**: Component counting (§0.13), matrix variant.

**Java Code**

```java
public int findCircleNum(int[][] isConnected) {
    int n = isConnected.length;
    boolean[] visited = new boolean[n];
    int provinces = 0;
    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            provinces++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(i); visited[i] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v = 0; v < n; v++) {
                    if (isConnected[u][v] == 1 && !visited[v]) {
                        visited[v] = true; q.add(v);
                    }
                }
            }
        }
    }
    return provinces;
}
```

**Complexity**: Time Complexity Calculation: for each of `n` starts, scanning a row is `O(n)`, and every vertex is only ever the "start" of one BFS, so total row-scans across the whole run are `O(n²)`. Space Complexity Calculation: `O(n)`.

### Pattern to Remember

```text
Clue: "isConnected matrix", "provinces"
Pattern: component counting directly on matrix rows
Mental model: component counting
```

**Similar problems**: 3, 8, 18. **Interview tip**: note explicitly that matrix input forces `O(V²)` even though the _algorithm_ is the same `O(V+E)` BFS — the bottleneck moved to reading the input.

## 8. Connected Components in a Matrix (grid component counting)

### Problem Understanding

Generic version of Problem 6: return the _list_ of components (each a list of `(r,c)` cells), not just the count — the reusable wrapper for Number of Islands, Making a Large Island, etc.

### How to Think About the Problem

- Same as Problem 6, but collect cells into a list during BFS instead of only counting.

### Intuition

```text
Just count regions (Problem 6): loses which cells belong together
        ↓
Observation: later problems (49, 18) need the membership, not just the count
        ↓
Same BFS, but push visited cells into a per-component List
```

### Optimal Approach

**Core Observation / Pattern Identification**: identical traversal to Problem 6; the only change is what you accumulate during the walk.

**Java Code**

```java
List<List<int[]>> allComponents(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    boolean[][] visited = new boolean[n][m];
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    List<List<int[]>> comps = new ArrayList<>();
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (grid[r][c] == 1 && !visited[r][c]) {
            List<int[]> comp = new ArrayList<>();
            ArrayDeque<int[]> q = new ArrayDeque<>();
            q.add(new int[]{r,c}); visited[r][c] = true;
            while (!q.isEmpty()) {
                int[] cur = q.poll();
                comp.add(cur);
                for (int[] d : dirs) {
                    int nr = cur[0]+d[0], nc = cur[1]+d[1];
                    if (nr<0||nr>=n||nc<0||nc>=m) continue;
                    if (grid[nr][nc]==1 && !visited[nr][nc]) {
                        visited[nr][nc] = true; q.add(new int[]{nr,nc});
                    }
                }
            }
            comps.add(comp);
        }
    }
    return comps;
}
```

**Complexity**: Time Complexity Calculation: `O(n*m)`, identical to Problem 6. Space Complexity Calculation: `O(n*m)` for the returned components plus `visited`.

### Pattern to Remember

```text
Clue: "list the cells in each island/region"
Pattern: Problem 6's BFS, accumulate membership instead of a counter
Mental model: component counting, membership variant
```

**Similar problems**: 18, 49. **Interview tip**: mention you'd reuse this exact helper for Problem 49 — showing code reuse instinct matters more than cleverness.

## 9. Rotten Oranges (LeetCode 994, Medium)

### Problem Understanding

Grid of `0` (empty), `1` (fresh orange), `2` (rotten orange). Every minute, every rotten orange rots its 4-directional fresh neighbours. Return minutes until no fresh orange remains, or `-1` if impossible.

**Example**: `[[2,1,1],[1,1,0],[0,1,1]]` → `4`. All-fresh grid with no rotten source → `-1`.

### How to Think About the Problem

- What should I notice first? Rot spreads from _multiple_ rotten oranges simultaneously, not from one source — this is the multi-source BFS clue from §0.13.
- Clue → Pattern: _"minutes until all X happens, spreading from several starting points at once"_ → multi-source BFS, answer = the maximum level reached.

### Intuition (Brute → Better → Optimal)

```text
Brute force: simulate minute-by-minute, rescanning the whole grid each minute, O((n*m)^2)
        ↓
Observation: a full-grid rescan every minute redoes work already known from the previous minute's frontier
        ↓
Multi-source BFS: push ALL rotten oranges at once with time 0, O(n*m)
```

### Brute Force Approach

**Basic idea**: each minute, scan the whole grid; for every rotten cell, mark its fresh neighbours rotten in a "next" grid; repeat until no cell changes.

```java
public int orangesRottingBrute(int[][] grid) {
    int n = grid.length, m = grid[0].length, minutes = 0;
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    while (true) {
        boolean changed = false;
        int[][] next = new int[n][m];
        for (int r = 0; r < n; r++) next[r] = grid[r].clone();
        for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
            if (grid[r][c] == 2) {
                for (int[] d : dirs) {
                    int nr = r+d[0], nc = c+d[1];
                    if (nr>=0&&nr<n&&nc>=0&&nc<m&&grid[nr][nc]==1) { next[nr][nc]=2; changed = true; }
                }
            }
        }
        grid = next;
        if (!changed) break;
        minutes++;
    }
    for (int[] row : grid) for (int v : row) if (v == 1) return -1;
    return minutes;
}
```

**Time Complexity Calculation**: each minute rescans the whole grid, `O(n*m)`, and up to `O(n+m)` minutes can pass → `O((n*m)*(n+m))`. **Space Complexity Calculation**: `O(n*m)` per snapshot.

**Why can this be improved?** We're re-deriving "who becomes rotten next" from scratch each minute, when BFS's queue would track the frontier automatically.

### Optimal Approach

**Core Observation**: pushing _all_ rotten oranges into the BFS queue at once, each tagged with time `0`, makes the BFS level of a fresh orange exactly the minute it rots — because BFS processes strictly in non-decreasing distance-from-nearest-source order.

**Pattern Identification**: Multi-source BFS (§0.4/§0.13); answer is `max(dist[])` over all cells that started fresh.

**Step-by-Step Intuition**

1. Scan the grid once: push every `2` into the queue with time `0`; count total fresh oranges.
2. Standard BFS: pop `(r,c,t)`, for each fresh neighbour, rot it, record its time `t+1`, push it, decrement fresh-count.
3. Track the maximum time seen. If fresh-count is still `> 0` at the end, return `-1`.
4. **Invariant**: a cell's rot-time equals the BFS level from the _nearest_ rotten source, because all real sources tie at level 0.

**Dry Run** on `[[2,1,1],[1,1,0],[0,1,1]]` (rows 0–2):

| Step  | Queue (r,c,t) processed | Newly rotten              |
| ----- | ----------------------- | ------------------------- |
| init  | push (0,0,0)            | fresh=6                   |
| t=0→1 | pop (0,0,0)             | rot (0,1,t=1), (1,0,t=1)  |
| t=1   | pop (0,1,1), (1,0,1)    | rot (0,2,t=2), (1,1,t=2)  |
| t=2   | pop (0,2,2), (1,1,2)    | rot (2,1,t=3) (via (1,1)) |
| t=3   | pop (2,1,3)             | rot (2,2,t=4)             |
| t=4   | pop (2,2,4)             | none left, fresh=0        |

Answer `4`, matching the max time.

**Why Does It Work?** Multi-source BFS is equivalent to adding a virtual super-source connected to every rotten cell with a zero-cost edge, then doing ordinary single-source BFS — so the same "BFS level = shortest hop count" guarantee applies, just measured from whichever real source is nearest.

**Java Code**

```java
public int orangesRotting(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    ArrayDeque<int[]> q = new ArrayDeque<>();
    int fresh = 0;
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (grid[r][c] == 2) q.add(new int[]{r, c, 0});
        else if (grid[r][c] == 1) fresh++;
    }
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    int time = 0;
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        time = Math.max(time, cur[2]);
        for (int[] d : dirs) {
            int nr = cur[0]+d[0], nc = cur[1]+d[1];
            if (nr<0||nr>=n||nc<0||nc>=m||grid[nr][nc]!=1) continue;
            grid[nr][nc] = 2; fresh--;
            q.add(new int[]{nr, nc, cur[2]+1});
        }
    }
    return fresh == 0 ? time : -1;
}
```

**Complexity**: Time Complexity Calculation: every cell enqueued and dequeued at most once, `O(4)` work each → `O(n*m)`. Space Complexity Calculation: `O(n*m)` for the queue in the worst case.

### Pattern to Remember

```text
Clue: "spreads every minute from several starting points"
Pattern: push all sources with dist=0, answer = max dist reached
Mental model: multi-source BFS
```

**Similar problems**: 13, 14, 15. **Interview tip**: explicitly call out the two edge cases — grid with zero fresh oranges (`answer=0`) and a fresh orange with no path to any rotten one (`answer=-1`).

## 10. Flood Fill Algorithm (LeetCode 733, Medium)

### Problem Understanding

Given a grid, a start cell, and a new color, recolor the entire 4-directionally-connected region of the start cell's _original_ color to the new color.

**Example**: `image=[[1,1,1],[1,1,0],[1,0,1]]`, `sr=1,sc=1,color=2` → `[[2,2,2],[2,2,0],[2,0,1]]`.

### How to Think About the Problem

- Is this a graph? Yes — same region-walk as Problem 6, but _mutating_ the grid as you go instead of only marking `visited`.
- Edge case to notice immediately: if `newColor == originalColor`, a naive DFS recolors then immediately re-visits the same cells forever — must guard against it.

### Intuition

```text
DFS with a separate visited[][]: correct but O(n*m) extra memory
        ↓
Observation: once a cell is recolored to newColor, it no longer equals originalColor, so the color array itself can double as "visited"
        ↓
DFS mutating the grid in place, guarded by the newColor==originalColor edge case
```

### Optimal Approach

**Core Observation**: change the cell's color **before** recursing into neighbours — otherwise, if `newColor == originalColor`, the DFS recolors a cell to the same value it started with and treats it as "still matching", recursing infinitely.

**Java Code**

```java
public int[][] floodFill(int[][] image, int sr, int sc, int color) {
    int old = image[sr][sc];
    if (old != color) dfs(image, sr, sc, old, color);
    return image;
}
private void dfs(int[][] image, int r, int c, int old, int color) {
    if (r<0||r>=image.length||c<0||c>=image[0].length||image[r][c]!=old) return;
    image[r][c] = color;
    dfs(image, r+1, c, old, color);
    dfs(image, r-1, c, old, color);
    dfs(image, r, c+1, old, color);
    dfs(image, r, c-1, old, color);
}
```

**Complexity**: Time Complexity Calculation: `O(n*m)` worst case (the whole grid is one region). Space Complexity Calculation: `O(n*m)` recursion depth worst case, `O(1)` extra array (grid reused as visited).

### Pattern to Remember

```text
Clue: "recolor connected region", "paint bucket"
Pattern: DFS/BFS on grid, mutate cell = mark visited (guard newColor==oldColor)
Mental model: component counting, in-place variant
```

**Similar problems**: 6, 18. **Interview tip**: say the `newColor == oldColor` guard out loud — it's the one-line detail that separates a working from an infinite-looping solution.

## 11. Cycle Detection in an Undirected Graph (BFS) — Hard

### Problem Understanding

Given an undirected (possibly disconnected) graph, determine whether it contains any cycle, using BFS.

### How to Think About the Problem

- What should I notice first? A plain `visited[]` array alone can't distinguish "revisiting my parent along the edge I just came from" (not a cycle) from "revisiting someone else" (a cycle) — I need to carry the parent along.
- Clue → Pattern: _"cycle", "undirected"_ → BFS/DFS with a parent-tracking twist (§0.6).

### Intuition

```text
Just check "have I seen this vertex before" while BFS-ing: false positive on the edge back to parent
        ↓
Observation: store the parent each vertex was discovered from, in the same queue entry
        ↓
BFS with (vertex, parent) pairs: a visited neighbour that isn't the parent means a cycle
```

### Optimal Approach

**Core Observation**: in an undirected graph every edge is stored twice (`u→v` and `v→u`), so from `v` you will always see `u` again as a "neighbour" — that's not a cycle, it's the edge you arrived on. Only a visited neighbour _other than the immediate parent_ proves a real cycle.

**Step-by-Step Intuition**

1. For each unvisited vertex, start BFS with `(vertex=start, parent=-1)`.
2. Pop `(u, par)`. For each neighbour `v` of `u`: if unvisited, mark visited, push `(v, u)`. If visited **and** `v != par`, a cycle exists.
3. **Invariant**: every enqueued pair correctly remembers "who discovered me", so the parent check is always comparing against the true tree edge.

**Dry Run** on a triangle `0-1, 1-2, 2-0`:
| Step | Pop | Action |
|---|---|---|
| 1 | (0,-1) | push (1,0) |
| 2 | (1,0) | see 2 (new) push (2,1); see 0 == parent, skip |
| 3 | (2,1) | see 0 (visited, 0 != parent 1) → cycle found |

**Why Does It Work?** Any cycle, when BFS-explored, must eventually reach a vertex that is already visited via some _other_ branch of the BFS tree — and since it wasn't discovered from the current vertex, it can't equal the current vertex's parent.

**Java Code**

```java
boolean hasCycleUndirectedBFS(int n, List<List<Integer>> adj) {
    boolean[] visited = new boolean[n];
    for (int i = 0; i < n; i++) {
        if (!visited[i]) {
            ArrayDeque<int[]> q = new ArrayDeque<>();
            q.add(new int[]{i, -1}); visited[i] = true;
            while (!q.isEmpty()) {
                int[] cur = q.poll();
                int u = cur[0], par = cur[1];
                for (int v : adj.get(u)) {
                    if (!visited[v]) { visited[v] = true; q.add(new int[]{v, u}); }
                    else if (v != par) return true;
                }
            }
        }
    }
    return false;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` — same shape as ordinary BFS. Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "cycle in undirected graph"
Pattern: BFS/DFS carrying parent; visited-and-not-parent => cycle
Mental model: cycle detection (undirected)
```

**Similar problems**: 12. **Interview tip**: explicitly say why a bare `visited[]` fails — interviewers often probe exactly this.

## 12. Detect a Cycle in an Undirected Graph (DFS) — Hard

### Problem Understanding

Same as Problem 11, using DFS instead of BFS.

### How to Think About the Problem

- Same core idea as Problem 11 — only the traversal mechanism changes; the parent-tracking logic is identical.

### Intuition

```text
Same as Problem 11's BFS reasoning
        ↓
DFS naturally carries "parent" as a recursion parameter instead of a queue field
```

### Optimal Approach

**Core Observation**: identical to Problem 11 — a back edge to anyone but the immediate parent is a cycle (§0.6).

**Java Code**

```java
boolean hasCycleUndirectedDFS(int n, List<List<Integer>> adj) {
    boolean[] visited = new boolean[n];
    for (int i = 0; i < n; i++) {
        if (!visited[i] && dfs(i, -1, visited, adj)) return true;
    }
    return false;
}
private boolean dfs(int u, int parent, boolean[] visited, List<List<Integer>> adj) {
    visited[u] = true;
    for (int v : adj.get(u)) {
        if (!visited[v]) { if (dfs(v, u, visited, adj)) return true; }
        else if (v != parent) return true;
    }
    return false;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V)` visited plus `O(V)` recursion depth worst case.

### Pattern to Remember

```text
Clue: "cycle in undirected graph", DFS explicitly requested
Pattern: DFS with parent parameter, back edge != parent => cycle
Mental model: cycle detection (undirected)
```

**Similar problems**: 11, 20. **Interview tip**: mention BFS and DFS both solve this in the same complexity — the choice is stylistic here, unlike the directed case (Problem 20) where DFS's recursion-stack idea is essentially required.

## 13. Distance of Nearest Cell Having 1 (01 Matrix) (LeetCode 542, Medium)

### Problem Understanding

Given a binary grid, for every cell return the Manhattan-reachable distance (4-directional steps) to the nearest cell containing `1`.

**Example**: `[[0,0,0],[0,1,0],[0,0,0]]` → `[[1,1,1],[1,0,1],[1,1,1]]`.

### How to Think About the Problem

- What should I notice first? Same shape as Rotten Oranges (Problem 9): many possible sources (`1` cells), one distance array to fill — multi-source BFS again.
- Naive idea: BFS from every `0` cell looking for the nearest `1` — but that's `O((n*m)²)`, far too slow; multi-source BFS _from the 1s inward_ computes everything in one pass.

### Intuition (Brute → Better → Optimal)

```text
Brute force: BFS from every cell separately, O((n*m)^2)
        ↓
Observation: distances "grow outward" from the 1-cells identically to rot spreading — run BFS once, backwards, from all 1s at once
        ↓
Multi-source BFS from all 1-cells, O(n*m)
```

### Brute Force Approach

**Basic idea**: for each `0` cell, BFS outward until a `1` is found.

```java
// conceptually O((n*m)^2): omitted for brevity, structurally identical to a per-source BFS loop
```

**Time Complexity Calculation**: up to `n*m` BFS calls, each up to `O(n*m)` → `O((n*m)²)`.
**Why can this be improved?** Every one of those BFS calls redundantly explores overlapping territory; multi-source BFS computes every cell's answer in one shared pass.

### Optimal Approach

**Core Observation**: reverse the direction of search — instead of "each 0 looks for the nearest 1", let all `1`s expand outward simultaneously; the first time a wave reaches a `0` cell, that wave's distance is its answer (identical justification to Problem 9).

**Java Code**

```java
public int[][] updateMatrix(int[][] mat) {
    int n = mat.length, m = mat[0].length;
    int[][] dist = new int[n][m];
    boolean[][] visited = new boolean[n][m];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (mat[r][c] == 1) { q.add(new int[]{r,c,0}); visited[r][c] = true; }
    }
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        dist[cur[0]][cur[1]] = cur[2];
        for (int[] d : dirs) {
            int nr = cur[0]+d[0], nc = cur[1]+d[1];
            if (nr<0||nr>=n||nc<0||nc>=m||visited[nr][nc]) continue;
            visited[nr][nc] = true;
            q.add(new int[]{nr, nc, cur[2]+1});
        }
    }
    return dist;
}
```

**Complexity**: Time Complexity Calculation: `O(n*m)` — each cell enqueued once. Space Complexity Calculation: `O(n*m)`.

### Pattern to Remember

```text
Clue: "distance to nearest X for every cell"
Pattern: multi-source BFS from all X-cells simultaneously
Mental model: multi-source BFS
```

**Similar problems**: 9, 14, 15. **Interview tip**: name the naive per-cell-BFS idea first, then explain _why reversing the source set_ fixes the complexity — that narrative is exactly what's being tested.

## 14. Surrounded Regions (Replace O's with X's) (LeetCode 130, Medium)

### Problem Understanding

Given a grid of `X`/`O`, flip every `O` to `X` unless that `O` is connected (4-directionally) to a border `O` — border-connected regions survive.

**Example**: `[[X,X,X,X],[X,O,O,X],[X,X,O,X],[X,O,X,X]]` → the middle blob (connected to nothing on the border) becomes `X`; note any `O` chain that touches row 0, row n-1, col 0, or col m-1 must survive.

### How to Think About the Problem

- What should I notice first? It's easier to find what must **stay** `O` (border-reachable) than to directly detect all "surrounded" ones — flip the question.
- Clue → Pattern: _"reachable from the border survives, everything else flips"_ → boundary-first flood fill.

### Intuition

```text
Brute force: for each O, BFS/DFS to see if it can reach the border, O(n*m) per cell => O((n*m)^2)
        ↓
Observation: instead of asking "can I reach the border" per cell, flood-fill FROM the border once and mark everything reachable
        ↓
Boundary-first multi-source flood fill, O(n*m)
```

### Brute Force Approach

**Basic idea**: for every `O`, run a BFS/DFS to check if any cell in its region touches the border; if none does, flip the whole region.
**Time Complexity Calculation**: worst case every cell triggers its own region search → `O((n*m)²)`.
**Why can this be improved?** Region membership is recomputed repeatedly; a single pass starting from all border `O`s marks every "safe" cell in one shared traversal.

### Optimal Approach

**Core Observation**: run BFS/DFS starting from every `O` that sits on the border (multi-source), mark everything reached as "safe". Anything left unmarked and still `O` is, by definition, unreachable from the border — flip it.

**Step-by-Step Intuition**

1. Push every border cell with value `O` into a multi-source BFS/DFS, mark `safe[r][c]=true`.
2. Traverse outward normally, marking reached `O` cells safe.
3. Second pass over the whole grid: any `O` not marked safe → flip to `X`.

**Java Code**

```java
public void solve(char[][] board) {
    int n = board.length, m = board[0].length;
    boolean[][] safe = new boolean[n][m];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        boolean border = r==0||r==n-1||c==0||c==m-1;
        if (border && board[r][c]=='O' && !safe[r][c]) { safe[r][c]=true; q.add(new int[]{r,c}); }
    }
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        for (int[] d : dirs) {
            int nr = cur[0]+d[0], nc = cur[1]+d[1];
            if (nr<0||nr>=n||nc<0||nc>=m||safe[nr][nc]||board[nr][nc]!='O') continue;
            safe[nr][nc] = true; q.add(new int[]{nr, nc});
        }
    }
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (board[r][c]=='O' && !safe[r][c]) board[r][c] = 'X';
    }
}
```

**Complexity**: Time Complexity Calculation: `O(n*m)` — border scan `O(n+m)`, flood fill visits each cell once, final scan `O(n*m)`. Space Complexity Calculation: `O(n*m)`.

### Pattern to Remember

```text
Clue: "safe if connected to the border, otherwise flip/remove"
Pattern: boundary-first multi-source flood fill, invert the question
Mental model: multi-source BFS/DFS, "safe set" variant
```

**Similar problems**: 15, 26. **Interview tip**: say explicitly "I'll find what survives, not what dies" — that reframing is the entire insight.

## 15. Number of Enclaves (LeetCode 1020, Medium)

### Problem Understanding

Given a binary grid, count land cells (`1`) that can **never** walk off the grid boundary via 4-directional moves through other land cells.

### How to Think About the Problem

- Clue → Pattern: literally Problem 14's logic — "safe" there becomes "boundary-connected land here", and instead of flipping, we count what's left over.

### Intuition

```text
Same boundary-first flood fill idea as Problem 14
        ↓
Flood fill from every border land cell, mark reachable
        ↓
Count remaining unmarked land cells
```

### Optimal Approach

**Core Observation / Pattern Identification**: identical boundary-first multi-source BFS as Problem 14; the only change is we count leftover `1`s instead of rewriting them.

**Java Code**

```java
public int numEnclaves(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    boolean[][] visited = new boolean[n][m];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        boolean border = r==0||r==n-1||c==0||c==m-1;
        if (border && grid[r][c]==1 && !visited[r][c]) { visited[r][c]=true; q.add(new int[]{r,c}); }
    }
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        for (int[] d : dirs) {
            int nr = cur[0]+d[0], nc = cur[1]+d[1];
            if (nr<0||nr>=n||nc<0||nc>=m||visited[nr][nc]||grid[nr][nc]==0) continue;
            visited[nr][nc]=true; q.add(new int[]{nr,nc});
        }
    }
    int count = 0;
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++)
        if (grid[r][c]==1 && !visited[r][c]) count++;
    return count;
}
```

**Complexity**: Time Complexity Calculation: `O(n*m)`. Space Complexity Calculation: `O(n*m)`.

### Pattern to Remember

```text
Clue: "land that can never reach the boundary"
Pattern: boundary-first multi-source flood fill, count leftovers
Mental model: multi-source BFS, "safe set" variant
```

**Similar problems**: 14, 26. **Interview tip**: note that this is Problem 14 with the last step changed from "flip" to "count" — reusing solved problems verbatim is a strong signal in an interview.

## 16. Word Ladder I (LeetCode 127, Hard)

### Problem Understanding

Given `beginWord`, `endWord`, and a `wordList`, find the length of the shortest transformation sequence where each step changes exactly one letter and the result must be in `wordList`.

**Example**: `begin="hit", end="cog", wordList=[hot,dot,dog,lot,log,cog]` → `5` (`hit→hot→dot→dog→cog`).

### How to Think About the Problem

- Is this a graph? Yes, but an _implicit_ one: nodes are words, and an edge connects two words that differ by exactly one letter. Nobody hands you this graph — you generate edges on the fly.
- Clue → Pattern: _"shortest transformation sequence, one change at a time"_ → unweighted shortest path → BFS, where "neighbours of a word" are computed by trying all 26 letters at each position.

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every word pair in wordList, check if they differ by one letter to build real edges, O(N^2 * L)
        ↓
Observation: instead of comparing to every other word, mutate the current word at each position through all 26 letters and check set membership — O(L * 26) per word
        ↓
BFS over implicit one-letter-mutation graph, O(N * L * 26)
```

### Brute Force Approach

**Basic idea**: build an explicit adjacency list by comparing every pair of words for a one-letter difference, then BFS.

```java
boolean oneDiff(String a, String b) {
    int diff = 0;
    for (int i = 0; i < a.length(); i++) if (a.charAt(i) != b.charAt(i)) diff++;
    return diff == 1;
}
// build adj: O(N^2 * L) comparisons, then ordinary BFS O(N+E)
```

**Time Complexity Calculation**: `O(N² * L)` just to build the graph, where `N=wordList.size()`, `L=word length`. **Why can this be improved?** Comparing every pair is wasteful — most pairs share no letters in common at all; generating candidate neighbours directly is far cheaper.

### Optimal Approach

**Core Observation**: for a word of length `L`, there are only `L * 25` possible one-letter mutations — generate all of them and check `O(1)` set membership, instead of comparing against every other word.

**Pattern Identification**: unweighted shortest path → BFS; "neighbour generation" replaces "adjacency list lookup".

**Step-by-Step Intuition**

1. Put `wordList` into a `HashSet<String>` for `O(1)` lookup; if `endWord` isn't in it, return `0` immediately.
2. BFS from `beginWord` with level `1`. For the popped word, for each position `i` and each letter `'a'..'z'`, build the mutated word; if it's in the set, that's a neighbour — remove it from the set (acts as `visited`) and enqueue with `level+1`.
3. The moment `endWord` is dequeued, return its level.
4. **Invariant**: BFS level = number of words in the transformation sequence so far, so the first time `endWord` is reached is guaranteed shortest.

**Why Does It Work?** Removing a word from the set the moment it's enqueued is exactly "mark visited on discovery" (§0.4) applied to an implicit graph — the correctness argument is identical to ordinary BFS.

**Java Code**

```java
public int ladderLength(String beginWord, String endWord, List<String> wordList) {
    Set<String> words = new HashSet<>(wordList);
    if (!words.contains(endWord)) return 0;
    ArrayDeque<String> q = new ArrayDeque<>();
    q.add(beginWord);
    words.remove(beginWord);
    int level = 1;
    while (!q.isEmpty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            String cur = q.poll();
            if (cur.equals(endWord)) return level;
            char[] chars = cur.toCharArray();
            for (int pos = 0; pos < chars.length; pos++) {
                char orig = chars[pos];
                for (char ch = 'a'; ch <= 'z'; ch++) {
                    if (ch == orig) continue;
                    chars[pos] = ch;
                    String next = new String(chars);
                    if (words.contains(next)) {
                        words.remove(next);
                        q.add(next);
                    }
                }
                chars[pos] = orig;
            }
        }
        level++;
    }
    return 0;
}
```

**Complexity**: Time Complexity Calculation: `O(N * L * 26)` — each of up to `N` words is dequeued once, and generating its mutations costs `O(L*26)` with `O(L)` per `String` rebuild, so more precisely `O(N * L² * 26)` including string construction. Space Complexity Calculation: `O(N * L)` for the set and queue.

### Pattern to Remember

```text
Clue: "one-letter transformation sequence", "shortest word ladder"
Pattern: BFS on an implicit graph, neighbours generated via 26-letter mutation + set lookup
Mental model: unweighted shortest path (BFS)
```

**Similar problems**: 17, 28. **Interview tip**: explicitly justify why generating mutations beats pairwise comparison — that's the crux of the "hard" rating here, not the BFS itself.

## 17. Word Ladder II (LeetCode 126, Hard)

### Problem Understanding

Same setup as Word Ladder I, but return **all** shortest transformation sequences from `beginWord` to `endWord`.

**Example**: same input as Problem 16 → `[[hit,hot,dot,dog,cog],[hit,hot,lot,log,cog]]`.

### How to Think About the Problem

- What should I notice first? Problem 16's trick of removing a word from the set the instant it's discovered _breaks_ here — if two different words at the same BFS level could both reach a third word, removing it after the first path claims it hides the second valid shortest path.
- Clue → Pattern: need shortest length (BFS) **and** all paths of that length (DFS reconstruction) → BFS layer-by-layer, then backtrack.

### Intuition (Brute → Better → Optimal)

```text
Naive: DFS every possible sequence, prune by length afterward — exponential blow-up
        ↓
Observation: BFS still finds the shortest length correctly, but must remove words per-LEVEL, not per-word, so sibling words at the same level don't block each other
        ↓
BFS layer-by-layer (building a "word -> possible next words" map), then DFS backtrack from endWord using that map
```

### Brute Force Approach

Generate every possible chain via DFS/backtracking, verifying membership at each step, then keep only the shortest ones. Exponential in the worst case, since branching factor is `O(L*26)` per step with no early pruning by level.
**Time Complexity Calculation**: exponential, roughly `O((26L)^depth)`.
**Why can this be improved?** Nearly all branches explored are already longer than the shortest possible chain — BFS should determine the shortest length _first_, and only then should paths of exactly that length be reconstructed.

### Optimal Approach

**Core Observation**: run BFS level by level; within a single level, collect _all_ newly-discovered words and only remove them from the global set **after the whole level finishes** — this stops the second sibling from being wrongly denied a valid word that a sibling already claimed at the same level. While doing this, record, for each newly-discovered word, which word(s) in the previous level led to it (a `parents` map).

**Pattern Identification**: unweighted shortest path (finds the length) + explicit path reconstruction via a predecessor map (classic BFS-shortest-paths-plural pattern).

**Step-by-Step Intuition**

1. BFS from `beginWord`, but process one full level (`queue.size()` snapshot) before mutating the shared word set.
2. For each word popped this level, generate all one-letter mutations; for every mutation present in the set, add it to a `Map<String, List<String>> parents` (child → list of parents) and stage it for the _next_ level's queue.
3. After the whole level is processed, remove every word discovered this level from the set (bulk removal, not per-word).
4. Stop once `endWord` is discovered (its level is the shortest length).
5. DFS backward from `endWord` through the `parents` map to `beginWord`, collecting all paths, then reverse each.

**Dry Run** (word list from Problem 16's example): level 1 discovers `hot`; level 2 discovers `dot, lot` (parents: `hot`); level 3 discovers `dog, log` (parents: `dot`, `lot` respectively); level 4 discovers `cog` with parents `[dog, log]` — both survive because they were staged in the same level before the set was pruned. Backtracking from `cog` yields both `hit→hot→dot→dog→cog` and `hit→hot→lot→log→cog`.

**Why Does It Work?** BFS still guarantees `endWord`'s discovery level is the true shortest length; deferring set removal to the level boundary preserves every equally-short path instead of letting an arbitrary first-discoverer monopolize a shared word.

**Java Code**

```java
public List<List<String>> findLadders(String beginWord, String endWord, List<String> wordList) {
    List<List<String>> result = new ArrayList<>();
    Set<String> words = new HashSet<>(wordList);
    if (!words.contains(endWord)) return result;
    Map<String, List<String>> parents = new HashMap<>();
    Set<String> currentLevel = new HashSet<>();
    currentLevel.add(beginWord);
    words.remove(beginWord);
    boolean found = false;
    while (!currentLevel.isEmpty() && !found) {
        Set<String> nextLevel = new HashSet<>();
        Set<String> toRemove = new HashSet<>();
        for (String word : currentLevel) {
            char[] chars = word.toCharArray();
            for (int pos = 0; pos < chars.length; pos++) {
                char orig = chars[pos];
                for (char ch = 'a'; ch <= 'z'; ch++) {
                    if (ch == orig) continue;
                    chars[pos] = ch;
                    String next = new String(chars);
                    if (words.contains(next)) {
                        nextLevel.add(next);
                        toRemove.add(next);
                        parents.computeIfAbsent(next, k -> new ArrayList<>()).add(word);
                        if (next.equals(endWord)) found = true;
                    }
                }
                chars[pos] = orig;
            }
        }
        words.removeAll(toRemove);
        currentLevel = nextLevel;
    }
    if (!found) return result;
    List<String> path = new ArrayList<>();
    path.add(endWord);
    backtrack(endWord, beginWord, parents, path, result);
    return result;
}
private void backtrack(String word, String begin, Map<String, List<String>> parents, List<String> path, List<List<String>> result) {
    if (word.equals(begin)) {
        List<String> seq = new ArrayList<>(path);
        Collections.reverse(seq);
        result.add(seq);
        return;
    }
    for (String p : parents.getOrDefault(word, Collections.emptyList())) {
        path.add(p);
        backtrack(p, begin, parents, path, result);
        path.remove(path.size() - 1);
    }
}
```

**Complexity**: Time Complexity Calculation: BFS layer construction is `O(N * L² * 26)` as in Problem 16; backtracking cost depends on the number of shortest paths, which can itself be exponential in pathological inputs, but is bounded by the DAG formed by `parents`. Space Complexity Calculation: `O(N * L)` for the map and sets, plus output size.

### Pattern to Remember

```text
Clue: "ALL shortest transformation sequences" (not just the length)
Pattern: BFS layer-by-layer with deferred (per-level) visited removal + parents map, then DFS backtrack
Mental model: unweighted shortest path (BFS) + path reconstruction
```

**Similar problems**: 16. **Interview tip**: explicitly flag _why_ per-word removal (Problem 16's trick) silently breaks correctness here — that's the exact bug interviewers watch for.

## 18. Number of Islands (LeetCode 200, Medium)

### Problem Understanding

Given a `'1'`/`'0'` grid, count 4-directionally connected islands.

### How to Think About the Problem

- This is Problem 6/8 verbatim — component counting on a grid.

### Intuition

```text
Same as Problem 6: BFS/DFS with visited[][], count starts
```

### Optimal Approach

**Core Observation / Pattern Identification**: identical to Problem 6; either mutate the grid (sink `'1'`→`'0'` on visit, saving `O(n*m)` visited memory) or keep a separate `visited[][]`.

**Java Code**

```java
public int numIslands(char[][] grid) {
    int n = grid.length, m = grid[0].length, islands = 0;
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (grid[r][c] == '1') {
            islands++;
            ArrayDeque<int[]> q = new ArrayDeque<>();
            q.add(new int[]{r,c}); grid[r][c] = '0';
            while (!q.isEmpty()) {
                int[] cur = q.poll();
                for (int[] d : dirs) {
                    int nr = cur[0]+d[0], nc = cur[1]+d[1];
                    if (nr<0||nr>=n||nc<0||nc>=m||grid[nr][nc]!='1') continue;
                    grid[nr][nc] = '0'; q.add(new int[]{nr,nc});
                }
            }
        }
    }
    return islands;
}
```

**Complexity**: Time Complexity Calculation: `O(n*m)`. Space Complexity Calculation: `O(1)` extra (mutating input) or `O(n*m)` with a separate `visited[][]`.

### Pattern to Remember

```text
Clue: "count islands / connected land regions"
Pattern: grid component counting, sink-on-visit
Mental model: component counting
```

**Similar problems**: 6, 8, 48, 49. **Interview tip**: ask if mutating the input grid is acceptable before sinking cells in place — otherwise use a `visited[][]`.

## 19. Is Graph Bipartite? (LeetCode 785, Medium)

### Problem Understanding

Given an undirected graph as an adjacency list, decide whether vertices can be 2-colored such that no edge connects two same-colored vertices.

**Example**: `[[1,3],[0,2],[1,3],[0,2]]` → bipartite (0,2 one color; 1,3 the other). A triangle `[[1,2],[0,2],[0,1]]` → not bipartite.

### How to Think About the Problem

- What should I notice first? Bipartite ⟺ no odd-length cycle. Coloring a graph with 2 colors while traversing is a direct way to test this: every edge must alternate colors, and a conflict means an odd cycle was found.
- Clue → Pattern: _"2-color", "no edge within same group"_ → BFS/DFS coloring.

### Intuition

```text
Try all 2^V colorings and check every edge: exponential
        ↓
Observation: color is forced the moment a neighbour is colored — no real choice exists once a component's start color is picked
        ↓
BFS/DFS assigning alternating colors, fail on same-color edge
```

### Optimal Approach

**Core Observation**: within one connected component, once you fix vertex `v`'s color, every other vertex's color is _forced_ by its distance parity from `v` along any path — so a single traversal either succeeds or finds a genuine conflict, never needing backtracking.

**Step-by-Step Intuition**

1. `color[] = -1` (uncolored) for all vertices; loop over components (graph may be disconnected).
2. BFS/DFS from an uncolored vertex with `color=0`.
3. For each neighbour: if uncolored, assign the opposite color and continue; if already colored the **same** as the current vertex, return `false`.
4. **Invariant**: every visited vertex's color equals `(BFS/DFS depth from the component's start) mod 2`.

**Why Does It Work?** If a conflict is found, the edge causing it, combined with the two paths back to a common ancestor, forms an odd-length cycle (two same-parity paths to a shared vertex plus the conflicting edge sum to an odd total) — and an odd cycle is provably impossible to 2-color.

**Java Code**

```java
public boolean isBipartite(int[][] graph) {
    int n = graph.length;
    int[] color = new int[n];
    Arrays.fill(color, -1);
    for (int i = 0; i < n; i++) {
        if (color[i] == -1) {
            if (!bfsColor(i, graph, color)) return false;
        }
    }
    return true;
}
private boolean bfsColor(int src, int[][] graph, int[] color) {
    ArrayDeque<Integer> q = new ArrayDeque<>();
    color[src] = 0; q.add(src);
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : graph[u]) {
            if (color[v] == -1) { color[v] = 1 - color[u]; q.add(v); }
            else if (color[v] == color[u]) return false;
        }
    }
    return true;
}
```

A DFS version replaces the queue with recursion and the same coloring rule.

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "2-color", "bipartite", "no odd cycle"
Pattern: BFS/DFS coloring, conflict on same-color neighbour
Mental model: BFS/DFS + cycle-parity argument
```

**Similar problems**: 11, 12. **Interview tip**: state the "bipartite ⟺ no odd cycle" equivalence up front — it explains _why_ 2-coloring is even the right idea.

## 20. Cycle Detection in a Directed Graph (DFS) — Hard

### Problem Understanding

Given a directed graph, determine if it contains a cycle, using DFS.

### How to Think About the Problem

- What should I notice first? The undirected "parent" trick (Problems 11/12) is wrong here — see below.
- Clue → Pattern: _"directed", "cycle"_ → DFS with a recursion-stack (`pathVisited`) array (§0.6).

### Intuition (Brute → Better → Optimal)

```text
Reuse Problem 12's parent-based check directly on a directed graph: WRONG — gives false negatives
        ↓
Observation: in a directed diamond A->B, A->C, B->D, C->D, D is visited twice from different parents with no actual cycle — "not equal to parent" alone can't tell a cross edge from a back edge
        ↓
Track the current recursion path explicitly (pathVisited[]); a hit on a vertex still on that path is a real cycle
```

### Brute Force Approach

**Basic idea**: naively reuse Problem 12's undirected cycle check by just ignoring edge direction.
**Why this is wrong (not just slow)**: consider `0->1, 0->2, 1->3, 2->3`. `3` gets visited from both `1` and `2`, and `2 != parent(3)=1`, so the undirected check incorrectly reports a cycle — there is none in the directed sense (it's a DAG, a diamond). The undirected algorithm is not just suboptimal here, it is **incorrect**.

### Optimal Approach

**Core Observation**: a directed cycle exists **iff** DFS revisits a vertex that is still on the _current recursion path_ — not merely "already visited at some point". Two separate boolean arrays are needed: `visited` (ever visited, for `O(V+E)` overall work) and `pathVisited` (currently on the stack, cleared on backtrack).

**Pattern Identification**: directed cycle detection via recursion-stack DFS (§0.6) — this exact array pair is reused later for topological-sort-by-DFS.

**Step-by-Step Intuition**

1. `visited[] = false`, `pathVisited[] = false` for all vertices.
2. DFS from every unvisited vertex: on entry, set both `visited[u]=true` and `pathVisited[u]=true`.
3. For each neighbour `v`: if unvisited, recurse; if visited **and** `pathVisited[v]` is true, a cycle exists.
4. On leaving `u` (all neighbours processed), set `pathVisited[u]=false` — this is the critical backtrack step that distinguishes "on my current path" from "visited long ago on a finished branch".

**Dry Run** on `0->1->2->0` (a real cycle): DFS enters `0` (`path={0}`), enters `1` (`path={0,1}`), enters `2` (`path={0,1,2}`), tries edge `2->0`: `0` is visited **and** still `pathVisited` → cycle correctly reported.

On the diamond `0->1,0->2,1->3,2->3` (no cycle): DFS enters `0,1,3`, finishes `3` (`pathVisited[3]=false`), backtracks to `1`, finishes `1`, backtracks to `0`, enters `2`, tries edge `2->3`: `3` is visited but **not** `pathVisited` (it already finished and left the path) → correctly not a cycle.

**Why Does It Work?** `pathVisited[v]==true` means there is a directed chain from `v` back down to the current vertex `u` (that's literally how `v` got onto the stack we're still inside) — so the edge `u->v` closes that chain into a cycle. A finished, popped-off vertex can never be part of a cycle with the current path, because no directed edge leads _back up_ the stack once you've left it.

**Java Code**

```java
boolean hasCycleDirected(int n, List<List<Integer>> adj) {
    boolean[] visited = new boolean[n], pathVisited = new boolean[n];
    for (int i = 0; i < n; i++) {
        if (!visited[i] && dfs(i, visited, pathVisited, adj)) return true;
    }
    return false;
}
private boolean dfs(int u, boolean[] visited, boolean[] pathVisited, List<List<Integer>> adj) {
    visited[u] = true; pathVisited[u] = true;
    for (int v : adj.get(u)) {
        if (!visited[v]) { if (dfs(v, visited, pathVisited, adj)) return true; }
        else if (pathVisited[v]) return true;
    }
    pathVisited[u] = false;
    return false;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` — each vertex entered once, each edge examined once. Space Complexity Calculation: `O(V)` for the two boolean arrays plus recursion depth.

### Pattern to Remember

```text
Clue: "cycle in a DIRECTED graph"
Pattern: DFS with visited[] + pathVisited[] (recursion stack), clear pathVisited on backtrack
Mental model: cycle detection (directed)
```

**Similar problems**: 21, 23, 24, 27. **Interview tip**: walk through the diamond counter-example out loud — it's the single clearest way to prove you understand _why_ the undirected trick fails here.

---

# PART C — Topological Sort and Problems (7 problems)

## 21. Topological Sort (DFS) — Hard

### Problem Understanding

Given a DAG, produce an ordering of vertices such that for every edge `u->v`, `u` appears before `v`.

### How to Think About the Problem

- Clue → Pattern: _"order respecting dependencies"_, graph explicitly a DAG → topological sort.
- Which traversal? DFS — reuse Problem 20's exact `visited`/DFS skeleton, adding a "push on finish" step. (No `pathVisited` needed here since the input is guaranteed a DAG — no cycle check required for this specific problem.)

### Intuition

```text
Try to build order greedily by degree without care: fragile / wrong if not done carefully
        ↓
Observation: a vertex is safe to place in the order only once everything IT depends on (everything reachable FROM it, in "finish first" DFS terms) is already placed
        ↓
DFS post-order: push a vertex onto a stack only after all its descendants are fully explored, then reverse
```

### Optimal Approach

**Core Observation**: a vertex finishes in DFS strictly after every vertex reachable from it has finished — so finishing order, reversed, respects every dependency edge.

**Step-by-Step Intuition**

1. `visited[] = false`; `ArrayDeque<Integer> stack` (used as a true stack via `push`).
2. DFS from every unvisited vertex; recurse into all neighbours first, **then** `stack.push(u)` — this is the post-order step.
3. Pop the stack fully (or reverse it) to get the topological order.
4. **Invariant**: when `u` is pushed, every vertex `u` can reach has already been pushed (they're deeper in the stack), so popping gives dependencies-first order... more precisely, since edges go `u -> v` meaning `u` depends on nothing and `v` comes after, and `v` finishes (is pushed) before `u`, popping the stack from the top gives `u` before `v` — exactly the required order.

**Dry Run** on `5->0, 4->0, 5->2, 2->3, 3->1, 4->1`:
DFS from 5: visit 0 (finishes immediately, push 0), visit 2 → visit 3 → visit 1 (finishes, push 1) → 3 finishes (push 3) → 2 finishes (push 2) → 5 finishes (push 5). DFS from 4 (unvisited): 0,1 already visited → 4 finishes (push 4). Stack bottom→top: `0,1,3,2,5,4`. Popped order: `4,5,2,3,1,0` — a valid topological order.

**Why Does It Work?** Because DFS only pushes `u` after _every_ vertex reachable from `u` has already finished (and thus already been pushed lower in the stack), popping top-to-bottom can never present a vertex before something it depends on.

**Java Code**

```java
List<Integer> topoSortDFS(int n, List<List<Integer>> adj) {
    boolean[] visited = new boolean[n];
    ArrayDeque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (!visited[i]) dfs(i, visited, adj, stack);
    List<Integer> order = new ArrayList<>();
    while (!stack.isEmpty()) order.add(stack.pop());
    return order;
}
private void dfs(int u, boolean[] visited, List<List<Integer>> adj, ArrayDeque<Integer> stack) {
    visited[u] = true;
    for (int v : adj.get(u)) if (!visited[v]) dfs(v, visited, adj, stack);
    stack.push(u);
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V)` for visited + stack + recursion depth.

### Pattern to Remember

```text
Clue: "order respecting dependencies", DAG guaranteed
Pattern: DFS, push on FINISH, reverse/pop for the order
Mental model: topological ordering
```

**Similar problems**: 22, 24, 25, 27. **Interview tip**: say "push on finish, not on entry" explicitly — it's the one line that's easy to get backwards under pressure.

## 22. Topological Sort — Kahn's Algorithm (BFS) — Hard

### Problem Understanding

Same output as Problem 21, computed with a BFS-flavored algorithm based on in-degrees instead of DFS finish order.

### How to Think About the Problem

- Clue → Pattern: same dependency-ordering question, but a BFS-shaped (level-by-level, queue-driven) solution is requested — useful because it doubles as cycle detection (Problem 23) without extra bookkeeping.

### Intuition

```text
DFS post-order (Problem 21): correct but recursive, and doesn't directly expose "is this a DAG" as a byproduct
        ↓
Observation: a vertex with in-degree 0 has no unmet dependency and can safely go first; removing it only lowers its neighbours' in-degree, potentially freeing them next
        ↓
Kahn's: queue of in-degree-0 vertices, "remove" by decrementing neighbours' in-degree
```

### Optimal Approach

**Core Observation**: in-degree 0 literally means "nothing left to wait for" — processing all such vertices, then re-checking what newly reaches in-degree 0, is BFS applied to the _dependency_ structure instead of raw edges.

**Step-by-Step Intuition**

1. Compute `indegree[v]` for every vertex by scanning all edges once.
2. Push every vertex with `indegree==0` into a queue.
3. Pop `u`, append to result. For each neighbour `v`: `indegree[v]--`; if it hits `0`, push `v`.
4. Repeat until the queue is empty. **Invariant**: a vertex is only ever pushed once every one of its prerequisites has already been popped (its in-degree only reaches 0 after all incoming edges' sources are processed).

**Dry Run** on the same graph as Problem 21 (`5->0,4->0,5->2,2->3,3->1,4->1`): initial indegrees `0:2,1:2,2:1,3:1,4:0,5:0` → queue starts `[4,5]`. Pop `4` → indeg[0]→1, indeg[1]→1. Pop `5` → indeg[0]→0 (push 0), indeg[2]→0 (push 2). Pop `0`. Pop `2` → indeg[3]→0 (push 3). Pop `3` → indeg[1]→0 (push 1). Pop `1`. Order: `4,5,0,2,3,1` — valid.

**Why Does It Work?** By construction a vertex is enqueued exactly when its last remaining prerequisite has just been processed, so the processing order can never place a vertex before something it depends on.

**Java Code**

```java
List<Integer> topoSortKahn(int n, List<List<Integer>> adj) {
    int[] indegree = new int[n];
    for (int u = 0; u < n; u++) for (int v : adj.get(u)) indegree[v]++;
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.add(i);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll();
        order.add(u);
        for (int v : adj.get(u)) if (--indegree[v] == 0) q.add(v);
    }
    return order;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` — in-degree computation is `O(E)`, the queue loop touches each vertex once and each edge once. Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "prerequisites", "build order", explicitly wants a BFS-style solution
Pattern: indegree array + queue of zero-indegree vertices, decrement on pop
Mental model: topological ordering (Kahn's / BFS)
```

**Similar problems**: 21, 23, 24, 25, 26. **Interview tip**: mention up front that Kahn's gives cycle detection "for free" (Problem 23) — DFS topo sort needs a separate `pathVisited` check to get the same guarantee.

## 23. Detect a Cycle in a Directed Graph (BFS / Kahn) — Hard

### Problem Understanding

Determine if a directed graph has a cycle, using Kahn's algorithm rather than DFS.

### How to Think About the Problem

- Clue → Pattern: this is Problem 22 with one added check — if Kahn's algorithm can't process all `V` vertices, a cycle exists.

### Intuition

```text
Run Kahn's exactly as in Problem 22
        ↓
Observation: a vertex trapped in a cycle NEVER reaches indegree 0, because at least one of its incoming edges belongs to the cycle and its source never gets processed
        ↓
count processed vertices; if count < V, a cycle exists among the unprocessed ones
```

### Optimal Approach

**Core Observation**: every vertex not part of any cycle, and not downstream of one, eventually reaches in-degree 0 and gets processed; vertices inside (or purely downstream of) a cycle never do, because their in-degree can never fully drain.

**Java Code**

```java
boolean hasCycleDirectedKahn(int n, List<List<Integer>> adj) {
    int[] indegree = new int[n];
    for (int u = 0; u < n; u++) for (int v : adj.get(u)) indegree[v]++;
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) q.add(i);
    int processed = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        processed++;
        for (int v : adj.get(u)) if (--indegree[v] == 0) q.add(v);
    }
    return processed != n;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "cycle in directed graph", BFS/Kahn's explicitly requested
Pattern: Kahn's algorithm, processed count != V => cycle
Mental model: cycle detection (directed) via topological ordering
```

**Similar problems**: 20, 22, 24. **Interview tip**: this is the cleanest possible answer to "detect a directed cycle without recursion" — mention it when recursion-depth limits are a concern.

## 24. Course Schedule I (LeetCode 207, Medium)

### Problem Understanding

Given `numCourses` and `prerequisites[i] = [a, b]` (must take `b` before `a`), return whether it's possible to finish all courses (i.e., no cyclic dependency).

### How to Think About the Problem

- Clue → Pattern: "prerequisite" is the canonical topological-sort keyword; the question "is it possible at all" is exactly Problem 23's cycle check, with edges built as `b -> a`.

### Intuition

```text
Model as directed graph edges b -> a (b before a)
        ↓
Run Kahn's; if processed == numCourses, no cycle, answer true
```

### Optimal Approach

**Core Observation / Pattern Identification**: identical to Problem 23, only the edge direction convention from the input needs care: `[a,b]` means `b` must come first, so the edge is `b -> a`.

**Java Code**

```java
public boolean canFinish(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[numCourses];
    for (int[] p : prerequisites) {
        adj.get(p[1]).add(p[0]);
        indegree[p[0]]++;
    }
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.add(i);
    int processed = 0;
    while (!q.isEmpty()) {
        int u = q.poll(); processed++;
        for (int v : adj.get(u)) if (--indegree[v] == 0) q.add(v);
    }
    return processed == numCourses;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` where `V=numCourses`, `E=prerequisites.length`. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "prerequisite", "can finish all courses"
Pattern: Kahn's cycle detection, edges built as (prereq -> course)
Mental model: topological ordering / cycle detection
```

**Similar problems**: 23, 25. **Interview tip**: double check edge direction against the input convention out loud — it's the single most common off-by-reverse bug in this family.

## 25. Course Schedule II (LeetCode 210, Medium)

### Problem Understanding

Same as Problem 24, but return an actual valid course order, or `[]` if impossible.

### How to Think About the Problem

- Clue → Pattern: Problem 24 plus Problem 22 combined — Kahn's naturally builds the order as a side effect of processing; just also check `processed == numCourses` before returning it.

### Optimal Approach

**Core Observation**: the `order` list built during Kahn's _is_ the answer — no separate step needed beyond validating completeness.

**Java Code**

```java
public int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
    int[] indegree = new int[numCourses];
    for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indegree[p[0]]++; }
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < numCourses; i++) if (indegree[i] == 0) q.add(i);
    int[] order = new int[numCourses];
    int idx = 0;
    while (!q.isEmpty()) {
        int u = q.poll();
        order[idx++] = u;
        for (int v : adj.get(u)) if (--indegree[v] == 0) q.add(v);
    }
    return idx == numCourses ? order : new int[0];
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "return AN order of prerequisites" (not just yes/no)
Pattern: Kahn's algorithm, return the process order itself
Mental model: topological ordering
```

**Similar problems**: 22, 24. **Interview tip**: note any valid topological order is acceptable — there's no "the" unique answer unless the judge specifies tie-breaking.

## 26. Find Eventual Safe States (LeetCode 802, Medium)

### Problem Understanding

A node is "safe" if every path starting there eventually leads to a terminal node (no outgoing edges) — i.e., no path from it enters a cycle. Return all safe nodes, sorted.

**Example**: `graph=[[1,2],[2,3],[5],[0],[5],[],[]]` → nodes `2,4,5,6` are safe.

### How to Think About the Problem

- What should I notice first? "Safe" is defined in terms of _outgoing_ reachability into a cycle — that's naturally a forward-DFS cycle check (Problem 20's `pathVisited`), **or** it can be flipped: reverse every edge, and a node is safe iff, in the reversed graph, it's reachable via Kahn's-processed (non-cyclic) territory — terminal nodes become sources.
- Clue → Pattern: _"eventually leads to a dead end / terminal"_, _"no path enters a cycle"_ → directed cycle detection, flagging every node that can reach a cycle as unsafe.

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every node, DFS/BFS every path exhaustively checking for cycles, O(V*(V+E))
        ↓
Observation: reuse Problem 20's pathVisited DFS — a node is UNSAFE iff its DFS subtree contains any cycle; this can be memoized per node in one shared pass with 3-state coloring
        ↓
Single DFS pass, O(V+E), 3-color (unvisited / in-progress / safe)
```

### Brute Force Approach

**Basic idea**: run a fresh cycle-reachability check from every node.
**Time Complexity Calculation**: `O(V*(V+E))` — a full traversal per node.
**Why can this be improved?** Safety is a property that, once determined for a node, never needs to be recomputed — memoize it.

### Optimal Approach

**Core Observation**: extend Problem 20's `visited`/`pathVisited` DFS with a third outcome, "known safe", memoized once computed — a node is unsafe iff it is currently on the recursion path (a cycle) or any neighbour is unsafe.

**Pattern Identification**: directed cycle detection (§0.6) + memoization; equivalently, this is Kahn's algorithm run on the **reverse** graph (terminal nodes are in-degree 0 in the reversed graph, and Kahn's processed set = safe nodes) — either approach is valid and worth mentioning both.

**Step-by-Step Intuition (DFS + 3-color)**

1. `state[] = UNVISITED` for all nodes (`0=unvisited, 1=visiting, 2=safe, 3=unsafe`).
2. DFS from every unvisited node: mark `state[u]=visiting`.
3. For each neighbour `v`: if `state[v]==visiting` → cycle → `u` is unsafe. If `state[v]==unvisited`, recurse; if that recursion reports unsafe, `u` is unsafe.
4. If no neighbour caused `unsafe`, mark `state[u]=safe`.
5. **Invariant**: once a node's state is `safe` or `unsafe`, it is never recomputed — each node's true classification is discovered exactly once.

**Why Does It Work?** A node is unsafe exactly when some outgoing path re-enters the current recursion stack (a cycle) or reaches another already-proven-unsafe node; both cases are captured by "any neighbour is unsafe or currently `visiting`" — which is precisely Problem 20's cycle test, generalized with memoization.

**Java Code**

```java
public List<Integer> eventualSafeNodes(int[][] graph) {
    int n = graph.length;
    int[] state = new int[n]; // 0=unvisited,1=visiting,2=safe,3=unsafe
    List<Integer> result = new ArrayList<>();
    for (int i = 0; i < n; i++) {
        if (isSafe(i, graph, state)) result.add(i);
    }
    return result;
}
private boolean isSafe(int u, int[][] graph, int[] state) {
    if (state[u] == 2) return true;
    if (state[u] == 3 || state[u] == 1) return false;
    state[u] = 1;
    for (int v : graph[u]) {
        if (!isSafe(v, graph, state)) { state[u] = 3; return false; }
    }
    state[u] = 2;
    return true;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` — each node's state is finalized once, each edge examined once overall. Space Complexity Calculation: `O(V)` for `state[]` plus recursion depth.

### Pattern to Remember

```text
Clue: "eventually leads to a terminal node", "no path enters a cycle"
Pattern: DFS cycle detection with memoized 3-state coloring (or Kahn's on the reversed graph)
Mental model: directed cycle detection, memoized
```

**Similar problems**: 20, 14, 15. **Interview tip**: mention the reverse-graph-plus-Kahn's alternative even if you implement the DFS version — showing both angles signals depth.

## 27. Alien Dictionary (LeetCode 269, Hard)

### Problem Understanding

Given a list of words from an alien language, sorted lexicographically by that language's unknown alphabet order, determine one valid character ordering (or detect that none exists).

**Example**: `["wrt","wrf","er","ett","rftt"]` → one valid order is `"wertf"`.

### How to Think About the Problem

- What should I notice first? Compare each **adjacent** pair of words; the first differing character gives a "comes-before" edge between two letters. That's it — the rest is Problem 21/22's topological sort on the alphabet.
- Clue → Pattern: _"derive an ordering from pairwise comparisons"_ → build a small graph (≤26 nodes) of letter precedence, topologically sort it.
- Edge case: if word `A` is a prefix of word `B` but appears _after_ it (`["abc","ab"]`), that's an invalid input — no ordering can make a longer string sort before its own prefix.

### Intuition (Brute → Better → Optimal)

```text
Brute force: try all 26! letter orders, check validity, absurd
        ↓
Observation: only ADJACENT word pairs constrain letter order, and only the FIRST differing character per pair matters
        ↓
Build a graph of at most 26 letters from first-differing-characters, topologically sort it
```

### Brute Force Approach

Conceptually permute all letters and validate — infeasible (`26!`). **Why can this be improved?** Almost all letter-pairs are unconstrained by the input; only the handful of first-differing-character pairs carry real information.

### Optimal Approach

**Core Observation**: for each adjacent pair of words `(w1, w2)`, walk both simultaneously; the **first** index where characters differ gives exactly one edge `w1[i] -> w2[i]` ("comes before"). Characters after that point carry no ordering information (that's why only the first difference counts).

**Pattern Identification**: topological ordering (§0.7) on an implicit ≤26-node graph built from comparisons — mirrors Problem 21/22's machinery exactly once the graph is built.

**Step-by-Step Intuition**

1. Initialize `adj` for 26 letters (or only the letters actually present) and `indegree[]`.
2. For each adjacent word pair `(w1,w2)`: find the first index `i` where `w1.charAt(i) != w2.charAt(i)`. If found, add edge `w1[i] -> w2[i]` (skip duplicate edges to avoid double-counting indegree). If no such index exists and `w1.length() > w2.length()`, the input is invalid (prefix-order violation) — return `""`.
3. Run Kahn's algorithm (Problem 22) over the letter graph.
4. If the resulting order covers all letters that appeared, join them into a string; otherwise (fewer letters processed than exist) a cycle exists among letters → return `""`.

**Dry Run** on `["wrt","wrf","er","ett","rftt"]`: pairs give edges `t->f` (wrt vs wrf), `w->e` (wrt vs er... first char w vs e), `r->t` (er vs ett), `e->r` (ett vs rftt, first char e vs r). Kahn's on `{w,e,r,t,f}` with these edges yields an order like `w,e,r,t,f` — matches `"wertf"`.

**Why Does It Work?** Every adjacent-pair comparison in a validly-sorted list encodes exactly one real precedence constraint (the first differing letter); topological sort is precisely the algorithm for turning a set of pairwise "comes before" constraints into one consistent global order, and it detects contradictions (cycles) automatically.

**Java Code**

```java
public String alienOrder(String[] words) {
    Map<Character, Set<Character>> adj = new HashMap<>();
    Map<Character, Integer> indegree = new HashMap<>();
    for (String w : words) for (char c : w.toCharArray()) { adj.putIfAbsent(c, new HashSet<>()); indegree.putIfAbsent(c, 0); }

    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i+1];
        int minLen = Math.min(w1.length(), w2.length());
        boolean found = false;
        for (int j = 0; j < minLen; j++) {
            char c1 = w1.charAt(j), c2 = w2.charAt(j);
            if (c1 != c2) {
                if (adj.get(c1).add(c2)) indegree.merge(c2, 1, Integer::sum);
                found = true;
                break;
            }
        }
        if (!found && w1.length() > w2.length()) return ""; // prefix violation
    }

    ArrayDeque<Character> q = new ArrayDeque<>();
    for (char c : indegree.keySet()) if (indegree.get(c) == 0) q.add(c);
    StringBuilder order = new StringBuilder();
    while (!q.isEmpty()) {
        char u = q.poll();
        order.append(u);
        for (char v : adj.get(u)) if (indegree.merge(v, -1, Integer::sum) == 0) q.add(v);
    }
    return order.length() == indegree.size() ? order.toString() : "";
}
```

**Complexity**: Time Complexity Calculation: comparing adjacent word pairs costs `O(sum of word lengths) = O(NL)` where `N` = word count, `L` = max word length; the topological sort over at most 26 letters is `O(26 + edges) = O(1)` relative to input size. Total: `O(N*L)`. Space Complexity Calculation: `O(1)` for the letter graph (bounded by 26), `O(NL)` for input storage.

### Pattern to Remember

```text
Clue: "derive character/item order from a sorted list of sequences"
Pattern: build a small precedence graph from first-differing elements of adjacent pairs, topologically sort
Mental model: topological ordering, graph built from pairwise comparisons
```

**Similar problems**: 21, 22, 24, 25. **Interview tip**: state both edge cases out loud — the prefix-violation case (`"abc"` before `"ab"`) and the "not all letters covered ⟹ cycle" case; both are frequently missed.

---

# PART D — Shortest Path Algorithms and Problems (13 problems)

## 28. Shortest Path in Undirected Graph with Unit Weights — Hard

### Problem Understanding

Given an undirected graph with every edge weight `1`, and a source, return the shortest distance from source to every vertex (`-1` if unreachable).

### How to Think About the Problem

- Clue → Pattern: unit weights + shortest path is the textbook BFS case (§0.4) — no priority queue needed at all, because BFS levels already _are_ shortest distances when every edge costs the same.

### Intuition

```text
Dijkstra with all weights = 1: correct but pays O(log V) per pop for no benefit
        ↓
Observation: with uniform weights, FIFO order already processes vertices in increasing true distance
        ↓
Plain BFS with a dist[] array, O(V+E)
```

### Optimal Approach

**Core Observation**: Dijkstra's priority queue exists to always expand the currently-nearest frontier vertex; with unit weights, a plain FIFO queue already guarantees that ordering "for free", since BFS levels strictly increase by exactly 1 per hop.

**Java Code**

```java
int[] shortestPathUnitWeights(int n, List<List<Integer>> adj, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    ArrayDeque<Integer> q = new ArrayDeque<>();
    dist[src] = 0; q.add(src);
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : adj.get(u)) {
            if (dist[v] == -1) { dist[v] = dist[u] + 1; q.add(v); }
        }
    }
    return dist;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "unweighted", "unit weight", "minimum number of edges"
Pattern: plain BFS with a dist[] array instead of visited[]
Mental model: unweighted shortest path
```

**Similar problems**: 4, 16, 32. **Interview tip**: explicitly say "I don't need Dijkstra here" — recognizing when the heavier tool is unnecessary is itself the signal being tested.

## 29. Shortest Path in a DAG — Hard

### Problem Understanding

Given a weighted **DAG** (possibly negative weights, but no cycles) and a source, find the shortest distance to every vertex.

### How to Think About the Problem

- What should I notice first? Because it's acyclic, there's a topological order in which, by the time you _process_ a vertex, every possible way to improve its distance has already happened — no need for Dijkstra's greedy priority queue or Bellman-Ford's repeated passes.
- Clue → Pattern: _"DAG"_ + _"shortest path"_, possibly with negative weights → topological order + single relaxation pass.

### Intuition (Brute → Better → Optimal)

```text
Dijkstra: works only for non-negative weights, O((V+E) log V), wasted generality
        ↓
Observation: relaxing edges strictly in topological order guarantees a vertex's distance is finalized the moment it's processed — one pass suffices
        ↓
Topological sort + single relaxation pass, O(V+E)
```

### Optimal Approach

**Core Observation**: relaxing outgoing edges in topological order means, by the time vertex `u` is processed, `dist[u]` has already received every possible relaxation from its predecessors (they all come earlier in topo order) — so `dist[u]` is final right when you reach it, letting you push its own relaxations onward exactly once.

**Step-by-Step Intuition**

1. Topologically sort the DAG (DFS finish-stack, Problem 21).
2. `dist[] = infinity`, `dist[src] = 0`.
3. Process vertices in topological order starting from `src`'s position: for each `u`, for each edge `(u,v,w)`, relax `dist[v] = min(dist[v], dist[u]+w)`.
4. **Invariant**: when `u` is processed, `dist[u]` is already optimal, because every edge that could improve it comes from an earlier-in-topo-order vertex, already processed.

**Why Does It Work?** In a DAG, topological order is a linear extension of the "depends on" partial order — relaxation is a monotonic operation (`dist` only ever decreases), so processing predecessors-before-successors guarantees no vertex is finalized too early.

**Java Code**

```java
int[] shortestPathDAG(int n, List<List<int[]>> adj) { // adj: (u) -> list of {v, w}
    boolean[] visited = new boolean[n];
    ArrayDeque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (!visited[i]) topoDfs(i, visited, adj, stack);
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[stack.peek() == null ? 0 : 0] = 0; // set the actual source's dist to 0 before this call in practice
    while (!stack.isEmpty()) {
        int u = stack.pop();
        if (dist[u] != Integer.MAX_VALUE) {
            for (int[] edge : adj.get(u)) {
                int v = edge[0], w = edge[1];
                if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
            }
        }
    }
    return dist;
}
private void topoDfs(int u, boolean[] visited, List<List<int[]>> adj, ArrayDeque<Integer> stack) {
    visited[u] = true;
    for (int[] edge : adj.get(u)) if (!visited[edge[0]]) topoDfs(edge[0], visited, adj, stack);
    stack.push(u);
}
```

(In practice, set `dist[src] = 0` right after allocating `dist[]`, before the popping loop — shown inline above for clarity of the invariant.)

**Complexity**: Time Complexity Calculation: `O(V+E)` for the topo sort, `O(V+E)` for the relaxation pass → `O(V+E)` total. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "DAG", "shortest path", possibly negative weights
Pattern: topological sort + one relaxation pass in that order
Mental model: shortest path family, DAG specialization
```

**Similar problems**: 21, 30, 38. **Interview tip**: mention this beats Dijkstra specifically _because_ the DAG structure removes the need to "discover" the optimal processing order via a priority queue — topo sort computes it directly.

## 30. Dijkstra's Algorithm (Priority Queue) — Hard

### Problem Understanding

Given a weighted graph with **non-negative** weights and a source, find the shortest distance to every vertex.

### How to Think About the Problem

- What should I notice first? Weights vary and can't be assumed acyclic — BFS (unit only) and DAG-topo-sort (acyclic only) both fail here; need a genuinely greedy approach.
- Clue → Pattern: _"non-negative weighted shortest path"_ → Dijkstra: always expand the currently-cheapest known frontier vertex, using a min-priority-queue keyed by distance.

### Intuition (Brute → Better → Optimal)

```text
Brute force: try all paths (or Bellman-Ford's V-1 blind passes), correct but O(V*E), ignores the fact that a min-heap can pick the right next vertex directly
        ↓
Observation: once you've popped the globally-smallest tentative distance in the queue, that distance can NEVER be improved later (all other edges have non-negative weight, so no future relaxation can undercut it)
        ↓
Priority-queue-greedy relaxation: pop-min, relax neighbours, O((V+E) log V)
```

### Brute Force Approach

Bellman-Ford-style blind relaxation of all edges `V-1` times ignores the extra structure that non-negative weights provide (see Problem 38) — correct here but slower, `O(V*E)` vs Dijkstra's `O((V+E) log V)`.
**Why can this be improved?** With non-negative weights, we don't need to blindly relax everything repeatedly — a priority queue lets us always process vertices in true final-distance order directly.

### Optimal Approach

**Core Observation**: the vertex with the smallest tentative distance currently in the priority queue has a **final, correct** distance the moment it's popped — because every other path to it would have to go through some other, larger-or-equal-distance vertex first, and since all weights are non-negative, that path can only be longer.

**Pattern Identification**: greedy relaxation via min-heap (§0.8), the canonical "Dijkstra family" entry.

**Step-by-Step Intuition**

1. `dist[] = infinity`, `dist[src] = 0`. Min-heap of `(distance, vertex)`, seeded with `(0, src)`.
2. Pop the minimum `(d, u)`. If `d > dist[u]` (a stale duplicate entry), skip it.
3. For each edge `(u, v, w)`: if `dist[u] + w < dist[v]`, update `dist[v]` and push `(dist[v], v)` — note the old, now-stale entry for `v` is simply left in the heap; it will be skipped later by the staleness check.
4. Repeat until the heap is empty. **Invariant**: a vertex, once popped for the first time (i.e., not a stale duplicate), has its truly final shortest distance.

**Dry Run** on `0-1(w4), 0-2(w1), 2-1(w2), 1-3(w1), 2-3(w5)`, source `0`:

| Pop                        | dist[] state after relax     |
| -------------------------- | ---------------------------- |
| (0,0)                      | dist[1]=4, dist[2]=1         |
| (1,2)                      | dist[1]=3 (via 2), dist[3]=6 |
| (3,1)                      | dist[3]=4 (via 1)            |
| (4,1) stale (dist[1] is 3) | skip                         |
| (4,3) stale                | skip                         |

Final: `dist = [0,3,1,4]`.

**Why Does It Work?** Formal proof sketch: suppose the popped vertex `u`'s distance `d` were not truly minimal — then some shorter true path to `u` exists, and that path's last edge comes from some vertex `x` with `dist[x] < d` not yet popped, but `x` would have to already be in the heap with a smaller key than `d` (all edge weights `≥0`), contradicting that `u` was the minimum popped. Non-negative weights are essential to this argument — a negative edge could let a "finalized" distance be undercut later.

**Java Code**

```java
int[] dijkstra(int n, List<List<int[]>> adj, int src) { // adj: u -> list of {v, w}
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]); // {dist, vertex}
    pq.add(new int[]{0, src});
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue; // stale
        for (int[] edge : adj.get(u)) {
            int v = edge[0], w = edge[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.add(new int[]{dist[v], v});
            }
        }
    }
    return dist;
}
```

**Complexity**: Time Complexity Calculation: each edge can push at most one heap entry, so up to `O(E)` heap operations, each `O(log E) = O(log V)` → `O(E log V)`, commonly written `O((V+E) log V)`. Space Complexity Calculation: `O(V+E)` for the graph, `O(E)` for the heap in the worst case.

### Pattern to Remember

```text
Clue: "shortest path", weights given, all non-negative
Pattern: min-heap greedy relaxation, pop-min is final, skip stale duplicates
Mental model: Dijkstra (shortest path family)
```

**Similar problems**: 31, 33, 35, 36. **Interview tip**: explicitly state _why_ non-negative weights are required for the greedy argument — that's the natural bridge into Problem 38 (Bellman-Ford) when negatives appear.

## 31. Dijkstra's Algorithm (Set version) — why a PQ/set is the right structure — Hard

### Problem Understanding

Same as Problem 30, implemented with a `TreeSet<int[]>` (ordered set) instead of a `PriorityQueue`, to enable an extra operation: removing a specific stale entry before inserting the updated one (rather than merely skipping stale pops later).

### How to Think About the Problem

- What should I notice first? A `PriorityQueue` can't efficiently _remove_ an arbitrary element (`O(n)` scan) — only `TreeSet` gives `O(log n)` removal by value, letting you keep exactly one entry per vertex if you want that discipline.
- Clue → Pattern: same Dijkstra core, different data structure trade-off — worth knowing both because interviewers sometimes explicitly forbid duplicate heap entries.

### Intuition

```text
PriorityQueue + "skip stale on pop": simplest, allows up to O(E) duplicate entries, still O(E log V) overall — this is the standard, recommended approach
        ↓
TreeSet: remove the OLD (dist[v], v) pair before inserting the new one, keeping the set size bounded by V instead of E
        ↓
Both are O((V+E) log V); TreeSet trades a slightly more intricate update step for a smaller structure
```

### Optimal Approach

**Core Observation**: a `TreeSet<int[]>` ordered by `(distance, vertex)` supports `O(log V)` removal of the exact stale pair, so relaxation can be "update in place" instead of "insert a new duplicate and filter later" — purely an implementation-style choice, not a complexity improvement.

**Java Code**

```java
int[] dijkstraSet(int n, List<List<int[]>> adj, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    TreeSet<int[]> set = new TreeSet<>((a, b) -> a[0] != b[0] ? a[0]-b[0] : a[1]-b[1]);
    set.add(new int[]{0, src});
    while (!set.isEmpty()) {
        int[] top = set.pollFirst();
        int d = top[0], u = top[1];
        for (int[] edge : adj.get(u)) {
            int v = edge[0], w = edge[1];
            if (d + w < dist[v]) {
                if (dist[v] != Integer.MAX_VALUE) set.remove(new int[]{dist[v], v});
                dist[v] = d + w;
                set.add(new int[]{dist[v], v});
            }
        }
    }
    return dist;
}
```

**Complexity**: Time Complexity Calculation: `O((V+E) log V)` — same asymptotic bound as the PQ version, since `TreeSet` operations are `O(log n)` just like heap operations. Space Complexity Calculation: `O(V)` for the set (bounded, unlike the PQ's up-to-`O(E)`).

### Pattern to Remember

```text
Clue: "why not just a queue", "avoid duplicate entries"
Pattern: TreeSet ordered by (dist, vertex), remove-then-reinsert on relax
Mental model: Dijkstra, alternate data structure
```

**Similar problems**: 30. **Interview tip**: the honest answer to "PQ vs Set" is "PQ is simpler and asymptotically identical; Set is worth mentioning only if bounded structure size or explicit removal matters to the interviewer."

## 32. Shortest Path in a Binary Maze (LeetCode 1091, Medium)

### Problem Understanding

`n x n` binary grid (`0`=open, `1`=blocked), 8-directional moves. Find the shortest path length (number of cells visited) from top-left to bottom-right, or `-1`.

### How to Think About the Problem

- What should I notice first? Every allowed move costs exactly `1` — this is Problem 28 (unit-weight BFS) on a grid instead of an adjacency list. Dijkstra would work but is unnecessary overhead.
- Clue → Pattern: _"shortest path"_ + _"uniform move cost"_ → plain BFS with `dirs[]` covering all 8 directions.

### Intuition

```text
Dijkstra on the grid: correct but pays log-factor for uniform weights, unnecessary
        ↓
Observation: same reasoning as Problem 28 — unit weights mean BFS levels already equal shortest distances
        ↓
Plain grid BFS, 8-directional, O(n^2)
```

### Optimal Approach

**Core Observation / Pattern Identification**: identical to Problem 28, grid variant with an 8-direction array.

**Java Code**

```java
public int shortestPathBinaryMatrix(int[][] grid) {
    int n = grid.length;
    if (grid[0][0] == 1 || grid[n-1][n-1] == 1) return -1;
    int[][] dirs = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
    boolean[][] visited = new boolean[n][n];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    q.add(new int[]{0,0,1}); visited[0][0] = true;
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        if (cur[0] == n-1 && cur[1] == n-1) return cur[2];
        for (int[] d : dirs) {
            int nr = cur[0]+d[0], nc = cur[1]+d[1];
            if (nr<0||nr>=n||nc<0||nc>=n||visited[nr][nc]||grid[nr][nc]==1) continue;
            visited[nr][nc] = true;
            q.add(new int[]{nr, nc, cur[2]+1});
        }
    }
    return -1;
}
```

**Complexity**: Time Complexity Calculation: `O(n²)` — each cell visited once, `O(8)` work each. Space Complexity Calculation: `O(n²)`.

### Pattern to Remember

```text
Clue: "shortest path in a grid", uniform move cost, 8-directional
Pattern: plain BFS, dirs[] with 8 entries
Mental model: unweighted shortest path, grid variant
```

**Similar problems**: 28, 13. **Interview tip**: catch the immediate-blocked-start/end edge case before writing the BFS loop.

## 33. Path with Minimum Effort (LeetCode 1631, Hard)

### Problem Understanding

Grid of heights; moving between adjacent cells costs `|height difference|`; "effort" of a path is the **maximum** single-step cost along it. Find the path from top-left to bottom-right minimizing that maximum.

### How to Think About the Problem

- What should I notice first? This is not "sum the weights, minimize total" (ordinary Dijkstra) — it's "minimize the _worst single step_". That's a different objective, but relaxation still works if you redefine what's being relaxed: `effort[v] = max(effort[u], |h[u]-h[v]|)` instead of `dist[u] + w`.
- Clue → Pattern: _"minimize the maximum edge on a path"_ → Dijkstra-variant (replace `+` with `max` in the relaxation) **or** binary search on the answer + BFS/DFS reachability check with a fixed threshold — two equally valid optimal approaches worth naming both.

### Intuition (Brute → Better → Optimal)

```text
Brute force: try every path (DFS backtracking), exponential
        ↓
Observation 1: "minimize the max edge" is monotonic in a threshold T — if a path exists using only steps <= T, one also exists for any T' > T. That monotonicity is exactly what makes binary search on T valid.
        ↓
Observation 2: alternatively, Dijkstra's greedy argument still holds if relaxation uses max() instead of +, since a smaller max-so-far vertex still can't be beaten later by a larger-max path (given non-negative step costs)
        ↓
Either: binary search on T + BFS reachability check, O(n*m*log(maxHeight))
    Or: Dijkstra-variant with max() relaxation, O(n*m*log(n*m))
```

### Brute Force Approach

Exhaustive DFS/backtracking over all paths, tracking the running maximum step, keeping the best. Exponential in grid size — infeasible beyond tiny grids.
**Why can this be improved?** Both structural facts above (monotonicity, and the greedy argument surviving a `max`-based relaxation) let us avoid enumerating paths entirely.

### Optimal Approach (Dijkstra-variant, shown primary)

**Core Observation**: replace the relaxation rule with `newEffort = max(effort[u], |height[u]-height[v]|)`; the same "pop-min is final" proof from Problem 30 still holds because `max` is still monotonic non-decreasing along any path (adding a step never _decreases_ the running maximum).

**Pattern Identification**: Dijkstra family, custom relaxation operator (§0.8's generality — the "+w" is not sacred, any monotonic combine works).

**Step-by-Step Intuition**

1. `effort[][] = infinity`, `effort[0][0] = 0`. Min-heap of `(effort, r, c)`.
2. Pop the minimum; for each of the 4 neighbours, compute `candidate = max(effort[u], |h[u]-h[v]|)`; relax if smaller.
3. Stop early once `(n-1, m-1)` is popped (finalized), or run to completion and read `effort[n-1][m-1]`.

**Why Does It Work?** Same proof shape as Dijkstra: the popped minimum can't be improved later because every alternative route to it must pass through a vertex with `effort ≥` the current minimum in the heap, and taking a `max` with any further non-negative step cost can only keep that value the same or increase it — never decrease it.

**Java Code**

```java
public int minimumEffortPath(int[][] heights) {
    int n = heights.length, m = heights[0].length;
    int[][] effort = new int[n][m];
    for (int[] row : effort) Arrays.fill(row, Integer.MAX_VALUE);
    effort[0][0] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]); // {effort, r, c}
    pq.add(new int[]{0, 0, 0});
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int e = top[0], r = top[1], c = top[2];
        if (e > effort[r][c]) continue;
        if (r == n-1 && c == m-1) return e;
        for (int[] d : dirs) {
            int nr = r+d[0], nc = c+d[1];
            if (nr<0||nr>=n||nc<0||nc>=m) continue;
            int cand = Math.max(e, Math.abs(heights[nr][nc]-heights[r][c]));
            if (cand < effort[nr][nc]) { effort[nr][nc] = cand; pq.add(new int[]{cand, nr, nc}); }
        }
    }
    return effort[n-1][m-1];
}
```

**Complexity**: Time Complexity Calculation: `O(n*m*log(n*m))` — same shape as Dijkstra with `V=n*m`. Space Complexity Calculation: `O(n*m)`.

### Pattern to Remember

```text
Clue: "minimize the maximum edge/step on a path"
Pattern: Dijkstra with max() relaxation, OR binary search on answer + BFS feasibility
Mental model: Dijkstra family, custom combine operator / binary-search-on-answer
```

**Similar problems**: 30, 50. **Interview tip**: name both valid approaches — it shows you recognize "minimize the maximum" as a _pattern_, not a one-off trick, and it directly connects to Problem 50 later.

## 34. Cheapest Flights Within K Stops (LeetCode 787, Medium)

### Problem Understanding

Directed weighted graph of flights; find the cheapest price from `src` to `dst` using **at most `k` stops** (i.e., at most `k+1` edges).

**Example**: `n=4, flights=[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src=0,dst=3,k=1` → `700` (`0->1->3`).

### How to Think About the Problem

- What should I notice first? Plain Dijkstra is **wrong** here — it would happily take a cheaper route with more stops than `k` allows, because Dijkstra has no notion of a stop budget. The extra constraint (limited edge count) breaks Dijkstra's usual optimality argument.
- Clue → Pattern: _"cheapest path with at most K edges/stops"_ → Bellman-Ford-style bounded relaxation: relax over **all edges**, but only `k+1` times total, and — critically — relax from a frozen snapshot of the _previous_ iteration's distances, not from values already updated in the current pass.

### Intuition (Brute → Better → Optimal)

```text
Dijkstra ignoring stop count: WRONG, can return an answer that needs more than k stops
        ↓
Observation: Bellman-Ford's "relax all edges, i-th pass = paths using at most i edges" property is exactly the stop-bounded structure we need
        ↓
Bellman-Ford limited to k+1 passes, relaxing from a COPY of the previous pass's distances
```

### Brute Force Approach

DFS/backtracking over all paths with at most `k+1` edges, tracking minimum cost. Exponential — `O(E^k)` in the worst case.
**Why can this be improved?** Bellman-Ford's pass-count already has the exact right interpretation: "distances after `i` passes are optimal among paths using at most `i` edges" — no need to enumerate paths explicitly.

### Optimal Approach

**Core Observation**: in Bellman-Ford, after exactly `i` full relaxation passes over all edges, `dist[v]` holds the shortest cost to `v` using **at most `i` edges** — this is a stronger, more useful invariant than "eventually optimal", and it maps precisely onto the "at most `k` stops = at most `k+1` edges" constraint. The subtlety: each pass must relax using distances **as they stood before this pass began** — if you relax in place and reuse an update from earlier in the _same_ pass, you can accidentally use more than `i` edges within one labeled "pass".

**Pattern Identification**: Bellman-Ford, bounded to `k+1` passes, with a snapshot-based relaxation to preserve the "at most i edges" invariant.

**Step-by-Step Intuition**

1. `dist[] = infinity`, `dist[src] = 0`.
2. Repeat `k+1` times: copy `dist` into `temp`; for every edge `(u,v,w)`, if `dist[u] != infinity` and `dist[u]+w < temp[v]`, update `temp[v]`; after the full pass, set `dist = temp`.
3. Return `dist[dst]` if finite, else `-1`.
4. **Invariant**: after iteration `i`, `dist[v]` is the cheapest cost using at most `i` edges — never fewer, never more, because relaxations within one pass only ever read from the _previous_ pass's frozen values.

**Dry Run** on the example (`k=1`, so 2 passes): pass 1 (≤1 edge): `dist=[0,100,inf,inf]` (via edge `0->1`). Pass 2 (≤2 edges): relax from pass-1 snapshot: `0->1(100)` unchanged, `1->2` gives `dist[2]=200` but that uses 2 edges (fine, ≤2), `1->3` gives `dist[3]=700`, `2->3` needs `dist[2]` from _before this pass_ which was `inf`, so no update. Final `dist[3]=700`. ✓.

**Why Does It Work?** Freezing the snapshot before each pass ensures a value used to relax an edge in pass `i` was itself established using at most `i-1` edges — so any relaxation in pass `i` produces a distance using at most `i` edges, exactly matching the pass count to the edge-count bound.

**Java Code**

```java
public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    for (int i = 0; i <= k; i++) {
        int[] temp = dist.clone();
        for (int[] f : flights) {
            int u = f[0], v = f[1], w = f[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < temp[v]) {
                temp[v] = dist[u] + w;
            }
        }
        dist = temp;
    }
    return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
}
```

**Complexity**: Time Complexity Calculation: `k+1` passes, each scanning all `E` edges → `O(K*E)`. Space Complexity Calculation: `O(V)` for the distance arrays.

### Pattern to Remember

```text
Clue: "cheapest path with AT MOST K edges/stops"
Pattern: Bellman-Ford bounded to K+1 passes, relax from a frozen snapshot each pass
Mental model: Bellman-Ford family, edge-count-bounded variant
```

**Similar problems**: 38. **Interview tip**: say out loud why plain Dijkstra fails here (it has no stop budget) before reaching for Bellman-Ford — that's the actual insight being tested, more than the code itself.

## 35. Network Delay Time (LeetCode 743, Medium)

### Problem Understanding

Directed weighted graph representing signal travel times; from source `k`, find the time for the signal to reach **all** nodes (the maximum of all shortest distances), or `-1` if some node is unreachable.

### How to Think About the Problem

- Clue → Pattern: plain single-source, non-negative-weight shortest path to every node → Dijkstra (Problem 30) verbatim; the only new step is taking the max of the resulting `dist[]` array.

### Intuition

```text
Run Dijkstra from k exactly as in Problem 30
        ↓
Answer = max(dist[]) if all reachable, else -1
```

### Optimal Approach

**Core Observation / Pattern Identification**: identical to Problem 30; "delay time for the whole network" is just "how long until the farthest node is reached", i.e., the maximum finite shortest distance.

**Java Code**

```java
public int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> adj = new ArrayList<>();
    for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
    for (int[] t : times) adj.get(t[0]).add(new int[]{t[1], t[2]});
    int[] dist = new int[n+1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a,b) -> a[0]-b[0]);
    pq.add(new int[]{0, k});
    while (!pq.isEmpty()) {
        int[] top = pq.poll();
        int d = top[0], u = top[1];
        if (d > dist[u]) continue;
        for (int[] e : adj.get(u)) {
            int v = e[0], w = e[1];
            if (d + w < dist[v]) { dist[v] = d + w; pq.add(new int[]{dist[v], v}); }
        }
    }
    int maxDist = 0;
    for (int i = 1; i <= n; i++) {
        if (dist[i] == Integer.MAX_VALUE) return -1;
        maxDist = Math.max(maxDist, dist[i]);
    }
    return maxDist;
}
```

**Complexity**: Time Complexity Calculation: `O((V+E) log V)`. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "time for signal to reach ALL nodes"
Pattern: Dijkstra from source, answer = max finite distance (or -1 if any unreachable)
Mental model: Dijkstra family
```

**Similar problems**: 30, 36. **Interview tip**: mention the `-1`-if-unreachable check first — it's an easy edge case to forget after computing distances.

## 36. Number of Ways to Arrive at Destination (LeetCode 1976, Medium)

### Problem Understanding

Undirected weighted graph of travel times between intersections. Count the number of **distinct shortest-time paths** from node `0` to node `n-1`, modulo `10^9+7`.

### How to Think About the Problem

- What should I notice first? This is Dijkstra plus a counting array running alongside it — whenever a shorter path to `v` is found, reset its way-count to the predecessor's way-count; whenever an **equally** short path is found, _add_ to it.
- Clue → Pattern: _"number of shortest paths"_ → Dijkstra + parallel `ways[]` array.

### Intuition

```text
Run ordinary Dijkstra, track dist[] only: loses the count of HOW MANY equally-short paths exist
        ↓
Observation: every time a relaxation finds an equal-cost alternative route, that route contributes additional ways, not a replacement
        ↓
Dijkstra + ways[] array: ways[v] = ways[u] on strict improvement, ways[v] += ways[u] on tie
```

### Optimal Approach

**Core Observation**: `ways[v]` should equal the sum of `ways[u]` over every predecessor `u` on _some_ shortest path to `v` — this is naturally computed alongside Dijkstra because a vertex's `dist` is finalized (in the non-negative-weight proof from Problem 30) before any of its own outgoing relaxations are trusted.

**Step-by-Step Intuition**

1. `dist[] = infinity`, `ways[] = 0`; `dist[0]=0, ways[0]=1`.
2. Standard Dijkstra pop-min loop. On relaxing edge `(u,v,w)`:
   - if `dist[u]+w < dist[v]`: strictly better path found → `dist[v] = dist[u]+w`, `ways[v] = ways[u]`, push `v`.
   - else if `dist[u]+w == dist[v]`: an equally-short alternative → `ways[v] = (ways[v] + ways[u]) % MOD` (no need to re-push `v` since its `dist` didn't change, but doing so harmlessly is also fine).
3. Answer is `ways[n-1]`.

**Why Does It Work?** Because Dijkstra finalizes `dist[u]` before trusting `u`'s outgoing edges (same invariant as Problem 30), every contribution to `ways[v]` at the moment `v`'s `dist` is truly finalized comes from a genuinely optimal predecessor — so summing them counts exactly the distinct shortest paths, no more, no less.

**Java Code**

```java
public int countPaths(int n, int[][] roads) {
    final int MOD = 1_000_000_007;
    List<List<long[]>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] r : roads) {
        adj.get(r[0]).add(new long[]{r[1], r[2]});
        adj.get(r[1]).add(new long[]{r[0], r[2]});
    }
    long[] dist = new long[n];
    Arrays.fill(dist, Long.MAX_VALUE);
    long[] ways = new long[n];
    dist[0] = 0; ways[0] = 1;
    PriorityQueue<long[]> pq = new PriorityQueue<>((a,b) -> Long.compare(a[0], b[0]));
    pq.add(new long[]{0, 0});
    while (!pq.isEmpty()) {
        long[] top = pq.poll();
        long d = top[0]; int u = (int) top[1];
        if (d > dist[u]) continue;
        for (long[] e : adj.get(u)) {
            int v = (int) e[0]; long w = e[1];
            if (d + w < dist[v]) {
                dist[v] = d + w; ways[v] = ways[u];
                pq.add(new long[]{dist[v], v});
            } else if (d + w == dist[v]) {
                ways[v] = (ways[v] + ways[u]) % MOD;
            }
        }
    }
    return (int) (ways[n-1] % MOD);
}
```

**Complexity**: Time Complexity Calculation: `O((V+E) log V)` — same shape as Dijkstra, `ways[]` bookkeeping is `O(1)` per relaxation. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "number of distinct shortest paths"
Pattern: Dijkstra + parallel ways[] array (reset on strict improvement, add on tie)
Mental model: Dijkstra family, counting variant
```

**Similar problems**: 30, 35. **Interview tip**: clarify with the interviewer whether "roads" (undirected) vs "flights" (directed) — the adjacency-build direction is the only thing that changes from Problem 35.

## 37. Minimum Multiplications to Reach End — Hard

### Problem Understanding

Given a start value, an end value, and an array of allowed multipliers, and taking every intermediate result `mod 100000`, find the minimum number of multiplications to turn `start` into `end`.

### How to Think About the Problem

- What should I notice first? This isn't a graph you're handed — it's an **implicit** graph (like Word Ladder, Problem 16) where nodes are the `100000` possible values mod `10^5`, and an edge exists from value `x` to `(x * m) % 100000` for every allowed multiplier `m`. Every edge has weight `1` (one multiplication) → unweighted shortest path → BFS.
- Clue → Pattern: _"minimum number of operations to transform A into B"_, with a bounded state space (here, `mod 100000`) → BFS over the operation graph, `visited` keyed by _value_, not by path.

### Intuition

```text
DFS/backtracking over all multiplication sequences: unbounded depth, no guarantee of shortest, exponential
        ↓
Observation: state space is bounded (only 100000 distinct values possible, thanks to the mod), and each multiplication is a unit-cost edge between two states
        ↓
BFS over the state graph, visited[value] instead of visited[node-index]
```

### Optimal Approach

**Core Observation**: taking `mod 100000` bounds the _entire_ reachable state space to exactly 100000 values, no matter how large `start`/`end`/multipliers are — so a `visited[100000]` array is both correct and cheap, unlike naively tracking "have I seen this exact multiplication sequence".

**Pattern Identification**: unweighted shortest path (BFS) over an implicit, value-keyed graph.

**Step-by-Step Intuition**

1. `visited[100000] = false`; BFS from `start % 100000` (practically just `start`, guaranteed `< 100000` per constraints) with steps `0`.
2. Pop `(val, steps)`. If `val == end`, return `steps`.
3. For each multiplier `m`: `next = (val * m) % 100000`; if unvisited, mark visited, push `(next, steps+1)`.
4. **Invariant**: identical to ordinary BFS — first discovery of `end` is via the fewest multiplications.

**Why Does It Work?** Every multiplication is exactly one unit-weight edge in a graph whose vertex set is the 100000 possible mod-values; BFS's shortest-hop guarantee (§0.4) applies unchanged.

**Java Code**

```java
public int minimumMultiplications(int[] arr, int start, int end) {
    final int MOD = 100000;
    int[] dist = new int[MOD];
    Arrays.fill(dist, -1);
    ArrayDeque<Integer> q = new ArrayDeque<>();
    dist[start] = 0; q.add(start);
    while (!q.isEmpty()) {
        int cur = q.poll();
        if (cur == end) return dist[cur];
        for (int m : arr) {
            int next = (int) (((long) cur * m) % MOD);
            if (dist[next] == -1) { dist[next] = dist[cur] + 1; q.add(next); }
        }
    }
    return -1;
}
```

**Complexity**: Time Complexity Calculation: `O(MOD * |arr|)` — each of the 100000 states is dequeued at most once, each generating `|arr|` transitions. Space Complexity Calculation: `O(MOD)`.

### Pattern to Remember

```text
Clue: "minimum operations to transform A into B", bounded state space
Pattern: BFS over an implicit graph keyed by state value, not by explicit node id
Mental model: unweighted shortest path (BFS), implicit graph
```

**Similar problems**: 16, 28. **Interview tip**: name the state-space bound (`mod 100000`) as _the_ reason BFS is tractable — without it, the graph would be infinite.

## 38. Bellman-Ford Algorithm — Hard

### Problem Understanding

Given a weighted **directed** graph that may contain **negative** edge weights (but you must also detect negative cycles), find shortest distances from a source, or report that a negative cycle makes the answer undefined.

### How to Think About the Problem

- What should I notice first? Dijkstra's greedy "pop-min is final" proof (Problem 30) explicitly relied on non-negative weights — a negative edge can undercut an already-finalized distance, so Dijkstra can silently give a wrong answer with negative weights. Need something that keeps re-checking.
- Clue → Pattern: _"negative weights"_, _"detect negative cycle"_ → Bellman-Ford: blindly relax **all** edges, `V-1` times.

### Intuition (Brute → Better → Optimal)

```text
Dijkstra with negative weights: silently WRONG, not just slow
        ↓
Observation: the longest possible SIMPLE shortest path in a graph with V vertices has at most V-1 edges; relaxing all edges V-1 times guarantees every simple shortest path is fully "discovered" regardless of edge order
        ↓
Bellman-Ford: V-1 full relaxation passes over all E edges, plus one more pass to detect negative cycles
```

### Optimal Approach

**Core Observation**: any _simple_ shortest path (no repeated vertex) uses at most `V-1` edges. One full pass over all edges propagates a distance improvement by exactly one additional edge (in the worst edge ordering); therefore `V-1` full passes are enough to propagate any shortest path fully, however adversarially the edges are ordered.

**Pattern Identification**: blind repeated relaxation (§0.8), `V-1` times, plus a `V`-th diagnostic pass.

**Step-by-Step Intuition**

1. `dist[] = infinity`, `dist[src] = 0`.
2. Repeat `V-1` times: for every edge `(u,v,w)`, if `dist[u] != infinity` and `dist[u]+w < dist[v]`, relax.
3. **Negative-cycle detection**: run one more (the `V`-th) pass over all edges; if _any_ edge can still be relaxed, a negative cycle is reachable from the source (a genuine shortest path can never need more than `V-1` edges, so any further improvement must be looping around a negative cycle indefinitely).
4. **Invariant**: after pass `i`, `dist[v]` is optimal among paths using at most `i` edges (same invariant as Problem 34, unbounded here instead of capped at `k+1`).

**Dry Run** on `0->1(w=5), 1->2(w=-3), 2->3(w=2), 3->1(w=1)` (note the `1->2->3->1` cycle has total weight `-3+2+1=0`, not negative — a genuinely negative cycle would keep decreasing `dist` on the extra pass): after 3 passes (`V=4`), distances stabilize; the 4th pass finds no further relaxation → no negative cycle.

**Why Does It Work?** The `V-1` bound comes directly from the definition of a simple path; if a `V`-th pass still finds an improvement, the only way that's possible is if the "shortest path" is no longer simple — i.e., it can be made arbitrarily cheaper by looping one more time around some cycle, which is precisely what a negative cycle means.

**Java Code**

```java
int[] bellmanFord(int n, int[][] edges, int src) { // returns null if negative cycle reachable from src
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    for (int i = 0; i < n - 1; i++) {
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) dist[v] = dist[u] + w;
        }
    }
    for (int[] e : edges) {
        int u = e[0], v = e[1], w = e[2];
        if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) return null; // negative cycle
    }
    return dist;
}
```

**Complexity**: Time Complexity Calculation: `V-1` passes, each `O(E)` → `O(V*E)`. Space Complexity Calculation: `O(V)`.

### Pattern to Remember

```text
Clue: "negative weights allowed", "detect negative cycle"
Pattern: blind relaxation over all edges, V-1 passes + 1 diagnostic pass
Mental model: Bellman-Ford (shortest path family, negative-weight-safe)
```

**Similar problems**: 29, 34, 39. **Interview tip**: state the `V-1` bound from the _definition_ of a simple path — it's the cleanest way to justify the pass count without hand-waving.

## 39. Floyd-Warshall Algorithm — Hard

### Problem Understanding

Given a weighted directed graph (as an adjacency matrix, possibly with negative weights but ideally no negative cycles), compute shortest distances between **every pair** of vertices.

### How to Think About the Problem

- What should I notice first? Running Dijkstra or Bellman-Ford from every single source would work but redoes overlapping work; Floyd-Warshall instead asks a completely different question per step: "does routing _through_ vertex `k` improve `dist[i][j]`?", iterated over every possible `k`.
- Clue → Pattern: _"all pairs shortest path"_ → Floyd-Warshall, `O(V³)`, dynamic programming over allowed intermediate vertices.

### Intuition (Brute → Better → Optimal)

```text
Run Dijkstra from every vertex: O(V * (V+E) log V), and STILL wrong if negative weights are present
        ↓
Run Bellman-Ford from every vertex: O(V^2 * E), correct with negatives, but redundant across sources
        ↓
Floyd-Warshall: for k in 0..V-1, for i, for j: dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j]) — O(V^3), handles negatives (no negative cycle), single unified pass
```

### Optimal Approach

**Core Observation**: define `dist_k[i][j]` = shortest path from `i` to `j` using **only vertices `0..k` as allowed intermediates**. Then `dist_k[i][j] = min(dist_{k-1}[i][j], dist_{k-1}[i][k] + dist_{k-1}[k][j])` — either the best path avoiding `k` entirely, or one that routes through `k` once. Because this recurrence only reads `dist_{k-1}` values, it can be computed in place if `k` is the **outermost** loop — that ordering is the entire trick.

**Pattern Identification**: all-pairs shortest path, DP over allowed intermediate vertex set.

**Step-by-Step Intuition**

1. Initialize `dist[i][j]` = edge weight if an edge exists, `0` if `i==j`, `infinity` otherwise.
2. For `k` from `0` to `V-1` (outermost — the allowed-intermediate set grows by one vertex each iteration): for `i` from `0` to `V-1`: for `j` from `0` to `V-1`: `dist[i][j] = min(dist[i][j], dist[i][k]+dist[k][j])`.
3. **Negative cycle check**: after the triple loop, if any `dist[i][i] < 0`, a negative cycle exists (a vertex can reach itself more cheaply than doing nothing, which is only possible via a negative loop).
4. **Invariant**: after the `k`-th outer iteration completes, `dist[i][j]` is correct for paths using only vertices `≤k` as intermediates — this is _why_ `k` must be outermost: `i` and `j` loops for a fixed `k` must all see the _same, fully-updated_ `dist_{k-1}` table, which in-place update naturally preserves as long as `k` doesn't change mid-computation.

**Why Does It Work?** Any shortest path between `i` and `j` either avoids vertex `k` completely (already captured by `dist_{k-1}[i][j]`) or passes through `k` exactly once as an intermediate (in which case splitting it at `k` gives two shorter sub-paths, both already optimal by the same inductive argument) — the recurrence exhaustively covers both cases for every `k` in turn.

**Java Code**

```java
void floydWarshall(int[][] dist) { // dist is V x V, INF for no edge, 0 on diagonal, mutated in place
    int n = dist.length;
    final int INF = (int) 1e9;
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            if (dist[i][k] == INF) continue;
            for (int j = 0; j < n; j++) {
                if (dist[k][j] == INF) continue;
                if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
            }
        }
    }
    // negative cycle check: any dist[i][i] < 0
}
```

**Complexity**: Time Complexity Calculation: three nested loops over `V` → `O(V³)`. Space Complexity Calculation: `O(V²)` for the distance matrix (updated in place, no extra copy needed).

### Pattern to Remember

```text
Clue: "all pairs shortest path", small-ish V (roughly V <= 400-500 for O(V^3) to be fast enough)
Pattern: k-outer-loop DP over allowed intermediate vertices, in-place matrix update
Mental model: Floyd-Warshall (shortest path family, all-pairs)
```

**Similar problems**: 40, 38. **Interview tip**: state explicitly _why_ `k` must be the outermost loop — it's the single detail that, if swapped with `i` or `j`, silently produces wrong answers without crashing, and interviewers love probing this.

## 40. Find the City with the Smallest Number of Neighbors at a Threshold Distance (LeetCode 1334, Medium)

### Problem Understanding

Weighted undirected graph of cities; for each city, count how many other cities are reachable within `distanceThreshold`. Return the city with the **fewest** such reachable neighbors, breaking ties by the **largest** city index.

### How to Think About the Problem

- What should I notice first? "For every city, reachable-within-threshold counts to every other city" is exactly an all-pairs shortest path question — Floyd-Warshall (Problem 39) computes every `dist[i][j]` in one shot, then it's a simple counting/argmin pass.
- Clue → Pattern: _"for every pair"_ + _"count neighbors within a distance"_ → Floyd-Warshall + post-processing.

### Intuition

```text
Run Dijkstra from every city separately: O(V * (V+E) log V), works but heavier than needed for small V
        ↓
Observation: it's genuinely an all-pairs question, and constraints are small (V <= 100 typically) — Floyd-Warshall is both simpler and fits the complexity budget
        ↓
Floyd-Warshall once, then for each city count columns <= threshold, track the minimum count with tie-break on larger index
```

### Optimal Approach

**Core Observation / Pattern Identification**: reuse Problem 39's algorithm verbatim; the only new logic is the final scan.

**Step-by-Step Intuition**

1. Build the initial `dist[][]` matrix from the edge list (undirected: set both `dist[u][v]` and `dist[v][u]`).
2. Run Floyd-Warshall (Problem 39) to fill in all-pairs shortest distances.
3. For each city `i`, count `j != i` with `dist[i][j] <= threshold`.
4. Track the city with the smallest count; on a tie, prefer the **larger** index (per problem statement) — so iterate `i` in increasing order and use `<=` (not `<`) when comparing counts, so a later equal-or-smaller count always overwrites the answer.

**Java Code**

```java
public int findTheCity(int n, int[][] edges, int distanceThreshold) {
    final int INF = (int) 1e9;
    int[][] dist = new int[n][n];
    for (int[] row : dist) Arrays.fill(row, INF);
    for (int i = 0; i < n; i++) dist[i][i] = 0;
    for (int[] e : edges) {
        dist[e[0]][e[1]] = Math.min(dist[e[0]][e[1]], e[2]);
        dist[e[1]][e[0]] = Math.min(dist[e[1]][e[0]], e[2]);
    }
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];

    int bestCity = -1, bestCount = Integer.MAX_VALUE;
    for (int i = 0; i < n; i++) {
        int count = 0;
        for (int j = 0; j < n; j++) if (i != j && dist[i][j] <= distanceThreshold) count++;
        if (count <= bestCount) { bestCount = count; bestCity = i; }
    }
    return bestCity;
}
```

**Complexity**: Time Complexity Calculation: `O(V³)` for Floyd-Warshall dominates the `O(V²)` final scan. Space Complexity Calculation: `O(V²)`.

### Pattern to Remember

```text
Clue: "for every city, count reachable within threshold" (all pairs)
Pattern: Floyd-Warshall + linear scan with a tie-break rule
Mental model: Floyd-Warshall (all-pairs shortest path)
```

**Similar problems**: 39. **Interview tip**: use `<=` in the final comparison (not `<`) to correctly implement "prefer the larger index on ties" while scanning in increasing order — say this out loud, it's a classic off-by-comparison bug.

---

# PART E — MST / Disjoint Set and Problems (10 problems)

## 41. MST Theory — Easy

### Problem Understanding

Define a Minimum Spanning Tree: given a connected, undirected, weighted graph, a spanning tree is a subgraph that connects all `V` vertices using exactly `V-1` edges with no cycle; the _minimum_ spanning tree is the one whose total edge weight is smallest among all spanning trees.

### How to Think About the Problem

- What should I notice first? "Spanning" = touches every vertex; "tree" = connected and acyclic, which forces exactly `V-1` edges — any spanning subgraph with a cycle can always drop an edge and still stay connected, so a true minimum can never contain a cycle.
- Clue → Pattern: _"minimum total edge weight to connect everything"_ → MST, solved by Prim's or Kruskal's.

### Intuition

```text
Try all spanning trees, pick cheapest: exponential number of spanning trees (Cayley's formula, V^(V-2) for a complete graph)
        ↓
Observation (the Cut Property): for any partition of vertices into two non-empty sets, the minimum-weight edge crossing that partition MUST belong to some MST
        ↓
Greedy algorithms built directly on the cut property: Prim's (grow one side of a cut) and Kruskal's (process edges globally, sorted)
```

### Optimal Approach

**Core Observation — the Cut Property**: for _any_ way of splitting the vertices into two groups, the cheapest edge crossing between the groups is always safe to include in an MST (excluding it, if it were required, would force a more expensive crossing edge to be used instead, which can always be swapped out for the cheaper one without breaking spanning-tree-ness or increasing total weight — a standard exchange argument).

**Why Does It Work?** The cut property is the mathematical foundation both Prim's (§0.10, cuts defined by "visited set vs rest") and Kruskal's (§0.10, implicitly respects the cut property by always taking the globally cheapest edge that doesn't create a cycle) rely on — this problem exists purely to establish that foundation before the two greedy algorithms are introduced.

### Pattern to Remember

```text
Clue: "minimum spanning tree", "connect all nodes cheapest"
Pattern: cut property justifies Prim's / Kruskal's greedy correctness
Mental model: MST
```

**Similar problems**: 42, 44, 50. **Interview tip**: if asked "why does the greedy MST algorithm even work", the cut property is the correct, complete answer — have it ready verbatim.

## 42. Prim's Algorithm — Hard

### Problem Understanding

Given a connected, weighted, undirected graph, construct an MST (or just its total weight) using Prim's algorithm: grow a single tree from an arbitrary start vertex, one cheapest crossing edge at a time.

### How to Think About the Problem

- What should I notice first? Prim's looks almost identical to Dijkstra (§0.10) — both use a priority queue and a "visited set" — but the key it minimizes differs: Dijkstra relaxes by `dist[u]+w` (cumulative path cost from the source), Prim's relaxes by raw edge weight `w` alone (cost of the _single_ edge connecting a new vertex to the growing tree).
- Clue → Pattern: _"minimum spanning tree"_, general graph → Prim's: PQ of `(edgeWeight, vertex)`, always pop the cheapest edge leaving the current visited set.

### Intuition (Brute → Better → Optimal)

```text
Try all V-1 subsets of edges forming a tree: exponential
        ↓
Observation (cut property, Problem 41): always safe to add the cheapest edge crossing "visited vs unvisited"
        ↓
Prim's: min-heap keyed by raw edge weight, grow the tree from one vertex outward, O(E log V)
```

### Optimal Approach

**Core Observation**: at every step, the cut is exactly "current tree" vs "everything else"; the cut property guarantees the cheapest edge crossing that specific cut is always safe to add.

**Step-by-Step Intuition**

1. `visited[] = false`, min-heap seeded with `(0, arbitrary start, -1)` representing `(weight, vertex, parentVertex)`.
2. Pop the minimum-weight entry `(w, u, par)`. If `u` already visited, skip (stale). Mark visited, add `w` to total MST weight (and record the edge `par-u` if the actual tree structure is needed).
3. For every neighbour `v` of `u` with edge weight `w'`: if unvisited, push `(w', v, u)` — note this pushes the _raw_ edge weight, not a cumulative distance.
4. Repeat until all `V` vertices are visited. **Invariant**: every popped (non-stale) entry is the cheapest possible edge connecting the current tree to a brand-new vertex.

**Dry Run** on `0-1(w=2), 0-2(w=1), 1-2(w=3), 1-3(w=4)`, start `0`: pop `(0,0,-1)` visit 0, push `(2,1,0),(1,2,0)`. Pop `(1,2,0)` visit 2, total=1, push `(3,1,2)`. Pop `(2,1,0)` visit 1 (cheaper than the `(3,1,2)` alt entry), total=3, push `(4,3,1)`. Pop `(4,3,1)` visit 3, total=7. MST weight `7` using edges `0-2, 0-1, 1-3`.

**Why Does It Work?** Direct application of the cut property (Problem 41) at every step — the cut is always "tree so far" vs "rest", and the min-heap guarantees we always take the cheapest crossing edge for that exact cut.

**Java Code**

```java
int primMST(int n, List<List<int[]>> adj) { // adj: u -> list of {v, w}
    boolean[] visited = new boolean[n];
    PriorityQueue<int[]> pq = new PriorityQueue<>((a,b) -> a[0]-b[0]); // {weight, vertex}
    pq.add(new int[]{0, 0});
    int totalWeight = 0, count = 0;
    while (!pq.isEmpty() && count < n) {
        int[] top = pq.poll();
        int w = top[0], u = top[1];
        if (visited[u]) continue;
        visited[u] = true; totalWeight += w; count++;
        for (int[] edge : adj.get(u)) {
            int v = edge[0], ew = edge[1];
            if (!visited[v]) pq.add(new int[]{ew, v});
        }
    }
    return totalWeight;
}
```

**Complexity**: Time Complexity Calculation: each edge can push one heap entry, `O(E)` pushes each `O(log E)=O(log V)` → `O(E log V)`. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "minimum spanning tree", general connected weighted graph
Pattern: PQ keyed by RAW edge weight (not cumulative), grow visited set
Mental model: MST via Prim's — "Dijkstra but relax by w, not dist[u]+w"
```

**Similar problems**: 44, 30 (structural cousin, not the same objective). **Interview tip**: say the Dijkstra-comparison out loud — "same skeleton as Dijkstra, different key" is exactly the insight interviewers want to hear.

## 43. Disjoint Set (Union by Rank / by Size, Path Compression) — Hard

### Problem Understanding

Build a DSU data structure supporting `find(x)` (which group is `x` in) and `union(a,b)` (merge groups), both close to `O(1)` amortized.

### How to Think About the Problem

- What should I notice first? A naive DSU (no rank/size, no path compression) degenerates to an `O(n)`-deep chain in the worst case (always union the same way), making `find` `O(n)` — the two optimizations below are what rescue it.
- Clue → Pattern: _"merge groups dynamically"_, _"same group as"_ → DSU (§0.9), with both optimizations applied together.

### Intuition (Brute → Better → Optimal)

```text
Naive DSU (parent pointers only, no rank/size, no compression): O(n) worst-case find, chain degenerates
        ↓
Add union by rank/size: always attach the smaller/shallower tree under the larger/deeper one's root, keeping trees shallow, O(log n) find
        ↓
Add path compression: every find() call flattens the path it traverses directly to the root, O(α(n)) amortized find — effectively O(1)
```

### Optimal Approach

**Core Observation**: rank/size union bounds tree height to `O(log n)` on its own; path compression on top of that gives the inverse-Ackermann amortized bound, because compressed paths can never need to be "re-flattened" more than a vanishingly small number of times as the structure evolves.

**Java Code** — see §0.9 for the full `DSU` class (`find` with path compression, both `unionByRank` and `unionBySize`).

**Complexity**: Time Complexity Calculation: with both optimizations, `find`/`union` are `O(α(V))` amortized, where `α` is the inverse Ackermann function — `≤ 4` for any realistic `V`. Without path compression alone: `O(log V)`. Without either: `O(V)` worst case. Space Complexity Calculation: `O(V)` for the three arrays.

### Pattern to Remember

```text
Clue: "implement Union-Find from scratch"
Pattern: path compression (flatten on find) + union by rank/size (attach smaller under bigger)
Mental model: DSU
```

**Similar problems**: 45, 46, 47, 48, 49. **Interview tip**: be ready to state _both_ optimizations and _why each alone is insufficient_ — path compression without rank/size can still build somewhat unbalanced trees pre-compression; rank/size without compression leaves `O(log n)` instead of near-`O(1)`.

## 44. Find the MST Weight — Hard

### Problem Understanding

Given a connected weighted graph, return the total weight of its MST (using either Prim's or Kruskal's).

### How to Think About the Problem

- Clue → Pattern: literally Problem 42's `primMST` function reused verbatim; this entry exists on the sheet as the "apply Prim's" checkpoint. Kruskal's is the equally valid alternative, useful to show when the input naturally arrives as an edge list.

### Intuition

```text
Reuse Problem 42 directly, OR sort edges + DSU (Kruskal's) if edge-list input is more natural
```

### Optimal Approach (Kruskal's, shown as the alternative to Problem 42's Prim's)

**Core Observation**: sorting all edges ascending and greedily adding any edge that doesn't create a cycle (checked via DSU) is _also_ a direct application of the cut property — at the moment an edge is considered, if its endpoints are in different DSU groups, it is (by weight-sorted order) the cheapest possible edge crossing that particular cut.

**Step-by-Step Intuition**

1. Sort all `E` edges by weight ascending.
2. Initialize DSU over `V` vertices.
3. For each edge `(u,v,w)` in sorted order: if `find(u) != find(v)`, `union(u,v)`, add `w` to total, increment edges-used counter.
4. Stop early once `V-1` edges have been added (optional optimization).

**Dry Run** on the same graph as Problem 42: sorted edges `(0,2,1), (0,1,2), (1,2,3), (1,3,4)`. Add `0-2` (w=1, different sets) → total=1. Add `0-1` (w=2, different sets) → total=3. Skip `1-2` (w=3, same set already, would create a cycle). Add `1-3` (w=4, different sets) → total=7. Matches Problem 42's answer.

**Java Code**

```java
int kruskalMST(int n, int[][] edges) { // edges: {u, v, w}
    Arrays.sort(edges, (a, b) -> a[2] - b[2]);
    DSU dsu = new DSU(n); // from §0.9
    int totalWeight = 0, edgesUsed = 0;
    for (int[] e : edges) {
        if (dsu.find(e[0]) != dsu.find(e[1])) {
            dsu.unionBySize(e[0], e[1]);
            totalWeight += e[2];
            edgesUsed++;
            if (edgesUsed == n - 1) break;
        }
    }
    return totalWeight;
}
```

**Complexity**: Time Complexity Calculation: sorting is `O(E log E)`; the DSU loop is `O(E * α(V))` → dominated by `O(E log E)`. Space Complexity Calculation: `O(V+E)`.

### Pattern to Remember

```text
Clue: "MST weight", edge-list input
Pattern: sort edges + DSU cycle check (Kruskal's), or reuse Prim's (Problem 42)
Mental model: MST via Kruskal's
```

**Similar problems**: 41, 42. **Interview tip**: pick Kruskal's when the input is naturally an edge list and Prim's when it's naturally an adjacency list — say this trade-off explicitly.

## 45. Number of Operations to Make Network Connected (LeetCode 1319, Medium)

### Problem Understanding

`n` computers, `connections[i]=[a,b]` is a cable between them. Return the minimum number of cable-moves to make the whole network connected, or `-1` if there aren't enough cables to begin with.

### How to Think About the Problem

- What should I notice first? A cable connecting two computers that are _already_ in the same DSU group is redundant — it can be freely repurposed. To connect `C` separate components, exactly `C-1` extra cables are needed (each redundant cable can serve as one of them).
- Clue → Pattern: _"minimum operations to connect everything"_, cable-move framing → DSU, answer = `(number of components) - 1`.

### Intuition

```text
Brute force / BFS-based component counting, then reason about redundant edges separately: more bookkeeping than necessary
        ↓
Observation: DSU union naturally identifies both the redundant-edge count and the component count in one pass
        ↓
DSU: if cables < n-1, impossible (-1); else union all, answer = components - 1
```

### Optimal Approach

**Core Observation**: early exit — if `connections.length < n-1`, there simply aren't enough cables to ever connect `n` computers (a tree needs at least `n-1` edges), so return `-1` immediately without even running DSU.

**Step-by-Step Intuition**

1. If `connections.length < n-1`, return `-1`.
2. DSU over `n` computers; for each connection, `union(a,b)`.
3. Count distinct roots (`find(i)` for each `i`, count distinct values) = number of connected components `C`.
4. Answer is `C - 1` (each merge needs one cable, and there are exactly enough leftover/redundant cables to supply them, guaranteed by the step-1 check).

**Why Does It Work?** Any redundant cable (one connecting two already-connected computers) can be physically unplugged and re-plugged to bridge two different components without any additional cost — connecting `C` components into 1 always takes exactly `C-1` bridging moves, and step 1 guarantees enough redundant cables exist to supply them.

**Java Code**

```java
public int makeConnected(int n, int[][] connections) {
    if (connections.length < n - 1) return -1;
    DSU dsu = new DSU(n); // §0.9
    for (int[] c : connections) dsu.unionBySize(c[0], c[1]);
    Set<Integer> roots = new HashSet<>();
    for (int i = 0; i < n; i++) roots.add(dsu.find(i));
    return roots.size() - 1;
}
```

**Complexity**: Time Complexity Calculation: `O((n+E) * α(n))` for the unions plus `O(n * α(n))` for the root scan → effectively `O(n+E)`. Space Complexity Calculation: `O(n)`.

### Pattern to Remember

```text
Clue: "minimum operations to connect all", "cables/edges can be moved"
Pattern: DSU components count, answer = components - 1, with an n-1-cable early-out
Mental model: DSU
```

**Similar problems**: 3, 46. **Interview tip**: state the `n-1` early-exit check first — it's a one-line guard that's easy to forget and directly tests whether you understand _why_ `C-1` moves suffice.

## 46. Most Stones Removed with Same Row or Column (LeetCode 947, Medium)

### Problem Understanding

Stones on a 2D grid; a stone can be removed if another stone shares its row or column. Return the maximum number of stones removable.

### How to Think About the Problem

- What should I notice first? Within one connected group of stones (connected via "shares a row or column, transitively"), you can always remove every stone but one — the last stone in each group is unremovable, so the answer is `totalStones - numberOfGroups`.
- Clue → Pattern: _"connected via shared row/column"_ → DSU where a stone's row and column are treated as extra "virtual" nodes to union through, avoiding an `O(stones²)` pairwise comparison.

### Intuition (Brute → Better → Optimal)

```text
Brute force: compare every pair of stones for shared row/col, union if so — O(stones^2)
        ↓
Observation: two stones sharing a row both connect to a common "row sentinel node"; no pairwise comparison needed, just union each stone with its row-node and column-node
        ↓
DSU with row and column sentinel nodes: O(stones * α(rows+cols))
```

### Brute Force Approach

**Basic idea**: for every pair of stones, if they share a row or column, `union` them.
**Time Complexity Calculation**: `O(stones²)`. **Why can this be improved?** Sharing a row is a transitive relationship through a common "hub" — no need to compare every pair directly.

### Optimal Approach

**Core Observation**: encode row `r` as virtual node `r` and column `c` as virtual node `(numRows + c)` in the same DSU; union every stone's row-node with its column-node. Two stones end up in the same DSU group iff they're connected through some chain of shared rows/columns — exactly the "connected group" the problem describes — without ever comparing stone pairs directly.

**Step-by-Step Intuition**

1. DSU sized `numRows + numCols` (virtual nodes only, not one node per stone).
2. For each stone `(r, c)`: `union(r, numRows + c)`.
3. Count distinct DSU roots **among rows/columns that actually have a stone** = number of connected groups `G`.
4. Answer is `stones.length - G`.

**Why Does It Work?** Row-node `r` and column-node `numRows+c` are unioned by every stone at `(r,c)` — so any two stones sharing a row or column end up in the same DSU tree through that shared row/column node, transitively chaining together an entire connected group; within each group all but one stone can be removed by always removing a stone that still shares a row/column with some remaining stone (always possible until one stone is left).

**Java Code**

```java
public int removeStones(int[][] stones) {
    int maxRow = 0, maxCol = 0;
    for (int[] s : stones) { maxRow = Math.max(maxRow, s[0]); maxCol = Math.max(maxCol, s[1]); }
    DSU dsu = new DSU(maxRow + maxCol + 2); // §0.9
    for (int[] s : stones) dsu.unionBySize(s[0], maxRow + 1 + s[1]);
    Set<Integer> roots = new HashSet<>();
    for (int[] s : stones) roots.add(dsu.find(s[0]));
    return stones.length - roots.size();
}
```

**Complexity**: Time Complexity Calculation: `O(stones * α(rows+cols))`. Space Complexity Calculation: `O(rows+cols)`.

### Pattern to Remember

```text
Clue: "connected via shared row/column/attribute", avoid O(n^2) pairwise comparison
Pattern: DSU with virtual sentinel nodes for the shared attribute (row-node, column-node)
Mental model: DSU, sentinel-node trick
```

**Similar problems**: 47 (similar sentinel idea with emails), 45. **Interview tip**: name the sentinel-node trick explicitly — "row and column each get their own DSU node" is the entire insight, and it generalizes to Problem 47's emails.

## 47. Accounts Merge (LeetCode 721, Medium)

### Problem Understanding

Given accounts `[name, email1, email2, ...]`, merge accounts that share at least one email (same person can have multiple accounts under the same name). Return merged accounts, each with the name followed by all its emails sorted.

### How to Think About the Problem

- What should I notice first? Same sentinel-node idea as Problem 46, but the "shared attribute" is an email string, not a row/column integer — so DSU needs to operate over **email strings**, requiring a `Map<String, Integer>` to assign each distinct email a DSU index first.
- Clue → Pattern: _"merge groups that share a common attribute"_ → DSU over that attribute (email), then group by root and attach the account's name.

### Intuition

```text
BFS/DFS building an explicit email-graph: works, but DSU with union-by-account-index is simpler to reason about and reuse
        ↓
Observation: for each account, union all its emails together with EACH OTHER (or all with the first one); accounts sharing an email end up in the same DSU group by transitivity
        ↓
DSU keyed by account index; within one account, union index i with every OTHER account index that shares an email with it — OR, more simply, union emails together and track which account each email's root belongs to
```

### Optimal Approach

**Core Observation**: it's cleanest to run DSU over **account indices** (`0..accounts.length-1`), not emails directly — for each email, remember the first account index that had it; if a later account also has that email, union the two account indices. This makes "which accounts belong together" a direct DSU query, and emails are just the mechanism for discovering unions.

**Step-by-Step Intuition**

1. `Map<String, Integer> emailToAccountIndex` (first-seen account for each email); DSU over `accounts.length` indices.
2. For each account `i`, for each email `e`: if `e` already maps to some account `j`, `union(i, j)`; else record `emailToAccountIndex.put(e, i)`.
3. For each account `i`, its emails all belong to DSU-group `find(i)` — build `Map<Integer rootIndex, TreeSet<String> emails>` by walking every account again and adding its emails to its root's set (a `TreeSet` keeps them sorted for free).
4. For each root, output `[accounts[root][0] /* name */] + sorted emails`.

**Why Does It Work?** Two accounts sharing an email get unioned directly (or indirectly through a chain of shared emails across several accounts) via this exact mechanism, and the DSU root then serves as a canonical "merged identity" that every account contributing an email funnels into.

**Java Code**

```java
public List<List<String>> accountsMerge(List<List<String>> accounts) {
    int n = accounts.size();
    DSU dsu = new DSU(n); // §0.9
    Map<String, Integer> emailToIdx = new HashMap<>();
    for (int i = 0; i < n; i++) {
        for (int j = 1; j < accounts.get(i).size(); j++) {
            String email = accounts.get(i).get(j);
            if (emailToIdx.containsKey(email)) {
                dsu.unionBySize(i, emailToIdx.get(email));
            } else {
                emailToIdx.put(email, i);
            }
        }
    }
    Map<Integer, TreeSet<String>> rootToEmails = new HashMap<>();
    for (int i = 0; i < n; i++) {
        int root = dsu.find(i);
        rootToEmails.computeIfAbsent(root, k -> new TreeSet<>()).addAll(accounts.get(i).subList(1, accounts.get(i).size()));
    }
    List<List<String>> result = new ArrayList<>();
    for (Map.Entry<Integer, TreeSet<String>> entry : rootToEmails.entrySet()) {
        List<String> merged = new ArrayList<>();
        merged.add(accounts.get(entry.getKey()).get(0));
        merged.addAll(entry.getValue());
        result.add(merged);
    }
    return result;
}
```

**Complexity**: Time Complexity Calculation: `O(N*K log(N*K))` where `N`=account count, `K`=avg emails per account — dominated by inserting into/sorting the `TreeSet`s; the DSU operations themselves are `O(N*K*α(N))`. Space Complexity Calculation: `O(N*K)`.

### Pattern to Remember

```text
Clue: "merge records that share a common attribute (email, phone, etc)"
Pattern: DSU over record indices, union via a "first-seen attribute owner" map
Mental model: DSU, attribute-sharing merge
```

**Similar problems**: 46. **Interview tip**: emphasize the output must keep the _original_ first name of the merged group's chosen representative — a common careless mistake is losing this detail while focused on the DSU logic.

## 48. Number of Islands II (LeetCode 305, Hard)

### Problem Understanding

Start with an all-water grid; process a stream of `(row, col)` "add land" queries one at a time; after **each** query, report the current number of islands.

**Example**: `m=3,n=3, positions=[[0,0],[0,1],[1,2],[2,1]]` → answers `[1,1,2,3]`.

### How to Think About the Problem

- What should I notice first? Problem 18 (Number of Islands) solves the _static_ version — recomputing a full BFS/DFS after every single query would be `O(Q * n*m)`, too slow for many queries. This is fundamentally an _online/incremental_ connectivity question — exactly DSU's specialty.
- Clue → Pattern: _"connectivity changes incrementally, query after each change"_ → DSU with an incremental island counter, unioning only the newly-added cell with its already-land neighbours.

### Intuition (Brute → Better → Optimal)

```text
Brute force: BFS/DFS the whole grid after every query, O(Q * n*m)
        ↓
Observation: adding one land cell can only ever MERGE existing islands together (or create a brand-new one) — never split — so tracking a running island-count via DSU union is exactly right
        ↓
DSU: islandCount++ on adding a new cell, islandCount-- for each DISTINCT already-land neighbour it merges with, O(Q * α(n*m))
```

### Brute Force Approach

Re-run Problem 18's full-grid flood-fill count after every query.
**Time Complexity Calculation**: `O(Q * n*m)`. **Why can this be improved?** Each query only changes one cell; re-scanning the entire grid throws away everything already known about the grid's structure from before this query.

### Optimal Approach

**Core Observation**: adding land at `(r,c)` starts as its own new island (`islandCount++`); then, for each of its already-land 4-directional neighbours, if that neighbour's DSU root is different from `(r,c)`'s current root, union them and decrement `islandCount` by 1 — critically, check each neighbour's _root_ (not just "is it land") to avoid double-decrementing when two neighbours are already in the same island.

**Pattern Identification**: DSU, incremental/online connectivity — the defining trait that separates this from Problem 18's static flood fill.

**Step-by-Step Intuition**

1. Flattened DSU sized `m*n` (using `id = r*n+c`, §0.3); `isLand[m*n]` boolean array; `islandCount = 0`.
2. For each query `(r,c)`: if already land, the answer is unchanged, just re-report `islandCount`. Otherwise: mark land, `islandCount++`.
3. For each of the 4 neighbours that is land: if `find(neighbourId) != find(currentId)`, `union` them and `islandCount--`.
4. Append `islandCount` to the answer list after processing each query.
5. **Invariant**: `islandCount` always equals the true current number of DSU roots among land cells, because every merge is caught and decremented exactly once (guarded by the root-comparison, not a raw "is neighbour land" check).

**Why Does It Work?** Adding a single cell can never disconnect an existing island (islands are monotonically non-decreasing in connectivity as land is added) — it can only leave the count the same (isolated new cell), or merge 1–4 existing islands into the new cell, each merge reducing the count by exactly one; DSU union with a root-check captures precisely this.

**Java Code**

```java
public List<Integer> numIslands2(int m, int n, int[][] positions) {
    DSU dsu = new DSU(m * n); // §0.9
    boolean[] isLand = new boolean[m * n];
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    List<Integer> result = new ArrayList<>();
    int islandCount = 0;
    for (int[] pos : positions) {
        int r = pos[0], c = pos[1];
        int id = r * n + c;
        if (isLand[id]) { result.add(islandCount); continue; }
        isLand[id] = true;
        islandCount++;
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
            int nid = nr * n + nc;
            if (isLand[nid] && dsu.find(nid) != dsu.find(id)) {
                dsu.unionBySize(id, nid);
                islandCount--;
            }
        }
        result.add(islandCount);
    }
    return result;
}
```

**Complexity**: Time Complexity Calculation: `O(Q * α(m*n))` — each query does `O(1)` DSU operations. Space Complexity Calculation: `O(m*n)`.

### Pattern to Remember

```text
Clue: "online queries", "after each addition, report connectivity"
Pattern: DSU with an incrementally maintained counter, root-compare before decrementing
Mental model: DSU, incremental connectivity
```

**Similar problems**: 18, 45, 47. **Interview tip**: explicitly contrast with Problem 18 — "that was static, this is online, which is exactly what makes DSU the right tool instead of BFS."

## 49. Making a Large Island (LeetCode 827, Hard)

### Problem Understanding

Given a binary grid, you may change **at most one** `0` to `1`. Return the size of the largest possible resulting island.

### How to Think About the Problem

- What should I notice first? Two-phase problem: (1) find the size of every _existing_ island, (2) for every `0` cell, imagine flipping it and sum the sizes of the _distinct_ islands it would touch, plus 1 for itself.
- Clue → Pattern: _"flip one cell, maximize resulting connected size"_ → DSU (or Problem 8's component-listing helper) to pre-compute component sizes, then a single pass over `0` cells trying each hypothetical flip.

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every 0 cell, actually flip it and BFS/DFS the whole grid to measure the resulting island, O((n*m)^2)
        ↓
Observation: flipping a 0 cell only ever touches its up-to-4 neighbours' EXISTING islands; if I already know each island's size and each land cell's group id, I can compute the hypothetical result in O(4) per 0-cell instead of a full re-scan
        ↓
Two-phase DSU: (1) union all existing land, record group sizes, (2) for each 0-cell, sum sizes of DISTINCT neighbouring groups + 1, O(n*m)
```

### Brute Force Approach

For every `0` cell, temporarily set it to `1`, run Problem 6's full BFS/DFS island-size count, restore it to `0`, track the maximum. **Time Complexity Calculation**: `O((n*m)²)` in the worst case (many zero cells, each triggering a full grid traversal). **Why can this be improved?** Re-scanning the whole grid per candidate cell repeats almost all the same work each time — the existing islands don't change between candidates, only which of them get bridged.

### Optimal Approach

**Core Observation**: pre-compute, once, the DSU group and size of every existing island; then for each `0` cell, its hypothetical merged size is `1 + sum of sizes of each DISTINCT island among its up-to-4 land neighbours` — "distinct" is essential, because a `0` cell can have two neighbours from the _same_ island, which must only be counted once (deduplicate by root, e.g. with a small `Set<Integer>` of size ≤4).

**Pattern Identification**: DSU pre-computation + `O(1)`-per-cell hypothetical-merge evaluation.

**Step-by-Step Intuition**

1. DSU over `n*m` flattened ids (§0.3). Union every land cell with its land neighbours (right/down is enough if scanning in order, to avoid redundant unions, though unioning with all 4 also works).
2. Compute `size[root]` for every DSU root (count of cells whose `find()` equals that root).
3. If the grid is _all_ land, the answer is `n*m` (no `0` cell exists to flip; handle this edge case explicitly).
4. For every `0` cell `(r,c)`: gather the **distinct roots** among its ≤4 land neighbours into a small set; hypothetical size `= 1 + sum(size[root] for root in that set)`. Track the maximum across all `0` cells.
5. If there were no `0` cells at all, answer is `n*m` (same edge case as step 3, phrased differently).

**Why Does It Work?** Because DSU sizes are precomputed once and each `0` cell's evaluation only reads up to 4 neighbour roots and does a dedup via a tiny set, the entire second phase is `O(n*m)` instead of re-deriving component structure per candidate.

**Java Code**

```java
public int largestIsland(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    DSU dsu = new DSU(n * m); // §0.9
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (grid[r][c] == 1) {
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m || grid[nr][nc] == 0) continue;
                dsu.unionBySize(r * m + c, nr * m + nc);
            }
        }
    }
    int[] size = new int[n * m];
    boolean anyZero = false;
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (grid[r][c] == 1) size[dsu.find(r * m + c)]++;
        else anyZero = true;
    }
    if (!anyZero) return n * m;

    int best = 0;
    for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {
        if (grid[r][c] == 0) {
            Set<Integer> roots = new HashSet<>();
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m || grid[nr][nc] == 0) continue;
                roots.add(dsu.find(nr * m + nc));
            }
            int total = 1;
            for (int root : roots) total += size[root];
            best = Math.max(best, total);
        }
    }
    return best;
}
```

**Complexity**: Time Complexity Calculation: `O(n*m*α(n*m))` — the union phase and the evaluation phase are both linear scans with `O(1)`-ish DSU work per cell. Space Complexity Calculation: `O(n*m)`.

### Pattern to Remember

```text
Clue: "flip at most one cell to maximize connected region size"
Pattern: precompute DSU island sizes once, evaluate each candidate flip via distinct-neighbour-root dedup
Mental model: DSU, precompute-then-query
```

**Similar problems**: 48, 18, 8. **Interview tip**: say "dedupe by root, not by cell" out loud — forgetting this double-counts an island touched twice by the same `0` cell, a very common bug.

## 50. Swim in Rising Water (LeetCode 778, Hard)

### Problem Understanding

`n x n` grid where `grid[r][c]` is the elevation of that cell. At time `t`, all cells with elevation `≤ t` are submerged/passable. Find the minimum `t` such that a path exists from `(0,0)` to `(n-1,n-1)` using only passable cells (4-directional).

### How to Think About the Problem

- What should I notice first? This is exactly Problem 33's "minimize the maximum edge on a path" pattern again — here the "cost" of visiting a cell is its own elevation (not an edge difference), and the answer is the smallest `t` such that the maximum elevation _along the best path_ is `≤ t`.
- Clue → Pattern: _"minimum time/threshold such that a path exists"_ → binary search on the answer + BFS/DFS feasibility check, **or** Dijkstra-variant with `max()` relaxation, **or** DSU processing cells in increasing elevation order until start and end connect — three equally valid optimal approaches, all worth naming.

### Intuition (Brute → Better → Optimal)

```text
Brute force: try every possible t from 0 upward, BFS-check reachability each time, O(maxElevation * n^2)
        ↓
Observation (monotonicity): if a path exists at time t, one also exists at any t' > t — this justifies binary search on t
        ↓
Binary search on t (O(log(maxElevation))) + BFS feasibility check (O(n^2)) per guess = O(n^2 log(maxElevation))
    OR equivalently: Dijkstra with max() relaxation (Problem 33's exact technique) = O(n^2 log n)
    OR: sort cells by elevation, DSU-union passable neighbours in increasing order, stop the moment start and end share a root = O(n^2 log n) (sorting dominates)
```

### Brute Force Approach

Linear scan `t` from `0` upward, BFS-checking reachability at each `t` using only cells `≤ t`. **Time Complexity Calculation**: `O(maxElevation * n²)`. **Why can this be improved?** The monotonicity observation means we don't need to check every `t` linearly — binary search narrows it in `O(log(maxElevation))` guesses instead.

### Optimal Approach (binary search + BFS, shown primary; DSU noted as equally valid)

**Core Observation**: feasibility ("can I get from corner to corner using only cells `≤ t`") is monotonic in `t` — exactly the precondition binary search requires (§0.12's "minimize the maximum" entry, same family as Problem 33).

**Pattern Identification**: binary search on the answer, feasibility checked via BFS/DFS on a threshold-filtered grid.

**Step-by-Step Intuition**

1. Binary search `t` in `[grid[0][0], max cell value]` (the start cell's own elevation is a hard lower bound — you can't even begin before then).
2. Feasibility check for a candidate `t`: BFS/DFS from `(0,0)`, only stepping into cells with `grid[r][c] <= t`; check if `(n-1,n-1)` is reached.
3. If feasible, try smaller `t` (search left half); else search right half. Converge to the minimum feasible `t`.

**Why Does It Work?** Direct consequence of monotonicity — exactly as in any "minimize the threshold for which a boolean feasibility check flips from false to true" problem, binary search correctly finds the boundary.

**Java Code**

```java
public int swimInWater(int[][] grid) {
    int n = grid.length;
    int lo = grid[0][0], hi = n * n - 1;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (canReach(grid, mid)) hi = mid; else lo = mid + 1;
    }
    return lo;
}
private boolean canReach(int[][] grid, int t) {
    int n = grid.length;
    if (grid[0][0] > t) return false;
    boolean[][] visited = new boolean[n][n];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    q.add(new int[]{0,0}); visited[0][0] = true;
    int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
    while (!q.isEmpty()) {
        int[] cur = q.poll();
        if (cur[0] == n-1 && cur[1] == n-1) return true;
        for (int[] d : dirs) {
            int nr = cur[0]+d[0], nc = cur[1]+d[1];
            if (nr<0||nr>=n||nc<0||nc>=n||visited[nr][nc]||grid[nr][nc]>t) continue;
            visited[nr][nc] = true; q.add(new int[]{nr,nc});
        }
    }
    return false;
}
```

**Complexity**: Time Complexity Calculation: `O(n² log(n²))` — `O(log(n²))` binary search iterations, each an `O(n²)` BFS. Space Complexity Calculation: `O(n²)`.

### Pattern to Remember

```text
Clue: "minimum threshold/time such that a path/connection becomes possible"
Pattern: binary search on the threshold + BFS feasibility (or Dijkstra max()-relaxation, or DSU in sorted order)
Mental model: binary-search-on-answer + BFS, sibling of Dijkstra's max()-relaxation family
```

**Similar problems**: 33. **Interview tip**: name all three valid approaches and pick the one that maps most naturally to how the interviewer framed the problem — this question is specifically designed to test whether you recognize the _same_ underlying pattern across different surface phrasings (Problem 33 vs this one).

---

# PART F — Other Algorithms (3 problems)

## 51. Bridges in a Graph (Tarjan's tin/low) — Hard

### Problem Understanding

Given an undirected graph, find every "bridge": an edge whose removal increases the number of connected components (equivalently, an edge not on any cycle).

**LeetCode framing (1192, Critical Connections)**: same question, phrased as finding all critical network connections.

### How to Think About the Problem

- What should I notice first? A single DFS can classify every edge as a tree edge or a back edge (§0.5); a bridge is a tree edge with **no** back edge from its subtree reaching back to it or higher — Tarjan's `tin[]`/`low[]` (§0.11) captures exactly this in one pass.
- Clue → Pattern: _"critical connections"_, _"removing this edge disconnects"_ → Tarjan's bridge-finding DFS.

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every edge, remove it and check connectivity (BFS/DFS), O(E * (V+E))
        ↓
Observation: a single DFS can determine, for every subtree, the earliest-discovered vertex it can reach via a back edge (low[]) — comparing that to the parent's discovery time (tin[]) tells you instantly whether the tree edge to that subtree is a bridge
        ↓
One Tarjan DFS pass, O(V+E)
```

### Brute Force Approach

**Basic idea**: for each of the `E` edges, temporarily remove it, then BFS/DFS to check if the graph is still connected (or if the component count increases).
**Time Complexity Calculation**: `O(E * (V+E))`. **Why can this be improved?** Removing and re-checking edges one at a time repeats almost all of the same traversal work; a single well-instrumented DFS can determine every bridge simultaneously.

### Optimal Approach

**Core Observation**: `tin[u]` = DFS discovery time of `u`; `low[u]` = the smallest `tin` reachable from `u`'s subtree using **at most one back edge** (i.e., `min(tin[u], tin[back-edge targets], low[children])`). For a tree edge `(u, v)` where `u` is `v`'s DFS parent, if `low[v] > tin[u]`, then nothing in `v`'s subtree can reach `u` or any ancestor of `u` — meaning `(u,v)` is the _only_ connection between `v`'s subtree and the rest of the graph, i.e., a bridge.

**Pattern Identification**: Tarjan's tin/low DFS (§0.11).

**Step-by-Step Intuition**

1. `tin[] = -1`, `low[] = -1`, a global `timer` starting at 0.
2. DFS from any unvisited vertex `u`, parent `par` (start with `par=-1`): set `tin[u] = low[u] = timer++`.
3. For each neighbour `v`: skip if `v == par` (**and only skip one occurrence** of the parent — if there are multi-edges to the parent, that's a different case, but the sheet's problems assume simple graphs). If `v` unvisited: recurse with parent `u`; after returning, `low[u] = min(low[u], low[v])`; check `if (low[v] > tin[u])` → `(u,v)` is a bridge. If `v` already visited (a back edge, not to parent): `low[u] = min(low[u], tin[v])`.
4. **Invariant**: `low[u]` always correctly reflects the earliest-discovered vertex reachable from `u`'s subtree via any single back edge, because it's updated by every child's finished `low` and every direct back edge encountered.

**Dry Run** on a graph `0-1, 1-2, 2-0, 1-3`: DFS from `0` (`tin=low=0`) → `1` (`tin=low=1`) → `2` (`tin=low=2`), edge `2-0` is a back edge to visited `0`, `low[2]=min(2, tin[0]=0)=0`; return to `1`, `low[1]=min(1, low[2]=0)=0`; check `low[2]=0 > tin[1]=1`? No → `1-2` not a bridge. Continue `1`'s other neighbour `3` (`tin=low=3`), no further edges, return; `low[1]=min(0,3)=0`; check `low[3]=3 > tin[1]=1`? Yes → `1-3` **is** a bridge. Return to `0`: `low[0]=min(0,low[1]=0)=0`; check for edge `0-1`: `low[1]=0 > tin[0]=0`? No → not a bridge (correct — `0,1,2` form a cycle, no edge in it is a bridge; only the pendant `1-3` is).

**Why Does It Work?** `low[v] > tin[u]` is precisely the statement "`v`'s subtree has no back edge reaching `u` or anything discovered before `u`" — meaning the _only_ way to get from `v`'s subtree to the rest of the graph is through the tree edge `(u,v)` itself, which is exactly the definition of a bridge.

**Java Code**

```java
int timer = 0;
List<int[]> findBridges(int n, List<List<Integer>> adj) {
    int[] tin = new int[n], low = new int[n];
    boolean[] visited = new boolean[n];
    Arrays.fill(tin, -1);
    List<int[]> bridges = new ArrayList<>();
    for (int i = 0; i < n; i++) if (!visited[i]) dfsBridge(i, -1, visited, tin, low, adj, bridges);
    return bridges;
}
private void dfsBridge(int u, int parent, boolean[] visited, int[] tin, int[] low, List<List<Integer>> adj, List<int[]> bridges) {
    visited[u] = true;
    tin[u] = low[u] = timer++;
    boolean skippedParent = false;
    for (int v : adj.get(u)) {
        if (v == parent && !skippedParent) { skippedParent = true; continue; }
        if (!visited[v]) {
            dfsBridge(v, u, visited, tin, low, adj, bridges);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > tin[u]) bridges.add(new int[]{u, v});
        } else {
            low[u] = Math.min(low[u], tin[v]);
        }
    }
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` — one DFS pass. Space Complexity Calculation: `O(V)` for `tin`, `low`, `visited`, plus recursion depth.

### Pattern to Remember

```text
Clue: "critical connections", "edges whose removal disconnects"
Pattern: single Tarjan DFS with tin[]/low[], bridge iff low[child] > tin[parent]
Mental model: Tarjan tin/low
```

**Similar problems**: 52. **Interview tip**: be precise about "skip only one occurrence of the parent" — this matters if the input can have multi-edges; for simple graphs it's a minor footnote worth mentioning anyway to show rigor.

## 52. Articulation Point in Graph — Hard

### Problem Understanding

Given an undirected graph, find every articulation point (cut vertex): a vertex whose removal increases the number of connected components.

### How to Think About the Problem

- What should I notice first? Same `tin[]`/`low[]` machinery as Problem 51, but the test condition changes: it's about a _vertex_ being critical, not an edge, and there's a special-case rule for the DFS root.
- Clue → Pattern: _"critical vertex"_, _"removing this node disconnects"_ → Tarjan's articulation-point DFS.

### Intuition

```text
Brute force: for every vertex, remove it, check connectivity, O(V * (V+E))
        ↓
Observation: reuse Problem 51's tin/low computation, but check low[child] >= tin[u] (not strictly >) for non-root vertices, and separately handle the DFS root via a child-count rule
        ↓
One Tarjan DFS pass, O(V+E)
```

### Optimal Approach

**Core Observation — two rules, not one**:

1. **Root rule**: the DFS root is an articulation point **iff** it has `≥ 2` direct children in the DFS tree (each child's subtree can only reach the rest of the graph through the root, so ≥2 independent subtrees means removing the root disconnects them from each other).
2. **Non-root rule**: a non-root vertex `u` is an articulation point iff it has some child `v` with `low[v] >= tin[u]` — note **`>=`, not `>`** (the bridge test's strict inequality) — because even if `v`'s subtree can reach _exactly_ `u` (but nothing shallower), removing `u` still severs that subtree from everything above `u`.

**Pattern Identification**: Tarjan's tin/low DFS (§0.11), articulation-point variant of Problem 51.

**Step-by-Step Intuition**

1. Same `tin[]`/`low[]` DFS skeleton as Problem 51, plus a `childCount` per DFS-root call and an `isArticulation[]` boolean array.
2. For the DFS root: after finishing, if `childCount >= 2`, mark it as an articulation point.
3. For any non-root `u`, for each DFS-tree child `v`: after the recursive call returns and `low[u]` is updated, if `low[v] >= tin[u]`, mark `u` as an articulation point.

**Why Does It Work?** `low[v] >= tin[u]` means `v`'s subtree's best possible back edge reaches no shallower than `u` itself — so `u` is load-bearing for that subtree's connection to the rest of the graph; the root's separate rule exists because the root has no ancestor to be "cut off from" — its criticality is purely about whether it's the sole bridge between ≥2 of its own subtrees.

**Java Code**

```java
int timer = 0;
List<Integer> findArticulationPoints(int n, List<List<Integer>> adj) {
    int[] tin = new int[n], low = new int[n];
    boolean[] visited = new boolean[n], isAP = new boolean[n];
    Arrays.fill(tin, -1);
    for (int i = 0; i < n; i++) if (!visited[i]) dfsAP(i, -1, visited, tin, low, adj, isAP);
    List<Integer> result = new ArrayList<>();
    for (int i = 0; i < n; i++) if (isAP[i]) result.add(i);
    return result;
}
private void dfsAP(int u, int parent, boolean[] visited, int[] tin, int[] low, List<List<Integer>> adj, boolean[] isAP) {
    visited[u] = true;
    tin[u] = low[u] = timer++;
    int childCount = 0;
    boolean skippedParent = false;
    for (int v : adj.get(u)) {
        if (v == parent && !skippedParent) { skippedParent = true; continue; }
        if (!visited[v]) {
            dfsAP(v, u, visited, tin, low, adj, isAP);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] >= tin[u] && parent != -1) isAP[u] = true;
            childCount++;
        } else {
            low[u] = Math.min(low[u], tin[v]);
        }
    }
    if (parent == -1 && childCount >= 2) isAP[u] = true;
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)`. Space Complexity Calculation: `O(V)` plus recursion depth.

### Pattern to Remember

```text
Clue: "critical vertex", "removing this node disconnects the graph"
Pattern: Tarjan tin/low, low[child] >= tin[u] for non-root, childCount >= 2 for root
Mental model: Tarjan tin/low, vertex variant
```

**Similar problems**: 51. **Interview tip**: state both rules and _why the root needs a separate rule_ — "the root has no parent to be cut off from" is the exact phrase that shows real understanding, not memorization.

## 53. Strongly Connected Components — Kosaraju's Algorithm — Hard

### Problem Understanding

Given a **directed** graph, find its Strongly Connected Components (SCCs): maximal groups of vertices where every vertex can reach every other vertex in the group via directed edges. (Note: the sheet's original LeetCode link is a known mismatch for this topic — use GeeksforGeeks "Strongly Connected Components (Kosaraju's Algorithm)" as the reference problem instead.)

### How to Think About the Problem

- What should I notice first? "Mutually reachable" is a fundamentally different question from ordinary reachability (which is one-directional) — plain DFS/BFS from one vertex only finds what it can reach _from_ that vertex, not what can _also_ reach back to it.
- Clue → Pattern: _"mutually reachable"_, _"strongly connected"_ → Kosaraju's algorithm: finish-order DFS + graph transpose + DFS again in that finish order.

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every pair (u,v), check if u reaches v AND v reaches u, O(V * (V+E)) just for one-directional reachability from each vertex, then O(V^2) pairing — very expensive
        ↓
Observation: reversing every edge doesn't change WHICH vertices are mutually reachable (an SCC in the original graph is still an SCC in the transpose), but it lets a clever DFS order isolate one SCC at a time
        ↓
Kosaraju's: (1) DFS original graph, record finish order; (2) transpose all edges; (3) DFS the transpose in DECREASING finish order — each resulting DFS tree is exactly one SCC, O(V+E)
```

### Brute Force Approach

For each pair `(u,v)`, run a reachability BFS/DFS both ways. **Time Complexity Calculation**: `O(V * (V+E))` for building one-directional reachability from every vertex, then combining — substantially worse than `O(V+E)`. **Why can this be improved?** Most of that pairwise reachability information is redundant; SCC membership can be determined by two cleverly-ordered full-graph traversals instead of `V` separate ones.

### Optimal Approach

**Core Observation**: (1) DFS the original graph, pushing each vertex onto a stack when it **finishes** (exactly like topological sort, Problem 21 — though the graph need not be a DAG here). (2) Build the **transpose** graph (reverse every edge). (3) Pop vertices off the stack one at a time; for each unvisited one, DFS the _transpose_ graph from it — each such DFS tree is exactly one complete SCC.

**Pattern Identification**: Kosaraju's two-pass algorithm (§0.11) — finish-order DFS, transpose, DFS again.

**Step-by-Step Intuition**

1. Run ordinary DFS on the original graph (any order), pushing each vertex to a stack on finish (Problem 21's exact mechanism).
2. Build the transpose: for every original edge `u->v`, add `v->u` to a new adjacency list.
3. Pop the stack; for each popped, still-unvisited vertex `u`, run DFS on the **transpose** graph from `u`, marking everything reached as visited and belonging to the same SCC as `u`.
4. Each DFS call in step 3 produces exactly one SCC.

**Dry Run** on `0->1, 1->2, 2->0, 1->3` (a triangle `0,1,2` plus a pendant `3`): finish-order DFS from `0` gives stack (bottom→top, by finish time) something like `3, 2, 1, 0` (exact order depends on traversal, but `0` finishes last since it's part of the cycle explored first and its neighbours finish before it). Popping top-first: `0` → DFS transpose graph (edges now `1->0, 2->1, 0->2, 3->1`) from `0`: reach `2` (via `0->2` in transpose), reach `1` (via `2->1`) — but does NOT reach `3` (transpose edge is `3->1`, wrong direction from `1`) → SCC `{0,1,2}`. Pop `3` (unvisited) → DFS transpose from `3`: no outgoing transpose edges from `3` reach anything new → SCC `{3}`.

**Why Does It Work?** If `u` and `v` are in the same SCC, they remain mutually reachable after reversing every edge (reachability both ways is symmetric under a global reversal). The finish-order trick ensures that when you start a transpose-DFS from the highest-finish-time unvisited vertex, that DFS can only "leak" into a different SCC if there were an edge from a lower-finish SCC to a higher-finish one in the _original_ graph — but the transpose reverses exactly that edge, blocking the leak, so the DFS is contained precisely within one SCC.

**Java Code**

```java
List<List<Integer>> kosarajuSCC(int n, List<List<Integer>> adj) {
    boolean[] visited = new boolean[n];
    ArrayDeque<Integer> stack = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (!visited[i]) fillOrder(i, visited, adj, stack);

    List<List<Integer>> transpose = new ArrayList<>();
    for (int i = 0; i < n; i++) transpose.add(new ArrayList<>());
    for (int u = 0; u < n; u++) for (int v : adj.get(u)) transpose.get(v).add(u);

    Arrays.fill(visited, false);
    List<List<Integer>> sccs = new ArrayList<>();
    while (!stack.isEmpty()) {
        int u = stack.pop();
        if (!visited[u]) {
            List<Integer> comp = new ArrayList<>();
            dfsCollect(u, visited, transpose, comp);
            sccs.add(comp);
        }
    }
    return sccs;
}
private void fillOrder(int u, boolean[] visited, List<List<Integer>> adj, ArrayDeque<Integer> stack) {
    visited[u] = true;
    for (int v : adj.get(u)) if (!visited[v]) fillOrder(v, visited, adj, stack);
    stack.push(u);
}
private void dfsCollect(int u, boolean[] visited, List<List<Integer>> adj, List<Integer> comp) {
    visited[u] = true;
    comp.add(u);
    for (int v : adj.get(u)) if (!visited[v]) dfsCollect(v, visited, adj, comp);
}
```

**Complexity**: Time Complexity Calculation: `O(V+E)` for the first DFS, `O(V+E)` to build the transpose, `O(V+E)` for the second DFS → `O(V+E)` total. Space Complexity Calculation: `O(V+E)` for the transpose graph plus `O(V)` for auxiliary arrays.

### Pattern to Remember

```text
Clue: "strongly connected", "mutually reachable groups", directed graph
Pattern: finish-order DFS + transpose + DFS again in decreasing finish order
Mental model: Kosaraju SCC
```

**Similar problems**: 21 (shares the finish-order DFS mechanism). **Interview tip**: explain _why_ reversing edges plus finish-order prevents "leaking" between SCCs during the second DFS — that correctness argument, not just the three-step recipe, is what separates understanding from memorization.

---

# Final Summary — All 53 Questions Grouped by Pattern

## Pattern Grouping

| Pattern                                            | Problem numbers                                    | One-line tell                                                          |
| -------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Representation & primitives                        | 1, 2, 4, 5                                         | Building the adjacency list / BFS / DFS skeleton itself                |
| Component counting (BFS/DFS wrapper)               | 3, 6, 7, 8, 18, 45                                 | "Count/list connected regions", graph may be disconnected              |
| Grid flood fill (component counting, grid variant) | 6, 10, 18                                          | "Region", "island", "paint bucket" on a `char[][]`/`int[][]`           |
| Multi-source BFS                                   | 9, 13, 14, 15                                      | "Spreads simultaneously from several sources", "distance to nearest X" |
| Boundary-first flood fill ("safe set")             | 14, 15, 26                                         | "Reachable from the border/terminal survives, rest flips/counts"       |
| Cycle detection, undirected                        | 11, 12                                             | "Cycle" + undirected graph → parent-tracking BFS/DFS                   |
| Cycle detection, directed                          | 20, 23, 24                                         | "Cycle" + directed graph → `pathVisited` DFS or Kahn's leftover count  |
| Bipartite coloring                                 | 19                                                 | "2-color", "no edge within same group"                                 |
| Implicit-graph BFS (state-space)                   | 16, 17, 37                                         | Nodes are not given explicitly — generated by a transformation rule    |
| Topological ordering                               | 21, 22, 24, 25, 26, 27                             | "Prerequisite", "build order", "dependency", DAG guaranteed            |
| Unweighted shortest path                           | 4, 28, 32                                          | Uniform edge cost → plain BFS with a `dist[]` array                    |
| Shortest path in a DAG                             | 29                                                 | DAG + weights (possibly negative) → topo order + one relax pass        |
| Dijkstra family                                    | 30, 31, 33, 35, 36, 42 (Prim's, structural cousin) | Non-negative weights, greedy priority-queue relaxation                 |
| "Minimize the maximum edge/step"                   | 33, 50                                             | Dijkstra with `max()` relaxation, or binary-search-on-answer + BFS     |
| Bellman-Ford family                                | 34, 38                                             | Negative weights allowed, and/or an edge-count budget                  |
| All-pairs shortest path                            | 39, 40                                             | "For every pair", small `V`, Floyd-Warshall                            |
| MST                                                | 41, 42, 44                                         | "Minimum total weight to connect everything"                           |
| DSU merging / dynamic connectivity                 | 43, 45, 46, 47, 48, 49                             | "Merge groups", "same group as", "online/incremental connectivity"     |
| DSU + binary-search / sorted processing            | 50                                                 | Elevation/threshold framing on top of connectivity                     |
| Tarjan tin/low                                     | 51, 52                                             | "Critical edge/vertex", "removal disconnects"                          |
| Kosaraju SCC                                       | 53                                                 | "Mutually reachable groups", directed graph                            |

## One-Paragraph Takeaways

**Part A (Foundation).** Everything downstream is BFS or DFS wearing a costume. Learn to build an adjacency list from any input shape (edge list, matrix, grid) without thinking, and learn the outer "loop over unvisited vertices" wrapper — a huge fraction of "hard-looking" problems are this wrapper plus one twist.

**Part B (BFS/DFS problems).** The twist is almost always one of: multiple simultaneous sources (push them all with distance 0), a graph that's implicit rather than given (generate neighbours from a rule), or a need to track _parent_/_path_ state alongside the visited flag (undirected vs directed cycle detection). Once you can name which twist a problem is using, the code is close to boilerplate.

**Part C (Topological sort).** One invariant — a vertex is placed only after everything it depends on — has two equally valid implementations (DFS finish-stack, or Kahn's BFS by in-degree), and Kahn's variant gives you directed-cycle detection as a free side effect. Nearly every "prerequisite/course/build order" problem is this section wearing different nouns.

**Part D (Shortest paths).** All five algorithms here are the same one-line relaxation (`dist[v] = min(dist[v], dist[u]+w)`) applied under different constraints: no weights → BFS; acyclic → topo order once; non-negative weights → Dijkstra's greedy priority queue; negative weights → Bellman-Ford's blind repetition; all pairs at once → Floyd-Warshall's intermediate-vertex DP. Picking the right one is entirely about correctly diagnosing which constraint the problem hands you.

**Part E (MST / DSU).** MST is the cut property (Problem 41) executed either vertex-by-vertex (Prim's) or edge-by-edge (Kruskal's). DSU is the tool for any question about connectivity that _changes over time_ or needs to be queried many times cheaply — component counting, incremental additions, or merging records by a shared attribute are all the same `find`/`union` skeleton with a different "what gets unioned" rule.

**Part F (Tarjan / Kosaraju).** Both algorithms squeeze a global structural fact (which edges/vertices are load-bearing, which vertices are mutually reachable) out of a _single_ well-instrumented DFS pass, using discovery time (`tin`) and reachability-via-one-back-edge (`low`), or a finish-order-plus-transpose trick. They're the "hard mode" payoff for having internalized what a DFS call stack actually represents.

## Exam Checklist — How To Recognize On The Spot

```text
Count/browse connected stuff in a grid or matrix?  -> BFS/DFS flood fill
Something spreads from multiple sources at once?   -> multi-source BFS
"Safe if reachable from border/terminal, else flip/count"? -> boundary-first flood fill
Dependencies / ordering / "prerequisites"?         -> topological sort (Kahn's or DFS finish-stack)
Nodes aren't given explicitly, generated by a rule? -> BFS on an implicit graph (word ladder, mult-chain)
Shortest path on uniform cost?                     -> plain BFS
Shortest path, DAG, possibly negative weights?      -> topological order + one relax pass
Shortest path, positive weights?                    -> Dijkstra
Negative weights, or an edge-count BUDGET?          -> Bellman-Ford
All pairs shortest, small V?                        -> Floyd-Warshall
"Minimize the maximum edge/step on a path"?         -> binary search + BFS, or Dijkstra max()-relaxation variant
Merge groups dynamically / connect/remove/online?   -> DSU
"Edges/vertices whose removal disconnects"?         -> Tarjan tin/low (bridges / articulation points)
"Groups mutually reachable both ways"?              -> Kosaraju SCC
Cycle check, undirected?                            -> BFS/DFS with parent tracking
Cycle check, directed?                              -> DFS with pathVisited, or Kahn's leftover indegree
2-color, no edge within a group?                    -> bipartite BFS/DFS coloring
```

## Complexity Cheat Sheet

`N = n*m` for grid problems, `E ≈ 4N` for 4-directional grids. `V, E` are vertex/edge counts otherwise.

| #   | Problem                              | Brute                          | Optimal                      |
| --- | ------------------------------------ | ------------------------------ | ---------------------------- | --- | --- |
| 1   | Graph Representation                 | —                              | `O(V+E)` build               |
| 2   | Graph Representation (Java-specific) | —                              | `O(V+E)` build               |
| 3   | Connected Components                 | —                              | `O(V+E)`                     |
| 4   | BFS Traversal                        | —                              | `O(V+E)`                     |
| 5   | DFS Traversal                        | —                              | `O(V+E)`                     |
| 6   | DFS on Grid                          | —                              | `O(N)`                       |
| 7   | Number of Provinces                  | `O(V²)`                        | `O(V²)` (matrix input bound) |
| 8   | Connected Components in Matrix       | —                              | `O(N)`                       |
| 9   | Rotten Oranges                       | `O(N*(n+m))`                   | `O(N)`                       |
| 10  | Flood Fill                           | —                              | `O(N)`                       |
| 11  | Cycle Detection Undirected (BFS)     | —                              | `O(V+E)`                     |
| 12  | Cycle Detection Undirected (DFS)     | —                              | `O(V+E)`                     |
| 13  | 01 Matrix                            | `O(N²)`                        | `O(N)`                       |
| 14  | Surrounded Regions                   | `O(N²)`                        | `O(N)`                       |
| 15  | Number of Enclaves                   | `O(N²)`                        | `O(N)`                       |
| 16  | Word Ladder I                        | `O(N²*L)`                      | `O(N*L²*26)`                 |
| 17  | Word Ladder II                       | exponential                    | `O(N*L²*26)` + backtrack     |
| 18  | Number of Islands                    | —                              | `O(N)`                       |
| 19  | Is Graph Bipartite                   | exponential                    | `O(V+E)`                     |
| 20  | Cycle Detection Directed (DFS)       | incorrect (undirected trick)   | `O(V+E)`                     |
| 21  | Topological Sort (DFS)               | —                              | `O(V+E)`                     |
| 22  | Topological Sort (Kahn's)            | —                              | `O(V+E)`                     |
| 23  | Cycle Detection Directed (Kahn's)    | —                              | `O(V+E)`                     |
| 24  | Course Schedule I                    | —                              | `O(V+E)`                     |
| 25  | Course Schedule II                   | —                              | `O(V+E)`                     |
| 26  | Eventual Safe States                 | `O(V*(V+E))`                   | `O(V+E)`                     |
| 27  | Alien Dictionary                     | `O(26!)`                       | `O(N*L)`                     |
| 28  | Shortest Path Unit Weights           | —                              | `O(V+E)`                     |
| 29  | Shortest Path in DAG                 | Dijkstra `O((V+E)logV)`        | `O(V+E)`                     |
| 30  | Dijkstra (PQ)                        | `O(V*E)` (Bellman-Ford)        | `O((V+E)logV)`               |
| 31  | Dijkstra (Set)                       | —                              | `O((V+E)logV)`               |
| 32  | Shortest Path Binary Maze            | Dijkstra `O(N logN)`           | `O(N)`                       |
| 33  | Path with Minimum Effort             | exponential                    | `O(N logN)`                  |
| 34  | Cheapest Flights within K Stops      | `O(E^k)`                       | `O(K*E)`                     |
| 35  | Network Delay Time                   | —                              | `O((V+E)logV)`               |
| 36  | Number of Ways to Arrive             | —                              | `O((V+E)logV)`               |
| 37  | Minimum Multiplications              | exponential                    | `O(100000\*                  | arr | )`  |
| 38  | Bellman-Ford                         | —                              | `O(V*E)`                     |
| 39  | Floyd-Warshall                       | `O(V*(V+E)logV)` (V Dijkstras) | `O(V³)`                      |
| 40  | Find the City                        | `O(V*(V+E)logV)`               | `O(V³)`                      |
| 41  | MST Theory                           | `O(V^(V-2))` (Cayley)          | — (conceptual)               |
| 42  | Prim's Algorithm                     | exponential                    | `O(E logV)`                  |
| 43  | Disjoint Set                         | `O(V)` naive find              | `O(α(V))` amortized          |
| 44  | Find MST Weight                      | exponential                    | `O(E logE)`                  |
| 45  | Number of Operations to Connect      | —                              | `O(V+E)`                     |
| 46  | Most Stones Removed                  | `O(stones²)`                   | `O(stones*α)`                |
| 47  | Accounts Merge                       | —                              | `O(NK log(NK))`              |
| 48  | Number of Islands II                 | `O(Q*N)`                       | `O(Q*α(N))`                  |
| 49  | Making a Large Island                | `O(N²)`                        | `O(N*α(N))`                  |
| 50  | Swim in Rising Water                 | `O(maxElev*N)`                 | `O(N logN)`                  |
| 51  | Bridges (Tarjan)                     | `O(E*(V+E))`                   | `O(V+E)`                     |
| 52  | Articulation Points                  | `O(V*(V+E))`                   | `O(V+E)`                     |
| 53  | Kosaraju SCC                         | `O(V*(V+E))`                   | `O(V+E)`                     |

## A Closing Note on How to Study This

- Don't memorize 53 pieces of code. Memorize the mapping `clue → pattern → template` from §0.13 and the Exam Checklist above — the code falls out once the pattern is named correctly.
- Before writing anything, ask the four questions from §0.12: _Is this a graph, and if so what does a node/edge mean here? Which representation fits the input? Which traversal is the question actually about (BFS/DFS/topo/shortest-path/DSU/Tarjan)? What invariant does that traversal guarantee, and how does it answer the specific question asked?_
- Re-derive BFS, Kahn's algorithm, Dijkstra, and DSU's `find`/`union` from a blank page, from memory, until you can do it without hesitating — these four are the load-bearing primitives that every other problem in this guide builds on.
- When a problem feels novel, look for which _invariant_ is doing the work (BFS level = shortest hops; DFS finish order = safe dependency order; Dijkstra's popped-min = final; DSU root = group identity; `low[v] > tin[u]` = bridge) — novelty is almost always a new _setting_ for an invariant you already know, not a genuinely new invariant.
- Practice explaining, out loud, _why_ the brute-force idea for a problem is wrong or slow before jumping to the optimal one — that narrative (not just the final code) is what separates a memorized answer from a derived one, and it's what most interviews are actually scoring.
- Revisit Parts D and E last and most often — the shortest-path and DSU families have the highest problem density on real interview sheets, and their five or six primitives cover a disproportionate share of "hard" graph questions you'll see anywhere else.
