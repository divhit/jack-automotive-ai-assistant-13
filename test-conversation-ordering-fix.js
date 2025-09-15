#!/usr/bin/env node

// Test script to verify conversation ordering fix
// This tests the new sequence_number column and improved ordering

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnemFkaWxtdHVxdmltb2x6eG1zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI1NTIzNiwiZXhwIjoyMDY2ODMxMjM2fQ.AxcnALmg09uWGZzJFQz-7UqlfsDf5VSt0q0CreMHhZE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversationOrdering() {
  console.log('🧪 Testing Conversation Ordering Fix...\n');

  try {
    // Step 1: Check if sequence_number column exists
    console.log('1. Checking database schema...');
    const { data: columns, error: schemaError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError);
      return;
    }

    const hasSequenceNumber = columns.length > 0 && 'sequence_number' in columns[0];
    console.log(`   ✅ sequence_number column exists: ${hasSequenceNumber}`);

    // Step 2: Check for duplicate timestamps (the original problem)
    console.log('\n2. Analyzing timestamp duplicates...');
    const { data: duplicates, error: dupError } = await supabase
      .rpc('check_duplicate_timestamps');

    if (dupError) {
      // Fallback query if RPC doesn't exist
      const { data: timestampData, error: tsError } = await supabase
        .from('conversations')
        .select('timestamp, id, content, sent_by')
        .order('timestamp');

      if (tsError) {
        console.error('❌ Timestamp check failed:', tsError);
        return;
      }

      // Group by timestamp
      const timestampGroups = {};
      timestampData.forEach(row => {
        const ts = row.timestamp;
        if (!timestampGroups[ts]) timestampGroups[ts] = [];
        timestampGroups[ts].push(row);
      });

      const duplicateTimestamps = Object.entries(timestampGroups)
        .filter(([ts, rows]) => rows.length > 1)
        .slice(0, 5); // Show first 5

      console.log(`   Found ${duplicateTimestamps.length} timestamp groups with duplicates`);
      duplicateTimestamps.forEach(([ts, rows]) => {
        console.log(`   📅 ${ts}: ${rows.length} messages`);
        rows.forEach(row => {
          console.log(`      - ${row.sent_by}: "${row.content.substring(0, 30)}..."`);
        });
      });
    }

    // Step 3: Test the new ordering query
    console.log('\n3. Testing new ordering query...');
    
    // Find a phone number with multiple conversations
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('conversations')
      .select('phone_number_normalized, organization_id')
      .not('phone_number_normalized', 'is', null)
      .limit(1);

    if (phoneError || !phoneNumbers.length) {
      console.error('❌ Could not find test phone numbers:', phoneError);
      return;
    }

    const testPhone = phoneNumbers[0].phone_number_normalized;
    const testOrgId = phoneNumbers[0].organization_id;

    console.log(`   Testing with phone: ${testPhone}, org: ${testOrgId}`);

    // Test the improved query (matches the updated server.js logic)
    const { data: orderedMessages, error: orderError } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number_normalized', testPhone)
      .eq('organization_id', testOrgId)
      .order('timestamp', { ascending: true })
      .order('sequence_number', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(10);

    if (orderError) {
      console.error('❌ Ordering query failed:', orderError);
      return;
    }

    console.log(`   ✅ Retrieved ${orderedMessages.length} messages with improved ordering`);
    
    // Show ordering details
    orderedMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. [${msg.timestamp}] seq:${msg.sequence_number || 'NULL'} ${msg.sent_by}: "${msg.content.substring(0, 40)}..."`);
    });

    // Step 4: Verify chronological order
    console.log('\n4. Verifying chronological order...');
    let orderingCorrect = true;
    let previousTimestamp = null;

    for (let i = 0; i < orderedMessages.length; i++) {
      const currentTimestamp = new Date(orderedMessages[i].timestamp);
      if (previousTimestamp && currentTimestamp < previousTimestamp) {
        console.log(`   ❌ Ordering violation at index ${i}`);
        orderingCorrect = false;
      }
      previousTimestamp = currentTimestamp;
    }

    if (orderingCorrect) {
      console.log('   ✅ Chronological ordering is correct');
    }

    // Step 5: Test performance of new indexes
    console.log('\n5. Testing query performance...');
    const startTime = Date.now();
    
    const { data: perfTest, error: perfError } = await supabase
      .from('conversations')
      .select('timestamp, sequence_number, content, sent_by')
      .eq('phone_number_normalized', testPhone)
      .eq('organization_id', testOrgId)
      .order('timestamp', { ascending: true })
      .order('sequence_number', { ascending: true });

    const endTime = Date.now();
    
    if (perfError) {
      console.error('❌ Performance test failed:', perfError);
    } else {
      console.log(`   ✅ Query completed in ${endTime - startTime}ms`);
    }

    console.log('\n🎉 Conversation ordering fix verification complete!');
    
    return {
      hasSequenceNumber,
      duplicateCount: duplicateTimestamps?.length || 0,
      testMessagesCount: orderedMessages.length,
      orderingCorrect,
      queryTime: endTime - startTime
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testConversationOrdering()
  .then(results => {
    console.log('\n📊 Test Results:', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
