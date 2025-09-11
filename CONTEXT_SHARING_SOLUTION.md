# Context Sharing Solution: SMS ↔ Voice

## Root Cause Analysis

### The Architecture Problem
You have **two separate conversation systems** that don't share context:

1. **SMS Conversations**: WebSocket-based stateful conversations in ElevenLabs
2. **Voice Conversations**: Native Twilio integration with separate conversation contexts

### Why Context Isn't Maintained
- SMS uses `activeConversations.get(phoneNumber)` → WebSocket with conversation state
- Voice uses ElevenLabs native integration → Completely new conversation context
- Lead ID is passed but **conversation history isn't shared**

## Complete Solution Implementation

### Step 1: Unified Conversation Management
We need to modify the system to share conversation context between SMS and voice.

### Step 2: Context Sharing Strategy
Instead of two separate systems, we'll:
1. Store conversation history per lead/phone number
2. Pass conversation context to voice calls
3. Maintain unified conversation state

### Step 3: Real-Time Streaming Debug
For the streaming issue, we need to:
1. Add debug logging to see if webhooks are received
2. Test the webhook chain end-to-end
3. Verify leadId extraction from voice events

## Implementation

### Enhanced Context Management
```javascript
// Add to server.js - Conversation context storage
const conversationContexts = new Map(); // phoneNumber -> conversation history

function getConversationHistory(phoneNumber) {
  return conversationContexts.get(phoneNumber) || [];
}

function addToConversationHistory(phoneNumber, message, sentBy) {
  if (!conversationContexts.has(phoneNumber)) {
    conversationContexts.set(phoneNumber, []);
  }
  
  const history = conversationContexts.get(phoneNumber);
  history.push({
    message,
    sentBy,
    timestamp: new Date().toISOString(),
    type: sentBy === 'user' ? 'received' : 'sent'
  });
  
  // Keep last 20 messages for context
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
}

function buildConversationContext(phoneNumber) {
  const history = getConversationHistory(phoneNumber);
  if (history.length === 0) return '';
  
  const contextMessages = history.map(h => 
    `${h.sentBy === 'user' ? 'Customer' : 'Agent'}: ${h.message}`
  ).join('\n');
  
  return `Previous conversation context:\n${contextMessages}\n\nContinue the conversation naturally, maintaining context from above.`;
}
```

### Modified Voice Call with Context
```javascript
// Enhanced outbound call with conversation context
const conversationContext = buildConversationContext(phoneNumber);

const callPayload = {
  agent_id: agentId,
  agent_phone_number_id: phoneNumberId,
  to_number: phoneNumber,
  conversation_initiation_client_data: {
    lead_id: leadId,
    customer_phone: phoneNumber,
    conversation_context: conversationContext
  }
};
```

### Enhanced SMS Handler with Context Storage
```javascript
// Update SMS handler to store context
if (activeConversations.has(From)) {
  console.log('➡️ Existing conversation found. Sending message.');
  const ws = activeConversations.get(From);
  addToConversationHistory(From, Body, 'user');
  ws.send(JSON.stringify({ type: 'user_message', text: Body }));
} else {
  console.log('✨ No existing conversation. Creating a new one.');
  addToConversationHistory(From, Body, 'user');
  startConversation(From, Body);
}
```

### Debug Webhook Reception
```javascript
// Enhanced webhook logging for debugging
app.post('/api/webhooks/elevenlabs/conversation-events', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔔 WEBHOOK RECEIVED:', {
      timestamp: new Date().toISOString(),
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {}),
      signature: req.headers['xi-signature'] ? 'Present' : 'MISSING'
    });
    
    const eventData = req.body;
    const leadId = eventData.data?.conversation_initiation_client_data?.lead_id;
    const phoneNumber = eventData.data?.metadata?.phone_number;
    
    console.log('🔍 WEBHOOK DETAILS:', {
      eventType: eventData.type,
      leadId: leadId || 'MISSING',
      phoneNumber: phoneNumber || 'MISSING',
      conversationId: eventData.data?.conversation_id,
      hasMessage: !!eventData.data?.message
    });
    
    if (!leadId) {
      console.error('❌ CRITICAL: No lead ID in webhook event!');
      console.error('❌ Event data:', JSON.stringify(eventData, null, 2));
    }
    
    // ... rest of webhook handler
    
  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error);
    console.error('❌ Processing time:', Date.now() - startTime, 'ms');
  }
});
```

## Testing Strategy

### 1. Test Webhook Reception
```bash
# Check if webhooks are being received
curl -X POST http://localhost:3001/api/webhooks/elevenlabs/conversation-events \
  -H "Content-Type: application/json" \
  -H "xi-signature: test" \
  -d '{"type":"test","data":{"conversation_initiation_client_data":{"lead_id":"test123"}}}'
```

### 2. Test Context Sharing
1. Send SMS to a lead
2. Make voice call to same lead
3. Verify agent has SMS context
4. Switch back to SMS
5. Verify conversation continues

### 3. Test Real-Time Streaming
1. Make voice call
2. Monitor server logs for webhook events
3. Check if SSE events are broadcast
4. Verify UI receives events

## Expected Behavior After Fix

### ✅ Context Continuity
- SMS → Voice: Agent knows previous SMS conversation
- Voice → SMS: Agent remembers voice conversation
- Seamless handoff between channels

### ✅ Real-Time Streaming
- Voice messages appear in UI immediately
- Call status updates show in real-time
- No delays or missing messages

### ✅ Unified Experience
- Single conversation thread per lead
- All touchpoints visible in UI
- Context maintained across channels

## Debugging Checklist

- [ ] Webhook URL configured: `https://your-ngrok-url/api/webhooks/elevenlabs/conversation-events`
- [ ] Webhook secret matches environment variable
- [ ] leadId is being passed in outbound calls
- [ ] Webhook events contain leadId
- [ ] SSE broadcasting works for lead
- [ ] Frontend receives voice events
- [ ] Conversation history is stored and retrieved
- [ ] Context is passed to voice calls

This solution provides true unified conversations with proper context sharing between SMS and voice channels. 