import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json();
    
    console.log('⚙️ Saving subprime settings:', settings);

    // In a real implementation, you'd save to database
    // For now, we'll just acknowledge the save
    
    // Import the persistence service if needed
    if (process.env.ENABLE_SUPABASE_PERSISTENCE === 'true') {
      try {
        // For now, we'll log the settings. In a real implementation,
        // you'd create a settings table and persist these
        console.log('📊 Settings would be persisted to database:', {
          enabledSections: Object.keys(settings.enabledSections || {}),
          communicationStyle: settings.communicationStyle,
          toneSettings: settings.toneSettings,
          scriptSettings: settings.scriptSettings
        });
      } catch (dbError) {
        console.warn('⚠️ Settings persistence failed:', dbError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to save settings' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return default settings for now
    // In a real implementation, you'd fetch from database
    const defaultSettings = {
      enabledSections: {
        identity: true,
        residence: true,
        employment: true,
        credit: true,
        vehicle: true,
        consent: true,
        scheduling: true
      },
      toneSettings: {
        formality: 60,
        persistence: 45,
        empathy: 75,
        pacing: 50
      },
      scriptSettings: {
        autoFollowUp: true,
        creditWarnings: true,
        suggestOptions: true,
        customGreeting: "Hello, I'm Jack, your virtual assistant. I'm here to help you with your auto financing needs."
      },
      communicationStyle: "balanced"
    };

    return NextResponse.json({
      success: true,
      settings: defaultSettings
    });

  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch settings' 
      },
      { status: 500 }
    );
  }
} 