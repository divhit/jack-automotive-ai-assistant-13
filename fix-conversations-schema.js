#!/usr/bin/env node

// Fix conversations table schema by adding missing columns
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Fixing conversations table schema...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const schemaFixSQL = `
-- Fix conversations table schema (add missing columns)
DO $$
BEGIN
    -- Add phone_number_normalized column if it doesn't exist
    BEGIN
        ALTER TABLE conversations ADD COLUMN phone_number_normalized TEXT;
        RAISE NOTICE 'Added phone_number_normalized column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'phone_number_normalized column already exists';
    END;

    -- Add dynamic_variables column if it doesn't exist
    BEGIN
        ALTER TABLE conversations ADD COLUMN dynamic_variables JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added dynamic_variables column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'dynamic_variables column already exists';
    END;

    -- Add other commonly needed columns if they don't exist
    BEGIN
        ALTER TABLE conversations ADD COLUMN type TEXT DEFAULT 'sms';
        RAISE NOTICE 'Added type column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'type column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN sent_by TEXT;
        RAISE NOTICE 'Added sent_by column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'sent_by column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN phone_number TEXT;
        RAISE NOTICE 'Added phone_number column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'phone_number column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN status TEXT DEFAULT 'sent';
        RAISE NOTICE 'Added status column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'status column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN external_id TEXT;
        RAISE NOTICE 'Added external_id column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'external_id column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added organization_id column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'organization_id column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN twilio_message_sid TEXT;
        RAISE NOTICE 'Added twilio_message_sid column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'twilio_message_sid column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN twilio_call_sid TEXT;
        RAISE NOTICE 'Added twilio_call_sid column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'twilio_call_sid column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN elevenlabs_conversation_id TEXT;
        RAISE NOTICE 'Added elevenlabs_conversation_id column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'elevenlabs_conversation_id column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN conversation_context TEXT;
        RAISE NOTICE 'Added conversation_context column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'conversation_context column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN message_status TEXT;
        RAISE NOTICE 'Added message_status column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'message_status column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added lead_id column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'lead_id column already exists';
    END;

    BEGIN
        ALTER TABLE conversations ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added timestamp column';
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'timestamp column already exists';
    END;
END$$;
`;

async function fixSchema() {
  try {
    console.log('🔧 Applying schema fixes...');

    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaFixSQL });

    if (error) {
      console.error('❌ Error executing schema fix:', error);

      // Try alternative approach - execute each column addition separately
      console.log('🔄 Trying alternative approach with individual queries...');

      const alterCommands = [
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS phone_number_normalized TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS dynamic_variables JSONB DEFAULT \'{}\'::jsonb',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT \'sms\'',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sent_by TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS phone_number TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'sent\'',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS external_id TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS twilio_message_sid TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_context TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_status TEXT',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lead_id UUID',
        'ALTER TABLE conversations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
      ];

      let successCount = 0;
      for (const command of alterCommands) {
        try {
          const { error: alterError } = await supabase.rpc('exec_sql', { sql: command });
          if (!alterError) {
            successCount++;
            console.log(`✅ ${command}`);
          } else {
            console.log(`⚠️ ${command} - ${alterError.message}`);
          }
        } catch (e) {
          console.log(`⚠️ ${command} - ${e.message}`);
        }
      }

      console.log(`📊 Successfully executed ${successCount}/${alterCommands.length} schema changes`);

    } else {
      console.log('✅ Schema fix applied successfully');
      console.log('Result:', data);
    }

    // Test the updated schema
    console.log('\n🧪 Testing updated schema...');
    const { data: testData, error: testError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Schema test failed:', testError);
    } else {
      console.log('✅ Schema test passed - conversations table accessible');

      // Show what columns exist now
      if (testData && testData.length > 0) {
        console.log('Available columns:', Object.keys(testData[0]));
      } else {
        console.log('Table is empty but accessible');
      }
    }

  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
}

fixSchema().then(() => {
  console.log('\n🏁 Schema fix complete');
  process.exit(0);
});