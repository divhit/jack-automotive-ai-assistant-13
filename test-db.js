#!/usr/bin/env node

// Test Supabase database configuration and tables
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // Check organizations table
    console.log('\n📊 Checking organizations...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);

    if (orgError) {
      console.error('❌ Organizations error:', orgError);
    } else {
      console.log('✅ Organizations found:', orgs?.length || 0);
      if (orgs?.length > 0) {
        console.log('First org:', orgs[0]);
      }
    }

    // Check organization_phone_numbers table
    console.log('\n📞 Checking organization phone numbers...');
    const { data: phones, error: phoneError } = await supabase
      .from('organization_phone_numbers')
      .select('*');

    if (phoneError) {
      console.error('❌ Phone numbers error:', phoneError);
    } else {
      console.log('✅ Phone numbers found:', phones?.length || 0);
      phones?.forEach(phone => {
        console.log(`Phone: ${phone.phone_number} (${phone.phone_type}) - Active: ${phone.is_active}`);
      });
    }

    // Check leads table
    console.log('\n👥 Checking leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(5);

    if (leadsError) {
      console.error('❌ Leads error:', leadsError);
    } else {
      console.log('✅ Leads found:', leads?.length || 0);
      if (leads?.length > 0) {
        console.log('First lead:', {
          id: leads[0].id,
          customer_name: leads[0].customer_name,
          phone_number: leads[0].phone_number,
          organization_id: leads[0].organization_id
        });
      }
    }

    // Check conversations table
    console.log('\n💬 Checking conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(5);

    if (convError) {
      console.error('❌ Conversations error:', convError);
    } else {
      console.log('✅ Conversations found:', conversations?.length || 0);
      if (conversations?.length > 0) {
        console.log('First conversation:', {
          id: conversations[0].id,
          phone_number: conversations[0].phone_number,
          content: conversations[0].content?.substring(0, 50) + '...'
        });
      }
    }

    // Check user_profiles table
    console.log('\n👤 Checking user profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);

    if (profileError) {
      console.error('❌ User profiles error:', profileError);
    } else {
      console.log('✅ User profiles found:', profiles?.length || 0);
    }

    // Check organization_memberships table
    console.log('\n🏢 Checking organization memberships...');
    const { data: memberships, error: memberError } = await supabase
      .from('organization_memberships')
      .select('*')
      .limit(5);

    if (memberError) {
      console.error('❌ Organization memberships error:', memberError);
    } else {
      console.log('✅ Organization memberships found:', memberships?.length || 0);
    }

    // Test inserting organization phone number if missing
    if (!phones || phones.length === 0) {
      console.log('\n📞 Attempting to insert organization phone number...');
      const { data: insertResult, error: insertError } = await supabase
        .from('organization_phone_numbers')
        .insert({
          organization_id: 'aabe0501-4eb6-4b98-9d9f-01381506314f',
          phone_number: '+17786526908',
          phone_type: 'main',
          is_active: true
        })
        .select();

      if (insertError) {
        console.error('❌ Insert phone number error:', insertError);
      } else {
        console.log('✅ Phone number inserted:', insertResult);
      }
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase().then(() => {
  console.log('\n🏁 Database check complete');
  process.exit(0);
});