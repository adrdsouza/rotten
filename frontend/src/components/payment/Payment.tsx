import { component$, QRL, useSignal, useVisibleTask$, Signal, $ } from '@qwik.dev/core';
import { EligiblePaymentMethods } from '~/types';

import StripePayment from './StripePayment';

interface PaymentProps {
	onForward$: QRL<(orderCode: string) => void>; // Expects orderCode from payment methods
	onError$: QRL<(errorMessage: string) => void>; // For payment methods to report errors
	onProcessingChange$?: QRL<(isProcessing: boolean) => void>; // For payment methods to report processing state changes
	triggerStripeSignal: Signal<number>; // Signal from parent to trigger Stripe submission
	selectedPaymentMethod?: Signal<string>; // Signal to track selected payment method
	isDisabled?: boolean;
	hideButton?: boolean;
}

export default component$<PaymentProps>(({ onForward$: _onForward$, onError$: _onError$, onProcessingChange$: _onProcessingChange$, triggerStripeSignal: _triggerStripeSignal, selectedPaymentMethod: _externalSelectedPaymentMethod, isDisabled, hideButton: _hideButton = false }) => {
	const paymentMethods = useSignal<EligiblePaymentMethods[]>();

	// Use external signal if provided, otherwise use internal signal

	useVisibleTask$(() => {
		// For local cart mode, we skip querying eligiblePaymentMethods since there's no active order
		// Instead, we directly show Stripe payment (similar to how coupons work without active order)
		console.log('[Payment] Local cart mode - showing Stripe payment directly');

		// Set a mock payment method to trigger Stripe rendering
		paymentMethods.value = [{
			code: 'stripe-pre-order',
			name: 'Credit Card & Digital Wallets',
			isEligible: true
		}];

		console.log('[Payment] Set payment methods:', paymentMethods.value);
	});

	// Listen for trigger signal to initiate Stripe payment
	useVisibleTask$(async ({ track }) => {
		const triggerValue = track(() => _triggerStripeSignal.value);

		if (triggerValue > 0) {
			console.log('[Payment] Stripe trigger signal received:', triggerValue);

			// Call the Stripe payment confirmation function
			if (typeof window !== 'undefined' && (window as any).confirmStripePreOrderPayment) {
				// Get the active order from the global app state
				try {
					const { getActiveOrderQuery } = await import('~/providers/shop/orders/order');
					const activeOrder = await getActiveOrderQuery();

					if (activeOrder) {
						console.log('[Payment] Triggering Stripe payment for order:', activeOrder.code);

						// 🚨 CRITICAL FIX: Handle payment result properly
						try {
							const paymentResult = await (window as any).confirmStripePreOrderPayment(activeOrder);

							if (paymentResult && !paymentResult.success) {
								// Payment failed - communicate error back to checkout page
								console.error('[Payment] Stripe payment failed:', paymentResult.error);

								// First report the error to allow checkout page to restore cart state
								_onError$(paymentResult.error || 'Payment failed. Please check your payment details and try again.');

								// 🚨 NEW FIX: Trigger complete reset after payment failure with small delay
								// This delay allows the checkout page's error handler to restore cart state first
								if (typeof window !== 'undefined' && (window as any).resetStripePaymentCompletely) {
									console.log('[Payment] 🔄 Triggering complete Stripe payment reset after error (with delay)...');
									setTimeout(async () => {
										try {
											await (window as any).resetStripePaymentCompletely();
										} catch (resetError) {
											console.warn('[Payment] Failed to reset Stripe payment:', resetError);
										}
									}, 100); // Small delay to allow cart state restoration
								}
								return;
							}

							// If we get here, payment was successful (handled by StripePayment component)

						} catch (paymentError) {
							console.error('[Payment] Stripe payment error:', paymentError);

							// First report the error to allow checkout page to restore cart state
							_onError$(paymentError instanceof Error ? paymentError.message : 'Payment failed. Please try again.');

							// 🚨 NEW FIX: Trigger complete reset after payment exception with small delay
							// This delay allows the checkout page's error handler to restore cart state first
							if (typeof window !== 'undefined' && (window as any).resetStripePaymentCompletely) {
								console.log('[Payment] 🔄 Triggering complete Stripe payment reset after exception (with delay)...');
								setTimeout(async () => {
									try {
										await (window as any).resetStripePaymentCompletely();
									} catch (resetError) {
										console.warn('[Payment] Failed to reset Stripe payment:', resetError);
									}
								}, 100); // Small delay to allow cart state restoration
							}
						}
					} else {
						console.error('[Payment] No active order found for Stripe payment');
						_onError$('No active order found for payment');
					}
				} catch (error) {
					console.error('[Payment] Error getting active order:', error);
					_onError$('Failed to access order information');
				}
			} else {
				console.error('[Payment] confirmStripePreOrderPayment function not found');
				_onError$('Payment system not properly initialized');
			}
		}
	});

	const handleDummyPayment$ = $(async () => { await _onForward$('dummy-order-code'); });

	return (
		<div class={`flex flex-col space-y-4 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
			{/* Payment Methods */}
			<div class="flex flex-col space-y-24 items-center">
				{paymentMethods.value?.map((method) => {
					return (
						<div key={method.code} class="flex flex-col items-center w-full">
							{method.code === 'standard-payment' && (
								<>
									<p class="text-gray-600 text-sm p-6">
										This is a dummy payment for demonstration purposes only
									</p>
									<button
										class="flex px-6 bg-[#8a6d4a] hover:bg-[#4F3B26] items-center justify-center space-x-2 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8a6d4a] cursor-pointer"
										onClick$={handleDummyPayment$}
									>
										<span>Pay with {method.name}</span>
									</button>
								</>
							)}
							{method.code.includes('stripe') && (
								<div class="!w-full">
									<StripePayment />
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
});
