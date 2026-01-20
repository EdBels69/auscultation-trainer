/*
  # Create Storage Buckets for Media Files

  ## Overview
  Creates storage buckets for audio files and images with appropriate policies

  ## Storage Buckets
  1. `audio` - For audio recordings of heart and lung sounds
  2. `images` - For images associated with audio records and theory content

  ## Security
  - Public read access for all media files
  - Authenticated users can upload files
  - File size limits and type restrictions
*/

-- Create audio storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  true,
  52428800,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio bucket
CREATE POLICY "Anyone can view audio files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'audio');

CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio');

CREATE POLICY "Authenticated users can update audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audio')
  WITH CHECK (bucket_id = 'audio');

CREATE POLICY "Authenticated users can delete audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'audio');

-- Storage policies for images bucket
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images')
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');
