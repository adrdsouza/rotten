/**
 * 🔒 SECURE STRIPE PAYMENT SERVICE
 * 
 * This service implements secure Stripe payment processing following official best practices:
 * 1. Payment intents are created AFTER order creation with exact amounts
 * 2. Proper order validation and amount matching
 * 3. No pre-order payment intents that could be misused
 * 4. Explicit order ID validation throughout the flow
 */

import { Order } from '~/generated/graphql';

export interface SecurePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SecureStripePaymentService {
  private static instance: SecureStripePaymentService;

  public static getInstance(): SecureStripePaymentService {
    if (!SecureStripePaymentService.instance) {
      SecureStripePaymentService.instance = new SecureStripePaymentService();
    }
    return SecureStripePaymentService.instance;
  }

  /**
   * 🔒 SECURITY FIX: Create payment intent with specific order validation
   * This replaces the insecure pre-order pattern
   */
  async createSecurePaymentIntent(order: Order): Promise<SecurePaymentIntentResult> {
    console.log('[SecureStripePaymentService] Creating secure payment intent for order:', order.code);

    // 🔒 Validate order before creating payment intent
    const validation = this.validateOrderForPayment(order);
    if (!validation.isValid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const { requester } = await import('~/utils/api');
      
      const { gql } = await import('graphql-tag');

      const result = await requester<
        { createSecureStripePaymentIntent: SecurePaymentIntentResult },
        {
          orderId: string;
          orderCode: string;
          amount: number;
          currency: string;
          customerEmail?: string;
        }
      >(
        gql`
        mutation CreateSecureStripePaymentIntent(
          $orderId: String!,
          $orderCode: String!,
          $amount: Int!,
          $currency: String!,
          $customerEmail: String
        ) {
          createSecureStripePaymentIntent(
            orderId: $orderId,
            orderCode: $orderCode,
            amount: $amount,
            currency: $currency,
            customerEmail: $customerEmail
          ) {
            clientSecret
            paymentIntentId
            amount
            currency
          }
        }
        `,
        {
          orderId: order.id,
          orderCode: order.code,
          amount: order.totalWithTax,
          currency: order.currencyCode.toLowerCase(),
          customerEmail: order.customer?.emailAddress
        }
      );

      console.log('[SecureStripePaymentService] Secure payment intent created:', result.createSecureStripePaymentIntent.paymentIntentId);
      return result.createSecureStripePaymentIntent;

    } catch (error) {
      console.log('[SecureStripePaymentService] Failed to create secure payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🔒 Validate order data before payment processing
   */
  private validateOrderForPayment(order: Order): PaymentValidationResult {
    console.log('[SecureStripePaymentService] 🔍 Starting order validation for:', order);
    const errors: string[] = [];

    if (!order) {
      console.log('[SecureStripePaymentService] ❌ Order validation failed: Order is null/undefined');
      errors.push('Order is required');
      return { isValid: false, errors };
    }

    console.log('[SecureStripePaymentService] 🔍 Order structure analysis:', {
      id: order.id,
      code: order.code,
      totalWithTax: order.totalWithTax,
      state: order.state,
      currencyCode: order.currencyCode,
      customer: order.customer,
      lines: order.lines?.length || 0,
      shippingAddress: !!order.shippingAddress,
      billingAddress: !!order.billingAddress
    });

    if (!order.id || !order.code) {
      console.log('[SecureStripePaymentService] ❌ Order validation failed: Missing ID or code', {
        id: order.id,
        code: order.code
      });
      errors.push('Order must have valid ID and code');
    }

    if (!order.totalWithTax || order.totalWithTax <= 0) {
      console.log('[SecureStripePaymentService] ❌ Order validation failed: Invalid total amount', {
        totalWithTax: order.totalWithTax
      });
      errors.push('Order must have valid total amount');
    }

    if (!order.currencyCode) {
      errors.push('Order must have valid currency');
    }

    if (order.state !== 'ArrangingPayment') {
      errors.push(`Order must be in ArrangingPayment state, currently: ${order.state}`);
    }

    if (!order.lines || order.lines.length === 0) {
      errors.push('Order must have at least one line item');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔒 Validate payment intent matches order
   */
  async validatePaymentIntentMatchesOrder(
    paymentIntentId: string, 
    order: Order,
    stripe: any
  ): Promise<PaymentValidationResult> {
    const errors: string[] = [];

    try {
      if (!stripe) {
        errors.push('Stripe not initialized');
        return { isValid: false, errors };
      }

      // Retrieve payment intent from Stripe
      const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentId);
      
      if (!paymentIntent) {
        errors.push('Payment intent not found');
        return { isValid: false, errors };
      }

      // Validate amount matches
      if (paymentIntent.amount !== order.totalWithTax) {
        errors.push(`Payment amount (${paymentIntent.amount}) does not match order total (${order.totalWithTax})`);
      }

      // Validate currency matches
      if (paymentIntent.currency !== order.currencyCode.toLowerCase()) {
        errors.push(`Payment currency (${paymentIntent.currency}) does not match order currency (${order.currencyCode.toLowerCase()})`);
      }

      // Validate metadata contains correct order information
      const metadata = paymentIntent.metadata;
      if (metadata.vendure_order_id !== order.id) {
        errors.push('Payment intent order ID mismatch');
      }

      if (metadata.vendure_order_code !== order.code) {
        errors.push('Payment intent order code mismatch');
      }

    } catch (error) {
      console.log('[SecureStripePaymentService] Error validating payment intent:', error);
      errors.push(`Payment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔒 Process secure payment with full validation
   */
  async processSecurePayment(
    order: Order,
    stripe: any,
    elements: any
  ): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> {
    console.log('[SecureStripePaymentService] Processing secure payment for order:', order.code);

    try {
      // 1. Create secure payment intent
      const paymentIntentResult = await this.createSecurePaymentIntent(order);
      
      // 2. Validate payment intent matches order
      const validation = await this.validatePaymentIntentMatchesOrder(
        paymentIntentResult.paymentIntentId,
        order,
        stripe
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: `Payment validation failed: ${validation.errors.join(', ')}`
        };
      }

      // 3. Submit elements for validation
      const { error: submitError } = await elements.submit();
      if (submitError) {
        return {
          success: false,
          error: submitError.message || 'Payment form validation failed'
        };
      }

      // 4. Confirm payment with Stripe
      const confirmResult = await stripe.confirmPayment({
        elements,
        clientSecret: paymentIntentResult.clientSecret,
        redirect: 'if_required'
      });

      if (confirmResult.error) {
        return {
          success: false,
          error: confirmResult.error.message || 'Payment confirmation failed'
        };
      }

      // 5. Final validation that payment succeeded
      const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentResult.clientSecret);
      if (paymentIntent.status !== 'succeeded') {
        return {
          success: false,
          error: `Payment not successful. Status: ${paymentIntent.status}`
        };
      }

      console.log('[SecureStripePaymentService] Payment processed successfully:', paymentIntentResult.paymentIntentId);
      return {
        success: true,
        paymentIntentId: paymentIntentResult.paymentIntentId
      };

    } catch (error) {
      console.log('[SecureStripePaymentService] Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }
}

export const secureStripePaymentService = SecureStripePaymentService.getInstance();
