CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop dependent tables
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.call_sessions CASCADE;

-- Recreate leads with text id
DROP TABLE IF EXISTS public.leads CASCADE;
CREATE TABLE public.leads (
  id text PRIMARY KEY,
  customer_name text,
  phone_number text,
  phone_number_normalized text,
  email text,
  chase_status text,
  funding_readiness text,
  sentiment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate conversations and call_sessions with lead_id text
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  conversation_context text,
  created_at timestamptz DEFAULT now(),
  dynamic_variables jsonb,
  elevenlabs_conversation_id text,
  lead_id text REFERENCES public.leads(id),
  message_status text,
  organization_id uuid REFERENCES public.organizations(id),
  phone_number_normalized text NOT NULL,
  sent_by text NOT NULL,
  timestamp timestamptz NOT NULL,
  twilio_call_sid text,
  twilio_message_sid text,
  type text
);

CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_direction text,
  call_outcome text,
  call_type text,
  conversation_context text,
  created_at timestamptz DEFAULT now(),
  duration_seconds integer,
  dynamic_variables jsonb,
  elevenlabs_conversation_id text,
  ended_at timestamptz,
  lead_id text REFERENCES public.leads(id),
  organization_id uuid REFERENCES public.organizations(id),
  phone_number text NOT NULL,
  phone_number_normalized text NOT NULL,
  started_at timestamptz NOT NULL,
  summary text,
  transcript text,
  twilio_call_sid text
);

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type text,
  created_at timestamptz DEFAULT now(),
  lead_id text REFERENCES public.leads(id),
  messages_count integer,
  organization_id uuid,
  phone_number_normalized text NOT NULL,
  summary text NOT NULL,
  timestamp timestamptz NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone_normalized ON public.conversations(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON public.conversations(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_elevenlabs_id ON public.conversations(elevenlabs_conversation_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_id ON public.call_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_organization_id ON public.call_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_phone_normalized ON public.call_sessions(phone_number_normalized);
CREATE INDEX IF NOT EXISTS idx_call_sessions_elevenlabs_id ON public.call_sessions(elevenlabs_conversation_id);

