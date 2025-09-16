DO $$
DECLARE
  org_id uuid := 'aabe0501-4eb6-4b98-9d9f-01381506314f'::uuid;
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'divhit@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'No auth user found for divhit@gmail.com';
  ELSE
    -- Upsert profile
    INSERT INTO public.user_profiles (id, organization_id, email, role, is_active)
    VALUES (uid, org_id, 'divhit@gmail.com', 'admin', true)
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          email = EXCLUDED.email,
          role = 'admin',
          is_active = true,
          updated_at = now();

    -- Insert membership if missing; otherwise set active
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_memberships WHERE user_id = uid AND organization_id = org_id
    ) THEN
      INSERT INTO public.organization_memberships (user_id, organization_id, is_active)
      VALUES (uid, org_id, true);
    ELSE
      UPDATE public.organization_memberships SET is_active = true WHERE user_id = uid AND organization_id = org_id;
    END IF;
  END IF;
END$$;

