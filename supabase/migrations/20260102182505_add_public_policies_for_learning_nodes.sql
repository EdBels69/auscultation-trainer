/*
  # Add Public RLS Policies for Learning Nodes

  ## Problem
  The learning_nodes table only allows UPDATE/INSERT/DELETE for authenticated users,
  but the application uses anonymous (anon) access, causing "save error" in the editor.

  ## Changes
  1. Drop existing authenticated-only policies for learning_nodes
  2. Create public INSERT policy for learning_nodes
  3. Create public UPDATE policy for learning_nodes
  4. Create public DELETE policy for learning_nodes

  ## Security Note
  - This enables admin panel functionality without Supabase auth
  - For production, implement proper role-based authentication
*/

-- Drop existing authenticated-only policies
DROP POLICY IF EXISTS "Authenticated users can insert learning nodes" ON learning_nodes;
DROP POLICY IF EXISTS "Authenticated users can update learning nodes" ON learning_nodes;
DROP POLICY IF EXISTS "Authenticated users can delete learning nodes" ON learning_nodes;

-- Create public policies for learning_nodes
CREATE POLICY "Anyone can insert learning nodes"
  ON learning_nodes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update learning nodes"
  ON learning_nodes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete learning nodes"
  ON learning_nodes FOR DELETE
  TO public
  USING (true);
