// Test to verify component imports are working
console.log('Testing component imports...');

// Test import paths
const paths = [
  './src/components/subprime/enhanced/ElevenLabsAnalyticsPanel.tsx',
  './src/pages/SubprimeDashboard.tsx',
  './src/components/subprime/TelephonyInterface.tsx'
];

const fs = require('fs');

paths.forEach(path => {
  try {
    if (fs.existsSync(path)) {
      console.log(`✅ ${path} exists`);
      const content = fs.readFileSync(path, 'utf8');
      
      if (path.includes('ElevenLabsAnalyticsPanel')) {
        console.log(`  - Component has ${content.split('\n').length} lines`);
        console.log(`  - Has React import: ${content.includes('import React')}`);
        console.log(`  - Has export: ${content.includes('export')}`);
      }
      
      if (path.includes('SubprimeDashboard')) {
        console.log(`  - Has Separator import: ${content.includes('import { Separator }')}`);
        console.log(`  - Uses Separator: ${content.includes('<Separator')}`);
      }
      
      if (path.includes('TelephonyInterface')) {
        console.log(`  - Has analytics import: ${content.includes('ElevenLabsAnalyticsPanel')}`);
        console.log(`  - Has showAnalytics state: ${content.includes('showAnalytics')}`);
      }
    } else {
      console.log(`❌ ${path} not found`);
    }
  } catch (error) {
    console.log(`❌ Error reading ${path}: ${error.message}`);
  }
});

console.log('\n✅ Component test completed!'); 