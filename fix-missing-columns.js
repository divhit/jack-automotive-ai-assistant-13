#!/usr/bin/env node

/**
 * Fix missing columns in conversations table
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('🔧 FIXING MISSING COLUMNS IN CONVERSATIONS TABLE');
console.log('='.repeat(60));

async function fixMissingColumns() {
  const client = createClient(supabaseUrl, supabaseKey);

  // Check current table structure
  console.log('\n1. CHECKING CURRENT TABLE STRUCTURE:');

  try {
    // Get one row to see current columns
    const { data: sampleData, error: sampleError } = await client
      .from('conversations')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code !== 'PGRST116') { // PGRST116 = no rows
      console.log('   ❌ Error checking table:', sampleError.message);
      return;
    }

    if (sampleData) {
      console.log('   ✅ Current columns:', Object.keys(sampleData).join(', '));
    } else {
      console.log('   ℹ️  Table exists but has no data');
    }

    // Test what columns are missing by trying to insert
    console.log('\n2. TESTING MISSING COLUMNS:');

    const testInsert = {
      phone_number_normalized: '+1234567890',
      organization_id: 'test-org',
      content: 'test message',
      sent_by: 'test',
      timestamp: new Date().toISOString()
    };

    // Test without message_type first
    const { data: test1, error: error1 } = await client
      .from('conversations')
      .insert(testInsert)
      .select()
      .single();

    if (error1) {
      console.log('   ❌ Insert without message_type failed:', error1.message);

      if (error1.message.includes('message_type')) {
        console.log('   🔍 CONFIRMED: message_type column is missing!');

        // We need to add the column. However, we can't do this via the REST API
        // We need to do it via SQL in the Supabase dashboard
        console.log('\n3. SQL TO RUN IN SUPABASE DASHBOARD:');
        console.log('   Go to https://supabase.com/dashboard/project/mbasrbltrnpsgajccinh/sql');
        console.log('   Run this SQL:');
        console.log('');
        console.log('   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT \'text\';');
        console.log('   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_id UUID;');
        console.log('   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sequence_number INTEGER;');
        console.log('   ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB;');
        console.log('');
        console.log('   CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);');
        console.log('   CREATE INDEX IF NOT EXISTS idx_conversations_sequence ON conversations(sequence_number);');
        console.log('');
        return;
      }
    } else {
      // Clean up test record
      await client
        .from('conversations')
        .delete()
        .eq('id', test1.id);
      console.log('   ✅ Insert without message_type succeeded - column not required');
    }

    // Test with message_type
    const testInsertWithType = {
      ...testInsert,
      message_type: 'text'
    };

    const { data: test2, error: error2 } = await client
      .from('conversations')
      .insert(testInsertWithType)
      .select()
      .single();

    if (error2) {
      console.log('   ❌ Insert with message_type failed:', error2.message);
    } else {
      // Clean up test record
      await client
        .from('conversations')
        .delete()
        .eq('id', test2.id);
      console.log('   ✅ Insert with message_type succeeded - column exists');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  await fixMissingColumns();
}

main();