-- DRY RUN SCRIPT to analyze order 13074 before cancellation
-- This script will only show information without making any changes

-- Check if the order exists and its current state
SELECT id, code, state, "createdAt", "updatedAt" FROM "order" WHERE id = 13074;

-- Check if there are any order lines
SELECT COUNT(*) as line_count FROM order_line WHERE "orderId" = 13074;

-- Check if there are any payments
SELECT id, method, state, amount, "createdAt" FROM payment WHERE "orderId" = 13074;

-- Check if there are any fulfillments
SELECT id, state, "trackingCode", "createdAt" FROM fulfillment WHERE "orderId" = 13074;

-- Check existing history entries
SELECT id, "createdAt", type, data FROM order_history_entry WHERE "orderId" = 13074 ORDER BY "createdAt" DESC;

-- Check if there are any refunds
SELECT id, payment_id, amount, state FROM refund WHERE payment_id IN (SELECT id FROM payment WHERE "orderId" = 13074);

-- Show what the history entry would look like
SELECT 
    NOW() as would_create_at,
    'ORDER_STATE_TRANSITION' as entry_type,
    jsonb_build_object(
        'from', (SELECT state FROM "order" WHERE id = 13074),
        'to', 'Cancelled'
    ) as transition_data;

-- Show what the order would look like after update
SELECT 
    id, 
    code, 
    'Cancelled' as would_be_new_state,
    state as current_state,
    NOW() as would_update_at,
    "updatedAt" as current_updated_at
FROM "order" 
WHERE id = 13074;
