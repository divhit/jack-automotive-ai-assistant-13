import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface RecordingWebhookData {
  RecordingSid: string;
  RecordingUrl: string;
  RecordingStatus: 'in-progress' | 'paused' | 'stopped' | 'processing' | 'completed' | 'absent' | 'deleted';
  RecordingDuration: string;
  RecordingStartTime: string;
  CallSid: string;
  AccountSid: string;
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
 * Find lead by call SID
 */
async function findLeadByCallSid(callSid: string) {
  console.log('🔍 Finding lead by call SID:', callSid);
  
  // This would query your database to find the lead associated with this call
  // For now, returning a mock lead
  return {
    id: `lead_${callSid.slice(-8)}`,
    phoneNumber: '+1234567890',
    name: 'Sample Lead',
    callSid
  };
}

/**
 * Download and store recording in Supabase Storage
 */
async function downloadAndStoreRecording(recordingData: RecordingWebhookData): Promise<string | null> {
  try {
    console.log('📥 Downloading recording:', recordingData.RecordingSid);
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'call-recordings';
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    // Download recording from Twilio
    const recordingResponse = await fetch(recordingData.RecordingUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
      }
    });
    
    if (!recordingResponse.ok) {
      throw new Error(`Failed to download recording: ${recordingResponse.statusText}`);
    }
    
    const recordingBuffer = await recordingResponse.arrayBuffer();
    console.log('📥 Recording downloaded:', recordingBuffer.byteLength, 'bytes');
    
    // Upload to Supabase Storage
    const fileName = `${recordingData.CallSid}/${recordingData.RecordingSid}.wav`;
    
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/${storageBucket}/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'audio/wav',
        'x-upsert': 'true'
      },
      body: recordingBuffer
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload to Supabase Storage: ${errorText}`);
    }
    
    // Generate signed URL for secure access
    const signedUrlResponse = await fetch(`${supabaseUrl}/storage/v1/object/sign/${storageBucket}/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expiresIn: 31536000 // 1 year expiry
      })
    });
    
    if (!signedUrlResponse.ok) {
      throw new Error('Failed to generate signed URL');
    }
    
    const signedUrlData = await signedUrlResponse.json();
    const storedUrl = `${supabaseUrl}${signedUrlData.signedURL}`;
    
    console.log('💾 Recording stored in Supabase Storage successfully');
    return storedUrl;
    
  } catch (error) {
    console.error('❌ Failed to download and store recording:', error);
    return null;
  }
}

/**
 * Process recording with AI transcription/analysis
 */
async function processRecordingWithAI(recordingData: RecordingWebhookData) {
  try {
    console.log('🤖 Processing recording with AI:', recordingData.RecordingSid);
    
    // Mock AI analysis - replace with actual AI service integration
    const analysisResult = {
      transcription: "Mock transcription of the call...",
      sentiment: "positive",
      callQuality: 85,
      keyPhrases: ["interested", "budget", "financing"],
      actionItems: ["Send vehicle information", "Schedule test drive"],
      callSummary: "Customer expressed interest in financing options for a mid-size SUV.",
      nextSteps: ["Follow up with financing options", "Schedule dealership visit"]
    };
    
    console.log('✅ AI analysis completed');
    return analysisResult;
    
  } catch (error) {
    console.error('❌ Failed to process recording with AI:', error);
    return null;
  }
}

/**
 * Update lead record with recording information
 */
async function updateLeadWithRecording(leadId: string, recordingData: RecordingWebhookData, storedUrl: string, analysis: any) {
  try {
    console.log('📝 Updating lead with recording information:', leadId);
    
    const recordingInfo = {
      recordingSid: recordingData.RecordingSid,
      recordingUrl: storedUrl,
      duration: parseInt(recordingData.RecordingDuration),
      startTime: recordingData.RecordingStartTime,
      status: recordingData.RecordingStatus,
      callSid: recordingData.CallSid,
      analysis: analysis,
      processedAt: new Date().toISOString()
    };
    
    // In real implementation:
    // await updateLeadRecord(leadId, { recording: recordingInfo });
    
    console.log('✅ Lead updated with recording information');
    return recordingInfo;
    
  } catch (error) {
    console.error('❌ Failed to update lead with recording:', error);
    return null;
  }
}

/**
 * Broadcast recording availability to UI
 */
async function broadcastRecordingUpdate(leadId: string, recordingInfo: any) {
  try {
    // Get the SSE connection for this lead
    const streams = global.conversationStreams as Map<string, any> | undefined;
    const connection = streams?.get(leadId);
    
    if (connection) {
      connection.sendEvent({
        type: 'recording_processed',
        recording: recordingInfo,
        timestamp: new Date().toISOString()
      });
      console.log('📡 Broadcasted recording update:', leadId);
    } else {
      console.log('⚠️ No active stream for lead:', leadId);
    }
  } catch (error) {
    console.error('❌ Failed to broadcast recording update:', error);
  }
}

/**
 * Trigger follow-up actions based on recording analysis
 */
async function triggerRecordingBasedFollowUp(leadId: string, analysis: any) {
  if (!analysis) return;
  
  console.log('🎯 Triggering follow-up actions based on recording analysis');
  
  // High-intent signals
  if (analysis.keyPhrases.includes('interested') || analysis.keyPhrases.includes('budget')) {
    console.log('🔥 High-intent signals detected - prioritizing lead');
  }
  
  // Negative sentiment handling
  if (analysis.sentiment === 'negative') {
    console.log('😔 Negative sentiment detected - scheduling manager follow-up');
  }
  
  // Call quality issues
  if (analysis.callQuality < 70) {
    console.log('📞 Poor call quality detected - may need callback');
  }
}

/**
 * Main POST handler for Twilio recording webhooks
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

    // Extract recording data
    const recordingData: RecordingWebhookData = {
      RecordingSid: params.RecordingSid,
      RecordingUrl: params.RecordingUrl,
      RecordingStatus: params.RecordingStatus as any,
      RecordingDuration: params.RecordingDuration,
      RecordingStartTime: params.RecordingStartTime,
      CallSid: params.CallSid,
      AccountSid: params.AccountSid,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage
    };

    console.log('🎵 Recording Webhook:', {
      recordingSid: recordingData.RecordingSid,
      status: recordingData.RecordingStatus,
      duration: recordingData.RecordingDuration,
      callSid: recordingData.CallSid
    });

    // Only process completed recordings
    if (recordingData.RecordingStatus !== 'completed') {
      console.log('⏳ Recording not yet completed, skipping processing');
      return NextResponse.json({
        success: true,
        message: 'Recording status noted, waiting for completion'
      });
    }

    // Find associated lead
    const lead = await findLeadByCallSid(recordingData.CallSid);
    
    // Download and store recording
    const storedUrl = await downloadAndStoreRecording(recordingData);
    
    if (!storedUrl) {
      throw new Error('Failed to download and store recording');
    }
    
    // Process with AI
    const analysis = await processRecordingWithAI(recordingData);
    
    // Update lead record
    const recordingInfo = await updateLeadWithRecording(lead.id, recordingData, storedUrl, analysis);
    
    // Broadcast to UI
    await broadcastRecordingUpdate(lead.id, recordingInfo);
    
    // Trigger follow-up actions
    await triggerRecordingBasedFollowUp(lead.id, analysis);

    return NextResponse.json({
      success: true,
      message: 'Recording processed successfully',
      recordingSid: recordingData.RecordingSid,
      analysis: analysis ? 'completed' : 'failed'
    });

  } catch (error) {
    console.error('❌ Error processing recording webhook:', error);
    
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
    service: 'twilio-recording-webhook',
    timestamp: new Date().toISOString(),
  });
} 