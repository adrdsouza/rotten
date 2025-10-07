import { useStore, useVisibleTask$, $, useSignal } from '@qwik.dev/core';
import { getStripePublishableKeyQuery } from '~/providers/shop/checkout/checkout';
import { StripePaymentService } from '~/services/StripePaymentService';
import { getCookie } from '~/utils';
import { AUTH_TOKEN } from '~/constants';
import { loadStripe } from '@stripe/stripe-js';

export interface PaymentState {
  status: 'initializing' | 'ready' | 'error' | 'cancelled';
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface PaymentManagerHook {
  state: PaymentState;
  isElementsReady: boolean;
  resetForRetry: () => void;
}

// Global Stripe instance cache (preserving existing behavior)
let _stripe: Promise<any>;

function getStripe(publishableKey: string) {
  if (!_stripe && publishableKey) {
    _stripe = loadStripe(publishableKey);
  }
  return _stripe;
}

export function usePaymentManager(
  cartUuid: string,
  cartSnapshot: {
    items: any[];
    subTotal: number;
    appliedCoupon?: any;
  },
  shouldInitialize: boolean = true
): PaymentManagerHook {
  
  const state = useStore<PaymentState>({
    status: 'initializing',
    error: undefined,
    clientSecret: undefined,
    paymentIntentId: undefined
  });

  const isElementsReady = useSignal(false);

  // Store refs in signals so they can be used across $() boundaries
  const stripeInstanceRef = useSignal<any>(null);
  const elementsRef = useSignal<any>(null);
  const abortControllerRef = useSignal<AbortController | null>(null);
  const mountedElementRef = useSignal<HTMLElement | null>(null);

  // Single useVisibleTask for complete lifecycle management
  useVisibleTask$(async ({ cleanup, track }) => {
    // Track shouldInitialize to only run when it's true
    track(() => shouldInitialize);
    
    if (!shouldInitialize) {
      console.log('[usePaymentManager] Waiting for DOM to be ready...');
      return;
    }
    
    console.log('[usePaymentManager] Initializing with cart UUID:', cartUuid);

    // Reset state for fresh initialization
    state.status = 'initializing';
    state.error = undefined;
    isElementsReady.value = false;

    // Create new abort controller
    abortControllerRef.value = new AbortController();
    const signal = abortControllerRef.value.signal;

    try {
      // Get Stripe publishable key
      const stripeKey = await getStripePublishableKeyQuery();
      console.log('[usePaymentManager] Loading Stripe with key:', stripeKey);

      // Load Stripe instance (preserving global caching)
      const stripe = await getStripe(stripeKey);
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }
      stripeInstanceRef.value = stripe;
      console.log('[usePaymentManager] Stripe instance initialized');

      // Create auth headers function
      const getAuthHeaders = $(() => {
        const token = getCookie(AUTH_TOKEN);
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        return headers;
      });

      // Initialize Stripe service
      const stripeService = new StripePaymentService(
        stripeKey,
        '/shop-api',
        getAuthHeaders
      );

      // Calculate payment amount (preserving exact logic)
      const subtotal = cartSnapshot.subTotal;
      const discount = cartSnapshot.appliedCoupon?.discountAmount || 0;
      const subtotalAfterDiscount = subtotal - discount;

      let shipping = 0;
      let countryCode = '';

      // Get shipping address from localStorage
      if (typeof window !== 'undefined') {
        try {
          const shippingData = localStorage.getItem('checkout-shipping-address');
          if (shippingData) {
            const shippingAddress = JSON.parse(shippingData);
            countryCode = shippingAddress.countryCode || '';
          }
        } catch (error) {
          console.warn('[usePaymentManager] Failed to get shipping address:', error);
        }
      }

      // Calculate shipping (preserving exact logic)
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
      console.log('[usePaymentManager] Payment calculation:', {
        subtotal, discount, subtotalAfterDiscount, shipping, estimatedTotal, countryCode
      });

      // Create PaymentIntent
      console.log('[usePaymentManager] Creating PaymentIntent...');
      const paymentIntent = await stripeService.createPaymentIntent(
        estimatedTotal,
        'usd',
        cartUuid
      );

      if (!paymentIntent?.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      state.clientSecret = paymentIntent.clientSecret;
      state.paymentIntentId = paymentIntent.paymentIntentId;
      console.log('[usePaymentManager] PaymentIntent created:', paymentIntent.paymentIntentId);

      // Store globally for checkout flow (preserving existing pattern)
      if (typeof window !== 'undefined') {
        (window as any).__stripePaymentIntentId = paymentIntent.paymentIntentId;
      }

      // Setup cart mapping (preserving exact database operations)
      console.log('[usePaymentManager] Setting up cart mapping...');
      try {
        await stripeService.createCartMapping(cartUuid);
        console.log('[usePaymentManager] Cart mapping created successfully');
      } catch (_error) {
        console.log('[usePaymentManager] Cart mapping exists, updating with new PaymentIntent ID');
      }

      try {
        await stripeService.updateCartMappingPaymentIntent(cartUuid, paymentIntent.paymentIntentId);
        console.log('[usePaymentManager] Cart mapping updated with PaymentIntent ID');
      } catch (mappingError) {
        console.warn('[usePaymentManager] Cart mapping update failed (non-critical):', mappingError);
      }

      // Create Elements (preserving exact configuration)
      console.log('[usePaymentManager] Creating Stripe Elements...');
      const elements = stripe.elements({
        clientSecret: paymentIntent.clientSecret,
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

      elementsRef.value = elements;

      // Create payment element
      const paymentElement = elements.create('payment', {
        layout: {
          type: 'tabs',
          defaultCollapsed: false,
        },
      });

      // Mount to DOM (element should exist since we wait for DOM to be ready)
      const paymentFormElement = document.getElementById('payment-form');
      if (!paymentFormElement) {
        throw new Error('Payment form element not found');
      }

      // Store reference to the specific DOM element we mounted to
      mountedElementRef.value = paymentFormElement;

      paymentElement.mount('#payment-form');
      console.log('[usePaymentManager] Payment Element mounted successfully');

      // Wait for ready event
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
        };

        paymentElement.on('ready', () => {
          console.log('[usePaymentManager] Payment Element is ready to accept input');
          cleanup();
          resolve();
        });

        const timeout = setTimeout(() => {
          console.warn('[usePaymentManager] Payment Element ready timeout, proceeding anyway');
          cleanup();
          resolve();
        }, 5000);

        if (signal.aborted) {
          cleanup();
          reject(new Error('Aborted'));
        }
      });

      state.status = 'ready';
      isElementsReady.value = true;

      // Setup window function immediately after Elements are ready
      // This ensures the function is available when Payment.tsx needs it
      (window as any).confirmStripePreOrderPayment = async (activeOrder: any) => {
        console.log('[usePaymentManager] Window function called with order:', activeOrder);

        const stripe = stripeInstanceRef.value;
        const elements = elementsRef.value;

        if (!stripe || !elements || !state.clientSecret) {
          const error = 'Payment system not initialized';
          return {
            success: false,
            error,
            paymentError: {
              message: error,
              isRetryable: false,
              category: 'system',
              severity: 'high',
              userAction: 'Please refresh the page and try again'
            }
          };
        }

        try {
          console.log('[usePaymentManager] Submitting Elements for validation...');
          const submitResult = await elements.submit();

          if (submitResult?.error) {
            console.error('[usePaymentManager] Elements validation failed:', submitResult.error);
            const paymentError = {
              message: submitResult.error.message || 'Payment validation failed',
              isRetryable: true,
              category: 'validation',
              severity: 'medium',
              userAction: 'Please check your payment details and try again'
            };
            return { success: false, error: paymentError.message, paymentError };
          }

          console.log('[usePaymentManager] Elements validated successfully, confirming payment...');

          const result = await stripe.confirmPayment({
            elements: elements,
            clientSecret: state.clientSecret,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/confirmation/${activeOrder?.code || 'unknown'}`,
            },
          });

          if (result?.error) {
            console.error('[usePaymentManager] Payment confirmation failed:', result.error);

            // Create error using service for consistency
            const stripeKey = await getStripePublishableKeyQuery();
            const getAuthHeaders = $(() => {
              const token = getCookie(AUTH_TOKEN);
              const headers: Record<string, string> = {};
              if (token) {
                headers.Authorization = `Bearer ${token}`;
              }
              return headers;
            });

            const stripeService = new StripePaymentService(stripeKey, '/shop-api', getAuthHeaders);
            const errorMessage = stripeService.getErrorMessage(result.error, 'CONFIRM_PAYMENT');
            const isRetryable = stripeService.isErrorRetryable(result.error, 'CONFIRM_PAYMENT');

            const paymentError = {
              message: errorMessage,
              isRetryable,
              category: 'stripe',
              severity: result.error.type === 'card_error' ? 'medium' : 'high',
              userAction: result.error.type === 'card_error' ?
                'Please check your payment information and try again' :
                'Please try again or contact support'
            };

            console.log('[usePaymentManager] Payment failed - parent component will remount for fresh retry');
            return { success: false, error: errorMessage, paymentError };
          }

          console.warn('[usePaymentManager] Payment confirmed but no redirect occurred');
          return { success: true, message: 'Payment processing...' };

        } catch (error) {
          console.error('[usePaymentManager] Payment process error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Payment failed';
          const paymentError = {
            message: errorMessage,
            isRetryable: true,
            category: 'system',
            severity: 'high',
            userAction: 'Please try again or contact support if the problem persists'
          };
          return { success: false, error: errorMessage, paymentError };
        }
      };

      // Deprecated function for compatibility
      (window as any).linkPaymentIntentToOrder = async (_order: any) => {
        console.log('[usePaymentManager] linkPaymentIntentToOrder called but is deprecated');
        return true;
      };

      console.log('[usePaymentManager] Window functions set up successfully');

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[usePaymentManager] Initialization was cancelled');
        return;
      }
      console.error('[usePaymentManager] Failed to initialize:', error);
      state.status = 'error';
      state.error = error instanceof Error ? error.message : 'Failed to initialize payment system';
    }

    // Setup cleanup
    cleanup(() => {
      console.log('[usePaymentManager] Component cleanup');

      // Abort ongoing operations
      if (abortControllerRef.value) {
        abortControllerRef.value.abort();
      }

      // Clear DOM only if we have a reference to the element we mounted to
      // This prevents race conditions where we clear a new component's DOM
      if (mountedElementRef.value) {
        mountedElementRef.value.innerHTML = '';
        console.log('[usePaymentManager] Payment form DOM cleared');
        mountedElementRef.value = null;
      }

      // Clean up global references
      if (typeof window !== 'undefined') {
        delete (window as any).confirmStripePreOrderPayment;
        delete (window as any).linkPaymentIntentToOrder;
        delete (window as any).__stripePaymentIntentId;
        console.log('[usePaymentManager] Global window functions cleaned up');
      }

      // Reset refs
      stripeInstanceRef.value = null;
      elementsRef.value = null;
      mountedElementRef.value = null;
      isElementsReady.value = false;
    });
  });

  // Reset function for retry scenarios
  const resetForRetry = $(() => {
    console.log('[usePaymentManager] Resetting for retry');
    isElementsReady.value = false;
    state.status = 'initializing';
    state.error = undefined;
  });

  return {
    state,
    isElementsReady: isElementsReady.value,
    resetForRetry
  };
}