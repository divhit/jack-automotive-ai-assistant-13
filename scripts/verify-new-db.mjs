import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = [
  'organizations',
  'organization_phone_numbers',
  'leads',
  'conversations',
  'call_sessions',
  'conversation_summaries',
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

  const client = createClient(url, key);

  // Check each table exists by simple select with limit 1
  for (const table of REQUIRED_TABLES) {
    const { error } = await client.from(table).select('*', { count: 'exact', head: true }).limit(1);
    if (error) {
      console.log(`FAIL: table missing or inaccessible: ${table} -> ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`OK: ${table}`);
    }
  }

  console.log('Verification complete.');
}

main().catch((e) => {
  console.error('Verification failed:', e.message);
  process.exit(1);
});

