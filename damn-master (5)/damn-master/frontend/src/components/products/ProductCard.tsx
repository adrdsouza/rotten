import { component$, $ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { OptimizedImage } from '~/components/ui';
import { preloadImage } from '~/utils/image-cache';
import { hasProductSale, getSalePrice } from '~/utils/sale-cache';
import { isProductPreOrder, getPreOrderPrice } from '~/utils/pre-order-cache';
import Price from './Price';

export default component$(
	({ productAsset, productName, slug, priceWithTax, inStock, priority = false, productId }: any) => {
		// Use placeholder if no product asset is available
		// ✅ Use the same URL format that gets preloaded for cache consistency
		const imageUrl = productAsset?.preview
			? productAsset.preview // Let OptimizedImage with responsive="productCard" handle the URL generation
			: '/asset_placeholder.webp';
		
		const hasSale = hasProductSale(productId);
		const salePrice = getSalePrice(productId);
		const isPreOrder = isProductPreOrder(productId);
		const preOrderPrice = getPreOrderPrice(productId);
		
		// Enhanced click handler with image preloading
		const handleCardClick = $(() => {
			// Preload the larger image for the product detail page
			if (productAsset?.preview) {
				const targetImageUrl = productAsset.preview + '?preset=xl';
				preloadImage(targetImageUrl);
			}
		});
			
		return (
			<Link 
				href={`/products/${slug}/`} 
				prefetch
				class="group block" 
				onClick$={handleCardClick}
			>
				<div class="rounded-2xl overflow-hidden bg-white shadow-soft hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-[#d42838] relative before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-r before:from-[#d42838]/0 before:via-[#d42838]/20 before:to-[#d42838]/0 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 before:-z-10">
					{/* Sold Out Badge */}
					{inStock === false && (
						<div class="absolute top-3 left-3 z-10 bg-gray-900 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide border border-[#d42838] antialiased">
							Sold Out
						</div>
					)}
					{/* Sale Badge */}
					{hasSale && (
						<div class="absolute top-3 right-3 z-10 bg-red-500 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide antialiased">
							Sale
						</div>
					)}
					{/* Pre-order Badge */}
					{isPreOrder && (
						<div class="absolute top-3 right-3 z-10 bg-green-500 text-white px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wide antialiased">
							Pre-order
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
							loading={priority ? "eager" : "lazy"}
							priority={priority}
							responsive="productCard"
							alt={`${productName} - Premium quality knife ${inStock ? 'in stock' : 'out of stock'} at Damned Designs`}
						/>
						
						{/* Sophisticated Gradient Overlay */}
						<div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
						
						{/* Elegant Bottom Gradient - Always Visible */}
						<div class="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>
						
						{/* Product Info Overlay */}
						<div class="absolute inset-x-0 bottom-0 p-5 flex flex-col text-center">
							<h3
								class="text-white font-bold text-lg tracking-wider truncate w-full drop-shadow-lg mb-2 uppercase transition-all duration-300 group-hover:text-[#d42838] font-heading"
								title={productName}
							>
								{productName}
							</h3>
							<Price
					priceWithTax={priceWithTax}
					forcedClass="text-sm font-semibold text-white/90 drop-shadow-md tracking-wider"
					salePrice={salePrice}
					preOrderPrice={preOrderPrice}
					currencyCode="USD"
				/>
						</div>
					</div>
				</div>
			</Link>
		);
	}
);
