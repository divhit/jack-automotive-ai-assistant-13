-- =====================================================
-- MULTI-TENANT AUTHENTICATION SETUP
-- Apply this in your Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ORGANIZATIONS/DEALERS MANAGEMENT
-- ==========================================

-- Create organizations table (automotive dealers)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    logo_url TEXT,
    phone_number TEXT,
    email TEXT,
    address JSONB,
    settings JSONB DEFAULT '{}'::jsonb,
    subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create organization_features table
CREATE TABLE IF NOT EXISTS organization_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- USER MANAGEMENT & AUTHENTICATION
-- ==========================================

-- Create user_profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'agent' CHECK (role IN ('super_admin', 'admin', 'manager', 'agent', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}'::jsonb,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_memberships for many-to-many user-org relationships
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}'::jsonb,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- ==========================================
-- MULTI-TENANT DATA ISOLATION
-- ==========================================

-- Add organization_id to existing tables (NON-DESTRUCTIVE)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Add organization context to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

-- Add organization context to other tables
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ==========================================
-- AUDIT & SECURITY TABLES
-- ==========================================

-- Create audit_logs for tracking sensitive actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_keys for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
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

-- Helper function to check if user has specific role
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Service role has all permissions
    IF auth.role() = 'service_role' THEN
        RETURN true;
    END IF;
    
    -- Check if user has the required role
    RETURN EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN organization_memberships om ON up.id = om.user_id
        WHERE up.id = auth.uid()
        AND om.is_active = true
        AND (up.role = required_role OR up.role = 'super_admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Organizations RLS policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        id = auth.get_user_organization_id()
    );

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (
        auth.role() = 'service_role' OR 
        (id = auth.get_user_organization_id() AND auth.user_has_role('admin'))
    );

-- User profiles RLS policies
CREATE POLICY "Users can view profiles in their organization" ON user_profiles
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.role() = 'service_role' OR 
        id = auth.uid()
    );

-- Leads RLS policies (multi-tenant isolation)
CREATE POLICY "Users can view leads in their organization" ON leads
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can insert leads for their organization" ON leads
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR 
        organization_id = auth.get_user_organization_id()
    );

CREATE POLICY "Users can update leads in their organization" ON leads
    FOR UPDATE USING (
        auth.role() = 'service_role' OR 
        organization_id = auth.get_user_organization_id()
    );

-- Organization memberships RLS
CREATE POLICY "Users can view memberships in their organization" ON organization_memberships
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        organization_id = auth.get_user_organization_id()
    );

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to create organization with user
CREATE OR REPLACE FUNCTION create_organization_with_user(
    org_name TEXT,
    org_slug TEXT,
    user_id UUID,
    user_email TEXT,
    user_first_name TEXT DEFAULT NULL,
    user_last_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, email)
    VALUES (org_name, org_slug, user_email)
    RETURNING id INTO new_org_id;
    
    -- Create user profile
    INSERT INTO user_profiles (
        id, organization_id, email, first_name, last_name, role
    ) VALUES (
        user_id, new_org_id, user_email, user_first_name, user_last_name, 'admin'
    );
    
    -- Create organization membership
    INSERT INTO organization_memberships (
        user_id, organization_id, role
    ) VALUES (
        user_id, new_org_id, 'admin'
    );
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate existing leads to organization
CREATE OR REPLACE FUNCTION migrate_existing_leads_to_organization(target_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE leads 
    SET organization_id = target_org_id
    WHERE organization_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON organization_memberships(role);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ==========================================
-- SAMPLE DATA (OPTIONAL)
-- ==========================================

-- Insert a demo organization
INSERT INTO organizations (name, slug, email, subscription_tier)
VALUES ('Demo Automotive Dealership', 'demo-dealership', 'demo@example.com', 'professional')
ON CONFLICT (slug) DO NOTHING;

-- Enable email auth (run in Supabase Auth settings)
-- Go to Authentication > Settings > Email

-- Complete! Your multi-tenant system is ready.
-- Next steps:
-- 1. Enable email authentication in Supabase Dashboard
-- 2. Test signup/login at /auth route
-- 3. Create your first organization
-- 4. Test data isolation between organizations 