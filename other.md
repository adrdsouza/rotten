import { $, component$, useContext, useStore, useVisibleTask$, useSignal, useComputed$, useTask$ } from '@builder.io/qwik';
import {
  useNavigate,
  routeAction$,
  zod$,
  z
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
import { useLocalCart, refreshCartStock, loadCartIfNeeded } from '~/contexts/CartContext';
import { CheckoutValidationProvider, useCheckoutValidation, useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { OrderProcessingModal } from '~/components/OrderProcessingModal';

import { clearAllValidationCache } from '~/utils/cached-validation';
import { recordCacheHit, recordCacheMiss, resetCacheMonitoring, enablePerformanceLogging, disablePerformanceLogging } from '~/utils/validation-cache-debug';
import { enableAutoCleanup, disableAutoCleanup } from '~/utils/validation-cache';
import {
  secureCartConversion,
  secureSetOrderShippingMethod,
  secureOrderStateTransition
} from '~/utils/secure-api';

const hasOutOfStockItems = (cart: any, appState: any): boolean => {
	const items = cart.isLocalMode ? cart.localCart.items : appState.activeOrder?.lines;
	if (!items) {
		return false;
	}
	for (const item of items) {
		if (item.productVariant.stockLevel === 'OUT_OF_STOCK' || item.productVariant.stockLevel <= 0) {
			return true;
		}
	}
	return false;
};

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
  step: 'unified' | 'processing'; // Simplified to unified single-step checkout
}

// Main checkout content component that uses validation context
const CheckoutContent = component$(() => {
  const navigate = useNavigate();
  const appState = useContext(APP_STATE);
  const localCart = useLocalCart();
  const checkoutValidation = useCheckoutValidation();
  const _validationActions = useCheckoutValidationActions();
  const state = useStore<CheckoutState>({
    loading: false,
    error: null,
    step: 'unified', // Start with unified single-step checkout
  });

  const isOutOfStock = useSignal(false);

	useTask$(({ track }) => {
		track(() => localCart.localCart.items);
		track(() => appState.activeOrder);
		isOutOfStock.value = hasOutOfStockItems(localCart, appState);
	});

  // Signals to trigger payment processing
  const stripeTriggerSignal = useSignal(0);
  const selectedPaymentMethod = useSignal<string>('stripe'); // Track selected payment method

  // Loading state for initial page load
  const pageLoading = useSignal(true);

  // Computed signal to determine if cart is empty (the Qwik way!)
  const isCartEmpty = useComputed$(() => {
    if (pageLoading.value) return false; // Don't show empty message while loading

    return localCart.isLocalMode
      ? localCart.localCart.items.length === 0
      : !appState.activeOrder || !appState.activeOrder.lines || appState.activeOrder.lines.length === 0;
  });
  
  // Order processing state signals
  const isOrderProcessing = useSignal(false);
  const orderError = useSignal('');
  
  // Modal visibility state for the epic loading animation
  const showProcessingModal = useSignal(false);
  const paymentComplete = useSignal(false);
  


  // Removed proceedToPayment$ handler - no longer needed for single-step checkout
  
  useVisibleTask$(async () => {
    // Setup cache monitoring for debug (expose to window for cache module)
    if (typeof window !== 'undefined') {
      (window as any).recordCacheHit = recordCacheHit;
      (window as any).recordCacheMiss = recordCacheMiss;
    }

    // Enable cache monitoring and auto-cleanup only for checkout page
    enablePerformanceLogging();
    enableAutoCleanup();

    // Clear all validation cache when checkout page loads
    clearAllValidationCache();
    resetCacheMonitoring();

    appState.showCart = false;
    pageLoading.value = true;

    // 🚀 FIX: Load cart data on page refresh - this was missing!
    // The cart popup loads cart data when clicked, but checkout page didn't load it on refresh
    loadCartIfNeeded(localCart);
    // console.log('✅ Checkout: Cart loaded on page refresh');

    // 🚀 FRESH STOCK: Refresh stock levels when entering checkout
    // Always refresh stock if in local mode, regardless of current item count
    // This ensures stock validation happens even if cart appears empty due to loading
    if (localCart.isLocalMode) {
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

        // Just set loading to false - let computed signal handle empty state
        pageLoading.value = false;

        // console.log(`✅ Local cart has ${localCart.localCart.items.length} items, proceeding with checkout`);
      } else {
        // console.log('🔄 Checkout in Vendure order mode, fetching order data...');

        // Existing Vendure order flow
        const actualOrder = await getActiveOrderQuery();

        // Just set loading to false - let computed signal handle empty state
        pageLoading.value = false;

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

    // Cleanup function to disable monitoring when leaving checkout page
    return () => {
      disablePerformanceLogging();
      disableAutoCleanup();
    };
  });

  // Process payment after address submission
  const _processPayment = $(async (paymentMethod: string = 'stripe') => {
    try {
      // Wait a moment for the address submission to complete
      // In a production app, we would use a proper callback or signal instead
      await new Promise(resolve => setTimeout(resolve, 500));

      // At this point, address submission should be complete since we're called after addressSubmissionComplete
      if (import.meta.env.DEV) {
        console.log(`Address submission verified complete, triggering ${paymentMethod} payment...`);
        console.log('💳 Payment data being prepared for submission:', {
          orderId: appState.activeOrder?.id,
          orderCode: appState.activeOrder?.code,
          orderTotal: appState.activeOrder?.totalWithTax,
          customerEmail: appState.customer?.emailAddress,
          customerName: `${appState.customer?.firstName} ${appState.customer?.lastName}`.trim(),
          billingAddress: appState.billingAddress || 'Using shipping address as billing',
          paymentMethod: paymentMethod,
        });
      }

      // Safeguard to prevent multiple payment triggers
      if (paymentMethod === 'stripe' && stripeTriggerSignal.value === 0) {
        stripeTriggerSignal.value++;

        // 🚀 PREFETCH OPTIMIZATION: Prefetch specific order confirmation as soon as payment starts
        if (appState.activeOrder?.code) {
          await prefetchOrderConfirmation(appState.activeOrder?.code);
        }
      }
    } catch (error) {
      console.error('[Checkout/processPayment] Error:', error);
      state.error = error instanceof Error ? error.message : 'Order processing failed. Please try again.';
      isOrderProcessing.value = false; // Reset processing state on error
    }
  });

  // Place order handler - called when payment method is ready and user clicks Place Order
  const _placeOrder = $(async () => {
    if (isOrderProcessing.value) return;
    
    // CRITICAL: Call elements.submit() IMMEDIATELY when user clicks pay, before any async work
    console.log('[Checkout] Calling elements.submit() immediately on Place Order click...');
    if (typeof window !== 'undefined' && (window as any).submitStripeElements) {
      try {
        await (window as any).submitStripeElements();
        console.log('[Checkout] Elements submitted successfully');
      } catch (submitError) {
        console.error('[Checkout] Elements submit failed:', submitError);
        state.error = `Payment validation failed: ${submitError instanceof Error ? submitError.message : 'Unknown error'}`;
        return;
      }
    } else {
      console.error('[Checkout] Elements submit function not available');
      state.error = 'Payment system not ready. Please refresh and try again.';
      return;
    }
    
    // 🎭 SHOW THE EPIC LOADING MODAL AFTER ELEMENTS SUBMIT
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

          // Don't transition state here - let it happen naturally after address submission
          // The order starts in 'AddingItems' state and will transition to 'ArrangingPayment'
          // automatically when addresses and shipping methods are set
          // console.log('✅ Order created in AddingItems state, proceeding to address submission...');

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
        
        // CRITICAL FIX: Transition order to ArrangingPayment state for payment processing after addresses are set
        if (appState.activeOrder && appState.activeOrder?.state !== 'ArrangingPayment') {
          console.log('🔄 Transitioning order to ArrangingPayment state after address submission...');
          console.log('📋 Current order details before transition:', {
            id: appState.activeOrder.id,
            code: appState.activeOrder.code,
            state: appState.activeOrder.state,
            hasCustomer: !!appState.activeOrder.customer,
            hasShippingAddress: !!appState.activeOrder.shippingAddress,
            hasShippingLines: appState.activeOrder.shippingLines?.length > 0,
            totalWithTax: appState.activeOrder.totalWithTax
          });

          try {
            const transitionResult = await secureOrderStateTransition('ArrangingPayment');
            console.log('✅ Order transition result:', transitionResult);

            // Update appState with the transitioned order
            if (transitionResult && 'state' in transitionResult) {
              appState.activeOrder = transitionResult as any;
              console.log(`✅ Order state updated to: ${appState.activeOrder?.state}`);
            }
          } catch (transitionError) {
            console.error('❌ Failed to transition order state:', transitionError);
            state.error = `Failed to prepare order for payment: ${transitionError instanceof Error ? transitionError.message : 'Unknown error'}`;
            isOrderProcessing.value = false;
            showProcessingModal.value = false;
            return;
          }
        } else {
          console.log('✅ Order already in ArrangingPayment state, no transition needed');
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
            if (selectedPaymentMethod.value === 'stripe' && stripeTriggerSignal.value === 0) {
              stripeTriggerSignal.value++;
              // console.log('🚀 Stripe pre-order payment processing triggered');

              // Call our pre-order payment confirmation function
              if (typeof window !== 'undefined' && (window as any).confirmStripePreOrderPayment) {
                try {
                  console.log('[Checkout] Calling pre-order payment confirmation...');
                  await (window as any).confirmStripePreOrderPayment(appState.activeOrder);
                  console.log('[Checkout] Pre-order payment confirmed successfully');
                } catch (paymentError) {
                  console.error('[Checkout] Pre-order payment confirmation failed:', paymentError);
                  state.error = `Payment failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`;
                  showProcessingModal.value = false;
                  isOrderProcessing.value = false;
                }
              } else {
                console.error('[Checkout] Pre-order payment confirmation function not available');
                state.error = 'Payment system not ready. Please refresh and try again.';
                showProcessingModal.value = false;
                isOrderProcessing.value = false;
              }

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
      {/* Empty cart message - reactive to cart state */}
      {isCartEmpty.value && (
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
      )}
      
      {!isCartEmpty.value && (
        <div class="bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
          {/* 🎭 Epic Order Processing Modal */}
          <OrderProcessingModal 
            visible={showProcessingModal.value}
          />
          
          <div class="max-w-7xl mx-auto pt-8 mb-12 px-4 sm:px-6 lg:px-8">
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

                    <CheckoutAddresses />
                  </div>

                  {/* Section divider */}
                  <div class="border-t border-gray-100 my-2"></div>

                  {/* Payment Section - Always Visible in Single-Step Checkout */}
                  <div class="mb-6">
                    <div class="space-y-6">
                      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
                        <Payment
                          triggerStripeSignal={stripeTriggerSignal}
                          selectedPaymentMethod={selectedPaymentMethod}
                          hideButton={false}
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
                            console.error('[Checkout/Payment onError] Error:', errorMessage);

                            // 🚀 COMPREHENSIVE ERROR RECOVERY: Enhanced error handling with fallback mechanisms
                            // Hide the processing modal on error
                            showProcessingModal.value = false;
                            state.error = errorMessage || 'Payment processing failed. Please check your details and try again.';
                            state.loading = false; // Ensure loading is stopped on error
                            isOrderProcessing.value = false; // Reset order processing state

                            // CRITICAL: Reset the payment triggers to allow retry with different payment methods
                            stripeTriggerSignal.value = 0;

                            // For single-step checkout, we don't need to transition order states
                            // The new pre-order flow handles this automatically
                          })}
                          onProcessingChange$={$(async (isProcessing: boolean) => {
                            // console.log('Payment processing state changed:', isProcessing);
                            state.loading = isProcessing;
                          })}
                          isDisabled={!checkoutValidation.isAllValid} // Disable payment until all validation complete
                        />
                      </div>
                      
                      {/* Main Place Order Button */}
                      <div class="mt-6 pt-6 border-t border-gray-100">
                        <button
                          onClick$={_placeOrder}
                          disabled={!checkoutValidation.isAllValid || isOrderProcessing.value || isOutOfStock.value}
                          class={`w-full flex items-center justify-center space-x-3 py-4 px-6 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                            !checkoutValidation.isAllValid || isOrderProcessing.value || isOutOfStock.value
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
                        
                        {/* Validation Status Indicator */}
                        {!checkoutValidation.isAllValid && !isOutOfStock.value && (
                          <p class="text-sm text-gray-500 mt-2 text-center">
                            Please complete all required fields to place your order
                          </p>
                        )}
						{isOutOfStock.value && (
							<p class="text-sm text-red-500 mt-2 text-center">Some items are out of stock.</p>
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
    description: 'Complete your purchase at Rotten Hand.',
    noindex: true,
    // 🚀 PREFETCH OPTIMIZATION: Removed invalid prefetch for /checkout/confirmation/
    // The confirmation route requires a specific order code parameter
    // We handle confirmation prefetching dynamically based on actual order codes
    links: []
  });
};



import { createContextId, useContext, useContextProvider, useStore, Slot, component$, useTask$, $ } from '@builder.io/qwik';

// Define the validation state structure
export interface CheckoutValidationState {
  // Customer validation
  isCustomerValid: boolean;
  customerErrors: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  
  // Address validation
  isShippingAddressValid: boolean;
  shippingAddressErrors: {
    streetLine1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
  };
  
  // Billing address validation (when different billing is used)
  isBillingAddressValid: boolean;
  billingAddressErrors: {
    firstName?: string;
    lastName?: string;
    streetLine1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
  };
  useDifferentBilling: boolean;
  
  // Payment validation
  isPaymentValid: boolean;
  paymentErrors: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };
  
  // Terms & Conditions validation (handled by Stripe)
  isTermsAccepted: boolean;
  
  // Overall validation state
  isAllValid: boolean;
  
  // Validation touched states to know if user has interacted with forms
  customerTouched: boolean;
  shippingAddressTouched: boolean;
  billingAddressTouched: boolean;
  paymentTouched: boolean;
}

// Context type - just the state
export type CheckoutValidationContext = CheckoutValidationState;

// Create the context
export const CheckoutValidationContextId = createContextId<CheckoutValidationContext>('checkout-validation');

// Hook to use the context
export const useCheckoutValidation = () => useContext(CheckoutValidationContextId);

// Initial state
const createInitialState = (): CheckoutValidationState => ({
  isCustomerValid: false,
  customerErrors: {},
  isShippingAddressValid: false,
  shippingAddressErrors: {},
  isBillingAddressValid: true, // Valid by default since it's optional
  billingAddressErrors: {},
  useDifferentBilling: false,
  isPaymentValid: false,
  paymentErrors: {},
  isTermsAccepted: false,
  isAllValid: false,
  customerTouched: false,
  shippingAddressTouched: false,
  billingAddressTouched: false,
  paymentTouched: false,
});

// Provider component
export const CheckoutValidationProvider = component$(() => {
  const state = useStore<CheckoutValidationState>(createInitialState());

  // Use a task to automatically recalculate overall validation when any validation state changes
  useTask$(({ track }) => {
    // Track validation properties needed for "Proceed to Payment" button
    const customerValid = track(() => state.isCustomerValid);
    const shippingValid = track(() => state.isShippingAddressValid);
    const billingValid = track(() => state.useDifferentBilling ? state.isBillingAddressValid : true);

    // Note: paymentValid and termsValid are NOT included here because:
    // - Payment validation happens AFTER clicking "Proceed to Payment"
    // - Terms acceptance happens on the payment step, not shipping step

    // Calculate overall validation for shipping step only
    const overall = customerValid && shippingValid && billingValid;

    // Update the state
    state.isAllValid = overall;

    console.log('[CheckoutValidation] Overall validation recalculated:', {
      customer: customerValid,
      shipping: shippingValid,
      billing: billingValid,
      overall
    });
  });

  // Use Qwik's useContextProvider - only provide the state
  useContextProvider(CheckoutValidationContextId, state);

  return <Slot />;
});

// Action functions that work with the context
export const useCheckoutValidationActions = () => {
  const state = useCheckoutValidation();

  return {
    updateCustomerValidation: $((isValid: boolean, errors: CheckoutValidationState['customerErrors'], touched = true) => {
      state.isCustomerValid = isValid;
      state.customerErrors = errors;
      if (touched) state.customerTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateShippingAddressValidation: $((isValid: boolean, errors: CheckoutValidationState['shippingAddressErrors'], touched = true) => {
      state.isShippingAddressValid = isValid;
      state.shippingAddressErrors = errors;
      if (touched) state.shippingAddressTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateBillingAddressValidation: $((isValid: boolean, errors: CheckoutValidationState['billingAddressErrors'], touched = true) => {
      state.isBillingAddressValid = isValid;
      state.billingAddressErrors = errors;
      if (touched) state.billingAddressTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updatePaymentValidation: $((isValid: boolean, errors: CheckoutValidationState['paymentErrors'], touched = true) => {
      state.isPaymentValid = isValid;
      state.paymentErrors = errors;
      if (touched) state.paymentTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateBillingMode: $((useDifferentBilling: boolean) => {
      state.useDifferentBilling = useDifferentBilling;
      // If switching to same billing, mark billing as valid
      if (!useDifferentBilling) {
        state.isBillingAddressValid = true;
        state.billingAddressErrors = {};
      }
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateTermsAcceptance: $((isAccepted: boolean) => {
      state.isTermsAccepted = isAccepted;
      // The useTask$ will automatically recalculate isAllValid
    }),

    resetValidation: $(() => {
      Object.assign(state, createInitialState());
      // The useTask$ will automatically recalculate isAllValid
    })
  };
};