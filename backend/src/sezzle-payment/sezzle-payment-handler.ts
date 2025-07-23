import {
  CreatePaymentResult,
  EntityHydrator,
  LanguageCode,
  Logger,
  PaymentMethodHandler,
  RequestContext,
  Payment,
  Order,
  PaymentMetadata,
  CreateRefundResult,
  SettlePaymentResult,
  SettlePaymentErrorResult,
} from '@vendure/core';
import axios, { AxiosInstance } from 'axios';

let entityHydrator: EntityHydrator;

interface SezzleConfig {
  publicKey: string;
  privateKey: string;
  baseUrl: string;
  timeout: number;
}

interface SezzleAuthResponse {
  token: string;
  expiration_date: string;
  merchant_uuid: string;
}

interface SezzleSessionRequest {
  cancel_url: {
    href: string;
    method: 'GET';
  };
  complete_url: {
    href: string;
    method: 'GET';
  };
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    dob?: string;
    billing_address: {
      name: string;
      street: string;
      street2?: string;
      city: string;
      state: string;
      postal_code: string;
      country_code: string;
      phone_number?: string;
    };
    shipping_address?: {
      name: string;
      street: string;
      street2?: string;
      city: string;
      state: string;
      postal_code: string;
      country_code: string;
      phone_number?: string;
    };
  };
  order: {
    intent: 'AUTH' | 'CAPTURE';
    reference_id: string;
    description?: string;
    items: Array<{
      name: string;
      sku?: string;
      quantity: number;
      price: {
        amount_in_cents: number;
        currency: string;
      };
    }>;
    discounts?: Array<{
      name: string;
      amount: {
        amount_in_cents: number;
        currency: string;
      };
    }>;
    metadata?: Record<string, any>;
    shipping_amount?: {
      amount_in_cents: number;
      currency: string;
    };
    tax_amount?: {
      amount_in_cents: number;
      currency: string;
    };
    order_amount: {
      amount_in_cents: number;
      currency: string;
    };
  };
}

interface SezzleSessionResponse {
  uuid: string;
  links: Array<{
    href: string;
    method: string;
    rel: string;
  }>;
  order: {
    uuid: string;
    checkout_url: string;
    intent: 'AUTH' | 'CAPTURE';
    links: Array<{
      href: string;
      method: string;
      rel: string;
    }>;
  };
}

interface SezzleRefundRequest {
  amount_in_cents: number;
  currency: string;
  reason?: string;
  merchant_notes?: string;
  metadata?: Record<string, any>;
}

class SezzleClient {
  private client: AxiosInstance;
  private config: SezzleConfig;
  private authToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(config: Partial<SezzleConfig> = {}) {
    this.config = {
      publicKey: process.env.SEZZLE_MERCHANT_UUID || '', // This is actually the public key
      privateKey: process.env.SEZZLE_API_KEY || '', // This is actually the private key
      baseUrl: process.env.SEZZLE_BASE_URL || 'https://sandbox.gateway.sezzle.com',
      timeout: parseInt(process.env.SEZZLE_TIMEOUT_MS || '30000', 10),
      ...config,
    };

    if (!this.config.publicKey || !this.config.privateKey) {
      throw new Error('Sezzle public key and private key are required');
    }

    this.client = axios.create({
      baseURL: `${this.config.baseUrl.replace(/\/+$/, '')}/v2`, // Ensure no double slashes
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private async getAuthToken(): Promise<string> {
    // Check if we have a valid token
    if (this.authToken && this.tokenExpiration && new Date() < this.tokenExpiration) {
      return this.authToken;
    }

    try {
      const response = await axios.post<SezzleAuthResponse>(
        `${this.config.baseUrl}/v2/authentication`,
        {
          public_key: this.config.publicKey,
          private_key: this.config.privateKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }
      );

      this.authToken = response.data.token;
      this.tokenExpiration = new Date(response.data.expiration_date);

      Logger.info('Sezzle authentication token obtained successfully', 'SezzlePaymentHandler');
      return this.authToken;
    } catch (error: any) {
      Logger.error(`Sezzle authentication failed: ${error.message}`, 'SezzlePaymentHandler');
      throw new Error('Failed to authenticate with Sezzle');
    }
  }

  private async makeAuthenticatedRequest<T>(method: 'GET' | 'POST', url: string, data?: any): Promise<T> {
    const token = await this.getAuthToken();

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (method === 'GET') {
      const response = await this.client.get<T>(url, config);
      return response.data;
    } else {
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    }
  }

  async createSession(sessionData: SezzleSessionRequest): Promise<SezzleSessionResponse> {
    try {
      return await this.makeAuthenticatedRequest<SezzleSessionResponse>('POST', '/session', sessionData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      Logger.error(`Sezzle create session failed: ${errorMessage}`, 'SezzlePaymentHandler');
      if (error.response?.data) {
        Logger.error(`Sezzle error details: ${JSON.stringify(error.response.data)}`, 'SezzlePaymentHandler');
      }
      throw new Error(errorMessage || 'Failed to create Sezzle session');
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      return await this.makeAuthenticatedRequest<any>('GET', `/order/${orderId}`);
    } catch (error: any) {
      Logger.error(`Sezzle get order failed: ${error.message}`, 'SezzlePaymentHandler');
      throw new Error('Failed to fetch Sezzle order details');
    }
  }

  async refundOrder(orderId: string, refundData: SezzleRefundRequest): Promise<{ id: string; status: string }> {
    try {
      return await this.makeAuthenticatedRequest<{ id: string; status: string }>('POST', `/order/${orderId}/refund`, refundData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      Logger.error(`Sezzle refund failed: ${errorMessage}`, 'SezzlePaymentHandler');
      if (error.response?.data) {
        Logger.error(`Sezzle refund error details: ${JSON.stringify(error.response.data)}`, 'SezzlePaymentHandler');
      }
      throw new Error(errorMessage || 'Failed to process Sezzle refund');
    }
  }

  async getOrderStatus(orderUuid: string): Promise<any> {
    try {
      return await this.makeAuthenticatedRequest<any>('GET', `/order/${orderUuid}`);
    } catch (error: any) {
      Logger.error(`Sezzle get order status failed: ${error.message}`, 'SezzlePaymentHandler');
      throw new Error('Failed to fetch Sezzle order status');
    }
  }

  async captureOrder(orderUuid: string, captureAmount?: number): Promise<any> {
    try {
      const captureData = captureAmount ? { amount_in_cents: captureAmount } : {};
      return await this.makeAuthenticatedRequest<any>('POST', `/order/${orderUuid}/capture`, captureData);
    } catch (error: any) {
      Logger.error(`Sezzle capture failed: ${error.message}`, 'SezzlePaymentHandler');
      throw new Error('Failed to capture Sezzle order');
    }
  }
}

export const sezzlePaymentHandler = new PaymentMethodHandler({
  code: 'sezzle',
  description: [{ languageCode: LanguageCode.en, value: 'Sezzle Buy Now, Pay Later' }],
  args: {
    testMode: {
      type: 'boolean',
      label: [{ languageCode: LanguageCode.en, value: 'Test Mode' }],
      description: [{
        languageCode: LanguageCode.en,
        value: 'When enabled, transactions will be processed in Sezzle sandbox mode',
      }],
      defaultValue: true,
    },
    autoCapture: {
      type: 'boolean',
      label: [{ languageCode: LanguageCode.en, value: 'Auto Capture' }],
      description: [{
        languageCode: LanguageCode.en,
        value: 'When enabled, payments will be captured immediately instead of authorized',
      }],
      defaultValue: true,
    },
  },

  init(injector) {
    entityHydrator = injector.get(EntityHydrator);
  },

  createPayment: async (_ctx, order, amount, args, _metadata): Promise<CreatePaymentResult> => {
    try {
      Logger.info(`[Sezzle] Creating payment for order ${order.code}, amount: ${amount}, total: ${order.total}`, 'SezzlePaymentHandler');
      Logger.info(`[Sezzle] Order lines count: ${order.lines?.length || 0}`, 'SezzlePaymentHandler');

      // Check if order has items and valid amount
      if (!order.lines || order.lines.length === 0) {
        throw new Error('Cannot process payment for empty order');
      }

      if (amount <= 0) {
        throw new Error('Cannot process payment for zero amount');
      }

      const sezzle = new SezzleClient({
        baseUrl: args.testMode
          ? 'https://sandbox.gateway.sezzle.com'
          : 'https://gateway.sezzle.com',
      });

      const orderItems = order.lines.map(line => ({
        name: line.productVariant.name,
        sku: line.productVariant.sku,
        quantity: line.quantity,
        price: {
          amount_in_cents: line.proratedUnitPrice, // Keep in cents
          currency: order.currencyCode || 'USD',
        },
      }));

      const billingAddress = order.billingAddress;
      const shippingAddress = order.shippingAddress || billingAddress;

      const firstName = (billingAddress as any).firstName || (billingAddress.fullName?.split(' ')[0] || 'Customer');
      const lastName = (billingAddress as any).lastName || (billingAddress.fullName?.split(' ').slice(1).join(' ') || 'Name');

      const sezzleSession: SezzleSessionRequest = {
        cancel_url: {
          href: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/payment?canceled=true`,
          method: 'GET',
        },
        complete_url: {
          href: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/confirmation/${order.code}`,
          method: 'GET',
        },
        customer: {
          email: order.customer?.emailAddress || '',
          first_name: firstName,
          last_name: lastName,
          phone: billingAddress.phoneNumber || '',
          billing_address: {
            name: `${firstName} ${lastName}`,
            street: billingAddress.streetLine1 || '',
            street2: billingAddress.streetLine2 || '',
            city: billingAddress.city || '',
            state: billingAddress.province || '',
            postal_code: billingAddress.postalCode || '',
            country_code: billingAddress.countryCode || 'US',
            phone_number: billingAddress.phoneNumber || '',
          },
          shipping_address: {
            name: `${firstName} ${lastName}`,
            street: shippingAddress.streetLine1 || '',
            street2: shippingAddress.streetLine2 || '',
            city: shippingAddress.city || '',
            state: shippingAddress.province || '',
            postal_code: shippingAddress.postalCode || '',
            country_code: shippingAddress.countryCode || 'US',
            phone_number: shippingAddress.phoneNumber || '',
          },
        },
        order: {
          intent:  'CAPTURE' ,
          reference_id: order.code,
          description: `Order ${order.code} from ${process.env.STORE_NAME || 'Store'}`,
          items: orderItems,
          metadata: {
            orderCode: order.code,
            customerId: order.customer?.id ? String(order.customer.id) : '',
          },
          shipping_amount: {
            amount_in_cents: order.shipping,
            currency: order.currencyCode || 'USD',
          },
          tax_amount: {
            amount_in_cents: order.taxSummary.reduce((sum, tax) => sum + tax.taxTotal, 0),
            currency: order.currencyCode || 'USD',
          },
          order_amount: {
            amount_in_cents: order.total,
            currency: order.currencyCode || 'USD',
          },
        },
      };

      const result = await sezzle.createSession(sezzleSession);

      Logger.info(`[Sezzle] Session created successfully. Session UUID: ${result.uuid}`, 'SezzlePaymentHandler');
      Logger.info(`[Sezzle] Order UUID: ${result.order.uuid}`, 'SezzlePaymentHandler');
      Logger.info(`[Sezzle] Checkout URL: ${result.order.checkout_url}`, 'SezzlePaymentHandler');

      return {
        amount: amount,
        state: 'Authorized' as const,
        transactionId: result.order.uuid,
        metadata: {
          sezzleSessionUuid: result.uuid,
          sezzleOrderUuid: result.order.uuid,
          checkoutUrl: result.order.checkout_url,
          intent: result.order.intent,
          public: {
            checkoutUrl: result.order.checkout_url,
            redirectRequired: true,
          },
        },
      };
    } catch (error: any) {
      Logger.error(`Sezzle payment error: ${error.message}`, 'SezzlePaymentHandler');
      return {
        amount: amount,
        state: 'Declined' as const,
        metadata: {
          errorMessage: error.message || 'Payment processing failed',
        },
      };
    }
  },

  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    try {
      // Hydrate the order with lines relation to ensure discounts property is accessible
      // This is required because PaymentService.settlePayment() internally accesses order.discounts
      await entityHydrator.hydrate(ctx, order, { relations: ['lines'] });
      Logger.info(`[Sezzle] Order hydrated with lines relation for ${order.code}`, 'SezzlePaymentHandler');

      const sezzle = new SezzleClient({
        baseUrl: args.testMode
          ? 'https://sandbox.gateway.sezzle.com'
          : 'https://gateway.sezzle.com',
      });

      const sezzleOrderUuid = (payment.metadata as any)?.sezzleOrderUuid;
      Logger.info(`[Sezzle] Payment metadata: ${JSON.stringify(payment.metadata)}`, 'SezzlePaymentHandler');
      if (!sezzleOrderUuid) {
        Logger.error(`[Sezzle] No Sezzle order UUID found in payment metadata for order ${order.code}`, 'SezzlePaymentHandler');
        return {
          success: false,
          errorMessage: 'No Sezzle order UUID found in payment metadata',
        };
      }

      Logger.info(`[Sezzle] Verifying payment status for order ${order.code}, Sezzle UUID: ${sezzleOrderUuid}`, 'SezzlePaymentHandler');

      // Get the current status from Sezzle with retry logic for timeouts
      let sezzleOrder;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          sezzleOrder = await sezzle.getOrderStatus(sezzleOrderUuid);
          Logger.info(`[Sezzle] Successfully retrieved order status for ${order.code}`, 'SezzlePaymentHandler');
          break;
        } catch (error: any) {
          retryCount++;
          if (error.message.includes('timeout') && retryCount <= maxRetries) {
            Logger.warn(`[Sezzle] Timeout on attempt ${retryCount}/${maxRetries + 1} for order ${order.code}, retrying...`, 'SezzlePaymentHandler');
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
            continue;
          }
          throw error; // Re-throw if not a timeout or max retries exceeded
        }
      }

      Logger.info(`[Sezzle] Sezzle order details: ${JSON.stringify(sezzleOrder)}`, 'SezzlePaymentHandler');

      const checkoutStatus = sezzleOrder.checkout_status;
      const isAuthorized = sezzleOrder.authorization?.approved;

      Logger.info(`[Sezzle] Order checkout status: ${checkoutStatus}, authorized: ${isAuthorized} for order ${order.code}`, 'SezzlePaymentHandler');

      // Check if payment is completed and authorized
      if (checkoutStatus === 'completed' && isAuthorized) {
        Logger.info(`[Sezzle] Payment confirmed as completed and authorized for order ${order.code}`, 'SezzlePaymentHandler');

        // Payment is already completed, no need to capture again
        Logger.info(`[Sezzle] Payment already completed, marking as settled for order ${order.code}`, 'SezzlePaymentHandler');
        return {
          success: true,
          metadata: {
            ...payment.metadata,
            sezzleStatus: 'COMPLETED',
            checkoutStatus: checkoutStatus,
            settledAt: new Date().toISOString(),
            verifiedWithSezzle: true,
          },
        };
      } else if (checkoutStatus !== 'completed' && isAuthorized) {
        // Payment is authorized but checkout not completed - try to capture
        Logger.info(`[Sezzle] Payment authorized but checkout not completed, attempting capture for order ${order.code}`, 'SezzlePaymentHandler');
        try {
          const captureResult = await sezzle.captureOrder(sezzleOrderUuid);
          Logger.info(`[Sezzle] Capture successful for order ${order.code}`, 'SezzlePaymentHandler');
          return {
            success: true,
            metadata: {
              ...payment.metadata,
              sezzleStatus: 'CAPTURED',
              checkoutStatus: checkoutStatus,
              capturedAt: new Date().toISOString(),
              captureResult: captureResult,
              verifiedWithSezzle: true,
            },
          };
        } catch (captureError: any) {
          Logger.error(`[Sezzle] Capture failed for order ${order.code}: ${captureError.message}`, 'SezzlePaymentHandler');
          return {
            success: false,
            errorMessage: `Failed to capture payment: ${captureError.message}`,
          };
        }
      } else if (checkoutStatus === 'completed' && !isAuthorized) {
        Logger.warn(`[Sezzle] Payment completed but not authorized for order ${order.code}`, 'SezzlePaymentHandler');
        return {
          success: false,
          errorMessage: `Payment completed but not authorized`,
        };
      } else {
        Logger.warn(`[Sezzle] Payment not ready for settlement. Checkout status: ${checkoutStatus}, authorized: ${isAuthorized} for order ${order.code}`, 'SezzlePaymentHandler');
        return {
          success: false,
          errorMessage: `Payment not completed. Checkout status: ${checkoutStatus}, authorized: ${isAuthorized}`,
        };
      }
    } catch (error: any) {
      Logger.error(`[Sezzle] Settlement verification failed for order ${order.code}: ${error.message}`, 'SezzlePaymentHandler');
      return {
        success: false,
        errorMessage: `Failed to verify payment status: ${error.message}`,
      };
    }
  },

  createRefund: async (
    _ctx: RequestContext,
    input: { amount?: number; reason?: string },
    amount: number,
    order: Order,
    payment: Payment,
    args: any,
  ): Promise<CreateRefundResult> => {
    try {
      const sezzle = new SezzleClient({
        baseUrl: args.testMode
          ? 'https://sandbox.gateway.sezzle.com'
          : 'https://gateway.sezzle.com',
      });

      const sezzleOrderUuid = (payment.metadata as PaymentMetadata)?.sezzleOrderUuid;
      if (!sezzleOrderUuid) {
        throw new Error('No Sezzle order UUID found in payment metadata');
      }

      const refundAmount = input.amount || amount;
      Logger.info(`[Sezzle] Processing refund for order ${order.code}, amount: ${refundAmount} cents`, 'SezzlePaymentHandler');

      const refundData: SezzleRefundRequest = {
        amount_in_cents: refundAmount, // Amount is already in cents from Vendure
        currency: order.currencyCode || 'USD',
        reason: input.reason || 'Customer requested refund',
        merchant_notes: `Refund for order ${order.code}`,
      };

      Logger.info(`[Sezzle] Sending refund request: ${JSON.stringify(refundData)}`, 'SezzlePaymentHandler');
      const result = await sezzle.refundOrder(sezzleOrderUuid, refundData);
      Logger.info(`[Sezzle] Refund successful for order ${order.code}`, 'SezzlePaymentHandler');

      return {
        state: 'Settled' as const,
        transactionId: result.id,
        metadata: {
          refundId: result.id,
          status: result.status,
          refundAmount: refundAmount,
          refundReason: input.reason,
        },
      };
    } catch (error: any) {
      Logger.error(`Sezzle refund error: ${error.message}`, 'SezzlePaymentHandler');

      // Log additional error details if available
      if (error.response?.data) {
        Logger.error(`Sezzle refund error details: ${JSON.stringify(error.response.data)}`, 'SezzlePaymentHandler');
      }

      return {
        state: 'Failed' as const,
        metadata: {
          errorMessage: error.message || 'Refund processing failed',
          errorDetails: error.response?.data || null,
        },
      };
    }
  },
});
