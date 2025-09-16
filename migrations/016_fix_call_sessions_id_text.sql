DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='call_sessions' AND column_name='id' AND data_type='uuid'
  ) THEN
    ALTER TABLE public.call_sessions ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.call_sessions ALTER COLUMN id TYPE text USING id::text;
  END IF;
END$$;

