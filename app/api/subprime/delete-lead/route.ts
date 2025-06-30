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

    // Try to delete from database using service role
    try {
      const { deleteLead } = await import('../../../../services/supabasePersistence.js');
      await deleteLead(leadId);
      console.log('✅ Lead deleted from database:', leadId);
    } catch (dbError) {
      console.error('❌ Database delete failed:', dbError.message);
      // Don't continue to memory delete if database delete fails
      return NextResponse.json({
        success: false,
        error: `Failed to delete lead from database: ${dbError.message}`
      }, { status: 500 });
    }

    // Delete from in-memory data as backup
    try {
      const { subprimeLeads } = await import('../../../../src/data/subprime/subprimeLeads.ts');
      const leadIndex = subprimeLeads.findIndex(lead => lead.id === leadId);
      
      if (leadIndex !== -1) {
        subprimeLeads.splice(leadIndex, 1);
        console.log('✅ Lead deleted from memory:', leadId);
      }
    } catch (memoryError) {
      console.warn('⚠️ Memory delete failed:', memoryError.message);
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