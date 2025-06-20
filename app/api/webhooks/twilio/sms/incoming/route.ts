import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Your existing agent configuration
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_01jwc5v1nafjwv7zw4vtz1050m';

interface SMSWebhookData {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  MediaUrl0?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
}

/**
 * Verify Twilio webhook signature
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  try {
    // Create the signature string
    const data = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(url + data)
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );
  } catch (error) {
    console.error('Error verifying Twilio signature:', error);
    return false;
  }
}

/**
 * Find lead by phone number
 */
async function findLeadByPhoneNumber(phoneNumber: string): Promise<any> {
  // This would integrate with your lead database
  // For now, we'll simulate finding a lead
  console.log('Finding lead by phone number:', phoneNumber);
  
  // You would implement actual lead lookup here
  // const lead = await db.leads.findByPhone(phoneNumber);
  
  return {
    id: 'lead_' + phoneNumber.replace(/\D/g, ''),
    customerName: 'Customer',
    phoneNumber: phoneNumber,
    conversationId: null // Will be set when conversation is active
  };
}

/**
 * Inject SMS message into ElevenLabs conversation using client events
 */
async function injectSMSIntoConversation(leadId: string, phoneNumber: string, message: string) {
  try {
    console.log('🔄 Injecting SMS into ElevenLabs conversation context');
    
    // Check if there's an active conversation for this lead
    const activeConversations = await getActiveConversations(leadId);
    
    if (activeConversations.length > 0) {
      // Inject into active conversation using client events
      for (const conversation of activeConversations) {
        await injectMessageViaClientEvent(conversation.conversationId, {
          type: 'sms_received',
          from: phoneNumber,
          message: message,
          timestamp: new Date().toISOString(),
          leadId: leadId
        });
      }
    } else {
      // Store message for when conversation starts
      await storeMessageForLater(leadId, {
        type: 'sms',
        content: message,
        speaker: 'lead',
        timestamp: new Date().toISOString(),
        mode: 'text'
      });
    }
    
    console.log('✅ SMS injected into conversation context');
  } catch (error) {
    console.error('❌ Failed to inject SMS into conversation:', error);
  }
}

/**
 * Get active ElevenLabs conversations for a lead
 */
async function getActiveConversations(leadId: string): Promise<any[]> {
  // This would check for active WebSocket connections or conversation sessions
  // You'd implement this based on how you track active conversations
  console.log('Checking for active conversations for lead:', leadId);
  
  // Mock implementation - you'd replace with actual conversation tracking
  return []; // Return empty for now, indicating no active conversations
}

/**
 * Inject message into ElevenLabs conversation via client event
 */
async function injectMessageViaClientEvent(conversationId: string, eventData: any) {
  try {
    // Use ElevenLabs client-to-server events to inject context
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/client-events`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'context_update',
        data: {
          event_type: 'sms_received',
          message: eventData.message,
          from: eventData.from,
          timestamp: eventData.timestamp,
          context: `User sent SMS: "${eventData.message}". Please acknowledge this message and continue the conversation naturally.`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to inject client event: ${response.statusText}`);
    }

    console.log('✅ Client event injected successfully');
  } catch (error) {
    console.error('❌ Failed to inject client event:', error);
    throw error;
  }
}

/**
 * Store message for later injection when conversation starts
 */
async function storeMessageForLater(leadId: string, message: any) {
  // Store in your conversation history system
  // This will be loaded when the conversation manager initializes
  console.log('📝 Storing SMS message for later injection:', leadId, message);
  
  // You would implement persistent storage here
  // await conversationHistory.addMessage(leadId, message);
}

/**
 * Generate agent response to SMS using ElevenLabs
 */
async function generateAgentResponse(leadId: string, phoneNumber: string, userMessage: string): Promise<string> {
  try {
    // Start a conversation specifically for SMS response generation
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        session_id: `sms_${leadId}_${Date.now()}`,
        context: `This is an SMS conversation. User sent: "${userMessage}". Please provide a brief, appropriate SMS response.`,
        mode: 'text_only'
      })
    });

    const conversationData = await response.json();
    
    // Get the agent's response
    if (conversationData.response) {
      return conversationData.response;
    }
    
    // Fallback response
    return "Thanks for your message! I'll get back to you shortly.";
    
  } catch (error) {
    console.error('❌ Failed to generate agent response:', error);
    return "Thanks for your message! I'll get back to you shortly.";
  }
}

/**
 * Send SMS response via Twilio
 */
async function sendSMSResponse(to: string, message: string): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: message
      })
    });

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    console.log('✅ SMS response sent successfully');
  } catch (error) {
    console.error('❌ Failed to send SMS response:', error);
    throw error;
  }
}

/**
 * Broadcast real-time update to connected clients
 */
async function broadcastRealtimeUpdate(leadId: string, update: any) {
  try {
    // Use global stream connections for broadcasting
    const streams = (global as any).conversationStreams as Map<string, any> | undefined;
    const connection = streams?.get(leadId);
    
    if (connection) {
      connection.sendEvent({
        ...update,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Broadcasted real-time update to lead:', leadId, update.type);
    } else {
      console.log('⚠️ No active stream for lead:', leadId);
    }
  } catch (error) {
    console.error('❌ Failed to broadcast real-time update:', error);
  }
}

/**
 * Main POST handler for Twilio SMS webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature');
    const url = request.url;
    
    if (!twilioSignature) {
      console.error('Missing Twilio signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Get form data from Twilio
    const formData = await request.formData();
    const params: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    // Verify signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('Twilio auth token not configured');
      return NextResponse.json(
        { error: 'Twilio auth token not configured' },
        { status: 500 }
      );
    }

    if (!verifyTwilioSignature(url, params, twilioSignature, authToken)) {
      console.error('Invalid Twilio signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Extract SMS data
    const smsData: SMSWebhookData = {
      MessageSid: params.MessageSid,
      From: params.From,
      To: params.To,
      Body: params.Body,
      NumMedia: params.NumMedia || '0',
      MediaUrl0: params.MediaUrl0,
      FromCity: params.FromCity,
      FromState: params.FromState,
      FromZip: params.FromZip,
      FromCountry: params.FromCountry
    };

    console.log('📱 Incoming SMS:', {
      from: smsData.From,
      body: smsData.Body,
      messageSid: smsData.MessageSid
    });

    // Find lead by phone number
    const lead = await findLeadByPhoneNumber(smsData.From);
    
    // Inject SMS into ElevenLabs conversation context
    await injectSMSIntoConversation(lead.id, smsData.From, smsData.Body);
    
    // Broadcast real-time update to UI
    await broadcastRealtimeUpdate(lead.id, {
      type: 'sms_received',
      message: {
        id: smsData.MessageSid,
        content: smsData.Body,
        speaker: 'lead',
        timestamp: new Date().toISOString(),
        mode: 'text',
        metadata: {
          smsId: smsData.MessageSid,
          fromCity: smsData.FromCity,
          fromState: smsData.FromState
        }
      }
    });

    // Determine if we should auto-respond
    const shouldAutoRespond = await shouldGenerateAutoResponse(lead.id, smsData.Body);
    
    if (shouldAutoRespond) {
      const agentResponse = await generateAgentResponse(lead.id, smsData.From, smsData.Body);
      await sendSMSResponse(smsData.From, agentResponse);
      
      // Broadcast agent response to UI
      await broadcastRealtimeUpdate(lead.id, {
        type: 'sms_sent',
        message: {
          id: `agent_${Date.now()}`,
          content: agentResponse,
          speaker: 'agent',
          timestamp: new Date().toISOString(),
          mode: 'text'
        }
      });
    }

    // Return TwiML response (empty response means no immediate reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml'
        }
      }
    );

  } catch (error) {
    console.error('❌ Error processing SMS webhook:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Determine if we should generate an auto-response
 */
async function shouldGenerateAutoResponse(leadId: string, message: string): Promise<boolean> {
  // Implement logic to determine when to auto-respond
  // For example: during business hours, if no active conversation, etc.
  
  const businessHours = isBusinessHours();
  const hasActiveConversation = (await getActiveConversations(leadId)).length > 0;
  const isQuestion = message.includes('?') || message.toLowerCase().includes('when') || message.toLowerCase().includes('how');
  
  return businessHours && !hasActiveConversation && isQuestion;
}

function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Monday-Friday, 9 AM - 6 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}

/**
 * GET handler for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'twilio-sms-webhook',
    timestamp: new Date().toISOString(),
  });
} 