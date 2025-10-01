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
	// 🔒 SECURITY FIX: Accept specific order details as props instead of relying on global state
	orderDetails?: {
		id: string;
		code: string;
		totalWithTax: number;
		customer?: {
			emailAddress?: string;
		};
	} | null;
}

export default component$<PaymentProps>(({ onForward$: _onForward$, onError$: _onError$, onProcessingChange$: _onProcessingChange$, triggerStripeSignal: _triggerStripeSignal, selectedPaymentMethod: _externalSelectedPaymentMethod, isDisabled, hideButton: _hideButton = false, orderDetails }) => {
	const paymentMethods = useSignal<EligiblePaymentMethods[]>();

	// 🔍 DEBUG LOGGING: Log all payment component inputs
	console.log('[Payment] Component initialized with props:', {
		triggerStripeSignal: !!_triggerStripeSignal,
		orderDetails,
		isDisabled,
		hideButton: _hideButton,
		selectedPaymentMethod: _externalSelectedPaymentMethod
	});

	// 🔍 DEBUG LOGGING: Validate order details
	if (orderDetails) {
		console.log('[Payment] Order details validation:', {
			hasId: !!orderDetails.id,
			hasCode: !!orderDetails.code,
			hasTotalWithTax: !!orderDetails.totalWithTax,
			totalWithTax: orderDetails.totalWithTax,
			hasCustomer: !!orderDetails.customer,
			customerEmail: orderDetails.customer?.emailAddress
		});

		// Check for invalid order information
		if (!orderDetails.id || !orderDetails.code || !orderDetails.totalWithTax) {
			console.log('[Payment] INVALID ORDER INFORMATION DETECTED:', {
				missingId: !orderDetails.id,
				missingCode: !orderDetails.code,
				missingTotal: !orderDetails.totalWithTax,
				orderDetails
			});
		}
	} else {
		console.log('[Payment] No order details provided - using local cart mode');
	}

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
		// 🔒 SECURITY FIX: Track orderDetails to ensure we have the latest value
		const currentOrderDetails = track(() => orderDetails);

		if (triggerValue > 0) {
			console.log('[Payment] Stripe trigger signal received:', triggerValue);
			console.log('[Payment] Current order details at trigger time:', currentOrderDetails);

			// 🔒 SECURITY FIX: Use specific order details passed as props instead of global state
			if (!currentOrderDetails) {
				console.log('[Payment] No order details provided for payment');
				_onError$('Order information missing. Please try again.');
				return;
			}

			// Validate order details
			if (!currentOrderDetails.id || !currentOrderDetails.code || !currentOrderDetails.totalWithTax) {
				console.log('[Payment] Invalid order details:', currentOrderDetails);
				_onError$('Invalid order information. Please try again.');
				return;
			}

			console.log('[Payment] Processing payment for specific order:', currentOrderDetails.code, 'with total:', currentOrderDetails.totalWithTax);

			// Call the Stripe payment confirmation function
			if (typeof window !== 'undefined' && (window as any).confirmStripePreOrderPayment) {
				try {
					// 🔒 SECURITY FIX: Pass the specific order details instead of querying global state
					const paymentResult = await (window as any).confirmStripePreOrderPayment(currentOrderDetails);

					if (paymentResult && !paymentResult.success) {
						// Payment failed - communicate error back to checkout page
						console.log('[Payment] Stripe payment failed:', paymentResult.error);
						_onError$(paymentResult.error || 'Payment failed. Please check your payment details and try again.');
						return;
					}

					// If we get here, payment was successful (handled by StripePayment component)

				} catch (paymentError) {
					console.log('[Payment] Stripe payment error:', paymentError);
					_onError$(paymentError instanceof Error ? paymentError.message : 'Payment failed. Please try again.');
				}
			} else {
				console.log('[Payment] confirmStripePreOrderPayment function not found');
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
