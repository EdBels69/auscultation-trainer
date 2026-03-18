-- Complete Database Setup for Auscultation Trainer
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. Create Tables
-- ============================================

-- Sounds table (for audio records)
CREATE TABLE IF NOT EXISTS sounds (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    position TEXT,
    file_path TEXT,
    file_name TEXT,
    image_url TEXT,
    audiogram_url TEXT,
    linked_node_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Theory nodes table (for theory structure and content)
CREATE TABLE IF NOT EXISTS theory_nodes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    is_folder BOOLEAN DEFAULT false,
    parent_id BIGINT REFERENCES theory_nodes(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    category TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning nodes table (for learning structure)
CREATE TABLE IF NOT EXISTS learning_nodes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id BIGINT REFERENCES learning_nodes(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT false,
    "order" INTEGER DEFAULT 0,
    image_url TEXT,
    audiogram_url TEXT,
    node_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE theory_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_nodes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Create Policies for Public Read Access
-- ============================================

-- Sounds policies
DROP POLICY IF EXISTS "Enable read access for all users" ON sounds;
CREATE POLICY "Enable read access for all users"
ON sounds FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sounds;
CREATE POLICY "Enable insert for authenticated users only"
ON sounds FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON sounds;
CREATE POLICY "Enable update for authenticated users only"
ON sounds FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON sounds;
CREATE POLICY "Enable delete for authenticated users only"
ON sounds FOR DELETE
TO authenticated
USING (true);

-- Theory nodes policies
DROP POLICY IF EXISTS "Enable read access for all users" ON theory_nodes;
CREATE POLICY "Enable read access for all users"
ON theory_nodes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON theory_nodes;
CREATE POLICY "Enable insert for authenticated users only"
ON theory_nodes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON theory_nodes;
CREATE POLICY "Enable update for authenticated users only"
ON theory_nodes FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON theory_nodes;
CREATE POLICY "Enable delete for authenticated users only"
ON theory_nodes FOR DELETE
TO authenticated
USING (true);

-- Learning nodes policies
DROP POLICY IF EXISTS "Enable read access for all users" ON learning_nodes;
CREATE POLICY "Enable read access for all users"
ON learning_nodes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON learning_nodes;
CREATE POLICY "Enable insert for authenticated users only"
ON learning_nodes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON learning_nodes;
CREATE POLICY "Enable update for authenticated users only"
ON learning_nodes FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON learning_nodes;
CREATE POLICY "Enable delete for authenticated users only"
ON learning_nodes FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 4. Create Storage Buckets
-- ============================================

-- Create sounds bucket for audio files, images, and audiograms
INSERT INTO storage.buckets (id, name, public)
VALUES ('sounds', 'sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Create theory-media bucket (optional, for theory media files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('theory-media', 'theory-media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Storage Policies
-- ============================================

-- Sounds bucket policies
DROP POLICY IF EXISTS "Give public access to sounds" ON storage.objects;
CREATE POLICY "Give public access to sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'sounds');

DROP POLICY IF EXISTS "Enable upload for authenticated users to sounds" ON storage.objects;
CREATE POLICY "Enable upload for authenticated users to sounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sounds');

DROP POLICY IF EXISTS "Enable update for authenticated users to sounds" ON storage.objects;
CREATE POLICY "Enable update for authenticated users to sounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sounds');

DROP POLICY IF EXISTS "Enable delete for authenticated users to sounds" ON storage.objects;
CREATE POLICY "Enable delete for authenticated users to sounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sounds');

-- Theory-media bucket policies
DROP POLICY IF EXISTS "Give public access to theory-media" ON storage.objects;
CREATE POLICY "Give public access to theory-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'theory-media');

DROP POLICY IF EXISTS "Enable upload for authenticated users to theory-media" ON storage.objects;
CREATE POLICY "Enable upload for authenticated users to theory-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'theory-media');

DROP POLICY IF EXISTS "Enable update for authenticated users to theory-media" ON storage.objects;
CREATE POLICY "Enable update for authenticated users to theory-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'theory-media');

DROP POLICY IF EXISTS "Enable delete for authenticated users to theory-media" ON storage.objects;
CREATE POLICY "Enable delete for authenticated users to theory-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'theory-media');

-- ============================================
-- 6. Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sounds_category ON sounds(category);
CREATE INDEX IF NOT EXISTS idx_sounds_created_at ON sounds(created_at);
CREATE INDEX IF NOT EXISTS idx_theory_nodes_parent_id ON theory_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_theory_nodes_order ON theory_nodes("order");
CREATE INDEX IF NOT EXISTS idx_learning_nodes_parent_id ON learning_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_learning_nodes_order ON learning_nodes("order");
CREATE INDEX IF NOT EXISTS idx_learning_nodes_node_key ON learning_nodes(node_key);

-- ============================================
-- 7. Create Updated At Trigger Function
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop if exists first)
DROP TRIGGER IF EXISTS update_sounds_updated_at ON sounds;
CREATE TRIGGER update_sounds_updated_at
    BEFORE UPDATE ON sounds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_theory_nodes_updated_at ON theory_nodes;
CREATE TRIGGER update_theory_nodes_updated_at
    BEFORE UPDATE ON theory_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_learning_nodes_updated_at ON learning_nodes;
CREATE TRIGGER update_learning_nodes_updated_at
    BEFORE UPDATE ON learning_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

