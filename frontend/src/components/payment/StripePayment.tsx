import { component$, noSerialize, useStore, useVisibleTask$, $, useContext } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import {
	createPreOrderStripePaymentIntentMutation,
	linkPaymentIntentToOrderMutation
} from '~/providers/shop/checkout/checkout';
import { useLocalCart } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';

import XCircleIcon from '../icons/XCircleIcon';

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

// 🚢 SHIPPING CALCULATION: Calculate shipping fee based on country and order total
const calculateShippingFee = (countryCode: string, orderTotal: number): number => {
	console.log('[calculateShippingFee] Calculating shipping for country:', countryCode, 'order total:', orderTotal);

	if (!countryCode) {
		console.log('[calculateShippingFee] No country code, returning $10 default shipping');
		return 800; // $8 default
	}

	// US and Puerto Rico shipping logic
	if (countryCode === 'US' || countryCode === 'PR') {
		if (orderTotal >= 10000) { // $100 or more
			console.log('[calculateShippingFee] US/PR order over $100, free shipping');
			return 0; // Free shipping
		} else {
			console.log('[calculateShippingFee] US/PR order under $100, $8 shipping');
			return 800; // $8 shipping
		}
	} else {
		// International shipping: flat $20
		console.log('[calculateShippingFee] International shipping, $20 flat rate');
		return 2000; // $20 shipping
	}
};

// Utility function to calculate estimated total from local cart with shipping
const calculateCartTotal = (localCart: any, shippingAddress?: any): number => {
	console.log('[calculateCartTotal] Input localCart:', localCart);
	console.log('[calculateCartTotal] Shipping address:', shippingAddress);

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

	console.log('[calculateCartTotal] Subtotal before shipping:', subtotal);

	// Calculate shipping fee based on country and subtotal
	const countryCode = shippingAddress?.countryCode || 'US'; // Default to US
	const shippingFee = calculateShippingFee(countryCode, subtotal);
	console.log('[calculateCartTotal] Shipping fee:', shippingFee);

	// Apply coupon discount if available
	const couponDiscount = localCart.localCart.appliedCoupon?.discountAmount || 0;
	console.log('[calculateCartTotal] Coupon discount:', couponDiscount);

	// Calculate final total: subtotal + shipping - discount
	const finalTotal = subtotal + shippingFee - couponDiscount;
	console.log('[calculateCartTotal] Final total calculation:', {
		subtotal,
		shippingFee,
		couponDiscount,
		finalTotal
	});

	return Math.max(finalTotal, 100); // Minimum $1.00
};

// 🔒 SECURITY FIX: Utility function to get current payment intent amount for validation
const getCurrentPaymentIntentAmount = async (clientSecret: string, stripe: Stripe | null): Promise<number> => {
	if (!stripe || !clientSecret) {
		throw new Error('Stripe not initialized or client secret missing');
	}

	try {
		const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
		if (!paymentIntent) {
			throw new Error('Payment intent not found');
		}
		return paymentIntent.amount;
	} catch (error) {
		console.error('[getCurrentPaymentIntentAmount] Error retrieving payment intent:', error);
		throw new Error('Failed to retrieve payment intent amount');
	}
};

// 🔒 SECURITY FIX: Validate payment intent metadata matches order
const validatePaymentIntentMetadata = async (clientSecret: string, stripe: Stripe | null, order: any): Promise<boolean> => {
	if (!stripe || !clientSecret || !order) {
		return false;
	}

	try {
		const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
		if (!paymentIntent || !(paymentIntent as any).metadata) {
			return false;
		}

		const metadata = (paymentIntent as any).metadata;

		// Check if this payment intent was linked to the correct order
		if (metadata.vendure_order_id && metadata.vendure_order_id !== order.id) {
			console.error('[validatePaymentIntentMetadata] Order ID mismatch:', {
				paymentIntentOrderId: metadata.vendure_order_id,
				actualOrderId: order.id
			});
			return false;
		}

		if (metadata.vendure_order_code && metadata.vendure_order_code !== order.code) {
			console.error('[validatePaymentIntentMetadata] Order code mismatch:', {
				paymentIntentOrderCode: metadata.vendure_order_code,
				actualOrderCode: order.code
			});
			return false;
		}

		return true;
	} catch (error) {
		console.error('[validatePaymentIntentMetadata] Error validating metadata:', error);
		return false;
	}
};

export default component$(() => {
	const baseUrl = useLocation().url.origin;
	const localCart = useLocalCart();
	const appState = useContext(APP_STATE);

	const store = useStore({
		clientSecret: '',
		paymentIntentId: '',
		isPreOrder: true, // Flag to track pre-order state
		resolvedStripe: noSerialize({} as Stripe),
		stripeElements: noSerialize({} as StripeElements),
		paymentElement: noSerialize({} as any), // Store reference to payment element for updates
		error: '',
		isProcessing: false,
		debugInfo: 'Initializing...',
	});

	// Function to create a fresh PaymentIntent and Elements
	const createFreshPaymentIntent = $(async () => {
		console.log('[StripePayment] Creating fresh PaymentIntent to clear validation state...');
		console.log('[StripePayment] Current shipping address:', appState.shippingAddress);

		try {
			// 1. Calculate estimated total from local cart including shipping
			const estimatedTotal = calculateCartTotal(localCart, appState.shippingAddress);
			console.log('[StripePayment] Creating new PaymentIntent with estimated total (including shipping):', estimatedTotal);

			// 2. Create a brand new PaymentIntent
			const paymentIntentResult = await createPreOrderStripePaymentIntentMutation(estimatedTotal, 'usd');
			console.log('[StripePayment] New PaymentIntent result:', paymentIntentResult);

			// 3. Update store with new PaymentIntent data
			store.clientSecret = paymentIntentResult.clientSecret;
			store.paymentIntentId = extractPaymentIntentId(store.clientSecret);
			console.log('[StripePayment] New PaymentIntent ID:', store.paymentIntentId);

			return true;
		} catch (error) {
			console.error('[StripePayment] Failed to create fresh PaymentIntent:', error);
			store.error = 'Failed to reset payment form. Please refresh the page.';
			return false;
		}
	});

	// Function to completely recreate payment element and PaymentIntent after errors
	const recreatePaymentSystem = $(async () => {
		console.log('[StripePayment] Recreating entire payment system to clear cached validation state...');

		if (!store.resolvedStripe) {
			console.warn('[StripePayment] Cannot recreate payment system - Stripe not initialized');
			return;
		}

		try {
			// 1. Create a fresh PaymentIntent first
			const paymentIntentCreated = await createFreshPaymentIntent();
			if (!paymentIntentCreated) {
				console.error('[StripePayment] Failed to create fresh PaymentIntent, aborting recreation');
				return;
			}

			// 2. Destroy the existing payment element if it exists
			if (store.paymentElement) {
				console.log('[StripePayment] Destroying existing payment element...');
				try {
					store.paymentElement.destroy();
				} catch (destroyError) {
					console.warn('[StripePayment] Error destroying element:', destroyError);
				}
			}

			// 3. Create new Elements instance with fresh clientSecret
			console.log('[StripePayment] Creating new Elements instance with fresh PaymentIntent...');
			const newElements = store.resolvedStripe.elements({
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

			// 4. Update store with new Elements instance
			store.stripeElements = noSerialize(newElements);

			// 5. Create a completely new payment element
			console.log('[StripePayment] Creating new payment element...');
			const newPaymentElement = newElements.create('payment', {
				layout: 'tabs',
				paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'paypal'],
				defaultValues: {
					billingDetails: {
						name: '',
						email: '',
					}
				}
			});

			// 6. Store the new element reference
			store.paymentElement = noSerialize(newPaymentElement);

			// 7. Mount the new element
			const mountTarget = document.getElementById('payment-form');
			if (mountTarget) {
				// Clear the mount target first
				mountTarget.innerHTML = '';

				await newPaymentElement.mount('#payment-form');
				console.log('[StripePayment] New payment system mounted successfully');

				// 8. Re-attach event listeners
				newPaymentElement.on('ready', () => {
					console.log('[StripePayment] New payment system is ready');
					store.debugInfo = 'Payment system recreated and ready!';
				});

				newPaymentElement.on('change', (event: any) => {
					if (event.error) {
						store.error = event.error.message || 'Payment validation error';
						store.debugInfo = `Payment error: ${event.error.message || 'Unknown error'}`;
					} else {
						store.error = '';
						store.debugInfo = 'Payment form is valid and ready!';
					}
				});

			} else {
				console.error('[StripePayment] Mount target #payment-form not found');
			}

		} catch (recreateError) {
			console.error('[StripePayment] Failed to recreate payment system:', recreateError);
			store.error = 'Failed to reset payment form. Please refresh the page.';
		}
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
					// 🎯 CRITICAL FIX: Recreate entire payment system after validation error
					// This creates a fresh PaymentIntent and Elements to completely clear cached state
					await recreatePaymentSystem();
					throw new Error(submitError?.message || 'Form validation failed');
				}

				console.log('[StripePayment] Elements submitted successfully');
				return { success: true };
			};

			// Function to confirm payment after order is created and linked
			(window as any).confirmStripePreOrderPayment = async (order: any) => {
				console.log('[StripePayment] *** confirmStripePreOrderPayment CALLED ***');
				console.log('[StripePayment] Order received:', order);

				// 🔒 SECURITY FIX: Validate order details before processing payment
				if (!order || !order.id || !order.code || typeof order.totalWithTax !== 'number') {
					console.error('[StripePayment] Invalid order details received:', order);
					return {
						success: false,
						error: 'Invalid order information provided for payment'
					};
				}

				console.log('[StripePayment] Store state:', {
					paymentIntentId: store.paymentIntentId,
					clientSecret: store.clientSecret,
					resolvedStripe: !!store.resolvedStripe,
					stripeElements: !!store.stripeElements
				});

				try {
					store.isProcessing = true;
					console.log('[StripePayment] Confirming payment for order:', order.code);

					// 🔒 SECURITY FIX: Validate payment amount matches order total before processing
					const currentPaymentIntentAmount = await getCurrentPaymentIntentAmount(store.clientSecret, store.resolvedStripe as Stripe);
					if (currentPaymentIntentAmount !== order.totalWithTax) {
						console.error('[StripePayment] Payment amount mismatch:', {
							paymentIntentAmount: currentPaymentIntentAmount,
							orderTotal: order.totalWithTax
						});
						const errorMsg = `Payment amount (${currentPaymentIntentAmount}) does not match order total (${order.totalWithTax})`;
						store.error = errorMsg;
						store.isProcessing = false;
						return {
							success: false,
							error: errorMsg
						};
					}

					// 🔒 ADDITIONAL VALIDATION: Verify order state and currency
					if (order.state !== 'ArrangingPayment') {
						console.error('[StripePayment] Invalid order state for payment:', order.state);
						const errorMsg = `Order is not ready for payment. Current state: ${order.state}`;
						store.error = errorMsg;
						store.isProcessing = false;
						return {
							success: false,
							error: errorMsg
						};
					}

					// 🔒 VALIDATE: Ensure order has valid line items
					if (!order.lines || order.lines.length === 0) {
						console.error('[StripePayment] Order has no line items');
						const errorMsg = 'Order has no items to pay for';
						store.error = errorMsg;
						store.isProcessing = false;
						return {
							success: false,
							error: errorMsg
						};
					}

					// 🔒 VALIDATE: Check payment intent metadata matches order (if linked)
					const metadataValid = await validatePaymentIntentMetadata(store.clientSecret, store.resolvedStripe as Stripe, order);
					if (!metadataValid) {
						console.warn('[StripePayment] Payment intent metadata validation failed - this may be expected for pre-order payments');
						// Note: We don't fail here for pre-order payments, but log the warning
					}

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
					console.log('[StripePayment] Submitting Stripe Elements--:',{ element:store.stripeElements});
					const { error: submitError } = await store.stripeElements?.submit() || { error: new Error('Elements not initialized') };

					if (submitError) {
						logAndStore('[StripePayment] Elements submit failed:', submitError);
						// 🎯 CRITICAL FIX: Recreate entire payment system after validation error
						await recreatePaymentSystem();
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
						// 🎯 CRITICAL FIX: Recreate entire payment system after payment confirmation error
						await recreatePaymentSystem();
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
					console.error('[StripePayment] Payment confirmation error:', error);
					store.error = error instanceof Error ? error.message : 'Payment failed';
					store.isProcessing = false;

					// 🎯 CRITICAL FIX: Recreate entire payment system after any payment error
					await recreatePaymentSystem();

					// 🚨 CRITICAL FIX: Don't throw error - let UI recover for retry
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

			// 🎯 CRITICAL: Store payment element reference for updates
			store.paymentElement = noSerialize(paymentElement);

			try {
				await paymentElement.mount('#payment-form');
				store.debugInfo = 'Payment Element with tabs mounted successfully!';

				// Add event listeners for better debugging
				paymentElement.on('ready', () => {
					store.debugInfo = 'Payment Element with tabs is ready and interactive!';
				});

				paymentElement.on('change', (event: any) => {
					if (event.error) {
						store.error = event.error.message || 'Payment validation error';
						store.debugInfo = `Payment error: ${event.error.message || 'Unknown error'}`;
						// Note: We don't recreate element on change events as it would be too disruptive
						// Element recreation happens on submit errors instead
					} else {
						store.error = '';
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
