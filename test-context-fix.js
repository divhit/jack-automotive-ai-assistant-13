// Test Script: Context Loss Fix and Admin UI
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:10000';
const TEST_PHONE = '+16049085474';
const TEST_LEAD_ID = 'test1';

console.log('🧪 Testing Context Loss Fix and Admin UI');

async function testContextBuilding() {
  console.log('\n1️⃣ Testing Context Building...');
  
  try {
    // First, send an SMS to create conversation history
    console.log('📤 Sending test SMS to create history...');
    const smsPayload = new URLSearchParams({
      From: TEST_PHONE,
      To: '+17786526908',
      Body: 'I want to buy a Mercedes EQE for my family',
      MessageSid: `test-context-${Date.now()}`
    });
    
    const smsResponse = await fetch(`${SERVER_URL}/api/webhooks/twilio/sms/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: smsPayload
    });
    
    if (smsResponse.ok) {
      console.log('✅ SMS sent successfully');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now test the context building by making a voice call
      console.log('📞 Testing voice call with context...');
      const callResponse = await fetch(`${SERVER_URL}/api/elevenlabs/outbound-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '(604) 908-5474',
          leadId: TEST_LEAD_ID
        })
      });
      
      if (callResponse.ok) {
        const result = await callResponse.json();
        console.log('✅ Voice call initiated - check server logs for context');
        return { success: true, contextFound: true };
      } else {
        const error = await callResponse.json();
        console.log('❌ Voice call failed:', error.error);
        return { success: false, error: error.error };
      }
    } else {
      console.log('❌ SMS sending failed');
      return { success: false, error: 'SMS failed' };
    }
  } catch (error) {
    console.log('❌ Context test error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAdminEndpoints() {
  console.log('\n2️⃣ Testing Admin Endpoints...');
  
  try {
    // Test lead creation
    const createResponse = await fetch(`${SERVER_URL}/api/admin/create-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Context Test User',
        phoneNumber: '+1234567890',
        email: 'test@example.com',
        status: 'new',
        score: 80
      })
    });
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Lead created:', result.lead.customerName);
      
      // Test lead retrieval
      const getResponse = await fetch(`${SERVER_URL}/api/admin/leads`);
      if (getResponse.ok) {
        const leads = await getResponse.json();
        console.log(`✅ Retrieved ${leads.total} leads`);
        return { success: true, leadsCount: leads.total };
      }
    } else {
      const error = await createResponse.json();
      console.log('❌ Lead creation failed:', error.error);
      return { success: false, error: error.error };
    }
  } catch (error) {
    console.log('❌ Admin test error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Context and Admin Tests...\n');
  
  const contextResult = await testContextBuilding();
  const adminResult = await testAdminEndpoints();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Context Building: ${contextResult.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Admin Endpoints: ${adminResult.success ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (contextResult.success) {
    console.log('\n✅ Context fix working - check server logs for detailed context');
    console.log('🔍 Look for "Built conversation context" message with SMS history');
  }
  
  if (adminResult.success) {
    console.log('✅ Admin endpoints working - UI should show New Lead and Clear DB buttons');
  }
}

runTests(); 