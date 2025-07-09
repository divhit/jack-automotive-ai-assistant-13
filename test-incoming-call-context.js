import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const TEST_PHONE = '+1234567890';
const TEST_CALL_SID = 'test-call-sid-incoming-123';
const TEST_CONVERSATION_ID = 'conv_incoming_test_123';

async function testIncomingCallContextFlow() {
  console.log('🧪 Testing incoming call context flow...');
  
  try {
    // 1. Test conversation-initiation webhook (when call starts)
    console.log('\n1. Testing conversation-initiation webhook...');
    const initResponse = await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/conversation-initiation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caller_id: TEST_PHONE,
        agent_id: 'test-agent',
        called_number: '+1778555123',
        call_sid: TEST_CALL_SID
      })
    });
    
    const initResult = await initResponse.json();
    console.log('✅ Conversation initiation response:', initResult);
    
    // 2. Test conversation-events webhook (during call - user says something)
    console.log('\n2. Testing conversation-events webhook (user message)...');
    const userMessageResponse = await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/conversation-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'user_message',
        event_timestamp: Date.now() / 1000,
        data: {
          message: 'I want to change my budget to $1100',
          conversation_id: TEST_CONVERSATION_ID
        }
      })
    });
    
    const userMessageResult = await userMessageResponse.json();
    console.log('✅ User message event response:', userMessageResult);
    
    // 3. Test conversation-events webhook (agent responds)
    console.log('\n3. Testing conversation-events webhook (agent response)...');
    const agentMessageResponse = await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/conversation-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'agent_message',
        event_timestamp: Date.now() / 1000,
        data: {
          message: 'I understand you want to change your budget to $1100. Let me help you find vehicles in that price range.',
          conversation_id: TEST_CONVERSATION_ID
        }
      })
    });
    
    const agentMessageResult = await agentMessageResponse.json();
    console.log('✅ Agent message event response:', agentMessageResult);
    
    // 4. Test post-call webhook (when call ends)
    console.log('\n4. Testing post-call webhook...');
    const postCallResponse = await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/post-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: TEST_CONVERSATION_ID,
        conversation_duration_ms: 45000,
        conversation_summary: 'Customer called asking to change their budget to $1100. Agent provided assistance with finding vehicles in that price range.',
        conversation_initiation_client_data: {
          customer_phone: TEST_PHONE,
          conversation_context: 'Previous context...'
        },
        transcript: [
          {
            role: 'user',
            message: 'I want to change my budget to $1100',
            timestamp: new Date().toISOString()
          },
          {
            role: 'agent',
            message: 'I understand you want to change your budget to $1100. Let me help you find vehicles in that price range.',
            timestamp: new Date().toISOString()
          }
        ],
        call_ended_reason: 'user_hangup'
      })
    });
    
    const postCallResult = await postCallResponse.json();
    console.log('✅ Post-call webhook response:', postCallResult);
    
    // 5. Verify conversation context was saved
    console.log('\n5. Verifying conversation context was saved...');
    const contextResponse = await fetch(`${SERVER_URL}/api/debug/conversation-history?phoneNumber=${encodeURIComponent(TEST_PHONE)}`);
    
    if (contextResponse.ok) {
      const contextData = await contextResponse.json();
      console.log('📋 Conversation history:', contextData);
      
      // Check if the budget change message was stored
      const budgetMessage = contextData.history?.find(msg => 
        msg.content?.includes('budget to $1100') && msg.sentBy === 'user'
      );
      
      if (budgetMessage) {
        console.log('✅ SUCCESS: Budget change message found in conversation history!');
        console.log('   Message:', budgetMessage.content);
        console.log('   Stored as:', budgetMessage.type, 'message');
      } else {
        console.log('❌ FAILED: Budget change message not found in conversation history');
        console.log('   Available messages:', contextData.history?.map(m => m.content?.substring(0, 50)) || []);
      }
    } else {
      console.log('❌ Could not retrieve conversation history');
    }
    
    // 6. Test that next SMS would include this context
    console.log('\n6. Testing that next SMS would include voice call context...');
    const smsResponse = await fetch(`${SERVER_URL}/api/twilio/sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: TEST_PHONE,
        Body: 'What SUVs do you have in my price range?'
      })
    });
    
    if (smsResponse.ok) {
      console.log('✅ SMS sent successfully - check server logs for context building');
      console.log('   Look for: "Built conversation context" with budget message included');
    } else {
      console.log('❌ SMS test failed');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function runTest() {
  console.log('🎯 INCOMING CALL CONTEXT TEST');
  console.log('===============================');
  
  const success = await testIncomingCallContextFlow();
  
  if (success) {
    console.log('\n✅ TEST COMPLETED');
    console.log('Check server logs to verify:');
    console.log('1. Conversation initiation webhook processed');
    console.log('2. Real-time messages stored during call');
    console.log('3. Post-call webhook updated call session');
    console.log('4. Budget change message preserved in context');
  } else {
    console.log('\n❌ TEST FAILED');
  }
}

runTest().catch(console.error); 