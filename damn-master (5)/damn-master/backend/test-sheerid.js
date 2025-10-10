const { spawn } = require('child_process');

// Test the backend service directly
console.log('Testing SheerID backend service...');

// Check if the backend is running and accessible
const testBackend = spawn('curl', [
  '-X', 'GET',
  'http://localhost:3000/health',
  '-w', '\nHTTP Status: %{http_code}\n',
  '-s'
]);

testBackend.stdout.on('data', (data) => {
  console.log('Backend health check:', data.toString());
});

testBackend.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

testBackend.on('close', (code) => {
  console.log(`Health check completed with code: ${code}`);
  
  // Test SheerID webhook endpoint
  console.log('\nTesting SheerID webhook endpoint...');
  const testWebhook = spawn('curl', [
    '-X', 'POST',
    'http://localhost:3000/shop-api/sheerid/webhook/military',
    '-H', 'Content-Type: application/json',
    '-H', 'x-sheerid-signature: test-signature',
    '-d', '{"verificationId": "test-123"}',
    '-w', '\nHTTP Status: %{http_code}\n',
    '-s'
  ]);
  
  testWebhook.stdout.on('data', (data) => {
    console.log('Webhook response:', data.toString());
  });
  
  testWebhook.stderr.on('data', (data) => {
    console.error('Webhook error:', data.toString());
  });
  
  testWebhook.on('close', (code) => {
    console.log(`Webhook test completed with code: ${code}`);
  });
});
