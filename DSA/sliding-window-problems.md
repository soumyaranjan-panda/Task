# Sliding Window & Two Pointers — Problem List

Striver A2Z · Step 10 · 12 problems (8 Medium + 4 Hard)

Progress: `[ ] 0 / 12`

---

## Medium (8)

- [ ] **1. Longest Substring Without Repeating Characters** — Pattern A · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/length-of-longest-substring-without-any-repeating-character/

- [ ] **2. Max Consecutive Ones III** — Pattern A · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/max-consecutive-ones-iii/

- [ ] **3. Fruit Into Baskets** — Pattern A · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/fruit-into-baskets/

- [ ] **4. Longest Repeating Character Replacement** — Pattern A · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/longest-repeating-character-replacement/

- [ ] **5. Binary Subarrays With Sum** — Pattern C · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/binary-subarray-with-sum/

- [ ] **6. Count Number of Nice Subarrays** — Pattern C · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/count-number-of-nice-subarrays/

- [ ] **7. Number of Substrings Containing All Three Characters** — Pattern A · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/number-of-substring-containing-all-three-characters/

- [ ] **8. Maximum Points You Can Obtain from Cards** — Pattern B · Time O(n) · Space O(1)
  - TUF: https://takeuforward.org/data-structure/maximum-point-you-can-obtain-from-cards/

## Hard (4)

- [ ] **9. Longest Substring with At Most K Distinct Characters** — Pattern A · Time O(n) · Space O(k)
  - TUF: https://takeuforward.org/data-structure/longest-substring-with-at-most-k-distinct-characters/

- [ ] **10. Subarrays with K Different Integers** — Pattern C · Time O(n) · Space O(k)
  - TUF: https://takeuforward.org/data-structure/subarray-with-k-different-integers/

- [ ] **11. Minimum Window Substring** — Pattern D · Time O(n+m) · Space O(m)
  - LeetCode (no TUF article): https://leetcode.com/problems/minimum-window-substring/

- [ ] **12. Minimum Window Subsequence** — Pattern D · Time O(n·m) · Space O(1)
  - LeetCode (no TUF article): https://leetcode.com/problems/minimum-window-subsequence/

---

## The 4 patterns

- **A · Variable-size window** — expand right, shrink while invalid; answer = max(r − l + 1). → Problems 1, 2, 3, 4, 9
- **B · Fixed window (complement)** — take from ends ⇔ drop a middle block of size n − k, minimize it. → Problem 8
- **C · atMost(k) − atMost(k−1)** — count subarrays with *exactly* k = (≤ k) − (≤ k−1). → Problems 5, 6, 10
- **D · Satisfied-window** — expand until missing == 0, shrink while covered, track smallest. → Problems 11, 12

## Suggested order

1 → 2 → 3 → 4 → 8 → 5 → 6 → 7 → 9 → 10 → 11 → 12