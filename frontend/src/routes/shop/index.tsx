import { component$, useSignal, $, useContext, useVisibleTask$ } from '@qwik.dev/core';
import { routeLoader$, Link } from '@qwik.dev/router';
import { OptimizedImage } from '~/components/ui';
import Price from '~/components/products/Price';
import { getProductBySlug } from '~/providers/shop/products/products';
import { Product, ProductOption } from '~/types';
import { createSEOHead } from '~/utils/seo';
import { useLocalCart, addToLocalCart } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';
import { loadCountryOnDemand } from '~/utils/addressStorage';
import { LocalCartService } from '~/services/LocalCartService';
import ShopImageUrl from '~/media/shop.jpg?url';


// Helper functions moved outside component to avoid lexical scope issues
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

const checkSizeAvailable = (sizeOption: ProductOption, product: Product | null) => {
  if (!product?.variants || !Array.isArray(product.variants)) return false;
  if (!sizeOption?.id) return false;

  return product.variants.some(variant => {
    if (!variant || !variant.options || !Array.isArray(variant.options)) return false;
    const hasThisSize = variant.options.some(opt => opt?.id === sizeOption.id);

    if (!hasThisSize) return false;

    // Check if variant is in stock: either has inventory OR tracking is disabled
    const stockLevel = parseInt(String(variant.stockLevel || '0'));
    const trackInventory = variant.trackInventory;

    // In stock if: has stock > 0 OR inventory tracking is disabled for this variant
    const isInStock = stockLevel > 0 || trackInventory === 'FALSE';

    return isInStock;
  });
};

const checkColorAvailable = (colorOption: ProductOption, selectedSize: ProductOption | null, product: Product | null) => {
  if (!selectedSize?.id || !product?.variants || !colorOption?.id) return false;
  if (!Array.isArray(product.variants)) return false;

  return product.variants.some(variant => {
    if (!variant || !variant.options || !Array.isArray(variant.options)) return false;
    const hasSelectedSize = variant.options.some(opt => opt?.id === selectedSize.id);
    const hasThisColor = variant.options.some(opt => opt?.id === colorOption.id);

    // Check if this variant has the right size/color combination
    if (!hasSelectedSize || !hasThisColor) return false;

    // Check if variant is in stock: either has inventory OR tracking is disabled
    const stockLevel = parseInt(String(variant.stockLevel || '0'));
    const trackInventory = variant.trackInventory;

    // In stock if: has stock > 0 OR inventory tracking is disabled for this variant
    // trackInventory can be 'FALSE', 'TRUE', or 'INHERIT' (inherits from global/channel settings)
    const isInStock = stockLevel > 0 || trackInventory === 'FALSE';

    return isInStock;
  });
};



// Load both shirt products for the customization experience
export const useShirtProductsLoader = routeLoader$(async () => {
  try {
    console.log('Loading shirt products...');

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Product loading timeout')), 10000)
    );

    // Load both shirt products using actual slugs from database
    const productPromises = Promise.all([
      getProductBySlug('shortsleeveshirt').catch(err => {
        console.error('Failed to load short sleeve product:', err);
        return null;
      }),
      getProductBySlug('longsleeveshirt').catch(err => {
        console.error('Failed to load long sleeve product:', err);
        return null;
      })
    ]);

    const [shortSleeveProduct, longSleeveProduct] = await Promise.race([
      productPromises,
      timeoutPromise
    ]) as [any, any];

    console.log('Products loaded:', {
      shortSleeve: !!shortSleeveProduct,
      longSleeve: !!longSleeveProduct
    });

    // Ensure we always return a valid structure
    return {
      shortSleeve: shortSleeveProduct || null,
      longSleeve: longSleeveProduct || null
    };
  } catch (error) {
    console.error('Failed to load shirt products:', error);
    // Always return a valid structure even on error
    return {
      shortSleeve: null,
      longSleeve: null
    };
  }
});

export default component$(() => {
  const productsData = useShirtProductsLoader();
  const localCart = useLocalCart();
  const appState = useContext(APP_STATE);

  // Show fallback if products failed to load
  if (!productsData.value.shortSleeve && !productsData.value.longSleeve) {
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
              class="w-full bg-[#ddd7c0] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4F3B26] transition-colors"
            >
              Refresh Page
            </button>

            <Link
              href="/"
              class="block text-[#ddd7c0] hover:text-[#4F3B26] font-medium"
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

  // New selector state
  const selectedStyle = useSignal<'short' | 'long' | null>(null);

  // Cart quantity tracking for all variants
  const quantitySignal = useSignal<Record<string, number>>({});



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
    // Only allow selection if size is available
    if (!checkSizeAvailable(sizeOption, selectedProduct.value)) {
      return;
    }

    selectedSize.value = sizeOption;
    // Reset color if it's no longer available with new size
    if (selectedColor.value && !checkColorAvailable(selectedColor.value, sizeOption, selectedProduct.value)) {
      selectedColor.value = null;
    }
    updateVariantSelection();
    // No need to change currentStep since all options are visible
  });

  const handleColorSelect = $((colorOption: ProductOption) => {
    if (!checkColorAvailable(colorOption, selectedSize.value, selectedProduct.value)) return;
    selectedColor.value = colorOption;
    updateVariantSelection();
    // No need to change currentStep since all options are visible
  });



  // Add to cart functionality
  const handleAddToCart = $(async () => {
    if (!selectedVariantId.value || !selectedProduct.value || !selectedSize.value || !selectedColor.value) return;

    isAddingToCart.value = true;
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

      // Add to cart using the correct function signature
      await addToLocalCart(localCart, localCartItem);

      // 🚀 DEMAND-BASED GEOLOCATION: Load country when user shows purchase intent
      await loadCountryOnDemand(appState);

      // Trigger cart update event to refresh quantities
      window.dispatchEvent(new CustomEvent('cart-updated'));

      // Show cart if successful
      if (!localCart.lastError) {
        appState.showCart = true;
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      // Could add error notification here
    } finally {
      isAddingToCart.value = false;
    }
  });



  // Get current product image - using signal instead of computed for better reactivity
  const currentProductImage = useSignal<any>(null);

  // Update current product image when selectedProduct changes
  useVisibleTask$(({ track }) => {
    track(() => selectedProduct.value);
    if (selectedProduct.value) {
      // Prioritize featuredAsset, then first asset, then placeholder
      if (selectedProduct.value.featuredAsset) {
        currentProductImage.value = selectedProduct.value.featuredAsset;
      } else if (selectedProduct.value.assets && selectedProduct.value.assets.length > 0) {
        currentProductImage.value = selectedProduct.value.assets[0];
      } else {
        currentProductImage.value = { id: 'placeholder', preview: '/asset_placeholder.webp' };
      }
    }
  });





  // Load cart quantities for all variants when products are available
  useVisibleTask$(() => {
    const loadQuantities = () => {
      const allVariants: string[] = [];

      // Collect all variant IDs from both products
      if (productsData.value.shortSleeve?.variants && Array.isArray(productsData.value.shortSleeve.variants)) {
        allVariants.push(...productsData.value.shortSleeve.variants.map((v: any) => v.id).filter(Boolean));
      }
      if (productsData.value.longSleeve?.variants && Array.isArray(productsData.value.longSleeve.variants)) {
        allVariants.push(...productsData.value.longSleeve.variants.map((v: any) => v.id).filter(Boolean));
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
  });

  return (
    <div class="min-h-screen bg-gray-50">

      {/* Main Content */}
      <div class="max-w-content-wide mx-auto px-8 sm:px-12 lg:px-16 pb-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Product Image */}
          <div class="order-1 lg:order-1 pt-6">
            <div class="sticky top-24">
              <div class="flex gap-4">
                {/* Thumbnail Images - Left Side - Always show to prevent layout shift */}
                <div class="flex flex-col gap-2 w-[22%] max-w-[180px] min-w-[80px]">
                  {selectedProduct.value ? (
                    (() => {
                      // Create a combined array of all available assets
                      const allAssets = [];

                      // Add featured asset first if it exists
                      if (selectedProduct.value.featuredAsset) {
                        allAssets.push(selectedProduct.value.featuredAsset);
                      }

                      // Add other assets, avoiding duplicates
                      if (selectedProduct.value?.assets && selectedProduct.value.assets.length > 0) {
                        selectedProduct.value.assets.forEach((asset: any) => {
                          if (!selectedProduct.value?.featuredAsset || asset.id !== selectedProduct.value.featuredAsset.id) {
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
                            'border-black scale-105': currentProductImage.value?.id === asset.id,
                            'border-gray-200': currentProductImage.value?.id !== asset.id,
                          }}
                          onClick$={() => {
                            currentProductImage.value = asset;
                          }}
                        >
                          <OptimizedImage
                            src={asset.preview}
                            class="w-full h-full object-cover transition-all duration-200 hover:opacity-80"
                            width={360}
                            height={450}
                            responsive="thumbnail"
                            alt={`Thumbnail ${index + 1} of ${selectedProduct.value?.name || 'Product'}`}
                            loading="lazy"
                          />
                        </div>
                      ));
                    })()
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

                {/* Main Image */}
                <div class="flex-1">
                  {selectedProduct.value ? (
                    <OptimizedImage
                      key={selectedProduct.value?.id || 'no-product'}
                      src={currentProductImage.value?.preview || selectedProduct.value.featuredAsset?.preview || '/asset_placeholder.webp'}
                      alt={selectedProduct.value?.name || 'Product'}
                      width={600}
                      height={750}
                      class="w-full h-auto rounded-lg shadow-lg aspect-4/5 object-cover"
                      responsive="productMain"
                    />
                  ) : (
                    <OptimizedImage
                      key="shop-default"
                      src={ShopImageUrl}
                      alt="Choose your perfect shirt style"
                      width={600}
                      height={750}
                      class="w-full h-auto rounded-lg shadow-lg aspect-4/5 object-cover"
                      responsive="productMain"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customization Steps */}
          <div class="order-2 lg:order-2 lg:pt-8 pt-6">

            {/* New Product Selector */}
            <div class="bg-[#f5f5f5] rounded-2xl px-8 pb-8 pt-4 shadow-lg">

              {/* Sizing Note */}
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2 text-sm text-gray-600 text-center">
                💡 These shirts are designed with an oversized, relaxed fit for comfort and style
              </div>

              {/* Style Selection */}
              <div class={{
                'p-3 rounded-t-lg border-2 transition-all duration-300': true,
                'border-[#ddd7c0] bg-[#ddd7c0]/5': !selectedStyle.value, // Active when no style selected
                'border-gray-200 bg-gray-50': selectedStyle.value // Completed state
              }}>
                <div class={{
                  'flex items-center justify-center gap-2 mb-3 text-lg font-semibold transition-colors duration-300': true,
                  'text-[#ddd7c0]': !selectedStyle.value, // Active styling
                  'text-gray-600': selectedStyle.value // Completed styling
                }}>
                  <span class="text-xl">👕</span>
                  <span>Style</span>
                  {selectedStyle.value && <span class="text-green-600 ml-2">✓</span>}
                </div>
                <div class="flex gap-3">
                  {productsData.value.shortSleeve && (
                    <div
                      class={{
                        'flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 text-center bg-white': true,
                        'border-[#ddd7c0] bg-gray-50': selectedStyle.value === 'short',
                        'border-gray-200 hover:border-[#ddd7c0]': selectedStyle.value !== 'short'
                      }}
                      onClick$={() => {
                        selectedStyle.value = 'short';
                        selectedProduct.value = productsData.value.shortSleeve;
                      }}
                    >
                      <div class="font-semibold text-base mb-1">Short Sleeve</div>
                      <Price
                        priceWithTax={productsData.value.shortSleeve.variants[0]?.priceWithTax || 0}
                        currencyCode={productsData.value.shortSleeve.variants[0]?.currencyCode || 'USD'}
                        forcedClass="text-xl font-bold text-black mb-1"
                      />
                      <div class="text-gray-600 text-xs">Summer confidence</div>
                    </div>
                  )}
                  {productsData.value.longSleeve && (
                    <div
                      class={{
                        'flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 text-center bg-white': true,
                        'border-[#ddd7c0] bg-gray-50': selectedStyle.value === 'long',
                        'border-gray-200 hover:border-[#ddd7c0]': selectedStyle.value !== 'long'
                      }}
                      onClick$={() => {
                        selectedStyle.value = 'long';
                        selectedProduct.value = productsData.value.longSleeve;
                      }}
                    >
                      <div class="font-semibold text-base mb-1">Long Sleeve</div>
                      <Price
                        priceWithTax={productsData.value.longSleeve.variants[0]?.priceWithTax || 0}
                        currencyCode={productsData.value.longSleeve.variants[0]?.currencyCode || 'USD'}
                        forcedClass="text-xl font-bold text-black mb-1"
                      />
                      <div class="text-gray-600 text-xs">Year-round essential</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Size Selection */}
              <div class={{
                'p-3 border-2 transition-all duration-300': true,
                'border-t-0': !(selectedStyle.value && !selectedSize.value), // Remove top border unless active
                'border-[#ddd7c0] bg-[#ddd7c0]/5': selectedStyle.value && !selectedSize.value, // Active when style selected but no size
                'border-gray-200 bg-gray-50': !!selectedSize.value, // Completed state
                'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed': !selectedStyle.value // Inactive state
              }}>
                <div class={{
                  'flex items-center justify-center gap-2 mb-3 text-lg font-semibold transition-colors duration-300': true,
                  'text-[#ddd7c0]': selectedStyle.value && !selectedSize.value, // Active styling
                  'text-gray-600': !!selectedSize.value, // Completed styling
                  'text-gray-400': !selectedStyle.value // Inactive styling
                }}>
                  <span class="text-xl">📏</span>
                  <span>Size</span>
                  {selectedSize.value && <span class="text-green-600 ml-2">✓</span>}
                </div>
                <div class="flex gap-3">
                  {selectedProduct.value ? (
                    getAvailableOptions(selectedProduct.value).sizes.map((sizeOption) => {
                      const isSelected = selectedSize.value?.id === sizeOption.id;
                      const isAvailable = checkSizeAvailable(sizeOption, selectedProduct.value);

                      return (
                        <div
                          key={sizeOption.id}
                          class={{
                            'flex-1 p-3 border-2 rounded-lg transition-all duration-200 text-center bg-white': true,
                            'border-[#ddd7c0] bg-gray-50 cursor-pointer': isSelected,
                            'border-gray-200 hover:border-[#ddd7c0] cursor-pointer': !isSelected && isAvailable,
                            'border-gray-200 cursor-not-allowed opacity-50': !isAvailable
                          }}
                          onClick$={() => {
                            if (isAvailable) {
                              handleSizeSelect(sizeOption);
                            }
                          }}
                        >
                          <div class="font-semibold text-base mb-1">{sizeOption.name}</div>
                          <div class="text-gray-600 text-xs leading-tight">
                            Chest: 52"<br/>Length: 29"
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    ['Small', 'Medium', 'Large'].map((size) => (
                      <div
                        key={size}
                        class="flex-1 p-3 border-2 border-gray-200 rounded-lg text-center cursor-not-allowed opacity-50 bg-white"
                      >
                        <div class="font-semibold text-base mb-1">{size}</div>
                        <div class="text-gray-600 text-xs leading-tight">
                          Select style first
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div class="text-center mt-4">
                  <a href="#" class="text-sm text-[#ddd7c0] hover:underline">View detailed size chart</a>
                </div>
              </div>

              {/* Color Selection */}
              <div class={{
                'p-3 border-2 transition-all duration-300': true,
                'border-t-0': !(selectedSize.value && !selectedColor.value), // Remove top border unless active
                'border-[#ddd7c0] bg-[#ddd7c0]/5': selectedSize.value && !selectedColor.value, // Active when size selected but no color
                'border-gray-200 bg-gray-50': !!selectedColor.value, // Completed state
                'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed': !selectedSize.value // Inactive state
              }}>
                <div class={{
                  'flex items-center justify-center gap-2 mb-3 text-lg font-semibold transition-colors duration-300': true,
                  'text-[#ddd7c0]': selectedSize.value && !selectedColor.value, // Active styling
                  'text-gray-600': !!selectedColor.value, // Completed styling
                  'text-gray-400': !selectedSize.value // Inactive styling
                }}>
                  <span class="text-xl">🎨</span>
                  <span>Color</span>
                  {selectedColor.value && <span class="text-green-600 ml-2">✓</span>}
                </div>
                <div class="grid grid-cols-3 gap-2">
                  {selectedProduct.value ? (
                    getAvailableOptions(selectedProduct.value).colors.map((colorOption) => {
                      const isSelected = selectedColor.value?.id === colorOption.id;
                      const isAvailable = selectedSize.value ? checkColorAvailable(colorOption, selectedSize.value, selectedProduct.value) : false;

                      // Map color names to background styles
                      const getColorStyle = (name: string) => {
                        const colorName = name.toLowerCase();
                        if (colorName.includes('black') || colorName.includes('midnight')) return 'bg-black text-white';
                        if (colorName.includes('white') || colorName.includes('cloud')) return 'bg-gray-100 text-gray-800 border-gray-300';
                        if (colorName.includes('grey') || colorName.includes('gray') || colorName.includes('storm')) return 'bg-gray-500 text-white';
                        if (colorName.includes('purple') || colorName.includes('deep')) return 'bg-purple-600 text-white';
                        if (colorName.includes('red') || colorName.includes('blood')) return 'bg-red-600 text-white';
                        if (colorName.includes('blue') || colorName.includes('electric')) return 'bg-blue-600 text-white';
                        if (colorName.includes('pink') || colorName.includes('hot')) return 'bg-pink-500 text-white';
                        if (colorName.includes('yellow') || colorName.includes('desert')) return 'bg-yellow-400 text-gray-800';
                        if (colorName.includes('green') || colorName.includes('forest')) return 'bg-green-600 text-white';
                        return 'bg-gray-200 text-gray-800';
                      };

                      return (
                        <div
                          key={colorOption.id}
                          class={{
                            [`p-3 border-2 rounded-lg transition-all duration-200 text-center text-xs font-semibold ${getColorStyle(colorOption.name)}`]: true,
                            'border-[#ddd7c0] border-4 cursor-pointer': isSelected,
                            'border-gray-300 hover:border-[#ddd7c0] hover:-translate-y-0.5 cursor-pointer': !isSelected && isAvailable,
                            'cursor-not-allowed opacity-30': !isAvailable
                          }}
                          onClick$={() => {
                            if (isAvailable) {
                              handleColorSelect(colorOption);
                            }
                          }}
                        >
                          {colorOption.name}
                        </div>
                      );
                    })
                  ) : (
                    ['Midnight black', 'Cloud white', 'Storm grey', 'Deep purple', 'Blood red', 'Electric blue', 'Hot pink', 'Desert yellow', 'Forest green'].map((color) => (
                      <div
                        key={color}
                        class="p-3 border-2 border-gray-200 rounded-lg text-center text-xs font-semibold cursor-not-allowed opacity-30 bg-white text-gray-400"
                      >
                        {color}
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Selection Summary */}
              <div class="bg-black text-white p-4 rounded-b-xl border-t-0">
                <div class="grid grid-cols-3 gap-4 mb-4">
                  <div class="text-center">
                    <div class="text-sm opacity-80 mb-1">Style</div>
                    <div class="font-semibold">{selectedProduct.value?.name?.replace(' Shirt', '') || '—'}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-sm opacity-80 mb-1">Size</div>
                    <div class="font-semibold">{selectedSize.value?.name || '—'}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-sm opacity-80 mb-1">Color</div>
                    <div class="font-semibold">{selectedColor.value?.name || '—'}</div>
                  </div>
                </div>
                <button
                  onClick$={handleAddToCart}
                  disabled={isAddingToCart.value || !selectedVariantId.value}
                  class={{
                    'w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200': true,
                    'bg-[#ddd7c0] text-white hover:bg-[#4F3B26] cursor-pointer': !isAddingToCart.value && selectedVariantId.value,
                    'bg-[#ddd7c0] text-white cursor-not-allowed': isAddingToCart.value || !selectedVariantId.value,
                  }}
                >
                  {isAddingToCart.value ? (
                    <span class="flex items-center justify-center">
                      <div class="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding to Cart...
                    </span>
                  ) : !selectedStyle.value ? (
                    'Select style'
                  ) : !selectedSize.value ? (
                    'Select size'
                  ) : !selectedColor.value ? (
                    'Select color'
                  ) : selectedProduct.value ? (
                    <span class="flex items-center justify-center">
                      Add to Cart - <Price
                        priceWithTax={selectedProduct.value.variants[0]?.priceWithTax || 0}
                        currencyCode={selectedProduct.value.variants[0]?.currencyCode || 'USD'}
                        forcedClass="ml-1 font-bold"
                      />
                    </span>
                  ) : (
                    'Select style'
                  )}
                </button>
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
