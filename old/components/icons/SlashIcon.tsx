import { component$ } from '@qwik.dev/core';
import { LuSlash as SlashIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<SlashIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
