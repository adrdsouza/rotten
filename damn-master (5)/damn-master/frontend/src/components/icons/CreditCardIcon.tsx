import { component$ } from '@qwik.dev/core';
import { CreditCardIcon } from 'lucide-qwik';

export default component$<{ class?: string }>(({ class: className }) => {
	return (
		<CreditCardIcon class={className || "w-5 h-5"} />
	);
});
