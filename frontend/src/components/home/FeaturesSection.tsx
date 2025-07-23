import { component$ } from '@qwik.dev/core';

/**
 * Features section component - extracted for lazy loading
 * Contains the "Why Choose Rotten Hand" features grid
 */
export const FeaturesSection = component$(() => {
  return (
    <div class="text-white lg:col-span-1">
      {/* Mobile: Centered text with background, Desktop: Keep existing styling */}
      <div class="text-center lg:text-left bg-black/40 backdrop-blur-sm p-6 rounded-lg lg:bg-transparent lg:backdrop-blur-none lg:p-0">
        <h2 class="font-heading tracking-wide text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 lg:mb-8">
          WHY CHOOSE<br/>
          <span class="text-[#e34545]">DAMNED DESIGNS?</span>
        </h2>
        <p class="font-body text-base sm:text-lg lg:text-xl text-gray-200 leading-relaxed mb-8 lg:mb-12">
          Experience the difference that premium materials and expert craftsmanship make.
        </p>

        {/* Features Grid - Mobile: 1 column for better readability, Desktop: 2 columns */} 
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-3 animate-fade-up-initial animate-delay-100"> 
          {/* Feature 1: FREE SHIPPING */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#e34545] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10L4 7v10l8 4" />
              </svg>
            </div>
            <div> 
              <h3 class="text-base font-bold text-gray-900 mb-0.5">FREE SHIPPING</h3> 
              <p class="text-gray-800 text-xs">Orders over $100</p>
            </div>
          </div>

          {/* Feature 2: MILITARY DISCOUNT */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#e34545] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">MILITARY DISCOUNT</h3>
              <p class="text-gray-800 text-xs">15% off for heroes</p>
            </div>
          </div>

          {/* Feature 3: BUY NOW, PAY LATER */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#e34545] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 10h22" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">BUY NOW, PAY LATER</h3>
              <p class="text-gray-800 text-xs">4 interest-free payments</p>
            </div>
          </div>

          {/* Feature 4: LIFETIME WARRANTY */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#e34545] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">LIFETIME WARRANTY</h3>
              <p class="text-gray-800 text-xs">Craftsmanship guaranteed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// 🚀 LAZY LOADING: Default export for lazy$() import
export default FeaturesSection;
