/**
 * 🔒 SECURE STRIPE PAYMENT COMPONENT
 * 
 * This component implements secure Stripe payment processing following official best practices:
 * 1. Accepts specific order details as props (no global state dependency)
 * 2. Creates payment intents AFTER order creation with exact amounts
 * 3. Validates payment amounts match order totals
 * 4. Follows Stripe's recommended security guidelines
 */

import { component$, noSerialize, useStore, useVisibleTask$, $ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import { Order } from '~/generated/graphql';
import { secureStripePaymentService } from '~/services/SecureStripePaymentService';
import { addPaymentToOrderMutation } from '~/providers/shop/orders/order';

import XCircleIcon from '../icons/XCircleIcon';

interface SecureStripePaymentProps {
  order: Order;
  onSuccess$: (orderCode: string) => void;
  onError$: (error: string) => void;
}

let _stripe: Promise<Stripe | null>;
function getStripe(publishableKey: string) {
  if (!_stripe && publishableKey) {
    _stripe = loadStripe(publishableKey);
  }
  return _stripe;
}

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = getStripe(stripeKey);

export default component$<SecureStripePaymentProps>(({ order, onSuccess$, onError$ }) => {
  const baseUrl = useLocation().url.origin;

  const store = useStore({
    clientSecret: '',
    paymentIntentId: '',
    resolvedStripe: noSerialize({} as Stripe),
    stripeElements: noSerialize({} as StripeElements),
    paymentElement: noSerialize({} as any),
    error: '',
    isProcessing: false,
    isInitialized: false,
    debugInfo: 'Initializing secure payment...',
  });

  // 🔒 SECURITY FIX: Initialize payment with specific order details
  useVisibleTask$(async () => {
    console.log('[SecureStripePayment] Initializing with order:', order.code, 'amount:', order.totalWithTax);

    try {
      // 1. Validate order before proceeding
      if (!order || !order.id || !order.code || !order.totalWithTax) {
        store.error = 'Invalid order information provided';
        store.debugInfo = 'Error: Invalid order data';
        return;
      }

      if (order.state !== 'ArrangingPayment') {
        store.error = `Order is not ready for payment. Current state: ${order.state}`;
        store.debugInfo = `Error: Order state is ${order.state}, expected ArrangingPayment`;
        return;
      }

      store.debugInfo = 'Creating secure payment intent...';

      // 2. Create secure payment intent with order validation
      const paymentIntentResult = await secureStripePaymentService.createSecurePaymentIntent(order);
      
      store.clientSecret = paymentIntentResult.clientSecret;
      store.paymentIntentId = paymentIntentResult.paymentIntentId;
      
      console.log('[SecureStripePayment] Secure payment intent created:', store.paymentIntentId);
      store.debugInfo = `Secure payment intent created: ${store.paymentIntentId}`;

      // 3. Initialize Stripe Elements
      store.debugInfo = 'Loading Stripe...';
      const stripe = await stripePromise;

      if (!stripe) {
        store.error = 'Failed to load Stripe';
        store.debugInfo = 'Error: Stripe failed to load';
        return;
      }

      store.resolvedStripe = noSerialize(stripe);

      // 4. Create Elements with the secure client secret
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

      // 5. Create and mount payment element
      const paymentElement = elements.create('payment', {
        layout: 'tabs',
        paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'paypal'],
        defaultValues: {
          billingDetails: {
            name: order.customer?.firstName && order.customer?.lastName 
              ? `${order.customer.firstName} ${order.customer.lastName}` 
              : '',
            email: order.customer?.emailAddress || '',
          }
        }
      });

      store.paymentElement = noSerialize(paymentElement);

      const mountTarget = document.getElementById('secure-payment-form');
      if (!mountTarget) {
        store.error = 'Payment form mount target not found';
        store.debugInfo = 'Error: #secure-payment-form element missing';
        return;
      }

      await paymentElement.mount('#secure-payment-form');
      store.debugInfo = 'Secure payment form ready!';
      store.isInitialized = true;

      // Add event listeners
      paymentElement.on('ready', () => {
        console.log('[SecureStripePayment] Payment element ready');
        store.debugInfo = 'Payment form is ready for input!';
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

    } catch (error) {
      console.error('[SecureStripePayment] Initialization error:', error);
      store.error = error instanceof Error ? error.message : 'Failed to initialize secure payment';
      store.debugInfo = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  });

  // 🔒 SECURITY FIX: Secure payment processing function
  const processSecurePayment = $(async () => {
    if (store.isProcessing || !store.isInitialized) return;

    store.isProcessing = true;
    store.error = '';
    store.debugInfo = 'Processing secure payment...';

    try {
      console.log('[SecureStripePayment] Processing payment for order:', order.code);

      // Use the secure payment service to process payment
      const result = await secureStripePaymentService.processSecurePayment(
        order,
        store.resolvedStripe,
        store.stripeElements
      );

      if (!result.success) {
        store.error = result.error || 'Payment processing failed';
        store.debugInfo = `Payment failed: ${result.error}`;
        store.isProcessing = false;
        return;
      }

      store.debugInfo = 'Payment confirmed, settling with backend...';

      // Add payment to order using the validated payment intent
      const paymentResult = await addPaymentToOrderMutation({
        method: 'stripe',
        metadata: {
          paymentIntentId: result.paymentIntentId,
          stripePaymentIntentId: result.paymentIntentId,
          amount: order.totalWithTax,
          currency: order.currencyCode.toLowerCase(),
          status: 'succeeded'
        }
      });

      console.log('[SecureStripePayment] Payment settled successfully:', paymentResult);
      store.debugInfo = 'Payment completed successfully!';

      // Clear local cart after successful payment
      try {
        const { LocalCartService } = await import('~/services/LocalCartService');
        LocalCartService.clearCart();
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cart-updated', {
            detail: { totalQuantity: 0 }
          }));
        }
      } catch (clearCartError) {
        console.warn('[SecureStripePayment] Failed to clear cart:', clearCartError);
      }

      // Redirect to confirmation
      await onSuccess$(order.code);

    } catch (error) {
      console.error('[SecureStripePayment] Payment processing error:', error);
      store.error = error instanceof Error ? error.message : 'Payment processing failed';
      store.debugInfo = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      store.isProcessing = false;
    }
  });

  return (
    <div class="w-full max-w-full">
      <div class="mb-4">
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          🔒 Secure Payment for Order {order.code}
        </h3>
        <p class="text-sm text-gray-600">
          Total: {order.currencyCode} {(order.totalWithTax / 100).toFixed(2)}
        </p>
      </div>

      <div class="secure-payment-container relative">
        <div id="secure-payment-form" class="mb-6 w-full max-w-full"></div>
      </div>

      {store.error && (
        <div class="rounded-md bg-red-50 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <XCircleIcon />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Payment Error</h3>
              <p class="text-sm text-red-700 mt-2">{store.error}</p>
            </div>
          </div>
        </div>
      )}

      {store.isInitialized && (
        <button
          onClick$={processSecurePayment}
          disabled={store.isProcessing || !!store.error}
          class={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            store.isProcessing || !!store.error
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          {store.isProcessing ? 'Processing Payment...' : `Pay ${order.currencyCode} ${(order.totalWithTax / 100).toFixed(2)}`}
        </button>
      )}

      <div class="mt-4 text-xs text-gray-500">
        Debug: {store.debugInfo}
      </div>
    </div>
  );
});
