
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

    console.log('🔄 Initiating outbound call for lead:', leadId, 'to:', phoneNumber)

    // Validate environment variables
    const agentId = Deno.env.get('ELEVENLABS_AGENT_ID')
    const phoneNumberId = Deno.env.get('ELEVENLABS_PHONE_NUMBER_ID')
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY')

    if (!agentId || !phoneNumberId || !apiKey) {
      console.error('❌ Missing ElevenLabs configuration:', {
        hasAgentId: !!agentId,
        hasPhoneNumberId: !!phoneNumberId,
        hasApiKey: !!apiKey
      })
      throw new Error('ElevenLabs configuration is incomplete. Please check your environment variables.')
    }

    console.log('✅ ElevenLabs config validated:', {
      agentId: agentId.substring(0, 10) + '...',
      phoneNumberId: phoneNumberId.substring(0, 10) + '...',
      hasApiKey: !!apiKey
    })

    // Check if leadId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    let lead = null

    if (uuidRegex.test(leadId)) {
      // Try to get existing lead by UUID
      const { data: existingLead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadError && leadError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch lead: ${leadError.message}`)
      }
      lead = existingLead
    } else {
      // For demo leads (like "test1"), try to find by phone number or create a new one
      console.log('🔍 Demo lead detected, searching by phone number:', phoneNumber)
      
      const { data: existingLead, error: phoneError } = await supabase
        .from('leads')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single()

      if (phoneError && phoneError.code !== 'PGRST116') {
        console.log('Error searching by phone:', phoneError.message)
      }
      
      lead = existingLead
    }

    // If no lead found, create a new one
    if (!lead) {
      console.log('📝 Creating new lead for:', phoneNumber)
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          phone_number: phoneNumber,
          name: `Lead ${leadId}`,
          email: `${leadId}@example.com`,
          status: 'new',
          score: 50,
          metadata: {
            original_lead_id: leadId,
            created_from: 'demo_call'
          }
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create lead: ${createError.message}`)
      }
      lead = newLead
    }

    console.log('✅ Using lead:', lead.id, 'for phone:', phoneNumber)

    // Create conversation record
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        type: 'voice',
        status: 'active',
        metadata: {
          phone_number: phoneNumber,
          lead_name: lead.name,
          initiated_by: 'agent',
          original_lead_id: leadId
        }
      })
      .select()
      .single()

    if (convError) {
      throw new Error(`Failed to create conversation: ${convError.message}`)
    }

    // Use the ORIGINAL working payload format
    const callPayload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      customer_phone_number: phoneNumber,
      conversation_initiation_client_data: {
        lead_id: lead.id,
        conversation_id: conversation.id,
        customer_phone: phoneNumber,
        customer_name: lead.name || 'Customer',
        original_lead_id: leadId
      }
    }

    console.log('📞 Calling ElevenLabs API with payload:', JSON.stringify(callPayload, null, 2))

    // Use the ORIGINAL working endpoint
    const response = await fetch('https://api.elevenlabs.io/v1/convai/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify(callPayload)
    })

    const responseText = await response.text()
    console.log('ElevenLabs API response:', response.status, responseText)

    if (!response.ok) {
      console.error('❌ ElevenLabs API error:', response.status, responseText)
      throw new Error(`ElevenLabs API error: ${response.status} - ${responseText}`)
    }

    const callResult = JSON.parse(responseText)
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
        leadId: lead.id,
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
