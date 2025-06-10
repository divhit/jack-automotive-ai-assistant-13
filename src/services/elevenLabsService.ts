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
  OutboundCallRequest
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
      console.log('🚀 Starting ElevenLabs multimodal conversation...');
      console.log('📋 Preferred mode:', preferredMode);
      console.log('🤖 Agent ID:', this.config.agentId);
      console.log('👤 Lead:', this.leadData.customerName);

      // Check if Conversation class is available
      if (!Conversation) {
        throw new Error('ElevenLabs Conversation class not available. Check if @elevenlabs/client is installed correctly.');
      }

      console.log('✅ ElevenLabs Conversation class found');

      // Prepare initial context with conversation history
      const initialContext = this.prepareLeadContext();
      const initialMessage = this.generateInitialMessage();
      const existingHistory = this.getConversationHistory();
      
      console.log('📝 Context preparation:');
      console.log('- Existing messages:', existingHistory.length);
      console.log('- Initial message:', initialMessage || '[Empty - resuming conversation]');
      console.log('- Context length:', initialContext.length);
      
      // Configure conversation with proper overrides structure from ElevenLabs docs
      const conversationOptions: any = {
        // Use agent ID for public agent
        agentId: this.config.agentId,
        
        // Enable multimodal (voice + text) by default unless specifically text-only
        textOnly: preferredMode === 'text',
        
        // Remove overrides completely - they're causing connection rejection
        // overrides: {
        //   agent: {
        //     ...(initialMessage ? { firstMessage: initialMessage } : {}),
        //     prompt: {
        //       prompt: initialContext
        //     }
        //   }
        // },

        // Event handlers
        onConnect: async () => {
          console.log('🔗 ElevenLabs conversation connected!');
          this.state.isConnected = true;
          this.state.currentMode = preferredMode === 'text' ? 'text' : 'multimodal';
          this.callbacks.onConnect?.();
          this.startSession();

          // ALTERNATIVE APPROACH: Multi-step context injection without overrides
          console.log('🔄 Using alternative context preservation approach...');
          
          // Step 1: Wait for stable connection
          setTimeout(async () => {
            try {
              console.log('📡 Connection stabilized, checking conversation state...');
              
              if (!this.conversation) {
                console.warn('⚠️ Conversation not available for context injection');
                return;
              }

              // Step 2: Send lead information as user message first
              const leadInfoMessage = `Hi Jack, before we continue, here's my information: I'm ${this.leadData.customerName}, phone ${this.leadData.phoneNumber}, credit score ${this.leadData.creditScore || 'unknown'}, funding readiness: ${this.leadData.fundingReadiness}. My sentiment is ${this.leadData.sentiment} and preferred contact method is ${this.leadData.preferredContactMethod}.`;
              
              console.log('📤 Sending lead information as user message...');
              await this.conversation.sendUserMessage(leadInfoMessage);
              
              // Step 3: If resuming, send conversation history
              if (existingHistory.length > 0) {
                console.log('📤 Sending conversation history context...');
                
                // Wait a bit between messages to avoid rate limiting
                setTimeout(async () => {
                  try {
                    const recentContext = existingHistory.slice(-8).map(msg => 
                      `${msg.speaker === 'agent' ? 'Jack (you)' : msg.speaker === 'lead' ? this.leadData.customerName : 'System'}: "${msg.content}"`
                    ).join('\n');
                    
                    const historyMessage = `Also, just to remind you, here's our recent conversation history:\n\n${recentContext}\n\nLet's continue from where we left off. What were we discussing?`;
                    
                    await this.conversation.sendUserMessage(historyMessage);
                    console.log('✅ Context history sent successfully');
                  } catch (error) {
                    console.error('❌ Failed to send history context:', error);
                  }
                }, 1000);
              } else {
                // For new conversations, send a natural greeting
                setTimeout(async () => {
                  try {
                    const greetingMessage = `Hello! I'm looking for vehicle financing options and understand you can help me find the best solution for my situation.`;
                    await this.conversation.sendUserMessage(greetingMessage);
                    console.log('✅ Initial greeting sent for new conversation');
                  } catch (error) {
                    console.error('❌ Failed to send initial greeting:', error);
                  }
                }, 500);
              }
              
            } catch (error) {
              console.error('❌ Failed to send context messages:', error);
            }
          }, 1000); // Longer delay for connection stability
        },

        onDisconnect: () => {
          console.log('🔵 ElevenLabs conversation disconnected');
          this.state.isConnected = false;
          this.state.isCallActive = false;
          this.callbacks.onDisconnect?.();
          this.endSession();
        },

        onError: (error: any) => {
          console.error('❌ ElevenLabs conversation error:', error);
          this.state.error = error.message || 'Connection error';
          this.callbacks.onError?.(this.state.error);
        },

        onModeChange: (modeData: any) => {
          console.log('🔄 Mode changed:', modeData);
          // In multimodal, mode changes are automatic based on user input
          this.state.currentMode = modeData.mode === 'speaking' ? 'voice' : 'text';
          this.state.agentSpeaking = modeData.mode === 'speaking';
          this.callbacks.onModeChange?.(this.state.currentMode);
        },

        onMessage: (message: any) => {
          console.log('💬 Message received:', message);
          this.handleMessage(message);
        },

        onStatusChange: (statusData: { status: string }) => {
          console.log('📊 Status changed:', statusData);
          if (statusData.status === 'disconnected') {
            this.endSession('disconnected');
          }
        },

        // Voice-specific event handlers
        onUserTranscript: (transcript: any) => {
          console.log('🎤 User transcript:', transcript);
          this.handleUserMessage(transcript.text || transcript, 'voice');
          this.callbacks.onUserTranscript?.(transcript.text || transcript);
        },

        onAgentResponse: (response: any) => {
          console.log('🎙️ Agent response:', response);
          this.callbacks.onAgentResponse?.(response.text || response);
        }
      };

      console.log('⚙️ Conversation options prepared:');
      console.log('- Agent ID:', conversationOptions.agentId);
      console.log('- Text Only:', conversationOptions.textOnly);
      console.log('- Using user message context injection approach');

      // Initialize ElevenLabs Conversation
      console.log('🎯 Calling Conversation.startSession...');
      this.conversation = await Conversation.startSession(conversationOptions);

      console.log('✅ ElevenLabs conversation started successfully for lead:', this.leadData.leadId);
      
    } catch (error) {
      console.error('💥 Failed to start conversation:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      this.state.error = error instanceof Error ? error.message : 'Connection failed';
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
   * DEPRECATED: This was for phone calls, but ElevenLabs is browser-based
   * Renamed to match actual functionality
   */
  async initiateOutboundCall(): Promise<void> {
    console.log('⚠️ Note: This starts browser-based voice conversation, not a phone call');
    await this.startVoiceConversation();
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
}

export default SubprimeConversationManager; 