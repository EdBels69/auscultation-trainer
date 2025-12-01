-- Insert Root Folders
WITH cardiac_root AS (
  INSERT INTO theory_nodes (title, is_folder, "order", category)
  VALUES ('Кардиология', true, 1, 'cardiac')
  RETURNING id
),
pulmonary_root AS (
  INSERT INTO theory_nodes (title, is_folder, "order", category)
  VALUES ('Пульмонология', true, 2, 'pulmonary')
  RETURNING id
)

-- Insert Sub-folders for Cardiac
, cardiac_subs AS (
  INSERT INTO theory_nodes (title, is_folder, "order", parent_id)
  SELECT title, true, ord, cardiac_root.id
  FROM cardiac_root, (VALUES ('Норма', 1), ('Патология', 2)) AS t(title, ord)
  RETURNING id, title
)

-- Insert Sub-folders for Pulmonary
, pulmonary_subs AS (
  INSERT INTO theory_nodes (title, is_folder, "order", parent_id)
  SELECT title, true, ord, pulmonary_root.id
  FROM pulmonary_root, (VALUES ('Норма', 1), ('Патология', 2)) AS t(title, ord)
  RETURNING id, title
)

-- Insert Example Articles (Optional)
INSERT INTO theory_nodes (title, is_folder, "order", parent_id, content)
SELECT 
  'Введение в норму', 
  false, 
  1, 
  id, 
  '# Введение в норму сердца\n\nЗдесь будет описание нормальных тонов сердца...'
FROM cardiac_subs WHERE title = 'Норма';
