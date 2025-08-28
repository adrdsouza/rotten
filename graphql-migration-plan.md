# GraphQL Migration Plan

## Current Status Analysis

### Backend Configuration
1. **Custom Fields Configuration**: The `customFields` property in `vendure-config.ts` is empty (`customFields: {}`), meaning no custom fields are defined in the schema.
2. **Schema Generation**: There's no script to generate the schema from the backend configuration.
3. **Migrations**: There are migrations that add custom fields to database tables, but they're not reflected in the Vendure configuration.
4. **Plugins**: Custom plugins are enabled that provide additional GraphQL operations:
   - `LocalCartCouponPlugin` - Provides `validateLocalCartCoupon` query and `ValidateLocalCartCouponInput` type
   - `StripePreOrderPlugin` - Provides `createPreOrderStripePaymentIntent`, `linkPaymentIntentToOrder`, `calculateEstimatedTotal` operations and `PreOrderCartItemInput` type

### Frontend Configuration
1. **Codegen Configuration**: Using a static schema file approach (`src/generated/schema-shop.graphql`) which is good for avoiding security middleware issues.
2. **Generated Files**: Schema and GraphQL types are generated, but are outdated and missing the custom operations from enabled plugins.
3. **Fragments**: The `CustomOrderDetail` fragment in `order.ts` does not include `customFields` for product variants.

### Issues Identified
1. Missing custom field definitions in Vendure configuration
2. No schema generation script in backend
3. `CustomOrderDetail` fragment missing `customFields` for product variants
4. Outdated schema file missing custom operations from plugins
5. GraphQL validation errors due to missing operations in schema:
   - `createPreOrderStripePaymentIntent` mutation
   - `linkPaymentIntentToOrder` mutation
   - `PreOrderCartItemInput` type
   - `calculateEstimatedTotal` query
   - `ValidateLocalCartCouponInput` type
   - `validateLocalCartCoupon` query

## Migration Plan

### Phase 1: Backend Setup (Schema Generation)

1. **Create Schema Generation Script**
   - Create `backend/scripts/generate-schema.ts`:
   ```typescript
   import { bootstrapWorker } from '@vendure/core';
   import { printSchema } from 'graphql';
   import { writeFileSync } from 'fs';
   import { config } from '../src/vendure-config';
   
   async function generate() {
     console.log('Generating schema from Vendure config...');
     const worker = await bootstrapWorker(config);
     const schema = worker.app.get('GRAPHQL_SCHEMA');
     const schemaString = printSchema(schema);
     writeFileSync('./schema.graphql', schemaString);
     console.log('Schema generated successfully!');
     await worker.app.close();
     process.exit(0);
   }
   
   generate().catch(err => {
     console.error(err);
     process.exit(1);
   });
   ```

2. **Add Generate Script to Backend package.json**
   ```json
   {
     "scripts": {
       "generate-schema": "ts-node scripts/generate-schema.ts"
     }
   }
   ```

### Phase 2: Define Custom Fields in Backend

1. **Update Vendure Configuration**
   - Modify `backend/src/vendure-config.ts` to include custom fields:
   ```typescript
   customFields: {
     Product: [
       { name: 'salePrice', type: 'float', nullable: true },
       { name: 'preOrderPrice', type: 'float', nullable: true },
       { name: 'shipDate', type: 'datetime', nullable: true },
     ],
     ProductVariant: [
       { name: 'salePrice', type: 'float', nullable: true },
       { name: 'preOrderPrice', type: 'float', nullable: true },
       { name: 'shipDate', type: 'datetime', nullable: true },
     ],
   },
   ```

### Phase 3: Frontend Updates

1. **Update CustomOrderDetail Fragment**
   - Modify `frontend/src/providers/shop/orders/order.ts` to include `customFields`:
   ```graphql
   fragment CustomOrderDetail on Order {
     # ... existing fields
     lines {
       # ... existing fields
       productVariant {
         # ... existing fields
         customFields  # Add this line
         product {
           # ... existing fields
           customFields  # Add this line
         }
       }
     }
     # ... existing fields
   }
   ```

### Phase 4: Schema Synchronization Process

1. **Generate Updated Schema**
   ```bash
   cd backend
   pnpm generate-schema
   ```

2. **Copy Schema to Frontend**
   ```bash
   cp backend/schema.graphql frontend/src/generated/schema-shop.graphql
   ```

3. **Regenerate GraphQL Types**
   ```bash
   cd frontend
   pnpm generate
   ```

### Phase 5: Verification

1. **Check Generated Schema**
   - Verify that `Product` and `ProductVariant` types include the new custom fields
   - Confirm that `customFields` is of type `JSON`
   - Verify that custom operations from plugins are present:
     - `validateLocalCartCoupon` query
     - `ValidateLocalCartCouponInput` type
     - `createPreOrderStripePaymentIntent` mutation
     - `linkPaymentIntentToOrder` mutation
     - `calculateEstimatedTotal` query
     - `PreOrderCartItemInput` type

2. **Test Frontend Compilation**
   - Run `pnpm build` to ensure no GraphQL validation errors
   - Check that custom fields are accessible via `product.customFields?.salePrice` syntax

3. **Test Runtime Functionality**
   - Verify that product variants in cart display correct custom field data
   - Test that custom fields are properly exposed in GraphQL responses
   - Test that all custom operations from plugins work correctly

## Risk Mitigation

1. **Backup Current Schema**
   - Before making changes, backup the current schema files

2. **Incremental Deployment**
   - Deploy backend changes first
   - Verify API functionality
   - Deploy frontend changes
   - Monitor for any issues

3. **Rollback Plan**
   - If issues occur, revert to previous schema files
   - Restore backed-up configurations

## Expected Outcomes

1. **Backend**
   - Custom fields properly defined in Vendure configuration
   - Schema generation script available for future updates
   - All custom operations from plugins properly exposed in schema

2. **Frontend**
   - GraphQL codegen working without errors
   - Custom fields accessible via `customFields: JSON` property
   - No GraphQL validation errors
   - All custom operations from plugins properly typed and available

3. **Process**
   - Clear workflow for future schema updates
   - Elimination of security middleware conflicts
   - Improved reliability of code generation process

## Next Steps

1. Implement Phase 1 (Backend Schema Generation)
2. Implement Phase 2 (Define Custom Fields)
3. Run backend schema generation
4. Copy schema to frontend
5. Regenerate frontend GraphQL types
6. Implement Phase 3 (Update CustomOrderDetail Fragment)
7. Test and verify functionality