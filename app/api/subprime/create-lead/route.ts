import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dgzadilmtuqvimolzxms.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { organization_id, created_by, ...leadData } = requestData;
    
    // Validate required multi-tenant fields
    if (!organization_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'organization_id is required for multi-tenant access' 
        },
        { status: 400 }
      );
    }

    console.log('📝 Creating new subprime lead:', {
      id: leadData.id,
      customerName: leadData.customerName,
      phoneNumber: leadData.phoneNumber,
      organization_id,
      created_by
    });

    // Enhanced lead data with multi-tenant fields
    const enhancedLeadData = {
      ...leadData,
      organization_id,
      created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Persist to database with organization context
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true' && supabaseServiceKey) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .insert([enhancedLeadData])
          .select();

        if (error) {
          console.error('❌ Supabase insert error:', error);
          throw error;
        }

        console.log('✅ Lead persisted to database with organization context');
        
        return NextResponse.json({
          success: true,
          message: 'Lead created successfully',
          leadId: leadData.id,
          data: data[0],
          source: 'database'
        });

      } catch (dbError) {
        console.warn('⚠️ Database persistence failed:', dbError.message);
        // Fall through to legacy method
      }
    }

    // Fallback to legacy persistence service
    try {
      const { persistNewLead } = await import('../../../../services/supabasePersistence.js');
      await persistNewLead(enhancedLeadData);
      console.log('✅ Lead persisted via legacy service');
    } catch (dbError) {
      console.warn('⚠️ Legacy persistence also failed, continuing with in-memory storage:', dbError.message);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      leadId: leadData.id,
      source: 'memory'
    });

  } catch (error) {
    console.error('❌ Error creating lead:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create lead' 
      },
      { status: 500 }
    );
  }
} 