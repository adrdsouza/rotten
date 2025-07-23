import type { DocumentHead } from '@qwik.dev/router';

interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  canonical?: string;
  links?: Array<{ rel: string; href: string; as?: string; type?: string; crossorigin?: string; media?: string; }>;
}

export const createSEOHead = ({
  title,
  description,
  image,
  noindex = false,
  canonical,
  links = [],
}: SEOConfig): DocumentHead => {
  const optimizedImage = image ? image + '?preset=xl' : undefined;
  
  const allLinks = [
    ...(canonical ? [{ rel: 'canonical', href: canonical }] : []),
    ...links,
  ];
  
  return {
    title: `${title} | Rotten Hand`,
    meta: [
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:site_name', content: 'Rotten Hand' },
      ...(optimizedImage ? [{ property: 'og:image', content: optimizedImage }] : []),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(optimizedImage ? [{ name: 'twitter:image', content: optimizedImage }] : []),
      ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    ],
    ...(allLinks.length > 0 ? { link: allLinks } : {}),
  };
};
