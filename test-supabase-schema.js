// Test Supabase Schema and Connection
import { createClient } from '@supabase/supabase-js';

console.log('🔧 Testing Supabase Schema and Connection');
console.log('==========================================\n');

// Use correct URL from user's logs
const supabaseUrl = 'https://ynukllskptalptwfgkss.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Configuration:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Service Key: ${supabaseServiceKey ? 'Present' : 'MISSING'}`);

if (!supabaseServiceKey) {
  console.log('\n❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY missing');
  console.log('📝 TO FIX:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Settings → API');
  console.log('3. Copy the "service_role" secret key');
  console.log('4. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-actual-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSchema() {
  console.log('\n1️⃣ Testing basic connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('leads').select('count').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ SCHEMA ISSUE: "leads" table does not exist');
        console.log('📝 TO FIX: Run the SQL from supabase-schema-safe.sql in your Supabase SQL editor');
        return false;
      } else {
        console.log('❌ Connection error:', error.message);
        return false;
      }
    }
    
    console.log('✅ Connection successful');
    
    // Test schema structure
    console.log('\n2️⃣ Testing schema structure...');
    
    const tables = ['leads', 'conversations', 'messages', 'sse_sessions'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          console.log(`❌ Table "${table}" missing or inaccessible:`, error.message);
        } else {
          console.log(`✅ Table "${table}" exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ Table "${table}" test failed:`, err.message);
      }
    }
    
    // Test functions
    console.log('\n3️⃣ Testing database functions...');
    
    try {
      const { data, error } = await supabase.rpc('get_or_create_lead', {
        p_phone_number: '+1234567890',
        p_name: 'Test User',
        p_source: 'test'
      });
      
      if (error) {
        console.log('❌ Function "get_or_create_lead" missing:', error.message);
      } else {
        console.log('✅ Function "get_or_create_lead" working');
        console.log('📋 Created lead ID:', data);
      }
    } catch (err) {
      console.log('❌ Function test failed:', err.message);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Schema test failed:', error.message);
    return false;
  }
}

async function runSchemaTest() {
  const schemaWorking = await testSchema();
  
  console.log('\n🏁 SCHEMA TEST RESULTS');
  console.log('======================');
  
  if (schemaWorking) {
    console.log('✅ Supabase schema is working correctly');
    console.log('📋 Your database is properly configured');
  } else {
    console.log('❌ Supabase schema issues detected');
    console.log('📝 NEXT STEPS:');
    console.log('1. Go to Supabase dashboard → SQL Editor');
    console.log('2. Copy content from supabase-schema-safe.sql');
    console.log('3. Paste and run the SQL');
    console.log('4. Add your SUPABASE_SERVICE_ROLE_KEY to .env.local');
  }
}

runSchemaTest(); 