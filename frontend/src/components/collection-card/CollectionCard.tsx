import { component$, $ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { OptimizedImage } from '~/components/ui';
import { Collection } from '~/generated/graphql';
import { isImageCached } from '~/utils/image-cache';

interface IProps {
	collection: Collection;
}

export default component$(({ collection }: IProps) => {
	// Image preloading function for collection links
	const handleCollectionClick = $(() => {
		// Preload the larger image that will be shown on the collection page
		const targetImageUrl = collection.featuredAsset?.preview ? 
			collection.featuredAsset.preview.replace('?preset=', '?preset=large') : 
			'/asset_placeholder.webp';
		
		isImageCached(targetImageUrl).then((cached) => {
			if (!cached) {
				const img = new Image();
				img.src = targetImageUrl;
			}
		});
	});

	return (
		<Link 
			href={`/collections/${collection.slug}`} 
			key={collection.id} 
			class="group block"
			onClick$={handleCollectionClick}
		>
			<div class="card">
				<div class="relative aspect-4/5 overflow-hidden">					<OptimizedImage
						width={400}
						height={500}
						src={collection.featuredAsset?.preview || '/asset_placeholder.webp'}
						alt={`Image of: ${collection.name}`}
						class="w-full h-full object-cover"
						loading="lazy"
					/>
				</div>

				{/* Content */}
				<div class="p-4">
					<h3 class="text-black text-lg font-bold mb-1">{collection.name}</h3>
					<p class="text-gray-600 text-sm">Explore Collection</p>
				</div>
			</div>
		</Link>
	);
});
