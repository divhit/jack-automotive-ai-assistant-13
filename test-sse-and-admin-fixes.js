// Comprehensive Test: SSE Connection Stability + Admin Endpoints
import { EventSource } from 'eventsource';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:10000'; // Updated for Render port
const TEST_LEAD_ID = 'test1';
const TEST_PHONE = '+16049085474';

console.log('🧪 SSE Connection Stability + Admin Endpoints Test');
console.log(`📡 Testing server at: ${SERVER_URL}`);

// Test 1: SSE Connection Stability
async function testSSEStability() {
  console.log('\n1️⃣ Testing SSE Connection Stability...');
  
  return new Promise((resolve) => {
    let connected = false;
    let messagesReceived = 0;
    let heartbeatsReceived = 0;
    const startTime = Date.now();
    const connectionEvents = [];
    
    console.log(`📡 Connecting to: ${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent('(604) 908-5474')}`);
    
    const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent('(604) 908-5474')}`);
    
    const timeout = setTimeout(() => {
      eventSource.close();
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ Connection test completed after ${duration}ms`);
      console.log(`📊 Connection Stats:`);
      console.log(`   - Connected: ${connected}`);
      console.log(`   - Messages received: ${messagesReceived}`);
      console.log(`   - Heartbeats received: ${heartbeatsReceived}`);
      console.log(`   - Connection events: ${connectionEvents.length}`);
      
      resolve({
        success: connected && messagesReceived > 0,
        connected,
        messagesReceived,
        heartbeatsReceived,
        duration,
        events: connectionEvents,
        stayedConnected: heartbeatsReceived > 1 // Should receive multiple heartbeats
      });
    }, 45000); // Test for 45 seconds to get multiple heartbeats
    
    eventSource.onopen = () => {
      connected = true;
      connectionEvents.push({ type: 'open', timestamp: Date.now() - startTime });
      console.log('✅ SSE connection opened successfully');
    };
    
    eventSource.onmessage = (event) => {
      messagesReceived++;
      const data = JSON.parse(event.data);
      const eventTime = Date.now() - startTime;
      
      connectionEvents.push({ 
        type: 'message', 
        timestamp: eventTime, 
        messageType: data.type 
      });
      
      console.log(`📨 [${eventTime}ms] Message ${messagesReceived}: ${data.type}`);
      
      if (data.type === 'connected') {
        console.log('✅ Received connection confirmation');
      } else if (data.type === 'heartbeat') {
        heartbeatsReceived++;
        console.log(`💓 Heartbeat ${heartbeatsReceived} received`);
      }
    };
    
    eventSource.onerror = (error) => {
      const eventTime = Date.now() - startTime;
      connectionEvents.push({ type: 'error', timestamp: eventTime });
      console.log(`❌ [${eventTime}ms] SSE connection error:`, error);
    };
  });
}

// Test 2: Admin Endpoints - Database Clearing
async function testDatabaseClear() {
  console.log('\n2️⃣ Testing Database Clear Endpoint...');
  
  try {
    // First, try without confirmation (should fail)
    console.log('🔒 Testing safety check (should require confirmation)...');
    const unsafeResponse = await fetch(`${SERVER_URL}/api/admin/clear-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (unsafeResponse.status === 400) {
      console.log('✅ Safety check working - confirmation required');
    } else {
      console.log('❌ Safety check failed - should require confirmation');
    }
    
    // Now try with confirmation
    console.log('🗑️ Testing database clear with confirmation...');
    const clearResponse = await fetch(`${SERVER_URL}/api/admin/clear-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });
    
    if (clearResponse.ok) {
      const result = await clearResponse.json();
      console.log('✅ Database cleared successfully:', result.message);
      console.log('📊 Cleared items:', result.cleared);
      return { success: true, result };
    } else {
      const error = await clearResponse.json();
      console.log('❌ Database clear failed:', error.error);
      return { success: false, error: error.error };
    }
    
  } catch (error) {
    console.log('❌ Database clear test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Lead Creation
async function testLeadCreation() {
  console.log('\n3️⃣ Testing Lead Creation Endpoint...');
  
  try {
    const testLeads = [
      {
        name: 'John Doe',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
        status: 'new',
        score: 75
      },
      {
        name: 'Jane Smith',
        phoneNumber: '(604) 555-1234',
        email: 'jane@example.com',
        status: 'contacted',
        score: 85
      },
      {
        name: 'Bob Johnson',
        phoneNumber: '604-555-9876',
        status: 'qualified',
        score: 90
      }
    ];
    
    const createdLeads = [];
    
    for (const [index, lead] of testLeads.entries()) {
      console.log(`👤 Creating lead ${index + 1}: ${lead.name}...`);
      
      const response = await fetch(`${SERVER_URL}/api/admin/create-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Lead created: ${result.lead.customerName} (${result.lead.phoneNumber})`);
        createdLeads.push(result.lead);
      } else {
        const error = await response.json();
        console.log(`❌ Failed to create lead: ${error.error}`);
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`📊 Successfully created ${createdLeads.length}/${testLeads.length} leads`);
    return { success: createdLeads.length > 0, createdLeads };
    
  } catch (error) {
    console.log('❌ Lead creation test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 4: Lead Retrieval
async function testLeadRetrieval() {
  console.log('\n4️⃣ Testing Lead Retrieval Endpoint...');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/leads`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Retrieved ${result.total} leads from ${result.source}`);
      
      if (result.leads && result.leads.length > 0) {
        console.log('📋 Sample lead data:');
        const sampleLead = result.leads[0];
        console.log(`   - ID: ${sampleLead.id}`);
        console.log(`   - Name: ${sampleLead.customerName}`);
        console.log(`   - Phone: ${sampleLead.phoneNumber}`);
        console.log(`   - Status: ${sampleLead.chaseStatus}`);
        console.log(`   - Score: ${sampleLead.score || 'N/A'}`);
      }
      
      return { success: true, leads: result.leads, total: result.total };
    } else {
      const error = await response.json();
      console.log('❌ Lead retrieval failed:', error.error);
      return { success: false, error: error.error };
    }
    
  } catch (error) {
    console.log('❌ Lead retrieval test error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 5: SSE with Real Message Broadcasting
async function testSSEWithMessages() {
  console.log('\n5️⃣ Testing SSE with Real Message Broadcasting...');
  
  return new Promise(async (resolve) => {
    let sseConnected = false;
    let messagesReceived = [];
    
    // Set up SSE connection
    console.log('📡 Setting up SSE connection...');
    const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent(TEST_PHONE)}`);
    
    eventSource.onopen = () => {
      sseConnected = true;
      console.log('✅ SSE connected for message broadcasting test');
    };
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      messagesReceived.push(data);
      console.log(`📨 SSE Message: ${data.type}`, data.message ? `- "${data.message}"` : '');
    };
    
    // Wait for connection, then send SMS
    setTimeout(async () => {
      if (sseConnected) {
        console.log('📤 Sending test SMS to trigger SSE broadcast...');
        
        try {
          const smsPayload = new URLSearchParams({
            From: TEST_PHONE,
            To: '+17786526908',
            Body: 'Test SMS for SSE broadcasting validation',
            MessageSid: `test-sse-${Date.now()}`
          });
          
          const smsResponse = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: smsPayload
          });
          
          if (smsResponse.ok) {
            console.log('✅ SMS sent, waiting for SSE broadcast...');
          }
        } catch (error) {
          console.log('❌ Error sending test SMS:', error.message);
        }
      }
      
      // Wait for potential broadcasts, then close
      setTimeout(() => {
        eventSource.close();
        
        const broadcastMessages = messagesReceived.filter(msg => 
          ['sms_received', 'sms_sent'].includes(msg.type)
        );
        
        console.log(`📊 SSE Broadcasting Results:`);
        console.log(`   - SSE Connected: ${sseConnected}`);
        console.log(`   - Total messages: ${messagesReceived.length}`);
        console.log(`   - Broadcast messages: ${broadcastMessages.length}`);
        
        resolve({
          success: sseConnected && broadcastMessages.length > 0,
          connected: sseConnected,
          totalMessages: messagesReceived.length,
          broadcastMessages: broadcastMessages.length,
          messages: messagesReceived
        });
      }, 10000);
    }, 3000);
  });
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive SSE + Admin Tests...\n');
  console.log('⚠️ Make sure your server is running on the correct port!');
  console.log(`📡 Expected server URL: ${SERVER_URL}\n`);
  
  const results = {
    sseStability: null,
    databaseClear: null,
    leadCreation: null,
    leadRetrieval: null,
    sseWithMessages: null
  };
  
  try {
    // Test 1: SSE Connection Stability
    results.sseStability = await testSSEStability();
    
    // Test 2: Database Clear
    results.databaseClear = await testDatabaseClear();
    
    // Test 3: Lead Creation
    results.leadCreation = await testLeadCreation();
    
    // Test 4: Lead Retrieval
    results.leadRetrieval = await testLeadRetrieval();
    
    // Test 5: SSE with Messages
    results.sseWithMessages = await testSSEWithMessages();
    
    // Results Summary
    console.log('\n📊 Final Test Results:');
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([testName, result]) => {
      const status = result?.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${testName}`);
      
      if (testName === 'sseStability' && result) {
        console.log(`        - Stayed connected: ${result.stayedConnected ? 'Yes' : 'No'}`);
        console.log(`        - Heartbeats: ${result.heartbeatsReceived}`);
        console.log(`        - Duration: ${result.duration}ms`);
      }
    });
    
    const passedTests = Object.values(results).filter(r => r?.success).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 SUCCESS: All tests passed!');
      console.log('✅ SSE connections are stable and staying open');
      console.log('✅ Admin endpoints working correctly');
      console.log('✅ Real-time message broadcasting functional');
    } else {
      console.log('\n⚠️ Some tests failed:');
      
      if (!results.sseStability?.success) {
        console.log('🔍 SSE Connection Issues:');
        console.log('   - Check if server is running on correct port');
        console.log('   - Verify CORS headers are properly set');
        console.log('   - Check for network/firewall issues');
      }
      
      if (!results.sseWithMessages?.success) {
        console.log('🔍 SSE Broadcasting Issues:');
        console.log('   - Verify leadId mapping is working');
        console.log('   - Check that SMS webhooks are processing');
        console.log('   - Ensure broadcastConversationUpdate is being called');
      }
    }
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
  }
}

// Run the tests
runAllTests(); 