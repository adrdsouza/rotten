import { component$ } from '@qwik.dev/core';
import { TrashIcon } from 'lucide-qwik';

type TrashIconProps = {
class?: string;
forcedClass?: string;
};

export default component$<TrashIconProps>(({ class: customClass, forcedClass }) => {
	return (
 <TrashIcon class={forcedClass || customClass || "h-6 w-6"} />
);
});
