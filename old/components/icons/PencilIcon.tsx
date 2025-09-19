import { component$ } from '@qwik.dev/core';
import { LuPencil as PencilIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<PencilIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
