import { component$, noSerialize, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
	createPreOrderStripePaymentIntentMutation,
	linkPaymentIntentToOrderMutation
} from '~/providers/shop/checkout/checkout';
import { 
	settleStripePaymentMutation, 
	isSuccessfulDuplicateError, 
	requiresUserAction, 
	requiresPageRefresh 
} from '~/providers/shop/checkout/settlement';
import { useLocalCart } from '~/contexts/CartContext';

import PaymentErrorDisplay, { extractErrorDisplayInfo } from './PaymentErrorDisplay';

let _stripe: Promise<Stripe | null>;
function getStripe(publishableKey: string) {
	if (!_stripe && publishableKey) {
		_stripe = loadStripe(publishableKey);
	}
	return _stripe;
}
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('[StripePayment] Using Stripe key:', stripeKey);
const stripePromise = getStripe(stripeKey);

// Utility function to extract PaymentIntent ID from client secret
const extractPaymentIntentId = (clientSecret: string): string => {
	return clientSecret.split('_secret_')[0];
};

// Utility function to calculate estimated total from local cart
const calculateCartTotal = (localCart: any): number => {
	console.log('[calculateCartTotal] Input localCart:', localCart);
	
	// Check if cart has items
	if (!localCart || !localCart.isLocalMode || !localCart.localCart || !localCart.localCart.items || localCart.localCart.items.length === 0) {
		console.log('[calculateCartTotal] No items found, returning default $50');
		return 5000; // $50 default
	}

	console.log('[calculateCartTotal] Cart items:', localCart.localCart.items);

	const subtotal = localCart.localCart.items.reduce((total: number, item: any) => {
		// Fix: LocalCart items store price as item.productVariant.price, not item.unitPrice
		const itemTotal = (item.productVariant?.price || 0) * (item.quantity || 0);
		console.log('[calculateCartTotal] Item:', item.productVariant?.name || 'Unknown', 'Price:', item.productVariant?.price, 'Quantity:', item.quantity, 'Total:', itemTotal);
		return total + itemTotal;
	}, 0);

	console.log('[calculateCartTotal] Subtotal:', subtotal);

	// Add estimated tax/shipping (10% estimation)
	const estimatedTotal = Math.round(subtotal * 1.1);
	console.log('[calculateCartTotal] Final estimated total:', estimatedTotal);

	return Math.max(estimatedTotal, 100); // Minimum $1.00
};

export default component$(() => {
	const baseUrl = useLocation().url.origin;
	const localCart = useLocalCart();
	
	const store = useStore({
		clientSecret: '',
		paymentIntentId: '',
		isPreOrder: true, // Flag to track pre-order state
		resolvedStripe: noSerialize({} as Stripe),
		stripeElements: noSerialize({} as StripeElements),
		error: '',
		errorInfo: noSerialize(null as any),
		isProcessing: false,
		debugInfo: 'Initializing...',
		retryCount: 0,
	});

	// Expose both submit and payment confirmation functions to window for checkout flow
	useVisibleTask$(() => {
		if (typeof window !== 'undefined') {
			// Function to submit elements immediately when user clicks pay
			(window as any).submitStripeElements = async () => {
				console.log('[StripePayment] Submitting elements for form validation...');
				const { error: submitError } = await store.stripeElements?.submit() || { error: new Error('Elements not initialized') };
				
				if (submitError) {
					console.error('[StripePayment] Elements submit failed:', submitError);
					throw new Error(submitError?.message || 'Form validation failed');
				}
				
				console.log('[StripePayment] Elements submitted successfully');
				return { success: true };
			};
			
			// Function to confirm payment after order is created and linked
			(window as any).confirmStripePreOrderPayment = async (order: any) => {
				try {
					store.isProcessing = true;
					store.error = 'Processing payment...'; // Provide immediate user feedback
					console.log('[StripePayment] Confirming payment for order:', order.code);

					// Link our pre-existing PaymentIntent to the newly created order
					try {
						store.error = 'Linking payment to order...';
						console.log('[StripePayment] Linking PaymentIntent', store.paymentIntentId, 'to order', order.id);
						await linkPaymentIntentToOrderMutation(
							store.paymentIntentId,
							order.id,
							order.code,
							order.totalWithTax,
							order.customer?.emailAddress || 'guest'
						);
						console.log('[StripePayment] PaymentIntent successfully linked to order');
					} catch (linkError) {
						console.error('[StripePayment] Failed to link PaymentIntent to order:', linkError);
						throw new Error('Failed to link payment to order');
					}

					// Elements already submitted earlier, now just confirm payment with Stripe
					store.error = 'Confirming payment with Stripe...';
					console.log('[StripePayment] Confirming payment...');
					const { error } = await store.resolvedStripe?.confirmPayment({
						elements: store.stripeElements,
						clientSecret: store.clientSecret,
						confirmParams: {
							return_url: `${baseUrl}/checkout/confirmation/${order.code}`,
						},
					}) || { error: new Error('Stripe not initialized') };

					// Check for payment confirmation errors
					if (error) {
						console.error('[StripePayment] Payment confirmation failed:', error);
						throw new Error(error?.message || 'Payment confirmation failed');
					}

					// Payment successful - now settle payment using enhanced settlement service
					console.log('[StripePayment] Stripe payment confirmed successfully - settling payment...');
					
					try {
						// Clear any previous error messages before settlement
						store.error = 'Finalizing payment...';
						
						// Validate that we have a PaymentIntent ID
						if (!store.paymentIntentId) {
							throw new Error('PaymentIntent ID is missing - cannot settle payment');
						}
						
						// Use enhanced settlement with retry logic and error handling
						const settlementSuccess = await settleStripePaymentMutation(store.paymentIntentId, {
							maxRetries: 3,
							retryDelayMs: 2000,
							onRetry: (attempt, error) => {
								console.log(`[StripePayment] Settlement retry ${attempt}/${3}:`, error);
								store.error = `Finalizing payment (attempt ${attempt}/3)...`;
							}
						});
						
						if (settlementSuccess) {
							console.log('[StripePayment] Payment successfully settled - PaymentIntent:', store.paymentIntentId);
							store.error = ''; // Clear any retry messages
							store.isProcessing = false; // Clear processing state
							return { success: true };
						} else {
							throw new Error('Settlement returned false - this should not happen');
						}
						
					} catch (settlementError) {
						console.error('[StripePayment] Payment settlement failed for PaymentIntent:', store.paymentIntentId, settlementError);
						
						// Check if this is actually a successful duplicate
						if (isSuccessfulDuplicateError(settlementError)) {
							console.log('[StripePayment] Duplicate settlement detected - treating as success for PaymentIntent:', store.paymentIntentId);
							store.error = ''; // Clear error message for successful duplicate
							store.isProcessing = false; // Clear processing state
							return { success: true };
						}
						
						// Check if user action is required
						if (requiresUserAction(settlementError)) {
							const actionMessage = 'Payment requires additional verification. Please complete the payment process.';
							console.warn('[StripePayment] User action required:', actionMessage);
							throw new Error(actionMessage);
						}
						
						// Check if page refresh is needed
						if (requiresPageRefresh(settlementError)) {
							const refreshMessage = 'Please refresh the page and try again.';
							console.warn('[StripePayment] Page refresh required:', refreshMessage);
							throw new Error(refreshMessage);
						}
						
						// Use enhanced error message for other failures
						const errorMessage = settlementError instanceof Error ? settlementError.message : 'Payment settlement failed';
						const finalMessage = `Payment processed but settlement failed: ${errorMessage}. Please contact support if this persists.`;
						console.error('[StripePayment] Final settlement error:', finalMessage);
						throw new Error(finalMessage);
					}

				} catch (error) {
					console.error('[StripePayment] Payment confirmation error:', error);
					
					// Extract enhanced error information
					const errorInfo = extractErrorDisplayInfo(error);
					store.error = errorInfo.message;
					store.errorInfo = noSerialize(errorInfo);
					store.isProcessing = false;
					
					throw error;
				}
			};
		}
	});

	useVisibleTask$(async () => {
		store.debugInfo = 'Initializing payment form...';
		
		if (!localCart || !localCart.isLocalMode || !localCart.localCart || !localCart.localCart.items || localCart.localCart.items.length === 0) {
			store.debugInfo = 'Waiting for cart items...';
			store.error = 'Cart is empty. Please add items to continue.';
			return;
		}

		try {
			// Calculate estimated total from local cart
			const estimatedTotal = calculateCartTotal(localCart);
			store.debugInfo = `Calculating total: $${(estimatedTotal / 100).toFixed(2)} (${localCart.localCart.items.length} items)`;

			// Validate estimated total
			if (!estimatedTotal || estimatedTotal < 50) {
				store.error = `Invalid total calculated: $${(estimatedTotal / 100).toFixed(2)}`;
				store.debugInfo = 'Error: Invalid cart total - please refresh the page';
				return;
			}

			store.debugInfo = 'Calling GraphQL mutation...';
			
			// Create pre-order PaymentIntent immediately - no order dependency
			store.clientSecret = await createPreOrderStripePaymentIntentMutation(estimatedTotal, 'usd');
			
			if (!store.clientSecret) {
				store.error = 'Failed to initialize payment. Please try again.';
				store.debugInfo = 'Error: No client secret returned from server';
				return;
			}

			store.paymentIntentId = extractPaymentIntentId(store.clientSecret);
			store.debugInfo = `PaymentIntent created: ${store.paymentIntentId}`;
			
			// Clear any previous errors
			store.error = '';

		} catch (error) {
			const errorInfo = extractErrorDisplayInfo(error);
			store.error = `Failed to initialize payment: ${errorInfo.message}`;
			store.errorInfo = noSerialize(errorInfo);
			store.debugInfo = `Error: ${errorInfo.message}`;
			return;
		}

		// Initialize Stripe Elements
		try {
			store.debugInfo = 'Loading Stripe...';
			const stripe = await stripePromise;
			
			if (!stripe) {
				store.error = 'Failed to load Stripe';
				store.debugInfo = 'Error: Stripe failed to load';
				return;
			}
			
			store.debugInfo = 'Creating Stripe Elements...';
			store.resolvedStripe = noSerialize(stripe);
			
			const elements = stripe.elements({
				clientSecret: store.clientSecret,
				locale: 'en',
				appearance: {
					theme: 'stripe',
					variables: {
						colorPrimary: '#8a6d4a',
						colorBackground: '#ffffff',
						colorText: '#374151',
						colorDanger: '#ef4444',
						colorSuccess: '#10b981',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						spacingUnit: '4px',
						borderRadius: '6px',
						fontSizeBase: '16px',
					}
				}
			});
			
			store.stripeElements = noSerialize(elements);
			store.debugInfo = 'Mounting payment element...';
			
			// Check if mount target exists
			const mountTarget = document.getElementById('payment-form');
			if (!mountTarget) {
				store.error = 'Payment form mount target not found';
				store.debugInfo = 'Error: #payment-form element missing';
				return;
			}
			
			// Create and mount payment element
			const paymentElement = elements.create('payment', {
				layout: {
					type: 'tabs',
					defaultCollapsed: false
				}
			});
			
			try {
				await paymentElement.mount('#payment-form');
				store.debugInfo = 'Payment form mounted successfully!';
				
				// Add event listeners for better debugging
				paymentElement.on('ready', () => {
					store.debugInfo = 'Payment element is ready and interactive!';
				});
				
				paymentElement.on('change', (event: any) => {
					if (event.error) {
						const errorInfo = extractErrorDisplayInfo(event.error);
						store.error = errorInfo.message;
						store.errorInfo = noSerialize(errorInfo);
						store.debugInfo = `Payment error: ${errorInfo.message}`;
					} else {
						store.error = '';
						store.errorInfo = noSerialize(null);
						store.debugInfo = 'Payment form is valid and ready!';
					}
				});
				
			} catch (mountError) {
				const errorMsg = mountError instanceof Error ? mountError.message : 'Unknown mount error';
				store.error = `Failed to mount payment form: ${errorMsg}`;
				store.debugInfo = `Mount error: ${errorMsg}`;
			}
			
		} catch (elementsError) {
			const errorMsg = elementsError instanceof Error ? elementsError.message : 'Unknown Elements error';
			store.error = `Failed to initialize payment form: ${errorMsg}`;
			store.debugInfo = `Elements error: ${errorMsg}`;
		}
	});

	return (
		<div class="w-full max-w-full">
			<div class="payment-tabs-container relative">
				<div id="payment-form" class="mb-8 w-full max-w-full"></div>
			</div>
			{store.error !== '' && store.errorInfo && (
				<PaymentErrorDisplay
					error={store.error}
					errorCode={store.errorInfo.errorCode}
					isRetryable={store.errorInfo.isRetryable}
					requiresUserAction={store.errorInfo.requiresUserAction}
					requiresPageRefresh={store.errorInfo.requiresPageRefresh}
					onRetry$={() => {
						// Clear error and retry initialization
						store.error = '';
						store.errorInfo = noSerialize(null);
						store.retryCount++;
						// Trigger re-initialization by clearing client secret
						store.clientSecret = '';
					}}
					onRefresh$={() => {
						window.location.reload();
					}}
				/>
			)}

			{/* Button removed - payment is handled by the main checkout flow */}
			{/* The checkout flow calls confirmStripePreOrderPayment() after order creation */}
		</div>
	);
});
