// 🚀 BACKUP: Original shop page implementation before single landing page migration
import { component$, useSignal, $, useContext, useVisibleTask$, useComputed$ } from '@qwik.dev/core';
import { routeLoader$, Link } from '@qwik.dev/router';
import { Product, ProductOption } from '~/types';
import { createSEOHead } from '~/utils/seo';
import { useLocalCart, addToLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';
import { loadCountryOnDemand } from '~/utils/addressStorage';
import { LocalCartService } from '~/services/LocalCartService';
import { getBatchedProductsForShop, getShirtStylesForSelection } from '~/providers/shop/products/products';
import { cleanupCache } from '~/utils/cache-warming';
import { enableAutoCleanup, disableAutoCleanup } from '~/services/ProductCacheService';

// Additional static images you'll need to add to ~/media/:
// - fabric-detail.jpg (close-up of peach skin fabric)
// - collar-detail.jpg (gold pattern inside collar)
// - craftsmanship-video.mp4 (behind the scenes video)
// - sustainability.jpg (environmental impact image)

// 🚀 OPTIMIZED: Memoized helper functions for better performance
const getAvailableOptions = (product: Product | null) => {
  if (!product?.variants) return { sizes: [], colors: [] };

  const optionGroups: Record<string, ProductOption[]> = {};

  product.variants.forEach(variant => {
    if (!variant.options || !Array.isArray(variant.options)) return;

    variant.options.forEach(option => {
      if (!option.group) return;

      const groupCode = option.group.code.toLowerCase();
      if (!optionGroups[groupCode]) {
        optionGroups[groupCode] = [];
      }

      const exists = optionGroups[groupCode].some(existing => existing.id === option.id);
      if (!exists) {
        optionGroups[groupCode].push(option);
      }
    });
  });

  return {
    sizes: optionGroups['size'] || [],
    colors: optionGroups['color'] || []
  };
};

// 🚀 OPTIMIZED: Pre-compute variant availability map for O(1) lookups
const createVariantAvailabilityMap = (product: Product | null) => {
  if (!product?.variants) return new Map();

  const availabilityMap = new Map<string, boolean>();

  product.variants.forEach(variant => {
    if (!variant.options || !Array.isArray(variant.options)) return;

    // Check if variant is in stock
    const stockLevel = parseInt(String(variant.stockLevel || '0'));
    const trackInventory = variant.trackInventory;
    const isInStock = stockLevel > 0 || trackInventory === 'FALSE';

    if (isInStock) {
      // Mark each option as available
      variant.options.forEach(option => {
        if (option?.id) {
          availabilityMap.set(option.id, true);
        }
      });

      // Mark size+color combinations as available
      const sizeOption = variant.options.find(opt => opt.group?.code.toLowerCase() === 'size');
      const colorOption = variant.options.find(opt => opt.group?.code.toLowerCase() === 'color');

      if (sizeOption?.id && colorOption?.id) {
        availabilityMap.set(`${sizeOption.id}+${colorOption.id}`, true);
      }
    }
  });

  return availabilityMap;
};

// 🚀 NEW: Check if a product has any available variants (not all out of stock)
const hasAnyAvailableVariants = (product: Product | null): boolean => {
  if (!product?.variants) return false;
  
  return product.variants.some(variant => {
    const stockLevel = parseInt(String(variant.stockLevel || '0'));
    const trackInventory = variant.trackInventory;
    return stockLevel > 0 || trackInventory === 'FALSE';
  });
};

// 🚀 PERFORMANCE OPTIMIZED: Fast availability checks using pre-computed map
const checkSizeAvailable = (sizeOption: ProductOption, availabilityMap: Map<string, boolean>) => {
  if (!sizeOption?.id) return false;
  return availabilityMap.has(sizeOption.id);
};

const checkColorAvailable = (colorOption: ProductOption, selectedSize: ProductOption | null, availabilityMap: Map<string, boolean>) => {
  if (!selectedSize?.id || !colorOption?.id) return false;
  return availabilityMap.has(`${selectedSize.id}+${colorOption.id}`);
};

export const useShirtStylesLoader = routeLoader$(async () => {
  try {
    console.log('🚀 Loading ultra-lightweight style selection data...');

    // Load ONLY basic style info for Step 1 - no variants, no assets, no options
    const styles = await getShirtStylesForSelection().catch(err => {
      console.error('Failed to load styles:', err);
      return { shortSleeve: null, longSleeve: null };
    });

    console.log('✅ Style selection data loaded:', {
      shortSleeve: !!styles.shortSleeve,
      longSleeve: !!styles.longSleeve
    });

    return styles;
  } catch (error) {
    console.error('Failed to load shirt styles:', error);
    return {
      shortSleeve: null,
      longSleeve: null,
    };
  }
});

export default component$(() => {
  const stylesData = useShirtStylesLoader();
  const localCart = useLocalCart();
  const appState = useContext(APP_STATE);

  // Progressive loading state for full product data
  const _fullProductData = useSignal<{ shortSleeve?: Product | null; longSleeve?: Product | null }>({});
  const _isLoadingStep = useSignal<boolean>(false);

  // Show fallback if styles failed to load
  if (!stylesData.value.shortSleeve && !stylesData.value.longSleeve) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center max-w-md mx-auto px-4">
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Loading Products...</h1>
            <p class="text-gray-600 mb-6">We're preparing your perfect shirt experience. If this takes too long, there might be a temporary issue.</p>
          </div>

          <div class="space-y-4">
            <button
              onClick$={() => window.location.reload()}
              class="w-full bg-[#8a6d4a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4F3B26] transition-colors"
            >
              Refresh Page
            </button>

            <Link
              href="/"
              class="block text-[#8a6d4a] hover:text-[#4F3B26] font-medium"
            >
              ← Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Page flow state
  const _selectedStyle = useSignal<'short' | 'long' | null>(null);
  const _showBrandStory = useSignal<boolean>(true);
  const _currentStep = useSignal<number>(1); // 1: Size, 2: Color

  // Customization flow state
  const _selectedProduct = useSignal<Product | null>(null);
  const _selectedSize = useSignal<ProductOption | null>(null);
  const _selectedColor = useSignal<ProductOption | null>(null);
  const _selectedVariantId = useSignal<string>('');
  const _isAddingToCart = useSignal(false);
  const _showSizeChart = useSignal<boolean>(false);

  // Cart quantity tracking for all variants
  const _quantitySignal = useSignal<Record<string, number>>({});

  // 🚀 PERFORMANCE OPTIMIZED: Memoized computations for better rendering performance
  const _availableOptions = useComputed$(() => getAvailableOptions(_selectedProduct.value));
  const _availabilityMap = useComputed$(() => createVariantAvailabilityMap(_selectedProduct.value));

  // Update variant selection when size and color are both selected
  const _updateVariantSelection = $(() => {
    if (!_selectedSize.value || !_selectedColor.value || !_selectedProduct.value) {
      _selectedVariantId.value = '';
      return;
    }

    const matchingVariant = _selectedProduct.value.variants.find(variant => {
      if (!variant.options || !Array.isArray(variant.options)) return false;

      const hasSelectedSize = variant.options.some(opt => opt.id === _selectedSize.value!.id);
      const hasSelectedColor = variant.options.some(opt => opt.id === _selectedColor.value!.id);

      return hasSelectedSize && hasSelectedColor;
    });

    _selectedVariantId.value = matchingVariant?.id || '';
  });

  const _handleSizeSelect = $((sizeOption: ProductOption) => {
    // 🚀 OPTIMIZED: Fast availability check using pre-computed map
    if (!checkSizeAvailable(sizeOption, _availabilityMap.value)) {
      return;
    }

    _selectedSize.value = sizeOption;
    // Reset color if it's no longer available with new size
    if (_selectedColor.value && !checkColorAvailable(_selectedColor.value, sizeOption, _availabilityMap.value)) {
      _selectedColor.value = null;
    }
    _updateVariantSelection();

    // Auto-advance to color step after selection
    setTimeout(() => {
      if (_currentStep.value === 1) {
        _currentStep.value = 2;
      }
    }, 300);
  });

  const _handleColorSelect = $((colorOption: ProductOption) => {
    // 🚀 OPTIMIZED: Fast availability check using pre-computed map
    if (!checkColorAvailable(colorOption, _selectedSize.value, _availabilityMap.value)) return;
    _selectedColor.value = colorOption;
    _updateVariantSelection();
  });

  const _prevStep = $(() => {
    if (_currentStep.value > 1) {
      _currentStep.value--;
      // Reset color selection when going back to size step
      if (_currentStep.value === 1) {
        _selectedColor.value = null;
        _selectedVariantId.value = '';
      }
    }
  });

  const _handleStyleSelect = $((style: 'short' | 'long') => {
    _selectedStyle.value = style;
    _showBrandStory.value = false;

    // Reset subsequent selections when changing style
    _selectedSize.value = null;
    _selectedColor.value = null;
    _selectedVariantId.value = '';

    // 🚀 PROGRESSIVE LOADING: Load full product data only when user selects style
    const loadFullProductData = async () => {
      _isLoadingStep.value = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        console.log(`🔄 Loading full product data for ${style} sleeve...`);
        
        // Load only the selected product's full data
        const slug = style === 'short' ? 'shortsleeveshirt' : 'longsleeveshirt';
        
        // Create a promise that respects the abort signal
        const loadDataPromise = getBatchedProductsForShop([slug]);
        const abortPromise = new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Product data loading timed out'));
          });
        });
        
        const [productData] = await Promise.race([loadDataPromise, abortPromise]) as any;
        
        // Update the full product data with the loaded product
        if (style === 'short') {
          _fullProductData.value = {
            ..._fullProductData.value,
            shortSleeve: productData
          };
        } else {
          _fullProductData.value = {
            ..._fullProductData.value,
            longSleeve: productData
          };
        }

        // Set the selected product for size/color selection
        _selectedProduct.value = productData;

        console.log(`✅ Full product data loaded for ${style} sleeve`);

        // Smooth scroll to customization section after a brief delay
        setTimeout(() => {
          const customizationSection = document.getElementById('customization-section');
          if (customizationSection) {
            // Get the element's position and scroll with offset to keep header visible
            const rect = customizationSection.getBoundingClientRect();
            const headerHeight = 64; // Account for header height (h-16 = 64px)
            const offset = 20; // Additional padding

            window.scrollTo({
              top: window.scrollY + rect.top - headerHeight - offset,
              behavior: 'smooth'
            });
          }
        }, 300);
      } catch (error) {
        console.error(`❌ Failed to load full product data for ${style}:`, error);
        // Show error to user
      } finally {
        clearTimeout(timeoutId);
        _isLoadingStep.value = false;
      }
    };

    // Load full product data in background
    loadFullProductData();
  });

  // Add to cart functionality
  const _handleAddToCart = $(async () => {
    if (!_selectedVariantId.value || !_selectedProduct.value || !_selectedSize.value || !_selectedColor.value) return;

    _isAddingToCart.value = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Find the selected variant
      const selectedVar = _selectedProduct.value.variants.find(v => v.id === _selectedVariantId.value);
      if (!selectedVar) {
        throw new Error('Selected variant not found');
      }

      // Create the cart item object
      const localCartItem = {
        productVariantId: selectedVar.id,
        quantity: 1,
        productVariant: {
          id: selectedVar.id,
          name: selectedVar.name,
          price: selectedVar.priceWithTax,
          stockLevel: selectedVar.stockLevel,
          product: {
            id: _selectedProduct.value.id,
            name: _selectedProduct.value.name,
            slug: _selectedProduct.value.slug || '',
          },
          options: selectedVar.options || [],
          featuredAsset: _selectedProduct.value.featuredAsset,
        },
      };

      // Add to cart using the correct function signature with timeout
      const addToCartPromise = addToLocalCart(localCart, localCartItem);
      const abortPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Add to cart operation timed out'));
        });
      });
      
      await Promise.race([addToCartPromise, abortPromise]);

      // 🚀 DEMAND-BASED GEOLOCATION: Load country when user shows purchase intent
      await loadCountryOnDemand(appState);

      // Trigger cart update event to refresh quantities
      window.dispatchEvent(new CustomEvent('cart-updated'));

      // Show cart if successful
      if (!localCart.lastError) {
        appState.showCart = true;
        
        // 🚀 FRESH STOCK: Refresh stock levels when opening cart (in background)
        // Refresh stock levels in background without blocking UI
        if (localCart.localCart.items.length > 0) {
          refreshCartStock(localCart).then(() => {
            // Trigger cart update event to refresh UI with new stock levels
            window.dispatchEvent(new CustomEvent('cart-updated'));
          }).catch((error: Error) => {
            console.error('Background stock refresh failed:', error);
          });
        }
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      // Could add error notification here
    } finally {
      clearTimeout(timeoutId);
      _isAddingToCart.value = false;
    }
  });

  // NOTE: This is a truncated backup - the full shop.tsx file is 1532 lines
  // The complete implementation includes:
  // - Product image loading and display logic
  // - Touch handling for mobile swipe
  // - Cache management
  // - Stock level loading
  // - Cart quantity tracking
  // - Complete UI rendering with product selection
  // - Size chart display
  // - Color selection interface
  // - Add to cart button and functionality
  // - SEO head configuration
  
  return (
    <div class="min-h-screen bg-white">
      {/* This is a backup file - see original shop/index.tsx for complete implementation */}
      <div class="p-8 text-center">
        <h1 class="text-2xl font-bold mb-4">Shop Backup File</h1>
        <p class="text-gray-600">This is a backup of the original shop implementation.</p>
        <p class="text-gray-600">The complete file is 1532 lines and includes all shop functionality.</p>
      </div>
    </div>
  );
});

export const head = () => {
  return createSEOHead({
    title: 'Shop - Rotten Hand',
    description: 'Shop the perfect shirt collection from Rotten Hand.',
    noindex: false,
  });
};
