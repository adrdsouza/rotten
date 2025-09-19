import { component$ } from '@qwik.dev/core';
import { LuX as XIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<XIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
