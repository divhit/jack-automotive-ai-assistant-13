# Organization-Specific Phone Numbers Implementation

## Overview
Each organization needs its own dedicated Twilio phone number to prevent customer confusion and ensure proper conversation isolation.

## Database Schema

### 1. Add Organization Phone Numbers Table
```sql
CREATE TABLE organization_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  elevenlabs_phone_id VARCHAR(255) NOT NULL,
  twilio_phone_sid VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_org_phone_numbers_org_id ON organization_phone_numbers(organization_id);
CREATE INDEX idx_org_phone_numbers_phone ON organization_phone_numbers(phone_number);
CREATE INDEX idx_org_phone_numbers_active ON organization_phone_numbers(is_active);
```

### 2. Update Organizations Table
```sql
-- Add default phone number reference
ALTER TABLE organizations 
ADD COLUMN default_phone_number_id UUID REFERENCES organization_phone_numbers(id);
```

## Implementation Strategy

### **Approach 1: Semi-Automated (RECOMMENDED)**

**Why This Approach:**
- Balances automation with ElevenLabs manual requirement
- Reduces operational overhead
- Ensures proper phone number assignment

**Workflow:**
1. ✅ **Auto-Purchase Twilio Number** (via API)
2. ⚠️ **Manual ElevenLabs Import** (dashboard step)
3. ✅ **Auto-Database Update** (via webhook/manual trigger)
4. ✅ **Auto-Application Integration** (immediate use)

**Implementation Steps:**

#### Step 1: Twilio Number Purchase API
```javascript
// Purchase new Twilio number for organization
async function purchaseTwilioNumberForOrganization(organizationId, areaCode = null) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Search for available numbers
    const numbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        areaCode: areaCode,
        limit: 1
      });
    
    if (numbers.length === 0) {
      throw new Error('No available phone numbers found');
    }
    
    // Purchase the number
    const selectedNumber = numbers[0].phoneNumber;
    const purchasedNumber = await client.incomingPhoneNumbers
      .create({
        phoneNumber: selectedNumber,
        voiceUrl: 'https://api.elevenlabs.io/v1/convai/conversations/twilio/inbound',
        smsUrl: `${process.env.SERVER_URL}/api/webhooks/twilio/sms`
      });
    
    console.log('✅ Purchased Twilio number:', selectedNumber);
    
    // Store in database (pending ElevenLabs configuration)
    await supabase.from('organization_phone_numbers').insert({
      organization_id: organizationId,
      phone_number: selectedNumber,
      twilio_phone_sid: purchasedNumber.sid,
      elevenlabs_phone_id: null, // Will be updated after manual import
      is_active: false // Not active until ElevenLabs import
    });
    
    return {
      phoneNumber: selectedNumber,
      twilioSid: purchasedNumber.sid,
      requiresElevenLabsImport: true
    };
    
  } catch (error) {
    console.error('❌ Error purchasing Twilio number:', error);
    throw error;
  }
}
```

#### Step 2: ElevenLabs Import Notification
```javascript
// Send notification to admin about required manual step
async function notifyElevenLabsImportRequired(organizationId, phoneNumber) {
  // Could send email, Slack notification, or dashboard alert
  console.log(`📢 ACTION REQUIRED: Import phone number ${phoneNumber} to ElevenLabs for organization ${organizationId}`);
  
  // Store notification in database
  await supabase.from('admin_notifications').insert({
    type: 'elevenlabs_import_required',
    organization_id: organizationId,
    phone_number: phoneNumber,
    message: `Import ${phoneNumber} to ElevenLabs dashboard and update organization settings`,
    status: 'pending'
  });
}
```

#### Step 3: Manual ElevenLabs Import Process
```
MANUAL STEPS (for each new organization):
1. Go to ElevenLabs Dashboard > Phone Numbers
2. Click "Add Phone Number" > "Import existing Twilio number"
3. Enter: Phone Number, Agent Assignment, Webhook URLs
4. Get the ElevenLabs phone_id from the dashboard
5. Update the database with the phone_id
6. Mark as active
```

#### Step 4: Phone Number Activation
```javascript
// Called after manual ElevenLabs import
async function activateOrganizationPhoneNumber(phoneNumber, elevenLabsPhoneId) {
  try {
    await supabase.from('organization_phone_numbers')
      .update({
        elevenlabs_phone_id: elevenLabsPhoneId,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber);
    
    console.log('✅ Phone number activated:', phoneNumber);
  } catch (error) {
    console.error('❌ Error activating phone number:', error);
    throw error;
  }
}
```

### **Approach 2: Manual Process (FALLBACK)**

**When to Use:** If full automation proves too complex initially

**Workflow:**
1. ⚠️ **Manual Twilio Purchase** (admin dashboard)
2. ⚠️ **Manual ElevenLabs Import** (dashboard)
3. ⚠️ **Manual Database Entry** (admin interface)
4. ✅ **Auto-Application Integration** (immediate use)

## Application Integration

### 1. Organization Phone Number Lookup
```javascript
// Get active phone number for organization
async function getOrganizationPhoneNumber(organizationId) {
  const { data: phoneRecord } = await supabase
    .from('organization_phone_numbers')
    .select('phone_number, elevenlabs_phone_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();
  
  if (!phoneRecord) {
    throw new Error(`No active phone number found for organization ${organizationId}`);
  }
  
  return {
    phoneNumber: phoneRecord.phone_number,
    elevenLabsPhoneId: phoneRecord.elevenlabs_phone_id
  };
}
```

### 2. Update Outbound Call Logic
```javascript
// Modified outbound call to use organization-specific number
app.post('/api/elevenlabs/outbound-call', validateOrganizationAccess, async (req, res) => {
  try {
    const { phoneNumber, leadId, organizationId } = req.body;
    
    // GET ORGANIZATION-SPECIFIC PHONE NUMBER
    const orgPhone = await getOrganizationPhoneNumber(organizationId);
    
    const callPayload = {
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: orgPhone.elevenLabsPhoneId, // ✅ Organization-specific!
      to_number: phoneNumber,
      conversation_initiation_client_data: {
        lead_id: leadId,
        customer_phone: phoneNumber,
        organization_id: organizationId,
        from_phone_number: orgPhone.phoneNumber, // ✅ Track which number was used
        dynamic_variables: {
          // ... existing logic
        }
      }
    };
    
    // ... rest of call logic
  } catch (error) {
    console.error('❌ Error making organization call:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 3. SMS Routing Update
```javascript
// Updated SMS webhook to handle organization-specific numbers
app.post('/api/webhooks/twilio/sms', async (req, res) => {
  try {
    const { From, To, Body } = req.body;
    
    // FIND ORGANIZATION BY PHONE NUMBER
    const { data: phoneRecord } = await supabase
      .from('organization_phone_numbers')
      .select('organization_id')
      .eq('phone_number', To)
      .eq('is_active', true)
      .single();
    
    if (!phoneRecord) {
      console.error('❌ No organization found for phone number:', To);
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const organizationId = phoneRecord.organization_id;
    
    // Process SMS with organization context
    // ... existing SMS logic with organizationId
    
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Pricing Considerations

### Twilio Costs
- **Local Numbers**: ~$1.00/month per number
- **Toll-Free Numbers**: ~$2.00/month per number
- **SMS**: $0.0075 per message
- **Voice**: $0.0125 per minute

### ElevenLabs Costs
- **Phone Numbers**: No additional cost (included in plan)
- **Voice Minutes**: Based on usage plan

### Cost Example
- **100 Organizations**: ~$100-200/month for phone numbers
- **Plus usage costs**: SMS + voice minutes

## Implementation Timeline

### Phase 1: Database & Core Logic (Week 1)
- [ ] Create database schema
- [ ] Implement phone number lookup functions
- [ ] Update outbound call logic
- [ ] Update SMS routing

### Phase 2: Twilio Integration (Week 2)
- [ ] Implement Twilio number purchase API
- [ ] Create admin notification system
- [ ] Build phone number activation workflow

### Phase 3: Admin Interface (Week 3)
- [ ] Create admin dashboard for phone number management
- [ ] Implement manual phone number entry
- [ ] Add organization phone number assignment

### Phase 4: Testing & Deployment (Week 4)
- [ ] Test organization isolation
- [ ] Verify call/SMS routing
- [ ] Deploy to production

## Security Considerations

1. **Organization Isolation**: Each phone number belongs to exactly one organization
2. **Call Routing**: All calls/SMS to organization numbers are properly scoped
3. **Webhook Security**: Validate organization context in all webhooks
4. **Database Security**: Proper foreign key constraints and indexes

## Monitoring & Maintenance

1. **Phone Number Usage Tracking**
2. **Cost Monitoring per Organization**
3. **Failed Call/SMS Routing Alerts**
4. **Inactive Phone Number Cleanup**

## Success Metrics

1. **✅ Zero Cross-Organization Conversations**
2. **✅ Clear Customer Experience** (different numbers = different dealerships)
3. **✅ Automated Provisioning** (minimal manual steps)
4. **✅ Cost Efficiency** (reasonable per-organization costs) 