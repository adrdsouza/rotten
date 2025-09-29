import { component$, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { getEligibleShippingMethodsCached } from '~/providers/shop/checkout/checkout';
import { setOrderShippingMethodMutation } from '~/providers/shop/orders/order';
import { AppState, EligibleShippingMethods } from '~/types';
import { formatPrice } from '~/utils';
import CheckCircleIcon from '../icons/CheckCircleIcon';

type Props = {
	appState: AppState;
};

export default component$<Props>(({ appState }) => {
	const currencyCode = appState.activeOrder?.currencyCode || 'USD';
	const state = useStore<{ selectedMethodId: string; methods: EligibleShippingMethods[] }>({
		selectedMethodId: '',
		methods: [],
	});

	// Client-side only: Load shipping methods after component is visible
	useVisibleTask$(async () => {
		// Skip if no active order since we can't calculate shipping without an order
		if (!appState.activeOrder) {
			console.log('🛒 No active order: Skipping shipping methods query');
			return;
		}
		
		// Get the subtotal from the active order
		const subtotal = appState.activeOrder?.subTotalWithTax || 0;
		const countryCode = appState.shippingAddress.countryCode || 'US';
		
		state.methods = await getEligibleShippingMethodsCached(countryCode, subtotal);
		state.selectedMethodId = state.methods[0]?.id;
	});

	// Client-side only: Update shipping method when selection changes
	useVisibleTask$(async ({ track }) => {
		const selected = track(() => state.selectedMethodId);
		if (selected) {
			appState.activeOrder = await setOrderShippingMethodMutation([selected]);
		}
	});

	return (
		<div>
			<label class="text-lg font-medium text-gray-900">{`Delivery method`}</label>
			<div class="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
				{state.methods.map((method, index) => (
					<div
						key={method.id}
						class={`relative bg-white border rounded-lg shadow-xs p-4 flex cursor-pointer focus:outline-hidden`}
						onClick$={() => (state.selectedMethodId = state.methods[index].id)}
					>
						<span class="flex-1 flex">
							<span class="flex flex-col">
								<span class="block text-sm font-medium text-gray-900">{method.name}</span>
								<span class="mt-6 text-sm font-medium text-gray-900">
									{formatPrice(method.priceWithTax, currencyCode)}
								</span>
							</span>
						</span>
						{state.selectedMethodId === method.id && <CheckCircleIcon />}
						<span
							class={`border-2 ${
								state.selectedMethodId === method.id ? 'border-black' : ''
							} absolute -inset-px rounded-lg pointer-events-none`}
						></span>
					</div>
				))}
			</div>
		</div>
	);
});
