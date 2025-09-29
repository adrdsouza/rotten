import { component$ } from '@qwik.dev/core';
import { LuMail as MailIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<MailIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
