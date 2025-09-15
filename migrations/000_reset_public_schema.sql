-- Danger: Wipes the target project's public schema.
-- Run this against the NEW Supabase project only.

BEGIN;

-- Drop and recreate public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Extensions commonly used by this repo
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- optional UUID helpers

-- Basic grants (Supabase manages roles, keep minimal)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

COMMIT;

-- After running this, apply COMPLETE-SCHEMA-MIGRATION.sql in the same DB.

