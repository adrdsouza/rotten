import { component$ } from '@qwik.dev/core';
import { XIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<XIcon class={forcedClass || 'w-6 h-6'} />
	);
});
