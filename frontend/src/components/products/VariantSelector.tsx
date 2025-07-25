import { component$, useComputed$, $, useSignal } from '@qwik.dev/core';
import { Signal } from '@qwik.dev/core';
import { Product, ProductOptionGroup, ProductOption } from '~/types';
import Price from './Price';

interface VariantSelectorProps {
	product: Product;
	selectedVariantIdSignal: Signal<string>;
	hasSizeSelected: Signal<boolean>;
	hasColorSelected: Signal<boolean>;
}

export default component$<VariantSelectorProps>(({ product, selectedVariantIdSignal, hasSizeSelected, hasColorSelected }) => {
	// Track user's option selections - use separate signals for each group
	const selectedSize = useSignal<ProductOption | null>(null);
	const selectedColor = useSignal<ProductOption | null>(null);

	// Group options by their option group
	const optionGroups = useComputed$(() => {
		const groups: Record<string, { group: ProductOptionGroup; availableOptions: ProductOption[] }> = {};

		// Safety check: ensure product and variants are loaded
		if (!product || !product.variants || product.variants.length === 0) {
			return groups;
		}

		// Get all unique option groups from variants
		product.variants.forEach(variant => {
			// Check if variant has options and they're defined
			if (variant.options && Array.isArray(variant.options)) {
				variant.options.forEach(option => {
					if (option.group) {
						if (!groups[option.group.code]) {
							groups[option.group.code] = {
								group: option.group,
								availableOptions: []
							};
						}

						// Add option if not already present
						const exists = groups[option.group.code].availableOptions.some(opt => opt.id === option.id);
						if (!exists) {
							groups[option.group.code].availableOptions.push(option);
						}
					}
				});
			}
		});

		return groups;
	});

// Get all sizes (always visible, but may be disabled)
const allSizes = useComputed$(() => {
	if (!product?.variants) return [];

	const sizeGroup = optionGroups.value['size'];
	if (!sizeGroup) return [];

	return sizeGroup.availableOptions;
});

// Check if a size has any available variants
const isSizeAvailable = useComputed$(() => {
	return (sizeOption: ProductOption) => {
		if (!product?.variants) return false;

		return product.variants.some(variant => {
			if (!variant.options || !Array.isArray(variant.options)) return false;
			const hasThisSize = variant.options.some(opt => opt.id === sizeOption.id);

			// Check if this variant has the right size
			if (!hasThisSize) return false;

			// Check if variant is in stock: either has inventory OR tracking is disabled
			const stockLevel = parseInt(variant.stockLevel || '0');
			const trackInventory = variant.trackInventory;

			// In stock if: has stock > 0 OR inventory tracking is disabled for this variant
			// trackInventory can be 'FALSE', 'TRUE', or 'INHERIT' (inherits from global/channel settings)
			const isInStock = stockLevel > 0 || trackInventory === 'FALSE';

			return isInStock;
		});
	};
});

// Get all colors (always visible)
const allColors = useComputed$(() => {
	if (!product?.variants) return [];

	const colorGroup = optionGroups.value['color'];
	if (!colorGroup) return [];

	return colorGroup.availableOptions;
});

// Check if a color is available for the selected size
const isColorAvailable = useComputed$(() => {
	return (colorOption: ProductOption) => {
		if (!selectedSize.value || !product?.variants) return false;

		return product.variants.some(variant => {
			if (!variant.options || !Array.isArray(variant.options)) return false;
			const hasSelectedSize = variant.options.some(opt => opt.id === selectedSize.value!.id);
			const hasThisColor = variant.options.some(opt => opt.id === colorOption.id);

			// Check if this variant has the right size/color combination
			if (!hasSelectedSize || !hasThisColor) return false;

			// Check if variant is in stock: either has inventory OR tracking is disabled
			const stockLevel = parseInt(variant.stockLevel || '0');
			const trackInventory = variant.trackInventory;

			// In stock if: has stock > 0 OR inventory tracking is disabled for this variant
			// trackInventory can be 'FALSE', 'TRUE', or 'INHERIT' (inherits from global/channel settings)
			const isInStock = stockLevel > 0 || trackInventory === 'FALSE';

			return isInStock;
		});
	};
});

// Update variant selection based on current size and color
const updateVariantSelection = $(() => {
	if (!selectedSize.value || !selectedColor.value) {
		selectedVariantIdSignal.value = '';
		return;
	}

	const matchingVariant = product.variants.find(variant => {
		if (!variant.options || !Array.isArray(variant.options)) return false;

		const hasSelectedSize = variant.options.some(opt => opt.id === selectedSize.value!.id);
		const hasSelectedColor = variant.options.some(opt => opt.id === selectedColor.value!.id);

		return hasSelectedSize && hasSelectedColor;
	});

	selectedVariantIdSignal.value = matchingVariant?.id || '';
});

// Handle option selection
const handleSizeSelect = $((sizeOption: ProductOption) => {
	if (selectedSize.value?.id === sizeOption.id) {
		// Unselect size
		selectedSize.value = null;
		selectedColor.value = null;
		selectedVariantIdSignal.value = '';
		hasSizeSelected.value = false;
		hasColorSelected.value = false;
	} else {
		// Select new size
		selectedSize.value = sizeOption;
		hasSizeSelected.value = true;

		// Check if current color is still available with new size
		if (selectedColor.value) {
			const colorStillAvailable = isColorAvailable.value(selectedColor.value);
			if (!colorStillAvailable) {
				selectedColor.value = null;
				hasColorSelected.value = false;
			}
		}

		// Update variant selection
		updateVariantSelection();
	}
});

const handleColorSelect = $((colorOption: ProductOption) => {
	// Only allow selection if color is available for selected size
	if (!isColorAvailable.value(colorOption)) {
		return;
	}

	if (selectedColor.value?.id === colorOption.id) {
		// Unselect color
		selectedColor.value = null;
		selectedVariantIdSignal.value = '';
		hasColorSelected.value = false;
	} else {
		// Select new color
		selectedColor.value = colorOption;
		hasColorSelected.value = true;
		updateVariantSelection();
	}
});

	// selectedVariant removed since inventory tracking is disabled

	if (product.variants.length <= 1) {
		return null;
	}

	// If no option groups found, show debug info and fallback
	if (Object.keys(optionGroups.value).length === 0) {
		return (
			<div class="mt-6 mb-6">
				<div class="p-4 bg-yellow-100 border border-yellow-400 rounded">
					<p class="text-sm text-yellow-800">
						Debug: VariantSelector found no option groups. Variants: {product.variants.length}
					</p>
					<div class="mt-2 text-xs text-yellow-700">
						{product.variants.map((variant, i) => (
							<div key={variant.id}>
								Variant {i}: {variant.name} - Options: {variant.options?.length || 0}
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div class="mt-6 mb-6">
			{/* Display price - always show since all variants have same price */}
			{product.variants.length > 0 && (
				<div class="mb-4">
					<Price
						priceWithTax={product.variants[0].priceWithTax}
						currencyCode={product.variants[0].currencyCode}
						forcedClass="text-xl font-semibold text-gray-800"
					/>
				</div>
			)}

			{/* Size Selection */}
			{allSizes.value.length > 0 && (
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-900 mb-3">Size</h3>
					<div class="flex flex-wrap gap-2">
						{allSizes.value.map((sizeOption) => {
							const isSelected = selectedSize.value?.id === sizeOption.id;
							const isAvailable = isSizeAvailable.value(sizeOption);

							return (
								<button
									key={sizeOption.id}
									onClick$={() => handleSizeSelect(sizeOption)}
									disabled={!isAvailable}
									class={{
										'px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200': true,
										'bg-[#B09983] text-white border-[#B09983]': isSelected,
										'bg-white text-gray-900 border-gray-300 hover:bg-[#B09983] hover:border-[#4F3B26]': !isSelected && isAvailable,
										'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed': !isAvailable,
									}}
								>
									{sizeOption.name}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Color Selection - Always visible */}
			{allColors.value.length > 0 && (
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-900 mb-3">Color</h3>
					<div class="flex flex-wrap gap-2">
						{allColors.value.map((colorOption) => {
							const isSelected = selectedColor.value?.id === colorOption.id;
							const isAvailable = selectedSize.value ? isColorAvailable.value(colorOption) : false;

							return (
								<button
									key={colorOption.id}
									onClick$={() => handleColorSelect(colorOption)}
									disabled={!isAvailable}
									class={{
										'px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200': true,
										'bg-[#B09983] text-white border-[#B09983]': isSelected,
										'bg-white text-gray-900 border-gray-300 hover:bg-[#B09983] hover:border-[#4F3B26]': !isSelected && isAvailable,
										'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed': !isAvailable,
									}}
								>
									{colorOption.name}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Out of stock message removed since inventory tracking is disabled */}
		</div>
	);
});
