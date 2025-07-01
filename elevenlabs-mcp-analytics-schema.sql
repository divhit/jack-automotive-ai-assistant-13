-- ElevenLabs MCP Analytics Database Schema
-- Extends existing CRM schema with advanced conversation analytics

-- Enhanced conversation analytics table
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  
  -- ElevenLabs Analysis Results
  transcription_quality_score NUMERIC DEFAULT 0,
  sentiment_confidence NUMERIC DEFAULT 0,
  emotional_tone JSONB DEFAULT '{}', -- joy, frustration, interest, concern, etc.
  
  -- Communication Metrics
  talk_time_ratio NUMERIC DEFAULT 0, -- agent vs customer talk ratio
  pause_analysis JSONB DEFAULT '{}', -- pause patterns, hesitation
  speech_pace_analysis JSONB DEFAULT '{}', -- speaking rate, excitement
  voice_stress_indicators JSONB DEFAULT '{}', -- stress, anxiety levels
  
  -- Intent Recognition
  detected_intents JSONB DEFAULT '[]', -- customer intentions
  buying_signals JSONB DEFAULT '[]', -- purchase interest indicators
  objections JSONB DEFAULT '[]', -- concerns or objections raised
  concerns JSONB DEFAULT '[]', -- specific customer concerns
  questions_asked JSONB DEFAULT '[]', -- types of questions
  
  -- Quality Metrics
  conversation_quality_score NUMERIC DEFAULT 0,
  engagement_level TEXT DEFAULT 'medium', -- low, medium, high
  professionalism_score NUMERIC DEFAULT 0,
  script_adherence_score NUMERIC DEFAULT 0,
  
  -- Predictive Indicators
  conversion_probability NUMERIC DEFAULT 0,
  follow_up_urgency TEXT DEFAULT 'medium', -- low, medium, high, urgent
  recommended_actions JSONB DEFAULT '[]',
  risk_factors JSONB DEFAULT '[]',
  next_best_action TEXT,
  optimal_follow_up_time TIMESTAMPTZ,
  
  -- Performance Tracking
  agent_performance_score NUMERIC DEFAULT 0,
  customer_satisfaction_predicted NUMERIC DEFAULT 0,
  call_outcome_prediction TEXT, -- likely outcome
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live coaching events table for real-time analysis
CREATE TABLE IF NOT EXISTS live_coaching_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL, -- sentiment_change, buying_signal, objection, quality_alert
  event_data JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'medium', -- low, medium, high, critical
  
  recommendation TEXT,
  action_taken TEXT,
  agent_response_time INTEGER, -- seconds to respond to coaching
  
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Agent performance analytics
CREATE TABLE IF NOT EXISTS agent_performance_analytics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_name TEXT NOT NULL,
  
  -- Time period for this analysis
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Conversation Metrics
  total_conversations INTEGER DEFAULT 0,
  avg_conversation_quality NUMERIC DEFAULT 0,
  avg_customer_satisfaction NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  
  -- Communication Skills
  avg_talk_time_ratio NUMERIC DEFAULT 0,
  professionalism_score NUMERIC DEFAULT 0,
  script_adherence_rate NUMERIC DEFAULT 0,
  objection_handling_score NUMERIC DEFAULT 0,
  
  -- Performance Indicators
  buying_signals_identified INTEGER DEFAULT 0,
  objections_resolved INTEGER DEFAULT 0,
  coaching_alerts_responded INTEGER DEFAULT 0,
  coaching_response_time_avg INTEGER DEFAULT 0,
  
  -- Outcomes
  leads_converted INTEGER DEFAULT 0,
  follow_ups_scheduled INTEGER DEFAULT 0,
  customer_callbacks INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation patterns analysis
CREATE TABLE IF NOT EXISTS conversation_patterns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  pattern_type TEXT NOT NULL, -- sentiment_journey, objection_pattern, buying_signal_sequence
  pattern_data JSONB NOT NULL,
  
  -- Pattern Effectiveness
  success_rate NUMERIC DEFAULT 0,
  conversion_correlation NUMERIC DEFAULT 0,
  frequency INTEGER DEFAULT 0,
  
  -- Context
  industry_vertical TEXT DEFAULT 'automotive',
  customer_segment TEXT, -- subprime, prime, etc.
  
  first_observed TIMESTAMPTZ DEFAULT NOW(),
  last_observed TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced lead scoring factors table
CREATE TABLE IF NOT EXISTS lead_scoring_factors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  
  -- Conversation-based factors
  avg_engagement_level NUMERIC DEFAULT 0,
  conversation_quality_trend TEXT DEFAULT 'stable', -- improving, stable, declining
  sentiment_trajectory TEXT DEFAULT 'neutral', -- positive, neutral, negative
  buying_signals_count INTEGER DEFAULT 0,
  objections_count INTEGER DEFAULT 0,
  
  -- Behavioral factors
  response_time_avg INTEGER DEFAULT 0, -- average response time in minutes
  call_acceptance_rate NUMERIC DEFAULT 0,
  message_engagement_rate NUMERIC DEFAULT 0,
  
  -- Voice-specific factors (when available)
  voice_enthusiasm_avg NUMERIC DEFAULT 0,
  voice_stress_avg NUMERIC DEFAULT 0,
  voice_confidence_avg NUMERIC DEFAULT 0,
  
  -- Predictive scores
  conversion_probability NUMERIC DEFAULT 0,
  churn_risk_score NUMERIC DEFAULT 0,
  follow_up_responsiveness NUMERIC DEFAULT 0,
  
  -- Final calculated score
  enhanced_lead_score NUMERIC DEFAULT 0,
  score_confidence NUMERIC DEFAULT 0,
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days' -- Recalculate weekly
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_quality_score ON conversation_analytics(conversation_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversion_prob ON conversation_analytics(conversion_probability DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_created_at ON conversation_analytics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_coaching_conversation_id ON live_coaching_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_live_coaching_timestamp ON live_coaching_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_live_coaching_event_type ON live_coaching_events(event_type);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_name ON agent_performance_analytics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_performance_period ON agent_performance_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_agent_performance_conversion_rate ON agent_performance_analytics(conversion_rate DESC);

CREATE INDEX IF NOT EXISTS idx_lead_scoring_factors_lead_id ON lead_scoring_factors(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_factors_score ON lead_scoring_factors(enhanced_lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_factors_expires_at ON lead_scoring_factors(expires_at);

-- Enhanced lead scoring function using ElevenLabs analytics
CREATE OR REPLACE FUNCTION calculate_enhanced_lead_score_v2(lead_id_param TEXT)
RETURNS NUMERIC AS $$
DECLARE
  base_score NUMERIC := 0;
  conversation_score NUMERIC := 0;
  behavioral_score NUMERIC := 0;
  voice_score NUMERIC := 0;
  final_score NUMERIC := 0;
  confidence_score NUMERIC := 0;
BEGIN
  -- Get base demographic score
  SELECT COALESCE(lead_score, 50) INTO base_score 
  FROM leads WHERE id = lead_id_param;
  
  -- Calculate conversation analytics score
  SELECT COALESCE(AVG(
    (conversation_quality_score * 0.25) +
    (sentiment_confidence * 0.15) +
    (conversion_probability * 50) +
    (CASE WHEN engagement_level = 'high' THEN 20 WHEN engagement_level = 'medium' THEN 10 ELSE 0 END) +
    (LEAST(20, COALESCE(jsonb_array_length(buying_signals), 0) * 5)) +
    (GREATEST(-15, COALESCE(jsonb_array_length(objections), 0) * -3))
  ), 0) INTO conversation_score
  FROM conversation_analytics ca
  JOIN conversations c ON ca.conversation_id = c.id
  WHERE c.lead_id = lead_id_param
  AND ca.created_at >= NOW() - INTERVAL '30 days';
  
  -- Calculate behavioral score from lead_scoring_factors
  SELECT COALESCE(
    (avg_engagement_level * 15) +
    (CASE conversation_quality_trend 
      WHEN 'improving' THEN 15
      WHEN 'stable' THEN 5
      WHEN 'declining' THEN -10
      ELSE 0 END) +
    (CASE sentiment_trajectory
      WHEN 'positive' THEN 20
      WHEN 'neutral' THEN 0
      WHEN 'negative' THEN -15
      ELSE 0 END) +
    (LEAST(25, buying_signals_count * 3)) +
    (GREATEST(-20, objections_count * -2)) +
    (CASE 
      WHEN response_time_avg <= 30 THEN 10
      WHEN response_time_avg <= 120 THEN 5
      ELSE -5 END) +
    (call_acceptance_rate * 15) +
    (message_engagement_rate * 10)
  , 0) INTO behavioral_score
  FROM lead_scoring_factors
  WHERE lead_id = lead_id_param
  AND expires_at > NOW()
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Calculate voice-specific score (when available)
  SELECT COALESCE(
    (voice_enthusiasm_avg * 20) +
    (voice_confidence_avg * 15) +
    (GREATEST(-10, voice_stress_avg * -10)) -- High stress reduces score
  , 0) INTO voice_score
  FROM lead_scoring_factors
  WHERE lead_id = lead_id_param
  AND voice_enthusiasm_avg > 0 -- Only if voice data exists
  AND expires_at > NOW()
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  -- Calculate final weighted score
  final_score := (
    (base_score * 0.3) +           -- 30% base demographics
    (conversation_score * 0.4) +   -- 40% conversation analytics
    (behavioral_score * 0.25) +    -- 25% behavioral patterns
    (voice_score * 0.05)           -- 5% voice analysis (bonus)
  );
  
  -- Cap score between 0 and 100
  final_score := GREATEST(0, LEAST(100, final_score));
  
  -- Calculate confidence based on data availability
  confidence_score := (
    (CASE WHEN base_score > 0 THEN 0.3 ELSE 0 END) +
    (CASE WHEN conversation_score > 0 THEN 0.4 ELSE 0 END) +
    (CASE WHEN behavioral_score > 0 THEN 0.25 ELSE 0 END) +
    (CASE WHEN voice_score > 0 THEN 0.05 ELSE 0 END)
  ) * 100;
  
  -- Insert or update lead scoring factors
  INSERT INTO lead_scoring_factors (
    lead_id, enhanced_lead_score, score_confidence, calculated_at, expires_at
  ) VALUES (
    lead_id_param, final_score, confidence_score, NOW(), NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (lead_id) DO UPDATE SET
    enhanced_lead_score = final_score,
    score_confidence = confidence_score,
    calculated_at = NOW(),
    expires_at = NOW() + INTERVAL '7 days';
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update lead scoring when conversation analytics change
CREATE OR REPLACE FUNCTION trigger_enhanced_lead_scoring()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the lead_id from the conversation
  DECLARE
    target_lead_id TEXT;
  BEGIN
    SELECT c.lead_id INTO target_lead_id
    FROM conversations c
    WHERE c.id = NEW.conversation_id;
    
    -- Recalculate enhanced lead score
    PERFORM calculate_enhanced_lead_score_v2(target_lead_id);
    
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on conversation_analytics
CREATE TRIGGER conversation_analytics_lead_scoring_trigger
  AFTER INSERT OR UPDATE ON conversation_analytics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_enhanced_lead_scoring();

-- Analytics views for dashboard integration
CREATE OR REPLACE VIEW enhanced_lead_analytics AS
SELECT 
  l.id,
  l.customer_name,
  l.phone_number,
  l.funding_readiness,
  l.sentiment,
  l.chase_status,
  l.lead_score as base_score,
  lsf.enhanced_lead_score,
  lsf.score_confidence,
  lsf.conversion_probability,
  lsf.buying_signals_count,
  lsf.objections_count,
  
  -- Recent conversation metrics
  recent_ca.conversation_quality_score,
  recent_ca.engagement_level,
  recent_ca.sentiment_confidence,
  recent_ca.next_best_action,
  recent_ca.optimal_follow_up_time,
  
  -- Performance indicators
  (CASE 
    WHEN lsf.enhanced_lead_score >= 80 THEN 'hot'
    WHEN lsf.enhanced_lead_score >= 60 THEN 'warm'
    WHEN lsf.enhanced_lead_score >= 40 THEN 'lukewarm'
    ELSE 'cold'
  END) as lead_temperature,
  
  lsf.calculated_at as score_updated_at
  
FROM leads l
LEFT JOIN lead_scoring_factors lsf ON l.id = lsf.lead_id AND lsf.expires_at > NOW()
LEFT JOIN LATERAL (
  SELECT *
  FROM conversation_analytics ca
  JOIN conversations c ON ca.conversation_id = c.id
  WHERE c.lead_id = l.id
  ORDER BY ca.created_at DESC
  LIMIT 1
) recent_ca ON true;

-- Performance insights view
CREATE OR REPLACE VIEW conversation_performance_insights AS
SELECT 
  DATE_TRUNC('day', ca.created_at) as date,
  COUNT(*) as total_conversations,
  AVG(ca.conversation_quality_score) as avg_quality_score,
  AVG(ca.sentiment_confidence) as avg_sentiment_confidence,
  AVG(ca.conversion_probability) as avg_conversion_probability,
  
  -- Engagement distribution
  COUNT(CASE WHEN ca.engagement_level = 'high' THEN 1 END) as high_engagement_count,
  COUNT(CASE WHEN ca.engagement_level = 'medium' THEN 1 END) as medium_engagement_count,
  COUNT(CASE WHEN ca.engagement_level = 'low' THEN 1 END) as low_engagement_count,
  
  -- Buying signals and objections
  SUM(COALESCE(jsonb_array_length(ca.buying_signals), 0)) as total_buying_signals,
  SUM(COALESCE(jsonb_array_length(ca.objections), 0)) as total_objections,
  
  -- Agent performance
  AVG(ca.agent_performance_score) as avg_agent_performance,
  AVG(ca.customer_satisfaction_predicted) as avg_predicted_satisfaction,
  
  -- Outcome predictions
  COUNT(CASE WHEN ca.call_outcome_prediction = 'likely_conversion' THEN 1 END) as predicted_conversions,
  COUNT(CASE WHEN ca.call_outcome_prediction = 'needs_follow_up' THEN 1 END) as needs_follow_up,
  COUNT(CASE WHEN ca.call_outcome_prediction = 'unlikely_conversion' THEN 1 END) as unlikely_conversions
  
FROM conversation_analytics ca
WHERE ca.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', ca.created_at)
ORDER BY date DESC;

-- Row Level Security (RLS) policies
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_coaching_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_factors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access all data
CREATE POLICY "Enable all operations for authenticated users" ON conversation_analytics
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON live_coaching_events
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON agent_performance_analytics
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON conversation_patterns
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable all operations for authenticated users" ON lead_scoring_factors
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role'); 