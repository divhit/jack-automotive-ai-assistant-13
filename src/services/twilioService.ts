
import ElevenLabsAPIService from './api/elevenLabsApi';
import { LeadContextData } from '@/types/elevenlabs';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';

interface TwilioCallRequest {
  to: string;
  leadData: LeadContextData;
  agentId?: string;
}

interface TwilioCallResponse {
  callSid: string;
  status: string;
  conversationId?: string;
}

class TwilioService {
  private elevenLabsService: ElevenLabsAPIService;
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor() {
    this.elevenLabsService = new ElevenLabsAPIService();
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || '';
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '';
    this.phoneNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER || '';
  }

  /**
   * Initiate an outbound call to a lead using ElevenLabs AI agent
   */
  async initiateOutboundCall(request: TwilioCallRequest): Promise<TwilioCallResponse> {
    try {
      console.log('🔄 Initiating outbound call to:', request.to);
      
      // First, update ElevenLabs agent with lead context
      await this.elevenLabsService.updateAgentForLead(request.leadData, {
        firstMessage: this.generatePersonalizedGreeting(request.leadData),
        systemPrompt: this.generateLeadSpecificPrompt(request.leadData)
      });

      // Initiate the outbound call via ElevenLabs + Twilio
      const callResponse = await this.elevenLabsService.initiateOutboundCall({
        phoneNumber: request.to,
        leadId: request.leadData.leadId,
        agentOverrides: {
          context: this.prepareCallContext(request.leadData)
        }
      });

      console.log('✅ Outbound call initiated successfully:', callResponse);

      return {
        callSid: callResponse.call_sid || callResponse.id,
        status: 'initiated',
        conversationId: callResponse.conversation_id
      };

    } catch (error) {
      console.error('❌ Failed to initiate outbound call:', error);
      throw new Error(`Failed to initiate call: ${(error as Error).message}`);
    }
  }

  /**
   * Get call status from Twilio
   */
  async getCallStatus(callSid: string): Promise<any> {
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls/${callSid}.json`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get call status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get call status:', error);
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    try {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls/${callSid}.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'Status=completed'
      });
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  /**
   * Convert SubprimeLead to LeadContextData format
   */
  convertLeadToContext(lead: SubprimeLead): LeadContextData {
    return {
      leadId: lead.id,
      customerName: lead.customerName,
      phoneNumber: lead.phoneNumber,
      fundingReadiness: lead.fundingReadiness,
      creditScore: lead.creditProfile?.scoreRange || 'Unknown',
      scriptProgress: {
        currentStep: lead.scriptProgress.currentStep,
        completedSteps: lead.scriptProgress.completedSteps,
        nextStep: this.determineNextStep(lead.scriptProgress.currentStep)
      },
      chaseStatus: lead.chaseStatus,
      sentiment: lead.sentiment,
      preferredContactMethod: 'phone', // Default value since it doesn't exist on SubprimeLead
      conversationHistory: (lead.conversations || []).map(conv => ({
        speaker: conv.sentBy === 'agent' ? 'agent' : 'user',
        content: conv.content,
        timestamp: conv.timestamp
      })),
      specialist: lead.assignedSpecialist
    };
  }

  private determineNextStep(currentStep: string): string {
    const stepMap: Record<string, string> = {
      'contacted': 'screening',
      'screening': 'qualification',
      'qualification': 'routing',
      'routing': 'submitted',
      'submitted': 'completed'
    };
    return stepMap[currentStep] || 'contacted';
  }

  private generatePersonalizedGreeting(leadData: LeadContextData): string {
    const firstName = leadData.customerName.split(' ')[0];
    const timeOfDay = this.getTimeOfDay();
    
    return `Good ${timeOfDay} ${firstName}, this is Sarah calling from Jack Automotive. I hope I'm catching you at a good time. I wanted to follow up on your vehicle financing inquiry and see how I can help you move forward with getting approved. Do you have a few minutes to chat?`;
  }

  private generateLeadSpecificPrompt(leadData: LeadContextData): string {
    let contextPrompt = '';
    
    if (leadData.fundingReadiness === 'Partial') {
      contextPrompt += 'This customer is partially qualified and needs additional documentation or information. ';
    } else if (leadData.fundingReadiness === 'Ready') {
      contextPrompt += 'This customer is ready for funding and should be prioritized for immediate processing. ';
    } else if (leadData.fundingReadiness === 'Not Ready') {
      contextPrompt += 'This customer has credit challenges that need to be addressed before approval. ';
    }

    if (leadData.sentiment === 'Frustrated') {
      contextPrompt += 'The customer has shown frustration in previous interactions - be extra empathetic and patient. ';
    } else if (leadData.sentiment === 'Ghosted') {
      contextPrompt += 'The customer has been unresponsive - re-engage gently and offer value. ';
    }

    return contextPrompt;
  }

  private prepareCallContext(leadData: LeadContextData): any {
    return {
      lead_profile: {
        id: leadData.leadId,
        name: leadData.customerName,
        phone: leadData.phoneNumber,
        funding_status: leadData.fundingReadiness,
        credit_score: leadData.creditScore,
        current_step: leadData.scriptProgress.currentStep,
        sentiment: leadData.sentiment,
        assigned_specialist: leadData.specialist
      },
      conversation_history: leadData.conversationHistory.slice(-5), // Last 5 messages
      call_objective: this.determineCallObjective(leadData),
      compliance_requirements: {
        tcpa_consent_required: true,
        fdcpa_compliant: true,
        record_call: true
      }
    };
  }

  private determineCallObjective(leadData: LeadContextData): string {
    if (leadData.fundingReadiness === 'Ready') {
      return 'close_financing';
    } else if (leadData.fundingReadiness === 'Partial') {
      return 'collect_documentation';
    } else if (leadData.sentiment === 'Ghosted') {
      return 're_engage_customer';
    } else {
      return 'qualify_and_educate';
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}

export default TwilioService;
