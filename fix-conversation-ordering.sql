-- Fix for conversation transcript ordering issue
-- This addresses the problem where multiple messages have identical timestamps

-- Step 1: Add sequence_number column to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sequence_number SERIAL;

-- Step 2: Create index for improved query performance
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp_sequence 
ON conversations(timestamp ASC, sequence_number ASC);

-- Step 3: Create index for organization-scoped queries
CREATE INDEX IF NOT EXISTS idx_conversations_org_phone_timestamp 
ON conversations(organization_id, phone_number_normalized, timestamp ASC, sequence_number ASC);

-- Step 4: Update existing records to have proper sequence numbers within each phone conversation
-- This ensures existing data has correct ordering
WITH conversation_sequences AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, phone_number_normalized 
      ORDER BY timestamp ASC, created_at ASC, id ASC
    ) as new_sequence
  FROM conversations
  WHERE sequence_number IS NULL
)
UPDATE conversations 
SET sequence_number = conversation_sequences.new_sequence
FROM conversation_sequences
WHERE conversations.id = conversation_sequences.id;

-- Step 5: Make sequence_number NOT NULL now that all records have values
ALTER TABLE conversations ALTER COLUMN sequence_number SET NOT NULL;

-- Verification query - check for any remaining duplicate timestamps
SELECT 
  timestamp,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as conversation_ids
FROM conversations 
GROUP BY timestamp 
HAVING COUNT(*) > 1 
ORDER BY duplicate_count DESC 
LIMIT 10;