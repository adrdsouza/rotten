import { component$ } from '@qwik.dev/core';
import { LuLock as LockIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<LockIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
