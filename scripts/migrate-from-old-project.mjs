import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const TABLES_IN_ORDER = [
  // Parent tables first
  'organizations',
  'organization_phone_numbers',
  'leads',
  // Children afterwards
  'conversations',
  'call_sessions',
  'conversation_summaries',
  'lead_activities',
  'agent_notes',
];

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function copyTable(oldClient, newClient, table) {
  const pageSize = 1000;
  let from = 0;
  let to = pageSize - 1;
  let totalCopied = 0;

  for (;;) {
    const { data, error } = await oldClient.from(table).select('*').range(from, to);
    if (error) {
      console.log(`Skip or fail fetching ${table}: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    const { error: insErr } = await newClient.from(table).upsert(data, { onConflict: inferConflictKey(table) });
    if (insErr) {
      console.log(`Insert error on ${table}: ${insErr.message}`);
      // Continue to next page; resolve conflicts manually if needed
    } else {
      totalCopied += data.length;
    }

    from += pageSize;
    to += pageSize;
  }

  console.log(`Copied ~${totalCopied} rows for ${table}`);
}

function inferConflictKey(table) {
  switch (table) {
    case 'organizations':
      return 'id';
    case 'organization_phone_numbers':
      return 'phone_number';
    case 'leads':
      return 'id';
    case 'conversations':
      return 'id';
    case 'call_sessions':
      return 'id';
    case 'conversation_summaries':
      return 'id';
    case 'lead_activities':
      return 'id';
    case 'agent_notes':
      return 'id';
    default:
      return undefined;
  }
}

async function main() {
  const OLD_URL = req('OLD_SUPABASE_URL');
  const OLD_SERVICE_ROLE_KEY = req('OLD_SUPABASE_SERVICE_ROLE_KEY');
  const NEW_URL = req('SUPABASE_URL');
  const NEW_SERVICE_ROLE_KEY = req('SUPABASE_SERVICE_ROLE_KEY');

  const oldClient = createClient(OLD_URL, OLD_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const newClient = createClient(NEW_URL, NEW_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  for (const table of TABLES_IN_ORDER) {
    await copyTable(oldClient, newClient, table);
  }

  console.log('Data migration complete.');
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});

