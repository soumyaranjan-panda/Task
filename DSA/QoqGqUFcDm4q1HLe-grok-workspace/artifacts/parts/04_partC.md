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
