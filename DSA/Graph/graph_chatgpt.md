# Graphs — 53 Problems Study Guide (Java)

<!-- The seven-part problem structure and quality requirements follow the supplied specification. -->
<!-- The thinking-first style mirrors the supplied Binary Search study guide. -->

A complete walkthrough of the 53 graph problems in Striver's A2Z DSA Sheet. This is not a collection of code snippets. It is a guide for learning how to recognize the structure of a graph problem, select the right representation, choose the right traversal or algorithm, and derive the solution.

Every problem follows the same thought process:

1. Understand what the problem is really asking.
2. Identify the structure being exploited.
3. Start with the obvious solution and understand why it is too slow or incomplete.
4. Find the single observation that removes the waste.
5. Apply the correct graph pattern.
6. State the invariant that makes the algorithm correct.
7. Dry-run the important state changes before writing code.

The graph problems look very different on the surface. Islands, courses, flights, networks, words, cities, stones and grids are all disguises. Underneath, the same small set of ideas keeps appearing: traversal, connected components, shortest paths, topological ordering, DSU, MST, and `tin[]/low[]`.

---

# PART A — Learning & Traversal

## 0. The Foundation: Graphs in One Page

Before solving the 53 problems, build a mental model of what a graph actually is.

### What a graph is

A graph is:

- **Vertices / nodes:** the things we care about.
- **Edges:** relationships between those things.

For example:

```text
0 ---- 1
|      |
|      |
2 ---- 3
```

Here:

- Vertices = `{0, 1, 2, 3}`
- Edges = `{0-1, 0-2, 1-3, 2-3}`

### Important vocabulary

| Term | Meaning |
|---|---|
| Undirected graph | `u -> v` means `v -> u` too |
| Directed graph | `u -> v` does not imply `v -> u` |
| Weighted graph | Edges have costs/weights |
| Unweighted graph | Every edge can be treated as cost `1` |
| Degree | Number of edges touching a node |
| In-degree | Number of incoming directed edges |
| Out-degree | Number of outgoing directed edges |
| Cycle | A path that eventually returns to a previously visited node |
| Connected graph | Every node can reach every other node in an undirected graph |
| Connected component | One maximal connected group |
| DAG | Directed Acyclic Graph |
| Bipartite | Vertices can be divided into two groups such that no same-group edge exists |
| Self-loop | Edge from a node to itself |
| Multi-edge | More than one edge between the same two vertices |

A useful distinction:

```text
Undirected:
0 ---- 1
```

means:

```text
0 -> 1
1 -> 0
```

while:

```text
Directed:
0 ----> 1
```

only guarantees:

```text
0 -> 1
```

---

### Graph representations

There are three common representations.

#### 1. Adjacency matrix

```text
    0 1 2 3
0 [ 0 1 1 0 ]
1 [ 1 0 0 1 ]
2 [ 1 0 0 1 ]
3 [ 0 1 1 0 ]
```

`matrix[u][v] = 1` means the edge exists.

| Operation | Complexity |
|---|---:|
| Check whether edge exists | `O(1)` |
| Add edge | `O(1)` |
| Iterate neighbors | `O(V)` |
| Memory | `O(V²)` |

Use it when the graph is dense or constant-time edge lookup matters.

#### 2. Adjacency list

```text
0 -> [1, 2]
1 -> [0, 3]
2 -> [0, 3]
3 -> [1, 2]
```

For a sparse graph this is normally the default representation.

| Operation | Complexity |
|---|---:|
| Add edge | `O(1)` amortized |
| Iterate neighbors of `u` | `O(degree(u))` |
| Iterate all edges | `O(V + E)` |
| Memory | `O(V + E)` |

Java:

```java
List<List<Integer>> graph = new ArrayList<>();

for (int i = 0; i < n; i++) {
    graph.add(new ArrayList<>());
}

for (int[] edge : edges) {
    int u = edge[0];
    int v = edge[1];

    graph.get(u).add(v);
    graph.get(v).add(u); // omit for directed graph
}
```

A more memory-efficient Java representation is:

```java
List<Integer>[] graph = new ArrayList[n];

for (int i = 0; i < n; i++) {
    graph[i] = new ArrayList<>();
}
```

Both are useful. `List<List<Integer>>` is often easier to explain. `List<Integer>[]` avoids one outer generic object wrapper per list in some settings.

#### 3. Edge list

```text
[(0,1), (0,2), (1,3), (2,3)]
```

This is simply a list of edges.

It is especially useful when an algorithm naturally processes edges:

- Kruskal
- Bellman-Ford
- sorting edges
- detecting edge properties

---

### How to build an adjacency list

Given:

```text
n = 5
edges =
0 1
0 2
1 3
3 4
```

Build:

```text
0 -> 1, 2
1 -> 0, 3
2 -> 0
3 -> 1, 4
4 -> 3
```

Java:

```java
class GraphBuilder {
    static List<List<Integer>> buildUndirected(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];

            graph.get(u).add(v);
            graph.get(v).add(u);
        }

        return graph;
    }
}
```

For a directed graph:

```java
graph.get(u).add(v);
```

only.

---

### Grids are graphs

A grid is just a graph where each cell is a vertex.

For:

```text
1 1 0
0 1 0
1 0 1
```

the cell `(0,0)` is connected to `(0,1)`.

For ordinary four-direction movement:

```java
int[][] dirs = {
    {-1, 0},
    {1, 0},
    {0, -1},
    {0, 1}
};
```

For eight directions:

```java
int[][] dirs = {
    {-1, -1}, {-1, 0}, {-1, 1},
    {0, -1},           {0, 1},
    {1, -1},  {1, 0},  {1, 1}
};
```

Always do the bounds check first:

```java
int nr = r + dr;
int nc = c + dc;

if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
    continue;
}
```

---

### Mapping `(row, col)` to one integer

For a grid with `cols` columns:

```text
id = row * cols + col
```

And back:

```text
row = id / cols
col = id % cols
```

Example:

```text
cols = 4

(0,0) -> 0
(0,1) -> 1
(1,0) -> 4
(2,3) -> 11
```

This matters because DSU usually works with one-dimensional IDs.

---

### BFS

Breadth-first search explores a graph in layers.

```text
distance 0:       S

distance 1:      A B

distance 2:     C D E

distance 3:       F
```

Canonical Java:

```java
Queue<Integer> queue = new ArrayDeque<>();
boolean[] visited = new boolean[n];

queue.offer(source);
visited[source] = true;

while (!queue.isEmpty()) {
    int node = queue.poll();

    for (int next : graph.get(node)) {
        if (visited[next]) {
            continue;
        }

        visited[next] = true;
        queue.offer(next);
    }
}
```

### Why BFS gives shortest paths in an unweighted graph

Every edge costs exactly one step.

Therefore:

```text
source
  ↓ 1 edge
layer 1
  ↓ 1 edge
layer 2
  ↓ 1 edge
layer 3
```

The first time BFS reaches a node, it has used the minimum possible number of edges.

Distance version:

```java
int[] dist = new int[n];
Arrays.fill(dist, -1);

Queue<Integer> queue = new ArrayDeque<>();

dist[source] = 0;
queue.offer(source);

while (!queue.isEmpty()) {
    int u = queue.poll();

    for (int v : graph.get(u)) {
        if (dist[v] != -1) {
            continue;
        }

        dist[v] = dist[u] + 1;
        queue.offer(v);
    }
}
```

---

### Multi-source BFS

Sometimes there are many starting points.

Do not run BFS separately from every source.

Instead:

```text
source A ─┐
source B ─┼──> queue initially contains ALL sources
source C ─┘
```

```java
for (int source : sources) {
    queue.offer(source);
    dist[source] = 0;
}
```

Then run one BFS.

All sources expand simultaneously.

This is the core idea behind:

- Rotten Oranges
- 01 Matrix
- several grid spreading problems

---

### DFS

Depth-first search follows one path as far as possible before backtracking.

Recursive:

```java
void dfs(int node, List<List<Integer>> graph, boolean[] visited) {
    visited[node] = true;

    for (int next : graph.get(node)) {
        if (!visited[next]) {
            dfs(next, graph, visited);
        }
    }
}
```

Iterative:

```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(source);
visited[source] = true;

while (!stack.isEmpty()) {
    int node = stack.pop();

    for (int next : graph.get(node)) {
        if (!visited[next]) {
            visited[next] = true;
            stack.push(next);
        }
    }
}
```

DFS is especially natural for:

- connected components
- flood fill
- cycle detection
- topological sort
- backtracking through graph states

---

### Connected components

One DFS/BFS explores one connected component.

Therefore:

```java
for (int i = 0; i < n; i++) {
    if (!visited[i]) {
        dfs(i);
        components++;
    }
}
```

That outer loop is the important part.

Many graph problems secretly ask:

> "How many times must I start a traversal before every node is covered?"

The answer is the number of connected components.

---

### Cycle detection: undirected graph

In an undirected graph, when traversing:

```text
0 ---- 1
```

the edge `1 -> 0` is not a new cycle. It is simply the edge we just came from.

Therefore we store the parent:

```java
boolean hasCycle(int node, int parent, List<List<Integer>> graph,
                boolean[] visited) {
    visited[node] = true;

    for (int next : graph.get(node)) {
        if (!visited[next]) {
            if (hasCycle(next, node, graph, visited)) {
                return true;
            }
        } else if (next != parent) {
            return true;
        }
    }

    return false;
}
```

The key rule is:

```text
visited neighbor + neighbor != parent -> cycle
```

---

### Cycle detection: directed graph

The undirected parent trick fails for directed graphs.

A directed graph needs to distinguish:

```text
visited sometime in the past
```

from:

```text
currently on the recursion path
```

Use:

```java
boolean[] visited;
boolean[] pathVisited;
```

A back-edge into the current recursion path means a cycle.

---

### Topological sort

A topological ordering is an ordering of vertices such that:

```text
u -> v
```

means:

```text
u comes before v
```

It exists only for a DAG.

The central invariant is:

> A node is placed into the completed ordering only after all of its dependencies have been processed.

DFS version:

```text
visit dependencies
        ↓
push current node
        ↓
reverse stack/order
```

Kahn's version:

```text
indegree 0
   ↓
process it
   ↓
remove its outgoing edges
   ↓
new indegree 0 nodes
```

Kahn's algorithm is BFS over a dependency graph.

---

### Relaxation

The fundamental shortest-path operation is:

```java
if (dist[v] > dist[u] + weight) {
    dist[v] = dist[u] + weight;
}
```

Meaning:

> "I already know a path to `v`. Did going through `u` produce a cheaper one?"

This same idea appears in:

- DAG shortest path
- Dijkstra
- Bellman-Ford
- Floyd-Warshall

The difference is **when and in what order** we perform the relaxation.

---

### DSU — Disjoint Set Union

DSU maintains groups of connected elements.

Initially:

```text
0    1    2    3    4
```

Then:

```text
union(0, 1)

{0,1}    2    3    4
```

Then:

```text
union(1, 2)

{0,1,2}    3    4
```

Main operations:

```text
find(x)  -> which component/root does x belong to?
union(a,b) -> merge their components
```

Use:

- path compression
- union by rank
- or union by size

With both optimizations, operations are effectively constant time in practice and have amortized complexity `O(alpha(V))`.

---

### DSU: recursive `find`

```java
int find(int node) {
    if (parent[node] == node) {
        return node;
    }

    return parent[node] = find(parent[node]);
}
```

The assignment:

```java
parent[node] = find(parent[node]);
```

is path compression.

---

### DSU: iterative `find`

```java
int find(int node) {
    int root = node;

    while (root != parent[root]) {
        root = parent[root];
    }

    while (node != root) {
        int next = parent[node];
        parent[node] = root;
        node = next;
    }

    return root;
}
```

---

### Union by rank

Rank is an estimate of tree height.

```java
void union(int a, int b) {
    a = find(a);
    b = find(b);

    if (a == b) {
        return;
    }

    if (rank[a] < rank[b]) {
        parent[a] = b;
    } else if (rank[a] > rank[b]) {
        parent[b] = a;
    } else {
        parent[b] = a;
        rank[a]++;
    }
}
```

Always attach the shallower tree under the deeper tree.

---

### Union by size

```java
void union(int a, int b) {
    a = find(a);
    b = find(b);

    if (a == b) {
        return;
    }

    if (size[a] < size[b]) {
        int temp = a;
        a = b;
        b = temp;
    }

    parent[b] = a;
    size[a] += size[b];
}
```

Rank and size both solve the same structural problem: preventing tall trees.

---

### Prim vs Kruskal

| | Prim | Kruskal |
|---|---|---|
| Main structure | Priority queue | Sorted edge list |
| Grows | One tree | Several components merged |
| Core idea | Cheapest edge leaving visited set | Cheapest edge joining two components |
| DSU required | No | Yes |
| Typical complexity | `O(E log V)` | `O(E log E)` |

---

### Tarjan: `tin[]` and `low[]`

For DFS:

```text
tin[u] = time when u was first discovered
```

and:

```text
low[u] = earliest discovery time reachable from u
         using DFS-tree edges plus at most one back edge
```

For an edge:

```text
u -> v
```

if:

```text
low[v] > tin[u]
```

then there is no alternate route from `v`'s subtree back to `u` or above.

Therefore `u-v` is a **bridge**.

For articulation points:

```text
low[v] >= tin[u]
```

means removing `u` disconnects `v`'s subtree.

The difference between:

```text
>
```

and:

```text
>=
```

is critical.

---

### Kosaraju's SCC idea

For strongly connected components:

1. DFS on the original graph and record finish order.
2. Reverse every edge.
3. DFS the transpose graph in decreasing finish order.

The first DFS tells us which SCCs finish last.

The transpose reverses the direction of reachability.

Together, those two facts isolate SCCs cleanly.

---

### The 6 core mental models

| Signature clue | Mental model | Template |
|---|---|---|
| "Count groups/regions" | Explore each component | DFS/BFS |
| "Something spreads from many places" | All sources move together | Multi-source BFS |
| "Prerequisites/dependencies" | Dependency ordering | Topological sort |
| "Minimum path cost" | Repeated relaxation | BFS/Dijkstra/Bellman-Ford/Floyd |
| "Merge or connect groups" | Maintain components | DSU/MST |
| "What happens if this edge/vertex disappears?" | DFS low-link structure | Tarjan |

The first question in almost every graph problem should be:

```text
What structure is the problem secretly giving me?

tree / grid / DAG / unweighted graph / weighted graph
        ↓
What operation is being asked?

count / reach / order / minimize / connect / disconnect
        ↓
Which graph primitive naturally matches it?
```

---

# PART B — Problems on BFS/DFS

## 1. Introduction to Graph & Graph Representation (Java)

### Problem Understanding

The task is to understand how a graph is represented and how to build that representation from the input.

Typical input:

```text
n = 5
m = 4

0 1
0 2
1 3
3 4
```

Output as an adjacency list:

```text
0 -> 1 2
1 -> 0 3
2 -> 0
3 -> 1 4
4 -> 3
```

The main observation is not the code. It is deciding whether the problem is sparse or dense and whether the algorithm needs vertices or edges.

### How to Think About the Problem

- What should I notice first? `n` and `m` describe vertices and edges.
- Are there many possible edges compared with actual edges? Usually no.
- Does the later algorithm need fast neighbor traversal? Usually yes.
- Clue → Pattern: **Sparse graph + traversal → adjacency list**.

### Intuition (Naïve → Better)

```text
Store every possible pair of vertices: O(V²)
        ↓
Most graph problems only contain E actual edges
        ↓
Store only existing neighbors: O(V + E)
```

### Naïve Approach

Use an adjacency matrix.

Why it works:

```text
matrix[u][v] tells us immediately whether u-v exists.
```

But for sparse graphs, most of the `V²` cells are unused.

### Optimal Approach

Use an adjacency list.

```java
class Solution {
    static List<List<Integer>> buildGraph(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];

            graph.get(u).add(v);
            graph.get(v).add(u);
        }

        return graph;
    }

    static void printGraph(List<List<Integer>> graph) {
        for (int u = 0; u < graph.size(); u++) {
            System.out.println(u + " -> " + graph.get(u));
        }
    }
}
```

### Dry Run

```text
edges:
0-1
0-2
1-3
3-4
```

After inserting `0-1`:

```text
0 -> [1]
1 -> [0]
```

After inserting `0-2`:

```text
0 -> [1,2]
1 -> [0]
2 -> [0]
```

Continue similarly.

### Why Does It Work?

Every undirected edge is stored twice, once from each endpoint. Therefore traversing the list of `u` visits exactly the vertices adjacent to `u`.

### Complexity

**Time Complexity Calculation:** initialize `V` lists → `O(V)`. Insert two entries for every edge → `O(E)`. Total **`O(V + E)`**.

**Space Complexity Calculation:** `V` lists plus two stored adjacency entries per undirected edge → **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "n vertices + m edges"
Pattern:       Adjacency list
Mental model:  Store only relationships that actually exist
```

**Similar problems:** 2, 3, 11, 12, 20.

**Interview tip:** Always state whether your graph is directed. That single detail changes how you build the adjacency list.

---

## 2. Graph Representation | C++ (Equivalent Java)

### Problem Understanding

This problem is essentially the same graph-representation idea, but viewed from a Java perspective.

The important Java choices are:

```java
List<List<Integer>>
```

versus:

```java
List<Integer>[]
```

and knowing when an edge list is actually better.

### How to Think About the Problem

- `List<List<Integer>>` is easy and readable.
- `List<Integer>[]` is convenient when the number of vertices is fixed.
- An edge list is ideal when the algorithm sorts or repeatedly scans edges.

Clue → Pattern:

```text
Traversal -> adjacency list
Edge-centric algorithm -> edge list
Constant-time edge lookup -> adjacency matrix
```

### Intuition

```text
Need neighbors?
        ↓
Adjacency list

Need to sort/process all edges?
        ↓
Edge list

Need direct u-v lookup?
        ↓
Matrix
```

### Better Approach

Compare the Java representations.

```java
class Solution {
    static List<List<Integer>> buildWithLists(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            graph.get(edge[1]).add(edge[0]);
        }

        return graph;
    }

    @SuppressWarnings("unchecked")
    static List<Integer>[] buildWithArray(int n, int[][] edges) {
        List<Integer>[] graph = new ArrayList[n];

        for (int i = 0; i < n; i++) {
            graph[i] = new ArrayList<>();
        }

        for (int[] edge : edges) {
            graph[edge[0]].add(edge[1]);
            graph[edge[1]].add(edge[0]);
        }

        return graph;
    }

    static List<int[]> edgeList(int[][] edges) {
        return Arrays.stream(edges)
                .map(edge -> new int[]{edge[0], edge[1]})
                .toList();
    }
}
```

### Complexity

All adjacency-list versions use **`O(V + E)`** memory.

The matrix uses **`O(V²)`**.

An edge list stores **`O(E)`** edges.

### Pattern to Remember

```text
Problem clue:  "How should Java store this graph?"
Pattern:       Choose representation based on the next operation
Mental model:  Neighbor-centric -> list, edge-centric -> edge list
```

**Similar problems:** 1, 28, 30, 42.

**Interview tip:** Do not say "adjacency list is always best." Explain *why* it is appropriate for the operation.

---

## 3. Connected Components

### Problem Understanding

Given a graph that may be disconnected, count the number of separate connected groups.

Example:

```text
0 --- 1      2 --- 3      4
```

Output:

```text
3
```

### How to Think About the Problem

- One DFS/BFS can discover one complete component.
- What if some nodes remain unvisited? Start again.
- Therefore the outer loop is part of the algorithm.

Clue → Pattern:

```text
"How many disconnected groups?"
        ↓
Run DFS/BFS from every unvisited node
        ↓
Number of starts = number of components
```

### Intuition

```text
Run DFS from node 0
        ↓
component 1 covered

Scan again
        ↓
node 2 is unvisited
        ↓
component 2 covered

Continue
```

### Naïve Approach

Start DFS from an arbitrary node only.

Why it fails:

```text
0 --- 1      2 --- 3
```

Starting from `0` never reaches `2` or `3`.

### Optimal Approach

```java
class Solution {
    static int countComponents(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            graph.get(edge[1]).add(edge[0]);
        }

        boolean[] visited = new boolean[n];
        int components = 0;

        for (int i = 0; i < n; i++) {
            if (visited[i]) {
                continue;
            }

            components++;
            dfs(i, graph, visited);
        }

        return components;
    }

    static void dfs(int node, List<List<Integer>> graph, boolean[] visited) {
        visited[node] = true;

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                dfs(next, graph, visited);
            }
        }
    }
}
```

### Dry Run

```text
0-1   2-3   4
```

| Start | Newly visited component |
|---|---|
| `0` | `0,1` |
| `2` | `2,3` |
| `4` | `4` |

Answer = `3`.

### Why Does It Work?

A DFS starting at an unvisited node reaches every node in that connected component. No other component can be reached from it. Therefore each outer-loop start discovers exactly one new component.

### Complexity

Building the graph: `O(V + E)`.

All DFS traversals together touch each vertex and edge at most once: **`O(V + E)`**.

Visited array + graph: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "How many disconnected groups?"
Pattern:       Connected components
Mental model:  Outer loop + one traversal per unseen component
```

**Similar problems:** 7, 8, 18, 43, 45.

**Interview tip:** Say explicitly: "The graph may be disconnected, so DFS from one node is not enough."

---

## 4. Traversal Techniques — BFS

### Problem Understanding

Traverse every reachable vertex level by level.

Example:

```text
0
├── 1
│   └── 3
└── 2
```

Starting from `0`, one possible BFS order is:

```text
0 1 2 3
```

### How to Think About the Problem

- Do I want depth first or level first?
- Level first means queue.
- A queue guarantees that nodes discovered earlier are processed earlier.

Clue → Pattern:

```text
"Visit by distance / layers / levels"
        ↓
BFS
```

### Intuition

```text
DFS:
go deep first

BFS:
visit all distance-1 nodes
        ↓
all distance-2 nodes
        ↓
all distance-3 nodes
```

### Optimal Approach

```java
class Solution {
    static List<Integer> bfs(int n, List<List<Integer>> graph, int source) {
        List<Integer> order = new ArrayList<>();
        boolean[] visited = new boolean[n];
        Queue<Integer> queue = new ArrayDeque<>();

        queue.offer(source);
        visited[source] = true;

        while (!queue.isEmpty()) {
            int node = queue.poll();
            order.add(node);

            for (int next : graph.get(node)) {
                if (!visited[next]) {
                    visited[next] = true;
                    queue.offer(next);
                }
            }
        }

        return order;
    }
}
```

### Dry Run

For:

```text
0 -> 1,2
1 -> 3
2 -> 4
```

Queue:

```text
[0]
[1,2]
[2,3]
[3,4]
[4]
[]
```

Order:

```text
0 1 2 3 4
```

### Why Does It Work?

The queue processes nodes in nondecreasing distance from the source. When a node enters the queue, it is reached through the shortest number of edges available so far.

### Complexity

Each vertex is inserted once and each adjacency entry is examined once.

Time: **`O(V + E)`**.

Space: visited array plus queue → **`O(V)`** auxiliary.

### Pattern to Remember

```text
Problem clue:  "levels", "minimum number of edges", "spread"
Pattern:       BFS
Mental model:  Queue = process by distance
```

**Similar problems:** 9, 13, 16, 28, 32, 37.

---

## 5. DFS

### Problem Understanding

Visit every reachable node by following one path deeply and then backtracking.

### How to Think About the Problem

- Does the problem care about levels? No.
- Does it care about exploring a complete region/path? Yes.
- Recursion naturally gives the backtracking behavior.

Clue → Pattern:

```text
"Explore entire component / region recursively"
        ↓
DFS
```

### Intuition

```text
Start at 0
 ↓
visit 1
 ↓
visit 3
 ↓
no new neighbor
 ↓
backtrack
```

### Optimal Approach — Recursive DFS

```java
class Solution {
    static List<Integer> dfs(int n, List<List<Integer>> graph, int source) {
        boolean[] visited = new boolean[n];
        List<Integer> order = new ArrayList<>();

        dfs(source, graph, visited, order);

        return order;
    }

    static void dfs(
            int node,
            List<List<Integer>> graph,
            boolean[] visited,
            List<Integer> order) {

        visited[node] = true;
        order.add(node);

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                dfs(next, graph, visited, order);
            }
        }
    }

    static List<Integer> iterativeDfs(
            List<List<Integer>> graph,
            int source) {

        boolean[] visited = new boolean[graph.size()];
        List<Integer> order = new ArrayList<>();

        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(source);

        while (!stack.isEmpty()) {
            int node = stack.pop();

            if (visited[node]) {
                continue;
            }

            visited[node] = true;
            order.add(node);

            for (int i = graph.get(node).size() - 1; i >= 0; i--) {
                int next = graph.get(node).get(i);

                if (!visited[next]) {
                    stack.push(next);
                }
            }
        }

        return order;
    }
}
```

### Dry Run

For:

```text
0 -> 1 -> 3
 \-> 2
```

Recursive execution:

```text
dfs(0)
  dfs(1)
    dfs(3)
  dfs(2)
```

### Why Does It Work?

DFS follows every unvisited outgoing edge. Because it marks nodes before recursive exploration, each node is processed once and the recursion eventually backtracks after its reachable subtree is complete.

### Complexity

Every vertex and edge is processed at most once.

Time: **`O(V + E)`**.

Recursive stack or explicit stack can contain up to `V` vertices.

Space: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Explore deeply / region / component"
Pattern:       DFS
Mental model:  Recursion or stack = depth-first exploration
```

**Similar problems:** 6, 8, 10, 12, 18, 20.

---

## 6. DFS on a Grid / Connected Components Problem in Matrix

### Problem Understanding

Count connected regions in a grid.

Example:

```text
1 1 0
0 1 0
1 0 1
```

Using four-direction adjacency:

```text
component 1: (0,0), (0,1), (1,1)
component 2: (2,0)
component 3: (2,2)
```

Answer = `3`.

### How to Think About the Problem

- A grid cell is a graph node.
- Its four neighbors are graph edges.
- The only new part is generating neighbors with `dirs`.

Clue → Pattern:

```text
Matrix + connected regions
        ↓
Grid DFS/BFS
```

### Intuition

```text
Scan every cell
  ↓
if it belongs to an unseen region
  ↓
flood-fill that entire region
  ↓
increment count
```

### Optimal Approach

```java
class Solution {
    static int countComponents(char[][] grid) {
        if (grid.length == 0) {
            return 0;
        }

        int rows = grid.length;
        int cols = grid[0].length;

        boolean[][] visited = new boolean[rows][cols];

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        int components = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1' || visited[r][c]) {
                    continue;
                }

                components++;
                dfs(r, c, grid, visited, dirs);
            }
        }

        return components;
    }

    static void dfs(
            int r,
            int c,
            char[][] grid,
            boolean[][] visited,
            int[][] dirs) {

        visited[r][c] = true;

        for (int[] dir : dirs) {
            int nr = r + dir[0];
            int nc = c + dir[1];

            if (nr < 0 || nr >= grid.length ||
                nc < 0 || nc >= grid[0].length) {
                continue;
            }

            if (grid[nr][nc] == '1' && !visited[nr][nc]) {
                dfs(nr, nc, grid, visited, dirs);
            }
        }
    }
}
```

### Dry Run

When `(0,0)` is found:

```text
1 1 0
0 1 0
1 0 1
^
DFS spreads through all adjacent 1s
```

That whole region is marked before scanning continues.

### Why Does It Work?

A DFS beginning at any unvisited `1` reaches every `1` connected to it and no disconnected `1`. Therefore incrementing the answer once per new DFS counts exactly the number of components.

### Complexity

There are `R * C` cells. Every cell is processed once.

Time: **`O(R * C)`**.

Visited matrix + recursion: **`O(R * C)`**.

### Pattern to Remember

```text
Problem clue:  "Connected cells / regions"
Pattern:       Grid flood fill
Mental model:  Cell = vertex, direction = edge
```

**Similar problems:** 8, 10, 14, 15, 18.

---

# PART B — Problems on BFS/DFS

## 7. Number of Provinces

### Problem Understanding

LeetCode 547 gives an `n x n` connectivity matrix.

```text
isConnected[i][j] = 1
```

means cities `i` and `j` are directly connected.

Indirect connections count too.

Example:

```text
0 -- 1 -- 2

3
```

Answer:

```text
2
```

### How to Think About the Problem

- The matrix is not a graph traversal yet.
- `isConnected[i][j]` acts like the adjacency list.
- We need connected components.

Clue → Pattern:

```text
Connectivity matrix + groups
        ↓
Connected components using DFS
```

### Intuition

```text
Scan city 0
  ↓
DFS all connected cities
  ↓
one province

Continue scan
  ↓
next unseen city starts another province
```

### Naïve Approach

Run a fresh traversal for each city and repeatedly discover the same cities.

That leads to redundant work.

### Optimal Approach

```java
class Solution {
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length;
        boolean[] visited = new boolean[n];
        int provinces = 0;

        for (int i = 0; i < n; i++) {
            if (visited[i]) {
                continue;
            }

            provinces++;
            dfs(i, isConnected, visited);
        }

        return provinces;
    }

    private void dfs(
            int city,
            int[][] isConnected,
            boolean[] visited) {

        visited[city] = true;

        for (int next = 0; next < isConnected.length; next++) {
            if (isConnected[city][next] == 1 && !visited[next]) {
                dfs(next, isConnected, visited);
            }
        }
    }
}
```

### Dry Run

For:

```text
0 connected to 1
1 connected to 2
3 isolated
```

DFS from `0` reaches:

```text
0 -> 1 -> 2
```

Then `3` starts another component.

### Why Does It Work?

Every DFS discovers exactly one province. The outer loop starts DFS only for cities not already included in another province.

### Complexity

For every discovered city, the matrix row of length `n` is scanned.

Time: **`O(V²)`**.

Visited array and recursion: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Provinces / groups" + adjacency matrix
Pattern:       Connected components
Mental model:  Matrix row = neighbor lookup
```

**Similar problems:** 3, 8, 18.

---

## 8. Connected Components in a Matrix

### Problem Understanding

This is the generic matrix version of region counting.

Example:

```text
1 0 1
1 1 0
0 0 1
```

Using four directions:

```text
component A = top-left three cells
component B = top-right cell
component C = bottom-right cell
```

Answer = `3`.

### How to Think About the Problem

- What are the vertices? Cells containing the target value.
- What are the edges? Four-direction adjacency.
- What are we counting? Components.

Clue → Pattern:

```text
"Count regions"
        ↓
Flood fill
```

### Intuition

```text
Brute: search outward repeatedly for each cell
        ↓
Observation: once a component is explored, every cell in it is done
        ↓
Optimal: DFS/BFS once per unseen component
```

### Optimal Approach

```java
class Solution {
    static int countRegions(int[][] grid) {
        int rows = grid.length;

        if (rows == 0) {
            return 0;
        }

        int cols = grid[0].length;
        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        int regions = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != 1) {
                    continue;
                }

                regions++;
                dfs(r, c, grid, dirs);
            }
        }

        return regions;
    }

    static void dfs(
            int r,
            int c,
            int[][] grid,
            int[][] dirs) {

        grid[r][c] = 0;

        for (int[] dir : dirs) {
            int nr = r + dir[0];
            int nc = c + dir[1];

            if (nr < 0 || nr >= grid.length ||
                nc < 0 || nc >= grid[0].length) {
                continue;
            }

            if (grid[nr][nc] == 1) {
                dfs(nr, nc, grid, dirs);
            }
        }
    }
}
```

### Dry Run

The first `1` triggers DFS and turns its entire component into `0`.

This is the **sinking trick**.

### Why Does It Work?

Once a component is flood-filled, no later scan can count it again. Each original component therefore increments the answer exactly once.

### Complexity

Each cell is visited at most once.

Time: **`O(R * C)`**.

Recursion depth and modified grid: **`O(R * C)`** worst case.

### Pattern to Remember

```text
Problem clue:  "Count matrix regions"
Pattern:       Flood fill
Mental model:  Start DFS only when you see a fresh component
```

**Similar problems:** 6, 10, 15, 18.

---

## 9. Rotten Oranges

### Problem Understanding

LeetCode 994:

```text
0 = empty
1 = fresh
2 = rotten
```

Every minute, a rotten orange rots adjacent fresh oranges.

Return the minimum minutes required to rot all fresh oranges, or `-1`.

Example:

```text
2 1 1
1 1 0
0 1 1
```

Output:

```text
4
```

### How to Think About the Problem

- There are multiple starting rotten oranges.
- They all spread simultaneously.
- We need time, not just reachability.

Clue → Pattern:

```text
Multiple sources spreading at the same speed
        ↓
Multi-source BFS
        ↓
BFS levels = minutes
```

### Intuition

```text
Start:
2 1 1
1 1 0
0 1 1

minute 1:
2 2 1
2 1 0
0 1 1

minute 2:
2 2 2
2 2 0
0 1 1

...
```

### Naïve Approach

Run BFS separately from each rotten orange.

Why it fails:

The oranges spread simultaneously. Separate BFS runs do not naturally model the shared clock and repeat work.

### Optimal Approach

```java
class Solution {
    public int orangesRotting(int[][] grid) {
        int rows = grid.length;
        int cols = grid[0].length;

        Queue<int[]> queue = new ArrayDeque<>();
        int fresh = 0;

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == 2) {
                    queue.offer(new int[]{r, c});
                } else if (grid[r][c] == 1) {
                    fresh++;
                }
            }
        }

        if (fresh == 0) {
            return 0;
        }

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        int minutes = 0;

        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            boolean rottedThisMinute = false;

            for (int i = 0; i < levelSize; i++) {
                int[] cell = queue.poll();
                int r = cell[0];
                int c = cell[1];

                for (int[] dir : dirs) {
                    int nr = r + dir[0];
                    int nc = c + dir[1];

                    if (nr < 0 || nr >= rows ||
                        nc < 0 || nc >= cols ||
                        grid[nr][nc] != 1) {
                        continue;
                    }

                    grid[nr][nc] = 2;
                    fresh--;
                    queue.offer(new int[]{nr, nc});
                    rottedThisMinute = true;
                }
            }

            if (rottedThisMinute) {
                minutes++;
            }
        }

        return fresh == 0 ? minutes : -1;
    }
}
```

### Dry Run

The queue initially contains **all rotten cells**.

Each BFS layer means one minute.

The final answer is:

```text
time of the last fresh orange becoming rotten
```

Not the number of BFS nodes and not the number of layers including the initial layer.

### Why Does It Work?

All initial rotten oranges start at time `0`. BFS expands them simultaneously, so every fresh orange receives the minimum possible infection time. The last infection time is therefore the minimum total time.

### Edge Cases

- all oranges rotten → `0`
- no fresh oranges → `0`
- one fresh orange surrounded by empty cells → `-1`

### Complexity

Every cell changes from fresh to rotten at most once.

Time: **`O(R * C)`**.

Queue: **`O(R * C)`**.

### Pattern to Remember

```text
Problem clue:  "Spreads simultaneously from many sources"
Pattern:       Multi-source BFS
Mental model:  Put all starting points in the queue at time 0
```

**Similar problems:** 13, 15, 32.

**Interview tip:** Say "I initialize the queue with all sources, not one source."

---

## 10. Flood Fill Algorithm

### Problem Understanding

LeetCode 733 asks us to change a connected region starting from one cell.

Example:

```text
1 1 1
1 1 0
1 0 1
```

Starting at `(1,1)` with new color `2`:

```text
2 2 2
2 2 0
2 0 1
```

### How to Think About the Problem

- One source, not many.
- We only need the connected region containing the source.
- DFS is natural.

Clue → Pattern:

```text
One starting cell + connected same-color region
        ↓
Grid DFS
```

### Intuition

```text
Find starting color
        ↓
visit same-color neighbors
        ↓
change them
        ↓
changed cells become the visited marker
```

### Naïve Approach

Use a separate visited matrix.

It works, but the image itself already gives us a convenient visited marker: the new color.

### Optimal Approach

```java
class Solution {
    public int[][] floodFill(
            int[][] image,
            int sr,
            int sc,
            int color) {

        int original = image[sr][sc];

        if (original == color) {
            return image;
        }

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        dfs(sr, sc, image, original, color, dirs);

        return image;
    }

    private void dfs(
            int r,
            int c,
            int[][] image,
            int original,
            int color,
            int[][] dirs) {

        image[r][c] = color;

        for (int[] dir : dirs) {
            int nr = r + dir[0];
            int nc = c + dir[1];

            if (nr < 0 || nr >= image.length ||
                nc < 0 || nc >= image[0].length) {
                continue;
            }

            if (image[nr][nc] == original) {
                dfs(nr, nc, image, original, color, dirs);
            }
        }
    }
}
```

### Dry Run

If source color is `1`, changing the current cell to `2` immediately is important.

Otherwise:

```text
A -> B -> A -> B -> ...
```

could keep revisiting cells.

### Why Does It Work?

Changing a cell before exploring its neighbors marks it as processed. DFS then reaches exactly the cells connected to the starting cell that have the original color.

### Complexity

Each reachable cell is processed once.

Time: **`O(R * C)`** worst case.

Recursion: **`O(R * C)`**.

### Pattern to Remember

```text
Problem clue:  "Recolor connected region"
Pattern:       Flood fill
Mental model:  Modify the cell itself as the visited marker
```

**Similar problems:** 6, 8, 18.

---

## 11. Cycle Detection in an Undirected Graph (BFS)

### Problem Understanding

Determine whether an undirected graph contains a cycle.

Example:

```text
0
| \
|  \
1---2
```

Cycle:

```text
0 -> 1 -> 2 -> 0
```

### How to Think About the Problem

The important complication is the parent edge.

If BFS travels:

```text
0 -> 1
```

then from `1` we naturally see `0`.

That does **not** mean there is a cycle.

Clue → Pattern:

```text
Undirected graph + BFS + visited neighbor
        ↓
Check whether visited neighbor is NOT the parent
```

### Intuition

```text
Naïve:
visited neighbor -> cycle

Problem:
the edge back to parent is always visited

Fix:
visited neighbor && neighbor != parent -> cycle
```

### Optimal Approach

```java
class Solution {
    static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            graph.get(edge[1]).add(edge[0]);
        }

        boolean[] visited = new boolean[n];

        for (int i = 0; i < n; i++) {
            if (!visited[i] &&
                bfsHasCycle(i, graph, visited)) {
                return true;
            }
        }

        return false;
    }

    static boolean bfsHasCycle(
            int source,
            List<List<Integer>> graph,
            boolean[] visited) {

        Queue<int[]> queue = new ArrayDeque<>();
        queue.offer(new int[]{source, -1});
        visited[source] = true;

        while (!queue.isEmpty()) {
            int[] state = queue.poll();
            int node = state[0];
            int parent = state[1];

            for (int next : graph.get(node)) {
                if (!visited[next]) {
                    visited[next] = true;
                    queue.offer(new int[]{next, node});
                } else if (next != parent) {
                    return true;
                }
            }
        }

        return false;
    }
}
```

### Dry Run

```text
0 -- 1 -- 2
```

From `1`, seeing `0` is safe because:

```text
0 == parent
```

Now add:

```text
0 -- 2
```

From `2`, seeing `0`:

```text
0 != parent(1)
```

Therefore cycle.

### Why Does It Work?

In an undirected graph, every DFS/BFS tree edge appears in both directions. Therefore the only visited neighbor that is not evidence of a cycle is the parent. Any other visited neighbor closes a cycle.

### Complexity

Graph build: `O(V + E)`.

BFS over the graph: **`O(V + E)`**.

Queue + visited: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Cycle in undirected graph"
Pattern:       BFS + parent
Mental model:  Ignore the edge you just came from
```

**Similar problems:** 12, 20.

---

## 12. Detect a Cycle in an Undirected Graph (DFS)

### Problem Understanding

Same cycle-detection goal, now using recursion.

### How to Think About the Problem

DFS naturally creates a parent-child tree.

A visited neighbor that is not the parent is a back edge.

Clue → Pattern:

```text
Undirected cycle
        ↓
DFS
        ↓
visited neighbor != parent
```

### Intuition

```text
DFS tree edge:
u -> v

Seeing u from v:
normal

Seeing x from v where x != parent:
cycle
```

### Optimal Approach

```java
class Solution {
    static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            graph.get(edge[1]).add(edge[0]);
        }

        boolean[] visited = new boolean[n];

        for (int i = 0; i < n; i++) {
            if (!visited[i] &&
                dfs(i, -1, graph, visited)) {
                return true;
            }
        }

        return false;
    }

    static boolean dfs(
            int node,
            int parent,
            List<List<Integer>> graph,
            boolean[] visited) {

        visited[node] = true;

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                if (dfs(next, node, graph, visited)) {
                    return true;
                }
            } else if (next != parent) {
                return true;
            }
        }

        return false;
    }
}
```

### Dry Run

For:

```text
0-1
| |
2-3
```

DFS may form:

```text
0 -> 1 -> 3 -> 2
```

When `2` sees `0`:

```text
visited[0] = true
0 != parent
```

Cycle detected.

### Why Does It Work?

Every DFS tree edge connects a node to its parent. A visited edge to any other ancestor or already discovered vertex gives an alternate route and therefore a cycle.

### Complexity

Time: **`O(V + E)`**.

Space: visited plus recursion stack → **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Undirected cycle"
Pattern:       DFS + parent
Mental model:  Every non-parent visited neighbor closes a cycle
```

**Similar problems:** 11, 20.

---

## 13. Distance of Nearest Cell Having 1 (01 Matrix)

### Problem Understanding

LeetCode 542 asks for the distance from every cell containing `1` to its nearest `0`.

Example:

```text
0 0 0
0 1 0
1 1 1
```

Output:

```text
0 0 0
0 1 0
1 2 1
```

### How to Think About the Problem

The question is:

> What is the distance to the nearest zero?

There may be many zero sources.

Clue → Pattern:

```text
Distance to nearest of many sources
        ↓
Multi-source BFS
```

### Intuition

```text
Brute:
for every 1, start another BFS to find a 0
        ↓
O((R*C)²)

Observation:
all zeros are sources at distance 0
        ↓
run one BFS from all zeros

Optimal:
O(R*C)
```

### Optimal Approach

```java
class Solution {
    public int[][] updateMatrix(int[][] mat) {
        int rows = mat.length;
        int cols = mat[0].length;

        int[][] dist = new int[rows][cols];
        Queue<int[]> queue = new ArrayDeque<>();

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (mat[r][c] == 0) {
                    queue.offer(new int[]{r, c});
                } else {
                    dist[r][c] = -1;
                }
            }
        }

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        while (!queue.isEmpty()) {
            int[] cell = queue.poll();
            int r = cell[0];
            int c = cell[1];

            for (int[] dir : dirs) {
                int nr = r + dir[0];
                int nc = c + dir[1];

                if (nr < 0 || nr >= rows ||
                    nc < 0 || nc >= cols ||
                    dist[nr][nc] != -1) {
                    continue;
                }

                dist[nr][nc] = dist[r][c] + 1;
                queue.offer(new int[]{nr, nc});
            }
        }

        return dist;
    }
}
```

### Dry Run

Initial queue:

```text
all zeros
```

Distance:

```text
0 0 0
0 ? 0
? ? ?
```

Next layer:

```text
0 0 0
0 1 0
1 ? 1
```

Next:

```text
0 0 0
0 1 0
1 2 1
```

### Why Does It Work?

Every zero starts at distance `0`. BFS expands by increasing distance, so the first time a cell is reached, the source used to reach it is one of its nearest zeros.

### Complexity

Every cell enters the queue at most once.

Time: **`O(R * C)`**.

Distance array + queue: **`O(R * C)`**.

### Pattern to Remember

```text
Problem clue:  "Nearest distance to any source"
Pattern:       Multi-source BFS
Mental model:  Put every source into the queue at distance 0
```

**Similar problems:** 9, 15, 32.

---

## 14. Surrounded Regions

### Problem Understanding

LeetCode 130 asks us to replace `O` regions completely surrounded by `X`.

Example:

```text
X X X X
X O O X
X X O X
X O X X
```

The `O` region connected to the border survives.

The enclosed region becomes:

```text
X X X X
X X X X
X X X X
X O X X
```

### How to Think About the Problem

Instead of finding enclosed regions directly, find the opposite:

> Which `O`s are definitely **not** surrounded?

They are the `O`s reachable from the border.

Clue → Pattern:

```text
"Surrounded" in a grid
        ↓
Start from boundary cells
        ↓
Mark safe region
        ↓
Flip every remaining O
```

### Intuition

```text
Brute:
try to determine whether each O has an escape path
        ↓
repeat similar searches

Observation:
every O connected to the border is definitely safe
        ↓
mark those once

Optimal:
boundary DFS + final scan
```

### Optimal Approach

```java
class Solution {
    public void solve(char[][] board) {
        int rows = board.length;

        if (rows == 0) {
            return;
        }

        int cols = board[0].length;

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        for (int r = 0; r < rows; r++) {
            dfs(r, 0, board, dirs);
            dfs(r, cols - 1, board, dirs);
        }

        for (int c = 0; c < cols; c++) {
            dfs(0, c, board, dirs);
            dfs(rows - 1, c, board, dirs);
        }

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (board[r][c] == 'O') {
                    board[r][c] = 'X';
                } else if (board[r][c] == '#') {
                    board[r][c] = 'O';
                }
            }
        }
    }

    private void dfs(
            int r,
            int c,
            char[][] board,
            int[][] dirs) {

        if (r < 0 || r >= board.length ||
            c < 0 || c >= board[0].length ||
            board[r][c] != 'O') {
            return;
        }

        board[r][c] = '#';

        for (int[] dir : dirs) {
            dfs(r + dir[0], c + dir[1], board, dirs);
        }
    }
}
```

### Dry Run

Boundary `O`:

```text
X X X X
X O O X
X X O X
X O X X
      ^
```

That cell is marked safe, then its connected region.

The middle region has no boundary connection, so it remains `O` until the final pass.

### Why Does It Work?

Every `O` reachable from the border has an escape path and cannot be surrounded. Every `O` not reached from the border has no escape path, so it is enclosed and must be converted.

### Complexity

Each cell is visited a constant number of times.

Time: **`O(R * C)`**.

Recursion: **`O(R * C)`** worst case.

### Pattern to Remember

```text
Problem clue:  "Enclosed region"
Pattern:       Boundary-first flood fill
Mental model:  Find what must survive, then flip the rest
```

**Similar problems:** 15, 18.

---

## 15. Number of Enclaves

### Problem Understanding

LeetCode 1020 asks how many land cells cannot reach the boundary.

Example:

```text
0 0 0 0
1 0 1 0
0 1 1 0
0 0 0 0
```

The interior land connected to the border is not an enclave.

### How to Think About the Problem

This is the same boundary idea as Surrounded Regions.

Clue → Pattern:

```text
Count cells that cannot escape
        ↓
Mark all cells that can escape
        ↓
Count remaining land
```

### Intuition

```text
Brute:
for each land cell, search for a boundary
        ↓
many repeated searches

Observation:
all boundary-reachable land can be found in one multi-source traversal
```

### Optimal Approach

```java
class Solution {
    public int numEnclaves(int[][] grid) {
        int rows = grid.length;
        int cols = grid[0].length;

        Queue<int[]> queue = new ArrayDeque<>();
        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        for (int r = 0; r < rows; r++) {
            addIfLand(r, 0, grid, queue);
            addIfLand(r, cols - 1, grid, queue);
        }

        for (int c = 0; c < cols; c++) {
            addIfLand(0, c, grid, queue);
            addIfLand(rows - 1, c, grid, queue);
        }

        while (!queue.isEmpty()) {
            int[] cell = queue.poll();

            for (int[] dir : dirs) {
                int nr = cell[0] + dir[0];
                int nc = cell[1] + dir[1];

                if (nr < 0 || nr >= rows ||
                    nc < 0 || nc >= cols ||
                    grid[nr][nc] != 1) {
                    continue;
                }

                grid[nr][nc] = 0;
                queue.offer(new int[]{nr, nc});
            }
        }

        int answer = 0;

        for (int[] row : grid) {
            for (int cell : row) {
                if (cell == 1) {
                    answer++;
                }
            }
        }

        return answer;
    }

    private void addIfLand(
            int r,
            int c,
            int[][] grid,
            Queue<int[]> queue) {

        if (grid[r][c] == 1) {
            grid[r][c] = 0;
            queue.offer(new int[]{r, c});
        }
    }
}
```

### Dry Run

Boundary land is removed first.

After BFS:

```text
0 = can escape
1 = cannot escape
```

Count the remaining `1`s.

### Why Does It Work?

A land cell is an enclave exactly when it cannot be reached from any boundary land cell. Removing all boundary-reachable land leaves precisely the enclaves.

### Complexity

Time: **`O(R * C)`**.

Queue: **`O(R * C)`**.

### Pattern to Remember

```text
Problem clue:  "Count land that cannot reach boundary"
Pattern:       Boundary flood fill
Mental model:  Remove all escape-capable cells, count what remains
```

---

## 16. Word Ladder I

### Problem Understanding

LeetCode 127:

```text
beginWord = "hit"
endWord   = "cog"
```

Allowed words include:

```text
hot, dot, dog, lot, log, cog
```

One letter may change at a time.

Shortest transformation:

```text
hit -> hot -> dot -> dog -> cog
```

Length = `5`.

### How to Think About the Problem

Treat each word as a graph node.

Two words are connected if they differ by exactly one character.

Clue → Pattern:

```text
One-letter transformations
        ↓
Unweighted graph
        ↓
BFS shortest path
```

### Intuition

```text
Brute:
build every possible word and compare every pair
        ↓
huge graph construction cost

Observation:
from a word, generate its one-letter mutations directly
        ↓
BFS only explores relevant words
```

### Optimal Approach

```java
class Solution {
    public int ladderLength(
            String beginWord,
            String endWord,
            List<String> wordList) {

        Set<String> available = new HashSet<>(wordList);

        if (!available.contains(endWord)) {
            return 0;
        }

        Queue<String> queue = new ArrayDeque<>();
        queue.offer(beginWord);

        int level = 1;

        while (!queue.isEmpty()) {
            int size = queue.size();

            for (int s = 0; s < size; s++) {
                String word = queue.poll();

                if (word.equals(endWord)) {
                    return level;
                }

                char[] chars = word.toCharArray();

                for (int i = 0; i < chars.length; i++) {
                    char original = chars[i];

                    for (char ch = 'a'; ch <= 'z'; ch++) {
                        if (ch == original) {
                            continue;
                        }

                        chars[i] = ch;
                        String next = new String(chars);

                        if (available.remove(next)) {
                            queue.offer(next);
                        }
                    }

                    chars[i] = original;
                }
            }

            level++;
        }

        return 0;
    }
}
```

### Dry Run

```text
hit
 ↓
hot
 ↓
dot
 ↓
dog
 ↓
cog
```

Each BFS level represents one transformation.

### Why Does It Work?

Every valid one-letter transformation has equal cost `1`. Therefore BFS finds the minimum number of transformations. Removing a word from the set when first discovered prevents repeated work.

### Complexity

For each discovered word, try `26 * L` mutations where `L` is word length.

If `W` words are reached:

Time: approximately **`O(W * L * 26)`**.

Set + queue: **`O(W)`**.

### Pattern to Remember

```text
Problem clue:  "Change one character at a time"
Pattern:       Unweighted graph + BFS
Mental model:  Words are nodes, one-letter changes are edges
```

**Similar problems:** 17, 28, 37.

---

## 17. Word Ladder II

### Problem Understanding

LeetCode 126 asks for **all shortest transformation sequences**, not just the length.

Example:

```text
hit -> hot -> dot -> dog -> cog
hit -> hot -> lot -> log -> cog
```

Both are valid shortest paths.

### How to Think About the Problem

One BFS can find shortest distances.

But normal `visited` logic is not enough because we must preserve multiple parents that belong to the same shortest layer.

Clue → Pattern:

```text
All shortest paths
        ↓
BFS for shortest layers
        +
DFS/backtracking over shortest-parent edges
```

### Intuition

```text
Naïve DFS:
generate every transformation path
        ↓
exponential

Observation:
only shortest paths matter

BFS:
record distance + all parents that achieve that distance
        ↓
DFS from endWord back to beginWord
```

### Optimal Approach

```java
class Solution {
    public List<List<String>> findLadders(
            String beginWord,
            String endWord,
            List<String> wordList) {

        Set<String> dictionary = new HashSet<>(wordList);

        List<List<String>> answer = new ArrayList<>();

        if (!dictionary.contains(endWord)) {
            return answer;
        }

        Map<String, Integer> dist = new HashMap<>();
        Map<String, List<String>> parents = new HashMap<>();

        Queue<String> queue = new ArrayDeque<>();

        queue.offer(beginWord);
        dist.put(beginWord, 0);

        boolean found = false;

        while (!queue.isEmpty() && !found) {
            int size = queue.size();

            for (int s = 0; s < size; s++) {
                String word = queue.poll();
                int currentDist = dist.get(word);

                char[] chars = word.toCharArray();

                for (int i = 0; i < chars.length; i++) {
                    char original = chars[i];

                    for (char ch = 'a'; ch <= 'z'; ch++) {
                        if (ch == original) {
                            continue;
                        }

                        chars[i] = ch;
                        String next = new String(chars);

                        if (!dictionary.contains(next)) {
                            continue;
                        }

                        int nextDist = currentDist + 1;

                        if (!dist.containsKey(next)) {
                            dist.put(next, nextDist);
                            parents.put(next, new ArrayList<>());
                            parents.get(next).add(word);
                            queue.offer(next);
                        } else if (dist.get(next) == nextDist) {
                            parents.get(next).add(word);
                        }

                        if (next.equals(endWord)) {
                            found = true;
                        }
                    }

                    chars[i] = original;
                }
            }
        }

        if (!dist.containsKey(endWord)) {
            return answer;
        }

        List<String> path = new ArrayList<>();
        path.add(endWord);

        dfs(endWord, beginWord, parents, path, answer);

        return answer;
    }

    private void dfs(
            String word,
            String beginWord,
            Map<String, List<String>> parents,
            List<String> path,
            List<List<String>> answer) {

        if (word.equals(beginWord)) {
            List<String> current = new ArrayList<>(path);
            Collections.reverse(current);
            answer.add(current);
            return;
        }

        for (String parent : parents.getOrDefault(word, List.of())) {
            path.add(parent);
            dfs(parent, beginWord, parents, path, answer);
            path.remove(path.size() - 1);
        }
    }
}
```

### Dry Run

BFS discovers:

```text
hot : parent = hit
dot : parent = hot
lot : parent = hot
dog : parent = dot
log : parent = lot
cog : parents = dog, log
```

DFS from `cog` reconstructs both paths.

### Why Does It Work?

BFS guarantees that `dist[word]` is the shortest distance. A parent is recorded only if it reaches the child in exactly one additional shortest layer. Therefore the parent graph contains exactly the edges belonging to shortest paths.

### Complexity

Let `W` be the number of dictionary words, `L` their length, and `P` the total size of the returned shortest paths.

BFS work is roughly **`O(W * L * 26)`**.

Path reconstruction adds **`O(P)`**.

### Pattern to Remember

```text
Problem clue:  "All shortest paths"
Pattern:       BFS layers + parent DAG + DFS reconstruction
Mental model:  BFS finds distance; DFS reconstructs choices
```

**Interview tip:** Explain why storing one parent is insufficient when multiple shortest parents exist.

---

## 18. Number of Islands

### Problem Understanding

LeetCode 200 asks for the number of connected land regions.

Example:

```text
1 1 0
0 1 0
1 0 1
```

With four directions, answer = `3`.

### How to Think About the Problem

This is exactly the grid connected-component problem from the foundation.

The only question is how to mark visited cells.

Clue → Pattern:

```text
Grid + connected land components
        ↓
DFS/BFS flood fill
```

### Intuition

```text
Scan grid
 ↓
see fresh land
 ↓
increment islands
 ↓
sink the entire island
```

### Optimal Approach

```java
class Solution {
    public int numIslands(char[][] grid) {
        int rows = grid.length;

        if (rows == 0) {
            return 0;
        }

        int cols = grid[0].length;
        int islands = 0;

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') {
                    continue;
                }

                islands++;
                dfs(r, c, grid, dirs);
            }
        }

        return islands;
    }

    private void dfs(
            int r,
            int c,
            char[][] grid,
            int[][] dirs) {

        if (r < 0 || r >= grid.length ||
            c < 0 || c >= grid[0].length ||
            grid[r][c] != '1') {
            return;
        }

        grid[r][c] = '0';

        for (int[] dir : dirs) {
            dfs(r + dir[0], c + dir[1], grid, dirs);
        }
    }
}
```

### Dry Run

First `1` starts one DFS.

All connected `1`s become `0`.

The next remaining `1` starts another island.

### Why Does It Work?

Flood fill visits exactly one connected land component. Marking its cells as water prevents it from being counted again.

### Complexity

Time: **`O(R * C)`**.

Space: **`O(R * C)`** worst-case recursion.

### Pattern to Remember

```text
Problem clue:  "Number of islands / connected land"
Pattern:       Grid connected components
Mental model:  DFS once per unseen land cell
```

**Similar problems:** 6, 8, 15, 48, 49.

---

## 19. Is Graph Bipartite (DFS)

### Problem Understanding

A graph is bipartite if we can color each vertex with one of two colors such that every edge connects opposite colors.

Example:

```text
0 ---- 1
|      |
|      |
3 ---- 2
```

Can be colored:

```text
0 = 0
2 = 0
1 = 1
3 = 1
```

### How to Think About the Problem

For every edge:

```text
u ---- v
```

we need:

```text
color[u] != color[v]
```

Clue → Pattern:

```text
Two-coloring / odd cycle
        ↓
DFS or BFS coloring
```

### Intuition

```text
color source = 0
        ↓
every neighbor must be 1
        ↓
every neighbor's neighbor must be 0
        ↓
a contradiction means not bipartite
```

### Optimal Approach

```java
class Solution {
    public boolean isBipartite(int[][] graph) {
        int n = graph.length;
        int[] color = new int[n];

        Arrays.fill(color, -1);

        for (int i = 0; i < n; i++) {
            if (color[i] != -1) {
                continue;
            }

            color[i] = 0;

            if (!dfs(i, graph, color)) {
                return false;
            }
        }

        return true;
    }

    private boolean dfs(
            int node,
            int[][] graph,
            int[] color) {

        for (int next : graph[node]) {
            if (color[next] == -1) {
                color[next] = 1 - color[node];

                if (!dfs(next, graph, color)) {
                    return false;
                }
            } else if (color[next] == color[node]) {
                return false;
            }
        }

        return true;
    }
}
```

### Dry Run

For:

```text
0 -- 1 -- 2
```

assign:

```text
0 -> 0
1 -> 1
2 -> 0
```

No conflict.

For a triangle:

```text
0 -- 1
 \  /
  2
```

we eventually require `2 = 0` from one edge and `2 = 1` from another. Conflict.

### Why Does It Work?

A bipartite graph can be divided into two sets. DFS propagates the required opposite color along every edge. A same-color edge proves no such two-way partition exists.

Equivalently, a graph is bipartite exactly when it has no odd-length cycle.

### Complexity

Every vertex and edge is examined once.

Time: **`O(V + E)`**.

Color + recursion: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Can split into two groups?" / "two colors?"
Pattern:       Bipartite coloring
Mental model:  Every edge requires opposite colors
```

**Similar problems:** 11, 12, 20.

---

## 20. Cycle Detection in a Directed Graph (DFS)

### Problem Understanding

Detect whether a directed graph contains a cycle.

Example:

```text
0 -> 1 -> 2
     ^    |
     |____|
```

There is a directed cycle.

### How to Think About the Problem

Visited alone is insufficient.

Suppose:

```text
0 -> 1
0 -> 2

1 -> 3
2 -> 3
```

When `2` reaches `3`, `3` may already be visited, but that is not necessarily a cycle.

The critical question is:

> Is the neighbor currently on my recursion path?

Clue → Pattern:

```text
Directed cycle
        ↓
DFS + recursion-stack/pathVisited
```

### Intuition

```text
visited = seen before

pathVisited = currently inside this DFS path

visited && pathVisited
        ↓
back edge
        ↓
cycle
```

### Optimal Approach

```java
class Solution {
    static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
        }

        boolean[] visited = new boolean[n];
        boolean[] pathVisited = new boolean[n];

        for (int i = 0; i < n; i++) {
            if (!visited[i] &&
                dfs(i, graph, visited, pathVisited)) {
                return true;
            }
        }

        return false;
    }

    static boolean dfs(
            int node,
            List<List<Integer>> graph,
            boolean[] visited,
            boolean[] pathVisited) {

        visited[node] = true;
        pathVisited[node] = true;

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                if (dfs(next, graph, visited, pathVisited)) {
                    return true;
                }
            } else if (pathVisited[next]) {
                return true;
            }
        }

        pathVisited[node] = false;
        return false;
    }
}
```

### Dry Run

For:

```text
0 -> 1
1 -> 2
2 -> 1
```

While exploring `0 -> 1 -> 2`, node `1` is still on the recursion path.

Then:

```text
2 -> 1
```

finds:

```text
visited[1] = true
pathVisited[1] = true
```

Cycle.

### Why Does It Work?

A directed cycle exists exactly when DFS encounters an edge to a vertex still in the current recursion path. A vertex visited in an earlier completed DFS path does not by itself imply a cycle.

### Complexity

Time: **`O(V + E)`**.

Visited arrays + recursion: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Directed cycle"
Pattern:       DFS + recursion stack
Mental model:  visited is not enough; pathVisited identifies back edges
```

**Similar problems:** 20, 23, 24.

**Interview tip:** Explicitly explain why undirected `parent` logic cannot be reused here.

---

# PART C — Topological Sort and Problems

## 21. Topological Sort (DFS)

### Problem Understanding

Given a directed graph, return an ordering in which every edge:

```text
u -> v
```

satisfies:

```text
u before v
```

A topological order exists only if the graph is a DAG.

### How to Think About the Problem

The question is not:

> "Which node comes first?"

It is:

> "When is a node safe to put into the final ordering?"

Answer:

> After all nodes reachable through its outgoing dependencies have been processed.

Clue → Pattern:

```text
DAG + dependency ordering
        ↓
DFS postorder
        ↓
reverse
```

### Intuition

```text
visit dependency
        ↓
finish dependency
        ↓
push current node
```

So nodes are stored after their dependencies.

### Optimal Approach

```java
class Solution {
    static List<Integer> topoSort(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
        }

        boolean[] visited = new boolean[n];
        boolean[] pathVisited = new boolean[n];
        List<Integer> order = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            if (!visited[i] &&
                !dfs(i, graph, visited, pathVisited, order)) {
                return List.of();
            }
        }

        Collections.reverse(order);
        return order;
    }

    static boolean dfs(
            int node,
            List<List<Integer>> graph,
            boolean[] visited,
            boolean[] pathVisited,
            List<Integer> order) {

        visited[node] = true;
        pathVisited[node] = true;

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                if (!dfs(next, graph, visited, pathVisited, order)) {
                    return false;
                }
            } else if (pathVisited[next]) {
                return false;
            }
        }

        pathVisited[node] = false;
        order.add(node);

        return true;
    }
}
```

### Dry Run

```text
0 -> 1 -> 2
```

DFS:

```text
2 finishes first
1 finishes next
0 finishes last
```

Stored:

```text
[2,1,0]
```

Reverse:

```text
[0,1,2]
```

### Why Does It Work?

A node is pushed only after every node reachable through its outgoing edges has finished. Reversing the finish order therefore places every dependency before the dependent node.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Order dependencies"
Pattern:       DFS topological sort
Mental model:  Postorder means dependencies finish before dependents
```

---

## 22. Topological Sort — Kahn's Algorithm (BFS)

### Problem Understanding

Kahn's algorithm produces a topological ordering using indegrees.

### How to Think About the Problem

A node with:

```text
indegree = 0
```

has no remaining prerequisites.

Therefore it is safe to process.

Clue → Pattern:

```text
Dependency graph
        ↓
indegree 0 nodes
        ↓
Kahn's BFS
```

### Intuition

```text
indegree 0
   ↓
take node
   ↓
remove its outgoing edges
   ↓
new indegree 0 nodes
```

### Optimal Approach

```java
class Solution {
    static List<Integer> topoSort(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();
        int[] indegree = new int[n];

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];

            graph.get(u).add(v);
            indegree[v]++;
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        List<Integer> order = new ArrayList<>();

        while (!queue.isEmpty()) {
            int node = queue.poll();
            order.add(node);

            for (int next : graph.get(node)) {
                indegree[next]--;

                if (indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        if (order.size() != n) {
            return List.of();
        }

        return order;
    }
}
```

### Dry Run

For:

```text
0 -> 2
1 -> 2
2 -> 3
```

Initial indegrees:

```text
0:0
1:0
2:2
3:1
```

Queue:

```text
[0,1]
```

After processing `0`:

```text
2:1
```

After processing `1`:

```text
2:0
```

Then `2` enters the queue.

### Why Does It Work?

Every node enters the queue only after all incoming edges have been removed. If fewer than `V` nodes are processed, some nodes still depend on one another, meaning the graph contains a cycle.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Prerequisites" / "indegree" / "can take now?"
Pattern:       Kahn's algorithm
Mental model:  indegree 0 = no unfinished dependency
```

**Interview tip:** Remember the single cycle test: `processedCount != V`.

---

## 23. Detect a Cycle in a Directed Graph (BFS / Kahn)

### Problem Understanding

Detect whether a directed graph contains a cycle using Kahn's algorithm.

### How to Think About the Problem

A DAG has at least one node with indegree zero.

If we repeatedly remove those nodes and still cannot process every node, a cycle remains.

Clue → Pattern:

```text
Directed cycle + indegree
        ↓
Kahn's algorithm
        ↓
processed count < V -> cycle
```

### Intuition

```text
A DAG always has at least one "dependency-free" node.

Remove it.
Then another becomes dependency-free.

If the process gets stuck before all nodes are removed:
cycle.
```

### Optimal Approach

```java
class Solution {
    static boolean hasCycle(int n, int[][] edges) {
        List<List<Integer>> graph = new ArrayList<>();
        int[] indegree = new int[n];

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            indegree[edge[1]]++;
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        int processed = 0;

        while (!queue.isEmpty()) {
            int node = queue.poll();
            processed++;

            for (int next : graph.get(node)) {
                if (--indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        return processed != n;
    }
}
```

### Dry Run

Cycle:

```text
0 -> 1 -> 2 -> 0
```

Every node initially has indegree `1`.

Queue:

```text
[]
```

No node can be processed.

Thus:

```text
processed = 0
V = 3
processed != V
```

Cycle exists.

### Why Does It Work?

A DAG always has at least one indegree-zero vertex. Repeatedly removing such vertices eventually removes all DAG vertices. A remaining vertex set with positive indegree everywhere must contain a cycle.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Detect directed cycle using indegrees"
Pattern:       Kahn's processed-count test
Mental model:  leftover nodes imply circular dependency
```

---

## 24. Course Schedule I

### Problem Understanding

LeetCode 207 asks whether all courses can be completed given prerequisite relations.

If:

```text
[1,0]
```

means:

```text
take 0 before 1
```

then prerequisites form a directed graph.

Return `true` if the graph is acyclic.

### How to Think About the Problem

This is not a new algorithm.

It is simply:

```text
Course prerequisites
        ↓
Directed graph
        ↓
Cycle detection
        ↓
Kahn
```

### Intuition

```text
If a dependency cycle exists:

0 -> 1
1 -> 2
2 -> 0

there is no possible course order.
```

### Optimal Approach

```java
class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> graph = new ArrayList<>();
        int[] indegree = new int[numCourses];

        for (int i = 0; i < numCourses; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] prerequisite : prerequisites) {
            int course = prerequisite[0];
            int required = prerequisite[1];

            graph.get(required).add(course);
            indegree[course]++;
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < numCourses; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        int completed = 0;

        while (!queue.isEmpty()) {
            int course = queue.poll();
            completed++;

            for (int next : graph.get(course)) {
                if (--indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        return completed == numCourses;
    }
}
```

### Dry Run

```text
0 -> 1
1 -> 2
```

Queue starts:

```text
[0]
```

Then:

```text
0 processed -> 1 unlocked
1 processed -> 2 unlocked
2 processed
```

All courses complete.

### Why Does It Work?

A valid course schedule is exactly a topological ordering. Such an ordering exists exactly when the prerequisite graph is acyclic.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Course prerequisites"
Pattern:       Directed graph + cycle detection
Mental model:  Can I topologically order every course?
```

---

## 25. Course Schedule II

### Problem Understanding

LeetCode 210 asks for the actual valid course ordering.

If impossible, return:

```text
[]
```

### How to Think About the Problem

Problem 24 asked:

```text
Does a topological order exist?
```

This problem asks:

```text
Give me the topological order.
```

### Intuition

```text
Course prerequisite
        ↓
Build directed graph
        ↓
Kahn
        ↓
return processing order
```

### Optimal Approach

```java
class Solution {
    public int[] findOrder(
            int numCourses,
            int[][] prerequisites) {

        List<List<Integer>> graph = new ArrayList<>();
        int[] indegree = new int[numCourses];

        for (int i = 0; i < numCourses; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] prerequisite : prerequisites) {
            int course = prerequisite[0];
            int required = prerequisite[1];

            graph.get(required).add(course);
            indegree[course]++;
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < numCourses; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        int[] order = new int[numCourses];
        int index = 0;

        while (!queue.isEmpty()) {
            int course = queue.poll();
            order[index++] = course;

            for (int next : graph.get(course)) {
                if (--indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        return index == numCourses
                ? order
                : new int[0];
    }
}
```

### Dry Run

```text
1 depends on 0
2 depends on 1
```

Kahn produces:

```text
0 -> 1 -> 2
```

### Why Does It Work?

Every course is added only when every prerequisite edge has been removed. Therefore the resulting order satisfies every prerequisite relation.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Return a valid dependency order"
Pattern:       Topological sort
Mental model:  Kahn directly gives the answer order
```

---

## 26. Find Eventual Safe States

### Problem Understanding

LeetCode 802 asks for nodes from which every possible path eventually ends at a terminal node.

A node is unsafe if it can reach a cycle.

The crucial idea is to reverse the graph.

### How to Think About the Problem

Terminal node:

```text
outdegree = 0
```

These are obviously safe.

If another node points only to safe nodes, it is also safe.

Clue → Pattern:

```text
"Eventually reaches terminal"
        ↓
Reverse edges
        ↓
Terminal nodes become indegree 0
        ↓
Kahn
```

### Intuition

Original:

```text
A -> B
C -> B
```

Reverse:

```text
B -> A
B -> C
```

Now B starts as a terminal node.

As safe nodes are removed, their predecessors become safe too.

### Optimal Approach

```java
class Solution {
    public List<Integer> eventualSafeNodes(int[][] graph) {
        int n = graph.length;

        List<List<Integer>> reverse = new ArrayList<>();
        int[] indegree = new int[n];

        for (int i = 0; i < n; i++) {
            reverse.add(new ArrayList<>());
        }

        for (int u = 0; u < n; u++) {
            for (int v : graph[u]) {
                reverse.get(v).add(u);
                indegree[u]++;
            }
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        boolean[] safe = new boolean[n];

        while (!queue.isEmpty()) {
            int node = queue.poll();
            safe[node] = true;

            for (int prev : reverse.get(node)) {
                if (--indegree[prev] == 0) {
                    queue.offer(prev);
                }
            }
        }

        List<Integer> answer = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            if (safe[i]) {
                answer.add(i);
            }
        }

        return answer;
    }
}
```

### Dry Run

```text
0 -> 1
1 -> terminal
2 -> 3
3 -> 2
```

Nodes:

```text
1 = safe
0 = safe

2,3 = cycle
```

Thus:

```text
[0,1]
```

### Why Does It Work?

A node is safe when all of its outgoing choices lead to safe nodes. In the reversed graph, once all outgoing dependencies of a node have been classified safe, its reversed indegree becomes zero and Kahn can process it.

### Complexity

Every directed edge is reversed and processed once.

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Eventually terminates / safe nodes"
Pattern:       Reverse graph + Kahn
Mental model:  Work backward from terminal states
```

---

## 27. Alien Dictionary

### Problem Understanding

Given words sorted in an unknown language order, infer the character ordering.

Example:

```text
["wrt", "wrf", "er", "ett", "rftt"]
```

A valid ordering is:

```text
w -> e -> r -> t -> f
```

### How to Think About the Problem

Compare adjacent words.

Only the **first differing character** gives ordering information.

Example:

```text
wrt
wrf
  ^
```

So:

```text
t -> f
```

The prefix rule is critical.

```text
["abc", "ab"]
```

is invalid because a longer word appears before its own prefix.

Clue → Pattern:

```text
Words sorted lexicographically
        ↓
First differing character = directed edge
        ↓
Topological sort
```

### Intuition

```text
Convert language ordering
        ↓
into character dependencies
        ↓
topological sort the character graph
```

### Optimal Approach

```java
class Solution {
    public String alienOrder(String[] words) {
        boolean[] present = new boolean[26];

        for (String word : words) {
            for (char ch : word.toCharArray()) {
                present[ch - 'a'] = true;
            }
        }

        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < 26; i++) {
            graph.add(new ArrayList<>());
        }

        int[] indegree = new int[26];
        boolean[][] edgeExists = new boolean[26][26];

        for (int i = 0; i < words.length - 1; i++) {
            String a = words[i];
            String b = words[i + 1];

            int limit = Math.min(a.length(), b.length());
            int j = 0;

            while (j < limit && a.charAt(j) == b.charAt(j)) {
                j++;
            }

            if (j == limit) {
                if (a.length() > b.length()) {
                    return "";
                }

                continue;
            }

            int u = a.charAt(j) - 'a';
            int v = b.charAt(j) - 'a';

            if (!edgeExists[u][v]) {
                edgeExists[u][v] = true;
                graph.get(u).add(v);
                indegree[v]++;
            }
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < 26; i++) {
            if (present[i] && indegree[i] == 0) {
                queue.offer(i);
            }
        }

        StringBuilder result = new StringBuilder();

        while (!queue.isEmpty()) {
            int node = queue.poll();
            result.append((char) ('a' + node));

            for (int next : graph.get(node)) {
                if (--indegree[next] == 0) {
                    queue.offer(next);
                }
            }
        }

        int presentCount = 0;

        for (boolean exists : present) {
            if (exists) {
                presentCount++;
            }
        }

        return result.length() == presentCount
                ? result.toString()
                : "";
    }
}
```

### Dry Run

```text
wrt
wrf
```

First differing character:

```text
t -> f
```

Then:

```text
wrf
er
```

gives:

```text
w -> e
```

and so on.

### Why Does It Work?

Lexicographic comparison determines character precedence at the first difference. These precedence rules form a directed graph. A valid alien alphabet is exactly a topological ordering of that graph, provided the prefix condition is valid and the graph is acyclic.

### Complexity

Alphabet size is bounded by 26.

Comparing all adjacent words costs **`O(total characters)`**.

Topological processing is effectively **`O(26 + E)`**.

Space: **`O(26²)`** for the duplicate-edge matrix.

### Pattern to Remember

```text
Problem clue:  "Infer ordering from sorted items"
Pattern:       Build dependencies + topological sort
Mental model:  First difference creates one directed edge
```

**Interview tip:** Never forget the invalid-prefix case.

---

# PART D — Shortest Path Algorithms and Problems

## 28. Shortest Path in Undirected Graph with Unit Weights

### Problem Understanding

Every edge costs exactly `1`.

Given a source, find the minimum number of edges needed to reach every node.

### How to Think About the Problem

This is the most direct shortest-path case.

```text
All weights = 1
```

Therefore:

```text
BFS
```

No priority queue is required.

### Intuition

```text
Dijkstra works
        ↓
but every edge has the same weight
        ↓
the smallest distance always belongs to the next BFS layer
        ↓
BFS is simpler
```

### Optimal Approach

```java
class Solution {
    static int[] shortestPath(
            int n,
            int[][] edges,
            int source) {

        List<List<Integer>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(edge[1]);
            graph.get(edge[1]).add(edge[0]);
        }

        int[] dist = new int[n];
        Arrays.fill(dist, -1);

        Queue<Integer> queue = new ArrayDeque<>();

        dist[source] = 0;
        queue.offer(source);

        while (!queue.isEmpty()) {
            int node = queue.poll();

            for (int next : graph.get(node)) {
                if (dist[next] != -1) {
                    continue;
                }

                dist[next] = dist[node] + 1;
                queue.offer(next);
            }
        }

        return dist;
    }
}
```

### Dry Run

```text
0 -- 1 -- 2
     |
     3
```

Distances from `0`:

```text
0 = 0
1 = 1
2 = 2
3 = 2
```

### Why Does It Work?

All edges have equal cost, so BFS explores exactly in increasing path length. The first distance assigned to a node is therefore its shortest distance.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Shortest path" + all edges cost 1
Pattern:       BFS distance
Mental model:  BFS level number = shortest distance
```

---

## 29. Shortest Path in a DAG

### Problem Understanding

Find shortest distances in a directed acyclic graph.

Weights may be positive or negative.

### How to Think About the Problem

A DAG has a topological order.

Once we process a node in topological order, every possible predecessor has already been processed.

That allows each edge to be relaxed once.

Clue → Pattern:

```text
DAG + shortest path
        ↓
Topological order + relaxation
```

### Intuition

```text
Dijkstra:
needs a priority queue

DAG:
topological order already tells us the dependency order
        ↓
one pass of relaxation
```

### Optimal Approach

```java
class Solution {
    static long[] shortestPath(
            int n,
            int[][] edges,
            int source) {

        List<List<int[]>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(
                    new int[]{edge[1], edge[2]}
            );
        }

        int[] indegree = new int[n];

        for (int u = 0; u < n; u++) {
            for (int[] edge : graph.get(u)) {
                indegree[edge[0]]++;
            }
        }

        Queue<Integer> queue = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            if (indegree[i] == 0) {
                queue.offer(i);
            }
        }

        List<Integer> topo = new ArrayList<>();

        while (!queue.isEmpty()) {
            int u = queue.poll();
            topo.add(u);

            for (int[] edge : graph.get(u)) {
                if (--indegree[edge[0]] == 0) {
                    queue.offer(edge[0]);
                }
            }
        }

        long INF = Long.MAX_VALUE / 4;
        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        dist[source] = 0;

        for (int u : topo) {
            if (dist[u] == INF) {
                continue;
            }

            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                int w = edge[1];

                if (dist[v] > dist[u] + w) {
                    dist[v] = dist[u] + w;
                }
            }
        }

        return dist;
    }
}
```

### Dry Run

Topological order:

```text
0 1 2 3
```

Process:

```text
dist[0] = 0
relax outgoing edges
then node 1
then node 2
...
```

### Why Does It Work?

Because the graph is acyclic, all predecessors of a node occur earlier in topological order. Therefore when a node is processed, all shortest candidates from its predecessors are already known.

### Complexity

Building graph + topological sort: **`O(V + E)`**.

Relaxing every edge once: **`O(E)`**.

Total: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Shortest path in DAG"
Pattern:       Topological order + relaxation
Mental model:  Dependency order removes the need for a PQ
```

**Similar problems:** 21, 29, 30, 38.

---

## 30. Dijkstra's Algorithm (Priority Queue)

### Problem Understanding

Find shortest paths from one source in a graph with non-negative edge weights.

### How to Think About the Problem

At any moment:

```text
Which unsettled node currently has the smallest known distance?
```

The priority queue answers that.

Clue → Pattern:

```text
Positive weighted graph
        ↓
Dijkstra
        ↓
min-priority queue
```

### Intuition

```text
BFS:
smallest number of edges

Dijkstra:
smallest total weighted distance
```

### Core Observation

When the minimum-distance node is removed from the priority queue, its distance is final.

This is the key greedy invariant.

### Optimal Approach

```java
class Solution {
    static int[] dijkstra(
            int n,
            int[][] edges,
            int source) {

        List<List<int[]>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];
            int w = edge[2];

            graph.get(u).add(new int[]{v, w});
            graph.get(v).add(new int[]{u, w});
        }

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                Comparator.comparingInt(a -> a[0])
        );

        dist[source] = 0;
        pq.offer(new int[]{0, source});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();

            int currentDist = current[0];
            int node = current[1];

            if (currentDist != dist[node]) {
                continue;
            }

            for (int[] edge : graph.get(node)) {
                int next = edge[0];
                int weight = edge[1];

                if (dist[next] > currentDist + weight) {
                    dist[next] = currentDist + weight;
                    pq.offer(new int[]{dist[next], next});
                }
            }
        }

        return dist;
    }
}
```

### Dry Run

Suppose:

```text
0 --1-- 1
|       |
4       2
|       |
2 --1-- 3
```

Start:

```text
dist = [0, INF, INF, INF]
PQ = [(0,0)]
```

Process `0`:

```text
dist[1] = 1
dist[2] = 4
```

Next smallest:

```text
1
```

Relax `3`:

```text
dist[3] = 3
```

### Why Does It Work?

With non-negative weights, once the smallest tentative distance is selected, any alternative route reaching that node through an unsettled vertex cannot be cheaper. Therefore the selected distance is final.

### Why Are Duplicate PQ Entries Okay?

Java's `PriorityQueue` does not support decrease-key.

So when:

```text
dist[v]
```

improves, simply insert a new pair.

Later, stale pairs are ignored by:

```java
if (currentDist != dist[node]) {
    continue;
}
```

### Complexity

Each edge can create a constant number of heap entries.

Time: **`O((V + E) log V)`**, commonly written **`O(E log V)`** for connected sparse graphs.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Shortest path" + non-negative weights
Pattern:       Dijkstra + min-heap
Mental model:  Always finalize the currently cheapest unsettled node
```

**Similar problems:** 33, 35, 36, 50.

---

## 31. Dijkstra's Algorithm (Set Version)

### Problem Understanding

Use an ordered set instead of a priority queue so that old `(distance,node)` pairs can be removed when a shorter distance is found.

### How to Think About the Problem

A priority queue gives us:

```text
minimum
```

but cannot efficiently delete an arbitrary stale entry.

A `TreeSet` can do both:

```text
get minimum
delete exact old pair
```

Clue → Pattern:

```text
Dijkstra + explicit decrease-key behavior
        ↓
TreeSet
```

### Intuition

```text
PQ:
push new pair
leave old pair
ignore stale pair later

TreeSet:
remove old pair
insert new pair
```

### Optimal Approach

```java
class Solution {
    record State(int distance, int node) {}

    static int[] dijkstra(
            int n,
            int[][] edges,
            int source) {

        List<List<int[]>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            graph.get(edge[0]).add(
                    new int[]{edge[1], edge[2]}
            );
        }

        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);

        TreeSet<State> set = new TreeSet<>(
                Comparator.comparingInt(State::distance)
                        .thenComparingInt(State::node)
        );

        dist[source] = 0;
        set.add(new State(0, source));

        while (!set.isEmpty()) {
            State current = set.pollFirst();

            int d = current.distance();
            int u = current.node();

            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                int w = edge[1];

                if (dist[v] > d + w) {
                    if (dist[v] != Integer.MAX_VALUE) {
                        set.remove(new State(dist[v], v));
                    }

                    dist[v] = d + w;
                    set.add(new State(dist[v], v));
                }
            }
        }

        return dist;
    }
}
```

### Comparison

| | `PriorityQueue` | `TreeSet` |
|---|---|---|
| Get minimum | `O(log V)` | `O(log V)` |
| Remove stale pair | Not direct | `O(log V)` |
| Typical implementation | Simpler | More bookkeeping |
| Common Java choice | Yes | Useful when explicit deletion matters |

### Why Does It Work?

At every step the ordered set exposes the smallest current distance. Removing the old pair when a node improves keeps exactly one current pair for each node.

### Complexity

Each insertion/deletion costs `O(log V)`.

Overall: **`O(E log V)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  Dijkstra + need to remove old candidate
Pattern:       TreeSet ordered states
Mental model:  Maintain one current distance per vertex
```

**Interview tip:** Know the priority-queue implementation first. The set version is mainly useful for understanding decrease-key behavior.

---

## 32. Shortest Path in a Binary Maze

### Problem Understanding

LeetCode 1091 asks for the shortest path in a binary matrix.

Important details:

- `0` = open
- `1` = blocked
- movement is in **8 directions**
- path length counts the starting cell

Example:

```text
0 1
1 0
```

The diagonal move gives answer:

```text
2
```

### How to Think About the Problem

Every allowed move has cost `1`.

Clue → Pattern:

```text
Uniform movement cost
        ↓
BFS
```

Dijkstra would solve it, but adds unnecessary machinery.

### Intuition

```text
Brute:
try all paths

Observation:
every move costs 1
        ↓
BFS finds shortest number of moves

Since path length includes source:
answer = BFS distance + 1
```

### Optimal Approach

```java
class Solution {
    public int shortestPathBinaryMatrix(int[][] grid) {
        int n = grid.length;

        if (grid[0][0] != 0 || grid[n - 1][n - 1] != 0) {
            return -1;
        }

        if (n == 1) {
            return 1;
        }

        int[][] dirs = {
            {-1, -1}, {-1, 0}, {-1, 1},
            {0, -1},           {0, 1},
            {1, -1},  {1, 0},  {1, 1}
        };

        Queue<int[]> queue = new ArrayDeque<>();
        queue.offer(new int[]{0, 0, 1});

        grid[0][0] = 1;

        while (!queue.isEmpty()) {
            int[] current = queue.poll();

            int r = current[0];
            int c = current[1];
            int distance = current[2];

            for (int[] dir : dirs) {
                int nr = r + dir[0];
                int nc = c + dir[1];

                if (nr < 0 || nr >= n ||
                    nc < 0 || nc >= n ||
                    grid[nr][nc] != 0) {
                    continue;
                }

                if (nr == n - 1 && nc == n - 1) {
                    return distance + 1;
                }

                grid[nr][nc] = 1;
                queue.offer(new int[]{nr, nc, distance + 1});
            }
        }

        return -1;
    }
}
```

### Dry Run

```text
0 1
1 0
```

Start:

```text
distance = 1
```

Diagonal neighbor:

```text
distance = 2
```

Answer = `2`.

### Why Does It Work?

Every move costs one. BFS therefore reaches the destination using the minimum number of moves. Because the source itself counts as one cell, the path length begins at `1`.

### Complexity

There are `N²` cells and at most 8 neighbors each.

Time: **`O(N²)`**.

Space: **`O(N²)`**.

### Pattern to Remember

```text
Problem clue:  "Shortest path through cells" + uniform move cost
Pattern:       BFS
Mental model:  Grid cells are unweighted graph vertices
```

---

## 33. Path with Minimum Effort

### Problem Understanding

LeetCode 1631 asks for a path where the **maximum absolute height difference along the path** is minimized.

For a path with edge costs:

```text
4, 2, 7, 3
```

the path effort is:

```text
max(4,2,7,3) = 7
```

We want to minimize that maximum.

### How to Think About the Problem

This is not:

```text
sum of edge weights
```

It is:

```text
minimize maximum edge
```

Clue → Pattern:

```text
"Minimize the maximum"
        ↓
Dijkstra with minimax distance
```

There is also a binary-search-on-answer solution.

### Intuition

```text
Binary search:
Can I reach the destination if maximum allowed effort = X?
        ↓
BFS feasibility
        ↓
O(N² log range)

Dijkstra variant:
dist[cell] = minimum possible maximum edge
        ↓
O(N² log N)
```

### Optimal Approach

```java
class Solution {
    public int minimumEffortPath(int[][] heights) {
        int rows = heights.length;
        int cols = heights[0].length;

        int[][] effort = new int[rows][cols];

        for (int[] row : effort) {
            Arrays.fill(row, Integer.MAX_VALUE);
        }

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                Comparator.comparingInt(a -> a[0])
        );

        effort[0][0] = 0;
        pq.offer(new int[]{0, 0, 0});

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        while (!pq.isEmpty()) {
            int[] current = pq.poll();

            int currentEffort = current[0];
            int r = current[1];
            int c = current[2];

            if (currentEffort != effort[r][c]) {
                continue;
            }

            if (r == rows - 1 && c == cols - 1) {
                return currentEffort;
            }

            for (int[] dir : dirs) {
                int nr = r + dir[0];
                int nc = c + dir[1];

                if (nr < 0 || nr >= rows ||
                    nc < 0 || nc >= cols) {
                    continue;
                }

                int edgeEffort = Math.abs(
                        heights[nr][nc] - heights[r][c]
                );

                int newEffort = Math.max(
                        currentEffort,
                        edgeEffort
                );

                if (newEffort < effort[nr][nc]) {
                    effort[nr][nc] = newEffort;
                    pq.offer(new int[]{newEffort, nr, nc});
                }
            }
        }

        return -1;
    }
}
```

### Dry Run

Suppose path A has edge differences:

```text
2, 5, 4
```

effort:

```text
5
```

Path B:

```text
3, 3, 3
```

effort:

```text
3
```

Choose B even though its sum is also different. We care about the maximum edge.

### Why Does It Work?

For every cell, `effort[r][c]` stores the smallest possible maximum edge seen on a path from the source. Extending a path with edge cost `w` changes the path effort to `max(currentEffort, w)`. Dijkstra's greedy rule then finalizes the globally smallest effort.

### Complexity

There are `R*C` states and at most four edges per state.

Time: **`O(R*C log(R*C))`**.

Space: **`O(R*C)`**.

### Pattern to Remember

```text
Problem clue:  "Minimize the maximum edge/path value"
Pattern:       Minimax Dijkstra or binary search + BFS
Mental model:  Path cost = max(edge costs), not sum
```

**Similar problems:** 33, 50.

---

## 34. Cheapest Flights Within K Stops

### Problem Understanding

LeetCode 787 asks for the cheapest flight from `src` to `dst` using at most `k` stops.

At most `k` stops means at most:

```text
k + 1 edges
```

### How to Think About the Problem

Ordinary Dijkstra minimizes cost without a strict edge-count limit.

Here we have an additional constraint:

```text
maximum number of edges
```

That makes a layered relaxation approach natural.

Clue → Pattern:

```text
Shortest cost + at most K edges
        ↓
Bellman-Ford for K+1 rounds
```

### Intuition

```text
Round 1: cheapest paths using at most 1 edge
Round 2: cheapest paths using at most 2 edges
...
Round K+1: cheapest paths using at most K+1 edges
```

### The Important Bug

Do not update `dist` in-place during one round.

Otherwise:

```text
u -> v -> w
```

could use both edges during the same pass, accidentally allowing too many stops.

Use:

```java
next = dist.clone();
```

### Optimal Approach

```java
class Solution {
    public int findCheapestPrice(
            int n,
            int[][] flights,
            int src,
            int dst,
            int k) {

        int INF = Integer.MAX_VALUE / 4;

        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;

        for (int edgesUsed = 1; edgesUsed <= k + 1; edgesUsed++) {
            int[] next = dist.clone();

            for (int[] flight : flights) {
                int from = flight[0];
                int to = flight[1];
                int cost = flight[2];

                if (dist[from] == INF) {
                    continue;
                }

                next[to] = Math.min(
                        next[to],
                        dist[from] + cost
                );
            }

            dist = next;
        }

        return dist[dst] == INF ? -1 : dist[dst];
    }
}
```

### Dry Run

For `k = 1`:

```text
maximum edges = 2
```

Run exactly two relaxation rounds.

Round 1:

```text
direct flights only
```

Round 2:

```text
paths using up to two edges
```

### Why Does It Work?

After round `i`, `dist[v]` contains the best cost achievable using at most `i` edges. Using a copy ensures each round only extends paths from the previous allowed edge count.

### Complexity

`k + 1` rounds, each scanning `E` flights.

Time: **`O(K * E)`**.

Space: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Shortest cost" + "at most K stops"
Pattern:       Bounded Bellman-Ford
Mental model:  One relaxation round = one more allowed edge
```

**Interview tip:** Explain the snapshot requirement. It is the common bug.

---

## 35. Network Delay Time

### Problem Understanding

LeetCode 743 asks how long it takes for a signal from a source `k` to reach every node.

The answer is the time at which the **last reachable node** receives the signal.

### How to Think About the Problem

First calculate shortest distance from one source to every node.

Then:

```text
answer = max(dist[i])
```

Clue → Pattern:

```text
Single source + positive weighted graph
        ↓
Dijkstra
        ↓
take maximum shortest distance
```

### Optimal Approach

```java
class Solution {
    public int networkDelayTime(
            int[][] times,
            int n,
            int k) {

        List<List<int[]>> graph = new ArrayList<>();

        for (int i = 0; i <= n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] time : times) {
            graph.get(time[0]).add(
                    new int[]{time[1], time[2]}
            );
        }

        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                Comparator.comparingInt(a -> a[0])
        );

        dist[k] = 0;
        pq.offer(new int[]{0, k});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();

            int d = current[0];
            int u = current[1];

            if (d != dist[u]) {
                continue;
            }

            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                int w = edge[1];

                if (dist[v] > d + w) {
                    dist[v] = d + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }

        int answer = 0;

        for (int i = 1; i <= n; i++) {
            if (dist[i] == Integer.MAX_VALUE) {
                return -1;
            }

            answer = Math.max(answer, dist[i]);
        }

        return answer;
    }
}
```

### Dry Run

Suppose shortest distances are:

```text
[0, 2, 5, 3]
```

The last node receives the signal at:

```text
max = 5
```

### Why Does It Work?

Dijkstra computes the earliest possible arrival time to each node. The network is fully reached only when the slowest reachable node receives the signal, so the answer is the maximum shortest-path distance.

### Complexity

Time: **`O(E log V)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Signal from one source reaches everyone"
Pattern:       Dijkstra + maximum distance
Mental model:  Find all shortest arrival times, then take the slowest
```

---

## 36. Number of Ways to Arrive at Destination

### Problem Understanding

LeetCode 1976 asks for the shortest travel time from `0` to `n-1` and the number of distinct shortest paths.

### How to Think About the Problem

Dijkstra already tells us:

```text
shortest distance
```

We add one more array:

```text
ways[v] = number of shortest paths to v
```

Clue → Pattern:

```text
Shortest path + count shortest ways
        ↓
Dijkstra + path counting
```

### Intuition

When relaxing:

```text
newDist < dist[v]
```

we found a strictly better route:

```text
ways[v] = ways[u]
```

When:

```text
newDist == dist[v]
```

we found another shortest route:

```text
ways[v] += ways[u]
```

### Optimal Approach

```java
class Solution {
    public int countPaths(int n, int[][] roads) {
        final long MOD = 1_000_000_007L;

        List<List<long[]>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] road : roads) {
            int u = road[0];
            int v = road[1];
            long w = road[2];

            graph.get(u).add(new long[]{v, w});
            graph.get(v).add(new long[]{u, w});
        }

        long[] dist = new long[n];
        Arrays.fill(dist, Long.MAX_VALUE / 4);

        long[] ways = new long[n];
        ways[0] = 1;
        dist[0] = 0;

        PriorityQueue<long[]> pq = new PriorityQueue<>(
                Comparator.comparingLong(a -> a[0])
        );

        pq.offer(new long[]{0, 0});

        while (!pq.isEmpty()) {
            long[] current = pq.poll();

            long d = current[0];
            int u = (int) current[1];

            if (d != dist[u]) {
                continue;
            }

            for (long[] edge : graph.get(u)) {
                int v = (int) edge[0];
                long w = edge[1];

                long newDist = d + w;

                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    ways[v] = ways[u];
                    pq.offer(new long[]{newDist, v});
                } else if (newDist == dist[v]) {
                    ways[v] = (ways[v] + ways[u]) % MOD;
                }
            }
        }

        return (int) ways[n - 1];
    }
}
```

### Dry Run

Suppose there are two equal shortest routes:

```text
0 -> 1 -> 3
0 -> 2 -> 3
```

When `3` is first reached:

```text
ways[3] = 1
```

When the second shortest route arrives:

```text
newDist == dist[3]
```

so:

```text
ways[3] = 2
```

### Why Does It Work?

Dijkstra processes vertices in nondecreasing shortest distance. Every shortest path to `v` ends through a predecessor `u` whose shortest distance is already known. Therefore shortest-path counts can be propagated along the same relaxations.

### Complexity

Time: **`O(E log V)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "How many shortest paths?"
Pattern:       Dijkstra + ways[]
Mental model:  better distance replaces count; equal distance adds count
```

---

## 37. Minimum Multiplications to Reach End

### Problem Understanding

Given numbers and a modulus `M = 100000`, each operation is:

```text
value = (value * number) % M
```

Find the minimum number of multiplications needed to reach `end`.

### How to Think About the Problem

The state is not the entire path.

The state is simply:

```text
current value modulo M
```

Each multiplication creates an unweighted graph edge.

Clue → Pattern:

```text
State space + each move costs 1
        ↓
BFS over values
```

### Intuition

```text
Nodes = 0..99999
Edge:
x -> (x * num) % 100000
```

Do not remember the entire multiplication sequence.

Two paths reaching the same value are equivalent for future decisions.

### Optimal Approach

```java
class Solution {
    static int minimumMultiplications(
            int[] arr,
            int start,
            int end) {

        final int MOD = 100000;

        int[] dist = new int[MOD];
        Arrays.fill(dist, -1);

        Queue<Integer> queue = new ArrayDeque<>();

        dist[start] = 0;
        queue.offer(start);

        while (!queue.isEmpty()) {
            int value = queue.poll();

            if (value == end) {
                return dist[value];
            }

            for (int number : arr) {
                int next = (value * number) % MOD;

                if (dist[next] != -1) {
                    continue;
                }

                dist[next] = dist[value] + 1;
                queue.offer(next);
            }
        }

        return -1;
    }
}
```

### Dry Run

Suppose:

```text
arr = [2]
start = 3
end = 12
```

BFS states:

```text
3
6
12
```

Answer:

```text
2
```

### Why Does It Work?

Every multiplication has equal cost `1`, so the state graph is unweighted. BFS therefore finds the minimum number of operations. Once a value is visited at its minimum distance, revisiting it later cannot improve anything.

### Complexity

There are at most `100000` states.

For each state we try `A` multipliers.

Time: **`O(M * A)`**, where `M = 100000`.

Space: **`O(M)`**.

### Pattern to Remember

```text
Problem clue:  "minimum operations" + finite state transformation
Pattern:       BFS on state space
Mental model:  Current value is the graph node
```

---

## 38. Bellman-Ford Algorithm

### Problem Understanding

Bellman-Ford computes single-source shortest paths and can detect reachable negative cycles.

It works with negative edge weights.

### How to Think About the Problem

Why `V-1` rounds?

A simple shortest path can contain at most:

```text
V - 1 edges
```

because repeating a vertex would create a cycle.

Clue → Pattern:

```text
Negative edges possible
        ↓
Bellman-Ford
        ↓
V-1 relaxation rounds
        ↓
one more improvement => negative cycle
```

### Intuition

```text
Round 1 -> shortest paths using <= 1 edge
Round 2 -> shortest paths using <= 2 edges
...
Round V-1 -> all simple shortest paths considered
Round V -> improvement means negative cycle
```

### Optimal Approach

```java
class Solution {
    record Edge(int from, int to, int weight) {}

    static long[] bellmanFord(
            int n,
            List<Edge> edges,
            int source) {

        final long INF = Long.MAX_VALUE / 4;

        long[] dist = new long[n];
        Arrays.fill(dist, INF);
        dist[source] = 0;

        for (int round = 1; round <= n - 1; round++) {
            boolean changed = false;

            for (Edge edge : edges) {
                if (dist[edge.from()] == INF) {
                    continue;
                }

                long candidate =
                        dist[edge.from()] + edge.weight();

                if (candidate < dist[edge.to()]) {
                    dist[edge.to()] = candidate;
                    changed = true;
                }
            }

            if (!changed) {
                break;
            }
        }

        for (Edge edge : edges) {
            if (dist[edge.from()] == INF) {
                continue;
            }

            if (dist[edge.to()] >
                    dist[edge.from()] + edge.weight()) {
                throw new IllegalArgumentException(
                        "Negative cycle reachable from source"
                );
            }
        }

        return dist;
    }
}
```

### Dry Run

Suppose:

```text
0 -> 1 weight 4
0 -> 2 weight 5
1 -> 2 weight -3
```

Round 1 can produce:

```text
dist[1] = 4
dist[2] = 1
```

No need for a negative cycle.

### Why Does It Work?

Every shortest simple path has at most `V-1` edges, so `V-1` complete relaxation rounds are enough. If a reachable distance can still be improved in round `V`, there must be a negative cycle reachable from the source.

### Important Caveat

For an undirected graph, a negative edge effectively creates:

```text
u -> v
v -> u
```

which forms a negative cycle of total weight `2w` when `w < 0`.

So the standard Bellman-Ford negative-cycle interpretation is most naturally stated for directed graphs.

### Complexity

Each round scans all `E` edges.

Time: **`O(VE)`**.

Space: **`O(V)`** besides the edge list.

### Pattern to Remember

```text
Problem clue:  "Negative weights" / "negative cycle"
Pattern:       Bellman-Ford
Mental model:  Repeatedly propagate paths by number of edges
```

---

## 39. Floyd-Warshall Algorithm

### Problem Understanding

Floyd-Warshall computes shortest paths between **every pair** of vertices.

### How to Think About the Problem

Define:

```text
dist[i][j]
```

as the best known distance from `i` to `j`.

The key question is:

> If `k` is allowed as an intermediate vertex, can going through `k` improve `i -> j`?

Transition:

```text
dist[i][j]
=
min(
    dist[i][j],
    dist[i][k] + dist[k][j]
)
```

Clue → Pattern:

```text
All-pairs shortest paths
        ↓
Floyd-Warshall
```

### Intuition

Think of a 3D DP:

```text
dp[k][i][j]
```

then notice only the previous `k` layer is needed.

That reduces memory to one 2D matrix.

### Optimal Approach

```java
class Solution {
    static long[][] floydWarshall(long[][] dist) {
        int n = dist.length;
        long INF = Long.MAX_VALUE / 4;

        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                if (dist[i][k] >= INF) {
                    continue;
                }

                for (int j = 0; j < n; j++) {
                    if (dist[k][j] >= INF) {
                        continue;
                    }

                    dist[i][j] = Math.min(
                            dist[i][j],
                            dist[i][k] + dist[k][j]
                    );
                }
            }
        }

        return dist;
    }
}
```

### Dry Run

Suppose:

```text
0 -> 1 = 5
1 -> 2 = 3
0 -> 2 = 10
```

When `k = 1`:

```text
dist[0][2]
= min(10, 5 + 3)
= 8
```

### Why Must `k` Be the Outer Loop?

At iteration `k`, we want all distances using only:

```text
{0,1,...,k}
```

as intermediate vertices.

If `i` or `j` were outermost, that DP interpretation would be broken.

### Negative Cycles

After the algorithm:

```text
dist[i][i] < 0
```

means vertex `i` lies on or can participate in a negative cycle in the relevant reachability structure.

### Complexity

Three nested loops over `V`:

Time: **`O(V³)`**.

Distance matrix: **`O(V²)`**.

### Pattern to Remember

```text
Problem clue:  "All pairs shortest path"
Pattern:       Floyd-Warshall
Mental model:  Allow intermediate vertices one by one
```

---

## 40. Find the City with the Smallest Number of Neighbors at a Threshold Distance

### Problem Understanding

LeetCode 1334 asks for each city:

```text
How many other cities are reachable within thresholdDistance?
```

Return the city with the smallest count.

If counts tie:

```text
choose the largest city index
```

### How to Think About the Problem

Every city needs distances to every other city.

Clue → Pattern:

```text
Every source to every destination
        ↓
All-pairs shortest path
        ↓
Floyd-Warshall
```

### Intuition

```text
Run Dijkstra from every node
        ↓
O(V * E log V)

Or:
Floyd-Warshall
        ↓
O(V³)
```

For the problem's bounded `n`, Floyd-Warshall is direct.

### Optimal Approach

```java
class Solution {
    public int findTheCity(
            int n,
            int[][] edges,
            int distanceThreshold) {

        final int INF = 1_000_000_000;

        int[][] dist = new int[n][n];

        for (int i = 0; i < n; i++) {
            Arrays.fill(dist[i], INF);
            dist[i][i] = 0;
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];
            int w = edge[2];

            dist[u][v] = Math.min(dist[u][v], w);
            dist[v][u] = Math.min(dist[v][u], w);
        }

        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (dist[i][k] == INF ||
                        dist[k][j] == INF) {
                        continue;
                    }

                    dist[i][j] = Math.min(
                            dist[i][j],
                            dist[i][k] + dist[k][j]
                    );
                }
            }
        }

        int answer = -1;
        int bestCount = Integer.MAX_VALUE;

        for (int city = 0; city < n; city++) {
            int count = 0;

            for (int other = 0; other < n; other++) {
                if (city != other &&
                    dist[city][other] <= distanceThreshold) {
                    count++;
                }
            }

            if (count <= bestCount) {
                bestCount = count;
                answer = city;
            }
        }

        return answer;
    }
}
```

### Dry Run

Suppose:

```text
city 0 -> 2 reachable
city 1 -> 4 reachable
city 2 -> 2 reachable
```

The smallest count is `2`.

If several cities have `2`, update on:

```java
count <= bestCount
```

so the later, larger index wins.

### Why Does It Work?

Floyd-Warshall gives the exact shortest distance between every pair. We can therefore count threshold-reachable neighbors for each city and apply the specified tie-break rule.

### Complexity

Floyd-Warshall: **`O(V³)`**.

Counting neighbors: **`O(V²)`**.

Overall: **`O(V³)`**.

Space: **`O(V²)`**.

### Pattern to Remember

```text
Problem clue:  "For every city, know distance to every other city"
Pattern:       All-pairs shortest path
Mental model:  Floyd-Warshall gives the whole distance matrix
```

---

# PART E — MST / Disjoint Set and Problems

## 41. MST Theory

### Problem Understanding

A **spanning tree** of a connected undirected graph:

- includes every vertex
- has no cycle
- contains exactly `V - 1` edges

A **minimum spanning tree** has the smallest possible total edge weight among all spanning trees.

Example:

```text
      2
  A ------ B
  |        |
4 |        | 1
  |        |
  C ------ D
      3
```

Possible spanning trees have different total weights.

### How to Think About the Problem

The key question is not:

> "What is the shortest path?"

It is:

> "How do I connect every vertex as cheaply as possible?"

Shortest path and MST solve different problems.

Clue → Pattern:

```text
Connect all vertices
        ↓
No cycle
        ↓
Minimum total edge weight
        ↓
MST
```

### Intuition

```text
All possible spanning trees
        ↓
Choose the minimum-weight one

Brute force:
enumerate subsets of edges

Observation:
cut property lets us safely choose certain minimum edges
        ↓
Prim / Kruskal
```

### Cut Property

Take any cut dividing vertices into two groups.

Among edges crossing that cut, a minimum-weight edge is safe for an MST.

This is the reason greedy algorithms work.

### Operational Code

A small Kruskal-style skeleton shows how the theory turns into a solution:

```java
class Solution {
    record Edge(int u, int v, int weight) {}

    static List<Edge> sortedEdges(List<Edge> edges) {
        List<Edge> result = new ArrayList<>(edges);
        result.sort(Comparator.comparingInt(Edge::weight));
        return result;
    }
}
```

### Complexity

Sorting edges costs **`O(E log E)`**.

The MST itself can then be built greedily.

### Pattern to Remember

```text
Problem clue:  "Connect every vertex with minimum total cost"
Pattern:       MST
Mental model:  Minimum-cost cycle-free connectivity
```

**Similar problems:** 42, 44, 50.

---

## 42. Prim's Algorithm

### Problem Understanding

Prim grows one MST starting from any vertex.

At every step:

> Choose the cheapest edge that connects the current tree to an unvisited vertex.

### How to Think About the Problem

This looks similar to Dijkstra.

But ask:

```text
What are we minimizing?
```

Dijkstra minimizes:

```text
distance from source
```

Prim minimizes:

```text
edge needed to expand the MST
```

Clue → Pattern:

```text
MST growing from a visited set
        ↓
Priority queue of boundary edges
        ↓
Prim
```

### Intuition

```text
Visited set = current MST

PQ contains edges leaving the visited set

Take cheapest boundary edge
        ↓
add new vertex
        ↓
add its outgoing edges
```

### Optimal Approach

```java
class Solution {
    static int primMST(
            int n,
            List<List<int[]>> graph) {

        boolean[] visited = new boolean[n];

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                Comparator.comparingInt(a -> a[0])
        );

        pq.offer(new int[]{0, 0});

        int total = 0;
        int used = 0;

        while (!pq.isEmpty() && used < n) {
            int[] current = pq.poll();

            int weight = current[0];
            int node = current[1];

            if (visited[node]) {
                continue;
            }

            visited[node] = true;
            used++;
            total += weight;

            for (int[] edge : graph.get(node)) {
                int next = edge[0];
                int nextWeight = edge[1];

                if (!visited[next]) {
                    pq.offer(new int[]{nextWeight, next});
                }
            }
        }

        return used == n ? total : -1;
    }
}
```

### Dry Run

Start at `0`.

Boundary edges:

```text
0-1 weight 2
0-2 weight 5
0-3 weight 4
```

Take `2`.

Now add edges from the newly visited node.

Repeat until every vertex is included.

### Prim vs Dijkstra

| Prim | Dijkstra |
|---|---|
| Chooses cheapest boundary edge | Chooses smallest source distance |
| Builds MST | Builds shortest-path tree |
| Edge weight is added to answer | Full distance becomes state |
| No source-distance meaning | Source is fundamental |

### Why Does It Work?

At every step, the minimum edge crossing from the current tree to the unvisited side is safe by the cut property. Repeating this until all vertices are included produces an MST.

### Complexity

Each useful heap operation costs `O(log E)` and there are `O(E)` candidate edges.

Typical bound: **`O(E log V)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Minimum spanning tree"
Pattern:       Prim
Mental model:  Cheapest edge leaving the current tree
```

---

## 43. Disjoint Set (Union by Rank / by Size, Path Compression)

### Problem Understanding

DSU maintains dynamic connected components.

### How to Think About the Problem

We need two operations:

```text
find(x)
union(a,b)
```

Naively, trees can become long:

```text
0 -> 1 -> 2 -> 3 -> 4 -> 5
```

Then `find(0)` becomes expensive.

Path compression flattens this structure.

### Intuition

```text
Naïve:
follow parent pointers

        ↓

Path compression:
make every visited node point directly to root
```

### Optimal Approach

```java
class DSU {
    private final int[] parent;
    private final int[] size;
    private final int[] rank;

    DSU(int n) {
        parent = new int[n];
        size = new int[n];
        rank = new int[n];

        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }

    int find(int x) {
        if (parent[x] == x) {
            return x;
        }

        return parent[x] = find(parent[x]);
    }

    void unionBySize(int a, int b) {
        a = find(a);
        b = find(b);

        if (a == b) {
            return;
        }

        if (size[a] < size[b]) {
            int temp = a;
            a = b;
            b = temp;
        }

        parent[b] = a;
        size[a] += size[b];
    }

    void unionByRank(int a, int b) {
        a = find(a);
        b = find(b);

        if (a == b) {
            return;
        }

        if (rank[a] < rank[b]) {
            parent[a] = b;
        } else if (rank[a] > rank[b]) {
            parent[b] = a;
        } else {
            parent[b] = a;
            rank[a]++;
        }
    }
}
```

### Dry Run

Initially:

```text
parent = [0,1,2,3]
```

`union(0,1)`:

```text
1 -> 0
```

`union(1,2)`:

```text
find(1) = 0
2 -> 0
```

Now:

```text
1 -> 0
2 -> 0
```

### Why Does It Work?

Union by size/rank keeps component trees shallow. Path compression flattens paths during `find`. Together, they make each operation amortized `O(alpha(V))`, where `alpha` grows extremely slowly.

### Complexity

Without balancing, worst-case `find` can become **`O(V)`**.

With path compression plus union by size/rank:

```text
Amortized: O(alpha(V))
```

### Pattern to Remember

```text
Problem clue:  "Merge components" / "are these connected?"
Pattern:       DSU
Mental model:  Every component has one representative root
```

---

## 44. Find the MST Weight

### Problem Understanding

Given a connected weighted undirected graph, return the total weight of its MST.

### How to Think About the Problem

Problem 41 defined the target.

Problem 42 gave Prim.

So this is simply:

```text
Build MST
        ↓
sum selected edge weights
```

### Intuition

```text
Brute:
try different spanning trees

Observation:
Prim always chooses a safe cheapest boundary edge

Optimal:
Prim
```

### Optimal Approach

```java
class Solution {
    static int mstWeight(
            int n,
            int[][] edges) {

        List<List<int[]>> graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];
            int w = edge[2];

            graph.get(u).add(new int[]{v, w});
            graph.get(v).add(new int[]{u, w});
        }

        boolean[] visited = new boolean[n];

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                Comparator.comparingInt(a -> a[0])
        );

        pq.offer(new int[]{0, 0});

        int total = 0;
        int count = 0;

        while (!pq.isEmpty()) {
            int[] current = pq.poll();

            int weight = current[0];
            int node = current[1];

            if (visited[node]) {
                continue;
            }

            visited[node] = true;
            count++;
            total += weight;

            for (int[] edge : graph.get(node)) {
                if (!visited[edge[0]]) {
                    pq.offer(new int[]{
                            edge[1],
                            edge[0]
                    });
                }
            }
        }

        return count == n ? total : -1;
    }
}
```

### Dry Run

Suppose selected MST edges are:

```text
1
2
4
```

Total:

```text
7
```

### Why Does It Work?

Prim selects only safe MST edges and eventually includes every vertex. The accumulated weights therefore equal the total weight of a minimum spanning tree.

### Complexity

Graph construction: `O(V + E)`.

Prim: **`O(E log V)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Return MST cost"
Pattern:       Prim/Kruskal
Mental model:  Sum only edges that actually enter the tree
```

---

## 45. Number of Operations to Make Network Connected

### Problem Understanding

LeetCode 1319 asks for the minimum operations needed to connect all `n` computers.

One operation moves a cable.

The critical observation:

To connect `n` nodes, we need at least:

```text
n - 1
```

cables.

### How to Think About the Problem

Suppose the graph has `C` connected components.

We need:

```text
C - 1
```

extra connections.

But first we need enough total cables.

Clue → Pattern:

```text
Connect network
        ↓
Connected components + DSU
```

### Intuition

```text
If edges < n-1
        ↓
impossible

Otherwise:
components = C
answer = C-1
```

### Optimal Approach

```java
class Solution {
    static int makeConnected(
            int n,
            int[][] connections) {

        if (connections.length < n - 1) {
            return -1;
        }

        DSU dsu = new DSU(n);

        int components = n;

        for (int[] edge : connections) {
            if (dsu.find(edge[0]) != dsu.find(edge[1])) {
                dsu.unionBySize(edge[0], edge[1]);
                components--;
            }
        }

        return components - 1;
    }

    static class DSU {
        int[] parent;
        int[] size;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];

            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        int find(int x) {
            if (parent[x] == x) {
                return x;
            }

            return parent[x] = find(parent[x]);
        }

        void unionBySize(int a, int b) {
            a = find(a);
            b = find(b);

            if (a == b) {
                return;
            }

            if (size[a] < size[b]) {
                int temp = a;
                a = b;
                b = temp;
            }

            parent[b] = a;
            size[a] += size[b];
        }
    }
}
```

### Dry Run

```text
n = 4

components:
{0,1}
{2}
{3}
```

`C = 3`.

Need:

```text
C - 1 = 2
```

operations.

### Why Does It Work?

A connected graph on `n` vertices needs at least `n-1` edges. Once that condition holds, every extra cable inside a component can be repurposed, and connecting `C` components requires exactly `C-1` connections.

### Complexity

DSU processes every edge almost constantly.

Time: **`O(E alpha(V))`**.

Space: **`O(V)`**.

### Pattern to Remember

```text
Problem clue:  "Make all nodes connected"
Pattern:       DSU + components
Mental model:  answer = components - 1 after checking edge count
```

---

## 46. Most Stones Removed with Same Row or Column

### Problem Understanding

LeetCode 947 allows removing a stone if another remaining stone shares its row or column.

The key is to turn rows and columns into graph nodes.

Example:

```text
stones:
(0,0)
(0,1)
(1,0)
```

All belong to one connected component and two stones can be removed.

### How to Think About the Problem

Create bipartite nodes:

```text
row node
   |
stone
   |
column node
```

Each stone connects:

```text
row -> column
```

Clue → Pattern:

```text
Same row/column connectivity
        ↓
DSU on row + column nodes
```

### Intuition

If a connected component has:

```text
S stones
```

we can leave one stone and remove:

```text
S - 1
```

So:

```text
answer = total stones - number of components
```

### Optimal Approach

```java
class Solution {
    public int removeStones(int[][] stones) {
        int OFFSET = 10_001;
        int MAX = 20_002;

        DSU dsu = new DSU(MAX);
        Set<Integer> used = new HashSet<>();

        for (int[] stone : stones) {
            int row = stone[0];
            int col = stone[1] + OFFSET;

            dsu.union(row, col);

            used.add(row);
            used.add(col);
        }

        Set<Integer> roots = new HashSet<>();

        for (int node : used) {
            roots.add(dsu.find(node));
        }

        return stones.length - roots.size();
    }

    static class DSU {
        int[] parent;
        int[] size;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];

            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        int find(int x) {
            if (parent[x] == x) {
                return x;
            }

            return parent[x] = find(parent[x]);
        }

        void union(int a, int b) {
            a = find(a);
            b = find(b);

            if (a == b) {
                return;
            }

            if (size[a] < size[b]) {
                int temp = a;
                a = b;
                b = temp;
            }

            parent[b] = a;
            size[a] += size[b];
        }
    }
}
```

### Dry Run

Three stones:

```text
(0,0)
(0,1)
(1,0)
```

All connect through shared row/column relationships.

Components = `1`.

Answer:

```text
3 - 1 = 2
```

### Why Does It Work?

Within one connected component, every stone is linked through row/column relationships, so all but one can eventually be removed while maintaining a removable connection.

### Complexity

Let `S` be the number of stones.

Each stone causes one union and a constant number of finds.

Time: **`O(S alpha(V))`**.

Space: **`O(V)`**, where `V` is the row/column node range.

### Pattern to Remember

```text
Problem clue:  "Same row or same column"
Pattern:       DSU with row/column sentinels
Mental model:  Shared attributes become graph connectivity
```

---

## 47. Accounts Merge

### Problem Understanding

LeetCode 721 gives accounts:

```text
["John", "a@mail", "b@mail"]
["John", "b@mail", "c@mail"]
["Mary", "x@mail"]
```

The first two accounts belong to the same person because they share:

```text
b@mail
```

Merge their emails and return sorted email lists.

### How to Think About the Problem

Emails are the real identifiers.

Accounts are only containers.

Clue → Pattern:

```text
Shared email
        ↓
same component
        ↓
DSU
```

### Intuition

Map each email to the first account where it appeared.

When another account contains the email:

```text
union(accountIndex, previousAccountIndex)
```

### Optimal Approach

```java
class Solution {
    public List<List<String>> accountsMerge(
            List<List<String>> accounts) {

        int n = accounts.size();
        DSU dsu = new DSU(n);

        Map<String, Integer> emailOwner = new HashMap<>();

        for (int i = 0; i < n; i++) {
            for (int j = 1; j < accounts.get(i).size(); j++) {
                String email = accounts.get(i).get(j);

                Integer owner = emailOwner.putIfAbsent(email, i);

                if (owner != null) {
                    dsu.union(i, owner);
                }
            }
        }

        Map<Integer, List<String>> grouped = new HashMap<>();

        for (Map.Entry<String, Integer> entry : emailOwner.entrySet()) {
            String email = entry.getKey();
            int root = dsu.find(entry.getValue());

            grouped
                    .computeIfAbsent(root, key -> new ArrayList<>())
                    .add(email);
        }

        List<List<String>> answer = new ArrayList<>();

        for (Map.Entry<Integer, List<String>> entry : grouped.entrySet()) {
            List<String> emails = entry.getValue();
            Collections.sort(emails);

            int root = entry.getKey();
            List<String> merged = new ArrayList<>();

            merged.add(accounts.get(root).get(0));
            merged.addAll(emails);

            answer.add(merged);
        }

        return answer;
    }

    static class DSU {
        int[] parent;
        int[] size;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];

            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        int find(int x) {
            if (parent[x] == x) {
                return x;
            }

            return parent[x] = find(parent[x]);
        }

        void union(int a, int b) {
            a = find(a);
            b = find(b);

            if (a == b) {
                return;
            }

            if (size[a] < size[b]) {
                int temp = a;
                a = b;
                b = temp;
            }

            parent[b] = a;
            size[a] += size[b];
        }
    }
}
```

### Dry Run

```text
Account 0: a,b
Account 1: b,c
```

Shared `b` gives:

```text
union(0,1)
```

Root component contains:

```text
a,b,c
```

Sort them.

### Why Does It Work?

Two accounts must merge exactly when they share an email, and such relationships can chain across many accounts. DSU captures this transitive connectivity.

### Complexity

Let `E` be the total number of email entries and `K` the number of emails in the merged output.

DSU work: approximately **`O(E alpha(N))`**.

Sorting emails: **`O(K log K)`** overall.

### Pattern to Remember

```text
Problem clue:  "Merge records sharing an identifier"
Pattern:       DSU
Mental model:  Shared identifier = same component
```

---

## 48. Number of Islands II

### Problem Understanding

LeetCode 305 starts with an all-water grid.

Land cells are added one at a time.

After every addition, return the number of islands.

Example:

```text
add (0,0) -> 1 island
add (0,1) -> 1 island
add (1,2) -> 2 islands
add (2,1) -> 3 islands
```

### How to Think About the Problem

The grid changes dynamically.

Re-running DFS over the entire grid after every addition is wasteful.

Clue → Pattern:

```text
Online additions + connectivity
        ↓
Incremental DSU
```

### Intuition

When a new land cell appears:

```text
new island count += 1
```

Then inspect its four neighbors.

For every neighboring land cell:

```text
if they are in different components:
    union them
    island count--
```

### Optimal Approach

```java
class Solution {
    public List<Integer> numIslands2(
            int rows,
            int cols,
            int[][] positions) {

        DSU dsu = new DSU(rows * cols);
        boolean[] land = new boolean[rows * cols];

        int islands = 0;
        List<Integer> answer = new ArrayList<>();

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        for (int[] position : positions) {
            int r = position[0];
            int c = position[1];
            int id = r * cols + c;

            if (land[id]) {
                answer.add(islands);
                continue;
            }

            land[id] = true;
            islands++;

            for (int[] dir : dirs) {
                int nr = r + dir[0];
                int nc = c + dir[1];

                if (nr < 0 || nr >= rows ||
                    nc < 0 || nc >= cols) {
                    continue;
                }

                int neighbor = nr * cols + nc;

                if (!land[neighbor]) {
                    continue;
                }

                if (dsu.union(id, neighbor)) {
                    islands--;
                }
            }

            answer.add(islands);
        }

        return answer;
    }

    static class DSU {
        int[] parent;
        int[] size;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];

            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        int find(int x) {
            if (parent[x] == x) {
                return x;
            }

            return parent[x] = find(parent[x]);
        }

        boolean union(int a, int b) {
            a = find(a);
            b = find(b);

            if (a == b) {
                return false;
            }

            if (size[a] < size[b]) {
                int temp = a;
                a = b;
                b = temp;
            }

            parent[b] = a;
            size[a] += size[b];

            return true;
        }
    }
}
```

### Dry Run

When a new cell is added:

```text
islands++
```

Then a successful union means:

```text
two islands became one
```

so:

```text
islands--
```

### Why Does It Work?

Only the newly added land can change connectivity. Its only possible new connections are to its four neighbors. DSU maintains those component merges without recomputing old regions.

### Complexity

For `K` updates:

Each update checks four neighbors.

Time: approximately **`O(K alpha(R*C))`**.

Space: **`O(R*C)`**.

### Pattern to Remember

```text
Problem clue:  "Grid connectivity changes over time"
Pattern:       Incremental DSU
Mental model:  Add one node, union only its new neighbors
```

**Interview tip:** Duplicate additions must not increase the island count.

---

## 49. Making a Large Island

### Problem Understanding

LeetCode 827 allows changing at most one `0` into `1`.

Return the maximum possible island size.

Example:

```text
1 0
0 1
```

Flipping either zero creates an island of size:

```text
3
```

### How to Think About the Problem

First identify all existing islands.

Then for every zero:

```text
size = 1 + sizes of distinct neighboring islands
```

The word **distinct** is critical.

Clue → Pattern:

```text
Grid components + merge at one position
        ↓
DSU component sizes
```

### Intuition

```text
Phase 1:
build all island components and sizes

Phase 2:
for every zero:
    collect unique neighboring roots
    sum their sizes
    + 1
```

### Optimal Approach

```java
class Solution {
    public int largestIsland(int[][] grid) {
        int n = grid.length;
        DSU dsu = new DSU(n * n);

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] != 1) {
                    continue;
                }

                int id = r * n + c;

                for (int[] dir : dirs) {
                    int nr = r + dir[0];
                    int nc = c + dir[1];

                    if (nr < 0 || nr >= n ||
                        nc < 0 || nc >= n ||
                        grid[nr][nc] != 1) {
                        continue;
                    }

                    dsu.union(id, nr * n + nc);
                }
            }
        }

        int answer = 0;

        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r][c] == 1) {
                    answer = Math.max(
                            answer,
                            dsu.size[dsu.find(r * n + c)]
                    );
                    continue;
                }

                Set<Integer> roots = new HashSet<>();
                int size = 1;

                for (int[] dir : dirs) {
                    int nr = r + dir[0];
                    int nc = c + dir[1];

                    if (nr < 0 || nr >= n ||
                        nc < 0 || nc >= n ||
                        grid[nr][nc] != 1) {
                        continue;
                    }

                    roots.add(dsu.find(nr * n + nc));
                }

                for (int root : roots) {
                    size += dsu.size[root];
                }

                answer = Math.max(answer, size);
            }
        }

        return answer;
    }

    static class DSU {
        int[] parent;
        int[] size;

        DSU(int n) {
            parent = new int[n];
            size = new int[n];

            for (int i = 0; i < n; i++) {
                parent[i] = i;
                size[i] = 1;
            }
        }

        int find(int x) {
            if (parent[x] == x) {
                return x;
            }

            return parent[x] = find(parent[x]);
        }

        void union(int a, int b) {
            a = find(a);
            b = find(b);

            if (a == b) {
                return;
            }

            if (size[a] < size[b]) {
                int temp = a;
                a = b;
                b = temp;
            }

            parent[b] = a;
            size[a] += size[b];
        }
    }
}
```

### Dry Run

Suppose:

```text
1 1
1 0
```

The zero touches the same island from three sides.

Without deduplication, we might count:

```text
island size 3
+ island size 3
+ island size 3
+ 1
```

which is obviously wrong.

`HashSet<Integer>` ensures the island root is counted once.

### Why Does It Work?

Every existing island has one DSU root and one stored size. Flipping one zero can connect only its distinct neighboring components. Adding those unique sizes plus the new cell gives the exact resulting island size.

### Complexity

Building components: **`O(N² alpha(N²))`**.

Testing every zero checks four neighbors and a small set.

Overall: **`O(N² alpha(N²))`**.

Space: **`O(N²)`**.

### Pattern to Remember

```text
Problem clue:  "Flip one cell to merge neighboring components"
Pattern:       DSU + component sizes
Mental model:  New cell = one + distinct neighboring component sizes
```

---

## 50. Swim in Rising Water

### Problem Understanding

LeetCode 778 asks for the earliest time at which one can travel from top-left to bottom-right.

A cell becomes traversable when:

```text
time >= grid[r][c]
```

For a path, the required time is therefore:

```text
maximum cell height on that path
```

We want to minimize that maximum.

### How to Think About the Problem

This is the same structure as Problem 33.

```text
Path cost = maximum value along the path
```

Clue → Pattern:

```text
Minimize the maximum
        ↓
Minimax Dijkstra
```

Binary search + BFS and DSU sorted activation are also valid alternatives.

### Intuition

```text
Path A maximum = 8
Path B maximum = 5

Choose B
```

The sum of heights does not matter.

### Optimal Approach

```java
class Solution {
    public int swimInWater(int[][] grid) {
        int n = grid.length;

        int[][] dist = new int[n][n];

        for (int[] row : dist) {
            Arrays.fill(row, Integer.MAX_VALUE);
        }

        PriorityQueue<int[]> pq = new PriorityQueue<>(
                Comparator.comparingInt(a -> a[0])
        );

        dist[0][0] = grid[0][0];
        pq.offer(new int[]{grid[0][0], 0, 0});

        int[][] dirs = {
            {-1, 0},
            {1, 0},
            {0, -1},
            {0, 1}
        };

        while (!pq.isEmpty()) {
            int[] current = pq.poll();

            int time = current[0];
            int r = current[1];
            int c = current[2];

            if (time != dist[r][c]) {
                continue;
            }

            if (r == n - 1 && c == n - 1) {
                return time;
            }

            for (int[] dir : dirs) {
                int nr = r + dir[0];
                int nc = c + dir[1];

                if (nr < 0 || nr >= n ||
                    nc < 0 || nc >= n) {
                    continue;
                }

                int newTime = Math.max(
                        time,
                        grid[nr][nc]
                );

                if (newTime < dist[nr][nc]) {
                    dist[nr][nc] = newTime;
                    pq.offer(new int[]{
                            newTime,
                            nr,
                            nc
                    });
                }
            }
        }

        return -1;
    }
}
```

### Dry Run

Path:

```text
0 -> 2 -> 5 -> 4
```

Requires:

```text
time = 5
```

because all cells on the path must be accessible by time `5`.

### Why Does It Work?

For each cell, `dist` stores the minimum possible maximum elevation along any path from the start to that cell. Extending a path changes its requirement to the maximum of the previous requirement and the new cell's height. Dijkstra finalizes the minimum such value.

### Complexity

There are `N²` cells and constant-degree edges.

Time: **`O(N² log(N²))`**, equivalent to `O(N² log N)` asymptotically.

Space: **`O(N²)`**.

### Pattern to Remember

```text
Problem clue:  "Earliest time" / "minimum possible maximum"
Pattern:       Minimax Dijkstra
Mental model:  Path cost = maximum threshold along path
```

**Similar problem:** 33.

---

# PART F — Other Algorithms

## 51. Bridges in a Graph (Tarjan's `tin[]` / `low[]`)

### Problem Understanding

A bridge is an edge whose removal increases the number of connected components.

Example:

```text
0 -- 1 -- 2
     |
     3
```

The edge:

```text
0 -- 1
```

is a bridge if no alternate path connects `0` to the rest.

### How to Think About the Problem

During DFS:

```text
tin[u] = when u was discovered
low[v] = earliest ancestor reachable from v's subtree
```

For DFS tree edge:

```text
u -> v
```

if:

```text
low[v] > tin[u]
```

then `v`'s subtree has no alternate route back to `u` or above.

Therefore:

```text
u-v is a bridge
```

Clue → Pattern:

```text
"What happens if I remove this edge?"
        ↓
Tarjan bridge test
        ↓
low[child] > tin[parent]
```

### Intuition

```text
DFS tree edge
        ↓
Can child's subtree reach an ancestor through a back edge?

YES:
    not a bridge

NO:
    bridge
```

### Optimal Approach

Using edge IDs makes the algorithm safe even with parallel edges.

```java
class Solution {
    static List<List<int[]>> graph;
    static int[] tin;
    static int[] low;
    static int timer;
    static List<List<Integer>> bridges;

    static List<List<Integer>> findBridges(
            int n,
            int[][] edges) {

        graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int id = 0; id < edges.length; id++) {
            int u = edges[id][0];
            int v = edges[id][1];

            graph.get(u).add(new int[]{v, id});
            graph.get(v).add(new int[]{u, id});
        }

        tin = new int[n];
        low = new int[n];
        Arrays.fill(tin, -1);

        timer = 0;
        bridges = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            if (tin[i] == -1) {
                dfs(i, -1);
            }
        }

        return bridges;
    }

    static void dfs(int node, int parentEdge) {
        tin[node] = low[node] = timer++;

        for (int[] edge : graph.get(node)) {
            int next = edge[0];
            int edgeId = edge[1];

            if (edgeId == parentEdge) {
                continue;
            }

            if (tin[next] == -1) {
                dfs(next, edgeId);

                low[node] = Math.min(
                        low[node],
                        low[next]
                );

                if (low[next] > tin[node]) {
                    bridges.add(
                            List.of(node, next)
                    );
                }
            } else {
                low[node] = Math.min(
                        low[node],
                        tin[next]
                );
            }
        }
    }
}
```

### Dry Run

Suppose:

```text
0 -- 1 -- 2
     \  /
       3
```

For edge `1-2`, node `2` can reach an ancestor through the cycle.

Therefore:

```text
low[2] <= tin[1]
```

so it is not a bridge.

For edge `0-1`:

```text
low[1] > tin[0]
```

there is no alternate route to `0`.

Therefore bridge.

### Why Does It Work?

If `low[child] > tin[parent]`, the child's DFS subtree has no back edge reaching the parent or an ancestor. Removing the tree edge therefore cuts that entire subtree away.

### Complexity

Each vertex and edge is processed once.

Time: **`O(V + E)`**.

Arrays + adjacency list + recursion: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Critical edge / removing edge disconnects graph"
Pattern:       Tarjan bridge algorithm
Test:          low[child] > tin[node]
```

**Interview tip:** The parent **edge**, not just parent vertex, should be skipped when parallel edges are possible.

---

## 52. Articulation Point

### Problem Understanding

An articulation point is a vertex whose removal increases the number of connected components.

There are two Tarjan rules.

For a non-root DFS vertex `u`:

```text
low[child] >= tin[u]
```

means `u` is an articulation point.

For a DFS root:

```text
number of DFS children >= 2
```

means the root is an articulation point.

### How to Think About the Problem

Compare it with bridges.

Bridge:

```text
low[child] > tin[u]
```

Articulation:

```text
low[child] >= tin[u]
```

That equality is important.

### Intuition

```text
Can child's subtree reach above u without using u?

If no:
    removing u disconnects child subtree
```

### Optimal Approach

```java
class Solution {
    static List<List<int[]>> graph;
    static int[] tin;
    static int[] low;
    static boolean[] articulation;
    static int timer;

    static List<Integer> articulationPoints(
            int n,
            int[][] edges) {

        graph = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
        }

        for (int id = 0; id < edges.length; id++) {
            int u = edges[id][0];
            int v = edges[id][1];

            graph.get(u).add(new int[]{v, id});
            graph.get(v).add(new int[]{u, id});
        }

        tin = new int[n];
        low = new int[n];
        articulation = new boolean[n];

        Arrays.fill(tin, -1);

        timer = 0;

        for (int i = 0; i < n; i++) {
            if (tin[i] == -1) {
                dfs(i, -1);
            }
        }

        List<Integer> answer = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            if (articulation[i]) {
                answer.add(i);
            }
        }

        return answer;
    }

    static void dfs(int node, int parentEdge) {
        tin[node] = low[node] = timer++;

        int children = 0;

        for (int[] edge : graph.get(node)) {
            int next = edge[0];
            int edgeId = edge[1];

            if (edgeId == parentEdge) {
                continue;
            }

            if (tin[next] == -1) {
                children++;

                dfs(next, edgeId);

                low[node] = Math.min(
                        low[node],
                        low[next]
                );

                if (parentEdge != -1 &&
                    low[next] >= tin[node]) {
                    articulation[node] = true;
                }
            } else {
                low[node] = Math.min(
                        low[node],
                        tin[next]
                );
            }
        }

        if (parentEdge == -1 && children >= 2) {
            articulation[node] = true;
        }
    }
}
```

### Dry Run

Consider:

```text
0 -- 1 -- 2
     |
     3
```

Removing `1` separates:

```text
0
```

from:

```text
2,3
```

Hence `1` is an articulation point.

### Why Does It Work?

If a child subtree cannot reach an ancestor of `u` without passing through `u`, then removing `u` disconnects that subtree. Equality is enough:

```text
low[child] == tin[u]
```

already means the subtree cannot jump above `u`.

The root is special because it has no ancestor. Two independent DFS children mean removing the root separates those subtrees.

### Complexity

Time: **`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Critical vertex / removing vertex disconnects graph"
Pattern:       Tarjan articulation point
Test:          low[child] >= tin[node]
Root rule:     root has >= 2 DFS children
```

**Interview tip:** Remember the exact contrast:

```text
Bridge:       low[child] >  tin[node]
Articulation: low[child] >= tin[node]
```

---

## 53. Strongly Connected Components — Kosaraju's Algorithm

### Problem Understanding

A strongly connected component (SCC) is a maximal set of vertices where every vertex can reach every other vertex.

Example:

```text
0 -> 1
^    |
|    v
3 <- 2
```

All four vertices are in one SCC if the edges form a complete directed cycle of reachability.

### How to Think About the Problem

Normal connected components work because edges are effectively two-way.

Directed reachability is different.

We need a way to identify groups where reachability works in both directions.

Clue → Pattern:

```text
Directed graph + mutually reachable groups
        ↓
SCC
        ↓
Kosaraju two-pass DFS
```

### Intuition

#### Pass 1

Run DFS on the original graph.

When a node finishes:

```text
push node
```

This records decreasing finish-time order after reversing the stack.

#### Pass 2

Reverse every edge.

Process nodes in decreasing original finish order.

Each DFS now isolates one SCC.

### Why the Transpose Helps

Suppose SCCs are connected conceptually like:

```text
SCC A -> SCC B
```

In the transpose:

```text
SCC B -> SCC A
```

The finish ordering from the first pass ensures that the second DFS enters one SCC without incorrectly leaking through outgoing edges into another SCC.

### Optimal Approach

```java
class Solution {
    static List<List<Integer>> stronglyConnectedComponents(
            int n,
            int[][] edges) {

        List<List<Integer>> graph = new ArrayList<>();
        List<List<Integer>> reverse = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            graph.add(new ArrayList<>());
            reverse.add(new ArrayList<>());
        }

        for (int[] edge : edges) {
            int u = edge[0];
            int v = edge[1];

            graph.get(u).add(v);
            reverse.get(v).add(u);
        }

        boolean[] visited = new boolean[n];
        Deque<Integer> finishOrder = new ArrayDeque<>();

        for (int i = 0; i < n; i++) {
            if (!visited[i]) {
                dfsOrder(i, graph, visited, finishOrder);
            }
        }

        Arrays.fill(visited, false);

        List<List<Integer>> components = new ArrayList<>();

        while (!finishOrder.isEmpty()) {
            int node = finishOrder.pop();

            if (visited[node]) {
                continue;
            }

            List<Integer> component = new ArrayList<>();
            dfsCollect(node, reverse, visited, component);

            components.add(component);
        }

        return components;
    }

    static void dfsOrder(
            int node,
            List<List<Integer>> graph,
            boolean[] visited,
            Deque<Integer> finishOrder) {

        visited[node] = true;

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                dfsOrder(next, graph, visited, finishOrder);
            }
        }

        finishOrder.push(node);
    }

    static void dfsCollect(
            int node,
            List<List<Integer>> graph,
            boolean[] visited,
            List<Integer> component) {

        visited[node] = true;
        component.add(node);

        for (int next : graph.get(node)) {
            if (!visited[next]) {
                dfsCollect(next, graph, visited, component);
            }
        }
    }
}
```

### Dry Run

Suppose:

```text
0 -> 1
1 -> 0

1 -> 2
2 -> 3
3 -> 2
```

SCCs:

```text
{0,1}
{2,3}
```

First DFS establishes the finish ordering.

After reversing edges, the second pass discovers:

```text
{0,1}
```

as one unit and:

```text
{2,3}
```

as another.

### Why Does It Work?

The first DFS determines an order based on finishing times of SCCs. Reversing the graph turns the direction between SCCs around, so processing vertices by decreasing finish time ensures each second-pass DFS starts from a source SCC of the remaining condensation graph and stays inside one SCC.

### Complexity

Building the original and transpose graphs:

```text
O(V + E)
```

First DFS:

```text
O(V + E)
```

Second DFS:

```text
O(V + E)
```

Total:

**`O(V + E)`**.

Space: **`O(V + E)`**.

### Pattern to Remember

```text
Problem clue:  "Mutually reachable directed groups"
Pattern:       Kosaraju SCC
Mental model:  finish order + transpose + second DFS
```

**Interview tip:** Memorize the sequence, not the code:

```text
DFS original
    ↓
finish order
    ↓
transpose
    ↓
DFS in reverse finish order
```

---

# Final Summary — All 53 Questions Grouped by Pattern

## Pattern Grouping

| Pattern | Problem numbers | One-line tell |
|---|---|---|
| Graph representation | 1, 2 | Choose the storage based on the operation |
| Connected components | 3, 7, 8, 18 | Count one new traversal per unseen component |
| BFS traversal | 4, 9, 13, 16, 28, 32, 37 | Queue explores increasing unweighted distance |
| DFS traversal/flood fill | 5, 6, 8, 10, 14, 15, 18 | Explore a complete reachable region |
| Undirected cycle | 11, 12 | Visited neighbor that is not parent |
| Directed cycle | 20, 23, 24 | Recursion stack or Kahn processed-count test |
| Bipartite coloring | 19 | Every edge must connect opposite colors |
| Topological ordering | 21, 22, 24, 25, 26, 27 | Dependency graph must be a DAG |
| Multi-source BFS | 9, 13, 15 | Put every source into the queue at distance 0 |
| Boundary-first BFS/DFS | 14, 15 | Find the escape-capable region first |
| Word graph BFS | 16, 17 | One-letter transformation = graph edge |
| Unweighted shortest path | 16, 28, 32, 37 | Every edge/state transition costs 1 |
| DAG shortest path | 29 | Topological order + relaxation |
| Dijkstra | 30, 31, 35, 36 | Positive weights + minimum current distance |
| Minimax shortest path | 33, 50 | Path cost is the maximum edge/cell value |
| Bounded shortest path | 34 | Bellman-Ford rounds correspond to edge limits |
| Bellman-Ford | 34, 38 | Repeated relaxation handles bounded/negative edges |
| All-pairs shortest path | 39, 40 | Every source needs every destination |
| MST | 41, 42, 44, 50 | Connect all vertices with minimum total connectivity cost |
| DSU merging | 43, 45, 46, 47, 48, 49 | Maintain connected components while relationships change |
| Incremental grid DSU | 48 | Add a node, union only new neighboring components |
| Component-size DSU | 46, 49 | Merge components and query their sizes |
| Tarjan low-link | 51, 52 | `tin[]` + `low[]` reveals critical edges/vertices |
| Kosaraju SCC | 53 | Finish order + transpose + second DFS |

---

## One-Paragraph Takeaways

### Part A — Learning & Traversal

The first six problems teach the vocabulary that makes the remaining problems recognizable. A graph is simply nodes plus relationships. Sparse graphs usually want adjacency lists. Grids are graphs whose neighbors are generated with direction arrays. BFS means queue and levels. DFS means recursion or a stack and complete exploration. Connected components are simply repeated traversals from still-unvisited nodes.

### Part B — BFS/DFS

The second part is mostly pattern recognition. If the problem asks for connected regions, flood-fill. If many sources spread simultaneously, use multi-source BFS. If the graph is unweighted and the task is minimum distance, BFS. If there is a cycle, ask whether the graph is directed or undirected because the cycle rule changes. The hardest conceptual jump here is Word Ladder II: shortest distance and all shortest paths are two separate jobs, so BFS and parent tracking work together.

### Part C — Topological Sort

Topological sort is dependency management. A node is ready when its dependencies are finished. DFS expresses that through postorder. Kahn expresses it through indegree zero. Course Schedule is just topological sorting wearing a different story. Alien Dictionary is the same idea after converting word comparisons into character dependencies. Eventual Safe States becomes easier after reversing the graph and starting from terminal nodes.

### Part D — Shortest Path

The shortest-path section is mainly about asking what the edge cost structure is. If every move costs one, use BFS. If the graph is a DAG, topological order lets you relax each edge once. With non-negative weights, use Dijkstra. With negative weights, Bellman-Ford. If every pair is needed, Floyd-Warshall. If the path cost is a maximum rather than a sum, use the minimax version of Dijkstra or binary search on a threshold.

### Part E — MST / DSU

MST problems are about connecting everything as cheaply as possible, not about shortest paths from a source. Prim grows one tree using the cheapest boundary edge. Kruskal sorts all edges and uses DSU to avoid cycles. DSU itself is the general tool for maintaining components under repeated merges. Many problems that look unrelated become DSU problems once you identify the thing that defines connectivity: cables, rows/columns, emails, newly added land, or neighboring islands.

### Part F — Other Algorithms

Tarjan's algorithms answer structural "what if I remove this?" questions. `tin[]` tells when a vertex was discovered. `low[]` tells how far back its subtree can connect. Bridges use the strict test `low[child] > tin[node]`; articulation points use `low[child] >= tin[node]`, with a separate root rule. SCCs are different: they care about mutual directed reachability, for which Kosaraju uses finish order and the transposed graph.

---

## Exam Checklist — How To Recognize On The Spot

```text
Is this a graph, grid, or hidden state graph?
        -> Identify nodes and edges first

Counting connected groups?
        -> DFS/BFS connected components

Connected regions in a matrix?
        -> Grid DFS/BFS flood fill

Something spreads from many starting points at once?
        -> Multi-source BFS

"Nearest" / "minimum number of moves" with unit cost?
        -> BFS

Change one character / state at a time?
        -> BFS on a state graph

Can the graph be colored with two colors?
        -> Bipartite DFS/BFS

Prerequisites / dependencies / ordering?
        -> Topological sort

Need to detect a directed cycle?
        -> DFS recursion stack or Kahn

Need a shortest path in a DAG?
        -> Topological order + relaxation

Shortest path with all weights equal to 1?
        -> BFS

Shortest path with positive weights?
        -> Dijkstra

Need explicit removal of stale Dijkstra states?
        -> TreeSet version

Negative edge weights?
        -> Bellman-Ford

Need to detect a reachable negative cycle?
        -> Bellman-Ford + V-th relaxation

Need distances between every pair?
        -> Floyd-Warshall

"Minimize the maximum edge/value"?
        -> Minimax Dijkstra or binary search + BFS

"At most K stops/edges"?
        -> Bounded Bellman-Ford / layered relaxation

Connect every vertex with minimum total edge weight?
        -> MST

MST growing from one visited set?
        -> Prim

Sort edges and merge components?
        -> Kruskal

Groups merge dynamically?
        -> DSU

Need number of connected components after merges?
        -> DSU

Grid changes one cell at a time?
        -> Incremental DSU

Need largest component after merging neighbors?
        -> DSU + component sizes

Same row / same column defines connectivity?
        -> DSU on row/column nodes

Need a critical edge?
        -> Tarjan bridge:
           low[child] > tin[node]

Need a critical vertex?
        -> Tarjan articulation:
           low[child] >= tin[node]

Need mutually reachable directed groups?
        -> Kosaraju SCC
```

---

## Complexity Cheat Sheet

Let:

```text
V = number of graph vertices
E = number of graph edges
N = rows * columns for a grid
```

For a four-direction grid:

```text
E ≈ 4N
```

The constant `4` is ignored asymptotically.

| # | Problem | Brute / Naïve | Optimal |
|---:|---|---|---|
| 1 | Graph Representation | Matrix `O(V²)` | List `O(V+E)` |
| 2 | Representation Choices | Wrong representation overhead | `O(V+E)` list / `O(E)` edge list |
| 3 | Connected Components | Repeated redundant search | `O(V+E)` |
| 4 | BFS | DFS/scan depending on task | `O(V+E)` |
| 5 | DFS | Repeated search | `O(V+E)` |
| 6 | Grid Components | Search each region repeatedly | `O(N)` |
| 7 | Number of Provinces | Repeated city searches | `O(V²)` |
| 8 | Matrix Components | Search each cell repeatedly | `O(N)` |
| 9 | Rotten Oranges | BFS per rotten source | `O(N)` |
| 10 | Flood Fill | Repeated region scans | `O(N)` |
| 11 | Undirected Cycle BFS | Repeated path checks | `O(V+E)` |
| 12 | Undirected Cycle DFS | Repeated path checks | `O(V+E)` |
| 13 | 01 Matrix | BFS from every `1` | `O(N)` |
| 14 | Surrounded Regions | Search escape path for every `O` | `O(N)` |
| 15 | Number of Enclaves | DFS from every land cell | `O(N)` |
| 16 | Word Ladder I | Enumerate all word pairs | `O(W·L·26)` |
| 17 | Word Ladder II | Enumerate all paths | `O(W·L·26 + P)` |
| 18 | Number of Islands | Repeated region search | `O(N)` |
| 19 | Bipartite | Repeated color attempts | `O(V+E)` |
| 20 | Directed Cycle DFS | Repeated path checks | `O(V+E)` |
| 21 | Topological DFS | Brute order permutations | `O(V+E)` |
| 22 | Topological Kahn | Brute order permutations | `O(V+E)` |
| 23 | Directed Cycle Kahn | Search cycles explicitly | `O(V+E)` |
| 24 | Course Schedule I | Try course orders | `O(V+E)` |
| 25 | Course Schedule II | Try course orders | `O(V+E)` |
| 26 | Eventual Safe States | Reachability from every node | `O(V+E)` |
| 27 | Alien Dictionary | Try character permutations | `O(total input + 26²)` |
| 28 | Unit-Weight Shortest Path | DFS/paths | `O(V+E)` |
| 29 | DAG Shortest Path | Dijkstra | `O(V+E)` |
| 30 | Dijkstra PQ | Repeated full scans | `O(E log V)` |
| 31 | Dijkstra Set | Linear minimum search | `O(E log V)` |
| 32 | Binary Maze | Enumerate paths | `O(N)` |
| 33 | Minimum Effort | Binary search + BFS | Dijkstra `O(N log N)` |
| 34 | Cheapest Flights K Stops | Unbounded shortest path | `O(K·E)` |
| 35 | Network Delay | Bellman-Ford / repeated search | `O(E log V)` |
| 36 | Number of Ways | Enumerate shortest paths | `O(E log V)` |
| 37 | Minimum Multiplications | Enumerate operation sequences | `O(M·A)` |
| 38 | Bellman-Ford | Repeated path enumeration | `O(VE)` |
| 39 | Floyd-Warshall | Dijkstra from every node | `O(V³)` |
| 40 | City at Threshold | Repeated path searches | `O(V³)` |
| 41 | MST Theory | Enumerate spanning trees | Greedy MST algorithms |
| 42 | Prim | Enumerate spanning trees | `O(E log V)` |
| 43 | DSU | Rebuild components after every merge | `O(alpha(V))` amortized/op |
| 44 | Find MST Weight | Enumerate spanning trees | `O(E log V)` |
| 45 | Network Connected | Rebuild graph repeatedly | `O(E alpha(V))` |
| 46 | Remove Stones | Repeated connectivity searches | `O(S alpha(V))` |
| 47 | Accounts Merge | Compare every account/email pair | `O(E alpha(V) + K log K)` |
| 48 | Number of Islands II | DFS/BFS after every update | `O(K alpha(N))` |
| 49 | Making Large Island | Recompute island size per zero | `O(N alpha(N))` |
| 50 | Swim in Rising Water | Enumerate threshold/path combinations | `O(N log N)` |
| 51 | Bridges | Remove each edge and re-run DFS | `O(V+E)` |
| 52 | Articulation Point | Remove each vertex and re-run DFS | `O(V+E)` |
| 53 | Kosaraju SCC | Run reachability repeatedly | `O(V+E)` |

---

## A Closing Note on How to Study This

The biggest mistake with graphs is memorizing 53 solutions independently. Do not do that.

Memorize:

```text
clue -> pattern -> template
```

The four questions to ask before coding are:

```text
1. Is this actually a graph or grid?

2. What representation makes the important operation cheap?

3. What is the natural primitive?
   BFS / DFS / Topological Sort / Dijkstra /
   Bellman-Ford / Floyd / DSU / Tarjan

4. What invariant makes the primitive correct?
```

Then re-derive these from scratch:

```text
BFS
Kahn's algorithm
Dijkstra
DSU
Tarjan low-link
Kosaraju
```

Do not memorize the exact queue code.

Know why the queue exists.

Do not memorize Dijkstra's `PriorityQueue`.

Know why the smallest tentative distance is safe.

Do not memorize DSU's parent array.

Know why merging representatives maintains connected components.

Do not memorize:

```text
low[child] > tin[node]
```

as an isolated formula.

Understand what `low` means, and the bridge condition follows naturally.

The goal is to reach the point where a new problem does not look new.

For example:

```text
"rotting oranges"
        ↓
multi-source BFS

"nearest zero"
        ↓
multi-source BFS

"signal spreads from many towers"
        ↓
multi-source BFS
```

The story changed.

The graph pattern did not.

That is the real skill these 53 problems are trying to teach.