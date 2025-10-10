import { $, component$, useContext, useStore, useVisibleTask$, useSignal } from '@builder.io/qwik';
import { 
  useNavigate, 
  routeAction$, 
  routeLoader$,
  zod$, 
  z, 
  Link,
  type DocumentHead
} from '@qwik.dev/router';
import CartContents from '~/components/cart-contents/CartContents';
import CartTotals from '~/components/cart-totals/CartTotals';
import { APP_STATE, AUTH_TOKEN } from '~/constants';
import { getCookie } from '~/utils';
import { getActiveOrderQuery, setCustomerForOrderMutation } from '~/providers/shop/orders/order';

import { CheckoutAddresses } from '~/components/checkout/CheckoutAddresses';
import { CheckoutAddressProvider } from '~/contexts/CheckoutAddressContext';
import { createSEOHead } from '~/utils/seo';
import Payment from '~/components/payment/Payment';
import { useLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { CheckoutValidationProvider, useCheckoutValidation, useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { OrderProcessingModal } from '~/components/OrderProcessingModal';

import { clearAllValidationCache } from '~/utils/cached-validation';
import { useCheckout } from '~/hooks/useCheckout';
import { transitionOrderToStateMutation } from '~/providers/shop/checkout/checkout';

import { LocalCartService } from '~/services/LocalCartService';

// Create a Qwik-compatible auth headers function
const getAuthHeaders = $(() => {
  const token = getCookie(AUTH_TOKEN);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
});

// No need for routeLoader - we ALWAYS use local cart mode until payment succeeds
// The order is only created when user clicks "Place Order"
export const useCheckoutLoader = routeLoader$(async () => {
  return {
    order: null,
    error: null
  };
});

const prefetchOrderConfirmation = $((orderCode: string) => {
  if (typeof document !== 'undefined' && orderCode) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/checkout/confirmation/${orderCode}`;
    link.as = 'document';
    document.head.appendChild(link);
  }
});

export const useCheckoutAction = routeAction$(async (formData, { fail }) => {
  try {
    if (!formData.customerEmail || !formData.customerFirstName || 
        !formData.customerLastName || !formData.shippingStreetLine1) {
      return fail(400, {
        error: 'Missing required fields',
        fields: formData
      });
    }
    
    return {
      success: true,
      orderCode: 'ORDER_' + Date.now()
    };

  } catch (_error) {
    return fail(500, {
      error: 'Checkout processing failed'
    });
  }
}, zod$({
  customerEmail: z.string().email(),
  customerFirstName: z.string().min(1),
  customerLastName: z.string().min(1),
  customerPhone: z.string().optional(),
  shippingStreetLine1: z.string().min(1),
  shippingStreetLine2: z.string().optional(),
  shippingCity: z.string().min(1),
  shippingProvince: z.string().min(1),
  shippingPostalCode: z.string().min(1),
  shippingCountryCode: z.string().min(2),
  paymentMethod: z.string().min(1),
}));

interface CheckoutState {
  loading: boolean;
  error: string | null;
}

const CheckoutContent = component$(() => {
  const navigate = useNavigate();
  const appState = useContext(APP_STATE);
  const localCart = useLocalCart();
  const checkoutValidation = useCheckoutValidation();
  const validationActions = useCheckoutValidationActions();
  const { checkoutState, convertLocalCartToVendureOrder } = useCheckout();
  const loaderData = useCheckoutLoader();

  const state = useStore<CheckoutState>({
    loading: false,
    error: loaderData.value.error,
  });

  const stripeTriggerSignal = useSignal(0);
  const selectedPaymentMethod = useSignal<string>('stripe');
  const pageLoading = useSignal(true);
  const paymentComplete = useSignal(false);
  
  // Fix hydration mismatch by using a signal instead of computed
  const isCartEmpty = useSignal(false);

  const isOrderProcessing = useSignal(false);
  const showProcessingModal = useSignal(false);
  const modalError = useSignal<string | null>(null);

  // Initial page loading task with proper cleanup
  useVisibleTask$(async () => {
    if (pageLoading.value) {
      const checkoutStartTime = performance.now();
      console.log('🚀 [CHECKOUT TIMING] Starting checkout page initialization...');

      try {
        const clearCacheStart = performance.now();
        clearAllValidationCache();
        appState.showCart = false;
        console.log(`⏱️ [CHECKOUT TIMING] Clear cache: ${(performance.now() - clearCacheStart).toFixed(2)}ms`);

        // Initialize active order from loader data if available
        const loaderStart = performance.now();
        if (loaderData.value.order && !loaderData.value.error) {
          appState.activeOrder = loaderData.value.order;
        }
        console.log(`⏱️ [CHECKOUT TIMING] Loader data init: ${(performance.now() - loaderStart).toFixed(2)}ms`);

        // Cart is already loaded eagerly by CartProvider using useTask$
        // No need to call loadCartIfNeeded - it's guaranteed to be loaded
        if (localCart.localCart.items.length > 0) {
          try {
            const stockRefreshStart = performance.now();
            await refreshCartStock(localCart);
            console.log(`⏱️ [CHECKOUT TIMING] Stock refresh: ${(performance.now() - stockRefreshStart).toFixed(2)}ms`);
          } catch (error) {
            console.error('Checkout: Failed to refresh stock levels:', error);
          }
        }

        // Update cart empty state
        const emptyCheckStart = performance.now();
        isCartEmpty.value = localCart.localCart.items.length === 0 &&
          (!appState.activeOrder || !appState.activeOrder.lines || appState.activeOrder.lines.length === 0);
        console.log(`⏱️ [CHECKOUT TIMING] Empty check: ${(performance.now() - emptyCheckStart).toFixed(2)}ms`);

        console.log(`✅ [CHECKOUT TIMING] TOTAL checkout initialization: ${(performance.now() - checkoutStartTime).toFixed(2)}ms`);
      } catch (error) {
        console.error('[Checkout] Error during checkout initialization:', error);
        state.error = 'Failed to load checkout. Please try again.';
      } finally {
        pageLoading.value = false;
      }
    }

    // Cleanup function for all resources
    return () => {
      // Clean up any global references
      if (typeof window !== 'undefined') {
        delete (window as any).recordCacheHit;
        delete (window as any).recordCacheMiss;
        delete (window as any).submitCheckoutAddressForm;
        delete (window as any).submitStripeElements;
        delete (window as any).confirmStripePreOrderPayment;
      }
    };
  });

  // Separate task for cart validation that doesn't affect loading state
  useVisibleTask$(async ({ track }) => {
    track(() => localCart.localCart.items);
    
    // Update cart empty state when items change
    isCartEmpty.value = localCart.localCart.items.length === 0 && 
      (!appState.activeOrder || !appState.activeOrder.lines || appState.activeOrder.lines.length === 0);
    
    if (localCart.localCart.items.length > 0) {
        const stockValidation = LocalCartService.validateStock();
        validationActions.updateStockValidation(stockValidation.valid, stockValidation.errors);
    } else {
        validationActions.updateStockValidation(true, []);
    }
  });

  const placeOrder = $(async () => {
    if (isOrderProcessing.value) return;

    // 🚀 START TIMING
    const startTime = performance.now();
    console.log('🚀 [PLACE ORDER] Starting order placement...');

    showProcessingModal.value = true;
    isOrderProcessing.value = true;
    state.error = null;

    try {
      // Step 1: Validation
      const validationStart = performance.now();
      if (!appState.customer?.emailAddress || !appState.customer?.firstName || !appState.customer?.lastName) {
        throw new Error('Please complete all required customer information.');
      }

      if (!appState.shippingAddress?.streetLine1 || !appState.shippingAddress?.city || !appState.shippingAddress?.province) {
        throw new Error('Please complete all required shipping address information.');
      }

      if (checkoutValidation.useDifferentBilling && !appState.billingAddress?.streetLine1) {
        throw new Error('Please complete all required billing address information.');
      }
      console.log(`⏱️ [PLACE ORDER] Validation: ${(performance.now() - validationStart).toFixed(2)}ms`);

      // Step 2: If retrying after payment failure, transition order back to AddingItems first
      if (appState.activeOrder && appState.activeOrder.state === 'ArrangingPayment') {
        const retryTransitionStart = performance.now();
        console.log('🔄 [PLACE ORDER] Retrying after payment failure - transitioning order back to AddingItems...');
        try {
          const transitionResult = await transitionOrderToStateMutation('AddingItems');
          if (transitionResult.transitionOrderToState && 'state' in transitionResult.transitionOrderToState) {
            appState.activeOrder = transitionResult.transitionOrderToState as any;
            console.log(`⏱️ [PLACE ORDER] Order transitioned back to AddingItems: ${(performance.now() - retryTransitionStart).toFixed(2)}ms`);
          }
        } catch (_transitionError) {
          const errorMessage = 'Failed to reset order for retry. Please refresh the page.';
          modalError.value = errorMessage;
          isOrderProcessing.value = false;
          console.log(`❌ [PLACE ORDER] Failed to transition order for retry after ${(performance.now() - retryTransitionStart).toFixed(2)}ms`);
          return;
        }
      }

      // Step 3: Convert local cart to Vendure order
      const cartConversionStart = performance.now();
      try {
        console.log('🛒 [PLACE ORDER] Converting local cart to Vendure order...');
        const vendureOrder = await convertLocalCartToVendureOrder();
        if (!vendureOrder) {
          throw new Error(checkoutState.error || 'Failed to create order from your cart.');
        }
        appState.activeOrder = vendureOrder;
        console.log(`⏱️ [PLACE ORDER] Cart conversion: ${(performance.now() - cartConversionStart).toFixed(2)}ms`);
      } catch (conversionError) {
        const errorMessage = conversionError instanceof Error ? conversionError.message : 'An unknown error occurred while creating your order.';
        modalError.value = errorMessage;
        isOrderProcessing.value = false;
        console.log(`❌ [PLACE ORDER] Cart conversion failed after ${(performance.now() - cartConversionStart).toFixed(2)}ms`);
        return;
      }

      // Step 4: Set customer for order (guest checkout only)
      // For authenticated users, Vendure automatically associates the order with the customer
      // For guest users, we must explicitly set customer info on the order
      const isGuest = !appState.customer.id || appState.customer.id === 'CUSTOMER_NOT_DEFINED_ID';
      console.log(`🔐 [PLACE ORDER] User authentication status: ${isGuest ? 'GUEST' : 'AUTHENTICATED'}`);
      console.log(`🔐 [PLACE ORDER] Customer ID: ${appState.customer.id}`);

      if (isGuest) {
        const customerSetupStart = performance.now();
        console.log('🔓 [PLACE ORDER] Setting customer for guest checkout...');

        const customerData = {
          emailAddress: appState.customer.emailAddress || '',
          firstName: appState.customer.firstName || '',
          lastName: appState.customer.lastName || '',
          phoneNumber: appState.shippingAddress.phoneNumber || '',
        };

        try {
          const customerResult = await setCustomerForOrderMutation(customerData);

          if (customerResult.__typename === 'Order') {
            appState.activeOrder = customerResult as any;
            console.log(`⏱️ [PLACE ORDER] Customer setup (guest): ${(performance.now() - customerSetupStart).toFixed(2)}ms`);
          } else if (customerResult.__typename === 'EmailAddressConflictError') {
            // Guest email matches existing customer - order is automatically linked
            console.log('📧 [PLACE ORDER] Email conflict - fetching linked order...');
            const updatedOrder = await getActiveOrderQuery();
            if (updatedOrder) {
              appState.activeOrder = updatedOrder;
            }
            console.log(`⏱️ [PLACE ORDER] Customer setup (email conflict): ${(performance.now() - customerSetupStart).toFixed(2)}ms`);
          } else if (customerResult.__typename === 'GuestCheckoutError') {
            throw new Error('Guest checkout is not enabled. Please create an account or log in to continue.');
          } else if (customerResult.__typename === 'NoActiveOrderError') {
            throw new Error('No active order found. Please restart your checkout process.');
          } else {
            throw new Error('Failed to set customer for order: ' + (customerResult as any).message || 'Unknown error');
          }
        } catch (customerError) {
          const errorMessage = customerError instanceof Error ? customerError.message : 'Failed to set customer information.';
          modalError.value = errorMessage;
          isOrderProcessing.value = false;
          console.log(`❌ [PLACE ORDER] Customer setup failed after ${(performance.now() - customerSetupStart).toFixed(2)}ms`);
          return;
        }
      } else {
        console.log('✅ [PLACE ORDER] Order already has customer - skipping customer setup');
      }

      // Step 5: Submit address form
      const addressSubmitStart = performance.now();
      console.log('📍 [PLACE ORDER] Submitting address form...');
      if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
        await (window as any).submitCheckoutAddressForm();
        console.log(`⏱️ [PLACE ORDER] Address submission: ${(performance.now() - addressSubmitStart).toFixed(2)}ms`);
      } else {
        throw new Error('Failed to submit address form.');
      }

      // Address submission and shipping method setting is handled by CheckoutOptimizationService
      // during the address processing phase - no need to set shipping method again here

      // Step 6: Update PaymentIntent with amount and metadata BEFORE transitioning to ArrangingPayment
      // OPTIMIZATION: Use appState.activeOrder instead of querying backend (saves ~289ms)
      // This ensures webhook has complete metadata when payment is processed
      // OPTIMIZATION: Combined update saves ~1.5 seconds by eliminating one API round-trip
      if (selectedPaymentMethod.value === 'stripe' && typeof window !== 'undefined' && appState.activeOrder) {
        const paymentIntentUpdateStart = performance.now();
        console.log('💳 [PLACE ORDER] Updating PaymentIntent with order data...');
        try {
          const paymentIntentId = (window as any).__stripePaymentIntentId;
          if (paymentIntentId && appState.activeOrder.totalWithTax && appState.activeOrder.code && appState.activeOrder.id) {
            console.log(`[Checkout] Updating PaymentIntent ${paymentIntentId} for order ${appState.activeOrder.code}`);

            const importStart = performance.now();
            const { StripePaymentService } = await import('~/services/StripePaymentService');
            const { getStripePublishableKeyQuery } = await import('~/providers/shop/checkout/checkout');
            console.log(`⏱️ [PLACE ORDER] Stripe imports: ${(performance.now() - importStart).toFixed(2)}ms`);

            const keyStart = performance.now();
            const stripeKey = await getStripePublishableKeyQuery();
            console.log(`⏱️ [PLACE ORDER] Get Stripe key: ${(performance.now() - keyStart).toFixed(2)}ms`);

            const stripeService = new StripePaymentService(
              stripeKey,
              '/shop-api',
              getAuthHeaders
            );

            // Combined update: amount + metadata in a single API call
            // OPTIMIZED: Pass cartUuid to avoid backend retrieve call (saves ~700ms)
            const combinedUpdateStart = performance.now();
            const cartUuid = (window as any).__stripeCartUuid;
            await stripeService.updatePaymentIntentWithOrder(
              paymentIntentId,
              appState.activeOrder.totalWithTax,
              appState.activeOrder.code,
              parseInt(appState.activeOrder.id),
              cartUuid
            );
            console.log(`⏱️ [PLACE ORDER] Update PaymentIntent (combined): ${(performance.now() - combinedUpdateStart).toFixed(2)}ms`);
          }
          console.log(`⏱️ [PLACE ORDER] Total PaymentIntent update: ${(performance.now() - paymentIntentUpdateStart).toFixed(2)}ms`);
        } catch (updateError) {
          console.warn('[Checkout] Failed to update PaymentIntent (non-critical):', updateError);
          console.log(`⏱️ [PLACE ORDER] PaymentIntent update failed after: ${(performance.now() - paymentIntentUpdateStart).toFixed(2)}ms`);
        }
      }

      // Step 7: Transition to ArrangingPayment with complete PaymentIntent metadata
      const transitionStart = performance.now();
      console.log('🔄 [PLACE ORDER] Transitioning order to ArrangingPayment...');
      if (appState.activeOrder && appState.activeOrder.state !== 'ArrangingPayment') {
        const transitionResult = await transitionOrderToStateMutation('ArrangingPayment');
        if (transitionResult.transitionOrderToState && 'state' in transitionResult.transitionOrderToState) {
          appState.activeOrder = transitionResult.transitionOrderToState as any;
          console.log(`⏱️ [PLACE ORDER] Order transition: ${(performance.now() - transitionStart).toFixed(2)}ms`);
        } else {
            throw new Error('Failed to prepare the order for payment.');
        }
      } else {
        console.log(`⏱️ [PLACE ORDER] Order already in ArrangingPayment: ${(performance.now() - transitionStart).toFixed(2)}ms`);
      }

      // Step 8: Prefetch confirmation page and trigger payment
      // OPTIMIZATION: Use appState.activeOrder from transition mutation (saves ~292ms)
      if (appState.activeOrder?.state === 'ArrangingPayment') {
        // Prefetch confirmation page
        if (appState.activeOrder.code) {
          const prefetchStart = performance.now();
          await prefetchOrderConfirmation(appState.activeOrder.code);
          console.log(`⏱️ [PLACE ORDER] Prefetch confirmation: ${(performance.now() - prefetchStart).toFixed(2)}ms`);
        }

        // Trigger Stripe payment
        // Only trigger payment if we haven't already triggered it for this order
        // This prevents multiple payment attempts on the same order
        if (selectedPaymentMethod.value === 'stripe' && stripeTriggerSignal.value === 0) {
          console.log('💳 [PLACE ORDER] Triggering Stripe payment...');
          stripeTriggerSignal.value++;
        }

        console.log(`✅ [PLACE ORDER] TOTAL TIME: ${(performance.now() - startTime).toFixed(2)}ms`);
      } else {
        throw new Error('Order is not ready for payment. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred. Please check your information and try again.';
      modalError.value = errorMessage;
      isOrderProcessing.value = false;
      console.log(`❌ [PLACE ORDER] Failed after ${(performance.now() - startTime).toFixed(2)}ms: ${errorMessage}`);
    }
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {isCartEmpty.value ? (
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <div class="mb-6">
              <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <h2 class="font-heading tracking-wide text-2xl md:text-3xl font-bold mb-2">Your cart is empty</h2>
            <p class="font-body text-base text-gray-600 mb-6">Add some items to your cart to continue with checkout.</p>
            <Link
              href="/shop"
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#d42838] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 transition-colors cursor-pointer font-heading"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div class="bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
          <OrderProcessingModal
            visible={showProcessingModal.value}
            error={modalError.value}
            onClose$={$(() => {
              // Close modal and reset state to allow retry
              showProcessingModal.value = false;
              modalError.value = null;
              isOrderProcessing.value = false;
              // Reset stripe trigger to allow re-submission
              stripeTriggerSignal.value = 0;
            })}
          />
          
          <div class="max-w-7xl mx-auto pt-4 mb-12 px-4 sm:px-6 lg:px-8">
            {state.error && (
              <div class="rounded-xl bg-red-50 border border-red-200 p-6 my-6 shadow-sm">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-red-800">An error occurred</h3>
                    <div class="mt-2 text-sm text-red-700">
                      <p>{state.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div class="lg:grid lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
              {pageLoading.value && (
                <div class="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex justify-center items-center">
                  <div class="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 flex items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
                    <span class="ml-4 font-medium text-gray-900">Loading checkout...</span>
                  </div>
                </div>
              )}
              
              <div class="order-2 lg:order-1 mb-8 lg:mb-0">
                <div class="sticky top-4">
                  <div class="bg-[#f5f5f5] rounded-2xl border border-gray-200/50 shadow-lg backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-xl">
                    <div class="p-4 border-b border-gray-100">
                      <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-900">Your Order</h3>
                        <div class="h-1 w-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"></div>
                      </div>
                    </div>
                    <div class="bg-white mx-4 rounded-lg mb-4">
                      <div class="p-4">
                        <CartContents />
                      </div>
                    </div>
                    <div class="p-4">
                      <CartTotals localCart={localCart.localCart} />
                    </div>
                  </div>
                </div>
              </div>

              <div class="order-1 lg:order-2 mb-8 lg:mb-0">
                <div class="bg-[#f5f5f5] rounded-2xl border border-gray-200/50 shadow-lg backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-xl">
                  <div class="mb-6">
                    <CheckoutAddresses />
                  </div>
                  <div class="border-t border-gray-100 my-2"></div>
                  <div class="mb-6">
                    <Payment
                      triggerStripeSignal={stripeTriggerSignal}
                      selectedPaymentMethod={selectedPaymentMethod}
                      hideButton={true}
                      onForward$={$(async (orderCode: string) => {
                        paymentComplete.value = true;
                        navigate(`/checkout/confirmation/${orderCode}`);
                        state.loading = true;
                      })}
                      onError$={$(async (errorMessage: string) => {
                        console.error('[CHECKOUT] Payment error:', errorMessage);

                        // Show error in modal - user can close it and retry payment
                        // Cart and order state are preserved - no page reload needed
                        modalError.value = errorMessage || 'Payment processing failed. Please check your details and try again.';
                        isOrderProcessing.value = false;
                        // Don't reset stripeTriggerSignal here - let the modal close handler do it

                        console.log('[CHECKOUT] Payment failed - showing error modal');
                      })}
                      onProcessingChange$={$(async (isProcessing: boolean) => {
                        state.loading = isProcessing;
                        isOrderProcessing.value = isProcessing;
                      })}
                      isDisabled={false}
                    />
                  </div>
                  <div class="pt-2 border-t border-gray-100">
                    <div class="flex items-start space-x-3 mb-4">
                      <input
                        type="checkbox"
                        id="termsAcceptance"
                        checked={checkoutValidation.isTermsAccepted}
                        onChange$={(_, el) => {
                          validationActions.updateTermsAcceptance(el.checked);
                        }}
                        class="appearance-none mt-1 h-4 w-4 border-2 border-gray-300 rounded bg-white checked:border-primary-600 transition-colors duration-200"
                      />
                      <label for="termsAcceptance" class="text-sm text-gray-700 leading-5">
                        I agree to the{' '}
                        <Link 
                          href="/terms" 
                          target="_blank"
                          class="text-primary-600 hover:text-primary-700 underline font-medium"
                        >
                          Terms & Conditions
                        </Link>
                        {' '}and{' '}
                        <Link
                          href="/privacy" 
                          target="_blank"
                          class="text-primary-600 hover:text-primary-700 underline font-medium"
                        >
                          Privacy Policy
                        </Link>
                        {' '}<span class="text-red-500">*</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick$={placeOrder}
                      disabled={state.loading || !checkoutValidation.isAllValid || checkoutState.isLoading}
                      class={`w-full rounded-xl shadow-lg py-4 px-6 text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-50 transition-all duration-200 ${
                        state.loading || !checkoutValidation.isAllValid || checkoutState.isLoading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
                          : selectedPaymentMethod.value === 'sezzle'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 focus:ring-purple-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                            : 'bg-[#d42838] text-white hover:bg-black focus:ring-gray-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                      }`}
                      title={!checkoutValidation.isAllValid ? 'Please complete all required fields and accept the terms to continue' : ''}
                    >
                      {state.loading || checkoutState.isLoading ? (
                        <span class="flex items-center justify-center">
                          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <span class="flex items-center justify-center">
                          {selectedPaymentMethod.value === 'sezzle' ? (
                            <>
                              <span class="mr-2">🛍️</span>
                              Continue with Sezzle
                            </>
                          ) : (
                            <>
                              <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Place Order
                            </>
                          )}
                        </span>
                      )}
                    </button>
                    {!checkoutValidation.isAllValid && (
                      <p class="text-sm text-gray-500 mt-3 text-center">
                        Please complete all required fields and accept the terms to continue
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default component$(() => {
  return (
    <CheckoutValidationProvider>
      <CheckoutAddressProvider>
        <CheckoutContent />
      </CheckoutAddressProvider>
    </CheckoutValidationProvider>
  );
});

export const head = (): DocumentHead => {
  return createSEOHead({
    title: 'Checkout',
    description: 'Complete your purchase at Damned Designs.',
    noindex: true,
    links: []
  });
};
