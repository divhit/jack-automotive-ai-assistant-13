#!/usr/bin/env node

const fetch = require('node-fetch');

async function testFrontendConversationLoading() {
  console.log('🧪 Testing frontend conversation loading (as fetch request)...');

  const url = 'http://localhost:8080/api/stream/conversation/66aabe4a-75d9-48fc-8bea-021a10f0307d?phoneNumber=%2B16049085474&load=true&organizationId=aabe0501-4eb6-4b98-9d9f-01381506314f';

  try {
    console.log('📡 Making fetch request to SSE endpoint...');
    const response = await fetch(url);

    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      return;
    }

    console.log('✅ Response received. Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('📝 Response body:');
    console.log(text);

    // Try to parse SSE data
    const lines = text.split('\n');
    const dataLines = lines.filter(line => line.startsWith('data: '));

    console.log(`\n🔍 Found ${dataLines.length} SSE data lines:`);
    dataLines.forEach((line, i) => {
      try {
        const data = JSON.parse(line.replace('data: ', ''));
        console.log(`  ${i+1}. Type: ${data.type} | Messages: ${data.messages?.length || 'N/A'}`);
        if (data.type === 'conversation_history' && data.messages) {
          console.log(`     Sample message: "${data.messages[0]?.content?.substring(0, 50)}..."`);
        }
      } catch (err) {
        console.log(`  ${i+1}. Raw: ${line}`);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendConversationLoading().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});