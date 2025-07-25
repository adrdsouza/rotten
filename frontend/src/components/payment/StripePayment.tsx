import { component$, useSignal, useVisibleTask$, $, QRL } from '@qwik.dev/core';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { createStripePaymentIntentMutation, addPaymentToOrderMutation } from '~/providers/shop/checkout/checkout';

interface StripePaymentProps {
  onForward$: QRL<(orderCode: string) => void>;
  onError$: QRL<(errorMessage: string) => void>;
  onProcessingChange$?: QRL<(isProcessing: boolean) => void>;
  amount: number;
  isDisabled?: boolean;
}

export default component$<StripePaymentProps>(({ onForward$, onError$, onProcessingChange$, amount, isDisabled }) => {
  const stripe = useSignal<Stripe | null>(null);
  const elements = useSignal<StripeElements | null>(null);
  const cardElement = useSignal<any>(null);
  const clientSecret = useSignal<string>('');
  const paymentIntentId = useSignal<string>('');
  const isProcessing = useSignal(false);
  const errorMessage = useSignal<string>('');

  // Initialize Stripe
  useVisibleTask$(async () => {
    try {
      // Load Stripe with publishable key from environment
      const stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
      stripe.value = stripeInstance;

      if (stripeInstance && amount > 0) {
        // Create payment intent
        const paymentIntent = await createStripePaymentIntentMutation(amount);
        clientSecret.value = paymentIntent.clientSecret;
        paymentIntentId.value = paymentIntent.paymentIntentId;

        // Create elements
        elements.value = stripeInstance.elements({
          clientSecret: paymentIntent.clientSecret,
        });

        // Create and mount card element
        const cardElementInstance = elements.value.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
          },
        });

        cardElement.value = cardElementInstance;
        cardElementInstance.mount('#card-element');
      }
    } catch (error) {
      console.error('Stripe initialization error:', error);
      errorMessage.value = 'Failed to initialize payment system';
      await onError$('Failed to initialize payment system');
    }
  });

  const handleSubmit = $(async () => {
    if (!stripe.value || !elements.value || !cardElement.value || isProcessing.value) {
      return;
    }

    isProcessing.value = true;
    errorMessage.value = '';
    
    if (onProcessingChange$) {
      await onProcessingChange$(true);
    }

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.value.confirmCardPayment(clientSecret.value, {
        payment_method: {
          card: cardElement.value,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Add payment to Vendure order
        const result = await addPaymentToOrderMutation({
          method: 'stripe',
          metadata: {
            paymentIntentId: paymentIntentId.value,
          },
        });

        if (result && result.code) {
          await onForward$(result.code);
        } else {
          throw new Error('Failed to add payment to order');
        }
      } else {
        throw new Error(`Payment failed with status: ${paymentIntent?.status}`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      errorMessage.value = error?.message || 'Payment failed';
      await onError$(errorMessage.value);
    } finally {
      isProcessing.value = false;
      if (onProcessingChange$) {
        await onProcessingChange$(false);
      }
    }
  });

  return (
    <div class="space-y-4">
      <div class="bg-white p-6 rounded-lg border border-gray-200">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Credit Card Payment</h3>
        
        {/* Stripe Card Element */}
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div 
            id="card-element" 
            class="p-3 border border-gray-300 rounded-md bg-white"
          ></div>
        </div>

        {/* Error Message */}
        {errorMessage.value && (
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-600">{errorMessage.value}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick$={handleSubmit}
          disabled={isDisabled || isProcessing.value || !clientSecret.value}
          class={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            isDisabled || isProcessing.value || !clientSecret.value
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#B09983] text-white hover:bg-[#4F3B26]'
          }`}
        >
          {isProcessing.value ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>

      {/* Security Notice */}
      <div class="text-center text-sm text-gray-500">
        <p>🔒 Your payment information is secure and encrypted</p>
      </div>
    </div>
  );
});
