/**
 * GraphQL Request Interceptor
 * Automatically adds reCAPTCHA tokens to your existing GraphQL requests
 * This works seamlessly with your current architecture
 */

// Store the original fetch function
const originalFetch = globalThis.fetch;

// Enhanced fetch that automatically adds reCAPTCHA tokens
globalThis.fetch = async function enhancedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Only intercept GraphQL requests to your shop-api
  const isGraphQLRequest = 
    (typeof input === 'string' && input.includes('/shop-api')) ||
    (input instanceof Request && input.url.includes('/shop-api')) ||
    (typeof input === 'string' && input.includes('/admin-api')) ||
    (input instanceof Request && input.url.includes('/admin-api'));

  if (!isGraphQLRequest) {
    // Not a GraphQL request, use original fetch
    return originalFetch(input, init);
  }

  // Clone the init object to avoid mutating the original
  const enhancedInit = { ...init };
  const headers = new Headers(enhancedInit.headers);

  // Check if there's a reCAPTCHA token available (set by your forms)
  if (typeof window !== 'undefined' && (window as any).__recaptcha_token) {
    headers.set('x-recaptcha-token', (window as any).__recaptcha_token);
    console.log('🔒 Adding reCAPTCHA token to GraphQL request');
  }

  // Add CSRF protection
  headers.set('x-requested-with', 'XMLHttpRequest');

  // Update the init object with enhanced headers
  enhancedInit.headers = headers;

  // Make the request with enhanced headers
  return originalFetch(input, enhancedInit);
};

// Type augmentation for the global token
declare global {
  interface Window {
    __recaptcha_token?: string;
  }
}

export {};
