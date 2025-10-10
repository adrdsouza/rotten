import { component$ } from '@qwik.dev/core';
import { LogOutIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<LogOutIcon class={forcedClass} />
	);
});
