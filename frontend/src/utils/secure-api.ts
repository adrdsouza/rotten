import { executeRecaptcha } from '~/hooks/useRecaptchaV3';

/**
 * Secure API utility that automatically includes reCAPTCHA tokens
 * Works seamlessly with your existing GraphQL calls
 */

interface SecureRequestOptions {
  action: string;
  headers?: Record<string, string>;
  skipRecaptcha?: boolean;
}

/**
 * Enhanced fetch that includes reCAPTCHA v3 tokens
 * This will work with all your existing API calls without breaking them
 */
export const secureApiCall = async (
  url: string,
  options: RequestInit & SecureRequestOptions
): Promise<Response> => {
  const { action, skipRecaptcha = false, headers = {}, ...fetchOptions } = options;

  try {
    // Get reCAPTCHA token for this action (only if not skipped)
    let recaptchaToken = '';
    if (!skipRecaptcha) {
      try {
        recaptchaToken = await executeRecaptcha(action);
      } catch (_recaptchaError) {
        // console.warn('[SecureAPI] reCAPTCHA failed, proceeding without token:', _recaptchaError);
        // Continue without reCAPTCHA token - your backend will handle this gracefully
      }
    }

    // Add reCAPTCHA token to headers if we have one
    const secureHeaders = {
      ...headers,
      ...(recaptchaToken && { 'x-recaptcha-token': recaptchaToken }),
    };

    // Make the API call with enhanced headers
    return fetch(url, {
      ...fetchOptions,
      headers: secureHeaders,
    });
  } catch (error) {
    console.error('[SecureAPI] Request failed:', error);
    throw error;
  }
};

/**
 * Secure GraphQL mutation wrapper
 * Automatically adds reCAPTCHA protection to sensitive operations
 */
export const secureGraphQLMutation = async (
  mutation: string,
  variables: Record<string, any>,
  action: string,
  options: {
    endpoint?: string;
    skipRecaptcha?: boolean;
    additionalHeaders?: Record<string, string>;
  } = {}
): Promise<any> => {
  const {
    endpoint = '/shop-api', // Default to shop API
    skipRecaptcha = false,
    additionalHeaders = {},
  } = options;

  return secureApiCall(endpoint, {
    method: 'POST',
    action,
    skipRecaptcha,
    headers: {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
    body: JSON.stringify({
      query: mutation,
      variables,
    }),
  });
};

/**
 * Specific secure wrappers for your main form actions
 * These make it easy to add reCAPTCHA to existing forms
 */

// Remove this duplicate function - the correct one is defined below

export const secureContactFormSubmission = async (
  contactData: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }
): Promise<Response> => {
  return secureApiCall('/api/contact', {
    method: 'POST',
    action: 'contact_form',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contactData),
  });
};

export const secureAuthSubmission = async (
  authData: {
    email: string;
    password: string;
    rememberMe?: boolean;
    firstName?: string;
    lastName?: string;
  },
  isLogin: boolean,
  options: { skipRecaptcha?: boolean } = {}
): Promise<Response> => {
  const action = isLogin ? 'login' : 'signup';
  
  return secureGraphQLMutation(
    isLogin 
      ? `mutation SecureLogin($email: String!, $password: String!, $rememberMe: Boolean) {
          login(username: $email, password: $password, rememberMe: $rememberMe) {
            ... on CurrentUser {
              id
              identifier
            }
            ... on ErrorResult {
              errorCode
              message
            }
          }
        }`
      : `mutation SecureRegister($input: RegisterCustomerInput!) {
          registerCustomerAccount(input: $input) {
            ... on Success {
              success
            }
            ... on ErrorResult {
              errorCode
              message
            }
          }
        }`,
    isLogin 
      ? { email: authData.email, password: authData.password, rememberMe: authData.rememberMe }
      : { input: { emailAddress: authData.email, password: authData.password, firstName: authData.firstName, lastName: authData.lastName } },
    action,
    {
      skipRecaptcha: options.skipRecaptcha || false
    }
  );
};

/**
 * Wrapper for existing GraphQL SDK calls to add reCAPTCHA protection
 * This allows you to secure existing calls without changing their structure
 */
export const enhanceWithRecaptcha = <T extends (...args: any[]) => Promise<any>>(
  originalFunction: T,
  action: string
): T => {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      // Get reCAPTCHA token
      const token = await executeRecaptcha(action);
      
      // Store token in a way your existing functions can access it
      if (typeof window !== 'undefined') {
        (window as any).__recaptcha_token = token;
      }
      
      // Call original function
      const result = await originalFunction(...args);
      
      // Clean up token
      if (typeof window !== 'undefined') {
        delete (window as any).__recaptcha_token;
      }
      
      return result;
    } catch (error) {
      console.warn('[RecaptchaEnhancement] Failed to get token, proceeding without:', error);
      return originalFunction(...args);
    }
  }) as T;
};

/**
 * Secure checkout functions with automatic reCAPTCHA protection
 */
import { 
  setOrderShippingMethodMutation,
  setOrderShippingAddressMutation,
  setCustomerForOrderMutation,
  setOrderBillingAddressMutation
} from '~/providers/shop/orders/order';
import { transitionOrderToStateMutation } from '~/providers/shop/checkout/checkout';
import { convertLocalCartToVendureOrder } from '~/contexts/CartContext';
import { CreateAddressInput, CreateCustomerInput } from '~/generated/graphql';

/**
 * Secure local cart to Vendure order conversion
 */
export const secureCartConversion = enhanceWithRecaptcha(
  convertLocalCartToVendureOrder,
  'checkout'
);

/**
 * Secure order state transition
 */
export const secureOrderStateTransition = enhanceWithRecaptcha(
  transitionOrderToStateMutation,
  'checkout'
);

/**
 * Secure shipping method setting
 */
export const secureSetOrderShippingMethod = enhanceWithRecaptcha(
  setOrderShippingMethodMutation,
  'checkout'
);

/**
 * Secure shipping address setting
 */
export const secureSetOrderShippingAddress = enhanceWithRecaptcha(
  setOrderShippingAddressMutation,
  'checkout'
);

/**
 * Secure customer information setting
 */
export const secureSetCustomerForOrder = enhanceWithRecaptcha(
  setCustomerForOrderMutation,
  'checkout'
);

/**
 * Secure billing address setting
 */
export const secureSetOrderBillingAddress = enhanceWithRecaptcha(
  setOrderBillingAddressMutation,
  'checkout'
);

/**
 * Secure payment processing functions
 */
import { addPaymentToOrderMutation, createStripePaymentIntentMutation } from '~/providers/shop/checkout/checkout';

/**
 * Secure Stripe payment intent creation with reCAPTCHA protection
 */
export const secureCreateStripePaymentIntent = enhanceWithRecaptcha(
  createStripePaymentIntentMutation,
  'payment'
);

/**
 * Secure general payment processing
 */
export const secureAddPaymentToOrder = enhanceWithRecaptcha(
  addPaymentToOrderMutation,
  'payment'
);

/**
 * Complete secure checkout process
 * This function provides secure wrappers for checkout operations
 */
export const secureCheckoutSubmission = async (checkoutData: {
  action: 'cart_conversion' | 'shipping_method' | 'shipping_address' | 'billing_address' | 'customer_info' | 'order_transition';
  cartData?: any;
  shippingMethodId?: string[];
  shippingAddress?: CreateAddressInput;
  billingAddress?: CreateAddressInput;
  customerData?: CreateCustomerInput;
  orderState?: string;
}): Promise<any> => {
  const { action, ...data } = checkoutData;
  
  return secureApiCall('/api/checkout', {
    method: 'POST',
    action: 'checkout',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, data }),
  });
};
