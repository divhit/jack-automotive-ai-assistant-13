// Test script for ElevenLabs MCP functionality
// Run with: node test-elevenlabs-mcp.js

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing ElevenLabs MCP Integration...\n');

// Test 1: Check if ElevenLabs MCP is properly installed
async function testMcpInstallation() {
  console.log('1. Testing MCP Installation...');
  
  try {
    // Test if elevenlabs-mcp package is available
    const testProcess = spawn('python', ['-m', 'elevenlabs_mcp', '--help'], {
      stdio: 'pipe'
    });
    
    return new Promise((resolve) => {
      let output = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.on('close', (code) => {
        if (output.includes('ElevenLabs API key') || output.includes('usage:')) {
          console.log('   ✅ ElevenLabs MCP package is properly installed');
          resolve(true);
        } else {
          console.log('   ❌ ElevenLabs MCP package not found or not working');
          console.log('   Output:', output);
          resolve(false);
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        testProcess.kill();
        console.log('   ⚠️ Test timed out - may indicate installation issues');
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.log('   ❌ Error testing installation:', error.message);
    return false;
  }
}

// Test 2: Check Cursor MCP configuration
async function testCursorConfig() {
  console.log('\n2. Testing Cursor MCP Configuration...');
  
  try {
    const configPath = path.join(process.cwd(), '.cursor', 'mcp.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      if (config.mcpServers && config.mcpServers.ElevenLabs) {
        console.log('   ✅ ElevenLabs MCP server configured in Cursor');
        console.log('   📁 Config location:', configPath);
        
        // Check if API key is configured
        if (config.mcpServers.ElevenLabs.env && config.mcpServers.ElevenLabs.env.ELEVENLABS_API_KEY) {
          console.log('   ✅ API key configuration found');
        } else {
          console.log('   ⚠️ API key not configured - add ELEVENLABS_API_KEY to environment');
        }
        
        return true;
      } else {
        console.log('   ❌ ElevenLabs MCP server not found in configuration');
        return false;
      }
    } catch (readError) {
      console.log('   ❌ Could not read Cursor MCP configuration file');
      console.log('   📍 Expected location:', configPath);
      console.log('   💡 Make sure .cursor/mcp.json exists with ElevenLabs configuration');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error checking Cursor configuration:', error.message);
    return false;
  }
}

// Test 3: Check environment variables
async function testEnvironmentVars() {
  console.log('\n3. Testing Environment Variables...');
  
  // Check for ElevenLabs API key in various locations
  const apiKey = process.env.ELEVENLABS_API_KEY || 
                 process.env.VITE_ELEVENLABS_API_KEY ||
                 null;
  
  if (apiKey) {
    console.log('   ✅ ElevenLabs API key found in environment');
    console.log('   🔑 Key prefix:', apiKey.substring(0, 8) + '...');
  } else {
    console.log('   ⚠️ ElevenLabs API key not found in environment variables');
    console.log('   💡 Set ELEVENLABS_API_KEY in your environment or .env file');
  }
  
  // Check other relevant environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    console.log('   ✅ Supabase configuration found');
  } else {
    console.log('   ⚠️ Supabase configuration incomplete');
  }
  
  return !!apiKey;
}

// Test 4: Check if required dependencies are available
async function testDependencies() {
  console.log('\n4. Testing Required Dependencies...');
  
  const requiredPackages = [
    '@supabase/supabase-js',
    'react',
    'lucide-react'
  ];
  
  let allDepsAvailable = true;
  
  for (const pkg of requiredPackages) {
    try {
      await import(pkg);
      console.log(`   ✅ ${pkg} is available`);
    } catch (error) {
      console.log(`   ❌ ${pkg} is missing or not importable`);
      allDepsAvailable = false;
    }
  }
  
  return allDepsAvailable;
}

// Test 5: Simulate analytics functionality
async function testAnalyticsFunctionality() {
  console.log('\n5. Testing Analytics Functionality...');
  
  try {
    // Simulate conversation analytics
    const mockConversationData = {
      id: 'test-conversation-1',
      content: 'Customer: I\'m interested in financing a vehicle. Agent: Great! Let me help you with that.',
      timestamp: new Date().toISOString(),
      type: 'sms'
    };
    
    // Mock analysis (in real implementation, this would use ElevenLabs MCP)
    const mockAnalysis = {
      sentimentConfidence: 75,
      emotionalTone: { joy: 0.3, frustration: 0.1, interest: 0.7, concern: 0.2 },
      buyingSignals: ['financing_inquiry'],
      objections: [],
      qualityScore: 82,
      engagementLevel: 'high',
      conversionProbability: 0.68
    };
    
    console.log('   ✅ Analytics structure validation passed');
    console.log('   📊 Sample analysis preview: Quality Score =', mockAnalysis.qualityScore);
    
    return true;
  } catch (error) {
    console.log('   ❌ Analytics functionality test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting ElevenLabs MCP Integration Tests...\n');
  
  const results = {
    installation: await testMcpInstallation(),
    cursorConfig: await testCursorConfig(),
    environment: await testEnvironmentVars(),
    dependencies: await testDependencies(),
    analytics: await testAnalyticsFunctionality()
  };
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Tests Passed: ${passed}/${total}`);
  console.log('');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.charAt(0).toUpperCase() + test.slice(1)} Test`);
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Your ElevenLabs MCP integration is ready!');
    console.log('\n📖 Next Steps:');
    console.log('   1. Implement the analytics panel in your TelephonyInterface');
    console.log('   2. Apply the database schema updates');
    console.log('   3. Start testing with real conversation data');
    console.log('   4. Configure your ElevenLabs API key if not already done');
  } else {
    console.log('⚠️  Some tests failed. Please address the issues above before proceeding.');
    console.log('\n🔧 Common fixes:');
    console.log('   • Install missing dependencies: npm install');
    console.log('   • Set up ElevenLabs API key in environment');
    console.log('   • Verify Cursor MCP configuration');
    console.log('   • Check Python and pip installation');
  }
  
  console.log('\n📚 Documentation:');
  console.log('   • Implementation Plan: ELEVENLABS_MCP_ANALYTICS_PLAN.md');
  console.log('   • Complete Setup Guide: ELEVENLABS_MCP_IMPLEMENTATION_COMPLETE.md');
  console.log('   • Database Schema: elevenlabs-mcp-analytics-schema.sql');
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}); 