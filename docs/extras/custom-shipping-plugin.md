# Custom Shipping Plugin

This plugin provides flexible shipping eligibility checking based on country and order total ranges.

## Features

- Restrict shipping methods to specific countries
- Option to exclude specific countries
- Set minimum and maximum order amounts for shipping methods
- Simple configuration through the admin UI

## Installation

1. Install the plugin package:
   ```bash
   npm install @rottenhand/vendure-plugin-shipping
   ```

2. Add the plugin to your Vendure configuration:
   ```typescript
   // vendure-config.ts
   import { CustomShippingPlugin } from '@rottenhand/vendure-plugin-shipping';

   export const config: VendureConfig = {
     // ... other config
     plugins: [
       CustomShippingPlugin,
       // ... other plugins
     ]
   };
   ```

## Usage

### Creating a Shipping Method

1. Go to the Vendure Admin UI
2. Navigate to Settings → Shipping Methods
3. Click "Create new shipping method"
4. Fill in the basic details (name, description, etc.)
5. Under "Eligibility Checker", select "Check by country and order total"
6. Configure the options:
   - **Countries**: Comma-separated list of ISO 3166-1 alpha-2 country codes (e.g., "US,CA,GB")
   - **Exclude selected countries**: When checked, the shipping method will be available for all countries EXCEPT the ones listed
   - **Minimum order amount**: Minimum order subtotal (in the store's currency) for this shipping method to be available
   - **Maximum order amount**: Maximum order subtotal (in the store's currency) for this shipping method to be available

### Example Configurations

**Domestic Shipping (US only, no minimum):**
- Countries: `US`
- Exclude selected countries: `No`
- Minimum order amount: (leave empty)
- Maximum order amount: (leave empty)

**International Shipping (exclude certain countries, with order limits):**
- Countries: `RU,CN,IN`
- Exclude selected countries: `Yes`
- Minimum order amount: `50.00`
- Maximum order amount: `1000.00`

## Implementation Details

The plugin works by implementing a custom `ShippingEligibilityChecker` that evaluates:
1. The customer's shipping address country against the configured country list
2. The order subtotal against the configured min/max amounts

### Technical Notes

- Country codes are case-insensitive and automatically converted to uppercase
- Order amounts are compared in the store's minor currency unit (e.g., cents for USD)
- When no countries are specified, the shipping method is available for all countries (unless excluded)
- When no min/max amounts are specified, those checks are skipped

## Troubleshooting

- **"Cannot find an argument value for the key 'minAmount'"**: Make sure to set a value for the minimum order amount (can be 0) in the shipping method configuration
- Shipping method not showing up: Verify that the order total and shipping address country match your configured rules

## Development

To modify the plugin:

1. Make your changes in the `src/plugins/custom-shipping` directory
2. Rebuild the plugin:
   ```bash
   cd src/plugins/custom-shipping
   npm run build
   ```
3. Restart your Vendure server to apply changes
