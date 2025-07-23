import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation, useNavigate } from '@qwik.dev/router';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const showCancelMessage = useSignal(false);

  useVisibleTask$(() => {
    // Check if this is a cancellation from Sezzle
    const urlParams = new URLSearchParams(location.url.search);
    const canceled = urlParams.get('canceled');
    const error = urlParams.get('error');

    if (canceled === 'true' || error) {
      showCancelMessage.value = true;

      // Auto-redirect to checkout page after showing the message briefly
      setTimeout(() => {
        navigate('/checkout');
      }, 4000); // Slightly longer to give user time to read
    } else {
      // If no cancellation parameter, redirect to checkout immediately
      navigate('/checkout');
    }
  });

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {showCancelMessage.value ? (
            <div class="text-center">
              {/* Cancellation Icon */}
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 class="text-lg font-medium text-gray-900 mb-2">
                Payment Not Completed
              </h2>

              <p class="text-sm text-gray-600 mb-6">
                Your payment was not completed. You can try again or choose a different payment method.
              </p>
              
              <div class="space-y-4">
                <button
                  onClick$={() => navigate('/checkout')}
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Return to Checkout
                </button>
                
                <button
                  onClick$={() => navigate('/cart')}
                  class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  View Cart
                </button>
              </div>
              
              <p class="text-xs text-gray-500 mt-4">
                Redirecting to checkout in 4 seconds...
              </p>
            </div>
          ) : (
            <div class="text-center">
              {/* Loading spinner */}
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
              
              <h2 class="text-lg font-medium text-gray-900 mb-2">
                Redirecting...
              </h2>
              
              <p class="text-sm text-gray-600">
                Taking you back to checkout
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const head = () => {
  return createSEOHead({
    title: 'Payment - Damned Designs',
    description: 'Payment processing page',
    noindex: true,
  });
};
