const http = require('http');

// Test with a few different scenarios
const testCases = [
  {
    name: "Invalid coupon",
    query: `
    query {
      validateLocalCartCoupon(input: {
        couponCode: "INVALID"
        cartTotal: 1000
        cartItems: []
      }) {
        isValid
        validationErrors
        discountAmount
        freeShipping
        promotionName
        promotionDescription
      }
    }
    `
  },
  {
    name: "Valid coupon test",
    query: `
    query {
      validateLocalCartCoupon(input: {
        couponCode: "SAVE10"
        cartTotal: 5000
        cartItems: []
      }) {
        isValid
        validationErrors
        discountAmount
        discountPercentage
        freeShipping
        promotionName
        promotionDescription
      }
    }
    `
  }
];

// Test the first case (invalid coupon)
const query = testCases[0].query;

const postData = JSON.stringify({ query });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/shop-api/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing GraphQL query...');
console.log('Query:', query);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Could not parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
