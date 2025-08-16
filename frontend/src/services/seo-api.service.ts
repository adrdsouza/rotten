import { server$ } from '@qwik.dev/router';
import { isBrowser } from '@qwik.dev/core/build';
import { DEV_API, PROD_API } from '~/constants';
import type {
  SeoApiResponse,
  BreadcrumbItem,
  SeoApiCacheConfig,
  ProductSchema,
  OrganizationSchema,
  WebsiteSchema,
  BreadcrumbSchema,
  JsonLdSchema
} from '~/types/seo.types';

// Cache configuration
const CACHE_CONFIG: SeoApiCacheConfig = {
  ttl: 300, // 5 minutes
  maxSize: 100,
  enabled: true
};

// Simple in-memory cache for SEO data
class SeoCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private config: SeoApiCacheConfig;

  constructor(config: SeoApiCacheConfig) {
    this.config = config;
  }

  get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = (now - entry.timestamp) > (this.config.ttl * 1000);

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    if (!this.config.enabled) return;

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const seoCache = new SeoCache(CACHE_CONFIG);

// Base API URL
const baseUrl = import.meta.env.DEV ? DEV_API : PROD_API;

/**
 * Generic API request function with caching and error handling
 */
const makeApiRequest = async <T>(
  endpoint: string,
  cacheKey?: string
): Promise<SeoApiResponse<T>> => {
  try {
    // Check cache first
    if (cacheKey) {
      const cached = seoCache.get<T>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          timestamp: Date.now()
        };
      }
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful responses
    if (cacheKey && data) {
      seoCache.set(cacheKey, data);
    }

    return {
      success: true,
      data,
      cached: false,
      timestamp: Date.now()
    };

  } catch (error) {
    console.warn(`SEO API request failed for ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    };
  }
};

/**
 * Fetch product schema from backend
 */
export const fetchProductSchema = server$(async (productId: string): Promise<ProductSchema | null> => {
  const response = await makeApiRequest<ProductSchema>(
    `/seo/schema/product/${productId}`,
    `product-schema-${productId}`
  );

  return response.success ? response.data || null : null;
});

/**
 * Fetch organization schema from backend
 */
export const fetchOrganizationSchema = server$(async (): Promise<OrganizationSchema | null> => {
  const response = await makeApiRequest<OrganizationSchema>(
    '/seo/schema/organization',
    'organization-schema'
  );

  return response.success ? response.data || null : null;
});

/**
 * Fetch website schema from backend
 */
export const fetchWebsiteSchema = server$(async (): Promise<WebsiteSchema | null> => {
  const response = await makeApiRequest<WebsiteSchema>(
    '/seo/schema/website',
    'website-schema'
  );

  return response.success ? response.data || null : null;
});

/**
 * Generate breadcrumb schema from breadcrumb items
 */
export const generateBreadcrumbSchema = (breadcrumbs: BreadcrumbItem[]): BreadcrumbSchema => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url
    }))
  };
};

/**
 * Generate product schema from product data (client-side)
 * This is used in head functions which must be synchronous
 */
export const generateProductSchema = (product: any): ProductSchema => {
  if (!product) {
    throw new Error('Product data is required for schema generation');
  }

  // Get the first variant for pricing (most products have single variants)
  const primaryVariant = product.variants?.[0];
  if (!primaryVariant) {
    throw new Error('Product must have at least one variant');
  }

  // Clean description by removing HTML tags
  const cleanDescription = product.description
    ? product.description.replace(/<[^>]*>/g, '').trim()
    : `${product.name} - Premium quality product from Rotten Hand`;

  // Determine availability based on stock levels
  const hasStock = product.variants.some((variant: any) => {
    const stockLevel = parseInt(variant.stockLevel || '0');
    return stockLevel > 0;
  });

  // Get all product images
  const productImages: string[] = [];
  if (product.featuredAsset?.preview) {
    productImages.push(product.featuredAsset.preview + '?preset=xl');
  }
  if (product.assets?.length > 0) {
    product.assets.forEach((asset: any) => {
      if (asset.preview && asset.preview !== product.featuredAsset?.preview) {
        productImages.push(asset.preview + '?preset=xl');
      }
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: cleanDescription,
    sku: primaryVariant.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: 'Rotten Hand'
    },
    offers: {
      '@type': 'Offer',
      price: (primaryVariant.priceWithTax / 100).toFixed(2), // Convert from cents to dollars
      priceCurrency: primaryVariant.currencyCode || 'USD',
      availability: hasStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Rotten Hand'
      }
    },
    ...(productImages.length > 0 && {
      image: productImages
    })
  };
};

/**
 * Generate organization schema for homepage (client-side)
 */
export const generateOrganizationSchema = (): JsonLdSchema => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Rotten Hand',
    url: 'https://rottenhand.com',
    logo: 'https://rottenhand.com/logo.svg',
    description: 'Premium quality products and exceptional service at Rotten Hand',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@rottenhand.com',
      contactType: 'customer service'
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Commerce Street',
      addressLocality: 'Business City',
      addressRegion: 'State',
      postalCode: '12345',
      addressCountry: 'US'
    },
    sameAs: [
      // Add social media URLs when available
    ]
  };
};

/**
 * Generate LocalBusiness schema for homepage (client-side)
 */
export const generateLocalBusinessSchema = (): JsonLdSchema => {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Rotten Hand',
    url: 'https://rottenhand.com',
    description: 'Premium quality products and exceptional service.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Commerce Street',
      addressLocality: 'Business City',
      addressRegion: 'State',
      postalCode: '12345',
      addressCountry: 'US'
    },
    telephone: '+1-XXX-XXX-XXXX', // Update with actual phone number if available
    email: 'info@rottenhand.com',
    priceRange: '$$',
    paymentAccepted: 'Credit Card, PayPal',
    currenciesAccepted: 'USD'
  };
};

/**
 * Generate website schema for homepage (client-side)
 */
export const generateWebsiteSchema = (): JsonLdSchema => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Rotten Hand',
    url: 'https://rottenhand.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://rottenhand.com/shop?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };
};

/**
 * Fetch sitemap XML from backend
 */
export const fetchSitemap = server$(async (type: 'main' | 'products' | 'collections' | 'index' = 'main'): Promise<string | null> => {
  const endpoint = type === 'index' ? '/seo/sitemap.xml' : type === 'main' ? '/seo/sitemap-main.xml' : `/seo/sitemap-${type}.xml`;

  try {
    // Check cache first
    const cacheKey = `sitemap-${type}`;
    const cached = seoCache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlData = await response.text();

    // Cache successful responses
    if (xmlData) {
      seoCache.set(cacheKey, xmlData);
    }

    return xmlData;
  } catch (error) {
    console.warn(`Failed to fetch sitemap ${type}:`, error);
    return null;
  }
});

/**
 * Fetch robots.txt from backend
 */
export const fetchRobotsTxt = server$(async (): Promise<string | null> => {
  try {
    // Check cache first
    const cacheKey = 'robots-txt';
    const cached = seoCache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${baseUrl}/seo/robots.txt`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const textData = await response.text();

    // Cache successful responses
    if (textData) {
      seoCache.set(cacheKey, textData);
    }

    return textData;
  } catch (error) {
    console.warn('Failed to fetch robots.txt:', error);
    return null;
  }
});

/**
 * Clear SEO cache (useful for development/testing)
 */
export const clearSeoCache = (): void => {
  if (isBrowser) {
    seoCache.clear();
    console.log('SEO cache cleared');
  }
};

/**
 * Get cache statistics (useful for debugging)
 */
export const getSeoCache = (): { size: number; config: SeoApiCacheConfig } => {
  return {
    size: seoCache['cache'].size,
    config: CACHE_CONFIG
  };
};