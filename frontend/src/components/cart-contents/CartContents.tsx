import { component$, useContext, useSignal, useTask$, useVisibleTask$, $ } from '@builder.io/qwik';
import { Link, useLocation } from '@qwik.dev/router';
import { OptimizedImage } from '~/components/ui';
import { APP_STATE } from '~/constants';
import { Order } from '~/generated/graphql';

import { getProductBySlug } from '~/providers/shop/products/products';
import { isCheckoutPage } from '~/utils';
import { isImageCached } from '~/utils/image-cache';
import Price from '../products/Price';
import TrashIcon from '../icons/TrashIcon';
import { useLocalCart, updateLocalCartQuantity, removeFromLocalCart } from '~/contexts/CartContext';
import { StockWarning } from '../cart/StockWarning';
// import { useCartPerformanceTracking } from '~/hooks/usePerformanceTracking'; // Removed for performance

// Image preloading function for cart product links
const handleProductLinkClick = $((productSlug: string, featuredAssetPreview?: string) => {
	// Preload the larger image that will be shown on the product detail page
	const targetImageUrl = featuredAssetPreview ? featuredAssetPreview.replace('?preset=thumb', '?preset=xl') : '/asset_placeholder.webp';
	
	isImageCached(targetImageUrl).then((cached) => {
		if (!cached) {
			const img = new Image();
			img.src = targetImageUrl;
		}
	});
});

export default component$<{
	order?: Order;
}>(({ order }) => {
	const location = useLocation();
	const appState = useContext(APP_STATE);
	const localCart = useLocalCart();
	const currentOrderLineSignal = useSignal<{ id: string; value: number }>();
	const isInEditableUrl = !isCheckoutPage(location.url.toString()) || !order;
	
	// Performance tracking for cart operations - DISABLED for performance
	// const performanceTracking = useCartPerformanceTracking();
	
	// Static caches - calculated once and never re-calculated unless new items added
	const productNameCache = useSignal<Record<string, string>>({});
	const quantityOptionsCache = useSignal<Record<string, (number | string)[]>>({});
	const expandedDropdowns = useSignal<Set<string>>(new Set()); // Track which dropdowns are expanded
	const processedLineIds = useSignal<Set<string>>(new Set());

	useTask$(({ track, cleanup }) => {
		track(() => currentOrderLineSignal.value);
		let id: NodeJS.Timeout;
		if (currentOrderLineSignal.value) {
			id = setTimeout(async () => {
				// Track cart operation performance
				// const cartOpTimer = await performanceTracking.trackCartOperation$('update-quantity'); // Disabled

				try {
					// Always use local cart service for quantity updates
					await updateLocalCartQuantity(
						localCart,
						currentOrderLineSignal.value!.id, // This will be the productVariantId for local cart
						currentOrderLineSignal.value!.value
					);
					// await cartOpTimer.end$(); // Track successful update - DISABLED
				} catch (_error) {
					// console.error('Failed to update cart quantity:', error);
					// await cartOpTimer.end$(); // Track failed update - DISABLED
				}
			}, 300);
		}
		cleanup(() => {
			if (id) {
				clearTimeout(id);
			}
		});
	});

	// 🚀 OPTIMIZED: Process new line items only when cart contents actually change
	useVisibleTask$(async ({ track }) => {
		// Track cart changes to only run when items actually change
		const _cartItems = localCart.isLocalMode
			? track(() => localCart.localCart.items)
			: track(() => appState.activeOrder?.lines || []);

		// Get current lines directly
		const lines = order?.lines || appState.activeOrder?.lines || [];
		
		for (const line of lines) {
			// Skip if we've already processed this line
			if (processedLineIds.value.has(line.id)) continue;
			
			// Mark this line as processed immediately
			processedLineIds.value = new Set([...processedLineIds.value, line.id]);
			
			// Calculate quantity options ONCE for this line
			const stockLevel = '3'; // Hardcoded as per business logic
			let maxQty = 3;
			
			const numericStock = parseInt(stockLevel, 10);
			if (!isNaN(numericStock)) {
				maxQty = Math.max(numericStock, line.quantity); // Ensure current quantity is always available
			}

			// 🚀 SMART EXPANSION: Show 1-9, "10+" if stock > 10, or expand to full range
			const isExpanded = expandedDropdowns.value.has(line.id);
			let options: (number | string)[];

			if (maxQty <= 10) {
				// Stock ≤ 10: Show all options (1, 2, 3... up to stock)
				options = Array.from({length: maxQty}, (_, i) => i + 1);
			} else if (!isExpanded) {
				// Stock > 10 & not expanded: Show 1-9, "10+"
				options = [...Array.from({length: 9}, (_, i) => i + 1), "10+"];
			} else {
				// Stock > 10 & expanded: Show all options (1, 2, 3... up to stock)
				options = Array.from({length: maxQty}, (_, i) => i + 1);
			}
			
			// Cache the quantity options for this specific line ID
			quantityOptionsCache.value = {
				...quantityOptionsCache.value,
				[line.id]: options
			};
			
			// Fetch product name if needed (only if not already available)
			if (line.productVariant?.product?.slug && !line.productVariant.product.name) {
				const slug = line.productVariant.product?.slug;
			if (!slug) continue; // Skip if no product slug
				
				// Skip if we already have this product name in cache
				if (!productNameCache.value[slug]) {
					try {
						const product = await getProductBySlug(slug);
						if (product && product.name) {
							productNameCache.value = {
								...productNameCache.value,
								[slug]: product.name
							};
						}
					} catch (error) {
						console.error(`Error fetching product details for slug ${slug}:`, error);
					}
				}
			}
		}
	});

	return (
		<div class="flow-root mx-auto w-full">
			<ul class="-my-6 divide-y divide-gray-200 mx-auto w-full">
				{/* Render local cart items when in local mode */}
				{localCart.isLocalMode && localCart.localCart.items.map((item) => {
					const productSlug = item.productVariant.product?.slug || '';
					const productName = item.productVariant.product?.name || 
						productNameCache.value[productSlug] || 
						productSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

					// Calculate line price (since local cart items don't have linePriceWithTax)
					const linePrice = item.productVariant.price * item.quantity;

					// Calculate quantity options for local cart items
					const stockLevel = item.productVariant.stockLevel || '3';
					let maxQty = 3;
					const numericStock = parseInt(stockLevel, 10);
					if (!isNaN(numericStock)) {
						maxQty = Math.max(numericStock, item.quantity); // Ensure current quantity is always available
					}

					// 🚀 SMART EXPANSION: Show 1-9, "10+" if stock > 10, or expand to full range
					const isExpanded = expandedDropdowns.value.has(item.productVariantId);
					let quantityOptions: (number | string)[];

					if (maxQty <= 10) {
						// Stock ≤ 10: Show all options (1, 2, 3... up to stock)
						quantityOptions = Array.from({length: maxQty}, (_, i) => i + 1);
					} else if (!isExpanded) {
						// Stock > 10 & not expanded: Show 1-9, "10+"
						quantityOptions = [...Array.from({length: 9}, (_, i) => i + 1), "10+"];
					} else {
						// Stock > 10 & expanded: Show all options (1, 2, 3... up to stock)
						quantityOptions = Array.from({length: maxQty}, (_, i) => i + 1);
					}

					return (
						<li key={item.productVariantId} class="py-6 flex items-center w-full">
							{/* Product image */}
							<div class="shrink-0 w-24 border border-gray-200 rounded-md overflow-hidden">
								<div class="relative aspect-4/5">
									<OptimizedImage
										class="w-full h-full object-center object-cover"
										src={`${item.productVariant.featuredAsset?.preview || '/asset_placeholder.webp'}?preset=thumb`}
										width={160}
										height={200}
										loading="lazy"
										alt={`Image of: ${item.productVariant.name}`}
									/>
								</div>
							</div>

							{/* Product Details */}
							<div class="ml-4 flex-1 flex flex-col justify-center w-full">
								{/* Top row: titles and price */}
								<div class="flex justify-between items-start mb-1">
									{/* Product title */}
									<div class="flex flex-col">
										<h3 class="text-lg sm:text-xl font-bold text-gray-900">
											{productSlug ? (
												<Link 
															href={`/shop/`}
															onClick$={() => handleProductLinkClick(productSlug, item.productVariant.featuredAsset?.preview)}
														>
															{productName}
														</Link>
											) : (
												<span>{productName}</span>
											)}
										</h3>
										<p class="text-sm text-gray-600">{item.productVariant.name}</p>
									</div>
									
									{/* Price aligned right */}
									<div class="text-right">
										<Price
											priceWithTax={linePrice}
										/>
									</div>
								</div>
								
								{/* Stock warning for out-of-stock or low stock items */}
								<StockWarning 
									item={item} 
									onRemove$={$(() => removeFromLocalCart(localCart, item.productVariantId))}
								/>
								
								{/* Bottom row: quantity and remove button - hidden for out of stock items */}
								{(() => {
									const stockLevel = parseInt(item.productVariant.stockLevel || '0');
									const isOutOfStock = stockLevel <= 0;
									
									if (isOutOfStock) {
										return null; // Hide quantity selector and delete button for out of stock items
									}
									
									return (
										<div class="flex items-center justify-between mt-2">
											{/* Quantity selector */}
											<div>
												{isInEditableUrl ? (
													<select
														disabled={!isInEditableUrl}
														id={`quantity-${item.productVariantId}`}
														name={`quantity-${item.productVariantId}`}
														value={item.quantity}
														onChange$={(_, el) => {
															if (el.value === "10+") {
																// Expand dropdown to show all options
																expandedDropdowns.value = new Set([...expandedDropdowns.value, item.productVariantId]);
															} else {
																currentOrderLineSignal.value = { id: item.productVariantId, value: +el.value };
															}
														}}
														class="rounded-md border border-gray-300 py-1.5 text-base leading-5 font-medium text-gray-700 text-left shadow-xs focus:outline-hidden focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
													>
														{quantityOptions.map(num => (
															<option key={num} value={num} selected={item.quantity === num}>
																{num.toString()}
															</option>
														))}
													</select>
												) : (
													<span class="font-medium">{item.quantity}</span>
												)}
											</div>
											
											{/* Trash icon for removal */}
											{isInEditableUrl && (
												<button
													value={item.productVariantId}
													aria-label="Remove item"
													class="p-1 rounded-full text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
													onClick$={async () => {
														// const removeTimer = await performanceTracking.trackCartOperation$('remove-item'); // DISABLED
														try {
															await removeFromLocalCart(localCart, item.productVariantId);

															// Close cart popup if it becomes empty
															if (localCart.localCart.items.length === 0) {
																appState.showCart = false;
															}

															// await removeTimer.end$(); // Track successful removal - DISABLED
														} catch (error) {
															console.error('Failed to remove item from cart:', error);
															// await removeTimer.end$(); // Track failed removal - DISABLED
														}
													}}
												>
													<TrashIcon />
												</button>
											)}
										</div>
									);
								})()}
							</div>
						</li>
					);
				})}

				{/* Render Vendure order lines when in Vendure mode OR when explicit order prop is passed */}
				{(!localCart.isLocalMode || order) && (order?.lines || appState.activeOrder?.lines || []).map((line) => {
					const { linePriceWithTax } = line;
					
					// Get product name directly without computed signal
					const productSlug = line.productVariant.product?.slug || '';
					const productName = line.productVariant.product?.name || 
						productNameCache.value[productSlug] || 
						productSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

					return (
						<li key={line.id} class="py-6 flex items-center w-full">
							{/* Product image */}
							<div class="shrink-0 w-24 border border-gray-200 rounded-md overflow-hidden">
								<div class="relative aspect-4/5">
									<OptimizedImage
										class="w-full h-full object-center object-cover"
										src={`${line.featuredAsset?.preview}?preset=thumb`}
										width={160}
										height={200}
										loading="lazy"
										alt={`Image of: ${line.productVariant.name}`}
									/>
								</div>
							</div>

							{/* Product Details */}
							<div class="ml-4 flex-1 flex flex-col justify-center w-full">
								{/* Top row: titles and price */}
								<div class="flex justify-between items-start mb-1">
									{/* Product title */}
									<div class="flex flex-col">
										<h3 class="text-lg sm:text-xl font-bold text-gray-900">
											{line.productVariant.product?.slug ? (
												<Link 
														href={`/shop/`}
														onClick$={() => handleProductLinkClick(line.productVariant.product.slug, line.featuredAsset?.preview)}
													>
														{productName}
													</Link>
											) : (
												<span>{productName}</span>
											)}
										</h3>
										<p class="text-sm text-gray-600">{line.productVariant.name}</p>
									</div>
									
									{/* Price aligned right */}
									<div class="text-right">
										<Price
											priceWithTax={linePriceWithTax}
										/>
									</div>
								</div>
								

								
								{/* Bottom row: quantity and remove button */}
								<div class="flex items-center justify-between mt-2">
									{/* Quantity selector with no label */}
									<div>
										{isInEditableUrl ? (
											<select
												disabled={!isInEditableUrl}
												id={`quantity-${line.id}`}
												name={`quantity-${line.id}`}
												value={line.quantity}
												onChange$={(_, el) => {
													if (el.value === "10+") {
														// Expand dropdown to show all options
														expandedDropdowns.value = new Set([...expandedDropdowns.value, line.id]);
													} else {
														currentOrderLineSignal.value = { id: line.id, value: +el.value };
													}
												}}
												class="rounded-md border border-gray-300 py-1.5 text-base leading-5 font-medium text-gray-700 text-left shadow-xs focus:outline-hidden focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
											>
												{(quantityOptionsCache.value[line.id] || [1, 2, 3]).map(num => (
													<option key={num} value={num} selected={line.quantity === num}>
														{num.toString()}
													</option>
												))}
											</select>
										) : (
											<span class="font-medium">{line.quantity}</span>
										)}
									</div>
									
									{/* Trash icon for removal */}
									{isInEditableUrl && (
										<button
											value={line.id}
											aria-label="Remove item"
											class="p-1 rounded-full text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors cursor-pointer"
											onClick$={async () => {
														// const removeTimer = await performanceTracking.trackCartOperation$('remove-item'); // DISABLED
														try {
															await removeFromLocalCart(localCart, line.productVariant.id);

															// Close cart popup if it becomes empty
															if (localCart.localCart.items.length === 0) {
																appState.showCart = false;
															}

															// await removeTimer.end$(); // Track successful removal - DISABLED
														} catch (error) {
															console.error('Failed to remove item from cart:', error);
															// await removeTimer.end$(); // Track failed removal - DISABLED
														}
													}}
										>
											<TrashIcon />
										</button>
									)}
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
});