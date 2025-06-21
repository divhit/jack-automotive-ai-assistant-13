# Voice Conversation Streaming Fix

## Problem Identified
Voice calls are initiating successfully, but voice conversation messages are not streaming to the UI in real-time. 

## Root Cause Analysis

### 1. Missing Critical Environment Variables
The webhook endpoint is returning **500 Internal Server Error** because of missing environment variables:

```bash
# MISSING - Add these to your .env.local file:
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=your_webhook_secret_here
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id_here

# INCORRECT VARIABLE NAME - Change this:
ELEVEN_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m
# TO THIS:
ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m
```

### 2. ElevenLabs Dashboard Webhook Configuration
The webhook must be configured in your ElevenLabs dashboard with:
- **URL**: `https://your-ngrok-url/api/webhooks/elevenlabs/conversation-events`
- **Secret**: Must match `ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET` in .env
- **Events**: Enable conversation events (user_message, agent_message, conversation_started, conversation_ended)

## Complete Fix Instructions

### Step 1: Update Environment Variables
Add/fix these variables in your `.env.local`:

```bash
# ElevenLabs - CORRECTED
ELEVENLABS_API_KEY=sk_0d0a612fffbacea93cf6cb47867522cbc2682bd4c0ea1ce2
ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m
ELEVENLABS_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID_FROM_ELEVENLABS_DASHBOARD
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_FROM_ELEVENLABS_DASHBOARD

# Twilio - CORRECTED
TWILIO_PHONE_NUMBER=+17786526908  # Changed from TWILIO_SMS_NUMBER
```

### Step 2: Get Your Phone Number ID
1. Go to ElevenLabs Dashboard → Phone Numbers
2. Find your phone number and copy its ID
3. Add it to `ELEVENLABS_PHONE_NUMBER_ID`

### Step 3: Configure ElevenLabs Webhook
1. Go to ElevenLabs Dashboard → Agents → Your Agent
2. Navigate to **Webhooks** section
3. Add a new webhook:
   - **URL**: `https://your-ngrok-url/api/webhooks/elevenlabs/conversation-events`
   - **Secret**: Generate a strong secret and add it to `ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET`
   - **Events**: Select all conversation events

### Step 4: Restart Servers
```bash
# Terminal 1 - Restart Express server
npm run server

# Terminal 2 - Restart Dev server  
npm run dev
```

### Step 5: Test the Fix
1. **Test webhook endpoint**:
   ```bash
   # Should return 200 OK (not 500 error)
   curl http://localhost:8080/api/webhooks/elevenlabs/conversation-events
   ```

2. **Make a test call**:
   - Use the Subprime Dashboard to initiate a voice call
   - Voice messages should now appear in real-time in the UI

## Technical Details

### How Voice Streaming Works
1. **Call Initiation**: Frontend → Express Server → ElevenLabs API
2. **Voice Messages**: ElevenLabs → Webhook → Express Server → SSE → Frontend
3. **Real-time Updates**: Server-Sent Events (SSE) broadcast messages to UI

### Message Flow
```
ElevenLabs Conversation → Webhook → /api/internal/broadcast → SSE → TelephonyInterface
```

### Supported Voice Event Types
- `voice_received` - Customer speaks
- `voice_sent` - Agent responds  
- `conversation_started` - Call begins
- `conversation_ended` - Call ends
- `interruption` - Speaker interruption detected
- `silence_detected` - Silence periods

## Verification Checklist

- [ ] `ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET` is set
- [ ] `ELEVENLABS_PHONE_NUMBER_ID` is set  
- [ ] `ELEVENLABS_AGENT_ID` (not ELEVEN_AGENT_ID) is set
- [ ] ElevenLabs webhook is configured with correct URL and secret
- [ ] Webhook endpoint returns 200 OK (not 500 error)
- [ ] Both servers are restarted after env changes
- [ ] Voice calls initiate successfully
- [ ] Voice messages appear in UI during calls

## Expected Result
After applying this fix:
1. ✅ Voice calls will initiate successfully (already working)
2. ✅ Voice conversation will stream to UI in real-time
3. ✅ You'll see customer and agent messages as they happen
4. ✅ Call status updates (started/ended) will appear
5. ✅ SMS functionality will continue working

## If Still Not Working
Check these common issues:
1. **Ngrok URL changed**: Update webhook URL in ElevenLabs dashboard
2. **Case sensitivity**: Ensure variable names match exactly
3. **Webhook secret mismatch**: Regenerate secret and update both places
4. **Agent ID mismatch**: Verify agent ID in dashboard matches .env
5. **Port conflicts**: Ensure servers are running on correct ports (3001, 8080) 