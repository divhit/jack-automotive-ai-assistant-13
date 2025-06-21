import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import twilio from 'twilio';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/json' }));

// In-memory store for active conversations (phoneNumber -> WebSocket connection)
const activeConversations = new Map();

// Enhanced conversation context storage for SMS ↔ Voice continuity
const conversationContexts = new Map(); // phoneNumber -> messages array
const conversationMetadata = new Map(); // conversationId -> { phoneNumber, leadId, startTime }

// --- CONVERSATION CONTEXT MANAGEMENT ---

function getConversationHistory(phoneNumber) {
  return conversationContexts.get(phoneNumber) || [];
}

function addToConversationHistory(phoneNumber, message, sentBy, messageType = 'text') {
  if (!conversationContexts.has(phoneNumber)) {
    conversationContexts.set(phoneNumber, []);
  }
  
  const history = conversationContexts.get(phoneNumber);
  history.push({
    content: message,
    sentBy: sentBy,
    timestamp: new Date().toISOString(),
    type: messageType
  });
  
  // Keep only last 50 messages to prevent memory issues
  if (history.length > 50) {
    history.shift();
  }
}

function buildConversationContext(phoneNumber) {
  const history = getConversationHistory(phoneNumber);
  if (history.length === 0) {
    console.log(`📋 No conversation history found for ${phoneNumber}`);
    return '';
  }
  
  const contextText = `Previous conversation with customer ${phoneNumber}:\n\n` +
    history.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'} (${msg.type}): ${msg.content}`
    ).join('\n') +
    `\n\nPlease continue this conversation naturally, maintaining context from the above messages.`;
  
  console.log(`📋 Built conversation context for ${phoneNumber}:`, contextText.substring(0, 200) + '...');
  return contextText;
}

// Store conversation metadata when a call is initiated
function storeConversationMetadata(conversationId, phoneNumber, leadId) {
  conversationMetadata.set(conversationId, {
    phoneNumber,
    leadId,
    startTime: new Date().toISOString()
  });
  console.log(`📝 Stored conversation metadata:`, { conversationId, phoneNumber, leadId });
}

// Retrieve conversation metadata
function getConversationMetadata(conversationId) {
  return conversationMetadata.get(conversationId);
}

// --- STATEFUL CONVERSATION HANDLER ---

function startConversation(phoneNumber, initialMessage) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || !apiKey) {
    console.error('❌ Missing ElevenLabs credentials');
    return;
  }

  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  const ws = new WebSocket(wsUrl, {
    headers: { 'xi-api-key': apiKey }
  });

  ws.on('open', () => {
    console.log(`🔗 WebSocket connected for ${phoneNumber}`);
    activeConversations.set(phoneNumber, ws);
    ws.send(JSON.stringify({
      type: 'conversation_initiation_client_data'
    }));
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log(`📨 [${phoneNumber}] Received message type:`, response.type);

      if (response.type === 'conversation_initiation_metadata') {
        console.log(`✅ [${phoneNumber}] Conversation initiated. Sending first message.`);
        ws.send(JSON.stringify({
          type: 'user_message',
          text: initialMessage
        }));
      } else if (response.type === 'agent_response') {
        const agentResponse = response.agent_response_event?.agent_response || '';
        if (agentResponse) {
            console.log(`✅ [${phoneNumber}] Agent response received:`, agentResponse);
            addToConversationHistory(phoneNumber, agentResponse, 'agent', 'text');
            sendSMSReply(phoneNumber, agentResponse);
            // Try to find a lead ID for this phone number from existing metadata
            let leadId = null;
            for (const [convId, metadata] of conversationMetadata.entries()) {
              if (metadata.phoneNumber === phoneNumber) {
                leadId = metadata.leadId;
                break;
              }
            }

            broadcastConversationUpdate({
                type: 'sms_sent',
                phoneNumber: phoneNumber,
                message: agentResponse,
                timestamp: new Date().toISOString(),
                sentBy: 'agent',
                leadId: leadId // Add lead ID if found
            });
        }
      } else if (response.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          event_id: response.ping_event.event_id
        }));
      }
    } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.error('❌ Raw message:', data.toString());
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ [${phoneNumber}] WebSocket error:`, error);
    if (activeConversations.has(phoneNumber)) {
        activeConversations.delete(phoneNumber);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 [${phoneNumber}] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
    if (activeConversations.has(phoneNumber)) {
        activeConversations.delete(phoneNumber);
    }
  });
}


// --- DEBUG ENDPOINTS FOR TESTING ---

// Debug endpoint to clear conversation history
app.post('/api/debug/clear-history', (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    conversationContexts.delete(phoneNumber);
    console.log(`🗑️ Cleared conversation history for ${phoneNumber}`);
    
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    console.error('❌ Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Debug endpoint to get conversation history
app.post('/api/debug/get-history', (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const history = getConversationHistory(phoneNumber);
    console.log(`📋 Retrieved ${history.length} messages for ${phoneNumber}`);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Debug endpoint to store conversation metadata
app.post('/api/debug/store-metadata', (req, res) => {
  try {
    const { conversationId, phoneNumber, leadId } = req.body;
    if (!conversationId || !phoneNumber || !leadId) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    storeConversationMetadata(conversationId, phoneNumber, leadId);
    
    res.json({ success: true, message: 'Metadata stored' });
  } catch (error) {
    console.error('❌ Error storing metadata:', error);
    res.status(500).json({ error: 'Failed to store metadata' });
  }
});

// --- WEBHOOKS AND API ENDPOINTS ---

// Twilio SMS Incoming Webhook
app.post('/api/webhooks/twilio/sms/incoming', async (req, res) => {
  console.log('📱 Twilio SMS Incoming Webhook received:', req.body);
  
  try {
    const { From, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      console.error('❌ Missing required SMS data');
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    
    console.log('✅ Incoming SMS processed:', { from: From, body: Body, messageSid: MessageSid });

    // Try to find a lead ID for this phone number from existing metadata
    let leadId = null;
    for (const [convId, metadata] of conversationMetadata.entries()) {
      if (metadata.phoneNumber === From) {
        leadId = metadata.leadId;
        break;
      }
    }

    broadcastConversationUpdate({
      type: 'sms_received',
      phoneNumber: From,
      message: Body,
      timestamp: new Date().toISOString(),
      messageSid: MessageSid,
      sentBy: 'user',
      leadId: leadId // Add lead ID if found
    });

    if (activeConversations.has(From)) {
      console.log('➡️ Existing conversation found. Sending message.');
      const ws = activeConversations.get(From);
      addToConversationHistory(From, Body, 'user', 'text');
      ws.send(JSON.stringify({ type: 'user_message', text: Body }));
    } else {
      console.log('✨ No existing conversation. Creating a new one.');
      addToConversationHistory(From, Body, 'user', 'text');
      startConversation(From, Body);
    }
    
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    
  } catch (error) {
    console.error('❌ Error processing incoming SMS:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// Twilio SMS Status Webhook
app.post('/api/webhooks/twilio/sms/status', (req, res) => {
  console.log('📊 Twilio SMS Status Webhook received:', req.body);
  res.sendStatus(200);
});

// ElevenLabs Outbound Call API (for Voice, using Native Integration)
app.post('/api/elevenlabs/outbound-call', async (req, res) => {
  console.log('📞 Outbound call request received for native integration:', req.body);
  
  try {
    const { phoneNumber, leadId } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    
    console.log('🔐 Environment check:', { 
      hasApiKey: !!apiKey, 
      hasAgentId: !!agentId,
      hasPhoneNumberId: !!phoneNumberId,
      agentIdLength: agentId?.length 
    });
    
    if (!apiKey || !agentId || !phoneNumberId) {
      console.error('❌ Missing credentials for native outbound call. Ensure ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_PHONE_NUMBER_ID are set.');
      return res.status(500).json({ error: 'Server configuration error for voice calls. Missing required environment variables.' });
    }

    // Use the exact API specification from ElevenLabs documentation
    const elevenlabsApiUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
    
    // Get conversation context for seamless SMS ↔ Voice transition
    const conversationContext = buildConversationContext(phoneNumber);
    
    // Generate a unique conversation ID for tracking
    const tempConversationId = `temp_${Date.now()}_${phoneNumber}`;
    
    const callPayload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: phoneNumber,
      conversation_initiation_client_data: {
        lead_id: leadId,
        customer_phone: phoneNumber,
        conversation_context: conversationContext,
        temp_conversation_id: tempConversationId // Add this for tracking
      }
    };

    console.log(`📞 Initiating ElevenLabs native call to ${phoneNumber}`);
    console.log(`📞 Using phone number ID: ${phoneNumberId}`);
    console.log(`📞 Call payload:`, JSON.stringify(callPayload, null, 2));

    const response = await fetch(elevenlabsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(callPayload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Failed to initiate native call:', response.status, errorBody);
        return res.status(response.status).json({ 
          error: 'Failed to initiate call via ElevenLabs API.', 
          details: errorBody,
          payload: callPayload
        });
    }
    
    const result = await response.json();
    console.log('✅ Outbound native call initiated via ElevenLabs:', result);
    
    // Store conversation metadata for webhook processing
    const conversationId = result.call_sid || result.conversation_id || tempConversationId;
    storeConversationMetadata(conversationId, phoneNumber, leadId);
    
    broadcastConversationUpdate({
      type: 'call_initiated',
      phoneNumber,
      leadId,
      conversationId,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({ 
      message: 'Outbound call initiated successfully', 
      callSid: result.call_sid,
      conversationId,
      ...result 
    });
    
  } catch (error) {
    console.error('❌ Error initiating outbound call:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to initiate call: ' + error.message,
      stack: error.stack
    });
  }
});

// Internal API for broadcasting conversation updates from Next.js webhooks
app.post('/api/internal/broadcast', (req, res) => {
  try {
    const data = req.body;
    console.log('📡 Internal broadcast request:', data);
    
    broadcastConversationUpdate(data);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error in internal broadcast:', error);
    res.status(500).json({ error: error.message });
  }
});

// ElevenLabs Conversation Events Webhook (moved from Next.js API route)
app.post('/api/webhooks/elevenlabs/conversation-events', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const signature = req.headers['xi-signature'];
    const payload = JSON.stringify(req.body);

    console.log('🔔 WEBHOOK RECEIVED:', {
      timestamp: new Date().toISOString(),
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {}),
      signature: signature ? 'Present' : 'MISSING',
      payloadLength: payload.length,
      eventType: req.body?.type
    });

    const webhookSecret = process.env.ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!webhookSecret) {
      console.error('❌ ElevenLabs conversation events webhook secret not configured');
      return res.status(500).json({ error: 'Conversation events webhook secret not configured' });
    }

    // For debugging, let's temporarily disable signature validation
    if (!signature) {
      console.warn('⚠️ Missing ElevenLabs signature header - continuing for debugging');
    } else {
      console.log('🔐 Webhook signature present:', signature.substring(0, 20) + '...');
    }

    // Verify webhook signature (simplified for now)
    // TODO: Implement proper signature verification if needed
    console.log('🔐 Webhook signature verification - using simplified approach (allowing all)');

    const eventData = req.body;

    // Validate agent ID
    if (eventData.data?.agent_id && eventData.data.agent_id !== agentId) {
      console.error('❌ Invalid agent ID:', eventData.data.agent_id);
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    console.log('📡 Processing ElevenLabs conversation event:', {
      type: eventData.type,
      conversationId: eventData.data?.conversation_id,
      timestamp: eventData.event_timestamp
    });

    // Extract conversation ID
    const conversationId = eventData.data?.conversation_id;
    
    // Try to get metadata from our store
    let metadata = conversationId ? getConversationMetadata(conversationId) : null;
    
    // If no metadata found, try to extract from conversation_initiation_client_data
    if (!metadata && eventData.data?.conversation_initiation_client_data) {
      const clientData = eventData.data.conversation_initiation_client_data;
      const leadId = clientData.lead_id;
      const phoneNumber = clientData.customer_phone;
      const tempId = clientData.temp_conversation_id;
      
      if (leadId && phoneNumber) {
        // Store this metadata for future events
        storeConversationMetadata(conversationId, phoneNumber, leadId);
        metadata = { phoneNumber, leadId };
        
        // Also check if we have a temp ID mapping
        if (tempId) {
          const tempMetadata = getConversationMetadata(tempId);
          if (tempMetadata) {
            // Transfer metadata from temp to real conversation ID
            storeConversationMetadata(conversationId, tempMetadata.phoneNumber, tempMetadata.leadId);
            conversationMetadata.delete(tempId);
          }
        }
      }
    }
    
    // Extract lead ID and phone number from metadata or event data
    const leadId = metadata?.leadId || 
                   eventData.data?.conversation_initiation_client_data?.lead_id ||
                   eventData.data?.metadata?.lead_id;
                   
    const phoneNumber = metadata?.phoneNumber || 
                        eventData.data?.conversation_initiation_client_data?.customer_phone ||
                        eventData.data?.metadata?.phone_number ||
                        eventData.data?.to_phone_number;
    
    console.log('🔍 WEBHOOK DETAILS:', {
      eventType: eventData.type,
      leadId: leadId || 'MISSING',
      phoneNumber: phoneNumber || 'MISSING',
      conversationId: conversationId || 'MISSING',
      hasMessage: !!eventData.data?.message,
      speaker: eventData.data?.speaker,
      metadata: metadata
    });

    // Handle different event types
    switch (eventData.type) {
      case 'conversation_started':
        console.log('🚀 Conversation started:', conversationId);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'conversation_started',
            conversationId,
            phoneNumber,
            leadId,
            timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
          });
        }
        break;

      case 'conversation_ended':
        console.log('🏁 Conversation ended:', conversationId);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'conversation_ended',
            conversationId,
            duration: eventData.data?.duration_ms,
            leadId,
            timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
          });
        }
        // Clean up metadata after conversation ends
        if (conversationId) {
          conversationMetadata.delete(conversationId);
        }
        break;

      case 'user_message':
      case 'user_transcript':
        const userMessage = eventData.data?.message || eventData.data?.transcript;
        console.log('💬 User voice message:', userMessage?.substring(0, 50));
        if (userMessage && phoneNumber) {
          addToConversationHistory(phoneNumber, userMessage, 'user', 'voice');
          if (leadId) {
            broadcastConversationUpdate({
              type: 'voice_received',
              phoneNumber,
              message: userMessage,
              timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString(),
              conversationId,
              sentBy: 'user',
              leadId
            });
          }
        }
        break;

      case 'agent_message':
      case 'agent_response':
        const agentMessage = eventData.data?.message || eventData.data?.response;
        console.log('🤖 Agent voice message:', agentMessage?.substring(0, 50));
        if (agentMessage && phoneNumber) {
          addToConversationHistory(phoneNumber, agentMessage, 'agent', 'voice');
          if (leadId) {
            broadcastConversationUpdate({
              type: 'voice_sent',
              phoneNumber,
              message: agentMessage,
              timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString(),
              conversationId,
              sentBy: 'agent',
              leadId
            });
          }
        }
        break;

      case 'interruption':
        console.log('⚡ Interruption detected:', eventData.data?.metadata?.interruption_type);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'interruption',
            conversationId,
            interruptionType: eventData.data?.metadata?.interruption_type,
            leadId,
            timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString()
          });
        }
        break;

      case 'silence_detected':
        const silenceDuration = eventData.data?.metadata?.silence_duration_ms;
        if (silenceDuration && silenceDuration > 5000 && leadId) {
          console.log('🤐 Silence detected:', silenceDuration, 'ms');
          broadcastConversationUpdate({
            type: 'silence_detected',
            conversationId,
            duration: silenceDuration,
            leadId,
            timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString()
          });
        }
        break;

      default:
        console.log('🤷 Unknown event type:', eventData.type);
        // Log full event data for unknown types to help debug
        console.log('📋 Full event data:', JSON.stringify(eventData, null, 2));
    }

    res.status(200).json({
      success: true,
      message: 'Conversation event processed successfully',
      eventType: eventData.type
    });

  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error);
    console.error('❌ Processing time:', Date.now() - startTime, 'ms');
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET endpoint for webhook health check
app.get('/api/webhooks/elevenlabs/conversation-events', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'elevenlabs-conversation-events-webhook',
    timestamp: new Date().toISOString(),
    environment: {
      hasWebhookSecret: !!process.env.ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET,
      hasAgentId: !!process.env.ELEVENLABS_AGENT_ID
    }
  });
});

// ElevenLabs Post-Call Webhook
app.post('/api/webhooks/elevenlabs/post-call', async (req, res) => {
  try {
    const signature = req.headers['xi-signature'];
    const payload = JSON.stringify(req.body);

    console.log('📞 POST-CALL WEBHOOK RECEIVED:', {
      timestamp: new Date().toISOString(),
      signature: signature ? 'Present' : 'MISSING',
      payloadLength: payload.length,
      conversationId: req.body?.conversation_id
    });

    const webhookSecret = process.env.ELEVENLABS_POST_CALL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ ElevenLabs post-call webhook secret not configured');
      return res.status(500).json({ error: 'Post-call webhook secret not configured' });
    }

    // For debugging, let's temporarily disable signature validation
    if (!signature) {
      console.warn('⚠️ Missing ElevenLabs post-call signature header - continuing for debugging');
    } else {
      console.log('🔐 Post-call webhook signature present:', signature.substring(0, 20) + '...');
    }

    const eventData = req.body;
    const conversationId = eventData.conversation_id;
    const leadId = eventData.conversation_initiation_client_data?.lead_id;

    console.log('📞 POST-CALL DETAILS:', {
      conversationId: conversationId || 'MISSING',
      leadId: leadId || 'MISSING',
      duration: eventData.conversation_duration_ms,
      summary: eventData.conversation_summary?.substring(0, 100) + '...'
    });

    // Broadcast post-call summary to frontend if we have a lead ID
    if (leadId) {
      broadcastConversationUpdate({
        type: 'post_call_summary',
        conversationId,
        leadId,
        duration: eventData.conversation_duration_ms,
        summary: eventData.conversation_summary,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Post-call webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ POST-CALL WEBHOOK ERROR:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// --- HELPER FUNCTIONS and UTILITIES ---

async function sendSMSReply(to, message) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Missing Twilio credentials for SMS reply');
      return;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SMS reply sent:', { to, messageSid: result.sid });
    } else {
      console.error('❌ Failed to send SMS reply:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error sending SMS reply:', error);
  }
}

const sseConnections = new Map(); // Change from Set to Map to track by leadId

function broadcastConversationUpdate(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  console.log('📡 Broadcasting update:', {
    type: data.type,
    leadId: data.leadId || 'NONE',
    activeConnections: Array.from(sseConnections.keys()),
    messageLength: message.length
  });
  
  // If data has leadId, only send to connections watching that lead
  if (data.leadId) {
    const connection = sseConnections.get(data.leadId);
    if (connection) {
      try {
        connection.write(message);
        console.log(`✅ Sent update to lead ${data.leadId}`);
      } catch (error) {
        console.error('❌ Error broadcasting to SSE client:', error);
        sseConnections.delete(data.leadId);
      }
    } else {
      console.log(`❌ No SSE connection found for lead ${data.leadId}`);
    }
  } else {
    // Broadcast to all connections if no specific leadId
    console.log(`📡 Broadcasting to all ${sseConnections.size} connections`);
    sseConnections.forEach((res, leadId) => {
      try {
        res.write(message);
        console.log(`✅ Sent update to lead ${leadId}`);
      } catch (error) {
        console.error('❌ Error broadcasting to SSE client:', error);
        sseConnections.delete(leadId);
      }
    });
  }
}

// Server-Sent Events endpoint for real-time UI updates
app.get('/api/stream/conversation/:leadId', (req, res) => {
  const { leadId } = req.params;
  console.log(`📡 SSE connection established for lead: ${leadId}`);
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Store connection by leadId
  sseConnections.set(leadId, res);
  res.write(`data: ${JSON.stringify({ type: 'connected', leadId })}\n\n`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    console.log(`📡 SSE connection closed for lead: ${leadId}`);
    sseConnections.delete(leadId);
    clearInterval(heartbeat);
  });
});

// --- TEST AND HEALTHCHECK ---

// Test endpoint for stateful conversations
app.post('/api/test/conversation', (req, res) => {
  const { phoneNumber, message } = req.body;
  if (!phoneNumber || !message) {
    return res.status(400).json({ error: 'Both phoneNumber and message are required.' });
  }

  console.log(`🧪 Test: Simulating incoming SMS from ${phoneNumber}`);
  
  if (activeConversations.has(phoneNumber)) {
    const ws = activeConversations.get(phoneNumber);
    ws.send(JSON.stringify({ type: 'user_message', text: message }));
    res.json({ success: true, message: 'Test message sent to existing conversation.' });
  } else {
    startConversation(phoneNumber, message);
    res.json({ success: true, message: 'New conversation started with test message.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSseConnections: sseConnections.size,
    activeWsConversations: activeConversations.size,
    storedConversations: conversationMetadata.size
  });
});


// --- SERVER STARTUP ---

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});

export default app; 