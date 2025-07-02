-- FIX_LEAD_PHONE_UNIQUE_CONSTRAINT.sql
-- Allow duplicate phone numbers across organizations by making phone uniqueness scoped to organization.
BEGIN;

-- Drop old unique constraint if it exists
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

-- Create new composite unique constraint on (organization_id, phone_number_normalized)
ALTER TABLE leads
  ADD CONSTRAINT leads_org_phone_unique UNIQUE (organization_id, phone_number_normalized);

COMMIT; 