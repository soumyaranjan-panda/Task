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
