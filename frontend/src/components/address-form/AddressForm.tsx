import { component$, useContext, useSignal, $, type QRL, type Signal, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { APP_STATE } from '~/constants';
import { ShippingAddress } from '~/types';
import { 
 validatePostalCode,
 validateName,
 validateAddress,
 validateStateProvince,
 clearFieldValidationCache,
 clearCountryValidationCache
} from '~/utils/cached-validation';
import { getFieldType } from '~/utils/field-type-helpers';
import { isActiveCustomerValid } from '~/utils';

type IProps = {
	shippingAddress: ShippingAddress;
	formApi?: Signal<{ getFormData$?: QRL<() => ShippingAddress> }>;
	isReviewMode?: boolean; // New optional prop
	onUserInteraction$?: QRL<() => void>; // Callback for when user starts interacting
};

interface ValidationErrors {
	fullName?: string;
	streetLine1?: string;
	city?: string;
	province?: string;
	postalCode?: string;
}

// Canonical state/city mapping for India (can be expanded for other countries)
const IN_STATE_MAP: Record<string, string> = {
 'maharashtra': 'Maharashtra',
 'delhi': 'Delhi',
 'karnataka': 'Karnataka',
 'tamil nadu': 'Tamil Nadu',
 'west bengal': 'West Bengal',
 'uttar pradesh': 'Uttar Pradesh',
 'gujarat': 'Gujarat',
 'rajasthan': 'Rajasthan',
 'madhya pradesh': 'Madhya Pradesh',
 'andhra pradesh': 'Andhra Pradesh'
};

const IN_CITY_MAP: Record<string, string> = {
 'mumbai': 'Mumbai',
 'delhi': 'Delhi',
 'bengaluru': 'Bengaluru',
 'bangalore': 'Bengaluru',
 'chennai': 'Chennai',
 'kolkata': 'Kolkata',
 'hyderabad': 'Hyderabad'
};

export default component$<IProps>(({ shippingAddress, formApi, isReviewMode, onUserInteraction$ }) => { // Added onUserInteraction$ to destructuring
	const appState = useContext(APP_STATE);
	const validationErrors = useSignal<ValidationErrors>({});
	const touchedFields = useSignal<Set<string>>(new Set());
	const isFormValid = useSignal(false);
	const validationTimer = useSignal<NodeJS.Timeout | null>(null);
	
	// Local signal for country code to manage UI reactivity independently
	const localCountryCode = useSignal(shippingAddress.countryCode || '');
	
	// Local state for form fields to avoid circular reactivity
	const localFormData = useSignal<{
		streetLine1: string;
		streetLine2: string;
		city: string;
		province: string;
		postalCode: string;
	}>({
		streetLine1: shippingAddress.streetLine1 || '',
		streetLine2: shippingAddress.streetLine2 || '',
		city: shippingAddress.city || '',
		province: shippingAddress.province || '',
		postalCode: shippingAddress.postalCode || '',
	});
	
	// Local state for debouncing dropdown selection
	const dropdownState = useStore({
		pendingCountryCode: '',
		debounceTimer: null as ReturnType<typeof setTimeout> | null,
		DEBOUNCE_DELAY: 500 // 500ms delay to wait for user to finish selecting
	});

	// Track if user has interacted with form
	const hasUserInteracted = useSignal(false);

	// Force update country code from sessionStorage if it exists - moved to useVisibleTask for proper timing
	useVisibleTask$(() => {
		if (typeof sessionStorage !== 'undefined') {
			const storedCountry = sessionStorage.getItem('countryCode');
			if (storedCountry && storedCountry !== appState.shippingAddress.countryCode) {
				// console.log(`🔄 AddressForm: Updating country from sessionStorage: ${storedCountry}`);
				appState.shippingAddress.countryCode = storedCountry;
				localCountryCode.value = storedCountry; // Also update the local signal for dropdown UI
			}
		}
	});

	// Individual field validation
	const validateField$ = $((fieldName: string, value: string, countryCode: string = 'US') => {
		// No review mode: always validate

		const currentErrors = validationErrors.value;
		const errors = { ...currentErrors };

		switch (fieldName) {
			case 'streetLine1':
				const addressResult = validateAddress(value, 'Street address');
				if (!addressResult.isValid) {
					errors.streetLine1 = addressResult.message;
				} else {
					errors.streetLine1 = '';
				}
				break;
				
			case 'city':
				const cityResult = validateName(value, 'City');
				if (!cityResult.isValid) {
					errors.city = cityResult.message;
				} else {
					errors.city = '';
				}
				break;
				
			case 'province':
				const provinceResult = validateStateProvince(value, countryCode, 'State/Province');
				if (!provinceResult.isValid) {
					errors.province = provinceResult.message;
				} else {
					errors.province = '';
				}
				break;
				
			case 'postalCode':
				const postalResult = validatePostalCode(value, countryCode);
				if (!postalResult.isValid) {
					errors.postalCode = postalResult.message;
				} else {
					errors.postalCode = '';
				}
				break;
		}
		
		// Only update if errors actually changed
		if (JSON.stringify(currentErrors) !== JSON.stringify(errors)) {
			validationErrors.value = errors;
		}
	});

	// Complete form validation and sync to app state
	const validateAndSync$ = $(() => {
		// Merge local form data with shipping address
		const mergedAddress = {
			...shippingAddress,
			...localFormData.value,
		};

		// console.log('[AddressForm] Validating complete address for country:', mergedAddress.countryCode);

		// Apply local normalization for India
		if (mergedAddress.countryCode === 'IN') {
			const cityKey = (mergedAddress.city || '').trim().toLowerCase();
			const provinceKey = (mergedAddress.province || '').trim().toLowerCase();
			
			if (IN_CITY_MAP[cityKey]) mergedAddress.city = IN_CITY_MAP[cityKey];
			if (IN_STATE_MAP[provinceKey]) mergedAddress.province = IN_STATE_MAP[provinceKey];
			
			// Capitalize first letter if not in mapping
			if (!IN_CITY_MAP[cityKey] && mergedAddress.city) {
				mergedAddress.city = mergedAddress.city.charAt(0).toUpperCase() + mergedAddress.city.slice(1);
			}
			if (!IN_STATE_MAP[provinceKey] && mergedAddress.province) {
				mergedAddress.province = mergedAddress.province.charAt(0).toUpperCase() + mergedAddress.province.slice(1);
			}
		}

		// Validate all required fields using the same validation functions as individual fields
		const streetResult = validateAddress(mergedAddress.streetLine1 || '', 'Street address');
		const cityResult = validateName(mergedAddress.city || '', 'City');
		const provinceResult = validateStateProvince(mergedAddress.province || '', mergedAddress.countryCode || 'US', 'State/Province');
		const postalResult = validatePostalCode(mergedAddress.postalCode || '', mergedAddress.countryCode || 'US');
		const customerValid = isActiveCustomerValid(appState.customer);

		const addressValid = streetResult.isValid && cityResult.isValid && provinceResult.isValid && postalResult.isValid;
		const overallValid = addressValid && customerValid;

		// console.log('[AddressForm] Validation results:', {
		// 	street: streetResult.isValid,
		// 	city: cityResult.isValid,
		// 	province: provinceResult.isValid,
		// 	postal: postalResult.isValid,
		// 	customer: customerValid,
		// 	overall: overallValid
		// });

		// Update form validity state
		isFormValid.value = overallValid;

		// Sync to app state if everything is valid
		if (overallValid) {
			// console.log('[AddressForm] All validation passed, syncing to appState');
			appState.shippingAddress = { ...mergedAddress };
		} else {
			// console.log('[AddressForm] Validation failed, not syncing to appState');
		}
	});

	// Handle field blur events
	const handleFieldBlur$ = $((fieldName: string, value: string) => {
		// Mark field as touched
		if (!touchedFields.value.has(fieldName)) {
			touchedFields.value = new Set([...touchedFields.value, fieldName]);
		}
		
		// Validate the specific field
		validateField$(fieldName, value, shippingAddress.countryCode || 'US');
		
		// Trigger complete form validation (debounced)
		if (validationTimer.value) {
			clearTimeout(validationTimer.value);
		}
		validationTimer.value = setTimeout(() => {
			validateAndSync$();
		}, 300);
	});

	// Handle input changes
	const handleInputChange$ = $((fieldName: string, value: string | boolean) => {
		// Clear validation cache for the field being changed
		if (fieldName === 'countryCode') {
			// Clear country-specific caches when country changes
			const oldCountry = appState.shippingAddress.countryCode;
			clearCountryValidationCache(oldCountry, value as string);
		} else {
			// Clear cache for specific field
			clearFieldValidationCache(fieldName, getFieldType(fieldName));
		}
		
		// Notify parent component on first user interaction
		if (!hasUserInteracted.value && onUserInteraction$) {
			hasUserInteracted.value = true;
			onUserInteraction$();
		}
		
		// Handle country code changes with debounced update to both local and global state
		if (fieldName === 'countryCode') {
			// Debounce the update to prevent rapid successive updates
			dropdownState.pendingCountryCode = value as string;
			
			// Clear any existing timer
			if (dropdownState.debounceTimer !== null) {
				clearTimeout(dropdownState.debounceTimer);
			}
			
			// Set a new debounce timer
			dropdownState.debounceTimer = setTimeout(() => {
				const finalCountryCode = dropdownState.pendingCountryCode;
				
				// Only proceed if a country is selected and different from current
				if (finalCountryCode && finalCountryCode !== appState.shippingAddress.countryCode) {
					// console.log('Applying final country selection:', finalCountryCode);
					// console.log('Before update - Global state:', appState.shippingAddress.countryCode, 'Local signal:', localCountryCode.value);

					// Apply the country change to both global and local state
					appState.shippingAddress.countryCode = finalCountryCode;
					localCountryCode.value = finalCountryCode;

					// console.log('After update - Global state:', appState.shippingAddress.countryCode, 'Local signal:', localCountryCode.value);
					
					// Store user selection in sessionStorage
					sessionStorage.setItem('countryCode', finalCountryCode);
					// console.log('[AddressForm] Saved user-selected country to sessionStorage:', finalCountryCode);

					// Find the country name from available countries
					const country = appState.availableCountries.find(c => c.code === finalCountryCode);
					if (country) {
						appState.shippingAddress.country = country.name;
						// console.log('Country name set to:', country.name);
					}
				}
				
				// Clear timer reference
				dropdownState.debounceTimer = null;
			}, dropdownState.DEBOUNCE_DELAY);
		} else {
			// Update local form data for other fields
			(localFormData.value as any)[fieldName] = value;
		}

		// Validate field if it has been touched (only for string fields)
		if (typeof value === 'string' && touchedFields.value.has(fieldName)) {
			const countryCode = fieldName === 'countryCode' ? value as string : (shippingAddress.countryCode || 'US');
			validateField$(fieldName, value, countryCode);
		}

		// Check if all required fields are filled for complete form validation
		const hasAllRequiredFields = 
			localFormData.value.streetLine1.trim() &&
			localFormData.value.city.trim() &&
			localFormData.value.province.trim() &&
			localFormData.value.postalCode.trim();

		if (hasAllRequiredFields) {
			// Debounced complete form validation (standardized to 300ms)
			if (validationTimer.value) {
				clearTimeout(validationTimer.value);
			}
			validationTimer.value = setTimeout(() => {
				validateAndSync$();
			}, 300);
		}
	});

	// CSS classes for form fields
	const getFieldClasses = (fieldName: string) => {
		const hasError = touchedFields.value.has(fieldName) && validationErrors.value[fieldName as keyof ValidationErrors];
		const baseClasses ="block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white";
		const errorClasses = hasError 
			?"border-red-300 focus:border-red-500 focus:ring-red-500" 
			:"border-gray-300 focus:border-primary-500 focus:ring-primary-500";
		return `${baseClasses} ${errorClasses}`;
	};

	const getSelectClasses = () => {
		return "block w-full p-2 rounded-md border focus:outline-hidden border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors duration-200 bg-white appearance-none";
	};

	// Function to collect all form data for submission
	const getFormData$ = $(() => {
		// Automatically set as default shipping address if there's only one address
		const isDefaultShipping = true; // Always set as default shipping
		const isDefaultBilling = true; // Always set as default billing

		return {
			...shippingAddress, // shipping-critical fields (country from appState)
			...localFormData.value, // form fields
			defaultShippingAddress: isDefaultShipping,
			defaultBillingAddress: isDefaultBilling,
		};
	});

	// Expose form API if requested
	if (formApi) {
		formApi.value = { getFormData$: getFormData$ };
	}

	return (
		<div>
			{/* Always show the form, don't depend on shippingAddress.countryCode */}
			{(
				<div class="grid grid-cols-2 gap-4">
					{/* Street Address */}
					<div>
						<input
							type="text"
							name="streetLine1"
							id="streetLine1"
							value={localFormData.value.streetLine1}
							autoComplete="street-address"
							placeholder={`Street address *`}
							class={getFieldClasses('streetLine1')}
							onInput$={(_, el) => handleInputChange$('streetLine1', el.value)}
							onBlur$={(_, el) => handleFieldBlur$('streetLine1', el.value)}
							required
							disabled={isReviewMode} // Corrected: Use isReviewMode directly
						/>
						{touchedFields.value.has('streetLine1') && validationErrors.value.streetLine1 && (
							<p class="mt-1 text-sm text-red-600">{validationErrors.value.streetLine1}</p>
						)}
					</div>

					{/* Apartment, suite, etc. */}
					<div>
						<input
							type="text"
							name="streetLine2"
							id="streetLine2"
							value={localFormData.value.streetLine2}
							placeholder={`Apt, building, etc.`}
							class={getFieldClasses('streetLine2')}
							onInput$={(_, el) => handleInputChange$('streetLine2', el.value)}
							disabled={isReviewMode} // Corrected: Use isReviewMode directly
						/>
					</div>

					{/* City */}
					<div>
						<input
							type="text"
							name="city"
							id="city"
							autoComplete="address-level2"
							value={localFormData.value.city}
							placeholder={`City *`}
							class={getFieldClasses('city')}
							onInput$={(_, el) => handleInputChange$('city', el.value)}
							onBlur$={(_, el) => handleFieldBlur$('city', el.value)}
							required
							disabled={isReviewMode} // Corrected: Use isReviewMode directly
						/>
						{touchedFields.value.has('city') && validationErrors.value.city && (
							<p class="mt-1 text-sm text-red-600">{validationErrors.value.city}</p>
						)}
					</div>

					{/* State/Province */}
					<div>
						<input
							type="text"
							name="province"
							id="province"
							value={localFormData.value.province}
							autoComplete="address-level1"
							placeholder={`State / Province *`}
							class={getFieldClasses('province')}
							onInput$={(_, el) => handleInputChange$('province', el.value)}
							onBlur$={(_, el) => handleFieldBlur$('province', el.value)}
							required
							disabled={isReviewMode} // Corrected: Use isReviewMode directly
						/>
						{touchedFields.value.has('province') && validationErrors.value.province && (
							<p class="mt-1 text-sm text-red-600">{validationErrors.value.province}</p>
						)}
					</div>

					{/* Postal Code */}
					<div>
						<input
							type="text"
							name="postalCode"
							id="postalCode"
							value={localFormData.value.postalCode}
							autoComplete="postal-code"
							placeholder={`Postal code *`}
							class={getFieldClasses('postalCode')}
							onInput$={(_, el) => handleInputChange$('postalCode', el.value)}
							onBlur$={(_, el) => handleFieldBlur$('postalCode', el.value)}
							required
							disabled={isReviewMode} // Corrected: Use isReviewMode directly
						/>
						{touchedFields.value.has('postalCode') && validationErrors.value.postalCode && (
							<p class="mt-1 text-sm text-red-600">{validationErrors.value.postalCode}</p>
						)}
					</div>

					{/* Country */}
					<div class="relative">
						<select
							id="countryCode"
							name="countryCode"
							autocomplete="country-name"
							class={getSelectClasses()}
							value={localCountryCode.value}
							onChange$={(_, el) => {
								// console.log(`📍 [AddressForm] Shipping country dropdown changed to: ${el.value}`);
								handleInputChange$('countryCode', el.value);
							}}
							key={`country-select-${localCountryCode.value}`}
							disabled={isReviewMode} // Corrected: Use isReviewMode directly
							required
							onMount$={() => {
								// console.log(`📍 [AddressForm] Shipping dropdown mounted with country: ${appState.shippingAddress.countryCode}`);
							}}
						>
							<option value="" disabled>{`Select a country`}</option>
							{appState.availableCountries.map((item) => (
								<option
									key={item.id}
									value={item.code}
									selected={item.code === localCountryCode.value}
								>
									{item.name}
								</option>
							))}
						</select>
						{/* Custom dropdown arrow */}
						<div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
							<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
							</svg>
						</div>
					</div>

					{/* Default Address Checkboxes removed - addresses are automatically set as default */}
				</div>
			)}
		</div>
	);
});
