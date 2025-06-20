-- Supabase Database Schema for ElevenLabs + Twilio Telephony Integration
-- Run this in your Supabase SQL Editor to create the necessary tables

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-supabase-jwt-secret';

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    elevenlabs_conversation_id TEXT,
    twilio_call_sid TEXT,
    type TEXT NOT NULL CHECK (type IN ('voice', 'sms', 'chat')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('agent', 'lead', 'system')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'sms')),
    twilio_message_sid TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create call_recordings table
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    twilio_recording_sid TEXT UNIQUE NOT NULL,
    twilio_call_sid TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    signed_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes INTEGER,
    transcription TEXT,
    analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create sms_status table for tracking SMS delivery
CREATE TABLE IF NOT EXISTS sms_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    twilio_message_sid TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'delivered', 'undelivered')),
    error_code TEXT,
    error_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_status table for tracking call progress
CREATE TABLE IF NOT EXISTS call_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    twilio_call_sid TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled')),
    direction TEXT CHECK (direction IN ('inbound', 'outbound-api', 'outbound-dial')),
    duration_seconds INTEGER,
    price DECIMAL(10,4),
    error_code TEXT,
    error_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_logs table for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type TEXT NOT NULL CHECK (webhook_type IN ('elevenlabs', 'twilio')),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    signature_verified BOOLEAN DEFAULT false,
    processed_successfully BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_elevenlabs_id ON conversations(elevenlabs_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_twilio_call_sid ON conversations(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_speaker ON messages(speaker);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid ON messages(twilio_message_sid);

CREATE INDEX IF NOT EXISTS idx_call_recordings_conversation_id ON call_recordings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_twilio_recording_sid ON call_recordings(twilio_recording_sid);
CREATE INDEX IF NOT EXISTS idx_call_recordings_twilio_call_sid ON call_recordings(twilio_call_sid);

CREATE INDEX IF NOT EXISTS idx_sms_status_message_id ON sms_status(message_id);
CREATE INDEX IF NOT EXISTS idx_sms_status_twilio_sid ON sms_status(twilio_message_sid);

CREATE INDEX IF NOT EXISTS idx_call_status_conversation_id ON call_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_status_twilio_call_sid ON call_status(twilio_call_sid);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your authentication needs)
-- For now, allowing service role to access everything
CREATE POLICY "Service role can access all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all conversations" ON conversations
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all messages" ON messages
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all call_recordings" ON call_recordings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all sms_status" ON sms_status
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all call_status" ON call_status
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all webhook_logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create storage bucket for call recordings (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('call-recordings', 'call-recordings', false);

-- Create storage policy for call recordings
-- CREATE POLICY "Service role can access call recordings" ON storage.objects
--     FOR ALL USING (bucket_id = 'call-recordings' AND auth.role() = 'service_role');

-- Sample data (optional - remove in production)
-- INSERT INTO leads (phone_number, name, status) VALUES 
--     ('+1234567890', 'John Doe', 'new'),
--     ('+1987654321', 'Jane Smith', 'contacted');

-- Useful queries for monitoring:
-- 
-- -- Get recent conversations with lead info
-- SELECT 
--     c.id as conversation_id,
--     l.name,
--     l.phone_number,
--     c.type,
--     c.status,
--     c.started_at,
--     c.duration_seconds
-- FROM conversations c
-- JOIN leads l ON c.lead_id = l.id
-- ORDER BY c.started_at DESC
-- LIMIT 10;
-- 
-- -- Get message history for a conversation
-- SELECT 
--     speaker,
--     content,
--     message_type,
--     timestamp
-- FROM messages
-- WHERE conversation_id = 'your-conversation-id'
-- ORDER BY timestamp;
-- 
-- -- Get webhook processing stats
-- SELECT 
--     webhook_type,
--     event_type,
--     COUNT(*) as total,
--     SUM(CASE WHEN processed_successfully THEN 1 ELSE 0 END) as successful,
--     SUM(CASE WHEN NOT processed_successfully THEN 1 ELSE 0 END) as failed
-- FROM webhook_logs
-- WHERE created_at > NOW() - INTERVAL '24 hours'
-- GROUP BY webhook_type, event_type
-- ORDER BY total DESC; 