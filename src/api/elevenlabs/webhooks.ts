
// ElevenLabs Server Tools - CRM Integration Webhooks
// These endpoints are called by ElevenLabs when the AI agent uses server tools

import { SubprimeLead } from '@/data/subprime/subprimeLeads';

interface WebhookRequest {
  body: any;
  headers: Record<string, string>;
  method: string;
}

interface WebhookResponse {
  status: number;
  body: any;
}

interface UpdateLeadStatusRequest {
  leadId: string;
  status: 'qualified' | 'not_qualified' | 'needs_follow_up' | 'ready_for_funding' | 'approved' | 'declined';
  notes?: string;
  agentId?: string;
  conversationId?: string;
}

interface ScheduleFollowUpRequest {
  leadId: string;
  scheduledTime: string; // ISO 8601 format
  method: 'call' | 'sms' | 'email';
  notes?: string;
  agentId?: string;
  conversationId?: string;
}

interface TransferToHumanRequest {
  leadId: string;
  reason: 'frustrated_customer' | 'complex_case' | 'technical_issue' | 'customer_request';
  urgency: 'low' | 'medium' | 'high';
  currentMode: 'voice' | 'text';
  conversationId?: string;
  currentContext?: string;
}

/**
 * Handle lead status updates from ElevenLabs AI agent
 * Called when agent determines lead qualification status has changed
 */
async function handleUpdateLeadStatus(request: WebhookRequest): Promise<WebhookResponse> {
  try {
    const { leadId, status, notes, agentId, conversationId }: UpdateLeadStatusRequest = request.body;

    // Validate required fields
    if (!leadId || !status) {
      return {
        status: 400,
        body: { error: 'leadId and status are required' }
      };
    }

    // Map AI agent status to CRM status
    const statusMapping = {
      'qualified': 'Partial',
      'not_qualified': 'Not Ready',
      'needs_follow_up': 'Partial',
      'ready_for_funding': 'Ready',
      'approved': 'Ready',
      'declined': 'Not Ready'
    } as const;

    const crmStatus = statusMapping[status] || 'Partial';

    const scriptStepMapping = {
      'qualified': 'qualification' as const,
      'not_qualified': 'qualification' as const,
      'needs_follow_up': 'screening' as const,
      'ready_for_funding': 'submitted' as const,
      'approved': 'submitted' as const,
      'declined': 'qualification' as const
    };
    const crmScriptStep = scriptStepMapping[status];

    // Prepare lead updates
    const leadUpdates: Partial<SubprimeLead> = {
      fundingReadiness: crmStatus,
      scriptProgress: {
        currentStep: crmScriptStep,
        completedSteps: [], // Would be updated based on conversation flow
      }
    };

    // Add conversation entry if notes provided
    if (notes) {
      const existingConversations = await getLeadConversations(leadId);
      leadUpdates.conversations = [...existingConversations, {
        type: 'message',
        content: notes,
        timestamp: new Date().toISOString(),
        sentBy: 'agent'
      }];
    }

    // Update lead in database/CRM
    const updatedLead = await updateLeadInCRM(leadId, leadUpdates);

    // Log the update for analytics
    await logAgentAction({
      type: 'status_update',
      leadId,
      agentId,
      conversationId,
      action: `Updated lead status to: ${status}`,
      metadata: { previousStatus: updatedLead.previousStatus, newStatus: crmStatus }
    });

    // Trigger any automated workflows based on new status
    await triggerStatusWorkflow(leadId, status);

    return {
      status: 200,
      body: { 
        success: true, 
        message: `Lead ${leadId} status updated to ${status}`,
        leadId,
        newStatus: crmStatus
      }
    };

  } catch (error) {
    console.error('Error updating lead status:', error);
    return {
      status: 500,
      body: { error: 'Failed to update lead status' }
    };
  }
}

/**
 * Handle follow-up scheduling from ElevenLabs AI agent
 * Called when agent needs to schedule future contact with lead
 */
async function handleScheduleFollowUp(request: WebhookRequest): Promise<WebhookResponse> {
  try {
    const { leadId, scheduledTime, method, notes, agentId, conversationId }: ScheduleFollowUpRequest = request.body;

    // Validate required fields
    if (!leadId || !scheduledTime || !method) {
      return {
        status: 400,
        body: { error: 'leadId, scheduledTime, and method are required' }
      };
    }

    // Validate scheduled time
    const scheduleDate = new Date(scheduledTime);
    if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
      return {
        status: 400,
        body: { error: 'scheduledTime must be a valid future date' }
      };
    }

    // Create follow-up task in CRM
    const followUpTask = {
      id: crypto.randomUUID(),
      leadId,
      type: 'follow_up',
      method,
      scheduledTime: scheduleDate.toISOString(),
      status: 'pending',
      priority: 'normal',
      assignedTo: agentId || 'ai_agent',
      notes: notes || `Follow-up scheduled via AI conversation`,
      conversationId,
      createdAt: new Date().toISOString(),
      createdBy: `AI Agent (${agentId})`
    };

    await createFollowUpTask(followUpTask);

    // Update lead's next action
    await updateLeadInCRM(leadId, {
      nextAction: {
        type: `${method.toUpperCase()} follow-up`,
        dueDate: scheduleDate.toISOString(),
        isAutomated: method !== 'call', // Voice calls require human intervention
        isOverdue: false
      }
    });

    // Schedule the actual follow-up based on method
    if (method === 'sms') {
      await scheduleAutomatedSMS(leadId, scheduleDate, conversationId);
    } else if (method === 'call') {
      await scheduleAgentCall(leadId, scheduleDate, agentId);
    } else if (method === 'email') {
      await scheduleAutomatedEmail(leadId, scheduleDate, conversationId);
    }

    // Log the scheduling action
    await logAgentAction({
      type: 'follow_up_scheduled',
      leadId,
      agentId,
      conversationId,
      action: `Scheduled ${method} follow-up for ${scheduleDate.toLocaleDateString()}`,
      metadata: { method, scheduledTime, taskId: followUpTask.id }
    });

    return {
      status: 200,
      body: { 
        success: true, 
        message: `Follow-up scheduled for ${scheduleDate.toLocaleDateString()}`,
        taskId: followUpTask.id,
        leadId,
        method,
        scheduledTime: scheduleDate.toISOString()
      }
    };

  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    return {
      status: 500,
      body: { error: 'Failed to schedule follow-up' }
    };
  }
}

/**
 * Handle human agent transfer requests from ElevenLabs AI
 * Called when AI determines human intervention is needed
 */
async function handleTransferToHuman(request: WebhookRequest): Promise<WebhookResponse> {
  try {
    const { leadId, reason, urgency, currentMode, conversationId, currentContext }: TransferToHumanRequest = request.body;

    // Validate required fields
    if (!leadId || !reason || !urgency) {
      return {
        status: 400,
        body: { error: 'leadId, reason, and urgency are required' }
      };
    }

    // Get available human agents
    const availableAgents = await getAvailableHumanAgents(urgency);
    
    if (availableAgents.length === 0) {
      // No agents available - queue the transfer
      await queueHumanTransfer({
        leadId,
        reason,
        urgency,
        currentMode,
        conversationId,
        currentContext,
        queuedAt: new Date().toISOString()
      });

      return {
        status: 202,
        body: { 
          success: true, 
          message: 'Transfer queued - no agents currently available',
          leadId,
          queuePosition: await getQueuePosition(leadId)
        }
      };
    }

    // Assign to the best available agent based on specialization and workload
    const assignedAgent = await selectBestAgent(availableAgents, leadId, reason);

    // Create transfer record
    const transferRecord = {
      id: crypto.randomUUID(),
      leadId,
      fromAgentType: 'ai',
      toAgentId: assignedAgent.id,
      reason,
      urgency,
      currentMode,
      conversationId,
      currentContext,
      transferredAt: new Date().toISOString(),
      status: 'pending_acceptance'
    };

    await createTransferRecord(transferRecord);

    // Notify the human agent
    await notifyHumanAgent(assignedAgent.id, {
      type: 'transfer_request',
      leadId,
      leadName: await getLeadName(leadId),
      reason,
      urgency,
      currentMode,
      conversationId,
      transferId: transferRecord.id,
      estimatedWaitTime: calculateEstimatedWaitTime(urgency)
    });

    // Prepare lead updates
    const leadUpdates: Partial<SubprimeLead> = {
      assignedSpecialist: assignedAgent.name as "Andrea" | "Ian" | "Kayam",
      chaseStatus: 'Manual Review'
    };

    // Add conversation entry for transfer
    const existingConversations = await getLeadConversations(leadId);
    leadUpdates.conversations = [...existingConversations, {
      type: 'message',
      content: `Transferred to human agent: ${reason}`,
      timestamp: new Date().toISOString(),
      sentBy: 'system'
    }];

    // Update lead status to indicate human takeover
    await updateLeadInCRM(leadId, leadUpdates);

    // Log the transfer
    await logAgentAction({
      type: 'human_transfer',
      leadId,
      agentId: 'ai_agent',
      conversationId,
      action: `Transferred to human agent: ${assignedAgent.name}`,
      metadata: { reason, urgency, transferId: transferRecord.id }
    });

    // Pause the AI agent for this conversation
    await pauseAIAgent(conversationId);

    return {
      status: 200,
      body: { 
        success: true, 
        message: `Transferred to human agent: ${assignedAgent.name}`,
        transferId: transferRecord.id,
        assignedAgent: {
          id: assignedAgent.id,
          name: assignedAgent.name,
          specialization: assignedAgent.specialization
        },
        estimatedWaitTime: calculateEstimatedWaitTime(urgency)
      }
    };

  } catch (error) {
    console.error('Error transferring to human:', error);
    return {
      status: 500,
      body: { error: 'Failed to transfer to human agent' }
    };
  }
}

// Helper functions (would be implemented based on your CRM/database structure)

async function updateLeadInCRM(leadId: string, updates: Partial<SubprimeLead>): Promise<any> {
  // Implementation would depend on your CRM system
  // This is a placeholder for the actual CRM update logic
  console.log(`Updating lead ${leadId}:`, updates);
  return { leadId, ...updates, previousStatus: 'Partial' }; // Mock response
}

async function getLeadConversations(leadId: string): Promise<any[]> {
  // Fetch existing conversations for the lead
  return []; // Mock response
}

async function logAgentAction(action: any): Promise<void> {
  // Log agent actions for analytics and audit trail
  console.log('Agent action logged:', action);
}

async function triggerStatusWorkflow(leadId: string, status: string): Promise<void> {
  // Trigger automated workflows based on status changes
  if (status === 'ready_for_funding') {
    // Auto-generate funding application
    // Notify funding team
    // Schedule documentation collection
  }
}

function getNextStepForStatus(status: string): string {
  const nextStepMapping = {
    'qualified': 'documentation_collection',
    'not_qualified': 'credit_improvement_consultation',
    'needs_follow_up': 'scheduled_callback',
    'ready_for_funding': 'funding_application',
    'approved': 'vehicle_selection',
    'declined': 'alternative_options'
  };
  return nextStepMapping[status] || 'follow_up';
}

async function createFollowUpTask(task: any): Promise<void> {
  // Create task in task management system
  console.log('Follow-up task created:', task);
}

async function scheduleAutomatedSMS(leadId: string, scheduleDate: Date, conversationId?: string): Promise<void> {
  // Schedule SMS via Twilio or similar service
  console.log(`Scheduling SMS for lead ${leadId} at ${scheduleDate}`);
}

async function scheduleAgentCall(leadId: string, scheduleDate: Date, agentId?: string): Promise<void> {
  // Schedule call in agent's calendar
  console.log(`Scheduling call for lead ${leadId} with agent ${agentId} at ${scheduleDate}`);
}

async function scheduleAutomatedEmail(leadId: string, scheduleDate: Date, conversationId?: string): Promise<void> {
  // Schedule email via email service
  console.log(`Scheduling email for lead ${leadId} at ${scheduleDate}`);
}

async function getAvailableHumanAgents(urgency: string): Promise<any[]> {
  // Query available human agents based on urgency and specialization
  return [
    { id: 'agent_1', name: 'Andrea', specialization: 'subprime', available: true },
    { id: 'agent_2', name: 'Ian', specialization: 'credit_repair', available: true },
    { id: 'agent_3', name: 'Kayam', specialization: 'complex_cases', available: true }
  ];
}

async function selectBestAgent(agents: any[], leadId: string, reason: string): Promise<any> {
  // Select best agent based on specialization, workload, and lead characteristics
  const reasonToSpecialization = {
    'frustrated_customer': 'customer_service',
    'complex_case': 'complex_cases', 
    'technical_issue': 'technical_support',
    'customer_request': 'general'
  };

  const preferredSpecialization = reasonToSpecialization[reason] || 'general';
  return agents.find(agent => agent.specialization === preferredSpecialization) || agents[0];
}

async function queueHumanTransfer(transferRequest: any): Promise<void> {
  // Add to human transfer queue
  console.log('Transfer queued:', transferRequest);
}

async function getQueuePosition(leadId: string): Promise<number> {
  // Get position in transfer queue
  return 1; // Mock response
}

async function createTransferRecord(record: any): Promise<void> {
  // Create transfer audit record
  console.log('Transfer record created:', record);
}

async function notifyHumanAgent(agentId: string, notification: any): Promise<void> {
  // Send notification to human agent (email, Slack, etc.)
  console.log(`Notifying agent ${agentId}:`, notification);
}

async function getLeadName(leadId: string): Promise<string> {
  // Get lead name for notifications
  return 'John Doe'; // Mock response
}

function calculateEstimatedWaitTime(urgency: string): string {
  const waitTimes = {
    'high': '< 5 minutes',
    'medium': '10-15 minutes', 
    'low': '30-60 minutes'
  };
  return waitTimes[urgency] || '15-30 minutes';
}

async function pauseAIAgent(conversationId: string): Promise<void> {
  // Pause AI agent for the conversation
  console.log(`AI agent paused for conversation ${conversationId}`);
}

export {
  handleUpdateLeadStatus,
  handleScheduleFollowUp,
  handleTransferToHuman
};
