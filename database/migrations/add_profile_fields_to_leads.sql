-- Add comprehensive profile fields to leads table
-- Executed: [Date] by Claude Code

-- Add identity and contact fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ssn_last_4 TEXT CHECK (length(ssn_last_4) = 4);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS drivers_license TEXT;

-- Add residence and housing fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS length_at_address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS housing_status TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_housing_payment DECIMAL(10,2);

-- Add employment and income fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employer_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employment_length TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS additional_income DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employment_type TEXT;

-- Add financial fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS credit_score INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_expenses DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS existing_debt DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS down_payment DECIMAL(10,2);

-- Add vehicle and financing preferences
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS vehicle_preference TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS financing_needed BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS trade_in_vehicle TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS trade_in_value DECIMAL(10,2);

-- Add analytics and tracking fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS conversion_probability DECIMAL(3,2) DEFAULT 0.36;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_attempts INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS response_time_avg INTERVAL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'phone';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS best_contact_times TEXT[];

-- Add subprime-specific fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS funding_readiness TEXT DEFAULT 'Not Ready';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'Neutral';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS chase_status TEXT DEFAULT 'Inactive';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_specialist TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'Normal';

-- Add agent and settings fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS auto_chase_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS smart_responses_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS mood_detection_enabled BOOLEAN DEFAULT true;

-- Add organization context (security)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Update existing name field to customer_name for consistency
UPDATE public.leads SET customer_name = name WHERE customer_name IS NULL AND name IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON public.leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_specialist ON public.leads(assigned_specialist);
CREATE INDEX IF NOT EXISTS idx_leads_chase_status ON public.leads(chase_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact_date ON public.leads(last_contact_date);

-- Add constraints
ALTER TABLE public.leads ADD CONSTRAINT check_lead_score_range CHECK (lead_score >= 0 AND lead_score <= 100);
ALTER TABLE public.leads ADD CONSTRAINT check_conversion_probability_range CHECK (conversion_probability >= 0 AND conversion_probability <= 1);
ALTER TABLE public.leads ADD CONSTRAINT check_funding_readiness_values CHECK (funding_readiness IN ('Ready', 'Partial', 'Not Ready'));
ALTER TABLE public.leads ADD CONSTRAINT check_sentiment_values CHECK (sentiment IN ('Positive', 'Neutral', 'Negative', 'Frustrated', 'Ghosted'));
ALTER TABLE public.leads ADD CONSTRAINT check_chase_status_values CHECK (chase_status IN ('Active', 'Inactive', 'Auto Chase Running', 'Paused'));
ALTER TABLE public.leads ADD CONSTRAINT check_priority_level_values CHECK (priority_level IN ('Low', 'Normal', 'High', 'Urgent'));

-- Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization isolation
CREATE POLICY "Users can only access leads from their organization" ON public.leads
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_memberships
            WHERE user_id = auth.uid()
        )
    );

COMMENT ON TABLE public.leads IS 'Comprehensive lead management with profile, analytics, and settings data';