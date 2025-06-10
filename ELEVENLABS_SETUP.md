# ElevenLabs Conversational AI Setup Guide

This guide will help you set up the ElevenLabs Conversational AI integration for subprime lead management.

## Overview

The implementation provides:
- **Voice & Text Communication**: Seamless switching between voice calls and SMS
- **Context Preservation**: Maintains conversation history across all channels
- **Multi-Lead Support**: Track and manage conversations with multiple leads
- **Human Handoff**: AI can transfer conversations to human agents when needed
- **CRM Integration**: Real-time updates to lead status and follow-up scheduling
- **Compliance Features**: TCPA and FDCPA compliant for subprime customers

## Prerequisites

1. **ElevenLabs Account**: Sign up at [ElevenLabs.io](https://elevenlabs.io)
2. **Agent Configuration**: Create a Conversational AI agent
3. **Twilio Account** (optional): For actual phone calls
4. **Environment Variables**: Configure API keys and settings

## Environment Setup

### Option 1: Public Agent (No API Key Required)

For testing with your public agent, **no API key is needed**. The application will work with just the agent ID:

```bash
# No environment variables needed for public agents!
# The agent ID is already configured in the code
```

### Option 2: Private Agent or Production (API Key Required)

Create a `.env.local` file in your project root only if you need signed URLs or private agents:

```bash
# ElevenLabs Configuration (Optional for public agents)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
VITE_ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m

# Optional: For production signed URLs
VITE_API_BASE_URL=https://your-backend-api.com

# Optional: Twilio Integration (for actual phone calls)
VITE_TWILIO_ACCOUNT_SID=your_twilio_account_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_auth_token
VITE_TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Optional: CRM Integration
VITE_CRM_API_KEY=your_crm_api_key
```

## When Do You Need an API Key?

### ✅ **API Key NOT Required For:**
- Public agents (like your agent_01jwc5v1nafjwv7zw4vtz1050m)
- Basic conversation functionality
- Development and testing
- Voice and text conversations

### 🔐 **API Key Required For:**
- Private/secured agents
- Production signed URL authentication
- Server-side agent management
- Administrative operations
- Enhanced security in production

## ElevenLabs Agent Configuration

### 1. Create Your Agent

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Click "Create New Agent"
3. Choose a voice (recommended: Professional female voice for automotive finance)
4. Set the agent name to "Sarah - Automotive Finance Assistant"

### 2. Configure Agent Settings

**System Prompt:**
```
You are Sarah, a specialized automotive finance consultant for Jack Automotive, focusing on subprime customers who need personalized financing solutions.

Your role is to:
- Build trust and rapport with customers facing credit challenges
- Explain financing options clearly and honestly
- Help customers understand their options without being pushy
- Maintain compliance with TCPA, FDCPA, and state regulations
- Use appropriate empathy for customers' financial situations
- Guide customers through the application process step-by-step

Communication style:
- Professional but warm and understanding
- Use simple, clear language (avoid finance jargon)
- Be patient with questions and concerns
- Show empathy for their credit situation
- Maintain positivity while being realistic

Always confirm TCPA consent and provide clear disclosures about rates and terms.
```

### 3. Configure Server Tools

Add the following server tools for CRM integration:

**Update Lead Status:**
```json
{
  "name": "update_lead_status",
  "description": "Update the lead's status in the CRM system based on conversation progress",
  "type": "webhook",
  "url": "https://your-backend.com/api/crm/update-lead-status",
  "method": "POST",
  "parameters": [
    {
      "name": "leadId",
      "type": "string",
      "description": "The unique identifier for the lead",
      "required": true
    },
    {
      "name": "status",
      "type": "string",
      "description": "New status for the lead",
      "required": true
    },
    {
      "name": "notes",
      "type": "string",
      "description": "Additional notes about the status change",
      "required": false
    }
  ]
}
```

**Schedule Follow-up:**
```json
{
  "name": "schedule_follow_up",
  "description": "Schedule a follow-up call or SMS for the lead",
  "type": "webhook",
  "url": "https://your-backend.com/api/crm/schedule-follow-up",
  "method": "POST",
  "parameters": [
    {
      "name": "leadId",
      "type": "string",
      "description": "The unique identifier for the lead",
      "required": true
    },
    {
      "name": "scheduledTime",
      "type": "string",
      "description": "When to schedule the follow-up (ISO 8601 format)",
      "required": true
    },
    {
      "name": "method",
      "type": "string", 
      "description": "Follow-up method (call, sms, email)",
      "required": true
    }
  ]
}
```

**Transfer to Human:**
```json
{
  "name": "transfer_to_human",
  "description": "Transfer the conversation to a human agent when needed",
  "type": "webhook",
  "url": "https://your-backend.com/api/escalation/transfer-to-human",
  "method": "POST",
  "parameters": [
    {
      "name": "leadId",
      "type": "string",
      "description": "The unique identifier for the lead",
      "required": true
    },
    {
      "name": "reason",
      "type": "string",
      "description": "Reason for transfer",
      "required": true
    },
    {
      "name": "urgency",
      "type": "string",
      "description": "Urgency level (low, medium, high)",
      "required": true
    }
  ]
}
```

### 4. Configure Client Tools

The following client tools are configured in the code for UI interaction:

- `updateConversationUI`: Updates the conversation interface in real-time
- `showLeadInfo`: Displays lead information in the UI
- `notifyHumanAgent`: Triggers human agent notifications

## Installation & Usage

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the Subprime Dashboard

1. Navigate to the Subprime Dashboard
2. Click on any lead to open the detail modal
3. Go to the "Conversation" tab
4. Click "Start Text Chat" or "Start Voice Call"

## Features Overview

### Voice Communication
- **Outbound Calls**: AI can initiate calls to leads
- **Voice Recognition**: Real-time speech-to-text conversion
- **Natural Conversation**: Human-like voice interaction
- **Mode Switching**: Can switch from voice to text mid-conversation

### Text Communication  
- **SMS Integration**: Send and receive text messages
- **Contextual Responses**: AI maintains context across messages
- **Typing Indicators**: Real-time conversation status
- **Message History**: Complete conversation transcript

### Lead Management
- **Real-time Updates**: Lead status updates during conversations
- **Sentiment Tracking**: AI detects customer sentiment
- **Progress Tracking**: Monitors conversation progress through sales funnel
- **Follow-up Scheduling**: AI can schedule callbacks automatically

### Human Handoff
- **Smart Transfer**: AI detects when human help is needed
- **Context Preservation**: Full conversation history available to human agents
- **Urgency Levels**: Prioritizes transfers based on situation
- **Seamless Transition**: No interruption in customer experience

## Development Notes

### Architecture

The implementation uses:
- **ElevenLabs Conversational AI 2.0**: Modern multimodal platform
- **React Components**: Modular UI components for conversation interface
- **TypeScript**: Type-safe development with comprehensive interfaces
- **Real-time State Management**: Live conversation state updates

### Key Files

- `src/services/elevenLabsService.ts`: Main conversation manager
- `src/components/subprime/ConversationInterface.tsx`: UI for conversations
- `src/components/subprime/SubprimeLeadDetailModal.tsx`: Lead detail modal
- `src/types/elevenlabs.ts`: TypeScript type definitions
- `src/api/elevenlabs/webhooks.ts`: Server tool handlers

### Customization

You can customize:
- **Agent Voice**: Change voice ID in ElevenLabs dashboard
- **System Prompts**: Modify agent behavior and responses
- **UI Components**: Customize conversation interface styling
- **CRM Integration**: Add your own CRM webhook endpoints
- **Compliance Rules**: Adjust for your specific regulatory requirements

## Production Deployment

### Security Considerations

1. **Use Signed URLs**: Replace direct agent ID with signed URL authentication
2. **API Key Protection**: Never expose ElevenLabs API key in client code
3. **Webhook Security**: Verify webhook signatures from ElevenLabs
4. **HTTPS Only**: Ensure all communication is encrypted

### Performance Optimization

1. **Connection Pooling**: Reuse WebSocket connections when possible
2. **Message Batching**: Batch conversation updates for better performance
3. **Caching**: Cache lead context data to reduce API calls
4. **CDN Integration**: Use CDN for audio files and static assets

### Monitoring & Analytics

1. **Conversation Metrics**: Track conversation length, success rates
2. **Error Monitoring**: Monitor connection failures and retries
3. **Performance Tracking**: Measure response times and latency
4. **Compliance Auditing**: Log all interactions for regulatory compliance

## Troubleshooting

### Common Issues

**Connection Fails:**
- Check API key validity
- Verify agent ID is correct
- Ensure network connectivity

**No Audio in Voice Mode:**
- Check microphone permissions
- Verify browser supports WebRTC
- Test audio device functionality

**Messages Not Sending:**
- Verify conversation is connected
- Check for rate limiting
- Ensure proper error handling

**Human Transfer Not Working:**
- Verify webhook endpoints are accessible
- Check webhook authentication
- Ensure proper CRM integration

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('ElevenLabs Debug Mode: ON');
```

## Support

For technical support:
- ElevenLabs Documentation: [docs.elevenlabs.io](https://docs.elevenlabs.io)
- GitHub Issues: Create issues for bugs or feature requests
- Discord Community: Join the ElevenLabs Discord for community support

## Next Steps

1. **Production Backend**: Implement server-side webhook handlers
2. **Twilio Integration**: Add actual phone calling capabilities  
3. **Advanced Analytics**: Build conversation analytics dashboard
4. **Multi-tenant Support**: Support multiple dealerships/organizations
5. **Mobile App**: Create mobile version of conversation interface 