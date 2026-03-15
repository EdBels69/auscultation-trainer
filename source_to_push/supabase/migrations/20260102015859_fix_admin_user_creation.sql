/*
  # Fix Admin User Creation

  ## Overview
  Removes the manually created admin user and prepares for proper creation via Supabase Admin API.
  
  ## Changes
  1. Delete existing manually created admin user
  2. Delete associated identity records
  
  ## Next Steps
  After this migration, use an edge function with service_role key to create the admin user properly.
*/

-- Delete identity first (foreign key constraint)
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@admin.com'
);

-- Delete the user
DELETE FROM auth.users
WHERE email = 'admin@admin.com';
