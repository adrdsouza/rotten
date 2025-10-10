/**
 * Product Catalog - Single Source of Truth
 * 
 * Centralized catalog that combines static product data with live stock levels.
 * All product queries should go through this catalog, not scattered functions.
 * 
 * Architecture:
 * - Static data from products.json
 * - Live stock from GraphQL
 * - Pre-calculated availability at product/size/color levels
 * - Smart caching with stock-aware invalidation
 */

import staticProducts from '~/data/products.json';
import { requester } from '~/utils/api';
import gql from 'graphql-tag';

interface VariantData {
  id: string;
  variantId: string;
  size: string;
  sizeCode: string;
  color: string;
  colorCode: string;
  sku: string;
  stockLevel: string;
  priceWithTax: number;
  currencyCode: string;
  inStock: boolean;
  options: Array<{
    id: string;
    code: string;
    name: string;
    group: { id: string; code: string; name: string };
  }>;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  currencyCode: string;
  hasAnyStock: boolean;
  inStockSizes: string[];
  inStockColors: string[];
  variants: VariantData[];
  featuredAsset?: any;
  assets?: any[];
}

interface CatalogData {
  shortSleeve: ProductData | null;
  longSleeve: ProductData | null;
  lastStockUpdate: number;
}

class ProductCatalog {
  private static instance: ProductCatalog;
  private catalog: CatalogData = {
    shortSleeve: null,
    longSleeve: null,
    lastStockUpdate: 0
  };
  private stockUpdatePromise: Promise<void> | null = null;

  private constructor() {
    // Initialize catalog with static product data
    this.initializeStaticData();
  }

  /**
   * Initialize catalog with static product data from JSON
   */
  private initializeStaticData(): void {
    // Short Sleeve Product
    this.catalog.shortSleeve = {
      id: staticProducts.shortSleeve.id,
      name: staticProducts.shortSleeve.name,
      slug: staticProducts.shortSleeve.slug,
      basePrice: staticProducts.shortSleeve.basePrice,
      currencyCode: staticProducts.shortSleeve.currencyCode,
      hasAnyStock: false,
      inStockSizes: [],
      inStockColors: [],
      variants: staticProducts.shortSleeve.variants.map(v => ({
        id: `variant-${v.variantId}`,
        variantId: v.variantId,
        size: v.size,
        sizeCode: v.sizeCode,
        color: v.color,
        colorCode: v.colorCode,
        sku: v.sku,
        stockLevel: '0',
        priceWithTax: staticProducts.shortSleeve.basePrice,
        currencyCode: staticProducts.shortSleeve.currencyCode,
        inStock: false,
        options: [
          {
            id: `size-${v.sizeCode}`,
            code: v.sizeCode,
            name: v.size,
            group: { id: 'size-group', code: 'size', name: 'Size' }
          },
          {
            id: `color-${v.colorCode}`,
            code: v.colorCode,
            name: v.color,
            group: { id: 'color-group', code: 'color', name: 'Color' }
          }
        ]
      }))
    };

    // Long Sleeve Product
    this.catalog.longSleeve = {
      id: staticProducts.longSleeve.id,
      name: staticProducts.longSleeve.name,
      slug: staticProducts.longSleeve.slug,
      basePrice: staticProducts.longSleeve.basePrice,
      currencyCode: staticProducts.longSleeve.currencyCode,
      hasAnyStock: false,
      inStockSizes: [],
      inStockColors: [],
      variants: staticProducts.longSleeve.variants.map(v => ({
        id: `variant-${v.variantId}`,
        variantId: v.variantId,
        size: v.size,
        sizeCode: v.sizeCode,
        color: v.color,
        colorCode: v.colorCode,
        sku: v.sku,
        stockLevel: '0',
        priceWithTax: staticProducts.longSleeve.basePrice,
        currencyCode: staticProducts.longSleeve.currencyCode,
        inStock: false,
        options: [
          {
            id: `size-${v.sizeCode}`,
            code: v.sizeCode,
            name: v.size,
            group: { id: 'size-group', code: 'size', name: 'Size' }
          },
          {
            id: `color-${v.colorCode}`,
            code: v.colorCode,
            name: v.color,
            group: { id: 'color-group', code: 'color', name: 'Color' }
          }
        ]
      }))
    };
  }

  static getInstance(): ProductCatalog {
    if (!ProductCatalog.instance) {
      ProductCatalog.instance = new ProductCatalog();
    }
    return ProductCatalog.instance;
  }

  /**
   * Initialize catalog by querying live stock levels
   */
  async initialize(): Promise<void> {
    console.log('🏗️ [CATALOG] Initializing catalog...');
    await this.updateStock();
    console.log('✅ [CATALOG] Catalog initialized');
  }

  /**
   * Initialize catalog with stock data from server (client-side only)
   * @param stockData - Stock data from server route loader
   */
  initializeFromServer(stockData: any): void {
    console.log('🏗️ [CATALOG] Initializing catalog with server stock data...');

    // Merge server stock data with static product data
    if (stockData?.shortSleeve?.variants && this.catalog.shortSleeve) {
      const stockMap = new Map<string, string>();
      stockData.shortSleeve.variants.forEach((v: any) => {
        stockMap.set(v.id, v.stockLevel);
      });

      this.catalog.shortSleeve.variants.forEach(variant => {
        const stockLevel = stockMap.get(variant.variantId);
        if (stockLevel !== undefined) {
          variant.stockLevel = stockLevel;
          variant.inStock = parseInt(stockLevel) > 0;
        }
      });

      this.recalculateAvailability('shortSleeve');
    }

    if (stockData?.longSleeve?.variants && this.catalog.longSleeve) {
      const stockMap = new Map<string, string>();
      stockData.longSleeve.variants.forEach((v: any) => {
        stockMap.set(v.id, v.stockLevel);
      });

      this.catalog.longSleeve.variants.forEach(variant => {
        const stockLevel = stockMap.get(variant.variantId);
        if (stockLevel !== undefined) {
          variant.stockLevel = stockLevel;
          variant.inStock = parseInt(stockLevel) > 0;
        }
      });

      this.recalculateAvailability('longSleeve');
    }

    console.log('✅ [CATALOG] Catalog initialized');
    console.log('📊 [CATALOG] Short sleeve in stock:', this.catalog.shortSleeve?.hasAnyStock);
    console.log('📊 [CATALOG] Long sleeve in stock:', this.catalog.longSleeve?.hasAnyStock);
  }

  /**
   * Recalculate availability flags for a product
   */
  private recalculateAvailability(productType: 'shortSleeve' | 'longSleeve'): void {
    const product = this.catalog[productType];
    if (!product) return;

    // Check if any variant is in stock
    product.hasAnyStock = product.variants.some(v => v.inStock);

    // Get unique in-stock sizes
    product.inStockSizes = [...new Set(
      product.variants.filter(v => v.inStock).map(v => v.size)
    )];

    // Get unique in-stock colors
    product.inStockColors = [...new Set(
      product.variants.filter(v => v.inStock).map(v => v.color)
    )];
  }

  /**
   * Update stock levels from GraphQL
   */
  async updateStock(): Promise<void> {
    // Prevent multiple simultaneous stock updates
    if (this.stockUpdatePromise) {
      return this.stockUpdatePromise;
    }

    this.stockUpdatePromise = this._performStockUpdate();
    await this.stockUpdatePromise;
    this.stockUpdatePromise = null;
  }

  private async _performStockUpdate(): Promise<void> {
    const startTime = Date.now();
    console.log('🔄 [CATALOG] Updating stock levels...');

    try {
      const stockQuery = gql`
        query GetCatalogStockLevels {
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
      
      // Merge static data with stock levels
      this.catalog.shortSleeve = this.mergeProductData(staticProducts.shortSleeve, result.shortsleeve);
      this.catalog.longSleeve = this.mergeProductData(staticProducts.longSleeve, result.longsleeve);
      this.catalog.lastStockUpdate = Date.now();

      const updateTime = Date.now() - startTime;
      console.log(`✅ [CATALOG] Stock updated in ${updateTime}ms`);
      console.log(`📊 [CATALOG] Short sleeve in stock: ${this.catalog.shortSleeve?.hasAnyStock}`);
      console.log(`📊 [CATALOG] Long sleeve in stock: ${this.catalog.longSleeve?.hasAnyStock}`);
    } catch (error) {
      console.error('❌ [CATALOG] Stock update failed:', error);
      throw error;
    }
  }

  private mergeProductData(staticData: any, stockData: any): ProductData {
    // Create stock map for O(1) lookup
    const stockMap = new Map<string, string>();
    stockData?.variants?.forEach((v: any) => {
      stockMap.set(v.id, v.stockLevel);
    });

    // Merge variants with stock
    const variants: VariantData[] = staticData.variants.map((staticVariant: any) => {
      const stockLevel = stockMap.get(staticVariant.variantId) || '0';
      const stockNum = parseInt(String(stockLevel));
      const inStock = stockNum > 0;

      return {
        id: staticVariant.variantId,
        variantId: staticVariant.variantId,
        size: staticVariant.size,
        sizeCode: staticVariant.sizeCode,
        color: staticVariant.color,
        colorCode: staticVariant.colorCode,
        sku: staticVariant.sku,
        stockLevel,
        priceWithTax: staticData.basePrice,
        currencyCode: staticData.currencyCode,
        inStock,
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
    });

    // Pre-calculate availability
    const hasAnyStock = variants.some(v => v.inStock);
    const inStockSizes = [...new Set(variants.filter(v => v.inStock).map(v => v.sizeCode))];
    const inStockColors = [...new Set(variants.filter(v => v.inStock).map(v => v.colorCode))];

    return {
      id: staticData.id,
      name: staticData.name,
      slug: staticData.slug,
      basePrice: staticData.basePrice,
      currencyCode: staticData.currencyCode,
      hasAnyStock,
      inStockSizes,
      inStockColors,
      variants
    };
  }

  /**
   * Get product data (with stock-aware filtering)
   */
  getProduct(type: 'shortSleeve' | 'longSleeve'): ProductData | null {
    return this.catalog[type];
  }

  /**
   * Get only in-stock products
   */
  getInStockProducts(): { shortSleeve: ProductData | null; longSleeve: ProductData | null } {
    return {
      shortSleeve: this.catalog.shortSleeve?.hasAnyStock ? this.catalog.shortSleeve : null,
      longSleeve: this.catalog.longSleeve?.hasAnyStock ? this.catalog.longSleeve : null
    };
  }

  /**
   * Get in-stock sizes for a product
   */
  getInStockSizes(type: 'shortSleeve' | 'longSleeve'): string[] {
    return this.catalog[type]?.inStockSizes || [];
  }

  /**
   * Get in-stock colors for a product and size
   */
  getInStockColors(type: 'shortSleeve' | 'longSleeve', sizeCode?: string): string[] {
    const product = this.catalog[type];
    if (!product) return [];

    if (!sizeCode) {
      return product.inStockColors;
    }

    // Filter colors available for specific size
    return [...new Set(
      product.variants
        .filter(v => v.inStock && v.sizeCode === sizeCode)
        .map(v => v.colorCode)
    )];
  }

  /**
   * Get specific variant
   */
  getVariant(type: 'shortSleeve' | 'longSleeve', variantId: string): VariantData | null {
    const product = this.catalog[type];
    return product?.variants.find(v => v.id === variantId) || null;
  }

  /**
   * Check if catalog needs stock refresh (older than 30 seconds)
   */
  needsStockRefresh(): boolean {
    return Date.now() - this.catalog.lastStockUpdate > 30000;
  }

  /**
   * Load featured images for in-stock products only
   */
  async loadFeaturedImages(): Promise<void> {
    const inStockProducts = this.getInStockProducts();

    // Skip if no products are in stock
    if (!inStockProducts.shortSleeve && !inStockProducts.longSleeve) {
      console.log('⏭️ [CATALOG] No products in stock, skipping image loading');
      return;
    }

    console.log('🖼️ [CATALOG] Loading featured images for in-stock products...');

    // Build dynamic query based on stock status
    let queryFields = '';
    if (inStockProducts.shortSleeve) {
      queryFields += `
        shortsleeve: product(slug: "shortsleeveshirt") {
          id
          featuredAsset {
            id
            preview
            source
          }
        }
      `;
    }
    if (inStockProducts.longSleeve) {
      queryFields += `
        longsleeve: product(slug: "longsleeveshirt") {
          id
          featuredAsset {
            id
            preview
            source
          }
        }
      `;
    }

    const imageQuery = gql`
      query GetFeaturedImagesForInStock {
        ${queryFields}
      }
    `;

    try {
      const startTime = Date.now();
      const result: any = await requester(imageQuery);
      const loadTime = Date.now() - startTime;

      // Update catalog with images
      if (this.catalog.shortSleeve && result.shortsleeve?.featuredAsset) {
        this.catalog.shortSleeve.featuredAsset = result.shortsleeve.featuredAsset;
      }
      if (this.catalog.longSleeve && result.longsleeve?.featuredAsset) {
        this.catalog.longSleeve.featuredAsset = result.longsleeve.featuredAsset;
      }

      console.log(`✅ [CATALOG] Featured images loaded in ${loadTime}ms`);
    } catch (error) {
      console.error('❌ [CATALOG] Featured image loading failed:', error);
    }
  }

  /**
   * Load product gallery assets for a specific product
   */
  async loadProductAssets(type: 'shortSleeve' | 'longSleeve'): Promise<void> {
    const product = this.catalog[type];
    if (!product || !product.hasAnyStock) {
      console.log(`⏭️ [CATALOG] Product ${type} not in stock, skipping asset loading`);
      return;
    }

    console.log(`🖼️ [CATALOG] Loading assets for ${type}...`);

    const assetQuery = gql`
      query GetProductAssets($productId: ID!) {
        product(id: $productId) {
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

    try {
      const startTime = Date.now();
      const result: any = await requester(assetQuery, { productId: product.id });
      const loadTime = Date.now() - startTime;

      if (result?.product) {
        this.catalog[type]!.assets = result.product.assets || [];
        console.log(`✅ [CATALOG] Assets loaded for ${type} in ${loadTime}ms`);
      }
    } catch (error) {
      console.error(`❌ [CATALOG] Asset loading failed for ${type}:`, error);
    }
  }

  /**
   * Get catalog stats for debugging
   */
  getStats() {
    return {
      lastStockUpdate: this.catalog.lastStockUpdate,
      shortSleeveInStock: this.catalog.shortSleeve?.hasAnyStock || false,
      longSleeveInStock: this.catalog.longSleeve?.hasAnyStock || false,
      shortSleeveVariants: this.catalog.shortSleeve?.variants.length || 0,
      longSleeveVariants: this.catalog.longSleeve?.variants.length || 0
    };
  }
}

// Export singleton instance
export const productCatalog = ProductCatalog.getInstance();
