/*
  # Create Admin User

  ## Overview
  Creates an admin user for accessing the admin panel.
  
  ## User Credentials
  - Email: admin@admin.com
  - Password: admin1-*
  
  ## Security Note
  This is a development/demo admin account. In production:
  - Use a strong, unique password
  - Enable MFA (Multi-Factor Authentication)
  - Regularly rotate credentials
  - Monitor access logs
  
  ## Changes Made
  1. Create admin user in auth.users table
  2. Set email as confirmed (no email verification needed)
  3. Add user metadata
  4. Create identity record with proper provider_id
  
  ## Result
  After this migration, you can log in to the admin panel using:
  - Email: admin@admin.com
  - Password: admin1-*
*/

-- Ensure pgcrypto extension is enabled (for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Check if user exists and create if not
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com';

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    -- Generate new user ID
    v_user_id := gen_random_uuid();
    
    -- Insert admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@admin.com',
      crypt('admin1-*', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"],"role":"admin"}',
      '{"name":"Admin User"}',
      false,
      '',
      ''
    );

    -- Insert identity record with provider_id
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', 'admin@admin.com',
        'email_verified', true,
        'provider', 'email'
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Admin user created successfully with email: admin@admin.com';
  ELSE
    -- User exists, update password
    UPDATE auth.users
    SET 
      encrypted_password = crypt('admin1-*', gen_salt('bf')),
      updated_at = NOW(),
      email_confirmed_at = NOW()
    WHERE id = v_user_id;

    RAISE NOTICE 'Admin user already exists. Password updated.';
  END IF;
END $$;
