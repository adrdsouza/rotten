import { component$ } from '@qwik.dev/core';
import { XCircleIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<XCircleIcon class={forcedClass || 'h-5 w-5 text-red-400'} />
	);
});
