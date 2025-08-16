// Supabase Persistence Service
// CRITICAL: This service runs ALONGSIDE existing memory operations, never replacing them
// All operations are async and non-blocking to preserve real-time performance

import { createClient } from '@supabase/supabase-js';

class SupabasePersistenceService {
  constructor() {
    this.supabase = null;
    this.isEnabled = false;
    this.isConnected = false;
    
    // Initialize if environment variables are present
    this.initialize();
  }

  initialize() {
    try {
      // Support both Node.js and browser environments - REQUIRE environment variables
      const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
      const enablePersistence = process.env.ENABLE_SUPABASE_PERSISTENCE !== 'false'; // Default to enabled

      console.log('🗄️ Supabase initialization:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        enabled: enablePersistence
      });

      if (!supabaseUrl || !supabaseKey) {
        console.log('🗄️ Supabase persistence DISABLED (missing URL or key)');
        console.log('🗄️ Current system continues working normally with in-memory storage');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isEnabled = true;
      
      // Test connection (non-blocking)
      this.testConnection().catch(error => {
        console.log('🗄️ Initial Supabase test failed, will retry later:', error.message);
        this.isConnected = false;
      });
      
      console.log('🗄️ Supabase persistence service initialized and ENABLED');
    } catch (error) {
      console.error('❌ Supabase persistence initialization failed:', error);
      console.log('🗄️ System continues with in-memory storage only');
      this.isEnabled = false;
    }
  }

  async testConnection() {
    if (!this.isEnabled) return false;
    
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        
        if (error.message.includes('Invalid API key')) {
          console.error('🔐 API Key Issue: The Supabase API key is invalid for this project');
          console.error('💡 Solution: Get the correct API keys from your Supabase dashboard');
          console.error('📋 Project URL: https://dgzadilmtuqvimolzxms.supabase.co');
        } else if (error.message.includes('table') && error.message.includes('does not exist')) {
          console.error('📋 Table Issue: The "leads" table does not exist in your database');
          console.error('💡 Solution: Run the schema creation SQL in your Supabase SQL editor');
        }
        
        throw error;
      }
      
      this.isConnected = true;
      console.log('✅ Supabase connection verified - delete operations will work');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Utility function to normalize phone for consistent storage
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return phoneNumber;
    
    if (phoneNumber.startsWith('+')) return phoneNumber;
    
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length === 10) return `+1${digitsOnly}`;
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`;
    return `+${digitsOnly}`;
  }

  // LEAD PERSISTENCE (preserves exact SubprimeLead structure)
  async persistLead(leadData) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(leadData.phoneNumber);
      
      const dbLead = {
        id: leadData.id,
        customer_name: leadData.customerName,
        phone_number: leadData.phoneNumber,
        phone_number_normalized: normalizedPhone,
        email: leadData.email,
        
        // Status fields (exact match to SubprimeLead interface)
        chase_status: leadData.chaseStatus,
        funding_readiness: leadData.fundingReadiness,
        funding_readiness_reason: leadData.fundingReadinessReason,
        sentiment: leadData.sentiment,
        
        // Script progress (exact match)
        script_progress_current_step: leadData.scriptProgress?.currentStep || 'contacted',
        script_progress_completed_steps: JSON.stringify(leadData.scriptProgress?.completedSteps || ['contacted']),
        
        // Timestamps
        last_touchpoint: leadData.lastTouchpoint,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Next action (exact match)
        next_action_type: leadData.nextAction?.type,
        next_action_due_date: leadData.nextAction?.dueDate,
        next_action_is_automated: leadData.nextAction?.isAutomated,
        next_action_is_overdue: leadData.nextAction?.isOverdue,
        
        // Credit profile (exact match)
        credit_score_range: leadData.creditProfile?.scoreRange,
        credit_known_issues: JSON.stringify(leadData.creditProfile?.knownIssues || []),
        
        // Additional fields
        vehicle_preference: leadData.vehiclePreference,
        assigned_agent: leadData.assignedAgent,
        assigned_specialist: leadData.assignedSpecialist,
        // Organization
        organization_id: leadData.organizationId,
        
        // Initialize analytics
        total_conversations: leadData.conversations?.length || 0,
        last_activity: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('leads')
        .upsert(dbLead, { onConflict: 'organization_id,phone_number_normalized' });

      if (error) throw error;
      
      console.log(`🗄️ Lead ${leadData.id} persisted to Supabase`);
      
      // Persist initial conversations if they exist
      if (leadData.conversations && leadData.conversations.length > 0) {
        await this.persistConversations(leadData.id, leadData.conversations, normalizedPhone);
      }
      
    } catch (error) {
      console.error(`❌ Failed to persist lead ${leadData.id}:`, error);
      // Don't throw - let system continue with memory-only operation
    }
  }

  // CONVERSATION PERSISTENCE (preserves exact message structure)
  async persistConversationMessage(phoneNumber, message, sentBy, messageType = 'text', metadata = {}) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Find lead ID by phone number
      let leadQuery = this.supabase
        .from('leads')
        .select('id')
        .eq('phone_number_normalized', normalizedPhone);

      // If organizationId provided in metadata, scope the lookup
      if (metadata.organizationId) {
        leadQuery = leadQuery.eq('organization_id', metadata.organizationId);
      }

      const { data: leads, error: leadError } = await leadQuery.limit(1);

      if (leadError) throw leadError;
      if (!leads || leads.length === 0) {
        console.log(`🗄️ No lead found for phone ${normalizedPhone}, skipping conversation persistence`);
        return;
      }

      const leadId = leads[0].id;
      
      const conversationData = {
        lead_id: leadId,
        content: message,
        sent_by: sentBy,
        timestamp: new Date().toISOString(),
        type: messageType === 'text' ? 'sms' : messageType, // Ensure SMS messages are properly categorized
        phone_number_normalized: normalizedPhone,
        
        // CRITICAL: Set organization_id for proper data isolation
        organization_id: metadata.organizationId,
        
        // Preserve all telephony metadata
        twilio_message_sid: metadata.twilioMessageSid,
        twilio_call_sid: metadata.twilioCallSid,
        elevenlabs_conversation_id: metadata.elevenlabsConversationId,
        
        // CRITICAL: Preserve dynamic variables exactly as used in current system
        dynamic_variables: JSON.stringify(metadata.dynamicVariables || {}),
        conversation_context: metadata.conversationContext,
        
        message_status: metadata.status || 'sent'
      };

      const { error } = await this.supabase
        .from('conversations')
        .insert(conversationData);

      if (error) throw error;
      
      console.log(`🗄️ Conversation message persisted for ${normalizedPhone} (${messageType}) - sentBy: ${sentBy} - content: ${message.substring(0, 50)}...`);
      
      // Update lead activity counters
      await this.updateLeadActivityCounters(leadId, messageType);
      
    } catch (error) {
      console.error(`❌ Failed to persist conversation message:`, error);
      // Don't throw - let system continue with memory-only operation
    }
  }

  // ENHANCED: Conversation persistence with custom timestamp support for proper ordering
  async persistConversationMessageWithTimestamp(phoneNumber, message, sentBy, messageType = 'text', customTimestamp, metadata = {}) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Find lead ID by phone number
      let leadQuery = this.supabase
        .from('leads')
        .select('id')
        .eq('phone_number_normalized', normalizedPhone);

      // If organizationId provided in metadata, scope the lookup
      if (metadata.organizationId) {
        leadQuery = leadQuery.eq('organization_id', metadata.organizationId);
      }

      const { data: leads, error: leadError } = await leadQuery.limit(1);

      if (leadError) throw leadError;
      if (!leads || leads.length === 0) {
        console.log(`🗄️ No lead found for phone ${normalizedPhone}, skipping conversation persistence`);
        return;
      }

      const leadId = leads[0].id;
      
      const conversationData = {
        lead_id: leadId,
        content: message,
        sent_by: sentBy,
        timestamp: customTimestamp || new Date().toISOString(), // Use custom timestamp if provided
        type: messageType === 'text' ? 'sms' : messageType,
        phone_number_normalized: normalizedPhone,
        
        // CRITICAL: Set organization_id for proper data isolation
        organization_id: metadata.organizationId,
        
        // Preserve all telephony metadata
        twilio_message_sid: metadata.twilioMessageSid,
        twilio_call_sid: metadata.twilioCallSid,
        elevenlabs_conversation_id: metadata.elevenlabsConversationId,
        conversation_context: metadata.conversationContext,
        message_status: metadata.messageStatus || 'sent',
        dynamic_variables: metadata.dynamicVariables || {}
      };

      const { error } = await this.supabase
        .from('conversations')
        .insert(conversationData);

      if (error) throw error;
      
      console.log(`🗄️ Conversation message persisted with custom timestamp for ${normalizedPhone} (${messageType}) - sentBy: ${sentBy} - timestamp: ${customTimestamp} - content: ${message.substring(0, 50)}...`);
      
      // Update lead activity counters
      await this.updateLeadActivityCounters(leadId, messageType);
      
    } catch (error) {
      console.error(`❌ Failed to persist conversation message with timestamp:`, error);
      // Don't throw - let system continue with memory-only operation
    }
  }

  // Helper to persist multiple conversations (for initial data)
  async persistConversations(leadId, conversations, normalizedPhone) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const conversationRecords = conversations.map(conv => ({
        lead_id: leadId,
        content: conv.content,
        sent_by: conv.sentBy || 'system',
        timestamp: conv.timestamp,
        type: conv.type || 'text',
        phone_number_normalized: normalizedPhone
      }));

      const { error } = await this.supabase
        .from('conversations')
        .insert(conversationRecords);

      if (error) throw error;
      
      console.log(`🗄️ Bulk persisted ${conversations.length} conversations for lead ${leadId}`);
    } catch (error) {
      console.error(`❌ Failed to bulk persist conversations:`, error);
    }
  }

  // CALL SESSION PERSISTENCE
  async persistCallSession(sessionData) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(sessionData.phoneNumber);
      
      const callRecord = {
        id: sessionData.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lead_id: sessionData.leadId,
        elevenlabs_conversation_id: sessionData.elevenlabsConversationId,
        twilio_call_sid: sessionData.twilioCallSid,
        phone_number: sessionData.phoneNumber,
        phone_number_normalized: normalizedPhone,
        call_direction: sessionData.callDirection || 'outbound',
        started_at: sessionData.startedAt || new Date().toISOString(),
        ended_at: sessionData.endedAt,
        duration_seconds: sessionData.durationSeconds,
        transcript: sessionData.transcript,
        summary: sessionData.summary,
        call_outcome: sessionData.callOutcome,
        
        // CRITICAL: Set organization_id for proper data isolation
        organization_id: sessionData.organizationId,
        
        // Preserve context exactly
        conversation_context: sessionData.conversationContext,
        dynamic_variables: JSON.stringify(sessionData.dynamicVariables || {}),
        
        // ⭐ MANUAL CALLS: Add support for manual call specific data
        recording_url: sessionData.recordingUrl,
        recording_sid: sessionData.recordingSid,
        call_type: sessionData.callType || 'ai', // 'ai', 'manual', 'hybrid'
        agent_name: sessionData.agentName // For manual calls
      };

      const { error } = await this.supabase
        .from('call_sessions')
        .upsert(callRecord);

      if (error) throw error;
      
      console.log(`🗄️ Call session ${callRecord.id} persisted to Supabase`);
      return callRecord.id;
      
    } catch (error) {
      console.error(`❌ Failed to persist call session:`, error);
    }
  }

  // ⭐ MANUAL CALLS: Specialized logging for manual call activities
  async logActivity(leadId, activityType, metadata = {}) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const activityRecord = {
        lead_id: leadId,
        activity_type: activityType,
        description: this.generateActivityDescription(activityType, metadata),
        agent_name: metadata.agentName,
        metadata: JSON.stringify(metadata),
        timestamp: metadata.timestamp || new Date().toISOString(),
        // For manual calls, include organization context
        organization_id: metadata.organizationId
      };

      const { error } = await this.supabase
        .from('lead_activities')
        .insert(activityRecord);

      if (error) throw error;
      
      console.log(`🗄️ Manual call activity logged: ${activityType} for lead ${leadId}`);
      
    } catch (error) {
      console.error(`❌ Failed to log manual call activity:`, error);
    }
  }

  // Helper to generate human-readable activity descriptions
  generateActivityDescription(activityType, metadata) {
    switch (activityType) {
      case 'manual_call_initiated':
        return `Manual call initiated by ${metadata.agentName} to ${metadata.phoneNumber}`;
      case 'manual_call_ended':
        return `Manual call completed by ${metadata.agentName}. Duration: ${Math.floor(metadata.duration / 1000)}s`;
      case 'manual_call_recording_ready':
        return `Call recording available for manual call by ${metadata.agentName}`;
      default:
        return `${activityType} by ${metadata.agentName || 'system'}`;
    }
  }

  // CONVERSATION SUMMARY PERSISTENCE (preserves exact summary structure)
  async persistConversationSummary(phoneNumber, summary, timestamp, metadata = {}) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Find lead ID by phone number
      let leadQuery = this.supabase
        .from('leads')
        .select('id, organization_id')
        .eq('phone_number_normalized', normalizedPhone);

      // If organizationId provided in metadata, scope the lookup
      if (metadata.organizationId) {
        leadQuery = leadQuery.eq('organization_id', metadata.organizationId);
      }

      const { data: leads, error: leadError } = await leadQuery.limit(1);

      if (leadError) throw leadError;
      if (!leads || leads.length === 0) return;

      const summaryRecord = {
        phone_number_normalized: normalizedPhone,
        lead_id: leads[0].id,
        summary: summary,
        timestamp: timestamp || new Date().toISOString(),
        conversation_type: 'mixed',
        organization_id: metadata.organizationId || leads[0].organization_id
      };

      const { error } = await this.supabase
        .from('conversation_summaries')
        .insert(summaryRecord);

      if (error) throw error;
      
      console.log(`🗄️ Conversation summary persisted for ${normalizedPhone}`);
      
    } catch (error) {
      console.error(`❌ Failed to persist conversation summary:`, error);
    }
  }

  // ACTIVITY LOGGING (new CRM feature)
  async logLeadActivity(leadId, activityType, description, metadata = {}) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      const activityRecord = {
        lead_id: leadId,
        activity_type: activityType,
        description: description,
        old_value: metadata.oldValue,
        new_value: metadata.newValue,
        agent_name: metadata.agentName,
        metadata: JSON.stringify(metadata),
        timestamp: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('lead_activities')
        .insert(activityRecord);

      if (error) throw error;
      
      console.log(`🗄️ Activity logged for lead ${leadId}: ${activityType}`);
      
    } catch (error) {
      console.error(`❌ Failed to log lead activity:`, error);
    }
  }

  // Update lead activity counters
  async updateLeadActivityCounters(leadId, messageType) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      // Fallback to manual update
      const { data: lead } = await this.supabase
        .from('leads')
        .select('total_conversations, total_sms_messages, total_voice_calls')
        .eq('id', leadId)
        .single();

      if (lead) {
        const updates = {
          total_conversations: (lead.total_conversations || 0) + 1,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (messageType === 'voice') {
          updates.total_voice_calls = (lead.total_voice_calls || 0) + 1;
        } else {
          updates.total_sms_messages = (lead.total_sms_messages || 0) + 1;
        }

        await this.supabase
          .from('leads')
          .update(updates)
          .eq('id', leadId);
      }
      
    } catch (error) {
      console.error(`❌ Failed to update lead activity counters:`, error);
    }
  }

  // RETRIEVAL METHODS (for loading data back into memory if needed)
  async getLeadByPhone(phoneNumber, organizationId = null) {
    if (!this.isEnabled || !this.isConnected) return null;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // If organizationId provided, use it for scoped lookup
      if (organizationId) {
        const { data, error } = await this.supabase
          .from('leads')
          .select('*')
          .eq('phone_number_normalized', normalizedPhone)
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No lead found for this org - normal case
            return null;
          }
          throw error;
        }
        return data;
      }
      
      // Without organizationId, check if phone number is ambiguous
      const { data: allMatches, error: countError } = await this.supabase
        .from('leads')
        .select('organization_id, id, customer_name')
        .eq('phone_number_normalized', normalizedPhone);

      if (countError) throw countError;
      
      if (!allMatches || allMatches.length === 0) {
        return null; // No leads found
      }
      
      if (allMatches.length === 1) {
        // Unambiguous - single organization has this phone
        const { data, error } = await this.supabase
          .from('leads')
          .select('*')
          .eq('phone_number_normalized', normalizedPhone)
          .single();
          
        if (error) throw error;
        return data;
      }
      
      // Multiple organizations have this phone - this is ambiguous
      console.warn(`⚠️ Phone ${normalizedPhone} exists in ${allMatches.length} organizations - cannot resolve without organizationId`);
      console.warn(`📋 Organizations with this phone:`, allMatches.map(l => ({ org: l.organization_id, lead: l.id, name: l.customer_name })));
      
      // Return null to indicate ambiguous lookup that requires organizationId
      return null;
      
    } catch (error) {
      console.error(`❌ Failed to retrieve lead by phone:`, error);
      return null;
    }
  }

  async getConversationHistory(phoneNumber, organizationId = null, limit = 50) {
    if (!this.isEnabled || !this.isConnected) return [];
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // SECURITY FIX: NEVER return cross-organization data
      // If no organizationId provided, return empty results to prevent data leakage
      if (!organizationId) {
        console.log(`🔒 SECURITY: No organizationId provided for ${normalizedPhone} - returning empty history to prevent cross-organization data leakage`);
        return [];
      }
      
      let query = this.supabase
        .from('conversations')
        .select('*')
        .eq('phone_number_normalized', normalizedPhone)
        .eq('organization_id', organizationId) // ALWAYS filter by organization
        .order('timestamp', { ascending: true }) // FIXED: Get oldest messages first (chronological order)
        .limit(limit);

      console.log(`🔒 Loading conversations for phone ${normalizedPhone} in organization: ${organizationId}`);

      const { data, error } = await query;

      if (error) throw error;
      
      // DEBUG: Log what we got from database
      console.log(`🔍 DEBUG: Retrieved ${data.length} messages from database for ${normalizedPhone}`);
      const firstMessages = data.slice(0, 5); // First 5 since we query oldest first
      console.log(`🔍 DEBUG: First 5 messages from database (chronological):`, firstMessages.map(row => `${row.sent_by}: ${row.content.substring(0, 50)}... (${row.timestamp})`));
      
      // Convert to memory format (already in chronological order)
      return data.map(row => ({
        content: row.content,
        sentBy: row.sent_by,
        timestamp: row.timestamp,
        type: row.type
      }));
      
    } catch (error) {
      console.error(`❌ Failed to retrieve conversation history:`, error);
      return [];
    }
  }

  async getConversationSummary(phoneNumber, organizationId = null) {
    if (!this.isEnabled || !this.isConnected) return null;
    
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // SECURITY FIX: NEVER return cross-organization summaries
      // If no organizationId provided, return null to prevent data leakage
      if (!organizationId) {
        console.log(`🔒 SECURITY: No organizationId provided for ${normalizedPhone} - returning null summary to prevent cross-organization data leakage`);
        return null;
      }
      
      const { data, error } = await this.supabase
        .from('conversation_summaries')
        .select('*')
        .eq('phone_number_normalized', normalizedPhone)
        .eq('organization_id', organizationId) // ALWAYS filter by organization
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No summary found - this is normal
          console.log(`📋 No conversation summary found for ${normalizedPhone} in organization ${organizationId}`);
          return null;
        }
        throw error;
      }
      
      console.log(`🔒 Loading conversation summary for phone ${normalizedPhone} in organization: ${organizationId}`);
      
      return {
        summary: data.summary,
        timestamp: data.timestamp
      };
      
    } catch (error) {
      console.error(`❌ Failed to retrieve conversation summary:`, error);
      return null;
    }
  }

  // CRM ANALYTICS METHODS (new functionality)
  async getLeadAnalytics(leadId) {
    if (!this.isEnabled || !this.isConnected) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('lead_analytics')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      return data;
      
    } catch (error) {
      console.error(`❌ Failed to retrieve lead analytics:`, error);
      return null;
    }
  }

  async getAllLeadsWithAnalytics(limit = 100, organizationId = null) {
    if (!this.isEnabled || !this.isConnected) return [];
    
    try {
      // SECURITY: organizationId is now REQUIRED
      if (!organizationId) {
        console.error('🚨 SECURITY: getAllLeadsWithAnalytics() requires organizationId to prevent cross-organization data leakage');
        return [];
      }
      
      // Query leads table with full conversation details for proper analytics
      const { data: leads, error } = await this.supabase
        .from('leads')
        .select(`
          *,
          conversations:conversations!inner(
            id,
            type,
            content,
            sent_by,
            organization_id
          )
        `)
        .eq('organization_id', organizationId) // SECURITY: Always filter by organization
        .eq('conversations.organization_id', organizationId) // SECURITY: Double-check conversations are org-scoped
        .order('last_activity', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Transform data to match expected analytics format with proper message type breakdown
      const leadsWithAnalytics = leads?.map(lead => {
        const conversations = lead.conversations || [];
        
        // Count actual messages by type (like global analytics does)
        const totalVoiceCalls = conversations.filter(c => 
          c.type === 'voice' || c.type === 'call' || (c.sent_by === 'agent' && c.type === 'voice')
        ).length;
        
        const totalSmsMessages = conversations.filter(c => 
          c.type === 'sms' || c.type === 'text' || (c.sent_by === 'agent' && c.type === 'text')
        ).length;
        
        console.log(`📊 Lead ${lead.customer_name}: ${totalVoiceCalls} voice, ${totalSmsMessages} SMS from ${conversations.length} total conversations`);
        
        return {
          id: lead.id,
          customer_name: lead.customer_name,
          phone_number: lead.phone_number,
          sentiment: lead.sentiment,
          funding_readiness: lead.funding_readiness,
          lead_score: lead.lead_score || 50,
          total_conversations: conversations.length,
          total_voice_calls: totalVoiceCalls,
          total_sms_messages: totalSmsMessages,
          last_activity: lead.last_activity || lead.updated_at,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
          organization_id: lead.organization_id
        };
      }) || [];
      
      console.log(`🗄️ Retrieved ${leadsWithAnalytics.length} leads with analytics from Supabase for organization: ${organizationId}`);
      return leadsWithAnalytics;
      
    } catch (error) {
      console.error(`❌ Failed to retrieve leads with analytics:`, error);
      return [];
    }
  }

  // Get conversation data for analytics
  async getConversationAnalytics(organizationId, limit = 100) {
    if (!this.isEnabled || !this.isConnected) return null;
    
    try {
      // SECURITY: organizationId is REQUIRED
      if (!organizationId) {
        console.error('🚨 SECURITY: getConversationAnalytics() requires organizationId to prevent cross-organization data leakage');
        return [];
      }
      
      console.log(`📊 Querying conversations table for organization: ${organizationId}`);
      
      // Query conversations table directly for this organization
      const { data: conversations, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', organizationId) // SECURITY: Filter by organization
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`📊 Found ${conversations?.length || 0} conversations in database for org ${organizationId}`);
      return conversations || [];
      
    } catch (error) {
      console.error(`❌ Failed to retrieve conversation analytics for org ${organizationId}:`, error);
      return [];
    }
  }

  // DELETE OPERATIONS
  async deleteLead(leadId) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      // First delete all conversations for this lead
      const { error: conversationError } = await this.supabase
        .from('conversations')
        .delete()
        .eq('lead_id', leadId);

      if (conversationError) throw conversationError;

      // Then delete the lead
      const { error: leadError } = await this.supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (leadError) throw leadError;
      
      console.log(`🗑️ Lead ${leadId} and all related data deleted from Supabase`);
    } catch (error) {
      console.error(`❌ Failed to delete lead ${leadId}:`, error);
      throw error; // Rethrow so API can handle error response
    }
  }

  async deleteMultipleLeads(leadIds) {
    if (!this.isEnabled || !this.isConnected) return;
    
    try {
      // Delete conversations for all these leads
      const { error: conversationError } = await this.supabase
        .from('conversations')
        .delete()
        .in('lead_id', leadIds);

      if (conversationError) throw conversationError;

      // Delete all the leads
      const { error: leadError } = await this.supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (leadError) throw leadError;
      
      console.log(`🗑️ Deleted ${leadIds.length} leads and all related data from Supabase`);
    } catch (error) {
      console.error(`❌ Failed to delete multiple leads:`, error);
      throw error; // Rethrow so API can handle error response
    }
  }

  // Delete all leads (for complete data clear)
  async deleteAllLeads() {
    if (!this.isEnabled || !this.isConnected) return 0;
    
    try {
      // First get count of leads to be deleted
      const { data: leads, error: countError } = await this.supabase
        .from('leads')
        .select('id');

      if (countError) throw countError;
      const leadCount = leads ? leads.length : 0;

      if (leadCount === 0) {
        console.log('🗑️ No leads to delete from database');
        return 0;
      }

      // Delete all lead activities first (foreign key constraint)
      const { error: activitiesError } = await this.supabase
        .from('lead_activities')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (activitiesError) {
        console.warn('⚠️ Failed to delete lead activities:', activitiesError.message);
      }

      // Delete all conversations
      const { error: conversationsError } = await this.supabase
        .from('conversations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (conversationsError) {
        console.warn('⚠️ Failed to delete conversations:', conversationsError.message);
      }

      // Delete all call sessions
      const { error: callSessionsError } = await this.supabase
        .from('call_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (callSessionsError) {
        console.warn('⚠️ Failed to delete call sessions:', callSessionsError.message);
      }

      // Delete all conversation summaries
      const { error: summariesError } = await this.supabase
        .from('conversation_summaries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (summariesError) {
        console.warn('⚠️ Failed to delete conversation summaries:', summariesError.message);
      }

      // Finally delete all leads
      const { error: leadsError } = await this.supabase
        .from('leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (leadsError) throw leadsError;

      console.log(`✅ Deleted all ${leadCount} leads and related data from database`);
      return leadCount;

    } catch (error) {
      console.error('❌ Failed to delete all leads:', error);
      throw error;
    }
  }

  // CONVENIENCE METHODS FOR API
  async getAllLeads(limit = 100, organizationId = null) {
    if (!this.isEnabled || !this.isConnected) return [];
    
    try {
      // SECURITY: organizationId is now REQUIRED to prevent cross-organization data leakage
      if (!organizationId) {
        console.error('🚨 SECURITY: getAllLeads() requires organizationId to prevent cross-organization data leakage');
        return [];
      }
      
      const { data: leads, error } = await this.supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId) // SECURITY: Always filter by organization
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`🗄️ Retrieved ${leads?.length || 0} leads from Supabase for organization: ${organizationId}`);
      return leads || [];
    } catch (error) {
      console.error('❌ Failed to get all leads:', error);
      return [];
    }
  }

  // DEPRECATED: Use getAllLeads(limit, organizationId) instead
  async getAllLeadsUnsafe(limit = 100) {
    console.warn('⚠️ DEPRECATED: getAllLeadsUnsafe() is deprecated. Use getAllLeads(limit, organizationId) instead for security.');
    
    if (!this.isEnabled || !this.isConnected) return [];
    
    try {
      const { data: leads, error } = await this.supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`🗄️ Retrieved ${leads?.length || 0} leads from Supabase (UNSAFE - no organization filtering)`);
      return leads || [];
    } catch (error) {
      console.error('❌ Failed to get all leads:', error);
      return [];
    }
  }
}

// Create singleton instance
const supabasePersistence = new SupabasePersistenceService();

// Export as default and named export for flexibility
export default supabasePersistence;
export { SupabasePersistenceService }; 