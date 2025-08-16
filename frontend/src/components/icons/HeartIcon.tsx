import { component$ } from '@qwik.dev/core';
import { LuHeart as HeartIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<HeartIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
