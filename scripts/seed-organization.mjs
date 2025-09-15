import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function reqEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

async function main() {
  const SUPABASE_URL = reqEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = reqEnv('SUPABASE_SERVICE_ROLE_KEY');

  const ORG_NAME = process.env.ORG_NAME || 'Default Organization';
  const ORG_SLUG = process.env.ORG_SLUG || ORG_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const ORG_EMAIL = process.env.ORG_EMAIL || null;
  const ORG_PHONE_NUMBER = reqEnv('ORG_PHONE_NUMBER'); // E.164 format

  const ELEVENLABS_PHONE_ID = reqEnv('ELEVENLABS_PHONE_ID');
  const TWILIO_PHONE_SID = reqEnv('TWILIO_PHONE_SID');

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1) Ensure organization exists (by slug)
  let organizationId;
  {
    const { data: existing, error } = await client
      .from('organizations')
      .select('id')
      .eq('slug', ORG_SLUG)
      .maybeSingle();
    if (error) throw error;

    if (existing) {
      organizationId = existing.id;
      console.log(`Organization exists: ${organizationId}`);
    } else {
      const { data, error: insErr } = await client
        .from('organizations')
        .insert({ name: ORG_NAME, slug: ORG_SLUG, email: ORG_EMAIL })
        .select('id')
        .single();
      if (insErr) throw insErr;
      organizationId = data.id;
      console.log(`Organization created: ${organizationId}`);
    }
  }

  // 2) Upsert organization_phone_numbers mapping
  {
    const payload = {
      organization_id: organizationId,
      phone_number: ORG_PHONE_NUMBER,
      elevenlabs_phone_id: ELEVENLABS_PHONE_ID,
      twilio_phone_sid: TWILIO_PHONE_SID,
      is_active: true,
    };

    const { data, error } = await client
      .from('organization_phone_numbers')
      .upsert(payload, { onConflict: 'phone_number' })
      .select('*')
      .single();
    if (error) throw error;
    console.log('Phone mapping upserted:', data);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

