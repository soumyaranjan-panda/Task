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
