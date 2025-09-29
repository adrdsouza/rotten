import { loadStripe, Stripe, StripeElements, PaymentIntent } from '@stripe/stripe-js';
import { PaymentErrorHandler } from './payment-error-handler';
import { QRL } from '@builder.io/qwik';

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface PaymentConfirmationResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: string;
  requiresAction?: boolean;
}

export interface SettlementResult {
  success: boolean;
  orderId?: string;
  orderCode?: string;
  paymentId?: string;
  error?: string;
  isRetryable?: boolean;
  retryDelayMs?: number;
}

export interface PaymentStatusResult {
  status: 'PENDING' | 'SETTLED' | 'FAILED' | 'NOT_FOUND';
  paymentIntentId: string;
  orderCode?: string;
  amount?: number;
  createdAt?: Date;
  settledAt?: Date;
}

/**
 * Enhanced Stripe Payment Service - Updated to match backend plugin
 * Handles the 3-step payment flow: Create → Link → Settle
 */
export class StripePaymentService {
  private stripe: Stripe | null = null;
  private errorHandler: PaymentErrorHandler;
  private initialized = false;

  constructor(
    private publishableKey: string,
    private graphqlEndpoint: string,
    private getAuthHeaders: QRL<() => Record<string, string>>
  ) {
    this.errorHandler = new PaymentErrorHandler();
    this.initializeStripe();
  }

  /**
   * Initialize Stripe instance
   */
  private async initializeStripe(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.publishableKey);
      this.initialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error('Failed to initialize payment system');
    }
  }

  /**
   * Ensure Stripe is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.stripe) {
      await this.initializeStripe();
    }
    if (!this.stripe) {
      throw new Error('Stripe failed to initialize');
    }
  }

  /**
   * Step 1: Create PaymentIntent for estimated total
   * UPDATED: Now handles PaymentIntentResult object response
   */
  async createPaymentIntent(estimatedTotal: number, currency = 'usd'): Promise<PaymentIntentResult> {
    await this.ensureInitialized();

    try {
      console.log(`Creating PaymentIntent for ${estimatedTotal} ${currency}`);

      const response = await this.makeGraphQLRequest(`
        mutation CreateStripePaymentIntent($estimatedTotal: Int!, $currency: String!) {
          createStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency) {
            clientSecret
            paymentIntentId
            amount
            currency
          }
        }
      `, {
        estimatedTotal: Math.round(estimatedTotal), // Ensure integer
        currency
      });

      const result = response.data.createStripePaymentIntent;
      console.log(`PaymentIntent created: ${result.paymentIntentId}`);

      return result;
    } catch (error) {
      console.error('Failed to create PaymentIntent:', error);
      throw this.errorHandler.handlePaymentError(error, 'CREATE_PAYMENT_INTENT');
    }
  }

  /**
   * Step 2: Link PaymentIntent to order (metadata only, no settlement)
   * UPDATED: Uses correct parameter types
   */
  async linkPaymentIntentToOrder(
    paymentIntentId: string,
    orderId: string,
    orderCode: string,
    finalTotal: number,
    customerEmail?: string
  ): Promise<boolean> {
    try {
      console.log(`Linking PaymentIntent ${paymentIntentId} to order ${orderCode}`);

      const response = await this.makeGraphQLRequest(`
        mutation LinkPaymentIntentToOrder(
          $paymentIntentId: String!,
          $orderId: String!,
          $orderCode: String!,
          $finalTotal: Int!,
          $customerEmail: String
        ) {
          linkPaymentIntentToOrder(
            paymentIntentId: $paymentIntentId,
            orderId: $orderId,
            orderCode: $orderCode,
            finalTotal: $finalTotal,
            customerEmail: $customerEmail
          )
        }
      `, {
        paymentIntentId,
        orderId,
        orderCode,
        finalTotal: Math.round(finalTotal), // Ensure integer
        customerEmail: customerEmail || null
      });

      const success = response.data.linkPaymentIntentToOrder;
      
      if (success) {
        console.log('PaymentIntent linked to order successfully');
      } else {
        console.error('Failed to link PaymentIntent to order');
      }

      return success;
    } catch (error) {
      console.error('Error linking PaymentIntent to order:', error);
      throw this.errorHandler.handlePaymentError(error, 'LINK_PAYMENT_INTENT');
    }
  }

  /**
   * Step 3a: Confirm payment with Stripe (frontend)
   */
  async confirmPayment(
    clientSecret: string,
    elements: StripeElements,
    returnUrl?: string
  ): Promise<PaymentConfirmationResult> {
    await this.ensureInitialized();

    try {
      console.log('Confirming payment with Stripe...');

      const result = await this.stripe!.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/checkout/confirmation`
        },
        redirect: 'if_required'
      });

      if (result.error) {
        console.error('Payment confirmation failed:', result.error);
        return {
          success: false,
          error: this.errorHandler.getStripeErrorMessage(result.error),
          requiresAction: result.error.type === 'card_error' && result.error.code === 'authentication_required'
        };
      }

      if (result.paymentIntent?.status === 'succeeded') {
        console.log('Payment confirmed successfully');
        return {
          success: true,
          paymentIntent: result.paymentIntent
        };
      }

      if (result.paymentIntent?.status === 'requires_action') {
        console.log('Payment requires additional action');
        return {
          success: false,
          requiresAction: true,
          error: 'Payment requires additional authentication'
        };
      }

      console.error('Payment in unexpected state:', result.paymentIntent?.status);
      return {
        success: false,
        error: `Payment failed: ${result.paymentIntent?.status || 'Unknown error'}`
      };

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: this.errorHandler.handlePaymentError(error, 'CONFIRM_PAYMENT').message
      };
    }
  }

  /**
   * Step 3b: Settle payment after Stripe confirmation
   * UPDATED: Now handles SettlementResult object response
   */
  async settlePayment(paymentIntentId: string): Promise<SettlementResult> {
    try {
      console.log(`Settling payment for PaymentIntent ${paymentIntentId}`);

      const response = await this.makeGraphQLRequest(`
        mutation SettleStripePayment($paymentIntentId: String!) {
          settleStripePayment(paymentIntentId: $paymentIntentId) {
            success
            orderId
            orderCode
            paymentId
            error
          }
        }
      `, {
        paymentIntentId
      });

      const result = response.data.settleStripePayment;

      if (result.success) {
        console.log('Payment settled successfully');
        return {
          success: true,
          orderId: result.orderId,
          orderCode: result.orderCode,
          paymentId: result.paymentId
        };
      } else {
        console.error('Payment settlement failed:', result.error);
        return {
          success: false,
          error: result.error || 'Payment settlement failed'
        };
      }

    } catch (error) {
      console.error('Payment settlement error:', error);
      
      const handledError = this.errorHandler.handlePaymentError(error, 'SETTLE_PAYMENT');
      
      return {
        success: false,
        error: handledError.message,
        isRetryable: handledError.isRetryable,
        retryDelayMs: handledError.retryDelayMs
      };
    }
  }

  /**
   * Complete payment flow: Confirm with Stripe → Settle with backend
   */
  async completePayment(
    clientSecret: string,
    elements: StripeElements,
    returnUrl?: string
  ): Promise<{ success: boolean; error?: string; requiresAction?: boolean; settlement?: SettlementResult }> {
    // Step 1: Confirm with Stripe
    const confirmResult = await this.confirmPayment(clientSecret, elements, returnUrl);
    
    if (!confirmResult.success) {
      return confirmResult;
    }

    if (!confirmResult.paymentIntent) {
      return {
        success: false,
        error: 'Payment confirmation succeeded but PaymentIntent not returned'
      };
    }

    // Step 2: Settle with backend
    const settlementResult = await this.settlePayment(confirmResult.paymentIntent.id);
    
    return {
      success: settlementResult.success,
      error: settlementResult.error,
      settlement: settlementResult
    };
  }

  /**
   * Get payment status for debugging
   * UPDATED: Now uses the correct query and returns typed result
   */
  async getPaymentStatus(paymentIntentId: string): Promise<PaymentStatusResult> {
    try {
      const response = await this.makeGraphQLRequest(`
        query GetPaymentStatus($paymentIntentId: String!) {
          getPaymentStatus(paymentIntentId: $paymentIntentId) {
            status
            paymentIntentId
            orderCode
            amount
            createdAt
            settledAt
          }
        }
      `, {
        paymentIntentId
      });

      return response.data.getPaymentStatus;
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw this.errorHandler.handlePaymentError(error, 'GET_STATUS');
    }
  }

  /**
   * Calculate estimated total from cart items
   */
  async calculateEstimatedTotal(cartItems: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
  }>): Promise<number> {
    try {
      const response = await this.makeGraphQLRequest(`
        query CalculateEstimatedTotal($cartItems: [PreOrderCartItemInput!]!) {
          calculateEstimatedTotal(cartItems: $cartItems)
        }
      `, {
        cartItems
      });

      return response.data.calculateEstimatedTotal;
    } catch (error) {
      console.error('Failed to calculate estimated total:', error);
      throw this.errorHandler.handlePaymentError(error, 'CALCULATE_TOTAL');
    }
  }

  /**
   * Retry settlement with exponential backoff and enhanced error handling
   */
  async retrySettlement(
    paymentIntentId: string,
    maxRetries = 3,
    baseDelayMs = 1000
  ): Promise<SettlementResult & { attempts: number; errorDetails?: PaymentError }> {
    let lastError: SettlementResult = { success: false, error: 'Settlement failed after retries' };
    let errorDetails: PaymentError | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Settlement attempt ${attempt}/${maxRetries} for ${paymentIntentId}`);
        
        const result = await this.settlePayment(paymentIntentId);
        
        if (result.success) {
          console.log(`Settlement succeeded on attempt ${attempt}`);
          return { ...result, attempts: attempt };
        }

        // Handle error with enhanced error handler
        const error = new Error(result.error || 'Settlement failed');
        errorDetails = this.errorHandler.handlePaymentError(error, 'SETTLE_PAYMENT');

        if (!result.isRetryable || !errorDetails.isRetryable) {
          console.log(`Settlement failed with non-retryable error: ${result.error}`);
          return { ...result, attempts: attempt, errorDetails };
        }

        lastError = result;

        // Use error-specific retry delay if available
        if (attempt < maxRetries) {
          const delay = Math.min(
            errorDetails.retryDelayMs || baseDelayMs * Math.pow(2, attempt - 1), 
            10000
          );
          console.log(`Waiting ${delay}ms before retry (${errorDetails.category} error)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error: any) {
        errorDetails = this.errorHandler.handlePaymentError(error, 'SETTLE_PAYMENT');
        lastError = { 
          success: false, 
          error: errorDetails.message,
          isRetryable: errorDetails.isRetryable,
          retryDelayMs: errorDetails.retryDelayMs
        };
        
        if (attempt < maxRetries && errorDetails.isRetryable) {
          const delay = Math.min(
            errorDetails.retryDelayMs || baseDelayMs * Math.pow(2, attempt - 1), 
            10000
          );
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`Settlement failed after ${maxRetries} attempts`);
    return { 
      ...lastError, 
      attempts: maxRetries,
      errorDetails: errorDetails || this.errorHandler.handlePaymentError(
        new Error(lastError.error || 'Unknown error'), 
        'SETTLE_PAYMENT'
      )
    };
  }

  /**
   * Get user-friendly error message for display
   */
  getErrorMessage(error: any, context: string = 'PAYMENT'): string {
    return this.errorHandler.getUserMessage ? 
      this.errorHandler.getUserMessage(error, context) : 
      this.errorHandler.handlePaymentError(error, context).message;
  }

  /**
   * Check if an error is retryable
   */
  isErrorRetryable(error: any, context: string = 'PAYMENT'): boolean {
    return this.errorHandler.isRetryable ? 
      this.errorHandler.isRetryable(error, context) : 
      this.errorHandler.handlePaymentError(error, context).isRetryable;
  }

  /**
   * Extract PaymentIntent ID from client secret
   */
  private extractPaymentIntentId(clientSecret: string): string {
    return clientSecret.split('_secret_')[0];
  }

  /**
   * Make GraphQL request with error handling
   */
  private async makeGraphQLRequest(query: string, variables: any = {}): Promise<any> {
    const response = await fetch(this.graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders())
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
  
    if (!response.ok) {
      const errorBody = await response.text(); // Read the response body for debugging
      console.error(`GraphQL Request Failed: HTTP ${response.status} - Body: ${errorBody}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
    }
  
    const result = await response.json();
  
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(`GraphQL Error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }
  
    return result;
  }

  /**
   * Get Stripe instance (for advanced usage)
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.stripe !== null;
  }
}