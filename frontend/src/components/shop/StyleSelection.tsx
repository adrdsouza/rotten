import { component$, Signal } from '@qwik.dev/core';
import { OptimizedImage } from '~/components/ui';
import Price from '~/components/products/Price';
import { Product } from '~/types';

import BothModelsImageUrl from '~/media/both3.png?url';

export interface StyleSelectionProps {
  stylesData: {
    shortSleeve: any | null;
    longSleeve: any | null;
  };
  fullProductData: Signal<{ shortSleeve?: Product | null; longSleeve?: Product | null }>;
  selectedStyle: Signal<'short' | 'long' | null>;
  isLoadingStep: Signal<boolean>;
  styleSelectTrigger: Signal<'short' | 'long' | null>;
}

// 🚀 NEW: Check if a product has any available variants (not all out of stock)
const hasAnyAvailableVariants = (product: Product | null): boolean => {
  if (!product?.variants) return false;
  
  return product.variants.some(variant => {
    const stockLevel = parseInt(String(variant.stockLevel || '0'));
    const trackInventory = variant.trackInventory;
    return stockLevel > 0 || trackInventory === 'FALSE';
  });
};

export const StyleSelection = component$<StyleSelectionProps>((props) => {

  return (
    <section class="bg-white min-h-screen" style="min-height: calc(100vh - 64px);">
      <div class="relative bg-white overflow-hidden" style="height: calc(100vh - 64px);">
        {/* Main Image */}
        <OptimizedImage
          src={BothModelsImageUrl}
          alt="Short and long sleeve shirts"
          class="w-full h-full object-cover"
          width={1600}
          height={600}
          responsive="hero"
        />

        {/* Text Overlay - Positioned above models' heads */}
        <div class="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10">
          <h1 class="text-5xl md:text-7xl font-light mb-2 text-white">
            Make It Yours
          </h1>
          <p class="text-lg md:text-xl text-white max-w-2xl mx-auto px-4">
            Select sleeve length, then pick your size and color
          </p>
        </div>

        {/* Left Button - Short Sleeve */}
        <div
          class={{
            'absolute left-8 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 transform hover:scale-105': true,
            'opacity-50 cursor-not-allowed': props.fullProductData.value.shortSleeve ? !hasAnyAvailableVariants(props.fullProductData.value.shortSleeve) : true
          }}
          onClick$={() => {
            if (props.isLoadingStep.value) return;
            if (props.fullProductData.value.shortSleeve && hasAnyAvailableVariants(props.fullProductData.value.shortSleeve)) {
              props.styleSelectTrigger.value = 'short';
            }
          }}
        >
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/30 min-w-[320px] hover:bg-white/95 hover:shadow-3xl hover:scale-105 transition-all duration-500 group">
            <div class="text-center">
              <h3 class="text-3xl font-light uppercase tracking-widest mb-4 text-gray-900 group-hover:text-[#8a6d4a] transition-colors duration-300">SHORT SLEEVES</h3>
              <div class="mb-4">
                <Price
                  priceWithTax={props.stylesData.shortSleeve?.variants[0]?.priceWithTax || 0}
                  forcedClass="text-5xl font-light text-[#8a6d4a] group-hover:text-[#6b5537] transition-colors duration-300"
                />
              </div>
              <div class="text-sm text-gray-600 uppercase tracking-wider font-medium group-hover:text-[#8a6d4a] transition-colors duration-300">
                CLICK TO SELECT
              </div>
            </div>

            {props.isLoadingStep.value && props.selectedStyle.value === 'short' && (
              <div class="absolute inset-0 bg-white/90 flex items-center justify-center rounded-3xl">
                <div class="w-10 h-10 border-4 border-[#8a6d4a] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Right Button - Long Sleeve */}
        <div
          class={{
            'absolute right-8 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 transform hover:scale-105': true,
            'opacity-50 cursor-not-allowed': props.fullProductData.value.longSleeve ? !hasAnyAvailableVariants(props.fullProductData.value.longSleeve) : true
          }}
          onClick$={() => {
            if (props.isLoadingStep.value) return;
            if (props.fullProductData.value.longSleeve && hasAnyAvailableVariants(props.fullProductData.value.longSleeve)) {
              props.styleSelectTrigger.value = 'long';
            }
          }}
        >
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/30 min-w-[320px] hover:bg-white/95 hover:shadow-3xl hover:scale-105 transition-all duration-500 group">
            <div class="text-center">
              <h3 class="text-3xl font-light uppercase tracking-widest mb-4 text-gray-900 group-hover:text-[#8a6d4a] transition-colors duration-300">LONG SLEEVES</h3>
              <div class="mb-4">
                <Price
                  priceWithTax={props.stylesData.longSleeve?.variants[0]?.priceWithTax || 0}
                  forcedClass="text-5xl font-light text-[#8a6d4a] group-hover:text-[#6b5537] transition-colors duration-300"
                />
              </div>
              <div class="text-sm text-gray-600 uppercase tracking-wider font-medium group-hover:text-[#8a6d4a] transition-colors duration-300">
                CLICK TO SELECT
              </div>
            </div>

            {props.isLoadingStep.value && props.selectedStyle.value === 'long' && (
              <div class="absolute inset-0 bg-white/90 flex items-center justify-center rounded-3xl">
                <div class="w-10 h-10 border-4 border-[#8a6d4a] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
