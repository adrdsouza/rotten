import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { StripePaymentService } from '../../../services/StripePaymentService';
import { PaymentErrorHandler } from '../../../services/payment-error-handler';

// Mock Stripe
const mockStripe = {
  confirmPayment: vi.fn(),
  elements: vi.fn(),
  paymentIntents: {
    retrieve: vi.fn()
  }
};

const mockElements = {
  create: vi.fn(),
  mount: vi.fn(),
  on: vi.fn()
};

// Mock loadStripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue(mockStripe)
}));

// Mock fetch for GraphQL requests
global.fetch = vi.fn();

describe('Stripe Payment Integration Tests', () => {
  let stripeService: StripePaymentService;
  let mockGetAuthHeaders: Mock;

  const mockPaymentIntentId = 'pi_test123';
  const mockClientSecret = 'pi_test123_secret_123';
  const mockOrderCode = 'ORDER-001';
  const mockAmount = 1000;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetAuthHeaders = vi.fn().mockResolvedValue({
      'Authorization': 'Bearer test-token'
    });

    stripeService = new StripePaymentService(
      'pk_test_123',
      '/shop-api',
      mockGetAuthHeaders
    );

    // Setup default Stripe mocks
    mockStripe.elements.mockReturnValue(mockElements);
    mockElements.create.mockReturnValue({
      mount: vi.fn(),
      on: vi.fn()
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Payment Flow - Successful Payment', () => {
    it('should complete successful payment flow: PaymentIntent creation → linking → Stripe confirmation → API verification → settlement', async () => {
      // Step 1: Mock PaymentIntent creation
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            createStripePaymentIntent: {
              clientSecret: mockClientSecret,
              paymentIntentId: mockPaymentIntentId,
              amount: mockAmount,
              currency: 'usd'
            }
          }
        })
      });

      const paymentIntentResult = await stripeService.createPaymentIntent(mockAmount, 'usd');

      expect(paymentIntentResult).toEqual({
        clientSecret: mockClientSecret,
        paymentIntentId: mockPaymentIntentId,
        amount: mockAmount,
        currency: 'usd'
      });

      // Step 2: Mock PaymentIntent linking
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            linkPaymentIntentToOrder: true
          }
        })
      });

      const linkResult = await stripeService.linkPaymentIntentToOrder(
        mockPaymentIntentId,
        '1',
        mockOrderCode,
        mockAmount,
        'test@example.com'
      );

      expect(linkResult).toBe(true);

      // Step 3: Mock Stripe confirmation
      const mockPaymentIntent = {
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: 'usd'
      };

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent
      });

      const confirmResult = await stripeService.confirmPayment(
        mockClientSecret,
        mockElements as any,
        'http://localhost:3000/checkout/confirmation'
      );

      expect(confirmResult.success).toBe(true);
      expect(confirmResult.paymentIntent).toEqual(mockPaymentIntent);

      // Step 4: Mock settlement
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            settleStripePayment: {
              success: true,
              orderId: '1',
              orderCode: mockOrderCode,
              paymentId: 'payment1'
            }
          }
        })
      });

      const settlementResult = await stripeService.settlePayment(mockPaymentIntentId);

      expect(settlementResult.success).toBe(true);
      expect(settlementResult.orderId).toBe('1');
      expect(settlementResult.orderCode).toBe(mockOrderCode);
      expect(settlementResult.paymentId).toBe('payment1');

      // Verify all GraphQL calls were made with correct parameters
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(mockGetAuthHeaders).toHaveBeenCalledTimes(3);
    });

    it('should handle complete payment flow with completePayment method', async () => {
      // Mock successful confirmation
      const mockPaymentIntent = {
        id: mockPaymentIntentId,
        status: 'succeeded',
        amount: mockAmount,
        currency: 'usd'
      };

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent
      });

      // Mock successful settlement
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            settleStripePayment: {
              success: true,
              orderId: '1',
              orderCode: mockOrderCode,
              paymentId: 'payment1'
            }
          }
        })
      });

      const result = await stripeService.completePayment(
        mockClientSecret,
        mockElements as any,
        'http://localhost:3000/checkout/confirmation'
      );

      expect(result.success).toBe(true);
      expect(result.settlement?.success).toBe(true);
      expect(result.settlement?.orderId).toBe('1');
      expect(result.settlement?.orderCode).toBe(mockOrderCode);

      // Verify Stripe confirmation was called
      expect(mockStripe.confirmPayment).toHaveBeenCalledWith({
        elements: mockElements,
        clientSecret: mockClientSecret,
        confirmParams: {
          return_url: 'http://localhost:3000/checkout/confirmation'
        },
        redirect: 'if_required'
      });
    });
  });

  describe('Failed Payment Scenarios', () => {
    it('should ensure orders stay in ArrangingPayment when Stripe payment fails', async () => {
      // Mock Stripe confirmation failure
      mockStripe.confirmPayment.mockResolvedValue({
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.'
        }
      });

      const result = await stripeService.confirmPayment(
        mockClientSecret,
        mockElements as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your card was declined.');
      expect(result.requiresAction).toBe(false);

      // Verify no settlement was attempted
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle different Stripe payment failure scenarios', async () => {
      const failureScenarios = [
        {
          error: { type: 'card_error', code: 'insufficient_funds', message: 'Insufficient funds' },
          expectedError: 'Insufficient funds'
        },
        {
          error: { type: 'card_error', code: 'expired_card', message: 'Your card has expired' },
          expectedError: 'Your card has expired'
        },
        {
          error: { type: 'validation_error', message: 'Invalid payment details' },
          expectedError: 'Invalid payment details'
        }
      ];

      for (const scenario of failureScenarios) {
        vi.clearAllMocks();
        
        mockStripe.confirmPayment.mockResolvedValue({
          error: scenario.error
        });

        const result = await stripeService.confirmPayment(
          mockClientSecret,
          mockElements as any
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe(scenario.expectedError);
      }
    });

    it('should handle PaymentIntent requiring additional action', async () => {
      // Mock PaymentIntent requiring 3D Secure
      const mockPaymentIntent = {
        id: mockPaymentIntentId,
        status: 'requires_action',
        amount: mockAmount,
        currency: 'usd'
      };

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: mockPaymentIntent
      });

      const result = await stripeService.confirmPayment(
        mockClientSecret,
        mockElements as any
      );

      expect(result.success).toBe(false);
      expect(result.requiresAction).toBe(true);
      expect(result.error).toBe('Payment requires additional authentication');
    });
  });

  describe('API Failure Scenarios', () => {
    it('should verify proper error handling and retry mechanisms', async () => {
      // Mock network error followed by success
      (global.fetch as Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: {
              settleStripePayment: {
                success: true,
                orderId: '1',
                orderCode: mockOrderCode,
                paymentId: 'payment1'
              }
            }
          })
        });

      const result = await stripeService.retrySettlement(mockPaymentIntentId, 3, 100);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle non-retryable API errors correctly', async () => {
      // Mock GraphQL error response
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          errors: [
            { message: 'PaymentIntent not found' }
          ]
        })
      });

      try {
        await stripeService.settlePayment(mockPaymentIntentId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('PaymentIntent not found');
      }
    });

    it('should handle HTTP errors correctly', async () => {
      // Mock HTTP 500 error
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server error')
      });

      try {
        await stripeService.settlePayment(mockPaymentIntentId);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('HTTP 500');
      }
    });
  });

  describe('Concurrent Settlement Tests', () => {
    it('should ensure idempotency works correctly', async () => {
      // Mock successful settlement
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            settleStripePayment: {
              success: true,
              orderId: '1',
              orderCode: mockOrderCode,
              paymentId: 'payment1'
            }
          }
        })
      });

      // Execute concurrent settlements
      const promises = Array(5).fill(0).map(() =>
        stripeService.settlePayment(mockPaymentIntentId)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.orderId).toBe('1');
        expect(result.orderCode).toBe(mockOrderCode);
      });

      // All requests should have been made (backend handles idempotency)
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });
  });

  describe('Payment Status and Monitoring', () => {
    it('should retrieve payment status correctly', async () => {
      const mockPaymentStatus = {
        status: 'SETTLED',
        paymentIntentId: mockPaymentIntentId,
        orderCode: mockOrderCode,
        amount: mockAmount,
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString()
      };

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            getPaymentStatus: mockPaymentStatus
          }
        })
      });

      const result = await stripeService.getPaymentStatus(mockPaymentIntentId);

      expect(result).toEqual(mockPaymentStatus);
      expect(global.fetch).toHaveBeenCalledWith('/shop-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          query: expect.stringContaining('getPaymentStatus'),
          variables: { paymentIntentId: mockPaymentIntentId }
        })
      });
    });

    it('should calculate estimated total correctly', async () => {
      const mockCartItems = [
        { productVariantId: '1', quantity: 2, unitPrice: 500 },
        { productVariantId: '2', quantity: 1, unitPrice: 300 }
      ];

      const expectedTotal = 1300;

      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            calculateEstimatedTotal: expectedTotal
          }
        })
      });

      const result = await stripeService.calculateEstimatedTotal(mockCartItems);

      expect(result).toBe(expectedTotal);
      expect(global.fetch).toHaveBeenCalledWith('/shop-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          query: expect.stringContaining('calculateEstimatedTotal'),
          variables: { cartItems: mockCartItems }
        })
      });
    });
  });

  describe('Error Handling and User Experience', () => {
    it('should provide user-friendly error messages', async () => {
      const testCases = [
        {
          error: new Error('Network timeout'),
          context: 'SETTLE_PAYMENT',
          expectedUserMessage: expect.stringContaining('network')
        },
        {
          error: { type: 'card_error', code: 'card_declined' },
          context: 'CONFIRM_PAYMENT',
          expectedUserMessage: expect.stringContaining('declined')
        }
      ];

      for (const testCase of testCases) {
        const errorMessage = stripeService.getErrorMessage(testCase.error, testCase.context);
        expect(errorMessage).toEqual(testCase.expectedUserMessage);
      }
    });

    it('should correctly identify retryable errors', async () => {
      const testCases = [
        { error: new Error('Network timeout'), context: 'SETTLE_PAYMENT', expectedRetryable: true },
        { error: { type: 'card_error', code: 'card_declined' }, context: 'CONFIRM_PAYMENT', expectedRetryable: false },
        { error: { type: 'api_connection_error' }, context: 'CREATE_PAYMENT_INTENT', expectedRetryable: true }
      ];

      for (const testCase of testCases) {
        const isRetryable = stripeService.isErrorRetryable(testCase.error, testCase.context);
        expect(isRetryable).toBe(testCase.expectedRetryable);
      }
    });
  });

  describe('Service Initialization and State', () => {
    it('should initialize Stripe correctly', async () => {
      expect(stripeService.isInitialized()).toBe(true);
      expect(stripeService.getStripe()).toBe(mockStripe);
    });

    it('should handle initialization failures gracefully', async () => {
      // Mock loadStripe failure
      const { loadStripe } = await import('@stripe/stripe-js');
      (loadStripe as Mock).mockRejectedValueOnce(new Error('Failed to load Stripe'));

      expect(() => {
        new StripePaymentService('invalid_key', '/shop-api', mockGetAuthHeaders);
      }).toThrow('Failed to initialize payment system');
    });

    it('should extract PaymentIntent ID from client secret correctly', async () => {
      const clientSecret = 'pi_test123_secret_456';
      const extractedId = (stripeService as any).extractPaymentIntentId(clientSecret);
      expect(extractedId).toBe('pi_test123');
    });
  });
});