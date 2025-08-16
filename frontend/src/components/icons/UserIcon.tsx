import { component$ } from '@qwik.dev/core';
import { LuUser as UserIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<UserIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
