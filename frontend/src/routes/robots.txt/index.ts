import type { RequestHandler } from '@qwik.dev/router';
import { fetchRobotsTxt } from '~/services/seo-api.service';

/**
 * Robots.txt proxy route
 * Proxies the robots.txt from the backend SEO service
 */
export const onGet: RequestHandler = async ({ send, headers }) => {
  try {
    // Fetch robots.txt from backend
    const robotsTxt = await fetchRobotsTxt();
    
    if (!robotsTxt) {
      // Fallback robots.txt if backend is unavailable
      const fallbackRobots = `# Robots.txt for Rotten Hand
# Fallback version

User-agent: *
Allow: /

# Disallow sensitive areas
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/

# Sitemap location
Sitemap: https://rottenhand.com/sitemap.xml`;
      
      headers.set('Content-Type', 'text/plain');
      headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      send(200, fallbackRobots);
      return;
    }
    
    // Set appropriate headers
    headers.set('Content-Type', 'text/plain');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Send the robots.txt
    send(200, robotsTxt);
    
  } catch (error) {
    console.error('Error serving robots.txt:', error);
    
    // Return minimal robots.txt on error
    const errorRobots = `# Robots.txt - Error fallback
User-agent: *
Allow: /
Sitemap: https://rottenhand.com/sitemap.xml`;
    
    headers.set('Content-Type', 'text/plain');
    headers.set('Cache-Control', 'public, max-age=3600'); // Shorter cache on error
    send(500, errorRobots);
  }
};