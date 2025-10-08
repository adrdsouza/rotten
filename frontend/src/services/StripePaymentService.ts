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
   * Update PaymentIntent amount (for pre-order flow)
   */
  async updatePaymentIntentAmount(paymentIntentId: string, amount: number): Promise<boolean> {
    try {
      console.log(`Updating PaymentIntent ${paymentIntentId} amount to ${amount}`);

      const response = await this.makeGraphQLRequest(`
        mutation UpdatePaymentIntentAmount($paymentIntentId: String!, $amount: Int!) {
          updatePaymentIntentAmount(paymentIntentId: $paymentIntentId, amount: $amount)
        }
      `, {
        paymentIntentId,
        amount
      });

      return response.data.updatePaymentIntentAmount;
    } catch (error) {
      console.error('Failed to update PaymentIntent amount:', error);
      throw this.errorHandler.handlePaymentError(error, 'UPDATE_PAYMENT_INTENT');
    }
  }

  /**
   * Add payment to order using official Vendure Stripe plugin
   * This replaces the old linkPaymentIntentToOrder + settleStripePayment flow
   *
   * NOTE: PaymentIntent metadata should be updated BEFORE calling this method
   * to ensure webhook has complete metadata when it fires
   */
  async addPaymentToOrder(
    paymentIntentId: string,
    _orderCode?: string
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log(`Adding Stripe payment to order with PaymentIntent ${paymentIntentId}`);

      const response = await this.makeGraphQLRequest(`
        mutation AddPaymentToOrder($input: PaymentInput!) {
          addPaymentToOrder(input: $input) {
            ... on Order {
              id
              code
              state
              totalWithTax
              payments {
                id
                method
                amount
                state
                transactionId
              }
            }
            ... on OrderPaymentStateError {
              errorCode
              message
            }
            ... on IneligiblePaymentMethodError {
              errorCode
              message
              eligibilityCheckerMessage
            }
            ... on PaymentFailedError {
              errorCode
              message
              paymentErrorMessage
            }
            ... on PaymentDeclinedError {
              errorCode
              message
              paymentErrorMessage
            }
            ... on OrderStateTransitionError {
              errorCode
              message
              transitionError
              fromState
              toState
            }
            ... on NoActiveOrderError {
              errorCode
              message
            }
          }
        }
      `, {
        input: {
          method: 'stripe',
          metadata: {
            paymentIntentId: paymentIntentId
          }
        }
      });

      const result = response.data.addPaymentToOrder;

      // Check if result is an Order (success case)
      if (result && result.id && result.code) {
        console.log('Payment added to order successfully:', result.code);

        return {
          success: true,
          order: result
        };
      }

      // Handle error cases
      if (result && result.errorCode) {
        const errorMessage = result.message || result.paymentErrorMessage || 'Payment failed';
        console.error('Payment failed with error:', result.errorCode, errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      // Fallback error
      console.error('Unexpected payment result:', result);
      return {
        success: false,
        error: 'Payment failed with unexpected result'
      };

    } catch (error) {
      console.error('Error adding payment to order:', error);
      const handledError = this.errorHandler.handlePaymentError(error, 'ADD_PAYMENT');
      return {
        success: false,
        error: handledError.message
      };
    }
  }

  /**
   * Update PaymentIntent metadata with order information for webhook processing
   */
  async updatePaymentIntentMetadata(
    paymentIntentId: string,
    orderCode: string,
    orderId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Updating PaymentIntent ${paymentIntentId} metadata for order ${orderCode} (${orderId})`);

      const response = await this.makeGraphQLRequest(`
        mutation UpdatePaymentIntentMetadata($paymentIntentId: String!, $orderCode: String!, $orderId: Int!) {
          updatePaymentIntentMetadata(paymentIntentId: $paymentIntentId, orderCode: $orderCode, orderId: $orderId)
        }
      `, {
        paymentIntentId,
        orderCode,
        orderId
      });

      if (response.data.updatePaymentIntentMetadata) {
        console.log(`PaymentIntent metadata updated successfully for order ${orderCode}`);
        return { success: true };
      } else {
        console.error('Failed to update PaymentIntent metadata');
        return { success: false, error: 'Failed to update PaymentIntent metadata' };
      }

    } catch (error) {
      console.error('Error updating PaymentIntent metadata:', error);
      return {
        success: false,
        error: this.errorHandler.handlePaymentError(error, 'UPDATE_METADATA').message
      };
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
   * DEPRECATED: Use addPaymentToOrder instead
   * This method is kept for backward compatibility but should not be used
   */
  async settlePayment(paymentIntentId: string, _cartUuid?: string): Promise<SettlementResult> {
    console.warn('settlePayment is deprecated. Use addPaymentToOrder instead.');

    // Redirect to the new method
    const result = await this.addPaymentToOrder(paymentIntentId);

    return {
      success: result.success,
      orderId: result.order?.id,
      orderCode: result.order?.code,
      paymentId: result.order?.payments?.[0]?.id,
      error: result.error,
      isRetryable: !result.success, // Allow retry if failed
    };
  }

  /**
   * Complete payment flow: Confirm with Stripe → Add payment to order
   * This is the new recommended flow using the official Vendure Stripe plugin
   */
  async completePayment(
    clientSecret: string,
    elements: StripeElements,
    returnUrl?: string
  ): Promise<{ success: boolean; error?: string; requiresAction?: boolean; order?: any }> {
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

    // Step 2: Add payment to order using official plugin
    const paymentResult = await this.addPaymentToOrder(confirmResult.paymentIntent.id);

    return {
      success: paymentResult.success,
      error: paymentResult.error,
      order: paymentResult.order
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
   * Retry payment with exponential backoff and enhanced error handling
   * Updated to use the new addPaymentToOrder flow
   */
  async retrySettlement(
    paymentIntentId: string,
    maxRetries = 3,
    baseDelayMs = 1000,
    _cartUuid?: string
  ): Promise<SettlementResult & { attempts: number; errorDetails?: PaymentError }> {
    let lastError: any;
    let attempts = 0;
    let errorDetails: PaymentError | undefined;

    for (let i = 0; i < maxRetries; i++) {
      attempts = i + 1;
      console.log(`Payment attempt ${attempts}/${maxRetries} for PaymentIntent ${paymentIntentId}`);

      try {
        const result = await this.addPaymentToOrder(paymentIntentId);

        if (result.success) {
          console.log(`Payment succeeded on attempt ${attempts}`);
          return {
            success: true,
            orderId: result.order?.id,
            orderCode: result.order?.code,
            paymentId: result.order?.payments?.[0]?.id,
            attempts
          };
        }

        lastError = result.error;

        // Create enhanced error details
        errorDetails = {
          message: result.error || 'Payment failed',
          isRetryable: true, // Most payment failures are retryable
          category: 'system',
          severity: 'medium',
          userAction: 'Please wait a moment and try again'
        };

      } catch (error) {
        console.error(`Payment attempt ${attempts} failed:`, error);
        lastError = error;

        errorDetails = {
          message: error instanceof Error ? error.message : 'Payment failed',
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

    console.error(`All ${maxRetries} payment attempts failed. Last error:`, lastError);

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : (lastError || 'All payment attempts failed'),
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
