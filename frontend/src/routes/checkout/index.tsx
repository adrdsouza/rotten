import { $, component$, useContext, useStore, useVisibleTask$, useSignal, useComputed$ } from '@builder.io/qwik';
import {
  useNavigate,
  routeAction$,
  zod$,
  z,
  Link,
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
import { recordCacheHit, recordCacheMiss, resetCacheMonitoring, enablePerformanceLogging, disablePerformanceLogging } from '~/utils/validation-cache-debug';
import { enableAutoCleanup, disableAutoCleanup } from '~/utils/validation-cache';
import { LocalCartService } from '~/services/LocalCartService';
import {
  secureCartConversion,
  secureSetOrderShippingMethod,
  secureOrderStateTransition
} from '~/utils/secure-api';


const prefetchOrderConfirmation = $((orderCode: string) => {
  if (typeof document !== 'undefined' && orderCode) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/checkout/confirmation/${orderCode}`;
    link.as = 'document';
    document.head.appendChild(link);
  }
});

// CORRECTED: The routeAction$ signature is now untyped.
// Qwik will automatically infer the correct types from the zod$ schema below.
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
  const state = useStore<CheckoutState>({
    loading: false,
    error: null,
  });

  const stripeTriggerSignal = useSignal(0);
  const selectedPaymentMethod = useSignal<string>('stripe');
  const pageLoading = useSignal(true);

  const isCartEmpty = useComputed$(() => {
    if (pageLoading.value) return false;

    return localCart.isLocalMode
      ? localCart.localCart.items.length === 0
      : !appState.activeOrder || !appState.activeOrder.lines || appState.activeOrder.lines.length === 0;
  });

  const isOrderProcessing = useSignal(false);
  const orderError = useSignal('');
  const showProcessingModal = useSignal(false);
  const paymentComplete = useSignal(false);

  useVisibleTask$(async ({ track }) => {
    if (pageLoading.value) {
      if (typeof window !== 'undefined') {
        (window as any).recordCacheHit = recordCacheHit;
        (window as any).recordCacheMiss = recordCacheMiss;
      }
      enablePerformanceLogging();
      enableAutoCleanup();
      clearAllValidationCache();
      resetCacheMonitoring();
      appState.showCart = false;
      await loadCartIfNeeded(localCart);

      if (localCart.isLocalMode && localCart.localCart.items.length > 0) {
        try {
          await refreshCartStock(localCart);
        } catch (error) {
          console.error('❌ Checkout: Failed to refresh stock levels:', error);
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

    track(() => localCart.isLocalMode ? localCart.localCart.items : appState.activeOrder?.lines);

    if (localCart.isLocalMode && localCart.localCart.items.length > 0) {
        const stockValidation = LocalCartService.validateStock();
        validationActions.updateStockValidation(stockValidation.valid, stockValidation.errors);
    } else if (!localCart.isLocalMode && appState.activeOrder?.lines) {
        const stockErrors: string[] = [];
        let hasStockIssues = false;
        for (const line of appState.activeOrder.lines) {
            const { stockLevel } = line.productVariant;
            const isOutOfStock = stockLevel === 'OUT_OF_STOCK' || (typeof stockLevel === 'number' && stockLevel <= 0);

            if (isOutOfStock) {
                stockErrors.push(`${line.productVariant.name} is out of stock.`);
                hasStockIssues = true;
            } else if (typeof stockLevel === 'number' && line.quantity > stockLevel) {
                stockErrors.push(`Only ${stockLevel} of ${line.productVariant.name} available.`);
                hasStockIssues = true;
            }
        }
        validationActions.updateStockValidation(!hasStockIssues, stockErrors);
    } else {
        validationActions.updateStockValidation(true, []);
    }

    return () => {
      disablePerformanceLogging();
      disableAutoCleanup();
    };
  });

  const _processPayment = $(async (paymentMethod: string = 'stripe') => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      if (import.meta.env.DEV) {
        console.log(`Address submission verified complete, triggering ${paymentMethod} payment...`);
      }

      if (paymentMethod === 'stripe' && stripeTriggerSignal.value === 0) {
        stripeTriggerSignal.value++;
        if (appState.activeOrder?.code) {
          await prefetchOrderConfirmation(appState.activeOrder?.code);
        }
      }
    } catch (error) {
      console.error('[Checkout/processPayment] Error:', error);
      state.error = error instanceof Error ? error.message : 'Order processing failed. Please try again.';
      isOrderProcessing.value = false;
    }
  });

  const _placeOrder = $(async () => {
    if (isOrderProcessing.value) return;
    
    if (typeof window !== 'undefined' && (window as any).submitStripeElements) {
      try {
        await (window as any).submitStripeElements();
      } catch (submitError) {
        state.error = `Payment validation failed: ${submitError instanceof Error ? submitError.message : 'Unknown error'}`;
        return;
      }
    } else {
      state.error = 'Payment system not ready. Please refresh and try again.';
      return;
    }
    
    showProcessingModal.value = true;
    isOrderProcessing.value = true;
    orderError.value = '';
    state.error = null;

    try {
      if (!appState.customer?.emailAddress || !appState.customer?.firstName || !appState.customer?.lastName) {
        throw new Error('Please complete all required customer information (email, first name, last name)');
      }
      
      if (!appState.shippingAddress?.streetLine1 || !appState.shippingAddress?.city ||
          !appState.shippingAddress?.province || !appState.shippingAddress?.postalCode ||
          !appState.shippingAddress?.countryCode) {
        throw new Error('Please complete all required shipping address information');
      }

      if (checkoutValidation.useDifferentBilling && (!appState.billingAddress?.streetLine1 || !appState.billingAddress?.city ||
          !appState.billingAddress?.province || !appState.billingAddress?.postalCode ||
          !appState.billingAddress?.countryCode)) {
        throw new Error('Please complete all required billing address information');
      }
      
      if (localCart.isLocalMode) {
        try {
          const vendureOrder = await secureCartConversion(localCart);

          if (!vendureOrder) {
            throw new Error('Failed to create order from cart');
          }
          appState.activeOrder = vendureOrder;
        } catch (conversionError) {
          if (conversionError instanceof Error) {
            state.error = `Failed to create order: ${conversionError.message}`;
          } else {
            state.error = 'Failed to create order. Please check your cart and try again.';
          }
          showProcessingModal.value = false;
          isOrderProcessing.value = false;
          return;
        }
      }

      if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
        await (window as any).submitCheckoutAddressForm();
      } else {
        state.error = 'Failed to submit address form';
        showProcessingModal.value = false;
        isOrderProcessing.value = false;
        return;
      }
      
      const waitForAddressSubmission = new Promise<void>((resolve, reject) => {
        const maxWaitTime = 10000;
        const intervalTime = 100;
        let elapsedTime = 0;

        const checkInterval = setInterval(() => {
          elapsedTime += intervalTime;
          if (addressState.addressSubmissionComplete || !addressState.addressSubmissionInProgress) {
            clearInterval(checkInterval);
            resolve();
          }
          if (elapsedTime >= maxWaitTime) {
            clearInterval(checkInterval);
            reject(new Error('Timeout waiting for address submission to complete'));
          }
        }, intervalTime);
      });

      try {
        await waitForAddressSubmission;
        
        try {
          let shippingMethodId: string | undefined;
          
          if (appState.shippingAddress.countryCode && appState.activeOrder) {
            const countryCode = appState.shippingAddress.countryCode;
            const subTotal = appState.activeOrder?.subTotal || 0;
            
            if (countryCode === 'US' || countryCode === 'PR') {
              shippingMethodId = subTotal >= 10000 ? '6' : '3';
            } else {
              shippingMethodId = '7';
            }
            
            const shippingResult = await secureSetOrderShippingMethod([shippingMethodId]);
            
            if (shippingResult && '__typename' in shippingResult && shippingResult.__typename === 'Order') {
              appState.activeOrder = shippingResult;
            } else {
              // Attempt to fallback
              const fallbackMethod = appState.activeOrder?.shippingLines?.find(line => line.shippingMethod.id !== shippingMethodId);
              if (fallbackMethod) {
                const fallbackResult = await secureSetOrderShippingMethod([fallbackMethod.shippingMethod.id]);
                if (fallbackResult && '__typename' in fallbackResult && fallbackResult.__typename === 'Order') {
                  appState.activeOrder = fallbackResult;
                } else {
                  state.error = 'There was an issue setting the shipping method. Proceeding without a specific shipping option.';
                }
              } else {
                 state.error = 'There was an issue setting the shipping method. Proceeding with default shipping options.';
              }
            }
          } else {
            state.error = 'Unable to determine shipping method due to missing information. Proceeding with default shipping options.';
          }
        } catch (_shippingError) {
          state.error = 'There was an error setting the shipping method. Proceeding with default shipping options.';
        }
        
        if (appState.activeOrder && appState.activeOrder?.state !== 'ArrangingPayment') {
          try {
            const transitionResult = await secureOrderStateTransition('ArrangingPayment');

            if (transitionResult && 'state' in transitionResult) {
              appState.activeOrder = transitionResult as any;
            }
          } catch (transitionError) {
            state.error = `Failed to prepare order for payment: ${transitionError instanceof Error ? transitionError.message : 'Unknown error'}`;
            isOrderProcessing.value = false;
            showProcessingModal.value = false;
            return;
          }
        }
        
        const latestOrder = await getActiveOrderQuery();
        if (latestOrder && latestOrder.id) {
          appState.activeOrder = latestOrder;
          if (latestOrder.state === 'ArrangingPayment') {
            if (selectedPaymentMethod.value === 'stripe' && stripeTriggerSignal.value === 0) {
              stripeTriggerSignal.value++;
              if (typeof window !== 'undefined' && (window as any).confirmStripePreOrderPayment) {
                try {
                  await (window as any).confirmStripePreOrderPayment(appState.activeOrder);
                } catch (paymentError) {
                  state.error = `Payment failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`;
                  showProcessingModal.value = false;
                  isOrderProcessing.value = false;
                }
              } else {
                state.error = 'Payment system not ready. Please refresh and try again.';
                showProcessingModal.value = false;
                isOrderProcessing.value = false;
              }

              if (appState.activeOrder?.code) {
                await prefetchOrderConfirmation(appState.activeOrder?.code);
              }
            }
          } else {
            state.error = 'Order is not ready for payment. Please try again.';
            showProcessingModal.value = false;
            isOrderProcessing.value = false;
          }
        } else {
          state.error = 'Order could not be found. Please restart the checkout process.';
          showProcessingModal.value = false;
          isOrderProcessing.value = false;
        }
      } catch (_waitError) {
        state.error = 'Address submission took too long or failed. Please try again.';
        showProcessingModal.value = false;
        isOrderProcessing.value = false;
      }
    } catch (_error) {
      orderError.value = 'There was a problem processing your order. Please check your information and try again.';
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
            <button
              onClick$={() => navigate('/shop')}
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#8a6d4a] hover:bg-[#4F3B26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8a6d4a] transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      ) : (
        <div class="bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
          <OrderProcessingModal 
            visible={showProcessingModal.value}
          />
          
          <div class="max-w-7xl mx-auto pt-8 mb-12 px-4 sm:px-6 lg:px-8">
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
                    <div class="p-4">
                      <CartContents />
                      <div class="border-t border-gray-100 pt-4 mt-4">
                        <CartTotals order={localCart.isLocalMode ? undefined : appState.activeOrder} localCart={localCart.isLocalMode ? localCart : undefined} />
                      </div>
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
                    <div class="space-y-6">
                      {checkoutValidation.stockErrors.length > 0 && (
                        <div class="text-sm text-red-500 mb-4 text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                          {checkoutValidation.stockErrors.map((error: string, index: number) => (
                            <p key={index}>{error}</p>
                          ))}
                        </div>
                      )}
                      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <Payment
                          triggerStripeSignal={stripeTriggerSignal}
                          selectedPaymentMethod={selectedPaymentMethod}
                          hideButton={false}
                          onForward$={$(async (orderCode: string) => {
                            paymentComplete.value = true;
                            navigate(`/checkout/confirmation/${orderCode}`);
                            state.loading = true;
                          })}
                          onError$={$(async (errorMessage: string) => {
                            showProcessingModal.value = false;
                            state.error = errorMessage || 'Payment processing failed. Please check your details and try again.';
                            state.loading = false;
                            isOrderProcessing.value = false;
                            stripeTriggerSignal.value = 0;
                          })}
                          onProcessingChange$={$(async (isProcessing: boolean) => {
                            state.loading = isProcessing;
                          })}
                          isDisabled={!checkoutValidation.isPaymentReady}
                        />
                      </div>
                      
                      <div class="mt-6 pt-6 border-t border-gray-100">
                        <div class="flex items-start space-x-3 mb-4">
                          <input
                            type="checkbox"
                            id="termsAcceptance"
                            class="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                            checked={checkoutValidation.isTermsAccepted}
                            onChange$={(_, el) => {
                              validationActions.updateTermsAcceptance(el.checked);
                            }}
                          />
                          <label for="termsAcceptance" class="text-sm text-gray-700">
                            I have read and agree to the website's{' '}
                            <Link 
                              href="/terms-and-conditions" 
                              target="_blank"
                              class="font-medium text-primary-600 hover:text-primary-500 underline"
                            >
                              terms and conditions
                            </Link>
                            {' '}and{' '}
                            <Link
                              href="/privacy-policy" 
                              target="_blank"
                              class="font-medium text-primary-600 hover:text-primary-500 underline"
                            >
                              privacy policy
                            </Link>
                            . <span class="text-red-600">*</span>
                          </label>
                        </div>
                        
                        <button
                          onClick$={_placeOrder}
                          disabled={!checkoutValidation.isAllValid || isOrderProcessing.value}
                          class={`w-full flex items-center justify-center space-x-3 py-4 px-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                            !checkoutValidation.isAllValid || isOrderProcessing.value
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                              : 'bg-gradient-to-r from-[#8a6d4a] to-[#4F3B26] hover:from-[#4F3B26] hover:to-[#3a2b1a] text-white cursor-pointer transform hover:scale-105'
                          }`}
                        >
                          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                          </svg>
                          <span>
                            {isOrderProcessing.value ? 'Processing Order...' : 'Place Order'}
                          </span>
                        </button>
                        
                        {!checkoutValidation.isAllValid && checkoutValidation.stockErrors.length === 0 && (
                          <p class="text-sm text-gray-500 mt-2 text-center">
                            Please complete all required fields and accept the terms to place your order
                          </p>
                        )}
                      </div>
                    </div>
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

export const head = () => {
  return createSEOHead({
    title: 'Checkout',
    description: 'Complete your purchase at Rotten Hand.',
    noindex: true,
    links: []
  });
};