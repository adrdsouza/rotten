import type { RequestHandler } from '@qwik.dev/router';

/**
 * Product sitemap proxy route
 * Proxies the product sitemap from the backend SEO service
 */
export const onGet: RequestHandler = async ({ send, headers }) => {
  try {
    // Direct fetch to backend (server$ functions had issues in production)
    const backendUrl = 'http://localhost:3000/seo/sitemap-products.xml';

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const xmlData = await response.text();

    headers.set('Content-Type', 'application/xml');
    headers.set('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
    send(200, xmlData);

  } catch (error) {
    console.error('[sitemap-products] Error:', error);

    // Return error sitemap
    const errorSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error loading products: ${error instanceof Error ? error.message : 'Unknown error'} -->
</urlset>`;

    headers.set('Content-Type', 'application/xml');
    headers.set('Cache-Control', 'public, max-age=300');
    send(500, errorSitemap);
  }
};
