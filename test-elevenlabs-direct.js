#!/usr/bin/env node

// Test ElevenLabs agent directly via WebSocket to see if it responds

import { WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' }); // Use test env file

async function testElevenLabsDirectly() {
  console.log('🧪 Testing ElevenLabs agent directly via WebSocket...');
  
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!agentId || !apiKey) {
    console.error('❌ Missing ElevenLabs credentials:');
    console.error('   ELEVENLABS_AGENT_ID:', agentId ? '✅ Set' : '❌ Missing');
    console.error('   ELEVENLABS_API_KEY:', apiKey ? '✅ Set' : '❌ Missing');
    return;
  }
  
  console.log('🔑 ElevenLabs credentials found:');
  console.log('   Agent ID:', agentId);
  console.log('   API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Missing');
  
  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  console.log('🌐 Connecting to:', wsUrl);
  
  const ws = new WebSocket(wsUrl, {
    headers: { 'xi-api-key': apiKey }
  });
  
  let responseReceived = false;
  let connectionEstablished = false;
  
  // Set timeout to fail test if no response in 15 seconds
  const timeout = setTimeout(() => {
    if (!responseReceived) {
      console.error('⏰ TIMEOUT: No agent response received within 15 seconds');
      if (connectionEstablished) {
        console.error('   - WebSocket connected ✅');
        console.error('   - But agent never responded ❌');
        console.error('   - This suggests agent configuration or message structure issues');
      }
      ws.close();
      process.exit(1);
    }
  }, 15000);
  
  ws.on('open', () => {
    connectionEstablished = true;
    console.log('✅ WebSocket connected to ElevenLabs');
    
    // Send initiation data with ALL REQUIRED dynamic variables
    const initData = {
      type: 'conversation_initiation_client_data',
      client_data: {
        dynamic_variables: {
          customer_name: 'Test User',
          organization_name: 'Test Dealership',
          lead_status: 'Active Lead',
          previous_summary: 'Test customer from direct test',
          conversation_context: 'This is a test message to verify agent responsiveness.',
          // REQUIRED GREETING VARIABLES
          time_greeting: 'Good afternoon!',
          day_context: '',
          customer_greeting: 'Test User',
          greeting_opener: 'Hey Test User!',
          greeting_variation: 'How can I help you',
          is_outbound: 'false',
          call_type: 'inbound',
          first_message_dynamic: 'Hey Test User! Good afternoon! How can I help you?'
        },
        phone_number: '+16049085474',
        customer_phone: '+16049085474',
        channel: 'sms',
        lead_id: 'test-lead-123',
        organization_id: 'test-org-456'
      }
    };
    
    console.log('📤 Sending initiation data with corrected structure...');
    console.log('🧪 Dynamic variables:', initData.client_data.dynamic_variables);
    ws.send(JSON.stringify(initData));
  });
  
  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('📨 Received message type:', response.type);
      
      if (response.type === 'conversation_initiation_metadata') {
        console.log('✅ Conversation initiated successfully');
        
        // Wait 2 seconds for dynamic variable processing, then send test message
        setTimeout(() => {
          console.log('📤 Sending test message to agent...');
          
          // Try sending the message with dynamic variables embedded
          const userMessage = {
            type: 'user_message',
            text: 'Hello Jack, this is a test message to check if you respond correctly with context.',
            dynamic_variables: {
              customer_name: 'Test User',
              organization_name: 'Test Dealership',
              time_greeting: 'Good afternoon!',
              day_context: '',
              customer_greeting: 'Test User',
              greeting_opener: 'Hey Test User!',
              greeting_variation: 'How can I help you',
              is_outbound: 'false',
              call_type: 'inbound',
              first_message_dynamic: 'Hey Test User! Good afternoon! How can I help you?'
            }
          };
          
          console.log('📋 Sending message with embedded dynamic variables');
          ws.send(JSON.stringify(userMessage));
        }, 2000);
        
      } else if (response.type === 'agent_response') {
        responseReceived = true;
        clearTimeout(timeout);
        
        const agentResponse = response.agent_response_event?.agent_response || 
                            response.agent_response || 
                            response.message || 
                            'No response text found';
        
        console.log('🎉 SUCCESS: Agent responded!');
        console.log('✅ Agent response:', agentResponse);
        console.log('📊 Full response object keys:', Object.keys(response));
        
        if (agentResponse.toLowerCase().includes('test') || 
            agentResponse.toLowerCase().includes('hello') ||
            agentResponse.toLowerCase().includes('jack')) {
          console.log('🎯 EXCELLENT: Agent response appears contextual and relevant!');
        } else {
          console.log('⚠️ Agent responded but message may not be contextual');
        }
        
        ws.close();
        console.log('✅ Test completed successfully - ElevenLabs agent is working!');
        process.exit(0);
        
      } else {
        console.log('📋 Other message type:', response.type, response);
      }
      
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
      console.log('📄 Raw message:', data.toString());
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clearTimeout(timeout);
    process.exit(1);
  });
  
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
    clearTimeout(timeout);
    
    if (!responseReceived) {
      console.error('❌ FAILED: WebSocket closed without receiving agent response');
      console.error('   This indicates the agent failed to process the message properly');
      process.exit(1);
    }
  });
}

// Run the test
testElevenLabsDirectly();