import { $, component$, useContext, useSignal, useComputed$, useTask$ } from '@qwik.dev/core';
import { Order } from '~/generated/graphql'; // Removed unused AdjustmentType
import CartPrice from './CartPrice';
import { APP_STATE } from '~/constants';
import { applyCouponCodeMutation, removeCouponCodeMutation, validateLocalCartCouponQuery } from '~/providers/shop/orders/order';
import { formatPrice } from '~/utils';
import TrashIcon from '../icons/TrashIcon';
import Alert from '../alert/Alert';
import { useLocalCart } from '~/contexts/CartContext';

export default component$<{
	order?: Order; // order prop might become redundant if we solely rely on appState.activeOrder
	readonly?: boolean;
	localCart?: any; // Local cart data for Local Cart Mode
}>(({ order, readonly = false, localCart }) => {
	const appState = useContext(APP_STATE);
	const localCartContext = useLocalCart();
	const couponCodeSignal = useSignal('');
	const errorSignal = useSignal('');

	// Use passed order prop if available, otherwise fall back to appState.activeOrder
	const activeOrder = useComputed$(() => order || appState.activeOrder);

	// Determine if we should use local cart data (must be defined before other computed values that use it)
	const shouldUseLocalCartData = useComputed$(() => {
		const shouldUseLocal = localCart && (localCart.isLocalMode === true || (localCart.localCart && localCart.localCart.items));
		// console.log('CartTotals: Should use local cart?', shouldUseLocal, 'Local Cart Mode:', localCart?.isLocalMode, 'Local Cart Available:', !!localCart, 'Local Cart Structure:', localCart);
		return shouldUseLocal;
	});

	const activeCouponCode = useComputed$(() => {
		// In local cart mode, use the applied coupon from local cart context
		if (shouldUseLocalCartData.value && localCartContext.appliedCoupon) {
			return localCartContext.appliedCoupon.code;
		}
		// Otherwise use the active order coupon
		return activeOrder.value?.couponCodes?.[0];
	});
	const subtotal = useComputed$(() => {
		const sub = shouldUseLocalCartData.value ? (localCart.localCart?.subTotal || localCart.subTotal || 0) : activeOrder.value?.subTotalWithTax || 0;
		// console.log('CartTotals: Subtotal calculated as', sub, 'Using local cart:', shouldUseLocalCartData.value, 'Local Cart Data:', localCart?.localCart || localCart);
		return sub;
	});
	const shipping = useComputed$(() => {
		if (shouldUseLocalCartData.value && appState.shippingAddress && appState.shippingAddress.countryCode) {
			// Check if coupon provides free shipping
			if (localCartContext.appliedCoupon?.freeShipping) {
				return 0;
			}

			const countryCode = appState.shippingAddress.countryCode;
			const subTotal = localCart.localCart?.subTotal || localCart.subTotal || 0;
			if (countryCode === 'US' || countryCode === 'PR') {
				const ship = subTotal >= 10000 ? 0 : 800; // Free shipping over $100, otherwise $8
				// console.log('CartTotals: Shipping calculated for US/PR as', ship, 'Subtotal:', subTotal, 'Country:', countryCode);
				return ship;
			}
			// console.log('CartTotals: Shipping calculated for International as 2000, Country:', countryCode);
			return 2000; // International shipping $20
		}
		const ship = activeOrder.value?.shippingWithTax || 0;
		// console.log('CartTotals: Shipping from active order as', ship);
		return ship;
	});
	const total = useComputed$(() => {
		let tot = shouldUseLocalCartData.value ? subtotal.value + shipping.value : activeOrder.value?.totalWithTax || 0;

		// Apply discount if a coupon is active
		if (shouldUseLocalCartData.value) {
			// In local cart mode, use the applied coupon discount
			if (localCartContext.appliedCoupon) {
				tot -= localCartContext.appliedCoupon.discountAmount;
				// console.log('CartTotals: Local coupon discount applied:', localCartContext.appliedCoupon.discountAmount);
			}
		} else {
			// In server mode, use the active order discount
			if (activeOrder.value?.discounts && activeOrder.value.discounts.length > 0) {
				const discount = activeOrder.value.discounts[0].amountWithTax || 0;
				tot -= discount;
				// console.log('CartTotals: Server discount applied:', discount);
			}
		}

		// console.log('CartTotals: Total calculated as', tot, 'Using local cart:', shouldUseLocalCartData.value, 'Subtotal:', subtotal.value, 'Shipping:', shipping.value);
		return tot;
	});

	// Ensure coupon display updates even in Local Cart Mode
	const displayDiscount = useComputed$(() => {
		// In local cart mode, use the applied coupon discount
		if (shouldUseLocalCartData.value && localCartContext.appliedCoupon) {
			return localCartContext.appliedCoupon.discountAmount;
		}
		// Otherwise use the active order discount
		if (activeOrder.value?.discounts && activeOrder.value.discounts.length > 0) {
			const discount = activeOrder.value.discounts[0].amountWithTax || 0;
			return discount;
		}
		return 0;
	});

	const handleInput$ = $((_event: Event, element: HTMLInputElement) => { // Changed event type to general Event as event arg is not used
		couponCodeSignal.value = element.value;
		errorSignal.value = '';
	});

	const applyCoupon$ = $(async () => {
		if (!couponCodeSignal.value) return;
		errorSignal.value = '';

		// Use local cart coupon validation in local cart mode
		if (localCartContext.isLocalMode) {
			try {
				const cartItems = localCartContext.localCart.items.map(item => ({
					productVariantId: item.productVariantId,
					quantity: item.quantity,
					unitPrice: item.productVariant.price
				}));

				const result = await validateLocalCartCouponQuery({
					couponCode: couponCodeSignal.value,
					cartTotal: localCartContext.localCart.subTotal,
					cartItems,
					customerId: appState.customer?.id
				});

				if (result.isValid) {
					// Store coupon validation result for display
					localCartContext.appliedCoupon = {
						code: result.appliedCouponCode || couponCodeSignal.value,
						discountAmount: result.discountAmount,
						discountPercentage: result.discountPercentage,
						freeShipping: result.freeShipping,
						promotionName: result.promotionName,
						promotionDescription: result.promotionDescription
					};
					couponCodeSignal.value = ''; // Clear input after successful validation
					errorSignal.value = '';
				} else {
					errorSignal.value = result.validationErrors.join(', ');
				}
			} catch (error) {
				console.error('Error validating coupon:', error);
				errorSignal.value = 'Failed to validate coupon. Please try again.';
			}
			return;
		}

		const res = await applyCouponCodeMutation(couponCodeSignal.value);
		if (res.__typename === 'Order') {
			appState.activeOrder = res as Order;
			couponCodeSignal.value = ''; // Clear input after successful application
		} else {
			errorSignal.value = res.message;
		}
	});

	const removeCoupon$ = $(async (code: string) => {
		// Handle coupon removal in local cart mode
		if (localCartContext.isLocalMode) {
			localCartContext.appliedCoupon = null;
			errorSignal.value = '';
			return;
		}

		const res = await removeCouponCodeMutation(code);
		if (res && res.__typename === 'Order') {
			appState.activeOrder = res as Order;
			errorSignal.value = '';
		}
	});

	// Clear error message after a delay
	useTask$(({ track }) => {
		track(() => errorSignal.value);
		if (errorSignal.value) {
			const timer = setTimeout(() => {
				errorSignal.value = '';
			}, 3000);
			return () => clearTimeout(timer);
		}
	});

	return (
		<dl class="border-t mt-6 border-gray-200 py-6 space-y-4"> {/* Reduced space-y for tighter layout if needed */}
      {/* Subtotal */}
      <div class="flex items-center justify-between">
        <dt>{`Subtotal`}</dt>
        {shouldUseLocalCartData.value ? (
          <dd class="font-medium text-gray-900">{formatPrice(subtotal.value, localCart.currencyCode || 'USD')}</dd>
        ) : (
          <CartPrice
            order={activeOrder.value}
            field={'subTotalWithTax'}
            forcedClass="font-medium text-gray-900"
          />
        )}
      </div>

      {/* Shipping Fee */}
      <div class="flex items-center justify-between">
        <dt>{`Shipping fee`}</dt>
        {shouldUseLocalCartData.value ? (
          <dd class="font-medium text-gray-900">{formatPrice(shipping.value, localCart.currencyCode || 'USD')}</dd>
        ) : (
          <CartPrice
            order={activeOrder.value}
            field={'shippingWithTax'}
            forcedClass="font-medium text-gray-900"
          />
        )}
      </div>

      {/* Coupon Section - New Implementation */}
      {!readonly && (
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            {activeCouponCode.value ? (
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center">
                  <span>{activeCouponCode.value}</span>
                  <button
                    onClick$={() => removeCoupon$(activeCouponCode.value!)}
                    title={`Remove coupon`}
                    class="p-1 ml-2"
                  >
                    <TrashIcon class="h-4 w-4 text-red-500 hover:text-red-700" />
                  </button>
                </div>
                <dd class="font-medium text-green-600 whitespace-nowrap">
                  {displayDiscount.value > 0
                    ? '-' + formatPrice(displayDiscount.value, shouldUseLocalCartData.value ? localCart.currencyCode || 'USD' : activeOrder.value?.currencyCode || 'USD').substring(1)
                    : '-' + formatPrice(0, shouldUseLocalCartData.value ? localCart.currencyCode || 'USD' : activeOrder.value?.currencyCode || 'USD').substring(1)}
                </dd>
              </div>
            ) : (
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`Enter coupon`}
                    value={couponCodeSignal.value}
                    onInput$={handleInput$}
                    onKeyDown$={async (event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (couponCodeSignal.value.length > 0) {
                          await applyCoupon$();
                        }
                      }
                    }}
                    class="w-40 py-1 px-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-hidden"
                  />
                  <button 
                    onClick$={applyCoupon$}
                    class="btn-primary px-3 py-1 rounded-sm"
                    disabled={couponCodeSignal.value.length === 0}
                  >
                    {`Apply`}
                  </button>
                </div>
                <dd class="font-medium text-primary-600 whitespace-nowrap">
                  {displayDiscount.value > 0
                    ? '-' + formatPrice(displayDiscount.value, shouldUseLocalCartData.value ? localCart.currencyCode || 'USD' : activeOrder.value?.currencyCode || 'USD').substring(1)
                    : '-' + formatPrice(0, shouldUseLocalCartData.value ? localCart.currencyCode || 'USD' : activeOrder.value?.currencyCode || 'USD').substring(1)}
                </dd>
              </div>
            )}
          </div>
          {/* Error Message Area (Alert component) */}
          {errorSignal.value && (
            <div class="text-right mt-1">
             <Alert message={errorSignal.value} />
            </div>
          )}
        </div>
      )}
      {/* Total */}
			<div class="flex items-center justify-between border-t border-gray-200 pt-6">
				<dt class="font-medium">{`Total`}</dt>
				{shouldUseLocalCartData.value ? (
					<dd class="font-medium text-gray-900">{formatPrice(total.value, localCart.currencyCode || 'USD')}</dd>
				) : (
					<CartPrice
						order={activeOrder.value}
						field={'totalWithTax'}
						forcedClass="font-medium text-gray-900"
					/>
				)}
			</div>
		</dl>
	);
});
