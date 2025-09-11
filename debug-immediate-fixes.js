// Debug script to test and fix immediate issues
// Run: node debug-immediate-fixes.js

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const TEST_PHONE = '+16049085474';
const TEST_LEAD_ID = 'test1';

console.log('🚨 DEBUGGING IMMEDIATE ISSUES');
console.log('===============================\n');

// Test 1: Check current conversation storage
async function testConversationStorage() {
  console.log('1️⃣ Testing Conversation Storage...');
  
  const response = await fetch(`${SERVER_URL}/api/debug/all-conversations`);
  const data = await response.json();
  
  console.log('📊 Current storage state:', {
    totalConversations: data.totalConversations,
    conversationCount: Object.keys(data.conversations).length,
    phoneToLeadMappings: Object.keys(data.phoneToLeadMappings).length,
    activeConnections: data.activeConnections.length
  });
  
  if (data.totalConversations === 0) {
    console.log('❌ PROBLEM: No conversations stored - this explains why UI is empty');
  } else {
    console.log('✅ Conversations found in storage');
  }
  
  return data;
}

// Test 2: Test lead data lookup  
async function testLeadDataLookup() {
  console.log('\n2️⃣ Testing Lead Data Lookup...');
  
  // Test the specific lead that was failing in logs
  const response = await fetch(`${SERVER_URL}/api/debug/get-lead-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: TEST_LEAD_ID })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('📋 Lead data for test1:', data);
    
    if (data.customerName && data.customerName !== 'Test User') {
      console.log('❌ PROBLEM: Dynamic variables failing - customerName should be "Test User"');
    } else if (data.customerName === 'Test User') {
      console.log('✅ Lead data lookup working correctly');
    }
  } else {
    console.log('❌ PROBLEM: Lead data lookup endpoint missing or failing');
  }
}

// Test 3: Test conversation context building
async function testConversationContext() {
  console.log('\n3️⃣ Testing Conversation Context Building...');
  
  const response = await fetch(`${SERVER_URL}/api/debug/build-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: TEST_PHONE })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('📝 Context building result:', {
      contextLength: data.context?.length || 0,
      hasContext: !!data.context,
      source: data.source || 'unknown'
    });
    
    if (!data.context || data.context.length === 0) {
      console.log('❌ PROBLEM: No conversation context being built');
    } else {
      console.log('✅ Conversation context building working');
    }
  } else {
    console.log('❌ PROBLEM: Context building endpoint missing or failing');
  }
}

// Test 4: Simulate SMS to test conversation storage 
async function testSMSConversationStorage() {
  console.log('\n4️⃣ Testing SMS Conversation Storage...');
  
  console.log('📤 Sending test SMS...');
  
  const smsPayload = new URLSearchParams({
    From: TEST_PHONE,
    To: '+17786526908',
    Body: 'Test message for debugging conversation storage',
    MessageSid: `test-debug-${Date.now()}`
  });
  
  const response = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: smsPayload
  });
  
  if (response.ok) {
    console.log('✅ SMS webhook processed successfully');
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if conversation was stored
    const storageResponse = await fetch(`${SERVER_URL}/api/debug/all-conversations`);
    const storageData = await storageResponse.json();
    
    console.log('📊 Storage after SMS:', {
      totalConversations: storageData.totalConversations,
      phoneToLeadMappings: Object.keys(storageData.phoneToLeadMappings).length,
      conversationKeys: Object.keys(storageData.conversations)
    });
    
    if (storageData.totalConversations > 0) {
      console.log('✅ SMS message stored successfully');
    } else {
      console.log('❌ PROBLEM: SMS message not stored - this is the main issue!');
    }
  } else {
    console.log('❌ SMS webhook failed');
  }
}

// Test 5: Test SSE connection persistence
async function testSSEConnection() {
  console.log('\n5️⃣ Testing SSE Connection...');
  
  let messageCount = 0;
  let connectionClosed = false;
  
  const sse = new EventSource(`${SERVER_URL}/api/stream/conversation/${TEST_LEAD_ID}?phoneNumber=${encodeURIComponent(TEST_PHONE)}`);
  
  sse.onopen = () => {
    console.log('📡 SSE connection opened');
  };
  
  sse.onmessage = (event) => {
    messageCount++;
    const data = JSON.parse(event.data);
    console.log(`📨 SSE message ${messageCount}:`, data.type, data.leadId || 'no-leadId');
  };
  
  sse.onerror = (error) => {
    console.log('❌ SSE connection error:', error.type);
    connectionClosed = true;
    sse.close();
  };
  
  // Wait 5 seconds to see if connection stays open
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  if (!connectionClosed && messageCount > 0) {
    console.log('✅ SSE connection working properly');
  } else if (connectionClosed) {
    console.log('❌ PROBLEM: SSE connection closed immediately - explains why UI not updating');
  } else {
    console.log('⚠️ SSE connection open but no messages - may be normal');
  }
  
  sse.close();
}

// Run all tests
async function runAllTests() {
  try {
    await testConversationStorage();
    await testLeadDataLookup(); 
    await testConversationContext();
    await testSMSConversationStorage();
    await testSSEConnection();
    
    console.log('\n🏁 SUMMARY');
    console.log('===========');
    console.log('If you see any ❌ PROBLEM messages above, those are the root causes');
    console.log('The most likely issues based on your logs:');
    console.log('- SMS messages not being stored in conversationContexts Map'); 
    console.log('- SSE connections closing immediately');
    console.log('- Dynamic variable replacement failing');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  }
}

runAllTests(); 