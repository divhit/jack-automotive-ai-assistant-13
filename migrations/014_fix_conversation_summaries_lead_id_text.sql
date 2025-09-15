DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='conversation_summaries' AND column_name='lead_id' AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.conversation_summaries DROP CONSTRAINT IF EXISTS conversation_summaries_lead_id_fkey;
    ALTER TABLE public.conversation_summaries ALTER COLUMN lead_id TYPE text USING lead_id::text;
  END IF;
END$$;

