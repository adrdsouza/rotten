import { component$ } from '@qwik.dev/core';
import { StarIcon } from 'lucide-qwik';
import { Review } from '~/types';

export default component$<{ rating: number; review: Review }>(({ review, rating }) => {
	return (
		<StarIcon
			class={`${
				review.rating > rating ? 'text-yellow-400 fill-current' : 'text-gray-200'
			} h-5 w-5 shrink-0`}
		/>
	);
});
