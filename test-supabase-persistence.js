import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Supabase CRM Persistence System\n');

class SupabasePersistenceTest {
  constructor() {
    this.supabase = null;
    this.testResults = [];
  }

  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      const enablePersistence = process.env.ENABLE_SUPABASE_PERSISTENCE === 'true';

      console.log('📋 Environment Check:');
      console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
      console.log(`   SUPABASE_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
      console.log(`   ENABLE_SUPABASE_PERSISTENCE: ${enablePersistence ? '✅ Enabled' : '❌ Disabled'}`);
      console.log();

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      return true;
    } catch (error) {
      this.addResult('Initialization', false, error.message);
      return false;
    }
  }

  addResult(testName, success, message) {
    this.testResults.push({ testName, success, message });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  async testConnection() {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .select('count', { count: 'exact', head: true });

      if (error) throw error;

      this.addResult('Connection Test', true, 'Successfully connected to Supabase');
      return true;
    } catch (error) {
      this.addResult('Connection Test', false, error.message);
      return false;
    }
  }

  async testSchemaExists() {
    try {
      const tables = ['leads', 'conversations', 'call_sessions', 'conversation_summaries', 'lead_activities'];
      const results = [];

      for (const table of tables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('count', { count: 'exact', head: true });

        if (error) {
          results.push(`${table}: ❌ ${error.message}`);
        } else {
          results.push(`${table}: ✅ Exists`);
        }
      }

      const allTablesExist = results.every(r => r.includes('✅'));
      this.addResult('Schema Check', allTablesExist, `Tables: ${results.join(', ')}`);
      return allTablesExist;
    } catch (error) {
      this.addResult('Schema Check', false, error.message);
      return false;
    }
  }

  async testLeadCreation() {
    try {
      const testLead = {
        id: `test_lead_${Date.now()}`,
        customer_name: 'Test Customer',
        phone_number: '(555) 123-4567',
        phone_number_normalized: '+15551234567',
        email: 'test@example.com',
        chase_status: 'Auto Chase Running',
        funding_readiness: 'Not Ready',
        sentiment: 'Neutral',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('leads')
        .insert(testLead)
        .select()
        .single();

      if (error) throw error;

      this.addResult('Lead Creation', true, `Created lead: ${data.customer_name}`);
      
      // Clean up test data
      await this.supabase.from('leads').delete().eq('id', testLead.id);
      
      return true;
    } catch (error) {
      this.addResult('Lead Creation', false, error.message);
      return false;
    }
  }

  async testConversationCreation() {
    try {
      // First create a test lead
      const testLead = {
        id: `test_lead_conv_${Date.now()}`,
        customer_name: 'Test Customer for Conversation',
        phone_number: '(555) 987-6543',
        phone_number_normalized: '+15559876543',
        email: 'testconv@example.com'
      };

      await this.supabase.from('leads').insert(testLead);

      // Now create a conversation
      const testConversation = {
        lead_id: testLead.id,
        content: 'Test conversation message',
        sent_by: 'system',
        timestamp: new Date().toISOString(),
        type: 'text',
        phone_number_normalized: testLead.phone_number_normalized
      };

      const { data, error } = await this.supabase
        .from('conversations')
        .insert(testConversation)
        .select()
        .single();

      if (error) throw error;

      this.addResult('Conversation Creation', true, `Created conversation for lead: ${testLead.customer_name}`);
      
      // Clean up test data
      await this.supabase.from('conversations').delete().eq('lead_id', testLead.id);
      await this.supabase.from('leads').delete().eq('id', testLead.id);
      
      return true;
    } catch (error) {
      this.addResult('Conversation Creation', false, error.message);
      return false;
    }
  }

  async testAnalyticsView() {
    try {
      const { data, error } = await this.supabase
        .from('lead_analytics')
        .select('*')
        .limit(5);

      if (error) throw error;

      this.addResult('Analytics View', true, `Retrieved ${data.length} analytics records`);
      return true;
    } catch (error) {
      this.addResult('Analytics View', false, error.message);
      return false;
    }
  }

  async testLeadScoringFunction() {
    try {
      // Test the lead scoring function exists
      const { data, error } = await this.supabase
        .rpc('calculate_lead_score', { lead_id_param: 'nonexistent' });

      // We expect this to return 0 or null for non-existent lead
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }

      this.addResult('Lead Scoring Function', true, 'Function exists and is callable');
      return true;
    } catch (error) {
      this.addResult('Lead Scoring Function', false, error.message);
      return false;
    }
  }

  async testServerEndpoints() {
    try {
      const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
      
      // Test system status endpoint
      const response = await fetch(`${serverUrl}/api/system/status`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      this.addResult('Server Endpoints', true, `Status: ${data.status}, Persistence: ${data.persistence.enabled}`);
      return true;
    } catch (error) {
      this.addResult('Server Endpoints', false, `Cannot reach server: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🧪 Running Supabase CRM Persistence Tests\n');

    // Initialize
    const initialized = await this.initialize();
    if (!initialized) {
      this.printSummary();
      return;
    }

    // Run tests
    await this.testConnection();
    await this.testSchemaExists();
    await this.testLeadCreation();
    await this.testConversationCreation();
    await this.testAnalyticsView();
    await this.testLeadScoringFunction();
    await this.testServerEndpoints();

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('==================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! Your Supabase CRM persistence is working correctly.');
      console.log('\n🚀 Next steps:');
      console.log('   1. Restart your server to enable persistence');
      console.log('   2. Create a new lead to test automatic persistence');
      console.log('   3. Check the analytics dashboard for CRM features');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      console.log('\n🔧 Common fixes:');
      console.log('   1. Ensure Supabase project is running');
      console.log('   2. Check environment variables in .env file');
      console.log('   3. Run the SQL schema in Supabase dashboard');
      console.log('   4. Verify your Supabase API keys are correct');
    }
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.testName}: ${result.message}`);
    });
  }
}

// Run tests
const tester = new SupabasePersistenceTest();
tester.runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}); 