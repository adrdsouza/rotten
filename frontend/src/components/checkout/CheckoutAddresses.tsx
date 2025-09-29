import { $, component$, useContext, useSignal, QRL, useVisibleTask$, useComputed$ } from '@builder.io/qwik';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID, AUTH_TOKEN } from '~/constants';
import AddressForm from '~/components/address-form/AddressForm';
import BillingAddressForm from '~/components/billing-address-form/BillingAddressForm';
// LoginModal moved to parent component
import {
  getActiveOrderQuery,
  setCustomerForOrderMutation,
} from '~/providers/shop/orders/order';
import {
  getActiveCustomerCached,
  getActiveCustomerAddressesQuery,
  createCustomerAddressMutation as createCustomerAddress,
  updateCustomerAddressMutation as updateCustomerAddress,
} from '~/providers/shop/customer/customer';
import { Order } from '~/generated/graphql';
import { isActiveCustomerValid, isShippingAddressValid, isBillingAddressValid, getCookie } from '~/utils';
import { validateEmail, validateName, validatePhone, filterPhoneInput, sanitizePhoneNumber } from '~/utils/validation';

import { useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { useLoginModalActions } from '~/contexts/LoginModalContext';
// import { useAddressContext } from '~/contexts/AddressContext'; // Not used in current implementation

// Import shared addressState instead of defining it here
import { addressState } from '~/utils/checkout-state';
import { useCheckoutAddressState } from '~/contexts/CheckoutAddressContext';
import { CheckoutOptimizationService } from '~/services/CheckoutOptimizationService';
import { LocalAddressService } from '~/services/LocalAddressService';


// Interfaces for the component
interface CheckoutAddressesProps {
  onAddressesSubmitted$?: QRL<() => void>;
}

export const CheckoutAddresses = component$<CheckoutAddressesProps>(({ onAddressesSubmitted$ }) => {
  // ... existing hooks ...
  const appState = useContext(APP_STATE);
  const validationActions = useCheckoutValidationActions();
  const { openLoginModal } = useLoginModalActions();
  const checkoutAddressState = useCheckoutAddressState();
  const useDifferentBilling = useSignal<boolean>(false);
  const isLoading = useSignal<boolean>(false);
  const billingHasBeenActivated = useSignal<boolean>(false); // Track if billing was ever activated
  
  // Login modal state is now handled by parent component
  
  // Individual error signals like the old implementation
  const emailValidationError = useSignal<string>('');
  const emailTouched = useSignal<boolean>(false);
  const firstNameValidationError = useSignal<string>('');
  const firstNameTouched = useSignal<boolean>(false);
  const lastNameValidationError = useSignal<string>('');
  const lastNameTouched = useSignal<boolean>(false);
  const phoneValidationError = useSignal<string>('');
  const phoneTouched = useSignal<boolean>(false);
  
  // Create local signals that will be connected to our exported state
  const addressSubmissionComplete = useSignal<boolean>(false);
  const addressSubmissionInProgress = useSignal<boolean>(false);
  
  // Add back missing signals
  const error = useSignal('');
  const isFormValidSignal = useSignal(false);
  const hasProceeded = useSignal(false);
  const validationTimer = useSignal<NodeJS.Timeout | null>(null);
  
  // Complete customer validation with proper phone optional logic
  // 🚨 MOVE THIS TO THE TOP TO ENSURE IT'S AVAILABLE FOR ALL TASKS
  const validateCompleteForm$ = $(() => {
    const countryCode = appState.shippingAddress.countryCode || 'US';
    const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
    
    // Get current customer data - ensure all fields are strings
    const customer = {
      firstName: appState.customer?.firstName || '',
      lastName: appState.customer?.lastName || '',
      emailAddress: appState.customer?.emailAddress || '',
      phoneNumber: appState.customer?.phoneNumber || '',
    };
    
    // Individual validations
    const firstNameResult = validateName(customer.firstName, 'First name');
    const lastNameResult = validateName(customer.lastName, 'Last name');
    const emailResult = validateEmail(customer.emailAddress);
    const phoneResult = validatePhone(customer.phoneNumber, countryCode, isPhoneOptional);
    
    // Customer validation using utility with proper ActiveCustomer object
    const customerForValidation = {
      ...customer,
      id: appState.customer?.id || '',
    };
    const customerValid = isActiveCustomerValid(customerForValidation as any);
    
    // Phone requirement validation (non-US/PR countries require phone)
    const phoneRequirementValid = isPhoneOptional || phoneResult.isValid;
    
    // Shipping address validation
    const shippingAddressValid = isShippingAddressValid(appState.shippingAddress);
    
    let billingAddressValid = true;
    if (useDifferentBilling.value) {
      billingAddressValid = isBillingAddressValid(appState.billingAddress);
    }
    // If checkbox is OFF, billing is always valid since it inherits from shipping
    
    const overallValid = customerValid && phoneResult.isValid && phoneRequirementValid && shippingAddressValid && billingAddressValid;

    // Update individual error signals - use empty strings for signal clearing
    emailValidationError.value = emailResult.isValid ? '' : (emailResult.message || 'Invalid email');
    firstNameValidationError.value = firstNameResult.isValid ? '' : (firstNameResult.message || 'Invalid first name');
    lastNameValidationError.value = lastNameResult.isValid ? '' : (lastNameResult.message || 'Invalid last name');
    phoneValidationError.value = phoneResult.isValid ? '' : (phoneResult.message || 'Invalid phone number');
    
    // Update form valid state
    isFormValidSignal.value = overallValid;
    
    // Update the checkout validation context
    validationActions.updateCustomerValidation(
      customerValid && phoneResult.isValid && phoneRequirementValid,
      {
        email: emailResult.isValid ? undefined : (emailResult.message || 'Invalid email'),
        firstName: firstNameResult.isValid ? undefined : (firstNameResult.message || 'Invalid first name'),
        lastName: lastNameResult.isValid ? undefined : (lastNameResult.message || 'Invalid last name'),
        phone: phoneResult.isValid ? undefined : (phoneResult.message || 'Invalid phone number')
      },
      emailTouched.value || firstNameTouched.value || lastNameTouched.value || phoneTouched.value
    );

    validationActions.updateShippingAddressValidation(
      shippingAddressValid,
      shippingAddressValid ? {} : { streetLine1: 'Address is required' }, // Simplified error for now
      true // Assume touched if we're validating
    );

    validationActions.updateBillingMode(useDifferentBilling.value);
    
    if (useDifferentBilling.value) {
      validationActions.updateBillingAddressValidation(
        billingAddressValid,
        billingAddressValid ? {} : { streetLine1: 'Billing address is required' }, // Simplified error for now
        true
      );
    }
    
    // Don't sync to appState here to prevent circular dependency
    // State synchronization will be handled by the form submission process
    if (overallValid) {
      // console.log('[CheckoutAddresses] Customer validation passed');
    } else {
      // console.log('[CheckoutAddresses] Customer validation failed');
    }
  });

  // Computed signal for phone placeholder - ensures immediate reactivity to country changes
  const phonePlaceholder = useComputed$(() => {
    const countryCode = appState.shippingAddress.countryCode || 'US';
    const isOptional = countryCode === 'US' || countryCode === 'PR';
    return `Phone number${isOptional ? ' (optional)' : ' *'}` as string;
  });

  // Sync local signals with exported state and track validation
  useVisibleTask$(({ track }) => {
    track(() => addressSubmissionComplete.value);
    track(() => addressSubmissionInProgress.value);
    
    // Update the new context instead of the global state
    checkoutAddressState.addressSubmissionComplete = addressSubmissionComplete.value;
    checkoutAddressState.addressSubmissionInProgress = addressSubmissionInProgress.value;
    
    // Also update the legacy global state for backward compatibility during refactor
    addressState.addressSubmissionComplete = addressSubmissionComplete.value;
    addressState.addressSubmissionInProgress = addressSubmissionInProgress.value;
  });


  
  // Initialize billingAddress and handle inheritance from shipping - separated into multiple tasks to prevent conflicts
  
  // Task 1: Handle billing checkbox toggle (only runs when checkbox state changes)
  // Client-side execution to prevent Q20 SSR errors
  useVisibleTask$(({ track }) => {
    track(() => useDifferentBilling.value);
    
    // If billing checkbox is OFF, always inherit from shipping
    if (!useDifferentBilling.value) {
      appState.billingAddress = {
        firstName: appState.customer?.firstName || '',
        lastName: appState.customer?.lastName || '',
        streetLine1: appState.shippingAddress.streetLine1 || '',
        streetLine2: appState.shippingAddress.streetLine2 || '',
        city: appState.shippingAddress.city || '',
        province: appState.shippingAddress.province || '',
        postalCode: appState.shippingAddress.postalCode || '',
        countryCode: appState.shippingAddress.countryCode || '',
      };
      // console.log('[CheckoutAddresses] Billing address inheriting from shipping (checkbox OFF)');
    } else {
      // Checkbox is ON - handle first time activation
      if (!billingHasBeenActivated.value) {
        billingHasBeenActivated.value = true;
        // Initialize billing with only name and country from customer/shipping
        appState.billingAddress = {
          firstName: appState.customer?.firstName || '',
          lastName: appState.customer?.lastName || '',
          streetLine1: '',
          streetLine2: '',
          city: '',
          province: '',
          postalCode: '',
          countryCode: appState.shippingAddress.countryCode || '',
        };
        // console.log('[CheckoutAddresses] Billing address initialized with only name and country (checkbox first activation)');
      } else if (!appState.billingAddress) {
        // Safety check - if billing address is somehow missing, initialize it
        appState.billingAddress = {
          firstName: appState.customer?.firstName || '',
          lastName: appState.customer?.lastName || '',
          streetLine1: '',
          streetLine2: '',
          city: '',
          province: '',
          postalCode: '',
          countryCode: appState.shippingAddress.countryCode || '',
        };
        // console.log('[CheckoutAddresses] Billing address safety initialization with only name and country');
      }
      // If checkbox is ON and billing has been activated before, preserve existing billing values
      // console.log('[CheckoutAddresses] Billing address preserved (checkbox ON, previously activated)');
    }
  });
  
  // Task 2: Handle country changes - only update billing country if checkbox is OFF (inherit mode)
  // Client-side execution to prevent Q20 SSR errors
  useVisibleTask$(({ track }) => {
    track(() => appState.shippingAddress.countryCode);
    
    // Only update billing address country if checkbox is OFF (inherit mode)
    if (!useDifferentBilling.value) {
      if (appState.billingAddress) {
        appState.billingAddress.countryCode = appState.shippingAddress.countryCode || '';
        // console.log('[CheckoutAddresses] Updated billing country to match shipping (inherit mode):', appState.billingAddress.countryCode);
      }
    }
    // If checkbox is ON, preserve user's billing country selection - don't interfere
  });
  
  // Country initialization removed - will be handled by layout.tsx or user selection

  // Clear validation errors when customer data is updated (e.g., after login)
  // Client-side execution to prevent Q20 SSR errors
  useVisibleTask$(({ track }) => {
    track(() => appState.customer?.emailAddress);
    track(() => appState.customer?.firstName);
    track(() => appState.customer?.lastName);
    track(() => appState.customer?.phoneNumber);
    
    // Clear validation errors for fields that now have valid data from login
    if (appState.customer?.emailAddress && !emailTouched.value) {
      emailValidationError.value = '';
    }
    if (appState.customer?.firstName && !firstNameTouched.value) {
      firstNameValidationError.value = '';
    }
    if (appState.customer?.lastName && !lastNameTouched.value) {
      lastNameValidationError.value = '';
    }
    if (appState.customer?.phoneNumber && !phoneTouched.value) {
      phoneValidationError.value = '';
    }
  });

  // Update form fields when shipping address changes (e.g., after login)
  // Client-side execution to prevent Q20 SSR errors
  useVisibleTask$(({ track }) => {
    // Track all shipping address fields that might change after login
    track(() => appState.shippingAddress?.streetLine1);
    track(() => appState.shippingAddress?.streetLine2);
    track(() => appState.shippingAddress?.city);
    track(() => appState.shippingAddress?.province);
    track(() => appState.shippingAddress?.postalCode);
    track(() => appState.shippingAddress?.countryCode);
    track(() => appState.customer?.phoneNumber);

    // When shipping address is populated (e.g., after login), update form validation state
    // This ensures the address fields are properly validated and the form can proceed
    if (appState.shippingAddress?.streetLine1) {
      // Mark phone as touched if it has a value from login, so validation errors show
      if (appState.customer?.phoneNumber && !phoneTouched.value) {
        phoneTouched.value = true;
        // Immediately validate the phone number with the current country
        const countryCode = appState.shippingAddress.countryCode || 'US';
        const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
        const phoneResult = validatePhone(appState.customer.phoneNumber, countryCode, isPhoneOptional);
        if (!phoneResult.isValid) {
          phoneValidationError.value = phoneResult.message || 'Invalid phone number';
        }
      }

      // Trigger validation to update the form state
      validateCompleteForm$();
    }
  });

  // Main validation task - track only address fields, not customer to prevent circular dependency
  // Client-side execution to prevent Q20 SSR errors
  useVisibleTask$(({ track }) => {
    track(() => appState.shippingAddress);
    track(() => appState.shippingAddress.countryCode);
    track(() => useDifferentBilling.value);
    track(() => appState.billingAddress);
    
    // Allow validation to run immediately when address data changes
    // This ensures payment section activates as soon as shipping address is complete
    // console.log('[CheckoutAddresses] Triggering validation due to form data change');

    // 🚀 SOPHISTICATED DEBOUNCING: Use different timing based on validation type
    if (validationTimer.value) {
      clearTimeout(validationTimer.value);
    }

    // Use shorter debounce for address changes (200ms) vs longer for other changes (400ms)
    const debounceTime = appState.shippingAddress ? 200 : 400;
    validationTimer.value = setTimeout(() => {
      validateCompleteForm$();
    }, debounceTime);
  });

  // 🚀 IMMEDIATE country code change handler - enhanced validation logic
  // Client-side execution to prevent Q20 SSR errors
  useVisibleTask$(({ track }) => {
    track(() => appState.shippingAddress.countryCode);

    // Immediately re-validate phone when country changes (no debounce for country changes)
    const countryCode = appState.shippingAddress.countryCode || 'US';
    const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
    const customerPhoneNumber = (appState.customer?.phoneNumber || '') as string;

    console.log(`📍 [CheckoutAddresses] Country changed to: ${countryCode}, Phone optional: ${isPhoneOptional}`);

    // Immediately re-validate phone with new country rules
    // Mark phone as touched if it has a value, so validation errors show in UI
    if (customerPhoneNumber) {
      if (!phoneTouched.value) {
        phoneTouched.value = true;
      }
      const phoneResult = validatePhone(customerPhoneNumber, countryCode, isPhoneOptional);
      phoneValidationError.value = phoneResult.isValid ? '' : (phoneResult.message || 'Invalid phone number');

      console.log(`📞 [CheckoutAddresses] Phone re-validated for ${countryCode}: ${phoneResult.isValid ? 'valid' : (phoneResult.message || 'Invalid phone number')}`);
    }

    // Address field validation now handled in AddressForm component itself

    // Trigger immediate complete validation for country changes
    validateCompleteForm$();
  });

  // Submit addresses to the API - moved before useTask$ that calls it
  const submitAddresses = $(async () => {
    try {
      addressSubmissionInProgress.value = true;
      isLoading.value = true;

      // Update the new context
      checkoutAddressState.addressSubmissionInProgress = true;
      
      // Sync customer data to appState before submission since we removed the automatic sync
      const customerForSync = {
        firstName: appState.customer?.firstName || '',
        lastName: appState.customer?.lastName || '',
        emailAddress: appState.customer?.emailAddress || '',
        phoneNumber: appState.customer?.phoneNumber || '',
        id: appState.customer?.id || '',
        title: appState.customer?.title || '',
      };
      appState.customer = { ...customerForSync };
      // console.log('[CheckoutAddresses] Syncing customer data to appState for submission');

      // Set addresses and customer info on Vendure order if one exists
      // This should happen regardless of isLocalMode - if we have a Vendure order, it needs proper setup
      if (appState.activeOrder) {
        // First check if customer is already authenticated
        const activeCustomer = await getActiveCustomerCached();
          
          if (activeCustomer) {
            // console.log('Customer is already authenticated:', activeCustomer.emailAddress);
            // Customer is logged in - verify the order has the customer association
            const latestOrder = await getActiveOrderQuery();
            if (latestOrder) {
              appState.activeOrder = latestOrder as Order;
              if (latestOrder.customer) {
                // console.log('✅ Authenticated customer order confirmed:', latestOrder.customer.emailAddress);
              } else {
                // console.log('⚠️ Order exists but no customer association found - this is unusual for authenticated users');
              }
            }
          } else {
            // No authenticated customer - check if order already has customer (guest checkout)
            const latestOrderBeforeCustomerSet = await getActiveOrderQuery();
            if (latestOrderBeforeCustomerSet && latestOrderBeforeCustomerSet.customer) {
              // console.log('Active order already has a customer associated:', latestOrderBeforeCustomerSet.customer.emailAddress);
              appState.activeOrder = latestOrderBeforeCustomerSet as Order;
              // console.log('Skipping setCustomerForOrderMutation as customer is already set for this order.');
            } else {
              // Guest checkout - set customer for order
              const customerData = {
                emailAddress: appState.customer.emailAddress || '',
                firstName: appState.customer.firstName || '',
                lastName: appState.customer.lastName || '',
                phoneNumber: appState.customer.phoneNumber || '',
              };
              // console.log('Attempting to set customer for order (guest checkout) with data:', customerData);
              const customerResult = await setCustomerForOrderMutation(customerData);

              if (customerResult.__typename === 'Order') {
                // console.log('Successfully set customer for order');
                appState.activeOrder = customerResult as Order;
              } else if (customerResult.__typename === 'EmailAddressConflictError') {
                // Guest checkout with existing customer email - automatically link the order
                // console.log('EmailAddressConflictError: Guest order automatically linked to existing customer account:', customerResult.message);
                // The order should be automatically linked, so we continue with the flow
                // Fetch the updated order to get the linked customer information
                const updatedOrder = await getActiveOrderQuery();
                if (updatedOrder) {
                  appState.activeOrder = updatedOrder as Order;
                  // console.log('Order successfully linked to existing customer:', updatedOrder.customer?.emailAddress);
                }
              } else if (customerResult.__typename === 'AlreadyLoggedInError') {
                // User is already logged in, no need to set customer again
                // console.log('Customer already logged in, skipping customer setup:', customerResult.message);
                const updatedOrder = await getActiveOrderQuery();
                if (updatedOrder) {
                  appState.activeOrder = updatedOrder as Order;
                }
              } else if (customerResult.__typename === 'GuestCheckoutError') {
                // Guest checkout not allowed by configuration
                // console.error('Guest checkout not allowed:', customerResult.message);
                throw new Error('Guest checkout is not enabled. Please create an account or log in to continue.');
              } else if (customerResult.__typename === 'NoActiveOrderError') {
                // No active order exists
                // console.error('No active order found when setting customer:', customerResult.message);
                throw new Error('No active order found. Please restart your checkout process.');
              } else {
                // console.error('Unexpected error setting customer for order. Result:', JSON.stringify(customerResult, null, 2));
                throw new Error('Failed to set customer for order: ' + (customerResult as any).message || 'Unknown error');
              }
            }
          }

        // Check for active order before attempting address mutations
        const latestOrderBeforeMutations = await getActiveOrderQuery();
        if (!latestOrderBeforeMutations || !latestOrderBeforeMutations.id) {
          // console.error('❌ No active order found before setting addresses. Order state:', latestOrderBeforeMutations);
          throw new Error('No active order found. Please retry the checkout process.');
        }
        appState.activeOrder = latestOrderBeforeMutations; // Update appState with the latest order data
        // console.log('✅ Active order confirmed before address mutations:', latestOrderBeforeMutations.code);

        // 🚀 OPTIMIZATION: Use parallel processing for address and shipping setup
        // This reduces checkout time by running independent operations concurrently
        console.log('🚀 Using optimized parallel processing for address and shipping setup...');
        
        // Ensure country code is defined before proceeding
        if (!appState.shippingAddress.countryCode) {
          throw new Error('Country code is required for shipping address');
        }

        // Prepare address inputs for parallel processing
        const shippingAddressInput = {
          fullName: `${appState.customer.firstName || ''} ${appState.customer.lastName || ''}`.trim(),
          streetLine1: appState.shippingAddress.streetLine1 || '',
          streetLine2: appState.shippingAddress.streetLine2 || '',
          city: appState.shippingAddress.city || '',
          province: appState.shippingAddress.province || '',
          postalCode: appState.shippingAddress.postalCode || '',
          countryCode: appState.shippingAddress.countryCode,
          phoneNumber: appState.customer.phoneNumber || '',
          company: appState.shippingAddress.company || ''
        };

        let billingAddressInput = undefined;
        if (useDifferentBilling.value) {
          // Ensure country code is defined for billing address
          if (!appState.billingAddress.countryCode) {
            throw new Error('Country code is required for billing address');
          }
          
          billingAddressInput = {
            fullName: `${appState.billingAddress.firstName || ''} ${appState.billingAddress.lastName || ''}`.trim(),
            streetLine1: appState.billingAddress.streetLine1 || '',
            streetLine2: appState.billingAddress.streetLine2 || '',
            city: appState.billingAddress.city || '',
            province: appState.billingAddress.province || '',
            postalCode: appState.billingAddress.postalCode || '',
            countryCode: appState.billingAddress.countryCode || '',
          };
        }

        // Execute optimized parallel processing
        const checkoutResult = await CheckoutOptimizationService.optimizedCheckoutProcessing(
          shippingAddressInput,
          billingAddressInput,
          appState.activeOrder?.subTotalWithTax || 0
        );

        // Update order with the result
        appState.activeOrder = checkoutResult.order;

        // Log any non-critical errors
        if (checkoutResult.errors.length > 0) {
          console.warn('⚠️ Some non-critical errors occurred during checkout:', checkoutResult.errors);
        }

        // Log success
        console.log('✅ Parallel address and shipping setup completed successfully');
        if (checkoutResult.shippingMethodsApplied) {
          console.log('📦 Shipping method automatically applied');
        }
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
      } else {
        // console.log('🛒 Local cart mode: Skipping order mutations until Place Order is clicked');
      }

      // console.log('✅ All addresses set successfully');

      // Save addresses to LocalAddressService after successful submission
      try {
        // Determine source based on customer login status
        const isLoggedIn = appState.customer?.id && appState.customer.id !== CUSTOMER_NOT_DEFINED_ID;

        if (appState.shippingAddress.streetLine1) {
          const savedShippingAddress = isLoggedIn
            ? LocalAddressService.saveOrUpdateDefaultShippingAddress({
                firstName: appState.customer?.firstName || '',
                lastName: appState.customer?.lastName || '',
                fullName: `${appState.customer?.firstName || ''} ${appState.customer?.lastName || ''}`.trim(),
                company: appState.shippingAddress.company || '',
                streetLine1: appState.shippingAddress.streetLine1 || '',
                streetLine2: appState.shippingAddress.streetLine2 || '',
                city: appState.shippingAddress.city || '',
                province: appState.shippingAddress.province || '',
                postalCode: appState.shippingAddress.postalCode || '',
                countryCode: appState.shippingAddress.countryCode || '',
                phoneNumber: appState.customer?.phoneNumber || '',
                defaultShippingAddress: true,
                defaultBillingAddress: !useDifferentBilling.value, // Set as billing address if not using separate billing
                source: 'customer'
              })
            : LocalAddressService.saveAddress({
                firstName: appState.customer?.firstName || '',
                lastName: appState.customer?.lastName || '',
                fullName: `${appState.customer?.firstName || ''} ${appState.customer?.lastName || ''}`.trim(),
                company: appState.shippingAddress.company || '',
                streetLine1: appState.shippingAddress.streetLine1 || '',
                streetLine2: appState.shippingAddress.streetLine2 || '',
                city: appState.shippingAddress.city || '',
                province: appState.shippingAddress.province || '',
                postalCode: appState.shippingAddress.postalCode || '',
                countryCode: appState.shippingAddress.countryCode || '',
                phoneNumber: appState.customer?.phoneNumber || '',
                defaultShippingAddress: true,
                defaultBillingAddress: false,
                source: 'checkout'
              });

          // If customer is logged in, sync to Vendure
          if (isLoggedIn) {
            LocalAddressService.syncToVendure(savedShippingAddress).catch(error => {
              console.warn('Failed to sync shipping address to Vendure:', error);
            });
          }
        }

        if (useDifferentBilling.value && appState.billingAddress?.streetLine1) {
          const savedBillingAddress = isLoggedIn
            ? LocalAddressService.saveOrUpdateDefaultBillingAddress({
                firstName: appState.billingAddress.firstName || '',
                lastName: appState.billingAddress.lastName || '',
                fullName: `${appState.billingAddress.firstName || ''} ${appState.billingAddress.lastName || ''}`.trim(),
                company: '',
                streetLine1: appState.billingAddress.streetLine1 || '',
                streetLine2: appState.billingAddress.streetLine2 || '',
                city: appState.billingAddress.city || '',
                province: appState.billingAddress.province || '',
                postalCode: appState.billingAddress.postalCode || '',
                countryCode: appState.billingAddress.countryCode || '',
                phoneNumber: '',
                defaultShippingAddress: false,
                defaultBillingAddress: true,
                source: 'customer'
              })
            : LocalAddressService.saveAddress({
                firstName: appState.billingAddress.firstName || '',
                lastName: appState.billingAddress.lastName || '',
                fullName: `${appState.billingAddress.firstName || ''} ${appState.billingAddress.lastName || ''}`.trim(),
                company: '',
                streetLine1: appState.billingAddress.streetLine1 || '',
                streetLine2: appState.billingAddress.streetLine2 || '',
                city: appState.billingAddress.city || '',
                province: appState.billingAddress.province || '',
                postalCode: appState.billingAddress.postalCode || '',
                countryCode: appState.billingAddress.countryCode || '',
                phoneNumber: '',
                defaultShippingAddress: false,
                defaultBillingAddress: true,
                source: 'checkout'
              });

          // If customer is logged in, sync to Vendure
          if (isLoggedIn) {
            LocalAddressService.syncToVendure(savedBillingAddress).catch(error => {
              console.warn('Failed to sync billing address to Vendure:', error);
            });
          }
        }

        // console.log('✅ Addresses saved to LocalAddressService');
      } catch (addressSaveError) {
        console.error('Failed to save addresses to LocalAddressService:', addressSaveError);
        // Don't fail the entire process for address saving issues
      }

      // Notify parent component that addresses have been submitted
      if (onAddressesSubmitted$) {
        await onAddressesSubmitted$();
      }

      // Mark as complete for external coordination
      addressSubmissionComplete.value = true;
      checkoutAddressState.addressSubmissionComplete = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      // console.error('❌ Checkout error:', err);
      hasProceeded.value = false; // Allow retry on error
    } finally {
      isLoading.value = false;
      addressSubmissionInProgress.value = false;
      checkoutAddressState.addressSubmissionInProgress = false;
    }
  });

  // Expose submit function globally for the checkout page to use
  useVisibleTask$(() => {
    if (typeof window !== 'undefined') {
      (window as any).submitCheckoutAddressForm = submitAddresses;
      // console.log('[CheckoutAddresses] Exposed submitCheckoutAddressForm to window object');
    }

    // 🚀 MEMORY MANAGEMENT: Cleanup function for timers and global references
    return () => {
      // Clear any pending validation timer
      if (validationTimer.value) {
        clearTimeout(validationTimer.value);
        validationTimer.value = null;
        // console.log('[CheckoutAddresses] Cleaned up validation timer');
      }

      // Clean up global function reference
      if (typeof window !== 'undefined') {
        delete (window as any).submitCheckoutAddressForm;
        // console.log('[CheckoutAddresses] Cleaned up global function reference');
      }
    };
  });

  // Form validation tracking - but NO automatic submission
  // The submitAddresses function should ONLY be called when "Place Order" is clicked
  useVisibleTask$(async ({ track }) => {
    track(() => isFormValidSignal.value);

    // Just track form validity for UI purposes - no automatic submission
    // console.log('Form validity changed:', isFormValidSignal.value);
  });

  // Individual field validation handlers - exactly like old implementation
  const handleEmailChange$ = $((value: string) => {
    appState.customer = { ...appState.customer, emailAddress: value };
    
    if (emailTouched.value) {
      const emailResult = validateEmail(value);
      if (emailResult.isValid) {
        emailValidationError.value = '';
      } else {
        emailValidationError.value = emailResult.message || 'Invalid email';
      }
    }
  });

  const handleEmailBlur$ = $(() => {
    emailTouched.value = true;
    const emailResult = validateEmail(appState.customer?.emailAddress || '');
    if (emailResult.isValid) {
      emailValidationError.value = '';
    } else {
      emailValidationError.value = emailResult.message || 'Invalid email';
    }
  });

  const handleFirstNameChange$ = $((value: string) => {
    appState.customer = { ...appState.customer, firstName: value };
    
    if (firstNameTouched.value) {
      const nameResult = validateName(value, 'First name');
      if (nameResult.isValid) {
        firstNameValidationError.value = '';
      } else {
        firstNameValidationError.value = nameResult.message || 'Invalid first name';
      }
    }
  });

  const handleFirstNameBlur$ = $(() => {
    firstNameTouched.value = true;
    const nameResult = validateName(appState.customer?.firstName || '', 'First name');
    if (nameResult.isValid) {
      firstNameValidationError.value = '';
    } else {
      firstNameValidationError.value = nameResult.message || 'Invalid first name';
    }
  });

  const handleLastNameChange$ = $((value: string) => {
    appState.customer = { ...appState.customer, lastName: value };
    
    if (lastNameTouched.value) {
      const nameResult = validateName(value, 'Last name');
      if (nameResult.isValid) {
        lastNameValidationError.value = '';
      } else {
        lastNameValidationError.value = nameResult.message || 'Invalid last name';
      }
    }
  });

  const handleLastNameBlur$ = $(() => {
    lastNameTouched.value = true;
    const nameResult = validateName(appState.customer?.lastName || '', 'Last name');
    if (nameResult.isValid) {
      lastNameValidationError.value = '';
    } else {
      lastNameValidationError.value = nameResult.message || 'Invalid last name';
    }
  });

  const handlePhoneChange$ = $((value: string) => {
    // Filter input to only allow valid phone characters
    const filteredValue = filterPhoneInput(sanitizePhoneNumber(value));
    appState.customer = { ...appState.customer, phoneNumber: filteredValue };
    
    if (phoneTouched.value) {
      const countryCode = appState.shippingAddress.countryCode || 'US';
      const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
      const phoneResult = validatePhone(filteredValue, countryCode, isPhoneOptional);
      if (phoneResult.isValid) {
        phoneValidationError.value = '';
      } else {
        phoneValidationError.value = phoneResult.message || 'Invalid phone number';
      }
    }
  });

  const handlePhoneBlur$ = $(() => {
    phoneTouched.value = true;
    const phoneNumber = appState.customer?.phoneNumber || '';
    const countryCode = appState.shippingAddress.countryCode || 'US';
    const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
    const phoneResult = validatePhone(phoneNumber, countryCode, isPhoneOptional);
    if (phoneResult.isValid) {
      phoneValidationError.value = '';
    } else {
      phoneValidationError.value = phoneResult.message || 'Invalid phone number';
    }
  });

  // Auto-validation removed - validation will only occur on user interaction
  
  return (
    <div class="space-y-4 CheckoutAddresses">
      {/* Error Display */}
      {error.value && (
        <div class="p-4 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-800">{error.value}</p>
        </div>
      )}

      {/* Title with Clean Sign-in Option */}
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          Shipping and Payment Info
        </h3>

        {/* Simple Login Option for Guest Users */}
        {appState.customer?.id === CUSTOMER_NOT_DEFINED_ID && (
          <div class="flex items-center text-sm">
            <span class="text-gray-600 mr-2">Have an account?</span>
            <button
              onClick$={$(() => openLoginModal())}
              class="text-[#8a6d4a] hover:text-[#4F3B26] font-medium transition-colors underline cursor-pointer"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
      
      {/* Customer Information - Direct implementation without title */}
      <section>
        <div class="space-y-4">
          {/* Email and Phone side-by-side */}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <input
                type="email"
                value={appState.customer?.emailAddress}
                placeholder="Email address *"
                onChange$={(_, el) => handleEmailChange$(el.value)}
                onBlur$={handleEmailBlur$}
                class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
                  emailTouched.value && emailValidationError.value
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {emailTouched.value && emailValidationError.value && (
                <p class="mt-1 text-sm text-red-600">{emailValidationError.value}</p>
              )}
            </div>
            <div>
              <input
                type="tel"
                value={sanitizePhoneNumber(appState.customer?.phoneNumber)}
                placeholder={phonePlaceholder.value}
                onChange$={(_, el) => handlePhoneChange$(el.value)}
                onBlur$={handlePhoneBlur$}
                class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
                  phoneTouched.value && phoneValidationError.value
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {phoneTouched.value && phoneValidationError.value && (
                <p class="mt-1 text-sm text-red-600">{phoneValidationError.value}</p>
              )}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={appState.customer?.firstName}
                placeholder="First name *"
                onChange$={(_, el) => handleFirstNameChange$(el.value)}
                onBlur$={handleFirstNameBlur$}
                class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
                  firstNameTouched.value && firstNameValidationError.value
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {firstNameTouched.value && firstNameValidationError.value && (
                <p class="mt-1 text-sm text-red-600">{firstNameValidationError.value}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                value={appState.customer?.lastName}
                placeholder="Last name *"
                onChange$={(_, el) => handleLastNameChange$(el.value)}
                onBlur$={handleLastNameBlur$}
                class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
                  lastNameTouched.value && lastNameValidationError.value
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {lastNameTouched.value && lastNameValidationError.value && (
                <p class="mt-1 text-sm text-red-600">{lastNameValidationError.value}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Shipping Address */}
      <section>
        <AddressForm 
          shippingAddress={appState.shippingAddress}
          isReviewMode={false}
        />
      </section>

      {/* Billing Toggle */}
      <section>
        
        <div class="flex items-center mb-4">
          <input
            type="checkbox"
            id="different-billing"
            checked={useDifferentBilling.value}
            onChange$={(_, el) => {
              useDifferentBilling.value = el.checked;
              
              // If checkbox is unchecked, reset the activation flag so next time it's checked
              // it will re-initialize from current shipping values
              if (!el.checked) {
                billingHasBeenActivated.value = false;
                // console.log('[CheckoutAddresses] Billing checkbox unchecked - reset activation flag');
              }

              // Billing toggle interaction - validation will run automatically
            }}
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-sm"
          />
          <label for="different-billing" class="ml-3 text-sm font-medium text-gray-700">
            Use different billing address
          </label>
        </div>

        {/* Billing Address Form */}
        {useDifferentBilling.value && (
          <div class="mt-4">
            <BillingAddressForm 
              billingAddress={appState.billingAddress || {
                firstName: appState.customer?.firstName || '',
                lastName: appState.customer?.lastName || '',
                streetLine1: '',
                streetLine2: '',
                city: '',
                province: '',
                postalCode: '',
                countryCode: appState.shippingAddress.countryCode || '',
              }}

            />
          </div>
        )}
      </section>

      {/* LoginModal moved to parent checkout component for proper full-screen rendering */}
      

    </div>
  );
});

export default CheckoutAddresses;
