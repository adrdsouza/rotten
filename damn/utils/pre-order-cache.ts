import preOrderProductsData from '~/data/pre-order-products.json';

interface PreOrderProductsCache {
  [productId: string]: number;
}

const preOrderProducts = preOrderProductsData as PreOrderProductsCache;

/**
 * Get the pre-order price for a specific product.
 * The price is returned in cents.
 */
export function getPreOrderPrice(productId: string): number | undefined {
  if (preOrderProducts[productId]) {
    return preOrderProducts[productId];
  }
  return undefined;
}

/**
 * Check if a specific product is a pre-order product.
 */
export function isProductPreOrder(productId: string): boolean {
  return productId in preOrderProducts;
}