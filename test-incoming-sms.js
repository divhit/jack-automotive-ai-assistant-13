#!/usr/bin/env node

/**
 * Test incoming SMS flow to see where conversation history is loaded from
 */

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3001';
const TEST_PHONE = '+16049085474';
const TEST_TO_NUMBER = '+17786526908'; // ElevenLabs phone number

console.log('🧪 TESTING INCOMING SMS FLOW');
console.log('='.repeat(60));

async function testIncomingSMS() {
  console.log('\n1. SIMULATING INCOMING SMS TO TWILIO WEBHOOK:');

  // Create a test SMS payload that mimics what Twilio sends
  const smsPayload = new URLSearchParams({
    'MessageSid': 'SMtest' + Date.now(),
    'AccountSid': 'ACtest',
    'MessagingServiceSid': '',
    'From': TEST_PHONE,
    'To': TEST_TO_NUMBER,
    'Body': 'Test incoming SMS message for conversation history check',
    'NumMedia': '0',
    'FromCity': 'Vancouver',
    'FromState': 'BC',
    'FromZip': '',
    'FromCountry': 'CA',
    'ToCity': '',
    'ToState': '',
    'ToZip': '',
    'ToCountry': 'CA'
  });

  try {
    console.log(`   📱 Sending SMS webhook to: ${SERVER_URL}/api/webhooks/twilio/sms/incoming`);
    console.log(`   📞 From: ${TEST_PHONE}`);
    console.log(`   📞 To: ${TEST_TO_NUMBER}`);
    console.log(`   💬 Message: "Test incoming SMS message for conversation history check"`);

    const response = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: smsPayload.toString()
    });

    const responseText = await response.text();

    console.log(`   📋 Response Status: ${response.status}`);
    console.log(`   📋 Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);

    if (response.status === 200) {
      console.log('   ✅ SMS webhook processed successfully');
      console.log('\n   🔍 Check server logs to see:');
      console.log('      - Where conversation history was loaded from');
      console.log('      - Which database table was queried');
      console.log('      - What organization context was used');
    } else {
      console.log('   ❌ SMS webhook failed');
    }

  } catch (error) {
    console.log(`   ❌ Error calling SMS webhook: ${error.message}`);
  }

  console.log('\n2. TESTING CONVERSATION CONTEXT LOADING:');

  // Test the conversation context endpoint directly
  try {
    console.log(`   🔍 Testing conversation context endpoint...`);

    const contextResponse = await fetch(`${SERVER_URL}/api/conversation-context/${encodeURIComponent(TEST_PHONE)}?organizationId=aabe0501-4eb6-4b98-9d9f-01381506314f`);

    if (contextResponse.ok) {
      const contextData = await contextResponse.json();
      console.log(`   ✅ Context loaded: ${contextData.messages?.length || 0} messages`);

      if (contextData.messages && contextData.messages.length > 0) {
        console.log(`   📋 Latest message: "${contextData.messages[contextData.messages.length - 1].content.substring(0, 50)}..."`);
        console.log(`   📋 Data source: ${contextData.source || 'unknown'}`);
      }
    } else {
      console.log(`   ❌ Context endpoint failed: ${contextResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error testing context: ${error.message}`);
  }
}

async function main() {
  console.log('   ⚠️  Make sure server is running on localhost:8080');
  console.log('   📋 This will test the complete SMS → conversation history flow');

  await testIncomingSMS();

  console.log('\n' + '='.repeat(60));
  console.log('🎯 NEXT STEPS:');
  console.log('   1. Check server console logs for conversation history queries');
  console.log('   2. Look for "Loading conversation history" or similar messages');
  console.log('   3. Verify which table (conversations) is being queried');
  console.log('   4. Check if organization context is properly passed');
}

main().catch(console.error);