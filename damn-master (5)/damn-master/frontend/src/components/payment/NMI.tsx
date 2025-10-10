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

/**
 * 🚀 Enhanced NMI Payment Component with Smart Field Navigation
 * 
 * Features implemented:
 * - Auto-advance to next field when current field is complete
 * - Smart expiry date formatting (typing "426" becomes "04/26" and advances to CVV)
 * - Intelligent field focus management with keyboard navigation
 * - Backspace navigation to previous field when current field is empty
 * - Enter key support for field navigation and form submission
 * - Enhanced UX similar to Stripe's payment forms
 */

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
		
		console.log('[NMI] Payment validation updated:', {
			cardNumberValid: cardNumberValid.value,
			cvvValid: cvvValid.value,
			expiryDateValid: expiryDateValid.value,
			allFieldsValid,
			anyFieldTouched,
			errors: validationErrors.value
		});
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

	// 🚀 Smart field navigation functions
	const focusNextField = $((currentFieldId: string) => {
		if (typeof document === 'undefined') return;
		
		const fieldOrder = ['cardNumber', 'expiryDate', 'cvv'];
		const currentIndex = fieldOrder.indexOf(currentFieldId);
		const nextIndex = currentIndex + 1;
		
		if (nextIndex < fieldOrder.length) {
			const nextField = document.getElementById(fieldOrder[nextIndex]);
			if (nextField) {
				nextField.focus();
			}
		}
	});

	const focusPreviousField = $((currentFieldId: string) => {
		if (typeof document === 'undefined') return;
		
		const fieldOrder = ['cardNumber', 'expiryDate', 'cvv'];
		const currentIndex = fieldOrder.indexOf(currentFieldId);
		const previousIndex = currentIndex - 1;
		
		if (previousIndex >= 0) {
			const previousField = document.getElementById(fieldOrder[previousIndex]);
			if (previousField) {
				previousField.focus();
				// Position cursor at end
				setTimeout(() => {
					if (previousField instanceof HTMLInputElement) {
						previousField.setSelectionRange(previousField.value.length, previousField.value.length);
					}
				}, 0);
			}
		}
	});

	// Enhanced keyboard navigation handler
	const handleKeyDown = $((event: KeyboardEvent, fieldId: string) => {
		// Handle backspace on empty fields to go to previous field
		if (event.key === 'Backspace') {
			const target = event.target as HTMLInputElement;
			if (target.value === '' || target.selectionStart === 0) {
				event.preventDefault();
				focusPreviousField(fieldId);
			}
		}
		// Handle Enter to move to next field or submit
		else if (event.key === 'Enter') {
			event.preventDefault();
			if (fieldId === 'cvv') {
				// Submit form if on last field
				submitPaymentForm();
			} else {
				focusNextField(fieldId);
			}
		}
	});

	// Check if field is complete AND valid before allowing auto-advance
	const isFieldCompleteAndValid = $((field: keyof CardFormData, value: string): boolean => {
		switch (field) {
			case 'cardNumber':
				// Card number must be valid (correct format and length for card type)
				const cardValidation = validateCardNumber(value.replace(/\D/g, ''));
				return cardValidation.isValid;
			case 'expiryDate':
				// Expiry must be valid format AND not in the past
				if (value.length !== 5 || !/^\d{2}\/\d{2}$/.test(value)) {
					return false;
				}
				const expiryValidation = validateExpiryDate(value.replace(/\D/g, ''));
				return expiryValidation.isValid;
			case 'cvv':
				// CVV must be correct length for card type
				const cardNumberValidation = validateCardNumber(cardData.value.cardNumber.replace(/\D/g, ''));
				const expectedLength = (cardNumberValidation.cardBrand === 'american-express') ? 4 : 3;
				const cvvDigits = value.replace(/\D/g, '');
				if (cvvDigits.length !== expectedLength) {
					return false;
				}
				const cvvValidation = validateCVV(cvvDigits);
				return cvvValidation.isValid;
			default:
				return false;
		}
	});

	// 🚀 Smart expiry date formatting (like Stripe)
	const formatExpiryDateSmart = $((input: string): string => {
		const digitsOnly = input.replace(/\D/g, '');
		
		if (digitsOnly.length === 0) return '';
		if (digitsOnly.length === 1) {
			// If first digit is > 1, prepend 0 (e.g., "4" becomes "04")
			if (parseInt(digitsOnly) > 1) {
				return `0${digitsOnly}/`;
			}
			return digitsOnly;
		}
		if (digitsOnly.length === 2) {
			// Check if we have a valid month
			const month = parseInt(digitsOnly);
			if (month > 12) {
				// Invalid month, restructure as 0X/Y
				return `0${digitsOnly[0]}/${digitsOnly[1]}`;
			}
			return `${digitsOnly}/`;
		}
		if (digitsOnly.length === 3) {
			// Handle case where user types 3 digits (e.g., "426")
			const month = parseInt(digitsOnly.slice(0, 2));
			if (month > 12) {
				// Restructure as 0X/YZ
				return `0${digitsOnly[0]}/${digitsOnly.slice(1)}`;
			}
			return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
		}
		if (digitsOnly.length >= 4) {
			// Full date: MMYY
			return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`;
		}
		
		return formatExpiryDate(digitsOnly);
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
		
		console.log('[NMI] Complete card validation results:', {
			cardNumber: cardNumberResult,
			cvv: cvvResult,
			expiryDate: expiryDateResult,
			overall: allValid,
			errors: validationErrors.value
		});
		
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
			console.log('Payment already processing, ignoring duplicate submission.');
			return;
		}

		try {
			console.log('[NMI] Submitting payment form with valid card data...');
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

			console.log('[NMI] Payment result:', paymentResult);

			if (paymentResult?.__typename === 'Order') {
				console.log(`[NMI] Payment successful for order: ${paymentResult.code}`);
				// Call the success callback with the order code
				await onForward$(paymentResult.code);
			} else {
				console.error('[NMI] Payment failed with result:', paymentResult);
				let errorMsg = 'Payment processing failed. Please try again.';
				if (paymentResult && typeof paymentResult === 'object' && 'errorMessage' in paymentResult) {
					errorMsg = paymentResult.errorMessage as string;
				}
				throw new Error(errorMsg);
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
       console.log('[NMI] Trigger signal received, initiating payment.');
       submitPaymentForm();
     } else {
       console.log('[NMI] Trigger signal received but payment already in progress, ignoring.');
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
						onInput$={async (_, el) => {
							// Strip non-digits for validation
							const digitsOnly = el.value.replace(/\D/g, '');
							// Format for display
							const formattedValue = formatCardNumber(digitsOnly);
							// Store formatted value for display, validate with digits only
							cardData.value = { ...cardData.value, cardNumber: formattedValue };
							// Always validate when typing for auto-advance check
							const isValid = await validateField('cardNumber', digitsOnly);
							// 🚀 Smart navigation: auto-advance when card number is complete AND valid
							const isComplete = await isFieldCompleteAndValid('cardNumber', formattedValue);
							if (isComplete && isValid) {
								focusNextField('cardNumber');
							}
						}}
						onKeyDown$={(event) => handleKeyDown(event, 'cardNumber')}
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
						onInput$={async (_, el) => {
							// 🚀 Use smart expiry formatting (like Stripe)
							const formattedValue = await formatExpiryDateSmart(el.value);
							// Store formatted value for display
							cardData.value = { ...cardData.value, expiryDate: formattedValue };
							// Always validate when typing for auto-advance check
							const digitsOnly = formattedValue.replace(/\D/g, '');
							const isValid = await validateField('expiryDate', digitsOnly);
							// 🚀 Smart navigation: auto-advance when expiry is complete AND valid
							const isComplete = await isFieldCompleteAndValid('expiryDate', formattedValue);
							if (isComplete && isValid) {
								focusNextField('expiryDate');
							}
						}}
						onKeyDown$={(event) => handleKeyDown(event, 'expiryDate')}
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
							// 🚀 Note: CVV is the last field, so no auto-advance needed
							// But we could trigger form submission when complete if desired
						}}
						onKeyDown$={(event) => handleKeyDown(event, 'cvv')}
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

			<div class="w-full flex justify-center mb-1">
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
