import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const { leadId, updates } = await request.json();
    
    console.log('📝 Updating subprime lead:', leadId, updates);

    // Import the persistence service
    const { updateLead } = await import('../../../../services/supabasePersistence.js');
    
    // Persist to database (async, non-blocking)
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        await updateLead(leadId, updates);
        console.log('✅ Lead update persisted to database');
      } catch (dbError) {
        console.warn('⚠️ Database persistence failed, continuing with in-memory storage:', dbError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      leadId
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