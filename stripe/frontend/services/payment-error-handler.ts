import { StripeError } from '@stripe/stripe-js';

export interface PaymentError {
  message: string;
  code?: string;
  type?: string;
  isRetryable: boolean;
  retryDelayMs?: number;
  requiresUserAction?: boolean;
  requiresPageRefresh?: boolean;
}

/**
 * Comprehensive payment error handler
 * Provides user-friendly error messages and retry logic
 */
export class PaymentErrorHandler {
  
  /**
   * Handle various payment errors and return user-friendly messages
   */
  handlePaymentError(error: any, context: string): PaymentError {
    console.error(`Payment error in ${context}:`, error);

    // Handle Stripe-specific errors
    if (this.isStripeError(error)) {
      return this.handleStripeError(error);
    }

    // Handle GraphQL errors
    if (error.message?.includes('GraphQL Error')) {
      return this.handleGraphQLError(error, context);
    }

    // Handle network errors
    if (error.message?.includes('HTTP') || error.name === 'NetworkError') {
      return this.handleNetworkError(error);
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return this.handleTimeoutError(error);
    }

    // Handle generic errors
    return this.handleGenericError(error, context);
  }

  /**
   * Handle Stripe-specific errors
   */
  private handleStripeError(error: StripeError): PaymentError {
    const { type, code, message } = error;

    switch (type) {
      case 'card_error':
        return this.handleCardError(error);
      
      case 'validation_error':
        return {
          message: 'Please check your payment information and try again.',
          code,
          type,
          isRetryable: true,
          requiresUserAction: true
        };

      case 'api_error':
        return {
          message: 'Payment system temporarily unavailable. Please try again in a moment.',
          code,
          type,
          isRetryable: true,
          retryDelayMs: 3000
        };

      case 'rate_limit_error':
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code,
          type,
          isRetryable: true,
          retryDelayMs: 5000
        };

      case 'authentication_error':
        return {
          message: 'Payment authentication failed. Please refresh the page and try again.',
          code,
          type,
          isRetryable: false,
          requiresPageRefresh: true
        };

      default:
        return {
          message: message || 'Payment failed. Please try again.',
          code,
          type,
          isRetryable: true,
          retryDelayMs: 2000
        };
    }
  }

  /**
   * Handle card-specific errors
   */
  private handleCardError(error: StripeError): PaymentError {
    const { code, message } = error;

    const cardErrorMessages: Record<string, string> = {
      'card_declined': 'Your card was declined. Please try a different payment method.',
      'expired_card': 'Your card has expired. Please use a different card.',
      'incorrect_cvc': 'Your card\'s security code is incorrect. Please check and try again.',
      'incorrect_number': 'Your card number is incorrect. Please check and try again.',
      'invalid_cvc': 'Your card\'s security code is invalid. Please check and try again.',
      'invalid_expiry_month': 'Your card\'s expiration month is invalid.',
      'invalid_expiry_year': 'Your card\'s expiration year is invalid.',
      'invalid_number': 'Your card number is invalid. Please check and try again.',
      'processing_error': 'An error occurred processing your card. Please try again.',
      'authentication_required': 'Your payment requires additional authentication.',
      'insufficient_funds': 'Your card has insufficient funds.',
      'withdrawal_count_limit_exceeded': 'You have exceeded the balance or credit limit on your card.',
      'charge_exceeds_source_limit': 'The payment exceeds the maximum amount for your card.',
      'instant_payouts_unsupported': 'Your card does not support instant payouts.',
      'currency_not_supported': 'Your card does not support this currency.',
      'duplicate_transaction': 'A payment with identical details was recently submitted.',
      'fraudulent': 'Your payment was declined as potentially fraudulent.',
      'generic_decline': 'Your card was declined.',
      'invalid_account': 'The account number provided is invalid.',
      'lost_card': 'Your card was declined.',
      'merchant_blacklist': 'Your payment was declined.',
      'new_account_information_available': 'Your card was declined.',
      'no_action_taken': 'Your card was declined.',
      'not_permitted': 'Your payment was declined.',
      'pickup_card': 'Your card was declined.',
      'restricted_card': 'Your card was declined.',
      'revocation_of_all_authorizations': 'Your card was declined.',
      'revocation_of_authorization': 'Your card was declined.',
      'security_violation': 'Your card was declined.',
      'service_not_allowed': 'Your card was declined.',
      'stolen_card': 'Your card was declined.',
      'stop_payment_order': 'Your card was declined.',
      'testmode_decline': 'Your test card was declined.',
      'transaction_not_allowed': 'Your card was declined.',
      'try_again_later': 'Your card was declined. Please try again later.',
      'withdrawal_count_limit_exceeded': 'Your card was declined.'
    };

    const userMessage = cardErrorMessages[code || ''] || message || 'Your card was declined. Please try a different payment method.';

    return {
      message: userMessage,
      code,
      type: 'card_error',
      isRetryable: ['processing_error', 'try_again_later'].includes(code || ''),
      requiresUserAction: !['processing_error', 'try_again_later'].includes(code || ''),
      retryDelayMs: ['processing_error', 'try_again_later'].includes(code || '') ? 3000 : undefined
    };
  }

  /**
   * Handle GraphQL errors from backend
   */
  private handleGraphQLError(error: any, context: string): PaymentError {
    const message = error.message || '';

    // Payment already settled (idempotency)
    if (message.includes('already') && message.includes('payment')) {
      return {
        message: 'Payment has already been processed successfully.',
        isRetryable: false,
        type: 'duplicate_payment'
      };
    }

    // Order state errors
    if (message.includes('state') && message.includes('cannot')) {
      return {
        message: 'Order is not in the correct state for payment. Please refresh the page.',
        isRetryable: false,
        requiresPageRefresh: true,
        type: 'invalid_order_state'
      };
    }

    // Payment failed errors
    if (message.includes('payment') && (message.includes('failed') || message.includes('not.*succeeded'))) {
      return {
        message: 'Payment was not successful. Please try again with a different payment method.',
        isRetryable: true,
        requiresUserAction: true,
        type: 'payment_failed'
      };
    }

    // API errors
    if (message.includes('api') || message.includes('stripe')) {
      return {
        message: 'Payment system temporarily unavailable. Please try again in a moment.',
        isRetryable: true,
        retryDelayMs: 3000,
        type: 'api_error'
      };
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('required')) {
      return {
        message: 'Please check your information and try again.',
        isRetryable: true,
        requiresUserAction: true,
        type: 'validation_error'
      };
    }

    // Generic GraphQL error
    return {
      message: 'An error occurred processing your payment. Please try again.',
      isRetryable: true,
      retryDelayMs: 2000,
      type: 'graphql_error'
    };
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: any): PaymentError {
    const message = error.message || '';

    if (message.includes('500')) {
      return {
        message: 'Server error. Please try again in a moment.',
        isRetryable: true,
        retryDelayMs: 5000,
        type: 'server_error'
      };
    }

    if (message.includes('404')) {
      return {
        message: 'Payment service not found. Please refresh the page.',
        isRetryable: false,
        requiresPageRefresh: true,
        type: 'not_found'
      };
    }

    if (message.includes('403') || message.includes('401')) {
      return {
        message: 'Authentication error. Please refresh the page and try again.',
        isRetryable: false,
        requiresPageRefresh: true,
        type: 'auth_error'
      };
    }

    return {
      message: 'Network error. Please check your connection and try again.',
      isRetryable: true,
      retryDelayMs: 3000,
      type: 'network_error'
    };
  }

  /**
   * Handle timeout errors
   */
  private handleTimeoutError(error: any): PaymentError {
    return {
      message: 'Request timed out. Please try again.',
      isRetryable: true,
      retryDelayMs: 2000,
      type: 'timeout_error'
    };
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: any, context: string): PaymentError {
    const message = error.message || error.toString() || 'Unknown error';

    return {
      message: 'An unexpected error occurred. Please try again.',
      isRetryable: true,
      retryDelayMs: 2000,
      type: 'generic_error',
      code: `${context}_ERROR`
    };
  }

  /**
   * Get user-friendly message for Stripe errors
   */
  getStripeErrorMessage(error: StripeError): string {
    return this.handleStripeError(error).message;
  }

  /**
   * Check if error is a Stripe error
   */
  private isStripeError(error: any): error is StripeError {
    return error && typeof error === 'object' && 'type' in error && 'code' in error;
  }

  /**
   * Get retry configuration for error
   */
  getRetryConfig(error: PaymentError): { shouldRetry: boolean; delayMs: number } {
    return {
      shouldRetry: error.isRetryable,
      delayMs: error.retryDelayMs || 2000
    };
  }

  /**
   * Format error for logging
   */
  formatErrorForLogging(error: any, context: string): string {
    return JSON.stringify({
      context,
      message: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, null, 2);
  }
}