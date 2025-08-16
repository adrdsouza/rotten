import { component$ } from '@qwik.dev/core';
import { LuHome as HomeIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<HomeIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
