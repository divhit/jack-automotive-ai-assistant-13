-- SAFE DATABASE CHECK - Run this first to see what exists
-- This is READ-ONLY and makes no changes

-- Check if tables exist
SELECT 
  'organizations' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'organizations' AND table_schema = 'public'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'user_profiles' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles' AND table_schema = 'public'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'leads' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'leads' AND table_schema = 'public'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if organization_id column exists in leads table
SELECT 
  'leads.organization_id' as column_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' 
    AND column_name = 'organization_id' 
    AND table_schema = 'public'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check existing policies (RLS)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as allowed_operations
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 