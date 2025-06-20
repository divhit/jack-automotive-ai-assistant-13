import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface VoiceStatusWebhookData {
  CallSid: string;
  CallStatus: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  To: string;
  From: string;
  Direction: 'inbound' | 'outbound-api' | 'outbound-dial';
  Duration?: string;
  StartTime?: string;
  EndTime?: string;
  Price?: string;
  PriceUnit?: string;
  AccountSid: string;
  ApiVersion: string;
  CallDuration?: string;
  RecordingUrl?: string;
  RecordingSid?: string;
  AnsweredBy?: string;
  MachineDetectionDuration?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
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
  console.log('🔍 Finding lead by phone number:', phoneNumber);
  
  // This would integrate with your lead database
  // For now, returning a mock lead
  return {
    id: `lead_${phoneNumber.replace(/\D/g, '')}`,
    phoneNumber,
    name: 'Sample Lead'
  };
}

/**
 * Update lead record with call status
 */
async function updateLeadCallStatus(leadId: string, callData: VoiceStatusWebhookData) {
  try {
    console.log('📝 Updating lead call status:', leadId, callData.CallStatus);
    
    // This would update your database with call information
    const updateData = {
      lastCallSid: callData.CallSid,
      lastCallStatus: callData.CallStatus,
      lastCallDuration: callData.Duration ? parseInt(callData.Duration) : 0,
      lastCallTime: new Date().toISOString(),
      callPrice: callData.Price,
      callDirection: callData.Direction,
      ...(callData.EndTime && { lastCallEndTime: callData.EndTime }),
      ...(callData.StartTime && { lastCallStartTime: callData.StartTime }),
      ...(callData.AnsweredBy && { callAnsweredBy: callData.AnsweredBy }),
      ...(callData.ErrorCode && { 
        lastCallError: {
          code: callData.ErrorCode,
          message: callData.ErrorMessage
        }
      })
    };
    
    // In real implementation:
    // await updateLeadRecord(leadId, updateData);
    
    console.log('✅ Lead call status updated successfully');
    
  } catch (error) {
    console.error('❌ Failed to update lead call status:', error);
  }
}

/**
 * Broadcast real-time call status update
 */
async function broadcastCallStatusUpdate(leadId: string, statusUpdate: any) {
  try {
    // Get the SSE connection for this lead
    const streams = global.conversationStreams as Map<string, any> | undefined;
    const connection = streams?.get(leadId);
    
    if (connection) {
      connection.sendEvent({
        type: 'call_status_update',
        update: statusUpdate,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Broadcasted call status update:', leadId, statusUpdate.status);
    } else {
      console.log('⚠️ No active stream for lead:', leadId);
    }
  } catch (error) {
    console.error('❌ Failed to broadcast call status update:', error);
  }
}

/**
 * Handle call completion analytics
 */
async function processCallCompletion(leadId: string, callData: VoiceStatusWebhookData) {
  console.log('📊 Processing call completion analytics');
  
  const duration = callData.Duration ? parseInt(callData.Duration) : 0;
  const wasAnswered = callData.CallStatus === 'completed';
  const cost = callData.Price ? parseFloat(callData.Price) : 0;
  
  // Calculate call metrics
  const callMetrics = {
    duration,
    wasAnswered,
    cost,
    answeredBy: callData.AnsweredBy,
    completionReason: callData.CallStatus,
    direction: callData.Direction
  };
  
  console.log('📈 Call Metrics:', callMetrics);
  
  // Determine follow-up actions based on call outcome
  if (wasAnswered && duration > 30) {
    console.log('✅ Successful call - duration > 30 seconds');
    await triggerSuccessfulCallFollowUp(leadId, callMetrics);
  } else if (callData.CallStatus === 'no-answer') {
    console.log('📞 No answer - scheduling retry');
    await scheduleCallRetry(leadId, callData.CallSid);
  } else if (callData.CallStatus === 'busy') {
    console.log('📞 Busy - scheduling callback');
    await scheduleCallbackAttempt(leadId, callData.CallSid);
  } else if (callData.CallStatus === 'failed') {
    console.log('❌ Call failed - investigating');
    await handleCallFailure(leadId, callData);
  }
  
  // Log analytics
  await logCallAnalytics(leadId, callMetrics);
}

async function triggerSuccessfulCallFollowUp(leadId: string, metrics: any) {
  console.log('🎯 Triggering successful call follow-up for lead:', leadId);
  // This would integrate with your CRM to schedule follow-up actions
}

async function scheduleCallRetry(leadId: string, callSid: string) {
  console.log('🔄 Scheduling call retry for lead:', leadId);
  // This would schedule a retry attempt
}

async function scheduleCallbackAttempt(leadId: string, callSid: string) {
  console.log('📞 Scheduling callback attempt for lead:', leadId);
  // This would schedule a callback at a better time
}

async function handleCallFailure(leadId: string, callData: VoiceStatusWebhookData) {
  console.log('❌ Handling call failure for lead:', leadId);
  console.log('Error:', callData.ErrorCode, callData.ErrorMessage);
  
  // Determine if failure is retryable
  const retryableErrors = ['30001', '30002', '30003', '30004', '30005'];
  const shouldRetry = callData.ErrorCode && retryableErrors.includes(callData.ErrorCode);
  
  if (shouldRetry) {
    await scheduleCallRetry(leadId, callData.CallSid);
  } else {
    // Consider alternative communication methods
    console.log('⚠️ Call failure not retryable, considering SMS follow-up');
  }
}

async function logCallAnalytics(leadId: string, metrics: any) {
  console.log('📊 Logging call analytics:', leadId, metrics);
  // This would log to your analytics system
}

/**
 * Handle recording availability
 */
async function processCallRecording(leadId: string, callData: VoiceStatusWebhookData) {
  if (callData.RecordingUrl && callData.RecordingSid) {
    console.log('🎵 Call recording available:', callData.RecordingSid);
    
    // Store recording information
    const recordingData = {
      recordingSid: callData.RecordingSid,
      recordingUrl: callData.RecordingUrl,
      callSid: callData.CallSid,
      leadId,
      timestamp: new Date().toISOString()
    };
    
    // In real implementation:
    // await storeCallRecording(recordingData);
    
    // Broadcast recording availability
    await broadcastCallStatusUpdate(leadId, {
      type: 'recording_available',
      recording: recordingData
    });
    
    console.log('✅ Call recording processed and stored');
  }
}

/**
 * Main POST handler for Twilio voice status webhooks
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

    // Extract voice status data
    const statusData: VoiceStatusWebhookData = {
      CallSid: params.CallSid,
      CallStatus: params.CallStatus as any,
      To: params.To,
      From: params.From,
      Direction: params.Direction as any,
      Duration: params.Duration,
      StartTime: params.StartTime,
      EndTime: params.EndTime,
      Price: params.Price,
      PriceUnit: params.PriceUnit,
      AccountSid: params.AccountSid,
      ApiVersion: params.ApiVersion,
      CallDuration: params.CallDuration,
      RecordingUrl: params.RecordingUrl,
      RecordingSid: params.RecordingSid,
      AnsweredBy: params.AnsweredBy,
      MachineDetectionDuration: params.MachineDetectionDuration,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage
    };

    console.log('📞 Voice Call Status Update:', {
      callSid: statusData.CallSid,
      status: statusData.CallStatus,
      to: statusData.To,
      duration: statusData.Duration,
      direction: statusData.Direction
    });

    // Find lead by phone number (use To for outbound, From for inbound)
    const phoneNumber = statusData.Direction === 'outbound-api' ? statusData.To : statusData.From;
    const lead = await findLeadByPhoneNumber(phoneNumber);
    
    // Update lead record with call status
    await updateLeadCallStatus(lead.id, statusData);
    
    // Broadcast real-time update to UI
    await broadcastCallStatusUpdate(lead.id, {
      callSid: statusData.CallSid,
      status: statusData.CallStatus,
      duration: statusData.Duration,
      direction: statusData.Direction,
      timestamp: new Date().toISOString(),
      error: statusData.ErrorCode ? {
        code: statusData.ErrorCode,
        message: statusData.ErrorMessage
      } : undefined
    });
    
    // Handle call completion
    if (['completed', 'failed', 'no-answer', 'busy', 'canceled'].includes(statusData.CallStatus)) {
      await processCallCompletion(lead.id, statusData);
    }
    
    // Handle recording if available
    if (statusData.RecordingUrl) {
      await processCallRecording(lead.id, statusData);
    }

    return NextResponse.json({
      success: true,
      message: 'Voice call status processed successfully',
      status: statusData.CallStatus
    });

  } catch (error) {
    console.error('❌ Error processing voice status webhook:', error);
    
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
    service: 'twilio-voice-status-webhook',
    timestamp: new Date().toISOString(),
  });
} 