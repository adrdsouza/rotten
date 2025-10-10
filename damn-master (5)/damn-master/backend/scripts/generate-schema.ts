import { getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';
import type { IntrospectionQuery } from 'graphql';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate static GraphQL schema for frontend codegen
 * This script uses introspection query against the running server
 * Based on Vendure's own schema generation approach
 */
async function generateSchema() {
  console.log('🚀 Starting schema generation via introspection...');
  
  try {
    // Use introspection query to get schema from running server
    const introspectionQuery = getIntrospectionQuery();
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch('http://localhost:3000/admin-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vendure Schema Generator'
      },
      body: JSON.stringify({
        query: introspectionQuery
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json() as { data?: IntrospectionQuery; errors?: any[] };
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }
    
    if (!result.data) {
      throw new Error('No schema data returned from introspection query');
    }
    
    // Build schema from introspection result
    const schema = buildClientSchema(result.data);
    
    // Convert schema to SDL (Schema Definition Language)
    const schemaString = printSchema(schema);
    
    // Write schema to file
    const schemaPath = join(__dirname, '..', 'schema.graphql');
    writeFileSync(schemaPath, schemaString);
    
    console.log('✅ Schema generated successfully at:', schemaPath);
    console.log('📊 Schema contains', schemaString.split('\n').length, 'lines');
    
  } catch (error) {
    console.error('❌ Error generating schema:', error);
    process.exit(1);
  }
}

// Run the script
generateSchema();