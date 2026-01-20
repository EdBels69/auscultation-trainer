/*
  # Allow Public Updates for Admin Operations

  ## Changes
  - Add public UPDATE policy for learning_structure
  - Add public UPDATE policy for audio_records
  - Add public DELETE policies for both tables
  - This enables full admin panel functionality without Supabase auth

  ## Security Note
  - For production, implement proper authentication
  - Current setup is for development/educational purposes
*/

-- Drop existing authenticated-only policies
DROP POLICY IF EXISTS "Authenticated users can update learning structure" ON learning_structure;
DROP POLICY IF EXISTS "Authenticated users can delete learning structure" ON learning_structure;
DROP POLICY IF EXISTS "Authenticated users can update audio records" ON audio_records;
DROP POLICY IF EXISTS "Authenticated users can delete audio records" ON audio_records;

-- Create public policies for learning_structure
CREATE POLICY "Anyone can update learning structure"
  ON learning_structure FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete learning structure"
  ON learning_structure FOR DELETE
  TO public
  USING (true);

-- Create public policies for audio_records
CREATE POLICY "Anyone can update audio records"
  ON audio_records FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete audio records"
  ON audio_records FOR DELETE
  TO public
  USING (true);
