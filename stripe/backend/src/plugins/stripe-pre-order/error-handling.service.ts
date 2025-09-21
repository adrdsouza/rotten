import { Injectable, Logger } from '@nestjs/common';
import { StripePaymentMetricsService } from './stripe-payment-metrics.service';

/**
 * Enhanced error handling service for Stripe payment operations
 * Provides user-friendly error messages, retry mechanisms, and proper error categorization
 */
@Injectable()
export class StripeErrorHandlingService {
    private readonly logger = new Logger('StripeErrorHandlingService');

    constructor(
        private readonly metricsService?: StripePaymentMetricsService
    ) {}

    /**
     * Create user-friendly error response with appropriate error codes and retry information
     */
    createErrorResponse(
        error: any,
        paymentIntentId?: string,
        context?: string
    ): StripeErrorResponse {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        const errorMessage = errorInstance.message.toLowerCase();

        // Log the error for debugging
        this.logger.error(`[${context || 'UNKNOWN'}] Error: ${errorInstance.message}`, errorInstance.stack);

        // Categorize error and provide appropriate user message
        if (this.isPaymentStatusError(errorMessage)) {
            return this.createPaymentStatusError(errorInstance, paymentIntentId);
        }

        if (this.isNetworkError(errorMessage)) {
            return this.createNetworkError(errorInstance, paymentIntentId);
        }

        if (this.isValidationError(errorMessage)) {
            return this.createValidationError(errorInstance, paymentIntentId);
        }

        if (this.isOrderStateError(errorMessage)) {
            return this.createOrderStateError(errorInstance, paymentIntentId);
        }

        if (this.isStripeApiError(errorMessage)) {
            return this.createStripeApiError(errorInstance, paymentIntentId);
        }

        if (this.isDuplicatePaymentError(errorMessage)) {
            return this.createDuplicatePaymentError(errorInstance, paymentIntentId);
        }

        // Default error response
        return this.createGenericError(errorInstance, paymentIntentId);
    }

    /**
     * Determine if an error is retryable and provide retry configuration
     */
    getRetryConfiguration(error: any): RetryConfiguration {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        // Network and temporary errors - retry with exponential backoff
        if (this.isNetworkError(errorMessage) || this.isTemporaryError(errorMessage)) {
            return {
                shouldRetry: true,
                maxRetries: 3,
                baseDelayMs: 1000,
                maxDelayMs: 8000,
                backoffMultiplier: 2,
                jitterMs: 200
            };
        }

        // Stripe API rate limits - retry with longer delays
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            return {
                shouldRetry: true,
                maxRetries: 5,
                baseDelayMs: 2000,
                maxDelayMs: 30000,
                backoffMultiplier: 2,
                jitterMs: 500
            };
        }

        // Payment processing errors - limited retries
        if (errorMessage.includes('processing') || errorMessage.includes('pending')) {
            return {
                shouldRetry: true,
                maxRetries: 2,
                baseDelayMs: 3000,
                maxDelayMs: 10000,
                backoffMultiplier: 1.5,
                jitterMs: 1000
            };
        }

        // Client errors - don't retry
        return {
            shouldRetry: false,
            maxRetries: 0,
            baseDelayMs: 0,
            maxDelayMs: 0,
            backoffMultiplier: 1,
            jitterMs: 0
        };
    }

    /**
     * Execute operation with retry logic
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        retryConfig: RetryConfiguration,
        context: string,
        paymentIntentId?: string
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= (retryConfig.maxRetries + 1); attempt++) {
            try {
                this.logger.log(`[${context}] Executing operation (attempt ${attempt}/${retryConfig.maxRetries + 1})`);
                
                const result = await operation();
                
                if (attempt > 1) {
                    this.logger.log(`[${context}] Operation succeeded on retry attempt ${attempt}`);
                    this.metricsService?.logRetrySuccess(context, paymentIntentId, attempt);
                }
                
                return result;
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                this.logger.warn(`[${context}] Attempt ${attempt} failed: ${lastError.message}`);
                this.metricsService?.logRetryAttempt(context, paymentIntentId, attempt, lastError);
                
                // Don't retry if this is the last attempt or if error is not retryable
                if (attempt >= (retryConfig.maxRetries + 1) || !retryConfig.shouldRetry) {
                    break;
                }
                
                // Calculate delay with exponential backoff and jitter
                const exponentialDelay = Math.min(
                    retryConfig.baseDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
                    retryConfig.maxDelayMs
                );
                const jitter = Math.random() * retryConfig.jitterMs;
                const delay = exponentialDelay + jitter;
                
                this.logger.log(`[${context}] Retrying in ${Math.round(delay)}ms...`);
                await this.sleep(delay);
            }
        }
        
        // All retries failed
        const errorMessage = `[${context}] Operation failed after ${retryConfig.maxRetries + 1} attempts: ${lastError?.message}`;
        this.logger.error(errorMessage);
        this.metricsService?.logRetryFailure(context, paymentIntentId, retryConfig.maxRetries + 1, lastError!);
        
        throw new Error(errorMessage);
    }

    // Private helper methods for error categorization

    private isPaymentStatusError(errorMessage: string): boolean {
        return errorMessage.includes('not succeeded') ||
               errorMessage.includes('payment status') ||
               errorMessage.includes('invalid status') ||
               errorMessage.includes('cannot be settled') ||
               errorMessage.includes('requires_action') ||
               errorMessage.includes('requires_confirmation');
    }

    private isNetworkError(errorMessage: string): boolean {
        return errorMessage.includes('network') ||
               errorMessage.includes('timeout') ||
               errorMessage.includes('connection') ||
               errorMessage.includes('econnreset') ||
               errorMessage.includes('enotfound') ||
               errorMessage.includes('socket hang up');
    }

    private isValidationError(errorMessage: string): boolean {
        return errorMessage.includes('validation') ||
               errorMessage.includes('invalid request') ||
               errorMessage.includes('missing') ||
               errorMessage.includes('required') ||
               errorMessage.includes('malformed');
    }

    private isOrderStateError(errorMessage: string): boolean {
        return errorMessage.includes('order state') ||
               errorMessage.includes('cannot accept payment') ||
               errorMessage.includes('not in arranging payment') ||
               errorMessage.includes('order not found');
    }

    private isStripeApiError(errorMessage: string): boolean {
        return errorMessage.includes('no such payment_intent') ||
               errorMessage.includes('stripe api') ||
               errorMessage.includes('authentication') ||
               errorMessage.includes('permission denied');
    }

    private isDuplicatePaymentError(errorMessage: string): boolean {
        return errorMessage.includes('already settled') ||
               errorMessage.includes('duplicate') ||
               errorMessage.includes('payment already exists');
    }

    private isTemporaryError(errorMessage: string): boolean {
        return errorMessage.includes('temporary') ||
               errorMessage.includes('service unavailable') ||
               errorMessage.includes('internal server error') ||
               errorMessage.includes('502') ||
               errorMessage.includes('503') ||
               errorMessage.includes('504');
    }

    // Private methods for creating specific error responses

    private createPaymentStatusError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        const message = error.message.toLowerCase();
        
        if (message.includes('requires_action') || message.includes('requires_confirmation')) {
            return {
                errorCode: 'PAYMENT_REQUIRES_ACTION',
                userMessage: 'Your payment requires additional verification. Please complete the payment process.',
                technicalMessage: error.message,
                isRetryable: false,
                requiresUserAction: true,
                paymentIntentId
            };
        }

        if (message.includes('processing')) {
            return {
                errorCode: 'PAYMENT_PROCESSING',
                userMessage: 'Your payment is still being processed. Please wait a moment and try again.',
                technicalMessage: error.message,
                isRetryable: true,
                retryDelayMs: 3000,
                paymentIntentId
            };
        }

        return {
            errorCode: 'INVALID_PAYMENT_STATUS',
            userMessage: 'Payment cannot be completed at this time. Please try again or use a different payment method.',
            technicalMessage: error.message,
            isRetryable: false,
            paymentIntentId
        };
    }

    private createNetworkError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        return {
            errorCode: 'NETWORK_ERROR',
            userMessage: 'Connection issue detected. Please check your internet connection and try again.',
            technicalMessage: error.message,
            isRetryable: true,
            retryDelayMs: 2000,
            paymentIntentId
        };
    }

    private createValidationError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        return {
            errorCode: 'VALIDATION_ERROR',
            userMessage: 'Payment information is invalid. Please check your details and try again.',
            technicalMessage: error.message,
            isRetryable: false,
            paymentIntentId
        };
    }

    private createOrderStateError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        return {
            errorCode: 'ORDER_STATE_ERROR',
            userMessage: 'Order cannot accept payment at this time. Please refresh the page and try again.',
            technicalMessage: error.message,
            isRetryable: false,
            requiresPageRefresh: true,
            paymentIntentId
        };
    }

    private createStripeApiError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        const message = error.message.toLowerCase();
        
        if (message.includes('no such payment_intent')) {
            return {
                errorCode: 'PAYMENT_NOT_FOUND',
                userMessage: 'Payment not found. Please refresh the page and try again.',
                technicalMessage: error.message,
                isRetryable: false,
                requiresPageRefresh: true,
                paymentIntentId
            };
        }

        return {
            errorCode: 'STRIPE_API_ERROR',
            userMessage: 'Payment service temporarily unavailable. Please try again in a moment.',
            technicalMessage: error.message,
            isRetryable: true,
            retryDelayMs: 5000,
            paymentIntentId
        };
    }

    private createDuplicatePaymentError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        return {
            errorCode: 'DUPLICATE_PAYMENT',
            userMessage: 'This payment has already been processed successfully.',
            technicalMessage: error.message,
            isRetryable: false,
            isSuccess: true, // Duplicate payments are actually successful
            paymentIntentId
        };
    }

    private createGenericError(error: Error, paymentIntentId?: string): StripeErrorResponse {
        return {
            errorCode: 'UNKNOWN_ERROR',
            userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
            technicalMessage: error.message,
            isRetryable: true,
            retryDelayMs: 2000,
            paymentIntentId
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Structured error response for Stripe operations
 */
export interface StripeErrorResponse {
    errorCode: string;
    userMessage: string;
    technicalMessage: string;
    isRetryable: boolean;
    retryDelayMs?: number;
    requiresUserAction?: boolean;
    requiresPageRefresh?: boolean;
    isSuccess?: boolean;
    paymentIntentId?: string;
    supportActions?: string[];
}

/**
 * Configuration for retry operations
 */
export interface RetryConfiguration {
    shouldRetry: boolean;
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterMs: number;
}