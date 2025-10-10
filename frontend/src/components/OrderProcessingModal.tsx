import { component$, useSignal, useVisibleTask$, type QRL } from '@qwik.dev/core';

export interface OrderProcessingModalProps {
  visible: boolean;
  error?: string | null;
  onClose$?: QRL<() => void>; // Callback to close the modal
}

export const OrderProcessingModal = component$<OrderProcessingModalProps>(({ visible, error, onClose$ }) => {
  const isRefreshing = useSignal(false);

  // DON'T auto-refresh on error - let user stay on page and retry
  // Page reload was causing localStorage cart to be lost
  useVisibleTask$(({ track }) => {
    // Track the error signal to re-run when error changes
    track(() => error);

    if (error && !isRefreshing.value) {
      console.log('[OrderProcessingModal] Payment error detected:', error);
      console.log('[OrderProcessingModal] User can close modal and retry payment');
      // Modal will stay open until user closes it manually
      // This preserves all cart data and form state for retry
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

              {/* Retry Instructions */}
              <div class="bg-gray-50 rounded-lg p-4 border-l-4 border-brand-gold mb-4">
                <p class="text-sm text-gray-700">
                  Please check your payment details and try again. Your cart has been preserved.
                </p>
              </div>

              {/* Close button to retry */}
              <button
                onClick$={onClose$}
                class="w-full bg-brand-gold hover:bg-brand-gold-hover text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Close and Retry Payment
              </button>
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
