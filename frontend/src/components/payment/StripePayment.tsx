import { component$, noSerialize, useSignal, useStore, useVisibleTask$, $, useContext } from '@qwik.dev/core';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
  getStripePublishableKeyQuery
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { StripePaymentService } from '~/services/StripePaymentService';
import { PaymentError } from '~/services/payment-error-handler';
import { PaymentErrorDisplay } from './PaymentErrorDisplay';
import { APP_STATE, AUTH_TOKEN } from '~/constants';
import { getCookie } from '~/utils';
import { useCheckoutValidation } from '~/contexts/CheckoutValidationContext';

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
  const appState = useContext(APP_STATE);
  const validation = useCheckoutValidation();

  // Generate cart UUID for tracking
  const cartUuid = useSignal<string>('');

  // Track Stripe loading state
  const isStripeLoaded = useSignal(false);
  const isExpanded = useSignal(false);

  const store = useStore({
    clientSecret: '',
    paymentIntentId: '',
    resolvedStripe: noSerialize({} as Stripe),
    stripeElements: noSerialize({} as StripeElements),
    error: '',
    paymentError: null as PaymentError | null,
    isProcessing: false,
    debugInfo: 'Initializing...',
    retryCount: 0,
    maxRetries: 3,
  });

  // Lazy load Stripe after FCP (First Contentful Paint)
  useVisibleTask$(() => {
    // Generate cart UUID on component mount
    if (typeof window !== 'undefined' && !cartUuid.value) {
      cartUuid.value = crypto.randomUUID();
      console.log('[StripePayment] Generated cart UUID:', cartUuid.value);
    }

    // Wait for FCP before loading Stripe
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      console.log('[StripePayment] Scheduling Stripe lazy load after FCP...');
      requestIdleCallback(() => {
        console.log('[StripePayment] Starting lazy Stripe initialization...');
        isStripeLoaded.value = true;
      }, { timeout: 2000 }); // Fallback after 2s if idle callback doesn't fire
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        console.log('[StripePayment] Starting lazy Stripe initialization (fallback)...');
        isStripeLoaded.value = true;
      }, 500);
    }
  });

  // Watch for validation state to expand payment section and enable interaction
  useVisibleTask$(({ track }) => {
    const paymentReady = track(() => validation.isPaymentReady);

    // Expand section when validation passes
    if (paymentReady && !isExpanded.value) {
      console.log('[StripePayment] Validation passed - expanding payment section');
      isExpanded.value = true;
    }

    // Log when Stripe becomes interactive
    if (paymentReady && isExpanded.value && isStripeLoaded.value) {
      console.log('[StripePayment] Stripe Elements now interactive - validation passed');
    }
  });

  // Setup window functions for checkout flow
  useVisibleTask$(() => {
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
          console.log('[StripePayment] Submitting payment form...');

          const submitResult = await store.stripeElements?.submit();
          if (submitResult?.error) {
            console.error('[StripePayment] Form submission failed:', submitResult.error);
            console.error('[StripePayment] Error type:', submitResult.error.type);
            console.error('[StripePayment] Error code:', submitResult.error.code);
            console.error('[StripePayment] Error message:', submitResult.error.message);

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
            const errorMessage = stripeService.getErrorMessage(submitResult.error, 'CONFIRM_PAYMENT');
            const isRetryable = stripeService.isErrorRetryable(submitResult.error, 'CONFIRM_PAYMENT');

            const paymentError: PaymentError = {
              message: errorMessage,
              isRetryable,
              category: 'stripe',
              severity: submitResult.error.type === 'card_error' ? 'medium' : 'high',
              userAction: submitResult.error.type === 'card_error' ?
                'Please check your payment information and try again' :
                'Please try again or contact support'
            };

            store.paymentError = paymentError;
            store.error = errorMessage;
            store.debugInfo = `Form submission error: ${errorMessage}`;

            // Error will be handled by the modal in checkout page
            console.log('[StripePayment] Payment failed - error will be shown in modal');

            return { success: false, error: errorMessage, paymentError };
          }

          console.log('[StripePayment] Form submitted successfully, confirming payment with Stripe...');

          const result = await store.resolvedStripe.confirmPayment({
            elements: store.stripeElements,
            redirect: 'if_required',
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

            // Error will be handled by the modal in checkout page
            console.log('[StripePayment] Payment confirmation failed - error will be shown in modal');

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

          // Error will be handled by the modal in checkout page
          console.log('[StripePayment] Payment process error - error will be shown in modal');

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

      // Expose retry function
      (window as any).retryStripePayment = async (activeOrder?: any) => {
        if (store.retryCount >= store.maxRetries) {
          console.log('[StripePayment] Maximum retry attempts reached');
          return { success: false, error: 'Maximum retry attempts reached' };
        }
        
        store.retryCount++;
        console.log(`[StripePayment] Retry attempt ${store.retryCount}/${store.maxRetries}`);
        
        return await (window as any).confirmStripePreOrderPayment(activeOrder);
      };

      // Expose error dismissal function
      (window as any).dismissStripePaymentError = () => {
        store.paymentError = null;
        store.error = '';
      };

      // Expose retry function
      (window as any).retryStripePayment = async (activeOrder?: any) => {
        if (store.retryCount >= store.maxRetries) {
          console.log('[StripePayment] Maximum retry attempts reached');
          return { success: false, error: 'Maximum retry attempts reached' };
        }
        
        store.retryCount++;
        console.log(`[StripePayment] Retry attempt ${store.retryCount}/${store.maxRetries}`);
        
        return await (window as any).confirmStripePreOrderPayment(activeOrder);
      };

      // Expose error dismissal function
      (window as any).dismissStripePaymentError = () => {
        store.paymentError = null;
        store.error = '';
      };

      console.log('[StripePayment] Window functions set up successfully');
      console.log('[StripePayment] confirmStripePreOrderPayment available:', typeof (window as any).confirmStripePreOrderPayment);
      console.log('[StripePayment] retryStripePayment available:', typeof (window as any).retryStripePayment);
    }
  });

  useVisibleTask$(async ({ track }) => {
    // Wait for Stripe to be lazy loaded
    const loaded = track(() => isStripeLoaded.value);
    if (!loaded) {
      console.log('[StripePayment] Waiting for lazy load...');
      return;
    }

    console.log('[StripePayment] Initializing payment form after lazy load...');

    // CRITICAL: Check if Elements are already mounted to prevent clearing user input
    const paymentFormElement = document.getElementById('payment-form');
    if (paymentFormElement && paymentFormElement.children.length > 0 && store.stripeElements) {
      console.log('[StripePayment] Elements already mounted, skipping re-initialization');
      return;
    }

    // Check cart state without tracking it (read once, don't react to changes)
    const cartItems = localCart?.localCart?.items;
    if (!cartItems || cartItems.length === 0) {
      store.debugInfo = 'Waiting for cart items...';
      store.error = 'Cart is empty. Please add items to continue.';
      return;
    }

    try {
      // Get Stripe publishable key
      const stripeKey = await getStripePublishableKeyQuery();
      console.log('[StripePayment] Loading Stripe with key:', stripeKey);

      // Initialize Stripe
      const stripe = await getStripe(stripeKey);
      if (!stripe) {
        store.error = 'Failed to load Stripe';
        store.debugInfo = 'Error: Stripe failed to load';
        return;
      }

      store.resolvedStripe = noSerialize(stripe);

      // Create PaymentIntent for the estimated total using StripePaymentService
      console.log('[StripePayment] Creating PaymentIntent for estimated total...');
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

      // Calculate total including shipping based on shipping address
      const subtotal = localCart.localCart.subTotal;
      const discount = localCart.appliedCoupon?.discountAmount || 0;
      const subtotalAfterDiscount = subtotal - discount;

      // Calculate shipping based on country code (same logic as CartTotals.tsx)
      let shipping = 0;
      if (appState.shippingAddress && appState.shippingAddress.countryCode) {
        if (localCart.appliedCoupon?.freeShipping) {
          shipping = 0;
        } else {
          const countryCode = appState.shippingAddress.countryCode;
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
        countryCode: appState.shippingAddress?.countryCode
      });

      try {
        // Create PaymentIntent with the actual calculated total
        // This ensures the payment amount is correct from the start
        const paymentIntentResult = await stripeService.createPaymentIntent(estimatedTotal, 'usd', cartUuid.value);
        console.log('[StripePayment] PaymentIntent created:', paymentIntentResult);
        
        store.clientSecret = paymentIntentResult.clientSecret;
        store.paymentIntentId = paymentIntentResult.paymentIntentId;

        // Store PaymentIntent ID globally for checkout flow to access
        if (typeof window !== 'undefined') {
          (window as any).__stripePaymentIntentId = paymentIntentResult.paymentIntentId;
        }

        // Note: Cart mapping is not needed for payment flow
        // The PaymentIntent already contains cartUuid in metadata
        // which is sufficient for tracking and webhook processing

        store.debugInfo = 'PaymentIntent created successfully';
      } catch (paymentIntentError) {
        console.error('[StripePayment] Failed to create PaymentIntent:', paymentIntentError);
        store.error = 'Failed to initialize payment. Please try again.';
        store.debugInfo = `PaymentIntent error: ${paymentIntentError instanceof Error ? paymentIntentError.message : 'Unknown error'}`;
        return;
      }

      // Create elements with the client secret
      const elements = stripe.elements({
        clientSecret: store.clientSecret,
        locale: 'en',
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#8a6d4a',
            colorBackground: '#ffffff',
            colorText: '#374151',
            colorDanger: '#ef4444',
            colorSuccess: '#10b981',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            spacingUnit: '4px',
            borderRadius: '6px',
            fontSizeBase: '16px',
          }
        }
      });

      store.stripeElements = noSerialize(elements);
      store.debugInfo = 'Mounting payment element...';

      // Mount payment element
      const mountTarget = document.getElementById('payment-form');
      if (!mountTarget) {
        store.error = 'Payment form mount target not found';
        store.debugInfo = 'Error: #payment-form element missing';
        return;
      }

      const paymentElement = elements.create('payment', {
        layout: 'tabs',
        paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
        defaultValues: {
          billingDetails: {
            name: '',
            email: '',
          }
        }
      });

      await paymentElement.mount('#payment-form');

      // Add event listeners
      paymentElement.on('ready', () => {
        store.debugInfo = 'Payment Element is ready!';
      });

      paymentElement.on('change', (event: any) => {
        if (event.error) {
          store.error = event.error.message || 'Payment validation error';
          store.debugInfo = `Payment error: ${event.error.message || 'Unknown error'}`;
        } else {
          store.error = '';
          store.debugInfo = 'Payment form is valid and ready!';
        }
      });

      store.debugInfo = 'Payment Element mounted successfully!';
    } catch (error) {
      console.error('[StripePayment] Initialization error:', error);
      store.error = error instanceof Error ? error.message : 'Failed to initialize payment form';
      store.debugInfo = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  });

  // Handler functions for error display
  const _handleRetry = $(() => {
    if (typeof window !== 'undefined' && (window as any).retryStripePayment) {
      (window as any).retryStripePayment();
    }
  });

  const _handleDismissError = $(() => {
    if (typeof window !== 'undefined' && (window as any).dismissStripePaymentError) {
      (window as any).dismissStripePaymentError();
    }
  });

  return (
    <div class="w-full max-w-full">
      {/* Always render the payment form container, but show/hide content */}
      <div class="payment-tabs-container relative">
        {/* Collapsed state - show placeholder until validation passes */}
        {!isExpanded.value && (
          <div class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <div class="flex items-center justify-center space-x-2 text-gray-500">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span class="text-sm font-medium">
                {isStripeLoaded.value ? 'Complete address details to proceed with payment' : 'Loading payment options...'}
              </span>
            </div>
          </div>
        )}

        {/* Expanded state - show Stripe payment form */}
        {isExpanded.value && (
          <>
            {/* Overlay to disable interaction until validation passes */}
            {!validation.isPaymentReady && (
              <div class="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div class="text-center p-4">
                  <div class="flex items-center justify-center space-x-2 text-gray-500 mb-2">
                    <svg class="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span class="text-sm font-medium">Finalizing details...</span>
                  </div>
                  <p class="text-xs text-gray-400">Complete shipping information above</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Always render payment-form div for Stripe to mount to */}
        <div
          id="payment-form"
          class={`mb-8 w-full max-w-full ${!isExpanded.value ? 'hidden' : ''}`}
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
          {store.retryCount > 0 && ` | Retries: ${store.retryCount}/${store.maxRetries}`}
        </div>
      )}
    </div>
  );
});
