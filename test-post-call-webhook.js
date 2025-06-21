// Simple test for post-call webhook
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:8080';

async function testPostCallWebhook() {
  console.log('🧪 Testing Post-Call Webhook');
  console.log('============================\n');
  
  const postCallPayload = {
    conversation_id: 'test-conv-' + Date.now(),
    agent_id: 'agent_01jwc5v1nafjwv7zw4vtz1050m',
    conversation_duration_ms: 180000,
    conversation_summary: 'Customer inquired about car loan refinancing options and interest rates',
    conversation_initiation_client_data: {
      lead_id: 'lead_001',
      customer_phone: '+1234567890'
    }
  };
  
  try {
    console.log('📤 Sending post-call webhook...');
    
    const response = await fetch(`${SERVER_URL}/api/webhooks/elevenlabs/post-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-signature': 'test-signature-' + Date.now()
      },
      body: JSON.stringify(postCallPayload)
    });
    
    console.log('📨 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Post-call webhook working:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Post-call webhook failed:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Post-call webhook error:', error.message);
  }
}

testPostCallWebhook(); 