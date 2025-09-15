-- CLEANUP AND REATTACH PHONE NUMBER SCRIPT
-- This will:
-- 1. Delete ALL existing data from old database
-- 2. Create fresh Jack Automotive organization with new user
-- 3. Properly attach +17786526908 to the new organization

BEGIN;

-- =====================================================
-- STEP 1: COMPLETE CLEANUP - DELETE ALL OLD DATA
-- =====================================================

-- Delete all existing data to start fresh
DELETE FROM public.live_coaching_events;
DELETE FROM public.conversation_analytics;
DELETE FROM public.agent_performance_analytics;
DELETE FROM public.conversation_patterns;
DELETE FROM public.lead_scoring_factors;
DELETE FROM public.agent_notes;
DELETE FROM public.lead_activities;
DELETE FROM public.conversation_summaries;
DELETE FROM public.conversations;
DELETE FROM public.call_sessions;
DELETE FROM public.leads;
DELETE FROM public.organization_memberships;
DELETE FROM public.user_profiles;
DELETE FROM public.organization_phone_numbers;
DELETE FROM public.organizations;
DELETE FROM public.agent_phone_numbers;
DELETE FROM public.admin_notifications;

-- =====================================================
-- STEP 2: CREATE NEW JACK AUTOMOTIVE ORGANIZATION
-- =====================================================

-- Insert the exact Jack Automotive organization (same ID as expected by code)
INSERT INTO public.organizations (
    id,
    name,
    slug,
    domain,
    email,
    phone_number,
    is_active,
    subscription_tier,
    settings,
    created_at,
    updated_at
) VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    'Jack Automotive',
    'jack-automotive',
    'jackautomotive.ai',
    'contact@jackautomotive.ai',
    '+17786526908',
    true,
    'professional',
    '{"theme": "automotive", "ai_enabled": true, "voice_enabled": true}'::jsonb,
    now(),
    now()
);

-- =====================================================
-- STEP 3: ATTACH PHONE NUMBER TO NEW ORGANIZATION
-- =====================================================

-- Insert the phone number mapping to NEW organization
INSERT INTO public.organization_phone_numbers (
    id,
    organization_id,
    phone_number,
    elevenlabs_phone_id,
    twilio_phone_sid,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    '+17786526908',
    'phnum_01jzb7ndccf5zsxsyvsx126dqz',
    'PN47c0f8730210b007c5058d54673b9b14',
    true,
    now(),
    now()
);

-- =====================================================
-- STEP 4: CREATE YOUR NEW USER PROFILE
-- =====================================================

-- Insert your user profile for the NEW organization
INSERT INTO public.user_profiles (
    id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    timezone,
    preferences,
    created_at,
    updated_at
) VALUES (
    '57bba8b1-40f1-4725-870f-42dd383c02c9',
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    'divhit@gmail.com',
    'Divyanshu',
    'Dixit',
    'admin',
    true,
    'America/Vancouver',
    '{"notifications": true, "dark_mode": false, "auto_refresh": true}'::jsonb,
    now(),
    now()
);

-- =====================================================
-- STEP 5: CREATE ORGANIZATION MEMBERSHIP
-- =====================================================

-- Create organization membership with full admin permissions
INSERT INTO public.organization_memberships (
    id,
    user_id,
    organization_id,
    role,
    is_active,
    permissions,
    joined_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '57bba8b1-40f1-4725-870f-42dd383c02c9',
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    'admin',
    true,
    '{
        "admin": true,
        "lead:create": true,
        "lead:update": true,
        "lead:delete": true,
        "conversation:view": true,
        "analytics:view": true,
        "settings:manage": true
    }'::jsonb,
    now(),
    now(),
    now()
);

-- =====================================================
-- STEP 6: UPDATE ORGANIZATION DEFAULT PHONE
-- =====================================================

-- Set the phone number as the default for the organization
UPDATE public.organizations
SET default_phone_number_id = (
    SELECT id FROM public.organization_phone_numbers
    WHERE phone_number = '+17786526908'
    AND organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f'
)
WHERE id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';

COMMIT;

-- =====================================================
-- STEP 7: VERIFICATION QUERIES
-- =====================================================

SELECT '🎉 CLEANUP AND REATTACH COMPLETED!' as status;

SELECT '📋 VERIFICATION RESULTS:' as section;

SELECT
    '✅ Organization Created' as check_name,
    name as organization_name,
    id as organization_id,
    phone_number as org_phone
FROM public.organizations
WHERE id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';

SELECT
    '✅ Phone Number Attached' as check_name,
    phone_number,
    elevenlabs_phone_id,
    twilio_phone_sid,
    is_active
FROM public.organization_phone_numbers
WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';

SELECT
    '✅ User Profile Created' as check_name,
    email,
    first_name,
    last_name,
    role,
    is_active
FROM public.user_profiles
WHERE id = '57bba8b1-40f1-4725-870f-42dd383c02c9';

SELECT
    '✅ Organization Membership' as check_name,
    role,
    is_active,
    permissions
FROM public.organization_memberships
WHERE user_id = '57bba8b1-40f1-4725-870f-42dd383c02c9';

SELECT
    '📱 Phone Number Configuration' as section,
    count(*) as total_phone_numbers
FROM public.organization_phone_numbers;

SELECT
    '👤 Total Users' as section,
    count(*) as total_users
FROM public.user_profiles;

SELECT
    '🏢 Total Organizations' as section,
    count(*) as total_organizations
FROM public.organizations;

SELECT '🚀 System ready for +17786526908 → Jack Automotive!' as final_status;