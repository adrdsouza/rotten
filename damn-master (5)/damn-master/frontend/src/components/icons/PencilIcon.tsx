import { component$ } from '@qwik.dev/core';
import { PencilIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<PencilIcon class={forcedClass || 'w-6 h-6'} />
	);
});
