import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Your existing agent configuration
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const AGENT_ID = 'agent_01jwc5v1nafjwv7zw4vtz1050m'; // Your existing agent

interface OutboundCallRequest {
  agentId: string;
  callRequest: {
    leadId: string;
    phoneNumber: string;
    agentOverrides?: {
      systemPrompt?: string;
      firstMessage?: string;
      context?: any;
    };
  };
  conversationHistory?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const body: OutboundCallRequest = await request.json();
    const { agentId, callRequest, conversationHistory } = body;

    // Validate agent ID matches your configured agent
    if (agentId !== AGENT_ID) {
      return NextResponse.json(
        { error: 'Invalid agent ID' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 Initiating outbound call via ElevenLabs + Twilio');
    console.log('📞 Phone:', callRequest.phoneNumber);
    console.log('👤 Lead:', callRequest.leadId);
    console.log('📚 History messages:', conversationHistory?.length || 0);

    // First, get the agent's phone numbers
    const phoneNumbersResponse = await axios.get(
      `${ELEVENLABS_API_BASE}/convai/agents/${AGENT_ID}/phone-numbers`,
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    const phoneNumbers = phoneNumbersResponse.data.phone_numbers;
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No phone numbers configured for agent. Please configure Twilio integration in ElevenLabs dashboard.' },
        { status: 500 }
      );
    }

    const agentPhoneNumberId = phoneNumbers[0].id;
    console.log('📱 Using agent phone number ID:', agentPhoneNumberId);

    // Prepare conversation initiation data with lead context
    const conversationInitiationData = {
      lead_id: callRequest.leadId,
      customer_name: callRequest.agentOverrides?.context?.customerName,
      phone_number: callRequest.phoneNumber,
      conversation_history: conversationHistory?.map(msg => ({
        role: msg.speaker === 'agent' ? 'assistant' : 'user',
        content: msg.content,
        timestamp: msg.timestamp
      })) || [],
      context_summary: callRequest.agentOverrides?.systemPrompt || '',
      resume_message: callRequest.agentOverrides?.firstMessage || ''
    };

    // Initiate the outbound call through ElevenLabs + Twilio
    const callResponse = await axios.post(
      `${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`,
      {
        agent_id: AGENT_ID,
        agent_phone_number_id: agentPhoneNumberId,
        to_number: callRequest.phoneNumber,
        conversation_initiation_client_data: conversationInitiationData,
        // Optional: Override agent settings for this specific call
        ...(callRequest.agentOverrides?.systemPrompt && {
          system_prompt_override: callRequest.agentOverrides.systemPrompt
        }),
        ...(callRequest.agentOverrides?.firstMessage && {
          first_message_override: callRequest.agentOverrides.firstMessage
        })
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Outbound call initiated successfully');
    console.log('📞 Call SID:', callResponse.data.call_sid);

    return NextResponse.json({
      success: true,
      callSid: callResponse.data.call_sid,
      status: 'initiated',
      message: 'Outbound call initiated successfully',
      data: callResponse.data
    });

  } catch (error: any) {
    console.error('❌ Failed to initiate outbound call:', error);
    
    // Handle specific ElevenLabs API errors
    if (error.response?.status === 400) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: error.response.data
        },
        { status: 400 }
      );
    }
    
    if (error.response?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid ElevenLabs API key' },
        { status: 401 }
      );
    }

    if (error.response?.status === 404) {
      return NextResponse.json(
        { 
          error: 'Agent or phone number not found. Please check your ElevenLabs agent configuration.',
          details: error.response.data
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to initiate outbound call',
        details: error.message
      },
      { status: 500 }
    );
  }
} 