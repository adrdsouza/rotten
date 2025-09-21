import { component$, useSignal, useTask$, $ } from '@builder.io/qwik';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useStripePayment } from '../../hooks/useStripePayment';
import { PaymentErrorDisplay } from '../payment/PaymentErrorDisplay';

export interface StripePaymentFormProps {
  estimatedTotal: number;
  currency?: string;
  orderId?: string;
  orderCode?: string;
  customerEmail?: string;
  publishableKey: string;
  graphqlEndpoint: string;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  onPaymentError?: (error: any) => void;
  className?: string;
}

/**
 * Enhanced Stripe Payment Form Component
 * Implements the 3-step payment flow: Create → Link → Settle
 */
export const StripePaymentForm = component$<StripePaymentFormProps>((props) => {
  const {
    estimatedTotal,
    currency = 'usd',
    orderId,
    orderCode,
    customerEmail,
    publishableKey,
    graphqlEndpoint,
    onPaymentSuccess,
    onPaymentError,
    className = ''
  } = props;

  // Stripe instance
  const stripePromise = useSignal(loadStripe(publishableKey));
  const clientSecret = useSignal<string | null>(null);
  const paymentIntentId = useSignal<string | null>(null);

  // Payment hook
  const payment = useStripePayment({
    publishableKey,
    graphqlEndpoint,
    getAuthHeaders: () => ({
      'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
      'Content-Type': 'application/json'
    }),
    onPaymentSuccess: onPaymentSuccess,
    onPaymentError: onPaymentError,
    enableRetry: true,
    maxRetries: 3
  });

  // Initialize PaymentIntent on mount
  useTask$(async () => {
    if (estimatedTotal > 0 && !clientSecret.value) {
      console.log('🔄 Initializing PaymentIntent...');
      
      const result = await payment.createPaymentIntent(estimatedTotal, currency);
      if (result) {
        clientSecret.value = result.clientSecret;
        paymentIntentId.value = result.paymentIntentId;
        console.log('✅ PaymentIntent initialized');
      }
    }
  });

  // Link PaymentIntent to order when order details are available
  useTask$(async ({ track }) => {
    track(() => orderId);
    track(() => orderCode);
    track(() => paymentIntentId.value);

    if (orderId && orderCode && paymentIntentId.value && customerEmail) {
      console.log('🔗 Linking PaymentIntent to order...');
      
      const success = await payment.linkPaymentIntentToOrder(
        paymentIntentId.value,
        orderId,
        orderCode,
        estimatedTotal,
        customerEmail
      );

      if (success) {
        console.log('✅ PaymentIntent linked to order');
      } else {
        console.error('❌ Failed to link PaymentIntent to order');
      }
    }
  });

  if (!clientSecret.value) {
    return (
      <div class={`stripe-payment-form ${className}`}>
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Initializing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div class={`stripe-payment-form ${className}`}>
      <Elements 
        stripe={stripePromise.value} 
        options={{
          clientSecret: clientSecret.value,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#0570de',
              colorBackground: '#ffffff',
              colorText: '#30313d',
              colorDanger: '#df1b41',
              fontFamily: 'Inter, system-ui, sans-serif',
              spacingUnit: '4px',
              borderRadius: '8px'
            }
          }
        }}
      >
        <PaymentFormContent 
          payment={payment}
          paymentIntentId={paymentIntentId.value}
          clientSecret={clientSecret.value}
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      </Elements>
    </div>
  );
});

interface PaymentFormContentProps {
  payment: ReturnType<typeof useStripePayment>;
  paymentIntentId: string | null;
  clientSecret: string;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  onPaymentError?: (error: any) => void;
}

const PaymentFormContent = component$<PaymentFormContentProps>((props) => {
  const { payment, paymentIntentId, clientSecret, onPaymentSuccess, onPaymentError } = props;
  
  const stripe = useStripe();
  const elements = useElements();
  const isSubmitting = useSignal(false);
  const showRetry = useSignal(false);

  const handleSubmit = $(async (event: Event) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntentId) {
      console.error('❌ Stripe not ready or missing PaymentIntent ID');
      return;
    }

    if (isSubmitting.value) {
      console.log('⚠️ Payment already in progress');
      return;
    }

    try {
      isSubmitting.value = true;
      showRetry.value = false;

      console.log('🔄 Starting payment process...');

      // Complete payment (confirm + settle)
      const success = await payment.completePayment(
        clientSecret,
        elements,
        `${window.location.origin}/checkout/confirmation`
      );

      if (success) {
        console.log('✅ Payment completed successfully');
        if (onPaymentSuccess && paymentIntentId) {
          onPaymentSuccess(paymentIntentId);
        }
      } else {
        console.error('❌ Payment failed');
        showRetry.value = payment.state.canRetry;
        
        if (onPaymentError) {
          onPaymentError({
            message: payment.state.error || 'Payment failed',
            isRetryable: payment.state.canRetry
          });
        }
      }

    } catch (error) {
      console.error('❌ Payment error:', error);
      showRetry.value = true;
      
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      isSubmitting.value = false;
    }
  });

  const handleRetry = $(async () => {
    if (!paymentIntentId) {
      console.error('❌ No PaymentIntent ID for retry');
      return;
    }

    try {
      showRetry.value = false;
      console.log('🔄 Retrying payment settlement...');
      
      const result = await payment.retrySettlement(paymentIntentId);
      
      if (result.success) {
        console.log('✅ Retry successful');
        if (onPaymentSuccess && paymentIntentId) {
          onPaymentSuccess(paymentIntentId);
        }
      } else {
        console.error('❌ Retry failed:', result.error);
        showRetry.value = result.isRetryable ?? false;
        
        if (onPaymentError) {
          onPaymentError({
            message: result.error || 'Retry failed',
            isRetryable: result.isRetryable
          });
        }
      }
    } catch (error) {
      console.error('❌ Retry error:', error);
      showRetry.value = false;
      
      if (onPaymentError) {
        onPaymentError(error);
      }
    }
  });

  const getSubmitButtonText = () => {
    if (isSubmitting.value) {
      switch (payment.state.step) {
        case 'confirming':
          return 'Confirming Payment...';
        case 'settling':
          return 'Processing Payment...';
        default:
          return 'Processing...';
      }
    }
    return 'Complete Payment';
  };

  const getSubmitButtonClass = () => {
    const baseClass = 'submit-button';
    if (isSubmitting.value || !stripe || !elements) {
      return `${baseClass} disabled`;
    }
    if (payment.state.error) {
      return `${baseClass} error`;
    }
    return baseClass;
  };

  return (
    <form onSubmit$={handleSubmit} class="payment-form">
      <div class="payment-element-container">
        <PaymentElement 
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay']
          }}
        />
      </div>

      {payment.state.error && (
        <PaymentErrorDisplay 
          error={payment.state.error}
          canRetry={payment.state.canRetry}
          onRetry={showRetry.value ? handleRetry : undefined}
        />
      )}

      <div class="payment-actions">
        <button
          type="submit"
          class={getSubmitButtonClass()}
          disabled={isSubmitting.value || !stripe || !elements}
        >
          {getSubmitButtonText()}
        </button>

        {showRetry.value && (
          <button
            type="button"
            class="retry-button"
            onClick$={handleRetry}
            disabled={isSubmitting.value}
          >
            Try Again
          </button>
        )}
      </div>

      {payment.state.step !== 'idle' && payment.state.step !== 'completed' && (
        <div class="payment-status">
          <div class="status-indicator">
            <div class="status-spinner"></div>
            <span class="status-text">
              {payment.state.step === 'creating' && 'Creating payment...'}
              {payment.state.step === 'linking' && 'Linking to order...'}
              {payment.state.step === 'confirming' && 'Confirming with bank...'}
              {payment.state.step === 'settling' && 'Finalizing payment...'}
              {payment.state.step === 'failed' && 'Payment failed'}
            </span>
          </div>
        </div>
      )}

      <div class="payment-security">
        <div class="security-icons">
          <span class="security-icon">🔒</span>
          <span class="security-text">Secured by Stripe</span>
        </div>
        <p class="security-notice">
          Your payment information is encrypted and secure. We never store your card details.
        </p>
      </div>
    </form>
  );
});

// CSS styles (you can move this to a separate CSS file)
export const StripePaymentFormStyles = `
.stripe-payment-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #0570de;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.payment-element-container {
  padding: 20px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  background: #ffffff;
}

.payment-actions {
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.submit-button {
  width: 100%;
  padding: 16px 24px;
  background: #0570de;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button:hover:not(.disabled) {
  background: #0461c7;
  transform: translateY(-1px);
}

.submit-button.disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.submit-button.error {
  background: #df1b41;
}

.retry-button {
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  color: #0570de;
  border: 2px solid #0570de;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #0570de;
  color: white;
}

.payment-status {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #0570de;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e6e6e6;
  border-top: 2px solid #0570de;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.status-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.payment-security {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 8px;
}

.security-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.security-icon {
  font-size: 16px;
}

.security-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.security-notice {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .stripe-payment-form {
    padding: 16px;
  }
  
  .payment-element-container {
    padding: 16px;
  }
  
  .submit-button {
    padding: 14px 20px;
    font-size: 15px;
  }
}
`;