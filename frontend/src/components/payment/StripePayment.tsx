import { component$, noSerialize, useSignal, useStore, useVisibleTask$, $ } from '@qwik.dev/core';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
  getStripePublishableKeyQuery
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { StripePaymentService } from '~/services/StripePaymentService';

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
  const rerenderElement = useSignal(0);
  
  // Generate cart UUID for tracking
  const cartUuid = useSignal<string>('');
  
  const store = useStore({
    clientSecret: '',
    paymentIntentId: '',
    resolvedStripe: noSerialize({} as Stripe),
    stripeElements: noSerialize({} as StripeElements),
    error: '',
    isProcessing: false,
    debugInfo: 'Initializing...',
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
      // Function to confirm payment using proper Stripe flow
      (window as any).confirmStripePreOrderPayment = async (activeOrder?: any) => {
        console.log('[StripePayment] Starting payment confirmation with order:', activeOrder);
        
        if (!store.resolvedStripe || !store.stripeElements) {
          console.error('[StripePayment] Stripe not initialized');
          return { success: false, error: 'Payment system not initialized' };
        }

        if (store.isProcessing) {
          console.log('[StripePayment] Payment already in progress');
          return { success: false, error: 'Payment already in progress' };
        }

        store.isProcessing = true;
        store.error = '';
        store.debugInfo = 'Processing payment...';

        try {
          // Get the order code for the return URL
          const orderCode = activeOrder?.code || 'unknown';
          console.log('[StripePayment] Using order code for confirmation:', orderCode);

          // CRITICAL FIX: Use stripe.confirmPayment() instead of addPaymentToOrderMutation
          console.log('[StripePayment] Calling stripe.confirmPayment()...');
          
          const { error: confirmError } = await store.resolvedStripe.confirmPayment({
            elements: store.stripeElements,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/confirmation/${orderCode}`,
            },
          });

          if (confirmError) {
            console.error('[StripePayment] Payment confirmation failed:', confirmError);
            store.error = confirmError.message || 'Payment confirmation failed';
            store.debugInfo = `Confirmation error: ${confirmError.message || 'Unknown error'}`;
            return { success: false, error: confirmError.message };
          }

          // If we reach here without error, the payment was successful
          // Stripe will redirect to the return_url automatically
          console.log('[StripePayment] Payment confirmed successfully, redirecting...');
          store.debugInfo = 'Payment confirmed! Redirecting...';
          
          return { success: true, orderCode };

        } catch (error) {
          console.error('[StripePayment] Payment confirmation error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Payment failed';
          store.error = errorMessage;
          store.debugInfo = `Error: ${errorMessage}`;
          return { success: false, error: errorMessage };
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

      console.log('[StripePayment] Window functions set up successfully');
      console.log('[StripePayment] confirmStripePreOrderPayment available:', typeof (window as any).confirmStripePreOrderPayment);
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
      const estimatedTotal = localCart.localCart.subTotal;
      
      try {
        const paymentIntentResult = await stripeService.createPaymentIntent(estimatedTotal, 'usd');
        console.log('[StripePayment] PaymentIntent created:', paymentIntentResult);
        
        store.clientSecret = paymentIntentResult.clientSecret;
        store.paymentIntentId = paymentIntentResult.paymentIntentId;
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
      {store.error !== '' && (
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
    </div>
  );
});
