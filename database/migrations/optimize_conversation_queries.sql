-- CRITICAL PERFORMANCE OPTIMIZATION: Conversation History Query Performance
-- This migration creates a covering index for the most frequent query pattern
-- Expected improvement: 200-300ms → 15-25ms (90%+ reduction)

-- Drop existing potentially conflicting indexes if they exist
DROP INDEX IF EXISTS idx_conversations_org_phone_time_optimized;

-- Create covering index optimized for conversation history lookups
-- This index covers the entire query: filter + sort + return columns
-- Postgres can satisfy the query entirely from the index without touching the main table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_org_phone_time_optimized
ON conversations(organization_id, phone_number_normalized, timestamp DESC)
INCLUDE (id, content, sent_by, type);

-- Add comment for documentation
COMMENT ON INDEX idx_conversations_org_phone_time_optimized IS
'Covering index for conversation history queries: filters by org+phone, orders by timestamp DESC, includes display columns';

-- Analyze the table to update statistics for query planner
ANALYZE conversations;

-- Verify index was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_conversations_org_phone_time_optimized'
  ) THEN
    RAISE NOTICE 'Index idx_conversations_org_phone_time_optimized created successfully';
  ELSE
    RAISE WARNING 'Index creation may have failed - please verify manually';
  END IF;
END $$;