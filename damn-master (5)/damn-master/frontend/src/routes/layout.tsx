// Removed LoadingSpinner - using SSR data instead of loading states
import {
	$,
	Slot,
	component$,
	useContextProvider,
	useOn,
	useStore,
	useVisibleTask$,
} from '@qwik.dev/core';
import { RequestHandler, routeLoader$, useLocation } from '@qwik.dev/router';
import { ImageTransformerProps, useImageProvider } from 'qwik-image';
import Menu from '~/components/menu/Menu';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID, IMAGE_RESOLUTIONS, AUTH_TOKEN, COUNTRY_COOKIE } from '~/constants';
import { Order } from '~/generated/graphql';
import { CountryService } from '~/services/CountryService';
import { getCollections } from '~/providers/shop/collections/collections';
import { getActiveOrderQuery } from '~/providers/shop/orders/order';
import { ActiveCustomer, AppState } from '~/types';
import { getActiveCustomerQuery } from '~/providers/shop/customer/customer';
import ConditionalCart from '../components/cart/ConditionalCart';
import Header from '../components/header/header';
import Footer from '../components/footer/footer';
import { CartProvider } from '~/contexts/CartContext';
import { LoginModalProvider, useLoginModalState, useLoginModalActions } from '~/contexts/LoginModalContext';
import LoginModal from '~/components/auth/LoginModal';
import { LocalAddressService } from '~/services/LocalAddressService';
import { sanitizePhoneNumber } from '~/utils/validation';

export const onGet: RequestHandler = async ({ cacheControl, url, headers }) => {
	// 🚀 ADVANCED CACHING: Intelligent cache strategies based on page type and user agent
	const pathname = url.pathname;
	const userAgent = headers.get('user-agent') || '';
	const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

	if (pathname.startsWith('/shop')) {
		// Shop page: minimal cache for real-time inventory, but allow CDN caching for bots
		if (isBot) {
			cacheControl({ maxAge: 60 * 5, sMaxAge: 60 * 30 }); // 5min browser, 30min CDN for bots
		} else {
			cacheControl({ maxAge: 0, sMaxAge: 30 }); // No browser cache, 30s CDN cache for users
		}
	} else if (pathname.startsWith('/api/')) {
		// API routes: no caching for dynamic data
		cacheControl({ maxAge: 0, sMaxAge: 0 });
	} else if (pathname === '/' || pathname.startsWith('/contact') || pathname.startsWith('/terms')) {
		// Static pages: aggressive caching
		cacheControl({
			staleWhileRevalidate: 60 * 60 * 24 * 30, // 30 days stale
			maxAge: 60 * 60 * 2 // 2 hours fresh
		});
	} else {
		// Other pages: moderate caching
		cacheControl({ staleWhileRevalidate: 60 * 60 * 24 * 7, maxAge: 60 * 5 }); // 5 minutes fresh, 7 days stale
	}
};

export const useCollectionsLoader = routeLoader$(async () => {
	return await getCollections();
});

export const useAvailableCountriesLoader = routeLoader$(async () => {
	return await CountryService.getAvailableCountries();
});

export const useActiveOrderLoader = routeLoader$(async () => {
	try {
		const activeOrder = await getActiveOrderQuery();
		// Only return valid orders with items
		if (activeOrder && activeOrder.id && activeOrder.lines && activeOrder.lines.length > 0) {
			return activeOrder;
		}
		return null;
	} catch (_error) {
		// If there's an error fetching the order, return null
		return null;
	}
});

// SSR Authentication and Customer Data Loading
export const useLayoutLoader = routeLoader$(async ({ cookie }) => {
	const authToken = cookie.get(AUTH_TOKEN)?.value;
	const countryCode = cookie.get(COUNTRY_COOKIE)?.value;
	let customer: ActiveCustomer | null = null;
	let activeOrder: Order | null = null;

	if (authToken) {
		try {
			// Load customer and order data in parallel
			const [customerData, orderData] = await Promise.all([
				getActiveCustomerQuery().catch(() => null),
				getActiveOrderQuery().catch(() => null)
			]);

			customer = customerData ? {
				title: customerData.title ?? '',
				firstName: customerData.firstName,
				id: customerData.id,
				lastName: customerData.lastName,
				emailAddress: customerData.emailAddress,
				phoneNumber: customerData.phoneNumber ?? '',
			} : null;

			activeOrder = orderData;
		} catch (error) {
			console.error('Layout loader error:', error);
			// Continue without customer data
		}
	}

	return {
		customer,
		activeOrder,
		isAuthenticated: !!customer,
		countryCode,
	};
});

export const onRequest: RequestHandler = () => {
	// Handler for request processing
};

// Component to render the global login modal
const LoginModalComponent = component$(() => {
	const loginModalState = useLoginModalState();
	const { closeLoginModal } = useLoginModalActions();

	return (
		<LoginModal
			isOpen={loginModalState.isOpen}
			onClose$={closeLoginModal}
			onLoginSuccess$={loginModalState.onLoginSuccess}
		/>
	);
});

export default component$(() => {
	const location = useLocation();
	const isHomePage = location.url.pathname === '/';

	const imageTransformer$ = $(({ src, width, height }: ImageTransformerProps): string => {
		return `${src}?w=${width}&h=${height}&format=webp`;
	});

	// Provide your default options
	useImageProvider({
		imageTransformer$,
		resolutions: IMAGE_RESOLUTIONS,
	});

	const _collectionsSignal = useCollectionsLoader();
	const availableCountriesSignal = useAvailableCountriesLoader();
	const activeOrderSignal = useActiveOrderLoader();
	const layoutData = useLayoutLoader();

	const state = useStore<AppState>({
		showCart: false,
		showMenu: false,
		showUserMenu: false,
		showMobileUserMenu: false,
		isLoading: false,
		customer: layoutData.value.customer || { id: CUSTOMER_NOT_DEFINED_ID, firstName: '', lastName: '', emailAddress: '' } as ActiveCustomer,
		activeOrder: layoutData.value.activeOrder || activeOrderSignal.value || ({} as Order),
		collections: _collectionsSignal.value || [],
		availableCountries: availableCountriesSignal.value || [],
		shippingAddress: {
			id: '',
			city: '',
			company: '',
			countryCode: layoutData.value.countryCode || '', // SSR-seeded country
			fullName: '',
			phoneNumber: '',
			postalCode: '',
			province: '',
			streetLine1: '',
			streetLine2: '',
		},
		billingAddress: {
			firstName: '',
			lastName: '',
			streetLine1: '',
			streetLine2: '',
			city: '',
			province: '',
			postalCode: '',
			countryCode: ''
		},
		addressBook: [],
	});

	// Debug: Log available countries initialization
	useVisibleTask$(() => {
		console.log('Layout: availableCountriesSignal.value:', availableCountriesSignal.value?.length, availableCountriesSignal.value?.slice(0, 3));
		console.log('Layout: state.availableCountries:', state.availableCountries.length, state.availableCountries.slice(0, 3));
		
		// Ensure countries are loaded if signal has data but state doesn't
		if (availableCountriesSignal.value && availableCountriesSignal.value.length > 0 && state.availableCountries.length === 0) {
			console.log('Layout: Updating state.availableCountries from signal');
			state.availableCountries = availableCountriesSignal.value;
		}
	});

		// Initialize cross-tab storage listener as an independent effect
		useVisibleTask$(() => {
			LocalAddressService.setupCrossTabSync();
		});


	useContextProvider(APP_STATE, state);

	// Sync customer data between SSR and client, and re-validate authentication on client side
	useVisibleTask$(async ({ cleanup }) => {
		// If SSR provided customer data, sync it to the client state
		if (layoutData.value.customer) {
			state.customer = layoutData.value.customer;
		}

		// If no customer data from SSR but we might have an auth token, try to fetch customer data
		if (!layoutData.value.customer) {
			try {
				const customerData = await getActiveCustomerQuery();
				if (customerData) {
					state.customer = {
						title: customerData.title ?? '',
						firstName: customerData.firstName,
						id: customerData.id,
						lastName: customerData.lastName,
						emailAddress: customerData.emailAddress,
						phoneNumber: '', // Don't set customer phone - let address sync handle it
					};
				}
			} catch (_error) {
				// Do not log error, as it is expected for guest users
			}
		}

		// Client-side fallback to restore country from sessionStorage if it's still empty after hydration
		if (!state.shippingAddress.countryCode) {
			const storedCountry = sessionStorage.getItem('countryCode');
			if (storedCountry) {
				state.shippingAddress.countryCode = storedCountry;
			}
		}

		// Cleanup function to run when the component is unmounted
		cleanup(() => {
			// You can add cleanup logic here if needed
		});
	});

	// Address sync after client-side login: populate addressBook and default shipping
	useVisibleTask$(async ({ track }) => {
		track(() => state.customer?.id);
		if (
			state.customer &&
			state.customer.id !== CUSTOMER_NOT_DEFINED_ID &&
			state.addressBook.length === 0
		) {
			try {
				await LocalAddressService.syncFromVendure(state.customer.id);
				const addresses = LocalAddressService.getAddresses();
				state.addressBook = addresses;

				// IMPORTANT: Always use the phone number from the default shipping address, not the customer's general phone
				// Each address has its own phone number in Vendure - use it even if empty
				if (addresses.length > 0) {
					const defaultShipping = addresses.find(a => a.defaultShippingAddress) || addresses[0];
					if (defaultShipping) {
						const shippingPhone = defaultShipping.phoneNumber ? sanitizePhoneNumber(defaultShipping.phoneNumber) : '';
						state.customer.phoneNumber = shippingPhone;
						console.log('[Layout] Set customer phone from shipping address:', shippingPhone, 'from address:', defaultShipping.phoneNumber);
					} else {
						state.customer.phoneNumber = '';
						console.log('[Layout] No default shipping address found, cleared phone number');
					}
				} else {
					state.customer.phoneNumber = '';
					console.log('[Layout] No addresses found, cleared phone number');
				}

				if (addresses.length > 0 && !state.shippingAddress.streetLine1) {
					const defaultShipping =
						addresses.find((a) => a.defaultShippingAddress) || addresses[0];
					if (defaultShipping) {
						state.shippingAddress = {
							id: defaultShipping.id,
							fullName: defaultShipping.fullName,
							streetLine1: defaultShipping.streetLine1,
							streetLine2: defaultShipping.streetLine2 || '',
							city: defaultShipping.city,
							province: defaultShipping.province,
							postalCode: defaultShipping.postalCode,
							countryCode: defaultShipping.countryCode,
							phoneNumber: defaultShipping.phoneNumber || '',
							company: defaultShipping.company || '',
						};

						// CRITICAL FIX: Save customer's country to sessionStorage to override geolocation
						// This ensures customer address takes precedence over geolocation
						if (typeof sessionStorage !== 'undefined') {
							sessionStorage.setItem('countryCode', defaultShipping.countryCode);
							sessionStorage.setItem('countrySource', 'customer');
						}
					}
				}
			} catch (error) {
				console.error('Failed to sync addresses in layout:', error);
			}
		}
	});

	// Simplified: Remove loading state that causes unnecessary re-renders
	// Qwik handles navigation loading automatically

	// 🚀 OPTIMIZED: Geolocation moved to demand-based system (cart/add-to-cart)
	// No longer runs on every page load - only when user shows purchase intent

	// 🚀 OPTIMIZED: Body overflow handled via CSS classes on container
	// This avoids additional useVisibleTask$ and lets CSS handle the overflow state



	useOn(
		'keydown',
		$((event: unknown) => {
			if ((event as KeyboardEvent).key === 'Escape') {
				state.showCart = false;
				state.showMenu = false;
			}
		})
	);
	return (
		<LoginModalProvider>
			<CartProvider>
				<div>
					<Header />
					{/* 🚀 DEMAND-BASED: Conditional Cart Loading following Damned Designs pattern */}
					{!isHomePage ? (
						// Non-homepage: Load cart immediately for better UX
						<ConditionalCart isHomePage={isHomePage} showCart={state.showCart} />
					) : (
						// Homepage: Lazy load cart only when showCart is true (user clicks cart icon)
						state.showCart && <ConditionalCart isHomePage={isHomePage} showCart={state.showCart} />
					)}
					<Menu />
					<div class="min-h-screen flex flex-col">
						<main class={`flex-1 ${isHomePage ? '' : 'pt-16'}`}>
							<Slot />
						</main>
						{/* Footer - now directly imported for reliability */}
						<Footer />
					</div>
					{/* Global Login Modal */}
					<LoginModalComponent />
					{/* 🚀 OPTIMIZED: CSS-based body overflow control with CSP-compliant approach */}
					{(state.showCart || state.showMenu) && (
						<style>{'body { overflow: hidden !important; }'}</style>
					)}
				</div>
			</CartProvider>
		</LoginModalProvider>
	);
});