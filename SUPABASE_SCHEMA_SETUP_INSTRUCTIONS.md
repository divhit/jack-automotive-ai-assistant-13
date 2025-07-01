# Supabase ElevenLabs MCP Analytics Schema Setup

## Apply the Database Schema

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: dgzadilmtuqvimolzxms

2. **Apply the Schema**
   - Go to SQL Editor
   - Copy the contents of `elevenlabs-mcp-analytics-schema.sql`
   - Paste and run the SQL to create analytics tables

3. **Verify Tables Created**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%analytics%';
   ```

   Expected tables:
   - `conversation_analytics`
   - `live_coaching_events` 
   - `agent_performance_analytics`
   - `conversation_patterns`
   - `lead_scoring_factors`

## Environment Variables Needed

Add these to your `.env.local` file (NOT .env):

```env
# ElevenLabs MCP Analytics
ELEVENLABS_API_KEY=your_new_regenerated_api_key
SUPABASE_ACCESS_TOKEN=your_new_regenerated_access_token
```

⚠️ **SECURITY REMINDER**: Regenerate all your API keys that were exposed! 