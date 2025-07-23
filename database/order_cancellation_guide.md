# Order Cancellation Guide for My Vendure Shop

This document outlines the methods I've used for cancelling orders in my Vendure shop, particularly when the admin interface fails. It includes the SQL script I used for order 13074 and notes on preventing unwanted order creation.

## Method 1: Direct Database Update (Recommended for Admin-Only Emergency Use)

When the Vendure Admin UI fails to cancel an order due to validation errors or other issues, a direct database update can be used as an emergency solution.

### How I Cancelled Order 13074

I created a SQL script at `/home/vendure/database_analysis/cancel_order_13074.sql` that successfully cancelled order 13074:

1. First ran a dry run to check the order state and data
2. Then executed the actual cancellation commands
3. Ran with: `sudo -u postgres psql -d vendure_db -f /home/vendure/database_analysis/cancel_order_13074.sql`

### For Future Orders

To cancel another order, I'll copy and modify the existing script:

```bash
cp /home/vendure/database_analysis/cancel_order_13074.sql /home/vendure/database_analysis/cancel_order_XXXX.sql
# Edit the new file to replace all instances of 13074 with the new order ID
sudo -u postgres psql -d vendure_db -f /home/vendure/database_analysis/cancel_order_XXXX.sql
```

### SQL Script Structure

My script uses this structure:

```sql
-- CANCELLATION SCRIPT for order ORDER_ID (ORDER_CODE)
-- This script will transition the order to Cancelled state

-- First, check the current state
SELECT id, code, state FROM "order" WHERE id = ORDER_ID;

-- Create a history entry for the transition
INSERT INTO history_entry (
    "createdAt", 
    "updatedAt", 
    "type", 
    "isPublic", 
    "data", 
    "discriminator", 
    "orderId"
)
VALUES (
    NOW(), 
    NOW(), 
    'ORDER_STATE_TRANSITION', 
    true, 
    jsonb_build_object(
        'from', (SELECT state FROM "order" WHERE id = ORDER_ID),
        'to', 'Cancelled'
    )::text, 
    'order-history-entry', 
    ORDER_ID
);

-- Update the order state
UPDATE "order" SET state = 'Cancelled', "updatedAt" = NOW() WHERE id = ORDER_ID;

-- Verify the change
SELECT id, code, state FROM "order" WHERE id = ORDER_ID;
```

### My Dry Run Process

Before cancelling order 13074, I ran these checks to analyze its state:

```sql
-- From cancel_order_13074.sql (dry run section)

-- Check the order's current state
SELECT id, code, state, "createdAt", "updatedAt" FROM "order" WHERE id = 13074;

-- Check order lines
SELECT COUNT(*) as line_count FROM order_line WHERE "orderId" = 13074;

-- Check payments
SELECT id, method, state, amount, "createdAt" FROM payment WHERE "orderId" = 13074;

-- Check history entries
SELECT id, "createdAt", type, data FROM history_entry WHERE "orderId" = 13074 ORDER BY "createdAt" DESC;

-- Check refunds
SELECT id, "paymentId", amount, state FROM refund WHERE "paymentId" IN (SELECT id FROM payment WHERE "orderId" = 13074);
```

### Execution Command

I ran the script with:

```bash
sudo -u postgres psql -d vendure_db -f /home/vendure/database_analysis/cancel_order_13074.sql
```

### Verification Steps

After running the script, I check that the order has been successfully cancelled:

```sql
SELECT id, code, state FROM "order" WHERE id = 13074;
```

The state should now be 'Cancelled'.

### Important Notes

1. This method bypasses all application-level validation and hooks
2. Use only when the standard admin interface fails
3. For security reasons, limit access to this capability
4. Document all manual cancellations for audit purposes

## Method 2: GraphQL API (Tried But Abandoned)

I initially tried to use the GraphQL API approach but ran into permission issues. I created a script at `/home/vendure/cancel-order.js` but ultimately found the direct SQL approach more reliable for my emergency needs.

### Example GraphQL Mutation

```graphql
mutation {
  transitionOrderToState(id: "ORDER_ID", state: "Cancelled") {
    ... on Order {
      id
      code
      state
    }
    ... on OrderStateTransitionError {
      errorCode
      message
      transitionError
      fromState
      toState
    }
  }
}
```

### Example JavaScript Implementation

```javascript
// This is a simplified example - in production, use proper authentication and error handling
async function cancelOrder(orderId) {
  const response = await fetch('http://localhost:3000/admin-api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_AUTH_TOKEN'
    },
    body: JSON.stringify({
      query: `
        mutation {
          transitionOrderToState(id: "${orderId}", state: "Cancelled") {
            ... on Order {
              id
              code
              state
            }
            ... on OrderStateTransitionError {
              errorCode
              message
            }
          }
        }
      `
    })
  });
  
  return await response.json();
}
```

## Method 3: Admin UI (What Failed for Order 13074)

I initially tried using the standard Vendure Admin UI:

1. Navigated to Orders section and found order 13074 (DD29206)
2. Clicked on the order to view details
3. Tried using the "Transition to state" dropdown to select "Cancelled"
4. Got validation errors related to the order state machine

This is why I had to use the direct SQL approach instead.

## My Troubleshooting Notes

### Why Order 13074 Couldn't Be Cancelled in UI

The order was in PaymentSettled state, and the admin UI validation prevented direct transition to Cancelled. The SQL approach bypassed this validation.

### What to Check Before Cancelling

Before trying to cancel an order, I should check:
1. Current order state (especially if it's PaymentSettled)
2. If there are any fulfillments that need to be cancelled first
3. Whether a refund needs to be processed

### Related Issue: Unwanted Order Creation

I had issues with empty orders being created by health monitoring scripts. I created scripts (`update-active-order-query.sh` and `update-query-params.sh`) to fix this by adjusting the parameters for `getActiveOrderQuery()` calls.

### State Machine Validation Errors

If you receive state machine validation errors:
1. Check the current order state
2. Verify if a direct transition to Cancelled is allowed
3. You may need to transition through intermediate states
4. Or use the direct database method to bypass validation

## Best Practices

1. Always attempt to use the Admin UI first
2. Document any manual database changes
3. Consider creating a refund if payment was processed
4. Update inventory if necessary after cancellation
5. Notify the customer about the cancellation

## Recent Example: Order 13074 (DD29206)

On July 11, 2025, order 13074 (DD29206) was successfully cancelled using the direct database method after encountering issues with the Admin UI.
