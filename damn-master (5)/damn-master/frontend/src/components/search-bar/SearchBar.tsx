import { component$ } from '@qwik.dev/core';
import { SearchIcon } from 'lucide-qwik';

export default component$(() => {
	return (
		<form action="/search" class="relative">
			<div class="relative">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<SearchIcon class="h-5 w-5 text-slate-400" />
				</div>
				<input
					type="search"
					name="q"
					default-value={''}
					placeholder={`Search custom knives...`}
					autoComplete="off"
					class="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white/80 backdrop-blur-xs transition-all duration-200"
				/>
			</div>
		</form>
	);
});
