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
			<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m6.75 4.5v-3a3 3 0 0 0-3-3H3.75m8.25 0V9a2.25 2.25 0 0 0-2.25-2.25H9.108c-1.029 0-1.979.462-2.638 1.243l-2.616 3.117m9.396-6.235A1.5 1.5 0 0 0 12.375 4.5H9.75m2.625 0a1.5 1.5 0 0 1-1.5 1.5H9.75m2.625-1.5V3c0-.621-.504-1.125-1.125-1.125H9.75A1.125 1.125 0 0 0 8.625 3v1.5m2.625 0c.621 0 1.125.504 1.125 1.125v1.5H9.75v-1.5c0-.621.504-1.125 1.125-1.125" />
		</svg>
	);
});
