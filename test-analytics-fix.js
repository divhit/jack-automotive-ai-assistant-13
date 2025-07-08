// Test script to verify analytics endpoint uses real database data
const http = require('http');

async function testAnalyticsEndpoint() {
  try {
    const organizationId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    
    console.log('🧪 Testing analytics endpoint...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/analytics/global?organization_id=${organizationId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          
          console.log('✅ Analytics Response:', JSON.stringify(responseData, null, 2));
          
          if (responseData.success && responseData.data && responseData.data.metrics) {
            const { voiceMessages, smsMessages, totalMessages } = responseData.data.metrics;
            
            console.log('\n📊 Message Counts:');
            console.log(`Voice Messages: ${voiceMessages}`);
            console.log(`SMS Messages: ${smsMessages}`);
            console.log(`Total Messages: ${totalMessages}`);
            
            // Check if using real data or fake formula
            const fakeVoice = Math.floor(totalMessages * 0.4);
            const fakeSms = Math.ceil(totalMessages * 0.6);
            
            if (voiceMessages === fakeVoice && smsMessages === fakeSms) {
              console.log('⚠️ WARNING: Still using fake mathematical formula!');
              console.log(`Expected fake: ${fakeVoice} voice, ${fakeSms} SMS`);
            } else {
              console.log('✅ SUCCESS: Using real database data!');
              console.log(`Would be fake: ${fakeVoice} voice, ${fakeSms} SMS`);
            }
          }
          
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError);
          console.log('Raw response:', data);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error);
    });
    
    req.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Wait for server to start, then run test
setTimeout(testAnalyticsEndpoint, 3000); 