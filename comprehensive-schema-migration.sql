-- COMPREHENSIVE SCHEMA MIGRATION FOR PROJECT mbasrbltrnpsgajccinh
-- This addresses the specific errors identified in the application logs:
-- 1. Could not find the table 'public.call_sessions' in the schema cache
-- 2. Could not find the 'metadata' column of 'lead_activities' in the schema cache

-- PART 1: CREATE MISSING call_sessions TABLE
-- This table is required by the ElevenLabs voice calling functionality
CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Call identifiers (exact match to current metadata)
  elevenlabs_conversation_id TEXT,
  twilio_call_sid TEXT,
  phone_number TEXT NOT NULL,
  phone_number_normalized TEXT NOT NULL,
  call_direction TEXT DEFAULT 'outbound',

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Content (preserves call summaries exactly)
  transcript TEXT,
  summary TEXT,
  call_outcome TEXT,

  -- Context preservation
  conversation_context TEXT,
  dynamic_variables JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for call_sessions
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policy for call_sessions
CREATE POLICY "Allow all access to call_sessions" ON call_sessions
    FOR ALL USING (true);

-- Create indexes for call_sessions
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone ON call_sessions(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_date ON call_sessions(lead_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_elevenlabs ON call_sessions(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_organization_id ON call_sessions(organization_id);

-- PART 2: FIX lead_activities TABLE - Add missing 'metadata' column
-- The current lead_activities table is missing the 'metadata' column that the application expects
DO $$
BEGIN
    -- Check if the table exists first, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities' AND table_schema = 'public') THEN
        -- Create the complete lead_activities table with all required columns
        CREATE TABLE lead_activities (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
            organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

            activity_type TEXT NOT NULL, -- 'call_initiated', 'sms_sent', 'status_changed', etc.
            description TEXT NOT NULL,

            -- Activity metadata
            old_value TEXT,
            new_value TEXT,
            agent_name TEXT,

            -- CRITICAL: This is the missing column that causes the cache error
            metadata JSONB DEFAULT '{}',

            timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

        -- Create permissive RLS policy
        CREATE POLICY "Allow all access to lead_activities" ON lead_activities
            FOR ALL USING (true);

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_activities_lead_time ON lead_activities(lead_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_lead_activities_organization_id ON lead_activities(organization_id);

    ELSE
        -- Table exists, just add the missing columns
        BEGIN
            ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
        EXCEPTION
            WHEN duplicate_column THEN
                NULL; -- Column already exists, ignore
        END;

        -- Ensure other commonly needed columns exist
        BEGIN
            ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS old_value TEXT;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS new_value TEXT;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        BEGIN
            ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS agent_name TEXT;
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        -- Ensure proper timestamp column (rename if needed)
        BEGIN
            ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
        EXCEPTION
            WHEN duplicate_column THEN NULL;
        END;

        -- Create missing indexes
        CREATE INDEX IF NOT EXISTS idx_activities_lead_time ON lead_activities(lead_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_lead_activities_organization_id ON lead_activities(organization_id);
    END IF;
END$$;

-- PART 3: ENSURE OTHER CRITICAL TABLES EXIST
-- Create conversation_summaries if missing (referenced in error logs)
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone_number_normalized TEXT NOT NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Summary data (exact match to current structure)
  summary TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  -- Context
  conversation_type TEXT DEFAULT 'mixed',
  messages_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for conversation_summaries
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policy
CREATE POLICY "Allow all access to conversation_summaries" ON conversation_summaries
    FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_summaries_phone ON conversation_summaries(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_organization_id ON conversation_summaries(organization_id);

-- PART 4: VERIFY ORGANIZATION PHONE NUMBER CONFIGURATION
-- This is critical for SMS/Voice functionality to work properly
INSERT INTO organization_phone_numbers (organization_id, phone_number, phone_type, is_active)
VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    '+17786526908', -- Your ElevenLabs phone number from .env
    'main',
    true
) ON CONFLICT (phone_number) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active;

-- PART 5: VERIFICATION QUERIES
-- These will help confirm everything is set up correctly
SELECT 'VERIFICATION: Tables Exist Check' as status;

SELECT
    'call_sessions' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'call_sessions' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT
    'lead_activities' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'lead_activities' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

SELECT
    'lead_activities.metadata column' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lead_activities'
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Verify organization phone number setup
SELECT 'VERIFICATION: Organization Phone Number' as status;
SELECT
    o.name as organization_name,
    opn.phone_number,
    opn.is_active,
    opn.phone_type
FROM organizations o
JOIN organization_phone_numbers opn ON o.id = opn.organization_id
WHERE opn.phone_number = '+17786526908';

-- PART 6: POPULATE organization_id FOR EXISTING RECORDS
-- Update any existing records that might be missing organization_id references
UPDATE call_sessions
SET organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
WHERE organization_id IS NULL
AND lead_id IN (
    SELECT id FROM leads WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
);

UPDATE lead_activities
SET organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
WHERE organization_id IS NULL
AND lead_id IN (
    SELECT id FROM leads WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
);

UPDATE conversation_summaries
SET organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
WHERE organization_id IS NULL
AND lead_id IN (
    SELECT id FROM leads WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
);

-- Final verification
SELECT 'MIGRATION COMPLETE' as status;
SELECT 'Tables created: call_sessions, lead_activities (with metadata column), conversation_summaries' as summary;
SELECT 'Organization phone number configured: +17786526908 for Jack Automotive' as phone_config;