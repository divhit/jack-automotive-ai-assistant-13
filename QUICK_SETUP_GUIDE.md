# Quick Setup Guide - Automotive AI Assistant

## 🚀 Get Running in 15 Minutes

### Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Supabase account created
- [ ] Twilio account with phone number
- [ ] ElevenLabs account with agent created

### 1. Clone & Install
```bash
git clone https://github.com/your-org/jack-automotive-ai-assistant.git
cd jack-automotive-ai-assistant
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials (see below)
```

### 3. Required Environment Variables
```bash
# Database (Get from Supabase Dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@host:5432/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# ElevenLabs (Get from ElevenLabs Dashboard)
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=whsec_...

# Twilio (Get from Twilio Console)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=auth_token...

# Server
PORT=3001
SERVER_URL=http://localhost:3001
```

### 4. Database Setup
```bash
# Option A: Use provided schema file
psql $DATABASE_URL -f supabase-multi-tenant-schema.sql

# Option B: Copy SQL from COMPLETE_PROJECT_DOCUMENTATION.md
# and run in Supabase SQL editor
```

### 5. Start Development
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run dev

# Terminal 3: Tunnel for webhooks (optional)
npx ngrok http 3001
```

### 6. Quick Test
1. **Open browser**: http://localhost:3000
2. **Create account**: Sign up with organization name
3. **Send test SMS**: To your Twilio number
4. **Check logs**: Should see organization routing

## 🔧 Common First-Time Issues

### "Supabase connection failed"
- ✅ Check SUPABASE_URL and keys in .env
- ✅ Verify database is accessible
- ✅ Check firewall/network settings

### "No organization found for phone"
- ✅ Add phone number to organization_phone_numbers table:
```sql
INSERT INTO organization_phone_numbers (organization_id, phone_number, twilio_phone_sid, is_active)
VALUES ('your-org-id', '+1234567890', 'PN123...', true);
```

### "ElevenLabs webhook not working"
- ✅ Use ngrok for local development
- ✅ Update ElevenLabs webhook URL to your ngrok URL
- ✅ Test webhook: `curl -X POST your-ngrok-url/api/webhooks/elevenlabs/conversation-initiation`

### "SMS not routing"
- ✅ Check Twilio webhook configuration
- ✅ Verify phone number in database
- ✅ Check server logs for routing errors

## 📱 Testing Workflow

### 1. Test SMS Flow
```bash
# Send SMS to your Twilio number
# Check server logs for:
# - "SMS routed to organization: ..."
# - "Starting new SMS conversation..."
# - "WebSocket connected for..."
```

### 2. Test Voice Flow
```bash
# Make outbound call via API:
curl -X POST http://localhost:3001/api/elevenlabs/outbound-call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "organizationId: YOUR_ORG_ID" \
  -d '{
    "phoneNumber": "+1234567890",
    "leadId": "your-lead-id"
  }'
```

### 3. Test Frontend
1. **Login**: Use created account
2. **View leads**: Should see test data
3. **Send SMS**: Via telephony interface
4. **Check real-time**: Messages should appear instantly

## 🔍 Debug Tips

### Check Database Connection
```javascript
// In node console or test file
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('organizations').select('count');
console.log(error || 'Connected!');
```

### View Server Logs
```bash
# Backend logs show organization routing
npm run server | grep "organization\|SMS\|WebSocket"
```

### Check Active Connections
```bash
# In server console or logs, look for:
# - "Active SSE connections: ..."
# - "Phone to lead mapping: ..."
# - "WebSocket connected for..."
```

## 📚 Next Steps

1. **Read**: COMPLETE_PROJECT_DOCUMENTATION.md for full architecture
2. **Configure**: ElevenLabs agent with dynamic variables
3. **Test**: Cross-channel SMS → Voice → SMS flow
4. **Deploy**: Follow deployment guide in main documentation
5. **Monitor**: Set up health checks and error tracking

## 🆘 Get Help

- **Full Documentation**: COMPLETE_PROJECT_DOCUMENTATION.md
- **API Reference**: Check server.js for all endpoints
- **Database Schema**: supabase-multi-tenant-schema.sql
- **Security Guide**: SECURITY_FIXES_COMPLETE_SUMMARY.md

## 🎯 Success Checklist

After setup, you should be able to:
- [ ] Login to frontend dashboard
- [ ] See organization-specific data
- [ ] Send/receive SMS messages
- [ ] Make outbound voice calls
- [ ] See real-time message updates
- [ ] View conversation history
- [ ] Switch between organizations (if multiple)

If any of these don't work, check the troubleshooting section in the main documentation! 