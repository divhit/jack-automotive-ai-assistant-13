#!/usr/bin/env node

// Test current conversations table schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking conversations table schema...');

    // Get table columns
    const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'conversations' });

    if (error) {
      console.log('RPC not available, using direct query...');

      // Fallback: check what columns exist by doing a simple select
      const { data: sample, error: selectError } = await supabase
        .from('conversations')
        .select('*')
        .limit(1);

      if (selectError) {
        console.error('❌ Error selecting from conversations:', selectError);

        // Try to see what tables exist
        const { data: tables, error: tablesError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');

        if (!tablesError) {
          console.log('📋 Available tables:', tables.map(t => t.table_name));
        }
      } else {
        console.log('✅ Conversations table exists');
        console.log('Sample data structure:', sample?.[0] ? Object.keys(sample[0]) : 'No data yet');
      }
    } else {
      console.log('Schema:', data);
    }

    // Let's also test the organization_phone_numbers table
    console.log('\n📞 Checking organization_phone_numbers...');
    const { data: phones, error: phoneError } = await supabase
      .from('organization_phone_numbers')
      .select('*');

    if (phoneError) {
      console.error('❌ Error with organization_phone_numbers:', phoneError);
    } else {
      console.log('✅ Phone numbers found:', phones?.length || 0);
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema().then(() => {
  console.log('🏁 Schema check complete');
  process.exit(0);
});