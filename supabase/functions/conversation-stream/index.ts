import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Extract lead ID from URL
  const url = new URL(req.url)
  const leadId = url.pathname.split('/').pop()

  if (!leadId) {
    return new Response('Lead ID required', { status: 400 })
  }

  console.log('🔄 Setting up SSE stream for lead:', leadId)

  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      const sendEvent = (data: any) => {
        const eventData = `data: ${JSON.stringify(data)}\n\n`
        try {
          controller.enqueue(encoder.encode(eventData))
        } catch (error) {
          console.error('❌ Error sending SSE event:', error)
        }
      }

      // Send initial connection message
      sendEvent({
        type: 'connected',
        leadId,
        timestamp: new Date().toISOString(),
        message: 'Real-time stream connected'
      })

      // Set up heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        sendEvent({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })
      }, 30000) // Every 30 seconds

      // Initialize Supabase client for real-time subscriptions
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Subscribe to new messages for this lead's conversations
      const messagesSubscription = supabase
        .channel(`messages_${leadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=in.(select id from conversations where lead_id=eq.${leadId})`
          },
          (payload) => {
            console.log('📨 New message for lead:', leadId, payload.new)
            const message = payload.new
            
            let eventType = 'message_received'
            if (message.speaker === 'agent') {
              eventType = message.message_type === 'voice' ? 'voice_sent' : 'sms_sent'
            } else if (message.speaker === 'user') {
              eventType = message.message_type === 'voice' ? 'voice_received' : 'sms_received'
            }

            sendEvent({
              type: eventType,
              message: message.content,
              speaker: message.speaker,
              messageType: message.message_type,
              timestamp: message.timestamp,
              conversationId: message.conversation_id,
              messageSid: message.twilio_message_sid
            })
          }
        )
        .subscribe()

      // Subscribe to conversation status changes
      const conversationsSubscription = supabase
        .channel(`conversations_${leadId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `lead_id=eq.${leadId}`
          },
          (payload) => {
            console.log('📞 Conversation updated for lead:', leadId, payload.new)
            const conversation = payload.new
            
            if (conversation.status === 'completed' && conversation.type === 'voice') {
              sendEvent({
                type: 'call_ended',
                conversationId: conversation.id,
                duration: conversation.duration_seconds,
                timestamp: new Date().toISOString()
              })
            }
          }
        )
        .subscribe()

      // Cleanup on connection close
      req.signal.addEventListener('abort', () => {
        console.log('🔌 SSE connection closed for lead:', leadId)
        clearInterval(heartbeatInterval)
        supabase.removeChannel(messagesSubscription)
        supabase.removeChannel(conversationsSubscription)
        try {
          controller.close()
        } catch (error) {
          console.error('❌ Error closing controller:', error)
        }
      })

      console.log('✅ SSE stream established for lead:', leadId)
    },
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
    },
  })
})
