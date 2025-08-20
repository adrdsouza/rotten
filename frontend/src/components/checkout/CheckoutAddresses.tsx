import { $, component$, useContext, useSignal, useTask$, QRL, useVisibleTask$, useComputed$ } from '@builder.io/qwik';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID } from '~/constants';
import AddressForm from '~/components/address-form/AddressForm';
import BillingAddressForm from '~/components/billing-address-form/BillingAddressForm';
// LoginModal moved to parent component
import {
  setCustomerForOrderMutation,
  setOrderBillingAddressMutation,
  setOrderShippingAddressMutation,
  getActiveOrderQuery
} from '~/providers/shop/orders/order';
import { getActiveCustomerQuery } from '~/providers/shop/customer/customer';
import { Order } from '~/generated/graphql';
import { isActiveCustomerValid, isShippingAddressValid, isBillingAddressValid } from '~/utils';
import { validateEmail, validateName, validatePhone, filterPhoneInput, sanitizePhoneNumber } from '~/utils/validation';
import { useLocalCart } from '~/contexts/CartContext';
import { useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';
import { useLoginModalActions } from '~/contexts/LoginModalContext';
// Import shared addressState instead of defining it here
import { addressState } from '~/utils/checkout-state';

// Interfaces for the component
interface CheckoutAddressesProps {
  onAddressesSubmitted$?: QRL<() => void>;
}

export const CheckoutAddresses = component$<CheckoutAddressesProps>(({ onAddressesSubmitted$ }) => {
  const appState = useContext(APP_STATE);
  const localCart = useLocalCart();
  const validationActions = useCheckoutValidationActions();
  const { openLoginModal } = useLoginModalActions();
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
  const hasInitializedValidation = useSignal(false);

  // Computed signal for phone placeholder - ensures immediate reactivity to country changes
  const phonePlaceholder = useComputed$(() => {
    const countryCode = appState.shippingAddress.countryCode || 'US';
    const isOptional = countryCode === 'US' || countryCode === 'PR';
    return `Phone number${isOptional ? ' (optional)' : ' *'}` as string;
  });

  // Country initialization removed - now handled by layout.tsx

  // Sync local signals with exported state and track validation
  useVisibleTask$(({ track }) => {
    track(() => addressSubmissionComplete.value);
    track(() => addressSubmissionInProgress.value);
    
    addressState.addressSubmissionComplete = addressSubmissionComplete.value;
    addressState.addressSubmissionInProgress = addressSubmissionInProgress.value;
  });
  
  // Initialize billingAddress and handle inheritance from shipping - separated into multiple tasks to prevent conflicts
  
  // Task 1: Handle billing checkbox toggle (only runs when checkbox state changes)
  useTask$(({ track }) => {
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
  useTask$(({ track }) => {
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
  useTask$(({ track }) => {
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

  // Complete customer validation with proper phone optional logic
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
    
    // Validation debug logging (development only)
    // if (import.meta.env.DEV) {
    //   console.log('[CheckoutAddresses] Customer validation debug:', {
    //     customerData: customer,
    //     customerValid,
    //     emailResult: { isValid: emailResult.isValid, message: emailResult.message },
    //     firstNameResult: { isValid: firstNameResult.isValid, message: firstNameResult.message },
    //     lastNameResult: { isValid: lastNameResult.isValid, message: lastNameResult.message },
    //     phoneResult: { isValid: phoneResult.isValid, message: phoneResult.message }
    //   });
    // }
    
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

    // console.log('[CheckoutAddresses] Validation results:', {
    //   customerValid,
    //   phoneValid: phoneResult.isValid,
    //   phoneRequirementValid,
    //   shippingAddressValid,
    //   billingAddressValid,
    //   overallValid,
    //   phoneMessage: phoneResult.message
    // });
    
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

  // Main validation task - track only address fields, not customer to prevent circular dependency
  useTask$(({ track }) => {
    track(() => appState.shippingAddress);
    track(() => appState.shippingAddress.countryCode);
    track(() => useDifferentBilling.value);
    track(() => appState.billingAddress);
    
    // PREVENT VALIDATION ON INITIAL LOAD - only validate after user interaction
    if (!hasInitializedValidation.value) {
      // console.log('[CheckoutAddresses] Skipping validation - not initialized yet');
      return;
    }

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
  useTask$(({ track }) => {
    track(() => appState.shippingAddress.countryCode);

    // Immediately re-validate phone when country changes (no debounce for country changes)
    const countryCode = appState.shippingAddress.countryCode || 'US';
    const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
    const customerPhoneNumber = (appState.customer?.phoneNumber || '') as string;

    // if (import.meta.env.DEV) {
    //   console.log(`📍 [CheckoutAddresses] Country changed to: ${countryCode}, Phone optional: ${isPhoneOptional}`);
    // }

    // Immediately re-validate phone with new country rules
    if (customerPhoneNumber && phoneTouched.value) {
      const phoneResult = validatePhone(customerPhoneNumber, countryCode, isPhoneOptional);
      phoneValidationError.value = phoneResult.isValid ? '' : (phoneResult.message || 'Invalid phone number');

      // if (import.meta.env.DEV) {
      //   console.log(`📞 [CheckoutAddresses] Phone re-validated for ${countryCode}: ${phoneResult.isValid ? 'valid' : (phoneResult.message || 'Invalid phone number')}`);
      // }
    }

    // Trigger immediate complete validation for country changes
    validateCompleteForm$();
  });

  // Submit addresses to the API - moved before useTask$ that calls it
  const submitAddresses = $(async () => {
    try {
      addressSubmissionInProgress.value = true;
      isLoading.value = true;

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

      // Only call order mutations if not in local cart mode
      if (!localCart.isLocalMode) {
        // First check if customer is already authenticated
        const activeCustomer = await getActiveCustomerQuery();
          
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

        // Set shipping address first to ensure compatibility with Vendure session
        // console.log('📍 Setting shipping address before billing address to ensure sequence compatibility...');
        
        // Ensure country code is defined before proceeding
        if (!appState.shippingAddress.countryCode) {
          throw new Error('Country code is required for shipping address');
        }
        
        const shippingResult = await setOrderShippingAddressMutation({
          fullName: `${appState.customer.firstName || ''} ${appState.customer.lastName || ''}`.trim(),
          streetLine1: appState.shippingAddress.streetLine1 || '',
          streetLine2: appState.shippingAddress.streetLine2 || '',
          city: appState.shippingAddress.city || '',
          province: appState.shippingAddress.province || '',
          postalCode: appState.shippingAddress.postalCode || '',
          countryCode: appState.shippingAddress.countryCode,
          phoneNumber: appState.customer.phoneNumber || '',
          company: appState.shippingAddress.company || ''
        });

        if (shippingResult.__typename !== 'Order') {
          // console.error('❌ Failed to set shipping address. Detailed error:', JSON.stringify(shippingResult, null, 2));
          throw new Error('Failed to set shipping address');
        } else {
          appState.activeOrder = shippingResult as Order;
          // console.log('✅ Shipping address set successfully');
        }

        // Set billing address after shipping address if using different billing address
        let billingResult = null;
        if (useDifferentBilling.value) {
          // console.log('📍 Setting billing address after shipping address to ensure sequence compatibility...');
          
          // Ensure country code is defined for billing address
          if (!appState.billingAddress.countryCode) {
            throw new Error('Country code is required for billing address');
          }
          
          billingResult = await setOrderBillingAddressMutation({
            fullName: `${appState.billingAddress.firstName || ''} ${appState.billingAddress.lastName || ''}`.trim(),
            streetLine1: appState.billingAddress.streetLine1 || '',
            streetLine2: appState.billingAddress.streetLine2 || '',
            city: appState.billingAddress.city || '',
            province: appState.billingAddress.province || '',
            postalCode: appState.billingAddress.postalCode || '',
            countryCode: appState.billingAddress.countryCode,
          });
          if (billingResult.__typename !== 'Order') {
            // console.error('❌ Failed to set billing address. Detailed error:', JSON.stringify(billingResult, null, 2));
            error.value = 'There was an issue with the billing address. Please verify your information.';
          } else {
            appState.activeOrder = billingResult as Order;
            // console.log('✅ Billing address set successfully');
          }
        }
      } else {
        // console.log('🛒 Local cart mode: Skipping order mutations until Place Order is clicked');
      }

      // console.log('✅ All addresses set successfully');

      // Notify parent component that addresses have been submitted
      if (onAddressesSubmitted$) {
        await onAddressesSubmitted$();
      }

      // Mark as complete for external coordination
      addressSubmissionComplete.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred';
      // console.error('❌ Checkout error:', err);
      hasProceeded.value = false; // Allow retry on error
    } finally {
      isLoading.value = false;
      addressSubmissionInProgress.value = false;
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

  // Auto-proceed when form becomes valid - exactly like old implementation
  useTask$(async ({ track }) => {
    track(() => isFormValidSignal.value);

    if (isFormValidSignal.value && !hasProceeded.value) {
      hasProceeded.value = true;
      // console.log('✅ Form is valid, automatically proceeding (calling submitAddresses from useTask$)');

      // Perform final safety checks before submitting
      const customerEmail = appState.customer?.emailAddress || '';
      const customerFirstName = appState.customer?.firstName || '';
      const customerLastName = appState.customer?.lastName || '';
      const customerPhoneNumber = appState.customer?.phoneNumber || '';
      const shippingCountryCode = appState.shippingAddress?.countryCode || 'US';

      const emailResultCheck = validateEmail(customerEmail);
      const firstNameResultCheck = validateName(customerFirstName, 'First name');
      const lastNameResultCheck = validateName(customerLastName, 'Last name');
      const currentIsPhoneOptional = shippingCountryCode === 'US' || shippingCountryCode === 'PR';
      const phoneResultCheck = validatePhone(customerPhoneNumber, shippingCountryCode, currentIsPhoneOptional);

      // Check shipping address validity
      if (!isShippingAddressValid(appState.shippingAddress)) {
        // console.log('❌ Shipping address validation failed at auto-forward');
        hasProceeded.value = false;
        return;
      }

      // Check billing address validity if using different billing address
      if (useDifferentBilling.value && !isBillingAddressValid(appState.billingAddress)) {
        // console.log('❌ Billing address validation failed at auto-forward');
        hasProceeded.value = false;
        return;
      }

      // Only set touched states and show errors if the user has already interacted with the form
      // This prevents showing errors for autofilled fields from login
      if (!emailResultCheck.isValid) {
        // console.log('❌ Email validation failed at auto-forward:', emailResultCheck.message);
        // Only show error if field was already touched by user interaction
        if (emailTouched.value || hasInitializedValidation.value) {
          emailTouched.value = true;
          emailValidationError.value = emailResultCheck.message || 'Invalid email address';
        }
        hasProceeded.value = false;
        return;
      }
      if (!firstNameResultCheck.isValid) {
        // console.log('❌ First name validation failed at auto-forward:', firstNameResultCheck.message);
        // Only show error if field was already touched by user interaction
        if (firstNameTouched.value || hasInitializedValidation.value) {
          firstNameTouched.value = true;
          firstNameValidationError.value = firstNameResultCheck.message || 'Invalid first name';
        }
        hasProceeded.value = false;
        return;
      }
      if (!lastNameResultCheck.isValid) {
        // console.log('❌ Last name validation failed at auto-forward:', lastNameResultCheck.message);
        // Only show error if field was already touched by user interaction
        if (lastNameTouched.value || hasInitializedValidation.value) {
          lastNameTouched.value = true;
          lastNameValidationError.value = lastNameResultCheck.message || 'Invalid last name';
        }
        hasProceeded.value = false;
        return;
      }
      if (!phoneResultCheck.isValid && !currentIsPhoneOptional) {
        // console.log('❌ Phone validation failed at auto-forward:', phoneResultCheck.message);
        // Only show error if field was already touched by user interaction
        if (phoneTouched.value || hasInitializedValidation.value) {
          phoneTouched.value = true;
          phoneValidationError.value = phoneResultCheck.message || 'Invalid phone number';
        }
        hasProceeded.value = false;
        return;
      }

      // All validations passed, proceed with submission
      await submitAddresses();
    }
  });

  // Individual field validation handlers - exactly like old implementation
  const handleEmailChange$ = $((value: string) => {
    // Mark validation as initialized on first user interaction
    if (!hasInitializedValidation.value) {
      hasInitializedValidation.value = true;
      // console.log('[CheckoutAddresses] Validation initialized - user started interacting');
    }
    
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
    // Mark validation as initialized on first user interaction
    if (!hasInitializedValidation.value) {
      hasInitializedValidation.value = true;
      // console.log('[CheckoutAddresses] Validation initialized - user started interacting');
    }
    
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
    // Mark validation as initialized on first user interaction
    if (!hasInitializedValidation.value) {
      hasInitializedValidation.value = true;
      // console.log('[CheckoutAddresses] Validation initialized - user started interacting');
    }
    
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
    // Mark validation as initialized on first user interaction
    if (!hasInitializedValidation.value) {
      hasInitializedValidation.value = true;
      // console.log('[CheckoutAddresses] Validation initialized - user started interacting');
    }
    
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

  // Callback to mark validation as initialized when user interacts with address forms
  const handleAddressInteraction$ = $(() => {
    if (!hasInitializedValidation.value) {
      hasInitializedValidation.value = true;
      // console.log('[CheckoutAddresses] Validation initialized - user started interacting with address form');
    }
  });
  
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
          onUserInteraction$={handleAddressInteraction$}
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

              // Mark validation as initialized when user interacts with billing toggle
              if (!hasInitializedValidation.value) {
                hasInitializedValidation.value = true;
                // console.log('[CheckoutAddresses] Validation initialized - user toggled billing address');
              }
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
              onUserInteraction$={handleAddressInteraction$}
            />
          </div>
        )}
      </section>

      {/* LoginModal moved to parent checkout component for proper full-screen rendering */}
    </div>
  );
});

export default CheckoutAddresses;
