import { component$, useStore } from '@qwik.dev/core';
import { useLocalCart } from '~/contexts/CartContext';
import { usePaymentManager } from './hooks/usePaymentManagerV2';
import { PaymentErrorDisplay } from './PaymentErrorDisplay';
import XCircleIcon from '../icons/XCircleIcon';

// This is a drop-in replacement for the original StripePayment component
// It preserves ALL existing interfaces, behaviors, and integrations
export default component$(() => {
  const localCart = useLocalCart();
  
  // CRITICAL: Extract cart UUID once to avoid tracking localCart reactivity
  // This preserves the exact same pattern as the original component
  const cartUuid = localCart.cartUuid;

  // Create cart snapshot to avoid reactive tracking (preserving original pattern)
  const cartSnapshot = {
    items: localCart?.localCart?.items || [],
    subTotal: localCart?.localCart?.subTotal || 0,
    appliedCoupon: localCart?.appliedCoupon
  };

  // Check if cart has items (preserving original validation)
  if (cartSnapshot.items.length === 0) {
    return (
      <div class="w-full max-w-full">
        <div class="rounded-md bg-yellow-50 p-4 mb-8">
          <div class="flex">
            <div class="flex-shrink-0">
              <XCircleIcon />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-yellow-800">Cart is empty</h3>
              <p class="text-sm text-yellow-700 mt-2">Please add items to your cart to continue.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initialize payment manager immediately (DOM element is always rendered now)
  const { state, isElementsReady } = usePaymentManager(
    cartUuid,
    cartSnapshot,
    true // Always initialize since DOM element is guaranteed to exist
  );

  // Store for UI state (preserving original store structure)
  const uiState = useStore({
    paymentError: null as any,
    debugInfo: 'Initializing...'
  });

  // No need for DOM timing since we always render the element

  // Handle different states with appropriate UI (preserving original UI patterns)
  const renderPaymentForm = () => {
    switch (state.status) {
      case 'initializing':
      case 'ready':
        // CRITICAL: Always render the payment-form div for both initializing and ready states
        // This ensures the DOM element exists when the hook tries to mount Stripe Elements
        const isLoading = state.status === 'initializing' || !isElementsReady;
        uiState.debugInfo = state.status === 'initializing'
          ? 'Initializing payment system...'
          : (isElementsReady ? 'Payment form ready' : 'Mounting payment form...');

        return (
          <div class="payment-tabs-container relative">
            {/* Always render the payment-form div so hook can find it */}
            <div
              id="payment-form"
              class="mb-8 w-full max-w-full"
            ></div>
            {/* Show loading overlay while initializing or mounting */}
            {isLoading && (
              <div class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div class="animate-pulse text-gray-600">
                  <div class="flex items-center space-x-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
                    <span>
                      {state.status === 'initializing' ? 'Initializing payment...' : 'Loading payment form...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'error':
        uiState.debugInfo = `Error: ${state.error}`;
        return (
          <div class="payment-tabs-container relative">
            <div class="rounded-md bg-red-50 p-4 mb-8">
              <div class="flex">
                <div class="flex-shrink-0">
                  <XCircleIcon />
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-red-800">Payment system error</h3>
                  <p class="text-sm text-red-700 mt-2">{state.error}</p>
                  <button 
                    class="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
                    onClick$={() => {
                      // Trigger page reload as a simple reset mechanism
                      window.location.reload();
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'cancelled':
        uiState.debugInfo = 'Payment initialization cancelled';
        return null;

      default:
        return null;
    }
  };

  return (
    <div class="w-full max-w-full">
      {renderPaymentForm()}
      
      {/* Enhanced error display (preserving original error display logic) */}
      {uiState.paymentError && (
        <PaymentErrorDisplay
          error={uiState.paymentError}
          isRetrying={false}
        />
      )}
      
      {/* Debug info for development (preserving original debug display) */}
      {uiState.debugInfo && process.env.NODE_ENV === 'development' && (
        <div class="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Debug: {uiState.debugInfo}
        </div>
      )}
    </div>
  );
});