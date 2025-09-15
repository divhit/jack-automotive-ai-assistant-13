#!/usr/bin/env node

// Apply the conversation ordering schema fix to the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchemaFix() {
  console.log('🔧 Applying Conversation Ordering Schema Fix...\n');

  try {
    // Step 1: Add sequence_number column
    console.log('1. Adding sequence_number column...');
    const { error: columnError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sequence_number SERIAL;'
    });
    
    if (columnError) {
      console.error('❌ Failed to add sequence_number column:', columnError);
      return false;
    }
    console.log('   ✅ sequence_number column added');

    // Step 2: Create indexes
    console.log('\n2. Creating performance indexes...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_conversations_timestamp_sequence ON conversations(timestamp ASC, sequence_number ASC);',
      'CREATE INDEX IF NOT EXISTS idx_conversations_org_phone_timestamp ON conversations(organization_id, phone_number_normalized, timestamp ASC, sequence_number ASC);'
    ];

    for (const query of indexQueries) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: query });
      if (indexError) {
        console.error('❌ Failed to create index:', indexError);
        return false;
      }
    }
    console.log('   ✅ Performance indexes created');

    // Step 3: Update existing records with sequence numbers
    console.log('\n3. Updating existing records with sequence numbers...');
    const updateQuery = `
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
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateQuery });
    if (updateError) {
      console.error('❌ Failed to update sequence numbers:', updateError);
      return false;
    }
    console.log('   ✅ Existing records updated with sequence numbers');

    // Step 4: Make sequence_number NOT NULL
    console.log('\n4. Setting sequence_number as NOT NULL...');
    const { error: notNullError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE conversations ALTER COLUMN sequence_number SET NOT NULL;'
    });
    
    if (notNullError) {
      console.error('❌ Failed to set sequence_number NOT NULL:', notNullError);
      return false;
    }
    console.log('   ✅ sequence_number set as NOT NULL');

    // Step 5: Verify the changes
    console.log('\n5. Verifying changes...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('conversations')
      .select('timestamp, sequence_number, content, sent_by')
      .order('timestamp')
      .order('sequence_number')
      .limit(5);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return false;
    }

    console.log('   ✅ Schema changes verified successfully');
    console.log('   Sample data:');
    verifyData.forEach((row, index) => {
      console.log(`   ${index + 1}. [${row.timestamp}] seq:${row.sequence_number} ${row.sent_by}: "${row.content.substring(0, 30)}..."`);
    });

    console.log('\n🎉 Schema fix applied successfully!');
    return true;

  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    return false;
  }
}

// Run the schema fix
applySchemaFix()
  .then(success => {
    if (success) {
      console.log('\n✅ Ready to test the conversation ordering fix!');
      process.exit(0);
    } else {
      console.log('\n❌ Schema fix failed. Check errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Schema fix crashed:', error);
    process.exit(1);
  });
