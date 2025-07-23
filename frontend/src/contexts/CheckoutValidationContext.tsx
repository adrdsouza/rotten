import { createContextId, useContext, useContextProvider, useStore, Slot, component$, useTask$, $ } from '@builder.io/qwik';

// Define the validation state structure
export interface CheckoutValidationState {
  // Customer validation
  isCustomerValid: boolean;
  customerErrors: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  
  // Address validation
  isShippingAddressValid: boolean;
  shippingAddressErrors: {
    streetLine1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
  };
  
  // Billing address validation (when different billing is used)
  isBillingAddressValid: boolean;
  billingAddressErrors: {
    firstName?: string;
    lastName?: string;
    streetLine1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
  };
  useDifferentBilling: boolean;
  
  // Payment validation
  isPaymentValid: boolean;
  paymentErrors: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };
  
  // Terms & Conditions validation
  isTermsAccepted: boolean;
  
  // Overall validation state
  isAllValid: boolean;
  
  // Validation touched states to know if user has interacted with forms
  customerTouched: boolean;
  shippingAddressTouched: boolean;
  billingAddressTouched: boolean;
  paymentTouched: boolean;
}

// Context type - just the state
export type CheckoutValidationContext = CheckoutValidationState;

// Create the context
export const CheckoutValidationContextId = createContextId<CheckoutValidationContext>('checkout-validation');

// Hook to use the context
export const useCheckoutValidation = () => useContext(CheckoutValidationContextId);

// Initial state
const createInitialState = (): CheckoutValidationState => ({
  isCustomerValid: false,
  customerErrors: {},
  isShippingAddressValid: false,
  shippingAddressErrors: {},
  isBillingAddressValid: true, // Valid by default since it's optional
  billingAddressErrors: {},
  useDifferentBilling: false,
  isPaymentValid: false,
  paymentErrors: {},
  isTermsAccepted: false,
  isAllValid: false,
  customerTouched: false,
  shippingAddressTouched: false,
  billingAddressTouched: false,
  paymentTouched: false,
});

// Provider component
export const CheckoutValidationProvider = component$(() => {
  const state = useStore<CheckoutValidationState>(createInitialState());

  // Use a task to automatically recalculate overall validation when any validation state changes
  useTask$(({ track }) => {
    // Track all validation-related properties
    const customerValid = track(() => state.isCustomerValid);
    const shippingValid = track(() => state.isShippingAddressValid);
    const billingValid = track(() => state.useDifferentBilling ? state.isBillingAddressValid : true);
    const paymentValid = track(() => state.isPaymentValid);
    const termsValid = track(() => state.isTermsAccepted);

    // Calculate overall validation
    const overall = customerValid && shippingValid && billingValid && paymentValid && termsValid;

    // Update the state
    state.isAllValid = overall;

    // console.log('[CheckoutValidation] Overall validation recalculated:', {
    //   customer: customerValid,
    //   shipping: shippingValid,
    //   billing: billingValid,
    //   payment: paymentValid,
    //   terms: termsValid,
    //   overall
    // });
  });

  // Use Qwik's useContextProvider - only provide the state
  useContextProvider(CheckoutValidationContextId, state);

  return <Slot />;
});

// Action functions that work with the context
export const useCheckoutValidationActions = () => {
  const state = useCheckoutValidation();

  return {
    updateCustomerValidation: $((isValid: boolean, errors: CheckoutValidationState['customerErrors'], touched = true) => {
      state.isCustomerValid = isValid;
      state.customerErrors = errors;
      if (touched) state.customerTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateShippingAddressValidation: $((isValid: boolean, errors: CheckoutValidationState['shippingAddressErrors'], touched = true) => {
      state.isShippingAddressValid = isValid;
      state.shippingAddressErrors = errors;
      if (touched) state.shippingAddressTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateBillingAddressValidation: $((isValid: boolean, errors: CheckoutValidationState['billingAddressErrors'], touched = true) => {
      state.isBillingAddressValid = isValid;
      state.billingAddressErrors = errors;
      if (touched) state.billingAddressTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updatePaymentValidation: $((isValid: boolean, errors: CheckoutValidationState['paymentErrors'], touched = true) => {
      state.isPaymentValid = isValid;
      state.paymentErrors = errors;
      if (touched) state.paymentTouched = true;
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateBillingMode: $((useDifferentBilling: boolean) => {
      state.useDifferentBilling = useDifferentBilling;
      // If switching to same billing, mark billing as valid
      if (!useDifferentBilling) {
        state.isBillingAddressValid = true;
        state.billingAddressErrors = {};
      }
      // The useTask$ will automatically recalculate isAllValid
    }),

    updateTermsAcceptance: $((isAccepted: boolean) => {
      state.isTermsAccepted = isAccepted;
      // The useTask$ will automatically recalculate isAllValid
    }),

    resetValidation: $(() => {
      Object.assign(state, createInitialState());
      // The useTask$ will automatically recalculate isAllValid
    })
  };
};
