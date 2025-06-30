import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    console.log('📊 Fetching subprime leads, limit:', limit);

    let leads = [];
    let source = 'memory';

    // Try to get from database first
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        const { getAllLeads } = await import('../../../../services/supabasePersistence.js');
        leads = await getAllLeads(limit);
        source = 'database';
        console.log(`✅ Fetched ${leads.length} leads from database`);
      } catch (dbError) {
        console.warn('⚠️ Database fetch failed, falling back to memory:', dbError.message);
      }
    }

    // Fallback to in-memory data if database fails or is disabled
    if (leads.length === 0) {
      const { subprimeLeads } = await import('../../../../src/data/subprime/subprimeLeads.ts');
      leads = subprimeLeads.slice(0, limit);
      source = 'memory';
      console.log(`📋 Fallback: Using ${leads.length} leads from memory`);
    }

    return NextResponse.json({
      success: true,
      leads,
      source,
      count: leads.length
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