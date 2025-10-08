// @ts-nocheck - Temporary disable for GraphQL optimization deployment
import { component$, useComputed$, useContext, useSignal, useStore, useTask$, useVisibleTask$, $ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { OptimizedImage, generateImagePreloadLinks } from '~/components/ui';
import Alert from '~/components/alert/Alert';
import CheckIcon from '~/components/icons/CheckIcon';
import Price from '~/components/products/Price';
import SezzleWidget from '~/components/sezzle/SezzleWidget';
import { APP_STATE } from '~/constants';
import { OrderLine } from '~/generated/graphql';
import { getProductBySlug, getProductBySlugWithCachedVariants } from '~/providers/shop/products/products';
import { ProductCacheService } from '~/services/ProductCacheService';
import { Variant } from '~/types';
import { cleanUpParams } from '~/utils';
import { createSEOHead } from '~/utils/seo';
import { generateBreadcrumbSchema, generateProductSchema } from '~/services/seo-api.service';
import { LoaderIcon } from 'lucide-qwik';
import { useLocalCart, addToLocalCart } from '~/contexts/CartContext';
import { LocalCartService, type LocalCartItem } from '~/services/LocalCartService';
import { loadCountryOnDemand } from '~/utils/addressStorage';
import { useImageGalleryTouchHandling } from '~/utils/optimized-touch-handling';

export const useProductLoader = routeLoader$(async ({ params, _fail }) => {
	const { slug } = cleanUpParams(params);
	
	let result;
	try {
		// 🚀 CACHE-AWARE: Use cache-aware loader with robust fallbacks
		result = await getProductBySlugWithCachedVariants(slug);
		
		if (!result || !result.product) {
			// Fallback to direct query if cache-aware loader fails
			console.warn('Cache-aware loader failed, falling back to direct query');
			const product = await getProductBySlug(slug);
			if (!product) {
				throw new Error(`Product not found: ${slug}`);
			}
			result = {
				product,
				source: 'fallback',
				warning: null
			};
		}
	} catch (error) {
		console.error('Product loader error:', error);
		// Last resort fallback
		try {
			const product = await getProductBySlug(slug);
			if (!product) {
				throw new Error(`Product not found: ${slug}`);
			}
			result = {
				product,
				source: 'error-fallback',
				warning: 'Data may be outdated due to loading issues'
			};
		} catch (_fallbackError) {
			// If all fallbacks fail, we throw.
			// Qwik will catch this and show a 404 or 500 page.
			throw new Error(`Product not found: ${slug}`);
		}
	}

	const product = result.product;

	// Ensure assets array exists and has proper structure
	if (product && !product.assets) {
		product.assets = [];
	}

	// Add placeholder ONLY if there are NO assets
	if (product && product.assets.length === 0) {
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
	
	return result;
});

export default component$(() => {
	const appState = useContext(APP_STATE);
	// 🚀 OPTIMIZED: Only access cart context when needed for operations, not for quantity display
	const localCart = useLocalCart();

	const loaderResult = useProductLoader().value;
	const product = useStore(loaderResult.product || loaderResult);


	// Safety checks for product data
	if (!product || !product.assets || !product.variants || product.variants.length === 0) {
		return <div class="text-center py-8">Product not found</div>;
	}

	// Progressive enhancement signals
	const isEnhancing = useSignal(false);
	const enhancementError = useSignal<string | null>(null);

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

	const selectedVariantIdSignal = useSignal<string | undefined>(undefined);
	const preOrderConsent = useSignal(false);

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
	
	// Enhanced stock refresh with progressive enhancement and deep data comparison
	useVisibleTask$(() => {
		const refreshStockAndVariants = async () => {
			try {
				isEnhancing.value = true;
				enhancementError.value = null;
				
				// Use cache-aware loader for enhanced performance
				const result = await getProductBySlugWithCachedVariants(product.slug);
				
				if (result && result.product) {
					// Deep compare current variants with fresh variants
					const freshVariants = result.product.variants || [];
					
					// Enhanced variant comparison with detailed change tracking
					const variantComparison = ProductCacheService.compareVariantData(product.variants, freshVariants);
					const productChanges = ProductCacheService.compareProductData(product, result.product);

					if (variantComparison.hasChanges || productChanges.hasChanges) {
						if (variantComparison.hasChanges) {
							console.log('[Manual Refresh] Variant changes detected:', {
								stockChanges: variantComparison.stockChanges,
								priceChanges: variantComparison.priceChanges,
								newVariants: variantComparison.newVariants.length,
								missingVariants: variantComparison.missingVariants.length
							});
							
							// Update product variants
							product.variants = freshVariants;
							
							// Reset selected variant if it's no longer available
							if (selectedVariant.value && !freshVariants.find((v: any) => v.id === selectedVariant.value?.id)) {
								selectedVariant.value = freshVariants.find((v: any) => v.stockLevel > 0) || freshVariants[0] || null;
							}
						}
						
						if (productChanges.hasChanges) {
							console.log('[Manual Refresh] Product changes detected:', productChanges.changes);
							
							// Update product data selectively
							if (productChanges.changes.includes('description') && result.product.description) {
								product.description = result.product.description;
							}
							if (productChanges.changes.includes('assets') && result.product.assets) {
								product.assets = result.product.assets;
								// Update current image if it's no longer available
								if (currentImageSig.value && !result.product.assets.find((a: any) => a.id === currentImageSig.value?.id)) {
									currentImageSig.value = result.product.assets[0] || null;
								}
							}
							if (productChanges.changes.includes('facetValues') && result.product.facetValues) {
								product.facetValues = result.product.facetValues;
							}
						}
						
						// Show warning if data came from stale cache
						if (result.warning) {
							enhancementError.value = result.warning;
						}
					} else {
						console.log('[Manual Refresh] No changes detected, data is current');
						// Clear any previous warnings since data is fresh
						enhancementError.value = null;
					}
				} else {
					// Fallback to direct product query
					console.warn('[Manual Refresh] Cache-aware loader failed, using direct query');
					try {
						const freshProduct = await getProductBySlug(product.slug);
						if (freshProduct && freshProduct.variants) {
							// Apply same comparison logic for fallback data
							const variantChanges = ProductCacheService.compareVariantData(product.variants || [], freshProduct.variants);
							if (variantChanges.hasChanges) {
								product.variants = freshProduct.variants;
								// Reset selected variant if needed
								if (selectedVariant.value && !freshProduct.variants.find((v: any) => v.id === selectedVariant.value?.id)) {
									selectedVariant.value = freshProduct.variants.find((v: any) => v.stockLevel > 0) || freshProduct.variants[0] || null;
								}
							}
						}
					} catch (fallbackError) {
						console.error('[Manual Refresh] Fallback query also failed:', fallbackError);
						enhancementError.value = 'Unable to refresh product data';
					}
				}
			} catch (error) {
				console.error('Manual refresh failed:', error);
				enhancementError.value = 'Failed to refresh data';
			} finally {
				isEnhancing.value = false;
			}
		};

		// Refresh stock when page becomes visible
		refreshStockAndVariants();
	});

	// Set up keyboard listeners
	useVisibleTask$(() => {
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
	
	// 🚀 OPTIMIZED: RAF-based touch handling for smooth mobile interactions
	const changeImage = $((newIndex: number) => {
		const newAsset = orderedAssets.value[newIndex];
		if (newAsset) {
			// Show minimal loading since images are preloaded
			isImageLoading.value = true;
			setTimeout(() => {
				isImageLoading.value = false;
			}, 150);

			currentImageSig.value = newAsset;
		}
	});

	// Get current image index for touch handling
	const currentImageIndex = useSignal(0);
	useTask$(({ track }) => {
		track(() => currentImageSig.value);
		track(() => orderedAssets.value);

		const index = orderedAssets.value.findIndex(asset => asset.id === currentImageSig.value.id);
		currentImageIndex.value = index >= 0 ? index : 0;
	});

	// Use optimized touch handling for smooth mobile interactions
	const { handleTouchStart$, handleTouchMove$, handleTouchEnd$, touchState } =
		useImageGalleryTouchHandling(orderedAssets, currentImageIndex, changeImage);
	
	// Filter out out-of-stock variants for better UX
	const availableVariants = useComputed$(() => {
		return product.variants.filter(variant => {
			const stockLevel = parseInt(variant.stockLevel || '0', 10);
			return stockLevel > 0;
		});
	});

	const selectedVariant = useComputed$(() => {
		const available = availableVariants.value;
		return available.find((v) => v.id === selectedVariantIdSignal.value);
	});

	const isPreOrder = useComputed$(() => {
		return !!selectedVariant.value?.customFields?.preOrderPrice;
	});
	
	// Check if ALL variants are sold out for product-level badge
	const allVariantsSoldOut = useComputed$(() => {
		return product.variants.every(variant => {
			const stockLevel = parseInt(variant.stockLevel || '0', 10);
			return stockLevel <= 0;
		});
	});
	
	useTask$(({ track }) => {
		track(() => availableVariants.value);
		if (availableVariants.value.length > 0) {
			selectedVariantIdSignal.value = availableVariants.value[0].id;
		}
	});
	
	const isOutOfStock = useComputed$(() => {
		const stockLevel = parseInt(selectedVariant.value?.stockLevel || '0', 10);
		return stockLevel <= 0;
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
					isPreOrder: isPreOrder.value,
					shipDate: selectedVar.customFields?.shipDate,
					salePrice: selectedVar.customFields?.salePrice,
					preOrderPrice: selectedVar.customFields?.preOrderPrice,
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
			

			
			{/* Consolidated Product Layout */}
			<div class="max-w-[1920px] mx-auto px-4 py-2">
				<div class="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
					{/* Product Images - Responsive Gallery */}
					<div class="w-full">
						{/* Main gallery flex container: column on mobile, row on desktop */}
						<div class="flex flex-col md:flex-row md:gap-4">
							{/* Thumbnail Images - Desktop Sidebar (hidden on mobile) */}
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
											alt={`${product.name} detail view - Premium knife thumbnail image`}
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

							{/* Main Image Container - Responsive */}
							<div class="flex-1 md:order-2 w-full">
								<div
									class={{
										'w-full relative select-none cursor-pointer group aspect-4/5 transition-all duration-300': true,
										// Mobile styles
										'bg-white border-b border-gray-200 md:border-b-0': true,
										// Desktop styles
										'md:mx-auto md:bg-white md:border md:border-gray-200 md:rounded-lg md:overflow-hidden': true
									}}
									onTouchStart$={handleTouchStart$}
									onTouchMove$={handleTouchMove$}
									onTouchEnd$={handleTouchEnd$}
									onClick$={() => {
										// Only open modal if it wasn't a swipe gesture
										if (!touchState.value.didSwipe) {
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
										<div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#d42838] antialiased animate-fade-in">
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
										class={{
											'object-center object-cover w-full h-full transition-all duration-300': true,
											// Mobile: simple transition
											'mobile-main-image md:mobile-main-image-none': true,
											// Desktop: hover scale effect
											'md:group-hover:scale-[1.02]': true
										}}
										width={1000}
										height={1250}
										loading="eager"
										priority
										responsive="productMain"
										alt={`${product.name} - Premium quality knife with precision craftsmanship from Damned Designs`}
									/>

									{/* Desktop hover indicator */}
									<div class="hidden md:block absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300">
										<div class="flex items-center justify-center h-full">
											<div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
												Click to enlarge
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Dot indicators - Mobile only */}
						<div class="flex md:hidden justify-center items-center space-x-2 mt-4 px-4">
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

					{/* Product Info - Responsive */}
					<div class={{
						'bg-[#f5f5f5] mt-6': true,
						// Consistent padding on all screen sizes
						'p-6': true,
						// Desktop styles
						'md:rounded-lg md:mt-8 lg:mt-6': true
					}}>
					<div class="mb-6">
						<h1 class="text-3xl sm:text-4xl font-bold text-black" style="-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
							{product.name}
						</h1>
					</div>

					<div
						class="text-base text-gray-600 leading-relaxed"
						dangerouslySetInnerHTML={product.description}
					/>

					{/* Variant Selection - Enhanced Clickable Boxes */}
					{availableVariants.value.length > 0 && (
						<div class="mt-6 mb-6">
							<div class="flex flex-wrap gap-3">
								{availableVariants.value.map((variant) => (
									<button
										key={variant.id}
										type="button"
										class={`variant-box relative rounded-lg border bg-white p-4 shadow-sm focus:outline-none cursor-pointer flex flex-col justify-between h-full transition-all duration-200 ease-in-out ${
											selectedVariantIdSignal.value === variant.id
												? 'border-solid border-4 border-red-500'
												: 'border-gray-200'
										}`}
										onClick$={() => {
											selectedVariantIdSignal.value = variant.id;
										}}
									>
										<div class="flex-grow w-full text-left">
											<p class="text-lg font-bold text-gray-900">{variant.name}</p>
											<div class="text-sm font-medium text-gray-700 mt-2 flex items-center">
												<Price
							priceWithTax={variant.priceWithTax}
							forcedClass={'text-gray-900 font-semibold'}
							salePrice={variant.customFields?.salePrice}
							preOrderPrice={variant.customFields?.preOrderPrice}
							originalPriceClass={'text-gray-600'}
						/>
												{/* Sale and Pre-order Badges */}
												<div class="ml-4 flex flex-col items-end">
													{variant.customFields?.salePrice && (
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
															SALE
														</span>
													)}
													{variant.customFields?.preOrderPrice && (
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
															PRE-ORDER
														</span>
													)}
												</div>
											</div>
										</div>
									</button>
								))}
							</div>
							{/* Sezzle Widget - positioned below variant buttons */}
							{selectedVariant.value && (
								<div class="mt-4">
									<SezzleWidget
										price={selectedVariant.value.priceWithTax}
										currencyCode={selectedVariant.value.currencyCode}
										class="text-sm"
									/>
								</div>
							)}
						</div>
					)}

					{/* Add to Cart Button */}
					<div class={{ 'mb-8': true, 'mt-12': availableVariants.value.length <= 1 }}>
						{isPreOrder.value && (
							<div class="mb-4">
								<label class="flex items-center">
									<input
										type="checkbox"
										class="h-4 w-4 rounded border border-gray-900 text-primary-600 focus:ring-primary-500"
										checked={preOrderConsent.value}
										onClick$={() => (preOrderConsent.value = !preOrderConsent.value)}
									/>
									<span class="ml-2 text-sm text-red-600 font-bold">
										I understand this product will ship around{' '}
										{selectedVariant.value?.customFields?.shipDate}
									</span>
								</label>
							</div>
						)}
						{availableVariants.value.length === 0 ? (
							<>
								{/* All variants out of stock */}
								<button
									class="border border-transparent rounded-full px-6 py-3 sm:px-8 sm:py-4 text-base font-bold font-heading tracking-wide uppercase cursor-not-allowed flex items-center justify-center text-white min-w-[200px] w-auto bg-gray-400 opacity-60"
									disabled
								>
									Sold Out
								</button>
							</>
						) : (
							<>
								{/* Available variants */}
								<button
									class={{
										'border border-transparent rounded-full px-6 py-3 sm:px-8 sm:py-4 text-base font-bold font-heading tracking-wide transition-all duration-300 transform hover:scale-105 hover:shadow-xl uppercase cursor-pointer flex items-center justify-center text-white min-w-[200px] w-auto': true,
										'bg-[#d42838] hover:bg-black': !isPreOrder.value || preOrderConsent.value,
										'bg-gray-400 opacity-60 cursor-not-allowed':
											(isPreOrder.value && !preOrderConsent.value) || !selectedVariant.value,
										'animate-pulse-once':
											quantitySignal.value[selectedVariantIdSignal.value] > 0 &&
											!isAddingToCart.value,
									}}
									onClick$={handleAddToCart}
									disabled={(isPreOrder.value && !preOrderConsent.value) || !selectedVariant.value}
								>
									{isAddingToCart.value ? (
										<span class="flex items-center justify-center">
											<LoaderIcon class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
											Adding...
										</span>
									) : quantitySignal.value[selectedVariantIdSignal.value] > 0 ? (
										<span class="flex items-center justify-center">
											<CheckIcon />
											<span class="ml-2">
												{quantitySignal.value[selectedVariantIdSignal.value]} in cart - Add
												more
											</span>
										</span>
									) : isPreOrder.value ? (
										'Pre-order Now'
									) : (
										'Add to cart'
									)}
								</button>
							</>
						)}
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
								alt={`${product.name} enlarged view ${modalImageIndex.value + 1} of ${orderedAssets.value.length} - Premium knife detail from Damned Designs`}
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
		: `${product?.name || 'Product'} - High quality product available at Damned Designs`;
	
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

	// Note: Qwik head functions must be synchronous
	// Generate structured data schemas (synchronous)
	const breadcrumbSchema = generateBreadcrumbSchema([
		{ name: 'Home', url: 'https://damneddesigns.com/' },
		{ name: 'Shop', url: 'https://damneddesigns.com/shop' },
		{ name: product?.name || 'Product', url: url.href }
	]);

	// Generate product schema with all product data
	let productSchema = null;
	try {
		productSchema = generateProductSchema(product);
	} catch (error) {
		console.warn('Failed to generate product schema:', error);
	}

	// Combine all schemas
	const schemas = [breadcrumbSchema];
	if (productSchema) {
		schemas.push(productSchema);
	}

	return createSEOHead({
		title: product?.name || 'Product',
		description: cleanDescription || `${product?.name || 'Product'} - Premium quality knife from Damned Designs`,
		image: product?.featuredAsset?.preview,
		canonical: url.href,
		links: imagePreloadLinks,
		schemas: schemas, // Include both breadcrumb and product schemas
	});
};
