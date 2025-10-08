import { component$ } from '@qwik.dev/core';

export default component$(() => {
	return (
		<div class="card rounded-2xl overflow-hidden bg-white shadow-soft border border-gray-100 animate-pulse">
			{/* Image Skeleton */}
			<div class="relative aspect-3/4 w-full overflow-hidden bg-gray-200">
				<div class="absolute inset-0 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" style="background-size: 200% 100%;"></div>
			</div>
			
			{/* Content Skeleton */}
			<div class="p-5 space-y-3">
				{/* Title Skeleton */}
				<div class="h-5 bg-gray-200 rounded-lg animate-shimmer" style="background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%;"></div>
				
				{/* Price Skeleton */}
				<div class="h-4 w-20 bg-gray-200 rounded-lg animate-shimmer" style="background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%;"></div>
			</div>
		</div>
	);
});
