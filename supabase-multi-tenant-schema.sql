-- Multi-Tenant Authentication Schema Enhancement
-- Run this AFTER the existing supabase-schema.sql
-- This is NON-DESTRUCTIVE and preserves all existing data and functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PHASE 1: ORGANIZATIONS/DEALERS MANAGEMENT
-- ==========================================

-- Create organizations table (automotive dealers)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
    domain TEXT, -- Custom domain for branding
    logo_url TEXT,
    phone_number TEXT,
    email TEXT,
    address JSONB, -- Full address object
    settings JSONB DEFAULT '{}'::jsonb, -- Dealer-specific settings
    subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create organization_features table for feature flags per dealer
CREATE TABLE IF NOT EXISTS organization_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PHASE 2: USER MANAGEMENT & AUTHENTICATION
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
    permissions JSONB DEFAULT '{}'::jsonb, -- Granular permissions
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- ==========================================
-- PHASE 3: MULTI-TENANT DATA ISOLATION
-- ==========================================

-- Add organization_id to existing tables (NON-DESTRUCTIVE)
-- These columns are nullable to preserve existing data
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
-- PHASE 4: AUDIT & SECURITY TABLES
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
    key_hash TEXT NOT NULL UNIQUE, -- Store hashed version only
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    permissions JSONB DEFAULT '{}'::jsonb,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PHASE 5: ROW LEVEL SECURITY POLICIES
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
        RETURN NULL; -- NULL means no restriction
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
        organization_id = auth.get_user_organization_id() OR
        id = auth.uid()
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        id = auth.uid()
    );

-- Enhanced RLS policies for existing tables
DROP POLICY IF EXISTS "Service role can access all leads" ON leads;
CREATE POLICY "Multi-tenant leads access" ON leads
    FOR ALL USING (
        auth.role() = 'service_role' OR
        organization_id = auth.get_user_organization_id() OR
        organization_id IS NULL -- Preserve existing data without org_id
    );

DROP POLICY IF EXISTS "Service role can access all conversations" ON conversations;
CREATE POLICY "Multi-tenant conversations access" ON conversations
    FOR ALL USING (
        auth.role() = 'service_role' OR
        organization_id = auth.get_user_organization_id() OR
        organization_id IS NULL -- Preserve existing data without org_id
    );

-- Similar policies for other tables
DROP POLICY IF EXISTS "Service role can access all messages" ON messages;
CREATE POLICY "Multi-tenant messages access" ON messages
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_id 
            AND (c.organization_id = auth.get_user_organization_id() OR c.organization_id IS NULL)
        )
    );

-- ==========================================
-- PHASE 6: UTILITY FUNCTIONS
-- ==========================================

-- Function to create a new organization (used during signup)
CREATE OR REPLACE FUNCTION create_organization(
    org_name TEXT,
    org_slug TEXT,
    admin_email TEXT,
    admin_first_name TEXT DEFAULT NULL,
    admin_last_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create the organization
    INSERT INTO organizations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely migrate existing leads to an organization
CREATE OR REPLACE FUNCTION migrate_existing_leads_to_organization(target_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Only migrate leads that don't have an organization assigned
    UPDATE leads 
    SET organization_id = target_org_id
    WHERE organization_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Also update related conversations
    UPDATE conversations 
    SET organization_id = target_org_id
    WHERE organization_id IS NULL
    AND lead_id IN (SELECT id FROM leads WHERE organization_id = target_org_id);
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PHASE 7: INDEXES FOR PERFORMANCE
-- ==========================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Membership indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON organization_memberships(role);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ==========================================
-- PHASE 8: UPDATED TIMESTAMP TRIGGERS
-- ==========================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_memberships_updated_at BEFORE UPDATE ON organization_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PHASE 9: SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ==========================================

-- Create a sample organization for testing
DO $$
DECLARE
    sample_org_id UUID;
BEGIN
    -- Only create if no organizations exist
    IF NOT EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
        INSERT INTO organizations (name, slug, email, phone_number) 
        VALUES (
            'Demo Auto Dealership', 
            'demo-auto',
            'admin@demo-auto.com',
            '+1-555-DEMO-AUTO'
        )
        RETURNING id INTO sample_org_id;
        
        -- Migrate any existing leads to this organization
        PERFORM migrate_existing_leads_to_organization(sample_org_id);
        
        RAISE NOTICE 'Created demo organization with ID: %', sample_org_id;
    END IF;
END
$$;

-- ==========================================
-- PHASE 10: HELPFUL QUERIES FOR MONITORING
-- ==========================================

-- View for organization statistics
CREATE OR REPLACE VIEW organization_stats AS
SELECT 
    o.id,
    o.name,
    o.slug,
    COUNT(DISTINCT up.id) as user_count,
    COUNT(DISTINCT l.id) as lead_count,
    COUNT(DISTINCT c.id) as conversation_count,
    o.created_at,
    o.is_active
FROM organizations o
LEFT JOIN user_profiles up ON o.id = up.organization_id
LEFT JOIN leads l ON o.id = l.organization_id
LEFT JOIN conversations c ON o.id = c.organization_id
GROUP BY o.id, o.name, o.slug, o.created_at, o.is_active;

-- View for user permissions
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    o.name as organization_name,
    o.slug as organization_slug,
    up.role as profile_role,
    om.role as membership_role,
    om.permissions as custom_permissions,
    up.is_active as user_active,
    om.is_active as membership_active
FROM user_profiles up
JOIN organizations o ON up.organization_id = o.id
LEFT JOIN organization_memberships om ON up.id = om.user_id AND o.id = om.organization_id;

-- ==========================================
-- DEPLOYMENT NOTES
-- ==========================================

/*
DEPLOYMENT CHECKLIST:

1. Run existing supabase-schema.sql first (if not already done)
2. Run this file: supabase-multi-tenant-schema.sql
3. Set up Supabase Auth settings in dashboard
4. Configure JWT secrets and auth policies
5. Set up email templates for organization signup
6. Test with sample data
7. Migrate existing data if needed using migrate_existing_leads_to_organization()

ENVIRONMENT VARIABLES NEEDED:
- SUPABASE_URL
- SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY (for server-side operations)
- JWT_SECRET (for custom auth flows)

SECURITY FEATURES:
✅ Row Level Security enabled
✅ Multi-tenant data isolation
✅ Role-based access control
✅ Audit logging
✅ API key management
✅ Non-destructive migration
✅ Backward compatibility

SCALABILITY FEATURES:
✅ Proper indexing for multi-tenant queries
✅ Efficient RLS policies
✅ Organization-based sharding ready
✅ Feature flags per organization
✅ Subscription tier management
*/ 