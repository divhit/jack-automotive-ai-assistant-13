import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import twilio from 'twilio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let app;
try {
  app = express();
  console.log('✅ Express app initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Express app:', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/json' }));

// CRITICAL: Serve static files FIRST, before any routes that might fail
// This ensures the React app is served even if there are route registration errors
if (process.env.NODE_ENV === 'production') {
  try {
    app.use(express.static(path.join(__dirname, 'dist')));
    console.log('✅ Serving static files from dist folder');
  } catch (error) {
    console.log('⚠️ Dist folder not found, serving API-only mode');
  }
}

// In-memory store for active conversations (phoneNumber -> WebSocket connection)
const activeConversations = new Map();

// Enhanced conversation context storage for SMS ↔ Voice continuity
const conversationContexts = new Map(); // phoneNumber -> messages array
const conversationMetadata = new Map(); // conversationId -> { phoneNumber, leadId, startTime }
const conversationSummaries = new Map(); // phoneNumber -> { summary, timestamp }

// Lead ID routing management
const phoneToLeadMapping = new Map(); // normalizedPhoneNumber -> current active leadId
const sseConnections = new Map(); // leadId -> response object

// --- PHONE NUMBER NORMALIZATION ---

/**
 * Normalize phone numbers to a consistent format for context sharing
 * Handles both SMS (+16049085474) and Voice ((604) 908-5474) formats
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return phoneNumber;
  
  // If it already starts with +, return as is (don't double-normalize)
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit number, assume North American and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // If it's an 11-digit number starting with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // Default: return the digits with + prefix
  return `+${digitsOnly}`;
}

/**
 * Find conversation history using normalized phone number lookup
 * This ensures SMS and Voice conversations share the same context
 */
function findConversationByPhone(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // First try exact match
  if (conversationContexts.has(normalized)) {
    return { phoneNumber: normalized, history: conversationContexts.get(normalized) };
  }
  
  // Try to find by checking all stored numbers
  for (const [storedPhone, history] of conversationContexts.entries()) {
    if (normalizePhoneNumber(storedPhone) === normalized) {
      return { phoneNumber: storedPhone, history };
    }
  }
  
  return { phoneNumber: normalized, history: [] };
}

// --- CONVERSATION CONTEXT MANAGEMENT ---

function getConversationHistory(phoneNumber) {
  const result = findConversationByPhone(phoneNumber);
  const normalized = normalizePhoneNumber(phoneNumber);
  console.log(`📋 Found ${result.history.length} messages for ${phoneNumber} (normalized: ${normalized})`);
  
  // Debug: Show all stored phone numbers
  if (result.history.length === 0) {
    console.log(`🔍 DEBUG: All stored phone numbers:`, Array.from(conversationContexts.keys()));
  }
  
  return result.history;
}

function addToConversationHistory(phoneNumber, message, sentBy, messageType = 'text') {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  if (!conversationContexts.has(normalized)) {
    conversationContexts.set(normalized, []);
  }
  
  const history = conversationContexts.get(normalized);
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
  
  console.log(`📝 Added ${messageType} message to history for ${normalized} (${sentBy}): ${message.substring(0, 100)}...`);
}

// Store conversation summary from post-call webhook
function storeConversationSummary(phoneNumber, summary) {
  const normalized = normalizePhoneNumber(phoneNumber);
  conversationSummaries.set(normalized, {
    summary,
    timestamp: new Date().toISOString()
  });
  console.log(`📋 Stored conversation summary for ${normalized}:`, summary.substring(0, 100) + '...');
}

// Get conversation summary
function getConversationSummary(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return conversationSummaries.get(normalized);
}

// Get lead data for dynamic variables
function getLeadData(leadId) {
  // In a real application, this would query your database
  // For now, we'll use the static data from subprimeLeads
  const subprimeLeads = [
    {
      id: "test1",
      customerName: "Test User",
      phoneNumber: "(604) 908-5474",
      chaseStatus: "Auto Chase Running",
      fundingReadiness: "Ready",
      sentiment: "Warm",
      vehiclePreference: "SUV"
    },
    {
      id: "sl1", 
      customerName: "John Smith",
      phoneNumber: "(555) 123-4567",
      chaseStatus: "Auto Chase Running",
      fundingReadiness: "Ready",
      sentiment: "Warm",
      vehiclePreference: "SUV"
    }
    // Add more leads as needed
  ];
  
  return subprimeLeads.find(lead => lead.id === leadId);
}

function buildConversationContext(phoneNumber) {
  const history = getConversationHistory(phoneNumber);
  const summaryData = getConversationSummary(phoneNumber);
  
  if (history.length === 0 && !summaryData) {
    console.log(`📋 No conversation history or summary found for ${phoneNumber} (normalized: ${normalizePhoneNumber(phoneNumber)})`);
    return '';
  }
  
  // Separate voice and SMS messages
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text');
  
  let contextText = `CONVERSATION CONTEXT for customer ${phoneNumber}:\n\n`;
  
  // Add conversation summary if available (this is the key improvement!)
  if (summaryData && summaryData.summary) {
    contextText += `CALL SUMMARY: ${summaryData.summary}\n\n`;
  }
  
  // Add recent voice messages (last 3 only to keep context focused)
  if (voiceMessages.length > 0) {
    const recentVoiceMessages = voiceMessages.slice(-3);
    contextText += `RECENT VOICE CONVERSATION (last ${recentVoiceMessages.length} messages):\n`;
    contextText += recentVoiceMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  // Add recent SMS messages (last 3 only)
  if (smsMessages.length > 0) {
    const recentSmsMessages = smsMessages.slice(-3);
    contextText += `RECENT SMS CONVERSATION (last ${recentSmsMessages.length} messages):\n`;
    contextText += recentSmsMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  contextText += `INSTRUCTIONS: Continue this conversation naturally. Use the CALL SUMMARY to understand the customer's main interests and needs. Reference specific details from recent messages. The customer is now texting you, so respond in SMS format. Be helpful and maintain the context from all previous interactions.`;
  
  console.log(`📋 Built conversation context for ${phoneNumber} with summary + ${history.length} total messages (${voiceMessages.length} voice, ${smsMessages.length} SMS):`, contextText.substring(0, 400) + '...');
  return contextText;
}

// Store conversation metadata when a call is initiated
function storeConversationMetadata(conversationId, phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  conversationMetadata.set(conversationId, {
    phoneNumber: normalized,
    leadId,
    startTime: new Date().toISOString()
  });
  console.log(`📝 Stored conversation metadata:`, { conversationId, phoneNumber: normalized, leadId });
}

// Retrieve conversation metadata
function getConversationMetadata(conversationId) {
  return conversationMetadata.get(conversationId);
}

// --- LEAD ID ROUTING MANAGEMENT ---

/**
 * Set the active lead ID for a phone number (called when SSE connection established)
 */
function setActiveLeadForPhone(phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  phoneToLeadMapping.set(normalized, leadId);
  console.log(`🔗 Set active lead ${leadId} for phone ${normalized}`);
}

/**
 * Get the current active lead ID for a phone number
 * Prioritizes active SSE connections over stored metadata
 */
function getActiveLeadForPhone(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // First check if we have an active mapping from SSE connections
  const activeLead = phoneToLeadMapping.get(normalized);
  if (activeLead && sseConnections.has(activeLead)) {
    console.log(`📍 Found active lead ${activeLead} for phone ${normalized}`);
    return activeLead;
  }
  
  // Fall back to conversation metadata lookup
  for (const [convId, metadata] of conversationMetadata.entries()) {
    if (normalizePhoneNumber(metadata.phoneNumber) === normalized) {
      console.log(`📋 Found metadata lead ${metadata.leadId} for phone ${normalized}`);
      return metadata.leadId;
    }
  }
  
  console.log(`❓ No lead ID found for phone ${normalized}`);
  return null;
}

/**
 * Clean up lead mapping when SSE connection closes
 */
function removeActiveLeadForPhone(phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  const currentLead = phoneToLeadMapping.get(normalized);
  if (currentLead === leadId) {
    phoneToLeadMapping.delete(normalized);
    console.log(`🗑️ Removed active lead ${leadId} for phone ${normalized}`);
  }
}

// --- STATEFUL CONVERSATION HANDLER ---

function startConversation(phoneNumber, initialMessage) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const normalized = normalizePhoneNumber(phoneNumber);

  if (!agentId || !apiKey) {
    console.error('❌ Missing ElevenLabs credentials');
    return;
  }

  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  const ws = new WebSocket(wsUrl, {
    headers: { 'xi-api-key': apiKey }
  });

  ws.on('open', () => {
    console.log(`🔗 WebSocket connected for ${phoneNumber} (normalized: ${normalized})`);
    activeConversations.set(normalized, ws);
    
    // Build conversation context from existing history
    const conversationContext = buildConversationContext(phoneNumber);
    
    // Get lead data and build dynamic variables like voice calls do
    const leadId = getActiveLeadForPhone(phoneNumber);
    const leadData = getLeadData(leadId);
    const customerName = leadData?.customerName || `Customer ${phoneNumber}`;
    const summaryData = getConversationSummary(phoneNumber);
    const history = getConversationHistory(phoneNumber);
    const leadStatus = summaryData?.summary ? "Returning Customer" : (history.length > 0 ? "Active Lead" : "New Inquiry");
    const previousSummary = summaryData?.summary || (history.length > 0 ? "Continuing from previous conversation" : "First conversation");
    
    ws.send(JSON.stringify({
      type: 'conversation_initiation_client_data',
      client_data: {
        conversation_context: conversationContext,
        phone_number: phoneNumber,
        channel: 'sms',
        lead_id: leadId,
        // Add dynamic variables like voice calls
        dynamic_variables: {
          conversation_context: conversationContext.length > 500 ? conversationContext.substring(0, 500) + "..." : conversationContext,
          customer_name: customerName,
          lead_status: leadStatus,
          previous_summary: previousSummary
        }
      }
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
            
            // Get the active lead ID for this phone number
            const leadId = getActiveLeadForPhone(phoneNumber);

            broadcastConversationUpdate({
                type: 'sms_sent',
                phoneNumber: phoneNumber,
                message: agentResponse,
                timestamp: new Date().toISOString(),
                sentBy: 'agent',
                leadId: leadId // Use the active lead ID
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
    if (activeConversations.has(normalized)) {
        activeConversations.delete(normalized);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 [${phoneNumber}] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
    if (activeConversations.has(normalized)) {
        activeConversations.delete(normalized);
    }
  });
}


// --- DEBUG ENDPOINTS FOR TESTING ---

// Debug endpoint to clear conversation history
app.post('/api/debug/clear-history', (req, res) => {
  try {
    const { phoneNumber, confirm } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    // Add safety check to prevent accidental clearing
    if (!confirm) {
      return res.status(400).json({ 
        error: 'Clearing conversation history requires confirmation. Add "confirm": true to the request body.',
        warning: 'This will DELETE all voice and SMS conversation history for this phone number!',
        phoneNumber: phoneNumber
      });
    }
    
    const normalized = normalizePhoneNumber(phoneNumber);
    const existingHistory = getConversationHistory(phoneNumber);
    
    if (existingHistory.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No history to clear', 
        normalized,
        clearedMessages: 0
      });
    }
    
    conversationContexts.delete(normalized);
    console.log(`🗑️ Cleared conversation history for ${phoneNumber} (normalized: ${normalized}) - ${existingHistory.length} messages deleted`);
    
    res.json({ 
      success: true, 
      message: 'History cleared', 
      normalized,
      clearedMessages: existingHistory.length,
      warning: 'Voice and SMS conversation history has been permanently deleted!'
    });
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
    
    const normalized = normalizePhoneNumber(phoneNumber);
    const history = getConversationHistory(phoneNumber);
    console.log(`📋 Retrieved ${history.length} messages for ${phoneNumber} (normalized: ${normalized})`);
    
    res.json({ 
      success: true, 
      phoneNumber,
      normalized,
      messageCount: history.length,
      history 
    });
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

// Debug endpoint to set phone-to-lead mapping
app.post('/api/debug/set-lead-mapping', (req, res) => {
  try {
    const { phoneNumber, leadId } = req.body;
    if (!phoneNumber || !leadId) {
      return res.status(400).json({ error: 'Both phoneNumber and leadId are required' });
    }
    
    setActiveLeadForPhone(phoneNumber, leadId);
    
    res.json({ 
      success: true, 
      message: 'Lead mapping set',
      phoneNumber,
      leadId,
      normalized: normalizePhoneNumber(phoneNumber)
    });
  } catch (error) {
    console.error('❌ Error setting lead mapping:', error);
    res.status(500).json({ error: 'Failed to set lead mapping' });
  }
});

// Debug endpoint to manually store a message (for testing)
app.post('/api/debug/store-message', (req, res) => {
  try {
    const { phoneNumber, message, sentBy, type = 'text' } = req.body;
    if (!phoneNumber || !message || !sentBy) {
      return res.status(400).json({ error: 'phoneNumber, message, and sentBy are required' });
    }
    
    addToConversationHistory(phoneNumber, message, sentBy, type);
    
    res.json({ 
      success: true, 
      message: 'Message stored',
      phoneNumber,
      normalized: normalizePhoneNumber(phoneNumber),
      sentBy,
      type
    });
  } catch (error) {
    console.error('❌ Error storing message:', error);
    res.status(500).json({ error: 'Failed to store message' });
  }
});

// Debug endpoint to show all stored conversations
app.get('/api/debug/all-conversations', (req, res) => {
  try {
    const conversations = {};
    for (const [phone, history] of conversationContexts.entries()) {
      conversations[phone] = {
        messageCount: history.length,
        lastMessage: history[history.length - 1]?.content?.substring(0, 100) + '...' || 'No messages'
      };
    }
    
    const metadata = {};
    for (const [convId, meta] of conversationMetadata.entries()) {
      metadata[convId] = meta;
    }
    
    const activeConnections = Array.from(activeConversations.keys());
    
    const phoneToLeadMappings = {};
    for (const [phone, leadId] of phoneToLeadMapping.entries()) {
      phoneToLeadMappings[phone] = leadId;
    }
    
    res.json({
      success: true,
      conversations,
      metadata,
      activeConnections,
      phoneToLeadMappings,
      totalConversations: conversationContexts.size
    });
  } catch (error) {
    console.error('❌ Error getting all conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
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

    const normalizedFrom = normalizePhoneNumber(From);

    // Get the active lead ID for this phone number (prioritizes SSE connections)
    const leadId = getActiveLeadForPhone(From);

    broadcastConversationUpdate({
      type: 'sms_received',
      phoneNumber: From,
      message: Body,
      timestamp: new Date().toISOString(),
      messageSid: MessageSid,
      sentBy: 'user',
      leadId: leadId // Use the active lead ID
    });

    if (activeConversations.has(normalizedFrom)) {
      console.log('➡️ Existing conversation found. Sending message.');
      const ws = activeConversations.get(normalizedFrom);
      addToConversationHistory(From, Body, 'user', 'text');
      ws.send(JSON.stringify({ type: 'user_message', text: Body }));
    } else {
      // Check if we have conversation history from previous voice calls
      const existingHistory = getConversationHistory(From);
      if (existingHistory.length > 0) {
        console.log(`📞➡️📱 Found ${existingHistory.length} previous messages (voice/SMS history). Starting new SMS conversation with context.`);
      } else {
        console.log('✨ No existing conversation or history. Creating a new one.');
      }
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
    // Use normalized phone number to ensure consistency with stored history
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const conversationContext = buildConversationContext(normalizedPhoneNumber);
    
    // Generate a unique conversation ID for tracking
    const tempConversationId = `temp_${Date.now()}_${phoneNumber}`;
    
    const summary = getConversationSummary(normalizedPhoneNumber);
    const messages = getConversationHistory(normalizedPhoneNumber);
    
    // Get actual lead data instead of placeholders
    const leadData = getLeadData(leadId);
    const customerName = leadData?.customerName || `Customer ${phoneNumber}`;
    const leadStatus = summary?.summary ? "Returning Customer" : (messages.length > 0 ? "Active Lead" : "New Inquiry");
    const previousSummary = summary?.summary || (messages.length > 0 ? "Continuing from SMS conversation" : "First conversation");

    const callPayload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: phoneNumber,
      // Dynamic variables must go inside conversation_initiation_client_data for outbound calls!
      conversation_initiation_client_data: {
        lead_id: leadId,
        customer_phone: phoneNumber,
        dynamic_variables: {
          conversation_context: conversationContext.length > 500 ? conversationContext.substring(0, 500) + "..." : conversationContext,
          customer_name: customerName,
          lead_status: leadStatus,
          previous_summary: previousSummary
        }
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

// Twilio SMS Send API (for manual SMS from dashboard text box)
app.post('/api/twilio/send-sms', async (req, res) => {
  try {
    const { to, message, leadId, agentId } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Both "to" and "message" are required' });
    }
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required for context management' });
    }
    
    console.log('📱 Manual SMS send request:', { to, message: message.substring(0, 50) + '...', leadId, agentId });
    
    // Normalize phone number for consistent context storage
    const normalizedPhone = normalizePhoneNumber(to);
    
    // Send SMS via existing Twilio function
    await sendSMSReply(to, message);
    
    // Store in conversation history using existing function
    addToConversationHistory(to, message, 'agent', 'text');
    
    // Broadcast to dashboard using existing SSE system
    broadcastConversationUpdate({
      type: 'sms_sent', 
      phoneNumber: to,
      message: message,
      timestamp: new Date().toISOString(),
      sentBy: 'agent',
      leadId: leadId, // This ensures it goes to the correct dashboard
      status: 'sent'
    });
    
    console.log('✅ Manual SMS sent and broadcasted successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'SMS sent successfully',
      normalizedPhone,
      leadId
    });
    
  } catch (error) {
    console.error('❌ Error sending manual SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
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

      case 'call_ended':
      case 'call_terminated':
      case 'call_completed':
      case 'call_disconnected':
        console.log('📞 Call ended event:', eventData.type, conversationId);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'call_ended',
            conversationId,
            duration: eventData.data?.duration_ms || eventData.data?.call_duration_ms,
            leadId,
            phoneNumber,
            reason: eventData.data?.end_reason || eventData.type,
            timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
          });
        }
        // Clean up metadata after call ends
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
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {})
    });

    // Log the full payload structure for debugging
    console.log('📞 FULL POST-CALL PAYLOAD STRUCTURE:', {
      topLevelKeys: Object.keys(req.body || {}),
      hasConversationId: 'conversation_id' in (req.body || {}),
      hasConversationData: 'conversation' in (req.body || {}),
      hasCallData: 'call' in (req.body || {}),
      hasMetadata: 'metadata' in (req.body || {}),
      hasClientData: 'conversation_initiation_client_data' in (req.body || {}),
      rawBodySample: JSON.stringify(req.body).substring(0, 500) + '...'
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
    
    // Handle new payload structure (type + event_timestamp + data)
    let conversationId, leadId, duration, summary, phoneNumber;
    
    if (eventData.type === 'post_call_transcription' && eventData.data) {
      // New structure: data contains all the conversation details
      const data = eventData.data;
      conversationId = data.conversation_id;
      
      // Extract from conversation_initiation_client_data
      if (data.conversation_initiation_client_data) {
        leadId = data.conversation_initiation_client_data.lead_id;
        phoneNumber = data.conversation_initiation_client_data.customer_phone;
      }
      
      // Extract other fields from data
      duration = data.conversation_duration_ms || data.metadata?.call_duration_secs * 1000;
      summary = data.conversation_summary || data.analysis?.transcript_summary;
      
    } else {
      // Fallback to old structure
      conversationId = eventData.conversation_id || 
                      eventData.conversation?.id || 
                      eventData.call?.conversation_id ||
                      eventData.id;
      
      leadId = eventData.conversation_initiation_client_data?.lead_id ||
              eventData.conversation?.conversation_initiation_client_data?.lead_id ||
              eventData.call?.conversation_initiation_client_data?.lead_id ||
              eventData.metadata?.lead_id ||
              eventData.client_data?.lead_id;
      
      duration = eventData.conversation_duration_ms ||
                eventData.conversation?.duration_ms ||
                eventData.call?.duration_ms ||
                eventData.duration_ms;
      
      summary = eventData.conversation_summary ||
               eventData.conversation?.summary ||
               eventData.call?.summary ||
               eventData.summary;
      
      phoneNumber = eventData.conversation_initiation_client_data?.customer_phone ||
                   eventData.conversation?.conversation_initiation_client_data?.customer_phone ||
                   eventData.call?.conversation_initiation_client_data?.customer_phone ||
                   eventData.metadata?.customer_phone ||
                   eventData.client_data?.customer_phone ||
                   eventData.phone_number ||
                   eventData.to_number;
    }

    console.log('📞 POST-CALL PARSED DETAILS:', {
      conversationId: conversationId || 'MISSING',
      leadId: leadId || 'MISSING',
      phoneNumber: phoneNumber || 'MISSING',
      duration: duration || 'MISSING',
      summary: summary ? (summary.substring(0, 100) + '...') : 'MISSING',
      hasTranscript: !!(eventData.transcript || eventData.conversation?.transcript || eventData.call?.transcript)
    });

    // If we still don't have leadId, try to find it from conversation metadata using conversationId
    if (!leadId && conversationId) {
      const metadata = getConversationMetadata(conversationId);
      if (metadata) {
        leadId = metadata.leadId;
        phoneNumber = phoneNumber || metadata.phoneNumber;
        console.log('📞 Found metadata for conversation:', { conversationId, leadId, phoneNumber });
      }
    }

    // If we have phone number but no leadId, try to find the active lead
    if (!leadId && phoneNumber) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      leadId = getActiveLeadForPhone(normalizedPhone);
      console.log('📞 Found active lead for phone:', { phoneNumber, normalizedPhone, leadId });
    }

    // Extract transcript if available
    let transcript;
    if (eventData.type === 'post_call_transcription' && eventData.data) {
      transcript = eventData.data.transcript;
    } else {
      transcript = eventData.transcript || 
                  eventData.conversation?.transcript || 
                  eventData.call?.transcript;
    }

    // Log transcript details if available
    if (transcript) {
      console.log('📞 POST-CALL TRANSCRIPT:', {
        messageCount: Array.isArray(transcript) ? transcript.length : 'Not array',
        firstFewMessages: Array.isArray(transcript) ? transcript.slice(0, 3) : 'N/A'
      });
    }

    // Store conversation history if we have transcript and phone number
    if (transcript && phoneNumber && Array.isArray(transcript)) {
      const normalizedForStorage = normalizePhoneNumber(phoneNumber);
      console.log('📝 Storing post-call conversation history for:', phoneNumber, '(normalized:', normalizedForStorage + ')');
      transcript.forEach(message => {
        if (message.role && message.message) {
          addToConversationHistory(phoneNumber, message.message, message.role, 'voice');
        }
      });
    }

    // Store conversation summary if we have one
    if (summary && phoneNumber) {
      storeConversationSummary(phoneNumber, summary);
    }

    // Broadcast post-call summary to frontend if we have a lead ID
    if (leadId) {
      const updateData = {
        type: 'post_call_summary',
        conversationId,
        leadId,
        phoneNumber,
        duration,
        summary,
        transcript,
        timestamp: new Date().toISOString()
      };
      
      console.log('📞 Broadcasting post-call update:', {
        leadId,
        hasTranscript: !!transcript,
        summaryLength: summary ? summary.length : 0
      });
      
      broadcastConversationUpdate(updateData);
    } else {
      console.warn('⚠️ No lead ID found for post-call webhook - cannot broadcast to frontend');
    }

    res.status(200).json({
      success: true,
      message: 'Post-call webhook processed successfully',
      parsed: {
        conversationId: !!conversationId,
        leadId: !!leadId,
        phoneNumber: !!phoneNumber,
        duration: !!duration,
        summary: !!summary,
        transcript: !!transcript
      }
    });

  } catch (error) {
    console.error('❌ POST-CALL WEBHOOK ERROR:', error);
    console.error('❌ Error stack:', error.stack);
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
  const { phoneNumber } = req.query; // Get phone number from query params if provided
  
  console.log(`📡 SSE connection established for lead: ${leadId}`, phoneNumber ? `(phone: ${phoneNumber})` : '');
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Store connection by leadId
  sseConnections.set(leadId, res);
  
  // If phone number is provided, set the active lead mapping
  if (phoneNumber) {
    setActiveLeadForPhone(phoneNumber, leadId);
  }
  
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
    
    // Clean up phone-to-lead mapping if this was the active lead
    if (phoneNumber) {
      removeActiveLeadForPhone(phoneNumber, leadId);
    }
    
    clearInterval(heartbeat);
  });
});

// --- TEST AND HEALTHCHECK ---

// Debug endpoint to test post-call webhook parsing
app.post('/api/debug/post-call-webhook', (req, res) => {
  console.log('🧪 DEBUG: Testing post-call webhook parsing with sample payload');
  
  // Create a sample post-call payload structure
  const samplePayload = {
    conversation_id: 'conv_01jyf90tk3e4kvk1pptcw4w9wa',
    conversation_duration_ms: 45000,
    conversation_summary: 'Customer called asking about SUV financing options. Agent provided information about available vehicles and financing terms. Customer expressed interest in scheduling a test drive.',
    conversation_initiation_client_data: {
      lead_id: 'test1',
      customer_phone: '(604) 908-5474',
      conversation_context: 'Previous SMS conversation context...',
      temp_conversation_id: 'temp_1750711949650_(604) 908-5474'
    },
    transcript: [
      {
        role: 'agent',
        message: 'Hi! Hope you\'re having a great day! This is Jack from Driving with Steve...',
        timestamp: '2025-06-23T20:50:00.000Z'
      },
      {
        role: 'user', 
        message: 'Hi Jack, yes I\'m interested in SUV financing.',
        timestamp: '2025-06-23T20:50:15.000Z'
      }
    ],
    call_ended_reason: 'user_hangup',
    timestamp: new Date().toISOString()
  };
  
  // Simulate the webhook processing
  req.body = samplePayload;
  
  // Process using the same logic as the real webhook
  const eventData = req.body;
  
  let conversationId = eventData.conversation_id || 
                      eventData.conversation?.id || 
                      eventData.call?.conversation_id ||
                      eventData.id;
  
  let leadId = eventData.conversation_initiation_client_data?.lead_id ||
              eventData.conversation?.conversation_initiation_client_data?.lead_id ||
              eventData.call?.conversation_initiation_client_data?.lead_id ||
              eventData.metadata?.lead_id ||
              eventData.client_data?.lead_id;
  
  let duration = eventData.conversation_duration_ms ||
                eventData.conversation?.duration_ms ||
                eventData.call?.duration_ms ||
                eventData.duration_ms;
  
  let summary = eventData.conversation_summary ||
               eventData.conversation?.summary ||
               eventData.call?.summary ||
               eventData.summary;
  
  let phoneNumber = eventData.conversation_initiation_client_data?.customer_phone ||
                   eventData.conversation?.conversation_initiation_client_data?.customer_phone ||
                   eventData.call?.conversation_initiation_client_data?.customer_phone ||
                   eventData.metadata?.customer_phone ||
                   eventData.client_data?.customer_phone ||
                   eventData.phone_number ||
                   eventData.to_number;

  let transcript = eventData.transcript || 
                  eventData.conversation?.transcript || 
                  eventData.call?.transcript;

  console.log('🧪 DEBUG: Parsed sample payload:', {
    conversationId,
    leadId,
    phoneNumber,
    duration,
    summaryLength: summary?.length,
    transcriptMessages: Array.isArray(transcript) ? transcript.length : 'Not array'
  });

  // Test broadcasting
  if (leadId) {
    broadcastConversationUpdate({
      type: 'post_call_summary',
      conversationId,
      leadId,
      phoneNumber,
      duration,
      summary,
      transcript,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Debug post-call webhook test completed',
    parsed: {
      conversationId: !!conversationId,
      leadId: !!leadId,
      phoneNumber: !!phoneNumber,
      duration: !!duration,
      summary: !!summary,
      transcript: !!transcript
    },
    samplePayload
  });
});

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
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSseConnections: sseConnections.size,
    activeWsConversations: activeConversations.size,
    storedConversations: conversationMetadata.size
  });
});

// Conversation history endpoint
app.get('/api/conversation-history/:leadId', (req, res) => {
  try {
    const { leadId } = req.params;
    const { phoneNumber } = req.query;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }
    
    let phoneToUse = phoneNumber;
    
    // If no phone number provided, try to get it from lead data
    if (!phoneToUse) {
      const leadData = getLeadData(leadId);
      phoneToUse = leadData?.phoneNumber;
    }
    
    if (!phoneToUse) {
      console.log(`⚠️ No phone number found for lead ${leadId}`);
      return res.json({ 
        messages: [],
        leadId,
        message: 'No phone number associated with this lead'
      });
    }
    
    const messages = getConversationHistory(phoneToUse);
    const summary = getConversationSummary(phoneToUse);
    
    console.log(`📋 API: Retrieved ${messages.length} messages for lead ${leadId} (${phoneToUse})`);
    
    // Convert internal message format to API format
    const formattedMessages = messages.map((msg, index) => ({
      id: `msg-${index}-${Date.now()}`,
      content: msg.content,
      timestamp: msg.timestamp,
      sentBy: msg.sentBy,
      type: msg.type || 'sms',
      status: 'delivered'
    }));
    
    res.json({
      messages: formattedMessages,
      leadId,
      phoneNumber: phoneToUse,
      summary: summary?.summary,
      totalMessages: formattedMessages.length
    });
    
  } catch (error) {
    console.error('❌ Error retrieving conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve conversation history',
      details: error.message 
    });
  }
});

// ElevenLabs Conversation Initiation Webhook
app.post('/api/webhooks/elevenlabs/conversation-initiation', (req, res) => {
  console.log('🔄 ElevenLabs Conversation Initiation Webhook received:', {
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: Object.keys(req.headers)
  });

  try {
    const { caller_id, agent_id, called_number, call_sid } = req.body;
    
    if (!caller_id) {
      console.error('❌ Missing caller_id in webhook request');
      return res.status(400).json({ error: 'Missing caller_id' });
    }

    const normalizedPhone = normalizePhoneNumber(caller_id);
    console.log(`📞 Building conversation initiation data for ${caller_id} (normalized: ${normalizedPhone})`);

    // Get the active lead for this phone number
    const activeLead = getActiveLeadForPhone(normalizedPhone);
    console.log(`🔍 Active lead for ${normalizedPhone}:`, activeLead);
    
    // Build conversation context
    const conversationContext = buildConversationContext(caller_id);
    const summary = getConversationSummary(normalizedPhone);
    const messages = getConversationHistory(caller_id);
    
    console.log(`🧪 DEBUG: conversationContext length: ${conversationContext.length}`);
    console.log(`🧪 DEBUG: activeLead:`, activeLead);
    
    // Get actual lead data if we have an active lead
    const leadData = activeLead ? getLeadData(activeLead) : null;
    console.log(`🧪 DEBUG: leadData:`, leadData);
    
    const customerName = leadData?.customerName || "Customer";
    const leadStatus = summary?.summary ? "Returning Customer" : (messages.length > 0 ? "Active Lead" : "New Inquiry");
    const previousSummary = summary?.summary || (messages.length > 0 ? "Continuing from SMS conversation" : "First conversation");

    // Keep the conversation context simple - don't add extra formatting that might break ElevenLabs
    const finalContext = conversationContext.length > 500 ? conversationContext.substring(0, 500) + "..." : conversationContext;
    
    // Build the response in the format ElevenLabs expects (keeping it simple)
    const response = {
      dynamic_variables: {
        conversation_context: finalContext,
        customer_name: customerName,
        lead_status: leadStatus,
        previous_summary: previousSummary
      }
    };
    
    console.log(`🧪 DEBUG: Final response variables:`, {
      conversation_context_length: finalContext.length,
      customer_name: customerName,
      lead_status: leadStatus,
      previous_summary_length: previousSummary.length
    });

    console.log('✅ Returning conversation initiation data:', {
      caller_id,
      contextLength: conversationContext.length,
      summaryLength: summary?.summary?.length || 0,
      messageCount: messages.length
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error processing conversation initiation webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch-all handler: send back React's index.html file in production
if (process.env.NODE_ENV === 'production') {
  try {
    app.get('*', (req, res) => {
      try {
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        console.log(`📄 Serving React app for: ${req.url}`);
        
        // Check if file exists before trying to send it
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          console.error('❌ dist/index.html not found!');
          // Fallback: send a simple API-only response
          res.status(404).json({
            error: 'React app not found',
            message: 'Jack Automotive AI Assistant API',
            status: 'running',
            mode: 'api-only',
            endpoints: {
              health: '/api/health',
              webhooks: {
                sms: '/api/webhooks/twilio/sms/incoming',
                voice: '/api/webhooks/twilio/voice/status',
                postCall: '/api/webhooks/elevenlabs/post-call'
              }
            }
          });
        }
      } catch (error) {
        console.error('❌ Error serving static files:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
      }
    });
    console.log('✅ Catch-all route registered successfully');
  } catch (routeError) {
    console.error('❌ Failed to register catch-all route:', routeError);
    
    // Fallback: manually handle all requests
    app.use((req, res) => {
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          error: 'React app not found',
          message: 'Fallback handler active'
        });
      }
    });
  }
}

// --- SERVER STARTUP ---

try {
  app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
  });
} catch (error) {
  console.error('❌ Error starting server:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}

export default app;