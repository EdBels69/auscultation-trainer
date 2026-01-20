/*
  # Fix RLS policies for learning_nodes table
  
  1. Changes
    - Drop existing policies
    - Create new policies explicitly for anon and authenticated roles
    
  2. Security
    - Allow public read/write access for learning nodes
*/

DROP POLICY IF EXISTS "Anyone can view learning nodes" ON learning_nodes;
DROP POLICY IF EXISTS "Anyone can insert learning nodes" ON learning_nodes;
DROP POLICY IF EXISTS "Anyone can update learning nodes" ON learning_nodes;
DROP POLICY IF EXISTS "Anyone can delete learning nodes" ON learning_nodes;

CREATE POLICY "Anon can view learning nodes"
  ON learning_nodes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert learning nodes"
  ON learning_nodes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update learning nodes"
  ON learning_nodes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete learning nodes"
  ON learning_nodes FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view learning nodes"
  ON learning_nodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert learning nodes"
  ON learning_nodes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update learning nodes"
  ON learning_nodes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete learning nodes"
  ON learning_nodes FOR DELETE
  TO authenticated
  USING (true);