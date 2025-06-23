
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
    const { to, message, leadId } = await req.json()

    if (!to || !message || !leadId) {
      throw new Error('To, message, and leadId are required')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📱 Sending SMS to:', to, 'for lead:', leadId)

    // Get or create SMS conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', leadId)
      .eq('type', 'sms')
      .eq('status', 'active')
      .single()

    if (convError && convError.code === 'PGRST116') {
      // Create new SMS conversation
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          lead_id: leadId,
          type: 'sms',
          status: 'active',
          metadata: { phone_number: to }
        })
        .select()
        .single()

      if (newConvError) {
        throw new Error(`Failed to create conversation: ${newConvError.message}`)
      }
      conversation = newConv
    } else if (convError) {
      throw new Error(`Failed to fetch conversation: ${convError.message}`)
    }

    // Send SMS via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber ?? '',
        To: to,
        Body: message
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Twilio API error:', errorData)
      throw new Error(`Twilio API error: ${response.statusText}`)
    }

    const smsData = await response.json()
    console.log('✅ SMS sent successfully:', smsData.sid)

    // Store message in database
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        speaker: 'agent',
        content: message,
        message_type: 'text',
        twilio_message_sid: smsData.sid,
        metadata: {
          twilio_status: smsData.status,
          direction: 'outbound'
        }
      })

    if (msgError) {
      console.error('❌ Failed to store message:', msgError)
    }

    // Store SMS status
    await supabase
      .from('sms_status')
      .insert({
        twilio_message_sid: smsData.sid,
        status: smsData.status,
        message_id: null // We'd need to get the message ID from the previous insert
      })

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: smsData.sid,
        status: smsData.status,
        message: 'SMS sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error sending SMS:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send SMS'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
