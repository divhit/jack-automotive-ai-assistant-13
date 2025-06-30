import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Clearing all test data...');

    // Test lead IDs to remove
    const testLeadIds = ['test1', 'sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6', 'sl7', 'sl8'];
    
    let deletedCount = 0;

    // Try to delete from database first
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        const { deleteMultipleLeads } = await import('../../../../services/supabasePersistence.js');
        await deleteMultipleLeads(testLeadIds);
        console.log('✅ Test data deleted from database');
      } catch (dbError) {
        console.warn('⚠️ Database clear failed, continuing with memory clear:', dbError.message);
      }
    }

    // Clear from in-memory data
    const { subprimeLeads } = await import('../../../../src/data/subprime/subprimeLeads.ts');
    
    // Remove test leads by filtering out known test IDs and names
    const originalLength = subprimeLeads.length;
    
    // Remove leads that match test criteria
    for (let i = subprimeLeads.length - 1; i >= 0; i--) {
      const lead = subprimeLeads[i];
      if (
        testLeadIds.includes(lead.id) ||
        lead.customerName === 'Test User' ||
        lead.customerName === 'John Smith' ||
        lead.customerName === 'Emily White' ||
        lead.customerName === 'Carlos Rodriguez' ||
        lead.customerName === 'Maria Garcia' ||
        lead.customerName === 'David Johnson' ||
        lead.customerName === 'Sarah Wilson' ||
        lead.customerName === 'Michael Brown' ||
        lead.customerName === 'Jessica Davis' ||
        lead.id.startsWith('sl') && lead.id.length <= 3 // sl1, sl2, etc.
      ) {
        subprimeLeads.splice(i, 1);
        deletedCount++;
      }
    }

    const remainingCount = subprimeLeads.length;
    console.log(`✅ Removed ${deletedCount} test leads, ${remainingCount} leads remaining`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} test leads successfully`,
      deletedCount,
      remainingCount
    });

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clear test data' 
      },
      { status: 500 }
    );
  }
} 