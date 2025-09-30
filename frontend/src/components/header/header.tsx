import { component$, useContext, useVisibleTask$, $, useSignal } from '@qwik.dev/core';
import { useLocalCart, loadCartIfNeeded, refreshCartStock } from '~/contexts/CartContext';
import { LocalCartService } from '~/services/LocalCartService';
import { LocalAddressService } from '~/services/LocalAddressService';
import { useLocation, Link } from '@qwik.dev/router';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID } from '~/constants';
import { logoutMutation } from '~/providers/shop/customer/customer';
import { isCheckoutPage } from '~/utils';
// PERFORMANCE OPTIMIZATION: Logo uses ?jsx import for optimal performance
// This provides immediate rendering without HTTP requests or loading states
// DO NOT CHANGE to ?url - logos should be inlined for instant availability
import LogoImage from '~/media/logo.svg?jsx';
import LoginModal from '~/components/auth/LoginModal';

import MenuIcon from '../icons/MenuIcon';
import ShoppingBagIcon from '../icons/ShoppingBagIcon';
import UserIcon from '../icons/UserIcon';
 
export default component$(() => {
	const appState = useContext(APP_STATE);
	const location = useLocation();
	const isScrolled = useSignal(false);
	const showLoginModal = useSignal(false);
	const userMenuRef = useSignal<Element>();

	// 🚀 OPTIMIZED: Direct localStorage check for badge - no cart context loading
	const cartQuantitySignal = useSignal(0);

	// Load cart quantity from localStorage on mount (lightweight check)
	useVisibleTask$(() => {
		cartQuantitySignal.value = LocalCartService.getCartQuantityFromStorage();

		// 🚀 OPTIMIZED: Listen for cart updates to sync badge
		const handleCartUpdate = (event: CustomEvent) => {
			// Add null check to prevent "Cannot read properties of null" error
			if (event.detail && typeof event.detail.totalQuantity === 'number') {
				cartQuantitySignal.value = event.detail.totalQuantity;
			} else {
				// Fallback to localStorage if event data is invalid
				cartQuantitySignal.value = LocalCartService.getCartQuantityFromStorage();
			}
		};

		window.addEventListener('cart-updated', handleCartUpdate as EventListener);

		return () => {
			window.removeEventListener('cart-updated', handleCartUpdate as EventListener);
		};
	});

	// 🚀 OPTIMIZED: Only access cart context when actually needed (for operations)
	const localCart = useLocalCart();

	// 🚀 OPTIMIZED: Always use cartQuantitySignal for badge display (lightweight)
	const totalQuantity =
		localCart.isLocalMode
			? cartQuantitySignal.value // Always use lightweight localStorage value
			: appState.activeOrder?.state !== 'PaymentAuthorized'
			? appState.activeOrder?.totalQuantity || 0
			: 0;
	// Check if we're on checkout or confirmation pages
	const isOnCheckoutPage = isCheckoutPage(location.url.toString());
	const isOnConfirmationPage = location.url.pathname.includes('/checkout/confirmation/');
	
	// Check if we're on pages with transparent header - this updates reactively
	const isTransparentHeaderPage = location.url.pathname === '/';
	

	// Customer data now loaded via SSR in layout - no need for client-side loading
	// Scroll detection - always active
	useVisibleTask$(() => {
		const handleScroll = () => {
			// Always update scroll state, but header styling will depend on isHomePage
			isScrolled.value = window.scrollY > 100;
		};
		
		// Initialize scroll state
		handleScroll();
		
		// Always add scroll listener
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	// 🚀 FRESH STOCK: Refresh stock levels on page load/refresh
	useVisibleTask$(() => {
		// Only refresh stock if we have items in cart
		if (localCart.localCart.items.length > 0) {
			refreshCartStock(localCart);
		}
	});

	// Click outside to close user menu
	useVisibleTask$(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (appState.showUserMenu && userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
				appState.showUserMenu = false;
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	});
	
	// Logout functionality
	const logout = $(async () => {
		await logoutMutation();
		
		// Clear address cache on logout
		LocalAddressService.clearAddresses();
		
		// Use hard refresh like the old version for reliability
		window.location.href = '/';
	});	return (
			<header
				class={`fixed top-0 left-0 right-0 z-50 border-0 transition-all duration-500 ease-in-out ${
					isTransparentHeaderPage
						? isScrolled.value
							? 'bg-black/95 backdrop-blur-sm shadow-sm' // Black with blur
							: 'bg-transparent' // Fully transparent
						: 'bg-black' // Solid black background on other pages
				}`}
		>{/* Main Header */}
				<div class="max-w-content-wide mx-auto px-4 sm:px-6 lg:px-8 w-full">
					<div class="flex items-center justify-between h-16">
						{/* Logo - Always on left */}
						<div class="flex items-center">
							<Link href="/" class="flex items-center space-x-3 -ml-1">
								<LogoImage
									alt="Rotten Hand Logo"
									class="h-12 w-auto object-contain bg-transparent transition-all duration-500 ease-in-out"
									width="120"
									height="48"
									aria-label="Rotten Hand - Go to homepage"
								/>
							</Link>
						</div>						{/* Centered Navigation - Hidden on mobile, shown on desktop */}
						<nav class="hidden md:flex flex-1 justify-center items-center space-x-8">
							<Link
								href="/contact"
								class={`hover:scale-105 transition-all duration-500 ease-in-out uppercase text-lg xl:text-xl 2xl:text-2xl font-bold font-heading border-b-2 text-white hover:text-gray-200 ${
									location.url.pathname.startsWith('/contact')
										? 'border-white'
										: 'border-transparent hover:border-gray-300'
								}`}
							>
								Contact
							</Link>
						</nav>{/* Icons */}
						<div class="flex items-center space-x-3 pr-1">
							{/* Cart */}
							{!(isOnCheckoutPage || isOnConfirmationPage) && (
								<button
									onClick$={$(async () => {
										// 🚀 DEMAND-BASED: Load cart only when cart icon is clicked
										loadCartIfNeeded(localCart);

										// 🚀 RESTORE COUNTRY: Check sessionStorage for saved country when opening cart
										if (!appState.shippingAddress.countryCode) {
											const storedCountry = sessionStorage.getItem('countryCode');
											if (storedCountry) {
												appState.shippingAddress.countryCode = storedCountry;
											}
										}

										// If cart is already open, just close it
						if (appState.showCart) {
							appState.showCart = false;
						} else {
							// Show cart immediately
							appState.showCart = true;
							
							// 🚀 FRESH STOCK: Refresh stock levels when opening cart (in background)
							// Refresh stock levels in background without blocking UI
							if (localCart.localCart.items.length > 0) {
								refreshCartStock(localCart).then(() => {
									// Trigger cart update event to refresh UI with new stock levels
									window.dispatchEvent(new CustomEvent('cart-updated'));
								}).catch((error) => {
									console.error('Background stock refresh failed:', error);
								});
							}
						}
										// Sync badge with loaded cart state
										if (localCart.hasLoadedOnce) {
											cartQuantitySignal.value = localCart.localCart.totalQuantity;
										}
									})}
									class="relative p-1 hover:scale-105 transition-all duration-500 ease-in-out cursor-pointer text-white hover:text-gray-200 flex items-center justify-center"
									aria-label={`${totalQuantity} items in cart`}
									title="View cart"
								>
									<ShoppingBagIcon />
									{totalQuantity > 0 && (
										<span class="absolute -top-1 -right-1 bg-[#8a6d4a] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
											{totalQuantity}
										</span>
									)}
								</button>
							)}
									{/* User Icon - Hidden on mobile, shown on desktop */}						<div class="relative hidden md:block" ref={userMenuRef}>
								<button
									class={`p-1 hover:scale-105 transition-all duration-500 ease-in-out cursor-pointer flex items-center justify-center ${
										appState.customer.id !== CUSTOMER_NOT_DEFINED_ID 
											? 'text-[#8a6d4a] hover:text-[#4F3B26]' 
											: 'text-white hover:text-gray-200'
									}`}
									onClick$={() => {
										if (appState.customer.id !== CUSTOMER_NOT_DEFINED_ID) {
											appState.showUserMenu = !appState.showUserMenu;
										} else {
											showLoginModal.value = true;
										}
									}}
								>
									<UserIcon />
								</button>
								{appState.showUserMenu && appState.customer.id !== CUSTOMER_NOT_DEFINED_ID && (
									<div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
										<Link
											href="/account"
											class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
											onClick$={() => (appState.showUserMenu = false)}
										>
											My Account
										</Link>
										<button
											onClick$={logout}
											class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-md"
										>
											Logout
										</button>
									</div>
								)}
							</div>							{/* Mobile Menu Button - On right side next to cart */}
							<button
								class="md:hidden p-2 hover:scale-105 transition-all duration-500 ease-in-out cursor-pointer text-white hover:text-gray-200 flex items-center justify-center"
								onClick$={() => (appState.showMenu = !appState.showMenu)}
							>
								<span class="sr-only">Menu</span>
								<MenuIcon />
							</button>
						</div>
					</div>
				</div>				{/* Mobile Menu Overlay */}
				{appState.showMenu && (					<div
						class="fixed inset-0 z-50 w-full h-full bg-[#8a6d4a] flex flex-col items-center justify-center px-6"
						style="min-height: 100vh;"
					>						<button
							class="absolute top-4 right-4 p-2 text-white hover:text-gray-200 rounded-lg hover:bg-white/10 transition-all duration-200"
							onClick$={() => (appState.showMenu = false)}
						>
							<span class="sr-only">Close menu</span>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>						<nav class="flex flex-col space-y-8 w-full max-w-md">
							<Link
								href="/contact"
								// Use Qwik's built-in prefetch
								class={`text-white text-4xl py-6 px-6 rounded-lg hover:bg-white/10 hover:scale-105 hover:shadow-lg transition-all duration-200 text-center tracking-wide uppercase font-bold font-heading border-2 border-transparent ${
									location.url.pathname.startsWith('/contact')
										? 'bg-white/20 border-white/30'
										: 'hover:border-white hover:border-opacity-20'
								}`}
								onClick$={() => (appState.showMenu = false)}
							>
								Contact
							</Link>
							<button								class={`text-white text-4xl py-6 px-6 rounded-lg hover:bg-white/10 hover:scale-105 hover:shadow-lg transition-all duration-200 text-center tracking-wide uppercase font-bold font-heading border-2 border-transparent ${
									location.url.pathname.startsWith('/account') || location.url.pathname.startsWith('/sign-in')
										? 'bg-white/20 border-white/30'
										: 'hover:border-white hover:border-opacity-20'
								}`}
								onClick$={() => {
									if (appState.customer.id !== CUSTOMER_NOT_DEFINED_ID) {
										appState.showMobileUserMenu = !appState.showMobileUserMenu;
									} else {
										showLoginModal.value = true;
										appState.showMenu = false;
									}
								}}
							>
								{appState.customer.id !== CUSTOMER_NOT_DEFINED_ID ? 'Account' : 'Sign In'}
							</button>
							{appState.showMobileUserMenu && appState.customer.id !== CUSTOMER_NOT_DEFINED_ID && (								<div class="w-full bg-black/50 border border-white/30 rounded-lg shadow-lg">
									<Link
										href="/account"
										class="block px-4 py-3 text-lg text-white hover:bg-white/10 rounded-t-lg transition-all duration-200"
										onClick$={() => {
											appState.showMobileUserMenu = false;
											appState.showMenu = false;
										}}
									>
										My Account
									</Link>
									<button
										onClick$={logout}
										class="block w-full text-left px-4 py-3 text-lg text-white hover:bg-white/10 rounded-b-lg transition-all duration-200"
									>
										Logout
									</button>
								</div>
							)}
						</nav>
					</div>
				)}
				
				{/* Login Modal */}
				<LoginModal
					isOpen={showLoginModal.value}
					onClose$={$(() => {
						showLoginModal.value = false;
					})}
					onLoginSuccess$={$(() => {
						// Modal will handle closing itself and updating app state
						// Customer data is automatically updated in the modal
					})}
				/>
		</header>
	);
});
