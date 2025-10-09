/**
 * Centralized address storage management that respects authentication state
 * Priority: Customer saved address → sessionStorage only
 */

import { getActiveCustomerQuery, getActiveCustomerAddressesQuery } from '~/providers/shop/customer/customer';
import { Address } from '~/generated/graphql';
import { $ } from '@qwik.dev/core';
import { COUNTRY_COOKIE } from '~/constants';

export interface StoredAddressInfo {
  countryCode: string;
  countryName?: string;
  source: 'customer' | 'session' | 'geolocation';
  isAuthenticated: boolean;
}

/**
 * Sets a cookie with the given name, value, and expiration days.
 * This function is isomorphic and can be called on the server or client.
 */
function setCookie(name: string, value: string, days: number) {
	if (typeof document === 'undefined') {
		// Running on the server, cannot set cookies directly
		return;
	}
	let expires = '';
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
		expires = '; expires=' + date.toUTCString();
	}
	document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

export interface CustomerAddress {
  countryCode: string;
  countryName: string;
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  phoneNumber?: string;
}

/**
 * Load address information from customer data or sessionStorage only
 * 1. If customer is authenticated, load their default shipping address
 * 2. If not authenticated or no customer address, use sessionStorage
 * 3. Return null if no data available - no automatic fallbacks
 */
export async function loadPriorityAddress(): Promise<StoredAddressInfo | null> {
	// console.log('🌍 Starting priority address loading...');

	try {
		// 1. First priority: Check if customer is authenticated and has default address
		const activeCustomer = await getActiveCustomerQuery();
		if (activeCustomer) {
			// console.log('👤 Customer is authenticated, checking for default address...');

			const customerAddresses = await getActiveCustomerAddressesQuery();
			if (customerAddresses?.addresses) {
				const defaultShippingAddress = customerAddresses.addresses.find(
					(address: Address) => !!address.defaultShippingAddress,
				);

				if (defaultShippingAddress) {
					// console.log('✅ Found customer default shipping address');
					const customerInfo: StoredAddressInfo = {
						countryCode: defaultShippingAddress.country.code,
						countryName: defaultShippingAddress.country.name,
						source: 'customer',
						isAuthenticated: true,
					};

					// Store customer's country in sessionStorage to maintain it across sessions
					setCookie(COUNTRY_COOKIE, defaultShippingAddress.country.code, 30);
					sessionStorage.setItem('countryCode', defaultShippingAddress.country.code);
					sessionStorage.setItem('countrySource', 'customer');

					// console.log('✅ Loaded customer country:', customerInfo.countryCode);
					return customerInfo;
				}
			}
			// console.log('ℹ️ Customer authenticated but no default shipping address found');
		}
	} catch (_error) {
		// console.warn('⚠️ Error loading customer address:', _error);
	}

	// 2. Second priority: Check sessionStorage
	const storedCountry = sessionStorage.getItem('countryCode');
	const storedSource = sessionStorage.getItem('countrySource');

	if (storedCountry) {
		// console.log('📦 Using stored country from sessionStorage:', storedCountry, 'source:', storedSource);
		return {
			countryCode: storedCountry,
			source: storedSource === 'customer' ? 'customer' : 'session',
			isAuthenticated: storedSource === 'customer'
		};
	}
	
	// No automatic fallbacks - return null if no data available
	// console.log('ℹ️ No stored country data found');
	return null;
}

/**
 * Get full customer address details for forms
 */
export async function loadCustomerAddress(): Promise<CustomerAddress | null> {
	try {
		const activeCustomer = await getActiveCustomerQuery();
		if (!activeCustomer) {
			// console.log('ℹ️ No authenticated customer for address loading');
			return null;
		}

		// console.log('👤 Loading customer address details...');
		const customerAddresses = await getActiveCustomerAddressesQuery();

		if (customerAddresses?.addresses) {
			const defaultShippingAddress = customerAddresses.addresses.find(
				(address: Address) => !!address.defaultShippingAddress,
			);

			if (defaultShippingAddress) {
				// console.log('✅ Found customer default shipping address details');
				return {
					countryCode: defaultShippingAddress.country.code,
					countryName: defaultShippingAddress.country.name,
					fullName: defaultShippingAddress.fullName || '',
					streetLine1: defaultShippingAddress.streetLine1 || '',
					streetLine2: defaultShippingAddress.streetLine2 || '',
					city: defaultShippingAddress.city || '',
					province: defaultShippingAddress.province || '',
					postalCode: defaultShippingAddress.postalCode || '',
					phoneNumber: defaultShippingAddress.phoneNumber || '',
				};
			}
		}

		// console.log('ℹ️ Customer authenticated but no default shipping address found');
		return null;
	} catch (_error) {
		// console.warn('⚠️ Error loading customer address details:', _error);
		return null;
	}
}

/**
 * Save user-selected country to sessionStorage
 * This ensures user preferences override geolocation
 */
export function saveUserSelectedCountry(countryCode: string): void {
	// console.log('💾 Saving user-selected country:', countryCode);
	setCookie(COUNTRY_COOKIE, countryCode, 30);
	sessionStorage.setItem('countryCode', countryCode);
	sessionStorage.setItem('countrySource', 'session');
}

/**
 * Check if current stored country came from customer data
 */
export function isStoredCountryFromCustomer(): boolean {
  return sessionStorage.getItem('countrySource') === 'customer';
}

/**
 * Clear stored address data (useful for logout)
 */
export function clearStoredAddress(): void {
  sessionStorage.removeItem('countryCode');
  sessionStorage.removeItem('countrySource');
  // console.log('🧹 Cleared stored address data');
}

/**
 * Load country from sessionStorage only - no automatic detection
 * Only restores previously saved user selections or customer data
 */
export const loadCountryFromStorage = $(async (appState: any) => {
  // Only run if country is not already set
  if (appState.shippingAddress.countryCode) {
    return; // Country already set
  }

  // Check sessionStorage for cached country
  const storedCountry = sessionStorage.getItem('countryCode');
  if (storedCountry) {
    // console.log('🌍 Using country from sessionStorage:', storedCountry);
    appState.shippingAddress.countryCode = storedCountry;
    return;
  }

  // No automatic fallbacks - country will be set when user reaches checkout
  // console.log('ℹ️ No stored country found, will be set at checkout');
});

/**
 * Load country on demand when user shows purchase intent (add to cart)
 * This handles geolocation and saves to sessionStorage for future use
 */
export const loadCountryOnDemand = $(async (appState: any) => {
	const geolocationStartTime = performance.now();
	console.log('🚀 [GEOLOCATION TIMING] Starting loadCountryOnDemand...');

	// Only run if country is not already set
	if (appState.shippingAddress.countryCode) {
		console.log('⏭️ [GEOLOCATION TIMING] Country already set, skipping');
		return; // Country already set
	}

	// First check sessionStorage
	const storageCheckStart = performance.now();
	const storedCountry = sessionStorage.getItem('countryCode');
	if (storedCountry) {
		console.log(`⏱️ [GEOLOCATION TIMING] Using cached country: ${(performance.now() - storageCheckStart).toFixed(2)}ms`);
		appState.shippingAddress.countryCode = storedCountry;
		return;
	}
	console.log(`⏱️ [GEOLOCATION TIMING] Storage check: ${(performance.now() - storageCheckStart).toFixed(2)}ms`);

	// If no stored country, attempt geolocation
	try {
		console.log('🌍 [GEOLOCATION TIMING] Attempting geolocation API call...');
		const apiCallStart = performance.now();
		const response = await fetch('https://ipapi.co/json/');
		const data = await response.json();
		console.log(`⏱️ [GEOLOCATION TIMING] API call: ${(performance.now() - apiCallStart).toFixed(2)}ms`);

		if (data.country_code) {
			const countryCode = data.country_code.toUpperCase();
			console.log('🌍 [GEOLOCATION TIMING] Geolocation detected country:', countryCode);

			// Save to sessionStorage and app state
			const saveStart = performance.now();
			setCookie(COUNTRY_COOKIE, countryCode, 30);
			sessionStorage.setItem('countryCode', countryCode);
			sessionStorage.setItem('countrySource', 'geolocation');
			appState.shippingAddress.countryCode = countryCode;
			console.log(`⏱️ [GEOLOCATION TIMING] Save to storage: ${(performance.now() - saveStart).toFixed(2)}ms`);

			console.log(`✅ [GEOLOCATION TIMING] TOTAL geolocation: ${(performance.now() - geolocationStartTime).toFixed(2)}ms`);
			return;
		}
	} catch (_error) {
		console.warn('⚠️ [GEOLOCATION TIMING] Geolocation failed:', _error);
		console.log(`❌ [GEOLOCATION TIMING] FAILED after: ${(performance.now() - geolocationStartTime).toFixed(2)}ms`);
	}

	// Fallback to US if geolocation fails
	// console.log('🌍 Using US as fallback country');
	appState.shippingAddress.countryCode = 'US';
	setCookie(COUNTRY_COOKIE, 'US', 30);
	sessionStorage.setItem('countryCode', 'US');
	sessionStorage.setItem('countrySource', 'fallback');
});
