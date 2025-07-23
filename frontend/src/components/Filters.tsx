import { component$, QRL } from '@qwik.dev/core';
import { FacetWithValues } from '~/types';

interface FiltersProps {
 facetsWithValues: FacetWithValues[];
 facetValueIds: string[];
 onFilterChange$: QRL<(id: string) => void>;
 searchTerm?: string;
 onSearchChange$?: QRL<(term: string) => void>;
 productCounts?: { [key: string]: number };
}

export default component$<FiltersProps>(({ facetsWithValues, facetValueIds, onFilterChange$, searchTerm, onSearchChange$, productCounts }) => {
 if (!facetsWithValues.length) return null;
 const noFiltersActive = facetValueIds.length === 0;

 return (
 <div class="flex flex-wrap lg:flex-nowrap justify-center gap-x-2 gap-y-2 items-center w-full max-w-none min-w-0">
  <button
  type="button"
  class={`px-4 py-2 rounded-full text-sm font-bold border whitespace-nowrap min-w-[80px] flex items-center justify-center cursor-pointer ${noFiltersActive ? 'bg-[#e34545] text-white border-[#e34545]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
  onClick$={() => {
    onFilterChange$('CLEAR_ALL');
  }}
  >
  All Products
  </button>
  {facetsWithValues.flatMap(facet =>
  facet.values.map(value => (
   <button
   key={value.id}
   type="button"
   class={`px-4 py-2 rounded-full text-sm font-bold border whitespace-nowrap min-w-[80px] flex items-center justify-center cursor-pointer ${value.selected ? 'bg-[#e34545] text-white border-[#e34545]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
   onClick$={() => {
     onFilterChange$(value.id);
   }}
   title={value.name}
   >
   <span class="flex items-center justify-center gap-2">
    <span class="text-center">{value.name}</span>
    {productCounts && productCounts[value.id] !== undefined && (
     <span class={`px-2 py-0.5 text-xs rounded-full font-bold ${value.selected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
      {productCounts[value.id]}
     </span>
    )}
   </span>
   </button>
  ))
  )}
  {onSearchChange$ && (
 <div class="inline-flex rounded-full overflow-hidden border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-[#e34545]/20 focus-within:border-[#e34545] transition-all duration-300 hover:border-gray-400 group">
 <input
  type="text"
  value={searchTerm || ''}
  placeholder="Search..."
  class="px-3 py-2 text-sm font-medium bg-transparent placeholder-gray-500 focus:outline-hidden border-0 pr-1 transition-all duration-200"
  style={{ minWidth: '90px', maxWidth: '120px' }}
  onInput$={(event) => {
  const target = event.target as HTMLInputElement;
  onSearchChange$(target.value);
  }}
 />
 <button
  type="button"
  class={`flex items-center justify-center px-3 transition-all duration-300 focus:outline-hidden cursor-pointer ${searchTerm ? 'bg-[#e34545] hover:bg-[#c73333]' : 'bg-transparent hover:bg-gray-50'}`}
  onClick$={() => searchTerm ? onSearchChange$('') : undefined}
  tabIndex={-1}
  aria-label={searchTerm ? 'Clear search' : 'Search'}
 >
  {!searchTerm && (
  <svg class="h-4 w-4 text-gray-600 transition-colors duration-200 group-hover:text-[#e34545]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
   <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  )}
  {searchTerm && (
  <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
   <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
  )}
 </button>
 </div>
)}
 </div>
 );
});
