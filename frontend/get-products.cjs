const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = 'http://localhost:3000/shop-api';

// GraphQL query to get products with variants
const GET_PRODUCTS = `
  query GetProducts {
    products(options: { take: 10 }) {
      items {
        id
        name
        slug
        variants {
          id
          name
          sku
          stockLevel
          price
          priceWithTax
          currencyCode
        }
      }
    }
  }
`;

// Helper function to make GraphQL requests
async function graphqlRequest(query, variables = {}) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('Request failed:', error.message);
    return { error: error.message };
  }
}

async function getAvailableProducts() {
  console.log('🔍 Fetching available products from backend...');
  console.log('Backend URL:', BACKEND_URL);
  
  try {
    const result = await graphqlRequest(GET_PRODUCTS);
    
    if (result.error) {
      console.error('❌ Failed to fetch products:', result.error);
      return;
    }
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return;
    }
    
    const products = result.data?.products?.items || [];
    
    if (products.length === 0) {
      console.log('❌ No products found');
      return;
    }
    
    console.log(`✅ Found ${products.length} products:`);
    console.log('');
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. Product: ${product.name} (ID: ${product.id})`);
      console.log(`   Slug: ${product.slug}`);
      
      if (product.variants && product.variants.length > 0) {
        console.log(`   Variants (${product.variants.length}):`);
        product.variants.forEach((variant, vIndex) => {
          const stockLevel = parseInt(variant.stockLevel || '0');
          const hasStock = stockLevel > 0 || variant.stockLevel === 'IN_STOCK';
          const stockStatus = hasStock ? '✅ IN STOCK' : '❌ OUT OF STOCK';
          
          console.log(`     ${vIndex + 1}. ${variant.name} (ID: ${variant.id})`);
          console.log(`        SKU: ${variant.sku || 'N/A'}`);
          console.log(`        Stock: ${variant.stockLevel} ${stockStatus}`);
          console.log(`        Price: ${variant.priceWithTax / 100} ${variant.currencyCode}`);
        });
      } else {
        console.log('   ❌ No variants found');
      }
      console.log('');
    });
    
    // Find products with stock
    const availableVariants = [];
    products.forEach(product => {
      if (product.variants) {
        product.variants.forEach(variant => {
          const stockLevel = parseInt(variant.stockLevel || '0');
          const hasStock = stockLevel > 0 || variant.stockLevel === 'IN_STOCK';
          if (hasStock) {
            availableVariants.push({
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              variantId: variant.id,
              variantName: variant.name,
              sku: variant.sku,
              stockLevel: variant.stockLevel,
              price: variant.priceWithTax
            });
          }
        });
      }
    });
    
    if (availableVariants.length > 0) {
      console.log('🎉 Available variants for testing:');
      availableVariants.forEach((variant, index) => {
        console.log(`${index + 1}. ${variant.productName} - ${variant.variantName}`);
        console.log(`   Variant ID: ${variant.variantId}`);
        console.log(`   Product Slug: ${variant.productSlug}`);
        console.log(`   Stock: ${variant.stockLevel}`);
        console.log('');
      });
      
      console.log('💡 Use one of these variant IDs in your test script:');
      console.log(`   testProductVariantId = '${availableVariants[0].variantId}';`);
    } else {
      console.log('❌ No variants with stock found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
if (require.main === module) {
  getAvailableProducts().then(() => {
    console.log('✅ Product fetch completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { getAvailableProducts };