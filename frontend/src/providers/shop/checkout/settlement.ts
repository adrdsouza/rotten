import { gql } from 'graphql-request';
import { execute } from '~/utils/api';

/**
 * GraphQL mutation for settling Stripe payments with enhanced error handling
 */
const SETTLE_STRIPE_PAYMENT_MUTATION = gql`
    mutation SettleStripePayment($paymentIntentId: String!) {
        settleStripePayment(paymentIntentId: $paymentIntentId)
    }
`;

/**
 * Settle a Stripe payment after frontend confirmation
 * Includes retry logic and enhanced error handling
 */
export async function settleStripePaymentMutation(
    paymentIntentId: string,
    options: {
        maxRetries?: number;
        retryDelayMs?: number;
        onRetry?: (attempt: number, error: any) => void;
    } = {}
): Promise<boolean> {
    const { maxRetries = 3, retryDelayMs = 2000, onRetry } = options;
    
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Settlement] Attempting to settle PaymentIntent ${paymentIntentId} (attempt ${attempt}/${maxRetries})`);
            
            const result = await execute(SETTLE_STRIPE_PAYMENT_MUTATION, {
                paymentIntentId
            });
            
            if (result.settleStripePayment) {
                console.log(`[Settlement] Successfully settled PaymentIntent ${paymentIntentId}`);
                return true;
            } else {
                throw new Error('Settlement returned false');
            }
            
        } catch (error) {
            lastError = error;
            console.warn(`[Settlement] Attempt ${attempt} failed for PaymentIntent ${paymentIntentId}:`, error);
            
            // Check if error has retry information
            const errorInfo = extractErrorInfo(error);
            
            // Don't retry if error is not retryable
            if (!errorInfo.isRetryable) {
                console.log(`[Settlement] Error is not retryable, stopping attempts`);
                break;
            }
            
            // Don't retry on last attempt
            if (attempt >= maxRetries) {
                break;
            }
            
            // Call retry callback if provided
            if (onRetry) {
                onRetry(attempt, error);
            }
            
            // Use error-specific retry delay if available
            const delay = errorInfo.retryDelayMs || retryDelayMs;
            console.log(`[Settlement] Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    
    // All attempts failed
    console.error(`[Settlement] Failed to settle PaymentIntent ${paymentIntentId} after ${maxRetries} attempts:`, lastError);
    throw enhanceError(lastError, paymentIntentId);
}

/**
 * Extract error information for better handling
 */
function extractErrorInfo(error: any): {
    isRetryable: boolean;
    retryDelayMs?: number;
    errorCode?: string;
    requiresUserAction?: boolean;
    requiresPageRefresh?: boolean;
} {
    // Check if error has enhanced metadata from backend
    if (error && typeof error === 'object') {
        return {
            isRetryable: error.isRetryable ?? true,
            retryDelayMs: error.retryDelayMs,
            errorCode: error.errorCode,
            requiresUserAction: error.requiresUserAction,
            requiresPageRefresh: error.requiresPageRefresh
        };
    }
    
    // Fallback to message-based detection
    const message = error?.message?.toLowerCase() || '';
    
    // Network errors are retryable
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return { isRetryable: true, retryDelayMs: 2000 };
    }
    
    // Processing errors are retryable with longer delay
    if (message.includes('processing') || message.includes('pending')) {
        return { isRetryable: true, retryDelayMs: 3000 };
    }
    
    // Validation errors are not retryable
    if (message.includes('invalid') || message.includes('not found') || message.includes('validation')) {
        return { isRetryable: false };
    }
    
    // Default to retryable
    return { isRetryable: true };
}

/**
 * Enhance error with user-friendly messages
 */
function enhanceError(error: any, paymentIntentId: string): Error {
    const errorInfo = extractErrorInfo(error);
    const originalMessage = error?.message || 'Unknown error';
    
    // Create enhanced error with additional metadata
    const enhancedError = new Error(getUserFriendlyMessage(originalMessage));
    
    // Add metadata for frontend handling
    (enhancedError as any).originalError = error;
    (enhancedError as any).paymentIntentId = paymentIntentId;
    (enhancedError as any).errorCode = errorInfo.errorCode;
    (enhancedError as any).requiresUserAction = errorInfo.requiresUserAction;
    (enhancedError as any).requiresPageRefresh = errorInfo.requiresPageRefresh;
    
    return enhancedError;
}

/**
 * Convert technical error messages to user-friendly ones
 */
function getUserFriendlyMessage(technicalMessage: string): string {
    const message = technicalMessage.toLowerCase();
    
    if (message.includes('not succeeded') || message.includes('invalid status')) {
        return 'Payment has not been completed yet. Please complete the payment process first.';
    }
    
    if (message.includes('not found')) {
        return 'Payment not found. Please refresh the page and try again.';
    }
    
    if (message.includes('already settled') || message.includes('duplicate')) {
        return 'This payment has already been processed successfully.';
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return 'Connection issue detected. Please check your internet connection and try again.';
    }
    
    if (message.includes('processing') || message.includes('pending')) {
        return 'Payment is still being processed. Please wait a moment and try again.';
    }
    
    if (message.includes('requires action') || message.includes('requires confirmation')) {
        return 'Your payment requires additional verification. Please complete the payment process.';
    }
    
    if (message.includes('order state') || message.includes('cannot accept payment')) {
        return 'Order cannot accept payment at this time. Please refresh the page and try again.';
    }
    
    // Return original message if no specific pattern matches
    return technicalMessage;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced error class for payment settlement
 */
export class PaymentSettlementError extends Error {
    constructor(
        message: string,
        public readonly paymentIntentId: string,
        public readonly errorCode?: string,
        public readonly isRetryable: boolean = false,
        public readonly requiresUserAction: boolean = false,
        public readonly requiresPageRefresh: boolean = false,
        public readonly originalError?: any
    ) {
        super(message);
        this.name = 'PaymentSettlementError';
    }
}

/**
 * Check if an error indicates the payment was actually successful
 */
export function isSuccessfulDuplicateError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    return message.includes('already settled') || 
           message.includes('duplicate') || 
           message.includes('already processed');
}

/**
 * Check if an error requires user action
 */
export function requiresUserAction(error: any): boolean {
    return error?.requiresUserAction === true ||
           error?.message?.toLowerCase().includes('requires action') ||
           error?.message?.toLowerCase().includes('requires confirmation');
}

/**
 * Check if an error requires page refresh
 */
export function requiresPageRefresh(error: any): boolean {
    return error?.requiresPageRefresh === true ||
           error?.message?.toLowerCase().includes('refresh') ||
           error?.message?.toLowerCase().includes('not found');
}