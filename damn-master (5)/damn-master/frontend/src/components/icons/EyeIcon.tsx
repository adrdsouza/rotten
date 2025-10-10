import { component$ } from '@qwik.dev/core';
import { EyeIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<EyeIcon class={forcedClass || 'w-6 h-6'} />
	);
});
