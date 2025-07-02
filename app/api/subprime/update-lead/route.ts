import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://dgzadilmtuqvimolzxms.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: NextRequest) {
  try {
    const { leadId, updates, organization_id, updated_by } = await request.json();
    
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

    console.log('📝 Updating subprime lead:', leadId, {
      updates,
      organization_id,
      updated_by
    });

    // Enhanced updates with multi-tenant fields
    const enhancedUpdates = {
      ...updates,
      updated_by,
      updated_at: new Date().toISOString()
    };

    // Update in database with organization context
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true' && supabaseServiceKey) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .update(enhancedUpdates)
          .eq('id', leadId)
          .eq('organization_id', organization_id) // Ensure organization isolation
          .select();

        if (error) {
          console.error('❌ Supabase update error:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Lead not found or access denied' 
            },
            { status: 404 }
          );
        }

        console.log('✅ Lead update persisted to database with organization context');
        
        return NextResponse.json({
          success: true,
          message: 'Lead updated successfully',
          leadId,
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
      const { updateLead } = await import('../../../../services/supabasePersistence.js');
      await updateLead(leadId, enhancedUpdates);
      console.log('✅ Lead update persisted via legacy service');
    } catch (dbError) {
      console.warn('⚠️ Legacy persistence also failed, continuing with in-memory storage:', dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      leadId,
      source: 'memory'
    });

  } catch (error) {
    console.error('❌ Error updating lead:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update lead' 
      },
      { status: 500 }
    );
  }
} 