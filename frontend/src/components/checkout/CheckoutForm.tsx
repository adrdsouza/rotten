import { component$ } from '@qwik.dev/core';
import { Form, routeAction$, zod$, z } from '@qwik.dev/router';

/**
 * Progressive Enhancement Checkout Form
 * Works with and without JavaScript enabled
 */

// Server action for processing checkout (works without JS)
export const useCheckoutSubmission = routeAction$(async (data, { fail, redirect }) => {
  const startTime = performance.now();
  
  try {
    // Extract form data
    const orderData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      streetLine1: data.streetLine1,
      city: data.city,
      postalCode: data.postalCode,
      countryCode: data.countryCode,
      phoneNumber: data.phoneNumber
    };

    // Validate required fields
    if (!orderData.email || !orderData.firstName || !orderData.lastName) {
      return fail(400, {
        error: 'Missing required fields'
      });
    }

    // Process the order (this would integrate with your existing order processing)
    // console.log('Processing checkout submission:', orderData);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Track the checkout submission performance
    const processingTime = performance.now() - startTime;
    // console.log('Checkout submission processed in:', processingTime, 'ms');
    
    // Send metrics to analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'checkout-submission',
          value: Math.round(processingTime),
          context: 'server-action',
          timestamp: Date.now(),
          userAgent: 'server-side',
          url: '/checkout'
        })
      }).catch(err => {
        console.warn('Failed to send checkout performance metric:', err);
      });
    }

    // Redirect to confirmation page
    throw redirect(302, '/checkout/confirmation');
    
  } catch (error) {
    const processingTime = performance.now() - startTime;
    console.error('Checkout submission failed after', processingTime, 'ms:', error);
    
    return fail(500, {
      error: 'An error occurred while processing your order. Please try again.'
    });
  }
}, zod$({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  streetLine1: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  countryCode: z.string().min(1),
  phoneNumber: z.string().optional()
}));

export const CheckoutForm = component$(() => {
  const checkoutAction = useCheckoutSubmission();

  return (
    <div class="max-w-2xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Checkout Information</h2>
      
      {/* This form works WITHOUT JavaScript due to routeAction$ */}
      <Form action={checkoutAction} class="space-y-6">
        
        {/* Customer Information */}
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Customer Information</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div class="bg-white border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold mb-4">Shipping Address</h3>
          
          <div class="space-y-4">
            <div>
              <label for="streetLine1" class="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                id="streetLine1"
                name="streetLine1"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="New York"
                />
              </div>
              
              <div>
                <label for="postalCode" class="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10001"
                />
              </div>
              
              <div>
                <label for="countryCode" class="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <select
                  id="countryCode"
                  name="countryCode"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Country</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {checkoutAction.value?.error && (
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <div class="shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  Checkout Error
                </h3>
                <div class="mt-2 text-sm text-red-700">
                  {checkoutAction.value.error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={checkoutAction.isRunning}
            class="bg-black text-white px-8 py-3 rounded-md font-medium hover:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutAction.isRunning ? (
              <>
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </button>
        </div>
      </Form>

      {/* Progressive Enhancement Note */}
      <div class="mt-6 text-center text-sm text-gray-500">
        <p>✅ This form works even if JavaScript is disabled</p>
      </div>
    </div>
  );
});

export default CheckoutForm;
