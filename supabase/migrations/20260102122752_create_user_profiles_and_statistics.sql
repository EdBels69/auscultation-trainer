/*
  # User Profiles and Statistics System

  ## Overview
  Creates tables for user management and anonymous statistics tracking.
  Each user gets an anonymous UUID for statistics that is NOT linked to their email.

  ## New Tables

  ### 1. user_profiles
  Extended user profile information
  - `id` (uuid, primary key) - References auth.users
  - `anonymous_id` (uuid, unique) - Anonymous ID for statistics (not linked to personal data)
  - `display_name` (text) - User's display name
  - `role` (text) - User role: student, teacher, admin
  - `created_at` (timestamptz) - Registration timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. user_sessions
  Session tracking for analytics
  - `id` (uuid, primary key) - Unique identifier
  - `anonymous_id` (uuid) - Anonymous user ID (NOT user_id for privacy)
  - `started_at` (timestamptz) - Session start
  - `ended_at` (timestamptz) - Session end
  - `device_info` (text) - Browser/device info

  ### 3. user_actions
  Action logging for usage analytics
  - `id` (uuid, primary key) - Unique identifier
  - `anonymous_id` (uuid) - Anonymous user ID
  - `session_id` (uuid) - Reference to session
  - `action_type` (text) - Type: page_view, sound_play, test_start, chat_message, etc.
  - `action_data` (jsonb) - Additional action details
  - `created_at` (timestamptz) - Action timestamp

  ### 4. test_attempts
  Detailed test results for progress tracking
  - `id` (uuid, primary key) - Unique identifier
  - `anonymous_id` (uuid) - Anonymous user ID
  - `test_type` (text) - 'local' or 'ai_quiz'
  - `total_questions` (integer) - Number of questions
  - `correct_answers` (integer) - Number correct
  - `score_percent` (integer) - Score percentage
  - `duration_seconds` (integer) - Time taken
  - `details` (jsonb) - Per-question breakdown
  - `completed_at` (timestamptz) - Completion timestamp

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Anonymous IDs protect user privacy in exports
*/

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  display_name text DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User sessions table (for analytics)
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  device_info text DEFAULT ''
);

-- User actions table (for detailed analytics)
CREATE TABLE IF NOT EXISTS user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid NOT NULL,
  session_id uuid REFERENCES user_sessions(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Test attempts table (for progress tracking)
CREATE TABLE IF NOT EXISTS test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id uuid NOT NULL,
  test_type text NOT NULL DEFAULT 'local' CHECK (test_type IN ('local', 'ai_quiz')),
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  score_percent integer NOT NULL DEFAULT 0,
  duration_seconds integer DEFAULT 0,
  details jsonb DEFAULT '[]',
  completed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies for user_sessions (users access via anonymous_id from their profile)
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policies for user_actions
CREATE POLICY "Users can view own actions"
  ON user_actions FOR SELECT
  TO authenticated
  USING (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own actions"
  ON user_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Policies for test_attempts
CREATE POLICY "Users can view own test attempts"
  ON test_attempts FOR SELECT
  TO authenticated
  USING (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own test attempts"
  ON test_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    anonymous_id IN (
      SELECT anonymous_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Admin policies (admin can view all for CSV export)
CREATE POLICY "Admin can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can view all sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can view all actions"
  ON user_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can view all test attempts"
  ON test_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_anonymous_id ON user_profiles(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_anonymous_id ON user_sessions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_anonymous_id ON user_actions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_actions_type ON user_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_test_attempts_anonymous_id ON test_attempts(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_completed_at ON test_attempts(completed_at);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
