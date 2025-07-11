// Enhanced Telephony Interface for Subprime Dashboard
// Uses the working API endpoints we just tested

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  Mail,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ConversationAnalyticsPanel } from './ConversationAnalyticsPanel';

interface ConversationMessage {
  id: string;
  type: 'sms' | 'call' | 'system' | 'voice';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system' | 'human_agent';
  status?: 'sent' | 'delivered' | 'failed';
}

interface TelephonyInterfaceProps {
  selectedLead: SubprimeLead | null;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
  className?: string;
  organizationId?: string; // SECURITY: Added organization context
}

// SECURITY: Helper function to get organization headers - NO FALLBACKS TO PREVENT CROSS-ORG DATA LEAKAGE
const getOrganizationHeaders = (organizationId?: string) => {
  if (!organizationId) {
    console.error('🚨 SECURITY: No organizationId provided - refusing to make API calls that could leak cross-organization data');
    throw new Error('Organization context required - please refresh the page');
  }
  return { 'organizationId': organizationId };
};

export const TelephonyInterface: React.FC<TelephonyInterfaceProps> = ({
  selectedLead,
  onLeadUpdate,
  className,
  organizationId = 'default-org' // SECURITY: Default organization for now, should come from auth context
}) => {
  // DEBUG: Log organization context being used
  console.log('📞 TelephonyInterface - Organization Context Debug:', {
    organizationId: organizationId,
    selectedLeadId: selectedLead?.id,
    selectedLeadPhone: selectedLead?.phoneNumber,
    hasOrganizationId: !!organizationId,
    isDefaultOrg: organizationId === 'default-org'
  });

  // State management
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeQuickTab, setActiveQuickTab] = useState<'chat' | 'profile' | 'analytics' | 'settings'>('chat');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);
  
  // Smart scrolling state
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Human control state
  const [isUnderHumanControl, setIsUnderHumanControl] = useState(false);
  const [humanControlAgent, setHumanControlAgent] = useState<string | null>(null);
  const [humanControlSession, setHumanControlSession] = useState<any>(null);
  const [agentName, setAgentName] = useState('Agent'); // Default agent name for human control

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Smart auto-scroll: only scroll if user is near bottom
  useEffect(() => {
    if (conversationHistory.length > 0 && isNearBottom) {
      // Only auto-scroll if user is already near the bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [conversationHistory, isNearBottom]);

  // Check scroll position to determine if user is near bottom
  const checkScrollPosition = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    // Use the same robust selector approach
    const possibleSelectors = [
      '[data-radix-scroll-area-viewport]',
      '.radix-scroll-area-viewport',
      '[data-scroll-area-viewport]',
      '.scroll-area-viewport'
    ];
    
    let scrollContainer = null;
    for (const selector of possibleSelectors) {
      scrollContainer = scrollAreaRef.current.querySelector(selector);
      if (scrollContainer) break;
    }
    
    // Fallback to first scrollable div
    if (!scrollContainer) {
      const divs = scrollAreaRef.current.querySelectorAll('div');
      for (const div of divs) {
        if (div.scrollHeight > div.clientHeight) {
          scrollContainer = div;
          break;
        }
      }
    }
    
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const threshold = 100; // pixels from bottom
      const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;
      
      setIsNearBottom(nearBottom);
      setShowScrollToBottom(!nearBottom && conversationHistory.length > 0);
    }
  }, [conversationHistory.length]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    // Use the same robust selector approach
    const possibleSelectors = [
      '[data-radix-scroll-area-viewport]',
      '.radix-scroll-area-viewport',
      '[data-scroll-area-viewport]',
      '.scroll-area-viewport'
    ];
    
    let scrollContainer = null;
    for (const selector of possibleSelectors) {
      scrollContainer = scrollAreaRef.current.querySelector(selector);
      if (scrollContainer) break;
    }
    
    // Fallback to first scrollable div
    if (!scrollContainer) {
      const divs = scrollAreaRef.current.querySelectorAll('div');
      for (const div of divs) {
        if (div.scrollHeight > div.clientHeight) {
          scrollContainer = div;
          break;
        }
      }
    }
    
    if (scrollContainer) {
      // Scroll to the bottom of the container
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
      console.log('📜 Scrolling to bottom of container');
    } else {
      // Fallback to scrollIntoView
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      console.log('📜 Using fallback scrollIntoView');
    }
    setShowScrollToBottom(false);
    setIsNearBottom(true);
  }, []);

  // Load conversation history when lead changes
  useEffect(() => {
    if (selectedLead) {
      // Reset scroll state when switching leads
      setIsNearBottom(true);
      setShowScrollToBottom(false);
      
      // SSE with load=true will automatically load conversation history
      setupEventSource();
    } else {
      setConversationHistory([]);
      closeEventSource();
    }
    
    return () => {
      closeEventSource();
    };
  }, [selectedLead?.id]); // Use selectedLead.id for better dependency tracking

  // Setup scroll event listener for better scroll detection
  useEffect(() => {
    if (!scrollAreaRef.current) return;
    
    // Try multiple selectors to find the scrollable viewport
    const possibleSelectors = [
      '[data-radix-scroll-area-viewport]',
      '.radix-scroll-area-viewport',
      '[data-scroll-area-viewport]',
      '.scroll-area-viewport'
    ];
    
    let scrollContainer = null;
    for (const selector of possibleSelectors) {
      scrollContainer = scrollAreaRef.current.querySelector(selector);
      if (scrollContainer) break;
    }
    
    // Fallback: find the first div that might be scrollable
    if (!scrollContainer) {
      const divs = scrollAreaRef.current.querySelectorAll('div');
      for (const div of divs) {
        if (div.scrollHeight > div.clientHeight) {
          scrollContainer = div;
          break;
        }
      }
    }
    
    if (scrollContainer) {
      const handleScroll = () => {
        checkScrollPosition();
      };
      
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      // Debug: log scroll container info
      console.log('📜 ScrollArea container found:', {
        element: scrollContainer,
        selector: scrollContainer.getAttribute('data-radix-scroll-area-viewport') ? '[data-radix-scroll-area-viewport]' : 'fallback',
        height: scrollContainer.clientHeight,
        scrollHeight: scrollContainer.scrollHeight,
        canScroll: scrollContainer.scrollHeight > scrollContainer.clientHeight,
        hasScrollbar: scrollContainer.scrollHeight > scrollContainer.clientHeight,
        overflow: window.getComputedStyle(scrollContainer).overflow,
        overflowY: window.getComputedStyle(scrollContainer).overflowY,
        messagesCount: conversationHistory.length
      });
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    } else {
      console.warn('⚠️ ScrollArea viewport not found, logging structure:', scrollAreaRef.current);
    }
  }, [checkScrollPosition, conversationHistory.length]);

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
    
    // SECURITY: Include organization validation in SSE connection
    // Include phone number in query params for proper lead-to-phone mapping
    // ENHANCED: Add load=true to automatically load conversation history from Supabase
    // NOTE: SSE connections cannot include custom headers, so we pass organizationId as query param
    const eventSource = new EventSource(`/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}&load=true&organizationId=${encodeURIComponent(organizationId)}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      console.log('📡 SSE connection established for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ') (org:', organizationId, ')');
      console.log('🔗 SSE URL:', `/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}&load=true&organizationId=${encodeURIComponent(organizationId)}`);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 SSE message received:', data.type, data);
        
        // SECURITY: Validate that the message is for the correct organization
        if (data.organizationId && data.organizationId !== organizationId) {
          console.error('🚨 SECURITY: Received SSE message for different organization:', data.organizationId, 'expected:', organizationId);
          return; // Ignore messages from other organizations
        }
        
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
        
      case 'conversation_history':
        // ENHANCED: Load conversation history from Supabase via SSE
        if (data.messages && Array.isArray(data.messages)) {
          console.log('📋 Loading conversation history from SSE:', data.messages.length, 'messages');
          setConversationHistory(data.messages);
          
          if (data.summary) {
            addConversationMessage({
              id: `loaded-summary-${Date.now()}`,
              type: 'system',
              content: `📞 Previous Call Summary: ${data.summary}`,
              timestamp: new Date().toISOString(),
              sentBy: 'system'
            });
          }
          
          // Auto-scroll to bottom when loading conversation history
          setTimeout(() => {
            scrollToBottom();
          }, 200);
        }
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
        break;
        
      case 'post_call_summary':
        if (data.summary) {
          addConversationMessage({
            id: `summary-${Date.now()}`,
            type: 'system',
            content: `📞 Previous Conversation Summary: ${data.summary}`,
            timestamp: new Date().toISOString(),
            sentBy: 'system'
          });
        }
        break;

      case 'lead_profile_updated':
        // Refresh lead data when profile is updated
        if (data.leadId === selectedLead?.id) {
          console.log('🔄 Lead profile updated, refreshing UI');
          // Force refresh of lead data
          window.location.reload();
        }
        break;
        
      case 'human_control_started':
        setIsUnderHumanControl(true);
        setHumanControlAgent(data.agentName);
        setHumanControlSession(data);
        addConversationMessage({
          id: `human-control-start-${Date.now()}`,
          type: 'system',
          content: `👤 Human agent ${data.agentName} joined the conversation`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'human_control_ended':
        setIsUnderHumanControl(false);
        setHumanControlAgent(null);
        setHumanControlSession(null);
        addConversationMessage({
          id: `human-control-end-${Date.now()}`,
          type: 'system',
          content: `🤖 AI agent resumed control of the conversation`,
          timestamp: data.timestamp,
          sentBy: 'system'
        });
        break;
        
      case 'human_message_sent':
        addConversationMessage({
          id: `human-msg-sent-${Date.now()}`,
          type: 'sms',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'human_agent',
          status: 'sent'
        });
        break;
        
      case 'user_message_during_human_control':
        addConversationMessage({
          id: `user-msg-human-${Date.now()}`,
          type: 'sms',
          content: data.message,
          timestamp: data.timestamp,
          sentBy: 'user',
          status: 'delivered'
        });
        break;
        
      case 'error':
        console.error('SSE Error:', data.message);
        setError(data.message || 'Connection error');
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
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📋 Loading conversation history for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ') (org:', organizationId, ')');
      
      // SECURITY: Include organization headers for validation
      const response = await fetch(
        `/api/conversation-history/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getOrganizationHeaders(organizationId)
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied - lead belongs to different organization');
        } else if (response.status === 400) {
          const errorData = await response.json();
          if (errorData.code === 'MISSING_ORG_CONTEXT') {
            throw new Error('Organization context required - please refresh the page');
          }
        }
        throw new Error(`Failed to load conversation history: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Loaded conversation history:', data);
      
      // SECURITY: Validate that the returned data is for the correct organization
      if (data.organizationId && data.organizationId !== organizationId) {
        console.error('🚨 SECURITY: Received conversation data for different organization:', data.organizationId, 'expected:', organizationId);
        throw new Error('Security violation - data from different organization');
      }
      
      if (data.messages && Array.isArray(data.messages)) {
        const formattedMessages: ConversationMessage[] = data.messages.map((msg: any, index: number) => ({
          id: msg.id || `msg-${index}-${Date.now()}`,
          type: msg.type || 'sms',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          sentBy: msg.sentBy || (msg.direction === 'outbound' ? 'agent' : 'user') as 'user' | 'agent' | 'system' | 'human_agent',
          status: msg.status || 'delivered'
        }));
        
        setConversationHistory(formattedMessages as ConversationMessage[]);
        console.log('✅ Formatted', formattedMessages.length, 'conversation messages for org:', organizationId);
      }
      
    } catch (error) {
      console.error('❌ Error loading conversation history:', error);
      setError(error.message || 'Failed to load conversation history');
      
      // SECURITY: Clear any potentially contaminated data
      setConversationHistory([]);
      
      if (error.message?.includes('different organization') || error.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot access data from different organization');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartVoiceCall = async () => {
    if (!selectedLead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📞 Starting voice call to:', selectedLead.phoneNumber, '(org:', organizationId, ')');
      
      // SECURITY: Include organization headers for validation
      const response = await fetch('/api/elevenlabs/outbound-call/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrganizationHeaders(organizationId)
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id,
          organizationId: organizationId // SECURITY: Include organization context in request body
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
        throw new Error(errorData.error || 'Failed to initiate call');
      }

      const result = await response.json();
      
      // SECURITY: Validate that the response is for the correct organization
      if (result.organizationId && result.organizationId !== organizationId) {
        console.error('🚨 SECURITY: Call response for different organization:', result.organizationId, 'expected:', organizationId);
        throw new Error('Security violation - response from different organization');
      }
      
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
      
      if (error.message?.includes('different organization') || error.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot initiate call - access denied');
      } else {
      toast.error(error.message || 'Failed to start call');
      }
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

  const handleSendTextMessage = async () => {
    if (!selectedLead || !textInput.trim()) return;
    
    setIsLoading(true);
    const messageText = textInput.trim();
    setTextInput(''); // Clear input immediately for better UX
    
    try {
      console.log('📱 Sending SMS to:', selectedLead.phoneNumber, 'Message:', messageText, '(org:', organizationId, ')');
      
      // SECURITY: Include organization headers for validation
      const response = await fetch('/api/twilio/send-sms/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrganizationHeaders(organizationId)
        },
        body: JSON.stringify({
          to: selectedLead.phoneNumber,
          message: messageText,
          leadId: selectedLead.id,
          agentId: 'telephony-interface',
          organizationId: organizationId // SECURITY: Include organization context in request body
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
        throw new Error(errorData.error || 'Failed to send SMS');
      }

      const result = await response.json();
      
      // SECURITY: Validate that the response is for the correct organization
      if (result.organizationId && result.organizationId !== organizationId) {
        console.error('🚨 SECURITY: SMS response for different organization:', result.organizationId, 'expected:', organizationId);
        throw new Error('Security violation - response from different organization');
      }
      
      toast.success(`SMS sent to ${selectedLead.phoneNumber}`);
      console.log('✅ SMS sent successfully for org:', organizationId, '- message will appear via SSE stream');

    } catch (error) {
      console.error('Error sending SMS:', error);
      setError(error.message || 'Failed to send SMS. Please try again.');
      
      if (error.message?.includes('different organization') || error.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot send SMS - access denied');
      } else {
      toast.error(error.message || 'Failed to send SMS');
      }
      
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
      case 'Ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'Partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Not Ready': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
      case 'Positive': return '😊';
      case 'Neutral': return '😐';
      case 'Negative': return '😕';
      case 'Frustrated': return '😤';
      case 'Ghosted': return '👻';
      default: return '🤔';
    }
  };

  const handleReassignSpecialist = useCallback(async () => {
    if (!selectedLead) return;
    setIsUpdating(true);
    
    // Cycle through specialists
    const specialists = ['Andrea', 'Ian', 'Kayam'] as const;
    const currentIndex = specialists.indexOf(selectedLead.assignedSpecialist || 'Andrea');
    const nextSpecialist = specialists[(currentIndex + 1) % specialists.length];
    
    try {
      await onLeadUpdate?.(selectedLead.id, { assignedSpecialist: nextSpecialist });
      toast.success(`Reassigned to ${nextSpecialist}`);
    } catch (error) {
      toast.error('Failed to reassign specialist');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedLead, onLeadUpdate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleContactMethodChange = useCallback(async (method: 'Voice' | 'SMS' | 'Email') => {
    if (!selectedLead) return;
    setIsUpdating(true);
    
    try {
      const newConversation = {
        type: 'system',
        content: `Preferred contact method updated to ${method}`,
        timestamp: new Date().toISOString(),
        sentBy: 'system' as const
      };
      
      await onLeadUpdate?.(selectedLead.id, {
        conversations: [...selectedLead.conversations, newConversation]
      });
      toast.success(`Contact method set to ${method}`);
    } catch (error) {
      toast.error('Failed to update contact method');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedLead, onLeadUpdate]);

  // Human control functions
  const handleJoinHumanControl = useCallback(async () => {
    if (!selectedLead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...getOrganizationHeaders(organizationId)
      };
      
      const response = await fetch('/api/human-control/join', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          agentName: agentName,
          leadId: selectedLead.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join human control session');
      }
      
      const data = await response.json();
      setIsUnderHumanControl(true);
      setHumanControlAgent(agentName);
      setHumanControlSession(data);
      
      toast.success(`${agentName} joined the conversation`);
      
    } catch (error) {
      console.error('Error joining human control:', error);
      setError(`Failed to join conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to join conversation');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, agentName, organizationId]);

  const handleLeaveHumanControl = useCallback(async () => {
    if (!selectedLead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...getOrganizationHeaders(organizationId)
      };
      
      const response = await fetch('/api/human-control/leave', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave human control session');
      }
      
      const data = await response.json();
      setIsUnderHumanControl(false);
      setHumanControlAgent(null);
      setHumanControlSession(null);
      
      toast.success('AI agent resumed control');
      
    } catch (error) {
      console.error('Error leaving human control:', error);
      setError(`Failed to leave conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to leave conversation');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, organizationId]);

  const handleSendHumanMessage = useCallback(async () => {
    if (!selectedLead || !textInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...getOrganizationHeaders(organizationId)
      };
      
      const response = await fetch('/api/human-control/send-message', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          message: textInput,
          leadId: selectedLead.id,
          agentName: agentName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      // Clear input on success
      setTextInput('');
      
      toast.success('Message sent');
      
    } catch (error) {
      console.error('Error sending human message:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, textInput, agentName, organizationId]);

  // Check human control status on lead change
  useEffect(() => {
    if (!selectedLead) return;
    
    const checkHumanControlStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          ...getOrganizationHeaders(organizationId)
        };
        
        const response = await fetch(`/api/human-control/status/${encodeURIComponent(selectedLead.phoneNumber)}`, {
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsUnderHumanControl(data.isUnderHumanControl);
          setHumanControlAgent(data.session?.agentName || null);
          setHumanControlSession(data.session);
        }
      } catch (error) {
        console.error('Error checking human control status:', error);
      }
    };
    
    checkHumanControlStatus();
  }, [selectedLead, organizationId]);

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

      {/* MINIMAL STATUS BAR - Show call status and human control status */}
      {(isCallActive || isUnderHumanControl) && (
        <div className="flex-shrink-0 mx-4 mt-1 mb-1 space-y-1">
          {isCallActive && (
            <div className="px-3 py-1 bg-green-50 rounded border border-green-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Call Active</span>
                <span className="text-xs">({formatDuration(callDuration)})</span>
              </div>
            </div>
          )}
          
          {isUnderHumanControl && (
            <div className="px-3 py-1 bg-orange-50 rounded border border-orange-200">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <User className="w-3 h-3" />
                <span className="font-medium">Human Control</span>
                <span className="text-xs">({humanControlAgent})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCROLLABLE CONVERSATION AREA */}
      <div className="flex-1 flex flex-col mx-4 mb-4 min-h-0">
        {error && (
          <Alert variant="destructive" className="mb-4 flex-shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Conversation History - Takes up remaining space */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 p-0 relative overflow-hidden">
            <ScrollArea 
              className="w-full h-full"
              ref={scrollAreaRef}
              style={{ 
                '--scrollbar-size': '12px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
              } as React.CSSProperties}
            >
              <div className="space-y-4 py-4 px-6">
                {conversationHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start a conversation!</p>
                    <Button 
                      onClick={() => {
                        // Add some test messages for scrolling test
                        const testMessages = Array.from({ length: 20 }, (_, i) => ({
                          id: `test-${i}`,
                          type: 'sms' as const,
                          content: i % 2 === 0 
                            ? `Test customer message ${i + 1}. This is a longer message to test scrolling behavior.`
                            : `Test agent response ${i + 1}. This is the agent's response to the customer message.`,
                          timestamp: new Date(Date.now() - (20 - i) * 60000).toISOString(),
                          sentBy: i % 2 === 0 ? 'user' as const : 'agent' as const
                        }));
                        setConversationHistory(testMessages);
                        // Force check scroll position after messages are added
                        setTimeout(() => {
                          checkScrollPosition();
                        }, 100);
                      }}
                      className="mt-4 text-xs"
                      size="sm"
                      variant="outline"
                    >
                      🔧 Add Test Messages (Debug)
                    </Button>
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
                              <User className="h-4 w-4 text-orange-600" />
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
                              : message.sentBy === 'human_agent'
                              ? "bg-orange-500 text-white"
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
              <ScrollBar orientation="vertical" />
            </ScrollArea>
            
            {/* Scroll to Bottom Button - Floating when user scrolls up */}
            {showScrollToBottom && (
              <div className="absolute bottom-4 right-4 z-10">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full shadow-lg bg-white border border-gray-200 hover:bg-gray-50"
                  onClick={scrollToBottom}
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  <span className="text-xs">New messages</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INPUT AREA - Fixed at bottom */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isUnderHumanControl ? "Type your message as human agent..." : "Type your message..."}
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isUnderHumanControl) {
                  handleSendHumanMessage();
                } else {
                  handleSendTextMessage();
                }
              }
            }}
          />
          <div className="flex flex-col gap-2">
            {/* Human Control Buttons */}
            {isUnderHumanControl ? (
              <>
                {/* Leave Human Control Button */}
                <Button 
                  onClick={handleLeaveHumanControl}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <Bot className="h-4 w-4 mr-1" />
                  AI Resume
                </Button>
                {/* Send Human Message Button */}
                <Button 
                  onClick={handleSendHumanMessage}
                  disabled={isLoading || !textInput.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {/* Join Human Control Button */}
                <Button 
                  onClick={handleJoinHumanControl}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <User className="h-4 w-4 mr-1" />
                  Join Chat
                </Button>
                
                {/* Call Button */}
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
                {/* Send Button */}
                <Button 
                  onClick={handleSendTextMessage}
                  disabled={isLoading || !textInput.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE QUICK ACCESS TABS - Save space when not needed */}
        <div className="mt-3 border-t border-gray-100 pt-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 font-medium">Quick Info</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsTabsExpanded(!isTabsExpanded)}
            >
              {isTabsExpanded ? (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <User className="w-3 h-3 mr-1" />
                  Show Details
                </>
              )}
            </Button>
          </div>
          
          {isTabsExpanded && (
            <Tabs value={activeQuickTab} onValueChange={(value: any) => setActiveQuickTab(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8 bg-gray-50/80">
                <TabsTrigger value="chat" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <User className="w-3 h-3 mr-1" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Analytics  
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="mt-2 max-h-48 overflow-y-auto bg-gray-50/50 rounded border">
                <TabsContent value="chat" className="m-2 p-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2 mb-1">
                    {isUnderHumanControl ? (
                      <User className="w-4 h-4 text-orange-500" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="font-medium">
                      {isUnderHumanControl ? 'Human Control Active' : 'AI Conversation Active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {conversationHistory.length} messages • Last activity: {selectedLead ? new Date(selectedLead.lastTouchpoint).toLocaleTimeString() : 'Unknown'}
                  </p>
                  {isUnderHumanControl && (
                    <p className="text-xs text-orange-600 mt-1">
                      Controlled by: {humanControlAgent}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="profile" className="m-2 space-y-3">
                  {/* Key Status Info - Always Accessible */}
                  <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-blue-500" />
                        <span className="font-medium text-xs">Status</span>
                      </div>
                      <p className="text-xs text-gray-600">{selectedLead?.chaseStatus}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-green-500" />
                        <span className="font-medium text-xs">Next Action</span>
                      </div>
                      <p className="text-xs text-gray-600">{selectedLead?.nextAction.type}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-purple-500" />
                        <span className="font-medium text-xs">Specialist</span>
                      </div>
                      <p className="text-xs text-gray-600">{selectedLead?.assignedSpecialist || 'Unassigned'}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-orange-500" />
                        <span className="font-medium text-xs">Step</span>
                      </div>
                      <p className="text-xs text-gray-600 capitalize">{selectedLead?.scriptProgress.currentStep}</p>
                    </div>
                  </div>

                  {/* Detailed Profile Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-blue-500" />
                        <span className="font-medium">Contact</span>
                      </div>
                      <div className="ml-5 space-y-1 text-gray-600">
                        <p>{selectedLead?.phoneNumber}</p>
                        {selectedLead?.email && <p>{selectedLead.email}</p>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-purple-500" />
                        <span className="font-medium">Credit</span>
                      </div>
                      <div className="ml-5 space-y-1 text-gray-600">
                        <p>{selectedLead?.creditProfile?.scoreRange || 'Unknown'}</p>
                        <p>{selectedLead?.creditProfile?.knownIssues?.length || 0} issues</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Car className="w-3 h-3 text-green-500" />
                        <span className="font-medium">Vehicle</span>
                      </div>
                      <div className="ml-5 space-y-1 text-gray-600">
                        <p>{selectedLead?.vehicleInterest?.type || 'Not specified'}</p>
                        {selectedLead?.vehicleInterest && (
                          <p>{formatCurrency(selectedLead.vehicleInterest.budget.min)}-{formatCurrency(selectedLead.vehicleInterest.budget.max)}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-green-500" />
                        <span className="font-medium">Funding</span>
                      </div>
                      <div className="ml-5 space-y-1 text-gray-600">
                        <Badge className={getStatusColor(selectedLead?.fundingReadiness || '')} variant="outline">
                          {selectedLead?.fundingReadiness}
                        </Badge>
                        <p className="text-xs">{selectedLead?.sentiment}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="m-2">
                  <ConversationAnalyticsPanel 
                    selectedLead={selectedLead}
                    conversationHistory={conversationHistory}
                    isCallActive={isCallActive}
                  />
                </TabsContent>

                <TabsContent value="settings" className="m-2 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-3 h-3 text-gray-500" />
                      <span className="font-medium text-xs">Quick Actions</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={handleReassignSpecialist}
                        disabled={isUpdating}
                      >
                        <User className="w-3 h-3 mr-1" />
                        Reassign
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => handleContactMethodChange('Voice')}
                        disabled={isUpdating}
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Voice Pref
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => handleContactMethodChange('SMS')}
                        disabled={isUpdating}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        SMS Pref
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => handleContactMethodChange('Email')}
                        disabled={isUpdating}
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Email Pref
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelephonyInterface; 