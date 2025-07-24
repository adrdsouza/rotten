import { component$, useContext, useSignal, useStore, useTask$, $, useResource$, Resource } from '@qwik.dev/core';
import { useLocation, useNavigate } from '@qwik.dev/router';
import { APP_STATE } from '~/constants';
import { isCheckoutPage } from '~/utils';
import CartContents from '../cart-contents/CartContents';
import CartPrice from '../cart-totals/CartPrice';
import { EligibleShippingMethods } from '~/types';
import { formatPrice } from '~/utils';
import { useLocalCart } from '~/contexts/CartContext';
// import { useCartPerformanceTracking } from '~/hooks/usePerformanceTracking'; // Removed for performance
// Geolocation and customer address loading now handled by centralized addressStorage

// 🚀 PREFETCH OPTIMIZATION: Simplified prefetching using native browser capabilities
// 🚀 OPTIMIZED: Removed prefetch function - now handled by Qwik's built-in Link prefetch

// Local shipping method definitions matching backend codes
const SHIPPING_METHODS = {
  US_PR_UNDER_100: {
    id: 'usps', // Actual backend code
    name: 'USPS First Class',
    description: 'Standard shipping',
    price: 800, // $8.00 in cents
    priceWithTax: 800,
  },
  US_PR_OVER_100: {
    id: 'free-shipping', // Actual backend code
    name: 'Free Shipping',
        price: 0,
    priceWithTax: 0,
  },
  INTERNATIONAL: {
    id: 'usps-int', // Actual backend code
    name: 'USPS First Class International',
    description: 'Flat rate international shipping',
    price: 2000, // $20.00 in cents
    priceWithTax: 2000,
  }
};

export default component$(() => {
	const location = useLocation();
	const navigate = useNavigate();
	const appState = useContext(APP_STATE);
	const localCart = useLocalCart();
	const isInEditableUrl = !isCheckoutPage(location.url.toString());
	
	// Performance tracking for cart operations - DISABLED for performance
	// const performanceTracking = useCartPerformanceTracking();
	
	// Loading state for checkout navigation
	const isNavigatingToCheckout = useSignal(false);
	
	// Local state for country code to ensure UI reactivity
	const countryCodeSignal = useSignal(appState.shippingAddress.countryCode);
	
	// 🚀 OPTIMIZED: Simple country code syncing (geolocation now demand-based)
	useTask$(({ track }) => {
		const countryCode = track(() => appState.shippingAddress.countryCode);

		// Sync country code to local signal for UI reactivity
		if (countryCode && countryCode !== countryCodeSignal.value) {
			countryCodeSignal.value = countryCode;
		}
	});

	// 🚀 OPTIMIZED: Geolocation removed from cart - handled by add-to-cart only
	// This eliminates redundant geolocation calls since add-to-cart already handles it

	// Shipping calculation state
	const shippingState = useStore<{ 
		selectedMethod: EligibleShippingMethods | null; 
		methods: EligibleShippingMethods[];
		isLoading: boolean;
		error: string | null;
		lastCheckedCountry: string;
	}>({ 
		selectedMethod: null,
		methods: [],
		isLoading: false,
		error: null,
		lastCheckedCountry: '',
	});
	
	// Non-blocking shipping calculation using useResource$
	const shippingResource = useResource$(async ({ track }) => {
		const countryCode = track(() => appState.shippingAddress.countryCode);
		const cartVisible = track(() => appState.showCart);
		
		// Get subtotal based on cart mode
		const subTotal = localCart.isLocalMode 
			? track(() => localCart.localCart.subTotal)
			: track(() => appState.activeOrder?.subTotalWithTax || 0);
		
		// Only calculate when cart is visible and we have valid data
		if (!cartVisible || !countryCode || subTotal === 0) {
			// console.log('🚀 Resource: Skipping calculation - cartVisible:', cartVisible, 'countryCode:', countryCode, 'subTotal:', subTotal);
			return null;
		}

		// console.log('🚀 Resource: Calculating shipping for', countryCode, 'with subtotal', subTotal);
		
		try {
			// Determine shipping method based on country and total
			let selectedShippingMethod;
			
			if (countryCode === 'US' || countryCode === 'PR') {
				// US and Puerto Rico shipping logic
				if (subTotal >= 10000) { // $100.00 or more in cents
					selectedShippingMethod = SHIPPING_METHODS.US_PR_OVER_100;
				} else {
					selectedShippingMethod = SHIPPING_METHODS.US_PR_UNDER_100;
				}
			} else {
				// International shipping: flat $20
				selectedShippingMethod = SHIPPING_METHODS.INTERNATIONAL;
			}
			
			// console.log(`✅ Resource: Applied shipping method: ${selectedShippingMethod.name} (${selectedShippingMethod.id})`);

			// Update state synchronously
			shippingState.methods = [selectedShippingMethod as EligibleShippingMethods];
			shippingState.selectedMethod = selectedShippingMethod as EligibleShippingMethods;
			shippingState.lastCheckedCountry = countryCode;
			shippingState.error = null;
			
			return selectedShippingMethod as EligibleShippingMethods;
			
		} catch (error: any) {
			console.error('🚨 Resource: Failed to calculate shipping:', error);
			shippingState.error = error.message || 'Failed to calculate shipping';
			shippingState.methods = [];
			shippingState.selectedMethod = null;
			throw error;
		}
	});
	
	// Country is now initialized on product page
	
	// Simplified calculation state - removed complex queue logic
	const calculationState = useStore({
		isCalculating: false,
		lastCalculationTime: 0,
		MIN_CALCULATION_INTERVAL: 200, // Reduced interval since we're not using complex queuing
	});
	
	// Simplified shipping calculation function - MUST be defined before any code that uses it
	const calculateShipping = $(async (countryCode: string, subTotal: number) => {
		// Protection against invalid inputs and rate limiting
		if (!countryCode || !subTotal) {
			// console.log('Skipping calculation - invalid inputs:', { countryCode, subTotal });
			return;
		}

		// Simple rate limiting to prevent excessive calls
		const now = Date.now();
		if (calculationState.isCalculating || (now - calculationState.lastCalculationTime < calculationState.MIN_CALCULATION_INTERVAL)) {
			// console.log('Skipping calculation - rate limited');
			return;
		}
		
		calculationState.isCalculating = true;
		calculationState.lastCalculationTime = now;
		shippingState.isLoading = true;
		shippingState.error = null;
		
		try {
			// console.log(`Calculating shipping for country ${countryCode} with subtotal ${subTotal}`);
			// console.log('Using local shipping rules, no backend query involved');
			
			// Apply the local shipping rules based on country code and subtotal
			let selectedShippingMethod;
			
			// Check if US or PR
			const isUSorPR = countryCode === 'US' || countryCode === 'PR';
			
			if (isUSorPR) {
				// For US/PR: $8 if under $100, free if $100+
				if (subTotal >= 10000) { // $100 in cents
					selectedShippingMethod = SHIPPING_METHODS.US_PR_OVER_100;
				} else {
					selectedShippingMethod = SHIPPING_METHODS.US_PR_UNDER_100;
				}
			} else {
				// For all other countries: flat $20
				selectedShippingMethod = SHIPPING_METHODS.INTERNATIONAL;
			}
			
			// console.log(`Applied shipping method: ${selectedShippingMethod.name} (${selectedShippingMethod.id})`);

			// Update local shipping state
			shippingState.methods = [selectedShippingMethod as EligibleShippingMethods];
			shippingState.selectedMethod = selectedShippingMethod as EligibleShippingMethods;
			shippingState.lastCheckedCountry = countryCode;
		} catch (error: any) {
			console.error('Failed to apply shipping calculation:', error);
			shippingState.error = error.message || 'Failed to calculate shipping';
			shippingState.methods = [];
			shippingState.selectedMethod = null;
		} finally {
			shippingState.isLoading = false;
			calculationState.isCalculating = false;
		}
	});
	
	// Local state for debouncing dropdown selection
	const dropdownState = useStore({
		pendingCountryCode: '',
		debounceTimer: null as ReturnType<typeof setTimeout> | null,
		DEBOUNCE_DELAY: 500 // 500ms delay to wait for user to finish selecting
	});

	// 🚀 OPTIMIZED: Removed duplicate useTask$ - consolidated above

	// 🚀 OPTIMIZED: Removed heavy prefetching useVisibleTask$ for better performance
	// Prefetching now handled by Qwik's built-in Link prefetch attribute

	// Debounced country change handler to prevent rapid cycling through options
	const handleCountryChange = $(async (countryCode: string) => {
		// console.log('Country selection detected:', countryCode);
		
		// Store the pending selection
		dropdownState.pendingCountryCode = countryCode;
		
		// Clear any existing timer
		if (dropdownState.debounceTimer !== null) {
			clearTimeout(dropdownState.debounceTimer);
		}
		
		// Set a new debounce timer
		dropdownState.debounceTimer = setTimeout(async () => {
			const finalCountryCode = dropdownState.pendingCountryCode;
			
			// Only proceed if a country is selected and different from current
			if (finalCountryCode && finalCountryCode !== appState.shippingAddress.countryCode) {
				// console.log('Applying final country selection:', finalCountryCode);
				// console.log('Before update - Global state:', appState.shippingAddress.countryCode, 'Local signal:', countryCodeSignal.value);

				// Apply the country change to both global and local state
				appState.shippingAddress.countryCode = finalCountryCode;
				countryCodeSignal.value = finalCountryCode;

				// Reset shipping state to force UI update
				shippingState.lastCheckedCountry = '';

				// console.log('After update - Global state:', appState.shippingAddress.countryCode, 'Local signal:', countryCodeSignal.value);
				
				// Store user selection using centralized system
				const { saveUserSelectedCountry } = await import('~/utils/addressStorage');
				saveUserSelectedCountry(finalCountryCode);
				// console.log('✅ Saved user-selected country via centralized system:', finalCountryCode);

				// Find the country name from available countries
				const country = appState.availableCountries.find(c => c.code === finalCountryCode);
				if (country) {
					appState.shippingAddress.country = country.name;
					// console.log('Country name set to:', country.name);
				}
				
				// Calculate shipping after debounce - check local cart mode
				const subtotal = localCart.isLocalMode 
					? localCart.localCart.subTotal 
					: appState.activeOrder?.subTotalWithTax || 0;
				if (subtotal > 0) {
					calculateShipping(finalCountryCode, subtotal);
				}
			}
			
			// Clear timer reference
			dropdownState.debounceTimer = null;
		}, dropdownState.DEBOUNCE_DELAY);
	});
	// 🚀 OPTIMIZED: Removed redundant useTask$ - tracking handled in consolidated task above

	return (
		<div>
			{appState.showCart && (
				<div class="fixed inset-0 overflow-hidden z-50">
					<div class="absolute inset-0 overflow-hidden">
						<div class="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity opacity-100" onClick$={() => (appState.showCart = false)}></div>
						<div class="fixed inset-y-0 right-0 pl-10 max-w-full flex">
							<div class="w-screen max-w-lg"> {/* Changed max-w-md to max-w-lg */}
								<div class="h-full flex flex-col bg-white shadow-2xl overflow-y-scroll">
									<div class="flex-1 py-3 overflow-y-auto px-6 w-full">
										<div class="mt-4">
											{/* Check total quantity based on current mode and if cart is loaded */}
											{(localCart.isLocalMode
												? (localCart.hasLoadedOnce && localCart.localCart.totalQuantity > 0)
												: (appState.activeOrder?.totalQuantity || 0) > 0) ? (
												<CartContents />
											) : (
												<div class="flex flex-col items-center justify-center h-64 text-center">
													<div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
														<svg
															class="w-8 h-8 text-slate-400"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
															></path>
														</svg>
													</div>
													<h3 class="text-lg font-medium text-slate-900 mb-2">Your cart is empty</h3>
													<p class="text-slate-500 mb-6">Add some items to get started</p>
													<button
														class="bg-[#937237] hover:bg-[#CD9E34] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center uppercase font-heading text-sm cursor-pointer"
														onClick$={async () => {
															appState.showCart = false;
															await navigate('/shop');
														}}
													>
														Continue Shopping
													</button>
												</div>
											)}
										</div>
									</div>
									{/* Show cart totals and checkout button if we have items */}
									{(localCart.isLocalMode
										? (localCart.hasLoadedOnce && localCart.localCart.totalQuantity > 0)
										: (appState.activeOrder?.totalQuantity || 0) > 0) && isInEditableUrl && (
										<div class="border-t border-slate-200 bg-[#F5F5F5] py-6 px-6 w-full rounded-lg">
											<div class="flex justify-between text-lg font-semibold text-slate-900 mb-2">
												<p>Subtotal</p>
												<p>
													{localCart.isLocalMode ? (
														formatPrice(localCart.localCart.subTotal, localCart.localCart.currencyCode)
													) : (
														<CartPrice field={'subTotalWithTax'} order={appState.activeOrder} />
													)}
												</p>
											</div>
											
											{/* Country selector for shipping calculation */}
											<div class="mb-2">
												<select
													class="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
													onChange$={(_, el) => handleCountryChange(el.value)}
													value={countryCodeSignal.value}
													key={`country-select-${countryCodeSignal.value}`}
												>
													<option value="">{`Select a country`}</option>
													{appState.availableCountries.map((country) => (
														<option 
															key={country.code} 
															value={country.code}
															selected={country.code === countryCodeSignal.value}
														>
															{country.name}
														</option>
													))}
												</select>
											</div>
											
											{/* Shipping calculation result using Resource for non-blocking loading */}
											<Resource
												value={shippingResource}
												onPending={() => (
													<div class="text-sm text-slate-500 mb-4 flex items-center">
														<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 008-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
														Calculating shipping...
													</div>
												)}
												onRejected={(error) => (
													<div class="text-sm text-red-500 mb-2">
														Shipping calculation failed: {error.message}
													</div>
												)}
												onResolved={(method) => (
													method ? (
														<div class="flex justify-between text-sm font-medium mb-2">
															<p class="text-slate-700">Shipping: {method.name}</p>
															<p class="text-slate-900">
																{formatPrice(
																	method.priceWithTax, 
																	localCart.isLocalMode 
																		? localCart.localCart.currencyCode 
																		: appState.activeOrder?.currencyCode || 'USD'
																)}
															</p>
														</div>
													) : (
														appState.shippingAddress.countryCode ? (
															<div class="text-sm text-slate-500 mb-2">
																No shipping methods available for your location.
															</div>
														) : (
															<div class="text-sm text-slate-500 mb-2">
																Select a country to calculate shipping.
															</div>
														)
													)
												)}
											/>
											
											{/* Fallback display for when Resource is not available */}
											{!shippingResource.value && !shippingResource.loading && (
												shippingState.isLoading ? (
													<div class="text-sm text-slate-500 mb-4">
														Calculating shipping...
													</div>
												) : shippingState.error ? (
													<div class="text-sm text-red-500 mb-4">
														{shippingState.error}
													</div>
												) : shippingState.selectedMethod ? (
													<div class="flex justify-between text-sm font-medium mb-2">
														<p class="text-slate-700">{`Shipping`}: {shippingState.selectedMethod.name}</p>
														<p class="text-slate-900">
															{formatPrice(
																shippingState.selectedMethod.priceWithTax, 
																localCart.isLocalMode 
																	? localCart.localCart.currencyCode 
																	: appState.activeOrder?.currencyCode || 'USD'
															)}
														</p>
													</div>
												) : appState.shippingAddress.countryCode ? (
													<div class="text-sm text-slate-500 mb-2">
														No shipping methods available for your location.
													</div>
												) : (
													<div class="text-sm text-slate-500 mb-2">
														Select a country to calculate shipping.
													</div>
												)
											)}
											
											{/* Total with shipping */}
											{shippingState.selectedMethod && (
												<div class="flex justify-between text-lg font-bold text-slate-900 mb-2 pt-2 border-t border-slate-200">
													<p>Total</p>
													<p>
														{localCart.isLocalMode ? (
															formatPrice(
																localCart.localCart.subTotal + shippingState.selectedMethod.priceWithTax, 
																localCart.localCart.currencyCode
															)
														) : (
															<CartPrice field={'totalWithTax'} order={appState.activeOrder} />
														)}
													</p>
												</div>
											)}
											<div class="space-y-2 w-full">
												<button
													onClick$={$(async () => {
														// Prevent multiple clicks
														if (isNavigatingToCheckout.value) return;
														isNavigatingToCheckout.value = true;
														
														// Track checkout navigation performance - DISABLED
														// const checkoutTimer = await performanceTracking.trackCheckoutStep$('navigate-to-checkout');
														
														try {
															// Check if we have the required data
															// In local cart mode, we don't need activeOrder.id yet (will be created during checkout)
															if (!localCart.isLocalMode && !appState.activeOrder?.id) {
																console.error('Missing order data for Vendure mode');
																return;
															}
															
															// In local cart mode, check if we have items
															if (localCart.isLocalMode && localCart.localCart.items.length === 0) {
																console.error('No items in local cart');
																return;
															}
															
															if (!shippingState.selectedMethod) {
																console.error('No shipping method selected');
																return;
															}
															
															if (!appState.shippingAddress.countryCode) {
																console.error('No country selected');
																return;
															}

															// console.log('Navigating to checkout, no backend updates at this stage. All data managed in localStorage until final order placement. Mode:', localCart.isLocalMode ? 'Local Cart Mode' : 'Vendure Mode');

															// Navigate to checkout page without backend updates
															await navigate('/checkout/');
															// await checkoutTimer.end$(); // Track successful checkout navigation - DISABLED
														} catch (error) {
															console.error('Error navigating to checkout:', error);
															// await checkoutTimer.end$(); // Track failed checkout navigation - DISABLED
															// Reopen cart if navigation fails
															appState.showCart = true;
														} finally {
															isNavigatingToCheckout.value = false;
														}
													})}
													disabled={isNavigatingToCheckout.value || !shippingState.selectedMethod || 
														!appState.shippingAddress.countryCode || 
														(!localCart.isLocalMode && !appState.activeOrder?.id) ||
														(localCart.isLocalMode && localCart.localCart.items.length === 0)}
													class="w-full bg-[#937237] hover:bg-[#CD9E34] text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center uppercase font-heading text-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
												>
													{isNavigatingToCheckout.value ? (
														<>
															<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
																<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
																<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
															</svg>
															{`Loading...`}
														</>
													) : (
														`Proceed to Checkout`
													)}
												</button>
												<div class="flex justify-center mt-2">
													<button
														onClick$={() => (appState.showCart = false)}
														class="text-slate-500 text-sm underline hover:text-slate-700 transition-colors bg-transparent border-0 p-0 shadow-none font-normal"
														style={{ textTransform: 'none', cursor: 'pointer' }}
													>
														Continue Shopping
													</button>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});
