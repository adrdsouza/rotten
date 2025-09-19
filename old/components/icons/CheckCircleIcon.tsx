import { component$ } from '@qwik.dev/core';
import { LuCheckCircle as CheckCircleIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<CheckCircleIcon
			class={forcedClass || 'h-5 w-5 text-primary-600'}
		/>
	);
});
