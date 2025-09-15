-- FIND AND ATTACH TO NEW ORGANIZATION SCRIPT
-- This script will find your actual organization ID in the NEW database
-- and properly attach the lead and phone number to it

-- =====================================================
-- STEP 1: FIND YOUR ACTUAL ORGANIZATION ID
-- =====================================================

-- First, let's see what organization was created for your user
SELECT
    'Your Organization Details:' as info,
    u.id as user_id,
    u.email,
    u.organization_id,
    o.id as org_id,
    o.name as org_name,
    o.slug
FROM public.user_profiles u
LEFT JOIN public.organizations o ON u.organization_id = o.id
WHERE u.email = 'divhit@gmail.com'
   OR u.id = '57bba8b1-40f1-4725-870f-42dd383c02c9';

-- Also check organization_memberships table
SELECT
    'Organization Memberships:' as info,
    om.user_id,
    om.organization_id,
    om.role,
    om.is_active,
    o.name as org_name
FROM public.organization_memberships om
LEFT JOIN public.organizations o ON om.organization_id = o.id
WHERE om.user_id = '57bba8b1-40f1-4725-870f-42dd383c02c9';

-- Show all organizations in the database
SELECT
    'All Organizations:' as info,
    id,
    name,
    slug,
    created_at
FROM public.organizations
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: AFTER YOU IDENTIFY THE CORRECT ORG ID
-- REPLACE 'YOUR_ACTUAL_ORG_ID_HERE' WITH THE REAL ONE
-- =====================================================

-- Uncomment and modify the section below once you know the org ID:

/*
BEGIN;

-- Update your user profile to the correct organization (if needed)
UPDATE public.user_profiles
SET organization_id = 'YOUR_ACTUAL_ORG_ID_HERE'
WHERE id = '57bba8b1-40f1-4725-870f-42dd383c02c9';

-- Create or update organization membership
INSERT INTO public.organization_memberships (
    user_id,
    organization_id,
    role,
    is_active,
    permissions,
    joined_at,
    created_at,
    updated_at
) VALUES (
    '57bba8b1-40f1-4725-870f-42dd383c02c9',
    'YOUR_ACTUAL_ORG_ID_HERE',
    'admin',
    true,
    '{"admin": true, "lead:create": true, "lead:update": true, "lead:delete": true}'::jsonb,
    now(),
    now(),
    now()
) ON CONFLICT (user_id, organization_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    permissions = EXCLUDED.permissions,
    updated_at = now();

-- Insert the phone number mapping to YOUR organization
INSERT INTO public.organization_phone_numbers (
    organization_id,
    phone_number,
    elevenlabs_phone_id,
    twilio_phone_sid,
    is_active,
    created_at,
    updated_at
) VALUES (
    'YOUR_ACTUAL_ORG_ID_HERE',
    '+17786526908',
    'phnum_01jzb7ndccf5zsxsyvsx126dqz',
    'PN47c0f8730210b007c5058d54673b9b14',
    true,
    now(),
    now()
) ON CONFLICT (phone_number) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    elevenlabs_phone_id = EXCLUDED.elevenlabs_phone_id,
    twilio_phone_sid = EXCLUDED.twilio_phone_sid,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- Update any existing leads to belong to your organization
UPDATE public.leads
SET organization_id = 'YOUR_ACTUAL_ORG_ID_HERE'
WHERE phone_number_normalized = '+17786526908'
   OR created_by = '57bba8b1-40f1-4725-870f-42dd383c02c9';

COMMIT;

-- Verification
SELECT '✅ Attachment Complete!' as status;
SELECT 'Phone Mapping:', phone_number, organization_id FROM public.organization_phone_numbers WHERE phone_number = '+17786526908';
SELECT 'User Profile:', email, organization_id FROM public.user_profiles WHERE id = '57bba8b1-40f1-4725-870f-42dd383c02c9';
SELECT 'Leads:', count(*), organization_id FROM public.leads WHERE organization_id = 'YOUR_ACTUAL_ORG_ID_HERE' GROUP BY organization_id;
*/