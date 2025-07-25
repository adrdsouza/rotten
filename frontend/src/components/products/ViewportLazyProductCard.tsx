import { component$, $, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { OptimizedImage } from '~/components/ui';
import { preloadImage, isImageLikelyCached } from '~/utils/image-cache';
import Price from './Price';
import { Maybe, SearchResultAsset, SearchResultPrice } from '~/generated/graphql';

interface ViewportLazyProductCardProps {
	productAsset?: Maybe<SearchResultAsset>;
	productName: string;
	slug: string;
	priceWithTax: SearchResultPrice;
	currencyCode: string;
	inStock: boolean;
}

export default component$<ViewportLazyProductCardProps>(
	({ productAsset, productName, slug, priceWithTax, currencyCode, inStock }) => {
		// Use placeholder if no product asset is available
		const imageUrl = productAsset?.preview
			? productAsset.preview + '?preset=medium'
			: '/asset_placeholder.webp';

		// 🚀 OPTIMIZED: Check if image is likely cached - if so, show immediately
		const isLikelyCached = imageUrl ? isImageLikelyCached(imageUrl) : false;
		const isVisible = useSignal(isLikelyCached); // Start visible if cached
		const elementRef = useSignal<Element>();

		// Enhanced click handler with image preloading
		const handleCardClick = $(() => {
			// Preload the larger image for the product detail page
			if (productAsset?.preview) {
				const targetImageUrl = productAsset.preview + '?preset=xl';
				preloadImage(targetImageUrl);
			}
		});

		// Viewport intersection observer for lazy loading (only if not cached)
		useVisibleTask$(() => {
			// Skip intersection observer if image is already cached
			if (isLikelyCached || !elementRef.value) return;

			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && !isVisible.value) {
							// Show immediately, browser handles loading
							isVisible.value = true;
							observer.unobserve(entry.target);
						}
					});
				},
				{
					// Start loading 300px before the element becomes visible
					rootMargin: '300px'
				}
			);

			observer.observe(elementRef.value);

			return () => {
				observer.disconnect();
			};
		});
		
		// Skeleton placeholder component
		const SkeletonPlaceholder = component$(() => (
			<div class="rounded-2xl overflow-hidden bg-white shadow-soft border border-gray-100 animate-pulse">
				<div class="relative aspect-4/5 w-full bg-gray-200">
					{/* Shimmer effect */}
					<div 
						class="absolute inset-0 opacity-30"
						style="background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.5) 50%, transparent 75%); background-size: 200% 100%; animation: shimmer 2s infinite;"
					></div>
					
					{/* Bottom content area */}
					<div class="absolute inset-x-0 bottom-0 p-5 space-y-3">
						{/* Product name placeholder */}
						<div class="h-5 bg-gray-300 rounded w-3/4 mx-auto"></div>
						{/* Price placeholder */}
						<div class="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
					</div>
				</div>
			</div>
		));
		
		return (
			<div ref={elementRef} class="group block">
				{!isVisible.value ? (
					<SkeletonPlaceholder />
				) : (
						<Link 
							href={`/products/${slug}/`}
							prefetch 
							class="block" 
							onClick$={handleCardClick}
					>
						<div class="rounded-2xl overflow-hidden bg-white shadow-soft hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-[#B09983] relative before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-r before:from-[#B09983]/0 before:via-[#B09983]/20 before:to-[#B09983]/0 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 before:-z-10">
							{/* Sold Out Badge */}
							{inStock === false && (
								<div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#B09983] antialiased">
									Sold Out
								</div>
							)}
							
							{/* Image Container with Overlay - Full Width */}
							<div class="relative aspect-4/5 w-full overflow-hidden">
								{/* Product Image */}
								<OptimizedImage
									src={imageUrl}
									class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 ease-out"
									width={400}
									height={500}
									loading="lazy"
									responsive="productCard"
									alt={`Image of: ${productName}`}
								/>
								
								{/* Loading placeholder effect */}
								<div class="absolute inset-0 bg-gray-100 animate-pulse opacity-0 transition-opacity duration-300" style="background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 2s infinite;"></div>
								
								{/* Sophisticated Gradient Overlay */}
								<div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								{/* Elegant Bottom Gradient - Always Visible */}
								<div class="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>
								
								{/* Product Info Overlay */}
								<div class="absolute inset-x-0 bottom-0 p-5 flex flex-col text-center">
									<h3
										class="text-white font-bold text-lg tracking-wider truncate w-full drop-shadow-lg mb-2 uppercase transition-all duration-300 group-hover:text-[#B09983] font-heading"
										title={productName}
									>
										{productName}
									</h3>
									<Price
										priceWithTax={priceWithTax}
										currencyCode={currencyCode}
										forcedClass="text-sm font-semibold text-white/90 drop-shadow-md tracking-wider"
									/>
								</div>
							</div>
						</div>
					</Link>
				)}
			</div>
		);
	}
);
