import { Injectable, Logger } from '@nestjs/common';

export interface StripeErrorInfo {
  userMessage: string;
  adminMessage: string;
  isRetryable: boolean;
  retryDelayMs?: number;
  errorCode: string;
  category: 'network' | 'stripe' | 'validation' | 'system' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Enhanced error handler for Stripe payment operations
 * Provides user-friendly error messages and retry logic
 */
@Injectable()
export class StripeErrorHandlerService {
  private readonly logger = new Logger(StripeErrorHandlerService.name);

  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  };

  /**
   * Categorize and handle Stripe API errors
   */
  handleStripeApiError(error: any, context: string): StripeErrorInfo {
    this.logger.error(`[${context}] Stripe API error: ${error.message}`, error.stack);

    if (!error.type) {
      return this.handleGenericError(error, context);
    }

    switch (error.type) {
      case 'StripeConnectionError':
        return {
          userMessage: 'Unable to connect to payment service. Please check your internet connection and try again.',
          adminMessage: `Stripe connection error: ${error.message}`,
          isRetryable: true,
          retryDelayMs: 2000,
          errorCode: 'STRIPE_CONNECTION_ERROR',
          category: 'network',
          severity: 'medium'
        };

      case 'StripeAPIError':
        return {
          userMessage: 'Payment service is temporarily unavailable. Please try again in a few moments.',
          adminMessage: `Stripe API error: ${error.message}`,
          isRetryable: true,
          retryDelayMs: 3000,
          errorCode: 'STRIPE_API_ERROR',
          category: 'stripe',
          severity: 'medium'
        };

      case 'StripeInvalidRequestError':
        return this.handleInvalidRequestError(error);

      case 'StripeAuthenticationError':
        return {
          userMessage: 'Payment configuration error. Please contact support.',
          adminMessage: `Stripe authentication error: ${error.message}`,
          isRetryable: false,
          errorCode: 'STRIPE_AUTH_ERROR',
          category: 'system',
          severity: 'critical'
        };

      case 'StripePermissionError':
        return {
          userMessage: 'Payment processing is temporarily unavailable. Please contact support.',
          adminMessage: `Stripe permission error: ${error.message}`,
          isRetryable: false,
          errorCode: 'STRIPE_PERMISSION_ERROR',
          category: 'system',
          severity: 'high'
        };

      case 'StripeRateLimitError':
        return {
          userMessage: 'Too many payment requests. Please wait a moment and try again.',
          adminMessage: `Stripe rate limit exceeded: ${error.message}`,
          isRetryable: true,
          retryDelayMs: 5000,
          errorCode: 'STRIPE_RATE_LIMIT',
          category: 'stripe',
          severity: 'medium'
        };

      default:
        return this.handleGenericError(error, context);
    }
  }

  /**
   * Handle Stripe invalid request errors with specific messages
   */
  private handleInvalidRequestError(error: any): StripeErrorInfo {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('payment_intent') && message.includes('not found')) {
      return {
        userMessage: 'Payment session has expired. Please start the payment process again.',
        adminMessage: `PaymentIntent not found: ${error.message}`,
        isRetryable: false,
        errorCode: 'PAYMENT_INTENT_NOT_FOUND',
        category: 'validation',
        severity: 'low'
      };
    }

    if (message.includes('already succeeded')) {
      return {
        userMessage: 'This payment has already been completed successfully.',
        adminMessage: `PaymentIntent already succeeded: ${error.message}`,
        isRetryable: false,
        errorCode: 'PAYMENT_ALREADY_SUCCEEDED',
        category: 'validation',
        severity: 'low'
      };
    }

    if (message.includes('canceled')) {
      return {
        userMessage: 'This payment was canceled. Please start a new payment.',
        adminMessage: `PaymentIntent canceled: ${error.message}`,
        isRetryable: false,
        errorCode: 'PAYMENT_CANCELED',
        category: 'user',
        severity: 'low'
      };
    }

    if (message.includes('amount')) {
      return {
        userMessage: 'Payment amount is invalid. Please contact support.',
        adminMessage: `Invalid amount: ${error.message}`,
        isRetryable: false,
        errorCode: 'INVALID_AMOUNT',
        category: 'validation',
        severity: 'medium'
      };
    }

    return {
      userMessage: 'Payment information is invalid. Please check your details and try again.',
      adminMessage: `Stripe invalid request: ${error.message}`,
      isRetryable: false,
      errorCode: 'STRIPE_INVALID_REQUEST',
      category: 'validation',
      severity: 'medium'
    };
  }

  /**
   * Handle settlement-specific errors
   */
  handleSettlementError(error: any, context: string): StripeErrorInfo {
    this.logger.error(`[${context}] Settlement error: ${error.message}`, error.stack);

    const message = error.message?.toLowerCase() || '';

    if (message.includes('order not found')) {
      return {
        userMessage: 'Order not found. Please contact support with your order details.',
        adminMessage: `Order not found during settlement: ${error.message}`,
        isRetryable: false,
        errorCode: 'ORDER_NOT_FOUND',
        category: 'validation',
        severity: 'medium'
      };
    }

    if (message.includes('already settled')) {
      return {
        userMessage: 'This payment has already been processed successfully.',
        adminMessage: `Payment already settled: ${error.message}`,
        isRetryable: false,
        errorCode: 'PAYMENT_ALREADY_SETTLED',
        category: 'validation',
        severity: 'low'
      };
    }

    if (message.includes('payment failed')) {
      return {
        userMessage: 'Payment processing failed. Please try again or use a different payment method.',
        adminMessage: `Payment settlement failed: ${error.message}`,
        isRetryable: true,
        retryDelayMs: 2000,
        errorCode: 'SETTLEMENT_FAILED',
        category: 'stripe',
        severity: 'medium'
      };
    }

    if (message.includes('database') || message.includes('transaction')) {
      return {
        userMessage: 'A temporary system error occurred. Please try again.',
        adminMessage: `Database error during settlement: ${error.message}`,
        isRetryable: true,
        retryDelayMs: 1000,
        errorCode: 'DATABASE_ERROR',
        category: 'system',
        severity: 'medium'
      };
    }

    return this.handleGenericError(error, context);
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: any, context: string): StripeErrorInfo {
    const message = error.message || 'Unknown error';
    
    return {
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      adminMessage: `${context}: ${message}`,
      isRetryable: true,
      retryDelayMs: 1000,
      errorCode: 'GENERIC_ERROR',
      category: 'system',
      severity: 'medium'
    };
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context: string
  ): Promise<{ success: boolean; result?: T; error?: StripeErrorInfo; attempts: number }> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: StripeErrorInfo | undefined;
    
    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        this.logger.debug(`[${context}] Attempt ${attempt}/${retryConfig.maxRetries}`);
        
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.log(`[${context}] Succeeded on attempt ${attempt}`);
        }
        
        return { success: true, result, attempts: attempt };
        
      } catch (error) {
        const errorInfo = this.categorizeError(error, context);
        lastError = errorInfo;
        
        this.logger.warn(`[${context}] Attempt ${attempt} failed: ${errorInfo.adminMessage}`);
        
        if (!errorInfo.isRetryable || attempt === retryConfig.maxRetries) {
          this.logger.error(`[${context}] Operation failed after ${attempt} attempts`);
          break;
        }
        
        const delay = Math.min(
          retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelayMs
        );
        
        this.logger.debug(`[${context}] Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }
    
    return { 
      success: false, 
      error: lastError || this.handleGenericError(new Error('Unknown error'), context),
      attempts: retryConfig.maxRetries
    };
  }

  /**
   * Categorize error based on type and context
   */
  categorizeError(error: any, context: string): StripeErrorInfo {
    if (error.type && error.type.startsWith('Stripe')) {
      return this.handleStripeApiError(error, context);
    }
    
    if (context.includes('settlement') || context.includes('settle')) {
      return this.handleSettlementError(error, context);
    }
    
    return this.handleGenericError(error, context);
  }

  /**
   * Get user-friendly error message for frontend
   */
  getUserMessage(error: any, context: string): string {
    const errorInfo = this.categorizeError(error, context);
    return errorInfo.userMessage;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: any, context: string): boolean {
    const errorInfo = this.categorizeError(error, context);
    return errorInfo.isRetryable;
  }

  /**
   * Get retry delay for error
   */
  getRetryDelay(error: any, context: string): number {
    const errorInfo = this.categorizeError(error, context);
    return errorInfo.retryDelayMs || this.defaultRetryConfig.baseDelayMs;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}