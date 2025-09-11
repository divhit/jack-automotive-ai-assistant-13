-- =====================================================
-- CORRECTED SECURITY FIX: Based on Actual Database Schema
-- This addresses the cross-organization data leakage in conversations
-- Run this in Supabase SQL Editor
-- =====================================================

-- 🔧 STEP 1: Add organization_id to conversations table (the main security issue)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add organization_id to other tables that need it
ALTER TABLE conversation_summaries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE conversation_analytics ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE agent_notes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 🔧 STEP 2: Add indexes for organization filtering
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_org_lookup ON conversations(lead_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_organization_id ON conversation_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_organization_id ON call_sessions(organization_id);

-- 🔧 STEP 3: Migrate existing conversations to match their lead's organization
UPDATE conversations 
SET organization_id = (
    SELECT l.organization_id 
    FROM leads l 
    WHERE l.id = conversations.lead_id
)
WHERE organization_id IS NULL AND lead_id IS NOT NULL;

-- Update conversation summaries
UPDATE conversation_summaries 
SET organization_id = (
    SELECT l.organization_id 
    FROM leads l 
    WHERE l.id = conversation_summaries.lead_id
)
WHERE organization_id IS NULL AND lead_id IS NOT NULL;

-- Update call sessions
UPDATE call_sessions 
SET organization_id = (
    SELECT l.organization_id 
    FROM leads l 
    WHERE l.id = call_sessions.lead_id
)
WHERE organization_id IS NULL AND lead_id IS NOT NULL;

-- 🔧 STEP 4: Update RLS policies for conversations (the critical fix)
-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Service role can access all conversations" ON conversations;
DROP POLICY IF EXISTS "Multi-tenant conversations access" ON conversations;

-- Create organization-scoped RLS policy for conversations
CREATE POLICY "Organization-scoped conversations access" ON conversations
    FOR ALL USING (
        auth.role() = 'service_role' OR
        organization_id = (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Similar policies for related tables
DROP POLICY IF EXISTS "Service role can access all conversation_summaries" ON conversation_summaries;
CREATE POLICY "Organization-scoped conversation_summaries access" ON conversation_summaries
    FOR ALL USING (
        auth.role() = 'service_role' OR
        organization_id = (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can access all call_sessions" ON call_sessions;
CREATE POLICY "Organization-scoped call_sessions access" ON call_sessions
    FOR ALL USING (
        auth.role() = 'service_role' OR
        organization_id = (
            SELECT organization_id 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 🔧 STEP 5: Create helper function for organization lookup
CREATE OR REPLACE FUNCTION public.get_current_user_organization_id()
RETURNS UUID AS $$
BEGIN
    -- For service role, return NULL (no restriction)
    IF auth.role() = 'service_role' THEN
        RETURN NULL;
    END IF;
    
    -- For authenticated users, get their organization
    RETURN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if organization_id was added to conversations
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name = 'organization_id';

-- Check data migration status
SELECT 
    COUNT(*) as total_conversations,
    COUNT(organization_id) as conversations_with_org_id,
    COUNT(*) - COUNT(organization_id) as missing_org_id
FROM conversations;

-- Show sample of conversations with their organization data
SELECT 
    c.id,
    c.phone_number_normalized,
    c.organization_id,
    l.customer_name,
    l.organization_id as lead_org_id
FROM conversations c
LEFT JOIN leads l ON c.lead_id = l.id
LIMIT 5;

-- =====================================================
-- CRITICAL: Next Steps Required
-- =====================================================

/*
✅ WHAT THIS FIX ACCOMPLISHES:
1. Adds organization_id to conversations table
2. Migrates existing conversations to their lead's organization
3. Creates organization-scoped RLS policies
4. Prevents cross-organization conversation access at database level

🚨 SERVER CODE STILL NEEDS UPDATES:
1. server.js: getConversationHistory function (already started by user)
2. services/supabasePersistence.js: add organization filtering to queries
3. Frontend: ensure organization context is passed to API calls

The database is now secure, but server-side code must be updated to complete the fix.
*/ 