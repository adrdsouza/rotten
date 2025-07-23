-- Order Analysis Queries for Database Cleanup
-- Run these queries in psql to understand order distribution and relationships

-- 1. Count of orders by state
SELECT 
    state,
    COUNT(*) as order_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM "order" 
GROUP BY state 
ORDER BY order_count DESC;

-- 2. Export order counts by state to CSV
\copy (SELECT state, COUNT(*) as order_count FROM "order" GROUP BY state ORDER BY order_count DESC) TO '/tmp/order_counts_by_state.csv' WITH CSV HEADER;

-- 3. Get table structure for orders and related tables
\d "order"
\d order_line
\d payment
\d fulfillment
\d order_modification
\d surcharge
\d shipping_line

-- 4. Show foreign key relationships for order table
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name='order' OR ccu.table_name='order')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Sample of Complete state orders with related data counts
SELECT 
    o.id,
    o.code,
    o.state,
    o."createdAt",
    o."updatedAt",
    o."customerId",
    (SELECT COUNT(*) FROM order_line ol WHERE ol."orderId" = o.id) as line_count,
    (SELECT COUNT(*) FROM payment p WHERE p."orderId" = o.id) as payment_count,
    (SELECT COUNT(*) FROM fulfillment f WHERE f."orderId" = o.id) as fulfillment_count,
    (SELECT COUNT(*) FROM order_modification om WHERE om."orderId" = o.id) as modification_count
FROM "order" o 
WHERE o.state = 'Complete'
ORDER BY o."createdAt" DESC
LIMIT 10;

-- 6. Export Complete orders with relationship counts to CSV
\copy (SELECT o.id, o.code, o.state, o."createdAt", o."updatedAt", o."customerId", (SELECT COUNT(*) FROM order_line ol WHERE ol."orderId" = o.id) as line_count, (SELECT COUNT(*) FROM payment p WHERE p."orderId" = o.id) as payment_count, (SELECT COUNT(*) FROM fulfillment f WHERE f."orderId" = o.id) as fulfillment_count FROM "order" o WHERE o.state = 'Complete' ORDER BY o."createdAt" DESC) TO '/tmp/complete_orders_analysis.csv' WITH CSV HEADER;

-- 7. Check for orders with specific patterns (potential migration artifacts)
SELECT 
    state,
    COUNT(*) as count,
    MIN("createdAt") as earliest_created,
    MAX("createdAt") as latest_created
FROM "order" 
WHERE state = 'Complete'
GROUP BY state;

-- 8. Find orders that might be migration artifacts (no payments, fulfillments, etc.)
SELECT 
    o.id,
    o.code,
    o.state,
    o."createdAt",
    o.total,
    CASE 
        WHEN (SELECT COUNT(*) FROM order_line ol WHERE ol."orderId" = o.id) = 0 THEN 'NO_LINES'
        WHEN (SELECT COUNT(*) FROM payment p WHERE p."orderId" = o.id) = 0 THEN 'NO_PAYMENTS'
        WHEN (SELECT COUNT(*) FROM fulfillment f WHERE f."orderId" = o.id) = 0 THEN 'NO_FULFILLMENTS'
        ELSE 'HAS_DATA'
    END as data_status
FROM "order" o 
WHERE o.state = 'Complete'
ORDER BY o."createdAt" DESC;

-- 9. Export potential cleanup candidates to CSV
\copy (SELECT o.id, o.code, o.state, o."createdAt", o.total, CASE WHEN (SELECT COUNT(*) FROM order_line ol WHERE ol."orderId" = o.id) = 0 THEN 'NO_LINES' WHEN (SELECT COUNT(*) FROM payment p WHERE p."orderId" = o.id) = 0 THEN 'NO_PAYMENTS' WHEN (SELECT COUNT(*) FROM fulfillment f WHERE f."orderId" = o.id) = 0 THEN 'NO_FULFILLMENTS' ELSE 'HAS_DATA' END as data_status FROM "order" o WHERE o.state = 'Complete' ORDER BY o."createdAt" DESC) TO '/tmp/complete_orders_cleanup_candidates.csv' WITH CSV HEADER;

-- 10. Get detailed table relationships for cleanup script planning
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    typname as data_type
FROM pg_stats 
JOIN pg_type ON pg_stats.stavalues1 IS NOT NULL 
WHERE schemaname = 'public' 
AND (tablename LIKE '%order%' OR tablename IN ('payment', 'fulfillment', 'surcharge', 'shipping_line'))
ORDER BY tablename, attname;
