import { $, component$, useContext, useStore, useVisibleTask$, useSignal, useComputed$ } from '@builder.io/qwik';
import { 
  useNavigate, 
  routeAction$, 
  zod$, 
  z, 
  Link,
  type DocumentHead
} from '@qwik.dev/router';
import CartContents from '~/components/cart-contents/CartContents';
import CartTotals from '~/components/cart-totals/CartTotals';
import { APP_STATE } from '~/constants';
import {
  getActiveOrderQuery,
} from '~/providers/shop/orders/order';
import { CheckoutAddresses } from '~/components/checkout/CheckoutAddresses';
import { addressState } from '~/utils/checkout-state';
import { createSEOHead } from '~/utils/seo';
import Payment from '~/components/payment/Payment';
import { useLocalCart, refreshCartStock, loadCartIfNeeded } from '~/contexts/CartContext';
import { CheckoutValidationProvider, useCheckoutValidation, useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { OrderProcessingModal } from '~/components/OrderProcessingModal';
import { clearAllValidationCache } from '~/utils/cached-validation';
import { 
  secureCartConversion, 
  secureOrderStateTransition,
  secureSetOrderShippingMethod
} from '~/utils/secure-api';
import { LocalCartService } from '~/services/LocalCartService';

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
    const checkoutData = {
      customerEmail: formData.customerEmail,
      customerFirstName: formData.customerFirstName,
      customerLastName: formData.customerLastName,
      customerPhone: formData.customerPhone,
      shippingStreetLine1: formData.shippingStreetLine1,
      shippingStreetLine2: formData.shippingStreetLine2,
      shippingCity: formData.shippingCity,
      shippingProvince: formData.shippingProvince,
      shippingPostalCode: formData.shippingPostalCode,
      shippingCountryCode: formData.shippingCountryCode,
      paymentMethod: formData.paymentMethod,
    };

    if (!checkoutData.customerEmail || !checkoutData.customerFirstName || 
        !checkoutData.customerLastName || !checkoutData.shippingStreetLine1) {
      return fail(400, {
        error: 'Missing required fields',
        fields: checkoutData
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
  const state = useStore<CheckoutState>({
    loading: false,
    error: null,
  });

  const nmiTriggerSignal = useSignal(0);
  const sezzleTriggerSignal = useSignal(0);
  const selectedPaymentMethod = useSignal<string>('nmi');
  const pageLoading = useSignal(true);
  
  const isCartEmpty = useComputed$(() => {
    if (pageLoading.value) return false;
    return localCart.isLocalMode
      ? localCart.localCart.items.length === 0
      : !appState.activeOrder || !appState.activeOrder.lines || appState.activeOrder.lines.length === 0;
  });

  const isOrderProcessing = useSignal(false);
  const showProcessingModal = useSignal(false);

  // Initialization and stock validation task
  useVisibleTask$(async ({ track }) => {
    // This task handles both initial setup and reactive stock validation
    
    // Initial page load setup (runs once)
    if (pageLoading.value) {
      clearAllValidationCache();
      appState.showCart = false;
      await loadCartIfNeeded(localCart);
      
      if (localCart.isLocalMode && localCart.localCart.items.length > 0) {
        try {
          await refreshCartStock(localCart);
        } catch (error) {
          console.error('Checkout: Failed to refresh stock levels:', error);
        }
      }
      
      try {
        if (!localCart.isLocalMode) {
          const actualOrder = await getActiveOrderQuery();
          if (actualOrder && actualOrder.id && !(actualOrder as any).errorCode) {
            appState.activeOrder = actualOrder;
          }
        }
      } catch (error) {
        console.error('[Checkout] Error during checkout initialization:', error);
        state.error = 'Failed to load checkout. Please try again.';
      } finally {
        pageLoading.value = false;
      }
    }

    // Reactive stock validation (runs whenever cart items change)
    track(() => localCart.isLocalMode ? localCart.localCart.items : appState.activeOrder?.lines);
    
    if (localCart.isLocalMode && localCart.localCart.items.length > 0) {
        // Use the service to validate stock correctly for LocalCartItem
        const stockValidation = LocalCartService.validateStock();
        validationActions.updateStockValidation(stockValidation.valid, stockValidation.errors);
    } else if (!localCart.isLocalMode && appState.activeOrder?.lines) {
        const stockErrors: string[] = [];
        let hasStockIssues = false;
        for (const line of appState.activeOrder.lines) {
            const stockLevel = parseInt(line.productVariant.stockLevel || '0');
            if (line.quantity > stockLevel) {
                stockErrors.push(`${line.productVariant.name}: Only ${stockLevel} available (you have ${line.quantity})`);
                hasStockIssues = true;
            }
        }
        validationActions.updateStockValidation(!hasStockIssues, stockErrors);
    } else {
        // Empty cart is valid
        validationActions.updateStockValidation(true, []);
    }
  });

  const placeOrder = $(async () => {
    if (isOrderProcessing.value) return;

    showProcessingModal.value = true;
    isOrderProcessing.value = true;
    state.error = null;

    try {
      // Step 1: Validate all required information
      if (!appState.customer?.emailAddress || !appState.customer?.firstName || !appState.customer?.lastName) {
        throw new Error('Please complete all required customer information (email, first name, last name).');
      }
      
      if (!appState.shippingAddress?.streetLine1 || !appState.shippingAddress?.city ||
          !appState.shippingAddress?.province || !appState.shippingAddress?.postalCode ||
          !appState.shippingAddress?.countryCode) {
        throw new Error('Please complete all required shipping address information.');
      }

      if (checkoutValidation.useDifferentBilling && (!appState.billingAddress?.streetLine1 || !appState.billingAddress?.city ||
          !appState.billingAddress?.province || !appState.billingAddress?.postalCode ||
          !appState.billingAddress?.countryCode)) {
        throw new Error('Please complete all required billing address information.');
      }
      
      // Step 2: Convert local cart to a Vendure order if necessary
      if (localCart.isLocalMode) {
        try {
          const vendureOrder = await secureCartConversion(localCart);
          if (!vendureOrder) {
            throw new Error('Failed to create order from your cart.');
          }
          appState.activeOrder = vendureOrder;
        } catch (conversionError) {
            throw new Error(conversionError instanceof Error ? conversionError.message : 'An unknown error occurred while creating your order.');
        }
      }

      // Step 3: Submit address form and wait for completion
      if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
        await (window as any).submitCheckoutAddressForm();
      } else {
        throw new Error('Failed to submit address form.');
      }
      
      await new Promise<void>((resolve, reject) => {
        const maxWaitTime = 10000; // 10 seconds
        const interval = setInterval(() => {
          if (addressState.addressSubmissionComplete || !addressState.addressSubmissionInProgress) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Timeout waiting for address submission to complete.'));
        }, maxWaitTime);
      });
        
      // Step 4: Set the shipping method
      try {
        if (appState.shippingAddress.countryCode && appState.activeOrder) {
          const { countryCode } = appState.shippingAddress;
          const subTotal = appState.activeOrder.subTotal || 0;
          const shippingMethodId = (countryCode === 'US' || countryCode === 'PR') 
            ? (subTotal >= 10000 ? '6' : '3') 
            : '7';
          
          const shippingResult = await secureSetOrderShippingMethod([shippingMethodId]);
          
          if (shippingResult && '__typename' in shippingResult && shippingResult.__typename === 'Order') {
            appState.activeOrder = shippingResult;
          } else {
            console.warn('Could not set preferred shipping method. Proceeding with default.');
          }
        }
      } catch (shippingError) {
        console.error('Error setting shipping method:', shippingError);
        // Do not block the order for this, but maybe log it.
      }
      
      // Step 5: Transition order to 'ArrangingPayment' state
      if (appState.activeOrder && appState.activeOrder.state !== 'ArrangingPayment') {
        const transitionResult = await secureOrderStateTransition('ArrangingPayment');
        if (transitionResult.transitionOrderToState && 'state' in transitionResult.transitionOrderToState) {
          appState.activeOrder = transitionResult.transitionOrderToState as any;
        } else {
            throw new Error('Failed to prepare the order for payment.');
        }
      }
      
      // Step 6: Final check and trigger payment
      const latestOrder = await getActiveOrderQuery();
      if (latestOrder?.state === 'ArrangingPayment') {
        appState.activeOrder = latestOrder;
        if (latestOrder.code) {
          await prefetchOrderConfirmation(latestOrder.code);
        }
        if (selectedPaymentMethod.value === 'nmi') {
          nmiTriggerSignal.value++;
        } else if (selectedPaymentMethod.value === 'sezzle') {
          sezzleTriggerSignal.value++;
        }
      } else {
        throw new Error('Order is not ready for payment. Please try again.');
      }
    } catch (error) {
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
                      <CartTotals order={localCart.isLocalMode ? undefined : appState.activeOrder} localCart={localCart.isLocalMode ? localCart : undefined} />
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
                      triggerNMISignal={nmiTriggerSignal}
                      triggerSezzleSignal={sezzleTriggerSignal}
                      selectedPaymentMethod={selectedPaymentMethod}
                      hideButton={true}
                      onForward$={$(async (orderCode: string) => {
                        navigate(`/checkout/confirmation/${orderCode}`);
                        state.loading = true;
                      })}
                      onError$={$(async (errorMessage: string) => {
                        showProcessingModal.value = false;
                        state.error = errorMessage || 'Payment processing failed. Please check your details and try again.';
                        isOrderProcessing.value = false;
                        nmiTriggerSignal.value = 0;
                        sezzleTriggerSignal.value = 0;
                        try {
                          await secureOrderStateTransition('AddingItems');
                        } catch (transitionError) {
                          console.error('Failed to transition order back to AddingItems state:', transitionError);
                        }
                      })}
                      onProcessingChange$={$(async (isProcessing: boolean) => {
                        state.loading = isProcessing;
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
                      disabled={state.loading || !checkoutValidation.isAllValid}
                      class={`w-full rounded-xl shadow-lg py-4 px-6 text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-50 transition-all duration-200 ${
                        state.loading || !checkoutValidation.isAllValid
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
                          : selectedPaymentMethod.value === 'sezzle'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 focus:ring-purple-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                            : 'bg-[#d42838] text-white hover:bg-black focus:ring-gray-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                      }`}
                      title={!checkoutValidation.isAllValid ? 'Please complete all required fields and accept the terms to continue' : ''}
                    >
                      {state.loading ? (
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
      <CheckoutContent />
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