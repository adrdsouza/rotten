import { component$ } from '@qwik.dev/core';
import { LuStar as StarIcon } from '@qwikest/icons/lucide';
import { Review } from '~/types';

export const calculateAverageRating = (reviews: Review[]): number => {
	if (reviews.length === 0) return 0;
	const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
	return sum / reviews.length;
};

export default component$<{ filled: boolean }>(({ filled }) => {
	return (
		<StarIcon
			class={`w-5 h-5 ${filled ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
		/>
	);
});
