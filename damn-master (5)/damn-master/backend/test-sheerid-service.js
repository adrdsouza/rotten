const https = require('https');

// Test SheerID OAuth token endpoint
console.log('Testing SheerID OAuth token endpoint...');

const tokenData = `grant_type=client_credentials&client_id=${process.env.SHEERID_CLIENT_ID}&client_secret=${process.env.SHEERID_CLIENT_SECRET}`;

const tokenOptions = {
  hostname: 'services.sheerid.com',
  port: 443,
  path: '/rest/v2/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(tokenData)
  }
};

const tokenReq = https.request(tokenOptions, (res) => {
  console.log(`Token endpoint status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Token response:', data);
    
    try {
      const tokenResponse = JSON.parse(data);
      if (tokenResponse.access_token) {
        console.log('✅ Successfully obtained access token');
        
        // Test verification details endpoint
        console.log('\nTesting verification details endpoint...');
        
        const verifyOptions = {
          hostname: 'services.sheerid.com',
          port: 443,
          path: '/rest/v2/verification/test-verification-id/details',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json'
          }
        };
        
        const verifyReq = https.request(verifyOptions, (verifyRes) => {
          console.log(`Verification endpoint status: ${verifyRes.statusCode}`);
          
          let verifyData = '';
          verifyRes.on('data', (chunk) => {
            verifyData += chunk;
          });
          
          verifyRes.on('end', () => {
            console.log('Verification response:', verifyData);
          });
        });
        
        verifyReq.on('error', (e) => {
          console.error('Verification request error:', e);
        });
        
        verifyReq.end();
        
      } else {
        console.log('❌ Failed to get access token');
      }
    } catch (e) {
      console.error('Failed to parse token response:', e);
    }
  });
});

tokenReq.on('error', (e) => {
  console.error('Token request error:', e);
});

tokenReq.write(tokenData);
tokenReq.end();
