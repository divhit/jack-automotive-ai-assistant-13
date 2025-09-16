DO $$
DECLARE
  org_id uuid := 'aabe0501-4eb6-4b98-9d9f-01381506314f'::uuid;
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'divhit@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'No auth user found for divhit@gmail.com';
  ELSE
    INSERT INTO public.user_profiles (id, organization_id, email, role, is_active)
    VALUES (uid, org_id, 'divhit@gmail.com', 'admin', true)
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          email = EXCLUDED.email,
          role = 'admin',
          is_active = true,
          updated_at = now();

    INSERT INTO public.organization_memberships (user_id, organization_id, is_active)
    VALUES (uid, org_id, true)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET is_active = EXCLUDED.is_active;
  END IF;
END$$;

