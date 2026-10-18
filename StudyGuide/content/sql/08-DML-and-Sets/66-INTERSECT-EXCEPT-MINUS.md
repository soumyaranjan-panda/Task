# 66 — INTERSECT, EXCEPT, and MINUS

`INTERSECT` returns rows common to two query results. `EXCEPT` returns rows in the first result that are absent from the second. They compare complete result rows, not just a chosen key.

## Rules shared by set operators

Each query must return the same number of columns in corresponding positions, and those columns must have compatible types. Column names in the result come from the first query. Use an outer query if you need to order or limit the combined result.

```sql
SELECT customer_id
FROM web_orders
INTERSECT
SELECT customer_id
FROM store_orders
ORDER BY customer_id;
```

The preceding query finds customers who ordered through both channels.

## INTERSECT

`INTERSECT` removes duplicates, like `UNION`. Two NULLs in the same output position are treated as equal for duplicate elimination, so one all-NULL row can appear in the result.

```sql
-- Products present in both inventories
SELECT product_id
FROM warehouse_inventory
INTERSECT
SELECT product_id
FROM store_inventory;
```

`INTERSECT ALL` preserves multiplicity where an engine supports it: a row appears the smaller of its two occurrence counts. PostgreSQL supports it; support varies by database, so check the engine documentation before relying on it.

## EXCEPT and MINUS

```sql
-- Customers who have an account but no order
SELECT customer_id
FROM customers
EXCEPT
SELECT customer_id
FROM orders;
```

`EXCEPT` is the standard spelling. Oracle uses `MINUS` for the distinct set difference. MySQL supports `EXCEPT` from 8.0.31; for portable code, use `NOT EXISTS` when appropriate.

```sql
-- Portable anti-join; safe even if orders.customer_id contains NULL
SELECT c.customer_id
FROM customers AS c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders AS o
    WHERE o.customer_id = c.customer_id
);
```

Avoid replacing the last query with `NOT IN (SELECT customer_id FROM orders)` unless the subquery column is guaranteed `NOT NULL`: one NULL can make the predicate UNKNOWN for every outer row.

Like `INTERSECT ALL`, `EXCEPT ALL` preserves duplicates only where it is supported. Oracle's `MINUS` is distinct-only.

## Precedence and ordering

`INTERSECT` binds more tightly than `UNION` and `EXCEPT` in the SQL standard and PostgreSQL. Parenthesize mixed set operations to make the intended grouping explicit and to avoid dialect surprises.

```sql
-- Explicit: common active customers, plus every VIP customer
(
    SELECT customer_id FROM active_customers
    INTERSECT
    SELECT customer_id FROM customers_with_orders
)
UNION
SELECT customer_id FROM vip_customers
ORDER BY customer_id;
```

An `ORDER BY` at the end orders the final set. To apply `ORDER BY` or `LIMIT` to an individual input query, place that input in parentheses; support for branch-level ordering differs by engine.

## Choosing the pattern

| Need | Preferred pattern |
| --- | --- |
| Common complete rows from two compatible queries | `INTERSECT` |
| Rows in query A but not query B | `EXCEPT` / Oracle `MINUS` |
| Anti-join on a key, especially with NULLs possible | `NOT EXISTS` |
| Keep duplicate counts | `INTERSECT ALL` / `EXCEPT ALL`, where supported |

> Performance note: a set operator commonly needs sorting or hashing to remove duplicates. `EXPLAIN` the actual query; a semi-join or anti-join may be clearer and may yield a different plan when only key existence matters.

## Common mistakes

- Assuming `EXCEPT` compares only the first selected column; it compares every selected column.
- Using `NOT IN` when its subquery can return NULL.
- Depending on implicit output order; SQL results are unordered without a final `ORDER BY`.
- Treating `MINUS` as portable syntax; use `EXCEPT` or an explicitly documented Oracle variant.

See also: [65 — UNION and UNION ALL](./65-UNION-UNION-ALL.md), [23 — Anti-Joins](../03-Joins/23-Anti-Joins.md), and [31 — NOT IN vs NOT EXISTS](../04-Subqueries/31-NOT-IN-vs-NOT-EXISTS.md).
