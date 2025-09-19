import { component$ } from '@qwik.dev/core';
import { LuMapPin as MapPinIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<MapPinIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
