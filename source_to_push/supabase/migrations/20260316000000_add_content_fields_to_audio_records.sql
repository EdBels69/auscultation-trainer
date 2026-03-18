-- Migration: add explanation, clinical_context, difficulty to audio_records
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE audio_records
  ADD COLUMN IF NOT EXISTS explanation       TEXT,
  ADD COLUMN IF NOT EXISTS clinical_context  TEXT,
  ADD COLUMN IF NOT EXISTS difficulty        VARCHAR(10) DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard'));

COMMENT ON COLUMN audio_records.explanation IS
  'Клиническое объяснение для теста — почему этот ответ правильный';

COMMENT ON COLUMN audio_records.clinical_context IS
  'Развёрнутый клинический контекст для inline-AI (диагноз, механизм, дифдиагноз)';

COMMENT ON COLUMN audio_records.difficulty IS
  'Сложность записи для алгоритма SRS и генерации теста: easy | medium | hard';
