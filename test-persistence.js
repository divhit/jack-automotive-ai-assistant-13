#!/usr/bin/env node

// Test the supabasePersistence service directly
import dotenv from 'dotenv';
dotenv.config();

const { default: supabasePersistence } = await import('./services/supabasePersistence.js');

async function testPersistence() {
  console.log('🔍 Testing Supabase Persistence Service');

  // Test the service status
  console.log('Service enabled:', supabasePersistence.isEnabled);
  console.log('Service connected:', supabasePersistence.isConnected);

  // Test connection
  console.log('\n🔗 Testing connection...');
  const connected = await supabasePersistence.testConnection();
  console.log('Connection result:', connected);
  console.log('Service connected after test:', supabasePersistence.isConnected);

  if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
    console.log('\n💬 Testing conversation persistence...');

    // Test persisting a message
    try {
      await supabasePersistence.persistConversationMessage(
        '(604) 908-5474',
        'Test message from persistence test',
        'system',
        'text',
        { organizationId: 'aabe0501-4eb6-4b98-9d9f-01381506314f' }
      );
      console.log('✅ Test message persisted successfully');
    } catch (error) {
      console.error('❌ Failed to persist test message:', error);
    }

    // Test retrieving conversation history
    try {
      const history = await supabasePersistence.getConversationHistory(
        '(604) 908-5474',
        'aabe0501-4eb6-4b98-9d9f-01381506314f',
        10
      );
      console.log('✅ Retrieved conversation history:', history.length, 'messages');
      if (history.length > 0) {
        console.log('Most recent message:', history[history.length - 1]);
      }
    } catch (error) {
      console.error('❌ Failed to retrieve conversation history:', error);
    }
  } else {
    console.log('❌ Service not enabled or connected');
    console.log('Environment check:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
  }
}

testPersistence().then(() => {
  console.log('\n🏁 Persistence test complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});