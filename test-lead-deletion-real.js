import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const TEST_PHONE = '+15559998877';
const TEST_ORG_ID = '1cb51fed-d726-41ad-b3d0-a55fe3566901'; // From previous test

async function runTest() {
  console.log('🧪 TESTING LEAD DELETION AND CONVERSATION PERSISTENCE\n');
  console.log('=' . repeat(60) + '\n');
  
  // STEP 1: Create a test lead
  console.log('📝 STEP 1: Creating test lead...');
  const testLeadId = `test_lead_deletion_${Date.now()}`;
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      id: testLeadId,
      customer_name: 'Delete Test Customer',
      phone_number: '(555) 999-8877',
      phone_number_normalized: TEST_PHONE,
      email: 'deletetest@example.com',
      chase_status: 'Active',
      funding_readiness: 'Ready',
      sentiment: 'Positive',
      organization_id: TEST_ORG_ID
    })
    .select()
    .single();
  
  if (leadError) {
    console.error('❌ Failed to create lead:', leadError);
    return;
  }
  console.log(`✅ Created lead: ${lead.id}`);
  
  // STEP 2: Create some conversation messages
  console.log('\n💬 STEP 2: Creating conversation messages...');
  const messages = [
    {
      lead_id: testLeadId,
      content: 'Hey, interested in buying a car',
      sent_by: 'customer',
      type: 'sms',
      phone_number_normalized: TEST_PHONE,
      timestamp: new Date().toISOString(),
      organization_id: TEST_ORG_ID
    },
    {
      lead_id: testLeadId,
      content: 'Great! What type of car are you looking for?',
      sent_by: 'agent',
      type: 'sms',
      phone_number_normalized: TEST_PHONE,
      timestamp: new Date().toISOString(),
      organization_id: TEST_ORG_ID
    },
    {
      lead_id: testLeadId,
      content: 'Looking for an SUV',
      sent_by: 'customer',
      type: 'sms',
      phone_number_normalized: TEST_PHONE,
      timestamp: new Date().toISOString(),
      organization_id: TEST_ORG_ID
    }
  ];
  
  const { data: insertedMessages, error: msgError } = await supabase
    .from('conversations')
    .insert(messages)
    .select();
  
  if (msgError) {
    console.error('❌ Failed to create messages:', msgError);
    return;
  }
  console.log(`✅ Created ${insertedMessages.length} messages`);
  
  // STEP 3: Verify data exists
  console.log('\n🔍 STEP 3: Verifying data BEFORE deletion...');
  const { data: beforeLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', testLeadId)
    .single();
  
  const { data: beforeMessages } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone_number_normalized', TEST_PHONE);
  
  console.log(`  Lead exists: ${beforeLead ? '✅ YES' : '❌ NO'}`);
  console.log(`  Messages for phone ${TEST_PHONE}: ${beforeMessages ? beforeMessages.length : 0}`);
  
  // STEP 4: DELETE THE LEAD
  console.log('\n🗑️  STEP 4: DELETING THE LEAD...');
  const { error: deleteError } = await supabase
    .from('leads')
    .delete()
    .eq('id', testLeadId);
  
  if (deleteError) {
    console.error('❌ Failed to delete lead:', deleteError);
    return;
  }
  console.log('✅ Lead deleted');
  
  // STEP 5: Check what remains
  console.log('\n🔍 STEP 5: Checking data AFTER deletion...');
  const { data: afterLead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', testLeadId)
    .single();
  
  const { data: afterMessages } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone_number_normalized', TEST_PHONE);
  
  console.log(`  Lead exists: ${afterLead ? '❌ STILL THERE!' : '✅ Deleted'}`);
  console.log(`  Messages for phone ${TEST_PHONE}: ${afterMessages ? afterMessages.length : 0}`);
  
  if (afterMessages && afterMessages.length > 0) {
    console.log('\n  ⚠️  ORPHANED MESSAGES FOUND:');
    afterMessages.forEach((msg, i) => {
      console.log(`    ${i + 1}. lead_id: ${msg.lead_id}, content: "${msg.content.substring(0, 40)}..."`);
    });
  }
  
  // STEP 6: Create NEW lead with SAME phone number
  console.log('\n🔄 STEP 6: Creating NEW lead with SAME phone number...');
  const newLeadId = `test_lead_new_${Date.now()}`;
  const { data: newLead, error: newLeadError } = await supabase
    .from('leads')
    .insert({
      id: newLeadId,
      customer_name: 'Brand New Customer Same Number',
      phone_number: '(555) 999-8877',
      phone_number_normalized: TEST_PHONE,
      email: 'newcustomer@example.com',
      chase_status: 'New',
      funding_readiness: 'Initial',
      sentiment: 'Neutral',
      organization_id: TEST_ORG_ID
    })
    .select()
    .single();
  
  if (newLeadError) {
    console.error('❌ Failed to create new lead:', newLeadError);
  } else {
    console.log(`✅ Created new lead: ${newLead.id}`);
  }
  
  // STEP 7: Check if old messages are visible for new lead
  console.log('\n🔍 STEP 7: Checking conversation history for NEW lead...');
  const { data: newLeadMessages } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone_number_normalized', TEST_PHONE);
  
  console.log(`  Messages found for phone ${TEST_PHONE}: ${newLeadMessages ? newLeadMessages.length : 0}`);
  
  if (newLeadMessages && newLeadMessages.length > 0) {
    console.log('\n  🐛 BUG CONFIRMED:');
    console.log(`  Old conversation history (${newLeadMessages.length} messages) is visible for new lead!`);
    console.log('  Messages belong to deleted lead but are still in database:');
    newLeadMessages.forEach((msg, i) => {
      console.log(`    ${i + 1}. [${msg.sent_by}] "${msg.content.substring(0, 50)}..."`);
      console.log(`       lead_id: ${msg.lead_id} (deleted), created: ${msg.created_at}`);
    });
  }
  
  // RESULTS
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  if (afterMessages && afterMessages.length > 0) {
    console.log('\n🐛 CONFIRMED: Lead deletion does NOT remove conversation history!');
    console.log(`   - ${afterMessages.length} orphaned messages remain in database`);
    console.log('   - Messages still reference deleted lead_id');
    console.log('   - New lead with same phone sees old conversation history');
    console.log('\n❌ PROBLEM: No CASCADE DELETE on conversations.lead_id foreign key');
  } else {
    console.log('\n✅ Lead deletion properly removes conversation history');
  }
  
  // CLEANUP
  console.log('\n🧹 Cleaning up test data...');
  await supabase.from('conversations').delete().eq('phone_number_normalized', TEST_PHONE);
  await supabase.from('leads').delete().eq('phone_number_normalized', TEST_PHONE);
  console.log('✅ Cleanup complete');
}

runTest().then(() => {
  console.log('\n✅ Test completed\n');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
