# 🎯 ElevenLabs + Twilio + Web Chat: Complete Implementation Guide

> **⚠️ CONFIDENTIAL**: This document contains detailed implementation specifics. Do not commit to public repositories.

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Dynamic Variables System](#dynamic-variables-system)  
3. [Context Preservation Strategy](#context-preservation-strategy)
4. [API Endpoints & Webhooks](#api-endpoints--webhooks)
5. [Database Schema](#database-schema)
6. [Frontend Integration](#frontend-integration)
7. [Environment Setup](#environment-setup)
8. [Implementation Steps](#implementation-steps)
9. [Testing & Debugging](#testing--debugging)
10. [Common Issues & Solutions](#common-issues--solutions)

---

## 📐 Architecture Overview

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   ElevenLabs    │    │     Twilio      │
│  (React App)    │    │  (Voice Agent)  │    │   (SMS/Voice)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Chat Interface│    │ • ConvAI Agent  │    │ • SMS Webhooks  │ 
│ • Voice Controls│◄──►│ • Dynamic Vars  │◄──►│ • Voice Status  │
│ • Real-time UI  │    │ • Context Mgmt  │    │ • Call Routing  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐                │
         └──────────────►│   Node.js API   │◄───────────────┘
                        │   (server.js)   │
                        ├─────────────────┤
                        │ • Context Store │
                        │ • Lead Mgmt     │
                        │ • SSE Streaming │
                        │ • Persistence   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │    Supabase     │
                        │   (Database)    │
                        ├─────────────────┤
                        │ • Leads         │
                        │ • Conversations │
                        │ • Call Sessions │
                        │ • Analytics     │
                        └─────────────────┘
```

### Communication Flow
1. **Web Chat** → Node.js → ElevenLabs WebSocket
2. **Voice Calls** → ElevenLabs → Twilio → Webhooks → Node.js  
3. **SMS** → Twilio → Webhooks → Node.js → Context Injection
4. **Real-time Updates** → Server-Sent Events → React UI

---

## 🎛️ Dynamic Variables System

### Core Concept
ElevenLabs agents use **dynamic variables** to maintain context across all communication channels. These variables are injected at conversation start and updated in real-time.

### Variable Structure
```javascript
const dynamicVariables = {
  // Primary context from SMS/voice history
  conversation_context: truncatedContext,
  
  // Lead information
  customer_name: leadData?.customerName || "Customer",
  phone_number_normalized: normalizePhoneNumber(phoneNumber),
  
  // Conversation state
  lead_status: summaryExists ? "Returning Customer" : "New Inquiry",
  previous_summary: summaryData?.summary || "First conversation",
  
  // Current interaction details
  current_channel: "voice|sms|web",
  last_interaction: mostRecentMessage?.timestamp,
  
  // Vehicle/financing context (if available)
  vehicle_interest: leadData?.vehicleInterest?.type || "Not specified",
  budget_range: formatBudgetRange(leadData?.vehicleInterest?.budget),
  
  // Lead qualification state
  funding_readiness: leadData?.fundingReadiness || "Unknown",
  credit_score_range: leadData?.creditProfile?.scoreRange || "Unknown"
};
```

### Variable Injection Points

#### For Voice Calls (Outbound)
```javascript
const callPayload = {
  agent_id: agentId,
  agent_phone_number_id: phoneNumberId,
  to_number: phoneNumber,
  conversation_initiation_client_data: {
    lead_id: leadId,
    customer_phone: phoneNumber,
    dynamic_variables: dynamicVariables // ← Variables go here
  }
};
```

#### For Voice Calls (Inbound - via webhook)
```javascript
// ElevenLabs calls this webhook when receiving inbound calls
app.post('/api/webhooks/elevenlabs/conversation-initiation', (req, res) => {
  const { caller_id } = req.body;
  const dynamicVariables = buildDynamicVariables(caller_id);
  
  res.json({ dynamic_variables: dynamicVariables });
});
```

#### For SMS Conversations (WebSocket)
```javascript
ws.send(JSON.stringify({
  type: 'conversation_initiation_client_data',
  dynamic_variables: dynamicVariables, // ← Root level for SMS
  client_data: {
    conversation_context: conversationContext,
    phone_number: phoneNumber,
    channel: 'sms',
    lead_id: leadId
  }
}));
```

---

## 🔄 Context Preservation Strategy

### The Challenge
Maintaining conversation continuity across three channels:
- **Web Chat**: Browser-based text interface
- **SMS**: Twilio-managed text messages  
- **Voice**: ElevenLabs-managed phone calls

### Solution Architecture

#### 1. Unified Conversation History
```javascript
// Global conversation storage (in-memory + Supabase persistence)
const conversationHistories = new Map(); // phoneNumber -> ConversationMessage[]

interface ConversationMessage {
  id: string;
  type: 'sms' | 'voice' | 'web' | 'system';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system';
  channel: 'sms' | 'voice' | 'web';
  metadata?: {
    twilioMessageSid?: string;
    elevenlabsConversationId?: string;
    callDuration?: number;
    [key: string]: any;
  };
}
```

#### 2. Context Building Function
```javascript
function buildConversationContext(phoneNumber) {
  const history = getConversationHistory(phoneNumber);
  const summaryData = getConversationSummary(phoneNumber);
  
  // Separate by channel for organized context
  const voiceMessages = history.filter(msg => msg.channel === 'voice');
  const smsMessages = history.filter(msg => msg.channel === 'sms');
  const webMessages = history.filter(msg => msg.channel === 'web');
  
  let contextText = `CONVERSATION CONTEXT for ${phoneNumber}:\n\n`;
  
  // Add call summary (most important context)
  if (summaryData?.summary) {
    contextText += `CALL SUMMARY: ${summaryData.summary}\n\n`;
  }
  
  // Add recent messages from each channel (last 3 per channel)
  if (voiceMessages.length > 0) {
    const recent = voiceMessages.slice(-3);
    contextText += `RECENT VOICE (${recent.length} msgs):\n`;
    contextText += recent.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  if (smsMessages.length > 0) {
    const recent = smsMessages.slice(-3);
    contextText += `RECENT SMS (${recent.length} msgs):\n`;
    contextText += recent.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  if (webMessages.length > 0) {
    const recent = webMessages.slice(-3);
    contextText += `RECENT WEB CHAT (${recent.length} msgs):\n`;
    contextText += recent.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  // Critical instruction for context continuity
  contextText += `CRITICAL INSTRUCTIONS: 
- FIRST: Read the CALL SUMMARY above - contains essential customer details
- If summary mentions specific vehicles/budgets, DO NOT ask again
- Continue naturally from where conversation left off across ALL channels
- Reference specific details from recent messages
- Maintain context from all previous interactions`;
  
  return contextText;
}
```

#### 3. Real-time Context Updates
```javascript
// When SMS received during active voice call
function injectSMSIntoActiveCall(phoneNumber, smsContent) {
  const activeConversation = getActiveConversation(phoneNumber);
  
  if (activeConversation) {
    // Inject via ElevenLabs client events
    activeConversation.sendClientEvent({
      type: 'context_update',
      data: {
        event_type: 'sms_received',
        message: smsContent,
        instruction: `Customer just sent SMS: "${smsContent}". Acknowledge naturally.`
      }
    });
  }
}
```

---

## 🔌 API Endpoints & Webhooks

### Required Environment Variables
```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m
ELEVENLABS_PHONE_NUMBER_ID=pn_your_phone_number_id
ELEVENLABS_POST_CALL_WEBHOOK_SECRET=your_webhook_secret

# Twilio Configuration  
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Core API Endpoints

#### 1. Outbound Voice Calls
```javascript
// POST /api/elevenlabs/outbound-call
app.post('/api/elevenlabs/outbound-call', async (req, res) => {
  const { phoneNumber, leadId } = req.body;
  
  // Build conversation context from existing SMS/web chat
  const conversationContext = buildConversationContext(phoneNumber);
  const dynamicVariables = buildDynamicVariables(phoneNumber, leadId);
  
  const callPayload = {
    agent_id: process.env.ELEVENLABS_AGENT_ID,
    agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
    to_number: phoneNumber,
    conversation_initiation_client_data: {
      lead_id: leadId,
      customer_phone: phoneNumber,
      dynamic_variables: dynamicVariables
    }
  };
  
  const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify(callPayload)
  });
  
  // Handle response and store session data
});
```

#### 2. SMS Sending (Direct Twilio)
```javascript
// POST /api/twilio/send-sms
app.post('/api/twilio/send-sms', async (req, res) => {
  const { to, message, leadId } = req.body;
  
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to
  });
  
  // Store in conversation history
  addToConversationHistory(to, {
    type: 'sms',
    content: message,
    sentBy: 'agent',
    channel: 'sms',
    metadata: { twilioMessageSid: result.sid }
  });
  
  // Broadcast to real-time UI
  broadcastConversationUpdate({
    type: 'sms_sent',
    phoneNumber: to,
    message: message,
    leadId: leadId
  });
});
```

### Critical Webhooks

#### 1. ElevenLabs Conversation Initiation
```javascript
// POST /api/webhooks/elevenlabs/conversation-initiation
app.post('/api/webhooks/elevenlabs/conversation-initiation', (req, res) => {
  const { caller_id, agent_id } = req.body;
  
  console.log(`🔄 ElevenLabs requesting dynamic variables for ${caller_id}`);
  
  // Build context from existing conversations
  const phoneNormalized = normalizePhoneNumber(caller_id);
  const conversationContext = buildConversationContext(caller_id);
  const leadId = getActiveLeadForPhone(phoneNormalized);
  const dynamicVariables = buildDynamicVariables(caller_id, leadId);
  
  // Return variables that ElevenLabs will inject into agent prompt
  res.json({ dynamic_variables: dynamicVariables });
});
```

#### 2. ElevenLabs Post-Call Processing
```javascript
// POST /api/webhooks/elevenlabs/post-call
app.post('/api/webhooks/elevenlabs/post-call', async (req, res) => {
  const { data } = req.body;
  
  const conversationId = data.conversation_id;
  const transcript = data.transcript;
  const summary = data.analysis?.transcript_summary;
  const phoneNumber = data.metadata?.customer_phone_number;
  
  // Store call transcript in conversation history
  transcript.forEach(entry => {
    addToConversationHistory(phoneNumber, {
      type: 'voice',
      content: entry.message,
      sentBy: entry.role === 'agent' ? 'agent' : 'user',
      channel: 'voice',
      timestamp: entry.timestamp,
      metadata: { 
        elevenlabsConversationId: conversationId,
        timeInCallSecs: entry.time_in_call_secs
      }
    });
  });
  
  // Store conversation summary for future context
  if (summary) {
    storeConversationSummary(phoneNumber, summary);
  }
  
  // Update lead based on call outcome
  const leadId = getActiveLeadForPhone(phoneNumber);
  if (leadId) {
    updateLeadFromCallAnalysis(leadId, data.analysis);
  }
  
  // Broadcast call ended event
  broadcastConversationUpdate({
    type: 'call_ended',
    phoneNumber: phoneNumber,
    summary: summary,
    leadId: leadId
  });
});
```

#### 3. Twilio SMS Incoming
```javascript
// POST /api/webhooks/twilio/sms/incoming
app.post('/api/webhooks/twilio/sms/incoming', async (req, res) => {
  const { From, Body, MessageSid } = req.body;
  
  console.log(`📱 SMS received from ${From}: ${Body}`);
  
  // Store in conversation history
  addToConversationHistory(From, {
    type: 'sms',
    content: Body,
    sentBy: 'user',
    channel: 'sms',
    metadata: { twilioMessageSid: MessageSid }
  });
  
  // If there's an active voice call, inject SMS into conversation
  const activeCall = getActiveVoiceCall(From);
  if (activeCall) {
    injectSMSIntoActiveCall(From, Body);
  } else {
    // Start SMS conversation with ElevenLabs
    startSMSConversation(From, Body);
  }
  
  // Broadcast to real-time UI
  broadcastConversationUpdate({
    type: 'sms_received',
    phoneNumber: From,
    message: Body,
    leadId: getActiveLeadForPhone(From)
  });
  
  res.status(200).send('SMS processed');
});
```

---

## 🗄️ Database Schema

### Supabase Tables

#### leads
```sql
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_number_normalized TEXT NOT NULL,
  email TEXT,
  funding_readiness TEXT DEFAULT 'Unknown',
  funding_readiness_reason TEXT,
  chase_status TEXT DEFAULT 'Auto Chase Running',
  sentiment TEXT DEFAULT 'Neutral',
  assigned_specialist TEXT,
  projected_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vehicle interest
  vehicle_interest JSONB,
  
  -- Credit profile
  credit_profile JSONB,
  
  -- Script progress
  script_progress JSONB,
  
  -- Next action
  next_action JSONB,
  
  -- Analytics counters
  total_conversations INTEGER DEFAULT 0,
  total_sms_messages INTEGER DEFAULT 0,
  total_voice_calls INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_leads_phone_normalized ON leads(phone_number_normalized);
CREATE INDEX idx_leads_updated_at ON leads(updated_at DESC);
CREATE INDEX idx_leads_last_activity ON leads(last_activity DESC);
```

#### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  phone_number_normalized TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_by TEXT NOT NULL, -- 'user', 'agent', 'system'
  channel TEXT NOT NULL, -- 'sms', 'voice', 'web'
  type TEXT NOT NULL,     -- 'sms', 'voice', 'web', 'system'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata for different channels
  twilio_message_sid TEXT,
  elevenlabs_conversation_id TEXT,
  call_duration_seconds INTEGER,
  
  -- Additional context
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX idx_conversations_phone ON conversations(phone_number_normalized);
CREATE INDEX idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX idx_conversations_channel ON conversations(channel);
```

#### call_sessions
```sql
CREATE TABLE call_sessions (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  elevenlabs_conversation_id TEXT,
  twilio_call_sid TEXT,
  phone_number TEXT NOT NULL,
  phone_number_normalized TEXT NOT NULL,
  call_direction TEXT NOT NULL, -- 'inbound', 'outbound'
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Call outcome
  transcript JSONB,
  summary TEXT,
  call_outcome TEXT,
  
  -- Context preservation
  conversation_context TEXT,
  dynamic_variables JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_call_sessions_lead_id ON call_sessions(lead_id);
CREATE INDEX idx_call_sessions_elevenlabs ON call_sessions(elevenlabs_conversation_id);
CREATE INDEX idx_call_sessions_started_at ON call_sessions(started_at DESC);
```

#### conversation_summaries
```sql
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_normalized TEXT NOT NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  conversation_type TEXT DEFAULT 'mixed', -- 'voice', 'sms', 'mixed'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes  
CREATE INDEX idx_summaries_phone ON conversation_summaries(phone_number_normalized);
CREATE INDEX idx_summaries_lead_id ON conversation_summaries(lead_id);
CREATE INDEX idx_summaries_timestamp ON conversation_summaries(timestamp DESC);
```

---

## ⚛️ Frontend Integration

### TelephonyInterface Component

#### Core State Management
```typescript
const TelephonyInterface: React.FC<Props> = ({ selectedLead }) => {
  // Conversation state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Real-time connection
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Input state
  const [textInput, setTextInput] = useState('');
  
  // Call duration tracking
  const [callDuration, setCallDuration] = useState(0);
```

#### Real-time Event Streaming
```typescript
const setupEventSource = () => {
  if (!selectedLead) return;
  
  const sse = new EventSource(
    `/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}`
  );
  
  sse.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleRealTimeUpdate(data);
    } catch (error) {
      console.error('Failed to parse SSE data:', error);
    }
  };
  
  sse.onerror = (error) => {
    console.error('SSE connection error:', error);
    // Implement reconnection logic
    setTimeout(() => {
      sse.close();
      setupEventSource();
    }, 5000);
  };
  
  setEventSource(sse);
};

const handleRealTimeUpdate = (data: any) => {
  switch (data.type) {
    case 'sms_received':
      addConversationMessage({
        id: `sms-received-${data.messageSid || Date.now()}`,
        type: 'sms',
        content: data.message,
        timestamp: data.timestamp,
        sentBy: 'user',
        status: 'delivered',
        channel: 'sms'
      });
      break;
      
    case 'sms_sent':
      addConversationMessage({
        id: `sms-sent-${data.messageSid || Date.now()}`,
        type: 'sms',
        content: data.message,
        timestamp: data.timestamp,
        sentBy: 'agent',
        status: 'sent',
        channel: 'sms'
      });
      break;
      
    case 'call_initiated':
      setIsCallActive(true);
      setCurrentMode('voice');
      setConversationId(data.conversationId);
      break;
      
    case 'call_ended':
      setIsCallActive(false);
      setCurrentMode('text');
      setConversationId(null);
      if (data.summary) {
        addConversationMessage({
          id: `summary-${Date.now()}`,
          type: 'system',
          content: `📞 Call Summary: ${data.summary}`,
          timestamp: new Date().toISOString(),
          sentBy: 'system',
          channel: 'voice'
        });
      }
      break;
      
    case 'voice_message':
      addConversationMessage({
        id: `voice-${data.messageId || Date.now()}`,
        type: 'voice',
        content: data.content,
        timestamp: data.timestamp,
        sentBy: data.sentBy,
        channel: 'voice'
      });
      break;
  }
};
```

#### Action Handlers
```typescript
const handleStartVoiceCall = async () => {
  if (!selectedLead) return;
  
  setIsLoading(true);
  try {
    const response = await fetch('/api/elevenlabs/outbound-call/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: selectedLead.phoneNumber,
        leadId: selectedLead.id
      })
    });

    const result = await response.json();
    
    if (result.success) {
      setIsCallActive(true);
      setCurrentMode('voice');
      setConversationId(result.conversation_id);
      toast.success(`Call initiated to ${selectedLead.phoneNumber}`);
    } else {
      throw new Error(result.message || 'Failed to initiate call');
    }
  } catch (error) {
    setError(error.message);
    toast.error('Failed to start call');
  } finally {
    setIsLoading(false);
  }
};

const handleSendTextMessage = async () => {
  if (!selectedLead || !textInput.trim()) return;
  
  const messageText = textInput.trim();
  setTextInput('');
  setIsLoading(true);
  
  try {
    const response = await fetch('/api/twilio/send-sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: selectedLead.phoneNumber,
        message: messageText,
        leadId: selectedLead.id
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    toast.success(`SMS sent to ${selectedLead.phoneNumber}`);
  } catch (error) {
    setError(error.message);
    toast.error('Failed to send SMS');
    setTextInput(messageText); // Restore message on error
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🛠️ Implementation Steps

### Step 1: Environment Setup
```bash
# 1. Clone and install dependencies
git clone your-repo
cd your-repo
npm install

# 2. Install additional dependencies
npm install twilio ws eventsource

# 3. Set up environment variables
cp .env.example .env
# Fill in all the required API keys and secrets
```

### Step 2: ElevenLabs Agent Configuration

#### A. Create Agent in ElevenLabs Dashboard
1. Go to ElevenLabs ConvAI Dashboard
2. Create new agent with automotive financing expertise
3. Configure voice settings and personality

#### B. Configure Dynamic Variables
Add these variables in the agent's Dynamic Variables section:

| Variable Name | Type | Default Value |
|---------------|------|---------------|
| `conversation_context` | String | "No previous conversation" |
| `customer_name` | String | "Valued Customer" |
| `phone_number_normalized` | String | "Unknown" |
| `lead_status` | String | "New Inquiry" |
| `previous_summary` | String | "No previous calls" |
| `vehicle_interest` | String | "Not specified" |
| `budget_range` | String | "Not specified" |
| `funding_readiness` | String | "Unknown" |

#### C. Update System Prompt
```
You are Jack, an automotive financing specialist. Use these dynamic variables for context:

CUSTOMER INFO:
- Name: {{customer_name}}
- Phone: {{phone_number_normalized}}
- Status: {{lead_status}}
- Vehicle Interest: {{vehicle_interest}}
- Budget: {{budget_range}}
- Funding Status: {{funding_readiness}}

CONVERSATION CONTEXT:
{{conversation_context}}

PREVIOUS SUMMARY:
{{previous_summary}}

INSTRUCTIONS:
1. If conversation_context is provided, continue naturally from previous interaction
2. Reference specific details from context without repeating information
3. Focus on qualifying leads and moving them toward financing approval
4. Be empathetic with subprime customers who may have credit challenges
5. Collect missing information: income, employment, vehicle preferences, timeline
6. Schedule human specialist calls for qualified leads
```

#### D. Configure Webhooks
1. **Conversation Initiation Webhook**:
   - URL: `https://your-domain.com/api/webhooks/elevenlabs/conversation-initiation`
   - Method: POST
   - Enable "Fetch initiation client data from webhook"

2. **Post-Call Webhook**:
   - URL: `https://your-domain.com/api/webhooks/elevenlabs/post-call`
   - Method: POST
   - Enable signature verification

### Step 3: Twilio Configuration

#### A. Set up Phone Number
1. Purchase a Twilio phone number
2. Configure SMS webhook: `https://your-domain.com/api/webhooks/twilio/sms/incoming`
3. Configure Voice webhook: `https://your-domain.com/api/webhooks/twilio/voice/incoming`

#### B. Configure TwiML Apps (if needed)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Number>{{To}}</Number>
    </Dial>
</Response>
```

### Step 4: Database Setup

#### A. Supabase Project Setup
1. Create new Supabase project
2. Get API URL and service role key
3. Run the SQL schemas provided above

#### B. Enable Row Level Security (Optional)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies based on your auth requirements
CREATE POLICY "Enable read access for authenticated users" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');
```

### Step 5: Server Implementation

#### A. Core Dependencies
```javascript
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

// Initialize services
const app = express();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

#### B. Implement Core Functions
```javascript
// Phone number normalization
function normalizePhoneNumber(phoneNumber) {
  return phoneNumber.replace(/[^\d]/g, '').replace(/^1/, '');
}

// Conversation context building (detailed implementation above)
function buildConversationContext(phoneNumber) { /* ... */ }

// Dynamic variables building
function buildDynamicVariables(phoneNumber, leadId) { /* ... */ }

// Real-time broadcasting
function broadcastConversationUpdate(updateData) { /* ... */ }
```

### Step 6: Frontend Integration

#### A. Install Frontend Dependencies
```bash
npm install @types/eventsource
```

#### B. Implement TelephonyInterface Component
```typescript
// Use the detailed implementation provided above
```

#### C. Add Real-time Features
```typescript
// Server-Sent Events for real-time updates
// WebSocket connections for active conversations
// Toast notifications for user feedback
```

---

## 🧪 Testing & Debugging

### Test Scenarios

#### 1. SMS → Voice Continuity Test
```javascript
// Test script example
async function testSMSToVoice() {
  const testPhone = '+1234567890';
  const testMessage = 'I want to buy a Mercedes EQE for my family';
  
  // 1. Send SMS
  await sendTestSMS(testPhone, testMessage);
  
  // 2. Wait for processing
  await sleep(2000);
  
  // 3. Initiate voice call
  const response = await fetch('/api/elevenlabs/outbound-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: testPhone,
      leadId: 'test-lead-123'
    })
  });
  
  // 4. Verify context was passed
  console.log('Call initiated:', await response.json());
  console.log('Check server logs for context building');
}
```

#### 2. Context Verification
```bash
# Look for these log entries in your server:
# ✅ Built conversation context for +1234567890 with summary + 3 total messages
# 📞 Call payload: { "conversation_initiation_client_data": { "dynamic_variables": { ... } } }
# 🔄 ElevenLabs requesting dynamic variables for +1234567890
```

### Debug Mode Setup
```javascript
// Add to server.js for detailed logging
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(category, message, data = null) {
  if (DEBUG) {
    console.log(`🐛 [${category}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// Use throughout the application
debugLog('SMS', 'Message received', { from: From, body: Body });
debugLog('VOICE', 'Context built', { phoneNumber, contextLength: context.length });
debugLog('WEBHOOK', 'ElevenLabs post-call', { conversationId, summary });
```

### Common Debugging Commands
```bash
# Watch server logs in real-time
tail -f logs/server.log | grep -E "(SMS|VOICE|WEBHOOK)"

# Test webhook endpoints
curl -X POST http://localhost:3001/api/webhooks/twilio/sms/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&Body=Test message&MessageSid=test123"

# Check database state
psql $DATABASE_URL -c "SELECT * FROM conversations WHERE phone_number_normalized = '1234567890';"
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Context Not Preserved in Voice Calls
**Symptoms**: ElevenLabs agent treats each call as new conversation
**Solutions**:
1. Verify dynamic variables are configured in ElevenLabs dashboard
2. Check system prompt uses `{{variable_name}}` syntax  
3. Ensure conversation initiation webhook returns proper structure:
```javascript
res.json({ 
  dynamic_variables: {
    conversation_context: context,
    customer_name: name,
    // ... other variables
  }
});
```

### Issue 2: SMS Not Triggering Agent Response
**Symptoms**: SMS received but no agent response sent
**Solutions**:
1. Check Twilio webhook URL is correctly configured
2. Verify webhook endpoint returns `200` status
3. Test ElevenLabs WebSocket connection:
```javascript
// Add connection status logging
ws.on('open', () => console.log('✅ ElevenLabs WebSocket connected'));
ws.on('error', (error) => console.error('❌ WebSocket error:', error));
ws.on('close', () => console.log('🔌 WebSocket disconnected'));
```

### Issue 3: Real-time UI Not Updating
**Symptoms**: Messages sent but UI doesn't reflect changes
**Solutions**:
1. Verify SSE endpoint is accessible: `GET /api/stream/conversation/[leadId]`
2. Check browser developer console for SSE errors
3. Ensure `broadcastConversationUpdate()` is called after each message
4. Test SSE manually:
```javascript
const eventSource = new EventSource('/api/stream/conversation/test-lead');
eventSource.onmessage = (event) => console.log('SSE data:', event.data);
```

### Issue 4: Database Connection Issues
**Symptoms**: Data not persisting, connection errors
**Solutions**:
1. Verify Supabase credentials are correct
2. Check table schemas match the provided SQL
3. Test connection:
```javascript
async function testSupabaseConnection() {
  const { data, error } = await supabase.from('leads').select('count').single();
  console.log('Supabase test:', { data, error });
}
```

### Issue 5: Phone Number Normalization Problems
**Symptoms**: Context not found due to number format mismatches
**Solutions**:
1. Standardize all phone numbers through normalization function
2. Always use normalized numbers for database storage/lookup
3. Log both original and normalized numbers for debugging:
```javascript
function normalizePhoneNumber(phoneNumber) {
  const normalized = phoneNumber.replace(/[^\d]/g, '').replace(/^1/, '');
  console.log(`📞 Phone normalization: ${phoneNumber} → ${normalized}`);
  return normalized;
}
```

### Issue 6: Webhook Signature Verification Failures
**Symptoms**: Webhooks rejected with authentication errors
**Solutions**:
1. Verify webhook secrets are correctly configured
2. Implement proper signature verification:
```javascript
// For ElevenLabs
function verifyElevenLabsSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// For Twilio  
function verifyTwilioSignature(payload, signature, url, authToken) {
  return twilio.validateRequest(authToken, signature, url, payload);
}
```

---

## 🚀 Production Deployment Checklist

### Security
- [ ] Enable webhook signature verification
- [ ] Use HTTPS for all webhook URLs
- [ ] Secure environment variables
- [ ] Enable CORS with specific origins
- [ ] Implement rate limiting
- [ ] Add input validation and sanitization

### Performance
- [ ] Set up connection pooling for database
- [ ] Implement caching for frequently accessed data
- [ ] Add request timeout handling
- [ ] Optimize database queries with proper indexes
- [ ] Monitor memory usage for WebSocket connections

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Implement comprehensive logging
- [ ] Add health check endpoints
- [ ] Monitor webhook delivery success rates
- [ ] Track conversation completion metrics

### Backup & Recovery
- [ ] Database backup strategy
- [ ] Conversation history retention policy
- [ ] Error recovery procedures
- [ ] Failover mechanisms for critical components

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Review error logs and failed webhook deliveries
2. **Monthly**: Analyze conversation completion rates and optimize prompts
3. **Quarterly**: Update ElevenLabs agent configuration based on performance data

### Performance Monitoring
- Monitor average response times for each endpoint
- Track SMS delivery rates and voice call success rates
- Analyze conversation context accuracy and agent response quality

### Scaling Considerations
- Implement horizontal scaling for high-volume deployments
- Consider separating SMS and voice processing into microservices
- Add load balancing for webhook endpoints

---

**🎯 Result**: Following this guide will give you a fully functional voice agent system with seamless context preservation across web chat, SMS, and voice calls. The intern should be able to implement this with just their agent ID and API keys as prerequisites.** 