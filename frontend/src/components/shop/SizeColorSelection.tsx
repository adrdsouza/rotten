import { component$, Signal, useComputed$ } from '@qwik.dev/core';
import { OptimizedImage } from '~/components/ui';
import Price from '~/components/products/Price';
import { Product, ProductOption } from '~/types';
import { AddToCartFlow } from './AddToCartFlow';

export interface SizeColorSelectionProps {
  selectedProduct: Signal<Product | null>;
  selectedStyle: Signal<'short' | 'long' | null>;
  selectedSize: Signal<ProductOption | null>;
  selectedColor: Signal<ProductOption | null>;
  selectedVariantId: Signal<string>;
  currentStep: Signal<number>;
  showSizeChart: Signal<boolean>;
  currentProductImage: Signal<any>;
  productAssets: Signal<any>;
  assetsLoading: Signal<boolean>;
  touchStartX: Signal<number | null>;
  touchEndX: Signal<number | null>;
  isAddingToCart: Signal<boolean>;
  addToCartTrigger: Signal<boolean>;
  // Action triggers using signals instead of function props
  sizeSelectTrigger: Signal<ProductOption | null>;
  colorSelectTrigger: Signal<ProductOption | null>;
  prevStepTrigger: Signal<boolean>;
  toggleSizeChartTrigger: Signal<boolean>;
  imageSelectTrigger: Signal<any>;
  touchStartTrigger: Signal<{ clientX: number; clientY: number } | null>;
  touchMoveTrigger: Signal<{ clientX: number; clientY: number } | null>;
  touchEndTrigger: Signal<boolean>;
}

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

// 🚀 PERFORMANCE OPTIMIZED: Fast availability checks using pre-computed map
const checkSizeAvailable = (sizeOption: ProductOption, availabilityMap: Map<string, boolean>) => {
  if (!sizeOption?.id) return false;
  return availabilityMap.has(sizeOption.id);
};

const checkColorAvailable = (colorOption: ProductOption, selectedSize: ProductOption | null, availabilityMap: Map<string, boolean>) => {
  if (!selectedSize?.id || !colorOption?.id) return false;
  return availabilityMap.has(`${selectedSize.id}+${colorOption.id}`);
};

export const SizeColorSelection = component$<SizeColorSelectionProps>((props) => {
  // 🚀 PERFORMANCE OPTIMIZED: Memoized computations for better rendering performance
  const availableOptions = useComputed$(() => getAvailableOptions(props.selectedProduct.value));
  const availabilityMap = useComputed$(() => createVariantAvailabilityMap(props.selectedProduct.value));

  return (
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Product Images - Slides in from selected style */}
        <div class="order-1 lg:order-1 animate-slide-in-left">
          <div class="sticky top-24">
            <div class="flex flex-col lg:flex-row lg:gap-4">
              {/* Thumbnail Images - Desktop Only */}
              <div class="hidden lg:flex flex-col gap-2 w-[22%] max-w-[180px] min-w-[80px] pt-4">
                {props.selectedProduct.value && props.productAssets.value ? (
                  (() => {
                    const allAssets = [];

                    if (props.productAssets.value.featuredAsset) {
                      allAssets.push(props.productAssets.value.featuredAsset);
                    }

                    if (props.productAssets.value.assets && props.productAssets.value.assets.length > 0) {
                      props.productAssets.value.assets.forEach((asset: any) => {
                        if (!props.productAssets.value.featuredAsset || asset.id !== props.productAssets.value.featuredAsset.id) {
                          allAssets.push(asset);
                        }
                      });
                    }

                    if (allAssets.length === 0) {
                      allAssets.push({ id: 'placeholder', preview: '/asset_placeholder.webp' });
                    }

                    return allAssets.map((asset: any, index: number) => (
                      <div
                        key={asset.id}
                        class={[
                          'border-2 cursor-pointer rounded-lg overflow-hidden aspect-4/5 transition-all duration-200 transform hover:scale-105 hover:shadow-md',
                          props.currentProductImage.value?.id === asset.id
                            ? 'border-[#8a6d4a] border-4'
                            : 'border-gray-200',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick$={() => {
                          props.imageSelectTrigger.value = asset;
                        }}
                      >
                        <OptimizedImage
                          src={asset.preview}
                          class="w-full h-full object-cover transition-all duration-200 hover:opacity-80"
                          width={360}
                          height={450}
                          responsive="thumbnail"
                          alt={`${props.selectedProduct.value?.name || 'Product'} view ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ));
                  })()
                ) : props.selectedProduct.value && props.assetsLoading.value ? (
                  <div class="border-2 border-gray-200 rounded-lg overflow-hidden aspect-4/5 animate-pulse bg-gray-100 flex items-center justify-center">
                    <div class="text-gray-400 text-sm">Loading...</div>
                  </div>
                ) : (
                  <div class="border-2 border-gray-200 rounded-lg overflow-hidden aspect-4/5">
                    <div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <span class="text-xs">Loading...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Product Image */}
              <div class="flex-1">
                <div
                  class="w-full relative"
                  onTouchStart$={(e) => {
                    const touch = e.touches[0];
                    if (touch) {
                      props.touchStartTrigger.value = { clientX: touch.clientX, clientY: touch.clientY };
                    }
                  }}
                  onTouchMove$={(e) => {
                    const touch = e.touches[0];
                    if (touch) {
                      props.touchMoveTrigger.value = { clientX: touch.clientX, clientY: touch.clientY };
                    }
                  }}
                  onTouchEnd$={() => {
                    props.touchEndTrigger.value = !props.touchEndTrigger.value;
                  }}
                >
                  {props.selectedProduct.value && props.currentProductImage.value ? (
                    <OptimizedImage
                      key={props.currentProductImage.value?.id || 'no-image'}
                      src={props.currentProductImage.value.preview}
                      alt={props.selectedProduct.value?.name || 'Product'}
                      width={800}
                      height={1000}
                      class="w-full h-auto rounded-lg shadow-2xl aspect-4/5 object-contain"
                      responsive="productMain"
                    />
                  ) : props.selectedProduct.value && props.assetsLoading.value ? (
                    <div class="w-full h-auto rounded-lg shadow-2xl aspect-4/5 bg-gray-100 animate-pulse flex items-center justify-center">
                      <div class="text-gray-400">Loading product image...</div>
                    </div>
                  ) : (
                    <div class="w-full h-auto rounded-lg shadow-2xl aspect-4/5 bg-gray-100 flex items-center justify-center">
                      <div class="text-center text-gray-400 p-8">
                        <div class="mb-4 text-4xl">👕</div>
                        <div>Product image will appear here</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Image Navigation Dots */}
                {props.selectedProduct.value && props.productAssets.value && (() => {
                  const allAssets = [];

                  if (props.productAssets.value.featuredAsset) {
                    allAssets.push(props.productAssets.value.featuredAsset);
                  }

                  if (props.productAssets.value.assets && props.productAssets.value.assets.length > 0) {
                    props.productAssets.value.assets.forEach((asset: any) => {
                      if (!props.productAssets.value.featuredAsset || asset.id !== props.productAssets.value.featuredAsset.id) {
                        allAssets.push(asset);
                      }
                    });
                  }

                  if (allAssets.length <= 1) return null;

                  return (
                    <div class="flex lg:hidden justify-center gap-2 mt-4">
                      {allAssets.map((asset: any, index: number) => (
                        <button
                          key={asset.id}
                          class={{
                            'w-3 h-3 rounded-full transition-all duration-200 cursor-pointer': true,
                            'bg-[#8a6d4a]': props.currentProductImage.value?.id === asset.id,
                            'bg-gray-300 hover:bg-gray-400': props.currentProductImage.value?.id !== asset.id,
                          }}
                          onClick$={() => {
                            props.imageSelectTrigger.value = asset;
                          }}
                          aria-label={`View image ${index + 1} of ${props.selectedProduct.value?.name || 'Product'}`}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Selection Panel */}
        <div class="order-2 lg:order-2 animate-fade-in-up flex justify-center" style="animation-delay: 0.3s">
          <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full">
            
            {/* Header */}
            <div class="bg-gradient-to-r from-[#8a6d4a] to-[#6b5a47] text-white px-6 py-4">
              <div class="flex items-center justify-between">
                <div>
                  <h1 class="text-2xl font-light mb-1">
                    {props.selectedStyle.value === 'short' ? 'Short Sleeve' : 'Long Sleeve'} Shirt
                  </h1>
                  <p class="text-white/80 text-sm">Handcrafted perfection in every detail</p>
                </div>
                <div class="text-right">
                  <Price
                    priceWithTax={props.selectedProduct.value?.variants[0]?.priceWithTax || 0}
                    forcedClass="text-2xl font-light text-white"
                  />
                </div>
              </div>
            </div>

            {/* Selection Content */}
            <div class="p-6 relative">

              {/* Change Size Text Button - Only show on color step */}
              {props.currentStep.value > 1 && (
                <div class="text-center mb-2">
                  <button
                    onClick$={() => {
                      props.prevStepTrigger.value = !props.prevStepTrigger.value;
                    }}
                    class="text-[#8a6d4a] hover:text-[#4F3B26] text-sm font-medium underline transition-colors duration-300 cursor-pointer"
                  >
                    Change Size
                  </button>
                </div>
              )}

              {/* Step 1: Size Selection */}
              <div class={{
                'transition-all duration-400 ease-in-out': true,
                'opacity-100 transform translate-x-0': props.currentStep.value === 1,
                'opacity-0 transform -translate-x-5 pointer-events-none absolute': props.currentStep.value > 1
              }}>

                <div class="grid grid-cols-3 gap-4 mb-4">
                  {props.selectedProduct.value ? (
                    availableOptions.value.sizes.map((sizeOption) => {
                      const isSelected = props.selectedSize.value?.id === sizeOption.id;
                      const isAvailable = checkSizeAvailable(sizeOption, availabilityMap.value);

                      return (
                        <button
                          key={sizeOption.id}
                          class={{
                            'border-2 rounded-xl p-4 text-center transition-all duration-300 transform relative': true,
                            'cursor-pointer hover:scale-105 hover:shadow-md': isAvailable,
                            'cursor-not-allowed opacity-50': !isAvailable,
                            'border-[#8a6d4a] bg-[#8a6d4a]/5 shadow-lg scale-105': isSelected,
                            'border-gray-200 hover:border-[#8a6d4a]': !isSelected && isAvailable,
                            'border-gray-200': !isAvailable
                          }}
                          onClick$={() => {
                            if (isAvailable) {
                              props.sizeSelectTrigger.value = sizeOption;
                            }
                          }}
                          disabled={!isAvailable}
                        >
                          {isSelected && (
                            <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#8a6d4a] text-white flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                          <div class="text-2xl font-light text-gray-900">{sizeOption.name}</div>
                        </button>
                      );
                    })
                  ) : (
                    Array.from(['S', 'M', 'L']).map((size) => (
                      <div key={size} class="border-2 border-gray-200 rounded-xl p-4 text-center opacity-30">
                        <div class="text-2xl font-light mb-2 text-gray-400">{size}</div>
                        <div class="text-xs text-gray-400">Loading...</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Size Info with integrated Size Guide */}
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
                  <div class="flex items-start justify-between">
                    <div class="flex items-start">
                      <span class="mr-2 text-amber-600">💡</span>
                      <span>Designed with an oversized, relaxed fit for ultimate comfort and styling</span>
                    </div>
                    <button
                      class="text-[#8a6d4a] hover:text-[#4F3B26] text-xs font-medium underline transition-colors duration-200 flex items-center gap-1 ml-4 flex-shrink-0"
                      onClick$={() => {
                        props.toggleSizeChartTrigger.value = !props.toggleSizeChartTrigger.value;
                      }}
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 13H8m8-4H8"></path>
                      </svg>
                      {props.showSizeChart.value ? 'Hide' : 'Size Guide'}
                    </button>
                  </div>
                </div>

                {/* Expandable Size Chart */}
                {props.showSizeChart.value && (
                  <div class="mt-4 bg-white border border-gray-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                    <h4 class="font-medium text-gray-900 mb-3 text-center">Size Chart (Oversized Fit)</h4>
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="border-b border-gray-200">
                            <th class="text-left py-2 px-3 font-medium text-gray-700">Size</th>
                            <th class="text-center py-2 px-3 font-medium text-gray-700">Chest (in)</th>
                            <th class="text-center py-2 px-3 font-medium text-gray-700">Length (in)</th>
                            <th class="text-center py-2 px-3 font-medium text-gray-700">Shoulder (in)</th>
                          </tr>
                        </thead>
                        <tbody class="text-gray-600">
                          <tr class="border-b border-gray-100">
                            <td class="py-2 px-3 font-medium">Small</td>
                            <td class="py-2 px-3 text-center">22-24</td>
                            <td class="py-2 px-3 text-center">28</td>
                            <td class="py-2 px-3 text-center">20</td>
                          </tr>
                          <tr class="border-b border-gray-100">
                            <td class="py-2 px-3 font-medium">Medium</td>
                            <td class="py-2 px-3 text-center">24-26</td>
                            <td class="py-2 px-3 text-center">29</td>
                            <td class="py-2 px-3 text-center">21</td>
                          </tr>
                          <tr>
                            <td class="py-2 px-3 font-medium">Large</td>
                            <td class="py-2 px-3 text-center">26-28</td>
                            <td class="py-2 px-3 text-center">30</td>
                            <td class="py-2 px-3 text-center">22</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p class="text-xs text-gray-500 mt-3 text-center">
                      All measurements are approximate. Oversized fit provides extra room for comfort.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Color Selection */}
              <div class={{
                'transition-all duration-400 ease-in-out': true,
                'opacity-100 transform translate-x-0': props.currentStep.value === 2,
                'opacity-0 transform translate-x-5 pointer-events-none absolute': props.currentStep.value < 2
              }}>

                <div class="grid grid-cols-3 gap-4">
                  {props.selectedProduct.value ? (
                    availableOptions.value.colors.map((colorOption) => {
                      const isSelected = props.selectedColor.value?.id === colorOption.id;
                      const isAvailable = props.selectedSize.value ? checkColorAvailable(colorOption, props.selectedSize.value, availabilityMap.value) : false;

                      return (
                        <button
                          key={colorOption.id}
                          class={{
                            'border-2 rounded-xl p-4 text-center transition-all duration-300 transform relative': true,
                            'cursor-pointer hover:scale-105 hover:shadow-md': isAvailable,
                            'cursor-not-allowed opacity-50': !isAvailable,
                            'border-[#8a6d4a] bg-[#8a6d4a]/5 shadow-lg scale-105': isSelected,
                            'border-gray-200 hover:border-[#8a6d4a]': !isSelected && isAvailable,
                            'border-gray-200': !isAvailable
                          }}
                          onClick$={() => {
                            if (isAvailable) {
                              props.colorSelectTrigger.value = colorOption;
                            }
                          }}
                          disabled={!isAvailable}
                        >
                          {isSelected && (
                            <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#8a6d4a] text-white flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                          <div class="text-lg font-light text-gray-900">{colorOption.name}</div>
                        </button>
                      );
                    })
                  ) : (
                    Array.from(['Black', 'White', 'Gray']).map((color) => (
                      <div key={color} class="border-2 border-gray-200 rounded-xl p-4 text-center opacity-30">
                        <div class="text-lg font-light mb-2 text-gray-400">{color}</div>
                        <div class="text-xs text-gray-400">Loading...</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add to Cart Flow */}
                <AddToCartFlow
                  selectedProduct={props.selectedProduct}
                  selectedSize={props.selectedSize}
                  selectedColor={props.selectedColor}
                  selectedVariantId={props.selectedVariantId}
                  currentStep={props.currentStep}
                  isAddingToCart={props.isAddingToCart}
                  addToCartTrigger={props.addToCartTrigger}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
