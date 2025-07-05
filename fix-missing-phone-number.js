// Script to add missing phone number to database and activate it
const organizationId = 'c3d5e948-fc5a-4459-82d7-cb3cbb04f5a7';
const phoneNumber = '+17655632641';
const elevenLabsPhoneId = 'phnum_01jzcgz3bkfgwrykfp43dv85t0';

async function fixMissingPhoneNumber() {
  try {
    console.log('🔧 Adding missing phone number to database...');
    
    // First, add the phone number to the database
    const addResponse = await fetch(`https://jack-automotive-ai-assistant-13.onrender.com/api/admin/phone-numbers/manual-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId: organizationId,
        phoneNumber: phoneNumber,
        twilioPhoneSid: 'PN_MANUAL_ADD', // Placeholder since we don't have the actual SID
        elevenLabsPhoneId: elevenLabsPhoneId,
        isActive: true
      })
    });
    
    if (!addResponse.ok) {
      // If manual-add endpoint doesn't exist, let's try the activation endpoint directly
      console.log('⚠️ Manual add endpoint not found, trying direct activation...');
      
      // Try to activate the phone number directly
      const activateResponse = await fetch(`https://jack-automotive-ai-assistant-13.onrender.com/api/admin/phone-numbers/${encodeURIComponent(phoneNumber)}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          elevenLabsPhoneId: elevenLabsPhoneId
        })
      });
      
      if (!activateResponse.ok) {
        const errorText = await activateResponse.text();
        console.error(`❌ Activation failed: ${activateResponse.status} - ${errorText}`);
        
        // Let's try a different approach - check if we can find the number in the database
        console.log('🔍 Checking if number exists in database...');
        const checkResponse = await fetch(`https://jack-automotive-ai-assistant-13.onrender.com/api/organizations/${organizationId}/phone-numbers`);
        
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          console.log('📞 Current phone numbers:', data);
        } else {
          console.log('❌ Could not check phone numbers');
        }
        
        return;
      }
      
      const activateData = await activateResponse.json();
      console.log('✅ Phone number activated successfully:', activateData);
      
    } else {
      const addData = await addResponse.json();
      console.log('✅ Phone number added to database:', addData);
    }
    
    // Verify the phone number is now active
    console.log('🔍 Verifying phone number is active...');
    const checkResponse = await fetch(`https://jack-automotive-ai-assistant-13.onrender.com/api/organizations/${organizationId}/phone-numbers`);
    
    if (checkResponse.ok) {
      const data = await checkResponse.json();
      console.log('📞 Organization phone numbers after fix:', data);
      
      const activeNumber = data.phoneNumbers?.find(p => p.phone_number === phoneNumber && p.is_active);
      if (activeNumber) {
        console.log('🎉 SUCCESS: Phone number is now active and ready to use!');
        console.log('📞 Phone:', activeNumber.phone_number);
        console.log('🆔 ElevenLabs ID:', activeNumber.elevenlabs_phone_id);
      } else {
        console.log('⚠️ Phone number found but may not be active');
      }
    } else {
      console.log('❌ Could not verify phone number status');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the fix
fixMissingPhoneNumber(); 