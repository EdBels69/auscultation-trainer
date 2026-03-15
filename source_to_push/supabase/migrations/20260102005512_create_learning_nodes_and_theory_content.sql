/*
  # Create Learning Nodes and Theory Content Tables

  ## Overview
  Creates tables matching the application code structure:
  - learning_nodes: Hierarchical structure for organizing learning content
  - theory_content: Rich text theory content for each node
  - Updates audio_records to use linked_node_key instead of node_id

  ## New Tables

  ### 1. learning_nodes
  Hierarchical tree structure for organizing content
  - `id` (uuid, primary key) - Unique identifier
  - `key` (text, unique) - Unique key for node identification
  - `parent_key` (text, nullable) - Parent node key for tree structure
  - `name` (text) - Display name
  - `type` (text) - Node type: 'system', 'category', 'item', 'subtype'
  - `description` (text) - Description of the node
  - `image_url` (text) - URL to associated image
  - `audiogram_url` (text) - URL to audiogram image
  - `order_index` (integer) - Sort order
  - `is_hidden` (boolean) - Hide from client view
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Update timestamp

  ### 2. theory_content
  Rich text theory content
  - `id` (uuid, primary key) - Unique identifier
  - `node_key` (text, unique) - Reference to learning_nodes key
  - `content` (text) - Rich HTML content
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Update timestamp

  ### 3. Update audio_records
  - Add `linked_node_key` (text) - Reference to learning_nodes key
  - Add `category` (text) - 'cardiac' or 'pulmonary'
  - Add `position` (text) - Position description

  ## Security
  - Enable RLS on all tables
  - Public read access for all content
  - Authenticated users can manage content
*/

-- Create learning_nodes table
CREATE TABLE IF NOT EXISTS learning_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  parent_key text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('system', 'category', 'item', 'subtype')),
  description text DEFAULT '',
  image_url text DEFAULT '',
  audiogram_url text DEFAULT '',
  order_index integer DEFAULT 0,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create theory_content table
CREATE TABLE IF NOT EXISTS theory_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key text UNIQUE NOT NULL,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update audio_records table structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_records' AND column_name = 'linked_node_key'
  ) THEN
    ALTER TABLE audio_records ADD COLUMN linked_node_key text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_records' AND column_name = 'category'
  ) THEN
    ALTER TABLE audio_records ADD COLUMN category text DEFAULT 'cardiac';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_records' AND column_name = 'position'
  ) THEN
    ALTER TABLE audio_records ADD COLUMN position text DEFAULT '';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE learning_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theory_content ENABLE ROW LEVEL SECURITY;

-- Policies for learning_nodes
CREATE POLICY "Anyone can view learning nodes"
  ON learning_nodes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert learning nodes"
  ON learning_nodes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update learning nodes"
  ON learning_nodes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete learning nodes"
  ON learning_nodes FOR DELETE
  TO authenticated
  USING (true);

-- Policies for theory_content
CREATE POLICY "Anyone can view theory content"
  ON theory_content FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert theory content"
  ON theory_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update theory content"
  ON theory_content FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete theory content"
  ON theory_content FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_nodes_parent ON learning_nodes(parent_key);
CREATE INDEX IF NOT EXISTS idx_learning_nodes_type ON learning_nodes(type);
CREATE INDEX IF NOT EXISTS idx_theory_content_node ON theory_content(node_key);
CREATE INDEX IF NOT EXISTS idx_audio_records_linked_node ON audio_records(linked_node_key);
