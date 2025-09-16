export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          organization_id: string | null
          phone_number: string | null
          resolved_at: string | null
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          phone_number?: string | null
          resolved_at?: string | null
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          phone_number?: string | null
          resolved_at?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_notes: {
        Row: {
          agent_name: string
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          lead_id: string | null
          note_type: string | null
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          lead_id?: string | null
          note_type?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          lead_id?: string | null
          note_type?: string | null
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_analytics: {
        Row: {
          agent_name: string
          avg_conversation_quality: number | null
          avg_customer_satisfaction: number | null
          avg_talk_time_ratio: number | null
          buying_signals_identified: number | null
          coaching_alerts_responded: number | null
          coaching_response_time_avg: number | null
          conversion_rate: number | null
          created_at: string | null
          customer_callbacks: number | null
          follow_ups_scheduled: number | null
          id: string
          leads_converted: number | null
          objection_handling_score: number | null
          objections_resolved: number | null
          period_end: string
          period_start: string
          professionalism_score: number | null
          script_adherence_rate: number | null
          total_conversations: number | null
        }
        Insert: {
          agent_name: string
          avg_conversation_quality?: number | null
          avg_customer_satisfaction?: number | null
          avg_talk_time_ratio?: number | null
          buying_signals_identified?: number | null
          coaching_alerts_responded?: number | null
          coaching_response_time_avg?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_callbacks?: number | null
          follow_ups_scheduled?: number | null
          id?: string
          leads_converted?: number | null
          objection_handling_score?: number | null
          objections_resolved?: number | null
          period_end: string
          period_start: string
          professionalism_score?: number | null
          script_adherence_rate?: number | null
          total_conversations?: number | null
        }
        Update: {
          agent_name?: string
          avg_conversation_quality?: number | null
          avg_customer_satisfaction?: number | null
          avg_talk_time_ratio?: number | null
          buying_signals_identified?: number | null
          coaching_alerts_responded?: number | null
          coaching_response_time_avg?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_callbacks?: number | null
          follow_ups_scheduled?: number | null
          id?: string
          leads_converted?: number | null
          objection_handling_score?: number | null
          objections_resolved?: number | null
          period_end?: string
          period_start?: string
          professionalism_score?: number | null
          script_adherence_rate?: number | null
          total_conversations?: number | null
        }
        Relationships: []
      }
      agent_phone_numbers: {
        Row: {
          agent_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          phone_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          phone_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          phone_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_phone_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          call_direction: string | null
          call_outcome: string | null
          call_type: string | null
          conversation_context: string | null
          created_at: string | null
          duration_seconds: number | null
          dynamic_variables: Json | null
          elevenlabs_conversation_id: string | null
          ended_at: string | null
          id: string
          lead_id: string | null
          organization_id: string | null
          phone_number: string
          phone_number_normalized: string
          started_at: string
          summary: string | null
          transcript: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          call_direction?: string | null
          call_outcome?: string | null
          call_type?: string | null
          conversation_context?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          dynamic_variables?: Json | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          phone_number: string
          phone_number_normalized: string
          started_at: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          call_direction?: string | null
          call_outcome?: string | null
          call_type?: string | null
          conversation_context?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          dynamic_variables?: Json | null
          elevenlabs_conversation_id?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          phone_number?: string
          phone_number_normalized?: string
          started_at?: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_analytics: {
        Row: {
          agent_performance_score: number | null
          buying_signals: Json | null
          call_outcome_prediction: string | null
          concerns: Json | null
          conversation_id: string | null
          conversation_quality_score: number | null
          conversion_probability: number | null
          created_at: string | null
          customer_satisfaction_predicted: number | null
          detected_intents: Json | null
          emotional_tone: Json | null
          engagement_level: string | null
          follow_up_urgency: string | null
          id: string
          next_best_action: string | null
          objections: Json | null
          optimal_follow_up_time: string | null
          organization_id: string | null
          pause_analysis: Json | null
          professionalism_score: number | null
          questions_asked: Json | null
          recommended_actions: Json | null
          risk_factors: Json | null
          script_adherence_score: number | null
          sentiment_confidence: number | null
          speech_pace_analysis: Json | null
          talk_time_ratio: number | null
          transcription_quality_score: number | null
          updated_at: string | null
          voice_stress_indicators: Json | null
        }
        Insert: {
          agent_performance_score?: number | null
          buying_signals?: Json | null
          call_outcome_prediction?: string | null
          concerns?: Json | null
          conversation_id?: string | null
          conversation_quality_score?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          customer_satisfaction_predicted?: number | null
          detected_intents?: Json | null
          emotional_tone?: Json | null
          engagement_level?: string | null
          follow_up_urgency?: string | null
          id?: string
          next_best_action?: string | null
          objections?: Json | null
          optimal_follow_up_time?: string | null
          organization_id?: string | null
          pause_analysis?: Json | null
          professionalism_score?: number | null
          questions_asked?: Json | null
          recommended_actions?: Json | null
          risk_factors?: Json | null
          script_adherence_score?: number | null
          sentiment_confidence?: number | null
          speech_pace_analysis?: Json | null
          talk_time_ratio?: number | null
          transcription_quality_score?: number | null
          updated_at?: string | null
          voice_stress_indicators?: Json | null
        }
        Update: {
          agent_performance_score?: number | null
          buying_signals?: Json | null
          call_outcome_prediction?: string | null
          concerns?: Json | null
          conversation_id?: string | null
          conversation_quality_score?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          customer_satisfaction_predicted?: number | null
          detected_intents?: Json | null
          emotional_tone?: Json | null
          engagement_level?: string | null
          follow_up_urgency?: string | null
          id?: string
          next_best_action?: string | null
          objections?: Json | null
          optimal_follow_up_time?: string | null
          organization_id?: string | null
          pause_analysis?: Json | null
          professionalism_score?: number | null
          questions_asked?: Json | null
          recommended_actions?: Json | null
          risk_factors?: Json | null
          script_adherence_score?: number | null
          sentiment_confidence?: number | null
          speech_pace_analysis?: Json | null
          talk_time_ratio?: number | null
          transcription_quality_score?: number | null
          updated_at?: string | null
          voice_stress_indicators?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_timeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_patterns: {
        Row: {
          conversion_correlation: number | null
          created_at: string | null
          customer_segment: string | null
          first_observed: string | null
          frequency: number | null
          id: string
          industry_vertical: string | null
          last_observed: string | null
          pattern_data: Json
          pattern_type: string
          success_rate: number | null
        }
        Insert: {
          conversion_correlation?: number | null
          created_at?: string | null
          customer_segment?: string | null
          first_observed?: string | null
          frequency?: number | null
          id?: string
          industry_vertical?: string | null
          last_observed?: string | null
          pattern_data: Json
          pattern_type: string
          success_rate?: number | null
        }
        Update: {
          conversion_correlation?: number | null
          created_at?: string | null
          customer_segment?: string | null
          first_observed?: string | null
          frequency?: number | null
          id?: string
          industry_vertical?: string | null
          last_observed?: string | null
          pattern_data?: Json
          pattern_type?: string
          success_rate?: number | null
        }
        Relationships: []
      }
      conversation_summaries: {
        Row: {
          conversation_type: string | null
          created_at: string | null
          id: string
          lead_id: string | null
          messages_count: number | null
          organization_id: string | null
          phone_number_normalized: string
          summary: string
          timestamp: string
        }
        Insert: {
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          messages_count?: number | null
          organization_id?: string | null
          phone_number_normalized: string
          summary: string
          timestamp: string
        }
        Update: {
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string | null
          messages_count?: number | null
          organization_id?: string | null
          phone_number_normalized?: string
          summary?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          content: string
          conversation_context: string | null
          created_at: string | null
          dynamic_variables: Json | null
          elevenlabs_conversation_id: string | null
          id: string
          lead_id: string | null
          message_status: string | null
          organization_id: string | null
          phone_number_normalized: string
          sent_by: string
          timestamp: string
          twilio_call_sid: string | null
          twilio_message_sid: string | null
          type: string | null
        }
        Insert: {
          content: string
          conversation_context?: string | null
          created_at?: string | null
          dynamic_variables?: Json | null
          elevenlabs_conversation_id?: string | null
          id?: string
          lead_id?: string | null
          message_status?: string | null
          organization_id?: string | null
          phone_number_normalized: string
          sent_by: string
          timestamp: string
          twilio_call_sid?: string | null
          twilio_message_sid?: string | null
          type?: string | null
        }
        Update: {
          content?: string
          conversation_context?: string | null
          created_at?: string | null
          dynamic_variables?: Json | null
          elevenlabs_conversation_id?: string | null
          id?: string
          lead_id?: string | null
          message_status?: string | null
          organization_id?: string | null
          phone_number_normalized?: string
          sent_by?: string
          timestamp?: string
          twilio_call_sid?: string | null
          twilio_message_sid?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          agent_name: string | null
          description: string
          id: string
          lead_id: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          organization_id: string | null
          timestamp: string | null
        }
        Insert: {
          activity_type: string
          agent_name?: string | null
          description: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
          timestamp?: string | null
        }
        Update: {
          activity_type?: string
          agent_name?: string | null
          description?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_factors: {
        Row: {
          avg_engagement_level: number | null
          buying_signals_count: number | null
          calculated_at: string | null
          call_acceptance_rate: number | null
          churn_risk_score: number | null
          conversation_quality_trend: string | null
          conversion_probability: number | null
          enhanced_lead_score: number | null
          expires_at: string | null
          follow_up_responsiveness: number | null
          id: string
          lead_id: string | null
          message_engagement_rate: number | null
          objections_count: number | null
          response_time_avg: number | null
          score_confidence: number | null
          sentiment_trajectory: string | null
          voice_confidence_avg: number | null
          voice_enthusiasm_avg: number | null
          voice_stress_avg: number | null
        }
        Insert: {
          avg_engagement_level?: number | null
          buying_signals_count?: number | null
          calculated_at?: string | null
          call_acceptance_rate?: number | null
          churn_risk_score?: number | null
          conversation_quality_trend?: string | null
          conversion_probability?: number | null
          enhanced_lead_score?: number | null
          expires_at?: string | null
          follow_up_responsiveness?: number | null
          id?: string
          lead_id?: string | null
          message_engagement_rate?: number | null
          objections_count?: number | null
          response_time_avg?: number | null
          score_confidence?: number | null
          sentiment_trajectory?: string | null
          voice_confidence_avg?: number | null
          voice_enthusiasm_avg?: number | null
          voice_stress_avg?: number | null
        }
        Update: {
          avg_engagement_level?: number | null
          buying_signals_count?: number | null
          calculated_at?: string | null
          call_acceptance_rate?: number | null
          churn_risk_score?: number | null
          conversation_quality_trend?: string | null
          conversion_probability?: number | null
          enhanced_lead_score?: number | null
          expires_at?: string | null
          follow_up_responsiveness?: number | null
          id?: string
          lead_id?: string | null
          message_engagement_rate?: number | null
          objections_count?: number | null
          response_time_avg?: number | null
          score_confidence?: number | null
          sentiment_trajectory?: string | null
          voice_confidence_avg?: number | null
          voice_enthusiasm_avg?: number | null
          voice_stress_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_factors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scoring_factors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scoring_factors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          additional_income: number | null
          agent_name: string | null
          agent_phone: string | null
          assigned_agent: string | null
          assigned_specialist: string | null
          assigned_to: string | null
          auto_chase_enabled: boolean | null
          best_contact_times: string[] | null
          budget_range: string | null
          chase_status: string | null
          city: string | null
          contact_attempts: number | null
          conversion_probability: number | null
          created_at: string | null
          created_by: string | null
          credit_known_issues: Json | null
          credit_score: number | null
          credit_score_mentioned: string | null
          credit_score_range: string | null
          current_address: string | null
          customer_name: string
          date_of_birth: string | null
          date_of_birth_mentioned: string | null
          down_payment: number | null
          drivers_license: string | null
          email: string | null
          employer_duration: string | null
          employer_name: string | null
          employment_info: string | null
          employment_length: string | null
          employment_type: string | null
          existing_debt: number | null
          financing_needed: boolean | null
          funding_readiness: string | null
          funding_readiness_reason: string | null
          house_payment: string | null
          housing_situation: string | null
          housing_status: string | null
          id: string
          job_title: string | null
          last_activity: string | null
          last_contact_date: string | null
          last_qualification_update: string | null
          last_touchpoint: string | null
          lead_score: number | null
          length_at_address: string | null
          marital_status: string | null
          monthly_expenses: number | null
          monthly_housing_payment: number | null
          monthly_income: string | null
          monthly_payment_range: string | null
          mood_detection_enabled: boolean | null
          next_action_due_date: string | null
          next_action_is_automated: boolean | null
          next_action_is_overdue: boolean | null
          next_action_type: string | null
          notifications_enabled: boolean | null
          organization_id: string | null
          phone_number: string
          phone_number_normalized: string
          preferred_contact_method: string | null
          priority_level: string | null
          qualification_completeness_percentage: number | null
          qualification_status: string | null
          response_time_avg: unknown | null
          script_progress_completed_steps: Json | null
          script_progress_current_step: string | null
          sentiment: string | null
          smart_responses_enabled: boolean | null
          ssn_last_4: string | null
          state: string | null
          total_conversations: number | null
          total_sms_messages: number | null
          total_voice_calls: number | null
          trade_in_info: string | null
          trade_in_value: number | null
          trade_in_vehicle: string | null
          updated_at: string | null
          vehicle_preference: string | null
          vehicle_type_interested: string | null
          zip_code: string | null
        }
        Insert: {
          additional_income?: number | null
          agent_name?: string | null
          agent_phone?: string | null
          assigned_agent?: string | null
          assigned_specialist?: string | null
          assigned_to?: string | null
          auto_chase_enabled?: boolean | null
          best_contact_times?: string[] | null
          budget_range?: string | null
          chase_status?: string | null
          city?: string | null
          contact_attempts?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          created_by?: string | null
          credit_known_issues?: Json | null
          credit_score?: number | null
          credit_score_mentioned?: string | null
          credit_score_range?: string | null
          current_address?: string | null
          customer_name: string
          date_of_birth?: string | null
          date_of_birth_mentioned?: string | null
          down_payment?: number | null
          drivers_license?: string | null
          email?: string | null
          employer_duration?: string | null
          employer_name?: string | null
          employment_info?: string | null
          employment_length?: string | null
          employment_type?: string | null
          existing_debt?: number | null
          financing_needed?: boolean | null
          funding_readiness?: string | null
          funding_readiness_reason?: string | null
          house_payment?: string | null
          housing_situation?: string | null
          housing_status?: string | null
          id: string
          job_title?: string | null
          last_activity?: string | null
          last_contact_date?: string | null
          last_qualification_update?: string | null
          last_touchpoint?: string | null
          lead_score?: number | null
          length_at_address?: string | null
          marital_status?: string | null
          monthly_expenses?: number | null
          monthly_housing_payment?: number | null
          monthly_income?: string | null
          monthly_payment_range?: string | null
          mood_detection_enabled?: boolean | null
          next_action_due_date?: string | null
          next_action_is_automated?: boolean | null
          next_action_is_overdue?: boolean | null
          next_action_type?: string | null
          notifications_enabled?: boolean | null
          organization_id?: string | null
          phone_number: string
          phone_number_normalized: string
          preferred_contact_method?: string | null
          priority_level?: string | null
          qualification_completeness_percentage?: number | null
          qualification_status?: string | null
          response_time_avg?: unknown | null
          script_progress_completed_steps?: Json | null
          script_progress_current_step?: string | null
          sentiment?: string | null
          smart_responses_enabled?: boolean | null
          ssn_last_4?: string | null
          state?: string | null
          total_conversations?: number | null
          total_sms_messages?: number | null
          total_voice_calls?: number | null
          trade_in_info?: string | null
          trade_in_value?: number | null
          trade_in_vehicle?: string | null
          updated_at?: string | null
          vehicle_preference?: string | null
          vehicle_type_interested?: string | null
          zip_code?: string | null
        }
        Update: {
          additional_income?: number | null
          agent_name?: string | null
          agent_phone?: string | null
          assigned_agent?: string | null
          assigned_specialist?: string | null
          assigned_to?: string | null
          auto_chase_enabled?: boolean | null
          best_contact_times?: string[] | null
          budget_range?: string | null
          chase_status?: string | null
          city?: string | null
          contact_attempts?: number | null
          conversion_probability?: number | null
          created_at?: string | null
          created_by?: string | null
          credit_known_issues?: Json | null
          credit_score?: number | null
          credit_score_mentioned?: string | null
          credit_score_range?: string | null
          current_address?: string | null
          customer_name?: string
          date_of_birth?: string | null
          date_of_birth_mentioned?: string | null
          down_payment?: number | null
          drivers_license?: string | null
          email?: string | null
          employer_duration?: string | null
          employer_name?: string | null
          employment_info?: string | null
          employment_length?: string | null
          employment_type?: string | null
          existing_debt?: number | null
          financing_needed?: boolean | null
          funding_readiness?: string | null
          funding_readiness_reason?: string | null
          house_payment?: string | null
          housing_situation?: string | null
          housing_status?: string | null
          id?: string
          job_title?: string | null
          last_activity?: string | null
          last_contact_date?: string | null
          last_qualification_update?: string | null
          last_touchpoint?: string | null
          lead_score?: number | null
          length_at_address?: string | null
          marital_status?: string | null
          monthly_expenses?: number | null
          monthly_housing_payment?: number | null
          monthly_income?: string | null
          monthly_payment_range?: string | null
          mood_detection_enabled?: boolean | null
          next_action_due_date?: string | null
          next_action_is_automated?: boolean | null
          next_action_is_overdue?: boolean | null
          next_action_type?: string | null
          notifications_enabled?: boolean | null
          organization_id?: string | null
          phone_number?: string
          phone_number_normalized?: string
          preferred_contact_method?: string | null
          priority_level?: string | null
          qualification_completeness_percentage?: number | null
          qualification_status?: string | null
          response_time_avg?: unknown | null
          script_progress_completed_steps?: Json | null
          script_progress_current_step?: string | null
          sentiment?: string | null
          smart_responses_enabled?: boolean | null
          ssn_last_4?: string | null
          state?: string | null
          total_conversations?: number | null
          total_sms_messages?: number | null
          total_voice_calls?: number | null
          trade_in_info?: string | null
          trade_in_value?: number | null
          trade_in_vehicle?: string | null
          updated_at?: string | null
          vehicle_preference?: string | null
          vehicle_type_interested?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      live_coaching_events: {
        Row: {
          action_taken: string | null
          agent_response_time: number | null
          conversation_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          recommendation: string | null
          severity: string | null
          timestamp: string | null
        }
        Insert: {
          action_taken?: string | null
          agent_response_time?: number | null
          conversation_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          recommendation?: string | null
          severity?: string | null
          timestamp?: string | null
        }
        Update: {
          action_taken?: string | null
          agent_response_time?: number | null
          conversation_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          recommendation?: string | null
          severity?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_coaching_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_timeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_coaching_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          organization_id: string
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          organization_id: string
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_phone_numbers: {
        Row: {
          created_at: string | null
          elevenlabs_phone_id: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          phone_number: string
          twilio_phone_sid: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          elevenlabs_phone_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          phone_number: string
          twilio_phone_sid: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          elevenlabs_phone_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          phone_number?: string
          twilio_phone_sid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_phone_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          created_at: string | null
          default_phone_number_id: string | null
          domain: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          phone_number: string | null
          settings: Json | null
          slug: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          default_phone_number_id?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          phone_number?: string | null
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          default_phone_number_id?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          phone_number?: string | null
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_default_phone_number_id_fkey"
            columns: ["default_phone_number_id"]
            isOneToOne: false
            referencedRelation: "organization_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          last_name: string | null
          organization_id: string | null
          phone_number: string | null
          preferences: Json | null
          role: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          organization_id?: string | null
          phone_number?: string | null
          preferences?: Json | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          organization_id?: string | null
          phone_number?: string | null
          preferences?: Json | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      conversation_performance_insights: {
        Row: {
          avg_agent_performance: number | null
          avg_conversion_probability: number | null
          avg_predicted_satisfaction: number | null
          avg_quality_score: number | null
          avg_sentiment_confidence: number | null
          date: string | null
          high_engagement_count: number | null
          low_engagement_count: number | null
          medium_engagement_count: number | null
          needs_follow_up: number | null
          predicted_conversions: number | null
          total_buying_signals: number | null
          total_conversations: number | null
          total_objections: number | null
          unlikely_conversions: number | null
        }
        Relationships: []
      }
      conversation_timeline: {
        Row: {
          content: string | null
          customer_name: string | null
          id: string | null
          lead_id: string | null
          next_message_time: string | null
          phone_number_normalized: string | null
          previous_message_time: string | null
          sent_by: string | null
          sequence_number: number | null
          timestamp: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "enhanced_lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_lead_analytics: {
        Row: {
          base_score: number | null
          buying_signals_count: number | null
          chase_status: string | null
          conversation_quality_score: number | null
          conversion_probability: number | null
          customer_name: string | null
          engagement_level: string | null
          enhanced_lead_score: number | null
          funding_readiness: string | null
          id: string | null
          lead_temperature: string | null
          next_best_action: string | null
          objections_count: number | null
          optimal_follow_up_time: string | null
          phone_number: string | null
          score_confidence: number | null
          score_updated_at: string | null
          sentiment: string | null
          sentiment_confidence: number | null
        }
        Relationships: []
      }
      lead_analytics: {
        Row: {
          actual_conversation_count: number | null
          actual_sms_count: number | null
          actual_voice_count: number | null
          customer_name: string | null
          funding_readiness: string | null
          id: string | null
          last_activity: string | null
          last_conversation_time: string | null
          lead_score: number | null
          phone_number: string | null
          sentiment: string | null
          total_conversations: number | null
          total_sms_messages: number | null
          total_voice_calls: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_phone_number: {
        Args: { elevenlabs_phone_id: string; phone_num: string }
        Returns: boolean
      }
      calculate_enhanced_lead_score_v2: {
        Args: { lead_id_param: string }
        Returns: number
      }
      calculate_lead_score: {
        Args: { lead_id_param: string }
        Returns: number
      }
      calculate_qualification_completeness: {
        Args: { lead_row: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
      create_new_organization: {
        Args: {
          org_domain?: string
          org_name: string
          org_phone?: string
          org_slug: string
        }
        Returns: string
      }
      create_organization_with_user: {
        Args: {
          org_name: string
          org_slug: string
          user_email: string
          user_first_name?: string
          user_id: string
          user_last_name?: string
        }
        Returns: string
      }
      get_current_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_organization_by_phone_number: {
        Args: { phone: string }
        Returns: string
      }
      get_organization_phone_number: {
        Args: { org_id: string }
        Returns: {
          elevenlabs_phone_id: string
          phone_number: string
        }[]
      }
      migrate_initial_test_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      store_purchased_phone_number: {
        Args: { org_id: string; phone_num: string; twilio_sid: string }
        Returns: string
      }
      update_organization_agent_settings: {
        Args: { agent_name?: string; agent_phone: string; org_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const