import { NextRequest, NextResponse } from 'next/server';

interface SMSRequest {
  to: string;
  message: string;
  leadId: string;
  agentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SMSRequest = await request.json();
    const { to, message, leadId, agentId } = body;

    // Validate required Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    console.log('📱 Sending SMS via Twilio');
    console.log('📞 To:', to);
    console.log('👤 Lead:', leadId);
    console.log('💬 Message:', message.substring(0, 50) + '...');

    // Send SMS via Twilio API
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
      const errorData = await response.text();
      console.error('❌ Twilio API error:', errorData);
      throw new Error(`Twilio API error: ${response.statusText}`);
    }

    const smsData = await response.json();
    console.log('✅ SMS sent successfully');
    console.log('📱 Message SID:', smsData.sid);

    // Broadcast real-time update to connected clients
    await broadcastSMSUpdate(leadId, {
      type: 'sms_sent',
      message: {
        id: smsData.sid,
        content: message,
        speaker: 'agent',
        timestamp: new Date().toISOString(),
        mode: 'text',
        metadata: {
          smsId: smsData.sid,
          smsSent: true
        }
      }
    });

    return NextResponse.json({
      success: true,
      messageSid: smsData.sid,
      status: smsData.status,
      message: 'SMS sent successfully',
      data: smsData
    });

  } catch (error: any) {
    console.error('❌ Failed to send SMS:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send SMS',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Broadcast real-time SMS update to connected clients
 */
async function broadcastSMSUpdate(leadId: string, update: any) {
  // This would integrate with your WebSocket/SSE system
  console.log('📡 Broadcasting SMS update:', leadId, update.type);
  
  // You would implement WebSocket broadcasting here
  // For now, we'll just log it
  // wsManager.broadcast(`lead_${leadId}`, update);
} 