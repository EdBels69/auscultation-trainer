/*
  # Add file_path column to audio_records
  
  1. Changes
    - Add `file_path` column to `audio_records` table to store the storage path
    
  2. Notes
    - This column stores the path in the storage bucket (e.g., 'sounds/filename.mp3')
    - Useful for managing and deleting files from storage
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_records' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE audio_records ADD COLUMN file_path text;
  END IF;
END $$;