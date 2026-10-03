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
