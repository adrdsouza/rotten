import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { StripePaymentMetricsService } from './stripe-payment-metrics.service';

/**
 * Enhanced Stripe API service with comprehensive PaymentIntent verification,
 * retry logic with exponential backoff, and robust error handling
 */
@Injectable()
export class StripeApiService {
    private readonly logger = new Logger('StripeApiService');
    
    constructor(
        private readonly stripe: Stripe,
        private readonly metricsService?: StripePaymentMetricsService
    ) {}

    /**
     * Retrieve PaymentIntent with enhanced retry logic and exponential backoff
     */
    async retrievePaymentIntentWithRetry(
        paymentIntentId: string, 
        options: {
            maxRetries?: number;
            baseDelayMs?: number;
            maxDelayMs?: number;
            jitterMs?: number;
        } = {}
    ): Promise<Stripe.PaymentIntent> {
        const {
            maxRetries = 3,
            baseDelayMs = 1000,
            maxDelayMs = 10000,
            jitterMs = 100
        } = options;

        this.validatePaymentIntentId(paymentIntentId);

        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.log(`Retrieving PaymentIntent ${paymentIntentId} (attempt ${attempt}/${maxRetries})`);
                
                const startTime = Date.now();
                const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
                const duration = Date.now() - startTime;
                
                this.logger.log(`Successfully retrieved PaymentIntent ${paymentIntentId} in ${duration}ms`);
                
                // Log API call metrics
                this.metricsService?.logStripeApiCall('retrieve', paymentIntentId, startTime, true, attempt);
                
                return paymentIntent;
                
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.logger.warn(`Attempt ${attempt}/${maxRetries} failed for PaymentIntent ${paymentIntentId}: ${lastError.message}`);
                
                // Log API call failure metrics
                this.metricsService?.logStripeApiCall('retrieve', paymentIntentId, Date.now(), false, attempt);
                
                // Don't retry on client errors (4xx) - these are permanent failures
                if (this.isNonRetryableError(error)) {
                    this.logger.error(`Non-retryable error for PaymentIntent ${paymentIntentId}: ${lastError.message}`);
                    throw this.createUserFriendlyError(error, paymentIntentId);
                }
                
                // Calculate delay with exponential backoff and jitter
                if (attempt < maxRetries) {
                    const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
                    const jitter = Math.random() * jitterMs;
                    const delay = exponentialDelay + jitter;
                    
                    this.logger.log(`Retrying PaymentIntent ${paymentIntentId} in ${Math.round(delay)}ms...`);
                    await this.sleep(delay);
                }
            }
        }
        
        const errorMessage = `Failed to retrieve PaymentIntent ${paymentIntentId} after ${maxRetries} attempts: ${lastError?.message}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
    }

    /**
     * Comprehensive PaymentIntent validation for settlement
     */
    async validatePaymentIntentForSettlement(
        paymentIntent: Stripe.PaymentIntent,
        expectedOrderId?: string,
        expectedOrderCode?: string
    ): Promise<PaymentIntentValidationResult> {
        const validationStartTime = Date.now();
        this.logger.log(`Validating PaymentIntent ${paymentIntent.id} for settlement`);

        // Validate PaymentIntent status
        const statusValidation = this.validatePaymentIntentStatus(paymentIntent);
        if (!statusValidation.isValid) {
            return statusValidation;
        }

        // Validate required metadata exists
        const metadataValidation = this.validatePaymentIntentMetadata(paymentIntent);
        if (!metadataValidation.isValid) {
            return metadataValidation;
        }

        // Validate PaymentIntent belongs to the requesting order
        if (expectedOrderId || expectedOrderCode) {
            const ownershipValidation = this.validatePaymentIntentOwnership(
                paymentIntent, 
                expectedOrderId, 
                expectedOrderCode
            );
            if (!ownershipValidation.isValid) {
                return ownershipValidation;
            }
        }

        // Validate payment amount and currency
        const amountValidation = this.validatePaymentIntentAmount(paymentIntent);
        if (!amountValidation.isValid) {
            return amountValidation;
        }

        // Extract validated data
        const metadata = paymentIntent.metadata;
        const result: PaymentIntentValidationResult = {
            isValid: true,
            paymentIntent,
            orderCode: metadata.vendure_order_code!,
            orderId: metadata.vendure_order_id!,
            customerEmail: metadata.vendure_customer_email || 'guest',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status
        };

        const validationTime = Date.now() - validationStartTime;
        this.logger.log(`PaymentIntent ${paymentIntent.id} validation successful for order ${result.orderCode}`);
        
        // Log validation metrics
        const statusInfo = this.getPaymentIntentStatusInfo(paymentIntent.status);
        this.metricsService?.logPaymentIntentStatusValidation(
            paymentIntent.id, 
            paymentIntent.status, 
            statusInfo.canSettle, 
            validationTime
        );
        
        return result;
    }

    /**
     * Handle various PaymentIntent states with appropriate actions
     */
    getPaymentIntentStatusInfo(status: string): PaymentIntentStatusInfo {
        const statusMap: Record<string, PaymentIntentStatusInfo> = {
            'succeeded': {
                status,
                canSettle: true,
                isTerminal: true,
                description: 'Payment completed successfully',
                userMessage: 'Your payment has been processed successfully.'
            },
            'processing': {
                status,
                canSettle: false,
                isTerminal: false,
                description: 'Payment is being processed',
                userMessage: 'Your payment is being processed. Please wait a moment.',
                shouldRetry: true,
                retryDelayMs: 2000
            },
            'requires_payment_method': {
                status,
                canSettle: false,
                isTerminal: false,
                description: 'Payment method required',
                userMessage: 'Please provide a valid payment method.',
                requiresUserAction: true
            },
            'requires_confirmation': {
                status,
                canSettle: false,
                isTerminal: false,
                description: 'Payment requires confirmation',
                userMessage: 'Please confirm your payment.',
                requiresUserAction: true
            },
            'requires_action': {
                status,
                canSettle: false,
                isTerminal: false,
                description: 'Payment requires additional action',
                userMessage: 'Additional verification required. Please complete the payment process.',
                requiresUserAction: true
            },
            'canceled': {
                status,
                canSettle: false,
                isTerminal: true,
                description: 'Payment was canceled',
                userMessage: 'Your payment was canceled. Please try again if needed.',
                isFailure: true
            },
            'requires_capture': {
                status,
                canSettle: false,
                isTerminal: false,
                description: 'Payment authorized but not captured',
                userMessage: 'Your payment is authorized and will be captured shortly.',
                shouldRetry: false
            }
        };

        return statusMap[status] || {
            status,
            canSettle: false,
            isTerminal: false,
            description: `Unknown payment status: ${status}`,
            userMessage: 'Payment status is unclear. Please contact support.',
            isFailure: true
        };
    }

    /**
     * Validate PaymentIntent ID format
     */
    private validatePaymentIntentId(paymentIntentId: string): void {
        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
            throw new Error('PaymentIntent ID is required and must be a string');
        }
        
        if (!paymentIntentId.startsWith('pi_')) {
            throw new Error('Invalid PaymentIntent ID format - must start with "pi_"');
        }
        
        if (paymentIntentId.length < 10) {
            throw new Error('Invalid PaymentIntent ID format - too short');
        }
    }

    /**
     * Validate PaymentIntent status for settlement
     */
    private validatePaymentIntentStatus(paymentIntent: Stripe.PaymentIntent): PaymentIntentValidationResult {
        const statusInfo = this.getPaymentIntentStatusInfo(paymentIntent.status);
        
        if (!statusInfo.canSettle) {
            // Log failed validation
            this.metricsService?.logPaymentIntentStatusValidation(
                paymentIntent.id, 
                paymentIntent.status, 
                false, 
                0
            );
            
            return {
                isValid: false,
                error: `Payment cannot be settled. Status: ${paymentIntent.status}`,
                errorCode: 'INVALID_PAYMENT_STATUS',
                statusInfo,
                userMessage: statusInfo.userMessage
            };
        }

        return { isValid: true };
    }

    /**
     * Validate PaymentIntent metadata
     */
    private validatePaymentIntentMetadata(paymentIntent: Stripe.PaymentIntent): PaymentIntentValidationResult {
        const metadata = paymentIntent.metadata;
        
        if (!metadata?.vendure_order_code) {
            return {
                isValid: false,
                error: 'PaymentIntent not properly linked to an order - missing order code',
                errorCode: 'MISSING_ORDER_CODE',
                userMessage: 'Payment is not properly linked to an order. Please try again.'
            };
        }

        if (!metadata?.vendure_order_id) {
            return {
                isValid: false,
                error: 'PaymentIntent not properly linked to an order - missing order ID',
                errorCode: 'MISSING_ORDER_ID',
                userMessage: 'Payment is not properly linked to an order. Please try again.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate PaymentIntent belongs to the requesting order
     */
    private validatePaymentIntentOwnership(
        paymentIntent: Stripe.PaymentIntent,
        expectedOrderId?: string,
        expectedOrderCode?: string
    ): PaymentIntentValidationResult {
        const metadata = paymentIntent.metadata;

        if (expectedOrderId && metadata.vendure_order_id !== expectedOrderId) {
            return {
                isValid: false,
                error: `PaymentIntent ${paymentIntent.id} does not belong to order ${expectedOrderId}`,
                errorCode: 'ORDER_MISMATCH',
                userMessage: 'Payment does not match the current order. Please try again.'
            };
        }

        if (expectedOrderCode && metadata.vendure_order_code !== expectedOrderCode) {
            return {
                isValid: false,
                error: `PaymentIntent ${paymentIntent.id} does not belong to order ${expectedOrderCode}`,
                errorCode: 'ORDER_CODE_MISMATCH',
                userMessage: 'Payment does not match the current order. Please try again.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate PaymentIntent amount and currency
     */
    private validatePaymentIntentAmount(paymentIntent: Stripe.PaymentIntent): PaymentIntentValidationResult {
        if (paymentIntent.amount <= 0) {
            return {
                isValid: false,
                error: `Invalid payment amount: ${paymentIntent.amount}`,
                errorCode: 'INVALID_AMOUNT',
                userMessage: 'Invalid payment amount. Please try again.'
            };
        }

        if (!paymentIntent.currency) {
            return {
                isValid: false,
                error: 'PaymentIntent missing currency information',
                errorCode: 'MISSING_CURRENCY',
                userMessage: 'Payment currency information is missing. Please try again.'
            };
        }

        return { isValid: true };
    }

    /**
     * Check if error is non-retryable (client errors)
     */
    private isNonRetryableError(error: any): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            // Stripe API client errors (4xx)
            if (message.includes('no such payment_intent')) return true;
            if (message.includes('invalid request')) return true;
            if (message.includes('authentication required')) return true;
            if (message.includes('permission denied')) return true;
            if (message.includes('rate limit')) return false; // Rate limits should be retried
            
            // Check for HTTP status codes in error
            if (message.includes('400') || message.includes('401') || 
                message.includes('403') || message.includes('404')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Create user-friendly error messages
     */
    private createUserFriendlyError(error: any, paymentIntentId: string): Error {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            
            if (message.includes('no such payment_intent')) {
                return new Error(`Payment ${paymentIntentId} not found. It may have been deleted or the ID is incorrect.`);
            }
            
            if (message.includes('authentication')) {
                return new Error('Payment service authentication failed. Please contact support.');
            }
            
            if (message.includes('permission')) {
                return new Error('Insufficient permissions to access payment information.');
            }
        }
        
        return error instanceof Error ? error : new Error(String(error));
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Result of PaymentIntent validation
 */
export interface PaymentIntentValidationResult {
    isValid: boolean;
    error?: string;
    errorCode?: string;
    userMessage?: string;
    paymentIntent?: Stripe.PaymentIntent;
    orderCode?: string;
    orderId?: string;
    customerEmail?: string;
    amount?: number;
    currency?: string;
    status?: string;
    statusInfo?: PaymentIntentStatusInfo;
}

/**
 * Information about PaymentIntent status
 */
export interface PaymentIntentStatusInfo {
    status: string;
    canSettle: boolean;
    isTerminal: boolean;
    description: string;
    userMessage: string;
    shouldRetry?: boolean;
    retryDelayMs?: number;
    requiresUserAction?: boolean;
    isFailure?: boolean;
}