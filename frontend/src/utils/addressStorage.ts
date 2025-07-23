/**
 * Centralized address storage management that respects authentication state
 * Priority: Customer saved address → sessionStorage → geolocation fallback
 */

import { getActiveCustomerQuery, getActiveCustomerAddressesQuery } from '~/providers/shop/customer/customer';
import { Address } from '~/generated/graphql';
import { getCountryByIp } from './geolocation';
import { $ } from '@qwik.dev/core';

export interface StoredAddressInfo {
  countryCode: string;
  countryName?: string;
  source: 'customer' | 'session' | 'geolocation';
  isAuthenticated: boolean;
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
 * World-class address loading that respects authentication priority
 * 1. If customer is authenticated, load their default shipping address
 * 2. If not authenticated or no customer address, use sessionStorage
 * 3. If no sessionStorage, fall back to geolocation
 */
export async function loadPriorityAddress(): Promise<StoredAddressInfo> {
  // console.log('🌍 Starting priority address loading...');

  try {
    // 1. First priority: Check if customer is authenticated and has default address
    const activeCustomer = await getActiveCustomerQuery();
    if (activeCustomer) {
      // console.log('👤 Customer is authenticated, checking for default address...');
      
      const customerAddresses = await getActiveCustomerAddressesQuery();
      if (customerAddresses?.addresses) {
        const defaultShippingAddress = customerAddresses.addresses.find(
          (address: Address) => !!address.defaultShippingAddress
        );
        
        if (defaultShippingAddress) {
          // console.log('✅ Found customer default shipping address');
          const customerInfo: StoredAddressInfo = {
            countryCode: defaultShippingAddress.country.code,
            countryName: defaultShippingAddress.country.name,
            source: 'customer',
            isAuthenticated: true
          };

          // Store customer's country in sessionStorage to maintain it across sessions
          // This prevents geolocation from overriding customer preference
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
  
  // 3. Third priority: Geolocation fallback
  // console.log('🌐 No stored country found, falling back to geolocation...');
  const geoResult = await getCountryByIp();

  if (geoResult?.countryCode) {
    // console.log('🌐 Geolocation detected country:', geoResult.countryCode);
    
    // Store geolocation result but mark it as low priority
    sessionStorage.setItem('countryCode', geoResult.countryCode);
    sessionStorage.setItem('countrySource', 'geolocation');
    
    return {
      countryCode: geoResult.countryCode,
      countryName: geoResult.countryName,
      source: 'geolocation',
      isAuthenticated: false
    };
  }
  
  // 4. Ultimate fallback
  // console.log('❌ All address loading methods failed, using US as fallback');
  return {
    countryCode: 'US',
    countryName: 'United States',
    source: 'geolocation',
    isAuthenticated: false
  };
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
        (address: Address) => !!address.defaultShippingAddress
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
          phoneNumber: defaultShippingAddress.phoneNumber || ''
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
 * 🚀 DEMAND-BASED GEOLOCATION: Load country only when user shows purchase intent
 * Triggers when: Add to cart succeeds OR Cart opens with items
 */
export const loadCountryOnDemand = $(async (appState: any) => {
  // Only run if country is not already set
  if (appState.shippingAddress.countryCode) {
    return; // Country already set
  }

  // Check sessionStorage first for cached country
  const storedCountry = sessionStorage.getItem('countryCode');
  if (storedCountry) {
    // console.log('🌍 Using country from sessionStorage:', storedCountry);
    appState.shippingAddress.countryCode = storedCountry;
    return;
  }

  // If no stored country, use geolocation service
  try {
    const addressInfo = await loadPriorityAddress();

    if (addressInfo && addressInfo.countryCode) {
      // console.log('🌍 Geolocation detected country:', addressInfo.countryCode, 'source:', addressInfo.source);
      appState.shippingAddress.countryCode = addressInfo.countryCode;

      // Store for future use
      sessionStorage.setItem('countryCode', addressInfo.countryCode);
      sessionStorage.setItem('countrySource', addressInfo.source || 'geolocation');
    }
  } catch (error) {
    console.warn('Geolocation failed:', error);
    // Default to US if geolocation fails
    appState.shippingAddress.countryCode = 'US';
    sessionStorage.setItem('countryCode', 'US');
    sessionStorage.setItem('countrySource', 'fallback');
  }
});
