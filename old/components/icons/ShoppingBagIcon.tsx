import { component$ } from '@qwik.dev/core';
import { HiShoppingBagOutline } from '@qwikest/icons/heroicons';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<HiShoppingBagOutline
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
