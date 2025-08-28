# LocalAddressService Implementation Guide

This guide documents the complete implementation of `LocalAddressService` for address caching, cross-tab synchronization, and Vendure integration in a Qwik-based e-commerce application.

## Overview

The `LocalAddressService` provides:
- Local address caching in `sessionStorage`
- Cross-tab synchronization using `storage` events
- Automatic sync with Vendure backend
- Default address management
- Integration with authentication flows

## Core Files Created/Modified

### 1. LocalAddressService.ts
**Location:** `src/services/LocalAddressService.ts`

```typescript
import { APP_STATE } from '~/constants';
import type { Address } from '~/generated/graphql';

// Core interfaces
export interface LocalAddress {
  id: string;
  fullName: string;
  company?: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
  defaultShipping: boolean;
  defaultBilling: boolean;
  source: 'vendure' | 'checkout';
  lastModified: number;
}

export interface LocalAddressCache {
  addresses: LocalAddress[];
  lastSync: number;
  version: number;
}

export interface AddressSyncResult {
  success: boolean;
  addressesAdded: number;
  addressesUpdated: number;
  error?: string;
}

// Main service class
export class LocalAddressService {
  private static readonly STORAGE_KEY = 'rottenhand_addresses';
  private static readonly SYNC_EVENT = 'rottenhand_address_sync';
  private static readonly CACHE_VERSION = 1;
  private static cache: LocalAddressCache | null = null;
  private static syncListeners: Set<() => void> = new Set();

  // Core methods implementation...
}
```

**Key Implementation Details:**
- Uses `sessionStorage` for persistence
- Implements version-based cache invalidation
- Provides cross-tab sync via `storage` events
- Handles default address logic
- Includes Vendure sync methods

### 2. AddressContext.tsx
**Location:** `src/providers/shop/address/AddressContext.tsx`

```typescript
import { createContextId, useContext, useContextProvider } from '@builder.io/qwik';
import { useSignal, useStore, useTask$ } from '@builder.io/qwik';
import { LocalAddressService, type LocalAddress } from '~/services/LocalAddressService';

// Context interfaces
export interface AddressContextState {
  addresses: LocalAddress[];
  isLoading: boolean;
  error: string | null;
  defaultShippingAddress: LocalAddress | null;
  defaultBillingAddress: LocalAddress | null;
}

export interface AddressContextActions {
  loadAddresses: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
  saveAddress: (address: Omit<LocalAddress, 'id' | 'lastModified'>) => Promise<string>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultShippingAddress: (id: string) => Promise<void>;
  setDefaultBillingAddress: (id: string) => Promise<void>;
  syncFromVendure: () => Promise<void>;
  syncToVendure: () => Promise<void>;
}

// Provider implementation with proper Qwik patterns
export const AddressProvider = component$((props: { children: any }) => {
  // State management with signals and stores
  // Cross-tab sync setup
  // Action implementations
});
```

**Key Implementation Details:**
- Uses Qwik's `createContextId` and context providers
- Implements reactive state with signals
- Provides comprehensive address management actions
- Handles cross-tab synchronization

### 3. CheckoutAddresses.tsx Integration
**Location:** `src/components/checkout/CheckoutAddresses.tsx`

**Key Changes:**
```typescript
// Import address context (commented out if not used)
// import { useAddressContext } from '~/providers/shop/address/AddressContext';

// In useVisibleTask$ hook - setup cross-tab sync
useVisibleTask$(() => {
  LocalAddressService.setupCrossTabSync();
});

// After successful form submission - save addresses
if (result.success) {
  // Save shipping address
  LocalAddressService.saveAddress({
    fullName: appState.shippingAddress?.fullName || '',
    company: appState.shippingAddress?.company || '',
    streetLine1: appState.shippingAddress?.streetLine1 || '',
    streetLine2: appState.shippingAddress?.streetLine2 || '',
    city: appState.shippingAddress?.city || '',
    province: appState.shippingAddress?.province || '',
    postalCode: appState.shippingAddress?.postalCode || '',
    countryCode: appState.shippingAddress?.countryCode || '',
    phoneNumber: appState.shippingAddress?.phoneNumber || '',
    defaultShipping: true,
    defaultBilling: false,
    source: 'checkout' as const
  });

  // Save billing address (if different)
  if (!inheritBillingAddress.value) {
    LocalAddressService.saveAddress({
      fullName: appState.billingAddress?.fullName || '',
      company: '', // BillingAddress doesn't have company property
      streetLine1: appState.billingAddress?.streetLine1 || '',
      streetLine2: appState.billingAddress?.streetLine2 || '',
      city: appState.billingAddress?.city || '',
      province: appState.billingAddress?.province || '',
      postalCode: appState.billingAddress?.postalCode || '',
      countryCode: appState.billingAddress?.countryCode || '',
      phoneNumber: appState.billingAddress?.phoneNumber || '',
      defaultShipping: false,
      defaultBilling: true,
      source: 'checkout' as const
    });
  }
}
```

**Key Implementation Details:**
- Preserves existing UI and validation logic
- Adds address caching after successful submission
- Handles TypeScript type safety with default values
- Manages billing address differences (no `company` property)

### 4. LoginModal.tsx Integration
**Location:** `src/components/auth/LoginModal.tsx`

**Key Changes:**
```typescript
// After successful login
if (loginResult.success) {
  // Sync addresses from Vendure after login
  try {
    await LocalAddressService.syncFromVendure();
  } catch (error) {
    console.warn('Failed to sync addresses after login:', error);
  }
  
  // Existing success logic...
}
```

### 5. AccountNav.tsx Integration
**Location:** `src/components/account/AccountNav.tsx`

**Key Changes:**
```typescript
// In logout handler
const handleLogout = $(() => {
  // Clear cached addresses on logout
  LocalAddressService.clearAddresses();
  
  // Existing logout logic...
});
```

## Implementation Steps

### Step 1: Create LocalAddressService
1. Create `src/services/LocalAddressService.ts`
2. Implement core interfaces and service class
3. Add methods for CRUD operations, caching, and sync

### Step 2: Create AddressContext Provider
1. Create `src/providers/shop/address/AddressContext.tsx`
2. Implement Qwik context with proper patterns
3. Add state management and actions

### Step 3: Integrate with Authentication
1. Update `LoginModal.tsx` to sync addresses after login
2. Update `AccountNav.tsx` to clear addresses on logout

### Step 4: Integrate with Checkout
1. Update `CheckoutAddresses.tsx` to save addresses after submission
2. Add cross-tab sync setup
3. Handle TypeScript type safety

### Step 5: Testing and Validation
1. Run linter: `pnpm lint`
2. Test development build: `pnpm dev`
3. Test production build: `pnpm build`

## Common Issues and Solutions

### TypeScript Errors
**Issue:** Properties could be `undefined` but expected as `string`
**Solution:** Provide default empty string values:
```typescript
streetLine1: appState.shippingAddress?.streetLine1 || '',
```

**Issue:** `BillingAddress` doesn't have `company` property
**Solution:** Explicitly set to empty string:
```typescript
company: '', // BillingAddress doesn't have company property
```

### Qwik Hook Usage Errors
**Issue:** `use*` methods called in wrong function
**Solution:** Ensure hooks are only called within Qwik components or `$` functions

### Linter Errors
**Issue:** Unused variables
**Solution:** Comment out unused imports/variables:
```typescript
// const addressContext = useAddressContext();
```

## Key Patterns and Best Practices

### 1. Qwik Serialization
- Use `$()` wrapper for functions that need serialization
- Keep component logic within proper Qwik boundaries

### 2. Type Safety
- Always provide default values for potentially undefined properties
- Use `as const` for literal types when needed

### 3. Error Handling
- Wrap async operations in try-catch blocks
- Provide fallback behavior for sync failures

### 4. Cross-Tab Sync
- Use `storage` events for real-time synchronization
- Implement proper cleanup for event listeners

### 5. Cache Management
- Use version-based cache invalidation
- Implement proper cache cleanup on logout

## Testing Checklist

- [ ] Linter passes without errors
- [ ] Development server starts successfully
- [ ] Production build completes successfully
- [ ] Address saving works in checkout flow
- [ ] Cross-tab synchronization functions
- [ ] Login/logout flows handle addresses correctly
- [ ] No console errors in browser

## Dependencies

No additional dependencies required. The implementation uses:
- Qwik's built-in context and state management
- Browser's `sessionStorage` API
- Standard JavaScript/TypeScript features

## Notes

- The service uses `sessionStorage` instead of `localStorage` for security
- Cross-tab sync works within the same browser session
- Addresses are automatically cleared on logout for privacy
- The implementation preserves all existing UI and validation logic
- Default address management is handled automatically

This implementation provides a robust, type-safe address management system that integrates seamlessly with existing Qwik/Vendure applications.