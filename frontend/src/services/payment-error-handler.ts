export interface PaymentError {
  message: string;
  isRetryable: boolean;
  retryDelayMs?: number;
  errorCode?: string;
  category?: 'network' | 'stripe' | 'validation' | 'system' | 'user';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userAction?: string;
}

export class PaymentErrorHandler {
  /**
   * Handle payment errors with appropriate user-friendly messages
   */
  handlePaymentError(error: any, context: string): PaymentError {
    console.error(`[PaymentErrorHandler] ${context}:`, error);

    if (!error) {
      return {
        message: 'An unknown payment error occurred',
        isRetryable: false,
        category: 'system',
        severity: 'medium'
      };
    }

    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return {
        message: 'Network connection failed. Please check your internet connection and try again.',
        isRetryable: true,
        retryDelayMs: 2000,
        errorCode: 'NETWORK_ERROR',
        category: 'network',
        severity: 'medium',
        userAction: 'Check your internet connection and try again'
      };
    }

    // Stripe-specific errors
    if (error.type) {
      return this.handleStripeError(error);
    }

    // Settlement-specific errors
    if (context.includes('settlement') || context.includes('settle')) {
      return this.handleSettlementError(error);
    }

    // GraphQL errors
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('fetch')) {
        return {
          message: 'Connection failed. Please try again.',
          isRetryable: true,
          retryDelayMs: 1000,
          errorCode: 'CONNECTION_FAILED',
          category: 'network',
          severity: 'medium',
          userAction: 'Try again in a moment'
        };
      }

      if (error.message.includes('timeout')) {
        return {
          message: 'Request timed out. Please try again.',
          isRetryable: true,
          retryDelayMs: 2000,
          errorCode: 'TIMEOUT',
          category: 'network',
          severity: 'medium',
          userAction: 'Try again in a moment'
        };
      }

      if (error.message.includes('already settled')) {
        return {
          message: 'This payment has already been processed successfully.',
          isRetryable: false,
          errorCode: 'ALREADY_SETTLED',
          category: 'validation',
          severity: 'low',
          userAction: 'No action needed - payment is complete'
        };
      }

      if (error.message.includes('order not found')) {
        return {
          message: 'Order not found. Please contact support.',
          isRetryable: false,
          errorCode: 'ORDER_NOT_FOUND',
          category: 'validation',
          severity: 'high',
          userAction: 'Contact customer support'
        };
      }
    }

    // Generic error
    return {
      message: error.message || 'Payment processing failed. Please try again.',
      isRetryable: true,
      retryDelayMs: 1000,
      errorCode: 'GENERIC_ERROR',
      category: 'system',
      severity: 'medium',
      userAction: 'Try again or contact support if the problem persists'
    };
  }

  /**
   * Handle Stripe-specific errors with appropriate messages
   */
  getStripeErrorMessage(error: any): string {
    if (!error) return 'Payment failed';

    switch (error.type) {
      case 'card_error':
        switch (error.code) {
          case 'card_declined':
            return 'Your card was declined. Please try a different card or payment method.';
          case 'insufficient_funds':
            return 'Insufficient funds. Please use a different card or add funds to your account.';
          case 'expired_card':
            return 'Your card has expired. Please use a different card.';
          case 'incorrect_cvc':
            return 'Your card\'s security code (CVC) is incorrect. Please check and try again.';
          case 'incorrect_number':
            return 'Your card number is incorrect. Please check and try again.';
          case 'authentication_required':
            return 'Additional authentication is required. Please complete the verification process.';
          default:
            return error.message || 'Your card was declined. Please try a different payment method.';
        }

      case 'validation_error':
        return 'Please check your payment information and try again.';

      case 'api_error':
        return 'A payment processing error occurred. Please try again.';

      case 'rate_limit_error':
        return 'Too many requests. Please wait a moment and try again.';

      default:
        return error.message || 'Payment processing failed. Please try again.';
    }
  }

  /**
   * Handle settlement-specific errors
   */
  private handleSettlementError(error: any): PaymentError {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('payment not found')) {
      return {
        message: 'Payment session has expired. Please start over.',
        isRetryable: false,
        errorCode: 'PAYMENT_NOT_FOUND',
        category: 'validation',
        severity: 'medium',
        userAction: 'Start a new payment'
      };
    }

    if (message.includes('already settled')) {
      return {
        message: 'This payment has already been completed successfully.',
        isRetryable: false,
        errorCode: 'ALREADY_SETTLED',
        category: 'validation',
        severity: 'low',
        userAction: 'No action needed'
      };
    }

    if (message.includes('stripe verification failed')) {
      return {
        message: 'Payment verification failed. Please try again or use a different payment method.',
        isRetryable: true,
        retryDelayMs: 3000,
        errorCode: 'VERIFICATION_FAILED',
        category: 'stripe',
        severity: 'medium',
        userAction: 'Try again or use a different payment method'
      };
    }

    if (message.includes('payment service not available')) {
      return {
        message: 'Payment service is temporarily unavailable. Please try again in a few moments.',
        isRetryable: true,
        retryDelayMs: 5000,
        errorCode: 'SERVICE_UNAVAILABLE',
        category: 'system',
        severity: 'medium',
        userAction: 'Try again in a few moments'
      };
    }

    return {
      message: 'Payment settlement failed. Please try again.',
      isRetryable: true,
      retryDelayMs: 2000,
      errorCode: 'SETTLEMENT_FAILED',
      category: 'system',
      severity: 'medium',
      userAction: 'Try again or contact support'
    };
  }

  /**
   * Handle Stripe-specific errors with retry logic
   */
  private handleStripeError(error: any): PaymentError {
    const message = this.getStripeErrorMessage(error);
    
    // Determine if error is retryable
    const retryableTypes = ['api_error', 'rate_limit_error'];
    const retryableCodes = ['authentication_required'];
    
    const isRetryable = retryableTypes.includes(error.type) || 
                       retryableCodes.includes(error.code) ||
                       (error.type === 'card_error' && error.code === 'authentication_required');

    let category: PaymentError['category'] = 'stripe';
    let severity: PaymentError['severity'] = 'medium';
    let userAction = 'Try again or use a different payment method';

    if (error.type === 'card_error') {
      category = 'user';
      if (['card_declined', 'insufficient_funds'].includes(error.code)) {
        severity = 'low';
        userAction = 'Use a different card or payment method';
      }
    } else if (error.type === 'rate_limit_error') {
      severity = 'low';
      userAction = 'Wait a moment and try again';
    } else if (error.type === 'api_error') {
      category = 'system';
      userAction = 'Try again in a few moments';
    }

    return {
      message,
      isRetryable,
      retryDelayMs: error.type === 'rate_limit_error' ? 5000 : 2000,
      errorCode: error.code || error.type,
      category,
      severity,
      userAction
    };
  }
}