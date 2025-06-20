// Enhanced Telephony Interface for Subprime Dashboard
// Uses existing ElevenLabs Conversational AI service with agent_01jwc5v1nafjwv7zw4vtz1050m

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  Phone, 
  PhoneOff, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Clock,
  User,
  Bot,
  Send,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Calendar,
  Settings,
  PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { 
  SubprimeConversationMessage, 
  ConversationAnalytics,
  ElevenLabsConfig,
  LeadContextData,
  SubprimeConversationManagerOptions,
  ConversationState
} from '@/types/elevenlabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import your existing ElevenLabs service
const SubprimeConversationManager = (await import('@/services/elevenLabsService')).default;

interface TelephonyInterfaceProps {
  selectedLead: SubprimeLead | null;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
  className?: string;
}

export const TelephonyInterface: React.FC<TelephonyInterfaceProps> = ({
  selectedLead,
  onLeadUpdate,
  className
}) => {
  // State management
  const [conversationManager, setConversationManager] = useState<any>(null);
  const [conversationState, setConversationState] = useState<ConversationState>({
    isConnected: false,
    isCallActive: false,
    currentMode: 'text',
    agentSpeaking: false,
    userSpeaking: false
  });
  const [conversationHistory, setConversationHistory] = useState<SubprimeConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize conversation manager when lead changes
  useEffect(() => {
    if (selectedLead) {
      initializeConversationManager();
    } else {
      cleanupConversationManager();
    }

    return () => {
      cleanupConversationManager();
    };
  }, [selectedLead]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Call duration timer
  useEffect(() => {
    if (conversationState.isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [conversationState.isCallActive]);

  const initializeConversationManager = async () => {
    if (!selectedLead) return;

    try {
      setIsLoading(true);
      setError(null);

             // Convert SubprimeLead to LeadContextData
       const leadData: LeadContextData = {
         leadId: selectedLead.id,
         customerName: selectedLead.customerName,
         phoneNumber: selectedLead.phoneNumber,
         email: selectedLead.email,
         creditScore: selectedLead.creditProfile?.scoreRange ? 
           parseInt(selectedLead.creditProfile.scoreRange.split('-')[0]) : undefined,
         fundingReadiness: selectedLead.fundingReadiness,
         scriptProgress: {
           ...selectedLead.scriptProgress,
           nextStep: selectedLead.nextAction.type
         },
         chaseStatus: selectedLead.chaseStatus,
         sentiment: selectedLead.sentiment,
         specialist: selectedLead.assignedSpecialist,
         conversationHistory: [],
         lastContactDate: selectedLead.lastTouchpoint,
         preferredContactMethod: 'either' // Default since not in SubprimeLead
       };

      // ElevenLabs configuration with your existing agent
      const config: ElevenLabsConfig = {
        apiKey: process.env.REACT_APP_ELEVENLABS_API_KEY || '',
        agentId: 'agent_01jwc5v1nafjwv7zw4vtz1050m' // Your existing agent
      };

      // Conversation manager options
      const options: SubprimeConversationManagerOptions = {
        config,
        leadData,
        callbacks: {
          onConnect: () => {
            setConversationState(prev => ({ ...prev, isConnected: true }));
            setError(null);
          },
          onDisconnect: () => {
            setConversationState(prev => ({ 
              ...prev, 
              isConnected: false, 
              isCallActive: false,
              currentMode: 'text'
            }));
          },
          onError: (errorMessage: string) => {
            setError(errorMessage);
            setConversationState(prev => ({ 
              ...prev, 
              isConnected: false, 
              isCallActive: false 
            }));
          },
          onModeChange: (mode: 'voice' | 'text') => {
            setConversationState(prev => ({ ...prev, currentMode: mode }));
          },
          onMessage: (message: SubprimeConversationMessage) => {
            setConversationHistory(prev => [...prev, message]);
          },
          onAgentResponse: (response: string) => {
            console.log('Agent response:', response);
          },
          onUserTranscript: (transcript: string) => {
            console.log('User transcript:', transcript);
          }
        }
      };

      // Create conversation manager instance
      const manager = new SubprimeConversationManager(options);
      setConversationManager(manager);

      // Load existing conversation history
      const history = manager.getConversationHistory();
      setConversationHistory(history);

      // Set up real-time SMS streaming
      manager.setupRealtimeStreaming();

      console.log('✅ Conversation manager initialized for lead:', selectedLead.customerName);
      
    } catch (error) {
      console.error('❌ Failed to initialize conversation manager:', error);
      setError('Failed to initialize conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupConversationManager = () => {
    if (conversationManager) {
      conversationManager.endConversation().catch(console.error);
      setConversationManager(null);
    }
    setConversationState({
      isConnected: false,
      isCallActive: false,
      currentMode: 'text',
      agentSpeaking: false,
      userSpeaking: false
    });
    setConversationHistory([]);
    setError(null);
  };

  const handleStartVoiceCall = async () => {
    if (!conversationManager) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Use your existing agent to initiate outbound call
      await conversationManager.initiateOutboundCall();
      
      setConversationState(prev => ({ 
        ...prev, 
        isCallActive: true, 
        currentMode: 'voice' 
      }));
      
    } catch (error) {
      console.error('❌ Failed to start voice call:', error);
      setError('Failed to start voice call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!conversationManager) return;

    try {
      await conversationManager.endConversation();
      setConversationState(prev => ({ 
        ...prev, 
        isCallActive: false, 
        currentMode: 'text' 
      }));
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      setError('Failed to end call properly.');
    }
  };

  const handleSendTextMessage = async () => {
    if (!conversationManager || !textInput.trim()) return;

    try {
      setError(null);
      
      // Switch to text mode if needed
      if (conversationState.currentMode !== 'text') {
        await conversationManager.switchMode('text');
      }
      
      // Start conversation if not already started
      if (!conversationState.isConnected) {
        await conversationManager.startConversation('text');
      }
      
      // Send the message
      await conversationManager.sendTextMessage(textInput);
      setTextInput('');
      
    } catch (error) {
      console.error('❌ Failed to send text message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleStartVoiceConversation = async () => {
    if (!conversationManager) return;

    try {
      setIsLoading(true);
      setError(null);
      
      await conversationManager.startVoiceConversation();
      
      setConversationState(prev => ({ 
        ...prev, 
        isConnected: true, 
        currentMode: 'voice' 
      }));
      
    } catch (error) {
      console.error('❌ Failed to start voice conversation:', error);
      setError('Failed to start voice conversation. Please check microphone permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferToHuman = async () => {
    if (!conversationManager) return;

    try {
      await conversationManager.transferToHuman('User requested human assistance');
      
             // Update lead status
       onLeadUpdate?.(selectedLead!.id, {
         chaseStatus: 'Manual Review',
         assignedSpecialist: 'Andrea'
       });
      
    } catch (error) {
      console.error('❌ Failed to transfer to human:', error);
      setError('Failed to transfer to human agent.');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!selectedLead) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Telephony Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Select a lead to start a conversation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Telephony Interface
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLead.customerName} • {selectedLead.phoneNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={conversationState.isConnected ? "default" : "secondary"}
                className={cn(
                  "flex items-center gap-1",
                  conversationState.isConnected && "bg-green-500"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  conversationState.isConnected ? "bg-white" : "bg-gray-400"
                )} />
                {conversationState.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {conversationState.isCallActive && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(callDuration)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Voice Call Controls */}
            <Button
              onClick={conversationState.isCallActive ? handleEndCall : handleStartVoiceCall}
              disabled={isLoading}
              variant={conversationState.isCallActive ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {conversationState.isCallActive ? (
                <>
                  <PhoneOff className="h-4 w-4" />
                  End Call
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Start Call
                </>
              )}
            </Button>

            {/* Voice Conversation (Browser) */}
            <Button
              onClick={handleStartVoiceConversation}
              disabled={isLoading || conversationState.isConnected}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              Voice Chat
            </Button>

            {/* Transfer to Human */}
            <Button
              onClick={handleTransferToHuman}
              disabled={isLoading || !conversationState.isConnected}
              variant="outline"
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Transfer to Human
            </Button>

            {/* Mode Indicator */}
            <Badge variant="outline" className="ml-auto">
              Mode: {conversationState.currentMode}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversation History
            <Badge variant="secondary" className="ml-auto">
              {conversationHistory.length} messages
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {conversationHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversation history yet</p>
                  <p className="text-sm">Start a conversation to see messages here</p>
                </div>
              ) : (
                conversationHistory.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg",
                      message.speaker === 'agent' 
                        ? "bg-blue-50 dark:bg-blue-950/30" 
                        : "bg-gray-50 dark:bg-gray-800/50"
                    )}
                  >
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback>
                        {message.speaker === 'agent' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.speaker === 'agent' ? 'Sarah (Agent)' : selectedLead.customerName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {message.mode}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Text Input */}
          <Separator />
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTextMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendTextMessage}
                disabled={isLoading || !textInput.trim()}
                size="sm"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send • Using ElevenLabs Agent: agent_01jwc5v1nafjwv7zw4vtz1050m
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelephonyInterface; 