import { component$ } from '@qwik.dev/core';
import { ChevronDownIcon } from 'lucide-qwik';

export default component$<{ class?: string }>(({ class: className }) => {
	return (
		<ChevronDownIcon class={className || "w-5 h-5"} />
	);
});
