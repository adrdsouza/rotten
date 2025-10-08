import { component$ } from '@qwik.dev/core';
import { EditIcon } from 'lucide-qwik';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<EditIcon class={forcedClass || 'w-6 h-6'} />
	);
});
