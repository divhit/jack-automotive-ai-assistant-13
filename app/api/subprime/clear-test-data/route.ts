import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Clearing all leads data...');

    let deletedCount = 0;

    // Try to delete ALL leads from database first (not just test leads)
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        const { deleteAllLeads } = await import('../../../../services/supabasePersistence.js');
        deletedCount = await deleteAllLeads();
        console.log(`✅ ${deletedCount} leads deleted from database`);
      } catch (dbError) {
        console.warn('⚠️ Database clear failed, continuing with memory clear:', dbError.message);
      }
    }

    // Clear ALL leads from in-memory data (not just test leads)
    const { subprimeLeads } = await import('../../../../src/data/subprime/subprimeLeads.ts');
    
    const memoryCount = subprimeLeads.length;
    subprimeLeads.splice(0); // Clear the entire array
    
    console.log(`✅ Cleared ${memoryCount} leads from memory`);
    
    const totalDeleted = Math.max(deletedCount, memoryCount);

    return NextResponse.json({
      success: true,
      message: `Cleared ${totalDeleted} leads successfully`,
      deletedCount: totalDeleted,
      remainingCount: 0
    });

  } catch (error) {
    console.error('❌ Error clearing all leads:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clear all leads' 
      },
      { status: 500 }
    );
  }
} 