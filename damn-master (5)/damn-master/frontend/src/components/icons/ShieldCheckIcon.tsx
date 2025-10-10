import { component$ } from '@qwik.dev/core';
import { ShieldCheckIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<ShieldCheckIcon class={forcedClass || 'w-6 h-6'} />
	);
});
