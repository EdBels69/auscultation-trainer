-- ============================================================
-- Auscultation Trainer — SQL миграции
-- Выполнять в Supabase → SQL Editor по порядку
-- Дата: 2026-03-14
-- ============================================================

-- ============================================================
-- МИГРАЦИЯ 1: Таблица профилей пользователей
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  role TEXT CHECK (role IN ('student','resident','doctor','teacher','admin')) DEFAULT 'student',
  institution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Автоматически создавать запись в profiles при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Установить роль admin для существующего admin@admin.com
UPDATE profiles SET role = 'admin'
WHERE email = 'admin@admin.com';

-- ============================================================
-- МИГРАЦИЯ 2: Таблица результатов тестов
-- ============================================================

CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score_percent INTEGER NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 1,
  details JSONB DEFAULT '[]',
  -- details format:
  -- [{ audioId, audioName, question, userAnswerId, correctAnswerId, isCorrect }]
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own attempts"
  ON test_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own attempts"
  ON test_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON test_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- МИГРАЦИЯ 3: Таблица достижений пользователей
-- ============================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own achievements"
  ON user_achievements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all achievements"
  ON user_achievements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- ПРОВЕРКА: посмотреть все созданные таблицы
-- ============================================================

SELECT table_name, row_security
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
