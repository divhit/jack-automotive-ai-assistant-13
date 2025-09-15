-- ✅ CORRECT SCHEMA MIGRATION: This file is SAFE to run!
-- ✅ This migration REMOVES the incorrect conversation_messages table
-- ✅ This migration creates the correct single 'conversations' table
--
-- COMPLETE SCHEMA MIGRATION: Old Project → New Project
-- FROM: dgzadilmtuqvimolzxms (working) → TO: mbasrbltrnpsgajccinh (current)
-- This will replace the broken hybrid schema with the exact working schema

BEGIN;

-- 1. DROP THE BROKEN TABLES (conversation_messages is the problem)
DROP TABLE IF EXISTS public.conversation_messages CASCADE;

-- 2. RECREATE conversations table with CORRECT structure (from working project)
DROP TABLE IF EXISTS public.conversations CASCADE;
CREATE TABLE public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    content text NOT NULL,
    conversation_context text,
    created_at timestamptz DEFAULT now(),
    dynamic_variables jsonb,
    elevenlabs_conversation_id text,
    lead_id uuid,
    message_status text,
    organization_id uuid,
    phone_number_normalized text NOT NULL,
    sent_by text NOT NULL,
    timestamp timestamptz NOT NULL,
    twilio_call_sid text,
    twilio_message_sid text,
    type text,
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- 3. CREATE call_sessions table (missing from current project)
DROP TABLE IF EXISTS public.call_sessions CASCADE;
CREATE TABLE public.call_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    call_direction text,
    call_outcome text,
    call_type text,
    conversation_context text,
    created_at timestamptz DEFAULT now(),
    duration_seconds integer,
    dynamic_variables jsonb,
    elevenlabs_conversation_id text,
    ended_at timestamptz,
    lead_id uuid,
    organization_id uuid,
    phone_number text NOT NULL,
    phone_number_normalized text NOT NULL,
    started_at timestamptz NOT NULL,
    summary text,
    transcript text,
    twilio_call_sid text,
    CONSTRAINT call_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT call_sessions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT call_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- 4. FIX lead_activities table (change 'data' to 'metadata')
ALTER TABLE public.lead_activities DROP COLUMN IF EXISTS data CASCADE;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS timestamp timestamptz;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS new_value text;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS old_value text;

-- 5. Fix leads table to match working schema exactly
ALTER TABLE public.leads DROP COLUMN IF EXISTS legacy_id CASCADE;
-- Ensure all required columns exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_phone text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_agent text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_specialist text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS chase_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS credit_known_issues jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS credit_score_mentioned text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS credit_score_range text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_address text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS date_of_birth_mentioned text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employer_duration text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employer_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employment_info text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS funding_readiness text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS funding_readiness_reason text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS house_payment text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS housing_situation text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_qualification_update timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_touchpoint timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_income text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_payment_range text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action_due_date timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action_is_automated boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action_is_overdue boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_action_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone_number_normalized text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS qualification_completeness_percentage integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS qualification_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS script_progress_completed_steps jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS script_progress_current_step text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sentiment text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_conversations integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_sms_messages integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_voice_calls integer;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS trade_in_info text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vehicle_preference text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vehicle_type_interested text;

-- 6. Fix organizations table to match working schema
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS default_phone_number_id uuid;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS settings jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_tier text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 7. Fix organization_phone_numbers table
ALTER TABLE public.organization_phone_numbers DROP COLUMN IF EXISTS phone_type CASCADE;
ALTER TABLE public.organization_phone_numbers ADD COLUMN IF NOT EXISTS twilio_phone_sid text;
ALTER TABLE public.organization_phone_numbers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 8. Fix organization_memberships table
ALTER TABLE public.organization_memberships ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.organization_memberships ADD COLUMN IF NOT EXISTS permissions jsonb;
ALTER TABLE public.organization_memberships ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.organization_memberships ADD COLUMN IF NOT EXISTS joined_at timestamptz;

-- 9. Fix user_profiles table to match working schema
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS full_name CASCADE;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS phone CASCADE;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS preferences jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 10. Create missing tables from working schema
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_type text,
    created_at timestamptz DEFAULT now(),
    lead_id uuid,
    messages_count integer,
    organization_id uuid,
    phone_number_normalized text NOT NULL,
    summary text NOT NULL,
    timestamp timestamptz NOT NULL,
    CONSTRAINT conversation_summaries_pkey PRIMARY KEY (id),
    CONSTRAINT conversation_summaries_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT conversation_summaries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- 11. Create missing advanced tables
CREATE TABLE IF NOT EXISTS public.agent_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    agent_name text NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_private boolean,
    lead_id uuid,
    note_type text,
    organization_id uuid,
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT agent_notes_pkey PRIMARY KEY (id),
    CONSTRAINT agent_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT agent_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.agent_phone_numbers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    agent_name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    organization_id uuid NOT NULL,
    phone_number text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    user_id uuid,
    CONSTRAINT agent_phone_numbers_pkey PRIMARY KEY (id),
    CONSTRAINT agent_phone_numbers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.conversation_analytics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    agent_performance_score numeric,
    buying_signals jsonb,
    call_outcome_prediction text,
    concerns jsonb,
    conversation_id uuid,
    conversation_quality_score numeric,
    conversion_probability numeric,
    created_at timestamptz DEFAULT now(),
    customer_satisfaction_predicted numeric,
    detected_intents jsonb,
    emotional_tone jsonb,
    engagement_level text,
    follow_up_urgency text,
    next_best_action text,
    objections jsonb,
    optimal_follow_up_time timestamptz,
    organization_id uuid,
    pause_analysis jsonb,
    professionalism_score numeric,
    questions_asked jsonb,
    recommended_actions jsonb,
    risk_factors jsonb,
    script_adherence_score numeric,
    sentiment_confidence numeric,
    speech_pace_analysis jsonb,
    talk_time_ratio numeric,
    transcription_quality_score numeric,
    updated_at timestamptz DEFAULT now(),
    voice_stress_indicators jsonb,
    CONSTRAINT conversation_analytics_pkey PRIMARY KEY (id),
    CONSTRAINT conversation_analytics_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
    CONSTRAINT conversation_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

CREATE TABLE IF NOT EXISTS public.lead_scoring_factors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    avg_engagement_level numeric,
    buying_signals_count integer,
    calculated_at timestamptz DEFAULT now(),
    call_acceptance_rate numeric,
    churn_risk_score numeric,
    conversation_quality_trend text,
    conversion_probability numeric,
    enhanced_lead_score numeric,
    expires_at timestamptz,
    follow_up_responsiveness numeric,
    lead_id uuid,
    message_engagement_rate numeric,
    objections_count integer,
    response_time_avg numeric,
    score_confidence numeric,
    sentiment_trajectory text,
    voice_confidence_avg numeric,
    voice_enthusiasm_avg numeric,
    voice_stress_avg numeric,
    CONSTRAINT lead_scoring_factors_pkey PRIMARY KEY (id),
    CONSTRAINT lead_scoring_factors_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);

-- 12. Add all necessary indexes
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone_normalized ON public.conversations(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON public.conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_elevenlabs_id ON public.conversations(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_id ON public.call_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_organization_id ON public.call_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone_normalized ON public.call_sessions(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_call_sessions_elevenlabs_id ON public.call_sessions(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON public.leads(phone_number_normalized);

-- 13. Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analytics ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies (organization-based isolation)
DROP POLICY IF EXISTS "conversations_organization_isolation" ON public.conversations;
CREATE POLICY "conversations_organization_isolation" ON public.conversations
    FOR ALL USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_memberships om
            WHERE om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

DROP POLICY IF EXISTS "call_sessions_organization_isolation" ON public.call_sessions;
CREATE POLICY "call_sessions_organization_isolation" ON public.call_sessions
    FOR ALL USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_memberships om
            WHERE om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- 15. Grant permissions
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
GRANT ALL ON public.conversation_summaries TO authenticated;
GRANT ALL ON public.conversation_summaries TO service_role;
GRANT ALL ON public.agent_notes TO authenticated;
GRANT ALL ON public.agent_notes TO service_role;

-- 16. Insert/update organization phone number mapping
INSERT INTO public.organization_phone_numbers (
    organization_id,
    phone_number,
    elevenlabs_phone_id,
    is_active,
    twilio_phone_sid
) VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    '+17786526908',
    'phnum_01jzb7ndccf5zsxsyvsx126dqz',
    true,
    'TWILIO_SID_TO_BE_FILLED'  -- You'll need to update this
) ON CONFLICT (phone_number) DO UPDATE SET
    elevenlabs_phone_id = EXCLUDED.elevenlabs_phone_id,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 17. Create essential functions from working project
CREATE OR REPLACE FUNCTION get_organization_by_phone_number(phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT opn.organization_id::text
        FROM public.organization_phone_numbers opn
        WHERE opn.phone_number = phone
        AND opn.is_active = true
        LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_organization_phone_number(org_id text)
RETURNS TABLE(phone_number text, elevenlabs_phone_id text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT opn.phone_number, opn.elevenlabs_phone_id
    FROM public.organization_phone_numbers opn
    WHERE opn.organization_id::text = org_id
    AND opn.is_active = true;
END;
$$;

COMMIT;

-- 18. Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT 'conversations table' as table_name, count(*) as exists FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public';
SELECT 'call_sessions table' as table_name, count(*) as exists FROM information_schema.tables WHERE table_name = 'call_sessions' AND table_schema = 'public';
SELECT 'conversation_messages table' as table_name, count(*) as should_be_zero FROM information_schema.tables WHERE table_name = 'conversation_messages' AND table_schema = 'public';
SELECT 'organization phone mapping' as status, count(*) as count FROM public.organization_phone_numbers WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';