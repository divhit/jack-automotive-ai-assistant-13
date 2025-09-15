#!/usr/bin/env node

/**
 * Analyze schema differences between old and new database
 * and check which table structure should be used for message persistence
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const OLD_DATABASE_URL = process.env.OLD_SUPABASE_URL;
const NEW_DATABASE_URL = 'https://mbasrbltrnpsgajccinh.supabase.co';

console.log('🔍 ANALYZING SCHEMA DIFFERENCES');
console.log('='.repeat(60));

async function analyzeSchemas() {
  console.log('\n1. TESTING TABLE STRUCTURES IN NEW DATABASE:');

  const newClient = createClient(NEW_DATABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Test conversations table structure
  try {
    console.log('\n   📋 Testing conversations table:');
    const { data: conversationsTest, error: convError } = await newClient
      .from('conversations')
      .select('*')
      .limit(1);

    if (convError) {
      console.log('   ❌ conversations table error:', convError.message);
    } else {
      console.log('   ✅ conversations table exists');
      if (conversationsTest && conversationsTest.length > 0) {
        console.log('   📝 columns:', Object.keys(conversationsTest[0]).sort().join(', '));
      } else {
        console.log('   📝 table exists but empty - checking schema info');
      }
    }
  } catch (error) {
    console.log('   ❌ conversations table error:', error.message);
  }

  // Test conversation_messages table structure
  try {
    console.log('\n   📋 Testing conversation_messages table:');
    const { data: messagesTest, error: msgError } = await newClient
      .from('conversation_messages')
      .select('*')
      .limit(1);

    if (msgError) {
      console.log('   ❌ conversation_messages table error:', msgError.message);
    } else {
      console.log('   ✅ conversation_messages table exists');
      if (messagesTest && messagesTest.length > 0) {
        console.log('   📝 columns:', Object.keys(messagesTest[0]).sort().join(', '));
      } else {
        console.log('   📝 table exists but empty');
      }
    }
  } catch (error) {
    console.log('   ❌ conversation_messages table error:', error.message);
  }

  console.log('\n2. TESTING WHAT PERSISTENCE CODE SHOULD USE:');

  // Test current persistence approach (what code is doing now)
  const testOrgId = 'aabe0501-4eb6-4b98-9d9f-01381506314f';
  const testPhone = '+16049085474';
  const testMessage = `Schema test - ${new Date().toISOString()}`;

  console.log('\n   🧪 Testing current approach (conversations table):');
  try {
    const { data: currentTest, error: currentError } = await newClient
      .from('conversations')
      .insert({
        organization_id: testOrgId,
        phone_number_normalized: testPhone,
        content: testMessage,
        sent_by: 'test_script',
        message_type: 'text',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (currentError) {
      console.log('   ❌ Current approach FAILED:', currentError.message);

      if (currentError.message.includes('message_type')) {
        console.log('   🔍 CONFIRMED: message_type column missing from conversations table');
      }
    } else {
      console.log('   ✅ Current approach WORKS');
      // Clean up
      await newClient.from('conversations').delete().eq('id', currentTest.id);
    }
  } catch (error) {
    console.log('   ❌ Current approach ERROR:', error.message);
  }

  console.log('\n   🧪 Testing better approach (conversation_messages table):');
  try {
    const { data: betterTest, error: betterError } = await newClient
      .from('conversation_messages')
      .insert({
        organization_id: testOrgId,
        phone_number_normalized: testPhone,
        content: testMessage,
        sent_by: 'agent',
        message_type: 'text',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (betterError) {
      console.log('   ❌ Better approach FAILED:', betterError.message);
    } else {
      console.log('   ✅ Better approach WORKS - conversation_messages is the right table!');
      // Clean up
      await newClient.from('conversation_messages').delete().eq('id', betterTest.id);
    }
  } catch (error) {
    console.log('   ❌ Better approach ERROR:', error.message);
  }

  console.log('\n3. ANALYZING OLD DATABASE FOR COMPARISON:');

  // Try to connect to old database to see what table structure it had
  try {
    const oldClient = createClient(OLD_DATABASE_URL, process.env.SUPABASE_ANON_KEY);

    // Check if old DB had conversations or conversation_messages
    const { data: oldConversations, error: oldConvError } = await oldClient
      .from('conversations')
      .select('*')
      .limit(1);

    if (!oldConvError && oldConversations) {
      console.log('   📋 Old database HAD conversations table');
      if (oldConversations.length > 0) {
        console.log('   📝 Old conversations columns:', Object.keys(oldConversations[0]).sort().join(', '));
      }
    }

    const { data: oldMessages, error: oldMsgError } = await oldClient
      .from('conversation_messages')
      .select('*')
      .limit(1);

    if (!oldMsgError && oldMessages) {
      console.log('   📋 Old database HAD conversation_messages table');
      if (oldMessages.length > 0) {
        console.log('   📝 Old conversation_messages columns:', Object.keys(oldMessages[0]).sort().join(', '));
      }
    }

  } catch (error) {
    console.log('   ⚠️ Could not access old database (expected)');
  }

  console.log('\n4. RECOMMENDATIONS:');
  console.log('   Based on the new schema you provided:');
  console.log('   - ✅ conversation_messages table has proper message_type column');
  console.log('   - ✅ conversation_messages is designed for individual messages');
  console.log('   - ✅ conversations table is for conversation metadata');
  console.log('   - 🔧 Code should save messages to conversation_messages, not conversations');
}

async function main() {
  await analyzeSchemas();

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CONCLUSION:');
  console.log('   The persistence code should use conversation_messages table');
  console.log('   The conversations table is for conversation-level metadata');
  console.log('   This explains why message_type is missing from conversations!');
}

main().catch(console.error);
