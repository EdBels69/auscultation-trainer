/*
  # Auscultation Trainer Database Schema

  ## Overview
  Creates the complete database structure for the Auscultation Trainer platform including:
  - Learning structure (hierarchical tree of categories)
  - Audio records (heart and lung sounds)
  - Theory structure (educational materials)
  - Test questions and results
  - User progress tracking

  ## New Tables

  ### 1. learning_structure
  Hierarchical tree structure for organizing audio content
  - `id` (uuid, primary key) - Unique identifier
  - `parent_id` (uuid, nullable) - Reference to parent node for tree structure
  - `node_key` (text, unique) - Unique key for node identification
  - `name` (text) - Display name
  - `type` (text) - Node type: 'folder' or 'sound'
  - `icon` (text) - Icon name for UI
  - `sort_order` (integer) - Order within parent
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. audio_records
  Audio files and associated metadata
  - `id` (uuid, primary key) - Unique identifier
  - `node_id` (uuid) - Reference to learning_structure
  - `name` (text) - Audio name
  - `description` (text) - Detailed description
  - `audio_url` (text) - URL to audio file in storage
  - `image_url` (text) - URL to associated image
  - `position` (integer) - Order within node
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. theory_structure
  Hierarchical structure for theory content
  - `id` (uuid, primary key) - Unique identifier
  - `parent_id` (uuid, nullable) - Reference to parent for tree structure
  - `node_key` (text, unique) - Unique key for node
  - `title` (text) - Title of theory section
  - `content` (text) - Rich text content (HTML)
  - `icon` (text) - Icon for UI
  - `is_folder` (boolean) - True if folder, false if content
  - `sort_order` (integer) - Order within parent
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. test_questions
  Questions for testing knowledge
  - `id` (uuid, primary key) - Unique identifier
  - `audio_id` (uuid) - Reference to audio_records
  - `question` (text) - Question text
  - `options` (jsonb) - Array of answer options
  - `correct_answer` (integer) - Index of correct option
  - `explanation` (text) - Explanation of correct answer
  - `difficulty` (text) - Difficulty level
  - `created_at` (timestamptz) - Creation timestamp

  ### 5. test_results
  User test results
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid) - Reference to auth.users
  - `question_id` (uuid) - Reference to test_questions
  - `selected_answer` (integer) - User's selected answer
  - `is_correct` (boolean) - Whether answer was correct
  - `completed_at` (timestamptz) - Completion timestamp

  ## Security
  - Enable RLS on all tables
  - Public read access for learning materials
  - Authenticated users can track their progress
  - Admin operations require authentication
*/

-- Drop old tables if they exist
DROP TABLE IF EXISTS training_sessions CASCADE;
DROP TABLE IF EXISTS auscultation_sounds CASCADE;

-- Learning structure table
CREATE TABLE IF NOT EXISTS learning_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES learning_structure(id) ON DELETE CASCADE,
  node_key text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('folder', 'sound')),
  icon text DEFAULT 'folder',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Audio records table
CREATE TABLE IF NOT EXISTS audio_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid REFERENCES learning_structure(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  audio_url text NOT NULL,
  image_url text DEFAULT '',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Theory structure table
CREATE TABLE IF NOT EXISTS theory_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES theory_structure(id) ON DELETE CASCADE,
  node_key text UNIQUE NOT NULL,
  title text NOT NULL,
  content text DEFAULT '',
  icon text DEFAULT 'book',
  is_folder boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Test questions table
CREATE TABLE IF NOT EXISTS test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id uuid REFERENCES audio_records(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_answer integer NOT NULL,
  explanation text DEFAULT '',
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now()
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES test_questions(id) ON DELETE CASCADE,
  selected_answer integer NOT NULL,
  is_correct boolean DEFAULT false,
  completed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE learning_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE theory_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Policies for learning_structure
CREATE POLICY "Anyone can view learning structure"
  ON learning_structure FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage learning structure"
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

-- Policies for audio_records
CREATE POLICY "Anyone can view audio records"
  ON audio_records FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage audio records"
  ON audio_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update audio records"
  ON audio_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete audio records"
  ON audio_records FOR DELETE
  TO authenticated
  USING (true);

-- Policies for theory_structure
CREATE POLICY "Anyone can view theory structure"
  ON theory_structure FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage theory structure"
  ON theory_structure FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update theory structure"
  ON theory_structure FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete theory structure"
  ON theory_structure FOR DELETE
  TO authenticated
  USING (true);

-- Policies for test_questions
CREATE POLICY "Anyone can view test questions"
  ON test_questions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage test questions"
  ON test_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update test questions"
  ON test_questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete test questions"
  ON test_questions FOR DELETE
  TO authenticated
  USING (true);

-- Policies for test_results
CREATE POLICY "Users can view own test results"
  ON test_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON test_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results"
  ON test_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results"
  ON test_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_learning_structure_parent ON learning_structure(parent_id);
CREATE INDEX IF NOT EXISTS idx_audio_records_node ON audio_records(node_id);
CREATE INDEX IF NOT EXISTS idx_theory_structure_parent ON theory_structure(parent_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_audio ON test_questions(audio_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user ON test_results(user_id);
