-- ============================================================
-- Houseland — Supabase Storage (property images)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) Public bucket for property listing photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Anyone can view images (public listings)
CREATE POLICY "Public read property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

-- 3) Signed-in users upload only into their own folder: {auth.uid()}/...
CREATE POLICY "Users upload own property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Users can delete their own uploads (optional cleanup)
CREATE POLICY "Users delete own property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5) Users can replace/update files in their folder
CREATE POLICY "Users update own property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
