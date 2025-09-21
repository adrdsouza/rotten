import { component$, useSignal, useTask$, $ } from '@builder.io/qwik';
import { useLocation, useNavigate } from '@builder.io/qwik-city';
import { useStripePayment } from '../../hooks/useStripePayment';

export interface PaymentConfirmationProps {
  publishableKey: string;
  graphqlEndpoint: string;
  onConfirmationComplete?: (success: boolean, paymentIntentId?: string) => void;
  className?: string;
}

/**
 * Payment Confirmation Component
 * Handles the confirmation page after Stripe redirects back from payment
 */
export const PaymentConfirmation = component$<PaymentConfirmationProps>((props) => {
  const {
    publishableKey,
    graphqlEndpoint,
    onConfirmationComplete,
    className = ''
  } = props;

  const location = useLocation();
  const navigate = useNavigate();

  // State
  const isProcessing = useSignal(true);
  const paymentStatus = useSignal<'processing' | 'succeeded' | 'failed' | 'requires_action'>('processing');
  const errorMessage = useSignal<string | null>(null);
  const paymentIntentId = useSignal<string | null>(null);

  // Payment hook
  const payment = useStripePayment({
    publishableKey,
    graphqlEndpoint,
    getAuthHeaders: () => ({
      'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
      'Content-Type': 'application/json'
    }),
    onPaymentSuccess: (id: string) => {
      console.log('✅ Payment confirmation successful:', id);
      paymentStatus.value = 'succeeded';
      if (onConfirmationComplete) {
        onConfirmationComplete(true, id);
      }
    },
    onPaymentError: (error: any) => {
      console.error('❌ Payment confirmation failed:', error);
      paymentStatus.value = 'failed';
      errorMessage.value = error.message || 'Payment confirmation failed';
      if (onConfirmationComplete) {
        onConfirmationComplete(false);
      }
    }
  });

  // Process payment confirmation on mount
  useTask$(async () => {
    const urlParams = new URLSearchParams(location.url.search);
    const clientSecret = urlParams.get('payment_intent_client_secret');
    const paymentIntentParam = urlParams.get('payment_intent');
    const redirectStatus = urlParams.get('redirect_status');

    console.log('🔄 Processing payment confirmation...', {
      clientSecret: clientSecret ? 'present' : 'missing',
      paymentIntent: paymentIntentParam,
      redirectStatus
    });

    if (!clientSecret && !paymentIntentParam) {
      console.error('❌ Missing payment parameters in URL');
      paymentStatus.value = 'failed';
      errorMessage.value = 'Invalid payment confirmation URL';
      isProcessing.value = false;
      return;
    }

    try {
      // Extract PaymentIntent ID
      const piId = paymentIntentParam || (clientSecret ? clientSecret.split('_secret_')[0] : null);
      
      if (!piId) {
        throw new Error('Could not determine PaymentIntent ID');
      }

      paymentIntentId.value = piId;

      // Check redirect status first
      if (redirectStatus === 'failed') {
        console.error('❌ Stripe redirect indicates payment failed');
        paymentStatus.value = 'failed';
        errorMessage.value = 'Payment was not successful';
        isProcessing.value = false;
        return;
      }

      // Get current payment status
      console.log('🔍 Checking PaymentIntent status...');
      const statusInfo = await payment.getPaymentStatus(piId);
      
      console.log('📊 PaymentIntent status:', statusInfo);

      if (statusInfo.status === 'succeeded') {
        // Payment succeeded, attempt settlement
        console.log('✅ Payment succeeded, attempting settlement...');
        
        const settlementResult = await payment.settlePayment(piId);
        
        if (settlementResult.success) {
          console.log('✅ Settlement successful');
          paymentStatus.value = 'succeeded';
        } else {
          console.error('❌ Settlement failed:', settlementResult.error);
          paymentStatus.value = 'failed';
          errorMessage.value = settlementResult.error || 'Payment settlement failed';
        }
      } else if (statusInfo.status === 'requires_action') {
        console.log('⚠️ Payment requires additional action');
        paymentStatus.value = 'requires_action';
        errorMessage.value = 'Payment requires additional authentication';
      } else if (statusInfo.status === 'processing') {
        console.log('⏳ Payment is still processing');
        paymentStatus.value = 'processing';
        // Could implement polling here
      } else {
        console.error('❌ Payment failed with status:', statusInfo.status);
        paymentStatus.value = 'failed';
        errorMessage.value = statusInfo.userMessage || `Payment failed: ${statusInfo.status}`;
      }

    } catch (error) {
      console.error('❌ Error processing payment confirmation:', error);
      paymentStatus.value = 'failed';
      errorMessage.value = error.message || 'Failed to confirm payment';
    } finally {
      isProcessing.value = false;
    }
  });

  const handleRetry = $(async () => {
    if (!paymentIntentId.value) {
      console.error('❌ No PaymentIntent ID for retry');
      return;
    }

    try {
      isProcessing.value = true;
      errorMessage.value = null;
      paymentStatus.value = 'processing';

      console.log('🔄 Retrying payment settlement...');
      
      const result = await payment.retrySettlement(paymentIntentId.value);
      
      if (result.success) {
        console.log('✅ Retry successful');
        paymentStatus.value = 'succeeded';
        if (onConfirmationComplete) {
          onConfirmationComplete(true, paymentIntentId.value);
        }
      } else {
        console.error('❌ Retry failed:', result.error);
        paymentStatus.value = 'failed';
        errorMessage.value = result.error || 'Retry failed';
      }
    } catch (error) {
      console.error('❌ Retry error:', error);
      paymentStatus.value = 'failed';
      errorMessage.value = error.message || 'Retry failed';
    } finally {
      isProcessing.value = false;
    }
  });

  const handleGoToOrders = $(() => {
    navigate('/account/orders');
  });

  const handleTryAgain = $(() => {
    navigate('/checkout');
  });

  if (isProcessing.value) {
    return (
      <div class={`payment-confirmation ${className}`}>
        <div class="confirmation-container processing">
          <div class="status-icon">
            <div class="loading-spinner"></div>
          </div>
          <h2>Processing Payment...</h2>
          <p>Please wait while we confirm your payment.</p>
          <div class="processing-steps">
            <div class="step active">
              <span class="step-number">1</span>
              <span class="step-text">Verifying payment</span>
            </div>
            <div class="step">
              <span class="step-number">2</span>
              <span class="step-text">Finalizing order</span>
            </div>
            <div class="step">
              <span class="step-number">3</span>
              <span class="step-text">Sending confirmation</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus.value === 'succeeded') {
    return (
      <div class={`payment-confirmation ${className}`}>
        <div class="confirmation-container success">
          <div class="status-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
          </div>
          <h2>Payment Successful!</h2>
          <p>Your payment has been processed successfully.</p>
          {paymentIntentId.value && (
            <div class="payment-details">
              <p class="payment-id">Payment ID: {paymentIntentId.value}</p>
            </div>
          )}
          <div class="confirmation-actions">
            <button class="primary-button" onClick$={handleGoToOrders}>
              View Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus.value === 'requires_action') {
    return (
      <div class={`payment-confirmation ${className}`}>
        <div class="confirmation-container warning">
          <div class="status-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2>Additional Authentication Required</h2>
          <p>Your payment requires additional authentication from your bank.</p>
          <div class="confirmation-actions">
            <button class="primary-button" onClick$={handleTryAgain}>
              Complete Authentication
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div class={`payment-confirmation ${className}`}>
      <div class="confirmation-container error">
        <div class="status-icon error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h2>Payment Failed</h2>
        <p>{errorMessage.value || 'Your payment could not be processed.'}</p>
        {paymentIntentId.value && (
          <div class="payment-details">
            <p class="payment-id">Payment ID: {paymentIntentId.value}</p>
          </div>
        )}
        <div class="confirmation-actions">
          <button class="primary-button" onClick$={handleRetry}>
            Try Again
          </button>
          <button class="secondary-button" onClick$={handleTryAgain}>
            Back to Checkout
          </button>
        </div>
      </div>
    </div>
  );
});

// CSS styles (you can move this to a separate CSS file)
export const PaymentConfirmationStyles = `
.payment-confirmation {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.confirmation-container {
  max-width: 500px;
  width: 100%;
  text-align: center;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background: white;
}

.confirmation-container.processing {
  border-left: 4px solid #0570de;
}

.confirmation-container.success {
  border-left: 4px solid #10b981;
}

.confirmation-container.warning {
  border-left: 4px solid #f59e0b;
}

.confirmation-container.error {
  border-left: 4px solid #ef4444;
}

.status-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.status-icon.success {
  background: #dcfce7;
  color: #10b981;
}

.status-icon.warning {
  background: #fef3c7;
  color: #f59e0b;
}

.status-icon.error {
  background: #fee2e2;
  color: #ef4444;
}

.status-icon svg {
  width: 32px;
  height: 32px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #0570de;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.confirmation-container h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
  color: #1f2937;
}

.confirmation-container p {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 24px;
  line-height: 1.5;
}

.payment-details {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
}

.payment-id {
  font-family: monospace;
  font-size: 14px;
  color: #374151;
  margin: 0;
}

.processing-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 32px 0;
  text-align: left;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.step.active .step-number {
  background: #0570de;
  color: white;
}

.step-text {
  font-size: 14px;
  color: #374151;
}

.confirmation-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.primary-button {
  background: #0570de;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.primary-button:hover {
  background: #0461c7;
  transform: translateY(-1px);
}

.secondary-button {
  background: transparent;
  color: #0570de;
  border: 2px solid #0570de;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-button:hover {
  background: #0570de;
  color: white;
}

@media (max-width: 768px) {
  .payment-confirmation {
    padding: 20px 16px;
  }
  
  .confirmation-container {
    padding: 32px 24px;
  }
  
  .confirmation-actions {
    flex-direction: column;
  }
  
  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
`;