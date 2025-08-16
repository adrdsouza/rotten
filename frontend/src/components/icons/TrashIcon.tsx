import { component$ } from '@qwik.dev/core';
import { LuTrash2 as Trash2Icon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<Trash2Icon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
