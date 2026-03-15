/*
  # Add auscultation point field to audio_records

  1. New Columns
    - `auscultation_point` (text) - stores the auscultation point code:
      - A: Aortic area (2nd intercostal space, right sternal border)
      - P: Pulmonic area (2nd intercostal space, left sternal border)
      - T: Tricuspid area (lower left sternal border)
      - M: Mitral area (5th intercostal space, midclavicular line)
      - E: Erb's point (3rd intercostal space, left sternal border)
    - `auscultation_image_url` (text) - stores URL for custom auscultation point image

  2. Notes
    - These fields are optional and primarily used for cardiac sounds
    - The image_url field already exists but can store general images
    - auscultation_image_url is specifically for point location diagrams
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_records' AND column_name = 'auscultation_point'
  ) THEN
    ALTER TABLE audio_records ADD COLUMN auscultation_point text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audio_records' AND column_name = 'auscultation_image_url'
  ) THEN
    ALTER TABLE audio_records ADD COLUMN auscultation_image_url text;
  END IF;
END $$;