export interface PaymentError {
  message: string;
  isRetryable: boolean;
  retryDelayMs?: number;
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
        isRetryable: false
      };
    }

    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return {
        message: 'Network connection failed. Please check your internet connection and try again.',
        isRetryable: true,
        retryDelayMs: 2000
      };
    }

    // Stripe-specific errors
    if (error.type) {
      return this.handleStripeError(error);
    }

    // GraphQL errors
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('fetch')) {
        return {
          message: 'Connection failed. Please try again.',
          isRetryable: true,
          retryDelayMs: 1000
        };
      }

      if (error.message.includes('timeout')) {
        return {
          message: 'Request timed out. Please try again.',
          isRetryable: true,
          retryDelayMs: 2000
        };
      }
    }

    // Generic error
    return {
      message: error.message || 'Payment processing failed. Please try again.',
      isRetryable: true,
      retryDelayMs: 1000
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

    return {
      message,
      isRetryable,
      retryDelayMs: error.type === 'rate_limit_error' ? 5000 : 2000
    };
  }
}