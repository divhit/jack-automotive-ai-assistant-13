#!/usr/bin/env node

// Test script to simulate incoming SMS webhook and check if ElevenLabs agent responds

import axios from 'axios';

const SERVER_URL = 'https://jack-automotive-ai-assistant-13.onrender.com';
// const SERVER_URL = 'http://localhost:3001'; // Use this for local testing

async function testSMSWebhook() {
  console.log('🧪 Testing SMS webhook to check ElevenLabs agent response...');
  
  // Simulate incoming SMS webhook from Twilio
  const smsPayload = {
    ToCountry: 'CA',
    ToState: 'British Columbia', 
    SmsMessageSid: 'SM' + Date.now(),
    NumMedia: '0',
    ToCity: '',
    FromZip: '',
    SmsSid: 'SM' + Date.now(),
    FromState: 'BC',
    SmsStatus: 'received',
    FromCity: 'NEW WESTMINSTER',
    Body: 'Hey Jack, test after greeting variables fix',
    FromCountry: 'CA',
    To: '+17786526908',
    ToZip: '',
    NumSegments: '1',
    MessageSid: 'SM' + Date.now(),
    AccountSid: 'AC922e23b76c582ae9156d893e0166476c',
    From: '+16049085474',
    ApiVersion: '2010-04-01'
  };

  try {
    console.log('📱 Sending SMS webhook with message:', smsPayload.Body);
    console.log('📞 From:', smsPayload.From, 'To:', smsPayload.To);
    
    const response = await axios.post(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, smsPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ SMS webhook response status:', response.status);
    console.log('📋 Response:', response.data);
    
    if (response.status === 200) {
      console.log('🎯 SMS webhook accepted successfully!');
      console.log('⏳ Now wait 5-10 seconds to see if ElevenLabs agent responds...');
      console.log('📊 Check server logs for:');
      console.log('   - 🔗 WebSocket connected');
      console.log('   - 📤 Sending first message after dynamic variable processing delay');
      console.log('   - ✅ Agent response received');
      console.log('   - 📱 SMS reply sent back');
    }
    
  } catch (error) {
    console.error('❌ Error testing SMS webhook:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', error.response.data);
    }
  }
}

// Run the test
testSMSWebhook();