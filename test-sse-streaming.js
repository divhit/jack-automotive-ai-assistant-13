// Comprehensive SSE Streaming Test
import { EventSource } from 'eventsource';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const TEST_LEAD_ID = 'lead_001';
const TEST_PHONE = '+1234567890';

console.log('🧪 SSE Streaming Test');
console.log('====================\n');

// Test 1: Check server health and SSE connections
async function testServerHealth() {
  console.log('1️⃣ Testing Server Health...');
  
  try {
    const response = await fetch(`${SERVER_URL}/health`);
    const health = await response.json();
    
    console.log('✅ Server Health:', health);
    console.log(`   Active SSE Connections: ${health.activeSseConnections}`);
    console.log(`   Active WS Conversations: ${health.activeWsConversations}`);
    
    return health.status === 'healthy';
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

// Test 2: Test SSE connection establishment
async function testSSEConnection() {
  console.log('\n2️⃣ Testing SSE Connection...');
  
  return new Promise((resolve) => {
    let connected = false;
    let messagesReceived = 0;
    const receivedMessages = [];
    
    console.log(`📡 Connecting to: ${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}`);
    
    const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}`);
    
    const timeout = setTimeout(() => {
      eventSource.close();
      if (!connected) {
        console.log('❌ SSE connection timeout - no connection established');
        resolve({ success: false, error: 'Connection timeout' });
      }
    }, 10000);
    
    eventSource.onopen = () => {
      connected = true;
      console.log('✅ SSE connection established successfully');
    };
    
    eventSource.onmessage = (event) => {
      messagesReceived++;
      const data = JSON.parse(event.data);
      receivedMessages.push(data);
      
      console.log(`📨 Message ${messagesReceived}:`, data);
      
      if (data.type === 'connected') {
        console.log('✅ Received connection confirmation');
      }
      
      // Close after receiving a few messages or after connected message
      if (messagesReceived >= 3 || data.type === 'connected') {
        clearTimeout(timeout);
        eventSource.close();
        
        console.log(`✅ SSE test completed - received ${messagesReceived} messages`);
        resolve({ 
          success: true, 
          messagesReceived, 
          messages: receivedMessages 
        });
      }
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ SSE connection error:', error);
      clearTimeout(timeout);
      eventSource.close();
      resolve({ 
        success: false, 
        error: 'Connection error',
        messagesReceived,
        messages: receivedMessages
      });
    };
    
    // Send a test message after connection to trigger events
    setTimeout(async () => {
      if (connected) {
        console.log('📤 Sending test SMS to trigger SSE events...');
        await sendTestSMS();
      }
    }, 2000);
  });
}

// Test 3: Send test SMS and verify SSE receives it
async function sendTestSMS() {
  try {
    const smsPayload = new URLSearchParams({
      From: TEST_PHONE,
      Body: 'Test message for SSE streaming',
      MessageSid: 'sse-test-' + Date.now()
    });
    
    const response = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: smsPayload
    });
    
    if (response.status === 200) {
      console.log('✅ Test SMS sent successfully');
      return true;
    } else {
      console.log('❌ Test SMS failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Error sending test SMS:', error.message);
    return false;
  }
}

// Test 4: Test voice call initiation and SSE events
async function testVoiceCallSSE() {
  console.log('\n3️⃣ Testing Voice Call SSE Events...');
  
  return new Promise(async (resolve) => {
    const receivedEvents = [];
    let eventSource;
    
    try {
      // First establish SSE connection
      eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}`);
      
      const timeout = setTimeout(() => {
        if (eventSource) eventSource.close();
        resolve({ success: false, error: 'Timeout waiting for events' });
      }, 15000);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        receivedEvents.push(data);
        
        console.log('📨 Voice SSE Event:', data.type, data.leadId || 'no-leadId');
        
        // Look for voice-related events
        if (['call_initiated', 'voice_received', 'voice_sent'].includes(data.type)) {
          clearTimeout(timeout);
          eventSource.close();
          
          console.log('✅ Voice SSE events working');
          resolve({ success: true, events: receivedEvents });
        }
      };
      
      eventSource.onerror = (error) => {
        console.log('❌ Voice SSE error:', error);
        clearTimeout(timeout);
        eventSource.close();
        resolve({ success: false, error: 'Connection error' });
      };
      
      // Wait for connection then initiate call
      setTimeout(async () => {
        console.log('📞 Initiating test voice call...');
        
        const callResponse = await fetch(`${SERVER_URL}/api/elevenlabs/outbound-call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: TEST_PHONE,
            leadId: TEST_LEAD_ID
          })
        });
        
        const callResult = await callResponse.json();
        console.log('📞 Call result:', callResult.success ? 'Success' : callResult.error);
      }, 2000);
      
    } catch (error) {
      console.log('❌ Voice call SSE test error:', error.message);
      if (eventSource) eventSource.close();
      resolve({ success: false, error: error.message });
    }
  });
}

// Test 5: Test multiple simultaneous SSE connections
async function testMultipleConnections() {
  console.log('\n4️⃣ Testing Multiple SSE Connections...');
  
  const connections = [];
  const testLeads = ['lead_001', 'lead_002', 'lead_003'];
  
  try {
    // Create multiple connections
    for (const leadId of testLeads) {
      const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${leadId}`);
      connections.push({ leadId, eventSource, messagesReceived: 0 });
      
      eventSource.onmessage = (event) => {
        const connection = connections.find(c => c.leadId === leadId);
        if (connection) {
          connection.messagesReceived++;
          console.log(`📨 Lead ${leadId}: ${JSON.parse(event.data).type}`);
        }
      };
    }
    
    console.log(`✅ Created ${connections.length} SSE connections`);
    
    // Wait a moment then check server health
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const health = await fetch(`${SERVER_URL}/health`).then(r => r.json());
    console.log(`📊 Server reports ${health.activeSseConnections} active connections`);
    
    // Close all connections
    connections.forEach(({ eventSource }) => eventSource.close());
    
    // Check health again
    await new Promise(resolve => setTimeout(resolve, 1000));
    const healthAfter = await fetch(`${SERVER_URL}/health`).then(r => r.json());
    console.log(`📊 After cleanup: ${healthAfter.activeSseConnections} active connections`);
    
    return {
      success: true,
      connectionsCreated: connections.length,
      serverReportedConnections: health.activeSseConnections,
      cleanupSuccessful: healthAfter.activeSseConnections === 0
    };
    
  } catch (error) {
    console.log('❌ Multiple connections test error:', error.message);
    // Cleanup
    connections.forEach(({ eventSource }) => eventSource.close());
    return { success: false, error: error.message };
  }
}

// Test 6: Test CORS and cross-origin issues
async function testCORSIssues() {
  console.log('\n5️⃣ Testing CORS Issues...');
  
  try {
    // Test if SSE endpoint is accessible from different origins
    const response = await fetch(`${SERVER_URL}/api/stream/conversation/test-cors`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:8080',
        'Accept': 'text/event-stream'
      }
    });
    
    console.log('📡 CORS test response status:', response.status);
    console.log('📡 CORS headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Content-Type': response.headers.get('Content-Type')
    });
    
    if (response.status === 200) {
      console.log('✅ CORS configuration appears correct');
      return { success: true, corsEnabled: true };
    } else {
      console.log('❌ CORS test failed');
      return { success: false, corsEnabled: false };
    }
    
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runSSETests() {
  console.log('🚀 Starting SSE Streaming Tests...\n');
  
  const results = {
    serverHealth: false,
    sseConnection: false,
    voiceCallSSE: false,
    multipleConnections: false,
    corsTest: false
  };
  
  try {
    // Test 1: Server Health
    results.serverHealth = await testServerHealth();
    
    if (!results.serverHealth) {
      console.log('\n❌ Server not healthy - stopping tests');
      return results;
    }
    
    // Test 2: Basic SSE Connection
    const sseResult = await testSSEConnection();
    results.sseConnection = sseResult.success;
    
    if (!results.sseConnection) {
      console.log('\n❌ Basic SSE connection failed:', sseResult.error);
      console.log('🔍 Possible issues:');
      console.log('   - Server not running on port 3001');
      console.log('   - CORS issues between frontend (8080) and backend (3001)');
      console.log('   - SSE endpoint not properly configured');
    }
    
    // Test 3: Voice Call SSE Events
    const voiceResult = await testVoiceCallSSE();
    results.voiceCallSSE = voiceResult.success;
    
    // Test 4: Multiple Connections
    const multiResult = await testMultipleConnections();
    results.multipleConnections = multiResult.success;
    
    // Test 5: CORS Issues
    const corsResult = await testCORSIssues();
    results.corsTest = corsResult.success;
    
    // Results Summary
    console.log('\n📊 SSE Test Results:');
    console.log('===================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All SSE tests passed! Streaming should be working in the UI.');
    } else {
      console.log('\n⚠️ Some SSE tests failed. Issues identified:');
      
      if (!results.sseConnection) {
        console.log('   🔧 Fix: Check server is running and accessible');
      }
      if (!results.corsTest) {
        console.log('   🔧 Fix: Configure CORS properly for frontend-backend communication');
      }
      if (!results.voiceCallSSE) {
        console.log('   🔧 Fix: Voice call events not being broadcast to SSE');
      }
      if (!results.multipleConnections) {
        console.log('   🔧 Fix: Connection management issues');
      }
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Ensure server is running on port 3001');
    console.log('2. Check frontend connects to correct server URL');
    console.log('3. Verify CORS headers allow cross-origin SSE connections');
    console.log('4. Test in browser DevTools Network tab for SSE connections');
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
  }
  
  return results;
}

// Run the tests
runSSETests(); 