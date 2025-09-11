// Quick Fix: Start server with better error handling
import { spawn } from 'child_process';

console.log('🚀 Starting server with improved error handling...');

const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('exit', (code) => {
  console.log(`🔄 Server exited with code ${code}. Restarting...`);
  setTimeout(() => {
    // Restart after 2 seconds
    spawn('node', ['quick-fix-server.js'], { stdio: 'inherit' });
  }, 2000);
});

// Test the system after 5 seconds
setTimeout(async () => {
  console.log('\n🧪 Testing telephony interface...');
  
  try {
    const { default: fetch } = await import('node-fetch');
    
    // Test SMS flow
    const smsPayload = new URLSearchParams({
      From: '+16049085474',
      To: '+17786526908',
      Body: 'Quick test message',
      MessageSid: `quick-test-${Date.now()}`
    });
    
    const response = await fetch('http://localhost:3001/api/webhooks/twilio/sms/incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: smsPayload
    });
    
    if (response.ok) {
      console.log('✅ SMS webhook working');
      
      // Check if conversation was stored
      setTimeout(async () => {
        const historyResponse = await fetch('http://localhost:3001/api/debug/get-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: '+16049085474' })
        });
        
        if (historyResponse.ok) {
          const result = await historyResponse.json();
          console.log('📋 Conversation history:', result.history?.length || 0, 'messages');
          
          if (result.history?.length > 0) {
            console.log('🎉 FIXED! Messages are now being stored. Check your UI!');
          } else {
            console.log('❌ Still not storing messages - check SMS webhook handler');
          }
        }
      }, 3000);
    } else {
      console.log('❌ SMS webhook failed');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}, 5000);

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit(0);
}); 