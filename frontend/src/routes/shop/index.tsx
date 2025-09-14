import { component$, useSignal, $, useContext, useVisibleTask$, useComputed$ } from '@qwik.dev/core';
import { routeLoader$, Link } from '@qwik.dev/router';
import { OptimizedImage } from '~/components/ui';
import Price from '~/components/products/Price';
import { getBatchedProductsForShop, getProductAssets, getShirtStylesForSelection, getStockLevelsOnly } from '~/providers/shop/products/products';
import { Product, ProductOption } from '~/types';
import { createSEOHead } from '~/utils/seo';
import { useLocalCart, addToLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';
import { loadCountryOnDemand } from '~/utils/addressStorage';
import { LocalCartService } from '~/services/LocalCartService';
import ShopImageUrl from '~/media/shop.jpg?url';
import { cleanupCache } from '~/utils/cache-warming';

import { enableAutoCleanup, disableAutoCleanup } from '~/services/ProductCacheService';


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
  const fullProductData = useSignal<{ shortSleeve?: Product | null; longSleeve?: Product | null }>({});
  const isLoadingStep = useSignal<boolean>(false);

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

  // Customization flow state
  const selectedProduct = useSignal<Product | null>(null);
  const selectedSize = useSignal<ProductOption | null>(null);
  const selectedColor = useSignal<ProductOption | null>(null);
  const selectedVariantId = useSignal<string>('');
  const isAddingToCart = useSignal(false);

  // Sequential selector state
  const selectedStyle = useSignal<'short' | 'long' | null>(null);
  const currentStep = useSignal<number>(1); // 1: Style, 2: Size, 3: Color

  // Cart quantity tracking for all variants
  const quantitySignal = useSignal<Record<string, number>>({});

  // 🚀 PERFORMANCE OPTIMIZED: Memoized computations for better rendering performance
  const availableOptions = useComputed$(() => getAvailableOptions(selectedProduct.value));
  const availabilityMap = useComputed$(() => createVariantAvailabilityMap(selectedProduct.value));

  // Update variant selection when size and color are both selected
  const updateVariantSelection = $(() => {
    if (!selectedSize.value || !selectedColor.value || !selectedProduct.value) {
      selectedVariantId.value = '';
      return;
    }

    const matchingVariant = selectedProduct.value.variants.find(variant => {
      if (!variant.options || !Array.isArray(variant.options)) return false;

      const hasSelectedSize = variant.options.some(opt => opt.id === selectedSize.value!.id);
      const hasSelectedColor = variant.options.some(opt => opt.id === selectedColor.value!.id);

      return hasSelectedSize && hasSelectedColor;
    });

    selectedVariantId.value = matchingVariant?.id || '';
  });




  const handleSizeSelect = $((sizeOption: ProductOption) => {
    // 🚀 OPTIMIZED: Fast availability check using pre-computed map
    if (!checkSizeAvailable(sizeOption, availabilityMap.value)) {
      return;
    }

    selectedSize.value = sizeOption;
    // Reset color if it's no longer available with new size
    if (selectedColor.value && !checkColorAvailable(selectedColor.value, sizeOption, availabilityMap.value)) {
      selectedColor.value = null;
    }
    updateVariantSelection();
    
    // Auto-advance to next step after shorter delay for better UX
    setTimeout(() => {
      if (currentStep.value === 2) {
        currentStep.value = 3;
      }
    }, 300); // Reduced from 800ms to 300ms for smoother transition
  });

  const handleColorSelect = $((colorOption: ProductOption) => {
    // 🚀 OPTIMIZED: Fast availability check using pre-computed map
    if (!checkColorAvailable(colorOption, selectedSize.value, availabilityMap.value)) return;
    selectedColor.value = colorOption;
    updateVariantSelection();
    // No auto-advance needed for final step
  });

  const handleStyleSelect = $((style: 'short' | 'long') => {
    selectedStyle.value = style;
    
    // Reset subsequent selections when changing style
    selectedSize.value = null;
    selectedColor.value = null;
    selectedVariantId.value = '';
    
    // 🚀 PROGRESSIVE LOADING: Load full product data only when user selects style
    const loadFullProductData = async () => {
      isLoadingStep.value = true;
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
          fullProductData.value = {
            ...fullProductData.value,
            shortSleeve: productData
          };
        } else {
          fullProductData.value = {
            ...fullProductData.value,
            longSleeve: productData
          };
        }
        
        // Set the selected product for size/color selection
        selectedProduct.value = productData;
        
        console.log(`✅ Full product data loaded for ${style} sleeve`);
      } catch (error) {
        console.error(`❌ Failed to load full product data for ${style}:`, error);
        // Show error to user
      } finally {
        clearTimeout(timeoutId);
        isLoadingStep.value = false;
      }
    };
    
    // Load full product data in background
    loadFullProductData();
    
    // Auto-advance to next step after shorter delay for better UX
    setTimeout(() => {
      if (currentStep.value === 1) {
        currentStep.value = 2;
      }
    }, 300); // Reduced from 800ms to 300ms for smoother transition
  });

  const prevStep = $(() => {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  });



  // Add to cart functionality
  const handleAddToCart = $(async () => {
    if (!selectedVariantId.value || !selectedProduct.value || !selectedSize.value || !selectedColor.value) return;

    isAddingToCart.value = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Find the selected variant
      const selectedVar = selectedProduct.value.variants.find(v => v.id === selectedVariantId.value);
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
            id: selectedProduct.value.id,
            name: selectedProduct.value.name,
            slug: selectedProduct.value.slug || '',
          },
          options: selectedVar.options || [],
          featuredAsset: selectedProduct.value.featuredAsset,
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
      isAddingToCart.value = false;
    }
  });



  // Get current product image - using signal instead of computed for better reactivity
  const currentProductImage = useSignal<any>(null);
  const productAssets = useSignal<any>(null);
  const assetsLoading = useSignal<boolean>(false);

  // Touch handling for mobile swipe
  const touchStartX = useSignal<number | null>(null);
  const touchEndX = useSignal<number | null>(null);

  // Lazy load assets when selectedProduct changes
  useVisibleTask$(({ track, cleanup }) => {
    track(() => selectedProduct.value);
    
    // Use AbortController for proper cleanup
    const controller = new AbortController();

    if (selectedProduct.value) {
      console.log('Product selected, lazy loading assets...');
      assetsLoading.value = true;

      // Create timeout for asset loading
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('Asset loading timeout - using placeholder');
        currentProductImage.value = { id: 'placeholder', preview: '/asset_placeholder.webp' };
        assetsLoading.value = false;
      }, 8000); // 8 second timeout

      // Add a small delay to prevent blocking UI when switching products
      const loadAssets = async () => {
        try {
          // Small delay to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Check if component is still mounted and product is still selected
          if (controller.signal.aborted || !selectedProduct.value) return;
          
          // Lazy load assets for the selected product
          const assets = await getProductAssets(selectedProduct.value.slug || '');
          
          // Check if component is still mounted
          if (controller.signal.aborted) return;
          
          clearTimeout(timeoutId);
          productAssets.value = assets;

          // Set initial image
          if (assets.featuredAsset) {
            currentProductImage.value = assets.featuredAsset;
          } else if (assets.assets && assets.assets.length > 0) {
            currentProductImage.value = assets.assets[0];
          } else {
            currentProductImage.value = { id: 'placeholder', preview: '/asset_placeholder.webp' };
          }

          assetsLoading.value = false;
        } catch (error) {
          if (!controller.signal.aborted) {
            clearTimeout(timeoutId);
            console.error('Failed to load assets:', error);
            currentProductImage.value = { id: 'placeholder', preview: '/asset_placeholder.webp' };
            assetsLoading.value = false;
          }
        }
      };
      
      loadAssets();
    } else {
      // No product selected - clear assets
      productAssets.value = null;
      currentProductImage.value = null;
      assetsLoading.value = false;
    }
    
    cleanup(() => {
      controller.abort();
    });
  });





  // 🚀 CACHE CLEANUP: Only cleanup old cache entries (removed cache warming that was causing 5s delay)
  useVisibleTask$(() => {
    // Add a small delay to prevent blocking initial render
    const timeoutId = setTimeout(() => {
      // Clean up old cache entries
      cleanupCache();
      
      // Enable auto cleanup for product cache
      enableAutoCleanup();
    }, 200);
    
    return () => {
      clearTimeout(timeoutId);
    };
  });

  // Disable auto cleanup when component is unmounted
  useVisibleTask$(({ cleanup }) => {
    cleanup(() => {
      disableAutoCleanup();
    });
  });

  // 🚀 OPTIMIZED INITIAL LOAD: Load only stock levels for immediate button state
  useVisibleTask$(({ cleanup }) => {
    // Use AbortController to handle cleanup properly
    const controller = new AbortController();
    
    const loadStockLevelsOnly = async () => {
      try {
        // Only load stock levels if we haven't already loaded them
        if (fullProductData.value.shortSleeve || fullProductData.value.longSleeve) {
          return;
        }
        
        console.log('🔄 Loading stock levels only on page load...');
        const stockData = await getStockLevelsOnly();
        
        // Check if component is still mounted
        if (controller.signal.aborted) return;
        
        // Store minimal stock data for button state calculation
        fullProductData.value = {
          shortSleeve: stockData.shortSleeve,
          longSleeve: stockData.longSleeve
        };
        
        console.log('✅ Stock levels loaded on page load - buttons ready');
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('❌ Failed to load stock levels on page load:', error);
        }
      }
    };
    
    // Add a small delay to prevent blocking initial render
    const timeoutId = setTimeout(() => {
      loadStockLevelsOnly();
    }, 50);
    
    cleanup(() => {
      controller.abort();
      clearTimeout(timeoutId);
    });
  });

  // Load cart quantities for all variants when products are available
  useVisibleTask$(() => {
    // Add a small delay to prevent blocking initial render
    const timeoutId = setTimeout(() => {
      const loadQuantities = () => {
        const allVariants: string[] = [];

        // Collect all variant IDs from progressively loaded products (only when available)
        if (fullProductData.value.shortSleeve?.variants && Array.isArray(fullProductData.value.shortSleeve.variants)) {
          allVariants.push(...fullProductData.value.shortSleeve.variants.map((v: any) => v.id).filter(Boolean));
        }
        if (fullProductData.value.longSleeve?.variants && Array.isArray(fullProductData.value.longSleeve.variants)) {
          allVariants.push(...fullProductData.value.longSleeve.variants.map((v: any) => v.id).filter(Boolean));
        }

        if (allVariants.length === 0) return;

        // Check if we're in local cart mode or have loaded cart context
        if (localCart.isLocalMode && localCart.hasLoadedOnce) {
          // Use loaded cart context data
          const result: Record<string, number> = {};
          allVariants.forEach((variantId) => {
            const localItem = localCart.localCart.items.find(
              (item: any) => item.productVariantId === variantId
            );
            result[variantId] = localItem?.quantity || 0;
          });
          quantitySignal.value = result;
        } else if (localCart.isLocalMode) {
          // Use lightweight localStorage check (no context loading)
          quantitySignal.value = LocalCartService.getItemQuantitiesFromStorage(allVariants);
        } else {
          // Fallback to Vendure order (checkout mode)
          const result: Record<string, number> = {};
          allVariants.forEach((variantId) => {
            const orderLine = (appState.activeOrder?.lines || []).find(
              (l: any) => l.productVariant.id === variantId
            );
            result[variantId] = orderLine?.quantity || 0;
          });
          quantitySignal.value = result;
        }
      };

      // Load quantities initially
      loadQuantities();

      // Listen for cart updates to sync quantities
      const handleCartUpdate = () => {
        if (localCart.hasLoadedOnce) {
          loadQuantities();
        }
      };

      window.addEventListener('cart-updated', handleCartUpdate);

      return () => {
        window.removeEventListener('cart-updated', handleCartUpdate);
      };
    }, 100); // Small delay to prevent blocking initial render

    return () => {
      clearTimeout(timeoutId);
    };
  });

  return (
    <div class="min-h-screen bg-gray-50">
      <style>
        {`
          @keyframes fillLine {
            from { width: 0; }
            to { width: 100%; }
          }
        `}
      </style>

      {/* Main Content */}
      <div class="max-w-content-wide mx-auto px-0 sm:px-12 lg:px-16 pb-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12">

          {/* Product Image */}
          <div class="order-1 lg:order-1 pt-0 lg:pt-6">
            <div class="sticky top-24">
              <div class="flex flex-col lg:flex-row lg:gap-4">
                {/* Thumbnail Images - Left Side - Hidden on mobile, visible on desktop */}
                <div class="hidden lg:flex flex-col gap-2 w-[22%] max-w-[180px] min-w-[80px] pt-4">
                  {selectedProduct.value && productAssets.value ? (
                    (() => {
                      // Create a combined array of all available assets from lazy-loaded data
                      const allAssets = [];

                      // Add featured asset first if it exists
                      if (productAssets.value.featuredAsset) {
                        allAssets.push(productAssets.value.featuredAsset);
                      }

                      // Add other assets, avoiding duplicates
                      if (productAssets.value.assets && productAssets.value.assets.length > 0) {
                        productAssets.value.assets.forEach((asset: any) => {
                          if (!productAssets.value.featuredAsset || asset.id !== productAssets.value.featuredAsset.id) {
                            allAssets.push(asset);
                          }
                        });
                      }

                      // If no assets at all, show placeholder
                      if (allAssets.length === 0) {
                        allAssets.push({ id: 'placeholder', preview: '/asset_placeholder.webp' });
                      }

                      return allAssets.map((asset: any, index: number) => (
                        <div
                          key={asset.id}
                          class={{
                            'border-2 cursor-pointer rounded-lg overflow-hidden aspect-4/5 transition-all duration-200 transform hover:scale-105 hover:shadow-md': true,
                            'border-[#8a6d4a] border-4': currentProductImage.value?.id === asset.id,
                            'border-gray-200': currentProductImage.value?.id !== asset.id,
                          }}
                          onClick$={() => {
                            currentProductImage.value = asset;
                          }}
                        >
                          <OptimizedImage
                            src={asset.preview}
                            class="w-full h-full object-contain transition-all duration-200 hover:opacity-80"
                            width={360}
                            height={450}
                            responsive="thumbnail"
                            alt={`Thumbnail ${index + 1} of ${selectedProduct.value?.name || 'Product'}`}
                            loading="lazy"
                          />
                        </div>
                      ));
                    })()
                  ) : selectedProduct.value && assetsLoading.value ? (
                    // Loading state for thumbnails
                    <div class="border-2 border-gray-200 rounded-lg overflow-hidden aspect-4/5 animate-pulse bg-gray-100 flex items-center justify-center">
                      <div class="text-gray-400 text-sm">Loading...</div>
                    </div>
                  ) : (
                    // Default thumbnail when no product is selected - show the shop.jpg image
                    <div class="border-2 border-gray-200 rounded-lg overflow-hidden aspect-4/5">
                      <OptimizedImage
                        src={ShopImageUrl}
                        class="w-full h-full object-cover"
                        width={360}
                        height={450}
                        responsive="thumbnail"
                        alt="Choose your perfect shirt style"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {/* Main Image Container */}
                <div class="flex-1">
                  {/* Main Image */}
                  <div 
                    class="w-full relative"
                    onTouchStart$={(e) => {
                      touchStartX.value = e.touches[0].clientX;
                      touchEndX.value = null;
                    }}
                    onTouchMove$={(e) => {
                      if (touchStartX.value === null) return;
                      touchEndX.value = e.touches[0].clientX;
                      
                      // Prevent vertical scroll if horizontal swipe is detected
                      const diffX = Math.abs(touchStartX.value - e.touches[0].clientX);
                      if (diffX > 30) {
                        e.preventDefault();
                      }
                    }}
                    onTouchEnd$={() => {
                      if (touchStartX.value === null || touchEndX.value === null) return;
                      
                      const diffX = touchStartX.value - touchEndX.value;
                      const minSwipeDistance = 50;
                      
                      // Only handle swipe if we have multiple images
                      if (selectedProduct.value && productAssets.value) {
                        const allAssets = [];
                        if (productAssets.value.featuredAsset) {
                          allAssets.push(productAssets.value.featuredAsset);
                        }
                        if (productAssets.value.assets && productAssets.value.assets.length > 0) {
                          productAssets.value.assets.forEach((asset: any) => {
                            if (!productAssets.value.featuredAsset || asset.id !== productAssets.value.featuredAsset.id) {
                              allAssets.push(asset);
                            }
                          });
                        }
                        
                        if (allAssets.length > 1) {
                          const currentIndex = allAssets.findIndex(asset => asset.id === currentProductImage.value?.id);
                          
                          if (Math.abs(diffX) > minSwipeDistance) {
                            if (diffX > 0 && currentIndex < allAssets.length - 1) {
                              // Swipe left - next image
                              currentProductImage.value = allAssets[currentIndex + 1];
                            } else if (diffX < 0 && currentIndex > 0) {
                              // Swipe right - previous image
                              currentProductImage.value = allAssets[currentIndex - 1];
                            }
                          }
                        }
                      }
                      
                      touchStartX.value = null;
                      touchEndX.value = null;
                    }}
                  >
                    {selectedProduct.value && currentProductImage.value ? (
                      <OptimizedImage
                        key={currentProductImage.value?.id || 'no-image'}
                        src={currentProductImage.value.preview}
                        alt={selectedProduct.value?.name || 'Product'}
                        width={600}
                        height={750}
                        class="w-full h-auto rounded-none lg:rounded-lg shadow-lg aspect-4/5 object-contain"
                        responsive="productMain"
                      />
                    ) : selectedProduct.value && assetsLoading.value ? (
                      // Loading state for main image
                      <div class="w-full h-auto rounded-none lg:rounded-lg shadow-lg aspect-4/5 bg-gray-100 animate-pulse flex items-center justify-center">
                        <div class="text-gray-400">Loading image...</div>
                      </div>
                    ) : (
                      <OptimizedImage
                        key="shop-default"
                        src={ShopImageUrl}
                        alt="Choose your perfect shirt style"
                        width={600}
                        height={750}
                        class="w-full h-auto rounded-none lg:rounded-lg shadow-lg aspect-auto lg:aspect-4/5 object-contain"
                        responsive="productMain"
                      />
                    )}
                  </div>

                  {/* Dots Navigation - Mobile only, below image */}
                  {selectedProduct.value && productAssets.value && (() => {
                    // Create a combined array of all available assets from lazy-loaded data
                    const allAssets = [];

                    // Add featured asset first if it exists
                    if (productAssets.value.featuredAsset) {
                      allAssets.push(productAssets.value.featuredAsset);
                    }

                    // Add other assets, avoiding duplicates
                    if (productAssets.value.assets && productAssets.value.assets.length > 0) {
                      productAssets.value.assets.forEach((asset: any) => {
                        if (!productAssets.value.featuredAsset || asset.id !== productAssets.value.featuredAsset.id) {
                          allAssets.push(asset);
                        }
                      });
                    }

                    // Only show dots if there are multiple images and on mobile
                    if (allAssets.length <= 1) return null;

                    return (
                      <div class="flex lg:hidden justify-center gap-2 mt-2 mb-2">
                        {allAssets.map((asset: any, index: number) => (
                          <button
                            key={asset.id}
                            class={{
                              'w-3 h-3 rounded-full transition-all duration-200 cursor-pointer': true,
                              'bg-[#8a6d4a]': currentProductImage.value?.id === asset.id,
                              'bg-gray-300 hover:bg-gray-400': currentProductImage.value?.id !== asset.id,
                            }}
                            onClick$={() => {
                              currentProductImage.value = asset;
                            }}
                            aria-label={`View image ${index + 1} of ${selectedProduct.value?.name || 'Product'}`}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Sequential Customization Panel */}
          <div class="order-2 lg:order-2 lg:pt-8 pt-0">
            <div class="bg-[#f5f5f5] rounded-none md:rounded-2xl shadow-lg overflow-hidden min-h-[600px] flex flex-col border border-gray-200">
              
              {/* Header with Back Button */}
              <div class="relative bg-white border-b border-gray-200 px-6 py-4">
                {/* Back Button */}
                {currentStep.value > 1 && (
                  <button
                    class="absolute left-4 top-1/2 -translate-y-1/2 bg-[#8a6d4a] text-white w-10 h-10 rounded-full cursor-pointer flex items-center justify-center text-lg transition-all duration-300 hover:bg-[#4F3B26] hover:shadow-md z-10"
                    onClick$={prevStep}
                  >
                    ←
                  </button>
                )}
                
                {/* Progress Indicator */}
                <div class="flex justify-center items-center space-x-4">
                  <div class="flex items-center space-x-3">
                    <div class={{
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-400': true,
                      'bg-[#8a6d4a] text-white scale-110': currentStep.value === 1,
                      'bg-[#8a6d4a] text-white': currentStep.value > 1,
                      'bg-gray-300 text-gray-600': currentStep.value < 1
                    }}>
                      {currentStep.value > 1 ? '✓' : '1'}
                    </div>
                    <span class="text-xs font-medium text-gray-600 hidden sm:block">Style</span>
                  </div>
                  
                  <div class={{
                    'w-12 h-1 rounded-full transition-all duration-400': true,
                    'bg-[#8a6d4a]': currentStep.value > 1,
                    'bg-gray-300': currentStep.value <= 1
                  }}></div>
                  
                  <div class="flex items-center space-x-3">
                    <div class={{
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-400': true,
                      'bg-[#8a6d4a] text-white scale-110': currentStep.value === 2,
                      'bg-[#8a6d4a] text-white': currentStep.value > 2,
                      'bg-gray-300 text-gray-600': currentStep.value < 2
                    }}>
                      {currentStep.value > 2 ? '✓' : '2'}
                    </div>
                    <span class="text-xs font-medium text-gray-600 hidden sm:block">Size</span>
                  </div>
                  
                  <div class={{
                    'w-12 h-1 rounded-full transition-all duration-400': true,
                    'bg-[#8a6d4a]': currentStep.value > 2,
                    'bg-gray-300': currentStep.value <= 2
                  }}></div>
                  
                  <div class="flex items-center space-x-3">
                    <div class={{
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-400': true,
                      'bg-[#8a6d4a] text-white scale-110': currentStep.value === 3,
                      'bg-[#8a6d4a] text-white': currentStep.value > 3,
                      'bg-gray-300 text-gray-600': currentStep.value < 3
                    }}>
                      {currentStep.value > 3 ? '✓' : '3'}
                    </div>
                    <span class="text-xs font-medium text-gray-600 hidden sm:block">Color</span>
                  </div>
                </div>
              </div>

              {/* Step Content Container */}
              <div class="flex-1 px-8 pt-4 pb-8 flex flex-col justify-center relative bg-white">
                
                {/* Step 1: Style Selection */}
                <div class={{
                  'transition-all duration-400 ease-in-out': true,
                  'opacity-100 transform translate-x-0': currentStep.value === 1,
                  'opacity-0 transform translate-x-5 pointer-events-none absolute': currentStep.value > 1,
                  'opacity-0 transform -translate-x-5 pointer-events-none absolute': currentStep.value < 1
                }}>
                  <h2 class="text-3xl font-bold mb-2 text-[#8a6d4a] text-center">Choose Your Style</h2>
                  <p class="text-gray-600 mb-8 text-center">Select your preferred sleeve length</p>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                    {stylesData.value.shortSleeve && (
                      <div
                        class={{
                          'bg-white border-2 rounded-xl p-6 text-center transition-all duration-300 transform relative overflow-hidden': true,
                          'cursor-pointer hover:shadow-lg hover:-translate-y-1': fullProductData.value.shortSleeve ? hasAnyAvailableVariants(fullProductData.value.shortSleeve) : false,
                          'cursor-not-allowed opacity-50': fullProductData.value.shortSleeve ? !hasAnyAvailableVariants(fullProductData.value.shortSleeve) : true,
                          'border-[#8a6d4a] bg-[#8a6d4a]/5 shadow-lg transform -translate-y-0.5': selectedStyle.value === 'short',
                          'border-gray-200 hover:border-[#8a6d4a]': selectedStyle.value !== 'short' && (fullProductData.value.shortSleeve ? hasAnyAvailableVariants(fullProductData.value.shortSleeve) : false)
                        }}
                        onClick$={() => {
                          // Prevent multiple clicks while loading
                          if (isLoadingStep.value) return;
                          if (fullProductData.value.shortSleeve && hasAnyAvailableVariants(fullProductData.value.shortSleeve)) {
                            handleStyleSelect('short');
                          }
                        }}
                      >
                        {selectedStyle.value === 'short' && (
                          <div class="absolute top-3 right-4 text-[#8a6d4a] font-bold text-lg">✓</div>
                        )}
                        {isLoadingStep.value && selectedStyle.value === 'short' && (
                          <div class="absolute top-3 right-4 flex items-center justify-center">
                            <div class="w-6 h-6 border-2 border-[#8a6d4a] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div class="text-xl font-bold mb-2 text-gray-800">Short Sleeve</div>
                        <div class="text-gray-600 text-sm mb-3">Summer confidence</div>
                        <Price
                          priceWithTax={stylesData.value.shortSleeve.variants[0]?.priceWithTax || 0}
                          currencyCode={stylesData.value.shortSleeve.variants[0]?.currencyCode || 'USD'}
                          forcedClass="text-2xl font-bold text-[#8a6d4a]"
                        />
                      </div>
                    )}
                    {stylesData.value.longSleeve && (
                      <div
                        class={{
                          'bg-white border-2 rounded-xl p-6 text-center transition-all duration-300 transform relative overflow-hidden': true,
                          'cursor-pointer hover:shadow-lg hover:-translate-y-1': fullProductData.value.longSleeve ? hasAnyAvailableVariants(fullProductData.value.longSleeve) : false,
                          'cursor-not-allowed opacity-50': fullProductData.value.longSleeve ? !hasAnyAvailableVariants(fullProductData.value.longSleeve) : true,
                          'border-[#8a6d4a] bg-[#8a6d4a]/5 shadow-lg transform -translate-y-0.5': selectedStyle.value === 'long',
                          'border-gray-200 hover:border-[#8a6d4a]': selectedStyle.value !== 'long' && (fullProductData.value.longSleeve ? hasAnyAvailableVariants(fullProductData.value.longSleeve) : false)
                        }}
                        onClick$={() => {
                          // Prevent multiple clicks while loading
                          if (isLoadingStep.value) return;
                          if (fullProductData.value.longSleeve && hasAnyAvailableVariants(fullProductData.value.longSleeve)) {
                            handleStyleSelect('long');
                          }
                        }}
                      >
                        {selectedStyle.value === 'long' && (
                          <div class="absolute top-3 right-4 text-[#8a6d4a] font-bold text-lg">✓</div>
                        )}
                        {isLoadingStep.value && selectedStyle.value === 'long' && (
                          <div class="absolute top-3 right-4 flex items-center justify-center">
                            <div class="w-6 h-6 border-2 border-[#8a6d4a] border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div class="text-xl font-bold mb-2 text-gray-800">Long Sleeve</div>
                        <div class="text-gray-600 text-sm mb-3">Year-round essential</div>
                        <Price
                          priceWithTax={stylesData.value.longSleeve.variants[0]?.priceWithTax || 0}
                          currencyCode={stylesData.value.longSleeve.variants[0]?.currencyCode || 'USD'}
                          forcedClass="text-2xl font-bold text-[#8a6d4a]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Size Selection */}
                <div class={{
                  'transition-all duration-400 ease-in-out': true,
                  'opacity-100 transform translate-x-0': currentStep.value === 2,
                  'opacity-0 transform translate-x-5 pointer-events-none absolute': currentStep.value > 2,
                  'opacity-0 transform -translate-x-5 pointer-events-none absolute': currentStep.value < 2
                }}>
                  <h2 class="text-3xl font-bold mb-2 text-[#8a6d4a] text-center">Select Your Size</h2>
                  <p class="text-gray-600 mb-8 text-center">Find your perfect fit</p>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                    {selectedProduct.value ? (
                      availableOptions.value.sizes.map((sizeOption) => {
                        const isSelected = selectedSize.value?.id === sizeOption.id;
                        const isAvailable = checkSizeAvailable(sizeOption, availabilityMap.value);

                        return (
                          <div
                            key={sizeOption.id}
                            class={{
                              'bg-white border-2 rounded-xl p-4 text-center transition-all duration-300 transform relative overflow-hidden': true,
                              'cursor-pointer': isAvailable,
                              'cursor-not-allowed': !isAvailable,
                              'border-[#8a6d4a] bg-[#8a6d4a]/5 shadow-lg transform -translate-y-0.5': isSelected,
                              'border-gray-200 hover:border-[#8a6d4a] hover:-translate-y-1 hover:shadow-md': !isSelected && isAvailable,
                              'border-gray-200 opacity-50': !isAvailable
                            }}
                            onClick$={() => {
                              if (isAvailable) {
                                handleSizeSelect(sizeOption);
                              }
                            }}
                          >
                            {isSelected && (
                              <div class="absolute top-2 right-3 text-[#8a6d4a] font-bold text-lg">✓</div>
                            )}
                            <div class="text-2xl font-bold mb-1 text-gray-800">{sizeOption.name}</div>
                            <div class="text-gray-600 text-xs leading-tight">
                              Chest: 52"<br/>Length: 29"
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      ['S', 'M', 'L'].map((size) => (
                        <div key={size} class="bg-gray-100 border-2 border-gray-200 rounded-xl p-4 text-center opacity-50">
                          <div class="text-2xl font-bold mb-1 text-gray-400">{size}</div>
                          <div class="text-gray-400 text-xs">Select style first</div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div class="text-center">
                    <div class="bg-[#8a6d4a]/10 border border-[#8a6d4a]/20 rounded-lg p-3 text-sm text-[#8a6d4a]">
                      💡 These shirts are designed with an oversized, relaxed fit for comfort and style
                    </div>
                  </div>
                </div>

                {/* Step 3: Color Selection */}
                <div class={{
                  'transition-all duration-400 ease-in-out': true,
                  'opacity-100 transform translate-x-0': currentStep.value === 3,
                  'opacity-0 transform translate-x-5 pointer-events-none absolute': currentStep.value > 3,
                  'opacity-0 transform -translate-x-5 pointer-events-none absolute': currentStep.value < 3
                }}>
                  <h2 class="text-3xl font-bold mb-2 text-[#8a6d4a] text-center">Choose Your Color</h2>
                  <p class="text-gray-600 mb-6 text-center">Pick your favorite shade</p>
                  
                  <div class="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
                    {selectedProduct.value ? (
                      availableOptions.value.colors.map((colorOption) => {
                        const isSelected = selectedColor.value?.id === colorOption.id;
                        const isAvailable = selectedSize.value ? checkColorAvailable(colorOption, selectedSize.value, availabilityMap.value) : false;

                        // Map color names to background styles
                        const getColorStyle = (name: string) => {
                          const colorName = name.toLowerCase();
                          if (colorName.includes('black') || colorName.includes('midnight')) return 'bg-slate-800';
                          if (colorName.includes('white') || colorName.includes('cloud')) return 'bg-gray-50 border-gray-300';
                          if (colorName.includes('grey') || colorName.includes('gray') || colorName.includes('storm')) return 'bg-gray-500';
                          if (colorName.includes('purple') || colorName.includes('deep')) return 'bg-purple-600';
                          if (colorName.includes('red') || colorName.includes('blood')) return 'bg-red-600';
                          if (colorName.includes('blue') || colorName.includes('electric')) return 'bg-blue-600';
                          if (colorName.includes('pink') || colorName.includes('hot')) return 'bg-pink-500';
                          if (colorName.includes('yellow') || colorName.includes('desert')) return 'bg-yellow-400';
                          if (colorName.includes('green') || colorName.includes('forest')) return 'bg-green-600';
                          return 'bg-gray-300';
                        };

                        return (
                          <div key={colorOption.id} class="flex flex-col items-center">
                            <div
                              class={{
                                [`aspect-[2/1] w-full rounded-xl border-3 transition-all duration-300 transform relative ${getColorStyle(colorOption.name)}`]: true,
                                'cursor-pointer': isAvailable,
                                'cursor-not-allowed': !isAvailable,
                                'border-[#8a6d4a] scale-105 shadow-xl': isSelected,
                                'border-black hover:scale-105 hover:shadow-lg': !isSelected && isAvailable,
                                'border-gray-400 opacity-70': !isAvailable
                              }}
                              onClick$={() => {
                                if (isAvailable) {
                                  handleColorSelect(colorOption);
                                }
                              }}
                            >
                              {isSelected && (
                                <div class="absolute inset-0 flex items-center justify-center text-white font-bold text-xl drop-shadow-lg">
                                  ✓
                                </div>
                              )}
                              {!isAvailable && (
                                <div class="absolute inset-0 bg-white/30 rounded-xl"></div>
                              )}
                            </div>
                            <div class="text-xs text-gray-600 mt-2 text-center font-medium">{colorOption.name}</div>
                          </div>
                        );
                      })
                    ) : (
                      ['Black', 'White', 'Grey', 'Purple', 'Red', 'Blue', 'Pink', 'Yellow', 'Green'].map((color) => (
                        <div key={color} class="flex flex-col items-center">
                          <div class="aspect-[2/1] w-full rounded-xl bg-gray-200 opacity-30"></div>
                          <div class="text-xs text-gray-400 mt-2">{color}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Split Layout: Selection Summary & Add to Cart - Always Visible */}
                  <div class="mb-6">
                    {/* Mobile: Stacked Layout */}
                    <div class="md:hidden space-y-4">
                      {/* Selection Summary */}
                      <div class="bg-[#8a6d4a]/5 border border-[#8a6d4a]/20 rounded-xl p-4 shadow-sm">
                        <div class="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <div class="text-xs text-gray-600 mb-1">Style</div>
                            <div class="font-bold text-[#8a6d4a] text-sm">{selectedProduct.value?.name?.replace(' Shirt', '') || '—'}</div>
                          </div>
                          <div>
                            <div class="text-xs text-gray-600 mb-1">Size</div>
                            <div class="font-bold text-[#8a6d4a] text-sm">{selectedSize.value?.name || '—'}</div>
                          </div>
                          <div>
                            <div class="text-xs text-gray-600 mb-1">Color</div>
                            <div class="font-bold text-[#8a6d4a] text-sm">{selectedColor.value?.name || '—'}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Add to Cart Button with Price for Mobile */}
                      <button
                        onClick$={handleAddToCart}
                        disabled={isAddingToCart.value || !selectedVariantId.value}
                        class={{
                          'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl': true,
                          'bg-[#8a6d4a] text-white cursor-pointer hover:bg-[#4F3B26]': !isAddingToCart.value && selectedVariantId.value,
                          'bg-gray-400 text-white cursor-not-allowed': !selectedVariantId.value,
                          'bg-[#8a6d4a] text-white cursor-not-allowed': isAddingToCart.value
                        }}
                      >
                        {isAddingToCart.value ? (
                          <span class="flex items-center justify-center">
                            <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                            Adding to Cart...
                          </span>
                        ) : selectedVariantId.value ? (
                          <span class="flex items-center justify-center">
                            <span>Add to Cart - </span>
                            <Price
                              priceWithTax={selectedProduct.value?.variants[0]?.priceWithTax || 0}
                              currencyCode={selectedProduct.value?.variants[0]?.currencyCode || 'USD'}
                              forcedClass="font-bold"
                            />
                          </span>
                        ) : (
                          'Complete Selection'
                        )}
                      </button>
                    </div>

                    {/* Desktop: Single Line Layout */}
                    <div class="hidden md:block">
                      {/* Selection Summary - Single Line */}
                      <div class="bg-[#8a6d4a]/5 border border-[#8a6d4a]/20 rounded-xl p-4 shadow-sm mb-4">
                        <div class="flex justify-center items-center gap-8 text-center">
                          <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-600">Style:</span>
                            <span class="font-bold text-[#8a6d4a]">{selectedProduct.value?.name?.replace(' Shirt', '') || '—'}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-600">Size:</span>
                            <span class="font-bold text-[#8a6d4a]">{selectedSize.value?.name || '—'}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-600">Color:</span>
                            <span class="font-bold text-[#8a6d4a]">{selectedColor.value?.name || '—'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Half and Half: Total Price + Add to Cart Button */}
                      <div class="grid grid-cols-2 gap-4">
                        {/* Left Half: Total Price */}
                        <div class="bg-[#8a6d4a]/5 border border-[#8a6d4a]/20 rounded-xl p-4 shadow-sm flex flex-row justify-center items-center gap-2">
                          <div class="text-lg font-bold text-gray-700">Total:</div>
                          {selectedProduct.value ? (
                            <Price
                              priceWithTax={selectedProduct.value?.variants[0]?.priceWithTax || 0}
                              currencyCode={selectedProduct.value?.variants[0]?.currencyCode || 'USD'}
                              forcedClass="text-2xl font-bold text-[#8a6d4a]"
                            />
                          ) : (
                            <span class="text-2xl font-bold text-gray-400">—</span>
                          )}
                        </div>
                        
                        {/* Right Half: Add to Cart Button */}
                        <button
                          onClick$={handleAddToCart}
                          disabled={isAddingToCart.value || !selectedVariantId.value}
                          class={{
                            'w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl': true,
                            'bg-[#8a6d4a] text-white cursor-pointer hover:bg-[#4F3B26]': !isAddingToCart.value && selectedVariantId.value,
                            'bg-gray-400 text-white cursor-not-allowed': !selectedVariantId.value,
                            'bg-[#8a6d4a] text-white cursor-not-allowed': isAddingToCart.value
                          }}
                        >
                          {isAddingToCart.value ? (
                            <span class="flex items-center justify-center">
                              <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                              Adding to Cart...
                            </span>
                          ) : selectedVariantId.value ? (
                            'Add to Cart'
                          ) : (
                            'Complete Selection'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const head = () => {
  return createSEOHead({
    title: 'Shop - Rotten Hand',
    description: 'One shirt, 18 options. Choose your style, size, and color. Ethically made with our money-back guarantee.',
    noindex: false,
  });
};
