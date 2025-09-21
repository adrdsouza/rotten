import { component$ } from '@qwik.dev/core';
import { LuEye as EyeIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<EyeIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
