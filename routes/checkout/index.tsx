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
import { APP_STATE } from '~/constants';
import { getActiveOrderQuery } from '~/providers/shop/orders/order';
import { CheckoutAddresses } from '~/components/checkout/CheckoutAddresses';
import { CheckoutAddressProvider } from '~/contexts/CheckoutAddressContext';
import { createSEOHead } from '~/utils/seo';
import Payment from '~/components/payment/Payment';
import { useLocalCart, refreshCartStock, loadCartIfNeeded } from '~/contexts/CartContext';
import { CheckoutValidationProvider, useCheckoutValidation, useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { OrderProcessingModal } from '~/components/OrderProcessingModal';
import { clearAllValidationCache } from '~/utils/cached-validation';
import { useCheckout } from '~/hooks/useCheckout';
import { transitionOrderToStateMutation } from '~/providers/shop/checkout/checkout';
import { setOrderShippingMethodMutation } from '~/providers/shop/orders/order';
import { LocalCartService } from '~/services/LocalCartService';

// Add route loader for SSR
export const useCheckoutLoader = routeLoader$(async () => {
  try {
    const order = await getActiveOrderQuery();
    return { 
      order,
      error: null
    };
  } catch (error) {
    console.error('[CheckoutLoader] Failed to load checkout data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return {
      order: null,
      error: error instanceof Error ? error.message : 'Failed to load checkout data'
    };
  }
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
      console.warn('[CheckoutAction] Missing required fields:', {
        hasEmail: !!formData.customerEmail,
        hasFirstName: !!formData.customerFirstName,
        hasLastName: !!formData.customerLastName,
        hasAddress: !!formData.shippingStreetLine1,
        timestamp: new Date().toISOString()
      });
      return fail(400, {
        error: 'Missing required fields',
        fields: formData
      });
    }
    
    return {
      success: true,
      orderCode: 'ORDER_' + Date.now()
    };

  } catch (error) {
    console.error('[CheckoutAction] Checkout processing failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
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
  const isCartEmpty = useSignal(false);
  const isOrderProcessing = useSignal(false);
  const showProcessingModal = useSignal(false);

  // Initialize checkout page
  useVisibleTask$(async () => {
    if (!pageLoading.value) return;

    console.log('[Checkout] Initializing checkout page');
    
    try {
      // Clear validation cache and hide cart
      clearAllValidationCache();
      appState.showCart = false;
      
      // Initialize active order from loader data if available
      if (loaderData.value.order && !loaderData.value.error) {
        console.log('[Checkout] Using order from loader data:', loaderData.value.order.code);
        appState.activeOrder = loaderData.value.order;
      } else {
        console.log('[Checkout] No valid order from loader data');
      }
      
      // Load cart if needed
      await loadCartIfNeeded(localCart);
      console.log('[Checkout] Cart loaded. Items count:', localCart.localCart.items.length);
      
      // Refresh stock levels for cart items
      if (localCart.localCart.items.length > 0) {
        try {
          await refreshCartStock(localCart);
          console.log('[Checkout] Stock levels refreshed successfully');
        } catch (stockError) {
          console.error('[Checkout] Failed to refresh stock levels:', {
            error: stockError instanceof Error ? stockError.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Update cart empty state
      const hasCartItems = localCart.localCart.items.length > 0;
      const hasOrderLines = (appState.activeOrder?.lines?.length ?? 0) > 0;
      isCartEmpty.value = !hasCartItems && !hasOrderLines;
      
      console.log('[Checkout] Initialization complete:', {
        hasCartItems,
        hasOrderLines,
        isEmpty: isCartEmpty.value
      });
        
    } catch (error) {
      console.error('[Checkout] Error during checkout initialization:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      state.error = 'Failed to load checkout. Please try again.';
    } finally {
      pageLoading.value = false;
    }

    // Cleanup function for global references
    return () => {
      console.log('[Checkout] Cleaning up global references');
      if (typeof window !== 'undefined') {
        delete (window as any).recordCacheHit;
        delete (window as any).recordCacheMiss;
        delete (window as any).submitCheckoutAddressForm;
        delete (window as any).submitStripeElements;
        delete (window as any).confirmStripePreOrderPayment;
      }
    };
  });

  // Handle cart validation when items change
  useVisibleTask$(async ({ track }) => {
    track(() => localCart.localCart.items);
    
    const hasCartItems = localCart.localCart.items.length > 0;
    const hasOrderLines = (appState.activeOrder?.lines?.length ?? 0) > 0;
    isCartEmpty.value = !hasCartItems && !hasOrderLines;
    
    // Update stock validation
    if (hasCartItems) {
      const stockValidation = LocalCartService.validateStock();
      validationActions.updateStockValidation(stockValidation.valid, stockValidation.errors);
      
      if (!stockValidation.valid) {
        console.warn('[Checkout] Stock validation failed:', stockValidation.errors);
      }
    } else {
      validationActions.updateStockValidation(true, []);
    }
  });

  const placeOrder = $(async () => {
    if (isOrderProcessing.value) {
      console.log('[Checkout] Order already processing, ignoring duplicate request');
      return;
    }

    console.log('[Checkout] Starting order placement process');
    showProcessingModal.value = true;
    isOrderProcessing.value = true;
    state.error = null;

    try {
      // Validate customer information
      if (!appState.customer?.emailAddress || !appState.customer?.firstName || !appState.customer?.lastName) {
        throw new Error('Please complete all required customer information.');
      }
      
      // Validate shipping address
      if (!appState.shippingAddress?.streetLine1 || !appState.shippingAddress?.city || !appState.shippingAddress?.province) {
        throw new Error('Please complete all required shipping address information.');
      }

      // Validate billing address if different billing is used
      if (checkoutValidation.useDifferentBilling && !appState.billingAddress?.streetLine1) {
        throw new Error('Please complete all required billing address information.');
      }
      
      console.log('[Checkout] All validations passed, converting cart to order');
      
      // Convert local cart to Vendure order
      let vendureOrder;
      try {
        vendureOrder = await convertLocalCartToVendureOrder();
        if (!vendureOrder) {
          throw new Error(checkoutState.error || 'Failed to create order from your cart.');
        }
        appState.activeOrder = vendureOrder;
        console.log('[Checkout] Successfully converted cart to order:', vendureOrder.code);
      } catch (conversionError) {
        console.error('[Checkout] Failed to convert cart to order:', {
          error: conversionError instanceof Error ? conversionError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        throw conversionError;
      }

      // Submit address form
      if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
        console.log('[Checkout] Submitting address form');
        await (window as any).submitCheckoutAddressForm();
      } else {
        throw new Error('Failed to submit address form.');
      }
        
      // Set shipping method based on country and order total
      try {
        if (appState.shippingAddress.countryCode && appState.activeOrder) {
          const { countryCode } = appState.shippingAddress;
          const subTotal = appState.activeOrder.subTotal || 0;
          const shippingMethodId = (countryCode === 'US' || countryCode === 'PR') 
            ? (subTotal >= 10000 ? '6' : '3') 
            : '7';
          
          console.log('[Checkout] Setting shipping method:', {
            countryCode,
            subTotal,
            shippingMethodId
          });
          
          const shippingResult = await setOrderShippingMethodMutation([shippingMethodId]);
          if (shippingResult && '__typename' in shippingResult && shippingResult.__typename === 'Order') {
            appState.activeOrder = shippingResult;
            console.log('[Checkout] Shipping method set successfully');
          } else {
            console.warn('[Checkout] Could not set preferred shipping method. Proceeding with default.');
          }
        }
      } catch (shippingError) {
        console.error('[Checkout] Error setting shipping method:', {
          error: shippingError instanceof Error ? shippingError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        // Don't throw here - continue with checkout
      }
      
      // Transition order to ArrangingPayment state if needed
      if (appState.activeOrder && appState.activeOrder.state !== 'ArrangingPayment') {
        console.log('[Checkout] Transitioning order to ArrangingPayment state');
        const transitionResult = await transitionOrderToStateMutation('ArrangingPayment');
        if (transitionResult.transitionOrderToState && 'state' in transitionResult.transitionOrderToState) {
          appState.activeOrder = transitionResult.transitionOrderToState as any;
          console.log('[Checkout] Order transitioned to ArrangingPayment successfully');
        } else {
            throw new Error('Failed to prepare the order for payment.');
        }
      }
      
      // Get latest order and trigger payment
      const latestOrder = await getActiveOrderQuery();
      if (latestOrder?.state === 'ArrangingPayment') {
        appState.activeOrder = latestOrder;
        console.log('[Checkout] Order ready for payment:', latestOrder.code);
        
        if (latestOrder.code) {
          await prefetchOrderConfirmation(latestOrder.code);
        }
        
        // Trigger payment if not already triggered
        if (selectedPaymentMethod.value === 'stripe' && stripeTriggerSignal.value === 0) {
          console.log('[Checkout] Triggering Stripe payment');
          stripeTriggerSignal.value++;
        }
      } else {
        console.error('[Checkout] Order not in ArrangingPayment state:', latestOrder?.state);
        throw new Error('Order is not ready for payment. Please try again.');
      }
      
    } catch (error) {
      console.error('[Checkout] Error during order placement:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      state.error = error instanceof Error ? error.message : 'An unknown error occurred. Please check your information and try again.';
      showProcessingModal.value = false;
      isOrderProcessing.value = false;
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
                      <CartTotals 
                        order={localCart.isLocalMode ? undefined : appState.activeOrder} 
                        localCart={localCart.isLocalMode ? localCart : undefined} 
                      />
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
                        console.log('[Checkout] Payment successful, navigating to confirmation:', orderCode);
                        paymentComplete.value = true;
                        navigate(`/checkout/confirmation/${orderCode}`);
                        state.loading = true;
                      })}
                      onError$={$(async (errorMessage: string) => {
                        console.error('[Checkout] Payment failed:', {
                          error: errorMessage,
                          timestamp: new Date().toISOString()
                        });
                        showProcessingModal.value = false;
                        state.error = errorMessage || 'Payment processing failed. Please check your details and try again.';
                        isOrderProcessing.value = false;
                        stripeTriggerSignal.value = 0;
                        
                        // Restore cart to local mode after payment failure
                        localCart.isLocalMode = true;
                        
                        try {
                          await transitionOrderToStateMutation('AddingItems');
                          console.log('[Checkout] Order transitioned back to AddingItems state');
                        } catch (transitionError) {
                          console.error('[Checkout] Failed to transition order back to AddingItems state:', {
                            error: transitionError instanceof Error ? transitionError.message : 'Unknown error',
                            timestamp: new Date().toISOString()
                          });
                        }
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
                          <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Place Order
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