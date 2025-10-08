import { component$ } from '@qwik.dev/core';
import { CheckIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<CheckIcon class={forcedClass || 'w-6 h-6'} />
	);
});
