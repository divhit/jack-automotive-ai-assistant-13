ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_conversations integer DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_voice_calls integer DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS total_sms_messages integer DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity timestamptz;

GRANT SELECT ON lead_analytics TO authenticated, service_role;

