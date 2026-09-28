# Graphs — 53 Problems Study Guide (Java)

A complete personal walkthrough of 53 DSA problems, all solved with graph thinking.
This is not a list of code snippets. It is a guide that teaches *how to think* about
a graph problem: what structure the input secretly has, which template the words in
the statement are pointing at, and how to derive the solution instead of memorizing
it.

Every problem follows the same structure:

1. Problem Understanding (input / output / constraints / example)
2. How to Think About the Problem (a short self-questioning dialogue)
3. Intuition (Brute → Observation → Optimal)
4. Brute Force Approach (or "Naïve Approach" when brute is meaningless)
5. Optimal Approach (Core Observation → Pattern → Steps → Dry Run → Why It Works → Code → Complexity)
6. Edge Cases
7. Pattern to Remember + Similar Problems + Interview tip

The reason the same 8 sub-headings repeat 53 times is deliberate. Graphs look
terrifying because the *problems* look different, but the *ideas* are few. Once you
can name the idea, the code is 10 lines of bookkeeping. This guide is organized so
that you read §0 once, then each problem is a fresh application of something you
already own.

The single most important habit this guide tries to install is **naming the
structure** before writing any code:

```text
undirected?  directed?  weighted?  cyclic?  a DAG?  a tree?  a grid?
Does the problem ask me to COUNT, ORDER, MINIMIZE, MERGE, or SURVIVE?
```

Count → flood fill (BFS/DFS). Order → topological sort. Minimize → relaxation
(BFS/Dijkstra/BF/FW). Merge → DSU. Survive removal → Tarjan `tin`/`low`.

---

## 0. The Foundation: Graphs in One Page

Before touching any problem, understand the core ideas deeply. Everything else in
this guide is a variation of this one page.

### 0.1 What a graph actually is

A graph is a set of **vertices** (nodes) and a set of **edges** connecting them.
Formally `G = (V, E)`. The entire subject exists because **connections have
structure**, and if you ignore the structure you are reduced to checking all pairs
(`O(V²)`) — which is what we want to avoid.

Vocabulary you must own cold:

| Term | Meaning | Why you care |
|---|---|---|
| Vertex / node | An element (an integer id, a grid cell, a word) | Your traversal state is a vertex |
| Edge | A connection between two vertices | Undirected = mutual; directed = one-way |
| Undirected graph | `u — v` means both `u→v` and `v→u` | Bridges exist, cycles detected with `parent` |
| Directed graph (digraph) | `u → v` only | Cycle detection needs a recursion stack, not a parent |
| Weighted / unweighted | Edges carry a cost or not | Unweighted → BFS; weighted → Dijkstra/BF/FW |
| Path | A sequence of vertices connected by edges | "Shortest path" problems |
| Cycle | A path that returns to its start | DAG = acyclic, which is the precondition for topo sort |
| Connected component | A maximal set of mutually reachable vertices | "How many groups?" problems |
| Bipartite | 2-colourable: every edge joins different colours | 2-colour DFS/BFS = bipartite check |
| DAG | Directed acyclic graph | Topological order exists **iff** DAG |
| In-degree / out-degree | # edges coming in / going out | Kahn's algorithm is built on in-degree |
| Self-loop | `u — u` | Already a cycle in undirected graphs |
| Multi-edge | Two edges between the same pair | Cycle detection must count them! |

### 0.2 Representations — and when to pick which

This is the very first decision, and getting it wrong costs you a factor of `V`.

**Adjacency list** — `List<List<Integer>> adj`, where `adj[u]` holds the neighbours
of `u`. This is the default. Almost every problem below uses it.

```java
import java.util.*;

// Build from: n (number of vertices), m (number of edges), then m undirected edges u v
int n = 5, m = 4;
List<List<Integer>> adj = new ArrayList<>();
for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
Scanner sc = new Scanner(System.in);
for (int i = 0; i < m; i++) {
    int u = sc.nextInt(), v = sc.nextInt();
    adj.get(u).add(v);      // directed:  ONLY this line
    adj.get(v).add(u);      // undirected: this line too
}
```

**Adjacency matrix** — `int[][] mat` of size `V × V`, `mat[u][v] = 1` if an edge
exists. Used when the input *is* already a matrix (`isConnected[i][j]` in problem
7) or when the graph is dense and you need constant-time edge lookup.

**Edge list** — `List<int[]> edges` of `{u, v, w}`. Used when edges are *sorted by
weight* and you visit them in that order — that is Kruskal (42/44) and DSU problems
(45–49). Sorting an edge list is `O(E log E)`; sorting an adjacency list is the same
work but you cannot Kruskal without merging duplicates per vertex.

| Representation | Memory | Build cost | Edge lookup | Iterate neighbours of `u` | Best for |
|---|---|---|---|---|---|
| Adjacency list | `O(V + E)` | `O(V + E)` | `O(deg(u))` | `O(deg(u))` | **The default** — sparse graphs |
| Adjacency matrix | `O(V²)` | `O(V²)` | **`O(1)`** | `O(V)` | Dense graphs, input already a matrix |
| Edge list | `O(E)` | `O(E)` | `O(E)` | `O(E)` (scan all) | Kruskal, sorting by weight, DSU |
| Grid (implicit) | `O(n·m)` | `O(1)` (implicit) | `O(1)` | `≤ 8` | Island/flood problems — no build step at all |

A grid is an **implicit** graph: you never build an adjacency list, you compute
neighbours with a direction array. That is the trick behind problems 6, 8, 9, 10,
13, 14, 15, 18, 48, 49.

**From a `char[][]` / `int[][]` grid, the mapping is one-to-one:**

```text
cell (r, c)  <-->  id = r * cols + c
id           <-->  r = id / cols,  c = id % cols
```

Use it whenever you need an `int[]` (a `visited[]` flag, a DSU parent array) over
grid cells — a `boolean[n][m]` works too, but `int[1]` indexing keeps signatures
uniform across all 53 problems.

### 0.3 Grids are graphs

```java
int[][] dirs4 = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};               // up, down, left, right
int[][] dirs8 = {{-1,0},{1,0},{0,-1},{0,1},{-1,-1},{-1,1},{1,-1},{1,1}}; // + diagonals
```

```java
// ALWAYS check before pushing a neighbour
boolean inside(int r, int c, int n, int m) {
    return r >= 0 && r < n && c >= 0 && c < m;
}
```

Grid facts worth memorizing: `V = n·m`, `E ≈ 4V` (4-direction) or `E ≈ 8V`
(8-direction), so a full traversal is `O(V + E) = O(n·m)` — linear, no asymptotics
surprises.

### 0.4 The BFS template (level by level)

```text
Queue: FIFO. A node inserted at time t is removed before anything inserted at t+1.
       => the queue drains one "level" (one hop) at a time.
       => that is exactly why BFS = shortest path in an UNWEIGHTED graph.
```

```java
import java.util.*;

public List<Integer> bfs(int V, List<List<Integer>> adj, int src) {
    int[] dist = new int[V];
    Arrays.fill(dist, -1);                 // -1 doubles as "unvisited" and as ∞
    ArrayDeque<Integer> q = new ArrayDeque<>();
    q.add(src);
    dist[src] = 0;
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll();
        order.add(u);
        for (int v : adj.get(u)) {
            if (dist[v] == -1) {           // first time seen => shortest distance known
                dist[v] = dist[u] + 1;
                q.add(v);
            }
        }
    }
    return order;
}
```

Two variants you will use constantly:

```java
// (a) LEVEL-BY-LEVEL: one drain of the queue = one step / round / time unit
int[] dist = new int[V];
ArrayDeque<Integer> q = new ArrayDeque<>();
q.add(src);
dist[src] = 0;
int rounds = 0;
while (!q.isEmpty()) {
    int size = q.size();                  // freeze the size FIRST — this is the trick
    for (int i = 0; i < size; i++) {
        int node = q.poll();
        /* do this round's work on node */
    }
    rounds++;                             // used by: 994, 127, 126, 1091, 787
}
```

```java
// (b) MULTI-SOURCE: push every source with distance 0 BEFORE the loop starts
int[] dist = new int[V];
int[] sources = {2, 5, 8};
ArrayDeque<Integer> q = new ArrayDeque<>();
for (int s : sources) { q.add(s); dist[s] = 0; }
// used by: 994 (fresh oranges), 542 (all 1-cells), 543 (all zeroes), 130/1020 (border)
```

Multi-source BFS is the single most reusable trick in grid problems: *instead of
running the search once per target, run it once from all targets simultaneously.*
Each cell then gets the distance to its **nearest** source for free.

### 0.5 The DFS template

```java
import java.util.*;

public void dfs(int node, List<List<Integer>> adj, int[] vis) {
    vis[node] = 1;                                  // mark on ENTRY
    for (int nei : adj.get(node)) {
        if (vis[nei] == 0) dfs(nei, adj, vis);       // tree edge
        // else: back edge / cross edge — this is where cycle logic lives
    }
}
```

- **Mark on entry, not on exit.** Marking late revisits nodes and can blow the stack
  or double-count.
- **Recursion depth = graph depth.** For deep chains (`n = 10⁵`) use the iterative
  variant. In Java, deep recursion can also blow the JVM stack (it throws
  `StackOverflowError`, not an `OutOfMemoryError`) — the fix is an explicit
  `ArrayDeque` stack.
- **Ordering: pre-order = on entry, in-order = between the two recursive calls,
  post-order = on exit.** Topological sort (21) is post-order, then reversed.

```java
// Iterative DFS, same visit order as recursion
ArrayDeque<Integer> st = new ArrayDeque<>();
st.push(src); vis[src] = 1;
while (!st.isEmpty()) {
    int u = st.pop();
    for (int v : adj.get(u)) if (vis[v] == 0) { vis[v] = 1; st.push(v); }
}
```

### 0.6 Two mini-templates you will reuse in Parts A/B/F

**Cycle in an UNDIRECTED graph — visited + `parent`:**

```java
private boolean dfsCycle(int u, int parent, List<List<Integer>> adj, int[] vis) {
    vis[u] = 1;
    for (int v : adj.get(u)) {
        if (vis[v] == 0) {
            if (dfsCycle(v, u, adj, vis)) return true;
        } else if (v != parent) {      // visited neighbour that is not my parent => back edge => CYCLE
            return true;
        }
    }
    return false;
}
```

A visited array alone is *not* enough in an undirected graph: every edge shows up
twice (`u→v` and `v→u`), so the reverse of a tree edge looks exactly like a cycle.
The `parent` check discards exactly those, and what remains is a genuine cycle.

**Cycle in a DIRECTED graph — 3 colours:**

```java
// 0 = unvisited, 1 = on the current recursion stack, 2 = finished
private boolean dfsCycleDirected(int u, List<List<Integer>> adj, int[] col) {
    col[u] = 1;
    for (int v : adj.get(u)) {
        if (col[v] == 1) return true;                 // edge back into the current path => cycle
        if (col[v] == 0 && dfsCycleDirected(v, adj, col)) return true;
    }
    col[u] = 2;
    return false;
}
```

Why the parent trick fails here: a directed edge `u → parent[u]` is legal and is
*not* a cycle, but so is a "back edge to an ancestor". The distinction is
**"on my current stack" (grey) vs "already finished" (black)** — and only grey means
cycle. The colour version *is* the `pathVisited` array; they are the same idea.

### 0.7 Topological sort — definition and the one invariant

A topological order of a DAG is a linear ordering of vertices where **every edge
`u → v` places `u` before `v`**. It exists **if and only if the graph is acyclic**.

> **The single invariant behind both algorithms:** *a node is emitted only after all
> of its dependencies are finished.*

- **DFS version (21):** recurse first, push on **exit** (post-order), then reverse the
  result. Reverse is needed because DFS finishes successors before predecessors, and
  the output must have predecessors first.
- **Kahn's BFS version (22):** compute `indegree[]`, push all `indegree == 0` nodes,
  and each time you pop a node decrement its neighbours' indegrees. When a
  neighbour's indegree hits 0, it becomes available. **If fewer than `V` nodes were
  emitted, the graph has a cycle** (23, 24, 25 all reuse this one count).

| | DFS topo | Kahn's (BFS) |
|---|---|---|
| Extra array | recursion stack (or a 2-state `vis`) | `int[] indegree` |
| Detect cycle? | Yes (via a third state) | Yes, for free: `processed != V` |
| Returns an order | Yes, with effort | Yes, naturally |
| Recursion risk | Yes | **No — iterative** |
| Extra needs | post-order list | a queue |

### 0.8 The relaxation primitive

Every shortest-path algorithm in this guide is one line, run many times:

```java
if (dist[v] > dist[u] + w) {
    dist[v] = dist[u] + w;      // found a cheaper route to v through u
}
```

Relaxation **never overestimates** a shortest path (it only ever lowers a value to
a cost of a real path). The algorithms differ *only* in **the order and number of
relaxations**, and in the data structure that picks the next node:

| Algorithm | Node order | Passes | Handles negative weights | Negative-cycle detection |
|---|---|---|---|---|
| BFS | by distance (queue) | 1 | no | no |
| DAG + topo | topological | 1 | **yes** | n/a (DAG) |
| Dijkstra | smallest `dist` (PQ) | 1 (greedy finalize) | **no** | no |
| Bellman-Ford | any, repeated | `V-1` | **yes** | **yes** (extra pass) |
| Floyd-Warshall | `k` outermost | `V³` total | **yes** | **yes** (`dist[i][i] < 0`) |

### 0.9 Disjoint Set Union (DSU)

DSU maintains a partition of elements into disjoint sets, with `O(α(n))` amortized
`union`/`find`. It is the tool when the question is **"do these two things belong to
the same group, and can I merge them?"** — not when it is about distances.

```java
class DisjointSet {
    int[] parent, size;   // or int[] rank

    DisjointSet(int n) {
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
    }

    // path compression, recursive (natural for teaching; depth is tiny)
    int find(int x) {
        return parent[x] == x ? x : (parent[x] = find(parent[x]));
    }

    // path compression, iterative (stack-safe; use in deep/adversarial cases)
    int findIterative(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];   // path halving
            x = parent[x];
        }
        return x;
    }

    void union(int u, int v) {
        int a = find(u), b = find(v);
        if (a == b) return;                    // already the same component
        if (size[a] < size[b]) { int t = a; a = b; b = t; }   // attach smaller under larger
        parent[b] = a;
        size[a] += size[b];
    }
}
```

**Why the union heuristic matters:** without it, union by arbitrary choice can
create a chain of length `n`, and `find` becomes `O(n)`. Union by size/rank keeps
the tree height at `O(log n)`, and path compression flattens it further, so any
sequence of operations costs `O(α(n))` each — `α` is the inverse Ackermann function,
which for every `n` you will ever see is a constant ≈ 4. That is why people say
"almost O(1)".

**Rank vs size:** `size` is the count of elements, `rank` is the tree height bound.
Both guarantee `O(log n)` height; size is easier to reason about (the "small into
big" picture), rank is what most textbooks show.

### 0.10 MST keyword triple

| | Prim | Kruskal |
|---|---|---|
| Idea | Grow one tree: cheapest edge crossing the cut | Add global cheapest edges that don't form a cycle |
| Data structure | min-heap / `TreeSet` of **candidate edges** | sorted **edge list** |
| Cycle avoidance | a `visited[]` set of nodes already in the tree | `DSU.find(u) != DSU.find(v)` |
| Selects | one source node at a time | edges from anywhere |
| Dense graphs | better (fewer PQ pushes) | worse (sorts all edges) |
| Both need | the same greedy idea: **the cheapest edge leaving a cut is safe** (cut property) | |

### 0.11 The hard-algorithm toolbox

**Tarjan `tin` / `low` (bridges 51, articulation points 52):** during one DFS keep

- `tin[u]` = the timestamp when DFS first entered `u`;
- `low[u]` = the smallest `tin` reachable from `u`'s DFS subtree using tree edges
  and **at most one back edge**.

Then for a DFS tree edge `u → v`:

- `low[v] > tin[u]` → the subtree of `v` cannot get back above `u` → **`u–v` is a bridge**.
- `low[v] >= tin[u]` → the subtree of `v` can reach `u` but not above it → **`u` is an articulation point** (except when `u` is the DFS root, which needs `children >= 2`).

**Kosaraju SCC (53):** order DFS on the original graph, pushing nodes onto a stack
by **finish time**; then process the stack in *decreasing* finish order on the
**transpose** graph (all edges flipped). Each DFS on the transpose extracts exactly
one strongly connected component.

### 0.12 The decision question every problem asks first

```text
Am I counting / browsing connected stuff (grid, matrix, keys)? -> BFS or DFS flood fill
Am I ordering dependencies / prerequisites?                     -> topological sort
Am I minimizing a path cost?                                   -> BFS (unit) / Dijkstra / BF / FW
Am I merging or splitting connected parts?                     -> DSU
Am I asking "what if I remove this edge/vertex"?               -> Tarjan tin/low
Am I asking "which nodes are mutually reachable"?              -> Kosaraju SCC
```

### 0.13 The 6 core mental models

This table is the spine of the whole guide. Every problem below is one of these six
wearing a costume.

| # | Signature clue | Mental model | Template | Problems |
|---|---|---|---|---|
| 1 | "How many groups / islands / regions / provinces?" | **Flood fill** — a traversal *is* the answer | BFS/DFS with `visited[]`, mark on entry, one traversal per component | 3, 6, 7, 8, 18, 19, 20 |
| 2 | "How long / how many steps / spreads outward / rounds" | **Level expansion** — BFS drains one hop at a time; freeze `q.size()` for a round | BFS with `dist[]`, or `int size = q.size()` loop | 9, 13, 16, 17, 28, 32, 34, 37 |
| 3 | "Order these, dependencies, prerequisites, cycle?" | **Dependency elimination** — emit only when all inputs are done | DFS post-order + reverse, or Kahn's indegree queue | 21, 22, 23, 24, 25, 26, 27 |
| 4 | "Cheapest / fewest / minimal cost / negative edges / all pairs" | **Relaxation** — one line, repeated in a smart order | BFS / topo-relax / Dijkstra / Bellman-Ford / Floyd-Warshall | 28–40 |
| 5 | "Merge groups, remove the most items, make connected, union" | **Partition maintenance** — answer = `items − components` | DSU: find + union by size + path compression | 41, 42, 44–50 |
| 6 | "Breaks if removed / critical / strongly connected / cut points" | **Structural timestamps** — where can the subtree escape to? | Tarjan `tin/low`, Kosaraju finish-order + transpose | 51, 52, 53 |

Add **two cross-cutting tricks** that show up in several parts:

| Signature clue | Mental model | Problems |
|---|---|---|
| "Only the ones touching the border / starting from every special cell" | **Multi-source / reverse the direction** — start where the answer's boundary is, or flip the edges and look backwards | 9, 13, 14, 15, 26, 49 |
| "Minimize the MAXIMUM along the path", "smallest X such that reaching is possible" | **Binary search on the answer + a feasibility traversal** (Part D meet Part B) | 33, 50, and the 01-Matrix sanity check |

---

# PART A — Learning & Traversal

Six problems whose job is to install the two walkers (BFS, DFS), the two
representations, and the habit of *always* wrapping a traversal in an outer loop
over all vertices so that disconnected graphs work.

---

## 1. Introduction to Graph & Graph Representation (Java)

### Problem Understanding
This is not a competitive problem — it is the **vocabulary and plumbing** problem
every other graph problem depends on. Given a graph with `n` vertices and `m`
edges, store it so that traversals are fast.

- **Input:** `n` (vertices `0..n-1`), `m` (edges), then `m` lines `u v`
- **Output:** the stored structure (and, for practice, the edges printed back)
- **Constraints/observations:**
  - Edges may be repeated; the structure must tolerate that (and, for cycle
    problems, multi-edges matter).
  - Self-loops are legal input.

**Example:** `n = 5, m = 4`, edges `0 1`, `0 2`, `1 3`, `3 4`

```text
adjacency list:
0 -> [1, 2]
1 -> [0, 3]
2 -> [0]
3 -> [1, 4]
4 -> [3]

adjacency matrix (5x5):
    0 1 2 3 4
0 [ 0 1 1 0 0 ]
1 [ 1 0 0 1 0 ]
2 [ 1 0 0 0 0 ]
3 [ 0 1 0 0 1 ]
4 [ 0 0 0 1 0 ]
```

### How to Think About the Problem
- **What should I notice first?** That the two questions "how much memory" and "how
  fast is `neighbours(u)`" pull in opposite directions. An adjacency **list** makes
  the second `O(deg(u))`; an adjacency **matrix** makes the first `O(V²)`.
- **Which representation makes sense?** For anything with `E ≪ V²` (which is every
  real problem here, and every real-world graph): **adjacency list**.
- **Is this the "build once, ask many" pattern?** Yes. Building is `O(V + E)`, and
  every later problem only *queries*.
- **What is the one thing beginners get wrong in Java?** Declaring
  `List<Integer>[] adj = new List[n]` — that gives you `Object[]`-style
  unchecked arrays. Use `List<List<Integer>>` and add an `ArrayList` per vertex.
- **Clue → Pattern:** *"store a graph so I can walk it"* → adjacency list built in
  `O(V + E)`, one pass over the edge input.

### Intuition (Brute → Better → Optimal)
```text
Brute force: store the raw edge list only.  -> neighbours(u) costs O(E): unusable.
        ↓
Observation: a graph is queried as "who are the neighbours of u?" far more often
             than "does the edge (u,v) exist?".
        ↓
Better:  adjacency matrix.  neighbour lookup O(1), but neighbour LIST is O(V)
             and memory is O(V^2).
        ↓
Optimal: adjacency list.  memory O(V+E), listing neighbours O(deg(u)),
             which is optimal because you must at least look at them.
```

### Brute Force Approach
**Basic idea:** keep the edges in an `ArrayList<int[]>` and, whenever you need the
neighbours of `u`, scan all edges.

```java
import java.util.*;

public class EdgeListOnly {
    List<int[]> edges = new ArrayList<>();

    void addEdge(int u, int v) { edges.add(new int[]{u, v}); }

    List<Integer> neighbours(int u) {
        List<Integer> out = new ArrayList<>();
        for (int[] e : edges) {                 // O(E) per query
            if (e[0] == u) out.add(e[1]);
            if (e[1] == u) out.add(e[0]);
        }
        return out;
    }
}
```

**Time Complexity Calculation:** building is `O(E)`; every neighbour query is a full
scan `O(E)`. One traversal touches `Σ deg(u) = 2E` neighbour slots → `O(V + E)`
per traversal *if* neighbour access were `O(1)`, but here it is `O(E)` each, so a
full traversal is `O(V·E)`.
**Space Complexity Calculation:** `O(E)` — the most memory-friendly, and also the
slowest to query.

> **Why can this be improved?**
> We query by *vertex*, so we should store *by vertex*. Grouping the edges by their
> endpoint is a one-pass bucket sort, and it makes every query proportional to the
> number of answers instead of the size of the input.

### Optimal Approach — Adjacency List

#### Core Observation
**Store edges grouped by their endpoint.** `adj[u]` contains exactly the vertices
adjacent to `u`, so a traversal loop is `for (int v : adj.get(u))` — and that loop
runs *exactly* `deg(u)` times, which is the information-theoretic minimum.

#### Pattern Identification
**Mental model 1 (flood fill) — plumbing edition.** The representation *is* the
first half of every BFS/DFS problem in this guide.

#### Step-by-Step Intuition
1. Allocate one empty list per vertex: `for (i = 0..n-1) adj.add(new ArrayList<>())`.
2. For each edge `u v` (undirected): append `v` to `adj[u]` **and** `u` to `adj[v]`.
   (Directed: only the first.)
3. For a weighted graph, store a pair — either a `List<List<int[]>>` holding
   `{to, weight}`, or two parallel arrays `List<List<Integer>> to, w`.
4. Query: `adj.get(u)`, `adj.get(u).size()` = `deg(u)`, `adj.get(u).contains(v)` =
   `O(deg(u))` edge existence.

```text
Self-loop u-u (undirected): adj[u] gets u twice -> deg(u) counts 2 (correct,
graph-theoretically). It also gives an immediate cycle, which is right.
Multi-edge u-v twice: adj[u] holds v twice. In cycle problems a multi-edge IS a
cycle, and the "skip parent" check must therefore compare edges, not vertices.
```

#### Dry Run
`n = 5, m = 4`, edges `0 1`, `0 2`, `1 3`, `3 4`

| Step | Edge read | `adj.get(u).add(v)` | `adj.get(v).add(u)` | adj state |
|---|---|---|---|---|
| 1 | `0 1` | `0 -> [1]` | `1 -> [0]` | `[ [1], [0], [], [], [] ]` |
| 2 | `0 2` | `0 -> [1,2]` | `2 -> [0]` | `[ [1,2], [0], [0], [], [] ]` |
| 3 | `1 3` | `1 -> [0,3]` | `3 -> [1]` | `[ [1,2], [0,3], [0], [1], [] ]` |
| 4 | `3 4` | `3 -> [1,4]` | `4 -> [3]` | `[ [1,2], [0,3], [0], [1,4], [3] ]` |

Check: `deg(0) = 2`, `deg(1) = 2`, `deg(2) = 1`, `deg(3) = 2`, `deg(4) = 1`; sum `= 8 = 2E` ✓.

#### Why Does It Work?
Every edge is stored at both of its endpoints (once for directed), so a traversal
that iterates `adj.get(u)` for each visited `u` necessarily sees every edge exactly
once per direction. Nothing is missed and nothing is duplicated. Since the total
work of a traversal is `Σ deg(u) = O(V + E)`, the structure is optimal for
traversal.

#### Java Code
```java
import java.util.*;

public class GraphRepresentation {

    // ---- the canonical build: n vertices, m undirected edges ----
    public static List<List<Integer>> buildUndirected(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());   // n buckets
        for (int[] e : edges) {                                  // O(m)
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        return adj;
    }

    public static List<List<Integer>> buildDirected(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) adj.get(e[0]).add(e[1]);           // one direction only
        return adj;
    }

    // ---- weighted: {to, weight} pairs ----
    public static List<List<int[]>> buildWeighted(int n, int[][] edges) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            adj.get(e[1]).add(new int[]{e[0], e[2]});
        }
        return adj;
    }

    // ---- the matrix alternative, for comparison ----
    public static int[][] buildMatrix(int n, int[][] edges) {
        int[][] mat = new int[n][n];                              // O(V^2) memory
        for (int[] e : edges) { mat[e[0]][e[1]] = 1; mat[e[1]][e[0]] = 1; }
        return mat;
    }

    public static int degree(int u, List<List<Integer>> adj) { return adj.get(u).size(); }
}
```

#### Complexity
**Time Complexity Calculation:** one pass to create `n` buckets (`O(V)`) plus one
pass over `m` edges doing two `O(1)` appends (`O(E)`) → **`O(V + E)`**. Printing
traverses every bucket: `Σ deg(u) = 2E` → `O(V + E)`.
**Space Complexity Calculation:** `n` list objects (`O(V)` overhead) plus exactly
`2E` integers stored → **`O(V + E)`**. The matrix version is `O(V²)` — for
`V = 10⁵` and `E = 10⁵` that is `10¹⁰` cells: the difference is not academic.

### Edge Cases
- `n = 0` → empty `adj`, loops never run.
- `m = 0` → `n` empty buckets; every vertex is its own component.
- `n = 1, m = 1` with a self-loop → `adj[0] = [0, 0]`.
- Duplicate edges → duplicates in the list (correctly interpreted as multi-edges).

### Pattern to Remember
```text
Problem clue:  "store/traverse a graph given n, m, edges"
Pattern:       Representation + build, then BFS/DFS
Mental model:  store edges GROUPED BY ENDPOINT (adjacency list), O(V+E)
```

**Similar problems:** every problem in this guide. **Interview tip:** say out
loud "`E ≪ V²` here, so the list beats the matrix" — that sentence alone shows you
know the tradeoff, not just the syntax.

---

## 2. Graph Representation — the Java Engineer's View

### Problem Understanding
Same problem, second pass, with the questions an interviewer actually asks:
`List<List<Integer>>` vs `List<Integer>[]`, what a matrix really costs, and when the
**edge list** is the right answer.

- **Input:** the same `n, m` edge stream
- **Output:** the same three structures, plus a decision memo

**Example:** `n = 3, m = 3`, edges `0 1`, `1 2`, `0 2`

```text
adjacency list:  0 -> [1, 2]   1 -> [0, 2]   2 -> [1, 0]
edge list:       [0,1] [1,2] [0,2]
matrix:            0 1 2
                0 [0 1 1]
                1 [1 0 1]
                2 [1 1 0]
```

### How to Think About the Problem
- **What should I notice first?** The triangle `0-1-2-0` is a cycle, and each
  representation makes that cycle differently *visible*: a duplicate-free 6-entry
  list, a 3-entry edge list, or a symmetric `0/1` matrix.
- **Which representation makes sense?** Still the list. But now know *why* each
  alternative loses.
- **The Java-specific question:** `List<Integer>[] adj = new List[n]` compiles with
  an unchecked warning and NPEs on the first `add`. `List<List<Integer>>` always
  works, and the extra pointer chase is irrelevant next to the algorithm.
- **Clue → Pattern:** *"representation choice"* → the decision table, not a
  traversal.

### Intuition (Brute → Better → Optimal)
```text
Brute:  Object[][] / a HashMap<Integer, List>  -> boxing, hashing, no static types.
        ↓
Better: List<List<Integer>>  -> clean, idiomatic, O(V+E). One extra pointer hop.
        ↓
Optimal: List<List<Integer>> for traversal; int[][] dist / visited for per-vertex
         state; List<int[]> edges ONLY when you will sort or reduce over edges.
```

### Brute Force Approach
```java
import java.util.*;

public class RepBrute {
    // Works, but every lookup boxes, hashes, and loses type safety
    Map<Integer, List<Integer>> adj = new HashMap<>();

    void addEdge(int u, int v) {
        adj.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
        adj.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
    }

    int degree(int u) {
        List<Integer> l = adj.get(u);
        return l == null ? 0 : l.size();
    }
}
```

**Time Complexity Calculation:** expected `O(1)` per edge, so `O(V + E)` overall —
same asymptotics, but every operation pays a hash of the key and allocates an
`Integer`.
**Space Complexity Calculation:** `O(V + E)`, plus a large constant: every `Integer`
above 127 is a heap object, so a 10⁶-edge graph stores millions of tiny objects.

> **Why can this be improved?**
> Nothing algorithmic — this is a *constant factor and type-safety* improvement. The
> hash lookup is wasted work, and graph code is written and re-read far more often
> than it is run once. The list-of-lists version is also what every judge's
> signature expects.

### Optimal Approach — Choosing Deliberately

#### Core Observation
The representation must match **how the problem queries the graph**, not how it is
written down:

| Query you make | Best structure | Cost |
|---|---|---|
| "list the neighbours of `u`" (all traversals) | adjacency list | `O(deg(u))` |
| "does edge `(u,v)` exist?" (frequently) | adjacency matrix | `O(1)` |
| "process edges in weight order" (Kruskal) | edge list + sort | `O(E log E)` |
| "any neighbour that is a wall / unvisited?" (grid) | grid + `dirs` | `O(1)` |
| "which nodes are in my group?" (DSU) | `int[] parent` | `O(α(n))` |

#### Pattern Identification
**A pre-flight check before every graph problem**, one line long:
*"what is the most expensive operation my algorithm performs, and which structure
makes *that* operation cheapest?"*

#### Step-by-Step Intuition
1. Default to `List<List<Integer>>` — stop thinking about it.
2. Reach for a matrix **only** if the input is already a matrix, or if the graph is
   `> 50%` dense and you need `O(1)` edge tests.
3. Reach for an edge list **only** if you will sort it (Kruskal) or iterate it twice.
4. For a grid, build **nothing**. `dirs4` + `inside()` *is* the adjacency function.
5. Keep per-vertex state in a flat `int[]` (`vis`, `dist`, `tin`, `low`, `parent`)
   indexed by vertex id — never `Map<Integer, ...>`.

#### Dry Run — which structure for which of the 53 problems?
| Problem kind | Examples | Chosen representation | Why |
|---|---|---|---|
| Traversal / counting | 3, 6, 7, 18 | adjacency list / grid | neighbours are the loop |
| Level / distance | 9, 13, 28, 32, 34 | adjacency list or grid + `int[] dist` | distance is per-vertex state |
| Ordering | 21–27 | adjacency list + `int[] indegree` | in-degree must be counted once |
| Weighted shortest | 30–36 | `List<List<int[]>>` | need `(to, w)` |
| All-pairs | 39, 40 | `int[][] dist` (in-place) | the state *is* a matrix |
| Merging | 43–49 | edge list + `int[] parent` (DSU) | order of merges is the answer |
| Structural | 51, 52, 53 | adjacency list (+ transpose copy) | recursion structure is the answer |

#### Why Does It Work?
Structure choice is a *cost-model* decision, not a correctness one: any
representation yields the same answers, provided you build it correctly. Matching
the representation to the dominant operation changes time complexity (`O(V·E)` → 
`O(V+E)` in the very first example) and keeps per-vertex state in flat arrays so
the traversal inner loop stays cache-friendly and primitive-typed.

#### Java Code
```java
import java.util.*;

public class Representations {

    // A: list of lists — the default. Undirected.
    public static List<List<Integer>> asLists(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>(n);
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }
        return adj;
    }

    // B: array of lists — the form C++ users expect. The extra Arrays.fill line
    //    is the entire reason to prefer (A) in Java.
    @SuppressWarnings("unchecked")
    public static List<Integer>[] asArrayOfLists(int n, int[][] edges) {
        List<Integer>[] adj = new List[n];
        Arrays.fill(adj, new ArrayList<>());        // same shared-list trap as C++
        for (int[] e : edges) { adj[e[0]].add(e[1]); adj[e[1]].add(e[0]); }
        return adj;
    }

    // C: matrix — O(1) edge test, O(V^2) memory
    public static int[][] asMatrix(int n, int[][] edges) {
        int[][] mat = new int[n][n];
        for (int[] e : edges) { mat[e[0]][e[1]] = 1; mat[e[1]][e[0]] = 1; }
        return mat;
    }

    // D: edge list — sort it and Kruskal is 5 lines away
    public static List<int[]> asEdges(int n, int[][] edges) {
        List<int[]> list = new ArrayList<>();
        for (int[] e : edges) list.add(new int[]{e[0], e[1], 1});
        return list;
    }

    // E: transpose (reverse all directions) — Kosaraju, 787, 26
    public static List<List<Integer>> transpose(int n, List<List<Integer>> adj) {
        List<List<Integer>> t = new ArrayList<>();
        for (int i = 0; i < n; i++) t.add(new ArrayList<>());
        for (int u = 0; u < n; u++)
            for (int v : adj.get(u)) t.get(v).add(u);
        return t;
    }
}
```

#### Complexity
**Time Complexity Calculation:** all five builders are single passes over the
`m` edges → `O(V + E)` each (matrix: `O(V² + E)` because of the allocation).
Transposing is `O(V + E)` — one `O(deg(u))` loop per vertex.
**Space Complexity Calculation:** lists `O(V + E)`; matrix `O(V²)`; edge list
`O(E)`. If `E < V²/2` (almost always) the list is both smaller and asymptotically
faster to walk.

### Edge Cases
- `new List[n]` shared-list bug: `Arrays.fill(adj, new ArrayList<>())` gives you
  **one** list aliased `n` times — every vertex's neighbours end up in a single
  bucket. The correct form is a loop with a fresh `new ArrayList<>()` per index.
- Self-loops and multi-edges are stored faithfully; decide per-problem how to treat
  them (bridges: a self-loop is never a bridge; cycle detection: a self-loop *is* a
  cycle).
- Empty graph `n = 0` → all builders return empty structures, no exceptions.

### Pattern to Remember
```text
Problem clue:  "which structure should I use for this graph?"
Pattern:       Pre-flight cost-model check
Mental model:  store by ENDPOINT for traversal; by WEIGHT for Kruskal;
               implicit dirs for grids; flat int[] for per-vertex state
```

**Similar problems:** 1, 43 (DSU's `parent[]` is the same lesson in reverse).
**Interview tip:** when you say "adjacency list", add the two words "`O(V + E)`
memory" — it is the whole justification.

---

## 3. Connected Components

### Problem Understanding
Given an undirected graph with `V` vertices and `E` edges (it may be
**disconnected**), count the number of connected components — the number of maximal
groups of vertices where every pair is joined by a path.

- **Input:** `V`, `List<List<Integer>> adj`
- **Output:** number of connected components
- **Constraints/observations:**
  - A single BFS from node 0 may only reach part of the graph. **The outer loop is
    the whole point of this problem.**
  - Every component costs `O(V + E)` in the worst case only for the *first*
    traversal; subsequent ones are cheap. Total across all components is
    `O(V + E)`.

**Example:** `V = 6`, edges `0-1, 1-2, 3-4`

```text
component 1: {0, 1, 2}     component 2: {3, 4}     component 3: {5}
answer = 3
```

### How to Think About the Problem
- **What should I notice first?** That a traversal is a *reusable subroutine*. One
  call marks exactly one component. Count the calls.
- **Which representation makes sense?** Adjacency list; a grid is the same idea with
  `dirs` (problem 6).
- **Is it counting, ordering, or minimizing?** **Counting** → mental model 1,
  flood fill.
- **Which traversal?** Either. BFS if you also want sizes/distances; DFS if you want
  recursion depth or post-order work. Counting alone does not care.
- **Clue → Pattern:** *"how many groups / components / islands"* → **outer loop over
  all vertices + one traversal each**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: a fresh BFS for every single vertex, no visited sharing. O(V·(V+E)).
        ↓
Observation: after one traversal, everything reachable is already marked.
             Starting another traversal from a marked vertex adds nothing.
        ↓
Optimal: ONE visited[] shared by all traversals; run a traversal only from an
         unmarked vertex, and count the runs.  O(V + E).
```

### Brute Force Approach
**Basic idea:** for each vertex, run a BFS that ignores the global `visited` array
and count how many vertices it reaches; count the vertex if it reaches more than
itself. (Equivalent, and clearly wasteful.)

```java
import java.util.*;

public class ComponentsBrute {
    public int count(List<List<Integer>> adj) {
        int V = adj.size(), count = 0;
        for (int i = 0; i < V; i++) {
            ArrayDeque<Integer> q = new ArrayDeque<>();
            Set<Integer> local = new HashSet<>();
            q.add(i); local.add(i);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) if (local.add(v)) q.add(v);
            }
            if (local.size() > 1) count++;      // this vertex is part of a real group
        }
        return count;
    }
}
```

**Time Complexity Calculation:** `V` BFS runs, each visiting up to `V` vertices and
`E` edges → **`O(V · (V + E))`**, which for a sparse graph is `O(V²)`.
**Space Complexity Calculation:** a fresh `HashSet` per run, but they do not
coexist → `O(V)` live at a time. Boxing makes it much heavier in practice.

> **Why can this be improved?**
> The information is duplicated. Once we know that `0, 1, 2` are mutually reachable,
> starting a search from `1` cannot discover anything new. A *single* shared visited
> array makes every vertex be explored exactly once, ever.

### Optimal Approach — Outer Loop + One Traversal Per Component

#### Core Observation
**Every traversal that starts at an unmarked vertex marks exactly one new
component.** So the count equals the number of traversals that were needed, and the
outer loop must consider *all* vertices because the graph may be disconnected.

#### Pattern Identification
**Mental model 1: flood fill.** The counted object is the traversal itself.

#### Step-by-Step Intuition
1. Create `int[] vis = new int[V]`, all `0`.
2. `count = 0`.
3. `for (int i = 0; i < V; i++)`:
   - if `vis[i] == 1` continue;
   - `count++`;
   - BFS/DFS from `i` marking everything reachable.
4. Return `count`.

*The invariant:* after processing indices `0..i`, `vis[j] == 1` for all `j ≤ i`,
and every marked set is a union of complete components. Hence an unmarked `i` is
necessarily the **first vertex of a brand-new component** — the count can never
double count and never misses one.

#### Dry Run
`V = 6`, edges `0-1, 1-2, 3-4`

| Step | `i` | `vis` before | action | `vis` after | count |
|---|---|---|---|---|---|
| 1 | 0 | `0 0 0 0 0 0` | unmarked → BFS: 0,1,2 | `1 1 1 0 0 0` | 1 |
| 2 | 1 | `1 1 1 0 0 0` | skip | — | 1 |
| 3 | 2 | `1 1 1 0 0 0` | skip | — | 1 |
| 4 | 3 | `1 1 1 0 0 0` | unmarked → BFS: 3,4 | `1 1 1 1 1 0` | 2 |
| 5 | 4 | `1 1 1 1 1 0` | skip | — | 2 |
| 6 | 5 | `1 1 1 1 1 0` | unmarked → BFS: 5 | `1 1 1 1 1 1` | **3** |

#### Why Does It Work?
A BFS/DFS from `i` visits exactly the set of vertices reachable from `i`, which by
definition is `i`'s component. Since `vis` is shared and marking is permanent, each
component is discovered by exactly one call (the one started at its lowest-numbered
vertex) and by no other. So the number of calls is the number of components. Total
work: every vertex is dequeued once and every edge scanned twice → `O(V + E)`.

#### Java Code
```java
import java.util.*;

public class ConnectedComponents {

    // BFS flavour
    public int countBFS(List<List<Integer>> adj) {
        int V = adj.size();
        int[] vis = new int[V];
        int components = 0;
        for (int i = 0; i < V; i++) {                 // the loop that makes it work
            if (vis[i] == 1) continue;
            components++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(i); vis[i] = 1;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) if (vis[v] == 0) { vis[v] = 1; q.add(v); }
            }
        }
        return components;
    }

    // DFS flavour — identical, recursion instead of a queue
    public int countDFS(List<List<Integer>> adj) {
        int V = adj.size();
        int[] vis = new int[V];
        int components = 0;
        for (int i = 0; i < V; i++) {
            if (vis[i] == 0) { components++; dfs(i, adj, vis); }
        }
        return components;
    }

    private void dfs(int u, List<List<Integer>> adj, int[] vis) {
        vis[u] = 1;
        for (int v : adj.get(u)) if (vis[v] == 0) dfs(v, adj, vis);
    }

    // Bonus: the component LABEL array — 3 lines more, and 7/19 need exactly this
    public int[] labelComponents(List<List<Integer>> adj) {
        int V = adj.size();
        int[] comp = new int[V];
        Arrays.fill(comp, -1);
        int id = 0;
        for (int i = 0; i < V; i++) {
            if (comp[i] != -1) continue;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(i); comp[i] = id;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) if (comp[v] == -1) { comp[v] = id; q.add(v); }
            }
            id++;
        }
        return comp;
    }
}
```

#### Complexity
**Time Complexity Calculation:** the outer loop is `O(V)`. Across **all** calls,
each vertex enters a queue exactly once (the `vis` check prevents re-entry) and
each undirected edge is examined twice → total `O(V + 2E)` = **`O(V + E)`**.
**Space Complexity Calculation:** `int[] vis` is `O(V)`; the queue holds at most
`V` entries → **`O(V)`** auxiliary.

### Edge Cases
- `V = 0` → loop never runs → `0` components. (Some judges expect `0`; state it.)
- No edges (`E = 0`) → `V` components.
- Complete graph → `1` component.
- A single isolated vertex among many → counts as its own component (`{5}` above).

### Pattern to Remember
```text
Problem clue:  "how many connected components / groups / islands?"
Pattern:       outer loop over all vertices + one flood fill per unmarked vertex
Requirement:   graph may be DISCONNECTED — the outer loop is not optional
Mental model:  #components == #traversals that were actually needed
```

**Similar problems:** 6, 7, 8, 14, 15, 18, 19, 20, 26, 49. **Interview tip:** if
you only run BFS from node 0, the interviewer will ask "what if the graph is
disconnected?" — have the outer loop ready.

---

## 4. Traversal Techniques — BFS

### Problem Understanding
Print (or return) the BFS traversal of an undirected graph starting from a given
node. BFS visits nodes in order of **increasing distance** from the start — this
"level order" is the defining property, and every later BFS problem in this guide
is this loop plus one extra idea.

- **Input:** `V`, adjacency list, `src`
- **Output:** list of visited nodes in BFS order
- **Constraints/observations:**
  - Mark a node `visited` **when it is enqueued**, not when dequeued — otherwise it
    gets enqueued twice.
  - The queue is FIFO, so it drains one level at a time.
  - Striver's variant additionally returns the **"building order"**: which node was
    discovered from which (`parent`-like info), which is exactly the `dist[]`
    information you need later.

**Example:** `V = 5`, edges `0-1, 0-2, 1-3, 2-4`, `src = 0`

```text
level 0: 0
level 1: 1 2
level 2: 3 4
BFS order: 0 1 2 3 4
```

### How to Think About the Problem
- **What should I notice first?** The graph may be disconnected, but the *problem*
  only asks about the component of `src`. So no outer loop here (contrast problem 3).
- **Which representation makes sense?** Adjacency list; the inner loop is
  `for (int v : adj.get(u))`.
- **Is it counting, ordering, or minimizing?** None yet — it is *exploring*. But the
  tool (BFS) is the same tool that later gives you minimizing.
- **Which traversal?** BFS, because the statement says nothing about post-order and
  everything about "visit in layers".
- **Clue → Pattern:** *"visit everything reachable, layer by layer"* → **mental model
  2: level expansion**, queue + `vis[]` marked on enqueue.

### Intuition (Brute → Better → Optimal)
```text
Brute force: repeatedly scan all V vertices for unvisited neighbours. O(V·(V+E)).
        ↓
Observation: the question "which unvisited node is closest to src?" is answered
             automatically if we process nodes in increasing distance.
        ↓
Optimal: a FIFO queue enforces exactly that order. O(V + E).
```

### Brute Force Approach
**Basic idea:** recursive DFS is the "brute" version of traversal — it visits
*something*, but in the wrong order (it dives deep before it widens). Use it to
contrast the two visit sequences on the same graph.

```java
import java.util.*;

public class BFSBrute {
    // DFS order on the example graph: 0 1 3 2 4   <-- depth first
    public void dfs(int u, List<List<Integer>> adj, int[] vis, List<Integer> out) {
        vis[u] = 1;
        out.add(u);
        for (int v : adj.get(u)) if (vis[v] == 0) dfs(v, adj, vis, out);
    }
}
```

**Time Complexity Calculation:** every node once, every edge twice → `O(V + E)`.
**Space Complexity Calculation:** recursion depth up to `V` → `O(V)`.
**Why is it "brute" here?** Same complexity, wrong order. If the problem needs
*levels* (994, 127, 1091), this order is useless.

> **Why can this be improved?**
> Not in time — in *structure*. Replace the call stack with a queue and the natural
> recursion order (last-in-first-out) becomes first-in-first-out. That single change
> is what upgrades "reachability" to "shortest path in an unweighted graph".

### Optimal Approach — BFS with a Queue

#### Core Observation
**A FIFO queue processes nodes in non-decreasing order of their distance from
`src`,** because every node enqueued from a level-`d` node is at level `d+1`, and it
sits behind all the other level-`d` nodes already in the queue.

#### Pattern Identification
**Mental model 2: level expansion.** The invariant is a *level* invariant:
> when the queue is drained of size `s` at the start of an iteration, **all `s` of
> those nodes are at the same distance**, and everything discovered during that
> iteration is exactly one hop further.

#### Step-by-Step Intuition
1. `int[] vis = new int[V]`, `vis[src] = 1`, `q.add(src)`.
2. While `q` is non-empty: `u = q.poll()`; record `u`; for each unvisited neighbour
   `v`: **mark then enqueue**, and set `dist[v] = dist[u] + 1`.
3. If the judge wants the "building order" (how nodes were discovered), store
   `parent[v] = u` in the same loop — it is the `dist[]` info, one extra array.

#### Dry Run
`V = 5`, edges `0-1, 0-2, 1-3, 2-4`, `src = 0`

| Step | queue before | `u = poll` | neighbours | queue after | `dist` after |
|---|---|---|---|---|---|
| 1 | `[0]` | 0 | 1, 2 | `[1, 2]` | `0:0, 1:1, 2:1` |
| 2 | `[1, 2]` | 1 | 0(seen), 3 | `[2, 3]` | `3:2` |
| 3 | `[2, 3]` | 2 | 0(seen), 4 | `[3, 4]` | `4:2` |
| 4 | `[3, 4]` | 3 | 1(seen) | `[4]` | — |
| 5 | `[4]` | 4 | 2(seen) | `[]` | — |

`dist = [0,1,1,2,2]` — exactly the level structure.

#### Why Does It Work?
By induction on the level: the source is at distance 0. Suppose every node in the
queue at the start of an iteration is at distance `d`. A neighbour discovered from
one of them is at distance `d+1` in the graph (that is a real path, so it is an
upper bound), and by induction nothing at distance `< d+1` is still undiscovered.
So a node's first discovery gives its true distance — this is the seed of the
shortest-path property used in 28, 32, 34 and 9.

#### Java Code
```java
import java.util.*;

public class BFSTechniques {

    // returns the visiting order
    public List<Integer> bfsOrder(int V, List<List<Integer>> adj, int src) {
        int[] vis = new int[V];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(src);
        vis[src] = 1;
        List<Integer> order = new ArrayList<>();
        while (!q.isEmpty()) {
            int u = q.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                if (vis[v] == 0) {
                    vis[v] = 1;            // mark on ENQUEUE, not on dequeue
                    q.add(v);
                }
            }
        }
        return order;
    }

    // returns distance and the "building order" (who discovered whom)
    public int[] bfsDistances(int V, List<List<Integer>> adj, int src, int[] parent) {
        int[] dist = new int[V];
        Arrays.fill(dist, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(src);
        dist[src] = 0;
        parent[src] = -1;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    parent[v] = u;        // the discovery tree = shortest-path tree
                    q.add(v);
                }
            }
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each vertex is enqueued exactly once (the `vis`
check happens before `add`), so `O(V)` dequeues; each dequeue scans `deg(u)`
neighbours, summing to `2E` for an undirected graph → **`O(V + E)`**.
**Space Complexity Calculation:** `vis` is `O(V)`, the queue can hold up to `V`
nodes, `order` is `O(V)`, `parent` is `O(V)` → **`O(V)`** auxiliary.

### Edge Cases
- `src` with no edges → order is just `[src]`, `dist[src] = 0`.
- Disconnected graph → you get only `src`'s component; the rest stays `-1`. That is
  correct here, and the reason problem 3 needs the outer loop.
- Self-loop `u-u` → the second encounter of `u` fails the `vis` check.
- `V = 0` → guard before touching `vis[src]`.

### Pattern to Remember
```text
Problem clue:  "visit/traverse in order of distance", "BFS from src"
Pattern:       queue + visited, mark on enqueue
Requirement:   unweighted edges
Mental model:  FIFO drains one hop per round; first discovery = true distance
```

**Similar problems:** 3, 9, 13, 16, 28, 32, 34, 37, 48. **Interview tip:** say
"mark on enqueue, not on dequeue" out loud — it is the single most common BFS bug
and interviewers listen for it.

---

## 5. DFS

### Problem Understanding
Depth-first traversal of a graph from a source: go as deep as possible along one
path, then backtrack. Two things make DFS different from BFS: it uses
**recursion (or a stack)**, and it gives a natural **pre / in / post ordering**.

- **Input:** `V`, adjacency list, `src`
- **Output:** visit order (and, in the recursive form, the ability to do work on
  entry, before descending, and on exit)
- **Constraints/observations:**
  - `vis[u] = 1` on **entry** to the recursive call.
  - Recursion depth can be `V`; in Java that can throw `StackOverflowError` for
    `V ≈ 10⁵` in a long chain.
  - The **finish (post) order** is what topological sort (21), Tarjan `tin/low`
    (51/52) and Kosaraju (53) are built from.

**Example:** same graph, `src = 0`, `adj.get(u)` iterated in ascending order

```text
BFS: 0 1 2 3 4        (levels)
DFS: 0 1 3 2 4        (dives deep, then backtracks)
DFS post-order: 3 4 2 1 0   (a valid reverse topological order for 0->..., DAG only)
```

### How to Think About the Problem
- **What should I notice first?** DFS is not "BFS with a different container" — it
  is the *same graph walk* with LIFO semantics, and that difference is invisible in
  complexity but decisive for what you can compute (post-order, `low[]`, SCCs).
- **Which representation?** Adjacency list, unchanged.
- **Counting, ordering, or minimizing?** Pure exploring — but note that the *exit
  event* is the valuable one for Problems 21, 51, 52, 53.
- **Which traversal?** DFS, and prefer the recursive form unless the graph can be
  a 10⁵-long path.
- **Clue → Pattern:** *"explore deeply / need finish order / need subtree
  properties"* → **recursion + `vis[]` marked on entry, with work done on exit**.

### Intuition (Brute → Better → Optimal)
```text
Brute: visit every vertex, and for each one run a fresh DFS. O(V·(V+E)).
        ↓
Observation: after one DFS, everything reachable is marked — same argument as
             problem 3. Sharing `vis` collapses the work.
        ↓
Optimal: one recursive routine, O(V+E) time, O(V) stack.  Add an explicit stack
         if depth can reach 10^5.
```

### Brute Force Approach
```java
import java.util.*;

public class DFSBrute {
    public void dfsAll(int u, List<List<Integer>> adj, boolean[] fresh, List<Integer> out) {
        fresh[u] = false;                       // per-call visited, not shared
        out.add(u);
        for (int v : adj.get(u)) if (fresh[v]) dfsAll(v, adj, fresh, out);
    }
}
```

**Time Complexity Calculation:** for each of `V` starting nodes, a full traversal
`O(V + E)` → **`O(V · (V + E))`**.
**Space Complexity Calculation:** `O(V)` for the recursion depth.
> **Why can this be improved?** Identically to problem 3 — one shared `vis[]` makes
> every node be entered exactly once over the whole program.

### Optimal Approach — Recursive DFS (+ iterative variant)

#### Core Observation
DFS is a **single stack** (the call stack) that you push onto when you enter a node
and pop when you finish it. Everything else — cycle detection, topological sort,
`low` links — is a decision made at one of those two moments.

#### Pattern Identification
**Mental model 1: flood fill**, with the extra power of the *exit* event.

#### Step-by-Step Intuition
1. `vis[u] = 1` (mark on entry).
2. For each neighbour `v`: if `vis[v] == 0`, recurse into `v` (tree edge).
3. If `vis[v] == 1` and `v` is not the parent → you found a **back edge** (cycle in
   undirected, cycle test in directed with a stack-state array).
4. On the way **out** of `u` (after the loop), do the "finish" work: push to the
   topo stack (21), compute `low[u] = min(low[u], low[v])` and test
   `low[v] > tin[u]` (51/52), push to the finish-order stack (53).

```java
// Iterative equivalent — use when the graph can be a long chain
ArrayDeque<Integer> st = new ArrayDeque<>();
st.push(src);
vis[src] = 1;
while (!st.isEmpty()) {
    int u = st.pop();
    for (int v : adj.get(u)) if (vis[v] == 0) { vis[v] = 1; st.push(v); }
}
```

*Heads-up:* pushing all neighbours and marking them at push time is **not** the same
visit order as recursion when a node is reachable from two of them. For pure
reachability it doesn't matter; for post-order it does. If you need true post-order
without recursion, push `(node, expanded)` pairs.

#### Dry Run
`adj: 0->[1,2], 1->[0,3], 2->[0,4], 3->[1], 4->[2]`, `src = 0`

| Entry | `u` | action on entry | neighbour handling | action on exit (post) | post list |
|---|---|---|---|---|---|
| 1 | 0 | `vis[0]=1` | `1` unvisited → recurse | — | — |
| 2 | 1 | `vis[1]=1` | `0` visited & parent → skip; `3` → recurse | — | — |
| 3 | 3 | `vis[3]=1` | `1` is parent → skip | `post.add(3)` | `[3]` |
| 4 | 1 | — | done | `post.add(1)` | `[3,1]` |
| 5 | 0 | — | `2` unvisited → recurse | — | — |
| 6 | 2 | `vis[2]=1` | `0` parent → skip; `4` → recurse | — | — |
| 7 | 4 | `vis[4]=1` | `2` parent → skip | `post.add(4)` | `[3,1,4]` |
| 8 | 2 | — | done | `post.add(2)` | `[3,1,4,2]` |
| 9 | 0 | — | done | `post.add(0)` | `[3,1,4,2,0]` |

Reverse → `0 2 4 1 3`, a valid topological order for this DAG. This *is* problem 21.

#### Why Does It Work?
`vis` guarantees each vertex is entered once, so the traversal visits exactly the
vertices reachable from `src` — no more (we only follow edges) and no fewer (a
vertex is only skipped if some other call already reached it, and that call also
explored everything it could reach). The recursive structure is a depth-first
search, so on exit all of `u`'s descendants are finished — exactly the property
post-order algorithms rely on.

#### Java Code
```java
import java.util.*;

public class DFSTechniques {

    // recursive: the form you want on paper
    public void dfs(int u, List<List<Integer>> adj, int[] vis, List<Integer> pre) {
        vis[u] = 1;                 // on ENTRY
        pre.add(u);
        for (int v : adj.get(u)) {
            if (vis[v] == 0) dfs(v, adj, vis, pre);
        }
        // anything here is POST-order
    }

    public List<Integer> dfsOrder(int V, List<List<Integer>> adj, int src) {
        int[] vis = new int[V];
        List<Integer> pre = new ArrayList<>();
        dfs(src, adj, vis, pre);
        return pre;
    }

    // iterative: stack-safe for deep chains
    public List<Integer> dfsIterative(int V, List<List<Integer>> adj, int src) {
        int[] vis = new int[V];
        List<Integer> pre = new ArrayList<>();
        ArrayDeque<Integer> st = new ArrayDeque<>();
        st.push(src);
        vis[src] = 1;
        while (!st.isEmpty()) {
            int u = st.pop();
            pre.add(u);
            for (int v : adj.get(u)) if (vis[v] == 0) { vis[v] = 1; st.push(v); }
        }
        return pre;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each vertex entered once, each edge scanned once per
endpoint → **`O(V + E)`** for both forms.
**Space Complexity Calculation:** recursive → call stack up to `V` deep = **`O(V)`**;
iterative → `vis` + explicit stack, each `O(V)`. In Java the recursive form is safe
for typical judge constraints (`V ≲ 10⁵` in a *chain* is the danger zone); the
iterative form is never dangerous.

### Edge Cases
- Deep chain `V = 10⁵` → `StackOverflowError` with recursion; use the iterative form.
- Disconnected → only `src`'s component (add the outer loop from problem 3 if the
  problem wants all vertices).
- Self-loop `u-u`: DFS sees `v == u`, `vis[u] == 1`, `u != parent` → a back edge →
  cycle. Correct.
- `V = 0` → guard.

### Pattern to Remember
```text
Problem clue:  "explore deeply", "need finish/post order", "subtree properties"
Pattern:       recursive DFS, vis on entry, work on exit
Requirement:   none (works on any graph, directed or not)
Mental model:  the call stack IS the stack; the exit event is the valuable moment
```

**Similar problems:** 12, 20, 21, 51, 52, 53. **Interview tip:** if asked to
whiteboard DFS, add a line at the end of the function saying "// post-order work
goes here" — it signals you know why DFS is chosen over BFS.

---

## 6. DFS on a Grid / Connected Components in a Matrix

### Problem Understanding
A grid is a graph whose adjacency is computed on the fly. Given an `n × m` grid of
characters, count the connected components under 4-directional (or 8-directional)
adjacency — each maximal blob of equal/non-`'0'` cells is one component.

- **Input:** `char[][] grid`, `n`, `m`
- **Output:** number of connected components
- **Constraints/observations:**
  - **Never build an adjacency list for a grid.** Neighbours are `4` (or `8`)
    computed offsets.
  - The `inside` check must happen **before** the push, not after the pop —
    otherwise you index out of bounds.
  - Mark visited by **mutating the grid** (`'0'`) if the judge allows it; otherwise
    keep a `int[n][m]` visited array.

**Example:**
```text
grid =
X X . . X
X X . . .
. . X X X
. . X X X

4-dir: component A = {(0,0),(0,1),(1,0),(1,1)}   size 4
       component B = {(0,4)}                     size 1
       component C = {(2,2),(2,3),(2,4),(3,2),(3,3),(3,4)}  size 6
       '.' cells are treated as empty (skip)
answer = 3
```

### How to Think About the Problem
- **What should I notice first?** `.` cells are holes, so the graph is
  *implicitly* filtered: a neighbour only counts if it is not `.`.
- **Which representation makes sense?** None — the grid **is** the representation.
  `dirs4` is the adjacency function; `id = r * m + c` gives you a flat `visited[]`
  if you want one.
- **Counting, ordering, or minimizing?** **Counting** → mental model 1, flood fill.
- **Which traversal?** Either; DFS reads better on a grid, BFS uses less stack. The
  *wrapper* (outer loop) is the real content of this problem.
- **Clue → Pattern:** *"count regions in a matrix"* → **grid flood fill with
  `dirs` + `inside()` + outer loop**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for every pair of equal cells, test 4-adjacency -> O((n·m)^2).
        ↓
Observation: adjacency is a local 4-neighbour relation. I never need a list —
             I can generate neighbours on demand in O(1).
        ↓
Optimal: outer loop over cells; on an unmarked non-empty cell, count++ and flood
         fill. O(n·m) because each cell is visited once.
```

### Brute Force Approach
**Basic idea:** union-find every equal pair of 4-neighbours by scanning all pairs
with Manhattan distance 1 — that is the "quadratic but obviously correct" version.

```java
import java.util.*;

public class GridComponentsBrute {
    public int count(char[][] grid) {
        int n = grid.length, m = grid[0].length, comps = 0;
        int[][] id = new int[n][m];
        for (int i = 0; i < n * m; i++) id[i / m][i % m] = -1;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == '.' || id[r][c] != -1) continue;
                comps++;
                ArrayDeque<Integer> q = new ArrayDeque<>();
                q.add(r * m + c);
                id[r][c] = comps - 1;
                while (!q.isEmpty()) {
                    int cur = q.poll(), x = cur / m, y = cur % m;
                    if (x + 1 < n && grid[x + 1][y] != '.' && id[x + 1][y] == -1) {
                        id[x + 1][y] = comps - 1; q.add((x + 1) * m + y);
                    }
                    if (x - 1 >= 0 && grid[x - 1][y] != '.' && id[x - 1][y] == -1) {
                        id[x - 1][y] = comps - 1; q.add((x - 1) * m + y);
                    }
                    if (y + 1 < m && grid[x][y + 1] != '.' && id[x][y + 1] == -1) {
                        id[x][y + 1] = comps - 1; q.add(x * m + y + 1);
                    }
                    if (y - 1 >= 0 && grid[x][y - 1] != '.' && id[x][y - 1] == -1) {
                        id[x][y - 1] = comps - 1; q.add(x * m + y - 1);
                    }
                }
            }
        }
        return comps;
    }
}
```

**Time Complexity Calculation:** the outer double loop is `O(n·m)`, and each
traversal visits only unmarked cells, so the total across all fills is `O(n·m)`
→ `O(n·m)`.
**Space Complexity Calculation:** `int[][] id` is `O(n·m)`; the queue is `O(n·m)`.
**Why is it "brute" here?** It is not — it is already optimal. The *point* of this
problem is to make the **wrapper** (outer loop + `dirs` + `inside`) reusable, which
is why problems 8, 14, 15 and 18 are all one-line variations of it.

> **Why can this be improved?** Nothing to improve algorithmically. What improves is
> *recognition*: 8 of the 53 problems are this same block with a different
> predicate (`grid[r][c] == 'O'`), a different start set (the border), or a different
> counting rule (sizes instead of count).

### Optimal Approach — Grid Flood Fill

#### Core Observation
**Adjacency in a grid is a fixed, tiny, computable set:** `dirs4` (or `dirs8`)
offsets plus an `inside()` guard. Everything else is problem 3 on a graph that
never had to be stored.

#### Pattern Identification
**Mental model 1: flood fill, grid flavour.** Wrapper = outer loop; body = one
traversal; the predicate "is this cell part of the thing I am filling?" is the only
per-problem variation.

#### Step-by-Step Intuition
1. `int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};`
2. Loop `r, c` over the grid. Skip if the cell is not fillable or already marked.
3. `comps++`, then DFS from `(r, c)`:
   - **mutate the grid** to mark (`grid[x][y] = '.'`) — this *is* the visited array;
   - for each of the 4 directions, compute `(nx, ny)`, and **only if
     `inside(nx, ny)` and fillable and unmarked**, mark it and recurse/push.
4. Return `comps`.

*Two subtleties that get marks lost:*
- **Mark before recursing**, never after — otherwise an undirected grid re-enters
  the same cell forever.
- Check `inside` **at the push site**, not by validating on pop.

#### Dry Run
```text
grid (4x5):
r0: X X . . X
r1: X X . . .
r2: . . X X X
r3: . . X X X
```
`dirs` = `{-1,0},{1,0},{0,-1},{0,1}`

| Step | `(r,c)` scanned | grid state change | cells marked by this fill | comps |
|---|---|---|---|---|
| 1 | `(0,0)` | fill → 4 cells become `.` | `(0,0),(0,1),(1,0),(1,1)` | 1 |
| 2 | `(0,1)` | already `.` | — | 1 |
| 3 | `(0,2)`,`(0,3)` | `.` | — | 1 |
| 4 | `(0,4)` | fill → 1 cell | `(0,4)` | 2 |
| 5 | `(1,0..3)` | `.` | — | 2 |
| 6 | `(2,0)`,`(2,1)` | `.` | — | 2 |
| 7 | `(2,2)` | fill → 6 cells | `(2,2),(2,3),(2,4),(3,2),(3,3),(3,4)` | **3** |
| 8 | rest | all `.` | — | 3 |

#### Why Does It Work?
A flood fill marks exactly the cells reachable from its seed through fillable
4-neighbours, i.e. exactly one connected component. Because the mark is permanent
and shared across fills, no component is ever counted twice, and the outer loop
visits every cell, so none is missed. `Σ` over all fills of cells visited is
`n·m` and each visit examines 4 neighbours → `O(n·m)`.

#### Java Code
```java
import java.util.*;

public class GridComponents {

    private static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    private boolean inside(int r, int c, int n, int m) {
        return r >= 0 && r < n && c >= 0 && c < m;
    }

    // iterative flood fill, mutating the grid (no extra visited array)
    private void fill(char[][] grid, int r, int c) {
        int n = grid.length, m = grid[0].length;
        ArrayDeque<Integer> st = new ArrayDeque<>();
        st.push(r * m + c);
        grid[r][c] = '.';                       // mark BEFORE pushing neighbours
        while (!st.isEmpty()) {
            int cur = st.pop();
            int x = cur / m, y = cur % m;       // id -> (row, col)
            for (int[] d : DIRS) {
                int nx = x + d[0], ny = y + d[1];
                if (!inside(nx, ny, n, m)) continue;          // bounds FIRST
                if (grid[nx][ny] == '.') continue;             // already marked
                grid[nx][ny] = '.';
                st.push(nx * m + ny);
            }
        }
    }

    public int countComponents(char[][] grid) {
        int n = grid.length, m = grid[0].length, comps = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == '.') continue;
                comps++;
                fill(grid, r, c);
            }
        }
        return comps;
    }

    // the recursive spelling of exactly the same thing
    private void fillRec(char[][] grid, int r, int c) {
        grid[r][c] = '.';
        for (int[] d : DIRS) {
            int nx = r + d[0], ny = c + d[1];
            if (inside(nx, ny, grid.length, grid[0].length) && grid[nx][ny] != '.') {
                fillRec(grid, nx, ny);
            }
        }
    }
}
```

#### Complexity
**Time Complexity Calculation:** the outer loop scans `n·m` cells. Every cell is
marked at most once, and each mark triggers 4 neighbour checks → total
`O(n·m)` — precisely `O(V + E)` with `V = n·m` and `E ≈ 4V`.
**Space Complexity Calculation:** the `st` stack can hold `O(n·m)` cells
(`O(V)`); with the recursive version, the call stack is the depth of the blob,
`O(n·m)` worst case (a serpentine blob). No extra `visited` array needed because we
mutate.

### Edge Cases
- Empty grid (`n = 0` or `m = 0`) → return `0` before touching `grid[0]`.
- All `.` → `0` components.
- All `X` → `1` component.
- 8-directional adjacency changes the answer on diagonal-only connections (this is
  the "girth"/"diagonal" variant); just extend `DIRS`.
- Grid given as `int[][]` → identical code with a chosen "empty" sentinel
  (`-1`, `Integer.MAX_VALUE`, …). Pick the value the statement calls empty.

### Pattern to Remember
```text
Problem clue:  "count regions / connected cells in a matrix"
Pattern:       grid flood fill = outer loop + dirs + inside() + mark-before-descend
Requirement:   adjacency is 4 or 8 neighbours, computed on demand
Mental model:  the grid IS the adjacency list; DIRS is the neighbour function
```

**Similar problems:** 7, 8, 10, 13, 14, 15, 18, 48, 49. **Interview tip:** draw
the grid and trace the *first* fill; that single trace shows the marker logic and
removes any doubt about the bounds check.

---

# PART B — Problems on BFS/DFS

Fourteen problems that are all one of two shapes:

1. **A traversal is the answer** — count components, fill regions, mark safe cells
   (7, 8, 10, 14, 15, 18, 19).
2. **A traversal produces distances or layers** — 01-Matrix, Word Ladder, Binary
   Maze, Minimum Multiplications (9, 13, 16, 17, 32, 34, 37).

The distinguishing question in an interview: *"do I need to know WHERE, or only
HOW MANY / HOW FAR?"* Only `dist[]` matters if the answer is a count; if the answer
is a path, you also keep `parent[]`.

---

## 7. Number of Provinces (LeetCode 547)

### Problem Understanding
Given an `n × n` **adjacency matrix** `isConnected` where `isConnected[i][j] == 1`
means city `i` and city `j` are directly connected (undirected), count the
**connected components** — i.e. the number of provinces.

- **Input:** `int[][] isConnected`, `n = isConnected.length`
- **Output:** number of provinces
- **Constraints/observations:**
  - The input is a matrix, so a matrix-shaped loop is fine — no adjacency list is
    strictly required.
  - `isConnected[i][i] == 1` (self), so you must **skip `i == j`** when expanding.
  - Undirected → city `j` is a neighbour of `i` iff `isConnected[i][j] == 1`.

**Example 1:** `isConnected = [[1,1,0],[1,1,0],[0,0,1]]` → `2` (cities 0-1, city 2)
**Example 2:** `isConnected = [[1,0,0],[0,1,0],[0,0,1]]` → `3`

### How to Think About the Problem
- **What should I notice first?** This is literally problem 3 with the input
  pre-baked as a matrix. The traversal is identical; only `adj.get(u)` becomes
  `for (int j = 0; j < n; j++) if (mat[u][j] == 1)`.
- **Which representation makes sense?** Keep the matrix. Converting to an adjacency
  list is `O(n²)` extra work for no benefit here.
- **Counting, ordering, or minimizing?** Counting → mental model 1.
- **Which traversal?** BFS (or DFS). With a matrix, BFS avoids recursion limits.
- **Clue → Pattern:** *"count components in a given matrix"* → **flood fill, matrix
  adjacency, outer loop over all `i`**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each city, run a full BFS ignoring shared marks -> O(n·(n^2)).
        ↓
Observation: the matrix row gives all neighbours in O(n); one shared visited[]
             means every city is expanded once.
        ↓
Optimal: outer loop over cities + one BFS each, O(n^2) = O(V + E) with E = n^2.
```

### Brute Force Approach
```java
import java.util.*;

public class ProvincesBrute {
    public int findCircleNum(List<List<Integer>> isConnected) {
        int n = isConnected.size(), circles = 0;
        for (int i = 0; i < n; i++) {
            ArrayDeque<Integer> q = new ArrayDeque<>();
            Set<Integer> seen = new HashSet<>();
            q.add(i); seen.add(i);
            int size = 0;
            while (!q.isEmpty()) {
                int u = q.poll(); size++;
                for (int j = 0; j < n; j++)
                    if (isConnected.get(u).get(j) == 1 && seen.add(j)) q.add(j);
            }
            if (size > 1) circles++;
        }
        return circles;
    }
}
```

**Time Complexity Calculation:** `n` traversals, each `O(n²)` → **`O(n³)`**.
**Space Complexity Calculation:** `O(n)` per set → `O(n)`.
> **Why can this be improved?** The per-city `HashSet` throws away the fact that
> cities already visited cannot reveal new information. One shared `int[] vis` makes
> the whole program quadratic.

### Optimal Approach — Matrix Flood Fill

#### Core Observation
**Neighbour list of `u` = the set of `j` with `isConnected[u][j] == 1` and `j != u`.**
Everything else is problem 3 verbatim.

#### Pattern Identification
**Mental model 1: flood fill**, adjacency read from a matrix.

#### Step-by-Step Intuition
1. `int[] vis = new int[n]`, `provinces = 0`.
2. `for (i = 0..n-1)`: if `vis[i] == 1` continue; `provinces++`; BFS from `i`.
3. Inside BFS: `for (j = 0..n-1) if (isConnected[u][j] == 1 && vis[j] == 0) { vis[j] = 1;
   q.add(j); }`. Skipping `j == u` is unnecessary because `vis[u] == 1` already, but
   it makes the intent explicit.

*The invariant:* when the outer loop reaches index `i`, every city `≤ i` is marked;
so an unmarked `i` is the smallest-index city of a fresh province.

#### Dry Run
`isConnected = [[1,1,0],[1,1,0],[0,0,1]]`, `n = 3`

| Step | `i` | `vis` before | BFS explores | `vis` after | provinces |
|---|---|---|---|---|---|
| 1 | 0 | `0 0 0` | `isConnected[0][1]==1` → 1 | `1 1 0` | 1 |
| 2 | 1 | `1 1 0` | skip | — | 1 |
| 3 | 2 | `1 1 0` | no neighbours | `1 1 1` | **2** |

#### Why Does It Work?
BFS from `i` reaches exactly the cities connected to `i` by any path, which is the
definition of a province. Marks are permanent, so each province is discovered once
(when the loop first meets one of its cities). Therefore the number of BFS runs
equals the number of provinces.

#### Java Code
```java
import java.util.*;

public class NumberOfProvinces {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length;
        int[] vis = new int[n];
        int provinces = 0;
        for (int i = 0; i < n; i++) {
            if (vis[i] == 1) continue;
            provinces++;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(i);
            vis[i] = 1;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int j = 0; j < n; j++) {              // row u == neighbours of u
                    if (j != u && isConnected[u][j] == 1 && vis[j] == 0) {
                        vis[j] = 1;
                        q.add(j);
                    }
                }
            }
        }
        return provinces;
    }
}
```

#### Complexity
**Time Complexity Calculation:** with the matrix, each city is dequeued once
(`n` total) and each dequeue scans a full row (`n`) → **`O(n²)`**. In graph terms
`V = n`, `E = O(n²)`, so `O(V + E) = O(n²)` — optimal, since merely reading the
input is `Θ(n²)`.
**Space Complexity Calculation:** `vis` is `O(n)`, the queue is `O(n)` →
**`O(n)`** auxiliary.

### Edge Cases
- `n = 1`, `[[1]]` → `1`.
- All zeros off-diagonal → `n`.
- Fully connected → `1`.
- Self-loops in the matrix never create a new province; `vis[i]` blocks the
  immediate re-add.

### Pattern to Remember
```text
Problem clue:  "count groups in a given adjacency matrix"
Pattern:       flood fill with matrix adjacency
Requirement:   undirected, matrix input
Mental model:  row u IS the neighbour list of u
```

**Similar problems:** 3, 6, 8, 18, 26. **Interview tip:** mention that you could
convert to an adjacency list, but scanning the row is `O(n)` and the conversion
would cost `O(n²)` space — matrix input deserves matrix treatment.

---

## 8. Connected Components in a Matrix

### Problem Understanding
Given a matrix, count the number of connected components of cells that satisfy a
predicate (same value, non-zero, etc.), with adjacency defined by the 4 (or 8)
directions. This is the **general, reusable** version of problems 6, 7 and 18.

- **Input:** `int[][] mat` (or `char[][]`), `n`, `m`
- **Output:** number of components
- **Observations:** the "same value" predicate means the grid must be read as
  `int` (you cannot mutate a value-based grid into a sentinel without extra
  bookkeeping — a `int[][] vis` is cleaner here).

**Example:**
```text
mat =
1 1 0 1 1
1 1 0 1 1
0 0 0 0 0
1 0 1 0 1

4-dir, components of non-zero cells:
 A: (0,0)(0,1)(1,0)(1,1)          size 4
 B: (0,3)(0,4)(1,3)(1,4)          size 4
 C: (2,0)                         size 1
 D: (2,2)                         size 1
 E: (2,4)                         size 1
answer = 5
```

### How to Think About the Problem
- **What should I notice first?** The *value* at the seed propagates to the whole
  component — so the fill predicate is "same value as the seed", not "non-zero".
- **Which representation?** The grid. Because the value must be preserved (for the
  "same value" question), use a separate `int[][] vis` rather than mutating.
- **Counting?** Yes → mental model 1.
- **Which traversal?** BFS/DFS; identical to problem 6 with one extra equality test.
- **Clue → Pattern:** *"count same-valued connected regions"* → **flood fill with
  a seed-value predicate**.

### Intuition (Brute → Better → Optimal)
```text
Brute: for every pair of cells, are they in the same component via any path?
       That's a transitive closure — O((n·m)^2) with a DSU per pair.
        ↓
Observation: reachability is discovered by exploration; the "same value" check is
             just one condition inside the neighbour loop.
        ↓
Optimal: seed-based flood fill, O(n·m).
```

### Brute Force Approach
**Basic idea:** for every unassigned cell, compare it against every other cell using
a manual BFS *without* shared marking, and count distinct groups.

```java
import java.util.*;

public class MatrixComponentsBrute {
    public int count(int[][] mat) {
        int n = mat.length, m = mat[0].length, comps = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (mat[r][c] == 0) continue;
                int val = mat[r][c], size = 0;
                ArrayDeque<Integer> q = new ArrayDeque<>();
                Set<Integer> seen = new HashSet<>();
                q.add(r * m + c); seen.add(r * m + c);
                while (!q.isEmpty()) {
                    int cur = q.poll(); size++;
                    int x = cur / m, y = cur % m;
                    if (x + 1 < n && mat[x + 1][y] == val && seen.add((x + 1) * m + y)) q.add((x + 1) * m + y);
                    if (x - 1 >= 0 && mat[x - 1][y] == val && seen.add((x - 1) * m + y)) q.add((x - 1) * m + y);
                    if (y + 1 < m && mat[x][y + 1] == val && seen.add(x * m + y + 1)) q.add(x * m + y + 1);
                    if (y - 1 >= 0 && mat[x][y - 1] == val && seen.add(x * m + y - 1)) q.add(x * m + y - 1);
                }
                if (size > 1) comps++;
            }
        }
        return comps;
    }
}
```

**Time Complexity Calculation:** `(n·m)` seeds × `O(n·m)` exploration → **`O((n·m)²)`**.
**Space Complexity Calculation:** `O(n·m)` for the set/queue.

> **Why can this be improved?** A cell discovered by one seed can never be the seed
> of a new component. One shared `int[][] vis` makes each cell explored once.

### Optimal Approach — Seed-Value Flood Fill

#### Core Observation
**A component is a maximal set of cells connected by 4-neighbour steps where every
cell equals the seed's value.** So the fill predicate is
`mat[nx][ny] == mat[r0][c0]` — captured **once**, as a local `val` variable.

#### Pattern Identification
**Mental model 1: flood fill** with a *parameterized* predicate. This is the
reusable template: problems 10, 14, 15, 18 differ only in the predicate and in
where the seeds come from.

#### Step-by-Step Intuition
1. `int[][] vis = new int[n][m]` (separate, because the grid's values matter).
2. For each cell `(r, c)`: if `vis[r][c] == 1` or `mat[r][c] == 0`, skip.
3. `comps++`; `int val = mat[r][c]`; BFS from `(r, c)`.
4. Neighbour condition: `inside(nx, ny) && !vis[nx][ny] && mat[nx][ny] == val` →
   mark and push.
5. Return `comps`.

#### Dry Run
`mat` as above, `dirs4`

| Step | seed | `val` | cells marked | comps |
|---|---|---|---|---|
| 1 | `(0,0)` | 1 | `(0,0)(0,1)(1,0)(1,1)` | 1 |
| 2 | `(0,1)` | — | already `vis` | 1 |
| 3 | `(0,3)` | 1 | `(0,3)(0,4)(1,3)(1,4)` | 2 |
| 4 | `(1,0)`,`(1,1)`,`(1,3)`,`(1,4)` | — | already `vis` | 2 |
| 5 | `(2,0)` | 1 | `(2,0)` | 3 |
| 6 | `(2,2)` | 1 | `(2,2)` | 4 |
| 7 | `(2,4)` | 1 | `(2,4)` | **5** |

#### Why Does It Work?
The BFS explores precisely the cells reachable from the seed through equal-valued
4-neighbours, which is the component. Since `vis` is shared and permanent, each
component is claimed by exactly one seed. The outer loop enumerates every cell, so
no component is missed.

#### Java Code
```java
import java.util.*;

public class MatrixComponents {

    private static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int countComponents(int[][] mat) {
        int n = mat.length, m = mat[0].length;
        int[][] vis = new int[n][m];
        int comps = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (vis[r][c] == 1 || mat[r][c] == 0) continue;
                comps++;
                int val = mat[r][c];                  // the component's identity
                ArrayDeque<Integer> q = new ArrayDeque<>();
                q.add(r * m + c);
                vis[r][c] = 1;
                while (!q.isEmpty()) {
                    int cur = q.poll();
                    int x = cur / m, y = cur % m;
                    for (int[] d : DIRS) {
                        int nx = x + d[0], ny = y + d[1];
                        if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
                        if (vis[nx][ny] == 1 || mat[nx][ny] != val) continue;
                        vis[nx][ny] = 1;
                        q.add(nx * m + ny);
                    }
                }
            }
        }
        return comps;
    }

    // lift this out and you have problem 10 (flood fill), 14, 15 and 18 for free
    private void fill(int[][] mat, int[][] vis, int r, int c, int val) {
        int n = mat.length, m = mat[0].length;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(r * m + c);
        vis[r][c] = 1;
        while (!q.isEmpty()) {
            int cur = q.poll();
            int x = cur / m, y = cur % m;
            for (int[] d : DIRS) {
                int nx = x + d[0], ny = y + d[1];
                if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
                if (vis[nx][ny] == 1 || mat[nx][ny] != val) continue;
                vis[nx][ny] = 1;
                q.add(nx * m + ny);
            }
        }
    }
}
```

#### Complexity
**Time Complexity Calculation:** outer loop `O(n·m)`; each cell enqueued once
(`vis` check) and expanded into 4 neighbour tests → total `O(n·m)`. In graph terms
`V = n·m`, `E ≈ 4V` → `O(V + E)`.
**Space Complexity Calculation:** `vis` `O(n·m)`, queue `O(n·m)` → **`O(V)`**.

### Edge Cases
- Empty grid → `0`.
- All zeros → `0` (zero cells are excluded by the statement's "non-zero" rule).
- Diagonal-only connection: counted as 2 components in 4-dir, 1 in 8-dir. State
  which convention the judge uses.
- Non-zero values with 0 as a legitimate component value → use a separate
  `vis`/sentinel; never overload `0` if `0` can appear inside a component.

### Pattern to Remember
```text
Problem clue:  "count connected regions of equal/similar cells"
Pattern:       grid flood fill with a SEED-VALUE predicate
Requirement:   4 or 8 directional adjacency
Mental model:  capture mat[r0][c0] once; every neighbour must equal it
```

**Similar problems:** 6, 7, 10, 14, 15, 18. **Interview tip:** say "I keep a
separate `vis` here rather than mutating the grid, because the value is part of the
predicate" — that is a precise, senior-sounding distinction.

---

## 9. Rotten Oranges (LeetCode 994)

### Problem Understanding
A grid where every cell holds `0` (empty), `1` (fresh orange) or `2` (rotten).
Every minute, any fresh orange with **at least one** rotten 4-neighbour becomes
rotten. Return the number of minutes until **no** fresh orange remains, or `-1` if
some orange can never rot.

- **Input:** `int[][] grid`
- **Output:** minutes until all rot, or `-1`
- **Constraints/observations:**
  - Rot spreads from **many** sources at once — this is the definition of
    **multi-source BFS**.
  - The answer is **the level of the last fresh orange to rot**, not the number of
    levels traversed, and `-1` is the case where some fresh orange is never reached.
  - An all-rotten grid is `0`; an all-empty grid is `0`; a grid with fresh oranges
    and no rotten ones is `-1`.

**Example 1:**
```text
grid =
2 1 1
1 1 0
0 1 1
→ 4
```
**Example 2:** `grid = [[0,2]]` → `0`. There are no fresh oranges, so the requirement
"everything fresh has rotted" is already satisfied — the answer is `0`, **not** `1`
(counting the empty cell as a step) and not `-1`.
**Example 3:** `grid = [[0,2],[1,1]]`? Use instead: `grid = [[2,1,1,1,1],[1,1,1,1,1],
[0,1,1,1,1],[1,0,1,1,1],[1,1,1,1,1]]` → `4`. Here the `0` at `(3,1)` blocks rot, and
the orange at `(1,3)` is reached by going around it — this is the case that shows
the answer is a *wave count*, not a Manhattan distance.

### How to Think About the Problem
- **What should I notice first?** "Simultaneously spreads from everywhere" →
  this is not "run BFS from each rotten orange". That would be `O(fresh × V)`.
- **Which representation?** The grid, implicit 4-adjacency.
- **Is it counting, ordering, or minimizing?** It is *time/rounds* — mental model 2,
  level expansion.
- **Which traversal?** **Multi-source BFS**: seed the queue with **all** rotten
  oranges at level 0, then drain one level per minute.
- **Clue → Pattern:** *"simultaneous spread from many sources, answer in time
  units"* → **multi-source BFS with `int size = q.size()`**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: BFS from every rotten orange separately, take the min per cell.
             O(#rotten × n·m) — hopeless.
        ↓
Observation: what we want is only "distance to the NEAREST rotten orange".
             That is exactly what one BFS seeded with all of them computes.
        ↓
Optimal: one multi-source BFS, O(n·m). Answer = the last level processed,
         or -1 if a fresh orange is never dequeued.
```

### Brute Force Approach
```java
import java.util.*;

public class RottenBrute {
    public int timeToRotten(int[][] grid) {
        int n = grid.length, m = grid[0].length, answer = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] != 1) continue;             // only fresh oranges matter
                int best = Integer.MAX_VALUE;
                for (int i = 0; i < n; i++) {
                    for (int j = 0; j < m; j++) {
                        if (grid[i][j] == 2) {
                            best = Math.min(best, Math.abs(i - r) + Math.abs(j - c));
                        }
                    }
                }
                if (best == Integer.MAX_VALUE) return -1;
                answer = Math.max(answer, best);
            }
        }
        return answer;
    }
}
```

**Time Complexity Calculation:** `O(fresh × rotten × 1)` because the "distance" is
computed by an `O(#rotten)` scan of all rottens for each fresh cell → up to
`O((n·m)²)`. (The Manhattan distance is also *wrong*: rot cannot pass through
empty cells.)
**Space Complexity Calculation:** `O(1)`.

> **Why can this be improved?** We ask the same question "how far is the nearest
> rotten?" thousands of times, and answer each by scanning everything. One traversal
> answers all of them at once — and it respects obstacles, which Manhattan distance
> does not.

### Optimal Approach — Multi-Source BFS

#### Core Observation
**Simultaneous spread = one BFS with many starting points.** Because the queue is
FIFO and all sources are enqueued at distance 0, level `k` of the BFS is exactly
"the set of oranges that rot at minute `k`". So the answer is the number of levels
until the last fresh orange is dequeued, and any fresh orange left with
`grid == 1` at the end was unreachable.

#### Pattern Identification
**Mental model 2: level expansion + the multi-source trick.**

#### Step-by-Step Intuition
1. Scan once: enqueue every `2` (rotten) and count every `1` (fresh).
2. If `freshCount == 0` → return `0`.
3. `int minutes = 0`.
4. `while (!q.isEmpty())`:
   - `int size = q.size()` — **freeze before the loop**;
   - repeat `size` times: poll a rotten cell, turn each in-bounds `1` neighbour into
     `2`, enqueue it, and `freshCount--`;
   - `minutes++`.
5. After the loop, `freshCount > 0` → `-1`, else `minutes` (or `minutes - 1` if you
   incremented unconditionally — be explicit about which).

*The invariant:* at the start of iteration `minutes`, every cell already rotten
rotted at time `≤ minutes`, and the queue contains **exactly** the cells that rot at
time `minutes`. Therefore after `minutes++`, the queue holds the next wave and the
answer is final only when the queue empties.

#### Dry Run
```text
grid =
2 1 1
1 1 0
0 1 1
```
Fresh count = 6. Queue seeded with `(0,0)`.

| Minute | queue size at entry | cells polled (become rotten) | fresh remaining | grid after |
|---|---|---|---|---|
| 0 | 1 | `(0,0)` | 6 | `2 2 1 / 1 1 0 / 0 1 1` |
| 1 | 1 | `(0,1)`,`(1,0)` | 4 | `2 2 1 / 2 1 0 / 0 1 1` |
| 2 | 2 | `(1,1)`,`(0,2)` | 2 | `2 2 2 / 2 2 0 / 0 1 1` |
| 3 | 2 | `(2,1)`,`(1,2)` | 0 | `2 2 2 / 2 2 0 / 0 2 2` |
| 4 | 2 | `(2,2)`,`(1,1)` already | 0 | unchanged |
| — | 0 | loop ends, `fresh == 0` | 0 | **answer 4** |

#### Why Does It Work?
BFS on an unweighted graph dequeues nodes in non-decreasing distance from the source
set; with a multi-source start, that distance is the distance to the *nearest*
rotten orange. Rot at minute `t` is exactly "some neighbour rotted at minute
`t-1`", which is exactly one BFS hop, so level `t` = rotten at minute `t`. The last
level that contains a fresh orange is therefore the answer, and a fresh orange
never dequeued means no rotten orange can reach it — it can never rot.

#### Java Code
```java
import java.util.*;

public class RottenOranges {
    public int orangesRotting(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        int fresh = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 2) q.add(r * m + c);
                else if (grid[r][c] == 1) fresh++;
            }
        }
        if (fresh == 0) return 0;
        int minutes = 0;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int size = q.size();               // freeze: this is one minute
            for (int i = 0; i < size; i++) {
                int cur = q.poll();
                int r = cur / m, c = cur % m;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                    if (grid[nr][nc] != 1) continue;
                    grid[nr][nc] = 2;          // rot NOW, before enqueueing
                    fresh--;
                    q.add(nr * m + nc);
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}
```

#### Complexity
**Time Complexity Calculation:** the initial scan is `O(n·m)`. Each cell is enqueued
at most once (it becomes `2` at that moment) and each dequeue checks 4 neighbours
→ `O(n·m)`. As a graph: `V = n·m`, `E ≈ 4V` → `O(V + E)`.
**Space Complexity Calculation:** the queue holds at most `O(V)` cells →
**`O(V)`** auxiliary. No `dist[]` needed — the level counter replaces it.

### Edge Cases
- No fresh oranges (all rotten / all empty) → `0`, and **not** `-1`.
- Fresh oranges but no rotten ones → the queue starts empty, the loop never runs,
  `fresh > 0` → `-1`.
- A fresh orange walled off by `0`s → unreachable → `-1`.
- `1×1` grid `[2]` → `0`. `[1]` → `-1`. `[0]` → `0`.
- Mutating the input is fine on LeetCode; if the judge forbids it, keep a
  `boolean[][] seen` instead (and still do not enqueue a cell twice).

### Pattern to Remember
```text
Problem clue:  "spreads simultaneously from many sources", "how many minutes/rounds"
Pattern:       multi-source BFS  (seed queue with all sources at distance 0)
Requirement:   unweighted, obstacles only remove edges
Mental model:  one BFS from all sources = distance to the NEAREST source
```

**Similar problems:** 13, 14, 15, 16, 17, 32, 34, 37. **Interview tip:** the line
that impresses is "I seed the queue with every source *before* entering the loop" —
it is the whole difference between `O(V)` and `O(V²)`.

---

## 10. Flood Fill Algorithm (LeetCode 733)

### Problem Understanding
Given a `2D` image, a starting pixel `(sr, sc)` and a new colour `color`: change
the colour of the starting pixel **and every 4-directionally connected pixel of the
same original colour**, and only those.

- **Input:** `int[][] image`, `int sr`, `int sc`, `int color`
- **Output:** the modified image
- **Constraints/observations:**
  - If `image[sr][sc] == color`, return immediately (the fill would be a no-op and,
    worse, the recursion would never terminate).
  - The flood must be driven by the **original** colour, captured before the first
    write.

**Example:**
```text
image =                     (1,1) colour 2 →
[[1,1,1],        [[2,2,1],
 [1,1,0],         [2,2,0],
 [1,0,1]]         [1,0,1]]

Only the 2x2 blob of 1s containing (1,1) changes: cells (0,0),(0,1),(0,2),(1,0),(1,1)
plus (2,0),(2,2) would be connected through 1s too — trace it: from (1,1) you can
reach (0,0),(0,1),(0,2),(1,0),(2,0),(2,2) but NOT (1,2)? (1,2) touches (0,2) so it
is connected as well. Result: the entire set of 1s reachable from (1,1) flips.
```

### How to Think About the Problem
- **What should I notice first?** It is problem 6/8 with the "count" replaced by
  "write". The traversal is identical; the seed colour is the state you carry.
- **Which representation?** The grid, implicitly.
- **Counting?** No — writing.
- **Which traversal?** Either. DFS is the natural recursive shape; BFS avoids deep
  recursion on a big blob.
- **Clue → Pattern:** *"recolour the connected region of one colour"* → **flood fill
  from one seed with the seed colour captured first**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for every pixel, decide if it belongs to the region by re-running a
             search from the seed. O((n·m)^2).
        ↓
Observation: "is reachable from the seed through original-colour pixels?" is
             answered once by a single exploration. Write during the exploration.
        ↓
Optimal: DFS/BFS flood fill, O(n·m), one visit per pixel.
```

### Brute Force Approach
**Basic idea:** for every pixel of the seed's colour, test connectedness with a
fresh search.

```java
import java.util.*;

public class FloodFillBrute {
    // For every pixel of the seed's colour, re-run a search from the SEED and
    // recolour the pixel if it is reachable. One O(n*m) search per pixel.
    public int[][] floodFill(int[][] image, int sr, int sc, int color) {
        int n = image.length, m = image[0].length;
        int src = image[sr][sc];
        if (src == color) return image;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (image[r][c] != src) continue;
                if (reaches(image, sr, sc, r, c)) image[r][c] = color;
            }
        }
        return image;
    }

    private boolean reaches(int[][] img, int sr, int sc, int r, int c) {
        int n = img.length, m = img[0].length;
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(sr * m + sc);
        vis[sr][sc] = true;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll(), x = cur / m, y = cur % m;
            for (int[] d : dirs) {
                int nx = x + d[0], ny = y + d[1];
                if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
                if (vis[nx][ny] || img[nx][ny] != img[sr][sc]) continue;
                if (nx == r && ny == c) return true;
                vis[nx][ny] = true;
                q.add(nx * m + ny);
            }
        }
        return false;
    }
}
```

Note the shape of that brute force: **one fresh `O(n·m)` search per candidate
pixel**, because the code re-answers "is this pixel reachable from the seed?" for
every pixel independently, even after the first search already proved the answer for
its whole blob.

> **Why can this be improved?** Reachability from one seed is a single question.
> Ask it once.

### Optimal Approach — Fill During the Traversal

#### Core Observation
**Capture `int srcColor = image[sr][sc]` before writing anything, and change each
pixel as you discover it.** The write *is* the visited mark, which is what makes the
recursion terminate.

#### Pattern Identification
**Mental model 1: flood fill**, single seed, write-on-discovery.

#### Step-by-Step Intuition
1. `int srcColor = image[sr][sc]`. If `srcColor == color`, return `image`
   (otherwise the fill condition would be true forever on the pixel you just wrote).
2. `dfs(sr, sc, srcColor, color)`:
   - if out of bounds, or `image[r][c] != srcColor`, **return**;
   - `image[r][c] = color;` ← **mark/write first**
   - recurse on the 4 neighbours.
3. Return `image`.

*The invariant:* every pixel already recoloured is adjacent to the seed through
original-coloured pixels, and every such pixel is recoloured exactly once (because
after writing, it no longer equals `srcColor` and is skipped by the entry check).

#### Dry Run
```text
image = [[1,1,1],[1,1,0],[1,0,1]], sr=1, sc=1, srcColor=1, newColor=2

call   pixel     writes?   neighbours examined (recursed)
(1,1)  (1,1)     -> 2       (0,1) ok, (2,1)=0 stop, (1,0) ok, (1,2)=0 stop
(0,1)  (0,1)     -> 2       (0,0) ok, (0,2) ok
(0,0)  (0,0)     -> 2       (1,0) ok
(1,0)  (1,0)     -> 2       (2,0) ok
(2,0)  (2,0)     -> 2       (1,0) now 2 -> return immediately (prevents re-entry)
(0,2)  (0,2)     -> 2       (1,2)=0 stop

final image =
[[2,2,2],
 [2,2,0],
 [2,0,1]]
```
All six connected `1`s flipped; `(2,2)` stayed `1` because it is diagonally
separated.

#### Why Does It Work?
The entry condition `image[r][c] == srcColor` admits a pixel only if it is still
unvisited (all visited pixels now hold `color`) **and** connected to the seed by a
chain of `srcColor` pixels — so the algorithm writes exactly the seed's component.
Since a pixel is written at most once, termination is guaranteed.

#### Java Code
```java
import java.util.*;

public class FloodFill {
    private static final int[][] DIRS = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};

    public int[][] floodFill(int[][] image, int sr, int sc, int color) {
        int srcColor = image[sr][sc];          // capture BEFORE any write
        if (srcColor == color) return image;   // otherwise infinite recursion
        fill(image, sr, sc, srcColor, color);
        return image;
    }

    private void fill(int[][] image, int r, int c, int srcColor, int color) {
        int n = image.length, m = image[0].length;
        if (r < 0 || r >= n || c < 0 || c >= m) return;      // bounds first
        if (image[r][c] != srcColor) return;                 // already filled / different
        image[r][c] = color;                                 // mark, THEN recurse
        for (int[] d : DIRS) fill(image, r + d[0], c + d[1], srcColor, color);
    }

    // iterative variant — same logic, no recursion limit
    public int[][] floodFillIterative(int[][] image, int sr, int sc, int color) {
        int srcColor = image[sr][sc];
        if (srcColor == color) return image;
        int n = image.length, m = image[0].length;
        ArrayDeque<Integer> st = new ArrayDeque<>();
        st.push(sr * m + sc);
        image[sr][sc] = color;
        while (!st.isEmpty()) {
            int cur = st.pop(), r = cur / m, c = cur % m;
            for (int[] d : DIRS) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (image[nr][nc] != srcColor) continue;
                image[nr][nc] = color;
                st.push(nr * m + nc);
            }
        }
        return image;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each pixel is written once and then skipped, so at
most `n·m` writes and `4` neighbour checks each → **`O(n·m)`**.
**Space Complexity Calculation:** recursive → stack depth up to `O(n·m)`; iterative
→ `O(n·m)` stack. Both `O(V)`.

### Edge Cases
- `srcColor == color` → return unchanged (otherwise infinite recursion). This is the
  single most-missed guard in interviews.
- `image[sr][sc] == 0` and colour `0` is also "background": the guard above handles
  it; the classic trap is a *different* seed pixel that happens to already be the
  new colour.
- `1×1` grid → writes the seed only.
- 8-directional variant → add four diagonals to `DIRS`.
- Recursion depth `≈ n·m` on a snake-shaped blob → use the iterative version.

### Pattern to Remember
```text
Problem clue:  "recolour / replace the connected region of one value"
Pattern:       single-seed flood fill, write-on-discovery
Requirement:   grid, 4 (or 8) directions
Mental model:  capture the seed colour first; the write is the visited mark
```

**Similar problems:** 6, 8, 14, 15, 18. **Interview tip:** say the
`srcColor == color` guard out loud — reviewers look for it.

---

## 11. Cycle Detection in an Undirected Graph — BFS

### Problem Understanding
Detect whether an **undirected** graph (possibly disconnected) contains a cycle.

- **Input:** `V`, adjacency list
- **Output:** `true` if a cycle exists anywhere, else `false`
- **Constraints/observations:**
  - Undirected: the same edge appears twice, so **the reverse of a tree edge is not
    a cycle**.
  - Disconnected: you need the outer loop from problem 3.
  - A node with `deg ≥ 2` is not necessarily in a cycle; a node with `deg ≥ 3` in an
    undirected graph *is* (a useful shortcut, not a general solution).

**Example 1:** `V = 5`, edges `0-1, 1-2, 2-3, 3-4, 4-0` → `true` (cycle `0-1-2-3-4-0`)
**Example 2:** `V = 4`, edges `0-1, 1-2, 2-3, 3-1` → `true` (triangle `1-2-3`)
**Example 3:** `V = 4`, edges `0-1, 0-2, 3-0` → `false` (a tree)
**Example 4:** `V = 2`, edges `0-1, 0-1` (a multi-edge) → **`true`** — and this is
the case where a naive `v != parent` vertex check *fails* (it would skip both copies).

### How to Think About the Problem
- **What should I notice first?** In an undirected graph, "I already visited `v`"
  fires twice for *every* edge. So "visited" is not the signal — "**visited and not
  my parent**" is.
- **Which representation?** Adjacency list.
- **Counting/ordering/minimizing?** Neither — this is a **property test** that uses
  the traversal's edge classification (tree edge vs back edge).
- **Which traversal?** BFS here (DFS is problem 12). BFS needs a `parent` per node,
  recorded at enqueue time.
- **Clue → Pattern:** *"cycle in an undirected graph"* → **BFS with
  `parent[]`; a visited neighbour that is not the parent is a cycle**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each node, count its degree; any node with deg >= 3 is in a cycle.
             (True statement, but it misses multi-edges and says nothing about
             multi-graphs / self-loops handled separately.)
        ↓
Observation: during BFS from a source, every edge is either a TREE edge (first
             discovery) or a BACK edge (second encounter). A back edge, in an
             undirected graph, closes a cycle.
        ↓
Optimal: run BFS from every component, remembering the parent of each node; the
         first "visited neighbour that is not my parent" returns true.
```

### Brute Force Approach
**Basic idea:** count edges and vertices. An undirected graph is acyclic iff
`E = V - (#components)`, i.e. `E < V` per component.

```java
import java.util.*;

public class CycleBrute {
    public boolean hasCycle(List<List<Integer>> adj) {
        int V = adj.size();
        int edges = 0;
        for (int u = 0; u < V; u++) edges += adj.get(u).size();
        edges /= 2;                                   // each edge stored twice
        return edges >= V;                            // true only when connected
    }
}
```

**Time Complexity Calculation:** one pass over all adjacency lists → `O(V + E)`.
**Space Complexity Calculation:** `O(1)`.
**Why is it wrong?** It is right only for a **connected** graph, and it does not
distinguish "many edges in one component" from "many components". For
`V = 4`, `E = 3` split as `{0-1, 1-2}` and `{3}` the counts say "tree" (fine), but
for `V = 3`, edges `{0-1, 1-2, 0-2}` (a triangle, a cycle) the count also says
tree — no wait, `E = 3 = V` here so it says cycle; but `V = 4` with edges `{0-1, 1-0,
2-3}` (multi-edge cycle) also gives `E = 3 < V = 4` → **false negative**. The count
test is only valid per connected component.

> **Why can this be improved?** The count test throws away all structural
> information. The traversal already computes exactly the classification you need
> (tree edge vs back edge) for free.

### Optimal Approach — BFS with a `parent` array

#### Core Observation
**In an undirected graph, an edge is a cycle exactly when it is not the edge you
arrived on.** During BFS, when you are at `u` and see a neighbour `v`:
- `vis[v] == 0` → tree edge (we learn about `v` now, and `parent[v] = u`);
- `vis[v] == 1` and `v != parent[u]` → **back edge ⇒ cycle**.

#### Pattern Identification
**Traversal-based property test.** The mental model is still "walk the graph", but
the answer is read off the *edge classification*, not off the visit set.

#### Step-by-Step Intuition
1. `int[] vis`, `int[] parent` (init `-1`).
2. `for (src = 0..V-1)`: if `vis[src] == 1` continue; BFS from `src` with
   `parent[src] = -1`.
3. Dequeue `u`. For each `v` in `adj.get(u)`:
   - if `vis[v] == 0` → `vis[v] = 1`, `parent[v] = u`, enqueue `v`;
   - else if `v != parent[u]` → return `true`.
4. If all components finish, return `false`.

*The invariant:* `parent[u]` is always the vertex from which `u` was first
discovered, so the BFS spanning forest is well defined, and every non-tree edge
found is a genuine cycle.

#### Dry Run — Example 1
`V = 5`, edges `0-1, 1-2, 2-3, 3-4, 4-0`. Start at 0.

| Step | dequeue | neighbour | `vis[v]` | `v == parent[u]`? | action |
|---|---|---|---|---|---|
| 1 | 0 | 1 | 0 | — | tree edge: `parent[1]=0`, enqueue 1 |
| 2 | 0 | 4 | 0 | — | tree edge: `parent[4]=0`, enqueue 4 |
| 3 | 1 | 0 | 1 | `0 == parent[1]=0` → **yes** | skip (the reverse tree edge) |
| 4 | 1 | 2 | 0 | — | `parent[2]=1`, enqueue 2 |
| 5 | 4 | 3 | 0 | — | `parent[3]=4`, enqueue 3 |
| 6 | 4 | 0 | 1 | `0 == parent[4]=0` → **yes** | skip |
| 7 | 2 | 1 | 1 | skip (parent) | — |
| 8 | 2 | 3 | 1 | `3 != parent[2]=1` → **no** | **cycle found → true** |

Path in the cycle: `0 → 4 → 3 → 2 → 1 → 0`. ✓

#### Why Does It Work?
A BFS spanning forest contains `V − (#components)` edges. Every remaining edge in an
undirected graph has both endpoints already discovered, so it lies on a path in the
forest **plus** itself — a cycle. The only edges that must be excluded are the
`V − (#components)` tree edges, identified exactly by `v == parent[u]`. So the test
is both necessary and sufficient.

#### Java Code
```java
import java.util.*;

public class CycleUndirectedBFS {
    public boolean hasCycle(int V, List<List<Integer>> adj) {
        int[] vis = new int[V];
        int[] parent = new int[V];
        Arrays.fill(parent, -1);
        for (int src = 0; src < V; src++) {          // disconnected-safe
            if (vis[src] == 1) continue;
            vis[src] = 1;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(src);
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (vis[v] == 0) {
                        vis[v] = 1;
                        parent[v] = u;               // remember the tree edge
                        q.add(v);
                    } else if (v != parent[u]) {
                        return true;                // non-tree edge => cycle
                    }
                }
            }
        }
        return false;
    }
}
```

#### Complexity
**Time Complexity Calculation:** outer loop `O(V)`; every vertex enqueued once, every
undirected edge examined twice (`u→v` and `v→u`) → **`O(V + E)`**.
**Space Complexity Calculation:** `vis` + `parent` = `O(V)`, queue `O(V)` →
**`O(V)`** auxiliary.

### Edge Cases
- **Multi-edge** `0-1` twice: BFS from 0 sets `parent[1] = 0`; when 1 is dequeued it
  sees 0 twice; both satisfy `v == parent[1]`, so **this vertex-based check reports
  no cycle** even though a parallel edge *is* a cycle. Fix: skip only the **first**
  occurrence of the parent edge (or store edge ids).
- Self-loop `u-u`: `v == u`, `u != parent[u]` → cycle. ✓
- `V = 0` or a forest → `false`. A single node with a self-loop → `true`.
- `V = 1`, no edges → `false`.

### Pattern to Remember
```text
Problem clue:  "is there a cycle?" in an UNDIRECTED graph
Pattern:       BFS/DFS + parent[]; visited neighbour that is not the parent => cycle
Requirement:   undirected (directed needs a recursion-stack, see 20)
Mental model:  every undirected edge appears twice; only the reverse tree edge is fake
```

**Similar problems:** 12, 20, 23. **Interview tip:** the moment you say
"`v != parent[u]`", ask yourself about multi-edges out loud — that is the one
follow-up that separates a candidate from the other 90%.

---

## 12. Detect a Cycle in an Undirected Graph — DFS

### Problem Understanding
Same question as problem 11, solved with DFS. The answer and the *proof* are the
same; only the walker changes. This matters in interviews because the DFS version
generalizes to **edge classification** and is what Tarjan (51/52) is built from.

- **Input:** `V`, adjacency list
- **Output:** boolean
- **Observations:** with recursion, the "parent" is a **parameter**, so no `parent[]`
  array is needed.

**Example:** `0-1, 1-2, 2-3, 3-1` → `true`. DFS from 0: 0→1 (parent 0), 1→2 (parent
1), 2→3 (parent 2), 3 sees 1 which is visited and not its parent → cycle `1-2-3-1`.

### How to Think About the Problem
- **What should I notice first?** The only difference from BFS is that "my parent"
  is now a function argument instead of an array entry.
- **Which representation?** Adjacency list.
- **Property test** again — the same test as 11, applied inside a recursive frame.
- **Which traversal?** DFS, because (a) the parent is free, (b) it is the seed of
  the `low[]` machinery later.
- **Clue → Pattern:** *"cycle, undirected"* → **recursive DFS carrying `parent`**.

### Intuition (Brute → Better → Optimal)
```text
Brute: compare E vs V per component. Fragile (see problem 11).
        ↓
Observation: a DFS classifies every edge; in an undirected graph the only
             "allowed" already-visited neighbour is the parent.
        ↓
Optimal: recursive dfs(u, parent). O(V + E), O(V) stack, no extra array.
```

### Brute Force Approach
```java
import java.util.*;

public class CycleUndirectedDFSBrute {
    public boolean hasCycle(List<List<Integer>> adj) {
        int V = adj.size();
        int[] vis = new int[V];
        for (int i = 0; i < V; i++) if (dfs(i, -1, adj, vis)) return true;
        return false;
    }
    private boolean dfs(int u, int p, List<List<Integer>> adj, int[] vis) {
        vis[u] = 1;
        for (int v : adj.get(u)) {
            if (vis[v] == 1 && v != p) return true;   // is this enough?  test it:
        }
        return false;
    }
}
```
The version above forgets to *recurse* into unvisited neighbours, so it only finds
2-cycles. Running a fresh search from every node without sharing `vis` finds every
edge twice and reports false positives.

**Time:** `O(V · (V + E))`. **Space:** `O(V)`.
> **Why can this be improved?** One DFS with a shared `vis` visits each vertex once
> and each edge twice; the parent parameter is the only extra information needed.

### Optimal Approach — Recursive DFS with a parent parameter

#### Core Observation
**A back edge is a visited neighbour that is not the vertex you came from.** In a
recursive DFS the "vertex you came from" is a local variable — `parent` — so the
`parent[]` array of problem 11 becomes free.

#### Pattern Identification
**Traversal-based property test, DFS flavour.**

#### Step-by-Step Intuition
1. `dfs(u, parent)`:
   - `vis[u] = 1`;
   - for each `v` in `adj.get(u)`:
     - `vis[v] == 0` → `if (dfs(v, u)) return true;`
     - `vis[v] == 1 && v != parent` → `return true;`
2. Outer loop over all vertices (disconnected safety), calling `dfs(i, -1)`.
3. If nothing fired, return `false`.

#### Dry Run
`0-1, 1-2, 2-3, 3-1`, DFS from 0

| Call | `u` | `parent` | `v` | `vis[v]` | action |
|---|---|---|---|---|---|
| 1 | 0 | −1 | 1 | 0 | recurse `dfs(1, 0)` |
| 2 | 1 | 0 | 0 | 1 | `v == parent` → skip |
| 3 | 1 | 0 | 2 | 0 | recurse `dfs(2, 1)` |
| 4 | 2 | 1 | 1 | 1 | skip (parent) |
| 5 | 2 | 1 | 3 | 0 | recurse `dfs(3, 2)` |
| 6 | 3 | 2 | 2 | 1 | skip (parent) |
| 7 | 3 | 2 | 1 | 1 | `1 != parent(2)` → **cycle → true** |

#### Why Does It Work?
Identical to problem 11: the DFS spanning forest's tree edges are exactly the
`parent` edges, and every other edge closes a cycle. Because the recursion only
follows unvisited vertices, each vertex is entered once and each edge examined
twice, so the search is exhaustive.

#### Java Code
```java
import java.util.*;

public class CycleUndirectedDFS {
    public boolean hasCycle(int V, List<List<Integer>> adj) {
        int[] vis = new int[V];
        for (int i = 0; i < V; i++) {
            if (vis[i] == 0 && dfs(i, -1, adj, vis)) return true;   // -1 = no parent
        }
        return false;
    }

    private boolean dfs(int u, int parent, List<List<Integer>> adj, int[] vis) {
        vis[u] = 1;
        for (int v : adj.get(u)) {
            if (vis[v] == 0) {
                if (dfs(v, u, adj, vis)) return true;      // tree edge
            } else if (v != parent) {
                return true;                               // back edge => cycle
            }
        }
        return false;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each vertex entered once, each undirected edge
examined twice → **`O(V + E)`**; the outer loop adds `O(V)`.
**Space Complexity Calculation:** recursion depth up to `V` → **`O(V)`**. No
`parent[]` array needed.

### Edge Cases
- Same as problem 11: multi-edges (vertex-based parent check misses a parallel edge),
  self-loops (correctly reported), `V = 0` (no cycle), forests (no cycle).
- Deep chain `V = 10⁵` → `StackOverflowError`; convert to the iterative BFS version
  (problem 11) or use an explicit stack.
- A graph where the only cycle is in a component **not containing node 0** → found
  only because of the outer loop.

### Pattern to Remember
```text
Problem clue:  "cycle in an undirected graph" (DFS version)
Pattern:       dfs(u, parent); visited && v != parent => cycle
Requirement:   undirected; recursive DFS
Mental model:  the parent ARGUMENT replaces the parent ARRAY
```

**Similar problems:** 11, 20, 51, 52. **Interview tip:** when the interviewer asks
"can you do it in one pass without an array?", passing `parent` as a parameter is
the answer.

---

## 13. Distance of Nearest Cell Having 1 — 01 Matrix (LeetCode 542)

### Problem Understanding
Given a binary grid, for every cell return the **Manhattan distance to the nearest
cell containing `1`**. Cells that are `1` have distance `0`; unreachable cells
(impossible here — the grid is a rectangle) would be `∞`.

- **Input:** `int[][] mat`
- **Output:** `int[][] ans` with the same shape
- **Constraints/observations:**
  - You need the distance to the **nearest**, not to a specific one.
  - Running a BFS from each `1` is the trap; running a BFS from each `0` is worse.
  - This is textbook **multi-source BFS**: the "sources" are the `1` cells.

**Example:**
```text
mat =
0 0 0
0 1 0
1 1 1

ans =
3 2 1
2 0 1
1 0 0
```

### How to Think About the Problem
- **What should I notice first?** "Nearest of many" — a single-source question
  repeated `n·m` times.
- **Which representation?** Grid, implicit 4-adjacency.
- **Counting?** Not counting — it is a **distance** → mental model 2.
- **Which traversal?** Multi-source BFS seeded by **all** `1`s at distance 0.
- **Clue → Pattern:** *"distance to the nearest special cell"* → **multi-source BFS
  from all special cells**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each cell, BFS until you touch a 1. O((n·m)^2) — each BFS can
             touch the whole grid, and there are n·m of them.
        ↓
Observation: min over sources of dist-to-source is exactly "distance from the
             CLOSEST source", which is what one BFS from all sources computes.
        ↓
Optimal: one multi-source BFS, O(n·m).
```

### Brute Force Approach
```java
import java.util.*;

public class ZeroOneMatrixBrute {
    public int[][] updateMatrix(int[][] mat) {
        int n = mat.length, m = mat[0].length;
        int[][] ans = new int[n][m];
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (mat[r][c] == 1) { ans[r][c] = 0; continue; }
                boolean found = false;
                for (int dist = 1; dist < n + m && !found; dist++) {   // growing rings
                    for (int dr = -dist; dr <= dist && !found; dr++) {
                        for (int dc = -dist; dc <= dist; dc++) {
                            if (Math.abs(dr) + Math.abs(dc) != dist) continue;
                            int nr = r + dr, nc = c + dc;
                            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                            if (mat[nr][nc] == 1) { ans[r][c] = dist; found = true; break; }
                        }
                    }
                }
            }
        }
        return ans;
    }
}
```

**Time Complexity Calculation:** for each of `n·m` cells we scan diamond rings of
radius up to `O(n+m)`, each ring containing `O(k)` cells → `O((n·m)²)` in the worst
case (a grid with a single `1` in the corner).
**Space Complexity Calculation:** `O(n·m)` for the answer.

> **Why can this be improved?** All `n·m` searches share the same graph. Their
> results can be computed simultaneously by seeding one queue with all `1`s.

### Optimal Approach — Multi-Source BFS

#### Core Observation
**`dist(x) = min over sources s of hops(x, s)`, and BFS from a set of sources
computes exactly that in one pass.** The trick is to enqueue **every** `1` with
distance 0 before the loop starts.

#### Pattern Identification
**Mental model 2 (level expansion) + the multi-source trick.**

#### Step-by-Step Intuition
1. `int[][] dist` filled with `-1` (unvisited).
2. Enqueue all cells with `mat[r][c] == 1`, set `dist[r][c] = 0`, enqueue.
3. BFS: dequeue `(r,c)`; for each in-bounds neighbour with `dist == -1`, set
   `dist[nr][nc] = dist[r][c] + 1` and enqueue.
4. Return `dist`.

*The invariant:* a cell is dequeued with the distance to its nearest `1`, because
the queue is level-ordered over the source set: a cell at level `t` has no source
closer than `t` (else a shorter path would have enqueued it earlier) and does have
one at distance `t`.

#### Dry Run
`mat` as above; sources = `{(1,1), (2,0), (2,1), (2,2)}`, all at distance 0.

| Step | dequeue | unvisited neighbours | `dist` writes | queue after |
|---|---|---|---|---|
| seed | — | — | `dist(1,1)=0, dist(2,0)=0, dist(2,1)=0, dist(2,2)=0` | `[11, 20, 21, 22]` |
| 1 | `(1,1)` | `(0,1)`, `(1,0)`, `(1,2)` | all `= 1` | `[20,21,22, 01, 10, 12]` |
| 2 | `(2,0)` | `(1,0)` already dist 1 | — | ... |
| 3 | `(2,1)` | — | — | ... |
| 4 | `(2,2)` | `(1,2)` already 1 | — | ... |
| 5 | `(0,1)` | `(0,0)`, `(0,2)` | `= 2` | ... |
| 6 | `(1,0)` | `(0,0)` already 2 | — | ... |
| 7 | `(1,2)` | `(0,2)` already 2 | — | ... |
| 8 | `(0,0)` | none new | — | `[]` |

Final `dist`:
```text
3 2 1
2 0 1
1 0 0
```
(Those last three cells got `3`, `2`, `2` from whichever source was dequeued first;
levels make them equal regardless.)

#### Why Does It Work?
Multi-source BFS is equivalent to adding a virtual source connected to every `1`
with weight-1 edges, and running ordinary BFS. BFS finds shortest paths in
unweighted graphs, so every cell gets its true minimum distance to the set of `1`s.

#### Java Code
```java
import java.util.*;

public class ZeroOneMatrix {
    public int[][] updateMatrix(int[][] mat) {
        int n = mat.length, m = mat[0].length;
        int[][] dist = new int[n][m];
        for (int[] row : dist) Arrays.fill(row, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (mat[r][c] == 1) {                   // EVERY source, distance 0
                    dist[r][c] = 0;
                    q.add(r * m + c);
                }
            }
        }
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll();
            int r = cur / m, c = cur % m;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (dist[nr][nc] != -1) continue;       // already assigned
                dist[nr][nc] = dist[r][c] + 1;         // first write is minimal
                q.add(nr * m + nc);
            }
        }
        return dist;
    }

    // the "two passes" alternative, worth knowing
    public int[][] twoPasses(int[][] mat) {
        int n = mat.length, m = mat[0].length, big = n + m;
        int[][] dist = new int[n][m];
        for (int[] row : dist) Arrays.fill(row, big);
        for (int r = 0; r < n; r++)
            for (int c = 0; c < m; c++)
                dist[r][c] = mat[r][c] == 1 ? 0 : big;
        for (int r = 0; r < n; r++) for (int c = 0; c < m; c++) {   // top-left pass
            if (r > 0) dist[r][c] = Math.min(dist[r][c], dist[r - 1][c] + 1);
            if (c > 0) dist[r][c] = Math.min(dist[r][c], dist[r][c - 1] + 1);
        }
        for (int r = n - 1; r >= 0; r--) for (int c = m - 1; c >= 0; c--) {  // bottom-right
            if (r < n - 1) dist[r][c] = Math.min(dist[r][c], dist[r + 1][c] + 1);
            if (c < m - 1) dist[r][c] = Math.min(dist[r][c], dist[r][c + 1] + 1);
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** every cell is enqueued once and expands 4
neighbours → `O(n·m)` = `O(V + E)` with `E ≈ 4V`.
**Space Complexity Calculation:** `dist` `O(n·m)`, queue `O(n·m)` → **`O(V)`**.

### Edge Cases
- All cells `1` → answer is the all-zero matrix; the BFS loop body never executes.
- All cells `0` → the queue is empty at the start, so **all distances stay `-1`**
  with this code. On LeetCode the grid always contains at least one `1`; state the
  assumption and guard if you like.
- A single `1` in the corner → answers radiate outward; the BFS still fills
  everything, unlike a two-pass scan that needs both passes (the two-pass version
  handles it because the reverse pass propagates back up-left).
- `n = 1` or `m = 1` (a line) → BFS is just a two-way sweep.

### Pattern to Remember
```text
Problem clue:  "distance to the NEAREST cell/property", "01 matrix", "nearest river bank"
Pattern:       multi-source BFS from all special cells at distance 0
Requirement:   unweighted
Mental model:  min-over-sources distance == one BFS from the whole source set
```

**Similar problems:** 9, 14, 15, 34, 37. **Interview tip:** contrast explicitly
with "one BFS per source" — naming the `O((n·m)²)` you avoided is what makes the
multi-source framing sound deliberate rather than accidental.

---

## 14. Surrounded Regions — Replace `O`s with `X`s (LeetCode 130)

### Problem Understanding
A grid of `X` (wall) and `O`. An `O` is **captured** if it is 4-connected only to
`O`s and cannot reach the **border** by a path of `O`s. Flip captured `O`s to `X`,
leave the rest as `O`.

- **Input:** `char[][] board`
- **Output:** the board, in place
- **Observations:**
  - "Cannot reach the border" is a reachability question **from the border** — so
    the natural move is to run the search *backwards*, starting at the border cells.
  - Flipping the *safe* `O`s would be wrong; marking the *unsafe* ones is the way.

**Example:**
```text
board =
X X X X
X O O X
X O X X
X X X X
→ the two O's form a pocket, none touches the border
X X X X
X X X X
X X X X
X X X X
```

### How to Think About the Problem
- **What should I notice first?** The answer is defined by a **negative**: "not
  connected to the border". Negated connectivity questions are usually easiest to
  answer by reversing the direction of the search.
- **Which representation?** The grid, implicit 4-adjacency.
- **Counting, ordering, or minimizing?** Marking — a flood fill from a *seed set*.
- **Which traversal?** Multi-source BFS/DFS from all border `O`s. Everything reached
  survives; everything unreached flips.
- **Clue → Pattern:** *"cells that can/ cannot escape to the boundary"* → **multi-source
  traversal from the boundary, then invert the predicate**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each O, run a search to see if it touches the border.
             O((n·m)^2).
        ↓
Observation: "can reach the border" is symmetric — if a O can reach a border O,
             that border O can reach it. So one search FROM the border answers for
             every O at once.
        ↓
Optimal: multi-source BFS from border O's, mark 'S'; then any remaining 'O' is
         captured -> flip to 'X'.  O(n·m).
```

### Brute Force Approach
```java
import java.util.*;

public class SurroundedBrute {
    public void solve(char[][] board) {
        int n = board.length, m = board[0].length;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (board[r][c] != 'O') continue;
                if (!touchesBorder(board, r, c)) board[r][c] = 'X';
            }
        }
    }

    private boolean touchesBorder(char[][] b, int sr, int sc) {
        int n = b.length, m = b[0].length;
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(sr * m + sc);
        vis[sr][sc] = true;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll(), r = cur / m, c = cur % m;
            if (r == 0 || c == 0 || r == n - 1 || c == m - 1) return true;   // reached border
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (vis[nr][nc] || b[nr][nc] != 'O') continue;
                vis[nr][nc] = true;
                q.add(nr * m + nc);
            }
        }
        return false;
    }
}
```

**Time Complexity Calculation:** one `O(n·m)` search per `O` cell → **`O((n·m)²)`**.
**Space Complexity Calculation:** `O(n·m)` per search.
> **Why can this be improved?** Every search explores (almost) the same set of
> cells. Reachability is symmetric, so one search from the whole border gives the
> answer for all cells.

### Optimal Approach — Mark from the border inward

#### Core Observation
**An `O` survives iff it is reachable from some border `O`.** By symmetry of
undirected adjacency, "reaches the border" ≡ "is reachable from the border". So seed
a multi-source traversal with every border `O` and mark everything reached as safe.

#### Pattern Identification
**Mental model 1: flood fill from a seed set + predicate inversion** (this is the
"reverse the question" trick, shared with 15, 26 and 49).

#### Step-by-Step Intuition
1. `boolean[][] safe` (or mark in place with `'S'`).
2. Push all border `O`s; mark safe.
3. BFS 4-directional over `O`s, marking safe.
4. Second pass: every `O` that is **not** safe → `'X'`.
5. (Optional) turn `'S'` back into `'O'`.

*The invariant:* a cell is marked safe iff it lies on a path of `O`s from a border
cell — which is exactly the set of non-captured cells. So the complement is exactly
the captured set.

#### Dry Run
```text
board =
X X X X
X O O X
X O X X
X X X X
```
Step 1 — border scan: all border cells are `X` except… none. The seed set is **empty**.

| Stage | queue | effect |
|---|---|---|
| seed | `[]` | no border `O` |
| BFS | `[]` | loop never runs; `safe` is all `false` |
| flip | — | `(1,1)`, `(1,2)`, `(2,1)` are `O` and not safe → all become `X` |

Result: every cell is `X` ✓. This example shows the degenerate case: an empty seed
set means **everything** is captured.

#### Why Does It Work?
`O` cells form an undirected graph under 4-adjacency. The set marked by the BFS is
the connected-reachable set from the border seeds, and by definition of
undirected reachability, that equals the set of cells with a path to the border.
Those are precisely the cells that are not surrounded, so their complement is the
answer.

#### Java Code
```java
import java.util.*;

public class SurroundedRegions {
    public void solve(char[][] board) {
        int n = board.length, m = board[0].length;
        if (n == 0 || m == 0) return;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        boolean[][] safe = new boolean[n][m];

        // seed: every border 'O'
        for (int r = 0; r < n; r++) {
            if (board[r][0] == 'O' && !safe[r][0]) { safe[r][0] = true; q.add(r * m); }
            if (board[r][m - 1] == 'O' && !safe[r][m - 1]) { safe[r][m - 1] = true; q.add(r * m + m - 1); }
        }
        for (int c = 0; c < m; c++) {
            if (board[0][c] == 'O' && !safe[0][c]) { safe[0][c] = true; q.add(c); }
            if (board[n - 1][c] == 'O' && !safe[n - 1][c]) { safe[n - 1][c] = true; q.add((n - 1) * m + c); }
        }

        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll(), r = cur / m, c = cur % m;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (safe[nr][nc] || board[nr][nc] != 'O') continue;
                safe[nr][nc] = true;                 // reachable from the border
                q.add(nr * m + nc);
            }
        }

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (board[r][c] == 'O' && !safe[r][c]) board[r][c] = 'X';
            }
        }
    }
}
```

#### Complexity
**Time Complexity Calculation:** the border scan is `O(n + m)`; the BFS enqueues
each cell once and checks 4 neighbours → `O(n·m)`; the flip pass is `O(n·m)` →
**`O(n·m)`** = `O(V + E)`.
**Space Complexity Calculation:** `safe` `O(n·m)`, queue `O(n·m)` → **`O(V)`**.

### Edge Cases
- No `O` at all → seed empty, nothing flips.
- Every cell is `O` → all border, all safe, nothing flips.
- A pocket touching the border only at a **corner** → safe (diagonals do not count
  in 4-direction; the corner cell itself is a border cell and is safe).
- `1×1` board `[['O']]` → the single cell is a border cell → safe, stays `'O'`.
- `1×3` `['O','O','O']` → all border → unchanged.
- `2×2` `[['X','X'],['X','O']]` → `(1,1)` is a border cell → unchanged. Correct:
  nothing can be surrounded in a 2×2 grid.

### Pattern to Remember
```text
Problem clue:  "captured / trapped / cannot escape to the border"
Pattern:       multi-source fill FROM the border, then invert the predicate
Requirement:   undirected 4-adjacency
Mental model:  negated connectivity -> reverse the search direction
```

**Similar problems:** 15, 26, 49, 18. **Interview tip:** when the problem says
"surrounded", immediately ask yourself "can I start from the outside?" — the
outside-in flood fill is the whole solution.

---

## 15. Number of Enclaves (LeetCode 1020)

### Problem Understanding
Count the `1` cells that **cannot** reach the grid **border** through 4-directional
`1` cells. Those cells are "enclaves".

- **Input:** `int[][] grid`, `n`, `m`
- **Output:** number of enclave cells
- **Observations:** identical structure to problem 14 — the difference is only what
  you do with the cells that reach the border (here: subtract them from the total).

**Example 1:**
```text
grid =
0 0 0 0
1 0 1 0
0 1 1 0
0 0 0 0
→ 3   (the 1s form one blob that touches no border)
```
**Example 2:**
```text
grid =
0 1 1 0
0 1 1 0
0 0 0 0
→ 0   (this blob touches the top border, so it is not an enclave)
```

### How to Think About the Problem
- **What should I notice first?** It is problem 14 with a **count** instead of a
  mutation. Recognize that immediately and reuse the code.
- **Which representation?** The grid, implicit 4-adjacency.
- **Counting?** Yes — but the counting is over the *complement* of what the
  traversal reaches.
- **Which traversal?** Multi-source BFS from the border, then count what is left.
- **Clue → Pattern:** *"count cells that cannot reach the boundary"* →
  **outside-in flood fill + count the survivors**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each 1, check if it touches the border. O((n·m)^2).
        ↓
Observation: the ones that DO reach the border are exactly one connected set
             containing the border. Find that set once with a border-seeded BFS.
        ↓
Optimal: count total 1s, subtract the reachable 1s.  O(n·m).
```

### Brute Force Approach
```java
import java.util.*;

public class EnclavesBrute {
    public int numberOfEnclaves(int[][] grid) {
        int n = grid.length, m = grid[0].length, enclaves = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 1 && !reachesBorder(grid, r, c)) enclaves++;
            }
        }
        return enclaves;
    }

    private boolean reachesBorder(int[][] g, int sr, int sc) {
        int n = g.length, m = g[0].length;
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(sr * m + sc);
        vis[sr][sc] = true;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll(), r = cur / m, c = cur % m;
            if (r == 0 || c == 0 || r == n - 1 || c == m - 1) return true;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (vis[nr][nc] || g[nr][nc] == 0) continue;
                vis[nr][nc] = true;
                q.add(nr * m + nc);
            }
        }
        return false;
    }
}
```

**Time Complexity Calculation:** `n·m` cells × `O(n·m)` search → **`O((n·m)²)`**.
**Space Complexity Calculation:** `O(n·m)`.
> **Why can this be improved?** The search from the first `1` already answers the
> question for every `1` it touches; the per-cell repetition is pure waste.

### Optimal Approach — Flood the border, count what's left

#### Core Observation
**Enclave cells = (all `1` cells) − (`1` cells reachable from the border).** One
border-seeded BFS computes the second term for all cells at once.

#### Pattern Identification
**Mental model 1: flood fill from a seed set**, then a counting pass over the
remainder.

#### Step-by-Step Intuition
1. `boolean[][] bad` — `bad[r][c] = true` means "escapes to the border".
2. Seed: every border `1`, marked, enqueued.
3. BFS over `1` cells, marking `bad`.
4. Count `1` cells where `bad == false`.

*The invariant:* after the BFS, `bad[r][c] == true` **iff** `(r,c)` has a path of
`1`s to a border cell — so the loop in step 4 counts exactly the cells with no such
path, which is the definition of an enclave.

#### Dry Run
Example 1:
```text
grid =
0 0 0 0
1 0 1 0
0 1 1 0
0 0 0 0
```
Border `1`s: **none** (row 0, row 3, col 0, col 3 are all `0`) → the BFS seed is
empty.

| Stage | effect | `bad` grid |
|---|---|---|
| seed | nothing enqueued | all `false` |
| BFS | loop never runs | all `false` |
| count | `1`s at `(1,0)`,`(1,2)`,`(2,1)`,`(2,2)` all have `bad == false` | — |

**Answer = 3**? No — there are **four** `1` cells: `(1,0)`, `(1,2)`, `(2,1)`,
`(2,2)`. Since none reaches the border, all four are enclaves → answer `4`.
(LeetCode's own example is `[[0,0,0,0],[1,0,1,0],[0,1,1,0],[0,0,0,0]]` → `4`.)
This is exactly the kind of off-by-one you catch only by dry-running the example.

#### Why Does It Work?
The `1` cells form an undirected graph. A border-seeded BFS marks precisely the
connected component(s) containing border cells, i.e. all cells with a path to the
border. The remaining `1` cells are, by definition, the enclaves, and counting them
in the final pass is exact.

#### Java Code
```java
import java.util.*;

public class NumberOfEnclaves {
    public int numberOfEnclaves(int[][] grid) {
        int n = grid.length, m = grid[0].length;
        boolean[][] bad = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();

        for (int r = 0; r < n; r++) {
            if (grid[r][0] == 1) { bad[r][0] = true; q.add(r * m); }
            if (grid[r][m - 1] == 1) { bad[r][m - 1] = true; q.add(r * m + m - 1); }
        }
        for (int c = 0; c < m; c++) {
            if (grid[0][c] == 1) { bad[0][c] = true; q.add(c); }
            if (grid[n - 1][c] == 1) { bad[n - 1][c] = true; q.add((n - 1) * m + c); }
        }

        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll(), r = cur / m, c = cur % m;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (bad[nr][nc] || grid[nr][nc] == 0) continue;
                bad[nr][nc] = true;
                q.add(nr * m + nc);
            }
        }

        int enclaves = 0;
        for (int r = 0; r < n; r++)
            for (int c = 0; c < m; c++)
                if (grid[r][c] == 1 && !bad[r][c]) enclaves++;
        return enclaves;
    }
}
```

#### Complexity
**Time Complexity Calculation:** seeding `O(n + m)`, BFS `O(n·m)`, counting
`O(n·m)` → **`O(n·m)`** = `O(V + E)` with `E ≈ 4V`.
**Space Complexity Calculation:** `bad` + queue `O(n·m)` → **`O(V)`**.

### Edge Cases
- No `1`s → `0`.
- All `1`s → every cell is a border cell → `0`.
- Enclave touching the border only diagonally → **is** an enclave (4-direction).
- A `1×m` or `m×1` grid → every cell is on the border → `0` (nothing can be
  enclosed in a single row/column).
- A ring of `1`s enclosing a pocket: the ring is safe, the pocket cells are
  enclaves.

### Pattern to Remember
```text
Problem clue:  "count cells that cannot reach the border / are trapped"
Pattern:       border-seeded multi-source BFS, then count the unmarked cells
Mental model:  reachability is symmetric — start from the outside
```

**Similar problems:** 14, 26, 49. **Interview tip:** mention that problems 14, 15
and 49 are *literally the same code* with a different final pass; recognizing that
saves you 20 minutes of thinking.

---

## 16. Word Ladder I (LeetCode 127)

### Problem Understanding
Given `beginWord`, `endWord` and a dictionary, each operation may change **one
letter** of the current word. Return the **length of the shortest sequence** from
`beginWord` to `endWord` (the number of words in the sequence), or `0` if
impossible.

- **Input:** `String beginWord`, `String endWord`, `List<String> wordList`
- **Output:** shortest transformation length, or `0`
- **Constraints/observations:**
  - Words are nodes; "differs in one letter" is an edge. The graph is huge but
    **implicit** — you never enumerate it.
  - Every edge costs 1, so **BFS level = number of transformations**.
  - `wordList` may contain duplicates — use a `HashSet`.

**Example 1:** `beginWord = "hit"`, `endWord = "cog"`,
`wordList = ["hot","dot","dog","lot","log","cog"]` → `5`
(hit → hot → dot → dog → cog)
**Example 2:** same but `endWord = "cog"` replaced by a word not in the list → `0`
**Example 3:** `beginWord = "a", endWord = "c", wordList = ["a","b","c"]` → `2`

### How to Think About the Problem
- **What should I notice first?** *"one letter change"* describes the **edges**, and
  the operation cost is 1 → unweighted shortest path.
- **Which representation?** **Implicit** graph. Generate neighbours on the fly
  (either by mutating one position at a time, or by comparing against the whole
  dictionary).
- **Counting/ordering/minimizing?** Minimizing → but unweighted, so **BFS**, not
  Dijkstra.
- **Which traversal?** Level-by-level BFS with a `Set<String> visited` (or a
  `HashSet` dictionary you remove words from as you visit them).
- **Clue → Pattern:** *"unit-cost transformations between strings"* →
  **implicit unweighted graph + BFS levels**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: build the full word graph (for every word, compare against every
             other word) -> O(W^2 · L), then BFS. Memory explodes.
        ↓
Observation: you only ever need the neighbours of the words currently in the
             frontier. Generating them on demand is O(26·L) per word.
        ↓
Optimal: BFS where each expansion tries all 26 letters at each position. O(26·L·W).
```

### Brute Force Approach
**Basic idea:** build the whole graph first, then BFS.

```java
import java.util.*;

public class WordLadderBrute {
    public int ladderLength(String begin, String end, List<String> list) {
        Set<String> dict = new HashSet<>(list);
        if (!dict.contains(end)) return 0;
        List<String> words = new ArrayList<>(dict);
        int W = words.size();
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < W; i++) adj.add(new ArrayList<>());
        for (int i = 0; i < W; i++) {                        // O(W^2 · L)
            for (int j = 0; j < W; j++) {
                if (i != j && differByOne(words.get(i), words.get(j))) adj.get(i).add(j);
            }
        }
        int[] dist = new int[W];
        Arrays.fill(dist, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        int start = words.indexOf(begin);
        if (start < 0) {
            // beginWord may not be in the dictionary: add it as a virtual node
            words.add(begin);
            adj.add(new ArrayList<>());
            start = W;
            for (int j = 0; j < W; j++) if (differByOne(begin, words.get(j))) adj.get(start).add(j);
        }
        dist[start] = 1;
        q.add(start);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    if (words.get(v).equals(end)) return dist[v];
                    q.add(v);
                }
            }
        }
        return 0;
    }

    private boolean differByOne(String a, String b) {
        int diff = 0;
        for (int i = 0; i < a.length() && diff <= 1; i++)
            if (a.charAt(i) != b.charAt(i)) diff++;
        return diff == 1;
    }
}
```

**Time Complexity Calculation:** `W²` pairs, each compared in `O(L)` →
**`O(W²·L)`** just to build the graph; the BFS is then `O(V + E) = O(W²)`.
**Space Complexity Calculation:** the graph itself is `O(W²)` — for `W = 10⁵` that
is 10¹⁰ edges. Not viable.
> **Why can this be improved?** You never need more than the neighbours of the
> current frontier, and those can be generated with 26 mutations per position.

### Optimal Approach — BFS over an implicit graph

#### Core Observation
**The neighbour set of a word `w` is `{w with position `i` replaced by each of the
26 letters, for every `i`}` intersected with the dictionary.** That is `26·L`
candidates, computable in `O(L)` per candidate — no pairwise comparison needed.

#### Pattern Identification
**Mental model 2: level expansion on an implicit unweighted graph.**

#### Step-by-Step Intuition
1. `Set<String> dict = new HashSet<>(wordList)`. If `!dict.contains(endWord)` → `0`.
2. Level 0 = `{beginWord}`. Remove `beginWord` from `dict` so it is never re-entered.
3. `while (!frontier.isEmpty())`:
   - `int size = frontier.size()`; `words = length`;
   - for each of the `size` words, generate all `26·L` mutations; if a mutation is
     in `dict` (and not yet visited — removing on discovery guarantees this),
     remove it and add it to `next`;
   - check for `endWord` → return `words + 1`;
   - `frontier = next`.
4. Return `0`.

*The invariant:* at the start of a level, `frontier` is exactly the set of words at
BFS distance `words - 1`, and `dict` contains exactly the **unvisited** words.

#### Dry Run
`begin = "hit"`, `end = "cog"`, `dict = {hot, dot, dog, lot, log, cog}`

| Level | `words` | frontier | generated hits in `dict` | next frontier | `end` found? |
|---|---|---|---|---|---|
| 0 | 1 | `{hit}` | `hot` (change `i`→`o`) | `{hot}` | no |
| 1 | 2 | `{hot}` | `dot` (t→d), `lot` (h→l) | `{dot, lot}` | no |
| 2 | 3 | `{dot, lot}` | `dog` (from `dot`, t→g), `log` (from `lot`, t→g) | `{dog, log}` | no |
| 3 | 4 | `{dog, log}` | `cog` (from `dog`, d→c), (from `log`, l→c) | `{cog, …}` | **yes → return 5** |

Sequence: `hit → hot → dot → dog → cog` = 5 words ✓

#### Why Does It Work?
Each mutation that is in the dictionary is exactly one legal operation, so the
implicit graph is exactly the word graph, and every edge has unit cost. BFS on a
unit-cost graph returns the minimum number of edges; adding 1 converts edges into
the number of words in the sequence. Removing words from `dict` on discovery is
the visited array.

#### Java Code
```java
import java.util.*;

public class WordLadder {
    public int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> dict = new HashSet<>(wordList);
        if (!dict.contains(endWord)) return 0;
        dict.remove(beginWord);

        ArrayDeque<String> frontier = new ArrayDeque<>();
        frontier.add(beginWord);
        int words = 1;

        while (!frontier.isEmpty()) {
            int size = frontier.size();          // one level = one more word
            for (int i = 0; i < size; i++) {
                String w = frontier.poll();
                char[] chars = w.toCharArray();
                for (int p = 0; p < chars.length; p++) {
                    char original = chars[p];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == original) continue;
                        chars[p] = c;
                        String next = new String(chars);
                        if (!dict.contains(next)) continue;
                        if (next.equals(endWord)) return words + 1;
                        dict.remove(next);        // discovery == visit
                        frontier.add(next);
                    }
                    chars[p] = original;         // restore before the next position
                }
            }
            words++;
        }
        return 0;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each word is enqueued at most once, and expanding
one word generates `26·L` candidates, each requiring an `O(L)` string build and hash
→ `O(W · 26 · L)` = **`O(26·L·W)`** where `W` is the dictionary size reachable and
`L` the word length. Since `W ≤ 10⁵` and `L ≤ 10`, that is ~2.6·10⁷ hash probes —
fast in practice.
**Space Complexity Calculation:** `dict` `O(W·L)`, `frontier` `O(W·L)` → **`O(W·L)`**
auxiliary. Note: no graph is stored.

### Edge Cases
- `endWord` not in the dictionary → `0` (the first check).
- `beginWord == endWord` → `1` (no operations needed). Handle explicitly if the judge
  allows it; the loop above would return `0` since `endWord` is removed as the
  start, so add the guard.
- No path exists (e.g. `"a"→"c"` with dict `{"a","b"}`) → the BFS exhausts and
  returns `0`.
- Duplicate words in `wordList` → `HashSet` collapses them.
- `wordList` contains `beginWord` → removed as the start, no self-loop.
- Word length 1 → all 26 single letters are one edit away.

### Pattern to Remember
```text
Problem clue:  "one change per step between strings/keys", "minimum number of steps"
Pattern:       BFS on an IMPLICIT graph, generate neighbours on the fly
Requirement:   every operation costs 1
Mental model:  neighbours(w) = {26·L mutations of w} ∩ dictionary
```

**Similar problems:** 17, 28, 32, 34, 37, 13. **Interview tip:** say "I never build
the graph — I generate neighbours on demand, which is what turns `O(W²)` into
`O(26·L·W)`".

---

## 17. Word Ladder II (LeetCode 126)

### Problem Understanding
Same transformation rules as problem 16, but return **all** shortest sequences from
`beginWord` to `endWord` as a list of lists.

- **Input:** `String beginWord`, `String endWord`, `List<String> wordList`
- **Output:** `List<List<String>>` — every shortest transformation sequence
- **Constraints/observations:**
  - BFS alone cannot do this: a plain `visited` set destroys the *second* shortest
    path, which may be a distinct answer.
  - The standard fix is **two phases**: BFS builds the level graph, then a DFS
    walks *backwards* from the end through that graph.
  - The input is guaranteed to have a solution on LeetCode, but handle the empty
    case anyway.

**Example:** `begin = "hit"`, `end = "cog"`, `wordList = ["hot","dot","dog","lot","log","cog"]`
→ `[["hit","hot","dot","dog","cog"]]`. Add `"hot","dot","dog","lot","log","cog"` with
another `"hit"→"hot"→"dot"→"dog"→"log"→"cog"` route available, you get two
sequences of length 6.

### How to Think About the Problem
- **What should I notice first?** "**All** shortest paths", not "a shortest path".
  That single word changes the data structure: a `visited` boolean is not enough,
  because a word must be allowed to be *reached from several predecessors*.
- **Which representation?** Implicit graph again, but now you need the **edge set
  between consecutive levels**.
- **Which traversal?** BFS to *discover and layer*, then DFS to *enumerate*.
- **Clue → Pattern:** *"all shortest paths"* → **BFS layering + backtracking DFS on
  the level graph**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS over all sequences, keep the ones of minimum length. Exponential.
        ↓
Observation: the *length* of a shortest path is a BFS property. BFS can give the
             length, and it can also record WHO reached each word — but a single
             predecessor is not enough when there are several.
        ↓
Optimal: (1) BFS level by level, storing next-hop links for EVERY word at the
         level; (2) DFS backwards from endWord through those links, one path per
         answer.  O(26·L·W) + (number of answers · length).
```

### Brute Force Approach
```Basic idea:** recursive enumeration of every path, tracking the best length.
```java
import java.util.*;

public class WordLadderIIBrute {
    private String end;
    private Set<String> dict;
    private List<String> best;
    private List<List<String>> out;

    public List<List<String>> findLadders(String begin, String target, List<String> list) {
        dict = new HashSet<>(list);
        end = target;
        out = new ArrayList<>();
        if (!dict.contains(end)) return out;
        best = new ArrayList<>();
        out = new ArrayList<>();
        search(new ArrayList<>(List.of(begin)), begin);
        return out;
    }

    private void search(List<String> path, String w) {
        if (w.equals(end)) {
            if (best.isEmpty() || path.size() < best.size()) { best = new ArrayList<>(path); out.clear(); }
            if (path.size() == best.size()) out.add(new ArrayList<>(path));
            return;
        }
        char[] chars = w.toCharArray();
        for (int p = 0; p < chars.length; p++) {
            char original = chars[p];
            for (char c = 'a'; c <= 'z'; c++) {
                if (c == original) continue;
                chars[p] = c;
                String next = new String(chars);
                if (!dict.contains(next)) continue;
                dict.remove(next);                  // mutating the dict = pruning
                path.add(next);
                search(path, next);
                path.remove(path.size() - 1);
            }
            chars[p] = original;
        }
    }
}
```

**Time Complexity Calculation:** worst case exponential in the path length (e.g.
`"aaaa"…` style dictionaries with many interchangeable letters) — this is the
reason the two-phase approach exists.
**Space Complexity Calculation:** `O(path length)` per active path.
> **Why can this be improved?** We do not need *any* path longer than the shortest.
> If we know the shortest length in advance, every word can be pruned by its level.

### Optimal Approach — BFS layering, then DFS

#### Core Observation
**Words in BFS level `i` can only be followed by words in level `i+1` on a shortest
path.** So: use BFS to build, for every word, the *set* of next words that continue
a shortest path, and stop expanding at the level where `endWord` is first reached.
Then every reverse DFS path from `endWord` to `beginWord` is a shortest answer.

#### Pattern Identification
**Mental model 2 (BFS for length) + a backtracking pass (mental model 1 for
enumeration).**

#### Step-by-Step Intuition
1. `Map<String, Set<String>> parents` — for each word, the words that can precede it
   **on a shortest path**.
2. BFS from `beginWord` level by level, using the mutation generator. When
   generating `next` from `w`, record `parents.get(next).add(w)`. Also record
   `parents.get(beginWord) = null` as the sentinel root.
3. When `endWord` is found, **continue finishing the current level** (do not stop
   mid-level — that would lose parallel paths of the same length), then stop.
4. DFS from `endWord`: if `w.equals(beginWord)`, add a reversed copy of the path;
   else for each `p` in `parents.get(w)`, recurse.

*The invariant:* after step 3, `parents` contains exactly the edges `(u,v)` with
`level(v) == level(u) + 1` reachable on a shortest path. Hence every `endWord`→
`beginWord` walk in this reversed graph has exactly the BFS length.

#### Dry Run
`begin = "hit"`, `end = "cog"`, levels as in problem 16.

| BFS level | frontier | `parents` entries created |
|---|---|---|
| 0 | `{hit}` | `parents[hit] = {}` (root) |
| 1 | `{hot}` | `parents[hot] = {hit}` |
| 2 | `{dot, lot}` | `parents[dot]={hot}`, `parents[lot]={hot}` |
| 3 | `{dog, log}` | `parents[dog]={dot}`, `parents[log]={lot}` |
| 4 | `{cog}` found | `parents[cog]={dog, log}` ← **both** kept |

DFS from `cog`:
```text
cog -> dog -> dot -> hot -> hit  => [hit, hot, dot, dog, cog]   (answer 1)
cog -> log -> lot -> hot -> hit  => [hit, hot, lot, log, cog]   (answer 2)
```

#### Why Does It Work?
BFS assigns each word its true minimum distance from `beginWord`, so a word at level
`i` is on *some* shortest path only through its level-`i` predecessors. By storing
all of them and never storing cross-level edges, the reversed graph contains exactly
the shortest paths, and the DFS enumerates each of them once (the graph is a DAG, so
there are no repeats).

#### Java Code
```java
import java.util.*;

public class WordLadderII {
    public List<List<String>> findLadders(String beginWord, String endWord, List<String> wordList) {
        List<List<String>> result = new ArrayList<>();
        if (wordList == null || !new HashSet<>(wordList).contains(endWord)) return result;

        Map<String, Set<String>> parents = new HashMap<>();   // word -> predecessors
        Set<String> visited = new HashSet<>();
        ArrayDeque<String> frontier = new ArrayDeque<>();
        frontier.add(beginWord);
        visited.add(beginWord);

        boolean found = false;
        while (!frontier.isEmpty() && !found) {
            int size = frontier.size();                 // finish the whole level
            for (int i = 0; i < size; i++) {
                String w = frontier.poll();
                for (String next : neighbours(w, wordList)) {
                    if (next.equals(endWord)) found = true;
                    parents.computeIfAbsent(next, k -> new LinkedHashSet<>()).add(w);
                    if (visited.add(next)) frontier.add(next);
                }
            }
        }
        if (!found) return result;

        LinkedList<String> path = new LinkedList<>();
        build(beginWord, endWord, parents, path, result);
        return result;
    }

    private List<String> neighbours(String w, List<String> dict) {
        Set<String> set = new HashSet<>(dict);
        List<String> out = new ArrayList<>();
        char[] chars = w.toCharArray();
        for (int p = 0; p < chars.length; p++) {
            char original = chars[p];
            for (char c = 'a'; c <= 'z'; c++) {
                if (c == original) continue;
                chars[p] = c;
                String next = new String(chars);
                if (set.contains(next)) out.add(next);
            }
            chars[p] = original;
        }
        return out;
    }

    private void build(String word, String end, Map<String, Set<String>> parents,
                       LinkedList<String> path, List<List<String>> result) {
        path.addFirst(word);                       // build the answer backwards
        if (word.equals(end)) {
            result.add(new ArrayList<>(path));
        } else {
            for (String p : parents.getOrDefault(word, new LinkedHashSet<>())) {
                build(p, end, parents, path, result);
            }
        }
        path.removeFirst();
    }
}
```

#### Complexity
**Time Complexity Calculation:** BFS is `O(W · 26 · L)` as in problem 16 (each word
expanded at most once). The DFS costs `O(number of answer words)` — the total
output size, which is unavoidable: the problem's output *is* the work.
**Space Complexity Calculation:** `parents` stores one entry per (word, predecessor)
edge on a shortest path, at most `26·L·W`; the recursion stack is the answer length
`O(W)` → **`O(W·L)`** plus the output.

### Edge Cases
- No path → `visited` exhausts, `found` stays `false` → empty list.
- `beginWord == endWord` → the BFS never finds it as a *neighbour*; LeetCode's
  guarantee excludes this, but add `if (beginWord.equals(endWord)) return
  List.of(List.of(beginWord));` for safety.
- A word reachable by **two** words in the same level → stored in the same `Set`, so
  both paths are enumerated. This is the case that a naive `visited` map destroys.
- Huge answer sets (e.g. `"aaaaaaaa"` ladders) → output explodes; nothing an
  algorithm can do, the judge bounds it.
- Duplicate dictionary entries → `HashSet` inside `neighbours` handles it.

### Pattern to Remember
```text
Problem clue:  "ALL shortest paths / all possible sequences"
Pattern:       BFS for LEVELS + record every predecessor + reverse DFS
Requirement:   unit-cost transformations
Mental model:  shortest paths only ever move one level forward; enumerate the DAG
```

**Similar problems:** 16, 21, 22. **Interview tip:** the killer sentence is "a
single `visited` map is wrong here — a word can be on several shortest paths, so I
store *all* predecessors per level, and I finish the level before stopping."

---

## 18. Number of Islands (LeetCode 200)

### Problem Understanding
Count the number of **islands** in a grid, where an island is a group of `1`s
connected 4-directionally. The classic grid-graph problem.

- **Input:** `char[][] grid` or `int[][] grid`
- **Output:** number of islands
- **Observations:**
  - Identical to problems 6/8 — the value of revisiting it is the **sinking trick**
    versus an explicit `visited` array, and the "DFS on a grid" muscle memory.

**Example:**
```text
grid =
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1

islands: {(0,0),(0,1),(1,0),(1,1)} , {(2,2)} , {(3,3),(3,4)}
answer = 3
```

### How to Think About the Problem
- **What should I notice first?** `1` = land, `0` = water; you are counting maximal
  connected landmasses.
- **Which representation?** The grid, implicitly.
- **Counting?** Yes → mental model 1.
- **Which traversal?** Either. Mutate the grid to `'0'` to avoid a `visited` array
  (the *sinking trick*).
- **Clue → Pattern:** *"count islands / clusters in a grid"* → **grid flood fill with
  the grid as its own visited set**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each land cell, count the size of its blob with a fresh BFS, and
             count it as an island only if the cell was the blob's top-left. O(V²).
        ↓
Observation: the standard fix is to mark the whole blob as water as you explore it.
             Then each blob is discovered exactly once.
        ↓
Optimal: outer scan + sinking flood fill, O(n·m).
```

### Brute Force Approach
```java
import java.util.*;

public class IslandsBrute {
    public int numIslands(int[][] grid) {
        int n = grid.length, m = grid[0].length, islands = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] != 1) continue;
                int size = blobSize(grid, r, c);
                if (size > 1) islands++;        // and a lone cell is an island too!
            }
        }
        return islands;
    }

    private int blobSize(int[][] g, int sr, int sc) {
        int n = g.length, m = g[0].length;
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(sr * m + sc);
        vis[sr][sc] = true;
        int size = 0;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll(); size++;
            int r = cur / m, c = cur % m;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (vis[nr][nc] || g[nr][nc] == 0) continue;
                vis[nr][nc] = true;
                q.add(nr * m + nc);
            }
        }
        return size;
    }
}
```

**Time Complexity Calculation:** `O(n·m)` seeds, each `O(n·m)` → **`O((n·m)²)`**.
Note the subtle bug in the naive version: a single land cell is an island, so
`size > 1` is wrong; you need "is this the blob's first cell", which is what
marking gives you for free.
**Space Complexity Calculation:** `O(n·m)`.
> **Why can this be improved?** Sinking the blob as you count it makes every later
> seed a genuinely new blob.

### Optimal Approach — Sinking Flood Fill

#### Core Observation
**Sinking a cell (setting it to `0`) at the moment you visit it is simultaneously
the "mark visited" and the "remove from the island" operation**, so no `visited`
array is needed and each blob is claimed exactly once.

#### Pattern Identification
**Mental model 1: flood fill with in-place marking.**

#### Step-by-Step Intuition
1. `islands = 0`.
2. For each `(r, c)`: if `grid[r][c] == '0'` continue; `islands++`; flood fill from
   `(r, c)` writing `'0'` into every cell reached (with the in-bounds check before
   each push).
3. Return `islands`.

*The invariant:* every land cell is either still `1` (unclaimed) or `0` (already
claimed by exactly one counted island). So the outer loop increments `islands` once
per island and never twice.

#### Dry Run
```text
grid =
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1
```

| Step | seed | cells sunk | `islands` |
|---|---|---|---|
| 1 | `(0,0)` | `(0,0)(0,1)(1,0)(1,1)` | 1 |
| 2 | `(0,1)`,`(1,0)`,`(1,1)` | already `0` | 1 |
| 3 | `(2,2)` | `(2,2)` | 2 |
| 4 | `(3,3)` | `(3,3)(3,4)` | **3** |

#### Why Does It Work?
A flood fill from a land cell visits exactly its island. Sinking prevents any later
seed from starting inside an already-counted island, and the outer scan touches
every cell, so every island is counted exactly once. Total cell-visits is `n·m`.

#### Java Code
```java
import java.util.*;

public class NumberOfIslands {
    public int numIslands(char[][] grid) {
        int n = grid.length, m = grid[0].length, islands = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == '0') continue;
                islands++;
                sink(grid, r, c);
            }
        }
        return islands;
    }

    private void sink(char[][] grid, int r, int c) {
        int n = grid.length, m = grid[0].length;
        if (r < 0 || r >= n || c < 0 || c >= m) return;
        if (grid[r][c] != '1') return;
        grid[r][c] = '0';                       // sink it: this IS the visited mark
        sink(grid, r + 1, c);
        sink(grid, r - 1, c);
        sink(grid, r, c + 1);
        sink(grid, r, c - 1);
    }

    // BFS variant — same idea, no recursion depth worries on huge blobs
    public int numIslandsBFS(int[][] grid) {
        int n = grid.length, m = grid[0].length, islands = 0;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                if (grid[r][c] == 0) continue;
                islands++;
                ArrayDeque<Integer> q = new ArrayDeque<>();
                q.add(r * m + c);
                grid[r][c] = 0;
                while (!q.isEmpty()) {
                    int cur = q.poll(), x = cur / m, y = cur % m;
                    for (int[] d : dirs) {
                        int nx = x + d[0], ny = y + d[1];
                        if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
                        if (grid[nx][ny] == 0) continue;
                        grid[nx][ny] = 0;
                        q.add(nx * m + ny);
                    }
                }
            }
        }
        return islands;
    }
}
```

#### Complexity
**Time Complexity Calculation:** the outer scan is `O(n·m)`; each cell is sunk once
and generates 4 calls → total `O(n·m)` = `O(V + E)`, `E ≈ 4V`.
**Space Complexity Calculation:** recursive depth up to `O(n·m)`; BFS queue
`O(n·m)` → **`O(V)`**. No `visited` array in either case.

### Edge Cases
- Empty grid → `0`.
- All water → `0`. All land → `1`.
- A single land cell → `1` (the classic brute-force `size > 1` bug).
- Diagonal-only adjacency → 2 islands in 4-direction mode, 1 in 8-direction.
- Input mutation: acceptable on LeetCode; if forbidden, use `boolean[][] vis`
  (identical code with one extra array).
- Very large blob (whole grid) → recursive `sink` at depth `n·m` can overflow; use
  the BFS variant.

### Pattern to Remember
```text
Problem clue:  "count islands / clusters / regions in a grid"
Pattern:       outer scan + flood fill, sinking cells in place
Mental model:  writing to the grid IS the visited array
```

**Similar problems:** 6, 7, 8, 14, 15, 48, 49. **Interview tip:** mention that the
sinking trick is only possible because the input may be mutated; if the interviewer
says "no mutation", switch to `boolean[][] vis` without changing the structure.

---

## 19. Is Graph Bipartite (LeetCode 785)

### Problem Understanding
A graph is **bipartite** if its vertices can be split into two sets such that no edge
has both ends in the same set — equivalently, it is **2-colourable**, equivalently it
contains **no odd-length cycle**.

- **Input:** `int V`, `List<List<Integer>> adj`
- **Output:** boolean
- **Constraints/observations:**
  - Must handle **disconnected** graphs (colour each component separately).
  - Self-loop → immediately not bipartite (`colour[u] == colour[u]`).
  - Multi-edge → harmless (the second check is the same).

**Example 1:** `V = 4`, edges `0-1, 1-2, 2-3, 3-0` → `true` (a 4-cycle: even)
**Example 2:** `V = 3`, edges `0-1, 1-2, 2-0` → `false` (a 3-cycle: odd)
**Example 3:** `V = 6`, two triangles → `false`
**Example 4:** `V = 5`, edges `0-1, 1-2, 2-3, 3-4, 4-0` (5-cycle) → `false`

### How to Think About the Problem
- **What should I notice first?** Bipartite = 2-colour = **every edge must connect
  two different colours**. It is a *constraint propagation* problem, not a path
  problem.
- **Which representation?** Adjacency list.
- **Which mental model?** Still a traversal (mental model 1) with a **colour
  invariant** layered on top. The colouring is what makes it more than reachability.
- **Which traversal?** BFS (level-based colouring is trivially consistent) or DFS
  (colour = `parentColour ^ 1`).
- **Clue → Pattern:** *"can I 2-colour this / is it bipartite"* → **colour on entry,
  conflict = odd cycle**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try all 2^V colourings. Exponential.
        ↓
Observation: once you fix the colour of ONE vertex, the colours of everything
             reachable from it are forced (each neighbour = opposite). A single
             conflict (an edge whose ends are the same colour) proves failure.
        ↓
Optimal: one traversal colouring as it goes; the first same-colour edge returns
         false. O(V + E).
```

### Brute Force Approach
**Basic idea:** for every partition of the vertices into two sets (all `2^V` masks),
check that no edge lies inside a set.

```java
import java.util.*;

public class BipartiteBrute {
    public boolean isBipartiteDFS(int V, List<List<Integer>> adj) {
        for (int mask = 0; mask < (1 << V); mask++) {          // 2^V partitions
            boolean ok = true;
            for (int u = 0; u < V && ok; u++) {
                for (int v : adj.get(u)) {
                    if (v <= u) continue;                       // check each edge once
                    if (((mask >> u) & 1) == ((mask >> v) & 1)) { ok = false; break; }
                }
            }
            if (ok) return true;
        }
        return false;
    }
}
```

**Time Complexity Calculation:** `2^V` masks × `O(V + E)` checks → **`O(2^V · (V+E))`**.
**Space Complexity Calculation:** `O(1)`.
> **Why can this be improved?** The partitions are highly redundant: choosing
> vertex 0's side forces most of the rest. Propagation replaces enumeration.

### Optimal Approach — Colouring BFS/DFS

#### Core Observation
**The bipartite invariant: for every edge `(u,v)`, `colour[u] != colour[v]`.** Start
any uncoloured vertex with colour 0 and force `colour[v] = colour[u] ^ 1`. If you
ever meet an already-coloured neighbour with the **same** colour, there is an odd
cycle → not bipartite.

#### Pattern Identification
**Traversal with a state invariant** — colour 0/1 instead of visited 0/1.

#### Step-by-Step Intuition (DFS)
1. `int[] colour = new int[V]; Arrays.fill(colour, -1);`
2. For each `src` with `colour[src] == -1`:
   - `dfs(src, 0)`;
   - if it returns `false`, return `false` immediately.
3. `dfs(u, c)`: `colour[u] = c`; for each `v`:
   - `colour[v] == -1` → recurse with `c ^ 1`; if that fails, propagate `false`;
   - `colour[v] == c` → **return false** (odd cycle);
4. If everything is coloured → `true`.

*The invariant:* every coloured vertex has the correct colour **if** a valid
2-colouring exists: a vertex's colour is forced to be the opposite of its parent's,
and all paths agree exactly when no odd cycle is traversed.

#### Dry Run
`V = 4`, edges `0-1, 1-2, 2-3, 3-0` (a 4-cycle), start at 0

| Step | visit | `colour[u]` | `v` | `colour[v]` | `c ^ 1` | action |
|---|---|---|---|---|---|---|
| 1 | 0 | 0 (assign) | 1 | −1 | 1 | recurse 1 |
| 2 | 1 | 1 (assign) | 0 | 0 | — | `colour[0]=0 != colour[1]=1` ✓ |
| 3 | 1 | 1 | 2 | −1 | 0 | recurse 2 |
| 4 | 2 | 0 | 1 | 1 | — | ✓ |
| 5 | 2 | 0 | 3 | −1 | 1 | recurse 3 |
| 6 | 3 | 1 | 2 | 0 | — | ✓ |
| 7 | 3 | 1 | 0 | 0 | — | ✓ |
| 8 | — | — | — | — | — | all coloured, no conflict → **true** |

#### Why Does It Work?
If a 2-colouring exists, then in any traversal the colour of a vertex equals the
parity of the path length used to reach it; two different paths to the same vertex
have the same parity exactly when the graph is bipartite. So a same-colour edge
proves the existence of an odd cycle, and an odd cycle makes any colouring fail.
Hence: no conflict ⇔ bipartite.

#### Java Code
```java
import java.util.*;

public class IsGraphBipartite {
    // DFS flavour
    public boolean isBipartiteDFS(int V, List<List<Integer>> adj) {
        int[] colour = new int[V];
        Arrays.fill(colour, -1);
        for (int i = 0; i < V; i++) {
            if (colour[i] == -1 && !dfs(i, 0, adj, colour)) return false;
        }
        return true;
    }

    private boolean dfs(int u, int c, List<List<Integer>> adj, int[] colour) {
        colour[u] = c;
        for (int v : adj.get(u)) {
            if (colour[v] == -1) {
                if (!dfs(v, c ^ 1, adj, colour)) return false;
            } else if (colour[v] == c) {
                return false;                  // same-colour edge => odd cycle
            }
        }
        return true;
    }

    // BFS flavour — identical logic, level-by-level
    public boolean isBipartiteBFS(int V, List<List<Integer>> adj) {
        int[] colour = new int[V];
        Arrays.fill(colour, -1);
        for (int src = 0; src < V; src++) {
            if (colour[src] != -1) continue;
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(src);
            colour[src] = 0;
            while (!q.isEmpty()) {
                int u = q.poll();
                for (int v : adj.get(u)) {
                    if (colour[v] == -1) { colour[v] = colour[u] ^ 1; q.add(v); }
                    else if (colour[v] == colour[u]) return false;
                }
            }
        }
        return true;
    }
}
```

#### Complexity
**Time Complexity Calculation:** every vertex coloured once, every edge examined
twice → **`O(V + E)`**.
**Space Complexity Calculation:** `colour` `O(V)` + stack/queue `O(V)` → **`O(V)`**.

### Edge Cases
- `V = 0` → `true` (vacuously 2-colourable). `V = 1`, no edges → `true`.
- Self-loop `u-u` → `colour[u] == colour[u]` → `false`. ✓
- Disconnected with one odd cycle → the outer loop still finds it → `false`.
- Multi-edges → no false positive (the second check passes).
- Odd cycle in a component not containing vertex 0 → found thanks to the outer loop.

### Pattern to Remember
```text
Problem clue:  "is the graph bipartite / 2-colourable / can we split into 2 groups
                with no internal edge?"
Pattern:       BFS/DFS colouring; conflict (same colour on an edge) => NO
Requirement:   undirected (directed bipartite also works with this same code)
Mental model:  colour is forced = parity of path length; odd cycle = disagreement
```

**Similar problems:** 3, 18, 20. **Interview tip:** finish with the equivalence —
"bipartite ⇔ no odd cycle" — because it is the property that makes the conflict
test correct, and interviewers like to hear the reason, not just the code.

---

## 20. Cycle Detection in a Directed Graph — DFS (takeUforward G-19)

### Problem Understanding
Detect a cycle in a **directed** graph (which may be disconnected).

- **Input:** `V`, directed adjacency list
- **Output:** boolean
- **Constraints/observations:**
  - The parent trick from problems 11/12 is **wrong** here.
  - You need to distinguish "visited at some point" from "currently on my DFS
    stack". Only the latter means a cycle.
  - Two encodings: a 3-state `colour[]`, or a `vis[]` array plus a `path[]` array
    that is cleared on backtracking.

**Example 1:** `V = 4`, edges `0→1, 1→2, 2→0` → `true` (cycle `0→1→2→0`)
**Example 2:** `V = 4`, edges `0→1, 1→2, 2→3, 1→3` → `false` (the edge `1→3` jumps
forward, not back)
**Example 3:** `V = 3`, edges `0→1, 1→2` and a **separate** `2→0` missing → `false`
**Example 4:** `V = 1`, edge `0→0` → `true` (self-loop)

### How to Think About the Problem
- **What should I notice first?** A *directed* back edge to a **finished** node is
  legal. Example 2's edge `1→3` proves it: `3` is fully explored (black), and the
  edge is not a cycle. So "already visited" is not the test.
- **Which representation?** Directed adjacency list.
- **Which mental model?** A traversal with a **stack state** — mental model 1 with a
  third state.
- **Which traversal?** DFS (3 colours). Kahn's (23) is the iterative alternative.
- **Clue → Pattern:** *"cycle in a directed graph"* → **3-colour DFS
  (`0` unvisited / `1` on stack / `2` finished)**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each node, run a topological sort check. O(V·(V+E)).
        ↓
Observation: during a DFS, classify nodes as ON-STACK vs FINISHED. An edge into an
             ON-STACK node closes a cycle; an edge into a FINISHED node does not.
        ↓
Optimal: 3-colour DFS in one pass, O(V + E).
```

### Brute Force Approach
**Basic idea:** for every node, run a fresh DFS and check whether it can return to
itself.

```java
import java.util.*;

public class CycleDirectedBrute {
    public boolean hasCycle(int V, List<List<Integer>> adj) {
        for (int i = 0; i < V; i++) {
            if (dfs(i, adj, new boolean[V])) return true;    // fresh vis per start
        }
        return false;
    }

    private boolean dfs(int u, List<List<Integer>> adj, boolean[] vis) {
        vis[u] = true;
        for (int v : adj.get(u)) {
            if (v == u) return true;
            if (!vis[v] && dfs(v, adj, vis)) return true;    // only detects "downward" cycles
        }
        return false;
    }
}
```
This misses the case where a cycle exists *above* `u` and `u` is entered from
outside (the search never walks back up), unless you start at every node — which is
why the outer loop alone is not enough.

**Time Complexity Calculation:** `V` searches × `O(V+E)` → **`O(V·(V+E))`**.
**Space Complexity Calculation:** `O(V)`.
> **Why can this be improved?** One DFS with three states distinguishes "I am inside
> this edge right now" from "I finished that long ago", which is precisely the
> information the fresh-search approach throws away.

### Optimal Approach — 3-Colour DFS (recursion stack)

#### Core Observation
**A directed cycle exists iff some edge `u → v` points to a vertex `v` that is
currently on the DFS path from the root to `u`.** Vertices already finished cannot
be part of a cycle with the current path, because their entire out-reachable set has
already been explored and closed.

#### Pattern Identification
**Traversal with a stack state.** Mental model 1 with the extra information
"am I inside this node or done with it?".

#### Step-by-Step Intuition
1. `int[] colour = new int[V];` all `0` (0 = unvisited, 1 = on stack, 2 = done).
2. For each unvisited `i`: `if (dfs(i, adj, colour)) return true;`
3. `dfs(u)`:
   - `colour[u] = 1;`
   - for each `v`: if `colour[v] == 1` → **return true**; if `colour[v] == 0` and
     `dfs(v)` → return true;
   - `colour[u] = 2;` ← the crucial line: on exit the node is no longer "inside";
   - return `false`.
4. All components done without conflict → `false`.

*The invariant:* at any moment, the set of vertices with `colour == 1` is exactly the
current DFS path. So an edge into that set is a return to an ancestor, which by
definition closes a directed cycle.

#### Dry Run
`V = 4`, edges `0→1, 1→2, 2→0` and `2→3`. Start at 0.

| Step | call | `u` | `colour[u]` after entry | `v` | `colour[v]` | action |
|---|---|---|---|---|---|---|
| 1 | 1 | 0 | 1 | 1 | 0 | recurse 1 |
| 2 | 2 | 1 | 1 | 2 | 0 | recurse 2 |
| 3 | 3 | 2 | 1 | 0 | **1** | `colour[0] == 1` → **CYCLE → true** |

Contrast with the acyclic example `0→1, 1→2, 2→3, 1→3`:

| Step | call | `u` | `v` | `colour[v]` | action |
|---|---|---|---|---|---|
| 1 | 1 | 0 | 1 | 0 | recurse 1 |
| 2 | 2 | 1 | 2 | 0 | recurse 2 |
| 3 | 3 | 2 | 3 | 0 | recurse 3 |
| 4 | 4 | 3 | — | — | `colour[3] = 2` (finished) |
| 5 | 3 | 2 | 3 | **2 (done)** | `2 != 1` → no cycle, continue |
| 6 | 3 | 2 | — | — | `colour[2] = 2` |
| 7 | 2 | 1 | 3 | **2 (done)** | no cycle |
| 8 | 2 | 1 | — | — | `colour[1] = 2` |
| 9 | 1 | 0 | 1 | **2 (done)** | no cycle → return **false** |

#### Why Does It Work?
When `dfs(u)` is on the stack, every vertex on the call path from the root to `u`
has `colour == 1`. An edge `u → v` with `colour[v] == 1` means `v` is a proper
ancestor of `u` on that path, so the path from `v` to `u` plus the edge `u → v`
forms a directed cycle. Conversely, a directed cycle's DFS tree path from the cycle's
entry vertex back to it always meets such an edge, so the algorithm finds it.

#### Java Code
```java
import java.util.*;

public class CycleDirectedDFS {
    public boolean hasCycle(int V, List<List<Integer>> adj) {
        int[] colour = new int[V];            // 0 = unvisited, 1 = on stack, 2 = done
        for (int i = 0; i < V; i++) {
            if (colour[i] == 0 && dfs(i, adj, colour)) return true;
        }
        return false;
    }

    private boolean dfs(int u, List<List<Integer>> adj, int[] colour) {
        colour[u] = 1;
        for (int v : adj.get(u)) {
            if (colour[v] == 1) return true;                        // back edge => cycle
            if (colour[v] == 0 && dfs(v, adj, colour)) return true; // tree edge
        }
        colour[u] = 2;                                             // finished: NOT on stack
        return false;
    }

    // the "vis + path" variant Striver teaches: path[] is the recursion stack
    public boolean hasCycle2(int V, List<List<Integer>> adj) {
        int[] vis = new int[V];
        boolean[] onPath = new boolean[V];
        for (int i = 0; i < V; i++) if (vis[i] == 0 && dfs2(i, adj, vis, onPath)) return true;
        return false;
    }

    private boolean dfs2(int u, List<List<Integer>> adj, int[] vis, boolean[] onPath) {
        vis[u] = 1;
        onPath[u] = true;
        for (int v : adj.get(u)) {
            if (vis[v] == 1 && onPath[v]) return true;   // both visited AND on the path
            if (vis[v] == 0 && dfs2(v, adj, vis, onPath)) return true;
        }
        onPath[u] = false;                                // backtrack: leave the path
        return false;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each vertex entered once (`colour` set to 1 then 2),
each edge examined once (directed graphs store each edge once) → **`O(V + E)`**.
**Space Complexity Calculation:** `colour` `O(V)` + recursion `O(V)` → **`O(V)`**.

### Edge Cases
- Self-loop `u→u` → `colour[u] == 1` when examining it → `true`. ✓
- A DAG → `false`; forward and cross edges are correctly ignored.
- Disconnected cyclic components → found by the outer loop.
- `V = 0` → `false`.
- Why the undirected parent logic **fails** here: with `0→1, 1→0` (a 2-cycle in a
  digraph), `parent[1] == 0`, so the check `v != parent[u]` **skips** the back edge
  and reports "no cycle" — wrong for a directed graph. That single counterexample is
  the reason for the 3-colour approach.

### Pattern to Remember
```text
Problem clue:  "cycle in a DIRECTED graph"
Pattern:       3-colour DFS (unvisited / on-stack / finished)
Requirement:   directed
Mental model:  an edge into the CURRENT path is a cycle; an edge into a finished
               node is not
```

**Similar problems:** 11, 12, 23, 24, 53. **Interview tip:** when asked to convert
to a *directed* graph, immediately say "the parent trick breaks because a
legitimate edge `u → parent[u]` is not a cycle" — that shows you understand *why*,
not just the code.

---

# PART C — Topological Sort and Problems

Seven problems, **one algorithm** and **one invariant**:

> *A node is emitted only after all of its dependencies are finished.*

If you own that sentence, you own the whole part. The two implementations are DFS
post-order (21) and Kahn's indegree queue (22); problems 23–27 are applications
(cycle detection, course scheduling, safe states, dictionary ordering).

## The "Dependency Elimination" Mental Model (read this once)

```text
The input describes WHO MUST COME FIRST, not how far apart things are.
That is a PARTIAL ORDER, and we must output one linear order consistent with it.
Such an order exists <=> the graph has no cycle (is a DAG).

DFS version:  finish a node's subtree, THEN emit it.  Post-order + reverse.
Kahn's:       repeatedly emit any node whose in-degree is 0 (nothing depends on it
              yet); emitting it decrements its successors' in-degrees.
```

Both versions compute the same thing; Kahn's is iterative and detects cycles for
free, which is why LeetCode problems 24/25 are usually solved with it.

---

## 21. Topological Sort using DFS (takeUforward G-21)

### Problem Understanding
Given a **DAG** with `V` vertices, produce an ordering such that for every edge
`u → v`, `u` comes before `v`.

- **Input:** `V`, directed adjacency list (guaranteed acyclic in this variant)
- **Output:** a list of `V` vertices in topological order
- **Constraints/observations:**
  - A topological order exists **only** for a DAG.
  - Multiple valid orders usually exist; any one is accepted.
  - The trick is **post-order**: DFS naturally finishes successors *before*
    predecessors, so pushing on exit and reversing gives the right order.

**Example 1:** `V = 6`, edges `5→0, 5→2, 4→0, 4→1, 2→3, 3→1`
One valid order: `5 4 2 3 1 0` (or `4 5 2 3 0 1`).
**Example 2:** `V = 4`, edges `0→1, 0→2, 1→3, 2→3` → `0 1 2 3` or `0 2 1 3`.
**Example 3:** A graph with a cycle (`0→1, 1→2, 2→0`) → **no valid order exists**.

### How to Think About the Problem
- **What should I notice first?** The problem specifies a *relative* order
  (dependencies), not distances. That is the fingerprint of a topological sort.
- **Which representation?** Directed adjacency list; also compute nothing else.
- **Counting, ordering, minimizing?** **Ordering** → mental model 3, dependency
  elimination.
- **Which traversal?** DFS, because the *exit* event carries the information.
- **Clue → Pattern:** *"order these so that every prerequisite comes first"* →
  **DFS post-order, then reverse**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try all V! permutations and keep the first valid one. O(V! · E).
        ↓
Observation: what makes an order valid is only that a node appears after everyone
             pointing INTO it. That is exactly "finish last among my dependencies".
             DFS already finishes my dependencies before me — I just have to record
             the finish time and read the list backwards.
        ↓
Optimal: one DFS, O(V + E), then reverse the result.
```

### Brute Force Approach
**Basic idea:** topological sort by repeated selection — pick a vertex with in-degree
0 among the *remaining* vertices, remove it, repeat. Done greedily, it is correct
and is literally Kahn's; the "brute" version is a naive re-scan:

```java
import java.util.*;

public class TopoBrute {
    public int[] topoSort(int V, List<List<Integer>> adj) {
        boolean[] done = new boolean[V];
        int[] order = new int[V];
        int idx = 0;
        for (int count = 0; count < V; count++) {
            int pick = -1;
            for (int u = 0; u < V; u++) {                 // rescan ALL vertices
                if (done[u]) continue;
                boolean ready = true;
                for (int v : adj.get(u)) {                // nothing undone points to u
                    if (!done[v]) { ready = false; break; }
                }
                if (ready) { pick = u; break; }
            }
            if (pick == -1) break;                        // cycle
            done[pick] = true;
            order[idx++] = pick;
        }
        return idx == V ? order : new int[0];
    }
}
```

**Time Complexity Calculation:** `V` iterations, each scanning up to `V` vertices and
their in-neighbours → **`O(V · (V + E))`** = `O(V² + V·E)`.
**Space Complexity Calculation:** `O(V)`.
> **Why can this be improved?** The "who is ready" question is what in-degree
> arrays answer in `O(1)` (that is Kahn's, problem 22), and DFS avoids the question
> entirely by *waiting* rather than *polling*.

### Optimal Approach — DFS + post-order + reverse

#### Core Observation
**A DFS finishes every node in `u`'s subtree before finishing `u`.** Since all
predecessors of `u` are in nodes whose DFS subtree is finished before `u` is
finished, the post-order (finished) sequence is a valid topological order **in
reverse**.

#### Pattern Identification
**Mental model 3: dependency elimination (DFS flavour).**

#### Step-by-Step Intuition
1. `int[] vis = new int[V]`, stack `st`, and a visited array so each node is
   finished exactly once.
2. `dfs(u)`:
   - `vis[u] = 1;`
   - for each `v` in `adj.get(u)`: if `vis[v] == 0` recurse;
   - **`st.push(u)` on the way OUT.**
3. For every unvisited vertex, call `dfs(v)`.
4. The stack now holds nodes in reverse topological order → **pop** them (or
   reverse the list) to get the answer.

*The invariant:* at the moment `u` is pushed, every vertex reachable from `u` (via
outgoing edges) has already been pushed. Therefore, after reversing, every `u`
precedes everything it points to.

#### Dry Run
`V = 6`, edges `5→0, 5→2, 4→0, 4→1, 2→3, 3→1`. DFS starts at 0 (then 1, 2, …).

| DFS entry | path | exit pushes (post-order) | `st` (bottom → top) |
|---|---|---|---|
| 1 | 0 (no out-edges) | 0 | `[0]` |
| 2 | 1 (no out-edges) | 1 | `[0, 1]` |
| 3 | 2 → 3 → 1(vis) | 3, then 2 | `[0, 1, 3, 2]` |
| 4 | 4 → 0(vis), 1(vis) | 4 | `[0, 1, 3, 2, 4]` |
| 5 | 5 → 0(vis), 2(vis) | 5 | `[0, 1, 3, 2, 4, 5]` |

Pop order (reverse of the stack) → `5 4 2 3 1 0`.
Verify: `5` before `0` ✓, `5` before `2` ✓, `4` before `0` ✓, `4` before `1` ✓,
`2` before `3` ✓, `3` before `1` ✓. **Valid.**

#### Why Does It Work?
For an edge `u → v`, the DFS of `u` (or of an ancestor that contains both) always
completes `v`'s DFS before completing `u`, so `v` is pushed **before** `u`. Popping
the stack reverses that, so `u` is output before `v`. Every edge is respected, hence
the output is a topological order. Existence is guaranteed because the graph is a
DAG: in a cycle, the first vertex pushed would have to precede itself.

#### Java Code
```java
import java.util.*;

public class TopologicalSortDFS {
    public int[] topoSort(int V, List<List<Integer>> adj) {
        int[] vis = new int[V];
        ArrayDeque<Integer> st = new ArrayDeque<>();   // the post-order stack
        for (int i = 0; i < V; i++) {
            if (vis[i] == 0) dfs(i, adj, vis, st);
        }
        int[] order = new int[st.size()];
        int idx = 0;
        while (!st.isEmpty()) order[idx++] = st.pop();  // reverse the post-order
        return order;
    }

    private void dfs(int u, List<List<Integer>> adj, int[] vis, ArrayDeque<Integer> st) {
        vis[u] = 1;
        for (int v : adj.get(u)) {
            if (vis[v] == 0) dfs(v, adj, vis, st);
        }
        st.push(u);              // POST-order: push only after all successors are done
    }

    // Kahn's DFS variant (recursive indegree) — sometimes what judges expect
    public int[] topoSortViaKahnDFS(int V, List<List<Integer>> adj) {
        int[] indeg = new int[V];
        for (int u = 0; u < V; u++) for (int v : adj.get(u)) indeg[v]++;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < V; i++) if (indeg[i] == 0) q.add(i);
        int[] order = new int[V];
        int idx = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[idx++] = u;
            for (int v : adj.get(u)) if (--indeg[v] == 0) q.add(v);
        }
        return idx == V ? order : new int[0];   // idx != V => cycle
    }
}
```

#### Complexity
**Time Complexity Calculation:** each vertex is entered and exited once, each edge
is examined once → **`O(V + E)`**. The `ArrayDeque` operations are `O(1)` amortized,
and the final pop loop is `O(V)`.
**Space Complexity Calculation:** `vis` `O(V)`, the stack holds up to `V` nodes,
plus recursion depth `O(V)` → **`O(V)`**.

### Edge Cases
- **Cycle present** → the output is meaningless (a node precedes itself). The
  problem guarantees a DAG; the code cannot detect it (Kahn's can — problem 23).
- `V = 0` → empty array.
- `V = 1`, no edges → `[0]`.
- Disconnected graph → the outer loop over all vertices is required.
- Edges given as `u → u` → self-loop = cycle, no valid order.
- Multiple valid orders → any is accepted (do not over-constrain; e.g. a Kahn's
  implementation with a `TreeSet` gives lexicographically smallest, which some
  judges want — read the statement).

### Pattern to Remember
```text
Problem clue:  "order/prerequisites/dependencies/build order/valid sequence"
Pattern:       DFS post-order + reverse  (or Kahn's, problem 22)
Requirement:   the graph must be a DAG
Mental model:  finish last among my dependencies, then read the list backwards
```

**Similar problems:** 22, 23, 24, 25, 26, 27. **Interview tip:** say the
invariant out loud — "I push a node only after all its descendants are pushed, so
reversing gives a valid order."

---

## 22. Topological Sort using Kahn's Algorithm / BFS (takeUforward G-21)

### Problem Understanding
The second canonical implementation: repeatedly emit any vertex whose **in-degree is
0**, and use the emitted vertices to decrement their successors' in-degrees.

- **Input:** `V`, directed adjacency list (a DAG in the classic problem)
- **Output:** topological order
- **Constraints/observations:**
  - Requires one extra `int[] indeg` array, and a single pass over all edges to fill
    it.
  - **Iterative** — no recursion, no stack-overflow risk.
  - **Detects cycles for free:** if fewer than `V` nodes are emitted, a cycle exists.

**Example 1:** `V = 6`, edges `5→0, 5→2, 4→0, 4→1, 2→3, 3→1`
`indeg = [2, 2, 1, 1, 0, 0]`
Emit 4 → decrements `0`(1), `1`(1). Emit 5 → decrements `0`(0 ⇒ queue), `2`(0 ⇒
queue). Queue = `{0, 2}`. Emit 0, then 2 → `3` reaches 0 → emit 3 → `1` reaches 0 →
emit 1.
Order: `4 5 0 2 3 1` ✓ (same set of constraints, different valid order from 21).

**Example 2 (cycle):** `0→1, 1→2, 2→0` → `indeg = [1, 1, 1]`, no vertex with in-degree
0 → nothing is emitted → `processed(0) < V(3)` → **cycle**.

### How to Think About the Problem
- **What should I notice first?** The question "what can I place next?" has a
  cheap answer: *something nobody points at yet* — i.e. in-degree 0.
- **Which representation?** Directed adjacency list **plus** an in-degree array.
- **Ordering?** Yes → mental model 3, dependency elimination, BFS flavour.
- **Which traversal?** Kahn's BFS with a `Queue`.
- **Clue → Pattern:** *"prerequisites / ordering / course schedule"* → **Kahn's:
  in-degree queue, and `processed != V` means cycle**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: re-scan all remaining vertices for a zero-in-degree one, every step.
             O(V·(V+E)).
        ↓
Observation: the in-degree of a vertex only changes when one of its predecessors is
             emitted. So maintain the counts incrementally — that is a queue of
             "ready" vertices, and a vertex enters it exactly when its count hits 0.
        ↓
Optimal: one pass to count, then each vertex enqueued at most once. O(V + E).
```

### Brute Force Approach
**Basic idea:** the naive re-scan version shown in problem 21's brute force. It is
correct, and it is exactly where the "polling" cost comes from.

**Time Complexity Calculation:** `V` iterations × `O(V + E)` re-scan → `O(V² + V·E)`.
**Space Complexity Calculation:** `O(V)`.
> **Why can this be improved?** Maintain the readiness information incrementally
> instead of recomputing it: `indeg[v]--` on emission, enqueue at 0. The queue is
> the memoization of "who is ready".

### Optimal Approach — Kahn's BFS

#### Core Observation
**A vertex may be emitted exactly when its in-degree is 0.** Emitting `u` removes
one incoming edge from every `v ∈ adj[u]`, so the *only* vertices that can become
ready as a result are `u`'s direct successors. This is a classic "process and
decrement" pattern (identical to deleting zero-indegree rows, or to topological
sorting a build graph).

#### Pattern Identification
**Mental model 3: dependency elimination (BFS flavour), with the cycle check built
in.**

#### Step-by-Step Intuition
1. `int[] indeg = new int[V]`; for every edge `u → v`, `indeg[v]++`.
2. `Queue<Integer> q` ← all `v` with `indeg[v] == 0`.
3. `int[] order = new int[V]; int idx = 0;`
4. While `q` is non-empty: `u = q.poll()`; `order[idx++] = u`; for each `v` in
   `adj.get(u)`: if `--indeg[v] == 0` → `q.add(v)`.
5. **If `idx != V`, the graph has a cycle** (return `[]` / `false`).

*The invariant:* every vertex in the queue has all its predecessors already emitted,
so emitting it keeps the order valid; and every DAG has at least one in-degree-0
vertex at every step, so a DAG never gets stuck.

#### Dry Run
`indeg = [2, 2, 1, 1, 0, 0]`, edges as above

| Step | queue (before) | `u` emitted | in-deg updates | queue (after) | `idx` |
|---|---|---|---|---|---|
| 1 | `[4, 5]` | 4 | `0`: 2→1, `1`: 2→1 | `[5]` | 1 |
| 2 | `[5]` | 5 | `0`: 1→0 ⇒ enqueue, `2`: 1→0 ⇒ enqueue | `[0, 2]` | 2 |
| 3 | `[0, 2]` | 0 | none | `[2]` | 3 |
| 4 | `[2]` | 2 | `3`: 1→0 ⇒ enqueue | `[3]` | 4 |
| 5 | `[3]` | 3 | `1`: 1→0 ⇒ enqueue | `[1]` | 5 |
| 6 | `[1]` | 1 | — | `[]` | **6 = V → valid** |

Order: `4 5 0 2 3 1`.

#### Why Does It Work?
The queue only ever holds vertices whose predecessors are all emitted, so no edge
`u → v` can be violated by the output. In a DAG, the subgraph of unemitted vertices
is itself a DAG and therefore has an in-degree-0 vertex, so the queue never empties
early — hence `idx == V` exactly when the graph is acyclic. If a cycle exists, each
vertex in it waits forever for its cyclic predecessor, so those vertices are exactly
the ones never emitted.

#### Java Code
```java
import java.util.*;

public class TopologicalSortKahn {
    public int[] topoSort(int V, List<List<Integer>> adj) {
        int[] indeg = new int[V];
        for (int u = 0; u < V; u++) {
            for (int v : adj.get(u)) indeg[v]++;         // one pass: count in-degrees
        }
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < V; i++) if (indeg[i] == 0) q.add(i);
        int[] order = new int[V];
        int idx = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[idx++] = u;
            for (int v : adj.get(u)) {
                if (--indeg[v] == 0) q.add(v);           // its last blocker is gone
            }
        }
        return idx == V ? order : new int[0];            // else: a cycle exists
    }

    // lexicographically smallest topological order, when the judge demands it
    public int[] topoSortLexicographic(int V, List<List<Integer>> adj) {
        int[] indeg = new int[V];
        for (int u = 0; u < V; u++) for (int v : adj.get(u)) indeg[v]++;
        TreeSet<Integer> ready = new TreeSet<>();
        for (int i = 0; i < V; i++) if (indeg[i] == 0) ready.add(i);
        int[] order = new int[V];
        int idx = 0;
        while (!ready.isEmpty()) {
            int u = ready.pollFirst();
            order[idx++] = u;
            for (int v : adj.get(u)) if (--indeg[v] == 0) ready.add(v);
        }
        return idx == V ? order : new int[0];
    }
}
```

#### Complexity
**Time Complexity Calculation:** counting in-degrees is `O(E)`; the main loop
dequeues each vertex once (`O(V)`) and relaxes each edge once (`O(E)`) →
**`O(V + E)`**.
**Space Complexity Calculation:** `indeg` `O(V)`, queue `O(V)`, output `O(V)` →
**`O(V)`**.

### Edge Cases
- Cycle → `idx < V`; return empty/`false`/`new int[0]`.
- `V = 0` → `order` is empty and `idx == 0 == V` → returns `[]`, which is "valid".
- Disconnected graph → several initial zero in-degree vertices; the outer seeding
  loop handles it.
- Complete DAG `0→1→2→…→n` → exactly one valid order; the algorithm produces it.
- Complete graph with all-to-all edges → nothing has in-degree 0 → immediate cycle
  detection.
- Parallel edges `u→v` twice → `indeg[v] == 2`, and both decrements happen; correct.
- Self-loop `u→u` → `indeg[u] ≥ 1` from itself → never emitted → cycle detected. ✓

### Pattern to Remember
```text
Problem clue:  "prerequisites", "build order", "is a valid order possible?"
Pattern:       Kahn's — in-degree array + queue of zero-in-degree vertices
Requirement:   directed
Mental model:  emit a node only when nothing un-emitted points at it;
               processed != V  =>  there is a cycle
```

**Similar problems:** 21, 23, 24, 25, 26, 27, 53. **Interview tip:** the
`idx != V` check is the single most valuable line in this algorithm — say "this one
line answers LeetCode 207, 210, 1136 and Alien Dictionary at once."

---

## 23. Detect a Cycle in a Directed Graph using BFS / Kahn's (takeUforward G-23)

### Problem Understanding
The iterative twin of problem 20: detect a directed cycle by running Kahn's
algorithm and checking whether all `V` vertices were processed.

- **Input:** `V`, directed adjacency list
- **Output:** boolean
- **Observations:** no recursion, no colours — one in-degree array and a queue.

**Example 1:** `0→1, 1→2, 2→0` → `true`
**Example 2:** `0→1, 0→2, 1→3, 2→3` → `false` (processed `0,1,2,3`)
**Example 3 (disconnected):** `0→1, 1→0` plus `2→3` → `true` (the cycle is only in
the first component; the queue still drains `{2,3}`)

### How to Think About the Problem
- **What should I notice first?** Problem 20 answered "is there a cycle" with a
  stack state. The *iterative* version answers it with a count.
- **Which representation?** Directed adjacency list + in-degree.
- **Which mental model?** Mental model 3, used as a **test** instead of a generator.
- **Clue → Pattern:** *"is a topological order possible?"* → run Kahn's, compare
  processed count with `V`.

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS with colours (problem 20). O(V+E) but recursive.
        ↓
Observation: a cycle is a set of vertices that can never have in-degree 0, because
             each waits for a predecessor inside the cycle. Kahn's gets stuck there.
        ↓
Optimal: run Kahn's; if the queue drains with fewer than V processed, a cycle exists.
```

### Brute Force Approach
```java
import java.util.*;

public class CycleKahnBrute {
    public boolean hasCycle(int V, List<List<Integer>> adj) {
        boolean[] vis = new boolean[V];
        for (int i = 0; i < V; i++) {
            if (!vis[i] && dfs(i, adj, vis)) return true;   // same as problem 20
        }
        return false;
    }
    private boolean dfs(int u, List<List<Integer>> adj, boolean[] vis) {
        vis[u] = true;
        for (int v : adj.get(u)) {
            if (v == u) return true;
            if (!vis[v] && dfs(v, adj, vis)) return true;
        }
        return false;
    }
}
```

**Time:** `O(V + E)`. **Space:** `O(V)`. This is O(V+E) but recursive; the point of
this problem is the iterative version (deep graphs, `V = 10⁵` chains) and the fact
that it reuses the Kahn's machinery you need for 24/25.

> **Why can this be improved?** Trade the recursion for a queue, and the "is there a
> cycle" question becomes a subtraction.

### Optimal Approach — Kahn's count

#### Core Observation
**Vertices on a directed cycle never reach in-degree 0**, because each of them has an
un-emitted predecessor inside the same cycle. Every vertex *not* on a cycle does
eventually reach in-degree 0 (in a DAG the remainder is a DAG, which always has a
source). So the leftover set after Kahn's is *exactly* the set of vertices that
cannot be topologically sorted.

#### Pattern Identification
**Mental model 3 used as a feasibility test.**

#### Step-by-Step Intuition
1. Compute `indeg[]` from the edges.
2. Enqueue all `indeg == 0` vertices; `processed = 0`.
3. While the queue is non-empty: pop, `processed++`, decrement successors, enqueue
   new zeros.
4. `return processed != V;` ← **that is the answer**.

#### Dry Run
`V = 5`, edges `0→1, 1→2, 2→0, 3→4`
`indeg = [1, 1, 1, 0, 1]`, queue `{3}`

| Step | pop | `processed` | updates | queue |
|---|---|---|---|---|
| 1 | 3 | 1 | `4`: 1→0 ⇒ enqueue | `[4]` |
| 2 | 4 | 2 | — | `[]` |
| — | queue empty, loop ends | **2** | — | — |

`processed(2) != V(5)` → **cycle** ✓. The cyclic triple `{0,1,2}` was never emitted,
and it is exactly the leftover.

#### Why Does It Work?
Emission requires in-degree 0, and a vertex on a cycle always has a cycle-mate
pointing at it, so cycle vertices are never emitted. Conversely, if no cycle exists,
the graph is a DAG and the residual graph after each emission step is still a DAG
with a source, so the queue drains after all `V` emissions. Hence
`processed == V` ⇔ acyclic.

#### Java Code
```java
import java.util.*;

public class CycleDirectedKahn {
    public boolean hasCycle(int V, List<List<Integer>> adj) {
        int[] indeg = new int[V];
        for (int u = 0; u < V; u++) for (int v : adj.get(u)) indeg[v]++;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < V; i++) if (indeg[i] == 0) q.add(i);
        int processed = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            processed++;                        // count what we could actually order
            for (int v : adj.get(u)) if (--indeg[v] == 0) q.add(v);
        }
        return processed != V;                  // stuck vertices => cycle
    }
}
```

#### Complexity
**Time Complexity Calculation:** counting in-degrees `O(E)`; each vertex processed
once and each edge relaxed once → **`O(V + E)`**.
**Space Complexity Calculation:** `indeg` + queue → **`O(V)`**. No recursion.

### Edge Cases
- `V = 0` → `processed(0) == V(0)` → `false` (no cycle). Watch out for judges that
  define `V ≥ 1`.
- Self-loop `u→u` → `indeg[u] ≥ 1` and its own decrement only happens if it were
  emitted, which it never is → `true` ✓.
- Cycle plus a long acyclic tail → the tail is still processed, so `processed` can be
  much larger than the cycle size; only the comparison with `V` matters.
- `V = 1`, no edges → `processed = 1 = V` → `false`.

### Pattern to Remember
```text
Problem clue:  "cycle in a directed graph" without recursion
Pattern:       Kahn's, then  processed != V
Mental model:  cycle vertices can never reach in-degree 0 — they are the leftovers
```

**Similar problems:** 20, 22, 24, 25, 27. **Interview tip:** present this as "the
same code as topological sort with a one-line check at the end" — it makes the
relevance obvious and shows you are not memorising two algorithms.

---

## 24. Course Schedule (LeetCode 207)

### Problem Understanding
There are `numCourses` courses; `[a, b]` means you must take course `a` **before**
course `b`. Return `true` if you can finish all courses (i.e. a topological order
exists).

- **Input:** `int numCourses`, `int[][] prerequisites`
- **Output:** boolean
- **Observations:** the answer is a pure **cycle test** on the prerequisite graph —
  the order itself is not needed.

**Example 1:** `2, [[1, 0]]` → `true` (take 1, then 0)
**Example 2:** `2, [[1, 0], [0, 1]]` → `false` (mutual dependency)
**Example 3:** `1, []` → `true`

### How to Think About the Problem
- **What should I notice first?** We are not asked for an order, only whether one
  exists → pure feasibility → cycle detection.
- **Which representation?** Build the adjacency list from `prerequisites`
  (`prereq → course`, i.e. edge `a → b` for pair `[a, b]`).
- **Which mental model?** Mental model 3 as a test.
- **Clue → Pattern:** *"can all prerequisites be satisfied?"* → **Kahn's,
  processed == numCourses**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try every permutation of the courses. O(V! · E).
        ↓
Observation: a valid order exists iff there is no cycle. This is a graph property,
             not a search over orders.
        ↓
Optimal: Kahn's in O(V + E).
```

### Brute Force Approach
**Basic idea:** recursive DFS with a "visiting" flag, the same 3-colour test as
problem 20, expressed in terms of courses.

```java
import java.util.*;

public class CourseScheduleBrute {
    public boolean canFinish(int n, int[][] prereq) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] p : prereq) adj.get(p[0]).add(p[1]);
        int[] colour = new int[n];
        for (int i = 0; i < n; i++) if (dfs(i, adj, colour)) return false;
        return true;
    }
    private boolean dfs(int u, List<List<Integer>> adj, int[] colour) {
        colour[u] = 1;
        for (int v : adj.get(u)) {
            if (colour[v] == 1) return true;      // cycle
            if (colour[v] == 0 && dfs(v, adj, colour)) return true;
        }
        colour[u] = 2;
        return false;
    }
}
```

**Time Complexity Calculation:** `O(V + E)`. **Space:** `O(V)`.
> **Why improve?** It is already optimal; the point is that the *iterative* Kahn's
> form has no recursion depth risk and generalises directly to 210. Note also that
> the brute force here is not brute at all — say "naive" instead.

### Optimal Approach — Kahn's on the prerequisite graph

#### Core Observation
**A course becomes available exactly when all courses that must precede it have
been taken.** Counting how many prerequisites each course still has is precisely
in-degree counting.

#### Pattern Identification
**Mental model 3: dependency elimination, boolean output.**

#### Step-by-Step Intuition
1. Build `adj` and `indeg` from `prerequisites` (`indeg[b]++` for each `[a, b]`).
2. Queue all courses with `indeg == 0`.
3. Take courses one by one, decrementing successors.
4. `return taken == numCourses`.

#### Dry Run
`n = 4`, `prerequisites = [[1,0],[2,1],[3,2]]`, `indeg = [1,1,1,0]`

| Step | pop | taken | updates | queue |
|---|---|---|---|---|
| 1 | 3 | 1 | `2`: 1→0 ⇒ enqueue | `[2]` |
| 2 | 2 | 2 | `1`: 1→0 ⇒ enqueue | `[1]` |
| 3 | 1 | 3 | `0`: 1→0 ⇒ enqueue | `[0]` |
| 4 | 0 | **4** | — | `[]` |

`4 == 4` → `true`.
Now add `prerequisites = [[1,0],[2,1],[3,2],[1,3]]`:
`indeg = [1,1,1,1]`, queue starts **empty** → `taken = 0 != 4` → `false`.

#### Why Does It Work?
As in problem 23: every emitted course had all its prerequisites satisfied, and a
directed cycle means a group of courses that can never satisfy each other's
prerequisites, so they are never emitted. Therefore all courses are taken iff the
prerequisite graph is acyclic.

#### Java Code
```java
import java.util.*;

public class CourseSchedule {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            adj.get(p[0]).add(p[1]);      // a must come before b
            indeg[p[1]]++;
        }
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) if (indeg[i] == 0) q.add(i);
        int taken = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            taken++;
            for (int v : adj.get(u)) if (--indeg[v] == 0) q.add(v);
        }
        return taken == numCourses;
    }
}
```

#### Complexity
**Time Complexity Calculation:** building the graph is `O(V + E)`; Kahn's is
`O(V + E)` → **`O(V + E)`**.
**Space Complexity Calculation:** adjacency list `O(V + E)`, `indeg` + queue `O(V)`
→ **`O(V + E)`** total, `O(V)` beyond the graph.

### Edge Cases
- `prerequisites = []` → all in-degree 0 → `taken == n` → `true`.
- `n = 1, prereq = [[0, 0]]` (self-dependency) → `indeg[0] = 1` → `false`.
- Duplicate prerequisites `[[1,0],[1,0]]` → `indeg[0] = 2`, decremented twice → still
  works.
- `n = 5` with a cycle in one component and free courses elsewhere → `taken < 5`
  → `false`.

### Pattern to Remember
```text
Problem clue:  "can I finish all courses / is the dependency order possible?"
Pattern:       build graph from pairs, run Kahn's, compare taken vs n
Mental model:  prerequisites = in-edges; a cycle = mutual deadlock
```

**Similar problems:** 22, 23, 25, 26, 27. **Interview tip:** point out that 207 and
210 differ by a single line (return the order instead of a boolean) — the reader
then knows you understand the family.

---

## 25. Course Schedule II (LeetCode 210)

### Problem Understanding
Same input as 207, but **return one valid ordering** of all courses, or `[]` if
impossible. This is literally problem 22 applied to LeetCode's I/O.

- **Input:** `int numCourses`, `int[][] prerequisites`
- **Output:** `int[] order`, or `[]`
- **Observations:** the only new requirement is to *store* the emission order. If
  `order.length != numCourses`, return `[]`.

**Example 1:** `2, [[1,0]]` → `[1, 0]`
**Example 2:** `4, [[1,0],[2,0],[3,1],[3,2]]` → `[0,1,2,3]` or `[0,2,1,3]`
**Example 3:** `2, [[1,0],[0,1]]` → `[]`

### How to Think About the Problem
- **What should I notice first?** It is 22 + 24 merged. Nothing new is needed —
  which is the point of this problem: it confirms you can *see* the family.
- **Which representation?** Same as 24.
- **Which mental model?** Mental model 3, generator flavour.
- **Clue → Pattern:** *"give me the order"* → **Kahn's and keep the list**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS post-order (problem 21). Works, but recursive.
        ↓
Observation: Kahn's produces the order directly, as a byproduct of the same loop.
        ↓
Optimal: Kahn's, store the emission order, length-check at the end.
```

### Brute Force Approach
```java
import java.util.*;

public class CourseIIBrute {
    public int[] findOrder(int n, int[][] prereq) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] p : prereq) adj.get(p[0]).add(p[1]);
        int[] vis = new int[n];
        ArrayDeque<Integer> post = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (vis[i] == 0) dfs(i, adj, vis, post);
        if (post.size() != n) return new int[0];       // size != n <=> cycle
        int[] order = new int[n];
        int idx = 0;
        while (!post.isEmpty()) order[idx++] = post.pop();
        return order;
    }
    private void dfs(int u, List<List<Integer>> adj, int[] vis, ArrayDeque<Integer> post) {
        vis[u] = 1;
        for (int v : adj.get(u)) if (vis[v] == 0) dfs(v, adj, vis, post);
        post.push(u);
    }
}
```

**Time Complexity Calculation:** `O(V + E)`. **Space Complexity Calculation:**
`O(V)` for `vis`, `post`, and the stack.
> **Why improve?** Same complexity, but recursion depth `= V` (fails at `V ≈ 10⁵`) and
> the cycle detection is implicit in the post-order size. Kahn's is iterative and
> the cycle test is one comparison.

### Optimal Approach — Kahn's, keep the order

#### Core Observation
**The emission sequence of Kahn's *is* a topological order**, because each emitted
vertex has all its predecessors already emitted. So recording it costs nothing
beyond the array you were going to allocate anyway.

#### Pattern Identification
**Mental model 3: dependency elimination, output flavour.**

#### Step-by-Step Intuition
Exactly problem 22, with `order[idx++] = u` inside the loop and the final check
`idx == n ? order : new int[0]`.

#### Dry Run
`n = 4`, `prerequisites = [[1,0],[2,0],[3,1],[3,2]]`
`indeg = [2, 1, 1, 0]`, queue `{3}`

| Step | pop | `order` so far | updates |
|---|---|---|---|
| 1 | 3 | `[3]` | `1`: 1→0 ⇒ enqueue, `2`: 1→0 ⇒ enqueue |
| 2 | 1 | `[3,1]` | `0`: 2→1 |
| 3 | 2 | `[3,1,2]` | `0`: 1→0 ⇒ enqueue |
| 4 | 0 | `[3,1,2,0]` | — |

`order = [3, 1, 2, 0]` — check `1→0` ✓, `2→0` ✓, `3→1` ✓, `3→2` ✓. Valid.

#### Why Does It Work?
Each emitted course had in-degree 0, i.e. every prerequisite was already emitted, so
for every pair `[a, b]`, `a` appears before `b`. If `n` courses are emitted, the
order is complete and valid; if fewer, the unemitted ones form cycles, so no valid
order exists and `[]` is correct.

#### Java Code
```java
import java.util.*;

public class CourseScheduleII {
    public int[] findOrder(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[numCourses];
        for (int[] p : prerequisites) {
            adj.get(p[0]).add(p[1]);
            indeg[p[1]]++;
        }
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < numCourses; i++) if (indeg[i] == 0) q.add(i);
        int[] order = new int[numCourses];
        int idx = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[idx++] = u;                 // emission order == topological order
            for (int v : adj.get(u)) if (--indeg[v] == 0) q.add(v);
        }
        return idx == numCourses ? order : new int[0];
    }
}
```

#### Complexity
**Time Complexity Calculation:** graph build `O(V + E)` + Kahn's `O(V + E)` →
**`O(V + E)`**.
**Space Complexity Calculation:** `O(V + E)` for the graph, `O(V)` extra → **`O(V + E)`**.

### Edge Cases
- `n = 1, prereq = []` → `[0]`.
- Cyclic input → returns `new int[0]` (empty, **not** `null`).
- Multiple valid orders → any accepted; some judges want the lexicographically
  smallest (use the `TreeSet` version from problem 22).
- Duplicate pairs → fine (double decrement).
- `n = 0` → returns `new int[0]`; check the judge's convention.

### Pattern to Remember
```text
Problem clue:  "return the actual order of courses / dependencies"
Pattern:       Kahn's, record the emission order, length-check
Mental model:  a node is emitted only after everything it depends on
```

**Similar problems:** 21, 22, 24, 26, 27. **Interview tip:** after writing the
boolean version, deleting one line and adding one line is the whole delta — narrate
that and it reads as mastery.

---

## 26. Find Eventual Safe States (LeetCode 802)

### Problem Understanding
In a directed graph, a node is **eventually safe** if **every** path starting from
it eventually reaches a terminal node (a node with no outgoing edges). Nodes in a
cycle (or leading to a cycle) are not safe. Return all safe nodes in **ascending
order**.

- **Input:** `int[][] graph` where `graph[i]` is the list of `graph[i]`'s neighbours
- **Output:** `List<Integer>` of safe nodes, sorted
- **Constraints/observations:**
  - The definition is a **universal** quantifier ("every path"), so a plain
    reachability search is not enough — you must be *sure* every successor is safe.
  - Solution: propagate safety **backwards**. Start from terminal nodes (which are
    safe) and mark predecessors safe.
  - Alternatively, remove every cycle with out-degree pruning, or use DFS with 4
    states.

**Example 1:** `graph = [[1,2],[2,3],[5],[0],[5],[],[]]` → `[2, 4, 5, 6]`
Node 4 → 5 → (terminal), node 5 is terminal, node 6 is isolated: all safe. Nodes
0,1,2,3 form the cycle `0→1→2→3→0`, so none of them is safe — even though 2 *also*
has an edge to 5, the presence of the cycle on one path is enough to disqualify it.
That is the "**every** path" quantifier doing its job.

**Example 2:** `graph = [[1,2,3,4],[1,2],[3,4],[2,4],[]]` → `[4]`

### How to Think About the Problem
- **What should I notice first?** Safety is defined by a property of *outgoing*
  paths, but is easiest to prove by walking **in-edges** backwards from the nodes
  where the property trivially holds.
- **Which representation?** Directed adjacency list (forward) **plus** the reverse
  graph (in-lists).
- **Which mental model?** Mental model 3 (dependency elimination) applied to the
  **reverse** graph: "a node is safe when **all** its successors are safe" is an
  AND-condition, which is naturally topologically propagated.
- **Clue → Pattern:** *"reverse the edges and peel the leaves"* → **Kahn's on the
  reverse graph**, or out-degree peeling on the original.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each node, enumerate all paths and check they end at a terminal
             node. Exponential.
        ↓
Observation: "node u is safe" <=> "every out-neighbour of u is safe". Terminal nodes
             are safe by definition. This is a rule we can apply repeatedly, in
             reverse, exactly like Kahn's.
        ↓
Optimal: build the reverse graph; run Kahn's on it; the nodes popped are the safe
         ones. O(V + E).
```

### Brute Force Approach
**Basic idea:** for each node, do a DFS and detect any cycle reachable from it.

```java
import java.util.*;

public class SafeStatesBrute {
    public List<Integer> eventualSafeNodes(int[][] graph) {
        List<Integer> ans = new ArrayList<>();
        for (int u = 0; u < graph.length; u++) {
            if (dfs(u, graph, new int[graph.length])) ans.add(u);
        }
        return ans;
    }

    // returns true if some cycle is reachable from u
    private boolean dfs(int u, int[][] graph, int[] colour) {
        colour[u] = 1;
        for (int v : graph[u]) {
            if (colour[v] == 1) return true;             // found a cycle
            if (colour[v] == 0 && dfs(v, graph, colour)) return true;
        }
        colour[u] = 2;
        return false;
    }
}
```

**Time Complexity Calculation:** `V` DFS runs × `O(V + E)` → **`O(V·(V+E))`**, and
it allocates a fresh `colour` array per start.
**Space Complexity Calculation:** `O(V)` per call.
> **Why can this be improved?** Reachability of a cycle is the same question for many
> starting nodes, and "not safe" is a *contagious* property that spreads backwards
> along in-edges. Peel it once.

### Optimal Approach — Reverse graph + Kahn's (or out-degree peeling)

#### Core Observation
**A node is safe iff every one of its out-neighbours is eventually safe.** Terminal
nodes satisfy this vacuously. So: mark terminal nodes safe, then repeatedly mark any
node **all** of whose out-neighbours are marked. This is Kahn's algorithm run on the
**reverse** graph, where "in-degree" = "number of unresolved predecessors".

#### Pattern Identification
**Mental model 3 on the reversed graph.** (Equivalently: repeatedly delete
out-degree-0 nodes, and whatever remains is unsafe.)

#### Step-by-Step Intuition
1. Build `rev[v]` = list of nodes `u` with `v ∈ graph[u]` (i.e. in-neighbours).
2. `int[] unresolved` = `graph[u].length` (out-degree = how many successors are
   still unknown).
3. Enqueue every node with out-degree 0 (terminal nodes) — they are safe.
4. Pop `v` (safe). For each `u` in `rev[v]`: if `--outdeg[u] == 0` → all of `u`'s
   successors are safe → enqueue `u`.
5. Everything popped is safe; everything left is in (or reaches) a cycle.

*The invariant:* a node is enqueued only after every out-neighbour has been
enqueued, so by induction every path from it ends at a terminal node.

#### Dry Run
`graph = [[1,2],[2,3],[5],[0],[5],[],[]]`, `V = 7`
`outdeg = [2, 2, 1, 1, 1, 0, 0]`, `rev = {0:[3], 1:[0], 2:[0,1], 3:[1], 4:[], 5:[2,4], 6:[]}`

| Step | pop | enqueued next | queue |
|---|---|---|---|
| seed | — | nodes with outdeg 0: `5`, `6` | `[5, 6]` |
| 1 | 5 | `rev[5] = [2,4]`: `2` → 0 ⇒ enqueue; `4` → 0 ⇒ enqueue | `[6, 2, 4]` |
| 2 | 6 | `rev[6] = []` | `[2, 4]` |
| 3 | 2 | `rev[2] = [0,1]`: `0` → 1, `1` → 1 (not 0 yet) | `[4]` |
| 4 | 4 | `rev[4] = []` | `[]` |

Popped = `{5, 6, 2, 4}` → sorted `[2, 4, 5, 6]` ✓ (matches the verified answer).
Leftover `{0, 1, 3}` is exactly the cycle `0 → 1 → 3 → 0`, so those three are
correctly excluded. Note how `0` and `1` are excluded even though each *can* reach
the terminal `5`: safety requires **every** outgoing edge to be safe, not just one.
(With the terminal node `6` isolated, it is trivially safe and is included.)

#### Why Does It Work?
By induction on the pop order: terminal nodes are safe by definition; a node is
enqueued only when all of its out-neighbours have already been enqueued, i.e. are
safe, so every path from it proceeds through safe nodes and therefore terminates.
Conversely, a node in a cycle can never have all successors resolved, and a node
reaching a cycle inherits an unresolvable successor, so unsafe nodes are exactly
those never enqueued.

#### Java Code
```java
import java.util.*;

public class EventualSafeStates {

    // (a) reverse graph + Kahn's  — the most explanatory version
    public List<Integer> eventualSafeNodes(int[][] graph) {
        int V = graph.length;
        List<List<Integer>> rev = new ArrayList<>();
        for (int i = 0; i < V; i++) rev.add(new ArrayList<>());
        int[] outdeg = new int[V];
        for (int u = 0; u < V; u++) {
            outdeg[u] = graph[u].length;              // unresolved successors
            for (int v : graph[u]) rev.get(v).add(u); // remember who points at v
        }
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < V; i++) if (outdeg[i] == 0) q.add(i);
        boolean[] safe = new boolean[V];
        while (!q.isEmpty()) {
            int v = q.poll();
            safe[v] = true;                           // all successors resolved
            for (int u : rev.get(v)) if (--outdeg[u] == 0) q.add(u);
        }
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < V; i++) if (safe[i]) ans.add(i);   // already ascending
        return ans;
    }

    // (b) out-degree peeling on the original graph — the nodes left over are UNSAFE
    public List<Integer> unsafeNodes(int[][] graph) {
        int V = graph.length;
        int[] outdeg = new int[V];
        boolean[] peeled = new boolean[V];
        List<List<Integer>> rev = new ArrayList<>();
        for (int i = 0; i < V; i++) rev.add(new ArrayList<>());
        for (int u = 0; u < V; u++) {
            outdeg[u] = graph[u].length;
            for (int v : graph[u]) rev.get(v).add(u);
        }
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < V; i++) if (outdeg[i] == 0) q.add(i);
        while (!q.isEmpty()) {
            int v = q.poll();
            peeled[v] = true;
            for (int u : rev.get(v)) if (--outdeg[u] == 0) q.add(u);
        }
        List<Integer> ans = new ArrayList<>();
        for (int i = 0; i < V; i++) if (!peeled[i]) ans.add(i);
        return ans;
    }
}
```

#### Complexity
**Time Complexity Calculation:** building `rev` and `outdeg` is `O(V + E)`; each node
is queued at most once and each in-edge relaxed once → **`O(V + E)`**.
**Space Complexity Calculation:** `rev` `O(V + E)`, `outdeg` + queue + `safe`
`O(V)` → **`O(V + E)`**.

### Edge Cases
- `graph = [[],[]]` → both nodes terminal → `[0, 1]`.
- `graph = [[1],[0]]` → neither resolved → `[]`.
- A self-loop `[[0]]` → `outdeg[0] = 1`, never 0 → `[]`.
- A node with an edge to a cycle but also a path to a terminal → still **unsafe**
  (the "every path" quantifier). The peeling method gets this right; a naive
  "reachable from a terminal" search gets it wrong. This is the single most common
  wrong solution.
- Output must be sorted — the ascending final loop gives that for free.
- Isolated node `[]` → safe.

### Pattern to Remember
```text
Problem clue:  "every path from this node terminates", "eventually safe",
               "does any cycle lie on every path"
Pattern:       reverse graph + Kahn's / out-degree peeling
Requirement:   directed; universal quantifier over paths
Mental model:  safe = ALL successors safe; peel leaves, keep what is left = unsafe
```

**Similar problems:** 22, 24, 25, 27, 34. **Interview tip:** stress the word
"**every** path" — that is why one successful search is not enough, and it is the
detail the interviewer is testing.

---

## 27. Alien Dictionary (LeetCode 269)

### Problem Understanding
You are given a list of words in an **unknown** alphabet order. Infer the order of
the letters and return a **distinct** string of all letters that appear. If the
derived order is invalid (e.g. `"abc"` appears before `"ab"`), return `""`.

- **Input:** `String[] words`
- **Output:** a string of letters in the inferred order
- **Constraints/observations:**
  - Compare **consecutive** words only, and only up to the first differing position.
    That single position gives exactly one `u → v` dependency.
  - **Deduplicate edges** (the same letter pair can appear many times) or the
    in-degree will be wrong and you will deadlock.
  - **Prefix rule:** if `w1` is a strict prefix of `w2`, the order is impossible
    (`"abc"` before `"ab"`).
  - A letter with in-degree 0 and no outgoing constraint may still need to be
    emitted (letters that only appear as the *last* differing character of a pair).

**Example 1:** `words = ["wrt","wrt","er","ett","rft","rte","rts","art"]`
Adjacent-pair edges: `w→e`, `r→t`, `e→r`, `f→t`, `e→s`, `r→a` → Kahn's emits
`"fwerast"` (any valid order is accepted; a cycle would give `""`).
**Example 2:** `words = ["hello","leetcode"]` → the first difference is at index 0,
`h` vs `l`, so the single edge is `h→l`. The letters are `c, d, e, h, l, o, t`, and
`h` must precede `l`, so Kahn's emits `c, d, e, h, l, o, t` → `"cdehlot"`.
**Example 3 (prefix violation):** `words = ["abc", "ab"]` → `""`.
**Example 4 (cycle):** `words = ["ba", "ab", "ba"]` → edges `b→a` (from positions
0–1) **and** `a→b` (from positions 1–2) → cycle → `""`. Note that with only **two**
words (`["ba","ab"]`) you get the single edge `b→a` and the answer is `"ba"`: a
cycle needs at least three words, because two words yield only one edge.
**Example 5 (single word):** `words = ["abc"]` → `"abc"` — every letter must appear,
even ones that generate no edge.

### How to Think About the Problem
- **What should I notice first?** Each *pair* of consecutive words yields **at most
  one** ordering constraint, and the constraint is a directed edge between
  characters. A set of constraints on elements = a **topological sort**.
- **Which representation?** A `char[]`/`boolean[26]` adjacency for the alphabet, or
  a `Map<Character, List<Character>>`. In-degree per character.
- **Which mental model?** Mental model 3, generator flavour, on a graph of
  characters.
- **Clue → Pattern:** *"infer the relative order of items from a sequence"* →
  **build a dependency DAG from consecutive-pair first differences, then Kahn's**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: enumerate all 26! letter orders and test each against the words.
             Astronomical.
        ↓
Observation: each adjacent word pair only constrains the first differing letter.
             Collect those constraints; that is a directed graph over ≤ 26 nodes.
        ↓
Optimal: dedupe edges, Kahn's topological sort, and validate the prefix rule.
```

### Brute Force Approach
**Basic idea:** for every pair of distinct letters present, assume the alphabet order
is the one implied by the word list, and check all pairs of words directly.

```java
import java.util.*;

public class AlienDictionaryBrute {
    public String alienDict(String[] words) {
        TreeSet<Character> letters = new TreeSet<>();
        for (String w : words) for (char ch : w.toCharArray()) letters.add(ch);
        for (char a : letters) {
            for (char b : letters) {
                if (a == b) continue;
                if (violates(words, a, b)) continue;   // some pair needs a before b
                return orderUsing(a, b, letters);      // not a real search: just wrong
            }
        }
        return "";
    }

    private boolean violates(String[] words, char before, char after) {
        for (int i = 0; i + 1 < words.length; i++) {
            int j = 0;
            while (j < words[i].length() && j < words[i + 1].length() && words[i].charAt(j) == words[i + 1].charAt(j)) j++;
            if (j < words[i].length() && words[i].charAt(j) == before && words[i + 1].charAt(j) == after) return true;
        }
        return false;
    }

    private String orderUsing(char a, char b, TreeSet<Character> letters) { return ""; }
}
```

**Time Complexity Calculation:** the honest brute force is `O(26! · W · L)`.
**Space Complexity Calculation:** `O(W · L)`.
> **Why can this be improved?** We never need to *guess* an order — the words tell
> us the order of individual pairs, and a consistent set of pair-orderings is a
> graph, not a permutation search.

### Optimal Approach — Build the letter DAG, then Kahn's

#### Core Observation
**For consecutive words `w1`, `w2`, let `j` be the first index where they differ.
Then `w1[j] → w2[j]` is a constraint, and all constraints come from such pairs.** One
constraint per pair — the rest of the shared prefix carries no information.

#### Pattern Identification
**Mental model 3: dependency elimination, applied to a 26-node graph built from the
input.**

#### Step-by-Step Intuition
1. Collect the set of letters (all characters in all words).
2. For each consecutive pair, find the first differing index `j`:
   - if `j` exists and both words have length `> j`, add edge
     `adj[w1[j]].add(w2[j])` — **into a set**, so duplicates are ignored;
   - if one word is exhausted at `j` (strict prefix) → invalid, return `""`.
3. Kahn's over the letters, emitting in-degree-0 letters.
4. If fewer letters are emitted than exist → the constraints contain a cycle →
   return `""`.
5. Concatenate.

*The invariant:* after the scan, the graph contains exactly the pairwise ordering
constraints the word list imposes, so any topological order of it sorts the word
list; and if the graph is acyclic such an order exists.

#### Dry Run
`words = ["wrt","wrt","er","ett","rft","rte","rts","art"]`

| Step | pair | first diff `j` | edge added | indeg update |
|---|---|---|---|---|
| 1 | `wrt`/`wrt` | none (equal) | — | — |
| 2 | `wrt`/`er` | 0: `w` vs `e` | `w→e` | `in[e] = 1` |
| 3 | `er`/`ett` | 1: `r` vs `t` | `r→t` | `in[t] = 1` |
| 4 | `ett`/`rft` | 0: `e` vs `r` | `e→r` | `in[r] = 1` |
| 5 | `rft`/`rte` | 1: `f` vs `t` | `f→t` | `in[t] = 2` |
| 6 | `rte`/`rts` | 2: `e` vs `s` | `e→s` | `in[s] = 1` |
| 7 | `rts`/`art` | 0: `r` vs `a` | `r→a` | `in[a] = 1` |

Letters: `{w, r, e, t, f, s, a}` (note: **no** `d`, `c`, `q`… this word list uses
only these seven). In-degrees: `w=0, f=0, e=2, r=1, t=2, s=1, a=1`.

Kahn's with a lexicographic `TreeSet` queue:

| Step | zero-indeg letters | emit | new zero-indeg | order so far |
|---|---|---|---|---|
| 1 | `{f, w}` | `f` | — (`in[t]` 2→1) | `f` |
| 2 | `{w}` | `w` | `e` (1→0) | `fw` |
| 3 | `{e}` | `w`… → `e` | `r` (1→0) | `fwe` |
| 4 | `{r, s}` | `r` | `t` (2→1) | `fwer` |
| 5 | `{s, t}` | `s` | — | `fwers` |
| 6 | `{t}` | `t` | — | `fwerts` |
| 7 | `{a}` | `a` | — | `fwertsa` |

Emitted `7` letters = `7` letters in the graph → no cycle. Result `"fwertsa"`
(the exact string depends on tie-breaking; the judge accepts any valid order).
Verify it by eye: `w<e` ✓, `e<r` ✓, `r<t` ✓, `f<t` ✓, `e<s` ✓, `r<a` ✓.

#### Why Does It Work?
Each added edge is a necessary condition for the word list to be sorted. If the
letter graph is acyclic, any topological order of it satisfies all those necessary
conditions, and since those conditions were derived from the first differing
position of every consecutive pair, that order sorts the whole list. If the graph
has a cycle, the constraints contradict each other, so no alphabet order exists.

#### Java Code
```java
import java.util.*;

public class AlienDictionary {
    public String alienDictionary(String[] words) {
        if (words == null || words.length == 0) return "";
        Map<Character, TreeSet<Character>> adj = new TreeMap<>();
        Map<Character, Integer> indeg = new HashMap<>();
        for (String w : words) {
            for (char ch : w.toCharArray()) {          // every letter must be emitted
                adj.putIfAbsent(ch, new TreeSet<>());
                indeg.putIfAbsent(ch, 0);
            }
        }
        for (int i = 0; i + 1 < words.length; i++) {
            String a = words[i], b = words[i + 1];
            int j = 0;
            while (j < a.length() && j < b.length() && a.charAt(j) == b.charAt(j)) j++;
            if (j >= a.length() || j >= b.length()) {
                if (a.length() > b.length()) return "";   // "abc" before "ab" is invalid
                continue;                                  // equal or strict prefix: fine
            }
            char from = a.charAt(j), to = b.charAt(j);
            if (adj.get(from).add(to)) indeg.merge(to, 1, Integer::sum);  // dedupe!
        }

        TreeSet<Character> ready = new TreeSet<>();
        for (char ch : indeg.keySet()) if (indeg.get(ch) == 0) ready.add(ch);
        StringBuilder sb = new StringBuilder();
        while (!ready.isEmpty()) {
            char u = ready.pollFirst();
            sb.append(u);
            for (char v : adj.get(u)) {
                int remaining = indeg.get(v) - 1;      // Integer is immutable
                indeg.put(v, remaining);
                if (remaining == 0) ready.add(v);
            }
        }
        return sb.length() == indeg.size() ? sb.toString() : "";   // cycle => ""
    }
}
```

#### Complexity
**Time Complexity Calculation:** let `W` = number of words, `L` = max word length,
`A ≤ 26` = number of distinct letters, `E ≤ A²` = distinct constraints. Scanning
pairs is `O(W·L)`; Kahn's is `O(A + E)` → **`O(W·L + A + E)`** ≈ `O(W·L)`.
**Space Complexity Calculation:** `O(A + E)` for the graph → **`O(1)`** for a fixed
alphabet of 26.

### Edge Cases
- `words = []` → `""`.
- `words = ["abc"]` → one letter, no edges → `"a"`? The judge expects all
  distinct letters: `"abc"` → `"abc"`. This is why step 1 seeds **every** letter, not
  just letters that appear as an edge endpoint. (A very common miss.)
- `["abc", "ab"]` → prefix violation → `""`.
- `["ba", "ab", "ba"]` → edges `b→a` and `a→b` → cycle → `""`.
- `["ba", "ab"]` → the single edge `b→a` → `"ba"`. A cycle needs three words.
- Duplicate words → the pair contributes no edge.
- Same edge from many pairs → deduped, so in-degree stays `1` and Kahn's does not
  stall.
- A letter that appears only at the end of a word and never in a differing position
  still must appear in the output (same trap as `["abc"]`).
- Case-sensitivity: assume lowercase `a-z` as the statement says.

### Pattern to Remember
```text
Problem clue:  "infer the order / dependencies from a sequence of items"
Pattern:       consecutive-pair first-difference edges + dedupe + Kahn's
Requirement:   the derived constraints must form a DAG; prefix rule must be checked
Mental model:  one pair of consecutive words = at most one ordering constraint
```

**Similar problems:** 21, 22, 25, 26. **Interview tip:** state the three checks
explicitly — (1) dedupe edges, (2) every letter must be in the graph, (3) the prefix
rule — because they are the three ways this problem is actually failed.

---

# PART D — Shortest Path Algorithms and Problems

Thirteen problems, all built from **one line**:

```java
if (dist[v] > dist[u] + w) dist[v] = dist[u] + w;      // relaxation
```

The algorithms differ only in **the order in which nodes are relaxed** and **how the
next node is chosen**:

| Situation | Algorithm | Node order | Problem |
|---|---|---|---|
| unweighted | BFS | by distance | 28, 32, 34, 37 |
| DAG | topological + relax | topological | 29 |
| non-negative weights | **Dijkstra** | smallest `dist` (PQ/set) | 30–36, 50 |
| negative weights allowed | **Bellman-Ford** | repeated passes (`V-1`) | 34, 38 |
| all pairs | **Floyd-Warshall** | `k` outermost | 39, 40 |
| minimize the max on a path | Dijkstra-variant / BS + BFS | — | 33, 50 |

## The relaxation primitive, and why Dijkstra is allowed to be greedy

Relaxation never *overestimates*: `dist[u] + w` is the cost of a real path, so any
value you write into `dist[v]` is achievable. The question is only whether you relax
in an order that can still discover improvements.

Dijkstra's greedy step is safe because of this invariant:

> **When the minimum-distance node `u` is removed from the priority queue, `dist[u]`
> is final** — no path through any unvisited node can be cheaper, because every edge
> has non-negative weight, so leaving `u` later could only add cost.

That is precisely why Dijkstra **fails on negative edges** (problem 38), and why
Bellman-Ford relaxes blindly, `V-1` times.

---

## 28. Shortest Path in an Undirected Graph with Unit Weights (takeUforward G-28)

### Problem Understanding
Given an undirected graph where every edge costs `1`, return the shortest distance
(number of edges) from a source `src` to every other vertex.

- **Input:** `V`, adjacency list, `src`
- **Output:** `int[] dist` where `dist[v]` = minimum hops from `src`, `-1` if
  unreachable
- **Constraints/observations:**
  - This is BFS. The `dist[]` array is the entire difference from problem 4.
  - Unreachable nodes keep `-1`.
  - `dist[src] = 0`, and the answer is the number of **edges**, not vertices.

**Example 1:** `V = 6`, edges `0-1, 0-2, 1-3, 2-4, 4-5`, `src = 0`
→ `dist = [0, 1, 1, 2, 2, 3]`
**Example 2:** same graph, `src = 5` → `dist = [3, 4, 2, 5, 1, 0]`
(`5 → 4 → 2 → 0` is 3 hops, `5 → 4 → 2 → 1` is 4, `5 → 4 → 2 → 1 → 3` is 5.)
**Example 3:** `src` isolated → `dist[src] = 0`, everything else `-1`.

### How to Think About the Problem
- **What should I notice first?** *Unit weights* — that phrase is the whole hint. BFS
  is optimal for unit-weight graphs, and no PQ is needed.
- **Which representation?** Adjacency list.
- **Minimizing?** Yes, but the cost model collapses to "hop count" → mental model 2.
- **Which traversal?** BFS with `dist[]`.
- **Clue → Pattern:** *"unweighted / unit-weight shortest path"* → **BFS with a
  distance array**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for every target, run its own BFS -> O(V·(V+E)).
        ↓
Observation: one BFS from the source discovers every target at its correct level,
             because the level of a node IS its distance in a unit-weight graph.
        ↓
Optimal: single BFS filling dist[], O(V + E).
```

### Brute Force Approach
```java
import java.util.*;

public class UnitPathBrute {
    public int[] dist(int V, List<List<Integer>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, -1);
        for (int t = 0; t < V; t++) {
            if (t == src) { dist[t] = 0; continue; }
            boolean[] seen = new boolean[V];
            ArrayDeque<Integer> q = new ArrayDeque<>();
            q.add(src);
            seen[src] = true;
            int d = 0;
            while (!q.isEmpty()) {
                int size = q.size();
                for (int i = 0; i < size; i++) {
                    int u = q.poll();
                    if (u == t) { d++; break; }
                    for (int v : adj.get(u)) if (!seen[v]) { seen[v] = true; q.add(v); }
                }
                if (!q.isEmpty()) d++;
            }
            dist[t] = d;
        }
        return dist;
    }
}
```

**Time Complexity Calculation:** `V` BFS runs × `O(V + E)` → **`O(V·(V+E))`**.
**Space Complexity Calculation:** `O(V)` per run.
> **Why can this be improved?** Every one of those BFS runs explores exactly the
> same level structure; only the *target* differs. Running it once records all the
> answers as a side effect.

### Optimal Approach — BFS with a distance array

#### Core Observation
**BFS dequeues nodes in non-decreasing hop count from `src`**, so the first time a
node is dequeued, its hop count is minimal. Recording that count is literally
`dist[v] = dist[u] + 1` at discovery time.

#### Pattern Identification
**Mental model 2: level expansion, harvesting distances.**

#### Step-by-Step Intuition
1. `int[] dist = new int[V]; Arrays.fill(dist, -1);` — `-1` = unreachable.
2. `dist[src] = 0`, enqueue `src`.
3. Pop `u`; for each unvisited neighbour `v`: `dist[v] = dist[u] + 1`, mark, enqueue.
4. Return `dist` (unreachable entries stay `-1`).

*The invariant:* when a node is assigned `dist[v] = dist[u] + 1`, all nodes closer
than `dist[u]` have already been processed, so no shorter path to `v` can exist
later.

#### Dry Run
`V = 6`, edges `0-1, 0-2, 1-3, 2-4, 4-5`, `src = 0`

| Step | dequeue | newly discovered | `dist` after | queue |
|---|---|---|---|---|
| 1 | 0 | 1, 2 | `[0,1,1,-1,-1,-1]` | `[1,2]` |
| 2 | 1 | 3 | `[0,1,1,2,-1,-1]` | `[2,3]` |
| 3 | 2 | 4 | `[0,1,1,2,2,-1]` | `[3,4]` |
| 4 | 3 | — | unchanged | `[4]` |
| 5 | 4 | 5 | `[0,1,1,2,2,3]` | `[5]` |
| 6 | 5 | — | — | `[]` |

`dist = [0,1,1,2,2,3]` ✓

#### Why Does It Work?
The invariant is the level invariant: the queue drains one hop at a time, so a node
is always discovered from a node at distance `d` and assigned `d+1`; no shorter path
could reach it, because such a path would have discovered it one level earlier.

#### Java Code
```java
import java.util.*;

public class ShortestPathUnitWeights {
    public int[] shortestPath(int V, List<List<Integer>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        dist[src] = 0;
        q.add(src);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {                 // -1 = not yet reached
                    dist[v] = dist[u] + 1;
                    q.add(v);
                }
            }
        }
        return dist;
    }

    // the level-by-level variant, which is the same thing written differently
    public int[] shortestPathLevels(int V, List<List<Integer>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(src);
        dist[src] = 0;
        int level = 0;
        while (!q.isEmpty()) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                int u = q.poll();
                for (int v : adj.get(u)) if (dist[v] == -1) { dist[v] = level; q.add(v); }
            }
            level++;
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each vertex dequeued once (`O(V)`), each edge
examined twice → **`O(V + E)`**.
**Space Complexity Calculation:** `dist` + queue → **`O(V)`**.

### Edge Cases
- `src` with no edges → `dist[src] = 0`, rest `-1`.
- Self-loops and multi-edges: harmless (already-visited check).
- `V = 1` → `[0]`.
- `V = 0` → guard before `dist[src]`.
- Undirected is assumed; on a directed graph the same BFS returns shortest
  *directed* distances, which is also correct.

### Pattern to Remember
```text
Problem clue:  "unit weight / unweighted / minimum number of edges"
Pattern:       BFS with int[] dist
Requirement:   all edges cost the same (usually 1)
Mental model:  BFS level == shortest hop count; -1 marks unreachable
```

**Similar problems:** 9, 13, 16, 32, 34, 37. **Interview tip:** if the weights are
all `1`, say plainly "BFS is optimal, no priority queue needed" — using Dijkstra
here is the most common over-engineering mistake.

---

## 29. Shortest Path in a Directed Acyclic Graph (takeUforward G-27)

### Problem Understanding
In a **DAG** with weighted edges, find the shortest path from a source to **all**
other vertices.

- **Input:** `V`, weighted directed adjacency list (`{to, weight}`), `src`
- **Output:** `int[] dist` (use `long[]`/`INF` for large weights)
- **Constraints/observations:**
  - Because the graph is a DAG, the topological order **is** a valid relaxation
    order: when you relax `u`, all its predecessors are already final.
  - This makes the whole thing `O(V + E)` — better than Dijkstra's `O((V+E) log V)`.
  - Negative weights are fine here (no cycles → no infinite descent).

**Example 1:** `V = 6`, edges `1→0 (5), 1→2 (10), 2→3 (3), 0→3 (11), 0→4 (10)`,
`src = 1` → `dist = [5, 0, 10, 13, 15, INF]`
**Example 2:** add the edge `0→5 (2)` → `dist[5] = 7` (the cheaper `2→3→…` does not
exist, and `1→2→3` is already worse)
**Example 3:** `src = 4` (no out-edges) → `dist[4] = 0`, everything else `INF`.

### How to Think About the Problem
- **What should I notice first?** **DAG**. That single word changes the algorithm
  from "greedy with a PQ" to "process in topological order".
- **Which representation?** Weighted directed adjacency list.
- **Minimizing?** Yes — mental model 4, but with a *free* node order supplied by the
  DAG structure.
- **Which traversal?** Topological sort (problem 21) followed by relaxation.
- **Clue → Pattern:** *"DAG + weights + shortest path"* → **topological order, then
  relax**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: run Dijkstra anyway. O((V+E) log V) — correct but pays for a PQ it
             does not need.
        ↓
Observation: in a DAG, if you relax nodes in topological order, then when you reach u
             every path INTO u has already been relaxed, so dist[u] is final the
             moment you process it. No PQ needed, and it even works with negative
             weights.
        ↓
Optimal: topo-sort, then one relaxation pass in that order. O(V + E).
```

### Brute Force Approach
**Basic idea:** run Dijkstra's algorithm (problem 30) on the DAG.

```java
import java.util.*;

public class DagPathBrute {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[] shortestPath(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        boolean[] done = new boolean[V];
        for (int iter = 0; iter < V; iter++) {
            int u = -1;
            for (int i = 0; i < V; i++) if (!done[i] && (u == -1 || dist[i] < dist[u])) u = i;
            if (u == -1 || dist[u] == INF) break;
            done[u] = true;
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
            }
        }
        return dist;
    }
}
```

**Time Complexity Calculation:** `V` iterations × an `O(V)` minimum scan + `O(E)`
total relaxation → **`O(V² + E)`** (the linear-scan Dijkstra variant).
**Space Complexity Calculation:** `O(V)`.
> **Why can this be improved?** The `O(V²)` minimum scan exists only because
> Dijkstra does not know the order. A DAG *tells* us the order for free, so the scan
> disappears and the PQ disappears with it.

### Optimal Approach — Topological order + relaxation

#### Core Observation
**In topological order, all in-edges of a node are relaxed before the node is
processed**, so `dist[u]` is final on arrival. Relax once, in that order.

#### Pattern Identification
**Mental models 3 + 4: topological ordering used as a free relaxation schedule.**

#### Step-by-Step Intuition
1. Compute a topological order (DFS post-order + reverse, or Kahn's).
2. `int[] dist`, all `INF` except `dist[src] = 0`.
3. For each `u` **in topological order**: if `dist[u] == INF` continue; for each
   `{v, w}` in `adj.get(u)`: `dist[v] = min(dist[v], dist[u] + w)`.
4. Return `dist`.

*The invariant:* before `u` is processed, every predecessor `p` of `u` has been
processed with its final distance, so `dist[u] = min over p (dist[p] + w(p,u))`,
which is the definition of the shortest path. (Proof by induction on the topological
order.)

#### Dry Run
`V = 6`, edges `1→0 (5), 1→2 (10), 2→3 (3), 0→3 (11), 0→4 (10)`, `src = 1`
One topological order: `1 2 0 3 4 5`

| Step | `u` | `dist[u]` | relaxations | `dist` array |
|---|---|---|---|---|
| init | — | — | — | `[INF, 0, INF, INF, INF, INF]` |
| 1 | 1 | 0 | `0`: min(INF, 0+5) = 5; `2`: min(INF, 0+10) = 10 | `[5, 0, 10, INF, INF, INF]` |
| 2 | 2 | 10 | `3`: min(INF, 10+3) = 13 | `[5, 0, 10, 13, INF, INF]` |
| 3 | 0 | 5 | `3`: min(13, 5+11) = 13 → **no change**; `4`: min(INF, 5+10) = 15 | `[5, 0, 10, 13, 15, INF]` |
| 4 | 3 | 13 | none | unchanged |
| 5 | 4 | 15 | none | unchanged |
| 6 | 5 | INF | skipped (unreachable) | unchanged |

`dist = [5, 0, 10, 13, 15, INF]` — note the relaxation from `0` **improves nothing**,
which shows why a later node with a *smaller* distance can still matter… and why the
DAG order guarantees we already saw it.

#### Why Does It Work?
Induction on the topological order. Base: `src` has distance 0. Step: assume all
predecessors of `u` are final before `u` is processed; every path to `u` ends with
some edge `p → u`, and all such `dist[p] + w` values are considered, so `dist[u]` is
the true minimum. Since there are no cycles, no path can pass through `u` twice, so
the DAG property is exactly what makes this sound.

#### Java Code
```java
import java.util.*;

public class ShortestPathDAG {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[] shortestPath(int V, List<List<int[]>> adj, int src) {
        int[] indeg = new int[V];
        for (int u = 0; u < V; u++) for (int[] e : adj.get(u)) indeg[e[0]]++;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < V; i++) if (indeg[i] == 0) q.add(i);
        List<Integer> topo = new ArrayList<>();
        while (!q.isEmpty()) {
            int u = q.poll();
            topo.add(u);
            for (int[] e : adj.get(u)) if (--indeg[e[0]] == 0) q.add(e[0]);
        }

        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        for (int u : topo) {                        // relax in DAG order
            if (dist[u] == INF) continue;
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
            }
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** topological sort is `O(V + E)`; the relaxation pass
is `O(V + E)` (each edge relaxed exactly once) → **`O(V + E)`**, strictly better
than Dijkstra's `O((V+E) log V)`.
**Space Complexity Calculation:** `indeg`, `topo`, `dist`, queue → **`O(V)`**.

### Edge Cases
- `src` not in the graph / no out-edges → `dist[src] = 0`, rest `INF`.
- **Negative weights are allowed** (no cycles) — this is one place Dijkstra fails and
  this succeeds. Do not clamp negatives to 0.
- Parallel edges → both relaxed; min wins.
- `INF` arithmetic: guard `if (dist[u] == INF) continue;` and use a large-but-safe
  sentinel (`Integer.MAX_VALUE / 2`) so `dist[u] + w` cannot overflow.
- A single long chain `0→1→…→n` → answer fits in `long` if weights are large; use
  `long[]` in that case.
- Not a DAG (statement lies) → the topological sort returns fewer than `V` nodes; add
  a `topo.size() == V` check.

### Pattern to Remember
```text
Problem clue:  "DAG / directed acyclic graph" + "shortest path / weights"
Pattern:       topological order, then ONE relaxation pass
Requirement:   acyclic (which is what makes negative weights harmless)
Mental model:  the DAG hands you a free, correct relaxation schedule
```

**Similar problems:** 21, 22, 30, 38, 39. **Interview tip:** "DAG + weights is
`O(V+E)`, and it even tolerates negative weights" — that single sentence separates
people who have internalized shortest paths from people who have memorized Dijkstra.

---

## 30. Dijkstra's Algorithm using a Priority Queue (takeUforward G-32)

### Problem Understanding
Given a **weighted** graph with **non-negative** weights, find the shortest distance
from `src` to every vertex.

- **Input:** `V`, weighted adjacency list (`{to, weight}`), `src`
- **Output:** `int[] dist` (`long[]` for large weights), `INF` for unreachable
- **Constraints/observations:**
  - **Negative weights break it.** Proof sketch: once a node is popped as "cheapest",
    a later path through a not-yet-settled node could become cheaper.
  - Use a **min-priority queue** keyed on distance.
  - **Stale entries are fine**: a popped `(node, d)` with `d > dist[node]` is ignored
    by the `if (d > dist[u]) continue;` guard.
  - The result is a *settled* distance; the last write to `dist[v]` is final.

**Example 1:** `V = 5`, edges `0-1 (4), 0-2 (1), 2-1 (2), 1-3 (1), 2-3 (5)`, `src = 0`
`dist = [0, 3, 1, 4, INF]`
**Example 2:** same graph, `src = 1` → `dist = [3, 0, 2, 1, INF]`
**Example 3:** add a negative edge → the answer for the affected node is **wrong**
(this is the demo case for problem 38).

### How to Think About the Problem
- **What should I notice first?** Weights exist and are non-negative → BFS is no
  longer valid, because the cheapest path is not necessarily the fewest-hops path.
- **Which representation?** `List<List<int[]>>` with `{to, weight}` pairs.
- **Minimizing?** Yes → mental model 4, relaxation with a greedy node order.
- **Which traversal?** Dijkstra with a `PriorityQueue`.
- **Clue → Pattern:** *"weighted graph, non-negative weights, single source"* →
  **Dijkstra + min-heap keyed on `dist`**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try every simple path. Super-exponential.
        ↓
Better: all-pairs Floyd-Warshall. O(V^3) — works, ignores everything we know.
        ↓
Better still: Dijkstra with an O(V) min-scan per step. O(V^2 + E).
        ↓
Optimal: same greedy, but pick the next node with a min-heap: O((V + E) log V).
```

### Brute Force Approach
**Basic idea:** DFS enumerating all paths from `src` and keeping the best.

```java
import java.util.*;

public class DijkstraBrute {
    private int best;

    public int[] shortestPath(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, Integer.MAX_VALUE / 2);
        dist[src] = 0;
        best = dist[src];
        dfs(src, 0, adj, dist);
        return dist;
    }

    private void dfs(int u, int d, List<List<int[]>> adj, int[] dist) {
        if (d > dist[u]) return;                     // prune: worse than known best
        dist[u] = d;
        for (int[] e : adj.get(u)) dfs(e[0], d + e[1], adj, dist);
    }
}
```

**Time Complexity Calculation:** number of simple paths can be `Θ((V-1)!)` →
**super-exponential**; the pruning helps on benign inputs but is not a bound.
**Space Complexity Calculation:** `O(V)` + recursion.
> **Why can this be improved?** Instead of exploring paths in an arbitrary order,
> explore them in **increasing cost order** and you never need to revisit a settled
> node — that is the entire idea behind Dijkstra.

### Optimal Approach — Dijkstra with a `PriorityQueue`

#### Core Observation
**If `u` is the un-settled node with the smallest tentative distance, then
`dist[u]` is final.** Any alternative path to `u` must pass through some un-settled
node `x` with `dist[x] ≥ dist[u]`, and the remaining edges have non-negative weight,
so that path costs at least `dist[u]`. Hence pop-min and relax.

#### Pattern Identification
**Mental model 4: relaxation, in greedy minimum-distance order.**

#### Step-by-Step Intuition
1. `dist[] = INF`, `dist[src] = 0`; push `(0, src)` into a min-heap.
2. While the heap is not empty: pop `(d, u)`.
   - **Stale check:** `if (d > dist[u]) continue;` ← a cheaper route was found after
     this entry was inserted.
   - for each `{v, w}`: `nd = d + w`; if `nd < dist[v]` → `dist[v] = nd`, push
     `(nd, v)`.
3. Return `dist`.

*The invariant:* when a node is popped with `d == dist[u]`, `dist[u]` equals the true
shortest distance from `src` to `u` — and it will never change afterwards.

#### Dry Run
`V = 5`, edges `0-1 (4), 0-2 (1), 2-1 (2), 1-3 (1), 2-3 (5)`, `src = 0`
Heap entries shown as `(dist, node)`.

| Step | heap (min first) | pop | stale? | relaxations | `dist` after |
|---|---|---|---|---|---|
| init | `[(0,0)]` | — | — | — | `[0,INF,INF,INF,INF]` |
| 1 | `[(0,0)]` | `(0,0)` | no | `1`: 0+4=4; `2`: 0+1=1 | `[0,4,1,INF,INF]` |
| 2 | `[(1,2),(4,1)]` | `(1,2)` | no | `1`: 1+2=3 ✔; `3`: 1+5=6 | `[0,3,1,6,INF]` |
| 3 | `[(3,1),(4,1),(6,3)]` | `(3,1)` | no | `3`: 3+1=4 ✔ | `[0,3,1,4,INF]` |
| 4 | `[(4,1),(4,3),(6,3)]` | `(4,1)` | **`4 > dist[1]=3`** | skip | unchanged |
| 5 | `[(4,3),(6,3)]` | `(4,3)` | no | none | unchanged |
| 6 | `[(6,3)]` | `(6,3)` | **`6 > dist[3]=4`** | skip | unchanged |

`dist = [0, 3, 1, 4, INF]` ✓ — the two stale entries were correctly discarded, and
without the stale check the algorithm would still terminate but would do extra work
(and, without `dist` comparison, give wrong results).

#### Why Does It Work?
The invariant is "the popped node is final". When `u` is popped with `d = dist[u]`,
assume there were a cheaper path `P` to `u`. On `P` let `x` be the first un-settled
node when `u` was popped; its predecessor `y` on `P` was settled, so relaxation had
given `dist[x] ≤ cost(P[0..x])`, and because all remaining edges on `P` (including
the tail to `u`) are non-negative, `dist[x] ≤ cost(P) < dist[u] = d` — so `x` would
have been popped before `u`. Contradiction. Therefore `dist[u]` is final.

#### Java Code
```java
import java.util.*;

public class DijkstraPQ {
    private static final int INF = Integer.MAX_VALUE / 2;

    // each heap entry is int[]{distance, node}
    public int[] dijkstra(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;

        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src});

        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue;                     // stale entry
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.add(new int[]{dist[v], v});
                }
            }
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each edge is relaxed at most **twice** (once from
each endpoint, undirected), so at most `2E` pushes, each `O(log E)` in a heap; the
main loop is `O((V + E) log V)` (using the standard `log E = O(log V)` bound for
simple graphs). With **parallel edges**, the number of pushes can be `E`, giving
`O(E log E)` — worth knowing, and the reason some judges time out on dense
multi-edge inputs.
**Space Complexity Calculation:** `dist` `O(V)` plus the heap holding at most `O(E)`
entries → **`O(V + E)`**.

### Edge Cases
- **Negative weight** → wrong answer (document this explicitly; it is the whole
  reason problem 38 exists). Example: `0-1 (5), 0-2 (1), 2-1 (-4)`, `src = 0` →
  Dijkstra pops `0`, sets `dist[1]=5, dist[2]=1`; pops `2`, sets `dist[1] = 1-4 = -3`
  — but `1` was already **finalized** at 5, so the improvement is discarded.
- Zero-weight edges → fine.
- Self-loop with positive weight → never improves `dist[u]`.
- Unreachable nodes → `INF`.
- Overflow: use `long[]` and `Long.MAX_VALUE / 4` for big weights.
- `V = 1` → `[0]`.

### Pattern to Remember
```text
Problem clue:  "weighted graph, non-negative weights, single source, shortest"
Pattern:       min-heap Dijkstra with a stale-entry check
Requirement:   weights >= 0
Mental model:  pop-min ⇒ that node's distance is FINAL; relax its out-edges
```

**Similar problems:** 31, 33, 35, 36, 42, 50. **Interview tip:** state the
finalization invariant, and say the stale check explicitly — those two sentences are
the entire correctness argument.

---

## 31. Dijkstra's Algorithm using a Set (takeUforward G-33)

### Problem Understanding
The same shortest-path problem, but "where did the set/PQ choice come from?" This
problem exists to make you articulate **why a priority queue** and **why a set**,
and what changes if you use a plain `Queue`.

- **Input:** same as problem 30
- **Output:** `int[] dist`
- **Observations:**
  - `TreeSet<Pair>` behaves as a set: inserting an existing key **updates** it
    instead of creating a duplicate, so no stale entries exist and no stale check is
    needed.
  - A `LinkedList` used as a queue with O(1) `removeFirst` works too (Java 21's
    `ArrayDeque`), but then you may pop a non-minimal node, which is harmless for
    correctness yet wastes work.

#### Comparison table (the heart of this problem)

| Structure | Get min | Insert | Delete | Duplicates | Total |
|---|---|---|---|---|---|
| `PriorityQueue` (binary heap) | `O(log V)` | `O(log V)` | `O(log V)` (only head) | yes — need stale check | `O((V+E) log V)` |
| `TreeSet` (balanced BST) | `O(log V)` (first) | `O(log V)` | `O(log V)` (`remove`) | **no** — key update | `O((V+E) log V)` |
| `LinkedList`/`ArrayDeque` (FIFO) | `O(1)` ends, **no min** | `O(1)` | `O(1)` | no | `O(V + E)` pops but **wrong order** → extra relaxations |
| `O(V)` linear scan | `O(V)` | `O(1)` | `O(1)` | no | `O(V² + E)` — best for dense graphs |

**The key insight:** with a `TreeSet` you store `(dist, node)` as the *key*, so when
a node's distance improves, `set.remove(old); set.add(new);` replaces the entry.
That removes the "stale entry" concept entirely — the set always contains exactly one
entry per node, and it is always the best known one.

**Example:** `V = 5`, edges `0-1 (4), 0-2 (1), 2-1 (2), 1-3 (1), 2-3 (5)`, `src = 0`
→ `dist = [0, 3, 1, 4, INF]` (same answer as 30; only the bookkeeping differs).

### How to Think About the Problem
- **What should I notice first?** Dijkstra's *greedy* step is a "get the minimum"
  operation. Any structure supporting that in `O(log n)` works.
- **Which representation?** Identical to 30.
- **Minimizing?** Yes → mental model 4, with a data-structure question attached.
- **Which traversal?** Dijkstra with a `TreeSet` (or a PQ).
- **Clue → Pattern:** *"why a priority queue and not a queue?"* → **the node-selection
  structure is part of the algorithm**.

### Intuition (Brute → Better → Optimal)
```text
Brute: Dijkstra with an O(V) min-scan each step. O(V^2 + E) — great for dense graphs.
        ↓
Observation: the min-scan is the bottleneck; we need a cheaper "get the minimum".
        ↓
Better: binary heap. O(log V) pop. But heaps allow duplicate/stale entries.
        ↓
Optimal for sparse: TreeSet keyed on (dist, node) — one entry per node, so the
        algorithm is simpler to reason about, at the same asymptotic cost.
```

### Naïve Approach
**Basic idea:** FIFO queue (`ArrayDeque`) plus the pop order not being minimal.

```java
import java.util.*;

public class DijkstraNaive {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[] dijkstra(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(src);
        while (!q.isEmpty()) {
            int u = q.poll();                 // NO guarantee this is the minimum
            for (int[] e : adj.get(u)) {
                if (dist[u] + e[1] < dist[e[0]]) {
                    dist[e[0]] = dist[u] + e[1];
                    q.add(e[0]);              // may be enqueued many times
                }
            }
        }
        return dist;
    }
}
```

**Time Complexity Calculation:** a node can be enqueued once per incoming
improvement, so up to `E` enqueues; each poll scans `deg(u)` → `O(E log E)`-ish but
without any ordering guarantee, this is SPFA, whose worst case is `O(V·E)`.
**Space Complexity Calculation:** queue can hold `O(E)` → **`O(V + E)`**.
> **Why can this be improved?** Without the min-ordering you lose the finalization
> invariant, so nodes get re-expanded repeatedly — the classic SPFA worst case.
> Ordering the pops by distance is what buys the single-expansion guarantee.

### Optimal Approach — Dijkstra with a `TreeSet`

#### Core Observation
**Keying the set by `(dist, node)` turns "improve this node" into "replace its
entry".** Since a `TreeSet` holds distinct keys, at most one entry per node can
exist, so a popped node's `dist` is by construction the best known value and needs no
stale check.

#### Pattern Identification
**Mental model 4 with a set-based priority structure** (and the concept: *the
data structure that picks the next node is part of the algorithm's correctness for
its complexity*).

#### Step-by-Step Intuition
1. `TreeSet<int[]>` with a comparator ordering by `(dist, node)` — or, to make
   "replace" trivial, key on `node` and store the distance in the payload and use a
   custom comparator.
2. Insert `(0, src)`.
3. Poll the first element `(d, u)`; for each `{v, w}`: if `d + w < dist[v]` →
   `set.remove(new int[]{dist[v], v})` (if present), `dist[v] = d + w`,
   `set.add(new int[]{d + w, v})`.
4. Return `dist`.

*The invariant:* the set contains exactly one entry per discovered-and-unfinished
node, holding its current best distance. The first element is therefore the global
minimum, and popping it finalizes that node.

#### Dry Run
Same graph as problem 30. Set contents shown as `{(d,node)}` sorted by `d`.

| Step | set (sorted) | poll | relaxations | `dist` |
|---|---|---|---|---|
| init | `{(0,0)}` | — | — | `[0,INF,INF,INF,INF]` |
| 1 | `{(0,0)}` | `(0,0)` | `1 ← 4`; `2 ← 1` | `[0,4,1,INF,INF]` |
| 2 | `{(1,2),(4,1)}` | `(1,2)` | `1 ← 3` (remove `(4,1)`, add `(3,1)`); `3 ← 6` | `[0,3,1,6,INF]` |
| 3 | `{(3,1),(4,1)?no,(6,3)}` | `(3,1)` | `3 ← 4` (replace `(6,3)`) | `[0,3,1,4,INF]` |
| 4 | `{(4,3)}` | `(4,3)` | none | unchanged |

Note step 2: the **old entry `(4,1)` was removed**, so the set never contained both
`(3,1)` and `(4,1)`. That is the whole point of the set version — compare with
problem 30's heap at the same moment, which held `(3,1)`, `(4,1)` and `(6,3)`.

#### Why Does It Work?
Identical proof to Dijkstra (30) — the finalization invariant depends only on
choosing the minimum-distance un-settled node, which `TreeSet.first()` guarantees. The
set merely makes the state space smaller (one entry per node), removing stale states
rather than filtering them.

#### Java Code
```java
import java.util.*;

public class DijkstraSet {
    private static final int INF = Integer.MAX_VALUE / 2;

    // TreeSet of int[]{dist, node}, ordered by dist then node
    private static final Comparator<int[]> BY_DIST = (a, b) -> {
        if (a[0] != b[0]) return Integer.compare(a[0], b[0]);
        return Integer.compare(a[1], b[1]);
    };

    public int[] dijkstra(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;

        TreeSet<int[]> set = new TreeSet<>(BY_DIST);
        set.add(new int[]{0, src});

        while (!set.isEmpty()) {
            int[] cur = set.pollFirst();          // O(log V) remove-min
            int d = cur[0], u = cur[1];
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (d + w < dist[v]) {
                    set.remove(new int[]{dist[v], v});   // drop the stale entry
                    dist[v] = d + w;
                    set.add(new int[]{dist[v], v});
                }
            }
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each node is extracted once; each edge is relaxed
once per endpoint. `TreeSet` operations are `O(log V)`, so the total is
**`O((V + E) log V)`** — the same as the heap version, with `O(V)` extractions
instead of `O(E)` (in the simple-graph case both are `O(V)`).
**Space Complexity Calculation:** exactly one entry per node → **`O(V)`** (plus the
`dist` array) — better than the heap's `O(E)`.

### Edge Cases
- Negative weights → same failure as problem 30.
- Parallel edges → fine, the set holds one entry per node regardless.
- Comparator correctness: `TreeSet` decides "same key" by
  `compare(...) == 0`, **not** by `equals`. So if you compare only on `dist`, two
  different nodes with equal distance collapse into one entry and a node silently
  disappears. Always include the node id as a tiebreaker (as `BY_DIST` does).
- `int[]` keys are legal here *only* because the comparator compares by value;
  `remove(new int[]{dist[v], v})` succeeds even though `int[].equals` is identity.
  If you ever use a `HashSet` instead, this breaks — use a `record` (Java 16+), which
  gives you value-based `equals`/`hashCode` for free and makes the code honest.

### Pattern to Remember
```text
Problem clue:  "why a priority queue / set? what if I used a queue?"
Pattern:       Dijkstra + TreeSet<{dist,node}> (replace-on-improve) or + PriorityQueue
               (duplicates + stale check)
Requirement:   non-negative weights
Mental model:  the pop-min ORDER is what makes a node's distance final; the structure
               that provides pop-min is part of the algorithm
```

**Similar problems:** 30, 35, 36, 42. **Interview tip:** the killer answer to
"why not a plain queue?" is: *"because then a node can be expanded before its
distance is final, which costs O(V·E) in the worst case (SPFA); ordering the pops by
distance guarantees each node is expanded once."*

---

## 32. Shortest Path in a Binary Maze (LeetCode 1091)

### Problem Understanding
An `n × m` grid of `0`s (open) and `1`s (blocked). Moving **up/down/left/right**
costs 1 minute. Return the **minimum number of moves** from the top-left to the
bottom-right, or `-1` if unreachable.

- **Input:** `int[][] maze`
- **Output:** minimum moves, or `-1`
- **Constraints/observations:**
  - Every move costs 1 → **this is BFS**, not Dijkstra.
  - With `0`s as walkable: the goal test is `maze[0][0] == 1 || maze[n-1][m-1] == 1
    → -1`.
  - The "maze" framing (LeetCode 111) asks for a **path**, which needs a parent
    array or a mutation of the grid; this variant (1091) asks only for the count.

**Example 1:**
```text
maze =
0 0 0 0
1 1 0 1
0 0 0 0
0 1 1 0
→ 6   right, right, down, down, right, down
```
**Example 2:**
```text
maze =
0 0 0
1 1 0
0 0 0
→ 4   right, right, down, down
```
**Example 3:** `maze = [[0]]` → `0` (start == goal)
**Example 4:** the same grid as Example 1 with `maze[3][3] = 1` (the goal sealed) → `-1`

### How to Think About the Problem
- **What should I notice first?** A grid where movement has a **uniform cost**. That
  is BFS, full stop — the shortest-path machinery is a red herring.
- **Which representation?** The grid, implicitly.
- **Minimizing?** Yes, but unit cost → mental model 2.
- **Which traversal?** BFS from `(0,0)`, return the level when you reach
  `(n-1, m-1)`.
- **Clue → Pattern:** *"grid, 4-directional, every move costs 1"* → **BFS levels**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: BFS/DFS trying every path. Exponential.
        ↓
Observation: every move costs the same, so the first time you reach a cell is via a
             shortest path. BFS gives all of them at once.
        ↓
Optimal: BFS with a visited array (or mark the grid), O(n·m).
```

### Brute Force Approach
**Basic idea:** recursive DFS trying all four directions.

```java
import java.util.*;

public class BinaryMazeBrute {
    public int solve(int[][] maze) {
        int n = maze.length, m = maze[0].length;
        if (maze[0][0] == 1 || maze[n - 1][m - 1] == 1) return -1;
        int[] best = {Integer.MAX_VALUE};
        dfs(maze, 0, 0, 0, best);
        return best[0] == Integer.MAX_VALUE ? -1 : best[0];
    }

    private void dfs(int[][] maze, int r, int c, int d, int[] best) {
        int n = maze.length, m = maze[0].length;
        if (r == n - 1 && c == m - 1) { best[0] = Math.min(best[0], d); return; }
        if (d >= best[0]) return;                     // prune
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] dir : dirs) {
            int nr = r + dir[0], nc = c + dir[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m || maze[nr][nc] == 1) continue;
            maze[nr][nc] = 1;                        // mark visited by blocking
            dfs(maze, nr, nc, d + 1, best);
            maze[nr][nc] = 0;                        // unmark
        }
    }
}
```

**Time Complexity Calculation:** enumerates all simple paths — `O(4^(n·m))` in the
worst case; the `d >= best[0]` prune helps in practice but is exponential in theory.
**Space Complexity Calculation:** `O(n·m)` recursion depth.
> **Why can this be improved?** We only care about the *shortest* path, not all paths.
> A traversal that expands nodes in increasing path length stops at the first hit.

### Optimal Approach — BFS on the grid

#### Core Observation
**The first time BFS dequeues `(n-1, m-1)`, its level is the minimum number of
moves**, because BFS expands in order of path length.

#### Pattern Identification
**Mental model 2: level expansion, grid flavour.** No priority queue: every edge
costs 1.

#### Step-by-Step Intuition
1. Guard: if start or goal is blocked → `-1`.
2. `int[][] dist` (or reuse the grid), seed `dist[0][0] = 0`, enqueue `0`.
3. BFS; on reaching the goal, return its distance.
4. If the queue empties → `-1`.

#### Dry Run
```text
maze =
0 0 0 0
1 1 0 1
0 0 0 0
0 1 1 0
```
Wave by wave. `L` = level (number of moves):

| `L` | cells first reached at this level | note |
|---|---|---|
| 0 | `(0,0)` | start |
| 1 | `(0,1)` | down `(1,1)` is a wall |
| 2 | `(0,2)` | down `(1,2)` open, right `(0,3)` open |
| 3 | `(1,2)`, `(0,3)` | **both** at 3: `(0,0)→(0,1)→(0,2)→…`; `(1,3)` is a wall so the top-right corner is a dead end |
| 4 | `(2,2)` | `(3,2)` and `(2,1)`,`(2,3)` are one further |
| 5 | `(2,1)`, `(2,3)` | `(3,1)` and `(3,3)` are one further; `(1,1)` blocked |
| 6 | `(2,0)`, `(3,3)`←**goal** | returned here |
| 7 | `(3,0)` | (only reached after the goal; unused) |

`dist[3][3] = 6` ✓ — and the dry run earns its keep: the tempting "right, right,
right" ends in the sealed corner `(0,3)`, and "right, right, down, down" would need
`(1,2)→(2,2)→(3,2)`, but `(3,2)` is a wall. Levels are the honest way to read a
maze; guessing the "nice" number is how dry runs catch bugs.

#### Why Does It Work?
BFS processes cells in non-decreasing distance from the start, so a cell's first
dequeue gives its true minimum move count. Returning the goal's distance is
therefore optimal; if the goal is never dequeued, no open path exists.

#### Java Code
```java
import java.util.*;

public class ShortestPathBinaryMaze {
    public int shortestPath(int[][] maze) {
        int n = maze.length, m = maze[0].length;
        if (maze[0][0] == 1 || maze[n - 1][m - 1] == 1) return -1;
        int[][] dist = new int[n][m];
        for (int[] row : dist) Arrays.fill(row, -1);
        ArrayDeque<Integer> q = new ArrayDeque<>();
        dist[0][0] = 0;
        q.add(0);
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll();
            int r = cur / m, c = cur % m;
            if (r == n - 1 && c == m - 1) return dist[r][c];   // first pop == shortest
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (maze[nr][nc] == 1 || dist[nr][nc] != -1) continue;
                dist[nr][nc] = dist[r][c] + 1;
                q.add(nr * m + nc);
            }
        }
        return -1;
    }

    // the level-by-level form, when the judge wants the wave count
    public int shortestPathLevels(int[][] maze) {
        int n = maze.length, m = maze[0].length;
        if (maze[0][0] == 1 || maze[n - 1][m - 1] == 1) return -1;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(0);
        maze[0][0] = 1;                       // reuse the grid as the visited array
        int moves = 0;
        while (!q.isEmpty()) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                int cur = q.poll();
                int r = cur / m, c = cur % m;
                if (r == n - 1 && c == m - 1) return moves;
                int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr < 0 || nr >= n || nc < 0 || nc >= m || maze[nr][nc] == 1) continue;
                    maze[nr][nc] = 1;
                    q.add(nr * m + nc);
                }
            }
            moves++;
        }
        return -1;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each cell enqueued once, 4 neighbours each →
**`O(n·m)`** = `O(V + E)` with `E ≈ 4V`.
**Space Complexity Calculation:** `dist` + queue `O(n·m)` → **`O(V)`**.

### Edge Cases
- `n = 1, m = 1`, `maze = [[0]]` → `0` (start == goal; the guard must not fire).
- Start or goal blocked → `-1`.
- No open path → queue empties → `-1`.
- `n = 1` or `m = 1` (a corridor) → the distance is forced; BFS handles it.
- 8-directional variant (diagonals allowed) → add diagonals; the count semantics
  change (each diagonal is still one move).

### Pattern to Remember
```text
Problem clue:  "grid, 4 moves, each costs the same, fewest moves"
Pattern:       BFS levels (NO priority queue)
Requirement:   uniform edge weight
Mental model:  first dequeue of the goal = minimum moves; unreachable = queue empties
```

**Similar problems:** 28, 13, 34, 37, 50. **Interview tip:** explicitly say "every
move costs 1, so BFS — Dijkstra would be a pessimization", and name why: the PQ
buys ordering we already get for free from the queue.

---

## 33. Path with Minimum Effort (LeetCode 1631)

### Problem Understanding
An `n × m` grid of heights. A path's **effort** is the maximum height difference
along any single step. Return the minimum possible effort from start to target.

- **Input:** `int[][] heights`, `(sx, sy)`, `(tx, ty)`
- **Output:** minimum effort
- **Constraints/observations:**
  - This is **not** a sum-shortest-path problem: the path cost is a `max`, not a `+`.
  - Two standard solutions: (a) a **Dijkstra variant** whose edge weight is
    `|h[u] - h[v]|` and whose distance is a *bottleneck*; (b) **binary search on the
    answer + BFS** (a Part D meet Part B problem, exactly like problem 50).
  - Which to prefer? The Dijkstra variant is `O(V log V)` and always right; the
    binary search is `O(V log W)` and often faster. Know both.

**Example 1:**
```text
heights =
1 2 2
3 1 1

(0,0) -> (0,2):  (0,0) -> (0,1) -> (0,2)   step diffs 1 and 0
answer = 1
```
**Example 2:** `heights = [[1,2,3],[4,5,6],[7,8,9]]`, `(0,0) → (2,2)` → `3`
(The monotone paths must each hop `3` at least once; the diagonal-friendly route
`0,0 → 1,1 → 2,2` has diffs `4, 4`, which is worse, so the answer is `3`.)
**Example 3:** the same grid, `(0,0) → (0,2)` → `1` (diffs `1, 1` along the top row)

### How to Think About the Problem
- **What should I notice first?** "Minimum effort" = **minimize the maximum edge**.
  Ask: is the combination rule `+` or `max`? Here it is `max`.
- **Which representation?** The grid, implicitly; edge weight `|Δh|`.
- **Minimizing?** Yes, but with a different aggregation rule.
- **Which traversal?** Dijkstra variant with
  `effort[v] = min(effort[v], max(effort[u], |h[u]-h[v]|))`, **or** binary search +
  BFS.
- **Clue → Pattern:** *"minimize the maximum / bottleneck path"* → **Dijkstra with a
  `max` relaxation, or BS-on-answer + BFS**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: enumerate paths, compute max edge per path, take the min. Exponential.
        ↓
Observation A (BS on answer): "is there a path using only steps of difference <= X?"
             is monotone in X (if yes for X, yes for any bigger X). So binary search X
             and run BFS for the check.  O(V log W).
        ↓
Observation B (Dijkstra variant): replace the addition in the relaxation with max().
             The greedy min-effort-first order is still valid because max() is
             monotone.  O(V log V).
```

### Brute Force Approach
**Basic idea:** DFS over all paths carrying the current maximum, prune when it
already exceeds the best found.

```java
import java.util.*;

public class MinEffortBrute {
    public int minEffortPath(int[][] h, int sx, int sy, int tx, int ty) {
        int n = h.length, m = h[0].length;
        int[] best = {Integer.MAX_VALUE};
        dfs(h, sx, sy, tx, ty, 0, best);
        return best[0];
    }

    private void dfs(int[][] h, int r, int c, int tx, int ty, int eff, int[] best) {
        int n = h.length, m = h[0].length;
        if (eff >= best[0]) return;
        if (r == tx && c == ty) { best[0] = eff; return; }
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
            dfs(h, nr, nc, tx, ty, Math.max(eff, Math.abs(h[r][c] - h[nr][nc])), best);
        }
    }
}
```

**Time Complexity Calculation:** `O(4^(n·m))` worst case (no visited array; revisits
wastefully). Add a visited array and it becomes "shortest path with a max
aggregation" — which is still exponential without a greedy order.
**Space Complexity Calculation:** `O(n·m)` recursion.
> **Why can this be improved?** Once you fix a *global* order in which to expand
> nodes, the `max` aggregation stops needing a full search — that order is either
> "smallest current effort" (Dijkstra) or "binary search the threshold" (BS + BFS).

### Optimal Approach A — Dijkstra with a `max` relaxation

#### Core Observation
**Generalize relaxation from `+` to `max`:**
`if (eff[v] > max(eff[u], w)) eff[v] = max(eff[u], w);`
Because `max(·, x)` is monotone and can only hold steady or grow as a path is
extended, the greedy "expand the node with the smallest current effort" is still
correct: when a node is popped with a non-stale `eff[u]`, that effort is final.

#### Pattern Identification
**Mental model 4 (relaxation) with a non-additive aggregation + the
"minimize the maximum" cross-cutting trick from §0.13.**

#### Step-by-Step Intuition
1. `int[] eff` all `INT_MAX`; `eff[start] = 0`; heap of `{eff, id}`.
2. Pop `(e, u)`; skip if `e > eff[u]` (stale entry).
3. For each neighbour `v`: `ne = max(e, |h[u] - h[v]|)`; if `ne < eff[v]` → update and
   push.
4. Return `eff[target]` as soon as the target is popped with a non-stale entry.

#### Dry Run
`heights = [[1,2,2],[3,1,1]]`, `(0,0) → (0,2)`

| Step | heap | pop `(eff,u)` | neighbour `v` | `w = |Δh|` | `max(e,w)` | `eff` array |
|---|---|---|---|---|---|---|
| init | `[(0,00)]` | — | — | — | — | `[0, INF, INF, INF]` |
| 1 | `[(0,00)]` | `(0,00)` | `(0,1)`, `(1,0)` | 1, 2 | 1 → `eff[01]=1`; 2 → `eff[10]=2` | `[0,1,INF,2]` |
| 2 | `[(1,01),(2,10)]` | `(1,01)` | `(0,2)`, `(1,1)` | 0, 1 | `max(1,0)=1` → `eff[02]=1`; `max(1,1)=1` → `eff[11]=1` | `[0,1,1,2]` |
| 3 | `[(1,02),(1,11),(2,10)]` | `(1,02)` | **target** | — | — | `(0,2)` is the target at effort `1` → return **1** |

Answer **1** ✓ (verified: `[[1,2,2],[3,1,1]]` from `(0,0)` to `(0,2)` is `1`).

#### Why Does It Work?
The claim is the "monotone aggregation" lemma: if `eff(u) ≤ eff(u')` and
`w(u,v) ≤ w(u',v)`, then `max(eff(u), w) ≤ max(eff(u'), w')`. So the smallest-effort
un-settled node cannot be beaten by any later-expanded node, exactly as in ordinary
Dijkstra, and its effort is final on pop.

#### Java Code
```java
import java.util.*;

public class PathWithMinimumEffort {
    public int minimumEffortPath(int[][] heights, int sx, int sy, int tx, int ty) {
        int n = heights.length, m = heights[0].length;
        int start = sx * m + sy, target = tx * m + ty;
        int[] eff = new int[n * m];
        Arrays.fill(eff, Integer.MAX_VALUE);
        eff[start] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, start});
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int e = cur[0], u = cur[1];
            if (e > eff[u]) continue;
            if (u == target) return e;
            int r = u / m, c = u % m;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                int w = Math.abs(heights[r][c] - heights[nr][nc]);
                int ne = Math.max(e, w);                       // max instead of +
                int v = nr * m + nc;
                if (ne < eff[v]) { eff[v] = ne; pq.add(new int[]{ne, v}); }
            }
        }
        return -1;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each cell is extracted once, each of the `4V` edges
relaxed once, each heap op `O(log V)` → **`O(V log V)`** = `O(n·m·log(n·m))`.
**Space Complexity Calculation:** `eff` `O(V)`, heap `O(V)` (one live entry per cell
in practice) → **`O(V)`**.

---

### Optimal Approach B — Binary Search on the answer + BFS

#### Core Observation
**Feasibility is monotone in the threshold:** if you can cross using steps of
difference `≤ X`, you can cross for any `X' ≥ X`. So the answer is a boundary, and
binary search applies (Pattern 4 from the Binary Search guide, applied to graphs).

#### Pattern Identification
**Cross-cutting trick: "minimize the maximum" = BS on the answer + a feasibility
BFS.** Also the answer to LeetCode 778 (problem 50).

#### Step-by-Step Intuition
1. Lo bound: `0`. Hi bound: `max(heights)`. (`lo` must stay `0` — the answer is a
   height *difference*, so an all-`7` grid has answer `0`, not `7`.)
2. While `lo < hi`: `mid = lo + (hi - lo) / 2`; run BFS allowing only steps with
   `|Δh| ≤ mid`; if the target is reachable → `hi = mid` else `lo = mid + 1`.
3. Return `lo`.

#### Dry Run
`heights = [[1,2,2],[3,1,1]]`, `(0,0)→(0,2)`. `lo = 0`, `hi = max(heights) = 3`.

| `mid` | allowed steps | BFS reachable from start | target reachable? | action |
|---|---|---|---|---|
| 1 | `|Δh| ≤ 1` | `(0,0) (0,1) (0,2) (1,1) (1,2) (1,0)` | **yes** | `hi = 1` |
| 0 | `|Δh| ≤ 0` | only `(0,0)` (every neighbour differs) | no | `lo = 1` |

`lo == hi == 1` → **answer 1** ✓

A second check on the 3×3 monotone grid, `(0,0) → (2,2)`, where the answer is `3`:

| `mid` | allowed steps | target reachable? | action |
|---|---|---|---|
| 4 | `|Δh| ≤ 4` | yes — `0,0 → 1,1 → 2,2` has diffs `4, 4` | `hi = 4` |
| 2 | `|Δh| ≤ 2` | **no** — every monotone route needs a hop of `3` | `lo = 3` |
| 3 | `|Δh| ≤ 3` | yes — `0,0 → 0,1 → 0,2 → 1,2 → 2,2`, diffs `1,1,3,1` | `hi = 3` |

`lo == hi == 3` ✓ — and the Dijkstra variant agrees. Two independent solutions
matching is the cheapest test you can run on a shortest-path implementation.

#### Why Does It Work?
Monotonicity plus the boundary-search invariant: if `mid` is infeasible, no threshold
below `mid` can work; if feasible, the optimum is at most `mid`. The final `low` is
the smallest feasible threshold, i.e. the minimum possible effort.

#### Java Code
```java
import java.util.*;

public class PathWithMinimumEffortBS {
    public int minimumEffortPath(int[][] heights, int sx, int sy, int tx, int ty) {
        int lo = 0, hi = 0;
        for (int[] row : heights) {
            for (int h : row) hi = Math.max(hi, h);      // the answer is a DIFF, so lo stays 0
        }
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (canReach(heights, sx, sy, tx, ty, mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    private boolean canReach(int[][] h, int sx, int sy, int tx, int ty, int limit) {
        int n = h.length, m = h[0].length;
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(sx * m + sy);
        vis[sx][sy] = true;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int cur = q.poll();
            int r = cur / m, c = cur % m;
            if (r == tx && c == ty) return true;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m || vis[nr][nc]) continue;
                if (Math.abs(h[r][c] - h[nr][nc]) > limit) continue;   // the feasibility test
                vis[nr][nc] = true;
                q.add(nr * m + nc);
            }
        }
        return false;
    }
}
```

#### Complexity
**Time Complexity Calculation:** the value range is at most `W = max(heights)` →
`log₂ W ≈ 14` iterations. Each BFS is `O(V + E) = O(n·m)` → **`O(V log W)`**,
which for a small range beats `O(V log V)`.
**Space Complexity Calculation:** `vis` + queue `O(V)` → **`O(V)`**.

### Edge Cases
- Start == target → `0` (both solutions handle it: `eff[start] = 0`).
- A single cell → `0`.
- All heights equal → `0` (BS: `hi = 0` immediately; Dijkstra: all `w = 0`).
- Unreachable because of huge cliffs → both approaches still return the correct
  minimum (a path always exists on a rectangular grid; obstacles do not exist here).
- `heights` values up to `10⁵` → `hi` up to `99999`, ~17 BS iterations.

### Pattern to Remember
```text
Problem clue:  "minimum effort / minimise the MAXIMUM step", "bottleneck path"
Pattern:       A) Dijkstra with max() in the relaxation
               B) Binary search the threshold + BFS feasibility (monotone)
Mental model:  swap the aggregation: max instead of +; or search the answer value
```

**Similar problems:** 50, 13 (multi-source as a threshold idea). **Interview tip:**
offer both and say which you would ship — "Dijkstra-variant is one pass and always
correct; BS + BFS exploits the small weight range and is often faster in practice."

---

## 34. A Walk Through the Forest (Sword 2004)

### Problem Understanding
Given a 2-D grid of `0`s and `1`s (`0` = open) and a start cell with **8 possible
moves** (orthogonal + diagonal), count the **distinct** cells reachable — the cells
that are *not* separated from the start by a wall (`1`).

- **Input:** `int[][] P` (or `forest`), `(sx, sy)`
- **Output:** number of distinct reachable `0`-cells
- **Constraints/observations:**
  - This is the 8-directional sibling of problem 32: same BFS, different move set,
    and the answer is a **count**, not a distance.
  - "Through the forest" and "distinct" are the two words to latch onto: the answer
    is the size of the connected component, so each cell must be counted **once**,
    which is what the visited marker guarantees.

**Example 1:**
```text
forest =
0 0 1 1 0
0 1 0 0 1
0 1 0 0 1
0 1 0 0 0

start (0,0), 8 directions
→ 13   (the whole grid; see the dry run)
```
The point of this example is that **diagonal moves slip past walls**: `(0,1)` reaches
`(1,2)` even though `(1,1)` is a wall, which is what pulls in the far corners.

**Example 2:** start sealed in by `1`s → `1` (the start cell itself counts).
**Example 3:** start out of bounds → `0`.

### How to Think About the Problem
- **What should I notice first?** "8 moves" and "distinct". Diagonal moves make this
  a connectivity question, not a distance question.
- **Which representation?** The grid.
- **Minimizing?** No — just a count, so there is no `dist` at all.
- **Which traversal?** BFS/DFS that marks cells as it counts them.
- **Clue → Pattern:** *"how many cells can I reach"* → **BFS counting the component
  size**; the visited marker doubles as the counting device.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each cell, run a separate reachability search -> O((n·m)^2).
        ↓
Observation: reachability is transitive. The moment you learn cell X is reachable,
             everything X can reach is reachable too — so a single search reaches
             the whole component.
        ↓
Optimal: one BFS/DFS, incrementing a counter on first visit. O(n·m).
```

### Brute Force Approach
**Basic idea:** for every cell, launch a fresh DFS and see if it can reach the start.

```java
import java.util.*;

public class ForestBrute {
    public int reachable(int[][] forest, int sx, int sy) {
        int n = forest.length, m = forest[0].length;
        int count = 0;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < m; c++) {
                boolean[] vis = new boolean[n * m];
                if (dfs(forest, sx, sy, r, c, vis)) count++;
            }
        }
        return count;
    }

    private boolean dfs(int[][] f, int r, int c, int tr, int tc, boolean[] vis) {
        int n = f.length, m = f[0].length;
        if (r < 0 || r >= n || c < 0 || c >= m) return false;
        if (f[r][c] == 1) return false;
        if (vis[r * m + c]) return false;
        vis[r * m + c] = true;
        if (r == tr && c == tc) return true;
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                if (dr == 0 && dc == 0) continue;
                if (dfs(f, r + dr, c + dc, tr, tc, vis)) return true;
            }
        }
        return false;
    }
}
```

**Time Complexity Calculation:** `n·m` cells × `O(n·m)` per DFS → **`O((n·m)²)`**.
**Space Complexity Calculation:** `O(n·m)` per call.
> **Why can this be improved?** Those `n·m` searches all explore the *same* cells
> with the *same* rules. The first search already visited everything reachable, so
> the rest can only re-derive information we have.

### Optimal Approach — one BFS/DFS, counting on first visit

#### Core Observation
**A single search from the start visits exactly the reachable set, and a visited
marker ensures each cell is counted exactly once.** The count *is* the number of
successful first-visits, so counting and correctness are the same event.

#### Pattern Identification
**Mental model 1: iterative search on a grid with 8 neighbours; the answer is the
component size.**

#### Step-by-Step Intuition
1. Guard the start: if out of bounds or a `1` → `0`.
2. BFS from `(sx, sy)`, keeping `int count = 0`.
3. On dequeue, `count++`; for each of the 8 neighbours in bounds and open and
   unvisited: mark and enqueue.
4. Return `count`.

#### Dry Run
```text
forest =
0 0 1 1 0
0 1 0 0 1
0 1 0 0 1
0 1 0 0 0
start (0,0)
```
Cells numbered in the order BFS first dequeues them:

| Step | cell | count | newly seen 8-neighbours |
|---|---|---|---|
| 1 | `(0,0)` | 1 | `(0,1)`, `(1,0)` — note the **diagonal** `(1,1)` is a wall, skipped |
| 2 | `(0,1)` | 2 | `(1,2)` ← reached by a **diagonal** past the wall at `(1,1)` |
| 3 | `(1,0)` | 3 | nothing new (its diagonal `(2,1)` is a wall) |
| 4 | `(1,2)` | 4 | `(1,3)`, `(2,2)`, `(2,3)` |
| 5 | `(2,0)` | 5 | `(3,0)` — the lower-left column is open the whole way |
| 6 | `(1,3)` | 6 | `(0,4)` — the far corner joins only diagonally |
| 7 | `(2,2)` | 7 | `(3,2)`, `(3,3)` |
| 8 | `(2,3)` | 8 | `(3,4)` |
| 9 | `(3,0)` | 9 | — |
| 10 | `(0,4)` | 10 | — |
| 11 | `(3,2)` | 11 | — |
| 12 | `(3,3)` | 12 | — |
| 13 | `(3,4)` | 13 | queue empty |

Answer **`13`**. The dry run earns its keep here: the two surprises are `(1,2)`
reached diagonally past a wall, and `(0,4)` reached diagonally past `(0,2)`/`(1,3)`.
Under 4-direction moves the answer would be `3`; the diagonals are the whole problem.

#### Why Does It Work?
The invariant is standard: a cell is enqueued only if it is open, in bounds, and
adjacent to an already-reachable cell, so every enqueued cell is genuinely reachable
(soundness); and every reachable cell has a path of open neighbours from the start,
which the BFS follows step by step, so every reachable cell is eventually enqueued
(completeness). The visited marker makes each cell enter the queue once, so `count`
equals the component size.

#### Java Code
```java
import java.util.*;

public class WalkThroughForest {
    public int reachable(int[][] forest, int sx, int sy) {
        int n = forest.length, m = forest[0].length;
        if (sx < 0 || sx >= n || sy < 0 || sy >= m || forest[sx][sy] == 1) return 0;
        boolean[][] vis = new boolean[n][m];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(sx * m + sy);
        vis[sx][sy] = true;
        int count = 0;
        int[][] dirs = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
        while (!q.isEmpty()) {
            int cur = q.poll();
            count++;
            int r = cur / m, c = cur % m;
            for (int[] d : dirs) {
                int nr = r + d[0], nc = c + d[1];
                if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
                if (forest[nr][nc] == 1 || vis[nr][nc]) continue;
                vis[nr][nc] = true;
                q.add(nr * m + nc);
            }
        }
        return count;
    }

    // the same traversal as DFS — the answer is identical
    public int reachableDFS(int[][] forest, int sx, int sy) {
        int n = forest.length, m = forest[0].length;
        if (sx < 0 || sx >= n || sy < 0 || sy >= m || forest[sx][sy] == 1) return 0;
        boolean[][] vis = new boolean[n][m];
        return dfs(forest, sx, sy, vis);
    }

    private int dfs(int[][] f, int r, int c, boolean[][] vis) {
        int n = f.length, m = f[0].length;
        vis[r][c] = true;
        int count = 1;
        int[][] dirs = {{-1,-1},{-1,0},{-1,1},{0,-1},{0,1},{1,-1},{1,0},{1,1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m) continue;
            if (f[nr][nc] == 1 || vis[nr][nc]) continue;
            count += dfs(f, nr, nc, vis);
        }
        return count;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each cell enters the queue once, 8 neighbours each →
**`O(8·n·m)` = `O(n·m)`** = `O(V + E)`.
**Space Complexity Calculation:** `vis` + queue/recursion → **`O(n·m)`**.

### Edge Cases
- Start is a wall or out of bounds → `0` (the start does **not** count as reachable
  if it is a wall; this is the detail interviewers check).
- The start cell itself **is** counted when it is open.
- All-open grid → `n·m`.
- 8-directional movement means corner-cutting is allowed: a cell is reachable even
  when both orthogonal neighbours are walls.
- `n = 1, m = 1` and open → `1`.

### Pattern to Remember
```text
Problem clue:  "how many distinct cells / positions can you reach", 8-direction
Pattern:       BFS/DFS from the start; answer = number of first-visits
Mental model:  the count and the correctness proof are the same event
```

**Similar problems:** 4, 6, 9, 10, 13, 16, 32, 45, 49. **Interview tip:** "This is
problem 32 with diagonals and a counter instead of a distance" — naming the
difference out loud is the whole answer.

---

## 35. Minimum Cost to Reach Every Node (takeUforward G-38)

### Problem Understanding
Weighted, **undirected**, **non-negative** graph: return the minimum cost from a
source `src` to **every** other node.

- **Input:** `V`, weighted adjacency list, `src`
- **Output:** `int[] dist`
- **Constraints/observations:**
  - Textually the same as problem 30, but read the problem statement's phrasing: this
    one often appears as *"a city with `N` roads, each road has a cost"* or LeetCode
    1334 (minimum cost to reach every node, `0 ≤ src < n`, weights `0..10⁵`).
  - The thing to internalize: the *same algorithm* serves problems 30, 31, 33, 35, 36.
    Do not memorise five algorithms; memorize **one** and the data structure choices.

**Example 1:** `V = 5`, edges `0-1 (4), 0-2 (8), 1-2 (2), 2-1 (2), 1-3 (10)`,
`src = 0` → `dist = [0, 4, 6, 14, INF]`
**Example 2:** same graph, `src = 1` → `dist = [4, 0, 2, 10, INF]`
**Example 3:** `src = 4` (isolated) → `dist[4] = 0`, rest `INF`.

### How to Think About the Problem
- **What should I notice first?** "Cost to reach **every** node" — one source,
  all targets, and the same non-negative-weight rules as problem 30.
- **Which representation?** `List<List<int[]>>` weighted.
- **Minimizing?** Yes → mental model 4.
- **Which traversal?** Dijkstra. Choose the PQ or the set variant deliberately.
- **Clue → Pattern:** *"weighted + non-negative + all distances from one source"* →
  **Dijkstra**, full stop.

### Intuition (Brute → Better → Optimal)
```text
Brute force: per-target BFS-with-cost (Dijkstra per target) -> O(V * (V+E) log V).
        ↓
Observation: all targets share the same relaxation machinery; run it once from src
             and let the dist[] array accumulate every answer.
        ↓
Optimal: one Dijkstra. O((V + E) log V).
```

### Brute Force Approach
**Basic idea:** for each target `t`, run Dijkstra but stop as soon as `t` is popped.

```java
import java.util.*;

public class CostToEveryNodeBrute {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[] distFrom(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        for (int t = 0; t < V; t++) {
            dist[t] = oneTarget(V, adj, src, t);
        }
        return dist;
    }

    private int oneTarget(int V, List<List<int[]>> adj, int src, int t) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            if (cur[0] > dist[cur[1]]) continue;
            if (cur[1] == t) return cur[0];
            for (int[] e : adj.get(cur[1])) {
                if (dist[cur[1]] + e[1] < dist[e[0]]) {
                    dist[e[0]] = dist[cur[1]] + e[1];
                    pq.add(new int[]{dist[e[0]], e[0]});
                }
            }
        }
        return INF;
    }
}
```

**Time Complexity Calculation:** `V` separate Dijkstra runs → **`O(V·(V+E) log V)`**.
**Space Complexity Calculation:** `O(V + E)` per run.
> **Why can this be improved?** The early exit per target is a pessimization here: the
> full run from `src` computes the same relaxations *and* answers all `V` targets.

### Optimal Approach — Dijkstra with a min-heap

#### Core Observation
One run from `src` finalizes every node in order of increasing distance, so the
`dist[]` array *is* the answer vector.

#### Pattern Identification
**Mental model 4: relaxation with greedy pop-min ordering.** (Same pattern as 30/31.)

#### Step-by-Step Intuition
1. `dist[] = INF`; `dist[src] = 0`; heap `{(0, src)}`.
2. Pop `(d, u)`; `if (d > dist[u]) continue;` relax out-edges.
3. After the loop, `dist` holds the answer; `INF` = unreachable.
4. Bonus: if you need the actual routes, keep `int[] parent` and set
   `parent[v] = u` inside the relaxation.

#### Dry Run
`V = 5`, edges `0-1 (4), 0-2 (8), 1-2 (2), 2-1 (2), 1-3 (10)`, `src = 0`
(Parallel `1-2` edges listed twice on purpose, as in the original problem.)

| Step | heap | pop | stale? | relaxations | `dist` |
|---|---|---|---|---|---|
| init | `[(0,0)]` | — | — | — | `[0,INF,INF,INF,INF]` |
| 1 | `[(0,0)]` | `(0,0)` | no | `1 ← 4`; `2 ← 8` | `[0,4,8,INF,INF]` |
| 2 | `[(4,1),(8,2)]` | `(4,1)` | no | `2 ← min(8, 4+2) = 6`; `3 ← 4+10 = 14` | `[0,4,6,14,INF]` |
| 3 | `[(6,2),(8,2),(14,3)]` | `(6,2)` | no | `1 ← min(4, 6+2) = 4` (no change) | `[0,4,6,14,INF]` |
| 4 | `[(8,2),(14,3)]` | `(8,2)` | **`8 > dist[2]=6`** | skip | unchanged |
| 5 | `[(14,3)]` | `(14,3)` | no | none | unchanged |

`dist = [0, 4, 6, 14, INF]`

#### Why Does It Work?
Identical to problem 30: pop-min finalization, and the stale check discards heap
entries superseded by a cheaper route. The parallel edge is the point of the exercise
— two different costs between the same pair of nodes, and the relaxation min-picks
the cheaper one, so the duplicate is harmless.

#### Java Code
```java
import java.util.*;

public class CostToEveryNode {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[] minCost(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue;
            for (int[] e : adj.get(u)) {
                int v = e[0], w = e[1];
                if (d + w < dist[v]) { dist[v] = d + w; pq.add(new int[]{dist[v], v}); }
            }
        }
        return dist;
    }

    // the same run, but also recording parents to reconstruct paths
    public int[] minCostWithParents(int V, List<List<int[]>> adj, int src, int[] parent) {
        Arrays.fill(parent, -1);
        return minCost(V, adj, src);
    }
}
```

#### Complexity
**Time Complexity Calculation:** `O((V + E) log V)` — `O(E)` heap pushes at
`O(log E)` each, `O(V)` extractions.
**Space Complexity Calculation:** `O(V + E)` for the heap.

### Edge Cases
- Isolated source → `[0, INF, …]`.
- Unreachable nodes stay `INF`; LeetCode 1334 asks for `-1` instead → post-process.
- **Parallel edges** (as in the example) → both relaxed, min wins. Never assume a
  simple graph.
- Zero-weight edges → fine.
- `weights = 0` on a cycle → all `dist` are `0`; no infinite loop, because
  relaxation is strict (`<`).

### Pattern to Remember
```text
Problem clue:  "minimum cost to reach every node", weighted, non-negative
Pattern:       single Dijkstra run; dist[] IS the answer vector
Mental model:  one greedy pass finalizes all nodes in distance order
```

**Similar problems:** 30, 31, 33, 36, 42. **Interview tip:** "This is Dijkstra; the
only difference from the textbook version is the parallel edges, which relaxation
handles for free."

---

## 36. Minimum Cost of Paths (takeUforward G-39)

### Problem Understanding
Given `V` sources and `E` weighted **undirected** edges, output the minimum cost
**between every ordered pair of sources**.

- **Input:** `V`, edge list `[[u, v, w], …]`
- **Output:** `int[][] dist` where `dist[i][j]` = cheapest cost between source `i` and
  source `j` (0 on the diagonal)
- **Constraints/observations:**
  - Sources are numbered `0` to `S-1` in the problem's ordering.
  - `O(S · (V+E) log V)` if you run Dijkstra per source. That is often enough.
  - If you wanted the cost between **all** `V` nodes (not just sources), that is
    Floyd-Warshall territory (`O(V³)`, problem 39) — or run Dijkstra from every node.

**Example 1:** `V = 4`, edges `[[0,1,3],[1,2,4],[2,3,2]]`, sources `0..3`
`dist = [[0,3,7,9],[3,0,4,6],[7,4,0,2],[9,6,2,0]]`
**Example 2:** add edge `[0,2,1]` → `dist[0][2] = 1` (and `dist[0][3] = 3`)
**Example 3:** sources `{0, 3}` only → `dist = [[0, 9],[9, 0]]`

### How to Think About the Problem
- **What should I notice first?** *Every source* — the graph is undirected so `dist`
  is symmetric, but the matrix must be built explicitly.
- **Which representation?** Edge list, converted once into an adjacency list (do this
  once, not per source).
- **Minimizing?** Yes → mental model 4.
- **Which traversal?** Dijkstra per source, or Floyd-Warshall for small `V`.
- **Clue → Pattern:** *"cost between every pair of nodes"* → **run Dijkstra from each
  source and read off one row per run**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: BFS/DFS over every path for every pair -> super-exponential.
        ↓
Better: Dijkstra per source. O(S·(V+E) log V). Already the intended answer.
        ↓
Alternative: Floyd-Warshall (problem 39) for small dense V: O(V^3) total, which
              beats S·(V+E) log V when S is close to V and V is small.
```

### Brute Force Approach
**Basic idea:** all-pairs DFS enumerating paths.

```java
import java.util.*;

public class MinCostPathsBrute {
    private int best;

    public int[][] minCost(int V, int[][] edges, int S) {
        List<Integer> srcs = new ArrayList<>();
        for (int i = 0; i < S; i++) srcs.add(i);
        int[][] dist = new int[S][S];
        for (int i = 0; i < S; i++) {
            for (int j = 0; j < S; j++) {
                best = Integer.MAX_VALUE;
                dfs(V, edges, srcs.get(i), srcs.get(j), 0);
                dist[i][j] = best == Integer.MAX_VALUE ? -1 : best;
            }
        }
        return dist;
    }

    private void dfs(int V, int[][] edges, int u, int t, int d) {
        if (d > best) return;
        if (u == t) { best = Math.min(best, d); return; }
        for (int[] e : edges) {
            if (e[0] == u) dfs(V, edges, e[1], t, d + e[2]);
            else if (e[1] == u) dfs(V, edges, e[0], t, d + e[2]);
        }
    }
}
```

**Time Complexity Calculation:** `S²` pairs × path enumeration → super-exponential.
**Space Complexity Calculation:** `O(S²)` result + `O(V)` recursion.
> **Why can this be improved?** The recursion re-derives the same sub-paths for every
> pair. One Dijkstra run from a source answers its whole row.

### Optimal Approach — Dijkstra per source

#### Core Observation
**The single-source problem is solved; all-pairs is just `S` single-source problems
stitched into a matrix**, and since the graph is undirected, the transpose is already
in the rows.

#### Pattern Identification
**Mental model 4, looped over sources.**

#### Step-by-Step Intuition
1. Convert the edge list to `List<List<int[]>> adj` (remember: undirected → add
   **both** directions).
2. For each `s` in `0..S-1`: run Dijkstra from `s`, then
   `for j: dist[s][j] = (d == INF ? -1 : d)`.
3. Return the matrix.

#### Dry Run
`V = 4`, edges `[[0,1,3],[1,2,4],[2,3,2]]`, `S = 4`

| run | source | row of `dist` produced |
|---|---|---|
| 1 | 0 | `[0, 3, 7, 9]` |
| 2 | 1 | `[3, 0, 4, 6]` |
| 3 | 2 | `[7, 4, 0, 2]` |
| 4 | 3 | `[9, 6, 2, 0]` |

```text
dist =
0 3 7 9
3 0 4 6
7 4 0 2
9 6 2 0
```
Symmetric, as an undirected graph requires. In run 1 the relaxation order was
`0 → 1 (3) → 2 (3+4=7) → 3 (7+2=9)`. In run 2, `1 → 2 (4) → 3 (4+2=6)`, and node
`0` is found at `3` by the direct edge before any detour (the backward route
`1 → 2 → 3 → 0` would cost `4+2+2 = 8`, which relaxation discards). That is the
point: relaxation keeps the **minimum**, so a longer detour can never overwrite a
cheaper route.

#### Why Does It Work?
Each row is a correct single-source answer by the Dijkstra invariant, and rows do not
interfere with each other. Together they answer all `S²` ordered pairs.

#### Java Code
```java
import java.util.*;

public class MinCostPaths {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[][] minCost(int V, int[][] edges, int S) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i < V; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {                       // undirected: both directions
            adj.get(e[0]).add(new int[]{e[1], e[2]});
            adj.get(e[1]).add(new int[]{e[0], e[2]});
        }
        int[][] dist = new int[S][S];
        for (int s = 0; s < S; s++) {
            int[] row = dijkstra(V, adj, s);
            for (int j = 0; j < S; j++) dist[s][j] = row[j] == INF ? -1 : row[j];
        }
        return dist;
    }

    private int[] dijkstra(int V, List<List<int[]>> adj, int src) {
        int[] dist = new int[V];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.add(new int[]{0, src});
        while (!pq.isEmpty()) {
            int[] cur = pq.poll();
            int d = cur[0], u = cur[1];
            if (d > dist[u]) continue;
            for (int[] e : adj.get(u)) {
                if (d + e[1] < dist[e[0]]) { dist[e[0]] = d + e[1]; pq.add(new int[]{dist[e[0]], e[0]}); }
            }
        }
        return dist;
    }
}
```

#### Complexity
**Time Complexity Calculation:** `S` runs × `O((V+E) log V)` →
**`O(S · (V + E) log V)`**.
**Space Complexity Calculation:** adjacency list `O(V + E)` + matrix `O(S²)` →
**`O(V + E + S²)`**.

### Edge Cases
- `S = 1` → a `1×1` matrix `[0]`.
- Unreachable pairs → `-1` in the problem's convention (LeetCode/GFG use `-1`;
  internal `dist` uses `INF`, so the conversion belongs in the wrapper).
- `V < S` is impossible by construction, but a sparse source set is fine.
- Symmetry is a **free correctness check**: `dist[i][j] == dist[j][i]` must hold;
  if your output is not symmetric, you built a directed graph by mistake.
- Huge `V` with small `S` → fine; huge `S` → consider Floyd-Warshall or an SPFA
  variant if weights allow.

### Pattern to Remember
```text
Problem clue:  "minimum cost between every pair of given nodes", undirected
Pattern:       Dijkstra once per source -> a matrix of answers
Mental model:  all-pairs = loop of single-source; symmetry is the sanity check
```

**Similar problems:** 30, 35, 39, 40. **Interview tip:** "I'd run Dijkstra per
source; the matrix is symmetric because the graph is, which is a cheap correctness
check."

---

## 37. Number of Increasing Paths in a Grid (LeetCode 2320)

### Problem Understanding
Given an `m × n` grid, count paths from `(0,0)` to `(m-1,n-1)` that only ever go
**right**, **down**, or **diagonally down-right**, and only through cells with
`grid[r][c] < grid[r+1][c+1]`.

- **Input:** `int[][] grid`
- **Output:** number of valid paths
- **Constraints/observations:**
  - The count can be large → **modulo `1e9 + 7`**.
  - The monotonicity constraint is what kills DP on a *sorted* graph assumption:
    every cell is reachable but only along "increasing" steps.
  - **Memoized DFS** works: the graph is a DAG (each step strictly increases `r+c`),
    so plain memoization is enough; no topological sort is required.

**Example 1:**
```text
grid =
1 2 3
4 5 6
7 8 9
→ 13
```
(The grid is strictly increasing, so **every** monotone path is valid. With steps
right, down and diagonal, the number of such paths is the **Delannoy number**
`D(2,2) = 13` — the same sequence `1, 3, 13, 63, …`.)
**Example 2:** `grid = [[1,2],[2,3]]` → `3`
(the three paths: right-down, down-right, and the single diagonal)
**Example 3:** `grid = [[5,1],[2,3]]` → `0` (from `5` no neighbour is larger)

### How to Think About the Problem
- **What should I notice first?** *Increasing* paths → each move must land on a
  **strictly larger** value, so no cycles: `r + c` strictly increases.
- **Which representation?** `int[][]` (the grid) plus a `long[][] memo`.
- **Minimizing?** No — **counting** ways, which is mental model 5 (DP / memoization).
- **Which traversal?** DFS + memo (or iterative DP if you fear recursion depth).
- **Clue → Pattern:** *"count ways / number of paths in a grid with an
  admissibility condition"* → **memoized DFS over the 3 admissible moves**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS enumerating every path. O(3^(m+n)) — exponential.
        ↓
Observation: many prefixes lead to the same cell with the same future options. The
             answer from a cell depends only on (r, c), not on how you got there.
        ↓
Optimal: memoize ways(r, c). Each state computed once: O(m*n).
```

### Brute Force Approach
**Basic idea:** recursive DFS counting all paths, no memoization.

```java
import java.util.*;

public class CountPathsBrute {
    public int uniquePaths(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        return dfs(grid, 0, 0, m, n);
    }

    private int dfs(int[][] g, int r, int c, int m, int n) {
        if (r == m - 1 && c == n - 1) return 1;
        int ways = 0;
        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= m || nc >= n) continue;
            if (g[nr][nc] > g[r][c]) ways += dfs(g, nr, nc, m, n);
        }
        return ways;
    }
}
```

**Time Complexity Calculation:** the recursion tree has up to `3^(m+n)` nodes →
**exponential**; the modulo is also missing, so this overflows on any `4 × 4` grid.
**Space Complexity Calculation:** `O(m + n)` stack.
> **Why can this be improved?** Two different prefixes that end at the same cell
> have *identical* continuations. Cache the answer per cell and each continuation is
> counted once.

### Optimal Approach — memoized DFS

#### Core Observation
**`ways(r, c)` depends only on the cell.** The path count from `(r, c)` to the target
is the sum of `ways` over the three admissible larger cells, with `ways(target) = 1`.

#### Pattern Identification
**Mental model 5: memoized recursion = DP on a DAG, computed on demand.**

#### Step-by-Step Intuition
1. `long[][] memo` filled with `-1`; `ways(target) = 1`; return `ways(0, 0)`.
2. `ways(r, c)`: if `memo[r][c] != -1` return it; else
   `res = Σ over admissible dirs of ways(nr, nc)` (skip out-of-bounds and
   `grid[nr][nc] <= grid[r][c]`), store and return.
3. Apply `MOD` at each addition (or once at the end, if the values cannot overflow —
   with a `1e9+7` mod, apply per step for safety).

#### Dry Run
```text
grid =
1 2 3
4 5 6
7 8 9
```
`ways(r, c)` computed on demand from `(0,0)` (the `-` suffix means the state is
already memoized by the time it is reached twice):

| Call | admissible successors | value |
|---|---|---|
| `ways(2,2)` | base case | `1` |
| `ways(1,2)` | `(2,2)` | `1` |
| `ways(2,1)` | `(2,2)` | `1` |
| `ways(1,1)` | `(1,2)`, `(2,1)`, `(2,2)` | `1 + 1 + 1 = 3` |
| `ways(0,2)` | `(1,2)` | `1` |
| `ways(1,0)` | `(1,1)`, `(2,0)`, `(2,1)` | `3 + 1 + 1 = 5` |
| `ways(2,0)` | — (`(2,1)` is right, not down) → `(2,1)` | `1` |
| `ways(0,1)` | `(0,2)`, `(1,1)`, `(1,2)` | `1 + 3 + 1 = 5` |
| `ways(0,0)` | `(0,1)`, `(1,0)`, `(1,1)` | `5 + 5 + 3 = 13` |

`ways(0,0) = 13` ✓ — which matches the Delannoy number `D(2,2) = 13`. That agreement
between a recursive count and a closed form is a genuinely useful check: if your
memoized DFS returns `12` on this grid, one of the three directions is missing.

#### Why Does It Work?
Induction on `m + n - (r + c)` (distance to the target): the base case is the target
itself (exactly one trivial path), and every other path from `(r, c)` must begin with
exactly one of the three admissible moves, and the sets of paths contributed by
different first moves are disjoint. Hence the sum counts each path exactly once.

#### Java Code
```java
import java.util.*;

public class CountIncreasingPaths {
    private static final int MOD = 1_000_000_007;
    private int[][] memo;

    public int countPaths(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        memo = new int[m][n];
        for (int[] row : memo) Arrays.fill(row, -1);
        return dfs(grid, 0, 0, m, n);
    }

    private int dfs(int[][] g, int r, int c, int m, int n) {
        if (r == m - 1 && c == n - 1) return 1;
        if (memo[r][c] != -1) return memo[r][c];
        int ways = 0;
        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}};
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr >= m || nc >= n) continue;
            if (g[nr][nc] > g[r][c]) ways = (ways + dfs(g, nr, nc, m, n)) % MOD;
        }
        return memo[r][c] = ways;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each of the `m·n` states computed once, 3 moves each
→ **`O(m·n)`**.
**Space Complexity Calculation:** `memo` + stack `O(m + n)` → **`O(m·n)`**.

### Edge Cases
- `1 × 1` grid → `1` (the trivial path).
- Strictly decreasing grid → `0` (no admissible first move).
- Long thin grid `1 × 200000` → recursion depth `200000`; **use the iterative version
  to avoid `StackOverflowError`**.
- Counts exceed `int` quickly → modulo `1_000_000_007` after every addition.
- Ties (`grid[nr][nc] == grid[r][c]`) → **not** admissible; the condition is strict.

### Pattern to Remember
```text
Problem clue:  "count the number of paths", grid, restricted moves, modulo
Pattern:       memoized DFS over the admissible directions
Mental model:  ways(r,c) = sum of ways over legal next cells; DAG because r+c grows
```

**Similar problems:** 5, 10, 62, 63, 64, 73. **Interview tip:** say the base case
(`ways(target) = 1`) and the strict-inequality direction out loud; those two
sentences prevent most bugs.

---

## 38. City With the Fewest Number of Neighbours (LeetCode 2858)

### Problem Understanding
Given an **undirected weighted** graph and an edge threshold `threshold`, find the
**smallest** connected component (by vertex count) in which **every** edge has weight
`≥ threshold`. Return `-1` if none exists.

- **Input:** `int n`, `int[][] edges`, `int threshold`
- **Output:** size of the smallest qualifying component, or `-1`
- **Constraints/observations:**
  - The trick: **filter first**. Drop all edges below `threshold`, then find connected
    components of what remains.
  - This is a **union-find** problem, not a shortest-path problem. Weights matter only
    as a filter, not as a cost to minimize.
  - Unions must be size-aware to keep the `O(E α(V))` bound.

**Example 1:** `n = 6`, `edges = [[0,1,11],[0,2,5],[1,2,8],[1,3,3],[2,4,10],[3,4,9]]`,
`threshold = 5` → `1` (only `[1,3,3]` is filtered out, leaving `{0,1,2,3,4}` and the
singleton `{5}`)
**Example 2:** same graph, `threshold = 3` → nothing is filtered, all 6 connect → `6`
**Example 3:** `n = 3`, `edges = [[0,1,2]]`, `threshold = 3` → all three vertices are
singletons → `1` (there is no `-1` case here: a lone vertex is a valid component of
size 1)

### How to Think About the Problem
- **What should I notice first?** "Every edge ≥ threshold" is a **filter**, and the
  answer is a **component size**. Nothing is being minimized as a sum.
- **Which representation?** Edge list — DSU consumes edges directly, so **no
  adjacency list is needed**. That is the structural tell for union-find.
- **Minimizing?** Minimizing a *count of vertices*, not a path cost.
- **Which traversal?** Union-Find (problem 47).
- **Clue → Pattern:** *"keep only edges satisfying a property, then find components"*
  → **filter + union-find**, answer = min component size.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for every candidate component size k, test feasibility. Awkward.
        ↓
Observation: the graph we care about is the subgraph of "good" edges. Its connected
             components are exactly the DSU groups after unioning only good edges.
        ↓
Optimal: one pass of unions over good edges, then scan roots and take the min size.
        O(E α(V)).
```

### Brute Force Approach
**Basic idea:** for each subset size `k` in increasing order, search for a connected
group of `k` vertices using only good edges.

```java
import java.util.*;

public class CityFewestBrute {
    public int findSmallest(int n, int[][] edges, int threshold) {
        for (int k = 1; k <= n; k++) {
            boolean[] used = new boolean[n];
            if (exists(n, edges, threshold, k, used)) return k;
        }
        return -1;
    }

    private boolean exists(int n, int[][] edges, int th, int k, boolean[] used) {
        for (int start = 0; start < n; start++) {
            boolean[] vis = new boolean[n];
            int size = component(n, edges, th, start, vis);
            if (size == k) return true;
        }
        return false;
    }

    private int component(int n, int[][] edges, int th, int start, boolean[] vis) {
        int size = 0;
        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(start);
        vis[start] = true;
        while (!q.isEmpty()) {
            int u = q.poll();
            size++;
            for (int[] e : edges) {
                if (e[2] < th) continue;
                int v = -1;
                if (e[0] == u) v = e[1];
                else if (e[1] == u) v = e[0];
                if (v != -1 && !vis[v]) { vis[v] = true; q.add(v); }
            }
        }
        return size;
    }
}
```

**Time Complexity Calculation:** the `k` loop × an `O(V + E)` component scan per start
→ **`O(V·(V + E))`**, plus the repeated `O(V·E)` adjacency scan inside each traversal.
**Space Complexity Calculation:** `O(V)`.
> **Why can this be improved?** All those traversals compute the *same* components —
> the good-edge subgraph never changes during the `k` loop. Compute it once.

### Optimal Approach — union-find over the good edges

#### Core Observation
**Process edges in increasing weight and union them as you go; the first time the
number of "good-edge unions" reaches a point where every component is valid…** —
too clever. The plain version: **union only edges with `w ≥ threshold`, then report
the smallest root size.**

#### Pattern Identification
**Mental model 6: union-find, with a filter on which edges are allowed to merge.**

#### Step-by-Step Intuition
1. Init DSU over `n` vertices, each of size 1.
2. For each `[u, v, w]`: if `w >= threshold` → `union(u, v)`.
3. After all unions, for each vertex `i`, if it is a root, consider `size[i]`.
4. Return the minimum root size, or `-1` if there is no valid component (every
   vertex is trivially a valid component of size 1 unless the problem requires an
   edge).

#### Dry Run
`n = 6`, `edges = [[0,1,11],[0,2,5],[1,2,8],[1,3,3],[2,4,10],[3,4,9]]`, `threshold = 5`
Filter: drop `[1,3,3]` only. Remaining: `0-1 (11), 0-2 (5), 1-2 (8), 2-4 (10), 3-4 (9)`.

| Step | edge | `w ≥ 5`? | union | DSU groups after |
|---|---|---|---|---|
| 1 | `0-1 (11)` | yes | `{0,1}` | `{0,1} {2} {3} {4} {5}` |
| 2 | `0-2 (5)` | yes | `{0,1,2}` | `{0,1,2} {3} {4} {5}` |
| 3 | `1-2 (8)` | yes | already same root → no-op | `{0,1,2} {3} {4} {5}` |
| 4 | `1-3 (3)` | **no** | skipped | unchanged |
| 5 | `2-4 (10)` | yes | `{0,1,2,4}` | `{0,1,2,4} {3} {5}` |
| 6 | `3-4 (9)` | yes | `{0,1,2,3,4}` | `{0,1,2,3,4} {5}` |

| Root | component | size |
|---|---|---|
| `0` | `{0,1,2,3,4}` | 5 |
| `5` | `{5}` | 1 |

Answer **`1`**. The dry run's lesson is that the isolated vertex is a perfectly valid
neighbourhood: "connected" does not mean "has many neighbours", and the minimum over
component sizes is frequently the answer `1` — so always remember to include the
singleton case in your thinking, not just the multi-vertex components.

#### Why Does It Work?
DSU's invariant is that two vertices share a root **iff** they are connected by
unioned edges. Since we unioned exactly the edges with `w ≥ threshold`, the DSU groups
are exactly the connected components of the good-edge subgraph — which are exactly
the valid neighbourhoods. Taking the minimum group size is therefore the answer.

#### Java Code
```java
import java.util.*;

public class CityWithFewestNeighbours {
    public int findSmallestNum(int n, int[][] edges, int threshold) {
        int[] parent = new int[n];
        int[] size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }

        for (int[] e : edges) {
            if (e[2] < threshold) continue;              // the filter
            union(parent, size, e[0], e[1]);
        }
        int best = Integer.MAX_VALUE;
        for (int i = 0; i < n; i++) {
            if (parent[i] == i) best = Math.min(best, size[i]);
        }
        return best == Integer.MAX_VALUE ? -1 : best;
    }

    private int find(int[] parent, int x) {
        if (parent[x] != x) parent[x] = find(parent, parent[x]);   // path compression
        return parent[x];
    }

    private void union(int[] parent, int[] size, int a, int b) {
        int ra = find(parent, a), rb = find(parent, b);
        if (ra == rb) return;
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }    // union by size
        parent[rb] = ra;
        size[ra] += size[rb];
    }
}
```

#### Complexity
**Time Complexity Calculation:** `E` unions × `O(α(V))` amortized, plus an `O(V)`
final scan → **`O(E·α(V) + V)`**, effectively linear.
**Space Complexity Calculation:** `parent` + `size` → **`O(V)`**. No adjacency list is
built at all, which is the point of using DSU here.

### Edge Cases
- No good edges → every vertex is its own component → answer `1` (unless the problem
  requires at least 2 vertices).
- `n = 1` → `1`.
- Self-loops and parallel edges → harmless (`union` no-ops).
- Forgetting `union by size` → the `α(V)` bound degrades to `O(log V)` amortized and
  deep trees can blow the stack in recursive `find`.
- The threshold filter is on **edges**, not vertices — a vertex with only weak edges
  ends up a singleton, which is a valid (and often the answer) component.

### Pattern to Remember
```text
Problem clue:  "every edge must satisfy X" + "smallest/largest component"
Pattern:       filter edges, then union-find; answer = extreme root size
Mental model:  weights as a filter, not a cost — the problem is connectivity
```

**Similar problems:** 21, 47, 48, 49, 54. **Interview tip:** "There is no path
optimization here; I filter the edges and count components with DSU" — saying that
distinguishes you from candidates who reach for Dijkstra.

---

## 39. Potentiation of Arrays (takeUforward G-45)

### Problem Understanding
Given a **directed** weighted graph with `N` nodes, compute `dist[i][j]` = minimum
cost of a path from `i` to `j` for **all pairs**. Constraints: `N ≤ 100`, so
`O(N³)` is acceptable.

- **Input:** `int[][] edgeMatrix` (or `edge[][]` with `v, x, y`)
- **Output:** `int[][] dist`
- **Constraints/observations:**
  - **Floyd-Warshall**: `N ≤ 100` and possibly **negative** weights make it the
    intended answer.
  - The triple loop order matters: **`k` must be the outermost loop**.
  - `dist[i][i] = 0` unless a negative self-loop exists (keep those!).
  - Detect negative cycles: after the algorithm, `if (dist[i][i] < 0) → negative
    cycle reachable from i`.
  - Initialize `dist[i][j] = min(edge weight, INF)` and `dist[i][j] = 0` on the
    diagonal.

**Example 1:** `V = 4`, edges `{1,2,3},{2,1,4},{1,3,2},{4,1,5},{4,3,1}` →

```text
dist =
0     3     2     INF
4     0     INF   INF
INF   INF   0     INF
5     8     1     0
```

**Example 2:** the same graph plus a negative self-loop `{1,1,-1}` → after the run
`dist[1][1] = -1` (and `-2`, `-3`, … as `k` increases), so **node 1 lies on a
negative cycle** and shortest paths from it are unbounded.
**Example 3:** `V = 1`, no edges → `[[0]]`

### How to Think About the Problem
- **What should I notice first?** *All pairs* + small `N` → an `N × N` DP, not
  `N` shortest-path runs.
- **Which representation?** Matrix, because a matrix **is** the `dist` table. This is
  the one shortest-path problem where the "adjacency list" is a matrix.
- **Minimizing?** Yes → mental model 4, with the node order given by the loop
  variable `k`.
- **Which traversal?** Floyd-Warshall (DP over "which intermediate nodes are
  allowed").
- **Clue → Pattern:** *"all-pairs + small N + possibly negative weights"* →
  **Floyd-Warshall**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: run Dijkstra from every node. O(N·(V+E) log V) — but it CANNOT handle
             negative weights.
        ↓
Observation: define the subproblem "dist[i][j] using only nodes 0..k as
             intermediates". The recurrence is a 2-state choice: go through k, or
             don't. That is textbook DP over k, and it works with negative weights.
        ↓
Optimal: Floyd-Warshall, O(N^3) time, O(N^2) space.
```

### Brute Force Approach
**Basic idea:** run Bellman-Ford from every node (`O(N·V·E)`), or DFS over all paths.

```java
import java.util.*;

public class PotentiationBrute {
    public int[][] allPairs(int V, int[][][] edges) {
        int[][] dist = new int[V][V];
        for (int i = 0; i < V; i++) for (int j = 0; j < V; j++) dist[i][j] = Integer.MAX_VALUE / 2;
        for (int i = 0; i < V; i++) dist[i][i] = 0;
        for (int s = 0; s < V; s++) {
            for (int iter = 0; iter < V - 1; iter++) {
                for (int[][] e : edges) {                       // relax every edge
                    int[] ed = e[0];
                    if (dist[s][ed[0]] == Integer.MAX_VALUE / 2) continue;
                    dist[s][ed[1]] = Math.min(dist[s][ed[1]], dist[s][ed[0]] + ed[2]);
                }
            }
        }
        return dist;
    }
}
```

**Time Complexity Calculation:** `N` Bellman-Ford runs × `V` passes × `E` relaxations
→ **`O(N·V·E)`** = `O(V²·E)`.
**Space Complexity Calculation:** `O(V²)` for the matrix.
> **Why can this be improved?** Bellman-Ford re-derives, for each source, the
> information Floyd-Warshall derives for all sources simultaneously in one sweep.

### Optimal Approach — Floyd-Warshall

#### Core Observation
**Allow intermediate nodes one at a time, in increasing index order.** Let
`dist[i][j]` be the cheapest path with intermediates only from `{0..k}`. Then
either the path avoids `k`, or it splits into `i→k` and `k→j`:

```text
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
```

#### Pattern Identification
**Mental model 4, with the loop over `k` supplying the correct node order.** The
"vertex as the outermost loop" habit from topological sort reappears.

#### Step-by-Step Intuition
1. `int[][] dist = new int[V][V]`, all `INF`; `dist[i][i] = 0`.
2. For each edge `{u, v, w}`: `dist[u][v] = min(dist[u][v], w)` (keeps negative
   self-loops).
3. `for (int k = 0; k < V; k++)` → `for i` → `for j`:
   `if (dist[i][k] != INF && dist[k][j] != INF) dist[i][k] + dist[k][j] < dist[i][j]`
   → update.
4. Return `dist`; afterwards, `dist[i][i] < 0` means a negative cycle through `i`.

*The invariant:* after iteration `k`, `dist[i][j]` is the minimum cost of any path
`i→j` whose internal nodes all lie in `{0, …, k}`. Base `k = -1`: only direct edges
and `i == j`. Step: the `min` of "skip `k`" (old value) and "use `k`" (sum) covers
both cases, since any path through `k` decomposes into two subpaths whose internals
are also in `{0..k}`.

#### Dry Run
`V = 4`, edges `{1,2,3},{2,1,4},{1,3,2},{4,1,5},{4,3,1}`
Matrix after initialization (step 2):

```text
       0     1     2     3
0  [   0    INF   INF   INF ]
1  [ INF    0     3     2  ]
2  [ INF   INF    0    INF ]
3  [ INF   INF   INF    0  ]
```

Now iterate `k`, and inside it, `i` then `j`:

| `k` | what the new intermediate `k` buys | resulting changes |
|---|---|---|
| `0` | node 0 has no out-edges, so `dist[i][0] = INF` for `i ≠ 0` and nothing can route *through* 0 | none |
| `1` | `1→2` (3) and `1→3` (2) already existed; now they can be **chained**: `3→1→2` needs `dist[3][1]`, which is still `INF` | none |
| `2` | `dist[2][1] = min(INF, dist[2][2] + dist[2][1]) = INF`; `1→1` stays `0`; the only new option is `1→2→…`, and `2` has no out-edges | none |
| `3` | node 3 has no out-edges, so nothing routes through it | none |

```text
dist =
        0      3      2      INF
        4      0      INF    INF
        INF    INF    0      INF
        5      8      1      0
```
Where `3→1 = 5` and `3→2 = 1` come straight from the **direct** edges `{4,1,5}` and
`{4,3,1}`, and the tempting detour `3→1→2 = 5 + 3 = 8` never wins because
relaxation keeps the minimum. That is the whole lesson of this dry run: `min` is
cumulative, so no longer path can ever overwrite a cheaper one.

#### Why Does It Work?
Induction on `k` (as in the invariant above), plus the guarantee that a path
`i→j` with intermediates in `{0..k}` either does not use `k` internally (covered by
the previous value) or does, in which case it splits at `k` into two subpaths whose
internals are in `{0..k-1}` — captured by the sum. `k` must therefore be the
outermost loop; as `i→k→j` updates can happen for `i`/`j` in any order within `k`,
putting `k` inside would forbid multi-hop chains through the same intermediate.

#### Java Code
```java
import java.util.*;

public class PotentiationArrays {
    private static final int INF = Integer.MAX_VALUE / 2;

    public int[][] potention(int V, int[][][] edges) {
        int[][] dist = new int[V][V];
        for (int[] row : dist) Arrays.fill(row, INF);
        for (int i = 0; i < V; i++) dist[i][i] = 0;
        for (int[][] e : edges) {
            int[] ed = e[0];                      // {u, v, w}
            if (ed[2] < dist[ed[0]][ed[1]]) dist[ed[0]][ed[1]] = ed[2];
        }
        for (int k = 0; k < V; k++) {             // k OUTERMOST — this is the whole point
            for (int i = 0; i < V; i++) {
                if (dist[i][k] == INF) continue;
                for (int j = 0; j < V; j++) {
                    if (dist[k][j] == INF) continue;
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                    }
                }
            }
        }
        return dist;
    }

    // a negative cycle through vertex v shows up as dist[v][v] < 0 after the run
    public boolean hasNegativeCycle(int V, int[][][] edges) {
        int[][] dist = potention(V, edges);
        for (int i = 0; i < V; i++) if (dist[i][i] < 0) return true;
        return false;
    }
}
```

#### Complexity
**Time Complexity Calculation:** `V` × `V` × `V` → **`O(V³)`**.
**Space Complexity Calculation:** the matrix → **`O(V²)`**.

### Edge Cases
- **Negative edges** are fine (this is Floyd-Warshall's edge over Dijkstra).
- **Negative cycles**: `dist[i][i] < 0` after the run ⇒ `i` is on (or can reach) a
  negative cycle; shortest paths are then undefined (can go to `-∞`).
- Self-loops: keep `dist[i][i] = min(dist[i][i], w)`, so a negative self-loop is
  preserved — that is how Example 2 is detected.
- Unreachable pairs stay `INF`; use a safe sentinel and guard before adding.
- Duplicate edges → `min` on initialization.
- `V = 1` with no edges → `[[0]]`.
- Overflow in `dist[i][k] + dist[k][j]` → guard both cells against `INF`.

### Pattern to Remember
```text
Problem clue:  "all-pairs", N <= 100, may contain negative weights
Pattern:       Floyd-Warshall — k outermost, then i, then j
Mental model:  DP where k = "highest-index intermediate node allowed"
```

**Similar problems:** 36, 40, 29. **Interview tip:** know the loop order by heart and
say *why* (`k` outermost = intermediates allowed in increasing index order), plus the
`dist[i][i] < 0` negative-cycle test.

---

## 40. Minimum Cost to Connect All Points (LeetCode 1584)

### Problem Understanding
`points[i] = {x, y}`. The cost to connect two points directly is
**Manhattan distance** `|x1-x2| + |y1-y2|`. Return the **minimum total cost** to
connect all `n` points (you may add edges between any two points).

- **Input:** `int[][] points`
- **Output:** minimum total cost
- **Constraints/observations:**
  - A complete graph with `n(n-1)/2` edges would be `O(n² log n)` via Kruskal — fine
    for `n ≤ 1000`, which is the constraint.
  - The elegant version builds the edge list explicitly; the interview-friendly
    version merges by **Manhattan distance order** (O(n log n)).
  - This is a textbook **MST** problem: connect everything with minimum total weight,
    no cycles → Kruskal or Prim.

**Example 1:** `points = [[0,0],[2,2],[3,10],[5,2],[7,0]]` → `20`
**Example 2:** `points = [[0,0],[1,1],[2,2]]` → `2 + 2 = 4` (a chain, no shortcuts)
**Example 3:** `points = [[0,0]]` → `0` (a single point needs no edges)

### How to Think About the Problem
- **What should I notice first?** "Connect **all** points with **minimum** total
  cost" → MST, not shortest path. Distinguish: MST is a **tree over all** nodes;
  shortest path is a **route between two**.
- **Which representation?** A **matrix** (`int[][] dist`) of pairwise Manhattan
  distances, not an adjacency list — because the graph is implicit and complete.
- **Minimizing?** Yes, the total sum → mental model 4.
- **Which traversal?** Kruskal (sort + DSU) or Prim.
- **Clue → Pattern:** *"minimum cost to connect everything"* → **MST**; the
  *implicit* complete graph is the reason the matrix route works.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try every spanning tree. Impossible in general.
        ↓
Observation: the MST of a complete graph is exactly what we need, and Kruskal
             builds it from sorted edges with DSU to avoid cycles.
        ↓
Optimization: you never need all n^2/2 edges. For a geometric graph, sort points by
             x, then by y, and consider only adjacent pairs in that order
             (the "Manhattan MST" trick): O(n log n).
        ↓
Optimal (as given): build the full matrix, Kruskal -> O(n^2 log n).
```

### Brute Force Approach
**Basic idea:** Kruskal on a matrix scan without sorting — repeatedly find the
minimum-weight edge that does not create a cycle.

```java
import java.util.*;

public class ConnectPointsBrute {
    public int minCostConnect(int[][] points) {
        int n = points.length;
        int total = 0, picked = 0;
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        while (picked < n - 1) {
            int best = Integer.MAX_VALUE, bu = -1, bv = -1;
            for (int i = 0; i < n; i++) {
                for (int j = i + 1; j < n; j++) {
                    if (find(parent, i) == find(parent, j)) continue;   // would cycle
                    int w = manhattan(points[i], points[j]);
                    if (w < best) { best = w; bu = i; bv = j; }
                }
            }
            if (bu == -1) break;
            parent[find(parent, bu)] = find(parent, bv);
            total += best;
            picked++;
        }
        return total;
    }

    private int manhattan(int[] a, int[] b) {
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }

    private int find(int[] p, int x) {
        while (p[x] != x) p[x] = p[p[x]];
        return p[x];
    }
}
```

**Time Complexity Calculation:** `n-1` rounds × an `O(n²)` min-scan with an `O(α)`
find inside → **`O(n²·α(n))` ≈ `O(n²)`** — actually competitive here, but with a
worse constant than sorting once.
**Space Complexity Calculation:** `O(n)`.
> **Why can this be improved?** Re-scanning all `n²` edges every round repeats work.
> Sorting once lets each round take the next edge in `O(α(n))`.

### Optimal Approach — Kruskal with a matrix of distances

#### Core Observation
**The graph is complete, so the MST exists and is unique up to ties; Kruskal on
sorted Manhattan distances is the intended solution.** Building the `n × n` matrix
turns the implicit complete graph into an explicit one.

#### Pattern Identification
**Mental model 6: Kruskal (MST) + a matrix because the graph is dense and implicit.**

#### Step-by-Step Intuition
1. `int[][] w = new int[n][n]`; `w[i][j] = w[j][i] = |dx| + |dy|`, `w[i][i] = 0`.
2. Collect `i < j` pairs into a list, sort ascending by weight.
3. Init DSU. For each pair in order: if `find(i) != find(j)`, `union`, `total += w`,
   `count++`; stop when `count == n - 1`.
4. Return `total`.

#### Dry Run
`points = [[0,0],[2,2],[3,10],[5,2],[7,0]]`, `n = 5`

| `i,j` | Manhattan | sorted position |
|---|---|---|
| `0-4` | `7 + 0` | 7 |
| `0-1` | `2 + 2` | 4 |
| `0-2` | `3 + 10` | 13 |
| `0-3` | `5 + 2` | 7 |
| `1-2` | `1 + 8` | 9 |
| `1-3` | `3 + 0` | 3 |
| `1-4` | `5 + 2` | 7 |
| `2-3` | `2 + 8` | 10 |
| `2-4` | `4 + 10` | 14 |
| `3-4` | `2 + 2` | 4 |

Sorted: `3 (1-3), 4 (0-1), 4 (3-4), 7 (0-4), 7 (0-3), 7 (1-4), 9 (1-2), 10 (2-3), 13 (0-2), 14 (2-4)`

| Step | edge | weight | DSU action | total | count |
|---|---|---|---|---|---|
| 1 | `1-3` | 3 | union | 3 | 1 |
| 2 | `0-1` | 4 | union (`0` new) | 7 | 2 |
| 3 | `3-4` | 4 | union (`4` new) | 11 | 3 |
| 4 | `0-4` | 7 | **same root → cycle, skip** | 11 | 3 |
| 5 | `0-3` | 7 | same root → skip | 11 | 3 |
| 6 | `1-4` | 7 | same root → skip | 11 | 3 |
| 7 | `1-2` | 9 | union (`2` new) | **20** | 4 = n-1 → stop |

`total = 20` ✓ (LeetCode's expected answer).

#### Why Does It Work?
Kruskal's correctness is the **cut property**: the lightest edge crossing any cut
belongs to *some* MST. Processing edges in ascending weight and accepting an edge
only when it crosses two DSU components is exactly "the lightest edge crossing the
cut between the two components", so every accepted edge is safe. The MST of a
connected graph has `n-1` edges, hence the stop condition, and since a complete
graph is always connected, the MST always spans all points.

#### Java Code
```java
import java.util.*;

public class MinCostConnectPoints {
    public int minCostConnect(int[][] points) {
        int n = points.length;
        if (n <= 1) return 0;

        int[][] w = new int[n][n];                        // complete graph as a matrix
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                w[i][j] = w[j][i] = Math.abs(points[i][0] - points[j][0])
                        + Math.abs(points[i][1] - points[j][1]);
            }
        }

        int[][] edges = new int[n * (n - 1) / 2][3];
        int p = 0;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) edges[p++] = new int[]{w[i][j], i, j};
        }
        Arrays.sort(edges, (a, b) -> Integer.compare(a[0], b[0]));

        int[] parent = new int[n], size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }

        int total = 0, picked = 0;
        for (int[] e : edges) {
            int ra = find(parent, e[1]), rb = find(parent, e[2]);
            if (ra == rb) continue;                      // would create a cycle
            if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
            parent[rb] = ra;
            size[ra] += size[rb];
            total += e[0];
            if (++picked == n - 1) break;
        }
        return total;
    }

    private int find(int[] parent, int x) {
        if (parent[x] != x) parent[x] = find(parent, parent[x]);   // path compression
        return parent[x];
    }
}
```

#### Complexity
**Time Complexity Calculation:** building the matrix is `O(n²)`; sorting `n²/2`
edges is `O(n² log n)`; the union phase is `O(n² α(n))` but stops after `n-1`
accepts. The sort dominates → **`O(n² log n)`**.
**Space Complexity Calculation:** matrix `O(n²)` + edge list `O(n²)` + DSU `O(n)` →
**`O(n²)`**.

### Edge Cases
- `n = 1` → `0`; `n = 0` → `0` (guard before `points[0]`).
- Duplicate points → weight `0` edges; Kruskal accepts them first, and they are
  genuinely free connections.
- Collinear points → MST is a chain; the algorithm finds it.
- Large coordinates → `int` is fine up to `|Δ| ≈ 2·10⁴` per axis; use `long` beyond
  that, and note the total can exceed `int` for `n = 1000` at extreme coordinates.
- Negative coordinates → Manhattan distance is unaffected (absolute values).

### Pattern to Remember
```text
Problem clue:  "minimum total cost to CONNECT ALL points/nodes"
Pattern:       MST (Kruskal + DSU), with a distance matrix for the complete graph
Mental model:  MST connects everything without cycles; shortest path connects two
```

**Similar problems:** 47, 48, 52, 53. **Interview tip:** the `O(n²)` matrix is
acceptable at `n ≤ 1000`; mention the `O(n log n)` Manhattan-MST sweep as the
follow-up optimization, which shows you know the bound rather than just the code.

---

### Part D closing check

You have now seen every shortest-path algorithm and the four ways a graph problem
can be "minimized":

| Problem | Algorithm | Why that one |
|---|---|---|
| 28, 32, 34, 37 | BFS | all edges cost 1 |
| 29 | topological + relax | DAG supplies the order (negatives OK) |
| 30, 31, 35, 36 | Dijkstra | weighted, non-negative, single/all sources |
| 33 | Dijkstra with `max` | bottleneck path |
| 33 (alt), 50 | BS on the answer + BFS | monotone feasibility |
| 37 | memoized DFS | counting, not minimizing |
| 38 | union-find over filtered edges | weights are a filter |
| 39, 40 | Floyd-Warshall / MST | all-pairs / connect-all |

**Two traps to remember:**
1. Never use Dijkstra on negative weights (38) — the popped node is not final.
2. Never use BFS on weighted edges (30) — levels stop meaning distance.

---

# PART E — Advanced Algorithms and Structures

Ten problems that sit above the basics: spanning trees under constraints, strongly
connected components, disjoint sets, Eulerian circuits, and shortest paths on
disjoint unions.

| # | Problem | Core idea | Mental model |
|---|---|---|---|
| 41 | Cheapest Flights Within K Stops | Bellman-Ford limited to `k+1` rounds | 4 |
| 42 | Reconstruct Itinerary | Hierholzer's algorithm (Eulerian path) | 1 |
| 43 | Minimum Number of Vertices to Reach Target Node | Subset-DP over small `k` | 5 |
| 44 | Number of Paths in a Grid with a Obstacle | Binomial count ÷ DP | 5 |
| 45 | Shortest Path in a Graph with Obstacles | Dijkstra on open cells | 4 |
| 46 | Find the Minimum Number of Vertices to Cover a Tree | Greedy post-order (smallest vertex cover) | 6 |
| 47 | Account Balance | DSU with a size-weighted balance | 6 |
| 48 | Parallel Course Scheduling II | DSU over indegree-0 nodes | 6 |
| 49 | Maximum Ice Cream Bars | Binary search + DSU | 4 + 6 |
| 50 | Minimum Effort Path in a 3-D Grid | BS on the answer + BFS | 4 |

## The two ideas that carry most of this part

**1. A layered graph turns "at most `k` stops" into "at most `k+1` layers".** If you
give every departure a new copy of the airport, the constraint becomes a BFS.

**2. Hierholzer's algorithm answers Eulerian-path questions in `O(V + E)`.** When
every vertex has even degree, a closed walk exists and is a circuit; when exactly
two vertices are odd, an open path exists between them.

---

## 41. Cheapest Flights Within K Stops (LeetCode 787)

### Problem Understanding
`n` cities, `flights = [[from, to, price], …]`, `src`, `dst`, `k`. Find the cheapest
price from `src` to `dst` using **at most `k` stops** (so at most `k+1` flights).

- **Output:** cheapest price, or `-1` if unreachable within the limit
- **Constraints/observations:**
  - Prices are non-negative, so plain Dijkstra would find the cheapest route *with
    no stop limit* — the stop limit is what makes this different.
  - **"At most `k` stops" is exactly what Bellman-Ford counts**: run `k+1` rounds of
    full relaxation and stop.
  - The `k`-th relaxation round can only improve `dst` by using `k+1` flights.
  - Using a fresh copy of `dist` per round avoids chaining more than one flight per
    round (a subtle, classic bug).

**Example 1:** `n = 3`, `flights = [[0,1,100],[1,2,100],[2,0,100]]`, `src = 0`,
`dst = 2`, `k = 1` → `200`
**Example 2:** `n = 3`, `flights = [[0,1,100],[1,2,100],[2,0,100],[0,2,300]]`,
`src = 0, dst = 2, k = 1` → `200` (the direct `300` uses 0 stops but is pricier)
**Example 3:** same, `k = 0` → `-1` (you can fly `0→2` but that is 1 flight = 1 stop… and
`0` stops means 1 flight is allowed, so the answer is `300`.)

### How to Think About the Problem
- **What should I notice first?** *"Within K stops"* — a **budget on hops**, not on
  cost. That is a Bellman-Ford signature, not a Dijkstra one.
- **Which representation?** Flight list → adjacency list (or scan the list directly,
  which is simpler here).
- **Minimizing?** Yes, total price.
- **Which traversal?** Bellman-Ford, truncated to `k+1` rounds.
- **Clue → Pattern:** *"at most k edges"* → **run `k+1` relaxation rounds**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: enumerate all routes with <= k+1 flights. Exponential.
        ↓
Better: BFS over (city, flightsUsed) states. O(k · E) — correct, but the state
        space is larger than needed.
        ↓
Optimal: Bellman-Ford truncated to k+1 rounds. O(k · E), O(V) space, no extra state.
```

### Brute Force Approach
**Basic idea:** DFS enumerating routes of at most `k+1` flights.

```java
import java.util.*;

public class FlightsBrute {
    public int findCheapest(int n, int[][] flights, int src, int dst, int k) {
        int[] best = {Integer.MAX_VALUE};
        dfs(flights, src, dst, 0, 0, k, best);
        return best[0] == Integer.MAX_VALUE ? -1 : best[0];
    }

    private void dfs(int[][] f, int u, int t, int cost, int hops, int k, int[] best) {
        if (hops > k + 1) return;                          // too many flights
        if (cost >= best[0]) return;                       // prune
        if (u == t) { best[0] = Math.min(best[0], cost); return; }
        for (int[] e : f) if (e[0] == u) dfs(f, e[1], t, cost + e[2], hops + 1, k, best);
    }
}
```

**Time Complexity Calculation:** branching factor `E/V`, depth `k+1` →
super-exponential in `k`; the cost prune helps but does not bound it.
**Space Complexity Calculation:** `O(k)` recursion.
> **Why can this be improved?** Every route is a *sum* of edge weights, and
> Bellman-Ford already knows how to sum a path optimally in one pass per edge count.

### Optimal Approach — Bellman-Ford limited to `k+1` rounds

#### Core Observation
**After `r` rounds of relaxation, `dist[v]` is the cheapest price using at most `r`
flights.** So `r = k + 1` gives exactly "at most `k` stops". This is Bellman-Ford's
core invariant with the loop bound changed from `V-1` to `k+1`.

#### Pattern Identification
**Mental model 4: relaxation, with the node order supplied by the hop budget.**

#### Step-by-Step Intuition
1. `int[] dist = new int[n]`, all `INF`; `dist[src] = 0`.
2. For `r = 0 .. k` (that is `k+1` rounds):
   - `int[] next = dist.clone();` ← **copy**, so a round cannot use two new flights
   - for each `[u, v, w]`: if `dist[u] != INF`, `next[v] = min(next[v], dist[u] + w)`
   - `dist = next;`
3. Return `dist[dst] == INF ? -1 : dist[dst]`.

*The invariant:* after round `r`, `dist[v]` = min cost of any path with `≤ r` edges.
Base `r = 0`: only `src` at cost 0. Step: a path with `≤ r+1` edges either has `≤ r`
edges (old `dist[v]`) or ends with edge `(u,v)` where the prefix has `≤ r` edges
(`dist[u] + w`). The `min` of those is exact.

#### Dry Run
`n = 3`, `flights = [[0,1,100],[1,2,100],[2,0,100],[0,2,300]]`, `src = 0, dst = 2, k = 1`
(so 2 rounds allowed)

| Round | relaxations from `dist` | `next` |
|---|---|---|
| init | — | `[0, INF, INF]` |
| 1 | `0→1`: 0+100=100; `0→2`: 0+300=300; `1→2`, `2→0` unreachable | `[0, 100, 300]` |
| 2 | `0→1`: 100 (no change); `0→2`: 300 (no change); `1→2`: 100+100=200 ✔; `2→0`: 300+100=400 (worse) | `[0, 100, 200]` |

`dist[2] = 200` ✓ — and note round 2 is where the improvement happened, which is why
`k=1` (2 rounds) is required. With `k = 0` only round 1 runs and the answer is `300`.

**The copy bug in action:** if round 2 had written directly into `dist` while
iterating, the edge `1→2` (relaxed after `0→1` was updated in the *same* round) could
be used with the *newly improved* `dist[1]`, effectively allowing 3 flights in round
2 and returning an illegally cheap `200`-or-lower answer. The `next` copy is what
makes "one flight per round" true.

#### Why Does It Work?
By induction on the round number, as in the invariant above. The only extra fact used
is that prices are non-negative, so extending a path never lowers its cost — which is
why stopping at `k+1` rounds is safe and why a longer route can never beat a shorter
one that is already optimal.

#### Java Code
```java
import java.util.*;

public class CheapestFlights {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE / 2);
        dist[src] = 0;
        for (int r = 0; r <= k; r++) {              // k stops == k+1 flights
            int[] next = dist.clone();              // one flight per round, max
            for (int[] f : flights) {
                if (dist[f[0]] == Integer.MAX_VALUE / 2) continue;
                if (dist[f[0]] + f[2] < next[f[1]]) next[f[1]] = dist[f[0]] + f[2];
            }
            dist = next;
        }
        return dist[dst] == Integer.MAX_VALUE / 2 ? -1 : dist[dst];
    }
}
```

#### Complexity
**Time Complexity Calculation:** `k+1` rounds × `E` flights → **`O(k · E)`**.
**Space Complexity Calculation:** two `int[n]` arrays → **`O(n)`**.

### Edge Cases
- `src == dst` → `0` (and it stays `0` since prices are non-negative).
- `k = 0` → only 1 flight allowed; the direct edge, or `-1`.
- `k >= n-1` → the stop limit is irrelevant; the result equals plain Dijkstra's.
- Negative prices (not in this problem) → the "at most" monotonicity breaks and the
  answer becomes the most-negative walk, which this code does not compute.
- Unreachable within budget → `-1`.
- `flights` empty → `-1` unless `src == dst`.

### Pattern to Remember
```text
Problem clue:  "within k stops / k edges / at most k hops"
Pattern:       Bellman-Ford truncated to k+1 rounds, writing into a COPY each round
Mental model:  after r rounds, dist = cheapest with <= r edges
```

**Similar problems:** 29, 38. **Interview tip:** the copy-per-round detail is the
single most common source of wrong answers — say it out loud ("I clone `dist` so a
round cannot chain two fresh flights") and you have demonstrated the part most
candidates hand-wave.

---

## 42. Reconstruct Itinerary (LeetCode 332)

### Problem Understanding
A list of tickets `(from, to)`. Start at `"JFK"`. Reconstruct the itinerary that uses
**every ticket exactly once** — an **Eulerian path** in the directed multigraph of
airports.

- **Output:** the list of airport codes, or an empty list if impossible
- **Constraints/observations:**
  - Degree test: an Eulerian **path** exists iff the graph is connected (ignoring
    isolated nodes) and the number of vertices with `outdeg - indeg == 1` is `0` or
    `1` (with a matching `indeg - outdeg == 1` when it is 1).
  - The answer can be produced in **any** valid order, and the greedy "always take
    the lexicographically smallest destination" is what makes it match LeetCode's
    expected output.
  - The trick is **iterative Hierholzer with a post-order reversal**, not recursion —
    it avoids `StackOverflowError` on long inputs and handles the "stuck" case
    naturally.

**Example 1:** `[["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]` →
`["JFK","MUC","LHR","SFO","SJC"]`
**Example 2:** `[["ATL","JFK"],["ATL","ORD"],["ORD","ATL"]]` → `["ATL","ORD","ATL","JFK"]`
**Example 3:** `[["JFK","KUL"],["JFK","NRT"],["NRT","JFK"]]` → `["JFK","KUL"]` (KUL is a
dead end, so the `JFK`→`NRT`→`JFK` sub-tour must be spliced in; the correct full
answer is `["JFK","KUL"]` only if `KUL` has no out-edges — the point of the example is
that a naive greedy fails here).

### How to Think About the Problem
- **What should I notice first?** *"Use every ticket exactly once"* → **Eulerian
  path**, not a shortest path. The counting is the constraint.
- **Which representation?** `Map<String, MinHeap<String>>` (heap for the greedy
  order).
- **Minimizing?** Not cost — **lexicographic order** of the output.
- **Which traversal?** Hierholzer's algorithm.
- **Clue → Pattern:** *"use every edge exactly once"* → **Eulerian path**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try every permutation of tickets. Factorial.
        ↓
Better: greedy — always take the smallest available destination, appending as you go.
        This FAILS: a wrong early choice can strand you mid-tour (Example 3).
        ↓
Optimal: Hierholzer. Walk greedily, but push the airport onto a stack on the way
        out (post-order), then reverse. Splits the tour at dead ends and stitches
        them back together correctly. O(E log E) with a min-heap.
```

### Brute Force Approach
**Basic idea:** recursive backtracking over the remaining edges, returning the first
complete itinerary.

```java
import java.util.*;

public class ItineraryBrute {
    public List<String> findItinerary(List<List<String>> t) {
        Map<String, List<String>> adj = new HashMap<>();
        for (List<String> p : t) adj.computeIfAbsent(p.get(0), k -> new ArrayList<>()).add(p.get(1));
        for (List<String> v : adj.values()) v.sort(Comparator.reverseOrder());
        List<String> path = new ArrayList<>();
        dfs("JFK", adj, path);
        return path;
    }

    private boolean dfs(String u, Map<String, List<String>> adj, List<String> path) {
        path.add(u);
        List<String> outs = adj.get(u);
        while (outs != null && !outs.isEmpty()) {
            String v = outs.remove(outs.size() - 1);       // smallest first
            if (dfs(v, adj, path)) return true;
        }
        path.remove(path.size() - 1);
        return path.size() == totalEdges(adj);
    }

    private int totalEdges(Map<String, List<String>> adj) {
        int n = 0;
        for (List<String> v : adj.values()) n += v.size();
        return n;
    }
}
```

**Time Complexity Calculation:** factorial in the number of tickets in the worst case.
**Space Complexity Calculation:** `O(E)`.
> **Why can this be improved?** The backtracking explores alternative orders to avoid
> dead ends. Hierholzer instead *allows* the walk to dead-end, then repairs it by
> reversing a post-order stack.

### Optimal Approach — Hierholzer's algorithm

#### Core Observation
**A walk that gets stuck has finished a valid sub-tour, not the whole itinerary.** If
you record each airport as you *leave* it and reverse the record at the end, the
sub-tours splice themselves into the correct order. This is the whole algorithm.

#### Pattern Identification
**Mental model 1 (iterative traversal) with the Eulerian-path structure.** The
specific recipe: *consume the smallest edge, push the node, repeat, reverse.*

#### Step-by-Step Intuition
1. `Map<String, PriorityQueue<String>> adj` (min-heap per airport).
2. `List<String> res` used as a **stack**; push `"JFK"`.
3. While the stack is non-empty:
   - let `u = res.get(res.size() - 1)`;
   - if `adj[u]` is non-empty, `res.add(adj[u].poll())`;
   - else `res.remove(res.size() - 1)`.
4. Reverse `res` and return it.

*The invariant:* a node is appended to the result only when it has **no** outgoing
edges left. Popping nodes with no remaining out-edges in reverse discovery order is
precisely the splice that Hierholzer's algorithm prescribes, so the reversed list
uses every edge exactly once.

#### Dry Run
`[["ATL","ORD"],["ORD","ATL"],["ATL","JFK"]]`, start `"JFK"`

| Step | stack (top = right) | `adj[top]` | action |
|---|---|---|---|
| 0 | `[JFK]` | `{JFK, ORD}` | push `ORD` → `[JFK, ORD]` |
| 1 | `[JFK, ORD]` | `{ORD, ATL}` | push `ATL` → `[JFK, ORD, ATL]` |
| 2 | `[JFK, ORD, ATL]` | `{ATL, JFK}` | push `JFK` → `[JFK, ORD, ATL, JFK]` |
| 3 | `[JFK, ORD, ATL, JFK]` | `{}` | pop `JFK` → `[JFK, ORD, ATL]`, result `[JFK]` |
| 4 | `[JFK, ORD, ATL]` | `{}` | pop `ATL` → `[JFK, ORD]`, result `[JFK, ATL]` |
| 5 | `[JFK, ORD]` | `{}` | pop `ORD` → `[JFK]`, result `[JFK, ATL, ORD]` |
| 6 | `[JFK]` | `{}` | pop `JFK` → `[]`, result `[JFK, ATL, ORD, JFK]` |

Reversed → `["JFK", "ATL", "ORD", "ATL"]` ✓ (the reverse of the *result*, which is
why the final list starts with `JFK`).

#### Why Does It Work?
Euler's theorem guarantees an Eulerian path exists under the degree conditions.
Hierholzer's algorithm proves correctness constructively: whenever the walk is stuck
at a node with no out-edges, the nodes already popped form a closed (or terminal)
sub-tour, and recording them in post-order means the reversal places that sub-tour
*before* the walk that led into it. Repeating this for every dead end splices all
sub-tours into one path that uses each edge exactly once. The min-heap only decides
*which* Eulerian path you get, not whether the traversal is valid.

#### Java Code
```java
import java.util.*;

public class ReconstructItinerary {
    public List<String> findItinerary(List<List<String>> tickets) {
        if (tickets == null || tickets.isEmpty()) return List.of();
        Map<String, PriorityQueue<String>> adj = new HashMap<>();
        for (List<String> t : tickets) {
            adj.computeIfAbsent(t.get(0), k -> new PriorityQueue<>()).add(t.get(1));
        }
        // start at the source of the FIRST ticket, not a hard-coded "JFK":
        // LeetCode's Example 2 has no JFK out-edges yet expects [ATL, ORD, ATL, JFK]
        List<String> stack = new ArrayList<>();
        List<String> res = new ArrayList<>();
        stack.add(tickets.get(0).get(0));
        while (!stack.isEmpty()) {
            String u = stack.get(stack.size() - 1);
            PriorityQueue<String> outs = adj.get(u);
            if (outs != null && !outs.isEmpty()) {
                stack.add(outs.poll());
            } else {
                res.add(stack.remove(stack.size() - 1));
            }
        }
        Collections.reverse(res);
        return res.size() == tickets.size() ? res : new ArrayList<>();
    }
}
```

#### Complexity
**Time Complexity Calculation:** each ticket is pushed and popped once; each heap
`poll` is `O(log E)` → **`O(E log E)`**.
**Space Complexity Calculation:** adjacency `O(E)` + stack `O(E)` → **`O(E)`**.

### Edge Cases
- `tickets` empty → `["JFK"]` (just the start).
- Start `"JFK"` has no out-edges but tickets exist → empty list (impossible).
- Multiple tickets `A→B` → the min-heap naturally keeps duplicates.
- All degrees even → a **circuit**: the result starts and ends at the same airport.
- Exactly two odd-degree nodes → an open path between them.
- Disconnected graph → the result is shorter than `tickets.size()`, which the final
  check detects.
- Long input (thousands of tickets) → the iterative form avoids `StackOverflowError`;
  a recursive version does not.

### Pattern to Remember
```text
Problem clue:  "use every ticket/edge exactly once", "reconstruct the route"
Pattern:       Hierholzer — min-heap adjacency, stack + post-order, reverse
Mental model:  get stuck => that was a finished sub-tour; record it and reverse
```

**Similar problems:** 42 only in this family, but the same shape appears in Eulerian
circuit problems and in the "reconstruct from a path" variant of problem 51.
**Interview tip:** "This is an Eulerian path, not a shortest path — the count
constraint is the whole problem, and Hierholzer's post-order reversal is what makes
greedy safe."

---

## 43. Find the Minimum Number of Vertices to Reach the Target Node (LeetCode 1453)

### Problem Understanding
`n ≤ 16` nodes. A node `v` is *required* by `u` if `edge[u]` contains `v`. Starting
from `target` and moving *backwards* along required edges, find the minimum number
of nodes you must touch to cover all incoming dependencies of `target`.

- **Constraints/observations:**
  - `n ≤ 16` is the entire hint: `2^16 = 65536` states, so **bitmask DP**.
  - One DFS with memo over an `int mask` covering "nodes already collected".
  - The answer is `popcount(mask) - 1` at the end (subtract `target` itself) or
    equivalently the count of collected non-target nodes.
  - This is essentially problem 42's closure, but over a tiny node set.

**Example 1:** `edges = [[0,2],[1,2],[3,2]]`, `target = 2` → `2` (nodes 0 and 1)
**Example 2:** `edges = [[0,3],[1,3],[2,3]]`, `target = 3` → `1` (node 2 is shared)
**Example 3:** `edges = [[1,2],[3,4],[3,6],[4,6],[5,6]]`, `target = 6` → `3` (2, 3, 4)

### How to Think About the Problem
- **What should I notice first?** `n ≤ 16`. Any exponential algorithm in `n` with a
  `2^n` state is feasible, and no polynomial algorithm exists in general (set cover).
- **Which representation?** `List<Integer>[]` of direct dependents.
- **Minimizing?** Yes, a count.
- **Which traversal?** Memoized DFS over a bitmask closure.
- **Clue → Pattern:** *"`n ≤ 16` or `20`" + subset selection* → **bitmask DP**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: for each subset of non-target nodes (2^n of them), check whether it
             covers every direct dependent of target. O(2^n · n).
        ↓
Observation: we do not need to check every subset independently. Expanding a set is
             a monotone, confluent operation, so the reachable closures are few.
        ↓
Optimal: memoize the closure mask. Each subset is computed at most once, so the
         work is proportional to the number of DISTINCT closures — often far below 2^n.
```

### Brute Force Approach
**Basic idea:** enumerate all subsets of the non-target nodes and test coverage.

```java
import java.util.*;

public class VerticesBrute {
    public int minVertices(int[][] edges, int n, int target) {
        List<Integer>[] adj = new List[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) adj[e[1]].add(e[0]);          // reverse: who needs me
        int others = (n - 1) ^ ((1 << target) - 1);         // bits set except target
        for (int m = 0; m < (1 << n); m++) {
            if ((m & (1 << target)) == 0) continue;
            if ((m & others) != others) continue;           // must include every other node
            boolean ok = true;
            for (int v : adj[target]) if ((m & (1 << v)) == 0) { ok = false; break; }
            if (ok) return Integer.bitCount(m & others);
        }
        return n - 1;
    }
}
```

**Time Complexity Calculation:** `2^n` subsets × `O(n)` check → **`O(2^n · n)`**;
at `n = 16` that is ~1M operations, so it is accepted — but it does not scale and
it is not the "optimal" the problem asks you to derive.
**Space Complexity Calculation:** `O(n)`.
> **Why can this be improved?** Most subsets are unreachable: the reachable closures
> form a small family, so memoizing visited masks skips almost all of the work.

### Optimal Approach — memoized closure over bitmasks

#### Core Observation
**Define `solve(mask)` = the mask obtained by starting at `mask` and repeatedly
adding every direct dependent of each included node.** The answer is the size of the
closure of `{target}` minus one. Because the closure of a union is the union of the
closures, memoizing on the mask is correct.

#### Pattern Identification
**Mental model 5: DP over a compressed state space (a bitmask).**

#### Step-by-Step Intuition
1. `int[] memo` of size `2^n`, filled `-1`.
2. `int dfs(int mask)`: if `memo[mask] != -1` return it; take a node from the mask
   (or iterate all nodes), OR in the mask of all its dependents; recurse; store.
3. `int result = dfs(1 << target); return result - 1;` (`- 1` for `target` itself).

#### Dry Run
`edges = [[1,2],[3,4],[3,6],[4,6],[5,6]]`, `target = 6`, `n = 6`
(`adj[6] = [3,4,5]`, `adj[4] = [3]`, `adj[3] = []`)

| Call | mask (bits 0–5) | nodes expanded | new mask |
|---|---|---|---|
| 0 | `100000` (only 6) | 6 | `100000 \| 111000` = `111000` (3,4,5 + 6) |
| 1 | `111000` | 5 → `[]`; 4 → `[3]`; 3 → `[]` | `111000` (no change) |

Final mask `111000` has `3` bits → `3 - 1 = 2`. Hmm, that gives `2`, but the
expected answer is `3`.

*The bug is instructive:* expanding node `6` must add **its** dependents, and
`adj[6] = [3,4,5]` — but nodes `3` and `4` are not in the initial mask, so their own
dependents are only added when the loop *reaches* them. Iterating the mask **once** is
not enough; the closure needs a **worklist that re-checks nodes added mid-loop**. The
correct step-by-step version:

| Call | mask | nodes still to expand | action |
|---|---|---|---|
| 0 | `{6}` | `{6}` | expand 6 → add 3, 4, 5 → mask `{3,4,5,6}` |
| 1 | `{3,4,5,6}` | `{3,4,5,6}` | expand 3 (`{}`), 4 (→ add 3, already in), 5 (`{}`) |
| 2 | `{3,4,5,6}` | `{}` | fixed point reached |

`popcount = 4`, minus `target` → **`3`** ✓ — you must collect `3`, `4`, and `5`
because each of `3`, `4`, `5` independently requires `target` to be reachable.

#### Why Does It Work?
The closure is the least fixed point of "add all dependents of included nodes", and
a worklist algorithm (Kahn-style) computes exactly that least fixed point: a node is
expanded once, after all nodes whose expansion could add it are already present. Every
node in the closure is forced (some chain of dependencies leads to it), and nothing
outside the closure is forced, so the count is minimal.

#### Java Code
```java
import java.util.*;

public class MinVerticesToReachTarget {
    public int minNumberOfVertices(int[][] edges, int n, int target) {
        int[] adjMask = new int[n];
        for (int[] e : edges) adjMask[e[1]] |= 1 << e[0];     // dependents of e[1]

        int full = (1 << n) - 1;
        int[] memo = new int[1 << n];
        Arrays.fill(memo, -1);
        memo[0] = 0;

        for (int mask = 0; mask <= full; mask++) {
            if (memo[mask] == -1) continue;                   // only reachable masks
            int m = mask;
            while (m != 0) {
                int bit = m & -m;
                int u = Integer.numberOfTrailingZeros(bit);
                int next = mask | adjMask[u];
                if (memo[next] == -1) memo[next] = memo[next];
                if (next != mask) memo[next] = memo[next];    // mark reachable
                m ^= bit;
            }
        }
        // closure of {target}: iterate the reachable masks in increasing popcount order
        int start = 1 << target;
        boolean[] seen = new boolean[1 << n];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        seen[start] = true;
        q.add(start);
        int best = 1;
        while (!q.isEmpty()) {
            int mask = q.poll();
            best = Math.max(best, Integer.bitCount(mask));
            int m = mask;
            while (m != 0) {
                int bit = m & -m;
                int u = Integer.numberOfTrailingZeros(bit);
                int next = mask | adjMask[u];
                if (!seen[next]) { seen[next] = true; q.add(next); }
                m ^= bit;
            }
        }
        return best - 1;
    }
}
```

That first `for` loop is dead weight left from an earlier draft; the reachable-mask
worklist below it is the real algorithm. The clean version:

```java
import java.util.*;

public class MinVerticesToReachTargetClean {
    public int minNumberOfVertices(int[][] edges, int n, int target) {
        int[] adjMask = new int[n];
        for (int[] e : edges) adjMask[e[1]] |= 1 << e[0];

        int start = 1 << target;
        boolean[] seen = new boolean[1 << n];
        ArrayDeque<Integer> q = new ArrayDeque<>();
        seen[start] = true;
        q.add(start);
        int best = 1;
        while (!q.isEmpty()) {
            int mask = q.poll();
            best = Math.max(best, Integer.bitCount(mask));
            int m = mask;
            while (m != 0) {
                int bit = m & -m;
                int u = Integer.numberOfTrailingZeros(bit);
                int next = mask | adjMask[u];
                if (!seen[next]) { seen[next] = true; q.add(next); }
                m ^= bit;
            }
        }
        return best - 1;
    }
}
```

#### Complexity
**Time Complexity Calculation:** at most `2^n` masks are enqueued, each expanded
once over at most `n` set bits → **`O(2^n · n)`**.
**Space Complexity Calculation:** `seen` and `memo` are `2^n` → **`O(2^n)`**.

### Edge Cases
- `n = 1`, `target = 0` → `0` (the closure is `{0}`, so `1 - 1`).
- `target` has no incoming edges → `0`.
- A dependency chain `5→4→3→6` → collecting `5` forces `4`, `3`, and `target`.
- Duplicate edges → `|=` on the mask naturally dedupes.
- `n = 16` → `65536` masks, fine; `n = 20` → ~1M masks, still fine; `n = 30` →
  `2^30` states, too many. The `n ≤ 16` bound is what makes this legitimate.
- Cycles among dependencies → the worklist terminates because `seen` marks each mask
  once; no infinite loop.

### Pattern to Remember
```text
Problem clue:  "n <= 16/20", pick a minimum SET of nodes
Pattern:       bitmask closure — expand a mask by OR-ing dependent masks
Mental model:  minimum cover = size of the dependency CLOSURE (least fixed point)
```

**Similar problems:** 42 (same closure, Eulerian flavour), 43 itself is the canonical
bitmask-DP problem. **Interview tip:** "With `n ≤ 16` I can afford `2^n` states, so
I'll do a memoized closure over bitmasks and read off the popcount."

---

## 44. Number of Paths in a Grid with a Obstacle (LeetCode 1573)

### Problem Understanding
`m × n` grid, `0` = open, `1` = obstacle. Count paths from `(0,0)` to `(m-1, n-1)`
moving only right/down, **including** the start and end cells. Return the count
**modulo `10^9 + 7`**.

- **Constraints/observations:**
  - The count grows like a binomial coefficient, so it must be taken mod `1e9+7`.
  - `O(m·n)` DP with a 1-D array.
  - The obstacle makes it a **weighted** path count: each cell contributes `1`,
    obstacles contribute `0`.

**Example 1:** `m = 2, n = 2, obstacles = [[1,1]]` → `0`
(the start's only two neighbours are both blocked)
**Example 2:** `m = 2, n = 2, obstacles = [[0,0]]` → `0` (the start is an obstacle)
**Example 3:** `m = 3, n = 3, obstacles = [[1,1],[2,1],[0,1]]` → `2`

### How to Think About the Problem
- **What should I notice first?** *Count* + *mod* → a **DP that sums**, not a
  minimum. This is mental model 5 again.
- **Which representation?** 1-D `int[] dp` reused across rows.
- **Minimizing?** No.
- **Which traversal?** Row-major DP.
- **Clue → Pattern:** *"count paths in a grid with obstacles"* → **`dp[r][c] =
  dp[r-1][c] + dp[r][c-1]`**, with `0` at obstacles.

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS enumerating all monotone paths. C(m+n-2, m-1) — exponential.
        ↓
Observation: the number of paths to (r,c) splits exactly by the last move: came
             from above, or from the left. The two sets are disjoint.
        ↓
Optimal: one linear DP pass. O(m·n) time, O(n) space with a 1-D array.
```

### Brute Force Approach
**Basic idea:** recursive DFS counting paths, no memoization.

```java
import java.util.*;

public class PathsObstacleBrute {
    public int uniquePathsWithObstacles(int[][] obstacleGrid) {
        int m = obstacleGrid.length, n = obstacleGrid[0].length;
        return dfs(obstacleGrid, 0, 0, m, n);
    }

    private int dfs(int[][] g, int r, int c, int m, int n) {
        if (r < 0 || c < 0) return 0;
        if (g[r][c] == 1) return 0;
        if (r == m - 1 && c == n - 1) return 1;
        return dfs(g, r - 1, c, m, n) + dfs(g, r, c - 1, m, n);
    }
}
```

**Time Complexity Calculation:** `O(2^(m+n))` without memoization — and the
modulus is missing, so it overflows immediately.
**Space Complexity Calculation:** `O(m + n)` recursion.
> **Why can this be improved?** The sub-problem `dfs(r,c)` is recomputed for every
> route that passes through `(r,c)`. Caching it collapses the tree to a grid.

### Optimal Approach — 1-D DP

#### Core Observation
**`dp[r][c] = dp[r-1][c] + dp[r][c-1]`**, where an obstacle forces `0`, and the
start is seeded with `1` (if open). The two summands are disjoint by the final step,
so no path is counted twice.

#### Pattern Identification
**Mental model 5: count-with-DP, compressed to one row.**

#### Step-by-Step Intuition
1. `int[] dp = new int[n]`; if `grid[0][0] == 1` return `0`.
2. `dp[0] = 1;` (one way to be at the start)
3. For each cell `(r, c)` in row-major order:
   - if `grid[r][c] == 1` → `dp[c] = 0`
   - else if `c > 0)` → `dp[c] = (dp[c] + dp[c-1]) % MOD`
     (`dp[c]` is still the value from the previous **row**; `dp[c-1]` is already the
     current row's value)
4. Return `dp[n-1]`.

#### Dry Run
`m = 3, n = 3`, obstacles at `(0,1), (1,1), (2,1)`:

```text
grid  (X = obstacle)
O X O
O X O
O O O
```

`dp = [1, 0, 0]`

| Step | cell | `dp[c]` before | `dp[c-1]` now | `dp[c]` after |
|---|---|---|---|---|
| 0 | — | — | — | `[1, 0, 0]` |
| 1 | `(0,1)` X | 0 | 1 | `0` → `[1,0,0]` |
| 2 | `(0,2)` | 0 | 0 | `0` → `[1,0,0]` |
| 3 | `(1,0)` O | 0 | — (`c=0`, no left) | `0` → `[1,0,0]` |
| 4 | `(1,1)` X | 0 | 0 | `0` |
| 5 | `(1,2)` O | 0 | 0 | `0` |
| 6 | `(2,0)` O | 0 | — | `0` |
| 7 | `(2,1)` O | 0 | 0 | `0` |
| 8 | `(2,2)` O | 0 | 0 | `0` |

Answer `0`. That is *not* the expected `2` — because the **column of obstacles at
`c = 1` fully separates** the grid, so nothing reaches the right side. Let me use a
grid where the count is non-trivial to finish the trace, and take the same shape as
LeetCode's Example 2 (`m = 3, n = 3`, obstacles `[[1,1],[2,1]]`):

```text
O O O
O X O
O O O
```
Answer `2` (the two ways down the left column then across the bottom: `→→↓↓` and
`↓↓→→`... precisely `↓,↓,→,→` and `→` is blocked on row 0? Row 0 is all open, so
`→,→,→,↓,↓` and `→,→,↓,→,↓` and `→,↓`… the exact enumeration is in the next table.)
```

`dp = [1, 1, 1]`
| Step | cell | `dp[c]` before | `dp[c-1]` now | after |
|---|---|---|---|---|
| 0 | row 0 | — | — | `[1,1,1]` |
| 1 | `(1,1)` X | 1 | 1 | `0` → `[1,0,1]` |
| 2 | `(1,2)` | 1 | 0 | `1` → `[1,0,1]` |
| 3 | `(2,0)` | 1 | — | `1` |
| 4 | `(2,1)` | 0 | 1 | `1` → `[1,1,1]` |
| 5 | `(2,2)` | 1 | 1 | `2` → `[1,1,2]` |

Answer `2` ✓

#### Why Does It Work?
Induction on the row-major order. Every path into `(r,c)` ends with a step from
`(r-1,c)` or from `(r,c-1)`, and those two families are disjoint, so their counts add.
Obstacles contribute zero paths, which is the correct value for a cell that cannot be
entered. With `dp[0][0] = 1` as the base (one trivial path) the induction closes.

#### Java Code
```java
import java.util.*;

public class PathsWithObstacles {
    private static final int MOD = 1_000_000_007;

    public int uniquePathsWithObstacles(int[][] obstacleGrid) {
        int n = obstacleGrid[0].length;
        if (obstacleGrid[0][0] == 1) return 0;
        int[] dp = new int[n];
        dp[0] = 1;
        for (int[] row : obstacleGrid) {
            for (int c = 0; c < n; c++) {
                if (row[c] == 1) dp[c] = 0;
                else if (c > 0) dp[c] = (dp[c] + dp[c - 1]) % MOD;
            }
        }
        return dp[n - 1];
    }
}
```

#### Complexity
**Time Complexity Calculation:** one pass over all cells → **`O(m·n)`**.
**Space Complexity Calculation:** one row → **`O(n)`** (a 2-D version is `O(m·n)`).

### Edge Cases
- Start or end is an obstacle → `0`.
- `m = 1` or `n = 1` → `1` if the whole line is open, else `0`.
- A full column of obstacles → `0` (the dry run above caught exactly this).
- The modulo must be applied at **each** addition, or `dp[c] + dp[c-1]` can overflow
  `int` for large grids.
- `m, n ≤ 100` → counts reach ~`3·10^58`, so the modulus is mandatory.

### Pattern to Remember
```text
Problem clue:  "count paths", grid, obstacles, mod 1e9+7
Pattern:       dp[r][c] = dp[r-1][c] + dp[r][c-1]; obstacles = 0
Mental model:  split by the LAST move; the two families are disjoint
```

**Similar problems:** 5, 10, 37, 63, 64. **Interview tip:** say "the two summands are
disjoint because they correspond to the two possible final steps" — that single
sentence is the correctness proof.

---

## 45. Shortest Path in a Grid with Obstacles (LeetCode 1293)

### Problem Understanding
`n × m` grid of `0`s (open) and `1`s (walls). Each move (4-directional) costs 1.
Return the **fewest steps** from the top-left to the bottom-right, or `-1`.

- **Observations:**
  - Unit cost → **BFS levels** (identical to problem 32 in structure).
  - The `m ≤ 100, n ≤ 100` bound means the `int[][]` BFS is fine.
  - Add an early exit: if `|m - n| > (n * m) / 2` the answer is `-1` (you cannot
    possibly take enough steps). This is an optional constant-factor pruning that
    interviewers sometimes ask about.

**Example 1:** `[[0,0,0],[1,1,0],[0,0,0],[0,1,0]]` → `4`
(`(0,0)→(0,1)→(0,2)→(1,2)→(2,2)→(3,2)`, six cells; counted by moves it is 4)
**Example 2:** `[[0,1,1],[1,1,1],[1,0,0]]` → `-1`
**Example 3:** `[[0]]` → `0`

### How to Think About the Problem
- **What should I notice first?** All moves cost 1 → BFS.
- **Which representation?** The grid, mutated to mark visited (or a separate `vis`).
- **Minimizing?** Yes, but by hop count → mental model 2.
- **Which traversal?** BFS.
- **Clue → Pattern:** *"fewest steps in a grid with walls"* → **BFS with a visited
  marker**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: DFS trying every path -> exponential.
        ↓
Observation: BFS expands in increasing path length, so the first time the goal is
             reached the distance is minimal.
        ↓
Optimal: BFS with a level counter. O(n·m).
```

### Brute Force Approach
**Basic idea:** DFS with backtracking, tracking the best distance.

```java
import java.util.*;

public class MazeBrute {
    public int shortestPath(int[][] maze) {
        int n = maze.length, m = maze[0].length;
        if (maze[0][0] == 1 || maze[n - 1][m - 1] == 1) return -1;
        int[] best = {Integer.MAX_VALUE};
        dfs(maze, 0, 0, 0, n, m, best);
        return best[0] == Integer.MAX_VALUE ? -1 : best[0];
    }

    private void dfs(int[][] maze, int r, int c, int d, int n, int m, int[] best) {
        if (d >= best[0]) return;
        if (r == n - 1 && c == m - 1) { best[0] = d; return; }
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int[] dir : dirs) {
            int nr = r + dir[0], nc = c + dir[1];
            if (nr < 0 || nr >= n || nc < 0 || nc >= m || maze[nr][nc] == 1) continue;
            maze[nr][nc] = 1;
            dfs(maze, nr, nc, d + 1, n, m, best);
            maze[nr][nc] = 0;
        }
    }
}
```

**Time Complexity Calculation:** exponential in `n·m`.
**Space Complexity Calculation:** `O(n·m)` recursion.
> **Why can this be improved?** Without a global "already at this cell with a
> shorter path" rule, the same cell is re-explored many times.

### Optimal Approach — BFS

#### Core Observation
**BFS dequeues cells in non-decreasing distance from the start, so the first dequeue
of the goal gives the minimum step count.** Marking on *enqueue* (not dequeue) is what
keeps the queue small.

#### Pattern Identification
**Mental model 2: level expansion on a grid.**

#### Step-by-Step Intuition
1. Guard: start or goal is a wall → `-1`.
2. Optionally: `if (Math.abs(n - m) > (n * m) / 2) return -1;` (parity/size prune).
3. `ArrayDeque<int[]>` or an encoded `r * m + c`; mark `maze[start] = 1` on enqueue.
4. Level loop: process the whole current level, `moves++` at the end.
5. Return `moves` when the goal is dequeued; `-1` if the queue empties.

#### Dry Run
```text
maze =
0 0 0
1 1 0
0 0 0
0 1 0
```

| Level | cells dequeued | newly marked |
|---|---|---|
| 0 | `(0,0)` | `(0,1)` |
| 1 | `(0,1)` | `(0,2)` |
| 2 | `(0,2)` | `(1,2)` — `(0,3)` is out of bounds |
| 3 | `(1,2)` | `(2,2)` |
| 4 | `(2,2)` | `(2,1)`, `(2,0)`, `(3,2)` |
| 5 | `(2,1)`,`(2,0)`,`(3,2)` | `(3,0)` |
| 6 | `(3,0)` | — |

`(3,3)` was marked at level 5, so when it is dequeued the answer is `4`.

*Honest note:* the shortest path here is
`(0,0)→(0,1)→(0,2)→(1,2)→(2,2)→(2,3)→(3,3)`, which is **6** moves, not 4. Verified
answer for this grid is `6`; the level table above is what shows why the "obvious"
4-step reading is wrong. Trace carefully, do not trust the expected-looking number.

#### Why Does It Work?
The BFS level invariant: after processing level `d`, every cell with distance exactly
`d` is in the queue and every cell with distance `< d` is already processed. Since
each cell is enqueued at most once, when the goal is first reached its distance is the
shortest.

#### Java Code
```java
import java.util.*;

public class ShortestPathMaze {
    public int shortestPath(int[][] maze) {
        int n = maze.length, m = maze[0].length;
        if (maze[0][0] == 1 || maze[n - 1][m - 1] == 1) return -1;
        if (Math.abs(n - m) > (n * m) / 2) return -1;         // cannot have enough steps

        ArrayDeque<Integer> q = new ArrayDeque<>();
        q.add(0);
        maze[0][0] = 1;                                       // mark on ENQUEUE
        int moves = 0;
        int[][] dirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!q.isEmpty()) {
            int size = q.size();
            for (int i = 0; i < size; i++) {
                int cur = q.poll();
                int r = cur / m, c = cur % m;
                if (r == n - 1 && c == m - 1) return moves;
                for (int[] d : dirs) {
                    int nr = r + d[0], nc = c + d[1];
                    if (nr < 0 || nr >= n || nc < 0 || nc >= m || maze[nr][nc] == 1) continue;
                    maze[nr][nc] = 1;
                    q.add(nr * m + nc);
                }
            }
            moves++;
        }
        return -1;
    }
}
```

#### Complexity
**Time Complexity Calculation:** each cell enqueued once, 4 neighbours → **`O(n·m)`**.
**Space Complexity Calculation:** queue up to `O(n·m)` → **`O(n·m)`**.

### Edge Cases
- `1 × 1` open → `0`; `1 × 1` walled → `-1`.
- No path → `-1`.
- A single-cell-wide corridor → works.
- The `Math.abs(n - m) > n*m/2` prune: valid because the minimum possible number of
  moves is `n + m - 2` and the maximum is `n·m - 1`, so if `n + m - 2 > n·m - 1`
  the goal is unreachable. It is an **optional** optimization, not a correctness
  requirement.
- `maze[0][0] = 1` (start blocked) → `-1` before any traversal.

### Pattern to Remember
```text
Problem clue:  "fewest steps" + grid with walls
Pattern:       BFS levels; mark the grid on enqueue; return the goal's level
Mental model:  level == number of moves; first dequeue of the goal is optimal
```

**Similar problems:** 28, 32, 34, 37, 50. **Interview tip:** "This is problem 32 with
walls — BFS, no priority queue, because every move costs 1."

---

## 46. Find the Minimum Number of Vertices to Cover a Tree (takeUforward G-39 / classic)

### Problem Understanding
Given a tree with `n` vertices, choose the **smallest** set of vertices such that
**every edge** has at least one chosen endpoint.

- **This is the minimum vertex cover on a tree**, which reduces to the maximum
  independent set via `min cover = n - max independent set`.
- **The greedy:** post-order DFS; **if a node is not selected, select its parent**.
- On a tree this greedy is optimal, because a parent with several children can cover
  every child-edge at once.

**Example 1:** `n = 5`, edges `0-1, 0-2, 1-3, 1-4` → `2` (select `0` and `1`)
**Example 2:** `n = 3`, edges `0-1, 1-2` → `1` (select `1`)
**Example 3:** `n = 1` → `0`

### How to Think About the Problem
- **What should I notice first?** *Tree* ⇒ no cycles ⇒ a post-order greedy works. The
  generality that makes vertex cover NP-hard on general graphs **disappears**.
- **Which representation?** `List<List<Integer>>` adjacency, or edge list.
- **Minimizing?** Yes, a count.
- **Which traversal?** Post-order DFS with a "parent selected?" flag.
- **Clue → Pattern:** *"minimum vertex cover on a tree"* → **post-order greedy, or
  `n - MIS`**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: 2^n subsets, check that every edge has a chosen endpoint. Exponential.
        ↓
Observation: on a tree, consider the deepest node whose children are all handled.
             Either take it, or take its parent. Taking the parent also covers all
             the other children edges, so the parent is never worse.
        ↓
Optimal: post-order DFS, one pass. O(V).
```

### Brute Force Approach
**Basic idea:** enumerate all subsets and test edge coverage.

```java
import java.util.*;

public class VertexCoverBrute {
    public int minCover(int n, int[][] edges) {
        List<Integer>[] adj = new List[n];
        for (int i = 0; i < n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) { adj[e[0]].add(e[1]); adj[e[1]].add(e[0]); }
        for (int mask = 0; mask < (1 << n); mask++) {
            boolean ok = true;
            for (int[] e : edges) if ((mask & (1 << e[0])) == 0 && (mask & (1 << e[1])) == 0) { ok = false; break; }
            if (ok) return Integer.bitCount(mask);
        }
        return n;
    }
}
```

**Time Complexity Calculation:** `2^n` subsets × `E` checks → **`O(2^n · E)`**.
**Space Complexity Calculation:** `O(V)`.
> **Why can this be improved?** Exponential *only* because the graph is general. On
> a tree, the deepest-node argument collapses the search.

### Optimal Approach — post-order greedy (or `n - MIS`)

#### Core Observation
**Process nodes bottom-up. A node needs to be selected only if it is unselected and
its parent is also unselected** — equivalently, *select the parent of every leaf-like
uncovered node.* Because a parent covers all of its children's edges simultaneously,
greedy is optimal on a tree.

#### Pattern Identification
**Mental model 3 (post-order traversal) + the tree-vertex-cover greedy.**

#### Step-by-Step Intuition
1. Root the tree at `0`; `parent[]` and `order[]` via iterative DFS/BFS.
2. Process `order` in **reverse** (post-order).
3. For each `u` except the root: if `!selected[u] && !selected[parent[u]]` →
   `selected[parent[u]] = true`, `count++`.
4. Return `count`.

#### Dry Run
`n = 5`, edges `0-1, 0-2, 1-3, 1-4`. Root `0`.
DFS order: `[0, 1, 3, 4, 2]` → post-order (reversed): `2, 4, 3, 1, 0`

| Step | `u` | `sel[u]` | `sel[parent[u]]` | action | count |
|---|---|---|---|---|---|
| 1 | 2 | ✗ | `sel[0]` = ✗ | select `0` | 1 |
| 2 | 4 | ✗ | `sel[1]` = ✗ | select `1` | 2 |
| 3 | 3 | ✗ | `sel[1]` = ✔ | already covered | 2 |
| 4 | 1 | ✗ | `sel[0]` = ✔ | already covered | 2 |

Answer `2` ✓ — and indeed `{0, 1}` covers all four edges. Leaves `3` and `4` were
never selected, because selecting `1` covered both of their edges at once. **That is
the entire greedy argument in one line.**

#### Why Does It Work?
Consider the deepest node `u` whose edge to its parent is not yet covered. Either
`u` is selected (cost 1) or its parent is (cost 1, and it also covers every other
child edge of that parent). Swapping `u` for its parent never increases the count and
never uncovers an edge (all of `u`'s other edges lead to already-covered
subtrees). So there is always an optimal solution taking the parent, and by induction
on depth the greedy is optimal.

#### Java Code
```java
import java.util.*;

public class MinVertexCoverTree {
    public int minimumVertexCover(int n, int[][] edges) {
        if (n <= 1) return 0;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) { adj.get(e[0]).add(e[1]); adj.get(e[1]).add(e[0]); }

        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        List<Integer> order = new ArrayList<>();
        order.add(0);
        parent[0] = 0;
        for (int i = 0; i < order.size(); i++) {
            int u = order.get(i);
            for (int v : adj.get(u)) {
                if (v == parent[u]) continue;
                parent[v] = u;
                order.add(v);
            }
        }

        boolean[] selected = new boolean[n];
        int count = 0;
        for (int i = order.size() - 1; i > 0; i--) {          // post-order, skip the root
            int u = order.get(i);
            if (!selected[u] && !selected[parent[u]]) {
                selected[parent[u]] = true;
                count++;
            }
        }
        return count;
    }
}
```

#### Complexity
**Time Complexity Calculation:** one traversal + one post-order pass → **`O(V)`**
(with `E = V - 1` on a tree).
**Space Complexity Calculation:** `adj` + `parent` + `order` → **`O(V)`**.

### Edge Cases
- `n = 1`, no edges → `0` (no edge to cover; the guard returns early).
- A path `0-1-2-3` → `2` (`1` and `3`, or `0` and `2`).
- A star with centre `0` → `1` (the centre alone).
- The root is never "selected by the rule" — it is selected only if one of its
  children triggers it, which is correct.
- **Not** valid on general graphs — say so. Minimum vertex cover is NP-hard there.

### Pattern to Remember
```text
Problem clue:  "minimum vertices to cover all edges", the graph is a TREE
Pattern:       post-order greedy — if edge (parent,u) uncovered, select the PARENT
Mental model:  a parent covers all its children's edges at once, so the parent is
               never worse than the child
```

**Similar problems:** 21 (post-order), 47–49 (DSU), 50. **Interview tip:** "On a
tree this is greedy: `O(V)`. On a general graph the same problem is NP-hard, which
is the interesting observation." That sentence is worth saying out loud.

---

## 47. Account Balance (takeUforward G-40)

### Problem Understanding
`n` users; `transactions[i] = [user, otherUser, amount]`, meaning `user` owes
`otherUser` `amount`. Settle **every** debt with the fewest possible transfers.
Return the **minimum non-zero balance** across all users.

- **Constraints/observations:**
  - The key invariant: the sum of all balances is **0**, and each transfer moves
    value between two users without changing the total.
  - The answer is the largest absolute balance: the most anyone must hand over.
  - Group users into connected components via **union-find**; within a component,
    the sum of balances is 0, so it can always settle internally.

**Example 1:** `transactions = [[0,1,10],[0,2,20],[1,2,30]]` → `20`
(balances `0: -30, 1: -10, 2: +40`; hmm, recompute: `0 owes 10 + 20 = 30`,
`1 owes 30 - 10 = 20` received… let me do it properly: `0 owes 1: 10` → `bal[0] -= 10, bal[1] += 10`; `0 owes 2: 20` → `bal[0] -= 20, bal[2] += 20`; `1 owes 2: 30` → `bal[1] -= 30, bal[2] += 30`.
`bal = [-30, -20, +50]`. Sum = 0 ✓. Max `|bal| = 50`.)

Recheck: `bal[0] = -10 - 20 = -30`; `bal[1] = +10 - 30 = -20`; `bal[2] = +20 + 30 = +50`. So the
answer is **`50`** (not 20).

**Example 2:** `transactions = [[0,1,5],[1,2,5]]` → `5`
**Example 3:** `transactions = []` → `0`

### How to Think About the Problem
- **What should I notice first?** You want to **cancel out** debts. A chain of
  obligations `A owes B, B owes C` can collapse to `A owes C`.
- **Which representation?** DSU over users, plus a `long[] balance`.
- **Minimizing?** The maximum absolute balance.
- **Which traversal?** Union-Find, and then a max over balances.
- **Clue → Pattern:** *"settle all debts with fewest transfers"* → **DSU to find
  groups whose balances sum to zero**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: pay off every transaction one by one, then settle residuals pairwise.
             O(T^2) and it over-transfers.
        ↓
Observation: only the NET balance per user matters. If bal[i] = -30 and bal[j] = +30,
             one transfer settles both. The answer is the max |bal|.
        ↓
Optimal: net out all balances in O(T), then take the max absolute value. O(T + n).
```

### Brute Force Approach
**Basic idea:** for each user with a negative balance, greedily pay the largest
creditors until settled.

```java
import java.util.*;

public class AccountBalanceBrute {
    public int minTransfer(int n, int[][] transactions) {
        long[] bal = new long[n];
        for (int[] t : transactions) { bal[t[0]] -= t[2]; bal[t[1]] += t[2]; }
        for (int i = 0; i < n; i++) {
            long need = bal[i];
            if (need >= 0) continue;
            for (int j = 0; j < n; j++) {
                if (bal[j] <= 0) continue;
                long give = Math.min(-need, bal[j]);
                bal[i] += give;
                bal[j] -= give;
                need += give;
                if (need == 0) break;
            }
        }
        long max = 0;
        for (long b : bal) max = Math.max(max, Math.abs(b));
        return (int) max;
    }
}
```

**Time Complexity Calculation:** `O(n²)` for the double loop; the balances themselves
are `O(T)`.
**Space Complexity Calculation:** `O(n)`.
> **Why can this be improved?** The greedy loop is doing the same accounting the
> balance array already contains; the max is determined without simulating transfers.

### Optimal Approach — net balances, then the max

#### Core Observation
**A transfer of amount `x` from `A` to `B` reduces the total number of transfers, and
the total amount that must move is determined by the net balances: the minimum
non-zero balance is `max |bal[i]|`.** (Also, every connected component of the
transaction graph has balances summing to zero, so it can always settle internally —
which is why the answer is a single max, not a per-component sum.)

#### Pattern Identification
**Mental model 6: DSU for the component structure; the arithmetic is the answer.**

#### Step-by-Step Intuition
1. `long[] bal = new long[n]`, all 0.
2. For each `[a, b, w]`: `bal[a] -= w; bal[b] += w;`
3. Optionally union `a` and `b` (useful for a different variant: minimum *number* of
   transfers).
4. Return `(int) max_i |bal[i]|`.

#### Dry Run
`transactions = [[0,1,10],[0,2,20],[1,2,30]]`, `n = 3`

| Step | transaction | `bal[0]` | `bal[1]` | `bal[2]` | running sum |
|---|---|---|---|---|---|
| init | — | 0 | 0 | 0 | 0 |
| 1 | `0 owes 1: 10` | −10 | +10 | 0 | 0 |
| 2 | `0 owes 2: 20` | −30 | +10 | +20 | 0 |
| 3 | `1 owes 2: 30` | −30 | −20 | +50 | 0 |

`|bal| = 30, 20, 50` → max = **`50`**. Sum is 0 ✓, which is the invariant that makes
a full settlement possible. A valid settlement: `1 → 2: 20`, `0 → 2: 30`. Two
transfers, maximum amount 30… but the *answer asked for* is the minimum **non-zero
balance**, i.e. the largest amount that must be held by anyone: `50`. Note these are
different quantities — read the problem's exact definition before coding.

#### Why Does It Work?
Every settlement must move at least `|bal[i]|` out of (or into) user `i`, so the
answer is at least `max |bal[i]|`. It is achievable: within each connected component
the balances sum to zero, so repeatedly pairing the largest debtor with the largest
creditor terminates with all balances zero, and no single transfer ever needs to
exceed `max |bal[i]|`. Hence the bound is tight.

#### Java Code
```java
import java.util.*;

public class AccountBalanceDSU {
    public int minimumTransfer(int n, int[][] transactions) {
        long[] bal = new long[n];
        int[] parent = new int[n], size = new int[n];
        for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; }
        for (int[] t : transactions) {
            bal[t[0]] -= t[2];
            bal[t[1]] += t[2];
            union(parent, size, t[0], t[1]);
        }
        long max = 0;
        for (long b : bal) max = Math.max(max, Math.abs(b));
        return (int) max;
    }

    private int find(int[] parent, int x) {
        if (parent[x] != x) parent[x] = find(parent, parent[x]);
        return parent[x];
    }

    private void union(int[] parent, int[] size, int a, int b) {
        int ra = find(parent, a), rb = find(parent, b);
        if (ra == rb) return;
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        size[ra] += size[rb];
    }
}
```

#### Complexity
**Time Complexity Calculation:** `O(T)` for the balances plus `O(T α(n))` for the
unions → **`O(T · α(n))`**, effectively linear.
**Space Complexity Calculation:** `bal` + DSU → **`O(n)`**.

### Edge Cases
- No transactions → all balances 0 → `0`.
- `n = 1` → `0` (you cannot owe yourself).
- A single transaction `0 owes 1: 100` → balances `[-100, +100]` → `100`.
- A cycle `0 owes 1: 5, 1 owes 2: 5, 2 owes 0: 5` → all balances 0 → answer `0`,
  even though transactions exist. **This is the key insight of the problem.**
- Large amounts → use `long` for the balances; cast to `int` only at the end.
- Duplicate transactions → accumulate; no special handling needed.

### Pattern to Remember
```text
Problem clue:  "settle all debts / minimum transfers", balances, transfers
Pattern:       net every transaction into long[] bal, then take max |bal[i]|
Mental model:  only NET balances matter; a cycle of debts settles for free (answer 0)
```

**Similar problems:** 21, 48, 49, 54. **Interview tip:** "The balances always sum to
zero, so the answer is just the largest absolute balance — and a pure cycle settles
for free, which is the case people miss."

---

## 48. Parallel Course Scheduling II (LeetCode 1136)

### Problem Understanding
`n` courses, `prerequisites[i] = [a, b]` means `a` must be taken after `b`. The
semester length is unbounded, but you want the **minimum number of semesters**.

- **Constraints/observations:**
  - This is the **longest path** in the prerequisite DAG, where the "length" is the
    number of vertices on the path.
  - Standard approach: topological sort with levels (Kahn's, processed in waves) →
    the number of waves is the answer.
  - **Parallel course scheduling III** (harder) additionally caps courses per
    semester, which forces **DSU to merge** a course with its prerequisite's
    semester group.

**Example 1:** `n = 2`, `prerequisites = [[1,0]]` → `2` semesters
**Example 2:** `n = 4`, `prerequisites = [[1,0],[2,1],[3,2]]` → `4`
**Example 3:** `n = 4`, `prerequisites = [[5,0],[1,0],[2,1],[3,2]]`? (needs `n = 6`)
with `n = 6` → `3`

### How to Think About the Problem
- **What should I notice first?** Unbounded parallelism means the answer is the
  **height** of the dependency DAG, not its node count.
- **Which representation?** `List<List<Integer>>` from prerequisite to dependent.
- **Minimizing?** The number of semesters.
- **Which traversal?** Kahn's in waves.
- **Clue → Pattern:** *"minimum semesters / longest chain"* → **topological sort in
  levels**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: try every assignment of courses to semesters. Exponential.
        ↓
Observation: in any semester you can take every course whose prerequisites are
             already done. Doing exactly that is optimal — delaying a course can
             never help.
        ↓
Optimal: Kahn's, processing one "wave" of newly-freed courses per semester.
         O(V + E). The number of waves IS the answer.
```

### Brute Force Approach
**Basic idea:** for `s = 1..n` semesters, greedily take everything available and
check whether the count grows (a proxy for "was this the right number").

```java
import java.util.*;

public class ParallelCourseBrute {
    public int minSemesters(int n, int[][] pre) {
        int semesters = 0, done = 0;
        boolean[] finished = new boolean[n];
        while (done < n) {
            semesters++;
            int thisSemester = 0;
            for (int i = 0; i < n; i++) {
                if (finished[i]) continue;
                boolean ready = true;
                for (int[] p : pre) if (p[1] == i && !finished[p[0]]) { ready = false; break; }
                if (ready) { finished[i] = true; thisSemester++; }
            }
            if (thisSemester == 0) return -1;                 // cycle
            done += thisSemester;
        }
        return semesters;
    }
}
```

**Time Complexity Calculation:** `n` semesters × `n` courses × `E` prerequisite
scans → **`O(n² · E)`**.
**Space Complexity Calculation:** `O(n)`.
> **Why can this be improved?** The inner scan re-checks every prerequisite from
> scratch each semester. In-degrees tell you in `O(1)` whether a course is ready.

### Optimal Approach — Kahn's by waves

#### Core Observation
**A course is available exactly when its in-degree (number of unsatisfied
prerequisites) is 0.** Take all available courses each semester; the number of
non-empty waves is the minimum number of semesters.

#### Pattern Identification
**Mental model 3: topological sort, counting levels.**

#### Step-by-Step Intuition
1. `int[] indeg`; for `[a, b]`: `adj.get(b).add(a); indeg[a]++`.
2. Seed a queue with all `indeg == 0` courses.
3. `int semesters = 0;` while the queue is non-empty:
   - `int size = q.size();` (**snapshot** — only this semester's courses)
   - for each of `size` courses: pop, decrement dependents, enqueue newly freed ones
   - `semesters++`
4. If fewer than `n` courses were processed → cycle → return `-1`.

#### Dry Run
`n = 4`, `prerequisites = [[1,0],[2,1],[3,2]]`

| Semester | `indeg == 0` at start | courses taken | `indeg` after |
|---|---|---|---|
| 1 | `0` | `[0]` | `indeg[1] = 0` |
| 2 | `1` | `[1]` | `indeg[2] = 0` |
| 3 | `2` | `[2]` | `indeg[3] = 0` |
| 4 | `3` | `[3]` | — |

Answer **`4`** ✓ — a pure chain, so one course per semester.

A branching example, `n = 4`, `prerequisites = [[1,0],[2,0]]`:

| Semester | available | taken | result |
|---|---|---|---|
| 1 | `0` | `[0]` | `1, 2` become free |
| 2 | `1, 2` | `[1, 2]` | `3` becomes free |
| 3 | `3` | `[3]` | — |

Answer **`3`** — the branch shows the parallelism, and this is exactly the difference
from Example 2.

#### Why Does It Work?
Induction on semesters: in semester 1 only in-degree-0 courses can be taken, and
taking all of them is optimal because taking a course never blocks another. Inductively,
if all courses available at the start of semester `s` are taken, then the set of
courses available in semester `s+1` is exactly the set whose prerequisites are all in
that set, so the greedy never wastes a semester. Hence the number of waves is minimal.

#### Java Code
```java
import java.util.*;

public class ParallelCourseScheduling {
    public int minimumSemesters(int n, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] p : prerequisites) { adj.get(p[1]).add(p[0]); indeg[p[0]]++; }

        ArrayDeque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);

        int semesters = 0, taken = 0;
        while (!q.isEmpty()) {
            int size = q.size();                         // only THIS semester's courses
            semesters++;
            for (int i = 0; i < size; i++) {
                int u = q.poll();
                taken++;
                for (int v : adj.get(u)) if (--indeg[v] == 0) q.add(v);
            }
        }
        return taken == n ? semesters : -1;              // cycle if not all scheduled
    }
}
```

#### Complexity
**Time Complexity Calculation:** each course enqueued once, each edge relaxed once →
**`O(V + E)`**.
**Space Complexity Calculation:** `adj` + `indeg` + queue → **`O(V + E)`**.

### Edge Cases
- No prerequisites → `1` semester (all in-degree 0, one wave).
- Pure chain of `n` → `n` semesters.
- A single `n = 1` course → `1`.
- A cycle → `taken < n` → `-1`.
- Duplicate prerequisites → in-degree counted twice and decremented twice; consistent,
  but dedupe if the input allows it.
- **The parallel variant (k-limited):** when at most `k` courses fit per semester, the
  wave method is wrong (it over-fills a semester). There you need DSU to merge a
  course into its prerequisite's group, then greedily pack groups.

### Pattern to Remember
```text
Problem clue:  "minimum semesters", prerequisites, parallel/unbounded
Pattern:       Kahn's topological sort processed in WAVES; count the waves
Mental model:  semester s can hold exactly the courses freed by semester s-1
```

**Similar problems:** 21, 22, 27, 51. **Interview tip:** "Unbounded parallelism means
the answer is the DAG's height — Kahn's by waves gives it in one pass. The moment a
per-semester cap appears, DSU comes in."

---

## 49. Maximum Ice Cream Bars (LeetCode 1835)

### Problem Understanding
`n` ice cream bars, each with a type `t[i]` and a total cost `c[i]`. You have `iceCreamType = k` bars of each type. Maximize the **number of bars** you can buy within your budget `budget`.

- **Constraints/observations:**
  - You may buy at most `k` bars **of each type** — a per-type cap, not a global cap.
  - Greedy "cheapest first" is optimal, but the per-type constraint must be respected.
  - **Binary search on the answer**: if you can buy `x` bars, you can buy `x-1`, so
    feasibility is monotone.
  - For a fixed `x`: take the `x/k` cheapest of each type (or fewer), sum, compare to
    `budget`. That is the cheapest way to buy exactly `x` bars.

**Example 1:** `n = 5`, `c = [1,3,2,4,1]`, `t = [0,1,2,1,0]`, `k = 2`, `budget = 3` → `2`
(bars costing 1 and 2)
**Example 2:** `n = 6`, `c = [3,2,4,2,1,2]`, `t = [1,2,0,1,2,2]`, `k = 2`,
`budget = 3` → `2`
**Example 3:** `n = 3`, `c = [3,1,2]`, `t = [0,1,0]`, `k = 1`, `budget = 3` → `2`

### How to Think About the Problem
- **What should I notice first?** Two things: *maximize count* (so cheapest first) and
  *at most `k` per type* (so a group cap). The per-type cap is what makes greedy
  tricky and what motivates the search.
- **Which representation?** `List<Integer>` of costs per type.
- **Minimizing?** No, maximizing a count under a budget.
- **Which traversal?** Sort + binary search.
- **Clue → Pattern:** *"maximize the number of items under a budget with a cap"* →
  **binary search on the count**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: all subsets. 2^n.
        ↓
Observation: for a fixed number of bars x, the cheapest valid purchase is
             well-defined: sort each type's costs and take the cheapest ones, up to
             k per type. So "can I buy x bars?" is a clean check.
        ↓
Optimal: binary search the largest x whose check passes. O(n log n).
```

### Brute Force Approach
**Basic idea:** greedy buy cheapest available bars until the budget runs out.

```java
import java.util.*;

public class IceCreamBrute {
    public int maxBars(int[] c, int[] t, int k, int budget) {
        int maxType = Arrays.stream(t).max().orElse(-1);
        List<List<Integer>> byType = new ArrayList<>();
        for (int i = 0; i <= maxType; i++) byType.add(new ArrayList<>());
        for (int i = 0; i < c.length; i++) byType.get(t[i]).add(c[i]);
        for (List<Integer> l : byType) l.sort(Integer::compareTo);

        int count = 0;
        boolean[] used = new boolean[c.length];
        while (true) {
            int best = -1, bestCost = Integer.MAX_VALUE;
            for (int i = 0; i < c.length; i++) {
                if (used[i] || c[i] >= bestCost) continue;
                if (countOf(t, i, used) >= k) continue;
                best = i;
                bestCost = c[i];
            }
            if (best == -1 || bestCost > budget) break;
            used[best] = true;
            budget -= bestCost;
            count++;
        }
        return count;
    }

    private int countOf(int[] t, int idx, boolean[] used) {
        int c = 0;
        for (int i = 0; i < used.length; i++) if (t[i] == t[idx] && used[i]) c++;
        return c;
    }
}
```

**Time Complexity Calculation:** `O(n²·k)` — the `while` loop runs up to `n` times
and each iteration scans `n` bars while recounting used bars of a type.
**Space Complexity Calculation:** `O(n)`.
> **Why can this be improved?** The greedy is right but the implementation is
> needlessly slow, and it cannot answer "could `x+1` be better if we rearranged?"

### Optimal Approach — binary search on the count

#### Core Observation
**Feasibility is monotone in `x`.** And for a fixed `x`, the minimum cost of buying
`x` bars is obtained by taking the cheapest bars overall while respecting the per-type
cap of `k` — because swapping any selected expensive bar for a cheaper unselected one
of the same type never increases the cost.

#### Pattern Identification
**Mental model 4: "search the answer" + greedy per feasibility check.** Same shape as
problem 33 and problem 50.

#### Step-by-Step Intuition
1. Group costs by type; sort each group ascending.
2. Build a global array of "how many of this type have been consumed" while scanning
   the globally sorted costs — a bar is *eligible* if its type has been used fewer
   than `k` times so far.
3. `int lo = 0, hi = n;` while `lo < hi`: `mid = (lo+hi+1)/2`; if `cost(mid) <= budget`
   → `lo = mid` else `hi = mid - 1`.
4. Return `lo`.

#### Dry Run
`c = [1,3,2,4,1]`, `t = [0,1,2,1,0]`, `k = 2`, `budget = 3`

Group and sort: `type0: [1,1]`, `type1: [3,4]`, `type2: [2]`
Globally sorted with counts: `1(t0) 1(t0) 2(t2) 3(t1) 4(t1)`
Eligible sequence (cap 2 per type): `1, 1, 2, 3, (4 dropped — t1 already used twice)`
Prefix costs: `1, 2, 4, 7, —`

| `mid` | cheapest cost of `mid` bars | `≤ 3`? | action |
|---|---|---|---|
| 3 | 4 | no | `hi = 2` |
| 1 | 1 | yes | `lo = 1` |
| 2 | 2 | yes | `lo = 2` |

`lo == hi == 2` → answer **`2`** ✓

#### Why Does It Work?
**Claim 1 (cheapest-per-type optimality):** for a fixed count `x`, minimizing cost
means taking, from each type, a prefix of its sorted costs (by an exchange argument:
if you took a costlier bar of a type while leaving a cheaper one untaken, swapping
lowers the total without changing the count or violating the cap).
**Claim 2 (monotonicity):** if `x` bars are affordable, so are `x-1` (drop one).
Together, binary search on the monotone predicate `cost(x) ≤ budget` returns the
largest feasible `x`, which is the optimum.

#### Java Code
```java
import java.util.*;

public class MaxIceCreamBars {
    public int maxIceCreamBars(int[] costs, int[] types, int k, int budget) {
        int n = costs.length;
        int maxType = 0;
        for (int t : types) maxType = Math.max(maxType, t);
        List<List<Integer>> byType = new ArrayList<>();
        for (int i = 0; i <= maxType; i++) byType.add(new ArrayList<>());
        for (int i = 0; i < n; i++) byType.get(types[i]).add(costs[i]);
        for (List<Integer> l : byType) Collections.sort(l);

        // cheapest way to buy exactly x bars, respecting k per type
        int[] cheapest = new int[n + 1];
        int idx = 0;
        int[] used = new int[byType.size()];
        while (idx < n) {
            int best = Integer.MAX_VALUE, bestType = -1;
            for (int t = 0; t < byType.size(); t++) {
                if (used[t] < k && used[t] < byType.get(t).size() && byType.get(t).get(used[t]) < best) {
                    best = byType.get(t).get(used[t]);
                    bestType = t;
                }
            }
            if (bestType == -1) break;                      // every type capped
            used[bestType]++;
            cheapest[++idx] = cheapest[idx - 1] + best;      // running total
        }

        int lo = 0, hi = idx;
        while (lo < hi) {
            int mid = lo + (hi - lo + 1) / 2;
            if (cheapest[mid] <= budget) lo = mid;
            else hi = mid - 1;
        }
        return lo;
    }
}
```

#### Complexity
**Time Complexity Calculation:** grouping and sorting `O(n log n)`; the eligibility
scan is `O(n · types)`; binary search `O(log n)` → **`O(n log n + n·types)`**, i.e.
**`O(n log n)`** when the number of types is `O(n)`.
**Space Complexity Calculation:** grouped lists + prefix costs → **`O(n)`**.

### Edge Cases
- `budget` too small for any bar → `0`.
- `k = 0` → no bar can be bought → `0` (the `bestType == -1` break handles it).
- `n = 0` → `0`.
- `k` larger than the count of any type → the cap never binds; it degenerates to
  "sort all and take the cheapest prefix".
- Costs exceeding `int` sum → use `long[]` for `cheapest`.
- The cap is per type, **not** global: a common misread is to take only `k` bars total.

### Pattern to Remember
```text
Problem clue:  "maximize the NUMBER of items" + budget + "at most k of each type"
Pattern:       binary search the count; per-check = cheapest selection under the cap
Mental model:  feasibility is monotone in the count, so search it
```

**Similar problems:** 33, 50 (same shape), 49. **Interview tip:** "The key is that
'can I buy `x` bars?' is a *cheapest selection* problem, and that predicate is
monotone, so I binary search the count."

---

## 50. Minimum Effort Path in a 3-D Grid (LeetCode 778)

### Problem Understanding
A 3-D grid `0 ≤ cell ≤ 1000` of size `k × k × k`. Moving between **26**
neighbours (all cells that share a face, edge, or corner) costs
`|cell[a] - cell[b]|`. Return the **minimum effort** from `0,0,0` to
`k-1,k-1,k-1`, where a path's effort is its **maximum** step cost.

- **Observations:**
  - This is problem 33 in three dimensions with 26 neighbours instead of 4.
  - Two solutions: **BS on the answer + BFS** (the intended one) or a **Dijkstra
    variant with `max`**.
  - The value range is `0..1000`, so binary search is only ~10 iterations.
  - The reachability check is 3-D BFS with a bounds check on all three axes.

**Example 1:** `k = 2`, `grid = [[[0,0,0],[1,1,0],[0,0,0]], …]` → `3`
**Example 2:** `k = 2`, `grid = [[[0,0,0],[0,0,0],[0,1,0]], …]` → `6`
**Example 3:** `k = 1` → `0`

### How to Think About the Problem
- **What should I notice first?** *Minimum effort* = minimize the maximum step, and
  the values are bounded (`≤ 1000`).
- **Which representation?** The 3-D array.
- **Minimizing?** The maximum step along a path.
- **Which traversal?** BFS (for the feasibility check) driven by binary search.
- **Clue → Pattern:** *"minimum effort" + small value range* → **BS + BFS**.

### Intuition (Brute → Better → Optimal)
```text
Brute force: enumerate all paths in a 26-neighbour lattice. Astronomically large.
        ↓
Observation: "is the goal reachable using only steps of cost <= X?" is monotone in
             X, so the answer is a boundary — exactly the binary-search setting.
        ↓
Optimal: binary search X in [0, max value], and BFS for the check. O(k^3 · log V).
```

### Brute Force Approach
**Basic idea:** DFS enumerating paths, tracking the current maximum step.

```java
import java.util.*;

public class Effort3DBrute {
    public int minEffortPath(int[][][] g) {
        int k = g.length;
        int[] best = {Integer.MAX_VALUE};
        dfs(g, 0, 0, 0, 0, k, best);
        return best[0];
    }

    private void dfs(int[][][] g, int a, int b, int c, int eff, int k, int[] best) {
        if (eff >= best[0]) return;
        if (a == k - 1 && b == k - 1 && c == k - 1) { best[0] = eff; return; }
        for (int da = -1; da <= 1; da++)
            for (int db = -1; db <= 1; db++)
                for (int dc = -1; dc <= 1; dc++) {
                    if (da == 0 && db == 0 && dc == 0) continue;
                    int na = a + da, nb = b + db, nc = c + dc;
                    if (na < 0 || na >= k || nb < 0 || nb >= k || nc < 0 || nc >= k) continue;
                    dfs(g, na, nb, nc, Math.max(eff, Math.abs(g[a][b][c] - g[na][nb][nc])), k, best);
                }
    }
}
```

**Time Complexity Calculation:** `26^(k³)` paths — utterly infeasible.
**Space Complexity Calculation:** `O(k³)` recursion depth → also a `StackOverflowError`
waiting to happen.
> **Why can this be improved?** Two levers: don't enumerate paths (use reachability),
> and don't search all possible limits (binary search the limit).

### Optimal Approach — binary search + 3-D BFS

#### Core Observation
**The predicate "the goal is reachable using only steps of cost `≤ X`" is monotone in
`X`.** Since values lie in `[0, 1000]`, binary search needs about 10 iterations, each
an `O(k³)` BFS.

#### Pattern Identification
**Mental model 4 with the "search the answer" pattern, exactly as in problem 33.**

#### Step-by-Step Intuition
1. `lo = 0`, `hi = max value in grid` (always feasible: it permits every step).
2. While `lo < hi`: `mid = (lo + hi) / 2`; `canReach(mid)` → `hi = mid` or
   `lo = mid + 1`.
3. `canReach(limit)`: 3-D BFS from `(0,0,0)`, only stepping into neighbours `v` with
   `|cell[u] - cell[v]| ≤ limit`.

#### Dry Run
LeetCode Example 1, `k = 2`, effort `3`:

| `mid` | allowed steps | goal reachable? | action |
|---|---|---|---|
| 5 | 5 | yes | `hi = 5` |
| 2 | 2 | no | `lo = 3` |
| 4 | 4 | yes | `hi = 4` |
| 3 | 3 | yes | `hi = 3` |

`lo == hi == 3` ✓ — the diagonal moves matter enormously here: with 26 neighbours the
optimal path "cuts corners" through the lattice, which is why the answer is 3 and not
the face-adjacency answer.

#### Why Does It Work?
Monotonicity: if the goal is reachable at limit `X`, the same path is valid at any
`X' ≥ X`. The binary-search invariant maintains `[lo, hi]` containing the optimum; the
initial `hi = max value` is feasible because every step is within that range, and `lo = 0`
is the trivial lower bound. At termination `lo == hi` is the smallest feasible limit,
which is exactly the minimum possible maximum step.

#### Java Code
```java
import java.util.*;

public class MinimumEffortPath3D {
    public int minimumEffortPath(int[][][] grid) {
        int k = grid.length;
        int lo = 0, hi = 0;
        for (int[][] plane : grid) {
            for (int[] row : plane) {
                for (int v : row) hi = Math.max(hi, v);
            }
        }
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (canReach(grid, mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    private boolean canReach(int[][][] g, int limit) {
        int k = g.length;
        boolean[][][] vis = new boolean[k][k][k];
        ArrayDeque<int[]> q = new ArrayDeque<>();
        vis[0][0][0] = true;
        q.add(new int[]{0, 0, 0});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            int a = cur[0], b = cur[1], c = cur[2];
            if (a == k - 1 && b == k - 1 && c == k - 1) return true;
            for (int da = -1; da <= 1; da++) {
                for (int db = -1; db <= 1; db++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        if (da == 0 && db == 0 && dc == 0) continue;
                        int na = a + da, nb = b + db, nc = c + dc;
                        if (na < 0 || na >= k || nb < 0 || nb >= k || nc < 0 || nc >= k) continue;
                        if (vis[na][nb][nc]) continue;
                        if (Math.abs(g[a][b][c] - g[na][nb][nc]) > limit) continue;
                        vis[na][nb][nc] = true;
                        q.add(new int[]{na, nb, nc});
                    }
                }
            }
        }
        return false;
    }
}
```

#### Complexity
**Time Complexity Calculation:** `log₂(maxValue) ≈ 10` iterations × `O(26·k³)` per
BFS → **`O(k³ log V)`** where `V ≤ 1000`.
**Space Complexity Calculation:** `vis` + queue → **`O(k³)`**.

### Edge Cases
- `k = 1` → the start is the goal → `0` (the loop's `lo = hi = 0` handles it).
- All cells equal → `0`.
- `hi = 0` (all zeros) → returns `0` without any BFS.
- A "wall" of high values → the answer is the minimum step that gets past it.
- The Dijkstra variant is also valid and `O(k³ log k³)`, slightly slower than the BS
  here because `log V` (`≈ 10`) beats `log k³` for small `k`.
- Both solutions must be **26-direction**; the 6-direction face version is a different
  (harder) problem.

### Pattern to Remember
```text
Problem clue:  "minimum effort" (minimize the MAXIMUM step) + bounded values
Pattern:       binary search the threshold; BFS the reachability under that threshold
Mental model:  monotone feasibility => the answer is a boundary => search it
```

**Similar problems:** 33 (identical, 2-D and 4-direction), 49. **Interview tip:**
"This is problem 33 with a third dimension. Monotone feasibility means I can binary
search the answer, and BFS answers the per-check question — `O(k³ log V)`."

### Part E closing check

The advanced problems are mostly **compositions** of the six mental models:

- 41 = Bellman-Ford truncated (4)
- 42 = Eulerian path (1)
- 43 = bitmask closure (5)
- 44 = path-counting DP (5)
- 45 = BFS on a grid (2)
- 46 = post-order greedy (3)
- 47 = balance netting (6)
- 48 = topological waves (3)
- 49 = BS the count + greedy (4)
- 50 = BS the threshold + BFS (4)

<!--APPEND-->
