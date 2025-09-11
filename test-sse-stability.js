// Comprehensive Test: SSE Connection Stability + Admin Endpoints
import { EventSource } from 'eventsource';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:10000'; // Updated for Render port
const TEST_LEAD_ID = 'test1';
const TEST_PHONE = '+16049085474';

console.log('🧪 SSE Connection Stability + Admin Endpoints Test');

// Test SSE Connection Stability
async function testSSEStability() {
  console.log('\n1️⃣ Testing SSE Connection Stability...');
  
  return new Promise((resolve) => {
    let connected = false;
    let messagesReceived = 0;
    let heartbeatsReceived = 0;
    const startTime = Date.now();
    
    const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent('(604) 908-5474')}`);
    
    const timeout = setTimeout(() => {
      eventSource.close();
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ Connection test completed after ${duration}ms`);
      console.log(`📊 Connection Stats:`);
      console.log(`   - Connected: ${connected}`);
      console.log(`   - Messages received: ${messagesReceived}`);
      console.log(`   - Heartbeats received: ${heartbeatsReceived}`);
      
      resolve({
        success: connected && messagesReceived > 0,
        connected,
        messagesReceived,
        heartbeatsReceived,
        duration,
        stayedConnected: heartbeatsReceived > 1
      });
    }, 30000); // Test for 30 seconds
    
    eventSource.onopen = () => {
      connected = true;
      console.log('✅ SSE connection opened successfully');
    };
    
    eventSource.onmessage = (event) => {
      messagesReceived++;
      const data = JSON.parse(event.data);
      
      console.log(`📨 Message ${messagesReceived}: ${data.type}`);
      
      if (data.type === 'heartbeat') {
        heartbeatsReceived++;
        console.log(`💓 Heartbeat ${heartbeatsReceived} received`);
      }
    };
    
    eventSource.onerror = (error) => {
      console.log(`❌ SSE connection error:`, error);
    };
  });
}

// Test Admin Endpoints
async function testAdminEndpoints() {
  console.log('\n2️⃣ Testing Admin Endpoints...');
  
  // Test database clear
  try {
    const clearResponse = await fetch(`${SERVER_URL}/api/admin/clear-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });
    
    if (clearResponse.ok) {
      console.log('✅ Database cleared successfully');
    } else {
      console.log('❌ Database clear failed');
    }
  } catch (error) {
    console.log('❌ Database clear error:', error.message);
  }
  
  // Test lead creation
  try {
    const leadResponse = await fetch(`${SERVER_URL}/api/admin/create-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        phoneNumber: '+1234567890',
        email: 'test@example.com',
        status: 'new',
        score: 75
      })
    });
    
    if (leadResponse.ok) {
      const result = await leadResponse.json();
      console.log('✅ Lead created:', result.lead.customerName);
    } else {
      console.log('❌ Lead creation failed');
    }
  } catch (error) {
    console.log('❌ Lead creation error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Tests...\n');
  
  const sseResult = await testSSEStability();
  await testAdminEndpoints();
  
  console.log('\n📊 Results:');
  console.log(`SSE Stability: ${sseResult.success ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (sseResult.success && sseResult.stayedConnected) {
    console.log('\n🎉 SUCCESS: SSE connections are now stable!');
  } else {
    console.log('\n⚠️ SSE connections still have issues');
  }
}

runTests(); 