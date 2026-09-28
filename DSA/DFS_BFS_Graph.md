# Graph Traversal — DFS & BFS

This question asks you to implement **DFS (Depth First Search)** and **BFS (Breadth First Search)** for an undirected graph.

The input is:

```java
int V
List<List<Integer>> edges
```

where `V` is the number of vertices and each edge contains two connected vertices.

---

## 1. First thing: Convert edges into an adjacency list

Suppose:

```text
V = 5

edges =
0 -- 1
0 -- 2
1 -- 3
2 -- 4
```

The edge list is:

```text
[0,1]
[0,2]
[1,3]
[2,4]
```

But traversal is much easier using an adjacency list:

```text
0 → [1, 2]
1 → [0, 3]
2 → [0, 4]
3 → [1]
4 → [2]
```

### Creating it

```java
List<List<Integer>> adjList = new ArrayList<>();

for (int i = 0; i < V; i++) {
    adjList.add(new ArrayList<>());
}
```

Then process every edge:

```java
for (List<Integer> edge : edges) {
    adjList.get(edge.get(0)).add(edge.get(1));
    adjList.get(edge.get(1)).add(edge.get(0));
}
```

Because this is an **undirected graph**, we add both directions.

```text
u → v
v → u
```

---

# 2. Why do we need `visited[]`?

Graphs can contain cycles.

Example:

```text
0 → 1
↑   ↓
└── 2
```

If we don't keep track of visited nodes:

```text
0 → 1 → 2 → 0 → 1 → 2 → ...
```

This would continue forever.

So:

```java
boolean[] vis = new boolean[V];
```

Initially:

```text
[false, false, false, false, false]
```

When we visit node `2`:

```java
vis[2] = true;
```

Now:

```text
[false, false, true, false, false]
```

---

# 3. DFS — Depth First Search

DFS means:

> **Go as deep as possible before coming back.**

For example:

```text
        0
       / \
      1   2
     / \
    3   4
```

Starting from `0`, DFS could be:

```text
0 → 1 → 3 → 4 → 2
```

The exact order depends on the order of the adjacency list.

---

# 4. DFS implementation

Your code:

```java
public void dfs(
    int node,
    List<List<Integer>> adj,
    boolean[] vis,
    List<Integer> ans
) {
    vis[node] = true;
    ans.add(node);

    for (int it : adj.get(node)) {
        if (!vis[it]) {
            dfs(it, adj, vis, ans);
        }
    }
}
```

The important sequence is:

```text
1. Mark current node visited
2. Add current node to answer
3. Visit every unvisited neighbour
4. Recursively continue
```

---

# 5. Why mark visited BEFORE recursion?

This is important.

You do:

```java
vis[node] = true;
```

before:

```java
dfs(it, ...);
```

Suppose:

```text
0 -- 1
|    |
└----2
```

When DFS reaches `0`:

```text
vis[0] = true
```

Then it goes to `1`.

From `1`, it sees `0`.

But:

```java
if (!vis[0])
```

is false.

So it doesn't go back to `0`.

This prevents cycles.

---

# 6. Why do we have this loop?

Your DFS starts with:

```java
for (int i = 0; i < V; i++) {
    if (!vis[i]) {
        dfs(i, adjList, vis, ans);
    }
}
```

This is **very important**.

It handles a **disconnected graph**.

Example:

```text
0 -- 1 -- 2

3 -- 4
```

Starting DFS only from `0` gives:

```text
0 1 2
```

You would never reach `3` and `4`.

The outer loop solves that:

```text
i = 0 → DFS component 1

i = 1 → already visited
i = 2 → already visited

i = 3 → DFS component 2

i = 4 → already visited
```

So the final traversal covers **every vertex**.

---

# 7. BFS — Breadth First Search

BFS means:

> **Visit nodes level by level.**

Using:

```java
Queue<Integer> q = new LinkedList<>();
```

Example:

```text
        0
       / \
      1   2
     / \
    3   4
```

BFS:

```text
0 → 1 → 2 → 3 → 4
```

It processes:

```text
Level 0: 0
Level 1: 1, 2
Level 2: 3, 4
```

---

# 8. BFS implementation

Your code:

```java
public void bfs(
    int node,
    List<List<Integer>> adj,
    boolean[] vis,
    List<Integer> ans
) {
    Queue<Integer> q = new LinkedList<>();

    q.offer(node);
    vis[node] = true;

    while (!q.isEmpty()) {

        node = q.poll();
        ans.add(node);

        for (int adjNode : adj.get(node)) {

            if (!vis[adjNode]) {
                vis[adjNode] = true;
                q.offer(adjNode);
            }
        }
    }
}
```

The important sequence is:

```text
1. Put starting node in queue
2. Mark it visited
3. Remove a node from queue
4. Add it to answer
5. Add its unvisited neighbours to queue
6. Repeat
```

---

# 9. Why mark BFS nodes visited when adding to queue?

This is a very important interview detail.

You correctly do:

```java
if (!vis[adjNode]) {
    vis[adjNode] = true;
    q.offer(adjNode);
}
```

rather than waiting until:

```java
node = q.poll();
```

Why?

Consider:

```text
    0
   / \
  1---2
```

When processing `0`:

```text
queue = [1, 2]
```

Both are marked visited.

Then when processing `1`, it sees `2`.

Since `2` is already marked:

```text
vis[2] == true
```

we don't add `2` again.

This prevents duplicate entries in the queue.

---

# 10. DFS vs BFS

|                     | DFS               | BFS            |
| ------------------- | ----------------- | -------------- |
| Meaning             | Depth First       | Breadth First  |
| Main structure      | Stack / Recursion | Queue          |
| Goes                | Deep first        | Level by level |
| Your implementation | Recursion         | Queue          |
| Space               | `O(V)`            | `O(V)`         |
| Time                | `O(V + E)`        | `O(V + E)`     |

---

# 11. Why DFS is `O(V + E)`

You have:

```text
V = number of vertices
E = number of edges
```

Creating the adjacency list:

```text
O(V)
```

Processing edges:

```text
O(E)
```

DFS:

```text
O(V + E)
```

The outer loop doesn't make it `O(V²)` because once a node is visited, we don't process its DFS again.

Therefore:

```text
DFS = O(V + E)
```

---

# 12. Why BFS is `O(V + E)`

Same reasoning.

Every vertex is processed once:

```text
O(V)
```

Every edge is examined through the adjacency lists:

```text
O(E)
```

Therefore:

```text
BFS = O(V + E)
```

---

# 13. Space complexity

### Adjacency list

You store every vertex and every edge:

```text
O(V + E)
```

### Visited array

```text
O(V)
```

### DFS recursion

Worst case, graph looks like:

```text
0 → 1 → 2 → 3 → 4 → ... → V
```

Recursion depth:

```text
O(V)
```

Therefore DFS auxiliary space:

```text
O(V)
```

### BFS queue

In the worst case, the queue can contain `O(V)` nodes.

So:

```text
BFS auxiliary space = O(V)
```

Including the adjacency list:

```text
Total space = O(V + E)
```

---

# 14. The complete mental template

For **DFS on a graph**, remember:

```text
Create adjacency list
        ↓
Create visited[]
        ↓
for every vertex
        ↓
if not visited
        ↓
DFS
        ↓
mark visited
        ↓
add to answer
        ↓
visit unvisited neighbours
```

For **BFS**:

```text
Create adjacency list
        ↓
Create visited[]
        ↓
for every vertex
        ↓
if not visited
        ↓
put node in Queue
        ↓
mark visited
        ↓
while Queue not empty
        ↓
poll
        ↓
add to answer
        ↓
add unvisited neighbours
```

---

# 15. Interview explanation

If the interviewer asks **"Explain your approach"**, you can say:

> "First, I convert the edge list into an adjacency list because it allows me to efficiently access all neighbours of a vertex. Since the graph can be disconnected, I iterate through every vertex and start a traversal whenever I find an unvisited vertex."

For DFS:

> "For DFS, I use recursion. When I visit a node, I mark it as visited and add it to the answer. Then I recursively visit all its unvisited neighbours. The visited array prevents infinite loops in cyclic graphs."

For BFS:

> "For BFS, I use a queue. I add the starting node to the queue and mark it visited. Then I repeatedly remove a node, add it to the answer, and add all its unvisited neighbours to the queue."

And for complexity:

> "Building the adjacency list takes O(V + E), and both DFS and BFS also take O(V + E), because every vertex and edge is processed at most a constant number of times. The space complexity is O(V + E) for the adjacency list, with O(V) additional space for visited and the traversal structure."

---

## One thing to notice in your code

Your DFS and BFS implementations are **correct for an undirected graph**.

The most important pieces to remember are:

```java
// Undirected graph
adjList.get(u).add(v);
adjList.get(v).add(u);
```

```java
// DFS
vis[node] = true;
```

```java
// BFS
vis[node] = true;
q.offer(node);
```

And:

```java
for (int i = 0; i < V; i++) {
    if (!vis[i]) {
        // start another traversal
    }
}
```

That last loop is what makes your implementation work for **disconnected graphs**.
