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

export default component$<PaymentProps>(({ onForward$: _onForward$, onError$: _onError$, onProcessingChange$: _onProcessingChange$, triggerStripeSignal: _triggerStripeSignal, selectedPaymentMethod: externalSelectedPaymentMethod, isDisabled, hideButton: _hideButton = false }) => {
	const paymentMethods = useSignal<EligiblePaymentMethods[]>();
	const internalSelectedPaymentMethod = useSignal<string>('stripe');

	// Use external signal if provided, otherwise use internal signal
	const _selectedPaymentMethod = externalSelectedPaymentMethod || internalSelectedPaymentMethod;

	useVisibleTask$(async () => {
		// For local cart mode, we skip querying eligiblePaymentMethods since there's no active order
		// Instead, we directly show Stripe payment (similar to how coupons work without active order)
		console.log('[Payment] Local cart mode - showing Stripe payment directly');

		// Set a mock payment method to trigger Stripe rendering
		paymentMethods.value = [{
			code: 'stripe',
			name: 'Credit Card & Digital Wallets',
			isEligible: true
		}];

		console.log('[Payment] Set payment methods:', paymentMethods.value);
	});



	return (
		<div class={`flex flex-col space-y-4 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
			{/* Payment Methods */}
			<div class="flex flex-col space-y-24 items-center">
				{paymentMethods.value?.map((method) => {
					console.log('[Payment] Rendering method:', method.code);
					return (
					<div key={method.code} class="flex flex-col items-center w-full">
						{method.code === 'standard-payment' && (
							<>
								<p class="text-gray-600 text-sm p-6">
									This is a dummy payment for demonstration purposes only
								</p>
								<button
									class="flex px-6 bg-[#8a6d4a] hover:bg-[#4F3B26] items-center justify-center space-x-2 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8a6d4a] cursor-pointer"
									onClick$={$(async () => {
										_onForward$('dummy-order-code');
									})}
								>
									<span>Pay with {method.name}</span>
								</button>
							</>
						)}
						{method.code.includes('stripe') && (
							console.log('[Payment] Rendering Stripe elements for method:', method.code),
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
