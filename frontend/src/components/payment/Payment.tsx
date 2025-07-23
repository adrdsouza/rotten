import { component$, QRL, useSignal, useVisibleTask$, Signal, $ } from '@qwik.dev/core'; // Added Signal type
import { getEligiblePaymentMethodsQuery } from '~/providers/shop/checkout/checkout';
import { EligiblePaymentMethods } from '~/types';
import NMI from './NMI';
import Sezzle from './Sezzle';
import VisaImg from '~/media/visa.png?jsx';
import SezzleImg from '~/media/sezzle.png?jsx';

interface PaymentProps {
 onForward$: QRL<(orderCode: string) => void>; // Expects orderCode from payment methods
 onError$: QRL<(errorMessage: string) => void>; // For payment methods to report errors
 onProcessingChange$?: QRL<(isProcessing: boolean) => void>; // For payment methods to report processing state changes
 triggerNMISignal: Signal<number>; // Signal from parent to trigger NMI submission
 triggerSezzleSignal: Signal<number>; // Signal from parent to trigger Sezzle submission
 selectedPaymentMethod?: Signal<string>; // Signal to track selected payment method
 isDisabled?: boolean;
 hideButton?: boolean;
}

export default component$<PaymentProps>(({ onForward$, onError$, onProcessingChange$, triggerNMISignal, triggerSezzleSignal, selectedPaymentMethod: externalSelectedPaymentMethod, isDisabled, hideButton = false }) => {
	// console.log('[Payment] Component rendering with props:', { isDisabled, hideButton });
	const paymentMethods = useSignal<EligiblePaymentMethods[]>();
	const internalSelectedPaymentMethod = useSignal<string>('nmi'); // Default to NMI

	// Use external signal if provided, otherwise use internal signal
	const selectedPaymentMethod = externalSelectedPaymentMethod || internalSelectedPaymentMethod;

	useVisibleTask$(async () => {
		// console.log('[Payment] Loading eligible payment methods...');
		try {
			paymentMethods.value = await getEligiblePaymentMethodsQuery();
			// console.log('[Payment] Payment methods loaded:', paymentMethods.value);
		} catch (error) {
			console.error('[Payment] Error loading payment methods:', error);
		}
	});

	const handlePaymentMethodChange = $((method: string) => {
		selectedPaymentMethod.value = method;
		// console.log('[Payment] Payment method changed to:', method);
	});

	return (
		<div class={`flex flex-col space-y-2 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
			{/* Payment Method Selection - Side by Side Buttons */}
			<div class="grid grid-cols-2 gap-4 mb-2">
				{/* Credit Card Option */}
				<button
					type="button"
					onClick$={() => handlePaymentMethodChange('nmi')}
					class={`flex items-center justify-center p-1 border rounded-lg cursor-pointer transition-all duration-200 aspect-[3/1] ${
						selectedPaymentMethod.value === 'nmi'
							? 'border-blue-500 bg-blue-50 shadow-md'
							: 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
					}`}
				>
					<VisaImg
						alt="Credit or Debit Card"
						class="w-full h-full object-contain"
					/>
				</button>

				{/* Sezzle Option */}
				<button
					type="button"
					onClick$={() => handlePaymentMethodChange('sezzle')}
					class={`flex items-center justify-center p-1 border rounded-lg cursor-pointer transition-all duration-200 aspect-[3/1] ${
						selectedPaymentMethod.value === 'sezzle'
							? 'border-purple-500 bg-purple-50 shadow-md'
							: 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
					}`}
				>
					<SezzleImg
						alt="Sezzle - Buy Now, Pay Later"
						class="w-full h-full object-contain"
					/>
				</button>
			</div>

			{/* Payment Forms */}
			<div class="w-full">
				{selectedPaymentMethod.value === 'nmi' && (
					<div class="mt-1">
						<NMI
						isDisabled={isDisabled}
						onForward$={onForward$}
						onError$={onError$}
						onProcessingChange$={onProcessingChange$}
						hideButton={hideButton}
						triggerSignal={triggerNMISignal}
					/>
					</div>
				)}

				{selectedPaymentMethod.value === 'sezzle' && (
					<Sezzle
						isDisabled={isDisabled}
						onForward$={onForward$}
						onError$={onError$}
						onProcessingChange$={onProcessingChange$}
						hideButton={hideButton}
						triggerSignal={triggerSezzleSignal}
					/>
				)}
			</div>
		</div>
	);
});
