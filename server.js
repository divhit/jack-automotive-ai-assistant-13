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
            sendSMSReply(phoneNumber, agentResponse);
            broadcastConversationUpdate({
                type: 'sms_sent',
                phoneNumber: phoneNumber,
                message: agentResponse,
                timestamp: new Date().toISOString(),
                sentBy: 'agent'
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

    broadcastConversationUpdate({
      type: 'sms_received',
      phoneNumber: From,
      message: Body,
      timestamp: new Date().toISOString(),
      messageSid: MessageSid,
      sentBy: 'user'
    });

    if (activeConversations.has(From)) {
      console.log('➡️ Existing conversation found. Sending message.');
      const ws = activeConversations.get(From);
      ws.send(JSON.stringify({ type: 'user_message', text: Body }));
    } else {
      console.log('✨ No existing conversation. Creating a new one.');
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
    
    const callPayload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: phoneNumber,
      conversation_initiation_client_data: {
        lead_id: leadId,
        customer_phone: phoneNumber
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
    
    broadcastConversationUpdate({
      type: 'call_initiated',
      phoneNumber,
      leadId,
      conversationId: result.call_sid || result.conversation_id,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({ 
      message: 'Outbound call initiated successfully', 
      callSid: result.call_sid,
      conversationId: result.call_sid || result.conversation_id,
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

const sseConnections = new Set();
function broadcastConversationUpdate(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseConnections.forEach(res => {
    try {
      res.write(message);
    } catch (error) {
      console.error('❌ Error broadcasting to SSE client:', error);
      sseConnections.delete(res);
    }
  });
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

  sseConnections.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', leadId })}\n\n`);

  req.on('close', () => {
    console.log(`📡 SSE connection closed for lead: ${leadId}`);
    sseConnections.delete(res);
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
    activeWsConversations: activeConversations.size
  });
});


// --- SERVER STARTUP ---

app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});

export default app; 