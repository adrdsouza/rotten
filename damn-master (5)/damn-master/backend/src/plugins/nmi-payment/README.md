# NMI Payment Integration for Vendure

This plugin integrates the NMI (Network Merchants Inc) payment gateway with Vendure.

## Setup

1. Add the plugin to your Vendure configuration:

```typescript
import { NmiPaymentPlugin } from './plugins/nmi-payment';

// In your VendureConfig
plugins: [
    // ... other plugins
    NmiPaymentPlugin,
]
```

2. Create a payment method in the Vendure Admin UI:
   - Go to Settings > Payment Methods
   - Click "Create new payment method"
   - Select "NMI Payment Gateway" as the handler
   - Enter your NMI API Key and Security Key
   - Set Test Mode to true for testing

## Client-Side Integration

For the client-side integration, you'll need to implement a form that collects payment information and tokenizes it using NMI's Collect.js library. Here's an example of how to implement this in your storefront:

```html
<!-- Include NMI's Collect.js library -->
<script src="https://secure.nmi.com/js/collect.js"></script>

<form id="payment-form">
  <div>
    <label for="card-number">Card Number</label>
    <div id="card-number"></div>
  </div>

  <div>
    <label for="card-expiry">Expiry Date</label>
    <div id="card-expiry"></div>
  </div>

  <div>
    <label for="card-cvv">CVV</label>
    <div id="card-cvv"></div>
  </div>

  <button type="submit">Pay Now</button>
</form>

<script>
  // Initialize Collect.js with your public key
  const collectJS = new CollectJS({
    paymentSelector: '#payment-form',
    variant: 'inline',
    fields: {
      ccnumber: {
        selector: '#card-number',
        placeholder: '•••• •••• •••• ••••'
      },
      ccexp: {
        selector: '#card-expiry',
        placeholder: 'MM / YY'
      },
      cvv: {
        selector: '#card-cvv',
        placeholder: '•••'
      }
    },
    styleSniffer: true,
    callback: function(response) {
      // This function is called when the tokenization is complete
      if (response.token) {
        // Send the token to your server
        submitPaymentToVendure(response.token);
      }
    }
  });

  // Function to submit the payment to Vendure
  function submitPaymentToVendure(token) {
    // Use your GraphQL client to call the addPaymentToOrder mutation
    const mutation = `
      mutation AddPaymentToOrder($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
          ... on Order {
            id
            state
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        method: "nmi-payment",
        metadata: {
          token: token,
          // You can include additional metadata like cardholder name, etc.
        }
      }
    };

    // Execute the mutation with your GraphQL client
    // graphQLClient.mutate({ mutation, variables })
    //   .then(result => {
    //     // Handle the result
    //   });
  }
</script>
```

## Refund Functionality

This plugin now supports refunding payments processed through NMI. The refund functionality allows you to:

1. Process full or partial refunds for completed orders
2. Track refund status and transaction IDs
3. Handle refund failures gracefully

### Processing Refunds

To process a refund:

1. In the Vendure Admin UI, navigate to the order you want to refund
2. Click on the "Refund" button
3. Enter the amount to refund
4. Submit the refund

The refund will be processed through the NMI gateway and the result will be displayed in the Vendure Admin UI.

### Testing Refunds

A test script is included to help verify the refund functionality:

1. Open `test-refund.ts` in the plugin directory
2. Replace the placeholder values with your actual NMI credentials and transaction details
3. Run the script with `npx ts-node src/plugins/nmi-payment/test-refund.ts`

## Testing

For testing, you can use NMI's test cards:

- Visa: 4111111111111111
- MasterCard: 5431111111111111
- Discover: 6011601160116611
- American Express: 341111111111111

Use any future expiration date and any 3-4 digit CVV code.

## Production Considerations

Before going to production:

1. Set Test Mode to false in your payment method configuration
2. Ensure your server has proper security measures in place
3. Consider implementing additional fraud prevention measures
4. Test the full payment flow thoroughly

## Support

For issues with this plugin, please open an issue on the repository.
For issues with NMI's services, contact NMI support directly.
