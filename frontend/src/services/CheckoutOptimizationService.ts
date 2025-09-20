import { setOrderShippingAddressMutation, setOrderBillingAddressMutation, setOrderShippingMethodMutation } from '~/providers/shop/orders/order';
import { getEligibleShippingMethodsCached } from '~/providers/shop/checkout/checkout';
import { CacheService } from './CacheService';
import type { Order } from '~/generated/graphql';

export interface AddressInput {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
  company?: string;
}

export interface BillingAddressInput {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
}

export interface ParallelCheckoutResult {
  order: Order;
  shippingMethodsApplied: boolean;
  errors: string[];
}

export class CheckoutOptimizationService {
  /**
   * Get shipping methods with caching support
   */
  private static async getShippingMethodsWithCache(
    countryCode: string,
    postalCode: string,
    orderTotal: number
  ) {
    // Check cache first
    const cacheKey = { countryCode, postalCode, orderTotal };
    const cachedMethods = CacheService.getCachedShippingMethods(cacheKey);
    
    if (cachedMethods) {
      return cachedMethods;
    }

    // Fetch from API if not cached
    const methods = await getEligibleShippingMethodsCached(countryCode, orderTotal);
    
    // Cache the result
    CacheService.cacheShippingMethods(cacheKey, methods);
    
    return methods;
  }

  /**
   * Processes address setting and shipping method selection in parallel
   * This reduces checkout time by running independent operations concurrently
   */
  static async processAddressAndShippingParallel(
    shippingAddress: AddressInput,
    billingAddress?: BillingAddressInput,
    orderSubTotal: number = 0
  ): Promise<ParallelCheckoutResult> {
    const errors: string[] = [];
    let finalOrder: Order | null = null;
    let shippingMethodsApplied = false;

    try {
      // Start all parallel operations
      const operations = [];

      // 1. Set shipping address (always required)
      const shippingAddressPromise = setOrderShippingAddressMutation(shippingAddress);
      operations.push(shippingAddressPromise);

      // 2. Set billing address if different (optional)
      let billingAddressPromise: Promise<any> | null = null;
      if (billingAddress) {
        billingAddressPromise = setOrderBillingAddressMutation(billingAddress);
        operations.push(billingAddressPromise);
      }

      // 3. Get eligible shipping methods (can run in parallel with address setting)
      const shippingMethodsPromise = this.getShippingMethodsWithCache(
        shippingAddress.countryCode,
        shippingAddress.postalCode || '',
        orderSubTotal
      );
      operations.push(shippingMethodsPromise);

      // Execute all operations in parallel
      const results = await Promise.allSettled(operations);

      // Process shipping address result
      const shippingResult = results[0];
      if (shippingResult.status === 'fulfilled') {
        const shippingOrder = shippingResult.value;
        if (shippingOrder.__typename === 'Order') {
          finalOrder = shippingOrder as Order;
        } else {
          errors.push('Failed to set shipping address');
        }
      } else {
        errors.push(`Shipping address error: ${shippingResult.reason}`);
      }

      // Process billing address result (if applicable)
      let billingResultIndex = 1;
      if (billingAddress) {
        const billingResult = results[billingResultIndex];
        if (billingResult.status === 'fulfilled') {
          const billingOrder = billingResult.value;
          if (billingOrder.__typename === 'Order') {
            finalOrder = billingOrder as Order;
          } else {
            errors.push('Failed to set billing address');
          }
        } else {
          errors.push(`Billing address error: ${billingResult.reason}`);
        }
        billingResultIndex++;
      }

      // Process shipping methods result
      const shippingMethodsResult = results[billingResultIndex];
      if (shippingMethodsResult.status === 'fulfilled') {
        const methods = shippingMethodsResult.value;
        
        // Auto-select first available shipping method if any exist
        if (methods && methods.length > 0 && finalOrder) {
          try {
            const updatedOrder = await setOrderShippingMethodMutation([methods[0].id]);
            if (updatedOrder) {
              finalOrder = updatedOrder;
              shippingMethodsApplied = true;
            }
          } catch (shippingMethodError) {
            errors.push(`Failed to set shipping method: ${shippingMethodError}`);
          }
        } else if (!methods || methods.length === 0) {
          errors.push('No shipping methods available for your location');
        }
      } else {
        errors.push(`Shipping methods error: ${shippingMethodsResult.reason}`);
      }

      if (!finalOrder) {
        throw new Error('Failed to process checkout operations');
      }

      return {
        order: finalOrder,
        shippingMethodsApplied,
        errors
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
      throw new Error(`Parallel checkout processing failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Fallback to sequential processing if parallel processing fails
   */
  static async processAddressAndShippingSequential(
    shippingAddress: AddressInput,
    billingAddress?: BillingAddressInput,
    orderSubTotal: number = 0
  ): Promise<ParallelCheckoutResult> {
    const errors: string[] = [];
    let finalOrder: Order | null = null;
    let shippingMethodsApplied = false;

    try {
      // 1. Set shipping address first
      const shippingResult = await setOrderShippingAddressMutation(shippingAddress);
      if (shippingResult.__typename === 'Order') {
        finalOrder = shippingResult as Order;
      } else {
        throw new Error('Failed to set shipping address');
      }

      // 2. Set billing address if different
      if (billingAddress) {
        const billingResult = await setOrderBillingAddressMutation(billingAddress);
        if (billingResult.__typename === 'Order') {
          finalOrder = billingResult as Order;
        } else {
          errors.push('Failed to set billing address');
        }
      }

      // 3. Get and set shipping methods with caching
      const methods = await this.getShippingMethodsWithCache(
        shippingAddress.countryCode,
        shippingAddress.postalCode || '',
        orderSubTotal
      );

      if (methods && methods.length > 0) {
        const updatedOrder = await setOrderShippingMethodMutation([methods[0].id]);
        if (updatedOrder) {
          finalOrder = updatedOrder;
          shippingMethodsApplied = true;
        }
      } else {
        errors.push('No shipping methods available for your location');
      }

      if (!finalOrder) {
        throw new Error('Failed to process checkout operations sequentially');
      }

      return {
        order: finalOrder,
        shippingMethodsApplied,
        errors
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
      throw new Error(`Sequential checkout processing failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Main entry point that tries parallel processing first, falls back to sequential
   */
  static async optimizedCheckoutProcessing(
    shippingAddress: AddressInput,
    billingAddress?: BillingAddressInput,
    orderSubTotal: number = 0
  ): Promise<ParallelCheckoutResult> {
    try {
      // Try parallel processing first
      return await this.processAddressAndShippingParallel(
        shippingAddress,
        billingAddress,
        orderSubTotal
      );
    } catch (parallelError) {
      console.warn('Parallel processing failed, falling back to sequential:', parallelError);
      
      // Fallback to sequential processing
      return await this.processAddressAndShippingSequential(
        shippingAddress,
        billingAddress,
        orderSubTotal
      );
    }
  }
}