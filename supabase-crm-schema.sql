-- Jack Automotive AI Assistant - CRM Persistence Schema
-- This schema preserves all existing data structures and adds CRM functionality
-- CRITICAL: This does NOT change existing in-memory operations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leads table (mirrors SubprimeLead interface exactly)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_number_normalized TEXT NOT NULL,
  email TEXT,
  
  -- Status fields (exact match to current interface)
  chase_status TEXT DEFAULT 'Auto Chase Running',
  funding_readiness TEXT DEFAULT 'Not Ready', 
  funding_readiness_reason TEXT,
  sentiment TEXT DEFAULT 'Neutral',
  
  -- Progress tracking (exact match to scriptProgress)
  script_progress_current_step TEXT DEFAULT 'contacted',
  script_progress_completed_steps JSONB DEFAULT '["contacted"]',
  
  -- Timestamps
  last_touchpoint TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Next action (exact match to nextAction interface)
  next_action_type TEXT,
  next_action_due_date TIMESTAMPTZ,
  next_action_is_automated BOOLEAN DEFAULT TRUE,
  next_action_is_overdue BOOLEAN DEFAULT FALSE,
  
  -- Credit profile (exact match to creditProfile interface)
  credit_score_range TEXT,
  credit_known_issues JSONB DEFAULT '[]',
  
  -- Additional fields
  vehicle_preference TEXT,
  assigned_agent TEXT,
  assigned_specialist TEXT,
  
  -- CRM Analytics (new fields that don't break existing)
  total_conversations INTEGER DEFAULT 0,
  total_sms_messages INTEGER DEFAULT 0,
  total_voice_calls INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  lead_score NUMERIC DEFAULT 0,
  
  -- Ensure phone uniqueness
  CONSTRAINT leads_phone_normalized_unique UNIQUE (phone_number_normalized)
);

-- Conversations table (mirrors current message structure exactly)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Message data (exact match to current structure)
  content TEXT NOT NULL,
  sent_by TEXT NOT NULL, -- 'user', 'agent', 'system', 'human_agent'
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'text', -- 'text', 'voice', 'system'
  
  -- Telephony metadata (preserves all current tracking)
  phone_number_normalized TEXT NOT NULL,
  twilio_message_sid TEXT,
  twilio_call_sid TEXT,
  elevenlabs_conversation_id TEXT,
  
  -- Dynamic variables (CRITICAL: preserves exactly as used in current system)
  dynamic_variables JSONB DEFAULT '{}',
  conversation_context TEXT,
  
  -- Status tracking
  message_status TEXT DEFAULT 'sent',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call sessions (mirrors current call tracking)
CREATE TABLE IF NOT EXISTS call_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Call identifiers (exact match to current metadata)
  elevenlabs_conversation_id TEXT,
  twilio_call_sid TEXT,
  phone_number TEXT NOT NULL,
  phone_number_normalized TEXT NOT NULL,
  call_direction TEXT DEFAULT 'outbound',
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Content (preserves call summaries exactly)
  transcript TEXT,
  summary TEXT,
  call_outcome TEXT,
  
  -- Context preservation
  conversation_context TEXT,
  dynamic_variables JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation summaries (mirrors current summaries Map structure)
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone_number_normalized TEXT NOT NULL,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Summary data (exact match to current structure)
  summary TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Context
  conversation_type TEXT DEFAULT 'mixed',
  messages_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead activities (new CRM feature - tracks all interactions)
CREATE TABLE IF NOT EXISTS lead_activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  
  activity_type TEXT NOT NULL, -- 'call_initiated', 'sms_sent', 'status_changed', etc.
  description TEXT NOT NULL,
  
  -- Activity metadata
  old_value TEXT,
  new_value TEXT,
  agent_name TEXT,
  
  -- Context preservation
  metadata JSONB DEFAULT '{}',
  
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Agent notes (new CRM feature)
CREATE TABLE IF NOT EXISTS agent_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  
  agent_name TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- 'general', 'follow_up', 'concern', 'opportunity'
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes (optimized for current query patterns)
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON leads(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sentiment ON leads(sentiment);
CREATE INDEX IF NOT EXISTS idx_leads_funding_readiness ON leads(funding_readiness);

CREATE INDEX IF NOT EXISTS idx_conversations_phone_time ON conversations(phone_number_normalized, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_time ON conversations(lead_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_elevenlabs ON conversations(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_phone ON call_sessions(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_date ON call_sessions(lead_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_elevenlabs ON call_sessions(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_summaries_phone ON conversation_summaries(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_activities_lead_time ON lead_activities(lead_id, timestamp DESC);

-- Row Level Security (RLS) setup
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notes ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized later)
CREATE POLICY "Enable all operations for authenticated users" ON leads
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON conversations
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON call_sessions
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON conversation_summaries
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON lead_activities
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON agent_notes
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Analytics views (new CRM functionality) - FIXED AGGREGATE ERROR
CREATE OR REPLACE VIEW lead_analytics AS
SELECT 
  l.id,
  l.customer_name,
  l.phone_number,
  l.sentiment,
  l.funding_readiness,
  l.lead_score,
  l.total_conversations,
  l.total_sms_messages,
  l.total_voice_calls,
  l.last_activity,
  
  -- Conversation metrics
  COUNT(c.id) as actual_conversation_count,
  COUNT(CASE WHEN c.type = 'text' THEN 1 END) as actual_sms_count,
  COUNT(CASE WHEN c.type = 'voice' THEN 1 END) as actual_voice_count,
  
  -- Recent activity
  MAX(c.timestamp) as last_conversation_time
  
FROM leads l
LEFT JOIN conversations c ON l.id = c.lead_id
GROUP BY l.id, l.customer_name, l.phone_number, l.sentiment, l.funding_readiness, 
         l.lead_score, l.total_conversations, l.total_sms_messages, l.total_voice_calls, l.last_activity;

-- Conversation timeline view
CREATE OR REPLACE VIEW conversation_timeline AS
SELECT 
  c.id,
  c.lead_id,
  l.customer_name,
  c.content,
  c.sent_by,
  c.type,
  c.timestamp,
  c.phone_number_normalized,
  
  -- Context
  ROW_NUMBER() OVER (PARTITION BY c.lead_id ORDER BY c.timestamp) as sequence_number,
  LAG(c.timestamp) OVER (PARTITION BY c.lead_id ORDER BY c.timestamp) as previous_message_time,
  LEAD(c.timestamp) OVER (PARTITION BY c.lead_id ORDER BY c.timestamp) as next_message_time
  
FROM conversations c
JOIN leads l ON c.lead_id = l.id
ORDER BY c.timestamp DESC;

-- Real-time subscriptions setup (enhances current SSE system)
-- This allows the UI to subscribe to database changes
CREATE OR REPLACE FUNCTION notify_conversation_changes()
RETURNS trigger AS $$
BEGIN
  -- Only notify for INSERT operations to avoid spam
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('conversation_changes', json_build_object(
      'operation', TG_OP,
      'record', row_to_json(NEW),
      'lead_id', NEW.lead_id,
      'phone_number', NEW.phone_number_normalized
    )::text);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_changes_trigger
  AFTER INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION notify_conversation_changes();

-- Lead scoring function (new CRM feature)
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id_param TEXT)
RETURNS NUMERIC AS $$
DECLARE
  score NUMERIC := 0;
  conversation_count INTEGER;
  call_count INTEGER;
  days_since_last_activity INTEGER;
  sentiment_multiplier NUMERIC := 1.0;
  funding_multiplier NUMERIC := 1.0;
BEGIN
  -- Get lead data
  SELECT 
    COALESCE(total_conversations, 0),
    COALESCE(total_voice_calls, 0),
    EXTRACT(DAYS FROM (NOW() - last_activity))::INTEGER,
    CASE sentiment
      WHEN 'Warm' THEN 1.5
      WHEN 'Neutral' THEN 1.0
      WHEN 'Cold' THEN 0.7
      WHEN 'Negative' THEN 0.3
      WHEN 'Frustrated' THEN 0.2
      WHEN 'Ghosted' THEN 0.1
      ELSE 1.0
    END,
    CASE funding_readiness
      WHEN 'Ready' THEN 2.0
      WHEN 'Partial' THEN 1.5
      WHEN 'Not Ready' THEN 1.0
      ELSE 1.0
    END
  INTO conversation_count, call_count, days_since_last_activity, sentiment_multiplier, funding_multiplier
  FROM leads
  WHERE id = lead_id_param;
  
  -- Base score from interactions
  score := conversation_count * 2 + call_count * 10;
  
  -- Apply multipliers
  score := score * sentiment_multiplier * funding_multiplier;
  
  -- Recent activity bonus/penalty
  IF days_since_last_activity < 1 THEN
    score := score * 1.2;
  ELSIF days_since_last_activity < 7 THEN
    score := score * 1.1;
  ELSIF days_since_last_activity > 30 THEN
    score := score * 0.8;
  END IF;
  
  -- Cap at 100
  score := LEAST(100, score);
  
  RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Update lead score trigger
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS trigger AS $$
BEGIN
  -- Update lead score when conversations change
  IF TG_OP = 'INSERT' THEN
    UPDATE leads 
    SET 
      lead_score = calculate_lead_score(NEW.lead_id),
      last_activity = NOW(),
      updated_at = NOW()
    WHERE id = NEW.lead_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_score_trigger
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();

-- Initial data migration function (run once)
CREATE OR REPLACE FUNCTION migrate_initial_test_data()
RETURNS void AS $$
BEGIN
  -- Insert test lead if not exists
  INSERT INTO leads (
    id, customer_name, phone_number, phone_number_normalized,
    chase_status, funding_readiness, funding_readiness_reason,
    sentiment, script_progress_current_step, script_progress_completed_steps,
    vehicle_preference, assigned_agent, assigned_specialist,
    last_touchpoint, next_action_type, next_action_due_date
  ) VALUES (
    'test1', 'Test User', '(604) 908-5474', '+16049085474',
    'Auto Chase Running', 'Ready', 'Test lead for telephony integration',
    'Warm', 'contacted', '["contacted"]',
    'SUV', 'Test Agent', 'Andrea',
    NOW(), 'Test telephony integration', NOW() + INTERVAL '4 hours'
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Insert initial conversation if not exists
  INSERT INTO conversations (
    id, lead_id, content, sent_by, timestamp, type, phone_number_normalized
  ) VALUES (
    'conv_test1_initial', 'test1', 
    'Welcome! This is a test lead for telephony integration.',
    'system', NOW(), 'system', '+16049085474'
  ) ON CONFLICT (id) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Run initial migration
SELECT migrate_initial_test_data(); 