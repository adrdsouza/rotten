import { component$ } from '@qwik.dev/core';
import { LuShieldCheck as ShieldCheckIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<ShieldCheckIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
