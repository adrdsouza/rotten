import { $, component$, useStore, useTask$ } from '@builder.io/qwik';
import { routeLoader$, useLocation, useNavigate } from '@qwik.dev/router';
import ProductCard from '~/components/products/ProductCard';
import { searchQueryWithTerm } from '~/providers/shop/products/products';
import { FacetWithValues } from '~/types';
import { createSEOHead } from '~/utils/seo';
import { generateBreadcrumbSchema } from '~/services/seo-api.service';
import Filters from '~/components/Filters';

// Define hardcoded filters based on user-provided facet values and desired order
const HARDCODED_SHOP_FILTERS: FacetWithValues[] = [
 {
 id: 'category',
 name: 'Category',
 open: true,
 values: [
  { id: '1', name: 'folding knives', selected: false },
  { id: '3', name: 'fixed blades', selected: false },
  { id: '5', name: 'edc', selected: false },
  { id: '2', name: 'osiris chef knives', selected: false },
  { id: '6', name: 'fidget', selected: false },
  { id: '4', name: 'apparel', selected: false },
 ],
 },
];

// ✅ VENDURE STARTER PATTERN: Load data server-side with automatic caching
export const useSearchLoader = routeLoader$(async ({ url }) => {
 const term = url.searchParams.get('q') || '';
 const facetIds = url.searchParams.getAll('f');
 const inStockOnly = url.searchParams.get('stock') !== 'false';

 const searchResult = await searchQueryWithTerm(
  '',
  term,
  facetIds,
  0,
  1000, // Fetch all products, client-side sort/filter
  inStockOnly
 );

 return {
  search: searchResult,
  searchTerm: term,
  facetIds: facetIds,
  inStockOnly: inStockOnly,
 };
});

export default component$(() => {
 const { url } = useLocation();
 const searchSignal = useSearchLoader();
 const nav = useNavigate();

 // Pre-compute facet values once
 const initialFacetValues = HARDCODED_SHOP_FILTERS.map(facet => ({
  ...facet,
  values: facet.values.map(value => ({
   ...value,
   selected: false  // No filters selected by default
  })),
 }));

 const state = useStore<{
  showMenu: boolean;
  facetValues: FacetWithValues[];
 }>({
  showMenu: false,
  facetValues: initialFacetValues,
 });

 // Update facet values when URL changes
 useTask$(async ({ track }) => {
  track(() => url.href);
  
  const currentFacetIds = searchSignal.value.facetIds || [];
  const activeFacetId = currentFacetIds.length > 0 ? currentFacetIds[0] : null;
  
  state.facetValues = HARDCODED_SHOP_FILTERS.map(facet => ({
   ...facet,
   values: facet.values.map(value => ({
    ...value,
    selected: activeFacetId === value.id
   })),
  }));
 });

 // ✅ BETTER: Compute display products on-demand (no state mutation)
 const getDisplayProducts = () => {
  // Guard against undefined search results
  if (!searchSignal.value.search?.items) {
   return { products: [], count: 0 };
  }

  let displayProducts = searchSignal.value.search.items;

  // Sort: in-stock first, then by newest products (highest product ID first)
  displayProducts = displayProducts.sort((a, b) => {
   // First priority: in-stock products
   if (a.inStock && !b.inStock) return -1;
   if (!a.inStock && b.inStock) return 1;

   // Second priority: newest products first (higher product ID = newer)
   return parseInt(b.productId) - parseInt(a.productId);
  });

  return { products: displayProducts, count: displayProducts.length };
 };

 const onFilterChange = $((id: string) => {
  const newUrl = new URL(url.href);
  if (id === 'CLEAR_ALL') {
   newUrl.searchParams.delete('f');
  } else {
   // Only one facet can be active at a time
   newUrl.searchParams.set('f', id);
  }
  nav(newUrl.href);
 });

 const onSearchChange = $((newTerm: string) => {
  const newUrl = new URL(url.href);
  if (newTerm) {
   newUrl.searchParams.set('q', newTerm);
  } else {
   newUrl.searchParams.delete('q');
  }
  nav(newUrl.href);
 });

 const onInStockChange = $((inStock: boolean) => {
  const newUrl = new URL(url.href);
  if (!inStock) {
   newUrl.searchParams.set('stock', 'false');
  } else {
   newUrl.searchParams.delete('stock');
  }
  nav(newUrl.href);
 });

 // ✅ Compute display products on-demand (no state mutation)
 const displayData = getDisplayProducts();
 const displayProducts = displayData.products;
 const displayCount = displayData.count;

 return (
  <div class="bg-linear-to-br from-gray-50 via-white to-gray-50 min-h-screen relative overflow-hidden">
   <div class="absolute inset-0 opacity-[0.02] pointer-events-none">
    <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0); background-size: 40px 40px;"></div>
   </div>
   
   <div
   class="relative max-w-content-wide mx-auto px-4 sm:px-6 lg:px-8 py-6"
   onKeyDown$={(event: KeyboardEvent) => {
    if (event.key === 'Escape') {
    state.showMenu = false;
    }
   }}
   >
   <div class="mb-3">
    <Filters
     facetsWithValues={state.facetValues}
     facetValueIds={searchSignal.value.facetIds}
     onFilterChange$={onFilterChange}
     searchTerm={searchSignal.value.searchTerm}
     onSearchChange$={onSearchChange}
    />
   </div>

   {/* Combined In-Stock Toggle and Product Count */}
   <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-4">
     <label class="inline-flex items-center cursor-pointer">
      <input
       type="checkbox"
       class="sr-only"
       checked={searchSignal.value.inStockOnly}
       onChange$={(e) => {
        const checked = (e.target as HTMLInputElement).checked;
        onInStockChange(checked);
       }}
      />
      <div class={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
       searchSignal.value.inStockOnly ? 'bg-[#d42838]' : 'bg-gray-200'
      }`}>
       <div class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
        searchSignal.value.inStockOnly ? 'translate-x-5' : 'translate-x-0'
       }`}></div>
      </div>
     </label>
     
     <p class="text-sm text-gray-600 font-medium">
      <span>
        {searchSignal.value.inStockOnly ? (
          <>
            Showing <span class="font-bold text-gray-900">{displayCount}</span>{' '}
            <span class="font-bold text-green-600">in stock</span>{' '}
            {displayCount === 1 ? 'product' : 'products'}
          </>
        ) : (
          <>
            Shows <span class="font-bold text-gray-900">{displayCount}</span> of{' '}
            <span class="font-bold text-red-600">out of stock</span>{' '}
            {displayCount === 1 ? 'product' : 'products'}
          </>
        )}
        {searchSignal.value.searchTerm && (
          <span class="text-[#d42838] font-medium"> for "{searchSignal.value.searchTerm}"</span>
        )}
      </span>
    </p>
    </div>
    
    {searchSignal.value.search.totalItems > 0 && (
     <div class="flex items-center text-sm text-gray-500 min-w-0">
      <span class="hidden sm:inline truncate">
       {searchSignal.value.facetIds.length > 0 ? (
        <>Premium {state.facetValues.flatMap(facet =>
         facet.values.filter(value => searchSignal.value.facetIds.includes(value.id))
        ).map(value => value.name).join(', ')}</>
       ) : (
        'Premium collection'
       )}
      </span>
      <div class="flex items-center ml-2 shrink-0">
       <div class="w-1.5 h-1.5 bg-[#d42838] rounded-full"></div>
      </div>
     </div>
    )}
   </div>
   
   <div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
    {displayProducts.length === 0 ? (
     <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
       <svg class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6M12 8v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
       </svg>
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">No products found</h3>
      <p class="text-gray-600 mb-6 max-w-sm">
       {searchSignal.value.searchTerm ? `We couldn't find any products matching "${searchSignal.value.searchTerm}".` : 'No products match your current filters.'}
      </p>
      <button
       class="px-6 py-3 bg-[#d42838] text-white rounded-full font-bold hover:bg-[#c73333] transition-colors duration-300 shadow-lg hover:shadow-xl cursor-pointer"
       onClick$={() => {
        const newUrl = new URL(url.href);
        newUrl.searchParams.delete('f');
        newUrl.searchParams.delete('q');
        nav(newUrl.href);
       }}
      >
       Clear all filters
      </button>
     </div>
    ) : (
     <>
     {displayProducts.map((item, index) => {
        // Load all products immediately - avoid CSP-related issues
        return (
         <ProductCard
          key={item.productId}
          productAsset={item.productAsset}
          productName={item.productName}
          slug={item.slug}
          priceWithTax={item.priceWithTax}
          inStock={item.inStock}
          productId={item.productId}
          priority={index < 8} // First 8 get priority loading
         />
        );
      })}
     </>
    )}
   </div>

  </div>
 </div>
 );
});

export const head = ({ url }: { url: URL }) => {
	const searchTerm = url.searchParams.get('q') || '';

	// Generate breadcrumb schema for shop page
	const breadcrumbSchema = generateBreadcrumbSchema([
		{ name: 'Home', url: 'https://damneddesigns.com/' },
		{ name: searchTerm ? `Search: ${searchTerm}` : 'Shop', url: url.href }
	]);

	return createSEOHead({
		title: searchTerm ? `Search results for "${searchTerm}"` : 'Shop All Premium Knives & Tools',
		description: searchTerm
			? `Find products matching "${searchTerm}" in our premium collection of handcrafted knives and tools.`
			: 'Browse our complete collection of premium handcrafted knives and everyday carry tools. Find the perfect blade for collectors and professionals.',
		canonical: url.href,
		schemas: [breadcrumbSchema],
	});
};
