-- Ensure lead_activities.lead_id is text to match leads.id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='lead_activities' AND column_name='lead_id' AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_lead_id_fkey;
    ALTER TABLE public.lead_activities ALTER COLUMN lead_id TYPE text USING lead_id::text;
  END IF;
END$$;

