# Jack Automotive AI Assistant - Subprime Telephony Architecture

## 🏗️ System Overview

The Jack Automotive AI Assistant's subprime telephony system is a sophisticated multi-modal conversation platform that seamlessly integrates voice calls and SMS messaging through ElevenLabs AI and Twilio. The system maintains unified conversation context across all communication channels, providing real-time updates to the dashboard interface.

## 🧠 Core Architecture Principles

### 1. **Unified Conversation Context**
- All conversations (SMS + Voice) share the same context store
- Phone number normalization ensures consistency across channels  
- Conversation history preserves chronological order regardless of communication method
- Context seamlessly transfers between voice calls and SMS messages

### 2. **Real-Time Streaming Architecture**
- Server-Sent Events (SSE) provide real-time updates to the dashboard
- Lead-specific streaming ensures each dashboard shows relevant conversations only
- Phone-to-lead mapping enables automatic routing of incoming communications

### 3. **Multi-Modal Communication**
- Voice calls initiated through ElevenLabs native integration
- SMS powered by Twilio with ElevenLabs AI responses
- Context preservation when switching between voice and text modalities

---

## 📱 Data Architecture

### Core Data Stores (In-Memory)

```javascript
// Active WebSocket connections for SMS conversations
const activeConversations = new Map(); // phoneNumber -> WebSocket

// Unified conversation history (SMS + Voice)
const conversationContexts = new Map(); // phoneNumber -> messages[]

// Conversation metadata for webhook processing
const conversationMetadata = new Map(); // conversationId -> { phoneNumber, leadId }

// Call summaries from post-call webhooks
const conversationSummaries = new Map(); // phoneNumber -> { summary, timestamp }

// Real-time dashboard connections
const sseConnections = new Map(); // leadId -> SSE response object

// Phone-to-lead routing
const phoneToLeadMapping = new Map(); // phoneNumber -> leadId
```

### Phone Number Normalization

**Critical for Context Sharing:**
```javascript
function normalizePhoneNumber(phoneNumber) {
  // SMS format: +16049085474
  // Voice format: (604) 908-5474
  // Normalized: +16049085474
  
  if (phoneNumber.startsWith('+')) return phoneNumber;
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (digitsOnly.length === 10) return `+1${digitsOnly}`;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`;
  return `+${digitsOnly}`;
}
```

---

## 🔄 Communication Flow Architecture

### 1. SMS Communication Flow

#### Incoming SMS (`/api/webhooks/twilio/sms/incoming`)
```
Twilio → Webhook → Phone Normalization → Lead ID Lookup → Context Building → ElevenLabs WebSocket → Agent Response → SMS Reply → SSE Broadcast
```

**Detailed Process:**
1. **Webhook Reception**: Twilio sends incoming SMS to webhook
2. **Phone Normalization**: Convert phone format for consistent context lookup
3. **Lead ID Resolution**: Find active lead ID using `getActiveLeadForPhone()`
4. **Context Preparation**: Build conversation history from stored messages
5. **WebSocket Handling**: Send to existing WebSocket or create new conversation
6. **Agent Processing**: ElevenLabs AI processes message with full context
7. **Response Delivery**: Agent response sent via Twilio SMS
8. **Real-time Updates**: Broadcast to relevant dashboard via SSE

#### Outbound SMS Initiation
```
Dashboard → API Call → Context Building → ElevenLabs WebSocket → Agent Response → Twilio SMS → SSE Broadcast
```

### 2. Voice Communication Flow

#### Outbound Call Initiation (`/api/elevenlabs/outbound-call`)
```
Dashboard → API Call → Context Building → ElevenLabs Native Call → Conversation Events → SSE Broadcast → Post-Call Processing
```

**Detailed Process:**
1. **Call Request**: Dashboard initiates call for specific lead
2. **Context Preparation**: Build conversation context from SMS history
3. **Dynamic Variables**: Prepare lead-specific variables for ElevenLabs
4. **Native Integration**: Use ElevenLabs native Twilio integration
5. **Real-time Events**: Process conversation events via webhook
6. **Post-Call Summary**: Store call summary and transcript

---

## 🗂️ Context Management System

### Conversation History Structure
```javascript
{
  content: string,           // Message content
  sentBy: 'user' | 'agent',  // Message sender
  timestamp: string,         // ISO timestamp
  type: 'text' | 'voice'     // Communication channel
}
```

### Context Building Algorithm
```javascript
function buildConversationContext(phoneNumber) {
  const history = getConversationHistory(phoneNumber);
  const summaryData = getConversationSummary(phoneNumber);
  
  // Separate by communication type
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text');
  
  let contextText = `CONVERSATION CONTEXT for customer ${phoneNumber}:\n\n`;
  
  // Add call summary (key for context continuity)
  if (summaryData?.summary) {
    contextText += `CALL SUMMARY: ${summaryData.summary}\n\n`;
  }
  
  // Add recent voice messages (last 3)
  if (voiceMessages.length > 0) {
    const recentVoice = voiceMessages.slice(-3);
    contextText += `RECENT VOICE CONVERSATION:\n`;
    contextText += recentVoice.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  // Add recent SMS messages (last 3)
  if (smsMessages.length > 0) {
    const recentSms = smsMessages.slice(-3);
    contextText += `RECENT SMS CONVERSATION:\n`;
    contextText += recentSms.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  return contextText;
}
```

---

## 🌊 Real-Time Streaming Architecture

### Server-Sent Events (SSE) System

#### Connection Establishment
```javascript
// Client connects with lead ID and phone number
GET /api/stream/conversation/:leadId?phoneNumber=+1XXXXXXXXXX

// Server establishes mapping
sseConnections.set(leadId, response);
setActiveLeadForPhone(phoneNumber, leadId);
```

#### Message Broadcasting
```javascript
function broadcastConversationUpdate(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  if (data.leadId) {
    // Send to specific lead dashboard
    const connection = sseConnections.get(data.leadId);
    if (connection) {
      connection.write(message);
    }
  } else {
    // Broadcast to all connections
    sseConnections.forEach((res, leadId) => {
      res.write(message);
    });
  }
}
```

### Event Types Broadcast to Dashboard
- `sms_received` - Incoming SMS from customer
- `sms_sent` - Outgoing SMS to customer
- `call_initiated` - Voice call started
- `call_ended` - Voice call completed
- `voice_received` - Customer spoke during call
- `voice_sent` - Agent spoke during call
- `conversation_started` - ElevenLabs conversation began
- `conversation_ended` - ElevenLabs conversation ended
- `post_call_summary` - Call summary and transcript available

---

## 🎯 Lead ID Routing System

### Phone-to-Lead Mapping
```javascript
function setActiveLeadForPhone(phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  phoneToLeadMapping.set(normalized, leadId);
}

function getActiveLeadForPhone(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Priority 1: Active SSE connections
  const activeLead = phoneToLeadMapping.get(normalized);
  if (activeLead && sseConnections.has(activeLead)) {
    return activeLead;
  }
  
  // Priority 2: Conversation metadata lookup
  for (const [convId, metadata] of conversationMetadata.entries()) {
    if (normalizePhoneNumber(metadata.phoneNumber) === normalized) {
      return metadata.leadId;
    }
  }
  
  return null;
}
```

### Automatic Routing Logic
1. **SSE Connection**: When dashboard opens, phone-to-lead mapping is established
2. **Incoming SMS**: System finds active lead ID for the phone number
3. **Outbound Calls**: Lead ID is passed explicitly in API call
4. **Webhook Events**: System uses conversation metadata or phone lookup

---

## 🔧 ElevenLabs Integration

### Dynamic Variables System
```javascript
// Passed to ElevenLabs for contextual responses
const dynamicVariables = {
  conversation_context: truncatedContext,
  customer_name: leadData?.customerName || "Customer",
  lead_status: summaryExists ? "Returning Customer" : "New Inquiry",
  previous_summary: summaryData?.summary || "First conversation"
};
```

### Conversation Initiation
```javascript
// For voice calls
const callPayload = {
  agent_id: agentId,
  agent_phone_number_id: phoneNumberId,
  to_number: phoneNumber,
  conversation_initiation_client_data: {
    lead_id: leadId,
    customer_phone: phoneNumber,
    dynamic_variables: dynamicVariables
  }
};

// For SMS conversations
ws.send(JSON.stringify({
  type: 'conversation_initiation_client_data',
  client_data: {
    conversation_context: conversationContext,
    phone_number: phoneNumber,
    channel: 'sms',
    lead_id: leadId,
    dynamic_variables: dynamicVariables
  }
}));
```

---

## 🎭 TelephonyInterface Component Architecture

### State Management
```typescript
const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
const [isCallActive, setIsCallActive] = useState(false);
const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
const [conversationId, setConversationId] = useState<string | null>(null);
```

### Real-Time Event Handling
```typescript
const handleRealTimeUpdate = (data: any) => {
  switch (data.type) {
    case 'sms_received':
      addConversationMessage({
        id: `sms-${data.messageSid || Date.now()}`,
        type: 'sms',
        content: data.message,
        timestamp: data.timestamp,
        sentBy: 'user',
        status: 'delivered'
      });
      break;
      
    case 'call_initiated':
      setIsCallActive(true);
      setCurrentMode('voice');
      setConversationId(data.conversationId);
      break;
      
    case 'post_call_summary':
      addConversationMessage({
        id: `summary-${data.conversationId}`,
        type: 'system',
        content: `Call Summary: ${data.summary}`,
        timestamp: data.timestamp,
        sentBy: 'system'
      });
      break;
  }
};
```

---

## 🔄 Webhook Architecture

### ElevenLabs Conversation Events (`/api/webhooks/elevenlabs/conversation-events`)
- Processes real-time conversation events
- Extracts lead ID from conversation metadata
- Broadcasts events to appropriate dashboard
- Handles message transcription and agent responses

### ElevenLabs Post-Call (`/api/webhooks/elevenlabs/post-call`)
- Receives call summaries and transcripts
- Stores conversation summaries for future context
- Processes full conversation transcripts
- Broadcasts final call summary to dashboard

### Twilio SMS Incoming (`/api/webhooks/twilio/sms/incoming`)
- Processes incoming SMS messages
- Finds appropriate lead ID for routing
- Manages WebSocket connections to ElevenLabs
- Broadcasts SMS events to dashboard

---

## 🎯 Context Preservation Strategies

### 1. **Cross-Channel History**
- All messages stored in single `conversationContexts` map
- Phone number normalization ensures consistent lookup
- Message type tagging ('voice' vs 'text') for proper display

### 2. **Conversation Summaries**
- Post-call summaries stored separately
- Injected into future SMS conversations
- Provides high-level context without overwhelming detail

### 3. **Dynamic Variable Injection**
- Real-time lead data passed to ElevenLabs
- Conversation status updates based on history
- Previous interaction summaries included in context

### 4. **WebSocket State Management**
- Active conversations maintained in memory
- Context injected when resuming conversations
- Graceful handling of connection drops and reconnections

---

## 🚀 Key Success Factors

### 1. **Phone Number Normalization**
- **Critical**: Ensures SMS and voice share same context
- Handles different formats from Twilio SMS vs voice
- Single source of truth for conversation lookup

### 2. **Lead ID Routing**
- Maps phone numbers to dashboard sessions
- Enables targeted real-time updates
- Supports multiple agents viewing different leads

### 3. **Context Building Algorithm**
- Combines voice and SMS history intelligently
- Prioritizes recent interactions
- Includes call summaries for continuity

### 4. **Real-Time Architecture**
- SSE connections provide instant updates
- Event-driven architecture scales efficiently
- Graceful error handling and reconnection

---

## 📊 System Benefits

### For Agents:
- **Unified View**: See all customer interactions in one interface
- **Context Awareness**: AI maintains conversation continuity across channels
- **Real-Time Updates**: Instant notification of customer responses
- **Seamless Handoff**: Switch between voice and SMS without losing context

### For Customers:
- **Channel Freedom**: Use voice or SMS as preferred
- **Conversation Continuity**: No need to repeat information when switching channels
- **Responsive Service**: AI-powered responses with human escalation available

### For Business:
- **Scalable Architecture**: Handle multiple leads simultaneously
- **Cost Efficient**: AI handles routine interactions, humans handle complex cases
- **Comprehensive Tracking**: Full conversation history for compliance and analysis
- **Integration Ready**: Built for existing Subprime Dashboard workflow

---

## 🔒 Technical Specifications

### Environment Variables Required:
```bash
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=your_webhook_secret
ELEVENLABS_POST_CALL_WEBHOOK_SECRET=your_webhook_secret
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Key Dependencies:
- Express.js for webhook handling
- WebSocket (ws) for ElevenLabs SMS integration
- Twilio SDK for SMS sending
- Server-Sent Events for real-time dashboard updates

### Performance Characteristics:
- **Memory Usage**: In-memory storage scales with active conversations
- **Latency**: Real-time updates typically < 100ms
- **Throughput**: Handles concurrent conversations efficiently
- **Reliability**: Graceful error handling and automatic reconnection

---

This architecture provides a seamless, scalable, and context-aware telephony system that enhances the subprime lead management workflow while maintaining excellent user experience across all communication channels.