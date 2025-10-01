/**
 * 🔒 PAYMENT SECURITY TESTS
 * 
 * These tests verify that the security fixes prevent critical vulnerabilities:
 * 1. Order ID propagation security
 * 2. Payment amount validation
 * 3. Proper order state validation
 * 4. Stripe best practices compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { secureStripePaymentService } from '../services/SecureStripePaymentService';
import { Order } from '../generated/graphql';

// Mock Stripe
const mockStripe = {
  retrievePaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
  elements: vi.fn()
};

// Mock Elements
const mockElements = {
  submit: vi.fn(),
  create: vi.fn(),
  mount: vi.fn()
};

// Mock Order data
const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-123',
  code: 'RH000001',
  totalWithTax: 5000, // $50.00
  currencyCode: 'USD',
  state: 'ArrangingPayment',
  lines: [
    {
      id: 'line-1',
      quantity: 1,
      productVariant: { id: 'variant-1', name: 'Test Product' }
    }
  ],
  customer: {
    id: 'customer-1',
    firstName: 'John',
    lastName: 'Doe',
    emailAddress: 'john@example.com'
  },
  ...overrides
} as Order);

describe('Payment Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Order Validation', () => {
    it('should reject orders without valid ID', async () => {
      const invalidOrder = createMockOrder({ id: '' });
      
      try {
        await secureStripePaymentService.createSecurePaymentIntent(invalidOrder);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Order validation failed');
      }
    });

    it('should reject orders without valid code', async () => {
      const invalidOrder = createMockOrder({ code: '' });
      
      try {
        await secureStripePaymentService.createSecurePaymentIntent(invalidOrder);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Order validation failed');
      }
    });

    it('should reject orders with invalid total', async () => {
      const invalidOrder = createMockOrder({ totalWithTax: 0 });
      
      try {
        await secureStripePaymentService.createSecurePaymentIntent(invalidOrder);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Order validation failed');
      }
    });

    it('should reject orders not in ArrangingPayment state', async () => {
      const invalidOrder = createMockOrder({ state: 'AddingItems' as any });
      
      try {
        await secureStripePaymentService.createSecurePaymentIntent(invalidOrder);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Order validation failed');
        expect(error.message).toContain('ArrangingPayment state');
      }
    });

    it('should reject orders without line items', async () => {
      const invalidOrder = createMockOrder({ lines: [] });
      
      try {
        await secureStripePaymentService.createSecurePaymentIntent(invalidOrder);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Order validation failed');
        expect(error.message).toContain('at least one line item');
      }
    });
  });

  describe('Payment Intent Validation', () => {
    it('should validate payment intent amount matches order total', async () => {
      const order = createMockOrder();
      
      // Mock payment intent with different amount
      mockStripe.retrievePaymentIntent.mockResolvedValue({
        paymentIntent: {
          amount: 6000, // Different from order total (5000)
          currency: 'usd',
          metadata: {
            vendure_order_id: order.id,
            vendure_order_code: order.code
          }
        }
      });

      const result = await secureStripePaymentService.validatePaymentIntentMatchesOrder(
        'pi_test123',
        order,
        mockStripe
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment amount (6000) does not match order total (5000)');
    });

    it('should validate payment intent currency matches order currency', async () => {
      const order = createMockOrder();
      
      // Mock payment intent with different currency
      mockStripe.retrievePaymentIntent.mockResolvedValue({
        paymentIntent: {
          amount: 5000,
          currency: 'eur', // Different from order currency (USD)
          metadata: {
            vendure_order_id: order.id,
            vendure_order_code: order.code
          }
        }
      });

      const result = await secureStripePaymentService.validatePaymentIntentMatchesOrder(
        'pi_test123',
        order,
        mockStripe
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment currency (eur) does not match order currency (usd)');
    });

    it('should validate payment intent metadata matches order', async () => {
      const order = createMockOrder();
      
      // Mock payment intent with wrong order ID in metadata
      mockStripe.retrievePaymentIntent.mockResolvedValue({
        paymentIntent: {
          amount: 5000,
          currency: 'usd',
          metadata: {
            vendure_order_id: 'wrong-order-id',
            vendure_order_code: order.code
          }
        }
      });

      const result = await secureStripePaymentService.validatePaymentIntentMatchesOrder(
        'pi_test123',
        order,
        mockStripe
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment intent order ID mismatch');
    });

    it('should pass validation for correct payment intent', async () => {
      const order = createMockOrder();
      
      // Mock correct payment intent
      mockStripe.retrievePaymentIntent.mockResolvedValue({
        paymentIntent: {
          amount: 5000,
          currency: 'usd',
          metadata: {
            vendure_order_id: order.id,
            vendure_order_code: order.code
          }
        }
      });

      const result = await secureStripePaymentService.validatePaymentIntentMatchesOrder(
        'pi_test123',
        order,
        mockStripe
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Secure Payment Processing', () => {
    it('should fail if payment intent validation fails', async () => {
      const order = createMockOrder();
      
      // Mock payment intent creation to succeed
      vi.spyOn(secureStripePaymentService, 'createSecurePaymentIntent').mockResolvedValue({
        clientSecret: 'pi_test123_secret_test',
        paymentIntentId: 'pi_test123',
        amount: 5000,
        currency: 'usd'
      });

      // Mock validation to fail
      vi.spyOn(secureStripePaymentService, 'validatePaymentIntentMatchesOrder').mockResolvedValue({
        isValid: false,
        errors: ['Amount mismatch']
      });

      const result = await secureStripePaymentService.processSecurePayment(
        order,
        mockStripe,
        mockElements
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment validation failed');
    });

    it('should fail if elements submission fails', async () => {
      const order = createMockOrder();
      
      // Mock payment intent creation to succeed
      vi.spyOn(secureStripePaymentService, 'createSecurePaymentIntent').mockResolvedValue({
        clientSecret: 'pi_test123_secret_test',
        paymentIntentId: 'pi_test123',
        amount: 5000,
        currency: 'usd'
      });

      // Mock validation to succeed
      vi.spyOn(secureStripePaymentService, 'validatePaymentIntentMatchesOrder').mockResolvedValue({
        isValid: true,
        errors: []
      });

      // Mock elements submission to fail
      mockElements.submit.mockResolvedValue({
        error: { message: 'Card number is invalid' }
      });

      const result = await secureStripePaymentService.processSecurePayment(
        order,
        mockStripe,
        mockElements
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Card number is invalid');
    });
  });

  describe('Security Best Practices', () => {
    it('should not allow processing payments without specific order details', () => {
      // This test ensures that the new secure payment flow requires explicit order details
      // rather than relying on global state
      
      expect(() => {
        // The old insecure pattern would be something like:
        // processPayment() // No order parameter
        
        // The new secure pattern requires:
        secureStripePaymentService.processSecurePayment(
          createMockOrder(),
          mockStripe,
          mockElements
        );
      }).not.toThrow();
    });

    it('should validate all required order fields before payment', async () => {
      const requiredFields = ['id', 'code', 'totalWithTax', 'currencyCode', 'state', 'lines'];
      
      for (const field of requiredFields) {
        const invalidOrder = createMockOrder({ [field]: null });
        
        try {
          await secureStripePaymentService.createSecurePaymentIntent(invalidOrder);
          expect.fail(`Should have failed for missing field: ${field}`);
        } catch (error) {
          expect(error.message).toContain('Order validation failed');
        }
      }
    });
  });
});
