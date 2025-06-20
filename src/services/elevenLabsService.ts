import { Conversation } from '@elevenlabs/client';
import axios from 'axios';
import { 
  ElevenLabsConfig, 
  SubprimeConversationManagerOptions,
  ConversationState,
  SubprimeConversationMessage,
  SubprimeCallSession,
  LeadContextData,
  ConversationCallbacks,
  AgentOverrides,
  SignedUrlResponse,
  OutboundCallRequest,
  CallStatusUpdate,
  TwilioCallData
} from '@/types/elevenlabs';

class SubprimeConversationManager {
  private config: ElevenLabsConfig;
  private leadData: LeadContextData;
  private callbacks: ConversationCallbacks;
  private conversation: any | null = null; // Using any for now since the type is complex
  private state: ConversationState;
  private currentSession: SubprimeCallSession | null = null;
  private static conversationHistory = new Map<string, SubprimeConversationMessage[]>();

  constructor(options: SubprimeConversationManagerOptions) {
    this.config = options.config;
    this.leadData = options.leadData;
    this.callbacks = options.callbacks || {};
    
    this.state = {
      isConnected: false,
      isCallActive: false,
      currentMode: 'multimodal', // Default to multimodal for voice+text
      agentSpeaking: false,
      userSpeaking: false
    };

    // Load conversation history from localStorage
    SubprimeConversationManager.loadConversationHistory();
  }

  /**
   * Get signed URL for authenticated agent connection
   */
  private async getSignedUrl(): Promise<string> {
    try {
      // For development or public agents, use agent ID directly
      if (!this.config.apiKey || process.env.NODE_ENV === 'development') {
        console.log('Using direct agent ID (no API key required for public agents)');
        return this.config.agentId;
      }

      // For production with API key, get signed URL
      const response = await axios.post<SignedUrlResponse>('/api/elevenlabs/signed-url', {
        agentId: this.config.agentId,
        leadId: this.leadData.leadId
      });
      
      return response.data.signed_url;
    } catch (error) {
      console.error('Failed to get signed URL, falling back to agent ID:', error);
      // Fallback to direct agent ID
      return this.config.agentId;
    }
  }

  /**
   * Prepare lead context for agent initialization
   */
  private prepareLeadContext(): string {
    const existingHistory = this.getConversationHistory();
    const isResuming = existingHistory.length > 0;
    
    let context = `
Lead Information:
- Name: ${this.leadData.customerName}
- Phone: ${this.leadData.phoneNumber}
- Credit Score: ${this.leadData.creditScore || 'Unknown'}
- Funding Readiness: ${this.leadData.fundingReadiness}
- Current Step: ${this.leadData.scriptProgress?.currentStep || 'Unknown'}
- Chase Status: ${this.leadData.chaseStatus}
- Sentiment: ${this.leadData.sentiment}
- Preferred Contact: ${this.leadData.preferredContactMethod}
`;

    if (isResuming) {
      const conversationSummary = this.generateConversationSummary(existingHistory);
      const recentMessages = existingHistory.slice(-6); // Last 6 messages for immediate context
      
      context += `

IMPORTANT: This is a CONTINUATION of an existing conversation. DO NOT introduce yourself again.

Conversation Summary:
${conversationSummary}

Recent Conversation Context (Last ${recentMessages.length} messages):
${recentMessages.map(msg => 
  `${msg.speaker === 'agent' ? 'You (Agent)' : msg.speaker === 'lead' ? 'Customer' : 'System'}: ${msg.content}`
).join('\n')}

CRITICAL Instructions for Resume:
- CONTINUE the conversation naturally from where it left off
- DO NOT re-introduce yourself or restart the conversation  
- Reference the previous conversation context appropriately
- Keep the conversation flowing naturally
- Address any open questions or topics from the previous conversation
- Maintain the same tone and approach established earlier
`;
    } else {
      context += `

Instructions:
- This is a NEW conversation with a subprime automotive lead
- Follow your normal introduction and qualification process
- Focus on building trust and understanding their financial situation
`;
    }
    
    context += `
- Be compliant with TCPA and FDCPA regulations
- Offer appropriate financing solutions based on their profile
- If the lead becomes frustrated or requests human help, initiate transfer
- Maintain conversation continuity across voice and text modes
- This is a multimodal conversation - customer can use voice OR text at any time
`;
    
    return context;
  }

  /**
   * Generate a summary of the conversation for context
   */
  private generateConversationSummary(messages: SubprimeConversationMessage[]): string {
    if (messages.length === 0) return 'No previous conversation';
    
    // Analyze conversation for key points
    const customerMessages = messages.filter(m => m.speaker === 'lead');
    const agentMessages = messages.filter(m => m.speaker === 'agent');
    
    // Extract key information mentioned
    const topics = {
      creditScore: false,
      vehicleType: false,
      budget: false,
      timeline: false,
      tradeIn: false,
      employment: false,
      downPayment: false,
      financing: false,
      concerns: [] as string[]
    };
    
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    // Check for discussed topics
    if (allText.includes('credit') || allText.includes('score')) topics.creditScore = true;
    if (allText.includes('car') || allText.includes('vehicle') || allText.includes('truck')) topics.vehicleType = true;
    if (allText.includes('budget') || allText.includes('payment') || allText.includes('afford')) topics.budget = true;
    if (allText.includes('when') || allText.includes('soon') || allText.includes('time')) topics.timeline = true;
    if (allText.includes('trade') || allText.includes('current')) topics.tradeIn = true;
    if (allText.includes('job') || allText.includes('work') || allText.includes('employ')) topics.employment = true;
    if (allText.includes('down') || allText.includes('upfront')) topics.downPayment = true;
    if (allText.includes('loan') || allText.includes('financing') || allText.includes('approve')) topics.financing = true;
    
    // Identify concerns or objections
    if (allText.includes('worry') || allText.includes('concern') || allText.includes('afraid')) {
      topics.concerns.push('expressed concerns');
    }
    if (allText.includes('bad credit') || allText.includes('poor credit')) {
      topics.concerns.push('credit concerns');
    }
    if (allText.includes('expensive') || allText.includes('too much')) {
      topics.concerns.push('cost concerns');
    }
    
    // Build summary
    let summary = `Previous conversation (${messages.length} messages):`;
    
    const discussedTopics = [];
    if (topics.creditScore) discussedTopics.push('credit score');
    if (topics.vehicleType) discussedTopics.push('vehicle preferences');
    if (topics.budget) discussedTopics.push('budget/payment capacity');
    if (topics.timeline) discussedTopics.push('purchase timeline');
    if (topics.tradeIn) discussedTopics.push('trade-in vehicle');
    if (topics.employment) discussedTopics.push('employment status');
    if (topics.downPayment) discussedTopics.push('down payment');
    if (topics.financing) discussedTopics.push('financing options');
    
    if (discussedTopics.length > 0) {
      summary += `\n- Topics covered: ${discussedTopics.join(', ')}`;
    }
    
    if (topics.concerns.length > 0) {
      summary += `\n- Customer concerns: ${topics.concerns.join(', ')}`;
    }
    
    // Add conversation progress assessment
    const conversationLength = messages.length;
    if (conversationLength < 10) {
      summary += '\n- Stage: Early conversation/introduction phase';
    } else if (conversationLength < 25) {
      summary += '\n- Stage: Information gathering/qualification phase';
    } else {
      summary += '\n- Stage: Advanced discussion/closing phase';
    }
    
    // Determine customer engagement level
    const customerResponseRate = customerMessages.length / Math.max(agentMessages.length, 1);
    if (customerResponseRate > 0.8) {
      summary += '\n- Engagement: Highly engaged customer';
    } else if (customerResponseRate > 0.5) {
      summary += '\n- Engagement: Moderately engaged customer';
    } else {
      summary += '\n- Engagement: Customer may need more engagement';
    }
    
    // Get the last customer message for immediate context
    const lastCustomerMessage = customerMessages[customerMessages.length - 1];
    if (lastCustomerMessage) {
      summary += `\n- Last customer message: "${lastCustomerMessage.content.substring(0, 100)}${lastCustomerMessage.content.length > 100 ? '...' : ''}"`;
    }
    
    return summary;
  }

  /**
   * Initialize multimodal conversation with ElevenLabs agent
   * This replaces separate voice/text modes with unified multimodal approach
   */
  async startConversation(preferredMode: 'voice' | 'text' | 'multimodal' = 'multimodal'): Promise<void> {
    try {
      console.log('🚀 Starting ElevenLabs conversation with SMS context...');
      console.log('📋 Preferred mode:', preferredMode);
      console.log('🤖 Agent ID:', this.config.agentId);
      console.log('👤 Lead:', this.leadData.customerName);

      // Check if Conversation class is available
      if (!Conversation) {
        throw new Error('ElevenLabs Conversation class not available. Check if @elevenlabs/client is installed correctly.');
      }

      console.log('✅ ElevenLabs Conversation class found');

      // Prepare initial context with SMS history
      const initialContext = this.prepareLeadContextWithSMS();
      const initialMessage = this.generateInitialMessage();
      const existingHistory = this.getConversationHistory();
      
      console.log('📝 Context preparation:');
      console.log('- Existing messages:', existingHistory.length);
      console.log('- SMS messages:', existingHistory.filter(m => m.metadata?.smsReceived || m.metadata?.smsSent).length);
      console.log('- Initial message:', initialMessage || '[Empty - resuming conversation]');
      console.log('- Context length:', initialContext.length);

      // Get signed URL or use agent ID directly
      const agentUrl = await this.getSignedUrl();
      console.log('🔗 Using agent URL/ID:', agentUrl.substring(0, 50) + '...');

      // Create conversation instance
      this.conversation = await Conversation.startSession({
        agentId: agentUrl,
        onConnect: () => {
          console.log('🔗 Connected to ElevenLabs agent');
          this.state.isConnected = true;
          this.state.error = undefined;
          this.callbacks.onConnect?.();
        },
        onDisconnect: () => {
          console.log('🔌 Disconnected from ElevenLabs agent');
          this.state.isConnected = false;
          this.state.isCallActive = false;
          this.callbacks.onDisconnect?.();
        },
        onError: (error: any) => {
          console.error('❌ ElevenLabs conversation error:', error);
          this.state.error = error.message || 'Connection error';
          this.state.isConnected = false;
          this.callbacks.onError?.(this.state.error);
        },
        onMessage: (message: any) => {
          console.log('💬 Message received:', message);
          this.handleMessage(message);
        },
        onModeChange: (mode: any) => {
          console.log('🔄 Mode changed:', mode);
          this.state.currentMode = mode;
          this.callbacks.onModeChange?.(mode);
        }
      });

      // Set initial mode
      this.state.currentMode = preferredMode;

      // Inject initial context if we have conversation history (including SMS)
      if (existingHistory.length > 0) {
        console.log('📚 Injecting conversation history context...');
        await this.injectConversationContext(existingHistory);
      }

      // Send initial message if this is a new conversation
      if (initialMessage && existingHistory.length === 0) {
        console.log('💬 Sending initial message...');
        await this.conversation.sendMessage(initialMessage);
      }

      // Start session tracking
      this.startSession();

      console.log('✅ ElevenLabs conversation started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to start conversation';
      this.state.isConnected = false;
      this.callbacks.onError?.(this.state.error);
      throw error;
    }
  }

  /**
   * Generate initial message based on conversation history
   */
  private generateInitialMessage(): string {
    const existingHistory = this.getConversationHistory();
    
    if (existingHistory.length > 0) {
      // Resuming conversation - don't send initial message, let context handle it
      return '';
    } else {
      // New conversation - personalized greeting
      return `Hi ${this.leadData.customerName}, this is Jack from Jack Automotive. I understand you're looking for vehicle financing options. I'm here to help you find the best solution for your situation. How are you doing today?`;
    }
  }

  /**
   * Start voice-enabled conversation (browser-based, not phone call)
   * This is for browser microphone input, not telephony
   */
  async startVoiceConversation(): Promise<void> {
    try {
      console.log('🎤 Starting voice-enabled conversation...');
      
      // Request microphone permission first
      await this.requestMicrophonePermission();
      
      // Start multimodal conversation with voice preference
      await this.startConversation('multimodal');
      
      this.state.isCallActive = true; // This means "voice is active", not "phone call"
      
      console.log('✅ Voice conversation started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start voice conversation:', error);
      throw error;
    }
  }

  /**
   * Request microphone permission for voice input
   */
  private async requestMicrophonePermission(): Promise<void> {
    try {
      console.log('🎤 Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      throw new Error('Microphone permission is required for voice conversations. Please allow microphone access and try again.');
    }
  }

  /**
   * Send text message to lead (works in both text and multimodal mode)
   */
  async sendTextMessage(message: string): Promise<void> {
    if (!this.conversation) {
      throw new Error('Conversation not initialized');
    }

    try {
      // Send message using ElevenLabs sendUserMessage method
      await this.conversation.sendUserMessage(message);
      
      // Record outbound text message
      this.handleUserMessage(message, 'text');
      
    } catch (error) {
      console.error('Failed to send text message:', error);
      throw error;
    }
  }

  /**
   * Switch conversation mode while maintaining context and session
   * ENHANCED: Properly restart conversation for text-only mode
   */
  async switchMode(newMode: 'voice' | 'text' | 'multimodal'): Promise<void> {
    console.log(`🔄 Switching conversation mode from ${this.state.currentMode} to ${newMode}`);
    
    try {
      // For text-only mode, we need to properly restart the conversation
      if (newMode === 'text') {
        console.log('📝 Switching to text-only mode - restarting conversation...');
        
        // End current conversation if active
        if (this.conversation) {
          try {
            await this.conversation.endSession();
            console.log('✅ Previous conversation ended');
          } catch (error) {
            console.warn('⚠️ Failed to end previous conversation:', error);
          }
        }
        
        // Start new text-only conversation
        await this.startConversation('text');
        console.log('✅ Text-only conversation started');
        return;
      }
      
      // For voice/multimodal modes, check if we need to restart
      if (!this.conversation) {
        console.log('🔄 No active conversation - starting new conversation in requested mode');
        await this.startConversation(newMode);
        return;
      }
      
      // For multimodal, mode changes are automatic - just update state
      console.log('🔄 Mode changes are handled automatically in ElevenLabs multimodal conversations');
      console.log('💡 The same conversation session maintains context across voice/text modes');
      
      // Update local state 
      this.state.currentMode = newMode;
      
      // Handle voice permission for voice modes
      if (newMode === 'voice' || newMode === 'multimodal') {
        try {
          await this.requestMicrophonePermission();
        } catch (error) {
          console.warn('⚠️ Microphone permission denied, falling back to text mode');
          this.state.currentMode = 'text';
          newMode = 'text';
        }
      }
      
      this.callbacks.onModeChange?.(newMode === 'multimodal' ? 'voice' : newMode);
      console.log(`✅ Successfully switched to ${newMode} mode`);
      
    } catch (error) {
      console.error('❌ Failed to switch mode:', error);
      throw error;
    }
  }

  /**
   * Initiate outbound call via ElevenLabs Conversational AI + Twilio Native Integration
   */
  async initiateOutboundCall(): Promise<void> {
    try {
      console.log('🔄 Initiating outbound call for lead:', this.leadData.customerName);
      
      // Prepare context for the call
      const callContext = this.prepareLeadContext();
      const conversationHistory = this.getConversationHistory();
      
      // Create outbound call request using your existing agent
      const callRequest: OutboundCallRequest = {
        leadId: this.leadData.leadId,
        phoneNumber: this.leadData.phoneNumber,
        agentOverrides: {
          systemPrompt: callContext,
          firstMessage: conversationHistory.length > 0 
            ? this.generateResumeMessage() 
            : this.generateInitialMessage(),
          context: this.leadData
        }
      };

      // Make API call to initiate outbound call through your agent
      const response = await axios.post('/api/elevenlabs/outbound-call', {
        agentId: this.config.agentId, // Uses your agent_01jwc5v1nafjwv7zw4vtz1050m
        callRequest,
        conversationHistory: conversationHistory.slice(-6) // Last 6 messages for context
      });

      console.log('✅ Outbound call initiated:', response.data);
      
      // Update state
      this.state.isCallActive = true;
      this.state.currentMode = 'voice';
      
      // Start new session
      this.startSession();
      
      // Notify callbacks
      this.callbacks.onModeChange?.('voice');
      
    } catch (error) {
      console.error('❌ Failed to initiate outbound call:', error);
      this.state.error = 'Failed to initiate call';
      this.callbacks.onError?.('Failed to initiate outbound call');
      
      // Fallback to browser-based voice conversation
      console.log('⚠️ Falling back to browser-based voice conversation');
      await this.startVoiceConversation();
    }
  }

  /**
   * Generate message for resuming conversation
   */
  private generateResumeMessage(): string {
    const lastMessage = this.getConversationHistory().slice(-1)[0];
    if (!lastMessage) return this.generateInitialMessage();
    
    // Create a natural resume message based on conversation context
    return `Hi ${this.leadData.customerName}, it's Sarah from Jack Automotive. I wanted to follow up on our previous conversation about your vehicle financing needs.`;
  }

  /**
   * Handle incoming SMS messages and inject into conversation context
   */
  async handleIncomingSMS(message: string, fromNumber: string): Promise<void> {
    try {
      console.log('📱 Handling incoming SMS from:', fromNumber, 'Message:', message);
      
      // Validate phone number matches this lead
      if (fromNumber !== this.leadData.phoneNumber) {
        console.warn('SMS from unknown number:', fromNumber);
        return;
      }
      
      // Create SMS message record
      const smsMessage: SubprimeConversationMessage = {
        id: crypto.randomUUID(),
        leadId: this.leadData.leadId,
        type: 'text_input',
        content: message,
        timestamp: new Date().toISOString(),
        speaker: 'lead',
        mode: 'text',
        metadata: {
          conversationId: this.currentSession?.conversationId,
          smsReceived: true
        }
      };
      
      // Add to conversation history
      this.addMessageToSession(smsMessage);
      this.callbacks.onMessage?.(smsMessage);
      
      // If we have an active ElevenLabs conversation, inject via client events
      if (this.conversation && this.state.isConnected) {
        await this.injectSMSViaClientEvent(message);
      } else {
        // Start conversation in text mode to handle SMS
        await this.startConversation('text');
        
        // Wait a moment for connection, then inject
        setTimeout(async () => {
          if (this.conversation && this.state.isConnected) {
            await this.injectSMSViaClientEvent(message);
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Failed to handle incoming SMS:', error);
      this.callbacks.onError?.('Failed to process SMS message');
    }
  }

  /**
   * Inject SMS message into ElevenLabs conversation using client events
   */
  private async injectSMSViaClientEvent(message: string): Promise<void> {
    try {
      if (!this.conversation) {
        throw new Error('No active conversation to inject SMS into');
      }

      console.log('🔄 Injecting SMS via ElevenLabs client event');
      
      // Use ElevenLabs client events to inject SMS context
      const contextUpdate = {
        type: 'context_injection',
        data: {
          event_type: 'sms_received',
          message: message,
          timestamp: new Date().toISOString(),
          context: `The customer just sent an SMS message: "${message}". Please acknowledge this message naturally and respond appropriately. This is part of our ongoing conversation.`
        }
      };

      // Inject via client event (this depends on the ElevenLabs client library)
      if (this.conversation.sendClientEvent) {
        await this.conversation.sendClientEvent(contextUpdate);
      } else if (this.conversation.sendContextualUpdate) {
        // Alternative method if sendClientEvent doesn't exist
        await this.conversation.sendContextualUpdate(
          `Customer SMS: "${message}". Please respond naturally to this message.`
        );
      } else {
        // Fallback: send as a regular message
        console.log('⚠️ Using fallback method to inject SMS context');
        await this.conversation.sendMessage(`[SMS received: "${message}"]`);
      }
      
      console.log('✅ SMS context injected successfully');
      
    } catch (error) {
      console.error('❌ Failed to inject SMS via client event:', error);
      throw error;
    }
  }

  /**
   * Send SMS message via Twilio (not ElevenLabs native)
   */
  async sendSMS(message: string): Promise<void> {
    try {
      console.log('📱 Sending SMS to:', this.leadData.phoneNumber);
      
      // Call our Twilio SMS API endpoint
      const response = await axios.post('/api/twilio/send-sms', {
        to: this.leadData.phoneNumber,
        message,
        leadId: this.leadData.leadId,
        agentId: this.config.agentId
      });
      
      // Record the SMS in conversation history
      const smsMessage: SubprimeConversationMessage = {
        id: crypto.randomUUID(),
        leadId: this.leadData.leadId,
        type: 'text_output',
        content: message,
        timestamp: new Date().toISOString(),
        speaker: 'agent',
        mode: 'text',
        metadata: {
          conversationId: this.currentSession?.conversationId,
          smsId: response.data.messageSid,
          smsSent: true
        }
      };
      
      this.addMessageToSession(smsMessage);
      this.callbacks.onMessage?.(smsMessage);
      
      console.log('✅ SMS sent successfully');
      
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      this.callbacks.onError?.('Failed to send SMS message');
      throw error;
    }
  }

  /**
   * Transfer conversation to human agent
   */
  async transferToHuman(reason: string = 'Lead requested human assistance'): Promise<void> {
    try {
      // Use client tool to notify human agent
      if (this.conversation?.clientTools?.notifyHumanAgent) {
        await this.conversation.clientTools.notifyHumanAgent({
          leadId: this.leadData.leadId,
          reason,
          urgency: 'medium'
        });
      }

      // Pause AI agent by sending a contextual update (better approach)
      if (this.conversation) {
        await this.conversation.sendContextualUpdate(
          `Human agent requested. Please inform the customer that a human agent will take over shortly and pause AI responses. This is a contextual update - do not respond directly to this.`
        );
      }

      // Record transfer event
      this.handleSystemMessage(`Conversation transferred to human agent: ${reason}`);

    } catch (error) {
      console.error('Failed to transfer to human:', error);
      throw error;
    }
  }

  /**
   * End conversation gracefully
   */
  async endConversation(): Promise<void> {
    try {
      if (this.conversation) {
        await this.conversation.endSession();
      }
      
      this.endSession('completed');
      
    } catch (error) {
      console.error('Failed to end conversation:', error);
      throw error;
    }
  }

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return { ...this.state };
  }

  /**
   * Get current session data
   */
  getCurrentSession(): SubprimeCallSession | null {
    return this.currentSession;
  }

  /**
   * Get conversation history for current lead
   */
  getConversationHistory(): SubprimeConversationMessage[] {
    const history = SubprimeConversationManager.conversationHistory.get(this.leadData.leadId) || [];
    console.log(`📚 Getting conversation history for lead ${this.leadData.leadId}: ${history.length} messages`);
    if (history.length > 0) {
      console.log('📚 Latest messages:', history.slice(-3).map(m => `${m.speaker}: ${m.content.substring(0, 50)}...`));
    }
    return history;
  }

  /**
   * Save conversation history for current lead
   */
  private saveConversationHistory(messages: SubprimeConversationMessage[]): void {
    SubprimeConversationManager.conversationHistory.set(this.leadData.leadId, [...messages]);
    
    // Also save to localStorage for persistence across page reloads
    try {
      const historyData = Object.fromEntries(SubprimeConversationManager.conversationHistory);
      localStorage.setItem('subprime_conversation_history', JSON.stringify(historyData));
    } catch (error) {
      console.warn('Failed to save conversation history to localStorage:', error);
    }
  }

  /**
   * Load conversation history from localStorage
   */
  private static loadConversationHistory(): void {
    try {
      console.log('📚 Loading conversation history from localStorage...');
      const historyData = localStorage.getItem('subprime_conversation_history');
      if (historyData) {
        const parsed = JSON.parse(historyData);
        SubprimeConversationManager.conversationHistory = new Map(Object.entries(parsed));
        console.log('📚 Loaded conversation history for leads:', Object.keys(parsed));
        Object.entries(parsed).forEach(([leadId, messages]) => {
          console.log(`📚 Lead ${leadId}: ${(messages as any[]).length} messages`);
        });
      } else {
        console.log('📚 No conversation history found in localStorage');
      }
    } catch (error) {
      console.warn('Failed to load conversation history from localStorage:', error);
    }
  }

  /**
   * Clear conversation history for current lead
   */
  clearConversationHistory(): void {
    SubprimeConversationManager.conversationHistory.delete(this.leadData.leadId);
    this.saveConversationHistory([]);
  }

  /**
   * Handle incoming messages from ElevenLabs
   */
  private handleMessage(message: any): void {
    // Determine message type and speaker based on ElevenLabs message structure
    const isAgentMessage = message.source === 'ai' || message.type === 'agent_response';
    const content = message.message || message.text || message.content || '';
    
    const conversationMessage: SubprimeConversationMessage = {
      id: crypto.randomUUID(),
      leadId: this.leadData.leadId,
      type: isAgentMessage ? 'text_output' : 'text_input',
      content,
      timestamp: new Date().toISOString(),
      speaker: isAgentMessage ? 'agent' : 'lead',
      mode: this.state.currentMode === 'multimodal' ? 'text' : this.state.currentMode,
      metadata: {
        conversationId: this.currentSession?.conversationId,
        eventId: message.id
      }
    };

    this.addMessageToSession(conversationMessage);
    this.callbacks.onMessage?.(conversationMessage);

    // Call appropriate callback
    if (isAgentMessage) {
      this.callbacks.onAgentResponse?.(content);
    } else {
      this.callbacks.onUserTranscript?.(content);
    }
  }

  /**
   * Handle user message input
   */
  private handleUserMessage(content: string, mode: 'voice' | 'text'): void {
    const message: SubprimeConversationMessage = {
      id: crypto.randomUUID(),
      leadId: this.leadData.leadId,
      type: mode === 'voice' ? 'voice_input' : 'text_input',
      content,
      timestamp: new Date().toISOString(),
      speaker: 'lead',
      mode,
      metadata: {
        conversationId: this.currentSession?.conversationId
      }
    };

    this.addMessageToSession(message);
    this.callbacks.onMessage?.(message);
  }

  /**
   * Handle system messages
   */
  private handleSystemMessage(content: string): void {
    const message: SubprimeConversationMessage = {
      id: crypto.randomUUID(),
      leadId: this.leadData.leadId,
      type: 'system',
      content,
      timestamp: new Date().toISOString(),
      speaker: 'system',
      mode: 'text',
      metadata: {
        conversationId: this.currentSession?.conversationId
      }
    };

    this.addMessageToSession(message);
    this.callbacks.onMessage?.(message);
  }

  /**
   * Start a new session (UI display history is handled separately)
   */
  private startSession(): void {
    // Get existing conversation history for this lead
    const existingHistory = this.getConversationHistory();
    
    this.currentSession = {
      id: crypto.randomUUID(),
      leadId: this.leadData.leadId,
      conversationId: crypto.randomUUID(),
      status: 'active',
      startTime: new Date().toISOString(),
      mode: this.state.currentMode === 'voice' ? 'voice_only' : 
            this.state.currentMode === 'text' ? 'text_only' : 'multimodal',
      messages: [...existingHistory], // Keep history for session record
      metadata: {
        phoneNumber: this.leadData.phoneNumber,
        callDirection: 'outbound'
      }
    };

    // Don't send old messages to UI again - they're already loaded
    if (existingHistory.length > 0) {
      console.log(`📚 Session resumed with ${existingHistory.length} previous messages for lead ${this.leadData.leadId}`);
    }
  }

  /**
   * End current session
   */
  private endSession(reason: string = 'completed'): void {
    if (this.currentSession) {
      this.currentSession.status = 'ended';
      this.currentSession.endTime = new Date().toISOString();
      this.currentSession.metadata.endReason = reason as 'completed' | 'hangup' | 'error' | 'transferred';
      
      // Calculate duration
      const startTime = new Date(this.currentSession.startTime);
      const endTime = new Date();
      this.currentSession.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }

    this.state.isConnected = false;
    this.state.isCallActive = false;
  }

  /**
   * Add message to current session and persistent history
   */
  private addMessageToSession(message: SubprimeConversationMessage): void {
    if (this.currentSession) {
      this.currentSession.messages.push(message);
    }

    // Add to persistent conversation history
    const currentHistory = this.getConversationHistory();
    currentHistory.push(message);
    this.saveConversationHistory(currentHistory);
  }

  /**
   * Test basic connection without complex features
   */
  async testConnection(): Promise<void> {
    try {
      console.log('🧪 Testing basic ElevenLabs connection...');
      
      // Minimal conversation options
      const testOptions = {
        agentId: this.config.agentId,
        textOnly: true,
        
        onConnect: () => {
          console.log('🧪 Test connection established');
          setTimeout(() => {
            console.log('🧪 Test complete, maintaining connection...');
          }, 2000);
        },
        
        onDisconnect: () => {
          console.log('🧪 Test connection ended');
        },
        
        onError: (error: any) => {
          console.error('🧪 Test connection error:', error);
          throw error;
        },

        onStatusChange: (statusData: { status: string }) => {
          console.log('🧪 Test status:', statusData);
        }
      };

      this.conversation = await Conversation.startSession(testOptions);
      console.log('✅ Test connection successful');
      
    } catch (error) {
      console.error('❌ Test connection failed:', error);
      throw error;
    }
  }

  /**
   * Add a human agent message to the conversation history
   */
  addHumanAgentMessage(content: string, agentSpecialist?: string): void {
    const message: SubprimeConversationMessage = {
      id: `msg_${Date.now()}_human_${Math.random().toString(36).substr(2, 9)}`,
      leadId: this.leadData.leadId,
      type: 'text_input',
      content,
      timestamp: new Date().toISOString(),
      speaker: 'human_agent',
      mode: 'text',
      metadata: {
        conversationId: this.currentSession?.conversationId,
        agentSpecialist: agentSpecialist || this.leadData.specialist || 'Dealer'
      }
    };

    this.addMessageToSession(message);
    this.callbacks.onMessage?.(message);
  }

  /**
   * ALTERNATIVE METHOD: Prepare context for Knowledge Base integration
   * This could be used if the agent supports dynamic knowledge base updates
   */
  private prepareKnowledgeBaseContext(): {
    leadProfile: any;
    conversationSummary: any;
    recentMessages: any[];
  } {
    const existingHistory = this.getConversationHistory();
    
    const leadProfile = {
      name: this.leadData.customerName,
      phone: this.leadData.phoneNumber,
      creditScore: this.leadData.creditScore || 'Unknown',
      fundingReadiness: this.leadData.fundingReadiness,
      currentStep: this.leadData.scriptProgress?.currentStep || 'Unknown',
      chaseStatus: this.leadData.chaseStatus,
      sentiment: this.leadData.sentiment,
      preferredContact: this.leadData.preferredContactMethod
    };

    const conversationSummary = existingHistory.length > 0 ? {
      messageCount: existingHistory.length,
      summary: this.generateConversationSummary(existingHistory),
      isResuming: true
    } : {
      messageCount: 0,
      summary: 'New conversation',
      isResuming: false
    };

    const recentMessages = existingHistory.slice(-6).map(msg => ({
      speaker: msg.speaker,
      content: msg.content,
      timestamp: msg.timestamp,
      mode: msg.mode
    }));

    return {
      leadProfile,
      conversationSummary,
      recentMessages
    };
  }

  /**
   * ALTERNATIVE METHOD: Send context via client tools (if available)
   * This uses ElevenLabs client tools to inject context
   */
  private async injectContextViaClientTools(): Promise<void> {
    if (!this.conversation?.clientTools) {
      console.warn('⚠️ Client tools not available for context injection');
      return;
    }

    try {
      const contextData = this.prepareKnowledgeBaseContext();
      
      // Example of how client tools might be used (this depends on agent configuration)
      if (this.conversation.clientTools.updateLeadContext) {
        await this.conversation.clientTools.updateLeadContext(contextData);
        console.log('✅ Context injected via client tools');
      } else {
        console.warn('⚠️ updateLeadContext client tool not available');
      }
    } catch (error) {
      console.error('❌ Failed to inject context via client tools:', error);
    }
  }

  /**
   * Prepare lead context including SMS conversation history
   */
  private prepareLeadContextWithSMS(): string {
    const existingHistory = this.getConversationHistory();
    const isResuming = existingHistory.length > 0;
    const smsMessages = existingHistory.filter(m => m.metadata?.smsReceived || m.metadata?.smsSent);
    
    let context = `
Lead Information:
- Name: ${this.leadData.customerName}
- Phone: ${this.leadData.phoneNumber}
- Credit Score: ${this.leadData.creditScore || 'Unknown'}
- Funding Readiness: ${this.leadData.fundingReadiness}
- Current Step: ${this.leadData.scriptProgress?.currentStep || 'Unknown'}
- Chase Status: ${this.leadData.chaseStatus}
- Sentiment: ${this.leadData.sentiment}
- Preferred Contact: ${this.leadData.preferredContactMethod}
`;

    if (smsMessages.length > 0) {
      context += `

SMS Conversation History:
${smsMessages.map(msg => 
  `${msg.speaker === 'agent' ? 'You (Agent)' : 'Customer'}: ${msg.content} (${new Date(msg.timestamp).toLocaleTimeString()})`
).join('\n')}
`;
    }

    if (isResuming) {
      const conversationSummary = this.generateConversationSummary(existingHistory);
      const recentMessages = existingHistory.slice(-6); // Last 6 messages for immediate context
      
      context += `

IMPORTANT: This is a CONTINUATION of an existing conversation across multiple channels (voice, text, SMS).

Conversation Summary:
${conversationSummary}

Recent Conversation Context (Last ${recentMessages.length} messages across all channels):
${recentMessages.map(msg => 
  `${msg.speaker === 'agent' ? 'You (Agent)' : msg.speaker === 'lead' ? 'Customer' : 'System'}: ${msg.content} [${msg.mode}${msg.metadata?.smsReceived ? ' SMS' : ''}]`
).join('\n')}

CRITICAL Instructions for Resume:
- CONTINUE the conversation naturally from where it left off
- This conversation spans voice calls, browser chat, AND SMS messages
- Acknowledge any recent SMS messages naturally
- DO NOT re-introduce yourself or restart the conversation  
- Reference the previous conversation context appropriately
- Keep the conversation flowing naturally across all communication channels
- Address any open questions or topics from the previous conversation
- Maintain the same tone and approach established earlier
`;
    } else {
      context += `

Instructions:
- This is a NEW conversation with a subprime automotive lead
- This conversation may span voice calls, browser chat, and SMS
- Follow your normal introduction and qualification process
- Focus on building trust and understanding their financial situation
`;
    }
    
    context += `
- Be compliant with TCPA and FDCPA regulations
- Offer appropriate financing solutions based on their profile
- If the lead becomes frustrated or requests human help, initiate transfer
- Maintain conversation continuity across voice, text, and SMS modes
- This is a multimodal conversation - customer can use voice, browser chat, OR SMS at any time
- Always acknowledge when switching between communication methods
`;
    
    return context;
  }

  /**
   * Inject conversation context including SMS history
   */
  private async injectConversationContext(history: SubprimeConversationMessage[]): Promise<void> {
    try {
      if (!this.conversation) return;

      // Group messages by type for better context injection
      const voiceMessages = history.filter(m => m.mode === 'voice');
      const textMessages = history.filter(m => m.mode === 'text' && !m.metadata?.smsReceived && !m.metadata?.smsSent);
      const smsMessages = history.filter(m => m.metadata?.smsReceived || m.metadata?.smsSent);

      let contextSummary = 'Previous conversation context:\n';
      
      if (voiceMessages.length > 0) {
        contextSummary += `\nVoice conversations: ${voiceMessages.length} messages`;
      }
      
      if (textMessages.length > 0) {
        contextSummary += `\nBrowser chat messages: ${textMessages.length} messages`;
      }
      
      if (smsMessages.length > 0) {
        contextSummary += `\nSMS messages: ${smsMessages.length} messages`;
        contextSummary += '\nRecent SMS exchange:\n';
        smsMessages.slice(-3).forEach(msg => {
          contextSummary += `- ${msg.speaker === 'agent' ? 'You' : 'Customer'}: "${msg.content}"\n`;
        });
      }

      // Use client events to inject context
      if (this.conversation.sendClientEvent) {
        await this.conversation.sendClientEvent({
          type: 'context_injection',
          data: {
            event_type: 'conversation_resume',
            context: contextSummary,
            message_count: history.length,
            sms_count: smsMessages.length,
            last_interaction: history[history.length - 1]?.timestamp
          }
        });
      } else if (this.conversation.sendContextualUpdate) {
        await this.conversation.sendContextualUpdate(contextSummary);
      }

      console.log('✅ Conversation context injected successfully');
      
    } catch (error) {
      console.error('❌ Failed to inject conversation context:', error);
    }
  }

  /**
   * Set up real-time SMS streaming
   */
  setupRealtimeStreaming(): void {
    // Set up WebSocket or SSE connection for real-time SMS updates
    if (typeof window !== 'undefined') {
      console.log('🔄 Setting up real-time SMS streaming...');
      
      // This would connect to your real-time update service
      const eventSource = new EventSource(`/api/stream/conversation/${this.leadData.leadId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          
          if (update.type === 'sms_received') {
            console.log('📱 Real-time SMS received:', update.message);
            this.handleIncomingSMS(update.message.content, this.leadData.phoneNumber);
          } else if (update.type === 'sms_sent') {
            console.log('📱 Real-time SMS sent confirmation:', update.message);
            // Update UI to show SMS was sent
            this.callbacks.onMessage?.(update.message);
          }
        } catch (error) {
          console.error('❌ Failed to parse real-time update:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ Real-time streaming error:', error);
      };
      
      // Clean up on disconnect
      const originalEndConversation = this.endConversation.bind(this);
      this.endConversation = async () => {
        eventSource.close();
        return originalEndConversation();
      };
    }
  }
}

export default SubprimeConversationManager; 