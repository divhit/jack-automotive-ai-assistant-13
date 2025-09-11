# Voice Conversation Real-Time Streaming Solution

## Overview
This document explains the complete solution for streaming voice conversations in real-time from ElevenLabs to the dashboard UI.

## Problem Statement
Voice conversations initiated through ElevenLabs were not streaming to the UI in real-time because:
1. Webhook events lacked the `lead_id` needed for routing
2. Phone numbers were not consistently available in webhook data
3. No persistent mapping between conversation IDs and lead information
4. SSE connections were not properly targeted to specific leads

## Solution Architecture

### 1. Conversation Metadata Tracking
We implemented a persistent metadata store that maps conversation IDs to lead information:

```javascript
const conversationMetadata = new Map(); // conversationId -> { phoneNumber, leadId, startTime }
```

### 2. Enhanced Call Initiation
When initiating a call, we:
- Generate a temporary conversation ID for tracking
- Store metadata immediately upon call initiation
- Pass lead information in `conversation_initiation_client_data`

```javascript
// In /api/elevenlabs/outbound-call
const tempConversationId = `temp_${Date.now()}_${phoneNumber}`;
const callPayload = {
  agent_id: agentId,
  agent_phone_number_id: phoneNumberId,
  to_number: phoneNumber,
  conversation_initiation_client_data: {
    lead_id: leadId,
    customer_phone: phoneNumber,
    conversation_context: conversationContext,
    temp_conversation_id: tempConversationId
  }
};

// Store metadata for webhook processing
storeConversationMetadata(conversationId, phoneNumber, leadId);
```

### 3. Webhook Event Processing
The webhook handler now:
- Retrieves stored metadata for incoming events
- Extracts lead information from multiple possible locations
- Handles both temporary and actual conversation IDs
- Supports various event types (user_message, agent_message, user_transcript, agent_response)

```javascript
// Try to get metadata from our store
let metadata = conversationId ? getConversationMetadata(conversationId) : null;

// If no metadata found, try to extract from conversation_initiation_client_data
if (!metadata && eventData.data?.conversation_initiation_client_data) {
  // Extract and store metadata for future events
}
```

### 4. Targeted SSE Broadcasting
SSE connections are now tracked by lead ID for targeted updates:

```javascript
const sseConnections = new Map(); // leadId -> response object

// Broadcast only to the specific lead's connection
if (data.leadId) {
  const connection = sseConnections.get(data.leadId);
  if (connection) {
    connection.write(message);
  }
}
```

### 5. Keep-Alive Mechanism
Added heartbeat to prevent SSE connection timeouts:

```javascript
const heartbeat = setInterval(() => {
  res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
}, 30000);
```

## Event Flow Diagram

```
1. User clicks "Start Voice Call" in TelephonyInterface
   ↓
2. Frontend calls /api/elevenlabs/outbound-call with leadId
   ↓
3. Server stores metadata: conversationId → { phoneNumber, leadId }
   ↓
4. ElevenLabs initiates call via Twilio
   ↓
5. ElevenLabs sends webhook events to /api/webhooks/elevenlabs/conversation-events
   ↓
6. Server retrieves metadata using conversationId
   ↓
7. Server broadcasts to specific lead's SSE connection
   ↓
8. TelephonyInterface receives and displays messages in real-time
```

## Supported Event Types

### From ElevenLabs Webhooks:
- `conversation_started` - Call begins
- `user_message` / `user_transcript` - Customer speaks
- `agent_message` / `agent_response` - Agent responds
- `interruption` - Speaker interruption detected
- `silence_detected` - Extended silence periods
- `conversation_ended` - Call ends

### Broadcast to Frontend:
- `call_initiated` - Call setup started
- `conversation_started` - Call connected
- `voice_received` - Customer message
- `voice_sent` - Agent message
- `interruption` - Interruption event
- `silence_detected` - Silence event
- `conversation_ended` - Call ended

## Testing the Implementation

### 1. Manual Testing
```bash
# Terminal 1: Start the server
npm run server

# Terminal 2: Start the dev server
npm run dev

# Terminal 3: Run the webhook test
node test-elevenlabs-webhook.js
```

### 2. Live Testing
1. Open Subprime Dashboard
2. Select a lead (e.g., lead_001)
3. Click "Start Voice Call"
4. Voice messages should appear in real-time as the conversation progresses

### 3. Debugging Tips
- Check server logs for webhook reception
- Verify SSE connection is established (look for "📡 SSE connection established")
- Use browser DevTools Network tab to monitor SSE stream
- Check for "WEBHOOK DETAILS" logs to see if lead_id is present

## Configuration Requirements

### Environment Variables
```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=your_webhook_secret
```

### ElevenLabs Dashboard Setup
1. Navigate to your agent settings
2. Add webhook endpoint: `https://your-domain/api/webhooks/elevenlabs/conversation-events`
3. Set webhook secret (must match env variable)
4. Enable all conversation event types

## Troubleshooting

### Messages Not Appearing
1. **Check webhook configuration** - Ensure webhook URL is correct in ElevenLabs dashboard
2. **Verify lead_id presence** - Check server logs for "WEBHOOK DETAILS"
3. **Confirm SSE connection** - Look for "SSE connection established" in logs
4. **Test with webhook script** - Use `test-elevenlabs-webhook.js` to simulate events

### Connection Drops
1. **Heartbeat mechanism** - Ensures connections stay alive
2. **Auto-reconnect** - Frontend automatically reconnects on connection loss
3. **Check proxy timeouts** - Ensure reverse proxy doesn't timeout SSE connections

### Missing Context
1. **Verify metadata storage** - Check "Stored conversation metadata" logs
2. **Confirm call payload** - Ensure `conversation_initiation_client_data` includes all fields
3. **Check conversation history** - Verify messages are being added to history

## Performance Considerations

1. **Memory Management**
   - Conversation history limited to 50 messages per phone number
   - Metadata cleaned up after conversation ends
   - SSE connections tracked efficiently by lead ID

2. **Scalability**
   - Use Redis for metadata storage in production
   - Implement connection pooling for high traffic
   - Consider message queuing for webhook processing

3. **Latency Optimization**
   - Direct SSE broadcasting without intermediate storage
   - Minimal processing in webhook handler
   - Efficient lead-specific routing

## Future Enhancements

1. **Webhook Signature Verification**
   - Implement proper HMAC verification for security
   
2. **Persistent Storage**
   - Store conversation metadata in database
   - Enable conversation history retrieval
   
3. **Enhanced Error Handling**
   - Retry mechanism for failed broadcasts
   - Dead letter queue for failed webhooks
   
4. **Analytics Integration**
   - Track conversation metrics
   - Monitor streaming performance
   
5. **Multi-tenant Support**
   - Isolate conversations by organization
   - Role-based access to conversations 