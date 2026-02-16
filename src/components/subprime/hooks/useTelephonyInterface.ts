// Custom hook: useTelephonyInterface
// Extracted ALL business logic from TelephonyInterface-fixed.tsx
// This is a pure logic extraction - no JSX rendering is included.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  type: 'sms' | 'call' | 'system' | 'voice';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system' | 'human_agent';
  status?: 'sent' | 'delivered' | 'failed';
}

export interface ManualCallSession {
  conferenceId?: string;
  status?: string;
  dialInNumber?: string;
  instructions?: string;
}

export interface LiveTranscript {
  content: string;
  speaker: string;
  timestamp: string;
}

// ─── Security helper ─────────────────────────────────────────────────

// SECURITY: Helper function to get organization headers - NO FALLBACKS TO PREVENT CROSS-ORG DATA LEAKAGE
const getOrganizationHeaders = (organizationId?: string) => {
  if (!organizationId) {
    console.error('SECURITY: No organizationId provided - refusing to make API calls that could leak cross-organization data');
    throw new Error('Organization context required - please refresh the page');
  }
  return { 'organizationId': organizationId };
};

// ─── Hook ────────────────────────────────────────────────────────────

export function useTelephonyInterface(
  selectedLead: SubprimeLead | null,
  organizationId: string,
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void
) {
  // SECURITY: Get organization context
  const { organization, user } = useAuth();

  // DEBUG: Log organization context being used
  console.log('TelephonyInterface - Organization Context Debug:', {
    organizationId: organizationId,
    selectedLeadId: selectedLead?.id,
    selectedLeadPhone: selectedLead?.phoneNumber,
    hasOrganizationId: !!organizationId,
    isDefaultOrg: organizationId === 'default-org'
  });

  // ─── State management ──────────────────────────────────────────────

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

  // Real-time Supabase integration state
  const [leadData, setLeadData] = useState<any>(null);
  const [profileFormData, setProfileFormData] = useState<any>({});
  const [analyticsData, setAnalyticsData] = useState<any>({});
  const [settingsData, setSettingsData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Main tab navigation state
  const [activeMainTab, setActiveMainTab] = useState<'conversation' | 'profile' | 'analytics' | 'settings'>('conversation');
  const [isAutoMode, setIsAutoMode] = useState(true); // Auto vs Manual mode toggle

  // Manual calls state
  const [isManualCallActive, setIsManualCallActive] = useState(false);
  const [manualCallSession, setManualCallSession] = useState<ManualCallSession | null>(null);

  // Smart scrolling state
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Human control state
  const [isUnderHumanControl, setIsUnderHumanControl] = useState(false);
  const [humanControlAgent, setHumanControlAgent] = useState<string | null>(null);
  const [humanControlSession, setHumanControlSession] = useState<any>(null);
  const [agentName, setAgentName] = useState('Agent');
  const [agentPhoneNumber, setAgentPhoneNumber] = useState('');

  // NEW: Live transcripts state for real-time voice transcription
  const [liveTranscripts, setLiveTranscripts] = useState<Map<string, LiveTranscript>>(new Map());

  // ─── Refs ──────────────────────────────────────────────────────────

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ─── Helper / Utility functions ────────────────────────────────────

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '\u{1F60A}';
      case 'Neutral': return '\u{1F610}';
      case 'Negative': return '\u{1F615}';
      case 'Frustrated': return '\u{1F624}';
      case 'Ghosted': return '\u{1F47B}';
      default: return '\u{1F914}';
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  // ─── Analytics helper functions ────────────────────────────────────

  const calculateContactMethodPercentage = (method: string) => {
    const totalSMS = leadData?.total_sms_messages || 0;
    const totalVoice = leadData?.total_voice_calls || 0;
    const totalContacts = totalSMS + totalVoice;

    if (totalContacts === 0) {
      switch (method) {
        case 'phone': return 50;
        case 'sms': return 40;
        case 'email': return 10;
        default: return 0;
      }
    }

    if (method === 'phone') {
      return Math.round((totalVoice / totalContacts) * 100);
    } else if (method === 'sms') {
      return Math.round((totalSMS / totalContacts) * 100);
    } else if (method === 'email') {
      return Math.max(0, 100 - Math.round(((totalVoice + totalSMS) / totalContacts) * 100));
    }
    return 0;
  };

  const calculateResponseTimePercentage = (timeType: string) => {
    const responseTimeAvg = leadData?.response_time_avg;
    if (!responseTimeAvg) {
      const defaults: Record<string, number> = { quick: 40, same_day: 35, next_day: 20, delayed: 5 };
      return defaults[timeType] || 0;
    }

    const avgHours = parseFloat(responseTimeAvg.split(':')[0]) + parseFloat(responseTimeAvg.split(':')[1]) / 60;

    if (timeType === 'quick') return avgHours < 4 ? 70 : 20;
    if (timeType === 'same_day') return avgHours >= 4 && avgHours < 12 ? 60 : 25;
    if (timeType === 'next_day') return avgHours >= 12 && avgHours < 24 ? 50 : 15;
    if (timeType === 'delayed') return avgHours >= 24 ? 80 : 10;
    return 0;
  };

  const getResponseTimeHistory = () => {
    return conversationHistory.filter(msg => msg.sentBy === 'user');
  };

  const getLastMessage = () => {
    if (conversationHistory.length === 0) return null;
    return conversationHistory[conversationHistory.length - 1];
  };

  const getBestContactTimes = () => {
    const bestTimes = leadData?.best_contact_times || ['9AM', '12PM', '3PM', '6PM'];
    const contactAttempts = analyticsData.contactAttempts || 1;

    return ['9AM', '12PM', '3PM', '6PM'].map(time => {
      const isPreferred = bestTimes.includes(time);
      let percentage = isPreferred ? 60 : 20;

      if (analyticsData.leadScore > 70) percentage += 10;
      if (analyticsData.leadScore < 30) percentage -= 10;

      return {
        time,
        percentage: Math.max(10, Math.min(60, percentage))
      };
    });
  };

  // ─── Conversation message management ───────────────────────────────

  const addConversationMessage = useCallback((message: ConversationMessage) => {
    setConversationHistory(prev => {
      // Avoid duplicates based on content and timestamp
      const exists = prev.some(msg =>
        msg.content === message.content &&
        Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000
      );
      return exists ? prev : [...prev, message];
    });
  }, []);

  // ─── Scroll functions ──────────────────────────────────────────────

  const checkScrollPosition = useCallback(() => {
    if (!scrollAreaRef.current) return;

    const possibleSelectors = [
      '[data-radix-scroll-area-viewport]',
      '.radix-scroll-area-viewport',
      '[data-scroll-area-viewport]',
      '.scroll-area-viewport'
    ];

    let scrollContainer: Element | null = null;
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
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer as HTMLElement;
      const threshold = 100;
      const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;

      setIsNearBottom(nearBottom);
      setShowScrollToBottom(!nearBottom && conversationHistory.length > 0);
    }
  }, [conversationHistory.length]);

  const scrollToBottom = useCallback(() => {
    if (!scrollAreaRef.current) return;

    const possibleSelectors = [
      '[data-radix-scroll-area-viewport]',
      '.radix-scroll-area-viewport',
      '[data-scroll-area-viewport]',
      '.scroll-area-viewport'
    ];

    let scrollContainer: Element | null = null;
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
      (scrollContainer as HTMLElement).scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
      console.log('Scrolling to bottom of container');
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      console.log('Using fallback scrollIntoView');
    }
    setShowScrollToBottom(false);
    setIsNearBottom(true);
  }, []);

  // ─── Supabase CRUD ─────────────────────────────────────────────────

  const loadLeadFromSupabase = useCallback(async () => {
    if (!selectedLead?.id || !organizationId) return;

    try {
      setIsLoading(true);
      const { data: rows, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', selectedLead.id)
        .eq('organization_id', organizationId)
        .limit(1);

      if (error) throw error;

      const data = rows?.[0];
      if (data) {
        setLeadData(data);
        setProfileFormData({
          customerName: data.customer_name || '',
          phoneNumber: data.phone_number || '',
          email: data.email || '',
          dateOfBirth: data.date_of_birth || '',
          ssnLast4: data.ssn_last_4 || '',
          driversLicense: data.drivers_license || '',
          currentAddress: data.current_address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zip_code || '',
          lengthAtAddress: data.length_at_address || '',
          housingStatus: data.housing_status || '',
          monthlyHousingPayment: data.monthly_housing_payment || ''
        });
        setAnalyticsData({
          leadScore: data.lead_score || 0,
          conversionProbability: data.conversion_probability || 0.36,
          contactAttempts: data.contact_attempts || 0,
          fundingReadiness: data.funding_readiness || 'Not Ready',
          sentiment: data.sentiment || 'Neutral',
          chaseStatus: data.chase_status || 'Inactive'
        });
        setSettingsData({
          agentName: data.agent_name || '',
          agentPhone: data.agent_phone || '',
          autoChaseEnabled: data.auto_chase_enabled || false,
          notificationsEnabled: data.notifications_enabled || true,
          smartResponsesEnabled: data.smart_responses_enabled || true,
          moodDetectionEnabled: data.mood_detection_enabled || true,
          priorityLevel: data.priority_level || 'Normal'
        });
      }
    } catch (err: any) {
      console.error('Error loading lead from Supabase:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead?.id, organizationId]);

  const saveLeadToSupabase = useCallback(async (updates: any) => {
    if (!selectedLead?.id || !organizationId) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');

      const { data: rows, error } = await supabase
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id)
        .eq('organization_id', organizationId)
        .select()
        .limit(1);

      if (error) throw error;

      setSaveStatus('saved');
      toast.success('Changes saved successfully');

      const data = rows?.[0];
      if (data) {
        setLeadData(data);
      }

      // Auto-hide saved status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);

    } catch (err: any) {
      console.error('Error saving lead to Supabase:', err);
      setSaveStatus('error');
      toast.error('Failed to save changes: ' + err.message);

      // Auto-hide error status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [selectedLead?.id, organizationId]);

  const debouncedSaveProfile = useCallback((fieldName: string, value: any) => {
    // Update local state immediately for responsive UI
    setProfileFormData((prev: any) => ({ ...prev, [fieldName]: value }));

    // Debounced save to database
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const dbFieldMap: Record<string, string> = {
        customerName: 'customer_name',
        phoneNumber: 'phone_number',
        email: 'email',
        dateOfBirth: 'date_of_birth',
        ssnLast4: 'ssn_last_4',
        driversLicense: 'drivers_license',
        currentAddress: 'current_address',
        city: 'city',
        state: 'state',
        zipCode: 'zip_code',
        lengthAtAddress: 'length_at_address',
        housingStatus: 'housing_status',
        monthlyHousingPayment: 'monthly_housing_payment'
      };

      const dbFieldName = dbFieldMap[fieldName] || fieldName;
      saveLeadToSupabase({ [dbFieldName]: value });
    }, 1000);
  }, [saveLeadToSupabase]);

  // ─── Agent phone number save ───────────────────────────────────────

  const saveAgentPhoneNumber = useCallback(async (phoneNumber: string, name: string) => {
    console.log('DEBUG: saveAgentPhoneNumber called', {
      selectedLeadId: selectedLead?.id,
      phoneNumber: phoneNumber?.trim(),
      name: name?.trim(),
      hasSelectedLead: !!selectedLead,
      organization: organization?.id,
      user: user?.id
    });

    if (!selectedLead?.id || !phoneNumber.trim() || !name.trim()) {
      console.log('DEBUG: Save validation failed', {
        hasLeadId: !!selectedLead?.id,
        hasPhoneNumber: !!phoneNumber.trim(),
        hasName: !!name.trim()
      });
      return;
    }

    try {
      console.log('DEBUG: Attempting to update leads table', {
        leadId: selectedLead.id,
        updateData: {
          agent_phone: phoneNumber.trim(),
          agent_name: name.trim()
        }
      });

      const { data, error } = await supabase
        .from('leads')
        .update({
          agent_phone: phoneNumber.trim(),
          agent_name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id)
        .select();

      console.log('DEBUG: Supabase response', { data, error });

      if (error) {
        console.error('Failed to save agent phone number:', error);
        toast.error('Failed to save phone number: ' + error.message);
      } else {
        console.log('Agent phone number saved successfully to lead', data);

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
            console.log('Memory cache updated immediately');
          }
        } catch (cacheError) {
          console.warn('Failed to update memory cache:', cacheError);
        }

        toast.success('Phone number saved successfully');

        if (onLeadUpdate) {
          onLeadUpdate(selectedLead.id, {
            agent_phone: phoneNumber.trim(),
            agent_name: name.trim()
          });
        }
      }
    } catch (err: any) {
      console.error('Error saving agent phone number:', err);
      toast.error('Failed to save phone number: ' + err.message);
    }
  }, [selectedLead?.id, organizationId, organization?.id, user?.id, onLeadUpdate]);

  // Debounced save function to prevent excessive notifications
  const debouncedSave = useCallback((phoneNumber: string, name: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (phoneNumber.trim() && name.trim()) {
        saveAgentPhoneNumber(phoneNumber, name);
      }
    }, 1500);
  }, [saveAgentPhoneNumber]);

  // ─── Conversation history loading ──────────────────────────────────

  const loadConversationHistory = useCallback(async () => {
    if (!selectedLead) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading conversation history for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ') (org:', organizationId, ')');

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
      console.log('Loaded conversation history:', data);

      // SECURITY: Validate that the returned data is for the correct organization
      if (data.organizationId && data.organizationId !== organizationId) {
        console.error('SECURITY: Received conversation data for different organization:', data.organizationId, 'expected:', organizationId);
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
        console.log('Formatted', formattedMessages.length, 'conversation messages for org:', organizationId);
      }

    } catch (err: any) {
      console.error('Error loading conversation history:', err);
      setError(err.message || 'Failed to load conversation history');

      // SECURITY: Clear any potentially contaminated data
      setConversationHistory([]);

      if (err.message?.includes('different organization') || err.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot access data from different organization');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, organizationId]);

  // ─── SSE / Real-time event handling ────────────────────────────────

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Closing SSE connection for lead:', selectedLead?.id);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, [selectedLead?.id]);

  const handleRealTimeUpdate = useCallback((data: any) => {
    console.log('Real-time update received:', data);

    switch (data.type) {
      case 'connected':
        console.log('Connected to real-time stream for lead:', data.leadId);
        break;

      case 'conversation_history':
        // Load conversation history from Supabase via SSE
        if (data.messages && Array.isArray(data.messages)) {
          console.log('Loading conversation history from SSE:', data.messages.length, 'messages');
          setConversationHistory(data.messages);

          if (data.summary) {
            const lastMsg = data.messages[data.messages.length - 1];
            const summaryTimestamp = lastMsg?.timestamp
              ? new Date(new Date(lastMsg.timestamp).getTime() + 1000).toISOString()
              : new Date().toISOString();
            addConversationMessage({
              id: `loaded-summary-${Date.now()}`,
              type: 'system',
              content: `Previous Call Summary: ${data.summary}`,
              timestamp: summaryTimestamp,
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
        // Reload conversation history after call ends to get transcript
        console.log('Call ended - reloading conversation history to get transcript');
        setTimeout(() => {
          loadConversationHistory();
        }, 1000);
        break;

      case 'conversation_transcript_added':
        // Auto-reload conversation history when transcript is added
        console.log('Transcript added - reloading conversation history immediately');
        loadConversationHistory();
        break;

      case 'post_call_summary':
        if (data.summary) {
          addConversationMessage({
            id: `summary-${Date.now()}`,
            type: 'system',
            content: `Previous Conversation Summary: ${data.summary}`,
            timestamp: data.timestamp || new Date().toISOString(),
            sentBy: 'system'
          });
        }
        // Also reload conversation history to get any new content immediately
        loadConversationHistory();
        break;

      case 'lead_profile_updated':
        // Refresh lead data when profile is updated
        if (data.leadId === selectedLead?.id) {
          console.log('Lead profile updated, refreshing UI');
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
          content: `Human agent ${data.agentName} joined the conversation`,
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
          content: 'AI agent resumed control of the conversation',
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

      // ─── NEW real-time voice transcript cases ────────────────────
      case 'live_transcript':
        setLiveTranscripts(prev => {
          const next = new Map(prev);
          next.set(data.speaker || 'user', {
            content: data.message,
            speaker: data.speaker || 'user',
            timestamp: data.timestamp || new Date().toISOString()
          });
          return next;
        });
        break;

      case 'conversation_user':
        addConversationMessage({
          id: `voice-user-${Date.now()}`,
          type: 'voice',
          content: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'user',
          status: 'delivered'
        });
        setLiveTranscripts(prev => {
          const next = new Map(prev);
          next.delete('user');
          return next;
        });
        break;

      case 'conversation_agent':
        addConversationMessage({
          id: `voice-agent-${Date.now()}`,
          type: 'voice',
          content: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'agent',
          status: 'delivered'
        });
        setLiveTranscripts(prev => {
          const next = new Map(prev);
          next.delete('agent');
          return next;
        });
        break;

      case 'interruption':
        addConversationMessage({
          id: `interruption-${Date.now()}`,
          type: 'system',
          content: 'User interrupted the agent',
          timestamp: data.timestamp || new Date().toISOString(),
          sentBy: 'system'
        });
        break;

      case 'error':
        console.error('SSE Error:', data.message);
        setError(data.message || 'Connection error');
        break;

      default:
        console.log('Unknown real-time update type:', data.type);
    }
  }, [addConversationMessage, scrollToBottom, loadConversationHistory, selectedLead?.id]);

  const setupEventSource = useCallback(() => {
    if (!selectedLead) return;

    closeEventSource(); // Close existing connection

    // SECURITY: Include organization validation in SSE connection
    const eventSource = new EventSource(
      `/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}&load=true&organizationId=${encodeURIComponent(organizationId)}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection established for lead:', selectedLead.id, '(phone:', selectedLead.phoneNumber, ') (org:', organizationId, ')');
      console.log('SSE URL:', `/api/stream/conversation/${selectedLead.id}?phoneNumber=${encodeURIComponent(selectedLead.phoneNumber)}&load=true&organizationId=${encodeURIComponent(organizationId)}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE message received:', data.type, data);

        // SECURITY: Validate that the message is for the correct organization
        if (data.organizationId && data.organizationId !== organizationId) {
          console.error('SECURITY: Received SSE message for different organization:', data.organizationId, 'expected:', organizationId);
          return;
        }

        handleRealTimeUpdate(data);
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error for lead:', selectedLead.id, err);

      if (eventSource.readyState === EventSource.CLOSED && selectedLead && selectedLead.id) {
        console.log('SSE connection closed, attempting reconnection for lead:', selectedLead.id);
        setTimeout(() => {
          if (selectedLead && selectedLead.id && eventSourceRef.current === eventSource) {
            setupEventSource();
          }
        }, 2000);
      }
    };
  }, [selectedLead, organizationId, closeEventSource, handleRealTimeUpdate]);

  // ─── Call handlers ─────────────────────────────────────────────────

  const handleStartVoiceCall = useCallback(async () => {
    if (!selectedLead) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting voice call to:', selectedLead.phoneNumber, '(org:', organizationId, ')');

      const response = await fetch('/api/elevenlabs/outbound-call/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrganizationHeaders(organizationId)
        },
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          leadId: selectedLead.id,
          organizationId: organizationId
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
        console.error('SECURITY: Call response for different organization:', result.organizationId, 'expected:', organizationId);
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

    } catch (err: any) {
      console.error('Error starting voice call:', err);
      setError(err.message || 'Failed to start voice call. Please try again.');

      if (err.message?.includes('different organization') || err.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot initiate call - access denied');
      } else {
        toast.error(err.message || 'Failed to start call');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, organizationId, addConversationMessage]);

  const handleEndCall = useCallback(async () => {
    if (!isCallActive) return;

    console.log('Ending voice call');
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
  }, [isCallActive, callDuration, addConversationMessage]);

  // ─── Manual call handlers ──────────────────────────────────────────

  const handleManualCall = useCallback(async () => {
    if (!selectedLead) return;

    if (!agentName.trim()) {
      toast.error('Please enter your name in the Settings tab first');
      return;
    }

    if (!agentPhoneNumber.trim()) {
      toast.error('Please enter your phone number in the Settings tab first');
      return;
    }

    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(agentPhoneNumber.trim())) {
      toast.error('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting manual call to:', selectedLead.phoneNumber, '(org:', organizationId, ')');

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
          organizationId: organizationId
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
        console.error('SECURITY: Manual call response for different organization:', result.organizationId, 'expected:', organizationId);
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

        if (result.instructions) {
          toast.info(result.instructions, { duration: 10000 });
        }
      } else {
        throw new Error(result.message || 'Failed to initiate manual call');
      }

    } catch (err: any) {
      console.error('Error starting manual call:', err);
      setError(err.message || 'Failed to start manual call. Please try again.');

      if (err.message?.includes('different organization') || err.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot initiate manual call - access denied');
      } else {
        toast.error(err.message || 'Failed to start manual call');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, organizationId, agentName, agentPhoneNumber, addConversationMessage]);

  const handleEndManualCall = useCallback(async () => {
    if (!isManualCallActive || !manualCallSession) return;

    setIsLoading(true);

    try {
      console.log('Ending manual call:', manualCallSession.conferenceId);

      const response = await fetch('/api/manual-call/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getOrganizationHeaders(organizationId)
        },
        body: JSON.stringify({
          conferenceId: manualCallSession.conferenceId,
          organizationId: organizationId
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

    } catch (err: any) {
      console.error('Error ending manual call:', err);
      toast.error(err.message || 'Failed to end manual call');
    } finally {
      setIsLoading(false);
    }
  }, [isManualCallActive, manualCallSession, organizationId, addConversationMessage]);

  // ─── SMS handler ───────────────────────────────────────────────────

  const handleSendTextMessage = useCallback(async () => {
    if (!selectedLead || !textInput.trim()) return;

    setIsLoading(true);
    const messageText = textInput.trim();
    setTextInput(''); // Clear input immediately for better UX

    try {
      console.log('Sending SMS to:', selectedLead.phoneNumber, 'Message:', messageText, '(org:', organizationId, ')');

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
          organizationId: organizationId
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
        console.error('SECURITY: SMS response for different organization:', result.organizationId, 'expected:', organizationId);
        throw new Error('Security violation - response from different organization');
      }

      toast.success(`SMS sent to ${selectedLead.phoneNumber}`);
      console.log('SMS sent successfully for org:', organizationId, '- message will appear via SSE stream');

    } catch (err: any) {
      console.error('Error sending SMS:', err);
      setError(err.message || 'Failed to send SMS. Please try again.');

      if (err.message?.includes('different organization') || err.message?.includes('Access denied')) {
        toast.error('Security Error: Cannot send SMS - access denied');
      } else {
        toast.error(err.message || 'Failed to send SMS');
      }

      setTextInput(messageText); // Restore message on error
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, textInput, organizationId]);

  // ─── Human control handlers ────────────────────────────────────────

  const handleJoinHumanControl = useCallback(async () => {
    if (!selectedLead) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
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

    } catch (err: any) {
      console.error('Error joining human control:', err);
      setError(`Failed to join conversation: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      const headers: Record<string, string> = {
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

    } catch (err: any) {
      console.error('Error leaving human control:', err);
      setError(`Failed to leave conversation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to leave conversation');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, organizationId]);

  const handleSendHumanMessage = useCallback(async (message?: string) => {
    const msg = message || textInput;
    if (!selectedLead || !msg.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...getOrganizationHeaders(organizationId)
      };

      const response = await fetch('/api/human-control/send-message', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phoneNumber: selectedLead.phoneNumber,
          message: msg.trim(),
          leadId: selectedLead.id,
          agentName: agentName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      if (!message) setTextInput('');
      toast.success('Message sent');

    } catch (err: any) {
      console.error('Error sending human message:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLead, textInput, agentName, organizationId]);

  // ─── Reassign & contact method helpers ─────────────────────────────

  const handleReassignSpecialist = useCallback(async () => {
    if (!selectedLead) return;
    setIsUpdating(true);

    const specialists = ['Andrea', 'Ian', 'Kayam'] as const;
    const currentIndex = specialists.indexOf(selectedLead.assignedSpecialist || 'Andrea');
    const nextSpecialist = specialists[(currentIndex + 1) % specialists.length];

    try {
      await onLeadUpdate?.(selectedLead.id, { assignedSpecialist: nextSpecialist });
      toast.success(`Reassigned to ${nextSpecialist}`);
    } catch (err) {
      toast.error('Failed to reassign specialist');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedLead, onLeadUpdate]);

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
    } catch (err) {
      toast.error('Failed to update contact method');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedLead, onLeadUpdate]);

  // ─── Effects ───────────────────────────────────────────────────────

  // Load agent phone number from the current lead
  useEffect(() => {
    if (selectedLead?.agent_phone) {
      setAgentPhoneNumber(selectedLead.agent_phone);
    }
    if (selectedLead?.agent_name) {
      setAgentName(selectedLead.agent_name);
    }
  }, [selectedLead]);

  // Load lead data on mount and when selectedLead changes
  useEffect(() => {
    if (selectedLead?.id) {
      loadLeadFromSupabase();
    }
  }, [selectedLead?.id, loadLeadFromSupabase]);

  // Real-time subscription to lead updates
  useEffect(() => {
    if (!selectedLead?.id || !organizationId) return;

    const subscription = supabase
      .channel(`lead_${selectedLead.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `id=eq.${selectedLead.id}`
        },
        (payload) => {
          console.log('Real-time lead update:', payload);
          if (payload.new) {
            setLeadData(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedLead?.id, organizationId]);

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
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [conversationHistory, isNearBottom]);

  // Load conversation history when lead changes (SSE with load=true)
  useEffect(() => {
    if (selectedLead) {
      setIsNearBottom(true);
      setShowScrollToBottom(false);
      setupEventSource();
    } else {
      setConversationHistory([]);
      closeEventSource();
    }

    return () => {
      closeEventSource();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?.id]);

  // Setup scroll event listener for better scroll detection
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    const possibleSelectors = [
      '[data-radix-scroll-area-viewport]',
      '.radix-scroll-area-viewport',
      '[data-scroll-area-viewport]',
      '.scroll-area-viewport'
    ];

    let scrollContainer: Element | null = null;
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

      console.log('ScrollArea container found:', {
        selector: (scrollContainer as HTMLElement).getAttribute('data-radix-scroll-area-viewport') ? '[data-radix-scroll-area-viewport]' : 'fallback',
        height: (scrollContainer as HTMLElement).clientHeight,
        scrollHeight: scrollContainer.scrollHeight,
        canScroll: scrollContainer.scrollHeight > (scrollContainer as HTMLElement).clientHeight,
        messagesCount: conversationHistory.length
      });

      return () => {
        scrollContainer!.removeEventListener('scroll', handleScroll);
      };
    } else {
      console.warn('ScrollArea viewport not found, logging structure:', scrollAreaRef.current);
    }
  }, [checkScrollPosition, conversationHistory.length]);

  // Call duration timer with automatic call end detection
  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;

          // Auto-end call if active for more than 30 minutes
          if (newDuration > 1800) {
            console.log('Call automatically ended due to timeout (30+ minutes)');
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
  }, [isCallActive, addConversationMessage]);

  // Connect Auto/Manual toggle to human control
  useEffect(() => {
    if (!selectedLead) return;

    if (!isAutoMode && !isUnderHumanControl) {
      console.log('Switching to Manual mode - joining human control');
      handleJoinHumanControl();
    } else if (isAutoMode && isUnderHumanControl) {
      console.log('Switching to Auto mode - leaving human control');
      handleLeaveHumanControl();
    }
  }, [isAutoMode, selectedLead?.id, isUnderHumanControl, handleJoinHumanControl, handleLeaveHumanControl]);

  // Check human control status on lead change
  useEffect(() => {
    if (!selectedLead) return;

    const checkHumanControlStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
          ...getOrganizationHeaders(organizationId)
        };

        const response = await fetch(
          `/api/human-control/status/${encodeURIComponent(selectedLead.phoneNumber)}?leadId=${encodeURIComponent(selectedLead.id)}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          setIsUnderHumanControl(data.isUnderHumanControl);
          setHumanControlAgent(data.session?.agentName || null);
          setHumanControlSession(data.session);

          // Sync the auto/manual toggle with human control status
          setIsAutoMode(!data.isUnderHumanControl);
        }
      } catch (err) {
        console.error('Error checking human control status:', err);
      }
    };

    checkHumanControlStatus();
  }, [selectedLead, organizationId]);

  // Settings change handler - persists to Supabase
  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettingsData((prev: any) => ({ ...prev, [key]: value }));
    const dbFieldMap: Record<string, string> = {
      autoChaseEnabled: 'auto_chase_enabled',
      notificationsEnabled: 'notifications_enabled',
      smartResponsesEnabled: 'smart_responses_enabled',
      moodDetectionEnabled: 'mood_detection_enabled',
      priorityLevel: 'priority_level'
    };
    const dbField = dbFieldMap[key];
    if (dbField) {
      saveLeadToSupabase({ [dbField]: value });
    }
  }, [saveLeadToSupabase]);

  // ─── Return value ──────────────────────────────────────────────────

  return {
    // Auth context
    organization,
    user,

    // Conversation state
    conversationHistory,
    setConversationHistory,
    isLoading,
    setIsLoading,
    error,
    setError,
    textInput,
    setTextInput,
    isCallActive,
    setIsCallActive,
    callDuration,
    setCallDuration,
    currentMode,
    setCurrentMode,
    conversationId,
    setConversationId,
    activeQuickTab,
    setActiveQuickTab,
    isUpdating,
    setIsUpdating,
    isTabsExpanded,
    setIsTabsExpanded,

    // Supabase integration state
    leadData,
    setLeadData,
    profileFormData,
    setProfileFormData,
    analyticsData,
    setAnalyticsData,
    settingsData,
    setSettingsData,
    isSaving,
    saveStatus,

    // Main tab state
    activeMainTab,
    setActiveMainTab,
    isAutoMode,
    setIsAutoMode,

    // Manual calls state
    isManualCallActive,
    setIsManualCallActive,
    manualCallSession,
    setManualCallSession,

    // Scroll state
    isNearBottom,
    showScrollToBottom,

    // Human control state
    isUnderHumanControl,
    setIsUnderHumanControl,
    humanControlAgent,
    setHumanControlAgent,
    humanControlSession,
    setHumanControlSession,
    agentName,
    setAgentName,
    agentPhoneNumber,
    setAgentPhoneNumber,

    // NEW: Live transcripts
    liveTranscripts,
    setLiveTranscripts,

    // Refs
    messagesEndRef,
    scrollAreaRef,
    callTimerRef,
    eventSourceRef,
    saveTimeoutRef,

    // Supabase CRUD
    loadLeadFromSupabase,
    saveLeadToSupabase,
    debouncedSaveProfile,
    saveAgentPhoneNumber,
    debouncedSave,

    // Conversation handlers
    addConversationMessage,
    loadConversationHistory,
    handleRealTimeUpdate,

    // SSE
    setupEventSource,
    closeEventSource,

    // Call handlers
    handleStartVoiceCall,
    handleEndCall,
    handleManualCall,
    handleEndManualCall,

    // SMS handler
    handleSendTextMessage,

    // Human control handlers
    handleJoinHumanControl,
    handleLeaveHumanControl,
    handleSendHumanMessage,

    // Lead management handlers
    handleReassignSpecialist,
    handleContactMethodChange,

    // Scroll functions
    scrollToBottom,
    checkScrollPosition,

    // Settings handler
    handleSettingChange,

    // Helper / utility functions
    formatDuration,
    formatMessageTime,
    getSentimentIcon,
    getStatusColor,
    formatCurrency,
    formatTimeAgo,

    // Analytics helpers
    calculateContactMethodPercentage,
    calculateResponseTimePercentage,
    getResponseTimeHistory,
    getLastMessage,
    getBestContactTimes,
  };
}
