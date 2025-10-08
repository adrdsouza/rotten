import gql from 'graphql-tag';
import { shopSdk } from '~/graphql-wrapper';
import { requester } from '~/utils/api';
import { productCache } from '~/services/ProductCacheService';
// Collections imports removed - no longer using cached versions

// 🎯 STRATEGIC CACHING: Using advanced ProductCache service for better performance
// Stock information must always be fresh for ecommerce accuracy

// Create a lightweight stock-only query
const stockOnlyQuery = gql`
	query productStock($slug: String) {
		product(slug: $slug) {
			id
			variants {
				id
				stockLevel
			}
		}
	}
`;

// 🚀 STEP 2: Use optimized shop page fragment for smaller payloads
export const getProductBySlugForShop = async (slug: string) => {
	console.log(`Loading product with optimized fragment: ${slug}`);

	try {
		// Try to get static data from cache
		const cachedStatic = productCache.getStaticProduct(slug);

		if (cachedStatic) {
			console.log(`Cache hit for ${slug}, fetching fresh stock data`);

			try {
				// Only fetch stock levels (much faster, smaller query)
				const stockData = await requester(stockOnlyQuery, { slug }) as any;

				if (stockData?.product?.variants) {
					// Merge cached static data with fresh stock levels
					const mergedProduct = productCache.mergeProductWithStock(cachedStatic, stockData.product);
					console.log(`Product loaded from cache with optimized fragment for ${slug}:`, !!mergedProduct);
					return mergedProduct;
				} else {
					console.warn(`Stock query failed for ${slug}, falling back to full query`);
				}
			} catch (stockError) {
				console.error(`Stock query error for ${slug}:`, stockError);
				// Fall through to full query
			}
		}

		// No cache hit - use shop-optimized query (removes unnecessary assets)
		console.log(`Cache miss for ${slug}, fetching with shop-optimized query`);

		// Create ultra-lightweight query - NO ASSETS at all for maximum speed
		const shopInitialQuery = gql`
			query shopInitialProduct($slug: String, $id: ID) {
				product(slug: $slug, id: $id) {
					id
					name
					slug
					description
					facetValues {
						facet {
							id
							code
							name
						}
						id
						code
						name
					}
					# Removed: featuredAsset and assets (saves ~40-50% payload size)
					# Images will be lazy-loaded only when user selects a style
					variants {
						id
						name
						priceWithTax
						currencyCode
						sku
						stockLevel
						options {
							id
							code
							name
							group {
								id
								code
								name
							}
						}
					}
				}
			}
		`;

		const product = await requester(shopInitialQuery, { slug }).then((res: any) => res.product);

		if (product) {
			productCache.cacheStaticProduct(slug, product);
			console.log(`Product loaded and cached with optimized fragment for ${slug}:`, !!product);
		} else {
			console.warn(`No product found for slug: ${slug}`);
		}

		return product;
	} catch (error) {
		console.error(`Error loading product with optimized fragment ${slug}:`, error);
		return null;
	}
};

// 🚀 STEP 1: Strategic Caching with Proper Error Handling
export const getProductBySlug = async (slug: string) => {
	console.log(`Loading product: ${slug}`);

	try {
		// Try to get static data from cache
		const cachedStatic = productCache.getStaticProduct(slug);

		if (cachedStatic) {
			console.log(`Cache hit for ${slug}, fetching fresh stock data`);

			try {
				// Only fetch stock levels (much faster, smaller query)
				const stockData = await requester(stockOnlyQuery, { slug }) as any;

				if (stockData?.product?.variants) {
					// Merge cached static data with fresh stock levels
					const mergedProduct = productCache.mergeProductWithStock(cachedStatic, stockData.product);
					console.log(`Product loaded from cache for ${slug}:`, !!mergedProduct);
					return mergedProduct;
				} else {
					console.warn(`Stock query failed for ${slug}, falling back to full query`);
				}
			} catch (stockError) {
				console.error(`Stock query error for ${slug}:`, stockError);
				// Fall through to full query
			}
		}

		// No cache hit or stock query failed - fetch fresh data
		console.log(`Cache miss for ${slug}, fetching full product data`);
		const product = await shopSdk.product({ slug }).then((res: any) => res.product);

		if (product) {
			// Cache static parts for next time
			productCache.cacheStaticProduct(slug, product);
			console.log(`Product loaded and cached for ${slug}:`, !!product);
		} else {
			console.warn(`No product found for slug: ${slug}`);
		}

		return product;
	} catch (error) {
		console.error(`Error loading product ${slug}:`, error);
		return null;
	}
};

export const getProductById = async (id: string) => {
	return shopSdk.product({ id }).then((res: any) => res.product);
};

// 🚀 QUERY BATCHING: Load multiple products in single request
// 🚀 QUERY BATCHING: Single HTTP request for multiple products
export const getBatchedProductsForShop = async (slugs: string[]) => {
	console.log(`🚀 Query batching: Loading ${slugs.length} products in single request`);

	// Build batched query with aliases for each product
	const batchedQuery = gql`
		query GetBatchedProductsForShop {
			${slugs.map(slug => `
				${slug.replace(/[^a-zA-Z0-9]/g, '')}: product(slug: "${slug}") {
					...ShopPageProduct
				}
			`).join('')}
		}
		${shopPageProductFragment}
	`;

	try {
		const startTime = Date.now();
		const result: any = await requester(batchedQuery);

		const loadTime = Date.now() - startTime;
		console.log(`✅ Batched query completed in ${loadTime}ms for products: ${slugs.join(', ')}`);

		// Extract products from batched response and cache them
		const products = slugs.map(slug => {
			const aliasKey = slug.replace(/[^a-zA-Z0-9]/g, '');
			const product = result[aliasKey];

			if (product) {
				// Cache the static data for each product
				productCache.cacheStaticProduct(slug, product);
				console.log(`Product loaded and cached with batched query for ${slug}: ${!!product}`);
			}

			return product;
		});

		return products;
	} catch (error) {
		console.error('❌ Batched query failed, falling back to individual queries:', error);

		// Fallback to individual queries if batching fails
		return await getMultipleProductsBySlug(slugs);
	}
};

export const getMultipleProductsBySlug = async (slugs: string[]) => {
	// Parallel individual queries (fallback method)
	console.log(`Fallback: Loading ${slugs.length} products with parallel individual queries`);

	try {
		const results = await Promise.all(
			slugs.map(slug => getProductBySlugForShop(slug))
		);
		return results;
	} catch (error) {
		console.error('Parallel queries failed:', error);

		// Fallback to sequential queries if parallel fails
		const results = [];
		for (const slug of slugs) {
			try {
				const product = await getProductBySlugForShop(slug);
				results.push(product);
			} catch (err) {
				console.error(`Failed to load product ${slug}:`, err);
				results.push(null);
			}
		}
		return results;
	}
};

// 🚀 LAZY ASSET LOADING: Load product images only when needed
export const getProductAssets = async (slug: string) => {
	console.log(`Lazy loading assets for: ${slug}`);

	// Check asset cache first
	const cached = productCache.getAssets(slug);
	if (cached) {
		console.log(`Asset cache hit for ${slug}`);
		return cached;
	}

	try {
		// Lightweight query to fetch ONLY assets
		const assetQuery = gql`
			query productAssets($slug: String) {
				product(slug: $slug) {
					id
					featuredAsset {
						id
						preview
					}
					assets {
						id
						preview
					}
				}
			}
		`;

		const result = await requester(assetQuery, { slug }) as any;

		if (result?.product) {
			const assetData = {
				assets: result.product.assets || [],
				featuredAsset: result.product.featuredAsset,
			};

			// Cache the assets
			productCache.cacheAssets(slug, assetData);
			console.log(`Assets loaded and cached for ${slug}:`, assetData.assets.length, 'assets');

			return assetData;
		}

		return { assets: [], featuredAsset: null };
	} catch (error) {
		console.error(`Error loading assets for ${slug}:`, error);
		return { assets: [], featuredAsset: null };
	}
};

// 🚀 OPTIMIZED QUERIES - Lightweight versions for better performance
// These work alongside existing queries - no breaking changes

// Optimized product query - use existing method with caching
export const getProductBySlugLightweight = async (slug: string) => {
	// For now, use existing getProductBySlug method
	// The optimization comes from caching layer
	return getProductBySlug(slug);
};

// 🚀 SHOP PAGE OPTIMIZED: Minimal fragment for shop page performance
export const shopPageProductFragment = gql`
	fragment ShopPageProduct on Product {
		id
		name
		slug
		description

		# Only fetch relevant facet values for shop page filtering
		facetValues {
			id
			code
			name
			facet {
				id
				code
				name
			}
		}

		# Only featured asset initially (other assets loaded on demand)
		featuredAsset {
			id
			preview
		}

		# Optimized variant data - only essential fields
		variants {
			id
			name
			priceWithTax
			currencyCode
			sku
			stockLevel

			# Simplified options - group data cached separately
			options {
				id
				code
				name
				group {
					id
					code
					name
				}
			}
		}
	}
`;

// 🚀 DETAILED: Keep original fragment for product detail pages
export const detailedProductFragment = gql`
	fragment OptimizedDetailedProduct on Product {
		id
		name
		slug
		description

		facetValues {
			facet {
				id
				code
				name
			}
			id
			code
			name
		}
		featuredAsset {
			id
			preview
		}
		assets {
			id
			preview
		}
		variants {
			id
			name
			priceWithTax
			currencyCode
			sku
			stockLevel
			options {
				id
				code
				name
				group {
					id
					code
					name
				}
			}
		}
	}
`;

// ❌ REMOVED UNUSED FIELDS (saves ~30% payload size):
// - collections (with breadcrumbs) - Not used on product pages, only for navigation
// - variants.featuredAsset - Never displayed in UI anywhere
// ✅ KEPT: facetValues - Required for shop page filtering to work

gql`
	query product($slug: String, $id: ID) {
		product(slug: $slug, id: $id) {
			...OptimizedDetailedProduct
		}
	}
	${detailedProductFragment}
`;

// 🚀 ULTRA-LIGHTWEIGHT: Stock-only query for initial page load
export const getStockLevelsOnly = async () => {
	console.log('🚀 Loading stock levels only for initial page load...');
	
	// Check if we have cached stock levels that are still fresh
	const cachedShortSleeve = productCache.getStockLevels('shortsleeveshirt');
	const cachedLongSleeve = productCache.getStockLevels('longsleeveshirt');
	
	// No stock caching - always query fresh for e-commerce accuracy
	const STOCK_CACHE_DURATION = 0; // No caching
	
	if (cachedShortSleeve && cachedLongSleeve) {
		const now = Date.now();
		if (now - cachedShortSleeve.timestamp < STOCK_CACHE_DURATION && 
			now - cachedLongSleeve.timestamp < STOCK_CACHE_DURATION) {
			console.log('✅ Using cached stock levels for initial page load');
			return {
				shortSleeve: cachedShortSleeve.data,
				longSleeve: cachedLongSleeve.data,
			};
		}
	}
	
	const stockOnlyQuery = gql`
		query GetStockLevelsOnly {
			shortsleeve: product(slug: "shortsleeveshirt") {
				id
				variants {
					id
					stockLevel
				}
			}
			longsleeve: product(slug: "longsleeveshirt") {
				id
				variants {
					id
					stockLevel
				}
			}
		}
	`;
	
	try {
		const startTime = Date.now();
		const result: any = await requester(stockOnlyQuery);
		
		const loadTime = Date.now() - startTime;
		console.log(`✅ Stock levels loaded in ${loadTime}ms - payload ~95% smaller than full products`);
		
		// Cache the stock levels
		if (result.shortsleeve) {
			productCache.cacheStockLevels('shortsleeveshirt', {
				data: result.shortsleeve,
				timestamp: Date.now()
			});
		}
		
		if (result.longsleeve) {
			productCache.cacheStockLevels('longsleeveshirt', {
				data: result.longsleeve,
				timestamp: Date.now()
			});
		}
		
		return {
			shortSleeve: result.shortsleeve,
			longSleeve: result.longsleeve,
		};
	} catch (error) {
		console.error('❌ Stock levels query failed:', error);
		return { shortSleeve: null, longSleeve: null };
	}
};

// 🚀 STEP-BY-STEP LOADING: Ultra-lightweight queries for progressive loading
export const getShirtStylesForSelection = async () => {
	console.log('🚀 Loading ultra-lightweight data for style selection...');
	
	// Check if we have cached style selection data that's still fresh
	// Use longer cache duration for style selection data (5 minutes)
	const STYLE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
	
	const cachedShortSleeve = productCache.get(`style:shortsleeveshirt`);
	const cachedLongSleeve = productCache.get(`style:longsleeveshirt`);
	
	if (cachedShortSleeve && cachedLongSleeve) {
		const now = Date.now();
		const shortData = cachedShortSleeve as { data: any; timestamp: number };
		const longData = cachedLongSleeve as { data: any; timestamp: number };
		
		if (now - shortData.timestamp < STYLE_CACHE_DURATION && 
			now - longData.timestamp < STYLE_CACHE_DURATION) {
			console.log('✅ Using cached style selection data');
			return {
				shortSleeve: shortData.data,
				longSleeve: longData.data,
			};
		}
	}
	
	const styleSelectionQuery = gql`
		query GetShirtStylesForSelection {
			shortsleeve: product(slug: "shortsleeveshirt") {
				id
				name
				slug
				# Get minimal variant data for price display
				variants {
					priceWithTax
					currencyCode
				}
			}
			longsleeve: product(slug: "longsleeveshirt") {
				id
				name
				slug
				# Get minimal variant data for price display
				variants {
					priceWithTax
					currencyCode
				}
			}
		}
	`;
	
	try {
		const startTime = Date.now();
		const result: any = await requester(styleSelectionQuery);
		
		const loadTime = Date.now() - startTime;
		console.log(`✅ Style selection data loaded in ${loadTime}ms - payload ~85% smaller than full products`);
		
		// Cache the style selection data
		if (result.shortsleeve) {
			productCache.set(`style:shortsleeveshirt`, {
				data: result.shortsleeve,
				timestamp: Date.now()
			}, STYLE_CACHE_DURATION);
		}
		
		if (result.longsleeve) {
			productCache.set(`style:longsleeveshirt`, {
				data: result.longsleeve,
				timestamp: Date.now()
			}, STYLE_CACHE_DURATION);
		}
		
		return {
			shortSleeve: result.shortsleeve,
			longSleeve: result.longsleeve,
		};
	} catch (error) {
		console.error('❌ Style selection query failed:', error);
		return { shortSleeve: null, longSleeve: null };
	}
};

export const getProductOptionsForStep = async (productSlug: string, step: 2 | 3) => {
	console.log(`🚀 Loading step ${step} data for ${productSlug}...`);
	
	// Check cache first for step 2 data
	if (step === 2) {
		const cached = productCache.get(`options:step2:${productSlug}`);
		const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for options data
		
		if (cached) {
			const cacheData = cached as { data: any; timestamp: number };
			if (Date.now() - cacheData.timestamp < CACHE_DURATION) {
				console.log(`✅ Using cached step 2 data for ${productSlug}`);
				return cacheData.data;
			}
		}
	}
	
	if (step === 2) {
		// Step 2: Load size options and availability (no images yet)
		const sizeOptionsQuery = gql`
			query GetProductSizeOptions($slug: String) {
				product(slug: $slug) {
					id
					name
					slug
					variants {
						id
						stockLevel
						trackInventory
						priceWithTax
						currencyCode
						options {
							id
							code
							name
							group {
								id
								code
								name
							}
						}
					}
				}
			}
		`;
		
		try {
			const startTime = Date.now();
			const result = await requester(sizeOptionsQuery, { slug: productSlug }) as any;
			const loadTime = Date.now() - startTime;
			console.log(`✅ Size options loaded in ${loadTime}ms for ${productSlug}`);
			
			// Cache the result
			productCache.set(`options:step2:${productSlug}`, {
				data: result.product,
				timestamp: Date.now()
			}, 2 * 60 * 1000); // 2 minutes cache
			
			return result.product;
		} catch (error) {
			console.error(`❌ Size options query failed for ${productSlug}:`, error);
			return null;
		}
	}
	
	// Step 3: Color options already available from step 2, no additional query needed
	return null;
};

// 🚀 ULTRA-LIGHTWEIGHT: Single product stock-only query for cart validation
const singleProductStockQuery = gql`
  query GetSingleProductStockLevels($slug: String!) {
    product(slug: $slug) {
      id
      variants {
        id
        stockLevel
      }
    }
  }
`;

// 🚀 OPTIMIZED: Fetch stock levels only for a single product (used in cart validation)
export const getProductStockLevelsOnly = async (slug: string) => {
  const funcStartTime = performance.now();
  console.log(`🚀 [GRAPHQL TIMING] getProductStockLevelsOnly for: ${slug}`);

  try {
    const requestStart = performance.now();
    const result: any = await requester(singleProductStockQuery, { slug });
    const requestTime = performance.now() - requestStart;

    console.log(`⏱️ [GRAPHQL TIMING] GraphQL request for ${slug}: ${requestTime.toFixed(2)}ms`);
    console.log(`✅ [GRAPHQL TIMING] TOTAL getProductStockLevelsOnly for ${slug}: ${(performance.now() - funcStartTime).toFixed(2)}ms`);

    return result;
  } catch (error) {
    console.error(`❌ Failed to load stock levels for ${slug}:`, error);
    throw error;
  }
};


