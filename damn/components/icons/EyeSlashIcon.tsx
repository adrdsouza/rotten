import { component$ } from '@qwik.dev/core';
import { EyeOffIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<EyeOffIcon class={forcedClass || 'w-6 h-6'} />
	);
});
