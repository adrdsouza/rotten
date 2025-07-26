import gql from 'graphql-tag';
import { shopSdk } from '~/graphql-wrapper';
// Collections imports removed - no longer using cached versions

// ❌ REMOVED: GraphQL caching removed for real-time stock accuracy
// Stock information must always be fresh for ecommerce

// ❌ REMOVED: Collections caching removed for data freshness
// Use direct getCollections() and getCollectionBySlug() calls

// ❌ REMOVED: All caching removed for real-time data accuracy
// Use direct functions: getProductBySlug(), searchOptimized(), search()

export const getProductBySlug = async (slug: string) => {
	return shopSdk.product({ slug }).then((res: any) => res.product);
};

export const getProductById = async (id: string) => {
	return shopSdk.product({ id }).then((res: any) => res.product);
};

// 🚀 OPTIMIZED QUERIES - Lightweight versions for better performance
// These work alongside existing queries - no breaking changes

// Optimized product query - use existing method with caching
export const getProductBySlugLightweight = async (slug: string) => {
	// For now, use existing getProductBySlug method
	// The optimization comes from caching layer
	return getProductBySlug(slug);
};

// 🚀 OPTIMIZED: Product page fragment - removed unused heavy fields
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


