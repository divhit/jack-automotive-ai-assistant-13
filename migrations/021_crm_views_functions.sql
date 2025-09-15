-- Lead analytics view
CREATE OR REPLACE VIEW lead_analytics AS
SELECT 
  l.id,
  l.customer_name,
  l.phone_number,
  COUNT(c.id) as actual_conversation_count,
  COUNT(CASE WHEN c.type = 'text' THEN 1 END) as actual_sms_count,
  COUNT(CASE WHEN c.type = 'voice' THEN 1 END) as actual_voice_count,
  MAX(c.timestamp) as last_conversation_time
FROM leads l
LEFT JOIN conversations c ON l.id = c.lead_id
GROUP BY l.id, l.customer_name, l.phone_number;

-- Lead scoring function
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
  SELECT 
    COALESCE(total_conversations, 0),
    COALESCE(total_voice_calls, 0),
    COALESCE(EXTRACT(DAYS FROM (NOW() - last_activity))::INTEGER, 9999),
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

  score := conversation_count * 2 + call_count * 10;
  score := score * sentiment_multiplier * funding_multiplier;

  IF days_since_last_activity < 1 THEN
    score := score * 1.2;
  ELSIF days_since_last_activity < 7 THEN
    score := score * 1.1;
  ELSIF days_since_last_activity > 30 THEN
    score := score * 0.8;
  END IF;

  score := LEAST(100, score);
  RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- Update lead score trigger
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS trigger AS $$
BEGIN
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

DROP TRIGGER IF EXISTS update_lead_score_trigger ON conversations;
CREATE TRIGGER update_lead_score_trigger
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_score();
