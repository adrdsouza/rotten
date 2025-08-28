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

    const result = await response.json() as { data: any };
    const { data } = result;
    
    // Build client schema from introspection result
    const schema = buildClientSchema(data);
    
    // Convert to SDL (Schema Definition Language)
    const sdl = printSchema(schema);
    
    // Write to schema file
    writeFileSync('schema.graphql', sdl);
    
    console.log('✅ Schema generated successfully at schema.graphql');
    console.log(`📊 Schema contains ${sdl.split('\n').length} lines`);
    
    // Validate that required custom operations are present
    const requiredOperations = [
      'createPreOrderStripePaymentIntent',
      'linkPaymentIntentToOrder',
      'calculateEstimatedTotal',
      'validateLocalCartCoupon'
    ];

    console.log('\n🔍 Validating custom operations...');
    requiredOperations.forEach(operation => {
      if (sdl.includes(operation)) {
        console.log(`✅ ${operation} found in schema`);
      } else {
        console.warn(`⚠️  Warning: ${operation} not found in schema`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating schema:', error);
    (process as any).exit(1);
  }
}

generateSchema();