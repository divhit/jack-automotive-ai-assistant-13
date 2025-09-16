#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testConversationLoading() {
  console.log('🧪 Testing conversation loading flow...');

  // Test the exact query that supabasePersistence.getConversationHistory() uses
  const phoneNumber = '+16049085474';
  const organizationId = 'aabe0501-4eb6-4b98-9d9f-01381506314f';

  console.log(`📋 Testing conversation loading for:
   - Phone: ${phoneNumber}
   - Organization: ${organizationId}`);

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number_normalized', phoneNumber)
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: true })
      .limit(50);

    if (error) {
      console.error('❌ Error loading conversations:', error);
      return;
    }

    console.log(`✅ Found ${data.length} conversations`);

    if (data.length > 0) {
      console.log('\n📝 Sample conversation details:');
      const sample = data[0];
      console.log('- ID:', sample.id);
      console.log('- Content:', sample.content?.substring(0, 100) + '...');
      console.log('- Sent by:', sample.sent_by);
      console.log('- Type:', sample.type);
      console.log('- Timestamp:', sample.timestamp);
      console.log('- Organization ID:', sample.organization_id);
      console.log('- Lead ID:', sample.lead_id);

      // Format like the system expects
      console.log('\n🔧 Formatted for frontend:');
      const formatted = data.map((msg, index) => ({
        id: `msg-${index}-${Date.now()}`,
        content: msg.content,
        timestamp: msg.timestamp,
        sentBy: msg.sent_by,
        type: msg.type || 'sms',
        status: 'delivered'
      }));

      console.log('Formatted messages:', formatted.length);
      console.log('Sample formatted:', formatted[0]);
    } else {
      console.log('❌ No conversations found - this is the issue!');

      // Check if conversations exist with different phone format
      console.log('\n🔍 Checking for conversations with different phone formats...');
      const { data: allConvs, error: allError } = await supabase
        .from('conversations')
        .select('phone_number, phone_number_normalized, organization_id')
        .eq('organization_id', organizationId);

      if (!allError && allConvs.length > 0) {
        console.log('📋 Found conversations for this organization:');
        allConvs.forEach((conv, i) => {
          console.log(`  ${i+1}. Phone: ${conv.phone_number} | Normalized: ${conv.phone_number_normalized}`);
        });
      }
    }

  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testConversationLoading().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});