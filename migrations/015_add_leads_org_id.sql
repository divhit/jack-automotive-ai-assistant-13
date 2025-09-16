ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id uuid;
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);

