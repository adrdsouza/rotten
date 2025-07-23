import { component$ } from '@qwik.dev/core';

export default component$<{ class?: string }>(({ class: className }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class={className || "w-5 h-5"}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
		</svg>
	);
});
