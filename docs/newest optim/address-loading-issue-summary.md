# Address Loading Issue: Summary and Resolution

This document outlines the root cause of the address loading failure during checkout and the step-by-step implementation of the final, robust solution.

## The Problem

After a user logs in on the client-side, their saved addresses fail to appear on their first visit to the checkout page. The addresses only load upon a second navigation to the same page. This issue stemmed from a combination of stale server-rendered data and an incomplete client-side data-fetching strategy.

## Root Cause Analysis

1.  **Stale Server-Side State:** The application is initially rendered on the server for a non-authenticated (guest) user. The initial data provided to the client (`layoutData`) reflects this guest state and, therefore, does not contain any customer addresses.

2.  **Client-Side Login:** When the user logs in on the client, the application state updates to reflect the authenticated user. However, the initial server-provided `layoutData` is not automatically refreshed.

3.  **Blocking Main Thread:** The address fetching logic was placed in the main `useVisibleTask$` hook in `layout.tsx`. This blocked the main rendering thread, causing a timeout error and preventing the page from loading.

4.  **The Unintentional Fallback Mechanism:** A separate `useVisibleTask$` hook located in the `CheckoutAddresses.tsx` component was inadvertently acting as the sole mechanism for loading addresses post-login.
    *   **First Visit (Failure):** On the first visit to the checkout page, this hook would trigger. However, it often ran into a race condition where the global `appState` had not yet been fully populated with the customer's ID from the layout's data fetch. The address fetch would fail because it lacked the necessary customer ID.
    *   **Second Visit (Success):** By the time the user navigated to the checkout page a second time, the layout-level task had completed, and the `appState` was updated with the customer ID. The `useVisibleTask$` in `CheckoutAddresses.tsx` could then successfully fetch and display the addresses.

## The Final Solution

The core of the solution is to establish the root layout (`layout.tsx`) as the single, reliable source of truth for all essential customer data, including addresses, especially after a client-side login, without blocking the main rendering thread.

### Step 1: Isolate Address Fetching Logic

The primary issue was that the address fetching logic was blocking the main thread. To resolve this, the address fetching logic was moved into a separate, non-blocking `useVisibleTask$` hook in `frontend/src/routes/layout.tsx`.

This new `useVisibleTask$` hook is responsible for:
- Tracking the `customer.id` to detect when a user is logged in.
- Triggering a fetch for the customer's address book from the `LocalAddressService`.
- Populating the global `appState` with the fetched addresses.

Here is the code that was added to `frontend/src/routes/layout.tsx`:

```typescript
// ... existing code ...
import { LocalAddressService } from '~/services/LocalAddressService';

// ... existing code ...

    useVisibleTask$(async ({ track }) => {
		track(() => state.customer?.id);
		if (state.customer && state.customer.id !== CUSTOMER_NOT_DEFINED_ID && state.addressBook.length === 0) {
			try {
				await LocalAddressService.syncFromVendure(state.customer.id);
				const addresses = LocalAddressService.getAddresses();
				state.addressBook = addresses;
				if (addresses.length > 0 && !state.shippingAddress.streetLine1) {
					const defaultShipping = addresses.find(a => a.defaultShippingAddress) || addresses[0];
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
					}
				}
			} catch (error) {
				console.error("Failed to sync addresses in layout:", error);
			}
		}
	});

// ... existing code ...
```

### Step 2: Clean Up Redundant Logic

With the `layout.tsx` now reliably managing the address data, the `useVisibleTask$` hook within `CheckoutAddresses.tsx` became redundant and was removed to ensure there is only one data-fetching mechanism.

### Step 3: Test the End-to-End Flow

The final step was to test the entire user journey to ensure the fix was working as expected:
1.  Start as a guest user.
2.  Log in.
3.  Navigate to the checkout page for the first time.
4.  Verify that the addresses are loaded correctly and immediately without any timeout errors.

## Appendix: Related Improvements

### Shipping and Billing Address Handling Issue

A bug was identified in the address handling logic within the `submitAddresses` function in `CheckoutAddresses.tsx`. When a user created a new address, the logic did not correctly distinguish between shipping and billing addresses, especially when a separate billing address was provided. This could lead to the shipping address being updated incorrectly when a new billing address was intended to be created.

The solution involved refactoring the address handling logic to correctly differentiate between shipping and billing addresses. This was achieved by:
1.  Creating separate input objects (`shippingAddressInput` and `billingAddressInput`) for shipping and billing addresses.
2.  Explicitly setting the `defaultShippingAddress` and `defaultBillingAddress` flags based on user selection (`useDifferentBilling`).
3.  Adding logic to check if a default billing address already exists and is different from the default shipping address before attempting to update it.
4.  Ensuring that a new address is created when no suitable existing address is found.

This ensures that shipping and billing addresses are created and updated correctly, reflecting the user's intent.

Here is the updated logic in `frontend/src/components/checkout/CheckoutAddresses.tsx`:

```typescript
// ... existing code ...
        if (activeCustomer) {
          try {
            const customerAddresses = await getActiveCustomerAddressesQuery();
            const defaultShipping = customerAddresses?.addresses?.find((a) => a.defaultShippingAddress);

            const shippingAddressInput = {
                fullName: `${appState.customer.firstName || ''} ${appState.customer.lastName || ''}`.trim(),
                streetLine1: appState.shippingAddress.streetLine1 || '',
                streetLine2: appState.shippingAddress.streetLine2 || '',
                city: appState.shippingAddress.city || '',
                province: appState.shippingAddress.province || '',
                postalCode: appState.shippingAddress.postalCode || '',
                countryCode: appState.shippingAddress.countryCode || '',
                phoneNumber: appState.customer.phoneNumber || '',
                company: appState.shippingAddress.company || '',
                defaultShippingAddress: true,
                defaultBillingAddress: !useDifferentBilling.value,
            };

            if (defaultShipping) {
                await updateCustomerAddress({
                    id: defaultShipping.id,
                    ...shippingAddressInput
                }, getCookie(AUTH_TOKEN));
            } else {
                const shippingAddressResult = await createCustomerAddress(shippingAddressInput, getCookie(AUTH_TOKEN));
                if (shippingAddressResult.createCustomerAddress.__typename !== 'Address') {
                    console.error('Failed to create customer shipping address', shippingAddressResult);
                }
            }

            if (useDifferentBilling.value) {
                const defaultBilling = customerAddresses?.addresses?.find((a) => a.defaultBillingAddress);
                const billingAddressInput = {
                    fullName: `${appState.billingAddress.firstName || ''} ${appState.billingAddress.lastName || ''}`.trim(),
                    streetLine1: appState.billingAddress.streetLine1 || '',
                    streetLine2: appState.billingAddress.streetLine2 || '',
                    city: appState.billingAddress.city || '',
                    province: appState.billingAddress.province || '',
                    postalCode: appState.billingAddress.postalCode || '',
                    countryCode: appState.billingAddress.countryCode || '',
                    defaultBillingAddress: true,
                    defaultShippingAddress: false,
                };

                if (defaultBilling && defaultBilling.id !== defaultShipping?.id) {
                    await updateCustomerAddress({
                        id: defaultBilling.id,
                        ...billingAddressInput
                    }, getCookie(AUTH_TOKEN));
                } else {
                    const billingAddressResult = await createCustomerAddress(billingAddressInput, getCookie(AUTH_TOKEN));

                    if (billingAddressResult.createCustomerAddress.__typename !== 'Address') {
                        console.error('Failed to create customer billing address', billingAddressResult);
                    }
                }
            }
          } catch (err) {
            console.error('Error creating/updating customer address:', err);
          }
        }
// ... existing code ...
```

### LocalAddressService

The `LocalAddressService` is a client-side service responsible for managing a user's address book. It provides a simple and consistent API for creating, reading, updating, and deleting addresses, while also handling synchronization with the Vendure backend. The service was designed to be the single source of truth for all address-related data on the client-side.

### AddressForm.tsx Refactoring

The `AddressForm.tsx` component was refactored to improve state management, validation, and localization. These changes resolved several issues, including a reactive loop that caused unnecessary re-renders, missing translations, and UI instability. The form now uses a more robust state management solution that isolates form state from the global application state, and includes improved validation and error handling.