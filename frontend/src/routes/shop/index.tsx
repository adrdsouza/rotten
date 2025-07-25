import { component$, useSignal, useComputed$, $, useContext, useVisibleTask$ } from '@qwik.dev/core';
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

const checkProductAvailable = (product: Product | null) => {
  if (!product?.variants || !Array.isArray(product.variants)) return false;

  return product.variants.some(variant => {
    // Defensive checks for variant data
    if (!variant || typeof variant !== 'object') return false;

    const stockLevel = parseInt(String(variant.stockLevel || '0'));
    const trackInventory = variant.trackInventory;

    // Variant is available if: stockLevel > 0 OR inventory tracking is disabled
    // If trackInventory is 'FALSE', the variant is always available regardless of stockLevel
    const isAvailable = stockLevel > 0 || trackInventory === 'FALSE';

    return isAvailable;
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
              class="w-full bg-[#B09983] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4F3B26] transition-colors"
            >
              Refresh Page
            </button>

            <Link
              href="/"
              class="block text-[#B09983] hover:text-[#4F3B26] font-medium"
            >
              ← Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Customization flow state
  const currentStep = useSignal<'sleeve' | 'size' | 'color' | 'complete'>('sleeve');
  const selectedProduct = useSignal<Product | null>(null);
  const selectedSize = useSignal<ProductOption | null>(null);
  const selectedColor = useSignal<ProductOption | null>(null);
  const selectedVariantId = useSignal<string>('');
  const isAddingToCart = useSignal(false);

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


  // Handle step navigation
  const handleSleeveSelect = $((product: Product) => {
    // Check if product has any available variants (inline check with defensive programming)
    const hasAvailableVariants = product?.variants && Array.isArray(product.variants) &&
      product.variants.some(variant => {
        if (!variant || typeof variant !== 'object') return false;
        const stockLevel = parseInt(String(variant.stockLevel || '0'));
        const trackInventory = variant.trackInventory;
        return stockLevel > 0 || trackInventory === 'FALSE';
      });

    // Only allow selection if product has available variants
    if (!hasAvailableVariants) {
      return;
    }

    selectedProduct.value = product;
    selectedSize.value = null;
    selectedColor.value = null;
    selectedVariantId.value = '';
    currentStep.value = 'size';
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
    currentStep.value = 'color';
    updateVariantSelection();
  });

  const handleColorSelect = $((colorOption: ProductOption) => {
    if (!checkColorAvailable(colorOption, selectedSize.value, selectedProduct.value)) return;
    selectedColor.value = colorOption;
    updateVariantSelection();
    currentStep.value = 'complete';
  });

  const handleBackStep = $(() => {
    if (currentStep.value === 'complete') {
      currentStep.value = 'color';
    } else if (currentStep.value === 'color') {
      currentStep.value = 'size';
    } else if (currentStep.value === 'size') {
      currentStep.value = 'sleeve';
    }
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



  // Get current product image
  const currentProductImage = useComputed$(() => {
    if (!selectedProduct.value) return null;
    return selectedProduct.value.featuredAsset ||
           (selectedProduct.value.assets?.length > 0 ? selectedProduct.value.assets[0] : null);
  });

  // Get current variant quantity in cart
  const currentVariantQuantity = useComputed$(() => {
    if (!selectedVariantId.value) return 0;
    return quantitySignal.value[selectedVariantId.value] || 0;
  });

  // Smart button text based on cart quantity
  const buttonText = useComputed$(() => {
    const quantity = currentVariantQuantity.value;
    if (quantity > 0) {
      return `${quantity} in cart - Add more`;
    }
    return 'Claim Your Perfect Shirt';
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
      {/* Progress Indicator */}
      <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div class="max-w-4xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              {currentStep.value !== 'sleeve' && (
                <button
                  onClick$={handleBackStep}
                  class="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div class="flex items-center space-x-2">
              <div class={`w-2 h-2 rounded-full transition-colors ${currentStep.value === 'sleeve' ? 'bg-[#B09983]' : 'bg-gray-300'}`}></div>
              <div class={`w-2 h-2 rounded-full transition-colors ${currentStep.value === 'size' ? 'bg-[#B09983]' : 'bg-gray-300'}`}></div>
              <div class={`w-2 h-2 rounded-full transition-colors ${currentStep.value === 'color' ? 'bg-[#B09983]' : 'bg-gray-300'}`}></div>
              <div class={`w-2 h-2 rounded-full transition-colors ${currentStep.value === 'complete' ? 'bg-[#B09983]' : 'bg-gray-300'}`}></div>
            </div>

            <div class="w-16"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Product Image */}
          <div class="order-2 lg:order-1">
            <div class="sticky top-24">
              {currentProductImage.value ? (
                <OptimizedImage
                  src={currentProductImage.value.preview}
                  alt={selectedProduct.value?.name || 'Product'}
                  width={600}
                  height={600}
                  class="w-full h-auto rounded-lg shadow-lg"
                />
              ) : (
                <div class="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <span class="text-gray-400 text-lg">Select your style</span>
                </div>
              )}
            </div>
          </div>

          {/* Customization Steps */}
          <div class="order-1 lg:order-2">

            {/* Step 1: Choose Sleeve Length */}
            {currentStep.value === 'sleeve' && (
              <div class="space-y-6">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900 mb-2">Build Your Perfect Shirt</h1>
                  <p class="text-lg text-gray-600">One shirt, perfected. Now make it yours.</p>
                  <p class="text-sm text-[#B09983] font-medium mt-2">If it's not the softest shirt you've ever felt, we'll pay you back</p>
                </div>

                <div>
                  <h2 class="text-xl font-semibold text-gray-900 mb-4">Choose Your Style</h2>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Short Sleeve Option */}
                    {productsData.value.shortSleeve && (
                      <div class="relative">
                        <button
                          onClick$={() => handleSleeveSelect(productsData.value.shortSleeve!)}
                          disabled={!checkProductAvailable(productsData.value.shortSleeve)}
                          class={{
                            'p-6 border-2 rounded-lg transition-all duration-200 text-left group w-full': true,
                            'border-gray-200 hover:border-[#B09983]': checkProductAvailable(productsData.value.shortSleeve),
                            'border-gray-100 cursor-not-allowed opacity-50': !checkProductAvailable(productsData.value.shortSleeve),
                          }}
                        >
                          <div class="text-center">
                            <h3 class={{
                              'text-lg font-semibold mb-2': true,
                              'text-gray-900': checkProductAvailable(productsData.value.shortSleeve),
                              'text-gray-400': !checkProductAvailable(productsData.value.shortSleeve),
                            }}>Short Sleeve</h3>
                            <Price
                              priceWithTax={productsData.value.shortSleeve.variants[0]?.priceWithTax || 0}
                              currencyCode={productsData.value.shortSleeve.variants[0]?.currencyCode || 'USD'}
                              forcedClass={checkProductAvailable(productsData.value.shortSleeve)
                                ? "text-xl font-bold text-[#B09983]"
                                : "text-xl font-bold text-gray-400"}
                            />
                            <p class={{
                              'text-sm mt-2': true,
                              'text-gray-600': checkProductAvailable(productsData.value.shortSleeve),
                              'text-gray-400': !checkProductAvailable(productsData.value.shortSleeve),
                            }}>Summer confidence</p>
                          </div>
                        </button>

                        {/* Sold Out Badge */}
                        {!checkProductAvailable(productsData.value.shortSleeve) && (
                          <div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#B09983] antialiased">
                            Sold Out
                          </div>
                        )}
                      </div>
                    )}

                    {/* Long Sleeve Option */}
                    {productsData.value.longSleeve && (
                      <div class="relative">
                        <button
                          onClick$={() => handleSleeveSelect(productsData.value.longSleeve!)}
                          disabled={!checkProductAvailable(productsData.value.longSleeve)}
                          class={{
                            'p-6 border-2 rounded-lg transition-all duration-200 text-left group w-full': true,
                            'border-gray-200 hover:border-[#B09983]': checkProductAvailable(productsData.value.longSleeve),
                            'border-gray-100 cursor-not-allowed opacity-50': !checkProductAvailable(productsData.value.longSleeve),
                          }}
                        >
                          <div class="text-center">
                            <h3 class={{
                              'text-lg font-semibold mb-2': true,
                              'text-gray-900': checkProductAvailable(productsData.value.longSleeve),
                              'text-gray-400': !checkProductAvailable(productsData.value.longSleeve),
                            }}>Long Sleeve</h3>
                            <Price
                              priceWithTax={productsData.value.longSleeve.variants[0]?.priceWithTax || 0}
                              currencyCode={productsData.value.longSleeve.variants[0]?.currencyCode || 'USD'}
                              forcedClass={checkProductAvailable(productsData.value.longSleeve)
                                ? "text-xl font-bold text-[#B09983]"
                                : "text-xl font-bold text-gray-400"}
                            />
                            <p class={{
                              'text-sm mt-2': true,
                              'text-gray-600': checkProductAvailable(productsData.value.longSleeve),
                              'text-gray-400': !checkProductAvailable(productsData.value.longSleeve),
                            }}>Year-round essential</p>
                          </div>
                        </button>

                        {/* Sold Out Badge */}
                        {!checkProductAvailable(productsData.value.longSleeve) && (
                          <div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#B09983] antialiased">
                            Sold Out
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Step 2: Choose Size */}
            {currentStep.value === 'size' && selectedProduct.value && (
              <div class="space-y-6">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Fit</h1>
                  <p class="text-lg text-gray-600">Tested on 200+ people until perfect</p>
                </div>

                <div>
                  <h2 class="text-xl font-semibold text-gray-900 mb-4">Size</h2>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getAvailableOptions(selectedProduct.value).sizes.map((sizeOption) => {
                      const isAvailable = checkSizeAvailable(sizeOption, selectedProduct.value);
                      return (
                        <button
                          key={sizeOption.id}
                          onClick$={() => handleSizeSelect(sizeOption)}
                          disabled={!isAvailable}
                          class={{
                            'px-4 py-3 text-center border-2 rounded-lg transition-all duration-200 font-medium': true,
                            'border-gray-200 hover:border-[#B09983]': isAvailable,
                            'border-gray-100 text-gray-400 cursor-not-allowed': !isAvailable,
                          }}
                        >
                          {sizeOption.name}
                        </button>
                      );
                    })}
                  </div>

                  <div class="mt-4">
                    <button class="text-sm text-[#B09983] hover:text-[#4F3B26] font-medium">
                      Size Chart →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Choose Color */}
            {currentStep.value === 'color' && selectedProduct.value && selectedSize.value && (
              <div class="space-y-6">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900 mb-2">Make It Yours</h1>
                  <p class="text-lg text-gray-600">Each color tells your story</p>
                </div>

                <div>
                  <h2 class="text-xl font-semibold text-gray-900 mb-4">Color</h2>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getAvailableOptions(selectedProduct.value).colors.map((colorOption) => {
                      const isAvailable = checkColorAvailable(colorOption, selectedSize.value, selectedProduct.value);
                      return (
                        <button
                          key={colorOption.id}
                          onClick$={() => handleColorSelect(colorOption)}
                          disabled={!isAvailable}
                          class={{
                            'px-4 py-3 text-center border-2 rounded-lg transition-all duration-200 font-medium': true,
                            'border-gray-200 hover:border-[#B09983]': isAvailable,
                            'border-gray-100 text-gray-400 cursor-not-allowed': !isAvailable,
                          }}
                        >
                          {colorOption.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {/* Step 4: Complete - Add to Cart */}
            {currentStep.value === 'complete' && selectedProduct.value && selectedSize.value && selectedColor.value && (
              <div class="space-y-6">
                <div>
                  <h1 class="text-3xl font-bold text-gray-900 mb-2">Your Perfect Shirt</h1>
                  <p class="text-lg text-gray-600">Ready to experience the softest shirt you've ever felt?</p>
                </div>

                {/* Selection Summary */}
                <div class="bg-gray-50 rounded-lg p-6">
                  <h3 class="font-semibold text-gray-900 mb-4">Your Selection</h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-600">Style:</span>
                      <span class="font-medium">{selectedProduct.value.name}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Size:</span>
                      <span class="font-medium">{selectedSize.value.name}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-600">Color:</span>
                      <span class="font-medium">{selectedColor.value.name}</span>
                    </div>
                    <div class="border-t border-gray-200 pt-2 mt-4">
                      <div class="flex justify-between">
                        <span class="font-semibold">Total:</span>
                        <Price
                          priceWithTax={selectedProduct.value.variants[0]?.priceWithTax || 0}
                          currencyCode={selectedProduct.value.variants[0]?.currencyCode || 'USD'}
                          forcedClass="font-bold text-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guarantee Reminder */}
                <div class="bg-[#B09983]/10 border border-[#B09983]/20 rounded-lg p-4">
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-[#B09983] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    <div>
                      <p class="text-sm font-medium text-gray-900">Our Money Back Guarantee</p>
                      <p class="text-sm text-gray-600">If this isn't the softest shirt you've ever felt, send it back within 30 days. We'll refund your money and pay return shipping.</p>
                    </div>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick$={handleAddToCart}
                  disabled={isAddingToCart.value || !selectedVariantId.value}
                  class={{
                    'w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200': true,
                    'bg-[#B09983] text-white hover:bg-[#4F3B26] hover:scale-105 shadow-lg hover:shadow-xl': !isAddingToCart.value && selectedVariantId.value,
                    'bg-gray-300 text-gray-500 cursor-not-allowed': isAddingToCart.value || !selectedVariantId.value,
                  }}
                >
                  {isAddingToCart.value ? (
                    <span class="flex items-center justify-center">
                      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding to Cart...
                    </span>
                  ) : currentVariantQuantity.value > 0 ? (
                    <span class="flex items-center justify-center">
                      <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      {buttonText.value}
                    </span>
                  ) : (
                    buttonText.value
                  )}
                </button>

                {/* Continue Shopping */}
                <div class="text-center">
                  <Link
                    href="/"
                    class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ← Continue Shopping
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
});

export const head = () => {
  return createSEOHead({
    title: 'Build Your Perfect Shirt - Rotten Hand',
    description: 'One shirt, 18 options. Choose your style, size, and color to build the perfect shirt. Ethically made with our money-back guarantee.',
    noindex: false,
  });
};
