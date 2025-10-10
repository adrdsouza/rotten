import { component$ } from '@qwik.dev/core';
import { CheckCircleIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<CheckCircleIcon class={forcedClass || 'h-5 w-5 text-primary-600'} />
	);
});
