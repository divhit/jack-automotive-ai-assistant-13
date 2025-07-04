# ElevenLabs Inbound Calls Configuration Guide

## Overview
This guide shows you how to configure ElevenLabs to handle inbound calls with organization-aware conversation context. Your webhook is already implemented and ready to use.

## Current Status ✅

### ✅ What's Already Working
1. **Webhook Endpoint**: `/api/webhooks/elevenlabs/conversation-initiation` - ✅ Implemented
2. **Organization Context**: Handles both existing leads and new callers - ✅ Fixed
3. **Conversation History**: Loads previous SMS/call context - ✅ Working
4. **Error Handling**: Graceful fallbacks for unknown callers - ✅ Fixed

### ❌ What Needs Configuration
1. **ElevenLabs Dashboard**: Webhook URL not configured
2. **Twilio Integration**: May need phone number setup

## Step-by-Step Configuration

### Step 1: Configure ElevenLabs Webhook

1. **Go to ElevenLabs Conversational AI Dashboard**
   - Navigate to [https://elevenlabs.io/app/conversational-ai](https://elevenlabs.io/app/conversational-ai)
   - Click on your agent

2. **Configure Webhook Settings**
   - Go to **Settings** tab
   - Find **Webhook** section
   - Configure:
     ```
     Webhook URL: https://your-domain.com/api/webhooks/elevenlabs/conversation-initiation
     ```
   - **Important**: Replace `your-domain.com` with your actual domain (or ngrok URL for testing)

3. **Enable Conversation Initiation Data**
   - Go to **Security** tab
   - Enable "Fetch conversation initiation data for inbound calls"
   - Define these fields that can be overridden:
     - `conversation_context`
     - `customer_name`
     - `lead_status`
     - `previous_summary`
     - `organization_id`
     - `caller_type`

### Step 2: Import Twilio Phone Number

1. **Go to Phone Numbers Tab**
   - Click **Add Phone Number**
   - Select **Import existing Twilio number**

2. **Fill in Details**
   ```
   Label: "Customer Support Line" (or your preferred name)
   Phone Number: +1234567890 (your Twilio number)
   Twilio SID: your_twilio_account_sid
   Twilio Token: your_twilio_auth_token
   ```

3. **Assign Agent**
   - Select your conversational AI agent
   - ElevenLabs will automatically configure Twilio webhooks

### Step 3: Test Configuration

1. **Test Webhook Endpoint**
   ```bash
   curl -X POST https://your-domain.com/api/webhooks/elevenlabs/conversation-initiation \
     -H "Content-Type: application/json" \
     -d '{
       "caller_id": "+1234567890",
       "agent_id": "your_agent_id",
       "called_number": "+1987654321",
       "call_sid": "test_call_sid"
     }'
   ```

2. **Expected Response**
   ```json
   {
     "dynamic_variables": {
       "conversation_context": "Previous conversation context or 'New caller'",
       "customer_name": "Customer Name or 'Customer'",
       "lead_status": "Returning Customer/Active Lead/New Inquiry",
       "previous_summary": "Summary of previous interactions",
       "organization_id": "org_123" or null,
       "caller_type": "existing_lead/new_caller/error_fallback"
     }
   }
   ```

3. **Test Inbound Call**
   - Call your Twilio number
   - Check server logs for webhook activity
   - Verify agent has conversation context

## How It Works

### For Existing Leads
```
1. Customer calls Twilio number
2. Twilio → ElevenLabs inbound endpoint
3. ElevenLabs → Your webhook with caller_id
4. Your webhook:
   - Finds organization from phone number
   - Loads conversation history
   - Returns dynamic variables
5. ElevenLabs starts conversation with context
```

### For New Callers
```
1. Unknown caller calls Twilio number
2. Twilio → ElevenLabs inbound endpoint
3. ElevenLabs → Your webhook with caller_id
4. Your webhook:
   - Detects no organization context
   - Returns generic new caller response
5. ElevenLabs starts conversation as new inquiry
```

## Environment Variables Needed

Ensure these are set in your environment:
```bash
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

## Organization Assignment for New Callers

Currently, new callers get a generic response. To assign them to a specific organization:

### Option 1: Phone Number Mapping
Map specific Twilio numbers to organizations:
```javascript
const PHONE_TO_ORG_MAPPING = {
  "+1234567890": "honda_dealership_org_id",
  "+1987654321": "toyota_dealership_org_id"
};
```

### Option 2: Default Organization
Set a default organization for new callers:
```javascript
const DEFAULT_ORGANIZATION_ID = "your_default_org_id";
```

## Troubleshooting

### Common Issues

1. **"Webhook not called"**
   - Check ElevenLabs dashboard webhook URL
   - Verify your server is accessible
   - Check webhook logs

2. **"No organization context"**
   - Normal for new callers
   - Check if lead exists in database
   - Verify phone number format

3. **"Conversation context empty"**
   - Check if organization has conversation history
   - Verify Supabase connection
   - Check memory storage

### Debug Commands

```bash
# Check webhook endpoint
curl -X GET https://your-domain.com/api/webhooks/elevenlabs/conversation-initiation

# Check server logs
tail -f your-server.log | grep "ElevenLabs Conversation Initiation"

# Test organization lookup
curl -X GET https://your-domain.com/api/subprime/leads?organizationId=your_org_id
```

## Next Steps

1. **Configure ElevenLabs Dashboard** with your webhook URL
2. **Test with known leads** to verify organization context
3. **Test with new callers** to verify fallback handling
4. **Monitor logs** for any issues
5. **Add organization assignment logic** for new callers

Your inbound call system is now ready! 🚀 