import { loadStripe, Stripe, StripeElements, PaymentIntent } from '@stripe/stripe-js';
import { PaymentErrorHandler, PaymentError } from './payment-error-handler';
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
   * UPDATED: Now passes amount, currency, and cartUuid to work with local cart
   */
  async createPaymentIntent(estimatedTotal: number, currency = 'usd', cartUuid?: string): Promise<PaymentIntentResult> {
    await this.ensureInitialized();

    try {
      const amountInCents = Math.round(estimatedTotal);
      console.log(`Creating PaymentIntent for ${amountInCents} ${currency}, cartUuid: ${cartUuid}`);

      const response = await this.makeGraphQLRequest(`
        mutation CreatePreOrderPaymentIntent($amount: Int, $currency: String, $cartUuid: String) {
          createPreOrderPaymentIntent(amount: $amount, currency: $currency, cartUuid: $cartUuid)
        }
      `, {
        amount: amountInCents,
        currency,
        cartUuid
      });

      const clientSecret = response.data.createPreOrderPaymentIntent;
      const paymentIntentId = this.extractPaymentIntentId(clientSecret);

      console.log(`PaymentIntent created: ${paymentIntentId}`);

      // Return the expected PaymentIntentResult format
      return {
        clientSecret,
        paymentIntentId,
        amount: amountInCents,
        currency
      };
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
   * UPDATED: Now includes cart UUID for cart mapping system
   */
  async settlePayment(paymentIntentId: string, cartUuid?: string): Promise<SettlementResult> {
    try {
      console.log(`Settling payment for PaymentIntent ${paymentIntentId}${cartUuid ? ` with cart UUID ${cartUuid}` : ''}`);

      const response = await this.makeGraphQLRequest(`
        mutation SettleStripePayment($paymentIntentId: String!, $cartUuid: String) {
          settleStripePayment(paymentIntentId: $paymentIntentId, cartUuid: $cartUuid) {
            success
            orderId
            orderCode
            paymentId
            error
          }
        }
      `, {
        paymentIntentId,
        cartUuid
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
   * Create cart mapping to link cart UUID with order
   */
  /**
   * Create cart mapping for pre-order flow (without order initially)
   */
  async createCartMapping(cartUuid: string): Promise<boolean> {
    try {
      console.log(`Creating cart mapping for cart ${cartUuid}`);

      const response = await this.makeGraphQLRequest(`
        mutation CreateCartMapping($cartUuid: String!) {
          createCartMapping(cartUuid: $cartUuid) {
            id
            cartUuid
            createdAt
          }
        }
      `, {
        cartUuid
      });

      const result = response.data.createCartMapping;
      console.log('Cart mapping created successfully:', result);
      return true;

    } catch (error) {
      console.error('Failed to create cart mapping:', error);
      return false;
    }
  }

  /**
   * Update cart mapping with payment intent ID
   */
  async updateCartMappingPaymentIntent(cartUuid: string, paymentIntentId: string): Promise<boolean> {
    try {
      console.log(`Updating cart mapping ${cartUuid} with payment intent ${paymentIntentId}`);

      const response = await this.makeGraphQLRequest(`
        mutation UpdateCartMappingPaymentIntent($cartUuid: String!, $paymentIntentId: String!) {
          updateCartMappingPaymentIntent(cartUuid: $cartUuid, paymentIntentId: $paymentIntentId) {
            id
            cartUuid
            paymentIntentId
          }
        }
      `, {
        cartUuid,
        paymentIntentId
      });

      const result = response.data.updateCartMappingPaymentIntent;
      console.log('Cart mapping updated successfully:', result);
      return true;

    } catch (error) {
      console.error('Failed to update cart mapping:', error);
      return false;
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
    baseDelayMs = 1000,
    cartUuid?: string
  ): Promise<SettlementResult & { attempts: number; errorDetails?: PaymentError }> {
    let lastError: any;
    let attempts = 0;
    let errorDetails: PaymentError | undefined;

    for (let i = 0; i < maxRetries; i++) {
      attempts = i + 1;
      console.log(`Settlement attempt ${attempts}/${maxRetries} for PaymentIntent ${paymentIntentId}`);

      try {
        const result = await this.settlePayment(paymentIntentId, cartUuid);
        
        if (result.success) {
          console.log(`Settlement succeeded on attempt ${attempts}`);
          return { ...result, attempts };
        }

        lastError = result.error;
        
        // Create enhanced error details
        errorDetails = {
          message: result.error || 'Settlement failed',
          isRetryable: result.isRetryable !== false, // Default to retryable unless explicitly false
          category: 'system',
          severity: 'medium',
          userAction: result.isRetryable !== false ? 
            'Please wait a moment and try again' : 
            'Please contact support if the problem persists'
        };

        // If not retryable, break early
        if (result.isRetryable === false) {
          console.log(`Settlement not retryable, stopping after attempt ${attempts}`);
          break;
        }

      } catch (error) {
        console.error(`Settlement attempt ${attempts} failed:`, error);
        lastError = error;
        
        errorDetails = {
          message: error instanceof Error ? error.message : 'Settlement failed',
          isRetryable: true,
          category: 'system',
          severity: 'high',
          userAction: 'Please try again or contact support if the problem persists'
        };
      }

      // Wait before next attempt (except for last attempt)
      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i); // Exponential backoff
        console.log(`Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.error(`All ${maxRetries} settlement attempts failed. Last error:`, lastError);
    
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : (lastError || 'All settlement attempts failed'),
      isRetryable: false,
      attempts,
      errorDetails
    };
  }

  /**
   * Get user-friendly error message for display
   */
  getErrorMessage(error: any, context: string = 'PAYMENT'): string {
    return this.errorHandler.handlePaymentError(error, context).message;
  }

  /**
   * Check if an error is retryable
   */
  isErrorRetryable(error: any, context: string = 'PAYMENT'): boolean {
    return this.errorHandler.handlePaymentError(error, context).isRetryable;
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