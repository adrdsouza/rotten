import { component$ } from '@qwik.dev/core';

/**
 * Trustpilot Reviews section component - extracted for lazy loading
 * Contains customer reviews and Trustpilot integration
 */
export const ReviewsSection = component$(() => {
  return (
    <div class="bg-white/95 backdrop-blur-sm p-6 sm:p-8 lg:p-10 rounded-lg shadow-2xl lg:col-span-1">
      {/* Trustpilot Header */}
      <div class="text-center mb-6 animate-scale-initial animate-delay-200">
        <div class="flex items-center justify-center mb-4">
          <svg class="w-8 h-8 trustpilot-green mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <h3 class="text-2xl font-bold trustpilot-green">Trustpilot</h3>
        </div>
        <div class="flex items-center justify-center mb-2">
          {[...Array(5)].map((_, i) => (
            <svg key={i} class="w-6 h-6 trustpilot-star fill-current mr-1" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          ))}
        </div>
        <p class="text-sm text-gray-600">
          <span class="font-bold">4.7 out of 5</span> based on <span class="font-bold">298 reviews</span>
        </p>
      </div>

      {/* Real Customer Reviews */}
      <div class="space-y-4 animate-fade-up-initial animate-delay-300">
        <div class="border-b border-gray-200 pb-4">
          <div class="flex mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} class="w-4 h-4 trustpilot-star fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <p class="text-gray-700 mb-3 italic text-sm">
            "Absolutely amazing company with phenomenal customer service, fast shipping, and out of this world designs and products. Adrian is awesome and a down to earth individual."
          </p>
          <p class="text-xs text-gray-500 font-semibold">- Jonathan Rivera, Jun 13, 2024</p>
        </div>
        
        <div class="border-b border-gray-200 pb-4">
          <div class="flex mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} class="w-4 h-4 trustpilot-star fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <p class="text-gray-700 mb-3 italic text-sm">
            "Quick shipping to the UK. Great quality knife. End up using it for gardening and then after a clean bit of food prep goes nicely. The Cerberus is great."
          </p>
          <p class="text-xs text-gray-500 font-semibold">- Modge, Jun 1, 2024</p>
        </div>
        
        <div class="pb-4">
          <div class="flex mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} class="w-4 h-4 trustpilot-star fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <p class="text-gray-700 mb-3 italic text-sm">
            "Great lil knives! Comfy and compact designs with great front flipper action. Shipping was fairly quick and got in on time for the holidays."
          </p>
          <p class="text-xs text-gray-500 font-semibold">- Michael Sharp, Feb 7, 2024</p>
        </div>
      </div>

      {/* Trustpilot CTA */}
      <div class="text-center mt-4 animate-fade-initial animate-delay-400">
        <a href="https://www.trustpilot.com/review/rottenhand.com" target="_blank" rel="noopener noreferrer" 
          class="text-sm trustpilot-green hover:underline font-semibold">
          Read all 298 reviews →
        </a>
      </div>
    </div>
  );
});

// 🚀 LAZY LOADING: Default export for lazy$() import
export default ReviewsSection;
