-- Allow 'test' as session_type (auto-saved, no manual selection)
-- Keep old values for backward compatibility with existing data
ALTER TABLE test_sessions DROP CONSTRAINT IF EXISTS test_sessions_session_type_check;
ALTER TABLE test_sessions ADD CONSTRAINT test_sessions_session_type_check
    CHECK (session_type IN ('T1','T2','T3','practice','test'));
ALTER TABLE test_sessions ALTER COLUMN session_type SET DEFAULT 'test';
