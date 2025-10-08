import { $, component$, useContext, useSignal, useComputed$, useVisibleTask$ } from '@qwik.dev/core';
import { APP_STATE } from '~/constants';
import { validateLocalCartCouponQuery } from '~/providers/shop/orders/order';
import { formatPrice } from '~/utils';
import TrashIcon from '../icons/TrashIcon';
import Alert from '../alert/Alert';
import { useLocalCart } from '~/contexts/CartContext';

export default component$<{
	order?: any; // Order data for order confirmation
	readonly?: boolean;
	localCart?: any; // Local cart data for Local Cart Mode
}>(({ order, readonly = false, localCart }) => {
	const appState = useContext(APP_STATE);
	const localCartContext = useLocalCart();
	const couponCodeSignal = useSignal('');
	const errorSignal = useSignal('');

	// Use passed order prop if available, otherwise fall back to appState.activeOrder
	const activeOrder = useComputed$(() => order || appState.activeOrder);

	const activeCouponCode = useComputed$(() => {
		return localCartContext.appliedCoupon?.code;
	});

	const subtotal = useComputed$(() => {
		return localCart?.localCart?.subTotal || localCart?.subTotal || activeOrder.value?.subTotal || 0;
	});

	const orderTotalAfterDiscount = useComputed$(() => {
		let total = subtotal.value;
		if (localCartContext.appliedCoupon) {
			total -= localCartContext.appliedCoupon.discountAmount;
		}
		// Fallback to order calculation for confirmation pages
		if (total === 0 && activeOrder.value) {
			total = (activeOrder.value.totalWithTax || 0) - (activeOrder.value.shippingWithTax || 0);
		}
		return total;
	});

	// 🚀 Create a reactive signal that forces shipping recalculation when country changes
	const shippingTrigger = useSignal(0);

	useVisibleTask$(({ track }) => {
		track(() => appState.shippingAddress.countryCode);
		const countryCode = appState.shippingAddress.countryCode;
		const timestamp = new Date().toISOString().slice(11, 23);
		console.log(`🚢 [CartTotals] [${timestamp}] Country change detected: ${countryCode}, forcing shipping recalculation`);
		// Force shipping computed to recalculate by updating trigger signal
		shippingTrigger.value = shippingTrigger.value + 1;
	});

	const shipping = useComputed$(() => {
		// Track the trigger signal to ensure recalculation on country changes
		const trigger = shippingTrigger.value;
		const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
		const countryCode = appState.shippingAddress?.countryCode;
		console.log(`🚢 [CartTotals] [${timestamp}] Shipping computation triggered for country: ${countryCode || 'undefined'} (trigger: ${trigger})`);

		if (appState.shippingAddress && appState.shippingAddress.countryCode) {
			if (localCartContext.appliedCoupon?.freeShipping) {
				console.log(`🚢 [CartTotals] [${timestamp}] Shipping: Free shipping from coupon`);
				return 0;
			}

			const orderTotal = orderTotalAfterDiscount.value;
			console.log(`🚢 [CartTotals] [${timestamp}] Calculating shipping for country: ${countryCode}, orderTotal: ${orderTotal}`);

			if (countryCode === 'US' || countryCode === 'PR') {
				const shippingCost = orderTotal >= 10000 ? 0 : 800;
				console.log(`🚢 [CartTotals] [${timestamp}] US/PR shipping: ${shippingCost} (${orderTotal >= 10000 ? 'free over $100' : '$8 under $100'})`);
				return shippingCost;
			}
			console.log(`🚢 [CartTotals] [${timestamp}] International shipping: 2000 ($20)`);
			return 2000;
		}
		console.log(`🚢 [CartTotals] [${timestamp}] No country code, using fallback shipping`);
		// Fallback to active order shipping for confirmation pages
		return activeOrder.value?.shippingWithTax || 0;
	});

	const total = useComputed$(() => {
		const localTotal = orderTotalAfterDiscount.value + shipping.value;
		// Fallback to active order total for confirmation pages
		return localTotal || activeOrder.value?.totalWithTax || 0;
	});

	const displayDiscount = useComputed$(() => {
		if (localCartContext.appliedCoupon) {
			return localCartContext.appliedCoupon.discountAmount;
		}
		// Fallback to active order discount for confirmation pages
		if (activeOrder.value?.discounts && activeOrder.value.discounts.length > 0) {
			return activeOrder.value.discounts[0].amountWithTax || 0;
		}
		return 0;
	});

	const handleInput$ = $((_event: Event, element: HTMLInputElement) => {
		couponCodeSignal.value = element.value;
		errorSignal.value = '';
	});

	const applyCoupon$ = $(async () => {
		if (!couponCodeSignal.value) return;
		errorSignal.value = '';

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
				localCartContext.appliedCoupon = {
					code: result.appliedCouponCode || couponCodeSignal.value,
					discountAmount: result.discountAmount,
					discountPercentage: result.discountPercentage,
					freeShipping: result.freeShipping,
					promotionName: result.promotionName,
					promotionDescription: result.promotionDescription
				};
				couponCodeSignal.value = '';
				errorSignal.value = '';
			} else {
				errorSignal.value = result.validationErrors.join(', ');
			}
		} catch (error) {
			console.error('Error validating coupon:', error);
			errorSignal.value = 'Failed to validate coupon. Please try again.';
		}
	});

	const removeCoupon$ = $(async (_code: string) => {
		localCartContext.appliedCoupon = null;
		errorSignal.value = '';
	});

	useVisibleTask$(({ track }) => {
		track(() => errorSignal.value);
		if (errorSignal.value) {
			const timer = setTimeout(() => {
				errorSignal.value = '';
			}, 3000);
			return () => clearTimeout(timer);
		}
	});

	useVisibleTask$(async ({ track }) => {
		track(() => localCartContext.localCart.items);
		track(() => localCartContext.localCart.subTotal);

		// Always in local cart mode
		if (localCartContext.appliedCoupon) {
			try {
				const cartItems = localCartContext.localCart.items.map(item => ({
					productVariantId: item.productVariantId,
					quantity: item.quantity,
					unitPrice: item.productVariant.price
				}));

				const result = await validateLocalCartCouponQuery({
					couponCode: localCartContext.appliedCoupon.code,
					cartTotal: localCartContext.localCart.subTotal,
					cartItems,
					customerId: appState.customer?.id
				});

				if (result.isValid) {
					localCartContext.appliedCoupon = {
						code: result.appliedCouponCode || localCartContext.appliedCoupon.code,
						discountAmount: result.discountAmount,
						discountPercentage: result.discountPercentage,
						freeShipping: result.freeShipping,
						promotionName: result.promotionName,
						promotionDescription: result.promotionDescription
					};
				} else {
					errorSignal.value = result.validationErrors.join(', ');
					localCartContext.appliedCoupon = null;
				}
			} catch (error) {
				console.error('Error re-validating coupon:', error);
				errorSignal.value = 'Failed to re-validate coupon.';
				localCartContext.appliedCoupon = null;
			}
		}
	});

	return (
		<dl class="border-t mt-6 border-gray-200 py-6 space-y-4">
      <div class="flex items-center justify-between">
        <dt>{`Subtotal`}</dt>
        <dd class="font-medium text-gray-900">{formatPrice(subtotal.value, 'USD')}</dd>
      </div>

      <div class="flex items-center justify-between">
        <dt>{`Shipping fee`}</dt>
        <dd class="font-medium text-gray-900">{formatPrice(shipping.value, 'USD')}</dd>
      </div>

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
                    <TrashIcon forcedClass="h-4 w-4 text-red-500 hover:text-red-700" />
                  </button>
                </div>
                <dd class="font-medium text-green-600 whitespace-nowrap">
                  {displayDiscount.value > 0
                    ? '-' + formatPrice(displayDiscount.value, 'USD').substring(1)
                    : '-' + formatPrice(0, 'USD').substring(1)}
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
                    ? '-' + formatPrice(displayDiscount.value, 'USD').substring(1)
                    : '-' + formatPrice(0, 'USD').substring(1)}
                </dd>
              </div>
            )}
          </div>
          {errorSignal.value && (
            <div class="text-right mt-1">
             <Alert message={errorSignal.value} />
            </div>
          )}
        </div>
      )}
			<div class="flex items-center justify-between border-t border-gray-200 pt-6">
				<dt class="font-medium">{`Total`}</dt>
				<dd class="font-medium text-gray-900">{formatPrice(total.value, 'USD')}</dd>
			</div>
		</dl>
	);
});
