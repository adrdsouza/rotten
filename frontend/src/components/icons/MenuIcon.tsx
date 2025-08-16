import { component$ } from '@qwik.dev/core';
import { LuMenu as MenuIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<MenuIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
