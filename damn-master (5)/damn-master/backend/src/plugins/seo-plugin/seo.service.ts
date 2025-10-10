import { Injectable, Inject } from '@nestjs/common';
import { RequestContext, ProductService, CollectionService, Logger, ListQueryOptions } from '@vendure/core';
import { SeoPluginOptions } from './index.js';
import { SitemapEntry, SitemapIndex, JsonLdSchema, ProductSeoData, CollectionSeoData } from './types.js';

const loggerCtx = 'SeoService';

@Injectable()
export class SeoService {
  constructor(
    private productService: ProductService,
    private collectionService: CollectionService,
    @Inject('SEO_PLUGIN_OPTIONS') private options: SeoPluginOptions
  ) {}

  /**
   * Generate XML sitemap for products
   */
  async generateProductSitemap(ctx: RequestContext): Promise<string> {
    const products = await this.getProductSeoData(ctx);
    const entries: SitemapEntry[] = products.map(product => ({
      url: `${this.options.siteDomain}/products/${product.slug}`,
      lastmod: product.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: 0.8
    }));

    return this.generateSitemapXml(entries);
  }

  /**
   * Generate XML sitemap for collections
   */
  async generateCollectionSitemap(ctx: RequestContext): Promise<string> {
    const collections = await this.getCollectionSeoData(ctx);
    const entries: SitemapEntry[] = collections.map(collection => ({
      url: `${this.options.siteDomain}/collections/${collection.slug}`,
      lastmod: collection.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: 0.7
    }));

    return this.generateSitemapXml(entries);
  }

  /**
   * Generate main sitemap with static pages
   */
  async generateMainSitemap(): Promise<string> {
    const staticPages: SitemapEntry[] = [
      {
        url: `${this.options.siteDomain}/`,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        url: `${this.options.siteDomain}/about`,
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        url: `${this.options.siteDomain}/contact`,
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        url: `${this.options.siteDomain}/privacy`,
        changefreq: 'yearly',
        priority: 0.3
      },
      {
        url: `${this.options.siteDomain}/terms`,
        changefreq: 'yearly',
        priority: 0.3
      }
    ];

    return this.generateSitemapXml(staticPages);
  }

  /**
   * Generate sitemap index
   */
  async generateSitemapIndex(): Promise<string> {
    const sitemaps: SitemapIndex[] = [
      {
        sitemap: `${this.options.siteDomain}/sitemap-main.xml`,
        lastmod: new Date().toISOString()
      },
      {
        sitemap: `${this.options.siteDomain}/sitemap-products.xml`,
        lastmod: new Date().toISOString()
      },
      {
        sitemap: `${this.options.siteDomain}/sitemap-collections.xml`,
        lastmod: new Date().toISOString()
      }
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const sitemap of sitemaps) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${sitemap.sitemap}</loc>\n`;
      if (sitemap.lastmod) {
        xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
      }
      xml += '  </sitemap>\n';
    }
    
    xml += '</sitemapindex>';
    return xml;
  }

  /**
   * Generate JSON-LD schema for product
   */
  generateProductJsonLd(product: ProductSeoData): JsonLdSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: product.brand || this.options.companyName
      },
      offers: {
        '@type': 'Offer',
        price: product.price.toString(),
        priceCurrency: product.currencyCode,
        availability: `https://schema.org/${product.availability}`,
        seller: {
          '@type': 'Organization',
          name: this.options.companyName
        }
      },
      ...(product.image && {
        image: product.image
      })
    };
  }

  /**
   * Generate JSON-LD schema for organization
   */
  generateOrganizationJsonLd(): JsonLdSchema {
    const schema: JsonLdSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.options.companyName,
      description: this.options.companyDescription,
      url: this.options.siteDomain,
      contactPoint: {
        '@type': 'ContactPoint',
        email: this.options.contactEmail,
        contactType: 'Customer Service'
      }
    };

    if (this.options.socialMediaUrls) {
      schema.sameAs = Object.values(this.options.socialMediaUrls).filter(Boolean);
    }

    if (this.options.localBusiness) {
      schema['@type'] = 'LocalBusiness';
      schema.address = {
        '@type': 'PostalAddress',
        streetAddress: this.options.localBusiness.address,
        addressLocality: this.options.localBusiness.city,
        addressRegion: this.options.localBusiness.state,
        postalCode: this.options.localBusiness.zipCode,
        addressCountry: this.options.localBusiness.country
      };
      schema.telephone = this.options.localBusiness.phone;
      schema.openingHours = this.options.localBusiness.hours;
    }

    return schema;
  }

  /**
   * Generate JSON-LD schema for website
   */
  generateWebsiteJsonLd(): JsonLdSchema {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.options.companyName,
      url: this.options.siteDomain,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${this.options.siteDomain}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };
  }

  /**
   * Generate breadcrumb JSON-LD schema
   */
  generateBreadcrumbJsonLd(breadcrumbs: Array<{ name: string; url: string }>): JsonLdSchema {
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
  }

  /**
   * Get product SEO data
   */
  async getProductSeoData(ctx: RequestContext): Promise<ProductSeoData[]> {
    try {
      // Use ProductService to get products with proper filtering
      const options: ListQueryOptions<any> = {
        filter: {
          enabled: { eq: true }
        },
        take: 100, // Start with smaller limit to avoid query limits
        sort: {
          updatedAt: 'DESC'
        }
      };

      const { items: products } = await this.productService.findAll(ctx, options, ['variants', 'featuredAsset']);
      const productSeoData: ProductSeoData[] = [];

      for (const product of products) {
        // Filter out test/history products
        if (this.shouldExcludeProduct(product)) {
          continue;
        }

        const variant = product.variants?.[0];
        if (!variant) {
          Logger.warn(`Product ${product.id} has no variants, skipping`, loggerCtx);
          continue;
        }

        // Determine availability - for now, assume InStock for enabled products
        // In a real implementation, you'd check stock levels via StockLevelService
        let availability: 'InStock' | 'OutOfStock' | 'PreOrder' = 'InStock';

        productSeoData.push({
          id: product.id.toString(),
          name: product.name,
          description: product.description,
          slug: product.slug,
          price: variant.priceWithTax || variant.price || 0,
          currencyCode: variant.currencyCode || 'USD',
          image: product.featuredAsset?.preview,
          sku: variant.sku || '',
          availability,
          updatedAt: product.updatedAt
        });
      }

      Logger.verbose(`Generated SEO data for ${productSeoData.length} products`, loggerCtx);
      return productSeoData;

    } catch (error) {
      Logger.error(`Failed to get product SEO data: ${error instanceof Error ? error.message : 'Unknown error'}`, loggerCtx);
      return [];
    }
  }

  /**
   * Check if a product should be excluded from SEO sitemaps
   */
  private shouldExcludeProduct(product: any): boolean {
    const name = product.name?.toLowerCase() || '';
    const slug = product.slug?.toLowerCase() || '';

    // Exclude test products, history products, and other unwanted items
    const excludePatterns = [
      'history',
      'test',
      'sample',
      'demo',
      'sdfsdf', // Specific test product you have
    ];

    return excludePatterns.some(pattern =>
      name.includes(pattern) || slug.includes(pattern)
    );
  }

  /**
   * Get collection SEO data
   */
  async getCollectionSeoData(ctx: RequestContext): Promise<CollectionSeoData[]> {
    try {
      // Use CollectionService to get public collections
      const options: ListQueryOptions<any> = {
        filter: {
          isPrivate: { eq: false }
        },
        take: 100, // Reasonable limit for collections
        sort: {
          updatedAt: 'DESC'
        }
      };

      const { items: collections } = await this.collectionService.findAll(ctx, options);

      const collectionSeoData = collections.map(collection => ({
        id: collection.id.toString(),
        name: collection.name,
        description: collection.description,
        slug: collection.slug,
        updatedAt: collection.updatedAt
      }));

      Logger.verbose(`Generated SEO data for ${collectionSeoData.length} collections`, loggerCtx);
      return collectionSeoData;

    } catch (error) {
      Logger.error(`Failed to get collection SEO data: ${error instanceof Error ? error.message : 'Unknown error'}`, loggerCtx);
      return [];
    }
  }

  /**
   * Generate XML sitemap from entries
   */
  private generateSitemapXml(entries: SitemapEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const entry of entries) {
      xml += '  <url>\n';
      xml += `    <loc>${entry.url}</loc>\n`;
      if (entry.lastmod) {
        xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
      }
      if (entry.changefreq) {
        xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
      }
      if (entry.priority !== undefined) {
        xml += `    <priority>${entry.priority}</priority>\n`;
      }
      xml += '  </url>\n';
    }
    
    xml += '</urlset>';
    return xml;
  }
}