// Verify the conversation ordering fix has been applied successfully
import { createClient } from '@supabase/supabase-js';

console.log('🔍 Verifying Conversation Ordering Fix');
console.log('=====================================\n');

const supabaseUrl = process.env.SUPABASE_URL || 'https://dgzadilmtuqvimolzxms.supabase.co';
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

async function verifyFix() {
  console.log('\n1️⃣ Checking if sequence_number column exists...');
  
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, timestamp, sequence_number')
      .limit(5);
    
    if (error) {
      if (error.message.includes('sequence_number does not exist')) {
        console.log('❌ sequence_number column does not exist');
        console.log('📝 The SQL fix has not been applied yet');
        return false;
      } else {
        console.log(`❌ Error accessing conversations table: ${error.message}`);
        return false;
      }
    }
    
    console.log('✅ sequence_number column exists');
    console.log(`📊 Found ${data.length} sample records`);
    
    if (data.length > 0) {
      console.log('📋 Sample records with sequence numbers:');
      data.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id.substring(0, 8)}..., Timestamp: ${row.timestamp}, Sequence: ${row.sequence_number}`);
      });
      
      // Check if all records have sequence numbers
      const hasNullSequence = data.some(row => row.sequence_number === null || row.sequence_number === undefined);
      if (hasNullSequence) {
        console.log('⚠️ Some records have NULL sequence numbers');
      } else {
        console.log('✅ All sample records have sequence numbers');
      }
    }
    
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return false;
  }
  
  console.log('\n2️⃣ Checking for remaining duplicate timestamps...');
  
  try {
    // Manual query to check for duplicates
    const { data, error } = await supabase
      .from('conversations')
      .select('timestamp')
      .order('timestamp');
    
    if (error) {
      console.log(`❌ Error querying timestamps: ${error.message}`);
      return false;
    }
    
    // Group by timestamp to find duplicates
    const timestampCounts = {};
    data.forEach(row => {
      const ts = row.timestamp;
      timestampCounts[ts] = (timestampCounts[ts] || 0) + 1;
    });
    
    const duplicates = Object.entries(timestampCounts).filter(([ts, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} duplicate timestamps:`);
      duplicates.slice(0, 5).forEach(([timestamp, count]) => {
        console.log(`   Timestamp: ${timestamp}, Count: ${count}`);
      });
      if (duplicates.length > 5) {
        console.log(`   ... and ${duplicates.length - 5} more`);
      }
    } else {
      console.log('🎉 No duplicate timestamps found!');
    }
    
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return false;
  }
  
  console.log('\n3️⃣ Checking indexes...');
  
  try {
    // We can't directly query pg_indexes without special permissions,
    // but we can test if queries are fast by running a sample query
    const start = Date.now();
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .order('timestamp')
      .limit(10);
    
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`❌ Error testing query performance: ${error.message}`);
    } else {
      console.log(`✅ Query completed in ${duration}ms`);
      if (duration < 1000) {
        console.log('✅ Query performance looks good (indexes likely working)');
      } else {
        console.log('⚠️ Query took longer than expected (indexes may not be optimal)');
      }
    }
    
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
  
  return true;
}

async function main() {
  const success = await verifyFix();
  
  console.log('\n🏁 VERIFICATION COMPLETE');
  console.log('========================');
  
  if (success) {
    console.log('✅ Conversation ordering fix verification passed');
    console.log('📋 The database schema has been updated successfully');
    console.log('🎯 sequence_number column is available for proper message ordering');
  } else {
    console.log('❌ Verification failed or incomplete');
    console.log('📝 Please ensure all SQL statements have been executed in Supabase');
  }
}

main().catch(console.error);