-- ================================================================
-- Sprint 7: User profiles, survey responses, NRI test sessions
-- Run in Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. User profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name     TEXT,
    role          VARCHAR(20) CHECK (role IN ('student', 'resident', 'doctor', 'teacher')) DEFAULT 'student',
    year_of_study SMALLINT,          -- для студентов: 1-6
    institution   TEXT DEFAULT 'ФГБОУ ВО РязГМУ Минздрава России',
    specialty     TEXT,              -- специальность/кафедра
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. NRI Test sessions (T1/T2/T3 tracking per annotation)
CREATE TABLE IF NOT EXISTS test_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_type VARCHAR(10) CHECK (session_type IN ('T1','T2','T3','practice')) DEFAULT 'practice',
    category     VARCHAR(30),          -- cardiology / pulmonology / all
    score        SMALLINT,             -- % correct
    total_q      SMALLINT,
    correct_q    SMALLINT,
    duration_sec INTEGER,              -- seconds spent
    answers      JSONB,                -- [{question_id, chosen, correct, sound_name, category}]
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions"  ON test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own sessions"    ON test_sessions FOR SELECT USING (auth.uid() = user_id);
-- Admin can read all (via service role or special policy)
CREATE POLICY "Service role reads all sessions" ON test_sessions FOR SELECT USING (true);

-- 3. Survey responses (SUS, demographics, confidence, etc.)
CREATE TABLE IF NOT EXISTS survey_responses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    survey_type   VARCHAR(30) CHECK (survey_type IN (
                      'demographics',   -- demo at registration
                      'sus',            -- System Usability Scale (10 questions)
                      'confidence_pre', -- self-confidence before T1
                      'confidence_post',-- self-confidence after T2
                      'feedback'        -- free-form feedback
                  )),
    responses     JSONB NOT NULL,       -- question_id → answer value
    score         NUMERIC(5,2),         -- computed score (for SUS: 0-100)
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own surveys"  ON survey_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own surveys"    ON survey_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role reads all surveys" ON survey_responses FOR SELECT USING (true);

-- 4. Achievements (badges)
CREATE TABLE IF NOT EXISTS achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_key   VARCHAR(50) NOT NULL,  -- 'first_test', 'streak_10', etc.
    earned_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_key)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"   ON achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- Trigger: auto-create profile on user signup
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, institution)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'institution', 'ФГБОУ ВО РязГМУ Минздрава России')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
