import { component$, useSignal, $, useVisibleTask$ } from '@qwik.dev/core';
import { Order } from '~/generated/graphql';
import { OrderDetails } from './OrderDetails';
import { trackOrderServer } from '~/services/track-order.service';

export default component$(() => {
  const orderCode = useSignal('');
  const email = useSignal('');
  const orderData = useSignal<Order | null>(null);
  const loading = useSignal(false);
  const error = useSignal('');
  const hasSearched = useSignal(false);

  // Auto-focus the order code input on mount
  useVisibleTask$(() => {
    const orderInput = document.getElementById('orderCode');
    if (orderInput) {
      orderInput.focus();
    }
  });

  const handleTrackOrder = $(async () => {
    if (!orderCode.value.trim() || !email.value.trim()) {
      error.value = 'Please enter both order number and email address.';
      return;
    }

    loading.value = true;
    error.value = '';
    hasSearched.value = true;
    orderData.value = null;

    try {
      const result = await trackOrderServer(orderCode.value.trim(), email.value.trim());
      
      if (result.success && result.order) {
        orderData.value = result.order;
        error.value = '';
      } else {
        error.value = result.error || 'Order not found. Please check your order number and email address.';
        orderData.value = null;
      }
    } catch (err) {
      error.value = 'Unable to track order at this time. Please try again later.';
      orderData.value = null;
      console.error('Track order error:', err);
    } finally {
      loading.value = false;
    }
  });

  const handleReset = $(() => {
    orderCode.value = '';
    email.value = '';
    orderData.value = null;
    error.value = '';
    hasSearched.value = false;
    
    // Re-focus the order code input
    setTimeout(() => {
      const orderInput = document.getElementById('orderCode');
      if (orderInput) {
        orderInput.focus();
      }
    }, 100);
  });

  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div class="bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-6 text-white">
          <h1 class="text-3xl font-bold mb-2">Track Your Order</h1>
          <p class="text-gray-300">
            Enter your order number and email address to view your order status and tracking information.
          </p>
        </div>

        {/* Form */}
        <div class="p-8">
          <form preventdefault:submit onSubmit$={handleTrackOrder} class="space-y-6">
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label for="orderCode" class="block text-sm font-semibold text-gray-900 mb-2">
                  Order Number
                </label>
                <input
                  id="orderCode"
                  type="text"
                  bind:value={orderCode}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                  placeholder="DD12345"
                  required
                  autocomplete="off"
                />
                <p class="text-sm text-gray-500 mt-1">
                  Found in your order confirmation email
                </p>
              </div>
              
              <div>
                <label for="email" class="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  bind:value={email}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-lg"
                  placeholder="your.email@example.com"
                  required
                  autocomplete="email"
                />
                <p class="text-sm text-gray-500 mt-1">
                  The email used for your order
                </p>
              </div>
            </div>

            <div class="flex gap-4">
              <button
                type="submit"
                disabled={loading.value}
                class="flex-1 bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-semibold text-lg flex items-center justify-center gap-2"
              >
                {loading.value ? (
                  <>
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Tracking...</span>
                  </>
                ) : (
                  <>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Track Order</span>
                  </>
                )}
              </button>
              
              {hasSearched.value && (
                <button
                  type="button"
                  onClick$={handleReset}
                  class="px-6 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold"
                >
                  New Search
                </button>
              )}
            </div>
          </form>

          {/* Error Message */}
          {error.value && (
            <div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 class="text-sm font-semibold text-red-800">Unable to track order</h3>
                  <p class="text-sm text-red-700 mt-1">{error.value}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Details */}
          {orderData.value && (
            <div class="mt-8">
              <OrderDetails order={orderData.value} />
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div class="mt-8 bg-gray-50 rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
        <div class="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 class="font-semibold text-gray-900 mb-2">Can't find your order number?</h4>
            <p>Check your email for the order confirmation. The order number is usually in the subject line or at the top of the email.</p>
          </div>
          <div>
            <h4 class="font-semibold text-gray-900 mb-2">Still having trouble?</h4>
            <p>Contact our support team at <a href="mailto:support@damneddesigns.com" class="text-blue-600 hover:underline">support@damneddesigns.com</a> with your order details.</p>
          </div>
        </div>
      </div>
    </div>
  );
});