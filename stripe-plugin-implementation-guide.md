# Stripe Pre-Order Plugin Implementation Guide

## Overview
You've replaced two key files:
- **Backend**: `stripe-pre-order.plugin.ts` (fixed settlement timing)
- **Frontend**: `stripe-payment.service.ts` (updated to match backend)

This guide covers the remaining steps to safely deploy the changes.

## Phase 1: Database Setup (CRITICAL - DO THIS FIRST)

### Step 1: Create Database Backup
**BEFORE making any changes**, create a full database backup:

```bash
# For PostgreSQL
pg_dump -U your_username -h localhost your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# For MySQL
mysqldump -u your_username -p your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Register New Entity in Vendure Config
Update your `vendure-config.ts` to include the new entity:

```typescript
// vendure-config.ts
import { VendureConfig } from '@vendure/core';
import { StripePreOrderPlugin, PendingStripePayment } from './plugins/stripe-pre-order/stripe-pre-order.plugin';

export const config: VendureConfig = {
  // ... existing config
  
  dbConnectionOptions: {
    // ... existing database config
    entities: [
      // ... your existing entities
      PendingStripePayment, // ADD THIS LINE
    ],
    // If you're using migrations (recommended):
    migrations: [path.join(__dirname, './migrations/*.ts')],
    migrationsRun: false, // Keep false for manual control
  },

  plugins: [
    // ... existing plugins
    StripePreOrderPlugin, // Make sure this is registered
  ],
  
  // ... rest of config
};
```

### Step 3: Generate and Run Migration (SAFE APPROACH)

#### Option A: Automatic Migration (Recommended)
```bash
# Navigate to your backend directory
cd backend

# Generate migration
npm run migration:generate -- --name="AddPendingStripePayment"

# Review the generated migration file in src/migrations/
# Make sure it only creates the pending_stripe_payment table

# Run migration
npm run migration:run
```

#### Option B: Manual Migration (If automatic fails)
Create a new migration file manually:

```typescript
// src/migrations/[timestamp]-AddPendingStripePayment.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddPendingStripePayment1234567890123 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'pending_stripe_payment',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'paymentIntentId',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'orderId',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'orderCode',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'amount',
                        type: 'int',
                    },
                    {
                        name: 'customerEmail',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'pending'",
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'settledAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
                indices: [
                    {
                        name: 'IDX_pending_stripe_payment_intent_id',
                        columnNames: ['paymentIntentId'],
                    },
                    {
                        name: 'IDX_pending_stripe_payment_order_code',
                        columnNames: ['orderCode'],
                    },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('pending_stripe_payment');
    }
}
```

Then run:
```bash
npm run migration:run
```

### Step 4: Verify Database Changes
Check that the table was created correctly:

```sql
-- For PostgreSQL
\dt pending_stripe_payment

-- For MySQL
DESCRIBE pending_stripe_payment;

-- For both - check table structure
SELECT * FROM pending_stripe_payment LIMIT 1;
```

## Phase 2: Backend Configuration

### Step 1: Environment Variables
Ensure these are set in your `.env` file:

```bash
# Required
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Optional (for webhook monitoring)
STRIPE_PREORDER_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Phase 3: Frontend Integration

### Step 1: Update Frontend Payment Flow
Update your checkout components to use the new service methods. Here's a basic example:

```typescript
// In your checkout component/hook
async function processPayment(cartItems: any[], customerInfo: any) {
  try {
    // Step 1: Create PaymentIntent
    const paymentIntentResult = await stripeService.createPaymentIntent(
      calculateCartTotal(cartItems)
    );

    // Step 2: Show Stripe form with clientSecret
    // (Your existing Stripe Elements implementation)

    // Step 3: Create Vendure order
    const order = await createVendureOrder(cartItems, customerInfo);

    // Step 4: Link PaymentIntent to order (NO SETTLEMENT YET)
    await stripeService.linkPaymentIntentToOrder(
      paymentIntentResult.paymentIntentId,
      order.id,
      order.code,
      order.total,
      customerInfo.email
    );

    // Step 5: Confirm payment with Stripe
    const confirmResult = await stripeService.confirmPayment