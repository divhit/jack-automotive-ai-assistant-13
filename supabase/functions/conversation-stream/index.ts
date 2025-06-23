import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}

serve(async (req) => {
  const url = new URL(req.url)
  const leadId = url.pathname.split('/').pop()

  if (!leadId) {
    return new Response('Lead ID is required', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  console.log('🔄 Setting up SSE stream for lead:', leadId)

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Check if leadId is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  let actualLeadId = leadId

  if (!uuidRegex.test(leadId)) {
    // For demo leads, try to find the actual lead ID by the original_lead_id metadata
    console.log('🔍 Demo lead detected, searching for actual lead ID')
    
    const { data: lead, error } = await supabase
      .from('leads')
      .select('id')
      .eq('metadata->>original_lead_id', leadId)
      .single()

    if (lead) {
      actualLeadId = lead.id
      console.log('✅ Found actual lead ID:', actualLeadId, 'for demo lead:', leadId)
    } else {
      console.log('⚠️ No lead found for demo ID:', leadId, 'will use original ID')
    }
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      console.log('✅ SSE stream established for lead:', leadId)
      
      let isClosed = false
      
      // Helper function to safely enqueue data
      const safeEnqueue = (data: string) => {
        try {
          if (!isClosed) {
            controller.enqueue(`data: ${data}\n\n`)
          }
        } catch (error) {
          console.error('Error enqueuing data:', error)
          cleanup()
        }
      }
      
      // Send initial connection message
      const initialData = JSON.stringify({
        type: 'connected',
        leadId: leadId,
        timestamp: new Date().toISOString(),
        message: 'Real-time stream connected'
      })
      
      safeEnqueue(initialData)
      
      // Set up heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        const heartbeatData = JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })
        safeEnqueue(heartbeatData)
      }, 30000) // Send heartbeat every 30 seconds
      
      // Set up database change listener for conversations related to this lead
      const conversationSubscription = supabase
        .channel(`conversations-${actualLeadId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `lead_id=eq.${actualLeadId}`
          },
          (payload) => {
            console.log('📡 Conversation change:', payload)
            const eventData = JSON.stringify({
              type: 'conversation_update',
              leadId: leadId,
              timestamp: new Date().toISOString(),
              data: payload
            })
            safeEnqueue(eventData)
          }
        )
        .subscribe()

      // Set up database change listener for messages
      const messageSubscription = supabase
        .channel(`messages-${actualLeadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            console.log('📡 Message change:', payload)
            
            // Check if this message belongs to a conversation for our lead
            const { data: conversation } = await supabase
              .from('conversations')
              .select('lead_id')
              .eq('id', payload.new.conversation_id)
              .single()

            if (conversation && conversation.lead_id === actualLeadId) {
              const eventData = JSON.stringify({
                type: payload.new.speaker === 'agent' ? 'voice_sent' : 'voice_received',
                leadId: leadId,
                timestamp: payload.new.timestamp || new Date().toISOString(),
                message: payload.new.content,
                conversationId: payload.new.conversation_id
              })
              safeEnqueue(eventData)
            }
          }
        )
        .subscribe()
      
      // Cleanup function
      const cleanup = () => {
        if (isClosed) return
        isClosed = true
        
        clearInterval(heartbeat)
        conversationSubscription.unsubscribe()
        messageSubscription.unsubscribe()
        
        try {
          controller.close()
        } catch (error) {
          console.error('Error closing controller:', error)
        }
      }
      
      // Handle client disconnect
      req.signal?.addEventListener('abort', cleanup)
      
      // Auto-cleanup after 1 hour
      setTimeout(cleanup, 3600000)
    }
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
    },
  })
})
