-- ============================================================
-- Houseland — Faster property listings (Supabase / PostgreSQL)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================
-- Denormalized thumbnail + image count so list queries avoid full image arrays.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS image_count INTEGER NOT NULL DEFAULT 0;

UPDATE properties
SET
  thumbnail_url = CASE
    WHEN array_length(images, 1) IS NOT NULL AND array_length(images, 1) > 0
    THEN images[1]
    ELSE NULL
  END,
  image_count = COALESCE(array_length(images, 1), 0)
WHERE thumbnail_url IS NULL
   OR image_count = 0
   OR image_count <> COALESCE(array_length(images, 1), 0);

CREATE INDEX IF NOT EXISTS properties_list_feed_idx
  ON properties (status, created_at DESC)
  WHERE status = 'APPROVED';

CREATE OR REPLACE VIEW property_public_listings AS
SELECT
  id,
  code,
  title,
  property_type,
  transaction_type,
  area_sqm,
  price,
  currency,
  bedrooms,
  bathrooms,
  neighborhood,
  status,
  thumbnail_url,
  image_count,
  created_at
FROM properties
WHERE status = 'APPROVED';
