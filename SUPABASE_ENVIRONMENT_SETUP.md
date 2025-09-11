# Supabase Environment Variables & Realtime Setup

## 🔐 Environment Variables Setup

### For Your Node.js Application (.env file)

Add these to your `.env` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Enable/disable persistence (CRITICAL: set to false if you want to disable)
ENABLE_SUPABASE_PERSISTENCE=true

# Your existing telephony variables (unchanged)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id_here
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=your_webhook_secret_here

TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

PORT=3001
```

### For Supabase Edge Functions (Optional)

If you plan to use Supabase Edge Functions later, set these in your Supabase dashboard:

1. Go to **Project Settings → API → Project API keys**
2. Go to **Project Settings → Edge Functions → Environment variables**
3. Add these variables:

```bash
# For Edge Functions (if you build them later)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
```

**Note**: You don't need Edge Functions for the current implementation. Your Node.js server handles everything.

## ⚡ Realtime Settings

### Current Implementation (SSE)

**Your system currently uses Server-Sent Events (SSE) from your Node.js server, NOT Supabase Realtime.**

This is by design because:
- ✅ SSE works perfectly with your existing telephony system
- ✅ No additional configuration needed
- ✅ Maintains your current real-time performance
- ✅ Lead-specific updates work exactly as before

### Optional: Enable Supabase Realtime (Future Enhancement)

If you want to add Supabase Realtime later for additional features:

#### 1. Enable Realtime in Supabase Dashboard

1. Go to **Database → Replication**
2. Enable replication for these tables:
   - `leads`
   - `conversations` 
   - `lead_activities`

#### 2. Row Level Security for Realtime

The schema already includes RLS policies that work with Realtime:

```sql
-- Already included in your schema
CREATE POLICY "Enable all operations for authenticated users" ON conversations
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
```

#### 3. Subscribe to Changes (Example)

```javascript
// Optional: Subscribe to conversation changes
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const channel = supabase
  .channel('conversation_changes')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'conversations' },
    (payload) => {
      console.log('New conversation:', payload.new)
      // Update UI in real-time
    }
  )
  .subscribe()
```

**However, you don't need this right now.** Your SSE system is working perfectly.

## 🛠️ Configuration Priority

### Option 1: Keep Current System (Recommended)
```bash
# .env file
ENABLE_SUPABASE_PERSISTENCE=true
# ... other variables
```
- ✅ SSE continues working as-is
- ✅ Database persistence added
- ✅ Zero changes to real-time behavior

### Option 2: Disable Persistence (If Needed)
```bash
# .env file
ENABLE_SUPABASE_PERSISTENCE=false
# Don't set SUPABASE_* variables
```
- ✅ System works exactly as before
- ❌ No persistence or CRM features

### Option 3: Full Database + Realtime (Future)
```bash
# .env file
ENABLE_SUPABASE_PERSISTENCE=true
ENABLE_SUPABASE_REALTIME=true  # Future feature
```
- ✅ Database persistence
- ✅ Current SSE system
- ✅ Additional Supabase Realtime features

## 🔍 How to Get Your Supabase Credentials

### 1. Go to Your Supabase Project
Visit: https://supabase.com/dashboard/projects

### 2. Select Your Project
Click on your project name

### 3. Get API Credentials
Go to **Settings → API**

You'll find:
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon (public) key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Keep secret!)

### 4. Copy to Your .env File
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## ⚠️ Security Best Practices

### For Development
- ✅ Use `.env` file (already in `.gitignore`)
- ✅ Service role key is for server-side only
- ✅ Anon key is safe for client-side

### For Production
- ✅ Set environment variables in your hosting platform
- ✅ Never commit keys to git
- ✅ Rotate keys periodically
- ✅ Use separate projects for dev/staging/prod

## 🧪 Testing Your Setup

### 1. Test Environment Variables
```bash
npm run test:supabase
```

### 2. Check Server Logs
Start your server and look for:
```
🗄️ Supabase persistence service initialized and ENABLED
✅ Supabase connection verified
```

### 3. Test Persistence
1. Create a new lead in the UI
2. Check server logs for: `🗄️ Lead {id} persisted to Supabase`
3. Verify in Supabase dashboard → Table Editor

### 4. Check System Status
```bash
curl http://localhost:3001/api/system/status
```

Should return:
```json
{
  "persistence": {
    "enabled": true,
    "connected": true,
    "service": "Supabase"
  }
}
```

## 🚫 Realtime NOT Required

**Important**: You don't need to configure Supabase Realtime because:

1. **Your SSE system handles real-time updates perfectly**
2. **Lead-specific updates work exactly as before**
3. **Dashboard refreshes happen in real-time via SSE**
4. **No additional configuration needed**

The database triggers I implemented (`notify_conversation_changes()`) could work with Supabase Realtime if you want to add it later, but it's completely optional.

## 🎯 Summary

**Minimum Required Setup:**
1. Create Supabase project
2. Run the SQL schema
3. Add 3 environment variables to `.env`
4. Restart your server

**That's it!** Your system will have full CRM persistence while maintaining all existing functionality.

**Realtime**: Your current SSE system continues working perfectly. No additional realtime configuration needed. 