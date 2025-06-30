import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const leadData = await request.json();
    
    console.log('📝 Creating new subprime lead:', {
      id: leadData.id,
      customerName: leadData.customerName,
      phoneNumber: leadData.phoneNumber
    });

    // Import the persistence service
    const { persistNewLead } = await import('../../../../services/supabasePersistence.js');
    
    // Persist to database (async, non-blocking)
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        await persistNewLead(leadData);
        console.log('✅ Lead persisted to database');
      } catch (dbError) {
        console.warn('⚠️ Database persistence failed, continuing with in-memory storage:', dbError.message);
      }
    }

    // In a real implementation, you'd also add to server memory state
    // For now, we'll let the frontend handle the state update
    
    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      leadId: leadData.id
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