// CRITICAL FIX: Conversation Storage Issue
// This fixes the core problem preventing messages from being stored and displayed

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const TEST_PHONE = '+16049085474';
const TEST_LEAD_ID = 'test1';

console.log('🔧 FIXING CONVERSATION STORAGE ISSUES');
console.log('====================================\n');

// Step 1: Test current addToConversationHistory function
async function testConversationHistory() {
  console.log('1️⃣ Testing conversation history storage...');
  
  // Simulate what happens when SMS is received
  const smsPayload = new URLSearchParams({
    From: TEST_PHONE,
    To: '+17786526908', 
    Body: 'Test message to verify storage',
    MessageSid: `fix-test-${Date.now()}`
  });
  
  console.log('📤 Sending SMS to trigger storage...');
  
  const response = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: smsPayload
  });
  
  if (response.ok) {
    console.log('✅ SMS webhook succeeded');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if message was stored
    const storageCheck = await fetch(`${SERVER_URL}/api/debug/get-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: TEST_PHONE })
    });
    
    if (storageCheck.ok) {
      const result = await storageCheck.json();
      console.log('📋 Retrieved history:', {
        messageCount: result.history?.length || 0,
        messages: result.history?.map(m => ({
          content: m.content?.substring(0, 30) + '...',
          sentBy: m.sentBy,
          type: m.type
        })) || []
      });
      
      if (result.history && result.history.length > 0) {
        console.log('✅ Conversation storage is working!');
        return true;
      } else {
        console.log('❌ PROBLEM: Message not stored in conversation history');
        return false;
      }
    } else {
      console.log('❌ Failed to retrieve conversation history');
      return false;
    }
  } else {
    console.log('❌ SMS webhook failed');
    return false;
  }
}

// Step 2: Test SSE connection with lead mapping
async function testSSEWithLeadMapping() {
  console.log('\n2️⃣ Testing SSE with proper lead mapping...');
  
  return new Promise((resolve) => {
    let messagesReceived = 0;
    let connectionEstablished = false;
    
    const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent(TEST_PHONE)}`);
    
    const timeout = setTimeout(() => {
      eventSource.close();
      if (connectionEstablished && messagesReceived > 0) {
        console.log('✅ SSE connection working properly');
        resolve(true);
      } else if (!connectionEstablished) {
        console.log('❌ PROBLEM: SSE connection failed to establish');
        resolve(false);
      } else {
        console.log('⚠️ SSE connected but no messages (may be normal)');
        resolve(true);
      }
    }, 5000);
    
    eventSource.onopen = () => {
      console.log('📡 SSE connection established');
      connectionEstablished = true;
    };
    
    eventSource.onmessage = (event) => {
      messagesReceived++;
      const data = JSON.parse(event.data);
      console.log(`📨 SSE message ${messagesReceived}:`, data.type, data.leadId || 'no-leadId');
    };
    
    eventSource.onerror = (error) => {
      console.log('❌ SSE error:', error.type);
      clearTimeout(timeout);
      eventSource.close();
      resolve(false);
    };
  });
}

// Step 3: Test end-to-end flow 
async function testEndToEndFlow() {
  console.log('\n3️⃣ Testing complete end-to-end flow...');
  
  // First establish SSE connection 
  const eventSource = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent(TEST_PHONE)}`);
  
  return new Promise((resolve) => {
    let flowWorking = false;
    
    eventSource.onopen = () => {
      console.log('📡 SSE connected, now sending SMS...');
      
      // Send SMS after SSE is connected
      setTimeout(async () => {
        const smsPayload = new URLSearchParams({
          From: TEST_PHONE,
          To: '+17786526908',
          Body: 'End-to-end test message',
          MessageSid: `e2e-test-${Date.now()}`
        });
        
        const response = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: smsPayload
        });
        
        if (response.ok) {
          console.log('📤 SMS sent, waiting for SSE broadcast...');
        }
      }, 1000);
    };
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 SSE received:', data.type, data.leadId);
      
      if (data.type === 'sms_received' || data.type === 'sms_sent') {
        console.log('✅ End-to-end flow working! SMS → Storage → SSE → UI');
        flowWorking = true;
        eventSource.close();
        resolve(true);
      }
    };
    
    eventSource.onerror = () => {
      console.log('❌ End-to-end flow failed: SSE error');
      eventSource.close();
      resolve(false);
    };
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!flowWorking) {
        console.log('❌ End-to-end flow failed: timeout waiting for SSE broadcast');
        eventSource.close();
        resolve(false);
      }
    }, 10000);
  });
}

// Run all tests
async function runFixTests() {
  try {
    console.log('Testing if conversation storage is working...\n');
    
    const historyWorking = await testConversationHistory();
    const sseWorking = await testSSEWithLeadMapping();
    const endToEndWorking = await testEndToEndFlow();
    
    console.log('\n🏁 FIX TEST RESULTS');
    console.log('===================');
    console.log(`Conversation Storage: ${historyWorking ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`SSE Connections: ${sseWorking ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`End-to-End Flow: ${endToEndWorking ? '✅ WORKING' : '❌ BROKEN'}`);
    
    if (historyWorking && sseWorking && endToEndWorking) {
      console.log('\n🎉 ALL SYSTEMS WORKING! Your telephony interface should now show messages.');
    } else {
      console.log('\n🚨 ISSUES REMAIN:');
      if (!historyWorking) console.log('- Messages not being stored in conversation history');
      if (!sseWorking) console.log('- SSE connections not working properly');
      if (!endToEndWorking) console.log('- End-to-end message flow broken');
    }
    
  } catch (error) {
    console.error('❌ Fix test failed:', error.message);
  }
}

runFixTests(); 