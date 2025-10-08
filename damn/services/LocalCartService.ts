// Import order mutations dynamically to avoid circular dependencies
import { Order } from '~/generated/graphql';

// LocalCart Interface - Cart stored in localStorage until checkout
export interface LocalCartItem {
  productVariantId: string;
  quantity: number;
  lastStockCheck?: number; // Timestamp of last stock validation
  productVariant: {
    id: string;
    name: string;
    price: number;
    stockLevel?: string;
    product: {
      id: string;
      name: string;
      slug: string;
    };
    options: {
      id: string;
      name: string;
      group: {
        name: string;
      };
    }[];
    featuredAsset?: {
      id: string;
      preview: string;
    } | null;
  };
}

export interface LocalCart {
  items: LocalCartItem[];
  totalQuantity: number;
  subTotal: number;
  currencyCode: string;
}

export interface StockValidationResult {
  success: boolean;
  availableStock: number;
  adjustedQuantity?: number;
  error?: string;
}

export interface ValidationErrors {
  valid: boolean;
  errors: string[];
}

// LocalCart Service
export class LocalCartService {
  private static readonly CART_KEY = 'vendure_local_cart';
  private static readonly STOCK_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // 🚀 OPTIMIZED: In-memory cache to reduce localStorage reads
  private static cartCache: LocalCart | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 1000; // 1 second cache

  // 🔄 CROSS-TAB SYNC: Storage event listeners and cart update callbacks
  private static cartUpdateCallbacks: Set<() => void> = new Set();
  private static isStorageListenerSetup = false;

  // Setup cross-tab synchronization
  static setupCrossTabSync(): void {
    if (typeof window === 'undefined' || this.isStorageListenerSetup) return;

    window.addEventListener('storage', (event) => {
      if (event.key === this.CART_KEY) {
        // Clear cache when cart changes in another tab
        this.clearCache();
        // Notify all registered callbacks
        this.cartUpdateCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in cart update callback:', error);
          }
        });
      }
    });

    this.isStorageListenerSetup = true;
  }

  // Register callback for cart updates (cross-tab sync)
  static onCartUpdate(callback: () => void): () => void {
    this.cartUpdateCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.cartUpdateCallbacks.delete(callback);
    };
  }

  // Trigger cart update callbacks (for same-tab updates)
  private static triggerCartUpdate(): void {
    this.cartUpdateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cart update callback:', error);
      }
    });
  }

  // 🚀 OPTIMIZED: Direct localStorage check for header badge (no context loading)
  static getCartQuantityFromStorage(): number {
    if (typeof window === 'undefined') return 0;

    try {
      const stored = localStorage.getItem(this.CART_KEY);
      if (stored) {
        const cart = JSON.parse(stored);
        return cart.totalQuantity || 0;
      }
    } catch (error) {
      console.error('Failed to read cart quantity from localStorage:', error);
    }

    return 0;
  }

  // 🚀 OPTIMIZED: Direct localStorage check for product page quantities (no context loading)
  static getItemQuantityFromStorage(productVariantId: string): number {
    if (typeof window === 'undefined') return 0;

    try {
      const stored = localStorage.getItem(this.CART_KEY);
      if (stored) {
        const cart = JSON.parse(stored);
        const item = cart.items?.find((item: LocalCartItem) => item.productVariantId === productVariantId);
        return item?.quantity || 0;
      }
    } catch (error) {
      console.error('Failed to read item quantity from localStorage:', error);
    }

    return 0;
  }

  // 🚀 OPTIMIZED: Direct localStorage check for multiple product variants (no context loading)
  static getItemQuantitiesFromStorage(productVariantIds: string[]): Record<string, number> {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(this.CART_KEY);
      if (stored) {
        const cart = JSON.parse(stored);
        const result: Record<string, number> = {};

        productVariantIds.forEach(variantId => {
          const item = cart.items?.find((item: LocalCartItem) => item.productVariantId === variantId);
          result[variantId] = item?.quantity || 0;
        });

        return result;
      }
    } catch (error) {
      console.error('Failed to read item quantities from localStorage:', error);
    }

    // Return empty quantities for all variants
    const result: Record<string, number> = {};
    productVariantIds.forEach(variantId => {
      result[variantId] = 0;
    });
    return result;
  }

  // 🚀 OPTIMIZED: Clear cache when cart is modified
  private static clearCache(): void {
    this.cartCache = null;
    this.cacheTimestamp = 0;
  }

  // Generate a hash of cart contents for deduplication
  private static generateCartHash(cart: LocalCart): string {
    const cartString = cart.items
      .map(item => `${item.productVariantId}:${item.quantity}`)
      .sort()
      .join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < cartString.length; i++) {
      const char = cartString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Get cart from localStorage with in-memory caching
  static getCart(): LocalCart {
    if (typeof window === 'undefined') {
      return {
        items: [],
        totalQuantity: 0,
        subTotal: 0,
        currencyCode: 'USD'
      };
    }

    // 🚀 OPTIMIZED: Check in-memory cache first
    const now = Date.now();
    if (this.cartCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cartCache;
    }

    try {
      const stored = localStorage.getItem(this.CART_KEY);
      if (stored) {
        const cart = JSON.parse(stored);
        // Update cache
        this.cartCache = cart;
        this.cacheTimestamp = now;
        return cart;
      }
    } catch (error) {
      console.error('Failed to parse cart from localStorage:', error);
    }

    const emptyCart = {
      items: [],
      totalQuantity: 0,
      subTotal: 0,
      currencyCode: 'USD'
    };

    // Cache empty cart too
    this.cartCache = emptyCart;
    this.cacheTimestamp = now;
    return emptyCart;
  }

  // Save cart to localStorage and update cache
  static saveCart(cart: LocalCart): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
        // 🚀 OPTIMIZED: Update cache when saving
        this.cartCache = cart;
        this.cacheTimestamp = Date.now();
        // 🔄 CROSS-TAB SYNC: Trigger cart update callbacks for same-tab updates
        this.triggerCartUpdate();
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
        this.clearCache(); // Clear cache on error
      }
    }
  }

  // Validate stock level for a product variant using stored data
  static validateStockLevel(item: LocalCartItem, requestedQuantity: number): StockValidationResult {
    try {
      // Use stock level from cached product variant data
      const availableStock = parseInt(item.productVariant.stockLevel || '0');
      
      if (requestedQuantity <= availableStock) {
        return {
          success: true,
          availableStock
        };
      } else {
        return {
          success: false,
          availableStock,
          adjustedQuantity: Math.max(0, availableStock),
          error: `Only ${availableStock} items available`
        };
      }
    } catch (error) {
      console.error('Stock validation failed:', error);
      return {
        success: false,
        availableStock: 0,
        adjustedQuantity: 0,
        error: 'Stock validation failed'
      };
    }
  }

  // Add item to cart with stock validation - FAIL FAST on stock errors
  static addItem(item: LocalCartItem): { cart: LocalCart; stockResult: StockValidationResult } {
    const cart = this.getCart();
    const existingIndex = cart.items.findIndex(i => i.productVariantId === item.productVariantId);
    
    const newQuantity = existingIndex >= 0 
      ? cart.items[existingIndex].quantity + item.quantity
      : item.quantity;
    
    // Validate stock before adding
    const stockResult = this.validateStockLevel(item, newQuantity);
    
    // 🚫 FAIL FAST: Don't add/update if stock validation fails
    if (!stockResult.success) {
      return { cart, stockResult };
    }
    
    if (existingIndex >= 0) {
      // Update existing item with requested quantity (no silent adjustments)
      cart.items[existingIndex].quantity = newQuantity;
      cart.items[existingIndex].lastStockCheck = Date.now();
      // Update stock level info
      cart.items[existingIndex].productVariant.stockLevel = stockResult.availableStock.toString();
    } else {
      // Add new item with requested quantity (no silent adjustments)
      item.quantity = newQuantity;
      item.lastStockCheck = Date.now();
      item.productVariant.stockLevel = stockResult.availableStock.toString();
      cart.items.push(item);
    }
    
    this.recalculateTotals(cart);
    this.saveCart(cart);
    return { cart, stockResult };
  }

  // Update item quantity with stock validation - FAIL FAST on stock errors
  static updateItemQuantity(productVariantId: string, quantity: number): { cart: LocalCart; stockResult: StockValidationResult } {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(item => item.productVariantId === productVariantId);
    
    if (itemIndex === -1) {
      // Item not found, return current cart
      return { 
        cart, 
        stockResult: { success: true, availableStock: 0 }
      };
    }
    
    // Validate stock before updating
    const stockResult = this.validateStockLevel(cart.items[itemIndex], quantity);
    
    // 🚫 FAIL FAST: Don't update if stock validation fails
    if (!stockResult.success) {
      return { cart, stockResult };
    }
    
    // Update with requested quantity (no silent adjustments)
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].lastStockCheck = Date.now();
    cart.items[itemIndex].productVariant.stockLevel = stockResult.availableStock.toString();
    
    this.recalculateTotals(cart);
    this.saveCart(cart);
    return { cart, stockResult };
  }

  // Remove item from cart
  static removeItem(productVariantId: string): LocalCart {
    const cart = this.getCart();
    cart.items = cart.items.filter(item => item.productVariantId !== productVariantId);
    this.recalculateTotals(cart);
    this.saveCart(cart);
    return cart;
  }

  // Check if stock validation is needed (based on cache time)
  static isStockCheckNeeded(item: LocalCartItem): boolean {
    if (!item.lastStockCheck) return true;
    return Date.now() - item.lastStockCheck > this.STOCK_CACHE_DURATION;
  }

  // 🚀 OPTIMIZED: Refresh stock levels using lightweight stock-only queries for better performance
  static async refreshAllStockLevels(): Promise<LocalCart> {
    const cart = this.getCart();

    if (!cart.items.length) {
      return cart;
    }

    try {
      // Import GraphQL function dynamically to avoid circular dependencies
      const { getProductStockLevelsOnly } = await import('~/providers/shop/products/products');

      // Get unique product slugs from cart items
      const productSlugs = [...new Set(cart.items.map(item => item.productVariant.product.slug))];

      console.log(`🚀 Refreshing stock for ${productSlugs.length} unique products using lightweight stock queries`);

      // Fetch only stock levels for all products (much faster, smaller payload)
      const stockResults = await Promise.all(
        productSlugs.map(async (slug) => {
          try {
            const stockData = await getProductStockLevelsOnly(slug);
            return { slug, data: stockData?.product, error: null };
          } catch (error) {
            console.error(`❌ Failed to fetch stock levels for ${slug}:`, error);
            return { slug, data: null, error };
          }
        })
      );

      // Update stock levels for all items
      let updatedItemCount = 0;
      cart.items.forEach((item) => {
        const stockResult = stockResults.find(result => result.slug === item.productVariant.product.slug);
        if (stockResult?.data?.variants) {
          const variant = stockResult.data.variants.find((v: { id: string; stockLevel?: string }) => v.id === item.productVariantId);
          if (variant) {
            // Update with fresh stock level
            const freshStockLevel = parseInt(variant.stockLevel || '0');
            item.productVariant.stockLevel = freshStockLevel.toString();
            item.lastStockCheck = Date.now();
            updatedItemCount++;
          } else {
            // Variant not found, so it's unavailable
            item.productVariant.stockLevel = '0';
            item.lastStockCheck = Date.now();
          }
        } else if (stockResult?.error) {
          // Error fetching stock, mark as unavailable
          item.productVariant.stockLevel = '0';
          item.lastStockCheck = Date.now();
        }
        // If no data and no error, keep existing stock level
      });

      console.log(`✅ Stock refreshed for ${updatedItemCount}/${cart.items.length} cart items using lightweight queries`);

      // Note: Items with zero stock are kept in cart for user visibility
      // The UI should display warnings for out-of-stock items

      this.recalculateTotals(cart);
      this.saveCart(cart);
      return cart;
    } catch (error) {
      console.error('❌ LocalCartService: Failed to refresh stock levels:', error);
      throw error;
    }
  }

  // Fallback: Refresh stock levels using cached data (old method)
  static refreshAllStockLevelsLocal(): LocalCart {
    const cart = this.getCart();
    cart.items.forEach((item) => {
      if (this.isStockCheckNeeded(item)) {
        const stockResult = this.validateStockLevel(item, item.quantity);

        // Update stock info only (no silent quantity adjustments)
        item.productVariant.stockLevel = stockResult.availableStock.toString();
        item.lastStockCheck = Date.now();

        // 🚫 NO SILENT ADJUSTMENTS: Let UI handle stock validation errors
      }
    });

    this.recalculateTotals(cart);
    this.saveCart(cart);
    return cart;
  }

  // Validate all cart items for checkout
  static validateStock(): ValidationErrors {
    const cart = this.getCart();
    const errors: string[] = [];
    
    for (const item of cart.items) {
      const stockLevel = parseInt(item.productVariant.stockLevel || '0');
      if (stockLevel <= 0) {
        errors.push(
          `${item.productVariant.name}: Out of stock. Please remove from cart.`
        );
      } else if (item.quantity > stockLevel) {
        errors.push(
          `${item.productVariant.name}: Only ${stockLevel} available (you have ${item.quantity})`
        );
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Clear cart
  static clearCart(): LocalCart {
    const emptyCart: LocalCart = {
      items: [],
      totalQuantity: 0,
      subTotal: 0,
      currencyCode: 'USD'
    };
    this.saveCart(emptyCart);
    return emptyCart;
  }

  // Clear cart after successful payment (alias for clearCart)
  static clearCartAfterSuccessfulPayment(): LocalCart {
    return this.clearCart();
  }

  // Recalculate cart totals
  static recalculateTotals(cart: LocalCart): void {
    cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.subTotal = cart.items.reduce((total, item) => {
      return total + (item.productVariant.price * item.quantity);
    }, 0);
  }

  // Convert local cart to Vendure order
  static async convertToVendureOrder(appliedCoupon?: { code: string } | null): Promise<Order | null> {
    // Generate unique conversion ID to prevent duplicate processing
    const conversionId = `conversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // console.log(`Starting cart to order conversion process... [${conversionId}]`);

    // Enhanced deduplication: Check if conversion is already in progress
    const inProgressKey = 'cart_conversion_in_progress';
    const existingConversion = localStorage.getItem(inProgressKey);

    if (existingConversion) {
      // Check if the lock is stale (older than 5 minutes)
      const lockData = JSON.parse(existingConversion);
      const lockAge = Date.now() - lockData.timestamp;
      const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

      if (lockAge < LOCK_TIMEOUT) {
        throw new Error('Order creation already in progress. Please wait.');
      } else {
        // Clear stale lock and continue
        localStorage.removeItem(inProgressKey);
      }
    }

    // Set conversion lock with timestamp for stale detection
    const lockData = {
      conversionId,
      timestamp: Date.now(),
      cartHash: this.generateCartHash(this.getCart())
    };
    localStorage.setItem(inProgressKey, JSON.stringify(lockData));

    try {
      const cart = this.getCart();
      // console.log(`Cart state before conversion [${conversionId}]:`, JSON.stringify(cart, null, 2));
      if (cart.items.length === 0) {
        // console.log('Conversion skipped: cart is empty.');
        return null;
      }

      const validation = this.validateStock();
      if (!validation.valid) {
        throw new Error(`Some items in your cart are out of stock: ${validation.errors.join(', ')}`);
      }

      // Dynamically import to avoid circular dependencies
      const { addItemsToOrderMutation, addItemToOrderMutation, applyCouponCodeMutation, getActiveOrderQuery, removeOrderLineMutation } = await import('~/providers/shop/orders/order');
      let order: Order | null = null;

      // CRITICAL FIX: Check for existing order and clear its items to prevent accumulation
      try {
        const existingOrder = await getActiveOrderQuery();
        if (existingOrder && existingOrder.lines && existingOrder.lines.length > 0) {
          console.log(`[${conversionId}] Found existing order with ${existingOrder.lines.length} items. Clearing to prevent accumulation.`);
          
          // Remove all existing order lines to prevent item accumulation
          for (const line of existingOrder.lines) {
            try {
              await removeOrderLineMutation(line.id);
              console.log(`[${conversionId}] Removed existing order line: ${line.id}`);
            } catch (removeError) {
              console.warn(`[${conversionId}] Failed to remove order line ${line.id}:`, removeError);
              // Continue with other lines even if one fails
            }
          }
          
          // Get the updated order after clearing
          order = await getActiveOrderQuery();
          console.log(`[${conversionId}] Order cleared. Remaining lines: ${order?.lines?.length || 0}`);
        }
      } catch (clearError) {
        console.warn(`[${conversionId}] Failed to clear existing order items:`, clearError);
        // Continue with conversion even if clearing fails
      }

      // Prepare batch input for all items
      const batchInput = cart.items.map(item => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity
      }));

      try {
        // console.log(`Adding ${batchInput.length} items in batch [${conversionId}]:`, batchInput);
        const batchResult = await addItemsToOrderMutation(batchInput);

        if (batchResult && '__typename' in batchResult && batchResult.__typename === 'UpdateMultipleOrderItemsResult') {
          if (batchResult.order) {
            order = batchResult.order as Order;
            // console.log(`Successfully added ${batchInput.length} items in batch [${conversionId}]. Order now has ${order.lines?.length || 0} lines`);
          } else if (batchResult.errorResults && batchResult.errorResults.length > 0) {
             // Handle specific batch errors
             const errorMessages = batchResult.errorResults.map((error: any) => {
               if (error.__typename === 'InsufficientStockError') {
                 return `Insufficient stock for item (${error.quantityAvailable} available)`;
               } else if (error.__typename === 'NegativeQuantityError') {
                 return 'Invalid quantity specified';
               } else if (error.__typename === 'OrderLimitError') {
                 return 'Order limit exceeded';
               } else if (error.__typename === 'OrderInterceptorError') {
                 return error.errorCode || 'Order processing error';
               }
               return 'Unknown error occurred';
             });
             throw new Error(`Batch operation failed: ${errorMessages.join(', ')}`);
           } else {
            throw new Error('Batch operation returned no order or errors');
          }
        } else {
          throw new Error('Invalid batch operation response');
        }
      } catch (batchError) {
        console.warn(`Batch operation failed [${conversionId}], falling back to sequential processing:`, batchError);
        
        // Fallback to sequential processing
        let successfulItems = 0;
        for (const item of cart.items) {
          try {
            // console.log(`Adding item sequentially [${conversionId}]: ${item.productVariantId} x${item.quantity}`);
            const result = await addItemToOrderMutation(item.productVariantId, item.quantity);

            if (result && '__typename' in result && result.__typename === 'Order') {
              order = result as Order;
              successfulItems++;
              // console.log(`Successfully added item ${item.productVariantId} [${conversionId}]. Order now has ${order.lines?.length || 0} lines`);
            } else {
              console.error(`Failed to add item ${item.productVariantId} [${conversionId}], received:`, result);
              throw new Error(`Failed to add ${item.productVariant.name} to order`);
            }
          } catch (itemError) {
            console.error(`Error adding item ${item.productVariantId} [${conversionId}]:`, itemError);
            throw itemError; // Don't continue if any item fails - this prevents partial orders
          }
        }

        // Verify all items were added successfully in fallback mode
        if (successfulItems !== cart.items.length) {
          throw new Error(`Only ${successfulItems} of ${cart.items.length} items were added to the order`);
        }
      }

      // Apply coupon after all items are added
      if (order && appliedCoupon?.code) {
        try {
          const couponResult = await applyCouponCodeMutation(appliedCoupon.code);
          if (couponResult && '__typename' in couponResult && couponResult.__typename === 'Order') {
            order = couponResult as Order;
            // console.log(`Successfully applied coupon ${appliedCoupon.code} [${conversionId}]`);
          }
        } catch (couponError) {
          console.error(`Error applying coupon ${appliedCoupon.code} [${conversionId}]:`, couponError);
          // Don't fail the entire order for coupon errors
        }
      }

      // DO NOT clear local cart here - keep it until payment is confirmed
      // This ensures users can retry payment if it fails without losing their cart
      if (order) {
        // console.log(`Order created successfully [${conversionId}] with ${order.lines?.length || 0} items`);
        // Cart will be cleared after successful payment confirmation in StripePayment component
      } else {
        throw new Error('Failed to create order with items');
      }

      return order;
    } catch (error) {
      console.error(`Failed to convert cart to Vendure order [${conversionId}]:`, error);
      throw error;
    } finally {
      // Always clear the conversion lock
      localStorage.removeItem(inProgressKey);
    }
  }
}
