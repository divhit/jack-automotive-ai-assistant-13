// Enhanced Telephony Interface for Subprime Dashboard with ElevenLabs MCP Analytics
// Integrates real-time conversation analytics and coaching

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PhoneCall,
  CreditCard,
  Car,
  DollarSign,
  BarChart3,
  Brain,
  Target,
  Zap,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ElevenLabsAnalyticsPanel } from './enhanced/ElevenLabsAnalyticsPanel';

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
  const [showAnalytics, setShowAnalytics] = useState(true);

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
  }, [selectedLead?.id]);

  // Call duration timer with automatic call end detection
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          
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

  const setupEventSource = () => {
    if (!selectedLead) return;
    
    closeEventSource();
    
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
      
      if (eventSource.readyState === EventSource.CLOSED && selectedLead && selectedLead.id) {
        console.log('📡 SSE connection closed, attempting reconnection for lead:', selectedLead.id);
        setTimeout(() => {
          if (selectedLead && selectedLead.id && eventSourceRef.current === eventSource) {
            setupEventSource();
          }
        }, 2000);
      }
    };
  };

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      console.log('🔌 Closing SSE connection for lead:', selectedLead?.id);
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
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'user',
          status: 'delivered'
        });
        
        if (onLeadUpdate) {
          onLeadUpdate(selectedLead!.id, {
            lastTouchpoint: data.timestamp || new Date().toISOString(),
            sentiment: data.sentiment || undefined
          });
        }
        break;
        
      case 'call_started':
        setIsCallActive(true);
        setCurrentMode('voice');
        setConversationId(data.callId);
        addConversationMessage({
          id: `call-start-${Date.now()}`,
          type: 'system',
          content: `Voice call started with ${selectedLead?.customerName}`,
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        break;
        
      case 'call_ended':
        setIsCallActive(false);
        setCurrentMode('text');
        addConversationMessage({
          id: `call-end-${Date.now()}`,
          type: 'system',
          content: `Voice call ended. Duration: ${formatDuration(callDuration)}`,
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        setConversationId(null);
        break;
        
      case 'voice_message':
        addConversationMessage({
          id: `voice-${Date.now()}`,
          type: 'voice',
          content: data.transcription || 'Voice message',
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: data.speaker === 'agent' ? 'agent' : 'user'
        });
        break;
        
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  };

  const addConversationMessage = (message: ConversationMessage) => {
    setConversationHistory(prev => {
      if (prev.some(m => m.id === message.id)) return prev; // Prevent duplicates
      return [...prev, message];
    });
  };

  const loadConversationHistory = async () => {
    if (!selectedLead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/conversations/${selectedLead.id}`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        setConversationHistory(data.messages);
        console.log(`📱 Loaded ${data.messages.length} conversation messages for ${selectedLead.customerName}`);
      } else {
        console.log(`📱 No conversation history found for ${selectedLead.customerName}`);
        setConversationHistory([]);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setError('Failed to load conversation history');
      setConversationHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartVoiceCall = async () => {
    if (!selectedLead || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/elevenlabs/outbound-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id,
          customerName: selectedLead.customerName,
          conversationContext: {
            leadId: selectedLead.id,
            customerName: selectedLead.customerName,
            fundingReadiness: selectedLead.fundingReadiness,
            sentiment: selectedLead.sentiment,
            scriptProgress: selectedLead.scriptProgress,
            vehicleInterest: selectedLead.vehicleInterest,
            previousTouchpoints: selectedLead.touchpointHistory?.slice(-3) || []
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsCallActive(true);
        setCurrentMode('voice');
        setConversationId(data.callId);
        
        addConversationMessage({
          id: `call-initiated-${Date.now()}`,
          type: 'system',
          content: `Initiating voice call to ${selectedLead.customerName} (${selectedLead.phoneNumber})...`,
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        
        toast.success(`Voice call initiated to ${selectedLead.customerName}`);
      } else {
        throw new Error(data.error || 'Failed to start call');
      }
    } catch (error) {
      console.error('Error starting voice call:', error);
      setError(`Failed to start voice call: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to start voice call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`/api/elevenlabs/end-call/${conversationId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setIsCallActive(false);
        setCurrentMode('text');
        setConversationId(null);
        toast.success('Call ended successfully');
      }
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call properly');
    }
  };

  const handleSendTextMessage = async () => {
    if (!selectedLead || !textInput.trim() || isLoading) return;
    
    const messageContent = textInput.trim();
    setTextInput('');
    setIsLoading(true);
    setError(null);
    
    const tempMessage: ConversationMessage = {
      id: `temp-${Date.now()}`,
      type: 'sms',
      content: messageContent,
      timestamp: new Date().toISOString(),
      sentBy: 'agent',
      status: 'sent'
    };
    
    addConversationMessage(tempMessage);
    
    try {
      const response = await fetch('/api/twilio/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedLead.phoneNumber,
          message: messageContent,
          leadId: selectedLead.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConversationHistory(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, id: data.messageSid, status: 'delivered' }
              : msg
          )
        );
        
        toast.success(`Message sent to ${selectedLead.customerName}`);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setConversationHistory(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      
      toast.error('Failed to send message');
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
      case 'sent': return 'text-blue-600';
      case 'delivered': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const getStatusColor2 = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'Partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Not Ready': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
    <div className={cn("h-full flex flex-col", className)}>
      {/* FIXED LEAD PROFILE HEADER */}
      <Card className="flex-shrink-0 m-4 mb-2 shadow-sm border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{selectedLead.customerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{selectedLead.customerName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {selectedLead.phoneNumber}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className={getStatusColor2(selectedLead.fundingReadiness)}>
                {selectedLead.fundingReadiness}
              </Badge>
              <Badge variant="outline">
                {getSentimentIcon(selectedLead.sentiment)} {selectedLead.sentiment}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="ml-2"
              >
                {showAnalytics ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                Analytics
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{selectedLead.chaseStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-muted-foreground">Next Action</p>
                <p className="font-medium truncate">{selectedLead.nextAction.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-muted-foreground">Specialist</p>
                <p className="font-medium">{selectedLead.assignedSpecialist || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-muted-foreground">Step</p>
                <p className="font-medium capitalize">{selectedLead.scriptProgress.currentStep}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Interest */}
          {selectedLead.vehicleInterest && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Car className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Vehicle Interest</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-blue-700">Type: {selectedLead.vehicleInterest.type}</span>
                <span className="text-blue-700">
                  Budget: {formatCurrency(selectedLead.vehicleInterest.budget.min)} - {formatCurrency(selectedLead.vehicleInterest.budget.max)}
                </span>
              </div>
            </div>
          )}

          {/* Call Status Indicator */}
          {isCallActive && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Voice call active - {formatDuration(callDuration)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MAIN CONTENT AREA - Split between conversation and analytics */}
      <div className="flex-1 flex mx-4 mb-4 gap-4 min-h-0">
        {/* CONVERSATION COLUMN */}
        <div className={cn("flex flex-col min-h-0", showAnalytics ? "w-2/3" : "w-full")}>
          {error && (
            <Alert variant="destructive" className="mb-4 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Conversation History */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0 py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
              <ScrollArea className="h-full px-6 pb-4">
                <div className="space-y-4 py-2">
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
            </CardContent>
          </Card>

          {/* INPUT AREA */}
          <div className="flex gap-2 mt-4 flex-shrink-0">
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
            <div className="flex flex-col gap-2">
              {!isCallActive ? (
                <Button 
                  onClick={handleStartVoiceCall}
                  disabled={isLoading}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PhoneCall className="h-4 w-4 mr-1" />
                  Call
                </Button>
              ) : (
                <Button 
                  onClick={handleEndCall}
                  variant="destructive"
                  size="sm"
                >
                  <PhoneOff className="h-4 w-4 mr-1" />
                  End ({formatDuration(callDuration)})
                </Button>
              )}
              <Button 
                onClick={handleSendTextMessage}
                disabled={isLoading || !textInput.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ANALYTICS PANEL */}
        {showAnalytics && (
          <div className="w-1/3 flex flex-col min-h-0">
            <ElevenLabsAnalyticsPanel
              selectedLead={selectedLead}
              conversationHistory={conversationHistory}
              isCallActive={isCallActive}
              callDuration={callDuration}
              conversationId={conversationId}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TelephonyInterface; 