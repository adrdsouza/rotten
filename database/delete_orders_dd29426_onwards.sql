-- Delete orders DD29426 onwards (IDs 13363-13371)
-- This script handles both orders with and without refunds
-- Based on analysis: some orders have refunds (test data) that need to be deleted first

BEGIN;

-- Show what we're about to delete
SELECT 'Orders to be deleted (DD29426 onwards):' as info;
SELECT 
    o.id,
    o.code,
    o.state,
    CASE WHEN r.id IS NOT NULL THEN 'HAS_REFUNDS' ELSE 'NO_REFUNDS' END as refund_status,
    COUNT(r.id) as refund_count
FROM "order" o
LEFT JOIN payment p ON p."orderId" = o.id
LEFT JOIN refund r ON r."paymentId" = p.id
WHERE o.code >= 'DD29426'
GROUP BY o.id, o.code, o.state, r.id
ORDER BY o.code;

-- Store the order IDs we want to delete
CREATE TEMP TABLE orders_to_delete AS
SELECT DISTINCT o.id 
FROM "order" o
WHERE o.code >= 'DD29426';

-- Store refund IDs that need to be deleted
CREATE TEMP TABLE refunds_to_delete AS
SELECT DISTINCT r.id
FROM refund r
INNER JOIN payment p ON r."paymentId" = p.id
INNER JOIN orders_to_delete otd ON p."orderId" = otd.id;

-- Show refunds that will be deleted
SELECT 'Refunds to be deleted:' as info;
SELECT r.id, r.total, r.state, p."orderId", o.code
FROM refund r
INNER JOIN payment p ON r."paymentId" = p.id
INNER JOIN "order" o ON p."orderId" = o.id
WHERE r.id IN (SELECT id FROM refunds_to_delete)
ORDER BY o.code;

-- Delete related data in the correct order (following foreign key dependencies)

-- 1. Delete order line references (RefundLine entries) that reference refunds
DELETE FROM order_line_reference
WHERE "refundId" IN (SELECT id FROM refunds_to_delete);

-- 2. Delete refunds (now safe after order_line_reference is deleted)
DELETE FROM refund WHERE id IN (SELECT id FROM refunds_to_delete);

-- 3. Delete stock movements (references order_line.id)
DELETE FROM stock_movement 
WHERE "orderLineId" IN (
    SELECT ol.id FROM order_line ol 
    WHERE ol."orderId" IN (SELECT id FROM orders_to_delete)
);

-- 4. Delete history entries
DELETE FROM history_entry WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 5. Delete order channel relationships
DELETE FROM order_channels_channel WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 6. Delete order fulfillment relationships
DELETE FROM order_fulfillments_fulfillment WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 7. Delete order lines
DELETE FROM order_line WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 8. Delete order modifications
DELETE FROM order_modification WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 9. Delete order promotion relationships
DELETE FROM order_promotions_promotion WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 10. Delete payments (now safe after refunds are deleted)
DELETE FROM payment WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 11. Delete shipping lines
DELETE FROM shipping_line WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 12. Delete surcharges
DELETE FROM surcharge WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 13. Update sessions to remove references (set to NULL, don't delete sessions)
UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" IN (SELECT id FROM orders_to_delete);

-- 14. Update self-referencing orders (set aggregateOrderId to NULL)
UPDATE "order" SET "aggregateOrderId" = NULL WHERE "aggregateOrderId" IN (SELECT id FROM orders_to_delete);

-- 15. Finally, delete the orders themselves
DELETE FROM "order" WHERE id IN (SELECT id FROM orders_to_delete);

-- Show the results
SELECT 'Deletion completed. Summary:' as info;
SELECT 
    'Orders deleted' as item_type,
    (SELECT COUNT(*) FROM orders_to_delete) as count
UNION ALL
SELECT 
    'Refunds deleted' as item_type,
    (SELECT COUNT(*) FROM refunds_to_delete) as count;

COMMIT;

-- Final verification - these should return no rows
SELECT 'Final verification - should be empty:' as info;
SELECT id, code FROM "order" WHERE code >= 'DD29426';
