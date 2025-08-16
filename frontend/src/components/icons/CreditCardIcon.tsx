import { component$ } from '@qwik.dev/core';
import { LuCreditCard as CreditCardIcon } from '@qwikest/icons/lucide';

export default component$<{ forcedClass?: string }>(({ forcedClass }) => {
	return (
		<CreditCardIcon
			class={forcedClass || 'w-6 h-6'}
		/>
	);
});
