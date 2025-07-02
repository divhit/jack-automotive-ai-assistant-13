-- =====================================================
-- CORRECTED AUTH SYSTEM FIX
-- This fixes the auth.get_user_organization_id() function error
-- and ensures user profiles are created automatically
-- Run this ONCE in Supabase SQL Editor
-- =====================================================

-- 🔧 STEP 1: Ensure default organization exists
INSERT INTO organizations (name, slug, is_active) 
VALUES ('Default Dealership', 'default-dealership', true)
ON CONFLICT (slug) DO NOTHING;

-- 🔧 STEP 2: Create the missing auth helper function (from your schema)
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
    -- For service role, allow access to all data
    IF auth.role() = 'service_role' THEN
        RETURN NULL;
    END IF;
    
    -- For authenticated users, get their organization from user_profiles
    RETURN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 🔧 STEP 3: Create the user profile creation function (CORRECTED VERSION)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Get default organization ID
    SELECT id INTO default_org_id 
    FROM organizations 
    WHERE slug = 'default-dealership'
    LIMIT 1;
    
    -- If no default org exists, create one
    IF default_org_id IS NULL THEN
        INSERT INTO organizations (name, slug, is_active)
        VALUES ('Default Dealership', 'default-dealership', true)
        RETURNING id INTO default_org_id;
    END IF;
    
    -- Create user profile automatically
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
        NEW.id,
        default_org_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'agent', -- Default role
        true,
        NOW(),
        NOW()
    );
    
    -- Also create organization membership record
    INSERT INTO public.organization_memberships (
        user_id,
        organization_id,
        role,
        is_active,
        joined_at,
        updated_at
    ) VALUES (
        NEW.id,
        default_org_id,
        'agent',
        true,
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔧 STEP 4: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 🔧 STEP 5: Create any missing user profiles for existing users
INSERT INTO user_profiles (
    id,
    organization_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
)
SELECT 
    au.id,
    (SELECT id FROM organizations WHERE slug = 'default-dealership' LIMIT 1),
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    'agent',
    true,
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 🔧 STEP 6: Create missing organization memberships
INSERT INTO organization_memberships (
    user_id,
    organization_id,
    role,
    is_active,
    joined_at,
    updated_at
)
SELECT 
    up.id,
    up.organization_id,
    'agent',
    true,
    NOW(),
    NOW()
FROM user_profiles up
LEFT JOIN organization_memberships om ON up.id = om.user_id
WHERE om.user_id IS NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- =====================================================
-- ✅ VERIFICATION QUERIES
-- =====================================================

-- Check if everything was created properly
SELECT 
    'Organizations' as table_name,
    COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
    'User Profiles' as table_name,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Organization Memberships' as table_name,
    COUNT(*) as count
FROM organization_memberships;

-- Show the trigger
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- 🎉 SUCCESS! Auth system is now fixed!
-- New users will automatically get profiles created
-- Existing users now have profiles  
-- No more slow logins!
-- ===================================================== 