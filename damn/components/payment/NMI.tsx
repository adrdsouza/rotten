import { $, Signal, component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import type { QRL } from '@qwik.dev/core';
import { processNMIPayment } from '~/providers/shop/checkout/checkout';
import { useCheckoutValidationActions } from '~/contexts/CheckoutValidationContext';

import XCircleIcon from '~/components/icons/XCircleIcon';
import {
 validateCardNumber,
 validateCVV,
 validateExpiryDate,
 formatCardNumber,
 formatExpiryDate,
 type CardValidationResult
} from '~/utils/card-validation';

// Moved CardValidationErrors to module scope
interface CardValidationErrors {
 cardNumber?: string;
 cvv?: string;
 expiryDate?: string;
}

export interface CardFormData {
	cardNumber: string;
	expiryDate: string;
	cvv: string;
}

interface NMIProps {
	isDisabled?: boolean;
	hideButton?: boolean;
	onForward$: QRL<(orderCode: string) => void>;
 onError$: QRL<(errorMessage: string) => void>;
 onProcessingChange$?: QRL<(isProcessing: boolean) => void>;
 triggerSignal: Signal<number>; // Incremented by parent to trigger submission
}

export default component$<NMIProps>(({ isDisabled, hideButton = false, onForward$, onError$, onProcessingChange$, triggerSignal }) => {

	const cardData = useSignal<CardFormData>({
		cardNumber: '',
		cvv: '',
		expiryDate: ''
	});

 const validationErrors = useSignal<CardValidationErrors>({});
	const isProcessing = useSignal(false);
	const error = useSignal('');
 const isValid = useSignal(false);
 const validationActions = useCheckoutValidationActions();

 
 // Individual field touched states - following customer/address pattern
 const cardNumberTouched = useSignal<boolean>(false);
 const cvvTouched = useSignal<boolean>(false);
 const expiryDateTouched = useSignal<boolean>(false);
 
 // Individual field validation states
 const cardNumberValid = useSignal<boolean>(false);
 const cvvValid = useSignal<boolean>(false);
 const expiryDateValid = useSignal<boolean>(false);

	// Update payment validation context based on individual field states
	const updatePaymentValidationContext = $(() => {
		const allFieldsValid = cardNumberValid.value && cvvValid.value && expiryDateValid.value;
		const anyFieldTouched = cardNumberTouched.value || cvvTouched.value || expiryDateTouched.value;

		// Only consider payment section valid if ALL individual fields are valid
		isValid.value = allFieldsValid;

		// Update the checkout validation context
		validationActions.updatePaymentValidation(
			allFieldsValid,
			{
				cardNumber: validationErrors.value.cardNumber,
				cvv: validationErrors.value.cvv,
				expiryDate: validationErrors.value.expiryDate
			},
			anyFieldTouched // Payment form is touched when any field has been touched
		);

		// Debug logging removed to prevent component re-renders
	});

	// Initialize payment validation context when component mounts
	useVisibleTask$(() => {
		updatePaymentValidationContext();
	});

	// Individual field validation function - follows customer/address pattern
	const validateField = $((field: keyof CardFormData, value: string) => {
		let validation: CardValidationResult;

		switch (field) {
			case 'cardNumber':
				validation = validateCardNumber(value);
				cardNumberValid.value = validation.isValid;
				break;
			case 'cvv':
				// Enhanced CVV validation using card number for better accuracy
				const cardNumberValidation = validateCardNumber(cardData.value.cardNumber);
				if (cardNumberValidation.isValid && cardNumberValidation.cardBrand) {
					// Use card brand specific validation when available
					const cvvLength = cardNumberValidation.cardBrand === 'american-express' ? 4 : 3;
					validation = validateCVV(value);
					// Override with more specific error if needed
					if (!validation.isValid && value.replace(/\D/g, '').length !== cvvLength) {
						validation.errorMessage = `Security code must be ${cvvLength} digits for ${cardNumberValidation.cardBrand}`;
					}
				} else {
					validation = validateCVV(value);
				}
				cvvValid.value = validation.isValid;
				break;
			case 'expiryDate':
				validation = validateExpiryDate(value);
				expiryDateValid.value = validation.isValid;
				break;
			default:
				validation = { isValid: true, errorMessage: '' };
		}

		// Update validation errors for this field
		validationErrors.value = {
			...validationErrors.value,
			[field]: validation.isValid ? undefined : validation.errorMessage
		};

		// Update overall payment validation in the checkout context
		updatePaymentValidationContext();

		return validation.isValid;
	});
	
	// Individual field blur handlers - following customer/address pattern
	const handleCardNumberBlur$ = $(() => {
		cardNumberTouched.value = true;
		// Extract digits for validation, but keep formatted value in state
		const digitsOnly = cardData.value.cardNumber.replace(/\D/g, '');
		validateField('cardNumber', digitsOnly);
	});
	
	const handleCvvBlur$ = $(() => {
		cvvTouched.value = true;
		validateField('cvv', cardData.value.cvv);
	});
	
	const handleExpiryDateBlur$ = $(() => {
		expiryDateTouched.value = true;
		// Extract digits for validation, but keep formatted value in state
		const digitsOnly = cardData.value.expiryDate.replace(/\D/g, '');
		validateField('expiryDate', digitsOnly);
	});

	// Validate all card details at once - QRL function for Qwik serialization
	const validateCard = $(async () => {
		// Mark all fields as touched when doing complete validation
		cardNumberTouched.value = true;
		cvvTouched.value = true;
		expiryDateTouched.value = true;
		
		// Perform individual field validation for all fields
		const cardNumberResult = await validateField('cardNumber', cardData.value.cardNumber);
		const cvvResult = await validateField('cvv', cardData.value.cvv);
		const expiryDateResult = await validateField('expiryDate', cardData.value.expiryDate);
		
		// Overall validation is based on all individual fields being valid
		const allValid = cardNumberResult && cvvResult && expiryDateResult;
		isValid.value = allValid;
		
		// console.log('[NMI] Complete card validation results:', {
		// 	cardNumber: cardNumberResult,
		// 	cvv: cvvResult,
		// 	expiryDate: expiryDateResult,
		// 	overall: allValid,
		// 	errors: validationErrors.value
		// });
		
		return allValid;
	});

	// Core submission logic for NMI payment
	const submitPaymentForm = $(async () => {
		error.value = '';
		const isFormValid = await validateCard();
		if (!isFormValid) {
			error.value = 'Please check your card details and try again.';
			return;
		}

		if (isProcessing.value) {
			// console.log('Payment already processing, ignoring duplicate submission.');
			return;
		}

		// Additional safeguard: Check if order is in the correct state for payment
		// This prevents payment attempts on already completed orders
		if (typeof window !== 'undefined' && (window as any).APP_STATE?.activeOrder) {
			const currentOrder = (window as any).APP_STATE.activeOrder;
			if (currentOrder.state !== 'ArrangingPayment') {
				// console.log('[NMI] Order is not in ArrangingPayment state, skipping payment:', currentOrder.state);
				return;
			}
		}

		try {
			// console.log('[NMI] Submitting payment form with valid card data...');
			isProcessing.value = true;
  // Notify parent about processing state change
  if (onProcessingChange$) {
  await onProcessingChange$(true);
  }

			// Process the payment with the card data
			const paymentResult = await processNMIPayment({
				cardNumber: cardData.value.cardNumber.replace(/\s/g, ''),
				expiryDate: cardData.value.expiryDate.replace(/\s/g, ''),
				cvv: cardData.value.cvv,
			});

			// console.log('[NMI] Payment result:', paymentResult);

			// If we reach this point, payment was successful (errors are thrown)
			if (paymentResult && paymentResult.code) {
				console.log(`[NMI] Payment successful for order: ${paymentResult.code}`);
				// Call the success callback with the order code
				await onForward$(paymentResult.code);
			} else {
				console.error('[NMI] Payment succeeded but no order code received:', paymentResult);
				throw new Error('Payment processed but order confirmation failed. Please contact support.');
			}
		} catch (err) {
			console.error('[NMI] Payment error:', err);
			error.value = err instanceof Error ? err.message : 'An unknown error occurred during payment processing.';
			// Call the error callback with the error message
			await onError$(error.value);
		} finally {
				isProcessing.value = false;
  // Notify parent about processing state change
  if (onProcessingChange$) {
   await onProcessingChange$(false);
  }
		}
	});

 // Watch for trigger signal from parent component
 useVisibleTask$(({track}) => {
   track(() => triggerSignal.value);
   // Ensure we only trigger if the signal has a positive value (indicating a new attempt)
   // and we are not already processing a payment.
   if (triggerSignal.value > 0) {
     if (!isProcessing.value) {
       // console.log('[NMI] Trigger signal received, initiating payment.');
       submitPaymentForm();
     } else {
       // console.log('[NMI] Trigger signal received but payment already in progress, ignoring.');
     }
   }
 });

	return (
		<div class={`w-full ${isDisabled ? 'opacity-50 pointer-events-none' : ''} border-0`}>
			{/* Card Fields - Single Line Layout */}
			<div class="grid grid-cols-4 gap-4 w-full mb-2">

				{/* Card Number: Half width (2 columns) */}
				<div class="col-span-2">
					<label for="cardNumber" class="sr-only">Card Number</label>
					<input
						id="cardNumber"
						type="text"
						placeholder="Card Number"
						value={cardData.value.cardNumber}
						maxLength={19}
						class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
							cardNumberTouched.value && validationErrors.value.cardNumber
								? 'border-red-300 focus:border-red-500 focus:ring-red-500'
								: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
						}`}
						onInput$={(_, el) => {
							// Strip non-digits for validation
							const digitsOnly = el.value.replace(/\D/g, '');
							// Format for display
							const formattedValue = formatCardNumber(digitsOnly);
							// Store formatted value for display, validate with digits only
							cardData.value = { ...cardData.value, cardNumber: formattedValue };
							// Only validate if field has been touched
							if (cardNumberTouched.value) {
								validateField('cardNumber', digitsOnly);
							}
						}}
						onBlur$={handleCardNumberBlur$}
					/>
					{cardNumberTouched.value && validationErrors.value.cardNumber && (
						<p class="text-red-600 text-xs mt-1">{validationErrors.value.cardNumber}</p>
					)}
				</div>

				{/* Expiry Date: Quarter width (1 column) */}
				<div class="col-span-1">
					<label for="expiryDate" class="sr-only">Expiry</label>
					<input
						id="expiryDate"
						type="text"
						placeholder="MM/YY"
						value={cardData.value.expiryDate}
						maxLength={5}
						class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
							expiryDateTouched.value && validationErrors.value.expiryDate
								? 'border-red-300 focus:border-red-500 focus:ring-red-500'
								: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
						}`}
						onInput$={(_, el) => {
							// Strip non-digits for validation
							const digitsOnly = el.value.replace(/\D/g, '');
							// Format for display
							const formattedValue = formatExpiryDate(digitsOnly);
							// Store formatted value for display, validate with digits only
							cardData.value = { ...cardData.value, expiryDate: formattedValue };
							// Only validate if field has been touched
							if (expiryDateTouched.value) {
								validateField('expiryDate', digitsOnly);
							}
						}}
						onBlur$={handleExpiryDateBlur$}
					/>
					{expiryDateTouched.value && validationErrors.value.expiryDate && (
						<p class="text-red-600 text-xs mt-1">{validationErrors.value.expiryDate}</p>
					)}
				</div>

				{/* CVV: Quarter width (1 column) */}
				<div class="col-span-1">
					<label for="cvv" class="sr-only">CVV</label>
					<input
						id="cvv"
						type="text"
						placeholder="CVV"
						value={cardData.value.cvv}
						maxLength={4}
						class={`block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white ${
							cvvTouched.value && validationErrors.value.cvv
								? 'border-red-300 focus:border-red-500 focus:ring-red-500'
								: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
						}`}
						onInput$={(_, el) => {
							const value = el.value.replace(/\D/g, '');
							cardData.value = { ...cardData.value, cvv: value };
							// Only validate if field has been touched
							if (cvvTouched.value) {
								validateField('cvv', value);
							}
						}}
						onBlur$={handleCvvBlur$}
					/>
					{cvvTouched.value && validationErrors.value.cvv && (
						<p class="text-red-600 text-xs mt-1">{validationErrors.value.cvv}</p>
					)}
				</div>
			</div>

			{error.value && (
				<div class="rounded-md bg-red-50 p-4 mb-6 w-full">
					<div class="flex">
						<div class="shrink-0">
							<XCircleIcon forcedClass="h-5 w-5 text-red-400" />
						</div>
						<div class="ml-3">
							<p class="text-sm text-red-700">{error.value}</p>
						</div>
					</div>
				</div>
			)}

			<div class="w-full flex justify-center mb-0">
				<p class="text-sm font-medium text-gray-600">🔒 Secure Credit Card Processing</p>
			</div>

			{!hideButton && (
				<button
					type="button"
					onClick$={submitPaymentForm}
					class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isProcessing.value || isDisabled}
				>
					{isProcessing.value ? 'Processing...' : 'Pay Now'}
				</button>
			)}
		</div>
	);
});
