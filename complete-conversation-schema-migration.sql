-- ⚠️  WARNING: This file creates conversation_messages table which is INCORRECT!
-- ⚠️  The correct schema uses only a 'conversations' table.
-- ⚠️  DO NOT RUN this migration - it will break the application!
-- ⚠️  Use fix-complete-schema.sql instead which creates the correct schema.
--
-- Complete Conversation Schema Migration
-- This script adds all missing columns referenced in the codebase for conversation history

-- ============================================================================
-- CONVERSATIONS TABLE ENHANCEMENTS
-- ============================================================================

-- Add missing columns that the code expects but may not exist
DO $$
BEGIN
    -- Add sequence_number for proper message ordering
    BEGIN
        ALTER TABLE conversations ADD COLUMN sequence_number INTEGER;
        RAISE NOTICE 'Added sequence_number column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'sequence_number column already exists in conversations';
    END;

    -- Add direction column for SMS/call direction tracking
    BEGIN
        ALTER TABLE conversations ADD COLUMN direction TEXT CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text]));
        RAISE NOTICE 'Added direction column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'direction column already exists in conversations';
    END;

    -- Add source column to track where the conversation originated
    BEGIN
        ALTER TABLE conversations ADD COLUMN source TEXT DEFAULT 'system'::text;
        RAISE NOTICE 'Added source column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'source column already exists in conversations';
    END;

    -- Add additional metadata columns that may be referenced
    BEGIN
        ALTER TABLE conversations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'created_at column already exists in conversations';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'updated_at column already exists in conversations';
    END;

    -- Add conversation summary for AI analysis
    BEGIN
        ALTER TABLE conversations ADD COLUMN conversation_summary TEXT;
        RAISE NOTICE 'Added conversation_summary column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'conversation_summary column already exists in conversations';
    END;

    -- Add sentiment analysis result
    BEGIN
        ALTER TABLE conversations ADD COLUMN sentiment_analysis JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added sentiment_analysis column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'sentiment_analysis column already exists in conversations';
    END;

    -- Add call quality metrics
    BEGIN
        ALTER TABLE conversations ADD COLUMN call_quality_score DECIMAL(3,2);
        RAISE NOTICE 'Added call_quality_score column to conversations';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'call_quality_score column already exists in conversations';
    END;

END$$;

-- ============================================================================
-- CONVERSATION_MESSAGES TABLE ENHANCEMENTS
-- ============================================================================

-- Add missing columns for conversation_messages table
DO $$
BEGIN
    -- Add sequence_number for proper message ordering
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN sequence_number INTEGER;
        RAISE NOTICE 'Added sequence_number column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'sequence_number column already exists in conversation_messages';
    END;

    -- Add direction for message direction tracking
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN direction TEXT CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text]));
        RAISE NOTICE 'Added direction column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'direction column already exists in conversation_messages';
    END;

    -- Add external_id for tracking external system references
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN external_id TEXT;
        RAISE NOTICE 'Added external_id column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'external_id column already exists in conversation_messages';
    END;

    -- Add phone_number for direct phone tracking
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Added phone_number column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'phone_number column already exists in conversation_messages';
    END;

    -- Add phone_number_normalized for consistent lookups
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN phone_number_normalized TEXT;
        RAISE NOTICE 'Added phone_number_normalized column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'phone_number_normalized column already exists in conversation_messages';
    END;

    -- Add status column for message delivery status
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN status TEXT DEFAULT 'sent'::text;
        RAISE NOTICE 'Added status column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'status column already exists in conversation_messages';
    END;

    -- Add updated_at for tracking message updates
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'updated_at column already exists in conversation_messages';
    END;

    -- Add Twilio-specific columns
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN twilio_message_sid TEXT;
        RAISE NOTICE 'Added twilio_message_sid column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'twilio_message_sid column already exists in conversation_messages';
    END;

    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN twilio_call_sid TEXT;
        RAISE NOTICE 'Added twilio_call_sid column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'twilio_call_sid column already exists in conversation_messages';
    END;

    -- Add ElevenLabs-specific columns
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN elevenlabs_conversation_id TEXT;
        RAISE NOTICE 'Added elevenlabs_conversation_id column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'elevenlabs_conversation_id column already exists in conversation_messages';
    END;

    -- Add AI analysis columns
    BEGIN
        ALTER TABLE conversation_messages ADD COLUMN ai_analysis JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added ai_analysis column to conversation_messages';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'ai_analysis column already exists in conversation_messages';
    END;

END$$;

-- ============================================================================
-- ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes on commonly queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_phone_normalized_org
ON conversations (phone_number_normalized, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_lead_id_timestamp
ON conversations (lead_id, timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_timestamp_desc
ON conversations (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_conversation_timestamp
ON conversation_messages (conversation_id, timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_phone_normalized_org
ON conversation_messages (phone_number_normalized, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_timestamp_desc
ON conversation_messages (timestamp DESC);

-- ============================================================================
-- ADD ORGANIZATION_PHONE_NUMBERS MISSING COLUMNS
-- ============================================================================

-- Add missing columns to organization_phone_numbers that are referenced in server.js
DO $$
BEGIN
    -- Add twilio_phone_sid for Twilio phone number management
    BEGIN
        ALTER TABLE organization_phone_numbers ADD COLUMN twilio_phone_sid TEXT;
        RAISE NOTICE 'Added twilio_phone_sid column to organization_phone_numbers';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'twilio_phone_sid column already exists in organization_phone_numbers';
    END;

    -- Add updated_at for tracking changes
    BEGIN
        ALTER TABLE organization_phone_numbers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to organization_phone_numbers';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'updated_at column already exists in organization_phone_numbers';
    END;

END$$;

-- ============================================================================
-- UPDATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_messages_updated_at ON conversation_messages;
CREATE TRIGGER update_conversation_messages_updated_at
    BEFORE UPDATE ON conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_phone_numbers_updated_at ON organization_phone_numbers;
CREATE TRIGGER update_organization_phone_numbers_updated_at
    BEFORE UPDATE ON organization_phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show current table structures
SELECT 'Conversations table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Conversation_messages table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'conversation_messages'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Organization_phone_numbers table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'organization_phone_numbers'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show current row counts
SELECT 'conversations' as table_name, count(*) as count FROM conversations;
SELECT 'conversation_messages' as table_name, count(*) as count FROM conversation_messages;
SELECT 'organization_phone_numbers' as table_name, count(*) as count FROM organization_phone_numbers;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '✅ Complete conversation schema migration completed!' as status;