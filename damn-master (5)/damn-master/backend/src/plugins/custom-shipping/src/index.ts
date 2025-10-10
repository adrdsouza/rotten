import { VendurePlugin } from '@vendure/core';
import { customShippingEligibilityChecker } from './shipping-eligibility-checker.js';

export * from './shipping-eligibility-checker.js';

@VendurePlugin({
  compatibility: '^3.0.0',
  configuration: (config) => {
    // Add our custom shipping eligibility checker
    config.shippingOptions.shippingEligibilityCheckers = [
      ...(config.shippingOptions.shippingEligibilityCheckers || []),
      customShippingEligibilityChecker,
    ];
    
    return config;
  },
})
export class CustomShippingPlugin {}
