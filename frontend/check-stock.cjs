const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const SHOP_API_URL = `${BACKEND_URL}/shop-api`;

// GraphQL query to get products and search for SKU
const GET_PRODUCTS_WITH_STOCK = `
  query GetProductsWithStock {
    products(options: { take: 100 }) {
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
          options {
            id
            name
            code
          }
        }
      }
    }
  }
`;

// GraphQL query to search for products by term (including SKU)
const SEARCH_PRODUCTS = `
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      items {
        productVariantId
        productVariantName
        sku
        inStock
        productId
        productName
        slug
      }
    }
  }
`;

async function makeGraphQLRequest(query, variables = {}) {
  try {
    const response = await fetch(SHOP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Request failed:', error);
    return null;
  }
}

function isVariantAvailable(variant) {
  // Based on how damn frontend handles stock levels:
  // - If stockLevel is undefined/null, treat as available (inventory not tracked)
  // - If stockLevel is a number > 0, it's available
  // - If stockLevel is 'OUT_OF_STOCK' or 0, it's not available
  
  if (variant.stockLevel === undefined || variant.stockLevel === null) {
    return true; // Inventory not tracked, assume available
  }
  
  if (typeof variant.stockLevel === 'string') {
    return variant.stockLevel !== 'OUT_OF_STOCK';
  }
  
  if (typeof variant.stockLevel === 'number') {
    return variant.stockLevel > 0;
  }
  
  return false;
}

async function checkSpecificSKU(sku) {
  console.log(`\n🔍 Checking stock for SKU: ${sku}`);
  console.log('=' .repeat(50));
  
  // First try searching for the SKU
  const searchData = await makeGraphQLRequest(SEARCH_PRODUCTS, { 
    input: { 
      term: sku,
      take: 10
    } 
  });
  
  if (searchData && searchData.search && searchData.search.items.length > 0) {
    const searchResults = searchData.search.items.filter(item => item.sku === sku);
    
    if (searchResults.length > 0) {
      const result = searchResults[0];
      console.log(`✅ Product Found via Search:`);
      console.log(`   Product Variant ID: ${result.productVariantId}`);
      console.log(`   Name: ${result.productVariantName}`);
      console.log(`   SKU: ${result.sku}`);
      console.log(`   Product: ${result.productName} (${result.slug})`);
      console.log(`   In Stock: ${result.inStock}`);
      
      return result;
    }
  }
  
  // If not found in search, try getting all products and filtering
  const data = await makeGraphQLRequest(GET_PRODUCTS_WITH_STOCK);
  
  if (!data || !data.products) {
    console.log(`❌ Failed to fetch products`);
    return null;
  }
  
  // Look for the SKU in all product variants
  for (const product of data.products.items) {
    for (const variant of product.variants) {
      if (variant.sku === sku) {
        console.log(`✅ Product Found in Product List:`);
        console.log(`   ID: ${variant.id}`);
        console.log(`   Name: ${variant.name}`);
        console.log(`   SKU: ${variant.sku}`);
        console.log(`   Product: ${product.name} (${product.slug})`);
        console.log(`   Stock Level: ${variant.stockLevel}`);
        console.log(`   Price: ${variant.price}`);
        
        // Determine if available based on inventory tracking
        const isAvailable = isVariantAvailable(variant);
        console.log(`   Available for purchase: ${isAvailable ? '✅ YES' : '❌ NO'}`);
        
        if (variant.options && variant.options.length > 0) {
          console.log(`   Options:`);
          variant.options.forEach(option => {
            console.log(`     - ${option.name}: ${option.code}`);
          });
        }
        
        return variant;
      }
    }
  }
  
  console.log(`❌ No product variant found with SKU: ${sku}`);
  return null;
}

async function checkAllProductsStock() {
  console.log('\n📦 Checking all products stock...');
  console.log('=' .repeat(50));
  
  const data = await makeGraphQLRequest(GET_PRODUCTS_WITH_STOCK);
  
  if (!data || !data.products) {
    console.log('❌ Failed to fetch products');
    return;
  }
  
  const products = data.products.items;
  let totalVariants = 0;
  let availableVariants = 0;
  let undefinedStockVariants = 0;
  let numericStockVariants = 0;
  
  console.log(`\n📊 Found ${products.length} products:`);
  
  products.forEach(product => {
    product.variants.forEach(variant => {
      totalVariants++;
      const isAvailable = isVariantAvailable(variant);
      
      if (isAvailable) {
        availableVariants++;
      }
      
      if (variant.stockLevel === undefined || variant.stockLevel === null) {
        undefinedStockVariants++;
      } else if (typeof variant.stockLevel === 'number') {
        numericStockVariants++;
      }
    });
  });
  
  console.log(`\n📈 Stock Summary:`);
  console.log(`   Total variants: ${totalVariants}`);
  console.log(`   Available variants: ${availableVariants}`);
  console.log(`   Undefined stock (not tracked): ${undefinedStockVariants}`);
  console.log(`   Numeric stock (tracked): ${numericStockVariants}`);
  
  // Show some available variants for testing
  console.log(`\n🛍️  Available variants for testing (first 5):`);
  let count = 0;
  for (const product of products) {
    for (const variant of product.variants) {
      if (isVariantAvailable(variant) && count < 5) {
        console.log(`   ${count + 1}. SKU: ${variant.sku} | ID: ${variant.id} | Product: ${product.name}`);
        console.log(`      Stock: ${variant.stockLevel} | Type: ${typeof variant.stockLevel}`);
        count++;
      }
    }
    if (count >= 5) break;
  }
}

async function main() {
  const targetSKU = 'RHWQWM1880-06';
  
  // Check the specific SKU first
  const targetVariant = await checkSpecificSKU(targetSKU);
  
  // Always check all products for stock availability
  await checkAllProductsStock();
  
  // Final status for target SKU
  console.log('\n🎯 Target SKU Status:');
  console.log('=' .repeat(30));
  if (targetVariant) {
    const isAvailable = isVariantAvailable(targetVariant);
    console.log(`SKU ${targetSKU}: ${isAvailable ? '✅ AVAILABLE' : '❌ OUT OF STOCK'}`);
    if (targetVariant.trackInventory === false) {
      console.log(`   📝 Note: Inventory tracking is DISABLED - treating as available`);
    } else if (targetVariant.stockLevel === undefined || targetVariant.stockLevel === null) {
      console.log(`   📝 Note: Stock level is undefined but inventory tracking is enabled`);
    }
  } else {
    console.log(`SKU ${targetSKU}: ❌ NOT FOUND`);
  }
  
  console.log('\n✅ Stock check completed!');
}

// Run the script
main().catch(console.error);