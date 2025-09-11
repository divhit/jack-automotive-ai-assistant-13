#!/usr/bin/env node

// Investigation script for conversations table structure and timestamp patterns
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function investigateConversationsTable() {
  console.log('🔍 Investigating conversations table structure and timestamp patterns...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check the structure of the conversations table
    console.log('📋 STEP 1: Checking conversations table structure...\n');
    
    // Try to get a sample record to understand structure
    const { data: sample, error: sampleError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('❌ Error accessing conversations table:', sampleError);
      return;
    }
    
    if (sample && sample.length > 0) {
      console.log('✅ Conversations table exists. Sample record structure:');
      console.log(Object.keys(sample[0]).map(key => `  ${key}: ${typeof sample[0][key]}`).join('\n'));
    } else {
      console.log('📋 Conversations table exists but is empty');
    }

    console.log('\n');

    // 2. Check total count of conversations
    console.log('📊 STEP 2: Checking conversation record count...\n');
    
    const { count, error: countError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting conversations:', countError);
      return;
    }

    console.log(`✅ Total conversations in table: ${count}\n`);

    if (count === 0) {
      console.log('📭 No conversation records found. Table is empty.\n');
      return;
    }

    // 3. Look at sample conversation records to understand timestamp patterns
    console.log('📋 STEP 3: Examining sample conversation records...\n');
    
    const { data: samples, error: samplesError } = await supabase
      .from('conversations')
      .select('id, timestamp, sent_by, content, type, organization_id, lead_id')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (samplesError) {
      console.error('❌ Error fetching sample conversations:', samplesError);
      return;
    }

    if (samples && samples.length > 0) {
      console.log('✅ Recent conversation samples (newest first):');
      samples.forEach((conv, index) => {
        const preview = conv.content ? conv.content.substring(0, 50) + '...' : 'No content';
        console.log(`  ${index + 1}. ${conv.timestamp} | ${conv.sent_by} | ${conv.type} | ${preview}`);
      });
    }

    console.log('\n');

    // 4. Check for timestamp patterns and potential duplicates
    console.log('🕐 STEP 4: Analyzing timestamp patterns...\n');
    
    // Check for exact timestamp duplicates
    console.log('Fetching all timestamps to analyze for duplicates...');
    const { data: allTimestamps, error: duplicatesError } = await supabase
      .from('conversations')
      .select('timestamp')
      .order('timestamp', { ascending: false });
    
    let duplicateTimestamps = [];
    
    if (!duplicatesError && allTimestamps) {
      // Count duplicates in JavaScript
      const timestampCounts = {};
      allTimestamps.forEach(row => {
        const ts = row.timestamp;
        timestampCounts[ts] = (timestampCounts[ts] || 0) + 1;
      });
      
      duplicateTimestamps = Object.entries(timestampCounts)
        .filter(([ts, count]) => count > 1)
        .map(([timestamp, count]) => ({ timestamp, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    if (duplicatesError) {
      console.error('❌ Error checking for duplicate timestamps:', duplicatesError);
    } else if (duplicateTimestamps && duplicateTimestamps.length > 0) {
      console.log('⚠️ Found conversations with identical timestamps:');
      duplicateTimestamps.forEach(dup => {
        console.log(`  Timestamp: ${dup.timestamp} appears ${dup.count} times`);
      });
      
      // Show details for the most duplicated timestamp
      const mostDuplicatedTimestamp = duplicateTimestamps[0].timestamp;
      const { data: duplicateDetails, error: detailsError } = await supabase
        .from('conversations')
        .select('id, timestamp, sent_by, content, type, organization_id')
        .eq('timestamp', mostDuplicatedTimestamp)
        .limit(5);
        
      if (!detailsError && duplicateDetails) {
        console.log(`\n  Details for timestamp ${mostDuplicatedTimestamp}:`);
        duplicateDetails.forEach(conv => {
          const preview = conv.content ? conv.content.substring(0, 30) + '...' : 'No content';
          console.log(`    ID: ${conv.id} | ${conv.sent_by} | ${conv.type} | Org: ${conv.organization_id} | ${preview}`);
        });
      }
    } else {
      console.log('✅ No conversations found with identical timestamps');
    }

    console.log('\n');

    // 5. Check timestamp distribution to understand ordering patterns
    console.log('📊 STEP 5: Timestamp distribution analysis...\n');
    
    const { data: timestampStats, error: statsError } = await supabase
      .from('conversations')
      .select('timestamp')
      .order('timestamp', { ascending: true })
      .limit(1000); // Sample first 1000 for analysis

    if (statsError) {
      console.error('❌ Error getting timestamp distribution:', statsError);
    } else if (timestampStats && timestampStats.length > 0) {
      const timestamps = timestampStats.map(r => new Date(r.timestamp));
      const oldest = timestamps[0];
      const newest = timestamps[timestamps.length - 1];
      const span = newest - oldest;
      const spanDays = span / (1000 * 60 * 60 * 24);
      
      console.log(`✅ Timestamp analysis (sample of ${timestampStats.length} records):`);
      console.log(`  Oldest: ${oldest.toISOString()}`);
      console.log(`  Newest: ${newest.toISOString()}`);
      console.log(`  Time span: ${spanDays.toFixed(1)} days`);
      
      // Check for timestamp precision patterns
      const timePrecisionPatterns = timestamps.map(ts => {
        const ms = ts.getMilliseconds();
        const sec = ts.getSeconds();
        return { hasMs: ms !== 0, hasSec: sec !== 0 };
      });
      
      const withMs = timePrecisionPatterns.filter(p => p.hasMs).length;
      const withSec = timePrecisionPatterns.filter(p => p.hasSec).length;
      
      console.log(`  Records with millisecond precision: ${withMs}/${timestampStats.length}`);
      console.log(`  Records with second precision: ${withSec}/${timestampStats.length}`);
    }

    console.log('\n');

    // 6. Check conversation ordering in context
    console.log('🔄 STEP 6: Checking conversation ordering patterns...\n');
    
    // Get a sample conversation thread to check ordering
    const { data: orgSample, error: orgError } = await supabase
      .from('conversations')
      .select('organization_id, lead_id')
      .not('organization_id', 'is', null)
      .not('lead_id', 'is', null)
      .limit(1);

    if (orgError || !orgSample || orgSample.length === 0) {
      console.log('⚠️ No conversations with organization_id and lead_id found for ordering analysis');
    } else {
      const sampleOrgId = orgSample[0].organization_id;
      const sampleLeadId = orgSample[0].lead_id;
      
      console.log(`📋 Analyzing conversation order for Lead: ${sampleLeadId} in Org: ${sampleOrgId}`);
      
      const { data: conversationThread, error: threadError } = await supabase
        .from('conversations')
        .select('id, timestamp, sent_by, content, type')
        .eq('organization_id', sampleOrgId)
        .eq('lead_id', sampleLeadId)
        .order('timestamp', { ascending: true }) // Show chronological order
        .limit(10);

      if (threadError) {
        console.error('❌ Error getting conversation thread:', threadError);
      } else if (conversationThread && conversationThread.length > 0) {
        console.log(`✅ Found ${conversationThread.length} messages in chronological order:`);
        conversationThread.forEach((msg, index) => {
          const preview = msg.content ? msg.content.substring(0, 40) + '...' : 'No content';
          console.log(`  ${index + 1}. ${msg.timestamp} | ${msg.sent_by} | ${preview}`);
        });
        
        // Check if timestamps are truly chronological
        let isChronological = true;
        for (let i = 1; i < conversationThread.length; i++) {
          const prev = new Date(conversationThread[i-1].timestamp);
          const curr = new Date(conversationThread[i].timestamp);
          if (curr < prev) {
            isChronological = false;
            console.log(`  ⚠️ Order issue: Message ${i+1} is older than message ${i}`);
          }
        }
        
        if (isChronological) {
          console.log('  ✅ Messages are in proper chronological order');
        }
      }
    }

    console.log('\n🔍 Investigation complete!');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateConversationsTable().catch(console.error);