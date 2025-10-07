import { component$, noSerialize, useStore, useVisibleTask$, $ } from '@qwik.dev/core';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
  getStripePublishableKeyQuery
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { StripePaymentService } from '~/services/StripePaymentService';
import { PaymentError } from '~/services/payment-error-handler';
import { PaymentErrorDisplay } from './PaymentErrorDisplay';
import { AUTH_TOKEN } from '~/constants';
import { getCookie } from '~/utils';

import XCircleIcon from '../icons/XCircleIcon';

let _stripe: Promise<Stripe | null>;

function getStripe(publishableKey: string) {
  if (!_stripe && publishableKey) {
    _stripe = loadStripe(publishableKey);
  }
  return _stripe;
}

export default component$(() => {
  const localCart = useLocalCart();
  // CRITICAL: Don't track appState to prevent re-renders during order state transitions
  // const appState = useContext(APP_STATE);

  // CRITICAL: Extract cart UUID once to avoid tracking localCart reactivity
  // If we track localCart, any change to it (like isLocalMode) will cause remount
  const cartUuid = localCart.cartUuid;

  const store = useStore({
    clientSecret: '',
    paymentIntentId: '',
    resolvedStripe: undefined as Stripe | undefined,
    stripeElements: undefined as StripeElements | undefined,
    error: '',
    paymentError: null as PaymentError | null,
    isProcessing: false,
    debugInfo: 'Initializing...',
  });

  // Function to initialize Stripe Elements (called once on component mount)
  const initializeElements = $(async () => {
    console.log('[StripePayment] initializeElements called');

    // CRITICAL: Read cart values once at the start to avoid reactive tracking
    // If we access localCart properties during execution, changes to localCart will trigger remounts
    const cartSnapshot = {
      items: localCart?.localCart?.items || [],
      subTotal: localCart?.localCart?.subTotal || 0,
      appliedCoupon: localCart?.appliedCoupon
    };

    // Check cart state
    if (cartSnapshot.items.length === 0) {
      store.debugInfo = 'Waiting for cart items...';
      store.error = 'Cart is empty. Please add items to continue.';
      return false;
    }

    try {
      // Get Stripe publishable key
      const stripeKey = await getStripePublishableKeyQuery();
      console.log('[StripePayment] Loading Stripe with key:', stripeKey);

      // Initialize Stripe if not already done
      if (!store.resolvedStripe || typeof store.resolvedStripe.elements !== 'function') {
        const stripe = await getStripe(stripeKey);
        if (!stripe) {
          store.error = 'Failed to load Stripe';
          store.debugInfo = 'Error: Stripe failed to load';
          return false;
        }
        store.resolvedStripe = noSerialize(stripe) as Stripe;
        console.log('[StripePayment] Stripe instance initialized:', typeof store.resolvedStripe?.elements);
      }

      // Create PaymentIntent only if we don't have one (not on recreation)
      if (!store.clientSecret) {
        console.log('[StripePayment] Creating PaymentIntent...');
        const stripeService = new StripePaymentService(
          stripeKey,
          '/shop-api',
          $(() => {
            const token = getCookie(AUTH_TOKEN);
            const headers: Record<string, string> = {};
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }
            return headers;
          })
        );

        // Calculate total including shipping using snapshot values
        const subtotal = cartSnapshot.subTotal;
        const discount = cartSnapshot.appliedCoupon?.discountAmount || 0;
        const subtotalAfterDiscount = subtotal - discount;

        let shipping = 0;
        let countryCode = '';

        if (typeof window !== 'undefined') {
          try {
            const shippingData = localStorage.getItem('checkout-shipping-address');
            if (shippingData) {
              const shippingAddress = JSON.parse(shippingData);
              countryCode = shippingAddress.countryCode || '';
            }
          } catch (error) {
            console.warn('[StripePayment] Failed to get shipping address from localStorage:', error);
          }
        }

        if (countryCode) {
          if (cartSnapshot.appliedCoupon?.freeShipping) {
            shipping = 0;
          } else {
            if (countryCode === 'US' || countryCode === 'PR') {
              shipping = subtotalAfterDiscount >= 10000 ? 0 : 800;
            } else {
              shipping = 2000;
            }
          }
        }

        const estimatedTotal = subtotalAfterDiscount + shipping;

        console.log('[StripePayment] Payment calculation:', {
          subtotal,
          discount,
          subtotalAfterDiscount,
          shipping,
          estimatedTotal,
          countryCode
        });

        const paymentIntent = await stripeService.createPaymentIntent(
          estimatedTotal,
          'usd',
          cartUuid
        );

        if (!paymentIntent?.clientSecret) {
          store.error = 'Failed to create payment intent';
          store.debugInfo = 'Error: No client secret received';
          return false;
        }

        store.clientSecret = paymentIntent.clientSecret;
        store.paymentIntentId = paymentIntent.paymentIntentId;
        console.log('[StripePayment] PaymentIntent created:', paymentIntent.paymentIntentId);

        // Store PaymentIntent ID globally for checkout flow
        if (typeof window !== 'undefined') {
          (window as any).__stripePaymentIntentId = paymentIntent.paymentIntentId;
        }

        // Upsert cart mapping (create or update)
        try {
          await stripeService.createCartMapping(cartUuid);
          console.log('[StripePayment] Cart mapping created successfully');
        } catch (_error) {
          // Expected on retry - cart mapping already exists, just update it
          console.log('[StripePayment] Cart mapping exists, updating with new PaymentIntent ID');
        }

        // Update cart mapping with PaymentIntent ID
        try {
          await stripeService.updateCartMappingPaymentIntent(cartUuid, store.paymentIntentId);
          console.log('[StripePayment] Cart mapping updated with PaymentIntent ID');
        } catch (mappingError) {
          console.warn('[StripePayment] Cart mapping update failed (non-critical):', mappingError);
        }
      }

      // Create Elements
      console.log('[StripePayment] Creating Stripe Elements...');
      if (!store.resolvedStripe) {
        store.error = 'Stripe not initialized';
        return false;
      }

      const elements = store.resolvedStripe.elements({
        clientSecret: store.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#937237',
            colorBackground: '#ffffff',
            colorText: '#1a1a1a',
            colorDanger: '#df1b41',
            fontFamily: 'system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      });

      store.stripeElements = noSerialize(elements) as StripeElements;

      // Mount payment element
      const paymentElement = elements.create('payment', {
        layout: {
          type: 'tabs',
          defaultCollapsed: false,
        },
      });

      // Use static ID since cart UUID is now stable across remounts
      const formId = 'payment-form';
      const paymentFormElement = document.getElementById(formId);
      if (!paymentFormElement) {
        store.error = 'Payment form element not found';
        console.error('[StripePayment] Could not find element with ID:', formId);
        return false;
      }

      paymentElement.mount(`#${formId}`);
      console.log('[StripePayment] Payment Element mounted successfully to:', formId);

      // Wait for Payment Element to be ready before proceeding
      return new Promise((resolve) => {
        paymentElement.on('ready', () => {
          console.log('[StripePayment] Payment Element is ready to accept input');
          console.log('[StripePayment] Elements instance type:', typeof store.stripeElements?.submit);
          store.debugInfo = 'Payment form ready';
          resolve(true);
        });

        // Fallback timeout in case ready event doesn't fire
        setTimeout(() => {
          console.warn('[StripePayment] Payment Element ready timeout, proceeding anyway');
          resolve(true);
        }, 5000);
      });

    } catch (error) {
      console.error('[StripePayment] Error initializing Elements:', error);
      store.error = error instanceof Error ? error.message : 'Failed to initialize payment form';
      store.debugInfo = `Error: ${store.error}`;
      return false;
    }
  });

  useVisibleTask$(async ({ cleanup }) => {
    // Cart UUID is now managed by CartContext - no need to generate here
    console.log('[StripePayment] Using cart UUID from context:', cartUuid);

    console.log('[StripePayment] Setting up window functions...');
    if (typeof window !== 'undefined') {
      // Function to confirm payment using enhanced error handling
      (window as any).confirmStripePreOrderPayment = async (activeOrder?: any) => {
        console.log('[StripePayment] Starting payment confirmation with order:', activeOrder);
        
        if (!store.resolvedStripe || !store.stripeElements) {
          console.error('[StripePayment] Stripe not initialized');
          const error = { 
            message: 'Payment system not initialized', 
            isRetryable: false,
            category: 'system' as const,
            severity: 'high' as const,
            userAction: 'Please refresh the page and try again'
          };
          store.paymentError = error;
          return { success: false, error: error.message };
        }

        if (store.isProcessing) {
          console.log('[StripePayment] Payment already in progress');
          return { success: false, error: 'Payment already in progress' };
        }

        store.isProcessing = true;
        store.error = '';
        store.paymentError = null;
        store.debugInfo = 'Processing payment...';

        try {
          // CRITICAL: Must call submit() first to validate and prepare payment data
          // This MUST happen before any async work per Stripe requirements
          console.log('[StripePayment] Submitting Elements for validation...');
          const submitResult = await store.stripeElements.submit();

          if (submitResult?.error) {
            console.error('[StripePayment] Elements validation failed:', submitResult.error);
            const error = {
              message: submitResult.error.message || 'Payment validation failed',
              isRetryable: true,
              category: 'validation' as const,
              severity: 'medium' as const,
              userAction: 'Please check your payment details and try again'
            };
            store.paymentError = error;
            store.error = error.message;
            store.debugInfo = `Validation error: ${error.message}`;
            return { success: false, error: error.message, paymentError: error };
          }

          console.log('[StripePayment] Elements validated successfully, confirming payment...');

          const result = await store.resolvedStripe.confirmPayment({
            elements: store.stripeElements,
            clientSecret: store.clientSecret,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/confirmation/${activeOrder?.code || 'unknown'}`,
            },
          });

          // This code should only run if there's an error (redirect didn't happen)
          if (result?.error) {
            console.error('[StripePayment] Payment confirmation failed:', result.error);

            // Create enhanced error object
            const stripeKey = await getStripePublishableKeyQuery();
            const stripeService = new StripePaymentService(
              stripeKey,
              '/shop-api',
              $(() => {
                const token = getCookie(AUTH_TOKEN);
                const headers: Record<string, string> = {};
                if (token) {
                  headers.Authorization = `Bearer ${token}`;
                }
                return headers;
              })
            );
            const errorMessage = stripeService.getErrorMessage(result.error, 'CONFIRM_PAYMENT');
            const isRetryable = stripeService.isErrorRetryable(result.error, 'CONFIRM_PAYMENT');

            const paymentError: PaymentError = {
              message: errorMessage,
              isRetryable,
              category: 'stripe',
              severity: result.error.type === 'card_error' ? 'medium' : 'high',
              userAction: result.error.type === 'card_error' ?
                'Please check your payment information and try again' :
                'Please try again or contact support'
            };

            store.paymentError = paymentError;
            store.error = errorMessage;
            store.debugInfo = `Confirmation error: ${errorMessage}`;

            // Payment.tsx will handle remounting this component to get fresh Stripe Elements
            console.log('[StripePayment] Payment failed - parent component will remount for fresh retry');

            return { success: false, error: errorMessage, paymentError };
          }

          // If we reach here without redirect, something unexpected happened
          // This should normally not execute because Stripe redirects on success
          console.warn('[StripePayment] Payment confirmed but no redirect occurred');
          console.log('[StripePayment] Result:', result);

          return {
            success: true,
            message: 'Payment processing...'
          };

        } catch (error) {
          console.error('[StripePayment] Payment process error:', error);
          
          const errorMessage = error instanceof Error ? error.message : 'Payment failed';
          const paymentError: PaymentError = {
            message: errorMessage,
            isRetryable: true,
            category: 'system',
            severity: 'high',
            userAction: 'Please try again or contact support if the problem persists'
          };
          
          store.paymentError = paymentError;
          store.error = errorMessage;
          store.debugInfo = `Error: ${errorMessage}`;
          
          return { success: false, error: errorMessage, paymentError };
        } finally {
          store.isProcessing = false;
        }
      };

      // DEPRECATED: PaymentIntent linking is no longer needed with official plugin
      // The official Vendure Stripe plugin handles everything automatically
      (window as any).linkPaymentIntentToOrder = async (_order: any) => {
        console.log('[StripePayment] linkPaymentIntentToOrder called but is deprecated with official plugin');
        console.log('[StripePayment] Official plugin will handle PaymentIntent automatically');
        // No-op - the official plugin handles this automatically
        return true;
      };

      console.log('[StripePayment] Window functions set up successfully');
      console.log('[StripePayment] confirmStripePreOrderPayment available:', typeof (window as any).confirmStripePreOrderPayment);
    }
    console.log('[StripePayment] Initializing payment form...');

    // CRITICAL: Reset error state at the start of initialization
    // This ensures a fresh start even if store persists across key changes
    store.error = '';
    store.paymentError = null;
    store.isProcessing = false;
    console.log('[StripePayment] Error state cleared for fresh initialization');

    // NUCLEAR OPTION: Always recreate Elements on component mount for clean retry
    // This ensures corrupted Elements after payment failure are always replaced with fresh ones
    const paymentFormElement = document.getElementById('payment-form');
    if (paymentFormElement) {
      paymentFormElement.innerHTML = '';
      console.log('[StripePayment] Cleared DOM for fresh Elements creation');
    }

    // Reset store state for fresh creation
    store.clientSecret = '';
    store.paymentIntentId = '';
    store.resolvedStripe = undefined;
    store.stripeElements = undefined;
    console.log('[StripePayment] Store state reset for fresh Elements creation');

    // Call the centralized initialization function
    await initializeElements();

    // ✅ CLEANUP: Properly unmount Payment Element when component unmounts
    cleanup(() => {
      console.log('[StripePayment] Component unmounting, cleaning up Payment Element...');

      // Properly unmount Stripe Elements first
      if (store.stripeElements) {
        try {
          console.log('[StripePayment] Unmounting Stripe Elements...');
          // Note: Unfortunately Stripe doesn't expose individual elements for unmounting
          // But clearing DOM after this should be safe
        } catch (error) {
          console.warn('[StripePayment] Error during Stripe Elements cleanup:', error);
        }
      }

      // Clear the payment form DOM to ensure fresh mount on remount
      const paymentFormElement = document.getElementById('payment-form');
      if (paymentFormElement) {
        paymentFormElement.innerHTML = '';
        console.log('[StripePayment] Payment form DOM cleared');
      }
      
      // Clean up global window functions
      if (typeof window !== 'undefined') {
        delete (window as any).confirmStripePreOrderPayment;
        delete (window as any).linkPaymentIntentToOrder;
        delete (window as any).__stripePaymentIntentId;
        console.log('[StripePayment] Global window functions cleaned up');
      }

      // Reset ALL store state for fresh remount
      store.clientSecret = '';
      store.paymentIntentId = '';
      store.resolvedStripe = undefined;
      store.stripeElements = undefined;
      store.error = '';
      store.paymentError = null;
      store.isProcessing = false;
      store.debugInfo = 'Component unmounted';
      console.log('[StripePayment] Store state fully reset for fresh remount');
    });
  });

  return (
    <div class="w-full max-w-full">
      <div class="payment-tabs-container relative">
        <div
          id="payment-form"
          class="mb-8 w-full max-w-full"
        ></div>
      </div>
      
      {/* Enhanced error display */}
      {store.paymentError && (
        <PaymentErrorDisplay
          error={store.paymentError}
          isRetrying={store.isProcessing}
        />
      )}
      
      {/* Fallback error display for non-enhanced errors */}
      {store.error !== '' && !store.paymentError && (
        <div class="rounded-md bg-red-50 p-4 mb-8">
          <div class="flex">
            <div class="flex-shrink-0">
              <XCircleIcon />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">We ran into a problem with payment!</h3>
              <p class="text-sm text-red-700 mt-2">{store.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Debug info for development */}
      {store.debugInfo && process.env.NODE_ENV === 'development' && (
        <div class="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Debug: {store.debugInfo}
        </div>
      )}
    </div>
  );
});
