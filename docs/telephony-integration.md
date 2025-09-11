# ElevenLabs + Twilio Telephony Integration

This implementation provides a comprehensive voice and text communication system for subprime automotive lead management using ElevenLabs Conversational AI with native Twilio integration.

## 🎯 Key Features

### Context Preservation
- **Phone Number-Based Identity**: Uses phone numbers as unique identifiers for conversation continuity
- **Dynamic Variables**: Injects lead context (name, credit info, vehicle interest) into every conversation
- **Conversation History**: Maintains full history across voice and text interactions
- **Seamless Mode Switching**: Switch between voice and text while preserving context

### Native ElevenLabs Integration
- **Twilio Native**: Uses ElevenLabs' built-in Twilio integration (no custom telephony stack needed)
- **Real-time Voice**: Immediate voice response with context-aware prompts
- **Post-call Webhooks**: Automatic transcript processing and CRM updates
- **Lead Scoring**: AI-driven lead qualification based on conversation analysis

### CRM Integration
- **Automatic Updates**: Post-call webhooks update lead records automatically
- **Follow-up Actions**: Automated scheduling based on conversation outcomes
- **Analytics**: Comprehensive conversation analytics and engagement scoring

## 📁 File Structure

```
src/
├── services/
│   └── telephonyService.ts          # Main telephony service with ElevenLabs integration
├── components/
│   └── subprime/
│       └── TelephonyInterface.tsx   # React component for voice/text UI
└── types/
    └── elevenlabs.ts               # TypeScript interfaces

app/
└── api/
    └── webhooks/
        └── elevenlabs/
            └── post-call/
                └── route.ts        # Webhook handler for post-call processing
```

## 🚀 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret

# Optional: Additional integrations
DATABASE_URL=your_database_url
CRM_API_KEY=your_crm_api_key
```

### 2. ElevenLabs Agent Configuration

Configure your ElevenLabs agent with these dynamic variables:

```
{{customer_name}} - Lead's name
{{phone_number}} - Phone number for identification
{{conversation_summary}} - Summary of previous interactions
{{recent_messages}} - Last 6 conversation messages
{{lead_status}} - Current lead qualification status
{{vehicle_interest}} - Preferred vehicle type
{{credit_score_range}} - Credit score range
{{interaction_count}} - Number of previous interactions
{{last_interaction_date}} - Date of last contact
```

### 3. Webhook Configuration

1. **Development**: Use ngrok to expose your local webhook endpoint:
   ```bash
   ngrok http 3000
   ```

2. **Configure in ElevenLabs**: Set webhook URL to:
   ```
   https://your-domain.ngrok-free.app/api/webhooks/elevenlabs/post-call
   ```

3. **Production**: Use your production domain:
   ```
   https://your-domain.com/api/webhooks/elevenlabs/post-call
   ```

### 6. Configure Webhooks

#### ElevenLabs Agent Configuration

In your ElevenLabs agent settings:

1. **Post-call webhook**: 
   ```
   https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/elevenlabs/post-call
   ```

2. **Conversation initiation webhook**:
   ```
   https://jack-automotive-ai-assistant-13.onrender.com/api/webhooks/elevenlabs/conversation-initiation
   ```

## 💻 Usage Examples

### Initiating a Call

```typescript
import { TelephonyService } from '@/services/telephonyService';

const telephonyService = new TelephonyService();

// Start outbound call with lead context
const result = await telephonyService.initiateCall(
  '+1234567890', // phone number
  {
    id: 'lead-123',
    name: 'John Doe',
    email: 'john@example.com',
    vehicleInterest: 'SUV',
    creditScore: '650-700'
  }
);

console.log('Call initiated:', result.conversationId);
```

### Switching from Text to Voice

```typescript
// Switch existing text conversation to voice
const textHistory = [
  { role: 'user', message: 'I need financing for a car' },
  { role: 'agent', message: 'I can help you with that!' }
];

const result = await telephonyService.switchToVoice(
  '+1234567890',
  textHistory
);
```

## 🔧 Technical Architecture

### Context Preservation Flow

1. **Phone Number Identification**: Every call/text uses phone number as unique ID
2. **Context Retrieval**: System loads conversation history and lead data
3. **Dynamic Variable Injection**: Context data injected into agent prompt
4. **Conversation Processing**: AI responds with full context awareness
5. **Post-call Processing**: Webhook updates CRM and conversation history

### Lead Scoring Algorithm

The system automatically scores leads based on:

- **Call Duration**: Longer calls indicate higher engagement
- **Conversation Content**: Keywords like "interested", "budget", "when" increase score
- **Follow-up Actions**: Requests for scheduling or next steps
- **Sentiment Analysis**: Positive sentiment increases conversion likelihood

## 🔐 Security Features

### Webhook Security

- **HMAC Signature Verification**: Prevents unauthorized webhook calls
- **Timestamp Validation**: Prevents replay attacks
- **IP Whitelisting**: Only accepts requests from ElevenLabs IPs

## 📊 Environment Variables Required

```bash
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
ELEVENLABS_WEBHOOK_SECRET=your_webhook_secret_here
```

## 🚨 Troubleshooting

### Common Issues

1. **Call Failed to Connect**
   - Check phone number format
   - Verify ElevenLabs agent configuration
   - Ensure Twilio integration is active

2. **Webhook Not Receiving Data**
   - Verify webhook URL is accessible
   - Check HMAC signature configuration
   - Ensure endpoint returns 200 status

3. **Context Not Preserved**
   - Verify dynamic variables are configured
   - Check conversation history storage
   - Ensure phone number normalization

---

**Note**: This implementation uses ElevenLabs' native Twilio integration, which eliminates the need for custom telephony infrastructure while providing enterprise-grade voice capabilities with full context preservation. 