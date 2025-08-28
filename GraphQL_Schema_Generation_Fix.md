# GraphQL Schema Generation Fix: Custom Plugin Operations

## Problem Analysis

The frontend is experiencing GraphQL document validation errors because the generated schema (`frontend/src/generated/schema-shop.graphql`) is missing custom GraphQL operations defined in backend plugins. The errors indicate that the following custom operations are not present in the frontend's static schema:

### Missing Operations:
1. **Mutations:**
   - `createPreOrderStripePaymentIntent` (from StripePreOrderPlugin)
   - `linkPaymentIntentToOrder` (from StripePreOrderPlugin)
   - `validateLocalCartCoupon` (from LocalCartCouponPlugin)

2. **Queries:**
   - `calculateEstimatedTotal` (from StripePreOrderPlugin)

3. **Input Types:**
   - `PreOrderCartItemInput` (from StripePreOrderPlugin)
   - `ValidateLocalCartCouponInput` (from LocalCartCouponPlugin)

### Root Cause
The current frontend codegen configuration (`frontend/codegen-shop.ts`) references a static schema file (`src/generated/schema-shop.graphql`) that doesn't include the custom plugin operations. This schema appears to be outdated and only contains the base Vendure schema without the custom extensions.

## Solution: Implement Dynamic Schema Generation

Based on the successful implementation in `https://github.com/adrdsouza/damn`, we need to implement a dynamic schema generation approach that:

1. **Generates the complete schema from a running backend server** (including all custom plugins)
2. **Updates the frontend codegen to use this dynamically generated schema**
3. **Establishes a workflow to keep the schema synchronized**

## Implementation Plan

### Step 1: Add Schema Generation Script to Backend

Create `backend/scripts/generate-schema.ts`:

```typescript
import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import fetch from 'node-fetch';

async function generateSchema() {
  try {
    console.log('🔍 Fetching GraphQL schema from running server...');
    
    // Fetch introspection query from running backend
    const response = await fetch('http://localhost:3000/shop-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: getIntrospectionQuery(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data } = await response.json();
    
    // Build client schema from introspection result
    const schema = buildClientSchema(data);
    
    // Convert to SDL (Schema Definition Language)
    const sdl = printSchema(schema);
    
    // Write to schema file
    writeFileSync('schema.graphql', sdl);
    
    console.log('✅ Schema generated successfully at schema.graphql');
    console.log(`📊 Schema contains ${sdl.split('\n').length} lines`);
    
  } catch (error) {
    console.error('❌ Error generating schema:', error);
    process.exit(1);
  }
}

generateSchema();
```

### Step 2: Update Backend Package.json

Add the schema generation script to `backend/package.json`:

```json
{
  "scripts": {
    "dev:server": "ts-node ./src/index.ts",
    "dev:worker": "ts-node ./src/index-worker.ts",
    "dev": "concurrently pnpm:dev:*",
    "build": "tsc && pm2 restart admin worker",
    "start:server": "node ./dist/index.js",
    "start:worker": "node ./dist/index-worker.js",
    "start": "concurrently pnpm:start:*",
    "generate-schema": "ts-node scripts/generate-schema.ts"
  }
}
```

### Step 3: Update Frontend Codegen Configuration

Modify `frontend/codegen-shop.ts` to reference the backend's generated schema:

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';
import { DEV_API, LOCAL_API, PROD_API } from './src/constants';

let GRAPHQL_API = import.meta.env.IS_DEV
	? DEV_API
	: import.meta.env.IS_LOCAL
		? LOCAL_API
		: PROD_API;

GRAPHQL_API = `${GRAPHQL_API}/shop-api`;

const config: CodegenConfig = {
	// Reference the backend's generated schema instead of static file
	schema: '../backend/schema.graphql',
	documents: [
		'src/providers/shop/**/*.{ts,tsx,graphql}',
		'!src/generated/*'
	],
	generates: {
		'src/generated/graphql-shop.ts': {
			config: {
				enumsAsConst: true,
			},
			plugins: ['typescript', 'typescript-operations', 'typescript-generic-sdk'],
		},
		'src/generated/schema-shop.graphql': {
			plugins: ['schema-ast'],
		},
	},
};

export default config;
```

### Step 4: Update Frontend Package.json Scripts

Modify `frontend/package.json` to include schema generation in the workflow:

```json
{
  "scripts": {
    "generate-schema": "cd ../backend && pnpm generate-schema",
    "generate-shop": "pnpm generate-schema && DOTENV_CONFIG_PATH=.env graphql-codegen -r dotenv/config --config codegen-shop.ts",
    "generate-dev": "export IS_DEV=TRUE && pnpm generate-shop",
    "generate-local": "export IS_LOCAL=TRUE && pnpm generate-shop",
    "generate": "pnpm generate-shop"
  }
}
```

### Step 5: Verification Steps

1. **Start the backend server:**
   ```bash
   cd backend
   pnpm dev
   ```

2. **Generate the schema:**
   ```bash
   cd backend
   pnpm generate-schema
   ```

3. **Verify the schema contains custom operations:**
   ```bash
   grep -E "createPreOrderStripePaymentIntent|linkPaymentIntentToOrder|calculateEstimatedTotal|validateLocalCartCoupon" backend/schema.graphql
   ```

4. **Generate frontend types:**
   ```bash
   cd frontend
   pnpm generate
   ```

5. **Verify the errors are resolved:**
   ```bash
   cd frontend
   pnpm build.types
   ```

## Expected Results

After implementing this fix:

1. **✅ All custom GraphQL operations will be included** in the generated schema
2. **✅ Frontend validation errors will be resolved**
3. **✅ Type safety will be maintained** for all custom operations
4. **✅ Schema will stay synchronized** with backend changes

## Workflow Integration

### Development Workflow
1. Make changes to backend plugins
2. Restart backend server
3. Run `pnpm generate-schema` in backend
4. Run `pnpm generate` in frontend
5. Frontend now has updated types

### CI/CD Integration
Add to your deployment pipeline:
```bash
# Start backend
cd backend && pnpm start &

# Wait for server to be ready
sleep 10

# Generate schema
cd backend && pnpm generate-schema

# Generate frontend types
cd frontend && pnpm generate

# Build frontend
cd frontend && pnpm build
```

## Additional Considerations

### 1. Schema Validation
Consider adding a validation step to ensure all required operations are present:

```typescript
// In generate-schema.ts
const requiredOperations = [
  'createPreOrderStripePaymentIntent',
  'linkPaymentIntentToOrder',
  'calculateEstimatedTotal',
  'validateLocalCartCoupon'
];

requiredOperations.forEach(operation => {
  if (!sdl.includes(operation)) {
    console.warn(`⚠️  Warning: ${operation} not found in schema`);
  }
});
```

### 2. Environment-Specific Schemas
For different environments, you might want to generate schemas from different backend URLs:

```typescript
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_ENDPOINT = `${BACKEND_URL}/shop-api`;
```

### 3. Error Handling
Ensure the backend is running before schema generation:

```typescript
// Add health check before schema generation
const healthCheck = await fetch(`${BACKEND_URL}/health`);
if (!healthCheck.ok) {
  throw new Error('Backend server is not running');
}
```

## Files to Modify

1. **Create:** `backend/scripts/generate-schema.ts`
2. **Modify:** `backend/package.json` (add generate-schema script)
3. **Modify:** `frontend/codegen-shop.ts` (update schema path)
4. **Modify:** `frontend/package.json` (update generate scripts)

## Dependencies to Add

No additional dependencies are required as all necessary packages are already installed:
- `graphql` (already in backend)
- `node-fetch` (already in backend)
- `@graphql-codegen/cli` (already in frontend)

This solution follows the exact pattern used in the `adrdsouza/damn` repository and will resolve all GraphQL validation errors by ensuring the frontend has access to the complete, up-to-date schema including all custom plugin operations.