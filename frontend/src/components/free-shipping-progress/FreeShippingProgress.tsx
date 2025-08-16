import { component$, useComputed$ } from '@qwik.dev/core';
import { formatPrice } from '~/utils';

type Props = {
	countryCode?: string;
	subTotal: number;
	currencyCode: string;
};

const FREE_SHIPPING_THRESHOLD = 10000; // $100.00 in cents
const ELIGIBLE_COUNTRIES = ['US', 'PR']; // US and Puerto Rico

export default component$<Props>(({ countryCode, subTotal, currencyCode }) => {
	const isEligibleCountry = useComputed$(() => {
		return countryCode ? ELIGIBLE_COUNTRIES.includes(countryCode) : false;
	});

	const remainingAmount = useComputed$(() => {
		return Math.max(0, FREE_SHIPPING_THRESHOLD - subTotal);
	});

	const progressPercentage = useComputed$(() => {
		return Math.min(100, (subTotal / FREE_SHIPPING_THRESHOLD) * 100);
	});

	const hasQualified = useComputed$(() => {
		return subTotal >= FREE_SHIPPING_THRESHOLD;
	});

	// Only show for eligible countries and when free shipping hasn't been achieved
	if (!isEligibleCountry.value || hasQualified.value) {
		return null;
	}

	return (
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
			<div class="flex items-center justify-between mb-2">
				<span class="text-sm font-medium text-amber-800">
					🚚 Free Shipping Progress
				</span>
				<span class="text-xs text-amber-700">
					{formatPrice(remainingAmount.value, currencyCode)} to go!
				</span>
			</div>
			
			{/* Progress Bar */}
			<div class="w-full bg-amber-200 rounded-full h-2 mb-2">
				<div 
					class="bg-gradient-to-r from-yellow-500 to-amber-600 h-2 rounded-full transition-all duration-300 ease-out"
					style={`width: ${progressPercentage.value}%`}
				></div>
			</div>
			
			{/* Message */}
			<p class="text-xs text-amber-700">
				Add <strong>{formatPrice(remainingAmount.value, currencyCode)}</strong> more to qualify for free shipping!
			</p>
		</div>
	);
});