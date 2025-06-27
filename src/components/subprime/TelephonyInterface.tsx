// Enhanced Telephony Interface for Subprime Dashboard
// Uses the working API endpoints we just tested

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  }, [selectedLead?.id]); // Use selectedLead.id for better dependency tracking

  // Call duration timer with automatic call end detection
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-end call if it's been active for more than 30 minutes without proper end event
          // This is a safety fallback for calls that don't properly end via webhooks
          if (newDuration > 1800) { // 30 minutes
            console.log('⚠️ Call automatically ended due to timeout (30+ minutes)');
            setIsCallActive(false);
            setCurrentMode('text');
            setConversationId(null);
            addConversationMessage({
              id: `timeout-end-${Date.now()}`,
              type: 'system',
              content: `Call automatically ended due to timeout. Duration: ${formatDuration(newDuration)}`,
              timestamp: new Date().toISOString(),
              sentBy: 'system'
            });
            toast.warning('Call automatically ended due to timeout');
            return 0;
          }
          
          return newDuration;
        });
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
    
    // Include phone number in query params for proper lead-to-phone mapping
    const eventSource = new EventSource(`/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('📡 SSE connection established for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ')');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 SSE message received:', data.type, data);
        handleRealTimeUpdate(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error for lead:', selectedLead.id, error);
      // Attempt to reconnect after a delay if still have a selected lead
      setTimeout(() => {
        if (selectedLead && selectedLead.id) {
          console.log('📡 Attempting SSE reconnection for lead:', selectedLead.id);
          setupEventSource();
        }
      }, 3000);
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
          status: data.status === 'queued' ? 'sent' : 'delivered'
        });
        break;
        
      case 'call_initiated':
        setConversationId(data.conversationId);
        setIsCallActive(true);
        setCurrentMode('voice');
        addConversationMessage({
          id: `call-${Date.now()}`,
          type: 'system',
          content: `Voice call initiated to ${data.phoneNumber}`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'call_ended':
        console.log('📞 Call ended event received:', data);
        setIsCallActive(false);
        setCurrentMode('text');
        setConversationId(null);
        addConversationMessage({
          id: `call-end-${Date.now()}`,
          type: 'system',
          content: `Call ended${data.reason ? ` (${data.reason})` : ''}. Duration: ${formatDuration(data.duration || 0)}`,
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
        
      case 'conversation_started':
        setConversationId(data.conversationId);
        setIsCallActive(true);
        setCurrentMode('voice');
        addConversationMessage({
          id: `conv-start-${Date.now()}`,
          type: 'system',
          content: `Voice conversation started`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'conversation_ended':
        console.log('🎙️ Voice conversation ended event received:', data);
        setIsCallActive(false);
        setCurrentMode('text');
        setConversationId(null);
        addConversationMessage({
          id: `conv-end-${Date.now()}`,
          type: 'system',
          content: `Voice conversation ended. Duration: ${formatDuration((data.duration || 0) / 1000)}`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'post_call_summary':
        addConversationMessage({
          id: `summary-${data.conversationId}-${Date.now()}`,
          type: 'system',
          content: `Call Summary: ${data.summary || 'No summary available'}`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'heartbeat':
        // Keep connection alive, no UI update needed
        break;
        
      default:
        console.log('Unknown real-time update type:', data.type, data);
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
      // Load existing conversation history from server
      const response = await fetch(`/api/conversation-history/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Convert server messages to our ConversationMessage format
        const messages: ConversationMessage[] = (data.messages || []).map((msg: any, index: number) => ({
          id: msg.id || `history-${index}-${Date.now()}`,
          type: msg.type || 'sms',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          sentBy: msg.sentBy || (msg.direction === 'inbound' ? 'user' : 'agent'),
          status: msg.status || 'delivered'
        }));
        
        setConversationHistory(messages);
        console.log(`📋 Loaded ${messages.length} historical messages for ${selectedLead.phoneNumber}`);
      } else {
        // If no history endpoint exists, start with empty history
        setConversationHistory([]);
        console.log('📋 No conversation history available, starting fresh');
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Fall back to empty history if loading fails
      setConversationHistory([]);
    }
  };

  const handleStartVoiceCall = async () => {
    if (!selectedLead) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/elevenlabs/outbound-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate call');
      }

      const result = await response.json();
      
      // Store conversation ID for context switching
      setConversationId(result.conversationId || result.callSid);
      
      toast.success(`Call initiated to ${selectedLead.phoneNumber}`);
      console.log('Call initiated:', { 
        callSid: result.callSid, 
        conversationId: result.conversationId 
      });

    } catch (error) {
      console.error('Error starting call:', error);
      setError(error.message || 'Failed to start call. Please try again.');
      toast.error(error.message || 'Failed to start call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    console.log('📞 Manual call end triggered');
    setIsCallActive(false);
    setCurrentMode('text');
    setConversationId(null);
    
    // Add a system message to show the call was manually ended
    addConversationMessage({
      id: `manual-end-${Date.now()}`,
      type: 'system',
      content: `Call manually ended by agent. Duration: ${formatDuration(callDuration)}`,
      timestamp: new Date().toISOString(),
      sentBy: 'system'
    });
    
    toast.info(`Call ended. Duration: ${formatDuration(callDuration)}`);
  };

  const handleSendTextMessage = async () => {
    if (!selectedLead || !textInput.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const messageToSend = textInput;
      setTextInput('');

      const response = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedLead.phoneNumber,
          message: messageToSend,
          leadId: selectedLead.id,
          agentId: 'telephony-interface'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send SMS');
      }

      const result = await response.json();
      toast.success(`SMS sent to ${selectedLead.phoneNumber}`);
      console.log('✅ SMS sent successfully - message will appear via SSE stream');

    } catch (error) {
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
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a lead to start telephony interaction</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col relative", className)}>
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b bg-white p-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Telephony - {selectedLead.customerName}</h3>
          </div>
          <Badge variant={currentMode === 'voice' ? 'default' : 'secondary'}>
            {currentMode === 'voice' ? 'Voice Active' : 'Text Mode'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
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
      </div>

      {/* Floating Voice Call Button - Fixed to Container */}
      <div className="absolute top-4 right-4 z-50">
        {!isCallActive ? (
          <Button 
            onClick={handleStartVoiceCall}
            disabled={isLoading}
            size="sm"
            className="shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PhoneCall className="h-4 w-4 mr-1" />
            Call
          </Button>
        ) : (
          <Button 
            onClick={handleEndCall}
            variant="destructive"
            size="sm"
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            <PhoneOff className="h-4 w-4 mr-1" />
            End ({formatDuration(callDuration)})
          </Button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden p-6">
        {error && (
          <Alert variant="destructive" className="flex-shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Conversation History - Takes up remaining space */}
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-gray-50 flex-shrink-0">
            <span className="text-sm font-medium">Conversation</span>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {conversationHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start a conversation!</p>
                </div>
              ) : (
                conversationHistory.map((message) => (
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
                      <Avatar className="h-8 w-8 flex-shrink-0">
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
                        <p className="whitespace-pre-wrap">{message.content}</p>
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
                ))
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        </div>

        {/* Text Input */}
        <div className="flex gap-2 flex-shrink-0">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
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
        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded text-center flex-shrink-0">
          Status: {selectedLead.chaseStatus} • Funding: {selectedLead.fundingReadiness} • 
          Step: {selectedLead.scriptProgress.currentStep} • Specialist: {selectedLead.assignedSpecialist || 'Unassigned'}
        </div>
      </div>
    </div>
  );
};

export default TelephonyInterface; 