import { component$, Signal, useComputed$, type QRL } from '@qwik.dev/core';
import { OptimizedImage } from '~/components/ui';
import { PRODUCTS, SIZES, COLORS, getVariantId } from '~/data/shop-constants';
import { AddToCartFlow } from './AddToCartFlow-v2';

export interface SizeColorSelectionProps {
  selectedStyle: Signal<'short' | 'long' | null>;
  selectedSize: Signal<string | null>;
  selectedColor: Signal<string | null>;
  selectedVariantId: Signal<string>;
  currentStep: Signal<number>;
  showSizeChart: Signal<boolean>;
  currentProductImage: Signal<any>;
  productAssets: Signal<any>;
  assetsLoading: Signal<boolean>;
  touchStartX: Signal<number | null>;
  touchEndX: Signal<number | null>;
  isAddingToCart: Signal<boolean>;
  stockMap: Signal<Map<string, number>>;
  // Event handlers - BEST PRACTICE: Direct QRL handlers
  onSizeSelect$: QRL<(size: string) => void>;
  onColorSelect$: QRL<(color: string) => void>;
  onPrevStep$: QRL<() => void>;
  onToggleSizeChart$: QRL<() => void>;
  onImageSelect$: QRL<(asset: any) => void>;
  onTouchStart$: QRL<(touch: { clientX: number; clientY: number }) => void>;
  onTouchMove$: QRL<(touch: { clientX: number; clientY: number }) => void>;
  onTouchEnd$: QRL<() => void>;
  onAddToCart$: QRL<() => void>;
}

export const SizeColorSelection = component$<SizeColorSelectionProps>((props) => {
  // Helper functions for stock checking using the new hardcoded approach
  const checkSizeAvailable = (sizeCode: string): boolean => {
    if (!props.selectedStyle.value) return false;
    
    // Check if ANY color in this size has stock
    return COLORS.some(color => {
      const variantId = getVariantId(props.selectedStyle.value!, sizeCode, color.code);
      if (!variantId) return false;
      const stock = props.stockMap.value.get(variantId) || 0;
      return stock > 0;
    });
  };

  const checkColorAvailable = (colorCode: string): boolean => {
    if (!props.selectedStyle.value || !props.selectedSize.value) return false;
    
    const variantId = getVariantId(props.selectedStyle.value, props.selectedSize.value, colorCode);
    if (!variantId) return false;
    const stock = props.stockMap.value.get(variantId) || 0;
    return stock > 0;
  };

  // Computed product info
  const productInfo = useComputed$(() => {
    if (!props.selectedStyle.value) return null;
    const key = props.selectedStyle.value === 'short' ? 'shortSleeve' : 'longSleeve';
    return PRODUCTS[key];
  });

  return (
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Product Images - Slides in from selected style */}
        <div class="order-1 lg:order-1 animate-slide-in-left">
          <div class="sticky top-24">
            <div class="flex flex-col lg:flex-row lg:gap-4">
              {/* Thumbnail Images - Desktop Only */}
              <div class="hidden lg:flex flex-col gap-2 w-[22%] max-w-[180px] min-w-[80px] pt-4">
                {props.productAssets.value ? (
                  (() => {
                    const allAssets: any[] = [];

                    // 🎨 PRIORITY: If variant is selected, show variant featured image first
                    if (props.selectedVariantId.value && props.productAssets.value.variantFeaturedAsset) {
                      allAssets.push(props.productAssets.value.variantFeaturedAsset);
                    }

                    // Add product featured asset (if not already added)
                    if (props.productAssets.value.featuredAsset) {
                      const alreadyAdded = allAssets.some(asset => asset.id === props.productAssets.value.featuredAsset.id);
                      if (!alreadyAdded) {
                        allAssets.push(props.productAssets.value.featuredAsset);
                      }
                    }

                    // Add other product assets
                    if (props.productAssets.value.assets && props.productAssets.value.assets.length > 0) {
                      props.productAssets.value.assets.forEach((asset: any) => {
                        const alreadyAdded = allAssets.some(existing => existing.id === asset.id);
                        if (!alreadyAdded) {
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
                          props.onImageSelect$(asset);
                        }}
                      >
                        <OptimizedImage
                          src={asset.preview}
                          class="w-full h-full object-cover transition-all duration-200 hover:opacity-80"
                          width={360}
                          height={450}
                          responsive="thumbnail"
                          alt={`${productInfo.value?.name || 'Product'} view ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ));
                  })()
                ) : props.assetsLoading.value ? (
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
                      props.onTouchStart$({ clientX: touch.clientX, clientY: touch.clientY });
                    }
                  }}
                  onTouchMove$={(e) => {
                    const touch = e.touches[0];
                    if (touch) {
                      props.onTouchMove$({ clientX: touch.clientX, clientY: touch.clientY });
                    }
                  }}
                  onTouchEnd$={() => {
                    props.onTouchEnd$();
                  }}
                >
                  {props.currentProductImage.value ? (
                    <OptimizedImage
                      key={props.currentProductImage.value?.id || 'no-image'}
                      src={props.currentProductImage.value.preview}
                      alt={productInfo.value?.name || 'Product'}
                      width={800}
                      height={1000}
                      class="w-full h-auto rounded-lg shadow-2xl aspect-4/5 object-cover"
                      responsive="productMain"
                    />
                  ) : props.assetsLoading.value ? (
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
                {props.productAssets.value && (() => {
                  const allAssets: any[] = [];

                  // 🎨 PRIORITY: If variant is selected, show variant featured image first
                  if (props.selectedVariantId.value && props.productAssets.value.variantFeaturedAsset) {
                    allAssets.push(props.productAssets.value.variantFeaturedAsset);
                  }

                  // Add product featured asset (if not already added)
                  if (props.productAssets.value.featuredAsset) {
                    const alreadyAdded = allAssets.some(asset => asset.id === props.productAssets.value.featuredAsset.id);
                    if (!alreadyAdded) {
                      allAssets.push(props.productAssets.value.featuredAsset);
                    }
                  }

                  // Add other product assets
                  if (props.productAssets.value.assets && props.productAssets.value.assets.length > 0) {
                    props.productAssets.value.assets.forEach((asset: any) => {
                      const alreadyAdded = allAssets.some(existing => existing.id === asset.id);
                      if (!alreadyAdded) {
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
                            props.onImageSelect$(asset);
                          }}
                          aria-label={`View image ${index + 1} of ${productInfo.value?.name || 'Product'}`}
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
                    {productInfo.value?.name || 'Product'}
                  </h1>
                  <p class="text-white/80 text-sm">Handcrafted perfection in every detail</p>
                </div>
                <div class="text-right">
                  <span class="text-2xl font-light text-white">
                    ${(productInfo.value?.price || 0) / 100}
                  </span>
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
                      props.onPrevStep$();
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
                  {SIZES.map((size) => {
                    const isSelected = props.selectedSize.value === size.code;
                    const isAvailable = checkSizeAvailable(size.code);

                    return (
                      <button
                        key={size.code}
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
                            props.onSizeSelect$(size.code);
                          }
                        }}
                        disabled={!isAvailable}
                      >
                        {isSelected && (
                          <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#8a6d4a] text-white flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                        <div class="text-2xl font-light text-gray-900">{size.name}</div>
                      </button>
                    );
                  })}
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
                        props.onToggleSizeChart$();
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
                  {COLORS.map((color) => {
                    const isSelected = props.selectedColor.value === color.code;
                    const isAvailable = checkColorAvailable(color.code);

                    return (
                      <button
                        key={color.code}
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
                            props.onColorSelect$(color.code);
                          }
                        }}
                        disabled={!isAvailable}
                      >
                        {isSelected && (
                          <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#8a6d4a] text-white flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                        <div class="text-lg font-light text-gray-900">{color.name}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Add to Cart Flow */}
                <AddToCartFlow
                  selectedVariantId={props.selectedVariantId}
                  currentStep={props.currentStep}
                  isAddingToCart={props.isAddingToCart}
                  onAddToCart$={props.onAddToCart$}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
