import { $, component$, noSerialize, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import { createStripePaymentIntentMutation } from '~/providers/shop/checkout/checkout';
import { getActiveOrderQuery, getOrderByCodeQuery } from '~/providers/shop/orders/order';


import CreditCardIcon from '../icons/CreditCardIcon';
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

export default component$(() => {
	const baseUrl = useLocation().url.origin;
	const store = useStore({
		clientSecret: '',
		resolvedStripe: noSerialize({} as Stripe),
		stripeElements: noSerialize({} as StripeElements),
		error: '',
	});

	useVisibleTask$(async () => {
		console.log('[StripePayment] Creating payment intent for current order...');

		try {
			store.clientSecret = await createStripePaymentIntentMutation();
		} catch (error) {
			console.error('[StripePayment] Failed to create payment intent:', error);
			store.error = 'Failed to initialize payment. Please try again.';
			return;
		}

		await stripePromise.then((stripe) => {
			store.resolvedStripe = noSerialize(stripe as Stripe);
			store.stripeElements = noSerialize(stripe?.elements({
				clientSecret: store.clientSecret,
				locale: 'en',
				// Configure which payment methods to show
				appearance: {
					theme: 'stripe',
					variables: {
						colorPrimary: '#ddd7c0',
						colorBackground: '#ffffff',
						colorText: '#374151',
						colorDanger: '#ef4444',
						colorSuccess: '#10b981',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						spacingUnit: '4px',
						borderRadius: '6px',
						fontSizeBase: '16px',
						fontWeightNormal: '400',
						fontWeightBold: '500',
						focusBoxShadow: '0 0 0 2px rgba(176, 153, 131, 0.2)',
						focusOutline: 'none',
					},
					rules: {
						// Force full width for the entire payment element
						'.PaymentElement': {
							width: '100%',
							maxWidth: '100%',
						},
						'.Tabs': {
							width: '100%',
							maxWidth: '100%',
						},
						// Tab styling for Stripe's native tabs layout
						'.Tab': {
							border: '1px solid #e5e7eb',
							borderRadius: '8px 8px 0 0',
							backgroundColor: '#f9fafb',
							padding: '12px 16px',
							fontWeight: '500',
							fontSize: '14px',
							color: '#374151',
							transition: 'all 0.2s ease',
							cursor: 'pointer',
							marginRight: '2px',
						},
						'.Tab:hover': {
							backgroundColor: '#f3f4f6',
							borderColor: '#ddd7c0',
						},
						'.Tab--selected': {
							backgroundColor: '#ffffff',
							borderColor: '#ddd7c0',
							borderBottomColor: '#ffffff',
							color: '#ddd7c0',
							fontWeight: '600',
							position: 'relative',
							zIndex: '10',
						},
						'.Tab--selected:hover': {
							backgroundColor: '#ffffff',
						},
						'.TabContent': {
							backgroundColor: '#ffffff',
							border: '1px solid #ddd7c0',
							borderTop: 'none',
							borderRadius: '0 8px 8px 8px',
							padding: '20px',
							marginTop: '-1px',
							width: '100%',
							maxWidth: '100%',
							boxSizing: 'border-box',
						},
						'.Input': {
							borderRadius: '6px',
							border: '1px solid #d1d5db',
							padding: '12px 16px',
							fontSize: '16px',
							backgroundColor: '#ffffff',
							transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
						},
						'.Input:hover': {
							borderColor: '#9ca3af',
						},
						'.Input:focus': {
							borderColor: '#ddd7c0',
							boxShadow: '0 0 0 2px rgba(176, 153, 131, 0.2)',
							outline: 'none',
						},
						'.Input--invalid': {
							borderColor: '#ef4444',
							boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)',
						},
						'.Label': {
							fontSize: '14px',
							fontWeight: '500',
							color: '#374151',
							marginBottom: '6px',
						},
						'.Error': {
							fontSize: '14px',
							color: '#ef4444',
							marginTop: '6px',
						}
					}
				}
			}));

			// Create payment element with tabs layout
			store.stripeElements?.create('payment', {
				layout: {
					type: 'tabs',
					defaultCollapsed: false
				},
				fields: {
					billingDetails: {
						name: 'auto',
						email: 'auto',
						phone: 'auto',
						address: {
							country: 'auto',
							line1: 'auto',
							line2: 'auto',
							city: 'auto',
							state: 'auto',
							postalCode: 'auto',
						}
					}
				}
			}).mount('#payment-form');
		});
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

			<button
				class="w-full flex px-6 bg-[#ddd7c0] hover:bg-[#4F3B26] items-center justify-center space-x-2 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ddd7c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
				disabled={!store.clientSecret || !!store.error}
				onClick$={$(async () => {
					try {
						console.log('[StripePayment] Starting payment process...');

						// Step 1: Submit the Stripe elements to validate payment method
						const submitResult = await store.stripeElements?.submit();
						if (submitResult?.error) {
							store.error = submitResult.error.message as string;
							return;
						}

						// Store order code for redirect-based payment methods
						const activeOrder = await getActiveOrderQuery();
						if (activeOrder?.code) {
							sessionStorage.setItem('pendingOrderCode', activeOrder.code);
						}

						// Step 2: Confirm payment with Stripe to get payment method
						const confirmResult = await store.resolvedStripe?.confirmPayment({
							elements: store.stripeElements,
							clientSecret: store.clientSecret,
							confirmParams: {
								return_url: `${baseUrl}/checkout/confirmation`, // Required for redirect-based payment methods (Alipay, WeChat, SEPA, etc.)
							},
						});

						if (confirmResult?.error) {
							console.error('[StripePayment] Stripe confirmation failed:', confirmResult.error);
							store.error = confirmResult.error.message as string;
							return;
						}

						console.log('[StripePayment] Stripe payment confirmed! Waiting for webhook to process...');

						// The Stripe webhook will automatically add the payment to the Vendure order
						// We need to poll the order status until it transitions to PaymentSettled
						const paymentIntentId = (confirmResult as any)?.paymentIntent?.id;
						const paymentIntent = (confirmResult as any)?.paymentIntent;
						console.log('[StripePayment] Payment Intent ID:', paymentIntentId);
						console.log('[StripePayment] Full Payment Intent:', paymentIntent);

						// Extract payment method information for display
						// payment_method can be either a string (ID) or PaymentMethod object
						const paymentMethod = typeof paymentIntent?.payment_method === 'object'
							? paymentIntent.payment_method
							: null;

						const paymentMethodInfo = {
							type: paymentMethod?.type || 'card',
							card: paymentMethod?.card || null,
							wallet: paymentMethod?.card?.wallet || null
						};
						console.log('[StripePayment] Payment Method Info:', paymentMethodInfo);

						// First, get the current order code while it's still active
						const currentActiveOrder = await getActiveOrderQuery();
						if (!currentActiveOrder || !currentActiveOrder.code) {
							console.error('[StripePayment] No active order found to poll');
							store.error = 'Unable to confirm payment status';
							return;
						}

						const orderCode = currentActiveOrder.code;
						console.log('[StripePayment] Polling order by code:', orderCode);

						// Poll order status for up to 30 seconds
						let attempts = 0;
						const maxAttempts = 30; // 30 seconds

						const pollOrderStatus = async (): Promise<void> => {
							attempts++;
							console.log(`[StripePayment] Polling order status (attempt ${attempts}/${maxAttempts})...`);

							try {
								// Get order by code (works even after it's no longer "active")
								const order = await getOrderByCodeQuery(orderCode);

								if (order && order.state === 'PaymentSettled') {
									console.log('[StripePayment] Order payment settled! Passing order data to confirmation...');

									// Pass complete order data + payment method info to confirmation page
									const orderData = encodeURIComponent(JSON.stringify({
										order: order,
										paymentIntentId: paymentIntentId,
										paymentMethodInfo: paymentMethodInfo, // Include payment method details
										completedAt: Date.now(),
										source: 'stripe_payment'
									}));

									window.location.href = `${baseUrl}/checkout/confirmation/${order.code}?orderData=${orderData}`;
									return;
								}

								console.log(`[StripePayment] Order state: ${order?.state || 'unknown'}`);

								if (attempts < maxAttempts) {
									// Wait 1 second and try again
									setTimeout(pollOrderStatus, 1000);
								} else {
									console.error('[StripePayment] Timeout waiting for payment confirmation');
									store.error = 'Payment is processing. Please check your email for confirmation.';
								}
							} catch (error) {
								console.error('[StripePayment] Error polling order status:', error);
								if (attempts < maxAttempts) {
									setTimeout(pollOrderStatus, 1000);
								} else {
									store.error = 'Payment is processing. Please check your email for confirmation.';
								}
							}
						};

						// Start polling
						pollOrderStatus();

					} catch (error) {
						console.error('[StripePayment] Payment error:', error);
						store.error = error instanceof Error ? error.message : 'Payment failed';
					}
				})}
			>
				<CreditCardIcon />
				<span>Place Order</span>
			</button>
		</div>
	);
});
