-- SAFE SCHEMA MIGRATION: Old Project → New Project
-- FROM: dgzadilmtuqvimolzxms (working) → TO: mbasrbltrnpsgajccinh (current)
-- This version checks for table existence before dropping

BEGIN;

-- 1. DROP EXISTING TABLES SAFELY (only if they exist)
DROP TABLE IF EXISTS public.conversation_analytics CASCADE;
DROP TABLE IF EXISTS public.conversation_patterns CASCADE;
DROP TABLE IF EXISTS public.agent_performance_analytics CASCADE;
DROP TABLE IF EXISTS public.agent_notes CASCADE;
DROP TABLE IF EXISTS public.agent_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.live_coaching_events CASCADE;
DROP TABLE IF EXISTS public.lead_scoring_factors CASCADE;
DROP TABLE IF EXISTS public.admin_notifications CASCADE;
DROP TABLE IF EXISTS public.conversation_summaries CASCADE;
DROP TABLE IF EXISTS public.call_sessions CASCADE;
DROP TABLE IF EXISTS public.conversation_messages CASCADE;  -- This is the broken table we want to remove
DROP TABLE IF EXISTS public.conversations CASCADE;

-- 2. DROP VIEWS SAFELY
DROP VIEW IF EXISTS public.conversation_performance_insights CASCADE;
DROP VIEW IF EXISTS public.conversation_timeline CASCADE;
DROP VIEW IF EXISTS public.enhanced_lead_analytics CASCADE;
DROP VIEW IF EXISTS public.lead_analytics CASCADE;

-- 3. DROP FUNCTIONS SAFELY
DROP FUNCTION IF EXISTS public.activate_phone_number(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_enhanced_lead_score_v2(text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_lead_score(text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_qualification_completeness(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.create_new_organization(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_organization_with_user(text, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_organization_by_phone_number(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_organization_phone_number(text) CASCADE;
DROP FUNCTION IF EXISTS public.migrate_initial_test_data() CASCADE;
DROP FUNCTION IF EXISTS public.store_purchased_phone_number(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_organization_agent_settings(text, text, text) CASCADE;

-- 4. CREATE CORE TABLES (in dependency order)

-- Organizations (base table)
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    domain text,
    email text,
    phone_number text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    address jsonb,
    default_phone_number_id uuid,
    logo_url text,
    metadata jsonb,
    settings jsonb,
    subscription_tier text,
    CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- User profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    phone_number text,
    timezone text,
    preferences jsonb,
    role text,
    is_active boolean DEFAULT true,
    last_login_at timestamptz,
    organization_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
    CONSTRAINT user_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Organization memberships
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    is_active boolean DEFAULT true,
    joined_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    permissions jsonb,
    CONSTRAINT organization_memberships_pkey PRIMARY KEY (id),
    CONSTRAINT organization_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT organization_memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Organization phone numbers
CREATE TABLE IF NOT EXISTS public.organization_phone_numbers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    phone_number text NOT NULL UNIQUE,
    twilio_phone_sid text NOT NULL,
    elevenlabs_phone_id text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT organization_phone_numbers_pkey PRIMARY KEY (id),
    CONSTRAINT organization_phone_numbers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Leads (core business table)
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    customer_name text NOT NULL,
    phone_number text NOT NULL,
    phone_number_normalized text NOT NULL,
    email text,
    organization_id uuid,
    chase_status text,
    funding_readiness text,
    funding_readiness_reason text,
    sentiment text,
    script_progress_current_step text,
    script_progress_completed_steps jsonb,
    last_touchpoint timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    next_action_type text,
    next_action_due_date timestamptz,
    next_action_is_automated boolean DEFAULT false,
    next_action_is_overdue boolean DEFAULT false,
    credit_score_range text,
    credit_known_issues jsonb,
    vehicle_preference text,
    assigned_agent text,
    assigned_specialist text,
    total_conversations integer DEFAULT 0,
    total_sms_messages integer DEFAULT 0,
    total_voice_calls integer DEFAULT 0,
    last_activity timestamptz,
    lead_score integer DEFAULT 0,
    created_by text,
    assigned_to text,
    monthly_income text,
    employment_info text,
    monthly_payment_range text,
    housing_situation text,
    credit_score_mentioned text,
    vehicle_type_interested text,
    trade_in_info text,
    date_of_birth_mentioned text,
    qualification_status text DEFAULT 'Not Started',
    qualification_completeness_percentage integer DEFAULT 0,
    last_qualification_update timestamptz,
    marital_status text,
    employer_name text,
    employer_duration text,
    house_payment text,
    current_address text,
    agent_phone text,
    agent_name text,
    CONSTRAINT leads_pkey PRIMARY KEY (id),
    CONSTRAINT leads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Conversations (single table for all messages - SMS, voice, etc)
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    content text NOT NULL,
    sent_by text NOT NULL,
    phone_number_normalized text NOT NULL,
    timestamp timestamptz NOT NULL,
    organization_id uuid,
    lead_id uuid,
    type text,
    message_status text,
    twilio_message_sid text,
    twilio_call_sid text,
    elevenlabs_conversation_id text,
    conversation_context text,
    dynamic_variables jsonb,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    CONSTRAINT conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
    CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);

-- Call sessions (for voice call tracking)
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number text NOT NULL,
    phone_number_normalized text NOT NULL,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    duration_seconds integer,
    transcript text,
    summary text,
    call_outcome text,
    call_direction text,
    call_type text,
    conversation_context text,
    dynamic_variables jsonb,
    elevenlabs_conversation_id text,
    twilio_call_sid text,
    lead_id uuid,
    organization_id uuid,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT call_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT call_sessions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT call_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Lead activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lead_id uuid,
    organization_id uuid,
    activity_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb,  -- This is the critical column that was missing
    agent_name text,
    timestamp timestamptz DEFAULT now(),
    new_value text,
    old_value text,
    CONSTRAINT lead_activities_pkey PRIMARY KEY (id),
    CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT lead_activities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Conversation summaries
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    phone_number_normalized text NOT NULL,
    summary text NOT NULL,
    timestamp timestamptz NOT NULL,
    lead_id uuid,
    organization_id uuid,
    conversation_type text,
    messages_count integer,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT conversation_summaries_pkey PRIMARY KEY (id),
    CONSTRAINT conversation_summaries_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT conversation_summaries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Agent notes
CREATE TABLE IF NOT EXISTS public.agent_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    agent_name text NOT NULL,
    content text NOT NULL,
    lead_id uuid,
    organization_id uuid,
    note_type text,
    is_private boolean,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT agent_notes_pkey PRIMARY KEY (id),
    CONSTRAINT agent_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
    CONSTRAINT agent_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Agent phone numbers
CREATE TABLE IF NOT EXISTS public.agent_phone_numbers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    agent_name text NOT NULL,
    phone_number text NOT NULL,
    user_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT agent_phone_numbers_pkey PRIMARY KEY (id),
    CONSTRAINT agent_phone_numbers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Lead scoring factors
CREATE TABLE IF NOT EXISTS public.lead_scoring_factors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lead_id uuid,
    enhanced_lead_score numeric,
    score_confidence numeric,
    calculated_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    buying_signals_count integer,
    objections_count integer,
    avg_engagement_level numeric,
    voice_confidence_avg numeric,
    voice_enthusiasm_avg numeric,
    voice_stress_avg numeric,
    call_acceptance_rate numeric,
    message_engagement_rate numeric,
    follow_up_responsiveness numeric,
    response_time_avg numeric,
    conversion_probability numeric,
    churn_risk_score numeric,
    conversation_quality_trend text,
    sentiment_trajectory text,
    CONSTRAINT lead_scoring_factors_pkey PRIMARY KEY (id),
    CONSTRAINT lead_scoring_factors_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);

-- Admin notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    type text NOT NULL,
    message text NOT NULL,
    organization_id uuid,
    phone_number text,
    status text,
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT admin_notifications_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone_normalized ON public.conversations(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON public.conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_elevenlabs_id ON public.conversations(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_organization_id ON public.call_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_id ON public.call_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone_normalized ON public.call_sessions(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_call_sessions_elevenlabs_id ON public.call_sessions(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON public.leads(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_customer_name ON public.leads(customer_name);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_organization_id ON public.lead_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_metadata ON public.lead_activities USING GIN(metadata);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;

-- 7. CREATE RLS POLICIES (organization-based isolation)
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

DROP POLICY IF EXISTS "leads_organization_isolation" ON public.leads;
CREATE POLICY "leads_organization_isolation" ON public.leads
    FOR ALL USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_memberships om
            WHERE om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

DROP POLICY IF EXISTS "lead_activities_organization_isolation" ON public.lead_activities;
CREATE POLICY "lead_activities_organization_isolation" ON public.lead_activities
    FOR ALL USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_memberships om
            WHERE om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- 8. GRANT PERMISSIONS
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
GRANT ALL ON public.conversation_summaries TO authenticated;
GRANT ALL ON public.conversation_summaries TO service_role;
GRANT ALL ON public.agent_notes TO authenticated;
GRANT ALL ON public.agent_notes TO service_role;

-- 9. CREATE ESSENTIAL FUNCTIONS
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

-- 10. INSERT YOUR ORGANIZATION PHONE NUMBER MAPPING
INSERT INTO public.organization_phone_numbers (
    organization_id,
    phone_number,
    elevenlabs_phone_id,
    twilio_phone_sid,
    is_active
) VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    '+17786526908',
    'phnum_01jzb7ndccf5zsxsyvsx126dqz',
    'PN_UPDATE_WITH_REAL_TWILIO_SID',
    true
) ON CONFLICT (phone_number) DO UPDATE SET
    elevenlabs_phone_id = EXCLUDED.elevenlabs_phone_id,
    is_active = EXCLUDED.is_active,
    updated_at = now();

COMMIT;

-- 11. VERIFICATION QUERIES
SELECT 'Migration completed successfully!' as status;
SELECT 'conversations table' as table_name, count(*) as exists FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public';
SELECT 'call_sessions table' as table_name, count(*) as exists FROM information_schema.tables WHERE table_name = 'call_sessions' AND table_schema = 'public';
SELECT 'conversation_messages table' as table_name, count(*) as should_be_zero FROM information_schema.tables WHERE table_name = 'conversation_messages' AND table_schema = 'public';
SELECT 'lead_activities.metadata column' as column_name, count(*) as exists FROM information_schema.columns WHERE table_name = 'lead_activities' AND column_name = 'metadata' AND table_schema = 'public';
SELECT 'organization phone mapping' as status, count(*) as count FROM public.organization_phone_numbers WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';