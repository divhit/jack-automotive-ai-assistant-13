import 'dotenv/config';
import fs from 'fs/promises';

async function callMgmt(ref, pat, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mgmt API error ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

function reqEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const target = process.env.TARGET || 'new'; // 'new' or 'old'
  const file = process.env.SQL_FILE;
  if (!file) throw new Error('Set SQL_FILE=/path/to/file.sql');

  let sql = await fs.readFile(file, 'utf8');
  // Strip statements that require elevated privileges not available via mgmt API
  sql = sql.replace(/^[ \t]*ALTER DATABASE[\s\S]*?;[\r\n]+/gmi, '');

  const NEW_REF = (process.env.SUPABASE_URL || '').match(/^https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!NEW_REF) throw new Error('Could not derive new project ref from SUPABASE_URL');

  const OLD_REF = process.env.OLD_SUPABASE_REF || 'dgzadilmtuqvimolzxms';

  // PAT1 -> new, PAT2 -> old (based on prior verification)
  const PAT_NEW = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN_NEW;
  const PAT_OLD = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN_OLD;
  if (target === 'new' && !PAT_NEW) throw new Error('Missing env: SUPABASE_PERSONAL_ACCESS_TOKEN_NEW');
  if (target === 'old' && !PAT_OLD) throw new Error('Missing env: SUPABASE_PERSONAL_ACCESS_TOKEN_OLD');

  const ref = target === 'old' ? OLD_REF : NEW_REF;
  const pat = target === 'old' ? PAT_OLD : PAT_NEW;

  console.log(`Applying ${file} to ${target} project (${ref})...`);
  const result = await callMgmt(ref, pat, sql);
  console.log('Mgmt result:', typeof result === 'string' ? result.slice(0, 400) : JSON.stringify(result).slice(0, 400));
}

main().catch((e) => { console.error('apply-sql failed:', e.message); process.exit(1); });
