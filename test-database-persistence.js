#!/usr/bin/env node

/**
 * Test script to verify conversation persistence is going to the correct database
 * This simulates what happens during SMS/call persistence
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const OLD_DATABASE_URL = 'https://dgzadilmtuqvimolzxms.supabase.co';
const NEW_DATABASE_URL = 'https://mbasrbltrnpsgajccinh.supabase.co';

console.log('🧪 TESTING DATABASE PERSISTENCE CONFIGURATION');
console.log('='.repeat(60));

async function testDatabaseConnections() {
  console.log('\n1. ENVIRONMENT VARIABLES CHECK:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
  console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`);

  // Check which database the environment variables point to
  if (process.env.SUPABASE_URL?.includes('dgzadilmtuqvimolzxms')) {
    console.log('   ❌ PROBLEM: Environment points to OLD database!');
  } else if (process.env.SUPABASE_URL?.includes('mbasrbltrnpsgajccinh')) {
    console.log('   ✅ Environment points to NEW database');
  } else {
    console.log('   ⚠️  Environment points to unknown database');
  }

  console.log('\n2. TEST DIRECT DATABASE CONNECTIONS:');

  // Test OLD database connection
  try {
    const oldClient = createClient(OLD_DATABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: oldData, error: oldError } = await oldClient
      .from('conversations')
      .select('count(*)')
      .single();

    if (oldError) {
      console.log('   OLD DB: ❌ Connection failed:', oldError.message);
    } else {
      console.log(`   OLD DB: ✅ Connected - has conversation data`);
    }
  } catch (error) {
    console.log('   OLD DB: ❌ Connection error:', error.message);
  }

  // Test NEW database connection
  try {
    const newClient = createClient(NEW_DATABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: newData, error: newError } = await newClient
      .from('conversations')
      .select('count(*)')
      .single();

    if (newError) {
      console.log('   NEW DB: ❌ Connection failed:', newError.message);
    } else {
      console.log(`   NEW DB: ✅ Connected - has conversation data`);
    }
  } catch (error) {
    console.log('   NEW DB: ❌ Connection error:', error.message);
  }

  console.log('\n3. TEST CONVERSATION PERSISTENCE PATH:');

  // Create a client using environment variables (same as production)
  const envClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );

  // Test write a conversation message
  const testPhone = '+16049085474';
  const testOrgId = 'aabe0501-4eb6-4b98-9d9f-01381506314f';
  const testMessage = `Test message - ${new Date().toISOString()}`;

  try {
    console.log(`   📝 Attempting to write test message to conversations table...`);

    const { data: writeData, error: writeError } = await envClient
      .from('conversations')
      .insert({
        phone_number_normalized: testPhone,
        organization_id: testOrgId,
        content: testMessage,
        sent_by: 'agent',
        type: 'text',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (writeError) {
      console.log('   ❌ WRITE FAILED:', writeError.message);
    } else {
      console.log('   ✅ WRITE SUCCESS - Message saved to database');
      console.log(`   📋 Database URL: ${process.env.SUPABASE_URL}`);

      // Clean up test message
      await envClient
        .from('conversations')
        .delete()
        .eq('id', writeData.id);
      console.log('   🗑️  Test message cleaned up');
    }
  } catch (error) {
    console.log('   ❌ WRITE ERROR:', error.message);
  }

  console.log('\n4. TEST CONVERSATION LOADING:');

  try {
    const { data: loadData, error: loadError } = await envClient
      .from('conversations')
      .select('*')
      .eq('phone_number_normalized', testPhone)
      .eq('organization_id', testOrgId)
      .order('timestamp', { ascending: true })
      .limit(5);

    if (loadError) {
      console.log('   ❌ LOAD FAILED:', loadError.message);
    } else {
      console.log(`   ✅ LOAD SUCCESS - Found ${loadData.length} existing messages`);
      if (loadData.length > 0) {
        const latest = loadData[loadData.length - 1];
        console.log(`   📋 Latest message: "${latest.content.substring(0, 50)}..." (${latest.timestamp})`);
      }
    }
  } catch (error) {
    console.log('   ❌ LOAD ERROR:', error.message);
  }
}

async function main() {
  try {
    await testDatabaseConnections();

    console.log('\n' + '='.repeat(60));
    console.log('🎯 SUMMARY:');
    console.log('   - If WRITE SUCCESS shows NEW database URL, persistence is correct');
    console.log('   - If WRITE SUCCESS shows OLD database URL, environment is wrong');
    console.log('   - If any connection failures, check API keys');
    console.log('   - This test simulates exactly what SMS/call persistence does');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();