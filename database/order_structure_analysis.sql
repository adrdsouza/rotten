-- Database Structure Analysis for Order Cleanup
-- This script helps identify which tables need to be cleaned when deleting orders

-- First, let's see the current order state distribution
SELECT 
    state,
    COUNT(*) as count
FROM "order" 
GROUP BY state 
ORDER BY count DESC;

-- Tables that reference orders (these need cleanup when deleting orders)
-- Run this to see all foreign key relationships:

SELECT DISTINCT
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'order'
ORDER BY tc.table_name;

-- Key tables that will need cleanup when deleting orders:
-- order_line, payment, fulfillment, order_modification, surcharge, shipping_line, order_promotions_promotion, etc.
