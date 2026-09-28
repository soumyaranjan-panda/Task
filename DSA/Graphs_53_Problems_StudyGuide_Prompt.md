# Prompt — Generate "Graphs — 53 Problems Study Guide (Java)"

Use this prompt to generate a single, deep, self-contained study-guide Markdown file
covering **every problem in the "Graphs [Concepts & Problems]" section of Striver's
A2Z DSA Sheet** (53 problems), written in the exact same style, tone, and structure as
the reference note `BinarySearch_31_Problems_StudyGuide.md`.

---

## 0. Your role and task

You are a DSA mentor who teaches **how to think**, not code to memorize. Your job:

- Generate ONE file: `Graphs_53_Problems_StudyGuide.md`
- It must teach graph problem-solving the way the binary-search guide teaches BS:
  observations first, then the pattern, then the derivation, then the code, then the dry run.
- Cover **all 53 problems below**. Skip nothing. Keep the exact order of the sheet.
- All code must be valid, runnable **Java** (Java 21, `java.util.*` only, no external libs).
- The final file should feel like one coherent study guide, not a list of unrelated snippets.

---

## 1. Overall structure you MUST produce

```
# Graphs — 53 Problems Study Guide (Java)

[2–3 paragraph intro explaining what the guide is, how to read it, and the shared
 structure used for every problem]

## 0. The Foundation: Graphs in One Page

[Explain the core graph ideas once, deeply, before any problem.]

# PART A — Learning & Traversal

[BFS, DFS, connected components — the concepts every later problem uses]

# PART B — Problems on BFS/DFS            (14 problems)

# PART C — Topological Sort and Problems  (7 problems)

# PART D — Shortest Path Algorithms and Problems  (13 problems)

# PART E — MST / Disjoint Set and Problems         (10 problems)

# PART F — Other Algorithms (Bridges, Articulation, SCC)  (3 problems)

# Final Summary — All 53 Questions Grouped by Pattern

## Pattern Grouping
## One-Paragraph Takeaways
## Exam Checklist — How To Recognize On The Spot
## Complexity Cheat Sheet
## A Closing Note on How to Study This
```

Each numbered problem is a `## N. <Problem Name>` section using the 7-step template
(§3). The Foundation (§2) and Final Summary (§6) mirror the binary-search guide's
"0. BS in One Page" and "Final Summary — All 31 Questions Grouped by Pattern".

---

## 2. The Foundation page — "Graphs in One Page"

Teach these once, thoroughly, before problem 1. Use tables, ASCII diagrams, and code:

- **What a graph is and the vocabulary** — vertex/node, edge, undirected vs directed,
  weighted vs unweighted, cycle, connected vs disconnected, connected components,
  bipartite, DAG, degree (in/out), self-loop, multi-edge.
- **Representations & when to pick which** — adjacency matrix vs adjacency list vs
  edge list; how to build an adjacency list from an `n, m + edges` input and from a
  `char[][]` / `int[][]` grid. Include a comparison table with complexity and memory.
- **Grids are graphs** — the 4-direction and 8-direction directions arrays, the
  one-to-one mapping between `(row, col)` and `row * cols + col` (and back), why it
  matters for visited arrays and DSU.
- **BFS template** — queue + visited, level-by-level traversal, why BFS finds the
  shortest path in an **unweighted** graph, the "distance array" variant, multi-source
  BFS (push all sources first). Show the canonical Java skeleton.
- **DFS template** — recursion + visited, when to use an explicit stack, ordering
  (pre/in/post), why tree edges and back edges matter for cycles.
- **Two mini-templates every problem reuses**:
  - Cycle detection in an undirected graph (visited + `parent`).
  - Cycle detection in a directed graph (`pathVisited` / recursion-stack, or a
    3-colour / Kahn's-count approach).
- **Topological sort** — definition, when it exists (DAG), DFS order vs Kahn's
  algorithm, and the single invariant: *a node is pushed only after all its
  dependencies are finished*.
- **Relaxation primitive** — `if (dist[v] > dist[u] + w) dist[v] = dist[u] + w;`
  and why Dijkstra/Bellman-Ford/Floyd-Warshall are all built from this one line.
- **Disjoint Set Union (DSU)** — `find` with path compression (iterative + recursive),
  `union` by rank and by size, why rank keeps the tree shallow, complexity with and
  without path compression.
- **MST keyword triples** — Prim (PQ on edges from a visited set), Kruskal (sort
  edges + DSU).
- **Hard-algorithm toolbox** — `tin[]`/`low[]` (Tarjan) for bridges and articulation,
  `disc[]`/`low[]`, and the Kosaraju two-pass idea (finish-order stack + transpose).
- **The decision question every problem asks first**:
  ```
  Am I counting / but BFS or DFS the natural walker?
  Am I ordering dependencies?            -> topological sort
  Am I minimizing a path cost?           -> BFS (unit) / Dijkstra / BF / FW
  Am I merging or splitting connected parts? -> DSU
  Am I asking "what happens if I remove this edge/vertex"? -> Tarjan tin/low
  ```
- **"The 6 core mental models"** table: Signature clue → Mental model → Which template.
  (Mirror the binary-search guide's pattern-overview table.)

---

## 3. Per-problem template (every problem MUST follow this)

Each problem follows these exact sub-sections, in this order:

### Problem Understanding
Raw problem statement in your own words, plus Input / Output / Constraints /
Observations and one clear **Example** with input → output (multiple examples when
edge cases matter, e.g. disconnected graphs, `k=0`, duplicate words in Alien
Dictionary, negative cycles in Bellman-Ford).

### How to Think About the Problem
Written as a short self-questioning dialogue, exactly like the BS guide:
- What should I notice first? (is this a graph? a grid? groups/merging? dependencies?)
- Which representation makes sense? (adjacency list, grid, DSU)
- Is it counting/searching/ordering/minimizing? → which of the 6 mental models?
- Which traversal is natural: BFS, DFS, topo, Dijkstra, DSU, Tarjan?
- Clue → Pattern: a one-line mapping, e.g. *"word-to-word single-step transformations →
  unweighted graph → BFS level count"*.

### Intuition (Brute → Better → Optimal)
An ASCII arrow diagram in a code fence, e.g.:
```text
Brute force: try every ... O(...)
        ↓
Observation: ...
        ↓
Optimal: ..., O(...)
```

### Brute Force Approach (or "Naïve Approach" where brute is meaningless)
Basic idea / Why it works / Java code / Time & Space complexity ("Time Complexity
Calculation:" narration, like the BS guide) / **Why can this be improved?**

### Optimal Approach
- **Core Observation** (the single insight — e.g., "all distances start at 0 in
  multi-source BFS", "reverse edges turn 'reachable to safety' into 'reached from
  safety'", "the nth relaxation detects negative cycles").
- **Pattern Identification** (name the exact mental model + a sentence).
- **Step-by-Step Intuition** (numbered steps, with the *invariant* stated explicitly,
  e.g., *"After processing a node, its distance is finalized"*).
- **Dry Run** — a table (step | queue/stack state | dist[] change | action) or a
  traced walkthrough on the example input, showing intermediate `dist[]`, `parent[]`,
  `tin[]/low[]`, DSU `parent[]`, etc.
- **Why Does It Work?** — a clear correctness argument (2–4 sentences; use the
  invariant or a proof sketch — e.g., why BFS level = shortest hops, why relaxation
  never underestimates, why Kahn's leftover indegree>0 means a cycle, why Tarjan
  low-time split = bridge).
- **Java Code** — valid Java 21. Prefer `ArrayDeque` over `Stack`, arrays over
  boxed types, `int[] dist` where possible. No comments unless they explain a
  subtle step (you are documenting a teaching guide, so keep comments purposeful).
- **Complexity** — Time Complexity Calculation + Space Complexity Calculation,
  narrated, distinguishing `V` and `E` (grids: `n*m` for V, `4*V` for E).

### Pattern to Remember
A code-fence block with three lines (problem clue → pattern → mental model), plus
**Similar problems** and a one-line **Interview tip** (e.g., "say the invariant out
loud", "mention why a visited array alone fails on directed cycles", "state that
Kahn's is BFS-topo and handles the all-safe-states question").

---

## 4. The source of truth — Striver A2Z Graph list (53 problems, sheet order)

Generate EVERY problem below, one section each, in exactly this order and grouping.
For problems listed as "(GFG)" use the GeeksforGeeks judge problem; "(LeetCode …)"
use LeetCode; "(takeUforward article)" means the topic is taught via Striver's blog at
the given path (generate the topic as a normal problem section anyway).

### PART A — Learning & Traversal (6)
1. **Introduction to Graph & Graph Representation (Java)** — adjacency list vs
   matrix vs edge list, how to build from `n` + `m` edges and from a grid
   (takeUforward article: `/data-structure/graph-representation-in-java`).
2. **Graph Representation | C++ (equivalent Java)** — same content from a Java-lover's
   lens: `List<List<Integer>>` vs `List<Integer>[]`, memory, and when edge lists shine.
3. **Connected Components** — the outer `for` loop over all nodes when a graph may be
   disconnected; count/list components (takeUforward article: `/data-structure/connected-components`).
4. **Traversal Techniques — BFS** — the textbook BFS on an adjacency list, plus the
   building-order `Queue<Integer>` API (takeUforward article: `/data-structure/depth-first-search-dfs/`).
5. **DFS** — recursion-based DFS on an adjacency list, visited array, and iterative
   stack variant (takeUforward article: `/data-structure/depth-first-search-dfs/`).
6. **DFS on a Grid / Connected Components Problem in Matrix** — same DFS applied to
   `char[][]`/`int[][]` with the directions array; count connected components in a
   grid (this feeds Number of Islands later).

### PART B — Problems on BFS/DFS (14)
7. **Number of Provinces** — LeetCode 547 (Medium). Counting connected components in
   an `isConnected[i][j]` matrix; note a matrix that still needs an adjacency-list-style
   loop.
8. **Connected Components in a Matrix (grid component counting)** — the generic
   "count regions" DFS wrapper you can lift into problem 18 (takeUforward).
9. **Rotten Oranges** — LeetCode 994 (Medium). Multi-source BFS; be precise about time
   = the level of the *last* fresh orange, and the all-fresh / all-rotten edge cases.
10. **Flood Fill Algorithm** — LeetCode 733 (Medium). Change one connected region; the
    classic grid-DFS; why changing the cell before recursing prevents infinite loops.
11. **Cycle Detection in an Undirected Graph (BFS)** — takeUforward
    (`/data-structure/detect-cycle-in-an-undirected-graph-using-bfs/`), Hard. The
    `parent` array; why BFS's parent works but a plain visited array is not enough.
12. **Detect a Cycle in an Undirected Graph (DFS)** — takeUforward
    (`/data-structure/detect-cycle-in-an-undirected-graph-using-dfs/`), Hard. DFS +
    parent; the single back-edge argument.
13. **Distance of Nearest Cell Having 1 (01 Matrix)** — LeetCode 542 (Medium).
    Multi-source BFS starting from *all* zeros-with-1 cells; why re-running BFS per
    cell would be `O((n·m)²)`.
14. **Surrounded Regions (Replace O's with X's)** — LeetCode 130 (Medium). The
    boundary-first trick: flood-fill from border O's, then convert the rest.
15. **Number of Enclaves** — LeetCode 1020 (Medium). Boundary-first again / count
    cells not reachable from the border.
16. **Word Ladder I** — LeetCode 127 (Hard). Model words as graph nodes, one-letter
    differences as edges; BFS level = shortest transformation length; the
    `Set<String>` frontier trick.
17. **Word Ladder II** — LeetCode 126 (Hard). All shortest paths; BFS layering + DFS
    on layers, and why naively remembering visited globs across paths breaks it.
18. **Number of Islands** — LeetCode 200 (Medium). Grid DFS/BFS region counting; the
    sinking trick (flood-fill and mark) vs a separate visited array.
19. **Is Graph Bipartite (DFS)** — LeetCode 785 (Medium). 2-colouring (0/1) and the
    odd-length-cycle argument; mention the BFS variant.
20. **Cycle Detection in a Directed Graph (DFS)** — takeUforward
    (`/data-structure/detect-cycle-in-a-directed-graph-using-dfs-g-19/`), Hard. The
    `pathVisited` recursion stack; *why* undirected parent logic fails on directed
    graphs.

### PART C — Topological Sort and Problems (7)
21. **Topological Sort (DFS)** — takeUforward
    (`/data-structure/topological-sort-algorithm-dfs-g-21/`), Hard. Post-order push +
    reverse; the invariant in §2.
22. **Topological Sort — Kahn's Algorithm (BFS)** — takeUforward
    (`/data-structure/topological-sort-algorithm-dfs-g-21/`), Hard. Indegree recipe;
    why `processed count != V` ⟹ cycle.
23. **Detect a Cycle in a Directed Graph (BFS / Kahn)** — takeUforward
    (`/data-structure/detect-a-cycle-in-directed-graph-topological-sort-kahns-algorithm-g-23/`),
    Hard. Count processed nodes vs `V`.
24. **Course Schedule I** — LeetCode 207 (Medium). Cycle detection via Kahn/Direct.
25. **Course Schedule II** — LeetCode 210 (Medium). Return the topological order
    itself (or `[]` when cyclic).
26. **Find Eventual Safe States** — LeetCode 802 (Medium). Terminating nodes via
    reverse graph / Kahn; connect to "node with no outgoing non-safe successor".
27. **Alien Dictionary** — LeetCode 269 (Hard). Words → edges from first differing
    character; handle the prefix inconsistency case; topological order of unknowns.

### PART D — Shortest Path Algorithms and Problems (13)
28. **Shortest Path in Undirected Graph with Unit Weights** — takeUforward
    (`/data-structure/shortest-path-in-undirected-graph-with-unit-distance-g-28/`),
    Hard. Plain BFS with a `dist[]` array; document why BFS works on unweighted graphs.
29. **Shortest Path in a DAG** — takeUforward
    (`/data-structure/shortest-path-in-directed-acyclic-graph-topological-sort-g-27/`),
    Hard. Topo order + relax; why `O(V+E)` beats Dijkstra on a DAG.
30. **Dijkstra's Algorithm (Priority Queue)** — takeUforward
    (`/data-structure/dijkstras-algorithm-using-priority-queue-g-32/`), Hard. The
    PQ-greedy loop; the finalized-distance invariant; when duplicates in the PQ are OK.
31. **Dijkstra's Algorithm (Set version) — why a PQ/set is the right structure** —
    takeUforward (`/data-structure/dijkstras-algorithm-using-set-g-33/`), Hard. Compare
    PQ vs `TreeSet`, amortized deletion cost, and the "why not a plain queue" answer.
32. **Shortest Path in a Binary Maze** — LeetCode 1091 (Medium). 0-1 grid BFS counting
    moves; why Dijkstra is overkill when edge weights are uniform; the
    "is it the same as ordinary BFS?" pivot.
33. **Path with Minimum Effort** — LeetCode 1631 (Hard). The "minimize the maximum
    edge on a path" pattern → Dijkstra variant on effort, or binary search on
    threshold + BFS; cross-link to BS-on-answer thinking.
34. **Cheapest Flights Within K Stops** — LeetCode 787 (Medium). Cost-limited BFS /
    Bellman-Ford with at-most-K relaxations; the subtle "why you must relax from the
    previous iteration's snapshot" bug.
35. **Network Delay Time** — LeetCode 743 (Medium). Single-source all-target
    shortest path with Dijkstra; the answer is the max dist (and `-1` if unreachable).
36. **Number of Ways to Arrive at Destination** — LeetCode 1976 (Medium). Dijkstra +
    counting; when `dist[v] == dist[u] + w` add the ways; `mod` handling at the end.
37. **Minimum Multiplications to Reach End** — takeUforward
    (`/graph/g-39-minimum-multiplications-to-reach-end/`), Hard. State = value mod M;
    BFS over the multiplication graph; why visited-on-value (not path) is enough.
38. **Bellman-Ford Algorithm** — takeUforward
    (`/data-structure/bellman-ford-algorithm-g-41/`), Hard. Relax `V-1` times; the
    **negative-cycle detection** on the `V`-th pass; directed vs undirected caveats;
    why `dist` starts by becoming nearby first.
39. **Floyd-Warshall Algorithm** — takeUforward
    (`/data-structure/floyd-warshall-algorithm-g-42/`), Hard. The `k`-outer-loop `3D→2D`
    idea; why intermediate vertices must be outermost; negative-cycle check on the
    diagonal.
40. **Find the City with the Smallest Number of Neighbors at a Threshold Distance** —
    LeetCode 1334 (Medium). All-pairs = Floyd-Warshall; the tie-break rule
    (largest city index wins).

### PART E — MST / Disjoint Set and Problems (10)
41. **MST Theory** — takeUforward (`/data-structure/minimum-spanning-tree-theory-g-44/`),
    Easy. Spanning tree, cut property, and the goal (minimum total edge weight).
42. **Prim's Algorithm** — takeUforward
    (`/data-structure/prims-algorithm-minimum-spanning-tree-c-and-java-g-45/`), Hard.
    PQ on edges / visited set; relate to Dijkstra and note the differences.
43. **Disjoint Set (Union by Rank / by Size, Path Compression)** — takeUforward
    (`/data-structure/disjoint-set-union-by-rank-union-by-size-path-compression-g-46/`),
    Hard. The class skeleton, the two `find` variants, the "almost O(1)" justification.
44. **Find the MST Weight** — takeUforward
    (`/data-structure/prims-algorithm-minimum-spanning-tree-c-and-java-g-45/`), Hard.
    Run Prim (or Kruskal) and return the total weight; verify with a dry run edge list.
45. **Number of Operations to Make Network Connected** — LeetCode 1319 (Medium). DSU:
    answer = number of connected components - 1, and the `cables < nodes-1 ⟹ -1` early out.
46. **Most Stones Removed with Same Row or Column** — LeetCode 947 (Medium). DSU on
    row/column sentinel nodes; answer = `stones - components` with the row-scanning trick.
47. **Accounts Merge** — LeetCode 721 (Medium). DSU over emails; merging sets; the
    output must be the original first name with sorted emails.
48. **Number of Islands II** — LeetCode 305 (Hard). Incremental DSU with **online
    queries**; pairwise neighbor-union only at the newly added cell; why recomputing
    BFS per query is too slow.
49. **Making a Large Island** — LeetCode 827 (Hard). Two-phase DSU: size of each
    component first, then try flipping each zero and summing distinct neighbor
    component sizes (dedupe neighbor roots!).
50. **Swim in Rising Water** — LeetCode 778 (Hard). Binary search on time + BFS, or
    Dijkstra / DSU with sorted cells; explicitly connect to the "minimize maximum"
    pattern from 33.

### PART F — Other Algorithms (3)
51. **Bridges in a Graph (Tarjan's tin/low)** — LeetCode 1192 Critical Connections
    (Hard) + takeUforward (`/graph/bridges-in-graph-using-tarjans-algorithm-of-time-in-and-low-time-g-55/`).
    The `tin[]/low[]` split test `low[nei] > tin[node]`; why revisiting the parent is
    special-cased.
52. **Articulation Point** — takeUforward
    (`/data-structure/articulation-point-in-graph-g-56/`), Hard. Two rules (root with
    ≥ 2 children; `low[nei] >= tin[node]` otherwise); note that the bridge test is `>`.
53. **Strongly Connected Components — Kosaraju's Algorithm** — takeUforward
    (`/graph/strongly-connected-components-kosarajus-algorithm-g-54/`), Hard (the
    sheet's LeetCode link is a known copy/paste error — use GfG "Strongly Connected
    Components (Kosaraju's Algorithm)"). Order DFS on original, transpose graph, DFS in
    decreasing finish order; why the transpose + order trick isolates SCCs.

---

## 5. Graph-specific thinking rules (apply to EVERY problem)

- State the **structure being exploited** at the top of the Optimal Approach
  (tree/grid/DAG/undirected/weighted).
- For grids, always show the `dirs = {{-1,0},{1,0},{0,-1},{0,1}}` array and the
  in-bounds check before neighbours are pushed.
- For adjacency problems, always show how the graph is **built from the input** once,
  in the first problem that uses it, and refer back to it in later problems.
- Show the **"why am I choosing BFS/DFS/DSU/Dijkstra/Tarjan"** reasoning explicitly in
  "How to Think About the Problem".
- Give the **BFS-in-levels** pattern (process `size()` at a time) wherever a distance
  or round count is needed (Rotten Oranges, Word Ladder, Binary Maze).
- Cite **why a naive idea fails** (e.g., per-cell BFS in 01 Matrix, no-layers DFS in
  Word Ladder II, recomputing DSU per query in Islands II, colour-only visited on
  directed cycles) — the BS guide's trademark is showing the brute force *and* the
  flaw that motivates the better approach.
- Include **edge cases explicitly** per problem: empty graph, single node, self loop,
  disconnected components, `k=0`, no path, negative weights, duplicate edges, fully
  rotten grid, no safe states, word not reachable.

---

## 6. Final Summary — All 53 Questions Grouped by Pattern

Must contain:

### Pattern Grouping
A table `Pattern | Problem numbers | One-line tell` grouping every problem by its
pattern, e.g.: Region counting (7, 8, 10, 15, 18, 48, 49) · Multi-source BFS (9, 13,
14, 15) · Cycle detection (11, 12, 20, 23, 24) · Topological ordering (21–27) ·
Unweighted shortest (16, 17, 28, 32, 34, 37) · Dijkstra family (30–36) · All-pairs
(39, 40) · Bellman-Ford (34, 38) · DSU merging (43–49) · MST (41, 42, 44, 50) ·
Tarjan tin/low (51, 52) · Kosaraju SCC (53).

### One-Paragraph Takeaways
A short paragraph per PART (A–F) distilling the ONE idea each part is teaching.

### Exam Checklist — How To Recognize On The Spot
An ASCII list, exactly like the BS guide's checklist, e.g.:
```text
Count/browse connected stuff in a grid or matrix?  -> BFS/DFS flood fill
Something spreads from multiple sources at once?   -> multi-source BFS
Dependencies / ordering / "prerequisites"?         -> topological sort (Kahn)
Shortest path on uniform cost?                     -> BFS
Shortest path, positive weights?                   -> Dijkstra
Negative weights?                                  -> Bellman-Ford
All pairs shortest?                                -> Floyd-Warshall
"Minimize the maximum edge/path"?                  -> binary search + BFS, or Dijkstra-variant
Merge groups dynamically / make connected / remove stones? -> DSU
"Edges/vertices whose removal disconnects"?        -> Tarjan tin/low
"Sets that are mutually reachable"?                -> Kosaraju SCC
```

### Complexity Cheat Sheet
A full `| # | Problem | Brute | Optimal |` table for all 53 problems, written in terms
of `V` and `E` (grids use `N = n*m`, `E ≈ 4N`).

### A Closing Note on How to Study This
4–6 bullets modeled on the BS guide's closing: memorize `clue → pattern → template`,
ask the four questions (is it a graph/grid? which representation? which traversal?
which primitive to reuse?), and re-derive BFS, Kahn's, Dijkstra, and DSU from scratch
until they are automatic.

---

## 7. Quality rules (final)

- Match the length, depth, and tone of `BinarySearch_31_Problems_StudyGuide.md`.
- No fluff, no filler, no repeated boilerplate — every problem adds new insight.
- Use tables anywhere two things are compared (BFS vs DFS, Dijkstra vs Prim, set vs
  PQ, DSU rank vs size, Kahn's vs DFS topo).
- Complexity claims must be narrated ("Time Complexity Calculation:"), never bare.
- Keep Java code correct and consistent in style (**no `Stack`**, use
  `ArrayDeque<Integer>`, `List<List<Integer>>`, `int[] dist`).
- The document must stand alone as a teaching artifact: someone who reads it start to
  finish should be able to whiteboard any of the 53 problems and justify the choice.

## 8. Output

Return **only** the Markdown of the generated study guide. No preamble, no notes
outside the file, no sign-off.