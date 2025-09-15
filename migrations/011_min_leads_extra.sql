CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Minimal tables to satisfy migration dependencies
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  phone_number text UNIQUE,
  phone_number_normalized text,
  email text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text,
  description text,
  timestamp timestamptz DEFAULT now()
);

