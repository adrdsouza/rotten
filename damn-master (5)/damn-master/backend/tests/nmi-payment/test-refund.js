"use strict";
/**
 * This is a test script for the NMI payment refund functionality.
 * It can be used to test the refund functionality without having to go through the entire order process.
 *
 * To use this script:
 * 1. Replace the placeholders with actual values
 * 2. Run the script with ts-node: npx ts-node src/plugins/nmi-payment/test-refund.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
// Configuration
const config = {
    securityKey: 'YOUR_SECURITY_KEY', // Replace with your NMI security key
    testMode: true, // Set to false for production
    transactionId: 'ORIGINAL_TRANSACTION_ID', // Replace with the transaction ID to refund
    amount: '10.00', // Amount to refund in dollars
};
/**
 * Helper function to parse NMI response string into an object
 */
function parseNmiResponse(responseString) {
    const result = {};
    const pairs = responseString.split('&');
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        result[key] = decodeURIComponent(value || '');
    }
    return result;
}
/**
 * Test the NMI refund functionality
 */
async function testNmiRefund() {
    try {
        console.log('Testing NMI refund functionality...');
        console.log(`Transaction ID: ${config.transactionId}`);
        console.log(`Amount: ${config.amount}`);
        // Prepare the data for the NMI API
        const encodedParams = new url_1.URLSearchParams();
        encodedParams.set('type', 'refund'); // Refund transaction
        encodedParams.set('transactionid', config.transactionId); // Use the original transaction ID
        encodedParams.set('amount', config.amount); // Amount in dollars
        encodedParams.set('security_key', config.securityKey);
        // Add test mode if enabled
        if (config.testMode) {
            encodedParams.set('test_mode', '1');
        }
        const options = {
            method: 'POST',
            url: 'https://secure.nmi.com/api/transact.php',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            data: encodedParams,
        };
        // Make the API request to NMI
        console.log('Sending refund request to NMI...');
        const response = await axios_1.default.request(options);
        const responseData = parseNmiResponse(response.data);
        console.log('NMI refund response:');
        console.log(JSON.stringify(responseData, null, 2));
        if (responseData.response === '1') { // Approved
            console.log('Refund successful!');
            console.log(`Transaction ID: ${responseData.transactionid}`);
            console.log(`Response: ${responseData.responsetext}`);
        }
        else {
            console.log('Refund failed!');
            console.log(`Error: ${responseData.responsetext}`);
        }
    }
    catch (err) {
        console.error('Error processing NMI refund:');
        console.error(err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}
// Run the test
testNmiRefund().catch(err => {
    console.error('Unhandled error:', err);
});
