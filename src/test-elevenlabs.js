// Simple test to verify ElevenLabs client is working
import { Conversation } from '@elevenlabs/client';

console.log('Testing ElevenLabs client...');
console.log('Conversation class:', Conversation);

if (typeof Conversation === 'undefined') {
  console.error('❌ ElevenLabs Conversation class is undefined');
} else {
  console.log('✅ ElevenLabs Conversation class is available');
  console.log('Conversation methods:', Object.getOwnPropertyNames(Conversation));
}

// Test basic initialization
try {
  console.log('Testing basic conversation options...');
  const testOptions = {
    agentId: 'agent_01jwc5v1nafjwv7zw4vtz1050m',
    textOnly: true,
    onConnect: () => console.log('Test connection successful'),
    onError: (error) => console.error('Test error:', error)
  };
  
  console.log('✅ Test options created successfully');
  console.log('Test options:', testOptions);
} catch (error) {
  console.error('❌ Error creating test options:', error);
} 