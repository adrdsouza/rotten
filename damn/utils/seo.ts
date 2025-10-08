import type { DocumentHead } from '@qwik.dev/router';
import type { JsonLdSchema } from '~/types/seo.types';
import { injectJsonLdSchemas, debugJsonLdSchemas } from './schema-injection';

interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  canonical?: string;
  links?: Array<{ rel: string; href: string; as?: string; type?: string; crossorigin?: string; media?: string; }>;
  schemas?: JsonLdSchema[]; // New: JSON-LD schemas for structured data
}

export const createSEOHead = ({
  title,
  description,
  image,
  noindex = false,
  canonical,
  links = [],
  schemas = [], // New: JSON-LD schemas (optional, backward compatible)
}: SEOConfig): DocumentHead => {
  const optimizedImage = image ? image + '?preset=xl' : undefined;
  
  const allLinks = [
    ...(canonical ? [{ rel: 'canonical', href: canonical }] : []),
    ...links,
  ];

  // Generate JSON-LD meta tags from schemas
  const jsonLdMetas = injectJsonLdSchemas(schemas);

  // Debug schemas in development
  if (schemas.length > 0) {
    debugJsonLdSchemas(schemas, `SEO Head: ${title}`);
  }

  const head: DocumentHead = {
    title: `${title} | Damned Designs`,
    meta: [
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:site_name', content: 'Damned Designs' },
      ...(optimizedImage ? [{ property: 'og:image', content: optimizedImage }] : []),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(optimizedImage ? [{ name: 'twitter:image', content: optimizedImage }] : []),
      ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
      ...jsonLdMetas, // Add JSON-LD schemas as meta tags
    ],
    ...(allLinks.length > 0 ? { links: allLinks } : {}),
  };

  return head;
};

/**
 * Create SEO head with product schema
 * Convenience function for product pages
 */
export const createProductSEOHead = ({
  title,
  description,
  image,
  canonical,
  links = [],
  productSchema,
  breadcrumbSchema,
}: SEOConfig & {
  productSchema?: JsonLdSchema;
  breadcrumbSchema?: JsonLdSchema;
}): DocumentHead => {
  const schemas: JsonLdSchema[] = [];

  if (productSchema) schemas.push(productSchema);
  if (breadcrumbSchema) schemas.push(breadcrumbSchema);

  return createSEOHead({
    title,
    description,
    image,
    canonical,
    links,
    schemas,
  });
};

/**
 * Create SEO head with organization and website schemas
 * Convenience function for homepage and static pages
 */
export const createOrganizationSEOHead = ({
  title,
  description,
  image,
  canonical,
  links = [],
  organizationSchema,
  websiteSchema,
}: SEOConfig & {
  organizationSchema?: JsonLdSchema;
  websiteSchema?: JsonLdSchema;
}): DocumentHead => {
  const schemas: JsonLdSchema[] = [];

  if (organizationSchema) schemas.push(organizationSchema);
  if (websiteSchema) schemas.push(websiteSchema);

  return createSEOHead({
    title,
    description,
    image,
    canonical,
    links,
    schemas,
  });
};
