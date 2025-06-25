# ElevenLabs Conversational AI + Twilio Integration

## Overview

This integration uses **ElevenLabs Conversational AI** with your existing agent (`agent_01jwc5v1nafjwv7zw4vtz1050m`) to provide native voice and SMS capabilities through Twilio. The implementation enhances your existing `elevenLabsService.ts` rather than creating a separate telephony system.

## Key Features

- **Native ElevenLabs Agent Integration**: Uses your existing agent with all configured system prompts and voice settings
- **Context Preservation**: Maintains conversation history across voice calls, SMS, and browser chat
- **Phone Number Identification**: Tracks leads by phone number for conversation continuity
- **Outbound Calling**: Initiates calls through ElevenLabs + Twilio native integration
- **SMS Integration**: Bi-directional SMS that maintains conversation context
- **Post-Call Processing**: Automatic lead scoring and follow-up actions
- **Human Transfer**: Seamless handoff to human agents when needed

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   SubprimeLead      │    │  ElevenLabs Agent    │    │   Twilio Platform   │
│   Dashboard         │────│  agent_01jwc5v...    │────│   Voice + SMS       │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                           │                           │
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ TelephonyInterface  │    │  Conversation        │    │  Post-Call          │
│ Component           │    │  Manager             │    │  Webhooks           │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m

# Webhook Security
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: For enhanced features
REACT_APP_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 2. ElevenLabs Dashboard Configuration

1. **Go to your ElevenLabs Dashboard** → Conversational AI → Your Agent
2. **Configure Twilio Integration**:
   - Add your Twilio phone number
   - Configure webhook URLs
   - Set up post-call webhooks

3. **Webhook URLs**:
   - Post-call webhook: `https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/elevenlabs/post-call`
   - Conversation initiation webhook: `https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/elevenlabs/conversation-initiation`

### 3. Twilio Configuration

1. **Purchase a phone number** in ElevenLabs dashboard
2. **Configure webhooks** for incoming calls and SMS
3. **Set up voice configuration** for your agent

## Usage

### Starting a Voice Call

```typescript
// The TelephonyInterface component handles this automatically
const handleStartCall = async () => {
  // Uses your existing agent with full context
  await conversationManager.initiateOutboundCall();
};
```

### Sending SMS

```typescript
// SMS maintains conversation context
const handleSendSMS = async (message: string) => {
  await conversationManager.sendSMS(message);
};
```

### Context Preservation

The system automatically:
- Loads conversation history when initializing
- Includes last 6 messages in call context
- Maintains conversation continuity across modalities
- Updates lead records with conversation data

## API Endpoints

### POST `/api/elevenlabs/outbound-call`
Initiates outbound calls using your ElevenLabs agent.

**Request:**
```json
{
  "agentId": "agent_01jwc5v1nafjwv7zw4vtz1050m",
  "callRequest": {
    "leadId": "sl1",
    "phoneNumber": "+15551234567",
    "agentOverrides": {
      "systemPrompt": "Lead context...",
      "firstMessage": "Hi John, it's Sarah from Jack Automotive..."
    }
  },
  "conversationHistory": [...]
}
```

### POST `/api/elevenlabs/send-sms`
Sends SMS messages through your agent's phone number.

**Request:**
```json
{
  "agentId": "agent_01jwc5v1nafjwv7zw4vtz1050m",
  "to": "+15551234567",
  "message": "Hi! This is Sarah from Jack Automotive...",
  "leadId": "sl1"
}
```

### POST `/api/webhooks/elevenlabs/post-call`
Processes post-call transcripts and updates lead records.

**Features:**
- HMAC signature verification
- Automatic lead scoring
- Follow-up action triggers
- CRM integration hooks

## Components

### TelephonyInterface
Main React component for voice/text communication.

**Features:**
- Voice call controls (start/end calls)
- Browser-based voice chat
- Text messaging interface
- Real-time conversation display
- Context preservation visualization
- Human transfer capabilities

**Usage:**
```tsx
<TelephonyInterface
  selectedLead={selectedLead}
  onLeadUpdate={handleLeadUpdate}
/>
```

### Enhanced ElevenLabsService
Your existing service enhanced with telephony capabilities.

**New Methods:**
- `initiateOutboundCall()` - Start phone calls
- `handleIncomingSMS()` - Process incoming SMS
- `sendSMS()` - Send SMS messages
- `generateResumeMessage()` - Context-aware resume messages

## Security Features

- **HMAC Signature Verification**: All webhooks are cryptographically verified
- **Agent ID Validation**: Only processes requests for your specific agent
- **Environment Variable Protection**: API keys stored securely
- **Rate Limiting**: Built-in protection against abuse

## Lead Scoring Algorithm

Post-call analysis automatically scores leads based on:
- Call completion and duration
- Conversation content analysis
- Buying signal detection
- Engagement metrics

**Score Ranges:**
- 70-100: Hot leads (immediate follow-up)
- 40-69: Warm leads (24-hour follow-up)
- 0-39: Cold leads (nurture sequence)

## Troubleshooting

### Common Issues

1. **"No phone numbers configured"**
   - Configure Twilio integration in ElevenLabs dashboard
   - Ensure phone number is properly linked to your agent

2. **"Failed to initialize conversation"**
   - Check API key configuration
   - Verify agent ID is correct
   - Ensure network connectivity

3. **"Webhook signature verification failed"**
   - Verify `ELEVENLABS_WEBHOOK_SECRET` is set correctly
   - Check webhook URL configuration in ElevenLabs dashboard

### Debug Mode

Enable debug logging:
```bash
DEBUG=elevenlabs:* npm start
```

## Best Practices

1. **Context Management**: Always include conversation history in calls
2. **Error Handling**: Implement proper fallbacks for failed calls
3. **Rate Limiting**: Respect ElevenLabs API rate limits
4. **Security**: Always verify webhook signatures
5. **Testing**: Test with small groups before full deployment

## Integration with Existing System

This implementation enhances your existing:
- `elevenLabsService.ts` - Core conversation management
- `SubprimeDashboard.tsx` - Lead management interface
- `subprimeLeads.ts` - Lead data structure
- Conversation history management
- Context preservation system

The telephony features integrate seamlessly with your existing workflow without requiring major architectural changes.

### 🔗 Webhook Configuration

Configure these webhooks in your ElevenLabs and Twilio dashboards:

**ElevenLabs Webhooks:**
- Post-call webhook: `https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/elevenlabs/post-call`
- Conversation initiation webhook: `https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/elevenlabs/conversation-initiation`

**Twilio Webhooks:**
- SMS webhook: `https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/twilio/sms/incoming`
- Voice status webhook: `https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/twilio/voice/status` 