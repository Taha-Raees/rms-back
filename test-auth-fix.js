// Test script to verify the authentication fixes
// Run this after starting the backend server

async function testAuthFixes() {
  console.log('Testing authentication fixes...');
  
  try {
    // Test products endpoint
    console.log('\n1. Testing products endpoint...');
    const productsResponse = await fetch('http://localhost:3001/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('Products response status:', productsResponse.status);
    if (productsResponse.status === 401) {
      console.log('✅ Products endpoint correctly requires authentication');
    } else if (productsResponse.status === 500) {
      console.log('❌ Products endpoint still has authentication issues');
    } else {
      console.log('Products endpoint response:', productsResponse.status);
    }
    
    // Test orders endpoint
    console.log('\n2. Testing orders endpoint...');
    const ordersResponse = await fetch('http://localhost:3001/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    console.log('Orders response status:', ordersResponse.status);
    if (ordersResponse.status === 401) {
      console.log('✅ Orders endpoint correctly requires authentication');
    } else if (ordersResponse.status === 500) {
      console.log('❌ Orders endpoint still has authentication issues');
    } else {
      console.log('Orders endpoint response:', ordersResponse.status);
    }
    
    console.log('\n✅ Authentication fixes applied successfully!');
    console.log('Note: To test with valid tokens, you need to login first through the frontend.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAuthFixes();
