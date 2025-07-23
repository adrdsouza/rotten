import { component$, type QRL } from '@qwik.dev/core';

// Helper function to generate responsive srcset for Vendure assets
const generateResponsiveSources = (src: string, widths: number[] = [320, 640, 1024, 1280]) => {
  // Check if this is a Vendure asset URL
  const isVendureAsset = src.includes('/assets/') || src.includes('/assetspreview/') || src.includes('damneddesigns.com');
  
  if (!isVendureAsset) {
    // For non-Vendure images, return as-is
    return { 
      avif: null, 
      webp: null, 
      original: src,
      avifSrcset: null,
      webpSrcset: null,
      originalSrcset: null
    };
  }
  
  const baseUrl = src.split('?')[0]; // Remove existing query params
  
  // Map widths to appropriate Vendure presets for better quality
  const getPresetForWidth = (width: number) => {
    if (width <= 160) return 'thumb';
    if (width <= 320) return 'small';
    if (width <= 640) return 'medium';
    if (width <= 1280) return 'large';
    if (width <= 1600) return 'xl';
    if (width <= 2048) return 'xxl';
    if (width <= 2560) return 'ultra';
    return '4k'; // For monitors larger than 2560px
  };
  
  // Generate srcset using presets for optimal quality, with custom width override for fine control
  const avifSrcset = widths.map(w => {
    const preset = getPresetForWidth(w);
    return `${baseUrl}?preset=${preset}&w=${w}&format=avif ${w}w`;
  }).join(', ');
  
  const webpSrcset = widths.map(w => {
    const preset = getPresetForWidth(w);
    return `${baseUrl}?preset=${preset}&w=${w}&format=webp ${w}w`;
  }).join(', ');
  
  const originalSrcset = widths.map(w => {
    const preset = getPresetForWidth(w);
    return `${baseUrl}?preset=${preset}&w=${w} ${w}w`;
  }).join(', ');
  
  // Single format URLs for fallback
  const separator = '?';
  const avifUrl = `${baseUrl}${separator}format=avif`;
  const webpUrl = `${baseUrl}${separator}format=webp`;
  
  return { 
    avif: avifUrl, 
    webp: webpUrl, 
    original: baseUrl,
    avifSrcset,
    webpSrcset,
    originalSrcset
  };
};

// Predefined responsive configurations for common use cases
export const RESPONSIVE_CONFIGS = {
  // Product detail main image - Enhanced for high-resolution displays
  productMain: {
    widths: [640, 1280, 1600, 2048, 2560], // Added ultra-high-res variants for large monitors
    sizes: '(max-width: 768px) 100vw, (max-width: 1440px) 1280px, (max-width: 2560px) 1600px, (max-width: 3440px) 2048px, 2560px'
  },
  // Product card images - Added retina support
  productCard: {
    widths: [400, 800], // Added 2x density for retina displays
    sizes: '(max-width: 768px) 400px, 400px'
  },
  // Thumbnail images - Added retina support
  thumbnail: {
    widths: [160, 320], // Added 2x density for crisp thumbnails
    sizes: '160px'
  },
  // Hero/banner images - Enhanced for very large displays
  hero: {
    widths: [640, 768, 1024, 1280, 1536, 1920, 2560, 3440],
    sizes: '100vw'
  }
};

/**
 * Generates preload link objects for critical images to be used in DocumentHead.
 * This enables SSR preloading of above-the-fold images for better LCP performance.
 * 
 * @param src - The image source URL
 * @param responsive - Responsive configuration key or 'none'
 * @param formats - Array of formats to preload (defaults to ['avif', 'webp', 'original'])
 * @returns Array of link objects for DocumentHead
 * 
 * @example
 * // In a route file:
 * export const head: DocumentHead = () => ({
 *   links: [
 *     ...generateImagePreloadLinks(productImage, 'productMain'),
 *     // other links...
 *   ]
 * });
 */
export const generateImagePreloadLinks = (
  src: string,
  responsive: keyof typeof RESPONSIVE_CONFIGS | 'none' = 'none',
  formats: ('avif' | 'webp' | 'original')[] = ['avif', 'webp', 'original']
) => {
  if (!src) return [];

  const config = responsive !== 'none' ? RESPONSIVE_CONFIGS[responsive] : null;
  const imageSources = generateResponsiveSources(
    src, 
    config?.widths || [320, 640, 1024, 1280]
  );

  const links: Array<{ 
    rel: string; 
    as: string; 
    href: string; 
    type?: string; 
    imagesrcset?: string; 
    imagesizes?: string;
    crossorigin?: string;
  }> = [];

  // Add preload links for each requested format
  if (formats.includes('avif') && imageSources.avif) {
    links.push({
      rel: 'preload',
      as: 'image',
      href: imageSources.avif,
      type: 'image/avif',
      imagesrcset: imageSources.avifSrcset || undefined,
      imagesizes: config?.sizes,
      crossorigin: (src.includes('damneddesigns.com/assetspreview') || !src.startsWith('/')) ? 'anonymous' : undefined,
    });
  }

  if (formats.includes('webp') && imageSources.webp) {
    links.push({
      rel: 'preload',
      as: 'image',
      href: imageSources.webp,
      type: 'image/webp',
      imagesrcset: imageSources.webpSrcset || undefined,
      imagesizes: config?.sizes,
      crossorigin: (src.includes('damneddesigns.com/assetspreview') || !src.startsWith('/')) ? 'anonymous' : undefined,
    });
  }

  if (formats.includes('original')) {
    links.push({
      rel: 'preload',
      as: 'image',
      href: imageSources.original,
      imagesrcset: imageSources.originalSrcset || undefined,
      imagesizes: config?.sizes,
      crossorigin: (src.includes('damneddesigns.com/assetspreview') || !src.startsWith('/')) ? 'anonymous' : undefined,
    });
  }

  return links;
};

interface OptimizedImageProps { 
 src: string;
 alt: string;
 class?: string;
 loading?: 'lazy' | 'eager';
 priority?: boolean;
 width?: number;
 height?: number;
 onLoad?: QRL<() => void>;
 onClick$?: QRL<(event: Event) => void>;
 // Responsive image props
 srcset?: string; // Custom srcset override
 sizes?: string;  // Custom sizes override
 responsive?: keyof typeof RESPONSIVE_CONFIGS | 'none'; // Predefined responsive config
}


/**
 * New OptimizedImage - Simple, fast implementation with all the smart responsive logic
 *
 * Preserves all the intelligent image selection and responsive behavior while using
 * simple native img rendering for better performance.
 *
 * Features preserved:
 * - Smart responsive srcset generation
 * - Format optimization (AVIF, WebP, fallback)
 * - Preset mapping based on screen size
 * - Predefined responsive configurations
 * - Proper sizes attribute for responsive behavior
 * - All visual styling and aspect ratios
 *
 * Performance improvements:
 * - No complex state management
 * - No manual cache checking
 * - Simple native img rendering
 * - Browser-native lazy loading and caching
 */
export const OptimizedImage = component$<OptimizedImageProps>(({
 src,
 alt,
 class: className = '',
 loading = 'lazy',
 priority: _priority = false,
 width,
 height,
 onLoad,
 onClick$,
 srcset: customSrcset,
 sizes: customSizes,
 responsive = 'none',
 ...rest
}) => {
 // Safari CORS fix: Add crossorigin attribute for external domain images
 const isCrossOrigin = src && (src.includes('damneddesigns.com/assetspreview') || !src.startsWith('/'));

 // Generate responsive image sources using the same smart logic
 const config = responsive !== 'none' ? RESPONSIVE_CONFIGS[responsive] : null;
 const imageSources = generateResponsiveSources(
   src,
   config?.widths || [320, 640, 1024, 1280]
 );

 // Determine final srcset and sizes
 const finalSrcset = customSrcset || (config ? imageSources.originalSrcset : undefined);
 const finalSizes = customSizes || config?.sizes;

 // Simple native picture element with all the smart responsive logic and format optimization
 return (
   <picture>
     {/* AVIF format for modern browsers */}
     {imageSources.avifSrcset && (
       <source
         srcset={imageSources.avifSrcset}
         sizes={finalSizes}
         type="image/avif"
       />
     )}

     {/* WebP format for broader support */}
     {imageSources.webpSrcset && (
       <source
         srcset={imageSources.webpSrcset}
         sizes={finalSizes}
         type="image/webp"
       />
     )}

     {/* Fallback img with original format - CSS classes applied here */}
     <img
       src={src}
       srcset={finalSrcset || undefined}
       sizes={finalSizes}
       alt={alt}
       width={width}
       height={height}
       loading={loading}
       class={className}
       crossOrigin={isCrossOrigin ? 'anonymous' : undefined}
       onLoad$={onLoad}
       onClick$={onClick$}
       {...rest}
     />
   </picture>
 );
});
