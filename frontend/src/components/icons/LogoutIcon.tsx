import { component$ } from '@qwik.dev/core';
import { LuLogOut as LogOutIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<LogOutIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
