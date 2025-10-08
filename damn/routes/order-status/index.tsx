import { component$, useContext } from '@qwik.dev/core';
import { useNavigate, routeLoader$, Link } from '@qwik.dev/router';
import { APP_STATE } from '~/constants';

export const useOrderStatusLoader = routeLoader$(async ({ query, redirect }) => {
  const orderCode = query.get('orderCode');
  
  if (!orderCode) {
    // No order code provided, redirect to account orders
    throw redirect(302, '/account/orders');
  }
  
  return {
    orderCode
  };
});

export default component$(() => {
  const navigate = useNavigate();
  const appState = useContext(APP_STATE);
  const orderData = useOrderStatusLoader();

  // Check if user is signed in
  const isSignedIn = !!appState.customer;
  
  if (isSignedIn) {
    // User is signed in - redirect to account orders page
    navigate('/account/orders');
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Redirecting to your orders...</p>
        </div>
      </div>
    );
  }

  // User is not signed in - show sign in page with order context
  return (
    <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to view your order
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Order #{orderData.value.orderCode}
          </p>
          <p class="mt-1 text-center text-sm text-gray-500">
            Sign in to track your order status and view details
          </p>
        </div>
        
        <div class="mt-8 space-y-4">
          <Link
            href={`/sign-in?redirect=/account/orders`}
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#d42838] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Sign In to View Order
          </Link>
          
          <div class="text-center">
            <span class="text-sm text-gray-500">Don't have an account? </span>
            <Link
              href={`/sign-up?redirect=/account/orders`}
              class="text-sm font-medium text-[#d42838] hover:text-black transition-colors"
            >
              Create one here
            </Link>
          </div>
        </div>

        <div class="mt-6 border-t border-gray-200 pt-6">
          <p class="text-xs text-gray-500 text-center">
            Need help? Contact us at{' '}
            <a href="mailto:info@damneddesigns.com" target='_blank' class="text-[#d42838] hover:text-black">
              info@damneddesigns.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
});
