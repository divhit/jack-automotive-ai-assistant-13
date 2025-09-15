import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function mgmtQuery(ref, pat, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const DEFAULT_TABLES = [
  'organizations',
  'organization_phone_numbers',
  'leads',
  'conversations',
  'call_sessions',
  'conversation_summaries',
  'lead_activities',
  'agent_notes',
];

async function getNewTableColumnsMgmt(newRef, patNew, table) {
  const rows = await mgmtQuery(newRef, patNew, `select column_name from information_schema.columns where table_schema='public' and table_name='${table}'`);
  return new Set(rows.map((r) => r.column_name));
}

const DROP_ORG_ID_IN = new Set(['conversations', 'call_sessions', 'conversation_summaries', 'lead_activities', 'agent_notes']);
const DROP_ID_IN = new Set(['conversations', 'call_sessions', 'conversation_summaries', 'lead_activities', 'agent_notes']);

function transformRow(table, row) {
  const r = { ...row };
  // Common drops handled elsewhere
  // Per-table normalization
  if (table === 'conversations') {
    if (!r.timestamp) r.timestamp = r.created_at || new Date().toISOString();
    if (!r.type) r.type = 'text';
    if (!r.sent_by) r.sent_by = 'system';
  }
  if (table === 'conversation_summaries') {
    if (!r.timestamp) r.timestamp = r.created_at || new Date().toISOString();
  }
  if (table === 'call_sessions') {
    if (!r.started_at) r.started_at = r.created_at || new Date().toISOString();
  }
  return r;
}

async function copyTable(oldRef, patOld, newRef, patNew, newClient, table) {
  // Ensure we only include columns that exist in target
  const allowed = await getNewTableColumnsMgmt(newRef, patNew, table);
  let offset = 0;
  const page = 500;
  let total = 0;
  for (;;) {
    const rows = await mgmtQuery(oldRef, patOld, `select * from ${table} order by 1 limit ${page} offset ${offset}`);
    if (!Array.isArray(rows) || rows.length === 0) break;

    let projected = rows.map((r) => Object.fromEntries(Object.entries(transformRow(table, r)).filter(([k]) => allowed.has(k))));
    if (DROP_ORG_ID_IN.has(table)) projected = projected.map(({ organization_id, ...rest }) => rest);
    if (DROP_ID_IN.has(table)) projected = projected.map(({ id, ...rest }) => rest);
    const { error } = await newClient.from(table).upsert(projected, { ignoreDuplicates: true });
    if (error) throw new Error(`Upsert into ${table} failed: ${error.message}`);

    total += rows.length;
    offset += page;
  }
  console.log(`Copied ${total} rows for ${table}`);
}

async function main() {
  const NEW_URL = req('SUPABASE_URL');
  const NEW_REF = (NEW_URL.match(/^https?:\/\/([^.]+)\.supabase\.co/) || [])[1];
  const OLD_REF = process.env.OLD_SUPABASE_REF || 'dgzadilmtuqvimolzxms';
  const PAT_NEW = req('SUPABASE_PERSONAL_ACCESS_TOKEN_NEW');
  const PAT_OLD = req('SUPABASE_PERSONAL_ACCESS_TOKEN_OLD');

  // Sanity check access
  await mgmtQuery(NEW_REF, PAT_NEW, 'select 1');
  await mgmtQuery(OLD_REF, PAT_OLD, 'select 1');

  const TABLES = (process.env.TABLES ? process.env.TABLES.split(',') : DEFAULT_TABLES).map(s => s.trim()).filter(Boolean);
  const NEW_KEY = req('SUPABASE_SERVICE_ROLE_KEY');
  const newClient = createClient(NEW_URL, NEW_KEY);
  for (const t of TABLES) {
    await copyTable(OLD_REF, PAT_OLD, NEW_REF, PAT_NEW, newClient, t);
  }
  console.log('Migration complete');

  // Post-fix: set organization_id uniformly if a single org exists
  const orgs = await mgmtQuery(NEW_REF, PAT_NEW, 'select id from public.organizations limit 2');
  if (Array.isArray(orgs) && orgs.length === 1) {
    const orgId = orgs[0].id;
    const updates = [
      `update public.leads set organization_id='${orgId}' where organization_id is null`,
      `update public.conversations set organization_id='${orgId}' where organization_id is null`,
      `update public.call_sessions set organization_id='${orgId}' where organization_id is null`,
      `update public.conversation_summaries set organization_id='${orgId}' where organization_id is null`,
      `update public.lead_activities set organization_id='${orgId}' where organization_id is null`
    ];
    for (const q of updates) { try { await mgmtQuery(NEW_REF, PAT_NEW, q); } catch(e) { /* ignore */ } }
    console.log(`Set organization_id to ${orgId} where null`);
  }
}

main().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
