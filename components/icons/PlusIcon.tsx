import { component$ } from '@qwik.dev/core';
import { LuPlus as PlusIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<PlusIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
