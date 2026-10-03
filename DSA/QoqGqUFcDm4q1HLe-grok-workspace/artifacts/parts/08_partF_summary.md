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
