import { qwikRouter } from '@qwik.dev/router/vite';
import { qwikVite } from '@qwik.dev/core/optimizer';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { imagetools } from 'vite-imagetools';
import viteCompression from 'vite-plugin-compression';

export default defineConfig((config) => {
  const isDev = config.mode === 'development';

  return {
    logLevel: 'info', // Show build progress and info logs
    base: '/', // Ensure root-relative URLs

    build: {
      sourcemap: isDev,
      minify: false, // Disable minification to resolve syntax errors
      outDir: 'dist', // Ensure output goes to dist/

      // 🚀 ENHANCED TERSER CONFIGURATION - Aggressive settings for maximum compression
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.logs in production
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific functions
          passes: 3, // Maximum compression passes for optimal results
          dead_code: true, // Remove unreachable code
          conditionals: true, // Optimize if-s and conditional expressions
          evaluate: true, // Evaluate constant expressions
          booleans: true, // Optimize boolean expressions
          loops: true, // Optimize loops
          unused: true, // Remove unused variables and functions
          hoist_funs: true, // Hoist function declarations
          hoist_vars: false, // Don't hoist var declarations (can break scope)
          if_return: true, // Optimize if/return and if/continue
          join_vars: true, // Join consecutive var statements
          reduce_vars: true, // Improve optimization of variables assigned with and used as constant values
          warnings: false, // Don't show warnings in production
          sequences: true, // Join consecutive simple statements using the comma operator
          properties: true, // Optimize property access
          comparisons: true, // Apply certain optimizations to binary nodes
          inline: true, // Inline calls to function with simple return statement
        },
        mangle: {
          safari10: true, // Safari 10 compatibility for proper variable mangling
          properties: false, // Don't mangle property names (can break functionality)
          toplevel: true, // Mangle names declared in the top level scope
        },
        format: {
          comments: false, // Remove all comments for smaller bundle size
          ascii_only: true, // Ensure ASCII-only output for better compatibility
        },
        // Keep function names for better debugging in production (optional)
        keep_fnames: false, // Set to true if you need function names preserved
        keep_classnames: false, // Set to true if you need class names preserved
      },

      rollupOptions: {
        output: {
          // 🚀 ENHANCED: Advanced chunking strategy based on Damned Designs optimization roadmap
          manualChunks(id) {
            // Keep Qwik core separate for better caching
            if (id.includes('node_modules/@qwik.dev/core') || id.includes('node_modules/@qwik.dev/router')) {
              return 'vendor';
            }

            // 🚀 NEW: Heavy cart functionality (409KB currently) - only load when needed
            if (id.includes('src/components/cart/') ||
                id.includes('src/components/cart-contents/') ||
                id.includes('src/components/cart-totals/') ||
                id.includes('src/contexts/CartContext.tsx') ||
                id.includes('src/services/LocalCartService.ts')) {
              return 'cart';
            }

            // 🚀 NEW: Heavy form validation (AddressForm is 409KB!)
            if (id.includes('src/components/checkout/AddressForm.tsx') ||
                id.includes('src/utils/card-validation.ts') ||
                id.includes('src/components/address-form/') ||
                id.includes('src/components/billing-address-form/')) {
              return 'forms';
            }

            // Separate checkout components to prevent loading on homepage
            if (id.includes('/components/checkout/') ||
                id.includes('CheckoutAddresses') ||
                id.includes('CheckoutFlow') ||
                id.includes('PaymentStep')) {
              return 'checkout';
            }

            // 🚀 NEW: Animation-heavy components for better loading
            if (id.includes('src/hooks/useLazySection.ts') ||
                id.includes('src/components/products/ViewportLazyProductCard.tsx') ||
                id.includes('src/utils/global-intersection-observer.ts')) {
              return 'animations';
            }

            // Split large third-party libraries
            if (id.includes('node_modules')) {
              // Keep vendor chunks under 100KB to prevent main thread blocking
              if (id.includes('node_modules/lodash') ||
                  id.includes('node_modules/date-fns') ||
                  id.includes('node_modules/graphql')) {
                return 'libs';
              }
            }
            // Let Qwik handle the rest with its smart chunking
            return undefined;
          },
          // JS files to dist/build/
          entryFileNames: 'build/[name]-[hash].js',
          chunkFileNames: 'build/[name]-[hash].js',
          // CSS and other non-image assets to dist/build/, images to dist/ root
          assetFileNames: (assetInfo) => {
            if (/\.(css)$/.test(assetInfo.name ?? '')) {
              return 'build/[name]-[hash][extname]';
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name ?? '')) {
              return '[name]-[hash][extname]'; // Images to dist/ root
            }
            // Other assets (e.g., fonts) to dist/build/
            return 'build/[name]-[hash][extname]';
          },
        },
        // 🌳 ENHANCED TREE SHAKING - Removes unused code for smaller bundles
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },
    plugins: [
      qwikRouter({
        // Exclude dynamic sitemap routes from static generation
        exclude: ['/sitemap.xml', '/sitemap-*.xml'],
      }),
      qwikVite({
        devTools: {
          clickToSource: false,
        },
        srcDir: 'src',
        debug: false,
        entryStrategy: {
          type: 'smart',
        },
      }),
      tsconfigPaths(),
      imagetools({
        // Enhanced AVIF optimizations for maximum performance
        defaultDirectives: (url) => {
          if (url.searchParams.has('format')) {
            const format = url.searchParams.get('format');
            if (format === 'avif') {
              // AVIF optimizations for maximum compression (customer experience priority)
              return new URLSearchParams({
                format: 'avif',
                quality: '85',     // Good quality, optimized for size
                effort: '9',       // Maximum compression (build time irrelevant)
                chromaSubsampling: '420', // Standard subsampling
                lossless: 'false'  // Ensure lossy compression for smallest files
              });
            }
            if (format === 'webp') {
              // Optimized WebP fallback
              return new URLSearchParams({
                format: 'webp',
                quality: '85',
                effort: '6'
              });
            }
          }
          return url.searchParams;
        }
      }),
      // Custom plugin to track image processing progress
      {
        name: 'image-progress',
        load(id) {
          if (id.includes('?format=') && (id.includes('.png') || id.includes('.jpg') || id.includes('.jpeg'))) {
            console.log(`🖼️  Processing image: ${id.split('/').pop()}`);
          }
        }
      },
      // Text compression - addresses GTmetrix "Enable text compression" (577KB savings)
      ...(!isDev ? [
        // Gzip compression (universally supported, built into Nginx)
        viteCompression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024, // Only compress files > 1KB
          deleteOriginFile: false, // Keep original files
          filter: /\.(js|mjs|json|css|html|svg)$/i, // Compress text-based files
          compressionOptions: {
            level: 9, // Maximum compression for build-time (since it's pre-computed)
          },
        }),
        // Brotli compression (better compression ratios, supported by modern browsers)
        viteCompression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024, // Only compress files > 1KB
          deleteOriginFile: false, // Keep original files
          filter: /\.(js|mjs|json|css|html|svg)$/i, // Compress text-based files
          compressionOptions: {
            level: 11, // Maximum Brotli compression for build-time
          },
        }),
      ] : []),
    ],
    preview: {
      host: '0.0.0.0',
      port: 4000,
      headers: {
        // Caching
        'Cache-Control': 'public, max-age=600',
        // Security Headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'", // Qwik needs unsafe-inline
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://rottenhand.com",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    },
    server: isDev
      ? {
          watch: {
            ignored: ['node_modules/**', '.git/**'],
          },
          fs: {
            allow: ['..'], // Allow serving files from one level up
          },
        }
      : undefined,
  };
});