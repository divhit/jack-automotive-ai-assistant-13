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
import { Switch } from '@/components/ui/switch';
import { 
  Phone, 
  PhoneOff, 
  MessageSquare, 
  Clock,
  User,
  Bot,
  Send,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Settings,
  PhoneCall,
  Car,
  BarChart3,
  ChevronDown,
  Camera,
  Bell,
  Plus,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ConversationAnalyticsPanel } from './ConversationAnalyticsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  // SECURITY: Get organization context
  const { organization, user } = useAuth();
  
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
  
  // NEW: Main tab navigation state
  const [activeMainTab, setActiveMainTab] = useState<'conversation' | 'profile' | 'analytics' | 'settings'>('conversation');
  const [isAutoMode, setIsAutoMode] = useState(true); // Auto vs Manual mode toggle
  
  // ⭐ MANUAL CALLS FEATURE: State for manual call functionality
  const [isManualCallActive, setIsManualCallActive] = useState(false);
  const [manualCallSession, setManualCallSession] = useState<{
    conferenceId?: string;
    status?: string;
    dialInNumber?: string;
    instructions?: string;
  } | null>(null);
  
  // Smart scrolling state
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Human control state
  const [isUnderHumanControl, setIsUnderHumanControl] = useState(false);
  const [humanControlAgent, setHumanControlAgent] = useState<string | null>(null);
  const [humanControlSession, setHumanControlSession] = useState<any>(null);
  const [agentName, setAgentName] = useState('Agent'); // Default agent name for human control
  const [agentPhoneNumber, setAgentPhoneNumber] = useState(''); // Agent's phone number for manual calls

  // Refs for proper debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load agent phone number from the current lead
  useEffect(() => {
    if (selectedLead?.agent_phone) {
      setAgentPhoneNumber(selectedLead.agent_phone);
    }
    if (selectedLead?.agent_name) {
      setAgentName(selectedLead.agent_name);
    }
  }, [selectedLead]);

  // Save agent phone number to the current lead
  const saveAgentPhoneNumber = async (phoneNumber: string, name: string) => {
    console.log('🔍 DEBUG: saveAgentPhoneNumber called', {
      selectedLeadId: selectedLead?.id,
      phoneNumber: phoneNumber?.trim(),
      name: name?.trim(),
      hasSelectedLead: !!selectedLead,
      organization: organization?.id,
      user: user?.id
    });
    
    if (!selectedLead?.id || !phoneNumber.trim() || !name.trim()) {
      console.log('❌ DEBUG: Save validation failed', {
        hasLeadId: !!selectedLead?.id,
        hasPhoneNumber: !!phoneNumber.trim(),
        hasName: !!name.trim()
      });
      return;
    }
    
    try {
      console.log('🔄 DEBUG: Attempting to update leads table', {
        leadId: selectedLead.id,
        updateData: {
          agent_phone: phoneNumber.trim(),
          agent_name: name.trim()
        }
      });
      
      // Update the current lead with agent phone information
      const { data, error } = await supabase
        .from('leads')
        .update({
          agent_phone: phoneNumber.trim(),
          agent_name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id)
        .select();
      
      console.log('🔍 DEBUG: Supabase response', { data, error });
      
      if (error) {
        console.error('❌ Failed to save agent phone number:', error);
        toast.error('Failed to save phone number: ' + error.message);
      } else {
        console.log('✅ Agent phone number saved successfully to lead', data);
        
        // Update memory cache immediately for instant availability
        try {
          const cacheResponse = await fetch('/api/leads/update-agent-phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getOrganizationHeaders(organizationId)
            },
            body: JSON.stringify({
              leadId: selectedLead.id,
              agent_phone: phoneNumber.trim(),
              agent_name: name.trim()
            })
          });
          
          if (cacheResponse.ok) {
            console.log('✅ Memory cache updated immediately');
          }
        } catch (cacheError) {
          console.warn('⚠️ Failed to update memory cache:', cacheError);
        }
        
        toast.success('Phone number saved successfully');
        
        // Update the local lead data if onLeadUpdate is available
        if (onLeadUpdate) {
          onLeadUpdate(selectedLead.id, {
            agent_phone: phoneNumber.trim(),
            agent_name: name.trim()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error saving agent phone number:', error);
      toast.error('Failed to save phone number: ' + error.message);
    }
  };

  // Debounced save function to prevent excessive notifications
  const debouncedSave = useCallback((phoneNumber: string, name: string) => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      if (phoneNumber.trim() && name.trim()) {
        saveAgentPhoneNumber(phoneNumber, name);
      }
    }, 1500); // 1.5 second delay
  }, [saveAgentPhoneNumber]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
        console.log('📝 Transcript added - reloading conversation history immediately');
        // Remove delay and reload immediately for better UX
        loadConversationHistory();
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
        // Also reload conversation history to get any new content immediately
        loadConversationHistory();
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

  // ⭐ MANUAL CALLS FEATURE: Handle manual call initiation
  const handleManualCall = async () => {
    if (!selectedLead) return;
    
    // Validate agent details
    if (!agentName.trim()) {
      toast.error('Please enter your name in the Settings tab first');
      return;
    }
    
    if (!agentPhoneNumber.trim()) {
      toast.error('Please enter your phone number in the Settings tab first');
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
      console.log('📞 Starting manual call to:', selectedLead.phoneNumber, '(org:', organizationId, ')');
      
      // SECURITY: Include organization headers for validation
      const response = await fetch('/api/manual-call/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrganizationHeaders(organizationId)
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id,
          agentName: agentPhoneNumber || agentName, // Use phone number if provided, fallback to name
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
        throw new Error(errorData.error || 'Failed to initiate manual call');
      }

      const result = await response.json();
      
      // SECURITY: Validate that the response is for the correct organization
      if (result.organizationId && result.organizationId !== organizationId) {
        console.error('🚨 SECURITY: Manual call response for different organization:', result.organizationId, 'expected:', organizationId);
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
          ...getOrganizationHeaders(organizationId)
        },
        body: JSON.stringify({
          conferenceId: manualCallSession.conferenceId,
          organizationId: organizationId // SECURITY: Include organization context in request body
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

  // Connect Auto/Manual toggle to human control
  useEffect(() => {
    if (!selectedLead) return;
    
    if (!isAutoMode && !isUnderHumanControl) {
      // Manual mode - join human control to stop AI responses
      console.log('🔄 Switching to Manual mode - joining human control');
      handleJoinHumanControl();
    } else if (isAutoMode && isUnderHumanControl) {
      // Auto mode - leave human control to allow AI responses
      console.log('🔄 Switching to Auto mode - leaving human control');
      handleLeaveHumanControl();
    }
  }, [isAutoMode, selectedLead?.id, isUnderHumanControl, handleJoinHumanControl, handleLeaveHumanControl]);

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
        
        const response = await fetch(`/api/human-control/status/${encodeURIComponent(selectedLead.phoneNumber)}?leadId=${encodeURIComponent(selectedLead.id)}`, {
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsUnderHumanControl(data.isUnderHumanControl);
          setHumanControlAgent(data.session?.agentName || null);
          setHumanControlSession(data.session);
          
          // Sync the auto/manual toggle with human control status
          setIsAutoMode(!data.isUnderHumanControl);
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

      {/* MINIMAL STATUS BAR - Show call status, human control status, and manual call status */}
      {(isCallActive || isUnderHumanControl || isManualCallActive) && (
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
          
          {/* ⭐ MANUAL CALLS FEATURE: Show manual call conference info */}
          {isManualCallActive && manualCallSession && (
            <div className="px-3 py-1 bg-blue-50 rounded border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Phone className="w-3 h-3" />
                <span className="font-medium">Manual Call Active</span>
                <span className="text-xs">Conference: {manualCallSession.conferenceId}</span>
              </div>
              {manualCallSession.dialInNumber && (
                <div className="text-xs text-blue-600 mt-1">
                  Dial: {manualCallSession.dialInNumber}
                </div>
              )}
            </div>
          )}
        </div>
      )}

            {/* MAIN TABS & CONTENT */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <Alert variant="destructive" className="mb-4 flex-shrink-0 mx-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeMainTab} onValueChange={(value: any) => setActiveMainTab(value)} className="flex-1 flex flex-col min-h-0">
          {/* TABS LIST - Fixed at top */}
          <div className="flex-shrink-0 mx-4 mb-2">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-gray-50">
              <TabsTrigger value="conversation" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                Conversation
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* CONVERSATION TAB */}
          <TabsContent value="conversation" className="flex-1 flex flex-col min-h-0 mt-0 mx-4 mb-4">
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
                                <div className="flex items-center gap-2">
                                  <span>{formatMessageTime(message.timestamp)}</span>
                                  {/* Message type indicator like BICI */}
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-xs font-medium",
                                    message.type === 'voice' ? "bg-purple-100 text-purple-800" :
                                    message.type === 'sms' ? "bg-blue-100 text-blue-800" :
                                    message.type === 'call' ? "bg-green-100 text-green-800" :
                                    "bg-gray-100 text-gray-800"
                                  )}>
                                    {message.type === 'voice' ? '🎤 Voice' :
                                     message.type === 'sms' ? '📱 SMS' :
                                     message.type === 'call' ? '📞 Call' :
                                     '⚙️ System'}
                                  </span>
                                </div>
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
          </TabsContent>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="p-4 space-y-4 overflow-y-auto mt-0 mx-4">
            {/* Identity & Contact Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Identity & Contact</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <Input 
                    value={selectedLead?.customerName || ''} 
                    placeholder="Enter full name"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <Input 
                    value={selectedLead?.phoneNumber || ''} 
                    placeholder="(555) 123-4567"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email Address</label>
                  <Input 
                    value={selectedLead?.email || ''} 
                    placeholder="Enter email address"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <Input 
                    placeholder="2025-07-16"
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">SSN (Last 4)</label>
                  <Input 
                    placeholder="XXXX"
                    maxLength={4}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Driver's License</label>
                  <Input 
                    placeholder="License number"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Residence & Housing Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">Residence & Housing</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Current Address</label>
                  <Input 
                    placeholder="Street address"
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <Input 
                      placeholder="City"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <Input 
                      placeholder="State"
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">ZIP Code</label>
                    <Input 
                      placeholder="ZIP code"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Length at Address</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                      <option>Select duration</option>
                      <option>Less than 1 year</option>
                      <option>1-2 years</option>
                      <option>2-5 years</option>
                      <option>5+ years</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Housing Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                      <option>Select status</option>
                      <option>Own</option>
                      <option>Rent</option>
                      <option>Living with family</option>
                      <option>Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Monthly Housing Payment</label>
                    <Input 
                      placeholder="$0"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="p-4 space-y-4 overflow-y-auto mt-0 mx-4">
            {/* Top Row Stats */}
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Lead Status</span>
                </div>
                <div className="text-lg font-semibold text-blue-600">Warm</div>
                <div className="text-xs text-gray-500">routing</div>
                <div className="text-xs text-gray-500">8 days in pipeline</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Progress</span>
                </div>
                <div className="text-lg font-semibold">Info Gathered</div>
                <div className="text-sm text-green-600 font-medium">72%</div>
                <div className="text-xs text-gray-500">Est. 6 days to close</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Lead Score</span>
                </div>
                <div className="text-3xl font-bold text-orange-600">69</div>
                <div className="text-xs text-gray-500">Average</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '69%'}}></div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Contact Activity</span>
                </div>
                <div className="text-2xl font-bold">6</div>
                <div className="text-xs text-gray-500">total attempts</div>
                <div className="text-xs text-gray-500">22h since last</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Conversion</span>
                </div>
                <div className="text-2xl font-bold text-green-600">36%</div>
                <div className="text-xs text-gray-500">Low probability</div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  This Lead's Contact Methods
                </h4>
                <div className="w-32 h-32 mx-auto mb-4 relative">
                  <div className="w-full h-full rounded-full border-8" 
                       style={{borderColor: '#3b82f6 #10b981 #f59e0b transparent', borderStyle: 'solid'}}>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Phone Calls
                    </span>
                    <span className="font-medium">60%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Text Messages
                    </span>
                    <span className="font-medium">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      Emails
                    </span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Based on 6 total contacts</div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  This Lead's Response Times
                </h4>
                <div className="w-32 h-32 mx-auto mb-4 relative">
                  <div className="w-full h-full rounded-full border-8" 
                       style={{borderColor: '#3b82f6 #10b981 #f59e0b #ef4444', borderStyle: 'solid'}}>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Quick (&lt;4h)
                    </span>
                    <span className="font-medium">60%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      Same Day (4-12h)
                    </span>
                    <span className="font-medium">30%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      Next Day (12-24h)
                    </span>
                    <span className="font-medium">25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      Delayed (&gt;24h)
                    </span>
                    <span className="font-medium">15%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Historical response patterns</div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  This Lead's Best Times
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-end h-20">
                    <div className="flex flex-col items-center">
                      <div className="bg-blue-500 rounded" style={{height: '30px', width: '16px'}}></div>
                      <span className="text-xs mt-1">9AM</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-blue-500 rounded" style={{height: '15px', width: '16px'}}></div>
                      <span className="text-xs mt-1">12PM</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-blue-500 rounded" style={{height: '45px', width: '16px'}}></div>
                      <span className="text-xs mt-1">3PM</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="bg-blue-500 rounded" style={{height: '25px', width: '16px'}}></div>
                      <span className="text-xs mt-1">6PM</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">When this lead responds most</div>
                </div>
              </div>
            </div>

            {/* Last Message */}
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Last Message
              </h4>
              <div className="bg-gray-50 p-3 rounded italic text-sm">
                "Thanks for the info! I'll think about it and get back to you."
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>22h ago</span>
                <span>From customer</span>
              </div>
            </div>

            {/* Contact Timeline */}
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Contact Timeline
              </h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div>Timeline visualization would go here...</div>
              </div>
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="p-4 space-y-4 overflow-y-auto mt-0 mx-4">
            {/* AGENT PHONE NUMBER SETUP - For manual calls */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 text-lg">Manual Call Setup</span>
                <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-700 border-green-300">
                  Required for Manual Calls
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-green-700 mb-2 block">Agent Name</label>
                  <Input
                    type="text"
                    value={agentName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setAgentName(newName);
                      // Use debounced save to prevent excessive notifications
                      debouncedSave(agentPhoneNumber, newName);
                    }}
                    placeholder="Enter your name (e.g., John Smith)"
                    className="border-green-200 focus:border-green-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-green-700 mb-2 block">Phone Number</label>
                  <Input
                    type="tel"
                    value={agentPhoneNumber}
                    onChange={(e) => {
                      const newPhoneNumber = e.target.value;
                      setAgentPhoneNumber(newPhoneNumber);
                      // Use debounced save to prevent excessive notifications
                      debouncedSave(newPhoneNumber, agentName);
                    }}
                    placeholder="Enter your phone number (e.g., +1234567890)"
                    className="border-green-200 focus:border-green-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>You will be called first, then customer will be automatically conferenced in</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {/* Auto-Chase */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <h4 className="font-medium">Auto-Chase</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active</span>
                    <Switch checked={true} />
                  </div>
                  <div className="text-xs text-gray-500">Automated follow-up sequences</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <h4 className="font-medium">Quick Actions</h4>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <User className="w-3 h-3 mr-2" />
                    Transfer Lead
                  </Button>
                  <Button variant="destructive" size="sm" className="w-full justify-start">
                    Archive Lead
                  </Button>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-medium">Notifications</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Call Events</span>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Text Messages</span>
                    <Switch checked={true} />
                  </div>
                  <div className="text-xs text-gray-500">Notify specialists of lead activity</div>
                </div>
              </div>

              {/* Pursuit Level */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  <h4 className="font-medium">Pursuit Level</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Gentle</span>
                    <span>Aggressive</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: '60%'}}></div>
                  </div>
                  <div className="text-xs text-gray-500">Controls frequency & persistence</div>
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Priority Level */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h4 className="font-medium">Priority Level</h4>
                </div>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>

              {/* Contact Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-500" />
                  <h4 className="font-medium">Contact Settings</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="font-medium">Method</div>
                    <select className="w-full mt-1 px-2 py-1 border rounded text-xs">
                      <option>Phone Calls</option>
                      <option>SMS</option>
                      <option>Email</option>
                    </select>
                  </div>
                  <div>
                    <div className="font-medium">Best Time</div>
                    <select className="w-full mt-1 px-2 py-1 border rounded text-xs">
                      <option>Business Hours</option>
                      <option>Evenings</option>
                      <option>Weekends</option>
                    </select>
                  </div>
                  <div>
                    <div className="font-medium">Restrictions</div>
                    <select className="w-full mt-1 px-2 py-1 border rounded text-xs">
                      <option>No Restrictions</option>
                      <option>Weekdays Only</option>
                      <option>After 5PM</option>
                    </select>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Configure how and when to reach this lead</div>
              </div>

              {/* AI Tools */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <h4 className="font-medium">AI Tools</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Smart Responses</span>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mood Detection</span>
                    <Switch checked={true} />
                  </div>
                  <div className="text-xs text-gray-500">AI analyzes conversations and suggests optimal responses</div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* INPUT AREA & ACTION BUTTONS - Only show for conversation tab */}
          {activeMainTab === 'conversation' && (
            <>
              {/* INPUT AREA - Fixed at bottom */}
              <div className="flex-shrink-0 mx-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={isAutoMode ? "Agent can send manual messages..." : "Type your message..."}
                    className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                    disabled={false}
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
                  
                  {/* Auto/Manual Toggle */}
                  <div className="flex flex-col items-center gap-1 px-3 py-3 bg-gray-50 rounded-lg border">
                    <span className={cn("text-xs font-medium", isAutoMode ? "text-blue-600" : "text-gray-400")}>AUTO</span>
                    <Switch
                      checked={!isAutoMode}
                      onCheckedChange={(checked) => setIsAutoMode(!checked)}
                      className="data-[state=checked]:bg-orange-600"
                    />
                    <span className={cn("text-xs font-medium", !isAutoMode ? "text-orange-600" : "text-gray-400")}>MANUAL</span>
                  </div>
                  
                  {/* Call Buttons */}
                  <div className="flex flex-col gap-2">
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
                          title={!agentName.trim() || !agentPhoneNumber.trim() ? "Please enter your name and phone number in Settings tab" : "Start manual call"}
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
                    
                    {/* Send Button - always available */}
                    <Button 
                      onClick={isUnderHumanControl ? handleSendHumanMessage : handleSendTextMessage}
                      disabled={isLoading || !textInput.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS - Fixed at bottom */}
              <div className="flex-shrink-0 mx-4 mb-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-10 text-sm"
                    disabled={true}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Follow Up + Photos
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-10 text-sm"
                    disabled={true}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Gentle Reminder
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-10 text-sm"
                    disabled={true}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Options
                  </Button>
                </div>
              </div>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TelephonyInterface; 