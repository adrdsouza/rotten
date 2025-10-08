import { component$, Signal } from '@qwik.dev/core';
import { formatPrice, formatCustomPrice } from '~/utils';

export default component$<{
	priceWithTax: any; // Accept any type for priceWithTax
	variantSig?: Signal<unknown>;
	forcedClass?: string;
	salePrice?: number | null;
	preOrderPrice?: number | null;
	originalPriceClass?: string;
		currencyCode?: string;

}>(({ priceWithTax, variantSig, forcedClass, salePrice, preOrderPrice, originalPriceClass, currencyCode }: any) => {
	const originalPrice = salePrice || preOrderPrice;

	const renderPrice = (price: number) => {
		return formatPrice(price, currencyCode);
	};

	const renderCustomPrice = (price: number) => {
		return formatCustomPrice(price, currencyCode);
	};

	const renderPriceRange = (min: number, max: number) => {
		return `${formatPrice(min, currencyCode)} - ${formatPrice(max, currencyCode)}`;
	};

	return (
		<div class="flex items-center justify-center">
			{variantSig?.value && <div class="hidden">{JSON.stringify(variantSig.value)}</div>}
			{originalPrice && (
				<div class={`text-sm line-through mr-2 ${originalPriceClass || 'text-white/90'}`}>
					{renderCustomPrice(originalPrice)}
				</div>
			)}
			{(() => {
				if (typeof priceWithTax === 'number') {
					return <div class={forcedClass}>{renderPrice(priceWithTax)}</div>;
				}
				if (priceWithTax && typeof priceWithTax === 'object') {
					if ('value' in priceWithTax) {
						return <div class={forcedClass}>{renderPrice((priceWithTax as any).value)}</div>;
					}
					const hasMin = 'min' in (priceWithTax as any);
					const hasMax = 'max' in (priceWithTax as any);
					if (hasMin && hasMax) {
						const min = (priceWithTax as any).min as number;
						const max = (priceWithTax as any).max as number;
						if (typeof min === 'number' && typeof max === 'number') {
							if (min === max) {
								return <div class={forcedClass}>{renderPrice(min)}</div>;
							}
							return originalPrice
								? <div class={forcedClass}>{renderPrice(min)}</div>
								: <div class={forcedClass}>{renderPriceRange(min, max)}</div>;
						}
					}
				}
				// Fallback when priceWithTax is undefined or not in expected shape
				return <div class={forcedClass}>{renderPrice(0)}</div>;
			})()}
		</div>
	);
});
