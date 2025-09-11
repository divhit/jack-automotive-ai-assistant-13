# Supabase Setup Guide for Telephony Integration

## Overview
This guide walks you through setting up Supabase as your database and file storage solution for the ElevenLabs + Twilio telephony integration.

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Choose your organization
4. Enter project name (e.g., "jack-automotive-telephony")
5. Enter a strong database password
6. Select your region (choose closest to your users)
7. Click "Create new project"

### 2. Get Your Credentials
Once your project is ready:

1. Go to **Settings → API**
2. Copy the following values for your `.env` file:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`  
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **Settings → Database**
4. Copy the **Connection string** → `DATABASE_URL`
   - Format: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`
   - Replace `[password]` with your database password

### 3. Set Up Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to execute the schema

This creates all necessary tables:
- `leads` - Store lead information
- `conversations` - Track voice/SMS conversations  
- `messages` - Store individual messages
- `call_recordings` - Metadata for stored recordings
- `sms_status` - Track SMS delivery status
- `call_status` - Track call progress
- `webhook_logs` - Debug webhook processing

### 4. Set Up Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Enter bucket name: `call-recordings`
4. **Uncheck** "Public bucket" (keep it private)
5. Click "Create bucket"

### 5. Configure Storage Policies
In the **SQL Editor**, run this query to set up storage policies:

```sql
-- Create storage policy for call recordings
CREATE POLICY "Service role can manage call recordings" ON storage.objects
    FOR ALL USING (
        bucket_id = 'call-recordings' AND 
        auth.role() = 'service_role'
    );
```

## 📋 Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=call-recordings
```

## 🔧 Database Schema Details

### Core Tables

#### `leads`
Stores customer/lead information
- `phone_number` - Unique identifier for lead lookup
- `name`, `email` - Contact information
- `status` - Lead progression (new, contacted, qualified, etc.)
- `score` - Lead scoring (0-100)
- `metadata` - JSON field for additional data

#### `conversations`
Tracks conversation sessions
- Links to `leads` table
- Stores ElevenLabs conversation ID and Twilio call SID
- Tracks conversation type (voice, SMS, chat)
- Records duration and status

#### `messages`
Individual messages within conversations
- Links to `conversations` table
- Stores speaker (agent/lead/system)
- Content and message type
- Twilio message SID for SMS tracking

#### `call_recordings`
Metadata for stored call recordings
- Links to `conversations` table
- Stores Supabase storage path and signed URLs
- Includes transcription and AI analysis results
- Tracks file size and expiration

### Monitoring Tables

#### `webhook_logs`
Debug webhook processing
- Records all incoming webhooks
- Tracks signature verification
- Logs processing success/failure
- Stores error messages

#### `sms_status` & `call_status`
Track delivery and call progress
- Links to messages/conversations
- Stores Twilio status updates
- Records error codes and timestamps

## 🔍 Useful Queries

### Recent Conversations
```sql
SELECT 
    c.id as conversation_id,
    l.name,
    l.phone_number,
    c.type,
    c.status,
    c.started_at,
    c.duration_seconds
FROM conversations c
JOIN leads l ON c.lead_id = l.id
ORDER BY c.started_at DESC
LIMIT 10;
```

### Message History
```sql
SELECT 
    speaker,
    content,
    message_type,
    timestamp
FROM messages
WHERE conversation_id = 'your-conversation-id'
ORDER BY timestamp;
```

### Webhook Stats (Last 24 Hours)
```sql
SELECT 
    webhook_type,
    event_type,
    COUNT(*) as total,
    SUM(CASE WHEN processed_successfully THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN NOT processed_successfully THEN 1 ELSE 0 END) as failed
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY webhook_type, event_type
ORDER BY total DESC;
```

### Lead Scoring Overview
```sql
SELECT 
    status,
    COUNT(*) as count,
    AVG(score) as avg_score,
    MIN(score) as min_score,
    MAX(score) as max_score
FROM leads
GROUP BY status
ORDER BY avg_score DESC;
```

## 🔐 Security Configuration

### Row Level Security (RLS)
The schema enables RLS on all tables with policies allowing the service role full access. For production, you may want to add more granular policies.

### Storage Security
- Call recordings are stored in a private bucket
- Access requires service role authentication
- Signed URLs provide temporary access (1 year expiry)

## 📊 Monitoring & Maintenance

### Regular Cleanup
Consider setting up periodic cleanup for:
- Old webhook logs (keep last 30 days)
- Expired recording signed URLs
- Completed conversations older than X months

### Backup Strategy
Supabase provides automatic backups, but consider:
- Regular database exports for critical data
- Separate backup of call recordings
- Test restore procedures

## 🔧 Integration with Your App

### Database Queries
Use the Supabase client library or direct PostgreSQL connections:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Example: Find lead by phone number
const { data: lead } = await supabase
  .from('leads')
  .select('*')
  .eq('phone_number', phoneNumber)
  .single()
```

### Storage Operations
```javascript
// Upload recording
const { data, error } = await supabase.storage
  .from('call-recordings')
  .upload(`${callSid}/${recordingSid}.wav`, recordingBuffer)

// Generate signed URL
const { data: signedUrl } = await supabase.storage
  .from('call-recordings')
  .createSignedUrl(`${callSid}/${recordingSid}.wav`, 31536000)
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check DATABASE_URL format
   - Verify database password
   - Ensure project is active

2. **Storage Upload Fails**
   - Verify SUPABASE_SERVICE_ROLE_KEY
   - Check bucket exists and policies are set
   - Ensure file size limits

3. **RLS Denies Access**
   - Use service role key for server operations
   - Check RLS policies match your auth setup
   - Verify JWT configuration

### Debug Queries
```sql
-- Check table permissions
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check storage buckets
SELECT * FROM storage.buckets;
```

This setup provides a robust, scalable foundation for your telephony integration with proper data modeling, security, and monitoring capabilities. 