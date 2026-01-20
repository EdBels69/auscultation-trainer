/*
  # Add test settings and user_id to test_attempts

  1. Changes
    - Add `user_id` column (references auth.users) for tracking authenticated users
    - Add `mode` column for test mode (cardiac, pulmonary, both)
    - Add `difficulty` column for difficulty level (easy, medium, hard)
    - Add `question_count` column for number of questions selected
    
  2. Security
    - Add policy for authenticated users to insert their own test results
    - Add policy for authenticated users to read their own test results
*/

ALTER TABLE test_attempts
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE test_attempts
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'both' CHECK (mode IN ('cardiac', 'pulmonary', 'both'));

ALTER TABLE test_attempts
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE test_attempts
ADD COLUMN IF NOT EXISTS question_count integer DEFAULT 10;

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON test_attempts(user_id);

DROP POLICY IF EXISTS "Users can insert own test attempts" ON test_attempts;
CREATE POLICY "Users can insert own test attempts"
  ON test_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own test attempts" ON test_attempts;
CREATE POLICY "Users can view own test attempts"
  ON test_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
