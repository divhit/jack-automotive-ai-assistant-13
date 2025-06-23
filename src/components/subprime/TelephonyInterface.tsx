import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMessage {
  id: string;
  type: 'sms' | 'call' | 'system' | 'voice';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system';
  status?: 'sent' | 'delivered' | 'failed';
}

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
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Load conversation history when lead changes
  useEffect(() => {
    if (selectedLead) {
      loadConversationHistory();
      setupEventSource();
    } else {
      setConversationHistory([]);
      closeEventSource();
    }
    
    return () => {
      closeEventSource();
    };
  }, [selectedLead]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive) {
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
  }, [isCallActive]);

  // Setup Server-Sent Events for real-time conversation updates
  const setupEventSource = () => {
    if (!selectedLead) return;
    
    closeEventSource(); // Close existing connection
    
    // Use Supabase edge function for streaming
    const eventSource = new EventSource(
      `https://krpzyvpwtbdxjaemqjab.supabase.co/functions/v1/conversation-stream/${selectedLead.id}`
    );
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('📡 SSE connection established for lead:', selectedLead.id);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealTimeUpdate(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (selectedLead) {
          setupEventSource();
        }
      }, 5000);
    };
  };

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const handleRealTimeUpdate = (data: any) => {
    console.log('📡 Real-time update received:', data);
    
    switch (data.type) {
      case 'connected':
        console.log('Connected to real-time stream for lead:', data.leadId);
        break;
        
      case 'sms_received':
        addConversationMessage({
          id: `sms-${data.messageSid || Date.now()}`,
          type: 'sms',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'user',
          status: 'delivered'
        });
        break;
        
      case 'sms_sent':
        addConversationMessage({
          id: `sms-${data.messageSid || Date.now()}`,
          type: 'sms',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'agent',
          status: 'sent'
        });
        break;
        
      case 'call_initiated':
        setConversationId(data.conversationId);
        setIsCallActive(true);
        setCurrentMode('voice');
        addConversationMessage({
          id: `call-${Date.now()}`,
          type: 'system',
          content: `Voice call initiated`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'call_ended':
        setIsCallActive(false);
        setCurrentMode('text');
        addConversationMessage({
          id: `call-end-${Date.now()}`,
          type: 'system',
          content: `Call ended. Duration: ${formatDuration(data.duration || 0)}`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;

      case 'voice_received':
        addConversationMessage({
          id: `voice-${data.conversationId}-${Date.now()}`,
          type: 'voice',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'user',
          status: 'delivered'
        });
        break;
        
      case 'voice_sent':
        addConversationMessage({
          id: `voice-${data.conversationId}-${Date.now()}`,
          type: 'voice',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'agent',
          status: 'delivered'
        });
        break;
        
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  };

  const addConversationMessage = (message: ConversationMessage) => {
    setConversationHistory(prev => {
      // Avoid duplicates by checking if message with same ID already exists
      const exists = prev.some(msg => msg.id === message.id);
      if (exists) return prev;
      
      return [...prev, message];
    });
  };

  const loadConversationHistory = async () => {
    if (!selectedLead) return;

    try {
      // Load recent messages for this lead from Supabase
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          messages (
            id,
            speaker,
            content,
            message_type,
            timestamp,
            twilio_message_sid
          )
        `)
        .eq('lead_id', selectedLead.id)
        .order('started_at', { ascending: false })
        .limit(5);

      if (convError) {
        console.error('Failed to load conversation history:', convError);
        return;
      }

      // Convert database messages to ConversationMessage format
      const messages: ConversationMessage[] = [];
      conversations?.forEach(conv => {
        conv.messages?.forEach((msg: any) => {
          messages.push({
            id: msg.id,
            type: msg.message_type === 'voice' ? 'voice' : (conv.type === 'sms' ? 'sms' : 'system'),
            content: msg.content,
            timestamp: msg.timestamp,
            sentBy: msg.speaker,
            status: 'delivered'
          });
        });
      });

      // Sort by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setConversationHistory(messages);

    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const handleStartVoiceCall = async () => {
    if (!selectedLead) return;

    try {
      setIsLoading(true);
      setError(null);

      // Call Supabase edge function for outbound call
      const { data, error } = await supabase.functions.invoke('elevenlabs-outbound-call', {
        body: {
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store conversation ID for context switching
      setConversationId(data.conversationId);
      
      toast.success(`Call initiated to ${selectedLead.phoneNumber}`);
      console.log('Call initiated:', data);

    } catch (error: any) {
      console.error('Error starting call:', error);
      setError(error.message || 'Failed to start call. Please try again.');
      toast.error(error.message || 'Failed to start call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    setIsCallActive(false);
    setCurrentMode('text');
    
    toast.info(`Call ended. Duration: ${formatDuration(callDuration)}`);
  };

  const handleSendTextMessage = async () => {
    if (!selectedLead || !textInput.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const messageToSend = textInput;
      setTextInput('');

      // Call Supabase edge function for SMS
      const { data, error } = await supabase.functions.invoke('twilio-send-sms', {
        body: {
          to: selectedLead.phoneNumber,
          message: messageToSend,
          leadId: selectedLead.id
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`SMS sent to ${selectedLead.phoneNumber}`);
      console.log('SMS sent:', data);

      // Update lead's last touchpoint
      if (onLeadUpdate) {
        onLeadUpdate(selectedLead.id, {
          lastTouchpoint: new Date().toISOString(),
          conversations: [
            ...selectedLead.conversations,
            {
              type: 'message',
              content: messageToSend,
              timestamp: new Date().toISOString(),
              sentBy: 'agent'
            }
          ]
        });
      }

    } catch (error: any) {
      console.error('Error sending SMS:', error);
      setError(error.message || 'Failed to send SMS. Please try again.');
      toast.error(error.message || 'Failed to send SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600';
      case 'sent': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
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
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a lead to start telephony interaction</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Telephony - {selectedLead.customerName}
          </CardTitle>
          <Badge variant={currentMode === 'voice' ? 'default' : 'secondary'}>
            {currentMode === 'voice' ? 'Voice Active' : 'Text Mode'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedLead.phoneNumber}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Sentiment: {selectedLead.sentiment}</span>
          {isCallActive && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Voice Controls */}
        <div className="flex gap-2">
          {!isCallActive ? (
            <Button 
              onClick={handleStartVoiceCall}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              Start Voice Call
            </Button>
          ) : (
            <Button 
              onClick={handleEndCall}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={() => setCurrentMode(currentMode === 'voice' ? 'text' : 'voice')}
            disabled={isCallActive}
          >
            {currentMode === 'voice' ? (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Switch to Text
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                Switch to Voice
              </>
            )}
          </Button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 border rounded-lg">
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              {conversationHistory.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.sentBy === 'agent' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-2 max-w-[80%]",
                      message.sentBy === 'agent' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {message.sentBy === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : message.sentBy === 'agent' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <Settings className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        message.sentBy === 'agent'
                          ? "bg-blue-500 text-white"
                          : message.sentBy === 'user'
                          ? "bg-gray-100 text-gray-900"
                          : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                      )}
                    >
                      <p>{message.content}</p>
                      <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                        <span>{formatMessageTime(message.timestamp)}</span>
                        {message.status && (
                          <span className={getStatusColor(message.status)}>
                            {message.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        </div>

        {/* Text Input */}
        <div className="flex gap-2">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendTextMessage();
              }
            }}
          />
          <Button 
            onClick={handleSendTextMessage}
            disabled={isLoading || !textInput.trim()}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Lead Info */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <div>Status: {selectedLead.chaseStatus}</div>
            <div>Funding: {selectedLead.fundingReadiness}</div>
            <div>Step: {selectedLead.scriptProgress.currentStep}</div>
            <div>Specialist: {selectedLead.assignedSpecialist || 'Unassigned'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelephonyInterface;
