// Quick script to activate phone number for organization
const organizationId = 'c3d5e948-fc5a-4459-82d7-cb3cbb04f5a7';
const elevenLabsPhoneId = 'phnum_01jzcgz3bkfgwrykfp43dv85t0';

async function activatePhoneNumber() {
  try {
    console.log('🔍 Checking organization phone numbers...');
    
    // First, get the organization's phone numbers
    const response = await fetch(`https://jack-automotive-ai-assistant-13.onrender.com/api/organizations/${organizationId}/phone-numbers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get phone numbers: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📞 Organization phone numbers:', data);
    
    if (data.phoneNumbers && data.phoneNumbers.length > 0) {
      const phoneNumber = data.phoneNumbers[0].phone_number;
      console.log(`📞 Found phone number: ${phoneNumber}`);
      
      // Activate the phone number
      console.log('🔧 Activating phone number...');
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
        throw new Error(`Failed to activate phone number: ${activateResponse.status} - ${errorText}`);
      }
      
      const activateData = await activateResponse.json();
      console.log('✅ Phone number activated successfully:', activateData);
      
    } else {
      console.log('❌ No phone numbers found for organization');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the activation
activatePhoneNumber(); 