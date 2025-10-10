/**
 * Shop GraphQL Queries
 * 
 * Optimized queries for the new hardcoded shop architecture.
 * Only queries what's needed, when needed.
 */

import gql from 'graphql-tag';
import { requester } from '~/utils/api';

// Stock Query (Only at SKU Level) - query through products using IDs for better performance
const GET_VARIANT_STOCK = gql`
  query GetVariantStock {
    shortsleeve: product(id: "1") {
      id
      variants {
        id
        stockLevel
      }
    }
    longsleeve: product(id: "3") {
      id
      variants {
        id
        stockLevel
      }
    }
  }
`;

// Product Featured Image Query (Phase 1)
const GET_PRODUCT_FEATURED_IMAGE = gql`
  query GetProductFeaturedImage($productId: ID!) {
    product(id: $productId) {
      id
      featuredAsset {
        id
        preview
        source
      }
    }
  }
`;

// Product Gallery Images Query (Phase 2)
const GET_PRODUCT_GALLERY = gql`
  query GetProductGallery($productId: ID!) {
    product(id: $productId) {
      id
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
    }
  }
`;

// Variant Featured Image Query (Phase 3) - Query through products using IDs for better performance
const GET_VARIANT_FEATURED_IMAGES = gql`
  query GetVariantFeaturedImages {
    shortsleeve: product(id: "1") {
      id
      variants {
        id
        featuredAsset {
          id
          preview
          source
        }
      }
    }
    longsleeve: product(id: "3") {
      id
      variants {
        id
        featuredAsset {
          id
          preview
          source
        }
      }
    }
  }
`;

// Variant Gallery Images Query (Phase 4) - Query through products using IDs for better performance
const GET_VARIANT_GALLERY = gql`
  query GetVariantGallery {
    shortsleeve: product(id: "1") {
      id
      variants {
        id
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
      }
    }
    longsleeve: product(id: "3") {
      id
      variants {
        id
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
      }
    }
  }
`;

// Stock checking functions
export async function checkVariantStock(_variantIds: string[]): Promise<Map<string, number>> {
  try {
    const result: any = await requester(GET_VARIANT_STOCK);
    const stockMap = new Map<string, number>();

    // Parse shortsleeve variants
    result.shortsleeve?.variants?.forEach((variant: any) => {
      const stockLevel = parseInt(String(variant.stockLevel || '0'));
      stockMap.set(variant.id, stockLevel);
    });

    // Parse longsleeve variants
    result.longsleeve?.variants?.forEach((variant: any) => {
      const stockLevel = parseInt(String(variant.stockLevel || '0'));
      stockMap.set(variant.id, stockLevel);
    });

    return stockMap;
  } catch (error) {
    console.error('Error checking variant stock:', error);
    return new Map();
  }
}

// 🚀 NEW: Product-level stock check (just checks if product has ANY stock)
export async function checkProductsHaveStock(): Promise<{ shortSleeve: boolean; longSleeve: boolean }> {
  try {
    const result: any = await requester(GET_VARIANT_STOCK);

    // Check if short sleeve has any variant with stock > 0
    const shortHasStock = result.shortsleeve?.variants?.some((v: any) => {
      const stock = parseInt(String(v.stockLevel || '0'));
      return stock > 0;
    }) || false;

    // Check if long sleeve has any variant with stock > 0
    const longHasStock = result.longsleeve?.variants?.some((v: any) => {
      const stock = parseInt(String(v.stockLevel || '0'));
      return stock > 0;
    }) || false;

    return { shortSleeve: shortHasStock, longSleeve: longHasStock };
  } catch (error) {
    console.error('Error checking product stock:', error);
    return { shortSleeve: false, longSleeve: false };
  }
}

// Image loading functions
export async function loadProductFeaturedImage(productId: string) {
  try {
    const result: any = await requester(GET_PRODUCT_FEATURED_IMAGE, { productId });
    return result.product?.featuredAsset || null;
  } catch (error) {
    console.error('Error loading product featured image:', error);
    return null;
  }
}

export async function loadProductGallery(productId: string) {
  try {
    const result: any = await requester(GET_PRODUCT_GALLERY, { productId });
    return {
      featuredAsset: result.product?.featuredAsset || null,
      assets: result.product?.assets || []
    };
  } catch (error) {
    console.error('Error loading product gallery:', error);
    return { featuredAsset: null, assets: [] };
  }
}

export async function loadVariantFeaturedImage(variantId: string) {
  try {
    const result: any = await requester(GET_VARIANT_FEATURED_IMAGES);

    // Search through both products for the variant
    const allVariants = [
      ...(result.shortsleeve?.variants || []),
      ...(result.longsleeve?.variants || [])
    ];

    const variant = allVariants.find(v => v.id === variantId);
    return variant?.featuredAsset || null;
  } catch (error) {
    console.error('Error loading variant featured image:', error);
    return null;
  }
}

export async function loadVariantGallery(variantId: string) {
  try {
    const result: any = await requester(GET_VARIANT_GALLERY);

    // Search through both products for the variant
    const allVariants = [
      ...(result.shortsleeve?.variants || []),
      ...(result.longsleeve?.variants || [])
    ];

    const variant = allVariants.find((v: any) => v.id === variantId);
    return {
      featuredAsset: variant?.featuredAsset || null,
      assets: variant?.assets || []
    };
  } catch (error) {
    console.error('Error loading variant gallery:', error);
    return { featuredAsset: null, assets: [] };
  }
}

// Stock bubbling up logic as specified in the plan
export function checkStyleHasStock(stockMap: Map<string, number>, variantIds: string[]): boolean {
  return variantIds.some(variantId => {
    const stock = stockMap.get(variantId) || 0;
    return stock > 0;
  });
}

export async function checkSizeHasStock(
  stockMap: Map<string, number>,
  style: 'short' | 'long',
  size: string
): Promise<boolean> {
  // Dynamic import to avoid circular dependency
  const { COLORS, getVariantId } = await import('~/data/shop-constants');

  return COLORS.some(color => {
    const variantId = getVariantId(style, size, color.code);
    if (!variantId) return false;
    const stock = stockMap.get(variantId) || 0;
    return stock > 0;
  });
}

export async function checkColorHasStock(
  stockMap: Map<string, number>,
  style: 'short' | 'long',
  size: string,
  color: string
): Promise<boolean> {
  // Dynamic import to avoid circular dependency
  const { getVariantId } = await import('~/data/shop-constants');

  const variantId = getVariantId(style, size, color);
  if (!variantId) return false;
  const stock = stockMap.get(variantId) || 0;
  return stock > 0;
}
