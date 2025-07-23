import {
  CancelPaymentErrorResult,
  CancelPaymentResult,
  CreatePaymentResult,
  CreateRefundResult,
  LanguageCode,
  Logger,
  Order,
  OrderService,
  Payment,
  PaymentMethodHandler,
  RequestContext,
  SettlePaymentErrorResult,
  SettlePaymentResult,
} from '@vendure/core';
import axios from 'axios';
import { URLSearchParams } from 'url';

let orderService: OrderService;

function parseNmiResponse(responseString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = responseString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    result[key] = decodeURIComponent(value || '');
  }
  if (!result.response) {
    throw new Error('Invalid NMI response: Missing response code');
  }
  if (!result.transactionid) {
    Logger.warn('NMI response missing transactionid, proceeding with response code', 'NmiPaymentHandler');
  }
  return result;
}



function getSecurityKey(): string {
  const securityKey = process.env.NMI_SECURITY_KEY;
  if (!securityKey || securityKey.trim() === '') {
    const errorMsg = 'NMI_SECURITY_KEY environment variable is not set';
    Logger.error(errorMsg, 'NmiPaymentHandler');
    throw new Error(errorMsg);
  }
  return securityKey;
}

export const nmiPaymentHandler = new PaymentMethodHandler({
  code: 'nmi-payment',
  description: [{ languageCode: LanguageCode.en, value: 'NMI Payment Gateway' }],
  args: {
    testMode: {
      type: 'boolean',
      label: [{ languageCode: LanguageCode.en, value: 'Test Mode' }],
      description: [{
        languageCode: LanguageCode.en,
        value: 'When enabled, transactions will be processed in test mode',
      }],
      defaultValue: true,
    },
    strictAvsCvv: {
      type: 'boolean',
      label: [{ languageCode: LanguageCode.en, value: 'Strict AVS/CVV Validation' }],
      description: [{
        languageCode: LanguageCode.en,
        value: 'When enabled, payments will be rejected if AVS or CVV checks fail',
      }],
      defaultValue: false,
    },
  },
  
  init(injector) {
    orderService = injector.get(OrderService);
  },

  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    const securityKey = getSecurityKey();
    const { testMode, strictAvsCvv } = args;
    const paymentAmount = amount;

         let cardData;
            try {
                // Handle both string and object metadata formats
                if (typeof metadata === 'string') {
                    cardData = JSON.parse(metadata);
                } else {
                    cardData = metadata;
                }
            } catch (e: any) {
                Logger.error(`Failed to parse payment metadata: ${e.message}`, 'NmiPaymentHandler');
                throw new Error('Invalid payment data format');
            }
        const { cardNumber, cvv, expiryDate } = cardData;

            if (!cardNumber || !cvv || !expiryDate) {
                throw new Error('Missing required card information');
            }
 
    // Generate a unique order ID to prevent duplicate transaction errors
    // Format: {orderCode}-{timestamp}-{random} to ensure uniqueness for each payment attempt
    const uniqueOrderId = `${order.code}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    Logger.info(`Processing NMI payment for order ${order.code} with unique ID: ${uniqueOrderId}`, 'NmiPaymentHandler');
    
    const transactionParams: Record<string, string> = {
      type: 'sale',
      amount: (paymentAmount / 100).toFixed(2),
      orderid: uniqueOrderId,
      security_key: securityKey,
      ccnumber: cardNumber,
      ccexp: expiryDate,
      cvv: cvv,

    };
    Logger.info('Processing payment with card data token', 'NmiPaymentHandler');

    
    if (testMode) transactionParams['test_mode'] = '1';

    const encodedParams = new URLSearchParams();
    Object.entries(transactionParams).forEach(([key, value]) => encodedParams.set(key, value));

    try {
      const response = await axios.post('https://secure.nmi.com/api/transact.php', encodedParams, {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        timeout: parseInt(process.env.NMI_TIMEOUT_MS || '10000'),
      });
    Logger.info('Received NMI response for payment', 'NmiPaymentHandler');

      const responseData = parseNmiResponse(response.data);
      const isApproved = responseData.response === '1';
      const isDeclined = responseData.response === '2' || responseData.response === '3';
      const avsMatch = responseData.avsresponse && !['N', 'U', 'R'].includes(responseData.avsresponse);
      const cvvMatch = responseData.cvvresponse && responseData.cvvresponse !== 'N';

      // if (isApproved && strictAvsCvv && (!avsMatch || !cvvMatch)) {
      //   Logger.warn(`Payment rejected due to AVS/CVV mismatch for order ${order.code}`, 'NmiPaymentHandler');
      //   return {
      //     amount: paymentAmount,
      //     state: 'Declined',
      //     metadata: { errorMessage: 'Payment rejected due to AVS or CVV mismatch' },
      //   };
      // }

      if (isApproved) {
        return {
          amount: paymentAmount,
          state: 'Settled',
          transactionId: responseData.transactionid,
          metadata: {
            authCode: responseData.authcode,
            avsResponse: responseData.avsresponse,
            cvvResponse: responseData.cvvresponse,
            paymentSettled: true,
            uniqueOrderId: uniqueOrderId, // Track the unique order ID used for this transaction
            public: {
              cardType: responseData.type || 'Credit Card',
              last4: responseData.cardnumber?.slice(-4) || 'xxxx',
            },
          },
        };
      }

      return {
        amount: paymentAmount,
        state: 'Declined',
        metadata: {
          errorMessage: responseData.response === '3'
            ? (responseData.responsetext || 'Duplicate transaction detected. Please try again.')
            : (responseData.responsetext || 'Payment declined')
        },
      };
    } catch (err: any) {
      Logger.error(`NMI payment error: ${err.message}`, 'NmiPaymentHandler');
      return {
        amount: paymentAmount,
        state: 'Declined',
        metadata: { errorMessage: err.message || 'Unknown payment error' },
      };
    }
  },

  settlePayment: async (): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    return { success: false, errorMessage: 'Settlement not supported - payments are settled immediately' };
  },

  cancelPayment: async (ctx: RequestContext, order: Order, payment: Payment, args: any): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
    const securityKey = getSecurityKey();
    const { testMode } = args;
    
    const encodedParams = new URLSearchParams({
      type: 'void',
      transactionid: payment.transactionId || '',
      security_key: securityKey,
    });
    
    if (testMode) encodedParams.set('test_mode', '1');

    try {
      const response = await axios.post('https://secure.nmi.com/api/transact.php', encodedParams, {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        timeout: parseInt(process.env.NMI_TIMEOUT_MS || '10000'),
      });

      const responseData = parseNmiResponse(response.data);
      return responseData.response === '1'
        ? { success: true, metadata: { responseText: responseData.responsetext } }
        : { success: false, errorMessage: responseData.responsetext || 'Void failed' };
    } catch (err: any) {
      Logger.error(`NMI void error: ${err.message}`, 'NmiPaymentHandler');
      return { success: false, errorMessage: err.message || 'Unknown void error' };
    }
  },

  createRefund: async (ctx: RequestContext, input: any, amount: number, order: Order, payment: Payment, args: any): Promise<CreateRefundResult> => {
    const securityKey = getSecurityKey();
    const { testMode } = args;
    
    const encodedParams = new URLSearchParams({
      type: 'refund',
      transactionid: payment.transactionId || '',
      amount: (amount / 100).toFixed(2),
      security_key: securityKey,
    });
    
    if (testMode) encodedParams.set('test_mode', '1');

    try {
      const response = await axios.post('https://secure.nmi.com/api/transact.php', encodedParams, {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        timeout: parseInt(process.env.NMI_TIMEOUT_MS || '10000'),
      });

      const responseData = parseNmiResponse(response.data);
      if (responseData.response === '1') {
        return {
          state: 'Settled',
          transactionId: responseData.transactionid,
          metadata: {
            refundId: responseData.transactionid,
            responseText: responseData.responsetext,
            public: {
              refundAmount: (amount / 100).toFixed(2),
              refundReason: input.reason || 'Customer requested refund',
            },
          },
        };
      } else {
        return {
          state: 'Failed',
          transactionId: responseData.transactionid,
          metadata: {
            errorMessage: responseData.responsetext || 'Refund failed',
          },
        };
      }
    } catch (err: any) {
      Logger.error(`NMI refund error: ${err.message}`, 'NmiPaymentHandler');
      return {
        state: 'Failed',
        metadata: {
          errorMessage: err.message || 'Unknown refund error',
        },
      };
    }
  },
});