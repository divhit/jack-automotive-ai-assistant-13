import axios from 'axios';
import { 
  SignedUrlResponse, 
  OutboundCallRequest, 
  CallStatusUpdate,
  LeadContextData,
  AgentOverrides 
} from '@/types/elevenlabs';

// Configuration
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const AGENT_ID = 'agent_01jwc5v1nafjwv7zw4vtz1050m'; // From your agents.md

class ElevenLabsAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VITE_ELEVENLABS_API_KEY || '';
    this.baseUrl = ELEVENLABS_API_BASE;
  }

  /**
   * Generate signed URL for authenticated agent connection
   */
  async generateSignedUrl(leadId: string): Promise<SignedUrlResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/conversation/get-signed-url`,
        {
          params: { agent_id: AGENT_ID },
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        signed_url: response.data.signed_url,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      };
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      throw new Error('Failed to authenticate with ElevenLabs');
    }
  }

  /**
   * Initiate outbound call via ElevenLabs + Twilio integration
   */
  async initiateOutboundCall(request: OutboundCallRequest): Promise<any> {
    try {
      // First, get the phone number configuration
      const phoneNumberResponse = await this.getAgentPhoneNumbers();
      const phoneNumberId = phoneNumberResponse.phone_numbers[0]?.id;

      if (!phoneNumberId) {
        throw new Error('No phone number configured for agent');
      }

      // Prepare conversation initiation data with lead context
      const conversationData = this.prepareConversationInitiationData(request);

      // Initiate outbound call
      const response = await axios.post(
        `${this.baseUrl}/convai/twilio/outbound-call`,
        {
          agent_id: AGENT_ID,
          agent_phone_number_id: phoneNumberId,
          to_number: request.phoneNumber,
          conversation_initiation_client_data: conversationData
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to initiate outbound call:', error);
      throw error;
    }
  }

  /**
   * Get agent phone numbers for Twilio integration
   */
  async getAgentPhoneNumbers(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/agents/${AGENT_ID}/phone-numbers`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get agent phone numbers:', error);
      throw error;
    }
  }

  /**
   * Update agent configuration with lead-specific overrides
   */
  async updateAgentForLead(leadData: LeadContextData, overrides?: AgentOverrides): Promise<void> {
    try {
      const agentConfig = {
        // System prompt with lead context
        system_prompt: this.generateSystemPromptForLead(leadData, overrides?.systemPrompt),
        
        // First message personalized for lead
        first_message: overrides?.firstMessage || this.generateFirstMessageForLead(leadData),
        
        // Voice settings
        voice: overrides?.voice || {
          voice_id: "21m00Tcm4TlvDq8ikWAM", // Professional female voice
          stability: 0.75,
          similarity_boost: 0.8
        },

        // LLM model selection
        llm_model: overrides?.llmModel || "claude-3.5-sonnet",

        // Knowledge base with lead context
        knowledge_base: this.prepareLeadKnowledgeBase(leadData),
        
        // Human transfer configuration to maintain voice character
        tools: this.configureTransferTools(leadData)
      };

      await axios.patch(
        `${this.baseUrl}/convai/agents/${AGENT_ID}`,
        agentConfig,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Failed to update agent configuration:', error);
      throw error;
    }
  }

  /**
   * Configure transfer tools with lead-specific agent phone
   */
  private configureTransferTools(leadData: LeadContextData): any[] {
    const tools = [];
    
    // Add transfer_to_number system tool if agent phone is available
    if (leadData.agentPhone) {
      tools.push({
        type: "system",
        name: "transfer_to_number",
        config: {
          transfer_destination: {
            type: "phone",
            phone_number: leadData.agentPhone
          },
          transfer_type: "conference",
          condition: "When the customer explicitly requests to speak to a human agent, needs pricing information, wants to discuss specific financing details, or when I determine human intervention would be beneficial.",
          client_message: `I'm connecting you with one of our specialists who can help you with your specific needs. Please hold on while I get them on the line.`,
          agent_message: `You're receiving a transfer from our AI assistant Jack. Customer is ${leadData.customerName} calling about automotive financing. They need human assistance with their inquiry.`
        }
      });
    }
    
    return tools;
  }

  /**
   * Configure server tools for CRM integration
   */
  async configureServerTools(): Promise<void> {
    try {
      const tools = [
        {
          name: "update_lead_status",
          description: "Update the lead's status in the CRM system based on conversation progress",
          type: "webhook",
          config: {
            url: `${process.env.VITE_API_BASE_URL}/api/crm/update-lead-status`,
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.VITE_CRM_API_KEY}`,
              "Content-Type": "application/json"
            }
          },
          parameters: [
            {
              name: "leadId",
              type: "string",
              description: "The unique identifier for the lead",
              required: true
            },
            {
              name: "status",
              type: "string",
              description: "New status for the lead (qualified, not_qualified, needs_follow_up, ready_for_funding)",
              required: true
            },
            {
              name: "notes",
              type: "string",
              description: "Additional notes about the status change",
              required: false
            }
          ]
        },
        {
          name: "schedule_follow_up",
          description: "Schedule a follow-up call or SMS for the lead",
          type: "webhook",
          config: {
            url: `${process.env.VITE_API_BASE_URL}/api/crm/schedule-follow-up`,
            method: "POST"
          },
          parameters: [
            {
              name: "leadId",
              type: "string",
              description: "The unique identifier for the lead",
              required: true
            },
            {
              name: "scheduledTime",
              type: "string",
              description: "When to schedule the follow-up (ISO 8601 format)",
              required: true
            },
            {
              name: "method",
              type: "string",
              description: "Follow-up method (call, sms, email)",
              required: true
            }
          ]
        },
        {
          name: "transfer_to_human",
          description: "Transfer the conversation to a human agent when needed",
          type: "webhook",
          config: {
            url: `${process.env.VITE_API_BASE_URL}/api/escalation/transfer-to-human`,
            method: "POST"
          },
          parameters: [
            {
              name: "leadId",
              type: "string",
              description: "The unique identifier for the lead",
              required: true
            },
            {
              name: "reason",
              type: "string",
              description: "Reason for transfer (frustrated_customer, complex_case, technical_issue)",
              required: true
            },
            {
              name: "urgency",
              type: "string",
              description: "Urgency level (low, medium, high)",
              required: true
            }
          ]
        }
      ];

      await axios.post(
        `${this.baseUrl}/convai/agents/${AGENT_ID}/tools`,
        { tools },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Failed to configure server tools:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a lead
   */
  async getConversationHistory(conversationId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/convai/conversations/${conversationId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  /**
   * Prepare conversation initiation data with lead context
   */
  private prepareConversationInitiationData(request: OutboundCallRequest): any {
    return {
      lead_id: request.leadId,
      lead_context: request.agentOverrides?.context,
      conversation_mode: "multimodal",
      enable_transcription: true,
      enable_recording: true,
      compliance_flags: {
        tcpa_consent: true,
        fdcpa_compliant: true,
        state_regulations: ["subprime_lending", "automotive_finance"]
      }
    };
  }

  /**
   * Generate system prompt with lead context
   */
  private generateSystemPromptForLead(leadData: LeadContextData, customPrompt?: string): string {
    const basePrompt = `
You are Sarah, a specialized automotive finance consultant for Jack Automotive, focusing on subprime customers who need personalized financing solutions.

LEAD INFORMATION:
- Name: ${leadData.customerName}
- Phone: ${leadData.phoneNumber}
- Current Status: ${leadData.fundingReadiness}
- Credit Situation: ${leadData.creditScore ? `Credit Score: ${leadData.creditScore}` : 'Credit score unknown'}
- Current Step: ${leadData.scriptProgress.currentStep}
- Chase Status: ${leadData.chaseStatus}
- Current Sentiment: ${leadData.sentiment}
- Preferred Contact: ${leadData.preferredContactMethod}

CONVERSATION CONTEXT:
${leadData.conversationHistory.slice(-3).map(msg => 
  `Previous ${msg.speaker}: ${msg.content}`
).join('\n')}

YOUR ROLE:
- Build trust and rapport with customers facing credit challenges
- Explain financing options clearly and honestly
- Help customers understand their options without being pushy
- Maintain compliance with TCPA, FDCPA, and state regulations
- Use appropriate empathy for customers' financial situations
- Guide customers through the application process step-by-step

CONVERSATION FLOW:
1. Greeting and rapport building
2. Understanding their vehicle needs and budget
3. Reviewing their credit situation sensitively
4. Explaining available financing options
5. Gathering required documentation
6. Next steps and follow-up scheduling

COMPLIANCE REQUIREMENTS:
- Always confirm TCPA consent for calls/texts
- Provide clear disclosures about rates and terms
- Respect customer's right to end conversation
- Don't make promises you can't keep about approvals
- Document any requests for human agent transfer

COMMUNICATION STYLE:
- Professional but warm and understanding
- Use simple, clear language (avoid finance jargon)
- Be patient with questions and concerns
- Show empathy for their credit situation
- Maintain positivity while being realistic

TOOLS AVAILABLE:
- update_lead_status: Update CRM when lead qualification changes
- schedule_follow_up: Schedule callbacks or document collection
- transfer_to_human: Escalate to human agent when needed

Remember: These customers often feel vulnerable about their credit situation. Your goal is to help them find a path to vehicle ownership while maintaining their dignity and trust.
`;

    return customPrompt ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${customPrompt}` : basePrompt;
  }

  /**
   * Generate personalized first message
   */
  private generateFirstMessageForLead(leadData: LeadContextData): string {
    const isFirstContact = leadData.conversationHistory.length === 0;
    
    if (isFirstContact) {
      return `Hi ${leadData.customerName}, this is Sarah calling from Jack Automotive. I hope I'm catching you at a good time. I understand you're looking into vehicle financing options, and I'd love to help you find the best solution for your situation. Do you have a few minutes to chat?`;
    } else {
      return `Hi ${leadData.customerName}, it's Sarah from Jack Automotive again. I wanted to follow up on our conversation about your vehicle financing. How are you doing today?`;
    }
  }

  /**
   * Prepare knowledge base with lead-specific context
   */
  private prepareLeadKnowledgeBase(leadData: LeadContextData): any {
    return {
      lead_profile: {
        customer_name: leadData.customerName,
        funding_readiness: leadData.fundingReadiness,
        credit_score: leadData.creditScore,
        conversation_history: leadData.conversationHistory.slice(-10), // Last 10 messages
        preferences: {
          contact_method: leadData.preferredContactMethod,
          communication_style: leadData.sentiment
        }
      },
      financing_options: [
        {
          name: "Traditional Auto Loan",
          min_credit_score: 650,
          description: "Standard auto financing with competitive rates"
        },
        {
          name: "Subprime Auto Loan", 
          min_credit_score: 500,
          description: "Specialized financing for customers with credit challenges"
        },
        {
          name: "Buy Here Pay Here",
          min_credit_score: 0,
          description: "In-house financing option with flexible requirements"
        },
        {
          name: "Co-signer Program",
          min_credit_score: 550,
          description: "Financing option with qualified co-signer"
        }
      ],
      compliance_info: {
        tcpa_disclosure: "By continuing this conversation, you consent to receive calls and texts from Jack Automotive regarding your vehicle financing inquiry.",
        fdcpa_notice: "This is an attempt to collect information that may be used for financing purposes.",
        state_regulations: "All financing is subject to state and federal lending regulations."
      }
    };
  }
}

export default ElevenLabsAPIService; 