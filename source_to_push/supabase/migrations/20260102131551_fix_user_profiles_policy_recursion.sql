/*
  # Fix infinite recursion in user_profiles RLS policy

  1. Problem
    - The "Admin can view all profiles" policy queries user_profiles table
    - This triggers the same policy again, causing infinite recursion
  
  2. Solution
    - Drop the problematic admin policy
    - Users can already view their own profile which is sufficient for role checking
    - Admins can view their own profile to check their role
*/

DROP POLICY IF EXISTS "Admin can view all profiles" ON user_profiles;