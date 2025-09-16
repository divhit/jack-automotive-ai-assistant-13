-- Expand user_profiles to match frontend expectations and allow basic RLS access
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add missing columns if not present
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Temporary default org to avoid missing organization context on first login
DO $$
DECLARE
  default_org uuid := 'aabe0501-4eb6-4b98-9d9f-01381506314f'::uuid;
BEGIN
  EXECUTE 'ALTER TABLE public.user_profiles ALTER COLUMN organization_id SET DEFAULT ' || quote_literal(default_org);
END$$;

-- RLS: allow authenticated users basic access to their own profile rows
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_self_select" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_upsert" ON public.user_profiles;
CREATE POLICY "profiles_self_select" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'service_role' OR id = auth.uid());
CREATE POLICY "profiles_self_upsert" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.user_profiles
  FOR UPDATE USING (auth.role() = 'service_role' OR id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

