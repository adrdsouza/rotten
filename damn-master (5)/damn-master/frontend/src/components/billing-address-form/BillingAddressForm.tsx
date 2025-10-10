import { component$, useContext, $, useSignal, type QRL, useVisibleTask$ } from '@builder.io/qwik';
import { APP_STATE } from '~/constants';
import type { BillingAddress } from '~/types';
import { 
  validateAddress, 
  validateName, 
  validatePostalCode, 
  validateStateProvince, 
  clearFieldValidationCache,
  clearCountryValidationCache
} from '~/utils/cached-validation';
import { getBillingFieldType } from '~/utils/field-type-helpers';
import type { ValidationResult } from '~/utils/validation';

interface BillingAddressFormProps {
  billingAddress: BillingAddress;
  onUserInteraction$?: QRL<() => void>; // Callback for when user starts interacting
}

// Helper type for validation errors
type ValidationErrors = {
  [key: string]: string;
};

const BillingAddressForm = component$<BillingAddressFormProps>(({ billingAddress, onUserInteraction$ }) => {
  const appState = useContext(APP_STATE);
  
  // Add validation state
  const validationErrors = useSignal<ValidationErrors>({});
  const touchedFields = useSignal<Set<string>>(new Set());
  const validationTimer = useSignal<ReturnType<typeof setTimeout> | null>(null);
   // Track if user has interacted with form
  const hasUserInteracted = useSignal(false);

  // Load billing address from sessionStorage on component initialization (both guest and authenticated users)
  useVisibleTask$(() => {
    if (typeof sessionStorage !== 'undefined') {
      const storedGuestBilling = sessionStorage.getItem('guestBillingAddress');
      if (storedGuestBilling) {
        try {
          const guestData = JSON.parse(storedGuestBilling);
          // Always load data - UX trumps staleness concerns (for both guest and authenticated users)
          if (guestData) {
            // console.log('🔄 BillingAddressForm: Loading billing address from sessionStorage');
            appState.billingAddress = {
              firstName: guestData.firstName || '',
              lastName: guestData.lastName || '',
              streetLine1: guestData.streetLine1 || '',
              streetLine2: guestData.streetLine2 || '',
              city: guestData.city || '',
              province: guestData.province || '',
              postalCode: guestData.postalCode || '',
              countryCode: guestData.countryCode || ''
            };
            // console.log('[BillingAddressForm] Restored guest billing address from sessionStorage');
          }
        } catch (error) {
          console.warn('[BillingAddressForm] Failed to parse guest billing address from sessionStorage:', error);
        }
      }
    }
  });

  // Handle field blur events
  const handleFieldBlur$ = $((fieldName: string, value: string) => {
    // console.log(`[BillingAddressForm] Field blur-sm: ${fieldName}, value: ${value}`);

    // Mark field as touched
    touchedFields.value = new Set([...touchedFields.value, fieldName]);
    // console.log(`[BillingAddressForm] Touched fields: ${Array.from(touchedFields.value).join(', ')}`);

    // Validate the field immediately - use current appState for most up-to-date country
    const safeCountryCode = appState.billingAddress?.countryCode || billingAddress?.countryCode || 'US';
    // console.log(`[BillingAddressForm] Using country code for blur-sm validation: ${safeCountryCode}`);
    const currentErrors = {...validationErrors.value};
    let result: ValidationResult;
    
    // Ensure value is a string
    const safeValue = value ?? '';

    switch (fieldName) {
      case 'firstName':
        result = validateName(safeValue, 'First name');
        if (!result.isValid) {
          currentErrors.firstName = result.message ?? 'Invalid first name';
        } else {
          currentErrors.firstName = '';
        }
        break;
        
      case 'lastName':
        result = validateName(safeValue, 'Last name');
        if (!result.isValid) {
          currentErrors.lastName = result.message ?? 'Invalid last name';
        } else {
          currentErrors.lastName = '';
        }
        break;
        
      case 'streetLine1':
        result = validateAddress(safeValue, 'Street address');
        if (!result.isValid) {
          currentErrors.streetLine1 = result.message ?? 'Invalid address';
        } else {
          currentErrors.streetLine1 = '';
        }
        break;
        
      case 'city':
        result = validateName(safeValue, 'City');
        if (!result.isValid) {
          currentErrors.city = result.message ?? 'Invalid city';
        } else {
          currentErrors.city = '';
        }
        break;
        
      case 'province':
        result = validateStateProvince(safeValue, safeCountryCode, 'State/Province');
        if (!result.isValid) {
          currentErrors.province = result.message ?? 'State/Province is required';
        } else {
          currentErrors.province = '';
        }
        break;
        
      case 'postalCode':
        result = validatePostalCode(safeValue, safeCountryCode);
        // console.log(`[BillingAddressForm] BLUR Postal code validation for '${safeValue}' (${safeCountryCode}):`, result);
        if (!result.isValid) {
          currentErrors.postalCode = result.message ?? 'Invalid postal code';
        } else {
          currentErrors.postalCode = '';
        }
        break;
    }
    
    // Update validation errors
    validationErrors.value = currentErrors;
    
    // Trigger complete form validation (debounced to 300ms for consistency)
    if (validationTimer.value) {
      clearTimeout(validationTimer.value);
    }
    validationTimer.value = setTimeout(() => {
      // Run complete form validation
      const firstName = appState.billingAddress?.firstName ?? '';
      const lastName = appState.billingAddress?.lastName ?? '';
      const streetLine1 = appState.billingAddress?.streetLine1 ?? '';
      const city = appState.billingAddress?.city ?? '';
      const province = appState.billingAddress?.province ?? '';
      const postalCode = appState.billingAddress?.postalCode ?? '';
      const countryCode = appState.billingAddress?.countryCode ?? 'US';
      
      const firstNameResult = validateName(firstName, 'First name');
      const lastNameResult = validateName(lastName, 'Last name');
      const streetResult = validateAddress(streetLine1, 'Street address');
      const cityResult = validateName(city, 'City');
      const provinceResult = validateStateProvince(province, countryCode, 'State/Province');
      const postalResult = validatePostalCode(postalCode, countryCode);
      
      const errors = {...validationErrors.value};
      
      if (!firstNameResult.isValid) errors.firstName = firstNameResult.message ?? 'Invalid first name';
      else errors.firstName = '';
      
      if (!lastNameResult.isValid) errors.lastName = lastNameResult.message ?? 'Invalid last name';
      else errors.lastName = '';
      
      if (!streetResult.isValid) errors.streetLine1 = streetResult.message ?? 'Invalid address';
      else errors.streetLine1 = '';
      
      if (!cityResult.isValid) errors.city = cityResult.message ?? 'Invalid city';
      else errors.city = '';
      
      if (!provinceResult.isValid) errors.province = provinceResult.message ?? 'State/Province is required';
      else errors.province = '';
      
      if (!postalResult.isValid) errors.postalCode = postalResult.message ?? 'Invalid postal code';
      else errors.postalCode = '';
      
      validationErrors.value = errors;
      // console.log(`[BillingAddressForm] Validation errors after blur-sm: `, validationErrors.value);
    }, 300);
  });

  // Individual field validation
  const validateField$ = $((fieldName: string, value: string, countryCode?: string) => {
    // Ensure countryCode is a string, using appState first, then billingAddress, then fallback
    const safeCountryCode = countryCode ?? appState.billingAddress?.countryCode ?? billingAddress.countryCode ?? 'US';
    // console.log(`[BillingAddressForm] validateField$ using country code: ${safeCountryCode}`);
    const currentErrors = {...validationErrors.value};
    let result: ValidationResult;
    
    // Ensure value is a string
    const safeValue = value ?? '';

    switch (fieldName) {
      case 'firstName':
        result = validateName(safeValue, 'First name');
        if (!result.isValid) {
          currentErrors.firstName = result.message ?? 'Invalid first name';
        } else {
          currentErrors.firstName = '';
        }
        break;
        
      case 'lastName':
        result = validateName(safeValue, 'Last name');
        if (!result.isValid) {
          currentErrors.lastName = result.message ?? 'Invalid last name';
        } else {
          currentErrors.lastName = '';
        }
        break;
        
      case 'streetLine1':
        result = validateAddress(safeValue, 'Street address');
        if (!result.isValid) {
          currentErrors.streetLine1 = result.message ?? 'Invalid address';
        } else {
          currentErrors.streetLine1 = '';
        }
        break;
        
      case 'city':
        result = validateName(safeValue, 'City');
        if (!result.isValid) {
          currentErrors.city = result.message ?? 'Invalid city';
        } else {
          currentErrors.city = '';
        }
        break;
        
      case 'province':
        result = validateStateProvince(safeValue, safeCountryCode, 'State/Province');
        if (!result.isValid) {
          currentErrors.province = result.message ?? 'State/Province is required';
        } else {
          currentErrors.province = '';
        }
        break;
        
      case 'postalCode':
        result = validatePostalCode(safeValue, safeCountryCode);
        // console.log(`[BillingAddressForm] Postal code validation for '${safeValue}' (${safeCountryCode}):`, result);
        if (!result.isValid) {
          currentErrors.postalCode = result.message ?? 'Invalid postal code';
        } else {
          currentErrors.postalCode = '';
        }
        break;
    }
    
    // Only update if errors actually changed
    if (JSON.stringify(validationErrors.value) !== JSON.stringify(currentErrors)) {
      validationErrors.value = currentErrors;
    }
  });

  // Complete form validation
  const validateForm$ = $(() => {
    // Ensure all values are strings, prioritizing appState over props
    const firstName = appState.billingAddress?.firstName ?? billingAddress?.firstName ?? '';
    const lastName = appState.billingAddress?.lastName ?? billingAddress?.lastName ?? '';
    const streetLine1 = appState.billingAddress?.streetLine1 ?? billingAddress?.streetLine1 ?? '';
    const city = appState.billingAddress?.city ?? billingAddress?.city ?? '';
    const province = appState.billingAddress?.province ?? billingAddress?.province ?? '';
    const postalCode = appState.billingAddress?.postalCode ?? billingAddress?.postalCode ?? '';
    const countryCode = appState.billingAddress?.countryCode ?? billingAddress?.countryCode ?? 'US';
    
    const firstNameResult = validateName(firstName, 'First name');
    const lastNameResult = validateName(lastName, 'Last name');
    const streetResult = validateAddress(streetLine1, 'Street address');
    const cityResult = validateName(city, 'City');
    const provinceResult = validateStateProvince(province, countryCode, 'State/Province');
    const postalResult = validatePostalCode(postalCode, countryCode);
    
    const errors = {...validationErrors.value};
    
    if (!firstNameResult.isValid) errors.firstName = firstNameResult.message ?? 'Invalid first name';
    else errors.firstName = '';
    
    if (!lastNameResult.isValid) errors.lastName = lastNameResult.message ?? 'Invalid last name';
    else errors.lastName = '';
    
    if (!streetResult.isValid) errors.streetLine1 = streetResult.message ?? 'Invalid address';
    else errors.streetLine1 = '';
    
    if (!cityResult.isValid) errors.city = cityResult.message ?? 'Invalid city';
    else errors.city = '';
    
    if (!provinceResult.isValid) errors.province = provinceResult.message ?? 'State/Province is required';
    else errors.province = '';
    
    if (!postalResult.isValid) errors.postalCode = postalResult.message ?? 'Invalid postal code';
    else errors.postalCode = '';
    
    validationErrors.value = errors;
    
    // console.log('[BillingAddressForm] validateForm$ results:', errors);
    return Object.keys(errors).length === 0;
  });
  
  const handleInputChange$ = $((field: string, value: string) => {
    // console.log(`[BillingAddressForm] Input change: ${field}, value: ${value}`);
    
    // Clear validation cache for the field being changed
    if (field === 'countryCode') {
      // Clear country-specific caches when country changes
      const oldCountry = appState.billingAddress?.countryCode;
      clearCountryValidationCache(oldCountry, value);
    } else {
      // Clear cache for specific field
      clearFieldValidationCache(field, getBillingFieldType(field));
    }
    
    // Notify parent component on first user interaction
    if (!hasUserInteracted.value && onUserInteraction$) {
      hasUserInteracted.value = true;
      onUserInteraction$();
    }
    
    // Initialize with default empty values if not already set
    if (!appState.billingAddress) {
      appState.billingAddress = {
        firstName: '',
        lastName: '',
        streetLine1: '',
        streetLine2: '',
        city: '',
        province: '',
        postalCode: '',
        countryCode: 'US'
      };
    }
    
    appState.billingAddress = {
      ...appState.billingAddress,
      [field]: value
    };

    // Save billing address to sessionStorage for persistence across page refreshes
    // This ensures both guest and authenticated users don't lose their billing address data on payment failure
    if (typeof sessionStorage !== 'undefined' && appState.billingAddress) {
      try {
        const guestBillingData = {
          firstName: appState.billingAddress.firstName || '',
          lastName: appState.billingAddress.lastName || '',
          streetLine1: appState.billingAddress.streetLine1 || '',
          streetLine2: appState.billingAddress.streetLine2 || '',
          city: appState.billingAddress.city || '',
          province: appState.billingAddress.province || '',
          postalCode: appState.billingAddress.postalCode || '',
          countryCode: appState.billingAddress.countryCode || '',
          lastUpdated: Date.now()
        };
        sessionStorage.setItem('guestBillingAddress', JSON.stringify(guestBillingData));
        // console.log('[BillingAddressForm] Saved billing address to sessionStorage (guest and authenticated)');
      } catch (error) {
        console.warn('[BillingAddressForm] Failed to save guest billing address to sessionStorage:', error);
      }
    }
    
    // If the field has been touched, validate on change
    if (touchedFields.value.has(field)) {
      // Ensure countryCode is a string, using appState first, then billingAddress, then fallback
      const countryCode = appState.billingAddress?.countryCode ?? billingAddress?.countryCode ?? 'US';
      validateField$(field, value, countryCode);
      
      // Debounced validation (standardized to 300ms)
      if (validationTimer.value) {
        clearTimeout(validationTimer.value);
      }
      validationTimer.value = setTimeout(() => {
        validateForm$();
        // console.log(`[BillingAddressForm] Validation errors after input: `, validationErrors.value);
      }, 300);
    }
  });
  
  // CSS classes for form fields
  const getFieldClasses = (fieldName: string) => {
    const hasError = touchedFields.value.has(fieldName) && validationErrors.value[fieldName] && validationErrors.value[fieldName].length > 0;
    const baseClasses = "block w-full p-2 rounded-md border focus:outline-hidden transition-colors duration-200 bg-white";
    const errorClasses = hasError 
      ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
      : "border-gray-300 focus:border-primary-500 focus:ring-primary-500";
    return `${baseClasses} ${errorClasses}`;
  };
  
  // Debug validation status
  // console.log(`[BillingAddressForm] Current validation errors:`, validationErrors.value);
  // console.log(`[BillingAddressForm] Touched fields:`, Array.from(touchedFields.value));
  
  const getSelectClasses = () => {
    return "block w-full p-2 rounded-md border focus:outline-hidden border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors duration-200 bg-white appearance-none";
  };

  return (
    <div class="grid grid-cols-2 gap-4">
      {/* First Name and Last Name (2 fields on 1 line) */}
      <div>
        <input
          type="text"
          name="firstName"
          id="billingFirstName"
          placeholder="First name *"
          value={billingAddress?.firstName ?? ''}
          onInput$={(_, el) => handleInputChange$('firstName', el.value)}
          onBlur$={(_, el) => handleFieldBlur$('firstName', el.value)}
          class={getFieldClasses('firstName')}
          required
        />
        {touchedFields.value.has('firstName') && validationErrors.value.firstName && (
          <p class="mt-1 text-sm text-red-600">{validationErrors.value.firstName}</p>
        )}
      </div>

      <div>
        <input
          type="text"
          name="lastName"
          id="billingLastName"
          placeholder="Last name *"
          value={billingAddress?.lastName ?? ''}
          onInput$={(_, el) => handleInputChange$('lastName', el.value)}
          onBlur$={(_, el) => handleFieldBlur$('lastName', el.value)}
          class={getFieldClasses('lastName')}
          required
        />
        {touchedFields.value.has('lastName') && validationErrors.value.lastName && (
          <p class="mt-1 text-sm text-red-600">{validationErrors.value.lastName}</p>
        )}
      </div>

      {/* Street Address and Address Line 2 (on same line) */}
      <div>
        <input
          type="text"
          name="streetLine1"
          id="billingStreetLine1"
          placeholder="Street address *"
          value={billingAddress?.streetLine1 ?? ''}
          onInput$={(_, el) => handleInputChange$('streetLine1', el.value)}
          onBlur$={(_, el) => handleFieldBlur$('streetLine1', el.value)}
          class={getFieldClasses('streetLine1')}
          required
        />
        {touchedFields.value.has('streetLine1') && validationErrors.value.streetLine1 && (
          <p class="mt-1 text-sm text-red-600">{validationErrors.value.streetLine1}</p>
        )}
      </div>

      <div>
        <input
          type="text"
          name="streetLine2"
          id="billingStreetLine2"
          placeholder="Apt, building, etc."
          value={billingAddress?.streetLine2 ?? ''}
          onInput$={(_, el) => handleInputChange$('streetLine2', el.value)}
          class={getFieldClasses('streetLine2')}
        />
      </div>

      {/* City */}
      <div>
        <input
          type="text"
          name="city"
          id="billingCity"
          placeholder="City *"
          value={billingAddress?.city ?? ''}
          onInput$={(_, el) => handleInputChange$('city', el.value)}
          onBlur$={(_, el) => handleFieldBlur$('city', el.value)}
          class={getFieldClasses('city')}
          required
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
          id="billingProvince"
          placeholder="State / Province *"
          value={billingAddress?.province ?? ''}
          onInput$={(_, el) => handleInputChange$('province', el.value)}
          onBlur$={(_, el) => handleFieldBlur$('province', el.value)}
          class={getFieldClasses('province')}
          required
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
          id="billingPostalCode"
          placeholder="Postal code *"
          value={billingAddress?.postalCode ?? ''}
          onInput$={(_, el) => handleInputChange$('postalCode', el.value)}
          onBlur$={(_, el) => handleFieldBlur$('postalCode', el.value)}
          class={getFieldClasses('postalCode')}
          required
        />
        {touchedFields.value.has('postalCode') && validationErrors.value.postalCode && (
          <p class="mt-1 text-sm text-red-600">{validationErrors.value.postalCode}</p>
        )}
      </div>

      {/* Country */}
      <div class="relative">
        <select
          id="billingCountryCode"
          name="countryCode"
          value={billingAddress?.countryCode || appState.billingAddress?.countryCode || appState.shippingAddress?.countryCode || 'US'}
          onChange$={(_, el) => {
            // console.log(`📍 [BillingAddressForm] Billing country dropdown changed to: ${el.value}`);
            handleInputChange$('countryCode', el.value);
          }}
          class={getSelectClasses()}
          required
          onMount$={() => {
            // console.log(`📍 [BillingAddressForm] Billing dropdown mounted`);
          }}
        >
          <option value="" disabled>Select a country</option>
          {(appState.availableCountries && appState.availableCountries.length > 0) ? 
            appState.availableCountries.map((country) => {
              const currentCountryCode = billingAddress?.countryCode || appState.billingAddress?.countryCode || appState.shippingAddress?.countryCode || 'US';
              return (
                <option 
                  key={country.code} 
                  value={country.code}
                  selected={country.code === currentCountryCode}
                >
                  {country.name}
                </option>
              );
            }) : 
            <option value="US" selected={true}>United States</option>
          }
        </select>
        {/* Custom dropdown arrow */}
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        {touchedFields.value.has('countryCode') && validationErrors.value.countryCode && (
          <p class="mt-1 text-sm text-red-600">{validationErrors.value.countryCode}</p>
        )}
      </div>
    </div>
  );
});

export default BillingAddressForm;
