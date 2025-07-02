-- Migration: Make phone number uniqueness scoped by organization
-- Allows same phone number to be used by different organizations

BEGIN;

-- Drop old unique constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_phone_normalized_unique'
      AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_phone_normalized_unique;
  END IF;
END$$;

-- Add new composite unique constraint
ALTER TABLE leads
  ADD CONSTRAINT leads_org_phone_unique UNIQUE (organization_id, phone_number_normalized);

COMMIT; 