// ElevenLabs Post-Call Webhook Handler
// Processes post-call transcription and updates lead records

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
// Your existing agent configuration
const AGENT_ID = 'agent_01jwc5v1nafjwv7zw4vtz1050m'; // Your existing agent

interface PostCallWebhookData {
  type: 'post_call_transcription';
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    transcript: Array<{
      role: 'agent' | 'user';
      message: string;
      timestamp?: string;
      time_in_call_secs: number;
    }>;
    metadata: {
      start_time_unix_secs: number;
      call_duration_secs: number;
      cost: number;
      customer_phone_number?: string;
      phone_number?: string;
      termination_reason: string;
    };
    analysis: {
      evaluation_criteria_results: Record<string, any>;
      data_collection_results: Record<string, any>;
      call_successful: 'success' | 'failure';
      transcript_summary: string;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, string>;
    };
  };
}

/**
 * Verify HMAC signature for webhook security
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Parse signature header: "t=timestamp,v0=hash"
    const parts = signature.split(',');
    const timestamp = parts.find(part => part.startsWith('t='))?.substring(2);
    const hash = parts.find(part => part.startsWith('v0='))?.substring(3);

    if (!timestamp || !hash) {
      console.error('Invalid signature format');
      return false;
    }

    // Check timestamp tolerance (30 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    const tolerance = 30 * 60; // 30 minutes

    if (currentTime - webhookTime > tolerance) {
      console.error('Webhook timestamp too old');
      return false;
    }

    // Verify HMAC signature
    const payloadToSign = `${timestamp}.${payload}`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(payloadToSign, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Extract lead information from conversation data
 */
function extractLeadInformation(webhookData: PostCallWebhookData) {
  const { data } = webhookData;
  const phoneNumber = data.metadata.customer_phone_number || data.metadata.phone_number;
  
  // Extract from dynamic variables if available
  const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables || {};
  
  // Extract from analysis results
  const analysisResults = data.analysis.data_collection_results;
  
  return {
    phoneNumber,
    customerName: dynamicVars.customer_name || analysisResults.customer_name,
    vehicleInterest: dynamicVars.vehicle_interest || analysisResults.vehicle_interest,
    creditScore: dynamicVars.credit_score_range || analysisResults.credit_situation,
    leadStatus: dynamicVars.lead_status,
    conversationSummary: data.analysis.transcript_summary,
    callDuration: data.metadata.call_duration_secs,
    callSuccessful: data.analysis.call_successful === 'success',
    terminationReason: data.metadata.termination_reason,
    cost: data.metadata.cost,
  };
}

/**
 * Update lead scoring based on call analysis
 */
function calculateLeadScore(webhookData: PostCallWebhookData): number {
  const { data } = webhookData;
  let score = 0;

  // Base score for completed call
  if (data.analysis.call_successful === 'success') {
    score += 20;
  }

  // Duration bonus (longer calls = higher engagement)
  const durationMinutes = data.metadata.call_duration_secs / 60;
  if (durationMinutes > 5) score += 15;
  if (durationMinutes > 10) score += 10;
  if (durationMinutes > 15) score += 5;

  // Analyze transcript for buying signals
  const transcript = data.transcript.map(t => t.message.toLowerCase()).join(' ');
  
  // Positive signals
  if (transcript.includes('interested') || transcript.includes('want')) score += 10;
  if (transcript.includes('budget') || transcript.includes('payment')) score += 15;
  if (transcript.includes('when') || transcript.includes('schedule')) score += 20;
  if (transcript.includes('approve') || transcript.includes('qualified')) score += 25;

  // Negative signals
  if (transcript.includes('not interested') || transcript.includes('no thanks')) score -= 20;
  if (transcript.includes('call back later') || transcript.includes('too expensive')) score -= 10;

  // Analysis results bonus
  const analysisResults = data.analysis.data_collection_results;
  if (analysisResults.intent === 'purchase') score += 30;
  if (analysisResults.urgency === 'high') score += 20;
  if (analysisResults.budget_confirmed === 'yes') score += 25;

  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

/**
 * Send follow-up actions based on call outcome
 */
async function triggerFollowUpActions(leadInfo: any, leadScore: number) {
  console.log(`Processing follow-up for lead score: ${leadScore}`);

  // High-intent leads (score > 70) - immediate follow-up
  if (leadScore > 70) {
    await scheduleImmediateFollowUp(leadInfo);
    await notifySalesTeam(leadInfo, 'hot');
  }
  // Medium-intent leads (score 40-70) - follow-up within 24 hours
  else if (leadScore > 40) {
    await scheduleFollowUp(leadInfo, '24h');
    await addToNurtureSequence(leadInfo, 'warm');
  }
  // Low-intent leads (score < 40) - add to drip campaign
  else {
    await addToNurtureSequence(leadInfo, 'cold');
  }
}

async function scheduleImmediateFollowUp(leadInfo: any) {
  // Implementation for immediate follow-up
  console.log('Scheduling immediate follow-up for hot lead:', leadInfo.phoneNumber);
  // This would integrate with your CRM/scheduling system
}

async function scheduleFollowUp(leadInfo: any, timing: string) {
  // Implementation for scheduled follow-up
  console.log(`Scheduling ${timing} follow-up for lead:`, leadInfo.phoneNumber);
}

async function notifySalesTeam(leadInfo: any, priority: string) {
  // Implementation for sales team notification
  console.log(`Notifying sales team - ${priority} priority lead:`, leadInfo.phoneNumber);
  // This could send Slack notifications, emails, etc.
}

async function addToNurtureSequence(leadInfo: any, temperature: string) {
  // Implementation for nurture sequence
  console.log(`Adding to ${temperature} nurture sequence:`, leadInfo.phoneNumber);
  // This would add to your email/SMS marketing automation
}

/**
 * Log call analytics for reporting
 */
async function logCallAnalytics(webhookData: PostCallWebhookData, leadScore: number) {
  const analytics = {
    timestamp: new Date(webhookData.event_timestamp * 1000),
    conversationId: webhookData.data.conversation_id,
    agentId: webhookData.data.agent_id,
    phoneNumber: webhookData.data.metadata.customer_phone_number,
    duration: webhookData.data.metadata.call_duration_secs,
    cost: webhookData.data.metadata.cost,
    successful: webhookData.data.analysis.call_successful === 'success',
    leadScore,
    terminationReason: webhookData.data.metadata.termination_reason,
    transcriptSummary: webhookData.data.analysis.transcript_summary,
  };

  console.log('Call Analytics:', analytics);
  // This would save to your analytics database
}

/**
 * Main POST handler for ElevenLabs post-call webhooks
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.ELEVENLABS_POST_CALL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('ELEVENLABS_POST_CALL_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Post-call webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('elevenlabs-signature');

    if (!signature) {
      console.error('Missing ElevenLabs signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook data
    const webhookData: PostCallWebhookData = JSON.parse(body);

    // Validate webhook type
    if (webhookData.type !== 'post_call_transcription') {
      console.log('Ignoring non-post-call webhook:', webhookData.type);
      return NextResponse.json({ status: 'ignored' });
    }

    // Validate agent ID (ensure it's our agent)
    const expectedAgentId = process.env.ELEVENLABS_AGENT_ID;
    if (expectedAgentId && webhookData.data.agent_id !== expectedAgentId) {
      console.log('Ignoring webhook for different agent:', webhookData.data.agent_id);
      return NextResponse.json({ status: 'ignored' });
    }

    console.log('Processing post-call webhook for conversation:', webhookData.data.conversation_id);

    // Process the call data - update conversation history and lead status
    console.log('Processing call data for agent:', AGENT_ID);

    // Extract lead information
    const leadInfo = extractLeadInformation(webhookData);
    console.log('Extracted lead info:', leadInfo);

    // Calculate lead score
    const leadScore = calculateLeadScore(webhookData);
    console.log('Calculated lead score:', leadScore);

    // Trigger follow-up actions
    await triggerFollowUpActions(leadInfo, leadScore);

    // Log analytics
    await logCallAnalytics(webhookData, leadScore);

    // Return success response
    return NextResponse.json({
      status: 'processed',
      conversationId: webhookData.data.conversation_id,
      leadScore,
      phoneNumber: leadInfo.phoneNumber,
    });

  } catch (error) {
    console.error('Error processing post-call webhook:', error);
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
 * GET handler for webhook verification/health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'elevenlabs-post-call-webhook',
    timestamp: new Date().toISOString(),
  });
} 