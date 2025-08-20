// Enhanced Telephony Interface for Subprime Dashboard
// Uses the working API endpoints we just tested - SECURITY FIXED

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
import { useAuth } from '@/contexts/AuthContext';
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
  // SECURITY: Get organization context
  const { organization, user } = useAuth();
  
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
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('live');
  
  // ⭐ MANUAL CALLS FEATURE: State for manual call functionality
  const [isManualCallActive, setIsManualCallActive] = useState(false);
  const [manualCallSession, setManualCallSession] = useState<{
    conferenceId?: string;
    status?: string;
    dialInNumber?: string;
    instructions?: string;
  } | null>(null);
  const [agentName, setAgentName] = useState('Agent'); // Default agent name
  const [agentPhoneNumber, setAgentPhoneNumber] = useState(''); // Agent's phone number for manual calls

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Load agent phone number from Supabase on mount
  useEffect(() => {
    const loadAgentPhoneNumber = async () => {
      if (!organization?.id || !user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('agent_phone_numbers')
          .select('phone_number, agent_name')
          .eq('organization_id', organization.id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (data && !error) {
          setAgentPhoneNumber(data.phone_number);
          setAgentName(data.agent_name);
        }
      } catch (error) {
        console.warn('Failed to load agent phone number:', error);
      }
    };
    
    loadAgentPhoneNumber();
  }, [organization?.id, user?.id]);

  // Save agent phone number to Supabase when it changes
  const saveAgentPhoneNumber = async (phoneNumber: string, name: string) => {
    if (!organization?.id || !user?.id || !phoneNumber.trim()) return;
    
    try {
      const { error } = await supabase
        .from('agent_phone_numbers')
        .upsert({
          organization_id: organization.id,
          user_id: user.id,
          agent_name: name,
          phone_number: phoneNumber.trim(),
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,user_id'
        });
      
      if (error) {
        console.error('Failed to save agent phone number:', error);
        toast.error('Failed to save phone number');
      }
    } catch (error) {
      console.error('Error saving agent phone number:', error);
    }
  };

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
    
    // SECURITY: Validate organization context before establishing SSE connection
    if (!organization?.id) {
      console.error('🚨 SECURITY: No organization context - cannot establish SSE connection');
      setError('Organization context missing. Please refresh the page.');
      return;
    }
    
    closeEventSource(); // Close existing connection
    
    // SECURITY: Include organizationId in query params for organization validation
    const eventSourceUrl = `/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}&load=true&organizationId=${encodeURIComponent(organization.id)}`;
    
    console.log('📡 Establishing SSE connection for lead:', selectedLead.id, 'organization:', organization.name);
    
    const eventSource = new EventSource(eventSourceUrl);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('📡 SSE connection established for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ') (org:', organization.name, ')');
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
      
      // Only attempt to reconnect if the connection is in a failed state
      // and we still have a selected lead
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
          timestamp: data.timestamp,
          sentBy: 'user',
          status: 'delivered'
        });
        break;
        
      case 'sms_sent':
        addConversationMessage({
          id: `sms-sent-${data.messageSid || Date.now()}`,
          type: 'sms',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'agent',
          status: 'sent'
        });
        break;
        
      case 'call_initiated':
        setIsCallActive(true);
        setCurrentMode('voice');
        addConversationMessage({
          id: `call-start-${Date.now()}`,
          type: 'system',
          content: 'Voice call initiated',
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        break;
        
      case 'call_ended':
      case 'call_completed':
      case 'call_ended_manual':
        setIsCallActive(false);
        setCurrentMode('text');
        setConversationId(null);
        addConversationMessage({
          id: `call-end-${Date.now()}`,
          type: 'system',
          content: data.summary ? `Call ended. ${data.summary}` : 'Call ended',
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        // URGENT FIX: Reload conversation history after call ends to get transcript
        console.log('📞 Call ended - reloading conversation history to get transcript');
        setTimeout(() => {
          loadConversationHistory();
        }, 1000); // Small delay to ensure transcript is saved
        break;
        
      case 'conversation_transcript_added':
        // URGENT FIX: Auto-reload conversation history when transcript is added
        console.log('📝 Transcript added - reloading conversation history');
        setTimeout(() => {
          loadConversationHistory();
        }, 500);
        break;
        
      case 'post_call_summary':
        if (data.summary) {
          addConversationMessage({
            id: `summary-${Date.now()}`,
            type: 'system',
            content: `📞 Call Summary: ${data.summary}`,
            timestamp: new Date().toISOString(),
            sentBy: 'system'
          });
        }
        // Also reload conversation history to get any new content
        setTimeout(() => {
          loadConversationHistory();
        }, 500);
        break;
        
      // ⭐ MANUAL CALLS: Handle real-time transcription from manual calls
      case 'manual_call_transcript':
        if (data.message && data.speaker) {
          addConversationMessage({
            id: `manual-transcript-${Date.now()}`,
            type: 'voice',
            content: `[${data.speaker === 'user' ? 'Customer' : 'Agent'}] ${data.message}`,
            timestamp: data.timestamp,
            sentBy: data.speaker,
            status: 'delivered'
          });
        }
        break;
        
      case 'manual_call_ended':
        setIsManualCallActive(false);
        setManualCallSession(null);
        if (data.summary) {
          addConversationMessage({
            id: `manual-summary-${Date.now()}`,
            type: 'system',
            content: `📞 Manual Call Summary: ${data.summary}`,
            timestamp: data.timestamp,
            sentBy: 'system'
          });
        }
        // Reload conversation history to get complete transcript
        setTimeout(() => {
          loadConversationHistory();
        }, 1000);
        break;
        
      // ⭐ HUMAN AGENT: Handle human agent SMS messages
      case 'human_message_sent':
        if (data.message) {
          addConversationMessage({
            id: `human-sms-${Date.now()}`,
            type: 'sms',
            content: data.message,
            timestamp: data.timestamp,
            sentBy: 'human_agent',
            status: 'sent'
          });
        }
        break;
        
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  };

  const addConversationMessage = (message: ConversationMessage) => {
    setConversationHistory(prev => {
      // Avoid duplicates based on content and timestamp
      const exists = prev.some(msg => 
        msg.content === message.content && 
        Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
      );
      return exists ? prev : [...prev, message];
    });
  };

  const loadConversationHistory = async () => {
    if (!selectedLead) return;
    
    // SECURITY: Validate organization context
    if (!organization?.id) {
      console.error('🚨 SECURITY: No organization context - cannot load conversation history');
      setError('Organization context missing. Please refresh the page.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📋 Loading conversation history for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ') (org:', organization.name, ')');
      
      // SECURITY: Include organizationId in request for organization validation
      const response = await fetch(`/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}&load=true&organizationId=${encodeURIComponent(organization.id)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load conversation history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Loaded conversation history:', data);
      
      if (data.messages && Array.isArray(data.messages)) {
        const formattedMessages: ConversationMessage[] = data.messages.map((msg: any, index: number) => ({
          id: msg.id || `msg-${index}-${Date.now()}`,
          type: msg.type || 'sms',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          sentBy: msg.sentBy || (msg.direction === 'outbound' ? 'agent' : 'user'),
          status: msg.status || 'delivered'
        }));
        
        setConversationHistory(formattedMessages);
        console.log('✅ Formatted', formattedMessages.length, 'conversation messages');
      }
      
    } catch (error) {
      console.error('❌ Error loading conversation history:', error);
      setError(error.message || 'Failed to load conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartVoiceCall = async () => {
    if (!selectedLead) return;
    
    // SECURITY: Validate organization context before starting call
    if (!organization?.id) {
      console.error('🚨 SECURITY: No organization context - cannot start call');
      setError('Organization context missing. Please refresh the page.');
      toast.error('Organization context missing');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📞 Starting voice call to:', selectedLead.phoneNumber, 'Org:', organization.name);
      
      const response = await fetch('/api/elevenlabs/outbound-call/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'organizationId': organization.id, // SECURITY: Include organization context
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
      
      if (result.success) {
        setIsCallActive(true);
        setCurrentMode('voice');
        if (result.conversation_id) {
          setConversationId(result.conversation_id);
        }
        
        addConversationMessage({
          id: `call-init-${Date.now()}`,
          type: 'system',
          content: `Voice call initiated to ${selectedLead.phoneNumber}`,
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        
        toast.success(`Call initiated to ${selectedLead.phoneNumber}`);
      } else {
        throw new Error(result.message || 'Failed to initiate call');
      }
      
    } catch (error) {
      console.error('Error starting voice call:', error);
      setError(error.message || 'Failed to start voice call. Please try again.');
      toast.error(error.message || 'Failed to start call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!isCallActive) return;
    
    console.log('📞 Ending voice call');
    setIsCallActive(false);
    setCurrentMode('text');
    setConversationId(null);
    
    addConversationMessage({
      id: `call-end-manual-${Date.now()}`,
      type: 'system',
      content: `Call ended manually. Duration: ${formatDuration(callDuration)}`,
      timestamp: new Date().toISOString(),
      sentBy: 'system'
    });
    
    toast.success('Call ended');
  };

  // ⭐ MANUAL CALLS FEATURE: Handle manual call initiation
  const handleManualCall = async () => {
    if (!selectedLead) return;
    
    // Validate agent details
    if (!agentName.trim()) {
      toast.error('Please enter your name first');
      return;
    }
    
    if (!agentPhoneNumber.trim()) {
      toast.error('Please enter your phone number first');
      return;
    }
    
    // Basic phone number validation
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(agentPhoneNumber.trim())) {
      toast.error('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📞 Starting manual call to:', selectedLead.phoneNumber, '(org:', organization?.id, ')');
      
      // SECURITY: Include organization headers for validation
      const response = await fetch('/api/manual-call/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization?.id || '',
          'organizationId': organization?.id || ''
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id,
          agentName: agentPhoneNumber || agentName, // Use phone number if provided, fallback to name
          organizationId: organization?.id
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - lead belongs to different organization');
        } else if (response.status === 400) {
          const errorData = await response.json();
          if (errorData.code === 'MISSING_ORG_CONTEXT') {
            throw new Error('Organization context required - please refresh the page');
          }
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate manual call');
      }

      const result = await response.json();
      
      // SECURITY: Validate that the response is for the correct organization
      if (result.organizationId && result.organizationId !== organization?.id) {
        console.error('🚨 SECURITY: Manual call response for different organization:', result.organizationId, 'expected:', organization?.id);
        throw new Error('Security violation - response from different organization');
      }
      
      if (result.success) {
        setIsManualCallActive(true);
        setManualCallSession({
          conferenceId: result.conferenceId,
          status: result.status,
          dialInNumber: result.dialInNumber,
          instructions: result.instructions
        });
        
        addConversationMessage({
          id: `manual-call-init-${Date.now()}`,
          type: 'system',
          content: `Manual call initiated to ${selectedLead.phoneNumber}. Conference ID: ${result.conferenceId}`,
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        
        toast.success(`Manual call initiated! Conference: ${result.conferenceId}`);
        
        // Show instructions to the user
        if (result.instructions) {
          toast.info(result.instructions, { duration: 10000 });
        }
      } else {
        throw new Error(result.message || 'Failed to initiate manual call');
      }
      
    } catch (error) {
      console.error('Error starting manual call:', error);
      setError(error.message || 'Failed to start manual call. Please try again.');
      
      if (error.message?.includes('different organization') || error.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot initiate manual call - access denied');
      } else {
        toast.error(error.message || 'Failed to start manual call');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐ MANUAL CALLS FEATURE: Handle ending manual call
  const handleEndManualCall = async () => {
    if (!isManualCallActive || !manualCallSession) return;
    
    setIsLoading(true);
    
    try {
      console.log('📞 Ending manual call:', manualCallSession.conferenceId);
      
      // SECURITY: Include organization headers for validation
      const response = await fetch('/api/manual-call/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization?.id || '',
          'organizationId': organization?.id || ''
        },
        body: JSON.stringify({
          conferenceId: manualCallSession.conferenceId,
          organizationId: organization?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end manual call');
      }

      const result = await response.json();
      
      if (result.success) {
        setIsManualCallActive(false);
        setManualCallSession(null);
        
        addConversationMessage({
          id: `manual-call-end-${Date.now()}`,
          type: 'system',
          content: `Manual call ended. Conference: ${manualCallSession.conferenceId}`,
          timestamp: new Date().toISOString(),
          sentBy: 'system'
        });
        
        toast.success('Manual call ended successfully');
      } else {
        throw new Error(result.message || 'Failed to end manual call');
      }
      
    } catch (error) {
      console.error('Error ending manual call:', error);
      toast.error(error.message || 'Failed to end manual call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTextMessage = async () => {
    if (!selectedLead || !textInput.trim()) return;
    
    // SECURITY: Validate organization context before sending SMS
    if (!organization?.id) {
      console.error('🚨 SECURITY: No organization context - cannot send SMS');
      setError('Organization context missing. Please refresh the page.');
      toast.error('Organization context missing');
      return;
    }
    
    setIsLoading(true);
    const messageText = textInput.trim();
    setTextInput(''); // Clear input immediately for better UX
    
    try {
      console.log('📱 Sending SMS to:', selectedLead.phoneNumber, 'Message:', messageText, 'Org:', organization.name);
      
      const response = await fetch('/api/twilio/send-sms/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'organizationId': organization.id, // SECURITY: Include organization context
        },
        body: JSON.stringify({
          to: selectedLead.phoneNumber,
          message: messageText,
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
      setTextInput(messageText); // Restore message on error
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

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Warm': return '😊';
      case 'Neutral': return '😐';
      case 'Negative': return '😕';
      case 'Frustrated': return '😤';
      case 'Ghosted': return '👻';
      case 'Cold': return '🥶';
      case 'Needs Human': return '🙋';
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

      {/* FIXED LEAD PROFILE HEADER - This stays visible while conversation scrolls */}
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

          {/* Vehicle Interest - if available */}
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

          {/* AGENT PHONE NUMBER SETUP - For manual calls */}
          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Manual Call Setup</span>
              <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-700 border-green-300">
                Required
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-green-700 mb-1 block">Agent Name</label>
                <Input
                  type="text"
                  value={agentName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setAgentName(newName);
                    // Save to Supabase after a short delay (debounced)
                    if (newName.trim() && agentPhoneNumber.trim()) {
                      setTimeout(() => {
                        saveAgentPhoneNumber(agentPhoneNumber, newName);
                      }, 1000);
                    }
                  }}
                  placeholder="Enter your name (e.g., John Smith)"
                  className="text-sm h-8 border-green-200 focus:border-green-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-green-700 mb-1 block">Phone Number</label>
                <Input
                  type="tel"
                  value={agentPhoneNumber}
                  onChange={(e) => {
                    const newPhoneNumber = e.target.value;
                    setAgentPhoneNumber(newPhoneNumber);
                    // Save to Supabase after a short delay (debounced)
                    if (newPhoneNumber.trim() && agentName.trim()) {
                      setTimeout(() => {
                        saveAgentPhoneNumber(newPhoneNumber, agentName);
                      }, 1000);
                    }
                  }}
                  placeholder="Enter your phone number (e.g., +1234567890)"
                  className="text-sm h-8 border-green-200 focus:border-green-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>You will be called first, then customer will be automatically conferenced in</span>
            </div>
          </div>

          {/* Call Status Indicator */}
          {isCallActive && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Voice call active - {formatDuration(callDuration)}</span>
            </div>
          )}
          
          {/* ⭐ MANUAL CALL Status Indicator */}
          {isManualCallActive && manualCallSession && (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Manual Call in Progress</span>
              </div>
              <div className="space-y-1 text-xs">
                <div>Conference: {manualCallSession.conferenceId}</div>
                {manualCallSession.dialInNumber && (
                  <div>Dial-in: {manualCallSession.dialInNumber}</div>
                )}
                <div className="text-blue-600 font-medium">
                  🔴 Recording & Transcribing for AI Context
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content area - Conversation with Analytics */}
      <div className={`flex-1 flex ${showAnalytics ? 'flex-row' : 'flex-col'} mx-4 mb-4 min-h-0 gap-4`}>
        {/* Conversation Area */}
        <div className={showAnalytics ? 'flex-1' : 'w-full'}>
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="flex-shrink-0 py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation
                {selectedLead && (
                  <Badge variant="outline" className="ml-2">
                    {selectedLead.customerName}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            
            {/* ⭐ MANUAL CALLS FEATURE: Show manual call status */}
            {isManualCallActive && manualCallSession && (
              <div className="mx-4 mb-2">
                <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Phone className="w-4 h-4" />
                    <span className="font-medium">Manual Call Active</span>
                    <span className="text-xs">Conference: {manualCallSession.conferenceId}</span>
                  </div>
                  {manualCallSession.dialInNumber && (
                    <div className="text-xs text-blue-600 mt-1">
                      Dial: {manualCallSession.dialInNumber}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
              {error && (
                <Alert variant="destructive" className="mb-4 flex-shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                          (message.sentBy === 'agent' || message.sentBy === 'human_agent') ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "flex gap-2 max-w-[80%]",
                            (message.sentBy === 'agent' || message.sentBy === 'human_agent') ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {message.sentBy === 'user' ? (
                                <User className="h-4 w-4" />
                              ) : message.sentBy === 'agent' ? (
                                <Bot className="h-4 w-4" />
                              ) : message.sentBy === 'human_agent' ? (
                                <User className="h-4 w-4 text-green-600" />
                              ) : (
                                <Settings className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "rounded-lg px-3 py-2 text-sm relative",
                              message.sentBy === 'agent'
                                ? "bg-blue-500 text-white"
                                : message.sentBy === 'user'
                                ? "bg-gray-100 text-gray-900"
                                : message.sentBy === 'human_agent'
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-yellow-50 text-yellow-800 border border-yellow-200",
                              // ⭐ MANUAL CALLS: Special styling for manual call messages
                              message.type === 'voice_manual' && "border-2 border-dashed border-purple-300"
                            )}
                          >
                            {/* ⭐ MANUAL CALLS: Show manual call indicator */}
                            {message.type === 'voice_manual' && (
                              <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-1 py-0.5 rounded-full text-[10px]">
                                👤 MANUAL
                              </div>
                            )}
                            {/* ⭐ HUMAN AGENT: Show human agent indicator */}
                            {message.sentBy === 'human_agent' && (
                              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full text-[10px]">
                                👤 HUMAN
                              </div>
                            )}
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
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="w-80 flex-shrink-0">
            <ElevenLabsAnalyticsPanel
              selectedLead={selectedLead}
              conversationHistory={conversationHistory}
              isCallActive={isCallActive}
              callDuration={callDuration}
              conversationId={conversationId}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* INPUT AREA - Fixed at bottom */}
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
          {/* Call Buttons */}
          {!isCallActive && !isManualCallActive ? (
            <>
              <Button 
                onClick={handleStartVoiceCall}
                disabled={isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PhoneCall className="h-4 w-4 mr-1" />
                Jack Call
              </Button>
              <Button 
                onClick={handleManualCall}
                variant="outline"
                size="sm"
                disabled={isLoading || !agentPhoneNumber.trim() || !agentName.trim()}
                className="bg-green-600 hover:bg-green-700 text-white border-green-600 disabled:bg-gray-400 disabled:border-gray-400"
                title={!agentName.trim() || !agentPhoneNumber.trim() ? "Please enter your name and phone number above" : "Start manual call"}
              >
                <Phone className="h-4 w-4 mr-1" />
                Manual Call
              </Button>
            </>
          ) : isCallActive ? (
            <Button 
              onClick={handleEndCall}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="h-4 w-4 mr-1" />
              End ({formatDuration(callDuration)})
            </Button>
          ) : isManualCallActive ? (
            <Button 
              onClick={handleEndManualCall}
              variant="destructive"
              size="sm"
            >
              <PhoneOff className="h-4 w-4 mr-1" />
              End Manual Call
            </Button>
          ) : null}
          {/* Send Button */}
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
  );
};

export default TelephonyInterface; 