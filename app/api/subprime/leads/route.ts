import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dgzadilmtuqvimolzxms.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const organizationId = url.searchParams.get('organization_id');
    
    console.log('📊 Fetching subprime leads, limit:', limit, 'org:', organizationId);

    // Validate organization_id is provided
    if (!organizationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'organization_id is required for multi-tenant access' 
        },
        { status: 400 }
      );
    }

    let leads = [];
    let source = 'memory';

    // Try to get from database first with organization filtering
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true' && supabaseServiceKey) {
      try {
        // Query leads with organization filter
        const { data: dbLeads, error } = await supabase
          .from('leads')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.warn('⚠️ Supabase query error:', error.message);
        } else if (dbLeads && dbLeads.length > 0) {
          leads = dbLeads;
          source = 'database';
          console.log(`✅ Fetched ${leads.length} leads from database for org: ${organizationId}`);
        }
      } catch (dbError) {
        console.warn('⚠️ Database fetch failed, falling back to memory:', dbError.message);
      }
    }

    // Fallback to in-memory data if database fails or is disabled
    // Note: In-memory data won't have organization filtering, this is for development only
    if (leads.length === 0) {
      const { subprimeLeads } = await import('../../../../src/data/subprime/subprimeLeads.ts');
      leads = subprimeLeads.slice(0, limit);
      source = 'memory';
      console.log(`📋 Fallback: Using ${leads.length} leads from memory (no org filtering)`);
    }

    return NextResponse.json({
      success: true,
      leads,
      source,
      count: leads.length,
      organization_id: organizationId
    });

  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch leads' 
      },
      { status: 500 }
    );
  }
} 