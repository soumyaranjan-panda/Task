# 106. Product Problems

## Table of Contents

- [Overview](#overview)
- [Sample Schema](#sample-schema)
- [Core Concepts](#core-concepts)
- [Product Catalog Queries](#product-catalog-queries)
- [Pricing and Inventory](#pricing-and-inventory)
- [Product Performance Analytics](#product-performance-analytics)
- [Product Hierarchies](#product-hierarchies)
- [Product Bundling and Kitting](#product-bundling-and-kitting)
- [Advanced Product Scenarios](#advanced-product-scenarios)
- [Common Mistakes](#common-mistakes)
- [Performance Considerations](#performance-considerations)
- [Interview Questions](#interview-questions)

---

## Overview

Product problems appear in SQL interviews because they test your ability to:

1. **Model real-world business entities** — products, categories, inventory, pricing
2. **Handle temporal data** — price changes, stock fluctuations over time
3. **Navigate complex relationships** — many-to-many between products and categories, parent-child hierarchies
4. **Aggregate correctly** — avoiding fan-out and double counting
5. **Think about grain** — each row's meaning changes depending on the table

> Interview trap: Many product problems fail because the candidate does not ask "What is the grain of this table?" before writing queries.

---

## Sample Schema

```sql
-- Products: one row per product
CREATE TABLE products (
    product_id    INT PRIMARY KEY,
    product_name  VARCHAR(100),
    category_id   INT,
    brand         VARCHAR(50),
    base_price    DECIMAL(10,2),
    status        VARCHAR(20),  -- 'active', 'discontinued', 'draft'
    created_at    TIMESTAMP
);

-- Categories: one row per category, self-referencing hierarchy
CREATE TABLE categories (
    category_id   INT PRIMARY KEY,
    category_name VARCHAR(100),
    parent_id     INT REFERENCES categories(category_id)
);

-- Inventory: one row per product per warehouse
CREATE TABLE inventory (
    product_id    INT,
    warehouse_id  INT,
    stock_qty     INT,
    reorder_point INT,
    last_updated  TIMESTAMP,
    PRIMARY KEY (product_id, warehouse_id)
);

-- Price history: one row per product per effective date
CREATE TABLE price_history (
    product_id    INT,
    effective_date DATE,
    price         DECIMAL(10,2),
    end_date      DATE,  -- NULL means currently active
    PRIMARY KEY (product_id, effective_date)
);

-- Orders: one row per order
CREATE TABLE orders (
    order_id      INT PRIMARY KEY,
    customer_id   INT,
    order_date    TIMESTAMP,
    status        VARCHAR(20)  -- 'placed', 'shipped', 'delivered', 'cancelled'
);

-- Order items: one row per line item per order
CREATE TABLE order_items (
    order_id      INT,
    product_id    INT,
    quantity      INT,
    unit_price    DECIMAL(10,2),
    discount      DECIMAL(10,2) DEFAULT 0,
    PRIMARY KEY (order_id, product_id)
);
```

**Grain declarations:**

| Table | Grain |
|-------|-------|
| products | One row per product |
| categories | One row per category |
| inventory | One row per product per warehouse |
| price_history | One row per product per price change |
| orders | One row per order |
| order_items | One row per product line item within an order |

---

## Core Concepts

### Grain Awareness

Every product query starts with one question: **What does one output row represent?**

```sql
-- WRONG: Mixing grains produces incorrect results
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS total_sold,
    COUNT(DISTINCT o.order_id) AS total_orders,
    i.stock_qty        -- This is from inventory; multiple rows per product
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
JOIN orders o ON o.order_id = oi.order_id
JOIN inventory i ON i.product_id = p.product_id  -- fan-out danger
GROUP BY p.product_id, p.product_name, i.stock_qty;
```

> Production pitfall: When `inventory` has multiple warehouses, joining it directly creates duplicates. Aggregate inventory first or use a subquery.

```sql
-- BETTER: Aggregate inventory separately
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS total_sold,
    COUNT(DISTINCT o.order_id) AS total_orders,
    inv.total_stock
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
JOIN orders o ON o.order_id = oi.order_id
LEFT JOIN (
    SELECT product_id, SUM(stock_qty) AS total_stock
    FROM inventory
    GROUP BY product_id
) inv ON inv.product_id = p.product_id
GROUP BY p.product_id, p.product_name, inv.total_stock;
```

### NULL in Product Context

Product data is full of NULLs:

- `end_date` in `price_history` is NULL for the current price
- `discount` in `order_items` might be NULL (not 0)
- `category_id` in `products` might be NULL for uncategorized products
- `reorder_point` might be NULL for products without reorder rules

```sql
-- NULL discount means "no discount applied" — treat as 0
SELECT
    product_id,
    SUM(quantity * (unit_price - COALESCE(discount, 0))) AS revenue
FROM order_items
GROUP BY product_id;
```

> Common misconception: `NULLIF(price, 0)` is useful to prevent division-by-zero, but `COALESCE(discount, 0)` is needed when NULL means "zero discount."

---

## Product Catalog Queries

### Find Products Never Ordered

```sql
-- Using NOT EXISTS (generally preferred)
SELECT p.product_id, p.product_name
FROM products p
WHERE NOT EXISTS (
    SELECT 1
    FROM order_items oi
    WHERE oi.product_id = p.product_id
);
```

```sql
-- Using LEFT JOIN + IS NULL
SELECT p.product_id, p.product_name
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.product_id
WHERE oi.product_id IS NULL;
```

```sql
-- Using NOT IN — DANGEROUS if order_items.product_id can be NULL
SELECT p.product_id, p.product_name
FROM products p
WHERE p.product_id NOT IN (
    SELECT oi.product_id
    FROM order_items oi
);
```

> Interview trap: If `order_items.product_id` can be NULL, `NOT IN` returns zero rows. `NOT EXISTS` is safe. This is the classic NULL + NOT IN trap — see the [NULL section](#) for full explanation.

**Comparison:**

| Approach | NULL-safe? | Readability | Performance depends on |
|----------|-----------|-------------|----------------------|
| NOT EXISTS | Yes | Good | Index on order_items.product_id |
| LEFT JOIN + IS NULL | Yes | Good | Index on order_items.product_id |
| NOT IN | **No** | Simple | Subquery result set, NULLs present |

### Products with Revenue Above Category Average

```sql
WITH product_revenue AS (
    SELECT
        p.product_id,
        p.product_name,
        p.category_id,
        SUM(oi.quantity * oi.unit_price) AS revenue
    FROM products p
    JOIN order_items oi ON oi.product_id = p.product_id
    GROUP BY p.product_id, p.product_name, p.category_id
),
category_avg AS (
    SELECT
        category_id,
        AVG(revenue) AS avg_revenue
    FROM product_revenue
    GROUP BY category_id
)
SELECT
    pr.product_id,
    pr.product_name,
    pr.revenue,
    ca.avg_revenue
FROM product_revenue pr
JOIN category_avg ca ON ca.category_id = pr.category_id
WHERE pr.revenue > ca.avg_revenue
ORDER BY pr.revenue DESC;
```

---

## Pricing and Inventory

### Current Price Using Price History

```sql
-- PostgreSQL approach
SELECT
    ph.product_id,
    ph.price AS current_price
FROM price_history ph
WHERE ph.end_date IS NULL;
```

```sql
-- Cross-database approach (latest effective date)
SELECT
    ph.product_id,
    ph.price AS current_price
FROM price_history ph
WHERE ph.effective_date = (
    SELECT MAX(ph2.effective_date)
    FROM price_history ph2
    WHERE ph2.product_id = ph.product_id
);
```

> PostgreSQL: You can also use `LATERAL JOIN` or window functions like `ROW_NUMBER()` for this.

### Price Change Percentage

```sql
WITH ranked_prices AS (
    SELECT
        product_id,
        effective_date,
        price,
        LAG(price) OVER (PARTITION BY product_id ORDER BY effective_date) AS prev_price
    FROM price_history
)
SELECT
    product_id,
    effective_date,
    prev_price,
    price,
    ROUND(
        (price - prev_price) / NULLIF(prev_price, 0) * 100, 2
    ) AS pct_change
FROM ranked_prices
WHERE prev_price IS NOT NULL;
```

> Note: `NULLIF(prev_price, 0)` prevents division by zero if a product was ever priced at $0.

### Low Stock Products

```sql
SELECT
    p.product_id,
    p.product_name,
    i.warehouse_id,
    i.stock_qty,
    i.reorder_point
FROM products p
JOIN inventory i ON i.product_id = p.product_id
WHERE i.stock_qty <= i.reorder_point
ORDER BY (i.reorder_point - i.stock_qty) DESC;
```

### Total Stock Across All Warehouses

```sql
SELECT
    p.product_id,
    p.product_name,
    SUM(i.stock_qty) AS total_stock,
    COUNT(i.warehouse_id) AS warehouse_count
FROM products p
LEFT JOIN inventory i ON i.product_id = p.product_id
GROUP BY p.product_id, p.product_name;
```

> Production pitfall: A `LEFT JOIN` here is correct because some products may have zero inventory rows. An `INNER JOIN` would silently exclude those products.

---

## Product Performance Analytics

### Top N Products by Revenue (Window Function Approach)

```sql
WITH product_revenue AS (
    SELECT
        p.product_id,
        p.product_name,
        p.category_id,
        SUM(oi.quantity * (oi.unit_price - COALESCE(oi.discount, 0))) AS revenue,
        ROW_NUMBER() OVER (ORDER BY SUM(oi.quantity * (oi.unit_price - COALESCE(oi.discount, 0))) DESC) AS rn
    FROM products p
    JOIN order_items oi ON oi.product_id = p.product_id
    GROUP BY p.product_id, p.product_name, p.category_id
)
SELECT *
FROM product_revenue
WHERE rn <= 10;
```

### Top Product Per Category

```sql
WITH product_revenue AS (
    SELECT
        p.product_id,
        p.product_name,
        p.category_id,
        SUM(oi.quantity * oi.unit_price) AS revenue,
        RANK() OVER (PARTITION BY p.category_id ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS rnk
    FROM products p
    JOIN order_items oi ON oi.product_id = p.product_id
    GROUP BY p.product_id, p.product_name, p.category_id
)
SELECT product_id, product_name, category_id, revenue
FROM product_revenue
WHERE rnk = 1;
```

> Interview trap: `RANK()` vs `DENSE_RANK()` vs `ROW_NUMBER()` — if two products tie for first in a category:
> - `RANK()` gives both rank 1, next product rank 3
> - `DENSE_RANK()` gives both rank 1, next product rank 2
> - `ROW_NUMBER()` arbitrarily picks one

### Month-over-Month Product Sales Growth

```sql
WITH monthly_sales AS (
    SELECT
        oi.product_id,
        DATE_TRUNC('month', o.order_date) AS month,
        SUM(oi.quantity * oi.unit_price) AS revenue
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    GROUP BY oi.product_id, DATE_TRUNC('month', o.order_date)
)
SELECT
    product_id,
    month,
    revenue,
    LAG(revenue) OVER (PARTITION BY product_id ORDER BY month) AS prev_month_revenue,
    ROUND(
        (revenue - LAG(revenue) OVER (PARTITION BY product_id ORDER BY month))
        / NULLIF(LAG(revenue) OVER (PARTITION BY product_id ORDER BY month), 0) * 100,
        2
    ) AS growth_pct
FROM monthly_sales
ORDER BY product_id, month;
```

> MySQL: Use `DATE_FORMAT(order_date, '%Y-%m-01')` or `DATE_SUB(order_date, INTERVAL DAYOFMONTH(order_date) - 1 DAY)` instead of `DATE_TRUNC`.

### Product Contribution to Category Revenue

```sql
WITH product_revenue AS (
    SELECT
        p.product_id,
        p.product_name,
        p.category_id,
        SUM(oi.quantity * oi.unit_price) AS revenue
    FROM products p
    JOIN order_items oi ON oi.product_id = p.product_id
    GROUP BY p.product_id, p.product_name, p.category_id
),
category_revenue AS (
    SELECT
        category_id,
        SUM(revenue) AS total_category_revenue
    FROM product_revenue
    GROUP BY category_id
)
SELECT
    pr.product_id,
    pr.product_name,
    pr.revenue,
    cr.total_category_revenue,
    ROUND(pr.revenue / cr.total_category_revenue * 100, 2) AS pct_of_category
FROM product_revenue pr
JOIN category_revenue cr ON cr.category_id = pr.category_id
ORDER BY pr.category_id, pct_of_category DESC;
```

---

## Product Hierarchies

### Recursive Category Hierarchy

```sql
WITH RECURSIVE category_tree AS (
    -- Anchor: top-level categories (no parent)
    SELECT
        category_id,
        category_name,
        parent_id,
        category_name AS full_path,
        1 AS depth
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive: children
    SELECT
        c.category_id,
        c.category_name,
        c.parent_id,
        ct.full_path || ' > ' || c.category_name,
        ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON ct.category_id = c.parent_id
)
SELECT * FROM category_tree;
```

> SQL Server: Use `CONCAT(ct.full_path, ' > ', c.category_name)` instead of `||`.
> MySQL: Use `CONCAT(ct.full_path, ' > ', c.category_name)` instead of `||`.
> Oracle: `||` works, or use `CONNECT BY` syntax.

### Products in a Category and Its Children

```sql
WITH RECURSIVE category_descendants AS (
    SELECT category_id
    FROM categories
    WHERE category_id = 5  -- starting category

    UNION ALL

    SELECT c.category_id
    FROM categories c
    JOIN category_descendants cd ON cd.category_id = c.parent_id
)
SELECT p.product_id, p.product_name, p.category_id
FROM products p
WHERE p.category_id IN (SELECT category_id FROM category_descendants);
```

---

## Product Bundling and Kitting

A common real-world scenario: products sold as bundles where you need to track individual components.

```sql
-- Bundle definition: one row per component
CREATE TABLE bundle_components (
    bundle_id     INT,   -- This is also a product_id in products
    component_id  INT,   -- This is also a product_id in products
    quantity      INT,   -- How many of this component in one bundle
    PRIMARY KEY (bundle_id, component_id)
);
```

### Revenue Breakdown: Bundles vs Individual Sales

```sql
SELECT
    p.product_id,
    p.product_name,
    CASE
        WHEN bc.bundle_id IS NOT NULL THEN 'Bundle'
        ELSE 'Individual'
    END AS product_type,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS revenue
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
LEFT JOIN bundle_components bc ON bc.bundle_id = p.product_id
GROUP BY p.product_id, p.product_name, bc.bundle_id;
```

---

## Advanced Product Scenarios

### Products with Consistent Monthly Sales (No Gaps)

```sql
WITH monthly_sales AS (
    SELECT
        oi.product_id,
        DATE_TRUNC('month', o.order_date) AS sale_month,
        SUM(oi.quantity) AS units_sold
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    GROUP BY oi.product_id, DATE_TRUNC('month', o.order_date)
),
month_spine AS (
    SELECT DISTINCT sale_month FROM monthly_sales
),
product_months AS (
    SELECT DISTINCT
        ms.product_id,
        ms.sale_month
    FROM monthly_sales ms
)
SELECT
    pm.product_id,
    COUNT(DISTINCT pm.sale_month) AS active_months,
    COUNT(DISTINCT ms2.sale_month) AS total_months_in_range
FROM product_months pm
CROSS JOIN month_spine ms2
WHERE ms2.sale_month BETWEEN
    (SELECT MIN(sale_month) FROM monthly_sales) AND
    (SELECT MAX(sale_month) FROM monthly_sales)
GROUP BY pm.product_id
HAVING COUNT(DISTINCT pm.sale_month) = COUNT(DISTINCT ms2.sale_month);
```

> This query is simplified — a production version would generate a proper date spine and use a window function.

### Survival Analysis: Products Still Selling After X Months

```sql
WITH product_first_last AS (
    SELECT
        product_id,
        MIN(o.order_date) AS first_sale,
        MAX(o.order_date) AS last_sale
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    GROUP BY product_id
)
SELECT
    product_id,
    first_sale,
    last_sale,
    EXTRACT(DAY FROM (last_sale - first_sale)) AS lifespan_days,
    CASE
        WHEN EXTRACT(DAY FROM (last_sale - first_sale)) >= 365 THEN 'Long-lived'
        WHEN EXTRACT(DAY FROM (last_sale - first_sale)) >= 90 THEN 'Medium'
        ELSE 'Short-lived'
    END AS lifecycle_segment
FROM product_first_last;
```

> SQL Server: Use `DATEDIFF(day, first_sale, last_sale)` instead of `EXTRACT(DAY FROM ...)`.

### Pareto Analysis (80/20 Rule)

```sql
WITH product_revenue AS (
    SELECT
        p.product_id,
        p.product_name,
        SUM(oi.quantity * oi.unit_price) AS revenue
    FROM products p
    JOIN order_items oi ON oi.product_id = p.product_id
    GROUP BY p.product_id, p.product_name
),
ranked AS (
    SELECT
        product_id,
        product_name,
        revenue,
        ROW_NUMBER() OVER (ORDER BY revenue DESC) AS rn,
        SUM(revenue) OVER () AS total_revenue
    FROM product_revenue
)
SELECT
    product_id,
    product_name,
    revenue,
    ROUND(rn * 100.0 / COUNT(*) OVER () * 100, 1) AS pct_of_products,
    ROUND(SUM(revenue) OVER (ORDER BY rn) / total_revenue * 100, 1) AS cumulative_pct_of_revenue
FROM ranked
ORDER BY rn;
```

---

## Common Mistakes

### 1. Double Counting with One-to-Many Joins

```sql
-- WRONG: If an order has 3 items, the customer total is inflated
SELECT
    o.customer_id,
    SUM(oi.quantity * oi.unit_price) AS total_spent
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
-- This is correct because we're aggregating order_items, not orders
-- But if we joined another one-to-many table, we'd double count
```

> Production pitfall: Always identify one-to-many relationships before joining. Each new one-to-many join can multiply rows.

### 2. Using WHERE Instead of HAVING

```sql
-- WRONG: Can't use aggregate in WHERE
SELECT product_id, SUM(quantity) AS total_qty
FROM order_items
WHERE SUM(quantity) > 100  -- ERROR
GROUP BY product_id;

-- CORRECT
SELECT product_id, SUM(quantity) AS total_qty
FROM order_items
GROUP BY product_id
HAVING SUM(quantity) > 100;
```

### 3. Forgetting GROUP BY

```sql
-- WRONG (PostgreSQL strict mode / SQL Server)
SELECT product_id, product_name, SUM(quantity)
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
GROUP BY product_id;  -- Missing product_name

-- CORRECT
SELECT p.product_id, p.product_name, SUM(oi.quantity)
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name;
```

### 4. Confusing DISTINCT with GROUP BY

```sql
-- These are equivalent when there's no aggregation
SELECT DISTINCT product_id FROM order_items;
SELECT product_id FROM order_items GROUP BY product_id;

-- But DISTINCT eliminates duplicates AFTER all columns are selected
-- GROUP BY can use aggregate functions
```

---

## Performance Considerations

### Indexes for Product Queries

```sql
-- Covering index for order_items aggregation
CREATE INDEX idx_order_items_product_qty_price
ON order_items (product_id, quantity, unit_price);

-- Index for price_history lookups
CREATE INDEX idx_price_history_product_date
ON price_history (product_id, effective_date DESC);

-- Index for inventory lookups
CREATE INDEX idx_inventory_product ON inventory (product_id);
```

> Do not assume these indexes are always beneficial. Verify with `EXPLAIN ANALYZE` (PostgreSQL), `EXPLAIN` (MySQL/Oracle), or `EXPLAIN ANALYZE` (SQL Server). Performance depends on table size, query shape, data distribution, and existing indexes.

### Execution Plan Analysis

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT p.product_id, SUM(oi.quantity)
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
GROUP BY p.product_id;
```

Look for:
- **Seq Scan** on large tables (might need an index)
- **Nested Loop** vs **Hash Join** vs **Merge Join** — which is chosen depends on cardinality estimates
- **Sort** operations — can sometimes be avoided with indexes

### Common Performance Traps

| Pattern | Risk | Mitigation |
|---------|------|------------|
| `SELECT *` in product lists | Fetches unnecessary columns | Select only needed columns |
| `DISTINCT` on large joins | Sort/hash on full result set | Fix the join or use `EXISTS` |
| Correlated subqueries per product | Executes once per row | Use window functions or CTEs |
| `NOT IN` with subquery | Optimizer may not push down | Use `NOT EXISTS` or `LEFT JOIN IS NULL` |

---

## Interview Questions

### Beginner

1. Write a query to find all products that have never been ordered.

2. Write a query to find the total quantity sold for each product.

3. Write a query to find products where current stock is below the reorder point.

4. Write a query to list all categories and the number of products in each.

5. Write a query to find the most expensive product in each category.

### Intermediate

6. Write a query to calculate the revenue contribution (%) of each product to its category's total revenue.

7. Write a query to find the month-over-month growth rate in revenue for each product.

8. Write a query to find the second highest priced product in each category (handle ties).

9. Write a query to find products whose price has never changed.

10. Write a query to find the average time (in days) between an order being placed and each product being sold.

### Advanced

11. Write a query to find products that were sold in every month of 2025 (no gaps).

12. Write a recursive query to display the full category hierarchy with product counts at each level.

13. Write a query to find products that have been ordered by at least 80% of all customers.

14. Write a query to detect products with declining revenue for 3 consecutive months.

15. Write a query to identify products that frequently appear together in the same order (market basket analysis).

### Scenario Based

16. You are given a `products` table and an `order_items` table. The CEO wants to know: "Which products are our cash cows — high revenue but low order frequency?" Design and write the query.

17. The inventory team wants to know: "For each product, what is the ratio of units sold to current stock, and which products will run out of stock within 30 days at current sales velocity?"

18. The marketing team wants: "For each product, calculate the average order value of orders containing that product, and compare it to the overall average order value."

19. A product manager asks: "Which products have the highest return rate?" You have an `order_items` table and a separate `returns` table. Write the query.

20. The data team wants a cohort analysis: "For products launched in each quarter, what percentage reached $10,000 in cumulative revenue within their first 90 days?"

### Tricky

21. You query `products` with `NOT IN (SELECT product_id FROM order_items)` and get zero results, even though you know some products were never ordered. What went wrong?

22. Two queries return different revenue totals for the same product. One joins `order_items` to `orders` and filters by `status = 'completed'`; the other filters `order_items` directly. Explain the difference.

23. You use `COUNT(DISTINCT product_id)` and `COUNT(DISTINCT order_id)` in the same query and get unexpected results. What are the possible pitfalls?

24. You need to find the most recent price for each product. You write `WHERE effective_date = MAX(effective_date)` and it fails. Why?

25. Your query joins `products` → `order_items` → `orders` and the result has 5 million rows for a store with only 100,000 orders. What happened?

### Output Prediction

26. Given:
```sql
SELECT
    CASE WHEN 10 > 5 THEN 'A' ELSE 'B' END,
    CASE WHEN NULL = NULL THEN 'C' ELSE 'D' END;
```
What is the output?

27. Given:
```sql
SELECT product_id, COUNT(*), COUNT(quantity)
FROM order_items
WHERE product_id = 100;
```
`order_items` has 5 rows for product 100, 2 of which have `quantity = NULL`. What does this return?

28. Given:
```sql
SELECT DISTINCT COUNT(product_id)
FROM order_items;
```
Is this the same as `COUNT(DISTINCT product_id)`? Why or why not?

29. Given this window function:
```sql
SELECT
    product_id,
    revenue,
    RANK() OVER (ORDER BY revenue DESC) AS rnk,
    DENSE_RANK() OVER (ORDER BY revenue DESC) AS drnk
FROM product_revenue;
```
If two products have revenue = 500 (highest) and the next product has revenue = 400, what are the `rnk` and `drnk` values for all three rows?

30. Given:
```sql
SELECT product_id, SUM(quantity) AS total_qty
FROM order_items
GROUP BY product_id
HAVING SUM(quantity) > 100
ORDER BY total_qty DESC
LIMIT 5;
```
Does `LIMIT` apply before or after `HAVING`? Explain the logical order of operations.

### Debugging

31. This query returns duplicate rows. Fix it:
```sql
SELECT p.product_name, oi.quantity, c.category_name
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
JOIN categories c ON c.category_id = p.category_id;
```

32. This query is supposed to show products with zero sales, but shows products with sales too. Fix it:
```sql
SELECT p.product_name, oi.quantity
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
WHERE oi.quantity = 0 OR oi.quantity IS NULL;
```

33. This query throws an error. Fix it:
```sql
SELECT product_id, MAX(unit_price) AS max_price, unit_price
FROM order_items
GROUP BY product_id;
```

34. This query is extremely slow on a table with 50 million rows. Suggest improvements:
```sql
SELECT DISTINCT p.product_name
FROM products p, order_items oi, orders o
WHERE p.product_id = oi.product_id
  AND oi.order_id = o.order_id
  AND o.order_date > '2025-01-01';
```

35. This query returns NULL for products with no inventory, but the business wants 0 instead. Fix it:
```sql
SELECT p.product_name, i.stock_qty
FROM products p
JOIN inventory i ON i.product_id = p.product_id;
```

### Performance

36. You have a `products` table with 10,000 rows and an `order_items` table with 50 million rows. You need to find products with total revenue > $100,000. Compare: (a) a subquery approach, (b) a CTE approach, (c) a HAVING approach. What would you check in the execution plan for each?

37. A query joining `products` to `order_items` (50M rows) is slow. You add an index on `order_items.product_id`. The query is still slow. What else should you investigate?

38. Explain when a window function approach would be faster or slower than a self-join for finding the top-N products per category.

39. You need to find products sold yesterday. Your table has a composite index `(order_date, product_id)`. Write two queries: one that can use this index and one that cannot. Explain why.

40. You are deciding between `IN` and `EXISTS` for finding products that appear in the `order_items` table. Under what data distributions might one outperform the other? What would you verify using the execution plan?
