
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
    const signature = req.headers.get('xi-signature')
    const webhookSecret = Deno.env.get('ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET')
    
    console.log('🔔 ElevenLabs webhook received')
    
    const payload = await req.json()
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log webhook for debugging
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'elevenlabs',
        event_type: payload.type || 'unknown',
        payload: payload,
        signature_verified: !!signature,
        processed_successfully: false
      })

    console.log('📝 Webhook payload:', JSON.stringify(payload, null, 2))

    const eventData = payload.data
    const eventType = payload.type

    // Extract lead information
    const leadId = eventData?.conversation_initiation_client_data?.lead_id
    const conversationId = eventData?.conversation_id
    const phoneNumber = eventData?.conversation_initiation_client_data?.customer_phone

    console.log('🔍 Extracted data:', { eventType, leadId, conversationId, phoneNumber })

    if (!leadId) {
      console.error('❌ No lead ID found in webhook')
      return new Response('No lead ID found', { status: 400, headers: corsHeaders })
    }

    // Find conversation in database
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('elevenlabs_conversation_id', conversationId)
      .single()

    if (!conversation) {
      // Try to find by lead_id and type if conversation_id doesn't match
      const { data: fallbackConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .eq('type', 'voice')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      conversation = fallbackConv
    }

    // Handle different event types
    switch (eventType) {
      case 'conversation_started':
        console.log('🎙️ Conversation started')
        if (conversation) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              speaker: 'system',
              content: 'Voice conversation started',
              message_type: 'system'
            })
        }
        break

      case 'user_message':
      case 'user_transcript':
        console.log('👤 User spoke:', eventData.message || eventData.transcript)
        if (conversation && (eventData.message || eventData.transcript)) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              speaker: 'user',
              content: eventData.message || eventData.transcript,
              message_type: 'voice',
              metadata: {
                is_final: eventData.is_final || true,
                confidence: eventData.confidence
              }
            })

          // Broadcast real-time update
          await broadcastUpdate(leadId, {
            type: 'voice_received',
            message: eventData.message || eventData.transcript,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
          })
        }
        break

      case 'agent_message':
      case 'agent_response':
        console.log('🤖 Agent responded:', eventData.message || eventData.response)
        if (conversation && (eventData.message || eventData.response)) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              speaker: 'agent',
              content: eventData.message || eventData.response,
              message_type: 'voice',
              metadata: {
                audio_url: eventData.audio_url
              }
            })

          // Broadcast real-time update
          await broadcastUpdate(leadId, {
            type: 'voice_sent',
            message: eventData.message || eventData.response,
            conversationId: conversationId,
            timestamp: new Date().toISOString()
          })
        }
        break

      case 'conversation_ended':
        console.log('📞 Conversation ended')
        if (conversation) {
          await supabase
            .from('conversations')
            .update({
              status: 'completed',
              ended_at: new Date().toISOString(),
              duration_seconds: eventData.duration_ms ? Math.floor(eventData.duration_ms / 1000) : null
            })
            .eq('id', conversation.id)

          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              speaker: 'system',
              content: `Voice conversation ended. Duration: ${eventData.duration_ms ? Math.floor(eventData.duration_ms / 1000) : 0} seconds`,
              message_type: 'system'
            })

          // Broadcast real-time update
          await broadcastUpdate(leadId, {
            type: 'call_ended',
            duration: eventData.duration_ms ? Math.floor(eventData.duration_ms / 1000) : 0,
            timestamp: new Date().toISOString()
          })
        }
        break

      default:
        console.log('ℹ️ Unhandled event type:', eventType)
    }

    // Mark webhook as processed successfully
    await supabase
      .from('webhook_logs')
      .update({ processed_successfully: true })
      .eq('webhook_type', 'elevenlabs')
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })
      .limit(1)

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Helper function to broadcast real-time updates
async function broadcastUpdate(leadId: string, update: any) {
  try {
    // In a real implementation, you'd use Supabase Realtime or WebSockets
    // For now, we'll store in a realtime table that the frontend can subscribe to
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📡 Broadcasting update for lead:', leadId, update.type)
    
    // You could implement this with Supabase Realtime channels
    // or create a realtime_updates table for the frontend to poll/subscribe to
    
  } catch (error) {
    console.error('❌ Failed to broadcast update:', error)
  }
}
