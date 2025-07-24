import { $, component$, useStore, useTask$ } from '@builder.io/qwik';
import { routeLoader$, useLocation } from '@qwik.dev/router';
import ProductCard from '~/components/products/ProductCard';
import ProductSkeleton from '~/components/ui/ProductSkeleton';
import { SearchResponse } from '~/generated/graphql';
import { searchQueryWithTerm, searchOptimized } from '~/providers/shop/products/products';
import { FacetWithValues } from '~/types';
import { createSEOHead } from '~/utils/seo';
// import Filters from '~/components/Filters'; // COMMENTED OUT: Not needed for clothing brand with only 2 products

// Define hardcoded filters for clothing categories
const HARDCODED_SHOP_FILTERS: FacetWithValues[] = [
 {
 id: 'category',
 name: 'Category',
 open: true,
 values: [
  { id: '1', name: 'shirts', selected: false },
  { id: '2', name: 'pants', selected: false },
  { id: '3', name: 'kimonos', selected: false },
  { id: '4', name: 'dresses', selected: false },
  { id: '5', name: 'jackets', selected: false },
 ],
 },
];

// Extract only serializable data from GraphQL responses to prevent Q17 serialization errors
const extractSerializableSearchData = (searchResponse: SearchResponse) => ({
 totalItems: searchResponse.totalItems,
 items: searchResponse.items.map(item => ({
  productId: item.productId,
  productName: item.productName,
  slug: item.slug,
  currencyCode: item.currencyCode,
  inStock: item.inStock,
  productAsset: item.productAsset ? {
   id: item.productAsset.id,
   preview: item.productAsset.preview
  } : null,
  priceWithTax: typeof item.priceWithTax === 'object' && 'value' in item.priceWithTax
   ? item.priceWithTax.value
   : (item.priceWithTax as any)?.min || 0
 }))
});

// ✅ VENDURE STARTER PATTERN: Load data server-side with automatic caching
export const useSearchLoader = routeLoader$(async ({ query }) => {
 const searchTerm = query.get('q') || '';
 const facetIds = query.get('f')?.split(',').filter(Boolean) || [];
 const inStockOnly = query.get('stock') === 'true';

 try {
  // Load actual search data server-side (cached by Qwik routing)
  const searchData = await searchOptimized({
   collectionSlug: '',
   term: searchTerm,
   facetValueFilters: facetIds.length > 0 ? [{ or: facetIds }] : [],
   skip: 0,
   take: 24
  });

  return {
   searchTerm,
   facetIds,
   inStockOnly,
   search: extractSerializableSearchData(searchData as SearchResponse)
  };
 } catch (_error) {
  // Fallback to original method
  try {
   const searchData = await searchQueryWithTerm('', searchTerm, facetIds, 0, 24);
   return {
    searchTerm,
    facetIds,
    inStockOnly,
    search: extractSerializableSearchData(searchData as SearchResponse)
   };
  } catch (_fallbackError) {
   return {
    searchTerm,
    facetIds,
    inStockOnly,
    search: { items: [], totalItems: 0 }
   };
  }
 }
});

export default component$(() => {
 const { url } = useLocation();
 const searchSignal = useSearchLoader();

 // 🚀 VENDURE STARTER PATTERN: Initialize with server-loaded data
 const initialFacetIds = searchSignal.value.facetIds || [];
 const initialSearchTerm = searchSignal.value.searchTerm || '';
 const initialInStockOnly = searchSignal.value.inStockOnly || true;

 // Pre-compute facet values once
 const initialFacetValues = HARDCODED_SHOP_FILTERS.map(facet => ({
  ...facet,
  values: facet.values.map(value => ({
   ...value,
   selected: initialFacetIds.includes(value.id)
  })),
 }));

 const state = useStore<{
 showMenu: boolean;
 search: ReturnType<typeof extractSerializableSearchData>;
 allPossibleFacetValues: FacetWithValues[];
 facetValues: FacetWithValues[];
 facetValueIds: string[];
 searchTerm: string;
 isLoading: boolean;
 inStockOnly: boolean;
 }>({
 showMenu: false,
 search: searchSignal.value.search, // ✅ Use server-loaded data
 allPossibleFacetValues: HARDCODED_SHOP_FILTERS,
 facetValueIds: initialFacetIds,
 facetValues: initialFacetValues,
 searchTerm: initialSearchTerm,
 isLoading: false, // ✅ Data already loaded server-side
 inStockOnly: initialInStockOnly,
 });

 // ✅ BETTER: Compute display products on-demand (no state mutation)
 const getDisplayProducts = () => {
  // Guard against undefined search results
  if (!state.search?.items) {
   return { products: [], count: 0 };
  }

  let displayProducts = state.search.items;

  // Apply in-stock filter if enabled
  if (state.inStockOnly) {
   displayProducts = displayProducts.filter(product => product.inStock);
  }

  // Sort: in-stock first, then alphabetically
  displayProducts = displayProducts.sort((a, b) => {
   // First priority: in-stock products
   if (a.inStock && !b.inStock) return -1;
   if (!a.inStock && b.inStock) return 1;

   // Second priority: alphabetical by product name
   return a.productName.localeCompare(b.productName);
  });

  return { products: displayProducts, count: displayProducts.length };
 };



 // ✅ VENDURE STARTER PATTERN: Only reload when URL params change
 useTask$(async ({ track }) => {
  // Track URL changes for search term and filters
  track(() => url.searchParams.get('q'));
  track(() => url.searchParams.get('f'));
  track(() => url.searchParams.get('stock'));

  const searchTerm = url.searchParams.get('q') || '';
  const facetIds = url.searchParams.get('f')?.split(',').filter(Boolean) || [];
  const inStockOnly = url.searchParams.get('stock') === 'true';

  // Only reload if params actually changed
  if (searchTerm !== state.searchTerm ||
      JSON.stringify(facetIds) !== JSON.stringify(state.facetValueIds) ||
      inStockOnly !== state.inStockOnly) {

   state.isLoading = true;
   // Use the same search logic as routeLoader$
   try {
    const searchData = await searchOptimized({
     collectionSlug: '',
     term: searchTerm,
     facetValueFilters: facetIds.length > 0 ? [{ or: facetIds }] : [],
     skip: 0,
     take: 24
    });
    state.search = extractSerializableSearchData(searchData as SearchResponse);
   } catch (_error) {
    try {
     const searchData = await searchQueryWithTerm('', searchTerm, facetIds, 0, 24);
     state.search = extractSerializableSearchData(searchData as SearchResponse);
    } catch (_fallbackError) {
     state.search = { items: [], totalItems: 0 };
    }
   }
   state.isLoading = false;
  }
 });

 // ❌ REMOVED: This was causing infinite re-renders!
 // Don't call updateDisplayProducts() on mount - it mutates state and triggers re-renders
 // It will be called after data loads in loadInitialData()

 // Search function without pagination
 const searchProducts = $((facetValueIds: string[], searchTerm: string) => {
 return new Promise<void>((resolve) => {
  setTimeout(async () => {
   state.isLoading = true;

   try {
    // 🚀 OPTIMIZED: Use fresh search for real-time stock accuracy
    const result = await searchOptimized({
     collectionSlug: '',
     term: searchTerm,
     facetValueFilters: facetValueIds.length > 0 ? [{ or: facetValueIds }] : [],
     skip: 0,
     take: 1000
    });
    // Extract only serializable data
    state.search = extractSerializableSearchData(result);
   } catch (error) {
    console.warn('Optimized search failed, using fallback:', error);
    // Fallback to original search
    try {
     const result = await searchQueryWithTerm('', searchTerm, facetValueIds, 0, 1000);
     // Extract only serializable data
     state.search = extractSerializableSearchData(result);
    } catch (fallbackError) {
     console.error('Search error:', fallbackError);
    }
   } finally {
    state.isLoading = false;
    resolve();
   }
  }, 300); // 300ms debounce
 });
 });

 // ❌ REMOVED: This useTask$ was causing infinite loops!
 // The search functionality is already handled properly in onFilterChange and onSearchChange
 // No need for this useTask$ that was tracking state changes and mutating state again



 const _onFilterChange = $(async (id: string) => {
 const currentActiveIds = state.facetValueIds;
 let newActiveIds: string[] = currentActiveIds;

 if (id === 'CLEAR_ALL') {
  newActiveIds = [];
 } else {
  // Single selection mode - replace current selection
  newActiveIds = [id];
 }

 // Update client-side state immediately for instant UI feedback
 state.facetValueIds = newActiveIds;

 // Update facet values display immediately
 state.facetValues = state.allPossibleFacetValues.map(facet => ({
  ...facet,
  values: facet.values.map(value => ({
   ...value,
   selected: newActiveIds.includes(value.id),
  })),
 }));

 // Trigger search with new filters
 await searchProducts(newActiveIds, state.searchTerm);
 });

 const _onSearchChange = $(async (newTerm: string) => {
 // Update client-side state immediately
 state.searchTerm = newTerm;

 // Trigger search with new term
 await searchProducts(state.facetValueIds, newTerm);
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
  {/* COMMENTED OUT: Filters not needed for clothing brand with only 2 products
  <div class="mb-3">
   <Filters
    facetsWithValues={state.facetValues}
    facetValueIds={state.facetValueIds}
    onFilterChange$={onFilterChange}
    searchTerm={state.searchTerm}
    onSearchChange$={onSearchChange}
   />
  </div>
  */}

  {/* Combined In-Stock Toggle and Product Count */}
  <div class="mb-4 flex items-center justify-between">
   <div class="flex items-center gap-4">
    <label class="inline-flex items-center cursor-pointer">
     <input
      type="checkbox"
      class="sr-only"
      checked={state.inStockOnly}
      onChange$={(e) => {
        state.inStockOnly = (e.target as HTMLInputElement).checked;
        // No need to call updateDisplayProducts - getDisplayProducts() will compute on-demand
      }}
     />
     <div class={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
       state.inStockOnly ? 'bg-[#e34545]' : 'bg-gray-200'
     }`}>
      <div class={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
        state.inStockOnly ? 'translate-x-5' : 'translate-x-0'
      }`}></div>
     </div>
    </label>
    
    <p class="text-sm text-gray-600 font-medium">
     {state.isLoading ? (
      <span class="inline-flex items-center">
       <div class="w-4 h-4 border-2 border-gray-300 border-t-[#e34545] rounded-full animate-spin mr-2"></div>
       Loading premium collection...
      </span>
     ) : (
      <span>
       Showing <span class="font-bold text-gray-900">{displayCount}</span>{' '}
       {state.inStockOnly ? 'in-stock' : 'all'} {displayCount === 1 ? 'product' : 'products'}
       {state.searchTerm && <span class="text-[#e34545] font-medium"> for "{state.searchTerm}"</span>}
      </span>
     )}
    </p>
   </div>
   
   {!state.isLoading && state.search.totalItems > 0 && (
    <div class="flex items-center text-sm text-gray-500 min-w-0">
     <span class="hidden sm:inline truncate">
      {state.facetValueIds.length > 0 ? (
       <>Premium {state.facetValues.flatMap(facet => 
        facet.values.filter(value => state.facetValueIds.includes(value.id))
       ).map(value => value.name).join(', ')}</>
      ) : (
       'Premium collection'
      )}
     </span>
     <div class="flex items-center ml-2 shrink-0">
      <div class="w-1.5 h-1.5 bg-[#e34545] rounded-full"></div>
     </div>
    </div>
   )}
  </div>
  
  <div class="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
   {state.isLoading ? (
    Array.from({ length: 8 }, (_, i) => (
     <ProductSkeleton key={`skeleton-${i}`} />
    ))
   ) : displayProducts.length === 0 ? (
    <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
     <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      <svg class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6M12 8v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
     </div>
     <h3 class="text-xl font-bold text-gray-900 mb-2">No products found</h3>
     <p class="text-gray-600 mb-6 max-w-sm">
      {state.searchTerm ? `We couldn't find any products matching "${state.searchTerm}".` : 'No products available at the moment.'}
     </p>
     {/* COMMENTED OUT: No filters to clear for clothing brand with only 2 products
     <button
      class="px-6 py-3 bg-[#e34545] text-white rounded-full font-bold hover:bg-[#c73333] transition-colors duration-300 shadow-lg hover:shadow-xl cursor-pointer"
      onClick$={async () => {
       // Clear all filters and search
       await onFilterChange('CLEAR_ALL');
       state.searchTerm = '';
       await searchProducts([], '');
      }}
     >
      Clear all filters
     </button>
     */}
    </div>
   ) : (
    <>
    {displayProducts.map((item, index) => {
       // 🚀 OPTIMIZED: Use ProductCard for all items - native lazy loading handles viewport detection
       // First 4 items get priority loading for above-the-fold performance
       const isAboveFold = index < 4;

       return (
        <ProductCard
         key={item.productId}
         productAsset={item.productAsset}
         productName={item.productName}
         slug={item.slug}
         priceWithTax={item.priceWithTax}
         currencyCode={item.currencyCode}
         inStock={item.inStock}
         priority={isAboveFold}
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

	return createSEOHead({
		title: searchTerm ? `Search results for "${searchTerm}"` : 'Shop All Premium Clothing',
		description: searchTerm
			? `Find products matching "${searchTerm}" in our premium clothing collection.`
			: 'Browse our complete collection of premium clothing including shirts, pants, kimonos, dresses, and jackets.',
		canonical: url.href,
	});
};
