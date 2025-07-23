import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useStore,
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
export interface CartContextState {
  // Cart data
  localCart: LocalCart;

  // State flags
  isLocalMode: boolean;
  isLoading: boolean;
  lastError: string | null;
  hasLoadedOnce: boolean; // Track if cart has been loaded from localStorage

  // Stock validation results
  lastStockValidation: Record<string, StockValidationResult>;

  // Applied coupon for local cart mode
  appliedCoupon: AppliedCoupon | null;
}

// Create context for state only
export const CartContextId = createContextId<CartContextState>('cart-context');

// Context Provider Component
export const CartProvider = component$(() => {
  // Initialize cart state
  const cartState = useStore<CartContextState>({
    localCart: {
      items: [],
      totalQuantity: 0,
      subTotal: 0,
      currencyCode: 'USD'
    },
    isLocalMode: true,
    isLoading: false,
    lastError: null,
    hasLoadedOnce: false,
    lastStockValidation: {},
    appliedCoupon: null
  });

  // 🚀 OPTIMIZED: Removed computed values - cart totals calculated in LocalCartService

  // 🚀 OPTIMIZED: Removed useVisibleTask$ - cart now loads on-demand

  // Provide context
  useContextProvider(CartContextId, cartState);

  return <Slot />;
});

// Hook to use cart context
export const useLocalCart = () => {
  return useContext(CartContextId);
};

// 🚀 OPTIMIZED: Load cart on-demand when needed
export const loadCartIfNeeded = $((cartState: CartContextState) => {
  if (!cartState.hasLoadedOnce) {
    try {
      cartState.localCart = LocalCartService.getCart();
      cartState.hasLoadedOnce = true;
      // console.log('✅ CartContext: Cart loaded on-demand');
    } catch (error) {
      console.error('❌ CartContext: Failed to load cart on-demand:', error);
      cartState.lastError = 'Failed to load cart';
    }
  }
});

// 🚀 NEW: Refresh stock levels when cart is opened
export const refreshCartStock = $(async (cartState: CartContextState) => {
  // Only refresh if we have items in cart
  if (!cartState.localCart.items.length) return;

  try {
    cartState.isLoading = true;

    // Get fresh stock data for all cart items
    const updatedCart = await LocalCartService.refreshAllStockLevels();
    cartState.localCart = updatedCart;

    // console.log('✅ CartContext: Stock levels refreshed');
  } catch (error) {
    console.error('❌ CartContext: Failed to refresh stock levels:', error);
    cartState.lastError = 'Failed to refresh stock levels';
  } finally {
    cartState.isLoading = false;
  }
});

// Helper functions that can be called from components
export const addToLocalCart = $((cartState: CartContextState, item: any) => {
  // 🚀 DEMAND-BASED: Load cart only when add to cart is clicked
  loadCartIfNeeded(cartState);

  cartState.isLoading = true;
  cartState.lastError = null;

  try {
    const result = LocalCartService.addItem(item);
    cartState.localCart = result.cart;
    cartState.lastStockValidation[item.productVariantId] = result.stockResult;

    if (!result.stockResult.success) {
      cartState.lastError = result.stockResult.error || 'Stock validation failed';
    }

    // 🚀 OPTIMIZED: Trigger header badge update via custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { totalQuantity: result.cart.totalQuantity }
      }));
    }
  } catch (error) {
    cartState.lastError = error instanceof Error ? error.message : 'Failed to add item to cart';
  } finally {
    cartState.isLoading = false;
  }
});

export const updateLocalCartQuantity = $((cartState: CartContextState, productVariantId: string, quantity: number) => {
  // Load cart if not already loaded
  loadCartIfNeeded(cartState);

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

export const removeFromLocalCart = $((cartState: CartContextState, productVariantId: string) => {
  // Load cart if not already loaded
  loadCartIfNeeded(cartState);

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
    
    const order = await LocalCartService.convertToVendureOrder();
    
    if (order) {
      // Switch to Vendure mode after successful conversion
      cartState.isLocalMode = false;
      cartState.localCart = LocalCartService.clearCart();
      cartState.lastStockValidation = {};
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
