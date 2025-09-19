import { component$ } from '@qwik.dev/core';
import { LuCheck as CheckIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<CheckIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
