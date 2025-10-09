import { component$, useSignal, $, useContext, useVisibleTask$ } from '@qwik.dev/core';
import { getProductAssets, getFeaturedImages, getColorThumbnails } from '~/providers/shop/products/products';
import { Product, ProductOption } from '~/types';
import { useLocalCart, addToLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';
import { loadCountryOnDemand } from '~/utils/addressStorage';
import { LocalCartService } from '~/services/LocalCartService';
import { cleanupCache } from '~/utils/cache-warming';
import { enableAutoCleanup, disableAutoCleanup } from '~/services/ProductCacheService';

import { StyleSelection } from './StyleSelection';
import { SizeColorSelection } from './SizeColorSelection';

// Context for different usage scenarios
export interface ShopComponentProps {
  context: 'homepage' | 'standalone';
  scrollTarget?: string;
  preloadData?: boolean;
  lazyLoadAssets?: boolean;
  analyticsSource?: 'hero-button' | 'scroll-proximity' | 'direct-navigation';
  // Basic style data passed from parent (for immediate rendering) - now nullable for lazy loading
  stylesData: {
    shortSleeve: any | null;
    longSleeve: any | null;
  } | null;
}

// Shop component state interface
export interface ShopComponentState {
  selectedStyle: 'short' | 'long' | null;
  selectedSize: ProductOption | null;
  selectedColor: ProductOption | null;
  selectedVariantId: string;
  currentStep: number;
  isLoading: boolean;
  productData: {
    shortSleeve?: Product | null;
    longSleeve?: Product | null;
  };
}

// Helper functions moved to individual components

export const ShopComponent = component$<ShopComponentProps>((props) => {
  const localCart = useLocalCart();
  const appState = useContext(APP_STATE);


  const isLoadingStep = useSignal<boolean>(false);

  // 🚀 NEW: State for lazy-loaded style data
  const stylesData = useSignal<{ shortSleeve: any | null; longSleeve: any | null } | null>(props.stylesData);
  const hasLoadedStyles = useSignal<boolean>(!!props.stylesData);

  // Full product data with images and variants (loaded in background)
  // 🚀 OPTIMIZATION: Initialize with stylesData so buttons are active immediately!
  const fullProductData = useSignal<{ shortSleeve?: any; longSleeve?: any }>({
    shortSleeve: props.stylesData?.shortSleeve || null,
    longSleeve: props.stylesData?.longSleeve || null
  });

  // Show loading skeleton while lazy loading initial data
  console.log('🔧 [DEBUG] Render check - hasLoadedStyles.value:', hasLoadedStyles.value, 'stylesData.value:', !!stylesData.value);
  if (!hasLoadedStyles.value) {
    console.log('🔧 [DEBUG] Showing loading screen');
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center max-w-md mx-auto px-4">
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center animate-pulse">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Loading Products...</h1>
            <p class="text-gray-600 mb-6">We're preparing your perfect shirt experience.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error fallback if styles failed to load
  if (!stylesData.value?.shortSleeve && !stylesData.value?.longSleeve) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center max-w-md mx-auto px-4">
          <div class="mb-6">
            <div class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Unable to Load Products</h1>
            <p class="text-gray-600 mb-6">There was an issue loading the products. Please try refreshing the page.</p>
          </div>

          <div class="space-y-4">
            <button
              onClick$={() => window.location.reload()}
              class="w-full bg-[#8a6d4a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4F3B26] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Page flow state
  const selectedStyle = useSignal<'short' | 'long' | null>(null);
  const showBrandStory = useSignal<boolean>(true);
  const currentStep = useSignal<number>(1); // 1: Size, 2: Color

  // Customization flow state
  const selectedProduct = useSignal<Product | null>(null);
  const selectedSize = useSignal<ProductOption | null>(null);
  const selectedColor = useSignal<ProductOption | null>(null);
  const selectedVariantId = useSignal<string>('');
  const isAddingToCart = useSignal(false);
  const showSizeChart = useSignal<boolean>(false);

  // Cart quantity tracking for all variants
  const quantitySignal = useSignal<Record<string, number>>({});

  // Touch handling state
  const touchStartX = useSignal<number | null>(null);
  const touchEndX = useSignal<number | null>(null);

  // Product image state
  const currentProductImage = useSignal<any>(null);
  const productAssets = useSignal<any>(null);
  const assetsLoading = useSignal<boolean>(false);

  // Signal triggers for component communication
  const styleSelectTrigger = useSignal<'short' | 'long' | null>(null);
  const sizeSelectTrigger = useSignal<ProductOption | null>(null);
  const colorSelectTrigger = useSignal<ProductOption | null>(null);
  const prevStepTrigger = useSignal<boolean>(false);
  const toggleSizeChartTrigger = useSignal<boolean>(false);
  const imageSelectTrigger = useSignal<any>(null);
  const touchStartTrigger = useSignal<{ clientX: number; clientY: number } | null>(null);
  const touchMoveTrigger = useSignal<{ clientX: number; clientY: number } | null>(null);
  const touchEndTrigger = useSignal<boolean>(false);
  const addToCartTrigger = useSignal<boolean>(false);

  // Computations moved to individual components

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
    selectedSize.value = sizeOption;
    // Reset color if it's no longer available with new size
    selectedColor.value = null;
    updateVariantSelection();

    // 🚀 EARLY INTENT DETECTION: Start geolocation when user shows purchase intent
    console.log('🌍 [EARLY GEOLOCATION] Size selected - starting background geolocation...');
    loadCountryOnDemand(appState).then(() => {
      console.log('✅ [EARLY GEOLOCATION] Background geolocation completed during product selection');
    }).catch((error) => {
      console.warn('⚠️ [EARLY GEOLOCATION] Background geolocation failed (non-critical):', error);
    });

    // Auto-advance to color step after selection
    setTimeout(() => {
      if (currentStep.value === 1) {
        currentStep.value = 2;
      }
    }, 300);
  });

  const handleColorSelect = $((colorOption: ProductOption) => {
    selectedColor.value = colorOption;
    updateVariantSelection();

    // 🚀 EARLY INTENT DETECTION: Start geolocation when user shows purchase intent (fallback)
    console.log('🌍 [EARLY GEOLOCATION] Color selected - ensuring geolocation is ready...');
    loadCountryOnDemand(appState).then(() => {
      console.log('✅ [EARLY GEOLOCATION] Geolocation confirmed ready for checkout');
    }).catch((error) => {
      console.warn('⚠️ [EARLY GEOLOCATION] Geolocation check failed (non-critical):', error);
    });
  });

  const prevStep = $(() => {
    if (currentStep.value > 1) {
      currentStep.value--;
      // Reset color selection when going back to size step
      if (currentStep.value === 1) {
        selectedColor.value = null;
        selectedVariantId.value = '';
      }
    }
  });

  const handleStyleSelect = $((style: 'short' | 'long') => {
    selectedStyle.value = style;
    showBrandStory.value = false;
    
    // Reset subsequent selections when changing style
    selectedSize.value = null;
    selectedColor.value = null;
    selectedVariantId.value = '';
    
    // 🚀 PHASE 3: Load color thumbnails when style is selected
    const loadColorThumbnails = async () => {
      isLoadingStep.value = true;

      try {
        console.log(`🚀 [PHASE 3] Loading color thumbnails for ${style} sleeve...`);

        const slug = style === 'short' ? 'shortsleeveshirt' : 'longsleeveshirt';

        // Check if we already have the data from Phase 2 background loading
        const existingProduct = style === 'short' ? fullProductData.value.shortSleeve : fullProductData.value.longSleeve;

        if (existingProduct && existingProduct.variants && existingProduct.featuredAsset) {
          // We already have the data from background loading - use it immediately!
          console.log(`✅ [PHASE 3] Using background-loaded data for ${style} sleeve`);
          selectedProduct.value = existingProduct;
        } else {
          // Fallback: load color thumbnails if background loading didn't complete
          console.log(`🔄 [PHASE 3] Background loading incomplete, fetching color thumbnails...`);
          const colorData = await getColorThumbnails(slug);

          if (colorData) {
            // Update fullProductData with color thumbnail data
            if (style === 'short') {
              fullProductData.value = {
                ...fullProductData.value,
                shortSleeve: colorData
              };
            } else {
              fullProductData.value = {
                ...fullProductData.value,
                longSleeve: colorData
              };
            }

            selectedProduct.value = colorData;
          }
        }

        console.log(`✅ [PHASE 3] Style selection ready for ${style} sleeve`);

        // Smooth scroll to customization section after a brief delay (only for standalone context)
        if (props.context === 'standalone') {
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
        } else if (props.context === 'homepage' && props.scrollTarget) {
          // For homepage context, scroll to the specified target
          setTimeout(() => {
            const targetSection = document.getElementById(props.scrollTarget!);
            if (targetSection) {
              const rect = targetSection.getBoundingClientRect();
              const headerHeight = 64;
              const offset = 20;

              window.scrollTo({
                top: window.scrollY + rect.top - headerHeight - offset,
                behavior: 'smooth'
              });
            }
          }, 300);
        }
      } catch (error) {
        console.error(`❌ [PHASE 3] Failed to load color thumbnails for ${style}:`, error);
        // Show error to user
      } finally {
        isLoadingStep.value = false;
      }
    };
    
    // Load color thumbnails for selected style
    loadColorThumbnails();
  });

  // Add to cart functionality
  const handleAddToCart = $(async () => {
    const addToCartStartTime = performance.now();
    console.log('🚀 [ADD TO CART TIMING] Starting add to cart process...');

    if (!selectedVariantId.value || !selectedProduct.value || !selectedSize.value || !selectedColor.value) return;

    isAddingToCart.value = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Find the selected variant
      const itemCreationStart = performance.now();
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
      console.log(`⏱️ [ADD TO CART TIMING] Item creation: ${(performance.now() - itemCreationStart).toFixed(2)}ms`);

      // Add to cart using the correct function signature with timeout
      const addToCartStart = performance.now();
      const addToCartPromise = addToLocalCart(localCart, localCartItem);
      const abortPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Add to cart operation timed out'));
        });
      });

      await Promise.race([addToCartPromise, abortPromise]);
      console.log(`⏱️ [ADD TO CART TIMING] Add to local cart: ${(performance.now() - addToCartStart).toFixed(2)}ms`);

      // 🚀 GEOLOCATION: Should already be cached from product selection, but fallback just in case
      const geolocationStart = performance.now();
      if (!appState.shippingAddress.countryCode) {
        console.log('⚠️ [ADD TO CART TIMING] Geolocation not cached, running fallback...');
        loadCountryOnDemand(appState).then(() => {
          console.log(`⏱️ [ADD TO CART TIMING] Fallback geolocation: ${(performance.now() - geolocationStart).toFixed(2)}ms`);
        }).catch((error) => {
          console.warn('⚠️ [ADD TO CART TIMING] Fallback geolocation failed (non-critical):', error);
        });
      } else {
        console.log(`✅ [ADD TO CART TIMING] Geolocation already cached: ${appState.shippingAddress.countryCode}`);
      }
      console.log(`⏱️ [ADD TO CART TIMING] Geolocation check: ${(performance.now() - geolocationStart).toFixed(2)}ms`);

      // Trigger cart update event to refresh quantities
      const uiUpdateStart = performance.now();
      window.dispatchEvent(new CustomEvent('cart-updated'));

      // Show cart if successful
      if (!localCart.lastError) {
        appState.showCart = true;

        // 🚀 FRESH STOCK: Refresh stock levels when opening cart (in background)
        // Refresh stock levels in background without blocking UI
        if (localCart.localCart.items.length > 0) {
          const stockRefreshStart = performance.now();
          refreshCartStock(localCart).then(() => {
            console.log(`⏱️ [ADD TO CART TIMING] Background stock refresh: ${(performance.now() - stockRefreshStart).toFixed(2)}ms`);
            // Trigger cart update event to refresh UI with new stock levels
            window.dispatchEvent(new CustomEvent('cart-updated'));
          }).catch((error: Error) => {
            console.error('Background stock refresh failed:', error);
          });
        }
      }
      console.log(`⏱️ [ADD TO CART TIMING] UI updates: ${(performance.now() - uiUpdateStart).toFixed(2)}ms`);
      console.log(`✅ [ADD TO CART TIMING] TOTAL add to cart: ${(performance.now() - addToCartStartTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      console.log(`❌ [ADD TO CART TIMING] FAILED after: ${(performance.now() - addToCartStartTime).toFixed(2)}ms`);
      // Could add error notification here
    } finally {
      clearTimeout(timeoutId);
      isAddingToCart.value = false;
    }
  });

  // Watch for trigger signals and execute corresponding actions
  useVisibleTask$(({ track }) => {
    track(() => styleSelectTrigger.value);
    if (styleSelectTrigger.value) {
      handleStyleSelect(styleSelectTrigger.value);
      styleSelectTrigger.value = null; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => sizeSelectTrigger.value);
    if (sizeSelectTrigger.value) {
      handleSizeSelect(sizeSelectTrigger.value);
      sizeSelectTrigger.value = null; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => colorSelectTrigger.value);
    if (colorSelectTrigger.value) {
      handleColorSelect(colorSelectTrigger.value);
      colorSelectTrigger.value = null; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => prevStepTrigger.value);
    if (prevStepTrigger.value) {
      prevStep();
      prevStepTrigger.value = false; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => toggleSizeChartTrigger.value);
    if (toggleSizeChartTrigger.value) {
      showSizeChart.value = !showSizeChart.value;
      toggleSizeChartTrigger.value = false; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => imageSelectTrigger.value);
    if (imageSelectTrigger.value) {
      currentProductImage.value = imageSelectTrigger.value;
      imageSelectTrigger.value = null; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => touchStartTrigger.value);
    if (touchStartTrigger.value) {
      touchStartX.value = touchStartTrigger.value.clientX;
      touchEndX.value = null;
      touchStartTrigger.value = null; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => touchMoveTrigger.value);
    if (touchMoveTrigger.value && touchStartX.value !== null) {
      touchEndX.value = touchMoveTrigger.value.clientX;
      touchMoveTrigger.value = null; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => touchEndTrigger.value);
    if (touchEndTrigger.value) {
      // Handle touch end logic - swipe navigation
      if (touchStartX.value !== null && touchEndX.value !== null) {
        const diffX = touchStartX.value - touchEndX.value;
        const minSwipeDistance = 50;

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
                currentProductImage.value = allAssets[currentIndex + 1];
              } else if (diffX < 0 && currentIndex > 0) {
                currentProductImage.value = allAssets[currentIndex - 1];
              }
            }
          }
        }

        touchStartX.value = null;
        touchEndX.value = null;
      }
      touchEndTrigger.value = false; // Reset trigger
    }
  });

  useVisibleTask$(({ track }) => {
    track(() => addToCartTrigger.value);
    if (addToCartTrigger.value) {
      handleAddToCart();
      // Don't reset trigger here as it's a boolean toggle
    }
  });

  // Lazy load assets when selectedProduct changes OR when variant selection changes
  useVisibleTask$(({ track, cleanup }) => {
    track(() => selectedProduct.value);
    track(() => selectedVariantId.value); // Also track variant changes for color-specific images

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

          // Smart image selection based on variant selection
          let selectedImage = null;

          // If we have a selected variant (both size and color chosen), try to find variant-specific image
          if (selectedVariantId.value && selectedProduct.value.variants) {
            const selectedVariant = selectedProduct.value.variants.find(v => v.id === selectedVariantId.value);
            if (selectedVariant?.featuredAsset) {
              selectedImage = selectedVariant.featuredAsset;
              console.log('Using variant-specific featured image for selected color/size');
            }
          }

          // Fallback hierarchy: variant asset -> product featured asset -> first asset -> placeholder
          if (!selectedImage) {
            if (assets.featuredAsset) {
              selectedImage = assets.featuredAsset;
            } else if (assets.assets && assets.assets.length > 0) {
              selectedImage = assets.assets[0];
            } else {
              selectedImage = { id: 'placeholder', preview: '/asset_placeholder.webp' };
            }
          }

          currentProductImage.value = selectedImage;
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

  // 🚀 PHASE 2A removed - stock now loaded in Phase 1 (server-side) for instant button activation!

  // 🚀 PROGRESSIVE LOADING: Phase 2 - Load images 200ms later (can wait, doesn't block buttons)
  useVisibleTask$(async ({ cleanup }) => {
    console.log('🚀 [PHASE 2] Scheduling image loading...');

    const controller = new AbortController();

    // Wait 200ms before loading images (buttons already active with stock from Phase 1)
    setTimeout(async () => {
      if (controller.signal.aborted) return;

      try {
        console.log('🚀 [PHASE 2] Loading featured images...');

        const imageData = await getFeaturedImages();

        if (!controller.signal.aborted && imageData && fullProductData.value.shortSleeve) {
          console.log('✅ [PHASE 2] Images loaded - adding to product data');

          // Add images to existing product data
          fullProductData.value = {
            shortSleeve: {
              ...fullProductData.value.shortSleeve,
              featuredAsset: imageData.shortSleeve
            },
            longSleeve: {
              ...fullProductData.value.longSleeve,
              featuredAsset: imageData.longSleeve
            }
          };

          console.log('📊 [PHASE 2] Complete product data ready with images');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('❌ [PHASE 2] Image loading failed:', error);
        }
      }
    }, 200); // 200ms delay for images

    cleanup(() => {
      controller.abort();
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

        // Always in local cart mode
        if (localCart.hasLoadedOnce) {
          // Use loaded cart context data
          const result: Record<string, number> = {};
          allVariants.forEach((variantId) => {
            const localItem = localCart.localCart.items.find(
              (item: any) => item.productVariantId === variantId
            );
            result[variantId] = localItem?.quantity || 0;
          });
          quantitySignal.value = result;
        } else {
          // Use lightweight localStorage check (no context loading)
          quantitySignal.value = LocalCartService.getItemQuantitiesFromStorage(allVariants);
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
    <div class="shop-component">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
          }

          .animate-fade-in {
            animation: fadeIn 0.6s ease-out forwards;
          }

          .animate-slide-in-left {
            animation: slideInLeft 0.6s ease-out forwards;
          }
        `}
      </style>

      {/* Style Selection Section */}
      <StyleSelection
        stylesData={stylesData.value}
        fullProductData={fullProductData}
        selectedStyle={selectedStyle}
        isLoadingStep={isLoadingStep}
        styleSelectTrigger={styleSelectTrigger}
      />

      {/* Product Customization Section */}
      {!showBrandStory.value && selectedStyle.value && (
        <div id={props.context === 'standalone' ? 'customization-section' : props.scrollTarget} class="animate-fade-in">
          <SizeColorSelection
            selectedProduct={selectedProduct}
            selectedStyle={selectedStyle}
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            selectedVariantId={selectedVariantId}
            currentStep={currentStep}
            showSizeChart={showSizeChart}
            currentProductImage={currentProductImage}
            productAssets={productAssets}
            assetsLoading={assetsLoading}
            touchStartX={touchStartX}
            touchEndX={touchEndX}
            isAddingToCart={isAddingToCart}
            addToCartTrigger={addToCartTrigger}
            sizeSelectTrigger={sizeSelectTrigger}
            colorSelectTrigger={colorSelectTrigger}
            prevStepTrigger={prevStepTrigger}
            toggleSizeChartTrigger={toggleSizeChartTrigger}
            imageSelectTrigger={imageSelectTrigger}
            touchStartTrigger={touchStartTrigger}
            touchMoveTrigger={touchMoveTrigger}
            touchEndTrigger={touchEndTrigger}
          />
        </div>
      )}
    </div>
  );
});
