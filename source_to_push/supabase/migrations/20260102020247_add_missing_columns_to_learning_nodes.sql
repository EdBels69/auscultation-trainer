-- Add Missing Columns to Learning Nodes
-- Adds columns to support the theory section interface

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'title'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN title text;
    UPDATE learning_nodes SET title = name WHERE title IS NULL;
    ALTER TABLE learning_nodes ALTER COLUMN title SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'sidebar_title'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN sidebar_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'is_folder'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN is_folder boolean DEFAULT false;
    UPDATE learning_nodes SET is_folder = (type IN ('system', 'category'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN parent_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'category'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'icon'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN icon text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN sort_order integer;
    UPDATE learning_nodes SET sort_order = order_index WHERE sort_order IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_nodes' AND column_name = 'content'
  ) THEN
    ALTER TABLE learning_nodes ADD COLUMN content text;
  END IF;
END $$;

-- Sync parent_id with parent_key
UPDATE learning_nodes ln1
SET parent_id = ln2.id
FROM learning_nodes ln2
WHERE ln1.parent_key = ln2.key AND ln1.parent_id IS NULL;

-- Set category based on parent hierarchy
UPDATE learning_nodes 
SET category = CASE 
  WHEN key = 'cardiology' OR parent_key = 'cardiology' THEN 'cardiac'
  WHEN key = 'pulmonology' OR parent_key = 'pulmonology' THEN 'pulmonary'
  ELSE NULL
END
WHERE category IS NULL;