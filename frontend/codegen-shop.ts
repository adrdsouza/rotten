import type { CodegenConfig } from '@graphql-codegen/cli';
import { DEV_API, LOCAL_API, PROD_API } from './src/constants.js';

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
