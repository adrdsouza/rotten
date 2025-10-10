import saleProductsData from '~/data/sale-products.json';

interface SaleProductsCache {
  [productId: string]: number;
}

const saleProducts = saleProductsData as SaleProductsCache;

/**
 * Get the sale price for a specific product.
 * The price is returned in cents.
 */
export function getSalePrice(productId: string): number | undefined {
  if (saleProducts[productId]) {
    return saleProducts[productId];
  }
  return undefined;
}

/**
 * Check if a specific product has a sale price.
 */
export function hasProductSale(productId: string): boolean {
  return productId in saleProducts;
}