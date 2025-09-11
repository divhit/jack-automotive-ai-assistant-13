-- Add missing organization_memberships table
-- This table is required for the organization signup logic to work

-- Create organization_memberships table
CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'agent' CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'agent'::text, 'viewer'::text])),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}'::jsonb,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT organization_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT organization_memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT organization_memberships_user_org_unique UNIQUE (user_id, organization_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON public.organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON public.organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_org_memberships_active ON public.organization_memberships(is_active);

-- Enable RLS
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own memberships" ON public.organization_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view memberships in their organization" ON public.organization_memberships
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id 
      FROM public.organization_memberships om 
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

-- Admins can manage memberships in their organization
CREATE POLICY "Admins can manage organization memberships" ON public.organization_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_memberships om 
      WHERE om.user_id = auth.uid() 
        AND om.organization_id = organization_memberships.organization_id 
        AND om.role = 'admin' 
        AND om.is_active = true
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organization_memberships_updated_at 
  BEFORE UPDATE ON public.organization_memberships 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verify table was created
SELECT 'organization_memberships table created successfully!' as status; 