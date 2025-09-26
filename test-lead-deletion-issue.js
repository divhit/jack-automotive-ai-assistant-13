import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Lead Deletion and Conversation History Issue\n');

class LeadDeletionTest {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.testPhoneNumber = '+15559999999'; // Test phone number
    this.testLeadId = null;
    this.testOrgId = null;
  }

  async checkDatabaseSchema() {
    console.log('📊 Checking Database Schema and Foreign Key Constraints...\n');

    try {
      // Check foreign key constraints
      const { data: constraints, error: constraintError } = await this.supabase.rpc('get_foreign_key_info', {
        p_table_name: 'conversations'
      }).catch(() => ({ data: null, error: 'Function not found' }));

      // Alternative: Check schema directly
      const { data: schemaInfo, error: schemaError } = await this.supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable')
        .in('table_name', ['leads', 'conversations', 'conversation_messages', 'messages'])
        .eq('table_schema', 'public');

      if (schemaError || !schemaInfo) {
        // Try direct queries
        console.log('Checking tables exist...');

        const tables = ['leads', 'conversations', 'conversation_messages', 'messages', 'call_sessions'];
        for (const table of tables) {
          const { count, error } = await this.supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          console.log(`  ${table}: ${error ? '❌ ' + error.message : '✅ exists (count: ' + count + ')'}`);
        }
      }

      // Check for organization_id columns
      console.log('\n🔍 Checking for organization_id columns...');
      const tablesWithOrgId = ['leads', 'conversations', 'messages'];

      for (const table of tablesWithOrgId) {
        const { data, error } = await this.supabase
          .from(table)
          .select('organization_id')
          .limit(1);

        if (error && error.message.includes('column "organization_id" does not exist')) {
          console.log(`  ${table}: ❌ Missing organization_id column`);
        } else if (error) {
          console.log(`  ${table}: ⚠️  ${error.message}`);
        } else {
          console.log(`  ${table}: ✅ Has organization_id column`);
        }
      }

    } catch (error) {
      console.error('Error checking schema:', error);
    }
  }

  async findOrCreateTestOrganization() {
    console.log('\n🏢 Finding or creating test organization...');

    // First check if test org exists
    const { data: existingOrg, error: findError } = await this.supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', 'test-org-deletion')
      .single();

    if (existingOrg) {
      this.testOrgId = existingOrg.id;
      console.log(`  Found existing test org: ${existingOrg.name} (${existingOrg.id})`);
      return existingOrg.id;
    }

    // Create test org if not exists
    const { data: newOrg, error: createError } = await this.supabase
      .from('organizations')
      .insert({
        name: 'Test Organization for Deletion Testing',
        slug: 'test-org-deletion',
        email: 'test@deletion.com',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('  ❌ Failed to create test organization:', createError);
      return null;
    }

    this.testOrgId = newOrg.id;
    console.log(`  ✅ Created test organization: ${newOrg.name} (${newOrg.id})`);
    return newOrg.id;
  }

  async createTestLead() {
    console.log('\n📝 Creating test lead...');

    const testLead = {
      id: `test_lead_${Date.now()}`,
      customer_name: 'Test Deletion Customer',
      phone_number: '(555) 999-9999',
      phone_number_normalized: this.testPhoneNumber,
      email: 'testdeletion@example.com',
      chase_status: 'Test Status',
      funding_readiness: 'Testing',
      sentiment: 'Neutral',
      organization_id: this.testOrgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('leads')
      .insert(testLead)
      .select()
      .single();

    if (error) {
      console.error('  ❌ Failed to create lead:', error);
      return null;
    }

    this.testLeadId = data.id;
    console.log(`  ✅ Created test lead: ${data.id} - ${data.customer_name}`);
    return data;
  }

  async createTestConversations() {
    console.log('\n💬 Creating test conversations and messages...');

    // Create a conversation
    const { data: conversation, error: convError } = await this.supabase
      .from('conversations')
      .insert({
        lead_id: this.testLeadId,
        phone_number: this.testPhoneNumber,
        phone_number_normalized: this.testPhoneNumber,
        status: 'active',
        channel: 'sms',
        organization_id: this.testOrgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) {
      console.error('  ❌ Failed to create conversation:', convError);
      return;
    }

    console.log(`  ✅ Created conversation: ${conversation.id}`);

    // Create some messages
    const messages = [
      {
        conversation_id: conversation.id,
        content: 'Test message 1 - This should be deleted',
        sent_by: 'customer',
        phone_number: this.testPhoneNumber,
        timestamp: new Date().toISOString()
      },
      {
        conversation_id: conversation.id,
        content: 'Test message 2 - This should also be deleted',
        sent_by: 'ai',
        phone_number: this.testPhoneNumber,
        timestamp: new Date().toISOString()
      }
    ];

    // Try conversation_messages table first
    let messageTable = 'conversation_messages';
    let { error: msgError } = await this.supabase
      .from(messageTable)
      .insert(messages);

    if (msgError && msgError.message.includes('relation "conversation_messages" does not exist')) {
      // Fall back to messages table
      messageTable = 'messages';
      const { error: msgError2 } = await this.supabase
        .from(messageTable)
        .insert(messages);

      if (msgError2) {
        console.error(`  ❌ Failed to create messages:`, msgError2);
        return;
      }
    } else if (msgError) {
      console.error(`  ❌ Failed to create messages:`, msgError);
      return;
    }

    console.log(`  ✅ Created ${messages.length} test messages in ${messageTable} table`);
  }

  async checkDataBeforeDeletion() {
    console.log('\n🔍 Checking data BEFORE deletion...');

    // Check lead exists
    const { data: lead, error: leadError } = await this.supabase
      .from('leads')
      .select('*')
      .eq('id', this.testLeadId)
      .single();

    console.log(`  Lead: ${lead ? '✅ Exists' : '❌ Not found'}`);

    // Check conversations
    const { data: conversations, error: convError } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('phone_number_normalized', this.testPhoneNumber);

    console.log(`  Conversations: ${conversations ? conversations.length : 0} found`);

    // Check messages in both possible tables
    let messages = null;
    let messageTable = 'conversation_messages';

    const { data: convMessages, error: convMsgError } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('phone_number', this.testPhoneNumber);

    if (convMsgError && convMsgError.message.includes('relation "conversation_messages" does not exist')) {
      messageTable = 'messages';
      const { data: msgData } = await this.supabase
        .from('messages')
        .select('*');
      messages = msgData;
    } else {
      messages = convMessages;
    }

    console.log(`  Messages (${messageTable}): ${messages ? messages.length : 0} found`);

    return { leadExists: !!lead, conversationCount: conversations?.length || 0, messageCount: messages?.length || 0 };
  }

  async deleteLead() {
    console.log('\n🗑️  DELETING LEAD...');

    const { error } = await this.supabase
      .from('leads')
      .delete()
      .eq('id', this.testLeadId);

    if (error) {
      console.error('  ❌ Failed to delete lead:', error);
      return false;
    }

    console.log('  ✅ Lead deleted successfully');
    return true;
  }

  async checkDataAfterDeletion() {
    console.log('\n🔍 Checking data AFTER deletion...');

    // Check if lead is gone
    const { data: lead, error: leadError } = await this.supabase
      .from('leads')
      .select('*')
      .eq('id', this.testLeadId)
      .single();

    console.log(`  Lead: ${lead ? '❌ STILL EXISTS!' : '✅ Deleted'}`);

    // Check if conversations still exist
    const { data: conversations, error: convError } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('phone_number_normalized', this.testPhoneNumber);

    if (conversations && conversations.length > 0) {
      console.log(`  Conversations: ❌ ${conversations.length} STILL EXIST! (Orphaned)`);
      conversations.forEach(c => {
        console.log(`    - Conv ${c.id}: lead_id=${c.lead_id}, created=${c.created_at}`);
      });
    } else {
      console.log(`  Conversations: ✅ Deleted`);
    }

    // Check messages in both possible tables
    let messages = null;
    let messageTable = 'conversation_messages';

    const { data: convMessages, error: convMsgError } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('phone_number', this.testPhoneNumber);

    if (convMsgError && convMsgError.message.includes('relation "conversation_messages" does not exist')) {
      messageTable = 'messages';
      const { data: msgData } = await this.supabase
        .from('messages')
        .select('*');
      messages = msgData?.filter(m => m.phone_number === this.testPhoneNumber);
    } else {
      messages = convMessages;
    }

    if (messages && messages.length > 0) {
      console.log(`  Messages (${messageTable}): ❌ ${messages.length} STILL EXIST! (Orphaned)`);
      messages.forEach(m => {
        console.log(`    - Message: "${m.content?.substring(0, 50)}..."`);
      });
    } else {
      console.log(`  Messages: ✅ Deleted`);
    }

    return {
      leadDeleted: !lead,
      conversationsRemaining: conversations?.length || 0,
      messagesRemaining: messages?.length || 0
    };
  }

  async recreateLeadWithSameNumber() {
    console.log('\n🔄 Creating NEW lead with SAME phone number...');

    const newLead = {
      customer_name: 'New Customer Same Number',
      phone_number: '(555) 999-9999',
      phone_number_normalized: this.testPhoneNumber,
      email: 'newcustomer@example.com',
      chase_status: 'New',
      funding_readiness: 'Fresh Start',
      sentiment: 'Positive',
      organization_id: this.testOrgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('leads')
      .insert(newLead)
      .select()
      .single();

    if (error) {
      console.error('  ❌ Failed to create new lead:', error);
      return null;
    }

    console.log(`  ✅ Created new lead: ${data.id} - ${data.customer_name}`);

    // Check if old conversations are now associated with new lead
    const { data: conversations } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('phone_number_normalized', this.testPhoneNumber);

    if (conversations && conversations.length > 0) {
      console.log(`  ⚠️  Found ${conversations.length} existing conversations for this number!`);
      console.log(`  🐛 BUG CONFIRMED: Old conversation history persists after lead deletion!`);
    }

    return data;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    // Delete all test data
    await this.supabase.from('messages').delete().eq('phone_number', this.testPhoneNumber);
    await this.supabase.from('conversation_messages').delete().eq('phone_number', this.testPhoneNumber);
    await this.supabase.from('conversations').delete().eq('phone_number_normalized', this.testPhoneNumber);
    await this.supabase.from('leads').delete().eq('phone_number_normalized', this.testPhoneNumber);

    console.log('  ✅ Test data cleaned up');
  }

  async run() {
    try {
      console.log('=' * 60);
      console.log('LEAD DELETION AND CONVERSATION PERSISTENCE TEST');
      console.log('=' * 60 + '\n');

      // Step 1: Check schema
      await this.checkDatabaseSchema();

      // Step 2: Setup test organization
      await this.findOrCreateTestOrganization();

      if (!this.testOrgId) {
        console.error('❌ Cannot proceed without organization');
        return;
      }

      // Step 3: Create test data
      await this.createTestLead();
      if (!this.testLeadId) {
        console.error('❌ Cannot proceed without test lead');
        return;
      }

      await this.createTestConversations();

      // Step 4: Check before deletion
      const beforeStats = await this.checkDataBeforeDeletion();

      // Step 5: Delete the lead
      const deleted = await this.deleteLead();

      if (!deleted) {
        console.error('❌ Lead deletion failed, cannot continue test');
        return;
      }

      // Step 6: Check after deletion
      const afterStats = await this.checkDataAfterDeletion();

      // Step 7: Try to create new lead with same number
      await this.recreateLeadWithSameNumber();

      // Results summary
      console.log('\n' + '=' * 60);
      console.log('TEST RESULTS SUMMARY');
      console.log('=' * 60);

      if (afterStats.conversationsRemaining > 0 || afterStats.messagesRemaining > 0) {
        console.log('\n🐛 BUG CONFIRMED: Lead deletion does NOT cascade delete related data!');
        console.log('   - Conversations remaining: ' + afterStats.conversationsRemaining);
        console.log('   - Messages remaining: ' + afterStats.messagesRemaining);
        console.log('\n📌 This explains why old conversation history appears when creating');
        console.log('   a new lead with the same phone number!');

        console.log('\n🔧 RECOMMENDED FIX:');
        console.log('   1. Add ON DELETE CASCADE to foreign key constraints');
        console.log('   2. OR implement manual cascade deletion in the application');
        console.log('   3. Clear caches when deleting leads');
      } else {
        console.log('\n✅ Lead deletion properly cascades to related data');
      }

      // Cleanup
      await this.cleanup();

    } catch (error) {
      console.error('\n❌ Test failed with error:', error);
    }
  }
}

// Run the test
const test = new LeadDeletionTest();
test.run().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});