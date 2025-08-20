// ElevenLabs Conversational AI Types for Subprime Lead Management

export interface ElevenLabsConfig {
  apiKey: string;
  agentId: string;
  baseUrl?: string;
}

export interface SubprimeConversationMessage {
  id: string;
  leadId: string;
  type: 'voice_input' | 'voice_output' | 'text_input' | 'text_output' | 'system' | 'human_intervention';
  content: string;
  timestamp: string;
  speaker: 'lead' | 'agent' | 'human_agent' | 'system';
  mode: 'voice' | 'text';
  metadata?: {
    conversationId?: string;
    eventId?: string;
    audioUrl?: string;
    transcriptConfidence?: number;
    sentiment?: string;
    agentSpecialist?: string;
    duration?: number;
    smsId?: string;
    callSid?: string;
    smsReceived?: boolean;
    smsSent?: boolean;
  };
}

export interface SubprimeCallSession {
  id: string;
  leadId: string;
  conversationId: string;
  status: 'initiated' | 'connected' | 'active' | 'ended' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  mode: 'voice_only' | 'text_only' | 'multimodal';
  messages: SubprimeConversationMessage[];
  metadata: {
    phoneNumber?: string;
    callDirection: 'inbound' | 'outbound';
    endReason?: 'completed' | 'hangup' | 'error' | 'transferred';
    audioRecordingUrl?: string;
    qualityScore?: number;
  };
}

export interface ConversationState {
  isConnected: boolean;
  isCallActive: boolean;
  currentMode: 'voice' | 'text' | 'multimodal';
  agentSpeaking: boolean;
  userSpeaking: boolean;
  conversationId?: string;
  sessionId?: string;
  error?: string;
}

export interface LeadContextData {
  leadId: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  creditScore?: number;
  fundingReadiness: 'Ready' | 'Partial' | 'Not Ready';
  scriptProgress: {
    currentStep: string;
    completedSteps: string[];
    nextStep: string;
  };
  chaseStatus: string;
  sentiment: string;
  specialist?: string;
  agentPhone?: string; // Agent phone number for human transfers
  agentName?: string; // Agent name for human transfers
  conversationHistory: SubprimeConversationMessage[];
  lastContactDate?: string;
  preferredContactMethod: 'voice' | 'text' | 'either';
}

export interface ConversationToolsConfig {
  // Server tools for CRM integration
  updateLeadStatus: {
    enabled: boolean;
    endpoint: string;
  };
  scheduleFollowUp: {
    enabled: boolean;
    endpoint: string;
  };
  transferToHuman: {
    enabled: boolean;
    endpoint: string;
  };
  // Client tools for UI updates
  updateConversationUI: {
    enabled: boolean;
  };
  showLeadInfo: {
    enabled: boolean;
  };
}

export interface AgentOverrides {
  firstMessage?: string;
  systemPrompt?: string;
  voice?: {
    voiceId: string;
    stability?: number;
    similarityBoost?: number;
  };
  llmModel?: string;
  context?: LeadContextData;
}

export interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onModeChange?: (mode: 'voice' | 'text') => void;
  onAgentResponse?: (response: string) => void;
  onUserTranscript?: (transcript: string) => void;
  onConversationEnd?: (reason: string) => void;
  onMessage?: (message: SubprimeConversationMessage) => void;
}

export interface ElevenLabsClientTools {
  updateConversationUI: (data: { 
    leadId: string; 
    message: SubprimeConversationMessage 
  }) => void;
  showLeadInfo: (data: { leadId: string }) => void;
  notifyHumanAgent: (data: { 
    leadId: string; 
    reason: string; 
    urgency: 'low' | 'medium' | 'high' 
  }) => void;
}

export interface SubprimeConversationManagerOptions {
  config: ElevenLabsConfig;
  leadData: LeadContextData;
  callbacks?: ConversationCallbacks;
  tools?: ConversationToolsConfig;
  overrides?: AgentOverrides;
}

export interface ConversationAnalytics {
  totalDuration: number;
  voiceToTextRatio: number;
  sentimentTrend: Array<{ timestamp: string; sentiment: string }>;
  interruptionCount: number;
  responseTime: number;
  engagementScore: number;
  conversionLikelihood: number;
}

// Authentication types
export interface SignedUrlResponse {
  signed_url: string;
  conversation_id?: string;
  expires_at: string;
}

export interface AuthenticationConfig {
  requiresAuth: boolean;
  allowlist?: string[];
  signedUrlEndpoint?: string;
}

// Twilio integration types
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl: string;
}

export interface OutboundCallRequest {
  leadId: string;
  phoneNumber: string;
  agentOverrides?: AgentOverrides;
  scheduledTime?: string;
}

export interface CallStatusUpdate {
  callSid: string;
  status: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  duration?: number;
  recordingUrl?: string;
}

export interface TwilioCallData {
  callSid: string;
  from: string;
  to: string;
  status: string;
  direction: 'inbound' | 'outbound';
  startTime?: string;
  endTime?: string;
  duration?: number;
  recordingUrl?: string;
  conversationId?: string;
}

// Knowledge base types for lead-specific context
export interface LeadKnowledgeBase {
  leadProfile: {
    demographics: Record<string, any>;
    creditHistory: Record<string, any>;
    vehiclePreferences: Record<string, any>;
    communicationHistory: SubprimeConversationMessage[];
  };
  dealershipInfo: {
    inventory: any[];
    financingOptions: any[];
    specialPrograms: any[];
  };
  complianceRequirements: {
    tcpaConsent: boolean;
    stateRegulations: string[];
    disclosuresMade: string[];
  };
}

export interface ConversationEvent {
  type: 'conversation_started' | 'conversation_ended' | 'mode_changed' | 'message_received' | 'error_occurred';
  data: any;
  timestamp: string;
  leadId: string;
  conversationId?: string;
} 