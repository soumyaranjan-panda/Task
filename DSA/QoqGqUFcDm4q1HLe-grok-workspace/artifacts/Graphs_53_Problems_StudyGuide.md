# Graphs — 53 Problems Study Guide (Java)

This is a problem-first Java study guide for the 53 graph questions that show up in interviews. It is not a textbook chapter and it is not a sheet of templates to memorise. Each problem teaches one new observation: a reason the naïve walk fails, a reason BFS is enough, a reason you need DSU instead of a traversal. By the last problem you should look at a prompt and name the mental model before you name the data structure.

Read it in order. This Foundation page is the shared vocabulary — representations, BFS, DFS, cycle checks, topological sort, relaxation, DSU, MST, `tin[]`/`low[]`, Kosaraju. You study it once, then you stop re-deriving the skeleton. Parts A–F are the 53 problems, sequenced so each part reuses the last part's insight and adds one. After the problems, the Final Summary is a revision sheet: decision tree, template index, the traps. When you revise, read the Foundation and the Final Summary; reopen a problem only when a template feels shaky.

Every problem uses the same seven-step shape. **Problem Understanding** restates the prompt, constraints, observations, and a small example. **How to Think** is a self-questioning dialogue that ends in a *Clue → Pattern* line. **Intuition** draws the brute → observation → optimal arrow. **Brute** (or Naïve) is the idea that fails or is too slow, with Java and a why-improve note. **Optimal** names the structure being exploited, the invariant, a dry-run table on the example, working Java, and a narrated complexity. **Pattern to Remember** is three lines — Clue, Pattern, Mental model — plus similar problems and one interview tip. All code is Java 21. The only imports you need live in `java.util`. `ArrayDeque`, never `Stack`. `List<List<Integer>>` adjacency lists. Primitive arrays over boxed wrappers.

## 0. The Foundation: Graphs in One Page

You will copy these skeletons fifty-three times. Get them right here, then spend the problems on the observation, not on the queue.

### What a graph is and the vocabulary

A graph is a set of **vertices** (nodes) plus a set of **edges** (pairs of vertices). Everything else is a qualifier on those two sets. Name the qualifiers before you pick an algorithm — the wrong qualifier is the most common way a graph problem goes wrong.

| Term | Meaning | Why it changes the code |
|---|---|---|
| **Vertex / node** | An object. Usually `0..n-1`. | Size of `vis[]`, `dist[]`, DSU `parent[]`. |
| **Edge** | A connection `{u, v}` or `u → v`. | Builds the adjacency list. |
| **Undirected** | `{u, v}` is usable both ways. | Push `v` into `adj[u]` **and** `u` into `adj[v]`. |
| **Directed** | `u → v` is one-way. | Push only `v` into `adj[u]`. Parent-only cycle checks lie. |
| **Unweighted** | Every edge costs `1` (or the same constant). | BFS distance = shortest path. |
| **Weighted** | Edge carries a cost `w`. | Relaxation. Dijkstra / Bellman-Ford / Floyd-Warshall. |
| **Cycle** | A walk that returns to its start without repeating an edge in the undirected sense, or a directed closed walk. | Blocks topological order. Changes "visited" into "on-path". |
| **Connected** (undirected) | A path exists between every pair. | One BFS/DFS from any node paints the whole graph. |
| **Disconnected** | At least two nodes have no path. | Outer loop over all vertices. Count components. |
| **Connected component** | A maximal connected subgraph. | Each unvisited node starts a new flood. |
| **Bipartite** | Vertices split into two sets, every edge goes between sets. Equivalent: no odd cycle. | 2-colour BFS/DFS. Conflict = odd cycle. |
| **DAG** | Directed Acyclic Graph. | Topological order exists **iff** the graph is a DAG. |
| **Degree** | Undirected: number of incident edges. Directed: **in-degree** (incoming) and **out-degree** (outgoing). | Kahn's algorithm is an in-degree queue. |
| **Self-loop** | Edge `u → u`. | Immediate cycle in directed. In undirected, a cycle of length 1. Skip or detect explicitly. |
| **Multi-edge** | Two or more edges between the same pair. | Matrix overwrites; list stores duplicates. Kruskal must see each parallel edge. |

Two pictures. Same four vertices, different meaning.

```text
Undirected, one connected component, one cycle (0-1-2-0):

        0
       / \
      1———2
      |
      3

vertices = {0,1,2,3}
edges    = {0-1, 0-2, 1-2, 1-3}
deg(1)=3, deg(0)=2, deg(2)=2, deg(3)=1
```

```text
Directed, no cycle (a DAG), not strongly connected:

        0 → 1
        ↓   ↓
        2 → 3

edges = {0→1, 0→2, 1→3, 2→3}
in-deg  0:0  1:1  2:1  3:2
out-deg 0:2  1:1  2:1  3:0
```

**Connected vs strongly connected.** In an undirected graph, "connected" is enough. In a directed graph, reachability is one-way: `0` can reach `3` above, `3` cannot reach `0`. A **strongly connected component (SCC)** is a maximal set where every node can reach every other. The DAG above has four SCCs of size 1. Kosaraju (problem 53 territory) is how you find them.

**Bipartite check, one sentence.** Paint `u` colour `0`. Every neighbour must be colour `1`. If you ever see a neighbour already painted the same colour as `u`, you found an odd cycle — the graph is not bipartite.

Ask yourself, before any of the 53: *undirected or directed? weighted or not? could there be a cycle? is the graph given, or is it hiding in a grid / a word list / a matrix?*

### Representations & when to pick which

Three explicit representations, plus the grid which is a graph that does not want to be built.

```text
Adjacency list (sparse, default)
  0: 1, 2
  1: 0, 2, 3
  2: 0, 1
  3: 1

Adjacency matrix (dense, O(1) "is there an edge?")
      0 1 2 3
    0 0 1 1 0
    1 1 0 1 1
    2 1 1 0 0
    3 0 1 0 0

Edge list (Kruskal, Bellman-Ford)
    (0,1), (0,2), (1,2), (1,3)
```

| representation | build | neighbour iterate | space | when to use |
|---|---|---|---|---|
| adjacency list | `O(n + E)` | `O(deg(u))` | `O(n + E)` | Default. Sparse graphs. BFS, DFS, Dijkstra, topo, Tarjan. |
| adjacency matrix | `O(n²)` zero + `O(E)` fill | `O(n)` | `O(n²)` | Dense graphs. `O(1)` edge lookup. Floyd-Warshall. `n ≤ ~400`. |
| edge list | `O(E)` | must scan all `E` | `O(E)` | Kruskal (sort the edges). Bellman-Ford (relax every edge). |

Neighbour-iterate cost is the reason lists win. Matrix iteration is `O(n)` even if `u` has one neighbour. On a sparse graph of `n = 10^5`, `E = 2·10^5`, that is the difference between `O(n + E)` and `O(n²)`.

**Trap:** a matrix of `int` weights cannot use `0` to mean "no edge" if `0` is a legal weight. Store `INF` for missing, and never relax from `INF`.

**Build an undirected unweighted list from `n` and `int[][] edges`.** 0-indexed. If the problem is 1-indexed, subtract one at the door or allocate `n+1` and ignore index `0`.

```java
static List<List<Integer>> undirected(int n, int[][] edges) {
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        adj.get(e[1]).add(e[0]);
    }
    return adj;
}
```

**Build a directed weighted list.** Neighbour is `{v, w}`. The extra array is the price of a weight.

```java
static List<List<int[]>> directedWeighted(int n, int[][] edges) {
    List<List<int[]>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        int u = e[0], v = e[1], w = e[2];
        adj.get(u).add(new int[]{v, w});
    }
    return adj;
}
```

**Adjacency matrix**, undirected unweighted:

```java
static int[][] matrix(int n, int[][] edges) {
    int[][] g = new int[n][n];
    for (int[] e : edges) {
        g[e[0]][e[1]] = 1;
        g[e[1]][e[0]] = 1;
    }
    return g;
}
```

**Grid as an implicit graph.** You do **not** allocate an adjacency list for a grid unless a later algorithm (DSU, 1-D Dijkstra) demands a flattened id. Walk `dirs` from `(r, c)`.

```java
static void walkGrid(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    boolean[][] vis = new boolean[n][m];
    ArrayDeque<int[]> q = new ArrayDeque<>();
    q.addLast(new int[]{0, 0});
    vis[0][0] = true;
    while (!q.isEmpty()) {
        int r = q.peekFirst()[0], c = q.removeFirst()[1];
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
            if (!in || vis[nr][nc]) continue;
            vis[nr][nc] = true;
            q.addLast(new int[]{nr, nc});
        }
    }
}
```

When you *do* need a list (DSU-adjacent algorithms, treating the grid as a 1-D Dijkstra graph), flatten. Same code for `char[][]` — compare against the walkable character instead of `1`.

```java
static List<List<Integer>> gridToAdj(int[][] grid) {
    int n = grid.length, m = grid[0].length;
    int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n * m; i++) adj.add(new ArrayList<>());
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < m; c++) {
            if (grid[r][c] == 0) continue;          // blocked
            int u = r * m + c;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (!in || grid[nr][nc] == 0) continue;
                adj.get(u).add(nr * m + nc);
            }
        }
    }
    return adj;
}

static List<List<Integer>> gridToAdj(char[][] grid, char walkable) {
    int n = grid.length, m = grid[0].length;
    int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n * m; i++) adj.add(new ArrayList<>());
    for (int r = 0; r < n; r++) {
        for (int c = 0; c < m; c++) {
            if (grid[r][c] != walkable) continue;
            int u = r * m + c;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (!in || grid[nr][nc] != walkable) continue;
                adj.get(u).add(nr * m + nc);
            }
        }
    }
    return adj;
}
```

From an `n, m + edges` input you always build a list (or a matrix if Floyd-Warshall). From a `char[][]` / `int[][]` grid you almost always stay implicit. Flatten only when the vertex must be a single integer.

### Grids are graphs

A cell is a vertex. A step to an in-bounds neighbour is an edge. The graph has `N = n * m` vertices and `E ≈ 4N` (4-direction) or `E ≈ 8N` (8-direction). Quote complexities in `N` and `E`, or in `n, m`; never pretend a grid BFS is `O(n)`.

```text
4-direction (rook step)          8-direction (king step)

        (r-1,c)                    (r-1,c-1) (r-1,c) (r-1,c+1)
           |                            \       |       /
 (r,c-1) — (r,c) — (r,c+1)               (r,c-1) — (r,c) — (r,c+1)
           |                            /       |       \
        (r+1,c)                    (r+1,c-1) (r+1,c) (r+1,c+1)
```

```java
int[][] dirs4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

int[][] dirs8 = {
    {-1, -1}, {-1, 0}, {-1, 1},
    { 0, -1},          { 0, 1},
    { 1, -1}, { 1, 0}, { 1, 1}
};

boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
```

Use 4-direction unless the statement says diagonal cells touch (some "number of islands" variants). Do not mix them.

**Flattening.** DSU `parent[]` is 1-D. A 1-D `vis[N]` is sometimes cheaper to pass than `vis[n][m]`. Map back and forth without thinking:

```text
id = r * cols + c
r  = id / cols
c  = id % cols
```

```java
int id(int r, int c, int cols) { return r * cols + c; }
int row(int id, int cols) { return id / cols; }
int col(int id, int cols) { return id % cols; }
```

Why this matters: if you DSU two neighbouring land cells, you `union(id(r,c), id(nr,nc))`. If you `vis` a flattened BFS, index `vis[r * cols + c]`. Off-by-one here is a silent wrong answer, not a crash — `cols` vs `rows` swapped maps legal cells onto other legal cells.

Treat a blocked cell (`0`, `'X'`, `'#'`) as a vertex that does not exist: skip it when you walk `dirs`, never push it, never union it.

### BFS template

BFS is a queue plus a `visited` flag. You mark visited **when you push**, not when you pop. Mark-on-push is the difference between `O(n + E)` and an exploding queue of duplicates.

```text
Graph:  0 — 1 — 3
         \ /
          2

start = 0
queue: [0]
vis:   0✓

pop 0, push 1, 2
queue: [1, 2]
vis:   0✓ 1✓ 2✓

pop 1, push 3          (2 already vis)
queue: [2, 3]
vis:   0✓ 1✓ 2✓ 3✓

pop 2, pop 3. empty.
```

**Why BFS finds the shortest path in an unweighted graph.** Every edge has the same cost. The queue is ordered by hop-count. The first time you push `v`, you have a minimum-hop path to `v`. Later paths to `v` are at least as long, so you refuse them with `vis`. The moment weights differ, hop-count is not cost, and this argument dies — switch to Dijkstra / 0-1 BFS / Bellman-Ford.

Canonical skeleton. `ArrayDeque`, never `Stack`, never `LinkedList` as a queue.

```java
static void bfs(int start, List<List<Integer>> adj, boolean[] vis) {
    ArrayDeque<Integer> q = new ArrayDeque<>();
    q.addLast(start);
    vis[start] = true;
    while (!q.isEmpty()) {
        int u = q.removeFirst();
        for (int v : adj.get(u)) {
            if (vis[v]) continue;
            vis[v] = true;          // mark on push
            q.addLast(v);
        }
    }
}
```

**Level-by-level.** Snapshot `q.size()` at the start of the layer. Rotting oranges, word ladder length, "minimum operations" — the answer is the layer index.

```java
static int bfsLevels(int start, List<List<Integer>> adj) {
    int n = adj.size();
    boolean[] vis = new boolean[n];
    ArrayDeque<Integer> q = new ArrayDeque<>();
    q.addLast(start);
    vis[start] = true;
    int level = 0;
    while (!q.isEmpty()) {
        int sz = q.size();
        for (int i = 0; i < sz; i++) {
            int u = q.removeFirst();
            for (int v : adj.get(u)) {
                if (vis[v]) continue;
                vis[v] = true;
                q.addLast(v);
            }
        }
        level++;
    }
    return level;
}
```

**Distance-array variant.** Same idea, stored per node instead of as a layer counter. Unreachable stays at `-1` or `INF`.

```java
static int[] bfsDist(int start, List<List<Integer>> adj) {
    int n = adj.size();
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    ArrayDeque<Integer> q = new ArrayDeque<>();
    dist[start] = 0;
    q.addLast(start);
    while (!q.isEmpty()) {
        int u = q.removeFirst();
        for (int v : adj.get(u)) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            q.addLast(v);
        }
    }
    return dist;
}
```

**Multi-source BFS.** The trick is the initialisation, not the loop. Push **every** source first, all with distance `0`. The queue then computes distance to the **nearest** source. Rotting oranges (all rotten cells are sources). 01-matrix (all `0`s are sources). You are not running `k` BFS-es; you are running one BFS on a graph that has `k` starting points.

```java
static int[] multiSource(List<Integer> sources, List<List<Integer>> adj) {
    int n = adj.size();
    int[] dist = new int[n];
    Arrays.fill(dist, -1);
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int s : sources) {
        dist[s] = 0;
        q.addLast(s);
    }
    while (!q.isEmpty()) {
        int u = q.removeFirst();
        for (int v : adj.get(u)) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            q.addLast(v);
        }
    }
    return dist;
}
```

Disconnected graphs: wrap the start in `for (int i = 0; i < n; i++) if (!vis[i]) bfs(i, ...)`. Each call paints one component. The outer loop is how you count provinces / islands.

**Time Complexity Calculation:** each vertex is pushed once, each edge is looked at a constant number of times → `O(n + E)`. Grid: `O(n * m)`.
**Space Complexity Calculation:** `vis` / `dist` is `O(n)`, queue is `O(n)` worst case (a star). Grid: `O(n * m)`.

### DFS template

DFS is a stack, usually the call stack. You mark visited when you **enter** the node. Recursion is the default because the "after all children" moment (post-order) is a real line of code, not a flag you have to simulate.

```java
static void dfs(int u, List<List<Integer>> adj, boolean[] vis) {
    vis[u] = true;
    for (int v : adj.get(u)) {
        if (!vis[v]) dfs(v, adj, vis);
    }
}
```

**When to use an explicit `ArrayDeque` stack.** Recursion depth on a `10^5`-long chain blows the JVM stack. Interview constraints of `n ≤ 10^5` with a path-like graph are the signal. Iterative DFS visits the same nodes; it does **not** give you post-order for free — if you need finish times (topo, Kosaraju), prefer recursion with an increased stack, or simulate post-order by pushing a `(node, state)` pair.

```java
static void dfsIterative(int start, List<List<Integer>> adj, boolean[] vis) {
    ArrayDeque<Integer> st = new ArrayDeque<>();
    st.addLast(start);
    vis[start] = true;
    while (!st.isEmpty()) {
        int u = st.removeLast();
        for (int v : adj.get(u)) {
            if (vis[v]) continue;
            vis[v] = true;
            st.addLast(v);
        }
    }
}
```

**Pre / in / post.** Three timestamps, one node.

```text
pre  (tin):  first time you see u, before children. Discovery.
in:          while a child call is live. u is on the recursion path.
post (tout): after every child has returned. Finish time.

    dfs(0)
     pre  0
      dfs(1)
       pre  1
       post 1
      dfs(2)
       pre  2
       post 2
     post 0

tin  [0]=0, [1]=1, [2]=2
tout [1]=2, [2]=3, [0]=4     (timer ticks on pre and post, or on pre only — pick one scheme and stick to it)
```

Kosaraju pass 1 and DFS topological sort both wait for **post**. Tarjan bridges assign **pre** as `tin[u]` and pull `low[u]` during **in**.

**Tree edges vs back edges (cycles).** From `u` to a neighbour `v`:

| edge type | what you see | undirected meaning | directed meaning |
|---|---|---|---|
| tree | `v` not visited | DFS forest edge | DFS forest edge |
| parent | `v == parent` | the edge you came up; **not** a cycle | does not arise as a special case of "parent" |
| back | `v` visited **and** on the current path | any other visited neighbour is a back edge → cycle | edge to a recursion-stack node → cycle |
| forward / cross | `v` visited, **not** on the current path | does not exist (undirected visited ⇒ back or parent) | `v` finished in this tree (forward) or another tree (cross). **Not** a cycle. |

That last row is the entire reason directed cycle detection needs a second array.

**Time / space.** Same as BFS: `O(n + E)` time, `O(n)` recursion depth worst case. Recursion depth is the space you quote in an interview, not "O(1) extra".

### Two mini-templates every problem reuses

**1. Cycle detection, undirected — `visited + parent`.**

Idea in one line (DFS): a visited neighbour that is not the parent is a back edge, hence a cycle.
Idea in one line (BFS): same check, parent stored in the queue pair.

```text
    0 — 1
    |   |
    3 — 2

DFS 0 → 1 → 2 → 3. From 3 you see 0, visited, 0 != parent(3)=2. Cycle.
```

```java
static boolean cycleUndirected(int n, List<List<Integer>> adj) {
    boolean[] vis = new boolean[n];
    for (int i = 0; i < n; i++) {
        if (vis[i]) continue;
        if (dfsCycleU(i, -1, adj, vis)) return true;
    }
    return false;
}

static boolean dfsCycleU(int u, int parent, List<List<Integer>> adj, boolean[] vis) {
    vis[u] = true;
    for (int v : adj.get(u)) {
        if (v == parent) continue;
        if (vis[v]) return true;
        if (dfsCycleU(v, u, adj, vis)) return true;
    }
    return false;
}

static boolean bfsCycleU(int start, List<List<Integer>> adj, boolean[] vis) {
    ArrayDeque<int[]> q = new ArrayDeque<>();
    vis[start] = true;
    q.addLast(new int[]{start, -1});
    while (!q.isEmpty()) {
        int u = q.peekFirst()[0], p = q.removeFirst()[1];
        for (int v : adj.get(u)) {
            if (!vis[v]) {
                vis[v] = true;
                q.addLast(new int[]{v, u});
            } else if (v != p) {
                return true;
            }
        }
    }
    return false;
}
```

Self-loops: `v == u` is visited and `v != parent` → cycle, which is what you want. Parallel edges: the second copy looks like a back edge → cycle of length 2. If the problem treats multi-edges as a cycle, you are done; if not, dedupe the list first.

**2. Cycle detection, directed — parent-only is wrong.**

```text
No cycle, two paths to 3:

        0 → 1
        ↓   ↓
        2 → 3

Walk 0 → 1 → 3, vis[3] = true, parent[3] = 1.
Walk 0 → 2 → 3. 3 is visited and 3 != parent[2] = 0.
Parent-only reports a cycle. There is none.
3 is finished. It is not on the current path.
```

In a directed graph a visited node is cheap information. The expensive information is **whether that node is still on the DFS path you are walking**. Three equivalent encodings of "on the path":

- `pathVisited[]` / `onPath[]` — a second boolean, set true on entry, false on exit.
- 3-colour: `0` white (unseen), `1` gray (on path), `2` black (finished). Gray neighbour = cycle.
- Kahn's count: if you cannot drain `n` nodes by peeling in-degree 0, a cycle is holding the rest.

```java
static boolean cycleDirected(int n, List<List<Integer>> adj) {
    boolean[] vis = new boolean[n];
    boolean[] onPath = new boolean[n];
    for (int i = 0; i < n; i++) {
        if (vis[i]) continue;
        if (dfsCycleD(i, adj, vis, onPath)) return true;
    }
    return false;
}

static boolean dfsCycleD(int u, List<List<Integer>> adj,
                         boolean[] vis, boolean[] onPath) {
    vis[u] = true;
    onPath[u] = true;
    for (int v : adj.get(u)) {
        if (!vis[v]) {
            if (dfsCycleD(v, adj, vis, onPath)) return true;
        } else if (onPath[v]) {
            return true;            // back edge to a live ancestor
        }
        // vis && !onPath  → forward/cross, ignore
    }
    onPath[u] = false;              // u finished; leave vis true
    return false;
}
```

3-colour is the same method with one array:

```java
// color: 0 white, 1 gray, 2 black
static boolean dfsColor(int u, List<List<Integer>> adj, int[] color) {
    color[u] = 1;
    for (int v : adj.get(u)) {
        if (color[v] == 1) return true;
        if (color[v] == 0 && dfsColor(v, adj, color)) return true;
    }
    color[u] = 2;
    return false;
}
```

Kahn's count (also your topological sort):

```java
static boolean hasCycleKahn(int n, List<List<Integer>> adj) {
    int[] indeg = new int[n];
    for (int u = 0; u < n; u++)
        for (int v : adj.get(u)) indeg[v]++;
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.addLast(i);
    int seen = 0;
    while (!q.isEmpty()) {
        int u = q.removeFirst();
        seen++;
        for (int v : adj.get(u)) {
            if (--indeg[v] == 0) q.addLast(v);
        }
    }
    return seen != n;               // leftover nodes are in a cycle
}
```

Directed cycle ⇒ some node never reaches in-degree 0, because every node on the cycle has a predecessor on the cycle. That is the invariant.

### Topological sort

A topological order of a directed graph is a linear order of vertices such that every edge `u → v` has `u` before `v`. It exists **if and only if** the graph is a DAG. One cycle, anywhere, and no such line exists.

**Single invariant:** a node is pushed into the order only after all its dependencies are finished.

- DFS post-order: "finished" means every outgoing edge has been explored. You push `u` after the child loop. The deque, front-inserted, is the order.
- Kahn: "finished" means every incoming edge has already contributed. In-degree hits 0, then you push.

```text
  0 → 1 → 3
  0 → 2 → 3

valid orders: 0,1,2,3  and  0,2,1,3
invalid:      1,0,...   (edge 0→1 would go backwards)
```

```java
static List<Integer> topoDfs(int n, List<List<Integer>> adj) {
    boolean[] vis = new boolean[n];
    ArrayDeque<Integer> order = new ArrayDeque<>();
    for (int i = 0; i < n; i++) {
        if (!vis[i]) dfsPost(i, adj, vis, order);
    }
    return new ArrayList<>(order);
}

static void dfsPost(int u, List<List<Integer>> adj,
                    boolean[] vis, ArrayDeque<Integer> order) {
    vis[u] = true;
    for (int v : adj.get(u)) {
        if (!vis[v]) dfsPost(v, adj, vis, order);
    }
    order.addFirst(u);              // post-order: earlier finish stays to the right
}
```

```java
static List<Integer> topoKahn(int n, List<List<Integer>> adj) {
    int[] indeg = new int[n];
    for (int u = 0; u < n; u++)
        for (int v : adj.get(u)) indeg[v]++;
    ArrayDeque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.addLast(i);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.removeFirst();
        order.add(u);
        for (int v : adj.get(u)) {
            if (--indeg[v] == 0) q.addLast(v);
        }
    }
    if (order.size() != n) return List.of();  // not a DAG
    return order;
}
```

DFS topo as written does **not** detect cycles unless you also keep `onPath`. A cycle is silently skipped (those nodes are visited, never re-entered, never prove the cycle). In an interview, if the graph might not be a DAG, use Kahn and check `order.size() == n`, or add `onPath` to the DFS.

| | DFS post-order | Kahn |
|---|---|---|
| structure | recursion + finish stack | in-degree + queue |
| cycle | needs `onPath` extra | `order.size() != n` |
| which order | one valid order (DFS forest order) | BFS-like; can be made lexicographically smallest with a `PriorityQueue` |
| use when | you already DFS (Kosaraju pass 1) | course schedule, alien dictionary, "any order / detect cycle" |

Kahn with a min-heap instead of a deque is the "smallest alphabetical / smallest index topo" trick. Same invariant, different pop.

### Relaxation primitive

One line is the entire shortest-path family:

```java
if (dist[v] > dist[u] + w) dist[v] = dist[u] + w;
```

Read it as: "the best path I know to `v` is worse than going to `u` and paying `w` — so take that." Every algorithm below is a policy for **which `(u, v, w)` you try, and in what order**, so that when the policy stops, `dist[v]` is the true shortest path (or you have detected that no finite shortest path exists).

**Guard:** if `dist[u]` is `INF`, skip. `INF + w` overflows a Java `int` and becomes a negative, which then looks like a better path. Use `long[] dist` when weights can push the sum past `2^31 - 1`.

```java
static final int INF = 1_000_000_000;

static boolean relax(int[] dist, int u, int v, int w) {
    if (dist[u] >= INF) return false;
    if (dist[v] > dist[u] + w) {
        dist[v] = dist[u] + w;
        return true;                // v improved; Dijkstra/BF/SPFA care about this
    }
    return false;
}
```

| algorithm | when | extra idea |
|---|---|---|
| BFS | every weight is `1` (unweighted) | first visit is shortest; `vis` replaces repeated relax |
| 0-1 BFS | weights are only `0` or `1` | `ArrayDeque`: weight `0` to the front, weight `1` to the back |
| Dijkstra | single source, **no negative** weights | greedy extract-min via `PriorityQueue`; a popped node is final |
| Bellman-Ford | negatives allowed; want negative-cycle detection | relax **all** `E` edges, `n-1` rounds; one more round → cycle if it still relaxes |
| Floyd-Warshall | all-pairs, `n ≤ ~400`, negatives OK, no negative cycle | `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])` with `k` as intermediate |

Dijkstra is BFS with a priority queue the moment weights vary. The greedy step is legal because a negative edge could later cheapen a path to an already-popped node — and Dijkstra has no mechanism to reopen it correctly unless you allow duplicates in the PQ **and** the graph still has no negatives. Do not run Dijkstra on negative weights.

Bellman-Ford's `n-1` is "a simple path has at most `n-1` edges". One extra full pass that still relaxes means a reachable negative cycle.

Floyd-Warshall's loop order is `k` then `i` then `j`. `k` is "may I use vertex `k` as an intermediate?". Swapping the loops is a wrong DP.

```java
static int[] dijkstra(int n, List<List<int[]>> adj, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, INF);
    dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
    pq.add(new int[]{0, src});      // {dist, node}
    while (!pq.isEmpty()) {
        int d = pq.peek()[0], u = pq.poll()[1];
        if (d != dist[u]) continue; // stale PQ pair
        for (int[] e : adj.get(u)) {
            int v = e[0], w = e[1];
            if (dist[u] >= INF) continue;
            if (dist[v] > dist[u] + w) {
                dist[v] = dist[u] + w;
                pq.add(new int[]{dist[v], v});
            }
        }
    }
    return dist;
}
```

`a[0] - b[0]` overflows if distances are large. `Comparator.comparingInt(a -> a[0])` uses `Integer.compare`. Keep that habit.

### Disjoint Set Union (DSU)

DSU maintains a partition of `{0..n-1}`. `find(x)` returns the representative of `x`'s set. `union(a, b)` merges the two sets. The forest picture: each set is a tree, `parent[root] = root`, every other node points upward.

```text
union(0,1), union(2,3), union(1,2)

  before:   0    1    2    3
  after:    0←1  2←3  then 0 swallows 2

            0
           / \
          1   2
              |
              3
  find(3) walks 3 → 2 → 0.
  path compression then makes parent[3]=0, parent[2]=0.
```

**Why rank / size keep the tree shallow.** Always hang the smaller tree under the larger (size) or the shorter rank under the taller. Without that, a chain of `n` unions in the wrong order is a linked list, and `find` is `O(n)`. With size/rank, the tree height is `O(log n)` even before path compression.

**Path compression** flattens on the way up: every node on the find-path points at the root. Combined with union-by-size/rank the amortised cost per operation is `O(α(n))` — inverse Ackermann, under 5 for any `n` you will ever see. Quote it as "almost `O(1)`".

| variant | `find` | `union` | cost per op |
|---|---|---|---|
| naïve | walk to root | arbitrary parent | `O(n)` |
| union by size/rank only | walk to root | hang small under big | `O(log n)` |
| path compression only | flatten | arbitrary | `O(log n)` amortised |
| both | flatten | hang small under big | `O(α(n))` ≈ `O(1)` |

Interview default: **iterative find with path compression + union by size**. Recursion is fine for `n` that is not pathological for the JVM; iterative is the one you paste into a `10^5` problem without thinking.

You pick **one** of rank or size and you stick to it. Mixing both on the same instance desynchronises the two arrays. The class below is the one the 53 problems use (`parent`, `size`, `find`, `union`, `getSize`). Rank is shown as a sibling so you can talk about it.

```java
class DisjointSet {
    private final int[] parent;
    private final int[] size;

    DisjointSet(int n) {
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }

    int find(int x) {
        int r = x;
        while (r != parent[r]) r = parent[r];
        while (x != r) {            // full path compression, iterative
            int next = parent[x];
            parent[x] = r;
            x = next;
        }
        return r;
    }

    int findRecursive(int x) {
        if (parent[x] != x) parent[x] = findRecursive(parent[x]);
        return parent[x];
    }

    boolean union(int a, int b) {
        int pa = find(a), pb = find(b);
        if (pa == pb) return false; // already same set; edge would cycle
        if (size[pa] < size[pb]) {
            parent[pa] = pb;
            size[pb] += size[pa];
        } else {
            parent[pb] = pa;
            size[pa] += size[pb];
        }
        return true;
    }

    int getSize(int x) {
        return size[find(x)];
    }
}
```

Union by rank, if you are asked. Rank is an upper bound on height, not the height itself, once path compression is on — that is why size is the cleaner story.

```java
boolean unionByRank(int a, int b, int[] parent, int[] rank) {
    int pa = find(a), pb = find(b);
    if (pa == pb) return false;
    if (rank[pa] < rank[pb]) {
        parent[pa] = pb;
    } else if (rank[pb] < rank[pa]) {
        parent[pb] = pa;
    } else {
        parent[pb] = pa;
        rank[pa]++;                 // only bump when both ranks were equal
    }
    return true;
}
```

`union` returning `false` is Kruskal's cycle check and "number of extra edges" in redundant-connection problems. `getSize` is "largest island after a flip", "accounts merge" group sizes.

### MST keyword triples

A **minimum spanning tree** of a connected undirected weighted graph is a subset of edges that connects every vertex, has no cycle, and has minimum total weight. If the graph is disconnected you get a **minimum spanning forest** (one tree per component).

**Cut property, three sentences.** Partition `V` into `S` and `V \ S` (a cut). Among all edges with one end in `S` and one end outside, a lightest crossing edge belongs to some MST. Prim always adds a lightest edge out of the current tree (the cut `(visited, rest)`). Kruskal always adds the globally lightest edge that does not form a cycle — that edge is a lightest edge across the cut `(component(u), rest)`.

**Prim: PQ on edges from a visited set.** Grow a tree. The PQ holds `(weight, node)` meaning "cheapest known edge from the tree to this node". Extract-min, skip if already in the tree, add it, push its neighbours. Same skeleton as Dijkstra; the key is **edge weight to the tree**, not **path distance from a source**.

**Kruskal: sort edges + DSU.** Sort every edge by weight. Walk them. `union` succeeds → the edge is in the MST. `union` returns false → it would cycle, skip. Stop when you have `n - 1` edges (or `n - c` for `c` components).

```java
static int kruskal(int n, int[][] edges) {
    Arrays.sort(edges, Comparator.comparingInt(e -> e[2])); // {u, v, w}
    DisjointSet dsu = new DisjointSet(n);
    int weight = 0, taken = 0;
    for (int[] e : edges) {
        if (!dsu.union(e[0], e[1])) continue;
        weight += e[2];
        taken++;
        if (taken == n - 1) break;
    }
    return taken == n - 1 ? weight : -1; // -1 if disconnected
}

static int prim(int n, List<List<int[]>> adj) {
    boolean[] in = new boolean[n];
    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));
    pq.add(new int[]{0, 0});        // {w, node}; start at 0 with a fake 0-edge
    int weight = 0, taken = 0;
    while (!pq.isEmpty() && taken < n) {
        int w = pq.peek()[0], u = pq.poll()[1];
        if (in[u]) continue;
        in[u] = true;
        weight += w;
        taken++;
        for (int[] e : adj.get(u)) {
            if (!in[e[0]]) pq.add(new int[]{e[1], e[0]});
        }
    }
    return taken == n ? weight : -1;
}
```

| | Prim | Kruskal | Dijkstra |
|---|---|---|---|
| goal | MST | MST | shortest path from `s` |
| graph | undirected, weighted | undirected, weighted | directed or undirected, **non-negative** |
| DS | PQ + `in-tree[]` | sort + DSU | PQ + `dist[]` |
| key in the PQ | min edge **into the tree** | (no PQ; global sort) | min **path cost from `s`** |
| a popped node | is in the MST | n/a | has its final distance |
| disconnected | forest, or fail if you require a tree | DSU never reaches `n-1` unions | some `dist` stay `INF` |
| dense vs sparse | dense: `O(n²)` array Prim; sparse: `O(E log n)` PQ | always `O(E log E)` sort-dominated | sparse PQ `O(E log n)` |
| same code as | Dijkstra with `w` instead of `dist[u]+w` | unique | Prim with `dist[u]+w` instead of `w` |

If you remember one sentence: **Prim and Dijkstra share a PQ; Kruskal and cycle-checking share a DSU.** The cut property is why the greedy choice is safe for MST and not, in general, for shortest paths with negatives.

### Hard-algorithm toolbox

Proofs live in problems 51–53. Here you only need the arrays and the one-line tests.

**`tin[]` / `low[]` (Tarjan) for bridges and articulation points.** `disc[]` is the same array as `tin[]` — discovery time. `low[u]` is the smallest discovery time reachable from `u`'s DFS subtree, including a single back edge.

```text
Assign tin on entry.
For a back edge u → v (v already discovered, v ≠ parent):
    low[u] = min(low[u], tin[v])
After a child v returns:
    low[u] = min(low[u], low[v])

Bridge  u—v:          low[v] >  tin[u]
                      v cannot reach u or above without this edge.

Articulation u:       low[v] >= tin[u]   for some child v
                      v cannot reach strictly above u.
Root special case:    the root is an articulation iff it has ≥ 2 DFS children.
```

```text
  0 — 1 — 2          tin[0]=0 tin[1]=1 tin[2]=2
                     low[2]=2 > tin[1]=1  →  1—2 is a bridge
                     1 is an articulation (non-root, low[2] >= tin[1])

  0 — 1
  |   |              back edge 1—0 pulls low[1] down to tin[0]
  └───2              low[1] == tin[0]  →  no bridge on 0—1
```

```java
class Tarjan {
    List<List<Integer>> adj;
    int timer;
    int[] tin, low;
    boolean[] vis;

    void dfs(int u, int parent) {
        vis[u] = true;
        tin[u] = low[u] = timer++;
        int children = 0;
        for (int v : adj.get(u)) {
            if (v == parent) continue;
            if (vis[v]) {
                low[u] = Math.min(low[u], tin[v]); // back edge
                continue;
            }
            dfs(v, u);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > tin[u]) {
                // u—v is a bridge
            }
            if (parent != -1 && low[v] >= tin[u]) {
                // u is an articulation
            }
            children++;
        }
        if (parent == -1 && children >= 2) {
            // u is an articulation (root)
        }
    }
}
```

Back edges use `tin[v]`, not `low[v]`. Using `low[v]` on a back edge lets information jump along two back edges and misses bridges. That is the one line people get wrong.

**Kosaraju, two-pass, for SCCs.**

```text
Pass 1. DFS on G. Push u onto a deque on finish (post-order).
Pass 2. Build G^T (every edge reversed).
        Pop the deque. DFS on G^T. Each tree you paint is one SCC.

Why it works, short:
  The SCCs of G condense into a DAG.
  Finish order of G is a topological order of that DAG.
  The last-finished node of G is in a source SCC of G, which is a sink SCC of G^T.
  A DFS from it in G^T cannot leave the SCC — every outgoing edge of the
  condensation has been reversed into an incoming edge you never follow from a sink.
```

```java
static void kosarajuPass1(int u, List<List<Integer>> adj,
                          boolean[] vis, ArrayDeque<Integer> order) {
    vis[u] = true;
    for (int v : adj.get(u)) {
        if (!vis[v]) kosarajuPass1(v, adj, vis, order);
    }
    order.addLast(u);               // finish stack
}

static void kosarajuPaint(int u, List<List<Integer>> radj, boolean[] vis) {
    vis[u] = true;
    for (int v : radj.get(u)) {
        if (!vis[v]) kosarajuPaint(v, radj, vis);
    }
}
```

Pass 2 starts from `order.removeLast()` so the latest-finished node goes first. One paint call per SCC. Transpose is `radj.get(v).add(u)` for every original `u → v`.

Tarjan's SCC algorithm (one DFS, `tin`/`low` plus a node stack) is a different tool with the same output. This guide uses Kosaraju for SCCs and `tin`/`low` for bridges / articulations. Do not mix the two stacks in your head.

### The decision question every problem asks first

Before you name BFS, you name the question. The 53 problems are 53 answers to this block.

```text
Am I counting / walking connected stuff?     -> BFS or DFS
Am I ordering dependencies?                  -> topological sort
Am I minimizing a path cost?                 -> BFS (unit) / Dijkstra / BF / FW
Am I merging or splitting connected parts?   -> DSU
Am I asking "what happens if I remove this edge/vertex?" -> Tarjan tin/low
```

A second question sits under the first: *is the graph given as edges, or is it a grid / words / a matrix I have to interpret?* Representation is a decision, not a default. A third: *undirected or directed?* That single bit kills parent-only cycle checks, enables topo, and switches "component" to "SCC".

If two rows both look plausible (shortest path **and** connected components), you are looking at a weighted graph on which you still flood — Dijkstra on a grid, or 0-1 BFS, or multi-source BFS. Walk the table top-down; the first yes that matches the output (count vs order vs min cost vs merge vs deletion) is the model.

### The 6 core mental models

Every one of the 53 is one of these six, sometimes with a twist. The twist is the problem. The model is the template.

| # | Signature clue | Mental model | Which template |
|---|---|---|---|
| 1 | islands, flood fill, provinces, "paint the region", surrounded / enclave | one connected piece is one answer unit; vis marks membership | DFS / BFS flood on an explicit graph or a grid (`dirs4`) |
| 2 | rotting oranges, nearest 0/1, gates, "time until all …", multi-source | distance to the **closest** of several starts; they spread together | multi-source BFS: push every source at dist 0, then one queue |
| 3 | prerequisites, course schedule, alien dictionary, "detect a cycle", bipartite | a cycle is impossibility; a DAG is an order; an odd cycle is not 2-colourable | directed cycle (`onPath` / Kahn); topo DFS or Kahn; 2-colour BFS |
| 4 | min cost, min time, cheapest with at most k stops, all-pairs, negative cycle | `dist[v]` is the best path so far; improve it by relaxation | BFS (unit) / 0-1 BFS / Dijkstra / Bellman-Ford / Floyd-Warshall |
| 5 | accounts merge, redundant connection, number of islands II, Kruskal, "add this edge, how many components" | sets grow; queries are "same set?" and "size of set" | DSU: `find` + `union` by size; Kruskal is DSU on sorted edges |
| 6 | critical connections, articulation, "remove this edge/vertex", strongly connected, condensations | what remains connected after a deletion, or who can reach whom both ways | Tarjan `tin`/`low` (bridges, articulations); Kosaraju two-pass (SCCs) |

When you open a problem, do not reach for code. Reach for the row. The rest of the guide is those six models, applied 53 times, each time with one observation you did not have on the Foundation page.


# PART A — Learning & Traversal

These six items are not "problems" in the LeetCode sense; they are the walking grammar. Every later problem in this sheet is BFS, DFS, or "run this on every unvisited node" — Number of Provinces, Islands, cycle detection, topo sort, shortest paths, DSU replacements. If the representation is wrong, the traversal is a coin-flip; if the outer loop is missing, you silently solve a connected graph and fail the disconnected one. After this part you should be able to build an adj list from `n + m` edges or from a grid, walk it with BFS and with DFS (recursive and iterative), and count components on a graph and on a grid. Treat the Java builders as muscle memory. The rest of the 53 problems are these six ideas wearing a story.

## 1. Introduction to Graph & Graph Representation (Java)

### Problem Understanding

A graph is vertices plus edges. Before you traverse anything, you have to store those two things in memory in a shape the algorithm can chew. This topic is: given `n` vertices and `m` edges (or a grid of cells), build the structure you will walk for the rest of the sheet.

**Input / Output / Constraints** (typical contest input)
- Line 1: `n m` — vertex count, edge count. Then `m` lines `u v` or `u v w`.
- Nodes are **1-index** on Codeforces-style judges, **0-index** on LeetCode. Mixing them is an `ArrayIndexOutOfBoundsException` or a silent missed node.
- Assume until told otherwise: `n ≤ 10^5`, `m ≤ 2·10^5`. An `n × n` matrix is then illegal.
- Undirected edge `{u, v}` is stored twice; directed edge `u → v` is stored once.
- Output of this topic: the adjacency structure itself (print lists / matrix).

**Observations**
- Three representations exist: adjacency **matrix**, adjacency **list**, **edge list**. None is universally best.
- Isolated vertices still occupy a slot. If you size the list from `edges.length` you drop them.
- A grid is already a graph: cell = vertex, 4-dir (or 8-dir) neighbor = edge. You usually do **not** materialize the list.
- Self-loops and parallel edges: matrix overwrites (or counts); list appends duplicates. Ask the problem.

**Example**
```text
n = 5, 1-index, undirected
edges = [[1,2],[1,3],[3,4],[2,4]]

    1 —— 2
    |    |
    3 —— 4     5  (isolated)
```
Adj lists (index 0 unused):
```text
1: 2 3
2: 1 4
3: 1 4
4: 3 2
5: (empty)
```

**Example 2 — directed, 0-index.** `n = 3`, `edges = [[0,1],[0,2]]` → `0: 1 2`, `1: (empty)`, `2: (empty)`. Reverse edges are **not** added.

### How to Think About the Problem

- What should I notice first? `n` and `m` relative to `10^5`. If `n²` memory dies, the matrix is dead before you write a loop.
- Which representation? Default **list**. Matrix only when you need `O(1)` "is `u-v` an edge?" or an `n × n` DP table (Floyd-Warshall). Edge list when the algorithm iterates edges, not neighbors (Kruskal, Bellman-Ford).
- Counting / searching / ordering / minimizing → which mental model? This topic is **storage**. The mental model is "what does the inner loop of the algorithm iterate?"
- Which traversal is natural? None yet. Wrong storage makes every later traversal `O(n²)` or wrong-index.
- **Clue → Pattern:** *If the graph is sparse (`m ≪ n²`), store neighbors; if the algorithm needs all-pairs or O(1) edge tests, store a matrix; if it sorts edges, keep the raw edge list.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: n×n matrix for every graph          O(n²) space, illegal at n=10^5
        ↓
Observation: most contest/LeetCode graphs are sparse; you only walk neighbors
        ↓
Optimal: pick the representation the algorithm iterates
         list O(n+m) | matrix O(n²) | edge list O(m)
```

### Brute Force Approach

- Basic idea: allocate `int[n+1][n+1]` (1-index) or `int[n][n]` (0-index). For each edge set `g[u][v] = 1`, and `g[v][u] = 1` if undirected.
- Why it works: every possible pair has a slot. Neighbor iteration is "scan row `u`". Edge existence is `g[u][v] != 0`.
- Java:

```java
import java.util.*;

class GraphRepresentationBrute {
    static int[][] buildMatrix(int n, int[][] edges, boolean oneIndex, boolean undirected) {
        int s = oneIndex ? n + 1 : n;
        int[][] g = new int[s][s];
        for (int[] e : edges) {
            int u = e[0], v = e[1];
            g[u][v] = 1;
            if (undirected) g[v][u] = 1;
        }
        return g;
    }

    static List<Integer> neighbors(int[][] g, int u) {
        List<Integer> out = new ArrayList<>();
        for (int v = 0; v < g.length; v++) {
            if (g[u][v] != 0) out.add(v);
        }
        return out;
    }
}
```

**Time Complexity Calculation:** Build is `O(n²)` to allocate (Java zeroes the array) plus `O(m)` writes. Neighbor iteration per vertex is `O(n)`, so a full walk is `O(n²)` even when `m` is tiny.

**Space Complexity Calculation:** `O(n²)` integers, ~4n² bytes. At `n = 10^5` that is 40 GB. Dead.

- **Why can this be improved?** You paid `n²` to store `m` facts. Sparse graphs waste almost the entire table. The walk you actually want is "for each neighbor of `u`", which a list gives in `O(deg(u))`.

### Optimal Approach

The structure being exploited is a **sparse undirected (or directed) graph**, possibly **1-index**, possibly arriving as a **grid** rather than an edge list.

**Core Observation**
An adjacency list stores, for each vertex, only the vertices it actually touches. Isolated vertices get an empty list — they still exist. Building from a grid is the same idea: a land cell's neighbors are the in-bounds land cells one step away.

**Pattern Identification**
`List<List<Integer>> adj` of size `n` (0-index) or `n+1` (1-index, slot 0 empty). Undirected: push both ways. Directed: push one way. Weighted: push `int[]{to, w}` instead of `Integer`. Grid: either walk `dirs` on the fly, or flatten `(r,c) → r*m+c` into a list if some later algorithm insists on an explicit graph.

**Step-by-Step Intuition**
1. Decide 0-index vs 1-index from the statement, not from habit. *Invariant: every vertex id used in `edges` is a valid index into `adj`.*
2. Allocate `n` (or `n+1`) empty lists **before** reading edges. Isolated nodes must already be there.
3. For each edge, append. Undirected = two appends.
4. For a grid, prefer implicit neighbors (`dirs` + in-bounds). Materialize a list only when you need a general-graph algorithm (Dijkstra on cells, etc.).
5. Never iterate `0..n-1` on a 1-index graph without skipping 0 — and never skip 0 on a 0-index graph.

**Dry Run** — `n=5`, 1-index, `edges = [[1,2],[1,3],[3,4],[2,4]]`

| Step | State (adj[1..5]) | Action |
|------|-------------------|--------|
| 0 | `1:[] 2:[] 3:[] 4:[] 5:[]` | allocate `n+1` lists, ignore index 0 |
| 1 | `1:[2] 2:[1] 3:[] 4:[] 5:[]` | add undirected 1—2 |
| 2 | `1:[2,3] 2:[1] 3:[1] 4:[] 5:[]` | add 1—3 |
| 3 | `1:[2,3] 2:[1] 3:[1,4] 4:[3] 5:[]` | add 3—4 |
| 4 | `1:[2,3] 2:[1,4] 3:[1,4] 4:[3,2] 5:[]` | add 2—4; 5 stays empty |

Print:
```text
1 -> [2, 3]
2 -> [1, 4]
3 -> [1, 4]
4 -> [3, 2]
5 -> []
```

**Why Does It Work?**
Every edge contributes exactly the neighbor records the walk will need, and every vertex has a list even if that list is empty. The 1-index hole at `adj[0]` is deliberate: it lets you use problem ids as array indexes with no `-1`. A later BFS/DFS from any vertex, including the isolated 5, sees a well-defined neighbor range.

**Java Code**

```java
import java.util.*;

class GraphRepresentation {

    static List<List<Integer>> undirected1Index(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>()); // 0 unused
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return adj;
    }

    static List<List<Integer>> directed0Index(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        return adj;
    }

    static List<List<int[]>> weightedUndirected(int n, int[][] edges, boolean oneIndex) {
        int s = oneIndex ? n + 1 : n;
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < s; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            adj.get(u).add(new int[]{v, w});
            adj.get(v).add(new int[]{u, w});
        }
        return adj;
    }

    // Flatten a grid of 1-land / 0-water into an explicit 4-dir adj list.
    // Node id = r * m + c. Water cells exist as empty lists.
    static List<List<Integer>> fromGrid(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n * m; i++) adj.add(new ArrayList<>());
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 0) continue;
                int id = r * m + c;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                    if (in && grid[nr][nc] == 1) adj.get(id).add(nr * m + nc);
                }
            }
        }
        return adj;
    }

    static void printAdj(List<List<Integer>> adj, int n, boolean oneIndex) {
        int start = oneIndex ? 1 : 0;
        for (int u = start; u <= n - (oneIndex ? 0 : 1) && u < adj.size(); u++) {
            System.out.println(u + " -> " + adj.get(u));
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:** Allocating `n` lists is `O(n)`. Writing `m` undirected edges is `O(m)` appends (`O(2m)` pushes, still `O(m)`). Grid builder visits each cell and 4 neighbors: `N = n·m` vertices, `E ≈ 4N` edge probes, `O(N)`. Full later traversal over a list is `O(V+E)`, not `O(V²)`.

**Space Complexity Calculation:** `O(V + E)` for the lists plus the `Integer` boxes (undirected stores `2E` neighbor ints). Grid explicit list is `O(N)` extra — that is why you usually skip it and use `dirs` live. Matrix remains `O(V²)` and is the wrong choice here.

### Pattern to Remember

```text
Clue: n, m given; n can be 1e5; nodes 0-index or 1-index; maybe a grid
Pattern: adj list of size n (or n+1); undirected pushes both ways; grid uses dirs
Mental model: store what the inner loop walks — neighbors, not all pairs
```

**Similar problems:** 2. Graph Representation (Java lens on C++ choices), 3. Connected Components (needs a correctly sized list including isolates), 6. DFS on a Grid (implicit list), 7. Number of Provinces (matrix **input**, still convert or walk the matrix as adj), 30. Dijkstra (weighted `int[]{to,w}`), 43. Kruskal (keep the edge list).

**Interview tip:** Before coding, say out loud: "0 or 1 index, directed or not, n vs n²" — that sentence prevents the off-by-one that fails the isolated-node case.

## 2. Graph Representation | C++ (equivalent Java)

### Problem Understanding

C++ graph code is `vector<vector<int>> adj(n)` or `vector<int> adj[n]`. Java does not have that syntax. You choose among `List<List<Integer>>`, `List<Integer>[]`, a raw `int[][]` matrix, and an edge array `int[][] edges`. This topic is the Java-lover's translation: memory, boxing, and **when to abandon the list**.

**Input / Output / Constraints** (typical contest input)
- Same `n, m, edges` as problem 1. `n ≤ 10^5`, `m ≤ 2·10^5` for sparse; Floyd-Warshall constraints are `n ≤ 400`.
- Weighted edges arrive as `u v w`.
- Output: a structure the **next** algorithm wants, not a universal one.

**Observations**
- `List<List<Integer>>` is the interview default and what this sheet uses.
- `List<Integer>[]` is an array of lists: one less outer `ArrayList`, but it is an unchecked generic array (`new ArrayList[n]`).
- Every neighbor in a `List<Integer>` is a boxed `Integer`. At `m = 2·10^5` undirected you allocate `4·10^5` Integer objects. Real, not theoretical.
- Edge lists shine when you **sort edges** (Kruskal) or **relax every edge** (Bellman-Ford). You do not need neighbor grouping.
- A matrix shines when you need `g[i][j]` in `O(1)`: Floyd-Warshall, dense `isConnected[i][j]`, Warshall transitive closure.

**Example**
Same graph as §1, plus a weighted rewrite of the same four edges with weight 1, and the same graph as a 6×6 matrix (1-index). All three must describe the same connectivity.

**Example 2 — dense vs sparse.** `n = 400`, `m = n(n-1)/2` (complete). Matrix is natural (`n² = 1.6·10^5` cells). `n = 10^5`, `m = 10^5`. Matrix is impossible; list is mandatory.

### How to Think About the Problem

- What should I notice first? What does the **algorithm's inner loop** iterate — `adj[u]`, all pairs `(i,j)`, or the raw edge array?
- Which representation? Match the loop. Do not default to a list out of loyalty.
- Counting / searching / ordering / minimizing → which mental model? Storage is an interface: neighbor-iteration vs edge-iteration vs pair-lookup.
- Which traversal is natural? Independent of this choice, but complexity is not: BFS on a matrix is `O(n²)`, BFS on a list is `O(n+m)`.
- **Clue → Pattern:** *Algorithm iterates neighbors → list; iterates all edges as triples → edge list; needs g[i][j] or runs Floyd → matrix.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: always List<List<Integer>>, even for Kruskal / Floyd / isConnected
        ↓
Observation: Java gives three usable shapes; boxing and n² are the costs
        ↓
Optimal: List-of-List (default) | array-of-List | int[] weighted pair
         edge list for Kruskal/Bellman | matrix for Floyd / dense queries
```

### Brute Force Approach

- Basic idea: one `List<List<Integer>>`, unweighted even when weights exist (stuff weight into a parallel map), convert to whatever you need later.
- Why it works: you *can* recover an edge list by scanning every neighbor (careful with undirected double-count) and you *can* recover a matrix by filling from the list. You pay extra passes and extra objects.

```java
import java.util.*;

class AlwaysAdjList {
    static List<List<Integer>> build(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return adj;
    }

    // Recovering an edge list from an undirected adj list — easy to double-count.
    static List<int[]> toEdgeList(List<List<Integer>> adj) {
        List<int[]> edges = new ArrayList<>();
        for (int u = 0; u < adj.size(); u++) {
            for (int v : adj.get(u)) {
                if (u < v) edges.add(new int[]{u, v}); // undirected dedup
            }
        }
        return edges;
    }
}
```

**Time Complexity Calculation:** Build `O(n+m)`. Recovering an edge list is another `O(n+m)` with an `u < v` filter. Recovering a matrix is `O(n²)` allocate + `O(m)` fills. Kruskal would then sort `O(m log m)` — fine — but you did needless conversion, and you **lost weights** if you never stored them.

**Space Complexity Calculation:** `O(n+m)` plus one `Integer` per stored endpoint. Conversion to matrix adds `O(n²)`.

- **Why can this be improved?** Kruskal never asks for `adj[u]`. Floyd never asks for a ragged list. Building the wrong shape and converting is extra code and a place to drop a reverse edge or a weight.

### Optimal Approach

The structure being exploited is **the access pattern of the downstream algorithm**, not the graph itself.

**Core Observation**
C++ `vector<vector<int>>` ≈ Java `List<List<Integer>>`. C++ `vector<int> adj[n]` ≈ Java `List<Integer>[]`. C++ `vector<pair<int,int>>` ≈ Java `List<int[]>` holding `{to, w}`. The Java-specific tax is **boxing** (`Integer`) and **generic arrays** (`new ArrayList[n]` is unchecked). Neither tax changes Big-O; both change constant factors and interview style.

**Pattern Identification**
Pick from the table. Do not mix: a Dijkstra heap entry is `int[]{dist, node}`, a weighted neighbor is `int[]{to, w}`, an edge for Kruskal is `int[]{u, v, w}`. Three different `int[]` shapes — name them in comments or you will swap slots.

| Shape | Space | Iterate neighbors | Edge query `u-v`? | Use |
|-------|-------|-------------------|-------------------|-----|
| `int[n][n]` matrix | `O(n²)` | `O(n)` (scan row) | `O(1)` | Floyd-Warshall, dense `isConnected` |
| `List<List<Integer>>` | `O(n+m)` + boxed `Integer`s | `O(deg)` | `O(deg)` | default BFS/DFS/topo/Dijkstra unweighted |
| `List<Integer>[]` | same, no outer List object | `O(deg)` | `O(deg)` | same; slightly leaner |
| `int[][] edges` | `O(m)` | N/A | N/A | Kruskal (sort), Bellman-Ford (relax-all) |
| `List<int[]>` weighted | `O(n+m)` | `O(deg)` | `O(deg)` | Dijkstra, Prim |

**Step-by-Step Intuition**
1. Name the inner loop of the algorithm you will run next. *Invariant: the structure's primitive iteration **is** that inner loop.*
2. If it is "for `v` in neighbors of `u`", build a list. Prefer `List<List<Integer>>` in this sheet (clear, no unchecked warning).
3. If it is "for each edge `{u,v,w}` in any order", keep `int[][] edges`. Kruskal sorts this array. Bellman-Ford scans it `|V|-1` times.
4. If it is "for every pair `(i,j)`" or "is `i` connected to `j` in O(1) after precompute", allocate the matrix. Floyd-Warshall **is** the matrix.
5. Weighted neighbors: `int[]{to, w}`, never `Pair`, never a custom class in an interview unless asked.

**Dry Run** — same `n=5`, 1-index edges `[[1,2],[1,3],[3,4],[2,4]]`, compared across shapes.

| Step | State | Action |
|------|-------|--------|
| 1 | `List<List<Integer>>` size 6 | `adj.get(1) = [2,3]`, … `adj.get(5) = []` |
| 2 | `List<Integer>[]` length 6 | `adj[1] = [2,3]`, same contents, array indexing |
| 3 | `int[6][6]` matrix | `g[1][2]=g[2][1]=1`, `g[1][3]=g[3][1]=1`, `g[3][4]=g[4][3]=1`, `g[2][4]=g[4][2]=1`; row 5 all 0 |
| 4 | `int[][] edges` as given | still 4 rows; Kruskal would sort by weight (all equal → stable order) |
| 5 | weighted `adj.get(1)` | `[ {2,1}, {3,1} ]` if those edges have `w=1` |

Memory sketch for this tiny graph (undirected):
```text
list:  5 real lists + 8 Integers  (4 edges × 2)
array-of-list: 6 slots (incl. null/empty at 0) + 8 Integers
matrix: 36 ints, 28 of them zero
edge list: 4 pairs
```

**Why Does It Work?**
Each shape is a correct encoding of the same edge set; they differ in the cost of the operation you will hammer. Matching shape to operation removes conversion bugs (forgotten reverse edge, dropped isolate, lost weight) and keeps you inside the constraint.

**Java Code**

```java
import java.util.*;

class GraphRepresentationCppLens {

    static List<List<Integer>> listOfList(int n, int[][] edges, boolean undirected) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            if (undirected) adj.get(e[1]).add(e[0]);
        }
        return adj;
    }

    @SuppressWarnings("unchecked")
    static List<Integer>[] arrayOfList(int n, int[][] edges, boolean undirected) {
        List<Integer>[] adj = new ArrayList[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            if (undirected) adj[e[1]].add(e[0]);
        }
        return adj;
    }

    // Weighted neighbor: int[]{to, weight}
    static List<List<int[]>> weightedList(int n, int[][] edges, boolean undirected) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            int u = e[0], v = e[1], w = e[2];
            adj.get(u).add(new int[]{v, w});
            if (undirected) adj.get(v).add(new int[]{u, w});
        }
        return adj;
    }

    static int[][] matrix(int n, int[][] edges, boolean undirected) {
        int[][] g = new int[n][n];
        for (int[] e : edges) {
            int w = e.length > 2 ? e[2] : 1;
            g[e[0]][e[1]] = w;
            if (undirected) g[e[1]][e[0]] = w;
        }
        return g;
    }

    // Keep this raw for Kruskal / Bellman-Ford. Do not expand into adj first.
    static int[][] edgeList(int[][] edges) {
        return edges;
    }
}
```

**Complexity**

**Time Complexity Calculation:** All builders are `O(n+m)` except the matrix, which is `O(n²)` allocate + `O(m)` writes. Neighbor iteration: list `O(deg(u))`, matrix `O(n)` per vertex (`O(n²)` to walk the graph). Floyd-Warshall will be `O(n³)` on the matrix regardless of `m`. Kruskal is `O(m log m)` on the edge list plus almost-`O(m)` DSU.

**Space Complexity Calculation:** List-of-list and array-of-list are `O(n+m)` plus boxing. Array-of-list saves one outer `ArrayList` (`n` pointers still exist). Matrix is `O(n²)`. Edge list is `O(m)` and does not store isolates — isolates live only in `n`. Boxing: each `Integer` is a heap object; `int[]{to,w}` for weighted neighbors is one small array per edge-end, still cheaper than two boxed Integers plus a wrapper class.

### Pattern to Remember

```text
Clue: C++ vector<vector<int>> / vector<pair<int,int>> / raw edge array / n×n DP
Pattern: List<List<Integer>> default; List<Integer>[] ok; int[]{to,w} weighted; edge list for Kruskal; matrix for Floyd
Mental model: pick the shape the inner loop already wants
```

**Similar problems:** 1. Graph Representation (builders), 7. Number of Provinces (input **is** a matrix; you may walk it as adj without converting), 22. Kahn's / 38. Bellman-Ford (edge scans), 42. DSU + 43. Kruskal (edge list), 39. Floyd-Warshall (matrix mandatory).

**Interview tip:** If you write `new ArrayList[n]`, add `@SuppressWarnings("unchecked")` and move on — arguing generic arrays is not the problem they asked.

## 3. Connected Components

### Problem Understanding

In an **undirected** graph, a connected component is a maximal set of vertices that can all reach each other. The graph may have several. Your job is to **count** them and, when asked, **list the vertices of each**.

**Input / Output / Constraints**
- `n` vertices, 0-index, undirected adj list (or `n` + `edges`).
- Graph may be disconnected. Isolated vertices are components of size 1.
- `n ≤ 10^5`, so `O(n+m)` only.
- Output: an integer count, and/or `List<List<Integer>>` of components.

**Observations**
- One BFS or DFS from a source paints **exactly one** component.
- The vertices you never start from, and never reach, belong to other components (or are unreachable in a directed graph — different topic, SCCs).
- The outer `for (int i = 0; i < n; i++) if (!vis[i]) …` **is** the algorithm. The inner DFS/BFS is a paint-bucket.
- Forgetting that outer loop is the #1 bug later: Number of Provinces, Islands, DSU component count.

**Example**
```text
n = 5
0 — 1 — 2      3 — 4

components = 2
lists: [0,1,2] and [3,4]
```

**Example 2 — isolates.** `n = 3`, `edges = []` → 3 components `[0] [1] [2]`. A builder that sized `adj` from `edges.length` would report 0.

### How to Think About the Problem

- What should I notice first? "May be disconnected" is in the problem even when it is not in the sentence. Assume it.
- Which representation? Undirected adj list, size `n`, isolates included.
- Counting / searching / ordering / minimizing → which mental model? **Counting starts of a traversal.** Each start that finds an unvisited vertex is a new component.
- Which traversal is natural? Either. DFS is less code; BFS if you also want distances inside the component.
- **Clue → Pattern:** *Disconnected undirected graph → outer for-loop + DFS/BFS from every unvisited node; starts = components.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every pair (u,v), BFS to test reachability, then union labels
             O(n · (n+m)) or Floyd O(n³)
        ↓
Observation: reachability is an equivalence relation; one traversal labels a whole class
        ↓
Optimal: vis[], outer for, one DFS/BFS per component          O(n+m)
```

### Brute Force Approach

- Basic idea: for each vertex `u`, run a full BFS to mark everyone reachable from `u`. Hash the sorted reachable set; unique sets = components. Equivalently, Floyd-Warshall on a 0/1 matrix and then cluster rows.
- Why it works: two vertices are in the same undirected component iff each appears in the other's reachable set. You recompute that set from every source.

```java
import java.util.*;

class ConnectedComponentsBrute {
    static int count(int n, List<List<Integer>> adj) {
        Set<List<Integer>> unique = new HashSet<>();
        for (int s = 0; s < n; s++) {
            boolean[] vis = new boolean[n];
            ArrayDeque<Integer> q = new ArrayDeque<>();
            vis[s] = true;
            q.offer(s);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (!vis[v]) {
                        vis[v] = true;
                        q.offer(v);
                    }
                }
            }
            List<Integer> comp = new ArrayList<>();
            for (int i = 0; i < n; i++) if (vis[i]) comp.add(i);
            unique.add(comp); // List equals/hashCode is content-based
        }
        return unique.size();
    }
}
```

**Time Complexity Calculation:** `n` BFS runs, each `O(n+m)` → `O(n(n+m))`. At `n = 10^5` this is dead. Floyd variant is `O(n³)` and also dead at that `n`.

**Space Complexity Calculation:** `O(n)` vis/queue per run, plus `O(n²)` in the worst case to store every component snapshot in the set.

- **Why can this be improved?** Once `0,1,2` are painted together, starting a new BFS at `1` and at `2` rediscovers the same set. The `vis` array should be **global** across starts.

### Optimal Approach

The structure being exploited is an **undirected** graph (reachability is symmetric). Directed graphs need strongly connected components, not this loop.

**Core Observation**
A single DFS/BFS from an unvisited vertex marks **all and only** the vertices in its component. The number of times you start such a traversal equals the number of components. Isolates: `vis[i]` is false, you start, you mark only `i`, count++.

**Pattern Identification**
Global `boolean[] vis`. Outer `for` over all vertices. Inner DFS or BFS collects a `List<Integer>` and/or increments `count`. This exact skeleton is Number of Provinces (matrix), Islands (grid), and "how many DSU roots remain".

**Step-by-Step Intuition**
1. Allocate `vis[n]` all false. *Invariant: `vis[u] == true` iff `u` has already been assigned a component.*
2. Scan `u = 0 .. n-1`. Skip if `vis[u]`.
3. On an unvisited `u`, you have discovered a new component: `count++`, start a collector list, run DFS/BFS that marks everything reachable.
4. When the inner traversal returns, that list is one component. Push it to the answer.
5. Continue the outer scan. Nodes marked inside step 3 are skipped. Unreached nodes (other components) are not.

**Dry Run** — `n=5`, edges `0-1, 1-2, 3-4`

| Step | State (vis, count, queue/stack) | Action |
|------|---------------------------------|--------|
| 0 | `vis=[F F F F F] count=0` | start outer loop |
| 1 | `vis=[T F F F F] count=1 st=[0]` | `u=0` unvisited → new component, DFS 0 |
| 2 | `vis=[T T F F F] st=[1]` | 0 → 1 |
| 3 | `vis=[T T T F F] st=[2]` | 1 → 2 |
| 4 | `vis=[T T T F F] st=[]` | 2 has no unvisited neighbor; component `[0,1,2]` done |
| 5 | same vis, `u=1,2` skipped | already painted |
| 6 | `vis=[T T T T F] count=2 st=[3]` | `u=3` unvisited → new component |
| 7 | `vis=[T T T T T] st=[4]` | 3 → 4 |
| 8 | all true, `u=4` skipped | component `[3,4]` done; count=2 |

```text
outer:  0 ✓start    1 skip    2 skip    3 ✓start    4 skip
        └─ paints {0,1,2}               └─ paints {3,4}
```

**Why Does It Work?**
Undirected reachability partitions V. The first time you meet a vertex in the outer loop it is the representative of a still-unpainted block; the inner traversal is a complete paint of that block because every edge inside the block is undirected and therefore followed. Vertices of other blocks have no edge into this one, so they stay unvisited until their own representative is scanned. Termination: every vertex is visited exactly once.

**Java Code**

```java
import java.util.*;

class ConnectedComponents {

    static int count(int n, int[][] edges) {
        List<List<Integer>> adj = buildUndirected(n, edges);
        boolean[] vis = new boolean[n];
        int count = 0;
        for (int u = 0; u < n; u++) {          // THIS loop is the algorithm
            if (!vis[u]) {
                count++;
                dfs(u, adj, vis);
            }
        }
        return count;
    }

    static List<List<Integer>> listComponents(int n, int[][] edges) {
        List<List<Integer>> adj = buildUndirected(n, edges);
        boolean[] vis = new boolean[n];
        List<List<Integer>> comps = new ArrayList<>();
        for (int u = 0; u < n; u++) {
            if (!vis[u]) {
                List<Integer> cur = new ArrayList<>();
                dfsCollect(u, adj, vis, cur);
                comps.add(cur);
            }
        }
        return comps;
    }

    static void dfs(int u, List<List<Integer>> adj, boolean[] vis) {
        vis[u] = true;
        for (int v : adj.get(u)) if (!vis[v]) dfs(v, adj, vis);
    }

    static void dfsCollect(int u, List<List<Integer>> adj, boolean[] vis, List<Integer> cur) {
        vis[u] = true;
        cur.add(u);
        for (int v : adj.get(u)) if (!vis[v]) dfsCollect(v, adj, vis, cur);
    }

    static List<List<Integer>> buildUndirected(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return adj;
    }
}
```

**Complexity**

**Time Complexity Calculation:** Each vertex enters DFS once (`vis` blocks re-entry). Each undirected edge is examined twice (once from each end). Total `O(V+E)`. The outer loop is `O(V)` additional boolean checks, absorbed.

**Space Complexity Calculation:** `O(V+E)` for the adj list, `O(V)` for `vis`, `O(V)` recursion depth in a path-shaped component (see §5 — switch to iterative if `n = 10^5` is a chain). Output lists are `O(V)` total.

### Pattern to Remember

```text
Clue: "how many groups / provinces / islands / networks" on an undirected graph that may be disconnected
Pattern: vis[] + for u in 0..n-1: if !vis[u] { count++; dfs/bfs(u) }
Mental model: inner traversal paints one component; outer loop counts the paints
```

**Similar problems:** 4. BFS and 5. DFS (the inner paint), 6. DFS on a Grid (same outer scan over cells), 7. Number of Provinces, 8. Number of Islands, 18. Number of Distinct Islands, 42. DSU (component count = `n - successful unions`, same answer), 50. Kosaraju (directed analogue — the outer loop returns on the **transpose**).

**Interview tip:** If your code has a single `dfs(0)` and no outer loop, you have assumed the graph is connected — say so, or you will fail the hidden disconnected test.

## 4. Traversal Techniques — BFS

### Problem Understanding

Breadth-first search visits vertices in order of **increasing hop-count** from a source. It is iterative. The only data structure is a FIFO queue. This topic is textbook BFS on an adj list: traversal order, level-order, and the distance array.

**Input / Output / Constraints** (typical contest input)
- `n`, adj list, source `s`. 0-index unless stated.
- Graph may be directed or undirected; BFS code is the same. Disconnected vertices are **not** visited from `s` (that is §3).
- `n ≤ 10^5`, `m ≤ 2·10^5`.
- Output: visit order, and/or `int[] dist` where `dist[u]` = min hops from `s`, or `Integer.MAX_VALUE` if unreachable.

**Observations**
- FIFO is not a style choice. It is the reason the first time you see `u`, you have the shortest path in **unweighted** hops.
- `ArrayDeque` is the queue. Not `Stack`. Not `LinkedList` used as a stack. `offer` / `poll`.
- Mark visited when you **enqueue**, not when you dequeue. Otherwise a dense layer can put the same vertex on the queue dozens of times.
- Level-order of a tree is BFS. A graph BFS is the same idea plus `vis` to kill extra edges.

**Example**
```text
undirected, source 0

    0 —— 1 —— 3
    |    |
    2    4

adj: 0:[1,2]  1:[0,3,4]  2:[0]  3:[1]  4:[1]
```
Visit order: `0, 1, 2, 3, 4`. Dist: `[0, 1, 1, 2, 2]`.

**Example 2 — unreachable.** Add vertex 5 isolated. `dist[5] = MAX`. BFS from 0 never touches it.

### How to Think About the Problem

- What should I notice first? Are edges unweighted? If yes, BFS **is** shortest path. If weights exist, BFS hops are meaningless (Dijkstra / 0-1 BFS later).
- Which representation? Adj list. Matrix BFS is `O(n²)`.
- Counting / searching / ordering / minimizing → which mental model? **Minimize hops.** Ordering by distance from `s`.
- Which traversal is natural? BFS. DFS finds *a* path, not a *shortest* path.
- **Clue → Pattern:** *Unweighted graph + "shortest" / "minimum moves" / "level by level" → ArrayDeque BFS + dist[].*

### Intuition (Brute → Better → Optimal)

```text
Brute force: DFS / recursion over all simple paths, keep min length     exponential
        ↓
Observation: first time you reach u by expanding in hop-order, that hop-count is min
        ↓
Optimal: FIFO queue, vis-on-enqueue, dist[v] = dist[u]+1               O(n+m)
```

### Brute Force Approach

- Basic idea: from `s`, recursively try every unused neighbor, track depth, record the min depth at which each vertex is seen. That is "shortest path by enumerating simple paths".
- Why it works: the shortest simple path is among the paths you enumerate. It fails as a method because there can be exponentially many simple paths (`n!` in a complete graph).

```java
import java.util.*;

class BFSBruteAllPaths {
    static int[] minHops(int n, List<List<Integer>> adj, int s) {
        int[] best = new int[n];
        Arrays.fill(best, Integer.MAX_VALUE);
        boolean[] onPath = new boolean[n];
        dfs(s, 0, adj, onPath, best);
        return best;
    }

    static void dfs(int u, int d, List<List<Integer>> adj, boolean[] onPath, int[] best) {
        onPath[u] = true;
        best[u] = Math.min(best[u], d);
        for (int v : adj.get(u)) {
            if (!onPath[v]) dfs(v, d + 1, adj, onPath, best);
        }
        onPath[u] = false; // allow u on a different simple path
    }
}
```

**Time Complexity Calculation:** Each simple path is explored. Dense graphs → `O(n!)`. Even a modest branching factor (binary tree of height 20) is a million leaves; a graph with extra edges is worse.

**Space Complexity Calculation:** Recursion + `onPath` is `O(n)`.

- **Why can this be improved?** You do not need every path. In an unweighted graph, **any** path that reaches `u` with extra detours is longer than a path that reached `u` earlier. Process vertices in the order they are first reached.

### Optimal Approach

The structure being exploited is an **unweighted** graph (every edge costs 1), directed or undirected.

**Core Observation**
A FIFO queue expands vertices in non-decreasing `dist`. The first time `v` is enqueued, every possible unused shorter path would have had to enqueue `v` already — so this `dist[v]` is minimum hops.

**Pattern Identification**
`ArrayDeque<Integer> q`, `boolean[] vis` (or `dist[v] != MAX` as the vis test), `int[] dist` filled with `MAX` except `dist[s] = 0`. Iterative only. Level-order variant: snapshot `q.size()` at the start of a round and treat that round as one hop (Rotten Oranges, Word Ladder).

**Step-by-Step Intuition**
1. `dist[s] = 0`, `vis[s] = true`, `q.offer(s)`. *Invariant: every vertex in the queue is already visited, and `dist[u]` for those vertices (and all previously dequeued) is the true min-hop distance.*
2. `poll u`. Iterate neighbors `v`.
3. If `v` not visited: `vis[v] = true` **now**, `dist[v] = dist[u] + 1`, `q.offer(v)`.
4. Repeat until the queue is empty. Unvisited vertices stay at `MAX` (other components).
5. Visit order = dequeue order. Levels = vertices that share a `dist` value.

**Dry Run** — graph above, source 0. Neighbor order as written: `0:[1,2], 1:[0,3,4], …`

| Step | State (queue, dist, vis) | Action |
|------|--------------------------|--------|
| 0 | `q=[0]` `dist=[0,M,M,M,M]` `vis=[T,F,F,F,F]` | seed |
| 1 | `q=[1,2]` `dist=[0,1,1,M,M]` `vis=[T,T,T,F,F]` | pop 0; enqueue 1,2 |
| 2 | `q=[2,3,4]` `dist=[0,1,1,2,2]` `vis=[T,T,T,T,T]` | pop 1; skip 0; enqueue 3,4 |
| 3 | `q=[3,4]` same dist/vis | pop 2; neighbor 0 already vis |
| 4 | `q=[4]` | pop 3; neighbor 1 vis |
| 5 | `q=[]` | pop 4; neighbor 1 vis; stop |

```text
level 0:  0
level 1:  1, 2
level 2:  3, 4
```

Queue is always non-decreasing in dist: `[0] → [1,2] → [3,4]`. Never `[2-hop, 1-hop]`.

**Why Does It Work?**
Induction on hops. All vertices at distance `< k` were dequeued before any vertex at distance `k` (FIFO + we only enqueue `k` from a `(k-1)` parent). A hypothetical shorter path to `v` would place `v` in an earlier layer, so it would already be `vis`. Therefore the first enqueue is optimal, and extra graph edges cannot improve a hop-count already written.

**Java Code**

```java
import java.util.*;

class BFSTraversal {

    static List<Integer> bfsOrder(int n, List<List<Integer>> adj, int s) {
        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        List<Integer> order = new ArrayList<>();
        vis[s] = true;
        q.offer(s);
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                if (!vis[v]) {
                    vis[v] = true;   // mark on enqueue, not on dequeue
                    q.offer(v);
                }
            }
        }
        return order;
    }

    static int[] distances(int n, List<List<Integer>> adj, int s) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        dist[s] = 0;
        q.offer(s);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                if (dist[v] == Integer.MAX_VALUE) {
                    dist[v] = dist[u] + 1;
                    q.offer(v);
                }
            }
        }
        return dist; // MAX = unreachable
    }

    // Level-snapshot form — same algorithm, hop counter explicit.
    static int maxLevel(int n, List<List<Integer>> adj, int s) {
        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        vis[s] = true;
        q.offer(s);
        int level = 0;
        while (!q.isEmpty()) {
            int sz = q.size();
            for (int i = 0; i < sz; i++) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (!vis[v]) {
                        vis[v] = true;
                        q.offer(v);
                    }
                }
            }
            if (!q.isEmpty()) level++;
        }
        return level;
    }
}
```

**Complexity**

**Time Complexity Calculation:** Each vertex is enqueued at most once. Each edge is scanned a constant number of times (twice if undirected). `O(V+E)`. Building adj is `O(V+E)` more, same class.

**Space Complexity Calculation:** Queue holds at most `V` vertices (worst case: source connected to everyone — the entire frontier is `V-1` after the first pop). `vis` and `dist` are `O(V)`. Adj is `O(V+E)`. Total `O(V+E)`. Distinguish: this is **heap** space, not JVM call-stack.

### Pattern to Remember

```text
Clue: unweighted shortest, minimum moves, "in t minutes", level by level, rotten/oranges/word-ladder
Pattern: ArrayDeque FIFO, vis on enqueue, dist[v] = dist[u]+1
Mental model: the queue is sorted by hops; first touch is the shortest hop
```

**Similar problems:** 3. Connected Components (BFS as the paint), 8. Number of Islands (BFS flood), 10. Rotten Oranges (multi-source BFS, level snapshot = minutes), 13. 0/1 Matrix (multi-source dist), 16. Word Ladder I (implicit graph BFS), 28. Shortest Path in Undirected Unit Graph (this exact `dist[]`).

**Interview tip:** If the interviewer says "shortest" and every edge is weight 1, write BFS — Dijkstra is correct and slower, and they will ask why you used a heap.

## 5. DFS

### Problem Understanding

Depth-first search walks one path as far as it goes, then backtracks. The call stack *is* the path. This topic is recursive DFS with a `vis` array, the iterative `ArrayDeque` stack variant, preorder vs postorder, and the stack-overflow cliff at a path of `10^5`.

**Input / Output / Constraints** (typical contest input)
- `n`, adj list, source `s` (or all sources via the §3 outer loop).
- `n ≤ 10^5`. A linked-list graph (`i → i+1`) is a legal input. Recursive DFS on it dies.
- Output: visit order (preorder or postorder), or "painted" `vis` for connectivity.

**Observations**
- Recursive DFS is preorder if you record **on entry**, postorder if you record **after** the neighbor loop. Topo sort / Kosaraju finishing times need postorder. A "DFS traversal list" in GFG is preorder.
- `vis` must be set **before** recursing, or a cycle sends you into infinite recursion.
- Iterative DFS uses `ArrayDeque` as a stack (`push`/`pop`). It is not `java.util.Stack` (synchronized Vector). Order of neighbors will often come out **reversed** vs recursive, because LIFO flips the list. Connectivity answers do not care. Traversal-order judges might.
- Recursion depth = length of the current path. Java's default thread stack is about 1 MB. A path of `10^5` frames is a `StackOverflowError`. Heap-allocated `ArrayDeque` is not.

**Example**
```text
undirected, start 0, neighbor order as written

    0 — 1 — 3
    |
    2 — 4

adj: 0:[1,2]  1:[0,3]  2:[0,4]  3:[1]  4:[2]
```
Recursive preorder: `0, 1, 3, 2, 4`.
Postorder: `3, 1, 4, 2, 0`.

**Example 2 — the overflow graph.** `n = 100000`, edges `i — i+1` for `i = 0..n-2`. Recursive `dfs(0)` explodes. Iterative finishes.

### How to Think About the Problem

- What should I notice first? Do I need a visit **order**, a **paint**, or a **finish time**? That picks pre vs post.
- Which representation? Adj list. Same as BFS.
- Counting / searching / ordering / minimizing → which mental model? **Go deep, backtrack.** Path-shaped state (cycle-in-path, current ancestry) lives naturally on the DFS stack. Distances do not.
- Which traversal is natural? DFS when the question is about connectivity, cycles-with-parent, finishing times, or grid flooding. Not when the question is min hops.
- **Clue → Pattern:** *Path, backtrack, "entire region", finishing time, recursion on neighbors → DFS; n=1e5 path → iterative ArrayDeque.*

### Intuition (Brute → Better → Optimal)

```text
Brute / naïve: recurse with no vis          infinite loop on the first cycle
        ↓
Observation: vis on entry; but the JVM stack is not O(n) budget you own
        ↓
Optimal: recursive DFS for n-small / shallow; iterative ArrayDeque when depth can be n
```

### Brute Force Approach

- Basic idea: recurse on every neighbor without a global `vis`. Maybe a "don't go back to parent" check, which still loops on a 3-cycle `0-1-2-0`.
- Why it (doesn't) work: on a tree, parent-skipping is enough and you get a correct walk. On a graph, a cross/back edge into an ancestor that is not the parent re-enters a live path. Without `vis`, DFS is not defined on graphs.

```java
import java.util.*;

class DFSNaiveNoVis {
    // WRONG on graphs with cycles — kept to show the failure.
    static void dfs(int u, int parent, List<List<Integer>> adj, List<Integer> order) {
        order.add(u);
        for (int v : adj.get(u)) {
            if (v != parent) dfs(v, u, adj, order); // 3-cycle: infinite
        }
    }
}
```

**Time Complexity Calculation:** Infinite on a cycle. On a tree, `O(n)`.

**Space Complexity Calculation:** `O(n)` frames on a path tree — already the overflow risk, even when the answer is correct.

- **Why can this be improved?** `vis[]` makes each vertex a start-once node, so cycles become skipped back-edges. Iterative form moves the stack to the heap so a `10^5` path is legal.

### Optimal Approach

The structure being exploited is any graph (directed or undirected) where you need a **depth-first** walk. Undirected cycle detection will later need the `parent` argument; directed cycle detection will need a 3-color / path-vis array. This section is the walk itself.

**Core Observation**
DFS is a stack discipline. Recursion hides the stack. Preorder = "I see `u` as I go in". Postorder = "I see `u` as I leave, after every descendant". Iterative DFS with mark-on-push approximates preorder; true postorder iteratively needs an enter/exit flag (or a second pass).

**Pattern Identification**
`boolean[] vis`, recurse on unvisited neighbors. Outer loop from §3 if the graph may be disconnected. Iterative: `ArrayDeque<Integer>` stack, mark on push to avoid stuffing the same node repeatedly.

**Step-by-Step Intuition**
1. `vis[u] = true` on entry. *Invariant: a vertex on the recursion stack is `vis` and lies on the unique path from the DFS root to the current node.*
2. Preorder record happens here, before children.
3. For each neighbor `v`, if `!vis[v]`, recurse. (If `vis[v]` and `v` is not parent, that edge is a back/cross edge — cycle topics later.)
4. After the loop, postorder record. This is the finishing time.
5. If `n` can be `10^5` and a chain is possible, rewrite with `ArrayDeque` as an explicit stack. Do not ask the JVM for `10^5` frames.

**Dry Run** — recursive, graph above, start 0. Show the call stack.

| Step | State (call stack, vis, pre, post) | Action |
|------|-------------------------------------|--------|
| 1 | `[0]` `vis=[T,F,F,F,F]` pre=`[0]` | enter 0 |
| 2 | `[0,1]` `vis=[T,T,F,F,F]` pre=`[0,1]` | 0 → first neighbor 1 |
| 3 | `[0,1,3]` `vis=[T,T,F,T,F]` pre=`[0,1,3]` | 1 → 3 (0 already vis) |
| 4 | `[0,1]` post=`[3]` | 3 has no unvisited; leave 3 |
| 5 | `[0]` post=`[3,1]` | leave 1 |
| 6 | `[0,2]` `vis=[T,T,T,T,F]` pre=`[0,1,3,2]` | 0 → 2 |
| 7 | `[0,2,4]` `vis=all T` pre=`[0,1,3,2,4]` | 2 → 4 |
| 8 | `[0,2]` post=`[3,1,4]` | leave 4 |
| 9 | `[0]` post=`[3,1,4,2]` | leave 2 |
| 10 | `[]` post=`[3,1,4,2,0]` | leave 0 |

```text
recursion tree
0
├─ 1
│  └─ 3
└─ 2
   └─ 4
```

**Why Does It Work?**
`vis` guarantees each vertex is expanded once, so a cycle cannot re-enter. The recursion stack holds the current path, which is exactly the ancestry you need for back-edge tests later. Completeness: every vertex reachable from the source is eventually a neighbor of an expanded vertex, and will be recursed on when first seen. Iterative LIFO simulates the same expand-deep-first policy; neighbor order may differ, the component painted does not.

**Java Code**

```java
import java.util.*;

class DFSTraversal {

    static List<Integer> dfsPreorder(int n, List<List<Integer>> adj, int s) {
        boolean[] vis = new boolean[n];
        List<Integer> pre = new ArrayList<>();
        dfsPre(s, adj, vis, pre);
        return pre;
    }

    static void dfsPre(int u, List<List<Integer>> adj, boolean[] vis, List<Integer> pre) {
        vis[u] = true;
        pre.add(u);                 // preorder
        for (int v : adj.get(u)) {
            if (!vis[v]) dfsPre(v, adj, vis, pre);
        }
        // postorder would record here
    }

    static List<Integer> dfsPostorder(int n, List<List<Integer>> adj, int s) {
        boolean[] vis = new boolean[n];
        List<Integer> post = new ArrayList<>();
        dfsPost(s, adj, vis, post);
        return post;
    }

    static void dfsPost(int u, List<List<Integer>> adj, boolean[] vis, List<Integer> post) {
        vis[u] = true;
        for (int v : adj.get(u)) {
            if (!vis[v]) dfsPost(v, adj, vis, post);
        }
        post.add(u);                // postorder — topo / Kosaraju finish
    }

    // Heap stack. Use when a path of length n is possible (n ~ 1e5).
    static List<Integer> dfsIterative(int n, List<List<Integer>> adj, int s) {
        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> st = new ArrayDeque<>();
        List<Integer> order = new ArrayList<>();
        vis[s] = true;
        st.push(s);
        while (!st.isEmpty()) {
            int u = st.pop();
            order.add(u);
            // reverse iterate if you want closer-to-recursive neighbor order
            List<Integer> nb = adj.get(u);
            for (int i = nb.size() - 1; i >= 0; i--) {
                int v = nb.get(i);
                if (!vis[v]) {
                    vis[v] = true;  // mark on push
                    st.push(v);
                }
            }
        }
        return order;
    }

    // Disconnected: the §3 wrapper. Recursive body unchanged.
    static void dfsAll(int n, List<List<Integer>> adj) {
        boolean[] vis = new boolean[n];
        for (int u = 0; u < n; u++) {
            if (!vis[u]) dfsPre(u, adj, vis, new ArrayList<>());
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:** Each vertex is marked once; each edge is examined a constant number of times. `O(V+E)` for recursive and iterative. Reversing the neighbor list in the iterative version is still `O(deg(u))` per vertex, same class.

**Space Complexity Calculation:** Recursive: `O(V)` JVM stack in the worst path, plus `O(V)` `vis`, plus `O(V+E)` adj. That JVM stack is the failure mode — it is not the same budget as heap. Iterative: `O(V)` `ArrayDeque` on the **heap**, `O(V)` vis. Prefer iterative when constraints say `n = 10^5` and the graph is not guaranteed shallow (a grid-of-all-1s snake is the same warning, §6).

### Pattern to Remember

```text
Clue: paint a region, cycle via ancestry, finishing times, "explore fully before backtracking"
Pattern: vis on entry; preorder on entry / postorder after children; ArrayDeque stack if depth = n
Mental model: the stack (call or explicit) IS the current path
```

**Similar problems:** 3. Connected Components (DFS paint), 6. DFS on a Grid, 7. Number of Provinces, 11–12. Cycle Detection undirected (parent + back edge), 20. Directed Cycle DFS (3-color), 21. Topo Sort DFS (postorder reverse), 50. Kosaraju (postorder on G, then DFS on Gᵀ).

**Interview tip:** If constraints are `n = 10^5`, say you will write iterative DFS (or BFS) so a chain does not blow the stack — that sentence is free credit.

## 6. DFS on a Grid / Connected Components Problem in Matrix

### Problem Understanding

A grid is a graph you do not build. Each cell is a vertex. A 4-direction step into an in-bounds land cell is an edge. Counting connected components of `1`s on a `char[][]` / `int[][]` is Number of Islands with the story stripped. This is §3's outer loop, with `(r,c)` as the vertex id and `dirs` as the adj list.

**Input / Output / Constraints**
- Grid `n × m`, cells `0/1` or `'0'/'1'`. 4-dir connectivity unless the statement says "including diagonals" (then 8-dir).
- `1 ≤ n, m ≤ 1000` is common (`N = n·m ≤ 10^6`). Recursing on an all-land grid is a path of length `N` in the worst snake; overflow is real.
- Output: number of components (islands).
- Empty grid / all water → 0. All land, 4-dir → 1.

**Observations**
- `int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}}` plus an in-bounds check **is** `adj.get(u)`.
- Outer loops: `for r`, `for c`, if land and not visited → `count++`, DFS/BFS flood.
- You may mutate the grid (`1 → 0`) instead of a `vis[][]` if the interviewer allows destroying input.
- 8-dir is **not** a default. GFG "Number of Islands" is often 8-dir; LeetCode 200 is 4-dir. Read the statement.
- Flatten `(r,c) → r*m+c` only when you need a general-graph algorithm. Flood-fill does not need it.

**Example** — 4×5 grid, 3 islands, 4-dir
```text
grid =
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1

islands = 3
```
```text
[1 1] . . .      (0,0) block of 4
[1 1] . . .
. . [1] . .      (2,2) singleton
. . . [1 1]      (3,3)-(3,4)
```

**Example 2 — diagonals.** Two cells at `(0,0)` and `(1,1)`, rest water. 4-dir: **2** islands. 8-dir: **1** island. This is the edge case that decides `dirs`.

### How to Think About the Problem

- What should I notice first? 4-dir or 8-dir? `char` or `int`? May I overwrite the grid?
- Which representation? **Implicit.** No `List<List<Integer>>`. Vertex = cell. Edge = dir step that stays in-bounds and stays on land.
- Counting / searching / ordering / minimizing → which mental model? §3: count starts of a flood. `N = n*m` vertices, `E ≈ 4N`.
- Which traversal is natural? DFS flood is the usual. BFS flood is equivalent and safer on deep grids. Same `count`.
- **Clue → Pattern:** *2D land/water, "how many regions" → nested loop + dirs DFS/BFS; 8-dir only if diagonals count.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: flatten every land cell into an explicit adj list, then §3 on N nodes
             correct, extra O(N) memory and build time
        ↓
Observation: neighbors are a closed formula of (r,c); building adj is theatre
        ↓
Optimal: vis[][] or in-place; dirs + in-bounds; outer scan over cells     O(N)
```

### Brute Force Approach

- Basic idea: problem 1's `fromGrid`, then `ConnectedComponents.count` on `N = n*m` nodes. Water cells are isolates and would inflate the count unless you skip them in the outer loop (only start on land). Easy to get wrong: counting water as components of size 1.
- Why it works: the explicit graph of land-land 4-dir edges has exactly the islands as its non-trivial components. You must **not** count water isolates.

```java
import java.util.*;

class GridCCBrute {
    static int countIslands(int[][] grid) {
        if (grid.length == 0) return 0;
        int n = grid.length, m = grid[0].length;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n * m; i++) adj.add(new ArrayList<>());
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 0) continue;
                int id = r * m + c;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                    if (in && grid[nr][nc] == 1) adj.get(id).add(nr * m + nc);
                }
            }
        }
        boolean[] vis = new boolean[n * m];
        int count = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 0) continue;          // water is not an island
                int id = r * m + c;
                if (!vis[id]) {
                    count++;
                    dfs(id, adj, vis);
                }
            }
        }
        return count;
    }

    static void dfs(int u, List<List<Integer>> adj, boolean[] vis) {
        vis[u] = true;
        for (int v : adj.get(u)) if (!vis[v]) dfs(v, adj, vis);
    }
}
```

**Time Complexity Calculation:** Build visits each cell and 4 neighbors: `O(N)` with `N = n·m`, `E ≈ 4N`. Component DFS is `O(N+E) = O(N)`. Correct bound, wasted constants and memory.

**Space Complexity Calculation:** Adj lists `O(N)` extra on top of the grid. Recursion `O(N)` in a snake of land.

- **Why can this be improved?** The neighbor formula does not need to be stored. `dirs` evaluated at flood time is the adj list. Dropping the build also drops the water-isolate footgun.

### Optimal Approach

The structure being exploited is an **unweighted 4-dir (or 8-dir) grid graph**, land vs water.

**Core Observation**
Starting DFS at an unvisited land cell paints the entire island (every land cell 4-reachable from it). The number of such starts is the number of islands. Water is never a start and never a neighbor.

**Pattern Identification**
Nested `for r, for c`. On land + not vis: `count++`, flood. Flood: mark, then 4-dir recurse/queue if in-bounds and land. This is the template for Flood Fill, Surrounded Regions (start from **border**), Number of Enclaves, Distinct Islands (record the shape during flood).

**Step-by-Step Intuition**
1. `dirs` and `in(r,c)`. *Invariant: a cell is marked vis (or overwritten to water) iff it has been assigned to some island already.*
2. Scan in row-major order. Water and vis land are skipped.
3. Unvisited land: new island, `count++`, DFS/BFS from here.
4. Inside DFS: mark **first**, then try four neighbors. Out of bounds and water are walls.
5. If the statement includes diagonals, swap in the 8-dir array. Do not mix.

**Dry Run** — 4×5 example, 4-dir, in-place mark `1 → 0`

| Step | State (count, vis/grid, stack) | Action |
|------|--------------------------------|--------|
| 1 | count=1, stack=`[(0,0)]` | `(0,0)` is land, new island, DFS |
| 2 | flood `(0,0),(0,1),(1,0),(1,1)` to 0 | 2×2 block painted; neighbors of the block are water |
| 3 | count=1, scan continues through zeros | skip water |
| 4 | count=2, stack=`[(2,2)]` | hit `(2,2)`, new island, singleton |
| 5 | count=2, scan `(3,0)..(3,2)` water | skip |
| 6 | count=3, stack=`[(3,3),(3,4)]` | `(3,3)` new island, 4-dir reaches `(3,4)` |
| 7 | scan ends | count=3 |

```text
after island 1          after island 2          after island 3
0 0 0 0 0               0 0 0 0 0               0 0 0 0 0
0 0 0 0 0               0 0 0 0 0               0 0 0 0 0
0 0 1 0 0               0 0 0 0 0               0 0 0 0 0
0 0 0 1 1               0 0 0 1 1               0 0 0 0 0
```

**Why Does It Work?**
4-dir land connectivity is the connected-component relation of §3. Each flood is maximal because every land edge is tried. Islands are disjoint (a cell is marked before it can seed another start), so starts equal islands. Bounds checks make the implicit graph finite; water cells have degree 0 in the land graph and never seed.

**Java Code**

```java
import java.util.*;

class GridConnectedComponents {

    static final int[][] DIRS4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
    static final int[][] DIRS8 = {
        {-1, -1}, {-1, 0}, {-1, 1},
        { 0, -1},          { 0, 1},
        { 1, -1}, { 1, 0}, { 1, 1}
    };

    // LeetCode 200 signature (4-dir, char grid).
    public int numIslands(char[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        int n = grid.length, m = grid[0].length;
        int count = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == '1') {
                    count++;
                    dfs(grid, r, c, n, m);
                }
            }
        }
        return count;
    }

    void dfs(char[][] grid, int r, int c, int n, int m) {
        boolean in = r >= 0 && r < n && c >= 0 && c < m;
        if (!in || grid[r][c] != '1') return;
        grid[r][c] = '0';          // mark visited in-place
        for (int[] d : DIRS4) dfs(grid, r + d[0], c + d[1], n, m);
    }

    // int grid, extra vis[][], 4-dir — non-mutating.
    static int countIslands(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        boolean[][] vis = new boolean[n][m];
        int count = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 1 && !vis[r][c]) {
                    count++;
                    dfsVis(grid, vis, r, c, n, m);
                }
            }
        }
        return count;
    }

    static void dfsVis(int[][] grid, boolean[][] vis, int r, int c, int n, int m) {
        vis[r][c] = true;
        for (int[] d : DIRS4) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
            if (in && grid[nr][nc] == 1 && !vis[nr][nc]) {
                dfsVis(grid, vis, nr, nc, n, m);
            }
        }
    }

    // Safer at N = 1e6: iterative flood. Same count.
    static void dfsIterative(int[][] grid, boolean[][] vis, int sr, int sc, int n, int m) {
        ArrayDeque<int[]> st = new ArrayDeque<>();
        vis[sr][sc] = true;
        st.push(new int[]{sr, sc});
        while (!st.isEmpty()) {
            int[] cur = st.pop();
            int r = cur[0], c = cur[1];
            for (int[] d : DIRS4) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (in && grid[nr][nc] == 1 && !vis[nr][nc]) {
                    vis[nr][nc] = true;
                    st.push(new int[]{nr, nc});
                }
            }
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:** `N = n·m` cells. Each cell is the start of a constant-time check. Each land cell is flooded once; each cell probes ≤ 4 (or 8) neighbors. `E ≈ 4N`. Total `O(N)`. Explicit-graph brute is the same Big-O with a worse constant.

**Space Complexity Calculation:** `vis[][]` is `O(N)`. In-place marking is `O(1)` extra plus the stack. Recursive stack is `O(N)` in a spiral/snake of land — on `1000×1000` that is a `StackOverflowError` waiting. Iterative `ArrayDeque` of `int[]{r,c}` is `O(N)` **heap** and is the production form. BFS flood is `O(N)` heap as well (queue). Distinguish V and E: here `V = N`, `E ≈ 4N`, not the original `n, m` edge counts of a list graph.

### Pattern to Remember

```text
Clue: 2D grid of land/water (or colors), count regions / paint a region
Pattern: dirs + in-bounds; for r,c if land && !vis: count++; flood DFS/BFS
Mental model: the grid IS the graph; you never build adj; outer scan counts islands
```

**Similar problems:** 3. Connected Components (same outer loop, explicit vertices), 7. Number of Provinces (matrix but 1D vertices), 8. Number of Islands (this problem with a story), 9. Flood Fill (one component, recolor), 14. Surrounded Regions (flood from **border** `O`s), 15. Number of Enclaves (flood from border land), 18. Number of Distinct Islands (hash the path shape during flood), 47. Number of Islands II (online, switch to DSU).

**Interview tip:** Ask "4-dir or 8-dir?" before you touch `dirs` — it is a one-line change and the most common silent WA on island problems.


# PART B — Problems on BFS/DFS

BFS and DFS are the same walker. The art is what you put in the queue (or on the call stack) and when you mark a node visited. Mark too late and the queue fills with duplicates; treat the neighbour you walked in from as a back-edge and an undirected graph looks cyclic; forget to seed every rotten orange at minute 0 and "minimum time" becomes "time from the wrong source". This part trains those choices: multi-source BFS, parent-pointer cycle checks, boundary-first floods, and (later in 14–20) 2-colouring. Fourteen problems sit in PART B. This file covers 7–13 only.

## 7. Number of Provinces

### Problem Understanding

`n` cities. `isConnected[i][j] == 1` means a direct bidirectional road between city `i` and city `j`. A **province** is a connected component: cities reachable from each other, directly or through other cities. Return how many provinces there are.

**Input / Output / Constraints**
- Input: `int[][] isConnected`, `n × n`, `isConnected[i][i] == 1`, symmetric (`isConnected[i][j] == isConnected[j][i]`).
- Output: `int` — number of connected components.
- Constraints: `1 ≤ n ≤ 200` (LeetCode 547 Medium). The input **is** the adjacency matrix. You still loop neighbours as `if (isConnected[i][j] == 1)`.
- 0-indexed cities.

**Observations**
- This is component counting on an **undirected** graph given as a dense matrix, not a list.
- Building an adj list from the matrix costs `O(n²)` extra space and buys nothing: the neighbour loop is already `for (j = 0; j < n; j++)`.
- `isConnected[i][i] == 1` is a self-entry, not a self-loop you should chase. `vis[i] = true` before you scan `j` makes it harmless.
- DFS, BFS, and DSU all give the same answer. DFS/BFS count how many times you pick a fresh start. DSU unions every `1` and counts roots.
- You cannot beat `O(n²)` time: you must look at the matrix.

**Example**
```text
isConnected =
[[1,1,0],
 [1,1,0],
 [0,0,1]]

0 ── 1      2
provinces = 2
```

Second example (all isolated): `[[1,0,0],[0,1,0],[0,0,1]]` → `3`.
Edge: `n = 1`, `[[1]]` → `1`. Edge: fully connected → `1`.

### How to Think About the Problem

- What should I notice first? The matrix already *is* the graph. A province is a connected component. Counting components means: how many times do I have to pick a city that is still unvisited and walk its whole component?
- Which representation? Stay on the matrix. Neighbour of `i` is every `j` with `isConnected[i][j] == 1`. Do not convert unless the rest of the interview needs a list.
- Counting / searching / ordering / minimizing → which mental model? **Counting** components. Not shortest path, not cycle, not topo.
- Which traversal is natural? DFS or BFS, both `O(n²)`. DSU is the same count in a union-find costume.
- **Clue → Pattern:** *undirected connectivity + "how many groups" → outer loop over unvisited + DFS/BFS/DSU.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: from every city, BFS the whole matrix, hash the
reachable set; number of distinct sets = provinces. O(n³)
        ↓
Observation: cities in one component produce the same set.
You only need one BFS/DFS per component, not per city.
        ↓
Optimal: for each unvisited i, provinces++, DFS/BFS to mark
the whole component. O(n²). DSU is an equivalent optimal.
```

### Brute Force Approach

- Basic idea: start a fresh BFS from every city `s`. Record which cities `s` can reach as a bit-string. Insert that string into a `HashSet`. The set size is the number of distinct reachable-sets, which equals the number of provinces.
- Why it works: two cities in the same province produce the same reachable set (undirected, so reachability is an equivalence relation). Different provinces produce disjoint sets.

```java
import java.util.*;

class NumberOfProvincesBrute {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length;
        Set<String> unique = new HashSet<>();
        for (int s = 0; s < n; s++) {
            boolean[] vis = new boolean[n];
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.offer(s);
            vis[s] = true;
            while (!q.isEmpty()) {
                int i = q.poll();
                for (int j = 0; j < n; j++) {
                    if (isConnected[i][j] == 1 && !vis[j]) {
                        vis[j] = true;
                        q.offer(j);
                    }
                }
            }
            unique.add(Arrays.toString(vis));
        }
        return unique.size();
    }
}
```

**Time Complexity Calculation:**
`n` starts. Each BFS scans `n` neighbour slots for each of `n` nodes → `O(n²)` per start. Total `O(n³)`. Hashing a length-`n` vis array is `O(n)` per start and does not change the leading term.

**Space Complexity Calculation:**
`vis[n]` plus a queue of `O(n)`, and up to `n` strings of length `O(n)` in the set → `O(n²)`.

**Why can this be improved?**
You recompute the same component once per member. After you have walked city `0`'s province you already know city `1` is in it. A global `vis` plus "start only if unvisited" drops the extra factor of `n`.

### Optimal Approach

The structure being exploited is an **undirected** graph given as an adjacency **matrix**: connectivity is an equivalence relation, so one traversal per component is enough.

**Core Observation**
The number of provinces equals the number of times an outer loop finds a city with `vis[i] == false`. Each DFS then paints that city's entire component so it will never start a new province.

**Pattern Identification**
Standard connected-components on an adj-matrix. Neighbour loop is `for j in 0..n-1` gated by `isConnected[i][j] == 1`, not `for (int nei : adj.get(i))`.

**Step-by-Step Intuition**
1. `vis[n]` all false. `provinces = 0`.
2. For `i = 0 .. n-1`: if `vis[i]`, skip. Otherwise this city is a new province: `provinces++`, then `dfs(i)`.
3. `dfs(i)`: mark `vis[i] = true`. For every `j`, if there is a road and `j` is unseen, recurse.
4. *Invariant: after `dfs(i)` returns, every city in i's province is visited, and no city outside it is.*
5. DSU alternative: start with `n` components; for each `i < j` with a road, `union(i, j)` and decrement when the roots differ. The remaining root-count is the answer.

**Dry Run**

`isConnected = [[1,1,0],[1,1,0],[0,0,1]]`

| Step | vis | stack | Action |
|---|---|---|---|
| 0 | `[F,F,F]` | — | outer `i=0`, unvisited → `provinces=1`, `dfs(0)` |
| 1 | `[T,F,F]` | `0` | mark 0; scan `j=0,1,2`; `j=0` already vis; `j=1` road and unseen |
| 2 | `[T,T,F]` | `0,1` | `dfs(1)`: mark 1; `j=0` vis; `j=1` vis; `j=2` no road |
| 3 | `[T,T,F]` | `0` | pop 1; `j=2` no road; pop 0 |
| 4 | `[T,T,F]` | — | outer `i=1`, `vis[1]` → skip |
| 5 | `[T,T,T]` | `2` | outer `i=2`, unvisited → `provinces=2`, `dfs(2)` marks 2, no unseen neighbour |
| 6 | `[T,T,T]` | — | done, return `2` |

**Why Does It Work?**
Undirected reachability partitions the cities. A node is unvisited in the outer loop if and only if no previous start could reach it, so it is a representative of a new block of the partition. DFS exhausts a block because every road is examined from every visited city (`isConnected` is symmetric). Termination follows from `vis`: each city is pushed onto the call stack at most once.

**Java Code**

```java
import java.util.*;

class NumberOfProvinces {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length;
        boolean[] vis = new boolean[n];
        int provinces = 0;
        for (int i = 0; i < n; i++) {
            if (!vis[i]) {
                provinces++;
                dfs(i, isConnected, vis);
            }
        }
        return provinces;
    }

    private void dfs(int i, int[][] isConnected, boolean[] vis) {
        vis[i] = true;
        for (int j = 0; j < isConnected.length; j++) {
            if (isConnected[i][j] == 1 && !vis[j]) {
                dfs(j, isConnected, vis);
            }
        }
    }

    // Equivalent optimal: DSU. Same O(n²), iterative, no recursion.
    public int findCircleNumDsu(int[][] isConnected) {
        int n = isConnected.length;
        int[] parent = new int[n];
        int[] size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
        int components = n;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (isConnected[i][j] == 1) {
                    int ri = find(parent, i);
                    int rj = find(parent, j);
                    if (ri != rj) {
                        union(parent, size, ri, rj);
                        components--;
                    }
                }
            }
        }
        return components;
    }

    private int find(int[] parent, int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]]; // path compression
            x = parent[x];
        }
        return x;
    }

    private void union(int[] parent, int[] size, int ri, int rj) {
        if (size[ri] < size[rj]) {
            int tmp = ri;
            ri = rj;
            rj = tmp;
        }
        parent[rj] = ri;
        size[ri] += size[rj];
    }
}
```

BFS is the same algorithm with `ArrayDeque<Integer>` in place of the call stack. Use it if `n` is large enough that recursion depth `n` is a concern (not on LeetCode 547: `n ≤ 200`).

**Complexity**

**Time Complexity Calculation:**
Outer loop `n` cities. Across all DFS calls, each city is entered once (`vis`). On entry you scan `n` possible roads. Total `O(n²)`. DSU is `O(n² α(n))` because you still iterate the upper triangle of the matrix; `α(n)` is effectively constant. You cannot read less than the whole matrix.

**Space Complexity Calculation:**
`vis[n]` plus recursion depth `O(n)` in the worst case (a line of cities). DSU uses `parent[n] + size[n]` and no recursion — `O(n)` auxiliary. No adj-list copy.

### Pattern to Remember

```text
Clue: "groups of cities / friends / accounts that can reach each other"
Pattern: component count = times the outer loop finds an unvisited node
Mental model: the matrix IS the adj list; neighbour = (isConnected[i][j] == 1)
```

**Similar problems:** 8 Connected Components in a Matrix (same count, grid instead of matrix-graph), 11–12 undirected cycles (you still outer-loop disconnected graphs), 47 Accounts Merge (DSU on the same "province" idea).

**Interview tip:** Say out loud that you will not build an adj list from an `n × n` matrix; then offer DFS and DSU as two optimals and implement one.

## 8. Connected Components in a Matrix (grid component counting)

### Problem Understanding

A grid of `0/1`. A **component** (island, region) is a 4-directionally connected group of `1`s. Count them. This is the reusable DFS/BFS wrapper you lift into later grid floods — especially **18 Number of Distinct Islands**, where the same outer loop runs and the DFS body records a shape instead of a count.

**Input / Output / Constraints**
- Input: `int[][] grid`, `n` rows, `m` columns, cells `0` or `1`.
- Output: `int` — number of 4-connected components of `1`s.
- Moves: up, down, left, right. No diagonals.
- Empty grid → `0`. All zeros → `0`. Single `1` → `1`.
- Treat this as the skeleton behind LeetCode 200 (Number of Islands) with `char[][]` / `'1'` `'0'`.

**Observations**
- Graph: every cell is a vertex. Edge to a 4-neighbour that is also `1`. `N = n·m`, `E ≈ 4N`.
- The **outer double loop** is the component counter. The DFS/BFS body is the "paint this region" subroutine.
- Two ways to never recount a cell: a `boolean[][] vis`, or **sinking** (`grid[r][c] = 0`). Sinking saves the `vis` array and mutates input. A separate `vis` preserves input.
- Why sinking is not always legal: the caller may need the original grid; some problems use `0` as a real value you must not overwrite (flood fill, 01-matrix). For pure `0/1` island counting, sinking is the common trick.
- Problem 18 takes this exact outer loop and, instead of `count++`, serialises the DFS path into a `Set<String>`.

**Example**
```text
grid =
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1

three islands → 3
```

Second example (naive "count every 1" would say 6):
```text
1 1 1
1 0 0
1 0 1   → 2   (bottom-right is its own island)
```

### How to Think About the Problem

- What should I notice first? "Count regions of 1s" is component counting on a **grid graph**. You do not get an adj list; you generate neighbours from `(r,c)` plus a `dirs` array.
- Which representation? Implicit graph. Vertex id can be `r * m + c` if you ever need a 1-D `vis`, but a 2-D `vis` is clearer.
- Counting / searching / ordering / minimizing → which mental model? **Counting** starts. Same as provinces, different neighbour function.
- Which traversal is natural? DFS is the smallest wrapper. BFS is identical and safer on huge grids (no recursion).
- **Clue → Pattern:** *grid of 0/1 + count blobs → outer loop over unvisited 1s, flood each blob once.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: from every 1-cell, BFS the island, hash the set of
cells; unique sets = answer. Each island of size k is
rediscovered k times. O((n·m)²)
        ↓
Observation: after you flood an island, none of its cells
should ever start a new flood. Mark them.
        ↓
Optimal: one flood per island. Each cell entered at most
once. O(n·m)
```

### Brute Force Approach

- Basic idea: for every cell that is `1`, run a BFS that collects the coordinates of its island into a sorted list, then insert `list.toString()` into a `HashSet`. Return the set size.
- Why it works: 4-connectedness is an equivalence relation on the `1`-cells. The set of cells in an island is a unique identifier, so duplicates collapse.

```java
import java.util.*;

class ConnectedComponentsInMatrixBrute {
    private static final int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int countComponents(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        Set<String> unique = new HashSet<>();
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] != 1) continue;
                boolean[][] vis = new boolean[n][m];
                List<int[]> cells = new ArrayList<>();
                ArrayDeque<int[]> q = new ArrayDeque<>();
                q.offer(new int[]{i, j});
                vis[i][j] = true;
                while (!q.isEmpty()) {
                    int[] cur = q.poll();
                    cells.add(cur);
                    for (int[] d : dirs) {
                        int nr = cur[0] + d[0], nc = cur[1] + d[1];
                        boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                        if (in && !vis[nr][nc] && grid[nr][nc] == 1) {
                            vis[nr][nc] = true;
                            q.offer(new int[]{nr, nc});
                        }
                    }
                }
                cells.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
                unique.add(Arrays.deepToString(cells.toArray()));
            }
        }
        return unique.size();
    }
}
```

**Time Complexity Calculation:**
Up to `N = n·m` starts. Each BFS walks `O(N)` cells in the worst case (one giant island). Total `O(N²)`. Sorting the cell list per start is `O(N log N)` and is absorbed.

**Space Complexity Calculation:**
A fresh `vis[n][m]` per start in the code above is `O(N)` (reallocated). The `HashSet` holds up to `N` island encodings of size `O(N)` in the worst case of `N` singleton islands (`O(N)` total) or one giant island encoded `N` times (`O(N²)`).

**Why can this be improved?**
The island of a cell does not change. A global mark (visited or sink) means each cell is flooded once, not once per member.

Naive idea that **fails**: `for each 1: count++` without flooding. That counts cells, not components. Naive idea that **infinite-loops**: DFS without marking, because a 1 looks at its neighbour 1 which looks back.

### Optimal Approach

The structure being exploited is an **unweighted 4-neighbour grid**: components of `1`s are exactly the islands.

**Core Observation**
You need one flood per island. The flood's only job is to mark every cell of that island so the outer loop never starts there again.

**Pattern Identification**
```text
count = 0
for every cell (i,j):
    if it is a 1 and not yet marked:
        count++
        dfs/bfs to mark the whole region
return count
```
This wrapper is what problem 18 reuses. The mark-and-walk body is what problems 10, 14, 15 reuse without the counter.

**Step-by-Step Intuition**
1. `dirs = {{-1,0},{1,0},{0,-1},{0,1}}`. Every grid problem in this part starts here.
2. Allocate `vis[n][m]`, or decide to sink.
3. Double loop. On an unmarked `1`: `count++`, then `dfs(i,j)`.
4. `dfs`: mark this cell, then for each dir, if in-bounds and unmarked `1`, recurse.
5. *Invariant: a cell is marked iff it has been assigned to exactly one counted island.*
6. Sinking variant: `grid[r][c] = 0` is the mark. Then `vis` is unnecessary, but the input is gone.

**Dry Run**

```text
1 1 0
1 0 0
0 0 1
```

| Step | vis (by row) | stack | Action |
|---|---|---|---|
| 0 | `000 / 000 / 000` | — | `(0,0)` is 1, unmarked → `count=1`, `dfs(0,0)` |
| 1 | `100 / 000 / 000` | `(0,0)` | mark; try U (oob), D `(1,0)`, L (oob), R `(0,1)` |
| 2 | `100 / 100 / 000` | `(0,0),(1,0)` | `dfs(1,0)`: mark; D is 0, R is 0 |
| 3 | `110 / 100 / 000` | `(0,0),(0,1)` | `dfs(0,1)`: mark; R is 0, D is 0 |
| 4 | `110 / 100 / 000` | — | outer hits `(0,1)`,`(1,0)` already vis; zeros skipped |
| 5 | `110 / 100 / 001` | `(2,2)` | `(2,2)` is 1, unmarked → `count=2`, `dfs(2,2)` paints itself |
| 6 | | — | return `2` |

Sinking dry-run of the same grid: after the first DFS the grid is `0 0 0 / 0 0 0 / 0 0 1`. The second DFS sinks `(2,2)`. Same count, original grid destroyed.

**Why Does It Work?**
4-connectivity is undirected. Marking on entry guarantees each `1` is in exactly one flood. The outer loop finds a representative if and only if that cell's island has never been started. In-bounds plus `grid==1` is the neighbour filter; without the in-bounds check you read off the array and crash.

**Java Code**

```java
import java.util.*;

class ConnectedComponentsInMatrix {
    private static final int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int countComponents(int[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        int n = grid.length, m = grid[0].length;
        boolean[][] vis = new boolean[n][m];
        int count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 1 && !vis[i][j]) {
                    count++;
                    dfs(i, j, grid, vis, n, m);
                }
            }
        }
        return count;
    }

    private void dfs(int r, int c, int[][] grid, boolean[][] vis, int n, int m) {
        vis[r][c] = true;
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
            if (in && !vis[nr][nc] && grid[nr][nc] == 1) {
                dfs(nr, nc, grid, vis, n, m);
            }
        }
    }

    // Same algorithm, mutates grid, O(1) extra besides recursion.
    public int countComponentsSink(int[][] grid) {
        if (grid == null || grid.length == 0) return 0;
        int n = grid.length, m = grid[0].length;
        int count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 1) {
                    count++;
                    sink(i, j, grid, n, m);
                }
            }
        }
        return count;
    }

    private void sink(int r, int c, int[][] grid, int n, int m) {
        grid[r][c] = 0; // mark by destroying; prevents re-entry and infinite recursion
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
            if (in && grid[nr][nc] == 1) {
                sink(nr, nc, grid, n, m);
            }
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each of `N = n·m` cells is considered once in the outer loop. A cell that is `1` is entered by DFS at most once; from there you look at 4 neighbours. Total `O(N + 4N) = O(n·m)`. `E ≈ 4N` on a grid.

**Space Complexity Calculation:**
`vis[n][m]` is `O(N)`. Recursion depth `O(N)` on a snake-like island (worst-case stack). BFS version: `ArrayDeque` of `O(N)`. Sinking drops `vis` to `O(1)` auxiliary besides the call stack.

### Pattern to Remember

```text
Clue: "how many islands / regions / provinces on a grid"
Pattern: outer double-loop + flood unmarked 1s; dirs + in-bounds
Mental model: this wrapper is the skeleton; problem 18 swaps count++ for a shape-hash
```

**Similar problems:** 7 Number of Provinces (same count, matrix-graph), 10 Flood Fill (one flood, no count), 14 Surrounded Regions, 15 Number of Enclaves, 18 Number of Distinct Islands (this DFS, hashed path).

**Interview tip:** Ask "may I mutate the grid?" If yes, sink. If no, `vis`. Either way, write `dirs` and the in-bounds check before the recursion.

## 9. Rotten Oranges

### Problem Understanding

A grid: `0` empty, `1` fresh orange, `2` rotten. Every minute, every 4-adjacent fresh neighbour of a rotten orange becomes rotten. Return the minimum minutes until **no fresh orange remains**, or `-1` if some fresh orange is unreachable from every rotten one.

**Input / Output / Constraints**
- Input: `int[][] grid`, `n × m`, cells in `{0,1,2}`.
- Output: `int` minutes, or `-1`.
- LeetCode 994 Medium. `1 ≤ n, m ≤ 10` on LC; write it as `O(n·m)` anyway — the pattern is used on much larger grids.
- Time = minutes until the **last** fresh orange rots = BFS **level** of that cell.

**Observations**
- This is multi-source BFS. Every rotten orange at `t = 0` is a source. The rotting wavefronts run in parallel.
- Single-source BFS from each rotten orange, then `min` over sources per cell, is correct and `O(R · n · m)`. Multi-source is that algorithm with all sources in the queue together.
- Process **by levels** using `q.size()`. Each level is one minute.
- `fresh` counter: decrement when a `1` becomes `2`. At the end, `fresh > 0` → `-1`.
- Edge: already no fresh → `0` (do not wait for BFS). All fresh, no rotten → queue empty, `fresh > 0` → `-1`. All empty / no fresh → `0`. One cell `[[2]]` → `0`. One cell `[[1]]` → `-1`. One cell `[[0]]` → `0`.

**Example**
```text
t=0       t=1       t=2       t=3       t=4
2 1 1     2 2 1     2 2 2     2 2 2     2 2 2
1 1 0     2 1 0     2 2 0     2 2 0     2 2 0
0 1 1     0 1 1     0 1 1     0 2 1     0 2 2
minutes = 4
```

Second example (blocked, returns `-1`):
```text
2 1 1
0 1 1
1 0 1     the bottom-left 1 never rots → -1
```

### How to Think About the Problem

- What should I notice first? All rotten oranges act **at the same time**. That is the definition of multi-source BFS, not "pick one rotten and recurse".
- Which representation? Grid graph. Neighbours via `dirs`. Empty cells are missing vertices — do not enqueue `0`.
- Counting / searching / ordering / minimizing → which mental model? **Minimizing time**, which on an unweighted grid is BFS distance. The answer is the max distance among cells that started as `1`.
- Which traversal is natural? BFS. DFS would give *a* time, not the minimum, unless you DFS from every source and take mins — and even then you fight the clock.
- **Clue → Pattern:** *simultaneous infection / melting / fire spread → multi-source BFS, answer = last level.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: each minute, scan the whole grid, snapshot the
rotten cells, rot their neighbours. Repeat up to n·m minutes.
O((n·m)²)
        ↓
Observation: the minute a cell rots is its shortest grid-
distance to any originally-rotten cell. Shortest unweighted
distance is BFS.
        ↓
Single-source BFS from each rotten, then min: correct,
O(R·n·m). Still redundant overlapping waves.
        ↓
Optimal: put EVERY rotten cell in the queue at minute 0.
One BFS. O(n·m)
```

### Brute Force Approach

- Basic idea: simulate the statement. While something changed: collect positions of oranges that are currently `2`, rot their 4-neighbours of value `1` into a `newly` list (so this minute is simultaneous), write them to `2`, increment minutes. Stop when a pass changes nothing. Then if any `1` remains, `-1`.
- Why it works: it is a direct transcription of the process. Each pass is one simultaneous minute because you only rot neighbours of oranges that were already rotten *before* this pass (snapshot).

```java
import java.util.*;

class RottenOrangesBrute {
    private static final int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int orangesRotting(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        int minutes = 0;
        while (true) {
            List<int[]> newly = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < m; j++) {
                    if (grid[i][j] != 2) continue;
                    for (int[] d : dirs) {
                        int nr = i + d[0], nc = j + d[1];
                        boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                        if (in && grid[nr][nc] == 1) newly.add(new int[]{nr, nc});
                    }
                }
            }
            if (newly.isEmpty()) break;
            for (int[] p : newly) grid[p[0]][p[1]] = 2;
            minutes++;
        }
        for (int[] row : grid) {
            for (int v : row) if (v == 1) return -1;
        }
        return minutes;
    }
}
```

**Time Complexity Calculation:**
At most `N = n·m` successful minutes (one new orange per minute in the worst chain). Each minute scans the whole grid and 4 neighbours → `O(N)` per minute. Total `O(N²)`.

**Space Complexity Calculation:**
The `newly` list is `O(N)`. If you snapshot the whole grid instead, `O(N)` extra.

**Why can this be improved?**
You rescan cells that have been rotten for a long time, every minute. BFS already knows that only the oranges that rotted **last minute** can infect anyone this minute — that is exactly the current queue.

Why single-source BFS from each rotten is the wrong *final* answer without a min: BFS from the left `2` in `[2,1,1,1,2]` reports that the last `1` takes 3 minutes. It actually rots in 2, from the right. Fixing it by running `R` BFS's and taking per-cell minima works, but multi-source does the minima for free.

### Optimal Approach

The structure being exploited is an **unweighted grid** with **simultaneous sources**: min time to infect a cell is BFS distance to the nearest source.

**Core Observation**
Put every initial `2` in the queue with time `0`. The first time a `1` is reached, that time is optimal. The answer is the maximum such time. If a `1` is never reached, `-1`.

**Pattern Identification**
Multi-source BFS. Same skeleton as problem 13 (distance to nearest 0/1), except here you return a scalar (max level) plus a leftover-fresh check, not a distance field.

**Step-by-Step Intuition**
1. Scan once: count `fresh`, enqueue every `(i,j)` that is `2`.
2. If `fresh == 0`, return `0` immediately.
3. `minutes = 0`. While the queue is not empty: `size = q.size()`. That many cells form the current minute.
4. For each cell in this level, try 4 dirs. A neighbour `1` becomes `2`, `fresh--`, enqueue it.
5. After finishing a level that actually rotted someone, `minutes++`. (Storing time in the queue pair and taking max also works.)
6. *Invariant: every orange in the queue at the start of level t has been rotten for exactly t minutes, and no fresh orange that could have rotted earlier is still a 1.*
7. After BFS, `fresh == 0 ? minutes : -1`.

Mark on enqueue (`grid[nr][nc] = 2`), not on dequeue. Otherwise the same fresh orange is pushed by two rotten neighbours and processed twice.

**Dry Run**

`grid = [[2,1,1],[1,1,0],[0,1,1]]`. `fresh = 6`. Queue starts with `(0,0)`.

| Step | queue (after) | fresh | minutes | Action |
|---|---|---|---|---|
| 0 | `(0,0)` | 6 | 0 | seed all 2s |
| 1 | `(0,1),(1,0)` | 4 | 1 | level size=1; rot right and down of `(0,0)` |
| 2 | `(0,2),(1,1)` | 2 | 2 | `(0,1)` rots `(0,2)` and `(1,1)`; `(1,0)` sees `(1,1)` already 2, `(2,0)` empty |
| 3 | `(2,1)` | 1 | 3 | `(0,2)` no fresh neighbour; `(1,1)` rots `(2,1)` (`(1,2)` empty) |
| 4 | `(2,2)` | 0 | 4 | `(2,1)` rots `(2,2)` |
| 5 | empty | 0 | 4 | queue drains, `fresh==0`, return `4` |

Blocked example `[[2,1,1],[0,1,1],[1,0,1]]`: BFS never reaches `(2,0)`. `fresh` ends at 1. Return `-1`.

**Why Does It Work?**
BFS on an unweighted graph yields shortest paths. Seeding all sources at distance 0 makes the distance of a cell equal to min time until some rotten wavefront hits it. Processing by `q.size()` groups cells that rot in the same minute so the clock ticks once per wavefront. Leftover `1`s are vertices in a different component of the "orange subgraph" and can never rot.

**Java Code**

```java
import java.util.*;

class RottenOranges {
    public int orangesRotting(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        ArrayDeque<int[]> q = new ArrayDeque<>();
        int fresh = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 2) q.offer(new int[]{i, j});
                else if (grid[i][j] == 1) fresh++;
            }
        }
        if (fresh == 0) return 0;

        int minutes = 0;
        while (!q.isEmpty()) {
            int size = q.size();
            boolean rottedThisMinute = false;
            for (int s = 0; s < size; s++) {
                int[] cur = q.poll();
                for (int[] d : dirs) {
                    int nr = cur[0] + d[0], nc = cur[1] + d[1];
                    boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                    if (!in || grid[nr][nc] != 1) continue;
                    grid[nr][nc] = 2; // mark on enqueue so two neighbours don't both push it
                    fresh--;
                    q.offer(new int[]{nr, nc});
                    rottedThisMinute = true;
                }
            }
            if (rottedThisMinute) minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each cell is enqueued at most once (a `1` becomes `2` and never reverts). Each dequeued cell looks at 4 neighbours. `O(N + 4N) = O(n·m)`. Initial scan is the same order.

**Space Complexity Calculation:**
Queue holds `O(N)` cells in a grid of all oranges. `dirs` is `O(1)`. If the judge forbids mutating, a `boolean[][] vis` is another `O(N)`.

### Pattern to Remember

```text
Clue: "every minute, all X infect their neighbours; time until last"
Pattern: multi-source BFS, clock = level, leftover uninfected → -1
Mental model: the queue IS the current wavefront; q.size() is one minute
```

**Similar problems:** 13 Distance of Nearest Cell Having 1 (same multi-source, return the field not the max), 14 Surrounded Regions and 15 Number of Enclaves (boundary as sources), 16 Word Ladder I (BFS level = number of transformations).

**Interview tip:** First line in your head: "if I BFS from one rotten orange I get the wrong clock — seed them all." Then handle `fresh == 0` before the loop so you return `0` not `-1` or `minutes` of an empty process.

## 10. Flood Fill Algorithm

### Problem Understanding

An `image` grid of colours. Starting at `(sr, sc)`, change every 4-connected cell that currently has the **same colour as the start cell** to `newColor`. Return the image.

**Input / Output / Constraints**
- Input: `int[][] image`, `sr`, `sc`, `newColor`. LeetCode 733 Medium.
- Output: the same grid (in-place is allowed) with one region recolored.
- `1 ≤ n, m ≤ 50` on LC. Colours are non-negative integers.
- 4-direction. The cell at `(sr,sc)` belongs to the region (even if it has no neighbours).

**Observations**
- This is **one** component, not a count. Same DFS body as problem 8, no outer double-loop — you are given the seed.
- If `image[sr][sc] == newColor`, you must return immediately. Recoloring a region to the colour it already has, without a separate `vis`, is infinite recursion: a cell matches `oldColor`, you "paint" it to `newColor` (no-op), you walk to a neighbour of the same colour, repeat, and you never mark anything.
- Change the cell **before** recursing (or mark `vis` before). If you recurse first and paint after, two neighbours can both enter the same cell while it still looks like `oldColor`.
- Diagonal cells with the old colour are **not** in the region.

**Example**
```text
image =          start (1,1), old=1, newColor=2
1 1 1            2 2 2
1 1 0     →      2 2 0
1 0 1            2 0 1

(2,2) stays 1: diagonal, not 4-connected to the seed through 1s.
```

Second example (the trap): `image = [[0,0,0]]`, `sr=0`, `sc=0`, `newColor=0`. Must return `[[0,0,0]]` without hanging.

### How to Think About the Problem

- What should I notice first? You are not counting islands. You are painting the island that contains `(sr,sc)`, and only if its colour differs from the target.
- Which representation? Grid. `dirs` + in-bounds. The "is a neighbour" predicate is `image[nr][nc] == oldColor`.
- Counting / searching / ordering / minimizing → which mental model? Searching a single connected region, then writing a new value.
- Which traversal is natural? DFS is the fewest lines. BFS is the same paint, iterative.
- **Clue → Pattern:** *recolor the region containing a seed → DFS/BFS from the seed, guard start==newColor.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: BFS/DFS with an extra vis[][], collect all cells
of the region, then paint them in a second pass. Correct,
extra O(n·m) vis plus a list.
        ↓
Observation: painting a cell to newColor is itself a mark,
provided newColor != oldColor. vis is redundant.
        ↓
Optimal: if oldColor == newColor return; else DFS, paint
before recurse. O(size of the region)
```

### Brute Force Approach

- Basic idea: snapshot `oldColor`. BFS from the seed with a `vis` matrix, collect every reachable cell of `oldColor` into a list, then write `newColor` over the list. The `oldColor == newColor` case is automatically safe because you never recurse on colour-equality with a mutating paint — you use `vis`.
- Why it works: `vis` is the mark, independent of colour. Collection-then-write means the grid does not change during the search, so the region is exactly the 4-connected component of `oldColor`.

```java
import java.util.*;

class FloodFillBrute {
    private static final int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int[][] floodFill(int[][] image, int sr, int sc, int newColor) {
        int n = image.length, m = image[0].length;
        int oldColor = image[sr][sc];
        boolean[][] vis = new boolean[n][m];
        List<int[]> cells = new ArrayList<>();
        ArrayDeque<int[]> q = new ArrayDeque<>();
        q.offer(new int[]{sr, sc});
        vis[sr][sc] = true;
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            cells.add(cur);
            for (int[] d : dirs) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (in && !vis[nr][nc] && image[nr][nc] == oldColor) {
                    vis[nr][nc] = true;
                    q.offer(new int[]{nr, nc});
                }
            }
        }
        for (int[] p : cells) image[p[0]][p[1]] = newColor;
        return image;
    }
}
```

**Time Complexity Calculation:**
Each cell of the region is enqueued once; 4 neighbour checks. `O(n·m)` worst case (the region is the whole image). The second pass is linear in the region size.

**Space Complexity Calculation:**
`vis[n][m]`, the list, and the queue: `O(n·m)`.

**Why can this be improved?**
`vis` and the list exist only because you refused to use the colour itself as a mark. When `newColor != oldColor`, painting *is* marking. Drop both extras. The `==` guard is what makes that legal.

### Optimal Approach

The structure being exploited is a **4-connected grid region** identified by a single seed colour.

**Core Observation**
The region is `{ cells 4-reachable from (sr,sc) along oldColor }`. Painting on entry is a visited mark **if and only if** `newColor != oldColor`. When they are equal, there is nothing to do — and there is no mark — so return.

**Pattern Identification**
Grid DFS from a seed. Same body as problem 8's flood; driver is one call, not an outer count loop.

**Step-by-Step Intuition**
1. `oldColor = image[sr][sc]`. If `oldColor == newColor`, return `image`.
2. `dfs(sr, sc)`: write `newColor` into this cell **now**.
3. For each of 4 dirs: in-bounds and still `oldColor` → recurse.
4. *Invariant: a cell equals newColor inside the DFS iff it has already been accepted into the region. A cell still equal to oldColor is unvisited.*
5. Do not compare against `newColor` in the neighbour check — compare against `oldColor`. A neighbour that is some third colour is a wall.

**Dry Run**

`image = [[1,1,1],[1,1,0],[1,0,1]]`, `(sr,sc)=(1,1)`, `newColor=2`, `oldColor=1`.

| Step | image (rows) | stack | Action |
|---|---|---|---|
| 0 | `1 1 1 / 1 1 0 / 1 0 1` | — | `old != new`, `dfs(1,1)` |
| 1 | `1 1 1 / 1 2 0 / 1 0 1` | `(1,1)` | paint; U `(0,1)`, D `(2,1)=0` skip, L `(1,0)`, R `(1,2)=0` skip |
| 2 | `1 2 1 / 1 2 0 / 1 0 1` | `(1,1),(0,1)` | `dfs(0,1)` paints; U oob, L `(0,0)`, R `(0,2)` |
| 3 | `2 2 1 / 1 2 0 / 1 0 1` | …`(0,0)` | `dfs(0,0)` paints; D `(1,0)` |
| 4 | `2 2 2 / 1 2 0 / 1 0 1` | …`(0,2)` | `dfs(0,2)` paints; D is 0 |
| 5 | `2 2 2 / 2 2 0 / 1 0 1` | …`(1,0)` | `dfs(1,0)` paints; D `(2,0)` |
| 6 | `2 2 2 / 2 2 0 / 2 0 1` | …`(2,0)` | `dfs(2,0)` paints; R is 0, D oob |
| 7 | same | empty | `(2,2)` was never entered (corner 1, diagonal). Return |

Same-colour trap: `oldColor == newColor` → hit the guard, zero DFS calls.

**Why Does It Work?**
You walk exactly the connected component of `oldColor` containing the seed, because the neighbour predicate is `== oldColor` and 4-dir. Painting first removes the cell from that predicate, so each cell is expanded once. The early return is not an optimisation; it is correctness for the in-place colour-as-visited encoding. Without it the predicate `== oldColor` stays true forever.

**Java Code**

```java
import java.util.*;

class FloodFill {
    public int[][] floodFill(int[][] image, int sr, int sc, int newColor) {
        int oldColor = image[sr][sc];
        if (oldColor == newColor) return image; // without this, DFS never bottoms out
        dfs(image, sr, sc, oldColor, newColor);
        return image;
    }

    private void dfs(int[][] image, int r, int c, int oldColor, int newColor) {
        int n = image.length, m = image[0].length;
        image[r][c] = newColor; // paint BEFORE recurse: this cell is now marked
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
            if (in && image[nr][nc] == oldColor) {
                dfs(image, nr, nc, oldColor, newColor);
            }
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each cell of the filled region is written once and examines 4 neighbours. Worst case the region is the whole image: `O(n·m)`. Cells outside the region are never entered.

**Space Complexity Calculation:**
Recursion depth `O(n·m)` on a snake region. No `vis`. BFS version uses `ArrayDeque` of `O(n·m)` and the same early return.

### Pattern to Remember

```text
Clue: "recolor / replace the region containing (sr,sc)"
Pattern: DFS/BFS from the seed; abort if oldColor == newColor; paint on entry
Mental model: problem 8's flood body, one seed, colour is the visited bit
```

**Similar problems:** 8 Connected Components in a Matrix (many floods + count), 14 Surrounded Regions (flood from boundary `O`s), 15 Number of Enclaves.

**Interview tip:** Write the `oldColor == newColor` return before any DFS. Then write `dirs`. Then paint-on-entry. That order is the difference between a hang and an accepted run.

## 11. Cycle Detection in an Undirected Graph (BFS)

### Problem Understanding

Undirected graph, `V` vertices, adjacency list. Return whether **any** cycle exists. A cycle is a path of length ≥ 1 (self-loop) or ≥ 2 (parallel edges) or ≥ 3 (simple cycle) that returns to its start without reusing the same undirected edge as a step back.

takeUforward: detect-cycle-undirected-bfs. Hard conceptually, not in code volume.

**Input / Output / Constraints**
- Input: `int V`, `List<List<Integer>> adj` (0-indexed). Graph may be disconnected. May contain self-loops and parallel edges.
- Output: `boolean`.
- If the input is an edge list, build an undirected adj list first (`add` both ways).

**Observations**
- A **plain visited array is not enough**. The neighbour you came from is already visited, and that is the undirected edge you walked, not a cycle.
- You need the **parent**. Queue stores `(node, parent)`. A visited neighbour `≠ parent` is a second way to that node → cycle.
- Self-loop: `adj[u]` contains `u`. `vis[u]` is true, parent is not `u` (it is the predecessor, or `-1` at the source) → cycle.
- Parallel edges `u-v` twice: from `u` you mark `v` on the first copy; the second copy sees `v` visited and `v ≠ parent` → cycle of length 2. Correct for a multigraph. On a simple graph the two list entries `u→v` and `v→u` are the same edge; parent filters that.
- Disconnected: outer loop `for i in 0..V-1` if `!vis[i]`, BFS `i`. A cycle in any component is a cycle in the graph.

**Example** (has a cycle)
```text
V = 5
0 — 1 — 2
    |  /
    3     4

edges: 0-1, 1-2, 2-3, 3-1, 4 isolated
cycle 1-2-3-1 → true
```

Second example (no cycle — a forest):
```text
0 — 1 — 2      3 — 4     → false
```

Self-loop: `adj[0] = [0]` → `true`.

### How to Think About the Problem

- What should I notice first? Undirected. The back-pointer to parent looks like "visited neighbour" if you are careless. That is the whole trick.
- Which representation? Adj list. 0-index. If you are given edges, add both directions once per undirected edge.
- Counting / searching / ordering / minimizing → which mental model? **Searching** for a back-edge. Not counting, not shortest path (even though you use BFS).
- Which traversal is natural? BFS with parent in the pair. DFS with parent as an argument is problem 12 — same theorem, different container.
- **Clue → Pattern:** *undirected + "is there a cycle" → BFS/DFS + parent; visited ∧ not-parent ⇒ cycle.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every edge {u,v}, temporarily delete it and
DFS/BFS to ask whether v is still reachable from u. If yes,
that edge was a chord / back-edge. O(E·(V+E))
        ↓
Observation: you do not need to delete edges. During one
traversal, the unique tree-edge into a node is the parent.
Any other edge into a visited node closes a cycle.
        ↓
Optimal: one BFS per component, store parent in the queue.
O(V+E)
```

### Brute Force Approach

- Basic idea: materialise the undirected edge list (each `{min,max}` once). For each edge `{u,v}`, build a graph without it, BFS from `u`, see if `v` is reached. If yes, there is an alternate path, hence a cycle. Also return true immediately on a self-loop.
- Why it works: in an undirected graph, a cycle exists iff some edge is not a bridge of its component iff its endpoints remain connected after its removal. Checking every edge finds any such non-bridge.

```java
import java.util.*;

class CycleDetectionUndirectedBfsBrute {
    public boolean isCycle(int V, List<List<Integer>> adj) {
        List<int[]> edges = new ArrayList<>();
        for (int u = 0; u < V; u++) {
            for (int v : adj.get(u)) {
                if (v == u) return true; // self-loop
                if (u < v) edges.add(new int[]{u, v});
            }
        }
        for (int[] skip : edges) {
            if (connectedWithout(V, adj, skip[0], skip[1])) return true;
        }
        return false;
    }

    private boolean connectedWithout(int V, List<List<Integer>> adj, int a, int b) {
        boolean[] vis = new boolean[V];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.offer(a);
        vis[a] = true;
        while (!q.isEmpty()) {
            int u = q.poll();
            if (u == b) return true;
            for (int v : adj.get(u)) {
                if ((u == a && v == b) || (u == b && v == a)) continue;
                if (!vis[v]) {
                    vis[v] = true;
                    q.offer(v);
                }
            }
        }
        return false;
    }
}
```

**Time Complexity Calculation:**
Up to `E` candidate edges. Each check is a BFS `O(V+E)`. Total `O(E(V+E))`. Fine for tiny graphs, not for `V,E ~ 10^5`.

**Space Complexity Calculation:**
`vis[V]` and a queue `O(V)` per check. Edge list `O(E)`.

**Why can this be improved?**
Deleting one edge at a time rediscovers the same component over and over. A single spanning forest already classifies every edge as tree-edge or back-edge. Parent is the tree-edge.

Naive idea that **fails**: `if (vis[nei]) return true` with no parent. On `0-1` the BFS visits `0`, looks at `1`, later from `1` looks at `0` which is visited, and reports a cycle on a single edge. That is the bug this problem exists to teach.

### Optimal Approach

The structure being exploited is an **undirected** (possibly disconnected, possibly multi) graph: the BFS forest's non-tree edges are exactly the cycles.

**Core Observation**
When BFS at `u` sees a neighbour `v`:
- `!vis[v]` → tree edge, set parent of `v` to `u`, enqueue.
- `vis[v] && v == parent[u]` → the edge you walked in on. Ignore.
- `vis[v] && v != parent[u]` → back-edge. Cycle.

**Pattern Identification**
BFS with state `(node, parent)` in the queue. Outer loop over components. Mark visited **on enqueue**.

**Step-by-Step Intuition**
1. `vis[V]`. For each `i` unvisited, run `bfs(i)`.
2. `bfs(start)`: mark start, enqueue `(start, -1)`.
3. Pop `(node, parent)`. For each `nei` in `adj[node]`:
   - unvisited → mark, enqueue `(nei, node)`;
   - visited and `nei != parent` → return true.
4. *Invariant: vis[x] means x is in the BFS tree of this component (or a previous one). The unique BFS-tree parent of a non-root is the pair's second field. Any extra edge to a vis node is a cycle.*
5. If every component's BFS returns false, the graph is a forest.

**Dry Run**

Cycle graph: `adj = [[1],[0,2,3],[1,3],[1,2],[]]` (the picture above, 4 isolated).

| Step | queue (node,parent) | vis | Action |
|---|---|---|---|
| 0 | `(0,-1)` | `[T,F,F,F,F]` | start component 0 |
| 1 | `(1,0)` | `[T,T,F,F,F]` | from 0, nei 1 unseen |
| 2 | `(2,1),(3,1)` | `[T,T,T,T,F]` | from 1: 0 is parent (skip), 2 and 3 unseen |
| 3 | `(3,1)` | same | from 2: nei 1 is parent, nei 3 is vis and `3≠1` → **cycle** |

Stop. Return `true`. (`3` was marked when pushed from `1`, so at `2` you see `vis[3]` and `3 != parent 1`.)

No-cycle graph: `0-1-2`, `3-4`.

| Step | queue | vis | Action |
|---|---|---|---|
| 0 | `(0,-1)` | `T F F F F` | |
| 1 | `(1,0)` | `T T F F F` | |
| 2 | `(2,1)` | `T T T F F` | from 1, nei 0 = parent, skip |
| 3 | empty | | from 2, nei 1 = parent, skip. Component done |
| 4 | `(3,-1)` | `T T T T F` | new component |
| 5 | `(4,3)` | `T T T T T` | |
| 6 | empty | all T | from 4, nei 3 = parent. Return `false` |

**Why Does It Work?**
BFS builds a spanning tree of the component. In an undirected graph a cycle exists iff the component is not a tree iff there is an edge that is not a tree edge. The parent test identifies the unique tree edge used to enter `node`. Any other visited neighbour is incident via a non-tree edge. Disconnected graphs are handled because a cycle cannot span components; you only need to find one component that fails the tree test.

**Java Code**

```java
import java.util.*;

class CycleDetectionUndirectedBfs {
    public boolean isCycle(int V, List<List<Integer>> adj) {
        boolean[] vis = new boolean[V];
        for (int i = 0; i < V; i++) {
            if (!vis[i] && bfs(i, adj, vis)) return true;
        }
        return false;
    }

    public boolean isCycle(int V, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return isCycle(V, adj);
    }

    private boolean bfs(int start, List<List<Integer>> adj, boolean[] vis) {
        ArrayDeque<int[]> q = new ArrayDeque<>();
        vis[start] = true;
        q.offer(new int[]{start, -1}); // (node, parent)
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int node = cur[0], parent = cur[1];
            for (int nei : adj.get(node)) {
                if (!vis[nei]) {
                    vis[nei] = true; // mark on enqueue
                    q.offer(new int[]{nei, node});
                } else if (nei != parent) {
                    return true; // visited non-parent neighbour = undirected cycle
                }
            }
        }
        return false;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each vertex is enqueued once. Each adjacency-list entry is examined once. `O(V + E)`. Building from an edge list is `O(V + E)` as well.

**Space Complexity Calculation:**
`vis[V]`, queue `O(V)`, and `O(V + E)` if you build `adj`. Pair objects on the queue: `O(V)`.

### Pattern to Remember

```text
Clue: "undirected graph, detect cycle"
Pattern: BFS with (node, parent) in the queue; vis && nei != parent → true
Mental model: the parent is the edge you walked; everything else visited is a second path
```

**Similar problems:** 12 same question with DFS (pick one in an interview, know both), 20 Cycle Detection in a Directed Graph (parent is the wrong tool — you need recursion-stack / colour), 19 Bipartite Graph (odd cycle iff not 2-colourable; BFS colouring).

**Interview tip:** Draw a single edge `0-1` and show that `vis`-only BFS false-positives. Then put `parent` in the pair. Then mention the outer loop so a cycle in component 3 is not missed.

## 12. Detect a Cycle in an Undirected Graph (DFS)

### Problem Understanding

Same question as problem 11: undirected graph, possibly disconnected, return whether a cycle exists. This time the walker is DFS. A **back-edge** is an edge to a visited vertex that is not your parent.

takeUforward: detect-cycle-undirected-dfs.

**Input / Output / Constraints**
- Input: `int V`, `List<List<Integer>> adj`, 0-indexed. Same as 11.
- Output: `boolean`.
- Same self-loop / parallel-edge / disconnected rules.

**Observations**
- The theorem does not change: undirected cycle ⇔ a visited neighbour other than parent.
- Parent is a method argument, not a queue pair. `dfs(node, parent)`.
- Recursion stack is the current root-to-node path in the DFS tree. You do **not** need an extra "in-stack" array (that is the *directed* cycle test in problem 20). Visited + parent is sufficient because every visited node in this component is already in the DFS forest, and undirected back-edges always close a cycle.
- Compare with 11: same outer loop, same mark-on-entry, different container.

**Example** — reuse 11.

Has a cycle:
```text
0 — 1 — 2
    |  /
    3     4          → true (back-edge 2-3 if 3 was already visited via 1)
```

No cycle: `0-1-2` plus `3-4` → `false`.

### How to Think About the Problem

- What should I notice first? You already know the parent trick from 11. DFS asks the same question at the moment you look at a neighbour, on the way down, not as you pop a queue.
- Which representation? Same adj list.
- Counting / searching / ordering / minimizing → which mental model? Searching for one back-edge.
- Which traversal is natural? DFS if you are already in a recursive template; BFS if you want an explicit parent and no call-stack risk.
- **Clue → Pattern:** *undirected cycle + DFS → dfs(node, parent); vis[nei] && nei != parent ⇒ cycle.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: same as 11 — delete each edge, check connectivity.
O(E·(V+E))
        ↓
Observation: DFS tree + parent classifies tree-edges vs
back-edges in one pass.
        ↓
Optimal: dfs(node, parent) per component. O(V+E)
```

### Brute Force Approach

Identical brute as problem 11 (edge-deletion connectivity). Use that code. The improvement path is "one DFS forest instead of E searches", not "DFS instead of BFS".

- Basic idea: for every undirected edge, hide it, BFS/DFS to see if its endpoints are still connected. A yes means a cycle. Self-loop is a cycle with no search.
- Why it works: a cycle exists iff some edge is not a bridge.

```java
import java.util.*;

class CycleDetectionUndirectedDfsBrute {
    public boolean isCycle(int V, List<List<Integer>> adj) {
        // identical to CycleDetectionUndirectedBfsBrute.isCycle
        List<int[]> edges = new ArrayList<>();
        for (int u = 0; u < V; u++) {
            for (int v : adj.get(u)) {
                if (v == u) return true;
                if (u < v) edges.add(new int[]{u, v});
            }
        }
        for (int[] skip : edges) {
            if (reachableWithout(V, adj, skip[0], skip[1])) return true;
        }
        return false;
    }

    private boolean reachableWithout(int V, List<List<Integer>> adj, int a, int b) {
        boolean[] vis = new boolean[V];
        return dfsHide(a, adj, vis, a, b);
    }

    private boolean dfsHide(int u, List<List<Integer>> adj, boolean[] vis, int a, int b) {
        if (u == b) return true;
        vis[u] = true;
        for (int v : adj.get(u)) {
            if ((u == a && v == b) || (u == b && v == a)) continue;
            if (!vis[v] && dfsHide(v, adj, vis, a, b)) return true;
        }
        return false;
    }
}
```

**Time Complexity Calculation:**
`O(E(V+E))` — one DFS per edge.

**Space Complexity Calculation:**
`O(V)` vis plus recursion.

**Why can this be improved?**
Same as 11. Switching BFS to DFS does not reduce the brute; dropping the per-edge restart does.

### Optimal Approach

The structure being exploited is again an **undirected** graph; the DFS forest is a spanning forest, and any back-edge is a cycle.

**Core Observation**
`dfs(u, p)`: for each neighbour `v` of `u`
- `v == p` → the undirected parent edge. Skip.
- `vis[v]` → `v` is an ancestor (or another DFS-tree node in this undirected component). Edge `u-v` closes a cycle. Return true.
- otherwise mark `v` and recurse `dfs(v, u)`. If that call finds a cycle, propagate true.

**Pattern Identification**
DFS with parent. Outer loop for disconnected graphs. Mark visited on entry, before the neighbour loop.

**Step-by-Step Intuition**
1. `vis[V] = false`. `for i in 0..V-1`: if unvisited and `dfs(i, -1)` then true.
2. `dfs(node, parent)`: `vis[node] = true`.
3. For `nei` of `node`: skip parent; if `vis[nei]` return true; else if `dfs(nei, node)` return true.
4. *Invariant: vis[x] means x is in the current DFS forest. The call-stack path from the component root to node is a tree path. A visited non-parent neighbour is connected to node by an extra edge, hence a cycle.*
5. Return false if the neighbour loop finds nothing.

**BFS vs DFS**

| | BFS (11) | DFS (12) |
|---|---|---|
| parent | pair in `ArrayDeque` | argument |
| cycle test | `vis[nei] && nei != parent` | identical |
| when you see the back-edge | at the closer endpoint, by layers | at the deeper endpoint, on the way down |
| extra "in-stack" array? | no | **no** (that is directed) |
| space | `O(V)` queue | `O(V)` recursion |
| disconnected | outer loop | outer loop |
| pick in an interview | either; mention the other |

**Dry Run**

Same cycle graph `adj = [[1],[0,2,3],[1,3],[1,2],[]]`.

| Step | call stack (node,parent) | vis | Action |
|---|---|---|---|
| 0 | `(0,-1)` | `[T,F,F,F,F]` | outer starts 0 |
| 1 | `(0,-1),(1,0)` | `[T,T,F,F,F]` | from 0 into 1 |
| 2 | `…(2,1)` | `[T,T,T,F,F]` | from 1, skip parent 0, go to 2 |
| 3 | `…(2,1),(3,2)` | `[T,T,T,T,F]` | from 2, skip 1, go to 3 |
| 4 | `…(3,2)` | same | from 3: nei 1 is vis and `1 != parent 2` → **cycle** |

No-cycle `0-1-2`, `3-4`:

| Step | call stack | vis | Action |
|---|---|---|---|
| 0–2 | `(0,-1)-(1,0)-(2,1)` | first 3 true | each node's other neighbour is the parent |
| 3 | empty, outer `i=3` | | `dfs(3,-1)` → `dfs(4,3)`; 4's nei is parent |
| 4 | | all true | return `false` |

Self-loop at 0: `dfs(0,-1)` sees `nei=0`, `vis[0]` already true, `0 != -1` → true.

**Why Does It Work?**
DFS grows a spanning tree by the parent pointers. In undirected graphs, the only non-tree edges DFS can see are back-edges to already-visited vertices, and every such edge completes a unique cycle with the tree path. You do not need a colour/recursion-stack set because there are no "forward / cross" edges with a different meaning — those distinctions exist in directed graphs (problem 20). The outer loop covers components that are not reachable from vertex 0.

**Java Code**

```java
import java.util.*;

class CycleDetectionUndirectedDfs {
    public boolean isCycle(int V, List<List<Integer>> adj) {
        boolean[] vis = new boolean[V];
        for (int i = 0; i < V; i++) {
            if (!vis[i] && dfs(i, -1, adj, vis)) return true;
        }
        return false;
    }

    public boolean isCycle(int V, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return isCycle(V, adj);
    }

    private boolean dfs(int node, int parent, List<List<Integer>> adj, boolean[] vis) {
        vis[node] = true;
        for (int nei : adj.get(node)) {
            if (nei == parent) continue;
            if (vis[nei]) return true; // back-edge to a visited non-parent
            if (dfs(nei, node, adj, vis)) return true;
        }
        return false;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Each vertex is entered once. Each edge is examined twice (once from each end) and the parent skip handles one of those. `O(V + E)`.

**Space Complexity Calculation:**
`vis[V]` plus recursion depth `O(V)` on a long path. Adj list `O(V + E)` if built from edges. No queue.

### Pattern to Remember

```text
Clue: "undirected cycle, recursive walk"
Pattern: dfs(node, parent); skip parent; vis[nei] ⇒ cycle
Mental model: same theorem as BFS; parent on the stack instead of in the queue
```

**Similar problems:** 11 the BFS twin (know both, implement one), 20 Directed cycle DFS (needs an extra in-recursion array — do not reuse this code), 19 Bipartite Graph DFS (colour instead of parent).

**Interview tip:** If they ask "why not use the directed-cycle recipe (vis + path)?" answer: it works but is stronger than you need; parent is the undirected specialisation and handles the back-pointer that would fool a vis-only test.

## 13. Distance of Nearest Cell Having 1 (01 Matrix)

### Problem Understanding

Two statements, **one algorithm**, sources flipped.

- **LeetCode 542 Medium — 01 Matrix.** `mat[i][j]` is `0` or `1`. Return a matrix where `answer[i][j]` is the 4-distance to the **nearest 0**. Signature: `int[][] updateMatrix(int[][] mat)`.
- **takeUforward / GFG — Distance of nearest cell having 1.** Same grid, answer is 4-distance to the **nearest 1**. Cells that are already `1` have distance `0`.

They are the same multi-source BFS. LC seeds every `0`. GFG seeds every `1`. Implement LC 542 as the judge signature; the GFG flip is one boolean.

**Input / Output / Constraints**
- Input: `int[][] mat`, `n × m`, `1 ≤ n, m ≤ 200` (LC). At least one `0` on LC 542.
- Output: `int[][]` of the same shape, non-negative distances.
- Distance between adjacent cells is 1. 4-dir.

**Observations**
- Naive: for every `1`-cell (LC) run BFS until you hit a `0`. `O((n·m)²)` — `200⁴ = 1.6·10⁹`, TLE.
- The distance of a cell to the nearest source is min over sources of BFS-distance-from-that-source. Computing that independently is the single-source mistake from rotten oranges.
- Multi-source: every source at dist 0 goes into the queue first. The first time you reach a non-source, that dist is the answer for that cell. BFS layers are monotone, so first hit = nearest.
- You may reuse `mat` as the answer (set sources to 0, others to a sentinel) or allocate `dist[][]`.
- Rotten oranges (9) is this pattern returning `max(dist)` plus a leftover check. Here you return the whole field.

**Example** (LeetCode 542 — distance to nearest 0)
```text
mat                 answer
0 0 0               0 0 0
0 1 0         →     0 1 0
1 1 1               1 2 1
```

Second example (a longer chain):
```text
0 1 1 1 1           0 1 2 3 4
```

GFG flip on
```text
0 0 0               1 1 1        (distance to nearest 1)
0 1 0         →     1 0 1
1 0 1               0 1 0
```
Same code, seed the opposite value.

### How to Think About the Problem

- What should I notice first? "Nearest" on an unweighted grid is BFS. "Nearest to *any* 0" means *all* 0s are sources, not "pick a 1 and walk".
- Which representation? Grid. `dirs` + in-bounds. Sources = cells equal to `0` (LC) or `1` (GFG).
- Counting / searching / ordering / minimizing → which mental model? **Minimizing** per cell. Multi-source shortest path, unit weights.
- Which traversal is natural? BFS. DFS has no layer order; a DFS distance is a path length, not a minimum.
- **Clue → Pattern:** *distance to nearest X on a grid → multi-source BFS from every X, first touch wins.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: for every non-source cell, BFS until a source
is dequeued. O((n·m)²)
        ↓
Observation: those BFS waves from the sources are the same
waves running backwards. Reverse the question: start at
every source, spread outward, stamp each cell once.
        ↓
Optimal: multi-source BFS, all sources in the queue at
dist 0. O(n·m)
```

### Brute Force Approach

- Basic idea: allocate `ans[n][m]`. For each cell that is not a source, run a BFS from that cell; the level at which you first see a `0` (LC) is `ans[i][j]`. Sources get `0` without a search.
- Why it works: BFS from a single cell finds the nearest `0` because the first source dequeued is at minimum 4-distance. Independent per cell, so it is correct and slow.

```java
import java.util.*;

class ZeroOneMatrixBrute {
    private static final int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int[][] updateMatrix(int[][] mat) {
        int n = mat.length, m = mat[0].length;
        int[][] ans = new int[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (mat[i][j] == 0) {
                    ans[i][j] = 0;
                } else {
                    ans[i][j] = bfsUntilZero(mat, i, j, n, m);
                }
            }
        }
        return ans;
    }

    private int bfsUntilZero(int[][] mat, int sr, int sc, int n, int m) {
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<int[]> q = new ArrayDeque<>();
        q.offer(new int[]{sr, sc, 0});
        vis[sr][sc] = true;
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1], d = cur[2];
            if (mat[r][c] == 0) return d;
            for (int[] dir : dirs) {
                int nr = r + dir[0], nc = c + dir[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (in && !vis[nr][nc]) {
                    vis[nr][nc] = true;
                    q.offer(new int[]{nr, nc, d + 1});
                }
            }
        }
        return Integer.MAX_VALUE; // LC guarantees a 0 exists
    }
}
```

**Time Complexity Calculation:**
Up to `N = n·m` non-source cells. Each BFS can visit `N` cells. Total `O(N²) = O((n·m)²)`. For `n = m = 200`, about `1.6·10⁹` neighbour touches. TLE.

**Space Complexity Calculation:**
Per BFS: `vis[n][m]` and a queue `O(N)`. Answer matrix `O(N)`.

**Why can this be improved?**
A cell near two zeros is rediscovered from every `1` around it. The nearest-zero field satisfies a simple recurrence: `ans[z] = 0` at zeros, `ans[p] = 1 + min(ans of neighbours)` at the rest, and the unique solution of that system on a grid is computed by BFS from the zeros. One pass.

### Optimal Approach

The structure being exploited is an **unweighted grid** with a set of sources: multi-source BFS computes min distance to the set.

**Core Observation**
Seed **all** zeros (LC) at distance 0. Mark them visited. Everything else starts unvisited. The first time BFS pops a cell it has the smallest possible distance, because any other path is at least as long as the current layer.

**Pattern Identification**
Identical to problem 9's queue, except:
- sources are `0` not `2`;
- you store `dist[r][c]` instead of a global minute;
- you never return `-1` (LC has at least one 0; GFG cells always have a nearest 1 if one exists — if a grid of all 0s is allowed on GFG, distance is conventionally left as a large sentinel; LC 542 always has a 0).

**Step-by-Step Intuition**
1. `dist[n][m]`, `vis[n][m]`, queue.
2. Double loop: every `mat[i][j] == 0` → `dist=0`, `vis=true`, enqueue. (GFG: seed `== 1` instead.)
3. While queue: pop `(r,c)`. For each 4-neighbour in-bounds and unvisited: `vis=true`, `dist[nr][nc] = dist[r][c] + 1`, enqueue.
4. *Invariant: when a cell is first marked, dist[cell] equals min 4-distance to a source. Later paths cannot be shorter, so we never decrease.*
5. Return `dist`.

Mark on enqueue. If you mark on dequeue, a cell can sit in the queue with several candidate distances; the first dequeued is still the min if you push `d+1` carefully, but the queue bloats to `O(4N)`. Mark-on-enqueue keeps it tight.

**Dry Run**

LC 542: `mat = [[0,0,0],[0,1,0],[1,1,1]]`

Sources (dist 0): `(0,0),(0,1),(0,2),(1,0),(1,2)`.

| Step | queue (front → back) | dist notable | Action |
|---|---|---|---|
| 0 | `(0,0)(0,1)(0,2)(1,0)(1,2)` | all those 0 | seed every 0 |
| 1 | sources drain; `(1,1)` still unseen | | sources have no other unmarked 0-neighbours |
| 2 | `(1,1),(2,0)` | `dist[1][1]=1`, `dist[2][0]=1` | `(0,1)` / `(1,0)` / `(1,2)` all try `(1,1)`; first one wins, later see vis |
| 3 | `(2,1)` from `(1,1)` or `(2,0)` | `dist[2][1]=2` | first touch of `(2,1)` is layer 2 |
| 4 | `(2,2)` from `(1,2)` at dist 1 | `dist[2][2]=1` | `(1,2)` was a source, so the corner is 1 not 2 |
| 5 | empty | `[[0,0,0],[0,1,0],[1,2,1]]` | return |

If you had BFS'd only from `(1,1)` you would find a 0 in one step — lucky. From `(2,1)` a per-cell BFS walks two steps. Multi-source does both in one wave.

GFG on the same matrix (distance to 1): sources `(1,1),(2,0),(2,1),(2,2)`. Top-left 0 is 2 away from `(1,1)`? No: `(0,1)` is adjacent to `(1,1)` so dist 1, `(0,0)` dist 2 via `(0,1)` or via `(1,0)`. Different numbers, same walker.

**Why Does It Work?**
Unit-weight shortest paths from a *set* of sources equal shortest paths in the graph with a super-source wired to every source by a 0-weight edge. Putting all sources in the queue at dist 0 *is* that super-source. BFS's first-visit property then stamps the field. Re-running BFS per cell ignores that the waves share work.

**Java Code**

```java
import java.util.*;

class DistanceOfNearestCellHaving1 {
    // LeetCode 542: distance to nearest 0.
    public int[][] updateMatrix(int[][] mat) {
        return multiSource(mat, 0);
    }

    // GFG / takeUforward: distance to nearest 1.
    public int[][] nearestOne(int[][] mat) {
        return multiSource(mat, 1);
    }

    private int[][] multiSource(int[][] mat, int sourceVal) {
        int n = mat.length, m = mat[0].length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        int[][] dist = new int[n][m];
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<int[]> q = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (mat[i][j] == sourceVal) {
                    vis[i][j] = true;
                    dist[i][j] = 0;
                    q.offer(new int[]{i, j});
                }
            }
        }

        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                boolean in = nr >= 0 && nr < n && nc >= 0 && nc < m;
                if (in && !vis[nr][nc]) {
                    vis[nr][nc] = true; // first touch = nearest
                    dist[nr][nc] = dist[r][c] + 1;
                    q.offer(new int[]{nr, nc});
                }
            }
        }
        return dist;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Every cell is enqueued at most once. Four neighbour checks each. `O(N)` with `N = n·m`, `E ≈ 4N`, so `O(n·m)`. Independent of how many sources there are — that is the point of packing them into one BFS.

**Space Complexity Calculation:**
`dist[n][m]`, `vis[n][m]`, queue `O(N)`. You can fold `vis` into `dist` by initialising non-sources to `-1` and treating `dist != -1` as visited, which drops one matrix but not the asymptotic.

### Pattern to Remember

```text
Clue: "nearest 0 / nearest 1 / nearest gate / nearest wall on a grid"
Pattern: multi-source BFS from ALL targets; first visit stamps dist
Mental model: problem 9's wavefront, but you keep the whole distance field
```

**Similar problems:** 9 Rotten Oranges (same BFS, return max level and `-1` on leftovers), 14 Surrounded Regions and 15 Number of Enclaves (boundary cells as sources), 16 Word Ladder I (implicit graph, one source, level = dist).

**Interview tip:** Say "I will not BFS from every 1; that is `O((nm)²)`. I BFS from every 0 once." Then ask which value is the source — LC 542 vs GFG flip — before you write the seed loop.


## 14. Surrounded Regions (Replace O's with X's)

### Problem Understanding
A board of `'X'` and `'O'`. Capture every region of `'O'` that is completely surrounded by `'X'`: flip those `'O'`s to `'X'`. A region is surrounded when none of its cells can walk to the border of the board (4-directionally, through other `'O'`s). Border `'O'`s, and anything connected to them, stay.

**Input / Output / Constraints**
- Input: `char[][] board`, size `n × m`, cells `'X'` or `'O'`
- Output: mutate `board` in place; no return value
- `1 ≤ n, m ≤ 200` (LeetCode 130)
- 4-dir adjacency only; no wrapping

**Observations**
- Capture ⇔ the `'O'` component cannot reach any border cell.
- Survival ⇔ the `'O'` is on the border, or a path of `'O'`s reaches the border.
- The question "is this interior blob captured?" cannot be answered from one cell. You need the whole component, or a different starting set.
- Any algorithm that flips an `'O'` before it knows whether that `'O'` reaches the border is wrong.

**Example**
```text
before                 after
X X X X                X X X X
X O O X                X X X X
X X O X                X X X X
X O X X                X O X X
    ^                      ^
  only border O          inner blob captured
```
The three interior `'O'`s at `(1,1)`, `(1,2)`, `(2,2)` form one region that never touches the rim → `'X'`. The `'O'` at `(3,1)` sits on the last row → stays.

**Example (edges: 1×1, all-border, no `'O'`)**
- `[['O']]` → `[['O']]`. The only cell is a border cell.
- A 2×2 of all `'O'` → unchanged. Every cell is on the border.
- An all-`'X'` board → unchanged. Nothing to capture.

### How to Think About the Problem
- What should I notice first? "Surrounded" is a reachability claim about the border, not a local 8-neighbor `'X'` check. A thin corridor of `'O'`s can save a cell far from the rim.
- Which representation? Grid graph. Vertex = cell. Edge = 4-dir step onto the same letter. `N = n*m` vertices, `E ≈ 4N`.
- Counting / searching / ordering / minimizing → which mental model? Searching: identify the unique safe set, then invert it.
- Which traversal is natural? Multi-source DFS or BFS from every border `'O'`. Those sources are already proven safe.
- **Clue → Pattern:** *If "captured" means "cannot reach the boundary", flood from the boundary and mark the reachable set; everything unmarked is captured.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each O-region, DFS, store cells, flag if any cell is on the border, flip the list if not. O(N) time, extra region lists
        ↓
Observation: the ONLY survivors are border O's and O's connected to them. Interior-first explores dead cells with the same ceremony as live ones
        ↓
Optimal: flood from all border O's, mark them safe ('T'), then O→X and T→O. O(N), no region lists
```

### Brute Force Approach
- Basic idea: scan the board. On every unvisited `'O'`, DFS/BFS the whole component into a list. While walking, set a `touchesBorder` flag if any cell has `r == 0 || r == n-1 || c == 0 || c == m-1`. After the walk, if the flag is false, write `'X'` over the list.
- Why it works: 4-dir connectivity partitions `'O'`s into disjoint regions. A region is captured iff no cell in it is on the border.
- Java code:

```java
class SurroundedRegionsBrute {
    public void solve(char[][] board) {
        int n = board.length, m = board[0].length;
        boolean[][] vis = new boolean[n][m];
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (board[i][j] != 'O' || vis[i][j]) continue;
                List<int[]> cells = new ArrayList<>();
                boolean[] touches = {false};
                dfs(board, vis, i, j, n, m, dirs, cells, touches);
                if (!touches[0]) {
                    for (int[] p : cells) board[p[0]][p[1]] = 'X';
                }
            }
        }
    }

    private void dfs(char[][] board, boolean[][] vis, int r, int c,
                     int n, int m, int[][] dirs, List<int[]> cells, boolean[] touches) {
        vis[r][c] = true;
        cells.add(new int[]{r, c});
        if (r == 0 || r == n - 1 || c == 0 || c == m - 1) touches[0] = true;
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
            if (board[nr][nc] != 'O' || vis[nr][nc]) continue;
            dfs(board, vis, nr, nc, n, m, dirs, cells, touches);
        }
    }
}
```

- **Time Complexity Calculation:** each cell is pushed into `cells` at most once, each of 4 edges scanned once. `N = n*m`, `E ≈ 4N` → `O(N)`.
- **Space Complexity Calculation:** `vis` is `O(N)`, recursion/`cells` is `O(N)` for an all-`'O'` board.
- **Why can this be improved?** You allocate a list per region and you spend a "did we touch the rim?" test on regions that were never going to survive. Starting from the rim makes the safe set the thing you compute, and the dead cells wait for a linear rewrite. Same asymptotics, tighter invariant, no per-region storage.

A greedy "flip this `'O'` if its 4 neighbors are `'X'` or out of interior" also fails: a cell can be locally boxed and still have a corridor to the border two steps away.

```text
X X X X X
X O O O X
X X X O X
O O O O X     the whole O-snake reaches the left border — none of it is captured
X X X X X
```

### Optimal Approach
The structure being exploited is an **undirected unweighted grid graph**: 4-dir, unit edges, `'O'` cells as vertices.

**Core Observation**
The complement of "surrounded" is "connected to the border". Connectivity from a small, known-safe set (the border `'O'`s) is cheaper to think about than "for each interior blob, prove it is trapped".

**Pattern Identification**
Multi-source DFS/BFS from the boundary, then a rewrite pass. Same family as 15 Number of Enclaves; flipping instead of counting.

**Step-by-Step Intuition**
1. Walk every border cell. If it is `'O'`, it cannot be captured. Start a flood from it.
2. During the flood, mark surviving `'O'`s with a sentinel (`'T'`, "safe / temporary") so the final sweep can tell them from trapped `'O'`s. *Invariant: every `'T'` is an `'O'` that has a path to the border.*
3. After all border floods finish, every remaining `'O'` failed to join a border flood. *Invariant: a leftover `'O'` is in a component disjoint from the border.*
4. Rewrite: `'O'` → `'X'` (capture), `'T'` → `'O'` (restore survivors). `'X'` stays `'X'`.

**Dry Run**
Board from the example. Border `'O'`: only `(3,1)`.

| Step | State (board / stack) | Action |
|------|------------------------|--------|
| 0 | all original; stack empty | scan border cells |
| 1 | `(3,1)='O'` | border O found; DFS mark `'T'` |
| 2 | stack `[(3,1)]`; board `(3,1)='T'` | 4-dir: up `'X'`, left `'X'`, right `'X'`, down OOB. Flood ends |
| 3 | rewrite `(1,1)` | `'O'` → `'X'` |
| 4 | rewrite `(1,2)` | `'O'` → `'X'` |
| 5 | rewrite `(2,2)` | `'O'` → `'X'` |
| 6 | rewrite `(3,1)` | `'T'` → `'O'` |
| 7 | done | inner blob dead, border O alive |

```text
after flood              after rewrite
X X X X                  X X X X
X O O X                  X X X X
X X O X                  X X X X
X T X X                  X O X X
```

**Why Does It Work?**
Every captured region is an `'O'`-component with no border cell, so a flood that only starts on the border never enters it. Every surviving region contains at least one border `'O'`, so the flood from that border cell paints the whole component `'T'`. The rewrite is then a local classification: unmarked `'O'` = unreachable from the border = captured. The sentinel is the only extra state you need; you do not store regions.

**Java Code**

```java
class SurroundedRegions {
    public void solve(char[][] board) {
        int n = board.length, m = board[0].length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

        for (int i = 0; i < n; i++) {
            if (board[i][0] == 'O') dfs(board, i, 0, n, m, dirs);
            if (board[i][m - 1] == 'O') dfs(board, i, m - 1, n, m, dirs);
        }
        for (int j = 0; j < m; j++) {
            if (board[0][j] == 'O') dfs(board, 0, j, n, m, dirs);
            if (board[n - 1][j] == 'O') dfs(board, n - 1, j, n, m, dirs);
        }

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (board[i][j] == 'O') board[i][j] = 'X';
                else if (board[i][j] == 'T') board[i][j] = 'O';
            }
        }
    }

    private void dfs(char[][] board, int r, int c, int n, int m, int[][] dirs) {
        board[r][c] = 'T'; // proven connected to the border
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
            if (board[nr][nc] != 'O') continue;
            dfs(board, nr, nc, n, m, dirs);
        }
    }
}
```

BFS is the same flood with an `ArrayDeque<int[]>` seeded by every border `'O'` before the loop (true multi-source). Use it if you distrust `n*m = 40_000` recursion depth; LC's 200×200 all-`'O'` board will overflow a default Java stack on DFS.

**Complexity**
- **Time Complexity Calculation:** each cell is written at most twice (`'O'`→`'T'`→`'O'`, or `'O'`→`'X'`, or `'X'` untouched). Each cell's 4 neighbors are inspected at most a constant number of times. `N = n*m`, `E ≈ 4N` → `O(N)`.
- **Space Complexity Calculation:** DFS recursion `O(N)` worst case (entire board `'O'`). BFS queue `O(N)`. No extra `vis` matrix; the sentinel lives in the board. If the interviewer forbids mutating with `'T'`, allocate `boolean[][] safe` — still `O(N)`.

### Pattern to Remember
```text
Clue: a region is "captured" iff it cannot reach the boundary
Pattern: multi-source flood from the boundary, then invert the unmarked set
Mental model: compute the safe set, kill the complement
```
**Similar problems:** 15 Number of Enclaves (same flood, count leftover land), 18 Number of Islands, 6 Flood Fill, Pacific Atlantic Water Flow (flood from two borders).
**Interview tip:** say out loud "I will not decide capture from the interior; I will mark everything that touches the rim, then flip the rest."

---

## 15. Number of Enclaves

### Problem Understanding
A grid of `0` (sea) and `1` (land). From a land cell you may walk 4-dir onto other land. An *enclave* cell is a land cell from which you cannot walk to the border (you cannot "walk off" the grid). Return the number of such cells.

**Input / Output / Constraints**
- Input: `int[][] grid`, size `n × m`, values `0` or `1`
- Output: `int` — count of land cells that cannot reach the border
- `1 ≤ n, m ≤ 500` (LeetCode 1020)
- 4-dir; walking onto a `0` is forbidden

**Observations**
- This is Surrounded Regions with a different payload. There you flipped trapped `'O'`s. Here you count trapped `1`s.
- Border land, and land connected to border land, can walk off. They are not enclaves.
- After you destroy (or mark) every border-connected land component, every remaining `1` is an enclave cell. The answer is the count of those `1`s, not the count of components.
- A 1×1 `[1]` is on the border → `0`. A closed ring of sea around an interior island → the island's area.

**Example**
```text
0 0 0 0
1 0 1 0
0 1 1 0
0 0 0 0
```
Border land: `(1,0)` only. It has no land neighbor, so the flood eats one cell. Leftover `1`s: `(1,2)`, `(2,1)`, `(2,2)` — one interior island of area 3. Output: `3`.

**Example (edges: all land, no land, 1×1)**
- All `1`s: every cell reaches the border through land → `0`.
- All `0`s → `0`.
- `[[1]]` → `0` (the cell is the border). `[[0]]` → `0`.

### How to Think About the Problem
- What should I notice first? The quantity is a *cell count*, not a *component count*. Two enclaves of size 4 and 1 answer `5`, not `2`.
- Which representation? Grid graph, land cells as vertices, 4-dir land-land edges. `N = n*m`, `E ≈ 4N`.
- Counting / searching / ordering / minimizing → which mental model? Searching the non-enclave set from the border, then counting the complement.
- Which traversal is natural? Multi-source BFS (or DFS) from every border `1`. Seed the queue with *all* sources first — that is the multi-source move.
- **Clue → Pattern:** *Same boundary-first flood as 14; the rewrite step becomes "count remaining 1s" instead of "flip O to X".*

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each land cell, BFS/DFS to see if THAT cell can reach the border. O(N^2)
        ↓
Observation: reachability-to-border is constant on a whole component. Flood once per component, not once per cell
        ↓
Optimal: multi-source flood from all border 1s (sink them to 0), then count leftover 1s. O(N)
```

### Brute Force Approach
- Basic idea: for every cell with `grid[i][j] == 1`, run a fresh BFS. If the BFS ever steps onto a border cell, this land is not an enclave. If the BFS dies in the interior, increment the answer by 1.
- Why it works: the definition is per-cell reachability to the border. BFS from the cell finds exactly the cells it can walk to.
- Java code (per-cell; the slow version you should refuse to ship):

```java
class NumberOfEnclavesBrute {
    public int numEnclaves(int[][] grid) {
        int n = grid.length, m = grid[0].length, ans = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 1 && !canReachBorder(grid, i, j, n, m)) ans++;
            }
        }
        return ans;
    }

    private boolean canReachBorder(int[][] grid, int sr, int sc, int n, int m) {
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{sr, sc});
        vis[sr][sc] = true;
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];
            if (r == 0 || r == n - 1 || c == 0 || c == m - 1) return true;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (grid[nr][nc] == 0 || vis[nr][nc]) continue;
                vis[nr][nc] = true;
                q.add(new int[]{nr, nc});
            }
        }
        return false;
    }
}
```

- **Time Complexity Calculation:** up to `N` land cells, each BFS walks `O(N)` cells. `O(N^2)` with `N = n*m`. On 500×500 this is dead.
- **Space Complexity Calculation:** `vis` + queue `O(N)` per BFS, reused sequentially → `O(N)`.
- **Why can this be improved?** Reachability-to-border is identical for every cell in a component. You re-walk the same island once per cell. Invert the search: walk from the border *inward* once, and the leftover land is the answer.

### Optimal Approach
The structure being exploited is the same **undirected unweighted grid** as 14. The new move is **multi-source BFS**: every border land cell is a source at time 0, and you put them all in the queue *before* the loop.

**Core Observation**
A land cell is an enclave iff it is not in any component that contains a border land cell. Destroy those components (sink `1` → `0`); the remaining `1`s are exactly the enclave cells.

**Pattern Identification**
Boundary-first multi-source BFS + complement count. 14 flipped; 15 counts. Do not return the number of interior *islands*.

**Step-by-Step Intuition**
1. Scan the four borders. Every `1` you see can walk off. Push it into the queue and sink it to `0` immediately so it is not re-enqueued.
2. BFS: pop a cell, walk 4-dir onto remaining `1`s, sink and enqueue them. *Invariant: a cell is in the queue only after it has been proven connected to the border, and it is already `0` so the later count skips it.*
3. When the queue is empty, every border-connected land cell is sea.
4. Sweep the whole grid and add up the `1`s. *Invariant: every remaining `1` has no path to the border.*

**Dry Run**
Grid from the example. `n=4, m=4`.

| Step | State (queue / grid 1s) | Action |
|------|-------------------------|--------|
| 0 | q empty; 1s at `(1,0),(1,2),(2,1),(2,2)` | seed from border |
| 1 | q `[(1,0)]`; `(1,0)` sunk to 0 | only border land |
| 2 | pop `(1,0)` | 4-dir all sea or OOB; q empty |
| 3 | leftover 1s: `(1,2),(2,1),(2,2)` | count = 3 |

A second mental picture — land touching the top, flood eats a whole corridor:

```text
seed (border 1s)          after BFS              count
0 1 1 0                   0 0 0 0
0 0 1 0        →          0 0 0 0        →       leftover 1s = 0
1 0 0 1                   0 0 0 0                (left/right 1s were border)
0 0 0 0                   0 0 0 0
```

**Why Does It Work?**
Multi-source BFS from the border visits exactly the land-component union of all border `1`s. Sinking is the visited mark; it also prepares the count. What the BFS never touches cannot reach a source, hence cannot reach the border. Counting cells (not components) matches the problem statement.

**Java Code**

```java
class NumberOfEnclaves {
    public int numEnclaves(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        ArrayDeque<int[]> q = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            if (grid[i][0] == 1) {
                grid[i][0] = 0;
                q.add(new int[]{i, 0});
            }
            if (grid[i][m - 1] == 1) {
                grid[i][m - 1] = 0;
                q.add(new int[]{i, m - 1});
            }
        }
        for (int j = 0; j < m; j++) {
            if (grid[0][j] == 1) {
                grid[0][j] = 0;
                q.add(new int[]{0, j});
            }
            if (grid[n - 1][j] == 1) {
                grid[n - 1][j] = 0;
                q.add(new int[]{n - 1, j});
            }
        }

        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (grid[nr][nc] == 0) continue;
                grid[nr][nc] = 0; // sink: visited AND removed from the later count
                q.add(new int[]{nr, nc});
            }
        }

        int ans = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == 1) ans++;
            }
        }
        return ans;
    }
}
```

DFS from each border `1` (as in 14) is correct too. The BFS form is here because `n, m ≤ 500` makes `N = 250_000` a real recursion-depth risk, and because seeding the queue with every source is the pattern you reuse in Rotten Oranges / 01 Matrix.

**Complexity**
- **Time Complexity Calculation:** each cell is enqueued at most once. Each of 4 edges is scanned a constant number of times. Border seeding is `O(n+m)`. Final count is `O(N)`. Total `O(N)` with `N = n*m`, `E ≈ 4N`.
- **Space Complexity Calculation:** queue holds at most `O(N)` land cells (peak is the BFS frontier). No separate `vis`. If the interviewer forbids mutating `grid`, copy or use `boolean[][] vis` → still `O(N)`.

### Pattern to Remember
```text
Clue: count land that cannot walk to the border
Pattern: multi-source BFS/DFS from every border land cell, then count what the flood missed
Mental model: 14's safe-set flood, but the answer is |complement| not a rewrite
```
**Similar problems:** 14 Surrounded Regions, 18 Number of Islands, 7 Rotten Oranges (multi-source BFS), 8 01 Matrix (multi-source BFS from every `0`).
**Interview tip:** confirm whether they want the number of *cells* or the number of *islands*. This problem is cells. Number of Closed Islands is the component-count twin.

---

## 16. Word Ladder I

### Problem Understanding
You are given `beginWord`, `endWord`, and a `wordList`. A transformation is changing exactly one letter, and the new string must be in `wordList` (the begin word is allowed even if it is not in the list). Return the length of the shortest transformation sequence from `beginWord` to `endWord` — the number of *words* in the sequence, not the number of edits. If no sequence exists, return `0`.

**Input / Output / Constraints**
- Input: `String beginWord`, `String endWord`, `List<String> wordList`
- Output: `int` length, or `0`
- All words share length `L`; lowercase. `1 ≤ |wordList| ≤ 5000`, `L ≤ 10` (LeetCode 127)
- `beginWord != endWord` on LC; still handle equality in your head (length `1`)

**Observations**
- One-letter difference is an unweighted edge. Shortest sequence ⇔ shortest path in that graph.
- Unweighted shortest path → BFS. The BFS level (words visited so far) *is* the answer when you first pop `endWord`.
- Each word is used at most once on a shortest path. The first time BFS reaches a word is the shortest time it can be reached; you may erase it from the dictionary immediately.
- Building the explicit `N × N` graph by pairwise compare is correct and slow. Generating the 26`L` possible neighbors of a word, testing set membership, is the right adjacency oracle.
- If `endWord` is not in `wordList`, the answer is `0` before you search.

**Example**
`beginWord = "hit"`, `endWord = "cog"`, `wordList = ["hot","dot","dog","lot","log","cog"]`.

```text
 hit
  |
 hot
 /   \
dot   lot
 |     |
dog   log
  \   /
   cog
```
One shortest sequence: `hit → hot → dot → dog → cog`. Length `5`. Another of the same length goes through `lot/log`. Return `5`.

**Example (edges)**
- `endWord` not in the list → `0`.
- `beginWord == endWord` → `1` (the sequence is one word). LC excludes this; interviewers do not.
- `wordList` empty, `endWord` not begin → `0`.
- No path even though `endWord` is present (`hit` vs `cog` with list `["cog"]` and `L>1` with no bridge) → `0`.

### How to Think About the Problem
- What should I notice first? The dictionary is an implicit graph. You never have to materialize all edges.
- Which representation? Vertices = `beginWord` plus every dictionary word. Edge if Hamming distance is 1. Unweighted.
- Counting / searching / ordering / minimizing → which mental model? Minimizing length on unit edges → BFS, not DFS, not Dijkstra.
- Which traversal is natural? BFS. Depth of the layer that first contains `endWord` is the sequence length.
- **Clue → Pattern:** *Words as nodes, one-letter change as a unit edge, BFS distance + 1 = ladder length. Erase a word on first visit.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: pairwise Hamming, build adj lists, BFS. O(V^2 L + V + E)
        ↓
Observation: a word has at most 26L possible neighbors; V=5000, L=10 → 26L << V. Don't compare all pairs
        ↓
Optimal: BFS with an O(L) neighbor generator (or a wildcard pattern map). Erase on visit. O(V L^2 · 26)
```

### Brute Force Approach
- Basic idea: put `beginWord` into the vertex set. For every pair of vertices, if they differ by one character, add an undirected edge. BFS from `beginWord`. Return `dist[endWord]` counted in words (start at 1), or `0` if unreachable.
- Why it works: the constructed graph is exactly the transformation graph. BFS on an unweighted graph yields shortest paths.
- Java code:

```java
class WordLadderIBrute {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        if (!dict.contains(endWord)) return 0;
        List<String> nodes = new ArrayList<>(dict);
        if (!dict.contains(beginWord)) nodes.add(beginWord);
        Map<String, List<String>> adj = new HashMap<>();
        for (String w : nodes) adj.put(w, new ArrayList<>());
        int k = nodes.size();
        for (int i = 0; i < k; i++) {
            for (int j = i + 1; j < k; j++) {
                if (oneDiff(nodes.get(i), nodes.get(j))) {
                    adj.get(nodes.get(i)).add(nodes.get(j));
                    adj.get(nodes.get(j)).add(nodes.get(i));
                }
            }
        }
        ArrayDeque<String> q = new ArrayDeque<>();
        Map<String, Integer> dist = new HashMap<>();
        q.add(beginWord);
        dist.put(beginWord, 1); // length in words
        while (!q.isEmpty()) {
            String cur = q.poll();
            if (cur.equals(endWord)) return dist.get(cur);
            for (String nei : adj.get(cur)) {
                if (dist.containsKey(nei)) continue;
                dist.put(nei, dist.get(cur) + 1);
                q.add(nei);
            }
        }
        return 0;
    }

    private boolean oneDiff(String a, String b) {
        int d = 0;
        for (int i = 0; i < a.length(); i++) {
            if (a.charAt(i) != b.charAt(i) && ++d > 1) return false;
        }
        return d == 1;
    }
}
```

- **Time Complexity Calculation:** `V ≤ 5001`. Pairwise compare is `O(V^2 L)`. BFS is `O(V+E)` with `E ≤ V(V-1)/2`. Dominated by `O(V^2 L)`.
- **Space Complexity Calculation:** adj lists `O(V+E)` which is `O(V^2)` in a dense dictionary (every pair differs by one, e.g. all 3-letter words on two positions fixed).
- **Why can this be improved?** You pay `V^2` to discover neighbors that a 26`L`-sized guess would have found in linear time per word. The graph is implicit; generate neighbors, don't store them.

### Optimal Approach
The structure being exploited is an **unweighted undirected implicit graph** over strings of fixed length.

**Core Observation**
The first time BFS reaches a word `w` is the shortest ladder prefix ending at `w`. You will never need `w` again at a deeper level for a *shortest* length. Erase it from the set on enqueue. (This is the step that becomes illegal in Word Ladder II.)

**Pattern Identification**
BFS on an implicit unit graph. Neighbor oracle: for each of `L` positions, try 26 letters, skip the original, probe a `HashSet`. Alternative oracle: precompute a wildcard map `"h*t" → [hot, hit, hat, …]` and, from a word, union the buckets of its `L` patterns (excluding itself).

**Step-by-Step Intuition**
1. If `endWord` ∉ dict, return `0`.
2. BFS queue holds words. A parallel length (or a level-size loop) counts how many words are in the sequence so far. Start at `beginWord` with length `1`.
3. Pop `cur`. If it equals `endWord`, return the length.
4. From `cur`, generate every one-letter mutant. If the mutant is still in the set, it is an unused dictionary word: erase it, enqueue it with `length+1`. *Invariant: a word is erased the moment it is reached, so the queue never carries a second, longer path to it.*
5. If the queue dies, there is no ladder.

**Dry Run**
`hit → cog`, dict `{hot,dot,dog,lot,log,cog}`. Length counted in words.

| Step | State (queue as word:len / remaining set) | Action |
|------|-------------------------------------------|--------|
| 0 | `(hit,1)` / `{hot,dot,dog,lot,log,cog}` | start; hit may be absent from the set — that is fine |
| 1 | pop `hit` | mutants: `*it`,`h*t`,`hi*` → only `hot` hits the set |
| 2 | `(hot,2)` / `{dot,dog,lot,log,cog}` | erase `hot` |
| 3 | pop `hot` | neighbors `dot`,`lot` (and `hit` already gone) |
| 4 | `(dot,3),(lot,3)` / `{dog,log,cog}` | |
| 5 | pop `dot` | neighbor `dog` |
| 6 | `(lot,3),(dog,4)` / `{log,cog}` | |
| 7 | pop `lot` | neighbor `log` |
| 8 | `(dog,4),(log,4)` / `{cog}` | |
| 9 | pop `dog` | neighbor `cog` |
| 10 | `(log,4),(cog,5)` / `{}` | erase `cog` |
| 11 | pop `log` | `cog` already erased; skip |
| 12 | pop `cog` | `cur == endWord` → return `5` |

Wildcard map for the same graph (patterns of length 3):

```text
*ot → hot, dot, lot
h*t → hot
ho* → hot
d*t → dot
do* → dot, dog
*og → dog, log, cog
d*g → dog
l*t → lot
lo* → lot, log
l*g → log
c*g → cog
co* → cog
```
BFS from `hit` uses patterns `*it, h*t, hi*`. Only `h*t` has `hot`. Same layers as above.

**Why Does It Work?**
Every edge has weight 1, so BFS layers are exact graph distance. Sequence length is distance in edges plus one (the begin word). Erasing on first visit does not hide a shorter path because a shorter path would have reached the word in an earlier layer. Neighbor generation enumerates every Hamming-1 string; membership in the set is the "must be in wordList" rule.

**Java Code**

```java
class WordLadderI {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        if (!dict.contains(endWord)) return 0;

        ArrayDeque<String> q = new ArrayDeque<>();
        q.add(beginWord);
        dict.remove(beginWord); // if it was in the list, don't bounce back to it
        int len = 1;
        int L = beginWord.length();

        while (!q.isEmpty()) {
            int sz = q.size();
            for (int s = 0; s < sz; s++) {
                String cur = q.poll();
                if (cur.equals(endWord)) return len;
                char[] arr = cur.toCharArray();
                for (int i = 0; i < L; i++) {
                    char orig = arr[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == orig) continue;
                        arr[i] = c;
                        String nei = new String(arr);
                        if (!dict.contains(nei)) continue;
                        dict.remove(nei); // first visit = shortest; never use again
                        q.add(nei);
                    }
                    arr[i] = orig;
                }
            }
            len++;
        }
        return 0;
    }
}
```

The wildcard-map version precomputes `Map<String, List<String>>` of size `O(V L)` and, per popped word, looks up `L` patterns. Same complexity class; more memory, fewer `new String` calls in some writeups. Prefer the 26-letter generator in an interview unless the interviewer asks for the pattern map.

**Complexity**
- **Time Complexity Calculation:** `V` words, each dequeued at most once. From a word you try `L × 25` substitutions, each building a string in `O(L)` and hashing in `O(L)`. Worst case you generate neighbors for every word: `O(V · L · 26 · L) = O(V L^2)`. With LC limits `V=5000, L=10` this is ~1e7 character ops. Pairwise `O(V^2 L)` would be ~2.5e8 compares plus graph storage.
- **Space Complexity Calculation:** the set holds `O(V)` strings (`O(V L)` characters). The queue holds a BFS layer, `O(V)` words. No adj list.

### Pattern to Remember
```text
Clue: shortest sequence of one-letter dictionary steps
Pattern: BFS on an implicit unit graph; generate 26L neighbors; erase on first visit
Mental model: ladder length = BFS layer index (words, not edits)
```
**Similar problems:** 17 Word Ladder II (same graph, all shortest paths — you must *not* erase at first visit the same way), Shortest Path in Unweighted Graph, Open the Lock (LC 752, same 26-neighbor BFS).
**Interview tip:** confirm the return is the number of *words* (`hit…cog = 5`), not the number of changes (`4`). Then say you will erase a word on first visit because this problem only needs length.

---

## 17. Word Ladder II

### Problem Understanding
Same transformation rules as 16. Now return *every* shortest transformation sequence from `beginWord` to `endWord`, each sequence a list of words. If none exist, return an empty list. Order of sequences does not matter.

**Input / Output / Constraints**
- Input: `String beginWord`, `String endWord`, `List<String> wordList`
- Output: `List<List<String>>` — all shortest ladders
- LeetCode 126, Hard. Same size band as 127, but output-sensitive and brutally easy to TLE
- All words same length, lowercase; `endWord` must be used from the list

**Observations**
- The graph is the same as 16. You still want shortest paths only.
- There can be many shortest paths that *share* a vertex. In the running example, `hot` is on both, `cog` is on both.
- A global `visited` that marks a word dead the moment you see it (the 16 trick) *drops parents*. If `dog` reaches `cog` first in the same layer as `log`, and you mark `cog` visited, you never record `log` as a parent. One of the two ladders disappears.
- A word may be reached by several nodes of layer `d` and then used as a parent into layer `d+1`. It must not be used from layer `d+2` (that would be a longer path).
- Reconstruction is a second phase: BFS builds a shortest-path DAG (parent lists). DFS/backtrack from `endWord` back to `beginWord` walks only that DAG.

**Example**
`beginWord = "hit"`, `endWord = "cog"`, `wordList = ["hot","dot","dog","lot","log","cog"]`.

```text
 hit
  |
 hot
 /   \
dot   lot
 |     |
dog   log
  \   /
   cog
```
Two shortest ladders, both length 5:
- `hit, hot, dot, dog, cog`
- `hit, hot, lot, log, cog`

**Example (edges / TLE shape)**
- `endWord` not in the list → `[]`.
- Unique shortest path → a one-element list of lists.
- Dense dict, short words (`beginWord = "a"`, thousands of 1-letter / 2-letter words): BFS without a distance cutoff, or DFS from begin over the whole dict, explodes. You must stop BFS at the layer that hits `endWord`, and you must reconstruct from the parent DAG, not from the raw dictionary.

### How to Think About the Problem
- What should I notice first? 16 asked for a *number*. This asks for *every witness* of that number. The graph is identical; the visited policy is not.
- Which representation? Same implicit unit graph, plus a `Map<String, List<String>> parents` (or children) describing the shortest-path DAG.
- Counting / searching / ordering / minimizing → which mental model? First minimize (BFS distance), then enumerate (DFS on the DAG of nodes that achieved that distance).
- Which traversal is natural? BFS to build levels/parents; DFS/backtrack from the end to collect paths.
- **Clue → Pattern:** *Allow a word to gain several parents at the same BFS distance; forbid any later distance; then DFS from end to begin on that parent map.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS every transformation, keep paths whose length equals the minimum found. Exponential, TLE
        ↓
Observation: only the shortest-path DAG matters. A word can have many parents at dist d, none at dist > d
        ↓
Optimal: BFS builds parent lists (reuse only at the same distance, erase after the level), DFS from endWord. O(BFS + output)
```

### Brute Force Approach
- Basic idea: DFS/backtrack from `beginWord`. At each step try every 26`L` mutant still in a remaining-words set. Record every path that hits `endWord`. Track `best` length; prune when `path.size() > best`; after the search, drop paths longer than `best`.
- Why it works: the search tree contains every simple transformation sequence. The filter keeps the shortest ones.
- Java code:

```java
class WordLadderIIBrute {
    public List<List<String>> findLadders(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        List<List<String>> ans = new ArrayList<>();
        if (!dict.contains(endWord)) return ans;
        List<String> path = new ArrayList<>();
        path.add(beginWord);
        int[] best = {Integer.MAX_VALUE};
        dfs(beginWord, endWord, dict, path, ans, best);
        List<List<String>> only = new ArrayList<>();
        for (List<String> p : ans) if (p.size() == best[0]) only.add(p);
        return only;
    }

    private void dfs(String cur, String end, Set<String> dict,
                     List<String> path, List<List<String>> ans, int[] best) {
        if (path.size() > best[0]) return;
        if (cur.equals(end)) {
            ans.add(new ArrayList<>(path));
            best[0] = path.size();
            return;
        }
        char[] arr = cur.toCharArray();
        for (int i = 0; i < arr.length; i++) {
            char orig = arr[i];
            for (char c = 'a'; c <= 'z'; c++) {
                if (c == orig) continue;
                arr[i] = c;
                String nei = new String(arr);
                if (!dict.contains(nei)) continue;
                dict.remove(nei);
                path.add(nei);
                dfs(nei, end, dict, path, ans, best);
                path.remove(path.size() - 1);
                dict.add(nei);
            }
            arr[i] = orig;
        }
    }
}
```

- **Time Complexity Calculation:** branching up to `26L` per word, depth up to `V`. Worst `O((26L)^V)` with pruning in name only. Dies on any dense LC test.
- **Space Complexity Calculation:** recursion + path `O(V)`, output whatever you store before filtering.
- **Why can this be improved?** You explore paths that are not shortest, and prefixes that can never reach `endWord`. BFS knows the exact distance of every useful word. After BFS, the only edges you need are `parent → word` where `dist[word] = dist[parent] + 1`. DFS on that DAG is output-linear.

The other naive — "run 16's BFS, mark visited globally, reconstruct one path with a single parent pointer" — is worse than slow: it is *wrong*. It returns at most one ladder, and a `parent[u] = first predecessor` map cannot encode the diamond `dog → cog ← log`.

### Optimal Approach
The structure being exploited is the **shortest-path DAG of an unweighted implicit graph**.

**Core Observation**
If `dist[w] = d`, every shortest-path parent of `w` lives at distance `d-1`. Two nodes of layer `d-1` may both be parents. A node of layer `d-2` or `d` is not a shortest-path parent. Therefore:
- on first discovery of `w`, set `dist[w]`, record the predecessor, enqueue;
- if `w` is discovered again from the same layer (`dist[w] == dist[cur] + 1`), append another parent, do not enqueue again;
- if `w` is discovered from a deeper layer, ignore.

Erase a word from the dictionary only *after the whole level finishes*. Erasing on first sight (problem 16) would prevent the sibling at the same level from seeing it.

**Pattern Identification**
BFS to build `parents` + `dist`, stop after the level that hits `endWord`. Then DFS/backtrack from `endWord` to `beginWord` following `parents`. Walking backward from the end automatically discards shortest-path prefixes that never reach `endWord` — that is the TLE prune.

**Step-by-Step Intuition**
1. Guard: `endWord` not in dict → `[]`.
2. BFS from `beginWord` with `dist[beginWord] = 0`.
3. For each `cur` at distance `d`, generate neighbors still in dict.
   - unknown neighbor: `dist = d+1`, `parents[nei] = [cur]`, enqueue, remember it as "used this level";
   - known neighbor with `dist == d+1`: `parents[nei].add(cur)`;
   - known with any other dist: skip.
   *Invariant: `parents[w]` is exactly the set of words from which a shortest path reaches `w`.*
4. After the level, `dict.removeAll(usedThisLevel)` so later levels cannot reuse those words (they would be longer paths).
5. If this level hit `endWord`, stop BFS. Deeper layers cannot produce a shortest ladder.
6. DFS from `endWord` along `parents`, accumulating a path (end → begin). Reverse when you hit `beginWord`. *Invariant: every recursion path is a shortest begin-end ladder, and every such ladder is a recursion path.*

**Dry Run**
Same `hit / cog` dictionary. `dist` in edges from `hit`. Sequence length = dist + 1.

| Step | State (queue / dist / parents) | Action |
|------|--------------------------------|--------|
| 0 | q=`[hit]`; `hit:0`; parents `{}` | start |
| 1 | pop `hit` | neighbor `hot` first seen |
| 2 | q=`[hot]`; `hot:1`; `hot:[hit]` | level 0 done; erase `hot` from dict after the level |
| 3 | pop `hot` | neighbors `dot`,`lot` first seen |
| 4 | q=`[dot,lot]`; `dot:2, lot:2`; `dot:[hot], lot:[hot]` | erase `dot,lot` |
| 5 | pop `dot` | neighbor `dog` first seen, `dog:3, dog:[dot]` |
| 6 | pop `lot` | neighbor `log` first seen, `log:3, log:[lot]` |
| 7 | q=`[dog,log]` | erase `dog,log` |
| 8 | pop `dog` | neighbor `cog` first seen, `cog:4, cog:[dog]`, found=true |
| 9 | pop `log` | `cog` already at dist 4 = 3+1 → **append** parent `log`. `cog:[dog, log]` |
| 10 | q=`[cog]` | level hit endWord; do not process deeper. Erase `cog` |
| 11 | DFS `cog` | two parents |

DFS reconstruction (path stored end→begin, reversed on hit):

```text
cog
 ├─ dog → dot → hot → hit    reverse → hit hot dot dog cog
 └─ log → lot → hot → hit    reverse → hit hot lot log cog
```

Why a global visited breaks this table at step 9: after step 8, `cog` is visited. Step 9 skips `cog`. Parent list stays `cog:[dog]`. You lose the second ladder.

A smaller diamond with the same bug:

```text
 begin → a → c → end
 begin → b → c → end
```
Marking `c` visited when `a` reaches it drops `b` as a parent. The BFS-level rule keeps both.

**Why Does It Work?**
Unweighted BFS guarantees `dist[w]` is the shortest distance. Recording every predecessor that achieves `dist[w]-1` gives exactly the incoming DAG edges of the shortest-path union. No longer path can enter that DAG because longer paths have a larger dist and are ignored. DFS from `endWord` walks that DAG backward, so every emitted path has length `dist[endWord]+1` and every shortest path is represented (each is a chain of DAG edges from begin to end). Stopping BFS at the hitting level, and reconstructing from the end rather than DFS-from-begin over the dict, is what keeps LC's `"a"` / huge-dict cases inside the time limit.

**Java Code**

```java
class WordLadderII {
    public List<List<String>> findLadders(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        List<List<String>> ans = new ArrayList<>();
        if (!dict.contains(endWord)) return ans;

        Map<String, List<String>> parents = new HashMap<>();
        Map<String, Integer> dist = new HashMap<>();
        ArrayDeque<String> q = new ArrayDeque<>();
        q.add(beginWord);
        dist.put(beginWord, 0);
        dict.remove(beginWord);
        int L = beginWord.length();
        boolean found = false;

        while (!q.isEmpty() && !found) {
            int sz = q.size();
            Set<String> usedThisLevel = new HashSet<>();
            for (int s = 0; s < sz; s++) {
                String cur = q.poll();
                int d = dist.get(cur);
                char[] arr = cur.toCharArray();
                for (int i = 0; i < L; i++) {
                    char orig = arr[i];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == orig) continue;
                        arr[i] = c;
                        String nei = new String(arr);
                        if (!dict.contains(nei)) continue;
                        if (!dist.containsKey(nei)) {
                            dist.put(nei, d + 1);
                            parents.computeIfAbsent(nei, k -> new ArrayList<>()).add(cur);
                            q.add(nei);
                            usedThisLevel.add(nei);
                            if (nei.equals(endWord)) found = true;
                        } else if (dist.get(nei) == d + 1) {
                            // second (or third…) shortest parent at this exact distance
                            parents.get(nei).add(cur);
                        }
                    }
                    arr[i] = orig;
                }
            }
            dict.removeAll(usedThisLevel); // later levels would be longer paths
        }

        if (!dist.containsKey(endWord)) return ans;
        List<String> path = new ArrayList<>();
        path.add(endWord);
        dfs(endWord, beginWord, parents, path, ans);
        return ans;
    }

    private void dfs(String cur, String begin, Map<String, List<String>> parents,
                     List<String> path, List<List<String>> ans) {
        if (cur.equals(begin)) {
            List<String> full = new ArrayList<>(path);
            Collections.reverse(full);
            ans.add(full);
            return;
        }
        List<String> ps = parents.get(cur);
        if (ps == null) return;
        for (String p : ps) {
            path.add(p);
            dfs(p, begin, parents, path, ans);
            path.remove(path.size() - 1);
        }
    }
}
```

During a level, `nei` stays in `dict` until `removeAll` at the level's end. That is why a sibling of `dog` can still see `cog` and take the `dist == d+1` branch. If you `dict.remove(nei)` on first sight (problem 16), the extra parent is lost.

**Complexity**
- **Time Complexity Calculation:** BFS is the same `O(V L^2)` neighbor-generation bound as 16, plus `O(1)` parent-list appends per shortest-path DAG edge. DFS is `O(P · D)` where `P` is the number of shortest ladders and `D = dist[endWord] + 1` is their length — you copy a path of size `D` for each. That output term dominates when the DAG is a dense diamond (exponentially many shortest paths); you still have to write them down.
- **Space Complexity Calculation:** `dist` and the queue are `O(V)`. `parents` holds the DAG, `O(V · B)` where `B` is in-degree in the shortest-path DAG (`≤ 26L`). Recursion `O(D)`. Answer storage `O(P · D)`.

### Pattern to Remember
```text
Clue: all shortest one-letter ladders, not the length
Pattern: BFS parent-DAG (reuse at the same distance only) + DFS from the end
Mental model: delay "visited" until the level ends; a later level is a longer path and is illegal
```
**Similar problems:** 16 Word Ladder I (length only — erase on first visit), Print Shortest Path in an Unweighted Graph (one parent pointer), all-shortest-paths in a unit DAG.
**Interview tip:** draw the diamond and say "if I mark `c` visited when `a` reaches it, I lose `b→c`". Then: reconstruct from `endWord`, and cut BFS at the hitting level, or LC will TLE on `beginWord = "a"`.

---

## 18. Number of Islands

### Problem Understanding
A grid of `'1'` (land) and `'0'` (water). An island is a 4-dir connected group of `'1'`s. Return how many islands there are.

**Input / Output / Constraints**
- Input: `char[][] grid`, size `n × m`
- Output: `int` — number of islands
- `1 ≤ n, m ≤ 300` (LeetCode 200)
- 4-dir; no diagonal land-bridge

**Observations**
- This is connected-components on a grid graph. Each component of `'1'`s is one island.
- You start a flood from an unvisited `'1'`, paint the whole component, increment the answer once.
- Painting can be a `boolean[][] vis`, or you can *sink* the island by writing `'0'` into the grid as you go. Sinking *is* the visited mark.
- Related to 6 / 7 / 8: same flood, different question (fill a colour / time-to-rot / distance-to-1). Related to 14 / 15: those flood from the *border* and invert; this floods from every leftover `'1'` and counts the starts.

**Example**
```text
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
```
Three islands: a 2×2 blob, a single cell, a 1×2 bar. Output: `3`.

**Example (edges)**
- All water → `0`.
- All land → `1` (one component).
- 1×1 `'1'` → `1`. 1×1 `'0'` → `0`.
- Checkerboard of `'1'`/`'0'` with 4-dir → every `'1'` is its own island (diagonals don't count).

### How to Think About the Problem
- What should I notice first? You are not asked for area, perimeter, or "closed" islands. You are asked for the number of times you have to *start* a flood.
- Which representation? Grid graph, `'1'` cells as vertices, 4-dir edges. `N = n*m`, `E ≈ 4N`.
- Counting / searching / ordering / minimizing → which mental model? Counting connected components.
- Which traversal is natural? DFS or BFS from each unvisited land cell. The traversal skeleton is interchangeable; the count of starts is the answer.
- **Clue → Pattern:** *Each time you find a `'1'` that is not yet sunk, you have discovered a new island — flood it away so you never count it again.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS/BFS with a separate vis[][]. Correct, O(N) extra memory
        ↓
Observation: the grid itself can carry the mark. Writing '0' sinks the island
        ↓
Optimal: sink-in-place DFS or BFS. O(N) time, O(1) extra besides the stack/queue
```

### Brute Force Approach
- Basic idea: allocate `boolean[][] vis`. Scan. On an unvisited `'1'`, increment `ans` and DFS/BFS through 4-dir `'1'`s marking `vis`. Water and visited land are walls.
- Why it works: the floods partition the land cells. One flood per component.
- Java code:

```java
class NumberOfIslandsBrute {
    public int numIslands(char[][] grid) {
        int n = grid.length, m = grid[0].length, ans = 0;
        boolean[][] vis = new boolean[n][m];
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] == '1' && !vis[i][j]) {
                    ans++;
                    dfs(grid, vis, i, j, n, m, dirs);
                }
            }
        }
        return ans;
    }

    private void dfs(char[][] grid, boolean[][] vis, int r, int c,
                     int n, int m, int[][] dirs) {
        vis[r][c] = true;
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
            if (grid[nr][nc] != '1' || vis[nr][nc]) continue;
            dfs(grid, vis, nr, nc, n, m, dirs);
        }
    }
}
```

- **Time Complexity Calculation:** each cell is a DFS node at most once. 4 edges per cell. `O(N)`, `N = n*m`, `E ≈ 4N`.
- **Space Complexity Calculation:** `vis` is `O(N)`. Recursion `O(N)` on a snake-like island.
- **Why can this be improved?** `vis` duplicates information you can store in the grid. Sinking to `'0'` frees the `O(N)` matrix. Asymptotic time does not change; the code gets shorter and the interviewer sees you know the mark can live in the input. (Ask before mutating if the grid must be restored.)

A genuinely wrong naive idea: count `'1'` cells. That is area, not islands. Another: 8-dir flood — that merges diagonal land and fails the statement.

### Optimal Approach
The structure being exploited is an **undirected unweighted grid**. Components of `'1'`s are the islands.

**Core Observation**
The number of islands equals the number of times a scan finds a `'1'` that has not been destroyed by a previous flood. Destroying (sinking) the component is how you remember it.

**Pattern Identification**
Grid DFS/BFS region counting. Same flood as 6 Flood Fill; you count *starts* instead of painting a colour. 14 / 15 flood from a constrained source set (the border). Here every remaining `'1'` is a legal source.

**Step-by-Step Intuition**
1. `ans = 0`. Scan row-major.
2. On `'0'`, skip.
3. On `'1'`, this cell belongs to an island you have never seen. `ans++`. *Invariant: every previous island has been fully sunk, so this `'1'` cannot belong to one of them.*
4. DFS or BFS from here: write `'0'` on every 4-dir-reachable `'1'`. *Invariant: after the flood, this component is water, and no other component has been touched (water cells are walls).*
5. Continue the scan. Return `ans`.

**Dry Run**
Grid from the example. `n=4, m=5`.

| Step | State (ans / cell / sunk so far) | Action |
|------|----------------------------------|--------|
| 0 | ans=0; scan `(0,0)='1'` | new island; ans=1; DFS sink the 2×2 |
| 1 | stack paints `(0,0),(0,1),(1,0),(1,1)` → `'0'` | 4-dir hits water; flood ends |
| 2 | scan `(0,2)…(1,4)` water | skip |
| 3 | `(2,2)='1'` | new island; ans=2; sink the single cell |
| 4 | `(3,3)='1'` | new island; ans=3; sink `(3,3)` then `(3,4)` |
| 5 | rest water | return 3 |

```text
start                  after island 1         after island 2         after island 3
1 1 0 0 0              0 0 0 0 0              0 0 0 0 0              0 0 0 0 0
1 1 0 0 0              0 0 0 0 0              0 0 0 0 0              0 0 0 0 0
0 0 1 0 0              0 0 1 0 0              0 0 0 0 0              0 0 0 0 0
0 0 0 1 1              0 0 0 1 1              0 0 0 1 1              0 0 0 0 0
ans=1                  ans=1                  ans=2                  ans=3
```

**Why Does It Work?**
4-dir connectivity is an equivalence relation on land cells. A flood from any member of a class visits the class and no other land (water blocks). Sinking prevents a second start inside the same class. Every class has at least one cell the row-major scan will find before that class is sunk — the first cell of the class in scan order — so every class is counted once.

**Java Code**

```java
class NumberOfIslands {
    public int numIslands(char[][] grid) {
        int n = grid.length, m = grid[0].length, ans = 0;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i][j] != '1') continue;
                ans++;
                dfs(grid, i, j, n, m, dirs);
            }
        }
        return ans;
    }

    private void dfs(char[][] grid, int r, int c, int n, int m, int[][] dirs) {
        grid[r][c] = '0'; // sink = visited
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
            if (grid[nr][nc] != '1') continue;
            dfs(grid, nr, nc, n, m, dirs);
        }
    }

    // BFS version of the same flood — use when n*m recursion depth is a concern
    private void bfs(char[][] grid, int sr, int sc, int n, int m, int[][] dirs) {
        ArrayDeque<int[]> q = new ArrayDeque<>();
        grid[sr][sc] = '0';
        q.add(new int[]{sr, sc});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int r = cur[0], c = cur[1];
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (grid[nr][nc] != '1') continue;
                grid[nr][nc] = '0';
                q.add(new int[]{nr, nc});
            }
        }
    }
}
```

Call `bfs(...)` in place of `dfs(...)` inside the scan if you want the queue form. Same answer, same `O(N)` time.

**Complexity**
- **Time Complexity Calculation:** each cell is written from `'1'` to `'0'` at most once and then skipped. Each cell's 4 neighbors are inspected a constant number of times. `O(N)` with `N = n*m`, `E ≈ 4N`.
- **Space Complexity Calculation:** no `vis` matrix. DFS recursion depth `O(N)` (one long island). BFS queue `O(N)` in the worst layer. Dirs array `O(1)`.

### Pattern to Remember
```text
Clue: count 4-dir blobs of land in a grid
Pattern: for each unsunk '1', ans++, flood/sink the component
Mental model: number of islands = number of flood starts
```
**Similar problems:** 6 Flood Fill (one start, paint), 7 Rotten Oranges (multi-source, time), 8 01 Matrix (multi-source, distance), 14 Surrounded Regions, 15 Number of Enclaves, Number of Distinct Islands (hash the shape), Number of Closed Islands (reject border-touching).
**Interview tip:** ask 4-dir vs 8-dir in one sentence, then sink in place unless they forbid mutating the grid.

---

## 19. Is Graph Bipartite (DFS)

### Problem Understanding
An undirected graph is bipartite if you can split vertices into two sets so that every edge runs between the sets (no edge inside a set). Equivalently: you can 2-colour the vertices with colours `{0, 1}` so adjacent vertices get different colours. Return whether the given graph is bipartite.

**Input / Output / Constraints**
- Input: `int[][] graph` — adjacency list, `graph[u]` is the neighbors of `u` (LeetCode 785)
- Output: `boolean`
- `1 ≤ V ≤ 100` on LC; treat it as general `V, E`
- Undirected, no self-loops, no parallel edges on LC. The graph may be disconnected
- Self-loop in a general graph: not bipartite (odd cycle of length 1)

**Observations**
- Bipartite ⇔ no odd-length cycle. A triangle is the smallest obstruction. An even cycle (square, hexagon) is fine.
- 2-colouring a connected component is forced once you colour one vertex: every neighbor gets the opposite colour, and a conflict is an odd cycle.
- Disconnected graphs: colour each component independently. One bad component makes the whole graph not bipartite. A lone vertex is bipartite.
- `color[u] = -1` means uncoloured. Do not use a `boolean[]` — you need three states (unseen / 0 / 1).

**Example (even cycle — true)**
```text
0 — 1
|   |
3 — 2

graph = [[1,3],[0,2],[1,3],[0,2]]
colour: 0:0, 1:1, 2:0, 3:1. Every edge 0-1. True.
```

**Example (triangle — false; single node — true)**
```text
0 — 1
 \ /
  2

graph = [[1,2],[0,2],[0,1]]
colour 0:0, 1:1, 2 wants 0 from 1 and 1 from 0 → conflict. False.
```
`graph = [[]]` (one isolated vertex) → `true`. Two components, one of them a triangle → `false`.

### How to Think About the Problem
- What should I notice first? "Two groups, edges only between groups" is 2-colouring. Odd cycle is the obstruction, but you do not enumerate cycles; you let the colouring find the contradiction.
- Which representation? Adjacency list, already given. Undirected.
- Counting / searching / ordering / minimizing → which mental model? Searching / labelling. A constraint-propagation walk.
- Which traversal is natural? DFS colouring is the request here. BFS colouring is the same idea with a queue (layer parity = colour). Both must loop over every uncoloured vertex to cover disconnected graphs.
- **Clue → Pattern:** *Try to 2-colour each component. A neighbor with the same colour is an odd cycle. Uncoloured components are independent jobs.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: try all 2^V colour assignments, check every edge. O(2^V · E)
        ↓
Observation: once u is colour c, every neighbor is forced to 1-c. The assignment is unique up to swapping colours in a component
        ↓
Optimal: DFS (or BFS) 2-colouring per component, conflict = not bipartite. O(V+E)
```

A popular wrong naive: "if the graph has a cycle, it is not bipartite". Even cycles are bipartite. The obstruction is odd length, not cyclicity.

### Brute Force Approach
- Basic idea: assign each vertex colour 0 or 1 independently (`2^V` masks). Accept a mask if every edge has different endpoint colours. Isolated vertices may take either colour.
- Why it works: the definition *is* the existence of such an assignment. Exhaustion finds it if it exists.
- Java code:

```java
class IsGraphBipartiteBrute {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int limit = 1 << n;
        for (int mask = 0; mask < limit; mask++) {
            if (valid(graph, n, mask)) return true;
        }
        return false;
    }

    private boolean valid(int[][] graph, int n, int mask) {
        for (int u = 0; u < n; u++) {
            int cu = (mask >> u) & 1;
            for (int v : graph[u]) {
                int cv = (mask >> v) & 1;
                if (cu == cv) return false;
            }
        }
        return true;
    }
}
```

- **Time Complexity Calculation:** `2^V` masks, each scans all adjacency lists once (`O(E)` directed-view of undirected edges, so `O(E)`). Total `O(2^V · E)`. Unusable past ~20 vertices.
- **Space Complexity Calculation:** `O(1)` extra besides the input (the mask is an `int`; `V ≤ 31` for this encoding). Recursion-free.
- **Why can this be improved?** Colour is forced along edges. You are retrying assignments the walk already ruled out. One DFS per component explores the only two possibilities (swap the two colours — they are the same partition) and stops at the first conflict.

### Optimal Approach
The structure being exploited is an **undirected unweighted graph** (possibly disconnected). Bipartiteness is a per-component property.

**Core Observation**
In a connected component, fixing `color[src] = 0` determines every other colour. A conflict (`color[nei] == color[u]`) means a path of even length and a path of odd length between two vertices — an odd cycle. If the component is a tree, there is never a conflict. If it has only even cycles, the two paths to any vertex have the same parity.

**Pattern Identification**
DFS 2-colouring. Equivalent BFS: colour a neighbor `1 - color[u]`, and if the neighbor is already coloured the same as `u`, fail. BFS colour is the parity of the distance from `src`.

**Step-by-Step Intuition**
1. `int[] color = new int[n]; Arrays.fill(color, -1);`
2. For every vertex `s`, if `color[s] == -1`, this is a new component. Set `color[s] = 0` and DFS. If the DFS reports a conflict, return `false`. *Invariant: every finished component is a valid 2-colouring; uncoloured vertices are in components not yet attempted.*
3. DFS(`u`): for each neighbor `v`
   - `color[v] == -1`: set `color[v] = 1 - color[u]`, recurse. Fail if the recurse fails.
   - `color[v] == color[u]`: odd cycle. Fail.
   - `color[v] == 1 - color[u]`: already consistent (back-edge of even cycle, or a cross edge inside the component). Continue.
4. If every component succeeds, return `true`.

**Dry Run**
Triangle `0-1-2-0`. `color = [-1,-1,-1]`.

| Step | State (stack / color) | Action |
|------|-----------------------|--------|
| 0 | start `s=0`; `color[0]=0` | new component |
| 1 | DFS 0, nei 1 uncoloured | `color[1]=1`, recurse |
| 2 | DFS 1, nei 0 coloured 0 ≠ 1 | consistent, skip |
| 3 | DFS 1, nei 2 uncoloured | `color[2]=0`, recurse |
| 4 | DFS 2, nei 0 coloured `0 == color[2]` | **conflict** → false |

Even cycle `0-1-2-3-0`, colours `0,1,0,1`. Last edge `3-0` is `1` vs `0`. True.

Disconnected: component A even cycle (ok) + component B triangle. The loop over `s` will colour A, then start B, then fail. You cannot skip the outer loop and only DFS from node 0.

**Why Does It Work?**
A graph is bipartite iff every component is. Inside a component the DFS assigns the unique colouring determined by `color[src]=0`. The only way this colouring fails is an edge between two vertices already forced to the same colour, which is an odd closed walk, which contains an odd cycle. If no such edge appears, the colour classes are a valid bipartition. Trees, even cycles, and disjoint unions of those all pass. A single vertex has no edge to check.

**Java Code**

```java
class IsGraphBipartite {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];
        Arrays.fill(color, -1);
        for (int s = 0; s < n; s++) {
            if (color[s] != -1) continue;
            if (!dfs(graph, s, 0, color)) return false;
        }
        return true;
    }

    private boolean dfs(int[][] graph, int u, int c, int[] color) {
        color[u] = c;
        for (int v : graph[u]) {
            if (color[v] == -1) {
                if (!dfs(graph, v, 1 - c, color)) return false;
            } else if (color[v] == c) {
                return false; // same colour on an edge → odd cycle
            }
        }
        return true;
    }

    // BFS variant: colour = layer parity. Same outer loop for disconnected graphs.
    private boolean bfs(int[][] graph, int s, int[] color) {
        ArrayDeque<Integer> q = new ArrayDeque<>();
        color[s] = 0;
        q.add(s);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : graph[u]) {
                if (color[v] == -1) {
                    color[v] = 1 - color[u];
                    q.add(v);
                } else if (color[v] == color[u]) {
                    return false;
                }
            }
        }
        return true;
    }
}
```

To use BFS as the driver, replace the body of the `s`-loop with `if (!bfs(graph, s, color)) return false;`.

**Complexity**
- **Time Complexity Calculation:** each vertex is coloured at most once, each adjacency-list entry is scanned at most once. `O(V+E)`.
- **Space Complexity Calculation:** `color` is `O(V)`. DFS recursion `O(V)` on a path. BFS queue `O(V)`. No extra `vis` — colour `-1` is "unvisited".

### Pattern to Remember
```text
Clue: split vertices into two independent sets / 2-colour / no odd cycle
Pattern: DFS or BFS 2-colouring, color[] init -1, loop over every component
Mental model: conflict = neighbor already wears my colour = odd cycle
```
**Similar problems:** 10/11 Cycle Detection in an Undirected Graph (odd vs any cycle), Possible Bipartition (LC 886), 20 Directed Cycle Detection (different obstruction, different state).
**Interview tip:** write `Arrays.fill(color, -1)` first, then the `for (s … if uncoloured)` loop. Forgetting disconnected components is the standard fail.

---

## 20. Cycle Detection in a Directed Graph (DFS)

### Problem Understanding
Given a directed graph with `V` vertices and an adjacency list, decide whether it contains a directed cycle. A cycle is a path of length ≥ 1 that starts and ends at the same vertex, following edge directions. Self-loops count. The graph may be disconnected (several weakly / strongly disconnected pieces).

**Input / Output / Constraints**
- Input: `int V`, `List<List<Integer>> adj` — 0-index, `adj.get(u)` is the out-neighbors of `u`
- Output: `boolean` — true iff a directed cycle exists
- takeUforward G-19 / GFG "Detect cycle in a directed graph". `V` typically up to `10^5`, so `O(V+E)` is required
- Directed; self-loops and disjoint components allowed

**Observations**
- The undirected trick "visited neighbor that is not my parent → cycle" is **wrong** here.
- In a directed graph you can visit a node, finish it, and later arrive at it on a *forward* or *cross* edge. That is not a cycle. A cycle is a *back* edge: an edge to a vertex still on the current DFS recursion stack (an ancestor of you in this directed walk).
- You therefore need two bits of state per vertex, not one: "have I ever started this vertex?" (`vis`) and "is it on the current path?" (`pathVis`). Equivalently, 3-colour: `0` unvisited, `1` in-stack (gray), `2` finished (black).
- After the DFS of `u` returns, `pathVis[u]` goes false, `vis[u]` stays true. Future edges into `u` are not cycles.

**Example (cycle)**
```text
0 → 1 → 2
^       |
+-------+
```
`0→1→2→0` (same as `1→2→3→1`, 0-index). True.

**Example (no cycle — the undirected-parent trap)**
```text
    0
   / \
  ↓   ↓
  1 → 2
```
Edges `0→1`, `0→2`, `1→2`. DAG. False. Self-loop `3→3` is a cycle by itself. Two components, one a DAG and one a loop → true.

### How to Think About the Problem
- What should I notice first? Direction matters. Reaching a *finished* node is not coming back to yourself.
- Which representation? Directed adjacency list, 0-index.
- Counting / searching / ordering / minimizing → which mental model? Searching for a back edge. Not the same as "is the underlying undirected graph cyclic".
- Which traversal is natural? DFS, because the recursion stack *is* the current directed path. (Kahn's algorithm / BFS indegree is the other standard detector; that is a later problem.)
- **Clue → Pattern:** *A directed cycle is a back edge onto the current DFS path. Keep a path-visited array (or gray colour) in addition to a global visited array.*

### Intuition (Brute → Better → Optimal)
```text
Brute force: from every vertex, DFS with a fresh local "on this walk" set; if you return to the start (or to any vertex on this walk), cycle. O(V(V+E))
        ↓
Observation: after a vertex's whole DFS tree is processed with no back edge, it cannot be part of a later-discovered cycle unless a back edge points into a still-live path. Finished nodes are safe to skip
        ↓
Optimal: one DFS forest, vis + pathVis (or 0/1/2 colour). O(V+E)
```

### Brute Force Approach
- Basic idea: for every start vertex `s`, walk every directed path from `s` with a path-local set. If you ever try to enter a vertex already in that set, you have a cycle. Use a fresh set per start. Do not reuse a global `vis` — that is the undirected algorithm, and it misclassifies DAGs with cross edges.
- Why it works: a directed cycle has a vertex `s` on it; a walk from `s` that follows the cycle returns to a path vertex.
- Java code:

```java
class DirectedCycleBrute {
    public boolean isCyclic(int V, List<List<Integer>> adj) {
        for (int s = 0; s < V; s++) {
            if (walkHasCycle(s, adj, new boolean[V])) return true;
        }
        return false;
    }

    private boolean walkHasCycle(int u, List<List<Integer>> adj, boolean[] onPath) {
        if (onPath[u]) return true;
        onPath[u] = true;
        for (int v : adj.get(u)) {
            if (walkHasCycle(v, adj, onPath)) return true;
        }
        onPath[u] = false;
        return false;
    }
}
```

This is already "pathVis without global vis". It is correct and can re-explore the same DAG from every source — `O(V(V+E))` on a large acyclic graph (every permutation of a chain).

- **Time Complexity Calculation:** `V` starts, each can walk `O(V+E)` in the worst DAG before the `onPath` prune. `O(V(V+E))`.
- **Space Complexity Calculation:** `onPath` is `O(V)`, recursion `O(V)`.
- **Why can this be improved?** If a vertex's entire outgoing graph was explored from some earlier start and produced no back edge, restarting from it walks the same DAG again. A global `vis` that marks *finished* subtrees lets you skip them. You still need `pathVis` for the live path; `vis` alone is the bug.

### Optimal Approach
The structure being exploited is a **directed unweighted graph**. Cycles are directed circuits; the DFS forest's back edges are exactly those circuits' closing edges.

**Core Observation**
Three kinds of directed edges relative to a DFS:

```text
tree edge     u gray → v white     exploring a new vertex, not a cycle by itself
back edge     u gray → v gray      v is an ancestor on the current path → CYCLE
forward/cross u gray → v black     v's DFS already finished → NOT a cycle
```

The DAG `0→1, 0→2, 1→2`:

```text
    0 (starts, gray)
   / \
  1   2     suppose 0 colours 1 first: 1 goes to 2, 2 finishes (black),
  \   /     1 finishes (black). Then 0 goes to 2: 2 is black. Cross/forward. No cycle.
    2
```

Undirected parent logic at `1` would see `2` already visited and not the parent of `1` (`0` is), and shout "cycle". That is the lie.

**Pattern Identification**
DFS with `vis` + `pathVis`, or 3-state colouring `0/1/2`. Same information: `pathVis[u]==true` ⇔ colour gray. Loop over all vertices for disconnected graphs. Self-loop: `u` has neighbor `u`, `pathVis[u]` is already true.

**Step-by-Step Intuition**
1. `boolean[] vis = new boolean[V]`, `boolean[] pathVis = new boolean[V]`.
2. For every `s`, if `!vis[s]` run `dfs(s)`. Any true → cycle.
3. `dfs(u)`:
   - `vis[u] = true; pathVis[u] = true;`  *Invariant: pathVis bits that are true are exactly the vertices on the directed path from the current DFS root to `u`.*
   - For each out-neighbor `v`:
     - `!vis[v]`: recurse. If recurse reports cycle, return true.
     - `vis[v] && pathVis[v]`: `v` is an ancestor on this path. Back edge. Return true.
     - `vis[v] && !pathVis[v]`: finished. Ignore.
   - `pathVis[u] = false;` // leave the path; stay globally visited. Colour goes gray → black.
   - Return false from this call.
4. If every start returns false, the DFS forest has no back edge → DAG → no directed cycle.

**Dry Run**
Cycle `0→1→2→0`. All arrays 0-index, start false.

| Step | State (call / vis / pathVis) | Action |
|------|------------------------------|--------|
| 0 | dfs(0); vis=`[1,0,0]` path=`[1,0,0]` | enter 0 |
| 1 | 0→1, unseen | dfs(1) |
| 2 | dfs(1); vis=`[1,1,0]` path=`[1,1,0]` | enter 1 |
| 3 | 1→2, unseen | dfs(2) |
| 4 | dfs(2); vis=`[1,1,1]` path=`[1,1,1]` | enter 2 |
| 5 | 2→0; vis[0] && pathVis[0] | **back edge → cycle** |

No-cycle DAG `0→1, 0→2, 1→2`.

| Step | State (call / vis / pathVis) | Action |
|------|------------------------------|--------|
| 0 | dfs(0); path[0]=1 | enter 0 |
| 1 | 0→1, unseen | dfs(1) |
| 2 | dfs(1); path[1]=1 | 1→2, unseen |
| 3 | dfs(2); path[2]=1 | 2 has no outs; path[2]=0, vis[2] stays 1. Return |
| 4 | 1 done; path[1]=0 | return to 0 |
| 5 | 0→2; vis[2] && !pathVis[2] | finished node, skip. Not a cycle |
| 6 | path[0]=0 | return false |

Self-loop at `3`: dfs(3), neighbor 3, `pathVis[3]` is true → cycle in one step.

**Why Does It Work?**
`pathVis` is the recursion stack as a set. An edge into that set closes a directed circuit. When `pathVis[u]` is cleared, every cycle that could use `u` as an *ancestor of the current walk* is already checked; any future arrival at `u` comes from outside this finished subtree, which is a forward/cross edge, not a circuit. `vis` prevents re-entering finished subtrees, which is the speedup over the brute. Completeness: every vertex is a DFS root or lives in some root's tree (outer loop), so every directed edge is classified as tree, back, or forward/cross. A cycle has a back edge in some DFS forest; if none exists, the graph is a DAG.

3-state colouring is the same machine:

```text
0 white  = !vis
1 gray   = vis && pathVis
2 black  = vis && !pathVis

dfs(u): colour 1
  for v:
    v is 0 → recurse
    v is 1 → cycle
    v is 2 → skip
  colour 2
```

**Java Code**

```java
class DirectedCycleDetection {
    public boolean isCyclic(int V, List<List<Integer>> adj) {
        boolean[] vis = new boolean[V];
        boolean[] pathVis = new boolean[V];
        for (int s = 0; s < V; s++) {
            if (vis[s]) continue;
            if (dfs(s, adj, vis, pathVis)) return true;
        }
        return false;
    }

    private boolean dfs(int u, List<List<Integer>> adj,
                        boolean[] vis, boolean[] pathVis) {
        vis[u] = true;
        pathVis[u] = true;
        for (int v : adj.get(u)) {
            if (!vis[v]) {
                if (dfs(v, adj, vis, pathVis)) return true;
            } else if (pathVis[v]) {
                return true; // back edge onto the current path
            }
            // vis && !pathVis: v finished — forward or cross edge, not a cycle
        }
        pathVis[u] = false; // leave the path; u is black
        return false;
    }

    // 3-state equivalent: 0 white, 1 gray, 2 black
    public boolean isCyclicColor(int V, List<List<Integer>> adj) {
        int[] col = new int[V];
        for (int s = 0; s < V; s++) {
            if (col[s] == 0 && dfsColor(s, adj, col)) return true;
        }
        return false;
    }

    private boolean dfsColor(int u, List<List<Integer>> adj, int[] col) {
        col[u] = 1;
        for (int v : adj.get(u)) {
            if (col[v] == 0) {
                if (dfsColor(v, adj, col)) return true;
            } else if (col[v] == 1) {
                return true;
            }
        }
        col[u] = 2;
        return false;
    }
}
```

**Complexity**
- **Time Complexity Calculation:** each vertex is greyed and blackened once. Each directed edge is examined once from its tail. `O(V+E)`.
- **Space Complexity Calculation:** `vis` + `pathVis` are `O(V)` (or one `int[] col`). Recursion stack `O(V)` on a long directed path. Adjacency list is the input.

### Pattern to Remember
```text
Clue: does a directed graph contain a cycle (self-loop, disconnected OK)
Pattern: DFS with vis + pathVis (or 0/1/2 colour); only gray→gray is a cycle
Mental model: undirected "visited and not parent" lies here — finished nodes are safe
```
**Similar problems:** 10/11 Cycle Detection in an Undirected Graph (parent, one vis array), 19 Is Graph Bipartite (odd cycle ⊂ cycle), Topological Sort / Kahn's algorithm (cycle iff the topo queue cannot consume all vertices), Eventual Safe States (nodes that cannot reach a cycle), Course Schedule I (directed cycle = cannot finish).
**Interview tip:** draw `0→1, 0→2, 1→2` before you write code, and say why a single `vis` array would return true on this DAG. Then write the `pathVis[u] = false` line and explain it: "u leaves the stack; it is finished, not deleted."








# PART C — Topological Sort and Problems

A topological order exists if and only if the directed graph is a DAG — one directed cycle and no linear extension of the edges can exist. Two algorithms compute it: DFS that pushes a node in post-order onto an `ArrayDeque` then pops (reverse finish order), and Kahn's BFS that peels indegree-0 vertices. The same Kahn leftover (`indegree > 0` after the peel) is a directed-cycle detector, which is exactly the boolean "can I finish all courses". Reverse the edges and the peel answers a different question: which nodes can only reach a terminal — eventual safe states. Alien Dictionary is the same DAG with letters as vertices and each adjacent word-pair contributing one inequality edge.

## 21. Topological Sort (DFS)

### Problem Understanding

Given a directed graph on `n` vertices, emit a linear order of the vertices such that for every edge `u → v`, `u` appears before `v`. The graph is promised to be a DAG in the classic statement (takeUforward G-21); if it might contain a cycle you must detect that first (problems 20 and 23) because a cyclic graph has no topological order.

**Input / Output / Constraints**
- Input: `n` vertices, labelled `0 .. n-1` (or `1 .. n` — allocate `n+1` and loop `1 .. n`; this write-up uses `0 .. n-1`), plus a list of directed edges.
- Output: `int[]` or `List<Integer>` — any valid topological order.
- Constraints (typical): `1 ≤ n ≤ 10^5`, `0 ≤ E ≤ 10^5`. Must be `O(V + E)`.
- The graph may be disconnected. Isolated vertices still appear in the order.

**Observations**
- Undirected graphs do not have a topological order. Direction is the whole point: `u` is a prerequisite of `v`.
- Many valid orders can exist. Any one is accepted.
- A vertex is "ready to place at the end of the remaining suffix" only once every vertex it points to has been placed. That is post-order on the directed edges.
- Pre-order DFS is **not** a topological order. Pushing before the recursive calls is the standard bug.

**Example**
```text
n = 6, edges:
5 → 0, 5 → 2, 4 → 0, 4 → 1, 2 → 3, 3 → 1

      5 ──► 0 ◄── 4
      │           │
      ▼           ▼
      2 ──► 3 ──► 1
```
One valid order: `5 4 2 3 1 0`. Also valid: `4 5 2 3 0 1`, `4 5 2 3 1 0`. Invalid: `2 5 …` because `5 → 2` requires `5` before `2`.

Second example (the pre-order trap): `5 → 2 → 3`. Starting DFS at `2` and pushing in pre-order yields `2, 3, 5, …` — `5` sits after `2`, which violates `5 → 2`. Post-order from the same start yields `3, 2, …` then `5` later, which is valid.

### How to Think About the Problem

- What should I notice first? Every edge is a "before" constraint. You are asked for an ordering, not a count or a shortest path.
- Which representation? Directed adjacency list. `adj.get(u)` = vertices that cannot be placed until `u` has been placed, if we think "prereq → course". In this problem `u → v` means `u` before `v`.
- Counting / searching / ordering / minimizing → which mental model? **Ordering under precedence.** That is topological sort, not BFS-levels, not greedy-by-degree.
- Which traversal is natural? DFS. A node is finished only after every node reachable from it along directed edges is finished. Reverse the finish sequence.
- **Clue → Pattern:** *Directed precedence constraints, graph is a DAG → reverse DFS post-order.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: generate every permutation of 0..n-1, accept the
             first that satisfies pos[u] < pos[v] for every edge.
             O(V! · (V + E))
        ↓
Observation: in a DFS, u is finished only after every descendant
             in the directed graph is finished. So finish-time
             of u is later than finish-time of every v with u → v.
        ↓
Optimal: DFS, push u after exploring adj[u], then pop the deque.
         Reverse finish order = topological order. O(V + E)
```

### Brute Force Approach

**Basic idea.** Enumerate permutations of the vertex set with backtracking. A permutation `p` is legal iff for every edge `u → v`, `u` occurs to the left of `v`. Return the first legal one.

**Why it works.** The definition of topological order is exactly "a permutation that respects every edge". Checking all permutations is complete. If none pass, the graph is not a DAG.

```java
import java.util.*;

class TopologicalSortDfs {
    public int[] bruteTopo(int n, int[][] edges) {
        List<List<Integer>> adj = build(n, edges);
        int[] pos = new int[n];
        int[] perm = new int[n];
        boolean[] used = new boolean[n];
        int[] ans = new int[0];
        int[] found = dfsPerm(0, n, used, perm, pos, adj);
        return found == null ? ans : found;
    }

    private int[] dfsPerm(int i, int n, boolean[] used, int[] perm,
                          int[] pos, List<List<Integer>> adj) {
        if (i == n) {
            for (int u = 0; u < n; u++) {
                for (int v : adj.get(u)) {
                    if (pos[u] > pos[v]) return null;
                }
            }
            return perm.clone();
        }
        for (int v = 0; v < n; v++) {
            if (used[v]) continue;
            used[v] = true;
            perm[i] = v;
            pos[v] = i;
            int[] got = dfsPerm(i + 1, n, used, perm, pos, adj);
            if (got != null) return got;
            used[v] = false;
        }
        return null;
    }

    private List<List<Integer>> build(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);
        return adj;
    }
}
```

**Time Complexity Calculation:**
Up to `V!` permutations. Validating one permutation walks every edge: `O(V + E)`. Total `O(V! · (V + E))`. Dead at `n ≳ 10`.

**Space Complexity Calculation:**
Recursion depth `O(V)` plus `used` / `perm` / `pos`: `O(V)`. Adjacency `O(V + E)`.

**Why can this be improved?**
You do not need every permutation. DFS already walks each vertex after its descendants. The finish stack *is* the permutation, built in `O(V + E)`. Factorial search is the wrong mental model for a local precedence constraint.

The other naïve idea — push the vertex onto the deque *before* recursing (pre-order) — is not "slow", it is **wrong**. It emits a DFS discovery order, which does not respect `u → v`.

### Optimal Approach

You are exploiting a **directed acyclic graph**. The structure that makes reverse post-order legal is acyclicity: the "finished-after-descendants" relation is then a strict partial order.

**Core Observation**
If `u → v`, a DFS from `u` cannot finish `u` until `v` (and everything `v` can reach) has finished. So in the finish sequence, `v` appears before `u`. Reversing that sequence puts `u` before `v`. That is the topological condition.

**Pattern Identification**
DFS on a directed graph + post-order collect + reverse. Same skeleton as "finish times" in Kosaraju (problem 32). Do **not** reuse undirected-BFS / parent-check thinking.

**Step-by-Step Intuition**
1. Build the directed adjacency list.
2. `vis[u] = true` the moment you enter `u`, so you never re-enter a vertex (the graph is a DAG, so this is enough; a cycle would require `pathVisited` — problem 20).
3. Recurse on every unvisited neighbour in `adj[u]`.
4. *Invariant: `u` is pushed onto the deque only after every vertex reachable from `u` along directed edges has already been pushed.*
5. After all components are processed, pop the deque. The pop order is reverse finish order = a topological order.
6. If the input might contain a cycle, run the `pathVisited` check of problem 20 first, or switch to Kahn (problem 22) where the cycle comes free.

**Dry Run**

Graph: `5→0, 5→2, 4→0, 4→1, 2→3, 3→1`. Outer loop starts DFS at `0, 1, 2, …` in index order. Deque shown bottom → top (push/pop at the top).

| Step | Call | vis | deque (bottom→top) | Action |
|------|------|-----|--------------------|--------|
| 1 | `dfs(0)` | `{0}` | `[]` | `0` has no outgoing. Push `0`. |
| 2 | `dfs(1)` | `{0,1}` | `[0]` | `1` has no outgoing. Push `1`. |
| 3 | `dfs(2)` | `{0,1,2}` | `[0, 1]` | `2 → 3`, recurse. |
| 4 | `dfs(3)` | `{0,1,2,3}` | `[0, 1]` | `3 → 1`, `1` already vis. Push `3`. |
| 5 | return to `2` | `{0,1,2,3}` | `[0, 1, 3]` | `2` finished. Push `2`. |
| 6 | `dfs(4)` | `{0..4}` | `[0, 1, 3, 2]` | `4 → 0` vis, `4 → 1` vis. Push `4`. |
| 7 | `dfs(5)` | `{0..5}` | `[0, 1, 3, 2, 4]` | `5 → 0` vis, `5 → 2` vis. Push `5`. |
| pop | — | — | — | `5, 4, 2, 3, 1, 0` |

Every edge points left-to-right in `5 4 2 3 1 0`. Check: `5` before `0` and `2`; `4` before `0` and `1`; `2` before `3`; `3` before `1`.

**Why Does It Work?**
On a DAG, the recursive structure of DFS is a valid linear extension of reachability: finish(`u`) > finish(`v`) whenever `u` can reach `v`. Reversing finish times therefore puts every vertex before everything it can reach, and in particular before every out-neighbour. If a cycle existed the finish-time argument would be circular (`u` reaches `v` reaches `u`) and the "order" you popped would not be topological — that is why this code is specified on a DAG and why you cycle-check when the promise is missing.

**Java Code**

```java
import java.util.*;

class TopologicalSortDfs {
    public int[] topoSort(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);

        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> st = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            if (!vis[i]) dfs(i, adj, vis, st);
        }

        int[] order = new int[n];
        int k = 0;
        while (!st.isEmpty()) order[k++] = st.pop();
        return order;
    }

    private void dfs(int u, List<List<Integer>> adj, boolean[] vis,
                     ArrayDeque<Integer> st) {
        vis[u] = true;
        for (int v : adj.get(u)) {
            if (!vis[v]) dfs(v, adj, vis, st);
        }
        st.push(u); // all directed descendants have already been pushed
    }
}
```

If vertices are labelled `1 .. n`, allocate `n + 1`, loop `i = 1 .. n`, and ignore index `0` in the output.

**Complexity**

**Time Complexity Calculation:**
Each vertex is entered once (`vis`). Each edge is examined once from its source. Building the adjacency list is `O(E)`. Total `O(V + E)`.

**Space Complexity Calculation:**
`adj` is `O(V + E)`. `vis` is `O(V)`. The deque holds at most `V` vertices. Recursion depth is `O(V)` in a chain. Total `O(V + E)` extra, or `O(V)` auxiliary besides the graph.

### Pattern to Remember

```text
Clue: directed "u must come before v", graph is (promised) a DAG
Pattern: DFS post-order push onto ArrayDeque, pop = reverse finish order
Mental model: a node is placed only after every node it points to is placed
```

**Similar problems:** 22 (same order, BFS peel), 25 (Course Schedule II — emit the order), 27 (letters instead of course ids), 32 (Kosaraju reuses finish times).

**Interview tip:** If they ask you to code DFS topo, the follow-up is "where did you push, and what happens on a cycle" — push *after* the loop, and say out loud that this is invalid on a cyclic graph.

## 22. Topological Sort — Kahn's Algorithm (BFS)

### Problem Understanding

Same output as problem 21: a linear order of a DAG. Different engine. Instead of reverse DFS finish times you repeatedly peel vertices whose current indegree is 0 — they have no unmet prerequisites.

**Input / Output / Constraints**
- Same as 21: `n`, directed edges, `0 .. n-1`.
- Output: `int[]` any valid topo order; empty array if you also want to refuse cycles.
- Constraints: `n, E ≤ 10^5` so `O(V + E)` is required.

**Observations**
- Indegree 0 means "nothing is still waiting to come before me". Those vertices are legal to emit next.
- Emitting `u` removes `u → v` for every out-neighbour, which drops `indeg[v]`. Newly-zero vertices join the queue.
- If after the peel some vertex still has `indeg > 0`, it was waiting on a cycle (problem 23). On a DAG this never happens.
- Queue order among current zeros is free: any of them is a valid next vertex. That is why many topological orders exist.

**Example**
Same graph as 21:

```text
      5 ──► 0 ◄── 4
      │           │
      ▼           ▼
      2 ──► 3 ──► 1
```

Indegree: `0:2, 1:2, 2:1, 3:1, 4:0, 5:0`. One Kahn order (queue seeded `4` then `5`): `4 5 0 2 3 1`. Still valid. Different from the DFS order `5 4 2 3 1 0`. Both correct.

### How to Think About the Problem

- What should I notice first? You want sources first, then whatever those sources unlock. That is a queue, not a recursion stack.
- Which representation? Directed adj + an `int[] indeg` of size `V`.
- Counting / searching / ordering / minimizing → which mental model? **Peel sources.** Same shape as "process all indegree-0, like leaves in a reverse tree".
- Which traversal is natural? BFS. Depth has no meaning here; the queue is only a worklist of currently-legal vertices.
- **Clue → Pattern:** *Repeatedly emit indegree-0 vertices → Kahn's algorithm (BFS topological sort).*

### Intuition (Brute → Better → Optimal)

```text
Brute force: all permutations (problem 21). O(V! · (V + E))
        ↓
Observation: the vertices that can start the order are exactly
             indegree 0. After you take them, new zeros appear.
             You never need to guess.
        ↓
Optimal: queue of current zeros, peel, decrement neighbours.
         O(V + E). processed != V ⇒ cycle (problem 23).
```

### Brute Force Approach

**Basic idea.** Same permutation search as problem 21. A slightly less naïve idea: at each position of the order, try every remaining vertex whose *original* indegree is 0 — that still fails because indegree is dynamic.

**Why it works.** Exhaustive search of the symmetric group finds a linear extension if one exists.

```java
import java.util.*;

class TopologicalSortKahn {
    // Identical permutation search as TopologicalSortDfs.bruteTopo.
    // Omitted here — see problem 21. The naïve *Kahn-shaped* bug is below.

    // WRONG: enqueue a neighbour every time you decrement, not when it hits 0.
    // Vertex 0 (indeg 2) would be emitted twice, once per incoming edge.
    public int[] brokenKahn(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            indeg[e[1]]++;
        }
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
        List<Integer> order = new ArrayList<>();
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                indeg[v]--;
                q.add(v); // bug: v may still have indeg > 0
            }
        }
        return order.stream().mapToInt(i -> i).toArray();
    }
}
```

**Time Complexity Calculation:**
Permutation brute: `O(V! · (V + E))`. The broken Kahn is `O(V + E)` but emits vertices before their prerequisites.

**Space Complexity Calculation:**
`O(V + E)` for adj + indegree + queue.

**Why can this be improved?**
The permutation brute ignores the local rule "a vertex becomes legal the moment its last incoming edge is gone". The broken Kahn sees the queue but forgets the `== 0` gate. One integer test turns the wrong algorithm into the optimal one.

### Optimal Approach

You are exploiting a **DAG**, processed as a **directed unweighted** graph whose sources are always safe to emit.

**Core Observation**
In a DAG there is always at least one indegree-0 vertex (a source). Removing it and its outgoing edges leaves a smaller DAG. Induction on `V` produces a topological order. If at some point no source remains but vertices are left, those vertices form (or feed from) a cycle.

**Pattern Identification**
BFS worklist + indegree array. Same peel used for Course Schedule, Safe States (on the reversed graph), and Alien Dictionary.

**Step-by-Step Intuition**
1. Build `adj` and `indeg[v]++` for every edge `u → v`.
2. Seed the queue with every `i` where `indeg[i] == 0`.
3. While the queue is not empty: pop `u`, append `u` to the order, and for each `v` in `adj[u]` do `indeg[v]--`; if it hits 0, enqueue `v`.
4. *Invariant: every vertex in the queue has had all of its incoming edges already processed, so every prerequisite of it is already in `order`.*
5. If `order.length != n`, the leftover vertices have `indeg > 0` forever — a cycle. Return `new int[0]` (or throw) rather than a fake order.

**Dry Run**

Same graph. `indeg = [2, 2, 1, 1, 0, 0]` for nodes `0 .. 5`. Queue is FIFO; we insert `4` then `5`.

| Step | queue | indeg `[0,1,2,3,4,5]` | popped | order | Action |
|------|-------|------------------------|--------|-------|--------|
| init | `[4, 5]` | `[2, 2, 1, 1, 0, 0]` | — | `[]` | sources `4, 5` |
| 1 | `[5]` | `[1, 1, 1, 1, 0, 0]` | `4` | `[4]` | `4→0`, `4→1` |
| 2 | `[0, 2]` | `[0, 1, 0, 1, 0, 0]` | `5` | `[4, 5]` | `5→0` hits 0, `5→2` hits 0 |
| 3 | `[2]` | `[0, 1, 0, 1, 0, 0]` | `0` | `[4, 5, 0]` | `0` has no outgoing |
| 4 | `[3]` | `[0, 1, 0, 0, 0, 0]` | `2` | `[4, 5, 0, 2]` | `2→3` hits 0 |
| 5 | `[1]` | `[0, 0, 0, 0, 0, 0]` | `3` | `[4, 5, 0, 2, 3]` | `3→1` hits 0 |
| 6 | `[]` | `[0, 0, 0, 0, 0, 0]` | `1` | `[4, 5, 0, 2, 3, 1]` | done |

Processed count `6 == V`. No cycle. Every edge points left-to-right in the order.

**Why Does It Work?**
A vertex is enqueued only when its indegree hits 0, which means every incoming edge was decremented, which means every predecessor was already popped into `order`. So when `u` is written, all "must-come-before-`u`" vertices are already written. On a DAG every vertex eventually hits indegree 0; on a cyclic graph the cycle's vertices never do.

**Java Code**

```java
import java.util.*;

class TopologicalSortKahn {
    public int[] topoSort(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            indeg[e[1]]++;
        }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);

        int[] order = new int[n];
        int k = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[k++] = u;
            for (int v : adj.get(u)) {
                indeg[v]--;
                if (indeg[v] == 0) q.add(v);
            }
        }
        if (k != n) return new int[0]; // leftover indeg > 0 ⇒ cycle
        return order;
    }
}
```

**DFS-topo vs Kahn**

| | DFS (problem 21) | Kahn (problem 22) |
|---|---|---|
| Engine | recursion, reverse post-order | BFS worklist, peel indegree 0 |
| Extra state | `vis[]` + finish deque | `indeg[]` + queue |
| Cycle | not free; needs `pathVisited` | `k != n` after the peel |
| Recursion | `O(V)` stack, can blow on a chain | none |
| Order produced | depends on adj iteration + start order | depends on the order zeros are seeded |
| Interview ask | "why reverse the stack?" | "why does leftover mean a cycle?" |

Both are `O(V + E)`. Prefer Kahn when the follow-up is cycle detection or "return empty if impossible". Prefer DFS when you already have a recursion-stack cycle check, or when you need finish times for Kosaraju later.

**Complexity**

**Time Complexity Calculation:**
Each vertex enqueued and dequeued at most once. Each edge decrements indegree once. Init of `indeg` walks `E`. Total `O(V + E)`.

**Space Complexity Calculation:**
`adj` `O(V + E)`, `indeg` `O(V)`, queue `O(V)`, `order` `O(V)`. Auxiliary besides the graph: `O(V)`.

### Pattern to Remember

```text
Clue: DAG ordering, or "process a node only when all prerequisites are done"
Pattern: indegree[], queue the zeros, peel, decrement neighbours
Mental model: sources first; leftover indegree > 0 is a directed cycle
```

**Similar problems:** 21 (DFS dual), 23 (the leftover test as a boolean), 24 / 25 (courses), 26 (same peel on the reversed graph), 27 (PriorityQueue instead of ArrayDeque for lex-smallest).

**Interview tip:** Say the invariant out loud — "queue holds vertices whose remaining indegree is 0, so every prerequisite is already in the order" — before you touch the keyboard.

## 23. Detect a Cycle in a Directed Graph (BFS / Kahn)

### Problem Understanding

takeUforward G-23. Same directed graph, different question: does a directed cycle exist? Problem 20 answered this with DFS + `pathVisited`. Here you reuse Kahn: if you cannot peel all `V` vertices, the leftover vertices are stuck with indegree > 0, which is possible only if they sit on a cycle or are reachable only through one.

**Input / Output / Constraints**
- Input: `n`, directed edges (or an adj list). Graph may be disconnected, may have self-loops.
- Output: `boolean` — `true` if a directed cycle exists.
- Constraints: `n, E ≤ 10^5`. Self-loop `[u, u]` is a cycle of length 1.

**Observations**
- Kahn on a DAG peels everyone. Kahn on a cyclic graph peels only the vertices that do not depend on the cycle.
- Vertices *downstream of* a cycle (a chain feeding out of it) also stay at indegree > 0 if their only in-edges come from the cycle. You do not identify the cycle vertices uniquely — you only detect that a cycle exists.
- Self-loop: `indeg[u]` starts at least 1 and nothing other than `u` can decrement it before `u` is processed, so `u` never enters the queue.
- This is often the interview-preferred directed-cycle test: no recursion, cycle is the `k != n` fall-through.

**Example**
```text
0 → 1 → 2 → 0     (cycle)
3 → 4             (DAG component)

n = 5
indeg = [1, 1, 1, 0, 1]
```
Peel `3`, then `4`. Count `2 < 5` → cycle. Leftover: `0, 1, 2`.

Second example (no cycle): the graph of problem 21. Count `6 == 6` → no cycle.

Third example (self-loop): `n = 1`, edges `0 → 0`. Queue empty, count `0 < 1` → cycle.

### How to Think About the Problem

- What should I notice first? "Is there a directed cycle?" is the complement of "does a topological order exist?"
- Which representation? Same as 22: directed adj + indegree.
- Counting / searching / ordering / minimizing → which mental model? You are **counting** how many vertices Kahn can emit. The order itself is discarded.
- Which traversal is natural? BFS-Kahn. DFS + pathVisited (problem 20) is the other correct answer; pick one and know the other.
- **Clue → Pattern:** *Directed cycle? ↔ Kahn processed count `< V`.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: from every u, enumerate simple directed paths;
             if a neighbour is already on the current path, cycle.
             Exponential in the number of paths.
        ↓
Observation: a topo order exists iff the graph is a DAG.
             Kahn either emits everyone or gets stuck.
        ↓
Optimal: Kahn, return k != n. O(V + E)
         (DFS 3-colour / pathVisited is the same complexity;
          see problem 20)
```

### Brute Force Approach

**Basic idea.** For each start vertex, DFS and keep the recursion path in a `boolean[] onPath`. If you follow an edge to a vertex already on the path, you found a cycle. Backtrack `onPath` when you return. This *is* the DFS algorithm of problem 20 if you also keep a global `vis` so you do not restart inside a finished subtree. Without `vis` it is exponential.

**Why it works.** A directed cycle is a path that returns to a vertex still on the current path. Checking every path finds it. The naïve version without `vis` revisits the same DAG-fringe exponentially often.

```java
import java.util.*;

class DirectedCycleKahn {
    public boolean bruteHasCycle(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);

        boolean[] vis = new boolean[n];
        boolean[] onPath = new boolean[n];
        for (int i = 0; i < n; i++) {
            if (!vis[i] && dfs(i, adj, vis, onPath)) return true;
        }
        return false;
    }

    private boolean dfs(int u, List<List<Integer>> adj,
                        boolean[] vis, boolean[] onPath) {
        vis[u] = true;
        onPath[u] = true;
        for (int v : adj.get(u)) {
            if (!vis[v]) {
                if (dfs(v, adj, vis, onPath)) return true;
            } else if (onPath[v]) {
                return true; // back-edge to the current path
            }
        }
        onPath[u] = false;
        return false;
    }
}
```

That DFS is already `O(V + E)` once `vis` is present — it is problem 20, not a toy. The thing that is actually naïve is dropping `vis` and re-exploring from every vertex as a fresh start: then a diamond DAG of width `w` and depth `d` costs `O(w^d)`.

**Time Complexity Calculation:**
Correct DFS: `O(V + E)`. Path-enumerating naïve: exponential. Pairwise "does `u` reach `v` and `v` reach `u`" via `V` BFS runs: `O(V · (V + E))`.

**Space Complexity Calculation:**
`O(V)` for `vis` / `onPath` / recursion, plus `O(V + E)` adj.

**Why can this be improved?**
You already have a linear DFS answer (problem 20). Kahn is not asymptotically faster; it is **operationally** better in interviews: iterative, and the boolean falls out of code you needed anyway for Course Schedule. The naïve "DFS without `pathVisited`" — treating a previously *finished* vertex as a cycle, the undirected trick — is wrong on directed graphs. `0 → 1 ← 2` is a DAG; a second visit to `1` is not a cycle.

### Optimal Approach

You are exploiting a **directed** graph (possibly with cycles). Kahn's peel is a complete DAG recogniser.

**Core Observation**
Every vertex not on (or depending on) a directed cycle eventually loses all incoming edges and is peeled. Vertices on a cycle keep a circulating indegree of at least 1. Therefore `processed < V` iff a directed cycle exists.

**Pattern Identification**
Copy problem 22. Replace the returned `int[]` with `k != n`. One extra integer.

**Step-by-Step Intuition**
1. Build adj + indegree, queue the zeros — identical to 22.
2. Pop, decrement, enqueue-on-zero. Increment `k` on every pop.
3. *Invariant: after the loop, every vertex with `indeg == 0` has been counted in `k`. Anyone left has `indeg > 0` and always will.*
4. Return `k != n` (true = cycle). Self-loops and disconnected cyclic components are handled: they never seed the queue.

**Dry Run**

Graph: `0→1→2→0`, `3→4`. `indeg = [1, 1, 1, 0, 1]`.

| Step | queue | indeg `[0,1,2,3,4]` | popped | k | Action |
|------|-------|----------------------|--------|---|--------|
| init | `[3]` | `[1, 1, 1, 0, 1]` | — | 0 | only `3` is a source |
| 1 | `[4]` | `[1, 1, 1, 0, 0]` | `3` | 1 | `3→4` hits 0 |
| 2 | `[]` | `[1, 1, 1, 0, 0]` | `4` | 2 | `4` has no outgoing |
| stop | — | leftover `0,1,2` | — | 2 | `2 < 5` → cycle |

The cycle `0→1→2→0` never produces a zero. Compare to problem 20: DFS would mark `onPath[0]=true`, walk `1`, `2`, then edge `2→0` with `onPath[0]` still true — same yes, different witness.

**Why Does It Work?**
If a directed cycle `C` exists, every `v ∈ C` has at least one predecessor in `C`. Those predecessors are never peeled (circular wait), so no vertex of `C` ever reaches indegree 0. Conversely if there is no cycle, the graph is a DAG, problem 22 peels everyone, `k == n`. The argument does not need to name the cycle vertices.

**Java Code**

```java
import java.util.*;

class DirectedCycleKahn {
    public boolean isCyclic(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            indeg[e[1]]++;
        }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);

        int k = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            k++;
            for (int v : adj.get(u)) {
                indeg[v]--;
                if (indeg[v] == 0) q.add(v);
            }
        }
        return k != n;
    }
}
```

Same code as problem 22 with a boolean return. In an interview, write *one* Kahn helper and use it for 22, 23, 24, 25.

**Complexity**

**Time Complexity Calculation:**
Identical to Kahn: each vertex and each edge once. `O(V + E)`.

**Space Complexity Calculation:**
`O(V + E)` adj, `O(V)` indegree and queue. No recursion. That is the practical reason this is preferred over problem 20 on a chain of `10^5` vertices (DFS recursion would overflow the default Java stack).

### Pattern to Remember

```text
Clue: "does this directed graph contain a cycle?"
Pattern: Kahn peel; return processed != V
Mental model: leftover indegree > 0 is the cycle (or only reachable through one)
```

**Similar problems:** 20 (DFS `pathVisited` dual), 22 (same code, return the order), 24 (Course Schedule I is this boolean with a modelling twist).

**Interview tip:** When they say "detect a cycle in a *directed* graph", do not reach for the undirected parent-check. Name both answers (DFS pathVisited, Kahn leftover) and implement Kahn unless they asked for recursion.

## 24. Course Schedule I

### Problem Understanding

LeetCode 207 Medium. You have `numCourses` labelled `0 .. numCourses-1` and a list of prerequisites. `prerequisites[i] = [a, b]` means you must take course `b` *before* course `a`. Return whether you can finish all courses.

**Input / Output / Constraints**
- Input: `int numCourses`, `int[][] prerequisites` where each row is `[a, b]`.
- Output: `boolean`.
- Constraints: `1 ≤ numCourses ≤ 2000`, `0 ≤ prerequisites.length ≤ 5000`. Self-prereq `[1, 1]` is allowed by the statement and is a cycle.
- Edge: empty `prerequisites` → every course is free → `true`. Disconnected courses (never mentioned) are free → still `true` as long as the mentioned ones form a DAG.

**Observations**
- This is directed cycle detection. You can finish iff the prerequisite graph is a DAG.
- **Edge direction is the problem.** `[a, b]` ⇒ `b` before `a` ⇒ edge `b → a` (arrow = "unlocks"). Reversing it silently inverts every answer.
- Isolated courses have indegree 0 and are taken immediately.
- Multiple edges between the same pair: indegree counts them; you should still decrement once per stored edge. Building adj with duplicates is correct, only slightly wasteful.

**Example**
```text
numCourses = 2, prerequisites = [[1, 0]]
  0 → 1     (take 0, then 1)
  true

numCourses = 2, prerequisites = [[1, 0], [0, 1]]
  0 ⇄ 1
  false

numCourses = 5, prerequisites = []
  five isolated vertices
  true

numCourses = 1, prerequisites = [[0, 0]]
  self-cycle
  false
```

Worked graph for the dry run:
```text
numCourses = 4
prerequisites = [[1,0],[2,0],[3,1],[3,2]]
  0 → 1 → 3
  0 → 2 → 3
  true (any of 0,1,2,3 or 0,2,1,3)
```

### How to Think About the Problem

- What should I notice first? "Can you finish" is not asking for an order. It is asking whether an order *exists*. That is "is this a DAG?".
- Which representation? Courses = vertices. `[a, b]` → directed edge `b → a`.
- Counting / searching / ordering / minimizing → which mental model? Cycle detection / topological sort. Counting how many courses Kahn takes.
- Which traversal is natural? Kahn (matches 23) or DFS pathVisited (matches 20). Both are accepted.
- **Clue → Pattern:** *Prerequisites + "can you finish all" → directed cycle detection on b→a.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: try every order of the n courses, check each against
             the prerequisite pairs. O(n! · E)
        ↓
Observation: an order exists iff there is no directed cycle in
             the "b unlocks a" graph.
        ↓
Optimal: Kahn (or DFS pathVisited). Finishable iff processed == n.
         O(n + E)
```

### Brute Force Approach

**Basic idea.** Backtracking over permutations of courses. A prefix is illegal as soon as you place `a` without having already placed every `b` with `[a, b]` in the list. Return true on the first complete placement.

**Why it works.** You search the space of all schedules. If a valid schedule exists you will try it (or a rearrangement that is also valid).

```java
import java.util.*;

class CourseSchedule {
    public boolean bruteCanFinish(int n, int[][] prerequisites) {
        List<List<Integer>> need = new ArrayList<>();
        for (int i = 0; i < n; i++) need.add(new ArrayList<>());
        for (int[] p : prerequisites) need.get(p[0]).add(p[1]); // a needs b

        boolean[] taken = new boolean[n];
        return dfs(0, n, taken, need);
    }

    private boolean dfs(int placed, int n, boolean[] taken,
                        List<List<Integer>> need) {
        if (placed == n) return true;
        for (int c = 0; c < n; c++) {
            if (taken[c]) continue;
            boolean ok = true;
            for (int b : need.get(c)) if (!taken[b]) { ok = false; break; }
            if (!ok) continue;
            taken[c] = true;
            if (dfs(placed + 1, n, taken, need)) return true;
            taken[c] = false;
        }
        return false;
    }
}
```

**Time Complexity Calculation:**
Worst case a complete DAG of one chain still has the search branching at disconnected free courses. Upper bound `O(n! · n)` if each placement scans needs. `n = 2000` is impossible.

**Space Complexity Calculation:**
`O(n + E)` for the need-list, `O(n)` recursion.

**Why can this be improved?**
You are rediscovering Kahn's queue by hand: the courses you try at each step are exactly the ones whose prerequisites are all taken, i.e. indegree 0 in the residual graph. Computing that set with an indegree array is linear; guessing it with backtracking is factorial. Direction bugs in the brute (`need.get(b).add(a)` swapped) are the same bugs that sink the optimal code — fix the model first.

### Optimal Approach

You are exploiting a **directed** graph of courses, and the theorem "finishable ⇔ DAG".

**Core Observation**
`[a, b]` means `b` is a prerequisite of `a`, so in the "unlocks" graph the edge is `b → a`. A cycle of unlocks is a circular wait. Kahn peels every course that is not waiting on a circular wait.

**Pattern Identification**
Problem 23 on a modelled graph. Same peel, boolean `taken == numCourses`.

**Step-by-Step Intuition**
1. Allocate `n` empty lists and an `indeg[n]`.
2. For each `[a, b]`: `adj.get(b).add(a)` and `indeg[a]++`. (Read it: "`b` unlocks `a`, `a` gained a prerequisite".)
3. Queue every course with `indeg == 0` — including courses that never appear in `prerequisites`.
4. Peel. Count.
5. *Invariant: `taken` is the number of courses whose entire prerequisite set has already been taken.*
6. Return `taken == numCourses`.

**Dry Run**

`n = 4`, `prereqs = [[1,0],[2,0],[3,1],[3,2]]`. Edges: `0→1, 0→2, 1→3, 2→3`. `indeg = [0, 1, 1, 2]`.

| Step | queue | indeg `[0,1,2,3]` | popped | taken | Action |
|------|-------|-------------------|--------|-------|--------|
| init | `[0]` | `[0, 1, 1, 2]` | — | 0 | only 0 is free |
| 1 | `[1, 2]` | `[0, 0, 0, 2]` | `0` | 1 | unlocks 1 and 2 |
| 2 | `[2]` | `[0, 0, 0, 1]` | `1` | 2 | `1→3`, indeg 3 = 1 |
| 3 | `[3]` | `[0, 0, 0, 0]` | `2` | 3 | `2→3` hits 0 |
| 4 | `[]` | `[0, 0, 0, 0]` | `3` | 4 | `4 == n` → true |

Cycle variant: add `[0, 3]`. Then `indeg[0]` starts at 1. Queue empty from the start (or empties before 4). `taken < 4` → false.

**Why Does It Work?**
A student can take a course exactly when every prerequisite is already taken. That is the indegree-0 rule. If every course eventually becomes takeable, a schedule exists. If not, the leftover set has a circular wait. DFS pathVisited discovers the same circular wait as a back-edge on the current chain of "I am currently taking / depending on".

**Java Code**

```java
import java.util.*;

class CourseSchedule {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            // [a, b] ⇒ take b before a ⇒ edge b → a
            adj.get(p[1]).add(p[0]);
            indeg[p[0]]++;
        }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) if (indeg[i] == 0) q.add(i);

        int taken = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            taken++;
            for (int v : adj.get(u)) {
                indeg[v]--;
                if (indeg[v] == 0) q.add(v);
            }
        }
        return taken == numCourses;
    }

    // DFS dual (problem 20). true = cycle found = cannot finish.
    public boolean canFinishDfs(int n, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] p : prerequisites) adj.get(p[1]).add(p[0]);

        int[] state = new int[n]; // 0 unvis, 1 on path, 2 done
        for (int i = 0; i < n; i++) {
            if (state[i] == 0 && cycle(i, adj, state)) return false;
        }
        return true;
    }

    private boolean cycle(int u, List<List<Integer>> adj, int[] state) {
        state[u] = 1;
        for (int v : adj.get(u)) {
            if (state[v] == 1) return true;
            if (state[v] == 0 && cycle(v, adj, state)) return true;
        }
        state[u] = 2;
        return false;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Build adj `O(E)`. Kahn visits each course and each unlock edge once: `O(n + E)`. DFS dual is the same bound, plus `O(n)` recursion depth.

**Space Complexity Calculation:**
`O(n + E)` adj, `O(n)` indegree and queue (Kahn) or state + call stack (DFS).

### Pattern to Remember

```text
Clue: courses + prerequisites + "can you finish"
Pattern: edge b→a from [a,b]; Kahn leftover or DFS pathVisited
Mental model: finishable ⇔ the unlock graph is a DAG
```

**Similar problems:** 23 (the boolean you are wrapping), 25 (same graph, return the order), 26 (a different "will this process terminate" question).

**Interview tip:** Before writing a loop, speak the sentence "`[a, b]` means `b` before `a`, so the arrow is `b → a`". Most Course Schedule bugs are a reversed edge, not a broken Kahn.

## 25. Course Schedule II

### Problem Understanding

LeetCode 210 Medium. Same graph as problem 24. Now return **any** valid order of courses, or an empty array if a cycle makes a schedule impossible.

**Input / Output / Constraints**
- Input: `numCourses`, `prerequisites[i] = [a, b]` meaning `b` before `a`.
- Output: `int[]` of length `numCourses` (any valid topo), or `int[0]` if impossible. Not `null`.
- Constraints: `1 ≤ numCourses ≤ 2000`, `0 ≤ E ≤ 5000`.
- Several valid orders may exist; the judge accepts any. Empty prerequisites → any permutation, typically `0 1 2 … n-1` because you seed the queue in index order.

**Observations**
- Problem 24 counted the peel. Problem 25 **records** the peel. One extra array.
- Cycle ⇒ return `new int[0]`, the same `k != n` test as problem 23.
- You do not need the lexicographically smallest order (that is a `PriorityQueue` variant; see problem 27). Any valid is enough.
- Disconnected free courses appear in whatever order they were seeded.

**Example**
```text
numCourses = 4
prerequisites = [[1,0],[2,0],[3,1],[3,2]]

  0 → 1 → 3
  0 → 2 ↗

Output: [0, 1, 2, 3]  or  [0, 2, 1, 3]

Cycle: numCourses = 2, prerequisites = [[1,0],[0,1]] → []
No prereqs: numCourses = 3, prerequisites = [] → [0, 1, 2]
```

### How to Think About the Problem

- What should I notice first? You already decided finishability in 24. The witness of finishability *is* the order Kahn emits.
- Which representation? Identical to 24: edge `b → a`.
- Counting / searching / ordering / minimizing → which mental model? Ordering under precedence. Kahn records, DFS-topo records the finish stack.
- Which traversal is natural? Kahn, because the cycle refusal is the same `k != n` you already wrote.
- **Clue → Pattern:** *Return a schedule, or empty if cyclic → Kahn that stores the popped vertices.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: permutation search of problem 24, return the perm
             instead of a boolean. O(n! · E)
        ↓
Observation: the sequence Kahn pops is already a valid schedule.
             If it is shorter than n, no schedule exists.
        ↓
Optimal: Kahn, write pops into int[n], return it iff k == n.
         O(n + E)
```

### Brute Force Approach

**Basic idea.** Same backtracking as 24, but keep the `perm` and return it when `placed == n`. Return `new int[0]` if the search dies.

**Why it works.** Complete search of linear extensions.

```java
import java.util.*;

class CourseScheduleII {
    public int[] bruteFindOrder(int n, int[][] prerequisites) {
        List<List<Integer>> need = new ArrayList<>();
        for (int i = 0; i < n; i++) need.add(new ArrayList<>());
        for (int[] p : prerequisites) need.get(p[0]).add(p[1]);

        boolean[] taken = new boolean[n];
        int[] perm = new int[n];
        return dfs(0, n, taken, perm, need) ? perm : new int[0];
    }

    private boolean dfs(int i, int n, boolean[] taken, int[] perm,
                        List<List<Integer>> need) {
        if (i == n) return true;
        for (int c = 0; c < n; c++) {
            if (taken[c]) continue;
            boolean ok = true;
            for (int b : need.get(c)) if (!taken[b]) { ok = false; break; }
            if (!ok) continue;
            taken[c] = true;
            perm[i] = c;
            if (dfs(i + 1, n, taken, perm, need)) return true;
            taken[c] = false;
        }
        return false;
    }
}
```

**Time Complexity Calculation:**
`O(n! · n)` worst case. Impossible at the given constraints.

**Space Complexity Calculation:**
`O(n + E)` plus `O(n)` recursion.

**Why can this be improved?**
The legal next course at every step is indegree 0 in the residual graph. Tracking that set with a queue is `O(n + E)` and produces one valid order without searching the others. The brute also hides the cycle: you only discover impossibility after exhausting the tree, whereas Kahn knows at the moment the queue dries up early.

### Optimal Approach

You are exploiting the same **directed course-DAG** as problem 24. The peel order is a topological order of that DAG.

**Core Observation**
Kahn's queue pops a vertex only when every prerequisite is already in the prefix of `order`. So the prefix is always a valid partial schedule. If it grows to length `n`, it is a complete schedule. If it stops short, a cycle remains and no complete schedule exists — return `int[0]`, not a padded or partial array.

**Pattern Identification**
Problem 22 + the `[a, b] → b→a` modelling of problem 24.

**Step-by-Step Intuition**
1. Build `adj` with edge `b → a`, fill `indeg`.
2. Seed zeros (free courses, including ones never named).
3. Pop into `order[k++]`.
4. *Invariant: `order[0 .. k)` is a valid sequence of courses you could have taken in that order.*
5. After the loop, if `k != n` return `new int[0]`, else return `order`.

**Dry Run**

Same 4-course graph. `indeg = [0, 1, 1, 2]`. Queue seeded with `0`.

| Step | queue | indeg `[0,1,2,3]` | popped | order | Action |
|------|-------|-------------------|--------|-------|--------|
| init | `[0]` | `[0, 1, 1, 2]` | — | `[]` | |
| 1 | `[1, 2]` | `[0, 0, 0, 2]` | `0` | `[0]` | unlocks 1, 2 |
| 2 | `[2, 3]` | `[0, 0, 0, 1]` | `1` | `[0, 1]` | `1→3`, indeg 3 = 1 |
| 3 | `[3]` | `[0, 0, 0, 0]` | `2` | `[0, 1, 2]` | `2→3` hits 0 |
| 4 | `[]` | `[0, 0, 0, 0]` | `3` | `[0, 1, 2, 3]` | `k == 4` |

If the queue had been seeded such that `2` popped before `1`, the order would be `[0, 2, 1, 3]`. Both accepted.

Cycle `[[1,0],[0,1]]`, `n = 2`: `indeg = [1, 1]`, queue empty, `k = 0 != 2`, return `[]`.

**Why Does It Work?**
Same induction as Kahn: the prefix is always a valid partial order of a DAG residual. Termination with `k == n` means the residual is empty. Termination with `k < n` means the residual has minimum indegree ≥ 1, hence a directed cycle, hence no linear extension — the empty array is the only honest answer.

**Java Code**

```java
import java.util.*;

class CourseScheduleII {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            adj.get(p[1]).add(p[0]); // b → a
            indeg[p[0]]++;
        }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) if (indeg[i] == 0) q.add(i);

        int[] order = new int[numCourses];
        int k = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[k++] = u;
            for (int v : adj.get(u)) {
                indeg[v]--;
                if (indeg[v] == 0) q.add(v);
            }
        }
        return k == numCourses ? order : new int[0];
    }
}
```

DFS dual: run problem 21's post-order push, but abort and return `int[0]` if `pathVisited` fires (mix of 20 and 21). Kahn is the cleaner of the two here because the cycle branch is one integer comparison.

**Complexity**

**Time Complexity Calculation:**
`O(n + E)` — identical to Course Schedule I, plus `O(n)` to write the array.

**Space Complexity Calculation:**
`O(n + E)` adj, `O(n)` indegree, queue, and output.

### Pattern to Remember

```text
Clue: return any valid course order, or empty if impossible
Pattern: Kahn that records pops; int[0] when k != n
Mental model: the peel IS the schedule; a short peel IS the cycle
```

**Similar problems:** 21 / 22 (bare topo), 24 (same graph, boolean), 27 (same idea on letters; sometimes lex-smallest).

**Interview tip:** Returning a partial order of length `k < n` (instead of `int[0]`) is a common fail. The judge wants emptiness, not a truncated schedule.

## 26. Find Eventual Safe States

### Problem Understanding

LeetCode 802 Medium. Directed graph given as an adjacency list `graph`, where `graph[i]` is the list of out-neighbours of `i`. A node is a **terminal** if its out-degree is 0. A node is **safe** if every possible path starting from it ends at a terminal (finite paths only — you never walk forever). Return all safe node indices in ascending order.

**Input / Output / Constraints**
- Input: `int[][] graph` of length `n` (`1 ≤ n ≤ 10^4`), `graph[i]` lists distinct out-neighbours. `E ≤ 2 · 10^4`.
- Output: `List<Integer>` of safe indices, sorted.
- Self-loops exist in the tests. A self-loop is a cycle of length 1; that node is unsafe, and so is anyone who can reach it.

**Observations**
- Unsafe ⇔ the node can reach a directed cycle (including a self-loop). Safe ⇔ the node is not on a cycle and cannot reach one; every walk dies at a terminal.
- Terminals are safe (the empty set of paths all "end at a terminal").
- Reversing every edge turns terminals into sources. Kahn on the reverse graph peels exactly the nodes that can only reach terminals in the original: you start at safety and walk backwards.
- DFS with `pathVisited` also works: seeing a node already on the path means a cycle, and you mark the whole path unsafe; a node whose every out-neighbour is known-safe is itself safe.

**Example** (LeetCode 802 example 1)
```text
graph = [[1,2],[2,3],[5],[0],[5],[],[]]
n = 7

        ┌──────────┐
        ▼          │
        0 → 1 → 3 ─┘
        │   │
        ▼   ▼
        2 ←─┘
        │
        ▼
        5 ◄── 4        6

cycle: 0 → 1 → 3 → 0
terminals: 5, 6
2 → 5 only, 4 → 5 only, 6 isolated
safe: [2, 4, 5, 6]
unsafe: 0, 1, 3 (the cycle)
```

Second example: `graph = [[1,2,3,4],[1,2],[3,4],[0,4],[]]`. Node `1` has a self-loop. Cycle `0 ⇄ 3`. Only terminal is `4`. Output: `[4]`.

### How to Think About the Problem

- What should I notice first? "Every path ends at a terminal" is the complement of "some path can walk forever" = "this node can reach a cycle".
- Which representation? You are given adj already. You will also want the **reversed** adj: for every `u → v`, store `v → u`.
- Counting / searching / ordering / minimizing → which mental model? Either (a) reverse + Kahn, starting from terminals, or (b) DFS colouring that classifies each node as safe/unsafe once.
- Which traversal is natural? Kahn on the reverse graph reuses problems 22–25. DFS reuses problem 20, with an extra "if any child is unsafe, I am unsafe".
- **Clue → Pattern:** *Reverse edges; terminals become sources; Kahn peel = nodes that can reach a terminal only.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: from every u, enumerate all directed walks; if any
             walk repeats a vertex (cycle) or can be extended
             forever, u is unsafe. Exponential.
        ↓
Observation: unsafe = can reach a cycle. Equivalently, safe =
             can be peeled from the terminals inward on the
             reversed graph.
        ↓
Optimal: reverse edges, indegree = original outdegree, Kahn.
         Whatever you peel is safe. Sort by scanning 0..n-1.
         O(V + E)
```

### Brute Force Approach

**Basic idea.** From each source `s`, DFS with a recursion-stack `onPath`. If you ever edge into `onPath`, `s` (and everyone currently on the path) can reach a cycle. If a neighbour is already known unsafe, propagate. Without memoising "this node is already classified", you re-explore the same fringe from every `s` and go exponential on a DAG of diamonds.

**Why it works.** The definition is existential over paths. Exhaustive path search decides the existential.

```java
import java.util.*;

class EventualSafeStates {
    // Exponential if you drop the colour memo. With colours it becomes
    // the O(V+E) DFS — shown here as the "better" that the brute wants
    // to become, so you see why naïve path-enumeration is the wrong shape.
    public List<Integer> brute(int[][] graph) {
        int n = graph.length;
        List<Integer> ans = new ArrayList<>();
        for (int s = 0; s < n; s++) {
            if (allPathsDie(s, graph, new boolean[n])) ans.add(s);
        }
        return ans;
    }

    private boolean allPathsDie(int u, int[][] graph, boolean[] onPath) {
        if (onPath[u]) return false;          // found a cycle
        onPath[u] = true;
        for (int v : graph[u]) {
            if (!allPathsDie(v, graph, onPath)) {
                onPath[u] = false;
                return false;
            }
        }
        onPath[u] = false;
        return true;                          // every out-edge died at a terminal
    }
}
```

**Time Complexity Calculation:**
From each of `V` starts you may walk a number of paths exponential in the DAG width. Worst case exponential. (The coloured DFS below is `O(V + E)`.)

**Space Complexity Calculation:**
`O(V)` recursion / `onPath` plus the graph.

**Why can this be improved?**
You re-decide the same node from every ancestor. A node is intrinsically safe or unsafe — that does not depend on who asked. Memoising the answer (DFS colours) or computing all answers at once by peeling terminals (reverse Kahn) both collapse this to linear. The other naïve idea, "a node is safe iff it is not *on* a cycle", is wrong: `2 → 0 → 1 → 0` has `2` off the cycle and still unsafe.

### Optimal Approach

You are exploiting a **directed** graph, and the duality between "can reach a cycle" and "cannot be reached from a terminal in the reversed graph".

**Core Observation**
Reverse every edge. Original terminals (out-degree 0) become reverse-sources (in-degree 0). Kahn on the reverse peels a node `u` only when every original out-neighbour of `u` has already been peeled — i.e. every place `u` could walk is already known safe. Therefore the peeled set is exactly the safe set.

Equivalently: reverse edges turn "I can walk *to* safety" into "safety can walk *to* me".

**Pattern Identification**
Kahn, but `indeg[u]` is the **original out-degree**, and the adjacency you decrement along is the **reversed** graph.

**Step-by-Step Intuition**
1. Build `rev`: for each original `u → v`, append `u` onto `rev[v]`.
2. Set `indeg[u] = graph[u].length` (original out-degree).
3. Queue every `u` with `indeg[u] == 0` (original terminals, including isolated vertices).
4. Pop `u`, mark `u` safe. For each predecessor `p` in `rev[u]` (original edges `p → u`), decrement `indeg[p]`; enqueue when it hits 0.
5. *Invariant: a node is enqueued only after every original out-neighbour has been marked safe, so every path out of it already ends at a terminal.*
6. Collect indices `0 .. n-1` that were marked safe. The scan is already sorted.

**Dry Run**

Original edges: `0→1, 0→2, 1→2, 1→3, 2→5, 3→0, 4→5`. Terminals `5, 6`.

Reverse: `1→0, 2→0, 2→1, 3→1, 5→2, 0→3, 5→4`.

`indeg` (original out-degree) = `[2, 2, 1, 1, 1, 0, 0]`.

| Step | queue | indeg `[0,1,2,3,4,5,6]` | popped | safe so far | Action |
|------|-------|--------------------------|--------|-------------|--------|
| init | `[5, 6]` | `[2, 2, 1, 1, 1, 0, 0]` | — | `{}` | terminals |
| 1 | `[6, 2, 4]` | `[2, 2, 0, 1, 0, 0, 0]` | `5` | `{5}` | reverse 5→2, 5→4 |
| 2 | `[2, 4]` | `[2, 2, 0, 1, 0, 0, 0]` | `6` | `{5,6}` | `6` has no reverse out |
| 3 | `[4]` | `[1, 1, 0, 1, 0, 0, 0]` | `2` | `{2,5,6}` | reverse 2→0, 2→1 |
| 4 | `[]` | `[1, 1, 0, 1, 0, 0, 0]` | `4` | `{2,4,5,6}` | reverse 4→(none extra) |
| stop | — | leftover `0,1,3` all ≥ 1 | — | `{2,4,5,6}` | cycle refuses to peel |

Answer `[2, 4, 5, 6]`.

**Why Does It Work?**
A node becomes a "terminal" in the residual original graph exactly when all of its out-neighbours have already been deleted. Deleting original terminals and repeating is the definition of "every path dies at a terminal". Kahn on the reverse implements that deletion order. Nodes on a cycle never lose their last original out-edge, so they (and anything that can still reach them) stay unpeeled.

DFS with `pathVisited` classifies the same set: state `1` (on path) means "I found a cycle through here → unsafe"; after all children return, if any child is unsafe this node is unsafe, else it is safe (state `2`). Both are linear; Kahn is the one that makes the reverse-edges observation visible.

**Java Code**

```java
import java.util.*;

class EventualSafeStates {
    public List<Integer> eventualSafeNodes(int[][] graph) {
        int n = graph.length;
        List<List<Integer>> rev = new ArrayList<>();
        for (int i = 0; i < n; i++) rev.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int u = 0; u < n; u++) {
            for (int v : graph[u]) {
                rev.get(v).add(u); // reverse u → v
                indeg[u]++;        // original out-degree
            }
        }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);

        boolean[] safe = new boolean[n];
        while (!q.isEmpty()) {
            int u = q.poll();
            safe[u] = true;
            for (int p : rev.get(u)) {
                indeg[p]--;
                if (indeg[p] == 0) q.add(p);
            }
        }

        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < n; i++) if (safe[i]) ans.add(i);
        return ans; // already sorted
    }

    // DFS dual: pathVisited / 3-colour. Returns true if u can reach a cycle.
    public List<Integer> eventualSafeNodesDfs(int[][] graph) {
        int n = graph.length;
        int[] state = new int[n]; // 0 unvis, 1 on path, 2 safe
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if (!leadsToCycle(i, graph, state)) ans.add(i);
        }
        return ans;
    }

    private boolean leadsToCycle(int u, int[][] graph, int[] state) {
        if (state[u] != 0) return state[u] == 1; // 1 = still on path = cycle
        state[u] = 1;
        for (int v : graph[u]) {
            if (leadsToCycle(v, graph, state)) return true;
        }
        state[u] = 2; // every child is safe
        return false;
    }
}
```

**Complexity**

**Time Complexity Calculation:**
Building the reverse graph walks every edge once `O(E)`. Kahn (or the DFS dual) visits each vertex and each reverse/original edge once. Final scan `O(V)`. Total `O(V + E)`.

**Space Complexity Calculation:**
Reverse adj `O(V + E)`, `indeg` / `safe` / queue `O(V)`. DFS dual: `state[n]` and `O(V)` recursion. Output `O(V)`.

### Pattern to Remember

```text
Clue: "every path ends at a terminal" / eventual safe nodes
Pattern: reverse the edges; Kahn from original terminals; peeled = safe
Mental model: reverse turns "I can reach safety" into "safety can reach me"
```

**Similar problems:** 20 / 23 (cycle is the unsafe core), 24 (termination of a process), 22 (the peel itself).

**Interview tip:** If you reach for "DFS from every node and hope", you will miss nodes that are off-cycle but flow into a cycle. Either reverse-Kahn or a 3-colour DFS that *returns* unsafety to parents.

## 27. Alien Dictionary

### Problem Understanding

LeetCode 269 Hard (also GFG "Alien Dictionary"). You are given a list of words **already sorted** in an alien language's lexicographic order. Derive a valid order of the unique characters. If the input is inconsistent (cycle of inequalities, or a longer word placed before its own prefix), return `""`.

**Input / Output / Constraints**
- Input: `String[] words`, `1 ≤ words.length ≤ 100`, `1 ≤ words[i].length ≤ 100`, lowercase letters.
- Output: `String` — any valid order of the unique characters that appear, or `""` if impossible. GFG often wants the **lexicographically smallest** valid order; LC 269 accepts any valid order.
- Only characters that actually appear in `words` belong in the answer. A letter that never appears is not emitted.

**Observations**
- Sortedness of a list is decided by **adjacent** pairs. If `words[i] ≤ words[i+1]` for every `i` under the unknown order, transitivity takes care of the rest. Comparing every pair is wasted work and easy to get wrong.
- The first index where `words[i]` and `words[i+1]` differ produces one inequality: that character in `words[i]` comes **before** the one in `words[i+1]`. Edge: `s[i].charAt(k) → s[i+1].charAt(k)`.
- Prefix rule: if `words[i+1]` is a prefix of `words[i]` and `words[i]` is strictly longer, a sorted list cannot put the longer word first. Invalid → `""`. Example: `["abc", "ab"]`.
- Duplicate adjacent words: no information, skip.
- Disconnected letters: they appear in the unique-character set with indegree 0 and can sit anywhere relative to other components. Any valid topo is correct for LC; GFG's lex-smallest puts them in alphabetical order among currently-available zeros — replace `ArrayDeque` with `PriorityQueue`.
- Cycle of letter-inequalities (e.g. `["z", "x", "z"]`) → `""`.

**Example**
```text
words = ["wrt", "wrf", "er", "ett", "rftt"]

wrt vs wrf  →  t before f     t → f
wrf vs er   →  w before e     w → e
er  vs ett  →  r before t     r → t
ett vs rftt →  e before r     e → r

chain:  w → e → r → t → f
unique: w, r, t, f, e
order:  "wertf"   (only one valid)
```

Second example (prefix invalid): `["abc", "ab"]` → `""`.

Third example (cycle): `["z", "x", "z"]` → `z → x` and `x → z` → `""`.

Fourth example (disconnected): `["z", "x"]` → `"zx"` (forced). `["zy", "zx"]` gives the single inequality `y → x`; `z` is unconstrained. Unique `{z, y, x}`. Any valid: `"zyx"`, `"yzx"`, or `"yxz"`. Lex-smallest (`PriorityQueue`): `"yxz"`.

### How to Think About the Problem

- What should I notice first? The vertices are letters, not the words. The words are only a source of inequality edges.
- Which representation? 26-slot adj / indegree, plus a `boolean[] present` so you do not emit unused letters. Or a `Map<Character, Set<Character>>`.
- Counting / searching / ordering / minimizing → which mental model? Topological order of a 26-vertex DAG. Cycle / prefix → empty string.
- Which traversal is natural? Kahn. DFS reverse-post-order also works; Kahn is the one that swaps to a `PriorityQueue` in one line for lex-smallest.
- **Clue → Pattern:** *Sorted words → first differing characters are inequality edges → topo on letters.*

### Intuition (Brute → Better → Optimal)

```text
Brute force: collect unique letters, try every permutation, test
             whether the permutation ranks the given word list
             as non-decreasing. O(L! · N · W)  (L ≤ 26)
        ↓
Observation: the only constraints are (1) first-diff inequalities
             of adjacent words and (2) the prefix rule. That is
             a 26-vertex DAG. Topo it.
        ↓
Optimal: build those edges, Kahn. Cycle or prefix → "".
         Any valid: ArrayDeque. Lex-smallest: PriorityQueue.
         O(N · W + 26 + E_letters)  with E_letters ≤ 26²
```

### Brute Force Approach

**Basic idea.** Unique letters into a list `cs`. Generate permutations. A permutation defines a rank `pos['a'..'z']`. Scan adjacent word pairs (or the whole list) and verify they are in non-decreasing order under `pos`, including the prefix rule. Return the first permutation that validates, concatenated.

**Why it works.** Any valid alien order is a permutation of the unique letters that makes the input sorted. Searching all permutations is complete. `26!` is the ceiling, but even `10!` already times out; typical tests have 4–10 unique letters, which is enough to make brute fail.

```java
import java.util.*;

class AlienDictionary {
    public String bruteAlienOrder(String[] words) {
        boolean[] present = new boolean[26];
        for (String w : words) for (char c : w.toCharArray()) present[c - 'a'] = true;
        List<Integer> letters = new ArrayList<>();
        for (int i = 0; i < 26; i++) if (present[i]) letters.add(i);

        int[] perm = letters.stream().mapToInt(i -> i).toArray();
        int[] idx = new int[perm.length];
        for (int i = 0; i < idx.length; i++) idx[i] = i;
        do {
            int[] pos = new int[26];
            Arrays.fill(pos, -1);
            for (int i = 0; i < perm.length; i++) pos[perm[idx[i]]] = i;
            if (sortedUnder(words, pos)) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < perm.length; i++) sb.append((char) ('a' + perm[idx[i]]));
                return sb.toString();
            }
        } while (nextPerm(idx));
        return "";
    }

    private boolean sortedUnder(String[] words, int[] pos) {
        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int k = 0, lim = Math.min(a.length(), b.length());
            while (k < lim && a.charAt(k) == b.charAt(k)) k++;
            if (k == lim) {
                if (a.length() > b.length()) return false;
            } else if (pos[a.charAt(k) - 'a'] > pos[b.charAt(k) - 'a']) {
                return false;
            }
        }
        return true;
    }

    private boolean nextPerm(int[] a) {
        int i = a.length - 2;
        while (i >= 0 && a[i] >= a[i + 1]) i--;
        if (i < 0) return false;
        int j = a.length - 1;
        while (a[j] <= a[i]) j--;
        int t = a[i]; a[i] = a[j]; a[j] = t;
        for (int l = i + 1, r = a.length - 1; l < r; l++, r--) {
            t = a[l]; a[l] = a[r]; a[r] = t;
        }
        return true;
    }
}
```

**Time Complexity Calculation:**
Up to `L!` permutations, `L ≤ 26`. Each is checked in `O(N · W)`. Unusable as soon as `L ≳ 9`.

**Space Complexity Calculation:**
`O(L)` for the permutation plus `O(N · W)` for the input.

**Why can this be improved?**
Most permutations are illegal for the same local reason: one adjacent first-diff is reversed. You can extract those `O(N)` inequalities once and topo-sort a 26-vertex graph instead of generating `L!` strings. The brute also tends to compare *every* pair of words rather than adjacent ones — extra work, and if the list is already sorted, non-adjacent pairs add no new first-diff information.

A second naïve failure: forgetting the prefix rule and only inserting letter-edges. `["abc","ab"]` produces no letter-edge and a fake order `"abc"`.

### Optimal Approach

You are exploiting a **directed** graph on at most 26 vertices, whose edges are the adjacent first-diff inequalities of a sorted list. The graph is a DAG iff a consistent alphabet exists.

**Core Observation**
In a lexicographically sorted list, two adjacent words either (a) share a prefix and then differ at one character, which forces that character-order, or (b) one is a prefix of the other, in which case the shorter one must come first. All other alphabet constraints follow by transitivity of those inequalities. Topo-sort the inequality graph; a cycle is an inconsistency.

**Pattern Identification**
Build a 26-vertex DAG, then problem 22. Swap the worklist to `PriorityQueue<Integer>` if the judge wants lex-smallest (GFG). LC 269: any valid, so `ArrayDeque`.

**Step-by-Step Intuition**
1. Mark every character that appears in any word (`present[c] = true`). These, and only these, must occur in the answer.
2. For each adjacent pair `a = words[i]`, `b = words[i+1]`:
   - Walk until the first differing index `k`.
   - If you run out of the shorter word: if `a.length() > b.length()` return `""` (prefix inconsistency). Otherwise this pair adds no edge.
   - Else add edge `a[k] → b[k]` once (use `boolean[][] seen` so indegree is not double-counted).
3. Kahn on the 26-letter graph, but only enqueue letters that are `present` and have indegree 0.
4. *Invariant: the string built so far is a valid prefix of some alien alphabet consistent with every inequality extracted so far; a letter is appended only when every letter forced to precede it is already appended.*
5. If you emit fewer characters than `present` count, a cycle remains → `""`.

**Dry Run**

`words = ["wrt","wrf","er","ett","rftt"]`.

Present: `w, r, t, f, e`.

| Pair | First diff | Edge | Notes |
|------|------------|------|-------|
| wrt / wrf | index 2, `t` vs `f` | `t → f` | |
| wrf / er | index 0, `w` vs `e` | `w → e` | |
| er / ett | index 1, `r` vs `t` | `r → t` | `'e'` matched |
| ett / rftt | index 0, `e` vs `r` | `e → r` | |

`indeg` of present letters: `w:0, e:1, r:1, t:1, f:1`.

| Step | queue | indeg `w e r t f` | popped | order | Action |
|------|-------|-------------------|--------|-------|--------|
| init | `[w]` | `0 1 1 1 1` | — | `""` | only `w` is a source |
| 1 | `[e]` | `0 0 1 1 1` | `w` | `"w"` | `w→e` |
| 2 | `[r]` | `0 0 0 1 1` | `e` | `"we"` | `e→r` |
| 3 | `[t]` | `0 0 0 0 1` | `r` | `"wer"` | `r→t` |
| 4 | `[f]` | `0 0 0 0 0` | `t` | `"wert"` | `t→f` |
| 5 | `[]` | `0 0 0 0 0` | `f` | `"wertf"` | done, 5 == 5 present |

Prefix fail: `["abc","ab"]`. Loop `k` runs to `lim = 2`, then `a.length() > b.length()` → return `""` before Kahn runs.

Cycle: `["z","x","z"]`. Edges `z→x`, `x→z`. Both indegree 1, queue empty, emit 0 < 2 present → `""`.

**Why Does It Work?**
If an alien order exists, it is a linear extension of the first-diff inequalities, so Kahn finds one (or the lex-smallest, with a heap). If the list is not sortable under any alphabet, then either a longer word precedes its prefix (caught before the graph) or the inequalities contain a cycle (Kahn leftover). Adjacent pairs suffice because sortedness is a chain: `w0 ≤ w1 ≤ … ≤ w_{n-1}` is equivalent to each adjacent `≤`. Duplicate edges are suppressed so indegree matches the distinct-predecessor count, which is what the peel needs.

**Java Code**

Any-valid order (LC 269). The lex-smallest variant is the same method with one line changed — see the comment.

```java
import java.util.*;

class AlienDictionary {
    public String alienOrder(String[] words) {
        boolean[] present = new boolean[26];
        for (String w : words) {
            for (int i = 0; i < w.length(); i++) present[w.charAt(i) - 'a'] = true;
        }

        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < 26; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[26];
        boolean[][] seen = new boolean[26][26];

        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int lim = Math.min(a.length(), b.length());
            int k = 0;
            while (k < lim && a.charAt(k) == b.charAt(k)) k++;
            if (k == lim) {
                if (a.length() > b.length()) return ""; // longer before its prefix
                continue;
            }
            int u = a.charAt(k) - 'a', v = b.charAt(k) - 'a';
            if (!seen[u][v]) {
                seen[u][v] = true;
                adj.get(u).add(v);
                indeg[v]++;
            }
        }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        // lex-smallest: PriorityQueue<Integer> q = new PriorityQueue<>();
        int need = 0;
        for (int c = 0; c < 26; c++) {
            if (!present[c]) continue;
            need++;
            if (indeg[c] == 0) q.add(c);
        }

        StringBuilder sb = new StringBuilder();
        while (!q.isEmpty()) {
            int u = q.poll();
            sb.append((char) ('a' + u));
            for (int v : adj.get(u)) {
                indeg[v]--;
                if (indeg[v] == 0) q.add(v);
            }
        }
        return sb.length() == need ? sb.toString() : "";
    }
}
```

GFG's `findOrder(String[] dict, int n, int k)` is the same algorithm restricted to the first `k` letters `'a' .. 'a'+k-1`, and they ask for the lex-smallest string, so use the `PriorityQueue`.

**Complexity**

**Time Complexity Calculation:**
Marking `present` walks every character: `O(N · W)`. Adjacent comparisons walk each pair's common prefix: another `O(N · W)`. The letter graph has ≤ 26 vertices and ≤ `26²` edges. Kahn is `O(26 + E_letters)`. `PriorityQueue` variant is `O(26 log 26 + E_letters log 26)`, which is still constant. Dominated by `O(N · W)`.

**Space Complexity Calculation:**
`adj` and `seen` are `O(26²)`. `indeg`, `present`, queue: `O(26)`. Output `O(26)`. Independent of `N` besides the input array itself.

### Pattern to Remember

```text
Clue: sorted alien words, derive character order
Pattern: adjacent first-diff edges on letters; Kahn; prefix rule; cycle → ""
Mental model: alphabet = topo of inequality DAG; PQ instead of deque if lex-smallest
```

**Similar problems:** 22 / 25 (the peel), 23 (cycle → impossible), 24 (consistency of precedence). GFG "Alien Dictionary" is this problem with a forced lex-smallest output.

**Interview tip:** Two checks catch almost every fail: (1) longer-before-prefix returns `""` *before* you topo, (2) you emit exactly the unique letters that appeared, not all 26 and not a subset missing an unconstrained character.


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


# PART F — Other Algorithms (Bridges, Articulation, SCC)

`tin[]` / `low[]` answer a deletion question: *if I remove this edge, or this vertex, does the graph fall into more pieces?* Discovery time is when DFS first saw the node. Low time is the smallest discovery time the node's subtree can still reach, using tree edges plus **one** back edge. Kosaraju answers a different question: *which sets of nodes can reach each other both ways?* It is two DFS passes and a transpose, not a `tin`/`low` test. Memorise the two inequalities now and never swap them: a **bridge** is `low[v] > tin[u]`; an **articulation point** is `low[v] >= tin[u]` (plus the root-children rule). The extra equality is the whole difference between "this edge is the only way out" and "this vertex is the only way out". These three problems are the last row of the Foundation's six mental models. After them you can whiteboard any of the 53.

## 51. Bridges in a Graph (Tarjan's tin/low)

### Problem Understanding

An **undirected** graph. A **bridge** (critical connection) is an edge whose removal increases the number of connected components. LeetCode 1192 asks: given `n` servers and a list of connections, return every critical connection. takeUforward G-55 is the same algorithm on a generic undirected graph.

**Input / Output / Constraints**
- LC 1192: `n` (2 ≤ n ≤ 10^5), `connections` as a list of `[u, v]` undirected unique edges (1 ≤ E ≤ 10^5). Graph is connected.
- Output: list of edges `[u, v]` that are bridges, any order, either orientation.
- GFG variant may be disconnected — still run DFS from every unvisited node.
- No self-loops on LC. Parallel edges, if present, are never bridges (the second copy is a back edge).

**Observations**
- Brute "delete each edge and BFS" is O(E·(V+E)) and dies at 10^5.
- A tree edge `u—v` (v discovered from u) is a bridge iff **no** back edge from v's subtree reaches u or an ancestor of u. That is exactly `low[v] > tin[u]`.
- Back edges are never bridges: they sit on a cycle.
- Parent must be skipped: the tree edge back to the parent is **not** a back edge. Using it would pull `low[u]` down to `tin[parent]` and hide every bridge.

**Example**
```text
        0 —— 1 —— 2
        |    |
        3    4 —— 5
             |
             6

edges: 0-1, 1-2, 0-3, 1-3, 1-4, 4-5, 4-6
```
Cycle `0-1-3-0` is 2-edge-connected: none of those three edges is a bridge. `1-2`, `1-4`, `4-5`, `4-6` each disconnect something. Output (any order): `[[1,2],[1,4],[4,5],[4,6]]`.

**Example 2 — chain.** `0-1-2`. Every edge is a bridge.

**Example 3 — complete K3.** Triangle, no bridges.

### How to Think About the Problem

- What should I notice first? Undirected, "edge whose removal disconnects". That is the Tarjan row, not DSU, not SCC.
- Which representation? Adjacency list. You need the DFS tree, not a global edge sort.
- Counting / searching / ordering / minimizing? Deletion / connectivity. Mental model 6.
- Which traversal? One DFS that stamps times. BFS cannot compute `low[]`.
- **Clue → Pattern:** *critical connections / bridges → DFS `tin[]`/`low[]`, tree-edge test `low[child] > tin[u]`.*

### Intuition (Brute → Better → Optimal)
```text
Brute: for every edge, delete it, BFS/DFS count components. O(E·(V+E))
        ↓
Observation: only a tree edge can be a bridge, and only if the child's
             subtree has no back edge to u or above.
        ↓
Optimal: one DFS. tin = discovery, low = best ancestor reachable.
         Bridge iff low[v] > tin[u]. O(V+E)
```

### Brute Force Approach

**Basic idea.** For each edge `{u,v}`, build the graph without it, BFS from 0, count reached nodes. If `reached < n` (or, in a disconnected graph, if the component count rose), the edge is a bridge.

**Why it works.** The definition, executed literally.

```java
import java.util.*;

class BridgesBrute {
    static List<List<Integer>> brute(int n, int[][] edges) {
        List<List<Integer>> out = new ArrayList<>();
        for (int skip = 0; skip < edges.length; skip++) {
            List<List<Integer>> adj = new ArrayList<>();
            for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
            for (int i = 0; i < edges.length; i++) {
                if (i == skip) continue;
                int u = edges[i][0], v = edges[i][1];
                adj.get(u).add(v);
                adj.get(v).add(u);
            }
            boolean[] vis = new boolean[n];
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(0);
            vis[0] = true;
            int seen = 1;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) if (!vis[v]) {
                    vis[v] = true;
                    seen++;
                    q.add(v);
                }
            }
            if (seen < n) out.add(List.of(edges[skip][0], edges[skip][1]));
        }
        return out;
    }
}
```

**Time Complexity Calculation:** E candidate edges. Each rebuilds the graph O(E) and BFS O(V+E). Total O(E·(V+E)). n, E ≤ 10^5 → ~10^10 operations. Unusable.

**Space Complexity Calculation:** O(V+E) for the rebuilt adj list.

**Why can this be improved?** Every BFS rediscovers the same DFS tree. The information "does this subtree escape to an ancestor?" is local to one DFS.

### Optimal Approach

The structure being exploited is an **undirected** graph (possibly disconnected). We need the DFS tree plus back edges.

**Core Observation**
`low[v]` is the smallest discovery time reachable from v's subtree. If even that best escape is strictly **after** `tin[u]`, then v cannot reach u without the tree edge `u—v`. Removing `u—v` splits v's subtree off. That is a bridge.

**Pattern Identification**
Tarjan bridges. One DFS. Two int arrays. Parent skip. Back edges update `low` with **`tin[v]`**, never `low[v]`.

**Step-by-Step Intuition**
1. `timer = 0`. `tin[u] = -1` means undiscovered.
2. On entry: `tin[u] = low[u] = timer++`. *Invariant: tin is a DFS preorder numbering.*
3. For each neighbour v:
   - if `v == parent`, skip. The tree edge is not a back edge.
   - if `tin[v] == -1`: recurse. Then `low[u] = min(low[u], low[v])`. If `low[v] > tin[u]`, record `{u,v}` as a bridge.
   - else: back edge. `low[u] = min(low[u], tin[v])`.
4. *Invariant after `u` returns: `low[u]` equals the smallest `tin` of any vertex reachable from `u`'s subtree by tree edges plus at most one back edge.*
5. Outer loop over all nodes if the graph may be disconnected.

**Dry Run** — example graph, DFS from 0, neighbour order 1 then 3.

| Step | Stack / event | tin | low | Action |
|------|----------------|-----|-----|--------|
| 1 | enter 0 | `[0,_,_,_,_,_,_]` | `[0,_,_,_,_,_,_]` | timer=1 |
| 2 | 0 → 1, enter 1 | `[0,1,_,_,_,_,_]` | `[0,1,_,_,_,_,_]` | |
| 3 | 1 → 2, enter 2 | `[0,1,2,_,_,_,_]` | `[0,1,2,_,_,_,_]` | 2 has only parent 1 |
| 4 | 2 returns | | `low[2]=2 > tin[1]=1` | **bridge 1-2** |
| 5 | 1 → 3? wait: 1's neighbours 0,2,3,4. 0 is parent. 3 not yet. From 0 we also have 0-3. Order below uses 1's next as 3. | | | |
| 6 | 1 → 3, enter 3 | `[0,1,2,3,_,_,_]` | `[0,1,2,3,_,_,_]` | 3 sees 0, already discovered, not parent → back edge |
| 7 | 3: `low[3]=min(3,tin[0]=0)=0` | | `[0,1,2,0,_,_,_]` | 3 returns; `low[1]=min(1,0)=0` |
| 8 | `low[3]=0 ≯ tin[1]=1` | | | 1-3 is **not** a bridge |
| 9 | 1 → 4, enter 4 | `[0,1,2,3,4,_,_]` | `[0,0,2,0,4,_,_]` | |
| 10 | 4 → 5, enter 5 | `tin[5]=5` | `low[5]=5` | 5 returns, `5 > tin[4]` → **bridge 4-5** |
| 11 | 4 → 6, enter 6 | `tin[6]=6` | `low[6]=6` | 6 returns, `6 > tin[4]` → **bridge 4-6** |
| 12 | 4 returns, `low[4]=4 > tin[1]=1` | | | **bridge 1-4** |
| 13 | 1 returns, `low[1]=0`. `0 > tin[0]=0`? no. 0-1 not a bridge | | | |
| 14 | 0 → 3 already visited, back edge `low[0]=min(0,tin[3]=3)=0` | | | done |

Final `tin = [0,1,2,3,4,5,6]`, `low = [0,0,2,0,4,5,6]`. Bridges: 1-2, 4-5, 4-6, 1-4. Matches the picture.

**Why Does It Work?**
A cycle is a way to leave a subtree without the parent tree edge. Every cycle produces a back edge to an ancestor, which pulls `low` of the subtree down to that ancestor's `tin`. If after all such pulls `low[v]` is still strictly larger than `tin[u]`, no cycle covers `u—v`, so the edge is a bridge. Using `tin[v]` (not `low[v]`) on a back edge stops information from hopping along two back edges and falsely claiming a non-bridge is covered. Parent skip prevents the tree edge itself from looking like a covering back edge.

**Java Code**

```java
import java.util.*;

class CriticalConnections {
    private List<List<Integer>> adj;
    private int timer;
    private int[] tin, low;
    private List<List<Integer>> bridges;

    public List<List<Integer>> criticalConnections(int n, List<List<Integer>> connections) {
        adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (List<Integer> e : connections) {
            adj.get(e.get(0)).add(e.get(1));
            adj.get(e.get(1)).add(e.get(0));
        }
        tin = new int[n];
        low = new int[n];
        Arrays.fill(tin, -1);
        bridges = new ArrayList<>();
        timer = 0;
        for (int i = 0; i < n; i++) {
            if (tin[i] == -1) dfs(i, -1);
        }
        return bridges;
    }

    private void dfs(int u, int parent) {
        tin[u] = low[u] = timer++;
        for (int v : adj.get(u)) {
            if (v == parent) continue;
            if (tin[v] == -1) {
                dfs(v, u);
                low[u] = Math.min(low[u], low[v]);
                if (low[v] > tin[u]) {
                    bridges.add(List.of(u, v));
                }
            } else {
                // back edge: tin, not low
                low[u] = Math.min(low[u], tin[v]);
            }
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:** Each vertex is entered once, each undirected edge is examined twice. O(V+E). Building the list is O(V+E).

**Space Complexity Calculation:** adj O(V+E), tin/low O(V), recursion O(V) in the worst path. Bridges list O(E) in a tree.

### Pattern to Remember
```text
Clue: "critical connections" / "bridges" / "edges whose removal disconnects"
Pattern: one DFS, tin/low, tree-edge test low[child] > tin[u]
Mental model: connectivity under deletion (Tarjan)
```
**Similar problems:** 52 Articulation Point (same arrays, `>=` and a root rule), 53 Kosaraju (different question).
**Interview tip:** Say out loud "back edges update `low` with `tin[v]`, not `low[v]`" and "parent is not a back edge". Draw one cycle and one pendant edge. Contrast `>` with the articulation `>=` before they ask.

## 52. Articulation Point

### Problem Understanding

An **undirected** graph. An **articulation point** (cut vertex) is a vertex whose removal increases the number of connected components. takeUforward G-56.

**Input / Output / Constraints**
- Typical: `n` vertices, `m` undirected edges, 1-index or 0-index. n ≤ 10^5.
- Output: the list of articulation vertices (unique). Empty if none.
- Graph may be disconnected — outer DFS.
- A leaf is never an articulation point. An isolated vertex is not one either (removing it does not increase the count of remaining components in the usual "on the remaining graph" definition used here; GFG skips isolates).

**Observations**
- Removing a vertex deletes **all** its incident edges. That is stronger than deleting one edge, so the test is weaker: `>=` instead of `>`.
- Two independent rules:
  1. **Root** of the DFS tree is an AP iff it has **≥ 2 children in the DFS tree** (not graph degree).
  2. **Non-root** `u` is an AP iff some child `v` has `low[v] >= tin[u]`.
- `low[v] == tin[u]` means v can reach u (maybe via a back edge into u) but cannot reach an ancestor of u. Removing u still separates v from those ancestors.
- Graph-degree ≥ 2 does **not** imply AP: both neighbours may sit on one cycle through u.

**Example**
```text
    0 —— 1 —— 2
         |
         3

edges: 0-1, 1-2, 1-3
```
DFS from 0: 0 is root with **one** child (1) → 0 is not AP. 1 is non-root, children 2 and 3, `low[2]=tin[2] >= tin[1]`, `low[3] >= tin[1]` → **1 is AP**. 2 and 3 are leaves. Answer: `[1]`.

**Example 2 — cycle.** `0-1-2-0`. Root 0 has one DFS child; that child's `low` reaches 0. No AP.

**Example 3 — two triangles sharing a vertex.**
```text
0 — 1
 \ /
  2
 / \
3 — 4
```
2 is AP (and is the root if you start there with two DFS children, or a non-root with `low >= tin[2]` from one side).

### How to Think About the Problem

- What should I notice first? Vertex deletion, undirected. Same `tin`/`low` as bridges, different test.
- Which representation? Adj list.
- Mental model 6, vertex variant.
- Which traversal? The same DFS as problem 51, plus a `children` counter at the root and a `boolean[] isAP` so a node with several triggering children is recorded once.
- **Clue → Pattern:** *cut vertices → tin/low, root has ≥ 2 DFS children, else some child with `low[v] >= tin[u]`.*

### Intuition (Brute → Better → Optimal)
```text
Brute: for each vertex u, delete u, count components. O(V·(V+E))
        ↓
Observation: u is a cut iff some DFS-child subtree cannot reach
             strictly above u (or the root splits the tree in two).
        ↓
Optimal: same DFS as bridges. Tests: root children ≥ 2;
         non-root low[v] >= tin[u]. O(V+E)
```

### Brute Force Approach

**Basic idea.** For each candidate `u`, BFS on the graph ignoring `u`. If any remaining vertex is unreached from the first remaining vertex, or more generally if the component count of `V\{u}` exceeds that of G minus 1, `u` is an AP.

```java
import java.util.*;

class ArticulationBrute {
    static List<Integer> brute(int n, List<List<Integer>> adj) {
        List<Integer> ap = new ArrayList<>();
        int base = components(n, adj, -1);
        for (int u = 0; u < n; u++) {
            if (components(n, adj, u) > base) ap.add(u);
        }
        return ap;
    }

    static int components(int n, List<List<Integer>> adj, int skip) {
        boolean[] vis = new boolean[n];
        int c = 0;
        for (int i = 0; i < n; i++) {
            if (i == skip || vis[i]) continue;
            c++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(i);
            vis[i] = true;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (v == skip || vis[v]) continue;
                    vis[v] = true;
                    q.add(v);
                }
            }
        }
        return c;
    }
}
```

**Time Complexity Calculation:** V BFS runs, each O(V+E) → O(V(V+E)). Too slow for 10^5.

**Space Complexity Calculation:** O(V) vis + queue.

**Why can this be improved?** The DFS tree already knows which subtrees would fall off.

### Optimal Approach

The structure being exploited is an **undirected** graph. Same DFS tree as bridges.

**Core Observation**
If a child v cannot reach any ancestor of u, then every path from v's subtree to the rest of the graph goes through u. Removing u disconnects that subtree. Equality `low[v] == tin[u]` still counts: v can bounce off u but cannot go *above* u, so u is the hinge. The root is the special case with no ancestor: it is a hinge iff the DFS tree splits into two or more child subtrees (those subtrees do not otherwise connect, or DFS would have found a cross/back edge and they would not be separate children).

**Pattern Identification**
Tarjan articulation. `boolean[] isAP`. Count DFS children only for the root rule. Non-root test uses `>=`.

**Step-by-Step Intuition**
1. Same `tin`/`low` assignment as problem 51.
2. Keep `int children = 0` counting **unvisited** neighbours you recurse into.
3. After a child returns: `low[u] = min(low[u], low[v])`. If `parent != -1 && low[v] >= tin[u]`, set `isAP[u] = true`.
4. Back edge: `low[u] = min(low[u], tin[v])`, do **not** increment children.
5. After the neighbour loop: if `parent == -1 && children >= 2`, set `isAP[u] = true`.
6. *Invariant: `isAP[u]` is true iff removing u splits some pair of remaining vertices that were previously connected.*

**Dry Run** — first example, DFS 0 → 1 → 2, then 1 → 3.

| Step | Event | tin | low | children | AP? |
|------|-------|-----|-----|----------|-----|
| enter 0 | parent=-1 | tin[0]=0 | 0 | 0 | |
| enter 1 | from 0 | tin[1]=1 | 1 | | |
| enter 2 | from 1 | tin[2]=2 | 2 | | 2 is leaf |
| 2 returns | `low[2]=2 >= tin[1]=1` | | low[1]=1 | | **1 is AP** |
| enter 3 | from 1 | tin[3]=3 | 3 | | |
| 3 returns | `low[3]=3 >= tin[1]` | | | | 1 already AP |
| 1 returns | `low[1]=1 >= tin[0]=0`? 1==0? no. `>` is 1>0, so `>=` is true! | | | | Wait. |

Careful: `low[1]` after children 2 and 3 is `min(1, 2, 3) = 1`. Test at 0 (the parent of 1): `low[1] >= tin[0]` → `1 >= 0` is true, which would mark **0** as AP. Is 0 an AP in this graph?

Removing 0: remaining graph is 1-2, 1-3, still **one** component. 0 is a leaf of the graph. So 0 must NOT be an AP.

The root rule saves us: 0 is the root (`parent == -1`), so we **do not** apply `low[v] >= tin[u]` to the root. We only look at `children >= 2`. 0 has one DFS child (1), so 0 is not AP. That is why the root is special-cased. The `>=` test on the root is meaningless because there is no "above the root".

Final: `isAP = [F, T, F, F]`. Answer `[1]`.

**Why Does It Work?**
In the DFS tree, the only vertices whose removal can disconnect anything are (a) a root that owns two or more child subtrees with no back edge between those subtrees (otherwise they would not be separate children), and (b) a non-root that is the unique escape hatch of some child subtree. `low[v] >= tin[u]` is exactly "v's subtree cannot skip u". The bridge test is stricter (`>`): an edge can fail to be a bridge while its lower endpoint's parent is still a cut vertex (`low[v] == tin[u]`).

**Java Code**

```java
import java.util.*;

class ArticulationPoints {
    private List<List<Integer>> adj;
    private int timer;
    private int[] tin, low;
    private boolean[] isAP;

    List<Integer> articulationPoints(int n, List<List<Integer>> adjList) {
        adj = adjList;
        tin = new int[n];
        low = new int[n];
        isAP = new boolean[n];
        Arrays.fill(tin, -1);
        timer = 0;
        for (int i = 0; i < n; i++) {
            if (tin[i] == -1) dfs(i, -1);
        }
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < n; i++) if (isAP[i]) ans.add(i);
        return ans;
    }

    private void dfs(int u, int parent) {
        tin[u] = low[u] = timer++;
        int children = 0;
        for (int v : adj.get(u)) {
            if (v == parent) continue;
            if (tin[v] == -1) {
                dfs(v, u);
                low[u] = Math.min(low[u], low[v]);
                if (parent != -1 && low[v] >= tin[u]) {
                    isAP[u] = true;
                }
                children++;
            } else {
                low[u] = Math.min(low[u], tin[v]);
            }
        }
        if (parent == -1 && children >= 2) {
            isAP[u] = true;
        }
    }
}
```

**Complexity**

**Time Complexity Calculation:** One DFS, O(V+E). Collecting the answer is O(V).

**Space Complexity Calculation:** tin, low, isAP O(V), adj O(V+E), recursion O(V).

### Pattern to Remember
```text
Clue: "articulation points" / "cut vertices" / "vertices whose removal disconnects"
Pattern: same tin/low DFS; root iff ≥ 2 DFS children; else low[child] >= tin[u]
Mental model: connectivity under deletion (Tarjan, vertex form)
```
**Similar problems:** 51 Bridges (`>` vs `>=`), 53 SCC (directed, different tool).
**Interview tip:** Draw the path `0-1-2` and say "0 is the root with one child, so it is **not** an AP even though `low[1] >= tin[0]`". That sentence is how they know you did not copy the bridge code and change a symbol.

## 53. Strongly Connected Components — Kosaraju's Algorithm

### Problem Understanding

A **directed** graph. A **strongly connected component (SCC)** is a maximal set of vertices such that for every pair `u, v` in the set, `u` can reach `v` **and** `v` can reach `u`. Kosaraju's algorithm finds all SCCs. takeUforward G-54 / GFG "Strongly Connected Components (Kosaraju's Algorithm)". The A2Z sheet's LeetCode link for this row is a known copy/paste error — do not hunt for an LC number; implement the GFG problem (return the count, and be ready to list the components).

**Input / Output / Constraints**
- `V` vertices, directed edge list. V, E ≤ 10^5.
- Output (GFG): number of SCCs. Interview follow-up: list the components; the condensation DAG.
- Graph may be disconnected (in the weak sense): outer loop on pass 1.
- Self-loop: a vertex with a self-loop is still one SCC by itself unless it participates in a larger mutual set. Self-loop does not merge with anyone else by itself.

**Observations**
- Undirected "connected component" is BFS. Directed "strong" needs both directions. A cycle of directed edges is one SCC; a DAG has V SCCs of size 1.
- The SCCs themselves condense into a **DAG** (no directed cycles between components).
- Kosaraju: finish-order on G, DFS on G^T in reverse finish order.
- Tarjan SCC is a one-pass `tin`/`low` + node stack. Same output, different code. This sheet wants Kosaraju.

**Example**
```text
    0 → 1 → 2
    ↑   ↓   ↓
    └─ ←    3

edges: 0→1, 1→2, 2→0, 1→3
```
{0,1,2} are mutually reachable. 3 is reachable from them but cannot return. SCCs: `{0,1,2}`, `{3}`. Count = 2.

**Example 2 — DAG.** `0→1→2`. Three SCCs.

**Example 3 — n=1.** One SCC.

### How to Think About the Problem

- What should I notice first? Directed, "mutually reachable", "components" that are not undirected floods.
- Which representation? Adj list **and** the transpose adj list.
- Mental model 6, the SCC half.
- Which traversal? Two DFS passes. Not `tin`/`low` unless they ask Tarjan.
- **Clue → Pattern:** *SCCs / "can each reach the other?" → Kosaraju: finish stack on G, DFS on transpose in pop order.*

### Intuition (Brute → Better → Optimal)
```text
Brute: for every u, BFS/DFS forward and backward; union mutually
       reachable pairs. O(V·(V+E))
        ↓
Observation: SCCs condense to a DAG. Finish times of G are a
             topological order of that DAG. A sink of G^T is a
             source of G. DFS from a sink of G^T cannot leave the SCC.
        ↓
Optimal: Kosaraju two-pass. O(V+E)
```

### Brute Force Approach

**Basic idea.** For each vertex, compute the reachable set in G and in G^T. Vertices that see each other both ways belong together; union-find them.

```java
import java.util.*;

class SccBrute {
    static int count(int n, List<List<Integer>> adj) {
        List<List<Integer>> radj = transpose(n, adj);
        int[] id = new int[n];
        for (int i = 0; i < n; i++) id[i] = i;
        for (int u = 0; u < n; u++) {
            boolean[] fwd = reach(u, adj, n);
            boolean[] bwd = reach(u, radj, n);
            for (int v = 0; v < n; v++) {
                if (fwd[v] && bwd[v]) id[find(id, v)] = find(id, u);
            }
        }
        int c = 0;
        for (int i = 0; i < n; i++) if (find(id, i) == i) c++;
        return c;
    }

    static boolean[] reach(int s, List<List<Integer>> g, int n) {
        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(s);
        vis[s] = true;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : g.get(u)) if (!vis[v]) {
                vis[v] = true;
                q.add(v);
            }
        }
        return vis;
    }

    static int find(int[] id, int x) {
        while (id[x] != x) {
            id[x] = id[id[x]];
            x = id[x];
        }
        return x;
    }

    static List<List<Integer>> transpose(int n, List<List<Integer>> adj) {
        List<List<Integer>> r = new ArrayList<>();
        for (int i = 0; i < n; i++) r.add(new ArrayList<>());
        for (int u = 0; u < n; u++) for (int v : adj.get(u)) r.get(v).add(u);
        return r;
    }
}
```

**Time Complexity Calculation:** V searches, each O(V+E) → O(V(V+E)).

**Space Complexity Calculation:** O(V+E) transpose + O(V) vis.

**Why can this be improved?** Mutual reachability is constant on an SCC. You only need one representative per component.

### Optimal Approach

The structure being exploited is a **directed** graph. SCCs + condensation DAG.

**Core Observation**
Finish order of a DFS on G is a topological order of the condensation DAG (an SCC finishes only after every SCC it can reach has had a chance to finish — actually: a vertex's finish is after all descendants, so an edge SCC_A → SCC_B in the condensation implies B finishes before A). Therefore the **last-finished** vertex of G lies in a **source** SCC of G, which is a **sink** SCC of G^T. A DFS on G^T from that vertex paints exactly that SCC: every outgoing condensation edge of G has been reversed, so from a sink of G^T you cannot walk into another SCC.

**Pattern Identification**
Kosaraju: (1) DFS G, push on finish into an `ArrayDeque`. (2) Build transpose. (3) Pop deque, DFS G^T, each call paints one SCC.

**Step-by-Step Intuition**
1. Pass 1: for every unvisited u, DFS G; on exit `order.addLast(u)`.
2. Build `radj`: for every `u → v`, add `v → u`.
3. Reset `vis`. While the deque is non-empty, pop `u = order.removeLast()`. If unvisited, start a new component, DFS-paint on `radj`.
4. *Invariant: the k-th paint call on G^T is the k-th SCC, and vertices painted together are exactly one SCC.*

**Dry Run** — the example.

Adj G: `0:[1]  1:[2,3]  2:[0]  3:[]`

Pass 1 from 0:
```text
enter 0
  enter 1
    enter 2
      2 → 0 already vis
    finish 2        stack: [2]
    enter 3
    finish 3        stack: [2, 3]
  finish 1          stack: [2, 3, 1]
finish 0            stack: [2, 3, 1, 0]
```

Transpose G^T: `0:[2]  1:[0]  2:[1]  3:[1]`

Pass 2, pop 0: paint 0 → 2 → 1. Component `{0,2,1}`.
Pop 1: already painted. Pop 3: paint `{3}`. Pop 2: already painted.

SCCs: `{0,1,2}`, `{3}`. Count = 2.

**Why Does It Work?**
Condensation is a DAG, so it has sources and sinks. Reverse-finish on G is a valid processing order of that DAG from sources of G / sinks of G^T. Starting a DFS on G^T at a sink component cannot leak: every edge that left the component in G now enters it in G^T, and a sink has no outgoing G^T edges to other components. After that component is painted, the next unpainted vertex from the stack is a sink of the remaining condensation, and the argument repeats.

**Java Code**

```java
import java.util.*;

class Kosaraju {
    static int stronglyConnectedComponents(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        List<List<Integer>> radj = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            adj.add(new ArrayList<>());
            radj.add(new ArrayList<>());
        }
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            radj.get(e[1]).add(e[0]);
        }

        boolean[] vis = new boolean[n];
        ArrayDeque<Integer> order = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            if (!vis[i]) dfs1(i, adj, vis, order);
        }

        Arrays.fill(vis, false);
        int scc = 0;
        List<List<Integer>> comps = new ArrayList<>();
        while (!order.isEmpty()) {
            int u = order.removeLast();
            if (vis[u]) continue;
            List<Integer> comp = new ArrayList<>();
            dfs2(u, radj, vis, comp);
            comps.add(comp);
            scc++;
        }
        return scc; // comps holds the partitions if the interviewer wants them
    }

    static void dfs1(int u, List<List<Integer>> adj, boolean[] vis,
                     ArrayDeque<Integer> order) {
        vis[u] = true;
        for (int v : adj.get(u)) if (!vis[v]) dfs1(v, adj, vis, order);
        order.addLast(u); // finish
    }

    static void dfs2(int u, List<List<Integer>> radj, boolean[] vis,
                     List<Integer> comp) {
        vis[u] = true;
        comp.add(u);
        for (int v : radj.get(u)) if (!vis[v]) dfs2(v, radj, vis, comp);
    }
}
```

| | Kosaraju | Tarjan SCC |
|---|---|---|
| Passes | two DFS + an explicit transpose | one DFS |
| Extra arrays | finish deque, `radj` | `tin`, `low`, node stack |
| When to write | this sheet; easier to prove out loud | tight memory, one pass |
| Bridge/AP reuse | none — do not reuse this stack for `low` | `tin`/`low` are the same names as 51–52, **different stack meaning** |

**Complexity**

**Time Complexity Calculation:** DFS1 O(V+E), transpose O(V+E), DFS2 O(V+E). Total O(V+E).

**Space Complexity Calculation:** two adj lists O(V+E), vis O(V), deque O(V), recursion O(V).

### Pattern to Remember
```text
Clue: "strongly connected" / "mutually reachable" / "condensation DAG"
Pattern: Kosaraju — finish-order DFS on G, DFS on transpose in pop order
Mental model: connectivity under directed mutual reachability
```
**Similar problems:** 51–52 (undirected deletion, `tin`/`low` — do not mix), 20/23 directed cycle (a graph is a DAG of SCCs; a cycle lives inside an SCC of size ≥ 2 or a self-loop).
**Interview tip:** Sketch the condensation DAG and say "last finished in G is a source SCC, hence a sink in the transpose, hence one DFS cannot escape". If they ask for Tarjan SCC, say you can do it, but write Kosaraju unless they insist — mixing the node stack with the bridge `low` array is the classic on-site bug.

# Final Summary — All 53 Questions Grouped by Pattern

### Pattern Grouping

| Pattern | Problem numbers | One-line tell |
|---|---|---|
| Representation & walkers | 1, 2, 3, 4, 5, 6 | Build the graph, then BFS/DFS, plus the outer loop on disconnected input |
| Region counting / flood | 7, 8, 10, 15, 18, 48, 49 | One connected piece of land / color / emails is one answer unit |
| Multi-source BFS | 9, 13, 14, 15 | Push every source at distance 0; the wave is the answer |
| Boundary-first flood | 14, 15 | Start from the border so the interior leftover is "surrounded" |
| Undirected cycle | 11, 12 | Visited neighbour that is **not** the parent |
| Directed cycle | 20, 23, 24 | `pathVisited` / 3-colour, **or** Kahn leftover indegree > 0 |
| Bipartite / 2-colour | 19 | Conflict on the same colour ⇔ odd cycle |
| Topological ordering | 21, 22, 23, 24, 25, 26, 27 | Peel indegree 0 (Kahn) or reverse DFS finish |
| Reverse-graph / safe nodes | 26 | Terminals become sources; nodes that reach a cycle are unsafe |
| Unweighted shortest | 16, 17, 28, 32, 37 | BFS hops. Word graph, grid, residue graph |
| All shortest paths (layers) | 17 | Parent DAG at equal distance, then DFS |
| DAG shortest | 29 | Topo order, then relax each edge once |
| Dijkstra family | 30, 31, 33, 35, 36, 50 | Non-negative weights, PQ, first pop is final |
| Minimize the maximum | 33, 50 | Dijkstra on running max, **or** binary search + BFS |
| Constrained / k-relax | 34 | At most K+1 edges: Bellman-Ford K+1 rounds or layered Dijkstra |
| Bellman-Ford | 34, 38 | Relax E edges V-1 times; V-th pass = negative cycle |
| All-pairs | 39, 40 | Floyd-Warshall, `k` outermost |
| Counting on shortest paths | 36 | `ways[v] += ways[u]` on equal dist, reset on better |
| MST | 41, 42, 44 | Cut property. Prim PQ, Kruskal sort+DSU |
| DSU merging | 43, 44, 45, 46, 47, 48, 49, 50 | Components, online unions, sentinel nodes |
| Tarjan tin/low | 51, 52 | Bridges `>`; articulations `>=` plus root-children |
| Kosaraju SCC | 53 | Finish on G, DFS on G^T |

### One-Paragraph Takeaways

**PART A.** A graph problem is a representation problem first. Adj list for sparse, matrix for dense / all-pairs, edge list for Kruskal and Bellman-Ford, dirs-array for grids. BFS is a queue; DFS is a stack (call stack or `ArrayDeque`). The outer `for` over unvisited nodes is how disconnected graphs exist. Forget it and you solve a different problem.

**PART B.** BFS and DFS are the same walker. What changes is the seed set and the extra bit on a node: parent (undirected cycle), colour (bipartite), "I started from the border" (surrounded / enclaves), or a BFS level (rotten oranges, 01-matrix, word ladder). Multi-source means push every source before you start draining the queue. Word Ladder II is the reminder that "visited" on an unweighted graph is per **distance**, not per lifetime, when you want all shortest paths.

**PART C.** Topological order exists if and only if the graph is a DAG. DFS post-order reversed, or Kahn's indegree peel — same order family. Kahn's leftover `count != V` is a directed cycle. Course Schedule is that sentence with homework. Eventual Safe States is Kahn on the **reversed** graph. Alien Dictionary is "first differing character → directed edge", plus the prefix-invalid case.

**PART D.** One relaxation line builds five algorithms. Unit weight → BFS. DAG → topo then relax. Non-negative → Dijkstra (PQ or TreeSet; first pop is final). Negatives → Bellman-Ford (and the extra pass for a negative cycle). All-pairs → Floyd-Warshall with `k` outermost. "Minimize the maximum" is Dijkstra on the running max, or binary search on the threshold. "At most K stops" is relaxation with a snapshot. Ways-to-arrive is Dijkstra plus a `ways[]` that adds on ties.

**PART E.** A spanning tree has V-1 edges and no cycle. The cut property makes greedy safe: Prim grows a tree with a PQ on **edge weight into the tree** (not path distance — that is Dijkstra). Kruskal sorts and DSU-skips cycle-closing edges. After you can write DSU with path compression and union by size, the rest of the part is "what are the elements?": computers, row/col sentinels, emails, cells added over time, island ids you must **dedupe** before summing.

**PART F.** Deletion questions use `tin`/`low`. Bridges: `low[child] > tin[u]`. Articulation: `low[child] >= tin[u]`, and the root is an AP iff it has two or more DFS children. Back edges update `low` with `tin[v]`, never `low[v]`. Mutual-reachability questions use Kosaraju: finish order on G, DFS on the transpose. Do not share a stack between Tarjan-bridges and Kosaraju.

### Exam Checklist — How To Recognize On The Spot

```text
Count/browse connected stuff in a grid or matrix?     -> BFS/DFS flood fill
Something spreads from multiple sources at once?      -> multi-source BFS
The leftover after "not touching the border"?         -> flood FROM the border first
One-letter / one-step unweighted transform?           -> BFS on the implicit word/grid graph
ALL shortest sequences, not one?                      -> BFS layers + parent DAG + DFS
Odd cycle / two teams / 2-colour?                     -> bipartite DFS/BFS
Visited neighbour in an UNDIRECTED graph?             -> cycle iff neighbour != parent
Back edge to a node still on the recursion stack?     -> directed cycle (pathVisited)
Dependencies / ordering / "prerequisites"?            -> topological sort (Kahn)
Can I finish all courses / is it a DAG?               -> Kahn count == V
"Eventually safe" / every path ends at a terminal?    -> reverse edges + Kahn
Alien words already sorted?                           -> first mismatch → edge; watch prefixes
Shortest path on uniform cost (incl. 0-1 grid)?       -> BFS  (Dijkstra is overkill)
Shortest path in a DAG?                               -> topo + relax, O(V+E)
Shortest path, positive weights?                      -> Dijkstra (PQ; first pop final)
"Why not a plain queue?" for positive weights?        -> FIFO is BFS; it ignores smaller keys
Negative weights?                                     -> Bellman-Ford
Negative cycle exists?                                -> V-th relaxation still improves
All pairs shortest / n ≤ ~400?                        -> Floyd-Warshall, k outermost
Cheapest with at most K stops?                        -> K+1 Bellman-Ford rounds / layered Dijkstra
Number of shortest paths?                             -> Dijkstra + ways[] on equal dist
State is "value % M", min operations?                 -> BFS on residues
"Minimize the maximum edge / cell on a path"?         -> Dijkstra-on-max, or BS + BFS
MST / min total connection cost?                      -> Prim or Kruskal
Merge groups / extra cables / same row or col?        -> DSU; answer often n - components
Online "add a cell, how many islands now"?            -> DSU, union only the new cell
Flip one zero to make the largest island?             -> sizes first, then dedupe neighbour roots
"Edges whose removal disconnects"?                    -> Tarjan tin/low, low[v] > tin[u]
"Vertices whose removal disconnects"?                 -> Tarjan, low[v] >= tin[u], root ≥ 2 children
"Sets that are mutually reachable"?                   -> Kosaraju SCC
```

### Complexity Cheat Sheet

Grids: `N = n·m`, `E ≈ 4N` (or 8N). `V` vertices, `E` edges. `α` = inverse Ackermann.

| # | Problem | Brute | Optimal |
|---|---|---|---|
| 1 | Graph Representation (Java) | matrix O(n²) build/space | list O(n+m) build, O(n+m) space |
| 2 | Graph Representation (Java lens) | boxed `Integer[][]` | `List<List<Integer>>` / `int[]{v,w}` |
| 3 | Connected Components | O(V²) matrix scans | O(V+E) DFS/BFS + outer loop |
| 4 | BFS | — | O(V+E) |
| 5 | DFS | recursion O(V) stack risk | O(V+E) recursive or iterative |
| 6 | DFS on a Grid | O(N²) per-cell flood | O(N) flood, each cell once |
| 7 | Number of Provinces | O(n³) Floyd-like | O(n²) DFS on the matrix (E ≤ n²) |
| 8 | Grid component counting | O(N²) | O(N) |
| 9 | Rotten Oranges | O(N²) BFS per rotten | O(N) multi-source BFS |
| 10 | Flood Fill | O(N) already | O(size of region) ≤ O(N) |
| 11 | Undirected cycle (BFS) | enumerate paths exp. | O(V+E) parent BFS |
| 12 | Undirected cycle (DFS) | enumerate paths exp. | O(V+E) parent DFS |
| 13 | 01 Matrix / nearest 1 | O(N²) BFS per cell | O(N) multi-source BFS |
| 14 | Surrounded Regions | O(N²) region+border tests | O(N) border flood |
| 15 | Number of Enclaves | O(N²) | O(N) border flood + count |
| 16 | Word Ladder I | DFS all paths exp. | O(W·L·26) BFS, W=dict size |
| 17 | Word Ladder II | all paths exp. | O(W·L·26) BFS + DFS on DAG |
| 18 | Number of Islands | O(N²) | O(N) flood |
| 19 | Is Graph Bipartite | odd-cycle enum exp. | O(V+E) 2-colour |
| 20 | Directed cycle (DFS) | path enum exp. | O(V+E) pathVisited |
| 21 | Topo sort (DFS) | all permutations V! | O(V+E) reverse postorder |
| 22 | Topo sort (Kahn) | all permutations V! | O(V+E) indegree peel |
| 23 | Directed cycle (Kahn) | path enum exp. | O(V+E) count vs V |
| 24 | Course Schedule I | backtracking | O(V+E) Kahn/DFS |
| 25 | Course Schedule II | backtracking | O(V+E) Kahn recording order |
| 26 | Eventual Safe States | DFS per node × paths | O(V+E) reverse Kahn or colour DFS |
| 27 | Alien Dictionary | all letter perms | O(C + E) Kahn, C = #unique letters |
| 28 | Unit-weight shortest | Dijkstra O((V+E) log V) | O(V+E) BFS |
| 29 | Shortest path in a DAG | Dijkstra | O(V+E) topo + relax |
| 30 | Dijkstra (PQ) | Bellman-Ford O(VE) | O((V+E) log V) lazy PQ |
| 31 | Dijkstra (TreeSet) | Bellman-Ford O(VE) | O((V+E) log V) with decrease-key |
| 32 | Binary Maze (8-dir) | Dijkstra | O(N) BFS |
| 33 | Path with Minimum Effort | all paths exp. | O(N log N) Dijkstra, or O(N log H) BS+BFS |
| 34 | Cheapest Flights Within K Stops | Dijkstra without K, wrong | O(K·E) snapshot BF / layered |
| 35 | Network Delay Time | Floyd O(n³) | O((V+E) log V) Dijkstra, answer max |
| 36 | Ways to Arrive | path DFS exp. | O((V+E) log V) Dijkstra + ways[] |
| 37 | Min Multiplications | DFS on values unbounded | O(M · \|arr\|) BFS, M=1e5 |
| 38 | Bellman-Ford | Floyd O(n³) | O(V·E), plus 1 pass for cycle |
| 39 | Floyd-Warshall | V Dijkstra runs | O(n³), k outermost |
| 40 | City with Threshold | V Dijkstra O(n·(n+E) log n) | O(n³) Floyd, n≤100 |
| 41 | MST Theory | enumerate trees exp. | Kruskal/Prim O(E log E) |
| 42 | Prim | Kruskal same answer | O(E log V) PQ |
| 43 | DSU | lists / DFS rebuild | O(α(V)) find/union |
| 44 | MST weight | Prim or Kruskal | O(E log E) Kruskal |
| 45 | Make Network Connected | BFS components | O(n + E) DSU; ans = cc-1 |
| 46 | Most Stones Removed | BFS on n² pairs | O(n·α(n)) sentinel DSU |
| 47 | Accounts Merge | pairwise email scans | O(A·α + E log E) DSU + sort |
| 48 | Number of Islands II | O(Q·N) refill | O(Q·α(N)) online DSU |
| 49 | Making a Large Island | O(N²) flip+flood each 0 | O(N) label sizes + dedupe |
| 50 | Swim in Rising Water | all paths / O(N² log) naive | O(N log N) Dijkstra / DSU / BS+BFS |
| 51 | Bridges (Tarjan) | O(E·(V+E)) delete+BFS | O(V+E) tin/low |
| 52 | Articulation Point | O(V·(V+E)) delete+BFS | O(V+E) tin/low |
| 53 | Kosaraju SCC | O(V·(V+E)) pair reach | O(V+E) two DFS + transpose |

### A Closing Note on How to Study This

- Memorise **clue → pattern → template**, not 53 codes. The Pattern to Remember box at the end of each problem is the flashcard.
- Before you type, ask four questions out loud: is it a graph or a grid (or words, or a matrix)? Which representation? Which traversal — BFS, DFS, topo, Dijkstra, DSU, Tarjan? Which primitive am I reusing (parent, pathVisited, relaxation, union, tin/low)?
- Re-derive, on blank paper, until they are automatic: BFS with a distance array, Kahn's indegree peel, Dijkstra's "first pop is final", DSU find+union-by-size. Those four are the muscle; everything else is a flag on top.
- Dry-run `tin`/`low` once on a 6-node picture with one cycle and one bridge. If you can fill the two arrays without looking, problems 51 and 52 will not surprise you.
- Do not skip the **why the naïve idea fails** paragraph. Interviews are won on that sentence (global visited on Word Ladder II, no snapshot on K-stops, summing neighbour island sizes without deduping roots, parent-only cycle check on a directed graph, `low[v]` on a back edge).
- Revision loop: Foundation page + this summary. Reopen a problem only when a template feels shaky. When it is shaky, redo the dry-run table, not the Java.
