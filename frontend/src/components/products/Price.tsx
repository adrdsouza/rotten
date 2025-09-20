import { component$, Signal } from '@qwik.dev/core';
import { formatPrice } from '~/utils';

export default component$<{
	priceWithTax: any; // Accept any type for priceWithTax
	variantSig?: Signal<unknown>;
	forcedClass?: string;
}>(({ priceWithTax, variantSig, forcedClass }: any) => {
	const currency = 'USD'; // Hardcode to USD
	return (
		<div>
			{variantSig?.value && <div class="hidden">{JSON.stringify(variantSig.value)}</div>}
			{typeof priceWithTax === 'number' ? (
				<div class={forcedClass}>{formatPrice(priceWithTax, currency)}</div>
			) : 'value' in priceWithTax ? (
				<div class={forcedClass}>{formatPrice(priceWithTax.value, currency)}</div>
			) : priceWithTax.min === priceWithTax.max ? (
				<div class={forcedClass}>{formatPrice(priceWithTax.min, currency)}</div>
			) : (
				<div class={forcedClass}>
					{formatPrice(priceWithTax.min, currency)} - {formatPrice(priceWithTax.max, currency)}
				</div>
			)}
		</div>
	);
});
