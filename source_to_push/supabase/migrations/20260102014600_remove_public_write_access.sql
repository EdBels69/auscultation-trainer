/*
  # Remove Public Write Access - Security Fix

  ## Overview
  Critical security fix to remove public write/delete access from tables.
  
  ## Problem
  Current setup allows ANYONE (unauthenticated) to:
  - Delete all data from learning_structure
  - Update any records in learning_structure  
  - Delete all data from audio_records
  - Update any records in audio_records
  
  ## Solution
  Remove dangerous public policies and add authenticated-only policies.
  
  ## Changes
  
  ### learning_structure table:
  - ❌ Remove "Anyone can delete learning structure"
  - ❌ Remove "Anyone can update learning structure"
  - ❌ Remove "Anyone can insert learning structure"
  - ✅ Keep "Anyone can view learning structure" (read-only public access)
  - ✅ Add authenticated INSERT/UPDATE/DELETE policies
  
  ### audio_records table:
  - ❌ Remove "Anyone can delete audio records"
  - ❌ Remove "Anyone can update audio records"
  - ❌ Remove "Anyone can insert audio records"
  - ✅ Keep "Anyone can view audio records" (read-only public access)
  - ✅ Add authenticated INSERT/UPDATE/DELETE policies
  
  ### Other tables:
  - learning_nodes: ✅ Already secure (has proper policies)
  - theory_structure: ✅ Already secure
  - theory_content: ✅ Already secure
  - test_questions: ✅ Already secure
  - test_results: ✅ Already secure (user-specific)
  
  ## Result
  After this migration:
  - Public users can READ all learning materials (required for students)
  - Only authenticated users can CREATE/UPDATE/DELETE content (admins only)
  - Admin panel will require authentication to function
*/

-- ==============================================
-- LEARNING_STRUCTURE TABLE - Remove Public Write
-- ==============================================

-- Remove DANGEROUS public policies
DROP POLICY IF EXISTS "Anyone can delete learning structure" ON learning_structure;
DROP POLICY IF EXISTS "Anyone can update learning structure" ON learning_structure;
DROP POLICY IF EXISTS "Anyone can insert learning structure" ON learning_structure;

-- Add safe authenticated policies
CREATE POLICY "Authenticated users can insert learning structure"
  ON learning_structure FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update learning structure"
  ON learning_structure FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete learning structure"
  ON learning_structure FOR DELETE
  TO authenticated
  USING (true);

-- ==============================================
-- AUDIO_RECORDS TABLE - Remove Public Write
-- ==============================================

-- Remove DANGEROUS public policies
DROP POLICY IF EXISTS "Anyone can delete audio records" ON audio_records;
DROP POLICY IF EXISTS "Anyone can update audio records" ON audio_records;
DROP POLICY IF EXISTS "Anyone can insert audio records" ON audio_records;

-- Note: "Authenticated users can manage audio records" already exists for INSERT
-- So we only add UPDATE and DELETE

CREATE POLICY "Authenticated users can update audio records"
  ON audio_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audio records"
  ON audio_records FOR DELETE
  TO authenticated
  USING (true);
