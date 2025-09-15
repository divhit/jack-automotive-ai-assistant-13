-- ⚠️  WARNING: This file creates conversation_messages table which is INCORRECT!
-- ⚠️  The correct schema uses only a 'conversations' table.
-- ⚠️  DO NOT RUN this migration - it will break the application!
-- ⚠️  Use fix-complete-schema.sql instead which creates the correct schema.
--
-- Fix missing schema elements for Jack Automotive AI Assistant
-- Project: mbasrbltrnpsgajccinh
-- Date: 2025-01-15

-- 1. Create call_sessions table (completely missing)
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    elevenlabs_conversation_id TEXT,
    twilio_call_sid TEXT,
    phone_number TEXT NOT NULL,
    phone_number_normalized TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    transcript TEXT,
    summary TEXT,
    call_outcome TEXT,
    call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),
    call_type TEXT CHECK (call_type IN ('voice', 'sms')),
    conversation_context TEXT,
    dynamic_variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for call_sessions
CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_id ON public.call_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_organization_id ON public.call_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone_normalized ON public.call_sessions(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_call_sessions_elevenlabs_id ON public.call_sessions(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_twilio_sid ON public.call_sessions(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_at ON public.call_sessions(started_at);

-- 2. Add missing metadata column to lead_activities (if it doesn't exist)
ALTER TABLE public.lead_activities
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata column
CREATE INDEX IF NOT EXISTS idx_lead_activities_metadata ON public.lead_activities USING GIN(metadata);

-- 3. Enable RLS on call_sessions
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for call_sessions (organization-based isolation)
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

-- 5. Grant necessary permissions
GRANT ALL ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;

-- 6. Create conversation_summaries table if missing (also referenced in logs)
CREATE TABLE IF NOT EXISTS public.conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    phone_number_normalized TEXT NOT NULL,
    summary TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    conversation_type TEXT,
    messages_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for conversation_summaries
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_lead_id ON public.conversation_summaries(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_organization_id ON public.conversation_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_phone_normalized ON public.conversation_summaries(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_timestamp ON public.conversation_summaries(timestamp);

-- Enable RLS on conversation_summaries
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policy for conversation_summaries
DROP POLICY IF EXISTS "conversation_summaries_organization_isolation" ON public.conversation_summaries;
CREATE POLICY "conversation_summaries_organization_isolation" ON public.conversation_summaries
    FOR ALL USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_memberships om
            WHERE om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- Grant permissions
GRANT ALL ON public.conversation_summaries TO authenticated;
GRANT ALL ON public.conversation_summaries TO service_role;

-- 7. Ensure conversation_messages table exists (primary table for SMS/voice persistence)
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_by TEXT NOT NULL,
    phone_number_normalized TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    message_status TEXT,
    twilio_message_sid TEXT,
    twilio_call_sid TEXT,
    elevenlabs_conversation_id TEXT,
    type TEXT DEFAULT 'sms',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for conversation_messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_lead_id ON public.conversation_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_organization_id ON public.conversation_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_phone_normalized ON public.conversation_messages(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_timestamp ON public.conversation_messages(timestamp);

-- Enable RLS on conversation_messages
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS policy for conversation_messages
DROP POLICY IF EXISTS "conversation_messages_organization_isolation" ON public.conversation_messages;
CREATE POLICY "conversation_messages_organization_isolation" ON public.conversation_messages
    FOR ALL USING (
        organization_id IN (
            SELECT om.organization_id
            FROM public.organization_memberships om
            WHERE om.user_id = auth.uid()
            AND om.is_active = true
        )
    );

-- Grant permissions
GRANT ALL ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;

-- 8. Insert the organization phone number mapping if missing
INSERT INTO public.organization_phone_numbers (
    organization_id,
    phone_number,
    twilio_phone_sid,
    elevenlabs_phone_id,
    is_active
) VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    '+17786526908',
    'PN_twilio_sid_here', -- You'll need to update this with actual Twilio SID
    'phnum_01jzb7ndccf5zsxsyvsx126dqz',
    true
) ON CONFLICT (phone_number) DO UPDATE SET
    elevenlabs_phone_id = EXCLUDED.elevenlabs_phone_id,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 9. Verification queries to confirm everything is working
SELECT 'call_sessions table exists' as status, count(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'call_sessions';

SELECT 'lead_activities.metadata column exists' as status, count(*) as column_exists
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lead_activities' AND column_name = 'metadata';

SELECT 'conversation_summaries table exists' as status, count(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'conversation_summaries';

SELECT 'conversation_messages table exists' as status, count(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'conversation_messages';

SELECT 'organization_phone_numbers count' as status, count(*) as phone_count
FROM public.organization_phone_numbers
WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';

-- Success message
SELECT 'Schema migration completed successfully!' as message;