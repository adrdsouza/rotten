import { ShippingEligibilityChecker, LanguageCode } from '@vendure/core';

// Country input configuration
const countryInput = {
  type: 'string' as const,
  ui: {
    component: 'text-form-input',
  },
  label: [{ languageCode: LanguageCode.en, value: 'Countries' }],
  description: [{
    languageCode: LanguageCode.en,
    value: 'Enter comma-separated ISO 3166-1 alpha-2 country codes (e.g., US,PR,GB,DE)',
  }],
  validate: (value: any) => {
    if (!value) return true; // Allow empty
    if (typeof value !== 'string') return 'Must be a string';
    const codes = value.split(',').map(c => c.trim().toUpperCase());
    const isValid = codes.every(code => /^[A-Z]{2}$/.test(code));
    return isValid || 'Invalid country code format. Use comma-separated 2-letter codes (e.g., US,PR,GB)';
  },
};

export const customShippingEligibilityChecker = new ShippingEligibilityChecker({
  code: 'custom-shipping-eligibility',
  description: [
    { languageCode: LanguageCode.en, value: 'Check by country and order total' },
  ],
  args: {
    countries: countryInput,
    exclude: {
      type: 'boolean',
      defaultValue: false,
      label: [{ languageCode: LanguageCode.en, value: 'Exclude selected countries' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'If checked, the shipping method will be available for all countries EXCEPT the selected ones',
        },
      ],
    },
    minAmount: {
      type: 'float',
      required: false,
      label: [{ languageCode: LanguageCode.en, value: 'Minimum order amount' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Minimum order amount for this shipping method (leave empty for no minimum)' },
      ],
    },
    maxAmount: {
      type: 'float',
      required: false,
      label: [{ languageCode: LanguageCode.en, value: 'Maximum order amount' }],
      description: [
        { languageCode: LanguageCode.en, value: 'Maximum order amount for this shipping method (leave empty for no maximum)' },
      ],
    },
  },
  check: (ctx, order, args) => {
    const shippingAddress = order.shippingAddress;
    if (!shippingAddress?.countryCode) {
      return false;
    }

    // Check country inclusion/exclusion
    let countryCodes: string[] = [];
    if (args.countries && typeof args.countries === 'string') {
      countryCodes = args.countries
        .split(',')
        .map(code => code.trim().toUpperCase())
        .filter(Boolean);
    }
    const countryMatch = countryCodes.length > 0 
      ? countryCodes.includes(shippingAddress.countryCode.toUpperCase())
      : false;
    if (args.exclude ? countryMatch : !countryMatch) {
      return false;
    }

    // Check order total range (in minor units)
    const orderTotal = order.subTotalWithTax;
    if (args.minAmount != null && orderTotal < args.minAmount * 100) {
      return false;
    }
    if (args.maxAmount != null && orderTotal > args.maxAmount * 100) {
      return false;
    }

    return true;
  },
});

export default customShippingEligibilityChecker;
