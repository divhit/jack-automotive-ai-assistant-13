import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkConversationsStructure() {
  console.log('🔍 Checking conversations table structure...\n');
  
  // Get a sample conversation to see its structure
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Sample conversation structure:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\nAvailable columns:', Object.keys(data[0]));
  } else {
    console.log('No conversations found in database');
    
    // Try to insert a minimal conversation to see what's required
    console.log('\nAttempting minimal insert to discover required fields...');
    const testInsert = await supabase
      .from('conversations')
      .insert({})
      .select();
    
    console.log('Insert result:', testInsert);
  }
  
  // Check if we can query just the phone number
  console.log('\n🔍 Checking for phone_number_normalized column...');
  const { data: phoneTest, error: phoneError } = await supabase
    .from('conversations')
    .select('phone_number_normalized')
    .limit(1);
  
  if (phoneError) {
    console.log('phone_number_normalized error:', phoneError.message);
  } else {
    console.log('✅ phone_number_normalized column exists');
  }
}

checkConversationsStructure();
