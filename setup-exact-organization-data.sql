-- Setup Exact Organization Data for New Database
-- This recreates the exact same organization, user, and phone mapping from the old database

BEGIN;

-- 1. Insert the exact Jack Automotive organization
INSERT INTO public.organizations (
    id,
    name,
    slug,
    is_active,
    created_at,
    updated_at
) VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    'Jack Automotive',
    'jack-automotive',
    true,
    now(),
    now()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 2. Insert the phone number mapping
INSERT INTO public.organization_phone_numbers (
    organization_id,
    phone_number,
    elevenlabs_phone_id,
    twilio_phone_sid,
    is_active,
    created_at,
    updated_at
) VALUES (
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
    '+17786526908',
    'phnum_01jzb7ndccf5zsxsyvsx126dqz',
    'TWILIO_SID_TO_BE_FILLED',
    true,
    now(),
    now()
) ON CONFLICT (phone_number) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    elevenlabs_phone_id = EXCLUDED.elevenlabs_phone_id,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 3. Insert/update your user profile to belong to Jack Automotive
INSERT INTO public.user_profiles (
    id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
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
    now(),
    now()
) ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 4. Insert organization membership
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
    'aabe0501-4eb6-4b98-9d9f-01381506314f',
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

COMMIT;

-- Verification queries
SELECT '✅ Organization Setup Complete!' as status;
SELECT 'Organization:', name, id FROM public.organizations WHERE id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';
SELECT 'Phone Mapping:', phone_number, elevenlabs_phone_id FROM public.organization_phone_numbers WHERE organization_id = 'aabe0501-4eb6-4b98-9d9f-01381506314f';
SELECT 'User Profile:', email, role FROM public.user_profiles WHERE id = '57bba8b1-40f1-4725-870f-42dd383c02c9';
SELECT 'Organization Membership:', role, is_active FROM public.organization_memberships WHERE user_id = '57bba8b1-40f1-4725-870f-42dd383c02c9';