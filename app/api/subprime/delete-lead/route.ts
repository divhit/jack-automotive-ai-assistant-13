import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const leadId = url.searchParams.get('id');
    
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting lead:', leadId);

    // Try to delete from database first
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        const { deleteLead } = await import('../../../../services/supabasePersistence.js');
        await deleteLead(leadId);
        console.log('✅ Lead deleted from database:', leadId);
      } catch (dbError) {
        console.warn('⚠️ Database delete failed, continuing with memory delete:', dbError.message);
      }
    }

    // Delete from in-memory data
    const { subprimeLeads } = await import('../../../../src/data/subprime/subprimeLeads.ts');
    const leadIndex = subprimeLeads.findIndex(lead => lead.id === leadId);
    
    if (leadIndex !== -1) {
      subprimeLeads.splice(leadIndex, 1);
      console.log('✅ Lead deleted from memory:', leadId);
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
      leadId
    });

  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete lead' 
      },
      { status: 500 }
    );
  }
} 