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
          <span class="text-[#eee9d4]">ROTTEN HAND?</span>
        </h2>
        <p class="font-body text-base sm:text-lg lg:text-xl text-gray-200 leading-relaxed mb-8 lg:mb-12">
          Conscious consumption over mindless accumulation. Quality over quantity. Decades over seasons.
        </p>

        {/* Features Grid - Mobile: 1 column for better readability, Desktop: 2 columns */}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-3 animate-fade-up-initial animate-delay-100">
          {/* Feature 1: Conscious Consumption */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#eee9d4] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">CONSCIOUS CONSUMPTION</h3>
              <p class="text-gray-800 text-xs">2 perfect pieces vs. 52 seasons</p>
            </div>
          </div>

          {/* Feature 2: Ethical Production */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#eee9d4] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">ETHICAL PRODUCTION</h3>
              <p class="text-gray-800 text-xs">Fair wages in India, no child labor</p>
            </div>
          </div>

          {/* Feature 3: Zero Waste Design */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#eee9d4] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">ZERO WASTE DESIGN</h3>
              <p class="text-gray-800 text-xs">Tagua buttons, waste packaging</p>
            </div>
          </div>

          {/* Feature 4: Decades Not Seasons */}
          <div class="bg-white/40 backdrop-blur-sm p-4 rounded-lg border border-white border-opacity-20 flex items-center gap-x-3 justify-center lg:justify-start">
            <div class="w-10 h-10 bg-[#eee9d4] shrink-0 flex items-center justify-center rounded-full">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-0.5">DECADES NOT SEASONS</h3>
              <p class="text-gray-800 text-xs">$0.26 cost per wear over 10 years</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// 🚀 LAZY LOADING: Default export for lazy$() import
export default FeaturesSection;
