import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const AGENT_ID = 'agent_01jwc5v1nafjwv7zw4vtz1050m';

interface ConversationEventData {
  type: 'conversation_started' | 'conversation_ended' | 'user_message' | 'agent_message' | 'interruption' | 'silence_detected';
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    message?: string;
    speaker?: 'agent' | 'user';
    duration_ms?: number;
    metadata?: {
      phone_number?: string;
      call_sid?: string;
      interruption_type?: string;
      silence_duration_ms?: number;
    };
    conversation_initiation_client_data?: {
      lead_id?: string;
      dynamic_variables?: Record<string, string>;
    };
  };
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(',');
    const timestamp = parts.find(part => part.startsWith('t='))?.substring(2);
    const hash = parts.find(part => part.startsWith('v0='))?.substring(3);

    if (!timestamp || !hash) {
      console.error('Invalid signature format');
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    const tolerance = 30 * 60; // 30 minutes

    if (currentTime - webhookTime > tolerance) {
      console.error('Webhook timestamp too old');
      return false;
    }

    const payloadToSign = `${timestamp}.${payload}`;
    const expectedHash = crypto.createHmac('sha256', secret).update(payloadToSign, 'utf8').digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

async function broadcastConversationEvent(leadId: string, eventData: any) {
  try {
    const streams = global.conversationStreams as Map<string, any> | undefined;
    const connection = streams?.get(leadId);
    
    if (connection) {
      connection.sendEvent({
        type: 'conversation_event',
        event: eventData,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Broadcasted conversation event:', leadId, eventData.type);
    }
  } catch (error) {
    console.error('❌ Failed to broadcast conversation event:', error);
  }
}

async function handleConversationStarted(eventData: ConversationEventData) {
  console.log('🚀 Conversation started:', eventData.data.conversation_id);
  
  const leadId = eventData.data.conversation_initiation_client_data?.lead_id;
  const phoneNumber = eventData.data.metadata?.phone_number;
  
  if (leadId) {
    await broadcastConversationEvent(leadId, {
      type: 'conversation_started',
      conversationId: eventData.data.conversation_id,
      phoneNumber,
      timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
    });
    
    // Update lead status to "in-conversation"
    console.log('📝 Updating lead status to in-conversation:', leadId);
  }
}

async function handleConversationEnded(eventData: ConversationEventData) {
  console.log('🏁 Conversation ended:', eventData.data.conversation_id);
  
  const leadId = eventData.data.conversation_initiation_client_data?.lead_id;
  const duration = eventData.data.duration_ms;
  
  if (leadId) {
    await broadcastConversationEvent(leadId, {
      type: 'conversation_ended',
      conversationId: eventData.data.conversation_id,
      duration,
      timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
    });
    
    // Update lead status back to "available"
    console.log('📝 Updating lead status to available:', leadId);
  }
}

async function handleMessage(eventData: ConversationEventData) {
  console.log('💬 Message received:', eventData.data.speaker, eventData.data.message?.substring(0, 50));
  
  const leadId = eventData.data.conversation_initiation_client_data?.lead_id;
  
  if (leadId && eventData.data.message) {
    await broadcastConversationEvent(leadId, {
      type: 'message',
      conversationId: eventData.data.conversation_id,
      speaker: eventData.data.speaker,
      message: eventData.data.message,
      timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
    });
  }
}

async function handleInterruption(eventData: ConversationEventData) {
  console.log('⚡ Interruption detected:', eventData.data.metadata?.interruption_type);
  
  const leadId = eventData.data.conversation_initiation_client_data?.lead_id;
  
  if (leadId) {
    await broadcastConversationEvent(leadId, {
      type: 'interruption',
      conversationId: eventData.data.conversation_id,
      interruptionType: eventData.data.metadata?.interruption_type,
      timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
    });
  }
}

async function handleSilenceDetected(eventData: ConversationEventData) {
  console.log('🤐 Silence detected:', eventData.data.metadata?.silence_duration_ms, 'ms');
  
  const leadId = eventData.data.conversation_initiation_client_data?.lead_id;
  const silenceDuration = eventData.data.metadata?.silence_duration_ms;
  
  if (leadId && silenceDuration && silenceDuration > 5000) { // Only report significant silences
    await broadcastConversationEvent(leadId, {
      type: 'silence_detected',
      conversationId: eventData.data.conversation_id,
      duration: silenceDuration,
      timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('xi-signature');
    const payload = await request.text();

    if (!signature) {
      console.error('Missing ElevenLabs signature header');
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const webhookSecret = process.env.ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('ElevenLabs conversation events webhook secret not configured');
      return NextResponse.json({ error: 'Conversation events webhook secret not configured' }, { status: 500 });
    }

    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid ElevenLabs webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const eventData: ConversationEventData = JSON.parse(payload);

    // Validate agent ID
    if (eventData.data.agent_id !== AGENT_ID) {
      console.error('Invalid agent ID:', eventData.data.agent_id);
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    console.log('📡 ElevenLabs Conversation Event:', {
      type: eventData.type,
      conversationId: eventData.data.conversation_id,
      timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
    });

    // Handle different event types
    switch (eventData.type) {
      case 'conversation_started':
        await handleConversationStarted(eventData);
        break;
      case 'conversation_ended':
        await handleConversationEnded(eventData);
        break;
      case 'user_message':
      case 'agent_message':
        await handleMessage(eventData);
        break;
      case 'interruption':
        await handleInterruption(eventData);
        break;
      case 'silence_detected':
        await handleSilenceDetected(eventData);
        break;
      default:
        console.log('🤷 Unknown event type:', eventData.type);
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation event processed successfully',
      eventType: eventData.type
    });

  } catch (error) {
    console.error('❌ Error processing conversation event webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'elevenlabs-conversation-events-webhook',
    timestamp: new Date().toISOString(),
  });
} 