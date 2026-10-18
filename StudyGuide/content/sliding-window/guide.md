# Sliding Window & Two Pointers

**Striver A2Z · Step 10**

All 12 problems from the A2Z sheet, with the underlying pattern for each, working code in C++ / Java / Python, and complexity notes. Tick a problem to track your progress — it saves automatically in your browser.

| Problems | Medium | Hard | Patterns |
| --- | --- | --- | --- |
| 12 | 8 | 4 | 4 |

# PART 1 — Patterns

## Pattern A — Variable-size window

Expand the right pointer into the window; while the window breaks the rule, shrink from the left. For "longest valid window", the answer is **max(r − l + 1)**.

```cpp
int l = 0, ans = 0;
for (int r = 0; r < n; ++r) {
    addToWindow(nums[r]);              // grow window
    while (windowIsInvalid()) {        // shrink until valid again
        removeFromWindow(nums[l++]);
    }
    ans = max(ans, r - l + 1);         // [l..r] is a valid window
}
```

```java
int l = 0, ans = 0;
for (int r = 0; r < n; ++r) {
    addToWindow(nums[r]);              // grow window
    while (windowIsInvalid()) {        // shrink until valid again
        removeFromWindow(nums[l++]);
    }
    ans = Math.max(ans, r - l + 1);    // [l..r] is a valid window
}
```

```python
l = ans = 0
for r in range(n):
    add_to_window(nums[r])             # grow window
    while window_is_invalid():         # shrink until valid again
        remove_from_window(nums[l])
        l += 1
    ans = max(ans, r - l + 1)          # [l..r] is a valid window
```

*Applies to: Problems 1, 2, 3, 4, 9*

## Pattern C — atMost(k) − atMost(k−1)

To count subarrays with **exactly** k of something, count those with **at most** k and subtract those with **at most** k−1. Turns the same-looking counting problems into one easy slide.

```cpp
int atMost(int k) {
    int l = 0, ans = 0, have = 0;
    for (int r = 0; r < n; ++r) {
        addToWindow(nums[r]);
        while (have > k) removeFromWindow(nums[l++]);
        ans += r - l + 1;              // all subarrays ending at r
    }
    return ans;                        // count of windows with <= k
}
// exact answer = atMost(k) - atMost(k - 1)
```

```java
int atMost(int k) {
    int l = 0, ans = 0, have = 0;
    for (int r = 0; r < n; ++r) {
        addToWindow(nums[r]);
        while (have > k) removeFromWindow(nums[l++]);
        ans += r - l + 1;              // all subarrays ending at r
    }
    return ans;                        // count of windows with <= k
}
// exact answer = atMost(k) - atMost(k - 1)
```

```python
def at_most(k):
    l = ans = have = 0
    for r in range(n):
        add_to_window(nums[r])
        while have > k:
            remove_from_window(nums[l])
            l += 1
        ans += r - l + 1               # all subarrays ending at r
    return ans                         # count of windows with <= k
# exact answer = at_most(k) - at_most(k - 1)
```

*Applies to: Problems 5, 6, 10*

## Pattern B — Fixed window — the complement trick

Taking k cards from both ends is the same as dropping one contiguous middle block of size **n − k**. Sweep that fixed-size window and track its minimum — answer = total − min.

*Applies to: Problem 8*

## Pattern D — Satisfied-window (minimum window)

Expand the right pointer until every required element is covered (**missing == 0**), record the window, then shrink the left pointer while it stays covered. Track the smallest window seen.

*Applies to: Problems 11, 12*

> **When to reach for sliding window:** the problem talks about a **substring / subarray**, asks for the **longest / shortest / number of** them, and the constraint is a cap like **at most k**, **distinct characters**, or a fixed character set. If it's "number of subarrays satisfying exactly X", add the atMost(k) trick. If it's "minimum substring containing some character set", it's the satisfied-window pattern. Nothing here needs O(n²) — that's the whole point.

# PART 2 — Problems

## 01. Longest Substring Without Repeating Characters

**Medium · Pattern A · [TUF · Article](https://takeuforward.org/data-structure/length-of-longest-substring-without-any-repeating-character/)**

**The idea.** keep a window with all unique characters. The moment a character repeats inside the window, jump the left edge just past its previous occurrence.

**Steps**

- Store the **last index** of every character as you scan.
- For each **right**, if `s[right]` was last seen at index **p ≥ left**, set **left = p + 1**.
- Window is valid, so record **right − left + 1** and keep the max.
- Works because the window only ever holds unique characters — no shrink loop needed.

**Complexity.** Time · O(n) · Space · O(1) — 128-sized array

```cpp
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> last(128, -1);
        int l = 0, best = 0;
        for (int r = 0; r < s.size(); ++r) {
            if (last[s[r]] >= l) l = last[s[r]] + 1;   // jump past the repeat
            last[s[r]] = r;                             // remember this position
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

```java
import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        int[] last = new int[128];
        Arrays.fill(last, -1);
        int l = 0, best = 0;
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            if (last[c] >= l) l = last[c] + 1;
            last[c] = r;
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
```

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last = {}
        l = best = 0
        for r, ch in enumerate(s):
            if last.get(ch, -1) >= l:
                l = last[ch] + 1
            last[ch] = r
            best = max(best, r - l + 1)
        return best
```

## 02. Max Consecutive Ones III

**Medium · Pattern A · [TUF · Article](https://takeuforward.org/data-structure/max-consecutive-ones-iii/)**

**The idea.** a valid window contains at most **k zeroes** (those get flipped). Count the zeroes inside the window and shrink while the count exceeds k. It's "longest subarray with at most k zeroes".

**Steps**

- Expand **right**; if the new element is **0**, increment **zeros**.
- While **zeros > k**: if the element leaving at **left** is a 0, decrement; move **left**.
- Record **max(right − left + 1)** at each step.

**Complexity.** Time · O(n) · Space · O(1)

```cpp
class Solution {
public:
    int longestOnes(vector<int>& nums, int k) {
        int l = 0, zeros = 0, best = 0;
        for (int r = 0; r < nums.size(); ++r) {
            if (nums[r] == 0) ++zeros;
            while (zeros > k) {              // too many flips needed
                if (nums[l++] == 0) --zeros;
            }
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

```java
class Solution {
    public int longestOnes(int[] nums, int k) {
        int l = 0, zeros = 0, best = 0;
        for (int r = 0; r < nums.length; r++) {
            if (nums[r] == 0) zeros++;
            while (zeros > k) {
                if (nums[l] == 0) zeros--;
                l++;
            }
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
```

```python
from typing import List

class Solution:
    def longestOnes(self, nums: List[int], k: int) -> int:
        l = zeros = best = 0
        for r in range(len(nums)):
            if nums[r] == 0:
                zeros += 1
            while zeros > k:
                if nums[l] == 0:
                    zeros -= 1
                l += 1
            best = max(best, r - l + 1)
        return best
```

## 03. Fruit Into Baskets

**Medium · Pattern A · K=2 · [TUF · Article](https://takeuforward.org/data-structure/fruit-into-baskets/)**

**The idea.** two baskets mean the window may hold at most **2 distinct fruit types**. Count each type; when more than 2 types appear, shrink the left edge until one type is fully removed.

**Steps**

- Maintain a frequency map of the window.
- Add **fruits[right]**; while **map.size() > 2**, drop **fruits[left++]** (erase the type if its count hits 0).
- Track **max(right − left + 1)**.
- This is exactly "Longest Substring with At Most K Distinct" with K = 2.

**Complexity.** Time · O(n) · Space · O(1) — at most 3 keys

```cpp
class Solution {
public:
    int totalFruit(vector<int>& fruits) {
        unordered_map<int, int> cnt;
        int l = 0, best = 0;
        for (int r = 0; r < fruits.size(); ++r) {
            ++cnt[fruits[r]];
            while (cnt.size() > 2) {             // two baskets only
                if (--cnt[fruits[l]] == 0) cnt.erase(fruits[l]);
                ++l;
            }
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

```java
import java.util.*;

class Solution {
    public int totalFruit(int[] fruits) {
        Map<Integer, Integer> cnt = new HashMap<>();
        int l = 0, best = 0;
        for (int r = 0; r < fruits.length; r++) {
            cnt.merge(fruits[r], 1, Integer::sum);
            while (cnt.size() > 2) {
                if (cnt.merge(fruits[l], -1, Integer::sum) == 0)
                    cnt.remove(fruits[l]);
                l++;
            }
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
```

```python
from typing import List

class Solution:
    def totalFruit(self, fruits: List[int]) -> int:
        cnt = {}
        l = best = 0
        for r, f in enumerate(fruits):
            cnt[f] = cnt.get(f, 0) + 1
            while len(cnt) > 2:
                cnt[fruits[l]] -= 1
                if cnt[fruits[l]] == 0:
                    del cnt[fruits[l]]
                l += 1
            best = max(best, r - l + 1)
        return best
```

## 04. Longest Repeating Character Replacement

**Medium · Pattern A · [TUF · Article](https://takeuforward.org/data-structure/longest-repeating-character-replacement/)**

**The idea.** a window can be made uniform with ≤ k replacements iff **window length − max frequency ≤ k**. Shrink otherwise.

**Steps**

- Count letter frequencies inside the window; track **maxCount** = most frequent letter.
- If **(r − l + 1) − maxCount > k**, the other letters can't be replaced into the majority — shrink.
- Key insight: **maxCount never needs to decrease** — the window only ever grows when it would remain valid, so keeping the global max is correct and gives O(n).

**Complexity.** Time · O(n) · Space · O(1) — 26 counts

```cpp
class Solution {
public:
    int characterReplacement(string s, int k) {
        vector<int> cnt(26, 0);
        int l = 0, maxCount = 0, best = 0;
        for (int r = 0; r < s.size(); ++r) {
            maxCount = max(maxCount, ++cnt[s[r] - 'A']);
            if (r - l + 1 - maxCount > k) {    // more than k "other" letters
                --cnt[s[l] - 'A'];
                ++l;
            }
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

```java
class Solution {
    public int characterReplacement(String s, int k) {
        int[] cnt = new int[26];
        int l = 0, maxCount = 0, best = 0;
        for (int r = 0; r < s.length(); r++) {
            maxCount = Math.max(maxCount, ++cnt[s.charAt(r) - 'A']);
            if (r - l + 1 - maxCount > k) {
                cnt[s.charAt(l) - 'A']--;
                l++;
            }
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
```

```python
from collections import Counter

class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        cnt = Counter()
        l = maxCount = best = 0
        for r, ch in enumerate(s):
            cnt[ch] += 1
            maxCount = max(maxCount, cnt[ch])
            if r - l + 1 - maxCount > k:
                cnt[s[l]] -= 1
                l += 1
            best = max(best, r - l + 1)
        return best
```

## 05. Binary Subarrays With Sum

**Medium · Pattern C · [TUF · Article](https://takeuforward.org/data-structure/binary-subarray-with-sum/)**

**The idea.** count of subarrays with **exactly** sum = goal is **atMost(goal) − atMost(goal − 1)**. The `atMost` helper is a plain slide that works because all values are non-negative.

**Steps**

- `atMost(goal)`: add the right element; while **sum > goal**, subtract the left and advance **l**.
- Every window **[l..r]** then has sum ≤ goal → contributes **r − l + 1** subarrays.
- Answer = `atMost(goal) − atMost(goal − 1)` (guard `goal − 1 < 0`).
- Alternative for the same O(n): prefix sums + hashmap.

**Complexity.** Time · O(n) · Space · O(1)

```cpp
class Solution {
public:
    int numSubarraysWithSum(vector<int>& nums, int goal) {
        return atMost(nums, goal) - atMost(nums, goal - 1);
    }
private:
    int atMost(vector<int>& nums, int goal) {
        if (goal < 0) return 0;
        int l = 0, sum = 0, ans = 0;
        for (int r = 0; r < nums.size(); ++r) {
            sum += nums[r];
            while (sum > goal) sum -= nums[l++];
            ans += r - l + 1;
        }
        return ans;
    }
};
```

```java
class Solution {
    public int numSubarraysWithSum(int[] nums, int goal) {
        return atMost(nums, goal) - atMost(nums, goal - 1);
    }
    private int atMost(int[] nums, int goal) {
        if (goal < 0) return 0;
        int l = 0, sum = 0, ans = 0;
        for (int r = 0; r < nums.length; r++) {
            sum += nums[r];
            while (sum > goal) sum -= nums[l++];
            ans += r - l + 1;
        }
        return ans;
    }
}
```

```python
from typing import List

class Solution:
    def numSubarraysWithSum(self, nums: List[int], goal: int) -> int:
        return self.atMost(nums, goal) - self.atMost(nums, goal - 1)

    def atMost(self, nums: List[int], goal: int) -> int:
        if goal < 0:
            return 0
        l = ans = total = 0
        for r in range(len(nums)):
            total += nums[r]
            while total > goal:
                total -= nums[l]
                l += 1
            ans += r - l + 1
        return ans
```

## 06. Count Number of Nice Subarrays

**Medium · Pattern C · 0/1 trick · [TUF · Article](https://takeuforward.org/data-structure/count-number-of-nice-subarrays/)**

**The idea.** replace each element with **1 if odd, 0 if even**. This becomes literally "Binary Subarrays With Sum" with **goal = k** — reuse the same atMost trick.

**Steps**

- Count "odd so far" in the window; `atMost(k)` counts subarrays with ≤ k odds.
- While **odd > k**, advance the left edge, dropping the exiting element's parity.
- Add **r − l + 1** each step; answer = atMost(k) − atMost(k−1).
- Nice shortcut: the same helper also solves LC 930 and LC 992.

**Complexity.** Time · O(n) · Space · O(1)

```cpp
class Solution {
public:
    int numberOfSubarrays(vector<int>& nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }
private:
    int atMost(vector<int>& nums, int k) {
        int l = 0, odd = 0, ans = 0;
        for (int r = 0; r < nums.size(); ++r) {
            odd += nums[r] & 1;             // 1 if odd, 0 if even
            while (odd > k) odd -= nums[l++] & 1;
            ans += r - l + 1;
        }
        return ans;
    }
};
```

```java
class Solution {
    public int numberOfSubarrays(int[] nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }
    private int atMost(int[] nums, int k) {
        int l = 0, odd = 0, ans = 0;
        for (int r = 0; r < nums.length; r++) {
            odd += nums[r] & 1;
            while (odd > k) odd -= nums[l++] & 1;
            ans += r - l + 1;
        }
        return ans;
    }
}
```

```python
from typing import List

class Solution:
    def numberOfSubarrays(self, nums: List[int], k: int) -> int:
        return self.atMost(nums, k) - self.atMost(nums, k - 1)

    def atMost(self, nums: List[int], k: int) -> int:
        l = odd = ans = 0
        for r in range(len(nums)):
            odd += nums[r] % 2
            while odd > k:
                odd -= nums[l] % 2
                l += 1
            ans += r - l + 1
        return ans
```

## 07. Number of Substrings Containing All Three Characters

**Medium · Pattern A · count extensions · [TUF · Article](https://takeuforward.org/data-structure/number-of-substring-containing-all-three-characters/)**

**The idea.** once window **[l..r]** contains all of a, b, c, any substring starting even earlier and ending at r is also valid — so add the left count in bulk.

**Steps**

- Expand **r**, counting letters in the window.
- While all three counts are positive, shrink **l** (the small window stays "barely valid").
- Each step adds **l** valid substrings ending at r (starting positions 0..l−1).
- O(n) — a single pass, no nested loops.

**Complexity.** Time · O(n) · Space · O(1) — 3 counters

```cpp
class Solution {
public:
    int numberOfSubstrings(string s) {
        int cnt[3] = {0}, l = 0, ans = 0;
        for (int r = 0; r < s.size(); ++r) {
            ++cnt[s[r] - 'a'];
            while (cnt[0] && cnt[1] && cnt[2]) {   // all three present
                --cnt[s[l] - 'a'];
                ++l;
            }
            ans += l;                       // substrings [0..l-1]..r are valid
        }
        return ans;
    }
};
```

```java
class Solution {
    public int numberOfSubstrings(String s) {
        int[] cnt = new int[3];
        int l = 0, ans = 0;
        for (int r = 0; r < s.length(); r++) {
            cnt[s.charAt(r) - 'a']++;
            while (cnt[0] > 0 && cnt[1] > 0 && cnt[2] > 0) {
                cnt[s.charAt(l) - 'a']--;
                l++;
            }
            ans += l;
        }
        return ans;
    }
}
```

```python
class Solution:
    def numberOfSubstrings(self, s: str) -> int:
        cnt = [0, 0, 0]
        l = ans = 0
        for r, ch in enumerate(s):
            cnt[(ord(ch) - ord('a')) % 3] += 1          # a,b,c -> 0,1,2
            while cnt[0] > 0 and cnt[1] > 0 and cnt[2] > 0:
                cnt[(ord(s[l]) - ord('a')) % 3] -= 1
                l += 1
            ans += l
        return ans
```

## 08. Maximum Points You Can Obtain from Cards

**Medium · Pattern B · [TUF · Article](https://takeuforward.org/data-structure/maximum-point-you-can-obtain-from-cards/)**

**The idea.** taking k cards from the ends ⇔ you skip a contiguous block of size **n − k** in the middle. Minimize that middle block over a fixed-size window.

**Steps**

- Let **keep = n − k** — the cards you skip.
- Slide a fixed window of length **keep**, tracking its running sum.
- Remember the **minimum** middle sum; the answer is **total − minMiddle**.
- Alternative two-pointer: take all k from the left, then repeatedly trade a left card for the next right card.

**Complexity.** Time · O(n) · Space · O(1)

```cpp
class Solution {
public:
    int maxScore(vector<int>& cardPoints, int k) {
        int n = cardPoints.size(), keep = n - k;
        int total = 0, window = 0, minWindow = INT_MAX;
        for (int r = 0; r < n; ++r) {
            total += cardPoints[r];
            window += cardPoints[r];
            if (r >= keep) window -= cardPoints[r - keep];
            if (r >= keep - 1) minWindow = min(minWindow, window);
        }
        return total - minWindow;      // drop the cheapest middle block
    }
};
```

```java
class Solution {
    public int maxScore(int[] cardPoints, int k) {
        int n = cardPoints.length, keep = n - k;
        int total = 0, window = 0, minWindow = Integer.MAX_VALUE;
        for (int r = 0; r < n; r++) {
            total += cardPoints[r];
            window += cardPoints[r];
            if (r >= keep) window -= cardPoints[r - keep];
            if (r >= keep - 1) minWindow = Math.min(minWindow, window);
        }
        return total - minWindow;
    }
}
```

```python
from typing import List

class Solution:
    def maxScore(self, cardPoints: List[int], k: int) -> int:
        n = len(cardPoints)
        keep = n - k                    # middle cards we must skip
        total = sum(cardPoints)
        window = 0
        min_window = total
        for r in range(n):
            window += cardPoints[r]
            if r >= keep:
                window -= cardPoints[r - keep]
            if r >= keep - 1:
                min_window = min(min_window, window)
        return total - min_window
```

## 09. Longest Substring with At Most K Distinct Characters

**Hard · Pattern A · [TUF · Article](https://takeuforward.org/data-structure/longest-substring-with-at-most-k-distinct-characters/)**

**The idea.** the generalized Fruit Into Baskets — the window may hold **at most k distinct** characters. Count frequencies, shrink while the distinct count exceeds k.

**Steps**

- Add **s[right]** and update its frequency.
- While the number of distinct characters is **> k**, drop **s[left++]** (erase when count reaches 0).
- Track **max(right − left + 1)**.
- Setting k = 0 gives the trivial single-letter case for free; k = 2 is LC 904.

**Complexity.** Time · O(n) · Space · O(k)

```cpp
class Solution {
public:
    int lengthOfLongestSubstringKDistinct(string s, int k) {
        unordered_map<char, int> cnt;
        int l = 0, best = 0;
        for (int r = 0; r < s.size(); ++r) {
            ++cnt[s[r]];
            while (cnt.size() > k) {
                if (--cnt[s[l]] == 0) cnt.erase(s[l]);
                ++l;
            }
            best = max(best, r - l + 1);
        }
        return best;
    }
};
```

```java
import java.util.*;

class Solution {
    public int lengthOfLongestSubstringKDistinct(String s, int k) {
        Map<Character, Integer> cnt = new HashMap<>();
        int l = 0, best = 0;
        for (int r = 0; r < s.length(); r++) {
            cnt.merge(s.charAt(r), 1, Integer::sum);
            while (cnt.size() > k) {
                char c = s.charAt(l);
                if (cnt.merge(c, -1, Integer::sum) == 0) cnt.remove(c);
                l++;
            }
            best = Math.max(best, r - l + 1);
        }
        return best;
    }
}
```

```python
class Solution:
    def lengthOfLongestSubstringKDistinct(self, s: str, k: int) -> int:
        cnt = {}
        l = best = 0
        for r, ch in enumerate(s):
            cnt[ch] = cnt.get(ch, 0) + 1
            while len(cnt) > k:
                cnt[s[l]] -= 1
                if cnt[s[l]] == 0:
                    del cnt[s[l]]
                l += 1
            best = max(best, r - l + 1)
        return best
```

## 10. Subarrays with K Different Integers

**Hard · Pattern C · distinct · [TUF · Article](https://takeuforward.org/data-structure/subarray-with-k-different-integers/)**

**The idea.** "exactly k distinct" → **atMost(k) − atMost(k−1)**, where atMost slides windows with ≤ k distinct elements.

**Steps**

- `atMost(k)`: maintain frequencies; while distinct count > k, drop **nums[left++]**.
- Every valid window ending at r adds **r − l + 1**.
- Answer = `atMost(k) − atMost(k − 1)`.
- It's LC-Hard only because of the exact-count wording; the trick makes it a copy of LC 930 / 1248.

**Complexity.** Time · O(n) · Space · O(k)

```cpp
class Solution {
public:
    int subarraysWithKDistinct(vector<int>& nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }
private:
    int atMost(vector<int>& nums, int k) {
        unordered_map<int, int> cnt;
        int l = 0, ans = 0;
        for (int r = 0; r < nums.size(); ++r) {
            ++cnt[nums[r]];
            while (cnt.size() > k) {
                if (--cnt[nums[l]] == 0) cnt.erase(nums[l]);
                ++l;
            }
            ans += r - l + 1;
        }
        return ans;
    }
};
```

```java
import java.util.*;

class Solution {
    public int subarraysWithKDistinct(int[] nums, int k) {
        return atMost(nums, k) - atMost(nums, k - 1);
    }
    private int atMost(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        int l = 0, ans = 0;
        for (int r = 0; r < nums.length; r++) {
            cnt.merge(nums[r], 1, Integer::sum);
            while (cnt.size() > k) {
                if (cnt.merge(nums[l], -1, Integer::sum) == 0) cnt.remove(nums[l]);
                l++;
            }
            ans += r - l + 1;
        }
        return ans;
    }
}
```

```python
from typing import List

class Solution:
    def subarraysWithKDistinct(self, nums: List[int], k: int) -> int:
        return self.atMost(nums, k) - self.atMost(nums, k - 1)

    def atMost(self, nums: List[int], k: int) -> int:
        cnt = {}
        l = ans = 0
        for r, v in enumerate(nums):
            cnt[v] = cnt.get(v, 0) + 1
            while len(cnt) > k:
                cnt[nums[l]] -= 1
                if cnt[nums[l]] == 0:
                    del cnt[nums[l]]
                l += 1
            ans += r - l + 1
        return ans
```

## 11. Minimum Window Substring

**Hard · Pattern D · [LC 76](https://leetcode.com/problems/minimum-window-substring/)**

**The idea.** the canonical "satisfied-window" problem. Track how many characters of t are still missing; expand until missing = 0, then shrink while it stays covered, keeping the smallest window.

**Steps**

- Count each char of t into **need[]**; set **missing = len(t)**.
- Expand **r**: if **need[s[r]] > 0**, this char was required, so **--missing**; always **--need[s[r]]** (may go negative for surplus chars).
- While **missing == 0**: update best window, then **++need[s[l]]** and shrink — if that char becomes required again, **++missing**.
- Result: O(n + m); the two-pointer never resets.

**Complexity.** Time · O(n + m) · Space · O(m) — m = |t|

```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        int need[128] = {}, missing = t.size(), best = INT_MAX, start = 0;
        for (char c : t) ++need[c];
        for (int l = 0, r = 0; r < s.size(); ++r) {
            if (need[s[r]] > 0) --missing;    // this char was required
            --need[s[r]];
            while (missing == 0) {
                if (r - l + 1 < best) { best = r - l + 1; start = l; }
                ++need[s[l]];
                if (need[s[l]] > 0) ++missing; // char now required again
                ++l;
            }
        }
        return best == INT_MAX ? "" : s.substr(start, best);
    }
};
```

```java
class Solution {
    public String minWindow(String s, String t) {
        int[] need = new int[128];
        int missing = t.length(), best = Integer.MAX_VALUE, start = 0;
        for (char c : t.toCharArray()) need[c]++;
        for (int l = 0, r = 0; r < s.length(); r++) {
            if (need[s.charAt(r)] > 0) missing--;
            need[s.charAt(r)]--;
            while (missing == 0) {
                if (r - l + 1 < best) { best = r - l + 1; start = l; }
                need[s.charAt(l)]++;
                if (need[s.charAt(l)] > 0) missing++;
                l++;
            }
        }
        return best == Integer.MAX_VALUE ? "" : s.substring(start, start + best);
    }
}
```

```python
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need = Counter(t)
        missing = len(t)
        best = float("inf")
        start = l = 0
        for r, ch in enumerate(s):
            if need[ch] > 0:
                missing -= 1
            need[ch] -= 1
            while missing == 0:
                if r - l + 1 < best:
                    best = r - l + 1
                    start = l
                need[s[l]] += 1
                if need[s[l]] > 0:
                    missing += 1
                l += 1
        return "" if best == float("inf") else s[start:start + best]
```

## 12. Minimum Window Subsequence

**Hard · Pattern D · subsequence · [LC 727](https://leetcode.com/problems/minimum-window-subsequence/)**

**The idea.** unlike the substring version, t must appear as a **subsequence** within the window. For each candidate start, greedily expand right until t is fully matched, then walk the left edge back to the tightest start.

**Steps**

- Only positions where **s[i] == t[0]** can begin a window.
- Scan **j** forward, matching chars of t in order; if you reach the end of t, the window ends at **j − 1**.
- Now walk **end** leftwards, matching t from its last char back to t[0]; the window becomes **[end+1 .. j−1]**.
- Keep the smallest such window. Worst case O(n·m) (n = |s|, m = |t|), space O(1).

**Complexity.** Time · O(n·m) worst case · Space · O(1)

```cpp
class Solution {
public:
    string minWindow(string s, string t) {
        int n = s.size(), m = t.size();
        string best;
        for (int i = 0; i < n; ++i) {
            if (s[i] != t[0]) continue;         // window must start on t[0]
            int j = i, k = 0;
            while (j < n && k < m) {           // expand right to cover t
                if (s[j] == t[k]) ++k;
                ++j;
            }
            if (k < m) break;                   // t can't be matched anymore
            int end = j - 1;
            k = m - 1;
            while (k >= 0) {                    // walk left to tiny minimal
                if (s[end] == t[k]) --k;
                --end;
            }
            int len = j - end - 1;              // window is [end+1 .. j-1]
            if (best.empty() || len < (int)best.size()) best = s.substr(end + 1, len);
        }
        return best;
    }
};
```

```java
class Solution {
    public String minWindow(String s, String t) {
        String best = "";
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) != t.charAt(0)) continue;
            int j = i, k = 0;
            while (j < s.length() && k < t.length()) {
                if (s.charAt(j) == t.charAt(k)) k++;
                j++;
            }
            if (k < t.length()) break;
            int end = j - 1;
            k = t.length() - 1;
            while (k >= 0) {
                if (s.charAt(end) == t.charAt(k)) k--;
                end--;
            }
            String cand = s.substring(end + 1, j);
            if (best.isEmpty() || cand.length() < best.length()) best = cand;
        }
        return best;
    }
}
```

```python
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        best = ""
        for i, ch in enumerate(s):
            if ch != t[0]:
                continue
            j = k = 0           # j expands over s, k over t
            j = i
            while j < len(s) and k < len(t):
                if s[j] == t[k]:
                    k += 1
                j += 1
            if k < len(t):
                break
            end = j - 1         # right edge of the candidate window
            k = len(t) - 1
            while k >= 0:
                if s[end] == t[k]:
                    k -= 1
                end -= 1
            cand = s[end + 1:j]
            if best == "" or len(cand) < len(best):
                best = cand
        return best
```
