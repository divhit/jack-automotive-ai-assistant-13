import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface SMSStatusWebhookData {
  MessageSid: string;
  MessageStatus: 'queued' | 'sending' | 'sent' | 'failed' | 'delivered' | 'undelivered' | 'receiving' | 'received';
  To: string;
  From: string;
  Body?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  AccountSid: string;
  SmsSid: string;
  SmsStatus: string;
  ApiVersion: string;
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
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(data, 'utf-8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying Twilio signature:', error);
    return false;
  }
}

/**
 * Find lead by phone number
 */
async function findLeadByPhoneNumber(phoneNumber: string) {
  // This would integrate with your lead database
  // For now, returning a mock lead
  console.log('🔍 Finding lead by phone number:', phoneNumber);
  
  // In real implementation, query your database
  return {
    id: `lead_${phoneNumber.replace(/\D/g, '')}`,
    phoneNumber,
    name: 'Sample Lead'
  };
}

/**
 * Broadcast real-time SMS status update
 */
async function broadcastSMSStatusUpdate(leadId: string, statusUpdate: any) {
  try {
    // Get the SSE connection for this lead
    const streams = global.conversationStreams as Map<string, any> | undefined;
    const connection = streams?.get(leadId);
    
    if (connection) {
      connection.sendEvent({
        type: 'sms_status_update',
        update: statusUpdate,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Broadcasted SMS status update:', leadId, statusUpdate.status);
    } else {
      console.log('⚠️ No active stream for lead:', leadId);
    }
  } catch (error) {
    console.error('❌ Failed to broadcast SMS status update:', error);
  }
}

/**
 * Update conversation history with status
 */
async function updateConversationHistory(leadId: string, messageSid: string, status: string, errorInfo?: any) {
  try {
    console.log('📝 Updating conversation history with SMS status');
    console.log('📱 Message SID:', messageSid);
    console.log('📊 Status:', status);
    
    // This would update your database with the message status
    // For now, just log it
    
    if (status === 'failed' || status === 'undelivered') {
      console.error('❌ SMS delivery failed:', {
        messageSid,
        status,
        errorCode: errorInfo?.errorCode,
        errorMessage: errorInfo?.errorMessage
      });
    } else if (status === 'delivered') {
      console.log('✅ SMS delivered successfully:', messageSid);
    }
    
    // Store in conversation history
    // await updateLeadConversationHistory(leadId, {
    //   messageId: messageSid,
    //   status: status,
    //   timestamp: new Date().toISOString(),
    //   type: 'sms_status_update'
    // });
    
  } catch (error) {
    console.error('❌ Failed to update conversation history:', error);
  }
}

/**
 * Handle delivery failures and retry logic
 */
async function handleDeliveryFailure(leadId: string, messageSid: string, errorInfo: any) {
  console.log('🔄 Handling SMS delivery failure:', messageSid);
  
  // Log the failure
  console.error('❌ SMS Delivery Failed:', {
    messageSid,
    errorCode: errorInfo.errorCode,
    errorMessage: errorInfo.errorMessage,
    leadId
  });
  
  // Determine if we should retry or use alternative communication
  const shouldRetry = errorInfo.errorCode && ['30001', '30002', '30003'].includes(errorInfo.errorCode);
  
  if (shouldRetry) {
    console.log('🔄 SMS failure is retryable, will attempt retry');
    // Implement retry logic here
  } else {
    console.log('⚠️ SMS failure is not retryable, considering alternative communication');
    // Could trigger a voice call or email instead
  }
  
  // Notify the system about the failure
  await broadcastSMSStatusUpdate(leadId, {
    messageSid,
    status: 'failed',
    error: errorInfo,
    requiresAttention: true
  });
}

/**
 * Main POST handler for Twilio SMS status webhooks
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

    // Extract SMS status data
    const statusData: SMSStatusWebhookData = {
      MessageSid: params.MessageSid,
      MessageStatus: params.MessageStatus as any,
      To: params.To,
      From: params.From,
      Body: params.Body,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage,
      AccountSid: params.AccountSid,
      SmsSid: params.SmsSid,
      SmsStatus: params.SmsStatus,
      ApiVersion: params.ApiVersion
    };

    console.log('📱 SMS Status Update:', {
      messageSid: statusData.MessageSid,
      status: statusData.MessageStatus,
      to: statusData.To,
      errorCode: statusData.ErrorCode
    });

    // Find lead by phone number
    const lead = await findLeadByPhoneNumber(statusData.To);
    
    // Update conversation history with status
    await updateConversationHistory(
      lead.id, 
      statusData.MessageSid, 
      statusData.MessageStatus,
      statusData.ErrorCode ? {
        errorCode: statusData.ErrorCode,
        errorMessage: statusData.ErrorMessage
      } : undefined
    );
    
    // Broadcast real-time update to UI
    await broadcastSMSStatusUpdate(lead.id, {
      messageSid: statusData.MessageSid,
      status: statusData.MessageStatus,
      timestamp: new Date().toISOString(),
      error: statusData.ErrorCode ? {
        code: statusData.ErrorCode,
        message: statusData.ErrorMessage
      } : undefined
    });
    
    // Handle delivery failures
    if (statusData.MessageStatus === 'failed' || statusData.MessageStatus === 'undelivered') {
      await handleDeliveryFailure(lead.id, statusData.MessageSid, {
        errorCode: statusData.ErrorCode,
        errorMessage: statusData.ErrorMessage
      });
    }

    return NextResponse.json({
      success: true,
      message: 'SMS status processed successfully',
      status: statusData.MessageStatus
    });

  } catch (error) {
    console.error('❌ Error processing SMS status webhook:', error);
    
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
 * GET handler for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'twilio-sms-status-webhook',
    timestamp: new Date().toISOString(),
  });
} 