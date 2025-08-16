import { component$ } from '@qwik.dev/core';
import { LuEyeOff as EyeOffIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<EyeOffIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
