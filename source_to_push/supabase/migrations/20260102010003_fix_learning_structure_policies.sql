/*
  # Fix RLS Policies for Admin Operations

  ## Changes
  - Update INSERT policy for learning_structure to allow public access
  - Update INSERT policy for audio_records to allow public access
  - This enables admin panel to work without Supabase authentication

  ## Security Note
  - For production, implement proper Supabase authentication
  - Current setup suitable for development/educational purposes
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can manage learning structure" ON learning_structure;
DROP POLICY IF EXISTS "Authenticated users can insert audio records" ON audio_records;

-- Create public INSERT policies
CREATE POLICY "Anyone can insert learning structure"
  ON learning_structure FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can insert audio records"
  ON audio_records FOR INSERT
  TO public
  WITH CHECK (true);
