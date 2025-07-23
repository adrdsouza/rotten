import { $, component$, useContext, useStore, useVisibleTask$, useSignal } from '@builder.io/qwik';
import { 
  useNavigate, 
  routeAction$, 
  zod$, 
  z, 
  Link
} from '@qwik.dev/router';
import CartContents from '~/components/cart-contents/CartContents';
import CartTotals from '~/components/cart-totals/CartTotals';
import { APP_STATE } from '~/constants';
import {
  getActiveOrderQuery,
} from '~/providers/shop/orders/order';
import { CheckoutAddresses } from '~/components/checkout/CheckoutAddresses';
// Import addressState from separate lightweight module
import { addressState } from '~/utils/checkout-state';
import { createSEOHead } from '~/utils/seo';
import Payment from '~/components/payment/Payment';
import { useLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { CheckoutValidationProvider, useCheckoutValidation, useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { OrderProcessingModal } from '~/components/OrderProcessingModal';
import { clearAllValidationCache } from '~/utils/cached-validation';
import { recordCacheHit, recordCacheMiss, resetCacheMonitoring } from '~/utils/validation-cache-debug';
import { 
  secureCartConversion, 
  secureOrderStateTransition,
  secureSetOrderShippingMethod
} from '~/utils/secure-api';

// 🚀 PREFETCH OPTIMIZATION: Removed invalid prefetch for /checkout/confirmation/
// The confirmation route requires a specific order code: /checkout/confirmation/[code]/
// We only prefetch when we have a valid order code (see prefetchOrderConfirmation below)

// 🚀 PREFETCH OPTIMIZATION: Enhanced prefetch for specific order confirmation
const prefetchOrderConfirmation = $((orderCode: string) => {
  if (typeof document !== 'undefined' && orderCode) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/checkout/confirmation/${orderCode}`;
    link.as = 'document';
    document.head.appendChild(link);
    // console.log(`🔗 Prefetched specific order confirmation: ${orderCode}`);
  }
});

// Progressive enhancement - checkout works without JavaScript
export const useCheckoutAction = routeAction$(async (formData, { fail }) => {
  try {
    const checkoutData = {
      // Extract form data for server-side processing
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

    // Validate required fields
    if (!checkoutData.customerEmail || !checkoutData.customerFirstName || 
        !checkoutData.customerLastName || !checkoutData.shippingStreetLine1) {
      return fail(400, {
        error: 'Missing required fields',
        fields: checkoutData
      });
    }

    // Server-side cart validation would happen here
    // This provides security even without JavaScript
    
    // For now, return success - actual payment processing would be here
    return {
      success: true,
      orderCode: 'ORDER_' + Date.now()
    };

  } catch (_error) {
    // console.error('Checkout action error:', error);
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

// Define the state shape for the checkout page
interface CheckoutState {
  loading: boolean;
  error: string | null;
}

// Main checkout content component that uses validation context
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

  // Signals to trigger payment processing
  const nmiTriggerSignal = useSignal(0);
  const sezzleTriggerSignal = useSignal(0);
  const selectedPaymentMethod = useSignal<string>('nmi'); // Track selected payment method

  // Loading state for initial page load
  const pageLoading = useSignal(true);
  
  // Empty cart redirect state
  const showEmptyCartMessage = useSignal(false);
  
  // Order processing state signals
  const isOrderProcessing = useSignal(false);
  const orderError = useSignal('');
  
  // Modal visibility state for the epic loading animation
  const showProcessingModal = useSignal(false);
  const paymentComplete = useSignal(false);
  
  useVisibleTask$(async () => {
    // Setup cache monitoring for debug (expose to window for cache module)
    if (typeof window !== 'undefined') {
      (window as any).recordCacheHit = recordCacheHit;
      (window as any).recordCacheMiss = recordCacheMiss;
    }
    
    // Clear all validation cache when checkout page loads
    clearAllValidationCache();
    resetCacheMonitoring();
    // console.log('[Checkout] Cleared validation cache and reset monitoring on page load');
    
    appState.showCart = false;
    pageLoading.value = true;

    // 🚀 FRESH STOCK: Refresh stock levels when entering checkout
    if (localCart.isLocalMode && localCart.localCart.items.length > 0) {
      try {
        await refreshCartStock(localCart);
        // console.log('✅ Checkout: Stock levels refreshed');
      } catch (_error) {
        // console.error('❌ Checkout: Failed to refresh stock levels:', error);
      }
    }

    // 🚀 PREFETCH OPTIMIZATION: Removed invalid prefetch - confirmation route requires order code
    // We'll prefetch the specific confirmation route only when order is successfully created

    try {
      // Check if we're in local cart mode or Vendure order mode
      if (localCart.isLocalMode) {
        // console.log('🛒 Checkout in LocalCart mode');

        // Check if local cart has items
        if (localCart.localCart.items.length === 0) {
          // console.log('🔄 No items in local cart, redirecting to shop...');
          pageLoading.value = false;
          showEmptyCartMessage.value = true;

          setTimeout(() => {
            // console.log('Redirecting to shop...');
            if (typeof window !== 'undefined') {
              window.location.href = '/shop';
            } else {
              navigate('/shop');
            }
          }, 2000);

          return;
        }

        // console.log(`✅ Local cart has ${localCart.localCart.items.length} items, proceeding with checkout`);
      } else {
        // console.log('🔄 Checkout in Vendure order mode, fetching order data...');

        // Existing Vendure order flow
        const _startTime = performance.now();
        const actualOrder = await getActiveOrderQuery();
        const _endTime = performance.now();
        // console.log(`⏱️ Order data fetched in ${(_endTime - _startTime).toFixed(0)}ms`);

        if (!actualOrder || !actualOrder.lines || actualOrder.lines.length === 0) {
          // console.log('🔄 No valid order found, redirecting to shop...');
          pageLoading.value = false;
          showEmptyCartMessage.value = true;

          setTimeout(() => {
            // console.log('Redirecting to shop...');
            if (typeof window !== 'undefined') {
              window.location.href = '/shop';
            } else {
              navigate('/shop');
            }
          }, 2000);

          return;
        }

        // Update appState with the actual order if it's valid
        if (actualOrder && actualOrder.id && !(actualOrder as any).errorCode) {
          appState.activeOrder = actualOrder;
        }
      }
    } catch (_error) {
      // console.error('[Checkout] Error during checkout initialization:', error);
      state.error = 'Failed to load checkout. Please try again.';
    } finally {
      pageLoading.value = false;
    }
  });

  // Process payment after address submission
  const _processPayment = $(async (paymentMethod: string = 'nmi') => {
    try {
      // Wait a moment for the address submission to complete
      // In a production app, we would use a proper callback or signal instead
      await new Promise(resolve => setTimeout(resolve, 500));

      // At this point, address submission should be complete since we're called after addressSubmissionComplete
      // console.log(`Address submission verified complete, triggering ${paymentMethod} payment...`);

      // Trigger payment processing via the selected payment component with detailed logging
      // console.log(`🔍 Triggering ${paymentMethod} payment processing with detailed diagnostics...`);
      // console.log('💳 Payment data being prepared for submission:', {
      //   orderId: appState.activeOrder?.id,
      //   orderCode: appState.activeOrder?.code,
      //   orderTotal: appState.activeOrder?.totalWithTax,
      //   customerEmail: appState.customer?.emailAddress,
      //   customerName: `${appState.customer?.firstName} ${appState.customer?.lastName}`.trim(),
      //   billingAddress: appState.billingAddress || 'Using shipping address as billing',
      //   paymentMethod: paymentMethod,
      // });

      // Safeguard to prevent multiple payment triggers
      if (paymentMethod === 'nmi' && nmiTriggerSignal.value === 0) {
        nmiTriggerSignal.value++;
        // console.log('🚀 NMI payment processing triggered');

        // 🚀 PREFETCH OPTIMIZATION: Prefetch specific order confirmation as soon as payment starts
        if (appState.activeOrder?.code) {
          await prefetchOrderConfirmation(appState.activeOrder?.code);
        }
      } else if (paymentMethod === 'sezzle' && sezzleTriggerSignal.value === 0) {
        sezzleTriggerSignal.value++;
        // console.log('🚀 Sezzle payment processing triggered');

        // 🚀 PREFETCH OPTIMIZATION: Prefetch specific order confirmation as soon as payment starts
        if (appState.activeOrder?.code) {
          await prefetchOrderConfirmation(appState.activeOrder?.code);
        }
      } else {
        // console.log('⚠️ Payment processing already triggered, ignoring additional trigger');
      }
    } catch (error) {
      // console.error('[Checkout/processPayment] Error:', error);
      state.error = error instanceof Error ? error.message : 'Order processing failed. Please try again.';
      isOrderProcessing.value = false; // Reset processing state on error
    }
  });

  // Place order handler - called when payment method is ready and user clicks Place Order
  const placeOrder = $(async () => {
    if (isOrderProcessing.value) return;
    
    // 🎭 SHOW THE EPIC LOADING MODAL IMMEDIATELY
    showProcessingModal.value = true;
    
    isOrderProcessing.value = true;
    orderError.value = '';
    state.error = null;

    try {
      // CRITICAL VALIDATION: Check all required information before proceeding
      // console.log('🔍 Validating all required information before order creation...');
      
      // 1. Validate customer information
      if (!appState.customer?.emailAddress || !appState.customer?.firstName || !appState.customer?.lastName) {
        throw new Error('Please complete all required customer information (email, first name, last name)');
      }
      
      // 2. Validate shipping address
      if (!appState.shippingAddress?.streetLine1 || !appState.shippingAddress?.city ||
          !appState.shippingAddress?.province || !appState.shippingAddress?.postalCode ||
          !appState.shippingAddress?.countryCode) {
        throw new Error('Please complete all required shipping address information');
      }

      // 3. Validate billing address if using a different billing address
      if (checkoutValidation.useDifferentBilling && (!appState.billingAddress?.streetLine1 || !appState.billingAddress?.city ||
          !appState.billingAddress?.province || !appState.billingAddress?.postalCode ||
          !appState.billingAddress?.countryCode)) {
        throw new Error('Please complete all required billing address information');
      }
      
      // 4. Validate payment information (check if NMI form has valid data)
      // We'll add this check by accessing the NMI component's validation state
      // For now, we'll rely on the NMI component's own validation during payment processing
      
      // console.log('✅ All validation checks passed, proceeding with order creation...');

      // If we're in LocalCart mode, convert to Vendure order first
      if (localCart.isLocalMode) {
        // console.log('🔄 Converting LocalCart to Vendure order...');

        try {
          // Convert local cart to Vendure order using secure function
          const vendureOrder = await secureCartConversion(localCart);

          if (!vendureOrder) {
            throw new Error('Failed to create order from cart');
          }

          // console.log('✅ Successfully converted LocalCart to Vendure order:', vendureOrder.code);

          // Update app state with the new Vendure order, ensuring order ID is saved within activeOrder
          appState.activeOrder = vendureOrder;
          // console.log('🆔 Order ID saved within activeOrder:', vendureOrder.id);
          
          // Switch to Vendure mode since we now have a real order
          // Note: This is handled automatically in the LocalCartService.convertToVendureOrder()
          
        } catch (conversionError) {
          // console.error('❌ Failed to convert LocalCart to Vendure order:', conversionError);
          
          if (conversionError instanceof Error) {
            if (conversionError.message.includes('Stock validation failed')) {
              state.error = `${conversionError.message}. Please review your cart and try again.`;
            } else {
              state.error = `Failed to create order: ${conversionError.message}`;
            }
          } else {
            state.error = 'Failed to create order. Please check your cart and try again.';
          }
          
          // Hide modal on conversion error
          showProcessingModal.value = false;
          isOrderProcessing.value = false;
          return;
        }
      }

      // Now proceed with address submission (works for both LocalCart-converted and existing Vendure orders)
      if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
        await (window as any).submitCheckoutAddressForm();
      } else {
        // console.error('submitCheckoutAddressForm function not found');
        state.error = 'Failed to submit address form';
        // Hide modal on address form error
        showProcessingModal.value = false;
        isOrderProcessing.value = false;
        return;
      }
      
      // Wait for the address submission to complete using a Promise-based approach
      // console.log('⏳ Waiting for address submission to complete...');
      const waitForAddressSubmission = new Promise<void>((resolve, reject) => {
        const maxWaitTime = 10000; // 10 seconds max wait
        const intervalTime = 100; // Check every 100ms
        let elapsedTime = 0;

        const checkInterval = setInterval(() => {
          elapsedTime += intervalTime;
          // Check address state directly from our imported addressState object
          if (addressState.addressSubmissionComplete || !addressState.addressSubmissionInProgress) {
            clearInterval(checkInterval);
            // console.log('✅ Address submission completed');
            resolve();
          }
          if (elapsedTime >= maxWaitTime) {
            clearInterval(checkInterval);
            // console.error('❌ Timeout waiting for address submission');
            reject(new Error('Timeout waiting for address submission to complete'));
          }
        }, intervalTime);
      });

      try {
        await waitForAddressSubmission;
        
        // CRITICAL FIX: Set shipping method AFTER address submission
        // Now that the order has addresses, we can determine and set the shipping method
        // console.log('🚀 Setting shipping method after address submission...');
        try {
          // Get the shipping method based on the submitted address country and order total
          let shippingMethodId: string | undefined;
          
          if (appState.shippingAddress.countryCode && appState.activeOrder) {
            // console.log('🚚 Address submitted, determining shipping method...');

            // Log current order state for debugging
            // console.log('📦 Current order state:', appState.activeOrder?.state);
            // console.log('📦 Current order shipping lines:', appState.activeOrder?.shippingLines);

            // Get available shipping methods for this order
            if (appState.activeOrder?.shippingLines && appState.activeOrder.shippingLines.length > 0) {
              // console.log('🚚 Available shipping methods:', appState.activeOrder.shippingLines.map(line => ({
              //   id: line.shippingMethod.id,
              //   name: line.shippingMethod.name,
              //   code: line.shippingMethod.code
              // })));
            } else {
              // console.log('⚠️ No shipping lines available in order - this may be the issue!');
            }
            
            const countryCode = appState.shippingAddress.countryCode;
            const subTotal = appState.activeOrder?.subTotal || 0;
            
            // console.log(`🚀 Determining shipping method for ${countryCode} with subtotal ${subTotal}`);
            
            // Use the same shipping logic as the Cart component but with numerical IDs
            if (countryCode === 'US' || countryCode === 'PR') {
              if (subTotal >= 10000) { // $100.00 or more in cents
                shippingMethodId = '6'; // free-shipping (US_PR_OVER_100)
              } else {
                shippingMethodId = '3'; // usps (US_PR_UNDER_100)
              }
            } else {
              shippingMethodId = '7'; // usps-int (INTERNATIONAL)
            }
            
            // console.log(`✅ Selected shipping method: ${shippingMethodId} for ${countryCode}`);
            
            // Set the shipping method on the order
            // console.log(`🚀 Attempting to set shipping method: ${shippingMethodId}`);
            const shippingResult = await secureSetOrderShippingMethod([shippingMethodId]);
            
            if (shippingResult && '__typename' in shippingResult && shippingResult.__typename === 'Order') {
              // console.log('✅ Shipping method set successfully');
              // Update appState with the updated order
              appState.activeOrder = shippingResult;
            } else {
              // console.error('❌ Failed to set shipping method. Full result:', JSON.stringify(shippingResult, null, 2));

              // Check if it's an error result with specific error message
              if (shippingResult && '__typename' in shippingResult) {
                // console.error(`❌ GraphQL Error: ${shippingResult.__typename}`);
                if ('message' in shippingResult) {
                  // console.error(`❌ Error message: ${shippingResult.message}`);
                }
                if ('errorCode' in shippingResult) {
                  // console.error(`❌ Error code: ${shippingResult.errorCode}`);
                }
              }
              
              // Attempt to fallback to another shipping method if available
              if (appState.activeOrder?.shippingLines && appState.activeOrder.shippingLines.length > 0) {
                // console.log('🔄 Attempting fallback to another shipping method...');
                const fallbackMethod = appState.activeOrder?.shippingLines?.find(line => line.shippingMethod.id !== shippingMethodId);
                if (fallbackMethod) {
                  // console.log(`🚀 Trying fallback shipping method: ${fallbackMethod.shippingMethod.id}`);
                  const fallbackResult = await secureSetOrderShippingMethod([fallbackMethod.shippingMethod.id]);
                  if (fallbackResult && '__typename' in fallbackResult && fallbackResult.__typename === 'Order') {
                    // console.log('✅ Fallback shipping method set successfully');
                    appState.activeOrder = fallbackResult;
                  } else {
                    // console.error('❌ Fallback shipping method also failed:', JSON.stringify(fallbackResult, null, 2));
                    // console.log('ℹ️ Continuing with checkout despite shipping method issues...');
                    state.error = 'There was an issue setting the shipping method. Proceeding without a specific shipping option.';
                  }
                } else {
                  // console.log('⚠️ No alternative shipping method found for fallback.');
                  // console.log('ℹ️ Continuing with checkout despite shipping method warning...');
                  state.error = 'There was an issue setting the shipping method. Proceeding with default shipping options.';
                }
              } else {
                // console.log('⚠️ No shipping lines available for fallback.');
                // console.log('ℹ️ Continuing with checkout despite shipping method warning...');
                state.error = 'There was an issue setting the shipping method. Proceeding with default shipping options.';
              }
            }
          } else {
            // console.warn('⚠️ Missing country code or active order for shipping method determination');
            state.error = 'Unable to determine shipping method due to missing information. Proceeding with default shipping options.';
          }
        } catch (_shippingError) {
          // console.error('❌ Error setting shipping method:', shippingError);
          // Don't fail the entire checkout for shipping method issues, but inform the user
          // console.log('ℹ️ Continuing with checkout despite shipping method error...');
          state.error = 'There was an error setting the shipping method. Proceeding with default shipping options.';
        }
        
        // Transition order to ArrangingPayment state for payment processing after addresses are set
        if (appState.activeOrder && appState.activeOrder?.state !== 'ArrangingPayment') {
          // console.log('🔄 Transitioning order to ArrangingPayment state after address submission...');
          try {
            await secureOrderStateTransition('ArrangingPayment');
            // console.log('✅ Order successfully transitioned to ArrangingPayment state');
          } catch (_transitionError) {
            // console.error('❌ Failed to transition order state:', transitionError);
            state.error = 'Failed to prepare order for payment. Please try again.';
            isOrderProcessing.value = false;
            return;
          }
        } else {
          // console.log('✅ Order already in ArrangingPayment state, no transition needed');
        }
        
        // Safety check: Fetch the latest order state to ensure it's in ArrangingPayment before proceeding to payment
        const latestOrder = await getActiveOrderQuery();
        if (latestOrder && latestOrder.id) {
          appState.activeOrder = latestOrder; // Update appState with the latest order data
          // console.log('🆔 Order ID updated within activeOrder:', latestOrder.id);
          if (latestOrder.state === 'ArrangingPayment') {
            // console.log('✅ Order is in correct state for payment processing');
            // console.log(`💳 Triggering ${selectedPaymentMethod.value} payment processing`);

            // Trigger the appropriate payment method based on user selection
            if (selectedPaymentMethod.value === 'nmi' && nmiTriggerSignal.value === 0) {
              nmiTriggerSignal.value++;
              // console.log('🚀 NMI payment processing triggered');

              // Prefetch order confirmation
              if (appState.activeOrder?.code) {
                await prefetchOrderConfirmation(appState.activeOrder?.code);
              }
            } else if (selectedPaymentMethod.value === 'sezzle' && sezzleTriggerSignal.value === 0) {
              sezzleTriggerSignal.value++;
              // console.log('🚀 Sezzle payment processing triggered');

              // Prefetch order confirmation
              if (appState.activeOrder?.code) {
                await prefetchOrderConfirmation(appState.activeOrder?.code);
              }
            } else {
              // console.log('⚠️ Payment processing already triggered or unknown payment method');
            }

            // Keep the processing modal open since payment is now being processed
            // The payment components will handle hiding the modal on completion/error
          } else {
            // console.error('❌ Order is not in ArrangingPayment state, current state:', latestOrder.state);
            state.error = 'Order is not ready for payment. Please try again.';
            // Hide modal on state error
            showProcessingModal.value = false;
            isOrderProcessing.value = false;
          }
        } else {
          // console.error('❌ No valid order found after address submission, order state:', latestOrder);
          state.error = 'Order could not be found. Please restart the checkout process.';
          // Hide modal on order not found error
          showProcessingModal.value = false;
          isOrderProcessing.value = false;
        }
      } catch (_waitError) {
        // console.error('❌ Error waiting for address submission:', waitError);
        state.error = 'Address submission took too long or failed. Please try again.';
        // Hide modal on wait error
        showProcessingModal.value = false;
        isOrderProcessing.value = false;
      }
    } catch (_error) {
      // console.error('Error during order placement:', error);
      orderError.value = 'There was a problem processing your order. Please check your information and try again.';
      // Hide the processing modal on error
      showProcessingModal.value = false;
      isOrderProcessing.value = false;
    }
  });

  // Render all sections of checkout at once
  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Empty cart message */}
      {showEmptyCartMessage.value && (
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <div class="mb-6">
              <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
            </div>
            <h2 class="font-heading tracking-wide text-2xl md:text-3xl font-bold mb-2">Your cart is empty</h2>
            <p class="font-body text-base text-gray-600 mb-4">Redirecting you to the shop to browse our collection...</p>
            <div class="flex justify-center">
              <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-black"></div>
            </div>
          </div>
        </div>
      )}
      
      {(appState.activeOrder?.id || (localCart.isLocalMode && localCart.localCart.items.length > 0)) && (
        <div class="bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
          {/* 🎭 Epic Order Processing Modal */}
          <OrderProcessingModal 
            visible={showProcessingModal.value}
          />
          
          <div class="max-w-7xl mx-auto pt-4 mb-12 px-4 sm:px-6 lg:px-8">
            {/* Error message - shows at the top if there's an error */}
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
              {/* Loading overlay */}
              {pageLoading.value && (
                <div class="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex justify-center items-center">
                  <div class="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200 flex items-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
                    <span class="ml-4 font-medium text-gray-900">Loading checkout...</span>
                  </div>
                </div>
              )}
              
              {/* Left column - Order summary */}
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

              {/* Right column - Unified Checkout Form */}
              <div class="order-1 lg:order-2 mb-8 lg:mb-0">
                {/* Single unified checkout form */}
                <div class="bg-[#f5f5f5] rounded-2xl border border-gray-200/50 shadow-lg backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-xl">
                  {/* Shipping and Payment Info Section */}
                  <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                      Shipping and Payment Info
                    </h3>
                    <CheckoutAddresses />
                  </div>

                  {/* Section divider */}
                  <div class="border-t border-gray-100 my-2"></div>

                  {/* Payment Section */}
                  <div class="mb-6">
                    <Payment
                      triggerNMISignal={nmiTriggerSignal}
                      triggerSezzleSignal={sezzleTriggerSignal}
                      selectedPaymentMethod={selectedPaymentMethod}
                      hideButton={true}
                      onForward$={$(async (orderCode: string) => {
                        // console.log('🎉 Payment successful, order code:', orderCode);

                        // Trigger the ritual complete message immediately
                        paymentComplete.value = true;

                        // Navigate immediately to confirmation page (independent of modal)
                        // console.log('🚀 Navigating to confirmation page immediately...');
                        navigate(`/checkout/confirmation/${orderCode}`);
                        
                        // Keep loading state true until navigation completes
                        state.loading = true;
                      })}
                      onError$={$(async (errorMessage: string) => {
                        // console.error('[Checkout/Payment onError] Error:', errorMessage);
                        // Hide the processing modal on error
                        showProcessingModal.value = false;
                        state.error = errorMessage || 'Payment processing failed. Please check your details and try again.';
                        state.loading = false; // Ensure loading is stopped on error
                        isOrderProcessing.value = false; // Reset order processing state
                        
                        // CRITICAL: Reset the payment triggers to allow retry with different payment methods
                        nmiTriggerSignal.value = 0;
                        sezzleTriggerSignal.value = 0;
                        // console.log('🔄 Reset payment trigger signals to allow retry');
                        
                        // Transition order back to AddingItems state to allow modifications
                        try {
                          // console.log('🔄 Transitioning order back to AddingItems state after failed payment...');
                          await secureOrderStateTransition('AddingItems');
                          // console.log('✅ Order transitioned back to AddingItems state');
                        } catch (_transitionError) {
                          // console.error('❌ Failed to transition order back to AddingItems state:', transitionError);
                        }
                      })}
                      onProcessingChange$={$(async (isProcessing: boolean) => {
                        // console.log('Payment processing state changed:', isProcessing);
                        state.loading = isProcessing;
                      })}
                      isDisabled={false}
                    />
                  </div>
                  
                  {/* Terms & Conditions Checkbox */}
                  <div class="pt-2 border-t border-gray-100">
                    <div class="flex items-start space-x-3 mb-4">
                      <input
                        type="checkbox"
                        id="termsAcceptance"
                        checked={checkoutValidation.isTermsAccepted}
                        onChange$={(_, el) => {
                          validationActions.updateTermsAcceptance(el.checked);
                        }}
                        class="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors duration-200"
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

                  {/* Place Order Button */}
                  <div>
                    <button
                      onClick$={placeOrder}
                      disabled={state.loading || !checkoutValidation.isAllValid}
                      class={`w-full rounded-xl shadow-lg py-4 px-6 text-lg font-semibold focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-gray-50 transition-all duration-200 ${
                        state.loading || !checkoutValidation.isAllValid
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60 shadow-none'
                          : selectedPaymentMethod.value === 'sezzle'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 focus:ring-purple-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                            : 'bg-gradient-to-r from-gray-900 to-black text-white hover:from-black hover:to-gray-800 focus:ring-gray-500 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                      }`}
                      title={!checkoutValidation.isAllValid ? 'Please complete all required information' : ''}
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
                        Please complete all required information to continue
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

// Export the main component wrapped with validation provider
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
    description: 'Complete your purchase at Damned Designs.',
    noindex: true,
    // 🚀 PREFETCH OPTIMIZATION: Removed invalid prefetch for /checkout/confirmation/
    // The confirmation route requires a specific order code parameter
    // We handle confirmation prefetching dynamically based on actual order codes
    links: []
  });
};
