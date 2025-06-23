
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber, leadId } = await req.json()

    if (!phoneNumber || !leadId) {
      throw new Error('Phone number and lead ID are required')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get or create lead
    let { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError && leadError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch lead: ${leadError.message}`)
    }

    if (!lead) {
      throw new Error('Lead not found')
    }

    console.log('🔄 Initiating outbound call for lead:', leadId, 'to:', phoneNumber)

    // Create conversation record
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        type: 'voice',
        status: 'active',
        metadata: {
          phone_number: phoneNumber,
          lead_name: lead.name,
          initiated_by: 'agent'
        }
      })
      .select()
      .single()

    if (convError) {
      throw new Error(`Failed to create conversation: ${convError.message}`)
    }

    // Prepare ElevenLabs call payload
    const callPayload = {
      agent_id: Deno.env.get('ELEVENLABS_AGENT_ID'),
      agent_phone_number_id: Deno.env.get('ELEVENLABS_PHONE_NUMBER_ID'),
      to_number: phoneNumber,
      conversation_initiation_client_data: {
        lead_id: leadId,
        conversation_id: conversation.id,
        customer_phone: phoneNumber,
        customer_name: lead.name || 'Customer'
      }
    }

    console.log('📞 Calling ElevenLabs API with payload:', JSON.stringify(callPayload, null, 2))

    // Make the outbound call via ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/outbound_call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') ?? ''
      },
      body: JSON.stringify(callPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ ElevenLabs API error:', response.status, errorText)
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
    }

    const callResult = await response.json()
    console.log('✅ ElevenLabs call initiated:', callResult)

    // Update conversation with ElevenLabs conversation ID
    await supabase
      .from('conversations')
      .update({
        elevenlabs_conversation_id: callResult.conversation_id,
        twilio_call_sid: callResult.call_sid,
        metadata: {
          ...conversation.metadata,
          elevenlabs_response: callResult
        }
      })
      .eq('id', conversation.id)

    // Log the call initiation
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        speaker: 'system',
        content: `Outbound call initiated to ${phoneNumber}`,
        message_type: 'system',
        metadata: {
          call_sid: callResult.call_sid,
          conversation_id: callResult.conversation_id
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: callResult.conversation_id,
        callSid: callResult.call_sid,
        message: 'Call initiated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error in outbound call:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to initiate call'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
