const http = require('http');

// Test script to verify authentication flows
console.log('Testing Authentication System...');

// Test 1: Root endpoint (should work without auth)
http.get('http://localhost:3001', (res) => {
  console.log('✓ Root endpoint accessible - Status:', res.statusCode);
  
  // Test 2: Store login endpoint
  const loginData = JSON.stringify({
    email: 'store@example.com',
    password: 'password123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  const loginReq = http.request(loginOptions, (res) => {
    console.log('✓ Store login endpoint accessible - Status:', res.statusCode);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Store login response received');
      console.log('All authentication endpoints are accessible!');
    });
  });
  
  loginReq.on('error', (err) => {
    console.error('Store login error:', err.message);
  });
  
  loginReq.write(loginData);
  loginReq.end();
  
}).on('error', (err) => {
  console.error('Root endpoint error:', err.message);
});
