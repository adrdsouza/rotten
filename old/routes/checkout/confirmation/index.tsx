import { component$, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation, useNavigate } from '@qwik.dev/router';
import { getOrderByCodeQuery } from '~/providers/shop/orders/order';

export default component$(() => {
	const location = useLocation();
	const navigate = useNavigate();
	
	const store = useStore({
		loading: true,
		error: '',
	});

	useVisibleTask$(async () => {
		try {
			console.log('[Confirmation] Handling Stripe redirect...');
			
			// Get URL parameters from Stripe redirect
			const urlParams = new URLSearchParams(location.url.search);
			const paymentIntent = urlParams.get('payment_intent');
			const redirectStatus = urlParams.get('redirect_status');
			
			console.log('[Confirmation] Payment Intent:', paymentIntent);
			console.log('[Confirmation] Redirect Status:', redirectStatus);
			
			if (!paymentIntent) {
				store.error = 'Missing payment information';
				store.loading = false;
				return;
			}
			
			if (redirectStatus !== 'succeeded') {
				store.error = 'Payment was not successful';
				store.loading = false;
				return;
			}
			
			// Poll for the order to be processed by webhook
			// The Stripe webhook should have already processed the payment and updated the order
			let attempts = 0;
			const maxAttempts = 30; // 30 seconds max
			
			while (attempts < maxAttempts) {
				try {
					// We need to find the order by payment intent ID
					// Since we don't have a direct query for this, we'll need to check recent orders
					// For now, let's try to get the active order and see if it's been processed
					
					// This is a temporary solution - ideally we'd store the order code in session storage
					// or have a way to query orders by payment intent ID
					const orderCode = sessionStorage.getItem('pendingOrderCode');
					
					if (orderCode) {
						const order = await getOrderByCodeQuery(orderCode);
						
						if (order && order.state === 'PaymentSettled') {
							console.log('[Confirmation] Order found and payment settled, redirecting...');
							navigate(`/checkout/confirmation/${order.code}`);
							return;
						}
					}
					
					// Wait 1 second before trying again
					await new Promise(resolve => setTimeout(resolve, 1000));
					attempts++;
					
				} catch (error) {
					console.error('[Confirmation] Error checking order status:', error);
					attempts++;
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			}
			
			// If we get here, we couldn't find the processed order
			store.error = 'Unable to locate your order. Please contact support with payment intent: ' + paymentIntent;
			store.loading = false;
			
		} catch (error) {
			console.error('[Confirmation] Error handling Stripe redirect:', error);
			store.error = 'An error occurred processing your payment confirmation';
			store.loading = false;
		}
	});

	return (
		<div class="bg-gray-50 min-h-screen">
			<div class="max-w-7xl mx-auto pt-16 px-4 sm:px-6 lg:px-8">
				<div class="text-center">
					{store.loading && (
						<div>
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B09983] mx-auto mb-4"></div>
							<h1 class="text-2xl font-semibold text-gray-900 mb-2">Processing your payment...</h1>
							<p class="text-gray-600">Please wait while we confirm your order.</p>
						</div>
					)}
					
					{store.error && (
						<div>
							<div class="text-red-500 mb-4">
								<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h1 class="text-2xl font-semibold text-gray-900 mb-2">Payment Processing Error</h1>
							<p class="text-gray-600 mb-4">{store.error}</p>
							<a href="/checkout" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#B09983] hover:bg-[#4F3B26]">
								Return to Checkout
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});
