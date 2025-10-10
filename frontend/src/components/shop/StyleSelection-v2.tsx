import { component$, Signal, type QRL } from '@qwik.dev/core';
import { OptimizedImage } from '~/components/ui';
import { PRODUCTS } from '~/data/shop-constants';

import BothModelsImageUrl from '~/media/both3.png?url';

export interface StyleSelectionProps {
  selectedStyle: Signal<'short' | 'long' | null>;
  isLoadingStep: Signal<boolean>;
  onStyleSelect$: QRL<(style: 'short' | 'long') => void>;
  hasStock: Signal<{ shortSleeve: boolean; longSleeve: boolean }>;
}

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
        <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10">
          <h1 class="text-4xl md:text-7xl font-light mb-2 text-white whitespace-nowrap">
            Make It Yours
          </h1>
          <p class="text-base md:text-xl text-white max-w-2xl mx-auto px-4 whitespace-nowrap md:whitespace-normal">
            Select sleeve length, then pick your size and color
          </p>
        </div>

        {/* Mobile: Centered buttons with larger gap */}
        <div class="absolute top-28 left-1/2 -translate-x-1/2 w-full px-4 md:hidden">
          <div class="flex gap-8 max-w-lg mx-auto">
            {/* Short Sleeve Button - Mobile */}
            <div
              class={{
                'flex-1 cursor-pointer transition-all duration-300 transform hover:scale-105': true,
                'opacity-50 cursor-not-allowed': !props.hasStock.value.shortSleeve
              }}
              onClick$={() => {
                if (props.isLoadingStep.value) return;
                if (props.hasStock.value.shortSleeve) {
                  props.onStyleSelect$('short');
                }
              }}
            >
              <div class="bg-white/90 backdrop-blur-md rounded-lg p-5 shadow-xl border border-white/30 hover:bg-white/95 hover:shadow-2xl hover:scale-105 transition-all duration-500 group">
                <div class="text-center">
                  <div class="flex items-center justify-center gap-2">
                    <h3 class="text-base font-bold uppercase tracking-wide text-gray-900 group-hover:text-[#8a6d4a] transition-colors duration-300">SHORT SLEEVES</h3>
                    <span class="text-base font-bold text-[#8a6d4a] group-hover:text-[#6b5537] transition-colors duration-300">
                      ${PRODUCTS.shortSleeve.price / 100}
                    </span>
                  </div>
                </div>

                {props.isLoadingStep.value && props.selectedStyle.value === 'short' && (
                  <div class="absolute inset-0 bg-white/90 flex items-center justify-center rounded-xl">
                    <div class="w-6 h-6 border-4 border-[#8a6d4a] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Long Sleeve Button - Mobile */}
            <div
              class={{
                'flex-1 cursor-pointer transition-all duration-300 transform hover:scale-105': true,
                'opacity-50 cursor-not-allowed': !props.hasStock.value.longSleeve
              }}
              onClick$={() => {
                if (props.isLoadingStep.value) return;
                if (props.hasStock.value.longSleeve) {
                  props.onStyleSelect$('long');
                }
              }}
            >
              <div class="bg-white/90 backdrop-blur-md rounded-lg p-5 shadow-xl border border-white/30 hover:bg-white/95 hover:shadow-2xl hover:scale-105 transition-all duration-500 group">
                <div class="text-center">
                  <div class="flex items-center justify-center gap-2">
                    <h3 class="text-base font-bold uppercase tracking-wide text-gray-900 group-hover:text-[#8a6d4a] transition-colors duration-300">LONG SLEEVES</h3>
                    <span class="text-base font-bold text-[#8a6d4a] group-hover:text-[#6b5537] transition-colors duration-300">
                      ${PRODUCTS.longSleeve.price / 100}
                    </span>
                  </div>
                </div>

                {props.isLoadingStep.value && props.selectedStyle.value === 'long' && (
                  <div class="absolute inset-0 bg-white/90 flex items-center justify-center rounded-xl">
                    <div class="w-6 h-6 border-4 border-[#8a6d4a] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Left Button - Short Sleeve */}
        <div
          class={{
            'absolute left-8 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 transform hover:scale-105 hidden md:block': true,
            'opacity-50 cursor-not-allowed': !props.hasStock.value.shortSleeve
          }}
          onClick$={() => {
            if (props.isLoadingStep.value) return;
            if (props.hasStock.value.shortSleeve) {
              props.onStyleSelect$('short');
            }
          }}
        >
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/30 min-w-[320px] hover:bg-white/95 hover:shadow-3xl hover:scale-105 transition-all duration-500 group">
            <div class="text-center">
              <h3 class="text-3xl font-light uppercase tracking-widest mb-4 text-gray-900 group-hover:text-[#8a6d4a] transition-colors duration-300">SHORT SLEEVES</h3>
              <div class="mb-4">
                <span class="text-5xl font-light text-[#8a6d4a] group-hover:text-[#6b5537] transition-colors duration-300">
                  ${PRODUCTS.shortSleeve.price / 100}
                </span>
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

        {/* Desktop: Right Button - Long Sleeve */}
        <div
          class={{
            'absolute right-8 top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 transform hover:scale-105 hidden md:block': true,
            'opacity-50 cursor-not-allowed': !props.hasStock.value.longSleeve
          }}
          onClick$={() => {
            if (props.isLoadingStep.value) return;
            if (props.hasStock.value.longSleeve) {
              props.onStyleSelect$('long');
            }
          }}
        >
          <div class="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/30 min-w-[320px] hover:bg-white/95 hover:shadow-3xl hover:scale-105 transition-all duration-500 group">
            <div class="text-center">
              <h3 class="text-3xl font-light uppercase tracking-widest mb-4 text-gray-900 group-hover:text-[#8a6d4a] transition-colors duration-300">LONG SLEEVES</h3>
              <div class="mb-4">
                <span class="text-5xl font-light text-[#8a6d4a] group-hover:text-[#6b5537] transition-colors duration-300">
                  ${PRODUCTS.longSleeve.price / 100}
                </span>
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
