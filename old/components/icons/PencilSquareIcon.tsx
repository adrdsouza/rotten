import { component$ } from '@qwik.dev/core';
import { LuFileEdit as EditIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<EditIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
