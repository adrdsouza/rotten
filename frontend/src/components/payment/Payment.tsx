import { component$, QRL, useSignal, useVisibleTask$, Signal, $ } from '@qwik.dev/core';
import { getEligiblePaymentMethodsQuery } from '~/providers/shop/checkout/checkout';
import { EligiblePaymentMethods } from '~/types';
import VisaImg from '~/media/visa.png?jsx';

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
	const internalSelectedPaymentMethod = useSignal<string>('stripe'); // Default to Stripe

	// Use external signal if provided, otherwise use internal signal
	const selectedPaymentMethod = externalSelectedPaymentMethod || internalSelectedPaymentMethod;

	useVisibleTask$(async () => {
		try {
			paymentMethods.value = await getEligiblePaymentMethodsQuery();
		} catch (error) {
			console.error('[Payment] Error loading payment methods:', error);
		}
	});

	const handlePaymentMethodChange = $((method: string) => {
		selectedPaymentMethod.value = method;
	});

	return (
		<div class={`flex flex-col space-y-4 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
			{/* Payment Method Selection */}
			<div class="w-full">
				<button
					type="button"
					onClick$={() => handlePaymentMethodChange('stripe')}
					class={`flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-200 w-full ${
						selectedPaymentMethod.value === 'stripe'
							? 'border-blue-500 bg-blue-50 shadow-md'
							: 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
					}`}
				>
					<VisaImg
						alt="Credit or Debit Card"
						class="h-8 object-contain"
					/>
					<span class="ml-3 text-sm font-medium text-gray-700">Credit or Debit Card</span>
				</button>
			</div>

			{/* Payment Forms */}
			<div class="w-full">
				{selectedPaymentMethod.value === 'stripe' && (
					<div class="mt-4 p-6 border border-gray-200 rounded-lg bg-gray-50">
						<div class="text-center text-gray-600">
							<div class="mb-4">
								<svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
								</svg>
							</div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">Stripe Payment Integration</h3>
							<p class="text-sm text-gray-600 mb-4">
								Stripe payment processing will be available soon. This secure payment gateway will support all major credit and debit cards.
							</p>
							<div class="text-xs text-gray-500">
								Coming Soon: Visa, Mastercard, American Express, Discover, and more
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
});
