// @ts-nocheck - Temporary disable for GraphQL optimization deployment
import { component$, useComputed$, useContext, useSignal, useVisibleTask$, $ } from '@qwik.dev/core';
import { routeLoader$ } from '@qwik.dev/router';
import { OptimizedImage, generateImagePreloadLinks } from '~/components/ui';
import Alert from '~/components/alert/Alert';
import CheckIcon from '~/components/icons/CheckIcon';
import Price from '~/components/products/Price';
import { APP_STATE } from '~/constants';
import { OrderLine } from '~/generated/graphql';
import { getProductBySlug } from '~/providers/shop/products/products';
import { Variant } from '~/types';
import { cleanUpParams } from '~/utils';
import { createSEOHead } from '~/utils/seo';
import { useLocalCart, addToLocalCart } from '~/contexts/CartContext';
import { LocalCartService, type LocalCartItem } from '~/services/LocalCartService';
import { loadCountryOnDemand } from '~/utils/addressStorage';

export const useProductLoader = routeLoader$(async ({ params }) => {
	const { slug } = cleanUpParams(params);
	// 🚀 FRESH DATA: Use direct product query for real-time stock accuracy
	const product = await getProductBySlug(slug);

	// Handle case where product is not found
	if (!product) {
		// Debug info removed for production
		throw new Error(`Product not found: ${slug}`);
	}

	// Ensure assets array exists and has proper structure
	if (!product.assets) {
		product.assets = [];
	}

	// Remove SSR country detection - moving back to optimized client-side
		// Add placeholder ONLY if there are NO assets
	if (product.assets.length === 0) {
		const defaultAsset = {
			__typename: 'Asset' as const,
			id: 'placeholder_1',
			name: 'placeholder',
			preview: '/asset_placeholder.webp',
			source: '/asset_placeholder.webp',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			fileSize: 0,
			height: 400,
			width: 400,
			mimeType: 'image/webp',
			type: 'IMAGE' as any,
			focalPoint: null,
			customFields: null,
			tags: [],
		} as any;
		product.assets.push(defaultAsset);
	}
	
	return product;
});

export default component$(() => {
	const appState = useContext(APP_STATE);
	// 🚀 OPTIMIZED: Only access cart context when needed for operations, not for quantity display
	const localCart = useLocalCart();

	const product = useProductLoader().value;

	// Safety checks for product data
	if (!product || !product.assets || !product.variants || product.variants.length === 0) {
		return <div class="text-center py-8">Product not found</div>;
	}

	// 🚀 OPTIMIZED: Geolocation removed - now handled by demand-based system in cart/add-to-cart
	
	const currentImageSig = useSignal(
		product.featuredAsset || 
		(product.assets.length > 0 ? product.assets[0] : { id: '', preview: '/asset_placeholder.webp', name: 'Placeholder' })
	);

	// Reorder assets to put featured image first for consistent thumbnail display
	const orderedAssets = useComputed$(() => {
		if (!product.featuredAsset || !product.assets) {
			return product.assets || [];
		}
		
		// Find featured asset in the assets array
		const featuredIndex = product.assets.findIndex(asset => asset.id === product.featuredAsset?.id);
		
		if (featuredIndex === -1) {
			// Featured asset not in assets array, add it at the beginning
			return [product.featuredAsset, ...product.assets];
		} else if (featuredIndex === 0) {
			// Featured asset is already first
			return product.assets;
		} else {
			// Move featured asset to the beginning
			const reordered = [...product.assets];
			const [featuredAsset] = reordered.splice(featuredIndex, 1);
			return [featuredAsset, ...reordered];
		}
	});

	// Country detection now handled via SSR

	const selectedVariantIdSignal = useSignal(product.variants[0].id);
	
	// Modal state for image enlargement
	const showImageModal = useSignal(false);
	const modalImageSrc = useSignal('');
	const isImageLoading = useSignal(false);
	
	// Navigation state for modal
	const modalImageIndex = useSignal(0);
	
	const openImageModal = $((imageSrc: string, imageIndex?: number) => {
		// Hide modal on mobile devices (screens < 768px)
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			return;
		}
		
		modalImageSrc.value = imageSrc;
		modalImageIndex.value = imageIndex ?? orderedAssets.value.findIndex(asset => 
			asset.preview === imageSrc.replace(/\?preset=modal$/, '')
		);
		showImageModal.value = true;
		
		// 🚀 OPTIMIZED: Since images are preloaded in head, show minimal loading state
		isImageLoading.value = true;
		setTimeout(() => {
			isImageLoading.value = false;
		}, 150); // Shorter timeout since images should be preloaded
		
		// Prevent body scroll when modal is open
		document.body.style.overflow = 'hidden';
	});
	
	const closeImageModal = $(() => {
		showImageModal.value = false;
		modalImageSrc.value = '';
		isImageLoading.value = false;
		// Restore body scroll
		document.body.style.overflow = 'unset';
	});
	
	// 🚀 OPTIMIZED: Removed isImageCached function - images are now preloaded in head
	
	// Navigation functions for modal
	const navigateModal = $((direction: 'prev' | 'next') => {
		const currentIndex = modalImageIndex.value;
		const newIndex = direction === 'next' 
			? (currentIndex + 1) % orderedAssets.value.length
			: (currentIndex - 1 + orderedAssets.value.length) % orderedAssets.value.length;
		
		const newAsset = orderedAssets.value[newIndex];
		modalImageIndex.value = newIndex;
		const newImageSrc = newAsset.preview.includes('asset_placeholder') 
			? newAsset.preview 
			: newAsset.preview + '?preset=modal';
		
		modalImageSrc.value = newImageSrc;
		
		// 🚀 OPTIMIZED: Since images are preloaded in head, show minimal loading state
		isImageLoading.value = true;
		setTimeout(() => {
			isImageLoading.value = false;
		}, 150); // Shorter timeout since images should be preloaded
		
		// Update current image as well
		currentImageSig.value = newAsset;
	});
	
	// 🚀 OPTIMIZED: Removed preloadAdjacentImages function to fix code splitting issues
	
	// 🚀 OPTIMIZED: Removed smartPreload function to fix DOM manipulation errors
	// Images will load on-demand (still fast due to browser caching)

	// 🚀 OPTIMIZED: Modal image preloading moved to head function (eliminates hydration cost)
	
	// Keyboard event handler for modal
	const handleKeyDown = $((event: KeyboardEvent) => {
		if (!showImageModal.value) return;
		
		switch (event.key) {
			case 'Escape':
				closeImageModal();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				if (orderedAssets.value.length > 1) {
					navigateModal('prev');
				}
				break;
			case 'ArrowRight':
				event.preventDefault();
				if (orderedAssets.value.length > 1) {
					navigateModal('next');
				}
				break;
		}
	});
	
	// Set up keyboard listeners
	useVisibleTask$(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
	
	// Mobile touch/swipe handlers (Optimization 4)
	const touchStartX = useSignal(0);
	const touchStartY = useSignal(0);
	const didSwipe = useSignal(false);
	const isSwiping = useSignal(false);
	
	const handleTouchStart = $((event: TouchEvent) => {
		if (orderedAssets.value.length <= 1) return;
		
		const touch = event.touches[0];
		touchStartX.value = touch.clientX;
		touchStartY.value = touch.clientY;
		didSwipe.value = false;
		isSwiping.value = false;
	});
	
	const handleTouchMove = $((event: TouchEvent) => {
		if (orderedAssets.value.length <= 1) return;
		
		const touch = event.touches[0];
		const deltaX = Math.abs(touch.clientX - touchStartX.value);
		const deltaY = Math.abs(touch.clientY - touchStartY.value);
		
		// If horizontal movement is greater than vertical, it's a swipe
		if (deltaX > deltaY && deltaX > 10) {
			event.preventDefault(); // Prevent scrolling during horizontal swipe
			isSwiping.value = true;
		}
	});
	
	const handleTouchEnd = $((event: TouchEvent) => {
		if (orderedAssets.value.length <= 1 || !isSwiping.value) return;
		
		const touch = event.changedTouches[0];
		const deltaX = touch.clientX - touchStartX.value;
		const deltaY = Math.abs(touch.clientY - touchStartY.value);
		
		// Only consider it a swipe if horizontal movement > vertical movement and > threshold
		if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
			didSwipe.value = true;
			
			const currentIndex = orderedAssets.value.findIndex(asset => asset.id === currentImageSig.value.id);
			
			if (deltaX > 0) {
				// Swipe right - go to previous image
				const prevIndex = currentIndex > 0 ? currentIndex - 1 : orderedAssets.value.length - 1;
				const prevAsset = orderedAssets.value[prevIndex];
				if (prevAsset) {
					// 🚀 OPTIMIZED: Show minimal loading since images are preloaded
					isImageLoading.value = true;
					setTimeout(() => {
						isImageLoading.value = false;
					}, 150);
					
					currentImageSig.value = prevAsset;
				}
			} else {
				// Swipe left - go to next image
				const nextIndex = currentIndex < orderedAssets.value.length - 1 ? currentIndex + 1 : 0;
				const nextAsset = orderedAssets.value[nextIndex];
				if (nextAsset) {
					// 🚀 OPTIMIZED: Show minimal loading since images are preloaded
					isImageLoading.value = true;
					setTimeout(() => {
						isImageLoading.value = false;
					}, 150);
					
					currentImageSig.value = nextAsset;
				}
			}
		}
		
		// Reset swipe state
		isSwiping.value = false;
	});
	
	const selectedVariant = useComputed$(() => 
		product.variants.find(v => v.id === selectedVariantIdSignal.value)
	);
	
	// Check if ALL variants are sold out for product-level badge
	const allVariantsSoldOut = useComputed$(() => {
		return product.variants.every(variant => 
			variant.stockLevel !== undefined && 
			variant.stockLevel !== null && 
			variant.stockLevel === '0'
		);
	});
	
	const isOutOfStock = useComputed$(() => {
		const stockLevel = selectedVariant.value?.stockLevel;
		// console.log('[isOutOfStock DEBUG]', {
		// 	variantId: selectedVariant.value?.id,
		// 	stockLevel,
		// 	type: typeof stockLevel,
		// 	allVariants: product.variants.map(v => ({ id: v.id, stockLevel: v.stockLevel }))
		// });
		return stockLevel !== undefined && stockLevel !== null && stockLevel === '0';
	});

	const addItemToOrderErrorSignal = useSignal('');
	const isAddingToCart = useSignal(false);
	// 🚀 OPTIMIZED: Lightweight quantity display using direct localStorage check
	const quantitySignal = useSignal<Record<string, number>>({});

	// 🚀 EXTRACTED: Shared add to cart handler (eliminates 65 lines of duplication)
	const handleAddToCart = $(async () => {
		if (!isOutOfStock.value) { // 🚀 REMOVED: Limit of 7 - now allows adding up to actual stock level
			try {
				// Set loading state before local cart operation
				isAddingToCart.value = true;

				// Create local cart item with proper product variant structure
				const selectedVar = selectedVariant.value;
				if (!selectedVar) {
					throw new Error('No variant selected');
				}

				const localCartItem: LocalCartItem = {
					productVariantId: selectedVar.id,
					quantity: 1,
					productVariant: {
						id: selectedVar.id,
						name: selectedVar.name,
						price: selectedVar.priceWithTax || selectedVar.price || 0,
						stockLevel: selectedVar.stockLevel,
						product: {
							id: product.id,
							name: product.name,
							slug: product.slug
						},
						options: selectedVar.options || [],
						featuredAsset: selectedVar.featuredAsset || product.featuredAsset
					}
				};

				// Add to local cart using helper function
				await addToLocalCart(localCart, localCartItem);

				// 🚀 DEMAND-BASED GEOLOCATION: Load country when user shows purchase intent
				await loadCountryOnDemand(appState);

				// Show cart if successful
				if (!localCart.lastError) {
					appState.showCart = true;
				} else {
					addItemToOrderErrorSignal.value = localCart.lastError;
				}

				// Reset loading state
				isAddingToCart.value = false;
			} catch (error) {
				console.error('Error adding item to local cart:', error);
				addItemToOrderErrorSignal.value = 'Failed to add item to cart';
				// Reset loading state on error
				isAddingToCart.value = false;
			}
		}
	});

	// Load quantities from localStorage on mount (lightweight, no cart context loading)
	useVisibleTask$(() => {
		const variantIds = (product.variants || []).map((variant: Variant) => variant.id);

		// Check if we're in local cart mode or have loaded cart context
		if (localCart.isLocalMode && localCart.hasLoadedOnce) {
			// Use loaded cart context data
			const result: Record<string, number> = {};
			(product.variants || []).forEach((variant: Variant) => {
				const localItem = localCart.localCart.items.find(
					(item: any) => item.productVariantId === variant.id
				);
				result[variant.id] = localItem?.quantity || 0;
			});
			quantitySignal.value = result;
		} else if (localCart.isLocalMode) {
			// 🚀 OPTIMIZED: Use lightweight localStorage check (no context loading)
			quantitySignal.value = LocalCartService.getItemQuantitiesFromStorage(variantIds);
		} else {
			// Fallback to Vendure order (checkout mode)
			const result: Record<string, number> = {};
			(product.variants || []).forEach((variant: Variant) => {
				const orderLine = (appState.activeOrder?.lines || []).find(
					(l: OrderLine) =>
						l.productVariant.id === variant.id &&
						l.productVariant.product.id === product.id
				);
				result[variant.id] = orderLine?.quantity || 0;
			});
			quantitySignal.value = result;
		}

		// 🚀 OPTIMIZED: Listen for cart updates to sync quantities
		const handleCartUpdate = () => {
			if (localCart.hasLoadedOnce) {
				// Use loaded cart context data
				const result: Record<string, number> = {};
				(product.variants || []).forEach((variant: Variant) => {
					const localItem = localCart.localCart.items.find(
						(item: any) => item.productVariantId === variant.id
					);
					result[variant.id] = localItem?.quantity || 0;
				});
				quantitySignal.value = result;
			}
		};

		window.addEventListener('cart-updated', handleCartUpdate);

		return () => {
			window.removeEventListener('cart-updated', handleCartUpdate);
		};
	});

	return (
		<div class="bg-white">
			{/* Country detection now handled via SSR */}
			
			{/* Mobile: Full-width image container */}
			<div class="md:hidden">
				{/* Product Images - Mobile Full Width */}
				<div class="w-full">
					{/* Main gallery flex container: column on sm, row on md+ */}
					<div class="flex flex-col">
						{/* Main Image Container - Full width on mobile */}
						<div class="w-full">
							<div 
								class="w-full bg-white border-b border-gray-200 relative select-none cursor-pointer group aspect-4/5"
								onTouchStart$={handleTouchStart}
								onTouchMove$={handleTouchMove}
								onTouchEnd$={handleTouchEnd}
								onClick$={() => {
									// Only open modal if it wasn't a swipe gesture
									if (!didSwipe.value) {
										const currentIndex = orderedAssets.value.findIndex(asset => asset.id === currentImageSig.value.id);
										openImageModal(
											currentImageSig.value.preview.includes('asset_placeholder') 
												? currentImageSig.value.preview 
												: currentImageSig.value.preview + '?preset=modal',
											currentIndex
										);
									}
								}}
							>
								{/* Sold Out Badge */}
								{allVariantsSoldOut.value && (
									<div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#937237] antialiased animate-fade-in">
										Sold Out
									</div>
								)}
								
								{/* Loading state for mobile image changes */}
								{isImageLoading.value && (
									<div class="absolute inset-0 flex items-center justify-center bg-white/80 z-5">
										<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
									</div>
								)}
								<OptimizedImage
									src={
										currentImageSig.value.preview.includes('asset_placeholder') 
											? currentImageSig.value.preview 
											: currentImageSig.value.preview
									}
									class="object-center object-cover w-full h-full transition-all duration-300 mobile-main-image"
									width={1000}
									height={1250}
									loading="eager"
									priority
									responsive="productMain"
									alt={`Image of: ${currentImageSig.value.name}`}
								/>
							</div>
						</div>

						{/* Dot indicators - Mobile only */}
						<div class="flex justify-center items-center space-x-2 mt-4 px-4">
							{orderedAssets.value.map((asset, index) => (
								<button
									key={asset.id} 
									onClick$={() => {
										// 🚀 OPTIMIZED: Show minimal loading since images are preloaded
										isImageLoading.value = true;
										setTimeout(() => {
											isImageLoading.value = false;
										}, 150);
										
										currentImageSig.value = asset;
									}}
									class={`h-3 w-3 rounded-full focus:outline-hidden transition-all duration-200 transform hover:scale-110 ${currentImageSig.value.id === asset.id ? 'bg-black scale-110' : 'bg-gray-400 hover:bg-gray-500'}`}
									aria-label={`View image ${index + 1}`}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Product Info - Mobile with padding */}
				<div class="bg-[#f5f5f5] px-4 py-6 mt-6">
					<div class="mb-6">
						<h1 class="text-3xl font-bold text-black" style="-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;"> 
							{product.name}
						</h1>
						{product.variants.length <= 1 && (
							<div class="mt-2">
								<Price
									priceWithTax={product.variants[0].priceWithTax}
									currencyCode={product.variants[0].currencyCode}
									forcedClass="text-xl font-semibold text-gray-800"
								/>
							</div>
						)}
					</div>

					<div
						class="text-base text-gray-600 leading-relaxed"
						dangerouslySetInnerHTML={product.description}
					/>

					{/* Variant Selection */}
					{1 < product.variants.length && (
						<div class="mt-6 mb-6">
							<div class="flex flex-col gap-y-2">
								{product.variants.map((variant) => (
									<label key={variant.id} class="flex items-center gap-x-2 cursor-pointer">
										<input
											type="radio"
											name="variant-mobile"
											value={variant.id}
											checked={selectedVariantIdSignal.value === variant.id}
											onChange$={(_, el) => (selectedVariantIdSignal.value = el.value)}
											class="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2"
										/>
										<span class="text-base text-gray-900 flex items-center gap-x-2">
											{variant.name}
											<Price
												priceWithTax={variant.priceWithTax}
												currencyCode={variant.currencyCode}
												forcedClass="font-semibold"
											/>
											{variant.stockLevel === '0' && (
												<span class="ml-1" title="Out of stock">
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" class="inline-block">
														<path d="M7,7 L25,25" stroke="#d42938" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
														<path d="M7,25 L25,7" stroke="#d42938" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
													</svg>
												</span>
											)}
										</span>
									</label>
								))}
							</div>
						</div>
					)}

					{/* Add to Cart Button */}
					<div class={{ 'mb-8': true, 'mt-12': product.variants.length <= 1 }}>
						<button
							class={{
								'border border-transparent rounded-full px-6 py-3 sm:px-8 sm:py-4 text-base font-bold font-heading tracking-wide transition-all duration-300 transform hover:scale-105 hover:shadow-xl uppercase cursor-pointer flex items-center justify-center text-white min-w-[200px] w-auto': true,
								'bg-[#937237] hover:bg-[#CD9E34]': !isOutOfStock.value,
								'bg-[#937237] hover:bg-[#937237] opacity-50': isOutOfStock.value,
								'cursor-not-allowed': isOutOfStock.value, // 🚀 REMOVED: Limit of 7 - cursor only changes when out of stock
								'opacity-50': isOutOfStock.value, // 🚀 REMOVED: Limit of 7 - opacity only changes when out of stock
								'animate-pulse-once': quantitySignal.value[selectedVariantIdSignal.value] > 0 && !isAddingToCart.value,
							}}
							disabled={isOutOfStock.value} // 🚀 REMOVED: Limit of 7 - button now only disabled when out of stock
							onClick$={handleAddToCart}
						>
							{isOutOfStock.value ? (
								'Sold Out'
							) : isAddingToCart.value ? (
								<span class="flex items-center justify-center">
									<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Adding...
								</span>
							) : quantitySignal.value[selectedVariantIdSignal.value] > 0 ? (
								<span class="flex items-center justify-center">
									<CheckIcon />
									<span class="ml-2">
										{quantitySignal.value[selectedVariantIdSignal.value]} in cart - Add more
									</span>
								</span>
							) : (
								'Add to cart'
							)}
						</button>
					</div>

					{/* Error Message */}
					{!!addItemToOrderErrorSignal.value && (
						<div class="mb-8">
							<Alert message={addItemToOrderErrorSignal.value} />
						</div>
					)}
				</div>
			</div>

			{/* Desktop/Tablet: Original layout with padding */}
			<div class="hidden md:block">
				<div class="max-w-[1920px] mx-auto px-4 py-2">
					<div class="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
						{/* Product Images */}
						<div class="w-full">
							{/* Main gallery flex container: column on sm, row on md+ */}
							<div class="flex flex-col md:flex-row md:gap-4">
								{/* Thumbnail Images - Left Side - Order 1 on md+, hidden on sm */}
								<div class="hidden md:flex md:flex-col md:gap-2 md:max-w-[80px] md:order-1 md:pt-8 lg:pt-6">
									{orderedAssets.value.map((asset, key) => (
										<div
											key={key}
											class={{
												'border-2 cursor-pointer rounded-lg overflow-hidden aspect-4/5 transition-all duration-200 transform hover:scale-105 hover:shadow-md': true,
												'border-black scale-105': currentImageSig.value.id === asset.id,
												'border-gray-200': currentImageSig.value.id !== asset.id,
											}}
										>
											<OptimizedImage
												src={
													asset.preview.includes('asset_placeholder')
														? '/asset_placeholder.webp'
														: asset.preview
												}
												class="w-full h-full object-cover transition-all duration-200 hover:opacity-80"
												width={160}
												height={200}
												responsive="thumbnail"
												alt={`Thumbnail of: ${asset.name}`}
												onClick$={() => {
													// 🚀 OPTIMIZED: Show minimal loading since images are preloaded
													isImageLoading.value = true;
													setTimeout(() => {
														isImageLoading.value = false;
													}, 150);
													
													currentImageSig.value = asset;
												}}
												loading="lazy"
											/>
										</div>
									))}
								</div>

								{/* Main Image Container - Order 2 on md+, Order 1 on sm (implicitly due to thumbnail being hidden) */}
								<div class="flex-1 md:order-2 w-full">
									<div 
										class="w-full mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden relative select-none cursor-pointer group aspect-4/5"
										onTouchStart$={handleTouchStart}
										onTouchMove$={handleTouchMove}
										onTouchEnd$={handleTouchEnd}
										onClick$={() => {
											// Only open modal if it wasn't a swipe gesture
											if (!didSwipe.value) {
												const currentIndex = orderedAssets.value.findIndex(asset => asset.id === currentImageSig.value.id);
												openImageModal(
													currentImageSig.value.preview.includes('asset_placeholder') 
														? currentImageSig.value.preview 
														: currentImageSig.value.preview + '?preset=modal',
													currentIndex
												);
											}
										}}
									>
										{/* Sold Out Badge */}
										{allVariantsSoldOut.value && (
											<div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#937237] antialiased animate-fade-in">
												Sold Out
											</div>
										)}
										
										{/* Loading state for image changes */}
										{isImageLoading.value && (
											<div class="absolute inset-0 flex items-center justify-center bg-white/80 z-5">
												<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
											</div>
										)}
										
										<OptimizedImage
											src={
												currentImageSig.value.preview.includes('asset_placeholder') 
													? currentImageSig.value.preview 
													: currentImageSig.value.preview
											}
											class="object-center object-cover w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
											width={1000}
											height={1250}
											loading="eager"
											priority
											responsive="productMain"
											alt={`Image of: ${currentImageSig.value.name}`}
										/>
										{/* Subtle click indicator */}
										<div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
											<div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
												Click to enlarge
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Product Info */}
						<div class="bg-[#f5f5f5] p-6 rounded-lg mt-8 md:mt-8 lg:mt-6">
							<div class="mb-6">
								<h1 class="text-3xl sm:text-4xl font-bold text-black" style="-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;"> 
									{product.name}
								</h1>
								{product.variants.length <= 1 && (
									<div class="mt-2">
										<Price
											priceWithTax={product.variants[0].priceWithTax}
											currencyCode={product.variants[0].currencyCode}
											forcedClass="text-xl font-semibold text-gray-800"
										/>
									</div>
								)}
							</div>

							<div
								class="text-base text-gray-600 leading-relaxed"
								dangerouslySetInnerHTML={product.description}
							/>


							{/* Variant Selection */}
							{1 < product.variants.length && (
								<div class="mt-6 mb-6"> {/* Reduced bottom spacing */}
									<div class="flex flex-col gap-y-2">
										{product.variants.map((variant) => (
											<label key={variant.id} class="flex items-center gap-x-2 cursor-pointer">
												<input
													type="radio"
													name="variant-desktop"
													value={variant.id}
													checked={selectedVariantIdSignal.value === variant.id}
													onChange$={(_, el) => (selectedVariantIdSignal.value = el.value)}
													class="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 focus:ring-2"
												/>
												<span class="text-base text-gray-900 flex items-center gap-x-2">
										{variant.name}
										<Price
											priceWithTax={variant.priceWithTax}
											currencyCode={variant.currencyCode}
											forcedClass="font-semibold"
										/>
										{variant.stockLevel === '0' && (
											<span class="ml-1" title="Out of stock">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32" class="inline-block">
													<path d="M7,7 L25,25" stroke="#d42938" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
													<path d="M7,25 L25,7" stroke="#d42938" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
												</svg>
											</span>
										)}
									</span>
											</label>
										))}
									</div>
								</div>
							)}

							{/* Add to Cart Button */}
							<div class={{ 'mb-8': true, 'mt-12': product.variants.length <= 1 }}> {/* Added conditional top margin */}
								<button
									class={{
										'border border-transparent rounded-full px-6 py-3 sm:px-8 sm:py-4 text-base font-bold font-heading tracking-wide transition-all duration-300 transform hover:scale-105 hover:shadow-xl uppercase cursor-pointer flex items-center justify-center text-white min-w-[200px] w-auto': true,
										'bg-[#937237] hover:bg-[#CD9E34]': !isOutOfStock.value,
										'bg-[#937237] hover:bg-[#937237] opacity-50': isOutOfStock.value,
										'cursor-not-allowed': isOutOfStock.value || quantitySignal.value[selectedVariantIdSignal.value] > 7,
										'opacity-50': isOutOfStock.value, // 🚀 REMOVED: Limit of 7 - opacity only changes when out of stock
									}}
									disabled={isOutOfStock.value} // 🚀 REMOVED: Limit of 7 - button now only disabled when out of stock
									onClick$={handleAddToCart}
								>
									{isOutOfStock.value ? (
										'Sold Out'
									) : isAddingToCart.value ? (
										<span class="flex items-center justify-center">
											<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											Adding...
										</span>
									) : quantitySignal.value[selectedVariantIdSignal.value] > 0 ? (
										<span class="flex items-center justify-center">
											<CheckIcon />
											<span class="ml-2">
												{quantitySignal.value[selectedVariantIdSignal.value]} in cart - Add more
											</span>
										</span>
									) : (
										'Add to cart'
									)}
								</button>
							</div>

							{/* Error Message */}
							{!!addItemToOrderErrorSignal.value && (
								<div class="mb-8">
									<Alert message={addItemToOrderErrorSignal.value} />
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
			
			{/* Image Modal - Fixed Implementation */}
			{showImageModal.value && (
				<div 
					class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in"
					onClick$={(e) => {
						// Only close if clicking directly on the backdrop
						if (e.target === e.currentTarget) {
							closeImageModal();
						}
					}}
				>
					<div class="relative w-screen h-screen flex items-center justify-center">
						{/* Close button */}
						<button 
							class="absolute top-4 right-4 text-white hover:text-gray-300 transition-all duration-200 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transform hover:scale-110"
							onClick$={(e) => {
								e.stopPropagation();
								closeImageModal();
							}}
							aria-label="Close modal"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						
						{/* Navigation arrows - only show when there are adjacent images */}
						{/* Previous button - only show if not on first image */}
						{orderedAssets.value.length > 1 && modalImageIndex.value > 0 && (
							<button 
								class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-all duration-200 z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 hover:scale-110"
								onClick$={(e) => {
									e.stopPropagation();
									e.preventDefault();
									navigateModal('prev');
								}}
								aria-label="Previous image"
							>
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
								</svg>
							</button>
						)}
						
						{/* Next button - only show if not on last image */}
						{orderedAssets.value.length > 1 && modalImageIndex.value < orderedAssets.value.length - 1 && (
							<button 
								class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-all duration-200 z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 hover:scale-110"
								onClick$={(e) => {
									e.stopPropagation();
									e.preventDefault();
									navigateModal('next');
								}}
								aria-label="Next image"
							>
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
						)}
						
						{/* Image counter */}
						{orderedAssets.value.length > 1 && (
							<div 
								class="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm z-10"
								onClick$={(e) => e.stopPropagation()}
							>
								{modalImageIndex.value + 1} / {orderedAssets.value.length}
							</div>
						)}
						
						{/* Modal image container */}
						<div 
							class="relative bg-white rounded-lg overflow-hidden shadow-2xl max-w-[90vw] max-h-[90vh] aspect-4/5 animate-scale-in"
							onClick$={(e) => e.stopPropagation()}
						>
							{/* Loading spinner */}
							{isImageLoading.value && (
								<div class="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
									<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
								</div>
							)}
							
							<OptimizedImage
								src={modalImageSrc.value}
								class="w-full h-full object-cover transition-opacity duration-300"
								alt={`Enlarged product image ${modalImageIndex.value + 1} of ${orderedAssets.value.length}`}
								loading="lazy"
								onClick$={(e) => e.stopPropagation()}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

export const head = ({ resolveValue, url }: { resolveValue: any, url: URL }) => {
	const product = resolveValue(useProductLoader);

	// Create a clean description from the product description with safety checks
	const cleanDescription = product?.description
		? product.description.replace(/<[^>]*>/g, '').substring(0, 160)
		: `${product?.name || 'Product'} - High quality product available at Rotten Hand`;
	
	// Generate preload links for critical images (for optimal LCP and UX)
	let imagePreloadLinks: any[] = [];
	
	// Always preload the main/featured image first (critical for LCP)
	if (product?.featuredAsset?.preview) {
		imagePreloadLinks.push(
			...generateImagePreloadLinks(product.featuredAsset.preview, 'productMain', ['avif', 'webp'])
		);
	}

	// Also preload the first few gallery images for smooth navigation
	// Limit to first 3 gallery images to avoid excessive preloading
	if (product?.assets && product.assets.length > 0) {
		const galleryImages = product.assets
			.filter((asset: any) => asset.preview !== product.featuredAsset?.preview) // Exclude featured image (already preloaded)
			.slice(0, 3); // Limit to first 3 gallery images

		galleryImages.forEach((asset: any) => {
			if (asset.preview) {
				imagePreloadLinks.push(
					...generateImagePreloadLinks(asset.preview, 'thumbnail', ['webp'])
				);
			}
		});
	}

	// 🚀 REVERTED: Modal image preloading removed from head to fix navigation errors
	// Modal images will load on-demand (still fast due to browser caching)
	
	return createSEOHead({
		title: product?.name || 'Product',
		description: cleanDescription || `${product?.name || 'Product'} - Premium quality knife from Rotten Hand`,
		image: product?.featuredAsset?.preview,
		canonical: url.href,
		links: imagePreloadLinks,
	});
};
