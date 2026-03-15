/*
  # Set Admin Role for Existing Admin User

  This migration updates the role of the existing admin user to 'admin'
  so they can access the statistics dashboard and export data.
*/

DO $$
DECLARE
    admin_email TEXT := 'admin@auscultation.app';
BEGIN
    UPDATE public.user_profiles
    SET role = 'admin'
    WHERE id IN (
        SELECT id FROM auth.users WHERE email = admin_email
    );
END $$;
