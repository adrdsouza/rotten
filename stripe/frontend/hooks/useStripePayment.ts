import { useSignal, useComputed$ } from '@builder.io/qwik';
import { StripePaymentService, PaymentIntentResult, SettlementResult } from '../services/stripe-payment.service';
import { PaymentError } from '../services/payment-error-handler';

export interface UseStripePaymentOptions {
  publishableKey: string;
  graphqlEndpoint: string;
  getAuthHeaders: () => Record<string, string>;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  onPaymentError?: (error: PaymentError) => void;
  enableRetry?: boolean;
  maxRetries?: number;
}

export interface PaymentState {
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  paymentIntentId: string | null;
  clientSecret: string | null;
  step: 'idle' | 'creating' | 'linking' | 'confirming' | 'settling' | 'completed' | 'failed';
  canRetry: boolean;
  retryCount: number;
}

/**
 * Comprehensive Stripe payment hook for Qwik
 * Manages the complete 3-step payment flow with error handling and retry logic
 */
export const useStripePayment = (options: UseStripePaymentOptions) => {
  const {
    publishableKey,
    graphqlEndpoint,
    getAuthHeaders,
    onPaymentSuccess,
    onPaymentError,
    maxRetries = 3
  } = options;

  // Payment state
  const state = useSignal<PaymentState>({
    isLoading: false,
    isProcessing: false,
    error: null,
    paymentIntentId: null,
    clientSecret: null,
    step: 'idle',
    canRetry: false,
    retryCount: 0
  });

  // Stripe service instance
  const stripeService = useSignal<StripePaymentService | null>(null);

  // Initialize Stripe service
  const initializeService = $(() => {
    if (!stripeService.value) {
      stripeService.value = new StripePaymentService(
        publishableKey,
        graphqlEndpoint,
        getAuthHeaders
      );
    }
    return stripeService.value;
  });

  // Computed properties
  const isReady = useComputed$(() => {
    return stripeService.value?.isInitialized() ?? false;
  });

  const canProceed = useComputed$(() => {
    return !state.value.isLoading && !state.value.isProcessing && !state.value.error;
  });

  /**
   * Step 1: Create PaymentIntent
   */
  const createPaymentIntent = $(async (estimatedTotal: number, currency = 'usd'): Promise<PaymentIntentResult | null> => {
    const service = await initializeService();
    
    try {
      state.value = {
        ...state.value,
        isLoading: true,
        error: null,
        step: 'creating'
      };

      console.log('🔄 Creating PaymentIntent...');
      const result = await service.createPaymentIntent(estimatedTotal, currency);

      state.value = {
        ...state.value,
        isLoading: false,
        paymentIntentId: result.paymentIntentId,
        clientSecret: result.clientSecret,
        step: 'idle'
      };

      console.log('✅ PaymentIntent created successfully');
      return result;

    } catch (error: any) {
      console.error('❌ Failed to create PaymentIntent:', error);
      
      state.value = {
        ...state.value,
        isLoading: false,
        error: error.message || 'Failed to create payment',
        step: 'failed',
        canRetry: error.isRetryable ?? true
      };

      if (onPaymentError) {
        onPaymentError(error);
      }

      return null;
    }
  });

  /**
   * Step 2: Link PaymentIntent to order
   */
  const linkPaymentIntentToOrder = $(async (
    paymentIntentId: string,
    orderId: string,
    orderCode: string,
    finalTotal: number,
    customerEmail: string
  ): Promise<boolean> => {
    const service = await initializeService();

    try {
      state.value = {
        ...state.value,
        isLoading: true,
        error: null,
        step: 'linking'
      };

      console.log('🔗 Linking PaymentIntent to order...');
      const success = await service.linkPaymentIntentToOrder(
        paymentIntentId,
        orderId,
        orderCode,
        finalTotal,
        customerEmail
      );

      state.value = {
        ...state.value,
        isLoading: false,
        step: success ? 'idle' : 'failed',
        error: success ? null : 'Failed to link payment to order',
        canRetry: !success
      };

      if (success) {
        console.log('✅ PaymentIntent linked successfully');
      } else {
        console.error('❌ Failed to link PaymentIntent');
      }

      return success;

    } catch (error: any) {
      console.error('❌ Error linking PaymentIntent:', error);
      
      state.value = {
        ...state.value,
        isLoading: false,
        error: error.message || 'Failed to link payment',
        step: 'failed',
        canRetry: error.isRetryable ?? true
      };

      if (onPaymentError) {
        onPaymentError(error);
      }

      return false;
    }
  });

  /**
   * Step 3: Complete payment (confirm + settle)
   */
  const completePayment = $(async (
    clientSecret: string,
    elements: any, // StripeElements
    returnUrl?: string
  ): Promise<boolean> => {
    const service = await initializeService();

    try {
      state.value = {
        ...state.value,
        isProcessing: true,
        error: null,
        step: 'confirming'
      };

      console.log('🔄 Completing payment...');
      const result = await service.completePayment(clientSecret, elements, returnUrl);

      if (result.success) {
        state.value = {
          ...state.value,
          isProcessing: false,
          step: 'completed',
          error: null
        };

        console.log('✅ Payment completed successfully');
        
        if (onPaymentSuccess && state.value.paymentIntentId) {
          onPaymentSuccess(state.value.paymentIntentId);
        }

        return true;

      } else {
        state.value = {
          ...state.value,
          isProcessing: false,
          step: 'failed',
          error: result.error || 'Payment failed',
          canRetry: !result.requiresAction
        };

        console.error('❌ Payment failed:', result.error);

        if (onPaymentError) {
          onPaymentError({
            message: result.error || 'Payment failed',
            isRetryable: !result.requiresAction,
            requiresUserAction: result.requiresAction
          } as PaymentError);
        }

        return false;
      }

    } catch (error: any) {
      console.error('❌ Payment completion error:', error);
      
      state.value = {
        ...state.value,
        isProcessing: false,
        error: error.message || 'Payment failed',
        step: 'failed',
        canRetry: error.isRetryable ?? true
      };

      if (onPaymentError) {
        onPaymentError(error);
      }

      return false;
    }
  });

  /**
   * Settle payment only (after manual Stripe confirmation)
   */
  const settlePayment = $(async (paymentIntentId: string): Promise<SettlementResult> => {
    const service = await initializeService();

    try {
      state.value = {
        ...state.value,
        isProcessing: true,
        error: null,
        step: 'settling'
      };

      console.log('🔄 Settling payment...');
      const result = await service.settlePayment(paymentIntentId);

      if (result.success) {
        state.value = {
          ...state.value,
          isProcessing: false,
          step: 'completed',
          error: null
        };

        console.log('✅ Payment settled successfully');
        
        if (onPaymentSuccess) {
          onPaymentSuccess(paymentIntentId);
        }

      } else {
        state.value = {
          ...state.value,
          isProcessing: false,
          step: 'failed',
          error: result.error || 'Settlement failed',
          canRetry: result.isRetryable ?? true
        };

        console.error('❌ Settlement failed:', result.error);
      }

      return result;

    } catch (error: any) {
      console.error('❌ Settlement error:', error);
      
      const result: SettlementResult = {
        success: false,
        error: error.message || 'Settlement failed',
        isRetryable: error.isRetryable ?? true
      };

      state.value = {
        ...state.value,
        isProcessing: false,
        error: result.error,
        step: 'failed',
        canRetry: result.isRetryable
      };

      if (onPaymentError) {
        onPaymentError(error);
      }

      return result;
    }
  });

  /**
   * Retry failed operation
   */
  const retry = $(async (): Promise<void> => {
    if (!state.value.canRetry || state.value.retryCount >= maxRetries) {
      console.warn('⚠️ Cannot retry: max retries reached or not retryable');
      return;
    }

    state.value = {
      ...state.value,
      retryCount: state.value.retryCount + 1,
      error: null
    };

    console.log(`🔄 Retrying operation (attempt ${state.value.retryCount}/${maxRetries})`);

    // Retry logic would depend on the current step
    // This is a simplified version - in practice, you'd need to track what operation failed
    if (state.value.step === 'failed' && state.value.paymentIntentId && state.value.clientSecret) {
      // Retry settlement if we have the necessary data
      await settlePayment(state.value.paymentIntentId);
    }
  });

  /**
   * Reset payment state
   */
  const reset = $(() => {
    state.value = {
      isLoading: false,
      isProcessing: false,
      error: null,
      paymentIntentId: null,
      clientSecret: null,
      step: 'idle',
      canRetry: false,
      retryCount: 0
    };
    console.log('🔄 Payment state reset');
  });

  /**
   * Get payment status for debugging
   */
  const getPaymentStatus = $(async (paymentIntentId: string): Promise<any> => {
    const service = await initializeService();
    
    try {
      return await service.getPaymentIntentStatus(paymentIntentId);
    } catch (error) {
      console.error('❌ Failed to get payment status:', error);
      throw error;
    }
  });

  /**
   * Retry settlement with exponential backoff
   */
  const retrySettlement = $(async (paymentIntentId: string): Promise<SettlementResult> => {
    const service = await initializeService();
    
    try {
      state.value = {
        ...state.value,
        isProcessing: true,
        error: null,
        step: 'settling'
      };

      console.log('🔄 Retrying settlement with backoff...');
      const result = await service.retrySettlement(paymentIntentId, maxRetries);

      state.value = {
        ...state.value,
        isProcessing: false,
        step: result.success ? 'completed' : 'failed',
        error: result.success ? null : result.error,
        canRetry: result.success ? false : (result.isRetryable ?? false)
      };

      if (result.success && onPaymentSuccess) {
        onPaymentSuccess(paymentIntentId);
      } else if (!result.success && onPaymentError) {
        onPaymentError({
          message: result.error || 'Settlement failed',
          isRetryable: result.isRetryable ?? false
        } as PaymentError);
      }

      return result;

    } catch (error: any) {
      console.error('❌ Retry settlement error:', error);
      
      state.value = {
        ...state.value,
        isProcessing: false,
        step: 'failed',
        error: error.message || 'Retry failed',
        canRetry: false
      };

      const result: SettlementResult = {
        success: false,
        error: error.message || 'Retry failed'
      };

      if (onPaymentError) {
        onPaymentError(error);
      }

      return result;
    }
  });

  return {
    // State
    state: state.value,
    isReady,
    canProceed,

    // Actions
    createPaymentIntent,
    linkPaymentIntentToOrder,
    completePayment,
    settlePayment,
    retry,
    reset,
    getPaymentStatus,
    retrySettlement,

    // Utilities
    getStripeService: () => stripeService.value
  };
};