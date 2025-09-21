import { createContextId, useContext, useContextProvider, useStore, Slot, component$, useVisibleTask$, $ } from '@builder.io/qwik';

// Define the validation state structure
export interface CheckoutValidationState {
  isCustomerValid: boolean;
  customerErrors: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  isShippingAddressValid: boolean;
  shippingAddressErrors: {
    streetLine1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
  };

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

  // NEW: Added stock validation state
  isStockValid: boolean;
  stockErrors: string[];
  isTermsAccepted: boolean;
  isPaymentReady: boolean;
  isAllValid: boolean;
  customerTouched: boolean;
  shippingAddressTouched: boolean;
  billingAddressTouched: boolean;
}

export const CheckoutValidationContextId = createContextId<CheckoutValidationState>('checkout-validation');

export const useCheckoutValidation = () => useContext(CheckoutValidationContextId);

const createInitialState = (): CheckoutValidationState => ({
  isCustomerValid: false,
  customerErrors: {},
  isShippingAddressValid: false,
  shippingAddressErrors: {},
  isBillingAddressValid: true,
  billingAddressErrors: {},
  useDifferentBilling: false,
  // NEW: Initial state for stock validation
  isStockValid: false,
  stockErrors: [],
  isTermsAccepted: false,
  isPaymentReady: false,
  isAllValid: false,
  customerTouched: false,
  shippingAddressTouched: false,
  billingAddressTouched: false,
});

export const CheckoutValidationProvider = component$(() => {
  const state = useStore<CheckoutValidationState>(createInitialState());

  // Use useVisibleTask$ to prevent SSR issues - this only runs on the client
  useVisibleTask$(({ track }) => {
    const customerValid = track(() => state.isCustomerValid);
    const shippingValid = track(() => state.isShippingAddressValid);
    const billingValid = track(() => state.useDifferentBilling ? state.isBillingAddressValid : true);
    const termsAccepted = track(() => state.isTermsAccepted);
    const stockValid = track(() => state.isStockValid);

    const paymentReady = customerValid && shippingValid && billingValid && stockValid;
    state.isPaymentReady = paymentReady;
    
    const overall = customerValid && shippingValid && billingValid && termsAccepted;
    state.isAllValid = overall;

    console.log('[CheckoutValidation] Recalculated:', {
      customer: customerValid,
      shipping: shippingValid,
      billing: billingValid,
      stock: stockValid,
      terms: termsAccepted,
      paymentReady,
      overall,
    });
  });

  useContextProvider(CheckoutValidationContextId, state);

  return <Slot />;
});

export const useCheckoutValidationActions = () => {
  const state = useCheckoutValidation();

  return {
    updateCustomerValidation: $((isValid: boolean, errors: CheckoutValidationState['customerErrors'], touched = true) => {
      state.isCustomerValid = isValid;
      state.customerErrors = errors;
      if (touched) state.customerTouched = true;
    }),

    updateShippingAddressValidation: $((isValid: boolean, errors: CheckoutValidationState['shippingAddressErrors'], touched = true) => {
      state.isShippingAddressValid = isValid;
      state.shippingAddressErrors = errors;
      if (touched) state.shippingAddressTouched = true;
    }),

    updateBillingAddressValidation: $((isValid: boolean, errors: CheckoutValidationState['billingAddressErrors'], touched = true) => {
      state.isBillingAddressValid = isValid;
      state.billingAddressErrors = errors;
      if (touched) state.billingAddressTouched = true;
    }),

    // NEW: The missing action for stock validation
    updateStockValidation: $((isValid: boolean, errors: string[]) => {
      state.isStockValid = isValid;
      state.stockErrors = errors;
    }),

    updateBillingMode: $((useDifferentBilling: boolean) => {
      state.useDifferentBilling = useDifferentBilling;
      if (!useDifferentBilling) {
        state.isBillingAddressValid = true;
        state.billingAddressErrors = {};
      }
    }),

    updateTermsAcceptance: $((isAccepted: boolean) => {
      state.isTermsAccepted = isAccepted;
    }),

    resetValidation: $(() => {
      Object.assign(state, createInitialState());
    })
  };
};