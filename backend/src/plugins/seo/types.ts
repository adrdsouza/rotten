export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapIndex {
  sitemap: string;
  lastmod?: string;
}

export interface JsonLdSchema {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface ProductSeoData {
  id: string;
  name: string;
  description: string;
  slug: string;
  price: number;
  currencyCode: string;
  image?: string;
  brand?: string;
  sku: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  category?: string;
  updatedAt: Date;
}

export interface CollectionSeoData {
  id: string;
  name: string;
  description: string;
  slug: string;
  updatedAt: Date;
}

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: JsonLdSchema[];
}