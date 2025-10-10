import { component$, useSignal, useVisibleTask$, $ } from '@qwik.dev/core';
import { ENV_VARIABLES } from '~/env';

interface SezzleWidgetProps {
  price?: number;
  currencyCode?: string;
  class?: string;
}

/**
 * Official Sezzle Widget Component
 * 
 * This component loads the official Sezzle price widget script and displays
 * the "4 payments of $X.XX" messaging with proper branding and compliance.
 * 
 * The widget automatically:
 * - Checks customer/product eligibility
 * - Shows current terms and conditions
 * - Provides brand-compliant styling
 * - Links to Sezzle's learn more pages
 * - Tracks analytics for merchant reporting
 */
export default component$<SezzleWidgetProps>(({ price, currencyCode = 'USD', class: className = '' }) => {
  const isLoaded = useSignal(false);
  const error = useSignal<string | null>(null);

  // Handle click to show Sezzle info
  const handleSezzleClick = $(() => {
    // Open Sezzle's learn more page in a new tab
    window.open('https://sezzle.com/how-it-works', '_blank', 'noopener,noreferrer');
  });

  // Load the Sezzle widget script
  useVisibleTask$(() => {
    const merchantUuid = ENV_VARIABLES.VITE_SEZZLE_MERCHANT_UUID;
    
    if (!merchantUuid) {
      error.value = 'Sezzle merchant UUID not configured';
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="widget.sezzle.com"]');
    if (existingScript) {
      isLoaded.value = true;
      return;
    }

    // Create and load the Sezzle widget script
    const script = document.createElement('script');
    script.src = `https://widget.sezzle.com/v1/javascript/price-widget?uuid=${merchantUuid}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded.value = true;
      console.log('[Sezzle Widget] Script loaded successfully');
    };

    script.onerror = () => {
      error.value = 'Failed to load Sezzle widget script';
      console.error('[Sezzle Widget] Failed to load script');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  });

  // Don't render anything if there's an error or no price
  if (error.value || !price || price <= 0) {
    return null;
  }

  // Calculate installment amount for fallback display
  const installmentAmount = (price / 400).toFixed(2); // Convert from cents to dollars and divide by 4

  return (
    <div class={`sezzle-widget-container ${className}`}>
      {!isLoaded.value ? (
        // Enhanced fallback content while script loads
        <div
          class="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors cursor-pointer"
          onClick$={handleSezzleClick}
        >
          <div class="flex items-center gap-2">
            {/* Sezzle Logo/Icon */}
            <div class="flex items-center justify-center w-6 h-6 bg-purple-600 rounded text-white text-xs font-bold">
              S
            </div>
            <span class="font-semibold text-purple-700">Sezzle</span>
          </div>
          <div class="flex items-center gap-1 text-sm">
            <span class="text-gray-700">4 payments of</span>
            <span class="font-semibold text-gray-900">${installmentAmount}</span>
          </div>
          <div class="flex items-center gap-1 text-xs text-gray-500">
            <span>•</span>
            <span class="font-medium text-green-600">0% interest</span>
          </div>
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ) : (
        // The Sezzle script will automatically populate elements with specific classes/attributes
        // This div will be targeted by the Sezzle widget script
        <div
          class="sezzle-widget"
          data-sezzle-amount={price}
          data-sezzle-currency={currencyCode}
        >
          {/* Enhanced fallback content - will be replaced by Sezzle widget */}
          <div
            class="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 hover:border-purple-200 transition-colors cursor-pointer"
            onClick$={handleSezzleClick}
          >
            <div class="flex items-center gap-2">
              {/* Sezzle Logo/Icon */}
              <div class="flex items-center justify-center w-6 h-6 bg-purple-600 rounded text-white text-xs font-bold">
                S
              </div>
              <span class="font-semibold text-purple-700">Sezzle</span>
            </div>
            <div class="flex items-center gap-1 text-sm">
              <span class="text-gray-700">4 payments of</span>
              <span class="font-semibold text-gray-900">${installmentAmount}</span>
            </div>
            <div class="flex items-center gap-1 text-xs text-gray-500">
              <span>•</span>
              <span class="font-medium text-green-600">0% interest</span>
            </div>
            <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});
