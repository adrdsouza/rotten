import {
	$,
	component$,
	QRL,
	useContext,
	useSignal,
	useTask$,
	useVisibleTask$,
} from '@qwik.dev/core';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID } from '~/constants';
import { Address, CreateAddressInput, CreateCustomerInput } from '~/generated/graphql';
import { getActiveCustomerAddressesQuery } from '~/providers/shop/customer/customer';
import { getActiveOrderQuery } from '~/providers/shop/orders/order';
import { isActiveCustomerValid, isShippingAddressValid } from '~/utils';
import { 
	validateEmail, 
	validateName, 
	validatePhone,
	clearFieldValidationCache,
	clearAllValidationCache,
	filterPhoneInput
} from '~/utils/cached-validation';
import AutoShippingSelector from '../auto-shipping-selector/AutoShippingSelector';

type IProps = {
	// onForward$ is now just a signal that shipping is valid and data is ready
	onForward$: QRL<
		(customer: CreateCustomerInput, shippingAddress: CreateAddressInput) => void
	>;
	isReviewMode?: boolean; // New optional prop
};

export default component$<IProps>(({ onForward$, isReviewMode }) => {
	const appState = useContext(APP_STATE);
	const isFormValidSignal = useSignal(false);
	const countryInitialized = useSignal(false);
	const emailValidationError = useSignal<string>('');
	const emailTouched = useSignal(false);
	const firstNameValidationError = useSignal<string>('');
	const firstNameTouched = useSignal(false);
	const lastNameValidationError = useSignal<string>('');
	const lastNameTouched = useSignal(false);
	const phoneValidationError = useSignal<string>('');
	const phoneTouched = useSignal(false);
	const hasProceeded = useSignal(false); // New signal to prevent multiple onForward$ calls
	
	// Initialize country code synchronously from sessionStorage if available
	// This ensures the correct country is shown immediately on page load
	if (!countryInitialized.value) {
		countryInitialized.value = true;
		const storedCountry = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('countryCode') : null;
		if (storedCountry) {
			console.log(`🔄 Initializing country synchronously from sessionStorage: ${storedCountry}`);
			// Force update the country code regardless of current value
			appState.shippingAddress.countryCode = storedCountry;
			console.log(`📍 Country code set to: ${appState.shippingAddress.countryCode}`);
		} else {
			console.log('No country code found in sessionStorage');
		}
	}

	useVisibleTask$(async () => {
		// Clear all validation cache when form initializes
		clearAllValidationCache();
		console.log('[Shipping] Cleared validation cache on form initialization');
		
		const activeOrder = await getActiveOrderQuery();
		if (activeOrder?.customer) {
			const customer = activeOrder.customer;
			appState.customer = {
				title: customer.title ?? '',
				firstName: customer.firstName,
				id: customer.id,
				lastName: customer.lastName,
				emailAddress: customer.emailAddress,
				phoneNumber: customer.phoneNumber ?? '',
			};
			const shippingAddress = activeOrder?.shippingAddress;
			if (shippingAddress) {
				appState.shippingAddress = {
					city: shippingAddress.city ?? '',
					company: shippingAddress.company ?? '',
					country: shippingAddress.country ?? '',
					countryCode: shippingAddress.countryCode || '', // Keep empty if no country code
					fullName: shippingAddress.fullName ?? '',
					phoneNumber: shippingAddress.phoneNumber ?? '',
					postalCode: shippingAddress.postalCode ?? '',
					province: shippingAddress.province ?? '',
					streetLine1: shippingAddress.streetLine1 ?? '',
					streetLine2: shippingAddress.streetLine2 ?? '',
				};
			}
		}
		const activeCustomer = await getActiveCustomerAddressesQuery();
		if (activeCustomer?.addresses) {
			const [defaultShippingAddress] = activeCustomer.addresses.filter(
				(address: Address) => !!address.defaultShippingAddress
			);
			if (defaultShippingAddress) {
				const appStateDefaultShippingAddress = {
					city: defaultShippingAddress.city ?? '',
					company: defaultShippingAddress.company ?? '',
					country: defaultShippingAddress.country.code ?? '',
					countryCode: defaultShippingAddress.country.code ?? '',
					fullName: defaultShippingAddress.fullName ?? '',
					phoneNumber: defaultShippingAddress.phoneNumber ?? '',
					postalCode: defaultShippingAddress.postalCode ?? '',
					province: defaultShippingAddress.province ?? '',
					streetLine1: defaultShippingAddress.streetLine1 ?? '',
					streetLine2: defaultShippingAddress.streetLine2 ?? '',
				};
				appState.shippingAddress = {
					...appState.shippingAddress,
					...appStateDefaultShippingAddress,
				};
			}
		}
		
		// Use country code from sessionStorage if available, otherwise use defaults
		if (!countryInitialized.value && !appState.shippingAddress.countryCode && appState.availableCountries.length > 0) {
			countryInitialized.value = true; // Set this first to prevent re-entry
			
			// Try to get country from sessionStorage (set by product page or cart)
			const storedCountry = sessionStorage.getItem('countryCode');
			let countryToUse = '';
			
			if (storedCountry) {
				// Check if stored country is available in the store
				const isAvailable = appState.availableCountries.some(country => country.code === storedCountry);
				if (isAvailable) {
					countryToUse = storedCountry;
					console.log(`📍 Using country from session storage: ${countryToUse}`);
				} else {
					console.log(`Stored country ${storedCountry} not available in this store, using fallback`);
				}
			}
			
			// If no valid stored country, fall back to defaults
			if (!countryToUse) {
				// Fallback to US, then first available
				const usCountry = appState.availableCountries.find(country => country.code === 'US');
				countryToUse = usCountry?.code || appState.availableCountries[0].code;
				console.log(`📍 No stored country, using fallback: ${countryToUse}`);
			}
			
			// Update shipping address with the country code
			appState.shippingAddress = {
				...appState.shippingAddress,
				countryCode: countryToUse,
			};
		}
	});

	useTask$(({ track }) => {
		track(() => appState.customer);
		track(() => appState.shippingAddress);
		track(() => appState.shippingAddress.countryCode); // Track countryCode for phone validation
		track(() => emailValidationError.value);
		track(() => firstNameValidationError.value);
		track(() => lastNameValidationError.value);
		track(() => phoneValidationError.value); // Track phone validation

		// Run individual validations
		const shippingValid = isShippingAddressValid(appState.shippingAddress);
		const customerValid = isActiveCustomerValid(appState.customer);

		// Customer field validations
		const emailValid = !emailValidationError.value;
		const firstNameValid = !firstNameValidationError.value;
		const lastNameValid = !lastNameValidationError.value;
		const phoneValid = !phoneValidationError.value;

		// Additional phone validation for countries where phone is required
		const isPhoneOptional = (appState.shippingAddress.countryCode === 'US' || appState.shippingAddress.countryCode === 'PR');
		let phoneRequirementValid = true;
		if (!isPhoneOptional) {
			// For non-US/PR countries, phone is required
			phoneRequirementValid = !!(appState.customer?.phoneNumber && appState.customer.phoneNumber.trim());
		}

		const overallValid = shippingValid && customerValid && emailValid && firstNameValid && lastNameValid && phoneValid && phoneRequirementValid;

		console.log('🔍 Form validation check:', {
			shippingValid,
			customerValid,
			emailValid,
			firstNameValid,
			lastNameValid,
			phoneValid,
			phoneRequirementValid,
			emailError: emailValidationError.value,
			firstNameError: firstNameValidationError.value,
			lastNameError: lastNameValidationError.value,
			phoneError: phoneValidationError.value,
			overallValid,
			shippingAddress: appState.shippingAddress,
			customer: appState.customer
		});

		// Update validation status
		isFormValidSignal.value = overallValid;
	});

	// Email validation handler
	const handleEmailChange$ = $((value: string) => {
		// Clear cache for email validation when value changes
		clearFieldValidationCache('emailAddress', 'email');
		
		// Update the email in app state
		appState.customer = { ...appState.customer, emailAddress: value };
		
		// Validate email format if field has been touched
		if (emailTouched.value) {
			const emailResult = validateEmail(value);
			emailValidationError.value = emailResult.isValid ? '' : (emailResult.message || 'Invalid email');
		}
	});

	const handleEmailBlur$ = $(() => {
		emailTouched.value = true;
		const emailResult = validateEmail(appState.customer?.emailAddress || '');
		emailValidationError.value = emailResult.isValid ? '' : (emailResult.message || 'Invalid email');
	});

	// First name validation handlers
	const handleFirstNameChange$ = $((value: string) => {
		// Clear cache for first name validation when value changes
		clearFieldValidationCache('First name', 'name');
		
		// Update the firstName in app state
		appState.customer = { ...appState.customer, firstName: value };
		
		// Validate firstName format if field has been touched
		if (firstNameTouched.value) {
			const nameResult = validateName(value, 'First name');
			firstNameValidationError.value = nameResult.isValid ? '' : (nameResult.message || 'Invalid first name');
		}
	});

	const handleFirstNameBlur$ = $(() => {
		firstNameTouched.value = true;
		const nameResult = validateName(appState.customer?.firstName || '', 'First name');
		firstNameValidationError.value = nameResult.isValid ? '' : (nameResult.message || 'Invalid first name');
	});

	// Last name validation handlers
	const handleLastNameChange$ = $((value: string) => {
		// Clear cache for last name validation when value changes
		clearFieldValidationCache('Last name', 'name');
		
		// Update the lastName in app state
		appState.customer = { ...appState.customer, lastName: value };
		
		// Validate lastName format if field has been touched
		if (lastNameTouched.value) {
			const nameResult = validateName(value, 'Last name');
			lastNameValidationError.value = nameResult.isValid ? '' : (nameResult.message || 'Invalid last name');
		}
	});

	const handleLastNameBlur$ = $(() => {
		lastNameTouched.value = true;
		const nameResult = validateName(appState.customer?.lastName || '', 'Last name');
		lastNameValidationError.value = nameResult.isValid ? '' : (nameResult.message || 'Invalid last name');
	});

	// Phone validation handlers (NEW)
	const handlePhoneChange$ = $((value: string) => {
		// Clear cache for phone validation when value changes
		const countryCode = appState.shippingAddress.countryCode || 'US';
		clearFieldValidationCache(countryCode, 'phone');
		
		// Filter input to only allow valid phone characters
		const filteredValue = filterPhoneInput(value);
		appState.customer = { ...appState.customer, phoneNumber: filteredValue };
		if (phoneTouched.value) {
			const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
			const phoneResult = validatePhone(filteredValue, countryCode, isPhoneOptional);
			phoneValidationError.value = phoneResult.isValid ? '' : (phoneResult.message || 'Invalid phone number');
		}
	});

	const handlePhoneBlur$ = $(() => {
		phoneTouched.value = true;
		const phoneNumber = appState.customer?.phoneNumber || '';
		const countryCode = appState.shippingAddress.countryCode || 'US'; // Default to US if not set
		const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
		const phoneResult = validatePhone(phoneNumber, countryCode, isPhoneOptional);
		phoneValidationError.value = phoneResult.isValid ? '' : (phoneResult.message || 'Invalid phone number');

		// REMOVED onForward$ call from here
	});

	// New useTask$ to handle proceeding when form is valid
	useTask$(async ({ track }) => {
		track(() => isFormValidSignal.value);

		if (isFormValidSignal.value && !hasProceeded.value) {
			hasProceeded.value = true; // Set immediately to prevent race conditions / multiple calls
			console.log('✅ Form is valid, automatically proceeding (calling onForward$ from useTask$)');

			// Perform final safety checks before calling onForward$
			const customerEmail = appState.customer?.emailAddress || '';
			const customerFirstName = appState.customer?.firstName || '';
			const customerLastName = appState.customer?.lastName || '';
			const customerPhoneNumber = appState.customer?.phoneNumber || '';
			const customerTitle = appState.customer?.title || '';

			const shippingStreetLine1 = appState.shippingAddress?.streetLine1 || '';
			const shippingStreetLine2 = appState.shippingAddress?.streetLine2 || '';
			const shippingCompany = appState.shippingAddress?.company || '';
			const shippingCity = appState.shippingAddress?.city || '';
			const shippingProvince = appState.shippingAddress?.province || '';
			const shippingPostalCode = appState.shippingAddress?.postalCode || '';
			const shippingCountryCode = appState.shippingAddress?.countryCode || 'US'; // Default to US

			const emailResultCheck = validateEmail(customerEmail);
			const firstNameResultCheck = validateName(customerFirstName, 'First name');
			const lastNameResultCheck = validateName(customerLastName, 'Last name');
			const currentIsPhoneOptional = shippingCountryCode === 'US' || shippingCountryCode === 'PR';
			const phoneResultCheck = validatePhone(customerPhoneNumber, shippingCountryCode, currentIsPhoneOptional);

			if (!emailResultCheck.isValid) {
				console.log('❌ Email validation failed at auto-forward (useTask$):', emailResultCheck.message);
				emailTouched.value = true;
				emailValidationError.value = emailResultCheck.message || 'Invalid email address';
				hasProceeded.value = false; // Allow retry if validation fails
				return;
			}
			if (!firstNameResultCheck.isValid) {
				console.log('❌ First name validation failed at auto-forward (useTask$):', firstNameResultCheck.message);
				firstNameTouched.value = true;
				firstNameValidationError.value = firstNameResultCheck.message || 'Invalid first name';
				hasProceeded.value = false; // Allow retry
				return;
			}
			if (!lastNameResultCheck.isValid) {
				console.log('❌ Last name validation failed at auto-forward (useTask$):', lastNameResultCheck.message);
				lastNameTouched.value = true;
				lastNameValidationError.value = lastNameResultCheck.message || 'Invalid last name';
				hasProceeded.value = false; // Allow retry
				return;
			}
			if (!phoneResultCheck.isValid && !currentIsPhoneOptional) { // Only block if phone is required and invalid
				console.log('❌ Phone validation failed at auto-forward (useTask$):', phoneResultCheck.message);
				phoneTouched.value = true;
				phoneValidationError.value = phoneResultCheck.message || 'Invalid phone number';
				hasProceeded.value = false; // Allow retry
				return;
			}
			
			// Ensure shipping address is also valid (it should be if isFormValidSignal is true, but double check)
			if (!isShippingAddressValid(appState.shippingAddress)) {
				console.log('❌ Shipping address validation failed at auto-forward (useTask$)');
				hasProceeded.value = false; // Allow retry
				return;
			}

			const customerData: CreateCustomerInput = {
				emailAddress: customerEmail,
				firstName: customerFirstName,
				lastName: customerLastName,
				phoneNumber: customerPhoneNumber,
				title: customerTitle,
			};
			const shippingAddressData: CreateAddressInput = {
				streetLine1: shippingStreetLine1,
				streetLine2: shippingStreetLine2,
				company: shippingCompany,
				city: shippingCity,
				province: shippingProvince,
				postalCode: shippingPostalCode,
				countryCode: shippingCountryCode,
				// customFields: appState.shippingAddress.customFields || {}, // Property 'customFields' does not exist on type 'ShippingAddress'.
				phoneNumber: customerPhoneNumber, // Also include phone in shipping address if available
				fullName: `${customerFirstName} ${customerLastName}`,
			};
			
			// Call onForward$
			await onForward$(customerData, shippingAddressData);
		}
	});

	return (
		<div class="space-y-6">
			<div>
				<form class="space-y-3">
					{/* Email and Phone side-by-side */}
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<input
								type="email"
								value={appState.customer?.emailAddress}
								disabled={appState.customer?.id !== CUSTOMER_NOT_DEFINED_ID || isReviewMode}
								placeholder={`Email address *`}
								onChange$={(_, el) => handleEmailChange$(el.value)}
								onBlur$={handleEmailBlur$}
								class={`block w-full rounded-md shadow-xs sm:text-sm transition-colors duration-200 ${
									emailTouched.value && emailValidationError.value
										? 'border-red-300 focus:ring-red-500 focus:border-red-500'
										: 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
								}`}
							/>
							{emailTouched.value && emailValidationError.value && (
								<p class="mt-1 text-sm text-red-600">{emailValidationError.value}</p>
							)}
						</div>
						<div>
							<input
								type="tel"
								value={appState.customer?.phoneNumber}
								placeholder={`${`Phone number`}${ (appState.shippingAddress.countryCode === 'US' || appState.shippingAddress.countryCode === 'PR') ? ` (${`optional`})` : ' *'}`}
								onChange$={(_, el) => handlePhoneChange$(el.value)}
								onBlur$={handlePhoneBlur$}
								disabled={isReviewMode} // Disable if in review mode
								class={`block w-full rounded-md shadow-xs sm:text-sm transition-colors duration-200 ${
									phoneTouched.value && phoneValidationError.value
										? 'border-red-300 focus:ring-red-500 focus:border-red-500'
										: 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
								}`}
							/>
							{phoneTouched.value && phoneValidationError.value && (
								<p class="mt-1 text-sm text-red-600">{phoneValidationError.value}</p>
							)}
						</div>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<input
								type="text"
								value={appState.customer?.firstName}
								disabled={appState.customer?.id !== CUSTOMER_NOT_DEFINED_ID || isReviewMode}
								placeholder={`First name *`}
								onChange$={(_, el) => handleFirstNameChange$(el.value)}
								onBlur$={handleFirstNameBlur$}
								class={`block w-full rounded-md shadow-xs sm:text-sm transition-colors duration-200 ${
									firstNameTouched.value && firstNameValidationError.value
										? 'border-red-300 focus:ring-red-500 focus:border-red-500'
										: 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
								}`}
							/>
							{firstNameTouched.value && firstNameValidationError.value && (
								<p class="mt-1 text-sm text-red-600">{firstNameValidationError.value}</p>
							)}
						</div>

						<div>
							<input
								type="text"
								value={appState.customer?.lastName}
								disabled={appState.customer?.id !== CUSTOMER_NOT_DEFINED_ID || isReviewMode}
								placeholder={`Last name *`}
								onChange$={(_, el) => handleLastNameChange$(el.value)}
								onBlur$={handleLastNameBlur$}
								class={`block w-full rounded-md shadow-xs sm:text-sm transition-colors duration-200 ${
									lastNameTouched.value && lastNameValidationError.value
										? 'border-red-300 focus:ring-red-500 focus:border-red-500'
										: 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
								}`}
							/>
							{lastNameTouched.value && lastNameValidationError.value && (
								<p class="mt-1 text-sm text-red-600">{lastNameValidationError.value}</p>
							)}
						</div>
					</div>
				</form>
			</div>

			<input type="hidden" name="action" value="setCheckoutShipping" />

			<div class="mt-6 border-t border-gray-200 pt-4">
				<AutoShippingSelector appState={appState} />
			</div>

			{/* Proceed to payment button removed */}
			{/* The onForward$ logic is now triggered by the blur event of the last field if form is valid */}
		</div>
	);
});
