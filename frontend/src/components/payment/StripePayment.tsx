import { component$, noSerialize, useSignal, useStore, useVisibleTask$, $, useContext } from '@qwik.dev/core';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
  getStripePublishableKeyQuery
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { StripePaymentService } from '~/services/StripePaymentService';
import { PaymentError } from '~/services/payment-error-handler';
import { PaymentErrorDisplay } from './PaymentErrorDisplay';
import { APP_STATE } from '~/constants';

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
  const rerenderElement = useSignal(0);

  // Generate cart UUID for tracking
  const cartUuid = useSignal<string>('');

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
          // Step 1: Confirm payment with Stripe (without redirect)
          console.log('[StripePayment] Confirming payment with Stripe...');
          
          const { error: confirmError, paymentIntent } = await store.resolvedStripe.confirmPayment({
            elements: store.stripeElements,
            redirect: 'if_required',
            confirmParams: {
              return_url: `${window.location.origin}/checkout/confirmation/${activeOrder?.code || 'unknown'}`,
            },
          });

          if (confirmError) {
            console.error('[StripePayment] Payment confirmation failed:', confirmError);
            
            // Create enhanced error object
            const stripeKey = await getStripePublishableKeyQuery();
            const stripeService = new StripePaymentService(stripeKey, '/shop-api', $(() => ({})));
            const errorMessage = stripeService.getErrorMessage(confirmError, 'CONFIRM_PAYMENT');
            const isRetryable = stripeService.isErrorRetryable(confirmError, 'CONFIRM_PAYMENT');
            
            const paymentError: PaymentError = {
              message: errorMessage,
              isRetryable,
              category: 'stripe',
              severity: confirmError.type === 'card_error' ? 'medium' : 'high',
              userAction: confirmError.type === 'card_error' ? 
                'Please check your payment information and try again' : 
                'Please try again or contact support'
            };
            
            store.paymentError = paymentError;
            store.error = errorMessage;
            store.debugInfo = `Confirmation error: ${errorMessage}`;
            return { success: false, error: errorMessage, paymentError };
          }

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
            
            store.paymentError = paymentError;
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

          // Attempt settlement with enhanced retry mechanism, passing cart UUID
          const settlementResult = await stripeService.retrySettlement(
            paymentIntent.id, 
            store.maxRetries, 
            1000,
            cartUuid.value // Pass cart UUID to settlement
          );

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
            
            store.paymentError = paymentError;
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

      // Expose PaymentIntent linking function
      (window as any).linkPaymentIntentToOrder = async (order: any) => {
        if (store.paymentIntentId && order?.code) {
          console.log('[StripePayment] Linking PaymentIntent to order:', order.code);
          // Create a new service instance for linking
          const stripeKey = await getStripePublishableKeyQuery();
          const linkingService = new StripePaymentService(
            stripeKey,
            '/shop-api',
            $(() => ({}))
          );
          
          // Use order properties for linking - provide all required parameters
          await linkingService.linkPaymentIntentToOrder(
            store.paymentIntentId,
            order.id || order.code, // orderId
            order.code, // orderCode
            order.totalWithTax || order.total || 0, // finalTotal
            order.customer?.emailAddress // customerEmail (optional)
          );
        }
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

  useVisibleTask$(async ({track}) => {
    track(() => rerenderElement.value);
    console.log('[StripePayment] Initializing payment form...');

    if (!localCart || !localCart.isLocalMode || !localCart.localCart || !localCart.localCart.items || localCart.localCart.items.length === 0) {
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
        $(() => ({}))
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
        const paymentIntentResult = await stripeService.createPaymentIntent(estimatedTotal, 'usd', cartUuid.value);
        console.log('[StripePayment] PaymentIntent created:', paymentIntentResult);
        
        store.clientSecret = paymentIntentResult.clientSecret;
        store.paymentIntentId = paymentIntentResult.paymentIntentId;
        
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

  return (
    <div class="w-full max-w-full">
      <div class="payment-tabs-container relative">
        <div id="payment-form" class="mb-8 w-full max-w-full"></div>
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
