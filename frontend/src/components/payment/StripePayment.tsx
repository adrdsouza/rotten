import { component$, noSerialize, useStore, useVisibleTask$, $ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
	createPreOrderStripePaymentIntentMutation,
	linkPaymentIntentToOrderMutation
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';

import XCircleIcon from '../icons/XCircleIcon';

let _stripe: Promise<Stripe | null>;
function getStripe(publishableKey: string, forceReload = false) {
	if (!_stripe || forceReload) {
		if (publishableKey) {
			_stripe = loadStripe(publishableKey);
		}
	}
	return _stripe;
}

// Function to clear cached Stripe instance (for complete resets)
function clearStripeCache() {
	_stripe = null as any;
}
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('[StripePayment] Using Stripe key:', stripeKey);

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
		paymentElement: noSerialize(null as any), // Reference to payment element for cleanup
		error: '',
		isProcessing: false,
		debugInfo: 'Initializing...',
		needsReset: false, // Flag to trigger complete reset after errors
		initializationKey: 0, // Key to force re-initialization
	});

	// Complete reset function - simulates fresh page load
	const completeReset = $(async () => {
		console.log('[StripePayment] 🔄 COMPLETE RESET: Starting fresh payment initialization...');

		// 1. Unmount existing payment element and remove all event listeners
		if (store.paymentElement) {
			try {
				// Remove all event listeners before unmounting
				store.paymentElement.off('ready');
				store.paymentElement.off('change');
				store.paymentElement.off('focus');
				store.paymentElement.off('blur');
				store.paymentElement.off('escape');

				store.paymentElement.unmount();
				console.log('[StripePayment] ✅ Payment element unmounted and event listeners removed');
			} catch (unmountError) {
				console.warn('[StripePayment] ⚠️ Error unmounting payment element:', unmountError);
			}
		}

		// 2. Clear the DOM mount target completely
		const mountTarget = document.getElementById('payment-form');
		if (mountTarget) {
			mountTarget.innerHTML = '';
			// Remove any residual classes or attributes that might interfere
			mountTarget.className = 'mb-8 w-full max-w-full';
			console.log('[StripePayment] ✅ DOM mount target cleared and reset');
		}

		// 3. Clear all localStorage data related to Stripe payments
		try {
			localStorage.removeItem('stripe_payment_logs');
			localStorage.removeItem('stripe_payment_success');
			localStorage.removeItem('stripe_payment_error');
			localStorage.removeItem('stripe_client_secret');
			localStorage.removeItem('stripe_payment_intent_id');
			console.log('[StripePayment] ✅ All Stripe localStorage data cleared');
		} catch (storageError) {
			console.warn('[StripePayment] ⚠️ Error clearing localStorage:', storageError);
		}

		// 4. Reset ALL store state to initial values (complete clean slate)
		store.clientSecret = '';
		store.paymentIntentId = '';
		store.resolvedStripe = noSerialize({} as Stripe);
		store.stripeElements = noSerialize({} as StripeElements);
		store.paymentElement = noSerialize(null as any);
		store.error = '';
		store.isProcessing = false;
		store.debugInfo = 'Resetting payment form...';
		store.needsReset = false;
		store.isPreOrder = true; // Reset to initial state

		// 5. Clear any global Stripe state that might interfere
		try {
			// Clear the cached Stripe instance to force fresh initialization
			clearStripeCache();

			// Force re-initialization of Stripe instance on next use
			if (typeof window !== 'undefined') {
				// Clear any cached Stripe instances or payment data
				delete (window as any).__stripe;
				delete (window as any).__stripeElements;
				delete (window as any).__stripePaymentElement;
			}
			console.log('[StripePayment] ✅ Global Stripe state and cache cleared');
		} catch (globalError) {
			console.warn('[StripePayment] ⚠️ Error clearing global state:', globalError);
		}

		// 6. Ensure cart is in proper state for retry (don't interfere with cart data)
		// Just make sure we're in local mode if cart has items
		try {
			const { LocalCartService } = await import('~/services/LocalCartService');
			const currentCart = LocalCartService.getCart();
			if (currentCart && currentCart.items && currentCart.items.length > 0) {
				// Ensure local cart context is properly set
				localCart.isLocalMode = true;
				localCart.localCart = currentCart;
				console.log('[StripePayment] ✅ Cart state verified during reset:', currentCart.items.length, 'items');
			}
		} catch (error) {
			console.warn('[StripePayment] ⚠️ Could not verify cart state during reset:', error);
		}

		// 7. Add a small delay to ensure all cleanup is complete before re-initialization
		await new Promise(resolve => setTimeout(resolve, 100));

		// 8. Increment initialization key to force complete re-initialization
		store.initializationKey++;

		console.log('[StripePayment] ✅ COMPLETE RESET: All state cleared, re-initialization will begin');
	});

	// Expose both submit and payment confirmation functions to window for checkout flow
	useVisibleTask$(() => {
		console.log('[StripePayment] Setting up window functions...');
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

			// Function to trigger complete reset (exposed for error recovery)
			(window as any).resetStripePaymentCompletely = async () => {
				console.log('[StripePayment] 🔄 External reset request received');
				await completeReset();
				return { success: true };
			};

			// Function to confirm payment after order is created and linked
			(window as any).confirmStripePreOrderPayment = async (order: any) => {
				console.log('[StripePayment] *** confirmStripePreOrderPayment CALLED ***');
				console.log('[StripePayment] Order received:', order);
				console.log('[StripePayment] Store state:', {
					paymentIntentId: store.paymentIntentId,
					clientSecret: store.clientSecret,
					resolvedStripe: !!store.resolvedStripe,
					stripeElements: !!store.stripeElements
				});

				try {
					// Clear any previous error state before starting fresh payment attempt
					store.error = '';
					store.debugInfo = 'Starting fresh payment confirmation...';
					store.isProcessing = true;
					console.log('[StripePayment] Confirming payment for order:', order.code);

					// Link our pre-existing PaymentIntent to the newly created order
					try {
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
						const errorMsg = 'Failed to link payment to order';
						store.error = errorMsg;
						store.isProcessing = false;
						return {
							success: false,
							error: errorMsg
						};
					}

					// Persistent logging function
					const logAndStore = (message: string, data?: any) => {
						console.log(message, data);
						const logs = JSON.parse(localStorage.getItem('stripe_payment_logs') || '[]');
						logs.push({ timestamp: new Date().toISOString(), message, data });
						localStorage.setItem('stripe_payment_logs', JSON.stringify(logs.slice(-20)));
					};

					// Submit elements first (required by newer Stripe API)
					logAndStore('[StripePayment] Submitting Stripe Elements...');
					const { error: submitError } = await store.stripeElements?.submit() || { error: new Error('Elements not initialized') };

					if (submitError) {
						logAndStore('[StripePayment] Elements submit failed:', submitError);
						throw new Error(submitError?.message || 'Form validation failed');
					}

					logAndStore('[StripePayment] Elements submitted successfully');

					// Now confirm payment with Stripe
					logAndStore('[StripePayment] Confirming payment...');
					console.log('[StripePayment] Using clientSecret:', store.clientSecret);
					console.log('[StripePayment] Using paymentIntentId:', store.paymentIntentId);
					console.log('[StripePayment] Stripe instance:', store.resolvedStripe);
					console.log('[StripePayment] Elements instance:', store.stripeElements);

					const confirmResult = await store.resolvedStripe?.confirmPayment({
						elements: store.stripeElements,
						clientSecret: store.clientSecret,
						redirect: 'if_required', // Prevent automatic redirect so we can settle first
					}) || { error: new Error('Stripe not initialized') };

					logAndStore('[StripePayment] Confirm payment result:', confirmResult);
					const { error } = confirmResult;

					if ('paymentIntent' in confirmResult && confirmResult.paymentIntent) {
						console.log('[StripePayment] PaymentIntent from confirmPayment:', confirmResult.paymentIntent);
						const paymentIntent = confirmResult.paymentIntent as any;
						console.log('[StripePayment] PaymentIntent status from confirmPayment:', paymentIntent?.status);
					}

					// Check for payment confirmation errors
					if (error) {
						logAndStore('[StripePayment] Payment confirmation failed:', error);
						store.error = error?.message || 'Payment confirmation failed';
						store.isProcessing = false;

						// 🚨 CRITICAL FIX: Trigger complete reset after payment error
						console.log('[StripePayment] 🔄 Payment failed, triggering complete reset...');
						store.needsReset = true;

						return {
							success: false,
							error: error?.message || 'Payment confirmation failed'
						};
					}

					// Verify Stripe payment actually succeeded before telling backend
					const { paymentIntent } = await store.resolvedStripe?.retrievePaymentIntent(store.clientSecret) || {};
					if (paymentIntent && paymentIntent.status !== 'succeeded') {
						logAndStore('[StripePayment] Payment not successful. Status:', paymentIntent?.status);
						const errorMsg = `Payment not successful. Status: ${paymentIntent?.status}`;
						store.error = errorMsg;
						store.isProcessing = false;

						// 🚨 CRITICAL FIX: Trigger complete reset after payment status failure
						console.log('[StripePayment] 🔄 Payment status check failed, triggering complete reset...');
						store.needsReset = true;

						return {
							success: false,
							error: errorMsg
						};
					}

					// Payment successful - now settle with backend to transition order to PaymentSettled
					logAndStore('[StripePayment] Stripe payment confirmed successfully - settling with backend...');

					try {
						// Import the addPaymentToOrder mutation function directly
						const { addPaymentToOrderMutation } = await import('~/providers/shop/orders/order');

						// Add payment to order using PaymentIntent ID
						logAndStore('[StripePayment] Calling addPaymentToOrderMutation...');
						const paymentResult = await addPaymentToOrderMutation({
							method: 'stripe',
							metadata: {
								paymentIntentId: store.paymentIntentId,
								stripePaymentIntentId: store.paymentIntentId,
								amount: paymentIntent ? ((paymentIntent as any).amount_received || paymentIntent.amount) : 0,
								currency: paymentIntent ? paymentIntent.currency : 'usd',
								status: paymentIntent ? paymentIntent.status : 'succeeded'
							}
						});
						logAndStore('[StripePayment] addPaymentToOrderMutation response:', paymentResult);

						logAndStore('[StripePayment] Payment successfully added to order:', paymentResult);
						logAndStore('[StripePayment] Order should now be in PaymentSettled state');

						// 🎯 CRITICAL: Clear the local cart ONLY after successful payment confirmation
						// This is the correct place to clear the cart - after payment is confirmed and settled
						try {
							const { LocalCartService } = await import('~/services/LocalCartService');
							LocalCartService.clearCart();
							logAndStore('[StripePayment] Local cart cleared after successful payment confirmation');

							// Also trigger cart update event for UI consistency
							if (typeof window !== 'undefined') {
								window.dispatchEvent(new CustomEvent('cart-updated', {
									detail: { totalQuantity: 0 }
								}));
							}
						} catch (clearCartError) {
							console.error('[StripePayment] Failed to clear local cart after payment:', clearCartError);
							// Don't fail the entire payment process if cart clearing fails
						}

						// Store successful payment info in localStorage for confirmation page
						const paymentInfo = {
							orderCode: order.code,
							paymentIntentId: store.paymentIntentId,
							amount: paymentIntent ? ((paymentIntent as any).amount_received || paymentIntent.amount) : 0,
							status: 'succeeded',
							timestamp: new Date().toISOString()
						};
						localStorage.setItem('stripe_payment_success', JSON.stringify(paymentInfo));

						// Order should now be in PaymentSettled state - redirect to confirmation
						logAndStore('[StripePayment] Payment settled successfully, redirecting to confirmation page...');
						window.location.href = `${baseUrl}/checkout/confirmation/${order.code}`;

						return { success: true };

					} catch (addPaymentError) {
						logAndStore('[StripePayment] Failed to add payment to order:', addPaymentError);
						const errorMsg = 'Payment processed but failed to complete order. Please contact support.';
						store.error = errorMsg;
						store.isProcessing = false;
						return {
							success: false,
							error: errorMsg
						};
					}

				} catch (error) {
					console.error('[StripePayment] Payment confirmation error:', error);
					store.error = error instanceof Error ? error.message : 'Payment failed';
					store.isProcessing = false;

					// 🚨 CRITICAL FIX: Trigger complete reset after any payment error
					console.log('[StripePayment] 🔄 Payment error caught, triggering complete reset...');
					store.needsReset = true;

					// Don't throw error - let UI recover for retry
					// Instead, return error result so parent can handle it
					return {
						success: false,
						error: error instanceof Error ? error.message : 'Payment failed'
					};
				}
			};

			console.log('[StripePayment] Window functions set up successfully');
			console.log('[StripePayment] confirmStripePreOrderPayment available:', typeof (window as any).confirmStripePreOrderPayment);
		}
	});

	useVisibleTask$(async ({ track }) => {
		// Track initialization key and reset flag to trigger re-initialization
		track(() => store.initializationKey);
		track(() => store.needsReset);

		// If reset is needed, trigger it and return
		if (store.needsReset) {
			await completeReset();
			return;
		}

		store.debugInfo = 'Initializing payment form...';

		// 🚨 FIX: More resilient cart state checking during resets
		// During payment error recovery, cart state might be temporarily inconsistent
		// We should be more lenient and allow some time for cart state to stabilize

		// First check if cart context exists
		if (!localCart) {
			store.debugInfo = 'Waiting for cart context...';
			store.error = 'Loading payment form...';
			return;
		}

		// Load cart if needed (this ensures cart is loaded from localStorage)
		try {
			const { loadCartIfNeeded } = await import('~/contexts/CartContext');
			await loadCartIfNeeded(localCart);
		} catch (error) {
			console.warn('[StripePayment] Failed to load cart if needed:', error);
		}

		// Check cart state with more resilience during error recovery
		const hasCartItems = localCart.localCart && localCart.localCart.items && localCart.localCart.items.length > 0;

		// If we don't have cart items, check localStorage directly as a fallback
		if (!hasCartItems) {
			try {
				const { LocalCartService } = await import('~/services/LocalCartService');
				const directCart = LocalCartService.getCart();

				if (directCart && directCart.items && directCart.items.length > 0) {
					// Cart exists in localStorage but context is not updated yet
					// Update the context and continue
					localCart.localCart = directCart;
					localCart.isLocalMode = true;
					console.log('[StripePayment] 🔄 Cart restored from localStorage during payment reset');
				} else {
					// Truly no cart items
					store.debugInfo = 'Waiting for cart items...';
					store.error = 'Cart is empty. Please add items to continue.';
					return;
				}
			} catch (error) {
				console.error('[StripePayment] Failed to check cart from localStorage:', error);
				store.debugInfo = 'Waiting for cart items...';
				store.error = 'Cart is empty. Please add items to continue.';
				return;
			}
		}

		// Ensure we're in local mode (important after payment errors)
		if (!localCart.isLocalMode) {
			console.log('[StripePayment] 🔄 Switching back to local mode for payment retry');
			localCart.isLocalMode = true;
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
			console.log('[StripePayment] Creating PaymentIntent with estimated total:', estimatedTotal);
			const paymentIntentResult = await createPreOrderStripePaymentIntentMutation(estimatedTotal, 'usd');
			console.log('[StripePayment] PaymentIntent result:', paymentIntentResult);

			store.clientSecret = paymentIntentResult.clientSecret;
			console.log('[StripePayment] Client secret extracted:', store.clientSecret);

			if (!store.clientSecret) {
				store.error = 'Failed to initialize payment. Please try again.';
				store.debugInfo = 'Error: No client secret returned from server';
				console.error('[StripePayment] No client secret in result:', paymentIntentResult);
				return;
			}

			store.paymentIntentId = extractPaymentIntentId(store.clientSecret);
			console.log('[StripePayment] PaymentIntent ID extracted:', store.paymentIntentId);
			store.debugInfo = `PaymentIntent created: ${store.paymentIntentId}`;

			// Clear any previous errors
			store.error = '';

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			store.error = `Failed to initialize payment: ${errorMessage}`;
			store.debugInfo = `Error: ${errorMessage}`;
			return;
		}

		// Initialize Stripe Elements with fresh instances
		try {
			store.debugInfo = 'Loading fresh Stripe instance...';

			// Get fresh Stripe instance to avoid any cached state
			const stripePromise = getStripe(stripeKey, false); // Don't force reload unless needed
			const stripe = await stripePromise;

			if (!stripe) {
				store.error = 'Failed to load Stripe';
				store.debugInfo = 'Error: Stripe failed to load';
				return;
			}

			store.debugInfo = 'Creating fresh Payment Element with tabbed interface...';
			store.resolvedStripe = noSerialize(stripe);

			// Create completely fresh Elements instance with new client secret
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

			// 🎯 Create completely fresh Payment Element with TABBED INTERFACE!
			const paymentElement = elements.create('payment', {
				layout: 'tabs', // Simplified syntax for tabbed layout
				paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'paypal'], // Order of payment method tabs
				defaultValues: {
					billingDetails: {
						name: '',
						email: '',
					}
				}
			});

			// Store reference to payment element for cleanup
			store.paymentElement = noSerialize(paymentElement);

			try {
				await paymentElement.mount('#payment-form');
				store.debugInfo = 'Fresh Payment Element with tabs mounted successfully!';

				// Add fresh event listeners (these will be cleaned up on reset)
				paymentElement.on('ready', () => {
					store.debugInfo = 'Fresh Payment Element with tabs is ready and interactive!';
					// Clear any residual error state when element is ready
					if (store.error.includes('Invalid card') || store.error.includes('card was declined')) {
						store.error = '';
					}
				});

				paymentElement.on('change', (event: any) => {
					if (event.error) {
						// Only show validation errors, not previous payment errors
						if (event.error.type === 'validation_error') {
							store.error = event.error.message || 'Payment validation error';
							store.debugInfo = `Payment validation error: ${event.error.message || 'Unknown error'}`;
						}
					} else {
						// Clear validation errors when form becomes valid
						if (store.error.includes('validation') || store.error.includes('Invalid card') || store.error.includes('card was declined')) {
							store.error = '';
						}
						store.debugInfo = 'Payment form is valid and ready!';
					}
				});

				// Add focus event to clear old errors when user starts typing
				paymentElement.on('focus', () => {
					if (store.error.includes('Invalid card') || store.error.includes('card was declined') || store.error.includes('validation')) {
						store.error = '';
						store.debugInfo = 'Payment form focused - ready for input';
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
			{store.error !== '' && !store.error.includes('Cart is empty') && !store.error.includes('Loading payment form') && (
				<div class="rounded-md bg-red-50 p-4 mb-8">
					<div class="flex">
						<div class="flex-shrink-0">
							<XCircleIcon />
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">We ran into a problem with payment!</h3>
							<p class="text-sm text-red-700 mt-2">{store.error}</p>
						</div>
					</div>
				</div>
			)}
			{store.error.includes('Cart is empty') && (
				<div class="rounded-md bg-yellow-50 p-4 mb-8">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-yellow-800">Loading payment form...</h3>
							<p class="text-sm text-yellow-700 mt-2">Please wait while we prepare your payment form.</p>
						</div>
					</div>
				</div>
			)}
			{store.error.includes('Loading payment form') && (
				<div class="rounded-md bg-blue-50 p-4 mb-8">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-blue-400 animate-spin" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800">Initializing payment...</h3>
							<p class="text-sm text-blue-700 mt-2">Setting up your payment form.</p>
						</div>
					</div>
				</div>
			)}

			{/* Button removed - payment is handled by the main checkout flow */}
			{/* The checkout flow calls confirmStripePreOrderPayment() after order creation */}
		</div>
	);
});
