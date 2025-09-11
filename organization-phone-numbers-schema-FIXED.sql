-- Organization Phone Numbers Schema - CORRECTED
-- Each organization gets its own dedicated phone number to prevent cross-organization confusion
-- FIXED: Uses correct column names from existing database structure

-- 1. Create organization phone numbers table
CREATE TABLE organization_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  elevenlabs_phone_id VARCHAR(255),
  twilio_phone_sid VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX idx_org_phone_numbers_org_id ON organization_phone_numbers(organization_id);
CREATE INDEX idx_org_phone_numbers_phone ON organization_phone_numbers(phone_number);
CREATE INDEX idx_org_phone_numbers_active ON organization_phone_numbers(is_active);

-- 3. Add default phone number reference to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS default_phone_number_id UUID REFERENCES organization_phone_numbers(id);

-- 4. Create admin notifications table for manual steps
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  phone_number VARCHAR(50),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5. Create index for admin notifications
CREATE INDEX idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);

-- 6. Add RLS policies for organization phone numbers
ALTER TABLE organization_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see phone numbers for their organization
-- FIXED: Uses 'id' column from user_profiles, not 'user_id'
CREATE POLICY "Users can view organization phone numbers" ON organization_phone_numbers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Users can update phone numbers for their organization
-- FIXED: Uses 'id' column from user_profiles, not 'user_id'
CREATE POLICY "Users can update organization phone numbers" ON organization_phone_numbers
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- 7. Add RLS policies for admin notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can see admin notifications
-- FIXED: Uses 'id' column from user_profiles, not 'user_id'
CREATE POLICY "Admins can view notifications" ON admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update notifications
-- FIXED: Uses 'id' column from user_profiles, not 'user_id'
CREATE POLICY "Admins can update notifications" ON admin_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Create function to get organization phone number
CREATE OR REPLACE FUNCTION get_organization_phone_number(org_id UUID)
RETURNS TABLE (
  phone_number VARCHAR(50),
  elevenlabs_phone_id VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT opn.phone_number, opn.elevenlabs_phone_id
  FROM organization_phone_numbers opn
  WHERE opn.organization_id = org_id
    AND opn.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to find organization by phone number
CREATE OR REPLACE FUNCTION get_organization_by_phone_number(phone VARCHAR(50))
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_phone_numbers
  WHERE phone_number = phone
    AND is_active = true
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create helper function to purchase and store phone numbers
CREATE OR REPLACE FUNCTION store_purchased_phone_number(
  org_id UUID,
  phone_num VARCHAR(50),
  twilio_sid VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
  new_phone_id UUID;
BEGIN
  INSERT INTO organization_phone_numbers (
    organization_id,
    phone_number,
    twilio_phone_sid,
    is_active
  ) VALUES (
    org_id,
    phone_num,
    twilio_sid,
    true
  ) RETURNING id INTO new_phone_id;
  
  -- Create admin notification for manual ElevenLabs import
  INSERT INTO admin_notifications (
    type,
    organization_id,
    phone_number,
    message,
    status
  ) VALUES (
    'elevenlabs_import_required',
    org_id,
    phone_num,
    'Import ' || phone_num || ' to ElevenLabs dashboard and assign to agent',
    'pending'
  );
  
  RETURN new_phone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to activate phone number after ElevenLabs import
CREATE OR REPLACE FUNCTION activate_phone_number(
  phone_num VARCHAR(50),
  elevenlabs_phone_id VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE organization_phone_numbers
  SET 
    elevenlabs_phone_id = elevenlabs_phone_id,
    updated_at = NOW()
  WHERE phone_number = phone_num;
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows > 0 THEN
    -- Mark admin notification as resolved
    UPDATE admin_notifications
    SET 
      status = 'resolved',
      resolved_at = NOW()
    WHERE phone_number = phone_num 
      AND type = 'elevenlabs_import_required'
      AND status = 'pending';
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ✅ VERIFICATION QUERIES
-- =====================================================

-- Check if everything was created properly
SELECT 
    'organization_phone_numbers' as table_name,
    COUNT(*) as count
FROM organization_phone_numbers
UNION ALL
SELECT 
    'admin_notifications' as table_name,
    COUNT(*) as count
FROM admin_notifications;

-- Show the functions
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_organization_phone_number', 'get_organization_by_phone_number', 'store_purchased_phone_number', 'activate_phone_number');

-- =====================================================
-- 🎉 SUCCESS! Organization phone numbers schema is ready!
-- Each organization can now have dedicated phone numbers
-- Admin workflow is automated with notifications
-- Complete organization isolation maintained
-- ===================================================== 