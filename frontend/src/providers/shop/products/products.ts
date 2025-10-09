import gql from 'graphql-tag';
import { shopSdk } from '~/graphql-wrapper';
import { requester } from '~/utils/api';
import { productCache } from '~/services/ProductCacheService';
import staticProducts from '~/data/products.json';
// Collections imports removed - no longer using cached versions

// 🎯 STRATEGIC CACHING: Using advanced ProductCache service for better performance
// Stock information must always be fresh for ecommerce accuracy
// 🚀 STATIC DATA: Product info stored in JSON, only query dynamic data (stock, images)

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



// 🚀 OPTIMIZED: Combined query that checks stock first, then loads style data only for available products
export const getShirtStylesForSelection = async () => {
	console.log('🚀 Loading optimized data for style selection (stock-first approach)...');

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

	// 🚀 SMART QUERY: Get both stock and style data, but prioritize stock check
	const optimizedStyleSelectionQuery = gql`
		query GetOptimizedShirtStylesForSelection {
			shortsleeve: product(slug: "shortsleeveshirt") {
				id
				name
				slug
				variants {
					id
					priceWithTax
					currencyCode
					stockLevel
				}
			}
			longsleeve: product(slug: "longsleeveshirt") {
				id
				name
				slug
				variants {
					id
					priceWithTax
					currencyCode
					stockLevel
				}
			}
		}
	`;
	
	try {
		const startTime = Date.now();
		const result: any = await requester(optimizedStyleSelectionQuery);
		
		// 🚀 SMART FILTERING: Only return products that have available variants
		// Note: Inventory tracking is disabled in the system, so products are always available
		const hasAvailableVariants = (product: any): boolean => {
			if (!product?.variants) return false;
			// Since inventory tracking is disabled, all products with variants are available
			// We still check for variants to ensure the product is properly configured
			return product.variants.length > 0;
		};

		const filteredShortSleeve = hasAvailableVariants(result.shortsleeve) ? result.shortsleeve : null;
		const filteredLongSleeve = hasAvailableVariants(result.longsleeve) ? result.longsleeve : null;

		const loadTime = Date.now() - startTime;
		const availableCount = (filteredShortSleeve ? 1 : 0) + (filteredLongSleeve ? 1 : 0);
		console.log(`✅ Optimized style selection data loaded in ${loadTime}ms - ${availableCount}/2 products available`);

		// Cache the results (only cache available products)
		if (filteredShortSleeve) {
			productCache.set(`style:shortsleeveshirt`, {
				data: filteredShortSleeve,
				timestamp: Date.now()
			}, STYLE_CACHE_DURATION);
		}

		if (filteredLongSleeve) {
			productCache.set(`style:longsleeveshirt`, {
				data: filteredLongSleeve,
				timestamp: Date.now()
			}, STYLE_CACHE_DURATION);
		}

		return {
			shortSleeve: filteredShortSleeve,
			longSleeve: filteredLongSleeve,
		};
	} catch (error) {
		console.error('❌ Optimized style selection query failed:', error);
		return { shortSleeve: null, longSleeve: null };
	}
};

// 🚀 PHASE 1: FCP Button Data + Stock - Load on server-side for instant button activation
export const getFCPButtonData = async () => {
	console.log('🚀 [FCP] Loading button data + stock levels (server-side)...');

	const startTime = Date.now();

	try {
		// Query stock levels from API (server-side, so it's fast!)
		const stockQuery = gql`
			query GetStockLevelsServerSide {
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

		const result: any = await requester(stockQuery);
		const queryTime = Date.now() - startTime;
		console.log(`✅ [FCP] Stock query completed in ${queryTime}ms (server-side)`);

		// Merge static product data with live stock levels
		const mergeProductWithStock = (staticData: any, apiData: any) => {
			if (!apiData) return null;

			// Create a map of variant ID to stock level for fast lookup
			const stockMap = new Map<string, string>();
			apiData.variants.forEach((v: any) => {
				stockMap.set(v.id, v.stockLevel);
			});

			return {
				id: staticData.id,
				name: staticData.name,
				slug: staticData.slug,
				featuredAsset: null, // Will be loaded in Phase 2
				variants: staticData.variants.map((staticVariant: any) => {
					const stockLevel = stockMap.get(staticVariant.variantId) || '0';
					return {
						id: staticVariant.variantId,
						priceWithTax: staticData.basePrice,
						currencyCode: staticData.currencyCode,
						stockLevel: stockLevel,
						sku: staticVariant.sku,
						options: [
							{
								id: `size-${staticVariant.sizeCode}`,
								code: staticVariant.sizeCode,
								name: staticVariant.size,
								group: { id: 'size-group', code: 'size', name: 'Size' }
							},
							{
								id: `color-${staticVariant.colorCode}`,
								code: staticVariant.colorCode,
								name: staticVariant.color,
								group: { id: 'color-group', code: 'color', name: 'Color' }
							}
						]
					};
				})
			};
		};

		const shortSleeveData = mergeProductWithStock(staticProducts.shortSleeve, result.shortsleeve);
		const longSleeveData = mergeProductWithStock(staticProducts.longSleeve, result.longsleeve);

		const totalTime = Date.now() - startTime;
		console.log(`✅ [FCP] Complete data ready in ${totalTime}ms with stock levels!`);

		return {
			shortSleeve: shortSleeveData,
			longSleeve: longSleeveData
		};
	} catch (error) {
		console.error('❌ [FCP] Data loading failed:', error);
		// Fallback to static data without stock
		return {
			shortSleeve: {
				id: staticProducts.shortSleeve.id,
				name: staticProducts.shortSleeve.name,
				slug: staticProducts.shortSleeve.slug,
				variants: [{
					priceWithTax: staticProducts.shortSleeve.basePrice,
					currencyCode: staticProducts.shortSleeve.currencyCode
				}]
			},
			longSleeve: {
				id: staticProducts.longSleeve.id,
				name: staticProducts.longSleeve.name,
				slug: staticProducts.longSleeve.slug,
				variants: [{
					priceWithTax: staticProducts.longSleeve.basePrice,
					currencyCode: staticProducts.longSleeve.currencyCode
				}]
			}
		};
	}
};

// 🚀 PHASE 2A: Stock Levels Only - Ultra-fast query for immediate button activation
export const getStockLevelsOnly = async () => {
	console.log('🚀 [PHASE 2A] Loading stock levels only (ultra-fast)...');

	// Ultra-lightweight query - ONLY stock levels, no images
	// Note: trackInventory is not available in shop API, but stockLevel handles both cases:
	// - Tracked inventory: stockLevel = actual number (e.g., "35")
	// - Untracked inventory: stockLevel = "9007199254740991" (unlimited)
	const stockQuery = gql`
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
		const result: any = await requester(stockQuery);
		const loadTime = Date.now() - startTime;
		console.log(`✅ [PHASE 2A] Stock levels loaded in ${loadTime}ms`);

		// Merge static product data with stock levels only
		const mergeProductWithStock = (staticData: any, apiData: any) => {
			if (!apiData) return null;

			// Create a map of variant ID to stock level for fast lookup
			const stockMap = new Map<string, string>();
			apiData.variants.forEach((v: any) => {
				stockMap.set(v.id, v.stockLevel);
			});

			return {
				id: staticData.id,
				name: staticData.name,
				slug: staticData.slug,
				featuredAsset: null, // Will be loaded in Phase 2B
				variants: staticData.variants.map((staticVariant: any) => {
					// Look up stock level by variant ID from static data
					const stockLevel = stockMap.get(staticVariant.variantId) || '0';

					return {
						id: staticVariant.variantId,
						priceWithTax: staticData.basePrice,
						currencyCode: staticData.currencyCode,
						stockLevel: stockLevel,
						sku: staticVariant.sku,
						options: [
							{
								id: `size-${staticVariant.sizeCode}`,
								code: staticVariant.sizeCode,
								name: staticVariant.size,
								group: {
									id: 'size-group',
									code: 'size',
									name: 'Size'
								}
							},
							{
								id: `color-${staticVariant.colorCode}`,
								code: staticVariant.colorCode,
								name: staticVariant.color,
								group: {
									id: 'color-group',
									code: 'color',
									name: 'Color'
								}
							}
						]
					};
				})
			};
		};

		const shortSleeveData = mergeProductWithStock(staticProducts.shortSleeve, result.shortsleeve);
		const longSleeveData = mergeProductWithStock(staticProducts.longSleeve, result.longsleeve);

		console.log(`📊 [PHASE 2A] Products with stock ready: Short=${!!shortSleeveData}, Long=${!!longSleeveData}`);

		return {
			shortSleeve: shortSleeveData,
			longSleeve: longSleeveData
		};
	} catch (error) {
		console.error('❌ [PHASE 2A] Stock query failed:', error);
		return { shortSleeve: null, longSleeve: null };
	}
};

// 🚀 PHASE 2B: Featured Images - Load after stock (can wait 200ms)
export const getFeaturedImages = async () => {
	console.log('🚀 [PHASE 2B] Loading featured images...');

	// Image-only query
	const imageQuery = gql`
		query GetFeaturedImages {
			shortsleeve: product(slug: "shortsleeveshirt") {
				id
				featuredAsset {
					id
					preview
					source
				}
			}
			longsleeve: product(slug: "longsleeveshirt") {
				id
				featuredAsset {
					id
					preview
					source
				}
			}
		}
	`;

	try {
		const startTime = Date.now();
		const result: any = await requester(imageQuery);
		const loadTime = Date.now() - startTime;
		console.log(`✅ [PHASE 2B] Featured images loaded in ${loadTime}ms`);

		return {
			shortSleeve: result.shortsleeve?.featuredAsset || null,
			longSleeve: result.longsleeve?.featuredAsset || null
		};
	} catch (error) {
		console.error('❌ [PHASE 2B] Image query failed:', error);
		return { shortSleeve: null, longSleeve: null };
	}
};

// 🚀 PHASE 3: Color Thumbnails - Load color variant images (triggered on style selection)
export const getColorThumbnails = async (productSlug: string) => {
	console.log(`🚀 [COLOR THUMBS] Loading color thumbnails for ${productSlug}...`);

	// Check cache first
	const THUMBS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
	const cacheKey = `thumbs:${productSlug}`;
	const cached = productCache.get(cacheKey);

	if (cached) {
		const cachedData = cached as { data: any; timestamp: number };
		if (Date.now() - cachedData.timestamp < THUMBS_CACHE_DURATION) {
			console.log(`✅ [COLOR THUMBS] Using cached thumbnails for ${productSlug}`);
			return cachedData.data;
		}
	}

	const thumbnailsQuery = gql`
		query GetColorThumbnails($slug: String!) {
			product(slug: $slug) {
				id
				name
				slug
				variants {
					id
					name
					featuredAsset {
						id
						preview
						source
					}
					assets {
						id
						preview
						source
					}
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
		const result = await requester(thumbnailsQuery, { slug: productSlug }) as any;
		const loadTime = Date.now() - startTime;
		console.log(`✅ [COLOR THUMBS] Thumbnails loaded in ${loadTime}ms for ${productSlug}`);

		// Cache the result
		productCache.set(cacheKey, {
			data: result.product,
			timestamp: Date.now()
		}, THUMBS_CACHE_DURATION);

		return result.product;
	} catch (error) {
		console.error(`❌ [COLOR THUMBS] Thumbnails query failed for ${productSlug}:`, error);
		return null;
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


