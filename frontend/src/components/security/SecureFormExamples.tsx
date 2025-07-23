// Example implementation for using reCAPTCHA Enterprise in forms
import { component$, useSignal, $ } from '@qwik.dev/core';
import { executeRecaptcha } from '../../hooks/useRecaptchaV3';

/**
 * Example login form with reCAPTCHA Enterprise protection
 */
export const SecureLoginForm = component$(() => {
  const isLoading = useSignal(false);
  const error = useSignal<string | null>(null);

  const handleLogin = $(async (event: SubmitEvent) => {
    event.preventDefault();
    isLoading.value = true;
    error.value = null;

    try {
      // Generate reCAPTCHA token for LOGIN action
      const recaptchaToken = await executeRecaptcha('LOGIN');
      
      const formData = new FormData(event.target as HTMLFormElement);
      formData.append('recaptchaToken', recaptchaToken);

      // Send to backend for verification
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const result = await response.json();
      console.log('Login successful:', result);
      
      // Handle successful login (redirect, update state, etc.)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed';
      console.error('Login error:', err);
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <form onSubmit$={handleLogin} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error.value}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading.value}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading.value ? 'Signing in...' : 'Sign in'}
      </button>

      <div class="text-xs text-gray-500 mt-4">
        This site is protected by reCAPTCHA Enterprise and the Google{' '}
        <a href="https://policies.google.com/privacy" target="_blank" class="text-primary-600 hover:underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="https://policies.google.com/terms" target="_blank" class="text-primary-600 hover:underline">
          Terms of Service
        </a>{' '}
        apply.
      </div>
    </form>
  );
});

/**
 * Example checkout form with reCAPTCHA Enterprise protection
 */
export const SecureCheckoutForm = component$(() => {
  const isLoading = useSignal(false);
  const error = useSignal<string | null>(null);

  const handleCheckout = $(async (event: SubmitEvent) => {
    event.preventDefault();
    isLoading.value = true;
    error.value = null;

    try {
      // Generate reCAPTCHA token for CHECKOUT action
      const recaptchaToken = await executeRecaptcha('CHECKOUT');
      
      const formData = new FormData(event.target as HTMLFormElement);
      formData.append('recaptchaToken', recaptchaToken);

      // Send to backend for verification and processing
      const response = await fetch('/api/checkout/process', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout failed');
      }

      const result = await response.json();
      console.log('Checkout successful:', result);
      
      // Handle successful checkout (redirect to success page, etc.)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Checkout failed';
      console.error('Checkout error:', err);
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <form onSubmit$={handleCheckout} class="space-y-4">
      {/* Checkout form fields */}
      <div>
        <label for="cardNumber" class="block text-sm font-medium text-gray-700">
          Card Number
        </label>
        <input
          type="text"
          id="cardNumber"
          name="cardNumber"
          required
          placeholder="1234 5678 9012 3456"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error.value}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading.value}
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading.value ? 'Processing...' : 'Complete Purchase'}
      </button>

      <div class="text-xs text-gray-500 mt-4">
        This site is protected by reCAPTCHA Enterprise and the Google{' '}
        <a href="https://policies.google.com/privacy" target="_blank" class="text-primary-600 hover:underline">
          Privacy Policy
        </a>{' '}
        and{' '}
        <a href="https://policies.google.com/terms" target="_blank" class="text-primary-600 hover:underline">
          Terms of Service
        </a>{' '}
        apply.
      </div>
    </form>
  );
});
