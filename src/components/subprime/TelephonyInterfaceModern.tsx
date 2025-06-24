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
  Send,
  Clock,
  User,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Loader2,
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

interface TelephonyInterfaceModernProps {
  selectedLead: SubprimeLead | null;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
  className?: string;
}

export const TelephonyInterfaceModern: React.FC<TelephonyInterfaceModernProps> = ({
  selectedLead,
  onLeadUpdate,
  className
}) => {
  // State management
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

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
    setConnectionStatus('connecting');
    
    const eventSource = new EventSource(`/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('📡 SSE connection established for lead:', selectedLead.id);
      setConnectionStatus('connected');
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
      setConnectionStatus('disconnected');
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
    setConnectionStatus('disconnected');
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
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'user',
          status: 'delivered'
        });
        break;
        
      case 'sms_sent':
        addConversationMessage({
          id: `sms-${data.messageSid || Date.now()}`,
          type: 'sms',
          content: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'agent',
          status: data.status === 'queued' ? 'sent' : 'delivered'
        });
        break;
        
      case 'call_initiated':
        setIsCallActive(true);
        addConversationMessage({
          id: `call-${Date.now()}`,
          type: 'system',
          content: `Voice call initiated`,
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'system'
        });
        break;
        
      case 'call_ended':
        setIsCallActive(false);
        addConversationMessage({
          id: `call-end-${Date.now()}`,
          type: 'system',
          content: `Call ended (${formatDuration(callDuration)})`,
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'system'
        });
        break;
        
      case 'post_call_summary':
        if (data.summary) {
          addConversationMessage({
            id: `summary-${Date.now()}`,
            type: 'system',
            content: `Call Summary: ${data.summary}`,
            timestamp: data.timestamp || new Date().toISOString(),
            sentBy: 'system'
          });
        }
        break;
    }
  };

  const addConversationMessage = (message: ConversationMessage) => {
    setConversationHistory(prev => [...prev, message]);
  };

  const loadConversationHistory = () => {
    // Load existing conversation history for the lead
    // This would typically be an API call
    setConversationHistory([]);
  };

  const handleStartVoiceCall = async () => {
    if (!selectedLead) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/elevenlabs/outbound-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Call initiated successfully');
        setIsCallActive(true);
      } else {
        throw new Error(result.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    setIsCallActive(false);
    toast.info('Call ended');
  };

  const handleSendTextMessage = async () => {
    if (!textInput.trim() || !selectedLead) return;
    
    const messageText = textInput.trim();
    setTextInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedLead.phoneNumber,
          message: messageText,
          leadId: selectedLead.id
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Message will be added via SSE update
        toast.success('Message sent');
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Re-add the message to input on failure
      setTextInput(messageText);
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
      case 'sent': return 'text-yellow-600';
      case 'delivered': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!selectedLead) {
    return (
      <div className={cn("flex items-center justify-center h-full text-gray-500", className)}>
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Lead Selected</h3>
          <p className="text-sm">Select a lead to start telephony session</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{selectedLead.customerName}</h3>
            <p className="text-sm text-gray-500">{selectedLead.phoneNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {connectionStatus === 'connecting' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {connectionStatus === 'connected' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {connectionStatus === 'disconnected' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {connectionStatus}
            </Badge>
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-2">
          {isCallActive ? (
            <div className="flex items-center gap-2 flex-1">
              <Badge variant="destructive" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Live Call - {formatDuration(callDuration)}
              </Badge>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                End Call
              </Button>
            </div>
          ) : (
            <Button 
              variant="default" 
              size="sm"
              onClick={handleStartVoiceCall}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
              Start Call
            </Button>
          )}
        </div>
      </div>

      {/* Conversation History */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversationHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No conversation history</p>
              <p className="text-xs text-gray-400">Start a call or send a message</p>
            </div>
          ) : (
            conversationHistory.map((message) => (
              <div key={message.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className={cn(
                    "text-xs",
                    message.sentBy === 'user' ? 'bg-blue-100 text-blue-700' :
                    message.sentBy === 'agent' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {message.sentBy === 'user' ? <User className="h-4 w-4" /> :
                     message.sentBy === 'agent' ? <Bot className="h-4 w-4" /> :
                     'S'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium capitalize">
                      {message.sentBy === 'user' ? 'Customer' : 
                       message.sentBy === 'agent' ? 'Agent' : 'System'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {message.type}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatMessageTime(message.timestamp)}
                    </span>
                    {message.status && (
                      <CheckCircle2 className={cn("h-3 w-3", getStatusColor(message.status))} />
                    )}
                  </div>
                  <div className={cn(
                    "text-sm p-3 rounded-lg",
                    message.sentBy === 'user' ? 'bg-blue-50 text-blue-900' :
                    message.sentBy === 'agent' ? 'bg-green-50 text-green-900' :
                    'bg-gray-50 text-gray-700'
                  )}>
                    {message.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Type your message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendTextMessage();
                }
              }}
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
          </div>
          <Button 
            onClick={handleSendTextMessage}
            disabled={!textInput.trim() || isLoading}
            size="sm"
            className="h-[60px] px-4"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default TelephonyInterfaceModern; 