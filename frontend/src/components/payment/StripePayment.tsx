import { component$, noSerialize, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
	createPreOrderStripePaymentIntentMutation,
	linkPaymentIntentToOrderMutation
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { clearValidationCache } from '~/utils/validation-cache';

import XCircleIcon from '../icons/XCircleIcon';
import { PropFunction } from '@qwik.dev/core/dist/core-internal';

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

// // Helper function to completely clear all validation states
// const clearAllValidationStates = () => {
// 	console.log('[StripePayment] 🧹 Clearing ALL validation states...');

// 	// Clear localStorage
// 	try {
// 		const keysToRemove = [
// 			'stripe_validation_errors',
// 			'stripe_form_state', 
// 			'stripe_last_error',
// 			'stripe_elements_state',
// 			'stripe_payment_cache'
// 		];
// 		keysToRemove.forEach(key => localStorage.removeItem(key));
// 		console.log('[StripePayment] ✅ localStorage validation states cleared');
// 	} catch (_e) {
// 		console.log('[StripePayment] localStorage not available, skipping');
// 	}

// 	// Clear window globals
// 	if (typeof window !== 'undefined') {
// 		const propsToDelete = [
// 			'stripeValidationState',
// 			'stripeFormErrors', 
// 			'lastStripeError',
// 			'stripeElementsCache',
// 			'stripeLastSubmission'
// 		];
// 		propsToDelete.forEach(prop => {
// 			delete (window as any)[prop];
// 		});
// 	}

// 	console.log('[StripePayment] ✅ All validation states cleared');
// };
type ChildProps = {
	handleReset: PropFunction<() => void>;
  };
  
export default component$<ChildProps>(({handleReset}) => {
	const baseUrl = useLocation().url.origin;
	const localCart = useLocalCart();

	const store = useStore({
		clientSecret: '',
		paymentIntentId: '',
		isPreOrder: true, // Flag to track pre-order state
		resolvedStripe: noSerialize({} as Stripe),
		stripeElements: noSerialize({} as StripeElements),
		error: '',
		isProcessing: false,
		debugInfo: 'Initializing...',
	});

	  
	// Expose both submit and payment confirmation functions to window for checkout flow
	useVisibleTask$(() => {
		console.log('[StripePayment] Setting up window functions...');
		if (typeof window !== 'undefined') {
			// Function to submit elements immediately when user clicks pay
		

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

					// Clear any cached validation state before submission
					console.log('[StripePayment] 🧹 Clearing validation state before submission');
					store.error = '';

					const { error: submitError } = await store.stripeElements?.submit() || { error: new Error('Elements not initialized') };

					if (submitError) {
						console.log('[StripePayment] ❌ Elements submit failed:', submitError);
						console.log('[StripePayment] 🔍 Submit error details:', {
							code: (submitError as any).code,
							type: (submitError as any).type,
							message: submitError.message
						});
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
						handleReset()
						store.error = error?.message || 'Payment confirmation failed';
						store.isProcessing = false;
						// await resetStripeElements();  
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
					console.log('[StripePayment] ❌ Payment confirmation error:', error);
					store.error = error instanceof Error ? error.message : 'Payment failed';
					store.isProcessing = false;
				

					// Don't trigger reset here - let the parent component handle it
					// This prevents duplicate resets and race conditions
					console.log('[StripePayment] 🔄 Payment error will be handled by parent component');

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

	// Stripe Elements Reset Handler - Properly clears validation state
	useVisibleTask$(() => {
		if (typeof window !== 'undefined') {
			const handleStripeReset = async () => {
				console.log('[StripePayment] 🔄 Starting complete Stripe reset process...');

				try {
					console.log('[StripePayment] 🧹 Clearing all validation states...');

					// Clear component state first
					store.error = '';
					store.debugInfo = 'Resetting payment form...';

					// Clear validation cache
					clearValidationCache();

					// Clear any browser storage that might cache validation state
					try {
						const keysToRemove = [
							'stripe_validation_errors',
							'stripe_form_state',
							'stripe_last_error',
							'stripe_elements_state',
							'stripe_payment_cache'
						];
						keysToRemove.forEach(key => {
							localStorage.removeItem(key);
							sessionStorage.removeItem(key);
						});
						console.log('[StripePayment] ✅ Browser storage validation states cleared');
					} catch (storageError) {
						console.log('[StripePayment] ⚠️ Storage not available, skipping storage cleanup',storageError);
					}

					// Clear window object validation state
					if (typeof window !== 'undefined') {
						const windowPropsToDelete = [
							'stripeValidationState',
							'stripeFormErrors',
							'lastStripeError',
							'stripeElementsCache',
							'stripeLastSubmission',
							'lastPaymentError',
							'lastValidationError'
						];
						windowPropsToDelete.forEach(prop => {
							delete (window as any)[prop];
						});
						console.log('[StripePayment] ✅ Window validation states cleared');
					}

					// Properly unmount existing Elements instance if it exists
					if (store.stripeElements) {
						console.log('[StripePayment] 🗑️ Unmounting existing Elements instance');
						try {
							// Unmount the payment element (this is the correct way per Stripe docs)
							const paymentElement = store.stripeElements.getElement('payment');
							if (paymentElement) {
								paymentElement.unmount();
								console.log('[StripePayment] ✅ Payment element properly unmounted');
							}
						} catch (unmountError) {
							console.log('[StripePayment] ⚠️ Error unmounting elements:', unmountError);
						}

						// Clear the Elements reference
						store.stripeElements = noSerialize({} as StripeElements);
					}

					// Clear the payment form container completely
					const container = document.getElementById('payment-form');
					if (container) {
						container.innerHTML = '';
						console.log('[StripePayment] 🧹 Payment form container cleared');
					}

					// Small delay to ensure cleanup is complete
					await new Promise(resolve => setTimeout(resolve, 200));

					// 🚨 CRITICAL FIX: Create a fresh PaymentIntent to clear server-side validation cache
					console.log('[StripePayment] 🆕 Creating fresh PaymentIntent to clear server-side validation errors...');
					try {
						// Calculate estimated total from local cart
						const estimatedTotal = calculateCartTotal(localCart);
						console.log('[StripePayment] Creating new PaymentIntent with total:', estimatedTotal);

						// Create a completely new PaymentIntent
						const paymentIntentResult = await createPreOrderStripePaymentIntentMutation(estimatedTotal, 'usd');
						console.log('[StripePayment] Fresh PaymentIntent created:', paymentIntentResult);

						// Update store with fresh PaymentIntent data
						store.clientSecret = paymentIntentResult.clientSecret;
						store.paymentIntentId = extractPaymentIntentId(store.clientSecret);

						console.log('[StripePayment] ✅ Fresh PaymentIntent ID:', store.paymentIntentId);
						console.log('[StripePayment] ✅ Fresh client secret:', store.clientSecret);

					} catch (paymentIntentError) {
						console.error('[StripePayment] ❌ Failed to create fresh PaymentIntent:', paymentIntentError);
						store.error = 'Failed to reset payment form. Please refresh the page and try again.';
						store.debugInfo = 'PaymentIntent creation failed during reset';
						return;
					}

					// Only recreate if we have a valid client secret and Stripe instance
					if (!store.clientSecret || !store.resolvedStripe) {
						console.log('[StripePayment] ⚠️ Missing client secret or Stripe instance after reset');
						store.debugInfo = 'Payment form cleared - will reinitialize when ready';
						return;
					}

					// Recreate Elements with fresh PaymentIntent
					console.log('[StripePayment] 🆕 Creating fresh Elements instance with new PaymentIntent...');
					const elements = store.resolvedStripe.elements({
						clientSecret: store.clientSecret, // This is now a fresh PaymentIntent
						appearance: {
							theme: 'stripe',
							variables: {
								colorPrimary: '#0570de',
								colorBackground: '#ffffff',
								colorText: '#30313d',
								colorDanger: '#df1b41',
								fontFamily: 'system-ui, sans-serif',
								spacingUnit: '4px',
								borderRadius: '8px',
							}
						}
					});

					store.stripeElements = noSerialize(elements);

					// Create fresh Payment Element
					const paymentElement = elements.create('payment', {
						layout: 'tabs',
						paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'paypal'],
						defaultValues: {
							billingDetails: {
								name: '',
								email: '',
							}
						}
					});

					// Mount the fresh element
					await paymentElement.mount('#payment-form');
					console.log('[StripePayment] ✅ Fresh payment element mounted');

					// Set up clean event listeners
					paymentElement.on('ready', () => {
						console.log('[StripePayment] 🟢 Fresh payment form ready - no cached validation state');
						store.debugInfo = 'Fresh payment form ready!';
						store.error = '';
					});

					paymentElement.on('change', (event: any) => {
						if (event.error) {
							console.log('[StripePayment] ❌ New validation error:', event.error.message);
							store.error = event.error.message || 'Payment validation error';
							store.debugInfo = `Payment error: ${event.error.message || 'Unknown error'}`;
						} else {
							console.log('[StripePayment] ✅ Form validation passed');
							store.error = '';
							store.debugInfo = 'Payment form is valid and ready!';
						}
					});

					paymentElement.on('focus', () => {
						store.error = '';
						store.debugInfo = 'Ready for payment details...';
					});

					console.log('[StripePayment] 🎉 Complete reset successful - fresh PaymentIntent and Elements with no cached state!');
					store.debugInfo = 'Payment form completely reset with fresh PaymentIntent - try again!';

				} catch (resetError) {
					console.log('[StripePayment] ❌ Complete reset failed:', resetError);
					store.error = 'Failed to reset payment form. Please refresh the page and try again.';
					store.debugInfo = 'Reset failed - page refresh recommended';
				}
			};

			window.addEventListener('stripe-reset-required', handleStripeReset);

			return () => {
				window.removeEventListener('stripe-reset-required', handleStripeReset);
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

		// Initialize Stripe Elements
		try {
			store.debugInfo = 'Loading Stripe...';
			const stripe = await stripePromise;

			if (!stripe) {
				store.error = 'Failed to load Stripe';
				store.debugInfo = 'Error: Stripe failed to load';
				return;
			}

			store.debugInfo = 'Creating Payment Element with tabbed interface...';
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

			// 🎯 Create Payment Element with TABBED INTERFACE!
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

			try {
				await paymentElement.mount('#payment-form');
				store.debugInfo = 'Payment Element with tabs mounted successfully!';

				// Add event listeners for better debugging and error clearing
				paymentElement.on('ready', () => {
					store.debugInfo = 'Payment Element with tabs is ready and interactive!';
					store.error = ''; // Clear any initial errors
				});

				paymentElement.on('change', (event: any) => {
					if (event.error) {
						store.error = event.error.message || 'Payment validation error';
						store.debugInfo = `Payment error: ${event.error.message || 'Unknown error'}`;
					} else {
						store.error = '';
						store.debugInfo = 'Payment form is valid and ready!';
					}
				});

				// Clear errors when user focuses on the form
				paymentElement.on('focus', () => {
					store.error = '';
					store.debugInfo = 'Ready for payment details...';
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
			{store.error !== '' && (
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

			{/* Button removed - payment is handled by the main checkout flow */}
			{/* The checkout flow calls confirmStripePreOrderPayment() after order creation */}
		</div>
	);
});
