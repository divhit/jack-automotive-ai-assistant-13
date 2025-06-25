# ElevenLabs AI Agent Integration for Subprime Lead Management

## Overview

This document outlines the technical implementation and integration strategy for incorporating ElevenLabs conversational AI agents specifically into the **Subprime Lead Management** system of the Jack Automotive AI Assistant. This integration is designed exclusively for subprime leads and is separate from the existing prime customer communication system.

### Important Distinction
- **Prime Leads**: Existing "Customer Conversations" tab and "Chat with Jack" functionality
- **Subprime Leads**: New ElevenLabs-powered voice and SMS integration (this document)

---

## Agent Configuration

### ElevenLabs Agent Details
- **Agent ID**: `agent_01jwc5v1nafjwv7zw4vtz1050m`
- **Purpose**: Outbound calling and SMS conversation management for subprime automotive leads
- **Target Audience**: Vulnerable customers seeking loans/vehicles who may not qualify for traditional financing

### Documentation References
- [ElevenLabs Client Events](https://elevenlabs.io/docs/conversational-ai/customization/events/client-events)
- [ElevenLabs Client-to-Server Events](https://elevenlabs.io/docs/conversational-ai/customization/events/client-to-server-events)
- [ElevenLabs SDK Overview](https://elevenlabs.io/docs/conversational-ai/overview)

---

## System Architecture

### Core Requirements

#### 1. Unified Conversation Management
- **Single Conversation Thread**: Voice calls and SMS messages must maintain continuity within the same conversation
- **Context Preservation**: When switching between voice and text, full conversation history must be preserved
- **No New Conversations**: Switching modalities (voice↔text) should NEVER create a new conversation thread

#### 2. Multi-Modal Communication
- **Outbound Voice Calls**: Initiated through ElevenLabs agent
- **Bi-directional SMS**: Powered by Twilio integration
- **Seamless Transitions**: Users can switch between voice and text without losing context
- **Real-time Transcription**: All voice interactions must be transcribed and stored

#### 3. Human Agent Intervention
- **Jump-in Capability**: Human agents can take over conversations at any time
- **Voice or Text**: Humans can intervene through either modality
- **Conversation Handoff**: Smooth transition between AI and human agents
- **Real-time Monitoring**: All conversations visible in unified dashboard

---

## Technical Implementation

### 1. WebSocket Connection Management

#### Initial Connection Setup
```javascript
// ElevenLabs WebSocket connection for subprime leads
const ELEVENLABS_AGENT_ID = 'agent_01jwc5v1nafjwv7zw4vtz1050m';
const wsUrl = `wss://api.elevenlabs.io/v1/conversational-ai/agents/${ELEVENLABS_AGENT_ID}/conversation`;

const subprimeAgentWebSocket = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Bearer ${ELEVENLABS_API_KEY}`,
    'User-Agent': 'Jack-Automotive-Subprime/1.0'
  }
});
```

#### Connection State Management
- Implement automatic reconnection with exponential backoff
- Maintain conversation state during brief disconnections
- Handle connection failures gracefully with user notifications

### 2. Event Handling Architecture

#### Core Event Handlers
Based on [ElevenLabs Client Events](https://elevenlabs.io/docs/conversational-ai/customization/events/client-events):

```javascript
// Conversation initialization
subprimeAgentWebSocket.on('conversation_initiation_metadata', (event) => {
  const { conversation_id, agent_output_audio_format, user_input_audio_format } = event.conversation_initiation_metadata_event;
  
  // Link to existing subprime lead record
  linkConversationToSubprimeLead(conversation_id, currentLeadId);
  setupAudioFormats(agent_output_audio_format, user_input_audio_format);
});

// Real-time audio processing
subprimeAgentWebSocket.on('audio', (event) => {
  const { audio_base_64, event_id } = event.audio_event;
  
  // Stream audio to lead's phone
  streamAudioToCall(audio_base_64, currentCallId);
  
  // Store audio chunk for conversation history
  storeAudioChunk(currentLeadId, audio_base_64, event_id, 'agent_response');
});

// Voice transcription handling
subprimeAgentWebSocket.on('user_transcript', (event) => {
  const { user_transcript } = event.user_transcription_event;
  
  // Update conversation history in real-time
  updateSubprimeConversationHistory(currentLeadId, {
    type: 'voice_input',
    content: user_transcript,
    timestamp: new Date().toISOString(),
    speaker: 'lead'
  });
});

// Agent response processing
subprimeAgentWebSocket.on('agent_response', (event) => {
  const { agent_response } = event.agent_response_event;
  
  // Display in subprime lead conversation UI
  updateSubprimeConversationHistory(currentLeadId, {
    type: 'voice_response',
    content: agent_response,
    timestamp: new Date().toISOString(),
    speaker: 'agent'
  });
});

// Response correction for interruptions
subprimeAgentWebSocket.on('agent_response_correction', (event) => {
  const { corrected_agent_response } = event.agent_response_correction_event;
  
  // Update the UI with corrected response
  correctLastAgentResponse(currentLeadId, corrected_agent_response);
});
```

### 3. Conversation Continuity Implementation

#### Critical Requirement: Context Preservation
The most important aspect of this implementation is ensuring conversation continuity when switching between voice and SMS.

```javascript
// Conversation Context Manager
class SubprimeConversationManager {
  constructor(leadId) {
    this.leadId = leadId;
    this.conversationHistory = this.loadExistingHistory(leadId);
    this.currentModality = null; // 'voice' or 'sms'
    this.activeConversationId = null;
  }

  async switchToVoice() {
    // Prepare full conversation context for voice call
    const contextualHistory = this.prepareContextForElevenLabs();
    
    // Send contextual update to maintain conversation continuity
    this.sendContextualUpdate(contextualHistory);
    
    this.currentModality = 'voice';
    await this.initiateVoiceCall();
  }

  async switchToSMS() {
    // Prepare conversation context for SMS continuation
    const fullTranscript = this.generateFullTranscript();
    
    // Send context to ElevenLabs for SMS mode
    this.sendContextualUpdate(`Previous conversation history: ${fullTranscript}`);
    
    this.currentModality = 'sms';
    await this.setupSMSMode();
  }

  sendContextualUpdate(contextText) {
    // Using client-to-server events for context preservation
    subprimeAgentWebSocket.send(JSON.stringify({
      type: 'contextual_update',
      text: contextText
    }));
  }

  prepareContextForElevenLabs() {
    // Format conversation history for ElevenLabs context
    return this.conversationHistory.map(message => 
      `${message.speaker}: ${message.content} (${message.type} at ${message.timestamp})`
    ).join('\n');
  }
}
```

### 4. Twilio SMS Integration

#### SMS Webhook Handling
```javascript
// Twilio webhook for incoming SMS from subprime leads
app.post('/webhook/subprime-sms', async (req, res) => {
  const { From, Body, MessageSid } = req.body;
  
  // Find associated subprime lead
  const lead = await findSubprimeLeadByPhone(From);
  if (!lead) {
    console.error('SMS from unknown subprime lead:', From);
    return res.status(404).send('Lead not found');
  }

  // Add SMS to conversation history
  await updateSubprimeConversationHistory(lead.id, {
    type: 'sms_input',
    content: Body,
    timestamp: new Date().toISOString(),
    speaker: 'lead',
    twilioMessageId: MessageSid
  });

  // Send to ElevenLabs as user message to continue conversation
  subprimeAgentWebSocket.send(JSON.stringify({
    type: 'user_message',
    text: Body
  }));

  res.status(200).send('OK');
});

// Outbound SMS sending
async function sendSMSToSubprimeLead(leadId, message) {
  const lead = await getSubprimeLeadById(leadId);
  
  const twilioMessage = await twilioClient.messages.create({
    body: message,
    from: TWILIO_SUBPRIME_NUMBER,
    to: lead.phoneNumber
  });

  // Record outbound SMS in conversation history
  await updateSubprimeConversationHistory(leadId, {
    type: 'sms_output',
    content: message,
    timestamp: new Date().toISOString(),
    speaker: 'agent',
    twilioMessageId: twilioMessage.sid
  });

  // Notify real-time UI
  emitToSubprimeUI('conversation_update', {
    leadId,
    message: {
      type: 'sms_output',
      content: message,
      timestamp: new Date().toISOString(),
      speaker: 'agent'
    }
  });
}
```

### 5. Voice Call Management

#### Outbound Call Initiation
```javascript
async function initiateSubprimeVoiceCall(leadId) {
  const lead = await getSubprimeLeadById(leadId);
  
  // Start Twilio call
  const call = await twilioClient.calls.create({
    from: TWILIO_SUBPRIME_VOICE_NUMBER,
    to: lead.phoneNumber,
    webhook: `https://jack-automotive-ai-assistant-13.onrender.com/webhook/subprime-voice`,
    statusCallback: `https://jack-automotive-ai-assistant-13.onrender.com/webhook/call-status`
  });

  // Initialize ElevenLabs conversation with full context
  const conversationManager = new SubprimeConversationManager(leadId);
  await conversationManager.switchToVoice();

  // Link call to lead record
  await updateSubprimeLeadRecord(leadId, {
    activeCallId: call.sid,
    lastCallAttempt: new Date().toISOString(),
    callStatus: 'initiated'
  });

  return call.sid;
}
```

### 6. Real-time UI Integration

#### Subprime Conversation Component
```typescript
// React component for subprime lead conversations
interface SubprimeConversationProps {
  leadId: string;
  lead: SubprimeLead;
}

const SubprimeConversationInterface: React.FC<SubprimeConversationProps> = ({ leadId, lead }) => {
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [canSendSMS, setCanSendSMS] = useState(true);
  const [humanTakeoverMode, setHumanTakeoverMode] = useState(false);

  // Real-time conversation updates
  useEffect(() => {
    const socket = io();
    
    socket.on('subprime_conversation_update', (data) => {
      if (data.leadId === leadId) {
        setConversationHistory(prev => [...prev, data.message]);
      }
    });

    socket.on('subprime_call_status', (data) => {
      if (data.leadId === leadId) {
        setIsCallActive(data.isActive);
      }
    });

    return () => socket.disconnect();
  }, [leadId]);

  const handleInitiateCall = async () => {
    try {
      await initiateSubprimeVoiceCall(leadId);
      setIsCallActive(true);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  };

  const handleSendSMS = async (message: string) => {
    if (!humanTakeoverMode) {
      // AI-powered SMS
      await sendSMSToSubprimeLead(leadId, message);
    } else {
      // Human-sent SMS
      await sendHumanSMSToSubprimeLead(leadId, message);
    }
  };

  const handleHumanTakeover = () => {
    setHumanTakeoverMode(true);
    // Pause AI agent
    pauseElevenLabsAgent(leadId);
  };

  const handleReturnToAI = () => {
    setHumanTakeoverMode(false);
    // Resume AI agent with full context
    resumeElevenLabsAgent(leadId, conversationHistory);
  };

  return (
    <div className="subprime-conversation-interface">
      <ConversationHeader 
        lead={lead}
        isCallActive={isCallActive}
        humanTakeoverMode={humanTakeoverMode}
      />
      
      <ConversationHistory 
        messages={conversationHistory}
        showVoiceTranscripts={true}
        showSMSMessages={true}
      />
      
      <ConversationControls
        onInitiateCall={handleInitiateCall}
        onSendSMS={handleSendSMS}
        onHumanTakeover={handleHumanTakeover}
        onReturnToAI={handleReturnToAI}
        isCallActive={isCallActive}
        humanTakeoverMode={humanTakeoverMode}
      />
    </div>
  );
};
```

---

## Data Models

### Subprime Conversation Schema
```typescript
interface SubprimeConversationMessage {
  id: string;
  leadId: string;
  type: 'voice_input' | 'voice_output' | 'sms_input' | 'sms_output' | 'human_intervention';
  content: string;
  timestamp: string;
  speaker: 'lead' | 'agent' | 'human_agent';
  metadata?: {
    audioEventId?: number;
    twilioMessageId?: string;
    callId?: string;
    agentSpecialist?: string;
    sentiment?: string;
    confidence?: number;
  };
}

interface SubprimeCallSession {
  id: string;
  leadId: string;
  conversationId: string; // ElevenLabs conversation ID
  twilioCallId: string;
  startTime: string;
  endTime?: string;
  status: 'initiated' | 'connected' | 'ended' | 'failed';
  duration?: number;
  transcriptComplete: boolean;
  audioRecordingUrl?: string;
}
```

---

## Integration Workflows

### 1. Lead Generation to First Contact
```
Lead from Generation Company → Create Subprime Lead Record → Queue for AI Outbound Call → 
ElevenLabs Agent Initiates Call → Real-time Transcription → Conversation Recorded in DB → 
Continue Voice Conversation OR Schedule SMS Follow-up → Transition to SMS if Needed
```

### 2. Voice to SMS Transition
```
Active Voice Call → Lead Requests Text Communication → Prepare Full Conversation Context → 
Send Contextual Update to ElevenLabs → Switch Agent to SMS Mode → Continue Conversation via SMS → 
Maintain Single Conversation Thread
```

### 3. Human Agent Intervention
```
AI Conversation in Progress → Human Agent Monitors → Intervention Needed? → 
Human Takes Over → Pause AI Agent → Human Handles Voice/SMS → 
Return to AI with Full Context OR Human Continues Manually
```

---

## Configuration Requirements

### Environment Variables
```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=agent_01jwc5v1nafjwv7zw4vtz1050m
ELEVENLABS_WEBSOCKET_URL=wss://api.elevenlabs.io/v1/conversational-ai

# Twilio Configuration (Subprime-specific)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SUBPRIME_PHONE_NUMBER=+1234567890  # Dedicated subprime number
TWILIO_SUBPRIME_SMS_NUMBER=+1234567891    # SMS-specific number

# Database Configuration
SUBPRIME_DB_CONNECTION_STRING=your_database_url

# Real-time Configuration
SOCKET_IO_NAMESPACE=/subprime-conversations
```

### ElevenLabs Agent Configuration
The agent should be configured with:
- **Industry**: Automotive/Financial Services
- **Tone**: Professional but empathetic (dealing with vulnerable customers)
- **Knowledge Base**: Subprime lending, automotive financing, credit education
- **Compliance**: TCPA, FDCPA, state-specific lending regulations

---

## Security and Compliance

### Data Protection
- All voice recordings must be encrypted at rest and in transit
- PII handling must comply with state and federal regulations
- Conversation transcripts should be anonymized for analytics

### TCPA Compliance
- Implement consent tracking for all outbound calls
- Provide clear opt-out mechanisms
- Maintain do-not-call list integration

### Vulnerable Customer Protection
- Implement cooling-off periods for high-pressure situations
- Provide clear disclosure of terms and conditions
- Ensure fair lending practice compliance

---

## Monitoring and Analytics

### Real-time Metrics
- Active call count for subprime leads
- SMS response rates
- Conversation conversion rates
- Human intervention frequency
- Agent performance metrics

### Conversation Quality Metrics
- Average conversation duration
- Sentiment analysis trends
- Successful lead qualification rate
- Voice-to-SMS transition success rate

---

## Testing Strategy

### Integration Testing
1. **Voice Call Flow**: Test complete outbound call to SMS transition
2. **Context Preservation**: Verify conversation continuity across modalities
3. **Human Intervention**: Test seamless handoff between AI and human agents
4. **Error Handling**: Test connection failures and recovery

### Load Testing
- Concurrent conversation handling
- WebSocket connection stability under load
- Database performance with high conversation volume

---

## Implementation Phases

### Phase 1: Core Integration (Weeks 1-2)
- ElevenLabs WebSocket connection
- Basic voice call functionality
- Conversation recording and storage

### Phase 2: SMS Integration (Weeks 3-4)
- Twilio SMS webhook setup
- Voice-to-SMS transition logic
- Context preservation implementation

### Phase 3: UI Integration (Weeks 5-6)
- Real-time conversation display
- Human agent controls
- Subprime lead dashboard integration

### Phase 4: Advanced Features (Weeks 7-8)
- Advanced analytics
- Performance optimization
- Compliance features

---

## Success Criteria

### Technical Success Metrics
- 99.9% conversation continuity when switching modalities
- <100ms latency for real-time conversation updates
- Zero conversation context loss during transitions
- 95% uptime for voice/SMS services

### Business Success Metrics
- Increased subprime lead engagement rates
- Reduced manual agent workload
- Improved conversion rates for subprime leads
- Enhanced customer satisfaction scores

---

**Note**: This implementation is specifically designed for subprime lead management and should remain completely separate from the existing prime customer communication system to ensure appropriate handling of different customer segments and compliance requirements. 