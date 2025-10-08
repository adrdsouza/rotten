import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';

export interface OrderProcessingModalProps {
  visible: boolean;
  error?: string | null;
}

export const OrderProcessingModal = component$<OrderProcessingModalProps>(({ visible, error }) => {
  const countdown = useSignal(3);
  const isRefreshing = useSignal(false);

  // Handle countdown for page refresh when there's an error
  useVisibleTask$(({ track, cleanup }) => {
    // Track the error signal to re-run when error changes
    track(() => error);

    if (error && !isRefreshing.value) {
      console.log('[OrderProcessingModal] Starting countdown for error:', error);
      isRefreshing.value = true;
      countdown.value = 3;

      const timer = setInterval(() => {
        countdown.value--;
        console.log('[OrderProcessingModal] Countdown:', countdown.value);
        if (countdown.value <= 0) {
          clearInterval(timer);
          console.log('[OrderProcessingModal] Refreshing page now...');
          // Trigger page refresh
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
      }, 1000);

      cleanup(() => clearInterval(timer));
    }
  });

  if (!visible) return null;

  return (
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center relative overflow-hidden">
        {/* Content */}
        <div class="relative z-10">
          {error ? (
            // Error State
            <>
              {/* Error Icon */}
              <div class="mb-6">
                <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>

              {/* Error Message */}
              <h2 class="text-xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>

              <p class="text-gray-600 mb-6">
                {error}
              </p>

              {/* Refresh Countdown */}
              <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-brand-gold">
                <p class="text-sm text-gray-600 mb-3">
                  Refreshing page for retry in <span class="font-bold text-brand-gold">{countdown.value}</span> seconds...
                </p>
                {/* Manual refresh button as fallback */}
                <button
                  onClick$={() => {
                    if (typeof window !== 'undefined') {
                      window.location.reload();
                    }
                  }}
                  class="text-xs text-brand-gold hover:text-brand-gold-hover underline"
                >
                  Refresh now
                </button>
              </div>
            </>
          ) : (
            // Processing State
            <>
              {/* Spinner */}
              <div class="mb-6">
                <div class="mx-auto w-16 h-16 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin"></div>
              </div>

              {/* Processing Message */}
              <h2 class="text-xl font-bold text-gray-900 mb-2">
                Processing Your Order
              </h2>

              <p class="text-gray-600 mb-6">
                Please wait while we process your payment...
              </p>

              {/* Progress indicator */}
              <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div class="bg-brand-gold h-full rounded-full animate-pulse w-3/4"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
