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






