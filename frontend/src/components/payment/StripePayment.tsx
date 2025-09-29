import { component$, noSerialize, useSignal, useStore, useVisibleTask$, $, useContext } from '@qwik.dev/core';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
  getStripePublishableKeyQuery
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { StripePaymentService } from '~/services/StripePaymentService';
import { PaymentError } from '~/services/payment-error-handler';
<<<<<<< HEAD
import { PaymentErrorDisplay } from './PaymentErrorDisplay';
import { APP_STATE, AUTH_TOKEN } from '~/constants';
import { getCookie } from '~/utils';
=======
import PaymentErrorDisplay from './PaymentErrorDisplay';
>>>>>>> bacb344 (Kiro)

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

  // Generate cart UUID for tracking
  const cartUuid = useSignal<string>('');

  const store = useStore({
    clientSecret: '',
    paymentIntentId: '',
    resolvedStripe: noSerialize({} as Stripe),
    stripeElements: noSerialize({} as StripeElements),
    error: '',
<<<<<<< HEAD
    paymentError: null as PaymentError | null,
=======
    paymentError: noSerialize(null as PaymentError | null),
>>>>>>> bacb344 (Kiro)
    isProcessing: false,
    debugInfo: 'Initializing...',
    retryCount: 0,
    maxRetries: 3,
  });

  // Expose functions to window for checkout flow
  useVisibleTask$(() => {
    // Generate cart UUID on component mount
    if (typeof window !== 'undefined' && !cartUuid.value) {
      cartUuid.value = crypto.randomUUID();
      console.log('[StripePayment] Generated cart UUID:', cartUuid.value);
    }

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
<<<<<<< HEAD
          store.paymentError = error;
=======
          store.paymentError = noSerialize(error);
>>>>>>> bacb344 (Kiro)
          return { success: false, error: error.message };
        }

        if (store.isProcessing) {
          console.log('[StripePayment] Payment already in progress');
          return { success: false, error: 'Payment already in progress' };
        }

        store.isProcessing = true;
        store.error = '';
<<<<<<< HEAD
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
            return { success: false, error: errorMessage, paymentError };
          }

          console.log('[StripePayment] Form submitted successfully, confirming payment with Stripe...');

          const result = await store.resolvedStripe.confirmPayment({
=======
        store.paymentError = noSerialize(null);
        store.debugInfo = 'Processing payment...';

        try {
          // Step 1: Confirm payment with Stripe (without redirect)
          console.log('[StripePayment] Confirming payment with Stripe...');
          
          const { error: confirmError, paymentIntent } = await store.resolvedStripe.confirmPayment({
>>>>>>> bacb344 (Kiro)
            elements: store.stripeElements,
            redirect: 'if_required',
            confirmParams: {
              return_url: `${window.location.origin}/checkout/confirmation/${activeOrder?.code || 'unknown'}`,
            },
          });

<<<<<<< HEAD
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

=======
          if (confirmError) {
            console.error('[StripePayment] Payment confirmation failed:', confirmError);
            
            // Create enhanced error object
            const stripeKey = await getStripePublishableKeyQuery();
            const stripeService = new StripePaymentService(stripeKey, '/shop-api', $(() => ({})));
            const errorMessage = stripeService.getErrorMessage(confirmError, 'CONFIRM_PAYMENT');
            const isRetryable = stripeService.isErrorRetryable(confirmError, 'CONFIRM_PAYMENT');
            
>>>>>>> bacb344 (Kiro)
            const paymentError: PaymentError = {
              message: errorMessage,
              isRetryable,
              category: 'stripe',
<<<<<<< HEAD
              severity: result.error.type === 'card_error' ? 'medium' : 'high',
              userAction: result.error.type === 'card_error' ?
                'Please check your payment information and try again' :
                'Please try again or contact support'
            };

            store.paymentError = paymentError;
=======
              severity: confirmError.type === 'card_error' ? 'medium' : 'high',
              userAction: confirmError.type === 'card_error' ? 
                'Please check your payment information and try again' : 
                'Please try again or contact support'
            };
            
            store.paymentError = noSerialize(paymentError);
>>>>>>> bacb344 (Kiro)
            store.error = errorMessage;
            store.debugInfo = `Confirmation error: ${errorMessage}`;
            return { success: false, error: errorMessage, paymentError };
          }

<<<<<<< HEAD
          // If we reach here without redirect, something unexpected happened
          // This should normally not execute because Stripe redirects on success
          console.warn('[StripePayment] Payment confirmed but no redirect occurred');
          console.log('[StripePayment] Result:', result);

          return {
            success: true,
            message: 'Payment processing...'
          };
=======
          if (!paymentIntent || paymentIntent.status !== 'succeeded') {
            const errorMsg = `Payment not completed. Status: ${paymentIntent?.status || 'unknown'}`;
            console.error('[StripePayment]', errorMsg);
            
            const paymentError: PaymentError = {
              message: errorMsg,
              isRetryable: paymentIntent?.status === 'processing',
              category: 'stripe',
              severity: 'medium',
              userAction: paymentIntent?.status === 'processing' ? 
                'Please wait a moment and try again' : 
                'Please try again or use a different payment method'
            };
            
            store.paymentError = noSerialize(paymentError);
            store.error = errorMsg;
            store.debugInfo = errorMsg;
            return { success: false, error: errorMsg, paymentError };
          }

          console.log('[StripePayment] Payment confirmed with Stripe, now settling...');
          store.debugInfo = 'Payment confirmed, settling with backend...';

          // Step 2: Settle payment with backend using enhanced retry mechanism
          const stripeKey = await getStripePublishableKeyQuery();
          const stripeService = new StripePaymentService(
            stripeKey,
            '/shop-api',
            $(() => ({}))
          );

          // Attempt settlement with enhanced retry mechanism
          const settlementResult = await stripeService.retrySettlement(paymentIntent.id, store.maxRetries, 1000);

          if (settlementResult.success) {
            console.log('[StripePayment] Payment settled successfully');
            store.debugInfo = 'Payment completed successfully!';
            store.retryCount = 0; // Reset retry count on success
            return { 
              success: true, 
              orderCode: settlementResult.orderCode || activeOrder?.code,
              settlement: settlementResult
            };
          } else {
            console.error('[StripePayment] Settlement failed:', settlementResult.error);
            
            // Use enhanced error details if available
            const paymentError = settlementResult.errorDetails || {
              message: settlementResult.error || 'Payment settlement failed',
              isRetryable: settlementResult.isRetryable || false,
              category: 'system' as const,
              severity: 'medium' as const,
              userAction: 'Please try again or contact support if the problem persists'
            };
            
            store.paymentError = noSerialize(paymentError);
            store.error = paymentError.message;
            store.debugInfo = `Settlement error: ${paymentError.message}`;
            store.retryCount = settlementResult.attempts || 0;
            
            return { 
              success: false, 
              error: paymentError.message, 
              paymentError,
              canRetry: paymentError.isRetryable && store.retryCount < store.maxRetries
            };
          }
>>>>>>> bacb344 (Kiro)

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
          
<<<<<<< HEAD
          store.paymentError = paymentError;
=======
          store.paymentError = noSerialize(paymentError);
>>>>>>> bacb344 (Kiro)
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
        store.paymentError = noSerialize(null);
        store.error = '';
      };

      console.log('[StripePayment] Window functions set up successfully');
      console.log('[StripePayment] confirmStripePreOrderPayment available:', typeof (window as any).confirmStripePreOrderPayment);
      console.log('[StripePayment] retryStripePayment available:', typeof (window as any).retryStripePayment);
    }
  });

  useVisibleTask$(async () => {
    console.log('[StripePayment] Initializing payment form...');

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
        
        // Create cart mapping first (for pre-order flow)
        try {
          await stripeService.createCartMapping(cartUuid.value);
          console.log('Cart mapping created successfully');
        } catch (error) {
          console.warn('Failed to create cart mapping, continuing with payment:', error);
          // Continue with payment flow even if cart mapping fails
        }
        
        // Update cart mapping with PaymentIntent ID
        try {
          await stripeService.updateCartMappingPaymentIntent(cartUuid.value, store.paymentIntentId);
          console.log('[StripePayment] Cart mapping updated with PaymentIntent ID');
        } catch (mappingError) {
          console.warn('[StripePayment] Cart mapping update failed (non-critical):', mappingError);
          // Don't fail the payment flow if cart mapping fails
        }
        
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
  const handleRetry = $(() => {
    if (typeof window !== 'undefined' && (window as any).retryStripePayment) {
      (window as any).retryStripePayment();
    }
  });

  const handleDismissError = $(() => {
    if (typeof window !== 'undefined' && (window as any).dismissStripePaymentError) {
      (window as any).dismissStripePaymentError();
    }
  });

  return (
    <div class="w-full max-w-full">
      <div class="payment-tabs-container relative">
        <div id="payment-form" class="mb-8 w-full max-w-full"></div>
      </div>
      
      {/* Enhanced error display */}
<<<<<<< HEAD
      {store.paymentError && (
        <PaymentErrorDisplay
          error={store.paymentError}
          isRetrying={store.isProcessing}
        />
      )}
=======
      <PaymentErrorDisplay
        error={store.paymentError}
        onRetry={handleRetry}
        onDismiss={handleDismissError}
        showRetryButton={true}
        autoRetryCountdown={store.paymentError?.isRetryable && store.retryCount < store.maxRetries ? 
          (store.paymentError.retryDelayMs ? Math.ceil(store.paymentError.retryDelayMs / 1000) : 0) : 0}
      />
>>>>>>> bacb344 (Kiro)
      
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
