import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, 
  PhoneOff, 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  User,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  SubprimeConversationMessage, 
  ConversationState, 
  LeadContextData,
  SubprimeCallSession 
} from '@/types/elevenlabs';
import SubprimeConversationManager from '@/services/elevenLabsService';

interface ConversationInterfaceProps {
  leadData: LeadContextData;
  onLeadUpdate?: (leadId: string, updates: Partial<LeadContextData>) => void;
  className?: string;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  leadData,
  onLeadUpdate,
  className
}) => {
  // State management
  const [conversationManager, setConversationManager] = useState<SubprimeConversationManager | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>({
    isConnected: false,
    isCallActive: false,
    currentMode: 'multimodal',
    agentSpeaking: false,
    userSpeaking: false
  });
  const [messages, setMessages] = useState<SubprimeConversationMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<SubprimeCallSession | null>(null);
  const [textMessage, setTextMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [humanTakeoverMode, setHumanTakeoverMode] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation manager
  useEffect(() => {
    const initializeManager = async () => {
      try {
        console.log('🔧 Initializing conversation manager...');
        console.log('👤 Lead data:', leadData);
        
        const manager = new SubprimeConversationManager({
          config: {
            apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '', // Optional for public agents
            agentId: 'agent_01jwc5v1nafjwv7zw4vtz1050m'
          },
          leadData,
          callbacks: {
            onConnect: () => {
              console.log('📡 Callback: Connected');
              setConversationState(prev => ({ ...prev, isConnected: true }));
            },
            onDisconnect: () => {
              console.log('📡 Callback: Disconnected');
              setConversationState(prev => ({ 
                ...prev, 
                isConnected: false, 
                isCallActive: false 
              }));
            },
            onError: (error) => {
              console.error('📡 Callback: Error -', error);
              setConversationState(prev => ({ ...prev, error }));
            },
            onModeChange: (mode) => {
              console.log('📡 Callback: Mode changed to', mode);
              setConversationState(prev => ({ ...prev, currentMode: mode }));
            },
            onAgentResponse: (response) => {
              console.log('📡 Callback: Agent response -', response);
            },
            onUserTranscript: (transcript) => {
              console.log('📡 Callback: User transcript -', transcript);
            },
            onMessage: (message) => {
              console.log('📡 Callback: Message received -', message);
              setMessages(prev => {
                // Avoid duplicates - check if message already exists
                const exists = prev.some(m => m.id === message.id);
                if (exists) {
                  return prev;
                }
                return [...prev, message];
              });
              
              // Update lead conversation history
              onLeadUpdate?.(leadData.leadId, {
                lastContactDate: new Date().toISOString()
              });
            },
            onConversationEnd: (reason) => {
              console.log('📡 Callback: Conversation ended -', reason);
              setConversationState(prev => ({ 
                ...prev, 
                isConnected: false, 
                isCallActive: false 
              }));
            }
          }
        });

        console.log('✅ Conversation manager initialized successfully');
        setConversationManager(manager);
        
        // Load existing conversation history for display
        const existingHistory = manager.getConversationHistory();
        if (existingHistory.length > 0) {
          console.log(`📚 Loading ${existingHistory.length} existing messages for display`);
          setMessages(existingHistory);
        }
      } catch (error) {
        console.error('❌ Failed to initialize conversation manager:', error);
      }
    };

    initializeManager();
  }, [leadData.leadId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleStartVoiceConversation = async () => {
    if (!conversationManager) return;

    try {
      console.log('🎤 Starting/switching to voice conversation...');
      
      if (conversationState.isConnected) {
        // Already connected - ElevenLabs multimodal handles voice/text automatically
        console.log('✅ Already connected - voice input available in multimodal conversation');
      } else {
        // Start new multimodal conversation (which includes voice)
        await conversationManager.startConversation('multimodal');
        console.log('✅ Multimodal conversation started (voice + text)');
      }
      
      setConversationState(prev => ({ 
        ...prev, 
        isConnected: true,
        isCallActive: true, 
        currentMode: 'voice' 
      }));
    } catch (error) {
      console.error('❌ Failed to start/switch to voice conversation:', error);
      alert(`Failed to start voice conversation: ${error.message}`);
    }  
  };

  const handleStartTextConversation = async () => {
    if (!conversationManager) return;

    try {
      console.log('💬 Starting/switching to text conversation...');
      
      if (conversationState.isConnected) {
        // End current conversation and start text-only
        await conversationManager.endConversation();
        await conversationManager.startConversation('text');
        console.log('✅ Switched to text-only conversation');
      } else {
        // Start new text-only conversation
        await conversationManager.startConversation('text');
        console.log('✅ Text-only conversation started');
      }
      
      setConversationState(prev => ({ 
        ...prev, 
        isConnected: true, 
        currentMode: 'text' 
      }));
    } catch (error) {
      console.error('❌ Failed to start/switch to text conversation:', error);
      alert(`Failed to start conversation: ${error.message}`);
    }
  };

  const handleStartMultimodalConversation = async () => {
    if (!conversationManager) return;

    try {
      console.log('🎬 Starting/switching to multimodal conversation...');
      
      if (conversationState.isConnected) {
        // Already connected - ElevenLabs is already multimodal
        console.log('✅ Already connected - conversation is already multimodal');
      } else {
        // Request microphone permission first for voice capability
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('✅ Microphone permission granted');
        } catch (permissionError) {
          console.warn('⚠️ Microphone permission denied, falling back to text-only:', permissionError);
        }
        
        // Start new multimodal conversation
        await conversationManager.startConversation('multimodal');
        console.log('✅ Multimodal conversation started successfully');
      }
      
      setConversationState(prev => ({ 
        ...prev, 
        isConnected: true, 
        currentMode: 'multimodal' 
      }));
    } catch (error) {
      console.error('❌ Failed to start/switch to multimodal conversation:', error);
      alert(`Failed to start conversation: ${error.message}`);
    }
  };

  const handleEndConversation = async () => {
    if (!conversationManager) return;

    try {
      await conversationManager.endConversation();
      setConversationState(prev => ({ 
        ...prev, 
        isCallActive: false,
        isConnected: false 
      }));
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  const handleSendTextMessage = async () => {
    if (!conversationManager || !textMessage.trim()) return;

    try {
      await conversationManager.sendTextMessage(textMessage);
      setTextMessage('');
    } catch (error) {
      console.error('Failed to send text message:', error);
    }
  };

  const handleTransferToHuman = async () => {
    if (!conversationManager) return;

    try {
      await conversationManager.transferToHuman('User requested human assistance');
      setHumanTakeoverMode(true);
    } catch (error) {
      console.error('Failed to transfer to human:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!conversationManager) return;

    try {
      await conversationManager.testConnection();
      console.log('✅ Connection test successful');
      alert('Connection test successful');
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      alert(`Connection test failed: ${error.message}`);
    }
  };

  const handleClearConversation = async () => {
    if (!conversationManager) return;

    const confirmed = window.confirm(
      'Are you sure you want to clear this conversation? This will delete all chat history and cannot be undone.'
    );

    if (confirmed) {
      try {
        // Clear the conversation history
        conversationManager.clearConversationHistory();
        setMessages([]);
        console.log('🗑️ Conversation history cleared');

        // End current conversation if active
        if (conversationState.isConnected) {
          await conversationManager.endConversation();
          setConversationState(prev => ({ 
            ...prev, 
            isConnected: false, 
            isCallActive: false 
          }));
        }

        alert('Conversation cleared successfully');
      } catch (error) {
        console.error('❌ Failed to clear conversation:', error);
        alert(`Failed to clear conversation: ${error.message}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'Partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Not Ready': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '😊';
      case 'Neutral': return '😐';
      case 'Negative': return '😕';
      case 'Frustrated': return '😤';
      case 'Ghosted': return '👻';
      default: return '🤔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: SubprimeConversationMessage) => {
    const isAgent = message.speaker === 'agent';
    const isSystem = message.speaker === 'system';
    const isVoice = message.mode === 'voice' || message.type.includes('voice');

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 p-3 rounded-lg',
          isAgent && 'bg-blue-50 border border-blue-100',
          !isAgent && !isSystem && 'bg-gray-50 border border-gray-100',
          isSystem && 'bg-yellow-50 border border-yellow-100'
        )}
      >
        <Avatar className="w-8 h-8">
          <AvatarFallback className={cn(
            'text-xs',
            isAgent && 'bg-blue-100 text-blue-700',
            !isAgent && !isSystem && 'bg-gray-100 text-gray-700',
            isSystem && 'bg-yellow-100 text-yellow-700'
          )}>
            {isAgent ? 'AI' : isSystem ? 'SYS' : leadData.customerName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isAgent ? 'Jack (AI Agent)' : isSystem ? 'System' : leadData.customerName}
            </span>
            <Badge variant="outline" className="text-xs">
              {isVoice ? (
                <><Mic className="w-3 h-3 mr-1" /> Voice</>
              ) : (
                <><MessageSquare className="w-3 h-3 mr-1" /> Text</>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('flex flex-col', className)} style={{ height: '600px', maxHeight: '80vh' }}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversation with {leadData.customerName}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(leadData.fundingReadiness)}>
              {leadData.fundingReadiness}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getSentimentIcon(leadData.sentiment)} {leadData.sentiment}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Phone className="w-4 h-4" />
            {leadData.phoneNumber}
          </div>
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {leadData.specialist || 'Unassigned'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {leadData.scriptProgress?.currentStep || 'Unknown'}
          </div>
        </div>

        <Separator />

        {/* Conversation Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!conversationState.isConnected ? (
            <>
              <Button
                onClick={handleStartMultimodalConversation}
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Conversation
              </Button>
              <Button
                onClick={handleStartVoiceConversation}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Voice Only
              </Button>
              <Button
                onClick={handleStartTextConversation}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Text Only
              </Button>
              <Button
                onClick={handleTestConnection}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Test Connection
              </Button>
              
              {messages.length > 0 && (
                <Button
                  onClick={handleClearConversation}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat
                </Button>
              )}
            </>
              ) : (
            <>
                <Button
                onClick={handleEndConversation}
                variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                <Square className="w-4 h-4" />
                End Conversation
                </Button>

              <Button
                onClick={handleTransferToHuman}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Transfer to Human
              </Button>

              <Button
                onClick={handleClearConversation}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Clear Chat
              </Button>
            </>
          )}

          {/* Status Indicators */}
          <div className="flex items-center gap-2 ml-auto">
            {conversationState.isConnected && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </div>
            )}
            {conversationState.currentMode === 'multimodal' && conversationState.isConnected && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Mic className="w-3 h-3" />
                <MessageSquare className="w-3 h-3" />
                Voice + Text
              </div>
            )}
            {conversationState.currentMode === 'voice' && conversationState.isConnected && (
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <Mic className="w-3 h-3" />
                Voice Only
              </div>
            )}
            {conversationState.currentMode === 'text' && conversationState.isConnected && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MessageSquare className="w-3 h-3" />
                Text Only
              </div>
            )}
            {conversationState.agentSpeaking && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Volume2 className="w-3 h-3" />
                Agent Speaking
              </div>
            )}
            {humanTakeoverMode && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertTriangle className="w-3 h-3" />
                Human Agent
              </div>
            )}
          </div>
        </div>

        {/* Mode Explanation */}
        {conversationState.isConnected && (
          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
            {conversationState.currentMode === 'multimodal' && (
              <>💡 <strong>Multimodal:</strong> You can speak (using your microphone) or type messages. The AI will respond accordingly. Context is preserved across modes.</>
            )}
            {conversationState.currentMode === 'voice' && (
              <>🎤 <strong>Voice Mode:</strong> Click to speak using your microphone. The AI will respond with voice. Switch back to text anytime - conversation continues seamlessly.</>
            )}
            {conversationState.currentMode === 'text' && (
              <>💬 <strong>Text Mode:</strong> Type messages below. The AI will respond with text. Switch to voice anytime - conversation history is maintained.</>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" style={{ minHeight: 0 }}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No conversation yet. Start a conversation to begin.</p>
                <p className="text-sm mt-2">
                  Choose <strong>Start Conversation</strong> for voice + text, or select a specific mode.
                </p>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Text Input Area */}
        {conversationState.isConnected && conversationState.currentMode !== 'voice' && (
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                ref={textInputRef}
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                placeholder={
                  conversationState.currentMode === 'multimodal' 
                    ? "Type a message or use your microphone..." 
                    : "Type your message..."
                }
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTextMessage();
                  }
                }}
                disabled={humanTakeoverMode}
              />
              <Button
                onClick={handleSendTextMessage}
                disabled={!textMessage.trim() || humanTakeoverMode}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {humanTakeoverMode && (
              <p className="text-xs text-orange-600 mt-2">
                Conversation has been transferred to a human agent. AI responses are paused.
              </p>
            )}
          </div>
        )}

        {/* Voice-only mode instructions */}
        {conversationState.isConnected && conversationState.currentMode === 'voice' && (
          <div className="border-t p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mic className="w-4 h-4" />
              <p>Voice conversation active. Speak using your microphone.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationInterface; 