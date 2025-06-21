// Test real conversation history storage and retrieval
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const TEST_PHONE = '+1234567890';
const TEST_LEAD_ID = 'lead_001';

console.log('🧪 Real Conversation History Test');
console.log('=================================\n');

// Helper function to clear conversation history
async function clearConversationHistory(phoneNumber) {
  // Send a special request to clear history (we'll need to add this endpoint)
  try {
    const response = await fetch(`${SERVER_URL}/api/debug/clear-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    
    if (response.ok) {
      console.log(`✅ Cleared conversation history for ${phoneNumber}`);
    } else {
      console.log(`⚠️ Could not clear history (endpoint may not exist)`);
    }
  } catch (error) {
    console.log(`⚠️ Could not clear history: ${error.message}`);
  }
}

// Helper function to get conversation history
async function getConversationHistory(phoneNumber) {
  try {
    const response = await fetch(`${SERVER_URL}/api/debug/get-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.history || [];
    }
  } catch (error) {
    console.log(`❌ Could not get history: ${error.message}`);
  }
  return [];
}

// Test 1: Verify empty history initially
async function testEmptyHistory() {
  console.log('1️⃣ Testing Empty History Initially...');
  
  await clearConversationHistory(TEST_PHONE);
  const history = await getConversationHistory(TEST_PHONE);
  
  if (history.length === 0) {
    console.log('✅ History is empty initially');
    return true;
  } else {
    console.log('❌ History is not empty:', history);
    return false;
  }
}

// Test 2: Test SMS message storage
async function testSMSStorage() {
  console.log('\n2️⃣ Testing SMS Message Storage...');
  
  const testMessage = 'I need help with my car loan application';
  
  // Send SMS
  const smsPayload = new URLSearchParams({
    From: TEST_PHONE,
    Body: testMessage,
    MessageSid: 'test-sms-' + Date.now()
  });
  
  try {
    const response = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: smsPayload
    });
    
    if (response.status === 200) {
      console.log('✅ SMS webhook processed');
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if message was stored
      const history = await getConversationHistory(TEST_PHONE);
      
      const userMessage = history.find(msg => 
        msg.content === testMessage && 
        msg.sentBy === 'user' && 
        msg.type === 'text'
      );
      
      if (userMessage) {
        console.log('✅ SMS message properly stored in history');
        console.log('   Message:', userMessage);
        return true;
      } else {
        console.log('❌ SMS message not found in history');
        console.log('   History:', history);
        return false;
      }
    } else {
      console.log('❌ SMS webhook failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ SMS test error:', error.message);
    return false;
  }
}

// Test 3: Test conversation context building
async function testContextBuilding() {
  console.log('\n3️⃣ Testing Conversation Context Building...');
  
  // First, send multiple messages to build a conversation
  const messages = [
    'Hello, I need help with financing',
    'What are your current interest rates?',
    'I have a credit score of 650'
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const smsPayload = new URLSearchParams({
      From: TEST_PHONE,
      Body: messages[i],
      MessageSid: `test-context-${Date.now()}-${i}`
    });
    
    await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: smsPayload
    });
    
    // Wait between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Wait for all messages to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Now check the stored history
  const history = await getConversationHistory(TEST_PHONE);
  
  console.log(`📊 Stored ${history.length} messages in history`);
  
  // Verify all messages are stored
  let allMessagesStored = true;
  for (const message of messages) {
    const found = history.find(msg => msg.content === message);
    if (!found) {
      console.log(`❌ Message not found: "${message}"`);
      allMessagesStored = false;
    }
  }
  
  if (allMessagesStored && history.length >= messages.length) {
    console.log('✅ All messages properly stored');
    
    // Test context building by initiating a call
    const callPayload = {
      phoneNumber: TEST_PHONE,
      leadId: TEST_LEAD_ID
    };
    
    const callResponse = await fetch(`${SERVER_URL}/api/elevenlabs/outbound-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callPayload)
    });
    
    const callResult = await callResponse.json();
    
    // Check server logs to see if context was built from actual stored messages
    console.log('✅ Call initiated - check server logs for context building');
    console.log('   Look for: "Built conversation context for +1234567890"');
    console.log('   The context should contain the actual messages sent, not hardcoded data');
    
    return true;
  } else {
    console.log('❌ Not all messages were stored properly');
    return false;
  }
}

// Test 4: Test voice message storage (simulated)
async function testVoiceMessageStorage() {
  console.log('\n4️⃣ Testing Voice Message Storage...');
  
  const testConversationId = 'test-conv-' + Date.now();
  
  // Simulate voice webhook events
  const voiceEvents = [
    {
      type: 'user_message',
      event_timestamp: Date.now() / 1000,
      data: {
        conversation_id: testConversationId,
        message: 'What documents do I need for the loan?',
        speaker: 'user',
        conversation_initiation_client_data: {
          lead_id: TEST_LEAD_ID,
          customer_phone: TEST_PHONE
        }
      }
    },
    {
      type: 'agent_response', 
      event_timestamp: Date.now() / 1000,
      data: {
        conversation_id: testConversationId,
        response: 'You will need proof of income, ID, and insurance',
        speaker: 'agent',
        conversation_initiation_client_data: {
          lead_id: TEST_LEAD_ID,
          customer_phone: TEST_PHONE
        }
      }
    }
  ];
  
  // Store conversation metadata first
  await fetch(`${SERVER_URL}/api/debug/store-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: testConversationId,
      phoneNumber: TEST_PHONE,
      leadId: TEST_LEAD_ID
    })
  });
  
  // Send voice events
  for (const event of voiceEvents) {
    await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/conversation-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-signature': 'test-signature-' + Date.now()
      },
      body: JSON.stringify(event)
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if voice messages were stored
  const history = await getConversationHistory(TEST_PHONE);
  
  const voiceUserMessage = history.find(msg => 
    msg.content === 'What documents do I need for the loan?' && 
    msg.type === 'voice'
  );
  
  const voiceAgentMessage = history.find(msg => 
    msg.content === 'You will need proof of income, ID, and insurance' && 
    msg.type === 'voice'
  );
  
  if (voiceUserMessage && voiceAgentMessage) {
    console.log('✅ Voice messages properly stored');
    return true;
  } else {
    console.log('❌ Voice messages not stored properly');
    console.log('   History:', history);
    return false;
  }
}

// Test 5: Test mixed conversation (SMS + Voice)
async function testMixedConversation() {
  console.log('\n5️⃣ Testing Mixed Conversation (SMS + Voice)...');
  
  // Clear history first
  await clearConversationHistory(TEST_PHONE);
  
  // Send SMS first
  const smsPayload = new URLSearchParams({
    From: TEST_PHONE,
    Body: 'I want to buy a car with financing',
    MessageSid: 'test-mixed-sms-' + Date.now()
  });
  
  await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: smsPayload
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Then simulate voice conversation
  const testConversationId = 'test-mixed-conv-' + Date.now();
  
  await fetch(`${SERVER_URL}/api/debug/store-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId: testConversationId,
      phoneNumber: TEST_PHONE,
      leadId: TEST_LEAD_ID
    })
  });
  
  const voiceEvent = {
    type: 'user_message',
    event_timestamp: Date.now() / 1000,
    data: {
      conversation_id: testConversationId,
      message: 'What is the interest rate for someone with my credit?',
      speaker: 'user'
    }
  };
  
  await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/conversation-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-signature': 'test-signature-' + Date.now()
    },
    body: JSON.stringify(voiceEvent)
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check final history contains both SMS and voice
  const history = await getConversationHistory(TEST_PHONE);
  
  const smsMessage = history.find(msg => 
    msg.content === 'I want to buy a car with financing' && 
    msg.type === 'text'
  );
  
  const voiceMessage = history.find(msg => 
    msg.content === 'What is the interest rate for someone with my credit?' && 
    msg.type === 'voice'
  );
  
  if (smsMessage && voiceMessage) {
    console.log('✅ Mixed conversation properly stored');
    console.log('   SMS message found:', smsMessage.content);
    console.log('   Voice message found:', voiceMessage.content);
    
    // Test context building with mixed conversation
    const callPayload = {
      phoneNumber: TEST_PHONE,
      leadId: TEST_LEAD_ID
    };
    
    await fetch(`${SERVER_URL}/api/elevenlabs/outbound-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callPayload)
    });
    
    console.log('✅ Context should now contain both SMS and voice messages');
    return true;
  } else {
    console.log('❌ Mixed conversation not stored properly');
    console.log('   History:', history);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Real Conversation History Tests...\n');
  
  const testResults = {
    emptyHistory: false,
    smsStorage: false,
    contextBuilding: false,
    voiceStorage: false,
    mixedConversation: false
  };
  
  try {
    testResults.emptyHistory = await testEmptyHistory();
    testResults.smsStorage = await testSMSStorage();
    testResults.contextBuilding = await testContextBuilding();
    testResults.voiceStorage = await testVoiceMessageStorage();
    testResults.mixedConversation = await testMixedConversation();
    
    // Results summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All conversation history tests passed!');
      console.log('✅ Real conversation data is being stored and retrieved properly');
    } else {
      console.log('⚠️ Some tests failed - conversation history may be using hardcoded data');
    }
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
  }
}

// Run the tests
runAllTests(); 