import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useStore,
  useVisibleTask$,
  useTask$,
  $,
  Slot
} from '@qwik.dev/core';
import { LocalCartService, type LocalCart, type StockValidationResult } from '~/services/LocalCartService';

// Applied coupon information for local cart mode
export interface AppliedCoupon {
  code: string;
  discountAmount: number;
  discountPercentage?: number;
  freeShipping: boolean;
  promotionName?: string;
  promotionDescription?: string;
}

// Cart Context Interface - Only store data, not functions
// We're ALWAYS in local cart mode until payment succeeds
export interface CartContextState {
  // Cart data
  localCart: LocalCart;

  // State flags
  isLoading: boolean;
  lastError: string | null;
  hasLoadedOnce: boolean; // Track if cart has been loaded from localStorage
  isRefreshingStock: boolean; // Track if stock refresh is in progress

  // Stock validation results
  lastStockValidation: Record<string, StockValidationResult>;

  // Applied coupon for local cart mode
  appliedCoupon: AppliedCoupon | null;

  // 🚀 OPTIMIZED: Track last stock refresh time to prevent excessive refreshes
  lastStockRefresh: number | null; // Timestamp of last stock refresh
}

// Create context for state only
export const CartContextId = createContextId<CartContextState>('cart-context');

// Context Provider Component
export const CartProvider = component$(() => {
  // Initialize cart state - always in local cart mode
  const cartState = useStore<CartContextState>({
    localCart: {
      items: [],
      totalQuantity: 0,
      subTotal: 0,
      currencyCode: 'USD'
    },
    isLoading: false,
    lastError: null,
    hasLoadedOnce: false,
    isRefreshingStock: false,
    lastStockValidation: {},
    appliedCoupon: null,
    // 🚀 OPTIMIZED: Initialize last stock refresh time
    lastStockRefresh: null
  });

  // 🚀 CRITICAL FIX: Load cart EAGERLY on mount using useTask$ for proper SSR/hydration
  // This runs during both SSR and client hydration, ensuring cart is always loaded
  useTask$(() => {
    // Only load from localStorage on client side (not during SSR)
    if (typeof window !== 'undefined' && !cartState.hasLoadedOnce) {
      try {
        console.log('🔍 [CART PROVIDER] Loading cart from localStorage on mount...');
        const cart = LocalCartService.getCart();
        cartState.localCart = cart;
        cartState.hasLoadedOnce = true;
        console.log('✅ [CART PROVIDER] Cart loaded on mount:', cart.items.length, 'items');
      } catch (error) {
        console.error('❌ [CART PROVIDER] Failed to load cart on mount:', error);
        cartState.lastError = 'Failed to load cart';
      }
    }
  });

  // 🔄 CROSS-TAB SYNC: Setup storage listeners for changes in other tabs
  useVisibleTask$(() => {
    LocalCartService.setupCrossTabSync();

    // Only reload from localStorage for CROSS-TAB changes
    // Same-tab mutations already update context directly
    const unsubscribe = LocalCartService.onCartUpdate(() => {
      const updatedCart = LocalCartService.getCart();
      if (updatedCart && typeof updatedCart === 'object') {
        cartState.localCart = {
          items: updatedCart.items || [],
          totalQuantity: updatedCart.totalQuantity || 0,
          subTotal: updatedCart.subTotal || 0,
          currencyCode: updatedCart.currencyCode || 'USD'
        };
        console.log('🔄 [CART PROVIDER] Cross-tab update - cart reloaded from localStorage');
      }
    });

    return unsubscribe;
  });

  // 🚀 OPTIMIZED: Removed computed values - cart totals calculated in LocalCartService

  // Provide context
  useContextProvider(CartContextId, cartState);

  return <Slot />;
});

// Hook to use cart context
export const useLocalCart = () => {
  return useContext(CartContextId);
};


// 🚀 NEW: Refresh stock levels when cart is opened
export const refreshCartStock = $(async (cartState: CartContextState) => {
  const refreshStartTime = performance.now();
  console.log('🚀 [STOCK TIMING] Starting stock refresh...');

  // Only refresh if we have items in cart
  if (!cartState.localCart.items.length) {
    console.log('⏭️ [STOCK TIMING] Skipping - no items in cart');
    return;
  }

  // Prevent duplicate refreshes - if already refreshing, skip
  if (cartState.isRefreshingStock) {
    console.log('⏭️ [STOCK TIMING] Skipping - already refreshing');
    return;
  }

  // 🚀 OPTIMIZED: Only refresh stock if it's been more than 5 minutes since last refresh
  const lastRefresh = cartState.lastStockRefresh || 0;
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes

  if (now - lastRefresh < FIVE_MINUTES) {
    console.log(`⏭️ [STOCK TIMING] Skipping - last refresh was ${((now - lastRefresh) / 1000).toFixed(0)}s ago (< 5min)`);
    return;
  }

  try {
    cartState.isLoading = true;
    cartState.isRefreshingStock = true;

    // Get fresh stock data for all cart items
    const apiCallStart = performance.now();
    const updatedCart = await LocalCartService.refreshAllStockLevels();
    console.log(`⏱️ [STOCK TIMING] API call: ${(performance.now() - apiCallStart).toFixed(2)}ms`);

    cartState.localCart = updatedCart;
    cartState.lastStockRefresh = now; // Record the refresh time

    console.log(`✅ [STOCK TIMING] TOTAL stock refresh: ${(performance.now() - refreshStartTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('❌ CartContext: Failed to refresh stock levels:', error);
    cartState.lastError = 'Failed to refresh stock levels';
  } finally {
    cartState.isLoading = false;
    cartState.isRefreshingStock = false;
  }
});

// Helper functions that can be called from components
export const addToLocalCart = $(async (cartState: CartContextState, item: any) => {
  const contextStartTime = performance.now();
  console.log('🚀 [CART CONTEXT TIMING] Starting addToLocalCart...');

  cartState.isLoading = true;
  cartState.lastError = null;

  try {
    // 🚀 OPTIMIZED: LocalCartService updates localStorage and returns new cart
    const serviceCallStart = performance.now();
    const result = LocalCartService.addItem(item);
    console.log(`⏱️ [CART CONTEXT TIMING] LocalCartService.addItem: ${(performance.now() - serviceCallStart).toFixed(2)}ms`);

    // ✅ INSTANT UX: Update context immediately (no localStorage read needed)
    const stateUpdateStart = performance.now();
    cartState.localCart = result.cart;
    cartState.lastStockValidation[item.productVariantId] = result.stockResult;

    if (!result.stockResult.success) {
      cartState.lastError = result.stockResult.error || 'Stock validation failed';
    }
    console.log(`⏱️ [CART CONTEXT TIMING] State updates: ${(performance.now() - stateUpdateStart).toFixed(2)}ms`);

    // 🔔 Notify other components (badge, etc) - they don't need to reload from localStorage
    const eventDispatchStart = performance.now();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { totalQuantity: result.cart.totalQuantity }
      }));
    }
    console.log(`⏱️ [CART CONTEXT TIMING] Event dispatch: ${(performance.now() - eventDispatchStart).toFixed(2)}ms`);
  } catch (error) {
    cartState.lastError = error instanceof Error ? error.message : 'Failed to add item to cart';
    console.error('❌ [CART CONTEXT TIMING] Error in addToLocalCart:', error);
  } finally {
    cartState.isLoading = false;
    console.log(`✅ [CART CONTEXT TIMING] TOTAL addToLocalCart: ${(performance.now() - contextStartTime).toFixed(2)}ms`);
  }
});

export const updateLocalCartQuantity = $(async (cartState: CartContextState, productVariantId: string, quantity: number) => {
  cartState.isLoading = true;
  cartState.lastError = null;

  try {
    const result = LocalCartService.updateItemQuantity(productVariantId, quantity);
    cartState.localCart = result.cart;
    cartState.lastStockValidation[productVariantId] = result.stockResult;

    if (!result.stockResult.success) {
      cartState.lastError = result.stockResult.error || 'Stock validation failed';
    }

    // 🚀 OPTIMIZED: Trigger header badge update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { totalQuantity: result.cart.totalQuantity }
      }));
    }
  } catch (error) {
    cartState.lastError = error instanceof Error ? error.message : 'Failed to update quantity';
  } finally {
    cartState.isLoading = false;
  }
});

export const removeFromLocalCart = $(async (cartState: CartContextState, productVariantId: string) => {
  try {
    cartState.localCart = LocalCartService.removeItem(productVariantId);
    // Clear validation for removed item
    delete cartState.lastStockValidation[productVariantId];
    cartState.lastError = null;

    // 🚀 OPTIMIZED: Trigger header badge update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { totalQuantity: cartState.localCart.totalQuantity }
      }));
    }
  } catch (error) {
    cartState.lastError = error instanceof Error ? error.message : 'Failed to remove item';
  }
});

export const convertLocalCartToVendureOrder = $(async (cartState: CartContextState) => {
  cartState.isLoading = true;
  cartState.lastError = null;
  
  try {
    // Validate stock before conversion
    const stockValidation = LocalCartService.validateStock();
    
    if (!stockValidation.valid) {
      cartState.lastError = `Stock validation failed: ${stockValidation.errors.join(', ')}`;
      return null;
    }
    
    // Extract coupon from cart state
    const appliedCoupon = cartState.appliedCoupon ? { code: cartState.appliedCoupon.code } : null;
    
    // Pass coupon to conversion method
    const order = await LocalCartService.convertToVendureOrder(appliedCoupon);
    
    if (order) {
      // Keep isLocalMode = true until payment succeeds
      // The address/shipping logic should work based on activeOrder existence, not isLocalMode
      // cartState.isLocalMode = false; // Don't switch until payment succeeds

      // Do NOT clear the local cart data here; keep it until payment completes.
      // This ensures payment cancellations do not wipe the cart data.
      cartState.lastStockValidation = {};
      // Clear applied coupon after successful conversion
      cartState.appliedCoupon = null;
    } else {
      cartState.lastError = 'Failed to create Vendure order';
    }
    
    return order;
  } catch (error) {
    cartState.lastError = error instanceof Error ? error.message : 'Checkout failed';
    return null;
  } finally {
    cartState.isLoading = false;
  }
});

export const clearLocalCart = $((cartState: CartContextState) => {
  try {
    cartState.localCart = LocalCartService.clearCart();
    cartState.lastStockValidation = {};
    cartState.appliedCoupon = null;
    cartState.lastError = null;

    // 🚀 OPTIMIZED: Trigger header badge update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { totalQuantity: 0 }
      }));
    }
  } catch (error) {
    cartState.lastError = error instanceof Error ? error.message : 'Failed to clear cart';
  }
});

// 🚨 REMOVED: No longer needed since we don't switch modes during payment
// The cart remains in local mode throughout the entire payment process
// and only switches to Vendure mode after successful payment confirmation
