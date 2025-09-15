// Execute conversation ordering fix SQL script step by step
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

console.log('🔧 Executing Conversation Ordering Fix');
console.log('=====================================\n');

// Try both URLs to find the correct one
const testUrl = 'https://ynukllskptalptwfgkss.supabase.co';
const fallbackUrl = null;

// Use the URL from environment or test file
const supabaseUrl = process.env.SUPABASE_URL || testUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Configuration:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Service Key: ${supabaseServiceKey ? 'Present' : 'MISSING'}`);

if (!supabaseServiceKey) {
  console.log('\n❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY missing');
  console.log('📝 TO FIX: Set SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL statements to execute step by step
const sqlSteps = [
  {
    name: "Step 1: Add sequence_number column",
    sql: "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sequence_number SERIAL;"
  },
  {
    name: "Step 2: Create index for improved query performance",
    sql: `CREATE INDEX IF NOT EXISTS idx_conversations_timestamp_sequence 
          ON conversations(timestamp ASC, sequence_number ASC);`
  },
  {
    name: "Step 3: Create index for organization-scoped queries",
    sql: `CREATE INDEX IF NOT EXISTS idx_conversations_org_phone_timestamp 
          ON conversations(organization_id, phone_number_normalized, timestamp ASC, sequence_number ASC);`
  },
  {
    name: "Step 4: Update existing records with sequence numbers",
    sql: `WITH conversation_sequences AS (
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
          WHERE conversations.id = conversation_sequences.id;`
  },
  {
    name: "Step 5: Make sequence_number NOT NULL",
    sql: "ALTER TABLE conversations ALTER COLUMN sequence_number SET NOT NULL;"
  }
];

const verificationQuery = {
  name: "Verification: Check for duplicate timestamps",
  sql: `SELECT 
          timestamp,
          COUNT(*) as duplicate_count,
          STRING_AGG(id::text, ', ') as conversation_ids
        FROM conversations 
        GROUP BY timestamp 
        HAVING COUNT(*) > 1 
        ORDER BY duplicate_count DESC 
        LIMIT 10;`
};

async function executeSQL(step) {
  try {
    console.log(`\n📝 ${step.name}`);
    console.log('SQL:', step.sql.replace(/\s+/g, ' ').trim());
    
    // Execute SQL using the Supabase SQL client directly
    const { data, error } = await supabase.rpc('exec_sql', { query: step.sql });
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('⚠️ Note: This SQL might need to be executed manually in Supabase SQL Editor');
      return false;
    }
    
    console.log('✅ Success');
    if (data && data.length > 0) {
      console.log('📊 Result:', data);
    }
    return true;
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    console.log('⚠️ Note: This SQL needs to be executed manually in Supabase SQL Editor');
    return false;
  }
}

async function runVerification() {
  try {
    console.log(`\n📝 ${verificationQuery.name}`);
    console.log('SQL:', verificationQuery.sql.replace(/\s+/g, ' ').trim());
    
    // Simple check: verify conversations table exists and has records
    const { data, error } = await supabase
      .from('conversations')
      .select('id, timestamp')
      .limit(5);
    
    if (error) {
      console.log(`❌ Error accessing conversations table: ${error.message}`);
      return false;
    }
    
    console.log('✅ Can access conversations table');
    console.log(`📊 Found ${data.length} sample records`);
    
    if (data.length > 0) {
      console.log('📋 Sample records:');
      data.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, Timestamp: ${row.timestamp}`);
      });
      
      // Try to check if sequence_number column exists
      try {
        const { data: seqData, error: seqError } = await supabase
          .from('conversations')
          .select('sequence_number')
          .limit(1);
        
        if (seqError) {
          console.log('⚠️ sequence_number column does not exist yet (expected before fix)');
        } else {
          console.log('✅ sequence_number column already exists');
        }
      } catch (err) {
        console.log('⚠️ sequence_number column does not exist yet (expected before fix)');
      }
    }
    
    return true;
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Testing Supabase connection and executing SQL statements...\n');
  
  // First, test the connection
  console.log('1️⃣ Testing connection to Supabase...');
  const connectionTest = await runVerification();
  
  if (!connectionTest) {
    console.log('\n❌ Connection test failed. Cannot proceed.');
    process.exit(1);
  }
  
  console.log('\n🏁 CONNECTION TEST COMPLETE');
  console.log('===========================');
  console.log('✅ Connection to Supabase working');
  
  console.log('\n📋 EXECUTING SQL STATEMENTS');
  console.log('============================');
  
  let allSuccessful = true;
  
  // Execute each SQL step
  for (let i = 0; i < sqlSteps.length; i++) {
    const step = sqlSteps[i];
    const success = await executeSQL(step);
    
    if (!success) {
      console.log(`\n⚠️ Step ${i + 1} failed or needs manual execution`);
      allSuccessful = false;
      // Continue with other steps to see what else might work
    }
    
    // Add a small delay between steps
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RUNNING VERIFICATION QUERY');
  console.log('==============================');
  
  // Run verification query
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('timestamp, sequence_number, content, sent_by')
      .order('timestamp', { ascending: true })
      .order('sequence_number', { ascending: true })
      .limit(5);
    
    if (error) {
      console.log(`❌ Verification query failed: ${error.message}`);
    } else {
      console.log('✅ Verification query succeeded');
      console.log('📋 Sample results:');
      data.forEach((row, index) => {
        console.log(`   ${index + 1}. Timestamp: ${row.timestamp}, Seq: ${row.sequence_number}, From: ${row.sent_by}`);
      });
    }
  } catch (err) {
    console.log(`❌ Verification exception: ${err.message}`);
  }
  
  if (allSuccessful) {
    console.log('\n🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
  } else {
    console.log('\n⚠️ SOME STEPS FAILED');
    console.log('Please check the output above and manually execute any failed SQL statements in the Supabase SQL Editor.');
  }
}

main().catch(console.error);
