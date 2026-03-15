/*
  # Seed Initial Learning Structure

  ## Overview
  Adds initial hierarchical structure for cardiology and pulmonology learning content

  ## Data
  - Cardiology system with categories (Heart Sounds, Murmurs, etc.)
  - Pulmonology system with categories (Breath Sounds, Adventitious Sounds, etc.)
*/

-- Insert cardiology system
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('cardiology', NULL, 'Кардиология', 'system', 'Аускультация сердца и сердечно-сосудистой системы', 1)
ON CONFLICT (key) DO NOTHING;

-- Cardiology categories
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('heart_sounds', 'cardiology', 'Тоны сердца', 'category', 'Нормальные и патологические тоны сердца', 1),
  ('heart_murmurs', 'cardiology', 'Шумы сердца', 'category', 'Систолические и диастолические шумы', 2),
  ('arrhythmias', 'cardiology', 'Аритмии', 'category', 'Нарушения ритма сердца', 3)
ON CONFLICT (key) DO NOTHING;

-- Heart sounds items
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('normal_heart_sounds', 'heart_sounds', 'Нормальные тоны', 'item', 'S1 и S2 в норме', 1),
  ('third_heart_sound', 'heart_sounds', 'Третий тон (S3)', 'item', 'Патологический S3', 2),
  ('fourth_heart_sound', 'heart_sounds', 'Четвертый тон (S4)', 'item', 'Патологический S4', 3)
ON CONFLICT (key) DO NOTHING;

-- Insert pulmonology system
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('pulmonology', NULL, 'Пульмонология', 'system', 'Аускультация легких и дыхательной системы', 2)
ON CONFLICT (key) DO NOTHING;

-- Pulmonology categories
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('normal_breath_sounds', 'pulmonology', 'Нормальное дыхание', 'category', 'Везикулярное и бронхиальное дыхание', 1),
  ('abnormal_breath_sounds', 'pulmonology', 'Патологическое дыхание', 'category', 'Ослабленное и усиленное дыхание', 2),
  ('adventitious_sounds', 'pulmonology', 'Дополнительные шумы', 'category', 'Хрипы, крепитация, шум трения плевры', 3)
ON CONFLICT (key) DO NOTHING;

-- Normal breath sounds items
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('vesicular_breathing', 'normal_breath_sounds', 'Везикулярное дыхание', 'item', 'Нормальное дыхание над легочной тканью', 1),
  ('bronchial_breathing', 'normal_breath_sounds', 'Бронхиальное дыхание', 'item', 'Нормальное дыхание над трахеей и крупными бронхами', 2)
ON CONFLICT (key) DO NOTHING;

-- Adventitious sounds items
INSERT INTO learning_nodes (key, parent_key, name, type, description, order_index)
VALUES 
  ('wheezes', 'adventitious_sounds', 'Свистящие хрипы', 'item', 'Высокие свистящие звуки при обструкции', 1),
  ('crackles', 'adventitious_sounds', 'Влажные хрипы', 'item', 'Потрескивающие звуки в легких', 2),
  ('pleural_rub', 'adventitious_sounds', 'Шум трения плевры', 'item', 'Шум при воспалении плевры', 3)
ON CONFLICT (key) DO NOTHING;
